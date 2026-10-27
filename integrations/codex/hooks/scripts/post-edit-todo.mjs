#!/usr/bin/env node
// Codex PostToolUse hook: remind the agent when a file it just wrote holds TODO/FIXME markers without
// an owner, and point it at the plugin's tools. Codex's hook contract mirrors Claude Code's (JSON
// event on stdin, JSON on stdout, exit 0). Codex's own editing tool is apply_patch, whose
// tool_input.command is the patch text, so the file paths are read from its "*** Add File:" and
// "*** Update File:" lines (relative to the event's cwd); file_path, path, and files are read for
// clients that use Claude-style inputs. The reminder goes out twice: as
// hookSpecificOutput.additionalContext, which Codex adds to the model's context, and as a
// systemMessage, which the UI shows as a warning (learn.chatgpt.com/docs/hooks, 2026-10-26).
//
// The detection is minimal and self-contained (one regex for the format in
// skills/todo-scan/references/todo-format.md); the authoritative scan is the MCP server's
// list_todos / scan_file. Each framework's hook carries its own copy of this check
// (.agents/knowledge/architecture.md, Component roles).
import { readFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";

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
        "tool scan_file on this file to confirm, or the $todo-triage skill to decide what each one needs.";
}

/** The files an apply_patch command adds or updates (a "*** Delete File" line has nothing left to scan). */
export function patchFiles(command) {
    if (typeof command !== "string") return [];
    return [...command.matchAll(/^\*\*\* (?:Add|Update) File: (.+)$/gm)].map((match) => match[1].trim());
}

/** The file paths a tool input names: the apply_patch command's files, then the Claude-style fields. */
export function filesOf(input, cwd = process.cwd()) {
    const candidates = [
        ...patchFiles(input?.command),
        input?.file_path,
        input?.path,
        ...(Array.isArray(input?.files) ? input.files : []),
    ];
    return candidates.filter((value) => typeof value === "string").map((file) =>
        isAbsolute(file) ? file : resolve(cwd, file)
    );
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
    const cwd = typeof event?.cwd === "string" ? event.cwd : process.cwd();
    const reminders = filesOf(event?.tool_input, cwd).map((file) => reminderFor(file)).filter((text) => text !== null);
    if (reminders.length > 0) {
        const text = reminders.join("\n\n");
        process.stdout.write(
            JSON.stringify({
                systemMessage: text,
                hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: text },
            }) + "\n",
        );
    }
}
