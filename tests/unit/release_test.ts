import { assertEquals } from "jsr:@std/assert@1.0.13";
import { sectionOf } from "../../scripts/release/changelog_section.ts";
import { changelogHasVersion } from "../../scripts/release/check_release.ts";

const CHANGELOG = `# Changelog

## [Unreleased]

- pending

## [0.2.0] - 2026-11-01

### Added

- thing

## [0.1.0] - 2026-10-26

- first
`;

Deno.test("changelogHasVersion finds a released heading with or without a date", () => {
    assertEquals(changelogHasVersion(CHANGELOG, "0.2.0"), true);
    assertEquals(changelogHasVersion("## [0.3.0]\n", "0.3.0"), true);
    assertEquals(changelogHasVersion(CHANGELOG, "0.3.0"), false);
    assertEquals(changelogHasVersion(CHANGELOG, "0.2"), false);
});

Deno.test("sectionOf returns the body of one version without its heading", () => {
    assertEquals(sectionOf(CHANGELOG, "0.2.0"), "### Added\n\n- thing\n");
    assertEquals(sectionOf(CHANGELOG, "0.1.0"), "- first\n");
    assertEquals(sectionOf(CHANGELOG, "9.9.9"), null);
});
