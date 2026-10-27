## Purpose

After an agent writes a file, the plugin reminds it about the unowned markers that file now holds; each framework has
its own hook implementation.

## ADDED Requirements

### Requirement: One implementation per framework

Hooks SHALL be written under `integrations/<framework>/hooks/` in that framework's format and never translated; each
hook script is self-contained, importing nothing outside its directory, and its reminder points the agent at the MCP
tools and the `todo-triage` skill rather than scanning further. The generator validates each file's shape and copies
only Antigravity's to the root.

#### Scenario: A hook script that reaches outside

- **WHEN** a hook script imports a module from outside its directory
- **THEN** `just validate` fails naming the script and the import

#### Scenario: A Claude-style hooks file for Antigravity

- **WHEN** `integrations/antigravity/hooks/hooks.json` has a top-level `hooks` key
- **THEN** `just generate` fails explaining that Antigravity would load it as a hook named `hooks`

### Requirement: Claude Code reminder

After `Write`, `Edit`, or `MultiEdit`, Claude Code's hook SHALL return the unowned markers of the edited file as
additional context and never block.

#### Scenario: An edit adds an unowned marker

- **WHEN** the edited file holds `// FIXME: leaks`
- **THEN** the agent receives a reminder naming the file, the line, and the owned form to use

#### Scenario: A clean edit

- **WHEN** the edited file holds no unowned marker
- **THEN** the hook prints nothing and exits 0

### Requirement: Codex reminder

After a file-writing tool, Codex's hook SHALL return the same reminder both as `hookSpecificOutput.additionalContext`
(what the model reads) and as a `systemMessage` (what the UI shows), reading the file paths from an `apply_patch`
command's `*** Add File:` and `*** Update File:` lines resolved against the event's `cwd`, or from the tool input's
`file_path`, `path`, or `files`.

#### Scenario: A patch with several files

- **WHEN** the patch adds two files and one holds an unowned marker
- **THEN** both outputs name that file only

### Requirement: Antigravity reminder

Antigravity's hook SHALL write the reminder to standard error and return `{}`, because Antigravity's PostToolUse injects
nothing into the conversation.

#### Scenario: An Antigravity edit

- **WHEN** the hook runs after a write tool with an unowned marker in the file
- **THEN** standard output is `{}` and the reminder appears on standard error
