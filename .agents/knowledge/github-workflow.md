# GitHub Workflow

Read before creating a branch, opening or updating an issue or pull request, applying labels, creating a milestone, or
proposing any new management structure. GitHub is this repository's only remote and task-management platform, so every
rule here is written in GitHub terms.

`ryan-minato/universal-agent-extension-template` (personal account, public). The maintainer is the repository owner; a
collaborator with write access counts as a maintainer. A personal repository has no organization issue types or issue
fields, so the type and status axes live on labels.

## What this repository is

A template for a cross-framework coding-agent plugin, with `todo-tracker` as its sample. Consumers install the
repository itself, at `main` or at a `v*` tag, through each framework's own mechanism; adopters copy the repository and
reshape it with the `template-adopt` skill. A merge that bumps `plugin.json`'s version is published by the Release
workflow within minutes, so acceptance is complete before merge, and a bad release is followed by a higher version.

## Objects in use

| Object                                     | Meaning here                                                                                                                                                                                                                                           | What is lost without it                                             |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| Issue                                      | One independently acceptable outcome. Typed with one of `bug`, `enhancement`, `task` (Labels).                                                                                                                                                         | The record of why a change exists; PRs would have nothing to close. |
| Pull request                               | Every change to `main`. A draft PR is work in progress, including a draft whose first content is an OpenSpec change awaiting approval.                                                                                                                 | Review, CI feedback, and the one place acceptance happens.          |
| Acceptance                                 | `ci-gate` and the other required checks pass, the Acceptance of the PR's OpenSpec change is verified (`spec-workflow.md`), and the maintainer merges.                                                                                                  | Merge would equal an unchecked release.                             |
| Type labels (`bug`, `enhancement`, `task`) | The kind of work, set by the issue form. Bug: the plugin or the harness behaves differently from its specification or documentation. Enhancement: a new component, framework, or behavior. Task: all other planned work, harness and tooling included. | Filtering defects from new work.                                    |
| `status/needs-triage`, `status/blocked`    | Set by the form on arrival; removed at triage. Blocked marks an issue waiting on another or on an external decision.                                                                                                                                   | The triage list.                                                    |
| Area labels                                | The part of the repository an issue or PR concerns (Areas).                                                                                                                                                                                            | Filtering by area.                                                  |
| Specification-state labels                 | `spec:pending`, `spec:approved`, `spec:archived`, kept by the PR labels workflow; `spec:approved` is the maintainer's package approval (`spec-workflow.md`).                                                                                           | An approval that outlives the session.                              |
| `goal`                                     | A tracking issue: a long-horizon goal with vision, non-goals, acceptance, and its sub-issues.                                                                                                                                                          | Related issues tied together by title wording alone.                |
| Sub-issues                                 | The children of a tracking issue; no other issue has children.                                                                                                                                                                                         | Progress of a goal read from one issue.                             |
| Milestone                                  | One per release version (`v0.2.0`): the issues that version should close. Closed, never deleted, when the version is released.                                                                                                                         | The release's scope, read from one page.                            |
| Tag `v<version>` and GitHub Release        | The delivery: created by the Release workflow with notes generated from PR labels plus the CHANGELOG section (`github/checks.md`).                                                                                                                     | Mapping an installed version to its commit and notes.               |
| Discussions                                | Questions, ideas, and announcements (categories Q&A, Ideas, Announcements). Issue forms route non-work traffic there.                                                                                                                                  | Questions filed as issues.                                          |

## Areas

An area label states the part of the repository an issue or a pull request concerns; its name is `area:` and the area's
name, which is also the PR title scope (`git-workflow.md`). This section is the one definition; `.github/labels.yml`
repeats each in a label's hover text (Synchronization).

| Label                | Covers                                                                                                                       |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `area:core`          | `plugin.json`, `mcp.json`, `lib/`, `skills/`, `agents/`, `integrations/README.md`, `openspec/specs/`                         |
| `area:codex`         | `integrations/codex/`, `.codex-plugin/`, `.codex/`                                                                           |
| `area:claude-code`   | `integrations/claude-code/`, `.claude-plugin/`, `.mcp.json`                                                                  |
| `area:antigravity`   | `integrations/antigravity/`, `.antigravity-plugin/`, `rules/`, `hooks.json`, `mcp_config.json`                               |
| `area:pi`            | `integrations/pi/`, `package.json`                                                                                           |
| `area:docs`          | `docs/`, `zensical.toml`, `README.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, `SECURITY.md`, `SUPPORT.md`, `CODE_OF_CONDUCT.md`  |
| `area:ci`            | `.github/workflows/`, `.github/actions/`, `.github/dependabot.yml`                                                           |
| `area:scripts`       | `scripts/`, `tests/`, `justfile`, `deno.json`                                                                                |
| `area:spec-workflow` | `openspec/` (except specs), OpenSpec's generated skills, `.agents/knowledge/spec-workflow.md`                                |
| `area:harness`       | `AGENTS.md`, the rest of `.agents/`, `.claude/`, `.devcontainer/`, `.github/` (forms, templates, labels), root configuration |

A triaged issue has at least one area label. A pull request gets the area labels of the paths it changes from the PR
labels workflow, which adds and never removes them; the map from paths to areas is `areaOf` in
`scripts/sync_pr_labels.ts`, and a change's own files under `openspec/changes/` give no area.

## Labels

The repository's labels are exactly the set `.github/labels.yml` declares, GitHub's default labels included, and change
only by applying that file: the Labels workflow creates and updates after a merge that changes the file and deletes
nothing; an undeclared label is deleted by `just labels --apply` on the maintainer's command (`--delete-used <name>`
when something carries it). `just labels` prints the difference. What an agent may set is in `agent-authority.md`.

## Decomposition

One issue per independently acceptable outcome: "add a Pi theme", "`todo-scan`: honour `.gitignore`", "Antigravity hook
path does not resolve". Steps inside that outcome are tasks in the OpenSpec change's `tasks.md`, not issues. A tracking
issue (`goal`) groups several outcomes that deliver one stage, for example resolving the Antigravity verification items;
its sub-issues close through their PRs, and the maintainer closes the goal.

## Triage

The working list is `is:issue is:open label:status/needs-triage`. An issue from a form arrives with its type label and
`status/needs-triage`. The maintainer reads it and, once it has enough detail to act on (framework, version,
reproduction for a bug), sets the area label and removes `status/needs-triage`; an issue that is really a question is
converted to a discussion. A planned release gets a milestone and the issues it should close.

## Planning view

Filtered issue and PR lists; any view is rebuildable, the facts live on issues, PRs, and the OpenSpec specs.

| List                           | Filter                                                |
| ------------------------------ | ----------------------------------------------------- |
| Triage                         | `is:issue is:open label:status/needs-triage`          |
| Work to pick, by type and area | `is:issue is:open label:enhancement label:area:codex` |
| Next release                   | `is:issue is:open milestone:v0.2.0`                   |
| Work in progress               | `is:pr is:draft`                                      |

## Deliberately not used

| Object          | Enable when                                                                                    |
| --------------- | ---------------------------------------------------------------------------------------------- |
| Priority labels | Two or more people pick work from the same list and the type and milestone no longer order it. |
| GitHub Projects | Three or more people work in parallel, or the goals need a roadmap that orders them.           |
| Wiki            | Never: `docs/` is published to Pages.                                                          |

## Specifications

The OpenSpec contract lives in `spec-workflow.md`. Because of it:

- the PR template carries the specification block under `## Related work` (`Spec:`, `Phase:`, `Records:`, `Approval:`)
  and checklist items for the package gate and the archive command;
- the Feature request and Task forms carry an optional `Specification` field, and their acceptance fields defer to the
  change's proposal Acceptance;
- the `github-project-workflow` skill's Take work, Create issues, and Finish steps apply the gates, the reconciliation,
  and the archive-on-command rule;
- the `spec-archived` check (workflow PR, `scripts/validate/check_spec_archived.ts`) is withheld from a PR that still
  holds an unarchived change, draft or ready, which blocks its merge without failing the run (`github/checks.md`,
  Waiting for the archive);
- the PR labels workflow (`.github/workflows/pr-labels.yml`, `scripts/sync_pr_labels.ts`) keeps `spec:pending`,
  `spec:approved`, and `spec:archived` on pull requests.

A ready PR needs `Phase: implementation`, a `Spec:` line, no reserved line left in Changes or Validation, and every
checklist item ticked except the one `spec-archived` tracks.

## Synchronization

| When this changes                                                                  | Update in the same PR                                                                                                                                                                                                                                                                   | Owner                                              |
| ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| A CI or PR job is renamed or added                                                 | `github/checks.md` job map; the `main` ruleset's required checks (maintainer, `github/platform-settings.md`)                                                                                                                                                                            | PR author; maintainer for the ruleset              |
| A `just` recipe CI calls                                                           | the job that calls it and the `github/checks.md` map                                                                                                                                                                                                                                    | PR author                                          |
| PR template `##` headings or the security item                                     | nothing else: `scripts/validate/check_pr_body.ts` reads the template; keep the word "secrets" in the security item                                                                                                                                                                      | PR author                                          |
| PR template specification block or checklist items                                 | `spec-workflow.md` if a gate or the archive rule changed, else revert the template                                                                                                                                                                                                      | PR author                                          |
| An area is added, renamed, or redefined                                            | `.github/labels.yml` (name and hover text), the Areas table here, the scopes in `git-workflow.md`, the comment at the top of `.github/pull_request_template.md`, the first input's description in `.github/ISSUE_TEMPLATE/bug.yml`, `AREAS` and `areaOf` in `scripts/sync_pr_labels.ts` | PR author; the maintainer commands the application |
| A top-level path is added, or the paths of an area change                          | `areaOf` in `scripts/sync_pr_labels.ts`; its test over the tracked files fails until every path matches a row                                                                                                                                                                           | PR author                                          |
| A label named by an issue form, `.github/dependabot.yml`, or `.github/release.yml` | `.github/labels.yml` must declare it (`just labels --check`)                                                                                                                                                                                                                            | PR author                                          |
| Issue form `spec` field or acceptance descriptions                                 | `spec-workflow.md`, Specifications and issues                                                                                                                                                                                                                                           | PR author                                          |
| `github-project-workflow` Take work / Create issues / Finish                       | `spec-workflow.md` and `agent-authority.md` must still agree                                                                                                                                                                                                                            | PR author                                          |
| An action is added to or changed in a workflow or composite action                 | pin it by full commit SHA with its version in a comment (`@<sha> # vX.Y.Z`); a third-party action is added to the allowed list in `github/platform-settings.md` by the maintainer first                                                                                                 | PR author; maintainer for the allowed list         |
| A tool pin in `.github/actions/setup-tools/action.yml`                             | run `just check` with that version; the OpenSpec pin matches `spec-workflow.md`                                                                                                                                                                                                         | PR author                                          |
| The release tag format or the CHANGELOG format                                     | `git-workflow.md`, `scripts/release/check_release.ts`, `.github/workflows/release.yml`, `CHANGELOG.md`                                                                                                                                                                                  | PR author                                          |
| `README.md` installation lines or the support matrix                               | `docs/` pages they summarize; the matrix lives in `docs/reference/support-matrix.md` only                                                                                                                                                                                               | PR author                                          |

## Harness review

Run this review when `AGENTS.md` passes about 120 lines, after every tenth merged PR, or when an agent follows a rule
that turns out to be stale. Report findings as an issue (type `task`, `area:harness`) with keep / update / remove
recommendations before editing anything:

- Every path, command, and job name in `AGENTS.md` and `.agents/knowledge/` still exists and runs (`just harness-check`
  covers paths and recipes; job names are read by hand).
- Every knowledge file is reached from `AGENTS.md`, and no two files state the same rule.
- Pinned versions (setup-tools inputs, `jsr:`/`npm:` imports in `scripts/`, the TruffleHog action) are not far behind
  upstream.
- Every row of the verification items table in `frameworks.md` is still open or has been moved.
- "Deliberately not used" triggers in this file: has any fired?
- `is:issue is:open label:status/needs-triage` is empty.
- `just labels` prints no difference.
- A constraint that no longer catches anything (a check, a rule, a skill) is listed for removal.

## Update this file when

- A second regular contributor joins, or outside contributions start arriving in volume.
- A "not used" trigger fires.
- An object in use goes unused for a sustained period; remove it.
- How consumers install the plugin changes (a marketplace, a registry).
