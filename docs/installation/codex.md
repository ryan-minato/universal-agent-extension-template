# Install into Codex

Codex reads the portable Agent Plugins manifest at the repository root (`plugin.json`), the `skills/` directory, and
`mcp.json`. Codex-specific settings live in the manifest's `extensions["com.openai"]` block (the hooks path). A native
fallback manifest, `.codex-plugin/plugin.json`, is generated for clients that do not read the portable one.

## Install

Register the repository as a marketplace, then enable the plugin:

```sh
codex plugin marketplace add https://github.com/ryan-minato/universal-agent-extension-template
# in a Codex session: /plugins -> enable todo-tracker, then start a new session
```

A local checkout works the same way with its path instead of the URL.

## What you get

| Component                         | After install                                                                                                                             |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Skills `todo-scan`, `todo-triage` | Offered as `$todo-scan` and `$todo-triage`                                                                                                |
| MCP tool `list_todos`             | Listed among the plugin's MCP tools (`mcp.json`, stdio, `node`)                                                                           |
| PostToolUse hook                  | A `systemMessage` reminder after a file write that leaves unowned markers; plugin hooks run only for a trusted, manually installed plugin |
| Subagent `todo-triager`           | **Not registered by the plugin.** Codex plugins cannot register agent roles. Install the generated role explicitly (next section).        |

## Install the subagent

The generated role lives at `.codex/agents/todo-triager.toml` inside the plugin. Codex reads roles from
`~/.codex/agents/` (every project) or `<project>/.codex/agents/` (one trusted project). The installer copies the
generated roles and refuses to overwrite a file it did not write:

```sh
# from the plugin's checkout or install directory
node integrations/codex/scripts/install-agents.mjs --scope user      # ~/.codex/agents/
node integrations/codex/scripts/install-agents.mjs --scope project   # ./.codex/agents/ of the current project
node integrations/codex/scripts/install-agents.mjs --scope user --uninstall
```

Add `--dry-run` to see the plan. After installing, start a new session and ask Codex to delegate to `todo-triager`;
`/subagents` lists the active roles. Re-run the installer after updating the plugin: it overwrites only files that carry
its marker and differ.

Alternatively, point `config.toml` at the file without copying:

```toml
[agents.todo-triager]
description = "Classifies TODO and FIXME markers"
config_file = "/absolute/path/to/plugin/.codex/agents/todo-triager.toml"
```

## Known limits

- The role's `features.shell_tool = false` switches off the shell tool; it is not a sandbox. The parent session's
  sandbox and approval policy still apply.
- Whether plugin hooks run for a marketplace install, and whether the fallback manifest ever loads when the portable one
  is present, are open [verification items](../guides/verification-items.md).
