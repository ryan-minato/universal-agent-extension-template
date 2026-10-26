---
description: List the unowned TODO/FIXME markers of the workspace through the todo-tracker MCP tool
argument-hint: "[directory]"
---

Call the `todo-tracker` MCP tool `list_todos` with `unownedOnly: true` and, if `$ARGUMENTS` names a directory, `root`
set to it. Report the result's `summary.verdict` verbatim, then the entries as `file:line kind(owner) text`. If the user
wants the markers resolved rather than listed, continue with the `todo-triage` skill.
