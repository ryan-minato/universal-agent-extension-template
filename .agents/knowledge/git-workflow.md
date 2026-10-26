# Git Branching Contract

Read before creating a branch, opening a pull request, merging, or anything about tags.

Model: GitHub Flow. Selected because the plugin has one published line (consumers install the repository at a version
tag or `main`) and there is no deployment chain, so `main` is the only long-lived branch.

## Long-lived branches

| Branch | Meaning                                                                                 | Accepts merges from | Protection tier              |
| ------ | --------------------------------------------------------------------------------------- | ------------------- | ---------------------------- |
| `main` | Every commit is installable; a commit that changes `plugin.json`'s version is a release | Pull requests only  | See the enforcement register |

Do not create any other long-lived branch (`develop`, `next`, per-framework lines). Needing one means the model changed,
which is a maintainer decision recorded here first.

## Short-lived branches

- With an issue: `gh issue develop -c <number>` creates and checks out the branch; take the generated name
  (`<number>-<title-slug>`) as is.
- Without an issue (bootstrap or an emergency harness fix): `<type>/<short-description>`, where `<type>` is a
  Conventional Commits type, e.g. `chore/harness-bootstrap`.
- Cut from the current `main`; merged into `main`; deleted on merge.
- A branch finishes its outcome before merge; unfinished work stays in a draft PR. Keep the branch current with `main`
  by rebasing or merging `main` into it; the ruleset requires an up-to-date branch before merge.

## Tags and versions

- Format: `v<MAJOR>.<MINOR>.<PATCH>`, e.g. `v0.2.0`. Version scheme: SemVer, one version for the whole plugin, read from
  `plugin.json`.
- Created only by the Release workflow on `main` after a merge that changed the version. Never create, move, or delete
  one by hand.

## Merge method

| Contribution origin         | Method | Why                                                                            |
| --------------------------- | ------ | ------------------------------------------------------------------------------ |
| Branch in this repository   | Squash | One reviewed unit per change on `main`; the PR title becomes the commit title  |
| Fork or outside contributor | Squash | Same; the contributor's own commits do not need to follow the title convention |

The squash commit title is the PR title and follows Conventional Commits: `<type>(<scope>)[!]: <subject>`, lowercase
subject, no trailing period, at most 72 characters (`scripts/validate/check_title.ts`).

- `<scope>` is the area name without the `area:` prefix (`github-workflow.md`, Areas): `core`, `codex`, `claude-code`,
  `antigravity`, `pi`, `docs`, `ci`, `scripts`, `spec-workflow`, `harness`; omit it for a repository-wide change.
- `!` marks a breaking change and goes with a major version bump.
- Local commits inside a branch follow the same convention and keep the 50/72 rule (title ≤ 50 characters where
  possible, body lines ≤ 72), one verified sub-step per commit so a wrong turn is a `git reset --hard <good commit>`
  away. Interactive rebase is unavailable to agents; fold draft commits by soft-resetting to the task's first commit and
  committing once.
- No AI or tool attribution in commits, PR titles, or PR bodies (`agent-authority.md`).

## Hotfix path

1. Branch from the current `main` (`gh issue develop -c <bug-issue>`).
2. Fix, bump the PATCH version in `plugin.json`, add the CHANGELOG section, open the PR.
3. Squash-merge into `main`; the Release workflow tags and publishes the new version.

Recovery is roll-forward: a bad release is followed by a higher version; tags are never moved.

## Enforcement register

| Rule                                                                                                            | Tier                                                                           | Readback                                                                                                                                                                | Upgrade trigger             |
| --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| Changes reach `main` only through PRs; no force push or deletion                                                | Convention until the `main` ruleset is applied (`github/platform-settings.md`) | `gh api repos/ryan-minato/universal-agent-extension-template/rulesets`                                                                                                  | Applying the ruleset        |
| `ci-gate`, `pr-title`, `pr-checklist`, `spec-archived`, `secret-scan` pass on an up-to-date branch before merge | Convention until each job has reported once and is added to the ruleset        | same                                                                                                                                                                    | Each job's first report     |
| Squash only; branch deleted on merge                                                                            | Convention until applied                                                       | `gh api repos/ryan-minato/universal-agent-extension-template --jq '{allow_squash_merge,allow_merge_commit,allow_rebase_merge,delete_branch_on_merge,allow_auto_merge}'` | Applying the merge settings |
| PR title follows Conventional Commits                                                                           | Check `pr-title`                                                               | the PR's checks                                                                                                                                                         | —                           |
| Tags created only by the Release workflow                                                                       | Convention, plus the `v*` tag ruleset against deletion and update once applied | `git ls-remote --tags origin` against the Release workflow's runs                                                                                                       | A hand-made tag appears     |

When the maintainer applies a setting, change its tier here to "Enforced" with the date, in the same PR as the
`platform-settings.md` row.

## Update this file when

- A long-lived branch is proposed or the model changes.
- The repository's protection, ruleset, or merge-method settings change.
- The Release workflow's trigger or tag format changes; `.github/workflows/release.yml` and this file must name the same
  branch and tag format.
