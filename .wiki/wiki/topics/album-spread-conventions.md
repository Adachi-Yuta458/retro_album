---
title: "アルバム見開き画面の設計慣習"
category: topic
sources:
  - raw/notes/2026-05-16-album-spread-improvements-review-qa.md
  - raw/notes/2026-05-16-album-spread-polish-review-qa.md
created: 2026-05-16
updated: 2026-05-16
tags: [album-spread, mobile, conventions, topic, page-turner, gesture, layout]
aliases: [album spread guide, 見開き画面ガイド]
confidence: high
volatility: warm
verified: 2026-05-16
summary: "アルバム見開き画面 (`mobile/app/album/[id].tsx` + `PageTurner` + `SpreadPage` + `PageIndicator` ほか) に関する設計慣習・不変条件をまとめるハブ記事。ジェスチャ、レイアウト、PageTurner レンダリング、写真タップ UX、API、デザイントークン、backend 連携にまたがるルールを参照する。"
---

# アルバム見開き画面の設計慣習

> album_app のメイン画面は「見開きの紙アルバムをめくる」体験で、Reanimated アニメ・RNGH ジェスチャ・Rails の Photo/Page モデルが連動する。本トピックはこの周辺で守るべき不変条件と判断材料を、レビュー Q&A の derived constraints から再構成したハブ。

## カテゴリ別マップ

### ジェスチャ・タップ UX

- [[album-gesture-model|見開き画面のジェスチャ設計 (RNGH)]] ([見開き画面のジェスチャ設計 (RNGH)](../concepts/album-gesture-model.md)) — 親 Pan/Tap (Exclusive) + 子 Tap (blocksExternalGesture)
- [[photo-tap-feedback|写真タップ・キャンセル時のフィードバック方針]] ([写真タップ・キャンセル時のフィードバック方針](../concepts/photo-tap-feedback.md)) — 視覚 dim + Haptics warning、silent swallow 禁止

### レイアウト

- [[spread-stage-layout|見開きステージの寸法導出]] ([見開きステージの寸法導出](../concepts/spread-stage-layout.md)) — `flex:1` + `onLayout`、indicator 実高、addPageBtn 派生式

### PageTurner (めくりアニメ)

- [[page-turner-back-face|PageTurner back face のレイヤ構造]] ([PageTurner back face のレイヤ構造](../concepts/page-turner-back-face.md)) — back face = base color + paper noise、fold shadow 3-stop
- [[page-turner-onfinished-deps|PageTurner useEffect の onFinished 依存戦略]] ([PageTurner useEffect の onFinished 依存戦略](../concepts/page-turner-onfinished-deps.md)) — `onTurnFinished` の `useCallback([turning])` memo

### データ・API

- [[photo-update-api|api.updatePhoto と caption 正規化]] ([api.updatePhoto と caption 正規化](../concepts/photo-update-api.md)) — `Partial<PhotoDTO>` 汎用 PATCH と caption `||null` 正規化
- [[cross-platform-enum-sync|クロスプラットフォーム enum 同期]] ([クロスプラットフォーム enum 同期](../concepts/cross-platform-enum-sync.md)) — paper_kind / sticker_kind / corner_kind の Ruby↔TS 同期

### Backend / Seeds

- [[seed-idempotency|backend/db/seeds.rb 冪等性ルール]] ([backend/db/seeds.rb 冪等性ルール](../concepts/seed-idempotency.md)) — 既存レコード非破壊、`new_record?` ガード / `find_or_create_by` ブロック

### デザイントークン

- [[palette-design-tokens|palette.ts デザイントークン集約方針]] ([palette.ts デザイントークン集約方針](../concepts/palette-design-tokens.md)) — 色・テーマ・書体の単一ソース、`expo-font` 連携

## 関連ブランチ・レビュー履歴

- `feat/album-spread-improvements` (2026-05-16): ジェスチャ合成・PageIndicator 新規・seeds 4 ページ化・SpreadChrome API 変更
  - レビュー Q&A: [アルバム見開き改善 - レビュー Q&A](../../raw/notes/2026-05-16-album-spread-improvements-review-qa.md)
- `feat/album-spread-polish` (2026-05-16): flex stage 化・PageTurner 両面化 + fold shadow + 紙ノイズ・写真タップキャプション編集・Haptics
  - レビュー Q&A: [アルバム見開き仕上げ - レビュー Q&A](../../raw/notes/2026-05-16-album-spread-polish-review-qa.md)

両ブランチで決まった事項は上記 concept 群に確定形で記録されている。**spec 文書 (`docs/superpowers/specs/`) は実装に追従できていない箇所が複数あるため、行動の根拠は spec ではなくこの wiki と現コードを優先する。**

## See Also

- [[album-gesture-model|見開き画面のジェスチャ設計]] ([見開き画面のジェスチャ設計](../concepts/album-gesture-model.md))
- [[spread-stage-layout|見開きステージの寸法導出]] ([見開きステージの寸法導出](../concepts/spread-stage-layout.md))
- [[page-turner-back-face|PageTurner back face]] ([PageTurner back face](../concepts/page-turner-back-face.md))
- [[page-turner-onfinished-deps|PageTurner onFinished deps]] ([PageTurner onFinished deps](../concepts/page-turner-onfinished-deps.md))
- [[photo-tap-feedback|写真タップ・フィードバック方針]] ([写真タップ・フィードバック方針](../concepts/photo-tap-feedback.md))
- [[photo-update-api|api.updatePhoto と caption 正規化]] ([api.updatePhoto と caption 正規化](../concepts/photo-update-api.md))
- [[cross-platform-enum-sync|クロスプラットフォーム enum 同期]] ([クロスプラットフォーム enum 同期](../concepts/cross-platform-enum-sync.md))
- [[seed-idempotency|seeds.rb 冪等性ルール]] ([seeds.rb 冪等性ルール](../concepts/seed-idempotency.md))
- [[palette-design-tokens|palette.ts デザイントークン集約]] ([palette.ts デザイントークン集約](../concepts/palette-design-tokens.md))

## Sources

- [アルバム見開き改善 - レビュー Q&A](../../raw/notes/2026-05-16-album-spread-improvements-review-qa.md) — feat/album-spread-improvements の決定事項
- [アルバム見開き仕上げ - レビュー Q&A](../../raw/notes/2026-05-16-album-spread-polish-review-qa.md) — feat/album-spread-polish の決定事項
