// Shape of the generated Claude Code files, as the plugin manifest reference documents them.
import { assert, assertEquals } from "jsr:@std/assert@1.0.13";
import { splitFrontmatter } from "../../../scripts/lib/frontmatter.ts";
import { exists, listFiles, readJson, ROOT } from "../../../scripts/lib/repo.ts";

Deno.test("the Claude manifest lists its agents explicitly and points at existing component paths", async () => {
    const manifest = await readJson(`${ROOT}/.claude-plugin/plugin.json`) as Record<string, unknown>;
    assertEquals(manifest.name, (await readJson(`${ROOT}/plugin.json`) as { name: string }).name);
    assert(Array.isArray(manifest.agents) && manifest.agents.length > 0, "agents is a non-empty list of files");
    for (const path of manifest.agents as string[]) {
        assert(path.startsWith("./") && path.endsWith(".md"), `${path} is a ./-relative .md file`);
        assert(await exists(`${ROOT}/${path.slice(2)}`), `${path} exists`);
    }
    for (const key of ["commands", "hooks"]) {
        const path = manifest[key] as string;
        assert(path.startsWith("./") && await exists(`${ROOT}/${path.slice(2)}`), `${key} -> ${path} exists`);
    }
    assertEquals(manifest.$schema, undefined, "the Claude manifest carries no Agent Plugins $schema");
});

Deno.test("every generated Claude agent has name and description and only documented fields", async () => {
    const allowed = new Set([
        "name",
        "description",
        "tools",
        "disallowedTools",
        "model",
        "effort",
        "maxTurns",
        "skills",
        "memory",
        "background",
        "color",
    ]);
    for (const file of await listFiles(`${ROOT}/.claude-plugin/agents`, ".md")) {
        const { data, body } = splitFrontmatter(await Deno.readTextFile(`${ROOT}/.claude-plugin/agents/${file}`), file);
        assertEquals(data.name, file.slice(0, -3));
        assertEquals(typeof data.description, "string");
        for (const key of Object.keys(data)) assert(allowed.has(key), `${file}: ${key} is a documented agent field`);
        assert(body.trim().length > 0);
    }
});

Deno.test(".mcp.json uses the Claude placeholder and the hooks file has the hooks envelope", async () => {
    const mcp = await readJson(`${ROOT}/.mcp.json`) as { mcpServers: Record<string, { args?: string[] }> };
    const args = Object.values(mcp.mcpServers).flatMap((s) => s.args ?? []).join(" ");
    assert(args.includes("${CLAUDE_PLUGIN_ROOT}") && !args.includes("${PLUGIN_ROOT}"));
    const hooks = await readJson(`${ROOT}/integrations/claude-code/hooks/hooks.json`) as {
        hooks: Record<string, unknown>;
    };
    assert(typeof hooks.hooks === "object");
});
