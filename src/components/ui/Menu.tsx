"use client";

import React, { useEffect, useRef } from "react";
import { Glass } from "@/components/glass/Glass";

export type MenuItem =
  | { kind: "item"; label: string; icon?: React.ReactNode; danger?: boolean; disabled?: boolean; checked?: boolean; onSelect: () => void }
  | { kind: "sep" }
  | { kind: "label"; label: string };

/**
 * 起点に紐づいたポップオーバー。transform-origin を起点側へ寄せ、
 * 「押した場所から生えてくる」空間的な連続性を保つ（Apple: Spatial consistency）。
 */
export function Menu({
  open,
  onClose,
  items,
  align = "end",
  origin = "top",
  width = 210,
}: {
  open: boolean;
  onClose: () => void;
  items: MenuItem[];
  align?: "start" | "end";
  origin?: "top" | "bottom";
  width?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    // capture 段で拾い、起点ボタンの再トグルと競合させない
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <div
      ref={ref}
      className="menu"
      data-open={open}
      style={{
        position: "absolute",
        zIndex: 60,
        width,
        [align === "end" ? "right" : "left"]: 0,
        [origin === "top" ? "top" : "bottom"]: "calc(100% + 8px)",
        transformOrigin: `${origin === "top" ? "top" : "bottom"} ${align === "end" ? "right" : "left"}`,
      } as React.CSSProperties}
    >
      <Glass variant="chrome" radius={14} bevel={11} contentClassName="p-1.5">
        {items.map((it, i) => {
          if (it.kind === "sep") return <hr key={i} className="hair my-1.5" />;
          if (it.kind === "label")
            return <div key={i} className="t-tiny px-2.5 pt-1.5 pb-1">{it.label}</div>;
          return (
            <button
              key={i}
              type="button"
              className="row menu__item"
              disabled={it.disabled}
              data-danger={it.danger || undefined}
              onClick={() => { it.onSelect(); onClose(); }}
            >
              <span className="w-[18px] grid place-items-center shrink-0 opacity-80">{it.icon}</span>
              <span className="flex-1 text-[13.5px]">{it.label}</span>
              {it.checked && <span className="text-[11px] opacity-70">✓</span>}
            </button>
          );
        })}
      </Glass>
    </div>
  );
}
