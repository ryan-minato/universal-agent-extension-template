// .agents/plugins/marketplace.json: the Codex marketplace file that lets this repository be added
// as its own marketplace (`codex plugin marketplace add <path or URL>`, then
// `codex plugin add <name>@<name>`). Codex requires the file at a marketplace root; a plugin entry
// whose source path is "./" names the repository itself (observed 2026-10-26, frameworks.md).
import type { PluginManifest } from "./plugin.ts";

export function codexMarketplace(plugin: PluginManifest, overrides: Record<string, unknown>): Record<string, unknown> {
    const iface = overrides.interface as Record<string, unknown> | undefined;
    const entry: Record<string, unknown> = {
        name: plugin.name,
        source: { source: "local", path: "./" },
        policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
    };
    if (typeof iface?.category === "string") entry.category = iface.category;
    return {
        name: plugin.name,
        interface: { displayName: typeof iface?.displayName === "string" ? iface.displayName : plugin.name },
        plugins: [entry],
    };
}
