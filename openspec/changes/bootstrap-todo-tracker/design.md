# Design

## Context

The frameworks' plugin formats overlap on skills and MCP and diverge on everything else; the facts and their dates are
in `.agents/knowledge/frameworks.md` (2026-10-26). Three constraints shaped the approach: Antigravity scans the plugin
root's `agents/` and cannot be redirected; Claude Code's manifest can point at an explicit agent file list; Codex
plugins register no agents at all.

## Goals / Non-Goals

Goals:

- One source per fact (`plugin.json` for identity, `agents/` for shared agents, `mcp.json` for servers,
  `integrations/<fw>/` for the rest); checked by `just generate-check` and `just validate`.
- Runtime that every consumer can run: zero-dependency Node ESM, Node 20 or newer. Checked by `node --check` in
  `just lint` and by the unit tests importing the modules.
- One implementation per capability, owned by the component whose job it is: the MCP server owns the scan, skills call
  its tools, hooks carry only their lifecycle logic. Checked by `just validate`'s import-boundary rule on skill and hook
  scripts and by the hook tests sharing the server's fixture.
- A conversion that cannot be faithful stops generation; checked by unit tests on the SSE case and the override allow
  lists.

Non-goals:

- Translating hooks between frameworks; each has its own implementation.
- Antigravity-specific fields for shared agents, until verification items 1 and 2 are answered.
- A Pi theme; nothing can validate one here.
- Running any framework in CI; the compatibility tests are structural.

## Decisions

- **No shared runtime library.** A first draft kept a `lib/` imported by the skill script, the server, and the hooks; it
  broke whenever a skill was distributed alone (OpenCode, a copied skill) and blurred which component owned the scan.
  Rejected in favor of component roles: the server implements, skills call tools, hooks detect minimally and point at
  the tools, the Pi extension only registers the server.

- **Shared agents carry the intersection of front matter.** Rejected: a root `agents/` written in Antigravity's dialect
  with Claude Code stripping fields (the "shared" source would be one framework's), and root `agents/` as a generated
  file (contradicts the component-source rule the template demonstrates).
- **Codex roles are generated into `.codex/agents/` and installed by an explicit script** with a marker-based conflict
  rule. Rejected: an onboarding skill in `skills/` (visible to every framework) and a SessionStart hook that copies
  files (fragile, trusted-install only).
- **Antigravity hooks and rules are copied to the root**, because that is where Antigravity reads them; the sources stay
  under `integrations/antigravity/` so the layout stays uniform.
- **`${extensionPath}` in `mcp_config.json`**: the only path variable any Antigravity source documents; recorded as
  verification item 3.
- **The Pi extension registers the MCP server itself** rather than a `.pi/mcp.json`, because the package format has no
  MCP slot and the extension is loaded on install.
- **Generated Markdown goes through `deno fmt`** inside the generator so the pre-commit hook leaves generated files
  byte-identical.

## Risks / Trade-offs

- The three open Antigravity items (agents.json, default tools, path resolution) may change where Antigravity files are
  generated; the generator's Antigravity branch is isolated for that reason.
- The Codex native fallback manifest duplicates public fields; it is kept until item 6 shows it never loads.

## Open Questions

None that change what is built; the verification items are tracked in `frameworks.md`.
