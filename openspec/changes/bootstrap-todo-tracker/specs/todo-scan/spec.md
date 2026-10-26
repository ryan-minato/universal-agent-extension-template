## Purpose

Finding TODO and FIXME markers in a workspace and reporting the unowned ones is the behavior every component of the
sample plugin shares.

## ADDED Requirements

### Requirement: Marker format

A marker SHALL be the word `TODO` or `FIXME`, an optional parenthesized owner and `#<issue>`, a colon, and text; a
marker without parentheses is unowned.

#### Scenario: An owned, linked marker

- **WHEN** a line reads `// TODO(alice, #42): drop the v1 fallback`
- **THEN** the scan reports kind `TODO`, owner `alice`, issue `42`, text `drop the v1 fallback`

#### Scenario: A word that is not a marker

- **WHEN** a line reads `const byKind = { todo: 0 }` or `TODOS: none`
- **THEN** the scan reports nothing for it

### Requirement: Scan scope

The scan SHALL read every text file under the root except `.git`, `node_modules`, `site`, `dist`, `build`, `coverage`,
`.cache`, and any directory passed with `--exclude`, skipping binary files and files over one million bytes.

#### Scenario: A marker inside node_modules

- **WHEN** a file under `node_modules/` holds a marker
- **THEN** the scan does not report it

### Requirement: Report shape

The report SHALL begin with one verdict line (`N marker(s): T TODO, F FIXME; U unowned, L linked to
an issue.`) followed
by one line per marker as `<file>:<line>  <KIND>(<owner or unowned>[ #issue])
<text>`; `--unowned-only` keeps only
unowned markers and `--json` returns the summary and entries as JSON.

#### Scenario: The sample fixture

- **WHEN** `node lib/todo-scan.mjs tests/fixtures/sample --unowned-only` runs
- **THEN** the first line is `4 marker(s): 3 TODO, 1 FIXME; 2 unowned, 1 linked to an issue.` and two entry lines follow

### Requirement: Skill entry point

The `todo-scan` skill SHALL run the scan through `skills/todo-scan/scripts/scan.mjs` with the same arguments and report
the verdict line verbatim.

#### Scenario: A framework invokes the skill

- **WHEN** the skill is invoked in any first-class framework or Pi with a directory holding an unowned marker
- **THEN** the agent's answer starts with the verdict line and lists the unowned marker
