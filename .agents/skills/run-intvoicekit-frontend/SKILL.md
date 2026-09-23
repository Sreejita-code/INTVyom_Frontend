---
name: run-intvoicekit-frontend
description: >
  Launch the INTVOICEKIT frontend and drive it in a real browser. Use to run or
  start the app, take a screenshot of a page, check a route at mobile and
  desktop widths, verify a UI change actually renders, or sweep every route
  for responsive layout breaks and console errors. Triggers on "run the app",
  "start the dev server", "screenshot this page", "is this responsive",
  "check the layout", "does this break on mobile".
---

# Run INTVOICEKIT Frontend

Paths below are relative to the repo root.

The agent path is `.agents/skills/run-intvoicekit-frontend/driver.mjs` — a
Playwright script that boots the Vite dev server, signs itself in, walks routes
at five viewport widths, and fails on horizontal overflow or console errors.
Screenshots land in `.artifacts/screens/` (gitignored).

## Prerequisites

`playwright` is a devDependency. The browser binary is not — install it once
per machine:

```bash
npx playwright install chromium
```

The download is ~150 MB and has timed out on a slow link; re-run the command,
it resumes.

## Run (agent path)

```bash
# every route, every width — ~75 checks, a few minutes
node .agents/skills/run-intvoicekit-frontend/driver.mjs sweep

# one route, every width — the fast loop while iterating on a page
node .agents/skills/run-intvoicekit-frontend/driver.mjs route /dashboard/analytics

# one screenshot at one width
node .agents/skills/run-intvoicekit-frontend/driver.mjs shot /dashboard/tools 375
```

The driver starts and stops the dev server itself — do not start one first, the
port will already be taken.

Output is one line per route/width:

```
ok   /dashboard/analytics @375
FAIL /dashboard/call-logs @375  overflow +42px  div.flex table.w-full
       console: TypeError: Cannot read properties of undefined
```

Exit code is the number of failing checks, so it is usable as a gate. Widths
are `375, 768, 1024, 1440, 1920` — the same set `ui-design-system` names.

**Look at the screenshots.** A passing overflow check only proves nothing is
wider than the viewport; it does not prove the page looks right. Read at least
the 375 and 1920 PNGs of any route you touched.

## Run (human path)

```bash
npm run dev     # http://localhost:8080
```

## Gotchas

- **Port is 8080**, set in `vite.config.ts`. Not Vite's default 5173.
- **`hmr.overlay` is `false`.** A runtime error shows nothing in the page — it
  only reaches the console listener. This is why the driver watches `console`
  and `pageerror`, and why "the page looked fine" is not evidence.
- **`/dashboard/*` needs a session.** The driver seeds
  `localStorage["intvoicekit_auth"]` (`{user_id, user_name, api_key}`, key from
  `src/services/storage/storageService.ts`) before first paint. Without it
  every dashboard route renders the login page. The `api_key` is a stub — the
  backend is stubbed below, so it is never validated.
- **`/` and `/auth` need the opposite.** With a session seeded, `/` redirects
  straight to `/dashboard/assistant`, so the driver clears storage for those
  two routes.
- **Never wait for `networkidle`.** `/dashboard/assistant` and
  `/dashboard/make-call` hold a LiveKit socket open; the page is never idle.
  The driver waits for non-empty `document.body.innerText` instead.
- **`#root`'s first child is the invisible Radix toast region**, so
  `waitForSelector("#root > *")` resolves to an element that is never visible
  and times out. Do not "fix" the wait back to a selector.
- **The backend is stubbed.** Every off-origin request is fulfilled with `[]`,
  so pages render their empty state. No live API, no credentials needed. To
  test against the real backend, delete the `context.route` block — expect
  auth failures.
- **`NotFound.tsx` logs `404 Error:` on purpose.** The driver whitelists that
  one string; anything else on the console is a failure.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Failed to download Chrome for Testing … Download failure` | Re-run `npx playwright install chromium`; it is a network timeout, not a permission problem. |
| `dev server did not answer on http://localhost:8080` | Something else holds 8080 — `lsof -i :8080` and kill it. |
| `page.waitForSelector: Timeout 15000ms exceeded` | The route rendered nothing. Screenshot it with `shot` and read the console line printed above the failure. |
