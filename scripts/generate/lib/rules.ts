// Antigravity rules: Markdown files with a `trigger` front matter under integrations/antigravity/rules/,
// copied to the root rules/ directory Antigravity scans. Other frameworks have no rules component;
// Claude Code's path-scoped rules belong to a project, not a plugin.
import { splitFrontmatter } from "../../lib/frontmatter.ts";
import { listFiles } from "../../lib/repo.ts";

export const TRIGGERS = ["model_decision", "always_on", "glob", "manual"];

export interface Rule {
    name: string;
    content: string;
}

/** Reads and validates the rules; throws listing every problem. */
export async function loadRules(root: string): Promise<Rule[]> {
    const dir = "integrations/antigravity/rules";
    const problems: string[] = [];
    const rules: Rule[] = [];
    for (const file of await listFiles(`${root}/${dir}`, ".md")) {
        const path = `${dir}/${file}`;
        const content = await Deno.readTextFile(`${root}/${path}`);
        try {
            const { data } = splitFrontmatter(content, path);
            if (typeof data.trigger !== "string" || !TRIGGERS.includes(data.trigger)) {
                problems.push(
                    `${path}: "trigger" must be one of ${
                        TRIGGERS.join(", ")
                    } (Antigravity silently drops the rule otherwise)`,
                );
            }
            if (data.trigger === "glob" && typeof data.globs !== "string" && typeof data.glob !== "string") {
                problems.push(`${path}: a glob rule needs "globs" (a comma-separated string)`);
            }
            if (data.trigger === "model_decision" && typeof data.description !== "string") {
                problems.push(`${path}: a model_decision rule needs a "description"`);
            }
            if (new TextEncoder().encode(content).length > 24_000) {
                problems.push(`${path} exceeds Antigravity's 24,000-byte rule limit`);
            }
        } catch (error) {
            problems.push(error instanceof Error ? error.message : String(error));
        }
        rules.push({ name: file, content });
    }
    if (problems.length > 0) throw new Error(problems.map((p) => `- ${p}`).join("\n"));
    return rules;
}
