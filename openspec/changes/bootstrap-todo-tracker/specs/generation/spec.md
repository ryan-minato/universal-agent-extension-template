## Purpose

The generator and the validator keep the native entry files true to the sources and refuse what cannot be converted
faithfully.

## ADDED Requirements

### Requirement: Generated files equal the sources

`just generate` SHALL write every native entry file from the sources, `just generate-check` SHALL fail when a committed
generated file differs or a generated directory holds a file no source produces, and both SHALL be part of `just check`.

#### Scenario: A hand edit of a generated file

- **WHEN** a committed generated file is edited by hand
- **THEN** `just generate-check` fails naming the file and the fix

#### Scenario: A removed framework

- **WHEN** `integrations/<framework>/` is deleted and `just generate` runs
- **THEN** that framework's generated files are removed and no other file changes

### Requirement: Faithful conversion only

The generator SHALL stop with a message naming the field and the fix whenever a framework cannot express a declared
transport, permission, or tool restriction; it SHALL never widen, drop, or substitute.

#### Scenario: An SSE server for Antigravity

- **WHEN** `mcp.json` declares a server with `type: sse` and the Antigravity integration exists
- **THEN** generation fails naming the server and the two ways out

### Requirement: Override allow lists

Every override file SHALL be checked against the keys its framework documents; an unknown key or a public identity field
fails generation.

#### Scenario: A Claude Code key in a Codex override

- **WHEN** `integrations/codex/agents/<name>.override.yaml` sets `tools`
- **THEN** generation fails listing the keys Codex accepts

### Requirement: Generated Markdown is formatter-stable

Generated Markdown SHALL be byte-identical before and after the repository's formatter runs.

#### Scenario: The pre-commit hook

- **WHEN** `deno fmt` runs on a generated agent file
- **THEN** the file is unchanged
