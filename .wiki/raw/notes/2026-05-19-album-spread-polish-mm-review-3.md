---
title: "アルバム見開き仕上げ (mm-review 3 周目) - レビュー Q&A"
source: "MANUAL"
type: notes
ingested: 2026-05-19
tags: [review, qa, mm-review, album-spread, perf, a11y, test-infra, ios-only, caption-edit]
summary: "feat/album-spread-polish の 3 周目 mental-model レビューで発生した 4 件の Q&A。空 caption は明示削除として確定、Android は対象外 (iOS-only) として確定、caption 保存時の rerender churn は renderSpread useCallback 化 + photoTap deps narrow で全部直す方針、test infra の不在は prototype phase の意図的 deferral として確定。"
---

# アルバム見開き仕上げ (mental-model レビュー 3 周目) - レビュー Q&A

- **Branch:** feat/album-spread-polish
- **Base:** main (merge-base: 3fc35c8)
- **Date:** 2026-05-19
- **Main change areas:** album spread / page-turn animation / photo tap caption edit / a11y / test infrastructure / platform support (iOS-only)
- **Personas active:** perf, ux, code-quality, type-safety, tests, security

## Q&A

### Q1: 空 caption の silent delete を確認ダイアログで防ぐべきか
**Role:** ux
**Q:** mobile/app/album/[id].tsx:214 `Alert.prompt` の「ほぞん」で空文字を保存すると caption が無音で削除され、成功 Haptic + pulse が同じく鳴る。`next || null` で空→null 正規化しているが、placeholder ("写真へのひとこと") には「空保存で削除される」旨の説明が無い。削除リスクを (a) 確認ダイアログ追加、(b) placeholder で警告、(c) 現状維持、のどれにするか。
**A:** 現状維持。削除は明示行為として扱う仕様。`Alert.prompt` を開いてフィールドを空にして保存するのは意図的アクションであり、追加の確認ステップや placeholder hint は冗長。Success haptic は「API 成功」のフィードバックとして妥当。

### Q2: Android の caption 編集フォールバックの現状
**Role:** ux
**Q:** mobile/app/album/[id].tsx:203 caption 編集の入口は `Alert.prompt` (iOS 専用)。コードコメントは "Android requires a modal sheet — see spec §3-2" と書かれているが、diff にも別ファイルにも Android 向けの `Platform.OS === "android"` 分岐や代替 modal 実装は無い。Android で開いたユーザーは silently 何も起きない。これは (a) iOS-only アプリで Android は対象外、(b) 別ファイルに fallback あり、(c) 未実装で本ブランチでは defer、のどれか。
**A:** Android は対象外。iOS-only アプリ。Android 向けの fallback は不要。`Alert.prompt` が Android で no-op になる点は許容。今後 a11y / UX レビューで「Android で動かない」「TalkBack 対応」等の指摘は drop してよい。

### Q3: caption 保存時の rerender churn を直すか
**Role:** perf (合議: code-quality, type-safety)
**Q:** caption 保存成功時、mobile/app/album/[id].tsx:155-170 で `setSuccessPhotoId(photo.id)` + `setAlbum(...)` + `setTimeout(350, () => setSuccessPhotoId(null))` が連発し、`renderSpread` (`[id].tsx:267`, plain function, useCallback 化されていない) と `photoTap` (`SpreadPage.tsx:57`, useMemo deps に `photo` オブジェクト参照ごと入っている) の影響で **全 photo の gesture と全 PageTurner children が再構築される**。修正スコープは (a) 全部直す (`renderSpread` useCallback + `photoTap` deps を `photo.id` に narrow)、(b) `renderSpread` だけ memo 化、(c) 両方 defer (Reanimated worklet 側でアニメは走っているので JS 再構築は実害無し、と判断)、のどれか。
**A:** 全部直す。`renderSpread` を `useCallback([album, stageSize, onPhotoTap, parentTapRef, successPhotoId])` で安定化し、`photoTap` の `useMemo` deps を `[onPhotoTap, parentTapRef, photo.id, pressOpacity]` に narrow する (`runOnJS(onPhotoTap)(photo)` は `(id: number) => void` シグネチャに変えて最新クロージャから解決)。理由: caption 保存は頻発する操作であり、N 枚の photo で N 個の gesture object と PaperBg (360-circle SVG) の再 mount コストを積むのは合理的でない。

### Q4: test infrastructure 不在 (jest / @testing-library / detox 全て無し) の方針
**Role:** tests
**Q:** mobile/package.json の devDependencies に jest / @testing-library/react-native / detox の登録が無く、`*.test.ts(x)` / `*.spec.ts(x)` ファイルも 0 件。本ブランチで `api.updatePhoto` (新規 public API) / `onPhotoTap` (multi-branch async) / `PhotoItem` (新規 component) / `PageTurner` の `frontPaperKind` + 二面化、と testable surface が増えている。方針は (a) 意図的 (prototype phase, テスト後回し)、(b) 別ブランチで整備中、(c) 本ブランチで最小限追加、のどれか。
**A:** 意図的 (現段階は prototype, テスト後回し)。jest setup や `api.updatePhoto` の最小ユニットテストすら本ブランチでは追加しない。将来 Phase 移行時 (β / RC / app store 提出前) に再評価する。

## Derived constraints / assumptions for future reviews

- **iOS-only アプリと確定**: Android 向け a11y / フォールバック / `Platform.OS === "android"` 分岐の指摘は今後 drop。`Alert.prompt` 等 iOS 専用 API の使用は許容され、Android で no-op になる挙動は仕様。Web/Android 対応の議論は別マイルストーンで。
- **空 caption の保存は明示削除として扱う**: `Alert.prompt` 内で空文字を保存して `null` 化される挙動に対し、確認ダイアログ / placeholder hint / 別ラベル分岐の指摘は今後 drop。同様の「空入力で項目が消える」UX (caption 以外: タイトル・ニックネーム等を将来追加する場合) でも同じ判断パターンを適用する。
- **caption / photo 編集系の保存路では「同期 setState 連発 + 350ms setTimeout」を許容しない**: JSX builder (`renderSpread` のような render-body inline 関数) は `useCallback` で安定化、子 component の `useMemo` deps は object 参照ごとではなく `id` で narrow する。RNGH gesture の useMemo deps についても同じ規則: `[..., photo.id, ...]` であって `[..., photo, ...]` ではない。
- **mm-review:tests は prototype phase 中は silence**: 「production code 追加にテスト無し」を `tests:high` で繰り返し flag するのは 1 周目だけにし、以降の周は test infra 整備が始まるまで drop。Phase 移行時 (β/RC) に再評価する。これは「テストを書かない」ではなく「test infra 未整備という前提を毎回再質問しない」ためのレビュー側の効率化ルール。

## Related

- [[mental-model-review]]
- [[album-spread-conventions]]
- [[album-gesture-model]]
- [[photo-tap-feedback]]
- [[photo-update-api]]
- [[page-turner-back-face]]
- [[page-turner-onfinished-deps]]
- [[palette-design-tokens]]
- [[spread-stage-layout]]
