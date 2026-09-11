import { cn } from "@/lib/utils";
import { isInquiryStatus, STATUS_META } from "@/lib/ledx/inquiry-status";

/** Barevný štítek stavu poptávky LEDX. */
export function InquiryStatusBadge({
  status,
  size = "sm",
  className,
}: {
  status: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const meta = isInquiryStatus(status) ? STATUS_META[status] : null;
  return (
    <span
      title={meta?.hint}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md font-semibold whitespace-nowrap",
        size === "md" ? "px-2.5 py-1 text-sm" : "px-2 py-0.5 text-xs",
        meta?.cls ?? "bg-cream text-gray-soft",
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", meta?.dot ?? "bg-gray-soft")} />
      {meta?.label ?? status}
    </span>
  );
}
