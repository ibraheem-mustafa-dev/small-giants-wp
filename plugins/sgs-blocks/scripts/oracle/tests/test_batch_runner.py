"""
oracle.tests.test_batch_runner — F3 render-oracle BATCH runner unit tests.

Spec ref: .claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md §12.2.2 / §12.2.3 / §7b.

All tests are SYNTHETIC — no network, no browser, deterministic. They exercise
the pure/offline halves of oracle/batch_runner.py:
  - fixture-corpus enumeration
  - F2-row -> section attribution (guard b)
  - the honest-degrade "skipped" path (no live URL / no Playwright) forces
    UNVERIFIED, never LANDED
  - the planted-empty-section false-win trap: a section with element_present
    False (or inner_text_len == 0) must NEVER read as a match — GUARD-FAIL,
    reusing the existing guards/verdict engine unmodified.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest

_HERE = Path(__file__).resolve().parent
_ORACLE_DIR = _HERE.parent
_SCRIPTS_DIR = _ORACLE_DIR.parent
if str(_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_DIR))

from oracle import batch_runner  # noqa: E402
from oracle.models import CellInput, RenderedObservation, Verdict  # noqa: E402
from oracle.verdict import compute_report  # noqa: E402


# ---------------------------------------------------------------------------
# Fixture-corpus enumeration
# ---------------------------------------------------------------------------

class TestDiscoverFixtures:
    def test_finds_phase_f_draft_fixtures(self):
        fixtures = batch_runner.discover_fixtures()
        stems = {stem for stem, _ in fixtures}
        assert "rt-centred-maxwidth" in stems
        assert "sgs-media" in stems

    def test_strips_draft_suffix_from_stem(self):
        fixtures = batch_runner.discover_fixtures()
        for stem, path in fixtures:
            assert not stem.endswith(".draft")

    def test_includes_conformance_corpus(self):
        fixtures = batch_runner.discover_fixtures()
        stems = {stem for stem, _ in fixtures}
        # At least one known conformance fixture must be present.
        assert "sgs-hero" in stems or "sgs-accordion" in stems

    def test_empty_dirs_yield_empty_list(self, tmp_path):
        fixtures = batch_runner.discover_fixtures(
            phase_f_dir=tmp_path / "nope", conformance_dir=tmp_path / "also-nope"
        )
        assert fixtures == []


# ---------------------------------------------------------------------------
# Section <-> declared-row attribution (guard b)
# ---------------------------------------------------------------------------

def _fake_row(selector: str, prop: str, value: str, tier: str = "Base"):
    return SimpleNamespace(selector=selector, property=prop, value=value, tier=tier, shadowed=False)


class TestAttribution:
    DRAFT_HTML = """
    <html><body>
      <section class="sgs-container sgs-team-member-grid" id="sec-a">Some real content here</section>
      <section class="sgs-hero" id="sec-b">More content for the hero</section>
    </body></html>
    """

    def _sections(self, monkeypatch):
        # A section is only "discovered" when its slug is a registered block —
        # stub db_lookup.block_exists so this test has no DB dependency.
        monkeypatch.setattr(
            batch_runner, "discover_sections",
            lambda html: [
                {
                    "section_id": "sec-a",
                    "block_slug": "sgs/container",
                    "draft_selector": ".sgs-container",
                    "native_selector": ".wp-block-sgs-container",
                },
                {
                    "section_id": "sec-b",
                    "block_slug": "sgs/hero",
                    "draft_selector": ".sgs-hero",
                    "native_selector": ".wp-block-sgs-hero",
                },
            ],
        )
        return batch_runner.discover_sections(self.DRAFT_HTML)

    def test_attributes_row_by_shared_class_on_same_node(self, monkeypatch):
        sections = self._sections(monkeypatch)
        rows = [_fake_row(".sgs-team-member-grid", "gap", "32px")]
        cells_by_section, unattributed = batch_runner.attribute_cells_to_sections(
            self.DRAFT_HTML, sections, rows
        )
        assert unattributed == 0
        assert len(cells_by_section["sec-a"]) == 1
        assert cells_by_section["sec-a"][0].property == "gap"
        assert cells_by_section["sec-b"] == []

    def test_attributes_row_by_the_recognised_root_class_itself(self, monkeypatch):
        sections = self._sections(monkeypatch)
        rows = [_fake_row(".sgs-hero", "background-color", "#112233")]
        cells_by_section, unattributed = batch_runner.attribute_cells_to_sections(
            self.DRAFT_HTML, sections, rows
        )
        assert unattributed == 0
        assert len(cells_by_section["sec-b"]) == 1

    def test_combinator_selector_is_unattributed_not_guessed(self, monkeypatch):
        sections = self._sections(monkeypatch)
        rows = [_fake_row(".sgs-hero .sgs-hero__title", "font-size", "32px")]
        cells_by_section, unattributed = batch_runner.attribute_cells_to_sections(
            self.DRAFT_HTML, sections, rows
        )
        assert unattributed == 1
        assert cells_by_section["sec-a"] == []
        assert cells_by_section["sec-b"] == []

    def test_class_matching_zero_sections_is_unattributed(self, monkeypatch):
        sections = self._sections(monkeypatch)
        rows = [_fake_row(".sgs-nonexistent-class", "color", "red")]
        _cells_by_section, unattributed = batch_runner.attribute_cells_to_sections(
            self.DRAFT_HTML, sections, rows
        )
        assert unattributed == 1

    def test_invalid_tier_is_unattributed_not_a_crash(self, monkeypatch):
        sections = self._sections(monkeypatch)
        rows = [_fake_row(".sgs-hero", "color", "red", tier="NOT-A-REAL-TIER")]
        cells_by_section, unattributed = batch_runner.attribute_cells_to_sections(
            self.DRAFT_HTML, sections, rows
        )
        assert unattributed == 1
        assert cells_by_section["sec-b"] == []


# ---------------------------------------------------------------------------
# Honest-degrade "skipped" path — never a fabricated LANDED
# ---------------------------------------------------------------------------

class TestSkippedObservations:
    def test_skipped_cells_are_never_landed_even_if_values_coincide(self):
        sections = [{
            "section_id": "sec-a",
            "block_slug": "sgs/container",
            "draft_selector": ".sgs-container",
            "native_selector": ".wp-block-sgs-container",
        }]
        # A cell whose draft_value would trivially match if it were probed —
        # but it MUST NOT be probed (no live URL), so it must NEVER be LANDED
        # (resolves to NOT-RENDERED via page_loaded=False, §3 precedence).
        cell = CellInput(
            property="max-width", tier="Base", draft_value="1200px",
            computed_value="1200px",  # even if this were seen, written=False wins
            expected_default=None, written=True,
        )
        cells_by_section = {"sec-a": [cell]}
        observations = batch_runner._skipped_observations(sections, cells_by_section)
        report = compute_report("synthetic", observations)
        for sec in report.sections:
            for c in sec.cells:
                assert c.verdict != Verdict.LANDED

    def test_load_urls_map_missing_file_is_empty(self, tmp_path):
        assert batch_runner.load_urls_map(tmp_path / "does-not-exist.json") == {}

    def test_load_urls_map_reads_configured_entries(self, tmp_path):
        p = tmp_path / "urls.json"
        p.write_text(json.dumps({"my-fixture": "https://example.test/x"}), encoding="utf-8")
        assert batch_runner.load_urls_map(p) == {"my-fixture": "https://example.test/x"}

    def test_load_urls_map_ignores_underscore_comment_keys(self, tmp_path):
        p = tmp_path / "urls.json"
        p.write_text(json.dumps({
            "_comment": "not a fixture",
            "my-fixture": "https://example.test/x",
        }), encoding="utf-8")
        assert batch_runner.load_urls_map(p) == {"my-fixture": "https://example.test/x"}


# ---------------------------------------------------------------------------
# THE KNOWN FALSE-WIN TRAP: a planted EMPTY section must never read as a match
# ---------------------------------------------------------------------------

class TestEmptySectionFalseWinTrap:
    """Reproduces the exact trap named in Spec 31 §7b / R-31-4: an empty
    rendered section (or an absent element) must NEVER produce a LANDED or
    a coincidentally-passing verdict — it must hard-fail via GUARD-FAIL,
    using the SAME guard/verdict engine every other path uses (no bespoke
    "is it empty" branch invented in this runner)."""

    def test_element_absent_is_guard_fail_never_landed(self):
        cell = CellInput(
            property="background-color", tier="Base",
            draft_value="#f5f0eb", computed_value="#f5f0eb",
            expected_default=None, written=True,
        )
        obs = RenderedObservation(
            section_id="sec-empty@Base",
            block_slug="sgs/container",
            element_selector=".wp-block-sgs-container",
            element_present=False,   # PLANTED: the element never rendered
            inner_text_len=0,
            rendered_height_px=None,
            draft_height_px=200.0,
            cells=[cell],
            page_loaded=True,
        )
        report = compute_report("synthetic-empty", [obs])
        section = report.sections[0]
        assert section.guards.element is False
        for c in section.cells:
            assert c.verdict == Verdict.GUARD_FAIL
            assert c.verdict != Verdict.LANDED

    def test_element_present_but_zero_text_is_guard_fail(self):
        cell = CellInput(
            property="padding-top", tier="Base",
            draft_value="64px", computed_value="64px",
            expected_default=None, written=True,
        )
        obs = RenderedObservation(
            section_id="sec-blank@Base",
            block_slug="sgs/container",
            element_selector=".wp-block-sgs-container",
            element_present=True,
            inner_text_len=0,        # PLANTED: rendered but empty
            rendered_height_px=64.0,
            draft_height_px=64.0,
            cells=[cell],
            page_loaded=True,
        )
        report = compute_report("synthetic-blank", [obs])
        section = report.sections[0]
        assert section.guards.empty is False
        for c in section.cells:
            assert c.verdict == Verdict.GUARD_FAIL

    def test_whole_page_failed_to_load_is_not_rendered_not_landed(self):
        cell = CellInput(
            property="color", tier="Base",
            draft_value="#000000", computed_value=None,
            expected_default=None, written=True,
        )
        obs = RenderedObservation(
            section_id="sec-a@Base",
            block_slug="sgs/hero",
            element_selector=".wp-block-sgs-hero",
            element_present=False,
            inner_text_len=0,
            rendered_height_px=None,
            draft_height_px=None,
            cells=[cell],
            page_loaded=False,   # PLANTED: whole page never loaded
        )
        report = compute_report("synthetic-not-rendered", [obs])
        for c in report.sections[0].cells:
            assert c.verdict == Verdict.NOT_RENDERED


# ---------------------------------------------------------------------------
# run_fixture: no-sections + skipped-path integration (no browser required)
# ---------------------------------------------------------------------------

class TestRunFixtureNoBrowser:
    def test_fixture_with_no_registered_sections_reports_no_sections(self, tmp_path):
        draft = tmp_path / "empty.draft.html"
        draft.write_text("<html><body><p>Nothing sgs-shaped here.</p></body></html>", encoding="utf-8")
        report, warnings = batch_runner.run_fixture("empty", draft, urls_map={})
        assert report["oracle_status"] == "NO-SECTIONS"
        assert report["sections"] == []

    def test_fixture_without_configured_url_is_skipped_not_landed(self):
        # rt-background-url is a REAL corpus fixture with a real registered
        # top-level section (sgs/cta-section); probing it with an EMPTY
        # urls_map (pretending no canary is configured) must degrade
        # honestly, never emit LANDED.
        fixtures_dir = batch_runner._DEFAULT_PHASE_F_DIR
        draft = fixtures_dir / "rt-background-url.draft.html"
        if not draft.exists():
            pytest.skip("rt-background-url fixture not present in this checkout")
        report, _warnings = batch_runner.run_fixture("rt-background-url", draft, urls_map={})
        assert report["oracle_status"] == "SKIPPED-NO-LIVE-URL"
        for sec in report["sections"]:
            for c in sec["cells"]:
                assert c["verdict"] != Verdict.LANDED.value


# ---------------------------------------------------------------------------
# REGRESSION GUARDS (coordinator-requested, 2026-07-22)
#
# Bug reproduced + fixed this session: an earlier cut of ``discover_sections``
# (a literal-class-name stand-in borrowed from oracle.render_oracle) reported
# NO-SECTIONS for ``rt-centred-maxwidth`` — whose top-level root class
# (``.sgs-team-member-grid``) carries no literal name match but DOES recognise
# via the FR-31-4 container-default rule — and a batch run then OVERWROTE a
# TRACKED artefact that previously held real, hand-verified LANDED cells with
# an empty report. "Zero sections found" must be DISTINGUISHABLE from "the
# runner is looking at the wrong thing" — these two guards make a silent
# regression back to that state fail LOUDLY instead of reporting a tidy
# NO-SECTIONS.
# ---------------------------------------------------------------------------

class TestNoSilentSectionDiscoveryRegression:
    def test_container_default_case_is_not_reported_as_no_sections(self):
        """The exact regression: a root class with NO literal block-name match
        (here '.sgs-team-member-grid') must still be discovered via the
        FR-31-4 container-default rule — never silently reported as zero
        sections. If this ever regresses to `sections == []` again, this test
        fails LOUDLY rather than the batch runner quietly emitting NO-SECTIONS
        (which is what overwrote the tracked rt-centred-maxwidth.landed.json
        with an empty report)."""
        fixtures_dir = batch_runner._DEFAULT_PHASE_F_DIR
        draft = fixtures_dir / "rt-centred-maxwidth.draft.html"
        if not draft.exists():
            pytest.skip("rt-centred-maxwidth fixture not present in this checkout")
        html = draft.read_text(encoding="utf-8")
        sections = batch_runner.discover_sections(html)
        assert sections, (
            "REGRESSION: discover_sections found ZERO sections for "
            "rt-centred-maxwidth. Its root class carries no literal block-name "
            "match by design (this is the FR-31-4 red-team case) — if "
            "discover_sections stops calling the real "
            "converter.recognition.recognise_section (DB-driven, FR-31-4-aware) "
            "and falls back to a literal-class-name stand-in, this fixture "
            "silently drops to zero sections again."
        )
        assert sections[0]["block_slug"] == "sgs/container"
        assert sections[0]["native_selector"] == ".wp-block-sgs-container"

    def test_a_working_live_probe_produces_at_least_one_landed_cell(self, monkeypatch):
        """A fixture WITH a working live URL, whose probe genuinely reproduces
        matching computed values, must actually surface LANDED cells through
        the full run_fixture wiring (discovery -> attribution -> probe ->
        verdict) — not silently degrade to zero/GUARD-FAIL/UNVERIFIED because
        some earlier stage quietly returned nothing. This stubs ONLY the
        network-touching `run_live_fixture` (deterministic, no real browser)
        so the test asserts the WIRING, not network conditions."""
        fixtures_dir = batch_runner._DEFAULT_PHASE_F_DIR
        draft = fixtures_dir / "rt-centred-maxwidth.draft.html"
        if not draft.exists():
            pytest.skip("rt-centred-maxwidth fixture not present in this checkout")

        def _fake_run_live_fixture(
            stem, draft_path, live_url, sections, cells_by_section, expects_text=True,
        ):
            observations = []
            for sec in sections:
                cells = cells_by_section.get(sec["section_id"], [])
                # Simulate a perfectly faithful live render: computed == draft
                # for every attributed cell, element genuinely present+non-empty,
                # and height matching (so no guard fires).
                resolved = [
                    CellInput(
                        property=c.property, tier=c.tier, draft_value=c.draft_value,
                        computed_value=c.draft_value, expected_default=c.expected_default,
                        written=True,
                    )
                    for c in cells
                ]
                observations.append(RenderedObservation(
                    section_id=f"{sec['section_id']}@Base",
                    block_slug=sec["block_slug"],
                    element_selector=sec["native_selector"],
                    element_present=True,
                    inner_text_len=200,
                    rendered_height_px=300.0,
                    draft_height_px=300.0,
                    cells=resolved,
                    page_loaded=True,
                ))
            return observations, {}

        monkeypatch.setattr(batch_runner, "run_live_fixture", _fake_run_live_fixture)
        monkeypatch.setattr(batch_runner, "_playwright_available", lambda: True)

        report, _warnings = batch_runner.run_fixture(
            "rt-centred-maxwidth", draft, urls_map={"rt-centred-maxwidth": "https://example.test/fake"}
        )
        assert report["oracle_status"] == "LIVE-PROBED"
        all_verdicts = [c["verdict"] for sec in report["sections"] for c in sec["cells"]]
        assert Verdict.LANDED.value in all_verdicts, (
            "REGRESSION: a fixture with a working live URL and perfectly "
            "faithful computed values produced NO LANDED cells at all — "
            f"got verdicts {all_verdicts!r}. Some stage in discovery -> "
            "attribution -> probe -> verdict silently dropped everything."
        )
