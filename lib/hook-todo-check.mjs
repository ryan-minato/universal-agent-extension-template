// Shared body of the PostToolUse hooks under integrations/*/hooks/scripts/: given the path of a
// file an agent just wrote or edited, report the unowned TODO/FIXME markers it now holds. Each
// framework's hook script reads its own stdin shape and writes its own output shape; this module
// only decides what to say. Zero dependencies; ships with the plugin.

import { readFileSync } from "node:fs";
import { scanText } from "./todo-scan.mjs";

/**
 * The reminder for one file, or null when the file has no unowned marker or cannot be read as text.
 * @param {string} file absolute or workspace-relative path
 */
export function unownedReminder(file) {
    let content;
    try {
        content = readFileSync(file, "utf8");
    } catch {
        return null;
    }
    const unowned = scanText(file, content).filter((entry) => entry.owner === null);
    if (unowned.length === 0) return null;
    const lines = unowned.slice(0, 10).map((entry) => `  line ${entry.line}: ${entry.kind}: ${entry.text}`);
    return `${file} has ${unowned.length} unowned TODO/FIXME marker(s). Write them as TODO(<owner>): <text> or ` +
        `TODO(<owner>, #<issue>): <text>, or remove them before finishing:\n${lines.join("\n")}`;
}

/** Reads all of stdin as one JSON document; returns null on empty or invalid input. */
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
