#!/usr/bin/env node
// Antigravity PostToolUse hook: report unowned TODO/FIXME markers in a file the agent just wrote.
// Antigravity's PostToolUse contract returns an empty JSON object and injects nothing back into the
// conversation, so the reminder goes to stderr, where the hook log shows it. The file path is read
// from toolCall.args (several field names are tried because the per-tool argument names are not
// documented; see .agents/knowledge/frameworks.md, Antigravity, verification items).
import { readJsonStdin, unownedReminder } from "../../../../lib/hook-todo-check.mjs";

const event = await readJsonStdin();
const args = event?.toolCall?.args ?? {};
const candidates = [args.TargetFile, args.targetFile, args.target_file, args.file_path, args.path, args.AbsolutePath]
    .filter((value) => typeof value === "string");
for (const file of candidates) {
    const reminder = unownedReminder(file);
    if (reminder) console.error(reminder);
}
process.stdout.write("{}\n");
