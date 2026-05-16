# アルバム見開き画面 — 仕上げの 3 点改善 設計書

- 作成日: 2026-05-16
- 対象ブランチ: `feat/album-spread-polish` (`main` から派生)
- 影響範囲:
  - `mobile/app/album/[id].tsx`
  - `mobile/src/ui/SpreadChrome.tsx`
  - `mobile/src/ui/PageTurner.tsx`
  - `mobile/src/ui/SpreadPage.tsx`
  - `mobile/src/lib/api.ts` (写真キャプション更新の薄い helper)

## 目的

直近で出荷した見開き画面に残る 3 点の体感品質の課題を解消する。

1. フッターメニューの下端が iPhone X 系の safe-area で切れて見えない。
2. ページめくりアニメーションが片面・固定回転で「紙」の質感に乏しい。
3. 写真への書き込み（キャプション編集）導線が存在しない — フッターの「かきこみ」は placeholder。

## 成功基準

- iPhone 13/14/15/16 系（ホームインジケータあり）と iPhone SE 系（ホームボタンあり）の両方で、フッターの 4 ボタン全体（アイコン + ラベル）がスクリーン内に完全に収まる。
- ページめくり時、めくられているページの裏面が見える（向こう側のページが透けて見えない）。さらにめくり進行に追従する折り目シャドウが下のページに落ちる。
- 任意の写真をタップすると、その写真のキャプションを編集できる。空のキャプションも編集可能。保存に成功すると即座に反映される。
- ページめくりのタップ判定（左右半分）と写真タップが衝突しない — 写真の上でのタップはキャプション編集、それ以外でのタップはページ送り。

## 設計

### 1. フッター切れの修正 — 固定計算から flex レイアウトへ

**問題:** `app/album/[id].tsx:71` の式は `Dimensions.get("window").height` から固定 40px のクッションのみ確保している。`SafeAreaView edges={["top","bottom"]}` の inset 合計 (~81px on notched iPhones) を差し引いていないため、子要素の縦合計が SafeAreaView の内側領域を 40px 程度超え、最下段の `SpreadFooter` が画面外に押し出される。

**方針:** 固定 height 計算を捨て、ステージを `flex: 1` で残余領域を取らせる。

```tsx
<SafeAreaView edges={["top","bottom"]} style={{ flex: 1, backgroundColor: "#0e0a06" }}>
  <SpreadHeader … />
  <View
    style={{ flex: 1 }}
    onLayout={(e) => setStageSize({
      w: e.nativeEvent.layout.width,
      h: e.nativeEvent.layout.height
    })}
  >
    <GestureDetector …>
      <View style={[styles.stage, { width: stageSize.w, height: stageSize.h }]}>
        {/* SpreadPage / PageTurner */}
      </View>
    </GestureDetector>
  </View>
  <PageIndicator … />
  <SpreadFooter … />
</SafeAreaView>
```

- `stageSize` は `useState<{w:number; h:number}>({ w: SCREEN.width, h: 0 })` の初期値で持つ。初フレームのみ `h===0` のときは中身を非表示 (or `<ActivityIndicator />`) にしてレイアウト confirmed まで待つ。
- `SCREEN` / `pageWidth` / `pageHeight` の中継変数を削除し、`SpreadPage` と `PageTurner` には `stageSize.w` / `stageSize.h` を渡す。
- `addPageBtnWrap` の `bottom: 78 + indicatorH + 10` 計算は維持。これは絶対配置で footer/indicator の上に乗せるためのもので、stage flex 化と独立。

**棄却した代替案:** `useSafeAreaInsets()` を引いて `pageHeight` 計算を残す — 数式が増え将来また同じ事故を起こす。flex に倒すのが本筋。

### 2. ページめくりアニメーションの紙質感向上

**現状:** `PageTurner.tsx` は単一の `Animated.View` を `rotateY: 0→-160deg` させているだけ。`bottomPage` は常に裏に見えており、回転中もそのまま透けている。

**変更:** 片面表示 → 両面表示 + 折り目シャドウ + 紙寄りイージングへ。

#### 2-1. 両面ページ

回転する Animated.View を **front (現在ページ) / back (用紙の裏)** の 2 レイヤ構成にする。

- `front` View: `backfaceVisibility: "hidden"`, 回転 = `${angle}deg`
- `back`  View: `backfaceVisibility: "hidden"`, 回転 = `${angle + 180}deg` (常に裏向きに重ねる)
- `back` の中身は紙テクスチャ単色 (現ページの `paperKind` に対応する base 色) + 軽い paper noise。`SpreadPage` の中身は乗せない（裏返るとレイアウトが反転するため）。

これにより、めくり進行が 90° を越えると自然に back が前面に来て、bottom ページが「めくれた紙の下から現れる」見え方になる。

#### 2-2. 折り目シャドウ（fold shadow）

`bottomPage` の上に `pointerEvents="none"` の Animated.View を 1 枚被せる。
- 内容: `<LinearGradient colors={["rgba(0,0,0,0.45)", "rgba(0,0,0,0)"]} start={{x:0,y:0.5}} end={{x:1,y:0.5}} />`
- 幅 = `width * progress * 0.4`（折り目位置を逆算した近似帯）
- `left = 0` 固定（左綴じのため折り目は常に左から伸びる）
- `opacity = Math.sin(progress * Math.PI)`  — 中盤で最大、開始/終了で 0

#### 2-3. イージングと所要時間

- duration: `700ms → 850ms`
- easing: `Easing.bezier(0.4, 0, 0.2, 1)` → `Easing.bezier(0.32, 0.72, 0, 1)` (out-back に少し寄せて止まりが「コトン」となる)
- 最大回転角: `-160deg → -180deg` (両面化で 180° に倒しても破綻しないので、見開きの隣ページが見えるところまで倒し切る)

#### 2-4. 影 (top page shadow)

既存の `shadowOpacity = 0.4 * sin(progress * π)` は維持。`shadowOffset` を `{ width: 8 * progress, height: 4 }` に変えてめくり方向に影が伸びるようにする (微調整)。

### 3. 写真タップでキャプション編集

**現状:** `SpreadPage.tsx` の写真は `<View>` で囲まれており、タップを受け取らない。フッターの「かきこみ」ボタンは `Alert.alert("次のアップデートで対応します。")`。

**方針:**

#### 3-1. 写真側

`SpreadPage.tsx` で写真ごとのラッパー `<View>` を `<Pressable>` に置き換える。

- `onPress={() => onPhotoTap?.(photo)}` を呼ぶ。
- props に `onPhotoTap?: (photo: PhotoDTO) => void` を追加。
- `Pressable` の押し込みフィードバックは控えめに (`pressRetentionOffset` のみで `style` 変更なし) — 紙の世界観を崩さないため。
- ヒットエリアは写真の bounding rect ぴったり。WashiTape やキャプション、シールはオーバーレイ要素なので Pressable の外に置く必要は無い（同じラッパー内の zIndex で重ねる現状を維持）。

#### 3-2. 親側 (`album/[id].tsx`)

```tsx
const onPhotoTap = useCallback(async (photo: PhotoDTO) => {
  Alert.prompt(
    "かきこみ",
    "写真へのひとこと",
    [
      { text: "やめる", style: "cancel" },
      { text: "ほぞん", onPress: async (text) => {
        const next = (text ?? "").trim();
        await api.updatePhoto(photo.id, { caption: next });
        setAlbum((a) => a ? {
          ...a,
          pages: a.pages.map((p) => p.id !== currentPage?.id ? p : {
            ...p,
            photos: p.photos.map((ph) => ph.id === photo.id ? { ...ph, caption: next } : ph)
          })
        } : a);
      }}
    ],
    "plain-text",
    photo.caption || ""
  );
}, [currentPage]);
```

- `Alert.prompt` は iOS 専用 API。本アプリは iOS のみのため許容。Android 対応時は別途モーダルへ差し替え。
- 空文字列での保存も許可 (キャプション削除に相当)。

#### 3-3. API 薄ラッパ

`mobile/src/lib/api.ts` に既存の `updatePhoto` がなければ追加。

```ts
updatePhoto: (id: number, patch: Partial<PhotoDTO>): Promise<{ photo: PhotoDTO }> =>
  request(`/photos/${id}`, { method: "PATCH", body: JSON.stringify(patch) })
```

バックエンドの `PATCH /photos/:id` は既に実装済み (`docs/design-notes.md` の API 表参照)。

#### 3-4. ジェスチャ干渉

既存の `Gesture.Exclusive(pan, tap)` は stage 全体を覆う `<GestureDetector>` に付いている。素朴に写真を `<Pressable>` で囲むと、親の `Gesture.Tap()` も同じタッチで発火しうる (RN の Responder system と RNGH は独立に走る) — 写真タップで `onPress` (= キャプション編集) と `turn()` の両方が起きる二重発火リスクがある。

**採用案:** 写真側を RNGH の `<GestureDetector>` で包み、その内側で `Gesture.Tap()` を回す。親 GestureDetector の Tap と「子の Tap が成立したら親を失敗させる」関係を明示する。

```tsx
// SpreadPage.tsx — photo wrapper
const photoTap = Gesture.Tap()
  .runOnJS(true)
  .maxDistance(10)
  .onEnd((_, success) => { if (success) onPhotoTap?.(photo); });

<GestureDetector gesture={photoTap}>
  <View style={photoWrapperStyle}>…</View>
</GestureDetector>
```

```tsx
// [id].tsx — parent tap, defer to any nested tap
const tapGesture = Gesture.Tap()
  .runOnJS(true)
  .maxDistance(10)
  .onEnd(/* turn(prev|next) */);

// 親の tap を「子の tap が成立したら起動しない」ようにする
// (RNGH の関係性 API。simultaneousWithExternalGesture では併発、
//  requireExternalGestureToFail だと相手の失敗を待つので別物。
//  ここでは子側に .blocksExternalGesture(parentTapRef) を付けるのが直球。)
const parentTapRef = useRef<TapGesture>(null);
const tapGesture = Gesture.Tap()…;
tapGesture.withRef(parentTapRef);

const photoTap = Gesture.Tap()…
  .blocksExternalGesture(parentTapRef);  // 子が起動したら親はキャンセル
```

- スワイプ: 写真上からでも `Gesture.Pan()` が `activeOffsetX([-15,15])` で起動。子の `Gesture.Tap()` は `maxDistance(10)` 超過で fail、Pan が勝つ。
- 短いタップ: 写真上 → 子 Tap が成立し、`blocksExternalGesture` で親 Tap がキャンセルされて二重発火しない。写真外 → 子 Tap は存在しないので親 Tap が成立しページ送り。

**フォールバック (子の `blocksExternalGesture` がバージョン差で効かない場合):** 親 Tap の `onEnd` 内で「直前 50ms に子 Tap が発火したか」フラグを見て早期 return する `recentPhotoTapAt` ガードを追加する。設計としては子側だけで完結させたいので採用はあくまで保険。

実装後、実機 / Simulator で 4 ケース（写真タップ・写真外タップ・写真の上から横スワイプ・写真の上から縦ドラッグ）を必ず手で確認する (Test plan 参照)。

#### 3-5. フッターの「かきこみ」ボタン

短期: 1 リリースだけ存置し、タップで `"写真をタップでかきこみできます"` を `Alert.alert` で案内する。

理由: 既存ユーザは「かきこみ」ボタンを探しに行く可能性が高く、いきなり削除すると discoverability が下がる。

次回リリースで 3 ボタンに減らす予定（このスペックの範囲外）。

## 範囲外（このスペックでは扱わない）

- シール (`onSticker`) 機能の実装
- キャプション編集の Android 対応 (現状 iOS only)
- ページめくり中のジェスチャ追従プレビュー (今回も「閾値到達 → アニメ再生」のまま)
- フォトの位置・回転・サイズの編集 UI
- バックエンドの API 追加 (既存のみで足りる)

## テスト計画

- iOS Simulator (iPhone SE 第3世代, iPhone 15) で fronter の 4 ボタン全体が見えることを目視確認。
- ページ送り (タップ / スワイプ) で両面表示と折り目シャドウが期待どおりに描画されることを確認。
- 写真をタップ → Alert.prompt が出る。ほぞん → 即座にキャプションが反映される。やめる → 何も起きない。
- 写真外をタップ → 既存のページ送りが動作する。
- 写真の上から横スワイプ → ページ送りが動作する (Pressable に吸われない)。
- 既存の「しゃしん」フローと「ぺーじを追加」フローが回帰していない。
