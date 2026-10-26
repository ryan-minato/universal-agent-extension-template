# TODO marker format

Read when writing a marker, when a scan result looks wrong, or when changing the scanner.

A marker is the word `TODO` or `FIXME`, an optional parenthesized owner and issue, a colon, and the text. The scanner
inside the MCP server (`mcp/todo-tracker/scan.mjs`) recognizes exactly:

```text
TODO(<owner>): <text>              owned
TODO(<owner>, #<issue>): <text>    owned and linked to an issue
FIXME(<owner>): <text>             same forms, for defects rather than work
```

A marker without parentheses is **unowned**; the plugin exists to surface those. Inside the parentheses, a `#<number>`
part is the issue and the first other part is the owner, in any order.

Default excluded directories: `.git`, `node_modules`, `site`, `dist`, `build`, `coverage`, `.cache`. Binary files (a NUL
byte in the first 8 KB) and files over 1,000,000 bytes are skipped.

Report line shape: `<file>:<line>  <KIND>(<owner or unowned>[ #issue]) <text>`.

The MCP server exposes the scan as two tools: `list_todos` (a directory; `root`, `unownedOnly`, `limit`) and `scan_file`
(one file; `path`). Both return the text report and a `structuredContent` with the summary and the entries. The
post-edit hooks detect only the unowned form with a regex of their own and point at these tools; they are not a second
scanner.
