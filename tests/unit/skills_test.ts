import { assert, assertEquals } from "jsr:@std/assert@1.0.13";
import { skillDirectoryProblems, skillsRootProblems } from "../../scripts/lib/skills.ts";

async function skill(files: Record<string, string>): Promise<string> {
    const root = await Deno.makeTempDir();
    for (const [path, text] of Object.entries(files)) {
        const full = `${root}/${path}`;
        await Deno.mkdir(full.slice(0, full.lastIndexOf("/")), { recursive: true });
        await Deno.writeTextFile(full, text);
    }
    return root;
}

const GOOD = `---
name: sample
description: Counts the markers of a file. Use when asked how many markers a file has. Not for editing them.
---

1. Run [scripts/count.mjs](scripts/count.mjs) on the file.
`;

Deno.test("a skill that follows the rules has no problems", async () => {
    const root = await skill({ "sample/SKILL.md": GOOD, "sample/scripts/count.mjs": "" });
    assertEquals(await skillDirectoryProblems(`${root}/sample`, "skills/sample"), []);
});

Deno.test("a description without a trigger clause or with a filler opening is reported", async () => {
    const root = await skill({
        "sample/SKILL.md": GOOD.replace(
            /description: .*/,
            "description: This skill helps with counting the markers of a file.",
        ),
        "sample/scripts/count.mjs": "",
    });
    const problems = await skillDirectoryProblems(`${root}/sample`, "skills/sample");
    assert(problems.some((p) => p.includes("opens with filler")), problems.join("\n"));
    assert(problems.some((p) => p.includes("no trigger clause")), problems.join("\n"));
});

Deno.test("an unlinked bundled file, an outside link, a README, and an empty bundle directory are reported", async () => {
    const root = await skill({
        "sample/SKILL.md": GOOD.replace("[scripts/count.mjs](scripts/count.mjs)", "[the lib](../lib/count.mjs)"),
        "sample/scripts/count.mjs": "",
        "sample/README.md": "",
        "sample/assets/.keep": "",
    });
    const problems = await skillDirectoryProblems(`${root}/sample`, "skills/sample");
    assert(problems.some((p) => p.includes("never links scripts/count.mjs")), problems.join("\n"));
    assert(problems.some((p) => p.includes("outside the skill")), problems.join("\n"));
    assert(problems.some((p) => p.includes("README.md exists")), problems.join("\n"));
    assertEquals(problems.filter((p) => p.includes("is empty")).length, 0, "a dotfile counts as a file");
});

Deno.test("the skills root reports stray files and honours the skip predicate", async () => {
    const root = await skill({
        "sample/SKILL.md": GOOD,
        "sample/scripts/count.mjs": "",
        "stray.txt": "",
        ".marker": "",
    });
    const problems = await skillsRootProblems(root, "skills", (name) => name.startsWith("."));
    assertEquals(problems, ["skills/stray.txt is a file; skills/ holds only <name>/SKILL.md directories"]);
});
