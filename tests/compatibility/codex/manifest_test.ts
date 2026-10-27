// Shape of the Codex entry points: the portable manifest's com.openai extension, the native
// fallback manifest, and the generated agent roles.
import { assert, assertEquals } from "jsr:@std/assert@1.0.13";
import { parse as parseToml } from "jsr:@std/toml@1.0.11";
import { exists, listFiles, readJson, ROOT } from "../../../scripts/lib/repo.ts";

Deno.test("plugin.json routes Codex hooks through extensions com.openai to an existing file", async () => {
    const manifest = await readJson(`${ROOT}/plugin.json`) as { extensions: { "com.openai": { hooks: string } } };
    const hooks = manifest.extensions["com.openai"].hooks;
    assert(hooks.startsWith("./") && await exists(`${ROOT}/${hooks.slice(2)}`));
});

Deno.test("the native fallback manifest repeats the public fields and names its components", async () => {
    const native = await readJson(`${ROOT}/.codex-plugin/plugin.json`) as Record<string, unknown>;
    const portable = await readJson(`${ROOT}/plugin.json`) as Record<string, unknown>;
    for (const key of ["name", "version", "description", "license"]) assertEquals(native[key], portable[key]);
    for (const key of ["skills", "mcpServers", "hooks"]) {
        const path = native[key] as string;
        assert(await exists(`${ROOT}/${path.slice(2)}`), `${key} -> ${path}`);
    }
});

Deno.test("every generated Codex role has the three required fields and the install marker", async () => {
    const files = await listFiles(`${ROOT}/.codex/agents`, ".toml");
    assert(files.length > 0);
    for (const file of files) {
        const text = await Deno.readTextFile(`${ROOT}/.codex/agents/${file}`);
        assert(text.includes("# generated-by: todo-tracker"), `${file} carries the marker install-agents.mjs checks`);
        const role = parseToml(text) as Record<string, unknown>;
        assertEquals(role.name, file.slice(0, -5));
        for (const key of ["description", "developer_instructions"]) {
            assertEquals(typeof role[key], "string", `${file}: ${key}`);
        }
    }
});

Deno.test("the marketplace file names this repository as the plugin's source", async () => {
    const marketplace = await readJson(`${ROOT}/.agents/plugins/marketplace.json`) as {
        name: string;
        plugins: { name: string; source: { source: string; path: string } }[];
    };
    const portable = await readJson(`${ROOT}/plugin.json`) as { name: string };
    assertEquals(marketplace.name, portable.name);
    assertEquals(marketplace.plugins.map((p) => p.name), [portable.name]);
    assertEquals(marketplace.plugins[0].source, { source: "local", path: "./" });
});
