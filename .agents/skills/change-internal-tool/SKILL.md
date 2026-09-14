---
name: change-internal-tool
description: Modify an existing internal tool from an outcome-only request. Find the relevant code and shared capabilities, implement and verify the change, and deliver a PR while preserving independent review controls.
---

# Change an internal tool

Use this procedure for modifying an existing tool. It runs independently of the build skill.

## 1. Understand and locate the change

Read [AGENTS.md](../../../AGENTS.md), its required references and any supplied issue/specification. Clarify only missing outcomes or acceptance criteria that block implementation. The requester may name a tool and desired behavior; they need not identify files, configuration keys or code ownership.

Trace the named tool through the shared registry to its route, UI, tests and any server/data code. Use [architecture](../../../docs/architecture.md) to find reusable components and supported capabilities. Verify their existence and current behavior in source; a future requirement or registry access label is not an implemented capability.

For example, KYC supports country filtering but disables it by default. Its only pre-authorized surface is [presentation.json](../../../lib/kyc/presentation.json), validated by [presentation-schema.ts](../../../lib/kyc/presentation-schema.ts). Inspect the current value and supported UI capability before changing it. The contract allows supported filters, a permutation of all six required columns and page sizes 10/25/50.

## 2. Establish the implementation boundary

Summarize the intended behavior and acceptance examples. Reuse an existing supported capability where possible. If implementation would require a new integration, permission, business rule or other material expansion, explain it and obtain confirmation before extending the request.

Read the [review and merge boundary](../../../docs/security.md#review-and-merge-boundary). Locate the actual approved configuration contract and independent gate if implemented; do not invent their paths or trust a risk label. When they are absent or unverifiable, retain human review and report that eligibility for any exception has not been established.

For KYC, inspect the [main-sourced policy workflow](../../../.github/workflows/kyc-policy.yml), [CODEOWNERS](../../../.github/CODEOWNERS) and actual GitHub ruleset/check state described in [activation](../../../docs/merge-controls.md). Native Code Owner review enforces outside-scope approval; classification text does not. This prototype trusts repository writers not to forge checks; never claim App-backed spoof resistance. A workflow file alone does not demonstrate activation.

## 3. Implement and verify

Follow [branch/setup instructions](../../../AGENTS.md#branch-and-pr-workflow). Read [DESIGN.md](../../../DESIGN.md) before UI changes. Keep edits focused and preserve shared components, authorization and state/event invariants.

When a requested change fits an implemented presentation contract, change only supported configuration and use its actual schema/functional checks. Otherwise implement within the confirmed scope and identify the required reviewers. Never modify the policy, validator, tests or protections to make your own change qualify.

Follow the [definition of done](../../../docs/internal-tools-standards.md#definition-of-done) and run [repository checks](../../../AGENTS.md#setup-and-checks). Verify the requested outcome, important failure cases and affected regressions; keep documentation aligned with the resulting commands and behavior.

## 4. Inspect the complete PR change

Review all changes from the base, including added, deleted and renamed files and mixed configuration/code edits. Check staged/new files as well as existing files. Agent judgment is an explanation of the diff, not the gate's eligibility decision.

Preserve independent checks and human-review requirements. Passing ordinary tests does not establish configuration eligibility; required checks must pass on every merge path, and human approval cannot override invalid configuration or failed checks. Instructions, dependencies, shared code and policy changes remain outside the presentation surface.

## 5. Deliver the PR and stop

Open a PR referencing the issue, with the implemented outcome, complete change boundary, per-criterion **Passed**, **Failed**, or **Not verified** status/evidence, and unresolved dependencies. State which controls/checks actually ran and which integration results remain unverified.

Explain the PR and any blockers without requiring source-file knowledge from the requester. Stop for review; do not push directly to main or merge. Once an independent gate exists, any later authorized merge must use its verified mechanism; this skill never grants permission or bypasses it. Local execution/restart is not automatic production publication.
