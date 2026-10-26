## Purpose

Turning a list of markers into decisions (owner, deletion, issue) and applying them is the plugin's second skill; it
composes the MCP tools and applies edits with its own script.

## ADDED Requirements

### Requirement: Classification before edits

The `todo-triage` skill SHALL take the entries of `list_todos`, classify every marker into one bucket (unowned, stale,
linked, open) with a proposed next step before any file is edited, delegating to the `todo-triager` subagent where the
framework offers it.

#### Scenario: A framework with subagents

- **WHEN** the skill runs in Claude Code or Antigravity
- **THEN** the classification is produced by the `todo-triager` subagent from the tool's entries

#### Scenario: A framework without the subagent

- **WHEN** the skill runs in Codex without the role installed, or in Pi
- **THEN** the agent classifies the markers itself and the report has the same table shape

### Requirement: Self-contained edit script

The skill SHALL apply decisions with its own script under `skills/todo-triage/scripts/`, which imports nothing outside
the skill directory, changes only the marker's parentheses or deletes the marker's line, and writes nothing when any
decision names a line without a marker.

#### Scenario: Assigning an owner

- **WHEN** the decision for `// TODO: remove the hard-coded return` is `assign` with owner `bob`
- **THEN** the line becomes `// TODO(bob): remove the hard-coded return` and every other character stays

#### Scenario: A stale decision

- **WHEN** one decision names a line that no longer holds a marker
- **THEN** the script refuses it, names the file and line, and writes no file

### Requirement: No external writes

The skill SHALL list the issues to open and leave issue creation and pushing to the project's own workflow.

#### Scenario: A marker needs an issue

- **WHEN** a marker is classified as open and larger than one commit
- **THEN** the report proposes an issue and no issue is created by the skill
