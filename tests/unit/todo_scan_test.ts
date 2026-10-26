import { assertEquals, assertThrows } from "jsr:@std/assert@1.0.13";
import { dirname, fromFileUrl, join } from "jsr:@std/path@1.1.6";
import { formatReport, parseArgs, parseLine, scanDirectory, scanText, summarize } from "../../lib/todo-scan.mjs";

const SAMPLE = join(dirname(fromFileUrl(import.meta.url)), "..", "fixtures", "sample");

Deno.test("parseLine reads owner and issue in either order and leaves other lines alone", () => {
    assertEquals(parseLine("// TODO(alice): wire it"), { kind: "TODO", owner: "alice", issue: null, text: "wire it" });
    assertEquals(parseLine("# FIXME(#7, bob): x"), { kind: "FIXME", owner: "bob", issue: 7, text: "x" });
    assertEquals(parseLine("TODO: bare"), { kind: "TODO", owner: null, issue: null, text: "bare" });
    assertEquals(parseLine("const byKind = { todo: 0 };"), null);
    assertEquals(parseLine("TODOS: not a marker"), null);
    assertEquals(parseLine("a TODO without a colon"), null);
});

Deno.test("scanText numbers lines from one", () => {
    const entries = scanText("f.js", "a\n// TODO(x): b\nc\n// FIXME: d");
    assertEquals(entries.map((e) => [e.line, e.kind, e.owner]), [[2, "TODO", "x"], [4, "FIXME", null]]);
});

Deno.test("scanDirectory skips excluded directories and binary files", () => {
    const entries = scanDirectory(SAMPLE);
    assertEquals(entries.map((e) => `${e.file}:${e.line}`), [
        "src/app.js:3",
        "src/app.js:4",
        "src/app.js:5",
        "src/app.js:6",
    ]);
    const summary = summarize(entries);
    assertEquals(summary, {
        total: 4,
        byKind: { todo: 3, fixme: 1 },
        byOwner: { alice: 1, bob: 1 },
        unowned: 2,
        linked: 1,
    });
});

Deno.test("formatReport leads with the verdict and honours unownedOnly and limit", () => {
    const entries = scanDirectory(SAMPLE);
    const report = formatReport(entries, { unownedOnly: true });
    const lines = report.split("\n");
    assertEquals(lines[0], "4 marker(s): 3 TODO, 1 FIXME; 2 unowned, 1 linked to an issue.");
    assertEquals(lines.length, 3);
    assertEquals(lines[1].startsWith("src/app.js:5  FIXME(unowned)"), true);
    const limited = formatReport(entries, { limit: 1 }).split("\n");
    assertEquals(limited.at(-1), "... 3 more not shown");
});

Deno.test("parseArgs reads the root and the flags, and rejects an unknown option", () => {
    const options = parseArgs(["--json", "src", "--exclude", "vendor", "--unowned-only"]);
    assertEquals([options.json, options.root, options.unownedOnly, options.excludes.includes("vendor")], [
        true,
        "src",
        true,
        true,
    ]);
    assertThrows(() => parseArgs(["--bogus"]), Error, "unknown option");
    assertThrows(() => parseArgs(["--exclude"]), Error, "--exclude needs");
});
