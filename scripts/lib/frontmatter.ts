// Markdown front matter: the YAML block between the first two `---` lines and the body after it.
// Used for the shared agents, the skills, the Antigravity rules, and the generated agent files.
import { parse as parseYaml, stringify as stringifyYaml } from "jsr:@std/yaml@1.2.0";
import { isRecord } from "./repo.ts";

export interface Document {
    data: Record<string, unknown>;
    body: string;
}

/** Splits `text`; throws when there is no front matter or it is not a mapping. */
export function splitFrontmatter(text: string, where = "the file"): Document {
    const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text);
    if (!match) throw new Error(`${where} has no YAML front matter (a block between two "---" lines)`);
    const data = parseYaml(match[1]);
    if (!isRecord(data)) throw new Error(`${where} has front matter that is not a mapping`);
    return { data, body: match[2] };
}

/** Joins front matter and body; `comment` is written as the first line inside the block. */
export function joinFrontmatter(doc: Document, comment?: string): string {
    const yaml = stringifyYaml(doc.data, { lineWidth: -1 }).trimEnd();
    const head = comment ? `# ${comment}\n${yaml}` : yaml;
    return `---\n${head}\n---\n${doc.body.replace(/^\n+/, "")}`;
}
