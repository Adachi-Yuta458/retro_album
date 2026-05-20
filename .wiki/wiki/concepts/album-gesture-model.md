---
title: "見開き画面のジェスチャ設計 (RNGH)"
category: concept
sources:
  - raw/notes/2026-05-16-album-spread-improvements-review-qa.md
  - raw/notes/2026-05-16-album-spread-polish-review-qa.md
created: 2026-05-16
updated: 2026-05-16
tags: [gesture-handler, rngh, pan, tap, album-spread, mobile, blocksExternalGesture]
aliases: [gesture composition, parent-child gesture, blocksExternalGesture]
confidence: high
volatility: warm
verified: 2026-05-16
summary: "見開き画面 (`mobile/app/album/[id].tsx`) の親子ジェスチャ構成。親は `Gesture.Exclusive(panGesture, tapGesture)` で stage 全体に張り、子 (写真) は `Gesture.Tap().blocksExternalGesture(parentTapRef)` で親 Tap を fail させる。旧 tapLayer (onTouchEnd overlay) は採用しない。"
---

# 見開き画面のジェスチャ設計 (RNGH)

> アルバム見開き画面では「左右スワイプでページ送り」「短いタップでページ送り (左右半分判定)」「写真の上のタップでキャプション編集」を同時に成立させる必要がある。React Native Gesture Handler (RNGH) の合成ジェスチャを使って、親 = stage 全体、子 = 写真、の二層で構成するのが現プロジェクトの正解。

## 親ジェスチャ (stage 全体)

```ts
const panGesture  = Gesture.Pan().activeOffsetX([-15, 15]).onEnd(...)
const tapGesture  = Gesture.Tap().maxDistance(10).onEnd(handleStageTap).withRef(parentTapRef)
const composed    = Gesture.Exclusive(panGesture, tapGesture)
```

- `Gesture.Exclusive(pan, tap)` で **どちらか一方** が成立する
- `panGesture.activeOffsetX([-15, 15])`: 横 15px 以上動いたら Pan を採用 (= 短いタップでは Pan は activate しない)
- `tapGesture.maxDistance(10)`: 10px 以内のタップを Tap と認識
- 親 Tap には `withRef(parentTapRef)` を付けて子から参照できるようにする

## 子ジェスチャ (写真ごと)

```ts
const photoTap = Gesture.Tap()
  .maxDistance(10)
  .onEnd(() => onPhotoTap(photo))
  .blocksExternalGesture(parentTapRef)
```

- `blocksExternalGesture(parentTapRef)`: **子 Tap が成立したら親 Tap を fail させる**
- これによって「写真の上のタップ」は親のページ送り Tap を発火させずに子の onPhotoTap だけ走る
- 親の Pan は子で blocks していないので、写真の上を横スワイプしてもページ送りは効く (Pan は activeOffsetX で勝つ)

## 自然な勝敗の理由

- 親 Pan の `activeOffsetX([-15, 15])` と子 Tap の `maxDistance(10)` の差で「横スワイプは Pan が勝つ / 短いタップは子 Tap が勝つ」が自動で成立する
- spec §3-4 のフォールバック (時刻ガードで gesture を切り替える方式) は採用しない

## 検出領域とその副作用

- 親ジェスチャは `stage` (見開き全体) のサイズに張られている
- PageIndicator や上下の余白部分は paging タップに **無反応** (= 仕様)
- これを「タップ無反応」と感じる場合は indicator 側に専用のタップエリアを設ける、ではなく「stage を広げる」ではない (UX 設計の議論を別途必要とする)

## 採用しない方式: 旧 tapLayer

spec の旧版 §3 には「`Gesture.Tap()` と `Gesture.Pan()` を `Race()`/`Exclusive()` で合成せず、既存の `tapLayer` を `onTouchEnd` のまま残す」とあったが、 **これは採用しない**。`Gesture.Exclusive` 方式に統一済み。spec 側を更新する作業が残っている。

## See Also

- [[spread-stage-layout|見開きステージの寸法導出]] ([見開きステージの寸法導出](../concepts/spread-stage-layout.md)) — stage のサイズはどう決まるか
- [[photo-tap-feedback|写真タップ・キャンセル時のフィードバック方針]] ([写真タップ・キャンセル時のフィードバック方針](../concepts/photo-tap-feedback.md)) — 写真タップ後の UX
- [[album-spread-conventions|アルバム見開き画面の設計慣習]] ([アルバム見開き画面の設計慣習](../topics/album-spread-conventions.md)) — 親トピック

## Sources

- [アルバム見開き改善 - レビュー Q&A](../../raw/notes/2026-05-16-album-spread-improvements-review-qa.md) — 親 Gesture.Exclusive の採用判断 (Q1) と spec 逸脱の正当化
- [アルバム見開き仕上げ - レビュー Q&A](../../raw/notes/2026-05-16-album-spread-polish-review-qa.md) — 子 Gesture.Tap + blocksExternalGesture の確定 (constraint 群)
