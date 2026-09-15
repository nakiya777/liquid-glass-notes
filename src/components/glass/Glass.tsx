"use client";

import React from "react";
import { useLens } from "./LensProvider";

export type GlassVariant = "panel" | "chrome" | "control" | "card" | "bare";

type Props = {
  radius?: number;
  variant?: GlassVariant;
  /** 屈折を使わない（小さすぎる面や、内側が真っ白な面） */
  noLens?: boolean;
  bevel?: number;
  lensScale?: number;
  className?: string;
  contentClassName?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
} & Omit<React.HTMLAttributes<HTMLDivElement>, "style" | "className" | "children">;

/**
 * Liquid Glass 面。下から順に
 *   frost（全面のぼかし）→ rim（縁だけの屈折）→ tint（材質色）
 *   → sheen（斜めの艶）→ edge（1px の縁光）→ content
 * 屈折非対応ブラウザでは rim 層を出さない。frost 以下だけで成立する。
 */
export const Glass = React.forwardRef<HTMLDivElement, Props>(function Glass(
  {
    radius = 26,
    variant = "panel",
    noLens = false,
    bevel,
    lensScale,
    className = "",
    contentClassName = "",
    style,
    children,
    ...rest
  },
  forwardedRef,
) {
  const { ref, entry } = useLens({ radius, bevel, scale: lensScale, disabled: noLens });

  const setRefs = React.useCallback(
    (el: HTMLDivElement | null) => {
      ref.current = el;
      if (typeof forwardedRef === "function") forwardedRef(el);
      else if (forwardedRef) forwardedRef.current = el;
    },
    [ref, forwardedRef],
  );

  return (
    <div
      ref={setRefs}
      className={`glass glass--${variant} ${className}`}
      style={{ ["--g-radius" as string]: `${radius}px`, ...style }}
      {...rest}
    >
      {/* 霜層。屈折を使う時は縁の帯を空けて、屈折層に生の背景を渡す */}
      <span
        aria-hidden
        className="glass__layer glass__frost"
        style={
          entry
            ? ({
                maskImage: `url(${entry.coreMaskUrl})`,
                WebkitMaskImage: `url(${entry.coreMaskUrl})`,
                maskSize: "100% 100%",
                WebkitMaskSize: "100% 100%",
              } as React.CSSProperties)
            : undefined
        }
      />
      {entry && (
        <span
          aria-hidden
          className="glass__layer glass__rim"
          style={{
            backdropFilter: `url(#${entry.filterId})`,
            WebkitBackdropFilter: `url(#${entry.filterId})`,
            maskImage: `url(${entry.maskUrl})`,
            WebkitMaskImage: `url(${entry.maskUrl})`,
            maskSize: "100% 100%",
            WebkitMaskSize: "100% 100%",
          } as React.CSSProperties}
        />
      )}
      <span aria-hidden className="glass__layer glass__tint" />
      <span aria-hidden className="glass__layer glass__sheen" />
      <span aria-hidden className="glass__layer glass__edge" />
      <div className={`glass__content ${contentClassName}`}>{children}</div>
    </div>
  );
});
