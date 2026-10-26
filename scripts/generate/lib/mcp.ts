// mcp.json (the Agent Plugins format) and its native copies: .mcp.json for Claude Code and
// mcp_config.json for Antigravity. Codex and Pi read mcp.json itself (Codex through the portable
// manifest, Pi through the extension that registers the server).
import { exists, isRecord, readJson } from "../../lib/repo.ts";
import { MCP_SCHEMA } from "./plugin.ts";

export const PLACEHOLDER = "${PLUGIN_ROOT}";
export const CLAUDE_PLACEHOLDER = "${CLAUDE_PLUGIN_ROOT}";
/** The Gemini CLI variable Antigravity's changelog names as resolving to the installed plugin directory. */
export const ANTIGRAVITY_PLACEHOLDER = "${extensionPath}";

export type Server =
    | { type: "stdio"; command: string; args?: string[]; env?: Record<string, string>; cwd?: string }
    | { type: "streamable-http" | "sse"; url: string; headers?: Record<string, string> };

export interface McpConfig {
    mcpServers: Record<string, Server>;
}

function serverProblems(name: string, value: unknown): string[] {
    const where = `mcp.json server ${JSON.stringify(name)}`;
    if (!isRecord(value)) return [`${where} must be an object`];
    const problems: string[] = [];
    if (value.type === "stdio") {
        for (const key of Object.keys(value)) {
            if (!["type", "command", "args", "env", "cwd"].includes(key)) {
                problems.push(`${where} has the unknown field "${key}"`);
            }
        }
        if (typeof value.command !== "string" || /\s/.test(value.command)) {
            problems.push(`${where}: "command" must be one executable token (no shell string)`);
        } else if (value.command.includes("${")) problems.push(`${where}: placeholders are not expanded in "command"`);
        if (
            value.args !== undefined && (!Array.isArray(value.args) || !value.args.every((a) => typeof a === "string"))
        ) {
            problems.push(`${where}: "args" must be an array of strings`);
        }
        if (value.env !== undefined) {
            if (!isRecord(value.env) || !Object.values(value.env).every((v) => typeof v === "string")) {
                problems.push(`${where}: "env" must map names to strings`);
            } else if ("PLUGIN_ROOT" in value.env || "PLUGIN_DATA" in value.env) {
                problems.push(`${where}: "env" may not set PLUGIN_ROOT or PLUGIN_DATA; the client provides them`);
            }
        }
    } else if (value.type === "streamable-http" || value.type === "sse") {
        for (const key of Object.keys(value)) {
            if (!["type", "url", "headers"].includes(key)) problems.push(`${where} has the unknown field "${key}"`);
        }
        if (typeof value.url !== "string" || !/^https?:\/\//.test(value.url)) {
            problems.push(`${where}: "url" must be absolute http(s)`);
        } else if (value.url.startsWith("http://") && !/^http:\/\/(localhost|127\.0\.0\.1|\[::1\])/.test(value.url)) {
            problems.push(`${where}: "url" must be https unless it is loopback`);
        }
    } else {
        problems.push(`${where}: "type" must be stdio, streamable-http, or sse`);
    }
    return problems;
}

/** Reads and validates mcp.json; returns null when the plugin has none. */
export async function loadMcp(root: string): Promise<McpConfig | null> {
    const path = `${root}/mcp.json`;
    if (!(await exists(path))) return null;
    const value = await readJson(path);
    const problems: string[] = [];
    if (!isRecord(value)) problems.push("mcp.json must be a JSON object");
    else {
        for (const key of Object.keys(value)) {
            if (!["$schema", "mcpServers"].includes(key)) problems.push(`mcp.json has the unknown field "${key}"`);
        }
        if (value.$schema !== MCP_SCHEMA) problems.push(`mcp.json "$schema" must be "${MCP_SCHEMA}"`);
        if (!isRecord(value.mcpServers)) problems.push('mcp.json "mcpServers" must be an object');
        else {for (const [name, server] of Object.entries(value.mcpServers)) {
                problems.push(...serverProblems(name, server));
            }}
    }
    if (problems.length > 0) throw new Error(problems.map((p) => `- ${p}`).join("\n"));
    return { mcpServers: (value as { mcpServers: Record<string, Server> }).mcpServers };
}

const substitute = (text: string, placeholder: string) => text.replaceAll(PLACEHOLDER, placeholder);
const substituteAll = (values: Record<string, string> | undefined, placeholder: string) =>
    values === undefined
        ? undefined
        : Object.fromEntries(Object.entries(values).map(([k, v]) => [k, substitute(v, placeholder)]));

/** Claude Code's .mcp.json: stdio servers drop the type field; remote ones keep it. */
export function claudeMcp(config: McpConfig): Record<string, unknown> {
    const servers: Record<string, unknown> = {};
    for (const [name, server] of Object.entries(config.mcpServers)) {
        if (server.type === "stdio") {
            servers[name] = {
                command: server.command,
                ...(server.args ? { args: server.args.map((a) => substitute(a, CLAUDE_PLACEHOLDER)) } : {}),
                ...(server.env ? { env: substituteAll(server.env, CLAUDE_PLACEHOLDER) } : {}),
            };
        } else {
            servers[name] = {
                type: server.type === "sse" ? "sse" : "http",
                url: server.url,
                ...(server.headers ? { headers: server.headers } : {}),
            };
        }
    }
    return { mcpServers: servers };
}

/** Antigravity's mcp_config.json: stdio as command/args/env/cwd, streamable HTTP as serverUrl; SSE cannot be expressed. */
export function antigravityMcp(config: McpConfig): Record<string, unknown> {
    const servers: Record<string, unknown> = {};
    for (const [name, server] of Object.entries(config.mcpServers)) {
        if (server.type === "stdio") {
            servers[name] = {
                command: server.command,
                ...(server.args ? { args: server.args.map((a) => substitute(a, ANTIGRAVITY_PLACEHOLDER)) } : {}),
                ...(server.env ? { env: substituteAll(server.env, ANTIGRAVITY_PLACEHOLDER) } : {}),
                ...(server.cwd ? { cwd: substitute(server.cwd, ANTIGRAVITY_PLACEHOLDER) } : {}),
            };
        } else if (server.type === "streamable-http") {
            servers[name] = { serverUrl: server.url, ...(server.headers ? { headers: server.headers } : {}) };
        } else {
            throw new Error(
                `mcp.json server ${JSON.stringify(name)} uses type "sse", which Antigravity does not support ` +
                    "(streamable HTTP only); change the server type or drop the Antigravity integration",
            );
        }
    }
    return { mcpServers: servers };
}
