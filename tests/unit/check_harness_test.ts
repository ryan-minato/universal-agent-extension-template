import { assertEquals } from "jsr:@std/assert@1.0.13";
import { referencedPaths, referencedRecipes } from "../../scripts/validate/check_harness.ts";

Deno.test("referencedPaths takes link targets and path-like inline code, not prose or URLs", () => {
    const text = "See [x](.agents/knowledge/a.md) and `scripts/validate/main.ts`, `just check`, `plugin.json`, " +
        "`integrations/`, `${PLUGIN_ROOT}/mcp/x.mjs`, [h](https://example.com), `rules/*.md`, `.claude/skills/`.";
    assertEquals(referencedPaths(text).sort(), [
        ".agents/knowledge/a.md",
        ".claude/skills/",
        "integrations/",
        "plugin.json",
        "scripts/validate/main.ts",
    ]);
});

Deno.test("referencedRecipes lists the just recipes a document names", () => {
    assertEquals(referencedRecipes("run `just check` then `just generate --check`; not just words"), [
        "check",
        "generate",
    ]);
});

Deno.test("the repository's own harness passes the check", async () => {
    const { main } = await import("../../scripts/validate/check_harness.ts");
    assertEquals(await main(), 0);
});
