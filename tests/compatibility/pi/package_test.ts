// Shape of the generated Pi package: the pi key names existing components, and the extension and
// prompt files are present. Pi itself is not run (compatibility tier).
import { assert, assertEquals } from "jsr:@std/assert@1.0.13";
import { expandGlob } from "jsr:@std/fs@1.0.24/expand-glob";
import { exists, readJson, ROOT } from "../../../scripts/lib/repo.ts";

Deno.test("package.json declares the pi components and every path resolves", async () => {
    const pkg = await readJson(`${ROOT}/package.json`) as {
        name: string;
        version: string;
        keywords: string[];
        pi: Record<string, string[]>;
    };
    assertEquals(pkg.version, (await readJson(`${ROOT}/plugin.json`) as { version: string }).version);
    assert(pkg.keywords.includes("pi-package"));
    for (const [kind, patterns] of Object.entries(pkg.pi)) {
        for (const pattern of patterns) {
            if (pattern.includes("*")) {
                const matches = [];
                for await (const match of expandGlob(pattern, { root: ROOT })) matches.push(match.path);
                assert(matches.length > 0, `${kind}: ${pattern} matches a file`);
            } else assert(await exists(`${ROOT}/${pattern.slice(2)}`), `${kind}: ${pattern} exists`);
        }
    }
});
