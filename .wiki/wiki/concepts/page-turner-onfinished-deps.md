---
title: "PageTurner useEffect の onFinished 依存戦略"
category: concept
sources:
  - raw/notes/2026-05-16-album-spread-polish-review-qa.md
created: 2026-05-16
updated: 2026-05-16
tags: [react, useEffect, useCallback, page-turner, mobile, animation]
aliases: [onTurnFinished memo, PageTurner deps]
confidence: high
volatility: warm
verified: 2026-05-16
summary: "PageTurner 内の useEffect は `onFinished` を依存配列に含める設計を維持する。呼び出し側 (`[id].tsx`) で `onTurnFinished` を `useCallback([turning])` で memo 化することにより、turn 中は identity 不変となり effect が再発火しない。memo を外すと毎レンダーでアニメーションが再起動する既知の罠 (commit `ae060f8`)。"
---

# PageTurner useEffect の onFinished 依存戦略

> PageTurner の Reanimated アニメーションは `useEffect` 内で起動する。コールバック `onFinished` を deps に含めるかどうか、含めるとして呼び出し側でどう memo 化するか、を一度間違えると「めくっている途中で毎レンダーアニメーションが最初から再起動する」事故になる。

## ルール

1. PageTurner 内の `useEffect(() => { /* animate */ }, [..., onFinished])` は **onFinished を deps に含める**
2. 呼び出し側 (`mobile/app/album/[id].tsx`) は `onTurnFinished` を **`useCallback([turning])` で memo 化** する

これにより、`turning` が変わらない (= めくっている最中の) 間は `onTurnFinished` の identity が不変 → effect の deps が変わらない → アニメーションが再起動しない。

## なぜこの組み合わせか

- React の lint (`react-hooks/exhaustive-deps`) は effect が触る関数を deps に入れろと言う → `onFinished` を deps に入れる
- そのまま呼び出し側で `onTurnFinished` を memo 無しで渡すと毎レンダー新しい関数 → 毎レンダー effect 再実行 → アニメ再起動
- memo の依存を `turning` にしておけば、めくり開始 → 終了の間は固定 identity になる

## 既知の事故

commit `ae060f8` で「`onTurnFinished` の memo を外したらアニメーションが毎フレーム再起動した」事案がある。この一行が今のレイアウトの鍵。

## やってはいけないこと

- ✗ deps から `onFinished` を抜く: lint 警告を放置するだけでなく、`onFinished` 内に呼び出し側 state を closure する場合に古い state を参照する事故も招く
- ✗ 呼び出し側で `useCallback` を外す: 上記事故が再現する
- ✗ `useCallback` の deps を空 `[]` にする: closure された `turning` が常に初期値になり、`onTurnFinished` 内のガード (`if (turning !== "idle") return`) が壊れる

## See Also

- [[page-turner-back-face|PageTurner back face のレイヤ構造]] ([PageTurner back face のレイヤ構造](../concepts/page-turner-back-face.md)) — 同じ PageTurner の視覚側ルール
- [[photo-tap-feedback|写真タップ・キャンセル時のフィードバック方針]] ([写真タップ・キャンセル時のフィードバック方針](../concepts/photo-tap-feedback.md)) — `turning !== "idle"` ガードの実装側
- [[album-spread-conventions|アルバム見開き画面の設計慣習]] ([アルバム見開き画面の設計慣習](../topics/album-spread-conventions.md)) — 親トピック

## Sources

- [アルバム見開き仕上げ - レビュー Q&A](../../raw/notes/2026-05-16-album-spread-polish-review-qa.md) — `onTurnFinished` の memo 化ルールと commit `ae060f8` の事故記録
