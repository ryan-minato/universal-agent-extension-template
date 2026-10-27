#!/usr/bin/env node
// The todo-triage skill's own script: applies triage decisions to the files they name. It serves
// this skill only and imports nothing outside the skill directory (a skill is distributed on its
// own; .agents/knowledge/architecture.md, Component roles). Scanning is not its job: the decisions
// come from the todo-tracker MCP tools and the classification step.
//
//   node apply-decisions.mjs decisions.json [--dry-run]
//
// decisions.json: [{ "file": "src/a.js", "line": 12, "action": "assign", "owner": "alice" },
//                  { "file": "src/a.js", "line": 20, "action": "link", "issue": 42 },
//                  { "file": "src/b.js", "line": 3, "action": "delete" }]
// Lines are 1-based. A decision whose line holds no TODO/FIXME marker is refused, and nothing is
// written when any decision is refused.
import { readFileSync, writeFileSync } from "node:fs";

const MARKER = /\b(TODO|FIXME)\b(\(([^)]*)\))?(\s*:)/;

/** Returns the rewritten line, or null when the line must be deleted; throws when the line has no marker. */
export function applyToLine(line, decision) {
    const match = MARKER.exec(line);
    if (!match) throw new Error(`${decision.file}:${decision.line} holds no TODO/FIXME marker`);
    const inside = (match[3] ?? "").split(",").map((p) => p.trim()).filter(Boolean);
    const issue = inside.find((p) => /^#\d+$/.test(p));
    const owner = inside.find((p) => !/^#\d+$/.test(p));
    let parts;
    switch (decision.action) {
        case "assign":
            if (typeof decision.owner !== "string" || decision.owner === "") {
                throw new Error(`${decision.file}:${decision.line}: assign needs an owner`);
            }
            parts = [decision.owner, ...(issue ? [issue] : [])];
            break;
        case "link":
            if (!Number.isInteger(decision.issue)) {
                throw new Error(`${decision.file}:${decision.line}: link needs an integer issue`);
            }
            parts = [...(owner ? [owner] : []), `#${decision.issue}`];
            break;
        case "delete":
            return null;
        default:
            throw new Error(`${decision.file}:${decision.line}: unknown action ${JSON.stringify(decision.action)}`);
    }
    return line.replace(MARKER, `$1(${parts.join(", ")})$4`);
}

/** Plans every edit, grouped by file; throws before any write when a decision is invalid. */
export function plan(decisions, read = (path) => readFileSync(path, "utf8")) {
    const byFile = new Map();
    for (const decision of decisions) {
        if (!byFile.has(decision.file)) byFile.set(decision.file, []);
        byFile.get(decision.file).push(decision);
    }
    const edits = [];
    for (const [file, list] of byFile) {
        const lines = read(file).split("\n");
        const changes = [];
        for (const decision of list) {
            const index = decision.line - 1;
            if (!Number.isInteger(index) || index < 0 || index >= lines.length) {
                throw new Error(`${file}:${decision.line} is out of range`);
            }
            changes.push({ line: decision.line, before: lines[index], after: applyToLine(lines[index], decision) });
        }
        // Rewrite assigned and linked lines in place, then drop the deleted ones.
        const rewritten = lines.map((line, i) => {
            const change = changes.find((c) => c.line === i + 1);
            return change ? change.after : line;
        }).filter((line) => line !== null);
        edits.push({ file, changes, content: rewritten.join("\n") });
    }
    return edits;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
    const [input, flag] = process.argv.slice(2);
    if (!input) {
        console.error("usage: apply-decisions.mjs decisions.json [--dry-run]");
        process.exit(2);
    }
    let edits;
    try {
        const decisions = JSON.parse(readFileSync(input, "utf8"));
        if (!Array.isArray(decisions)) throw new Error("decisions.json must be an array");
        edits = plan(decisions);
    } catch (error) {
        console.error(`error: ${error.message}; nothing was written`);
        process.exit(1);
    }
    for (const edit of edits) {
        for (const change of edit.changes) {
            console.log(
                `${edit.file}:${change.line}  ${change.after === null ? "delete" : "rewrite"}: ${change.before.trim()}`,
            );
            if (change.after !== null) {
                console.log(
                    `${" ".repeat(edit.file.length + String(change.line).length + 2)}-> ${change.after.trim()}`,
                );
            }
        }
        if (flag !== "--dry-run") writeFileSync(edit.file, edit.content);
    }
    console.log(flag === "--dry-run" ? "dry run: nothing written" : `${edits.length} file(s) written`);
}
