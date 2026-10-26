#!/usr/bin/env node
// Codex PostToolUse hook: remind the agent about unowned TODO/FIXME markers in a file it just
// wrote. Codex's hook contract mirrors Claude Code's (JSON event on stdin, JSON on stdout, exit 0),
// so the file path is read from tool_input.file_path when present and from tool_input.path as a
// fallback; a patch with several files is reported per file.
import { readJsonStdin, unownedReminder } from "../../../../lib/hook-todo-check.mjs";

const event = await readJsonStdin();
const input = event?.tool_input ?? {};
const candidates = [input.file_path, input.path, ...(Array.isArray(input.files) ? input.files : [])]
    .filter((value) => typeof value === "string");
const reminders = candidates.map(unownedReminder).filter((text) => text !== null);
if (reminders.length > 0) {
    process.stdout.write(JSON.stringify({ systemMessage: reminders.join("\n\n") }) + "\n");
}
