#!/usr/bin/env -S deno run --allow-read --allow-run --allow-env=PATH,HOME
// Installation smoke tests, one framework at a time. CI runs none of them: they need the
// framework's CLI and usually a login. Where the CLI is on PATH the script runs what can run
// without a session and prints the manual steps that remain; where it is not, it prints the manual
// steps and exits 2 so a caller can tell "not checked" from "checked and failed"
// (.agents/knowledge/frameworks.md, Verification items).
//
//   scripts/test/smoke.ts claude-code|codex|antigravity|pi
import { ROOT } from "../lib/repo.ts";

const STEPS: Record<string, { cli: string; auto: string[][]; manual: string[] }> = {
    "claude-code": {
        cli: "claude",
        auto: [
            ["claude", "plugin", "validate", ROOT, "--strict"],
            ["claude", "--plugin-dir", ROOT, "plugin", "details", "todo-tracker"],
        ],
        manual: [
            `claude --plugin-dir ${ROOT}  # then: /help shows todo-tracker:todos; /todos runs the scan; /agents must list todo-tracker:todo-triager`,
            "In the session, edit a file to add an unowned marker; the PostToolUse hook reminder must appear.",
            "Check /mcp lists the todo-tracker server and list_todos works.",
            `claude --plugin-dir ${ROOT} --debug=hooks,mcp  # when a hook or the server stays silent: the debug log names the failing command`,
        ],
    },
    codex: {
        cli: "codex",
        auto: [],
        manual: [
            `codex plugin marketplace add ${ROOT} && codex plugin add todo-tracker@todo-tracker && codex mcp list  # the server appears with its resolved path`,
            "New session: the skills todo-tracker:todo-scan and todo-tracker:todo-triage must be offered; list_todos must answer with root set to the project.",
            `node ${ROOT}/integrations/codex/scripts/install-agents.mjs --scope project --dry-run  # then without --dry-run; ask for the todo-triager subagent`,
            "Hooks: codex-cli 0.164.0 discovers none for a package with a root plugin.json (frameworks.md, Codex). On a newer version: /hooks must list the todo-tracker hook; trust it, edit a file to add an unowned marker, and the PostToolUse reminder must appear.",
        ],
    },
    antigravity: {
        cli: "agy",
        auto: [["agy", "plugin", "validate", ROOT, "--strict"]],
        manual: [
            `agy plugin install ${ROOT}  # or copy this directory to .agents/plugins/todo-tracker/`,
            "Check the skills /todo-tracker:todo-scan and /todo-tracker:todo-triage, the todo-triager subagent, the todo-style rule on a matching file, and list_todos through MCP.",
            "Verification items to record in .agents/knowledge/frameworks.md: whether ${extensionPath} resolved in mcp_config.json; whether the hook's ./ path resolved; what tools the shared agent received.",
        ],
    },
    pi: {
        cli: "pi",
        auto: [],
        manual: [
            `pi install ${ROOT}  # local package; or pi install git:github.com/ryan-minato/universal-agent-extension-template`,
            "New session: /todos runs the scan; the list_todos tool and the todo-tracker MCP server are registered; /skill:todo-scan loads.",
        ],
    },
};

const framework = Deno.args[0];
const plan = framework ? STEPS[framework] : undefined;
if (!plan) {
    console.error(`usage: smoke.ts ${Object.keys(STEPS).join("|")}`);
    Deno.exit(2);
}
/** Whether an executable of that name sits in one of the PATH directories. */
async function onPath(cli: string): Promise<boolean> {
    for (const dir of (Deno.env.get("PATH") ?? "").split(":").filter(Boolean)) {
        try {
            if ((await Deno.stat(`${dir}/${cli}`)).isFile) return true;
        } catch {
            // not in this directory
        }
    }
    return false;
}

if (!(await onPath(plan.cli))) {
    console.log(`${plan.cli} is not on PATH; this smoke test was NOT run. Manual steps on a machine that has it:`);
    for (const step of plan.manual) console.log(`  - ${step}`);
    Deno.exit(2);
}
let failed = false;
for (const command of plan.auto) {
    console.log(`$ ${command.join(" ")}`);
    const output = await new Deno.Command(command[0], { args: command.slice(1) }).output();
    if (!output.success) failed = true;
}
console.log("Manual steps that remain:");
for (const step of plan.manual) console.log(`  - ${step}`);
Deno.exit(failed ? 1 : 0);
