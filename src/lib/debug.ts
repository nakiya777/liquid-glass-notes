/**
 * 名前空間付きデバッグロガー。
 * 有効化: localStorage.setItem('lgn:debug', '*')  もしくは 'lens,store' のようにCSV指定。
 * 本番ビルドでも localStorage で個別に有効化できる（既定は無効）。
 */
const KEY = "lgn:debug";

function enabledNamespaces(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY) ?? process.env.NEXT_PUBLIC_DEBUG ?? "";
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function isOn(ns: string): boolean {
  const list = enabledNamespaces();
  return list.includes("*") || list.includes(ns);
}

export type Logger = {
  log: (...a: unknown[]) => void;
  warn: (...a: unknown[]) => void;
  error: (...a: unknown[]) => void;
  time: <T>(label: string, fn: () => T) => T;
};

export function createLogger(ns: string): Logger {
  const tag = `%c[${ns}]`;
  const style = "color:#8a6d1f;font-weight:600";
  return {
    log: (...a) => { if (isOn(ns)) console.log(tag, style, ...a); },
    warn: (...a) => { if (isOn(ns)) console.warn(tag, style, ...a); },
    // error は常時出す（握り潰さない）
    error: (...a) => console.error(tag, style, ...a),
    time: (label, fn) => {
      if (!isOn(ns)) return fn();
      const t0 = performance.now();
      const out = fn();
      console.log(tag, style, `${label}: ${(performance.now() - t0).toFixed(1)}ms`);
      return out;
    },
  };
}
