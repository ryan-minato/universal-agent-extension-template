// integrations/<framework>/overrides.yaml: the framework's manifest-level fields that plugin.json
// has no place for. One allow list per framework; a public identity field here is a second source
// and is rejected (integrations/README.md).
import { exists, isRecord, readYaml } from "../../lib/repo.ts";
import { PUBLIC_FIELDS } from "./plugin.ts";

export const FRAMEWORKS = ["codex", "claude-code", "antigravity", "pi"] as const;
export type Framework = (typeof FRAMEWORKS)[number];

/** Manifest fields each framework's overrides.yaml may set. Paths are checked by the caller. */
export const MANIFEST_OVERRIDE_FIELDS: Record<Exclude<Framework, "pi">, string[]> = {
    "claude-code": [
        "displayName",
        "commands",
        "hooks",
        "skills",
        "mcpServers",
        "lspServers",
        "outputStyles",
        "workflows",
    ],
    codex: ["skills", "mcpServers", "hooks", "apps", "interface"],
    antigravity: ["displayName", "suggestedPrompts", "logo", "skills"],
};

/** Reads `integrations/<fw>/overrides.yaml`; an absent file is an empty override. */
export async function loadOverrides(
    root: string,
    framework: Exclude<Framework, "pi">,
): Promise<Record<string, unknown>> {
    const path = `${root}/integrations/${framework}/overrides.yaml`;
    if (!(await exists(path))) return {};
    const value = await readYaml(path);
    if (value === null || value === undefined) return {};
    if (!isRecord(value)) throw new Error(`${path} must be a YAML mapping of manifest fields`);
    const problems: string[] = [];
    for (const key of Object.keys(value)) {
        if (PUBLIC_FIELDS.includes(key)) {
            problems.push(`${path} sets "${key}", which plugin.json already owns; remove it here`);
        } else if (!MANIFEST_OVERRIDE_FIELDS[framework].includes(key)) {
            problems.push(
                `${path} sets the unknown field "${key}"; ${framework} accepts ${
                    MANIFEST_OVERRIDE_FIELDS[framework].join(", ")
                }`,
            );
        }
    }
    if (problems.length > 0) throw new Error(problems.map((p) => `- ${p}`).join("\n"));
    return value;
}

/**
 * Every string value that looks like a plugin-relative path (starts with ./) must exist under the root
 * or be one of the `planned` generated files (which the same run writes).
 */
export async function pathProblems(
    root: string,
    where: string,
    value: unknown,
    planned: Set<string> = new Set(),
    prefix = "",
): Promise<string[]> {
    const problems: string[] = [];
    if (typeof value === "string") {
        if (value.startsWith("./")) {
            const relative = value.slice(2).replace(/\/$/, "");
            if (value.includes("..")) {
                problems.push(`${where}: ${prefix} ${JSON.stringify(value)} leaves the plugin root`);
            } else if (!planned.has(relative) && !(await exists(`${root}/${relative}`))) {
                problems.push(`${where}: ${prefix} points to ${JSON.stringify(value)}, which does not exist`);
            }
        }
    } else if (Array.isArray(value)) {
        for (const [i, item] of value.entries()) {
            problems.push(...await pathProblems(root, where, item, planned, `${prefix}[${i}]`));
        }
    } else if (isRecord(value)) {
        for (const [key, item] of Object.entries(value)) {
            problems.push(...await pathProblems(root, where, item, planned, prefix ? `${prefix}.${key}` : key));
        }
    }
    return problems;
}
