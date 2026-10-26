#!/usr/bin/env -S deno run --allow-read --allow-run=git
// Lists every tracked file that still names the template's sample plugin, owner, or repository, so an
// adopter sees what the rename missed. Archived OpenSpec changes are skipped: they are history.
//
//   adopt_checklist.ts [--name <old plugin name>] [--owner <old owner>] [--repo <old repo name>]
import { parseArgs } from "jsr:@std/cli@1.0.32/parse-args";

const flags = parseArgs(Deno.args, {
    string: ["name", "owner", "repo"],
    default: { name: "todo-tracker", owner: "ryan-minato", repo: "universal-agent-extension-template" },
});
const needles = [flags.name, flags.owner, flags.repo].filter((n) => n.length > 0);
const listing = await new Deno.Command("git", { args: ["ls-files", "-z"], stdout: "piped" }).output();
if (!listing.success) {
    console.error("error: git ls-files failed; run this inside the repository");
    Deno.exit(1);
}
const files = new TextDecoder().decode(listing.stdout).split("\0").filter((f) =>
    f && !f.startsWith("openspec/changes/archive/")
);
let hits = 0;
for (const file of files) {
    let text: string;
    try {
        text = await Deno.readTextFile(file);
    } catch {
        continue; // a symbolic link to a directory, or a file removed from the tree
    }
    text.split("\n").forEach((line, index) => {
        for (const needle of needles) {
            if (line.includes(needle)) {
                hits++;
                console.log(`${file}:${index + 1}: ${needle}`);
            }
        }
    });
}
console.log(hits === 0 ? "No leftover template names." : `${hits} occurrence(s) to rename or explain.`);
Deno.exit(hits === 0 ? 0 : 1);
