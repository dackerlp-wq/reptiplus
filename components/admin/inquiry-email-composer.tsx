"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Loader2, Mail, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  EMAIL_KINDS,
  EMAIL_KIND_META,
  STATUS_META,
  type EmailKind,
} from "@/lib/ledx/inquiry-status";
import {
  sendInquiryEmailAction,
  type SendInquiryEmailState,
} from "@/lib/admin/inquiry-actions";
import { toast } from "@/components/admin/toast";

type Draft = { subject: string; body: string };

const input =
  "w-full rounded-lg border border-cream-dark bg-white px-3 py-2 text-sm outline-none focus:border-forest";

/**
 * Odeslání e-mailu zákazníkovi z detailu poptávky. Text je předvyplněný
 * v jazyce zákazníka podle druhu zprávy, admin ho může upravit.
 */
export function InquiryEmailComposer({
  inquiryId,
  customerEmail,
  locale,
  status,
  drafts,
  disabled = false,
}: {
  inquiryId: string;
  customerEmail: string;
  locale: string;
  status: string;
  drafts: Record<EmailKind, Draft>;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [kind, setKind] = useState<EmailKind>("quote");
  const [subject, setSubject] = useState(drafts.quote.subject);
  const [body, setBody] = useState(drafts.quote.body);
  const [changeStatus, setChangeStatus] = useState(true);
  const [state, action, pending] = useActionState<SendInquiryEmailState, FormData>(
    sendInquiryEmailAction,
    { status: "idle" },
  );

  const meta = EMAIL_KIND_META[kind];
  const suggest = meta.suggestStatus;
  const statusDiffers = suggest !== status;

  function pick(k: EmailKind) {
    setKind(k);
    setSubject(drafts[k].subject);
    setBody(drafts[k].body);
    setChangeStatus(true);
  }

  useEffect(() => {
    if (state.status === "sent") {
      toast.success("E-mail odeslán zákazníkovi");
      router.refresh();
    } else if (state.status === "error") {
      toast.error(state.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <section className="rounded-xl border border-cream-dark bg-white p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
          <Mail className="size-5 text-forest" /> E-mail zákazníkovi
        </h2>
        <span className="text-xs text-gray-soft">
          Příjemce <span className="font-mono text-ink">{customerEmail}</span> · jazyk{" "}
          <span className="font-mono uppercase text-ink">{locale}</span>
        </span>
      </div>

      {disabled ? (
        <p className="rounded-lg bg-cream p-3 text-sm text-gray-soft">
          Poptávka je anonymizovaná — e-mail už není kam poslat.
        </p>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            {EMAIL_KINDS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => pick(k)}
                title={EMAIL_KIND_META[k].description}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                  kind === k
                    ? "border-forest bg-forest text-white"
                    : "border-cream-dark text-charcoal hover:border-forest hover:text-forest",
                )}
              >
                {EMAIL_KIND_META[k].label}
              </button>
            ))}
          </div>
          <p className="mb-4 text-xs text-gray-soft">{meta.description}</p>

          <form action={action} className="space-y-3">
            <input type="hidden" name="id" value={inquiryId} />
            <input type="hidden" name="kind" value={kind} />
            <input
              type="hidden"
              name="new_status"
              value={changeStatus && statusDiffers ? suggest : ""}
            />
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-soft">
                Předmět
              </span>
              <input
                name="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                maxLength={200}
                className={input}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-soft">
                Text e-mailu
              </span>
              <textarea
                name="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
                rows={16}
                className={cn(input, "font-mono text-[13px] leading-relaxed")}
              />
              <span className="text-xs text-gray-soft">
                Odstavce odděl prázdným řádkem, odrážky začínají „– “. Text v
                závorkách „(doplňte)“ nahraď skutečnými údaji — bez toho se e-mail
                neodešle.
              </span>
            </label>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              {statusDiffers ? (
                <label className="flex items-center gap-2 text-sm text-charcoal">
                  <input
                    type="checkbox"
                    checked={changeStatus}
                    onChange={(e) => setChangeStatus(e.target.checked)}
                    className="size-4 accent-forest"
                  />
                  Po odeslání přepnout stav na{" "}
                  <span className="font-semibold">{STATUS_META[suggest].label}</span>
                </label>
              ) : (
                <span className="text-sm text-gray-soft">
                  Stav zůstane {STATUS_META[suggest].label}.
                </span>
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => pick(kind)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-cream-dark px-3 py-2 text-sm text-gray-soft hover:border-forest hover:text-forest"
                  title="Vrátit předvyplněný text"
                >
                  <RotateCcw className="size-4" /> Obnovit šablonu
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="inline-flex items-center gap-2 rounded-lg bg-forest px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-forest-light disabled:opacity-60"
                >
                  {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  {pending ? "Odesílám…" : "Odeslat e-mail"}
                </button>
              </div>
            </div>
            {state.status === "error" && (
              <p className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{state.message}</p>
            )}
          </form>
        </>
      )}
    </section>
  );
}
