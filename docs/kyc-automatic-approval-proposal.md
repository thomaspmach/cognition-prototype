# Unapproved proposal: automatically approve cases with a risk score below 20

**Status: non-executable design proposal only. No behavior in this proposal is approved for implementation or activation.**

References: [validation issue #5](https://github.com/thomaspmach/cognition-prototype/issues/5), [product scope #7](https://github.com/thomaspmach/cognition-prototype/issues/7).

The request is “Automatically approve cases with a risk score below 20.” This document makes the proposed change reviewable outside the presentation surface. Automatic KYC decisions remain outside product scope. There is no executable rule, endpoint, migration, job, feature flag or runtime configuration in this change. No requested rule is run against synthetic or real cases. This proposal does not evaluate semantic, business or legal correctness.

## Actual workflow discovered independently

Starting main: `b9de0d88888e5b4d1849e994ba5bda9e2e517752`, fetched in a fresh Cloud session on 2026-09-14. The repository's `change-internal-tool` skill was explicitly invoked; discovery followed `AGENTS.md`, README, architecture, security, standards, issue #5 and epic #7.

| Area | Observed implementation |
| --- | --- |
| Entry and composition | `lib/tool-registry.ts` identifies Compliance's `/tools/kyc`; `app/(workspace)/tools/kyc/page.tsx` requires a page actor and renders `components/kyc/kyc-queue.tsx`. Shared queue/detail/action/history components compose the human review interface. |
| Read/write boundary | `app/api/kyc/cases/route.ts` and `app/api/kyc/cases/[id]/route.ts` delegate to `lib/server/kyc.ts`. Reads require a session; POST requires a Reviewer and matching origin. The service independently rechecks the Reviewer. |
| Identity | Better Auth in `lib/server/auth.ts` supplies database sessions; `lib/server/access.ts` reads the persisted user role. Public signup is disabled. Registry role labels are descriptive, not authorization. |
| Human actions | `lib/kyc/model.ts` and `components/kyc/case-actions.tsx` support explicit assignment and decisions. Pending permits approve/reject/escalate; escalated permits approve/reject. Approved/rejected are terminal and read-only. Rejection requires a reason. Assignment is nonexclusive: any authorized Reviewer may decide regardless of assignee. |
| Risk data | `lib/server/schema.ts` stores `riskScore` as a required SQLite real, without a score range, provenance or freshness constraint. `lib/server/seed.ts` supplies synthetic values. Scores are displayed as informational; neither reads nor mutations use them to choose decisions. There is no application score-update or case-ingestion API. |
| Persistence | `mutateCase` uses an immediate transaction, expected version, conditional update and unique case/event version. It writes an event containing authenticated actor ID, UTC timestamp, old/new status and assignee, reason and version with the case mutation. Event history joins the user's current name; it is not tamper-proof. |
| Presentation | `lib/kyc/presentation.json` only enables supported filters, orders all six mandatory columns and selects page size. Country filtering is supported but disabled. This contract contains no decision rules. |
| Existing verification | `tests/server/kyc.test.ts` covers roles, origin/identity tampering, transitions, stale/competing writes and event-failure rollback. `tests/e2e/kyc.spec.ts`, `access.spec.ts` and workspace specs exercise current human review and regressions. Presentation/policy tests validate the bounded contract and mocked gate behavior, not native GitHub review enforcement. |

## Proposed behavior — all unapproved

### Exact threshold and candidate eligibility

The requested comparison is **strictly below 20**, written `riskScore < 20`; equality at 20 is excluded. This transcribes the request and does not establish whether that threshold is appropriate. No rounding, score rescaling, inclusive comparison or additional numeric cutoff is proposed.

A concrete candidate envelope for owner review is:

- Only a case currently in **pending** status could be considered.
- Its current stored score would need to be a finite number from an explicitly approved source, satisfying the owner-defined validity and freshness requirements and the requested strict threshold.
- The case would need to belong to the owner-approved population, with any owner-defined holds/exclusions cleared. Existing fields do not establish those conditions.
- The proposed change would preserve the assignee and create a pending-to-approved decision. It would not assign ownership to the automation.
- Escalated, approved and rejected cases would be excluded from this candidate envelope. Missing, invalid, untrusted, stale or otherwise unresolved eligibility data would leave the case unchanged for human review.

Pending-only eligibility, exclusions, score validity/freshness and population are **proposals, not inferred user decisions**. In particular, the request does not specify how escalated cases, negative/out-of-domain scores, assigned cases, jurisdiction, holds or later score changes should be treated. No existing case has been classified under this candidate envelope.

### Trigger and execution boundary

The proposed trigger would be an explicitly authorized server event after a case/score ingestion or score update has committed, targeting one identified case version. Those ingestion/update capabilities do not currently exist. The proposal would not attach decisions to queue reads, opening details, sign-in, page refresh, seeding, migrations or application startup.

An event consumer would reread the committed case and eligibility inputs before any decision. Duplicate delivery would not create another decision. A changed case/score would invalidate the original attempt; an independent, newly authorized event would be needed to reconsider it. Failures would leave the case for human review and surface an operational error.

No historical sweep/backfill, schedule, retry interval, queue technology or delivery guarantee has been approved. Whether newly created cases, score changes, both or an explicitly requested batch should trigger consideration is an unresolved owner decision.

### Server authorization

The current Viewer/Reviewer session model authorizes human actions only. A proposed automated actor would require a separate, narrowly scoped server permission for this particular operation and eligible population; a KYC Reviewer role alone would not confer authority to run or configure it.

Any future implementation would need server-derived identity, trusted server-side score/provenance and policy revision, explicit enablement authority, and authorization checks both at its entry point and transactional service. A browser-supplied role, actor, score, threshold or “approved” flag would not confer eligibility. Existing human session, origin and strict input checks would remain in effect.

No service account, authentication mechanism, credential, role extension, endpoint or enablement mechanism is selected or provisioned here. The owner must decide who can authorize, configure, enable, suspend and operate any future automation.

### Actor and event attribution

A proposed automated decision would be visibly attributable to a dedicated machine principal, never the assignee, the last human reviewer, a seeded person or the user who happened to open the case. If a human initiates a future batch, the initiating human and executing machine would have separate attribution.

The proposed event record would include the executing principal, decision source (“automatic”), triggering event/deduplication identifier, case ID and version, UTC time, old/new status, unchanged assignee, score and provenance/freshness snapshot, threshold and policy revision, and an explicit machine-generated reason. A history view would distinguish automatic decisions from human decisions without claiming a human performed review.

The current `case_event.actor_id` references `user`; events only distinguish assignment/decision, and the displayed actor name is joined at read time. These fields cannot silently be treated as machine attribution or durable policy provenance. Principal representation, historical name handling, event fields, retention, permissions and migrations require owner-reviewed design before implementation.

### Transactions, conflicts and failure requirements

The proposed operation would preserve the existing atomic state/event invariant: reread current state and eligibility in the transaction; require the intended version; condition the update on that version; increment it exactly once; and commit one decision event with the case update. Event-insert failure would roll back the state update.

A human decision, assignment or competing automated attempt that changes the version would invalidate a stale attempt. The proposal would not overwrite a terminal decision, ignore a conflict, blindly retry using a newer version, or record success after denial, validation failure or rollback. Any future external score store would need an approved snapshot/version consistency design; the present SQLite transaction does not provide cross-system atomicity.

For a future asynchronous trigger, owners must select atomic event publication/delivery and deduplication behavior, including recovery from “committed but acknowledgment lost.” No queue, outbox or retry mechanism is implemented by this document. Existing `(case_id, version)` uniqueness is useful but does not alone settle those delivery requirements.

## Unresolved owner decisions

These questions are recorded for the coordinator to relay. None blocks delivery of this document; all remain unresolved for any future implementation request.

| Decision | Question for the responsible owners |
| --- | --- |
| Product scope and authority | Would Operations/Compliance and Engineering authorize a separate future project at all, and who owns its policy? Approval of this documentation PR would not authorize automatic decisions. |
| Eligibility | Should eligibility be pending-only as proposed, or include escalated cases? What population, assignment treatment, holds and exclusions would apply? |
| Score contract | Which source, scale, validity rules, precision and freshness would be authoritative? How should invalid/missing scores and later score revisions be handled? |
| Trigger | Should future consideration follow new case ingestion, score updates or an explicit batch? Would historical cases ever be included? |
| Authorization and operation | Who may enable/suspend/configure it, with what server principal, permissions and operational recovery procedure? |
| Attribution and concurrency | What machine/human provenance and retention are required, and what consistency/deduplication and conflict/retry behavior should be approved? |

## Review and validation boundary

This Markdown file is outside `lib/kyc/presentation.json` and belongs to the base branch's wildcard Code Owner, `@thomaspmach`. A non-draft PR must remain open and unmerged. A genuine passing `kyc/presentation-policy` check means the complete diff and presentation were valid; its outside-scope classification supplies **no approval**. Native GitHub Code Owner review must still require an authorized, non-author human, independently of passing `ci/quality`.

Owner activation evidence is [issue #4's activation comment](https://github.com/thomaspmach/cognition-prototype/issues/4#issuecomment-5668470821). This session independently read active ruleset `23344201`, effective main rules, protected main, error-free CODEOWNERS, `thomaspmach`'s admin permission and disabled repository auto-merge. Both required contexts are bound to GitHub Actions App `15368`; branches must be current, with zero blanket approvals plus required Code Owner review. The PR evidence records current base/head, actual author, check provenance/results and native review/merge state after checks finish.

Verification is separated into:

1. **Outside-scope Code Owner review:** establish with genuine current-revision passing checks plus native missing-review state, not a draft or generic pending/failing-CI block.
2. **Implementation absent:** inspect the entire base-to-head diff and changed-file modes; only this non-executable document may change. Run the unchanged repository setup, checks, build and browser suite against the existing human-review workflow. Commands and results belong in the PR/session evidence; secrets, databases and generated reports remain outside Git.
3. **Semantic evaluation:** not performed and out of scope. No test, synthetic run, policy success or Code Owner approval establishes business/legal suitability of the requested rule.

The documented trusted-writer assumption applies. This validation does not claim spoof-resistant enforcement, attempt a forged check, approve a PR, change protections, merge, enable auto-merge or deploy.
