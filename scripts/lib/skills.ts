// The mechanical skill rules of .agents/knowledge/component-design.md (Skill rules), applied to the
// plugin's skills by scripts/validate/main.ts and to the project skills by
// scripts/validate/check_harness.ts. Each finding names the file and the fix.
import { splitFrontmatter } from "./frontmatter.ts";
import { errorText, exists, listDirs, listFiles } from "./repo.ts";

export const SKILL_NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Openings that spend the description on identity instead of the capability's leading word. */
const FILLER_OPENING = /^(this skill|a skill|use this skill|helps?|skill (for|that|to))\b/i;

/** The trigger clause every description carries after its capability sentence. */
const TRIGGER_CLAUSE = /\bUse (when|before|after|whenever|right after|on|for)\b/;

const BUNDLE_DIRS = ["scripts", "references", "assets"];

/** Markdown link targets in a body. */
function linkTargets(body: string): string[] {
    return [...body.matchAll(/\]\(([^)\s#]+)(?:#[^)]*)?\)/g)].map((match) => match[1]);
}

/**
 * Problems with one skill directory: the spec's hard rules (name, description, nesting), the
 * description's shape (leading word first, a trigger clause), and self-containment (every bundled
 * file linked from SKILL.md by a relative link; no link leaves the directory; no README beside
 * SKILL.md). `label` is the path reported, `skills/<name>` or `.agents/skills/<name>`.
 */
export async function skillDirectoryProblems(dir: string, label: string): Promise<string[]> {
    const problems: string[] = [];
    const name = label.slice(label.lastIndexOf("/") + 1);
    const path = `${label}/SKILL.md`;
    if (!(await exists(`${dir}/SKILL.md`))) {
        return [`${label}/ has no SKILL.md; every immediate child of a skills directory must be a skill`];
    }
    if (!SKILL_NAME.test(name) || name.length > 64) {
        problems.push(`${label}: the name must be 1–64 lowercase words joined by single hyphens`);
    }
    if (await exists(`${dir}/README.md`)) {
        problems.push(`${label}/README.md exists; SKILL.md is the skill's one entry point, fold the text into it`);
    }
    let body = "";
    try {
        const doc = splitFrontmatter(await Deno.readTextFile(`${dir}/SKILL.md`), path);
        body = doc.body;
        const { data } = doc;
        if (data.name !== name) {
            problems.push(`${path}: "name" must equal the directory name ${JSON.stringify(name)}`);
        }
        const description = data.description;
        if (typeof description !== "string" || description.trim() === "" || description.length > 1024) {
            problems.push(`${path}: "description" must be a non-empty string of at most 1024 characters`);
        } else {
            if (FILLER_OPENING.test(description.trim())) {
                problems.push(
                    `${path}: the description opens with filler; start with the capability (a verb and the domain word)`,
                );
            }
            if (!TRIGGER_CLAUSE.test(description)) {
                problems.push(
                    `${path}: the description has no trigger clause; add "Use when …" (and "Not for …" where an adjacent task must not fire it) after the capability sentence`,
                );
            }
        }
        if (typeof data.compatibility === "string" && data.compatibility.length > 500) {
            problems.push(`${path}: "compatibility" is over 500 characters`);
        }
        if (body.trim() === "") problems.push(`${path}: the body is empty`);
    } catch (error) {
        problems.push(errorText(error));
    }
    for (const nested of await listDirs(dir)) {
        if (await exists(`${dir}/${nested}/SKILL.md`)) {
            problems.push(`${label}/${nested}/SKILL.md is nested; clients scan one level only, so it is never loaded`);
        }
    }
    const links = linkTargets(body);
    for (const target of links) {
        if (/^[a-z]+:/.test(target)) continue;
        if (target.startsWith("../") || target.startsWith("/")) {
            problems.push(
                `${path} links to ${
                    JSON.stringify(target)
                }, outside the skill; a skill is copied on its own, so link only inside its directory`,
            );
        }
    }
    for (const bundle of BUNDLE_DIRS) {
        const files = await listFiles(`${dir}/${bundle}`);
        if (
            (await exists(`${dir}/${bundle}`)) && files.length === 0 &&
            (await listDirs(`${dir}/${bundle}`)).length === 0
        ) {
            problems.push(`${label}/${bundle}/ is empty; create a bundle directory only when a file goes in it`);
        }
        for (const file of files) {
            const relative = `${bundle}/${file}`;
            if (!links.some((target) => target === relative || target === `./${relative}`)) {
                problems.push(
                    `${path} never links ${relative}; link every bundled file with a relative markdown link at its first mention`,
                );
            }
        }
    }
    return problems;
}

/** Problems with a directory of skills: stray files, then every skill directory; `skip` exempts a name. */
export async function skillsRootProblems(root: string, label: string, skip: (name: string) => boolean = () => false) {
    const problems: string[] = [];
    for (const file of await listFiles(root)) {
        if (skip(file)) continue;
        problems.push(`${label}/${file} is a file; ${label}/ holds only <name>/SKILL.md directories`);
    }
    for (const name of await listDirs(root)) {
        if (skip(name)) continue;
        problems.push(...await skillDirectoryProblems(`${root}/${name}`, `${label}/${name}`));
    }
    return problems;
}
