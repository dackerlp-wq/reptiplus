import { describe, expect, it } from "vitest";
import { availabilityOf, canOrder, orderCap, SUPPLIER_ORDER_CAP } from "@/lib/availability";

describe("dostupnost", () => {
  it("skladem / poslední kusy / vyprodáno bez příznaku dodavatele", () => {
    expect(availabilityOf(10, false)).toBe("in");
    expect(availabilityOf(3, false)).toBe("low");
    expect(availabilityOf(0, false)).toBe("out");
    expect(availabilityOf(-2, false)).toBe("out");
  });
  it("skladem u dodavatele jen při prázdném vlastním skladu", () => {
    expect(availabilityOf(0, true)).toBe("supplier");
    expect(availabilityOf(-3, true)).toBe("supplier");
    expect(availabilityOf(2, true)).toBe("low");
  });
  it("objednat lze se skladem nebo s dodavatelem", () => {
    expect(canOrder(0, false)).toBe(false);
    expect(canOrder(0, true)).toBe(true);
    expect(canOrder(1, false)).toBe(true);
  });
  it("strop množství v košíku", () => {
    expect(orderCap(4, false)).toBe(4);
    expect(orderCap(0, false)).toBe(0);
    expect(orderCap(0, true)).toBe(SUPPLIER_ORDER_CAP);
    expect(orderCap(4, true)).toBe(SUPPLIER_ORDER_CAP);
  });
});
