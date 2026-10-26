// The trust boundary of the one pull_request_target workflow (.agents/knowledge/github/checks.md,
// Rules), asserted on the file so a later edit cannot loosen it silently, plus the invariants every
// workflow shares: explicit permissions, actions pinned by commit SHA.
import { assert, assertEquals } from "jsr:@std/assert@1.0.13";
import { parse as parseYaml } from "jsr:@std/yaml@1.2.0";
import { listFiles, ROOT } from "../../scripts/lib/repo.ts";

type Step = { uses?: string; run?: string; env?: Record<string, string>; with?: Record<string, unknown> };
type Job = { permissions?: Record<string, string>; steps: Step[]; "timeout-minutes"?: number };
type Workflow = { permissions?: Record<string, string>; jobs: Record<string, Job> };

async function workflow(name: string): Promise<Workflow> {
    return parseYaml(await Deno.readTextFile(`${ROOT}/.github/workflows/${name}`)) as Workflow;
}

Deno.test("pr-labels.yml stays inside the pull_request_target bounds", async () => {
    const wf = await workflow("pr-labels.yml");
    assertEquals(wf.permissions, {}, "nothing at the top level");
    const jobs = Object.values(wf.jobs);
    assertEquals(jobs.length, 1, "one job");
    const [job] = jobs;
    assertEquals(job.permissions, { contents: "read", "pull-requests": "write" });
    assertEquals(job["timeout-minutes"], 5);
    for (const step of job.steps) {
        if (step.uses?.startsWith("actions/checkout")) {
            assertEquals(step.with?.ref, undefined, "the checkout names no ref: it is main's newest commit");
        }
        for (const line of (step.run ?? "").split("\n")) {
            assert(
                !line.includes("${{ github.event"),
                `event data reaches the script only through env: ${line.trim()}`,
            );
        }
        const uses = step.uses ?? "";
        assert(
            uses === "" || uses.startsWith("actions/checkout@") || uses.startsWith("./.github/actions/setup-tools"),
            `only the checkout and the repository's own tool setup run here: ${uses}`,
        );
    }
    const runs = job.steps.filter((step) => step.run !== undefined);
    assertEquals(runs.length, 2, "the labelling step and the failure cleanup");
});

Deno.test("every workflow declares permissions and pins external actions by commit SHA", async () => {
    for (const file of await listFiles(`${ROOT}/.github/workflows`, ".yml")) {
        const wf = await workflow(file);
        assert(wf.permissions !== undefined, `${file}: top-level permissions`);
        for (const [name, job] of Object.entries(wf.jobs)) {
            for (const step of job.steps) {
                const uses = step.uses;
                if (!uses || uses.startsWith("./")) continue;
                assert(/@[0-9a-f]{40}( #.*)?$/.test(uses), `${file} ${name}: ${uses} is pinned by a 40-character SHA`);
            }
        }
    }
});
