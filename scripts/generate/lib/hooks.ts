// Hooks are written once per framework under integrations/<fw>/hooks/ and never translated. The
// generator only validates each file's shape and copies Antigravity's to the root hooks.json that
// Antigravity scans; Claude Code reaches its file through the manifest, Codex through
// plugin.json extensions["com.openai"].hooks.
import { exists, isRecord, readJson } from "../../lib/repo.ts";

/** Hook events Claude Code documents; Codex supports a subset with the same names. */
export const CLAUDE_STYLE_EVENTS = new Set([
    "Setup",
    "SessionStart",
    "SessionEnd",
    "UserPromptSubmit",
    "UserPromptExpansion",
    "Stop",
    "StopFailure",
    "PreToolUse",
    "PermissionRequest",
    "PermissionDenied",
    "PostToolUse",
    "PostToolUseFailure",
    "PostToolBatch",
    "SubagentStart",
    "SubagentStop",
    "TaskCreated",
    "TaskCompleted",
    "TeammateIdle",
    "Notification",
    "MessageDisplay",
    "InstructionsLoaded",
    "ConfigChange",
    "CwdChanged",
    "DirectoryAdded",
    "FileChanged",
    "WorktreeCreate",
    "WorktreeRemove",
    "PreCompact",
    "PostCompact",
    "PreModelSwitch",
    "PostModelSwitch",
    "Elicitation",
    "ElicitationResult",
    "Interrupt",
]);
export const CODEX_EVENTS = new Set([
    "SessionStart",
    "SessionEnd",
    "PreToolUse",
    "PermissionRequest",
    "PostToolUse",
    "PreCompact",
    "PostCompact",
    "UserPromptSubmit",
    "SubagentStart",
    "SubagentStop",
    "Stop",
    "Interrupt",
]);
export const ANTIGRAVITY_EVENTS = new Set([
    "SessionStart",
    "PreToolUse",
    "PostToolUse",
    "PreInvocation",
    "PostInvocation",
    "Stop",
]);
const ANTIGRAVITY_TOOL_EVENTS = new Set(["PreToolUse", "PostToolUse"]);

function handlerProblems(where: string, handler: unknown, framework: string): string[] {
    if (!isRecord(handler)) return [`${where}: a handler must be an object`];
    const problems: string[] = [];
    if (handler.type !== undefined && handler.type !== "command") {
        problems.push(
            `${where}: this template only writes "command" handlers; found type ${JSON.stringify(handler.type)}`,
        );
    }
    if (typeof handler.command !== "string" || handler.command.trim() === "") {
        problems.push(`${where}: "command" must be a non-empty string`);
    }
    if (framework === "claude-code" && handler.args !== undefined && !Array.isArray(handler.args)) {
        problems.push(`${where}: "args" must be an array`);
    }
    if (handler.timeout !== undefined && typeof handler.timeout !== "number") {
        problems.push(`${where}: "timeout" must be a number of seconds`);
    }
    return problems;
}

function matcherGroupProblems(where: string, group: unknown, framework: string): string[] {
    if (!isRecord(group)) return [`${where}: each entry must be an object with "matcher" and "hooks"`];
    const problems: string[] = [];
    if (group.matcher !== undefined && typeof group.matcher !== "string") {
        problems.push(`${where}: "matcher" must be a string`);
    }
    if (!Array.isArray(group.hooks) || group.hooks.length === 0) {
        problems.push(`${where}: "hooks" must be a non-empty array of handlers`);
    } else group.hooks.forEach((h, i) => problems.push(...handlerProblems(`${where}.hooks[${i}]`, h, framework)));
    return problems;
}

/** Validates a Claude Code or Codex hooks file: `{"hooks": {<Event>: [{matcher, hooks: [...]}]}}`. */
export function claudeStyleHookProblems(path: string, value: unknown, framework: "claude-code" | "codex"): string[] {
    if (!isRecord(value) || !isRecord(value.hooks)) return [`${path} must be {"hooks": {<Event>: [...]}}`];
    const problems: string[] = [];
    for (const key of Object.keys(value)) {
        if (key !== "hooks") problems.push(`${path} has the unknown top-level field "${key}"`);
    }
    const events = framework === "codex" ? CODEX_EVENTS : CLAUDE_STYLE_EVENTS;
    for (const [event, groups] of Object.entries(value.hooks)) {
        if (!events.has(event)) problems.push(`${path}: "${event}" is not a ${framework} hook event`);
        if (!Array.isArray(groups)) {
            problems.push(`${path}: hooks.${event} must be an array`);
            continue;
        }
        groups.forEach((g, i) => problems.push(...matcherGroupProblems(`${path} hooks.${event}[${i}]`, g, framework)));
    }
    return problems;
}

/** Validates an Antigravity hooks file: `{"<hook name>": {"enabled"?: bool, <Event>: [...]}}`. */
export function antigravityHookProblems(path: string, value: unknown): string[] {
    if (!isRecord(value)) return [`${path} must be an object of named hooks`];
    const problems: string[] = [];
    if ("hooks" in value) {
        problems.push(
            `${path} has a top-level "hooks" key; Antigravity would load it as a hook named "hooks" (use named hooks)`,
        );
    }
    for (const [name, hook] of Object.entries(value)) {
        if (!isRecord(hook)) {
            problems.push(`${path}: hook ${JSON.stringify(name)} must be an object of events`);
            continue;
        }
        for (const [event, groups] of Object.entries(hook)) {
            if (event === "enabled") {
                if (typeof groups !== "boolean") problems.push(`${path}: ${name}.enabled must be a boolean`);
                continue;
            }
            if (!ANTIGRAVITY_EVENTS.has(event)) problems.push(`${path}: "${event}" is not an Antigravity hook event`);
            if (!Array.isArray(groups)) {
                problems.push(`${path}: ${name}.${event} must be an array`);
                continue;
            }
            groups.forEach((g, i) => {
                const where = `${path} ${name}.${event}[${i}]`;
                if (ANTIGRAVITY_TOOL_EVENTS.has(event)) problems.push(...matcherGroupProblems(where, g, "antigravity"));
                else problems.push(...handlerProblems(where, g, "antigravity"));
            });
        }
    }
    return problems;
}

/** The hooks file of a framework, validated; null when the integration has none. */
export async function loadHooks(root: string, framework: "claude-code" | "codex" | "antigravity"): Promise<unknown> {
    const path = `integrations/${framework}/hooks/hooks.json`;
    if (!(await exists(`${root}/${path}`))) return null;
    const value = await readJson(`${root}/${path}`);
    const problems = framework === "antigravity"
        ? antigravityHookProblems(path, value)
        : claudeStyleHookProblems(path, value, framework);
    if (problems.length > 0) throw new Error(problems.map((p) => `- ${p}`).join("\n"));
    return value;
}
