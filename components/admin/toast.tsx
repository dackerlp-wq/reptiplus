"use client";

import {
  useEffect,
  useState,
  useTransition,
  type ComponentProps,
  type ReactNode,
} from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";
type ToastItem = { id: number; type: ToastType; message: string };

// Jednoduchý singleton store — toast lze vyvolat odkudkoli bez kontextu/props.
let listeners: ((t: ToastItem) => void)[] = [];
let counter = 0;
function emit(type: ToastType, message: string) {
  const item = { id: ++counter, type, message };
  listeners.forEach((l) => l(item));
}
export const toast = {
  success: (m: string) => emit("success", m),
  error: (m: string) => emit("error", m),
  info: (m: string) => emit("info", m),
};

const STYLES: Record<
  ToastType,
  { icon: typeof CheckCircle2; ring: string; iconColor: string }
> = {
  success: {
    icon: CheckCircle2,
    ring: "border-success/40",
    iconColor: "text-success",
  },
  error: { icon: AlertCircle, ring: "border-error/50", iconColor: "text-error" },
  info: { icon: Info, ring: "border-forest/40", iconColor: "text-forest" },
};

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const listener = (t: ToastItem) => {
      setItems((prev) => [...prev, t]);
      const ttl = t.type === "error" ? 6000 : 3500;
      setTimeout(() => {
        setItems((prev) => prev.filter((x) => x.id !== t.id));
      }, ttl);
    };
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  }, []);

  const dismiss = (id: number) =>
    setItems((prev) => prev.filter((x) => x.id !== id));

  if (items.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2">
      <style>{`@keyframes rp-toast-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`}</style>
      {items.map((t) => {
        const s = STYLES[t.type];
        const Icon = s.icon;
        return (
          <div
            key={t.id}
            role="status"
            style={{ animation: "rp-toast-in .18s ease-out" }}
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border bg-white px-4 py-3 shadow-lg ${s.ring}`}
          >
            <Icon className={`mt-0.5 size-5 shrink-0 ${s.iconColor}`} />
            <p className="flex-1 text-sm leading-snug text-ink">{t.message}</p>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="shrink-0 rounded p-0.5 text-gray-soft hover:text-ink"
              aria-label="Zavřít"
            >
              <X className="size-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Přečte „flash" z URL po přesměrování ze Server Action (uložení/chyba),
 * zobrazí toast a parametry z URL odstraní. Token `t` zajišťuje spuštění
 * i při opakovaném přesměrování na stejný stav.
 */
export function FlashToast() {
  const sp = useSearchParams();
  const token = sp.get("t");
  const flash = sp.get("flash");

  useEffect(() => {
    if (!flash) return;
    const msg = sp.get("msg");
    if (flash === "saved") toast.success(msg || "Uloženo");
    else if (flash === "deleted") toast.success(msg || "Smazáno");
    else if (flash === "error") toast.error(msg || "Nepodařilo se uložit");

    const params = new URLSearchParams(window.location.search);
    params.delete("flash");
    params.delete("msg");
    params.delete("t");
    const qs = params.toString();
    window.history.replaceState(
      null,
      "",
      window.location.pathname + (qs ? `?${qs}` : ""),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, flash]);

  return null;
}

/**
 * Formulář se Server Action, který po dokončení ukáže toast.
 * Používej pro akce, které NEPŘESMĚROVÁVAJÍ (zůstávají na stránce).
 * Chybu akce (throw) ukáže jako červený toast.
 */
export function ToastForm({
  action,
  success = "Uloženo",
  confirm: confirmMsg,
  onSuccess,
  children,
  ...rest
}: {
  action: (fd: FormData) => Promise<void>;
  success?: string;
  confirm?: string;
  onSuccess?: () => void;
  children: ReactNode;
} & Omit<ComponentProps<"form">, "action">) {
  const [pending, start] = useTransition();
  return (
    <form
      {...rest}
      aria-busy={pending}
      action={(fd) => {
        if (confirmMsg && !window.confirm(confirmMsg)) return;
        start(async () => {
          try {
            await action(fd);
            toast.success(success);
            onSuccess?.();
          } catch {
            // Server Action chybu v produkci maskuje → obecná srozumitelná hláška.
            toast.error("Akci se nepodařilo dokončit. Zkuste to prosím znovu.");
          }
        });
      }}
    >
      {children}
    </form>
  );
}
