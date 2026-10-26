#!/usr/bin/env -S deno run --allow-read --allow-run=git
// The release rules (.agents/knowledge/github/checks.md, Release path): plugin.json's version is
// the plugin's version; a merge to main that changes it is a release. Two modes:
//
//   scripts/release/check_release.ts --pr <base-ref>
//       In a pull request: when plugin.json's version differs from the base's, CHANGELOG.md must
//       hold a section for it and no tag v<version> may exist yet. Exit 1 otherwise.
//   scripts/release/check_release.ts --main
//       On main: prints `version=<v>` and `release=true|false` (true when tag v<version> does not
//       exist and the CHANGELOG section exists) for release.yml to read; exit 1 when the version
//       changed but the CHANGELOG has no section, so the run fails loudly instead of releasing
//       without notes.
import { parseArgs } from "jsr:@std/cli@1.0.32/parse-args";
import { errorText, readJson, ROOT, run } from "../lib/repo.ts";
import { SEMVER } from "../generate/lib/plugin.ts";

/** The heading of a released version in Keep a Changelog form: `## [1.2.3] - 2026-01-31`. */
export function changelogHasVersion(changelog: string, version: string): boolean {
    const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`^## \\[${escaped}\\]( - \\d{4}-\\d{2}-\\d{2})?\\s*$`, "m").test(changelog);
}

export async function versionAt(ref: string, root: string): Promise<string | null> {
    try {
        const text = await run("git", ["show", `${ref}:plugin.json`], root);
        const parsed = JSON.parse(text) as { version?: unknown };
        return typeof parsed.version === "string" ? parsed.version : null;
    } catch {
        return null;
    }
}

export async function tagExists(version: string, root: string): Promise<boolean> {
    const output = await run("git", ["tag", "--list", `v${version}`], root);
    return output.trim() !== "";
}

export interface Verdict {
    version: string;
    changed: boolean;
    release: boolean;
    problems: string[];
}

export async function decide(root: string, baseRef: string | null): Promise<Verdict> {
    const manifest = await readJson(`${root}/plugin.json`) as { version?: unknown };
    if (typeof manifest.version !== "string" || !SEMVER.test(manifest.version)) {
        throw new Error('plugin.json "version" must be MAJOR.MINOR.PATCH');
    }
    const version = manifest.version;
    const changelog = await Deno.readTextFile(`${root}/CHANGELOG.md`);
    const hasSection = changelogHasVersion(changelog, version);
    const tagged = await tagExists(version, root);
    const changed = baseRef === null ? !tagged : (await versionAt(baseRef, root)) !== version;
    const problems: string[] = [];
    if (changed && !hasSection) {
        problems.push(
            `CHANGELOG.md has no "## [${version}]" section; add one above the previous release before merging the version bump`,
        );
    }
    if (changed && tagged) {
        problems.push(`tag v${version} already exists; bump plugin.json to a version that has not been released`);
    }
    return { version, changed, release: changed && hasSection && !tagged, problems };
}

export async function main(args: string[], root = ROOT): Promise<number> {
    const flags = parseArgs(args, { boolean: ["main"], string: ["pr"] });
    if (flags.main === Boolean(flags.pr)) {
        console.error("usage: check_release.ts --pr <base-ref> | --main");
        return 2;
    }
    try {
        const verdict = await decide(root, flags.main ? null : flags.pr!);
        if (flags.main) {
            console.log(`version=${verdict.version}`);
            console.log(`release=${verdict.release}`);
        } else if (verdict.changed) {
            console.log(`plugin.json version ${verdict.version} is new; the CHANGELOG section and tag were checked`);
        } else console.log(`plugin.json version ${verdict.version} is unchanged; no release`);
        if (verdict.problems.length > 0) {
            for (const problem of verdict.problems) console.error(`- ${problem}`);
            return 1;
        }
        return 0;
    } catch (error) {
        console.error(`error: ${errorText(error)}`);
        return 1;
    }
}

if (import.meta.main) Deno.exit(await main(Deno.args));
