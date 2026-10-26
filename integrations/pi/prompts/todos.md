---
description: List the unowned TODO/FIXME markers of the workspace through the todo-tracker MCP tool
argument-hint: "[directory]"
---

Call the `todo-tracker` MCP tool `list_todos` with unownedOnly set to true${1:+ and root set to `$1`}. Report the first
line of its output verbatim, then the entries. If I ask to resolve them rather than list them, continue with the
`todo-triage` skill.
