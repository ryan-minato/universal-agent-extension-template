#!/usr/bin/env node
// Installs the generated Codex agent definitions (.codex/agents/*.toml in this plugin) into a
// place Codex actually reads, because a Codex plugin does not register agents on its own
// (.agents/knowledge/frameworks.md, Codex). Zero dependencies; runs with the consumer's Node.
//
//   node integrations/codex/scripts/install-agents.mjs --scope user      -> ~/.codex/agents/
//   node integrations/codex/scripts/install-agents.mjs --scope project   -> ./.codex/agents/ of the cwd
//   add --uninstall to remove what this script installed, --dry-run to print without writing
//
// Conflict rule: a target file is written only when it does not exist or carries this plugin's
// generated-file marker; a hand-written file with the same name is never overwritten. Uninstall
// removes only marked files.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const MARKER = "# generated-by: todo-tracker";

export function parseArgs(argv) {
    const options = { scope: null, uninstall: false, dryRun: false };
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === "--scope") {
            const value = argv[++i];
            if (value !== "user" && value !== "project") throw new Error("--scope must be user or project");
            options.scope = value;
        } else if (arg === "--uninstall") options.uninstall = true;
        else if (arg === "--dry-run") options.dryRun = true;
        else throw new Error(`unknown option ${arg}`);
    }
    if (options.scope === null) throw new Error("--scope user|project is required");
    return options;
}

export function targetDirectory(scope, cwd = process.cwd(), home = homedir()) {
    return scope === "user" ? join(home, ".codex", "agents") : join(cwd, ".codex", "agents");
}

/** Plans the writes or removals; returns the list of actions so a dry run and the tests can print them. */
export function plan(sourceDir, targetDir, uninstall) {
    const actions = [];
    for (const name of readdirSync(sourceDir).filter((n) => n.endsWith(".toml")).sort()) {
        const source = join(sourceDir, name);
        const target = join(targetDir, name);
        const content = readFileSync(source, "utf8");
        if (!content.includes(MARKER)) {
            throw new Error(`${source} lacks the marker "${MARKER}"; regenerate it with just generate`);
        }
        const existing = existsSync(target) ? readFileSync(target, "utf8") : null;
        if (uninstall) {
            if (existing === null) actions.push({ kind: "skip", target, reason: "not installed" });
            else if (!existing.includes(MARKER)) {
                actions.push({ kind: "skip", target, reason: "not written by this plugin" });
            } else actions.push({ kind: "remove", target });
        } else if (existing === null) actions.push({ kind: "write", target, content });
        else if (!existing.includes(MARKER)) {
            actions.push({ kind: "skip", target, reason: "exists and was not written by this plugin" });
        } else if (existing === content) actions.push({ kind: "skip", target, reason: "up to date" });
        else actions.push({ kind: "write", target, content, reason: "update" });
    }
    return actions;
}

export function apply(actions, dryRun) {
    for (const action of actions) {
        const prefix = dryRun ? "would " : "";
        if (action.kind === "skip") console.log(`skip   ${action.target} (${action.reason})`);
        else if (action.kind === "remove") {
            console.log(`${prefix}remove ${action.target}`);
            if (!dryRun) rmSync(action.target);
        } else {
            console.log(`${prefix}write  ${action.target}${action.reason ? ` (${action.reason})` : ""}`);
            if (!dryRun) {
                mkdirSync(dirname(action.target), { recursive: true });
                writeFileSync(action.target, action.content);
            }
        }
    }
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
    let options;
    try {
        options = parseArgs(process.argv.slice(2));
    } catch (error) {
        console.error(`error: ${error.message}`);
        console.error("usage: install-agents.mjs --scope user|project [--uninstall] [--dry-run]");
        process.exit(2);
    }
    const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
    const sourceDir = join(pluginRoot, ".codex", "agents");
    if (!existsSync(sourceDir)) {
        console.error(`error: ${sourceDir} does not exist; run just generate in the plugin repository first`);
        process.exit(1);
    }
    apply(plan(sourceDir, targetDirectory(options.scope), options.uninstall), options.dryRun);
}
