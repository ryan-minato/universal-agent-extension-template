import { assertEquals, assertThrows } from "jsr:@std/assert@1.0.13";
import { applyToLine, plan } from "../../skills/todo-triage/scripts/apply-decisions.mjs";

Deno.test("applyToLine rewrites only the parentheses and keeps the rest of the line", () => {
    assertEquals(
        applyToLine("  // TODO: fix it", { file: "f", line: 1, action: "assign", owner: "alice" }),
        "  // TODO(alice): fix it",
    );
    assertEquals(
        applyToLine("# FIXME(bob): x", { file: "f", line: 1, action: "link", issue: 7 }),
        "# FIXME(bob, #7): x",
    );
    assertEquals(
        applyToLine("// TODO(bob, #7): x", { file: "f", line: 1, action: "assign", owner: "eve" }),
        "// TODO(eve, #7): x",
    );
    assertEquals(applyToLine("// TODO: x", { file: "f", line: 1, action: "delete" }), null);
    assertThrows(
        () => applyToLine("const todo = 1;", { file: "f", line: 1, action: "delete" }),
        Error,
        "holds no TODO/FIXME marker",
    );
    assertThrows(() => applyToLine("// TODO: x", { file: "f", line: 1, action: "assign" }), Error, "needs an owner");
});

Deno.test("plan groups decisions by file and refuses before writing on a bad decision", () => {
    const files: Record<string, string> = { "a.js": "x\n// TODO: one\n// FIXME: two\nend\n" };
    const edits = plan(
        [{ file: "a.js", line: 2, action: "assign", owner: "al" }, { file: "a.js", line: 3, action: "delete" }],
        (path: string) => files[path],
    );
    assertEquals(edits.length, 1);
    assertEquals(edits[0].content, "x\n// TODO(al): one\nend\n");
    assertThrows(
        () => plan([{ file: "a.js", line: 9, action: "delete" }], (path: string) => files[path]),
        Error,
        "out of range",
    );
});
