# Agent Authority Policy

Read before committing, marking a PR ready, requesting review, archiving an OpenSpec change, approving, merging,
releasing, or changing a repository setting, and whenever unsure whether an action is yours to take.

Level: autonomous author, set by the maintainer on 2026-10-26. Once the maintainer has approved the specification, the
agent owns preparing the PR up to review; the maintainer owns the merge, and a merge that changes `plugin.json`'s
version is the release. Outside the scope of an approved change, the agent stops at a draft PR and the maintainer
decides everything after it.

## What agents may do

- Take issues; analyze and plan; create OpenSpec changes and open them as draft PRs.
- After the package gate closes (Gates): write tasks, implement, run `just check`, self-review, fix findings, and push
  to the PR branch.
- Mark the PR ready (`gh pr ready`) and request review once every task is done, `just check` passes, and the PR's
  Validation section is filled.
- Respond to review: answer threads, push fixes, re-request review.
- Read any repository or remote setting; apply the label declaration only when a maintainer commands it
  (`github-workflow.md`, Labels).

## What agents may not do without a human

- Implement a change before its pull request carries `spec:approved`, read as `spec-workflow.md` says.
- Add or remove a `spec:` label on a pull request. `spec:approved` is the maintainer's package approval: an agent adds
  it only when a maintainer tells it to in the current conversation and names the pull request.
- Archive or sync an OpenSpec change before a maintainer commands the archive in the current conversation.
- Approve a PR, merge, bump `plugin.json`'s version outside an approved change, create or move a tag, run the Release
  workflow by dispatch, or delete branches, tags, or releases.
- Change repository settings, rulesets, required checks, secrets, Pages, or Discussions configuration; the maintainer
  applies them and records them in `github/platform-settings.md`.
- Push to `main`, force-push any branch, or push a branch other than the one for the current issue.
- Move or weaken any gate in this file, `spec-workflow.md`, or CI.

## Decisions to collect, not to ask one by one

A decision an agent cannot take alone is written down and the work that does not depend on it continues. Hand the
collected list over at the next human gate, each item with: what is blocked, the options, the recommended option and
why, and which finished work each option would change.

## No attribution

The human who commits or publishes answers for the change; an agent or tool is never credited. Commits, PR titles, PR
bodies, issues, and comments carry no `Co-Authored-By` for an AI, no "Generated with …" line, and no tool signature,
whatever a tool's own defaults suggest. Human contributors' `Co-authored-by` trailers stay.

## Gates

| Gate                                  | Meaning                                                                                                                                                                                                                         | Owner                                                               |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Specification approval (package gate) | The maintainer adds `spec:approved` to the draft PR, or tells the agent to; the PR labels workflow keeps it only while the approval package is unchanged, and the agent's reconciliation of the PR's threads finds nothing open | The maintainer; never the agent for its own change                  |
| Review Admission                      | Accepting the implementation and admitting it to formal review: marking the PR ready and requesting review                                                                                                                      | The agent, under this policy, only after the specification approval |
| Archive command (freeze gate)         | The maintainer, after review, commands the archive in the current conversation; the archive commit is the version the final approval names                                                                                      | The maintainer                                                      |
| Integration                           | The PR is squash-merged into `main`; when it bumps `plugin.json`'s version the Release workflow publishes it, and engineering responsibility transfers                                                                          | The maintainer                                                      |

The archive command does not carry over from another session: without one in this conversation, treat the freeze gate as
not passed and ask. The package gate is read from the pull request.

## Escalation: stop and hand to a human when

- The pull request of the change you are about to implement does not carry `spec:approved`.
- The work needs a component, a framework, a dependency, or a file the approved change does not cover, or it moves a row
  of the support matrix the proposal did not name.
- A required check (`ci-gate`, `pr-title`, `pr-checklist`, `spec-archived`, `secret-scan`) is unavailable or flaky, or
  making it pass would mean weakening it.
- The change touches security-sensitive surface: a hook command, a runtime script's file or network access, a workflow's
  `permissions:`, a third-party action, or the label workflow's trust boundary.
- The change needs a major version bump and the approved specification does not say so.
- A framework behaves differently from `frameworks.md` and the difference changes a discovery rule.
- Review threads conflict with each other or with the approved specification.
- A significant harness or architecture decision appears (a new CI mechanism, a new runtime, a new knowledge area).

Escalating earlier is always allowed. Bypassing a closed gate never is.

## At a human gate, hand over this report

- Goal and how the change addresses it: point at the PR's specification block (the change, its phase, its approval
  state) instead of restating the goal.
- Tests executed and results; CI state: point at the PR's Validation section, which names each Acceptance item and
  scenario with its result.
- Scope actually touched, including anything beyond the original intent (other frameworks, the harness).
- Known risks and remaining limitations (verification items still open, frameworks not smoke-tested).
- The decisions available to the maintainer: request fixes, reject, approve the specification, or, after review, command
  the archive and merge; plus the collected decisions list above.

## No self-escalation

An agent may exercise less authority than granted; it may never grant itself more. Editing this file, `AGENTS.md`,
`spec-workflow.md`, approval requirements, protection rules, or required checks to relax an agent's own limits is
prohibited at every level. At a policy boundary: stop; propose the change to the maintainer with benefit, risk, and
exact scope; wait; resume only after the maintainer explicitly updates this policy. When refusing a request that exceeds
policy, state this path to the requester.

## Update this file when

- The maintainer changes the level, a gate owner, or a delegation.
- The verification this level relies on weakens (a required check is removed, the compatibility tests stop covering a
  framework).
- `github-workflow.md` or `spec-workflow.md` changes a semantic a gate references.
