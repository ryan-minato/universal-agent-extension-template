// Shared helpers for the project's management scripts: the repository root, file access with
// messages that name the file, and the YAML and JSON readers every script uses. Imports are pinned
// inline; the repository keeps no lock file (deno.json).
import { dirname, fromFileUrl, join, resolve } from "jsr:@std/path@1.1.6";
import { parse as parseYaml } from "jsr:@std/yaml@1.2.0";

export { REPO } from "./constants.ts";

/** The repository root: two levels above this file. */
export const ROOT = resolve(dirname(fromFileUrl(import.meta.url)), "..", "..");

export function errorText(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

export async function exists(path: string): Promise<boolean> {
    try {
        await Deno.stat(path);
        return true;
    } catch (error) {
        if (error instanceof Deno.errors.NotFound) return false;
        throw error;
    }
}

/** Names of the directories directly under `path`, sorted; none when `path` does not exist. */
export async function listDirs(path: string): Promise<string[]> {
    if (!(await exists(path))) return [];
    const names: string[] = [];
    for await (const entry of Deno.readDir(path)) if (entry.isDirectory) names.push(entry.name);
    return names.sort();
}

/** Names of the regular files directly under `path` ending in `suffix`, sorted; none when it does not exist. */
export async function listFiles(path: string, suffix = ""): Promise<string[]> {
    if (!(await exists(path))) return [];
    const names: string[] = [];
    for await (const entry of Deno.readDir(path)) {
        if (entry.isFile && entry.name.endsWith(suffix)) names.push(entry.name);
    }
    return names.sort();
}

/** Parses a JSON file; the error names the file. */
export async function readJson(path: string): Promise<unknown> {
    const text = await Deno.readTextFile(path);
    try {
        return JSON.parse(text);
    } catch (error) {
        throw new Error(`${path} is not valid JSON: ${errorText(error)}`);
    }
}

/** Parses a YAML file; the error names the file. */
export async function readYaml(path: string): Promise<unknown> {
    const text = await Deno.readTextFile(path);
    try {
        return parseYaml(text);
    } catch (error) {
        throw new Error(`${path} is not valid YAML: ${errorText(error)}`);
    }
}

/** True for a plain object (a YAML or JSON mapping). */
export function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** Runs a command and returns its output; throws with the command's own message when it fails. */
export async function run(command: string, args: string[], cwd = ROOT): Promise<string> {
    const output = await new Deno.Command(command, { args, cwd, stdout: "piped", stderr: "piped" }).output();
    const decode = (bytes: Uint8Array) => new TextDecoder().decode(bytes);
    if (!output.success) {
        throw new Error(`${command} ${args.join(" ")} failed: ${decode(output.stderr).trim() || "no message"}`);
    }
    return decode(output.stdout);
}

/** Joins `parts` under the repository root. */
export const at = (...parts: string[]) => join(ROOT, ...parts);

/**
 * Formats Markdown the way the pre-commit hook will (deno fmt with this repository's deno.json and
 * .editorconfig), so a generated Markdown file is byte-stable across generation and commit.
 */
export async function formatMarkdown(text: string): Promise<string> {
    const child = new Deno.Command("deno", {
        args: ["fmt", "--ext", "md", "-"],
        cwd: ROOT,
        stdin: "piped",
        stdout: "piped",
        stderr: "piped",
    }).spawn();
    const writer = child.stdin.getWriter();
    await writer.write(new TextEncoder().encode(text));
    await writer.close();
    const output = await child.output();
    if (!output.success) throw new Error(`deno fmt failed: ${new TextDecoder().decode(output.stderr).trim()}`);
    return new TextDecoder().decode(output.stdout);
}
