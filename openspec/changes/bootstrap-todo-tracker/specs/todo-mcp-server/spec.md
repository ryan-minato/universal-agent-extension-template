## Purpose

The scan is exposed as one MCP tool, `list_todos`, over stdio so every framework can call it without a shell.

## ADDED Requirements

### Requirement: Protocol subset

The server SHALL answer `initialize`, `ping`, `tools/list`, and `tools/call` as newline-delimited JSON-RPC 2.0, ignore
notifications, and answer any other method with error `-32601`.

#### Scenario: Initialization

- **WHEN** a client sends `initialize`
- **THEN** the answer carries the protocol version, a `tools` capability, and the server name `todo-tracker`

#### Scenario: An unknown method

- **WHEN** a client sends `resources/list`
- **THEN** the answer is a JSON-RPC error with code `-32601`

### Requirement: The list_todos tool

`list_todos` SHALL accept `root`, `unownedOnly`, and `limit`, scan `root` (defaulting to `TODO_TRACKER_ROOT`, then the
process working directory), and return the text report plus a `structuredContent.summary`; a scan failure is a tool
error, not a protocol error.

#### Scenario: A successful call

- **WHEN** `tools/call` names `list_todos` with `unownedOnly: true`
- **THEN** the text content starts with the verdict line and lists only unowned markers

#### Scenario: An unreadable root

- **WHEN** `root` does not exist
- **THEN** the answer is a result with `isError: true` and a message naming the failure

### Requirement: Declared for every framework

The server SHALL be declared in `mcp.json` with `type: stdio` and `node` as the command, and reach each framework in its
own form: `.mcp.json` for Claude Code, `mcp_config.json` for Antigravity, `mcp.json` itself for Codex, and the Pi
extension's registration.

#### Scenario: Placeholders per framework

- **WHEN** `just generate` runs
- **THEN** `.mcp.json` names the server with `${CLAUDE_PLUGIN_ROOT}` and `mcp_config.json` with `${extensionPath}`, and
  neither contains `${PLUGIN_ROOT}`
