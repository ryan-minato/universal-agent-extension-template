#!/usr/bin/env -S deno run --allow-run=gh
// Digests the failed jobs of a GitHub Actions run into one small JSON object: failed, timed-out,
// and cancelled jobs, their unsuccessful steps, and the last N log lines of each, so full logs
// never enter agent context. A run that failed without any such job gets a `note` instead.
//
//   run_log_digest.ts --run-id <id> [--repo OWNER/REPO] [--tail 50]
//
// --repo defaults to REPO in scripts/lib/constants.ts, this repository.
//
// Exit codes: 0 digest produced (an empty failed_jobs list on a green run), 1 gh failed or the run
// was not found, 2 bad arguments.
import { parseArgs } from "jsr:@std/cli@1.0.32/parse-args";
import { REPO } from "../../../../scripts/lib/constants.ts";

interface Step {
    name?: string;
    conclusion?: string;
}
interface Job {
    databaseId?: number;
    name?: string;
    status?: string;
    conclusion?: string;
    steps?: Step[];
}

/** Job and step conclusions that mean "did not succeed" (skipped and neutral are not failures). */
export const UNSUCCESSFUL = new Set(["failure", "timed_out", "cancelled", "startup_failure"]);

async function gh(args: string[]): Promise<{ ok: boolean; out: string; err: string }> {
    const output = await new Deno.Command("gh", { args }).output();
    const decode = (bytes: Uint8Array) => new TextDecoder().decode(bytes);
    return { ok: output.success, out: decode(output.stdout), err: decode(output.stderr).trim() };
}

if (import.meta.main) {
    const args = parseArgs(Deno.args, {
        string: ["repo", "run-id", "tail"],
        default: { repo: REPO, tail: "50" },
    });
    const runId = Number(args["run-id"]);
    const tail = Number(args.tail);
    if (!Number.isInteger(runId) || runId <= 0 || !Number.isInteger(tail) || tail <= 0) {
        console.error("usage: run_log_digest.ts --run-id <positive id> [--repo OWNER/REPO] [--tail N]");
        Deno.exit(2);
    }
    const view = await gh([
        "run",
        "view",
        String(runId),
        "-R",
        args.repo,
        "--json",
        "databaseId,conclusion,status,jobs",
    ]);
    if (!view.ok) {
        console.error(`error: gh run view ${runId} failed: ${view.err}`);
        console.error(`fix: check the id with \`gh run list -R ${args.repo} --limit 20\` and \`gh auth status\`.`);
        Deno.exit(1);
    }
    const run = JSON.parse(view.out) as { conclusion?: string; status?: string; jobs?: Job[] };
    const failed = (run.jobs ?? []).filter((job) => UNSUCCESSFUL.has(job.conclusion ?? ""));
    const digest: Record<string, unknown> = {
        run_id: runId,
        status: run.status,
        conclusion: run.conclusion,
        failed_jobs: [] as unknown[],
    };
    for (const job of failed) {
        const steps = (job.steps ?? []).filter((step) => UNSUCCESSFUL.has(step.conclusion ?? "")).map((step) =>
            step.name
        );
        let log: string[] = [];
        if (job.databaseId !== undefined) {
            const text = await gh([
                "run",
                "view",
                String(runId),
                "-R",
                args.repo,
                "--job",
                String(job.databaseId),
                "--log-failed",
            ]);
            log = (text.ok ? text.out : `log unavailable: ${text.err}`).trimEnd().split("\n").slice(-tail);
        }
        (digest.failed_jobs as unknown[]).push({
            name: job.name,
            conclusion: job.conclusion,
            failed_steps: steps,
            log_tail: log,
        });
    }
    if (failed.length === 0 && run.conclusion !== "success") {
        digest.note =
            "the run did not succeed but no job carries a failing conclusion; open the run page for the cause";
    }
    console.log(JSON.stringify(digest, null, 2));
}
