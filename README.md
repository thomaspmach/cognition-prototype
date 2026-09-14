# Cognition Workspace

A shared internal-tools workspace built with Next.js App Router, TypeScript, Tailwind CSS and actual Be UI source.

The shell from [#1](https://github.com/thomaspmach/cognition-prototype/issues/1) and Engineering standards from [#2](https://github.com/thomaspmach/cognition-prototype/issues/2) now host the functional [KYC workflow (#3)](https://github.com/thomaspmach/cognition-prototype/issues/3): authenticated case review with SQLite persistence. All accounts and cases are synthetic. This is a local demonstration, not a production deployment.

## Run locally

Use Node **24.19.0** (`.nvmrc`) and npm **11.11.1** (`packageManager` in `package.json`). With an existing NVM installation:

```sh
nvm install
nvm use
npm install --global npm@11.11.1
npm ci
npm run setup:local
npm run db:migrate
npm run db:seed
npm run dev
```

Open http://localhost:3000. `setup:local` generates a random session secret into ignored `.env` only when that file does not exist. It preserves existing settings. `.env.example` documents `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` and `SQLITE_PATH`; the default database is `.data/workspace.sqlite`. Run migrations before seeding or starting the application. When changing the host or port, set `BETTER_AUTH_URL` to that exact origin.

The font is bundled locally. `npm ci` uses the committed lockfile; do not mix package managers. npm 11 is pinned because npm 10's dependency resolver crashes on this test dependency tree.

### Synthetic sign-in accounts

All three local-only accounts use password **`Synthetic-demo-2026!`**:

| Email | Name | Role |
| --- | --- | --- |
| `viewer@example.test` | Morgan Lee | Viewer |
| `alex@example.test` | Alex Chen | Reviewer |
| `sam@example.test` | Sam Rivera | Reviewer |

Better Auth hashes the passwords and manages database-backed sessions. Public signup is disabled. These published demonstration credentials must never be reused with real data or an internet-facing production deployment.

### Data setup and repeatability

Drizzle migrations are committed under `drizzle/`; `npm run db:generate` generates a migration after schema changes. `db:migrate` and `db:seed` are repeatable: the seed inserts missing synthetic accounts and twelve cases, preserves existing password hashes, assignments, decisions and events, and does not reset previous work.

For an explicitly fresh demonstration database, stop the application and choose a **new** path in the same shell:

```sh
export SQLITE_PATH=".data/fresh-$(date +%s).sqlite"
npm run db:migrate
npm run db:seed
npm run dev
```

This leaves the previous database intact. Keep using that exported path, or set it in `.env`, to reopen the new database later. SQLite requires a persistent writable disk; serverless durability, backups and deployment are outside this prototype.

To run a production build:

```sh
npm run build
npm run start
```

## Commands and checks

| Command | Purpose |
| --- | --- |
| `npm run dev` | Next development server on port 3000 |
| `npm run lint` | ESLint with no warnings allowed |
| `npm run typecheck` | Generate Next route types, then TypeScript checks |
| `npm test` | Vitest UI/registry tests, then server integration tests |
| `npm run test:server` | Migrations, seeded auth, permissions, transitions, filters, atomicity and conflicts |
| `npm run test:watch` | Vitest watch mode |
| `npm run check` | Lint, typecheck and unit/component tests |
| `npm run build` | Production compilation and static route generation |
| `npm run start` | Serve the production build |
| `npm run test:e2e` | Playwright tests against a production server on port 3100 |
| `npm run setup:local` | Create local environment with a random session secret if absent |
| `npm run db:generate` | Generate Drizzle migrations from the schema |
| `npm run db:migrate` | Apply committed migrations to the selected SQLite database |
| `npm run db:seed` | Insert missing synthetic data without resetting existing work |

For browser checks after installation:

```sh
npx playwright install chromium
npm run check
npm run build
npm run test:e2e
```

On a Linux machine missing browser system libraries, use `npx playwright install --with-deps chromium` with appropriate OS package permissions. Playwright starts and stops its own production server; port 3100 must be free. Do not run `next dev` and `next build` simultaneously in the same checkout.

The browser suite creates a separate, freshly migrated and seeded SQLite database under `.data` on each run and signs in seeded roles. It covers the workspace regressions, login/logout, search/filters, assignment/reassignment, all decisions, persistence after refresh, read-only controls, request recovery and direct HTTP permission/validation/conflict checks. Server integration tests additionally inject event-insert failures to prove transaction rollback. HTML reports are generated under `playwright-report`; failure artifacts are in `test-results`. Session state, databases and test/build output are ignored by Git. Test database files are retained locally; do not run concurrent Playwright suites in the same checkout.

## What works

- **Overview (`/`):** catalog driven by one typed registry; searchable by name, description or responsible team.
- **KYC Case Review (`/tools/kyc`):** customer search, status/assignee filters, case details, assignment/reassignment, decisions and chronological history. Country is visible in the queue and details; the reusable country filter is tested but disabled in the initial `lib/kyc/presentation.ts` configuration.
- **Refunds Dashboard and Feature Flag Admin:** visible **Preview only** entries with disabled navigation, no links and no pages.

Workspace pages and data endpoints require a server-verifiable session. Registry access metadata describes roles; the server helpers enforce them.

### KYC roles and transitions

| Role | Permissions |
| --- | --- |
| Viewer | Read the workspace, queue, details and history |
| Reviewer | Also assign/reassign nonterminal cases to an existing Reviewer and record allowed decisions |

**Assignment represents operational ownership, not exclusive permission. Other authorized Reviewers may act on the case**, including making a decision when someone else is assigned.

| Current status | Allowed decisions |
| --- | --- |
| Pending | Approve, Reject, Escalate |
| Escalated | Approve, Reject |
| Approved / Rejected | None; both decisions and assignment are read-only |

Rejection requires a nonblank reason; approval and escalation accept an optional reason. Risk scores are informational and never trigger decisions. Every successful write stores the authenticated actor, UTC timestamp and old/new state in history, atomically with the case. An expected version rejects stale or repeated writes; reload details after a conflict. History is an application event log, not a tamper-proof audit system.

Document verification, sanctions/risk automation, bulk actions, signup/recovery, enterprise SSO and user administration are outside scope. Bounded presentation configuration and independently enforced merge controls belong to #4; its contract/gate and the broader #5–#6 workflows are not implemented here.

Next's automatic agent-instruction generation is disabled (`agentRules: false`); the project maintains its own [AGENTS.md](AGENTS.md).

## Engineering guidance and Devin Cloud skills

Start with [AGENTS.md](AGENTS.md) for commands, module navigation and branch/PR practice. Read [architecture](docs/architecture.md) for extension steps, [tool standards](docs/internal-tools-standards.md) for discovery and completion criteria, [security](docs/security.md) for control boundaries, and [DESIGN.md](DESIGN.md) before UI changes.

Use the two repository skills for separate tasks:

- [build-internal-tool](.agents/skills/build-internal-tool/SKILL.md): turn a business need into a confirmed specification, then implementation and a PR.
- [change-internal-tool](.agents/skills/change-internal-tool/SKILL.md): describe an outcome for an existing tool; Devin locates the relevant code/capabilities, verifies the change and delivers a PR.

In Devin Cloud, include `@skills:build-internal-tool` or `@skills:change-internal-tool` with the business request. No source paths or technical PRD are required from the requester. [Cloud Skills documentation](https://docs.devin.ai/product-guides/skills) describes discovery, invocation and supported format. Each skill lives under `.agents/skills/<skill-name>/SKILL.md` with YAML `name` and `description`; choose one rather than assuming simultaneous active skills.

These are reusable procedures, not runtime or merge enforcement. New tools and changes currently need human Engineering review. KYC application checks are distinct from the fresh-session Cloud workflow validation tracked in [issue #5](https://github.com/thomaspmach/cognition-prototype/issues/5). Refine instructions against #4 when its controls arrive.

## Project map

```text
app/                       Routes, root layout and global design tokens
app/(workspace)/           Authenticated shell, Overview and KYC page
app/api/                   Better Auth and protected KYC route handlers
components/workspace/      Shell and catalog
components/kyc/            Functional KYC queue, details, actions and history
components/shared/         Queue, detail, status, feedback and heading patterns
components/motion/         Installed Be UI source
lib/tool-registry.ts        Typed catalog/navigation metadata
lib/kyc/                   Typed domain model, strict validation and initial presentation
lib/server/                Server-only auth, database, schema and KYC service
drizzle/                   Generated, committed SQLite migrations
scripts/                   Local environment, migration and synthetic seed commands
licenses/                  Third-party license notices
tests/                     Focused unit/component and browser tests
DESIGN.md                  Implemented visual specification
```

Available/foundation entries require a `/tools/...` route; preview entries require `route: null`. The discriminated registry type makes accidental preview routes invalid. Each tool owns its route content within the authenticated workspace layout.

Secrets (`.env*`, private keys), local SQLite files, dependencies, test output and generated Next files are excluded by `.gitignore`. Never commit operational credentials.

## Be UI integration and licenses

There is no `beui` runtime package. The following actual source was installed from the [Be UI shadcn registry](https://beui.dev/docs/ai-agents.md), configured as `@beui` in `components.json`:

```sh
npx --yes shadcn@4.21.0 add \
  @beui/animated-sidebar @beui/table @beui/drawer \
  @beui/input @beui/animated-badge @beui/button-stateful
```

The registry also installs table internals, checkbox, button base, shared-layout and presence/hover/touch/easing helpers. Required runtime dependencies are `motion`, `lucide-react`, `clsx`, `tailwind-merge` and `@tanstack/react-virtual`. Their versions and all other dependencies are pinned in `package.json`. `focus-trap-react` supplies keyboard containment and focus return around the drawer.

Source is retained unmodified, including provenance comments; workspace styling and Next links live in the compositions. The MIT notice is in `licenses/beui-MIT.txt`. The locally bundled Geist font (`@fontsource-variable/geist`) retains its SIL OFL notice in `licenses/geist-OFL.txt`. Design inspiration and tokens are documented in `DESIGN.md`.

ESLint checks the entire tree. Narrow overrides for installed Be UI source allow its synchronous DOM measurements, shared mutable refs, TanStack Virtual compatibility and empty interfaces; the stateful button additionally measures its label every render. Next's React Compiler is not enabled. These exceptions do not apply to workspace code; rules-of-hooks and other checks still apply to the installed source. Review upstream source changes before updating registry components.
