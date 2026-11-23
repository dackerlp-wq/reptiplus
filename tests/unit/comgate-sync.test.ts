import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Mocky: Comgate API, Supabase service klient, markOrderPaid, historie ──
const state = vi.hoisted(() => ({
  pay: null as null | { status: string; refId: string; price: number; curr: string },
  order: null as null | Record<string, unknown>,
  updates: [] as Record<string, unknown>[],
  paid: [] as string[],
}));

vi.mock("@/lib/comgate/client", () => ({
  getComgatePayment: vi.fn(async () => state.pay),
  createComgatePayment: vi.fn(),
}));
vi.mock("@/lib/orders/payment", () => ({
  markOrderPaid: vi.fn(async (id: string) => {
    state.paid.push(id);
  }),
}));
vi.mock("@/lib/orders/events", () => ({ logOrderEvent: vi.fn(async () => {}) }));
vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => {
    const q = {
      select: () => q,
      eq: () => q,
      neq: () => q,
      maybeSingle: async () => ({ data: state.order }),
      update: (patch: Record<string, unknown>) => {
        state.updates.push(patch);
        return q;
      },
    };
    return { from: () => q };
  },
}));

import { syncComgateTransaction } from "@/lib/orders/comgate";

const baseOrder = {
  id: "o1",
  number: "RP261123-ABCD",
  total: 129900,
  currency: "CZK",
  payment_status: "pending",
  comgate_ref: "T-1",
};

beforeEach(() => {
  state.pay = null;
  state.order = { ...baseOrder };
  state.updates = [];
  state.paid = [];
});

describe("syncComgateTransaction", () => {
  it("nedostupný /status → unverified (webhook nechá Comgate opakovat)", async () => {
    expect(await syncComgateTransaction("T-1")).toBe("unverified");
    expect(state.paid).toEqual([]);
  });

  it("PAID se sedící částkou → zaplaceno", async () => {
    state.pay = { status: "PAID", refId: baseOrder.number, price: 129900, curr: "CZK" };
    expect(await syncComgateTransaction("T-1")).toBe("paid");
    expect(state.paid).toEqual(["o1"]);
  });

  it("PAID u staršího pokusu → zaplaceno a comgate_ref přepsán (kvůli refundaci)", async () => {
    state.pay = { status: "PAID", refId: baseOrder.number, price: 129900, curr: "CZK" };
    expect(await syncComgateTransaction("T-0")).toBe("paid");
    expect(state.updates).toContainEqual({ comgate_ref: "T-0" });
    expect(state.paid).toEqual(["o1"]);
  });

  it("PAID s nižší částkou nebo jinou měnou → neoznačit", async () => {
    state.pay = { status: "PAID", refId: baseOrder.number, price: 100, curr: "CZK" };
    expect(await syncComgateTransaction("T-1")).toBeNull();
    state.pay = { status: "PAID", refId: baseOrder.number, price: 129900, curr: "EUR" };
    expect(await syncComgateTransaction("T-1")).toBeNull();
    expect(state.paid).toEqual([]);
  });

  it("CANCELLED aktuálního pokusu → failed", async () => {
    state.pay = { status: "CANCELLED", refId: baseOrder.number, price: 129900, curr: "CZK" };
    expect(await syncComgateTransaction("T-1")).toBe("failed");
    expect(state.updates).toContainEqual({ payment_status: "failed" });
  });

  it("CANCELLED starého pokusu nepřepíše stav nového", async () => {
    state.pay = { status: "CANCELLED", refId: baseOrder.number, price: 129900, curr: "CZK" };
    await syncComgateTransaction("T-0");
    expect(state.updates).toEqual([]);
  });

  it("PENDING → beze změny", async () => {
    state.pay = { status: "PENDING", refId: baseOrder.number, price: 129900, curr: "CZK" };
    expect(await syncComgateTransaction("T-1")).toBe("pending");
    expect(state.updates).toEqual([]);
    expect(state.paid).toEqual([]);
  });
});
