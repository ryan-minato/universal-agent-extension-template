---
description: Scan the workspace for TODO/FIXME markers and list the unowned ones
argument-hint: "[directory] [--json]"
allowed-tools: Bash(node:*)
---

Run `node ${CLAUDE_PLUGIN_ROOT}/skills/todo-scan/scripts/scan.mjs ${ARGUMENTS:-.} --unowned-only` and report the first
line verbatim, then the entries. If the user wants the markers resolved rather than listed, continue with the
`todo-triage` skill.
