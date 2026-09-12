/** Stavy reklamací / odstoupení (bez server-only — používá i klient). */
export const CLAIM_STATUSES = ["new", "in_progress", "resolved", "rejected"] as const;
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];
export const CLAIM_STATUS_META: Record<ClaimStatus, { label: string; cls: string }> = {
  new: { label: "Nová", cls: "bg-gold/15 text-earth" },
  in_progress: { label: "V řešení", cls: "bg-forest/10 text-forest" },
  resolved: { label: "Vyřízená", cls: "bg-success/10 text-success" },
  rejected: { label: "Zamítnutá", cls: "bg-error/10 text-error" },
};
export const CLAIM_TYPES = ["claim", "withdrawal"] as const;
export type ClaimType = (typeof CLAIM_TYPES)[number];
export const CLAIM_TYPE_LABEL: Record<ClaimType, string> = { claim: "Reklamace", withdrawal: "Odstoupení od smlouvy" };
export function isClaimStatus(v: string): v is ClaimStatus {
  return (CLAIM_STATUSES as readonly string[]).includes(v);
}
export function isClaimType(v: string): v is ClaimType {
  return (CLAIM_TYPES as readonly string[]).includes(v);
}
