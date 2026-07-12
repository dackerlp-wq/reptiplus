"use client";

import { Children, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Záložky pro admin sekce. Děti (v pořadí = pořadí tabů) zůstávají v DOM,
 * neaktivní jsou skryté (formuláře si drží stav).
 */
export function AdminTabs({
  tabs,
  children,
}: {
  tabs: string[];
  children: ReactNode;
}) {
  const [active, setActive] = useState(0);
  const panels = Children.toArray(children);

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-1 border-b border-cream-dark">
        {tabs.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => setActive(i)}
            className={cn(
              "-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              active === i
                ? "border-forest text-forest"
                : "border-transparent text-gray-soft hover:text-ink",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {panels.map((panel, i) => (
        <div key={i} className={active === i ? "" : "hidden"}>
          {panel}
        </div>
      ))}
    </div>
  );
}
