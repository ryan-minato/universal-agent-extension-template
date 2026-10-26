# Tasks

Written under the bootstrap exception recorded in `.agents/knowledge/spec-workflow.md`: the plan was approved in
conversation on 2026-10-26.

## 1. Runtime and sources

- [x] 1.1 `mcp/todo-tracker/` (server with `list_todos` and `scan_file`, private scanner module), self-contained hook
      scripts, the triage skill's edit script (zero-dependency Node ESM)
- [x] 1.2 `plugin.json`, `mcp.json`, `skills/todo-scan/`, `skills/todo-triage/`, `agents/todo-triager.md`
- [x] 1.3 `integrations/{codex,claude-code,antigravity,pi}/` with overrides, agent overrides, hooks, command, rule,
      extension, prompt, installer

## 2. Generation and validation

- [x] 2.1 `scripts/generate/` and `scripts/validate/main.ts`; `just generate` writes the ten native files
- [x] 2.2 Unit tests for the scanner, server, hook helper, installer, generator modules, release rules
- [x] 2.3 Compatibility tests under `tests/compatibility/<framework>/`; installation tests
- [x] 2.4 `claude plugin validate . --strict` passes
- [x] 2.5 Skill rules in `scripts/lib/skills.ts`, applied to the plugin skills by the validator and to the project
      skills by the harness check

## 3. Documentation and release record

- [x] 3.1 Installation pages, guides, reference, support matrix, OpenCode note; `just docs-check`
- [x] 3.2 `CHANGELOG.md` with the `0.1.0` section; `just release-check --pr main`

## 4. Verification

- [x] 4.1 `just check` green; results recorded in the PR's Validation section
