---
title: "アルバム見開き改善 - レビュー Q&A (2026-05-16)"
source: "MANUAL"
type: notes
ingested: 2026-05-16
tags: [review, qa, album-spread, mobile, backend-seeds, page-indicator, gesture-handler, expo-font, paper-kind, sticker-kind]
summary: "feat/album-spread-improvements ブランチのコードレビュー時に発生した 5 件の Q&A と、将来の類似レビューで参照すべき不変条件 (paper_kind の Ruby/TS 一致、シードの非破壊更新、ジェスチャ合成方式、indicator 実高の onLayout 化、StickerKind の事実上の許可リスト、フォントの palette 集約) を記録。"
---

# アルバム見開き画面改善 - レビュー Q&A

- **Branch:** feat/album-spread-improvements
- **Base:** main (merge-base: e6cbf8d)
- **Date:** 2026-05-16
- **Main change areas:**
  - mobile/app/album/[id].tsx (ジェスチャ・戻る導線・ページ高さ計算)
  - mobile/src/ui/PageIndicator.tsx (新規・ページインジケーター)
  - mobile/src/ui/SpreadChrome.tsx (ヘッダー/フッター API 変更)
  - backend/db/seeds.rb (デモシードの 4 ページ化)

## Q&A

### Q1: ジェスチャ合成の spec 逸脱は意図か?
**Q:** spec §3 は「`Gesture.Tap()` と `Gesture.Pan()` を `Race()`/`Exclusive()` で合成せず、既存の `tapLayer` を `onTouchEnd` のまま残す」と明記。実装 (`mobile/app/album/[id].tsx:107`) は `Gesture.Exclusive(panGesture, tapGesture)` で合成し、`tapLayer` を削除。これは意図的な設計変更か?
**A:** 意図的に簡素化した。spec を更新する。

### Q2: 再 seed 時の `paper_kind` 上書きは意図か?
**Q:** `backend/db/seeds.rb:147-149` で既存ページに対しても `page.paper_kind = paper_kind; page.save!` を毎回実行しており、再 seed のたびに既存ページの `paper_kind` が `PAPER_BY_THEME[theme]` で上書きされる。デモ DB で手動で paper_kind を変えていても巻き戻る。意図通りか?
**A:** 新規ページ作成時のみ設定すべき (= 修正必要)。

### Q3: PageIndicator のセリフ体未指定は意図か?
**Q:** spec §4 は PageIndicator のテキストを「セリフ体・昭和風書体」と明記しているが、`PageIndicator.tsx:55-59` の `text` スタイルに `fontFamily` 指定がなく、OS デフォルトのサンセリフで描画される。MVP で省略したのか?
**A:** 今 PR で対応すべき。

### Q3b: セリフ体の実装手段
**Q:** 現状フォントアセット未配置、`expo-font` 未使用。Platform default serif / Yu Mincho を expo-font / palette 集約のいずれで対応するか?
**A:** Yu Mincho 系を `expo-font` で読み込む方針。

### Q4: 高さ定数 (PAGE_INDICATOR_HEIGHT=36, addPageBtn bottom=124) の扱い
**Q:** PageIndicator の実高 (paddingTop 4 + dot 7 + marginBottom 3 + text ~14 + paddingBottom 4 ≒ 32px) と定数 36 がずれている。さらに `total > 8` で `showDots` が false になると更に縮む。addPageBtn の `bottom: 124` (= 78+36+10) も同前提でハードコード。これらが indicator 仕様変更で desync する。維持で良いか?
**A:** `onLayout` で動的計算に変更する (= 修正必要)。

## Derived constraints / assumptions for future reviews

- **paper_kind は Ruby/TS で同一文字列の単一ソース。** `Page::PAPER_KINDS` (`kraft cream pink mint blue yellow`) が真の許可リストで、`Album#default_paper_kind_for_theme`・`backend/db/seeds.rb` の `PAPER_BY_THEME`・`mobile/src/ui/palette.ts#themeToPaper` の三者は同じマッピング (A→kraft, B→pink, C→mint) で揃える。これを崩すと spec §5 で言及されていた `vellum`/`pink_pulp` のような不整合バグになる。
- **シードは「既存レコードの属性は破壊しない」を不変条件とする。** `find_or_initialize_by` で取得した既存レコードに対して、テーマ由来などの「初期値」属性を毎回上書き代入してはならない。`new_record?` ガード or `find_or_create_by { |x| ... }` ブロック形式を使う。Photo の冪等性は `next if page.photos.any?` 形式で既に守られている。
- **ジェスチャ合成は `Gesture.Exclusive(pan, tap)` 方式が現プロジェクトの正。** 旧 `tapLayer` の `onTouchEnd` overlay 方式 (spec §3 にまだ残存) は今後採用しない。副作用として、検出領域は `stage` のサイズに一致し、indicator や上下余白部分は paging タップ無反応になる (これは仕様)。
- **見開き画面のサイズ計算は `pageHeight = SCREEN.height - 60(header) - 78(footer) - <indicator実高> - 40(safe-area余白)` を基本式とする。** indicator の実高はマジック定数ではなく `onLayout` で取り、`addPageBtn` の `bottom` も `78 + indicatorH + 10` の式で導出する。indicator の実装 (ドット数、text-only 切替、フォント差替え) が変わっても、レイアウト式は変えなくて済む構造を保つ。
- **`StickerKind` (mobile) は backend のスキーマ検証で守られていない。** Photo モデルに `corner_kind` の `inclusion` はあるが `sticker_kind` には無く、frontend の TS union (`sun|flower|heart|cherry|star`) が事実上の許可リスト。Ruby 側で文字列を追加する際は `mobile/src/ui/Sticker.tsx` の `StickerKind` と必ずクロスチェックする (本ブランチでもコミット 682f58b でこの不整合 = `kite`/`leaf` を一度踏んでいる)。
- **フォントは palette.ts に単一ソース化する方向。** PageIndicator で Yu Mincho 系をセリフ書体として導入する際、`palette.ts` に `fonts.serif` 等を切り出し、後続の SpreadHeader タイトルなどにも展開しやすい形を取る (今回の PageIndicator 対応はこの第一歩)。

## Related

- [[review-with-wiki-ingest]]
- spec: `docs/superpowers/specs/2026-05-16-album-spread-improvements-design.md`
- plan: `docs/superpowers/plans/2026-05-16-album-spread-improvements.md`
