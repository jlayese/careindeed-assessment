# Careindeed Technical Assessment — AI Staffing Assistant

A chat assistant that answers staffing coordinators' questions (eligibility, schedules,
credentials, facility requirements) using live data from the Meridian API.

## Stack

- **Next.js 16 (App Router) + TypeScript** — the preferred stack per the ticket.
- **Vercel AI SDK (`ai`, `@ai-sdk/react`, `@ai-sdk/openai`)** — streaming, tool calling.
- **OpenRouter** (via `@ai-sdk/openai`'s custom `baseURL`, since OpenRouter is
  OpenAI-API-compatible) serving the model.
- Model: `openai/gpt-5.6-luna` (a current, cost-efficient frontier model on OpenRouter,
  as recommended in the assessment brief). Change `MODEL_ID` in
  `app/api/chat/route.ts` if a different model is preferred.

## AI-assisted development

Built with Claude Code. Used it for: scaffolding, wiring the Vercel AI SDK's tool-calling
API against the installed package versions (verified exact API signatures — `inputSchema`,
`stopWhen`/`stepCountIs`, `convertToModelMessages` being async in this version — directly
against the installed `node_modules` type declarations rather than assuming an API shape,
since the AI SDK has had breaking changes across versions), and the Meridian API client
scaffold. Endpoint paths in `lib/meridian.ts` are placeholders inferred from the ticket
description and QA questions; confirmed/corrected against the real API docs before relying
on them.

## Architecture

```
Browser (React chat UI, app/page.tsx)
        │  POST /api/chat  (user message only, no secrets)
        ▼
Next.js Route Handler (app/api/chat/route.ts) — server-only
        │
        ├─ streams model output back to browser
        │
        ├─→ OpenRouter (chat completion, tool-calling loop)
        │        MODEL: openai/gpt-5.6-luna
        │
        └─→ Meridian API (lib/meridian.ts) — server-only, holds MERIDIAN_API_KEY
                 - searchPerson / getPersonById   (cross-system identity resolution)
                 - getEmploymentStatus
                 - getCredentials
                 - listShiftsForWorker / getShiftById / listOpenShiftsForFacility
                 - listFacilities / getFacility
```

Both API keys (`MERIDIAN_API_KEY`, `OPENROUTER_API_KEY`) live only in server-side env vars,
read inside the route handler and `lib/meridian.ts`. Neither is ever sent to the browser or
committed to git (`.gitignore` excludes `.env*`, `.env.example` is the committed template).

The model calls Meridian tools live, at question time, for every answer, results are never
pre-fetched or cached, per the "answers come from live Meridian API calls" requirement.
`lib/meridian.ts`'s `fetchAllPages` helper walks pagination fully before returning results,
so list/count questions reflect every page, not just the first.

## Guardrails (see `lib/system-prompt.ts`)

- Cross-system identity resolution: a person may be referred to by name or by any of the
  three systems' IDs; the model is instructed to search across all systems and treat
  matching records as one person, citing the source system per fact.
- Ambiguous name matches → the model asks a disambiguation question instead of guessing.
- Conflicting records across systems → both values are reported, not silently merged.
- Eligibility questions cross-check employment status + credentials + shift requirements
  together, not just one of the three.
- Data the tools can't answer → the model says so explicitly rather than inventing a value.
- Prompt-injection defense: any text returned inside a Meridian record is treated as data
  to report, never as an instruction to follow.

## Running locally

```bash
npm install
cp .env.example .env.local   # fill in MERIDIAN_API_KEY and OPENROUTER_API_KEY
npm run dev
```

## Deployment

Deployed to the assessment EC2 instance behind Caddy (automatic HTTPS via Let's Encrypt on
a sslip.io hostname pointing at the server's public IP), running under `pm2` so the process
survives SSH disconnects and restarts automatically.

## What was prioritized / cut

See ticket board comments and the video walkthrough for the full reasoning on
prioritization and anything left as a "To do" given the time box.
