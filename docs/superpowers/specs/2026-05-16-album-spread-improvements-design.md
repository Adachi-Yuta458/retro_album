# アルバム見開き画面の改善 — 設計書

- 作成日: 2026-05-16
- 対象ブランチ: `feat/album-spread-improvements`(`main` から派生)
- 影響範囲: `mobile/app/album/[id].tsx` / `mobile/src/ui/SpreadChrome.tsx` / `mobile/src/ui/`(新規 `PageIndicator.tsx`) / `backend/db/seeds.rb`

## 目的

アルバム見開き画面の以下の課題を解決する。

1. アルバムに入ったあと、アルバム一覧に戻れない(戻る導線が分かりにくい)。
2. フッターメニューの「めくる」というラベルが意味不明。
3. ページめくりがタップのみで、スワイプに対応していない。
4. シードデータが各アルバム 1 ページのみで、ページめくり体験が伝わらない。
5. ページ数 / 現在ページの表示が小さく、気づきにくい。

## 成功基準

- 見開き画面のフッター左端に「ほんだな」ボタンがあり、タップすると本棚(`/(tabs)`)に戻る。
- 直接ディープリンクでアルバム画面に入った場合でも本棚に戻れる(ナビゲーションスタックに頼らない)。
- 左右スワイプでページが送れる(既存の左右半分タップ判定も維持)。
- 各シードアルバムが 4 ページあり、各ページにテーマに沿った写真が複数枚配置されている。
- 画面下部にドット列 + 「現在ページ / 総ページ」のテキストが昭和風書体で表示されている。

## 設計

### 1. アルバム一覧への戻り経路

- 戻る関数を `goBackToShelf` として `album/[id].tsx` 内に定義する:
  ```ts
  const goBackToShelf = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)");
  }, [router]);
  ```
- `SpreadHeader` の `onBack` と、後述の `SpreadFooter` の `onBackToShelf` の両方にこの関数を渡す。
- ヘッダー左の戻る矢印は残す(冗長だが、複数の入り口があるほうが分かりやすい)。タップ領域・見た目は現状維持。

### 2. フッター「めくる」→「ほんだな」へ置換

`mobile/src/ui/SpreadChrome.tsx` の `SpreadFooter` を変更:

- プロップ名 `onTurn` → `onBackToShelf` にリネーム。
- ラベル `"めくる"` → `"ほんだな"`。
- アイコンを「本棚に背表紙が並ぶ」イメージの SVG に差し替える。設計案:
  ```
  - 横線(棚板) を 1本
  - その上に幅の異なる縦の長方形(背表紙) を 3〜4本並べる
  ```
- それ以外の3ボタン(しゃしん / かきこみ / シール)は変更なし。

`mobile/app/album/[id].tsx`:

- `SpreadFooter` への呼び出しを `onBackToShelf={goBackToShelf}` に変更。
- ページめくりは後述のスワイプ + 既存の左右半分タップで担うため、フッターからは送れなくなる(意図通り)。

### 3. スワイプ・タップ複合ジェスチャ

`mobile/app/album/[id].tsx`:

- `react-native-gesture-handler` で `Gesture.Pan()` と `Gesture.Tap()` を `Gesture.Exclusive(panGesture, tapGesture)` で合成し、`<GestureDetector>` を `stage` を囲むように配置する。`tapLayer` View overlay は廃止する(旧設計から変更)。
- Pan 終了判定:
  - `activeOffsetX([-15, 15])` で 15px 以上の横方向移動でアクティブ化。
  - `failOffsetY([-10, 10])` で 10px 以上の縦方向移動が先にあれば Pan を失敗させる(縦スクロール誤発火の予防)。
  - 終了時の閾値: `Math.abs(translationX) > pageWidth * 0.25` または `Math.abs(velocityX) > 500`。
  - `translationX < 0`(左方向に動かした) → `turn("next")`。
  - `translationX > 0` → `turn("prev")`。
- Tap 判定:
  - `maxDistance(10)` で 10px 以内のタップのみ確定。Pan が先にアクティブ化したらこちらは発火しない (`Gesture.Exclusive` の挙動)。
  - `e.x < pageWidth / 2` → `turn("prev")`、それ以外 → `turn("next")`。
- 両ジェスチャとも `.runOnJS(true)` を指定する(コールバック内で React state を更新するため)。
- `turning !== "idle"` のときは `turn()` 関数の早期 return ガードで動作を抑制する。Pan/Tap 自体は引き続き受け付けるが、no-op になる。
- ジェスチャ中(閾値未達)のページ追随アニメは MVP では実装しない。確定時に既存の `PageTurner` アニメへ受け渡す。

副作用: 検出領域は `<GestureDetector>` が包む `stage` の矩形サイズに等しい。旧 `tapLayer` は `top:60 bottom:78` で header と footer 以外の領域全体をカバーしていたが、新方式では `stage` 高さ(= `pageHeight`)のみ。下部の PageIndicator や safe-area 余白上では paging タップは反応しない (これは仕様)。

### 4. ページインジケーター(新規)

新規ファイル: `mobile/src/ui/PageIndicator.tsx`。

```tsx
type Props = { current: number; total: number };
export function PageIndicator({ current, total }: Props) { ... }
```

- ドット列を `total` 個並べる。`i + 1 === current` のドットを塗り潰し、他は外枠のみ。
- ドットサイズ 8px、間隔 6px、塗り色 `colors.ink`。
- 下に「`{current} / {total} べーじ`」のテキスト(セリフ体、`color: colors.inkSubtle`, `fontSize: 11`, `letterSpacing: 0.6`)。
- `total > 8` のときはドット列を省略しテキストのみ表示(現時点では 4 ページなので発火しない)。

配置(`album/[id].tsx`):

- `stage` の直下、フッターの直前に `<PageIndicator current={currentPage?.position ?? 0} total={pages.length} />` を入れる。
- `pageHeight` の計算からインジケーターぶん(約 24px)を差し引く。
- `SpreadHeader` のページ表示(`page=...`)はこのインジケーターに役割を譲るため、`SpreadHeader` の `page` プロップ表示部分を削除する(`title` のみ中央表示)。

### 5. シードデータ拡張(各アルバム 4 ページ)

`backend/db/seeds.rb` を以下の方針で書き換える:

- アルバムループ内で、`position` 1〜4 の `pages` を `find_or_initialize_by(position:)` で確保。`paper_kind` はテーマに応じて `themeToPaper(theme)` 相当(現状 `palette.ts` 側のロジック)、ここでは Ruby 側で簡易にマッピングする。
- ページごとの写真は、テーマ別のヘルパーメソッドにまとめる:
  - `seed_photos_theme_a(page, page_number)` — 海・夏・家族
  - `seed_photos_theme_b(page, page_number)` — 着物・行事・正月
  - `seed_photos_theme_c(page, page_number)` — 父母・古いもの・神社
- 各ヘルパーは `page_number` ごとに少しずつ違う写真(captions / scene / x,y) を作る。
- 冪等性: 各ページについて `next if page.photos.any?` を維持。再シードしても重複しない。
- `paper_kind` の Ruby 側マッピング(暫定):
  - theme A → `vellum`
  - theme B → `pink_pulp`
  - theme C → `ivory_pulp`
  (現行 `palette.ts` の `themeToPaper` と一致しなくてもアプリ表示は壊れない想定。要確認は実装時。)

### 6. ヘッダー側変更

`SpreadHeader`(`SpreadChrome.tsx`):

- `page` プロップを削除し、中央のサブテキスト行を消す(`title` のみ)。
- 呼び出し側 (`album/[id].tsx`) で `page=` を渡している箇所を削除。

## 影響範囲・非影響

**変更:**
- `mobile/app/album/[id].tsx`
- `mobile/src/ui/SpreadChrome.tsx`
- `backend/db/seeds.rb`

**新規:**
- `mobile/src/ui/PageIndicator.tsx`

**非変更:**
- 既存の `PageTurner` の 3D ページめくりアニメ。
- バックエンドの API / モデル / マイグレーション。
- 写真追加 / ページ追加 / 認証フロー。

## テスト

- **Backend:** `docker compose exec backend bin/rails db:seed` を 2 回連続実行し、`Photo.count` が同じ値になる(冪等)ことを確認。`Page.count` が `Album.count * 4` であることを確認。
- **Mobile 型チェック:** `cd mobile && npx tsc --noEmit` が通る。
- **手動確認 (iOS シミュレータ):**
  - 本棚 → アルバム → フッター「ほんだな」で本棚に戻れる。
  - ヘッダーの戻る矢印でも戻れる。
  - 左スワイプで次ページ、右スワイプで前ページ。
  - 左右半分タップでも従来通り送れる。
  - ページ下部に `●○○○` と `1 / 4 べーじ` が表示され、めくるとドットと数字が更新される。
  - 最終ページで右下「＋」が出ることが維持されている。

## 未解決事項

- スワイプ中のリアルタイムページ追随アニメ(指の動きに合わせてページが傾く)は MVP では実装しない。閾値を超えたタイミングで既存アニメを再生する。
- `paper_kind` の Ruby/TS の一致は本 spec では再検証しない。実装時に `themeToPaper` の値と齟齬が出たらシード値を合わせる。
