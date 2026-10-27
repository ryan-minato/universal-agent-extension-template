// Pi extension for the todo-tracker plugin. Pi loads this file with jiti (no build step) when the
// package is installed (package.json `pi.extensions`). Its one job is connectivity: registering the
// plugin's MCP server so Pi exposes the same `list_todos` and `scan_file` tools as every other
// framework. The skills and the `/todos` prompt template call those tools; nothing is reimplemented
// here (.agents/knowledge/architecture.md, Component roles).
//
// Pi is a compatibility-tier framework: this file is linted but not executed in CI (no `pi` binary
// there); docs/installation/pi.md lists the manual smoke test.
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PLUGIN_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

export default function (pi: ExtensionAPI) {
    pi.registerMcpServer("todo-tracker", {
        command: "node",
        args: [resolve(PLUGIN_ROOT, "mcp", "todo-tracker", "server.mjs")],
    });
}
