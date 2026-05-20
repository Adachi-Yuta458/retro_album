---
title: "アルバム見開き仕上げ - レビュー Q&A (2026-05-16)"
source: "MANUAL"
type: notes
ingested: 2026-05-16
tags: [review, qa, album-spread, page-turner, photo-tap, gesture-handler, paper-bg, haptics, mobile]
summary: "feat/album-spread-polish ブランチのコードレビュー時 Q&A 4 件 (fold shadow gradient の濃さ調整、back face に paper noise を載せる方針、写真タップの軽い視覚フィードバック追加、ページめくり中の写真タップに Haptics warning を出す) と、将来の類似レビューで参照する判断材料を記録。"
---

# アルバム見開き仕上げ - レビュー Q&A

- **Branch:** feat/album-spread-polish
- **Base:** main (merge-base: 3fc35c8)
- **Date:** 2026-05-16
- **Main change areas:**
  - mobile/app/album/[id].tsx (固定 height → flex stage、写真タップキャプション編集導線)
  - mobile/src/ui/PageTurner.tsx (片面→両面 + 折り目シャドウ + 紙寄りイージング)
  - mobile/src/ui/SpreadPage.tsx (写真タップ用 RNGH Gesture.Tap 包装 + blocksExternalGesture)
  - mobile/src/lib/api.ts (updatePhoto helper)

## Q&A

### Q1: PageTurner fold shadow gradient が spec と微妙に異なる
**Q:** spec `docs/superpowers/specs/2026-05-16-album-spread-polish-design.md` §2-2 は 2-stop `["rgba(0,0,0,0.45)", "rgba(0,0,0,0)"]` を指定。実装 (`mobile/src/ui/PageTurner.tsx:75-79`) は 3-stop `["rgba(0,0,0,0.55)", "rgba(0,0,0,0.18)", "rgba(0,0,0,0)"]`。最暗部が 0.45→0.55 に濃くなり、中間 0.18 のストップが追加されている。これは意図的な視覚調整か?
**A:** 意図的。実機で見た結果、濃く・滑らかに振った。spec 側を後追いで更新するなら別途。

### Q2: PageTurner back face に paper noise が無い
**Q:** spec §2-1 は「back の中身は紙テクスチャ単色 (現ページの paperKind に対応する base 色) + 軽い paper noise」と明記。実装 (`mobile/src/ui/PageTurner.tsx:120-128`) は flat `backgroundColor: palette[frontPaperKind].base` のみで、`PaperBg` 相当の noise が乗っていない。意図的な省略か?
**A:** 見落とし。PaperBg を被せたい (= 修正要)。

### Q3: 写真タップに視覚フィードバックが無い
**Q:** spec §3-1 は当初 `Pressable + pressRetentionOffset のみ・style 変更なし` を提案、その後 §3-4 で gesture 衝突回避のため RNGH `Gesture.Tap()` 採用に切り替わった。最終実装 (`mobile/src/ui/SpreadPage.tsx:56-64`) は Pressable を捨て純 Gesture.Tap になっているため、タップ時の opacity dim 等の視覚フィードバックが一切無い。意図的か?
**A:** 軽い視覚フィードバックは欲しい (= 修正要)。

### Q4: ページめくり中の写真タップが無音吸い
**Q:** ページめくり中に写真をタップした場合、`SpreadPage.tsx` の子 `Gesture.Tap()` は成立して `blocksExternalGesture(parentTapRef)` で親 Tap (= 次ページ送り) もキャンセル、`onPhotoTap` (`mobile/app/album/[id].tsx:197-198`) で `if (turning !== "idle") return` により Alert も開かず、結果ユーザーのタップが無音で吸われる。`387ea46 fix: block photo tap during page-turn` の意図通りだが、UX として feedback 無しは適切か?
**A:** 軽い Haptics warning を出したい (= 修正要)。

## Derived constraints / assumptions for future reviews

- **見開きステージの寸法は `flex:1` + `onLayout` で完全に外部要因 (safe-area inset, indicator 実高, footer 高さ) に従わせる。** 旧来の `SCREEN.height - 60 - 78 - indicatorH - 40` の固定式は廃止。前回 wiki ([[2026-05-16-album-spread-improvements-review-qa]]) の constraint「indicator 実高を onLayout で取り、addPageBtn の `bottom = 78 + indicatorH + 10` 式で導出する」は維持 (`[id].tsx:337`)。safe-area が変わるたびに公式を直すフローはもう取らない。
- **PageTurner の "back face" は flipping page の `paper_kind` に揃える。** `frontPaperKind` は、「角度 0 で表向きに見える側」の paper_kind と一致させる: `next` 時は currentPage、`prev` 時は targetPage。両面化したらこの対応関係を崩さない。さらに、flat 背景色だけでは「紙」感が出ない — Q2 の修正で PaperBg (paper noise) を base 色の上に重ねる構造に揃える。今後 back face の見た目を変える際もこの「base color + paper noise + (任意の追加レイヤ)」のスタック構造を保つ。
- **写真タップは「成立すれば silent」ではなく「最低限のフィードバック」を返す。** RNGH `Gesture.Tap()` だけだと press 中の視覚変化が無いため、Pressable 由来の自然な dim が失われている領域では (a) HeldPhoto に onPressIn/Out 由来の軽い opacity dim、もしくは (b) Gesture.Tap の `onBegin`/`onFinalize` で opacity を制御、のいずれかで「押された」signal を返す。さらに「めくり中の photo tap」のような *cancel された* タップには Haptics.notificationAsync(Warning) で「受け付けなかった」と知らせる。silent swallow は禁止。
- **写真ジェスチャは「子 Tap が親 Tap を fail させる」方式 (`blocksExternalGesture(parentTapRef)` + `withRef(parentTapRef)`) が正。** 親 Pan の `activeOffsetX([-15,15])` と子 Tap の `maxDistance(10)` の差で「横スワイプは Pan が勝つ / 短いタップは子 Tap が勝つ」が自然に成立する。spec §3-4 のフォールバック (時刻ガード) は採用しない。
- **PageTurner 内 `useEffect` は `onFinished` を deps に含める設計を維持する。** `[id].tsx` 側で `onTurnFinished` を `useCallback([turning])` で memo 化することで、turn 中は identity 不変 → 効果は再発火しない。memo を外すと毎レンダーでアニメーションが再起動する罠 (commit `ae060f8` で踏んだ既知の傷)。
- **キャプション保存は「null と空文字を等価」として扱う。** `next = text.trim()` し、`next || null` で空文字を null に正規化してから `api.updatePhoto`・local state 更新の両方に渡す。Rails 側 `Photo` モデルは caption に validation 無し、`params.permit(:caption)` で nil 許容。空文字保存 = キャプション削除を UX として明示する場合は `{photo.caption ? <Text> : null}` の見え方変化 (Text 行が消える) で表現する。
- **`api.updatePhoto(id, patch)` は `Partial<PhotoDTO>` を受ける汎用 PATCH。** caption 以外 (scene, x, y, w, h, rotation, corner_kind, washi_tape_color, sticker_kind, sticker_color) も将来同じ helper で更新できる。画像差替えだけは別ルート (multipart は `uploadPhoto` 側) なのでこの helper の対象外。

## Related

- [[review-with-wiki-ingest]]
- [[2026-05-16-album-spread-improvements-review-qa]] (前回ブランチのレビュー Q&A)
- spec: `docs/superpowers/specs/2026-05-16-album-spread-polish-design.md`
- plan: `docs/superpowers/plans/2026-05-16-album-spread-polish.md`
