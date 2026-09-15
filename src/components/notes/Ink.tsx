"use client";

import React, { useCallback, useRef, useState } from "react";
import type { InkStroke } from "@/lib/types";
import { createLogger } from "@/lib/debug";

const log = createLogger("ink");

/** 手書きの仮想座標系。実寸に依らずメモへ保存できる */
export const INK_W = 800;
export const INK_H = 1120;

const toolStyle = (t: InkStroke["tool"]): React.CSSProperties =>
  t === "marker"
    ? { mixBlendMode: "multiply", opacity: 0.4 }
    : t === "pencil"
      ? { opacity: 0.82 }
      : {};

export function InkLayer({
  strokes,
  className = "",
  style,
}: {
  strokes: InkStroke[];
  className?: string;
  style?: React.CSSProperties;
}) {
  if (!strokes.length) return null;
  return (
    <svg
      viewBox={`0 0 ${INK_W} ${INK_H}`}
      preserveAspectRatio="xMidYMin meet"
      className={className}
      style={style}
      aria-hidden
    >
      {strokes.map((s) => (
        <path
          key={s.id}
          d={s.d}
          stroke={s.color}
          strokeWidth={s.width}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={toolStyle(s.tool)}
        />
      ))}
    </svg>
  );
}

export type InkTool = InkStroke["tool"] | "eraser";

/** 点列を中点二次ベジエで滑らかに繋ぐ */
function toPath(pts: Array<[number, number]>): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) {
    const [x, y] = pts[0];
    return `M ${x.toFixed(1)} ${y.toFixed(1)} l 0.01 0.01`;
  }
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[i + 1];
    d += ` Q ${x1.toFixed(1)} ${y1.toFixed(1)} ${((x1 + x2) / 2).toFixed(1)} ${((y1 + y2) / 2).toFixed(1)}`;
  }
  const last = pts[pts.length - 1];
  d += ` L ${last[0].toFixed(1)} ${last[1].toFixed(1)}`;
  return d;
}

/** パス上の点を拾って当たり判定に使う */
function hitsStroke(d: string, x: number, y: number, r: number): boolean {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", d);
  svg.appendChild(path);
  document.body.appendChild(svg);
  try {
    const len = path.getTotalLength();
    const step = Math.max(2, len / 220);
    for (let l = 0; l <= len; l += step) {
      const p = path.getPointAtLength(l);
      if (Math.hypot(p.x - x, p.y - y) <= r) return true;
    }
    return false;
  } catch {
    return false;
  } finally {
    svg.remove();
  }
}

export function InkCanvas({
  strokes,
  tool,
  color,
  size,
  onCommit,
}: {
  strokes: InkStroke[];
  tool: InkTool;
  color: string;
  size: number;
  onCommit: (next: InkStroke[]) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const ptsRef = useRef<Array<[number, number]>>([]);
  const [draft, setDraft] = useState<string>("");

  const toLocal = useCallback((e: React.PointerEvent): [number, number] => {
    const el = hostRef.current!;
    const r = el.getBoundingClientRect();
    // viewBox は xMidYMin meet。実際に描画される矩形を割り出す
    const scale = Math.min(r.width / INK_W, r.height / INK_H);
    const drawW = INK_W * scale;
    const offX = (r.width - drawW) / 2;
    return [(e.clientX - r.left - offX) / scale, (e.clientY - r.top) / scale];
  }, []);

  const onDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    const p = toLocal(e);

    if (tool === "eraser") {
      const keep = strokes.filter((s) => !hitsStroke(s.d, p[0], p[1], size * 1.6));
      if (keep.length !== strokes.length) onCommit(keep);
      ptsRef.current = [p];
      return;
    }
    ptsRef.current = [p];
    setDraft(toPath(ptsRef.current));   // 押した瞬間に点を出す（反応の即時性）
  };

  const onMove = (e: React.PointerEvent) => {
    if (!ptsRef.current.length) return;
    const p = toLocal(e);

    if (tool === "eraser") {
      const keep = strokes.filter((s) => !hitsStroke(s.d, p[0], p[1], size * 1.6));
      if (keep.length !== strokes.length) onCommit(keep);
      return;
    }
    const last = ptsRef.current[ptsRef.current.length - 1];
    if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 1.4) return; // 微細な震えを間引く
    ptsRef.current.push(p);
    setDraft(toPath(ptsRef.current));
  };

  const onUp = () => {
    if (tool !== "eraser" && ptsRef.current.length) {
      const d = toPath(ptsRef.current);
      const stroke: InkStroke = {
        id: `ink_${Math.random().toString(36).slice(2, 10)}`,
        d,
        color,
        width: size,
        tool: tool as InkStroke["tool"],
      };
      log.log("stroke", { points: ptsRef.current.length, tool });
      onCommit([...strokes, stroke]);
    }
    ptsRef.current = [];
    setDraft("");
  };

  return (
    <div
      ref={hostRef}
      className="ink-canvas"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      data-tool={tool}
    >
      <svg viewBox={`0 0 ${INK_W} ${INK_H}`} preserveAspectRatio="xMidYMin meet" className="ink-canvas__svg">
        {strokes.map((s) => (
          <path key={s.id} d={s.d} stroke={s.color} strokeWidth={s.width} fill="none"
            strokeLinecap="round" strokeLinejoin="round" style={toolStyle(s.tool)} />
        ))}
        {draft && (
          <path d={draft} stroke={color} strokeWidth={size} fill="none"
            strokeLinecap="round" strokeLinejoin="round"
            style={toolStyle(tool === "eraser" ? "pen" : (tool as InkStroke["tool"]))} />
        )}
      </svg>
    </div>
  );
}
