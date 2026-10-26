#!/usr/bin/env node
// Claude Code PostToolUse hook: after Write/Edit/MultiEdit, remind the agent about unowned
// TODO/FIXME markers in the edited file. Input is the hook event on stdin (tool_input.file_path);
// output is one JSON object with hookSpecificOutput.additionalContext. Never blocks: PostToolUse
// cannot, and a reminder is all the plugin wants.
import { readJsonStdin, unownedReminder } from "../../../../lib/hook-todo-check.mjs";

const event = await readJsonStdin();
const file = event?.tool_input?.file_path;
const reminder = typeof file === "string" ? unownedReminder(file) : null;
if (reminder) {
    process.stdout.write(
        JSON.stringify({ hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: reminder } }) + "\n",
    );
}
