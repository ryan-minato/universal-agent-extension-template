#!/usr/bin/env node
// Scans a directory tree for TODO and FIXME markers and reports them in the plugin's TODO format
// (skills/todo-scan/references/todo-format.md):
//
//   TODO(<owner>): <text>            an owned marker
//   TODO(<owner>, #<issue>): <text>  an owned marker linked to an issue
//   a marker with no parentheses     an unowned marker, the thing this plugin exists to surface
//
// Zero dependencies: this file ships inside the plugin and runs on the consumer's Node (>= 20).
// Used by skills/todo-scan/scripts/scan.mjs, lib/mcp-server.mjs, the hook scripts under
// integrations/*/hooks/scripts/, and integrations/pi/extensions/index.ts.
//
//   node lib/todo-scan.mjs [root] [--json] [--unowned-only] [--exclude <dir>]...

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

/** Directories never scanned: VCS data, dependency trees, and build or site output. */
export const DEFAULT_EXCLUDES = [".git", "node_modules", "site", "dist", "build", "coverage", ".cache"];

/** Files larger than this are skipped; a marker in a generated bundle is noise. */
export const MAX_FILE_BYTES = 1_000_000;

const MARKER = /\b(TODO|FIXME)\b(?:\(([^)]*)\))?\s*:\s*(.*)$/;

/**
 * Parses one line. Returns null when the line carries no marker.
 * @param {string} line
 * @returns {{kind: "TODO" | "FIXME", owner: string | null, issue: number | null, text: string} | null}
 */
export function parseLine(line) {
    const match = MARKER.exec(line);
    if (!match) return null;
    const [, kind, inside, text] = match;
    let owner = null;
    let issue = null;
    if (inside !== undefined) {
        for (const part of inside.split(",").map((p) => p.trim()).filter(Boolean)) {
            const ref = /^#(\d+)$/.exec(part);
            if (ref) issue = Number(ref[1]);
            else if (owner === null) owner = part;
        }
    }
    return { kind: /** @type {"TODO" | "FIXME"} */ (kind), owner, issue, text: text.trim() };
}

/**
 * Scans the text of one file.
 * @param {string} file path reported in the entries
 * @param {string} content
 */
export function scanText(file, content) {
    const entries = [];
    const lines = content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
        const parsed = parseLine(lines[i]);
        if (parsed) entries.push({ file, line: i + 1, ...parsed });
    }
    return entries;
}

function isBinary(buffer) {
    const head = buffer.subarray(0, 8192);
    return head.includes(0);
}

/**
 * Walks `root` and scans every text file. Paths in the result are relative to `root` with `/` separators.
 * @param {string} root
 * @param {{excludes?: string[]}} [options]
 */
export function scanDirectory(root, options = {}) {
    const excludes = new Set(options.excludes ?? DEFAULT_EXCLUDES);
    const entries = [];
    const stack = [root];
    while (stack.length > 0) {
        const dir = stack.pop();
        for (const name of readdirSync(dir).sort()) {
            const full = join(dir, name);
            const stat = statSync(full);
            if (stat.isDirectory()) {
                if (!excludes.has(name)) stack.push(full);
                continue;
            }
            if (!stat.isFile() || stat.size > MAX_FILE_BYTES) continue;
            const buffer = readFileSync(full);
            if (isBinary(buffer)) continue;
            const rel = relative(root, full).split(sep).join("/");
            entries.push(...scanText(rel, buffer.toString("utf8")));
        }
    }
    return entries;
}

/**
 * Counts by kind, by owner, and the unowned total.
 * @param {ReturnType<typeof scanText>} entries
 */
export function summarize(entries) {
    const byKind = { todo: 0, fixme: 0 };
    const byOwner = {};
    let unowned = 0;
    let linked = 0;
    for (const entry of entries) {
        byKind[entry.kind.toLowerCase()]++;
        if (entry.owner === null) unowned++;
        else byOwner[entry.owner] = (byOwner[entry.owner] ?? 0) + 1;
        if (entry.issue !== null) linked++;
    }
    return { total: entries.length, byKind, byOwner, unowned, linked };
}

/**
 * The text an agent reads: a one-line verdict first, then the entries that need attention.
 * @param {ReturnType<typeof scanText>} entries
 * @param {{unownedOnly?: boolean, limit?: number}} [options]
 */
export function formatReport(entries, options = {}) {
    const summary = summarize(entries);
    const shown = (options.unownedOnly ? entries.filter((e) => e.owner === null) : entries).slice(
        0,
        options.limit ?? 200,
    );
    const lines = [
        `${summary.total} marker(s): ${summary.byKind.todo} TODO, ${summary.byKind.fixme} FIXME; ` +
        `${summary.unowned} unowned, ${summary.linked} linked to an issue.`,
    ];
    for (const entry of shown) {
        const who = entry.owner === null ? "unowned" : entry.owner;
        const ref = entry.issue === null ? "" : ` #${entry.issue}`;
        lines.push(`${entry.file}:${entry.line}  ${entry.kind}(${who}${ref}) ${entry.text}`);
    }
    if (shown.length < (options.unownedOnly ? summary.unowned : summary.total)) {
        lines.push(`... ${(options.unownedOnly ? summary.unowned : summary.total) - shown.length} more not shown`);
    }
    return lines.join("\n");
}

/** Parses the CLI arguments; exported so the unit tests cover it. */
export function parseArgs(argv) {
    const options = { root: process.cwd(), json: false, unownedOnly: false, excludes: [...DEFAULT_EXCLUDES] };
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === "--json") options.json = true;
        else if (arg === "--unowned-only") options.unownedOnly = true;
        else if (arg === "--exclude") {
            const value = argv[++i];
            if (value === undefined) throw new Error("--exclude needs a directory name");
            options.excludes.push(value);
        } else if (arg.startsWith("--")) throw new Error(`unknown option ${arg}`);
        else options.root = arg;
    }
    return options;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
    let options;
    try {
        options = parseArgs(process.argv.slice(2));
    } catch (error) {
        console.error(`error: ${error.message}`);
        console.error("usage: node lib/todo-scan.mjs [root] [--json] [--unowned-only] [--exclude <dir>]...");
        process.exit(2);
    }
    const entries = scanDirectory(options.root, { excludes: options.excludes });
    if (options.json) {
        const shown = options.unownedOnly ? entries.filter((e) => e.owner === null) : entries;
        console.log(JSON.stringify({ summary: summarize(entries), entries: shown }, null, 2));
    } else {
        console.log(formatReport(entries, { unownedOnly: options.unownedOnly }));
    }
}
