---
title: "palette.ts デザイントークン集約方針"
category: concept
sources:
  - raw/notes/2026-05-16-album-spread-improvements-review-qa.md
created: 2026-05-16
updated: 2026-05-16
tags: [palette, design-tokens, fonts, expo-font, mobile, theme]
aliases: [palette.ts, design tokens, fonts.serif]
confidence: high
volatility: warm
verified: 2026-05-16
summary: "`mobile/src/ui/palette.ts` を色・紙テクスチャ・フォントなどデザイントークンの単一ソースとする。セリフ書体は `expo-font` で Yu Mincho 系を読み込み `palette.fonts.serif` として公開し、コンポーネントは palette 経由で参照する (ハードコード fontFamily 禁止)。`themeToPaper` のような mapping も palette に集約。"
---

# palette.ts デザイントークン集約方針

> album_app の見た目の鍵 (paper kind ごとの base 色、テーマごとの paper 割り当て、書体) は `mobile/src/ui/palette.ts` を **唯一の真実** として持つ。コンポーネントは palette を import して参照するだけで、独自に色や fontFamily を持たない。これにより PageIndicator のセリフ化のような変更を SpreadHeader タイトル等に展開しやすい構造を保つ。

## 含めるべきトークン

- **色**: `palette[paperKind].base` のような紙色マップ
- **紙テクスチャマッピング**: `themeToPaper(theme: 'A' | 'B' | 'C')` 形式
- **フォント**: `palette.fonts.serif`, `palette.fonts.sans` (今後)

paper_kind とテーマの対応関係については [[cross-platform-enum-sync|クロスプラットフォーム enum 同期]] ([クロスプラットフォーム enum 同期](../concepts/cross-platform-enum-sync.md)) を参照 (Ruby 側 `PAPER_BY_THEME` と同期する)。

## セリフ書体導入の規約

feat/album-spread-improvements の Q3/Q3b で「PageIndicator のテキストをセリフ体・昭和風書体にする」が確定し、実装方針として:

1. `expo-font` で Yu Mincho 系 (実機の搭載状況に応じて fallback chain を組む) を読み込む
2. アプリ起動時に `useFonts` でロード完了を待つ
3. ロード完了後の値を `palette.fonts.serif` として公開
4. PageIndicator は `style={{ fontFamily: palette.fonts.serif }}` で参照

このパターンを足場にして、後続の SpreadHeader タイトル等のセリフ化に同じトークンを使い回す。

## やってはいけないこと

- ✗ コンポーネント内で `fontFamily: "YuMincho"` のような直書き → palette に集約する意味が失われる
- ✗ `expo-font` の load を一部画面でしかやらない → 全体で揃わない
- ✗ Ruby 側の theme→paper マッピングと TS 側の `themeToPaper` を別ロジックにする → enum 同期の失敗 (`[[cross-platform-enum-sync]]` 参照)

## See Also

- [[cross-platform-enum-sync|クロスプラットフォーム enum 同期]] ([クロスプラットフォーム enum 同期](../concepts/cross-platform-enum-sync.md)) — palette.themeToPaper の同期相手
- [[page-turner-back-face|PageTurner back face のレイヤ構造]] ([PageTurner back face のレイヤ構造](../concepts/page-turner-back-face.md)) — `palette[paperKind].base` を使う側
- [[album-spread-conventions|アルバム見開き画面の設計慣習]] ([アルバム見開き画面の設計慣習](../topics/album-spread-conventions.md)) — 親トピック

## Sources

- [アルバム見開き改善 - レビュー Q&A](../../raw/notes/2026-05-16-album-spread-improvements-review-qa.md) — Q3/Q3b でのセリフ化方針と palette 集約 constraint
