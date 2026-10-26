---
name: todo-scan
description: Scans the workspace for TODO and FIXME markers and reports the unowned ones with file and line. Use before a review, a release, or when asked what is still left to do in the code; also when a hook reports an unowned marker.
license: Apache-2.0
compatibility: Requires Node.js 20 or newer on PATH.
metadata:
  plugin: todo-tracker
---

# TODO scan

Run the scanner, read the one-line verdict, then act on the entries it lists.

1. Run it from the workspace root. `<plugin root>` is the directory this skill was installed from (Claude Code and Codex
   expose it as `${CLAUDE_PLUGIN_ROOT}` / `${PLUGIN_ROOT}`):

   ```sh
   node <plugin root>/skills/todo-scan/scripts/scan.mjs . --unowned-only
   ```

   Drop `--unowned-only` for every marker; add `--json` when another tool consumes the result; add `--exclude <dir>` for
   a directory the default list does not skip (see [references/todo-format.md](references/todo-format.md) for the format
   and the default excludes).
2. Report the first line verbatim: it is the verdict (`N marker(s): … ; U unowned, L linked`).
3. For each unowned marker, either add the owner (`TODO(<owner>): <text>`) when the request was to fix them, or hand the
   list to the `todo-triage` skill when the request was to decide what to do.
4. Never silence a marker by rewording it; a marker goes away by being done or deleted on purpose.

The scanner reads every text file under the root except the default excludes; it skips binary files and files over 1 MB.
A scan of a large monorepo takes seconds, not minutes.
