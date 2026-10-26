# Plugin Architecture

Read before adding, moving, or removing any plugin component (manifest, skill, agent, MCP server, hook, rule, command,
Pi extension), before changing the generator or the validator, and when a framework reports that a component is missing.

## What the repository is

A template for one cross-framework coding-agent plugin. The sample plugin, `todo-tracker`, exercises every component
type so an adopter can delete what they do not need (`template-adopt` skill). The standard core is Agent Plugins 1.0;
Claude Code and Antigravity's shared native components extend it; everything framework-specific lives under
`integrations/<framework>/`; `just generate` writes the native entry files each framework loads. One Git repository and
one version serve every framework through its own install path.

## Support tiers

| Tier        | Frameworks                      | Promise                                                                                                                                                                   |
| ----------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| First-class | Codex, Claude Code, Antigravity | Declared components install through the native mechanism, are discovered, and are called; structural tests in CI; equal priority among the three                          |
| Compatible  | Pi                              | Shared skills reach Pi through its package mechanism; the extension, prompt, and MCP registration are declared only where implemented and tested by the manual smoke test |
| Best effort | OpenCode                        | Skills and `AGENTS.md` are reusable as they are; documented in `docs/compatibility/opencode.md`; never a release blocker                                                  |

A tier is a support promise, not a claim that every framework has the same capabilities. The support matrix in
`docs/reference/support-matrix.md` separates "file generated" from "usable after install" per component and framework;
it is the one place that matrix lives.

## Component sources

Every fact has one source. Generated files are committed so a plain `git clone` installs, but `just generate` is the
only thing that writes them and `just generate-check` fails CI when a committed copy drifts.

| Component                 | Source                                                                                                                           | Generated from it                                                                                            | Rule                                                                                                                                                                                                                                                               |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Identity and version      | `plugin.json`                                                                                                                    | `.claude-plugin/plugin.json`, `.antigravity-plugin/plugin.json`, `.codex-plugin/plugin.json`, `package.json` | The only place for `name`, `version`, `description`, `author`, `homepage`, `repository`, `license`, `keywords`; a change to `version` on `main` is a release (`github/checks.md`)                                                                                  |
| Codex manifest extras     | `plugin.json` `extensions["com.openai"]`                                                                                         | —                                                                                                            | The portable manifest's own extension slot; Codex reads it directly; the native fallback `.codex-plugin/plugin.json` is kept for clients that do not read the portable manifest (`frameworks.md`, verification item 6)                                             |
| Framework manifest fields | `integrations/<fw>/overrides.yaml`                                                                                               | the framework's manifest                                                                                     | Allow-listed per framework in `scripts/generate/lib/overrides.ts`; a public identity field here is rejected                                                                                                                                                        |
| Skills                    | `skills/<name>/SKILL.md`                                                                                                         | —                                                                                                            | Agent Skills format, one level deep, `name` equals the directory; shared by every framework without conversion                                                                                                                                                     |
| MCP servers               | `mcp.json`                                                                                                                       | `.mcp.json` (Claude), `mcp_config.json` (Antigravity)                                                        | Agent Plugins format with `type`; `${PLUGIN_ROOT}` becomes `${CLAUDE_PLUGIN_ROOT}` for Claude Code and `${extensionPath}` for Antigravity (the only documented candidate, verification item 3); Codex reads `mcp.json`, Pi registers the server from the extension |
| Shared subagents          | `agents/<name>.md`                                                                                                               | `.claude-plugin/agents/<name>.md`, `.codex/agents/<name>.toml`                                               | Front matter holds only `name` and `description`; Antigravity loads the directory as written                                                                                                                                                                       |
| Subagent framework fields | `integrations/{claude-code,codex}/agents/<name>.override.yaml`                                                                   | merged into the generated copies                                                                             | Keys become front matter for Claude Code and TOML keys for Codex, allow-listed in `scripts/generate/lib/agents.ts`; `body_prepend`/`body_append` edit the instructions                                                                                             |
| Framework-only subagents  | `integrations/claude-code/agents/<name>.md`, `integrations/codex/agents/<name>.toml`                                             | copied                                                                                                       | Complete native files; must not shadow a shared agent                                                                                                                                                                                                              |
| Hooks                     | `integrations/<fw>/hooks/hooks.json` and the scripts beside it                                                                   | `hooks.json` (Antigravity copy)                                                                              | Written per framework, never translated; Claude Code reaches its file through the manifest, Codex through the `com.openai` extension                                                                                                                               |
| Commands                  | `integrations/claude-code/commands/*.md`                                                                                         | —                                                                                                            | Claude Code only; skills are preferred for new work                                                                                                                                                                                                                |
| Rules                     | `integrations/antigravity/rules/*.md`                                                                                            | `rules/*.md`                                                                                                 | Antigravity only; `trigger` front matter required                                                                                                                                                                                                                  |
| Pi package                | `integrations/pi/package.patch.json`, `integrations/pi/extensions/`, `integrations/pi/prompts/`                                  | `package.json`                                                                                               | The patch holds the scoped npm name and the `pi` component map; everything else derives from `plugin.json`                                                                                                                                                         |
| Runtime code              | `mcp/<server>/*.mjs`, `skills/<name>/scripts/*.mjs`, `integrations/<fw>/hooks/scripts/*.mjs`, `integrations/codex/scripts/*.mjs` | —                                                                                                            | Zero-dependency Node ESM (Node 20+), the one runtime every consumer has; ships with the plugin. Each component type owns its code (Component roles)                                                                                                                |
| Management code           | `scripts/`, `tests/`, `justfile`, `deno.json`                                                                                    | —                                                                                                            | Deno TypeScript; never shipped; never bound to a skill's script                                                                                                                                                                                                    |

## Component roles

One capability, one implementation, in the component whose job it is; the other components call it or stay in their
lane:

- **MCP servers** (`mcp/<server>/`) own connectivity: a capability an agent can call is implemented once there and
  exposed as tools. Nothing else imports a server's modules.
- **Skills** own procedure: they name the MCP tools they call and compose their results. A skill may ship its own
  `scripts/` for work that is the skill's alone (the triage skill's edit applier); those scripts import nothing outside
  the skill directory, because a skill is distributed on its own.
- **Hooks** own one framework's lifecycle: deciding when to speak after an event, in that framework's contract. A hook
  that must look at a file carries its own minimal check and points the agent at the MCP tool for the authoritative
  answer; it imports nothing outside its directory.
- **Framework extensions** (the Pi extension, Claude commands, Antigravity rules) own registration and framing for that
  framework and reimplement nothing.

A format or rule both a server and a hook must know (the TODO marker syntax) is defined in one reference
(`skills/todo-scan/references/todo-format.md`) and each implementation is held to the same test fixture; the
implementations are not shared. `just validate` enforces the import boundary for skill and hook scripts.

## Subagent discovery rules

Antigravity scans the plugin root's `agents/` and its manifest cannot redirect it; Claude Code's manifest `agents` field
takes an explicit file list and replaces the root scan; Codex plugins do not register agents at all. Hence:

- A shared agent carries no framework field, so the same file is correct for Antigravity and a safe base for the others.
  The validator enforces this.
- Claude Code loads only `.claude-plugin/agents/*.md`, listed in its manifest, so root `agents/` is never read twice.
- Codex roles are generated into `.codex/agents/*.toml` (usable when working inside this repository) and installed into
  a consumer's user-level or project-level `.codex/agents/` directory by
  `integrations/codex/scripts/install-agents.mjs`, an explicit step the Codex installation page documents. "Generated"
  and "usable after install" are two different claims for Codex.
- Antigravity-specific fields for a shared agent are unsupported until the verification items in `frameworks.md` pass;
  `integrations/antigravity/agents/README.md` says why.

## Conversion rule

The generator converts only what it can convert faithfully. A permission, a tool restriction, or a transport that an
integration declares and the target framework cannot express stops generation with a message naming the field and the
fix. It never widens a permission, drops a declared restriction, or substitutes a near equivalent to make a file valid.
A shared agent declares no restriction, so Antigravity loading it with its default tools is not a dropped restriction;
it is the absence of an Antigravity override (Subagent discovery rules).

## Adding or removing a framework

Each framework is one directory under `integrations/`, one branch in `scripts/generate/main.ts` guarded by
`hasIntegration`, one compatibility test directory under `tests/compatibility/`, one installation page under
`docs/installation/`, one row in the support matrix, and one `area:` label (`github-workflow.md`). Deleting the
directory removes the framework's generated files on the next `just generate`; the remaining rows must be removed in the
same change.

## Update this file when

- A component type is added or removed, or a source moves.
- The generator gains or loses a framework, or a conversion rule changes.
- A verification item in `frameworks.md` resolves in a way that changes a discovery rule above.
