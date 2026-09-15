# Architecture and extension points

## Implemented workspace

This is one Next.js App Router application, using TypeScript, Tailwind and actual Be UI source. Issues #1–#2 supply the shared workspace and standards; #3 adds authenticated KYC review. [Epic #7](https://github.com/thomaspmach/cognition-prototype/issues/7) owns product scope.

| Responsibility | Current implementation |
| --- | --- |
| Root / authenticated shell | [app/layout.tsx](../app/layout.tsx) supplies styles; [workspace layout](../app/(workspace)/layout.tsx) verifies the session and wraps protected content in `WorkspaceShell` |
| Persistent navigation/header | [workspace-shell.tsx](../components/workspace/workspace-shell.tsx) consumes the shared registry and retains sidebar state through client navigation |
| Overview catalog/search | [Overview](../app/(workspace)/page.tsx) and [tool-catalog.tsx](../components/workspace/tool-catalog.tsx) |
| Tool metadata | [lib/tool-registry.ts](../lib/tool-registry.ts): `ToolId`, `WorkspaceRole`, `WorkspaceTool`, `toolRegistry`, `availabilityLabels`, `filterTools` |
| Icon mapping | [tool-icon.tsx](../components/workspace/tool-icon.tsx): `ToolIcon` maps each `ToolId` |
| KYC route/composition | [KYC page](../app/(workspace)/tools/kyc/page.tsx) and [kyc-queue.tsx](../components/kyc/kyc-queue.tsx) |
| Identity / authorization | [auth.ts](../lib/server/auth.ts), [access.ts](../lib/server/access.ts), [page-access.ts](../lib/server/page-access.ts) |
| Data / business operations | [database.ts](../lib/server/database.ts), [schema.ts](../lib/server/schema.ts), [kyc.ts](../lib/server/kyc.ts) |
| Visual tokens | [app/globals.css](../app/globals.css), explained in [DESIGN.md](../DESIGN.md) |

KYC has a searchable/filterable queue, case details, assignment and decisions with persisted history. Workspace pages independently require a server session, and the data service protects every read/write. The registry's role names are descriptive metadata. Refunds and Feature Flags are previews with no routes.

### Shared UI to reuse

| Component | Contract and purpose |
| --- | --- |
| [PageHeader](../components/shared/page-header.tsx) | `eyebrow`, `title`, `description`, optional children |
| [QueueTable](../components/shared/queue-table.tsx) | Generic `TableProps<T>` wrapper; accepts typed columns, data, row identity and table states |
| [DetailPanel](../components/shared/detail-panel.tsx) | Controlled `open`/`onOpenChange`, title, description and children; drawer with focus containment/return |
| [StatusBadge](../components/shared/status-badge.tsx) | Text children and optional `AnimatedBadgeStatus` |
| [ActionButton](../components/shared/action-button.tsx) | Styled `StatefulButtonProps` wrapper; callers supply action behavior |
| [Feedback](../components/shared/feedback.tsx) | `info`, `success` or `error` tone; status/alert semantics |
| [Input](../components/motion/input.tsx) | Be UI input; catalog shows label, controlled value and `onChange` usage |

Inspect the underlying [table API](../components/motion/table/types.ts) and [stateful button](../components/motion/button/stateful.tsx) when wiring loading or interaction states. A shared visual component does not supply data fetching, permission checks or business actions.

## Adding a tool

Follow the [build skill](../.agents/skills/build-internal-tool/SKILL.md) for intake and confirmation. The following are extension instructions, not additional tools implemented by issue #2.

1. **Choose a route and module boundary.** Add an App Router page at `app/(workspace)/tools/<tool-id>/page.tsx`, using KYC as the composition example and calling `requirePageActor()` in the page itself as well as relying on the layout. Route groups do not change the public URL. Keep tool-specific components/rules together, as in `components/kyc` and `lib/kyc`; extract shared code only when it has a real reusable contract.
2. **Register once.** Extend `ToolId` and add an entry in `lib/tool-registry.ts` with unique id, name, description, responsible team, access requirements and availability. Extend the `icons` mapping in `components/workspace/tool-icon.tsx`. Available/foundation entries require a `/tools/...` route; preview entries must use `route: null`. Do not add placeholder pages for previews.
3. **Check both registry consumers.** Sidebar navigation and catalog cards read `toolRegistry`; do not create a second navigation list. Keep labels, links and availability consistent with the actual capability.
4. **Compose the UI.** Use the shared components above and the implemented design tokens. The authenticated workspace layout supplies navigation and the main landmark. Define actual loading, empty, validation-error, denied-access and success behavior as applicable; see [tool standards](internal-tools-standards.md).
5. **Define and implement access before exposing protected behavior.** Treat registry roles as visibility metadata only. Read the [security requirements](security.md#server-and-data-requirements-for-functional-tools). Protect route reads, server actions/handlers and data access independently. Reuse actual server helpers when they exist; if missing, include them as explicit implementation dependencies in the confirmed specification. Do not substitute hidden buttons or a client-controlled role.
6. **Add data setup when needed.** Follow the integration boundary below. Keep server-only database/session access out of client components and the shared registry. Place business rules with the tool; promote only reusable identity, authorization or event-recording mechanisms to shared modules.
7. **Add meaningful tests.** Extend the existing [registry](../tests/tool-registry.test.ts) and [catalog](../tests/tool-catalog.test.tsx) contracts for new metadata/destinations while preserving preview safety. Add Vitest UI coverage under `tests/` using `*.test.ts` or `*.test.tsx`; [vitest.config.ts](../vitest.config.ts) uses jsdom. Server/database tests belong under `tests/server/`, using the Node environment and disposable in-memory database in [vitest.server.config.ts](../vitest.server.config.ts). Add browser specs under `tests/e2e/`, following [workspace.spec.ts](../tests/e2e/workspace.spec.ts) and [playwright.config.ts](../playwright.config.ts). Verify navigation, actual behavior and direct denied operations, not just component existence.
8. **Verify and document the result.** Run the [repository commands](../AGENTS.md#setup-and-checks), map results to the confirmed acceptance criteria, and update the README and these references whenever new commands, modules or capabilities are introduced.

## Server and data integration

[Better Auth](../lib/server/auth.ts) uses its Drizzle SQLite adapter with database-backed sessions, email/password login, disabled signup and server-controlled roles. Session lookup is followed by a current database role lookup. The client uses the library's `signIn.email` and `signOut`; `/api/auth/[...all]` delegates to its Next.js handler. Password hashing comes from Better Auth.

`lib/server/database.ts` opens SQLite with foreign keys, WAL and a busy timeout. Drizzle schemas cover users/accounts/sessions/verifications, cases and events. Generated migrations live in `drizzle/`. See [README setup](../README.md#run-locally) for verified environment, migration, seed, sign-in and fresh-database commands.

KYC's boundaries:

- `lib/kyc/model.ts`: client/server DTOs, strict Zod input validation and transition definitions.
- `GET /api/kyc/cases`: authenticated search and status/assignee/country filtering.
- `GET /api/kyc/cases/[id]`: authenticated details and event history.
- `POST /api/kyc/cases/[id]`: Reviewer session plus same-origin check, strict mutation validation and transactional service.
- `lib/server/kyc.ts`: rechecks authorization, validates current state and assignee, applies a versioned mutation and event in one immediate SQLite transaction. A unique `(case_id, version)` event constraint reinforces consistency. Conflicts return 409; failed operations do not record successful events.
- `components/kyc`: shared-component composition, request/error handling and reload after conflicts. A `case` URL parameter keeps the detail panel open through refresh.
- `lib/server/diagnostics.ts`: safe, structured stderr incidents for unexpected KYC API and page-session failures. API responses carry a matching reference; expected validation/access/conflict errors retain their messages and statuses.
- `app/error.tsx`: recovery UI for failures beneath the root layout, including workspace-layout session failures. Retry refreshes server data and resets the boundary; it does not replay mutations. See [diagnostics and limits](../README.md#diagnosing-unexpected-failures).

Assignment is nonexclusive operational ownership: any authorized Reviewer can act on any nonterminal case. [README roles/transitions](../README.md#kyc-roles-and-transitions) describes the complete rules. All data is synthetic; history is not a tamper-proof audit system.

`lib/kyc/presentation.json` is the only pre-authorized presentation surface. `presentation.ts` validates the imported value through `presentation-schema.ts`; the trusted merge evaluator also validates raw JSON, byte size and Git mode. The current configuration enables status, assignee and country filters; country was enabled by the configuration-only change in #5. Configuration may choose unique supported filters, reorder all six required columns, and select page sizes 10/25/50. The KYC composition retains its fixed column renderers and pages the authorized returned records; configuration cannot change server authorization, fetching rules or decisions.

`scripts/check-kyc-presentation.ts` uses only Node built-ins and the dependency-free schema, so the privileged policy job installs no repository dependencies. TypeScript extension imports are enabled for Node's native type stripping. Its complete-diff classification is explanatory; native required Code Owner review enforces the outside-scope boundary. Owner-applied protections and the limited live evidence are recorded in [merge controls](merge-controls.md); enforcement trusts writers not to spoof checks. See [security](security.md#review-and-merge-boundary).

## Verification boundary

Vitest covers the registry, filters and server integration; Playwright covers login, the workspace, KYC workflows and direct HTTP requests against a production build with a clean database. Failure-injection tests prove atomic case/event rollback. Fresh-session creation/change evidence is recorded separately in [#5's acceptance report](https://github.com/thomaspmach/cognition-prototype/issues/5#issuecomment-5670914659); final clean-checkout setup and integrated verification belong to [#6](https://github.com/thomaspmach/cognition-prototype/issues/6). Tests of the application do not establish GitHub merge enforcement or deployment.
