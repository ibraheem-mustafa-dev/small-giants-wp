"""test_converter_conformance.py — Gate A: converter fixture conformance harness.

Implements the D178 regression guard: "good docs + undelivered/mis-wired code".
Runs the converter on small fixture drafts and checks it produces WP block
markup for each — plus the DB-invariant + dispatch-determinism assertions
that guard the DB state the converter's resolver dispatch reads at runtime.

REWIRED (EXECUTION Step 16, Phase 6, 2026-07-05): the frozen
``orchestrator.converter_v2.convert.walk()``/``parse_css()`` harness is
deleted along with the frozen tree. This file now drives the converter
through the same public entry point production uses,
``converter.entry.convert_section`` — no direct frozen internals.

Two classes from the pre-Step-16 version are GONE, with justification (they
tested frozen-tree internal structure that has no new-engine equivalent, not
convert_section's observable behaviour — nothing to rewire):
  - ``TestLiftersHaveSingleCaller`` — AST-scanned convert.py's own source for
    a single-caller invariant on 3 named private lifter functions
    (``_lift_typography_to_block_attrs`` etc.) inside ``route_node_css``.
    The new engine has no ``route_node_css`` — it dispatches CSS declarations
    through per-property resolvers (``converter/resolvers/*.py``), a
    structurally different call graph with no 1:1 analogue to pin.
  - The ORIGINAL exact-string golden-diff assertion in
    ``test_golden_conformance`` was downgraded (Step 16) to a smoke check
    ("did the converter emit >=1 wp: block at all") because the OLD
    top-level ``*.golden.json`` files were captured from the FROZEN walker's
    emit shape and no longer matched the new engine's output. That left the
    regression net effectively dead — see ``feedback_dead_output_claims_are_
    scope_relative_and_instruments_are_qc_able``.

RE-SEEDED (D278, 2026-07-05): a fresh golden corpus was captured from the
current, LANDED-verified engine via ``tests/seed_conformance_goldens.py``
into ``tests/fixtures/conformance/goldens/`` (a NEW directory — the old
top-level ``*.golden.json`` files are left untouched as historical frozen-
engine reference; ``TestHarnessSmoke`` still checks those exist/parse, but
they are no longer the conformance signal). 40 goldens total: 31 from the
existing fixture corpus + 9 from the real ``sites/mamas-munches/mockups/
homepage/index.html`` draft (its 7 top-level ``<section>`` children of
``<main>`` plus ``<header>``/``<footer>`` — the latter two golden as
``status: "chrome-skipped"`` with empty markup, which IS correct per
FR-31-3 exception 2). ``test_golden_conformance`` below now BYTE-COMPARES
the live emit's ``status``/``block_name``/``selector``/``block_markup``
against these goldens — real regression protection restored.

Re-seeding is NOT done via an in-test ``--regen-golden``/``REGEN=1`` flag
any more (removed — see ``tests/seed_conformance_goldens.py`` for why a
single sanctioned re-seed path replaces it). To re-baseline after an
INTENTIONAL converter change:
    python tests/seed_conformance_goldens.py
— but ONLY after a fresh LANDED deploy proof (real canary deploy +
computed-parity check), cited in the commit message. Never re-seed from a
bare local emit (see that script's module docstring for the provenance
gate).

``TestDispatchDeterminism`` is KEPT + rewired: verified live that
``converter.db.db_lookup.attr_for_property`` returns the identical verdicts
for every pinned (block, property) pair as the frozen ``converter_v2``
version did (2026-07-05 spot-check), so the pin still holds meaning against
the new engine's dispatch table.

UK English throughout.
Run from repo root:
    python -m pytest plugins/sgs-blocks/scripts/tests/test_converter_conformance.py -v
"""
from __future__ import annotations

import json
import re
import sqlite3
import sys
from pathlib import Path

import pytest
from bs4 import BeautifulSoup

# ---------------------------------------------------------------------------
# sys.path — add scripts root so converter.* resolves
# ---------------------------------------------------------------------------

_REPO_ROOT = Path(__file__).resolve().parents[4]        # small-giants-wp/
_SCRIPTS_ROOT = _REPO_ROOT / "plugins" / "sgs-blocks" / "scripts"

if str(_SCRIPTS_ROOT) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_ROOT))

# ---------------------------------------------------------------------------
# Import the converter entry point — the same one production uses.
# ---------------------------------------------------------------------------

from converter.entry import convert_section  # noqa: E402

# ---------------------------------------------------------------------------
# Load tests/seed_conformance_goldens.py by FILE PATH, not package import.
# Rationale: several sibling directories in this repo are named "tests"
# (converter/tests, ledger/tests, and cheat-gate/tests — the latter under an
# invalid, hyphenated parent package name). Under --import-mode=importlib a
# combined multi-path pytest invocation can register the bare module name
# "tests" against whichever of those directories collection reaches first,
# so `from tests.seed_conformance_goldens import ...` is NOT reliable across
# invocations. A direct file-path load (mirroring the
# sgs-clone-orchestrator.py `_load_module_from_path` pattern used for the
# same class of problem) sidesteps the collision entirely.
# ---------------------------------------------------------------------------
import importlib.util as _importlib_util

_SEED_MODULE_PATH = Path(__file__).resolve().parent / "seed_conformance_goldens.py"
_seed_spec = _importlib_util.spec_from_file_location(
    "sgs_conformance_golden_seeder", _SEED_MODULE_PATH
)
_seed_mod = _importlib_util.module_from_spec(_seed_spec)
_seed_spec.loader.exec_module(_seed_mod)  # type: ignore[union-attr]

_GOLDEN_DIR = _seed_mod.GOLDEN_DIR
_REAL_DRAFT_SLUG_PREFIX = _seed_mod._REAL_DRAFT_SLUG_PREFIX
collect_real_draft_sections = _seed_mod.collect_real_draft_sections
_seed_extract_fixture_parts = _seed_mod.extract_fixture_parts
_seed_run_converter_full = _seed_mod.run_converter_full

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

_FIXTURE_DIR = _SCRIPTS_ROOT / "tests" / "fixtures" / "conformance"
_SGS_DB_PATH = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"



# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

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
    """Run the converter on a single section node via the real production
    entry point (``converter.entry.convert_section``)."""
    result = convert_section(html=str(section), css=css_text, media_map={})
    return result.get("block_markup") or ""


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


def _collect_golden_ids() -> list[str]:
    """Return sorted golden_ids for every *.golden.json under GOLDEN_DIR (D278
    re-seed) — 31 fixture-derived + 9 real-draft-section-derived."""
    return sorted(p.name[: -len(".golden.json")] for p in _GOLDEN_DIR.glob("*.golden.json"))


_REAL_DRAFT_SECTIONS_CACHE: dict[str, tuple["Tag", str]] | None = None


def _real_draft_sections_by_id() -> dict[str, tuple["Tag", str]]:
    """Lazily parse the real mamas-munches draft once per test session and
    index its 9 top-level sections by golden_id."""
    global _REAL_DRAFT_SECTIONS_CACHE
    if _REAL_DRAFT_SECTIONS_CACHE is None:
        _REAL_DRAFT_SECTIONS_CACHE = {
            golden_id: (tag, css_text)
            for golden_id, tag, css_text in collect_real_draft_sections()
        }
    return _REAL_DRAFT_SECTIONS_CACHE


def _reproduce_golden_result(golden_id: str) -> dict:
    """Re-run the engine for golden_id exactly as seed_conformance_goldens.py
    did, returning the FULL convert_section result dict."""
    if golden_id.startswith(_REAL_DRAFT_SLUG_PREFIX):
        tag, css_text = _real_draft_sections_by_id()[golden_id]
        return _seed_run_converter_full(tag, css_text)
    html_path = _FIXTURE_DIR / f"{golden_id}.html"
    css_text, section = _seed_extract_fixture_parts(html_path.read_text(encoding="utf-8"))
    return _seed_run_converter_full(section, css_text)


# ---------------------------------------------------------------------------
# Parametrised conformance tests — one per golden (D278 byte-exact re-seed)
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("golden_id", _collect_golden_ids())
def test_golden_conformance(golden_id: str) -> None:
    """Re-run the engine for golden_id and BYTE-COMPARE status/block_name/
    selector/block_markup against the D278-seeded golden
    (tests/fixtures/conformance/goldens/<golden_id>.golden.json).

    This replaces the Step-16 smoke-only assertion — see module docstring.
    A mismatch means the converter's observable output for this fixture (or
    real-draft section) changed. If that change is INTENDED, re-run
    `python tests/seed_conformance_goldens.py` after a fresh LANDED deploy
    proof (a real canary deploy + computed-parity check, not a bare local
    emit — see that script's provenance gate), then commit the updated
    golden with the proof cited in the commit message.
    """
    golden_path = _GOLDEN_DIR / f"{golden_id}.golden.json"
    golden = json.loads(golden_path.read_text(encoding="utf-8"))
    actual = _reproduce_golden_result(golden_id)

    mismatches = []
    for key in ("status", "block_name", "selector", "block_markup"):
        expected = golden.get(key, "")
        got = actual.get(key, "") or ""
        if expected != got:
            mismatches.append(
                "  " + key + ":\n    expected: " + repr(expected) + "\n    actual:   " + repr(got)
            )

    assert not mismatches, (
        f"[{golden_id}] converter emit diverged from the D278-seeded golden "
        f"({golden_path.name}).\n"
        + "\n".join(mismatches)
        + "\n\n"
        "If this change is INTENDED, re-run `python tests/seed_conformance_goldens.py` "
        "after a fresh LANDED deploy proof, then commit the updated golden with the "
        "proof cited in the commit message. Never re-seed from a bare local emit."
    )

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
        """convert_section() must be importable and callable from scripts root."""
        html = '<section id="hero" class="sgs-hero"><p>Smoke</p></section>'
        result = convert_section(html=html, css="", media_map={})
        assert result.get("block_markup") and "wp:" in result["block_markup"], (
            f"convert_section() should return WP block markup for a minimal sgs-hero "
            f"section. Got: {result!r}"
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
# TestLiftersHaveSingleCaller — DELETED (EXECUTION Step 16, 2026-07-05).
# It AST-scanned the frozen convert.py's own source for a single-caller
# invariant on 3 named private lifters inside route_node_css. The new engine
# has no route_node_css — CSS declarations dispatch through per-property
# resolver modules (converter/resolvers/*.py), a structurally different call
# graph with no 1:1 function to pin. Nothing to rewire; the invariant this
# test protected (each lifter has one call site) doesn't map onto the new
# architecture's shape. See module docstring.
# ---------------------------------------------------------------------------
# (class body removed — see comment block above)


# ---------------------------------------------------------------------------
# Regression guard — no button-group double-nest (D146 gate universality)
# ---------------------------------------------------------------------------

class TestNoButtonGroupDoubleNest:
    """Universal regression: a wp:sgs/multi-button block must never appear directly
    inside another wp:sgs/multi-button block in any fixture's emitted markup.

    Root cause of the bug (2026-06-10): _process_container_children called
    _group_loose_buttons unconditionally, with no guard checking the parent slug.
    When the parent was sgs/multi-button itself (the button-group block), its
    button children were re-wrapped in a bare inner sgs/multi-button.
    Fix: parent_slug parameter added to _process_container_children; the call site
    for resolved container-mirror blocks (walk() line ~2934) passes parent_slug=slug;
    the guard at line ~3862 suppresses _group_loose_buttons when parent_slug ==
    block_for_slot_token('button-group'). DB-derived (R-22-1), universal (R-22-9).

    This test scans ALL fixture emits — not just sgs-multi-button.html — so any
    future fixture or converter path that introduces the same double-nest is caught.
    """

    _MULTI_BUTTON_OPEN_RE = re.compile(r"<!--\s*wp:sgs/multi-button(?:\s|\s*-->|/-->)")
    _MULTI_BUTTON_CLOSE = "<!-- /wp:sgs/multi-button -->"

    @staticmethod
    def _find_double_nest(markup: str) -> bool:
        """Return True if any wp:sgs/multi-button block contains another as a direct
        or indirect child.

        Implemented as a simple nesting-depth scan: track depth each time an open
        or close multi-button comment is encountered; a SECOND open while depth > 0
        means a nested multi-button exists.
        """
        depth = 0
        for line in markup.splitlines():
            stripped = line.strip()
            if TestNoButtonGroupDoubleNest._MULTI_BUTTON_OPEN_RE.match(stripped):
                if depth > 0:
                    return True  # Found a nested open while already inside one
                depth += 1
            elif stripped == TestNoButtonGroupDoubleNest._MULTI_BUTTON_CLOSE:
                if depth > 0:
                    depth -= 1
        return False

    def test_no_double_nest_across_all_fixtures(self) -> None:
        """No fixture emit may contain wp:sgs/multi-button nested inside wp:sgs/multi-button."""
        violations: list[str] = []
        for html_path in sorted(_FIXTURE_DIR.glob("*.html")):
            html_content = html_path.read_text(encoding="utf-8")
            try:
                css_text, section = _extract_fixture_parts(html_content)
            except ValueError:
                continue  # Fixture has no <section> — skip (other tests catch this)
            markup = _run_converter(section, css_text)
            if self._find_double_nest(markup):
                violations.append(
                    f"  {html_path.name}: wp:sgs/multi-button nested inside wp:sgs/multi-button"
                )
        assert not violations, (
            "Button-group double-nest detected in converter output.\n"
            "Root cause: _process_container_children called _group_loose_buttons "
            "when the parent IS the button-group block — re-wrapping its children.\n"
            "Fix: ensure parent_slug is passed to _process_container_children at "
            "the container-mirror-block call site (walk() line ~2934) so the guard fires.\n"
            "Violations:\n" + "\n".join(violations)
        )


# ---------------------------------------------------------------------------
# Dispatch-determinism lock (qc-council residual-risk finding, 2026-06-10)
# ---------------------------------------------------------------------------
# attr_for_property's verdicts rest on property_suffixes ROW ORDER. A future
# /sgs-update reseed that reorders rows for an unrelated reason could silently
# shift a contested property's destination WITHOUT any golden failing (the
# fixture corpus cannot cover every (block, contested-property) pair). This
# class pins the dispatch verdicts for the known contested set, independent of
# fixture coverage. On intentional dispatch-rule changes, update these pins
# WITH a cited reason in the same commit (same discipline as golden regen).
class TestDispatchDeterminism:
    """Pin db_lookup.attr_for_property verdicts for contested properties."""

    @pytest.fixture(scope="class")
    def db(self):
        from converter.db import db_lookup
        return db_lookup

    def _writer(self, result):
        """Normalise a dispatch result to its writer path (or None)."""
        return result[0] if result else None

    def test_typography_owns_leaf_text_props(self, db) -> None:
        assert self._writer(db.attr_for_property("sgs/heading", "color")) == "typography"
        assert self._writer(db.attr_for_property("sgs/text", "line-height")) == "typography"

    def test_wrapper_owns_container_box_props(self, db) -> None:
        assert self._writer(db.attr_for_property("sgs/container", "gap")) == "wrapper_css"

    def test_unmatched_props_fall_to_root_supports(self, db) -> None:
        # No flat attr exists for these (block, property) pairs — the dispatch
        # must return None so root-supports handles them via style.*.
        assert db.attr_for_property("sgs/container", "padding-top") is None
        assert db.attr_for_property("sgs/hero", "font-size") is None
