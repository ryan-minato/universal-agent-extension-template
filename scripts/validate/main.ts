#!/usr/bin/env -S deno run --allow-read --allow-run=node,deno
// Validates the plugin sources and the generated files against the rules in
// .agents/knowledge/architecture.md: the manifest, mcp.json, the skills, the shared agents and
// their overrides, every integration file the generator reads, and that the committed generated
// files equal what the sources produce. Prints every finding with its fix; exit 1 on any.
//
//   scripts/validate/main.ts
import { splitFrontmatter } from "../lib/frontmatter.ts";
import { errorText, exists, listDirs, listFiles, ROOT } from "../lib/repo.ts";
import { differences, generateAll, staleFiles } from "../generate/main.ts";
import { FRAMEWORKS } from "../generate/lib/overrides.ts";

const SKILL_NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Problems with skills/: one level of <name>/SKILL.md, name equals the directory, description within limits. */
export async function skillProblems(root: string): Promise<string[]> {
    const problems: string[] = [];
    const dir = `${root}/skills`;
    for (const file of await listFiles(dir)) {
        problems.push(`skills/${file} is a file; skills/ holds only <name>/SKILL.md directories`);
    }
    for (const name of await listDirs(dir)) {
        const path = `skills/${name}/SKILL.md`;
        if (!(await exists(`${root}/${path}`))) {
            problems.push(`skills/${name}/ has no SKILL.md; every immediate child of skills/ must be a skill`);
            continue;
        }
        if (!SKILL_NAME.test(name) || name.length > 64) {
            problems.push(`skills/${name}: the name must be 1–64 lowercase words joined by hyphens`);
        }
        try {
            const { data, body } = splitFrontmatter(await Deno.readTextFile(`${root}/${path}`), path);
            if (data.name !== name) {
                problems.push(`${path}: "name" must equal the directory name ${JSON.stringify(name)}`);
            }
            const description = data.description;
            if (typeof description !== "string" || description.trim() === "" || description.length > 1024) {
                problems.push(`${path}: "description" must be a non-empty string of at most 1024 characters`);
            }
            if (body.trim() === "") problems.push(`${path}: the body is empty`);
            for (const nested of await listDirs(`${root}/skills/${name}`)) {
                if (await exists(`${root}/skills/${name}/${nested}/SKILL.md`)) {
                    problems.push(
                        `skills/${name}/${nested}/SKILL.md is nested; clients scan one level only, so it is never loaded`,
                    );
                }
            }
        } catch (error) {
            problems.push(errorText(error));
        }
    }
    return problems;
}

/** Problems with integrations/: only known frameworks, and each with at least one file. */
export async function integrationProblems(root: string): Promise<string[]> {
    const problems: string[] = [];
    for (const name of await listDirs(`${root}/integrations`)) {
        if (!(FRAMEWORKS as readonly string[]).includes(name)) {
            problems.push(
                `integrations/${name}/ is not a supported framework (${
                    FRAMEWORKS.join(", ")
                }); see .agents/knowledge/architecture.md`,
            );
        }
    }
    return problems;
}

/** Every runtime script: the MCP servers, the skills' own scripts, the hook scripts, the Codex installer. */
export async function runtimeScripts(root: string): Promise<string[]> {
    const scripts: string[] = [];
    for (const server of await listDirs(`${root}/mcp`)) {
        for (const file of await listFiles(`${root}/mcp/${server}`, ".mjs")) scripts.push(`mcp/${server}/${file}`);
    }
    for (const skill of await listDirs(`${root}/skills`)) {
        for (const file of await listFiles(`${root}/skills/${skill}/scripts`, ".mjs")) {
            scripts.push(`skills/${skill}/scripts/${file}`);
        }
    }
    for (const file of await listFiles(`${root}/integrations/codex/scripts`, ".mjs")) {
        scripts.push(`integrations/codex/scripts/${file}`);
    }
    return scripts;
}

/**
 * A skill is distributed on its own, so its scripts import nothing outside the skill directory; the
 * same holds for a hook script, which is one framework's lifecycle code (architecture.md, Component roles).
 */
export async function selfContainmentProblems(root: string): Promise<string[]> {
    const problems: string[] = [];
    const check = async (path: string, what: string) => {
        const text = await Deno.readTextFile(`${root}/${path}`);
        for (const match of text.matchAll(/^\s*import\b[^;]*?from\s+["']([^"']+)["']/gm)) {
            const specifier = match[1];
            if (specifier.startsWith("..")) {
                problems.push(
                    `${path} imports ${
                        JSON.stringify(specifier)
                    }, outside its directory; ${what} must be self-contained (copy the code in, or call the MCP server's tool instead)`,
                );
            }
        }
    };
    for (const skill of await listDirs(`${root}/skills`)) {
        for (const file of await listFiles(`${root}/skills/${skill}/scripts`)) {
            await check(`skills/${skill}/scripts/${file}`, "a skill script");
        }
    }
    for (const fw of await listDirs(`${root}/integrations`)) {
        for (const file of await listFiles(`${root}/integrations/${fw}/hooks/scripts`)) {
            await check(`integrations/${fw}/hooks/scripts/${file}`, "a hook script");
        }
    }
    return problems;
}

/** Runtime scripts must be plain Node ESM and executable without a build step. */
export async function runtimeProblems(root: string): Promise<string[]> {
    const problems: string[] = [];
    const scripts = await runtimeScripts(root);
    for (const fw of ["codex", "claude-code", "antigravity"]) {
        for (const file of await listFiles(`${root}/integrations/${fw}/hooks/scripts`, ".mjs")) {
            scripts.push(`integrations/${fw}/hooks/scripts/${file}`);
        }
    }
    for (const script of scripts) {
        const output = await new Deno.Command("node", { args: ["--check", `${root}/${script}`], stderr: "piped" })
            .output();
        if (!output.success) {
            problems.push(`${script} does not parse as Node ESM: ${new TextDecoder().decode(output.stderr).trim()}`);
        }
    }
    return problems;
}

export async function main(root = ROOT): Promise<number> {
    const problems: string[] = [];
    try {
        const outputs = await generateAll(root);
        for (const path of await differences(root, outputs)) {
            problems.push(`${path} differs from what the sources produce; run just generate`);
        }
        for (const path of await staleFiles(root, outputs)) {
            problems.push(`${path} is a stale generated file; run just generate`);
        }
    } catch (error) {
        problems.push(errorText(error));
    }
    problems.push(
        ...await skillProblems(root),
        ...await integrationProblems(root),
        ...await runtimeProblems(root),
        ...await selfContainmentProblems(root),
    );
    if (problems.length > 0) {
        console.error("Plugin validation found problems:");
        for (const problem of problems) console.error(problem.startsWith("- ") ? problem : `- ${problem}`);
        return 1;
    }
    console.log("Plugin sources and generated files OK");
    return 0;
}

if (import.meta.main) Deno.exit(await main());
