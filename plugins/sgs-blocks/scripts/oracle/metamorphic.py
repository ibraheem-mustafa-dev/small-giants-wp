"""
oracle.metamorphic — MR-2 metamorphic relation for the F3 LANDED oracle.

Spec ref: .claude/plans/2026-06-18-f3-render-oracle-design.md §4

MR-2 (name-free routing):
  Rename a fixture's BEM class to a slots.aliases synonym WITHIN THE SAME SLOT
  (assert slots_1.standalone_block == slots_2.standalone_block first) → the
  converter must emit markup that is normalised-markup-identical AND equal to the
  known-correct golden (invariance AND correctness).

Coverage line:
  "MR-2 covered N of M slot roles; roles with no alias = MR-2-UNCOVERED"

When to skip:
  The live converter (convert.py) requires BeautifulSoup + db_lookup + SGS DB.
  If any of these are unavailable in the test environment, MR-2 is skipped with
  an explicit reason. The comparison logic itself is always real and tested on at
  least one fixture+alias pair when the converter IS available.

Independence:
  DB queries for alias lookups are confined to MR-2 (the only place permitted
  to touch the DB in this module). The verdict engine (verdict.py / guards.py)
  remains DB-free.

UK English in comments.
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Optional

# ---------------------------------------------------------------------------
# DB query helper — restricted to MR-2 only
# ---------------------------------------------------------------------------

_DB_SCRIPT = Path(__file__).parents[3] / ".claude" / "skills" / "sgs-wp-engine" / "scripts" / "sgs-db.py"
# Fallback: ~/.claude path
_DB_SCRIPT_ALT = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "scripts" / "sgs-db.py"


def _parse_aliases(aliases_json: str) -> list[str]:
    """Parse the JSON aliases array from the DB row."""
    try:
        result = json.loads(aliases_json)
        if isinstance(result, list):
            return [str(a) for a in result if a]
        return []
    except (json.JSONDecodeError, TypeError):
        return []


# ---------------------------------------------------------------------------
# MR-2 coverage summary
# ---------------------------------------------------------------------------

def mr2_coverage_summary() -> str:
    """Return the MR-2 coverage line.

    "MR-2 covered N of M slot roles; roles with no alias = MR-2-UNCOVERED"

    N = slots with both standalone_block AND at least one alias (MR-2 testable).
    M = slots with a standalone_block (the MR-2 universe — these should all be testable).

    If the DB is unavailable: "MR-2: DB not available — coverage unknown."
    """
    # All slots with a standalone_block (the universe MR-2 must eventually cover).
    all_slot_rows = _query_all_slots_with_standalone()
    if not all_slot_rows:
        return "MR-2: DB not available — coverage unknown."

    total_m = len(all_slot_rows)

    # Slots that have at least one alias AND a standalone_block (can run MR-2).
    testable_rows = _query_slots_with_standalone_and_aliases()
    covered_n = len(testable_rows)

    # Uncovered = have standalone_block but no aliases.
    covered_names = {r["slot_name"] for r in testable_rows}
    uncovered_names = [
        r["slot_name"] for r in all_slot_rows
        if r["slot_name"] not in covered_names
    ]

    uncovered_str = (
        f"MR-2-UNCOVERED: {uncovered_names}" if uncovered_names
        else "all covered"
    )
    return (
        f"MR-2 covered {covered_n} of {total_m} slot roles; "
        f"roles with no alias = {uncovered_str}"
    )


def _query_slots_with_standalone_and_aliases() -> list[dict]:
    """Query slots that have BOTH standalone_block AND at least one alias.

    These are the MR-2-testable slots.
    """
    db_script = _DB_SCRIPT if _DB_SCRIPT.exists() else _DB_SCRIPT_ALT
    if not db_script.exists():
        return []

    sql = (
        "SELECT slot_name, aliases, standalone_block "
        "FROM slots "
        "WHERE standalone_block IS NOT NULL "
        "AND aliases IS NOT NULL AND aliases != '' AND aliases != '[]'"
    )
    try:
        result = subprocess.run(
            [sys.executable, str(db_script), "sql", sql],
            capture_output=True,
            text=True,
            timeout=15,
        )
        if result.returncode != 0:
            return []

        rows: list[dict] = []
        lines = result.stdout.strip().splitlines()
        data_start = 0
        for i, line in enumerate(lines):
            if line.startswith("---") or line.startswith("  ---"):
                data_start = i + 1
                break

        import re
        for line in lines[data_start:]:
            line = line.strip()
            if not line:
                continue
            parts = re.split(r"  +", line)
            if len(parts) >= 3:
                rows.append({
                    "slot_name": parts[0].strip(),
                    "aliases_json": parts[1].strip(),
                    "standalone_block": parts[2].strip(),
                })
        return rows
    except Exception:
        return []


def _query_all_slots_with_standalone() -> list[dict]:
    """Query all slots that map to a standalone_block (the MR-2 target universe)."""
    db_script = _DB_SCRIPT if _DB_SCRIPT.exists() else _DB_SCRIPT_ALT
    if not db_script.exists():
        return []

    sql = "SELECT slot_name FROM slots WHERE standalone_block IS NOT NULL"
    try:
        result = subprocess.run(
            [sys.executable, str(db_script), "sql", sql],
            capture_output=True,
            text=True,
            timeout=15,
        )
        if result.returncode != 0:
            return []

        rows: list[dict] = []
        lines = result.stdout.strip().splitlines()
        data_start = 0
        for i, line in enumerate(lines):
            if line.startswith("---") or line.startswith("  ---"):
                data_start = i + 1
                break

        import re
        for line in lines[data_start:]:
            line = line.strip()
            if not line:
                continue
            parts = re.split(r"  +", line)
            if parts:
                rows.append({"slot_name": parts[0].strip()})
        return rows
    except Exception:
        return []


# ---------------------------------------------------------------------------
# BEM class renaming helper
# ---------------------------------------------------------------------------

def _rename_bem_class_in_html(html: str, original_class: str, alias_class: str) -> str:
    """Replace BEM element class occurrences in HTML.

    Replaces class="... <original_class> ..." with alias_class.
    Also handles the BEM block root class pattern (.sgs-<slot_name> → alias).
    Uses string replacement to stay lightweight (no BS4 dependency in the engine).
    """
    import re
    # Replace in class="..." attributes: whole-word match to avoid partial replacement.
    pattern = re.compile(
        r'(class\s*=\s*["\'][^"\']*)\b' + re.escape(original_class) + r'\b([^"\']*["\'])'
    )
    replaced = pattern.sub(lambda m: m.group(1) + alias_class + m.group(2), html)
    return replaced


# ---------------------------------------------------------------------------
# Normalised WP-block-markup equality (FIX-H)
# ---------------------------------------------------------------------------
#
# convert.py emits WordPress block-comment MARKUP, NOT JSON
# (verified: convert.py prints '<!-- wp:sgs/hero {"…"} -->…<!-- /wp:sgs/hero -->'
#  under a 'WP BLOCK MARKUP' banner — convert.py:6268-6270).
#
# A bare json.loads() would therefore ALWAYS fail and silently fall back to a
# raw-string compare, voiding the "semantic" guarantee.  This comparator instead:
#   1. Parses every block-comment's inline JSON attrs and canonicalises them
#      (sorted keys) — so attr KEY ORDERING and whitespace are normalised.
#   2. Collapses inter-tag whitespace in the surrounding HTML body.
# It is therefore a *normalised-markup* compare (block attrs are semantic; the
# HTML body is whitespace-normalised), NOT a free-text string compare.

_BLOCK_COMMENT_RE = re.compile(
    r"<!--\s*(/?)wp:([a-z0-9/-]+)\s*(\{.*?\})?\s*(/?)-->",
    re.IGNORECASE | re.DOTALL,
)


def _canonicalise_block_markup(markup: str) -> str:
    """Canonicalise WP block markup for semantic comparison.

    Each block comment's inline JSON attrs is parsed and re-serialised with
    sorted keys; the rest of the markup has its inter-token whitespace collapsed.
    Returns a canonical string; raises ValueError if a block comment's JSON is
    malformed (so the caller does not silently degrade to a raw compare).
    """
    out_parts: list[str] = []
    last_end = 0

    for m in _BLOCK_COMMENT_RE.finditer(markup):
        # Whitespace-normalise the body between comments.
        between = markup[last_end:m.start()]
        out_parts.append(re.sub(r"\s+", " ", between).strip())

        closing = m.group(1)        # '/' if a closing comment
        block_name = m.group(2).strip().lower()
        attrs_json = m.group(3)
        self_closing = m.group(4)   # '/' if a void block

        canon_attrs = ""
        if attrs_json:
            parsed = json.loads(attrs_json)  # raises on malformed → no silent degrade
            canon_attrs = json.dumps(parsed, sort_keys=True, ensure_ascii=False)

        out_parts.append(
            f"<!--{closing}wp:{block_name}{(' ' + canon_attrs) if canon_attrs else ''}"
            f"{self_closing}-->"
        )
        last_end = m.end()

    # Trailing body after the last comment.
    out_parts.append(re.sub(r"\s+", " ", markup[last_end:]).strip())
    return "".join(out_parts)


def _normalised_markup_equal(a: str, b: str) -> bool:
    """Return True if two WP-block-markup strings are semantically identical.

    Block-comment JSON attrs compared by VALUE (sorted keys); HTML body compared
    after whitespace collapse.  If EITHER side has no block comment AND parses as
    JSON, fall back to a JSON-semantic compare (covers golden fixtures expressed
    as JSON in tests).  Malformed block-comment JSON → False (never a silent
    raw-string degrade — FIX-H).
    """
    # If both sides parse as pure JSON (no block markup), compare semantically.
    a_has_block = bool(_BLOCK_COMMENT_RE.search(a))
    b_has_block = bool(_BLOCK_COMMENT_RE.search(b))
    if not a_has_block and not b_has_block:
        try:
            pa, pb = json.loads(a), json.loads(b)
            return (
                json.dumps(pa, sort_keys=True, ensure_ascii=False)
                == json.dumps(pb, sort_keys=True, ensure_ascii=False)
            )
        except (json.JSONDecodeError, TypeError):
            # Neither block markup nor JSON — last-resort whitespace-normalised compare.
            return re.sub(r"\s+", " ", a).strip() == re.sub(r"\s+", " ", b).strip()

    # At least one side is block markup — canonicalise both as markup.
    try:
        return _canonicalise_block_markup(a) == _canonicalise_block_markup(b)
    except (json.JSONDecodeError, ValueError):
        # Malformed block-comment JSON — cannot assert semantic equality.
        return False


# ---------------------------------------------------------------------------
# Converter invocation
# ---------------------------------------------------------------------------

_MARKUP_BANNER = "WP BLOCK MARKUP"
_VARIATION_BANNER = "VARIATION CSS"
_BANNER_RULE = "=" * 60


def _extract_markup_from_convert_stdout(stdout: str) -> Optional[str]:
    """Extract only the WP block markup from convert.py's banner-wrapped stdout.

    convert.py prints (convert.py:6267-6276):
        ===...===
        WP BLOCK MARKUP (Spec 22 universal walker)
        ===...===
        <the markup>
        (blank)
        [optional] ===...=== / VARIATION CSS / ===...=== / <css>

    Returns the markup between the WP-BLOCK-MARKUP banner and the next banner
    (VARIATION CSS) or end of output.  None if the banner is absent.
    """
    lines = stdout.splitlines()
    start = None
    for i, line in enumerate(lines):
        if _MARKUP_BANNER in line:
            # markup starts after this banner line + the trailing rule line.
            start = i + 2
            break
    if start is None:
        return None

    end = len(lines)
    for j in range(start, len(lines)):
        if _VARIATION_BANNER in lines[j]:
            # back up over the rule line that precedes the VARIATION banner.
            end = j - 1
            break
    return "\n".join(lines[start:end]).strip()


# NOTE (FIX-H): convert.py's `if __name__ == "__main__":` block runs the Spec-22
# SELF-TESTS and ignores argv — it does NOT call main(argv).  So `python
# convert.py <html> <css>` does NOT convert; it runs self-tests.  The real
# conversion entry point is the module-level `main(argv)` function.  This helper
# therefore invokes `main()` via a `-c` shim subprocess (keeping the converter's
# heavy deps — BeautifulSoup, db_lookup — out of the oracle import namespace).
# main() emits WP block-comment MARKUP (not JSON) under a banner (convert.py:6267).

_CONVERT_RUNNER_TEMPLATE = (
    "import sys; sys.argv = ['convert.py', {html!r}, {css!r}]; "
    "import convert; raise SystemExit(convert.main(sys.argv))"
)


def _run_converter(html_content: str) -> Optional[str]:
    """Run convert.main() on the given HTML, return the emitted WP block MARKUP.

    Invokes the converter's module-level main(argv) (NOT its __main__ self-test
    block) via a `-c` shim subprocess, passing the two REQUIRED positional args
    (HTML file + CSS file — convert.py:6243/6250-6251).  Extracts only the markup
    block from the banner-wrapped stdout (FIX-H).

    Returns None if the converter is unavailable or fails (MR-2 skipped — the unit
    tests exercise the comparison logic directly via synthetic markup, so the
    'semantic' guarantee is proven without a live converter/DB).
    """
    converter_dir = Path(__file__).parents[1] / "orchestrator" / "converter_v2"
    convert_script = converter_dir / "convert.py"
    if not convert_script.exists():
        return None

    import tempfile
    import os

    html_path: Optional[str] = None
    css_path: Optional[str] = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".html", delete=False, encoding="utf-8"
        ) as tmp_html:
            tmp_html.write(html_content)
            html_path = tmp_html.name
        # convert.main() requires a CSS positional arg; an empty file is valid input.
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".css", delete=False, encoding="utf-8"
        ) as tmp_css:
            tmp_css.write("")
            css_path = tmp_css.name

        runner = _CONVERT_RUNNER_TEMPLATE.format(html=html_path, css=css_path)
        result = subprocess.run(
            [sys.executable, "-c", runner],
            capture_output=True,
            text=True,
            timeout=60,
            cwd=str(converter_dir),  # so `import convert` + its `import db_lookup` resolve
        )
        if result.returncode != 0:
            return None
        return _extract_markup_from_convert_stdout(result.stdout)
    except Exception:
        return None
    finally:
        for p in (html_path, css_path):
            if p:
                try:
                    os.unlink(p)
                except Exception:
                    pass


# ---------------------------------------------------------------------------
# MR-2 single-pair assertion
# ---------------------------------------------------------------------------

def assert_mr2_pair(
    fixture_html: str,
    original_slot_name: str,
    alias_name: str,
    standalone_block_original: str,
    standalone_block_alias: str,
    golden_output: Optional[str] = None,
) -> dict:
    """Assert MR-2 invariance for one (original_slot_name, alias_name) pair.

    Steps:
    1. Assert standalone_block_original == standalone_block_alias (same slot).
    2. Run converter on fixture_html (original) → output_original.
    3. Rename original_slot_name → alias_name in fixture_html.
    4. Run converter on renamed HTML → output_alias.
    5. Assert output_original normalised-markup equals output_alias (invariance).
    6. If golden_output supplied: assert output_original equals golden (correctness).

    Returns a result dict with keys:
      passed: bool
      reason: str
      coverage_note: str
      original_output: str | None
      alias_output: str | None
    """
    # Step 1: same-slot assertion.
    if standalone_block_original != standalone_block_alias:
        return {
            "passed": False,
            "reason": (
                f"MR-2 precondition FAIL: standalone_block for {original_slot_name!r} "
                f"({standalone_block_original!r}) != standalone_block for {alias_name!r} "
                f"({standalone_block_alias!r}). Not the same slot — MR-2 requires "
                "same standalone_block."
            ),
            "coverage_note": "MR-2-PRECONDITION-FAIL",
            "original_output": None,
            "alias_output": None,
        }

    # Step 2: run converter on original.
    output_original = _run_converter(fixture_html)
    if output_original is None:
        return {
            "passed": False,
            "reason": "MR-2: converter not available or failed on original fixture.",
            "coverage_note": "MR-2-SKIPPED-CONVERTER-UNAVAILABLE",
            "original_output": None,
            "alias_output": None,
        }

    # Step 3: rename BEM class.
    renamed_html = _rename_bem_class_in_html(fixture_html, original_slot_name, alias_name)
    if renamed_html == fixture_html:
        return {
            "passed": False,
            "reason": (
                f"MR-2: class {original_slot_name!r} not found in fixture HTML. "
                "Cannot rename for alias test."
            ),
            "coverage_note": "MR-2-SKIPPED-CLASS-NOT-IN-FIXTURE",
            "original_output": output_original,
            "alias_output": None,
        }

    # Step 4: run converter on renamed HTML.
    output_alias = _run_converter(renamed_html)
    if output_alias is None:
        return {
            "passed": False,
            "reason": "MR-2: converter failed on alias-renamed fixture.",
            "coverage_note": "MR-2-FAIL-ALIAS-CONVERTER-ERROR",
            "original_output": output_original,
            "alias_output": None,
        }

    # Step 5: invariance check.
    if not _normalised_markup_equal(output_original, output_alias):
        return {
            "passed": False,
            "reason": (
                f"MR-2 FAIL (invariance): converter output differs when "
                f"{original_slot_name!r} is renamed to alias {alias_name!r}. "
                "Name-free routing is BROKEN for this slot."
            ),
            "coverage_note": "MR-2-INVARIANCE-FAIL",
            "original_output": output_original,
            "alias_output": output_alias,
        }

    # Step 6: correctness check (if golden supplied).
    if golden_output is not None:
        if not _normalised_markup_equal(output_original, golden_output):
            return {
                "passed": False,
                "reason": (
                    "MR-2 FAIL (correctness): converter output does not match "
                    "the known-correct golden for this fixture."
                ),
                "coverage_note": "MR-2-CORRECTNESS-FAIL",
                "original_output": output_original,
                "alias_output": output_alias,
            }

    return {
        "passed": True,
        "reason": (
            f"MR-2 PASS: renaming {original_slot_name!r} → {alias_name!r} "
            f"(same standalone_block: {standalone_block_original!r}) produces "
            "normalised-markup-identical converter output."
        ),
        "coverage_note": "MR-2-COVERED",
        "original_output": output_original,
        "alias_output": output_alias,
    }


# ---------------------------------------------------------------------------
# CLI entry (coverage report)
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print(mr2_coverage_summary())
