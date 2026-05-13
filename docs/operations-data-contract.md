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
- recommended next action
- tool payload to be redacted
- evaluations
- replay defaults
- logs

Validate the source telemetry contract:

```powershell
npm run validate:source
```

The validator checks required object shape, duplicate IDs, basic numeric ranges, span timing within trace duration, hypothesis/evaluation scores, replay defaults, and minimum log/evaluation rows.

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
- source/incoming telemetry contract validation
- dry-run promotion to `tmp/promoted-sample-runs.json`
- no tracked file mutations after generation

## Current boundary

This is not yet a live backend. The dashboard still fetches `sample-runs.json` in the browser. The new contract makes the next integration step smaller: a real collector can emit `agent-runs.v0.1`, run the builder, and publish the resulting dashboard JSON.

## Next integration step

For real operation, continue with one adapter per source system:

- file drop adapter: export agent traces to `data/incoming/*.json` (initial local adapter is now available)
- API adapter: fetch recent run traces from an internal endpoint
- CI adapter: build and validate dashboard data on every update
- deployment adapter: publish only safety-scanned dashboard JSON
