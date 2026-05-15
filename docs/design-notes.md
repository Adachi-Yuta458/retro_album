# 昭和の家族アルバム — 設計メモ

`Album-App.html`（Claude Artifact のデザインモック）を元にした、iOS ネイティブ向けアルバムアプリの実装計画です。

## プロジェクト構成

```
album_app/
├── Album-App.html       # 参照デザインモック（既存）
├── backend/             # Rails 8.0 API
├── mobile/              # React Native (Expo) iOS アプリ
└── docs/                # 設計メモ
```

## デザインの世界観

- 「思い出棚」というメタファ
- 昭和（1960〜1985 年あたり）の家族アルバムのテクスチャ
- 紙質：クラフト紙 / 色画用紙ピンク / ミント台紙
- 写真は三角コーナーで止められる（CornerHolder）
- マスキングテープ（WashiTape）、シール（Sticker）、手書き風キャプション（pen/marker フォント）、日付スタンプ
- 本棚は背表紙が縦書きで並ぶ。ホーム上部にカテゴリチップ

## カラーパレット（パステル）

| トーン | base    | edge    | dot     | text    |
|--------|---------|---------|---------|---------|
| kraft  | #fbf2dc | #ead8b0 | #b89c70 | #3a3327 |
| cream  | #fdf6e4 | #f0e0b8 | #b89c70 | #332c20 |
| pink   | #fbd6d2 | #f4a8a2 | #c86862 | #5a2426 |
| mint   | #d2f0de | #9adcc0 | #3e9472 | #0a4a2e |
| blue   | #c8e2f0 | #94c0e0 | #4a7aa0 | #1f2a34 |
| yellow | #fbe898 | #e8c850 | #a8801c | #3a2a0a |

他に sorbet / candy / garden / ice の 4 パレットあり（v1 では pastel のみ実装）。

## 画面構成

### 1. ホーム（思い出棚）
- ヘッダー：`My Album` / `思い出棚` + 「作る」ピル
- カテゴリチップ：すべて / 家族 / 旅 / イベント / 古いもの
- 本棚：背表紙（cloth + spine）が左右に並ぶ。書名は縦書き、金/銀の上下罫線、下部に年。
- 棚板：木目グラデ
- 下部タブ：アルバム / あたらしく / さがす / わたし

### 2. アルバム見開き
- ヘッダー：戻る、タイトル + ページ番号、メニュー
- 紙：A=kraft / B=pink / C=mint
- 左端にバインディングホール（6 個の金属リング風）
- 写真は HeldPhoto（VintagePhoto + 4 隅 CornerHolder）
- 手書きキャプション（pen / marker）
- 日付スタンプ（DateStamp）
- シール（sun / flower / heart / cherry / star など）
- ページ番号
- フッター：めくる / しゃしん / かきこみ / シール

### 3. ページめくり
- perspective + rotateY で右ページが奥に倒れ込む
- 下のページが透けて見える

### 4. 写真挿入
- フィルム/三角コーナーに「ぴたっ」と写真が差し込まれる演出

## データモデル（バックエンド）

- `User` — email, password_digest
- `Album` — user_id, title, subtitle, year, category, theme(A/B/C), spine_color, spine_cloth_color, spine_deco(gold/silver)
- `Page` — album_id, position, paper_kind(kraft/cream/pink/mint/blue/yellow), title
- `Photo` — page_id, image(ActiveStorage), caption, x, y, w, h, rotation, corner_kind(kraft/gold/white/black), washi_tape_color, sticker_kind, sticker_color

## API（v1）

| メソッド | パス | 説明 |
|--|--|--|
| POST | /signup | サインアップ |
| POST | /login | ログイン（トークン返却） |
| DELETE | /logout | ログアウト |
| GET | /me | 自分の情報 |
| GET | /albums | 自分のアルバム一覧 |
| POST | /albums | アルバム作成 |
| GET | /albums/:id | アルバム詳細（+pages+photos） |
| PATCH | /albums/:id | アルバム編集 |
| DELETE | /albums/:id | アルバム削除 |
| POST | /albums/:id/pages | ページ追加 |
| PATCH | /pages/:id | ページ編集 |
| DELETE | /pages/:id | ページ削除 |
| POST | /pages/:id/photos | 写真追加（multipart） |
| PATCH | /photos/:id | 写真の位置・回転・キャプション更新 |
| DELETE | /photos/:id | 写真削除 |

認証はトークンベース（Authorization: Bearer ...）。Rails 8 の `bcrypt` + 自前の `Session` モデルで実装。

## フロント（React Native / Expo）構成

```
mobile/
├── app/
│   ├── _layout.tsx           # ルートレイアウト（Auth gate, Font load）
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── signup.tsx
│   └── (tabs)/
│       ├── _layout.tsx       # 下部タブバー
│       ├── index.tsx         # ホーム = 思い出棚
│       ├── new.tsx           # あたらしく作る
│       ├── search.tsx        # さがす
│       └── me.tsx            # わたし
│   └── album/
│       └── [id].tsx          # アルバム見開き
├── src/
│   ├── api.ts                # APIクライアント
│   ├── auth.ts               # トークン保存（SecureStore）
│   ├── theme.ts              # PALETTES
│   └── ui/
│       ├── PaperBg.tsx
│       ├── HeldPhoto.tsx
│       ├── CornerHolder.tsx
│       ├── WashiTape.tsx
│       ├── Sticker.tsx
│       ├── BindingHoles.tsx
│       ├── AlbumSpine.tsx
│       └── DateStamp.tsx
└── package.json
```

主要ライブラリ：
- expo, expo-router, expo-image-picker, expo-secure-store, expo-linear-gradient, expo-font
- react-native-svg, react-native-reanimated, react-native-gesture-handler
