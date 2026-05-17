---
name: review-with-wiki-ingest
description: Use when reviewing the current branch against its base branch in a repository that has a .wiki/ directory and the change touches domain logic (not just typos/formatting). Triggers on 「レビューして」「ブランチレビュー」「差分レビュー」「wikiを踏まえてレビュー」 on a feature/fix branch.
---

> **⚠️ Deprecated (2026-05-17):** This SKILL is superseded by the `mental-model-reviewer` plugin (`/wiki-review`). It is kept here during the coexistence period (target removal: when 5 successful `/wiki-review` runs have produced equivalent or better reviews on this project). Until then, both work; prefer `/wiki-review` for new reviews.

# review-with-wiki-ingest

## Overview

ベースブランチとカレントブランチの差分をレビューする際、`./.wiki/` 配下の関連ドキュメントを先に読み込んで文脈を揃え、不明点はレビュー側で勝手に判断せず必ずユーザーに質問し、得られたQ&Aを `/wiki:ingest` で wiki に取り込むまでが1セットの作業。

**Core principle:** *不明点は推測でレビューに書くな。必ずユーザーに聞き、得た回答は wiki に残せ。*

レビューの精度は文脈量に比例する。wiki の既存知識を読まずに書いた指摘は誤読に基づきがちで、ユーザーに確認しない指摘は「気になる点リスト」止まりで知識が累積しない。このskillは「文脈収集 → 対話 → 知識化」の3点を機械的に強制する。

## When to use

カレントブランチを base branch と diff してレビューを求められ、かつ `./.wiki/` が存在する状況で、以下のいずれかを満たすとき:

- 変更ファイルが domain logic 領域 (models / services / business rules / external integrations 等) を含む
- CLAUDE.md / README / `./.wiki/_index.md` に登録されたドメイン用語・業務用語・外部システム名が変更箇所 (コード or コミットメッセージ) に出現する
- ユーザーが「wiki も踏まえて」「wikiを参照して」など明示的に wiki 利用を指示している

## When NOT to use

- `./.wiki/` が存在しない、または空のリポジトリ（通常のコードレビューを行う）
- 1ファイル数行の機械的修正のみ（typo、フォーマッタ適用など）でドメイン論点が無い差分
- ユーザーが「質問せず一気にレビューだけ書いて」と明示した場合（feedbackが優先）

## The Iron Laws

この skill には 2 つの絶対遵守ルールがある。両方守らないと skill の目的は達成されない。

### Law 1: Q&A discipline

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

### Law 2: Ingest discipline

```
Q&A が 1 件でも発生したら、レビュー提出と同ターンで wiki に ingest せよ。
セッションを跨いだ ingest は、永遠に行われない。
```

**No exceptions:**
- 「Q&A が 1 件しかない」→ 件数は理由にならない。1 件でも知見は知見
- 「次回まとめて ingest する」→ 次回そのセッションは無い。今やる
- 「ユーザーが急いでいる」→ ingest は 1 回の Skill 呼び出し。秒で終わる
- 「--local は付けなくても多分大丈夫」→ 出力パスを必ず確認。`.wiki/raw/notes/` でなく `~/wiki/raw/notes/` だったら HUB 事故
- 「ingest できたっぽいので報告は省略」→ 実ファイルパスをユーザーに開示するまでが ingest

このルールに違反した skill 完了は、完了として報告してはならない。ingest と実パス確認を済ませてから報告する。

## Workflow

### Phase 1: Diff 収集とベース判定

1. base branch を以下の優先順位で判定する：
   1. **リモートのデフォルトブランチ**（最優先）:
      ```bash
      git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null
      # 例: refs/remotes/origin/main → origin/main を base 候補に
      ```
   2. **上流追跡ブランチ**: `git rev-parse --abbrev-ref --symbolic-full-name @{u}` の結果が `origin/main` / `origin/master` / `origin/develop` のいずれかなら採用。**それ以外（別 feature branch を fork した PR チェーンの中継点など）は base ではなく分岐元として扱い、採用しない。**
   3. **フォールバック探索**: `origin/main` → `origin/master` → `origin/develop` の順で `git rev-parse --verify` し、最初に見つかったものを採用。
   4. **リモートが origin でない repo**: `git remote` で全リモートを列挙し、各リモートに対し 1-3 を適用。複数リモートに該当した場合は曖昧と判断。

   いずれの段階でも候補が複数あるか曖昧なときは、推測せずユーザーに聞く。判定した base と判定根拠 (どの優先順位で決まったか) を 1 行でユーザーに開示してから次に進む。

   merge-base 計算: `git merge-base HEAD <決定した base>`
2. diff を取得：
   ```bash
   git diff <merge-base>...HEAD --stat
   git diff <merge-base>...HEAD
   git log --oneline <merge-base>..HEAD
   ```
3. 変更ファイル一覧から「ドメイン領域」を抽出する。具体的には以下：
   - 変更ファイルの 2-3 階層上のディレクトリ名（多くの場合ドメイン単位を示す。例: 何らかの `models/<entity>/`, `services/<domain>/`, `integrations/<external-system>/`）
   - CLAUDE.md / README に出てくる業務用語・固有名詞・外部システム名
   - コミットメッセージや diff 内コメントに出てくるドメイン語
   
   このプロジェクト固有の領域名を skill 側にハードコードしない。実際の変更内容から都度抽出する。

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
- 質問は具体的に（ファイル・行・該当コード片を引用）。「なぜこうしたのか?」より「A ではなく B にした理由は X か Y か?」のように**選択肢を提示**すると速い。各 option には `label` と `description` を付け、想定回答ごとに後続アクション (現状維持 / 追加修正 / バグ確定 など) を予告しておくとユーザーが即答しやすい。
- 回答後に新たな疑問が湧いたら追加質問する。**「最初の質問セットで打ち切る」のは禁止。**
- 全Q&Aを `Q: ... / A: ...` 形式で記録（後の ingest 用）。

**呼び出し例（コードを引用しつつ選択肢を提示するパターン）:**

```
AskUserQuestion(questions=[{
  "question": "src/api/orders.ts:42 で catch ブロックが return null になっている。これは意図的?",
  "header": "Error 握り潰し",
  "multiSelect": false,
  "options": [
    {"label": "意図的: フロントが null で再 fetch をトリガー", "description": "現状維持で OK"},
    {"label": "意図的だがログは欲しい",                  "description": "logger.warn 追加を Findings に入れる"},
    {"label": "バグ: 上に throw すべき",                  "description": "throw に修正する指摘を Findings に入れる"}
  ]
}])
```

複数の独立した疑問は同じ呼び出しに `questions` 配列で 4 件まで束ねる（並列化）。連動する疑問 (回答次第で次の質問内容が決まる) は分けて複数ターン。

### Phase 5: レビュー提出

- Phase 3 の Findings に、Phase 4 で確定した事実を反映してレビューを完成させる。
- Phase 4 で「意図通り」と判明した項目は **Findings から削除**する（指摘として残さない）。
- レビュー本文に質問内容を残さない（質問はもう解消済みのため）。

### Phase 6: Q&A の wiki ingest（**Q&Aが1件以上なら必ず実施**）

Q&Aがゼロ件のとき以外、必ず以下を実施する。「ユーザーが急いでいる」「Q&Aが些細」などは ingest をスキップする理由にならない。

> **重要:** plugin で提供されている `/wiki:ingest` の実体は `wiki:ingest` skill。**`Skill` ツールから直接呼び出す**のが正規ルート。`commands/ingest.md` を Read して assistant 自身が ingest 処理を再実装してはいけない（責務が壊れる・脆い・plugin 更新に追従できない）。

1. **Q&A をファイル化:** Q&A をマークダウンにまとめて `/tmp/review-qa-<YYYY-MM-DD>-<topic-slug>.md` に書き出す。タイトル例: `<ドメイン領域> <変更内容> - レビュー Q&A`。

   **テンプレート（コピペして埋める）:**

   ```markdown
   # <ドメイン領域> <変更内容> - レビュー Q&A

   - **Branch:** <feature/fix branch 名>
   - **Base:** <base branch> (merge-base: <短縮 SHA>)
   - **Date:** <YYYY-MM-DD>
   - **Main change areas:** <Phase 1-3 で抽出したドメイン領域のリスト>

   ## Q&A

   ### Q1: <一行サマリ>
   **Q:** <質問本文。ファイル:行・該当コード片を引用>
   **A:** <ユーザー回答をそのまま>

   ### Q2: ...

   ## Derived constraints / assumptions for future reviews

   - <制約 1: 「次回似たレビューで判断材料になる前提」を抽出して書く>
   - <制約 2>
   - ...

   ## Related

   - [[review-with-wiki-ingest]]
   - <関連 wiki 記事へのリンクがあれば>
   ```

   **Derived constraints セクションは必須。** 生 Q&A だけでは検索しても再利用しにくい。「将来このリポジトリで類似の判断が必要になったとき何を知っていれば即決できるか」を 1-3 行で抽出する。

   **永続性に関する注意:** `/tmp` は macOS で再起動時に消える可能性がある領域。**step 2 の ingest が成功して `.wiki/raw/notes/<...>.md` への書き出しがパスとして確認できるまで、`/tmp` のファイルを削除しない・セッションを閉じない**。ingest 失敗 (skill 不在 / `--local` 忘れで HUB 行き / 引数エラー等) のリカバリはこのファイルから行う。

2. **`wiki:ingest` skill を `Skill` ツールで呼ぶ:**
   ```
   Skill(
     skill="wiki:ingest",
     args="<Q&Aファイルの絶対パス> --type notes --title \"<タイトル>\" --local"
   )
   ```
   - `--local` は **必須**。プロジェクトの `.wiki/` を対象にする。これを忘れると HUB (`~/wiki/`) にプロジェクト固有のドメイン情報・コード断片が混入する事故になる。具体的な影響:
     - 他プロジェクトを開いたとき、無関係な記事が `wiki:query` で検索ヒットしてノイズ化
     - HUB を他者と共有・公開している場合、想定外の情報漏洩リスク
     - 後から該当エントリを HUB から退避する手作業が発生（`wiki:retract` で消せるが完璧ではない）
   - `--type notes` で `.wiki/raw/notes/<date>-<slug>.md` に raw notes として取り込まれる。
   - skill 側で `.wiki/log.md` 追記・`.wiki/_index.md` の Sources/Recent Changes 更新まで行われる。assistant 側で個別に書き込む必要は無い。

3. **完了報告:** `wiki:ingest` が書き出したファイルパス（例: `.wiki/raw/notes/2026-05-15-...-review-qa.md`）をユーザーに報告。「wiki に取り込みました」だけでなく実ファイルパスを示す。

**Fallback:** `Skill` ツールで `wiki:ingest` が見つからない / 呼び出しに失敗した場合のみ、ユーザーに `/wiki:ingest <filepath> --type notes --title "..." --local` を手で実行してもらう旨を案内する（最後の手段）。

## Quick Reference

| やること | コマンド／ツール |
|---|---|
| ベース判定 | `git symbolic-ref refs/remotes/origin/HEAD` → 上流追跡 → `origin/{main,master,develop}` フォールバック (Phase 1 参照)。最後に `git merge-base HEAD <base>` |
| 差分取得 | `git diff <base>...HEAD` |
| wiki 構造把握 | `Read .wiki/_index.md`, `Read .wiki/wiki/_index.md` |
| 関連 wiki 検索 | `Glob`, `Grep` on `./.wiki/` |
| 質問 | `AskUserQuestion` ツール（最大4問/ターン、複数ターン可） |
| 知識化 | `Skill(skill="wiki:ingest", args="<filepath> --type notes --title \"...\" --local")` |

## Red Flags

頭に浮かんだら STOP し、対応 Phase に戻る。skill の目的は「推測レビューの構造的排除」と「Q&A 知識の確実な累積」の両立。

### Phase 4 (Q&A discipline) に戻るべき思考

- 「とりあえずレビュー書いてから後で聞こう」
- 「これは明らかだから聞かなくていい」
- 「ユーザーを煩わせたくないから推測で書く」
- 「質問が多すぎるので主要な物だけ聞く」
- 「wiki を読まずにコードだけ見れば足りる」 → Phase 2 にも戻る

### Phase 6 (ingest discipline) に戻るべき思考

- 「Q&A が 1 件しかないので ingest は省略」
- 「今急いでいるから ingest は次回まとめて」
- 「`--local` は付け忘れたけど多分動いてる」
- 「ingest が走ったので元の `/tmp` ファイルは消して良い」
- 「ingest 完了報告に実ファイルパスは要らない」
- 「`commands/ingest.md` を Read して自分で書けば早そう」

## Rationalization Table

### Q&A 側

| 言い訳 | 実態 |
|---|---|
| 「自明なバグだから聞くまでもない」 | 意図的な選択 or 既知の制約のことが多い。聞く方が速い |
| 「wiki に該当が無さそう」 | 実際に Read で見たか? 見ていないならスキップしてはいけない |
| 「ユーザーが急いでいる」 | 推測でズレたレビュー → 出戻りの方が遅い |
| 「もう似た内容が wiki にある」 | 似ていても新ブランチ固有の判断は別の知見。差分を残す |
| 「対話で長くなりそう」 | AskUserQuestion で 1ターンに 4 質問まで束ねられる。並列化せよ |

### Ingest 側

| 言い訳 | 実態 |
|---|---|
| 「Q&Aが 1 件しかないから ingest 不要」 | 1 件でも要件は ingest 必須。例外なし |
| 「`--local` 忘れたけど多分動いてる」 | 出力パスを必ず確認。`.wiki/raw/notes/` でなく `~/wiki/raw/notes/` だったら HUB 事故 |
| 「ingest 後の実ファイルパスは伝えなくても良い」 | パスを示さないと「local に入ったか」「どこを見れば再利用できるか」が伝わらない。必須 |
| 「ingest が成功したっぽいので `/tmp` の元ファイルは消して良い」 | 確認するまで消さない。再試行できなくなる |
| 「次回まとめて ingest する」 | セッションを跨いだ ingest は永遠に行われない。今やる |

## Common Mistakes

- **wiki を Glob しただけで読まずに判断する** → 必ず Read する
- **質問せずに「？」付きで本文に書く** → レビュー本文に疑問符は残さない。質問は AskUserQuestion 経由
- **Q&A の ingest を「後でやる」** → セッションが切れたら永久に失われる。レビュー提出と同ターンで ingest
- **raw Q&A をコピペするだけで `Derived constraints` セクションを書かない** → 生 Q&A 単体だと将来検索しても再利用しにくい。Q&A から「次回類似レビューで即決材料になる前提・制約」を 1-3 行抽出して必ず書く (テンプレ参照)
- **`/wiki:ingest` に `--local` を付け忘れる** → プロジェクトの `.wiki/` ではなく HUB に入る事故になる
- **`commands/ingest.md` を Read して自前で ingest 処理を再実装する** → `wiki:ingest` は available skills に含まれており `Skill` ツールから直接呼べる。再実装は脆く、plugin 更新に追従できず、責務分離も壊れる（Phase 6 参照）
- **ingest をユーザーに丸投げする** → Fallback。基本は自分で実行。ユーザーに依頼するのは詰まったときだけ

## Completion Checklist

skill 終了時、以下が全て満たされているか確認：

- [ ] base branch を `git merge-base` で判定し、差分を全部読んだ
- [ ] `./.wiki/` の関連ページを実際に Read で読んだ（または該当無しを確認した）
- [ ] 不明点・疑問点・気になる点を **1件残らず** AskUserQuestion でユーザーに確認した
- [ ] レビュー本文には推測・疑問は残っていない
- [ ] Q&Aが1件以上あったなら、`Skill(skill="wiki:ingest", ...)` で wiki に取り込み、`.wiki/raw/notes/` への書き出し完了を確認した（`--local` 必須）
- [ ] ユーザーに「レビュー完了」「wiki ingest 完了（書き出しパス: ...）」を報告した
