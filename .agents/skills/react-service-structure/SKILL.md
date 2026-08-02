---
name: react-service-structure
description: >
  The canonical folder layout, naming conventions, and README standard for
  OneSpace React apps (Vite + TypeScript). Use when scaffolding a new React
  app, restructuring or cleaning up an existing one, deciding where a new
  component/hook/file belongs, reviewing a layout, or when asked to "structure
  this repo", "where should this file go", "fix the folder structure", or
  "update the README". Self-contained — works unchanged in any repo it is
  copied into.
---

# React Service Structure

Target state for every OneSpace React app. A new developer should understand
where things live from the directory names alone, without reading a single
component body.

> **A great developer seeks simplicity. An idiot developer seeks complexity.**

This skill defines the *target layout*. The discipline for getting there —
understand → audit → plan → **get approval** → execute → document — is in
"Working procedure" below. Never skip the approval step on a restructure.

**The repo's root `AGENTS.md` wins.** This skill is the default; where a repo's
`AGENTS.md` states something different (licence policy, extra layers, stricter
service contracts), follow `AGENTS.md` and treat this file as the fallback.

---

## Canonical layout

```
repo/
├── index.html
├── vite.config.ts              # build config only — no app logic
├── tsconfig.json
├── package.json                # single manifest; name matches the app
├── package-lock.json / bun.lockb / pnpm-lock.yaml   # exactly one lockfile
├── README.md                   # see "README standard" below
├── AGENTS.md                   # repo rules + mandatory skills for agents
├── Dockerfile
├── docker-compose.yml
├── .env.example                # every VITE_ var, safe placeholder values, no secrets
├── .agents/skills/             # repo-scoped agent skills
├── public/                     # static assets served as-is (favicon, robots.txt)
├── tests/                      # mirrors src/ layout
└── src/
    ├── main.tsx                # entry only: root render, providers, router mount
    ├── App.tsx                 # top-level shell + route table, no business logic
    ├── index.css               # global CSS / Tailwind layers / theme tokens
    ├── routes/                 # one directory per route/page; route = compose + render
    │   └── <route>/
    │       ├── <Route>.tsx     # the page
    │       ├── index.ts        # barrel export (routes only)
    │       └── …               # page-only components/hooks/constants live here
    ├── components/
    │   ├── ui/                 # dumb presentational primitives (shadcn CLI owns this)
    │   ├── common/             # app-aware but feature-agnostic; shared by 3+ routes
    │   └── <feature>/          # feature-scoped components + their hooks/types
    ├── hooks/                  # cross-feature reusable hooks (useDebounce, useIsMobile)
    ├── services/               # external I/O ONLY — one directory per upstream
    │   └── <upstream>/<upstream>Service.ts
    ├── lib/                    # framework-agnostic pure helpers (formatters, validators)
    ├── types/                  # shared TypeScript types/interfaces, one file per domain
    └── assets/                 # imported images/fonts/icons bundled by the build
```

Optional layers, added **only when a real need arrives** — never "for later":

- `src/stores/` — global state (Zustand/Redux/Context), one file per slice.
  Skip it while prop-drilling and route-local state still work.
- `src/features/<feature>/` — business logic modules. Promote a feature here
  once it grows orchestration that is not a component and not a service call.
- `src/styles/` — only if global CSS outgrows a single `index.css`.

Grow the tree by adding siblings at the right layer, never by nesting a new
concern inside an unrelated one.

## Layer rules

Each rule below exists because breaking it is what actually rots a frontend.

**`main.tsx` is wiring, not logic.** Root render, context providers, router
mount, global error boundary. Nothing else.

**`App.tsx` is the shell and the route table.** No data fetching, no business
rules.

**`components/ui/` is presentational only.** No `fetch`/API calls, no global
state reads, no routing. Props in, JSX out. These are usually vendored by the
shadcn CLI — treat them as third-party code: don't hand-edit them without a
reason, and don't put app logic in them. If a "ui" component needs to know
about the backend, it isn't a ui component.

**`components/common/` is app-aware, feature-agnostic.** Layout shells, empty
states, spinners, error banners — things that know how *this app* looks but
nothing about any one domain. Extraction bar: **used by 3+ routes**. Below
that, leave it in the route that uses it. Two copies is not duplication worth
an abstraction.

**`components/<feature>/` holds everything feature-scoped.** The feature's
components *and* its feature-only hooks, types, and constants live together in
one directory. Do not split one feature across two top-level layers.

**`routes/` composes, it does not implement.** A route file wires together
hooks, components, and services, and renders the result. A component used by
exactly one route lives in that route's directory, not in `components/`.

**`services/` is external I/O and nothing else.** One directory per upstream
system. "External" means anything outside the app's own memory: an HTTP API, a
third-party SDK, `localStorage`/`sessionStorage`, IndexedDB. Each request/
response service module exposes the pair:

- `call<X>Endpoint(...)` — performs the request. Returns `{ ok, json }`
  (`ServiceResponse<unknown>` in `src/types/http.ts`), or throws on failure for
  mutation endpoints.
- `condense<X>Response(json)` — normalises the raw payload into typed domain
  shapes from `src/types/`.

**Stateful SDK clients are exempt from `call`/`condense`.** Long-lived sessions
(LiveKit rooms, WebSocket clients, realtime subscriptions) are not
request/response, so the pair doesn't fit. They still live in `services/`, still
own all SDK imports, and still expose a typed API — but they may expose
connect/disconnect/subscribe instead. Document the exemption at the top of the
module.

**Condense at the boundary.** Upstream payloads are normalised the moment they
arrive. Envelope noise (nested `data.data`, inconsistent casing) must not leak
upward into components.

**One response shape assumption.** Components never branch on multiple possible
shapes of the same API response — normalise that in `services/`.

**`lib/` is pure.** No `fetch`, no `localStorage`, no React imports, no
`import.meta.env`. Given the same input it returns the same output. If it needs
the network, it's a service; if it needs hooks, it's a hook.

**`hooks/` vs feature hooks.** A hook used by two or more features lives in
`hooks/`. A hook that only makes sense inside one feature lives beside that
feature; a hook used by one route lives in that route's directory.

**`stores/` owns global state.** One file per logical slice (`authStore.ts`).
Components read via selectors, never mutate store internals from JSX.

**`tests/` mirrors `src/`.** `src/services/billing/billingService.ts` →
`tests/services/billing/billingService.test.ts`. Non-trivial logic and every
hand-written component get at least one runnable check. Vendored
`components/ui/` primitives are exempt — they are CLI-generated and tested
upstream.

**One responsibility per file.** If a component file needs a table of contents,
split it. Typical split, all beside the component:
`<Component>.tsx` (render) + `use<Component>.ts` (logic) + `constants.ts`
(static data). Rough smell threshold: a component past ~500 lines.

**One job per function/hook.** If describing it needs the word "and", split it.

**Names tell the story.**

- `PascalCase.tsx` — components (`AssistantForm.tsx`)
- `camelCase.ts` — hooks (`use` prefix), services (`<upstream>Service.ts`),
  types, helpers
- `kebab-case.tsx` — `components/ui/` only, because the shadcn CLI generates
  those names; do not fight it
- No `utils.ts`/`helpers.ts` dumping grounds — name the file after what it
  does (`formatDuration.ts`, `toast.ts`). No `tmp`, `data2`, `handleStuff`.

**Imports use the `@/` alias.** `@/components/ui/button`, never
`../../../components/ui/button`. Same-directory relative imports (`./constants`)
are fine.

**Barrels only in `routes/<route>/index.ts`.** Nowhere else. Barrel files
elsewhere create import cycles and defeat tree-shaking for no benefit.

**No dead code.** Delete unused components, commented-out JSX, disabled routes,
and dependencies nothing imports. Never leave them "just in case" — that's what
git history is for.

**Prop and return types are explicit.** No implicit `any`. Shared shapes go in
`types/`, not redefined per component.

## Where does this new file go?

| It … | Put it in |
|------|-----------|
| is a page/screen reachable by a URL | `src/routes/<route>/` |
| is used by exactly one route | that route's directory |
| is a reusable primitive with zero app knowledge | `src/components/ui/` |
| is app-aware, domain-agnostic, used by 3+ routes | `src/components/common/` |
| is reusable but only within one feature | `src/components/<feature>/` |
| talks to a backend, third-party SDK, or browser storage | `src/services/<upstream>/` |
| is a hook reused across two or more features | `src/hooks/` |
| encodes non-component business orchestration | `src/features/<feature>/` |
| holds global/shared app state | `src/stores/` |
| is a pure, framework-agnostic helper | `src/lib/` |
| is a shared TS type/interface | `src/types/` |
| is a test | `tests/`, mirroring the path of the module under test |

## README standard

The README is part of the deliverable, not an afterthought. **A structure
change is not complete until the README reflects it in the same change.**

Required sections, in order:

1. **Title + what it is** — one paragraph, plus the core concepts if the app
   has non-obvious domain logic
2. **Requirements** — Node/Bun version, package manager, browser targets
3. **Installation** — local (install + dev server command) *and* Docker
4. **Environment** — table of every `VITE_` var: name, default, note. Must
   match `.env.example` exactly
5. **Routes** — quick-reference table: path, page component, purpose
6. **Project Structure** — the directory tree with a one-line comment per entry
7. **State management** — what lives in stores vs local component state, and why
8. **Stack** — layer → technology table

Add a licence section only if the repo has a licence policy — check `AGENTS.md`
first; some repos deliberately ship without one.

Rules: if the README exists, read it before changing anything. If it is
missing, create it. After any change, re-check the **whole** README for
staleness — env vars, routes, and the structure tree drift first and fastest.

## Working procedure

1. **Read before changing, and capture a baseline.** Walk the tree, read the
   entrypoint, map component dependencies. Record the current output of the
   lint, test, and build commands — you cannot claim "no regressions" without
   a number to compare against. Never restructure code you have not read.
2. **Audit** against the layer rules above; list each violation with its path.
3. **Plan** — before/after tree, file splits, component decompositions,
   renames with rationale, docs to update. **Present the plan and wait for
   approval.**
4. **Execute** — `git mv` to preserve history, move code, split oversized
   files, update every import, delete dead code. External behaviour must not
   change: no feature changes, no regressions. Verify after each phase, not
   only at the end.
5. **Document** — update the README (tree, env, routes) and `AGENTS.md` (new
   layers, new conventions), and add prop-type/JSDoc comments to new public
   components and hooks.
6. **Verify** — the app still builds and boots, and lint / test / build results
   are no worse than the baseline from step 1. Manually click through every
   route touched by a component extraction, including its mobile path.

## New app scaffold

Minimum viable repo — do not scaffold layers nothing uses yet.

```
index.html  vite.config.ts  tsconfig.json  package.json
README.md  AGENTS.md  .env.example  .gitignore
Dockerfile  docker-compose.yml
public/
src/main.tsx  src/App.tsx  src/index.css
src/routes/  src/components/ui/
src/services/  src/lib/  src/types/
tests/
```

Add `src/components/common/`, `src/hooks/`, `src/stores/`, `src/features/`, and
`src/assets/` when the first real need arrives.

---

## Porting this skill to another repository

1. Copy the whole `react-service-structure/` directory into the target repo's
   `.agents/skills/`.
2. Mirror it to the other agent toolchains in use, so there is one source of
   truth:
   ```bash
   mkdir -p .claude/skills .opencode/skills
   ln -s ../../.agents/skills/react-service-structure .claude/skills/react-service-structure
   ln -s ../../.agents/skills/react-service-structure .opencode/skills/react-service-structure
   ```
   If the toolchain expects flat `.md` files instead of skill directories,
   symlink `SKILL.md` to `<toolchain>/skills/react-service-structure.md`.
3. Ensure the repo has a root `AGENTS.md` naming this skill as mandatory, and
   recording anything this skill defers to it — licence policy, extra layers,
   and the lint/test/build baseline.

This skill has no external dependencies. It does not require any other skill,
script, or tool to be present.
