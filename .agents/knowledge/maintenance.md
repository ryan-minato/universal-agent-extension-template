# Harness Maintenance

Read when changing harness files, commands, tool versions, or workflows, when a framework page contradicts
`frameworks.md`, and when performing the periodic review. The author of a change owns updating its dependents in the
same PR. Scripts and workflows own executable facts; knowledge files own conventions and reasons; OpenSpec owns the
plugin's behavior contracts.

## Management code

Management code (everything under `scripts/`, `tests/`, the workflows, the justfile, the project skills' scripts) is
Deno TypeScript, readable first, never shipped with the plugin, and never bound to a skill's runtime script. It checks
interfaces where data enters and fails with a message naming the file to fix; it adds no fallback that hides an
unexpected failure. Runtime code (`lib/`, the skill and hook scripts, the Pi extension) is zero-dependency Node ESM
because that is what every consumer has; it ships with the plugin, so it carries no development tooling.

Deno entrypoints are executable scripts whose shebangs own their runtime permissions; recipes and workflows invoke them
directly, and widening a script's capabilities means editing its shebang. Imports pin `jsr:` and `npm:` versions inline;
the repository keeps no lock file (`deno.json` sets `lock: false`).

## Two-way synchronization

| Trigger                                                                   | Update and verify                                                                                                                                                                                                           |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A component source, override, or generated file format changes            | `just generate`, commit the generated files, `just validate`; `architecture.md` Component sources table; the `tests/compatibility/` assertions for that framework                                                           |
| A framework page changes a field, path, or limit                          | the row in `frameworks.md` with the new date; the generator's allow list or shape check; the installation page under `docs/installation/`                                                                                   |
| A verification item is answered                                           | move the fact into `frameworks.md`; update `docs/guides/verification-items.md` and the support matrix; revisit `integrations/antigravity/agents/README.md` or the Codex install page as the answer dictates                 |
| A `just` recipe is added, renamed, or changes its arguments               | `AGENTS.md` Validation table; `github/checks.md` if CI calls it; `CONTRIBUTING.md`'s command table; `just harness-check` fails on a stale recipe name                                                                       |
| A knowledge file or project skill is added, renamed, or removed           | `AGENTS.md` When To Read What; the symbolic link under `.claude/skills/` for a skill                                                                                                                                        |
| `AGENTS.md`, a knowledge file, or a project skill is edited               | re-check every path and recipe it names (`just harness-check`), then confirm the fact it states against the code: a documented command runs, a documented directory exists, a documented field is what the generator writes |
| A workflow, job name, or required check changes                           | `github/checks.md` job map; `platform-settings.md` ruleset row; the Synchronization table in `github-workflow.md`                                                                                                           |
| A tool version pinned in `.github/actions/setup-tools/action.yml` changes | run `just check` with that version; `spec-workflow.md` names the OpenSpec version it verified against                                                                                                                       |
| `plugin.json`'s version changes                                           | `CHANGELOG.md` gains the `## [<version>] - <date>` section (`just release-check --pr origin/main`)                                                                                                                          |
| `README.md` installation instructions or the support matrix change        | the matching `docs/` pages; the matrix lives only in `docs/reference/support-matrix.md`                                                                                                                                     |

## Periodic review

Run the Harness review in `github-workflow.md` after every tenth merged PR, when `AGENTS.md` passes about 120 lines, or
when an agent follows a rule that turns out stale. Open a `task` issue (`area:harness`) with the PR range and keep /
update / remove findings before editing. Thickness is reviewed too: a check that has not caught anything since the last
review, a rule nobody consults, or a skill whose trigger never fires is listed for removal.

## Findings outside the current task

A mismatch between a document and the code found while doing something else is never only mentioned in conversation.
Choose by size and authority: fix it in the same change when it is small and certain (say so in the PR); add it to the
collected decisions list (`agent-authority.md`) when the intent is unclear or the fix exceeds the approved change; open
a `task` issue with `area:harness` when it is large and not for now.

## OpenSpec initialization record

On 2026-10-26, OpenSpec 1.15.0 initialized the `spec-driven` layout with `openspec init --tools
agents`, producing
`.agents/skills/openspec-*` and `.agents/skills/.openspec-target`; each skill got a symbolic link under
`.claude/skills/`. `openspec/config.yaml` was then adapted to this project's tiers and gates. When upgrading OpenSpec,
run `just spec-check` first: it regenerates in a temporary directory and lists what changed, so the regenerated skills
are reviewed before they are committed.
