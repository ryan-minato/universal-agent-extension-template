# OpenCode (best effort)

OpenCode reads no plugin package format, so this repository is not installed as a plugin. What carries over:

- **MCP server first.** The skills call the server's tools, so add it to `opencode.json` before copying them:

  ```json
  {
    "mcp": {
      "todo-tracker": {
        "type": "local",
        "command": ["node", "/path/to/universal-agent-extension-template/mcp/todo-tracker/server.mjs"]
      }
    }
  }
  ```

- **Skills.** OpenCode discovers `.agents/skills/` and `.claude/skills/` in a project. Copy or link `skills/todo-scan`
  and `skills/todo-triage` into your project's `.agents/skills/`; each skill is self-contained and OpenCode loads it on
  demand through its `skill` tool.
- **Subagent.** Write `.opencode/agents/todo-triager.md` with `description` and `mode: subagent` in its front matter and
  the body of `agents/todo-triager.md`.

Hooks, rules, and commands are not translated. OpenCode compatibility is never a release blocker and has no CI check; a
documented step that stops working is reported as a `task` issue.
