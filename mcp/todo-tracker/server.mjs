#!/usr/bin/env node
// The plugin's MCP server over stdio: the one place the TODO scan is implemented for agents. It
// exposes two tools, `list_todos` (a directory) and `scan_file` (one file), backed by the private
// module ./scan.mjs. Zero dependencies on purpose: the plugin ships this directory and every
// framework launches it with the consumer's Node. It implements the subset of the Model Context
// Protocol the tools need: `initialize`, `notifications/initialized`, `ping`, `tools/list`, and
// `tools/call`, as newline-delimited JSON-RPC 2.0 messages. Anything else is answered with -32601.
//
// The scan root is, in order: the `root` argument of the call, TODO_TRACKER_ROOT, the process cwd.
// Frameworks launch it as `node <plugin root>/mcp/todo-tracker/server.mjs` (mcp.json and its
// generated per-framework copies). For a person at a terminal, `--scan [root] [--unowned-only]`
// prints the same report the tool returns and exits.

import { readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { formatReport, parseArgs, scanDirectory, scanText, summarize } from "./scan.mjs";

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
    {
        name: "scan_file",
        description: "List the TODO and FIXME markers of one file, with line numbers. Use it to re-check a file " +
            "after editing its markers.",
        inputSchema: {
            type: "object",
            properties: {
                path: { type: "string", description: "The file to scan, absolute or relative to the workspace root." },
            },
            required: ["path"],
            additionalProperties: false,
        },
    },
];

/**
 * Handles one JSON-RPC request. Returns the response, or null for a notification.
 * `deps.scan` and `deps.read` are injected by the unit tests.
 */
export function handleMessage(
    message,
    deps = { scan: scanDirectory, read: (path) => readFileSync(path, "utf8"), env: process.env, cwd: process.cwd() },
) {
    const { id, method, params } = message;
    const reply = (result) => ({ jsonrpc: "2.0", id, result });
    const fail = (code, text) => ({ jsonrpc: "2.0", id, error: { code, message: text } });
    const toolError = (text) => reply({ content: [{ type: "text", text }], isError: true });
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
            const args = params?.arguments ?? {};
            if (params?.name === "list_todos") {
                const root = args.root ?? deps.env.TODO_TRACKER_ROOT ?? deps.cwd;
                let entries;
                try {
                    entries = deps.scan(root);
                } catch (error) {
                    return toolError(`scan failed: ${error.message}`);
                }
                const unownedOnly = args.unownedOnly === true;
                const text = formatReport(entries, { unownedOnly, limit: args.limit });
                const shown = unownedOnly ? entries.filter((e) => e.owner === null) : entries;
                return reply({
                    content: [{ type: "text", text }],
                    structuredContent: { summary: summarize(entries), entries: shown },
                });
            }
            if (params?.name === "scan_file") {
                if (typeof args.path !== "string") return toolError("scan_file needs a string `path`");
                let content;
                try {
                    content = deps.read(args.path);
                } catch (error) {
                    return toolError(`cannot read ${args.path}: ${error.message}`);
                }
                const entries = scanText(args.path, content);
                return reply({
                    content: [{ type: "text", text: formatReport(entries) }],
                    structuredContent: { summary: summarize(entries), entries },
                });
            }
            return fail(-32602, `unknown tool ${JSON.stringify(params?.name)}`);
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

/** `--scan [root] [--unowned-only] [--json] [--exclude <dir>]`: the report for a person, no protocol. */
export function scanCommand(argv) {
    const options = parseArgs(argv);
    const entries = scanDirectory(options.root, { excludes: options.excludes });
    if (options.json) {
        const shown = options.unownedOnly ? entries.filter((e) => e.owner === null) : entries;
        return JSON.stringify({ summary: summarize(entries), entries: shown }, null, 2);
    }
    return formatReport(entries, { unownedOnly: options.unownedOnly });
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
    if (process.argv[2] === "--scan") {
        try {
            console.log(scanCommand(process.argv.slice(3)));
        } catch (error) {
            console.error(`error: ${error.message}`);
            console.error("usage: server.mjs --scan [root] [--unowned-only] [--json] [--exclude <dir>]...");
            process.exit(2);
        }
    } else serve();
}
