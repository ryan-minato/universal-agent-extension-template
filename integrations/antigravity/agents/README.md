# Antigravity agents: not overridable in this version

Antigravity loads subagents from the plugin root's `agents/` directory and its manifest has no field that points agents
elsewhere, so the shared files in `../../agents/` are what Antigravity runs, exactly as written. Those files carry only
`name`, `description`, and the body, which every first-class framework accepts.

This directory therefore holds no `*.override.yaml` and no Antigravity-only agent: a file here would not be loaded, and
the generator refuses to write into the shared `agents/` directory. Two things must be verified on a real Antigravity
installation before that changes (`.agents/knowledge/frameworks.md`, Verification items):

- whether a root-level `agents.json` with `entries: [{ "path": "integrations/antigravity/agents" }]` adds a second agent
  directory (the format is documented for `.agents/rules.json`; an official `agents.json` schema has not been
  published);
- what a shared agent without a `tools` list may use (the documented default is `[]`).

Until then, an Antigravity-specific tool list or model tier for a shared agent is not supported.
