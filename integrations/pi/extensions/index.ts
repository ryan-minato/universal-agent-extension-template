// Pi extension for the todo-tracker plugin. Pi loads this file with jiti (no build step) when the
// package is installed (package.json `pi.extensions`). It registers:
//   - the tool `list_todos`, backed by lib/todo-scan.mjs, so the model can scan without a shell;
//   - the command `/todos`, the same scan for a person;
//   - the plugin's MCP server, so Pi exposes the same `list_todos` through MCP as every other framework.
// Pi is a compatibility-tier framework: this file is linted and type-checked against the published
// API types but is not exercised in CI (no `pi` binary there); docs/installation/pi.md lists the
// manual smoke test.
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { formatReport, scanDirectory, summarize } from "../../../lib/todo-scan.mjs";

const PLUGIN_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

export default function (pi: ExtensionAPI) {
    pi.registerTool({
        name: "list_todos",
        label: "List TODOs",
        description:
            "List TODO and FIXME markers in the workspace, with owner and linked issue when the marker names them.",
        parameters: Type.Object({
            root: Type.Optional(Type.String({ description: "Directory to scan; defaults to the workspace root." })),
            unownedOnly: Type.Optional(Type.Boolean({ description: "Only markers without an owner." })),
        }),
        // deno-lint-ignore require-await
        async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
            const root = params.root ?? ctx.cwd;
            const entries = scanDirectory(root);
            const text = formatReport(entries, { unownedOnly: params.unownedOnly === true });
            return { content: [{ type: "text", text }], details: summarize(entries) };
        },
    });

    pi.registerCommand("todos", {
        description: "Scan the workspace for TODO/FIXME markers and list the unowned ones",
        // deno-lint-ignore require-await
        handler: async (args, ctx) => {
            const root = args.trim() === "" ? ctx.cwd : resolve(ctx.cwd, args.trim());
            const entries = scanDirectory(root);
            ctx.ui.notify(formatReport(entries, { unownedOnly: true }), "info");
        },
    });

    pi.registerMcpServer("todo-tracker", {
        command: "node",
        args: [resolve(PLUGIN_ROOT, "lib", "mcp-server.mjs")],
    });
}
