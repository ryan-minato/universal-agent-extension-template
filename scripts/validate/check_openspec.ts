#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run=openspec --allow-env=OPENSPEC_NO_UPDATE_CHECK,OPENSPEC_TELEMETRY,HOME,PATH
// Two checks OpenSpec's own validator does not make (.agents/knowledge/spec-workflow.md):
// - openspec/config.yaml holds no rule OpenSpec would drop: a rule that is not a string (an
//   unquoted "colon space" parses as a mapping) drops the whole artifact's rules with a warning.
// - The generated skills under .agents/skills/openspec-* equal what `openspec init --tools agents`
//   produces now, so a drift after an upgrade is visible. The regeneration runs in a temporary
//   directory; nothing in the working tree changes.
//
//   scripts/validate/check_openspec.ts
import { join } from "jsr:@std/path@1.1.6";
import { errorText, exists, isRecord, listDirs, readYaml, ROOT } from "../lib/repo.ts";

export const CONFIG = "openspec/config.yaml";
export const SKILLS_DIR = ".agents/skills";
export const TARGET_MARKER = ".agents/skills/.openspec-target";

/** Rules OpenSpec drops: `rules` not a mapping, an artifact's list not a list of strings, empty strings. */
export function ruleProblems(config: unknown): string[] {
    if (!isRecord(config)) return [`${CONFIG} must be a mapping`];
    const rules = config.rules;
    if (rules === undefined) return [];
    if (!isRecord(rules)) {
        return [`${CONFIG}: rules must map artifact ids to lists of strings; OpenSpec ignores it otherwise`];
    }
    const problems: string[] = [];
    for (const [artifact, list] of Object.entries(rules)) {
        if (!Array.isArray(list)) {
            problems.push(`${CONFIG}: rules.${artifact} is not a list, so OpenSpec ignores every rule for ${artifact}`);
            continue;
        }
        list.forEach((entry, index) => {
            if (typeof entry !== "string") {
                problems.push(
                    `${CONFIG}: rules.${artifact} entry ${index + 1} is not a string (quote a rule containing ": "), ` +
                        `so OpenSpec ignores every rule for ${artifact}`,
                );
            } else if (entry.length === 0) problems.push(`${CONFIG}: rules.${artifact} entry ${index + 1} is empty`);
        });
    }
    return problems;
}

async function readTree(dir: string): Promise<Map<string, string>> {
    const files = new Map<string, string>();
    const walk = async (current: string, prefix: string) => {
        for await (const entry of Deno.readDir(current)) {
            const path = prefix ? `${prefix}/${entry.name}` : entry.name;
            if (entry.isDirectory) await walk(join(current, entry.name), path);
            else if (entry.isFile) files.set(path, await Deno.readTextFile(join(current, entry.name)));
        }
    };
    if (await exists(dir)) await walk(dir, "");
    return files;
}

/** Regenerates the skills in a temporary directory and lists the files that differ from the checkout's. */
export async function generatedSkillProblems(root: string): Promise<string[]> {
    const temp = await Deno.makeTempDir({ prefix: "openspec-check-" });
    try {
        const output = await new Deno.Command("openspec", {
            args: ["init", "--tools", "agents", "--no-animation", "--no-copilot-cloud", "."],
            cwd: temp,
            env: { OPENSPEC_NO_UPDATE_CHECK: "1", OPENSPEC_TELEMETRY: "0" },
            stdout: "piped",
            stderr: "piped",
        }).output();
        if (!output.success) {
            return [
                `openspec init failed in the temporary directory: ${new TextDecoder().decode(output.stderr).trim()}`,
            ];
        }
        const problems: string[] = [];
        const expected = await readTree(join(temp, SKILLS_DIR));
        for (const [path, content] of expected) {
            const ours = `${root}/${SKILLS_DIR}/${path}`;
            if (!(await exists(ours))) {
                problems.push(`${SKILLS_DIR}/${path} is missing; run openspec init --tools agents`);
            } else if ((await Deno.readTextFile(ours)) !== content) {
                problems.push(
                    `${SKILLS_DIR}/${path} differs from what openspec init --tools agents produces; regenerate it, never hand-edit it`,
                );
            }
        }
        for (const name of await listDirs(`${root}/${SKILLS_DIR}`)) {
            if (name.startsWith("openspec-") && ![...expected.keys()].some((p) => p.startsWith(`${name}/`))) {
                problems.push(`${SKILLS_DIR}/${name}/ is not produced by openspec init --tools agents; remove it`);
            }
        }
        return problems;
    } finally {
        await Deno.remove(temp, { recursive: true });
    }
}

export async function main(root = ROOT): Promise<number> {
    const problems: string[] = [];
    try {
        problems.push(...ruleProblems(await readYaml(`${root}/${CONFIG}`)));
    } catch (error) {
        problems.push(errorText(error));
    }
    problems.push(...await generatedSkillProblems(root));
    if (problems.length > 0) {
        console.error("OpenSpec configuration checks found problems:");
        for (const problem of problems) console.error(`- ${problem}`);
        return 1;
    }
    console.log("OpenSpec configuration OK");
    return 0;
}

if (import.meta.main) Deno.exit(await main());
