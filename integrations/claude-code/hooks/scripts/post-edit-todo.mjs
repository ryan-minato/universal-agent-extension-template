#!/usr/bin/env node
// Claude Code PostToolUse hook: after Write/Edit/MultiEdit, remind the agent when the edited file
// now holds TODO/FIXME markers without an owner, and point it at the plugin's tools. Input is the
// hook event on stdin (tool_input.file_path); output is one JSON object with
// hookSpecificOutput.additionalContext. It never blocks: PostToolUse cannot, and a reminder is all
// the plugin wants.
//
// The detection here is deliberately minimal and self-contained (one regex for the marker format in
// skills/todo-scan/references/todo-format.md): the hook decides whether to speak; the authoritative
// scan is the MCP server's list_todos / scan_file. The three frameworks' hooks each carry their own
// copy of this check rather than sharing a module (.agents/knowledge/architecture.md, Component roles).
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
    const file = event?.tool_input?.file_path;
    const reminder = typeof file === "string" ? reminderFor(file) : null;
    if (reminder) {
        process.stdout.write(
            JSON.stringify({ hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: reminder } }) +
                "\n",
        );
    }
}
