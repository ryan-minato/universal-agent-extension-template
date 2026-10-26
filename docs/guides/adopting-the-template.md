# Adopting the template

The template is meant to be reduced. Create a repository from it, keep the frameworks and component types your plugin
needs, replace the sample, and the generator, checks, and workflow keep working. The `template-adopt` skill
(`.agents/skills/template-adopt/SKILL.md`) is the step-by-step version a coding agent follows; this page explains the
shape of the work.

## Decide first

- **Name.** Agent Plugins allows 1–64 characters of `a-z`, `0-9`, `-`, `.`; Antigravity refuses a dot; Claude Code
  refuses names starting with `claude-`, `anthropic-`, or `cc-plugin-`.
- **Frameworks.** Each one is a directory under `integrations/`, a compatibility test directory, an installation page, a
  support-matrix row, and an `area:` label. Deleting the directory removes its generated files on the next
  `just generate`.
- **Components.** The generator tolerates an absent `mcp.json`, an empty `agents/`, and missing hooks, commands, or
  rules; keep only what your first version needs.
- **Workflow.** The OpenSpec approval workflow with the `spec:approved` label is a fit for a plugin other people
  install. A personal experiment may replace it with a lighter contract; the knowledge base under `.agents/knowledge/`
  says where each rule lives.

## Rename

`plugin.json` is the source of the plugin's identity; the Pi patch holds the npm scope; the repository name appears in
`scripts/lib/constants.ts`, `zensical.toml`, the health files, and the issue form config. The generated-file marker
`generated-by: todo-tracker` is shared by the generator and the Codex installer and must change in both. The skill's
`adopt_checklist.ts` lists every remaining occurrence of the old names.

## Replace the sample

The sample's runtime (`lib/`, the skills, the agent, the hook scripts, the rule, the command, the Pi extension) and its
tests are yours to delete. Add your first component where [Repository layout](../reference/layout.md) says it lives, run
`just generate`, and extend the compatibility tests with the shape your component must have in each framework.

## Reset the record

`CHANGELOG.md` gets a `0.1.0` section for the new plugin; `openspec/specs/` keeps only the capabilities you kept; the
documentation pages describe your plugin; the remote settings in `.agents/knowledge/github/platform-settings.md` are
applied to the new repository.

## Keep

The generator, the validator, the checks, the workflows, the knowledge base, and the project skills are the template's
value. Change them when your plugin needs it, through the same OpenSpec path the template uses for itself.
