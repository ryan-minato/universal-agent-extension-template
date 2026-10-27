<h1 align="center">universal-agent-extension-template</h1>

<p align="center">
  One plugin, every coding agent: a template for extensions that install into
  <b>Codex</b>, <b>Claude Code</b>, <b>Antigravity</b>, and <b>Pi</b> from a single Git repository.
</p>

<p align="center">
  <a href="https://github.com/ryan-minato/universal-agent-extension-template/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/ryan-minato/universal-agent-extension-template/actions/workflows/ci.yml/badge.svg?branch=main"></a>
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/github/license/ryan-minato/universal-agent-extension-template"></a>
</p>

<p align="center">
  <a href="https://ryan-minato.github.io/universal-agent-extension-template/">Documentation</a> ·
  <a href="#the-sample-plugin">Sample plugin</a> · <a href="#how-it-works">How it works</a> ·
  <a href="#make-it-your-own">Make it your own</a> · <a href="CONTRIBUTING.md">Contributing</a>
</p>

## Why

Each coding agent has its own plugin format: Claude Code reads `.claude-plugin/plugin.json`, Antigravity
`.antigravity-plugin/plugin.json`, Codex the portable Agent Plugins manifest, Pi a `package.json`. The parts worth
sharing (skills, an MCP server, a subagent's instructions) are the same everywhere; the parts that differ (hooks, tool
names, manifest fields) are small but real. This template keeps the shared parts in one place, keeps each framework's
differences in `integrations/<framework>/`, and generates the native entry files, so one repository and one version
install everywhere.

| Tier        | Frameworks                      | What is promised                                                                                     |
| ----------- | ------------------------------- | ---------------------------------------------------------------------------------------------------- |
| First-class | Codex, Claude Code, Antigravity | Native install, discovery, and invocation of every declared component; structural tests in CI        |
| Compatible  | Pi                              | Skills through Pi's package mechanism; the extension, prompt, and MCP registration where implemented |
| Best effort | OpenCode                        | Skills and `AGENTS.md` reusable as they are; no package                                              |

The [support matrix](https://ryan-minato.github.io/universal-agent-extension-template/reference/support-matrix/) says,
per component and framework, what is generated and what is verified to work after install.

## The sample plugin

The repository ships `todo-tracker`, a small plugin that exercises every component type so you can see each one working
before you delete it:

- **MCP server** `todo-tracker`: the one implementation of the scan, exposed as the tools `list_todos` and `scan_file`
  over stdio, zero dependencies.
- **Skills** `todo-scan` and `todo-triage`: procedures that call those tools, report the unowned markers, and decide
  what to do with them; the triage skill ships its own edit script.
- **Subagent** `todo-triager`: classifies markers without editing files.
- **Hooks**: after a file edit, a reminder about unowned markers it now holds, pointing at the tools (one self-contained
  implementation per framework).
- **Antigravity rule**, **Claude Code command**, **Pi extension and prompt**: the framework-specific extras.

Install it to try the template end to end:

```sh
# Claude Code: load for one session
claude --plugin-dir /path/to/universal-agent-extension-template
# Codex: the repository is its own marketplace
codex plugin marketplace add https://github.com/ryan-minato/universal-agent-extension-template
codex plugin add todo-tracker@todo-tracker
# Antigravity
agy plugin install https://github.com/ryan-minato/universal-agent-extension-template
# Pi
pi install git:github.com/ryan-minato/universal-agent-extension-template
```

Each framework's page in the documentation lists what to expect after installing and the steps that are still manual
(Codex subagents, for example, need one explicit install command).

## How it works

```text
plugin.json  mcp.json  skills/  agents/      <- the shared core (Agent Plugins 1.0)
integrations/<framework>/                    <- overrides, hooks, commands, rules, Pi extension
         │
         ▼  just generate
.claude-plugin/  .antigravity-plugin/  .codex-plugin/  .codex/agents/  package.json
.mcp.json  mcp_config.json  hooks.json  rules/        <- committed, never edited by hand
```

`plugin.json` is the only source of the plugin's name, version, and description. `just generate` derives every native
file from it and the integrations; `just check` fails when a committed copy drifts. A merge to `main` that changes the
version is released automatically: the tag `v<version>` and a GitHub Release with notes from `CHANGELOG.md` and the
merged pull requests.

The repository is also a worked example of an agent harness: `AGENTS.md` routes coding agents into a knowledge base,
OpenSpec specifications gate behavior changes behind a maintainer's approval label, and the generated files, specs, and
documentation are all checked in CI.

## Make it your own

1. Create a repository from this template and open it in the dev container.
2. Ask your coding agent to run the `template-adopt` skill (or read
   [`.agents/skills/template-adopt/SKILL.md`](.agents/skills/template-adopt/SKILL.md) yourself): it renames the plugin,
   removes the frameworks and components you do not want, and resets the changelog, specs, and docs.
3. Add your first component where `.agents/knowledge/architecture.md` says it lives, run `just generate && just check`,
   and open a pull request.

The
[Adopting the template](https://ryan-minato.github.io/universal-agent-extension-template/guides/adopting-the-template/)
guide walks through the same steps with the reasoning behind each.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Vulnerabilities go through [SECURITY.md](SECURITY.md), never a public issue.

## License

[Apache-2.0](LICENSE).
