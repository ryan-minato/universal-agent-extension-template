## Purpose

Turning a list of markers into decisions (owner, deletion, issue) and applying them is the plugin's second skill.

## ADDED Requirements

### Requirement: Classification before edits

The `todo-triage` skill SHALL classify every marker into one bucket (unowned, stale, linked, open) with a proposed next
step before any file is edited, delegating to the `todo-triager` subagent where the framework offers it.

#### Scenario: A framework with subagents

- **WHEN** the skill runs in Claude Code or Antigravity
- **THEN** the classification is produced by the `todo-triager` subagent from the JSON scan report

#### Scenario: A framework without the subagent

- **WHEN** the skill runs in Codex without the role installed, or in Pi
- **THEN** the agent classifies the markers itself and the report has the same table shape

### Requirement: Edits keep the line intact

Applying a decision SHALL change only the marker's parentheses or delete the marker's line; every other character of the
line stays.

#### Scenario: Assigning an owner

- **WHEN** the decision for `// TODO: remove the hard-coded return` is owner `bob`
- **THEN** the line becomes `// TODO(bob): remove the hard-coded return`

### Requirement: No external writes

The skill SHALL list the issues to open and leave issue creation and pushing to the project's own workflow.

#### Scenario: A marker needs an issue

- **WHEN** a marker is classified as open and larger than one commit
- **THEN** the report proposes an issue and no issue is created by the skill
