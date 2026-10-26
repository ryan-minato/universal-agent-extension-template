# CI Checks and Releases

Read when a check is red, before changing a workflow, a composite action, a job name, or a `just` recipe CI calls, and
before touching the release path.

## Required checks

`ci-gate` (workflow CI), `pr-title`, `pr-checklist`, `spec-archived` (workflow PR), and `secret-scan` (workflow Secret
Scanning). The `main` ruleset in `platform-settings.md` requires them once applied, so a failing one blocks merging, and
so does one that has not reported: `spec-archived` blocks that way while a change is unarchived (Waiting for the
archive). Required checks match by job name: a renamed job is renamed in the ruleset in the same PR, and a new name is
added to the ruleset only after it has reported once. `awaiting-archive` is never added.

## Job ↔ command map

Every CI job runs a command that also runs locally.

| Job (workflow)                                                | Command                                                                                                                                                                                                         | Runs on                                                |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `lint` (CI)                                                   | `just lint`: `deno fmt --check`, `deno lint`, `node --check` on the runtime scripts                                                                                                                             | PR, push to `main`                                     |
| `scripts` (CI)                                                | `just scripts-check`: `deno check` over `scripts/`, `tests/`, and the project skills' scripts                                                                                                                   | PR, push to `main`                                     |
| `test` (CI)                                                   | `just test`: unit, compatibility, and installation tests                                                                                                                                                        | PR, push to `main`                                     |
| `plugin` (CI)                                                 | `just generate-check` then `just validate`: generated files equal the sources; manifest, skills, agents, integrations valid; `claude plugin validate --strict` when the Claude Code CLI is installed in the job | PR, push to `main`                                     |
| `spec` (CI)                                                   | `just spec-check`: OpenSpec strict validation, config rules, generated skills current                                                                                                                           | PR, push to `main`                                     |
| `harness` (CI)                                                | `just harness-check`: paths and recipes named by `AGENTS.md` and the knowledge base exist                                                                                                                       | PR, push to `main`                                     |
| `release-check` (CI)                                          | `just release-check --pr <base sha>`: a version bump has its CHANGELOG section and no existing tag                                                                                                              | PR                                                     |
| `ci-gate` (CI)                                                | none: fails when any job above failed or was cancelled                                                                                                                                                          | PR, push to `main`                                     |
| `build` (Documentation)                                       | `just docs-check`: `zensical build --clean --strict`                                                                                                                                                            | PR, push to `main`                                     |
| `deploy` (Documentation)                                      | deploys the built site to GitHub Pages                                                                                                                                                                          | push to `main`                                         |
| `pr-title` (PR)                                               | `just check-title "<title>"` (`scripts/validate/check_title.ts`)                                                                                                                                                | PR opened, edited, synchronized, reopened, ready/draft |
| `pr-checklist` (PR)                                           | `scripts/validate/check_pr_body.ts --template .github/pull_request_template.md`                                                                                                                                 | same; skipped for Dependabot                           |
| `archive-verdict` → `spec-archived` / `awaiting-archive` (PR) | `just spec-status --ready`                                                                                                                                                                                      | same                                                   |
| `label` (PR labels)                                           | `scripts/sync_pr_labels.ts --apply`; locally `just pr-labels <n>` prints without writing                                                                                                                        | `pull_request_target`, dispatch on `main`              |
| `sync` (Labels)                                               | `scripts/sync_labels.ts --apply --keep-undeclared`; locally `just labels`                                                                                                                                       | push to `main` changing `.github/labels.yml`, dispatch |
| `secret-scan` (Secret Scanning)                               | TruffleHog over the commits the PR or push adds; locally the pre-commit gitleaks hook                                                                                                                           | PR, push to `main`                                     |
| `verify`, `publish` (Release)                                 | `just check`; `just release-check --main`; then tag and release                                                                                                                                                 | push to `main`, dispatch on `main`                     |

## Waiting for the archive

The PR workflow's `archive-verdict` job runs `scripts/validate/check_spec_archived.ts --ready` and reports whether the
tree holds an unarchived OpenSpec change. The next job takes the name `spec-archived` only when there is none; while one
exists it is named `awaiting-archive`, succeeds, and reports nothing under the required name, so the ruleset blocks the
merge while the run stays green. A PR in that state is not mergeable and must not be reported as such; its labels show
`spec:approved` (or `spec:pending`) until the archive commit turns them into `spec:archived`.

## Base-commit checks

The PR checks (`pr-title`, `pr-checklist`, `archive-verdict`) run the base commit's copy of their script and template
(`.github/actions/base-checks`), so a pull request cannot relax a check by editing them; only when the base lacks the
file (the bootstrap) does the branch's copy run.

## Tooling in CI

`.github/actions/setup-tools` installs Deno (pinned), just (pinned, `pipx`), and on request OpenSpec (pinned, through
`deno install`) and Zensical (pinned, `pipx`). Node comes with the runner image. Every action, `actions/*` included, is
pinned by full commit SHA with its version in a comment; Dependabot proposes updates. The TruffleHog action is the one
third-party action besides `denoland/setup-deno`; both are on the allowed list in `platform-settings.md`.

## Release path

- Merging a change that bumps `plugin.json`'s version is the release decision. The Release workflow runs on every push
  to `main`: `verify` runs `just check` and `just release-check --main`, which prints the version and whether to release
  (no tag `v<version>` yet, and `CHANGELOG.md` has a `## [<version>]` section).
- `publish`, only when `release=true`, holds `contents: write`: it creates the tag `v<version>` at the merge commit and
  the GitHub Release whose notes start with the CHANGELOG section (`scripts/release/changelog_section.ts`) followed by
  GitHub's generated notes, categorized by PR labels (`.github/release.yml`).
- A push whose version is already tagged releases nothing and says so. A version bump merged without a CHANGELOG section
  fails `verify` loudly; the fix is a follow-up PR adding the section, which releases on merge. `release-check` in CI
  catches this before the merge.
- A failed release is fixed forward through a PR; the maintainer may rerun by dispatch on `main`. Tags and releases are
  never deleted or moved.

## Rules

Never weaken, skip, or delete a check to make it pass; changing a check's strictness is a separate, maintainer-approved
decision. Declare `permissions:` in every workflow, with job-level grants only where a job writes. `pull_request_target`
has one use, `pr-labels.yml`, within these bounds: it runs `main`'s checkout and `main`'s script and never checks out,
fetches, or runs anything of the pull request; what a pull request controls reaches the script as environment variables;
its token holds `contents: read` and `pull-requests: write` only, set on the steps that call `gh`; no secret, no cache,
five minutes per run.
