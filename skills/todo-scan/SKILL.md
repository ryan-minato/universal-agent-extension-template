---
name: todo-scan
description: Finds the TODO and FIXME markers of the workspace through the todo-tracker MCP tools and reports the unowned ones with file and line. Use when asked what is still left to do in the code, before a review or a release, or when a hook reports an unowned marker. Not for deciding what happens to each marker (todo-triage).
license: Apache-2.0
compatibility: Needs the todo-tracker MCP server the plugin registers (tools list_todos and scan_file).
metadata:
  plugin: todo-tracker
---

# TODO scan

The scan is the MCP server's job; this skill decides what to ask it and how to report. It runs no script of its own.

1. Call the tool `list_todos` of the `todo-tracker` MCP server with `unownedOnly: true` and, unless the user named a
   directory, no `root` (the server scans the workspace root). Add `root` for one directory; the server skips `.git`,
   `node_modules`, `site`, `dist`, `build`, `coverage`, `.cache`, binary files, and files over 1 MB (format and limits
   in [references/todo-format.md](references/todo-format.md)).
2. Report the first line of the tool's text verbatim: it is the verdict (`N marker(s): … ; U unowned, L linked`). Then
   list the entries as the tool printed them.
3. For each unowned marker, either add the owner (`TODO(<owner>): <text>`) when the request was to fix them, confirming
   the edit with `scan_file` on that file, or hand the list to the `todo-triage` skill when the request was to decide
   what to do.
4. Never silence a marker by rewording it; a marker goes away by being done or deleted on purpose.

If the `todo-tracker` tools are not available in this session, say so and stop: the plugin's MCP server is not
registered in this framework, and the installation page for the framework says how to register it. Do not fall back to
grep; the tool is the one implementation of the format.
