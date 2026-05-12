# Agent Workflow Reliability Blueprint

Portfolio-safe static dashboard for explaining **AI development workflow reliability**.

The screen is now a workflow blueprint, not a list of private work logs. It focuses on how AI-agent work is designed, evaluated, reviewed, released, and improved.

## Live URL

Public, sanitized GitHub Pages mirror:

https://tenormusica2024.github.io/agent-workflow-reliability-dashboard-pages/

The development repository remains private. The Pages mirror contains only portfolio-safe blueprint data.

## Main design intent

This proof asset should communicate:

> I do not just use Codex / Claude Code / AI agents.
> I design an AI development workflow that is observable, evaluable, reviewable, and explainable.

The main UI is therefore:

1. AI development workflow diagram
2. Explanation panel placed next to the selected workflow step
3. Persuasive explanation cards for eval, HITL, and traceability
4. Optional interview Q&A hidden behind details

## Japanese / English switching

The dashboard defaults to Japanese and includes a 日本語 / English toggle.

The Japanese view keeps technical English terms such as AI agent, workflow, HITL, rollback, eval, GitHub Issue, and source-of-truth where those terms are clearer than forced translation.

## Public-safe content policy

Do not use this public dashboard to show individual private tasks or sensitive operational details.

Do not include:

- employer private data
- client data
- family/personal details
- credentials
- private repository content
- job-search research rows
- issue text that includes sensitive context
- raw screenshots with private UI

Use instead:

- abstract workflow stages
- sanitized tool categories
- public-safe explanation copy
- eval / HITL / traceability rationale
- interview-ready explanation notes

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

If you open `index.html` directly as `file://`, the browser may block JSON loading. Use the local server command above.

## Data model

The dashboard reads `sample-runs.json`.

Current schema:

- `workflowStages`
  - title
  - short explanation
  - tools
  - output
  - persuasive explanation
  - evidence to show
- `proofCards`
  - eval explanation
  - HITL explanation
  - traceability explanation
- `qa`
  - optional interview answers

## Next improvements

- Add architecture diagram variant for README hero
- Add more concrete but still public-safe workflow examples
- Add before/after explanation mode
- Add exportable interview answer sheet
