// The native manifests derived from plugin.json: Claude Code's, Antigravity's, and Codex's fallback.
import { loadOverrides, pathProblems } from "./overrides.ts";
import { type PluginManifest, publicFields } from "./plugin.ts";

export const ANTIGRAVITY_SCHEMA = "https://antigravity.google/schemas/v1/plugin.json";

/** .claude-plugin/plugin.json; `agentPaths` lists the generated agent files (./-relative). */
export async function claudeManifest(
    root: string,
    plugin: PluginManifest,
    agentPaths: string[],
    planned: Set<string>,
): Promise<Record<string, unknown>> {
    const overrides = await loadOverrides(root, "claude-code");
    const problems = await pathProblems(root, "integrations/claude-code/overrides.yaml", overrides, planned);
    if (problems.length > 0) throw new Error(problems.map((p) => `- ${p}`).join("\n"));
    return {
        ...publicFields(plugin),
        ...overrides,
        ...(agentPaths.length > 0 ? { agents: agentPaths } : {}),
    };
}

/** .antigravity-plugin/plugin.json. Antigravity names allow letters, digits, "_" and "-" only. */
export async function antigravityManifest(
    root: string,
    plugin: PluginManifest,
    planned: Set<string>,
): Promise<Record<string, unknown>> {
    if (!/^[a-zA-Z0-9_-]+$/.test(plugin.name)) {
        throw new Error(
            `plugin.json "name" ${JSON.stringify(plugin.name)} contains a "." which Antigravity's manifest refuses`,
        );
    }
    const overrides = await loadOverrides(root, "antigravity");
    const problems = await pathProblems(root, "integrations/antigravity/overrides.yaml", overrides, planned);
    if (problems.length > 0) throw new Error(problems.map((p) => `- ${p}`).join("\n"));
    return { $schema: ANTIGRAVITY_SCHEMA, ...publicFields(plugin), ...overrides };
}

/** .codex-plugin/plugin.json: the native fallback for clients that do not read the portable manifest. */
export async function codexManifest(
    root: string,
    plugin: PluginManifest,
    planned: Set<string>,
): Promise<Record<string, unknown>> {
    const overrides = await loadOverrides(root, "codex");
    const problems = await pathProblems(root, "integrations/codex/overrides.yaml", overrides, planned);
    if (problems.length > 0) throw new Error(problems.map((p) => `- ${p}`).join("\n"));
    return { ...publicFields(plugin), ...overrides };
}
