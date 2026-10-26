#!/usr/bin/env node
// A minimal MCP server over stdio exposing one tool, `list_todos`, backed by lib/todo-scan.mjs.
// Zero dependencies on purpose: the plugin ships this file and every framework launches it with
// the consumer's Node. It implements the subset of the Model Context Protocol the tool needs:
// `initialize`, `notifications/initialized`, `ping`, `tools/list`, and `tools/call`, as
// newline-delimited JSON-RPC 2.0 messages. Anything else is answered with -32601.
//
// The scan root is, in order: the `root` argument of the call, TODO_TRACKER_ROOT, the process cwd.
// Frameworks launch it as `node <plugin root>/lib/mcp-server.mjs` (mcp.json and its generated
// per-framework copies).

import { createInterface } from "node:readline";
import { formatReport, scanDirectory, summarize } from "./todo-scan.mjs";

export const PROTOCOL_VERSION = "2025-06-18";
export const SERVER_INFO = { name: "todo-tracker", version: "0.1.0" };

export const TOOLS = [
    {
        name: "list_todos",
        description: "List TODO and FIXME markers in the workspace, with owner and linked issue when the marker " +
            "names them. Use it to find unowned markers before a review or a release.",
        inputSchema: {
            type: "object",
            properties: {
                root: { type: "string", description: "Directory to scan; defaults to the workspace root." },
                unownedOnly: { type: "boolean", description: "Only markers without an owner.", default: false },
                limit: { type: "integer", description: "Maximum entries in the text report.", default: 200 },
            },
            additionalProperties: false,
        },
    },
];

/**
 * Handles one JSON-RPC request. Returns the response, or null for a notification.
 * `deps.scan` is injected by the unit tests.
 */
export function handleMessage(message, deps = { scan: scanDirectory, env: process.env, cwd: process.cwd() }) {
    const { id, method, params } = message;
    const reply = (result) => ({ jsonrpc: "2.0", id, result });
    const fail = (code, text) => ({ jsonrpc: "2.0", id, error: { code, message: text } });
    if (method === "notifications/initialized" || method === "notifications/cancelled") return null;
    if (id === undefined) return null; // any other notification needs no answer
    switch (method) {
        case "initialize":
            return reply({ protocolVersion: PROTOCOL_VERSION, capabilities: { tools: {} }, serverInfo: SERVER_INFO });
        case "ping":
            return reply({});
        case "tools/list":
            return reply({ tools: TOOLS });
        case "tools/call": {
            if (params?.name !== "list_todos") return fail(-32602, `unknown tool ${JSON.stringify(params?.name)}`);
            const args = params.arguments ?? {};
            const root = args.root ?? deps.env.TODO_TRACKER_ROOT ?? deps.cwd;
            let entries;
            try {
                entries = deps.scan(root);
            } catch (error) {
                return reply({ content: [{ type: "text", text: `scan failed: ${error.message}` }], isError: true });
            }
            const text = formatReport(entries, { unownedOnly: args.unownedOnly === true, limit: args.limit });
            return reply({ content: [{ type: "text", text }], structuredContent: { summary: summarize(entries) } });
        }
        default:
            return fail(-32601, `method not found: ${method}`);
    }
}

export function serve(input = process.stdin, output = process.stdout) {
    const lines = createInterface({ input, crlfDelay: Infinity });
    lines.on("line", (line) => {
        if (line.trim() === "") return;
        let message;
        try {
            message = JSON.parse(line);
        } catch {
            output.write(
                JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "parse error" } }) + "\n",
            );
            return;
        }
        const response = handleMessage(message);
        if (response) output.write(JSON.stringify(response) + "\n");
    });
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) serve();
