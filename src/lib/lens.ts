import { createLogger } from "./debug";

const log = createLogger("lens");

/* ------------------------------------------------------------------ *
 * ブラウザ対応判定
 *
 * 実測（2026-09-14）:
 *   Chromium 152 : backdrop-filter: url(#f) が期待通り屈折する
 *   Safari  27.0 : 屈折しないばかりか、url() を含めると backdrop-filter
 *                  そのものが丸ごと無効化される（ぼかしも消える）
 *   CSS.supports('backdrop-filter','url(#f)') は Safari でも true を返す＝
 *   機能検出に使えない。よって「Chromium と積極的に判定できた時だけ有効化」
 *   するフェイルセーフ方式を採る。
 * ------------------------------------------------------------------ */
export function detectRefractionSupport(): boolean {
  if (typeof navigator === "undefined") return false;

  const uaData = (navigator as Navigator & {
    userAgentData?: { brands?: Array<{ brand: string; version: string }> };
  }).userAgentData;

  let chromium: boolean;
  if (Array.isArray(uaData?.brands)) {
    chromium = uaData.brands.some((b) => /Chromium/i.test(b.brand));
  } else {
    // userAgentData 非搭載（Safari / Firefox / 旧ブラウザ）は UA で最終判定
    chromium = /Chrome\/\d+/.test(navigator.userAgent) && !/OPR\//.test(navigator.userAgent);
  }

  const base = typeof CSS !== "undefined" && CSS.supports("backdrop-filter", "blur(4px)");
  log.log("detect", { chromium, base, ua: navigator.userAgent });
  return chromium && base;
}

/* ------------------------------------------------------------------ *
 * 変位マップ生成
 *
 * 角丸長方形の符号付き距離場（SDF）から外向き法線を求め、縁の面取り帯
 * （bevel）だけに変位を与える。R=X変位 / G=Y変位 を 128 中心で符号化する。
 * feDisplacementMap は
 *   P'(x,y) = P(x + scale*(R/255 - .5), y + scale*(G/255 - .5))
 * で参照位置をずらすため、法線方向に正の値を入れると「縁の外側の像を内側へ
 * 引き込む」＝ガラス面取りの圧縮像になる。
 * ------------------------------------------------------------------ */
export type LensSpec = {
  w: number;
  h: number;
  /** 角丸半径 */
  r: number;
  /** 屈折する縁の帯幅(px) */
  bevel: number;
  /** プロファイル指数。大きいほど縁に寄る */
  power: number;
};

const TAPER = 1.5; // 最外周は変位を落として外側参照の滲みを防ぐ

function clamp8(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v | 0;
}

export function lensKey(s: LensSpec): string {
  return `${s.w}x${s.h}r${s.r}b${s.bevel}p${s.power}`;
}

export function buildLensMap(spec: LensSpec): string | null {
  const { w, h, r, bevel, power } = spec;
  if (typeof document === "undefined") return null;
  if (w < 8 || h < 8 || bevel <= 0) return null;

  return log.time(`build ${lensKey(spec)}`, () => {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const img = ctx.createImageData(w, h);
    const D = img.data;

    const hw = w / 2;
    const hh = h / 2;
    const rr = Math.max(0, Math.min(r, hw, hh));
    const ax = hw - rr; // 直線部の半長
    const ay = hh - rr;

    for (let y = 0; y < h; y++) {
      const dy = y + 0.5 - hh;
      const sy = dy < 0 ? -1 : 1;
      const py = Math.abs(dy) - ay;

      for (let x = 0; x < w; x++) {
        const i = (y * w + x) << 2;
        const dx = x + 0.5 - hw;
        const sx = dx < 0 ? -1 : 1;
        const px = Math.abs(dx) - ax;

        const qx = px > 0 ? px : 0;
        const qy = py > 0 ? py : 0;
        const outer = Math.sqrt(qx * qx + qy * qy);
        const inner = Math.min(Math.max(px, py), 0);
        const dist = outer + inner - rr; // 内部で負
        const depth = -dist;             // 縁からの内向き距離

        if (depth <= 0 || depth >= bevel) {
          D[i] = 128; D[i + 1] = 128; D[i + 2] = 128; D[i + 3] = 255;
          continue;
        }

        // SDF の勾配 ＝ 外向き法線
        let gx: number;
        let gy: number;
        if (outer > 0) {
          gx = (qx / outer) * sx;
          gy = (qy / outer) * sy;
        } else if (px > py) {
          gx = sx; gy = 0;
        } else {
          gx = 0; gy = sy;
        }

        const t = 1 - depth / bevel;                 // 0=内側 → 1=縁
        const taper = depth < TAPER ? depth / TAPER : 1;
        const amp = Math.pow(t, power) * taper;

        D[i] = clamp8(128 + gx * amp * 127);
        D[i + 1] = clamp8(128 + gy * amp * 127);
        D[i + 2] = 128;
        D[i + 3] = 255;
      }
    }

    ctx.putImageData(img, 0, 0);
    return canvas.toDataURL();
  });
}

/* ------------------------------------------------------------------ *
 * 壁紙の平均輝度を測り、明／暗どちらのガラス材質が適するか決める
 * ------------------------------------------------------------------ */
export async function measureWallpaperLuminance(src: string): Promise<number> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = src;
  await img.decode();

  const W = 64;
  const H = Math.max(1, Math.round((img.naturalHeight / img.naturalWidth) * W));
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return 0.5;
  ctx.drawImage(img, 0, 0, W, H);

  const { data } = ctx.getImageData(0, 0, W, H);
  let sum = 0;
  for (let i = 0; i < data.length; i += 4) {
    // 相対輝度（sRGB 近似）
    sum += (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
  }
  const mean = sum / (data.length / 4);
  log.log("wallpaper luminance", mean.toFixed(3));
  return mean;
}
