---
description: Scan the workspace for TODO/FIXME markers and list the unowned ones
argument-hint: "[directory]"
---

Run the `list_todos` tool on `${1:-.}` with unownedOnly set to true. Report the first line of its output verbatim, then
the entries. If I ask to resolve them rather than list them, continue with the `todo-triage` skill.
