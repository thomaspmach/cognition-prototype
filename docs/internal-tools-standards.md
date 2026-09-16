# Internal-tool standards

These are Engineering guidance. [Security](security.md) identifies which protections have executable enforcement and which remain requirements. [Architecture](architecture.md) owns extension paths and components; [DESIGN.md](../DESIGN.md) owns visual conventions. The confirmed request and its acceptance criteria define the scope of each tool or change.

## Discovery and specification

Accept a business need in ordinary language. Read supplied specifications and repository context first; ask only questions that affect implementation and are not already answered. Do not require the requester to produce a technical PRD, file names or an implementation plan.

Resolve these topics, using concise questions and examples:

| Topic | What needs to be clear |
| --- | --- |
| Outcome and users | What task should become easier, for whom, and which team owns it? |
| Data | What records/fields are needed, where do they come from, how do they persist, and are integrations or sensitive data involved? |
| Actions | What can users do, what validation/transitions apply, and what happens on failure or repeated requests? |
| Permissions | Who can read each record and perform each action? Which identity source establishes that permission? |
| Acceptance | Which observable examples demonstrate success and denial/failure? What is explicitly outside scope? |

Once enough is known, present a short specification covering:

- Goal, users and owner.
- Data, actions, permissions and expected UI states.
- Acceptance examples and exclusions.
- Existing components/capabilities to reuse, and new dependencies or unresolved blockers.
- Implementation boundaries and verification approach.

For a new tool, obtain explicit confirmation before implementation; resolve blocking ambiguity before asking for that confirmation. A requester's confirmation authorizes the agreed work, not a repository merge or a new business-policy exception. The [build skill](../.agents/skills/build-internal-tool/SKILL.md) owns the procedure; the [change skill](../.agents/skills/change-internal-tool/SKILL.md) handles an existing tool separately.

## Interaction states

Use the [shared components](architecture.md#shared-ui-to-reuse) where their contracts fit. KYC exercises these states against authenticated server requests and persistent case/history data.

| State | Expected behavior |
| --- | --- |
| Loading | Distinguish loading from an empty result; show progress and avoid duplicate submissions while a write is pending |
| Empty | Explain whether no records exist or filters matched none, with an appropriate recovery action |
| Denied | Explain the denied operation without leaking protected data; the server must deny it independently |
| Validation error | Keep usable input, associate errors with fields and provide actionable feedback |
| Request error | Report failure without false success; offer a safe retry when supported |
| Success | Reflect the committed result, announce feedback accessibly, and show persisted history when the tool requires it |

Preserve keyboard access, visible focus, focus containment/return, reduced motion and usable overflow at laptop/mobile sizes. Use text as well as color for statuses. Read `DESIGN.md` for tokens, density and composition rather than introducing another visual system.

## Definition of done

- The confirmed acceptance examples work within scope; implemented, preview and unavailable capabilities are clearly distinguished.
- A new tool reuses the shell, shared registry and suitable UI components. Its route, icon, metadata and both navigation surfaces agree.
- Protected behavior meets the [server/data requirements](security.md#server-and-data-requirements-for-functional-tools). New dependencies are identified and implemented before claiming a functional tool is complete.
- Meaningful tests cover affected behavior, important negative cases and regressions. For stateful tools, include direct unauthorized requests, invalid inputs, persistence and atomic state/event behavior as applicable.
- Run [setup/check commands](../AGENTS.md#setup-and-checks). Validate affected user flows as well as unit/component behavior; screenshots or recordings supplement tests. Document which checks were executed in this session, with results and any gaps.
- Document actual setup, paths and extension points as they change. Keep secrets, personal data, local databases and generated output out of commits.
- The PR reports behavior and each acceptance criterion with **Passed**, **Failed**, or **Not verified**, verification method and supporting results. Split present checks from future integration checks; a file's existence or a written rule is not behavioral evidence.
- Deliver the PR for the required review under the [merge boundary](security.md#review-and-merge-boundary). Do not represent a local pull/restart as automatic production deployment.

Label procedural walkthroughs as such. A successful build or skill discovery does not establish an end-to-end Devin Cloud workflow; that requires session-specific evidence. The repository's historical examples are linked from the [README](../README.md#engineering-guidance-and-devin-cloud-skills).
