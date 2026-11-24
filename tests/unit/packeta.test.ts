import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: { value: { apiPassword: "a9549fbba350b3cdTESTTESTTESTTEST" } } }) }),
      }),
    }),
  }),
}));

import { getPacketaStatus, packetaFault, cleanPhone, splitStreet, homeCarrierFor, packetaCurrencyFor, convertAmount, parsePackageSize } from "@/lib/shipping/packeta";
import { packetaStatusLabel } from "@/lib/shipping/packeta-sync";

vi.mock("@/lib/orders/notify", () => ({ sendOrderStatusEmail: vi.fn() }));
vi.mock("@/lib/orders/events", () => ({ logOrderEvent: vi.fn() }));
vi.mock("@/lib/exchange-rate", () => ({ getCnbEurRate: async () => ({ rate: 25, date: "" }) }));

describe("Zásilkovna — stav zásilky", () => {
  beforeEach(() => vi.unstubAllGlobals());

  it("přečte stav z XML odpovědi packetStatus", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      new Response(
        "<response><status>ok</status><result><dateTime>2026-11-24T10:00:00</dateTime><statusCode>7</statusCode><codeText>delivered</codeText><statusText>Delivered</statusText></result></response>",
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const res = await getPacketaStatus("123");
    expect(res).toEqual({
      ok: true,
      data: { code: 7, codeText: "delivered", text: "Delivered", at: "2026-11-24T10:00:00" },
    });
    expect(String(fetchMock.mock.calls[0][1]?.body)).toContain("<packetId>123</packetId>");
  });

  it("chybu API vrátí jako data", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("<response><status>fault</status><string>Packet not found</string></response>")));
    const res = await getPacketaStatus("999");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toContain("Packet not found");
  });

  it("stavy pojmenuje česky, neznámé převezme od Zásilkovny", () => {
    expect(packetaStatusLabel({ code: 5, codeText: "ready for pickup", text: "Ready", at: null })).toBe("Připraveno k vyzvednutí");
    expect(packetaStatusLabel({ code: 42, codeText: "x", text: "Something new", at: null })).toBe("Something new");
  });

  it("chyba validace vypíše konkrétní pole z detailu", () => {
    const xml =
      "<response><status>fault</status><fault>PacketAttributesFault</fault><string>Failed to validate attributes. See detail.</string><detail><attributes><fault><name>eshop</name><fault>Unknown sender label.</fault></fault><fault><name>phone</name><fault>Invalid phone.</fault></fault></attributes></detail></response>";
    expect(packetaFault(xml)).toBe(
      "Failed to validate attributes. See detail. (eshop: Unknown sender label.; phone: Invalid phone.)",
    );
  });

  it("telefon a ulici upraví do tvaru pro Zásilkovnu", () => {
    expect(cleanPhone("+420 777 123 456")).toBe("+420777123456");
    expect(cleanPhone("00421 905 123 456")).toBe("+421905123456");
    expect(cleanPhone("777-123-456")).toBe("777123456");
    expect(cleanPhone("nevím")).toBeNull();
    expect(splitStreet("Dlouhá 12/3")).toEqual({ street: "Dlouhá", houseNumber: "12/3" });
    expect(splitStreet("Náměstí Míru 1a")).toEqual({ street: "Náměstí Míru", houseNumber: "1a" });
    expect(splitStreet("Lhota")).toEqual({ street: "Lhota", houseNumber: "" });
  });

  it("dopravce pro doručení domů podle země", () => {
    expect(homeCarrierFor("CZ")).toBe("106");
    expect(homeCarrierFor("sk")).toBe("131");
    expect(homeCarrierFor(undefined)).toBe("106");
    expect(homeCarrierFor("CZ", "999")).toBe("999");
    expect(homeCarrierFor("SK", "999")).toBe("131");
    expect(homeCarrierFor("DE")).toBe("6373");
    expect(homeCarrierFor("AT")).toBe("6830");
    expect(homeCarrierFor("PL")).toBe("1406");
    expect(homeCarrierFor("HU")).toBeNull();
  });

  it("měna zásilky podle země a přepočet kurzem", () => {
    expect(packetaCurrencyFor("CZ")).toBe("CZK");
    expect(packetaCurrencyFor("sk")).toBe("EUR");
    expect(packetaCurrencyFor("PL")).toBe("EUR");
    expect(convertAmount(250, "CZK", "EUR", 25)).toBe(10);
    expect(convertAmount(10, "EUR", "CZK", 25)).toBe(250);
    expect(convertAmount(10, "EUR", "EUR", 25)).toBe(10);
  });

  it("výchozí rozměry balíku v mm", () => {
    expect(parsePackageSize("40x30x20")).toEqual({ length: 400, width: 300, height: 200 });
    expect(parsePackageSize("40 × 30,5 × 20")).toEqual({ length: 400, width: 305, height: 200 });
    expect(parsePackageSize("")).toEqual({ length: 300, width: 200, height: 150 });
  });
});
