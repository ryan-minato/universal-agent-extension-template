---
trigger: glob
globs: "**/*.ts, **/*.tsx, **/*.js, **/*.mjs, **/*.py, **/*.go, **/*.rs, **/*.java, **/*.kt, **/*.swift, **/*.rb, **/*.sh"
description: "How to write TODO and FIXME markers so the todo-tracker plugin can find and triage them."
---

# TODO markers

- Write `TODO(<owner>): <text>` or `FIXME(<owner>): <text>`; add `, #<issue>` inside the parentheses when an issue
  exists: `TODO(alice, #42): drop the v1 fallback`.
- Never leave a marker without an owner. If you do not know the owner, use your own handle and say so in the pull
  request.
- A marker describes work that is not done. When the work is done, delete the marker in the same change; do not reword
  it.
- Run the `todo-scan` skill before marking work complete when you added or edited markers.
