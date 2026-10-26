import { assertEquals } from "jsr:@std/assert@1.0.13";
import { handleMessage, PROTOCOL_VERSION, TOOLS } from "../../lib/mcp-server.mjs";

// The server is plain JavaScript; the tests read its JSON-RPC answers as untyped objects.
// deno-lint-ignore no-explicit-any
type Any = any;

const deps = {
    scan: (
        root: string,
    ) => [{ file: `${root}/a.js`, line: 1, kind: "TODO" as const, owner: null, issue: null, text: "x" }],
    env: {},
    cwd: "/work",
};

const call = (message: Record<string, unknown>, injected: Any = deps): Any => handleMessage(message as Any, injected);

Deno.test("initialize answers with the protocol version and the tools capability", () => {
    const response = call({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} });
    assertEquals(response.result.protocolVersion, PROTOCOL_VERSION);
    assertEquals(response.result.capabilities, { tools: {} });
});

Deno.test("notifications get no answer", () => {
    assertEquals(call({ jsonrpc: "2.0", method: "notifications/initialized" }), null);
});

Deno.test("tools/list lists list_todos and tools/call scans the cwd by default", () => {
    assertEquals(call({ jsonrpc: "2.0", id: 2, method: "tools/list" }).result.tools, TOOLS);
    const answer = call({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "list_todos", arguments: {} } });
    assertEquals(answer.result.structuredContent.summary.unowned, 1);
    assertEquals(answer.result.content[0].text.split("\n")[1].startsWith("/work/a.js:1  TODO(unowned) x"), true);
});

Deno.test("an unknown tool or method is a JSON-RPC error", () => {
    assertEquals(call({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "nope" } }).error.code, -32602);
    assertEquals(call({ jsonrpc: "2.0", id: 5, method: "resources/list" }).error.code, -32601);
});

Deno.test("a scan failure is reported as a tool error, not a protocol error", () => {
    const failing = {
        ...deps,
        scan: () => {
            throw new Error("boom");
        },
    };
    const answer = call({ jsonrpc: "2.0", id: 6, method: "tools/call", params: { name: "list_todos" } }, failing);
    assertEquals(answer.result.isError, true);
});
