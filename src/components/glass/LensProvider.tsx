"use client";

import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from "react";
import { buildLensMap, lensKey, type LensSpec } from "@/lib/lens";
import { useRefractionSupport } from "@/lib/useExternal";
import { createLogger } from "@/lib/debug";

const log = createLogger("lens");

export type LensEntry = {
  key: string;
  filterId: string;
  mapUrl: string;
  /** 縁の帯だけを通すマスク（屈折層に掛ける） */
  maskUrl: string;
  /** その反転。霜層に掛けて縁を空け、屈折層に生の背景を掴ませる */
  coreMaskUrl: string;
  spec: LensSpec;
  scale: number;
};

type Ctx = {
  supported: boolean;
  enabled: boolean;
  register: (spec: LensSpec, scale: number) => LensEntry | null;
};

const LensCtx = createContext<Ctx | null>(null);

/**
 * 縁だけを抜くソフトマスクと、その反転を作る。
 * 変位マップと同じ SDF から起こすので境目がずれない。
 *
 * 反転側（core）を霜層に掛けるのが要点。霜層が縁まで覆っていると、
 * 屈折層は「既にぼかされた像」を変位させることになり、平滑な背景では
 * 見た目がまったく変わらない。縁を空けて生の背景を掴ませる。
 */
function buildRimMasks(spec: LensSpec): { rim: string; core: string } | null {
  const { w, h, r, bevel } = spec;
  if (typeof document === "undefined" || w < 8 || h < 8) return null;
  const mk = () => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
  };
  const rimC = mk();
  const coreC = mk();
  const rctx = rimC.getContext("2d");
  const cctx = coreC.getContext("2d");
  if (!rctx || !cctx) return null;

  const rimImg = rctx.createImageData(w, h);
  const coreImg = cctx.createImageData(w, h);
  const R = rimImg.data;
  const C = coreImg.data;

  const hw = w / 2;
  const hh = h / 2;
  const rr = Math.max(0, Math.min(r, hw, hh));
  const ax = hw - rr;
  const ay = hh - rr;

  for (let y = 0; y < h; y++) {
    const dy = Math.abs(y + 0.5 - hh) - ay;
    for (let x = 0; x < w; x++) {
      const dx = Math.abs(x + 0.5 - hw) - ax;
      const qx = dx > 0 ? dx : 0;
      const qy = dy > 0 ? dy : 0;
      const dist = Math.sqrt(qx * qx + qy * qy) + Math.min(Math.max(dx, dy), 0) - rr;
      const depth = -dist;
      const t = depth <= 0 ? 1 : depth >= bevel ? 0 : 1 - depth / bevel;
      const a = Math.round(Math.pow(t, 1.15) * 255);
      const i = (y * w + x) << 2;
      R[i] = 255; R[i + 1] = 255; R[i + 2] = 255; R[i + 3] = a;
      C[i] = 255; C[i + 1] = 255; C[i + 2] = 255; C[i + 3] = 255 - a;
    }
  }
  rctx.putImageData(rimImg, 0, 0);
  cctx.putImageData(coreImg, 0, 0);
  return { rim: rimC.toDataURL(), core: coreC.toDataURL() };
}

const MAX_ENTRIES = 48;

export function LensProvider({
  enabled = true,
  children,
}: {
  enabled?: boolean;
  children: React.ReactNode;
}) {
  const supported = useRefractionSupport();
  // 同期的な重複判定用。描画中には読まない
  const cache = useRef(new Map<string, LensEntry>());
  // DOM へ出すフィルタ一覧は state で持つ（ref を描画中に読まないため）
  const [entries, setEntries] = useState<LensEntry[]>([]);

  const register = useCallback((spec: LensSpec, scale: number): LensEntry | null => {
    const key = `${lensKey(spec)}s${scale}`;
    const hit = cache.current.get(key);
    if (hit) return hit;

    const mapUrl = buildLensMap(spec);
    const masks = buildRimMasks(spec);
    if (!mapUrl || !masks) return null;

    if (cache.current.size >= MAX_ENTRIES) {
      const oldest = cache.current.keys().next().value;
      if (oldest) {
        cache.current.delete(oldest);
        setEntries((prev) => prev.filter((e) => e.key !== oldest));
        log.warn("registry full; evicted", oldest);
      }
    }

    const entry: LensEntry = {
      key,
      filterId: `lens-${key.replace(/[^a-z0-9]/gi, "")}`,
      mapUrl,
      maskUrl: masks.rim,
      coreMaskUrl: masks.core,
      spec,
      scale,
    };
    cache.current.set(key, entry);
    setEntries((prev) => (prev.some((e) => e.key === key) ? prev : [...prev, entry]));
    return entry;
  }, []);

  const active = supported && enabled;

  const value = useMemo<Ctx>(
    () => ({ supported, enabled: active, register }),
    [supported, active, register],
  );

  return (
    <LensCtx.Provider value={value}>
      {children}
      <svg aria-hidden className="lens-defs" width="0" height="0">
        <defs>
          {entries.map((e) => (
            <filter
              key={e.key}
              id={e.filterId}
              x="0%" y="0%" width="100%" height="100%"
              filterUnits="objectBoundingBox"
              primitiveUnits="userSpaceOnUse"
              colorInterpolationFilters="sRGB"
            >
              <feImage
                href={e.mapUrl}
                x="0" y="0" width={e.spec.w} height={e.spec.h}
                preserveAspectRatio="none"
                result="map"
              />
              <feDisplacementMap
                in="SourceGraphic" in2="map"
                scale={e.scale}
                xChannelSelector="R" yChannelSelector="G"
                result="disp"
              />
              {/* ガラス縁は完全な鏡ではないので、ごく弱く散らす */}
              <feGaussianBlur in="disp" stdDeviation="0.7" result="soft" />
              {/* 縁で拾う像をわずかに持ち上げ、ガラスの艶を出す */}
              <feComponentTransfer in="soft">
                <feFuncR type="linear" slope="1.06" intercept="0.012" />
                <feFuncG type="linear" slope="1.06" intercept="0.012" />
                <feFuncB type="linear" slope="1.06" intercept="0.012" />
              </feComponentTransfer>
            </filter>
          ))}
        </defs>
      </svg>
    </LensCtx.Provider>
  );
}

export function useLensContext(): Ctx {
  const ctx = useContext(LensCtx);
  if (!ctx) throw new Error("useLens must be used within <LensProvider>");
  return ctx;
}

/** 自身のサイズを測り、そのサイズ専用の屈折フィルタを取得する */
export function useLens(opts: {
  radius: number;
  bevel?: number;
  power?: number;
  scale?: number;
  disabled?: boolean;
}) {
  const { supported, enabled, register } = useLensContext();
  const ref = useRef<HTMLDivElement | null>(null);
  const [entry, setEntry] = useState<LensEntry | null>(null);

  const { radius, bevel, power = 1.9, scale, disabled } = opts;
  const bevelPx = bevel ?? Math.max(8, Math.round(radius * 0.8));
  const scalePx = scale ?? Math.round(bevelPx * 1.3);

  const off = !enabled || disabled;

  useEffect(() => {
    if (off) return;
    const el = ref.current;
    if (!el) return;

    let raf = 0;
    const measure = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const w = Math.round(r.width);
        const h = Math.round(r.height);
        if (w < 8 || h < 8) return;
        // 小さな面では帯が面積を食い潰すので、短辺の 1/3 までに抑える
        const b = Math.min(bevelPx, Math.max(4, Math.floor(Math.min(w, h) / 3)));
        const sc = Math.min(scalePx, Math.round(b * 1.4));
        setEntry(register({ w, h, r: radius, bevel: b, power }, sc));
      });
    };

    // ResizeObserver は observe した時点で一度発火するので、初回計測も任せる
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [off, radius, bevelPx, power, scalePx, register]);

  return { ref, entry: off ? null : entry, supported, enabled };
}
