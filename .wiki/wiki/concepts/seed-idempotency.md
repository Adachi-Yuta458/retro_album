---
title: "backend/db/seeds.rb 冪等性ルール"
category: concept
sources:
  - raw/notes/2026-05-16-album-spread-improvements-review-qa.md
created: 2026-05-16
updated: 2026-05-16
tags: [seeds, idempotency, rails, find-or-initialize-by, find-or-create-by, backend]
aliases: [seed idempotency, seeds non-destructive rule]
confidence: high
volatility: warm
verified: 2026-05-16
summary: "demo seed を再実行しても既存レコードの属性を破壊しないという不変条件。`find_or_initialize_by` 取得後の上書き代入を禁止し、`new_record?` ガードまたは `find_or_create_by` ブロック形式で初期化のみを行う。"
---

# backend/db/seeds.rb 冪等性ルール

> `bin/rails db:seed` は何度叩いても同じ最終状態に収束し、かつ **既存レコードに対する手動編集を巻き戻さない** 設計でなければならない。`find_or_initialize_by` で取得した既存レコードに対して、テーマ由来などの「初期値」属性を毎回上書き代入すると、デモ DB で手動で属性を変えていても seed のたびに巻き戻る。

## 不変条件

- 既存レコードの属性は破壊しない
- 「初期値」「デフォルト」「テーマ由来の派生値」はレコード作成時のみ設定する
- 冪等性は「同じ最終状態に収束」だけでなく「ユーザーの手動編集を保存する」も含む

## 実装パターン

### 反例 (毎回上書き)

```ruby
page = album.pages.find_or_initialize_by(index: i)
page.paper_kind = PAPER_BY_THEME[theme]  # ← 既存ページでも上書きされる
page.save!
```

これは feat/album-spread-improvements の `backend/db/seeds.rb:147-149` の問題。デモ DB で `page.paper_kind = "cream"` に手動変更しても、再 seed で `PAPER_BY_THEME[theme]` (例: kraft) に戻る。

### 正しい形 1: `new_record?` ガード

```ruby
page = album.pages.find_or_initialize_by(index: i)
page.paper_kind = PAPER_BY_THEME[theme] if page.new_record?
page.save!
```

### 正しい形 2: `find_or_create_by` ブロック形式

```ruby
album.pages.find_or_create_by(index: i) do |page|
  page.paper_kind = PAPER_BY_THEME[theme]  # ← ブロック内は create 時のみ実行
end
```

ブロックは create 時のみ評価されるため、既存レコードを取得した場合は触らない。

## 既に冪等な例: Photo の seed

```ruby
next if page.photos.any?  # 写真が 1 枚でもあれば skip
# ... photo 作成 ...
```

「写真があるなら何もしない」という early return で冪等性を確保している。

## なぜこのルールが必要か

- デモ DB で UI 改善のために手動で属性を変えながら開発するワークフローを前提にしている
- 「再 seed で開発中の試行が消える」を防ぐ
- Photo の冪等性パターンは既に守られていたが、Page の paper_kind だけ抜けていた (feat/album-spread-improvements Q2 で発覚)

## See Also

- [[cross-platform-enum-sync|クロスプラットフォーム enum 同期]] ([クロスプラットフォーム enum 同期](../concepts/cross-platform-enum-sync.md)) — 上書きされていた `paper_kind` の許可リスト側
- [[album-spread-conventions|アルバム見開き画面の設計慣習]] ([アルバム見開き画面の設計慣習](../topics/album-spread-conventions.md)) — 親トピック

## Sources

- [アルバム見開き改善 - レビュー Q&A](../../raw/notes/2026-05-16-album-spread-improvements-review-qa.md) — Q2 と派生 constraint
