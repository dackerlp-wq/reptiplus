"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShieldOff, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { anonymizeInquiryAction, deleteInquiryAction } from "@/lib/admin/inquiry-actions";
import { toast } from "@/components/admin/toast";

const btnGhost =
  "inline-flex items-center gap-2 rounded-lg border border-cream-dark px-3 py-2 text-sm font-medium text-charcoal hover:border-forest hover:text-forest disabled:opacity-60";

/** GDPR akce nad poptávkou: anonymizace (zůstane na stránce) a smazání (přejde na seznam). */
export function InquiryDangerZone({
  inquiryId,
  anonymized,
}: {
  inquiryId: string;
  anonymized: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function run(kind: "anonymize" | "delete") {
    const msg =
      kind === "anonymize"
        ? "Opravdu anonymizovat osobní údaje? Historie komunikace se smaže. Akce je nevratná."
        : "Opravdu smazat poptávku včetně historie? Akce je nevratná.";
    if (!window.confirm(msg)) return;
    const fd = new FormData();
    fd.set("id", inquiryId);
    start(async () => {
      try {
        if (kind === "anonymize") {
          await anonymizeInquiryAction(fd);
          toast.success("Poptávka anonymizována");
          router.refresh();
        } else {
          await deleteInquiryAction(fd);
          toast.success("Poptávka smazána");
          router.push("/admin/inquiries");
        }
      } catch {
        toast.error("Akci se nepodařilo dokončit. Zkuste to prosím znovu.");
      }
    });
  }

  return (
    <section className="space-y-3 rounded-xl border border-error/30 bg-white p-5">
      <h2 className="font-display text-lg font-semibold text-error">Osobní údaje</h2>
      <p className="text-xs text-gray-soft">
        Na žádost zákazníka (GDPR) anonymizuj jméno, e-mail, telefon a poznámku; historie
        komunikace se smaže, záznam pro statistiku zůstane. Smazání odstraní poptávku úplně.
      </p>
      <div className="flex flex-wrap gap-2">
        {!anonymized && (
          <button type="button" disabled={pending} onClick={() => run("anonymize")} className={btnGhost}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <ShieldOff className="size-4" />}
            Anonymizovat
          </button>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={() => run("delete")}
          className={cn(btnGhost, "border-error/40 text-error hover:border-error hover:text-error")}
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
          Smazat
        </button>
      </div>
    </section>
  );
}
