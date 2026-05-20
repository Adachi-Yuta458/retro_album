---
title: "api.updatePhoto と caption 正規化"
category: concept
sources:
  - raw/notes/2026-05-16-album-spread-polish-review-qa.md
created: 2026-05-16
updated: 2026-05-16
tags: [api, photo, caption, rest, partial-patch, mobile, backend]
aliases: [updatePhoto helper, caption null normalization, Partial<PhotoDTO>]
confidence: high
volatility: warm
verified: 2026-05-16
summary: "`api.updatePhoto(id, patch: Partial<PhotoDTO>)` は Photo の任意フィールドを差分更新する汎用 PATCH helper。caption は `text.trim() || null` で空文字を null に正規化してから渡す。画像差替えだけは `uploadPhoto` (multipart) で別ルート。"
---

# api.updatePhoto と caption 正規化

> `mobile/src/lib/api.ts` の `updatePhoto` は、Photo に紐づく細かい属性 (caption, scene, position, sticker, washi tape …) を一つの REST PATCH で更新するための汎用 helper。caption の `null` と `""` を等価に扱う正規化規約を持つ。

## シグネチャ

```ts
api.updatePhoto(id: number, patch: Partial<PhotoDTO>): Promise<Photo>
```

- 受ける `patch` は `PhotoDTO` の部分集合
- backend は `params.permit(:scene, :x, :y, :w, :h, :rotation, :corner_kind, :washi_tape_color, :sticker_kind, :sticker_color, :caption)` 相当で受け取る
- 画像 (image_url) の差替えだけはこの helper の対象外 (multipart は `uploadPhoto` 側)

## 対応フィールド

| Field | 型 | 備考 |
|---|---|---|
| `scene` | string | |
| `x`, `y`, `w`, `h` | number | 相対座標 (0..1) |
| `rotation` | number | radians or degrees (実装に従う) |
| `corner_kind` | string | backend に `inclusion` validation あり |
| `washi_tape_color` | string \| null | |
| `sticker_kind` | string | TS union が事実上の許可リスト |
| `sticker_color` | string | |
| `caption` | string \| null | null 正規化あり (下記) |

`sticker_kind` の許可リスト周りは [[cross-platform-enum-sync|クロスプラットフォーム enum 同期]] ([クロスプラットフォーム enum 同期](../concepts/cross-platform-enum-sync.md)) を参照。

## caption の null 正規化

caption は `null` と空文字 `""` を等価とみなす:

```ts
const next = text.trim() || null;
await api.updatePhoto(photo.id, { caption: next });
setLocalPhoto({ ...photo, caption: next });
```

- `text.trim()` で前後空白を落とす
- `||  null` で空文字を null に変換
- backend 側 `Photo` モデルは caption に validation 無し、`params.permit(:caption)` で nil 許容なのでどちらでも受ける
- が、local state と DB の表現を揃えるため null を canonical 形にする

### UX 表現

「caption を空に保存 = キャプション削除」を視覚的に伝えるには、レンダリング側で:

```tsx
{photo.caption ? <Text>{photo.caption}</Text> : null}
```

の見え方変化 (Text 行が消える) でフィードバックする。`<Text>` を残して空文字を表示すると「無い」のか「空文字が入っている」のか区別がつかない。

## See Also

- [[photo-tap-feedback|写真タップ・キャンセル時のフィードバック方針]] ([写真タップ・キャンセル時のフィードバック方針](../concepts/photo-tap-feedback.md)) — caption 編集に入る前のタップ UX
- [[cross-platform-enum-sync|クロスプラットフォーム enum 同期]] ([クロスプラットフォーム enum 同期](../concepts/cross-platform-enum-sync.md)) — `sticker_kind` 等 enum を PATCH するときの注意
- [[album-spread-conventions|アルバム見開き画面の設計慣習]] ([アルバム見開き画面の設計慣習](../topics/album-spread-conventions.md)) — 親トピック

## Sources

- [アルバム見開き仕上げ - レビュー Q&A](../../raw/notes/2026-05-16-album-spread-polish-review-qa.md) — `api.updatePhoto` helper の汎用 PATCH 設計と caption 正規化規約
