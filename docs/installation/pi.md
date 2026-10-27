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

| Component                         | After install                                                                                                            |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Skills `todo-scan`, `todo-triage` | Discovered from `skills/`; `/skill:todo-scan` forces a load                                                              |
| MCP server `todo-tracker`         | Registered by the extension with `pi.registerMcpServer`; its tools `list_todos` and `scan_file` are what the skills call |
| Prompt `/todos`                   | The prompt template `todos.md`: asks the model to call `list_todos` with `unownedOnly`                                   |

Pi is a compatibility-tier framework: the extension is linted and type-checked against the published API types but not
executed in CI. Run the manual smoke test from the repository (`just smoke pi`) on a machine with `pi` and record the
result in the [verification items](../guides/verification-items.md).
