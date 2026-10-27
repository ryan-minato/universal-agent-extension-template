// Subagents: the shared sources under agents/ carry only name, description, and the body, so that
// every first-class framework accepts them as written (Antigravity reads that directory directly).
// Claude Code gets a generated copy with its override merged, listed explicitly in its manifest;
// Codex gets a generated TOML role under .codex/agents/, installed with
// integrations/codex/scripts/install-agents.mjs (.agents/knowledge/architecture.md, Subagents).
import { parse as parseToml, stringify as stringifyToml } from "jsr:@std/toml@1.0.11";
import { joinFrontmatter, splitFrontmatter } from "../../lib/frontmatter.ts";
import { exists, isRecord, listFiles, readYaml } from "../../lib/repo.ts";

/** The only front matter keys a shared agent may carry. */
export const SHARED_KEYS = ["name", "description"];

/** Front matter keys a framework override may add, per framework; `body_prepend`/`body_append` edit the body. */
export const OVERRIDE_KEYS = {
    "claude-code": [
        "tools",
        "disallowedTools",
        "model",
        "effort",
        "maxTurns",
        "skills",
        "memory",
        "background",
        "color",
        "body_prepend",
        "body_append",
    ],
    codex: [
        "model",
        "model_reasoning_effort",
        "model_reasoning_summary",
        "model_verbosity",
        "features",
        "skills",
        "nickname_candidates",
        "body_prepend",
        "body_append",
    ],
} as const;

export const CODEX_MARKER = "# generated-by: todo-tracker";

export interface SharedAgent {
    name: string;
    description: string;
    body: string;
}

const AGENT_NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Reads agents/*.md; throws listing every file that breaks the shared-only rule. */
export async function loadSharedAgents(root: string): Promise<SharedAgent[]> {
    const problems: string[] = [];
    const agents: SharedAgent[] = [];
    for (const file of await listFiles(`${root}/agents`, ".md")) {
        const path = `agents/${file}`;
        const stem = file.slice(0, -".md".length);
        let doc;
        try {
            doc = splitFrontmatter(await Deno.readTextFile(`${root}/${path}`), path);
        } catch (error) {
            problems.push(error instanceof Error ? error.message : String(error));
            continue;
        }
        const extra = Object.keys(doc.data).filter((key) => !SHARED_KEYS.includes(key));
        if (extra.length > 0) {
            problems.push(
                `${path} has the front matter key(s) ${extra.join(", ")}; a shared agent carries only name and ` +
                    "description, and framework fields go in integrations/<framework>/agents/<name>.override.yaml",
            );
        }
        if (doc.data.name !== stem) problems.push(`${path}: "name" must equal the file name ${JSON.stringify(stem)}`);
        if (!AGENT_NAME.test(stem)) problems.push(`${path}: the file name must be lowercase words joined by hyphens`);
        if (typeof doc.data.description !== "string" || doc.data.description.trim() === "") {
            problems.push(`${path}: "description" must be a non-empty string`);
        }
        if (doc.body.trim() === "") problems.push(`${path}: the body (the agent's instructions) is empty`);
        if (problems.length === 0) {
            agents.push({ name: stem, description: doc.data.description as string, body: doc.body.trim() + "\n" });
        }
    }
    if (problems.length > 0) throw new Error(problems.map((p) => `- ${p}`).join("\n"));
    return agents;
}

type OverrideFramework = keyof typeof OVERRIDE_KEYS;

/** Reads integrations/<fw>/agents/*.override.yaml, keyed by agent name; validates keys and targets. */
export async function loadOverrides(
    root: string,
    framework: OverrideFramework,
    shared: SharedAgent[],
): Promise<Map<string, Record<string, unknown>>> {
    const dir = `integrations/${framework}/agents`;
    const overrides = new Map<string, Record<string, unknown>>();
    const problems: string[] = [];
    for (const file of await listFiles(`${root}/${dir}`, ".override.yaml")) {
        const name = file.slice(0, -".override.yaml".length);
        const path = `${dir}/${file}`;
        if (!shared.some((agent) => agent.name === name)) {
            problems.push(`${path} overrides ${JSON.stringify(name)}, but agents/${name}.md does not exist`);
            continue;
        }
        const value = await readYaml(`${root}/${path}`);
        if (!isRecord(value)) {
            problems.push(`${path} must be a YAML mapping of front matter keys`);
            continue;
        }
        const allowed: readonly string[] = OVERRIDE_KEYS[framework];
        for (const key of Object.keys(value)) {
            if (SHARED_KEYS.includes(key)) problems.push(`${path} sets "${key}", which only agents/${name}.md owns`);
            else if (!allowed.includes(key)) {
                problems.push(`${path} sets "${key}"; ${framework} accepts ${allowed.join(", ")}`);
            }
        }
        for (const key of ["body_prepend", "body_append"]) {
            if (value[key] !== undefined && typeof value[key] !== "string") {
                problems.push(`${path}: "${key}" must be a string`);
            }
        }
        overrides.set(name, value);
    }
    if (problems.length > 0) throw new Error(problems.map((p) => `- ${p}`).join("\n"));
    return overrides;
}

/** Antigravity accepts no override: a file in its agents directory other than README.md is an error. */
export async function antigravityAgentProblems(root: string): Promise<string[]> {
    const dir = `integrations/antigravity/agents`;
    const files = (await listFiles(`${root}/${dir}`)).filter((name) => name !== "README.md");
    return files.map((name) =>
        `${dir}/${name}: Antigravity loads agents from the plugin root's agents/ only, so this file would never ` +
        "load; see integrations/antigravity/agents/README.md for the verification items that must pass first"
    );
}

function mergedBody(agent: SharedAgent, override: Record<string, unknown>): string {
    const prepend = typeof override.body_prepend === "string" ? override.body_prepend.trim() + "\n\n" : "";
    const append = typeof override.body_append === "string" ? "\n" + override.body_append.trim() + "\n" : "";
    return prepend + agent.body + append;
}

function frontmatterFields(override: Record<string, unknown>): Record<string, unknown> {
    const { body_prepend: _p, body_append: _a, ...rest } = override;
    return rest;
}

/** The Claude Code agent file: shared fields, then the override's front matter, then the body. */
export function claudeAgent(agent: SharedAgent, override: Record<string, unknown> = {}): string {
    const data = { name: agent.name, description: agent.description, ...frontmatterFields(override) };
    return joinFrontmatter(
        { data, body: mergedBody(agent, override) },
        `generated-by: todo-tracker — do not edit; source: agents/${agent.name}.md + integrations/claude-code/agents/`,
    );
}

/** The Codex role TOML: marker, the three required fields (the body as developer_instructions), then the override. */
export function codexAgent(agent: SharedAgent, override: Record<string, unknown> = {}): string {
    const body = mergedBody(agent, override);
    if (body.includes("'''")) {
        throw new Error(`agents/${agent.name}.md body contains ''' which the TOML literal cannot hold`);
    }
    const head = [
        `${CODEX_MARKER} — do not edit; source: agents/${agent.name}.md + integrations/codex/agents/`,
        `# Install with: node integrations/codex/scripts/install-agents.mjs --scope user|project`,
        `name = ${JSON.stringify(agent.name)}`,
        `description = ${JSON.stringify(agent.description)}`,
        `developer_instructions = '''`,
        body.trimEnd(),
        `'''`,
    ].join("\n");
    const rest = stringifyToml(frontmatterFields(override)).trim();
    const text = rest === "" ? `${head}\n` : `${head}\n${rest}\n`;
    const parsed = parseToml(text) as Record<string, unknown>;
    for (const key of ["name", "description", "developer_instructions"]) {
        if (typeof parsed[key] !== "string") throw new Error(`generated TOML for ${agent.name} lacks "${key}"`);
    }
    return text;
}

/** Framework-only agent files copied as they are: claude-code/agents/*.md and codex/agents/*.toml. */
export async function platformOnlyAgents(root: string, shared: SharedAgent[]): Promise<{
    claude: { name: string; content: string }[];
    codex: { name: string; content: string }[];
}> {
    const problems: string[] = [];
    const claude: { name: string; content: string }[] = [];
    for (const file of await listFiles(`${root}/integrations/claude-code/agents`, ".md")) {
        const path = `integrations/claude-code/agents/${file}`;
        const name = file.slice(0, -".md".length);
        if (shared.some((agent) => agent.name === name)) {
            problems.push(`${path} shadows the shared agents/${name}.md; use ${name}.override.yaml instead`);
            continue;
        }
        const content = await Deno.readTextFile(`${root}/${path}`);
        try {
            const doc = splitFrontmatter(content, path);
            if (doc.data.name !== name || typeof doc.data.description !== "string") {
                problems.push(`${path}: front matter needs name = ${JSON.stringify(name)} and a description`);
            }
        } catch (error) {
            problems.push(error instanceof Error ? error.message : String(error));
        }
        claude.push({ name, content });
    }
    const codex: { name: string; content: string }[] = [];
    for (const file of await listFiles(`${root}/integrations/codex/agents`, ".toml")) {
        const path = `integrations/codex/agents/${file}`;
        const name = file.slice(0, -".toml".length);
        if (shared.some((agent) => agent.name === name)) {
            problems.push(`${path} shadows the shared agents/${name}.md; use ${name}.override.yaml instead`);
            continue;
        }
        const content = await Deno.readTextFile(`${root}/${path}`);
        try {
            const parsed = parseToml(content) as Record<string, unknown>;
            for (const key of ["name", "description", "developer_instructions"]) {
                if (typeof parsed[key] !== "string") {
                    problems.push(`${path}: "${key}" is required by Codex and missing`);
                }
            }
            if (parsed.name !== name) problems.push(`${path}: "name" must equal the file name ${JSON.stringify(name)}`);
            if (!content.includes(CODEX_MARKER)) {
                problems.push(`${path}: add the line "${CODEX_MARKER}" so install-agents.mjs recognizes it`);
            }
        } catch (error) {
            problems.push(`${path} is not valid TOML: ${error instanceof Error ? error.message : String(error)}`);
        }
        codex.push({ name, content });
    }
    if (problems.length > 0) throw new Error(problems.map((p) => `- ${p}`).join("\n"));
    return { claude, codex };
}

/** True when the integrations directory of a framework exists; a template adopter may delete one. */
export const hasIntegration = (root: string, framework: string) => exists(`${root}/integrations/${framework}`);
