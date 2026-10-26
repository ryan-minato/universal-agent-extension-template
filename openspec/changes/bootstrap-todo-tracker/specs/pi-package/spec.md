## Purpose

Pi installs the repository as a package whose extension registers the scan as a tool, a command, and an MCP server.

## ADDED Requirements

### Requirement: Package declaration

`package.json` SHALL be generated from `plugin.json` and `integrations/pi/package.patch.json`, carry the keyword
`pi-package`, and declare the extension, the skills directory, and the prompt templates under `pi`.

#### Scenario: Every declared path exists

- **WHEN** `just test` runs
- **THEN** each path or glob under `pi` resolves to at least one file

### Requirement: Extension registers the server

The extension SHALL register the MCP server `todo-tracker` and nothing else; the `/todos` prompt template asks the model
to call `list_todos`.

#### Scenario: The prompt

- **WHEN** `/todos` runs in a Pi session with the package installed
- **THEN** the model calls `list_todos` with `unownedOnly` and reports the verdict line

### Requirement: Compatibility tier

Pi SHALL be served on a best-effort basis within the compatible tier: the extension is linted and type-checked, not
executed in CI; the manual smoke test is the verification.

#### Scenario: The smoke test without Pi

- **WHEN** `just smoke pi` runs on a machine without `pi`
- **THEN** it prints the manual steps and exits 2
