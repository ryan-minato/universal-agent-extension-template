// The Pi package: package.json derived from plugin.json plus integrations/pi/package.patch.json,
// which holds what the manifest cannot say (the scoped npm name, the `pi` component map).
import { exists, isRecord, readJson } from "../../lib/repo.ts";
import type { PluginManifest } from "./plugin.ts";

export const PATCH_FIELDS = ["name", "keywords", "engines", "pi", "files", "peerDependencies"];

/** Reads and validates integrations/pi/package.patch.json; null when the Pi integration is absent. */
export async function loadPiPatch(root: string): Promise<Record<string, unknown> | null> {
    const path = "integrations/pi/package.patch.json";
    if (!(await exists(`${root}/${path}`))) return null;
    const value = await readJson(`${root}/${path}`);
    const problems: string[] = [];
    if (!isRecord(value)) return Promise.reject(new Error(`${path} must be a JSON object`));
    for (const key of Object.keys(value)) {
        if (!PATCH_FIELDS.includes(key)) {
            problems.push(`${path} has the unknown field "${key}"; allowed: ${PATCH_FIELDS.join(", ")}`);
        }
    }
    if (typeof value.name !== "string" || !/^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(value.name)) {
        problems.push(`${path}: "name" must be a valid npm package name (usually @scope/${"<plugin name>"})`);
    }
    if (!isRecord(value.pi)) {
        problems.push(`${path}: "pi" must map extensions, skills, prompts, and themes to path arrays`);
    } else {
        for (const [key, list] of Object.entries(value.pi)) {
            if (!["extensions", "skills", "prompts", "themes"].includes(key)) {
                problems.push(`${path}: pi.${key} is not a Pi component kind`);
            }
            if (!Array.isArray(list) || !list.every((p) => typeof p === "string")) {
                problems.push(`${path}: pi.${key} must be an array of paths`);
            }
        }
    }
    if (problems.length > 0) throw new Error(problems.map((p) => `- ${p}`).join("\n"));
    return value;
}

/** The generated package.json. */
export function piPackage(plugin: PluginManifest, patch: Record<string, unknown>): Record<string, unknown> {
    const keywords = [...new Set([...plugin.keywords, ...((patch.keywords as string[] | undefined) ?? [])])];
    const author = plugin.author.email || plugin.author.url
        ? {
            name: plugin.author.name,
            ...(plugin.author.email ? { email: plugin.author.email } : {}),
            ...(plugin.author.url ? { url: plugin.author.url } : {}),
        }
        : plugin.author.name;
    return {
        name: patch.name,
        version: plugin.version,
        description: plugin.description,
        keywords,
        homepage: plugin.homepage,
        repository: { type: "git", url: `git+${plugin.repository}.git` },
        license: plugin.license,
        author,
        type: "module",
        private: false,
        ...(patch.engines ? { engines: patch.engines } : {}),
        ...(patch.files ? { files: patch.files } : {}),
        ...(patch.peerDependencies ? { peerDependencies: patch.peerDependencies } : {}),
        pi: patch.pi,
    };
}
