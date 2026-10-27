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

| Component                           | After install                                                                                                                 |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Skills `todo-scan`, `todo-triage`   | `/todo-tracker:todo-scan`, `/todo-tracker:todo-triage`                                                                        |
| Command `/todo-tracker:todos`       | Asks for `list_todos` with `unownedOnly`; kept as an example of the command mechanism (skills are preferred)                  |
| Subagent `todo-triager`             | `todo-tracker:todo-triager` for the Agent tool, with the override's tools: `Read`, `Grep`, `Glob`, and the plugin's MCP tools |
| MCP tools `list_todos`, `scan_file` | `/mcp` lists the `todo-tracker` server                                                                                        |
| PostToolUse hook                    | After `Write`, `Edit`, or `MultiEdit`, unowned markers in the edited file come back as additional context                     |

## Validate

```sh
claude plugin validate /path/to/universal-agent-extension-template --strict
```

runs offline and is part of CI (`plugin` job). Then, from a checkout:

1. `claude --plugin-dir /path/to/checkout plugin details todo-tracker` prints the component inventory Claude Code loads
   (skills, agents, hooks, MCP servers) and its token cost. The `--plugin-dir` flag goes before the subcommand.
2. `claude --plugin-dir /path/to/checkout` in a project that holds a few markers: `/help` shows the plugin's commands
   and skills, `/mcp` lists the `todo-tracker` server, `/agents` lists `todo-tracker:todo-triager`,
   `/todo-tracker:todos` runs the scan, and editing a file so it holds an unowned `TODO:` makes the hook's reminder
   appear in the next turn. `/reload-plugins` picks up edits during development.
3. When a hook or the server stays silent, start with `--debug=hooks,mcp`: the log names the command that failed.

`just smoke claude-code` runs steps that need no session and prints the rest. The inventory command reports `Agents (0)`
for the explicit `agents` list the manifest uses while the session loads the agent (observed with CLI 2.1.310);
`/agents` is the check that counts.
