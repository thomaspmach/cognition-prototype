# Security and review boundaries

## Control inventory

This document is guidance, not an enforcement mechanism. It describes the current UI foundation and requirements for later work.

| Area | Current evidence | Classification / limitation |
| --- | --- | --- |
| Registry and preview routes | [WorkspaceTool](../lib/tool-registry.ts), [registry tests](../tests/tool-registry.test.ts), [browser checks](../tests/e2e/workspace.spec.ts) | Shared types/UI plus executable tests enforce the preview contract in checked code; they do not authenticate users |
| Access labels | `WorkspaceRole` and `accessRequirements` in the registry | Descriptive metadata only; no authorization boundary |
| Shared feedback and panels | [Shared UI](architecture.md#shared-ui-to-reuse) | Presentation/accessibility implementation, not input validation or permission enforcement |
| Secret/local-state exclusions | [.gitignore](../.gitignore) | Git ignores common secret, database and generated paths; this does not scan content or prevent force-adding files |
| Lint/typecheck/test/build | [package.json](../package.json), [ESLint](../eslint.config.mjs), [Vitest](../vitest.config.ts), [Playwright](../playwright.config.ts) | Executable local checks; their existence does not establish required GitHub checks or branch protection |
| Identity, authorization, data and events | [Issue #3](https://github.com/thomaspmach/cognition-prototype/issues/3) | Required for functional KYC; no current implementation |
| Presentation configuration and conditional merge review | [Issue #4](https://github.com/thomaspmach/cognition-prototype/issues/4) | Pending independent enforcement; no gate/schema/workflow implementation in this foundation |

Do not infer remote GitHub protection settings from repository documentation. When enforcing or describing a merge restriction, inspect the actual checks, trusted policy and repository settings. Link that executable evidence when #4 is implemented.

## Server and data requirements for functional tools

These are requirements to implement and test before shipping protected functionality. The current foundation has no reusable auth, persistence or event-recording helpers to invoke. Follow [architecture's integration steps](architecture.md#future-serverdata-integration) and the requested tool's specification.

- Use a maintained authentication library with server-verifiable sessions. Derive the actor and permissions on the server; ignore client-supplied actor/role claims. Do not implement custom authentication cryptography.
- Enforce authorization on route reads, server actions/handlers and data access. Validate permission and allowed record/state scope for every operation. Hiding a link or button is only presentation.
- Keep database/session internals and credentials server-only. Validate input at server boundaries with a strict schema; reject unknown or unsupported values rather than accepting client-defined rules.
- Validate current state at write time. Where a tool records history, commit the state change and its event atomically, with the server-derived actor, timestamp and relevant old/new state or reason. Failed, repeated or conflicting requests must not record a successful event or contradictory final state.
- Test direct denied requests, tampered identity claims, invalid inputs, invalid transitions, transaction rollback and concurrent/repeated writes. UI-only tests do not demonstrate server enforcement.

Tool-specific roles, transitions and reason requirements belong to that tool's issue and modules. For KYC, use [#3](https://github.com/thomaspmach/cognition-prototype/issues/3); do not impose its case-review state machine on every internal tool. Application event history is not tamper-proof audit infrastructure.

## Secrets and data

Current local setup needs no secrets or database. Use only synthetic data when data-backed functionality is added. Keep real credentials, session secrets, personal data and local database files out of code, logs, screenshots, fixtures and PRs.

Use Devin's secret storage or local environment variables for actual credentials, with placeholder-only examples in version control. Inspect staged content as well as ignore rules. Never rely on `.gitignore` to remove previously tracked secrets. Document future local seed credentials only when they are explicitly safe demonstration accounts; do not reuse operational credentials.

## Review and merge boundary

**Current procedure:** deliver a PR and wait for human Engineering review. There is no implemented pre-authorized presentation surface or configuration-only merge mechanism yet. New tools, instructions and code changes require review as a project rule; this text does not itself make GitHub block a merge.

**Required behavior when #4 supplies independent controls:**

- Eligibility must be determined from the complete PR change, including additions, deletions, renames and mixed changes. Only valid changes entirely within the explicitly approved presentation surface can qualify for the no-human-review path.
- Application/shared code, registry/access requirements, dependencies, migrations, permissions, business rules, instructions, CI and policy changes require authorized human review. Tool roles such as KYC Reviewer do not grant code-review permission.
- Every path requires passing relevant checks. Human approval cannot make invalid configuration or a failing required check valid. Risk labels, requester confirmation and Devin's own classification cannot authorize a merge.
- The PR must not alter its own trusted eligibility policy to authorize itself. Do not run untrusted PR code with privileged credentials to decide eligibility. The author cannot approve their own PR; the Devin actor must not bypass protections.
- If controls are absent, failing, unverifiable or cannot establish eligibility, report the blocker and seek the required review. Do not weaken controls or claim a configuration-only exception.

Once implemented, replace pending descriptions with links to the actual schema, validator, trusted workflows, required checks, reviewer ownership and actor/auto-merge configuration. Follow that verified mechanism only when the user's task authorizes merging. These repository skills end at PR delivery; they never authorize their own merge.

The [change skill](../.agents/skills/change-internal-tool/SKILL.md) follows this boundary. Functional merge-path validation belongs to [issue #5](https://github.com/thomaspmach/cognition-prototype/issues/5). Repository approval is separate from business/compliance approval, and merging is separate from production deployment.
