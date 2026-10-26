# Proposal

## Why

A plugin written once for Codex, Claude Code, Antigravity, and Pi needs a shared core, a place for each framework's
differences, and a generator that keeps the native entry files true to the sources; without a worked example nobody can
see whether the layout holds. This change delivers the template's first version with `todo-tracker` as that example.

Issue: none. This is the bootstrap recorded in `.agents/knowledge/spec-workflow.md` (Initial bootstrap): the maintainer
approved the plan in conversation on 2026-10-26 before the label workflow existed.

## What Changes

- The sample plugin `todo-tracker`: an MCP server that owns the TODO/FIXME scan (`list_todos`, `scan_file`), two skills
  that call it (one with its own edit script), a subagent, one self-contained post-edit hook per first-class framework,
  an Antigravity rule, a Claude Code command, and a Pi extension that registers the server, with a prompt template.
- The Agent Plugins manifest as the single source of identity and version, with the Codex hooks path in its `com.openai`
  extension.
- Generation of every native entry file from the sources and the per-framework integrations, with validation that
  refuses what cannot be converted faithfully.
- The Codex agent-role installer, because Codex plugins cannot register agents.
- The Pi package with the extension, skills, and prompts declared.

## Capabilities

### New Capabilities

- `plugin-manifest`: the identity and version source and the native manifests derived from it.
- `todo-scan`: the marker format, the scan procedure, and how skills reach the scan.
- `todo-triage`: deciding what happens to each marker.
- `todo-triager-agent`: the classifying subagent and how each framework receives it.
- `todo-mcp-server`: the `list_todos` tool over stdio.
- `platform-hooks`: the post-edit reminder on each framework.
- `pi-package`: what Pi installs.
- `generation`: the rules the generator and validator enforce on sources, skills, and generated files.

### Modified Capabilities

None; the repository had no specifications.

## Impact

- Support matrix (`docs/reference/support-matrix.md`): every row is created by this change; each framework's "verified"
  column starts as "structural only" or an open verification item.
- Consumers: none yet; `0.1.0` is the first release.
- Adopters: the `template-adopt` skill assumes this layout.

## Acceptance

### Becomes true

- Every scenario of the eight delta specs holds on the generated files and the runtime.
- `just check` passes: generated files equal the sources, the plugin validates, the Claude Code CLI validates the
  plugin, the compatibility tests pass for every first-class framework and Pi.
- Each framework's installation page and the support matrix state what is verified and what is an open verification item
  (`docs/guides/verification-items.md`).

### Stays true

- `plugin.json` is the only place the plugin's name, version, and description are written.
- A shared agent file carries only `name`, `description`, and its body.
- Each component type owns its code: skills and hooks import nothing outside their directory, and the scan is
  implemented only in the MCP server.
- No generated file is edited by hand; the generator is the only writer.
- The generator never widens a permission, drops a tool restriction, or substitutes a transport.
