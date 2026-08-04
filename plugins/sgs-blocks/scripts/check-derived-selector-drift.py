#!/usr/bin/env python3
"""check-derived-selector-drift.py — catches `block_attributes.derived_selector`
values that were SYNTHESISED from the canonical slot name rather than MEASURED
from the block's own rendered markup.

THE DEFECT THIS EXISTS TO CATCH
----------------------------------------------------------------------------------------
`derive_selector()` in `scripts/behavioural-analyser/assign-canonical.py` (~line 377)
builds every `derived_selector` mechanically:

    .sgs-<block-short-slug>__<canonical_slot>

It never checks whether the block actually renders a class with that name. Proven
live on `sgs/media`: six attributes (`imageUrl`, `imageId`, `imageWidth`,
`imageHeight`, `videoUrl`, `videoId`, `videoPoster` — the exact roster depends on the
DB state at run time, see the report this gate prints) all carry
`derived_selector = '.sgs-media__media'` — a class that block NEVER renders. Its real
classes, read straight out of `render.php`, are `__img`, `__video`, `__svg`,
`__caption`, `__link`. Because six semantically distinct attributes collapse onto one
fictional selector, they become indistinguishable to the converter: a bare `<img>`
draft can lift into `videoPoster` by catalogue order, silently dropping the
companion `imageAlt`.

WHAT "REAL" MEANS HERE
----------------------------------------------------------------------------------------
A class is real for a block iff it appears as a whole quoted string-literal token
(single-quoted, double-quoted, or backtick) inside that block's own `render.php`
(every SGS block is dynamic) or `save.js` (present on ~65% of blocks; exports `null`
on the rest, per the no-inline-styling / dynamic-block convention — harmless to
include). The block's own source is the authority — never the DB row being audited,
never a shared helper's internals, never a docblock/comment (comments are excluded
because this gate only reads inside quotes, so prose mentioning a class name in a
docblock can never manufacture a false "real" class).

BLIND SPOTS — SURFACED, NEVER SILENTLY PASSED
----------------------------------------------------------------------------------------
Two shapes cannot be resolved by reading quoted literals, and BOTH are reported as
UNDETERMINABLE rather than counted as a pass or a violation:

  1. CONCATENATION — a class built from a literal fragment glued to a PHP variable
     or a JS template interpolation, e.g. `'sgs-icon__' . $element` or
     `` `sgs-icon__${element}` ``. The element name never appears as a complete
     literal, so it cannot be verified OR refuted from source text alone. Detected via
     `_DYN_PHP_CONCAT` / `_DYN_JS_TEMPLATE` below; every block flagged this way names
     the exact snippet that triggered it.
  2. SOURCE MISSING/UNREADABLE — no render.php found, or the file could not be read.

A shared helper's OWN internals (e.g. `SGS_Container_Wrapper`'s PHP body) are
deliberately NOT parsed. In practice this is not a blind spot for element-level BEM
classes: every audited block passes its extra/element classes to the helper as
literal strings from WITHIN its own render.php (`$hero_helper_opts['extra_classes']`
style), so those literals are still visible to this scanner. When a violation's
block also calls `SGS_Container_Wrapper::render(`, the finding carries a
`wrapper_hint` note so a human checks the helper before assuming the fix is
"add the missing class" rather than "the class is genuinely never rendered".

SCOPE
----------------------------------------------------------------------------------------
Only `blocks.source = 'sgs'` rows — this repo owns those blocks' source. `native_wp`
(core) rows carry `derived_selector` too but this repo has no render.php/save.js for
WordPress core blocks to check them against.

GATE SHAPE (matches check-fx-list-drift.py / audit-feature-parity.py)
----------------------------------------------------------------------------------------
- Default (no flag): observational report, exit 0 regardless of findings.
- --json:      machine report to stdout, always exits 0.
- --check:     gating mode. Exits 1 on any proven VIOLATION (UNDETERMINABLE rows never
               fail the gate — they are not proven wrong). NOT wired into prebuild or
               any CI gate yet — advisory-first per this project's rollout rule; the
               roster is expected to light up on first run.
- --self-test: proves the gate can fail. Plants a known-bad selector in a real temp
               file on disk, reads it back to confirm the plant landed, asserts it is
               flagged, then asserts a known-good selector is not, then proves the
               concatenation and missing-source blind spots surface as UNDETERMINABLE
               rather than a silent pass.

Run: python plugins/sgs-blocks/scripts/check-derived-selector-drift.py
     python plugins/sgs-blocks/scripts/check-derived-selector-drift.py --check
     python plugins/sgs-blocks/scripts/check-derived-selector-drift.py --self-test
"""
from __future__ import annotations

import argparse
import difflib
import json
import os
import re
import sqlite3
import sys
import tempfile
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

if sys.stdout.encoding is None or sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")
if sys.stderr.encoding is None or sys.stderr.encoding.lower() != "utf-8":
    sys.stderr.reconfigure(encoding="utf-8")

_HERE = Path(__file__).resolve().parent
_PLUGIN_ROOT = _HERE.parent
_BLOCKS_DIR = _PLUGIN_ROOT / "src" / "blocks"

DB_PATH = Path(
    os.environ.get(
        "SGS_FRAMEWORK_DB",
        str(Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"),
    )
)

# ---------------------------------------------------------------------------
# Parsing primitives
# ---------------------------------------------------------------------------

# Strip comments before scanning so prose in a docblock can never manufacture a
# false "real" class and can never trip the dynamic-construction detector.
# Heuristic, not a full lexer (matches the house style — see check-fx-list-drift.py's
# own "reads no database" note for the same trade-off elsewhere in this repo):
#   - `//...` to end of line, but NOT when preceded by `:` (so `http://...` inside a
#     string on the same line survives).
#   - lines that are ONLY a `#...` comment (so `#fff` colour literals survive).
#   - `/* ... */` block comments, DOTALL.
_RE_LINE_COMMENT_SLASH = re.compile(r"(?<!:)//.*$", re.MULTILINE)
_RE_LINE_COMMENT_HASH = re.compile(r"^\s*#.*$", re.MULTILINE)
_RE_BLOCK_COMMENT = re.compile(r"/\*.*?\*/", re.DOTALL)


def strip_comments(text: str) -> str:
    text = _RE_BLOCK_COMMENT.sub(" ", text)
    text = _RE_LINE_COMMENT_SLASH.sub("", text)
    text = _RE_LINE_COMMENT_HASH.sub("", text)
    return text


# Quoted string literals — single, double, and backtick (JS template literals).
# Escaped-quote aware (minimal: `\'`/`\"`/`` \` `` inside their own quote kind).
_RE_SQ = re.compile(r"'(?:\\.|[^'\\])*'")
_RE_DQ = re.compile(r'"(?:\\.|[^"\\])*"')
_RE_BT = re.compile(r"`(?:\\.|[^`\\])*`")


def extract_literal_tokens(text: str) -> list[str]:
    """Every whitespace-separated token found INSIDE a quoted literal.

    Reading only inside quotes is deliberate: it is what makes this scanner immune
    to comment prose describing a class name without ever emitting it (see module
    docstring "WHAT REAL MEANS HERE").
    """
    tokens: list[str] = []
    for rx in (_RE_SQ, _RE_DQ, _RE_BT):
        for m in rx.finditer(text):
            literal = m.group(0)[1:-1]
            tokens.extend(literal.split())
    return tokens


# Dynamic-construction detectors (Blind spot 1 — see module docstring).
#   'sgs-icon__' . $element            (PHP concatenation right after the __ boundary)
#   'sgs-icon' . $x . '__' . $y        (any concatenation landing on a __ boundary)
_DYN_PHP_CONCAT = re.compile(
    r"""['"]sgs-[\w-]*__['"]\s*\.\s*\$\w+"""
)
#   `sgs-icon__${element}`             (JS template literal interpolating the element)
_DYN_JS_TEMPLATE = re.compile(
    r"""`[^`]*sgs-[\w-]*__\$\{[^}]*\}[^`]*`"""
)


def find_dynamic_construction(text: str) -> list[str]:
    """Returns the matched snippets (evidence), empty list if none found."""
    hits: list[str] = []
    for m in _DYN_PHP_CONCAT.finditer(text):
        hits.append(m.group(0))
    for m in _DYN_JS_TEMPLATE.finditer(text):
        hits.append(m.group(0))
    return hits


# ---------------------------------------------------------------------------
# Per-block real-class extraction
# ---------------------------------------------------------------------------

@dataclass
class BlockSourceFacts:
    short_slug: str
    base_classes: set[str] = field(default_factory=set)   # e.g. {"sgs-media__img", ...}
    root_class: Optional[str] = None                      # e.g. "sgs-media"
    dynamic_hits: list[str] = field(default_factory=list)  # evidence snippets
    files_read: list[str] = field(default_factory=list)
    files_missing: list[str] = field(default_factory=list)
    uses_shared_wrapper: bool = False

    @property
    def is_undeterminable(self) -> bool:
        return bool(self.dynamic_hits) or not self.files_read


def real_classes_for_block(short_slug: str, block_dir: Path) -> BlockSourceFacts:
    """Reads render.php + save.js (whichever exist) from `block_dir` and extracts the
    block's real class set. `block_dir` is a parameter (not derived internally) so
    --self-test can point this at a temp fixture without touching real block source.
    """
    facts = BlockSourceFacts(short_slug=short_slug)
    prefix = f"sgs-{short_slug}__"
    root = f"sgs-{short_slug}"

    for filename in ("render.php", "save.js"):
        path = block_dir / filename
        if not path.exists():
            if filename == "render.php":
                facts.files_missing.append(str(path))
            continue
        try:
            raw = path.read_text(encoding="utf-8")
        except OSError:
            facts.files_missing.append(str(path))
            continue

        facts.files_read.append(str(path))
        clean = strip_comments(raw)

        if "SGS_Container_Wrapper" in clean:
            facts.uses_shared_wrapper = True

        facts.dynamic_hits.extend(find_dynamic_construction(clean))

        for token in extract_literal_tokens(clean):
            if token == root:
                facts.root_class = root
            elif token.startswith(prefix):
                elem = token[len(prefix):]
                elem_base = elem.split("--")[0].rstrip("-")
                if elem_base:
                    facts.base_classes.add(prefix + elem_base)

    return facts


# ---------------------------------------------------------------------------
# derived_selector class-token extraction + evaluation
# ---------------------------------------------------------------------------

_RE_SELECTOR_CLASS = re.compile(r"\.([\w-]+)")


def extract_selector_class_tokens(derived_selector: str) -> list[str]:
    """The class tokens named by a derived_selector value, e.g.
    '.sgs-hero__headline, h1, h2' -> ['sgs-hero__headline']. Bare-tag / attribute
    fallback fragments (no leading dot) carry no class claim and are ignored — they
    cannot be "a class the block does not render" because they never claimed a class.
    """
    return _RE_SELECTOR_CLASS.findall(derived_selector)


def suggest_true_selector(short_slug: str, attr_name: str, base_classes: set[str]) -> Optional[str]:
    """Best-effort fix suggestion: fuzzy-match attr_name against this block's real
    BEM elements. Heuristic, not authoritative — surfaced only above a confidence
    floor so a poor guess doesn't masquerade as a fix.
    """
    prefix = f"sgs-{short_slug}__"
    best_cls: Optional[str] = None
    best_ratio = 0.0
    for cls in base_classes:
        elem = cls[len(prefix):]
        ratio = difflib.SequenceMatcher(None, attr_name.lower(), elem.lower()).ratio()
        if ratio > best_ratio:
            best_ratio = ratio
            best_cls = cls
    if best_cls is not None and best_ratio >= 0.4:
        return f".{best_cls}"
    return None


STATUS_OK = "OK"
STATUS_VIOLATION = "VIOLATION"
STATUS_UNDETERMINABLE = "UNDETERMINABLE"
STATUS_SKIPPED = "SKIPPED"  # derived_selector named no class at all (bare tag/attr only)


def evaluate_block(
    block_slug: str,
    short_slug: str,
    block_dir: Path,
    rows: list[tuple[str, str]],
) -> list[dict]:
    """rows = [(attr_name, derived_selector), ...] for this one block. Pure function
    of its inputs (no DB access) so --self-test can drive it directly against a
    planted fixture.
    """
    facts = real_classes_for_block(short_slug, block_dir)
    findings: list[dict] = []

    for attr_name, derived_selector in rows:
        tokens = extract_selector_class_tokens(derived_selector)
        if not tokens:
            findings.append({
                "block_slug": block_slug,
                "attr_name": attr_name,
                "derived_selector": derived_selector,
                "primary_class": None,
                "status": STATUS_SKIPPED,
                "reason": "derived_selector names no class (bare tag/attribute selector only)",
                "suggested_selector": None,
                "wrapper_hint": False,
            })
            continue

        primary = tokens[0]
        is_real = primary == facts.root_class or primary in facts.base_classes

        if is_real:
            status = STATUS_OK
            reason = "found as a literal class in " + ", ".join(
                Path(p).name for p in facts.files_read
            ) if facts.files_read else "found"
            suggestion = None
        elif not facts.files_read:
            status = STATUS_UNDETERMINABLE
            reason = f"source unreadable/missing: {', '.join(facts.files_missing)}"
            suggestion = None
        elif facts.dynamic_hits:
            status = STATUS_UNDETERMINABLE
            reason = (
                "class name may be built by string concatenation this scanner cannot "
                f"resolve — evidence: {facts.dynamic_hits[0]!r}"
            )
            suggestion = suggest_true_selector(short_slug, attr_name, facts.base_classes)
        else:
            status = STATUS_VIOLATION
            reason = (
                f".{primary} is not a literal class anywhere in "
                f"{', '.join(Path(p).name for p in facts.files_read) or '(no source read)'}"
            )
            suggestion = suggest_true_selector(short_slug, attr_name, facts.base_classes)

        findings.append({
            "block_slug": block_slug,
            "attr_name": attr_name,
            "derived_selector": derived_selector,
            "primary_class": primary,
            "status": status,
            "reason": reason,
            "suggested_selector": suggestion,
            "wrapper_hint": facts.uses_shared_wrapper and status != STATUS_OK,
        })

    return findings


# ---------------------------------------------------------------------------
# DB roster
# ---------------------------------------------------------------------------

def fetch_roster(conn: sqlite3.Connection) -> dict[str, list[tuple[str, str]]]:
    """block_slug -> [(attr_name, derived_selector), ...] for every source='sgs' row
    with a non-empty derived_selector.
    """
    rows = conn.execute(
        """
        SELECT ba.block_slug, ba.attr_name, ba.derived_selector
        FROM block_attributes ba
        JOIN blocks b ON b.slug = ba.block_slug
        WHERE b.source = 'sgs'
          AND ba.derived_selector IS NOT NULL
          AND ba.derived_selector != ''
        ORDER BY ba.block_slug, ba.attr_name
        """
    ).fetchall()
    roster: dict[str, list[tuple[str, str]]] = {}
    for block_slug, attr_name, derived_selector in rows:
        roster.setdefault(block_slug, []).append((attr_name, derived_selector))
    return roster


# ---------------------------------------------------------------------------
# Reporting
# ---------------------------------------------------------------------------

def _db_missing_message() -> str:
    return (
        f"\n[derived-selector-drift] SKIPPED — DB not found at {DB_PATH}.\n"
        "This gate is DB-first (R-31-1): the sgs-wp-engine DB is an out-of-repo, "
        "home-directory dependency, deliberately unversioned. On a machine without "
        "it the build proceeds and this gate is skipped rather than failing the "
        "whole chain.\n"
        "Fix: run /sgs-update to (re)generate sgs-framework.db, or copy it from a "
        "machine that has it, if you need this gate to actually run."
    )


def run_all(roster: dict[str, list[tuple[str, str]]]) -> list[dict]:
    findings: list[dict] = []
    for block_slug, rows in roster.items():
        short_slug = block_slug.replace("sgs/", "", 1)
        block_dir = _BLOCKS_DIR / short_slug
        findings.extend(evaluate_block(block_slug, short_slug, block_dir, rows))
    return findings


def _print_report(findings: list[dict], as_json: bool) -> dict:
    violations = [f for f in findings if f["status"] == STATUS_VIOLATION]
    undeterminable = [f for f in findings if f["status"] == STATUS_UNDETERMINABLE]
    ok = [f for f in findings if f["status"] == STATUS_OK]
    skipped = [f for f in findings if f["status"] == STATUS_SKIPPED]

    blocks_with_violations = sorted({f["block_slug"] for f in violations})
    blocks_with_suggestions = sorted({
        f["block_slug"] for f in violations if f["suggested_selector"]
    })

    payload = {
        "totals": {
            "rows_checked": len(findings),
            "ok": len(ok),
            "violations": len(violations),
            "undeterminable": len(undeterminable),
            "skipped_no_class_claim": len(skipped),
            "blocks_with_violations": len(blocks_with_violations),
            "blocks_with_derivable_suggestion": len(blocks_with_suggestions),
        },
        "violations": violations,
        "undeterminable": undeterminable,
        "blocks_with_violations": blocks_with_violations,
        "blocks_with_derivable_suggestion": blocks_with_suggestions,
    }

    if as_json:
        print(json.dumps(payload, indent=2))
        return payload

    print(f"\n[derived-selector-drift] checked {len(findings)} block_attributes row(s) "
          f"with a derived_selector across {len(set(f['block_slug'] for f in findings))} "
          "sgs-source block(s).")
    print(f"  OK: {len(ok)}   VIOLATION: {len(violations)}   "
          f"UNDETERMINABLE: {len(undeterminable)}   SKIPPED (no class claim): {len(skipped)}")

    if violations:
        print(f"\n  VIOLATIONS — {len(violations)} row(s) naming a class the block never renders:")
        for f in sorted(violations, key=lambda x: (x["block_slug"], x["attr_name"])):
            suggestion = f["suggested_selector"] or "(no confident suggestion — needs manual review)"
            hint = "  [also calls SGS_Container_Wrapper — check the shared helper before assuming]" if f["wrapper_hint"] else ""
            print(f"    {f['block_slug']}.{f['attr_name']}: {f['derived_selector']!r} "
                  f"-> suggest {suggestion}{hint}")

    if undeterminable:
        print(f"\n  UNDETERMINABLE — {len(undeterminable)} row(s) this gate cannot prove either way:")
        for f in sorted(undeterminable, key=lambda x: (x["block_slug"], x["attr_name"])):
            print(f"    {f['block_slug']}.{f['attr_name']}: {f['derived_selector']!r} — {f['reason']}")

    if blocks_with_suggestions:
        print(f"\n  Fix-list input — {len(blocks_with_suggestions)} block(s) with at least one "
              "derivable true selector:")
        for slug in blocks_with_suggestions:
            print(f"    {slug}")

    return payload


# ---------------------------------------------------------------------------
# --self-test
# ---------------------------------------------------------------------------

def _self_test() -> int:
    failures: list[str] = []

    with tempfile.TemporaryDirectory(prefix="derived-selector-drift-selftest-") as tmp:
        tmp_dir = Path(tmp)
        fixture_dir = tmp_dir / "fixture"
        fixture_dir.mkdir()

        render_php = fixture_dir / "render.php"
        render_php.write_text(
            "<?php\n"
            "// A minimal fixture block.\n"
            "$classes = array( 'sgs-fixture', 'sgs-fixture__real' );\n"
            "echo '<div class=\"' . esc_attr( implode( ' ', $classes ) ) . '\">';\n"
            "echo '<span class=\"sgs-fixture__real\">real</span>';\n"
            "// A comment MENTIONING sgs-fixture__commentonly must NOT count as real.\n",
            encoding="utf-8",
        )

        # Confirm the plant actually landed on disk before trusting anything the
        # gate says about it (prove-the-cause-before-fix: never trust your own
        # setup without re-reading it).
        landed = render_php.read_text(encoding="utf-8")
        if "sgs-fixture__real" not in landed:
            print("[derived-selector-drift --self-test] FAIL — the fixture plant did not "
                  "land on disk (sgs-fixture__real missing from re-read file). Aborting; "
                  "no result from this gate can be trusted.")
            return 1
        if "sgs-fixture__commentonly" not in landed:
            print("[derived-selector-drift --self-test] FAIL — the comment-only fixture "
                  "text did not land on disk.")
            return 1
        print("[derived-selector-drift --self-test] fixture plant confirmed on disk — OK")

        # Case 1: known-BAD selector (never rendered) must be flagged.
        rows_bad = [("fakeAttr", ".sgs-fixture__fake")]
        findings_bad = evaluate_block("sgs/fixture", "fixture", fixture_dir, rows_bad)
        if findings_bad[0]["status"] != STATUS_VIOLATION:
            failures.append(
                f"known-bad selector .sgs-fixture__fake was NOT flagged "
                f"(got status={findings_bad[0]['status']!r})"
            )
        else:
            print("[derived-selector-drift --self-test] known-bad selector flagged VIOLATION — OK")

        # Case 2: comment-only mention must NOT count as real (proves comments are excluded).
        rows_comment = [("commentAttr", ".sgs-fixture__commentonly")]
        findings_comment = evaluate_block("sgs/fixture", "fixture", fixture_dir, rows_comment)
        if findings_comment[0]["status"] != STATUS_VIOLATION:
            failures.append(
                "a class mentioned only in a comment was treated as real "
                f"(got status={findings_comment[0]['status']!r})"
            )
        else:
            print("[derived-selector-drift --self-test] comment-only mention correctly NOT real — OK")

        # Case 3: known-GOOD selector must NOT be flagged.
        rows_good = [("realAttr", ".sgs-fixture__real")]
        findings_good = evaluate_block("sgs/fixture", "fixture", fixture_dir, rows_good)
        if findings_good[0]["status"] != STATUS_OK:
            failures.append(
                f"known-good selector .sgs-fixture__real was flagged "
                f"(got status={findings_good[0]['status']!r})"
            )
        else:
            print("[derived-selector-drift --self-test] known-good selector NOT flagged — OK")

        # Case 4: root class (no __element) must also be recognised as real.
        rows_root = [("rootAttr", ".sgs-fixture")]
        findings_root = evaluate_block("sgs/fixture", "fixture", fixture_dir, rows_root)
        if findings_root[0]["status"] != STATUS_OK:
            failures.append(
                f"root class .sgs-fixture was flagged (got status={findings_root[0]['status']!r})"
            )
        else:
            print("[derived-selector-drift --self-test] root class recognised as real — OK")

        # Case 5: dynamic concatenation must surface as UNDETERMINABLE, never a pass.
        dyn_dir = tmp_dir / "dynfixture"
        dyn_dir.mkdir()
        dyn_render = dyn_dir / "render.php"
        dyn_render.write_text(
            "<?php\n"
            "$element = $is_thing ? 'foo' : 'bar';\n"
            "echo '<div class=\"' . 'sgs-dynfixture__' . $element . '\">';\n",
            encoding="utf-8",
        )
        rows_dyn = [("thingAttr", ".sgs-dynfixture__foo")]
        findings_dyn = evaluate_block("sgs/dynfixture", "dynfixture", dyn_dir, rows_dyn)
        if findings_dyn[0]["status"] != STATUS_UNDETERMINABLE:
            failures.append(
                "dynamic string-concatenation construction was not caught as "
                f"UNDETERMINABLE (got status={findings_dyn[0]['status']!r}) — this is the "
                "vacuity trap: a gate that silently passes an unresolvable class is worse "
                "than no gate."
            )
        else:
            print("[derived-selector-drift --self-test] dynamic concatenation surfaced as "
                  "UNDETERMINABLE, not a silent pass — OK")

        # Case 6: missing source file must surface as UNDETERMINABLE, never a silent OK.
        missing_dir = tmp_dir / "nosource"
        missing_dir.mkdir()
        rows_missing = [("anyAttr", ".sgs-nosource__anything")]
        findings_missing = evaluate_block("sgs/nosource", "nosource", missing_dir, rows_missing)
        if findings_missing[0]["status"] != STATUS_UNDETERMINABLE:
            failures.append(
                "missing render.php was not caught as UNDETERMINABLE "
                f"(got status={findings_missing[0]['status']!r})"
            )
        else:
            print("[derived-selector-drift --self-test] missing source surfaced as "
                  "UNDETERMINABLE, not a silent pass — OK")

        # Case 7: bare-tag fallback fragment (no class claim) must be SKIPPED, not scored.
        rows_bare = [("tagOnlyAttr", "audio")]
        findings_bare = evaluate_block("sgs/fixture", "fixture", fixture_dir, rows_bare)
        if findings_bare[0]["status"] != STATUS_SKIPPED:
            failures.append(
                f"bare-tag selector was not SKIPPED (got status={findings_bare[0]['status']!r})"
            )
        else:
            print("[derived-selector-drift --self-test] bare-tag selector correctly SKIPPED — OK")

    if failures:
        print(f"\n[derived-selector-drift --self-test] FAIL — {len(failures)} case(s) unproven:")
        for f in failures:
            print(f"    - {f}")
        return 1

    print("\n[derived-selector-drift --self-test] PASS — all 7 cases: real classes recognised "
          "(including root class), fictional classes flagged, comment-only mentions correctly "
          "excluded, dynamic concatenation and missing source both surface as UNDETERMINABLE "
          "rather than a silent pass, bare-tag fallbacks correctly skipped.")
    return 0


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Flags block_attributes.derived_selector values naming a class the block "
            "does not actually render (measured from its own render.php/save.js, not "
            "the synthesised value being checked)."
        )
    )
    parser.add_argument("--json", action="store_true", default=False,
                         help="Machine report to stdout. Always exits 0.")
    parser.add_argument("--check", action="store_true", default=False,
                         help="Gating mode: exit 1 on any proven VIOLATION. "
                              "UNDETERMINABLE rows never fail the gate. NOT wired into "
                              "prebuild/CI yet — advisory-first rollout.")
    parser.add_argument("--self-test", action="store_true", default=False,
                         help="Prove the gate can fail. Never touches the real DB or "
                              "real block source.")
    args = parser.parse_args()

    if args.self_test:
        return _self_test()

    if not DB_PATH.exists():
        print(_db_missing_message(), file=sys.stderr)
        return 0

    try:
        conn = sqlite3.connect(str(DB_PATH))
    except sqlite3.OperationalError as exc:
        print(f"\n[derived-selector-drift] SKIPPED — DB present but could not be opened: "
              f"{DB_PATH} ({exc})", file=sys.stderr)
        return 0

    try:
        roster = fetch_roster(conn)
    except sqlite3.OperationalError as exc:
        print(f"\n[derived-selector-drift] FAIL — DB present at {DB_PATH} but the query "
              f"could not run against it: {exc}\n"
              "  Re-run /sgs-update to bring the DB back in sync, then re-run this gate.",
              file=sys.stderr)
        conn.close()
        return 1
    finally:
        conn.close()

    findings = run_all(roster)
    payload = _print_report(findings, args.json)

    if args.check:
        n = payload["totals"]["violations"]
        if n > 0:
            print(f"\n[derived-selector-drift] GATE FAILED — {n} proven violation(s) above.",
                  file=sys.stderr)
            return 1
        print("\n[derived-selector-drift] GATE PASSED — no proven violations "
              "(UNDETERMINABLE rows, if any, still need human review — they do not gate).")
        return 0

    if not args.json:
        print(f"\n[derived-selector-drift] {payload['totals']['violations']} finding(s) — "
              "report mode, exit 0. Run with --check to gate (advisory only — not wired "
              "into prebuild/CI yet).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
