---
title: "見開きステージの寸法導出"
category: concept
sources:
  - raw/notes/2026-05-16-album-spread-improvements-review-qa.md
  - raw/notes/2026-05-16-album-spread-polish-review-qa.md
created: 2026-05-16
updated: 2026-05-16
tags: [layout, onLayout, flex, page-indicator, mobile, album-spread]
aliases: [stage sizing, page height, addPageBtn bottom]
confidence: high
volatility: warm
verified: 2026-05-16
summary: "見開きステージの寸法は `flex:1` + `onLayout` で外部要因 (safe-area inset、PageIndicator 実高、footer 高さ) に追従させる。旧来の固定式 `SCREEN.height - 60 - 78 - indicatorH - 40` は廃止。indicator 実高は magic constant 化せず `onLayout` で取得し、addPageBtn の `bottom` も派生式で導く。"
---

# 見開きステージの寸法導出

> 見開きアルバム画面の縦寸法は端末ごと・safe-area ごとに変動するため、固定値の引き算で計算すると bug 源になる。現プロジェクトでは「stage は `flex:1` で残りスペースを取り、必要な実高は `onLayout` で測る」方針に統一済み。

## 現方式: flex + onLayout

```tsx
<View style={{ flex: 1 }} onLayout={(e) => setStageSize(e.nativeEvent.layout)}>
  {/* ページ */}
</View>
```

- ステージ寸法は外部要因 (safe-area inset、PageIndicator 実高、footer 高さ) に従って自動で決まる
- `stageSize` が必要なロジック (PageTurner のアニメーション幅、写真の絶対座標→相対座標変換など) は `onLayout` 後の値を使う

## PageIndicator 実高は onLayout で取得

PageIndicator の実高は構成要素 (paddingTop 4 + dot 7 + marginBottom 3 + text ~14 + paddingBottom 4 ≒ 32px) の足し算で、デザイン定数 (例: 36) と必ずズレる。さらに `total > 8` で `showDots` が false になると更に縮む。

→ 定数化せず `onLayout` で実高 `indicatorH` を取る。

## addPageBtn 等の派生式

「addPageBtn を indicator の真上に置きたい」のような派生位置も、indicatorH に依存させる:

```tsx
<Pressable style={{ position: "absolute", bottom: 78 + indicatorH + 10 }}>
```

(78 は footer 高さ、10 は indicator との余白)

indicator の実装 (ドット数、text-only 切替、フォント差替え) が変わってもレイアウト式は変えなくて済む。

## 廃止: 旧固定式

```ts
// 廃止
const pageHeight = SCREEN.height - 60 /* header */ - 78 /* footer */ - 36 /* indicator */ - 40 /* safe area */;
```

- safe-area が端末ごとに違うため壊れやすい
- indicator 高 36 が PageIndicator の実装と desync (実測 ~32)
- header/footer 高さを変えるたびに公式の引き算を直す必要がある

feat/album-spread-improvements (Q4) で「`onLayout` で動的計算に変更する」と確定し、feat/album-spread-polish で `flex:1` 化が完了した。

## See Also

- [[album-gesture-model|見開き画面のジェスチャ設計]] ([見開き画面のジェスチャ設計](../concepts/album-gesture-model.md)) — ジェスチャ検出領域は stage に一致するため寸法と密接
- [[page-turner-back-face|PageTurner back face のレイヤ構造]] ([PageTurner back face のレイヤ構造](../concepts/page-turner-back-face.md)) — ステージ寸法を使うアニメーション側
- [[album-spread-conventions|アルバム見開き画面の設計慣習]] ([アルバム見開き画面の設計慣習](../topics/album-spread-conventions.md)) — 親トピック

## Sources

- [アルバム見開き改善 - レビュー Q&A](../../raw/notes/2026-05-16-album-spread-improvements-review-qa.md) — Q4 で `onLayout` 化を決定
- [アルバム見開き仕上げ - レビュー Q&A](../../raw/notes/2026-05-16-album-spread-polish-review-qa.md) — `flex:1` 化と旧固定式の廃止
