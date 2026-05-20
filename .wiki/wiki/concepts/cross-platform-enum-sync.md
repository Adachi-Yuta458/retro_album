---
title: "クロスプラットフォーム enum 同期 (paper_kind / sticker_kind / corner_kind)"
category: concept
sources:
  - raw/notes/2026-05-16-album-spread-improvements-review-qa.md
created: 2026-05-16
updated: 2026-05-16
tags: [paper-kind, sticker-kind, corner-kind, enum, ruby, typescript, cross-platform, schema, palette]
aliases: [paper_kind invariant, StickerKind allowlist, enum cross-sync]
confidence: high
volatility: warm
verified: 2026-05-16
summary: "album_app では複数の文字列 enum (paper_kind, sticker_kind, corner_kind) が Ruby と TypeScript の両側で許可リストを構成する。同期手順と、backend バリデーション欠落時に frontend の TS union が事実上の許可リストとなるパターンを記録。"
---

# クロスプラットフォーム enum 同期 (paper_kind / sticker_kind / corner_kind)

> album_app の Photo/Page に紐づく enum 値は Rails と React Native の両側にハードコードされ、整合性は規約で保たれている。backend に validation がある enum (`corner_kind`) と無い enum (`sticker_kind`) があるため、新規値を追加するときの安全な手順は同じではない。本記事は各 enum の単一ソース所在、同期しなければならない参照点、過去の不整合事例を整理する。

## paper_kind: Ruby/TS 両側に許可リストが分散する

`paper_kind` は Page の「紙の種類」を表す文字列。次の **三者** が同じマッピング (A→kraft, B→pink, C→mint) を持たねばならず、ここがズレると spec §5 にあった `vellum`/`pink_pulp` 風の不整合バグになる。

| 参照点 | 役割 | ファイル |
|---|---|---|
| `Page::PAPER_KINDS` | **真の許可リスト** (`kraft cream pink mint blue yellow`) | `backend/app/models/page.rb` |
| `Album#default_paper_kind_for_theme` | テーマ別デフォルト (Ruby 側) | `backend/app/models/album.rb` |
| `backend/db/seeds.rb` の `PAPER_BY_THEME` | デモシードのテーマ→紙マッピング | `backend/db/seeds.rb` |
| `mobile/src/ui/palette.ts#themeToPaper` | TS 側テーマ→紙マッピング | `mobile/src/ui/palette.ts` |

新規 paper_kind を足すときは Ruby 側の許可リストと TS 側の `palette` 両方を同 PR で更新する。

## sticker_kind: backend バリデーション無し → TS union が事実上の許可リスト

Photo モデルには `corner_kind` の `inclusion` バリデーションはあるが、`sticker_kind` には **無い**。Ruby 側は文字列なら何でも保存できてしまうため、`mobile/src/ui/Sticker.tsx` の TS union `StickerKind = sun | flower | heart | cherry | star` が事実上の許可リストになっている。

Ruby 側で `sticker_kind` を追加する際は、必ず `mobile/src/ui/Sticker.tsx` の `StickerKind` とクロスチェックする。feat/album-spread-improvements の commit `682f58b` ではこの不整合 (Ruby 側で `kite`/`leaf` を渡してしまい frontend で描画できなかった) を一度踏んでいる。

## corner_kind: backend で inclusion 検証あり → backend が先勝ち

`corner_kind` は Photo モデル側に `validates :corner_kind, inclusion: { in: ... }` が定義されているため、許可外を保存しようとすると validation error になる。Ruby 側を「真の許可リスト」とみなして frontend を追随させる。

## 一般則: 「validation の有無」を見てから手順を決める

新しい enum 値を追加する流れは validation の有無で変わる:

1. backend に `inclusion` validation がある (`corner_kind`)
   → Ruby 側の許可リストを更新 → TS 側を追随 → seeds/palette を必要に応じて更新
2. backend に validation が無い (`sticker_kind`)
   → TS union を更新 → backend は何も変えない (validation 追加 PR を別途検討)
3. テーマ→値のマッピング持ち (`paper_kind`)
   → 上記 1 に加え、`PAPER_BY_THEME` (seeds) と `themeToPaper` (palette) を同期

「TS union だけ追加して試したら Ruby 側でも勝手に動いた」は (2) に該当しているだけで設計上の保証ではない。

## See Also

- [[seed-idempotency|seeds.rb 冪等性ルール]] ([seeds.rb 冪等性ルール](../concepts/seed-idempotency.md)) — paper_kind の上書き事例はここで具体化
- [[palette-design-tokens|palette.ts デザイントークン集約]] ([palette.ts デザイントークン集約](../concepts/palette-design-tokens.md)) — themeToPaper も palette に集約される
- [[photo-update-api|api.updatePhoto と caption 正規化]] ([api.updatePhoto と caption 正規化](../concepts/photo-update-api.md)) — sticker_kind を含む patch が通る経路
- [[page-turner-back-face|PageTurner back face のレイヤ構造]] ([PageTurner back face のレイヤ構造](../concepts/page-turner-back-face.md)) — `palette[paperKind].base` を消費する側
- [[album-spread-conventions|アルバム見開き画面の設計慣習]] ([アルバム見開き画面の設計慣習](../topics/album-spread-conventions.md)) — 親トピック

## Sources

- [アルバム見開き改善 - レビュー Q&A](../../raw/notes/2026-05-16-album-spread-improvements-review-qa.md) — paper_kind 三者同期と StickerKind 事実上の許可リストの記述元
