#!/usr/bin/env -S deno run --allow-read
// Prints the CHANGELOG.md section of one version (without its heading) so release.yml can put it at
// the top of the GitHub Release notes, ahead of the generated list of pull requests.
//
//   scripts/release/changelog_section.ts <version>
import { ROOT } from "../lib/repo.ts";

export function sectionOf(changelog: string, version: string): string | null {
    const lines = changelog.split("\n");
    const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const heading = new RegExp(`^## \\[${escaped}\\]`);
    const start = lines.findIndex((line) => heading.test(line));
    if (start < 0) return null;
    let end = lines.length;
    for (let i = start + 1; i < lines.length; i++) {
        if (/^## /.test(lines[i])) {
            end = i;
            break;
        }
    }
    return lines.slice(start + 1, end).join("\n").trim() + "\n";
}

if (import.meta.main) {
    const version = Deno.args[0];
    if (!version) {
        console.error("usage: changelog_section.ts <version>");
        Deno.exit(2);
    }
    const section = sectionOf(await Deno.readTextFile(`${ROOT}/CHANGELOG.md`), version);
    if (section === null) {
        console.error(`error: CHANGELOG.md has no "## [${version}]" section`);
        Deno.exit(1);
    }
    console.log(section);
}
