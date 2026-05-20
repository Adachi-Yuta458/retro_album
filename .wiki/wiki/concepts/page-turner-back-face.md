---
title: "PageTurner back face のレイヤ構造"
category: concept
sources:
  - raw/notes/2026-05-16-album-spread-polish-review-qa.md
created: 2026-05-16
updated: 2026-05-16
tags: [page-turner, back-face, paper-bg, paper-noise, mobile, album-spread]
aliases: [PageTurner back face, paper noise back face]
confidence: high
volatility: warm
verified: 2026-05-16
summary: "PageTurner の両面化された flipping page で、back face は `base color (palette[paperKind].base) + paper noise (PaperBg) + (任意の追加レイヤ)` の重ねで構成する。flat background のみだと紙感が出ない。fold shadow gradient は 3-stop 構成を採用。"
---

# PageTurner back face のレイヤ構造

> `mobile/src/ui/PageTurner.tsx` は片面アニメから両面アニメに発展した結果、めくり中の裏側 (back face) もユーザーに見える。flat な単色だと「紙の裏側」に見えず、front 側と差が目立たないため、紙感を出すためのレイヤ重ねを規約化する。

## レイヤ構造

back face は次のスタックで構成する:

1. **base color**: `palette[paperKind].base` の単色 backgroundColor
2. **paper noise**: PaperBg コンポーネントで紙テクスチャを重ねる
3. **(任意の追加レイヤ)**: 縁・折り目シャドウなど

flat な `backgroundColor: palette[frontPaperKind].base` だけでは「紙」感が出ない (feat/album-spread-polish Q2 で発覚)。今後 back face の見た目を変える際もこのスタック構造を保つ。

## どちらの paperKind を使うか

両面 PageTurner では、「角度 0 で表向きに見える側」の paper_kind を `frontPaperKind` とする:

- `next` 時 (次ページに進む): `currentPage.paperKind`
- `prev` 時 (前ページに戻る): `targetPage.paperKind`

両面化後もこの対応関係を崩さないこと。崩すと「めくりかけの裏が次ページの色」になり違和感を生む。

## Fold shadow gradient

折り目シャドウのグラデーションは現行 3-stop を採用:

```ts
colors={["rgba(0,0,0,0.55)", "rgba(0,0,0,0.18)", "rgba(0,0,0,0)"]}
```

- spec `2026-05-16-album-spread-polish-design.md` §2-2 は 2-stop `["rgba(0,0,0,0.45)", "rgba(0,0,0,0)"]` だったが、実機で見て濃く・滑らかに振った経緯がある
- 最暗部 0.45 → 0.55、中間 0.18 のストップを追加した方が紙の折り目に近い
- spec 側を後追いで更新する作業は残っている

## See Also

- [[spread-stage-layout|見開きステージの寸法導出]] ([見開きステージの寸法導出](../concepts/spread-stage-layout.md)) — PageTurner のアニメーション領域はステージ寸法に依存
- [[page-turner-onfinished-deps|PageTurner useEffect の onFinished 依存戦略]] ([PageTurner useEffect の onFinished 依存戦略](../concepts/page-turner-onfinished-deps.md)) — 同じ PageTurner の制御側ルール
- [[cross-platform-enum-sync|クロスプラットフォーム enum 同期]] ([クロスプラットフォーム enum 同期](../concepts/cross-platform-enum-sync.md)) — palette[paperKind] の paperKind 単一ソース
- [[palette-design-tokens|palette.ts デザイントークン集約]] ([palette.ts デザイントークン集約](../concepts/palette-design-tokens.md)) — `palette[paperKind].base` のトークン側
- [[album-spread-conventions|アルバム見開き画面の設計慣習]] ([アルバム見開き画面の設計慣習](../topics/album-spread-conventions.md)) — 親トピック

## Sources

- [アルバム見開き仕上げ - レビュー Q&A](../../raw/notes/2026-05-16-album-spread-polish-review-qa.md) — Q1 (fold shadow) と Q2 (paper noise) と派生 constraint
