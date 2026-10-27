# universal-agent-extension-template

One plugin, every coding agent. This template holds a coding-agent plugin that installs into **Codex**, **Claude Code**,
**Antigravity**, and **Pi** from a single Git repository: the shared parts live once, each framework's differences live
under `integrations/<framework>/`, and a generator writes the native entry files every framework loads.

The repository ships a working sample, `todo-tracker`, so each component type can be seen working before it is replaced.
Adopters create a repository from the template, run the `template-adopt` skill, and keep what they need.

## Where to go

- [Getting started](getting-started.md): install the sample and see every component respond.
- Installation per framework: [Codex](installation/codex.md), [Claude Code](installation/claude-code.md),
  [Antigravity](installation/antigravity.md), [Pi](installation/pi.md).
- [Adopting the template](guides/adopting-the-template.md): turn it into your own plugin.
- [Support matrix](reference/support-matrix.md): what is generated and what is verified, per component and framework.
- [Verification items](guides/verification-items.md): the open questions a real installation must answer.

## Support tiers

| Tier        | Frameworks                      | Promise                                                                                                                          |
| ----------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| First-class | Codex, Claude Code, Antigravity | Declared components install through the native mechanism, are discovered, and are called; structural tests in CI; equal priority |
| Compatible  | Pi                              | Shared skills through Pi's package mechanism; extension, prompt, and MCP registration where implemented and smoke-tested         |
| Best effort | OpenCode                        | Skills and `AGENTS.md` reusable as they are; see [OpenCode](compatibility/opencode.md)                                           |

A tier is a promise about support, not a claim that every framework has the same capabilities; the
[support matrix](reference/support-matrix.md) is where the differences are written down.
