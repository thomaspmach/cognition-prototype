# Merge controls: implementation and evidence

This document separates the intended review policy, GitHub's configured controls and revision-specific observations. Settings and PR state can change; inspect them again before a merge. Application tests do not establish GitHub enforcement or production readiness.

## Current settings

Read-only inspection on **2026-09-16** confirmed [ruleset 23344201](https://github.com/thomaspmach/cognition-prototype/rules/23344201), active on `main`:

| Control | Observed setting |
| --- | --- |
| Required checks | `ci/quality` and `kyc/presentation-policy`, both from GitHub Actions App `15368` |
| Branch freshness | Strict up-to-date checks |
| Review | Code Owner review enabled; zero blanket approvals |
| Review lifecycle | Stale reviews dismissed; conversations must be resolved; no last-push approval requirement |
| Additional review setting | `require_extra_approval_for_unattributed_changes: true` |
| History protection | Branch deletion and non-fast-forward updates blocked |
| Bypass | No configured bypass actors; API returned `current_user_can_bypass: never` |
| Repository auto-merge | Disabled |
| Actions defaults | Read-only workflow permissions; workflow PR approvals disabled |

No CODEOWNERS syntax errors were reported. The Actions-defaults endpoint was accessible during this inspection; the earlier integration's 403 was a historical access limitation, not the current result.

Read-back endpoints: repository metadata, `/rulesets/23344201`, `/rules/branches/main`, `/codeowners/errors` and `/actions/permissions/workflow`, under `repos/thomaspmach/cognition-prototype`.

## Review policy and enforcement limits

Engineering policy requires authorized non-author human review for application code, dependencies, migrations, shared components, instructions and policy changes. Only the valid configuration-only surface below is pre-authorized. Both paths require passing checks, and neither grants permission to merge or deploy.

[CODEOWNERS](../.github/CODEOWNERS) assigns other files to `@thomaspmach` and leaves `lib/kyc/presentation.json` without an owner. GitHub reads ownership from the base branch. The validator classifies and validates changes; it does not collect or supply human approval.

**This is not universal independent-review enforcement.** On 2026-09-16, owner-authored [PR #18](https://github.com/thomaspmach/cognition-prototype/pull/18), at head `408dcc5bc78f43e9a1a363c30bb471aca90fc4cf`, had both checks passing, no recorded reviews and GitHub merge state `CLEAN`. That is an observed owner-authored path, not a reviewed-path demonstration or a merge. Do not infer that Code Owner review settings block every author until someone else approves.

For agent-authored changes, the historical blocked and reviewed paths are recorded below. The intended independent-review policy still requires an authorized non-author reviewer and approval of the exact head. A green merge box alone does not prove it occurred. Authors cannot approve their own PRs; KYC application roles confer no GitHub review authority. Adding reviewers or strengthening protections requires separately authorized configuration work, not a bypass or author substitution.

## Configuration contract

Only an ordinary modification to `lib/kyc/presentation.json` can qualify as configuration-only. The complete base-to-head Git diff must match the fully paginated GitHub changed-file listing and reported count. The JSON must remain an existing regular `100644` blob of at most 4 KiB, with exactly:

| Field | Permitted values |
| --- | --- |
| `enabledFilters` | Unique subset of `status`, `assignee`, `country`; search remains available |
| `columnOrder` | Exact permutation of `id`, `customerName`, `country`, `status`, `assigneeName`, `submittedAt` |
| `pageSize` | `10`, `25`, `50` |

Unknown or duplicate keys, malformed JSON, unsupported values, removed columns, deletion, renaming away and unsafe modes fail validation. The contract permits no executable expressions, arbitrary renderers, destinations, permission changes or decision rules.

| Change | Policy result | Review policy |
| --- | --- | --- |
| Valid, entirely configuration-only | Success after complete-diff validation | Pre-authorized; no assigned Code Owner |
| Other files, with valid configuration | Success after complete-diff validation | Human Engineering review required; GitHub enforcement has the actor-dependent limitation above |
| Invalid configuration, including mixed changes | Failure | Approval cannot make invalid configuration pass |

## Execution boundary

- **[`ci/quality`](../.github/workflows/ci.yml):** an unconditional PR job runs lint, typecheck, unit/server tests, build and Playwright. Its token is read-only; it has no privileged secrets or shared privileged cache.
- **[`kyc/presentation-policy`](../.github/workflows/kyc-policy.yml):** a native `pull_request_target` job validates the triggering PR using workflow and [evaluator](../scripts/check-kyc-presentation.ts) code from trusted main. It installs no dependencies and does not execute candidate scripts, actions, dependencies or artifacts. Its token has only Contents read and Pull requests read.
- The evaluator compares the event's PR number, head, base, repository and file count with live state before and after inspection. Missing objects, stale identities, Git/API disagreement and API errors fail closed. It does not publish custom check runs or commit statuses.
- A separate main-push/manual [audit workflow](../.github/workflows/kyc-policy-audit.yml) reports failures across open PRs. It neither supplies nor refreshes their required checks. A stale open PR can fail that audit without implying that the application tests failed.
- Updating an authorized PR branch from main triggers fresh per-PR checks. Rerunning an old event cannot certify a changed head/base. Branch freshness remains a separate GitHub requirement.

**Trusted-writer limitation:** check names and a shared GitHub Actions identity do not authenticate the originating workflow. A repository writer could create another workflow requesting write permissions and forge a matching check. The read-only defaults and current job permissions do not establish hostile-writer resistance. This is not equivalent to isolated App-backed or organization-required-workflow enforcement. No live spoofing experiment was performed. Hardening this boundary requires separate design, authorization and infrastructure.

## Historical evidence

These observations apply to the linked revisions, not to every future PR or the full verification matrix.

| Evidence | Established observation |
| --- | --- |
| [PR #13](https://github.com/thomaspmach/cognition-prototype/pull/13) and [change-workflow report](https://github.com/thomaspmach/cognition-prototype/issues/5#issuecomment-5670914659) | Country-filter configuration completed a separately authorized normal protected merge without formal review on 2026-09-14. This was not auto-merge. |
| [PR #14](https://github.com/thomaspmach/cognition-prototype/pull/14), historical report above | The non-executable automatic-approval proposal was blocked for review before main advanced. It later became stale. On 2026-09-16 it remained open and behind main with a failed policy check, but **did have a recorded owner approval**. Its current failure must not be presented as an isolated missing-review block. No automatic-approval rule was implemented. |
| [PR #16](https://github.com/thomaspmach/cognition-prototype/pull/16) | Replaced the custom check publisher with a native per-PR job on main revision `151e964385c6b6c0717988ec37ba35334486bde7`. The linked PRs retain the check-association investigation. |
| [PR #15 acceptance report](https://github.com/thomaspmach/cognition-prototype/pull/15#issuecomment-5677710803) | Agent-authored head `579fb5d63c5d0017333a11d4aa0475e657218bf3` had passing native checks and owner approval, then merged normally on 2026-09-15 as `dd62280b6a8489c436a40f74b75d59236021e104`. This establishes that reviewed path; it is no longer pending verification. |
| [PR #18](https://github.com/thomaspmach/cognition-prototype/pull/18), head `408dcc5` | Owner-authored outside-scope changes were reported mergeable without a formal review. This documents a limitation, not independent-review enforcement. |

The [initial control issue](https://github.com/thomaspmach/cognition-prototype/issues/4), [workflow report](https://github.com/thomaspmach/cognition-prototype/issues/5#issuecomment-5670914659) and [integrated verification report](https://github.com/thomaspmach/cognition-prototype/issues/6#issuecomment-5677708101) preserve the original investigation and acceptance context. Historical failed checks may reflect superseded heads, stale bases or the replaced publisher; distinguish them from the final accepted revision.

## Remaining verification gaps

- The full live matrix for invalid/mixed configurations, config rename/deletion/mode changes and changes to workflows or ownership has not been demonstrated.
- Failing/cancelled CI, head/base changes and stale-review dismissal have local coverage or partial observations, not a complete live enforcement demonstration.
- Check provenance and token isolation have source/read-back evidence, not hostile-writer resistance.
- Automatic merge completion has not been demonstrated; repository auto-merge is disabled.

Local policy tests use mock HTTP responses and temporary Git repositories. Application tests verify the tool itself. Neither substitutes for live review/merge evidence.

## Reviewing and merging

1. Inspect the complete diff, exact head/base, effective rules, Code Owners, required checks and unresolved conversations.
2. For outside-scope changes, obtain authorized non-author Engineering approval on the current head. GitHub's mergeability status does not by itself satisfy that review policy. If no eligible reviewer is available, report the policy/enforcement gap; do not represent an owner-only merge as independently approved.
3. Deliver the PR and stop unless the owner separately authorizes merging. Use only the normal protected path; never disable checks, impersonate a reviewer or use administrative bypass to clear a blocker.
4. Keep repository settings unchanged unless their modification is explicitly authorized. Auto-merge is not part of the current workflow; enabling it can merge immediately when requirements pass and needs separate authorization.

A merge is not production deployment, business acceptance or compliance approval.
