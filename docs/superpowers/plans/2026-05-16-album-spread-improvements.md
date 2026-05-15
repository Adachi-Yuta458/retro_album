# アルバム見開き画面の改善 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** アルバム見開き画面の戻る導線・スワイプめくり・ページ表示を改善し、デモ用シードを4ページ構成に拡張する。

**Architecture:** mobile 側は既存の expo-router + react-native-reanimated + react-native-gesture-handler を踏襲。Footer のページ送りボタンを「ほんだな」(本棚へ戻る) に置換し、ページ送りは Pan + Tap ジェスチャに統合。下部の新規 `PageIndicator` で現在/総ページ数を昭和風書体で表示。backend はシード Ruby スクリプトに4ページ生成ループとテーマ別ヘルパーを追加し、`find_or_initialize_by` と `page.photos.any?` ガードで冪等性を維持する。

**Tech Stack:** React Native + Expo / TypeScript / expo-router / react-native-reanimated / react-native-gesture-handler / Rails 8 / SQLite (seeds.rb)

**Branch:** すでに `feat/album-spread-improvements` を作成・チェックアウト済み(spec 作成時)。

**Spec:** `docs/superpowers/specs/2026-05-16-album-spread-improvements-design.md`

---

## File Structure

**Modify:**
- `mobile/app/album/[id].tsx` — `goBackToShelf` 追加 / ヘッダー call サイト調整 / フッターのプロップ変更 / `PageIndicator` 挿入 / Pan+Tap ジェスチャ追加(旧 tapLayer を撤去)
- `mobile/src/ui/SpreadChrome.tsx` — `SpreadHeader` から `page` プロップ削除 / `SpreadFooter` の `onTurn`→`onBackToShelf` リネーム / ラベル/アイコン差し替え
- `backend/db/seeds.rb` — 各アルバム4ページ生成、テーマ別ヘルパー、冪等化

**Create:**
- `mobile/src/ui/PageIndicator.tsx` — ドット + 「current / total べーじ」表示

**No automated unit tests in this project** — mobile は `npx tsc --noEmit` を都度パスさせ、backend は `bin/rails db:seed` の二回連続実行で冪等性を確認する。最後に手動 smoke テストを実施。

---

## Task 1: Add `goBackToShelf` helper and wire to header back arrow

**Files:**
- Modify: `mobile/app/album/[id].tsx`

戻り先のロジックを1か所に集約。直接ディープリンクで来た場合も本棚に戻れるよう `router.canGoBack()` で分岐。

- [ ] **Step 1: `goBackToShelf` を `album/[id].tsx` 内に追加し、ヘッダーの `onBack` を差し替える**

`mobile/app/album/[id].tsx` の `const router = useRouter();` の直後 (約32行目あたり) に以下を追加:

```tsx
const goBackToShelf = useCallback(() => {
  if (router.canGoBack()) router.back();
  else router.replace("/(tabs)");
}, [router]);
```

そして、ヘッダーの呼び出し:

```tsx
<SpreadHeader
  title={`${album.title}${album.year ? " · " + album.year : ""}`}
  page={`${currentPage ? currentPage.position : 0} / ${pages.length}`}
  onBack={() => router.back()}
/>
```

を以下に変更:

```tsx
<SpreadHeader
  title={`${album.title}${album.year ? " · " + album.year : ""}`}
  page={`${currentPage ? currentPage.position : 0} / ${pages.length}`}
  onBack={goBackToShelf}
/>
```

- [ ] **Step 2: 型チェックがパスすることを確認**

```bash
cd /Users/yuta/album_app/mobile
npx tsc --noEmit
```

Expected: エラーなし(exit 0)

- [ ] **Step 3: コミット**

```bash
cd /Users/yuta/album_app
git add mobile/app/album/\[id\].tsx
git commit -m "feat(album): centralize back-to-shelf navigation with canGoBack fallback"
```

---

## Task 2: Simplify `SpreadHeader` — drop `page` prop

**Files:**
- Modify: `mobile/src/ui/SpreadChrome.tsx`
- Modify: `mobile/app/album/[id].tsx`

ヘッダー中央のページ数表示は新規 `PageIndicator` に役割を譲るため削除する。

- [ ] **Step 1: `SpreadHeader` から `page` プロップ・表示・スタイルを削除**

`mobile/src/ui/SpreadChrome.tsx` の `HeaderProps` を:

```tsx
type HeaderProps = {
  title: string;
  page: string;
  onBack?: () => void;
  onMenu?: () => void;
};
```

から:

```tsx
type HeaderProps = {
  title: string;
  onBack?: () => void;
  onMenu?: () => void;
};
```

に変更。`SpreadHeader` 関数のシグネチャから `page` を削除し、中央のサブテキスト行を削除:

```tsx
export function SpreadHeader({ title, onBack, onMenu }: HeaderProps) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} style={styles.iconBtn} hitSlop={8}>
        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
          <Path d="M15 6 L9 12 L15 18" stroke="#1a1a1a" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </Pressable>
      <View style={{ flex: 1, alignItems: "center" }}>
        <Text style={styles.title}>{title}</Text>
      </View>
      <Pressable onPress={onMenu} style={styles.iconBtn} hitSlop={8}>
        <Svg width={18} height={18} viewBox="0 0 24 24">
          <Circle cx="5"  cy="12" r="1.6" fill="#1a1a1a" />
          <Circle cx="12" cy="12" r="1.6" fill="#1a1a1a" />
          <Circle cx="19" cy="12" r="1.6" fill="#1a1a1a" />
        </Svg>
      </Pressable>
    </View>
  );
}
```

そして styles 内の `page` スタイル定義を削除:

削除前:
```tsx
title: { fontSize: 14, fontWeight: "600", color: colors.ink, letterSpacing: 0.5 },
page: { fontSize: 10, color: colors.inkSubtle, marginTop: 2 },
```

削除後:
```tsx
title: { fontSize: 14, fontWeight: "600", color: colors.ink, letterSpacing: 0.5 },
```

- [ ] **Step 2: `[id].tsx` の呼び出し側から `page={...}` を削除**

```tsx
<SpreadHeader
  title={`${album.title}${album.year ? " · " + album.year : ""}`}
  onBack={goBackToShelf}
/>
```

- [ ] **Step 3: 型チェックがパスすることを確認**

```bash
cd /Users/yuta/album_app/mobile
npx tsc --noEmit
```

Expected: エラーなし

- [ ] **Step 4: コミット**

```bash
cd /Users/yuta/album_app
git add mobile/src/ui/SpreadChrome.tsx mobile/app/album/\[id\].tsx
git commit -m "feat(album): drop page count from header (moved to bottom indicator)"
```

---

## Task 3: Refactor `SpreadFooter` — 「めくる」→「ほんだな」

**Files:**
- Modify: `mobile/src/ui/SpreadChrome.tsx`
- Modify: `mobile/app/album/[id].tsx`

フッターのページ送りボタンを本棚へ戻るボタンに置き換える。アイコンは「棚に背表紙が並ぶ」イメージ。

- [ ] **Step 1: `SpreadFooter` のプロップ名・ラベル・アイコンを差し替え**

`mobile/src/ui/SpreadChrome.tsx` の `FooterProps` を:

```tsx
type FooterProps = {
  onTurn?: () => void;
  onPhoto?: () => void;
  onWrite?: () => void;
  onSticker?: () => void;
};
```

から:

```tsx
type FooterProps = {
  onBackToShelf?: () => void;
  onPhoto?: () => void;
  onWrite?: () => void;
  onSticker?: () => void;
};
```

に変更。`SpreadFooter` の中身:

```tsx
export function SpreadFooter({ onBackToShelf, onPhoto, onWrite, onSticker }: FooterProps) {
  return (
    <View style={styles.footer}>
      <FooterBtn label="ほんだな" onPress={onBackToShelf} icon={
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Line x1="3" y1="20" x2="21" y2="20" stroke="#1a1a1a" strokeWidth={1.5} strokeLinecap="round" />
          <Rect x="5"  y="8"  width="3" height="12" stroke="#1a1a1a" strokeWidth={1.5} />
          <Rect x="9"  y="6"  width="3" height="14" stroke="#1a1a1a" strokeWidth={1.5} />
          <Rect x="13" y="10" width="3" height="10" stroke="#1a1a1a" strokeWidth={1.5} />
          <Rect x="17" y="7"  width="3" height="13" stroke="#1a1a1a" strokeWidth={1.5} />
        </Svg>
      } />
      <FooterBtn label="しゃしん" onPress={onPhoto} icon={
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Rect x="3" y="6" width="18" height="14" rx="2" stroke="#1a1a1a" strokeWidth={1.5} />
          <Circle cx="12" cy="13" r="3.5" stroke="#1a1a1a" strokeWidth={1.5} />
          <Path d="M8 6 L9.5 4 L14.5 4 L16 6" stroke="#1a1a1a" strokeWidth={1.5} />
        </Svg>
      } />
      <FooterBtn label="かきこみ" onPress={onWrite} icon={
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Path d="M4 20 L4 17 L16 5 L19 8 L7 20 Z" stroke="#1a1a1a" strokeWidth={1.5} strokeLinejoin="round" />
          <Line x1="14" y1="7" x2="17" y2="10" stroke="#1a1a1a" strokeWidth={1.5} />
        </Svg>
      } />
      <FooterBtn label="シール" onPress={onSticker} icon={
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="3" fill="#1a1a1a" />
        </Svg>
      } />
    </View>
  );
}
```

- [ ] **Step 2: `[id].tsx` の `SpreadFooter` 呼び出しを更新**

`mobile/app/album/[id].tsx` の:

```tsx
<SpreadFooter
  onTurn={() => turn("next")}
  onPhoto={onAddPhoto}
  onWrite={() => Alert.alert("かきこみ", "次のアップデートで対応します。")}
  onSticker={() => Alert.alert("シール", "次のアップデートで対応します。")}
/>
```

を以下に変更:

```tsx
<SpreadFooter
  onBackToShelf={goBackToShelf}
  onPhoto={onAddPhoto}
  onWrite={() => Alert.alert("かきこみ", "次のアップデートで対応します。")}
  onSticker={() => Alert.alert("シール", "次のアップデートで対応します。")}
/>
```

- [ ] **Step 3: 型チェックがパスすることを確認**

```bash
cd /Users/yuta/album_app/mobile
npx tsc --noEmit
```

Expected: エラーなし

- [ ] **Step 4: コミット**

```bash
cd /Users/yuta/album_app
git add mobile/src/ui/SpreadChrome.tsx mobile/app/album/\[id\].tsx
git commit -m "feat(album): replace footer turn button with back-to-shelf"
```

---

## Task 4: Create `PageIndicator` component

**Files:**
- Create: `mobile/src/ui/PageIndicator.tsx`

ドット列 + 「current / total べーじ」テキストを表示する単体コンポーネント。

- [ ] **Step 1: 新規ファイル `mobile/src/ui/PageIndicator.tsx` を作成**

```tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "./palette";

type Props = {
  current: number;
  total: number;
};

export function PageIndicator({ current, total }: Props) {
  const showDots = total > 0 && total <= 8;
  return (
    <View style={styles.wrap}>
      {showDots ? (
        <View style={styles.dots}>
          {Array.from({ length: total }).map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i + 1 === current ? styles.dotActive : styles.dotInactive]}
            />
          ))}
        </View>
      ) : null}
      <Text style={styles.text}>{current} / {total} べーじ</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 4,
    paddingBottom: 4,
    backgroundColor: "rgba(255,255,255,0.85)"
  },
  dots: {
    flexDirection: "row",
    marginBottom: 3
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginHorizontal: 3
  },
  dotActive: {
    backgroundColor: colors.ink
  },
  dotInactive: {
    borderWidth: 1,
    borderColor: colors.ink,
    backgroundColor: "transparent"
  },
  text: {
    fontSize: 11,
    color: colors.inkSubtle,
    letterSpacing: 0.6
  }
});
```

- [ ] **Step 2: 型チェックがパスすることを確認**

```bash
cd /Users/yuta/album_app/mobile
npx tsc --noEmit
```

Expected: エラーなし

- [ ] **Step 3: コミット**

```bash
cd /Users/yuta/album_app
git add mobile/src/ui/PageIndicator.tsx
git commit -m "feat(album): add PageIndicator component (dots + count)"
```

---

## Task 5: Integrate `PageIndicator` into album spread

**Files:**
- Modify: `mobile/app/album/[id].tsx`

`stage` と `SpreadFooter` の間に `PageIndicator` を挿入。`pageHeight` 計算からインジケーター分(24px)を減算。`tapLayer` の `bottom` を 78 → 102 に上げる(Task 6 で削除予定だが、本タスク内では暫定的に正しい位置に置く)。

- [ ] **Step 1: import を追加**

`mobile/app/album/[id].tsx` の他 UI import の近く(`import { PageTurner } from "../../src/ui/PageTurner";` の直後)に:

```tsx
import { PageIndicator } from "../../src/ui/PageIndicator";
```

- [ ] **Step 2: `pageHeight` 計算を調整**

現状(60行目あたり):

```tsx
const pageWidth = SCREEN.width;
// Reserve room for header (~60) and footer (~78) and safe areas
const pageHeight = SCREEN.height - 60 - 78 - 40;
```

を以下に変更:

```tsx
const PAGE_INDICATOR_HEIGHT = 24;
const pageWidth = SCREEN.width;
// Reserve room for header (~60), footer (~78), page indicator, and safe areas
const pageHeight = SCREEN.height - 60 - 78 - PAGE_INDICATOR_HEIGHT - 40;
```

- [ ] **Step 3: `<PageIndicator />` を `stage` と `SpreadFooter` の間に挿入**

現状の JSX(`stage` View の閉じ `</View>` 直後、`<SpreadFooter ...>` の直前):

```tsx
      <View style={[styles.stage, { width: pageWidth, height: pageHeight }]}>
        ...
      </View>

      <SpreadFooter
        onBackToShelf={goBackToShelf}
        ...
      />
```

`stage` の閉じ `</View>` と `<SpreadFooter>` の間に以下を挿入:

```tsx
      <PageIndicator
        current={currentPage ? currentPage.position : 0}
        total={pages.length}
      />
```

- [ ] **Step 4: `tapLayer` の `bottom` を 78 → 102 に変更**

`styles` の `tapLayer`:

```tsx
tapLayer: {
  position: "absolute",
  top: 60, bottom: 78, left: 0, right: 0,
  flexDirection: "row"
},
```

を:

```tsx
tapLayer: {
  position: "absolute",
  top: 60, bottom: 102, left: 0, right: 0,
  flexDirection: "row"
},
```

- [ ] **Step 5: 型チェックがパスすることを確認**

```bash
cd /Users/yuta/album_app/mobile
npx tsc --noEmit
```

Expected: エラーなし

- [ ] **Step 6: コミット**

```bash
cd /Users/yuta/album_app
git add mobile/app/album/\[id\].tsx
git commit -m "feat(album): render PageIndicator below the spread"
```

---

## Task 6: Replace tap layer with Pan + Tap gestures

**Files:**
- Modify: `mobile/app/album/[id].tsx`

旧 `tapLayer` (絶対配置の onTouchEnd) を撤去し、`GestureDetector` で `stage` をラップして Pan(スワイプ) と Tap(左右半分タップ) を `Gesture.Exclusive` で合成する。

- [ ] **Step 1: import を追加**

`react-native-gesture-handler` から `Gesture` と `GestureDetector` を import:

```tsx
import { Gesture, GestureDetector } from "react-native-gesture-handler";
```

(他 UI import の直前あたりに追加)

- [ ] **Step 2: コンポーネント内に Pan + Tap ジェスチャを定義**

`turn` 関数の直後(`onTurnFinished` の直前あたり)に以下を追加:

```tsx
const SWIPE_DISTANCE_FACTOR = 0.25;
const SWIPE_VELOCITY = 500;

const panGesture = Gesture.Pan()
  .runOnJS(true)
  .activeOffsetX([-15, 15])
  .onEnd((e) => {
    const dxThreshold = pageWidth * SWIPE_DISTANCE_FACTOR;
    if (e.translationX < -dxThreshold || e.velocityX < -SWIPE_VELOCITY) {
      turn("next");
    } else if (e.translationX > dxThreshold || e.velocityX > SWIPE_VELOCITY) {
      turn("prev");
    }
  });

const tapGesture = Gesture.Tap()
  .runOnJS(true)
  .maxDistance(10)
  .onEnd((e, success) => {
    if (!success) return;
    if (e.x < pageWidth / 2) turn("prev");
    else turn("next");
  });

const composedGesture = Gesture.Exclusive(panGesture, tapGesture);
```

- [ ] **Step 3: `stage` View を `GestureDetector` でラップ**

現状:

```tsx
<View style={[styles.stage, { width: pageWidth, height: pageHeight }]}>
  {turning === "idle" || !targetPage ? (
    ...
  ) : (
    ...
  )}

  {/* "photo dropping into corners" overlay flash on insert */}
  {insertingPhotoId && currentPage ? (
    ...
  ) : null}
</View>
```

を以下に変更:

```tsx
<GestureDetector gesture={composedGesture}>
  <View style={[styles.stage, { width: pageWidth, height: pageHeight }]}>
    {turning === "idle" || !targetPage ? (
      ...
    ) : (
      ...
    )}

    {/* "photo dropping into corners" overlay flash on insert */}
    {insertingPhotoId && currentPage ? (
      ...
    ) : null}
  </View>
</GestureDetector>
```

(`...` 部分は既存のコードをそのまま保持)

- [ ] **Step 4: 旧 `tapLayer` を撤去**

JSX 内の以下のブロックを削除:

```tsx
{/* prev/next quick tap zones */}
<View pointerEvents="box-none" style={styles.tapLayer}>
  <View style={{ flex: 1 }} onTouchEnd={() => turn("prev")} />
  <View style={{ flex: 1 }} onTouchEnd={() => turn("next")} />
</View>
```

そして `styles` から `tapLayer` 定義を削除:

```tsx
tapLayer: {
  position: "absolute",
  top: 60, bottom: 102, left: 0, right: 0,
  flexDirection: "row"
},
```

- [ ] **Step 5: 型チェックがパスすることを確認**

```bash
cd /Users/yuta/album_app/mobile
npx tsc --noEmit
```

Expected: エラーなし

- [ ] **Step 6: コミット**

```bash
cd /Users/yuta/album_app
git add mobile/app/album/\[id\].tsx
git commit -m "feat(album): support swipe paging via Pan gesture (replaces tap layer)"
```

---

## Task 7: Expand seed data to 4 pages per album with theme-specific photos

**Files:**
- Modify: `backend/db/seeds.rb`

`Album.after_create` で position=1 のページが自動生成されるため、`find_or_initialize_by(position:)` で 1〜4 を冪等に確保し、`page.photos.any?` で写真重複も防ぐ。

- [ ] **Step 1: `backend/db/seeds.rb` を以下の全文に置換**

```ruby
# デモユーザー＋デザインに登場する6冊のアルバムをシードする
demo = User.find_or_initialize_by(email: "demo@example.com")
demo.assign_attributes(name: "光子", password: "password", password_confirmation: "password")
demo.save!

ALBUMS = [
  { title: "家族のきろく", subtitle: "春夏秋冬", year: "1984", category: "family", theme: "A",
    spine_color: "#f0a890", spine_cloth_color: "#d88670", spine_deco: "gold" },
  { title: "夏のおもいで", subtitle: "海と祭り", year: "1983", category: "travel", theme: "A",
    spine_color: "#7ac8e0", spine_cloth_color: "#4ea4c0", spine_deco: "silver" },
  { title: "入学のころ",   subtitle: "春・桜",   year: "1982", category: "event", theme: "C",
    spine_color: "#b8d49a", spine_cloth_color: "#90b070", spine_deco: "gold" },
  { title: "お正月",       subtitle: "おせち・凧", year: "1985", category: "event", theme: "B",
    spine_color: "#f5c0d0", spine_cloth_color: "#e090ac", spine_deco: "gold" },
  { title: "七五三",       subtitle: "神社にて", year: "1983", category: "event", theme: "B",
    spine_color: "#f5dc7e", spine_cloth_color: "#d8b840", spine_deco: "silver" },
  { title: "結婚記念",     subtitle: "父母のいち日", year: "1960", category: "family", theme: "C",
    spine_color: "#bee4d2", spine_cloth_color: "#84c8a8", spine_deco: "gold" }
]

PAPER_BY_THEME = { "A" => "kraft", "B" => "pink", "C" => "mint" }.freeze

def seed_photos_for(page, theme, page_number)
  case theme
  when "A" then seed_theme_a(page, page_number)
  when "B" then seed_theme_b(page, page_number)
  when "C" then seed_theme_c(page, page_number)
  end
end

def seed_theme_a(page, n)
  case n
  when 1
    page.photos.create!(caption: "海はきれいで、光子はじめての海水浴。",
      scene: "beach", x: 0.18, y: 0.16, w: 0.55, h: 0.20, rotation: -1.5,
      corner_kind: "kraft", washi_tape_color: "#7ac8e0", sticker_kind: "sun", sticker_color: "#f4c834")
    page.photos.create!(caption: "花さんぽ",
      scene: "park", x: 0.12, y: 0.46, w: 0.30, h: 0.18, rotation: -2.0,
      corner_kind: "kraft")
    page.photos.create!(caption: "夕やけ",
      scene: "sunset", x: 0.50, y: 0.48, w: 0.30, h: 0.18, rotation: 2.2,
      corner_kind: "kraft")
  when 2
    page.photos.create!(caption: "夏まつり、ヨーヨーつり",
      scene: "festival", x: 0.10, y: 0.10, w: 0.42, h: 0.30, rotation: 1.4,
      corner_kind: "kraft", washi_tape_color: "#f4c834")
    page.photos.create!(caption: "アイスがとけそうで",
      scene: "ice", x: 0.55, y: 0.20, w: 0.35, h: 0.22, rotation: -2.5,
      corner_kind: "kraft")
    page.photos.create!(caption: "むしとり名人",
      scene: "park", x: 0.20, y: 0.55, w: 0.50, h: 0.28, rotation: 0.8,
      corner_kind: "kraft", sticker_kind: "leaf", sticker_color: "#7ac8a4")
  when 3
    page.photos.create!(caption: "ひまわり畑",
      scene: "park", x: 0.12, y: 0.14, w: 0.74, h: 0.32, rotation: 0,
      corner_kind: "kraft", washi_tape_color: "#7ac8e0")
    page.photos.create!(caption: "夕飯のすいか",
      scene: "family", x: 0.15, y: 0.55, w: 0.34, h: 0.28, rotation: -1.8,
      corner_kind: "kraft")
    page.photos.create!(caption: "花火、しゅるしゅる",
      scene: "festival", x: 0.55, y: 0.58, w: 0.32, h: 0.26, rotation: 2.5,
      corner_kind: "kraft")
  when 4
    page.photos.create!(caption: "うみの家、おばあちゃんと",
      scene: "beach", x: 0.18, y: 0.18, w: 0.65, h: 0.35, rotation: -1.0,
      corner_kind: "kraft", sticker_kind: "sun", sticker_color: "#f4c834")
    page.photos.create!(caption: "おみやげの貝がら",
      scene: "beach", x: 0.20, y: 0.58, w: 0.55, h: 0.25, rotation: 1.5,
      corner_kind: "kraft", washi_tape_color: "#f4c834")
  end
end

def seed_theme_b(page, n)
  case n
  when 1
    page.photos.create!(caption: "ちあき三才。きものはおばあちゃんのてづくり。",
      scene: "kimono", x: 0.08, y: 0.14, w: 0.42, h: 0.30, rotation: -2.0,
      corner_kind: "white", washi_tape_color: "#7ac8a4", sticker_kind: "flower", sticker_color: "#f4a04c")
    page.photos.create!(caption: "おじいちゃんとはつもうで",
      scene: "newyear", x: 0.45, y: 0.55, w: 0.42, h: 0.22, rotation: 3.0,
      corner_kind: "gold", washi_tape_color: "#f4c834", sticker_kind: "heart", sticker_color: "#f0648a")
  when 2
    page.photos.create!(caption: "おせち・かまぼこは光子のすきな色",
      scene: "newyear", x: 0.15, y: 0.12, w: 0.70, h: 0.30, rotation: 0,
      corner_kind: "gold", washi_tape_color: "#f4c834")
    page.photos.create!(caption: "凧あげ、風がよわくて",
      scene: "newyear", x: 0.18, y: 0.55, w: 0.62, h: 0.28, rotation: -1.5,
      corner_kind: "white", sticker_kind: "kite", sticker_color: "#f0648a")
  when 3
    page.photos.create!(caption: "ひな祭り、おさげ髪",
      scene: "kimono", x: 0.12, y: 0.10, w: 0.50, h: 0.40, rotation: 1.2,
      corner_kind: "white", washi_tape_color: "#7ac8a4")
    page.photos.create!(caption: "お雛さま",
      scene: "kimono", x: 0.55, y: 0.55, w: 0.35, h: 0.28, rotation: -2.0,
      corner_kind: "gold", sticker_kind: "flower", sticker_color: "#f4a04c")
  when 4
    page.photos.create!(caption: "七五三、千歳飴",
      scene: "kimono", x: 0.18, y: 0.18, w: 0.64, h: 0.40, rotation: 0.5,
      corner_kind: "gold", washi_tape_color: "#f4c834", sticker_kind: "heart", sticker_color: "#f0648a")
    page.photos.create!(caption: "神社の階段",
      scene: "kimono", x: 0.22, y: 0.62, w: 0.56, h: 0.25, rotation: 2.0,
      corner_kind: "white")
  end
end

def seed_theme_c(page, n)
  case n
  when 1
    page.photos.create!(caption: "桜井 弘 ・ 静江\n神田明神にて",
      scene: "kimono", x: 0.22, y: 0.12, w: 0.56, h: 0.40, rotation: 0,
      corner_kind: "white", sticker_kind: "flower", sticker_color: "#f4a04c")
    page.photos.create!(caption: nil, scene: "family",
      x: 0.12, y: 0.62, w: 0.32, h: 0.20, rotation: 0, corner_kind: "white")
    page.photos.create!(caption: nil, scene: "park",
      x: 0.52, y: 0.62, w: 0.32, h: 0.20, rotation: 0, corner_kind: "white")
  when 2
    page.photos.create!(caption: "祖父の家、縁側にて",
      scene: "family", x: 0.15, y: 0.15, w: 0.70, h: 0.35, rotation: 0,
      corner_kind: "white", washi_tape_color: "#bee4d2")
    page.photos.create!(caption: "庭の梅",
      scene: "park", x: 0.18, y: 0.60, w: 0.62, h: 0.25, rotation: -1.5,
      corner_kind: "white")
  when 3
    page.photos.create!(caption: "結婚式当日、玄関にて",
      scene: "kimono", x: 0.20, y: 0.12, w: 0.60, h: 0.42, rotation: 1.0,
      corner_kind: "gold", washi_tape_color: "#f4c834")
    page.photos.create!(caption: "親族集合写真",
      scene: "family", x: 0.10, y: 0.60, w: 0.80, h: 0.26, rotation: 0,
      corner_kind: "white")
  when 4
    page.photos.create!(caption: "新婚旅行、汽車のなかで",
      scene: "family", x: 0.15, y: 0.16, w: 0.66, h: 0.30, rotation: -1.2,
      corner_kind: "white")
    page.photos.create!(caption: "宿のまえで",
      scene: "park", x: 0.18, y: 0.58, w: 0.60, h: 0.28, rotation: 1.8,
      corner_kind: "white", sticker_kind: "flower", sticker_color: "#f4a04c")
  end
end

ALBUMS.each do |attrs|
  album = demo.albums.find_or_initialize_by(title: attrs[:title])
  album.assign_attributes(attrs)
  album.save!

  paper_kind = PAPER_BY_THEME[album.theme] || "cream"
  (1..4).each do |n|
    page = album.pages.find_or_initialize_by(position: n)
    page.paper_kind = paper_kind
    page.save!
    next if page.photos.any?
    seed_photos_for(page, album.theme, n)
  end
end

puts "✅ Seeded #{User.count} user, #{Album.count} albums, #{Page.count} pages, #{Photo.count} photos"
```

- [ ] **Step 2: シードを 1 回目実行(クリーン状態から)**

事前に DB をリセットしてから実行する:

```bash
cd /Users/yuta/album_app
docker compose down -v
docker compose up -d --build
# Wait ~10s for db:prepare + db:seed to run via container entrypoint
docker compose logs backend | tail -30
```

または、コンテナが起動済みなら手動で:

```bash
docker compose exec backend bin/rails db:reset
```

`db:reset` で seeds が自動実行される。

Expected: ログに `✅ Seeded 1 user, 6 albums, 24 pages, 56 photos`(写真定義から: theme A 11枚×2冊 + theme B 8枚×2冊 + theme C 9枚×2冊 = 56)。

- [ ] **Step 3: シードを 2 回目実行(冪等性確認)**

```bash
cd /Users/yuta/album_app
docker compose exec backend bin/rails db:seed
```

Expected: 同じく `✅ Seeded 1 user, 6 albums, 24 pages, 56 photos` で、ページ・写真の総数が 1 回目と同一であること(`Photo.count` が増えない)。

確認用に:

```bash
docker compose exec backend bin/rails runner 'puts "albums=#{Album.count} pages=#{Page.count} photos=#{Photo.count}"'
```

を 2 回目実行の前後で叩き、出力が一致することを確認。

- [ ] **Step 4: コミット**

```bash
cd /Users/yuta/album_app
git add backend/db/seeds.rb
git commit -m "chore(seed): expand demo albums to 4 pages with theme-specific photos"
```

---

## Task 8: Manual smoke test

**Files:** なし(検証のみ)

iOS シミュレータ上で以下を確認する。失敗した場合は該当タスクに戻り修正。

- [ ] **Step 1: アプリ起動 & ログイン**

```bash
cd /Users/yuta/album_app/mobile
npx expo start --ios
```

`demo@example.com` / `password` でログイン。本棚に6冊が並ぶこと。

- [ ] **Step 2: アルバム遷移 & 戻る**

- 本棚から「家族のきろく」をタップ → 見開き画面が開く
- フッター左端に「ほんだな」ボタン(本棚アイコン)があることを確認
- 「ほんだな」をタップ → 本棚に戻ること
- 再度開いて、ヘッダー左の戻る矢印でも戻れること

- [ ] **Step 3: ページ送り(タップ)**

- 見開き画面で画面右半分をタップ → 次ページに送られる
- 左半分をタップ → 前ページに戻る
- 最終ページ(4)で右タップしても進まない(警告 haptics)

- [ ] **Step 4: ページ送り(スワイプ)**

- 左方向(右から左へ)スワイプ → 次ページ
- 右方向(左から右へ)スワイプ → 前ページ
- 軽い指の動きではめくれない(誤動作なし)
- 速いフリックでもめくれる

- [ ] **Step 5: ページインジケーター**

- 画面下部(フッター上) に4つのドット + 「1 / 4 べーじ」のテキストが表示されている
- ページをめくるとドットの塗りつぶし位置とテキストの数値が同期して変わる
- ヘッダー中央のページ数表示が消えている

- [ ] **Step 6: 写真追加(リグレッション確認)**

- フッターの「しゃしん」をタップ → 写真ライブラリから1枚追加 → 三角コーナーに収まるアニメが動く
- 最終ページの右下「＋」で新規ページ追加 → 「5 / 5 べーじ」になる(ドット表示は `total <= 8` なので 5 個になる)

- [ ] **Step 7: 各テーマアルバムの巡回**

- 「夏のおもいで」(theme A)、「お正月」(theme B)、「結婚記念」(theme C) をそれぞれ開いて 4 ページめくり、テーマ別に異なる写真配置が表示されることを確認

すべてパスしたら spec 要件を満たしている。

---

## Self-Review

- ✅ 戻れない問題 → Task 1, 3, 8.2(両経路をテスト)
- ✅ フッター「めくる」表現変更 → Task 3
- ✅ スワイプ対応 → Task 6, 8.4
- ✅ 複数ページサンプル → Task 7, 8.7
- ✅ ページ数 / 現在ページ表示 → Task 4, 5, 8.5

タスク間の型・関数名の整合性 OK:
- `goBackToShelf` (Task 1 で定義) は Task 3 で `onBackToShelf={goBackToShelf}` として使用
- `onBackToShelf` プロップ(Task 3 で定義) ↔ Task 3 Step 2 の呼び出し
- `PageIndicator` (Task 4 で定義) ↔ Task 5 Step 1 で import / Step 3 でレンダ
- `composedGesture` / `panGesture` / `tapGesture` (Task 6) は Task 6 内で完結

placeholder / TBD なし。
