# Security and review boundaries

## Control inventory

This document is guidance, not an enforcement mechanism. It links implemented controls and distinguishes requirements for later work.

| Area | Current evidence | Classification / limitation |
| --- | --- | --- |
| Registry and preview routes | [WorkspaceTool](../lib/tool-registry.ts), [registry tests](../tests/tool-registry.test.ts), [browser checks](../tests/e2e/workspace.spec.ts) | Shared types/UI plus executable tests enforce the preview contract in checked code; they do not authenticate users |
| Access labels | `WorkspaceRole` and `accessRequirements` in the registry | Descriptive metadata only; no authorization boundary |
| Shared feedback and panels | [Shared UI](architecture.md#shared-ui-to-reuse) | Presentation/accessibility implementation, not input validation or permission enforcement |
| Secret/local-state exclusions | [.gitignore](../.gitignore) | Git ignores common secret, database and generated paths; this does not scan content or prevent force-adding files |
| Lint/typecheck/test/build | [package.json](../package.json), [ESLint](../eslint.config.mjs), [Vitest](../vitest.config.ts), [Playwright](../playwright.config.ts) | Executable local checks; their existence does not establish required GitHub checks or branch protection |
| Identity and authorization | [Better Auth](../lib/server/auth.ts), [server access](../lib/server/access.ts), [page access](../lib/server/page-access.ts) | Library-managed password hashing and database sessions; persisted roles checked on reads/writes; signup disabled |
| Strict input and origin checks | [Zod schemas](../lib/kyc/model.ts), [mutation handler](../app/api/kyc/cases/[id]/route.ts) | Rejects unknown identity/rule fields, invalid values and cross-origin writes |
| Cases and events | [KYC service](../lib/server/kyc.ts), [schema](../lib/server/schema.ts), [server tests](../tests/server/kyc.test.ts), [HTTP tests](../tests/e2e/access.spec.ts) | Immediate transaction and expected version; state/event atomicity and conflicts tested; application history is not tamper-proof |
| Presentation configuration | [JSON](../lib/kyc/presentation.json), [schema](../lib/kyc/presentation-schema.ts), [contract tests](../tests/kyc-presentation.test.ts) | Strict declarative filters, column ordering and page size; required identity/status/action columns cannot be removed |
| Conditional merge review | [Base-policy evaluator](../scripts/check-kyc-presentation.ts), [policy workflow](../.github/workflows/kyc-policy.yml), [CI](../.github/workflows/ci.yml), [CODEOWNERS](../.github/CODEOWNERS) | Owner-applied controls with [limited live evidence](merge-controls.md); trusts repository writers not to forge checks; **not spoof-resistant App-backed enforcement** |

Do not infer remote GitHub protection settings from repository documentation. When enforcing or describing a merge restriction, inspect the actual checks, trusted policy and repository settings. Separate current read-back from the historical evidence linked in [merge controls](merge-controls.md).

## Server and data requirements for functional tools

These are requirements for protected functionality. KYC implements them using the modules above. Follow [architecture's integration steps](architecture.md#server-and-data-integration) and the requested tool's specification.

- Use a maintained authentication library with server-verifiable sessions. Derive the actor and permissions on the server; ignore client-supplied actor/role claims. Do not implement custom authentication cryptography.
- Enforce authorization on route reads, server actions/handlers and data access. Validate permission and allowed record/state scope for every operation. Hiding a link or button is only presentation.
- Keep database/session internals and credentials server-only. Validate input at server boundaries with a strict schema; reject unknown or unsupported values rather than accepting client-defined rules.
- Validate current state at write time. Where a tool records history, commit the state change and its event atomically, with the server-derived actor, timestamp and relevant old/new state or reason. Failed, repeated or conflicting requests must not record a successful event or contradictory final state.
- Test direct denied requests, tampered identity claims, invalid inputs, invalid transitions, transaction rollback and concurrent/repeated writes. UI-only tests do not demonstrate server enforcement.

Tool-specific roles, transitions and reason requirements belong to that tool's issue and modules. For KYC, use [#3](https://github.com/thomaspmach/cognition-prototype/issues/3); do not impose its case-review state machine on every internal tool. Application event history is not tamper-proof audit infrastructure.

## Secrets and data

Local setup generates a session secret in ignored `.env` and stores synthetic records in `.data/workspace.sqlite`. [README](../README.md#synthetic-sign-in-accounts) lists public local-only demonstration credentials. Never reuse them for real data. Keep real credentials, session secrets, personal data and local database files out of code, logs, screenshots, fixtures and PRs.

Use Devin's secret storage or local environment variables for actual credentials, with placeholder-only examples in version control. Inspect staged content as well as ignore rules. Never rely on `.gitignore` to remove previously tracked secrets. Document future local seed credentials only when they are explicitly safe demonstration accounts; do not reuse operational credentials.

## Review and merge boundary

**Policy, settings and evidence are distinct.** [Merge controls](merge-controls.md) records the current configuration, historical configuration-only and reviewed merges, and remaining gaps. PR #15 demonstrated the native reviewed path; owner-authored PR #18 also exposed a path GitHub reported mergeable without formal review. The intended non-author review policy is therefore not universally enforced by the current settings. The full live matrix and auto-merge completion remain unverified. Recheck each proposed merge rather than inferring eligibility from this document.

**Engineering policy, under the prototype's trusted-writer assumption:**

- Eligibility must be determined from the complete PR change, including additions, deletions, renames and mixed changes. Only valid changes entirely within the explicitly approved presentation surface can qualify for the no-human-review path.
- Application/shared code, registry/access requirements, dependencies, migrations, permissions, business rules, instructions, CI and policy changes require authorized non-author human review under Engineering policy. Do not describe this as an unconditional GitHub guarantee: the owner-authored exception is documented below. Tool roles such as KYC Reviewer do not grant code-review permission.
- Every path requires passing relevant checks. Human approval cannot make invalid configuration or a failing required check valid. Risk labels, requester confirmation and Devin's own classification cannot authorize a merge.
- The PR must not alter its own trusted eligibility policy to authorize itself. Do not run untrusted PR code with privileged credentials to decide eligibility. The author cannot approve their own PR; the Devin actor must not bypass protections.
- If controls are absent, failing, unverifiable or cannot establish eligibility, report the blocker and seek the required review. Do not weaken controls or claim a configuration-only exception.

GitHub uses Code Owner rules from the base branch. The agent-authored historical proposal was blocked for review, but the owner-authored PR #18 at `408dcc5` was reported `CLEAN` with passing checks and no recorded reviews. With zero blanket approvals, the current setup does not establish independent review for every author. `ci/quality` and `kyc/presentation-policy` remain separate required checks; their success is neither human approval nor permission to merge. A reviewer/ownership configuration change, if needed, requires separate authorization.

The evaluator runs main-sourced code and validates raw candidate JSON and complete Git metadata as data. It does not install candidate dependencies, check out candidate code, or execute candidate scripts/actions/artifacts. The native per-PR job and separate diagnostic audit both use read-only tokens; neither publishes custom checks. Proposed schema or policy changes are reviewed using the policy already on main. See the [execution boundary](merge-controls.md#execution-boundary) and [historical evidence](merge-controls.md#historical-evidence). PR #15 establishes a successful native reviewed path, not the full enforcement matrix.

**Trust limitation:** repository writers and maintainers are trusted not to forge check results or deliberately bypass controls. Another workflow on an unmerged branch can request write permissions and publish a matching check under the same GitHub Actions identity. Read-only token defaults and named required checks do not authenticate the originating workflow. This can defeat validation/CI checks; it does not itself supply native Code Owner approval. This prototype does not provide the spoof resistance of an isolated App-bound gate. That hardening would require separate approval and infrastructure; no dedicated App or extra privileged credential is used here.

Follow the verified mechanism only when the user's task authorizes merging. These repository skills end at PR delivery; they never authorize their own merge. The [merge-control reference](merge-controls.md) covers reviewer identities, required-check sources and authorization requirements. Auto-merge remains disabled.

The [change skill](../.agents/skills/change-internal-tool/SKILL.md) follows this boundary. Historical workflow and integration reports are linked from [merge controls](merge-controls.md#historical-evidence); additional live probes need separate authorization. Repository approval is separate from business/compliance approval, and merging is separate from production deployment.
