# アルバム見開き画面 — 仕上げ 3 点 実装プラン

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 見開き画面で (1) フッターの下端切れを修正、(2) 写真タップでキャプション編集、(3) ページめくりに紙の質感を足す。

**Architecture:** `app/album/[id].tsx` の固定 height 計算を flex レイアウトに置換。`SpreadPage.tsx` の各写真を RNGH `Gesture.Tap()` で包み、親の Tap と `blocksExternalGesture` で衝突回避。`PageTurner.tsx` を両面表示 + 折り目シャドウ + 紙寄りイージングに作り変える。

**Tech Stack:** React Native 0.81 / Expo SDK 54 / react-native-gesture-handler 2.28 / react-native-reanimated 4.1 / TypeScript 5.9 / iOS のみ

**設計書:** `docs/superpowers/specs/2026-05-16-album-spread-polish-design.md`

**前提:**
- ブランチ `feat/album-spread-polish` で作業（既に切ってあり、設計書 commit 済 `051a11f`）。
- mobile に Jest が未セットアップのため、各タスクは iOS Simulator での挙動確認をもって「テスト」とする。Simulator 起動は `cd mobile && npx expo start --ios` または `npx expo run:ios`。
- 各タスク完了時に commit する。

---

## File Structure

各タスクで触るファイル一覧:

| ファイル | Task 1 | Task 2 | Task 3 | Task 4 |
|---|---|---|---|---|
| `mobile/app/album/[id].tsx` | 改 | – | 改 | 改 |
| `mobile/src/lib/api.ts` | – | 改 | – | – |
| `mobile/src/ui/SpreadPage.tsx` | – | – | 改 | – |
| `mobile/src/ui/SpreadChrome.tsx` | – | – | – | – |
| `mobile/src/ui/PageTurner.tsx` | – | – | – | 改 |

Task 3 で `SpreadChrome.tsx` 自体は触らない（footer 「かきこみ」 ボタンの onPress は親 `[id].tsx` から渡す関数の中身だけ書き換える）。

---

## Task 1: フッター切れ修正 — 固定 height 計算を flex レイアウトに置換

**Files:**
- Modify: `mobile/app/album/[id].tsx` (imports, `AlbumSpread` 関数本体)

**狙い:** `SCREEN.height - 60 - 78 - indicatorH - 40` の固定計算をやめ、中段ステージを `flex: 1` + `onLayout` で計測する。safe-area の差異で footer が切れなくなる。

- [ ] **Step 1: 期待挙動を定義（manual test）**

iOS Simulator で以下を確認できれば PASS:
1. iPhone 15 (Notch あり) でアルバムを開く → footer の 4 ボタン（ほんだな / しゃしん / かきこみ / シール）全てがアイコン + ラベルとも完全に見える。
2. iPhone SE 第3世代 (ホームボタンあり) で同様に footer が完全に見える。
3. ページ送り（タップ・スワイプ）が引き続き機能する。
4. 「ぺーじを追加」ボタン（最終ページ右下の `＋`）が footer の上に重ならず、indicator の上に出る。

- [ ] **Step 2: ベースラインを観察**

`mobile/app/album/[id].tsx` の現状（line 67-71）:
```ts
const [indicatorH, setIndicatorH] = useState(36);
const pageWidth = SCREEN.width;
const pageHeight = SCREEN.height - 60 - 78 - indicatorH - 40;
```

Simulator で iPhone 15 を起動し、デモアカウントでログイン → アルバムを開く → footer の下端が切れている（特にラベルが見切れている）ことを目視確認。スクリーンショットを 1 枚撮って `baseline-footer-cut.png` 等に保存しておくと差分比較しやすい（任意）。

- [ ] **Step 3: 実装 — imports と state を入れ替え**

`mobile/app/album/[id].tsx` の冒頭、imports を変更:

```tsx
// Before (line 2-8):
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Alert
} from "react-native";

// After:
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Alert,
  LayoutChangeEvent
} from "react-native";
```

`SCREEN` 定数（line 29）を削除:
```ts
// Delete:
const SCREEN = Dimensions.get("window");
```

State 宣言（line 66-71 を以下に置換）:
```ts
// Before:
const [indicatorH, setIndicatorH] = useState(36);
const pageWidth = SCREEN.width;
// Reserve room for header (~60), footer (~78), page indicator, and safe areas.
// indicatorH is populated by PageIndicator's onLayout (initial value 36 matches
// the old PAGE_INDICATOR_HEIGHT constant to keep first-frame jump minimal).
const pageHeight = SCREEN.height - 60 - 78 - indicatorH - 40;

// After:
const [indicatorH, setIndicatorH] = useState(36);
const [stageSize, setStageSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
const onStageLayout = useCallback((e: LayoutChangeEvent) => {
  const { width, height } = e.nativeEvent.layout;
  setStageSize((prev) =>
    prev.w === width && prev.h === height ? prev : { w: width, h: height }
  );
}, []);
```

- [ ] **Step 4: 実装 — Pan/Tap gesture 内の `pageWidth` を `stageSize.w` に**

`mobile/app/album/[id].tsx` の Pan / Tap onEnd 内（line 92, 105）の `pageWidth` を `stageSize.w` に書き換える:

```ts
// panGesture.onEnd:
const dxThreshold = stageSize.w * SWIPE_DISTANCE_FACTOR;

// tapGesture.onEnd:
if (e.x < stageSize.w / 2) turn("prev");
```

- [ ] **Step 5: 実装 — JSX のステージ配置を flex に**

`mobile/app/album/[id].tsx` の return ブロックの中段（line 219-257）を以下に置換:

```tsx
<View style={{ flex: 1 }} onLayout={onStageLayout}>
  <GestureDetector gesture={composedGesture}>
    <View style={[styles.stage, { width: stageSize.w, height: stageSize.h }]}>
      {stageSize.h > 0 ? (
        turning === "idle" || !targetPage ? (
          currentPage ? (
            <SpreadPage album={album} page={currentPage} width={stageSize.w} height={stageSize.h} />
          ) : null
        ) : (
          <PageTurner
            width={stageSize.w}
            height={stageSize.h}
            direction={turning}
            topPage={
              turning === "next" ? (
                currentPage ? <SpreadPage album={album} page={currentPage} width={stageSize.w} height={stageSize.h} /> : null
              ) : (
                targetPage ? <SpreadPage album={album} page={targetPage} width={stageSize.w} height={stageSize.h} /> : null
              )
            }
            bottomPage={
              turning === "next" ? (
                targetPage ? <SpreadPage album={album} page={targetPage} width={stageSize.w} height={stageSize.h} /> : null
              ) : (
                currentPage ? <SpreadPage album={album} page={currentPage} width={stageSize.w} height={stageSize.h} /> : null
              )
            }
            onFinished={onTurnFinished}
          />
        )
      ) : null}

      {/* "photo dropping into corners" overlay flash on insert */}
      {insertingPhotoId && currentPage ? (
        <Animated.View pointerEvents="none" style={[styles.insertOverlay, overlayStyle]}>
          <View style={styles.insertChip}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#f4c834" }} />
          </View>
        </Animated.View>
      ) : null}
    </View>
  </GestureDetector>
</View>
```

ポイント:
- 外側に `<View style={{ flex: 1 }} onLayout={onStageLayout}>` を追加。SafeAreaView の中で header と footer・indicator に挟まれた残余領域を占める。
- 内側の `<View style={[styles.stage, { width: stageSize.w, height: stageSize.h }]}>` は実際の描画ステージ。`stageSize.h === 0` の初期フレームでは中身を描かない（layout 確定待ち）。

- [ ] **Step 6: Simulator で確認**

```bash
cd mobile && npx expo start --ios
```

確認項目:
1. iPhone 15 で footer 全体が見える。
2. iPhone SE 第3世代に切り替えて再起動、同じく footer 全体が見える。
3. アルバムを開いた直後 1 フレームほどページが見えない（layout 待ち）が、すぐ表示される。違和感が大きければ Step 5 の `stageSize.h > 0 ? ... : null` を `<ActivityIndicator />` に差し替えてもよい（フィードバック次第）。
4. 左右タップでページが送られる。
5. 横スワイプでもページが送られる。
6. 最終ページに移動 → 「ぺーじを追加」ボタンが footer の上に正しく配置されている。

すべて PASS したら次へ。

- [ ] **Step 7: Commit**

```bash
cd /Users/yuta/album_app
git add mobile/app/album/\[id\].tsx
git commit -m "fix(album): use flex layout for spread stage to stop footer overflow

固定 height 計算 (SCREEN.height - 60 - 78 - indicatorH - 40) が
notched iPhone の safe-area inset 合計 (~81px) を見ておらず、
footer が SafeAreaView の外に押し出されていた。
中段ステージを flex:1 + onLayout で測る構成に変更。

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: `api.updatePhoto` ヘルパー追加

**Files:**
- Modify: `mobile/src/lib/api.ts:86`（`api` オブジェクトに 1 メソッド追加）

**狙い:** Task 3 で写真キャプションを PATCH するための薄いラッパー。Rails 側 `PATCH /photos/:id` は既存。

- [ ] **Step 1: 期待挙動を定義**

呼び出し:
```ts
await api.updatePhoto(123, { caption: "夏のうみべ" });
// → fetch(`${API_URL}/photos/123`, { method: "PATCH", body: '{"caption":"夏のうみべ"}', headers: { Accept: ..., Authorization: ..., Content-Type: "application/json" } })
// → Promise<{ photo: PhotoDTO }>
```

既存 `createAlbum` などと同じく、ボディは patch オブジェクトをそのまま JSON エンコード（Rails 側の strong params 期待値に合わせる、ネストしない）。

- [ ] **Step 2: 既存 API を確認**

`mobile/src/lib/api.ts:73-74`（`createAlbum`）と `:75-76`（`createPage`）が JSON ボディの送信パターン。`request()` ヘルパーが Content-Type と Authorization を自動付与する。

- [ ] **Step 3: 実装**

`mobile/src/lib/api.ts` の `api` オブジェクトの最後（line 85、`uploadPhoto` の後ろ、closing brace の前）にメソッド追加:

```ts
  uploadPhoto: async (pageId: number, image: { uri: string; name: string; type: string }, fields: Partial<PhotoDTO> = {}) => {
    const form = new FormData();
    // @ts-expect-error RN FormData accepts blob-like
    form.append("image", { uri: image.uri, name: image.name, type: image.type });
    Object.entries(fields).forEach(([k, v]) => {
      if (v !== undefined && v !== null) form.append(k, String(v));
    });
    return request(`/pages/${pageId}/photos`, { method: "POST", body: form }) as Promise<{ photo: PhotoDTO }>;
  },
  updatePhoto: (id: number, patch: Partial<PhotoDTO>): Promise<{ photo: PhotoDTO }> =>
    request(`/photos/${id}`, { method: "PATCH", body: JSON.stringify(patch) })
};
```

注: `uploadPhoto` の後ろにカンマを追加するのを忘れない（line 85 の `}` の直後）。

- [ ] **Step 4: TypeScript で型チェック**

```bash
cd /Users/yuta/album_app/mobile && npx tsc --noEmit
```

エラーが出なければ OK。`updatePhoto` が他から呼ばれていない時点ではこのファイルだけのチェックで足りる。

- [ ] **Step 5: Commit**

```bash
cd /Users/yuta/album_app
git add mobile/src/lib/api.ts
git commit -m "feat(api): add updatePhoto helper for PATCH /photos/:id

Task 3 の写真キャプション編集で使用。Rails 側 endpoint は既存。

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: 写真タップ → キャプション編集

**Files:**
- Modify: `mobile/src/ui/SpreadPage.tsx`（写真 wrapper を `GestureDetector` で包む + props 追加）
- Modify: `mobile/app/album/[id].tsx`（`onPhotoTap`, `parentTapRef` を作り SpreadPage に渡す、footer 「かきこみ」 を hint に）

**狙い:** 写真タップで `Alert.prompt` を開き、キャプションを編集 → `PATCH /photos/:id` → ローカル state 更新。footer の「かきこみ」 は当面は hint Alert に。

- [ ] **Step 1: 期待挙動を定義**

Simulator で以下:
1. 任意の写真をタップ → iOS の Alert.prompt が「かきこみ」というタイトルで開き、`photo.caption || ""` がプリフィルされている。
2. テキストを編集して「ほぞん」 → キャプションが画面に即時反映される。
3. 同じ写真をもう一度タップ → 編集後のキャプションがプリフィルされている。
4. キャプションを空にして「ほぞん」 → 画面からキャプションが消える（`{photo.caption ? <Text> : null}` で消える）。
5. 写真外（紙の余白部分）をタップ → 既存のページ送り（左/右半分タップ）が動作。
6. 写真の上から横スワイプ → ページ送りが動作（写真の Pressable に吸われない）。
7. 写真の上から縦ドラッグ → 何も起きない（既存の `failOffsetY` 挙動）。
8. footer の「かきこみ」 をタップ → 「写真をタップしてかきこみできます。」 Alert が出る。

- [ ] **Step 2: ベースライン観察**

Simulator で写真をタップしても何も起きないことを確認。footer の「かきこみ」 は「次のアップデートで対応します。」 Alert が出ることを確認。

- [ ] **Step 3: 実装 — `SpreadPage.tsx` の props と写真 wrapper**

`mobile/src/ui/SpreadPage.tsx` の冒頭に追加 import:

```tsx
// 既存:
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { PaperBg } from "./PaperBg";
// ...

// 追加:
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import type { GestureType } from "react-native-gesture-handler";
import type { PhotoDTO } from "../lib/api";  // PhotoDTO は SpreadPage で参照済み（page.photos の要素）。既存の type import に追加するなら以下:
```

注: 既存の `import type { PageDTO, AlbumDTO } from "../lib/api";` を `import type { PageDTO, AlbumDTO, PhotoDTO } from "../lib/api";` に拡張する（同じ行）。

`Props` 型を拡張（line 12-17）:

```tsx
// Before:
type Props = {
  album: AlbumDTO;
  page: PageDTO;
  width: number;
  height: number;
};

// After:
type Props = {
  album: AlbumDTO;
  page: PageDTO;
  width: number;
  height: number;
  onPhotoTap?: (photo: PhotoDTO) => void;
  parentTapRef?: React.MutableRefObject<GestureType | undefined>;
};
```

`SpreadPage` 本体（line 19 以降）の関数引数を分解代入で受ける:

```tsx
// Before:
export function SpreadPage({ album, page, width, height }: Props) {

// After:
export function SpreadPage({ album, page, width, height, onPhotoTap, parentTapRef }: Props) {
```

写真ループ（line 46-88）の `<View key={photo.id} …>` を GestureDetector で包んだ形に書き換える。完全な置換:

```tsx
{page.photos.map((photo) => {
  const w = photo.w * innerW;
  const h = photo.h * innerH;
  const left = insetLeft + photo.x * innerW;
  const top = 24 + photo.y * innerH;
  const stickerKind = (photo.sticker_kind as StickerKind | null) || null;

  let photoTap = Gesture.Tap()
    .runOnJS(true)
    .maxDistance(10)
    .onEnd((_, success) => {
      if (success) onPhotoTap?.(photo);
    });
  if (parentTapRef) {
    photoTap = photoTap.blocksExternalGesture(parentTapRef);
  }

  return (
    <GestureDetector key={photo.id} gesture={photoTap}>
      <View style={{ position: "absolute", left, top, width: w, height: h }}>
        {photo.washi_tape_color ? (
          <WashiTape
            color={photo.washi_tape_color}
            width={Math.min(60, w * 0.5)}
            height={14}
            rotation={-8}
            style={{ position: "absolute", top: -7, left: -10, zIndex: 3 }}
          />
        ) : null}
        <HeldPhoto
          uri={photo.image_url}
          scene={photo.scene}
          width={w}
          height={h}
          rotation={photo.rotation || 0}
          cornerKind={(photo.corner_kind as CornerKind) || cornerKind}
          cornerSize={Math.max(12, Math.min(20, w * 0.1))}
          fade={album.theme === "C" ? 0.65 : 0.5}
        />
        {photo.caption ? (
          <Text style={[spreadStyles.caption, captionStyleForTheme(album.theme)]}>
            {photo.caption}
          </Text>
        ) : null}
        {stickerKind ? (
          <View style={{ position: "absolute", right: -14, top: -14, zIndex: 4 }}>
            <Sticker kind={stickerKind} size={32} color={photo.sticker_color || "#f4c834"} />
          </View>
        ) : null}
      </View>
    </GestureDetector>
  );
})}
```

- [ ] **Step 4: 実装 — `[id].tsx` で親 Tap ref と onPhotoTap を作る**

`mobile/app/album/[id].tsx` の imports を補強:

```tsx
// 既存の React imports:
import React, { useCallback, useEffect, useMemo, useState } from "react";

// 変更後:
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

// 既存の RNGH imports:
import { Gesture, GestureDetector } from "react-native-gesture-handler";

// 変更後:
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import type { GestureType } from "react-native-gesture-handler";
```

`AlbumSpread` 関数の上の方（state 宣言群の近く、line 47 付近）に parentTapRef を追加:

```tsx
const parentTapRef = useRef<GestureType | undefined>(undefined);
```

`tapGesture` の宣言（line 100-107）を以下に置換 — `.withRef(parentTapRef)` を追加:

```tsx
const tapGesture = Gesture.Tap()
  .runOnJS(true)
  .maxDistance(10)
  .withRef(parentTapRef)
  .onEnd((e, success) => {
    if (!success) return;
    if (e.x < stageSize.w / 2) turn("prev");
    else turn("next");
  });
```

`onAddPhoto` の下に `onPhotoTap` を追加（line 186 付近、`onAddPage` の前）:

```tsx
const onPhotoTap = useCallback((photo: PhotoDTO) => {
  Alert.prompt(
    "かきこみ",
    "写真へのひとこと",
    [
      { text: "やめる", style: "cancel" },
      {
        text: "ほぞん",
        onPress: async (text) => {
          const next = (text ?? "").trim();
          try {
            await api.updatePhoto(photo.id, { caption: next || null });
          } catch (e: any) {
            Alert.alert("ほぞんに失敗しました", e?.body?.error || "");
            return;
          }
          setAlbum((a) => {
            if (!a) return a;
            return {
              ...a,
              pages: a.pages.map((p) => ({
                ...p,
                photos: p.photos.map((ph) =>
                  ph.id === photo.id ? { ...ph, caption: next || null } : ph
                )
              }))
            };
          });
        }
      }
    ],
    "plain-text",
    photo.caption || ""
  );
}, []);
```

注: `PhotoDTO` には `page_id` フィールドが無い（`api.ts:44-54`）。ローカル state 更新は「全ページを舐めて該当 `photo.id` を差し替える」アプローチを採る（写真総数はせいぜい数十枚レベルなのでコストは無視できる）。

`PhotoDTO` は既存の import で読み込み済み（line 22 の `import { api, AlbumDTO, PageDTO, PhotoDTO } from "../../src/lib/api";`）。確認のみ。

`SpreadPage` の呼び出し（line 223, 232, 234, 239, 241）すべてに `onPhotoTap` と `parentTapRef` を渡す:

```tsx
<SpreadPage
  album={album}
  page={currentPage}
  width={stageSize.w}
  height={stageSize.h}
  onPhotoTap={onPhotoTap}
  parentTapRef={parentTapRef}
/>
```

同様に `topPage` / `bottomPage` で `<SpreadPage ... />` を渡している箇所 4 箇所、すべてに `onPhotoTap` と `parentTapRef` を追加。

- [ ] **Step 5: 実装 — footer 「かきこみ」 を hint Alert に**

`mobile/app/album/[id].tsx` の `SpreadFooter` 呼び出し（line 265-270）の `onWrite` を変更:

```tsx
// Before:
<SpreadFooter
  onBackToShelf={goBackToShelf}
  onPhoto={onAddPhoto}
  onWrite={() => Alert.alert("かきこみ", "次のアップデートで対応します。")}
  onSticker={() => Alert.alert("シール", "次のアップデートで対応します。")}
/>

// After:
<SpreadFooter
  onBackToShelf={goBackToShelf}
  onPhoto={onAddPhoto}
  onWrite={() => Alert.alert("かきこみ", "写真をタップしてかきこみできます。")}
  onSticker={() => Alert.alert("シール", "次のアップデートで対応します。")}
/>
```

- [ ] **Step 6: TypeScript check**

```bash
cd /Users/yuta/album_app/mobile && npx tsc --noEmit
```

エラー 0 を確認。`GestureType` の import 名がバージョンで違う場合（RNGH 2.28 では `GestureType` を export している）、型エラーが出たら `import type { Gesture as GestureType } from "react-native-gesture-handler"` 等で読み替える。RNGH の `.withRef()` シグネチャを `node_modules/react-native-gesture-handler/lib/typescript/index.d.ts` で grep してずれを確認する。

- [ ] **Step 7: Simulator で確認**

Step 1 の 8 項目すべてを目視確認。特に:
- 写真の上から横スワイプでページ送りが効くこと（写真 Tap が吸わない）。これは `Gesture.Pan` の `activeOffsetX([-15,15])` が `Gesture.Tap` の `maxDistance(10)` を上回ったときに自然に Tap が fail することで成立する。
- 写真タップで親 Tap（ページ送り）が発火しないこと。これは `blocksExternalGesture(parentTapRef)` で成立する。発火してしまう（タップと同時に隣ページに飛ぶ）場合は spec の §3-4 のフォールバック（時刻ガード）に切り替える。

- [ ] **Step 8: Commit**

```bash
cd /Users/yuta/album_app
git add mobile/src/ui/SpreadPage.tsx mobile/app/album/\[id\].tsx
git commit -m "feat(album): tap a photo to edit its caption

各写真を RNGH GestureDetector + Gesture.Tap で包み、
blocksExternalGesture で親 stage の Tap (ページ送り) と衝突しないようにした。
タップで Alert.prompt が開き、PATCH /photos/:id でキャプション保存。

footer 'かきこみ' は当面 hint Alert に差し替え。

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: ページめくり — 両面表示 + 折り目シャドウ + イージング

**Files:**
- Modify: `mobile/src/ui/PageTurner.tsx`（ほぼ全面書き換え）
- Modify: `mobile/app/album/[id].tsx`（`frontPaperKind` prop を渡す）

**狙い:** 片面・回転 160°・material easing から、両面・180°・out-back easing + 折り目シャドウへ。

- [ ] **Step 1: 期待挙動を定義**

Simulator で:
1. ページめくり開始 → めくられているページが 90° を越えても向こうのページが透けず、紙の裏面（薄い紙色）が見える。
2. めくり進行中、下のページの左端（綴じ側）に折り目シャドウが落ちる。midway で最も濃く、開始・終了で 0。
3. めくり時間が約 850ms で、止まりが「コトン」と着地する感じになる（バウンドはせず、out-back に少しだけ寄せた）。
4. 既存の挙動（タップ、スワイプ、写真挿入、ページ追加）は壊れていない。

- [ ] **Step 2: ベースライン観察**

現状の `PageTurner.tsx` の挙動を Simulator で確認:
- ページが 160° まで回転し、向こうのページが透けて見える（裏面が無い）。
- 下のページに影が落ちない（紙の重みが感じられない）。
- 700ms material easing で「ふわっ」と止まる。

- [ ] **Step 3: 実装 — `PageTurner.tsx` を書き換え**

`mobile/src/ui/PageTurner.tsx` を全面置換:

```tsx
import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { palette, PaperKind } from "./palette";

type Props = {
  width: number;
  height: number;
  direction: "next" | "prev" | "idle";
  onFinished?: () => void;
  topPage: React.ReactNode;     // the visible page that will fold away (next) or fold in (prev)
  bottomPage: React.ReactNode;  // the page revealed underneath
  frontPaperKind: PaperKind;    // paper color used as the back of the flipping page
};

const DURATION = 850;
const MAX_ANGLE = 180;

export function PageTurner({
  width, height, direction, onFinished, topPage, bottomPage, frontPaperKind
}: Props) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (direction === "idle") {
      progress.value = 0;
      return;
    }
    progress.value = 0;
    progress.value = withTiming(
      1,
      { duration: DURATION, easing: Easing.bezier(0.32, 0.72, 0, 1) },
      (finished) => {
        if (finished && onFinished) runOnJS(onFinished)();
      }
    );
  }, [direction, onFinished, progress]);

  const flipStyle = useAnimatedStyle(() => {
    if (direction === "idle") return { opacity: 1 };
    const angle = direction === "next"
      ? -progress.value * MAX_ANGLE
      : -(1 - progress.value) * MAX_ANGLE;
    const shadowOpacity = 0.4 * Math.sin(progress.value * Math.PI);
    return {
      transform: [
        { perspective: 1400 },
        { rotateY: `${angle}deg` }
      ],
      shadowOpacity,
      shadowOffset: { width: 8 * progress.value, height: 4 }
    };
  });

  const foldShadowStyle = useAnimatedStyle(() => {
    if (direction === "idle") return { opacity: 0, width: 0 };
    return {
      opacity: Math.sin(progress.value * Math.PI),
      width: width * 0.4 * progress.value
    };
  });

  const backColor = palette[frontPaperKind].base;

  return (
    <View style={{ width, height }}>
      {/* bottom (revealed) page */}
      <View style={StyleSheet.absoluteFill}>{bottomPage}</View>

      {/* fold shadow over bottom page, left-edge anchored, width grows with progress */}
      <Animated.View
        pointerEvents="none"
        style={[
          { position: "absolute", left: 0, top: 0, bottom: 0, overflow: "hidden" },
          foldShadowStyle
        ]}
      >
        <LinearGradient
          colors={["rgba(0,0,0,0.55)", "rgba(0,0,0,0.18)", "rgba(0,0,0,0)"]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* flipping page: front (content) + back (paper color) */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            transformOrigin: "left center",
            shadowColor: "#000",
            shadowRadius: 24
          },
          flipStyle
        ]}
      >
        {/* front face — visible at angle 0, hidden after 90° */}
        <View style={[StyleSheet.absoluteFill, { backfaceVisibility: "hidden" }]}>
          {topPage}
        </View>
        {/* back face — flat paper color, rotated 180° in-place; visible after 90° */}
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backfaceVisibility: "hidden",
              transform: [{ rotateY: "180deg" }],
              backgroundColor: backColor
            }
          ]}
        />
      </Animated.View>
    </View>
  );
}
```

- [ ] **Step 4: 実装 — `[id].tsx` で `frontPaperKind` を渡す**

`mobile/app/album/[id].tsx` の `<PageTurner ... />` 呼び出し（line 226 付近）に `frontPaperKind` を追加。「めくれている側のページ」のテーマ別 paper kind を計算:

`turn` の少し下、JSX 直前で派生値を計算:

```tsx
const flippingPage =
  turning === "next" ? currentPage :
  turning === "prev" ? targetPage :
  null;
const flippingPaperKind: PaperKind =
  (flippingPage?.paper_kind as PaperKind) || themeToPaper(album?.theme || "A");
```

import 追加（既存の palette imports を拡張）:

```tsx
// 既存:
import { colors, themeToPaper, themeToCorner } from "../../src/ui/palette";

// 変更後:
import { colors, themeToPaper, themeToCorner, PaperKind } from "../../src/ui/palette";
```

`<PageTurner ... />` 呼び出しに prop を追加:

```tsx
<PageTurner
  width={stageSize.w}
  height={stageSize.h}
  direction={turning}
  frontPaperKind={flippingPaperKind}
  topPage={...}
  bottomPage={...}
  onFinished={onTurnFinished}
/>
```

- [ ] **Step 5: TypeScript check**

```bash
cd /Users/yuta/album_app/mobile && npx tsc --noEmit
```

エラー 0 を確認。

- [ ] **Step 6: Simulator で確認**

```bash
cd /Users/yuta/album_app/mobile && npx expo start --ios
```

Step 1 の 4 項目を確認。特に「両面化」は実機よりシミュレータの 3D 表現の方が見やすい。
回転中の裏面が白く見えてしまう（背景色が透ける）場合は、`<Animated.View>` 直下の親要素に背景色を付ける、もしくは `back face` の `<View>` を最前面に持ってくる順序を入れ替える等で調整する。

副作用回帰のチェック:
- 写真挿入時のオーバーレイフラッシュが正常に出る。
- 「ぺーじを追加」 ボタンが最終ページで表示される。
- 写真タップ → Alert.prompt が出る（Task 3 の機能）。

- [ ] **Step 7: Commit**

```bash
cd /Users/yuta/album_app
git add mobile/src/ui/PageTurner.tsx mobile/app/album/\[id\].tsx
git commit -m "feat(album): two-sided page-turn with fold shadow and paper easing

- 180° rotation with backfaceVisibility-hidden front/back layers
- fold shadow gradient on the revealed page, width grows with progress
- 850ms with bezier(0.32, 0.72, 0, 1) for a paper-like settle

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## 全体仕上げ

- [ ] **Final Step 1: 全機能の最終確認**

ブランチ全体で Simulator を起動し、以下を回帰確認:
1. ログイン → 本棚 → アルバムを開く → 各ページに移動できる
2. footer 全体が見える（iPhone 15 と SE 第3世代）
3. ページめくりが両面 + 折り目シャドウ付きで、目視で「紙」っぽい
4. 写真タップでキャプション編集 → 反映
5. 写真追加（「しゃしん」）が動く
6. 最終ページで「＋」 → ページ追加が動く
7. footer 「かきこみ」 → hint Alert
8. footer 「シール」 → 「次のアップデート」 Alert（仕様変更なし）

- [ ] **Final Step 2: ブランチを push（ユーザー判断）**

```bash
cd /Users/yuta/album_app
git log --oneline main..HEAD
# Task 0 (spec commit) + Task 1 + Task 2 + Task 3 + Task 4 の 5 commit が並ぶはず
```

push / PR 作成はユーザーに確認してから（このプランは push まで責任を持たない）。
