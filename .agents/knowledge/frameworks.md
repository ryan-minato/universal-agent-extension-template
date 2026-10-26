# Framework Facts

Read before editing anything under `integrations/`, the generator, or an installation page, and when a framework behaves
differently from what a file here says. Every fact below was read from the named source on the date given; a framework
changes faster than this file, so re-read the source before relying on a fact for a new component, and update the row
with the new date.

## Agent Plugins 1.0.0 (2026-10-26, agent-plugins.org/specification, agentplugins/agent-plugins-spec)

- Manifest at the plugin root, `plugin.json`, `$schema` exactly
  `https://agent-plugins.org/schemas/1.0.0/plugin.schema.json`. Closed field set: `$schema`, `name`, `version`,
  `description`, `author` (`name`, `email`, `url`), `homepage`, `repository`, `license`, `keywords`, `extensions`
  (object keyed by reverse-domain namespace, no semantics assigned).
- `name`: 1–64 of `a-z 0-9 - .`, alphanumeric at both ends, no `--` or `..`.
- Skills: immediate children of `skills/` holding `SKILL.md`; no recursion. SKILL.md follows the Agent Skills
  specification (`name` equals the directory, `description` 1–1024 characters).
- `mcp.json`: `$schema` (`.../1.0.0/mcp.schema.json`, same version as the manifest) and `mcpServers`; each server has
  `type` (`stdio` with a single-token `command`, `args`, `env`, `cwd`; `streamable-http` or `sse` with `url`,
  `headers`). `${PLUGIN_ROOT}` and `${PLUGIN_DATA}` expand in `args`, `env` values, and `cwd` only; the client sets both
  variables in the server's environment.
- 1.1.0 is a working draft that adds no field and no component type to 1.0.0: still no agents, hooks, commands, or
  rules.

## Codex (2026-10-26, learn.chatgpt.com/docs/plugins, /docs/hooks, /docs/agent-configuration/subagents, openai/codex source)

- Reads the portable manifest. Codex-specific fields go under `extensions["com.openai"]`: `hooks`, `apps`, `interface`,
  `onboardingSkill`; when that object exists it replaces the native `.codex-plugin/plugin.json`, which is kept here only
  as a fallback.
- Native manifest fields: `name`, `version`, `description`, `author`, `homepage`, `repository`, `license`, `keywords`,
  `skills` (path), `mcpServers` (path), `apps`, `hooks`, `interface`.
- Plugins do not register agents: the manifest struct has no `agents` field (codex-rs `core-plugins/src/manifest.rs`);
  openai/codex issue #18988 is open. Custom agents are TOML files (`name`, `description`, `developer_instructions`
  required; optional `model`, `model_reasoning_effort`, `model_reasoning_summary`, `model_verbosity`, `features.*`,
  `skills.*`, `nickname_candidates`) read from `~/.codex/agents/*.toml`, `<repo>/.codex/agents/*.toml` (trusted projects
  only), or `config.toml` `[agents.<name>] config_file = "<path>"`. A role cannot override `sandbox_mode`,
  `approval_policy`, `model_provider`, or `mcp_servers`.
- Hooks: `hooks/hooks.json` or the manifest `hooks` path; same shape as Claude Code; events SessionStart, SessionEnd,
  PreToolUse, PermissionRequest, PostToolUse, PreCompact, PostCompact, UserPromptSubmit, SubagentStart, SubagentStop,
  Stop, Interrupt. Codex sets `PLUGIN_ROOT` and `CLAUDE_PLUGIN_ROOT` for hook commands. PostToolUse input for Codex's
  own editor is `tool_name: "apply_patch"` with the patch text in `tool_input.command` (matcher `apply_patch`, `Edit`,
  or `Write`); the output's `hookSpecificOutput.additionalContext` becomes developer context for the model while
  `systemMessage` is only a UI warning, so a reminder the model must act on goes in `additionalContext` (docs read
  2026-10-26). Non-managed hooks must be trusted by the user.
- Project skills: every `.agents/skills/` from the cwd up to the repository root. `AGENTS.md` is concatenated from the
  repository root down to the cwd (32 KiB cap).
- Install: a marketplace root must hold `.agents/plugins/marketplace.json` (`name`, `interface.displayName`, `plugins[]`
  with `name`, `source: {source: "local", path}`, `policy`, `category`); `codex plugin marketplace
  add <path|URL>`
  then `codex plugin add <plugin>@<marketplace>`; the plugin is copied to
  `~/.codex/plugins/cache/<marketplace>/<plugin>/<version>/` and recorded in `~/.codex/config.toml`. A plugin entry with
  `path: "./"` makes a repository its own marketplace (observed with codex-cli 0.164.0, 2026-10-26; the generator writes
  that file).
- Observed with codex-cli 0.164.0 (2026-10-26): `mcp.json` is read with `${PLUGIN_ROOT}` resolved to the cache
  directory, and the server runs with `PLUGIN_ROOT` and `PLUGIN_DATA` in its environment and the plugin directory as its
  working directory (`codex mcp list` shows all three), so a tool that scans "the workspace" must be told the root. Tool
  names are `mcp__<server with - as _>__<tool>` (`mcp__todo_tracker__list_todos`); plugin skills are offered as
  `<plugin>:<skill>`. An MCP tool call asks for approval: under `approval_policy = "never"` it fails ("requires
  approval, but approval policy is never"); the default `on-request` with `approvals_reviewer = "auto_review"` approves
  it in `codex exec`. `-c mcp_servers.<name>.default_tools_approval_mode` is rejected for a plugin server ("invalid
  transport") and `-c plugins."<plugin>@<marketplace>".mcp_servers.<server>.default_tools_approval_mode="auto"` did not
  take effect from the command line; whether it works in `config.toml` is untested. A role installed by
  `install-agents.mjs --scope user` was delegated to in `codex exec` and called `mcp__todo_tracker__scan_file`
  (2026-10-26). Plugin hooks load from the manifest path but are skipped until the user trusts the hook definition in
  the TUI's `/hooks` (trust is recorded against the hook's hash); `codex exec` without that trust produced no hook
  output, and `--dangerously-bypass-hook-trust` runs them for one scripted run (docs; not exercised here).

## Claude Code (2026-10-26, code.claude.com/docs/en/plugins/manifest-reference, components, hooks, sub-agents, skills, memory)

- Manifest `.claude-plugin/plugin.json`; only `name` required. Component path fields: `skills` (adds to the default
  `skills/` scan), `commands`, `agents`, `hooks`, `mcpServers`, `lspServers`, `outputStyles`, `workflows`. `agents`
  takes `.md` file paths only (string or array) and replaces the default `agents/` scan. Paths start with `./` and stay
  inside the plugin root.
- Names starting with `claude-`, `anthropic-`, `anthropics-`, `cc-plugin-`, and the names `claude`, `anthropic`,
  `claude-code`, `claude-mods` are refused.
- Agent front matter: `name`, `description` required; `tools`, `disallowedTools`, `model` (`sonnet`, `opus`, `haiku`,
  `fable`, a model id, or `inherit`), `effort`, `maxTurns`, `skills`, `memory`, `background`, `color` supported;
  `permissionMode`, `hooks`, `mcpServers` ignored for plugin agents.
- Hooks: `{"hooks": {<Event>: [{"matcher", "hooks": [{"type": "command", "command", "args",
  "timeout"}]}]}}`;
  `${CLAUDE_PLUGIN_ROOT}` substituted in `command` and `args`. PostToolUse returns
  `hookSpecificOutput.additionalContext`; it cannot block.
- `.mcp.json`: `{"mcpServers": {name: {command, args, env}}}` for stdio, `type: "http"|"sse"` with `url` for remote. A
  skill and a command of the same name resolve to the skill.
- Observed in a `--plugin-dir` session (CLI 2.1.310, 2026-10-26): the manifest's explicit `agents` list loads the agent
  as `<plugin>:<name>` with the override's `tools`, although `claude --plugin-dir <root> plugin details <plugin>` counts
  it as `Agents (0)` (the inventory command undercounts an explicit list; a root scan counts). A plugin MCP server's
  tools are named `mcp__plugin_<plugin>_<server>__<tool>`, so a subagent `tools` list must include
  `mcp__plugin_<plugin>_<server>__*` or the subagent gets none of them. The model is shown a tool result's
  `structuredContent` only, not its text part, so anything the model must quote lives in the structured result too.
- `claude plugin validate <path> [--strict]` runs offline; `claude --plugin-dir <path>` loads a plugin for one session.
  Reads a root `AGENTS.md` when no `CLAUDE.md` exists (v2.1.277+), which is why this repository has none:
  `claude plugin validate --strict` fails on a `CLAUDE.md` at a plugin root ("not loaded as project context", observed
  2026-10-26). `.claude/rules/*.md` with a `paths` list are project rules.

## Antigravity (2026-10-26, antigravity.google/docs/{plugins,skills,rules,hooks,mcp,subagents}, antigravity-cli CHANGELOG)

- Manifest in `.antigravity-plugin/plugin.json` (preferred over a root `plugin.json`, from release notes and third-party
  reports; the official page documents the root file). Live schema (`antigravity.google/schemas/v1/plugin.json`): `name`
  (`^[a-zA-Z0-9_-]+$`, so no dots), `displayName`, `description`, `version`, `author`, `homepage`, `repository`,
  `license`, `keywords`, `logo`, `suggestedPrompts` (max 3), `skills`, `extensions`.
- Components resolve from the plugin root regardless of the manifest's folder: `skills/` (one level), `agents/`,
  `rules/`, `hooks.json`, `mcp_config.json`. The validator warns about components placed inside `.antigravity-plugin/`.
- Agent front matter: `name`, `description` required; `tools` (string list of Antigravity tool names, documented default
  `[]`), `mainAgent`, `subagent`, `model` (`inherit`, `flash`, `pro`), `commandExecutionPolicy`, `mcpServers`, `skills`,
  `plugins`. A misspelled tool name may hang the subagent.
- Rules: `trigger` is `model_decision` (needs `description`), `always_on`, `glob` (needs `globs`, a comma-separated
  string), or `manual`; an invalid trigger drops the rule silently; 24,000 bytes per file.
- `hooks.json`: an object of named hooks, each holding `enabled` and event keys SessionStart, PreToolUse, PostToolUse,
  PreInvocation, PostInvocation, Stop; tool events hold `[{matcher, hooks: [{type: "command", command, timeout}]}]`.
  PostToolUse returns `{}` and injects nothing; a Claude-style top-level `hooks` key loads as a single hook named
  `hooks`.
- `mcp_config.json`: `{"mcpServers": {name: {command, args, env, cwd}}}` for stdio, `serverUrl` for streamable HTTP; no
  SSE. No path placeholder is documented; `${extensionPath}` is the Gemini CLI variable the 1.0.7 release notes say
  resolves to the installed plugin directory.
- Project-level: `.agents/skills/`, `.agents/agents/`, `.agents/rules/` (+ `.agents/rules.json` with
  `entries: [{path, exclude, include_only}]`), `.agents/hooks.json`, `.agents/mcp_config.json`,
  `.agents/plugins/<plugin>/`. CLI: `agy plugin install <path|url>`, `agy plugin validate [--strict]`.

## Pi (2026-10-26, earendil-works/pi packages/coding-agent/docs: packages, extensions, skills, prompt-templates, mcp)

- Package: `package.json` with `"pi": {"extensions": [...], "skills": [...], "prompts": [...],
  "themes": [...]}`
  (paths or globs relative to the package root) and the keyword `pi-package`. Install: `pi install <local path>`,
  `pi install git:<host>/<owner>/<repo>[@ref]`, `pi install
  npm:<name>`; `--local` writes to `.pi/settings.json`.
- Extension: default-exported `(pi: ExtensionAPI) => void`, loaded with jiti (TypeScript, no build step); `registerTool`
  (TypeBox `parameters`, `execute` returns `{content, details}`), `registerCommand`,
  `registerMcpServer(name, {command, args})`, `on(event, …)`. Types from `@earendil-works/pi-coding-agent` (the former
  `@mariozechner` scope is deprecated).
- Skills: `.agents/skills/` and `.pi/skills/`, Agent Skills format, `/skill:<name>` forces a load. Prompt templates:
  `prompts/*.md` with `description` and `argument-hint`; `$1`, `$@`, `${1:-default}` substitution. Context files:
  `AGENTS.md` (and `CLAUDE.md`) from the cwd upward.

## OpenCode (2026-10-26, opencode.ai/docs/{skills,agents,commands,plugins,rules,mcp-servers,config})

- Reads skills from `.opencode/skills/`, `.claude/skills/`, `.agents/skills/` (and the user-level equivalents);
  `AGENTS.md` from the cwd upward with `CLAUDE.md` as fallback. Agents, commands, and plugins are project files under
  `.opencode/`; MCP servers are configured in `opencode.json`. No plugin package format is read, so only the skills and
  the entrypoint of this plugin carry over.

## Verification items

Open questions no document answered; each needs one run on a real installation, and the result goes into the matching
section above and into `docs/guides/verification-items.md`.

| # | Framework   | Question                                                                                                                                                                                        | What depends on it                                                                                          |
| - | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 1 | Antigravity | Does a root `agents.json` with `entries: [{"path": "integrations/antigravity/agents"}]` add a second agent directory, and does it suppress the root scan?                                       | Whether Antigravity-specific agent overrides can be supported (`integrations/antigravity/agents/README.md`) |
| 2 | Antigravity | What tools does a shared agent with no `tools` list receive?                                                                                                                                    | Whether the shared `todo-triager` can read files at all                                                     |
| 3 | Antigravity | Is a hook `command` of `./integrations/...` resolved from the plugin root? Does `${extensionPath}` resolve in `mcp_config.json`?                                                                | `hooks.json` and `mcp_config.json` as generated                                                             |
| 4 | Antigravity | With both `.antigravity-plugin/plugin.json` and a root `plugin.json`, which one wins in the app and in the CLI?                                                                                 | The manifest folder choice                                                                                  |
| 5 | Codex       | After the plugin's hooks are trusted in `/hooks` (or with `--dangerously-bypass-hook-trust`), does the PostToolUse `systemMessage` appear after an `apply_patch` that leaves an unowned marker? | The Hooks cell of the Codex column                                                                          |
| 6 | Codex       | Does the native fallback `.codex-plugin/plugin.json` ever load when `extensions["com.openai"]` is present?                                                                                      | Whether the fallback can be dropped                                                                         |
| 7 | Pi          | Does the extension load under jiti with the `@sinclair/typebox` import, and does `registerMcpServer` accept the shape used?                                                                     | The Pi extension                                                                                            |

## Update this file when

- A verification item is answered: move the fact into the framework's section with the date.
- A framework page changes a field, a path, or a limit a row states; re-read, then update the date.
- A framework is added or removed (`architecture.md`, Adding or removing a framework).
