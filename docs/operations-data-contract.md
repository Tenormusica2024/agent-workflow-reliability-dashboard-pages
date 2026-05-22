# Operational data contract

This dashboard is still a static frontend, but it now has a minimal operational data path:

1. Collect agent run telemetry in `agent-runs.v0.1` shape.
2. Keep operational thresholds and redaction settings in `config/dashboard.config.json`.
3. Run `npm run build:data` to transform telemetry into the UI-ready dashboard schema.
4. Run `npm run check` before publishing or handing off.

## Source telemetry

Example source file:

```text
data/agent-runs.example.json
```

The source format is intentionally smaller than `sample-runs.json`. It represents the data an adapter would normally receive from real agent runs:

- workflow identity
- incident metrics
- trace/session summary
- spans with status, duration, retries, provider, cost, and annotations
- hypotheses and evidence
- generated run history / previous-run comparison
- generated reliability decision based on `history[]`
- recommended next action
- optional `history[]` for previous-run and 7-day-baseline comparison
- tool payload to be redacted
- evaluations
- replay defaults
- logs

Validate the source telemetry contract:

```powershell
npm run validate:source
```

The validator checks required object shape, duplicate IDs, basic numeric ranges, span timing within trace duration, hypothesis/evaluation scores, optional `history[]`, replay defaults, and minimum log/evaluation rows.

### Run history shape

Real collectors can pass previous-run comparison data through `workflow.history[]`.

Each item uses this minimal shape:

```json
{
  "label": "latest",
  "time": "2026-05-13T13:42:00+09:00",
  "affectedSessions": 1243,
  "sloBurn": 2.6,
  "durationMs": 48712,
  "errorRate": 2.7,
  "status": "ongoing"
}
```

If `history[]` is missing, the builder generates a demo-safe fallback from the current incident, trace, and logs. For real operation, prefer explicit collector-provided history so trend and recovery judgments are not inferred from a single run.

The builder also derives `reliabilityDecision` from `history[]`.
Thresholds are read from `config/dashboard.config.json` under `thresholds.reliabilityDecision`, so each deployment can tune the operational sensitivity without changing UI code:

```json
{
  "sloPreviousDeltaAlert": 0.5,
  "sloBaselineRatioAlert": 2.0,
  "errorRateDeltaAlert": 1.0,
  "affectedSessionsDeltaAlert": 100,
  "recoverySloBurnMax": 1.2,
  "criticalSloBurnMin": 2.0
}
```

- `critical`: SLO burn is high and either previous-run delta or 7-day-baseline ratio exceeds the threshold.
- `alert`: SLO, error rate, or affected sessions worsened enough to require closer monitoring.
- `recovering`: two consecutive improvements are visible and the latest SLO burn is below the recovery threshold.
- `stable`: no alert or recovery threshold is crossed.

Generated dashboard JSON includes `reliabilityThresholds` at the root and `reliabilityDecision.thresholds` per workflow for traceability.

## Generated dashboard data

Command:

```powershell
npm run build:data
```

Default output:

```text
tmp/generated-sample-runs.json
```

This generated file can be validated with:

```powershell
npm run validate:generated
```

## File-drop intake

For local operation or a first production-like integration, place one run per file in:

```text
data/incoming/*.json
```

Each file should use one of these shapes:

- `agent-run.v0.1`: a single `workflow` object
- `agent-runs.v0.1`: exactly one workflow in `workflows[]`

Merge all incoming files into a single telemetry bundle:

```powershell
npm run merge:incoming
```

Build UI-ready dashboard data from the merged bundle:

```powershell
npm run build:incoming
```

Run the file-drop preflight:

```powershell
npm run check:incoming
```

The merge step rejects duplicate workflow IDs so the dashboard selector cannot silently point to the wrong run. `check:incoming` validates raw incoming files, validates the merged telemetry bundle, and scans both `tmp/merged-agent-runs.json` and `tmp/generated-sample-runs.json` before the data can be promoted.

## Swappable scheduled project intake

The dashboard now has a generic intake layer for already-running scheduled projects.
The goal is to avoid writing a one-off importer for only one project. A project is represented by a **source profile**:

```text
config/scheduled-sources.example.json
```

Local real-data profiles should be stored in:

```text
config/local-scheduled-sources.json
```

That local file is intentionally ignored by git. It may point to private local artifacts, but the importer writes only a dashboard-safe summary:

- profile id
- source type
- source file name, not full local path
- source hash
- mapped numeric/status signals
- check statuses, durations, annotations, and short evidence
- safe run-history summary

It does not copy the raw artifact body, full local path, command output, secrets, or private payloads into dashboard data.

### Profile types

Current profile types:

- `json`: read a JSON health/run artifact and map fields with JSON paths such as `$.run.status`.
- `markdown`: read a markdown post-run health report and map `- key: value` lines, optionally scoped to a `## Section`.
- `agent-run-json`: pass through an artifact that already uses `agent-run.v0.1`.

Each profile can define:

- `workflow`: dashboard identity and labels
- `extract`: run-level fields such as `runId`, `startedAt`, `durationMs`, `status`, `sloBurn`, and `errorRate`
- `checks[]`: span/evaluation/log rows derived from source signals
- `recommendedAction`
- `replay`

### Commands

Validate the committed example profile:

```powershell
npm run check:scheduled:example
```

Import a local real scheduled project by profile:

```powershell
npm run import:scheduled -- --config config/local-scheduled-sources.json --profile <profile-id>
npm run check:scheduled
```

Generated local files:

```text
data/private-incoming/<profile-id>.json
data/private-runs/<profile-id>.history.json
tmp/scheduled-merged-agent-runs.json
tmp/scheduled-dashboard-runs.json
```

For local visual verification, serve the repo and load the generated dashboard JSON:

```powershell
npm run serve
```

```text
http://localhost:4173/?data=tmp/scheduled-dashboard-runs.json
```

The `data` query parameter accepts only same-origin relative JSON paths. Absolute URLs and parent-directory paths are ignored.

To switch projects, add another profile to `config/local-scheduled-sources.json` and change only `--profile <profile-id>`. The dashboard schema and UI do not need to change.

## Safe promotion

The browser reads `sample-runs.json`, so generated data should be promoted only after validation and safety scanning.

Dry-run promotion into `tmp/` first:

```powershell
node scripts/promote-dashboard-data.mjs --input tmp/generated-sample-runs.json --target tmp/promoted-sample-runs.json --backup false
```

When the generated data is confirmed to be public-safe and demo-ready, promote it to the browser-facing file:

```powershell
npm run promote:data
```

`promote:data` validates and safety-scans the input, writes a backup under `tmp/backups/`, updates `sample-runs.json`, and then validates and safety-scans the promoted target again.

## Safety and redaction

Redaction configuration lives in:

```text
config/dashboard.config.json
```

The build step masks configured header and body keys before rendering payload code lines.

The safety scan checks generated and public-facing data for common publishing hazards:

```powershell
npm run safety:scan
```

The full preflight is:

```powershell
npm run check
```

## CI preflight

GitHub Actions runs the same safety boundary on push, pull request, and manual dispatch:

```text
.github/workflows/dashboard-preflight.yml
```

The workflow checks:

- `npm run check`
- `npm run check:incoming`
- `npm run check:scheduled:example`
- source/incoming telemetry contract validation
- dry-run promotion to `tmp/promoted-sample-runs.json`
- no tracked file mutations after generation

## Current boundary

This is not yet a live backend. The dashboard still fetches `sample-runs.json` in the browser. The new contract makes the next integration step smaller: a real collector can emit `agent-runs.v0.1`, run the builder, and publish the resulting dashboard JSON.

## Next integration step

For real operation, continue with one adapter per source system:

- file drop adapter: export agent traces to `data/incoming/*.json` (initial local adapter is now available)
- scheduled source profile adapter: map existing JSON/markdown run artifacts with `config/local-scheduled-sources.json`
- API adapter: fetch recent run traces from an internal endpoint
- CI adapter: build and validate dashboard data on every update
- deployment adapter: publish only safety-scanned dashboard JSON
