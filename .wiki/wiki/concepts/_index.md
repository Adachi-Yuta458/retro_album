# Concepts Index

> Compiled concept articles (single ideas explained).

Last updated: 2026-05-16

## Contents

| File | Summary | Tags | Updated |
|---|---|---|---|
| [album-gesture-model.md](album-gesture-model.md) | 親 Pan/Tap (Exclusive) + 子 Tap (blocksExternalGesture) でアルバム見開きのジェスチャを成立させる構造 | gesture-handler, rngh, pan, tap, blocksExternalGesture | 2026-05-16 |
| [cross-platform-enum-sync.md](cross-platform-enum-sync.md) | paper_kind / sticker_kind / corner_kind の Ruby↔TS 同期手順と、backend バリデーション欠落時のパターン | paper-kind, sticker-kind, enum, cross-platform | 2026-05-16 |
| [page-turner-back-face.md](page-turner-back-face.md) | PageTurner の back face は base color + paper noise + 任意レイヤで構成。fold shadow は 3-stop | page-turner, back-face, paper-bg, paper-noise | 2026-05-16 |
| [page-turner-onfinished-deps.md](page-turner-onfinished-deps.md) | useEffect の onFinished を deps に含め、呼び出し側で `useCallback([turning])` で memo 化 | react, useEffect, useCallback, page-turner | 2026-05-16 |
| [palette-design-tokens.md](palette-design-tokens.md) | palette.ts を色・テーマ・書体の単一ソースとし、expo-font の serif も palette 経由で公開 | palette, design-tokens, fonts, expo-font | 2026-05-16 |
| [photo-tap-feedback.md](photo-tap-feedback.md) | 写真タップ成立時の dim、キャンセル時の Haptics warning、silent swallow 禁止 | haptics, gesture-handler, ux, photo-tap | 2026-05-16 |
| [photo-update-api.md](photo-update-api.md) | `api.updatePhoto(id, patch: Partial<PhotoDTO>)` 汎用 PATCH と caption `\|\|null` 正規化 | api, photo, caption, partial-patch | 2026-05-16 |
| [seed-idempotency.md](seed-idempotency.md) | seeds.rb の冪等性ルール: 既存レコード非破壊、`new_record?` ガード or `find_or_create_by` ブロック | seeds, idempotency, rails, find-or-initialize-by | 2026-05-16 |
| [spread-stage-layout.md](spread-stage-layout.md) | 見開きステージは `flex:1` + `onLayout`、indicator 実高も onLayout、addPageBtn は派生式 | layout, onLayout, flex, page-indicator | 2026-05-16 |

## Recent Changes

- 2026-05-16: Added 9 concept articles from album-spread-improvements / album-spread-polish reviews
