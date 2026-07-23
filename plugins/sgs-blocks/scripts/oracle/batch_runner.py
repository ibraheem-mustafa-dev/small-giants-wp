#!/usr/bin/env python3
"""oracle.batch_runner — F3 render-oracle LANDED runtime, multi-fixture BATCH mode.

Spec ref: .claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md §12.2.2 (WRITTEN vs LANDED),
§12.2.3 (render-oracle + metamorphic relations), §7b (structural-insufficiency rule +
the 3 false-win guards).

WHAT THIS IS
------------
Iterates the WHOLE phase-f fixture corpus (``tests/fixtures/phase-f/*.draft.html``
+ ``tests/fixtures/conformance/*.html``, the SAME corpus enumeration as
``ledger/coverage_check.py::run_corpus``) and produces a per-fixture LANDED
verdict using the EXISTING verdict engine (``oracle.verdict.compute_report`` /
``oracle.models`` / ``oracle.guards``) — reused, never reimplemented (R-31-9).

It reuses:
  - ``oracle.render_oracle.discover_sections`` — draft-side top-level BEM-root
    section discovery (pure, no browser).
  - ``ledger.declare_input`` — the F2 draft-declaration extractor, to source the
    per-(selector, property, tier) cells a fixture is EXPECTED to carry (the
    WRITTEN leg's input: "an attr was emitted/declared for this property").
  - ``oracle.verdict.compute_report`` / ``oracle.models`` — the frozen §6
    verdict contract. No new verdict logic is added here.

THIS IS STILL A DIAGNOSTIC HARNESS (R-31-4) — its aggregate verdicts are a
per-commit signal, never the LANDED closing gate. The closing gate remains
computed-style-vs-draft + Bean's eye (R-31-13).

HONEST DEGRADATION (mandatory — never a fabricated PASS)
----------------------------------------------------------
A fixture can only be genuinely probed LIVE if a deployed canary URL is
configured for it in ``oracle/fixture-canary-urls.json``. Most of the corpus
has NEVER been deployed as an individual canary page (deploying is explicitly
OUT OF SCOPE for this runtime — see the module docstring's caller contract).
For every such fixture the runner emits an honest ``SKIPPED-NO-LIVE-URL``
status: every observation is marked ``page_loaded=False`` (we genuinely never
navigated anywhere), which the EXISTING verdict engine's precedence rule
(§3: NOT-RENDERED is checked first) resolves every cell to NOT-RENDERED —
never LANDED, never a silent drop. Every cell is ALSO marked ``written=False``
as belt-and-braces (oracle.models.CellInput.written docstring: "written=False
-> can never be LANDED"), so the non-passing result holds even if the
page_loaded short-circuit is ever removed. If Playwright itself is unavailable
in the running environment, the same honest-degrade path fires with a
``SKIPPED-NO-PLAYWRIGHT`` status.

THE 3 MANDATORY FALSE-WIN GUARDS (§7b), all wired via the REUSED engine
-------------------------------------------------------------------------
(a) Every probe is gated on element-present AND innerText.length > 0 — this is
    guards.guard_empty_section / guard_element_present, unmodified, invoked by
    verdict.compute_section_result exactly as render_oracle.py already does.
    An empty/absent section can never read as a match: it resolves to
    GUARD-FAIL for every cell in that section (see _cell_verdict precedence).
(b) A fixture/property this runner did NOT exercise is reported UNVERIFIED,
    never COVERED — enforced structurally: a cell is only ever attributed
    (see ``_attribute_cells_to_sections``) when its declared selector can be
    matched to a discovered section's class list; unattributable cells are
    counted and reported separately (``unattributed_cell_count``), never
    silently folded into a passing total.
(c) A value that matches ONLY because it equals the wrapper/block DEFAULT is
    UNVERIFIED, not COVERED — this is guards.guard_non_default_value (§2 guard
    3), invoked unmodified inside verdict._cell_verdict. This runner does not
    (yet) source block.json ``default`` values per-cell (a further scope item,
    documented below), so ``expected_default`` is conservatively left ``None``
    for every cell — guard 3's OWN contract treats ``None`` as "cannot verify
    non-default, skip guard" (never as "assume non-default and pass"), so no
    cell can be laundered into LANDED via an unknown default.

Usage
-----
    python oracle/batch_runner.py [--urls-map <path.json>] [--out-dir <dir>]
        [--fixtures-dir <phase-f dir>] [--conformance-dir <conformance dir>]

Writes one ``<stem>.landed.json`` per fixture into ``_render-oracle/`` (or
``--out-dir``) plus one aggregate ``batch-report.json``.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any, Optional

_HERE = Path(__file__).resolve().parent
_SCRIPTS_DIR = _HERE.parent

if str(_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_DIR))

from oracle.render_oracle import _default_element_selector  # noqa: E402
from oracle.models import CellInput, RenderedObservation  # noqa: E402
from oracle.verdict import compute_report  # noqa: E402
from oracle.golden_expectations import (  # noqa: E402
    expectation_for,
    expected_default_for,
    is_parent_constrained,
)

from converter.recognition import recognise_section, _root_classes  # noqa: E402

sys.stdout.reconfigure(encoding="utf-8")

# ---------------------------------------------------------------------------
# Section discovery — the REAL Stage-2 recognition engine (DB-driven), NOT
# render_oracle.discover_sections's narrower stand-in.
#
# REGRESSION FOUND + FIXED (2026-07-22, coordinator review): the first cut of
# this module reused ``oracle.render_oracle.discover_sections``, which only
# accepts a section whose literal BEM root class textually equals a
# registered block slug (``.sgs-container`` -> ``sgs/container``). That is a
# DELIBERATELY NARROWED stand-in (its own docstring says so — "mirrors...
# branch 1... candidate filtering") and misses the FR-31-4 DEFAULT-IS-CONTAINER
# rule: a section whose root class carries NO literal name match still
# recognises as ``sgs/container`` (the real converter's behaviour — Spec 31
# §13.2 FR-31-4). ``rt-centred-maxwidth``'s root node is
# ``.sgs-team-member-grid`` (a semantic authored name, not "container"), so
# the narrow stand-in reported NO-SECTIONS and this runner overwrote a
# TRACKED artefact that previously held real hand-verified LANDED cells with
# an empty one — a real regression, not an "honest degrade".
#
# The fix: call ``converter.recognition.recognise_section`` — the SAME
# DB-driven recognition the live converter pipeline runs (branch 1 named ->
# branch 2 atomic -> branch 3 scalar -> FR-31-4 container-default), reused
# unmodified (R-31-9). This reproduces the real routing decision, so a
# fixture like ``rt-centred-maxwidth`` is correctly discovered as
# ``sgs/container`` and its live probe can reproduce genuine LANDED cells.
# ---------------------------------------------------------------------------

def discover_sections(draft_html: str) -> list[dict]:
    """Find every top-level RECOGNISED section in the draft HTML.

    Uses ``converter.recognition.recognise_section`` (the real Stage-2
    engine, DB-driven, FR-31-4-aware) — NOT a literal-class-name stand-in.
    Only TOP-LEVEL sections are returned (a node nested inside an
    already-picked section is skipped), mirroring the walker's own top-level
    scoping.

    Returns one dict per section:
      {section_id, block_slug, draft_selector, native_selector}
    """
    from bs4 import BeautifulSoup

    soup = BeautifulSoup(draft_html, "html.parser")
    sections: list[dict] = []
    seen_nodes: list[Any] = []

    for node in soup.find_all(True):
        if any(node in parent.descendants for parent in seen_nodes):
            continue

        root_classes = _root_classes(node)
        if not root_classes:
            continue

        rec = recognise_section(node)
        if rec.kind == "unrecognised" or rec.slug is None:
            continue

        slug = rec.slug
        # The FR-31-4 container-default case has NO literal class match — use
        # the FIRST BEM root class on the node as the draft-side selector
        # (identifies this exact DOM node; matches render_oracle's own
        # first-candidate convention for the literal-match case).
        draft_root_class = root_classes[0]
        section_id = (
            node.get("id")
            or f"section-{len(sections) + 1}-{slug.split('/')[-1]}"
        )
        sections.append({
            "section_id": section_id,
            "block_slug": slug,
            "draft_selector": f".{draft_root_class}",
            "native_selector": _default_element_selector(slug),
        })
        seen_nodes.append(node)

    return sections


# ---------------------------------------------------------------------------
# Corpus locations — MIRROR ledger/coverage_check.py's enumeration exactly.
# (Read-only reuse; this module does not import from ledger/coverage_check.py
# because that file is explicitly out of scope for edits this session, but the
# glob rules below are intentionally identical so the two tools agree on what
# "the corpus" means.)
# ---------------------------------------------------------------------------

_DEFAULT_PHASE_F_DIR = _SCRIPTS_DIR / "tests" / "fixtures" / "phase-f"
_DEFAULT_CONFORMANCE_DIR = _SCRIPTS_DIR / "tests" / "fixtures" / "conformance"
_DEFAULT_OUT_DIR = _DEFAULT_PHASE_F_DIR / "_render-oracle"
_DEFAULT_URLS_MAP = _HERE / "fixture-canary-urls.json"

# Device-tier -> viewport width. "Other:<cond>" tiers cannot map to a single
# width and are never probed live (they resolve to UNVERIFIED honestly via
# computed_value=None — see _run_live_fixture below).
_TIER_VIEWPORT: dict[str, int] = {
    "Base": 1440,
    "Desktop": 1440,
    "Tablet": 768,
    "Mobile": 375,
}

# Declaration kinds counted as "relevant" — mirrors coverage_check._analyse_fixture.
_RELEVANT_KINDS = ("box-css", "custom-prop", "inline-style")

# Only a plain single-class selector (".sgs-foo") is attributable to a
# section by class-membership. Combinators / ids / pseudo-selectors / attribute
# selectors are NOT attributed — they are counted, honestly, as unattributed
# rather than guessed at (guard (b) above).
_SIMPLE_CLASS_SELECTOR_RE = re.compile(r"^\.[A-Za-z0-9_-]+$")

# This harness renders the DRAFT as a bare file:// fragment (no WP theme) and the
# CLONE as a full WordPress page (header, footer, theme CSS). Absolute section
# heights across those two environments differ for reasons that say nothing about
# transfer fidelity, so guard 4 is reported as NOT-CONFIRMED rather than fabricating
# a failure (see RenderedObservation.height_comparable). The F3 design doc says the
# same of pixel-diff: render the draft in the same environment, or gate on a delta
# baseline — "never an absolute". Set True only once the draft is rendered inside
# the same WP/theme environment as the clone.
_HEIGHT_COMPARABLE = False


# ---------------------------------------------------------------------------
# Fixture-corpus enumeration
# ---------------------------------------------------------------------------

def discover_fixtures(
    phase_f_dir: Path = _DEFAULT_PHASE_F_DIR,
    conformance_dir: Path | None = _DEFAULT_CONFORMANCE_DIR,
) -> list[tuple[str, Path]]:
    """Enumerate the fixture corpus: (stem, path) pairs, sorted, de-duplicated.

    Mirrors ledger/coverage_check.py::run_corpus's file discovery rules:
      - phase-f: ``*.draft.html`` (stem has the trailing ``.draft`` stripped)
      - conformance: ``*.html``
    """
    out: list[tuple[str, Path]] = []
    if phase_f_dir.exists():
        for fpath in sorted(phase_f_dir.glob("*.draft.html")):
            stem = fpath.stem
            if stem.endswith(".draft"):
                stem = stem[: -len(".draft")]
            out.append((stem, fpath))
    if conformance_dir and conformance_dir.exists():
        for fpath in sorted(conformance_dir.glob("*.html")):
            out.append((fpath.stem, fpath))
    return out


# ---------------------------------------------------------------------------
# F2 declare-input reuse (lazy import — same pattern as coverage_check.py)
# ---------------------------------------------------------------------------

def _import_declare_input():
    """Lazy import of ledger.declare_input (read-only reuse — F2's extractor)."""
    if str(_SCRIPTS_DIR) not in sys.path:
        sys.path.insert(0, str(_SCRIPTS_DIR))
    from ledger.declare_input import declare_input, DeclKind  # type: ignore
    return declare_input, DeclKind


def _relevant_declared_rows(raw_html: str) -> list[Any]:
    """Run F2's declare_input over a fixture's HTML and keep only relevant rows.

    Relevant = non-shadowed AND kind in (box-css, custom-prop, inline-style) —
    identical filter to coverage_check.py's _analyse_fixture step 1.
    """
    declare_input_fn, DeclKind_cls = _import_declare_input()
    all_rows = declare_input_fn(raw_html, "batch-runner")
    kinds = {
        DeclKind_cls.box_css,
        DeclKind_cls.custom_prop,
        DeclKind_cls.inline_style,
    }
    return [r for r in all_rows if not r.shadowed and r.kind in kinds]


# ---------------------------------------------------------------------------
# Section <-> declared-row attribution (guard (b): never guess, only match)
# ---------------------------------------------------------------------------

def _section_class_sets(draft_html: str, sections: list[dict]) -> dict[str, set[str]]:
    """For each discovered section, return the FULL class list on its DOM node.

    A declared-row selector is attributed to a section only when its class
    literally appears on that SAME node — this is what lets a declaration
    like ``.sgs-team-member-grid { ... }`` (an authored semantic class that
    happens to sit on the very node whose RECOGNISED root class is
    ``.sgs-container``) attribute correctly, without guessing.
    """
    from bs4 import BeautifulSoup

    soup = BeautifulSoup(draft_html, "html.parser")
    out: dict[str, set[str]] = {}
    for sec in sections:
        node = soup.select_one(sec["draft_selector"])
        classes = set(node.get("class") or []) if node is not None else set()
        out[sec["section_id"]] = classes
    return out


def _draft_hidden_sections(
    sections: list[dict],
    declared_rows: list[Any],
    class_sets: dict[str, set[str]],
) -> set[str]:
    """Section ids whose DRAFT element declares ``display:none``.

    A draft element with ``display:none`` is NOT PAINTED in the draft. Comparing
    its paint properties (padding / position / z-index / background) against a
    rendered clone is meaningless: neither side's visibility state is controlled
    by the harness, so a mismatch says nothing about transfer fidelity.

    The worked case is ``sgs/modal``: the draft models a modal as an
    always-present overlay hidden with ``display:none`` (revealed by script),
    whereas ``sgs/modal`` renders a TRIGGER plus a native ``<dialog>``, keeping
    ``position:fixed`` on ``.sgs-modal__dialog`` (style.css:74) and leaving the
    block root as an inline-flex trigger (style.css:19). Probing the block root
    therefore compared a trigger against an overlay and reported four
    "failures" that were state/architecture mismatches, not defects.

    Universal and signal-driven (the draft's own declared ``display:none``) —
    no block slug, no fixture name (R-31-9).
    """
    hidden: set[str] = set()
    for row in declared_rows:
        if row.property != "display" or str(row.value).strip().lower() != "none":
            continue
        m = _SIMPLE_CLASS_SELECTOR_RE.match(row.selector.strip())
        if not m:
            continue
        cls = row.selector.strip()[1:]
        for sid, classes in class_sets.items():
            if cls in classes:
                hidden.add(sid)
    return hidden


def attribute_cells_to_sections(
    draft_html: str,
    sections: list[dict],
    declared_rows: list[Any],
) -> tuple[dict[str, list[CellInput]], int]:
    """Attribute F2 declared rows to discovered sections by class-membership.

    Returns (cells_by_section_id, unattributed_count).

    A row is attributed to section S iff:
      - its selector is a SIMPLE single-class selector (``.foo``), AND
      - the class ``foo`` is present on S's DOM node's class list.

    Anything else (combinators, ids, pseudo-selectors, ``:root``/attribute
    selectors, or a class that matches zero / more-than-one section) is
    counted as unattributed and NOT silently assigned — guard (b): an
    unexercised property must read as unverified, never covered.
    """
    class_sets = _section_class_sets(draft_html, sections)
    cells_by_section: dict[str, list[CellInput]] = {s["section_id"]: [] for s in sections}
    section_slugs: dict[str, str] = {s["section_id"]: s["block_slug"] for s in sections}
    hidden_sections = _draft_hidden_sections(sections, declared_rows, class_sets)
    unattributed = 0

    for row in declared_rows:
        m = _SIMPLE_CLASS_SELECTOR_RE.match(row.selector.strip())
        if not m:
            unattributed += 1
            continue
        cls = row.selector.strip()[1:]
        matches = [sid for sid, classes in class_sets.items() if cls in classes]
        if len(matches) != 1:
            unattributed += 1
            continue

        sid = matches[0]
        # A draft element that is display:none is not painted in the draft, so
        # its paint properties cannot be compared against a rendered clone.
        # written=False forces UNVERIFIED (never LANDED, never a scored failure)
        # — honest "not comparable", not a silent drop.
        comparable = sid not in hidden_sections
        # Guard 3 (non-default-value) needs the BLOCK's own default for this
        # property: a draft value that merely equals the default proves nothing
        # about routing, because the clone would show it even with transfer
        # completely broken (Spec 31 §7b coincidental-default false-win).
        # Resolved DB-first; None when unknown, which guard 3 treats as
        # "cannot verify, skip" — never as "assume non-default and pass".
        slug_for_cell = section_slugs.get(sid, "")
        default_for_cell = (
            expected_default_for(slug_for_cell, row.property) if slug_for_cell else None
        )
        try:
            cell = CellInput(
                property=row.property,
                tier=row.tier,
                draft_value=row.value,
                computed_value=None,       # filled in by the live probe (or left None)
                expected_default=default_for_cell,
                written=comparable,
            )
        except ValueError:
            # Tier failed F2-vocabulary validation (CellInput.__post_init__) —
            # count as unattributed rather than crash the whole fixture.
            unattributed += 1
            continue
        cells_by_section[sid].append(cell)

    return cells_by_section, unattributed


# ---------------------------------------------------------------------------
# Canary-URL map (honest-degrade config)
# ---------------------------------------------------------------------------

def load_urls_map(path: Path = _DEFAULT_URLS_MAP) -> dict[str, str]:
    """Load {fixture_stem: live_url}. Missing file -> empty map (no fixtures probed)."""
    if not path.exists():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(data, dict):
            # Keys starting with "_" are documentation/comment entries, not
            # fixture stems (JSON has no native comment syntax).
            return {
                str(k): str(v) for k, v in data.items()
                if not str(k).startswith("_")
            }
    except Exception:
        pass
    return {}


# ---------------------------------------------------------------------------
# Skipped-fixture report (no live URL / no Playwright) — cells forced UNVERIFIED
# ---------------------------------------------------------------------------

def _skipped_observations(
    sections: list[dict],
    cells_by_section: dict[str, list[CellInput]],
    expects_text: bool = True,
) -> list[RenderedObservation]:
    """Build observations for a fixture we did NOT probe live.

    `page_loaded=False` is set (we genuinely never navigated anywhere for this
    fixture), which the EXISTING verdict engine's precedence rule resolves to
    NOT-RENDERED for every cell (§3: NOT-RENDERED is the FIRST-checked, highest
    precedence verdict — it wins regardless of `written`). `written=False` is
    ALSO set on every cell as belt-and-braces: if a future change ever stops
    forcing `page_loaded=False` for the skipped path, these cells still cannot
    resolve to LANDED (CellInput.written docstring: "written=False -> can
    never be LANDED"). Either way the result is a clearly non-passing,
    non-fabricated verdict — never LANDED, never silently dropped.
    """
    observations: list[RenderedObservation] = []
    for sec in sections:
        raw_cells = cells_by_section.get(sec["section_id"], [])
        forced_cells = [
            CellInput(
                property=c.property,
                tier=c.tier,
                draft_value=c.draft_value,
                computed_value=None,
                expected_default=c.expected_default,
                written=False,   # forces UNVERIFIED regardless of any coincidental match
            )
            for c in raw_cells
        ]
        observations.append(RenderedObservation(
            section_id=sec["section_id"],
            block_slug=sec["block_slug"],
            element_selector=sec["native_selector"],
            element_present=False,
            inner_text_len=0,
            rendered_height_px=None,
            draft_height_px=None,
            cells=forced_cells,
            page_loaded=False,
            expects_text=expects_text,
            height_comparable=_HEIGHT_COMPARABLE,
        ))
    return observations


# ---------------------------------------------------------------------------
# Live probe (Playwright) — per-cell getComputedStyle, per declared tier.
#
# AMBIGUOUS-SELECTOR HANDLING (regression fix, 2026-07-22): a single-fixture
# canary page is NOT guaranteed to contain only ONE instance of a given block
# class — `.wp-block-sgs-container` matched BOTH the page's own outer
# template wrapper AND the fixture's actual converted section on the
# rt-centred-maxwidth canary (verified live: 2 elements, widths 1440 and
# 1200). `document.querySelector` silently returns the FIRST DOM-order match
# — here that was the wrong (outer, unstyled) one, producing plausible-looking
# but WRONG computed values (max-width:none, display:block) that would have
# been reported as WRITTEN-not-LANDED/UNVERIFIED for a section that is
# actually correctly landed. `querySelectorAll` + take the LAST match is the
# fix: in document order an ancestor wrapper is listed BEFORE any descendant
# that also matches the same class, so the last match is the innermost/most
# specific — the fixture's own instance, not a generic page-level ancestor.
# The match count is returned so the caller can surface ambiguity honestly
# (never silently absorbed) rather than only ever trusting a single-match page.
# ---------------------------------------------------------------------------

def _measure_section(page, selector: str) -> tuple[bool, int, float | None, int]:
    """Return (element_present, inner_text_len, height_px, match_count).

    When `selector` matches >1 element, the LAST (innermost) match is used —
    see the AMBIGUOUS-SELECTOR HANDLING note above. `match_count` is surfaced
    so ambiguity is reported, never silently absorbed.
    """
    result = page.evaluate(
        """(sel) => {
            const els = document.querySelectorAll(sel);
            if (els.length === 0) return [false, 0, null, 0];
            const el = els[els.length - 1];
            const text = (el.innerText || '').length;
            const rect = el.getBoundingClientRect();
            return [true, text, rect.height, els.length];
        }""",
        selector,
    )
    present, text_len, height, match_count = result
    return (
        bool(present), int(text_len),
        (float(height) if height is not None else None),
        int(match_count),
    )


def _measure_cell_props(page, selector: str, props: list[str]) -> Optional[dict[str, str]]:
    """Return {property: computed_value} for `selector`'s LAST (innermost)
    match, or None if absent. See AMBIGUOUS-SELECTOR HANDLING note above."""
    if not props:
        return {}
    result = page.evaluate(
        """(args) => {
            const [sel, props] = args;
            const els = document.querySelectorAll(sel);
            if (els.length === 0) return null;
            const el = els[els.length - 1];
            const cs = getComputedStyle(el);
            const out = {};
            for (const p of props) { out[p] = cs.getPropertyValue(p); }
            return out;
        }""",
        [selector, props],
    )
    return result


def run_live_fixture(
    stem: str,
    draft_path: Path,
    live_url: str,
    sections: list[dict],
    cells_by_section: dict[str, list[CellInput]],
    expects_text: bool = True,
) -> tuple[list[RenderedObservation], dict[str, int]]:
    """Genuinely probe ONE fixture's live canary page + local draft file.

    One RenderedObservation per (section, tier-present-in-its-cells) pair, so
    each device tier gets its own guard/verdict row (mirrors render_oracle.py's
    per-viewport observation split). "Other:<cond>" tier cells are left with
    computed_value=None (cannot map to a single viewport) — resolves honestly
    to UNVERIFIED via the unmodified verdict engine, never a guess.

    Returns (observations, ambiguous_selector_matches) — the second value maps
    element_selector -> the max match-count seen on the LIVE page across all
    tiers probed, for any selector that matched MORE THAN ONE element (see the
    AMBIGUOUS-SELECTOR HANDLING note on `_measure_section`). Surfaced so a
    multi-instance page is a reported fact, never a silently-absorbed guess.
    """
    from playwright.sync_api import sync_playwright

    draft_url = draft_path.resolve().as_uri()
    observations: list[RenderedObservation] = []
    ambiguous_matches: dict[str, int] = {}

    with sync_playwright() as p:
        browser = p.chromium.launch()
        try:
            for sec in sections:
                sec_cells = cells_by_section.get(sec["section_id"], [])
                tiers_present = sorted({c.tier for c in sec_cells if c.tier in _TIER_VIEWPORT})
                # A section with zero attributable cells still gets ONE
                # Base-tier observation so guard 1/2/4 fire even with no cells
                # (compute_section_result's FIX-C synthesises the coverage cell).
                if not tiers_present:
                    tiers_present = ["Base"]

                for tier in tiers_present:
                    viewport = _TIER_VIEWPORT[tier]
                    draft_page = browser.new_page(viewport={"width": viewport, "height": 1024})
                    live_page = browser.new_page(viewport={"width": viewport, "height": 1024})
                    draft_loaded = True
                    live_loaded = True
                    try:
                        draft_page.goto(draft_url, wait_until="networkidle", timeout=30000)
                    except Exception:
                        draft_loaded = False
                    try:
                        live_page.goto(live_url, wait_until="networkidle", timeout=30000)
                    except Exception:
                        live_loaded = False

                    draft_present, _draft_text_len, draft_height, _draft_match_count = (
                        _measure_section(draft_page, sec["draft_selector"]) if draft_loaded
                        else (False, 0, None, 0)
                    )
                    live_present, live_text_len, live_height, live_match_count = (
                        _measure_section(live_page, sec["native_selector"]) if live_loaded
                        else (False, 0, None, 0)
                    )
                    if live_match_count > 1:
                        sel = sec["native_selector"]
                        ambiguous_matches[sel] = max(ambiguous_matches.get(sel, 0), live_match_count)

                    tier_cells = [c for c in sec_cells if c.tier == tier]
                    props = sorted({c.property for c in tier_cells})
                    computed_map: Optional[dict[str, str]] = (
                        _measure_cell_props(live_page, sec["native_selector"], props)
                        if (live_loaded and live_present and props) else None
                    )

                    resolved_cells = [
                        CellInput(
                            property=c.property,
                            tier=c.tier,
                            draft_value=c.draft_value,
                            computed_value=(
                                computed_map.get(c.property) if computed_map is not None else None
                            ),
                            expected_default=c.expected_default,
                            written=c.written,
                        )
                        for c in tier_cells
                    ]

                    observations.append(RenderedObservation(
                        section_id=f"{sec['section_id']}@{tier}",
                        block_slug=sec["block_slug"],
                        element_selector=sec["native_selector"],
                        element_present=live_present,
                        inner_text_len=live_text_len,
                        rendered_height_px=live_height,
                        draft_height_px=draft_height if draft_present else None,
                        cells=resolved_cells,
                        page_loaded=live_loaded,
                        expects_text=expects_text,
                        height_comparable=_HEIGHT_COMPARABLE,
                    ))
                    draft_page.close()
                    live_page.close()
        finally:
            browser.close()

    return observations, ambiguous_matches


# ---------------------------------------------------------------------------
# Per-fixture orchestration
# ---------------------------------------------------------------------------

def _playwright_available() -> bool:
    try:
        import playwright.sync_api  # noqa: F401
        return True
    except ImportError:
        return False


def run_fixture(
    stem: str,
    draft_path: Path,
    urls_map: dict[str, str],
) -> tuple[dict, list[str]]:
    """Run ONE fixture end-to-end. Returns (report_dict, warnings)."""
    warnings: list[str] = []
    draft_html = draft_path.read_text(encoding="utf-8")

    sections = discover_sections(draft_html)
    if not sections:
        report = {
            "fixture": stem,
            "generated_by": {"module": "oracle.batch_runner", "version": "0.1.0"},
            "sections": [],
            "plain_summary": "No registered top-level BEM-root sections found — nothing to probe.",
            "oracle_status": "NO-SECTIONS",
            "unattributed_cell_count": 0,
        }
        return report, warnings

    try:
        declared_rows = _relevant_declared_rows(draft_html)
    except Exception as exc:
        warnings.append(f"declare_input failed for {stem}: {exc}")
        declared_rows = []

    cells_by_section, unattributed = attribute_cells_to_sections(draft_html, sections, declared_rows)

    # Resolve what this fixture's GOLDEN says should render, so guard 1 judges
    # against the baseline rather than assuming every section renders text.
    # Fails STRICT (expects_text=True) when no golden exists.
    expectation = expectation_for(stem)
    expects_text = expectation.expects_text

    # COMPOSITION GATE — a parent-constrained block cannot legally stand alone,
    # and commonly inherits styling from its parent's stylesheet + block context.
    # Cloning one as a bare top-level section deploys an orphan, so any missing
    # parent-provided style is the FIXTURE's invalid composition, not a converter
    # transfer failure. Report it; never score it. (18 such blocks exist —
    # accordion-item, tab, the form-field family — so this is corpus-wide.)
    invalid_composition = [
        (sec["block_slug"], parent)
        for sec in sections
        for is_child, parent in [is_parent_constrained(sec["block_slug"])]
        if is_child
    ]

    live_url = urls_map.get(stem)
    ambiguous_matches: dict[str, int] = {}

    if invalid_composition:
        pairs = ", ".join(f"{child} (requires {parent})" for child, parent in invalid_composition)
        status = "COMPOSITION-INVALID"
        warnings.append(
            f"COMPOSITION-INVALID: {pairs}. This fixture clones a parent-constrained "
            "block as a standalone top-level section, so parent-provided CSS + block "
            "context can never apply. Any 'missing' style here is the fixture's "
            "composition, not a converter defect — cells are reported UNVERIFIED, "
            "never scored. Fix by nesting the child inside its parent in the fixture."
        )
        observations = _skipped_observations(sections, cells_by_section, expects_text)
    elif live_url is None:
        status = "SKIPPED-NO-LIVE-URL"
        observations = _skipped_observations(sections, cells_by_section, expects_text)
    elif not _playwright_available():
        status = "SKIPPED-NO-PLAYWRIGHT"
        warnings.append(
            "playwright (python) is not installed — run: pip install playwright && "
            "playwright install chromium"
        )
        observations = _skipped_observations(sections, cells_by_section, expects_text)
    else:
        status = "LIVE-PROBED"
        try:
            observations, ambiguous_matches = run_live_fixture(
                stem, draft_path, live_url, sections, cells_by_section, expects_text
            )
        except Exception as exc:
            status = "ERROR"
            warnings.append(f"live probe raised for {stem}: {exc}")
            observations = _skipped_observations(sections, cells_by_section, expects_text)

    for sel, count in ambiguous_matches.items():
        warnings.append(
            f"AMBIGUOUS SELECTOR: {sel!r} matched {count} elements on the live "
            "page — used the LAST (innermost) match; verify this is genuinely "
            "this fixture's own instance, not a page-level wrapper."
        )

    report_obj = compute_report(fixture=stem, observations=observations)
    report = report_obj.as_dict()
    report["oracle_status"] = status
    report["unattributed_cell_count"] = unattributed
    # Surface the expectation so a reader can see WHY guard 1 did or did not
    # fire, without re-deriving it (an unexplained guard result is how the
    # previous run's 87 GUARD-FAILs were misread as converter defects).
    report["golden_expectation"] = {
        "expects_text": expectation.expects_text,
        "golden_found": expectation.golden_found,
        "reason": expectation.reason,
    }
    report["height_comparable"] = _HEIGHT_COMPARABLE
    if ambiguous_matches:
        report["ambiguous_selector_matches"] = ambiguous_matches
    if live_url:
        report["live_url"] = live_url
    return report, warnings


# ---------------------------------------------------------------------------
# Batch orchestration
# ---------------------------------------------------------------------------

def run_batch(
    phase_f_dir: Path = _DEFAULT_PHASE_F_DIR,
    conformance_dir: Path | None = _DEFAULT_CONFORMANCE_DIR,
    urls_map_path: Path = _DEFAULT_URLS_MAP,
    out_dir: Path = _DEFAULT_OUT_DIR,
) -> dict:
    """Run the LANDED oracle over the WHOLE fixture corpus.

    Writes one <stem>.landed.json per fixture into out_dir, plus one
    aggregate batch-report.json. Returns the aggregate dict.
    """
    urls_map = load_urls_map(urls_map_path)
    fixtures = discover_fixtures(phase_f_dir, conformance_dir)

    out_dir.mkdir(parents=True, exist_ok=True)

    per_fixture: dict[str, dict] = {}
    all_warnings: dict[str, list[str]] = {}
    status_counts: dict[str, int] = {}
    verdict_counts: dict[str, int] = {
        "LANDED": 0, "UNVERIFIED": 0, "WRITTEN-not-LANDED": 0,
        "GUARD-FAIL": 0, "NOT-RENDERED": 0,
    }
    total_unattributed = 0

    for stem, fpath in fixtures:
        report, warnings = run_fixture(stem, fpath, urls_map)
        per_fixture[stem] = {
            "oracle_status": report["oracle_status"],
            "plain_summary": report["plain_summary"],
            "unattributed_cell_count": report["unattributed_cell_count"],
        }
        if warnings:
            all_warnings[stem] = warnings

        status_counts[report["oracle_status"]] = status_counts.get(report["oracle_status"], 0) + 1
        total_unattributed += report["unattributed_cell_count"]

        for sec in report["sections"]:
            for cell in sec["cells"]:
                verdict_counts[cell["verdict"]] = verdict_counts.get(cell["verdict"], 0) + 1

        out_path = out_dir / f"{stem}.landed.json"
        out_path.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")

    aggregate = {
        "tool": "oracle.batch_runner",
        "diagnostic_only": True,
        "diagnostic_note": (
            "R-31-4: this is a per-commit DIAGNOSTIC signal, NEVER the LANDED "
            "closing gate. The closing gate is computed-style-vs-draft + "
            "Bean's eye (R-31-13)."
        ),
        "fixture_count": len(fixtures),
        "per_fixture_status": {stem: per_fixture[stem]["oracle_status"] for stem in per_fixture},
        "status_counts": status_counts,
        "cell_verdict_counts": verdict_counts,
        "total_unattributed_cells": total_unattributed,
        "warnings": all_warnings,
        "per_fixture": per_fixture,
    }
    (out_dir / "batch-report.json").write_text(
        json.dumps(aggregate, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    return aggregate


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--urls-map", type=Path, default=_DEFAULT_URLS_MAP)
    parser.add_argument("--out-dir", type=Path, default=_DEFAULT_OUT_DIR)
    parser.add_argument("--fixtures-dir", type=Path, default=_DEFAULT_PHASE_F_DIR)
    parser.add_argument("--conformance-dir", type=Path, default=_DEFAULT_CONFORMANCE_DIR)
    args = parser.parse_args(argv)

    print("=" * 70)
    print("  F3 render-oracle BATCH runner — LANDED leg over the fixture corpus")
    print("  R-31-4: per-commit DIAGNOSTIC, never the LANDED closing gate.")
    print("=" * 70)

    aggregate = run_batch(
        phase_f_dir=args.fixtures_dir,
        conformance_dir=args.conformance_dir,
        urls_map_path=args.urls_map,
        out_dir=args.out_dir,
    )

    print(f"\n  fixtures processed: {aggregate['fixture_count']}")
    for status, n in sorted(aggregate["status_counts"].items()):
        print(f"    {status:24s} {n}")
    print("\n  cell verdict totals:")
    for v, n in aggregate["cell_verdict_counts"].items():
        print(f"    {v:20s} {n}")
    print(f"\n  unattributed cells (guard b — never silently covered): {aggregate['total_unattributed_cells']}")
    if aggregate["warnings"]:
        print(f"\n  warnings ({len(aggregate['warnings'])} fixtures):")
        for stem, ws in aggregate["warnings"].items():
            for w in ws:
                print(f"    [{stem}] {w}")
    print(f"\n  wrote {args.out_dir / 'batch-report.json'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
