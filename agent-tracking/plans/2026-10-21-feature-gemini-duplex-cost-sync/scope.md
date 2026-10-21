# Scope — 2026-10-21-feature-gemini-duplex-cost-sync

## Request (verbatim)

> There are a few things that have changed, like a few Gemini settings that have been changed. I wanted to take a look. Use the INT Voicekit API docs PRD production MCP to take a look into the Gemini settings. A few Gemini settings for the assistant changed. I think now it will give errors, so update the UI properly if needed.
>
> Also, take a look into the EPL LiveKit docs about some of the settings of the call-end webhook, the response, or the call logs response that has changed for the duplex models, to show our split of the pricing in the call logs. I think for the duplex models, a few things have changed. Also, take a look into that and the pricing and everything.
>
> In conclusion, take a look into these two MCPs and create a proper plan. Ask me anything if needed to update.

Invoked through `/core-be-audit-code`. This repo is a frontend, so the backend audit checklist does not apply; the deliverable is a plan, per the request. Task type: `feature` (UI sync with upstream 1.7.0).

## Agreed scope

| Item | Answer |
|------|--------|
| Target | `src/routes/dashboard/assistant/`, `src/routes/dashboard/call-logs/`, `src/types/callLog.ts`, `src/services/assistant/assistantService.ts`, `src/lib/webhookSamples.ts` |
| Depth | standard |
| Out of scope | backend, new dependencies, unrelated lint debt |
| Constraints | no request-shape changes beyond what upstream 1.7.0 requires |
| Success criteria | see plan.md |
| Output | plan.md, then code after approval |
| Type-specific | awaiting answers to Q1–Q4 in plan.md |

## Clarification log

- Q1–Q4 (plan.md, "Questions"): awaiting answer.
