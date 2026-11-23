import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => {
    const q = {
      select: () => q,
      eq: () => q,
      maybeSingle: async () => ({ data: { value: { merchant: "521005", secret: "s", test: true } } }),
    };
    return { from: () => q };
  },
}));

import { getComgateVariants, isComgateVariant } from "@/lib/comgate/client";

function mockMethods(ids: string[]) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ methods: ids.map((id) => ({ id })) }))));
}

afterEach(() => vi.unstubAllGlobals());

describe("Comgate varianty v pokladně", () => {
  it("aktuální účet (CZK): karta, banka, později — bez Apple/Google Pay", async () => {
    mockMethods(["BANK_CZ_KB_PSD2", "BANK_CZ_OTHER", "CARD_CZ_COMGATE", "LATER_TWISTO", "LOAN_ESSOX", "PART_TWISTO"]);
    expect(await getComgateVariants("CZK")).toEqual(["CARD_ALL", "BANK_ONLY", "LATER_ALL"]);
  });

  it("po aktivaci Apple Pay a Google Pay se nabídnou samostatně (EUR)", async () => {
    mockMethods(["CARD_CZ_COMGATE", "APPLEPAY_REDIRECT", "GOOGLEPAY_REDIRECT", "BANK_SK_SLSP", "PART_SK_SKIPPAY"]);
    expect(await getComgateVariants("EUR")).toEqual(["CARD_ALL", "APPLEPAY_REDIRECT", "GOOGLEPAY_REDIRECT", "BANK_ONLY"]);
  });

  it("chyba Comgate → null (pokladna ukáže jednu obecnou volbu)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("down"); }));
    expect(await getComgateVariants("PLN")).toBeNull();
  });

  it("whitelist variant z formuláře", () => {
    expect(isComgateVariant("APPLEPAY_REDIRECT")).toBe(true);
    expect(isComgateVariant("BANK_ALL")).toBe(false);
    expect(isComgateVariant("")).toBe(false);
  });
});
