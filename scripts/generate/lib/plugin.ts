// The Agent Plugins manifest, plugin.json: the one source of the plugin's identity and version
// (.agents/knowledge/architecture.md, Component sources). Validated against the 1.0.0 rules the
// specification states; every other generated manifest is derived from it.
import { isRecord, readJson } from "../../lib/repo.ts";

export const PLUGIN_SCHEMA = "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json";
export const MCP_SCHEMA = "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json";

/** The closed field set of a 1.0.0 manifest. Anything else is reported. */
export const MANIFEST_FIELDS = [
    "$schema",
    "name",
    "version",
    "description",
    "author",
    "homepage",
    "repository",
    "license",
    "keywords",
    "extensions",
] as const;

/** The public identity fields a framework override may not repeat. */
export const PUBLIC_FIELDS = [
    "name",
    "version",
    "description",
    "author",
    "homepage",
    "repository",
    "license",
    "keywords",
];

/** 1–64 chars of a–z, 0–9, "-" and "."; starts and ends alphanumeric; no "--" or "..". */
const NAME = /^(?!.*(--|\.\.))[a-z0-9][a-z0-9.-]{0,62}[a-z0-9]$|^[a-z0-9]$/;
export const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$/;
/** Names Claude Code refuses for a plugin. */
const RESERVED_PREFIXES = ["claude-", "anthropic-", "anthropics-", "cc-plugin-"];
const RESERVED_NAMES = ["claude", "anthropic", "claude-code", "claude-mods"];

export interface Author {
    name: string;
    email?: string;
    url?: string;
}

export interface PluginManifest {
    $schema: string;
    name: string;
    version: string;
    description: string;
    author: Author;
    homepage: string;
    repository: string;
    license: string;
    keywords: string[];
    extensions: Record<string, unknown>;
}

/** Problems with a parsed plugin.json; empty when it is a usable manifest for this template. */
export function manifestProblems(value: unknown): string[] {
    const problems: string[] = [];
    if (!isRecord(value)) return ["plugin.json must be a JSON object"];
    for (const key of Object.keys(value)) {
        if (!(MANIFEST_FIELDS as readonly string[]).includes(key)) {
            problems.push(
                `plugin.json has the unknown field "${key}"; the 1.0.0 manifest allows only ${
                    MANIFEST_FIELDS.join(", ")
                }`,
            );
        }
    }
    if (value.$schema !== PLUGIN_SCHEMA) problems.push(`plugin.json "$schema" must be "${PLUGIN_SCHEMA}"`);
    if (typeof value.name !== "string" || !NAME.test(value.name)) {
        problems.push(
            'plugin.json "name" must be 1–64 characters of a-z, 0-9, "-", "." starting and ending alphanumeric',
        );
    } else {
        const name = value.name;
        if (RESERVED_PREFIXES.some((p) => name.startsWith(p)) || RESERVED_NAMES.includes(name)) {
            problems.push(
                `plugin.json "name" ${JSON.stringify(name)} is refused by Claude Code (reserved prefix or name)`,
            );
        }
    }
    // The template requires the fields it derives other manifests from; the specification itself makes them optional.
    for (const key of ["version", "description", "homepage", "repository", "license"]) {
        if (typeof value[key] !== "string" || value[key] === "") {
            problems.push(`plugin.json "${key}" must be a non-empty string`);
        }
    }
    if (typeof value.version === "string" && !SEMVER.test(value.version)) {
        problems.push(
            `plugin.json "version" ${JSON.stringify(value.version)} is not Semantic Versioning (MAJOR.MINOR.PATCH)`,
        );
    }
    if (!isRecord(value.author) || typeof value.author.name !== "string") {
        problems.push('plugin.json "author" must be an object with at least "name"');
    } else {
        for (const key of Object.keys(value.author)) {
            if (!["name", "email", "url"].includes(key)) {
                problems.push(`plugin.json "author" has the unknown field "${key}"`);
            }
        }
    }
    if (!Array.isArray(value.keywords) || !value.keywords.every((k) => typeof k === "string")) {
        problems.push('plugin.json "keywords" must be an array of strings');
    }
    if (value.extensions !== undefined) {
        if (!isRecord(value.extensions)) problems.push('plugin.json "extensions" must be an object');
        else {
            for (const key of Object.keys(value.extensions)) {
                if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(key)) {
                    problems.push(
                        `plugin.json "extensions" key ${
                            JSON.stringify(key)
                        } is not a reverse-domain namespace (com.example.client)`,
                    );
                }
            }
        }
    }
    return problems;
}

/** Reads and validates `<root>/plugin.json`; throws listing every problem. */
export async function loadPlugin(root: string): Promise<PluginManifest> {
    const value = await readJson(`${root}/plugin.json`);
    const problems = manifestProblems(value);
    if (problems.length > 0) throw new Error(problems.map((p) => `- ${p}`).join("\n"));
    const manifest = value as Record<string, unknown>;
    return {
        $schema: PLUGIN_SCHEMA,
        name: manifest.name as string,
        version: manifest.version as string,
        description: manifest.description as string,
        author: manifest.author as Author,
        homepage: manifest.homepage as string,
        repository: manifest.repository as string,
        license: manifest.license as string,
        keywords: manifest.keywords as string[],
        extensions: (manifest.extensions ?? {}) as Record<string, unknown>,
    };
}

/** The public fields every derived manifest starts from, in a fixed order. */
export function publicFields(plugin: PluginManifest): Record<string, unknown> {
    return {
        name: plugin.name,
        version: plugin.version,
        description: plugin.description,
        author: plugin.author,
        homepage: plugin.homepage,
        repository: plugin.repository,
        license: plugin.license,
        keywords: plugin.keywords,
    };
}
