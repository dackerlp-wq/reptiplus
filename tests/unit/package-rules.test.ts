import { describe, expect, it } from "vitest";
import { checkPackage, packetaServiceFor } from "@/lib/shipping/package-rules";

const pkg = (weightKg: number, l: number, w: number, h: number) => ({ weightKg, lengthCm: l, widthCm: w, heightCm: h });

describe("služba Zásilkovny podle objednávky", () => {
  it("výdejní místo, Z-BOX, externí dopravce a doručení domů", () => {
    expect(packetaServiceFor({ country: "CZ", pickup_point_id: "123" })?.code).toBe("CZ-PP");
    expect(packetaServiceFor({ country: "CZ", pickup_point_id: "123", pickup_point_group: "zbox" })?.code).toBe("CZ-ZBOX");
    expect(packetaServiceFor({ country: "CZ", pickup_point_id: "9", pickup_point_country: "SK" })?.code).toBe("SK-PP");
    expect(packetaServiceFor({ country: "PL", pickup_point_id: "3060", pickup_carrier_point: "KRA01" })?.code).toBe("PL-INPOST");
    expect(packetaServiceFor({ country: "DE", pickup_point_id: "6828", pickup_carrier_point: "X" })?.code).toBe("DE-PP");
    expect(packetaServiceFor({ country: "AT" })?.code).toBe("AT-HD");
    expect(packetaServiceFor({ country: "HU" })).toBeNull();
  });
});

describe("kontrola balíku", () => {
  const pp = packetaServiceFor({ country: "CZ", pickup_point_id: "1" })!;
  const zbox = packetaServiceFor({ country: "CZ", pickup_point_id: "1", pickup_point_group: "zbox" })!;
  const at = packetaServiceFor({ country: "AT" })!;

  it("bez hmotnosti a rozměrů nejde odeslat", () => {
    expect(checkPackage(pp, pkg(0, 30, 20, 15)).errors).toHaveLength(1);
    expect(checkPackage(pp, pkg(1, 30, 0, 15)).errors).toHaveLength(1);
  });

  it("běžný balík projde bez upozornění", () => {
    expect(checkPackage(pp, pkg(1.2, 30, 20, 15), "light")).toEqual({ errors: [], warnings: [] });
  });

  it("hmotnost, minimum, strana a součet", () => {
    expect(checkPackage(pp, pkg(16, 30, 20, 15)).errors[0]).toContain("max. 15 kg");
    expect(checkPackage(pp, pkg(0.2, 9, 7, 1)).errors[0]).toContain("minimum");
    expect(checkPackage(at, pkg(2, 75, 20, 10)).errors[0]).toContain("max. 70 cm");
    expect(checkPackage(at, pkg(2, 50, 40, 35)).errors[0]).toContain("max. 120 cm");
  });

  it("Z-BOX: rozměry se porovnávají v libovolném natočení", () => {
    expect(checkPackage(zbox, pkg(3, 35, 60, 43)).errors).toEqual([]);
    expect(checkPackage(zbox, pkg(3, 61, 40, 30)).errors[0]).toContain("nevejde");
  });

  it("velký lehký balík a těžký balík za lehkou cenu → upozornění", () => {
    const big = checkPackage(pp, pkg(2, 75, 30, 20), "light");
    expect(big.errors).toEqual([]);
    expect(big.warnings[0]).toContain("nejvyšší váhovou kategorii");
    expect(checkPackage(pp, pkg(7, 40, 30, 30), "light").warnings[0]).toContain("přes 5 kg");
    expect(checkPackage(pp, pkg(7, 40, 30, 30), "heavy").warnings).toEqual([]);
  });
});

describe("rozměry zboží: schránky a návrh krabice", () => {
  it("kus se vejde v libovolném natočení, objem s rezervou 90 %", async () => {
    const { fitsInside, itemsFitBox, LOCKERS } = await import("@/lib/shipping/package-rules");
    expect(fitsInside([35, 60, 40], LOCKERS.zbox)).toBe(true);
    expect(fitsInside([61, 20, 10], LOCKERS.zbox)).toBe(false);
    expect(itemsFitBox([], LOCKERS.zbox)).toBe(true);
    expect(itemsFitBox([[60, 43, 35]], LOCKERS.zbox)).toBe(false); // plný objem > 90 %
    expect(itemsFitBox([[30, 20, 10], [30, 20, 10]], LOCKERS.zbox)).toBe(true);
  });
  it("navrhne nejmenší krabici, do které se zboží vejde", async () => {
    const { suggestBox } = await import("@/lib/shipping/package-rules");
    const boxes = [
      { name: "Velká", lengthCm: 60, widthCm: 40, heightCm: 30 },
      { name: "Malá", lengthCm: 30, widthCm: 20, heightCm: 15 },
      { name: "Střední", lengthCm: 40, widthCm: 30, heightCm: 25 },
    ];
    expect(suggestBox([[25, 15, 10]], boxes)?.name).toBe("Malá");
    expect(suggestBox([[35, 25, 10]], boxes)?.name).toBe("Střední");
    expect(suggestBox([[80, 10, 10]], boxes)).toBeNull();
    expect(suggestBox([], boxes)).toBeNull();
  });
});
