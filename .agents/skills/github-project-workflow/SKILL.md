---
name: github-project-workflow
description: >-
  Runs this repository's GitHub issue and pull-request lifecycle: taking or creating an issue,
  opening the draft PR with its OpenSpec change, reconciling after the maintainer's approval,
  finishing and marking a PR ready, archiving on command, publishing anything to GitHub, and
  diagnosing a failing check. Use when taking, creating, updating, or completing an issue or pull
  request; before any gh write (issue, PR, comment, label); or when a CI check is red. Not for
  changing the lifecycle policy, rulesets, or required checks, which the maintainer owns.
---

# GitHub Workflow

Tool path: authenticated `gh`; `gh api` for comments and review threads. Every metadata change (assignee, label,
milestone, state) is an explicit call; GitHub has no slash commands. This skill applies
`.agents/knowledge/github-workflow.md` (objects in use), `.agents/knowledge/git-workflow.md` (branches, titles),
`.agents/knowledge/spec-workflow.md` (the OpenSpec gates), and `.agents/knowledge/agent-authority.md` (what you may do
alone). `<repo>` below is `ryan-minato/universal-agent-extension-template`.

## Take work

1. Read the issue; confirm it is open and its outcome is concrete. If another identity is assigned, stop and ask. Decide
   the tier of the change from the files it will touch (`spec-workflow.md`, Scope of changes): behavior → a change with
   delta specs; harness → a change with `skip_specs: true`; exempt → no change, and the PR says which exemption applies.
2. Assign yourself (`gh issue edit <n> --add-assignee @me`), re-read, and confirm you are the sole assignee.
3. `gh issue develop -c <n>` creates and checks out the linked branch. Create the change with the `openspec-propose`
   skill, which stops before `tasks.md` (delete one it wrote anyway); run `just spec-check`. Commit the approval package
   (proposal, delta specs, `design.md` when warranted), push, and open a draft PR (`gh pr create --draft`) with
   `Closes #<n>` and a body built from `.github/pull_request_template.md`: `Phase: specification`, Changes and
   Validation on their reserved line. Then stop. The maintainer discusses on the PR and directs changes in conversation;
   push each through the publish gate.
4. The package approval is the label `spec:approved`, read by recomputing it: `just pr-labels <pr>` prints the state the
   rules give the pull request now, and anything else is not approved. When it prints `spec:approved`, read the PR's
   comments (`gh api repos/<repo>/issues/<pr>/comments`) and review threads with their resolution state (GraphQL
   `reviewThreads`, field `isResolved`); list every unresolved thread, every requested adjustment the change does not
   carry, and every pair of contradicting conclusions; ask the maintainer to confirm them; only when nothing is open or
   the open items are confirmed, write `tasks.md` (`openspec instructions tasks --change <name> --json`) and implement
   with the `openspec-apply-change` skill. Record the reconciliation on the `Approval:` line. Never add `spec:approved`
   on your own judgment; when the maintainer tells you to in the current conversation and names the pull request, add it
   (`gh pr edit <pr> --add-label spec:approved`) and read the workflow's record back with `just pr-labels <pr>`. When
   the labels on the PR disagree with `just pr-labels` and a missed run explains it, a dispatch reconciles that one PR
   and cannot approve (`gh workflow run pr-labels.yml -f number=<pr>`).
5. Keep the PR description current; comment major discoveries and decisions. Credentials, tokens, internal hosts, and
   personal data never go into an issue, PR, commit, or log.
6. Abandon by un-assigning, closing the draft with a status comment, and leaving the issue open.

## Create issues

An issue opens when the requirement appears, carrying the raw requirement and no acceptance criteria; it links the
OpenSpec change once that exists. Build the body to mirror the matching form in `.github/ISSUE_TEMPLATE/` (`### <label>`
headings), since `gh issue create` ignores forms.

- Type: one of the labels `bug`, `enhancement`, `task`; arrival state `status/needs-triage`.
- Area: one existing `area:` label when the area is clear (`github-workflow.md`, Areas).
- Milestone: only when the maintainer names the release the issue belongs to (`gh issue edit <n> --milestone v0.2.0`).
- A tracking issue carries the `goal` label and lists its sub-issues; sub-issues are added through the sub-issues API,
  never by a task list in the body. Create a `goal` only on the maintainer's word.
- Read back the labels (`gh issue view <n> --json labels,milestone`) and report a missing one.

Priority labels and Projects are deliberately not used (`github-workflow.md`); never create them.

## Publish gate

GitHub publication cannot be reliably undone: bodies, comments, commit messages, tags, and their notification copies
survive deletion, and public content is indexed within minutes. Every remote or publishable write passes this gate.

1. Assemble the exact final payload as files in a scratch directory outside the repository. For a pull request include
   `title.txt`, `body.md`, `commits.txt` from `git log BASE..HEAD --format=full`, `diff.patch` from
   `git diff BASE...HEAD`, and every attachment: a PR publishes its commit messages and diff, not only its description.
2. Review that directory independently: dispatch a clean-context subagent whose whole prompt is the review instruction,
   or, without subagent support, re-read every file from disk and note `Review mode: file-only (not clean-context)`.
   Judge only what the files contain.
3. The review checks every line for credentials and secrets, real personal data, internal-only hosts, URLs, or
   identifiers, unrelated or generated content in the diff, AI or tool attribution, @-mentions and cross-references that
   would notify uninvolved people, and regret-worthy wording. It ends with exactly `SAFE TO PUBLISH: YES` or
   `SAFE TO PUBLISH: NO`; any secret, personal-data, internal-context, or attribution finding means NO.
4. Treat anything other than a verbatim `SAFE TO PUBLISH: YES` as NO. Fix every finding, rebuild the directory, and
   review again. A secret that reaches GitHub is compromised even after deletion; tell the maintainer so it is rotated.
5. Confirm applicable approval, execute non-interactively, and read the result back. Published content must be
   byte-identical to the reviewed content; any edit after the verdict requires a fresh review.

## Finish

1. Run `just check`; for a change that touches a framework's files, run `just smoke <framework>` where its CLI exists
   and record the manual steps that remain in the Validation section. Then the CI path: the publish gate's review, the
   push, then watch the Actions run. Diagnose a red run with
   `.agents/skills/github-project-workflow/scripts/run_log_digest.ts --run-id <id>`; never fetch full logs, never weaken
   a check (`github/checks.md` maps jobs to commands).
2. Complete the PR checklist and update the description: `Phase: implementation`; Changes as permalinks to the commits;
   Validation naming each Acceptance item and scenario with its result, linking the CI run; every task of the change
   ticked. Then follow `agent-authority.md`: you may mark the PR ready (`gh pr ready`) and request review once
   `just pr-labels <pr>` prints `spec:approved`, then hand the maintainer the report it defines. From then on the PR
   waits for its archive: the PR workflow run succeeds and `spec-archived` is withheld until the archive commit lands;
   never report such a PR as mergeable. Archive only when the maintainer commands it in the conversation: the
   `openspec-archive-change` skill, `just spec-check`, commit, push, and note the command on the `Approval:` line. A
   commit after the archive commit spends the closing; say so and ask again.
3. The maintainer squash-merges; the closing keyword closes the linked issue. A merge that bumped `plugin.json`'s
   version is released by the Release workflow (`github/checks.md`, Release path); check the run and the new
   `v<version>` release, and report both.
