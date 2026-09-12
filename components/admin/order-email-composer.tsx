"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Loader2, Mail, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ORDER_MESSAGE_KINDS,
  ORDER_MESSAGE_META,
  type OrderMessageKind,
} from "@/lib/orders/message-drafts";
import { sendOrderMessageAction, type SendOrderEmailState } from "@/lib/admin/order-actions";
import { toast } from "@/components/admin/toast";

type Draft = { subject: string; body: string };

const input =
  "w-full rounded-lg border border-cream-dark bg-white px-3 py-2 text-sm outline-none focus:border-forest";

/** Vlastní zpráva zákazníkovi k objednávce — předvyplněná šablona v jeho jazyce, editovatelná. */
export function OrderEmailComposer({
  orderId,
  customerEmail,
  locale,
  drafts,
}: {
  orderId: string;
  customerEmail: string;
  locale: string;
  drafts: Record<OrderMessageKind, Draft>;
}) {
  const router = useRouter();
  const [kind, setKind] = useState<OrderMessageKind>("custom");
  const [subject, setSubject] = useState(drafts.custom.subject);
  const [body, setBody] = useState(drafts.custom.body);
  const [state, action, pending] = useActionState<SendOrderEmailState, FormData>(
    sendOrderMessageAction,
    { status: "idle" },
  );

  function pick(k: OrderMessageKind) {
    setKind(k);
    setSubject(drafts[k].subject);
    setBody(drafts[k].body);
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
      <div className="mb-3 flex flex-wrap gap-2">
        {ORDER_MESSAGE_KINDS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => pick(k)}
            title={ORDER_MESSAGE_META[k].description}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
              kind === k
                ? "border-forest bg-forest text-white"
                : "border-cream-dark text-charcoal hover:border-forest hover:text-forest",
            )}
          >
            {ORDER_MESSAGE_META[k].label}
          </button>
        ))}
      </div>
      <p className="mb-4 text-xs text-gray-soft">{ORDER_MESSAGE_META[kind].description}</p>

      <form action={action} className="space-y-3">
        <input type="hidden" name="id" value={orderId} />
        <input type="hidden" name="kind" value={kind} />
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-soft">Předmět</span>
          <input name="subject" value={subject} onChange={(e) => setSubject(e.target.value)} required maxLength={200} className={input} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-soft">Text e-mailu</span>
          <textarea
            name="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            rows={12}
            className={cn(input, "font-mono text-[13px] leading-relaxed")}
          />
          <span className="text-xs text-gray-soft">
            Odstavce odděl prázdným řádkem, odrážky začínají „– “. Zástupný text v závorkách „(doplňte)“ nahraď — jinak se e-mail neodešle.
          </span>
        </label>
        <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={() => pick(kind)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-cream-dark px-3 py-2 text-sm text-gray-soft hover:border-forest hover:text-forest"
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
        {state.status === "error" && (
          <p className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{state.message}</p>
        )}
      </form>
    </section>
  );
}
