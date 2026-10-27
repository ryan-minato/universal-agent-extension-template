import { assert, assertEquals, assertRejects, assertStringIncludes, assertThrows } from "jsr:@std/assert@1.0.13";
import { parse as parseToml } from "jsr:@std/toml@1.0.11";
import { splitFrontmatter } from "../../scripts/lib/frontmatter.ts";
import { claudeAgent, codexAgent, loadOverrides, loadSharedAgents } from "../../scripts/generate/lib/agents.ts";
import { antigravityHookProblems, claudeStyleHookProblems } from "../../scripts/generate/lib/hooks.ts";
import { antigravityMcp, claudeMcp, type McpConfig } from "../../scripts/generate/lib/mcp.ts";
import { loadOverrides as loadManifestOverrides } from "../../scripts/generate/lib/overrides.ts";
import { piPackage } from "../../scripts/generate/lib/pi.ts";
import { manifestProblems, PLUGIN_SCHEMA, type PluginManifest } from "../../scripts/generate/lib/plugin.ts";

const PLUGIN: PluginManifest = {
    $schema: PLUGIN_SCHEMA,
    name: "demo",
    version: "1.2.3",
    description: "d",
    author: { name: "A", url: "https://a.example" },
    homepage: "https://a.example",
    repository: "https://github.com/a/demo",
    license: "MIT",
    keywords: ["k"],
    extensions: {},
};

const AGENT = { name: "reviewer", description: "Reviews.", body: "Do the review.\n" };

Deno.test("manifestProblems enforces the closed field set, the name rules, and the fields the template needs", () => {
    assertEquals(manifestProblems({ ...PLUGIN }), []);
    assertStringIncludes(manifestProblems({ ...PLUGIN, agents: "./agents" }).join("\n"), 'unknown field "agents"');
    assertStringIncludes(manifestProblems({ ...PLUGIN, name: "claude-x" }).join("\n"), "refused by Claude Code");
    assertStringIncludes(manifestProblems({ ...PLUGIN, name: "Bad_Name" }).join("\n"), '"name" must be');
    assertStringIncludes(manifestProblems({ ...PLUGIN, version: "1.2" }).join("\n"), "not Semantic Versioning");
    assertStringIncludes(manifestProblems({ ...PLUGIN, extensions: { openai: {} } }).join("\n"), "reverse-domain");
});

Deno.test("claudeAgent merges the override into the front matter and keeps the body", () => {
    const text = claudeAgent(AGENT, { tools: ["Read"], model: "inherit", body_append: "Never edit." });
    const doc = splitFrontmatter(text);
    assertEquals(doc.data, { name: "reviewer", description: "Reviews.", tools: ["Read"], model: "inherit" });
    assertEquals(doc.body, "Do the review.\n\nNever edit.\n");
    assertStringIncludes(text, "# generated-by: todo-tracker");
});

Deno.test("codexAgent writes the three required fields and the override, and refuses a body with '''", () => {
    const text = codexAgent(AGENT, { model_reasoning_effort: "low", features: { shell_tool: false } });
    const parsed = parseToml(text) as Record<string, unknown>;
    assertEquals(parsed.name, "reviewer");
    assertEquals(parsed.developer_instructions, "Do the review.\n");
    assertEquals(parsed.features, { shell_tool: false });
    assertThrows(() => codexAgent({ ...AGENT, body: "x ''' y" }), Error, "'''");
});

Deno.test("shared agents and overrides are validated against their allow lists", async () => {
    const root = await Deno.makeTempDir();
    await Deno.mkdir(`${root}/agents`);
    await Deno.writeTextFile(`${root}/agents/bad.md`, "---\nname: bad\ndescription: x\ntools: [Read]\n---\nbody\n");
    await assertRejects(() => loadSharedAgents(root), Error, "front matter key(s) tools");
    await Deno.writeTextFile(`${root}/agents/bad.md`, "---\nname: good\ndescription: x\n---\nbody\n");
    await assertRejects(() => loadSharedAgents(root), Error, 'must equal the file name "bad"');
    await Deno.writeTextFile(`${root}/agents/bad.md`, "---\nname: bad\ndescription: x\n---\nbody\n");
    const shared = await loadSharedAgents(root);
    await Deno.mkdir(`${root}/integrations/codex/agents`, { recursive: true });
    await Deno.writeTextFile(`${root}/integrations/codex/agents/bad.override.yaml`, "tools: [Read]\n");
    await assertRejects(() => loadOverrides(root, "codex", shared), Error, 'sets "tools"; codex accepts');
    await Deno.writeTextFile(`${root}/integrations/codex/agents/other.override.yaml`, "model: x\n");
    await assertRejects(() => loadOverrides(root, "codex", shared), Error, "agents/other.md does not exist");
});

Deno.test("manifest overrides reject public fields and unknown fields", async () => {
    const root = await Deno.makeTempDir();
    await Deno.mkdir(`${root}/integrations/antigravity`, { recursive: true });
    await Deno.writeTextFile(`${root}/integrations/antigravity/overrides.yaml`, "name: x\nfoo: 1\n");
    const error = await assertRejects(() => loadManifestOverrides(root, "antigravity"), Error);
    assertStringIncludes(error.message, 'sets "name", which plugin.json already owns');
    assertStringIncludes(error.message, 'unknown field "foo"');
});

Deno.test("mcp conversions substitute the placeholder and refuse what a framework cannot express", () => {
    const config: McpConfig = {
        mcpServers: {
            a: { type: "stdio", command: "node", args: ["${PLUGIN_ROOT}/s.mjs"], env: { X: "${PLUGIN_ROOT}/d" } },
            b: { type: "streamable-http", url: "https://h.example/mcp", headers: { A: "1" } },
        },
    };
    assertEquals(claudeMcp(config), {
        mcpServers: {
            a: { command: "node", args: ["${CLAUDE_PLUGIN_ROOT}/s.mjs"], env: { X: "${CLAUDE_PLUGIN_ROOT}/d" } },
            b: { type: "http", url: "https://h.example/mcp", headers: { A: "1" } },
        },
    });
    assertEquals(antigravityMcp(config), {
        mcpServers: {
            a: { command: "node", args: ["${extensionPath}/s.mjs"], env: { X: "${extensionPath}/d" } },
            b: { serverUrl: "https://h.example/mcp", headers: { A: "1" } },
        },
    });
    assertThrows(() => antigravityMcp({ mcpServers: { c: { type: "sse", url: "https://h.example" } } }), Error, "sse");
});

Deno.test("hook files are checked for their framework's shape", () => {
    const claude = { hooks: { PostToolUse: [{ matcher: "Write", hooks: [{ type: "command", command: "node x" }] }] } };
    assertEquals(claudeStyleHookProblems("h", claude, "claude-code"), []);
    assertStringIncludes(
        claudeStyleHookProblems("h", { hooks: { Bogus: [] } }, "codex").join(),
        "not a codex hook event",
    );
    assertStringIncludes(
        claudeStyleHookProblems("h", { hooks: { PostToolUse: [{ hooks: [] }] } }, "codex").join(),
        "non-empty array",
    );
    const ag = {
        mine: {
            PostToolUse: [{ matcher: "x", hooks: [{ type: "command", command: "./s.mjs" }] }],
            SessionStart: [{ command: "./i.sh" }],
        },
    };
    assertEquals(antigravityHookProblems("h", ag), []);
    assertStringIncludes(antigravityHookProblems("h", claude).join(), 'top-level "hooks" key');
});

Deno.test("piPackage derives the package from the manifest and the patch", () => {
    const pkg = piPackage(PLUGIN, { name: "@a/demo", keywords: ["pi-package", "k"], pi: { skills: ["./skills"] } });
    assertEquals(pkg.name, "@a/demo");
    assertEquals(pkg.version, "1.2.3");
    assertEquals(pkg.keywords, ["k", "pi-package"]);
    assertEquals(pkg.repository, { type: "git", url: "git+https://github.com/a/demo.git" });
    assert(pkg.pi !== undefined);
});
