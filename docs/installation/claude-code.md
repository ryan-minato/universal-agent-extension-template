# Install into Claude Code

Claude Code reads `.claude-plugin/plugin.json`, generated from `plugin.json` and
`integrations/claude-code/overrides.yaml`. The manifest lists the generated agent files explicitly, points at the
commands directory and the hooks file under `integrations/claude-code/`, and the MCP servers come from the generated
`.mcp.json`.

## Install

For one session, from a checkout:

```sh
claude --plugin-dir /path/to/universal-agent-extension-template
```

For a durable install, add the repository to a marketplace you control and run
`claude plugin install todo-tracker@<marketplace>`. The repository does not ship a `.claude-plugin/marketplace.json`;
the adopter's marketplace lists the plugin.

## What you get

| Component                         | After install                                                                                             |
| --------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Skills `todo-scan`, `todo-triage` | `/todo-tracker:todo-scan`, `/todo-tracker:todo-triage`                                                    |
| Command `/todo-tracker:todos`     | Runs the scan with `--unowned-only`; kept as an example of the command mechanism (skills are preferred)   |
| Subagent `todo-triager`           | Available to the Agent tool with the read-only tool list from its override (`Read`, `Grep`, `Glob`)       |
| MCP tool `list_todos`             | `/mcp` lists the `todo-tracker` server                                                                    |
| PostToolUse hook                  | After `Write`, `Edit`, or `MultiEdit`, unowned markers in the edited file come back as additional context |

## Validate

```sh
claude plugin validate /path/to/universal-agent-extension-template --strict
```

runs offline and is part of CI (`plugin` job). `claude --plugin-dir` followed by `/help` shows the plugin's commands and
skills; `/reload-plugins` picks up edits during development.
