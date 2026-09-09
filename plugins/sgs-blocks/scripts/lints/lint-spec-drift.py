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
#
# CITE-LINE is advisory BY DESIGN and should stay that way until the existing
# line-citations are migrated. Gating it on day one would paint the gate red on
# every commit, and a gate that always fails is a gate nobody reads — this repo
# has already lived that (wp-pre-merge-gate printed FAIL for months on findings
# nobody owned, and readers learned to skip it). Advisory drives migration on
# touch; CITE-SYMBOL gates, so anything already migrated must stay true.
#
# FR-ORPHAN is advisory for the same reason: its 5 findings at introduction
# (2026-09-09) are all PRE-EXISTING and none has a mechanical fix. FR-34-* cites
# a DELETED spec; FR-35-* cites a spec that never used FR-IDs at all (Spec 35 is
# PART-structured). Resolving them means either giving Spec 35 real IDs or
# re-wording the comments — a judgement call for Bean, not a lint autofix.
# Promote to gating once the baseline is zero.
ADVISORY_CHECKS = {"BLOCK-SLUG", "CITE-LINE", "FR-ORPHAN"}

_RE_BLOCK_DIR = re.compile(r"src/blocks/([a-z][a-z0-9-]*)/")
_RE_PHP_CLASS = re.compile(r"`(Sgs_[A-Za-z0-9_]+)`")
_RE_BLOCK_SLUG = re.compile(r"`(sgs/[a-z][a-z0-9-]*)`")

# ── Citation checks (added 2026-09-09) ───────────────────────────────────────
#
# WHY THESE EXIST — the measurement that shaped them. An adversarial review of
# Spec 36 found `file:line` citations rotted: one 6 lines stale, and the source
# file itself carrying a comment citing its own now-wrong lines.
#
# ⛔ The obvious checker — "does the file exist and is the line in range" — is
# WORTHLESS, and this is measured, not reasoned. A public audit of the same
# problem (playdeck#317) found 69 of 164 stale `file:line` citations, and EVERY
# ONE still pointed at a real, in-range line. Such a checker catches ZERO. That
# is why CITE-SYMBOL resolves a NAME and CITE-LINE merely deprecates the form.
#
# The canonical form is ONE syntax, three resolvers dispatched on extension:
#     `path/to/file.php::function_name`          -> name must grep in that file
#     `path/to/block.json::supports.sgs.imageControls` -> dot-path must resolve
#     `path/to/style.css::.sgs-hero__wrapper`    -> selector string must appear
#
# A wrong symbol citation is VISIBLY wrong (the name disagrees with the code
# beside it). A wrong line citation is INVISIBLY wrong (still a valid line).
# Full research + sources: ~/.claude/memory/research/2026-09-09-code-citation-
# format-for-ai-built-specs.md
_RE_CITE_SYMBOL = re.compile(r"`([\w./-]+\.(?:php|js|jsx|ts|tsx|json|css))::([^`\s][^`]*)`")
_RE_CITE_LINE = re.compile(r"`([\w./-]+\.(?:php|js|jsx|ts|tsx|json|css)):(\d+)(?:-\d+)?`")

# FR-IDs. Checked CODE -> SPEC only, deliberately: an FR present in a spec but
# absent from code is usually just NOT-BUILT YET (FR-36-27 says so in its own
# heading), so the spec->code direction is a false-positive flood. An FR-ID in
# CODE that exists in NO spec is a real orphan — the requirement was renumbered
# or deleted and the comment now cites nothing.
_RE_FR_ID = re.compile(r"\bFR-(\d{1,3})-(\d{1,3}[a-z]?)\b")
_CODE_EXTS = ("*.php", "*.js", "*.jsx", "*.ts", "*.tsx")

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


def _resolve_citation(path_str: str, symbol: str) -> tuple:
    """Resolve `path::symbol`. Returns (ok, reason_if_not_ok).

    Three resolvers dispatched on extension. Each is deliberately a STRING
    search, not an AST parse — the point is to match what a reader (or an
    agent) would do to check the claim by hand, so a passing check means a
    human grep would also find it.
    """
    p = REPO / path_str
    if not p.is_file():
        return False, f"file `{path_str}` does not exist"
    try:
        text = p.read_text(encoding="utf-8", errors="ignore")
    except OSError as exc:
        return False, f"could not read `{path_str}` ({exc})"

    suffix = p.suffix.lower()

    if suffix == ".json":
        # Dot-path walk. A missing key is the failure; a present-but-null key passes.
        import json as _json
        try:
            data = _json.loads(text)
        except ValueError as exc:
            return False, f"`{path_str}` is not valid JSON ({exc})"
        node = data
        walked = []
        for part in symbol.split("."):
            walked.append(part)
            if isinstance(node, dict) and part in node:
                node = node[part]
            else:
                return False, (f"`{path_str}` has no key `{'.'.join(walked)}` "
                               f"(full path `{symbol}`)")
        return True, ""

    if suffix == ".css":
        # Literal selector text. Covers `.class`, `#id`, `--custom-prop`, `@media …`.
        return (symbol in text), ("" if symbol in text
                                  else f"`{path_str}` does not contain `{symbol}`")

    # PHP / JS / TS — the symbol NAME must appear. Not a definition-only check on
    # purpose: a spec may legitimately cite a call site, an attribute key, or a
    # constant, and requiring `function X` would reject those and push authors
    # back to line numbers, which is the failure this whole check exists to stop.
    return (symbol in text), ("" if symbol in text
                              else f"`{path_str}` does not contain `{symbol}`")


def check_citations(spec_files) -> list:
    """CITE-SYMBOL (gating) + CITE-LINE (advisory)."""
    findings = []
    for spec in spec_files:
        for n, line in enumerate(spec.read_text(encoding="utf-8").splitlines(), 1):
            if _NEGATIVE_CONTEXT.search(line):
                continue
            for path_str, symbol in _RE_CITE_SYMBOL.findall(line):
                ok, why = _resolve_citation(path_str, symbol.strip())
                if not ok:
                    findings.append(Finding(
                        "CITE-SYMBOL", spec.name, n, f"{path_str}::{symbol}",
                        f"citation does not resolve — {why}",
                    ))
            for path_str, lineno in _RE_CITE_LINE.findall(line):
                findings.append(Finding(
                    "CITE-LINE", spec.name, n, f"{path_str}:{lineno}",
                    f"line-number citation — rots invisibly (a stale one still points at "
                    f"a real, in-range line). Re-cite as `{path_str}::<symbol>` naming the "
                    f"function / JSON key / CSS selector",
                ))
    return findings


def check_fr_orphans(spec_files) -> list:
    """FR-ID cited in CODE that appears in NO spec — a requirement that was
    renumbered or deleted, leaving the comment pointing at nothing."""
    findings = []
    spec_ids = set()
    for spec in SPECS.rglob("*.md"):
        try:
            spec_ids |= {m.group(0) for m in _RE_FR_ID.finditer(
                spec.read_text(encoding="utf-8", errors="ignore"))}
        except OSError:
            continue
    if not spec_ids:
        return findings  # no specs readable — do not mass-flag on a broken read

    seen = {}
    for root in SEARCH_ROOTS:
        if not root.exists():
            continue
        for pattern in _CODE_EXTS:
            for p in root.rglob(pattern):
                if "node_modules" in p.parts or "vendor" in p.parts:
                    continue
                try:
                    text = p.read_text(encoding="utf-8", errors="ignore")
                except OSError:
                    continue
                for m in _RE_FR_ID.finditer(text):
                    fr = m.group(0)
                    if fr not in spec_ids:
                        seen.setdefault(fr, p)

    for fr, p in sorted(seen.items()):
        findings.append(Finding(
            "FR-ORPHAN", "(code tree)", 0, fr,
            f"code cites `{fr}` (e.g. {p.relative_to(REPO).as_posix()}) but no spec "
            f"in .claude/specs/ defines it — the spec was deleted (Spec 34), the spec "
            f"never used FR-IDs at all (Spec 35 is PART-structured), it was renumbered, "
            f"or it is a typo. Either define the ID in its spec or re-word the comment",
        ))
    return findings


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
    # ── Citation checks. Each asserts the check can FAIL, not just that it runs —
    # a resolver that returns True unconditionally would pass a "does it work"
    # test and catch nothing (this repo's negative-control rule).
    total += 1
    if _RE_CITE_SYMBOL.findall("see `plugins/x/render.php::sgs_do_thing` now") == [
            ("plugins/x/render.php", "sgs_do_thing")]:
        ok += 1
        print("  [PASS] citation extraction (path::symbol)")
    else:
        print("  [FAIL] citation extraction (path::symbol)")

    total += 1
    if _RE_CITE_LINE.findall("see `plugins/x/render.php:393-425` here") == [
            ("plugins/x/render.php", "393")]:
        ok += 1
        print("  [PASS] line-citation detection (the deprecated form)")
    else:
        print("  [FAIL] line-citation detection")

    total += 1  # NEGATIVE CONTROL — a citation into a file that cannot exist must FAIL
    bad_ok, _ = _resolve_citation("plugins/sgs-blocks/does-not-exist.php", "anything")
    if not bad_ok:
        ok += 1
        print("  [PASS] negative control — missing file does NOT resolve")
    else:
        print("  [FAIL] negative control — missing file wrongly resolved")

    total += 1  # NEGATIVE CONTROL — real file, absent symbol must FAIL
    real = "plugins/sgs-blocks/scripts/lints/lint-spec-drift.py"
    # The absent name is COMPOSED at runtime on purpose. Writing it as a literal
    # put the string into this very file, which the resolver then searched and
    # found — the control passed the wrong way round and the first run caught it.
    absent = "sgs_absent_" + "symbol_" + "control_xyzzy"
    miss_ok, _ = _resolve_citation(real, absent)
    hit_ok, _ = _resolve_citation(real, "check_citations")
    if hit_ok and not miss_ok:
        ok += 1
        print("  [PASS] symbol resolver — real symbol resolves, fake one does not")
    else:
        print(f"  [FAIL] symbol resolver (real={hit_ok}, fake={miss_ok})")

    total += 1
    if _RE_FR_ID.findall("cites FR-36-6 and FR-31-9a") == [("36", "6"), ("31", "9a")]:
        ok += 1
        print("  [PASS] FR-ID extraction")
    else:
        print("  [FAIL] FR-ID extraction")

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

    findings = (check_specs(spec_files, slugs, {})
                + check_ghost_builds()
                + check_citations(spec_files)
                + check_fr_orphans(spec_files))

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
    print(f"  {len(gating)} gating  |  {len(advisory)} advisory "
          f"({'/'.join(sorted(ADVISORY_CHECKS))}). Advisory for DIFFERENT reasons — "
          f"BLOCK-SLUG is false-positive-prone; CITE-LINE and FR-ORPHAN are true findings "
          f"held advisory so the gate is not red from day one (migrate on touch). "
          f"See the ADVISORY_CHECKS comment.")
    if args.check and gating:
        print("\nFAIL: specs describe things that do not exist. Fix the spec or the code.")
        return 1
    if args.check:
        print("\nPASS: no gating drift.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
