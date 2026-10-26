# Repository layout

```text
plugin.json                 Agent Plugins 1.0 manifest: name, version, description, author, license, keywords;
                            extensions["com.openai"] carries the Codex hooks path
mcp.json                    MCP servers in the Agent Plugins format (type, command, args, ${PLUGIN_ROOT})
mcp/<server>/               The MCP servers: the one implementation of each capability, exposed as tools (Node ESM)
skills/<name>/SKILL.md      Agent Skills, read by every framework as they are; a skill's own scripts live in its scripts/
agents/<name>.md            Shared subagents: name, description, body only
integrations/
  codex/                    overrides.yaml, agents/*.override.yaml, hooks/, scripts/install-agents.mjs
  claude-code/              overrides.yaml, agents/*.override.yaml, commands/, hooks/
  antigravity/              overrides.yaml, rules/, hooks/, agents/README.md
  pi/                       package.patch.json, extensions/index.ts, prompts/
  README.md                 The override semantics
.claude-plugin/             generated: plugin.json, agents/*.md
.antigravity-plugin/        generated: plugin.json
.codex-plugin/              generated: plugin.json (fallback)
.agents/plugins/            generated: marketplace.json, so the repository is its own Codex marketplace
.codex/agents/*.toml        generated: Codex roles, installed by integrations/codex/scripts/install-agents.mjs
.mcp.json, mcp_config.json  generated: MCP for Claude Code and Antigravity
hooks.json, rules/          generated: Antigravity hooks and rules
package.json                generated: the Pi package
scripts/                    Deno management code: generate/, validate/, release/, test/, label sync
tests/                      unit/, compatibility/<framework>/, installation/, fixtures/
openspec/                   config.yaml, specs/<capability>/spec.md, changes/ and changes/archive/
docs/, zensical.toml        This site
.agents/knowledge/          The agent knowledge base AGENTS.md routes into
.agents/skills/             Project skills (github-project-workflow, template-adopt) and OpenSpec's generated skills
.github/                    Workflows, composite actions, issue forms, PR template, labels, Dependabot
justfile, deno.json         Command entry point and Deno configuration
```

Files marked _generated_ are committed and never edited by hand: `just generate` writes them and `just generate-check`
fails CI when a committed copy differs from its sources.
