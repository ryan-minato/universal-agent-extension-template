# Verification items

Behaviors the frameworks' documentation did not settle. Each needs one run on a real installation; the result goes into
`.agents/knowledge/frameworks.md` (the source of this table) and into the support matrix. Until an item is answered, the
generated files take the documented or most likely form and the limitation is stated on the framework's installation
page.

| # | Framework   | Question                                                                                                                                                    | What depends on it                                      |
| - | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| 1 | Antigravity | Does a root `agents.json` with `entries: [{"path": "integrations/antigravity/agents"}]` add a second agent directory, and does it suppress the root scan?   | Antigravity-specific agent overrides                    |
| 2 | Antigravity | What tools does a shared agent with no `tools` list receive?                                                                                                | Whether the shared `todo-triager` can read files at all |
| 3 | Antigravity | Is a hook `command` of `./integrations/...` resolved from the plugin root? Does `${extensionPath}` resolve in `mcp_config.json`?                            | `hooks.json` and `mcp_config.json` as generated         |
| 4 | Antigravity | With both `.antigravity-plugin/plugin.json` and a root `plugin.json`, which one wins in the app and in the CLI?                                             | The manifest folder choice                              |
| 5 | Codex       | After a marketplace or Git install, do `install-agents.mjs --scope user` roles appear in `/subagents`, and are plugin hooks honoured for that install path? | The Codex row of the support matrix                     |
| 6 | Codex       | Does the native fallback `.codex-plugin/plugin.json` ever load when `extensions["com.openai"]` is present?                                                  | Whether the fallback can be dropped                     |
| 7 | Pi          | Does the extension load under jiti with the `@sinclair/typebox` import, and does `registerMcpServer` accept the shape used?                                 | The Pi extension                                        |

## How to run one

`just smoke <framework>` runs what can run without a session and prints the manual steps for the rest; it exits 2 when
the framework's CLI is absent. Record the answer with the framework version and the date, then open a pull request that
moves the fact into `frameworks.md`, updates the installation page and the support matrix, and removes the row here.
