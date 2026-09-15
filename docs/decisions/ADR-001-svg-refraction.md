# ADR-001 縁の屈折は SVG 変位マップで作る

- ステータス: 採用
- 決定日: 2026-09-14

## 背景

Liquid Glass の見た目は ①背景のぼかし ②縁での屈折 ③縁の鏡面反射 ④背景に応じた着色 から成る。このうち ② は `backdrop-filter: blur()` では原理的に作れない。ぼかしは像を平均化するだけで、光路を曲げないため。

## 決定

角丸長方形の符号付き距離場から法線を求めて変位マップを canvas で生成し、`backdrop-filter: url(#filter)` 経由で `feDisplacementMap` に掛ける。有効化は「Chromium と積極的に判定できた時だけ」とする。

## 実測（2026-09-14）

| ブラウザ | 結果 |
|---|---|
| Chromium 152 | 期待通り屈折する |
| Safari 27.0 | 屈折しないばかりか、`url()` を含めると `backdrop-filter` 全体が無効になり、ぼかしまで消える |

`CSS.supports('backdrop-filter','url(#x)')` は Safari でも `true` を返す。機能検出に使えない。

## 代替案

| 案 | 不採用の理由 |
|---|---|
| CSS だけで縁を表現 | 屈折が作れず、板ガラスに見えない |
| WebGL / canvas で背景を自前合成 | DOM 要素を背景として取り込めず、文字の重ね合わせが破綻する |
| `CSS.supports` による機能検出 | Safari が偽陽性を返すため使えない |

## 結果

`navigator.userAgentData.brands` に Chromium が含まれる場合だけ有効化する。判定できないブラウザは安全側に倒し、frost 層だけのぼかしガラスになる。この分岐は `detectRefractionSupport()` に閉じている。
