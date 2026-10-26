## Purpose

The `todo-triager` subagent classifies markers without editing files; each framework receives it in the form it loads.

## ADDED Requirements

### Requirement: Shared definition

The shared agent file SHALL carry only `name`, `description`, and the instructions, so that Antigravity loads it as
written and the other frameworks derive from it.

#### Scenario: A framework field in the shared file

- **WHEN** `agents/todo-triager.md` gains a `tools` or `model` key
- **THEN** `just validate` fails naming the key and the override file it belongs in

### Requirement: Claude Code delivery

Claude Code SHALL load the agent from `.claude-plugin/agents/todo-triager.md` with the read-only tool list (`Read`,
`Grep`, `Glob`) from its override.

#### Scenario: The generated Claude Code agent

- **WHEN** `just generate` runs
- **THEN** `.claude-plugin/agents/todo-triager.md` has the shared name, description, and body, the override's `tools`
  and `model`, and a generated-by comment

### Requirement: Codex delivery

Codex SHALL receive the agent as a role file `.codex/agents/todo-triager.toml` with `name`, `description`,
`developer_instructions`, and the override's fields, installed only by an explicit run of
`integrations/codex/scripts/install-agents.mjs`.

#### Scenario: Installing into the user scope

- **WHEN** `install-agents.mjs --scope user` runs
- **THEN** every generated role is written to `~/.codex/agents/` unless a file of that name exists without the plugin's
  marker, which is reported and left untouched

#### Scenario: Uninstalling

- **WHEN** `install-agents.mjs --scope user --uninstall` runs
- **THEN** only files carrying the plugin's marker are removed

### Requirement: Antigravity delivery

Antigravity SHALL load the shared file from `agents/` directly; an Antigravity-specific override is not supported until
verification items 1 and 2 in `.agents/knowledge/frameworks.md` are answered.

#### Scenario: An Antigravity override file

- **WHEN** a file other than `README.md` is placed under `integrations/antigravity/agents/`
- **THEN** `just generate` fails naming the file and the README that explains why
