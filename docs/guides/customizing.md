# Customizing a plugin

Where each kind of change goes, and what the generator does with it. The authoritative table is
`.agents/knowledge/architecture.md` in the repository; this page is the reader's version.

## Identity and version

Edit `plugin.json`. Every native manifest and the Pi `package.json` derive their public fields from it; a field repeated
in `integrations/<framework>/overrides.yaml` is rejected. A version change merged to `main` is a release, so it comes
with a `CHANGELOG.md` section.

## A skill

Add `skills/<name>/SKILL.md` with `name` equal to the directory and a `description`. Every framework reads the same
file; no generation is involved. Scripts a skill runs go in its own `scripts/` directory and use Node (the runtime every
consumer has).

## A subagent

Add `agents/<name>.md` with only `name`, `description`, and the body. Framework fields go in
`integrations/claude-code/agents/<name>.override.yaml` (tools, model, …) and
`integrations/codex/agents/<name>.override.yaml` (model, reasoning effort, feature switches). The generator writes
`.claude-plugin/agents/<name>.md` and `.codex/agents/<name>.toml`; Antigravity reads `agents/<name>.md` directly. A
framework-only agent is a complete native file under the framework's `agents/` directory.

## An MCP server

Declare it in `mcp.json` in the Agent Plugins format (`type: stdio` with a single-token `command`, or `streamable-http`
with a `url`). `${PLUGIN_ROOT}` in `args`, `env`, or `cwd` becomes each framework's variable. The generator writes
`.mcp.json` and `mcp_config.json`; Codex reads `mcp.json` itself; the Pi extension registers the server.

## A hook

Hooks are written once per framework under `integrations/<framework>/hooks/hooks.json` with their scripts beside them;
nothing is translated between frameworks. The generator validates each file's shape and copies Antigravity's to the root
`hooks.json`.

## A rule or a command

Antigravity rules go in `integrations/antigravity/rules/*.md` with a `trigger` and are copied to `rules/`. Claude Code
commands go in `integrations/claude-code/commands/*.md`; prefer a skill for anything new.

## The Pi package

`integrations/pi/package.patch.json` holds the scoped npm name and the `pi` component map; the extension and prompt
templates live beside it.

## When a conversion is impossible

The generator stops and names the field and the fix. It never widens a permission, drops a tool restriction, or
substitutes a transport to produce a valid file; the support matrix records the gap instead.
