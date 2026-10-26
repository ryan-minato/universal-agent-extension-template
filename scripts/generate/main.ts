#!/usr/bin/env -S deno run --allow-read --allow-write
// Generates every native entry file from the sources (.agents/knowledge/architecture.md, Generated
// files): the framework manifests, the Claude Code agents, the Codex agent roles, the MCP copies,
// Antigravity's hooks.json and rules/, and the Pi package.json. Generated files are committed; this
// script is the only thing that writes them.
//
//   scripts/generate/main.ts            write what changed, delete stale generated files
//   scripts/generate/main.ts --check    exit 1 when a generated file differs or is stale; write nothing
import { parseArgs } from "jsr:@std/cli@1.0.32/parse-args";
import { dirname } from "jsr:@std/path@1.1.6";
import { errorText, exists, listFiles, ROOT } from "../lib/repo.ts";
import {
    antigravityAgentProblems,
    claudeAgent,
    codexAgent,
    hasIntegration,
    loadOverrides as loadAgentOverrides,
    loadSharedAgents,
    platformOnlyAgents,
} from "./lib/agents.ts";
import { loadHooks } from "./lib/hooks.ts";
import { antigravityManifest, claudeManifest, codexManifest } from "./lib/manifests.ts";
import { antigravityMcp, claudeMcp, loadMcp } from "./lib/mcp.ts";
import { loadPlugin } from "./lib/plugin.ts";
import { loadPiPatch, piPackage } from "./lib/pi.ts";
import { loadRules } from "./lib/rules.ts";

export interface Output {
    path: string;
    content: string;
}

/** Directories whose every file is generated: a file there that the plan does not produce is stale. */
export const MANAGED_DIRS = [".claude-plugin/agents", ".codex/agents", "rules"];

const json = (value: unknown) => JSON.stringify(value, null, 2) + "\n";

/** Computes every generated file from the sources under `root`; throws with every problem found. */
export async function generateAll(root = ROOT): Promise<Output[]> {
    const plugin = await loadPlugin(root);
    const shared = await loadSharedAgents(root);
    const outputs: Output[] = [];
    const planned = () => new Set(outputs.map((o) => o.path));

    // MCP copies first: the native manifests may point at them.
    const mcp = await loadMcp(root);
    if (mcp !== null) {
        if (await hasIntegration(root, "claude-code")) {
            outputs.push({ path: ".mcp.json", content: json(claudeMcp(mcp)) });
        }
        if (await hasIntegration(root, "antigravity")) {
            outputs.push({ path: "mcp_config.json", content: json(antigravityMcp(mcp)) });
        }
    }

    if (await hasIntegration(root, "claude-code")) {
        const overrides = await loadAgentOverrides(root, "claude-code", shared);
        const only = await platformOnlyAgents(root, shared);
        const agentFiles = [
            ...shared.map((agent) => ({
                path: `.claude-plugin/agents/${agent.name}.md`,
                content: claudeAgent(agent, overrides.get(agent.name)),
            })),
            ...only.claude.map((agent) => ({ path: `.claude-plugin/agents/${agent.name}.md`, content: agent.content })),
        ];
        outputs.push(...agentFiles);
        await loadHooks(root, "claude-code");
        outputs.push({
            path: ".claude-plugin/plugin.json",
            content: json(await claudeManifest(root, plugin, agentFiles.map((file) => `./${file.path}`), planned())),
        });
    }

    if (await hasIntegration(root, "codex")) {
        const overrides = await loadAgentOverrides(root, "codex", shared);
        const only = await platformOnlyAgents(root, shared);
        outputs.push(
            ...shared.map((agent) => ({
                path: `.codex/agents/${agent.name}.toml`,
                content: codexAgent(agent, overrides.get(agent.name)),
            })),
            ...only.codex.map((agent) => ({ path: `.codex/agents/${agent.name}.toml`, content: agent.content })),
        );
        await loadHooks(root, "codex");
        outputs.push({
            path: ".codex-plugin/plugin.json",
            content: json(await codexManifest(root, plugin, planned())),
        });
    }

    if (await hasIntegration(root, "antigravity")) {
        const problems = await antigravityAgentProblems(root);
        if (problems.length > 0) throw new Error(problems.map((p) => `- ${p}`).join("\n"));
        outputs.push({
            path: ".antigravity-plugin/plugin.json",
            content: json(await antigravityManifest(root, plugin, planned())),
        });
        const hooks = await loadHooks(root, "antigravity");
        if (hooks !== null) outputs.push({ path: "hooks.json", content: json(hooks) });
        for (const rule of await loadRules(root)) outputs.push({ path: `rules/${rule.name}`, content: rule.content });
    }

    if (await hasIntegration(root, "pi")) {
        const patch = await loadPiPatch(root);
        if (patch === null) throw new Error("integrations/pi exists but integrations/pi/package.patch.json is missing");
        outputs.push({ path: "package.json", content: json(piPackage(plugin, patch)) });
    }

    const seen = new Set<string>();
    for (const output of outputs) {
        if (seen.has(output.path)) throw new Error(`two sources generate ${output.path}`);
        seen.add(output.path);
    }
    return outputs.sort((a, b) => a.path.localeCompare(b.path));
}

/** Files in the managed directories that the plan does not produce. */
export async function staleFiles(root: string, outputs: Output[]): Promise<string[]> {
    const planned = new Set(outputs.map((o) => o.path));
    const stale: string[] = [];
    for (const dir of MANAGED_DIRS) {
        for (const file of await listFiles(`${root}/${dir}`)) {
            const path = `${dir}/${file}`;
            if (!planned.has(path)) stale.push(path);
        }
    }
    return stale;
}

/** Compares the plan with the disk; returns the paths that differ or are missing. */
export async function differences(root: string, outputs: Output[]): Promise<string[]> {
    const changed: string[] = [];
    for (const output of outputs) {
        const path = `${root}/${output.path}`;
        if (!(await exists(path)) || (await Deno.readTextFile(path)) !== output.content) changed.push(output.path);
    }
    return changed;
}

export async function main(args: string[], root = ROOT): Promise<number> {
    const flags = parseArgs(args, { boolean: ["check"] });
    let outputs: Output[];
    try {
        outputs = await generateAll(root);
    } catch (error) {
        console.error("The plugin sources have problems; nothing was generated:");
        console.error(errorText(error));
        return 1;
    }
    const changed = await differences(root, outputs);
    const stale = await staleFiles(root, outputs);
    if (flags.check) {
        if (changed.length === 0 && stale.length === 0) {
            console.log(`Generated files are up to date (${outputs.length} files).`);
            return 0;
        }
        for (const path of changed) console.error(`- ${path} differs from what the sources produce`);
        for (const path of stale) console.error(`- ${path} is a stale generated file (no source produces it)`);
        console.error("Fix: run `just generate` and commit the result. Never edit generated files by hand.");
        return 1;
    }
    for (const output of outputs) {
        if (!changed.includes(output.path)) continue;
        await Deno.mkdir(dirname(`${root}/${output.path}`), { recursive: true });
        await Deno.writeTextFile(`${root}/${output.path}`, output.content);
        console.log(`wrote  ${output.path}`);
    }
    for (const path of stale) {
        await Deno.remove(`${root}/${path}`);
        console.log(`removed ${path}`);
    }
    if (changed.length === 0 && stale.length === 0) {
        console.log(`Generated files are up to date (${outputs.length} files).`);
    }
    return 0;
}

if (import.meta.main) Deno.exit(await main(Deno.args));
