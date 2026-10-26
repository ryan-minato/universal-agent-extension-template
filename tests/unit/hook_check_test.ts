import { assertEquals, assertStringIncludes } from "jsr:@std/assert@1.0.13";
import { dirname, fromFileUrl, join } from "jsr:@std/path@1.1.6";
import { unownedReminder } from "../../lib/hook-todo-check.mjs";

const SAMPLE = join(dirname(fromFileUrl(import.meta.url)), "..", "fixtures", "sample");

Deno.test("unownedReminder names the unowned markers of a file and nothing for a clean or missing file", () => {
    const reminder = unownedReminder(join(SAMPLE, "src", "app.js"))!;
    assertStringIncludes(reminder, "2 unowned TODO/FIXME marker(s)");
    assertStringIncludes(reminder, "line 5: FIXME: this leaks the handle on error");
    assertEquals(unownedReminder(join(SAMPLE, "README.md")), null);
    assertEquals(unownedReminder(join(SAMPLE, "does-not-exist.js")), null);
});
