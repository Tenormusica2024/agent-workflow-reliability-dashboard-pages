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
- recommended next action
- tool payload to be redacted
- evaluations
- replay defaults
- logs

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

## Current boundary

This is not yet a live backend. The dashboard still fetches `sample-runs.json` in the browser. The new contract makes the next integration step smaller: a real collector can emit `agent-runs.v0.1`, run the builder, and publish the resulting dashboard JSON.

## Next integration step

For real operation, add one adapter per source system:

- file drop adapter: export agent traces to `data/incoming/*.json`
- API adapter: fetch recent run traces from an internal endpoint
- CI adapter: build and validate dashboard data on every update
- deployment adapter: publish only safety-scanned dashboard JSON
