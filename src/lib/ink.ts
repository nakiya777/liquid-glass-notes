import type { InkStroke } from "./types";

/** 決定的に「葉」のストローク群を生成する（参考画像の複製ではない自作図形） */
export function makeLeaf(
  cx: number,
  cy: number,
  scale: number,
  color: string,
  rotate = 0,
): InkStroke[] {
  const rad = (rotate * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const P = (x: number, y: number) => {
    const sx = x * scale;
    const sy = y * scale;
    return `${(cx + sx * cos - sy * sin).toFixed(1)} ${(cy + sx * sin + sy * cos).toFixed(1)}`;
  };

  const outline =
    `M ${P(0, 62)} C ${P(-38, 30)} ${P(-47, -18)} ${P(0, -64)} ` +
    `C ${P(47, -18)} ${P(38, 30)} ${P(0, 62)} Z`;
  const midrib = `M ${P(0, 56)} L ${P(0, -54)}`;
  const veins = [-1, 1].flatMap((s) =>
    [26, 2, -22].map(
      (y, i) =>
        `M ${P(0, y)} C ${P(s * 12, y - 10)} ${P(s * 22, y - 18 - i * 2)} ${P(s * (30 - i * 4), y - 26 - i * 3)}`,
    ),
  );

  const mk = (d: string, width: number, tool: InkStroke["tool"]): InkStroke => ({
    id: `ink_${Math.random().toString(36).slice(2, 10)}`,
    d,
    color,
    width,
    tool,
  });

  return [mk(outline, 3.2, "pen"), mk(midrib, 2.2, "pen"), ...veins.map((d) => mk(d, 1.6, "pencil"))];
}
