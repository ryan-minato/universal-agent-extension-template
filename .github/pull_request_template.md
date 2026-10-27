<!--
The title is the squash commit title: `<type>(<scope>): <subject>`, scope = the area without its
prefix (`core`, `codex`, `claude-code`, `antigravity`, `pi`, `docs`, `ci`, `scripts`,
`spec-workflow`, `harness`); omit the scope for a repository-wide change.
Never add AI or tool attribution anywhere in this pull request.
-->

## What and why

<!-- The outcome this PR makes true once merged, and why it matters. Not the diff. -->

## Changes

<!-- Filled in when the PR is marked ready: where and what, briefly, as permalinks to the commits. -->

_Reserved: filled in when the pull request is marked ready._

## Related work

<!-- Closes #N: the closing keyword drives the issue lifecycle. -->

- Spec: [openspec/changes/NAME/](link to the change on this branch), or "none" and the exemption (Dependabot bump, typo,
  regenerated file)
- Phase: specification
- Records: proposal.md, specs/CAPABILITY/spec.md, design.md when warranted; tasks.md follows approval
- Approval: `spec:approved` on this pull request is the package approval, kept by the PR labels workflow while the
  package is unchanged; noted here: each reconciliation of the threads before acting on it, and the archive command

## Validation

<!-- Filled in when the PR is marked ready: each Acceptance item and scenario of the change and its result, the CI run, and the smoke tests run or skipped per framework. -->

_Reserved: filled in when the pull request is marked ready._

## Checklist

- [ ] `just check` passes locally
- [ ] The Acceptance of the linked change's proposal, with the scenarios it points to, is met, or this PR has no
      OpenSpec change
- [ ] This PR carried `spec:approved`, read with `just pr-labels`, before the task list, or it has no OpenSpec change
- [ ] Every task of the change record is done and verified, or the specification is updated; the change is archived only
      on the maintainer's command, and `spec-archived` blocks the merge until it is
- [ ] Generated files were produced by `just generate`, never edited by hand; a version bump has its `CHANGELOG.md`
      section
- [ ] No secrets, credentials, or personal data in the diff, description, or commits
