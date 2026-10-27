---
name: todo-triage
description: Decides what to do with each TODO and FIXME marker (assign an owner, delete a stale one, link or open an issue) and applies the decisions with the skill's own script. Use when the user wants the markers resolved rather than counted, after a todo-scan or when asked to clean up, assign, or close out TODOs. Not for a plain listing (todo-scan).
license: Apache-2.0
compatibility: Needs the todo-tracker MCP server (tools list_todos and scan_file) and Node.js 20 or newer for scripts/apply-decisions.mjs. Delegates to the todo-triager subagent where the framework offers it.
metadata:
  plugin: todo-tracker
---

# TODO triage

Turn a list of markers into decisions, then into edits. The scan comes from the MCP server; the decisions come from the
subagent or from you; the edits come from this skill's own script.

1. Get the list: call the `todo-tracker` tool `list_todos` with `root` set to the workspace root (no `unownedOnly`, so
   owned markers are classified too) and keep its `structuredContent.entries`.
2. Classify. Where the framework offers the `todo-triager` subagent, hand it the entries; it returns one bucket per
   marker (unowned, stale, linked, open) with a proposed next step. Without a subagent, classify the same way yourself,
   reading the code around each marker.
3. Confirm the proposed owners and deletions with the user before editing when the list is longer than ten markers or
   touches files outside the user's request; smaller lists are applied directly.
4. Write the decisions as JSON and apply them with the skill's script
   [`scripts/apply-decisions.mjs`](scripts/apply-decisions.mjs), which rewrites exactly the marker's parentheses or
   deletes the marker's line and nothing else:

   ```sh
   node <plugin root>/skills/todo-triage/scripts/apply-decisions.mjs decisions.json
   ```

   `decisions.json` is an array of `{ "file", "line", "action", "owner"?, "issue"? }` with `action` one of `assign`
   (needs `owner`), `link` (needs `issue`), `delete`. Run it with `--dry-run` first to see each edit. The script refuses
   a line that no longer holds a marker.
5. Confirm with `scan_file` on each edited file, then report the new verdict from `list_todos`.

Do not open issues or push anything yourself: list the issues to open and let the project's own workflow create them.
