# Install into Codex

Codex reads the portable Agent Plugins manifest at the repository root (`plugin.json`), the `skills/` directory, and
`mcp.json`. Codex-specific settings live in the manifest's `extensions["com.openai"]` block (the hooks path). A native
fallback manifest, `.codex-plugin/plugin.json`, is generated for clients that do not read the portable one.

## Install

The repository is its own marketplace: the generated `.agents/plugins/marketplace.json` lists the plugin with the
repository as its source. Add it, then install the plugin (a local checkout works with its path instead of the URL):

```sh
codex plugin marketplace add https://github.com/ryan-minato/universal-agent-extension-template
codex plugin add todo-tracker@todo-tracker
codex plugin list | grep todo-tracker    # installed, enabled
codex mcp list                           # the todo-tracker server with its resolved path
```

Codex copies the plugin into `~/.codex/plugins/cache/todo-tracker/todo-tracker/<version>/` and starts the MCP server
there with `PLUGIN_ROOT` set and that directory as its working directory. The skills therefore always pass `root`, and a
bare `list_todos` call from inside the plugin directory is refused rather than scanning the plugin itself. Codex asks
for approval before an MCP tool call: with `approval_policy = "never"` (as in a scripted `codex exec`) the call fails;
the default policy with `approvals_reviewer = "auto_review"` approves it (observed with codex-cli 0.164.0, 2026-10-26).

## What you get

| Component                           | After install                                                                                                                                                                                                                                                                                                                      |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Skills `todo-scan`, `todo-triage`   | Offered as `todo-tracker:todo-scan` and `todo-tracker:todo-triage` (`$todo-scan` in a prompt)                                                                                                                                                                                                                                      |
| MCP tools `list_todos`, `scan_file` | `mcp__todo_tracker__list_todos` and `mcp__todo_tracker__scan_file` (`mcp.json`, stdio, `node`); the skills call them                                                                                                                                                                                                               |
| PostToolUse hook                    | A reminder after an `apply_patch` that leaves unowned markers, as developer context for the model and a UI warning. **Not loaded by codex-cli 0.164.0**: that version discovers plugin hooks only for packages without a root `plugin.json` (Known limits). Once discovered, it runs only after you trust it in the TUI's `/hooks` |
| Subagent `todo-triager`             | **Not registered by the plugin.** Codex plugins cannot register agent roles. Install the generated role explicitly (next section).                                                                                                                                                                                                 |

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
- codex-cli 0.164.0 discovers no plugin hooks for a package that has a root `plugin.json` (checked with the app server's
  `hooks/list`: the same hooks file is found only in a legacy package with `.codex-plugin/plugin.json` alone). The hook
  stays declared where the documentation puts it; re-test on newer versions
  ([verification items](../guides/verification-items.md), item 5). Once discovered, trust it in `/hooks`, or use
  `codex exec --dangerously-bypass-hook-trust` for one scripted run. Whether the fallback manifest ever loads when the
  portable one is present is item 6.
