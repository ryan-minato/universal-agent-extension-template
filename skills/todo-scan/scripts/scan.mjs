#!/usr/bin/env node
// The skill's entry point: a thin wrapper so the SKILL.md command stays short and the scanner
// lives in one place (lib/todo-scan.mjs). Same arguments as the library's CLI.
import { formatReport, parseArgs, scanDirectory, summarize } from "../../../lib/todo-scan.mjs";

let options;
try {
    options = parseArgs(process.argv.slice(2));
} catch (error) {
    console.error(`error: ${error.message}`);
    console.error("usage: scan.mjs [root] [--json] [--unowned-only] [--exclude <dir>]...");
    process.exit(2);
}
const entries = scanDirectory(options.root, { excludes: options.excludes });
if (options.json) {
    const shown = options.unownedOnly ? entries.filter((e) => e.owner === null) : entries;
    console.log(JSON.stringify({ summary: summarize(entries), entries: shown }, null, 2));
} else {
    console.log(formatReport(entries, { unownedOnly: options.unownedOnly }));
}
