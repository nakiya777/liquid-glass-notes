# Liquid Glass 材質仕様

- 文書種別: 領域別正本（ガラス材質）
- ステータス: 現行
- 更新日: 2026-09-14

## 層構造

ガラス面は下から順に6層で構成する。実装は `src/components/glass/Glass.tsx`。

| 順 | 層 | 役割 | 実装 |
|---|---|---|---|
| 1 | frost | 全面のぼかしと彩度上昇 | `backdrop-filter: blur() saturate() brightness()` |
| 2 | rim | 縁だけの屈折 | `backdrop-filter: url(#lens-…)` ＋ 縁マスク |
| 3 | tint | 材質の明暗を決める半透明の塗り | `background: var(--g-tint)` |
| 4 | sheen | 斜めに走る艶 | 線形グラデーション |
| 5 | edge | 1px の縁光 | グラデーション枠を `mask-composite: exclude` で抜く |
| 6 | content | 中身 | `position: relative; z-index: 1` |

### frost と rim の関係

frost には rim マスクの**反転**を掛け、縁の帯を空ける。これを怠ると rim は「既にぼかされた像」を変位させることになり、平滑な背景では見た目がまったく変わらない。実測でこの不具合を確認済み。

### 屈折の作り方

角丸長方形の符号付き距離場から外向き法線を求め、縁の面取り帯だけに変位を与える。R チャンネルに X 変位、G チャンネルに Y 変位を 128 中心で符号化し、`feImage` → `feDisplacementMap` へ渡す。実装は `src/lib/lens.ts` の `buildLensMap`。

- 面取り幅 `bevel` の既定は `radius × 0.8`、短辺の 1/3 を上限とする
- 変位量 `scale` の既定は `bevel × 1.3`
- 最外周 1.5px は変位を落とす（外側を参照して滲むのを防ぐ）
- 同じ寸法の面はフィルタを共有する（上限48件）

## 設計トークン

`src/app/globals.css` の `:root` と `[data-material="dark"]` に定義する。

| トークン | 明 | 暗 |
|---|---|---|
| `--g-blur` | 14px | 22px |
| `--g-sat` | 172% | 160% |
| `--g-bright` | 1.0 | 0.96 |
| `--g-tint` | `rgba(255,255,255,.13)` | `rgba(24,24,28,.30)` |
| `--g-sheen` | 0.20 | 0.10 |
| `--ink` | `#1c1c1e` | `rgba(255,255,255,.96)` |
| `--accent` | `#d99a25` | `#f2b845` |

面の大小で重みを変える。大きい面ほど強くぼかし影を深くする（`glass--panel` → `glass--chrome` → `glass--control`）。

## 材質の自動判定

壁紙を 64px 幅へ縮小して平均相対輝度を測り、0.55 を境に明／暗を選ぶ。実装は `measureWallpaperLuminance`。設定で「自動／明／暗」を手動指定できる。

## 配慮設定

| 設定 | 振る舞い |
|---|---|
| `prefers-reduced-motion: reduce` | 遷移を 0.12 秒へ短縮、押下時の縮小を止める |
| `prefers-reduced-transparency: reduce` | 既定では尊重しない。設定で従うと不透明化する（[ADR-002](../decisions/ADR-002-reduced-transparency.md)） |
| `prefers-contrast: more` | 塗りをほぼ不透明にし、罫線と副次文字を濃くする |

## 受入条件

1. 背景に構造（木目、葉、窓枠）がある場所では、板の内側にその構造がぼけて見える。
2. 板の縁で背景像が圧縮・湾曲する（Chromium）。
3. 屈折に非対応のブラウザでは rim 層を出さず、frost だけで成立する。
4. 暗い材質では壁紙を暗く沈め、白文字が読める。
