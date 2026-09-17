# Cognition Workspace

One place for Operations and Compliance teams to find internal tools and complete their daily work. The first tool, **KYC Case Review**, lets reviewers find cases, assign ownership and record decisions with a shared history. Business users can request new tools and changes through Devin Cloud, while Engineering maintains the shared foundation and review controls.

**This is a local demonstration with synthetic accounts and cases, not a production deployment.**

## What works

| Use case | Available today |
| --- | --- |
| Find an internal tool | Overview (`/`) with a catalog searchable by name, description or responsible team |
| Review KYC cases | KYC Case Review (`/tools/kyc`) with customer search, status/assignee/country filters, pagination and case details |
| Coordinate and record work | Assignment/reassignment, approval, rejection, escalation and persisted newest-first activity |
| Request a tool or change | Devin Cloud skills that take a business request through discovery, implementation, verification and PR delivery |

Refunds Dashboard and Feature Flag Admin are **Preview only** catalog entries: navigation is disabled and no pages exist.

### KYC review workflow

1. Find a case using search and filters, then open its details.
2. Assign or reassign operational ownership to a Reviewer.
3. Record an allowed decision, with a reason when required.
4. See the saved result and actor-attributed history. If another update wins first, reload the details after the conflict.

Filters compose; **Clear filters** restores the full queue. Selected filters reset on a full page reload. Country is visible in both the queue and details. Risk scores are informational and never trigger decisions.

### KYC roles and transitions

| Role | Permissions |
| --- | --- |
| Viewer | Read the workspace, queue, details and history |
| Reviewer | Also assign/reassign nonterminal cases to an existing Reviewer and record allowed decisions |

Assignment represents operational ownership, **not exclusive permission**. Other authorized Reviewers may act on the case, including making a decision when someone else is assigned.

| Current status | Allowed decisions |
| --- | --- |
| Pending | Approve, Reject, Escalate |
| Escalated | Approve, Reject |
| Approved / Rejected | None; both decisions and assignment are read-only |

Rejection requires a nonblank reason; approval and escalation accept an optional reason. Every successful write records the authenticated actor, UTC timestamp and old/new state atomically with the case. An expected version rejects stale or repeated writes. History is an application event log, not a tamper-proof audit system.

## Architecture

A single **Next.js App Router** application, built with TypeScript, Tailwind CSS and installed Be UI source. Tools share the workspace foundation while keeping their business rules in tool-specific modules.

| Layer | Responsibility |
| --- | --- |
| Workspace shell and registry | Authenticated layout, persistent navigation and catalog; `lib/tool-registry.ts` supplies one typed source of tool metadata |
| Shared UI | Reusable queue, detail panel, status, action and feedback components, following [DESIGN.md](DESIGN.md) |
| Tool modules | KYC routes and compositions in `app/` and `components/kyc/`; domain types, validation and presentation in `lib/kyc/` |
| Server identity and policy | Better Auth database-backed sessions and server-controlled roles; protected reads and writes independently enforce access |
| Persistence | Drizzle with local SQLite; KYC mutations and history commit in one transaction with version checks |

Registry access labels describe roles; they do not authorize requests. Database and session access stay server-only. The strict KYC presentation configuration controls supported filters, column order and page size (10/25/50), without changing permissions or decision rules.

New tools register once, reuse the shell and shared components, and own their domain behavior. See [architecture and extension points](docs/architecture.md) for the module map, API boundaries and implementation steps.

## Scope and limitations

- All data and sign-in accounts are synthetic. Public signup is disabled.
- External document verification, sanctions/risk automation, bulk actions, account recovery, production SSO, user administration and production hosting are outside scope. SQLite requires persistent writable storage.
- Skills deliver PRs, not production deployments or merge permission. Engineering policy requires authorized non-author review outside the approved presentation-only surface.
- CI, the presentation-policy evaluator and CODEOWNERS are implemented, but independent approval is **not universally enforced** for owner-authored changes. The prototype trusts repository writers not to forge checks; auto-merge remains disabled and the full live enforcement matrix is not demonstrated. See [security](docs/security.md) and [merge controls](docs/merge-controls.md) for evidence and limits.

## Run locally

Use **Node 24.18.1**, **npm 11.11.1** and [NVM](https://github.com/nvm-sh/nvm#installing-and-updating) loaded in your shell. The SQLite source rebuild requires Python 3, make and a C++ compiler. From the repository root:

```sh
nvm install
nvm use
npm install --global npm@11.11.1
npm ci
npm rebuild better-sqlite3 --build-from-source --foreground-scripts
npm run setup:local
npm run db:migrate
npm run db:seed
npm run dev
```

Open http://localhost:3000. Setup creates an ignored `.env` with a generated session secret; seed reruns preserve existing work. No external service accounts are required.

For environment settings, runtime pin rationale, fresh databases, the full command table, tests and troubleshooting, see the [development guide](docs/development.md). Do not run dev and build simultaneously in the same checkout.

### Synthetic sign-in accounts

All three local-only accounts use password **`Synthetic-demo-2026!`**:

| Email | Name | Role |
| --- | --- | --- |
| `viewer@example.test` | Morgan Lee | Viewer |
| `alex@example.test` | Alex Chen | Reviewer |
| `sam@example.test` | Sam Rivera | Reviewer |

Better Auth hashes passwords and manages database-backed sessions. **Never reuse these published credentials with real data or an internet-facing production deployment.**

## Engineering guidance and Devin Cloud skills

Describe the business outcome and acceptance examples in Devin Cloud; no source paths or technical PRD are required:

- **New tool:** `@skills:build-internal-tool` — [discovery, confirmed specification, implementation and PR](.agents/skills/build-internal-tool/SKILL.md).
- **Existing tool:** `@skills:change-internal-tool` — [locate the relevant capabilities, implement, verify and deliver a PR](.agents/skills/change-internal-tool/SKILL.md).

Choose the relevant skill for the task. These are reusable procedures, not runtime or merge enforcement. See the [session setup guide](docs/development.md#preparing-a-fresh-devin-cloud-session) and [historical workflow evidence](docs/development.md#project-history).

| Reference | Contents |
| --- | --- |
| [Architecture](docs/architecture.md) | Module boundaries, APIs and adding a tool |
| [Development guide](docs/development.md) | Setup, commands, tests, troubleshooting and project history |
| [Engineering entry point](AGENTS.md) | Repository navigation, checks and branch/PR workflow |
| [Tool standards](docs/internal-tools-standards.md) | Discovery, interaction states and definition of done |
| [Design system](DESIGN.md) | Shared tokens, components and interaction conventions |
| [Security](docs/security.md) / [merge controls](docs/merge-controls.md) | Access requirements, review policy, enforcement evidence and gaps |

## Third-party licenses

Installed Be UI source retains its [MIT notice](licenses/beui-MIT.txt); the bundled Geist font retains its [SIL OFL notice](licenses/geist-OFL.txt). See [integration details and upstream lint exceptions](docs/development.md#be-ui-integration-and-licenses) before updating vendor components.
