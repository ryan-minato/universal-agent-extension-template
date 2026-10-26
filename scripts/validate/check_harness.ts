#!/usr/bin/env -S deno run --allow-read --allow-run=just
// Checks the harness itself the way CI checks code (.agents/knowledge/maintenance.md, Two-way
// synchronization): every repository path AGENTS.md, the knowledge base, and the project skills
// name exists, every `just <recipe>` they name is a recipe, no CLAUDE.md shadows AGENTS.md, the
// entrypoint stays within its length budget, and every Claude Code skill is a link into
// .agents/skills/. Findings name the file and the fix.
//
//   scripts/validate/check_harness.ts
import { exists, listFiles, ROOT, run } from "../lib/repo.ts";

export const ENTRYPOINT_BUDGET = 130;

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

/** Documents that describe other systems' files; their paths are facts about those systems, not this tree. */
const EXTERNAL_FACT_DOCUMENTS = new Set([".agents/knowledge/frameworks.md", ".agents/knowledge/references.md"]);

/** Where a path named in a document may resolve: as written, beside the document, and in the knowledge base. */
function candidates(doc: string, path: string): string[] {
    const base = doc.slice(0, doc.lastIndexOf("/") + 1);
    if (path.startsWith("./") || path.startsWith("../")) return [`${base}${path}`];
    return [path, `${base}${path}`, `.agents/knowledge/${path}`, `.agents/knowledge/github/${path}`];
}

export async function main(root = ROOT): Promise<number> {
    const problems: string[] = [];
    const recipes = new Set((await run("just", ["--summary"], root)).trim().split(/\s+/));
    for (const doc of await harnessDocuments(root)) {
        const text = await Deno.readTextFile(`${root}/${doc}`);
        for (const path of EXTERNAL_FACT_DOCUMENTS.has(doc) ? [] : referencedPaths(text)) {
            if (IGNORED_PATHS.has(path) || path.includes("...")) continue;
            let found = false;
            for (const candidate of candidates(doc, path)) if (await exists(`${root}/${candidate}`)) found = true;
            // A bare file name (tasks.md, title.txt) is a generic name unless it resolves somewhere; a path with
            // a directory in it is a claim about this tree and must resolve.
            if (!found && path.includes("/")) {
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
            `AGENTS.md has ${lines} lines, over the ${ENTRYPOINT_BUDGET}-line budget; move detail into ` +
                ".agents/knowledge/ and leave a pointer",
        );
    }
    // Claude Code reads AGENTS.md when no CLAUDE.md exists, and its plugin validator warns about a
    // CLAUDE.md at a plugin root (frameworks.md, Claude Code), so the entrypoint has one file.
    if (await exists(`${root}/CLAUDE.md`)) {
        problems.push(
            "CLAUDE.md exists; delete it. Claude Code reads AGENTS.md directly, and the plugin validator rejects a CLAUDE.md at the plugin root",
        );
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
