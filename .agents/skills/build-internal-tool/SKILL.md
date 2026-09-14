---
name: build-internal-tool
description: Build a new internal tool from a business request. Clarify missing requirements, confirm a short specification, reuse the workspace foundation, validate behavior and deliver a PR for human review.
---

# Build an internal tool

Use this procedure for creating a tool. It runs independently of the change skill.

## 1. Understand the request

Read [AGENTS.md](../../../AGENTS.md), its required references and the requested issue. Use the linked epic for scope without expanding the task to other issues. Inspect the current checkout; documentation describing future work is not proof that a capability exists.

Start from the user's business need, even a sentence such as “We need a queue to review requests and assign an owner.” Do not demand source paths, a technical PRD or an implementation plan. Use [discovery topics](../../../docs/internal-tools-standards.md#discovery-and-specification) to identify what is already answered and what is missing.

Ask concise questions only for unresolved requirements that affect implementation: users/owner, data, actions, permissions and observable acceptance examples. Do not invent permissions, data sources or business rules. If a prerequisite is unavailable, report what is missing and resolve the blocker before promising a functional result.

## 2. Confirm a short specification

Present the [specification outline](../../../docs/internal-tools-standards.md#discovery-and-specification) in business language. Name the existing components/capabilities you will reuse and distinguish any new dependencies, implementation requirements and exclusions.

**Wait for explicit user confirmation before implementation.** If the user already explicitly confirmed the same specification, cite that confirmation instead of asking again. A broad request to build something does not by itself confirm unresolved choices. If a material change to the agreed scope becomes necessary, return for confirmation.

## 3. Implement the confirmed tool

Follow the branch and setup procedure in [AGENTS.md](../../../AGENTS.md#branch-and-pr-workflow), then the [architecture extension steps](../../../docs/architecture.md#adding-a-tool): tool route/module, registry and icon, shared UI, server/data boundaries, data setup where needed, and tests.

Read [DESIGN.md](../../../DESIGN.md) before UI work. Implement the confirmed states and acceptance examples with the foundation's real APIs. Read the [security requirements](../../../docs/security.md#server-and-data-requirements-for-functional-tools) before protected behavior. When required server/data capabilities are absent, implement them only within the approved scope or report the dependency; never present registry metadata as access enforcement.

Keep tool-specific business rules in that tool. Update affected documentation with actual commands, module locations and controls introduced by the implementation.

## 4. Verify behavior

Use the [definition of done](../../../docs/internal-tools-standards.md#definition-of-done) and [repository checks](../../../AGENTS.md#setup-and-checks). Verify each confirmed acceptance example, affected UI flows and relevant negative cases; for stateful tools, validate persistence and server enforcement as well.

Report every criterion as **Passed**, **Failed**, or **Not verified**, with how it was checked and supporting results. A file, written instruction or screenshot alone does not prove a workflow works. Distinguish current automated/browser checks from any deferred integration validation.

## 5. Deliver for human review

Review the complete diff, then open a PR referencing the issue and describing implemented behavior, validation and unresolved dependencies. All new tools require human Engineering review; identify appropriate owners for new integrations or sensitive rules under the [review boundary](../../../docs/security.md#review-and-merge-boundary).

Share the PR and any remaining blockers in language the requester can use to validate the outcome. Stop for review. Do not push directly to main, authorize a merge yourself or imply local execution publishes to production.
