# Engineering entry point

## Read first

- Read the requested issue and [parent epic #7](https://github.com/thomaspmach/cognition-prototype/issues/7) for scope and dependencies. Implement only the requested work.
- Read [architecture](docs/architecture.md), [tool standards](docs/internal-tools-standards.md) and [security](docs/security.md). They distinguish current capabilities from later requirements.
- Read [DESIGN.md](DESIGN.md) before UI changes. Its implemented tokens and components take precedence over the epic's initial visual direction.
- For a new tool, use [build-internal-tool](.agents/skills/build-internal-tool/SKILL.md). For changes to an existing tool, use [change-internal-tool](.agents/skills/change-internal-tool/SKILL.md). Use the relevant procedure independently; do not assume simultaneous skill composition.

## Setup and checks

Run from the repository root with an existing NVM installation loaded in the shell. In the standard Linux Devin environment, load it with `source /home/ubuntu/.nvm/nvm.sh`; elsewhere use your NVM installation's location.

```sh
nvm install
nvm use
npm install --global npm@11.11.1
npm ci
npm rebuild better-sqlite3 --build-from-source --foreground-scripts
npm run setup:local
npm run db:migrate
npm run db:seed
npx playwright install chromium
```

The pins are Node **24.18.1** in [.nvmrc](.nvmrc) and npm **11.11.1** in [package.json](package.json). Keep the committed lockfile and package manager. If setup fails, inspect the checkout, working directory and logs before changing anything; do not change pins or skip checks to hide an environment failure.

Node 24.18.1 is a temporary pin for the upstream [native-addon cleanup regression](https://github.com/nodejs/node/issues/65446). After selecting it, run both the clean install and source rebuild above: switching Node alone can retain an incompatible `better-sqlite3` binary, and `npm ci` can obtain a cached or downloaded prebuild. The rebuild bypasses prebuilds and compiles against the selected Node headers. It requires Python 3, make and a C++ compiler (on Ubuntu: `python3 make g++`). Revisit the pin when Node 24 includes the [complete upstream fix](https://github.com/nodejs/node/pull/65943).

```sh
npm run check
npm run build
npm run test:e2e
```

`check` runs lint, typecheck and Vitest. Typecheck generates Next route types before running TypeScript. Playwright uses the production build and manages its own server on port **3100**, which must be free. Run checks after the final change; report failures and unverified criteria accurately.

For local use, run `npm run dev`, or `npm run build` followed by `npm run start`; both servers default to port **3000**. Do not run dev and build in the same checkout simultaneously. Confirm listener ownership before stopping a server. [README](README.md#run-locally) has setup details, synthetic sign-in accounts and the full command table. `setup:local` creates an ignored `.env` with a generated session secret; migrate and seed before startup. Seed reruns preserve existing work. Playwright uses its own fresh database and seeded sessions.

## Module map

| Location | Responsibility |
| --- | --- |
| `app/` | Routes, root layout and design tokens |
| `app/(workspace)/` | Authenticated shell, Overview and functional KYC page |
| `app/api/` | Better Auth and protected case reads/mutations |
| `components/workspace/` | Persistent shell, catalog and tool icons |
| `components/kyc/`, `lib/kyc/` | KYC composition, typed model/validation and initial presentation |
| `lib/server/`, `drizzle/`, `scripts/` | Server auth/data, schema/migrations and local setup |
| `components/shared/` | Reusable queue, detail, heading, status and feedback compositions |
| `components/motion/` | Installed Be UI source; preserve attribution and avoid casual vendor edits |
| `lib/tool-registry.ts` | Typed metadata shared by catalog and sidebar |
| `tests/` | Vitest tests; Playwright specs in `tests/e2e/` |

Follow the [extension steps](docs/architecture.md#adding-a-tool) rather than duplicating navigation. Use existing typed APIs and dependencies; inspect their implementation before extending them. Keep shared UI generic and business rules within their tool. Preserve the license notices and the narrow upstream lint exceptions described in the README.

## Branch and PR workflow

1. Inspect the working tree and fetch the latest `main`. Preserve unrelated work. For new work, branch from `origin/main` using `git checkout -b devin/$(date +%s)-<slug> origin/main`, replacing `<slug>` with a short task name.
2. Keep edits within the approved scope. Follow the relevant skill's discovery and confirmation steps; the requester need not know source paths.
3. Verify the [definition of done](docs/internal-tools-standards.md#definition-of-done) and review the complete change with `git diff --merge-base origin/main`, including new files after staging. Do not weaken tests, policies or hooks to obtain a pass.
4. Open a PR referencing the issue, with behavior, acceptance-criterion status/evidence, checks and unresolved dependencies. Changes to instructions also require human review. Follow the [review boundary](docs/security.md#review-and-merge-boundary); skill output is never merge permission.
5. Share the PR and remaining blockers, then wait for review. Do not push directly to main or merge as part of these procedures. Local execution is not production publication.
