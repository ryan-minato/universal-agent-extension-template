#!/usr/bin/env node
// Antigravity PostToolUse hook: report TODO/FIXME markers without an owner in a file the agent just
// wrote. Antigravity's PostToolUse contract returns an empty JSON object and injects nothing into the
// conversation, so the reminder goes to standard error, where the hook log shows it. The file path
// is read from toolCall.args; several field names are tried because the per-tool argument names are
// not documented (.agents/knowledge/frameworks.md, Antigravity, verification items).
//
// The detection is minimal and self-contained (one regex for the format in
// skills/todo-scan/references/todo-format.md); the authoritative scan is the MCP server's
// list_todos / scan_file. Each framework's hook carries its own copy of this check
// (.agents/knowledge/architecture.md, Component roles).
import { readFileSync } from "node:fs";

/** Line numbers of unowned markers: TODO or FIXME followed by a colon with no parenthesized owner. */
export function unownedLines(content) {
    const lines = [];
    content.split(/\r?\n/).forEach((line, index) => {
        if (/\b(TODO|FIXME)\s*:/.test(line)) lines.push(index + 1);
    });
    return lines;
}

/** The reminder for one file, or null when it has no unowned marker or cannot be read as text. */
export function reminderFor(file, read = (path) => readFileSync(path, "utf8")) {
    let content;
    try {
        content = read(file);
    } catch {
        return null;
    }
    const lines = unownedLines(content);
    if (lines.length === 0) return null;
    return `${file} has ${lines.length} TODO/FIXME marker(s) without an owner (line ${lines.join(", ")}). ` +
        "Write TODO(<owner>): <text> or TODO(<owner>, #<issue>): <text>, or remove them; run the todo-tracker " +
        "tool scan_file on this file to confirm, or the todo-triage skill to decide what each one needs.";
}

/** The file paths a tool call names, in the argument fields Antigravity's file tools are expected to use. */
export function filesOf(args) {
    return [args?.TargetFile, args?.targetFile, args?.target_file, args?.file_path, args?.path, args?.AbsolutePath]
        .filter((value) => typeof value === "string");
}

export async function readJsonStdin(stream = process.stdin) {
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const text = Buffer.concat(chunks).toString("utf8").trim();
    if (text === "") return null;
    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
    const event = await readJsonStdin();
    for (const file of filesOf(event?.toolCall?.args)) {
        const reminder = reminderFor(file);
        if (reminder) console.error(reminder);
    }
    process.stdout.write("{}\n");
}
