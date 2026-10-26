// The smoke runner's own contract: an unknown framework is a usage error, a missing CLI exits 2 with
// the manual steps, and the Codex installer dry run touches nothing.
import { assert, assertEquals } from "jsr:@std/assert@1.0.13";
import { ROOT } from "../../scripts/lib/repo.ts";

async function runSmoke(args: string[], path = "/usr/bin:/bin"): Promise<{ code: number; out: string }> {
    const output = await new Deno.Command(Deno.execPath(), {
        args: ["run", "--allow-read", "--allow-run", "--allow-env=PATH,HOME", `${ROOT}/scripts/test/smoke.ts`, ...args],
        env: { PATH: path },
        stdout: "piped",
        stderr: "piped",
    }).output();
    return {
        code: output.code,
        out: new TextDecoder().decode(output.stdout) + new TextDecoder().decode(output.stderr),
    };
}

Deno.test("smoke.ts rejects an unknown framework", async () => {
    const { code, out } = await runSmoke(["vim"]);
    assertEquals(code, 2);
    assert(out.includes("usage"));
});

Deno.test("smoke.ts exits 2 with manual steps when the CLI is absent", async () => {
    const { code, out } = await runSmoke(["pi"], "/nonexistent");
    assertEquals(code, 2);
    assert(out.includes("NOT run") && out.includes("pi install"));
});

Deno.test("install-agents.mjs --dry-run plans the project install without writing", async () => {
    const cwd = await Deno.makeTempDir();
    const output = await new Deno.Command("node", {
        args: [`${ROOT}/integrations/codex/scripts/install-agents.mjs`, "--scope", "project", "--dry-run"],
        cwd,
        stdout: "piped",
        stderr: "piped",
    }).output();
    assertEquals(output.code, 0, new TextDecoder().decode(output.stderr));
    assert(new TextDecoder().decode(output.stdout).includes("would write"));
    let created = false;
    try {
        await Deno.stat(`${cwd}/.codex`);
        created = true;
    } catch { /* expected: nothing written */ }
    assertEquals(created, false);
});
