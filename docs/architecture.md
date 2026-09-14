# Architecture and extension points

## Implemented foundation

This is one Next.js App Router application, using TypeScript, Tailwind and actual Be UI source. [Issue #1](https://github.com/thomaspmach/cognition-prototype/issues/1) supplies the implementation below; [epic #7](https://github.com/thomaspmach/cognition-prototype/issues/7) owns product scope.

| Responsibility | Current implementation |
| --- | --- |
| Root shell | [app/layout.tsx](../app/layout.tsx) wraps route content in `WorkspaceShell` |
| Persistent navigation/header | [workspace-shell.tsx](../components/workspace/workspace-shell.tsx) consumes the shared registry and retains sidebar state through client navigation |
| Overview catalog/search | [app/page.tsx](../app/page.tsx) and [tool-catalog.tsx](../components/workspace/tool-catalog.tsx) |
| Tool metadata | [lib/tool-registry.ts](../lib/tool-registry.ts): `ToolId`, `WorkspaceRole`, `WorkspaceTool`, `toolRegistry`, `availabilityLabels`, `filterTools` |
| Icon mapping | [tool-icon.tsx](../components/workspace/tool-icon.tsx): `ToolIcon` maps each `ToolId` |
| KYC route/composition | [app/tools/kyc/page.tsx](../app/tools/kyc/page.tsx) and [kyc-foundation.tsx](../components/workspace/kyc-foundation.tsx) |
| Visual tokens | [app/globals.css](../app/globals.css), explained in [DESIGN.md](../DESIGN.md) |

The KYC page has an empty queue and read-only panel example. There is no session, authorization helper, data layer, case workflow or presentation-configuration schema. The registry's role names are descriptive metadata. Refunds and Feature Flags are previews with no routes.

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

1. **Choose a route and module boundary.** Add an App Router page at `app/tools/<tool-id>/page.tsx` (a new path for the chosen tool), using the existing KYC page as the composition example. Keep tool-specific components and rules together rather than embedding them in the root shell. The current small UI composes from `components/workspace/`; extract shared code only when it has a real reusable contract.
2. **Register once.** Extend `ToolId` and add an entry in `lib/tool-registry.ts` with unique id, name, description, responsible team, access requirements and availability. Extend the `icons` mapping in `components/workspace/tool-icon.tsx`. Available/foundation entries require a `/tools/...` route; preview entries must use `route: null`. Do not add placeholder pages for previews.
3. **Check both registry consumers.** Sidebar navigation and catalog cards already read `toolRegistry`; do not create a second navigation list. Inspect both consumers for wording and behavior: the current catalog link says “Open foundation” and the shell says “Foundation build.” When shipping a functional tool, update foundation-only presentation to reflect actual availability rather than assuming the metadata alone updates all copy.
4. **Compose the UI.** Use the shared components above and the implemented design tokens. Root layout already supplies navigation and the main landmark. Define actual loading, empty, validation-error, denied-access and success behavior as applicable; see [tool standards](internal-tools-standards.md).
5. **Define and implement access before exposing protected behavior.** Treat registry roles as visibility metadata only. Read the [security requirements](security.md#server-and-data-requirements-for-functional-tools). Protect route reads, server actions/handlers and data access independently. Reuse actual server helpers when they exist; if missing, include them as explicit implementation dependencies in the confirmed specification. Do not substitute hidden buttons or a client-controlled role.
6. **Add data setup when needed.** Follow the future integration requirements below. Keep server-only database/session access out of client components and the shared registry. Place business rules with the tool; promote only reusable identity, authorization or event-recording mechanisms to shared modules.
7. **Add meaningful tests.** Extend the existing [registry](../tests/tool-registry.test.ts) and [catalog](../tests/tool-catalog.test.tsx) contracts for new metadata/destinations while preserving preview safety. Add Vitest coverage under `tests/` using `*.test.ts` or `*.test.tsx`; [vitest.config.ts](../vitest.config.ts) uses jsdom by default, so server/database tests will need an appropriate Node test environment. Add browser specs under `tests/e2e/`, following [workspace.spec.ts](../tests/e2e/workspace.spec.ts) and [playwright.config.ts](../playwright.config.ts). Verify navigation, actual behavior and direct denied operations, not just component existence.
8. **Verify and document the result.** Run the [repository commands](../AGENTS.md#setup-and-checks), map results to the confirmed acceptance criteria, and update the README and these references whenever new commands, modules or capabilities are introduced.

## Future server/data integration

[Issue #3](https://github.com/thomaspmach/cognition-prototype/issues/3) establishes maintained authentication, SQLite/Drizzle persistence, migrations and repeatable synthetic seeds. These dependencies are not installed and their modules, database location and setup commands do not exist yet. Do not invent an executable migration, seed, reset or login command for the current checkout.

When implementing that dependency:

- Choose and document the server-only identity/data module locations and the boundary between route/UI, tool rules and reusable server helpers.
- Commit schema and generated migrations using the selected migration tooling. Add executable migration/seed commands to `package.json`; document exact paths, database location and setup order after testing them.
- Make seed behavior repeatable with synthetic identities/data; document rerun semantics and explicit reset steps, warning before deleting local state.
- Verify clean database setup, permissions, mutations and matching events, failure rollback, repeat/concurrent writes and persisted results after refresh. Follow the tool's own issue for its domain rules.
- Update this document, the README and security references with the actual commands and controls in the same implementation PR. Local SQLite persistence does not establish durable storage on serverless hosting.

[Issue #4](https://github.com/thomaspmach/cognition-prototype/issues/4) will define the bounded presentation configuration and independent merge gate after #3. Until those exist, there is no implemented configurable-filter surface or configuration-only merge path. See [security](security.md#review-and-merge-boundary).

## Verification boundary

The existing Vitest and Playwright suites test the UI foundation. Issue #2 can validate documentation references, procedures and skill format against that code. Guided creation during #3 and fresh-session creation/change integration are tracked by [issue #5](https://github.com/thomaspmach/cognition-prototype/issues/5); final integrated clean-state verification belongs to [issue #6](https://github.com/thomaspmach/cognition-prototype/issues/6). Do not report those future workflows as passed from a documentation walkthrough or a foundation test run.
