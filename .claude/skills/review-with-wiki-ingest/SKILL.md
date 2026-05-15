---
name: review-with-wiki-ingest
description: Use when reviewing the current branch against its base branch and the repository has a .wiki/ directory — runs a wiki-aware code review that REQUIRES interactive Q&A with the user for every uncertainty and feeds the resulting Q&A back into the wiki via /wiki:ingest. Triggers on 「レビューして」「ブランチレビュー」「差分レビュー」「wikiを踏まえてレビュー」 when working on a feature/fix branch.
---

# review-with-wiki-ingest

## Overview

ベースブランチとカレントブランチの差分をレビューする際、`./.wiki/` 配下の関連ドキュメントを先に読み込んで文脈を揃え、不明点はレビュー側で勝手に判断せず必ずユーザーに質問し、得られたQ&Aを `/wiki:ingest` で wiki に取り込むまでが1セットの作業。

**Core principle:** *不明点は推測でレビューに書くな。必ずユーザーに聞き、得た回答は wiki に残せ。*

レビューの精度は文脈量に比例する。wiki の既存知識を読まずに書いた指摘は誤読に基づきがちで、ユーザーに確認しない指摘は「気になる点リスト」止まりで知識が累積しない。このskillは「文脈収集 → 対話 → 知識化」の3点を機械的に強制する。

## When to use

- カレントブランチを base branch とdiffしてレビューを求められたとき
- `./.wiki/` が存在し、変更領域に関連するドキュメントが存在し得るとき
- 単発のコード品質チェックではなく、ドメイン文脈込みのレビューが必要なとき

## When NOT to use

- `./.wiki/` が存在しない、または空のリポジトリ（通常のコードレビューを行う）
- 1ファイル数行の機械的修正のみ（typo、フォーマッタ適用など）でドメイン論点が無い差分
- ユーザーが「質問せず一気にレビューだけ書いて」と明示した場合（feedbackが優先）

## The Iron Law

```
不明点・疑問点・気になる点は、レビューに書くのではなくユーザーに聞け。
聞かずに書いたレビューは、レビューではなく憶測である。
```

**No exceptions:**
- 「明らかにバグっぽい」→ それでも聞く。意図的な選択かもしれない
- 「自分で wiki を読めば分かりそう」→ wiki を読んでもなお残った疑問はすべて聞く
- 「些細だから後でまとめて」→ 後でまとめる前に必ず聞く。レビューを提出するまでに聞く
- 「ユーザーの手間になりそう」→ 推測でレビューを書く方が手戻りでよほど手間

このルールに違反したレビューは、レビューとして提出してはならない。Q&Aを完了させてから提出する。

## Workflow

### Phase 1: Diff 収集とベース判定

1. base branch を `git merge-base` ベースで自動判定する：
   ```bash
   # 上流追跡があればそれを優先
   git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null
   # 無ければ origin/main をベース候補にする
   git merge-base HEAD origin/main
   ```
   候補が複数あったり判定が曖昧なときは、ユーザーに聞く。
2. diff を取得：
   ```bash
   git diff <merge-base>...HEAD --stat
   git diff <merge-base>...HEAD
   git log --oneline <merge-base>..HEAD
   ```
3. 変更ファイル一覧から「ドメイン領域」を抽出する（例: `app/models/orders/`, `app/forms/lc_*`, `app/lib/integrations/kintone/` などコード上の領域や、CLAUDE.md の用語対応表上のドメイン用語）。

### Phase 2: Wiki の関連箇所を読む

1. `./.wiki/_index.md` を読んで wiki 全体構造を把握。
2. Phase 1 で抽出したドメイン領域・キーワードに対応するページを `./.wiki/wiki/` 配下から検索（topics / concepts / references / theses）。
3. 関連しそうなページを **実際に Read で読む**。`grep`/タイトルだけで関連性を判断しない。
4. 該当無しなら「該当無し」をレビューメモに明記。後で Q&A の根拠になる。

**Skip しない条件:** wiki ディレクトリが空に見えても、`raw/`, `inventory/`, `output/` 内に過去の調査メモがあることが多い。`./.wiki/` 配下を一度ざっと眺めること。

### Phase 3: レビュー草案 + 質問リストの分離

差分を読みながら以下の2バケットに振り分ける：

| バケット | 中身 | 出力先 |
|----|----|----|
| **指摘**（Findings） | 明確に間違い／改善余地と言える、根拠を提示できる事項 | レビュー本文 |
| **質問**（Questions） | 意図・前提・制約が不明で、推測なしには断定できない事項 | ユーザーへの質問 |

**判断基準:** 「もし意図を聞かずにこれをレビューに書いたら、実は意図通りで的外れになる確率はゼロか?」がNoなら質問バケットへ。

### Phase 4: 対話による不明点解消（**必須・スキップ禁止**）

質問バケットが空なら Phase 5 へ。1件でもあれば必ず実施。

- **AskUserQuestion ツール**で質問する。1ターンで複数 question にまとめてよい（最大4）。それを超えるなら複数ターンに分ける。
- 質問は具体的に（ファイル・行・該当コード片を引用）。「なぜこうしたのか?」より「Aではなく Bにした理由は X か Y か?」のように選択肢を提示すると速い。
- 回答後に新たな疑問が湧いたら追加質問する。**「最初の質問セットで打ち切る」のは禁止。**
- 全Q&Aを `Q: ... / A: ...` 形式で記録（後の ingest 用）。

### Phase 5: レビュー提出

- Phase 3 の Findings に、Phase 4 で確定した事実を反映してレビューを完成させる。
- Phase 4 で「意図通り」と判明した項目は **Findings から削除**する（指摘として残さない）。
- レビュー本文に質問内容を残さない（質問はもう解消済みのため）。

### Phase 6: Q&A の wiki ingest（**Q&Aが1件以上なら必ず実施**）

Q&Aがゼロ件のとき以外、必ず以下を実施する。「ユーザーが急いでいる」「Q&Aが些細」などは ingest をスキップする理由にならない。

> **重要:** `/wiki:ingest` は plugin slash command で、`Skill` ツールからは呼べない（available skills リストに無いため）。`Bash` で `claude` CLI を起動するのも別セッションになり不可。**正しい方法は「slash command の定義ファイル `commands/ingest.md` を Read し、その指示プロンプトを assistant 自身が実行する」こと。** slash command の正体は assistant 用プロンプトファイルなので、これで slash command 実行と同等の結果になる。

1. **Q&A をファイル化:** Q&A をマークダウンにまとめて `/tmp/review-qa-<YYYY-MM-DD>-<topic-slug>.md` に書き出す。タイトル例: `営業所専用ページ Oracle スキーマ更新 - レビュー Q&A`。本文には以下を含める：
   - レビュー対象のブランチ名・ベース・主要な変更領域
   - Q&A 本文（質問と回答を対にする）
   - 回答から導かれた「今後のレビューで使える前提・制約」のまとめ
   - 末尾に `[[review-with-wiki-ingest]]` 等の関連 skill へのリンク

2. **ingest コマンド定義を読み込む:** 以下の Glob で wiki ingest コマンド定義を探し、Read する。
   ```
   Glob: ~/.claude/plugins/marketplaces/*/commands/ingest.md
   ```
   - 通常 `marketplaces/llm-wiki/claude-plugin/commands/ingest.md` がヒット。
   - 複数ヒットしたら最新版（`cache/llm-wiki/<version>/` で version が最大のもの）か marketplaces 版を選ぶ。両者は同期している前提。

3. **指示プロンプトを自分で実行する:** Read した `ingest.md` の本文（"Your task" 以降）は assistant 用プロンプトそのもの。次の引数を `$ARGUMENTS` として実行する。
   ```
   $ARGUMENTS = "<Q&Aファイルの絶対パス> --type notes --title \"<タイトル>\" --local"
   ```
   `--local` は **必須**（プロジェクトの `.wiki/` を対象にする。これを忘れると HUB に入る事故）。`ingest.md` の手順に従い、`references/ingestion.md` および `references/wiki-structure.md` も必要に応じて Read して、最終的に `.wiki/raw/notes/<date>-<slug>.md` への書き出し・`.wiki/log.md` への追記・`.wiki/_index.md` の Sources/Recent Changes 更新まで自分で実行する。

4. **完了報告:** 書き出されたファイルパス（例: `.wiki/raw/notes/2026-05-15-...-review-qa.md`）をユーザーに報告。「wiki に取り込みました」だけでなく実ファイルパスを示す。

**Fallback:** `commands/ingest.md` が見つからない・指示プロンプトの遂行で詰まる等の場合のみ、ユーザーに `/wiki:ingest <filepath> --type notes --title "..." --local` を手で実行してもらう旨を案内する（最後の手段）。

## Quick Reference

| やること | コマンド／ツール |
|---|---|
| ベース判定 | `git merge-base HEAD origin/main` |
| 差分取得 | `git diff <base>...HEAD` |
| wiki 構造把握 | `Read .wiki/_index.md`, `Read .wiki/wiki/_index.md` |
| 関連 wiki 検索 | `Glob`, `Grep` on `./.wiki/` |
| 質問 | `AskUserQuestion` ツール（最大4問/ターン、複数ターン可） |
| 知識化 | `Read ~/.claude/plugins/.../commands/ingest.md` → 指示プロンプトを `$ARGUMENTS = "<filepath> --type notes --title \"...\" --local"` で自分で実行 |

## Red Flags — STOP し Phase 4 に戻る

- 「とりあえずレビュー書いてから後で聞こう」
- 「これは明らかだから聞かなくていい」
- 「ユーザーを煩わせたくないから推測で書く」
- 「質問が多すぎるので主要な物だけ聞く」
- 「Q&Aが少ないので ingest は省略」
- 「wiki を読まずにコードだけ見れば足りる」

これらが頭に浮かんだ時点で Phase 2 または Phase 4 に戻る。skill の目的は推測レビューを構造的に排除することにある。

## Rationalization Table

| 言い訳 | 実態 |
|---|---|
| 「自明なバグだから聞くまでもない」 | 意図的な選択 or 既知の制約のことが多い。聞く方が速い |
| 「wiki に該当が無さそう」 | 実際に Read で見たか? 見ていないならスキップしてはいけない |
| 「Q&Aが1件しかないから ingest 不要」 | 1件でも要件は ingest 必須。例外なし |
| 「ユーザーが急いでいる」 | 推測でズレたレビュー → 出戻りの方が遅い |
| 「もう似た内容が wiki にある」 | 似ていても新ブランチ固有の判断は別の知見。差分を残す |
| 「対話で長くなりそう」 | AskUserQuestion で 1ターンに 4 質問まで束ねられる。並列化せよ |

## Common Mistakes

- **wiki を Glob しただけで読まずに判断する** → 必ず Read する
- **質問せずに「？」付きで本文に書く** → レビュー本文に疑問符は残さない。質問は AskUserQuestion 経由
- **Q&A の ingest を「後でやる」** → セッションが切れたら永久に失われる。レビュー提出と同ターンで ingest
- **Q&A 要約を機械翻訳的に書く** → 「次回レビューで使える前提・制約」を抽出して書くこと。生Q&Aだけだと検索しても再利用しにくい
- **`/wiki:ingest` に `--local` を付け忘れる** → プロジェクトの `.wiki/` ではなく HUB に入る事故になる
- **`/wiki:ingest` を `Skill` ツールで呼ぼうとする** → slash command は Skill ツール対象外。`commands/ingest.md` を Read して指示プロンプトを自分で実行する（Phase 6 参照）
- **ingest をユーザーに丸投げする** → Fallback。基本は自分で実行。ユーザーに依頼するのは詰まったときだけ

## Completion Checklist

skill 終了時、以下が全て満たされているか確認：

- [ ] base branch を `git merge-base` で判定し、差分を全部読んだ
- [ ] `./.wiki/` の関連ページを実際に Read で読んだ（または該当無しを確認した）
- [ ] 不明点・疑問点・気になる点を **1件残らず** AskUserQuestion でユーザーに確認した
- [ ] レビュー本文には推測・疑問は残っていない
- [ ] Q&Aが1件以上あったなら、`commands/ingest.md` を Read → 指示プロンプトを自分で実行 → `.wiki/raw/notes/` への書き出し完了を確認した（`--local` 必須）
- [ ] ユーザーに「レビュー完了」「wiki ingest 完了（書き出しパス: ...）」を報告した
