# Mental-Model Reviewer (Phase 1 MVP) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Claude Code plugin `mental-model-reviewer` that runs `/wiki-review` to produce a multi-agent code review using a Researcher subagent + 6 parallel specialist subagents, integrating findings via Q&A and persisting learnings to `.wiki/` via the existing `wiki:ingest` skill.

**Architecture:** Main Claude = orchestrator (a SKILL). Researcher and specialist subagents are dispatched via the Agent tool (parallel where independent). Wiki provides project-specific knowledge; ingest closes the learning loop. Phase 1 ships the orchestrator + Researcher + 6 specialists + Q&A integration + ingest. Persona memory layer is deferred to Phase 2.

**Tech Stack:** Markdown-driven (SKILL.md, agent definitions, slash commands), Claude Code plugin layout (`.claude-plugin/plugin.json` + `skills/`/`agents/`/`commands/` auto-discovery), Bash/git for diff handling, `Skill(skill="wiki:ingest", ...)` for persistence. No build step.

**Source spec:** `/Users/yuta/album_app/docs/superpowers/specs/2026-05-17-mental-model-reviewer-design.md`

---

## File Structure

Development happens in a new git repo at `~/code/mental-model-reviewer/` (separate from album_app). It is symlinked into `~/.claude/plugins/local/` for dogfooding.

```
~/code/mental-model-reviewer/
├── .claude-plugin/
│   └── plugin.json              # Manifest (Claude Code auto-discovers siblings)
├── .gitignore
├── README.md
├── LICENSE                       # MIT
├── skills/
│   └── mental-model-review/
│       └── SKILL.md             # Orchestrator (the brain)
├── agents/
│   ├── mm-researcher.md         # Researcher subagent
│   └── specialists/
│       ├── code-quality.md
│       ├── type-safety.md
│       ├── tests.md
│       ├── ux.md
│       ├── perf.md
│       └── security.md
├── commands/
│   └── wiki-review.md           # /wiki-review slash command entry
├── templates/
│   ├── briefing.md              # Researcher output contract
│   ├── specialist-output.md     # Findings/Questions output contract
│   └── qa-ingest.md             # Q&A → wiki:ingest payload template
└── docs/
    ├── architecture.md          # Brief, links to album_app spec
    ├── persona-authoring.md     # How to add/override personas in a project
    └── goldens/                 # Golden PR review captures (Task 11)
        └── .gitkeep
```

**Why this split:** Each file has one responsibility. The orchestrator SKILL.md is the only place review flow logic lives. Each specialist is one file = one persona, so adding/removing/replacing one is a single-file change. Templates are extracted so they can evolve without touching agent prompts.

---

## Task 1: Scaffold plugin repo

**Files:**
- Create `~/code/mental-model-reviewer/.claude-plugin/plugin.json`
- Create `~/code/mental-model-reviewer/README.md`
- Create `~/code/mental-model-reviewer/LICENSE`
- Create `~/code/mental-model-reviewer/.gitignore`

- [ ] **Step 1: Create repo directory and init git**

```bash
mkdir -p ~/code/mental-model-reviewer/.claude-plugin
mkdir -p ~/code/mental-model-reviewer/skills/mental-model-review
mkdir -p ~/code/mental-model-reviewer/agents/specialists
mkdir -p ~/code/mental-model-reviewer/commands
mkdir -p ~/code/mental-model-reviewer/templates
mkdir -p ~/code/mental-model-reviewer/docs/goldens
touch ~/code/mental-model-reviewer/docs/goldens/.gitkeep
cd ~/code/mental-model-reviewer && git init -b main
```

Expected: `Initialized empty Git repository in /Users/yuta/code/mental-model-reviewer/.git/`

- [ ] **Step 2: Write `.claude-plugin/plugin.json`**

```json
{
  "name": "mental-model-reviewer",
  "description": "Multi-agent code review that mimics a project-aware human reviewer. Reads project .wiki/ knowledge, dispatches Researcher + specialist personas in parallel, asks clarifying questions, and ingests Q&A back into the wiki.",
  "version": "0.1.0",
  "author": {
    "name": "Yuta Adachi",
    "email": "yuta.adachi@luxiar.com"
  },
  "license": "MIT",
  "keywords": [
    "code-review",
    "multi-agent",
    "wiki",
    "claude-code-plugin"
  ]
}
```

- [ ] **Step 3: Write `README.md`**

```markdown
# mental-model-reviewer

A Claude Code plugin that performs multi-agent code reviews mimicking the mental model of a project-aware human reviewer.

## What it does

`/wiki-review` runs an orchestrator that:

1. Resolves the base branch and collects the diff.
2. Dispatches a **Researcher** subagent that reads your project's `.wiki/` knowledge base and builds a briefing.
3. Dispatches **specialist subagents** in parallel (code-quality, type-safety, tests, ux, perf, security by default), each receiving the diff + briefing.
4. Integrates their Findings/Questions, dedupes, and asks you the open questions in a single round.
5. Presents the final review.
6. Ingests Q&A back into `.wiki/raw/notes/` via the `wiki:ingest` skill for cumulative learning.

## Requirements

- Claude Code (latest)
- Optional: `wiki:ingest` skill (for the learning loop). If absent, reviews still run but Q&A persistence is skipped.

## Installation (local development)

\`\`\`bash
mkdir -p ~/.claude/plugins/local
ln -s ~/code/mental-model-reviewer ~/.claude/plugins/local/mental-model-reviewer
\`\`\`

Then restart Claude Code.

## Customization

Add or override personas per project by creating `.wiki/personas/<role>.md` inside the project root. See `docs/persona-authoring.md`.

## Phase

This is Phase 1 (MVP). Persona memory (Phase 2) and standalone CLI (Phase 3) are on the roadmap. See `docs/architecture.md`.
```

- [ ] **Step 4: Write `LICENSE` (MIT, year 2026, author "Yuta Adachi")**

Use the standard MIT license text with `Copyright (c) 2026 Yuta Adachi`.

- [ ] **Step 5: Write `.gitignore`**

```gitignore
.DS_Store
*.swp
*.swo
.idea/
.vscode/
node_modules/
```

- [ ] **Step 6: Commit**

```bash
cd ~/code/mental-model-reviewer
git add .
git commit -m "chore: scaffold plugin repo skeleton

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

Expected: clean working tree, 1 commit.

---

## Task 2: Write output templates

**Files:**
- Create `~/code/mental-model-reviewer/templates/briefing.md`
- Create `~/code/mental-model-reviewer/templates/specialist-output.md`
- Create `~/code/mental-model-reviewer/templates/qa-ingest.md`

- [ ] **Step 1: Write `templates/briefing.md`**

```markdown
<!-- Briefing template — produced by mm-researcher, consumed by specialists. -->
<!-- Replace <placeholders>. Keep section names verbatim so downstream parsers find them. -->

# Review briefing: <branch> @ <merge-base-short-sha>

## Change summary
- Files changed: <list>
- Domain areas: <inferred domain keywords>
- Likely affected systems: <subsystems / external integrations / data stores>

## Relevant wiki articles
- [[<article-slug>]]: 関連度=<high|medium|low>、要旨=<one-line>
- ... (none → write "None applicable in .wiki/.")

## Relevant past Q&A
- <YYYY-MM-DD> <title>: 要約=<one-line>。今回との重なり=<one-line>
- ... (none → write "None.")

## Recent git activity in changed areas
- <YYYY-MM-DD> <short-sha> <subject>
- ...

## Notes for specialists
- perf: <files or hunks the perf reviewer should focus on, with why>
- ux: <...>
- (omit roles with nothing notable)

## Already-resolved on this branch
<!-- Populated when .wiki/raw/notes/ has a prior Q&A whose filename slug matches this branch. -->
- Q: <past question summary> — A: <past answer summary>. Specialists must NOT re-ask.

## Omissions
<!-- Populated when diff > 100KB and parts were summarized rather than passed verbatim. -->
- <file>: passed as <summary|hunks|skipped>. Reason: <token budget|out of scope|...>
```

- [ ] **Step 2: Write `templates/specialist-output.md`**

```markdown
<!-- Specialist output contract. Each specialist returns exactly this structure. -->
<!-- The orchestrator parses by section name; do not rename headings. -->
<!-- Keep `role:` lines verbatim so Phase 2 persona memory ingest can route updates. -->

## Findings

- [severity:high] <relative/path/from/repo-root>:<line> — <one-sentence finding> — <evidence: briefing quote | code excerpt | wiki citation>
  role: <persona-name>
- [severity:medium] ...
  role: <persona-name>
- [severity:low] ...
  role: <persona-name>

## Questions

- [topic:<short-keyword>] <relative/path/from/repo-root>:<line> — <question body> — Options:
    1. <label>: <implication>
    2. <label>: <implication>
    3. <label>: <implication>
  role: <persona-name>

## Notes (optional)
- <Free-form. Use only for things that are neither findings nor questions — e.g. things you deliberately did NOT flag and want the orchestrator to know.>
```

- [ ] **Step 3: Write `templates/qa-ingest.md`**

```markdown
<!-- Q&A ingest payload. Orchestrator writes this to /tmp/review-qa-<date>-<slug>.md, -->
<!-- then calls Skill(skill="wiki:ingest", args="<path> --type notes --title \"...\" --local"). -->

# <ドメイン領域> <変更内容> - レビュー Q&A

- **Branch:** <feature/fix branch 名>
- **Base:** <base branch> (merge-base: <short-sha>)
- **Date:** <YYYY-MM-DD>
- **Main change areas:** <抽出したドメイン領域のリスト>
- **Personas active:** <perf, ux, ...>

## Q&A

### Q1: <一行サマリ>
**Role:** <persona-name>
**Q:** <質問本文。ファイル:行・該当コード片を引用>
**A:** <ユーザー回答>

### Q2: ...
**Role:** ...
**Q:** ...
**A:** ...

## Derived constraints / assumptions for future reviews

- <制約 1: 「次回似たレビューで判断材料になる前提」を抽出して 1-3 行で>
- <制約 2>

## Related

- [[review-with-wiki-ingest]]  <!-- migration link — remove after legacy SKILL retired -->
- [[mental-model-review]]
- <関連 wiki 記事へのリンクがあれば>
```

- [ ] **Step 4: Commit**

```bash
cd ~/code/mental-model-reviewer
git add templates/
git commit -m "feat(templates): briefing / specialist-output / qa-ingest contracts

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Write Researcher subagent

**Files:**
- Create `~/code/mental-model-reviewer/agents/mm-researcher.md`

- [ ] **Step 1: Write the Researcher agent definition**

```markdown
---
name: mm-researcher
description: Reads .wiki/ knowledge, past Q&A, and recent git activity for files in a diff, then produces a briefing for downstream specialist reviewers. Use when the mental-model-review orchestrator dispatches you with a diff and base.
model: sonnet
---

# mm-researcher

You are the **Researcher** for the mental-model-reviewer plugin. Your job is to read the project's accumulated knowledge and recent history so that the specialist reviewers downstream can focus on judgment instead of context-gathering.

## Inputs you will receive (in the orchestrator's prompt to you)

- `base`: the base branch the review is against (e.g. `origin/main`)
- `merge_base`: the merge-base short SHA
- `changed_files`: list of files in the diff
- `diff_excerpt`: the diff itself, possibly truncated if very large (the orchestrator tells you if it truncated)
- `branch`: the current branch name (used to look up prior Q&A)

## Tools available

You have read-only tools only:
- `Read` — for `.wiki/` files and changed source files
- `Grep` — for searching wiki and code
- `Bash` — restricted to read-only git: `git log`, `git diff`, `git show`, `git blame`

You **must not** write files or call `AskUserQuestion`.

## Process

1. Read `.wiki/_index.md` and `.wiki/wiki/_index.md` to understand the wiki layout. If `.wiki/` is absent or empty, skip wiki reading and continue with git-only briefing.
2. From `changed_files`, extract domain keywords by inspecting:
   - 2-3 directory levels up from each changed file (often the domain unit)
   - File names themselves (entity names, service names)
   - Comments and identifiers in the diff
3. Search `.wiki/wiki/{concepts,topics,references}/` for articles whose titles or first paragraphs match those keywords. **Actually `Read` the candidates** — do not judge by title alone.
4. Search `.wiki/raw/notes/*.md` for past Q&A in adjacent areas. **Include any file whose name contains the current `branch` slug** under an "Already-resolved on this branch" section — these mark questions the specialists must NOT re-ask.
5. Run `git log --oneline <merge_base>..HEAD -- <each changed file>` to capture recent activity. Keep it terse.
6. Synthesize a briefing following `templates/briefing.md` exactly. Section names must match verbatim.
7. In `## Notes for specialists`, include role-specific hints only when you have something concrete to say. Empty roles can be omitted. **Do not** invent hints to fill space.
8. If you had to omit parts of the diff or wiki for token reasons, list them under `## Omissions` with the reason.

## Output

Return the briefing as your message body. Do not write any files. The orchestrator will capture your message and pass it to specialists.

## Don'ts

- Do not draft review findings yourself — that is the specialists' job.
- Do not ask questions — that is the orchestrator's job.
- Do not include "things to check" lists that read like a review. Stick to context, not judgment.
- Do not fabricate wiki article names. Only cite articles you actually read.
```

- [ ] **Step 2: Commit**

```bash
cd ~/code/mental-model-reviewer
git add agents/mm-researcher.md
git commit -m "feat(agents): add mm-researcher subagent

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Write specialist subagents (6 personas)

All six share the same structural template. Only the **role description**, **what I care about**, **hard rules**, and **soft rules** sections differ per persona. Common sections (input contract, tools, output contract, donts) are identical.

**Files to create:**
- `~/code/mental-model-reviewer/agents/specialists/code-quality.md`
- `~/code/mental-model-reviewer/agents/specialists/type-safety.md`
- `~/code/mental-model-reviewer/agents/specialists/tests.md`
- `~/code/mental-model-reviewer/agents/specialists/ux.md`
- `~/code/mental-model-reviewer/agents/specialists/perf.md`
- `~/code/mental-model-reviewer/agents/specialists/security.md`

### Shared structure (apply to each persona, swapping the per-persona body)

```markdown
---
name: mm-specialist-<role>
description: Specialist reviewer for <role>. Use when the mental-model-review orchestrator dispatches you with diff + briefing. You return Findings + Questions; you never ask the user directly.
model: sonnet
---

# mm-specialist-<role>

You are the **<role> reviewer** for the mental-model-reviewer plugin. You read code through one specific lens and you do not stray.

## Role
<role-description>

## What I care about
<bulleted list of concerns specific to this persona>

## Hard rules (always flag)
<bulleted list>

## Soft rules (context-dependent)
<bulleted list>

## Inputs you will receive

- `diff`: the diff (possibly truncated; the orchestrator tells you if it truncated)
- `briefing`: the Researcher's briefing (markdown; section names are fixed — see `templates/briefing.md`)
- `changed_files`: list of paths
- `base`, `merge_base`, `branch`

## Tools available

You have read-only tools only:
- `Read` — to look at unchanged context around hunks, related files, `.wiki/` if helpful
- `Grep` — for searching code or wiki
- `Bash` — restricted to read-only git: `git log`, `git diff`, `git show`, `git blame`

You **must not** write files. You **must not** call `AskUserQuestion`. You **must not** dispatch other subagents.

## Output contract

Return your message body in **exactly** the structure of `templates/specialist-output.md`:

\`\`\`
## Findings
- [severity:high|medium|low] <file>:<line> — <finding> — <evidence>
  role: <role-name-of-this-file>

## Questions
- [topic:<keyword>] <file>:<line> — <question> — Options: ...
  role: <role-name-of-this-file>

## Notes (optional)
- ...
\`\`\`

`role:` must be `<role-name-of-this-file>` literally (e.g. `perf`, not `mm-specialist-perf`). The orchestrator uses this for dedup and for Phase 2 persona-memory routing.

## Don'ts

- Do not stray into other personas' lanes. If you notice a non-`<role>` issue, put it in `## Notes` not `## Findings`.
- Do not draft questions outside your role.
- Do not re-ask anything listed in the briefing's `## Already-resolved on this branch` section.
- Do not fabricate file paths or line numbers — verify with `Read` if uncertain.
- Do not write recommendations the briefing already states are out of scope (`## Omissions`).
```

### Per-persona body content

- [ ] **Step 1: Write `code-quality.md`**

Substitute these sections into the shared structure:

```markdown
## Role
このプロジェクトのコードを「読みやすさ・凝集度・抽象度の妥当性」の観点で見るレビュアー。設計判断の質を見る。

## What I care about
- 命名: 概念を正しく表しているか、慣習と整合するか
- 凝集と結合: 1 ファイル / 1 関数 / 1 モジュールの責務が明確か
- 抽象化レベル: 高すぎる抽象 (premature) も低すぎる抽象 (重複) も問題
- Dead code: 使われていないコード・到達不能な分岐
- 過剰一般化: YAGNI 違反の "future-proofing"

## Hard rules (always flag)
- 関数名 / 変数名が概念とズレている (例: `data` を返す `getUser`)
- 同じロジックが 3 箇所以上にコピーされている
- import されているが参照されていないシンボル
- 1 ファイルに無関係な責務が複数同居している

## Soft rules (context-dependent)
- ファイル長: 300 行を超えるなら分割を検討させる (ただし既存パターンと整合する場合は許容)
- 抽象化: 共通化されているが利用箇所が 2 つしかないなら "early abstraction" として指摘
- コメント: WHAT を書いているコメントは noise として観察 (WHY コメントは尊重)
```

- [ ] **Step 2: Write `type-safety.md`**

```markdown
## Role
このプロジェクトの型契約が破られていないか、型穴 (`any` / `unknown` の濫用 / unsafe cast) が混入していないかを見るレビュアー。

## What I care about
- `any` / `unknown` の使い方が正当か (外部 API 境界以外で使われていないか)
- Type assertion (`as X`) が "implicit any への目つむり" になっていないか
- Narrowing が漏れた union 型処理
- nullable / optional の取り扱い (`?.` / `??` の意図)
- 構造的型の偶発一致 (たまたま shape が同じだから通っている契約)

## Hard rules (always flag)
- 関数戻り値が `any` または推論で `any` になっている
- `as unknown as X` のような二段 cast (型システムを欺いているサイン)
- `// @ts-ignore` / `// @ts-expect-error` の根拠コメント無し
- 戻り値の取り扱いで undefined を見落としている呼び出し

## Soft rules (context-dependent)
- ジェネリクスの濫用 (型変数だらけで実質 any と等価)
- enum 同期: cross-platform enum を扱うコードベースなら、両プラットフォーム同期忘れを疑う (briefing から判断)
- type guard 関数の網羅性
```

- [ ] **Step 3: Write `tests.md`**

```markdown
## Role
このプロジェクトのテストが「壊れたら気付ける構造」を持っているかを見るレビュアー。

## What I care about
- カバレッジではなく "壊れたら fail するか" の保証
- テスト容易性: production コードの設計がテストを書きやすくしているか
- mock の使い方: 実装ではなく契約をテストしているか
- 結合テスト vs 単体テストのバランス
- 脆いテスト (実装変更で壊れる "snapshot 過信" / 時刻依存 / 順序依存)

## Hard rules (always flag)
- 新規機能・新規分岐に対応するテストが 1 件もない
- production コードが mock 前提でないと動かない (testability 不在)
- ランダム値や `Date.now()` を直接使っていて再現性がない
- mock の戻り値が "本物の契約と一致していないことに気付かない" 形

## Soft rules (context-dependent)
- 統合テスト推奨領域 (DB / migration / 外部 API) で mock が使われている → 警告
- E2E が無い領域 (UI フロー) で unit のみだと、振る舞い保証が弱い
- フィクスチャの DRY 化 (重複セットアップ多数)
```

- [ ] **Step 4: Write `ux.md`**

```markdown
## Role
ユーザー体験・微細な振る舞い・アクセシビリティを見るレビュアー。

## What I care about
- エッジケース: 空状態 / loading / error / 権限不足 / オフライン
- 入力検証とフィードバック (ユーザーが間違いに気付ける形か)
- アニメーション・触感 (haptic, transition の自然さ)
- アクセシビリティ: a11y label, contrast, hit area, keyboard / VoiceOver パス
- 状態遷移の予測可能性 (押したら何が起きるかが直感に合うか)

## Hard rules (always flag)
- ボタン・タップ領域に accessibilityLabel / accessibilityRole が無い (RN/iOS) または aria-* が無い (web)
- loading / error 状態が UI に存在しない非同期処理
- 取り消し不能な操作に確認ダイアログがない (削除・破壊操作)
- 入力フィールドにバリデーション feedback が無い

## Soft rules (context-dependent)
- アニメーションタイミングの恣意性 (briefing で「触感重視のプロジェクト」と分かったら厳しめに)
- touch ターゲット 44pt / 44dp 未満
- text dynamic-type 対応漏れ
- 言語切替時のレイアウト破綻可能性
```

- [ ] **Step 5: Write `perf.md`**

```markdown
## Role
性能ボトルネック・無駄な計算・主スレッド阻害・メモリ圧迫を見るレビュアー。

## What I care about
- 再レンダ起点: コンポーネントが過剰に再描画されていないか (React)
- worklet vs JS スレッド境界 (React Native Reanimated を使う場合は briefing から判断)
- N+1: ループ内 IO / DB / network 呼び出し
- メモリ: 大量データの一括ロード / leak の典型パターン
- 同期処理の主スレッド長居 (60fps 維持を阻害するもの)

## Hard rules (always flag)
- ループ内に await / fetch / DB クエリ
- 巨大コレクションの全件メモリ展開で済む処理 (ストリーミングできる場合)
- React: useEffect 依存配列が広すぎる / 狭すぎる (stale closure / 無限ループ)
- 画像: 原寸ロードして縮小描画

## Soft rules (context-dependent)
- メモ化: useMemo / useCallback の過剰使用 (引数比較コストの方が高いケース)
- bundle size: 巨大 dependency 追加 (10KB+ 増)
- DB index: 新規クエリパターンの index 漏れ
```

- [ ] **Step 6: Write `security.md`**

```markdown
## Role
入力検証・権限境界・秘匿情報の取扱い・依存の安全性を見るレビュアー。

## What I care about
- 入力検証 (信頼境界をまたぐデータの validation)
- 権限チェック (誰が何にアクセスできる契約)
- 秘匿情報 (API key, token, 個人情報) の扱い: ログ・送信先・保存先
- SQL/コマンド/HTML/JSON injection の典型
- 依存ライブラリの安全性 (新規追加・大幅 version up)

## Hard rules (always flag)
- ユーザー入力をエスケープせず SQL / shell / HTML に流し込んでいる
- 秘密情報が console.log / 平文保存 / 平文送信されている
- 認可なしで他ユーザーのリソースを取得 / 変更できるエンドポイント
- 新規追加された npm/pip パッケージで作者 / メンテナンス状態が不明

## Soft rules (context-dependent)
- ローカル専用アプリ (album_app のように local-first) では脅威モデルが弱いので、過剰指摘を避ける (briefing から判断)
- HTTPS の有無、Cert pinning の必要性 (モバイル決済系なら厳しめ)
- セッション管理 / トークン有効期限の妥当性
```

- [ ] **Step 7: Commit**

```bash
cd ~/code/mental-model-reviewer
git add agents/specialists/
git commit -m "feat(agents): add 6 default specialist personas

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Write orchestrator SKILL.md

**Files:**
- Create `~/code/mental-model-reviewer/skills/mental-model-review/SKILL.md`

This is the longest single deliverable. Build it in 6 commits — one per section group — so review checkpoints land naturally.

- [ ] **Step 1: Write frontmatter + Overview + When to use / NOT to use + Iron Laws**

Write to `skills/mental-model-review/SKILL.md`:

```markdown
---
name: mental-model-review
description: Multi-agent code review orchestrator. Use when the user runs /wiki-review or asks for a branch review that should leverage .wiki/ knowledge and dispatch specialist personas in parallel. Triggers on 「レビューして」「/wiki-review」「ブランチレビュー」「差分レビュー」 in a project with .wiki/ present.
---

# mental-model-review

## Overview

ベースブランチとカレントブランチの差分を、プロジェクトに対するメンタルモデルを持った人間レビュアーのように多角的にレビューするオーケストレーター skill。Researcher subagent が `.wiki/` を読んで briefing を作り、6 人のデフォルト specialist subagent が並列で Findings/Questions を返す。orchestrator がそれを統合し、不明点を 1 ラウンドの `AskUserQuestion` で解消し、最終レビューを提示し、Q&A を `wiki:ingest` に流して学習ループを閉じる。

**Core principle:** *推測でレビューに書くな。聞け。聞いたら wiki に残せ。これは現 SKILL `review-with-wiki-ingest` の Iron Laws をそのまま継承する。*

## When to use

カレントブランチを base branch と diff してレビューを求められ、かつドメイン論点を含む変更があるとき。具体的には:

- ユーザーが `/wiki-review` を実行した
- ユーザーが「レビューして」「差分レビュー」「wiki を踏まえてレビュー」等と指示した
- 変更ファイルが domain logic 領域 (models / services / business rules / UI / 外部統合) を含む

## When NOT to use

- 1 ファイル数行の機械的修正のみ (typo、フォーマッタ適用) で論点が無い差分 → 通常レビューを案内
- ユーザーが「質問せず一気にレビューだけ書いて」と明示した場合 → feedback 優先
- diff が 0 行 → skill 終了、「差分なし」報告

## The Iron Laws

### Law 1: Q&A discipline

```
不明点・疑問点・気になる点は、レビュー本文に書くのではなくユーザーに聞け。
聞かずに書いたレビューは、レビューではなく憶測である。
```

**No exceptions:**
- 「明らかにバグっぽい」→ それでも聞く。意図的かもしれない
- 「自分で wiki を読めば分かりそう」→ 読んでなお残った疑問は聞く
- 「些細だから後でまとめて」→ レビュー提出までに必ず聞く
- 「ユーザーの手間になりそう」→ 推測でズレるほうが手間

### Law 2: Ingest discipline

```
Q&A が 1 件でも発生したら、レビュー提出と同ターンで wiki に ingest せよ。
セッションを跨いだ ingest は永遠に行われない。
```

**No exceptions:**
- 件数は理由にならない。1 件でも知見は知見
- `--local` 必須。忘れると HUB 事故
- 実ファイルパスをユーザーに開示するまでが ingest
```

Commit:

```bash
cd ~/code/mental-model-reviewer
git add skills/mental-model-review/SKILL.md
git commit -m "feat(skill): SKILL.md frontmatter + overview + Iron Laws

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 2: Append Phase 1 (pre-flight) + Phase 2 (Researcher) + Phase 3 (persona resolution)**

Append to `skills/mental-model-review/SKILL.md`:

```markdown
## Workflow

### Phase 1: Pre-flight

1. **Base branch 判定** (現 SKILL `review-with-wiki-ingest` のロジックを継承):
   1. リモートのデフォルトブランチ (`git symbolic-ref refs/remotes/origin/HEAD`) を最優先
   2. 上流追跡ブランチが `origin/{main,master,develop}` のいずれかなら採用 (他 feature branch fork なら不採用)
   3. `origin/main` → `origin/master` → `origin/develop` 順でフォールバック
   4. リモートが origin 以外: `git remote` で列挙し各リモートに 1-3 を適用

   候補が曖昧なら推測せず `AskUserQuestion` で確認。判定 base と判定根拠を 1 行で開示してから次へ。

2. **Merge base 計算**: `git merge-base HEAD <base>`

3. **Diff 収集**:
   ```bash
   git diff <merge-base>...HEAD --stat
   git diff <merge-base>...HEAD
   git log --oneline <merge-base>..HEAD
   ```

4. **境界チェック**:
   - diff が 0 行 → skill 終了
   - diff が 5000 行超 → 警告 + 続行確認。続行時は specialist 入力を省略モードに切替
   - ドキュメント/フォーマットのみの変更 → 「通常レビューにしますか?」と確認

### Phase 2: Researcher dispatch

1. Researcher 用 prompt を組み立てる:
   - `base`, `merge_base`, `branch`, `changed_files`, `diff_excerpt`
   - diff が 100KB 超なら本文に「[truncated, full diff retained by orchestrator]」を含め、要約だけ渡す
2. `Agent` ツールで Researcher (`mm-researcher`) を 1 人ディスパッチ
3. 返却された briefing を変数に保持 (ファイル書き出しはしない、Phase 1 では永続化しない)
4. 同時に `/tmp/mm-review-<timestamp>/briefing.md` に observability 用ログとして保存

### Phase 3: Persona registry resolution

1. Plugin defaults を列挙: `<plugin-root>/agents/specialists/*.md`
2. Project overrides を列挙: `<repo-root>/.wiki/personas/*.md` (無ければスキップ)
3. Merge ルール:
   - 同名 (basename 一致) → project override が plugin default を **完全置換** (内容マージはしない)
   - 別名 → **追加**
4. `<repo-root>/.wiki/config.md` に `disabled_personas: [<role>, ...]` が定義されていれば除外
5. 起動 specialist 一覧を確定
```

Commit:

```bash
cd ~/code/mental-model-reviewer
git add skills/mental-model-review/SKILL.md
git commit -m "feat(skill): Phases 1-3 (pre-flight, Researcher, persona resolution)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 3: Append Phase 4 (specialist dispatch) + Phase 5 (integration)**

Append:

```markdown
### Phase 4: Specialist parallel dispatch

1. **1 メッセージ内で複数の `Agent` ツール呼び出しを並列に発行**する (これが必須)。順次ではない。
2. 各 specialist への prompt:
   - 自分のポル定義 (orchestrator が Read で読み込んでプロンプト本文に埋め込む)
   - briefing 全文
   - diff (>100KB 時は要約 + 関心領域 hunks。省略は briefing 内に明示済み)
   - `base`, `merge_base`, `branch`, `changed_files`
3. 各 specialist のレスポンスを `/tmp/mm-review-<timestamp>/specialist-<role>.md` に保存
4. 失敗した specialist があれば対応:
   - 1 人失敗 → 当該ポルなしで続行、最終レビューに注記
   - 全員失敗 → skill 中止 + 状況報告

### Phase 5: Integration

1. **Findings 統合**:
   - 全 specialists の `## Findings` を集約
   - 同じ `<file>:<line>` に複数言及がある finding は 1 件にまとめ、`role:` を複数並べる
   - severity の優先度付け: high > medium > low。同じ箇所で複数 role がコメントしているものは severity を 1 段上げる
2. **Questions 整理**:
   - 全 specialists の `## Questions` を集約
   - (a) 重複質問を結合 (file:line + topic が近いものは 1 つに)
   - (b) briefing から答えが拾える質問を drop (briefing の `## Already-resolved on this branch` セクションを再確認)
   - (c) drop 理由を `/tmp/mm-review-<timestamp>/dropped-questions.md` に記録
3. **Questions が 0 件**なら Phase 7 へ直行
```

Commit:

```bash
cd ~/code/mental-model-reviewer
git add skills/mental-model-review/SKILL.md
git commit -m "feat(skill): Phases 4-5 (parallel specialist dispatch, integration)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 4: Append Phase 6 (Q&A) + Phase 7 (presentation) + Phase 8 (ingest)**

Append:

```markdown
### Phase 6: Q&A round (1 round)

1. 残った Questions を 1 ターン最大 4 問の `AskUserQuestion` に分割して発行。連動しない複数の独立した疑問は同じ呼び出しに束ねる
2. 各 question には `label` と `description` 付きの選択肢を付ける。想定回答ごとに後続アクション (現状維持 / 追加修正 / バグ確定) を予告しておく
3. ユーザーの回答を Findings に再マッピング:
   - 「意図通り」と判明 → 該当 finding を削除
   - 「バグ確定」と判明 → severity 引き上げ + finding を更新
   - 「分からない/保留」 → finding を残しつつ "保留" タグを付ける
4. **Escape hatch (例外時のみ)**: 回答が「想定外の仕様変更」を示し、orchestrator が「このポルだけ再実行が必要」と判断した場合、該当 specialist を 1 人だけ再ディスパッチする (デフォルト挙動ではない)

### Phase 7: Review presentation

ユーザーに以下構造でレビューを提示:

\`\`\`markdown
## Summary
<1 段落>

## High-priority findings
- <file:line>: <finding> (roles: perf, ux)
- ...

## Medium-priority findings
- ...

## Nits / observations
- ...

## What I deliberately did NOT flag
- <Phase 5 で drop した質問、または「意図通り」と確定した項目の要約>
\`\`\`

**不変条件:** レビュー本文に疑問符 (「?」「不明」「推測される」「らしい」) は残さない。Q&A 後の最終形であり、未解決事項はあってはならない。

### Phase 8: Ingest

Q&A が 0 件ならスキップ。1 件以上ならスキップしない (「件数が少ない」は理由にならない)。

1. **Q&A をファイル化**: `templates/qa-ingest.md` のテンプレートに従い `/tmp/review-qa-<YYYY-MM-DD>-<topic-slug>.md` に書き出す
   - 各 Q&A エントリに `**Role:** <role>` を必ず含める (Phase 2 persona memory ingest が使う)
   - `Derived constraints / assumptions for future reviews` セクションは**必須**。1-3 行で抽出する
2. **`wiki:ingest` skill を呼ぶ**:
   ```
   Skill(
     skill="wiki:ingest",
     args="<absolute-path-to-qa-file> --type notes --title \"<title>\" --local"
   )
   ```
   - `--local` 必須 (HUB 事故防止)
3. **完了報告**: `wiki:ingest` が書き出したパス (`.wiki/raw/notes/<date>-<slug>.md`) と observability ログディレクトリ (`/tmp/mm-review-<timestamp>/`) をユーザーに開示
4. **Fallback**: `wiki:ingest` が失敗した場合は `/tmp/` の Q&A ファイル絶対パスを開示し、`/wiki:ingest <filepath> --type notes --title "..." --local` を手動実行するよう案内 (現 SKILL と同じ fallback)
```

Commit:

```bash
cd ~/code/mental-model-reviewer
git add skills/mental-model-review/SKILL.md
git commit -m "feat(skill): Phases 6-8 (Q&A, presentation, ingest)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 5: Append Error handling + Token budget + Observability**

Append:

```markdown
## Error handling and boundary conditions

| 状況 | 判断 |
|---|---|
| `.wiki/` 不在 or 空 | Researcher が wiki 読みスキップ。git log ベースの briefing で続行。完了時に「wiki があれば精度向上する」案内 |
| base branch 確定不可 | `AskUserQuestion` で確認。答えなければ skill 終了 |
| diff 0 行 | skill 終了。「差分なし」報告 |
| diff 5000+ 行 | 警告 + 続行確認。specialist 入力に「ファイル単位サマリ + 重要 hunk」省略モード |
| ドキュメント/フォーマットのみ | 「通常レビューにしますか?」確認 |
| 既に Q&A 済みブランチでの再 /wiki-review | Researcher が `.wiki/raw/notes/` を読む際にブランチ名 slug をキーワードに含め、ヒットした過去 Q&A は briefing の `## Already-resolved on this branch` に記載。specialist は再質問禁止 |
| Researcher 失敗 | orchestrator が `.wiki/_index.md` だけ読んで簡略 briefing 自作 |
| Specialist 1 人失敗 | 当該ポルなしで続行、レビュー本文に「<role> 視点は失敗のためカバーされていない」と注記 |
| Specialist 全員失敗 | skill 中止 + ユーザーに状況報告 |
| `wiki:ingest` 失敗 | `/tmp/` の Q&A ファイル絶対パス開示、手動再実行案内 |

**不変条件**: subagent 失敗で skill 全体が黙って中断することはない。orchestrator は必ず状況を要約してユーザーに返す。

## Token budget (粗い目安)

| 場面 | 予算 |
|---|---|
| Researcher input (diff 含む) | 〜30K |
| Specialist input (briefing + diff) × 6 | 〜25K × 6 = 150K |
| Orchestrator integration | 〜20K |

**運用ルール:**
- diff > 100KB → Researcher が「ファイル別要約 + 関心領域抽出」を briefing に入れる。specialist には diff フル送らず briefing + hunks ベース
- specialist 入力で「自分の視点に関係ないファイルは渡さない」フィルタを Researcher が briefing 内 hint で示す
- 省略はすべて briefing の `## Omissions` に明示

## Observability

- 各 specialist のレスポンス → `/tmp/mm-review-<timestamp>/specialist-<role>.md`
- Researcher briefing → `/tmp/mm-review-<timestamp>/briefing.md`
- Drop された質問 → `/tmp/mm-review-<timestamp>/dropped-questions.md`
- skill 完了時にユーザーに「詳細ログ: /tmp/mm-review-<timestamp>/」を 1 行報告
- 失敗時はディレクトリを残す。掃除責務は持たない (24h で消えても OK 設計)
```

Commit:

```bash
cd ~/code/mental-model-reviewer
git add skills/mental-model-review/SKILL.md
git commit -m "feat(skill): error handling, token budget, observability

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 6: Append Completion Checklist + Red Flags**

Append:

```markdown
## Completion Checklist

skill 終了時、以下が全て満たされているか確認:

- [ ] base branch を `git merge-base` で判定し、差分を全部読んだ
- [ ] Researcher が briefing を返した (失敗時は簡略 briefing で代替)
- [ ] specialist を並列ディスパッチした (Phase 4 の 1 メッセージ複数 Agent 呼び出し)
- [ ] 全 specialist の Findings/Questions を統合した
- [ ] 不明点・疑問点を 1 件残らず `AskUserQuestion` で確認した
- [ ] レビュー本文には推測・疑問・「?」が残っていない
- [ ] Q&A が 1 件以上あったなら、`Skill(skill="wiki:ingest", ...)` で wiki に取り込み、`.wiki/raw/notes/` への書き出し完了を確認した (`--local` 必須)
- [ ] ユーザーに「レビュー完了」「ingest 完了 (書き出しパス: ...)」「observability ログ: /tmp/mm-review-<timestamp>/」を報告した

## Red Flags

頭に浮かんだら STOP し、対応 Phase に戻る。

### Phase 6 (Q&A) に戻るべき思考
- 「とりあえずレビュー書いてから後で聞こう」
- 「これは明らかだから聞かなくていい」
- 「ユーザーを煩わせたくないから推測で書く」
- 「質問が多すぎるので主要な物だけ」

### Phase 8 (Ingest) に戻るべき思考
- 「Q&A が 1 件しかないので ingest 省略」
- 「`--local` 付けなくても多分大丈夫」
- 「ingest 走ったので報告省略」
- 「`/tmp` の Q&A ファイルを ingest 確認前に消す」

### Phase 4 (並列) に戻るべき思考
- 「specialist を 1 人ずつ順次呼び出す」 → 並列必須。1 メッセージで複数 Agent 呼び出し
- 「specialist に file write させる」 → 不可。副作用は orchestrator のみ
- 「specialist に AskUserQuestion 呼ばせる」 → 不可。Q&A は orchestrator のみ
```

Commit:

```bash
cd ~/code/mental-model-reviewer
git add skills/mental-model-review/SKILL.md
git commit -m "feat(skill): completion checklist + red flags

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Write /wiki-review slash command

**Files:**
- Create `~/code/mental-model-reviewer/commands/wiki-review.md`

- [ ] **Step 1: Write command spec**

```markdown
---
description: Run mental-model-reviewer on the current branch against its base. Dispatches Researcher + parallel specialists, asks clarifying questions, and ingests Q&A back into .wiki/.
---

You are about to run the `mental-model-review` skill.

Invoke the skill via the Skill tool:

```
Skill(skill="mental-model-review")
```

The skill is fully self-contained — it will:
1. Resolve the base branch and collect the diff.
2. Dispatch the Researcher subagent.
3. Dispatch specialist subagents in parallel.
4. Integrate findings and ask you clarifying questions in one round.
5. Present the final review.
6. Ingest Q&A via `wiki:ingest`.

If the user supplied arguments after `/wiki-review`, treat them as base-branch overrides (e.g., `/wiki-review main` means force base = `origin/main`) and pass them in your invocation context.
```

- [ ] **Step 2: Commit**

```bash
cd ~/code/mental-model-reviewer
git add commands/wiki-review.md
git commit -m "feat(commands): add /wiki-review slash command

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Write docs

**Files:**
- Create `~/code/mental-model-reviewer/docs/architecture.md`
- Create `~/code/mental-model-reviewer/docs/persona-authoring.md`

- [ ] **Step 1: Write `docs/architecture.md`**

```markdown
# Architecture

This plugin is Phase 1 of a larger design captured in the album_app spec:
`docs/superpowers/specs/2026-05-17-mental-model-reviewer-design.md` (in the consuming project's repo).

## Phase 1 (this version)

```
User ── /wiki-review ──▶ Main Claude (orchestrator, SKILL)
                          │
                          ├─▶ mm-researcher (1 subagent)
                          │     produces briefing
                          │
                          ├─▶ mm-specialist-{code-quality, type-safety,
                          │     tests, ux, perf, security}
                          │     (parallel, return Findings+Questions)
                          │
                          ├─▶ AskUserQuestion (1 round)
                          │
                          └─▶ wiki:ingest --local
```

Read `skills/mental-model-review/SKILL.md` for the canonical phase-by-phase workflow.

## Phase 2 (roadmap, not yet shipped)

Persona memory layer: `.wiki/personas/<role>-memory.md` auto-updated from Q&A on ingest. See album_app spec §9.

## Phase 3 (roadmap)

Standalone CLI (BYOK Anthropic SDK), GitHub Action / App, Web UI. See album_app spec §10.
```

- [ ] **Step 2: Write `docs/persona-authoring.md`**

```markdown
# Adding or overriding personas per project

The plugin ships with 6 default personas in `agents/specialists/`. Each project can override or extend them by creating files under `<repo-root>/.wiki/personas/`.

## Override an existing persona

Create `.wiki/personas/<role>.md` in your project with the **same basename** as the plugin default. The orchestrator will **completely replace** the plugin's version with yours (no content merge).

Example: to make this project's `perf` reviewer extra strict about Reanimated worklets, write `.wiki/personas/perf.md` with your stricter version of the same structure (frontmatter + Role + What I care about + Hard rules + Soft rules + the unchanged Inputs/Tools/Output/Donts boilerplate).

## Add a new persona

Create `.wiki/personas/<new-role>.md` with a unique basename. The orchestrator will dispatch it as an additional specialist on every `/wiki-review`.

The file structure is identical to the plugin defaults. Copy `agents/specialists/code-quality.md` as a starting point and edit the Role / What I care about / Hard rules / Soft rules sections.

## Disable a default persona

Add to `<repo-root>/.wiki/config.md`:

\`\`\`yaml
disabled_personas:
  - security
\`\`\`

Disabled personas are not dispatched.

## What about Phase 2 persona memory?

Phase 2 will add `.wiki/personas/<role>-memory.md` files that the plugin auto-updates from Q&A. **Do not** create these manually yet; they are reserved for the auto-update path.
```

- [ ] **Step 3: Commit**

```bash
cd ~/code/mental-model-reviewer
git add docs/architecture.md docs/persona-authoring.md
git commit -m "docs: architecture + persona authoring guide

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Local install and smoke test (zero-diff)

The plugin must be discoverable by Claude Code before we can test it.

- [ ] **Step 1: Symlink into Claude Code's plugin location**

```bash
mkdir -p ~/.claude/plugins/local
ln -snf ~/code/mental-model-reviewer ~/.claude/plugins/local/mental-model-reviewer
ls -la ~/.claude/plugins/local/
```

Expected: `mental-model-reviewer -> /Users/yuta/code/mental-model-reviewer`

- [ ] **Step 2: Verify Claude Code can see the plugin**

Restart Claude Code (kill and relaunch the session), then in a new Claude Code session inside `~/album_app`, ask:

> List the skills available from the mental-model-reviewer plugin.

Expected response: `mental-model-review` skill is listed. `mm-researcher` and `mm-specialist-*` agents are discoverable.

If not listed: check that `.claude-plugin/plugin.json` is valid JSON (`jq . ~/code/mental-model-reviewer/.claude-plugin/plugin.json`), and that the directory layout matches the conventions (skills under `skills/<name>/SKILL.md`, agents under `agents/`).

- [ ] **Step 3: Zero-diff smoke test**

In album_app on `main` (no diff vs `origin/main`), run:

```
/wiki-review
```

Expected:
- Phase 1 detects diff = 0 lines
- Skill terminates cleanly with "差分なし" message
- No subagents dispatched, no `wiki:ingest` called

If this fails, fix the Phase 1 boundary check before continuing.

- [ ] **Step 4: Document smoke test result**

Append outcome to `~/code/mental-model-reviewer/docs/dogfooding-log.md` (create if absent):

```markdown
# Dogfooding log

## 2026-05-17 — Task 8: zero-diff smoke test
- Branch: main (no diff)
- Result: PASS — skill terminated at Phase 1 boundary check
- Notes: <any quirks>
```

Commit:

```bash
cd ~/code/mental-model-reviewer
git add docs/dogfooding-log.md
git commit -m "test(dogfood): zero-diff smoke test passes

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Dogfooding test on a real album_app branch

Run the plugin on a known historical branch and compare its output against the existing review notes for that branch.

- [ ] **Step 1: Check out the historical branch**

```bash
cd ~/album_app
git checkout feat/album-spread-polish
```

Expected: clean checkout. (If conflicts due to uncommitted state, stash first.)

- [ ] **Step 2: Run /wiki-review**

In Claude Code inside album_app, run:

```
/wiki-review
```

Let it complete the full flow: base resolution → Researcher → 6 specialists in parallel → integration → Q&A round → presentation → ingest.

Observe carefully:
- Does Researcher's briefing cite the existing wiki articles (`album-spread-conventions`, `page-turner-back-face`, etc.)?
- Do specialists return Findings + Questions in the contracted format?
- Does orchestrator dispatch them **in parallel** (multiple Agent tool calls in one message)? Verify in transcript.
- Does AskUserQuestion fire with ≤4 questions per round?
- Does `wiki:ingest --local` succeed and write to `.wiki/raw/notes/`?

- [ ] **Step 3: Compare findings against existing note**

Existing note: `~/album_app/.wiki/raw/notes/2026-05-16-album-spread-polish-review-qa.md`.

Diff topics covered by the new run vs the old note. Note:
- Same topics covered (good)
- New topics surfaced (good if real, hallucination if not)
- Topics missed that the old note had (bad — investigate why Researcher / specialists missed them)

- [ ] **Step 4: Document result**

Append to `~/code/mental-model-reviewer/docs/dogfooding-log.md`:

```markdown
## 2026-05-17 — Task 9: feat/album-spread-polish dogfood
- Topics covered (new run): <list>
- Topics covered (existing 2026-05-16 note): <list>
- Match: <count> / <total>
- Hallucinated findings: <list>
- Missed findings: <list>
- Action items: <what to fix in personas / briefing prompt>
```

Commit:

```bash
cd ~/code/mental-model-reviewer
git add docs/dogfooding-log.md
git commit -m "test(dogfood): feat/album-spread-polish comparison logged

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

If significant gaps surface, iterate on persona definitions or Researcher prompt before continuing to Task 10.

---

## Task 10: Golden PR baselines (3 branches)

Capture review outputs for 3 historical branches so future changes to personas / orchestrator can be compared against a known good state.

- [ ] **Step 1: Identify 3 candidate branches**

```bash
cd ~/album_app
git log --oneline --all | head -30
```

Select 3 branches/commits that represent different domains. Candidates (existing in album_app):
- `feat/album-spread-polish` (UX, animation, gesture) — already done in Task 9
- `feat/album-spread-improvements` (broader scope)
- A third one — pick based on what's available

Record selections.

- [ ] **Step 2: For each branch, capture the review output**

For each branch:

```bash
cd ~/album_app
git checkout <branch>
```

Run `/wiki-review` in Claude Code. Save the **final review presentation** to `~/code/mental-model-reviewer/docs/goldens/<YYYY-MM-DD>-<branch-slug>.md`. Include:
- Branch name + merge-base SHA
- Date of capture
- Full review body (Summary / High / Medium / Nits / "Did NOT flag")
- The Q&A that was asked + answered
- Path to the resulting `wiki:ingest` output

- [ ] **Step 3: Annotate each golden with expected topics**

For each golden file, append a section:

```markdown
## Expected topics (for regression comparison)
- <topic 1>: severity expected, role expected
- <topic 2>: ...
```

This is the "ground truth" against which future runs are compared. It's allowed to evolve, but only deliberately.

- [ ] **Step 4: Commit goldens**

```bash
cd ~/code/mental-model-reviewer
git add docs/goldens/
git commit -m "test(goldens): initial 3-branch baseline

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: Deprecate old SKILL in album_app

Mark the existing `review-with-wiki-ingest` SKILL as deprecated so future sessions prefer `/wiki-review`. Keep it in place during a coexistence period.

**Files:**
- Modify `~/album_app/.claude/skills/review-with-wiki-ingest/SKILL.md`

- [ ] **Step 1: Add deprecation notice at top of legacy SKILL**

Append after the existing frontmatter (right before `# review-with-wiki-ingest`):

```markdown
> **⚠️ Deprecated (2026-05-17):** This SKILL is superseded by the `mental-model-reviewer` plugin (`/wiki-review`). It is kept here during the coexistence period (target removal: when 5 successful `/wiki-review` runs have produced equivalent or better reviews on this project). Until then, both work; prefer `/wiki-review` for new reviews.
```

- [ ] **Step 2: Commit (in album_app, not the plugin repo)**

```bash
cd ~/album_app
git add .claude/skills/review-with-wiki-ingest/SKILL.md
git commit -m "chore(skill): mark review-with-wiki-ingest as deprecated

Superseded by mental-model-reviewer plugin (/wiki-review). Kept during
coexistence period; will be removed after 5 successful /wiki-review runs
verify parity.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 12: Self-publish prep (no upload yet)

Prepare the plugin repo for eventual GitHub publication. This task does NOT push to GitHub.

- [ ] **Step 1: Verify all top-level files exist**

```bash
ls ~/code/mental-model-reviewer/
ls ~/code/mental-model-reviewer/.claude-plugin/
```

Expected files: `.claude-plugin/plugin.json`, `README.md`, `LICENSE`, `.gitignore`, `skills/`, `agents/`, `commands/`, `templates/`, `docs/`.

- [ ] **Step 2: Validate manifest**

```bash
jq . ~/code/mental-model-reviewer/.claude-plugin/plugin.json
```

Expected: parses cleanly, no errors.

- [ ] **Step 3: Confirm all SKILL.md / agent files have valid frontmatter**

```bash
find ~/code/mental-model-reviewer -name "SKILL.md" -o -path "*/agents/*.md" | while read f; do
  head -1 "$f" | grep -q "^---" && echo "OK: $f" || echo "MISSING FRONTMATTER: $f"
done
```

Expected: every file shows `OK:`.

- [ ] **Step 4: Tag v0.1.0**

```bash
cd ~/code/mental-model-reviewer
git tag -a v0.1.0 -m "v0.1.0: Phase 1 MVP

- Orchestrator skill /wiki-review
- Researcher subagent
- 6 default specialist personas (code-quality, type-safety, tests, ux, perf, security)
- Q&A integration with single-round AskUserQuestion
- wiki:ingest --local for learning loop
- Project persona overrides via .wiki/personas/

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
git tag -l
```

Expected: `v0.1.0` listed.

Publishing to GitHub (`gh repo create` + `git push`) is out of scope for this MVP plan. Confirm with user before that step.

---

## Self-review checklist (run after writing the plan, fix inline)

- [x] **Spec §1 (Purpose)**: covered by README + architecture.md + SKILL Overview
- [x] **Spec §2 (Phasing)**: Phase 1 = entirety of this plan, Phase 2/3 referenced in architecture.md
- [x] **Spec §3 (Architecture overview)**: covered by SKILL.md Phases 1-8 + architecture.md
- [x] **Spec §4 (Components)**:
  - 4.1 Orchestrator → Task 5
  - 4.2 Researcher → Task 3
  - 4.3 Specialists → Task 4 (all 6)
  - 4.4 Persona Registry → SKILL Phase 3 (Task 5 Step 2) + persona-authoring.md (Task 7)
  - 4.5 Ingest pathway → SKILL Phase 8 (Task 5 Step 4) + qa-ingest.md template (Task 2)
- [x] **Spec §5 (Data flow)**: SKILL.md Phases 1-8 (Task 5)
- [x] **Spec §6 (Error handling)**: SKILL.md Error handling section (Task 5 Step 5)
- [x] **Spec §7 (Testing)**:
  - 7.1 Unit tests → not applicable in Phase 1 (markdown only), noted in spec
  - 7.2 Golden PR → Task 10
  - 7.3 Dogfooding checklist → Task 8 + Task 9
  - 7.4 Subjective evaluation → captured in dogfooding-log.md
- [x] **Spec §8 (Plugin packaging)**: Task 1 + Task 12
- [x] **Spec §9 (Phase 2 preview)**: architecture.md notes + persona-authoring.md "What about Phase 2" section + `role:` field already wired in templates/qa-ingest.md (Task 2) and specialist-output.md (Task 2)
- [x] **Spec §10 (Phase 3 sketch)**: architecture.md roadmap section
- [x] **Spec §11 (Open questions)**: not material for this plan; revisit during execution

- [x] **No placeholders**: every step shows the exact content to write
- [x] **Type / name consistency**:
  - skill name `mental-model-review` consistent throughout
  - subagent names `mm-researcher`, `mm-specialist-<role>` consistent
  - slash command `/wiki-review` consistent
  - `role:` field referenced in templates AND specialist agents AND ingest section
  - persona override path `.wiki/personas/<role>.md` consistent
- [x] **Phase 2 readiness**: `role:` field threaded through templates and specialist output (spec §9.5 requirement)
