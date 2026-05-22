# Agent Workflow Reliability Dashboard

日本語UIで使う **Agent Trace Triage Console** のプロトタイプです。

目的は、AIエージェントの実行が失敗・劣化したときに、どの工程で壊れたか、なぜ壊れたか、次に何を確認すべきかを説明できるダッシュボードにすることです。

## Current UI direction

現在の実装は、デザイン案のうち特に気に入っている **v2 - Engineer Trace Triage Console** をベースにしています。

重視点：

- v2画像に近い、左サイドバー + 暗色ヘッダー + 白カードの構成
- 日本語で企業・クライアントに説明しやすいUI
- trace / span / tool call / eval / RCA / replay / logs を一画面で見る構成
- 後から複数のAIエージェントワークフローに接続できるデータ駆動設計

## Design concepts

生成済みのデザイン参考画像はこちらです。

- [Full design concept gallery](assets/design-concepts/2026-05-12/README.md)

| Executive / overview | Engineer / trace triage |
|---|---|
| <img src="assets/design-concepts/2026-05-12/v1-executive-reliability-command-center.png" alt="Executive Reliability Command Center" width="480"> | <img src="assets/design-concepts/2026-05-12/v2-engineer-trace-triage-console.png" alt="Engineer Trace Triage Console" width="480"> |

| Evaluation / governance | Operations / tool reliability |
|---|---|
| <img src="assets/design-concepts/2026-05-12/v3-evaluation-release-governance-board.png" alt="Evaluation and Release Governance Board" width="480"> | <img src="assets/design-concepts/2026-05-12/v4-agent-operations-tool-reliability-map.png" alt="Agent Operations and Tool Reliability Map" width="480"> |

## What this dashboard shows

- インシデント概要
- トレースツリー
- スパンのウォーターフォール
- 原因推定アシスタント
- 実行履歴・過去run比較
- 履歴に基づく運用判定
- 秘匿済みツール入力
- トレース単位の評価
- 再実行パネル
- 関連ログとエラー

## Run locally

```powershell
cd C:\Users\Tenormusica\agent-workflow-reliability-dashboard
npm run validate
npm run smoke
npm run serve
```

Open:

```text
http://localhost:4173
```

`file://` で直接開くと JSON 読み込みが止まる場合があります。ローカルサーバー経由で確認してください。

## Data model

画面は `sample-runs.json` を読み込みます。

現在のschemaは `0.3.0` です。

主な構造：

- `workflows[]`
  - workflow / agent名
  - environment / status / time window
  - incident summary
  - trace tree rows
  - waterfall spans
  - root-cause hypotheses
  - run history / previous-run comparison
  - reliability decision derived from run history
  - configurable reliability thresholds
  - recommended action
  - redacted tool payload
  - evaluations
  - replay settings
  - linked logs

複数のAIエージェントワークフローを `workflows[]` に追加すれば、上部セレクトから切り替えられます。

実運用では、各workflowに任意の `history[]` を追加できます。これにより、前回run・7日基準との差分をcollector由来の値で表示できます。`history[]` がない場合は、デモ用fallbackを生成して表示します。

## Operational data path

実運用に近づけるため、最小のデータ投入パイプラインを追加しています。

```powershell
npm run build:data
npm run check
```

- source telemetry example: `data/agent-runs.example.json`
- file-drop telemetry examples: `data/incoming/*.json`
- operational config: `config/dashboard.config.json`
- reliability threshold config: `thresholds.reliabilityDecision`
- generated dashboard data: `tmp/generated-sample-runs.json`
- contract notes: `docs/operations-data-contract.md`

source telemetryの契約だけを確認する場合は以下を使います。

```powershell
npm run validate:source
```

現時点ではブラウザは引き続き `sample-runs.json` を読み込みます。実運用接続時は、実行ログ収集側が `agent-runs.v0.1` 形式を出し、`build:data` でUI用schemaへ変換する想定です。

### Swappable scheduled project intake

実際に動いている定期実行プロジェクトを、1プロジェクト専用のscriptではなく **source profile差し替え** で取り込めるようにしています。

公開repoに置くのは安全な雛形だけです。

- profile雛形: `config/scheduled-sources.example.json`
- サンプル入力: `data/source-examples/*`
- 汎用importer: `scripts/import-scheduled-run.mjs`
- 履歴store: `scripts/run-history.mjs`
- local実データprofile: `config/local-scheduled-sources.json`（gitignore対象）
- local変換結果: `data/private-incoming/`, `data/private-runs/`, `tmp/scheduled-dashboard-runs.json`（gitignore対象）

サンプルprofileの検証:

```powershell
npm run check:scheduled:example
```

実プロジェクトへ差し替える場合は、`config/local-scheduled-sources.json` に対象artifactのパスとcheck対応を追加し、profile名だけを変えて実行します。
profile `id` は出力ファイル名とdashboard metadataにも使うため、英小文字/数字から始まる `^[a-z0-9][a-z0-9_-]{0,79}$` のpublic-safeな匿名path segmentにします。client名・private repo名・内部プロジェクト名は使いません。
raw artifactは `json` / `markdown` profileで安全なsummaryへ写像するのが基本です。
mapped annotation/evidenceには公開してよい短いsummaryだけを指定し、raw command output・full path・client名・secretなどは指定しません。
`completed` / `succeeded` などプロジェクト固有の成功表現がある場合は、profile側の `okValues` / `warningValues` / `errorValues` でdashboard用の正常/監視/要対応へ翻訳します。
`agent-run-json` は既に公開用へサニタイズ済みの `agent-run.v0.1` だけに使い、profileに `trustedPreSanitized: true` を明示します。
この場合もimporterはdashboard用の履歴メタデータを付与するため、完全なbyte-for-byte pass-throughではありません。
runtime-flow 画面では `workflow.scheduler` を使って定期実行プログラムの切替カードを表示します。
複数profileを `data/private-incoming/` に取り込んでmerge/buildすれば、UIコードを変えずに複数の定期実行プログラムを横断表示できます。

```powershell
npm run import:scheduled -- --config config/local-scheduled-sources.json --profile <profile-id>
npm run check:scheduled
npm run serve
```

Windows Task Scheduler の実タスクを health artifact 化して、profile import から dashboard JSON 生成・検証まで一括更新する場合は以下を使います。

```powershell
npm run update:scheduled:local
```

このコマンドは、存在すれば `config/local-task-scheduler-tasks.json`（gitignore対象）を読みます。
ファイルには実タスク名を置けますが、public repoへはcommitしません。
dashboardへコピーされるのは `publicId` / `displayName` / `cadence` / 実行状態 / last-next run / status summary だけです。
実タスク名、Task Scheduler の action path、コマンド本文、raw log本文は `tmp/task-scheduler-health.json` へコピーしません。

`config/local-task-scheduler-tasks.json` の形:

```json
{
  "schemaVersion": "task-scheduler-health-sources.v0.1",
  "tasks": [
    {
      "taskName": "実Task Scheduler名",
      "publicId": "public-safe-health-id",
      "displayName": "Public Safe Health Name",
      "cadence": "5分ごと"
    }
  ]
}
```

profileを限定する場合:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/update-local-scheduled-dashboard.ps1 -Profile public-safe-health-id
```

Windows Task Scheduler にローカル更新ジョブを登録して、dashboard JSON を自動更新する場合:

```powershell
npm run register:scheduled:local
```

既定では `\Tenormusica\AgentWorkflowDashboardLocalUpdate` を登録し、15分ごとに `scripts/run-local-scheduled-dashboard-update.ps1` を実行します。
登録直後に1回実行して、`tmp/scheduled-dashboard-update.log` に結果を残します。
間隔やtask名を変える場合:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/register-local-scheduled-dashboard-task.ps1 -TaskName AgentWorkflowDashboardLocalUpdate -IntervalMinutes 30 -Force -RunNow
```

登録解除:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/register-local-scheduled-dashboard-task.ps1 -TaskName AgentWorkflowDashboardLocalUpdate -Unregister
```

ローカル表示:

```text
http://localhost:4173/?data=tmp/scheduled-dashboard-runs.json
```

runtime-flow で実行プログラムの切替UIを確認する場合:

```text
http://localhost:4173/runtime-flow/?data=../tmp/scheduled-dashboard-runs.json
http://localhost:4173/runtime-flow/?data=../tmp/scheduled-dashboard-runs.json&profile=<profile-id>
```

root dashboard の `?data=` は same-origin の相対JSONだけを受け付けます。絶対URLや `..` を含むpathは無視されます。
runtime-flow では同一origin内のJSONに限り、repo root の `tmp/` を参照するための `../tmp/...json` もローカル検証用に受け付けます。

複数の実行ログをファイル投入する場合は `data/incoming/*.json` に `agent-run.v0.1` を置き、以下で1つのUI用JSONに変換できます。

```powershell
npm run validate:incoming:raw
npm run build:incoming
npm run check:incoming
```

生成結果を `sample-runs.json` へ反映する前には、まず一時出力先で安全確認します。

```powershell
node scripts/promote-dashboard-data.mjs --input tmp/generated-sample-runs.json --target tmp/promoted-sample-runs.json --backup false
```

公開・デモ表示に反映してよいと判断した場合だけ、次のコマンドで `sample-runs.json` へ昇格します。

```powershell
npm run promote:data
```

## CI preflight

GitHub Actions で dashboard data pipeline のpreflightを自動実行します。

対象：

- checked-in sampleの検証: `npm run check`
- file-drop intakeの検証: `npm run check:incoming`
- source/incoming telemetry contractの検証
- `sample-runs.json` 昇格前のdry-run promotion
- CI中にtracked fileが意図せず変わっていないことの確認

Workflow:

```text
.github/workflows/dashboard-preflight.yml
```

## Public-safe content policy

private repoで作業し、公開可能な内容だけpublic Pages repoへ同期します。

公開版には以下を入れないこと：

- employer / client の非公開情報
- 個人情報・家族情報
- credentials / secrets
- private repository content
- 実在顧客のログやpayload
- NDA案件の具体名

使うべきもの：

- 架空または匿名化したワークフロー名
- 秘匿済みpayload
- 抽象化したログ・評価項目
- 公開可能な設計意図

## Next improvements

- v2 PNGとの細部比較を行い、余白・罫線・密度をさらに近づける
- v3の評価・リリース統制画面を別タブとして追加する
- 実データ接続用のadapter層を追加する
- trace / eval / logs のschemaをOpenTelemetry風に寄せる
- 公開用のサンプルデータとprivate運用データを分離する
