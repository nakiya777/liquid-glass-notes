# Liquid Glass Notes

Apple の Liquid Glass を Web 標準だけで再現したメモアプリ。Next.js 16 / React 19 / Tailwind v4 / TypeScript。

## 最初に読むもの

`docs/INDEX.md` から作業対象の正本だけを読む。全文書の一括読込はしない。

## 開発

```bash
npm run dev      # http://localhost:3000
npm run build
npx eslint src --max-warnings=0
npx tsc --noEmit
```

デバッグログは `localStorage.setItem('lgn:debug','*')` で有効化する。名前空間は `lens` `store` `shell` `editor` `toolbar` `ink`。

## 踏んではいけない穴

作業前に必ず把握すること。いずれも実測で確認済みの落とし穴である。

1. **CSS にベンダ接頭辞を手書きしない。** Lightning CSS が接頭辞違いを重複とみなし、標準プロパティの方を消す。`backdrop-filter` がこれで丸ごと無効になった実績がある（[ADR-003](docs/decisions/ADR-003-css-prefix-pitfall.md)）。
2. **Tailwind の組込ユーティリティと同名のクラスを作らない。** `.collapse` は Tailwind 側で `visibility: collapse` を持つ。自作の `.collapse` と衝突してサイドバーが不可視になった。現在は `.disclosure` に改名済み。
3. **`CSS.supports('backdrop-filter','url(#x)')` を機能検出に使わない。** Safari が偽陽性を返す（[ADR-001](docs/decisions/ADR-001-svg-refraction.md)）。
4. **frost 層と rim 層のマスクは対で扱う。** frost が縁まで覆っていると、rim は既にぼかされた像を変位させることになり屈折が見えない（[材質仕様](docs/glass/material.md)）。
5. **見た目の不具合を配色の問題と決めつけない。** `getComputedStyle` と配信中の CSS 本文を先に確認する。

## 設計の要点

- ガラスは6層（frost / rim / tint / sheen / edge / content）。定義は `src/components/glass/Glass.tsx`
- 屈折は角丸長方形の距離場から変位マップを canvas で生成し `feDisplacementMap` へ渡す。`src/lib/lens.ts`
- 屈折は Chromium と積極判定できた時だけ有効。非対応環境は frost だけで成立させる
- 材質の明暗は壁紙の平均輝度で自動判定する。手動指定も可
- 状態は `useReducer` ＋ Context。履歴は past/present/future、保存は `localStorage["lgn.v1"]`
- サーバ処理なし。全て端末内で完結する

## 制約

- 本文は `contentEditable`。保存前に `sanitize.ts` の許可リストで洗う
- 画像添付は data URI で保存するため 2MB 上限
- 整形は `document.execCommand` を使う。非推奨 API だが全ブラウザで現役で、Range 手組みより挙動が安定する

## 素材

- 壁紙 `public/wallpaper/room.webp` はマスター提供。差し替える場合は `DEFAULT_SETTINGS.wallpaper` を変える
- 手書きの葉はコードで生成した自作図形（`src/lib/ink.ts`）。参考画面の複製ではない
