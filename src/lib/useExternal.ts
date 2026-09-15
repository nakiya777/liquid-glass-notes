"use client";

import { useCallback, useSyncExternalStore } from "react";
import { detectRefractionSupport } from "./lens";

/**
 * メディアクエリの購読。ブラウザ側の状態なので effect で setState せず
 * useSyncExternalStore で読む（描画の連鎖を起こさない）。
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    [query],
  );
  const get = useCallback(() => window.matchMedia(query).matches, [query]);
  return useSyncExternalStore(subscribe, get, () => false);
}

/* 判定は一度きり。スナップショットを安定させるため結果を保持する */
let refractionCache: boolean | null = null;
function refractionSnapshot(): boolean {
  if (refractionCache === null) refractionCache = detectRefractionSupport();
  return refractionCache;
}
const noopSubscribe = () => () => {};

/** SVG 屈折が使えるブラウザか。サーバ側は常に false */
export function useRefractionSupport(): boolean {
  return useSyncExternalStore(noopSubscribe, refractionSnapshot, () => false);
}
