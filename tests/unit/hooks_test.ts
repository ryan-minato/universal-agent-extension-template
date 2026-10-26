// The three frameworks' hook scripts each carry their own minimal unowned-marker check; this test
// holds all three to the same fixture so the format they detect stays the one todo-format.md defines.
import { assertEquals, assertStringIncludes } from "jsr:@std/assert@1.0.13";
import { dirname, fromFileUrl, join } from "jsr:@std/path@1.1.6";
import * as antigravity from "../../integrations/antigravity/hooks/scripts/post-edit-todo.mjs";
import * as claude from "../../integrations/claude-code/hooks/scripts/post-edit-todo.mjs";
import * as codex from "../../integrations/codex/hooks/scripts/post-edit-todo.mjs";
import { ROOT } from "../../scripts/lib/repo.ts";

const SAMPLE = join(dirname(fromFileUrl(import.meta.url)), "..", "fixtures", "sample", "src", "app.js");
const SAMPLE_TEXT = Deno.readTextFileSync(SAMPLE);

for (const [name, hook] of Object.entries({ antigravity, claude, codex })) {
    Deno.test(`${name} hook detects the fixture's two unowned markers and nothing else`, () => {
        assertEquals(hook.unownedLines(SAMPLE_TEXT), [5, 6]);
        assertEquals(hook.unownedLines("// TODO(alice): owned\nconst byKind = { todo: 0 };\nTODOS: no\n"), []);
        const reminder = hook.reminderFor(SAMPLE)!;
        assertStringIncludes(reminder, "2 TODO/FIXME marker(s) without an owner (line 5, 6)");
        assertStringIncludes(reminder, "scan_file");
        assertEquals(hook.reminderFor(join(ROOT, "does-not-exist.js")), null);
        assertEquals(hook.reminderFor("clean.js", () => "nothing here\n"), null);
    });
}

Deno.test("the codex and antigravity hooks read every documented file field", () => {
    assertEquals(codex.filesOf({ file_path: "a", path: "b", files: ["c", 1] }), ["a", "b", "c"]);
    assertEquals(codex.filesOf(undefined), []);
    assertEquals(antigravity.filesOf({ TargetFile: "x", path: "y" }), ["x", "y"]);
});

Deno.test("each hook script runs end to end on its framework's stdin shape", async () => {
    const run = async (script: string, stdin: string) => {
        const child = new Deno.Command("node", {
            args: [`${ROOT}/${script}`],
            stdin: "piped",
            stdout: "piped",
            stderr: "piped",
        }).spawn();
        const writer = child.stdin.getWriter();
        await writer.write(new TextEncoder().encode(stdin));
        await writer.close();
        const out = await child.output();
        return { out: new TextDecoder().decode(out.stdout), err: new TextDecoder().decode(out.stderr), code: out.code };
    };
    const claudeRun = await run(
        "integrations/claude-code/hooks/scripts/post-edit-todo.mjs",
        JSON.stringify({ tool_input: { file_path: SAMPLE } }),
    );
    assertEquals(claudeRun.code, 0);
    assertStringIncludes(JSON.parse(claudeRun.out).hookSpecificOutput.additionalContext, "2 TODO/FIXME");
    const codexRun = await run(
        "integrations/codex/hooks/scripts/post-edit-todo.mjs",
        JSON.stringify({ tool_input: { files: [SAMPLE] } }),
    );
    assertStringIncludes(JSON.parse(codexRun.out).systemMessage, "$todo-triage");
    const agRun = await run(
        "integrations/antigravity/hooks/scripts/post-edit-todo.mjs",
        JSON.stringify({ toolCall: { args: { TargetFile: SAMPLE } } }),
    );
    assertEquals(agRun.out.trim(), "{}");
    assertStringIncludes(agRun.err, "2 TODO/FIXME");
    const clean = await run(
        "integrations/claude-code/hooks/scripts/post-edit-todo.mjs",
        JSON.stringify({ tool_input: { file_path: `${ROOT}/README.md` } }),
    );
    assertEquals(clean.out, "");
});
