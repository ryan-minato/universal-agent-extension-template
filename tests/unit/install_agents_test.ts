import { assertEquals, assertThrows } from "jsr:@std/assert@1.0.13";
import { join } from "jsr:@std/path@1.1.6";
import { MARKER, parseArgs, plan, targetDirectory } from "../../integrations/codex/scripts/install-agents.mjs";

function setup(): { source: string; target: string } {
    const dir = Deno.makeTempDirSync({ prefix: "install-agents-" });
    const source = join(dir, "source");
    const target = join(dir, "target");
    Deno.mkdirSync(source);
    Deno.mkdirSync(target);
    Deno.writeTextFileSync(join(source, "a.toml"), `${MARKER}\nname = "a"\n`);
    Deno.writeTextFileSync(join(source, "b.toml"), `${MARKER}\nname = "b"\n`);
    return { source, target };
}

Deno.test("parseArgs requires a scope and rejects unknown options", () => {
    assertEquals(parseArgs(["--scope", "user", "--dry-run"]), {
        scope: "user" as string | null,
        uninstall: false,
        dryRun: true,
    });
    assertThrows(() => parseArgs([]), Error, "--scope");
    assertThrows(() => parseArgs(["--scope", "global"]), Error, "user or project");
    assertThrows(() => parseArgs(["--scope", "user", "--force"]), Error, "unknown option");
});

Deno.test("targetDirectory is ~/.codex/agents for user and ./.codex/agents for project", () => {
    assertEquals(targetDirectory("user", "/w", "/home/me"), "/home/me/.codex/agents");
    assertEquals(targetDirectory("project", "/w", "/home/me"), "/w/.codex/agents");
});

Deno.test("plan writes new files, updates marked ones, and never touches hand-written ones", () => {
    const { source, target } = setup();
    Deno.writeTextFileSync(join(target, "a.toml"), `${MARKER}\nname = "a"\nmodel = "old"\n`);
    Deno.writeTextFileSync(join(target, "b.toml"), `name = "b"\n# written by hand\n`);
    const actions = plan(source, target, false);
    assertEquals(actions.map((a) => [a.kind, a.reason]), [["write", "update"], [
        "skip",
        "exists and was not written by this plugin",
    ]]);
});

Deno.test("plan uninstall removes only marked files and refuses a source without the marker", () => {
    const { source, target } = setup();
    Deno.writeTextFileSync(join(target, "a.toml"), `${MARKER}\nname = "a"\n`);
    Deno.writeTextFileSync(join(target, "b.toml"), `name = "b"\n`);
    assertEquals(plan(source, target, true).map((a) => a.kind), ["remove", "skip"]);
    Deno.writeTextFileSync(join(source, "c.toml"), `name = "c"\n`);
    assertThrows(() => plan(source, target, false), Error, "lacks the marker");
});
