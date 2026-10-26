## Purpose

The plugin's identity and version live in one Agent Plugins manifest, and every framework's native manifest is derived
from it so that one repository installs everywhere under one version.

## ADDED Requirements

### Requirement: One identity source

The plugin's name, version, description, author, homepage, repository, license, and keywords SHALL be written only in
the root `plugin.json`, which conforms to Agent Plugins 1.0.0.

#### Scenario: A public field repeated in a framework override

- **WHEN** `integrations/<framework>/overrides.yaml` sets `name` or `version`
- **THEN** generation fails naming the file and the field, and no native manifest is written

#### Scenario: A name a framework refuses

- **WHEN** `plugin.json` names the plugin with a `claude-` prefix or with a dot
- **THEN** generation fails naming the framework that refuses it

### Requirement: Native manifests derived from the source

Each first-class framework SHALL receive its native manifest generated from `plugin.json` and its override file: Claude
Code's under `.claude-plugin/`, Antigravity's under `.antigravity-plugin/`, Codex's fallback under `.codex-plugin/`;
Codex reads `plugin.json` itself with its settings under `extensions["com.openai"]`.

#### Scenario: The version changes

- **WHEN** `version` in `plugin.json` changes and `just generate` runs
- **THEN** every native manifest and `package.json` carry the new version and nothing else changed

#### Scenario: Claude Code validates the plugin

- **WHEN** `claude plugin validate . --strict` runs on the repository
- **THEN** it passes

### Requirement: Explicit Claude Code agent list

The Claude Code manifest SHALL list the generated agent files explicitly so the shared `agents/` directory is never
scanned twice.

#### Scenario: A shared agent exists

- **WHEN** `agents/<name>.md` exists
- **THEN** the Claude Code manifest's `agents` field names `./.claude-plugin/agents/<name>.md` and that file exists
