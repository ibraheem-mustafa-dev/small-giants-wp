"""Spec-drift lint — do the specs describe things that actually EXIST?

WHY THIS EXISTS (2026-07-16, adversarial-council). Bean cannot read code: for him
the specs ARE the system. A 7-persona council found the specs' load-bearing claims
had silently drifted from reality — and worse, that a "⛔ CORRECTED" note written to
fix a false claim was ITSELF false. Four independent personas flagged the same line.
Three flagged an FR describing a block deleted two days earlier. The corrections had
become the error source, and nothing could tell.

The project rule is "a claim in a doc is a hypothesis" (R-31-6/R-31-11). That rule was
being applied to everything EXCEPT the specs. This gate applies it to the specs:
every checkable claim is checked against ground truth (filesystem + the framework DB).

Checks (each cites the finding that motivated it):
  1. BLOCK-DIR   — a spec citing `src/blocks/<x>/` must have that directory.
                   (Council: FR-S9-1/4/5/8 cite `src/blocks/mobile-nav/`, deleted D336.)
  2. PHP-CLASS   — a spec naming `Sgs_<Class>` as shipped must have it in the tree.
                   (Council: Spec 17's opening para claims 4 Customiser/Renderer
                    classes "shipped at 60220b13" — zero exist anywhere.)
  3. BLOCK-SLUG  — a spec citing `sgs/<slug>` must have it registered in the DB.
                   ⚠ ADVISORY ONLY — NOT gating (excluded from --check's exit code).
                   The SGS framework reuses the `sgs/` namespace for THREE registries:
                   blocks (DB), block PATTERNS (`theme/sgs-theme/patterns/*.php`
                   `Slug:` headers), and block-BINDINGS sources
                   (`register_block_bindings_source('sgs/site-info')`). This check only
                   knows the first, so it currently flags every pattern slug and
                   `sgs/site-info` as drift — ~60 false positives across the spec set.
                   TO PROMOTE IT TO GATING: load all three registries and flag a slug
                   only when it is in NONE of them. Until then treat its output as a
                   worklist to triage by hand, never as a pass/fail signal — a gate
                   that cries wolf is a gate someone switches off.
  4. GHOST-BUILD — every `build/blocks/<x>/` must have a `src/blocks/<x>/` counterpart.
                   (Council MF-1: build/blocks/{header,footer} still REGISTER
                    `sgs/header` + `sgs/footer` — the exact artefact the enforcement
                    hook exists to prevent. `build/` is gitignored, so git can't see
                    them; `/sgs-db` can't either; tar-deploy never deletes them.)

Usage:
    python lint-spec-drift.py                 # report (exit 0)
    python lint-spec-drift.py --check         # gate mode (exit 1 on any finding)
    python lint-spec-drift.py --self-test
"""

from __future__ import annotations

import argparse
import re
import sqlite3
import sys
from dataclasses import dataclass
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

REPO = Path(__file__).resolve().parents[4]
SPECS = REPO / ".claude" / "specs"
SRC_BLOCKS = REPO / "plugins" / "sgs-blocks" / "src" / "blocks"
BUILD_BLOCKS = REPO / "plugins" / "sgs-blocks" / "build" / "blocks"
SEARCH_ROOTS = [REPO / "plugins", REPO / "theme"]
SGS_DB = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"

# Checks that report but do NOT fail --check (see the BLOCK-SLUG note in the docstring).
ADVISORY_CHECKS = {"BLOCK-SLUG"}

_RE_BLOCK_DIR = re.compile(r"src/blocks/([a-z][a-z0-9-]*)/")
_RE_PHP_CLASS = re.compile(r"`(Sgs_[A-Za-z0-9_]+)`")
_RE_BLOCK_SLUG = re.compile(r"`(sgs/[a-z][a-z0-9-]*)`")

# Claims a spec may legitimately make about things that should NOT exist — a spec is
# allowed to say "src/blocks/header/ is FORBIDDEN". Lines matching these are skipped.
#
# The final alternative (`\`owner/repo\` → \`src/...\`) whitelists a COMPETITOR-repo
# citation style (Spec 11 §research: `` `brainstormforce/wp-spectra` → `src/blocks/
# buttons-child/attributes.js` ``) — a legitimate primary-source citation of ANOTHER
# project's repo, not a claim about this repo. Deliberately narrow: it requires the
# arrow's RIGHT side to be a `src/` or `packages/` path (Gutenberg's own layout),
# which is what distinguishes it from this repo's internal `sgs-theme/x` → `sgs/y`
# slug-mapping tables (Spec 17:514-515 etc — those must stay gating, not be swallowed).
# Verified empirically 2026-07-16: this alternative matches ONLY the 4 Spec 11 lines
# across the whole `specs/` tree (checked via a standalone script over every .md file);
# it does not touch any of the 59 BLOCK-SLUG advisory findings.
_NEGATIVE_CONTEXT = re.compile(
    r"forbidden|must not|never|blocked|block(?:s|ed)?\s+`?write`?|deleted|retired|"
    r"removed|do(?:es)?\s+not\s+exist|don't exist|doesn't exist|absent|superseded|"
    r"anti-pattern|exit 2|no longer|no such|retracted|fiction|do not build|"
    r"~~|"  # a struck (audit-only) line is asserting the thing is dead, not live
    r"`[\w.-]+/[\w.-]+`\s*→\s*`(?:src/|packages/)",
    re.IGNORECASE,
)


@dataclass
class Finding:
    check: str
    spec: str
    line: int
    subject: str
    message: str


def _php_class_exists(name: str) -> bool:
    needle = f"class {name}"
    for root in SEARCH_ROOTS:
        if not root.exists():
            continue
        for p in root.rglob("*.php"):
            try:
                if needle in p.read_text(encoding="utf-8", errors="ignore"):
                    return True
            except OSError:
                continue
    return False


def _db_slugs() -> set:
    if not SGS_DB.exists() or SGS_DB.stat().st_size == 0:
        return set()
    con = sqlite3.connect(f"file:{SGS_DB}?mode=ro", uri=True)
    try:
        return {r[0] for r in con.execute("SELECT slug FROM blocks")}
    finally:
        con.close()


def check_specs(spec_files, slugs, class_cache) -> list:
    findings = []
    for spec in spec_files:
        for n, line in enumerate(spec.read_text(encoding="utf-8").splitlines(), 1):
            if _NEGATIVE_CONTEXT.search(line):
                continue  # the spec is asserting absence — not a drift claim
            for d in set(_RE_BLOCK_DIR.findall(line)):
                if not (SRC_BLOCKS / d).is_dir():
                    findings.append(Finding(
                        "BLOCK-DIR", spec.name, n, f"src/blocks/{d}/",
                        f"spec cites `src/blocks/{d}/` but that directory does not exist",
                    ))
            for c in set(_RE_PHP_CLASS.findall(line)):
                if c not in class_cache:
                    class_cache[c] = _php_class_exists(c)
                if not class_cache[c]:
                    findings.append(Finding(
                        "PHP-CLASS", spec.name, n, c,
                        f"spec names `{c}` but no `class {c}` exists in plugins/ or theme/",
                    ))
            if slugs:
                for s in set(_RE_BLOCK_SLUG.findall(line)):
                    if s not in slugs:
                        findings.append(Finding(
                            "BLOCK-SLUG", spec.name, n, s,
                            f"spec cites `{s}` but it is not a registered block in the DB",
                        ))
    return findings


def check_ghost_builds() -> list:
    """A build/blocks/<x> with no src/blocks/<x> still REGISTERS on every deploy."""
    findings = []
    if not BUILD_BLOCKS.is_dir():
        return findings
    for d in sorted(p for p in BUILD_BLOCKS.iterdir() if p.is_dir()):
        if not (d / "block.json").exists():
            continue
        if not (SRC_BLOCKS / d.name).is_dir():
            findings.append(Finding(
                "GHOST-BUILD", "(build tree)", 0, f"build/blocks/{d.name}/",
                f"build/blocks/{d.name}/ has NO src/blocks/{d.name}/ — it is a stale "
                f"artefact that still registers a block on every deploy "
                f"(build/ is gitignored + tar-deploy never deletes)",
            ))
    return findings


def _self_test() -> int:
    ok = 0
    total = 0
    total += 1
    if _NEGATIVE_CONTEXT.search("- hook continues to block `Write` on `src/blocks/header/`"):
        ok += 1
        print("  [PASS] negative-context line is skipped (spec asserting absence)")
    else:
        print("  [FAIL] negative-context line NOT skipped")
    total += 1
    if _RE_BLOCK_DIR.findall("cites `src/blocks/mobile-nav/` here") == ["mobile-nav"]:
        ok += 1
        print("  [PASS] block-dir extraction")
    else:
        print("  [FAIL] block-dir extraction")
    total += 1
    if _RE_PHP_CLASS.findall("`Sgs_Header_Customiser` + `Sgs_Footer_Customiser`") == [
            "Sgs_Header_Customiser", "Sgs_Footer_Customiser"]:
        ok += 1
        print("  [PASS] php-class extraction")
    else:
        print("  [FAIL] php-class extraction")
    print(f"\n{ok}/{total} self-tests passed")
    return 0 if ok == total else 1


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--check", action="store_true", help="gate mode: exit 1 on findings")
    ap.add_argument("--self-test", action="store_true")
    ap.add_argument("--spec", type=str, default=None, help="limit to one spec filename")
    ap.add_argument("--ghost-only", action="store_true",
                    help="run ONLY the GHOST-BUILD check (wired to npm postbuild — it is "
                         "fast, has zero false positives, and catches a stale build/ dir "
                         "the moment it appears rather than two months later)")
    args = ap.parse_args()

    if args.self_test:
        print("Running lint-spec-drift self-tests...\n")
        return _self_test()

    if args.ghost_only:
        ghosts = check_ghost_builds()
        for f in ghosts:
            print(f"GHOST-BUILD  {f.message}")
        if ghosts:
            print(f"\nFAIL: {len(ghosts)} stale build/blocks dir(s) with no src/ counterpart. "
                  f"They still REGISTER a block on every deploy. Run `npm run clean:build` "
                  f"then rebuild, and `rm -rf` them on every deployed server "
                  f"(tar-deploy never deletes).")
            return 1 if args.check else 0
        print("PASS: build/blocks has no ghosts (every built block has a src/ counterpart).")
        return 0

    spec_files = sorted(SPECS.glob("*.md"))
    if args.spec:
        spec_files = [p for p in spec_files if args.spec in p.name]
    slugs = _db_slugs()
    if not slugs:
        print("WARN: framework DB unreadable/empty — BLOCK-SLUG check skipped\n")

    findings = check_specs(spec_files, slugs, {}) + check_ghost_builds()

    by_check = {}
    for f in findings:
        by_check.setdefault(f.check, []).append(f)
    for check in sorted(by_check):
        print(f"\n{check} — {len(by_check[check])} finding(s)")
        for f in by_check[check]:
            loc = f"{f.spec}:{f.line}" if f.line else f.spec
            print(f"  {loc:52s} {f.message}")

    gating = [f for f in findings if f.check not in ADVISORY_CHECKS]
    advisory = [f for f in findings if f.check in ADVISORY_CHECKS]
    print(f"\n{len(findings)} total finding(s) across {len(spec_files)} spec file(s)")
    print(f"  {len(gating)} gating  |  {len(advisory)} advisory ({'/'.join(sorted(ADVISORY_CHECKS))} "
          f"— known false-positive-prone, see the module docstring; triage by hand)")
    if args.check and gating:
        print("\nFAIL: specs describe things that do not exist. Fix the spec or the code.")
        return 1
    if args.check:
        print("\nPASS: no gating drift.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
