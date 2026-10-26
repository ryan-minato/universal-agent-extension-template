# Generation

`just generate` reads the sources and writes every native entry file; `just generate-check` compares without writing and
is part of `just check` and CI. The generator is `scripts/generate/main.ts` with one module per component kind under
`scripts/generate/lib/`.

## Inputs to outputs

| Source                                                                               | Output                            | Transformation                                                                                                                           |
| ------------------------------------------------------------------------------------ | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `plugin.json` + `integrations/claude-code/overrides.yaml` + the generated agent list | `.claude-plugin/plugin.json`      | Public fields, the override's path fields, `agents` as an explicit file list                                                             |
| `plugin.json` + `integrations/antigravity/overrides.yaml`                            | `.antigravity-plugin/plugin.json` | Public fields plus `displayName`, `suggestedPrompts`; the name may not contain a dot                                                     |
| `plugin.json` + `integrations/codex/overrides.yaml`                                  | `.codex-plugin/plugin.json`       | Public fields plus the native `skills`, `mcpServers`, `hooks`, `interface`                                                               |
| `agents/<name>.md` + `integrations/claude-code/agents/<name>.override.yaml`          | `.claude-plugin/agents/<name>.md` | Front matter merged (shallow), body kept, a generated-by comment inside the front matter                                                 |
| `agents/<name>.md` + `integrations/codex/agents/<name>.override.yaml`                | `.codex/agents/<name>.toml`       | `name`, `description`, `developer_instructions` (the body as a literal string), then the override; a marker comment the installer checks |
| `mcp.json`                                                                           | `.mcp.json`                       | stdio servers drop `type`; `${PLUGIN_ROOT}` becomes `${CLAUDE_PLUGIN_ROOT}`; remote servers keep `type: http` or `sse`                   |
| `mcp.json`                                                                           | `mcp_config.json`                 | stdio as `command`/`args`/`env`/`cwd` with `${extensionPath}`; streamable HTTP as `serverUrl`; SSE is refused                            |
| `integrations/antigravity/hooks/hooks.json`                                          | `hooks.json`                      | Copied after validating the named-hook shape                                                                                             |
| `integrations/antigravity/rules/*.md`                                                | `rules/*.md`                      | Copied after validating the `trigger` front matter                                                                                       |
| `plugin.json` + `integrations/pi/package.patch.json`                                 | `package.json`                    | Public fields in npm form, keywords merged, the `pi` map from the patch                                                                  |

Claude Code's hooks and commands, and Codex's hooks, are not copied: the manifests point at the files under
`integrations/`.

## Rules the generator enforces

- A shared agent's front matter holds only `name` and `description`; a framework field belongs in an override file.
- An override may set only the keys the framework documents; a public identity field is rejected.
- Every `./`-relative path in a manifest exists (or is produced by the same run).
- Hook files have the shape their framework reads; an Antigravity file with a top-level `hooks` key is refused because
  Antigravity would load it as one hook named `hooks`.
- A conversion that cannot be faithful stops generation with the field and the fix; nothing is widened or substituted.
- A file in a generated directory that no source produces is stale and is deleted (or fails `--check`).
