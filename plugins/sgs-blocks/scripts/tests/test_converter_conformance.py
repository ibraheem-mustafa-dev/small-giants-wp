"""test_converter_conformance.py — Gate A: converter golden-fixture conformance harness.

Implements the D178 regression guard: "good docs + undelivered/mis-wired code".
Runs the converter on small fixture drafts, compares the emitted block markup against
captured golden files, and FAILS loudly when a future edit changes the emit unexpectedly.

Fixtures: plugins/sgs-blocks/scripts/tests/fixtures/conformance/*.html
Goldens:  plugins/sgs-blocks/scripts/tests/fixtures/conformance/*.golden.json

Regeneration mode (re-baseline after an intentional converter improvement):
    REGEN=1 python -m pytest plugins/sgs-blocks/scripts/tests/test_converter_conformance.py -v

Or via pytest flag:
    python -m pytest ... --regen-golden

UK English throughout.
Run from repo root:
    python -m pytest plugins/sgs-blocks/scripts/tests/test_converter_conformance.py -v
"""
from __future__ import annotations

import json
import os
import re
import sqlite3
import sys
from pathlib import Path

import pytest
from bs4 import BeautifulSoup

# ---------------------------------------------------------------------------
# sys.path — add scripts root so orchestrator.converter_v2 resolves
# ---------------------------------------------------------------------------

_REPO_ROOT = Path(__file__).resolve().parents[4]        # small-giants-wp/
_SCRIPTS_ROOT = _REPO_ROOT / "plugins" / "sgs-blocks" / "scripts"

if str(_SCRIPTS_ROOT) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_ROOT))

# ---------------------------------------------------------------------------
# Import the converter entry points.
# Entry point: walk() at convert.py line 2603, called exactly as in main()
#   (line 3958): walk(section, css_rules, variation_buf, is_top_level=True)
# parse_css() at line 319 converts a CSS string to {selector: {prop: value}}.
# ---------------------------------------------------------------------------

from orchestrator.converter_v2.convert import parse_css, walk  # noqa: E402

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

_FIXTURE_DIR = _SCRIPTS_ROOT / "tests" / "fixtures" / "conformance"
_SGS_DB_PATH = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"


# ---------------------------------------------------------------------------
# pytest option — --regen-golden
# ---------------------------------------------------------------------------

def pytest_addoption(parser):  # type: ignore[override]
    """Register the --regen-golden flag."""
    try:
        parser.addoption(
            "--regen-golden",
            action="store_true",
            default=False,
            help="Regenerate golden files from the current converter emit. "
                 "Only use when an intentional converter improvement is being baselined.",
        )
    except ValueError:
        # Option already registered (happens when pytest collects multiple test files
        # that each define pytest_addoption — safe to swallow).
        pass


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _regen_mode() -> bool:
    """Return True if golden regeneration is requested."""
    return os.environ.get("REGEN", "").strip() == "1"


def _extract_fixture_parts(html_content: str) -> tuple[str, "Tag"]:
    """Extract CSS text and <section> Tag from a fixture HTML file."""
    soup = BeautifulSoup(html_content, "html.parser")
    style_tag = soup.find("style")
    css_text = style_tag.get_text() if style_tag else ""
    section = soup.find("section")
    if section is None:
        raise ValueError("No <section> element found in fixture")
    return css_text, section


def _run_converter(section: "Tag", css_text: str) -> str:
    """Run the converter on a single section node.

    Uses the same call pattern as convert.py main() line 3958:
        result = walk(section, css_rules, variation_buf, is_top_level=True)
    """
    css_rules = parse_css(css_text)
    variation_buf: list[str] = []
    result = walk(section, css_rules, variation_buf, is_top_level=True)
    return result or ""


def _all_block_slugs_in(markup: str) -> list[str]:
    """Return unique block slugs present in WP block comment markup, in order."""
    seen: set[str] = set()
    out: list[str] = []
    for m in re.finditer(r"wp:([a-z][a-z0-9/.-]+)", markup):
        slug = m.group(1)
        if slug not in seen:
            out.append(slug)
            seen.add(slug)
    return out


def _collect_fixture_pairs() -> list[tuple[str, Path, Path]]:
    """Return list of (test_id, html_path, golden_path) for every .html fixture
    that has a corresponding .golden.json file.

    Test IDs are derived from the HTML filename stem (e.g. 'sgs-hero').
    """
    pairs = []
    for html_path in sorted(_FIXTURE_DIR.glob("*.html")):
        golden_path = html_path.with_suffix(".golden.json")
        if golden_path.exists():
            pairs.append((html_path.stem, html_path, golden_path))
    return pairs


# ---------------------------------------------------------------------------
# Parametrised conformance tests — one per fixture
# ---------------------------------------------------------------------------

@pytest.mark.parametrize(
    "test_id,html_path,golden_path",
    _collect_fixture_pairs(),
    ids=[p[0] for p in _collect_fixture_pairs()],
)
def test_golden_conformance(
    test_id: str,
    html_path: Path,
    golden_path: Path,
    request: pytest.FixtureRequest,
) -> None:
    """Run the converter on <fixture>.html and compare against <fixture>.golden.json.

    Regen mode: when --regen-golden flag is set OR REGEN=1 env var, REWRITE the
    golden file with the current emit and print a warning. The test then PASSES
    (to allow batch regeneration). Commit the new goldens with a cited reason.
    """
    regen = _regen_mode() or request.config.getoption("--regen-golden", default=False)

    html_content = html_path.read_text(encoding="utf-8")
    css_text, section = _extract_fixture_parts(html_content)
    actual_markup = _run_converter(section, css_text)

    assert actual_markup, (
        f"[{test_id}] Converter returned empty markup for fixture {html_path.name}. "
        "The converter should always return at least one WP block comment for a valid section."
    )

    if regen:
        _write_golden(golden_path, html_path.name, actual_markup)
        print(f"\n  ⚠  REGEN: golden re-baselined for {test_id} — commit with cited reason")
        return  # Pass immediately after regen

    golden_data = json.loads(golden_path.read_text(encoding="utf-8"))
    expected_markup: str = golden_data["markup"]

    # Primary assertion — exact string match on emitted markup
    assert actual_markup == expected_markup, (
        f"[{test_id}] Converter emit diverged from golden.\n"
        f"  Fixture:  {html_path.name}\n"
        f"  Golden:   {golden_path.name}\n"
        f"  Expected blocks: {_all_block_slugs_in(expected_markup)}\n"
        f"  Actual blocks:   {_all_block_slugs_in(actual_markup)}\n"
        f"\n--- EXPECTED (first 600 chars) ---\n{expected_markup[:600]}\n"
        f"\n--- ACTUAL (first 600 chars) ---\n{actual_markup[:600]}\n"
        f"\nIf this is an intentional improvement, run with --regen-golden "
        f"OR set REGEN=1 to re-baseline. Commit the new golden with a cited reason."
    )


def _write_golden(golden_path: Path, fixture_name: str, markup: str) -> None:
    """Write a golden JSON file for the given markup."""
    m = re.search(r"wp:([a-z/][a-z0-9/-]+)", markup)
    primary_block = m.group(1) if m else "unknown"
    golden = {
        "fixture": fixture_name,
        "primary_block_emitted": primary_block,
        "markup": markup,
    }
    golden_path.write_text(json.dumps(golden, indent=2, ensure_ascii=False), encoding="utf-8")


# ---------------------------------------------------------------------------
# DB invariant assertions (council-required — these do NOT depend on the converter;
# they guard the DB state that the converter reads at runtime)
# ---------------------------------------------------------------------------

class TestDbInvariants:
    """Two DB invariant assertions required by the Gate A spec.

    These run against the live sgs-framework.db and are skipped if the DB is
    unavailable (offline / path not found), so CI can still run.
    """

    @pytest.fixture(autouse=True)
    def _skip_if_no_db(self) -> None:
        if not _SGS_DB_PATH.exists():
            pytest.skip(
                f"sgs-framework.db not found at {_SGS_DB_PATH} — "
                "DB invariant checks require the live DB. Run /sgs-update to populate."
            )

    # ---- Invariant A --------------------------------------------------------
    # block_attributes rows for sgs/hero contentPadding* and sgs/container
    # contentWidth must have canonical_slot='content' AND role='layout'.
    # Rationale: these are the canonical wrapper-layer attrs per Spec 22 §FR-22-21.
    # A migration that accidentally clears canonical_slot or role would silently
    # break the converter's wrapper-CSS lift.

    def test_invariant_a_hero_content_padding_canonical_slot(self) -> None:
        """sgs/hero contentPadding* attrs: canonical_slot='content', role='layout'."""
        conn = sqlite3.connect(_SGS_DB_PATH)
        try:
            rows = conn.execute(
                """
                SELECT attr_name, canonical_slot, role
                FROM block_attributes
                WHERE block_slug = 'sgs/hero'
                  AND attr_name LIKE 'contentPadding%'
                ORDER BY attr_name
                """
            ).fetchall()
        finally:
            conn.close()

        assert rows, (
            "No 'sgs/hero' contentPadding* rows found in block_attributes. "
            "Run /sgs-update to populate. These attrs are required for the wrapper-layer lift (Spec 22 §FR-22-21)."
        )

        failures = []
        for attr_name, canonical_slot, role in rows:
            if canonical_slot != "content":
                failures.append(f"  {attr_name}: canonical_slot={canonical_slot!r} (expected 'content')")
            if role != "layout":
                failures.append(f"  {attr_name}: role={role!r} (expected 'layout')")

        assert not failures, (
            f"sgs/hero contentPadding* attrs have wrong canonical_slot or role in DB:\n"
            + "\n".join(failures)
            + "\nFix via /sgs-update or a targeted DB migration. "
              "Incorrect values break the wrapper-layer lift (Spec 22 §FR-22-21)."
        )

    def test_invariant_a_container_content_width_canonical_slot(self) -> None:
        """sgs/container contentWidth attr: canonical_slot='content', role='layout'."""
        conn = sqlite3.connect(_SGS_DB_PATH)
        try:
            row = conn.execute(
                """
                SELECT canonical_slot, role
                FROM block_attributes
                WHERE block_slug = 'sgs/container'
                  AND attr_name = 'contentWidth'
                """
            ).fetchone()
        finally:
            conn.close()

        assert row is not None, (
            "No 'sgs/container' 'contentWidth' row found in block_attributes. "
            "Run /sgs-update. This attr is load-bearing for the wrapper contentWidth lift."
        )

        canonical_slot, role = row
        assert canonical_slot == "content", (
            f"sgs/container.contentWidth: canonical_slot={canonical_slot!r}, expected 'content'. "
            "This breaks the wrapper-layer contentWidth transfer (Spec 22 §FR-22-21)."
        )
        assert role == "layout", (
            f"sgs/container.contentWidth: role={role!r}, expected 'layout'. "
            "Incorrect role classification breaks the wrapper-layer lift."
        )

    # ---- Invariant B --------------------------------------------------------
    # NO row in the slots table with slot_name='content' should have a non-NULL
    # standalone_block. The 'content' slot is the generic InnerBlocks placeholder;
    # routing it to a standalone block would cause the walker to emit a rogue child
    # block for every node whose canonical_slot resolves to 'content' (13 stem-
    # collision text-content rows as of the spec). This is the "stem-collision trap".

    def test_invariant_b_content_slot_has_no_standalone_block(self) -> None:
        """slots table: no 'content' slot row may have a non-NULL standalone_block."""
        conn = sqlite3.connect(_SGS_DB_PATH)
        try:
            rows = conn.execute(
                """
                SELECT slot_name, scope, standalone_block
                FROM slots
                WHERE slot_name = 'content'
                  AND standalone_block IS NOT NULL
                  AND standalone_block != ''
                """
            ).fetchall()
        finally:
            conn.close()

        assert not rows, (
            "The 'content' slot has standalone_block set — this would cause the walker "
            "to emit rogue child blocks for every text-content node whose canonical_slot "
            "resolves to 'content' (13+ stem-collision rows). "
            f"Offending rows: {rows}. "
            "Fix: set standalone_block=NULL for all 'content' slot rows in sgs-framework.db. "
            "See Spec 22 §FR-22-1 (DB-first, no hardcoded dicts) + standalone_block_for() docstring."
        )


# ---------------------------------------------------------------------------
# Smoke test — verify the harness itself is wired correctly
# ---------------------------------------------------------------------------

class TestHarnessSmoke:
    """Sanity checks on the harness machinery itself (not the converter logic)."""

    def test_fixture_dir_exists(self) -> None:
        """Fixture directory must exist and contain at least 29 composites + 2 extras."""
        assert _FIXTURE_DIR.is_dir(), f"Fixture dir not found: {_FIXTURE_DIR}"
        html_files = list(_FIXTURE_DIR.glob("*.html"))
        assert len(html_files) >= 31, (
            f"Expected at least 31 fixture files (29 composites + precedence-collision + "
            f"mamas-trust-bar-real), found {len(html_files)}"
        )

    def test_every_html_has_a_golden(self) -> None:
        """Every .html fixture must have a matching .golden.json file."""
        missing_goldens = []
        for html_path in sorted(_FIXTURE_DIR.glob("*.html")):
            golden = html_path.with_suffix(".golden.json")
            if not golden.exists():
                missing_goldens.append(html_path.name)
        assert not missing_goldens, (
            f"These fixtures have no golden file — run the test with --regen-golden "
            f"to generate them: {missing_goldens}"
        )

    def test_converter_entry_point_callable(self) -> None:
        """walk() and parse_css() must be importable and callable from scripts root."""
        html = '<section class="sgs-hero"><p>Smoke</p></section>'
        soup = BeautifulSoup(html, "html.parser")
        section = soup.find("section")
        result = walk(section, {}, is_top_level=True)
        assert result and "wp:" in result, (
            f"walk() should return WP block markup for a minimal sgs-hero section. Got: {result!r}"
        )

    def test_golden_files_are_valid_json(self) -> None:
        """All .golden.json files must parse as valid JSON with required keys."""
        invalid = []
        for golden_path in sorted(_FIXTURE_DIR.glob("*.golden.json")):
            try:
                data = json.loads(golden_path.read_text(encoding="utf-8"))
                for key in ("fixture", "primary_block_emitted", "markup"):
                    if key not in data:
                        invalid.append(f"{golden_path.name}: missing key '{key}'")
            except (json.JSONDecodeError, OSError) as exc:
                invalid.append(f"{golden_path.name}: {exc}")
        assert not invalid, f"Invalid golden files:\n" + "\n".join(invalid)


# ---------------------------------------------------------------------------
# Call-graph assertion: each lifter has exactly ONE production caller
# (Commit 1a enforcement gate)
# ---------------------------------------------------------------------------

class TestLiftersHaveSingleCaller:
    """Assert that the three CSS-lift helpers are called ONLY from route_node_css.

    After the Commit-1a call-site consolidation, each lifter must appear as a
    call expression (name + '(') exclusively inside the body of route_node_css.
    Any second call site elsewhere in convert.py means the refactor is
    incomplete — this test will fail immediately, preventing silent regression.

    Exclusions (not counted as production callers):
      - The def line of each lifter itself (``def _lift_...``)
      - Comment / docstring lines (lines whose stripped content starts with '#'
        or whose content is part of a triple-quoted string — approximated by
        checking for the pattern inside the route_node_css body only)
      - The def line of route_node_css itself

    How this test would FAIL if a second caller existed:
      If any code outside route_node_css's body contained, e.g.,
      ``_lift_root_supports_to_style(`` as a call, the regex scan of lines
      outside the route_node_css block would find a match and assert would
      fail with the offending line number and content.
    """

    _LIFTER_NAMES = (
        "_lift_typography_to_block_attrs",
        "_lift_root_supports_to_style",
        "_lift_wrapper_css_to_container_attrs",
    )

    @staticmethod
    def _parse_route_node_css_body(source_lines: list[str]) -> tuple[int, int]:
        """Return (start_line_idx, end_line_idx) of route_node_css body (0-indexed).

        Start is the first line of the function BODY — i.e., the line AFTER the
        closing ``) -> None:`` (or ``):`` / ``) -> None:``) of the function signature.
        End is the line index of the next top-level ``def `` or ``class `` at
        column 0.

        Works correctly with multi-line function signatures.
        """
        # Step 1: find the ``def route_node_css(`` line.
        def_line: int | None = None
        for i, line in enumerate(source_lines):
            if line.startswith("def route_node_css("):
                def_line = i
                break
        assert def_line is not None, "route_node_css not found in convert.py source"

        # Step 2: find the end of the function signature (closing ``:`` at column 0
        # or indented) by scanning forward until we hit a line that ends with ``:``
        # and is not a continuation of the parameter list.  The closing line of a
        # multi-line def always ends with ``) -> None:`` or ``):`` without leading
        # whitespace for the ``:`` character (it's part of ``) -> None:``).
        # More robustly: the BODY starts on the first line that is fully indented
        # (starts with whitespace) AFTER the def and its signature close.
        sig_end: int | None = None
        for i in range(def_line, len(source_lines)):
            stripped = source_lines[i].rstrip()
            if i == def_line:
                # The def line itself — keep scanning.
                if stripped.endswith(":"):
                    # Single-line def (no params or params on same line).
                    sig_end = i
                continue
            # A line that is part of the signature will NOT start with 4-space indent
            # used by the function body — it will either be a continuation (deeper
            # indent, param lines) or the closing ``) -> None:``.
            # The closing line ends with ``:`` and starts at column 0 (``):`` or
            # ``) -> None:``).
            if stripped.endswith(":"):
                sig_end = i
                break
        assert sig_end is not None, "route_node_css signature end not found"
        start = sig_end + 1

        # Step 3: scan for the next top-level ``def`` or ``class`` at column 0.
        end = len(source_lines)
        for i in range(start, len(source_lines)):
            line = source_lines[i]
            if not line:
                continue
            if line[0] not in (" ", "\t") and line.strip():
                # Non-empty line at column 0 — this is the next top-level symbol.
                end = i
                break
        return start, end

    def test_lifters_have_single_caller(self) -> None:
        """Each lifter name must appear as a call ONLY inside route_node_css body."""
        convert_path = (
            _SCRIPTS_ROOT / "orchestrator" / "converter_v2" / "convert.py"
        )
        source = convert_path.read_text(encoding="utf-8")
        source_lines = source.splitlines(keepends=False)

        body_start, body_end = self._parse_route_node_css_body(source_lines)

        violations: list[str] = []
        for lifter in self._LIFTER_NAMES:
            call_pattern = re.compile(
                r"(?<!def\s)" + re.escape(lifter) + r"\s*\("
            )
            for line_idx, line in enumerate(source_lines):
                stripped = line.strip()
                # Skip def lines (the lifter's own definition and route_node_css def).
                if stripped.startswith("def "):
                    continue
                # Skip comment-only lines.
                if stripped.startswith("#"):
                    continue
                if not call_pattern.search(line):
                    continue
                # A call expression was found on this line.
                # It is allowed ONLY if the line falls inside route_node_css body.
                inside_body = body_start <= line_idx < body_end
                if not inside_body:
                    violations.append(
                        f"Line {line_idx + 1}: {lifter!r} called outside "
                        f"route_node_css (body lines {body_start + 1}–{body_end}): "
                        f"{line.rstrip()!r}"
                    )

        assert not violations, (
            "Lifters must be called ONLY from route_node_css. "
            "Violations found:\n" + "\n".join(violations)
        )
