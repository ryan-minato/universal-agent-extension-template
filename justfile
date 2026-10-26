# Task runner: `just` lists recipes. CI runs these same recipes (.agents/knowledge/github/checks.md).

set shell := ["bash", "-euo", "pipefail", "-c"]

# Recipe arguments reach commands as "$1", "$@" — never pasted into the command text.
set positional-arguments

# List recipes
default:
    @just --list

# Everything CI checks: formatting, lint, types, tests, generated files, plugin sources, specs, harness, docs
check: lint scripts-check test generate-check validate spec-check harness-check docs-check

# Check formatting (deno fmt) and that the Node runtime scripts parse; the pre-commit hooks run fmt and gitleaks on each commit
lint:
    deno fmt --check
    deno lint
    git ls-files -z 'lib/*.mjs' 'skills/*/scripts/*.mjs' 'integrations/*/hooks/scripts/*.mjs' 'integrations/*/scripts/*.mjs' | xargs -0 -n1 node --check

# Type-check the Deno scripts and tests
scripts-check:
    deno check scripts/ tests/ .agents/skills/github-project-workflow/scripts/ .agents/skills/template-adopt/scripts/

# Run the unit, compatibility, and installation tests
test *args:
    deno test --allow-read --allow-write --allow-run --allow-env tests/ "$@"

# Regenerate every native entry file from the sources (plugin.json, agents/, mcp.json, integrations/)
generate:
    ./scripts/generate/main.ts

# Fail when a committed generated file differs from what the sources produce
generate-check:
    ./scripts/generate/main.ts --check

# Validate the plugin sources, the skills, the integrations, and the generated files
validate:
    ./scripts/validate/main.ts

# Strict-validate OpenSpec specs and changes; check config.yaml rules and the generated OpenSpec skills
spec-check:
    OPENSPEC_NO_UPDATE_CHECK=1 OPENSPEC_TELEMETRY=0 openspec validate --all --strict --no-interactive
    ./scripts/validate/check_openspec.ts

# List unarchived OpenSpec changes; --ready exits non-zero when one exists (the verdict the PR workflow reads)
spec-status *args:
    ./scripts/validate/check_spec_archived.ts "$@"

# Check that AGENTS.md and the knowledge base name only paths and recipes that exist
harness-check:
    ./scripts/validate/check_harness.ts

# Build the documentation site into site/
docs:
    zensical build --clean

# Fail when the documentation site does not build strictly
docs-check:
    zensical build --clean --strict

# Preview the documentation site locally
docs-serve:
    zensical serve

# Scan this repository for TODO/FIXME markers with the plugin's own scanner (the demo)
todo-scan *args:
    node lib/todo-scan.mjs . --exclude .claude --exclude .agents "$@"

# Print how the repository's labels differ from .github/labels.yml; --apply writes it (--keep-undeclared, --delete-used <name>)
labels *args:
    ./scripts/sync_labels.ts "$@"

# Print the spec: and area: labels the rules give a pull request now, without writing; --apply writes the difference
pr-labels number *args:
    ./scripts/sync_pr_labels.ts "$1" "${@:2}"

# Check a pull request title against the commit convention
check-title title:
    ./scripts/validate/check_title.ts "$1"

# Release rules: --pr <base-ref> in a pull request, --main on main (prints version= and release=)
release-check *args:
    ./scripts/release/check_release.ts "$@"

# Installation smoke test for one framework (claude-code, codex, antigravity, pi); exits 2 when its CLI is absent
smoke framework:
    ./scripts/test/smoke.ts "$1"
