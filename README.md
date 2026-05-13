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
- generated dashboard data: `tmp/generated-sample-runs.json`
- contract notes: `docs/operations-data-contract.md`

source telemetryの契約だけを確認する場合は以下を使います。

```powershell
npm run validate:source
```

現時点ではブラウザは引き続き `sample-runs.json` を読み込みます。実運用接続時は、実行ログ収集側が `agent-runs.v0.1` 形式を出し、`build:data` でUI用schemaへ変換する想定です。

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
