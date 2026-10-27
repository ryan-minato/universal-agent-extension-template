# Getting started

The fastest way to understand the template is to install the sample plugin and watch each component respond. Everything
below runs offline; the runtime is plain Node.js 20 or newer.

## 1. Get the repository

```sh
git clone https://github.com/ryan-minato/universal-agent-extension-template.git
cd universal-agent-extension-template
```

Open it in the dev container if you want the full toolchain (Deno, just, OpenSpec, Zensical, the Claude Code and Codex
CLIs); installing the plugin into a framework needs none of that.

## 2. Try the runtime directly

```sh
node mcp/todo-tracker/server.mjs --scan tests/fixtures/sample
```

prints the verdict line and four markers, two of them unowned: the MCP server in its terminal mode, the same scan the
`list_todos` tool returns.

## 3. Install into a framework

Follow the page for your framework: [Codex](installation/codex.md), [Claude Code](installation/claude-code.md),
[Antigravity](installation/antigravity.md), [Pi](installation/pi.md). Each page says what to expect after installing and
which steps are manual.

## 4. See the components

In a session with the plugin loaded:

1. Ask the agent to call `list_todos` through MCP on a directory with a bare `TODO:` line; the answer starts with the
   verdict line.
2. Run the `todo-scan` skill (`/todo-tracker:todo-scan` in Claude Code and Antigravity, `$todo-scan` in Codex,
   `/skill:todo-scan` in Pi): it calls the same tool and reports the verdict.
3. Edit a file and add an unowned marker: the PostToolUse hook reminds the agent (Claude Code and Codex inject the
   reminder into the conversation; Antigravity writes it to the hook log).
4. Ask for the `todo-triager` subagent to classify the markers; it reports buckets and next steps without editing
   anything.

## 5. Make it yours

Read [Adopting the template](guides/adopting-the-template.md), or open the repository with your coding agent and ask it
to run the `template-adopt` skill.
