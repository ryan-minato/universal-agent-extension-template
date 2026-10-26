---
name: template-adopt
description: >-
  Turns a copy of this template into the adopter's own plugin: renames the plugin everywhere its
  name is a source, removes the components and framework integrations the adopter does not want,
  replaces the todo-tracker sample with the adopter's first component, regenerates the native entry
  files, and resets the documentation, changelog, and specs. Use right after creating a repository
  from the template, when asked to "adopt", "customize", or "strip down" the template, or when a
  leftover todo-tracker reference turns up in a plugin that is not todo-tracker.
---

# Adopt the template

Work in a fresh repository created from the template, on a branch, with `just check` green before you start (the
template ships green). Each step ends with a check that tells you it is complete.

## 1. Decide, then record

Settle with the adopter before editing: the plugin name (Agent Plugins rules in `.agents/knowledge/frameworks.md`;
Claude Code refuses `claude-*` names), the frameworks to keep (first-class: Codex, Claude Code, Antigravity; compatible:
Pi), the components the first version needs (skills, subagents, MCP server, hooks, commands, rules, Pi extension), and
whether the OpenSpec-with-label-approval workflow stays or a lighter contract replaces it. Write the answers into the PR
description; they are the acceptance of this adoption.

## 2. Rename

Skip any file step 3 will delete (for example the Pi patch or the Codex installer when that framework goes).

1. `plugin.json`: `name`, `description`, `author`, `homepage`, `repository`, `keywords`; keep `version` at `0.1.0` for
   the first release.
2. `integrations/pi/package.patch.json`: the scoped npm `name`.
3. `scripts/lib/constants.ts`: `REPO`.
4. The marker string `generated-by: todo-tracker` in `scripts/generate/lib/agents.ts` and
   `integrations/codex/scripts/install-agents.mjs` (both must agree; the installer refuses files without it).
5. `lib/mcp-server.mjs`: `SERVER_INFO`; `mcp.json`: the server key.
6. `zensical.toml`: `site_name`, `site_url`, `repo_url`.
7. `.github/CODEOWNERS`, `.github/ISSUE_TEMPLATE/config.yml`, `SECURITY.md`, `SUPPORT.md`: the owner and the repository
   URL.

Check: `scripts/adopt_checklist.ts` (in this skill's directory) prints every remaining `todo-tracker`, `ryan-minato`,
and `universal-agent-extension-template` occurrence outside `openspec/changes/archive/`; the list must be empty, or each
hit explained in the PR.

## 3. Remove what is not wanted

- A framework: delete `integrations/<framework>/`, `tests/compatibility/<framework>/`,
  `docs/installation/<framework>.md`; remove the `area:<framework>` label from `.github/labels.yml`, the Areas table of
  `.agents/knowledge/github-workflow.md`, `AREAS` and `areaOf` in `scripts/sync_pr_labels.ts` (and its test), and the
  row of `docs/reference/support-matrix.md`. `just generate` then deletes that framework's generated files.
- A component: delete its source (a skill directory, `agents/<name>.md` with its overrides, `mcp.json`, a hooks
  directory, a rule, a command) and the capability spec under `openspec/specs/` that described it. The generator and
  validator tolerate an absent `mcp.json`, an empty `agents/`, and absent hooks, commands, or rules.
- The sample runtime: `lib/todo-scan.mjs`, `lib/mcp-server.mjs`, `lib/hook-todo-check.mjs`, `skills/todo-scan/`,
  `skills/todo-triage/`, `agents/todo-triager.md`, the hook scripts, the Antigravity rule, the Claude command, the Pi
  extension and prompt, and `tests/unit/` tests that import them, plus `tests/fixtures/sample/`.

Check: `just generate && just check` is green after every deletion, and `git status` shows no generated file left behind
for a removed framework.

## 4. Add your first component

Follow `.agents/knowledge/architecture.md` (Component sources) for where each kind lives, then `just generate`, then
extend `tests/compatibility/<framework>/` with the shape the new component must have. Behavior changes go through an
OpenSpec change (`.agents/knowledge/spec-workflow.md`); the adoption itself is a harness-tier change with
`skip_specs: true`.

## 5. Reset the record

- `CHANGELOG.md`: one `## [Unreleased]` section and one `## [0.1.0] - <date>` describing the new plugin;
  `just release-check --pr origin/main` must pass.
- `openspec/specs/`: delete the sample capabilities you removed; keep `generation` and `plugin-manifest` if the
  generator and manifest rules are unchanged. `openspec/changes/archive/` may keep the template's bootstrap record or be
  emptied.
- `docs/`: rewrite `index.md`, `getting-started.md`, the kept installation pages, and the support matrix for the new
  plugin; `just docs-check` must build.
- `README.md`, `CONTRIBUTING.md`: the new plugin's name, purpose, and install lines.
- `.agents/knowledge/frameworks.md`: keep the sections of the kept frameworks; re-read each source and refresh the dates
  if more than a few months passed.
- Remote settings: the adopter (a human, never the agent) applies the rows of
  `.agents/knowledge/github/platform-settings.md` to the new repository and records the dates.

Check: `just check`, `scripts/adopt_checklist.ts` empty, `claude plugin validate . --strict` green where the Claude Code
CLI exists, and this skill's own text reviewed: delete the sample-specific sentences (step 3's list of sample files)
once they are gone.
