"""
tests/test_coverage_check.py — Unit tests for the F5 coverage-conservation gate.

Spec ref:
  specs/31-UNIVERSAL-CONTAINER-CSS-TRANSFER.md §12.2.1
  plans/2026-06-18-f4-excluded-properties-design.md §3

These tests exercise:
  1. The JOIN function (_analyse_fixture / run_corpus) with synthetic inputs —
     verifying that the gate detects a drop (UNACCOUNTED > 0) when a declaration
     is absent from all buckets.
  2. The inverse: all draft declarations bucketed → UNACCOUNTED empty.
  3. The excluded_properties path: a declaration whose property is excluded →
     not flagged as UNACCOUNTED.
  4. The check_landed() placeholder raises NotImplementedError (DEFERRED leg).
  5. Stable key format is deterministic.
  6. Baseline round-trip: save → load → comparison.

No live DB, no network, no Playwright, no convert.py.
The css_router and declare_input are called on synthetic CSS where safe;
for the JOIN logic tests, we bypass them entirely and test the internal
helpers directly (the most reliable approach for unit tests).
"""
from __future__ import annotations

import json
import sys
import types
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

# Ensure scripts/ is on the path before importing anything.
_SCRIPTS_DIR = Path(__file__).resolve().parent.parent.parent  # scripts/
if str(_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_DIR))

from ledger.coverage_check import (
    _bucketed_sel_props,
    _decl_key,
    _extract_css_from_html,
    _extract_sel_props_from_raw_css,
    _load_baseline,
    _save_baseline,
    check_landed,
    run_corpus,
)
from ledger.models import DeclKind, InputDecl, MediaKind


# ---------------------------------------------------------------------------
# Helpers — build synthetic InputDecl rows
# ---------------------------------------------------------------------------

def _make_decl(
    fixture: str = "test",
    selector: str = ".sgs-hero",
    prop: str = "padding",
    value: str = "40px",
    tier: str = "Base",
    media: str | None = None,
    shadowed: bool = False,
    kind: DeclKind = DeclKind.box_css,
    excluded_candidate: bool = False,
) -> InputDecl:
    """Build a synthetic InputDecl for testing."""
    return InputDecl(
        fixture=fixture,
        selector=selector,
        property=prop,
        value=value,
        important=False,
        media=media,
        media_kind=MediaKind.none if media is None else MediaKind.media,
        tier=tier,
        source_index=0,
        shadowed=shadowed,
        kind=kind,
        excluded_candidate=excluded_candidate,
    )


# ---------------------------------------------------------------------------
# 1. _decl_key — stable key format
# ---------------------------------------------------------------------------

class TestDeclKey:
    def test_format(self):
        key = _decl_key("my-fixture", ".sgs-hero", "padding", "Base")
        assert key == "my-fixture|.sgs-hero|padding|Base"

    def test_deterministic(self):
        """Same inputs → same key every time."""
        k1 = _decl_key("fix", ".sel", "color", "Mobile")
        k2 = _decl_key("fix", ".sel", "color", "Mobile")
        assert k1 == k2

    def test_differs_on_tier(self):
        k_base = _decl_key("f", ".s", "margin", "Base")
        k_mobile = _decl_key("f", ".s", "margin", "Mobile")
        assert k_base != k_mobile

    def test_differs_on_property(self):
        k1 = _decl_key("f", ".s", "padding", "Base")
        k2 = _decl_key("f", ".s", "margin", "Base")
        assert k1 != k2


# ---------------------------------------------------------------------------
# 2. _extract_css_from_html
# ---------------------------------------------------------------------------

class TestExtractCssFromHtml:
    def test_single_style_block(self):
        html = "<style>.sgs-hero { padding: 40px; }</style>"
        css = _extract_css_from_html(html)
        assert ".sgs-hero" in css
        assert "padding" in css

    def test_multiple_style_blocks_concatenated(self):
        html = "<style>.a { color: red; }</style><style>.b { margin: 0; }</style>"
        css = _extract_css_from_html(html)
        assert ".a" in css
        assert ".b" in css

    def test_no_style_block(self):
        html = "<div>No CSS here.</div>"
        assert _extract_css_from_html(html) == ""


# ---------------------------------------------------------------------------
# 3. _extract_sel_props_from_raw_css
# ---------------------------------------------------------------------------

class TestExtractSelPropsFromRawCss:
    def test_simple_rule(self):
        rules = [".sgs-hero { padding: 40px; margin: 0; }"]
        result = _extract_sel_props_from_raw_css(rules)
        assert (".sgs-hero", "padding") in result
        assert (".sgs-hero", "margin") in result

    def test_media_wrapped_rule(self):
        rules = ["@media (max-width: 767px) { .sgs-hero { padding: 20px } }"]
        result = _extract_sel_props_from_raw_css(rules)
        assert (".sgs-hero", "padding") in result

    def test_empty_input(self):
        assert _extract_sel_props_from_raw_css([]) == set()

    def test_multiple_rules(self):
        rules = [
            ".sgs-hero { color: #fff; }",
            ".sgs-card { background: #000; border-radius: 8px; }",
        ]
        result = _extract_sel_props_from_raw_css(rules)
        assert (".sgs-hero", "color") in result
        assert (".sgs-card", "background") in result
        assert (".sgs-card", "border-radius") in result


# ---------------------------------------------------------------------------
# 4. _bucketed_sel_props — extracts (selector, property) from router result
# ---------------------------------------------------------------------------

class TestBucketedSelProps:
    def _make_router_result(
        self,
        d1: dict | None = None,
        d2: list | None = None,
        d3: list | None = None,
        d0: list | None = None,
    ) -> dict:
        return {
            "d0": d0 or [],
            "d1": d1 or {},
            "d2": d2 or [],
            "d3": d3 or [],
            "stats": {
                "d0_count": 0, "d1_count": 0, "d2_count": 0,
                "d3_count": 0, "total_rules": 0, "chrome_skipped": 0, "malformed": 0,
            },
        }

    def test_d1_entry_is_collected(self):
        router_result = self._make_router_result(d1={
            "sgs/hero:.sgs-hero": {
                "sgs/hero.padding": {
                    "value": "40px", "role": "spacing",
                    "source_class": "sgs-hero", "snap_skipped": False,
                    "block_slug": "sgs/hero", "css_prop": "padding", "media": None,
                }
            }
        })
        bucketed = _bucketed_sel_props(router_result)
        assert (".sgs-hero", "padding") in bucketed

    def test_d3_entry_is_collected(self):
        router_result = self._make_router_result(d3=[{
            "block_slug": "sgs/hero",
            "css_property": "border-radius",
            "raw_value": "8px",
            "source_class": "sgs-hero__media",
            "run_id": "test",
            "media": None,
        }])
        bucketed = _bucketed_sel_props(router_result)
        # D3 uses source_class → '.{source_class}'
        assert (".sgs-hero__media", "border-radius") in bucketed

    def test_d2_entry_is_collected(self):
        router_result = self._make_router_result(
            d2=[".sgs-cta { background-size: 320px; margin: 0; }"]
        )
        bucketed = _bucketed_sel_props(router_result)
        assert (".sgs-cta", "background-size") in bucketed
        assert (".sgs-cta", "margin") in bucketed

    def test_d0_entry_is_collected(self):
        router_result = self._make_router_result(
            d0=["h1, h2 { font-size: 24px; }"]
        )
        bucketed = _bucketed_sel_props(router_result)
        # h1 and/or h2 with font-size should appear
        assert any(prop == "font-size" for (sel, prop) in bucketed)

    def test_empty_result(self):
        router_result = self._make_router_result()
        assert _bucketed_sel_props(router_result) == set()


# ---------------------------------------------------------------------------
# 5. The core gate logic — synthetic JOIN tests (the acceptance proof)
# ---------------------------------------------------------------------------

class TestGateJoinLogic:
    """
    These tests prove the gate's core invariant using a fully synthetic setup:
    - Build a fake declare_input that returns a known set of InputDecl rows.
    - Build a fake route_css that returns a router result where some
      declarations are bucketed and some are not.
    - Call _analyse_fixture directly.
    - Assert UNACCOUNTED contains exactly the dropped declarations.

    This is the acceptance test required by the spec:
    Test 3: one declaration absent from bucketed∪excluded → UNACCOUNTED contains it.
    Test 4: all declarations bucketed → UNACCOUNTED empty.
    """

    def _run_analyse(self, draft_rows, router_result, excluded_props=None):
        """Call _analyse_fixture with fully synthetic inputs."""
        from ledger.coverage_check import _analyse_fixture

        excluded_props = excluded_props or set()

        def fake_declare_input(raw_html, fixture_stem):
            return draft_rows

        def fake_route_css(css_text, boundaries_meta, theme_json, run_id):
            return router_result

        # DeclKind is the real one — we need it for filtering.
        unaccounted, relevant_rows = _analyse_fixture(
            fixture_stem="synthetic",
            raw_html="<style>.synthetic { padding: 0; }</style>",
            excluded_props=excluded_props,
            declare_input_fn=fake_declare_input,
            DeclKind_cls=DeclKind,
            route_css_fn=fake_route_css,
        )
        return unaccounted, relevant_rows

    def _make_router_result(self, bucketed_tuples):
        """Build a minimal router result from a set of (selector, property) tuples.

        Places each declaration in D2 as raw CSS so _bucketed_sel_props can find them.
        """
        d2_lines = []
        for sel, prop in bucketed_tuples:
            d2_lines.append(f"{sel} {{ {prop}: __synthetic__; }}")
        return {
            "d0": [], "d1": {}, "d2": d2_lines, "d3": [],
            "stats": {
                "d0_count": 0, "d1_count": 0,
                "d2_count": len(d2_lines), "d3_count": 0,
                "total_rules": len(d2_lines), "chrome_skipped": 0, "malformed": 0,
            },
        }

    # ------------------------------------------------------------------
    # Test 3 (acceptance): drop detection
    # A declaration that is in DRAFT but absent from all buckets AND not
    # excluded → it must appear in UNACCOUNTED.
    # ------------------------------------------------------------------
    def test_drop_detected_when_declaration_absent_from_buckets(self):
        """Core gate: a dropped declaration (not in any bucket) is flagged."""
        draft_rows = [
            _make_decl(prop="padding", selector=".sgs-hero"),   # will be bucketed
            _make_decl(prop="color",   selector=".sgs-hero"),   # will be DROPPED
        ]
        # Only 'padding' is in the router output — 'color' is absent.
        router_result = self._make_router_result({(".sgs-hero", "padding")})

        unaccounted, relevant_rows = self._run_analyse(draft_rows, router_result)

        assert len(relevant_rows) == 2, "Both rows should be relevant"
        assert len(unaccounted) == 1, "Exactly one declaration should be UNACCOUNTED"
        assert unaccounted[0]["property"] == "color"
        assert unaccounted[0]["selector"] == ".sgs-hero"

    # ------------------------------------------------------------------
    # Test 4 (acceptance): all declarations bucketed → UNACCOUNTED empty
    # ------------------------------------------------------------------
    def test_no_unaccounted_when_all_declarations_bucketed(self):
        """Gate passes when every draft declaration appears in a bucket."""
        draft_rows = [
            _make_decl(prop="padding",    selector=".sgs-hero"),
            _make_decl(prop="margin-top", selector=".sgs-hero"),
            _make_decl(prop="color",      selector=".sgs-hero__title"),
        ]
        router_result = self._make_router_result({
            (".sgs-hero",        "padding"),
            (".sgs-hero",        "margin-top"),
            (".sgs-hero__title", "color"),
        })

        unaccounted, relevant_rows = self._run_analyse(draft_rows, router_result)

        assert len(relevant_rows) == 3
        assert len(unaccounted) == 0, "No UNACCOUNTED when all declarations are bucketed"

    # ------------------------------------------------------------------
    # Excluded property — not flagged as UNACCOUNTED
    # ------------------------------------------------------------------
    def test_excluded_property_not_flagged(self):
        """A property that appears in excluded_properties is NOT flagged."""
        draft_rows = [
            _make_decl(prop="animation-name", selector=".sgs-hero"),  # excluded
        ]
        router_result = self._make_router_result(set())  # nothing bucketed
        excluded_props = {"animation-name"}

        unaccounted, _ = self._run_analyse(draft_rows, router_result, excluded_props)

        assert len(unaccounted) == 0, "Excluded property must not appear in UNACCOUNTED"

    # ------------------------------------------------------------------
    # Shadowed declaration — not counted in DRAFT
    # ------------------------------------------------------------------
    def test_shadowed_declaration_not_counted(self):
        """Shadowed (cascade-losing) declarations are excluded from DRAFT."""
        shadowed_row = _make_decl(prop="font-size", selector=".sgs-title", shadowed=True)
        draft_rows = [shadowed_row]
        router_result = self._make_router_result(set())  # nothing bucketed

        unaccounted, relevant_rows = self._run_analyse(draft_rows, router_result)

        assert len(relevant_rows) == 0, "Shadowed rows must not count as DRAFT"
        assert len(unaccounted) == 0

    # ------------------------------------------------------------------
    # Structural at-rule — not counted in DRAFT
    # ------------------------------------------------------------------
    def test_structural_at_rule_not_counted(self):
        """at-keyframes / at-fontface rows are not DRAFT declarations."""
        for kind in (DeclKind.at_keyframes, DeclKind.at_fontface, DeclKind.at_import, DeclKind.at_other):
            row = _make_decl(prop="@keyframes", selector="@keyframes spin", kind=kind, excluded_candidate=True)
            draft_rows = [row]
            router_result = self._make_router_result(set())

            unaccounted, relevant_rows = self._run_analyse(draft_rows, router_result)

            assert len(relevant_rows) == 0, f"at-rule kind {kind} must not count as DRAFT"
            assert len(unaccounted) == 0

    # ------------------------------------------------------------------
    # Multiple dropped declarations — all appear in UNACCOUNTED
    # ------------------------------------------------------------------
    def test_multiple_drops_all_flagged(self):
        """When multiple declarations are dropped, all are in UNACCOUNTED."""
        draft_rows = [
            _make_decl(prop="padding",    selector=".sgs-hero"),
            _make_decl(prop="background", selector=".sgs-hero"),
            _make_decl(prop="color",      selector=".sgs-hero__text"),
        ]
        # Nothing bucketed.
        router_result = self._make_router_result(set())

        unaccounted, _ = self._run_analyse(draft_rows, router_result)

        assert len(unaccounted) == 3
        dropped_props = {e["property"] for e in unaccounted}
        assert dropped_props == {"padding", "background", "color"}

    # ------------------------------------------------------------------
    # D1 bucket (css_router format) — recognised correctly
    # ------------------------------------------------------------------
    def test_d1_bucket_recognised(self):
        """A declaration in D1 (the typed-attr bucket) is marked as BUCKETED."""
        draft_rows = [
            _make_decl(prop="padding", selector=".sgs-hero"),
        ]
        router_result = {
            "d0": [], "d2": [], "d3": [],
            "d1": {
                "sgs/hero:.sgs-hero": {
                    "sgs/hero.padding": {
                        "value": "40px", "role": "spacing",
                        "source_class": "sgs-hero", "snap_skipped": False,
                        "block_slug": "sgs/hero", "css_prop": "padding", "media": None,
                    }
                }
            },
            "stats": {
                "d0_count": 0, "d1_count": 1, "d2_count": 0,
                "d3_count": 0, "total_rules": 1, "chrome_skipped": 0, "malformed": 0,
            },
        }

        unaccounted, _ = self._run_analyse(draft_rows, router_result)

        assert len(unaccounted) == 0, "D1-bucketed declaration must not be UNACCOUNTED"

    # ------------------------------------------------------------------
    # Stable key content
    # ------------------------------------------------------------------
    def test_unaccounted_key_format(self):
        """UNACCOUNTED entries carry stable, deterministic keys."""
        draft_rows = [_make_decl(prop="color", selector=".sgs-card", tier="Desktop")]
        router_result = self._make_router_result(set())

        unaccounted, _ = self._run_analyse(draft_rows, router_result)

        assert len(unaccounted) == 1
        key = unaccounted[0]["key"]
        assert key == "synthetic|.sgs-card|color|Desktop"


# ---------------------------------------------------------------------------
# 6. check_landed placeholder raises NotImplementedError
# ---------------------------------------------------------------------------

class TestCheckLandedDeferred:
    def test_raises_not_implemented(self):
        """check_landed() must raise NotImplementedError (DEFERRED — F3 not yet landed)."""
        with pytest.raises(NotImplementedError) as exc_info:
            check_landed("test-fixture", {})
        assert "DEFERRED" in str(exc_info.value)
        assert "F3" in str(exc_info.value)

    def test_error_message_mentions_spec(self):
        """The NotImplementedError message must reference Spec 31 §12.2.2."""
        with pytest.raises(NotImplementedError) as exc_info:
            check_landed("x", {})
        assert "12.2.2" in str(exc_info.value) or "§12.2" in str(exc_info.value)


# ---------------------------------------------------------------------------
# 7. Baseline save/load round-trip
# ---------------------------------------------------------------------------

class TestBaselineRoundTrip:
    def test_save_and_load(self, tmp_path):
        """Baseline file can be written and read back as the same set."""
        from ledger.coverage_check import _load_baseline, _save_baseline
        import ledger.coverage_check as cc

        baseline_path = tmp_path / "coverage-baseline.json"
        original = cc._BASELINE_PATH

        try:
            cc._BASELINE_PATH = baseline_path

            keys = {"fix1|.sgs-hero|padding|Base", "fix2|.sgs-card|color|Mobile"}
            _save_baseline(keys)

            loaded = _load_baseline()
            assert loaded == keys
        finally:
            cc._BASELINE_PATH = original

    def test_load_missing_baseline_returns_empty_set(self, tmp_path):
        """Missing baseline file → empty set (not an error)."""
        import ledger.coverage_check as cc

        original = cc._BASELINE_PATH
        try:
            cc._BASELINE_PATH = tmp_path / "nonexistent-baseline.json"
            loaded = _load_baseline()
            assert loaded == set()
        finally:
            cc._BASELINE_PATH = original

    def test_baseline_file_is_sorted_json_list(self, tmp_path):
        """Baseline file must be a sorted JSON list (deterministic, diffable)."""
        import ledger.coverage_check as cc

        baseline_path = tmp_path / "coverage-baseline.json"
        original = cc._BASELINE_PATH
        try:
            cc._BASELINE_PATH = baseline_path
            keys = {"z-key", "a-key", "m-key"}
            _save_baseline(keys)

            content = json.loads(baseline_path.read_text(encoding="utf-8"))
            assert isinstance(content, list)
            assert content == sorted(keys)
        finally:
            cc._BASELINE_PATH = original


# ---------------------------------------------------------------------------
# 8. Integration — run_corpus over phase-f fixtures (smoke test)
# ---------------------------------------------------------------------------

class TestRunCorpusIntegration:
    """
    Smoke test: run the real declare_input + css_router over the phase-f corpus.
    We do not assert specific UNACCOUNTED counts (those depend on the live DB state
    and will change as the pipeline is rebuilt) — we only assert:
      • run_corpus returns the expected structure.
      • total_relevant >= 0 (no crash).
      • per-fixture entries are present for each discovered fixture.
    """

    @pytest.mark.integration
    def test_run_corpus_phase_f_does_not_crash(self):
        """run_corpus over phase-f fixtures returns a valid summary dict."""
        scripts_dir = Path(__file__).resolve().parent.parent.parent
        fixtures_dir = scripts_dir / "tests" / "fixtures" / "phase-f"
        db_path = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"

        if not fixtures_dir.exists():
            pytest.skip(f"phase-f fixtures not found: {fixtures_dir}")

        summary = run_corpus(
            fixtures_phase_f_dir=fixtures_dir,
            conformance_dir=None,  # skip conformance in this smoke test
            db_path=db_path,
        )

        assert "per_fixture" in summary
        assert "total_relevant" in summary
        assert "total_unaccounted" in summary
        assert "all_unaccounted_keys" in summary

        assert isinstance(summary["total_relevant"], int)
        assert summary["total_relevant"] >= 0
        assert isinstance(summary["total_unaccounted"], int)
        assert summary["total_unaccounted"] >= 0

        # We expect the 6 phase-f draft fixtures to appear.
        expected_stems = {
            "sgs-media", "rt-pseudo-before", "rt-video-media",
            "rt-media-600", "rt-background-url", "rt-centred-maxwidth",
        }
        found_stems = set(summary["per_fixture"].keys())
        assert expected_stems <= found_stems, (
            f"Missing fixtures from summary: {expected_stems - found_stems}"
        )

    @pytest.mark.integration
    def test_run_corpus_total_unaccounted_not_exceeds_total_relevant(self):
        """UNACCOUNTED can never exceed RELEVANT (mathematical sanity check)."""
        scripts_dir = Path(__file__).resolve().parent.parent.parent
        fixtures_dir = scripts_dir / "tests" / "fixtures" / "phase-f"
        db_path = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"

        if not fixtures_dir.exists():
            pytest.skip(f"phase-f fixtures not found: {fixtures_dir}")

        summary = run_corpus(
            fixtures_phase_f_dir=fixtures_dir,
            conformance_dir=None,
            db_path=db_path,
        )

        assert summary["total_unaccounted"] <= summary["total_relevant"], (
            "UNACCOUNTED cannot exceed RELEVANT — arithmetic invariant violated."
        )
