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

import { getPacketaStatus, packetaFault, cleanPhone, splitStreet } from "@/lib/shipping/packeta";
import { packetaStatusLabel } from "@/lib/shipping/packeta-sync";

vi.mock("@/lib/orders/notify", () => ({ sendOrderStatusEmail: vi.fn() }));
vi.mock("@/lib/orders/events", () => ({ logOrderEvent: vi.fn() }));

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
});
