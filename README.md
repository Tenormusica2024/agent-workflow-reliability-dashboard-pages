# Agent Workflow Reliability Dashboard

日本語UIの **Agent Trace Triage Console** プロトタイプです。

AIエージェントの実行が失敗・劣化したときに、どの工程で壊れたか、なぜ壊れたか、次に何を確認すべきかを説明できるダッシュボードを目指しています。

## Live URL

https://tenormusica2024.github.io/agent-workflow-reliability-dashboard-pages/

## What this shows

- インシデント概要
- トレースツリー
- スパンのウォーターフォール
- 原因推定アシスタント
- 秘匿済みツール入力
- トレース単位の評価
- 再実行パネル
- 関連ログとエラー

## Design intent

この画面は、単なる分析ダッシュボードではなく、AIエージェント運用に必要な以下を一画面で説明するためのものです。

- 実行単位の可観測性
- ツール呼び出しの失敗箇所
- 評価指標との紐づき
- 原因推定と次の対応
- 再実行・検証の流れ

## Data model

画面は `sample-runs.json` を読み込みます。

主な構造：

- `workflows[]`
  - workflow / agent名
  - environment / status / time window
  - incident summary
  - trace tree rows
  - waterfall spans
  - root-cause hypotheses
  - recommended action
  - redacted tool payload
  - evaluations
  - replay settings
  - linked logs

サンプルデータは公開用に匿名化・架空化しています。

## Run locally

```powershell
npm run validate
npm run smoke
npm run serve
```

Open:

```text
http://localhost:4173
```

## Public-safe policy

この公開repoには、非公開の調査メモ、実在の顧客情報、認証情報、private repo由来の詳細ログは含めません。
