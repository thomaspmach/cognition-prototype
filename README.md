# Cognition Workspace

A shared internal-tools foundation built with Next.js App Router, TypeScript, Tailwind CSS and actual Be UI source.

This implements [issue #1](https://github.com/thomaspmach/cognition-prototype/issues/1) within [epic #7](https://github.com/thomaspmach/cognition-prototype/issues/7). It is a local UI prototype: no login, database, customer data or business actions.

## Run locally

Use Node **24.19.0** (`.nvmrc`) and npm **11.11.1** (`packageManager` in `package.json`). With an existing NVM installation:

```sh
nvm install
nvm use
npm install --global npm@11.11.1
npm ci
npm run dev
```

Open http://localhost:3000. No environment variables, credentials, migrations or seed step are required. The font is bundled locally. `npm ci` uses the committed lockfile; do not mix package managers. npm 11 is pinned because npm 10's dependency resolver crashes on this test dependency tree.

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
| `npm test` | Focused Vitest registry and catalog tests |
| `npm run test:watch` | Vitest watch mode |
| `npm run check` | Lint, typecheck and unit/component tests |
| `npm run build` | Production compilation and static route generation |
| `npm run start` | Serve the production build |
| `npm run test:e2e` | Playwright tests against a production server on port 3100 |

For browser checks after installation:

```sh
npx playwright install chromium
npm run check
npm run build
npm run test:e2e
```

On a Linux machine missing browser system libraries, use `npx playwright install --with-deps chromium` with appropriate OS package permissions. Playwright starts and stops its own production server; port 3100 must be free. Do not run `next dev` and `next build` simultaneously in the same checkout.

The browser suite covers route changes, persistent sidebar state, disabled previews and direct 404s, keyboard focus in the detail panel, reduced motion, contained table overflow and mobile navigation. HTML reports are generated under `playwright-report`; failure artifacts are in `test-results`. These and all build artifacts are ignored by Git.

## What works

- **Overview (`/`):** catalog driven by one typed registry; searchable by name, description or responsible team.
- **KYC Case Review (`/tools/kyc`):** minimal foundation demonstrating shared navigation, an empty queue, status/feedback and a read-only detail panel example.
- **Refunds Dashboard and Feature Flag Admin:** visible **Preview only** entries with disabled navigation, no links and no pages.

The registry's access requirements describe planned roles. They do not restrict access. Authentication, persisted cases, filters, assignment and decisions belong to issue #3. Engineering standards/skills, configuration controls and later epic work are not implemented here.

Next's automatic agent-instruction generation is disabled (`agentRules: false`); repository instructions are reserved for issue #2.

## Project map

```text
app/                       Routes, root layout and global design tokens
components/workspace/      Shell, catalog and minimal KYC composition
components/shared/         Queue, detail, status, feedback and heading patterns
components/motion/         Installed Be UI source
lib/tool-registry.ts        Typed catalog/navigation metadata
lib/                       Be UI helpers
licenses/                  Third-party license notices
tests/                     Focused unit/component and browser tests
DESIGN.md                  Implemented visual specification
```

Available/foundation entries require a `/tools/...` route; preview entries require `route: null`. The discriminated registry type makes accidental preview routes invalid. There is no generic tool renderer: each tool owns its route content and uses the root shell.

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
