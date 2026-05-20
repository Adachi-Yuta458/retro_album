---
title: "アルバム見開き仕上げ (mm-review 2 周目) - レビュー Q&A"
source: "MANUAL"
type: notes
ingested: 2026-05-18
tags: [review, qa, mm-review, album-spread, photo-tap, gesture-memo, partial-photo-dto, haptic-feedback]
summary: "feat/album-spread-polish の 2 周目 mental-model レビューで発生した 4 件の Q&A。Partial<PhotoDTO> の絞り込み、親 gesture の useMemo 化、caption 保存成功時の Haptic+dim フラッシュ、MAX_ANGLE=180° 実機確認済みの確定。"
---

# アルバム見開き仕上げ (mental-model レビュー 2 周目) - レビュー Q&A

- **Branch:** feat/album-spread-polish
- **Base:** main (merge-base: 3fc35c8)
- **Date:** 2026-05-18
- **Main change areas:** album spread / page-turn animation / photo tap caption edit / gesture composition / updatePhoto API
- **Personas active:** perf, ux, code-quality, type-safety, tests, security

## Q&A

### Q1: caption 保存成功時のユーザーフィードバック
**Role:** ux
**Q:** mobile/app/album/[id].tsx:194-229 `onPhotoTap` の `Alert.prompt` で「ほぞん」が押され、`await api.updatePhoto(...)` が成功した後、Alert を閉じる以外に haptic / 視覚効果を返していない。ブロック時 (`turning !== "idle"`) は Warning haptic を返しているのに、成功時は無音。視覚 dim も無い。
**A:** Haptic + 軽い dim フラッシュ を入れる。`Haptics.notificationAsync(Success)` と `pressOpacity` を一瞬下げて戻すパルス。タップ遮断時の Warning haptic とリズムが揃う。

### Q2: api.updatePhoto の patch 型 (Partial<PhotoDTO> の mass-assignment 表面)
**Role:** security, type-safety
**Q:** mobile/src/lib/api.ts:86 `updatePhoto: (id, patch: Partial<PhotoDTO>)` の patch 型は構造上 `image_url`、`x/y/w/h/rotation` 等を含むが、`image_url` は multipart 専用 ([[photo-update-api]])、座標系も別 endpoint がある。backend strong params (`photos_controller.rb:38-39`) が現状は弾くが、型契約として広すぎる。
**A:** `Pick<PhotoDTO, "caption">` に絞る。現在の唯一のユースケース (caption 編集) に最小化。将来項目が増えたら都度拡張する方針。型システム側で mass-assignment を防止する。

### Q3: PageTurner.tsx MAX_ANGLE=180 の末尾スナップ感
**Role:** ux
**Q:** mobile/src/ui/PageTurner.tsx:25 `MAX_ANGLE` が 160→180 に上がり、easing `bezier(0.32, 0.72, 0, 1)` の尾が急なため、`backfaceVisibility` が切り替わる 90° 以降の残り 90° が一瞬で完了して末尾でスナップする可能性。
**A:** 実機で確認済み — 違和感なし。現状の 180° + easing を維持。レビュー側では intentional として処理。

### Q4: 親側 panGesture / tapGesture / composedGesture のメモ化
**Role:** perf, code-quality
**Q:** mobile/app/album/[id].tsx:96-119 親 gesture builders が `useMemo` されておらず、子 (`SpreadPage.tsx:46` `photoTap`) は ref 安定化のため明示的に `useMemo` 済み。`turning` state 変化で 850ms のアニメ中に親で再レンダーが走り、RNGH が能動的に追跡している gesture オブジェクトを差し替える形になっている。
**A:** 全部 `useMemo([stageSize.w, turning?])` で安定化する。親も子と揃え、RNGH v2 の reconciliation 任せにせず明示的に同じ参照を渡す。

## Derived constraints / assumptions for future reviews

- **api 層の patch 型は対象フィールドだけを `Pick<DTO, ...>` で開示する**: backend strong params の防御線に依存せず、TypeScript 側でも mass-assignment 面を最小化する。新規 patch helper (`updatePage`, `updateAlbum` 等を将来足す場合) は `Partial<DTO>` を避け、明示 `Pick` 型を使う。
- **caption / 写真操作系の成功フィードバックは「Haptic + 視覚パルス」を標準にする**: ブロック時の Warning haptic と非対称にならないよう、成功 path にも明示的フィードバックを置く ([[photo-tap-feedback]] への追補)。
- **RNGH v2 gesture builders は parent / child を揃えて `useMemo` で stabilize する**: RNGH の internal reconciliation を信頼せず、特に animation 中に再レンダーが走るコンポーネントでは parent gesture object も明示的に memo 化する。子だけ memo で親を素のままにしない。
- **PageTurner の MAX_ANGLE=180 + bezier(0.32, 0.72, 0, 1) は実機検証済みの確定値**: スナップ感を再質問するのは禁止。spec で 160° と書かれていても実機調整が上書きする (fold shadow gradient 3-stop と同じ判断パターン)。

## Related

- [[mental-model-review]]
- [[album-spread-conventions]]
- [[album-gesture-model]]
- [[page-turner-back-face]]
- [[photo-tap-feedback]]
- [[photo-update-api]]
- [[page-turner-onfinished-deps]]
