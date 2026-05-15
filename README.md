# 思い出棚 — 昭和の家族アルバム

`Album-App.html`（Claude Artifact のデザインモック）を元にした iOS ネイティブアルバムアプリ。

- **backend** … Rails 8.0 / SQLite / Active Storage（Docker コンテナ）
- **mobile**  … React Native + Expo / TypeScript / expo-router（macOS ホスト上で実行）

> iOS シミュレータは macOS でしか動かないため、Expo Metro はホスト側で起動します。
> バックエンドは Docker コンテナで動作させ、ホストの `localhost:3000` で公開します。

## 構成

```
album_app/
├── Album-App.html           # 参照デザインモック
├── docker-compose.yml       # Rails コンテナ + ボリューム定義
├── docs/design-notes.md     # 設計メモ
├── backend/                 # Rails 8 API（コンテナで実行）
│   ├── Dockerfile.dev
│   ├── app/{models,controllers,serializers}
│   └── db/{migrate,seeds.rb}
└── mobile/                  # Expo iOS アプリ
    ├── app/                 # expo-router の画面
    │   ├── (auth)/{login,signup}.tsx
    │   ├── (tabs)/{index,new,search,me}.tsx
    │   └── album/[id].tsx
    └── src/{lib,ui}
```

## 起動手順

### 1. バックエンド（Docker）

```bash
cd album_app
docker compose up -d --build
# 初回は db:prepare + db:seed が自動で走ります（デモユーザー＋6冊のアルバムを投入）
curl http://localhost:3000/up   # → 200
```

ログ確認 / 停止:

```bash
docker compose logs -f backend
docker compose down              # 停止（データは volume に残る）
docker compose down -v           # ボリュームごと削除（DB と画像が消えます）
```

### 2. モバイル（Expo, macOS ホスト）

```bash
cd album_app/mobile
npx expo run:ios   # 初回は Xcode のビルドが走ります
# or
npx expo start --ios
```

実機で動かす場合は、Mac の LAN IP をバックエンドの公開ホストに渡して再起動:

```bash
cd album_app
ALBUM_PUBLIC_HOST="http://192.168.1.42:3000" docker compose up -d
cd mobile
EXPO_PUBLIC_API_URL="http://192.168.1.42:3000" npx expo start --ios
```

### デモアカウント

| email | password |
|--|--|
| `demo@example.com` | `password` |

ログイン直後、本棚には 6 冊のシードアルバム（「家族のきろく」「夏のおもいで」「入学のころ」「お正月」「七五三」「結婚記念」）が並んでいます。

## 動作確認の経路

1. **ログイン** … `demo@example.com / password` で入る
2. **本棚** … 棚に背表紙が縦書きで並ぶ。チップ（家族 / 旅 / イベント / 古いもの）でフィルタ可
3. **アルバムを開く** … 背表紙タップで見開き画面へ
4. **ページ移動** … 画面の左半分タップで前のページ、右半分タップで次のページ（3D ページめくりアニメ）
5. **写真を追加** … フッターの「しゃしん」をタップ → 写真選択 → 三角コーナーに「ぴたっ」と差し込まれる演出
6. **ページを追加** … 最終ページで右下の「＋」ボタン
7. **新規アルバム** … タブの「あたらしく」 → タイトル + テーマ A/B/C を選んで作成
8. **ログアウト** … タブ「わたし」から

## API（バックエンド）

| メソッド | パス | 説明 |
|--|--|--|
| POST | /signup | サインアップ |
| POST | /login | ログイン |
| GET  | /me    | 自分の情報 |
| DELETE | /logout | ログアウト |
| GET  | /albums | 自分のアルバム一覧 |
| POST | /albums | アルバム作成 |
| GET  | /albums/:id | アルバム詳細（pages + photos込み） |
| PATCH/DELETE | /albums/:id | 更新 / 削除 |
| POST | /albums/:id/pages | ページ追加 |
| PATCH/DELETE | /pages/:id | ページ更新 / 削除 |
| POST | /pages/:id/photos | 写真追加（multipart/form-data） |
| PATCH/DELETE | /photos/:id | 写真更新 / 削除 |

すべて `Authorization: Bearer <token>` 必須（signup/login 以外）。

## デザイン参照

詳細は `docs/design-notes.md` を参照。
本棚 UI、紙テクスチャ（kraft / pink / mint）、三角コーナー、washi tape、シール、ページめくり、写真挿入 などが移植済みです。

## トラブルシューティング

- **`localhost:3000` に繋がらない** … `docker compose ps` で backend が `running` か確認。なっていなければ `docker compose logs backend`
- **iOS Simulator で画像が壊れる** … `ALBUM_PUBLIC_HOST` を Mac の LAN IP に変更して docker を再起動。Active Storage が `http://localhost:3000` で URL を返すと、実機/外部からは届かないため
- **Expo の `Cannot find module 'babel-preset-expo'`** … `cd mobile && npm install --legacy-peer-deps`
- **DB を初期化したい** … `docker compose down -v && docker compose up -d --build`
