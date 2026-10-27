// Shape of the Antigravity entry points: the manifest folder, the root hooks.json and rules/, and
// mcp_config.json. The shared agents under agents/ are what Antigravity loads, unchanged.
import { assert, assertEquals } from "jsr:@std/assert@1.0.13";
import { splitFrontmatter } from "../../../scripts/lib/frontmatter.ts";
import { listFiles, readJson, ROOT } from "../../../scripts/lib/repo.ts";
import { TRIGGERS } from "../../../scripts/generate/lib/rules.ts";

Deno.test("the Antigravity manifest carries the schema, a name without dots, and the display fields", async () => {
    const manifest = await readJson(`${ROOT}/.antigravity-plugin/plugin.json`) as Record<string, unknown>;
    assertEquals(manifest.$schema, "https://antigravity.google/schemas/v1/plugin.json");
    assert(/^[a-zA-Z0-9_-]+$/.test(manifest.name as string));
    assertEquals(typeof manifest.displayName, "string");
});

Deno.test("hooks.json is a map of named hooks whose events Antigravity knows", async () => {
    const hooks = await readJson(`${ROOT}/hooks.json`) as Record<string, Record<string, unknown>>;
    assert(!("hooks" in hooks));
    for (const hook of Object.values(hooks)) {
        for (const event of Object.keys(hook)) {
            assert(
                ["enabled", "SessionStart", "PreToolUse", "PostToolUse", "PreInvocation", "PostInvocation", "Stop"]
                    .includes(event),
                event,
            );
        }
    }
});

Deno.test("every rule under rules/ has a trigger and equals its source", async () => {
    const files = await listFiles(`${ROOT}/rules`, ".md");
    assert(files.length > 0);
    for (const file of files) {
        const content = await Deno.readTextFile(`${ROOT}/rules/${file}`);
        assertEquals(content, await Deno.readTextFile(`${ROOT}/integrations/antigravity/rules/${file}`));
        assert(TRIGGERS.includes(splitFrontmatter(content).data.trigger as string));
    }
});

Deno.test("the shared agents carry only name and description, so Antigravity loads them as written", async () => {
    for (const file of await listFiles(`${ROOT}/agents`, ".md")) {
        const { data } = splitFrontmatter(await Deno.readTextFile(`${ROOT}/agents/${file}`), file);
        assertEquals(Object.keys(data).sort(), ["description", "name"]);
    }
});

Deno.test("mcp_config.json uses command/args and the extensionPath variable", async () => {
    const mcp = await readJson(`${ROOT}/mcp_config.json`) as {
        mcpServers: Record<string, { command: string; args?: string[] }>;
    };
    for (const server of Object.values(mcp.mcpServers)) {
        assertEquals(typeof server.command, "string");
        assert(!(server.args ?? []).join(" ").includes("${PLUGIN_ROOT}"));
    }
});
