# Install into Pi

Pi installs the repository as a package: the generated `package.json` carries the `pi` key that names the extension, the
skills directory, and the prompt templates (`integrations/pi/package.patch.json` is its source).

## Install

```sh
pi install git:github.com/ryan-minato/universal-agent-extension-template
# or, from a checkout
pi install /path/to/universal-agent-extension-template
```

Add `--local` to record the package in the project's `.pi/settings.json` instead of the personal settings.

## What you get

| Component                         | After install                                                                                            |
| --------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Skills `todo-scan`, `todo-triage` | Discovered from `skills/`; `/skill:todo-scan` forces a load                                              |
| Tool `list_todos`                 | Registered by the extension; the model can scan without a shell                                          |
| Command `/todos`                  | Registered by the extension; the prompt template `todos.md` offers the same through `/todos` as a prompt |
| MCP server `todo-tracker`         | Registered by the extension with `pi.registerMcpServer`                                                  |

Pi is a compatibility-tier framework: the extension is linted and type-checked against the published API types but not
executed in CI. Run the manual smoke test from the repository (`just smoke pi`) on a machine with `pi` and record the
result in the [verification items](../guides/verification-items.md).
