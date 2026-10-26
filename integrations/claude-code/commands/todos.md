---
description: List the unowned TODO/FIXME markers of the workspace through the todo-tracker MCP tool
argument-hint: "[directory]"
---

Call the `todo-tracker` MCP tool `list_todos` with `unownedOnly: true` and `root` set to the directory `$ARGUMENTS`
names, or to the workspace root. Report the result's `summary.verdict` verbatim, then the entries as
`file:line kind(owner) text`. If the user wants the markers resolved rather than listed, continue with the `todo-triage`
skill.
