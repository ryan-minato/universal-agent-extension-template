# Install into Antigravity

Antigravity reads the manifest from `.antigravity-plugin/plugin.json` (generated from `plugin.json` and
`integrations/antigravity/overrides.yaml`) and the components from the plugin root: `skills/`, `agents/`, `rules/`,
`hooks.json`, and `mcp_config.json`. The last three are generated from `integrations/antigravity/`; `agents/` is the
shared source itself.

## Install

```sh
agy plugin install https://github.com/ryan-minato/universal-agent-extension-template
# or copy the checkout to <workspace>/.agents/plugins/todo-tracker/
```

`agy plugin validate <path> --strict` checks the layout before installing.

## What you get

| Component                         | After install                                                                                           |
| --------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Skills `todo-scan`, `todo-triage` | `/todo-tracker:todo-scan`, `/todo-tracker:todo-triage`                                                  |
| Rule `todo-style`                 | Applied when a matching source file is in context (`trigger: glob`)                                     |
| Subagent `todo-triager`           | Loaded from `agents/` with the shared front matter only; its tool list is the framework default         |
| MCP tool `list_todos`             | From `mcp_config.json`; the command path uses `${extensionPath}`                                        |
| PostToolUse hook                  | Writes the reminder to the hook log; Antigravity's PostToolUse cannot inject text into the conversation |

## Known limits

Three behaviors could not be confirmed from Antigravity's documentation and are listed as
[verification items](../guides/verification-items.md): whether `${extensionPath}` resolves in `mcp_config.json`, whether
the hook's `./integrations/...` command path resolves from the plugin root, and what tools a shared agent receives when
its front matter names none. Until they are answered, Antigravity-specific agent overrides are not supported
(`integrations/antigravity/agents/README.md` in the repository).
