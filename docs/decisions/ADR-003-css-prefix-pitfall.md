# ADR-003 ベンダ接頭辞は手書きせず処理系に任せる

- ステータス: 採用
- 決定日: 2026-09-14

## 背景

`.glass__frost` に以下を書いたところ、ぼかしが一切効かなかった。

```css
.glass__frost {
  backdrop-filter: blur(...);
  -webkit-backdrop-filter: blur(...);   /* 後ろに書いた */
}
```

配信された CSS を確認すると `-webkit-backdrop-filter` だけが残り、標準の `backdrop-filter` が消えていた。Lightning CSS（Tailwind v4 / Next.js の CSS 処理系）が接頭辞違いの同一プロパティを重複とみなし、後に書いた方を残したためである。Chromium は `-webkit-backdrop-filter` を解さないため、結果として無効になった。

CSSOM 上では `.glass__frost { }` と宣言ブロックが空になっており、`getComputedStyle` も `none` を返していた。

## 決定

CSS ファイルには標準プロパティだけを書く。接頭辞の付与は Lightning CSS に任せる。

## 例外

React のインラインスタイルは CSS 処理系を通らないため、`backdropFilter` と `WebkitBackdropFilter` を併記してよい。屈折層とマスクがこれに当たる。

## 教訓

見た目の不具合を配色やパラメータの問題と決めつけない。`getComputedStyle` と配信中の CSS 本文を先に確認する。今回はこの確認で原因が一手で特定できた。
