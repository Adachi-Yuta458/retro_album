---
title: "album_app Local Wiki"
description: "album_app のローカル wiki。レビュー Q&A・設計判断ログ・プロジェクト固有の不変条件などを蓄積する。"
created: 2026-05-16
freshness_threshold: 70
---

# Wiki Configuration

## Scope

album_app に固有な以下を扱う:

- レビュー時の Q&A と派生する不変条件 (レビュー観点のチェックリスト)
- 設計判断・spec とのギャップとその経緯
- backend (Rails) と mobile (Expo/RN) 間のスキーマ・型契約 (例: paper_kind, sticker_kind)
- レイアウト計算式 / UI コンポーネント間の暗黙的な依存関係

汎用的な技術知見・他プロジェクトでも使う情報は HUB (`~/wiki/`) 側に置く。

## Conventions

- raw notes の slug は `YYYY-MM-DD-<topic-slug>.md`
- レビュー Q&A は `raw/notes/` に格納、`Derived constraints` セクション必須
