# Changelog

All notable changes to this project are documented in this file. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html). The version under a heading is the `version` of
`plugin.json`; a merge to `main` that adds a heading releases it.

## [Unreleased]

## [0.1.0] - 2026-10-26

### Added

- The `todo-tracker` sample plugin: the MCP server with `list_todos` and `scan_file`, the `todo-scan` and `todo-triage`
  skills that call it, the `todo-triager` subagent, post-edit hooks for Codex, Claude Code, and Antigravity, an
  Antigravity rule, a Claude Code command, and a Pi extension with a prompt template.
- Generation of the native entry files for Codex, Claude Code, Antigravity, and Pi from the Agent Plugins manifest and
  `integrations/<framework>/`, with validation and compatibility tests.
- The Codex agent-role installer (`integrations/codex/scripts/install-agents.mjs`).
- The documentation site, the OpenSpec specifications, and the agent harness.
