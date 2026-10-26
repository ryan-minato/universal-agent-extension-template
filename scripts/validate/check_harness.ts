#!/usr/bin/env -S deno run --allow-read --allow-run=just
// Checks the harness itself the way CI checks code (.agents/knowledge/maintenance.md, Harness
// checks): every repository path AGENTS.md and the knowledge base name exists, every `just <recipe>`
// they name is a recipe, CLAUDE.md is only the import line, and the entrypoint stays within its
// length budget. Findings name the file and the fix.
//
//   scripts/validate/check_harness.ts
import { exists, listFiles, ROOT, run } from "../lib/repo.ts";

export const ENTRYPOINT_BUDGET = 130;
export const CLAUDE_MD = "@AGENTS.md\n";

/** Harness documents whose references are checked. */
export async function harnessDocuments(root: string): Promise<string[]> {
    const docs = ["AGENTS.md"];
    for (const file of await listFiles(`${root}/.agents/knowledge`, ".md")) docs.push(`.agents/knowledge/${file}`);
    for (const file of await listFiles(`${root}/.agents/knowledge/github`, ".md")) {
        docs.push(`.agents/knowledge/github/${file}`);
    }
    for (const skill of ["github-project-workflow", "template-adopt"]) {
        if (await exists(`${root}/.agents/skills/${skill}/SKILL.md`)) docs.push(`.agents/skills/${skill}/SKILL.md`);
    }
    return docs;
}

const PATH_TOKEN = /^(?:\.{0,2}\/)?[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.*-]+)*\/?$/;
const PATH_EXTENSIONS = /\.(md|ts|mjs|json|ya?ml|toml|txt|sh)$/;

/** Repository paths a document names: markdown link targets and inline code that looks like a path. */
export function referencedPaths(text: string): string[] {
    const paths = new Set<string>();
    for (const match of text.matchAll(/\]\(([^)\s#]+)(?:#[^)]*)?\)/g)) {
        const target = match[1];
        if (/^[a-z]+:/.test(target)) continue;
        paths.add(target);
    }
    for (const match of text.matchAll(/`([^`\n]+)`/g)) {
        const token = match[1].trim();
        if (!PATH_TOKEN.test(token) || token.includes("*") || token.includes("<")) continue;
        if (token.endsWith("/") || PATH_EXTENSIONS.test(token) || token.startsWith(".") && token.includes("/")) {
            paths.add(token);
        }
    }
    return [...paths];
}

/** `just <recipe>` mentions in a document. */
export function referencedRecipes(text: string): string[] {
    const recipes = new Set<string>();
    for (const match of text.matchAll(/`just ([a-z][a-z0-9-]*)/g)) recipes.add(match[1]);
    return [...recipes];
}

const IGNORED_PATHS = new Set(["site/", "node_modules/"]);

export async function main(root = ROOT): Promise<number> {
    const problems: string[] = [];
    const recipes = new Set((await run("just", ["--summary"], root)).trim().split(/\s+/));
    for (const doc of await harnessDocuments(root)) {
        const text = await Deno.readTextFile(`${root}/${doc}`);
        const base = doc.slice(0, doc.lastIndexOf("/") + 1);
        for (const path of referencedPaths(text)) {
            if (IGNORED_PATHS.has(path)) continue;
            const candidates = path.startsWith("./") || path.startsWith("../")
                ? [`${base}${path}`]
                : [path, `${base}${path}`];
            let found = false;
            for (const candidate of candidates) if (await exists(`${root}/${candidate}`)) found = true;
            if (!found) {
                problems.push(
                    `${doc} names ${JSON.stringify(path)}, which does not exist; fix the path or remove the reference`,
                );
            }
        }
        for (const recipe of referencedRecipes(text)) {
            if (!recipes.has(recipe)) {
                problems.push(
                    `${doc} names \`just ${recipe}\`, which is not a justfile recipe; add it or fix the name`,
                );
            }
        }
    }
    const lines = (await Deno.readTextFile(`${root}/AGENTS.md`)).split("\n").length;
    if (lines > ENTRYPOINT_BUDGET) {
        problems.push(
            `AGENTS.md has ${lines} lines, over the ${ENTRYPOINT_BUDGET}-line budget; move detail into .agents/knowledge/ and leave a pointer`,
        );
    }
    if ((await Deno.readTextFile(`${root}/CLAUDE.md`)) !== CLAUDE_MD) {
        problems.push(`CLAUDE.md must contain exactly "@AGENTS.md"; rules live in AGENTS.md and the knowledge base`);
    }
    for (const skill of await listFiles(`${root}/.claude/skills`)) {
        const info = await Deno.lstat(`${root}/.claude/skills/${skill}`);
        if (!info.isSymlink) {
            problems.push(
                `.claude/skills/${skill} is not a symbolic link into .agents/skills/; skills have one source`,
            );
        }
    }
    if (problems.length > 0) {
        console.error("Harness checks found problems:");
        for (const problem of problems) console.error(`- ${problem}`);
        return 1;
    }
    console.log("Harness references OK");
    return 0;
}

if (import.meta.main) Deno.exit(await main());
