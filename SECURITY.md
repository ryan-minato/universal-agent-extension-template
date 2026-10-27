# Security Policy

> Coding agents: this page is an overview for human readers. Go to [AGENTS.md](AGENTS.md) and work from the knowledge
> base it routes you to. Where this page and the knowledge base differ, the knowledge base is right.

A plugin built from this template runs inside a developer's coding agent: its hooks run on every file edit, its MCP
server reads the workspace, and its skills steer the agent. A vulnerability here reaches every consumer who installs the
plugin and every adopter who builds on the template.

## Reporting a vulnerability

Report it privately through
[GitHub private vulnerability reporting](https://github.com/ryan-minato/universal-agent-extension-template/security/advisories/new).
Do not open a public issue or pull request for a suspected vulnerability.

Include the plugin version or tag, the framework and its version, and how to reproduce the problem. The maintainer will
acknowledge the report and coordinate a fix; fixes ship as a new version.

## Supported versions

Only the latest released version receives fixes. Consumers who install from `main` receive fixes on their next update;
consumers pinned to a tag get them when they move the pin.

## What we treat as a threat

**The plugin's runtime.** The scanner, the MCP server, the hook scripts, and the Pi extension run with the consumer's
own permissions. We worry about a file in a scanned workspace that makes the runtime do something other than report
markers, about a hook or MCP response that steers the agent beyond the reminder it is meant to give, and about a
generated entry file that grants a framework more than the sources declare.

**The template's generation.** An adopter trusts `just generate` to write exactly what the sources say. A generator that
widens a permission, drops a tool restriction, or substitutes a transport is a vulnerability even when every output file
is syntactically valid.

**Tooling and CI.** The scripts and workflows never reach consumers, so the threat is to the people and machines that
maintain the repository: pull-request content, a dependency the tooling runs, or the label workflow's
`pull_request_target` trust boundary, used to reach a write token or a maintainer's machine.

**Risks we know about and accept.** A report that only restates one of these is not handled as a vulnerability:

- Hook scripts and the MCP server run on the consumer's Node with the consumer's permissions; the plugin cannot sandbox
  itself.
- The plugin reads any text file in the scanned directory, including ones the consumer may consider private; the
  reminder it prints quotes marker text.
- Scripts import packages by exact version from widely used publishers; what those packages import in turn is their
  publishers' choice, and we keep no lock file.
- Someone with write access to this repository can make a pull request's specification look approved by adding the
  approval label themselves. Someone working from a fork cannot.
- We cannot rule out that the maintainer's account could be taken over.

A report about one of these is welcome when it brings something we did not know.
