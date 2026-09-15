# Owner settings and activation: issue #4

**Native-gate correction: Not verified live.** Main already has an active ruleset and the earlier custom-check publisher. The correction must receive human review and a separately authorized normal protected merge before its main-sourced policy can operate. No repository settings are changed by these files. Local tests, mocked HTTP responses and workflow files do not prove GitHub recognizes the required check or the intended review boundary.

## Contract and required behavior

Only an ordinary modification to `lib/kyc/presentation.json` can be configuration-only. The complete base-to-head Git diff must match the fully paginated GitHub changed-file listing and reported count. Missing objects, stale main/head/policy, unknown metadata, disagreement or API errors fail closed. Git/GitHub rename heuristics can disagree; that blocks the check until the discrepancy is understood, rather than allowing an exception.

The JSON must remain an existing regular `100644` blob of at most 4 KiB, with exactly:

| Field | Permitted values |
| --- | --- |
| `enabledFilters` | Unique subset of `status`, `assignee`, `country`; search remains available |
| `columnOrder` | Exact permutation of `id`, `customerName`, `country`, `status`, `assigneeName`, `submittedAt` |
| `pageSize` | `10`, `25`, `50`; KYC pages the already authorized result set |

Unknown/duplicate keys, wrong types, duplicate/unsupported identifiers, malformed JSON, removed columns, deletion, renaming away or unsafe modes fail validation. No executable expressions, destinations, registry/access/decision rules or arbitrary renderers are permitted.

| Change | Policy check | Native review |
| --- | --- | --- |
| Valid, entirely configuration-only | Success after complete-diff validation | No assigned Code Owner, no blanket approval |
| Other files, with valid configuration | Success after complete-diff validation | Required authorized Code Owner approval |
| Invalid configuration, including mixed or approved changes | Failure | Approval cannot make the check valid |

Both paths also require `ci/quality`. A policy classification, label or agent statement never supplies a review or overrides a failing check.

## Implemented execution boundary

- **`ci/quality`:** one unconditional PR job runs lint, typecheck, unit/server tests, build and Playwright. Read-only token permissions; no privileged secrets or shared privileged cache. No path filters or conditional/skipped success jobs.
- **`kyc/presentation-policy`:** an unconditional native Actions job on `pull_request_target` validates only the triggering PR. GitHub creates the check in that workflow execution's suite; the evaluator's exit status determines the job result. The workflow/code comes from trusted main, installs no dependencies and never executes candidate scripts, actions, dependencies or artifacts. Its built-in token has only Contents read and Pull requests read.
- The event's PR number, head, base, repository and changed-file count must match live state before inspection and after the complete Git/API diff comparison. The checked-out policy must match current main. API errors, stale identities and validation failures fail the job; no conditional/skipped success or `continue-on-error` path is used. Neither evaluator mode creates check runs or commit statuses.
- Runs are grouped by PR number. A failure in another PR cannot affect the triggering PR's result. Missing, failed or cancelled native jobs are not evidence of a passed gate.
- **Audit open PR policies:** a separate [audit workflow](../.github/workflows/kyc-policy-audit.yml) runs on main pushes and main-only manual dispatch. It uses the same validation with read-only API access, logs each PR's outcome and fails its own non-required job if any PR fails. It neither publishes required checks on PR heads nor supplies merge eligibility.
- CODEOWNERS is read by GitHub from the base branch. Its wildcard assigns every other path to `@thomaspmach`, including source, dependencies, migrations, registry/access rules, instructions, schema, tests and workflows. A PR cannot remove its own review obligation by editing proposed CODEOWNERS.

**Trusted-writer limitation:** repository writers and maintainers are trusted not to forge check results or deliberately bypass controls. Another branch workflow can request write permissions and publish the same check context through the shared GitHub Actions identity. Check names, Actions source selection and read-only defaults do not authenticate the originating workflow. This can bypass validation/CI checks; it does not itself create Code Owner approval. No spoofing experiment or forged live result is part of verification. This design is **not equivalent to spoof-resistant App-backed enforcement**.

If resistance to that writer threat is later required, stop and redesign before claiming it: use an isolated App publisher bound to the required gate (minimum Checks write and implicit Metadata read), or a supported organization/enterprise required-workflow rule. Do not silently add credentials, provision an App or transfer this user-owned repository.

### Why custom publishing was replaced

On [PR #15](https://github.com/thomaspmach/cognition-prototype/pull/15), head `6bd30c50f93ba94a990ee852841343bf4c42dd6b`, custom check `104198648540` succeeded from Actions App `15368` but belonged to the original suite `94532788534`. Three newer executions existed; latest suite `94538588091` contained only **Evaluate trusted main policy**. All four custom successes remained in the original suite. The owner observed the required context as **Expected** despite approval of that head.

Both PR and commit GraphQL rollups included the old success with `isRequired: true`; all aggregate failures were `isRequired: false`. Those public fields do not expose the merge evaluator's effective suite selector. Newer-suite selection is the supported explanation, not a directly observed GitHub internal. Another PR's aggregate failure alone is insufficient to explain the missing required context.

The [Checks REST API](https://docs.github.com/en/rest/checks/runs#create-a-check-run) has no parameter to bind a custom check to a workflow suite. A native per-PR job removes that ambiguous association. Its live effect remains unverified until GitHub's required-check and review requirements are actually satisfied.

### Main updates and reevaluation

Strict up-to-date checks remain an independent GitHub condition. When main advances, a head that does not contain current main cannot pass the validator's ancestry check. A main change during evaluation also fails the final policy/base comparison. The diagnostic main-push audit identifies such failures without refreshing or invalidating required results itself.

After separate authorization to update a PR branch from main, `synchronize` runs both CI and the per-PR policy against the new head. The event snapshot, current main and checked-out policy must agree. Old workflow reruns retain their original event identity and must fail if the head or base changed; they cannot certify a newer head. With unchanged head/base, rerunning that PR's native job revalidates the full diff. A fresh supported PR event can also reevaluate the current snapshot. Manual audit dispatch never substitutes for a PR event or a required check.

Native review requirements remain independent, including stale-review dismissal on pushes. Main can advance immediately after a job's final read; strict branch freshness must still block merging. Live verification must check this boundary rather than assume a previous success was invalidated by the audit.

## Existing owner-applied configuration — preserve unchanged

Ruleset [`23344201`, `kyc-main-merge-policy`](https://github.com/thomaspmach/cognition-prototype/settings/rules/23344201) was read back during the 2026-09-15 investigation:

| Control | Observed setting |
| --- | --- |
| Target / enforcement | `refs/heads/main`, active |
| Required checks / source | `ci/quality` and `kyc/presentation-policy`, both integration `15368` (GitHub Actions) |
| Branch freshness | Strict required status checks enabled |
| Native review | Code Owner review required; zero blanket approvals; extra approval for unattributed changes required |
| Review lifecycle | Dismiss stale reviews; resolve review threads; no last-push approval requirement |
| History protection | Branch deletion and non-fast-forward updates blocked |
| Repository auto-merge | Disabled |

The [owner's settings read-back](https://github.com/thomaspmach/cognition-prototype/issues/4#issuecomment-5668470821) supplies the no-bypass and Actions-defaults evidence. The integration's administrative workflow-permissions endpoint returned 403; that is a verification limitation, not authorization to change credentials or settings. The fix does not change the ruleset, App binding, CODEOWNERS or repository settings.

**Reviewer/actor:** `thomaspmach` is the observed human Code Owner and must retain write/admin repository access. KYC application Reviewer roles confer no GitHub review permission. The author cannot approve their own PR. A Thomas-authored outside-scope PR needs another authorized, non-author human Code Owner configured through normal reviewed changes. Confirm the actual bot/Devin PR author and repository permissions; do not impersonate another author to obtain approval. Missing writer/reviewer access is a blocker, never grounds for bypass.

## Activation sequence — owner-controlled, after separate approval

1. Deliver the separate fix PR against current main. Its candidate workflow/validator is not its own eligibility authority: the existing trusted policy on main evaluates it as an outside-scope change. Local regression results establish implementation behavior only.
2. Before requesting merge approval, inspect the fix PR's actual required checks, suite associations, exact head/base, unresolved threads and authorized non-author Code Owner review. Both existing required contexts must satisfy GitHub's merge box under the unchanged ruleset. If the old publisher leaves the fix PR **Expected**, a standalone green check is insufficient: report the bootstrap blocker and stop. Do not manufacture a check, change required sources, repeatedly rerun jobs, disable protection or use bypass.
3. Only if that normal protected path is available may the owner separately authorize a normal merge. Preparing or approving this patch is not merge approval. Keep auto-merge disabled. PR #15's code and PR #14 remain outside this correction.
4. After the approved correction is on trusted main, obtain separate authorization for **unmerged** probe PRs. Observe the native required check in its own current suite, exact head/base and Actions App `15368`; confirm `ci/quality`, the configured sources and actual merge-box requirements. After a later legitimate PR event, verify a new suite contains its own native required job. An audit success or API `isRequired: true` alone is insufficient.
5. Verify the intended review boundary with configuration-only and outside-scope probes before/after authorized non-author approval, then the failure/staleness rows below. Record PR URLs, suite/run IDs, revisions, conclusions and merge/review state. Do not merge probes. The broader issue #4 matrix and automatic merge completion remain **Not verified**.

### Live verification matrix

| Probe | Required evidence | Current status |
| --- | --- | --- |
| Valid JSON-only edit (e.g. enable country, reorder columns, change page size) | Both genuine checks pass; no human approval required; merge box requirements satisfied | **Not verified** |
| Harmless outside-scope or mixed change, ordinary CI passing | GitHub blocks without required non-author Code Owner approval, independently of classification text | **Not verified** |
| Same valid outside-scope PR after authorized non-author approval | Required review and checks satisfied; no merge performed | **Not verified** |
| Invalid JSON-only and mixed configurations, with human approval | Policy fails and merging remains blocked | **Not verified** |
| Config rename/deletion/mode change; workflow/policy/CODEOWNERS edits | Invalid config stays blocked; outside paths require review; proposed validator does not execute as its own authority | **Not verified** |
| Genuine failing/cancelled CI with otherwise valid configuration | Required quality check blocks despite policy success or approval | **Not verified** |
| Head/base update after successful checks/review | Current head/base reevaluated; stale approvals/checks cannot establish eligibility | **Not verified** |
| Check provenance and token isolation | Required sources match genuine Actions records; trusted job executes only main; candidate job has no Checks-write token or additional privileged credential | **Not verified** |
| Actual configuration-only and reviewed auto-merge completion | Separately authorized real merges, with no bypass/self-approval | **Not verified; not authorized in this task** |

No local assertion demonstrates native Code Owner enforcement or spoof resistance. Local tests cover the contract, complete Git diffs, API integrity/staleness, event-bound PR isolation, failure propagation and read-only audit behavior using **mock HTTP responses**. Application tests/build/Playwright cover KYC behavior. Fresh-session skill validation (#5) and final integrated verification (#6) remain separate.

## Entering auto-merge after activation

An authorized repository writer may enable GitHub auto-merge on a specifically authorized PR after inspecting the full diff and effective controls. For example, from this checkout:

```sh
gh pr merge <authorized-pr-number> --auto --squash
```

**This command can merge immediately if requirements already pass.** Do not run it merely to test eligibility or on implementation/probe PRs without separate merge approval. Do not use `--admin`, self-approval, approval bots or a label-based exception. GitHub must wait for both required checks and, outside the configuration surface, the authorized Code Owner approval. If the actor lacks write/auto-merge permission, report the blocker instead of substituting credentials. Merging grants no business/compliance approval and performs no production deployment.
