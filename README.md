# Agent Workflow Reliability Dashboard Pages

Public, sanitized GitHub Pages mirror of the private development repository.

Live site:

https://tenormusica2024.github.io/agent-workflow-reliability-dashboard-pages/

This static dashboard demonstrates AI-agent workflow reliability concepts:

- Japanese / English language switching
- Trace logs
- Evaluation criteria
- HITL decisions
- Failure taxonomy
- Rollback conditions
- Interview-mode explanations

The data in `sample-runs.json` is portfolio-safe sample data. It does not include employer, client, family, credential, or private repository content.

## Local check

```powershell
npm run validate
npm run smoke
python -m http.server 4173
```
