import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import {
  type CarrierResult,
  type LabelResult,
  type ShipmentInput,
  type ShipmentResult,
  toMajor,
} from "@/lib/shipping/types";

/**
 * PPL — CPL API (myAPI2) přes DHL API bránu.
 * Docs: https://ppl-cpl-api.apidog.io/   Base: https://api.dhl.com/ecs/ppl/myapi2
 *
 * Konfigurace z app_setting `integrations.ppl`:
 *   { clientId, clientSecret, productType?, senderName?, senderStreet?, senderCity?, senderZip? }
 *
 * Pozn.: vytvoření zásilky je u PPL asynchronní (batch import → polling).
 * Přesné názvy produktu (productType) a odesílatele je nutné doladit dle
 * konkrétní smlouvy — proto jsou v nastavení. Kód následuje dokumentaci myAPI2.
 */

const BASE = "https://api.dhl.com/ecs/ppl/myapi2";

type PplConfig = {
  clientId: string;
  clientSecret: string;
  productType: string;
  sender: { name: string; street: string; city: string; zip: string };
};

async function getConfig(): Promise<PplConfig | null> {
  try {
    const svc = createServiceClient();
    const { data } = await svc
      .from("app_setting")
      .select("value")
      .eq("key", "integrations.ppl")
      .maybeSingle();
    const v = (data?.value ?? {}) as Record<string, string>;
    const clientId = v.clientId || process.env.PPL_CLIENT_ID || "";
    const clientSecret = v.clientSecret || process.env.PPL_CLIENT_SECRET || "";
    if (!clientId || !clientSecret) return null;
    return {
      clientId,
      clientSecret,
      productType: v.productType || "BUSINESS",
      sender: {
        name: v.senderName || "Reptiplus",
        street: v.senderStreet || "",
        city: v.senderCity || "",
        zip: v.senderZip || "",
      },
    };
  } catch {
    return null;
  }
}

async function getToken(cfg: PplConfig): Promise<string | null> {
  const basic = Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString("base64");
  const res = await fetch(`${BASE}/login/getAccessToken`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials&scope=myapi2",
    cache: "no-store",
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { access_token?: string };
  return json.access_token ?? null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function createPplShipment(
  input: ShipmentInput,
): Promise<CarrierResult<ShipmentResult>> {
  const cfg = await getConfig();
  if (!cfg) return { ok: false, error: "PPL není nakonfigurováno (chybí Client ID / Secret)." };

  const token = await getToken(cfg);
  if (!token) return { ok: false, error: "PPL: nepodařilo se získat přístupový token (ověř Client ID/Secret)." };

  const r = input.recipient;
  const cod = input.codMinor > 0;
  const shipment: Record<string, unknown> = {
    referenceId: input.orderNumber,
    productType: cfg.productType,
    weighedShipmentInfo: { weight: input.weightKg },
    sender: {
      name: cfg.sender.name,
      street: cfg.sender.street,
      city: cfg.sender.city,
      zipCode: cfg.sender.zip,
      country: "CZ",
    },
    recipient: {
      name: r.name,
      street: r.street ?? "",
      city: r.city ?? "",
      zipCode: r.zip ?? "",
      country: r.country ?? "CZ",
      email: r.email ?? "",
      phone: r.phone ?? "",
    },
    ...(cod
      ? {
          cashOnDelivery: {
            codPrice: toMajor(input.codMinor),
            codCurrency: input.currency,
            codVarSym: input.orderNumber.replace(/\D/g, "").slice(-10) || "0",
          },
        }
      : {}),
  };

  let res: Response;
  try {
    res = await fetch(`${BASE}/shipment/batch`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        labelSettings: { format: "Pdf", dpi: 300 },
        shipments: [shipment],
      }),
      cache: "no-store",
    });
  } catch (e) {
    return { ok: false, error: `PPL nedostupné: ${String(e)}` };
  }

  if (res.status !== 200 && res.status !== 201) {
    return { ok: false, error: `PPL odmítlo zásilku (HTTP ${res.status}): ${await res.text()}` };
  }

  // Asynchronní import → poll na Location, dokud nebude Complete se shipmentNumber.
  const location = res.headers.get("location");
  if (!location) return { ok: false, error: "PPL: chybí odkaz na stav importu (Location)." };

  for (let i = 0; i < 6; i++) {
    await sleep(1000);
    const poll = await fetch(location, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      cache: "no-store",
    });
    if (!poll.ok) continue;
    const j = (await poll.json()) as {
      items?: {
        referenceId?: string;
        shipmentNumber?: string;
        importState?: string;
        labelUrl?: string;
      }[];
    };
    const item = j.items?.[0];
    if (item?.importState === "Complete" && item.shipmentNumber) {
      return {
        ok: true,
        data: {
          shipmentId: item.shipmentNumber,
          trackingNumber: item.shipmentNumber,
          trackingUrl: `https://www.ppl.cz/vyhledat-zasilku?shipmentNumbers=${encodeURIComponent(item.shipmentNumber)}`,
        },
      };
    }
    if (item?.importState === "Error") {
      return { ok: false, error: "PPL: import zásilky selhal (zkontroluj adresu a produkt)." };
    }
  }
  return { ok: false, error: "PPL: import zásilky se nedokončil včas, zkus to prosím znovu." };
}

export async function getPplLabel(shipmentNumber: string): Promise<LabelResult> {
  const cfg = await getConfig();
  if (!cfg) return { ok: false, error: "PPL není nakonfigurováno." };
  const token = await getToken(cfg);
  if (!token) return { ok: false, error: "PPL: nepodařilo se získat token." };

  let res: Response;
  try {
    res = await fetch(`${BASE}/shipment/label`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/pdf",
      },
      body: JSON.stringify({
        labelSettings: { format: "Pdf", dpi: 300 },
        shipmentNumbers: [shipmentNumber],
      }),
      cache: "no-store",
    });
  } catch (e) {
    return { ok: false, error: `PPL nedostupné: ${String(e)}` };
  }
  if (!res.ok) return { ok: false, error: `Štítek se nepodařilo získat (HTTP ${res.status}).` };

  const buf = Buffer.from(await res.arrayBuffer());
  return { ok: true, data: { pdfBase64: buf.toString("base64") } };
}
