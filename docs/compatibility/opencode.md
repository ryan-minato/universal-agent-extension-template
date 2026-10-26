# OpenCode (best effort)

OpenCode reads no plugin package format, so this repository is not installed as a plugin. What carries over:

- **Skills.** OpenCode discovers `.agents/skills/` and `.claude/skills/` in a project. Copy or link `skills/todo-scan`
  and `skills/todo-triage` into your project's `.agents/skills/` and OpenCode loads them on demand through its `skill`
  tool.
- **MCP server.** Add the server to `opencode.json`:

  ```json
  {
    "mcp": {
      "todo-tracker": {
        "type": "local",
        "command": ["node", "/path/to/universal-agent-extension-template/lib/mcp-server.mjs"]
      }
    }
  }
  ```

- **Subagent.** Write `.opencode/agents/todo-triager.md` with `description` and `mode: subagent` in its front matter and
  the body of `agents/todo-triager.md`.

Hooks, rules, and commands are not translated. OpenCode compatibility is never a release blocker and has no CI check; a
documented step that stops working is reported as a `task` issue.
