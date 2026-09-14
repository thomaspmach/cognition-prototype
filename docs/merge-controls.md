# Owner settings and activation: issue #4

**Activation status: Not verified.** No repository settings are changed by these files. The implementation PR must receive human review and a separately authorized normal merge before its main-sourced policy can operate. Do not mark live enforcement passed from local tests, mocked HTTP responses or workflow files.

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
- **`kyc/presentation-policy`:** trusted main workflow/code reads PR trees as data. It installs no dependencies and never executes candidate scripts, actions, dependencies or artifacts. The built-in short-lived token has Contents read, Pull requests read and Checks write; no additional credential is required.
- The policy publishes an in-progress check on each evaluated PR head, then only success or failure. Failed/cancelled execution must not be treated as success; interrupted publishing can leave a blocking in-progress check.
- PR events, main pushes and main-only manual dispatch sweep open PRs targeting main. Runs are serialized; each evaluation rechecks current PR/base/head identity before publishing success. Require branches up to date as an independent GitHub condition. A main change during evaluation requires a rerun.
- The workflow's **Evaluate trusted main policy** job can fail because another open PR is invalid. Its job status is not the required context: inspect the individual PR's `kyc/presentation-policy` check.
- CODEOWNERS is read by GitHub from the base branch. Its wildcard assigns every other path to `@thomaspmach`, including source, dependencies, migrations, registry/access rules, instructions, schema, tests and workflows. A PR cannot remove its own review obligation by editing proposed CODEOWNERS.

**Trusted-writer limitation:** repository writers and maintainers are trusted not to forge check results or deliberately bypass controls. Another branch workflow can request write permissions and publish the same check context through the shared GitHub Actions identity. Check names, Actions source selection and read-only defaults do not authenticate the originating workflow. This can bypass validation/CI checks; it does not itself create Code Owner approval. No spoofing experiment or forged live result is part of verification. This design is **not equivalent to spoof-resistant App-backed enforcement**.

If resistance to that writer threat is later required, stop and redesign before claiming it: use an isolated App publisher bound to the required gate (minimum Checks write and implicit Metadata read), or a supported organization/enterprise required-workflow rule. Do not silently add credentials, provision an App or transfer this user-owned repository.

## Exact owner-applied configuration

First inspect all existing rulesets and branch protections. Do not weaken or delete an existing control to make this design work. If another rule imposes blanket review or conflicts with the intended exception, obtain an explicit decision. At planning time the owner reported main unprotected, private-repository rulesets available, Actions enabled, default workflow tokens read-only, workflow PR approvals disabled and auto-merge disabled. This integration could not independently read administrative settings.

After observing genuine workflow results, select **GitHub Actions** as the expected source for both required checks. Obtain the numeric App ID from those actual check-run records; it is the existing GitHub Actions App, not a dedicated new App. Do not use an invented ID or “any source.”

Create this ruleset with `ACTIONS_APP_ID` replaced by that numeric ID in **both** locations:

```json
{
  "name": "kyc-main-merge-policy",
  "target": "branch",
  "enforcement": "active",
  "bypass_actors": [],
  "conditions": {
    "ref_name": {
      "include": ["refs/heads/main"],
      "exclude": []
    }
  },
  "rules": [
    {
      "type": "pull_request",
      "parameters": {
        "required_approving_review_count": 0,
        "require_code_owner_review": true,
        "dismiss_stale_reviews_on_push": true,
        "require_last_push_approval": false,
        "required_review_thread_resolution": true,
        "allowed_merge_methods": ["merge", "squash", "rebase"]
      }
    },
    {
      "type": "required_status_checks",
      "parameters": {
        "strict_required_status_checks_policy": true,
        "do_not_enforce_on_create": false,
        "required_status_checks": [
          { "context": "ci/quality", "integration_id": "ACTIONS_APP_ID" },
          { "context": "kyc/presentation-policy", "integration_id": "ACTIONS_APP_ID" }
        ]
      }
    },
    { "type": "deletion" },
    { "type": "non_fast_forward" }
  ]
}
```

`integration_id` must be a JSON **number**, not the placeholder string. This is an owner-reviewed template, not an automatically applied setting.

Preserve read-only default workflow tokens and disabled workflow PR approvals. No administrator, App or Devin actor belongs in the bypass list. Do not require a blanket approval count or approval of the last push: that would block the valid configuration-only path too. All other existing protections remain in force.

**Reviewer/actor:** `thomaspmach` is the observed human Code Owner and must retain write/admin repository access. KYC application Reviewer roles confer no GitHub review permission. The author cannot approve their own PR. A Thomas-authored outside-scope PR needs another authorized, non-author human Code Owner configured through normal reviewed changes. Confirm the actual bot/Devin PR author and repository permissions; do not impersonate another author to obtain approval. Missing writer/reviewer access is a blocker, never grounds for bypass.

## Activation sequence — owner-controlled, after separate approval

1. Review and normally merge the implementation PR only with separate authorization. The new trusted `pull_request_target` workflow cannot attest to its own introduction while absent from main. The implementation's policy changes require human review.
2. Keep auto-merge disabled. After authorization to conduct activation testing, open **unmerged** probe PRs against the new main. Observe genuine `ci/quality` and `kyc/presentation-policy` records, their App identity, tested revisions and conclusions. Manual policy dispatch must target main.
3. Apply the active ruleset above, with the observed numeric App ID and no bypass. Read back effective rulesets/protections, Actions settings and CODEOWNERS errors. Confirm both contexts are required and source-bound, zero blanket approvals plus required Code Owner review are active, main must be current, and force pushes/deletions are blocked.
4. Execute the live matrix below under those effective settings. Record PR URLs, base/head SHAs, check-run links/conclusions, author/reviewer identities and GitHub merge/review state. Waiting, failed, skipped, neutral, cancelled or stale evidence is not a successful demonstration. Do not approve as the author, forge checks, merge a probe or use administrator bypass.
5. Only after successful verification and separate owner approval, enable the repository's **Allow auto-merge** capability. Leave implementation/probe PR auto-merge disabled. Actual auto-merge completion remains **Not verified** until a separately authorized merge occurs.

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

No local assertion demonstrates native Code Owner enforcement or spoof resistance. Local tests cover the contract, complete Git diffs, API integrity/staleness and publisher decisions using **mock HTTP responses**. Application tests/build/Playwright cover KYC behavior. Fresh-session skill validation (#5) and final integrated verification (#6) remain separate.

## Entering auto-merge after activation

An authorized repository writer may enable GitHub auto-merge on a specifically authorized PR after inspecting the full diff and effective controls. For example, from this checkout:

```sh
gh pr merge <authorized-pr-number> --auto --squash
```

**This command can merge immediately if requirements already pass.** Do not run it merely to test eligibility or on implementation/probe PRs without separate merge approval. Do not use `--admin`, self-approval, approval bots or a label-based exception. GitHub must wait for both required checks and, outside the configuration surface, the authorized Code Owner approval. If the actor lacks write/auto-merge permission, report the blocker instead of substituting credentials. Merging grants no business/compliance approval and performs no production deployment.
