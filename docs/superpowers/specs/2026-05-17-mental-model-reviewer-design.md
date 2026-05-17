# Mental-Model Reviewer — Design Spec

- **Date:** 2026-05-17
- **Status:** Draft → User review pending
- **Predecessor:** `.claude/skills/review-with-wiki-ingest/SKILL.md` (現運用中の単一 SKILL)
- **Successor target:** Claude Code plugin `mental-model-reviewer` (Phase 1) → standalone CLI / Web (Phase 3)

## 1. Purpose

プロジェクトに対するメンタルモデルを持った人間レビュアーの行動を **多人格 subagent + ナレッジ層 (wiki)** で再現するレビューツールを作る。レビュー精度を上げるだけでなく、対話とレビュー結果から学んでメンタルモデルを成長させる。

現状の `review-with-wiki-ingest` SKILL の以下の不満を解消する:

1. 蓄積知識 (`.wiki/raw/notes/`) の活用が浅い → Researcher subagent が毎レビュー前に briefing を作る
2. 単一視点 LLM では観点の網羅性・深さが甘い → 並列専門家ポル subagent
3. 暗黙のプロジェクトルールに気付けない → Phase 2 で persona memory 層を追加
4. 起動・終了までのワークフローが手数多い → `/wiki-review` 1コマンドで完了するように

## 2. Scope and phasing

| Phase | 中身 | 完了判断 |
|---|---|---|
| **1 (MVP)** | Orchestrator + Researcher + 並列 specialists + Q&A 統合 + ingest を Claude Code plugin として配布可能な形にする | 1〜2 ブランチで実運用しレグレッション無し |
| **2** | Persona memory 層 (`.wiki/personas/<role>-memory.md`)、project override、ingest 時にポル別 derived constraints も保存 | 1ヶ月実運用後 |
| **3** | 配布形態拡張: standalone CLI (Anthropic SDK 直)、GitHub Action、Web UI | Phase 1/2 が安定後 |

このドキュメントは **Phase 1 を完全に設計** し、**Phase 2 を「Phase 1 でブロックされない」程度に固める**。Phase 3 は概念のみ。

### 2.1 What's explicitly out of scope (Phase 1)

- Web UI / 独立 CLI 配布
- GitHub PR Bot 連携 (Action / App)
- Persona memory の自動更新ループ (Phase 2)
- Iterative Q&A (2 ラウンド以上) — 例外時の単一 specialist 再実行のみ escape hatch として持つ
- LLM-as-judge 評価自動化 — ゴールデン PR 比較は当面人手

## 3. Architecture overview

```
                         ┌──────────────────────────────────┐
   User ── /wiki-review ▶│   Main Claude (Orchestrator)      │
                         │   - Q&A loop (AskUserQuestion)    │
                         │   - integration, ingest           │
                         └────┬──────────────────┬───────────┘
                              │ (1) dispatch     │ (2) dispatch parallel
                              ▼                  ▼
                       ┌──────────────┐   ┌────────────────────────────┐
                       │  Researcher  │   │  Specialist subagents       │
                       │   subagent   │──▶│  perf / ux / security / ... │
                       │              │   │  (each gets: diff+briefing) │
                       └──────┬───────┘   └────────────┬───────────────┘
                              │                        │
                              ▼                        ▼
                         briefing.md          Findings + Questions
                              │                        │
                              └──────────┬─────────────┘
                                         ▼
                                  Orchestrator integration
                                         │
                                         ▼
                                   Q&A 1ラウンド
                                         │
                                         ▼
                              Final review + wiki:ingest
```

**設計原則:**

- **メイン Claude セッションが orchestrator**。subagent は Researcher と specialists のみ
- **specialist は read-only** — file write 不可、AskUserQuestion 不可。副作用はすべて orchestrator 経由
- **Q&A は 1 ラウンド** — 例外時のみ単一 specialist を再ディスパッチ (escape hatch)
- **wiki は必須ではないが、あれば精度が劇的に上がる** — 不在時は縮退モードで動く

## 4. Components

### 4.1 Orchestrator (`skills/mental-model-review/SKILL.md`)

メイン Claude セッションが演じる役割。SKILL として実装し、`/wiki-review` で起動。

**責務:**

1. ベースブランチ判定 + diff 収集 (現 SKILL Phase 1 のロジック継承: `git symbolic-ref refs/remotes/origin/HEAD` → 上流追跡 → `origin/{main,master,develop}` フォールバック)
2. Researcher subagent を 1 人起動し briefing を取得
3. Persona registry resolution (plugin defaults ∪ `.wiki/personas/*.md`)
4. specialist subagents を **並列ディスパッチ** (1 メッセージ内で複数 Agent ツール呼び出し)
5. Findings/Questions 統合 (重複排除、briefing で答えられる Question を drop、優先度付け)
6. `AskUserQuestion` で Q&A 1 ラウンド
7. 回答を反映して Findings 最終化 (意図通り → 削除、バグ確定 → severity 引き上げ)
8. レビュー本文をユーザーに提示
9. Q&A を `/tmp/review-qa-<date>-<slug>.md` に書き出し、`Skill(skill="wiki:ingest", args="... --local")` を呼ぶ
10. ingest 書き出しパスをユーザーに開示して完了

**現 SKILL から継承する "Iron Laws":**

- **Q&A discipline**: 不明点はレビュー本文に書かず必ず `AskUserQuestion` で聞く
- **Ingest discipline**: Q&A が 1 件でもあれば同ターンで `wiki:ingest --local`

### 4.2 Researcher subagent (`agents/mm-researcher.md`)

**入力**: base branch, merge-base SHA, 変更ファイル一覧, diff

**ツール**: Read (`.wiki/` 配下), Grep, Bash (`git log` 等の read-only コマンドのみ)

**処理**:
1. `.wiki/_index.md`, `.wiki/wiki/_index.md` を読み構造把握
2. 変更ファイルからドメイン領域・キーワード抽出
3. `.wiki/wiki/{concepts,topics,references}/` を探索し関連記事を **実際に Read** する
4. `.wiki/raw/notes/*.md` の過去 Q&A で関連領域のものを拾う
5. `git log --oneline <merge-base>..HEAD -- <changed-files>` で当該ファイル群の最近の変更履歴
6. 出力 briefing を構築 (orchestrator に本文として返す)

**出力フォーマット:**

```markdown
# Review briefing: <branch> @ <merge-base>

## Change summary
- Files changed: ...
- Domain areas: ...
- Likely affected systems: ...

## Relevant wiki articles
- [[<article>]]: 関連度=high/medium/low、要旨=...

## Relevant past Q&A
- <date> <title>: 要約 / 今回との重なり

## Recent git activity in changed areas
- <短い時系列>

## Notes for specialists
- このファイル群は perf 視点で要注目: ...
- このファイルは ux 視点で要注目: ...
```

「Notes for specialists」は specialist の token を節約するための hint。

### 4.3 Specialist subagents (`agents/specialists/*.md`)

**Phase 1 同梱デフォルト 6 ポル:**

| ポル | ファイル | 主な視点 |
|---|---|---|
| code-quality | `code-quality.md` | 命名、凝集、抽象度、dead code、無駄な抽象化 |
| type-safety | `type-safety.md` | 型穴、any/unknown 使い、narrowing 漏れ、契約曖昧さ |
| tests | `tests.md` | 抜けてるテスト、脆いテスト、テスト容易性、mock vs integration |
| ux | `ux.md` | UX、エッジケース、a11y、微細な挙動差 |
| perf | `perf.md` | ボトルネック、無駄な再レンダ、N+1、メモリ、主スレッド阻害 |
| security | `security.md` | 入力検証、権限、秘匿情報、依存安全性 |

**共通入力契約**:
- 自分のポル定義 (Read で読む)
- briefing 全文
- diff 全文 (>100KB 時は要約 + 関心領域 hunks)

**共通出力契約** (構造化マークダウン):

```markdown
## Findings
- [severity:high|medium|low] <file>:<line> — <説明> — <根拠 (briefing/code/wiki 引用)>
  role: <自分のポル名>

## Questions
- [topic:<キーワード>] <file>:<line> — <質問本文> — <想定選択肢>
  role: <自分のポル名>
```

**制約**:
- read-only ツールのみ (Read / Grep / Bash の `git diff`/`git log` 系のみ)
- ファイル書き込み不可
- `AskUserQuestion` 不可
- 他 subagent 呼び出し不可

`role:` フィールドを必ず付与しておく → Phase 2 で persona memory 更新先を決めるキーになる。

### 4.4 Persona Registry

- Plugin 同梱パス: `<plugin>/agents/specialists/*.md`
- Project override パス: `<project>/.wiki/personas/*.md`
- 解決規則:
  - 同名 (basename 一致) → project override が plugin default を **完全置換** (ファイル全体を置き換え、内容マージはしない)
  - 別名 → **追加**
- Orchestrator はステップ 3 でこの 2 ディレクトリを merge して起動 specialist 一覧を確定
- skip 設定: `<project>/.wiki/config.md` に `disabled_personas: [security]` 等で個別 skip

### 4.5 Ingest pathway (現 SKILL 流用 + 拡張)

1. `/tmp/review-qa-<YYYY-MM-DD>-<topic-slug>.md` に Q&A を書き出し (現 SKILL テンプレ再利用)
2. **拡張**: 各 Q&A エントリに `role:` フィールドを残す (Phase 2 で persona memory 更新時に使う)
3. `Skill(skill="wiki:ingest", args="<filepath> --type notes --title \"<title>\" --local")` を呼ぶ
4. `--local` 必須 (HUB 事故防止)
5. 書き出されたパス (`.wiki/raw/notes/<date>-<slug>.md`) をユーザーに開示

**Q&A ファイルテンプレ拡張 (現 SKILL からの差分):**

```markdown
### Q1: <一行サマリ>
**Role:** perf  ← 追加
**Q:** ...
**A:** ...
```

`Derived constraints` セクションは必須継続。

## 5. Data flow (review lifecycle)

```
[T0] User: /wiki-review

[T1] Orchestrator: pre-flight
     - base branch 判定 (現 SKILL Phase 1 ロジック)
     - merge-base 計算
     - 判定 base と判定根拠を 1 行で開示
     - diff 収集
     - 差分サイズチェック (0 行 → skill 終了、5000+ 行 → 警告 + 続行確認)

[T2] Orchestrator: dispatch Researcher (1 subagent)
     - prompt: base, MB, 変更ファイル一覧, diff (>100KB は要約)
     - tools: Read (.wiki/), Grep, Bash (read-only git)
     - 返却: briefing.md (本文として)

[T3] Orchestrator: persona resolution
     - plugin defaults ∪ .wiki/personas/*.md を解決
     - disabled_personas 設定で除外
     - 起動 specialists 一覧確定

[T4] Orchestrator: dispatch specialists (N parallel)
     - 1 メッセージ内で N 個の Agent tool 呼び出し
     - 各 specialist: ポル定義 + briefing + diff (省略時は省略明示)
     - read-only tools のみ

[T5] Orchestrator: integration
     - 全 specialists の Findings/Questions 集約
     - Findings 統合: 同じ file:line に複数ポル言及 → 1 件にまとめ role タグ複数
     - 優先度付け: severity + 複数ポル重複 → 上位
     - Questions 整理:
       (a) 重複質問結合
       (b) briefing から答えが拾える質問を drop (drop 理由をログ)
       (c) 残りを最大 4 問/ターンで AskUserQuestion
     - Questions ゼロなら [T7] へ直行

[T6] Orchestrator: Q&A 1 ラウンド
     - AskUserQuestion 実行
     - 回答を Findings に再マッピング:
       * 「意図通り」→ finding 削除
       * 「バグ確定」→ severity 引き上げ
       * 想定外の回答 → 必要なら単一 specialist 再ディスパッチ (escape hatch)

[T7] Orchestrator: レビュー本文提示
     - 構造:
       ## Summary
       ## High-priority findings
       ## Medium-priority findings
       ## Nits / observations
       ## What I deliberately did NOT flag (drop した質問の要約)
     - 本文に疑問符・推測表現は残さない

[T8] Orchestrator: ingest
     - /tmp/review-qa-<date>-<slug>.md に Q&A 書き出し
     - role タグ付き
     - Skill(skill="wiki:ingest", args="... --local")
     - .wiki/raw/notes/ への書き出しパスを確認
     - ユーザーに完了報告 + パス開示
```

**不変条件:**

- specialist は file write 不可
- Q&A は orchestrator のみ
- briefing は Phase 1 では永続化しない
- diff 省略は briefing 内に明示

## 6. Error handling and boundary conditions

### 6.1 境界条件

| 状況 | 判断 |
|---|---|
| `.wiki/` 不在 or 空 | Researcher が wiki 読みスキップ、git log ベースの briefing で続行。完了時に「wiki 導入推奨」案内 |
| base branch 確定不可 | `AskUserQuestion` で確認。答えなければ skill 終了 |
| diff 0 行 | skill 終了、「差分なし」報告 |
| diff 5000+ 行 | 警告 + 続行確認。続行時は specialist 入力に「ファイル単位サマリ+重要 hunk」省略モード |
| ドキュメント/フォーマットのみ変更 | 起動前に検出、「通常レビューにしますか?」確認 |
| 既に Q&A 済みブランチでの再 /wiki-review | Researcher が `.wiki/raw/notes/` を読む際にブランチ名 slug をキーワードに含める。ヒットした過去 Q&A は briefing 内で「これは前回確認済み」とマークし、specialist が同じ点を再度質問しないよう hint を残す |

### 6.2 Subagent 失敗時の縮退

| 失敗 | 対応 |
|---|---|
| Researcher 失敗 | orchestrator が `.wiki/_index.md` だけ読んで簡略 briefing 自作 |
| Specialist 1 人失敗 | 当該ポルなしで続行、レビューに「<role> 視点はカバーされていない」と注記。Phase 1 では自動リトライしない |
| Specialist 全員失敗 | skill 中止 + ユーザーに状況報告 |
| `wiki:ingest` 失敗 | `/tmp/` ファイル絶対パス開示、手動再実行コマンド案内 |

**不変条件**: subagent 失敗で skill 全体が黙って中断することはない。orchestrator は必ず状況をユーザーに返す。

### 6.3 トークン予算 (粗い目安)

| 場面 | 予算 |
|---|---|
| Researcher input | 〜30K |
| Specialist input × 6 | 〜25K × 6 = 150K |
| Orchestrator integration | 〜20K |

**運用ルール**:
- diff > 100KB → Researcher が「ファイル別要約 + 関心領域抽出」、specialist は briefing + hunks のみ受領
- Researcher が briefing 内で「specialist には XX を省略した」と理由明示

### 6.4 観測性 (Phase 1 簡易版)

- 各 specialist のレスポンスを `/tmp/mm-review-<timestamp>/specialist-<role>.md` に保存 (integration 後)
- Researcher briefing も同ディレクトリに保存
- skill 完了時に「詳細ログ: /tmp/mm-review-<timestamp>/」を 1 行報告
- 失敗時はディレクトリを残す。掃除責務は持たない

### 6.5 中断時

- 途中中断: `/tmp/mm-review-<timestamp>/` に途中状態を残し、再開手順を案内
- Phase 1 では完全な resume は実装しない (ログ残しのみ)

## 7. Testing strategy

Skill + agents は LLM 出力が非決定的なので 3 層:

### 7.1 単体テスト (決定的ロジック)

Phase 1 では SKILL.md 内の自然言語手順が大半なので少ない。Phase 2 以降で別言語ファイルに切り出されたら通常テスト。対象候補:

- Base branch resolution
- diff サイズ閾値判定
- Persona registry resolution (defaults + override merge)
- Q&A テンプレ生成

### 7.2 ゴールデン PR セット (LLM 層レグレッション検知)

- album_app 歴代ブランチから 5〜10 個選び `(diff, 期待トピック list, 期待質問 list)` をゴールデン化
- Phase 1 立ち上げ時はゴールデン 3 件から
- 評価: `/wiki-review` を回し、Findings が期待トピックをカバーしたか + 幻覚指摘がないか を半手動チェック
- 頻度: prompt 大改修時 + 月次

### 7.3 Dogfooding チェックリスト (手動)

新ビルド利用時:

- [ ] `.wiki/` あり + ドメイン変更 PR → briefing に wiki が拾えている
- [ ] `.wiki/` なし PR → 縮退モードで完了
- [ ] 5000 行超 diff → 警告 + 省略モード
- [ ] specialist 1 人失敗 → 残り 5 人で続行、注記あり
- [ ] Q&A 1 ラウンドのみ実行 (通常パス)
- [ ] ingest 完了後 `.wiki/raw/notes/` に書き出され `_index.md` 更新
- [ ] レビュー本文に疑問符・推測表現が残っていない

### 7.4 「人間メンタルモデル度」の主観評価

毎レビュー後:

- [ ] 指摘が「自分が手レビューするなら同じ違和感」を持つか (同感率)
- [ ] briefing が「自分が PR を見る前にざっと確認する文書」に近いか (下調べ再現度)
- [ ] 質問が「自分でも確認するな」と思えるか (質問質)

3 つに ✗ がつくならポル定義 or Researcher prompt を見直す。

## 8. Plugin packaging

### 8.1 ファイル構造

```
mental-model-reviewer/
├── plugin.json
├── README.md
├── LICENSE
├── skills/
│   └── mental-model-review/
│       └── SKILL.md
├── agents/
│   ├── mm-researcher.md
│   └── specialists/
│       ├── code-quality.md
│       ├── type-safety.md
│       ├── tests.md
│       ├── ux.md
│       ├── perf.md
│       └── security.md
├── commands/
│   └── wiki-review.md
├── templates/
│   ├── briefing.md
│   ├── specialist-output.md
│   └── qa-ingest.md
└── docs/
    ├── architecture.md
    └── persona-authoring.md
```

### 8.2 plugin.json (意図ベース)

```json
{
  "name": "mental-model-reviewer",
  "version": "0.1.0",
  "description": "Multi-agent code review that mimics a project-aware human reviewer.",
  "skills": ["skills/mental-model-review"],
  "agents": ["agents/mm-researcher.md", "agents/specialists/*.md"],
  "commands": ["commands/wiki-review.md"],
  "requires": {
    "skills": ["wiki:ingest"]
  }
}
```

(正確な manifest field 名は実装時に Claude Code 仕様を確認)

### 8.3 命名

- プラグイン名: `mental-model-reviewer`
- 内部 prefix: `mm-`
- スラッシュコマンド: `/wiki-review`
- 旧 SKILL `review-with-wiki-ingest` は Phase 1 完了後に削除 (新旧並行運用期間あり)

### 8.4 拡張点

| 拡張点 | 仕組み | Phase |
|---|---|---|
| ポル追加・差し替え | `<project>/.wiki/personas/*.md` | 1 (override 読み込みのみ。memory は Phase 2) |
| skill 挙動微調整 | `<project>/.wiki/config.md` | 1 (disabled_personas のみ) |
| Researcher 差し替え | プラグイン fork | 3+ |
| Q&A テンプレ拡張 | `<project>/.wiki/templates/qa-ingest.md` | 2 |

### 8.5 配布

- GitHub 公開リポジトリ
- `gh release create` で semver タグ
- インストール: Claude Code plugin 管理機構経由 (URL 登録)
- ライセンス: MIT
- 更新時: project state (`.wiki/personas/`) を触らない

### 8.6 現 SKILL からの移行

album_app 内 dogfooding 手順:

1. plugin を `/Users/yuta/.claude/plugins/` 配下に置く (local fork)
2. 既存 `.claude/skills/review-with-wiki-ingest/` を当面残す (新旧並行、エイリアス分け)
3. 1〜2 ブランチでゴールデン評価
4. 旧 SKILL 削除
5. `.wiki/raw/notes/` 過去 Q&A は無変更で活用

## 9. Phase 2 preview: Persona Memory

### 9.1 解決する課題

Phase 1 の Researcher briefing は短期記憶。人間レビュアーが持つ「ポルごとの長期記憶」(perf で過去ハマったパターン、ux で気にしてること、security 許容範囲) を `.wiki/personas/<role>-memory.md` で持たせる。

### 9.2 ファイル構造

```
.wiki/personas/
├── perf.md            ← 静的、人が書く・編集する (Phase 1 から有効)
├── perf-memory.md     ← 動的、ingest が自動更新 (Phase 2)
├── ux.md
├── ux-memory.md
└── ...
```

`<role>-memory.md` 内容例:

```markdown
# perf reviewer memory

> Auto-curated from past review Q&A. Last updated: YYYY-MM-DD

## Project-specific patterns (learned)
- ...

## Past mistakes worth flagging again
- ...

## Items intentionally accepted
- ...
```

### 9.3 Phase 2 の追加処理

- Researcher: briefing 構築時、起動ポルの `<role>-memory.md` を読み末尾に「ポルへの長期記憶 hint」セクション追加
- specialist は briefing 経由でしか memory を見ない
- ingest: Q&A の role タグを使い、各ポル memory に追記すべき項目を判定して append

### 9.4 衝突回避

- `<role>-memory.md` は append-only 運用
- 人間編集中の上書き防止: 「末尾追記のみで途中編集はしない」契約
- `wiki:compile` 対象外 (「ソース」ではなく「実装ファイル」扱い)

### 9.5 Phase 1 で Phase 2 をブロックしないために必須の準備

- specialist の Findings/Questions に `role:` フィールド必須
- ingest 用 `/tmp/review-qa-*.md` テンプレに各 Q&A の `role:` 項目を必ず入れる
- Persona registry は「persona dir 内 `*.md` 全部読む」抽象にしておく (`-memory.md` が将来生えても対応可能)

## 10. Phase 3 sketch (out of scope for this spec)

- Standalone CLI (Anthropic SDK 直、BYOK)
- GitHub Action / App
- Web UI for non-Claude-Code users

Phase 1/2 で確立した plugin の knowledge layer (`.wiki/` 規約) と review engine (orchestrator + agent prompts) はそのまま流用できる設計を維持する。Phase 3 は別 spec で詳細化。

## 11. Open questions to revisit during implementation

- diff 5000 行・100KB の閾値は実測で調整
- specialist 失敗時の自動リトライを Phase 2 で入れるかどうか
- ゴールデン PR の LLM-as-judge 化を Phase 2 で入れるか
- 旧 SKILL `review-with-wiki-ingest` との並行運用期間の長さ
- `disabled_personas` 設定の置き場 (`.wiki/config.md` のどこか、または別ファイル)

---

**End of spec.** Implementation plan は writing-plans skill で別途作成する。
