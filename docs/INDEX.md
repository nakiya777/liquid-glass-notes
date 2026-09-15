# 仕様書インデックス

- 文書種別: 仕様書案内
- ステータス: 現行
- 更新日: 2026-09-14

## 読取原則

通常の開発では、このファイルと対象の正本1〜2個、関係するADRだけを読む。全文書の一括読込はリリース前の整合性確認か、複数領域をまたぐ変更時だけ行う。

## 正本一覧

| 領域 | 正本 | 主な内容 |
|---|---|---|
| 製品 | [製品概要](product/overview.md) | 目的、範囲、対象外、成功基準 |
| ガラス材質 | [Liquid Glass 材質仕様](glass/material.md) | 層構造、トークン、屈折、材質の自動判定 |
| 画面 | [メモアプリ画面仕様](screens/notes-app.md) | 三分割の構成、各操作の振る舞い、受入条件 |
| 技術 | [システム構成](architecture/system.md) | モジュール、状態管理、保存、依存 |

## 設計判断

| ADR | 判断 |
|---|---|
| [ADR-001](decisions/ADR-001-svg-refraction.md) | 縁の屈折は SVG 変位マップで作り、Chromium と積極判定できた時だけ有効にする |
| [ADR-002](decisions/ADR-002-reduced-transparency.md) | OS の「透明度を下げる」は既定では尊重せず、設定項目として明示的に切り替える |
| [ADR-003](decisions/ADR-003-css-prefix-pitfall.md) | ベンダ接頭辞は手書きせず処理系に任せる |

## 作業別の読取マトリクス

| 作業 | 必ず読む | 必要に応じて読む |
|---|---|---|
| ガラスの見え方の調整 | `glass/material.md` | ADR-001、ADR-003 |
| 画面・操作の追加や変更 | `screens/notes-app.md` | `architecture/system.md` |
| 保存形式・状態管理の変更 | `architecture/system.md` | `screens/notes-app.md` |
| アクセシビリティ関連 | `glass/material.md` | ADR-002 |
