# システム構成

- 文書種別: 領域別正本（技術）
- ステータス: 現行
- 更新日: 2026-09-14

## 依存

| 項目 | 版 |
|---|---|
| Next.js | 16.3.5（App Router / Turbopack） |
| React | 19.2.8 |
| Tailwind CSS | 4 |
| Motion | 13 |
| TypeScript | 5 |

サーバ側の処理は持たない。全ページを静的生成し、状態は端末内で完結する。

## モジュール

```
src/
├── app/
│   ├── globals.css      デザイントークン、ガラス、レイアウト
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── glass/
│   │   ├── Glass.tsx        ガラス面の部品
│   │   └── LensProvider.tsx 屈折フィルタの登録と配布
│   ├── notes/               画面部品
│   └── ui/                  アイコン、メニュー
└── lib/
    ├── lens.ts        変位マップ生成、対応判定、壁紙輝度測定
    ├── store.tsx      状態、取り消し履歴、保存
    ├── sanitize.ts    貼り付け HTML の許可リスト洗浄
    ├── export.ts      Markdown 書き出し
    ├── useExternal.ts メディアクエリ等の購読
    └── debug.ts       名前空間付きロガー
```

## 状態管理

`useReducer` ＋ Context。履歴は `past / present / future` の三本で持ち、上限120件。

- 選択操作（フォルダ・メモの切替）は履歴へ積まない
- 同じ `coalesce` キーの変更が 0.7 秒以内に続く場合は一塊にまとめる
- 保存は 0.4 秒の遅延でまとめて `localStorage["lgn.v1"]` へ書く

サーバ描画と水和の食い違いを避けるため、保存データは state の遅延初期化で読み、`useSyncExternalStore` で得た `ready` が真になるまで本文を描かない。

## セキュリティ

- 本文は `contentEditable` 由来のため、保存前に許可リスト方式で洗浄する（`sanitize.ts`）
- `src` / `href` は http(s)、相対パス、画像の data URI だけ通す
- `on*` 属性は全て落とす
- 外部送信は行わない。共有機能はクリップボード、ファイル書き出し、印刷のみ

## デバッグ

```js
localStorage.setItem('lgn:debug', '*')    // 全名前空間
localStorage.setItem('lgn:debug', 'lens') // 個別
```

名前空間は `lens` `store` `shell` `editor` `toolbar` `ink`。`error` は常時出力する。
