---
title: "写真タップ・キャンセル時のフィードバック方針"
category: concept
sources:
  - raw/notes/2026-05-16-album-spread-polish-review-qa.md
created: 2026-05-16
updated: 2026-05-16
tags: [haptics, gesture-handler, ux, mobile, photo-tap, album-spread]
aliases: [silent swallow ban, Haptics warning rule]
confidence: high
volatility: warm
verified: 2026-05-16
summary: "見開き画面で写真タップが成立するときは軽い視覚 dim、ページめくり中など *キャンセル* されるときは `Haptics.notificationAsync(Warning)` を返す。silent swallow (タップが無音で消える) は禁止。"
---

# 写真タップ・キャンセル時のフィードバック方針

> RNGH `Gesture.Tap()` を Pressable の代わりに使うと、press 中の自然な opacity dim が失われる。また、ページめくり中など「タップは検出したが実行しない」状況では Alert を開かないため、ユーザーから見るとタップが消えたように見える。両方とも UX 上の silent swallow なので明示的に禁止し、最低限のフィードバックを返す。

## ルール

1. **成立するタップ** → 軽い視覚 dim を返す
   - 方法 (a): HeldPhoto の onPressIn/Out 由来の opacity 制御
   - 方法 (b): `Gesture.Tap` の `onBegin` / `onFinalize` で opacity を制御
2. **キャンセルされるタップ** → `Haptics.notificationAsync(Warning)` を返す
   - 「受け付けなかった」を触覚で伝える
3. **silent swallow は禁止** — タップが何の反応も返さずに消える状態を作らない

## なぜ Pressable をやめたか

feat/album-spread-polish 当初は `Pressable + pressRetentionOffset` (style 変更なし) を予定していたが、写真タップが親 Pan と衝突する gesture race を解決するために RNGH `Gesture.Tap` に切り替えた (spec §3-4)。結果として `SpreadPage.tsx:56-64` から Pressable が消え、タップ時の opacity dim が無くなった (Q3 で発覚)。

→ Gesture.Tap 側で `onBegin`/`onFinalize` から opacity を制御する、もしくは HeldPhoto を内側で Pressable のように扱う、で代替する。

## ページめくり中の写真タップ

`mobile/app/album/[id].tsx:197-198` には以下のガードがある:

```ts
const onPhotoTap = (photo) => {
  if (turning !== "idle") return;  // めくり中はキャプション編集を開かない
  Alert.alert(...)
};
```

このとき RNGH 側では:
- `SpreadPage` の子 `Gesture.Tap` は成立 (写真の上の短いタップなので)
- `blocksExternalGesture(parentTapRef)` で親 Tap (= ページ送り) もキャンセル
- 親 Pan は activate していない (短いタップなので)
- `onPhotoTap` 内で turning ガードに引っ掛かり Alert が開かない

→ 結果: ユーザーのタップは silent に吸われる (feat/album-spread-polish の `387ea46 fix: block photo tap during page-turn` の意図する挙動だが UX として feedback が無い)

修正方針: `onPhotoTap` の早期 return 直前で `Haptics.notificationAsync(Warning)` を発火させる。

## See Also

- [[album-gesture-model|見開き画面のジェスチャ設計]] ([見開き画面のジェスチャ設計](../concepts/album-gesture-model.md)) — 親 Pan/Tap と子 Tap の衝突解決
- [[page-turner-onfinished-deps|PageTurner useEffect の onFinished 依存戦略]] ([PageTurner useEffect の onFinished 依存戦略](../concepts/page-turner-onfinished-deps.md)) — `turning` state の不変扱い
- [[photo-update-api|api.updatePhoto と caption 正規化]] ([api.updatePhoto と caption 正規化](../concepts/photo-update-api.md)) — 写真タップから到達するキャプション編集の保存側
- [[album-spread-conventions|アルバム見開き画面の設計慣習]] ([アルバム見開き画面の設計慣習](../topics/album-spread-conventions.md)) — 親トピック

## Sources

- [アルバム見開き仕上げ - レビュー Q&A](../../raw/notes/2026-05-16-album-spread-polish-review-qa.md) — Q3 (視覚 dim) と Q4 (Haptics warning) と派生 constraint
