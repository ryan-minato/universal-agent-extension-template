---
name: todo-triage
description: Decides what to do with each TODO and FIXME marker — assign an owner, delete a stale one, link or open an issue — and produces the edits or the issue list. Use after a todo-scan when the user wants the markers resolved rather than counted.
license: Apache-2.0
compatibility: Requires Node.js 20 or newer on PATH. Delegates to the todo-triager subagent where the framework offers it.
metadata:
  plugin: todo-tracker
---

# TODO triage

Turn a list of markers into decisions, then into edits.

1. Get the list: run the `todo-scan` skill with `--json` if no report is at hand.
2. Classify. Where the framework offers the `todo-triager` subagent, delegate the classification to it with the JSON
   report; it returns a table with one bucket per marker (unowned, stale, linked, open) and a proposed next step.
   Without a subagent, classify the same way yourself, reading the code around each marker.
3. Confirm the proposed owners and deletions with the user before editing when the list is longer than ten markers or
   touches files outside the user's request; smaller lists are applied directly.
4. Apply: rewrite unowned markers as `TODO(<owner>): <text>`; delete stale ones; append `, #<issue>` to markers that now
   have an issue. Keep every other character of the line.
5. Re-run the scan with `--unowned-only` and report the new verdict line.

Do not open issues or push anything yourself: list the issues to open and let the project's own workflow create them.
