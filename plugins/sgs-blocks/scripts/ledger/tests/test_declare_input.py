"""
ledger.tests.test_declare_input — F2 input-parser correctness tests.

Acceptance criteria per design doc §8:
1. Named properties from each .expected.md are present in declare_input.
2. Per-fixture count goldens (stable, diff-detected).
3. Stable + reproducible (two runs produce identical output).
4. Fail-CLOSED (malformed CSS and non-font @import raise LedgerParseError).
5. Independence (transitive import test: css_router/convert/db_lookup not reachable).
6. Tier derivation correctness (§5 algorithm).
7. rt-background-url: background family + @media background-size rows present.
8. rt-pseudo-before: ::before declarations present.
9. rt-media-600: @media(max-width:600px) rows get tier=Other:(max-width:600px).
"""
from __future__ import annotations

import importlib
import json
import sys
from pathlib import Path

import pytest

# ---------------------------------------------------------------------------
# Path helpers
# ---------------------------------------------------------------------------

FIXTURES_DIR = Path(__file__).parents[2] / "tests" / "fixtures" / "phase-f"
LEDGER_DIR = FIXTURES_DIR / "_ledger"

PHASE_F_DRAFTS = sorted(FIXTURES_DIR.glob("*.draft.html"))
PHASE_F_STEMS = [f.stem.removesuffix(".draft") for f in PHASE_F_DRAFTS]


def load_fixture(filename: str) -> str:
    return (FIXTURES_DIR / filename).read_text(encoding="utf-8")


def parse_fixture(filename: str) -> list:
    from ledger.declare_input import declare_input
    stem = filename.removesuffix(".draft.html").removesuffix(".html")
    raw_html = load_fixture(filename)
    return declare_input(raw_html, stem)


# ---------------------------------------------------------------------------
# Acceptance criterion 5: Independence
# ---------------------------------------------------------------------------

class TestIndependence:
    """Verify the ledger module does NOT transitively import the converter stack."""

    FORBIDDEN_MODULES = [
        "css_router",
        "convert",
        "db_lookup",
    ]
    # These strings must not appear as DB query targets in non-test source files.
    # We check for SQL query patterns like FROM/JOIN + table name, not bare mentions.
    FORBIDDEN_DB_TABLES = [
        "property_suffixes",
        "block_attributes",
    ]

    def test_no_forbidden_transitive_imports(self):
        """Import ledger in an env where forbidden modules are poisoned."""
        # Install poison modules into sys.modules before importing.
        # If ledger tries to import them, AttributeError/ImportError will propagate.
        import types

        sentinel = types.ModuleType("_poison")
        sentinel.__getattr__ = lambda self, name: (_ for _ in ()).throw(
            AssertionError(f"Forbidden import reached: {name}")
        )

        # Fresh import via importlib to bypass cache effects
        for mod in list(sys.modules.keys()):
            if mod.startswith("ledger"):
                del sys.modules[mod]

        for forbidden in self.FORBIDDEN_MODULES:
            sys.modules[forbidden] = sentinel  # type: ignore[assignment]

        try:
            import ledger  # noqa: F401
            from ledger.declare_input import declare_input  # noqa: F401
        except AssertionError as exc:
            pytest.fail(f"Forbidden transitive import: {exc}")
        finally:
            for forbidden in self.FORBIDDEN_MODULES:
                sys.modules.pop(forbidden, None)
            # Clean ledger cache so other tests get fresh import
            for mod in list(sys.modules.keys()):
                if mod.startswith("ledger"):
                    del sys.modules[mod]

    def test_no_db_query_in_source(self):
        """No DB query patterns for converter tables under ledger/ non-test source files.

        We check for SQL query patterns (FROM/JOIN <table>, execute(<table>, etc.)
        rather than bare string mentions, so docstrings/comments don't trigger this.
        """
        import re as _re
        ledger_dir = Path(__file__).parents[1]
        # Patterns that indicate actual DB queries
        query_patterns = [
            _re.compile(r'\bFROM\s+' + t, _re.IGNORECASE)
            for t in self.FORBIDDEN_DB_TABLES
        ] + [
            _re.compile(r'\bJOIN\s+' + t, _re.IGNORECASE)
            for t in self.FORBIDDEN_DB_TABLES
        ] + [
            _re.compile(r'["\']SELECT.*FROM.*' + t, _re.IGNORECASE)
            for t in self.FORBIDDEN_DB_TABLES
        ]
        for py_file in ledger_dir.rglob("*.py"):
            if py_file.name.startswith("test_"):
                continue
            source = py_file.read_text(encoding="utf-8")
            for pattern in query_patterns:
                assert not pattern.search(source), (
                    f"Forbidden DB query pattern {pattern.pattern!r} found in {py_file} — "
                    "ledger must not query the converter DB."
                )


# ---------------------------------------------------------------------------
# Acceptance criterion 4: Fail-CLOSED
# ---------------------------------------------------------------------------

class TestFailClosed:
    def test_malformed_css_raises(self):
        """CSS with an unrecognised at-rule raises LedgerParseError (fail-closed)."""
        from ledger import LedgerParseError
        from ledger.declare_input import declare_input

        # An @charset at-rule is unknown to our ledger — fail-closed.
        malformed = "<style>@charset 'UTF-8'; .foo { color: red; }</style>"
        with pytest.raises(LedgerParseError, match="Unknown at-rule"):
            declare_input(malformed, "malformed-test")

    def test_non_font_import_raises(self):
        """Non-font @import raises LedgerParseError."""
        from ledger import LedgerParseError
        from ledger.declare_input import declare_input

        html = "<style>@import url('/local/styles.css');</style>"
        with pytest.raises(LedgerParseError, match="@import outside font CDN"):
            declare_input(html, "import-test")

    def test_font_import_allowed(self):
        """Google Fonts @import does NOT raise."""
        from ledger.declare_input import declare_input

        html = "<style>@import url('https://fonts.googleapis.com/css2?family=Inter');</style>"
        rows = declare_input(html, "font-import-test")
        assert any(r.kind.value == "at-import" for r in rows)

    def test_unknown_at_rule_raises(self):
        """An unknown at-rule (not @media/@supports/@keyframes/@font-face/@import/@layer) raises."""
        from ledger import LedgerParseError
        from ledger.declare_input import declare_input

        html = "<style>@totally-unknown-rule foo { color: red; }</style>"
        with pytest.raises(LedgerParseError, match="Unknown at-rule"):
            declare_input(html, "unknown-at-rule-test")


# ---------------------------------------------------------------------------
# Acceptance criterion 6: Tier derivation
# ---------------------------------------------------------------------------

class TestTierDerivation:
    """§5 tier algorithm precision — per design doc defect 1/7/13."""

    def _tiers_for_media(self, *conditions: str) -> list[str]:
        from ledger.declare_input import _derive_tier, MediaKind
        return [_derive_tier(c, MediaKind.media) for c in conditions]

    def test_mobile_max_767(self):
        # Only the canonical device-tier mobile threshold maps to Mobile.
        # 600/481 are visual breakpoints → Other (see test_visual_breakpoints_not_snapped).
        tiers = self._tiers_for_media("(max-width: 767px)")
        assert all(t == "Mobile" for t in tiers), tiers

    def test_tablet_768_to_1023(self):
        from ledger.declare_input import _derive_tier, MediaKind
        tier = _derive_tier("(min-width: 768px) and (max-width: 1023px)", MediaKind.media)
        assert tier == "Tablet", tier

    def test_desktop_min_1024(self):
        from ledger.declare_input import _derive_tier, MediaKind
        tier = _derive_tier("(min-width: 1024px)", MediaKind.media)
        assert tier == "Desktop", tier

    def test_min_width_768_alone_is_other(self):
        """Standalone min-width:768 spans Tablet+Desktop → Other."""
        from ledger.declare_input import _derive_tier, MediaKind
        tier = _derive_tier("(min-width: 768px)", MediaKind.media)
        assert tier.startswith("Other:"), f"Expected Other:, got {tier}"

    def test_600px_is_other(self):
        """max-width:600px is a visual breakpoint → Other (D228 canonical-threshold)."""
        from ledger.declare_input import _derive_tier, MediaKind
        tier = _derive_tier("(max-width: 600px)", MediaKind.media)
        assert tier == "Other:(max-width: 600px)", tier

    def test_canonical_mobile_thresholds(self):
        """Only canonical max-width values {767, 767.98, 768} → Mobile."""
        from ledger.declare_input import _derive_tier, MediaKind
        assert _derive_tier("(max-width: 767px)", MediaKind.media) == "Mobile"
        assert _derive_tier("(max-width: 767.98px)", MediaKind.media) == "Mobile"
        assert _derive_tier("(max-width: 768px)", MediaKind.media) == "Mobile"

    def test_noncanonical_max_widths_are_other(self):
        """640/481/781 are visual breakpoints → Other, never snapped to a tier."""
        from ledger.declare_input import _derive_tier, MediaKind
        for w in (640, 481, 781):
            tier = _derive_tier(f"(max-width: {w}px)", MediaKind.media)
            assert tier == f"Other:(max-width: {w}px)", f"{w}px got {tier!r}"

    def test_min_width_1280_is_other(self):
        """A standalone min-width:1280 is not Desktop (1024) → Other."""
        from ledger.declare_input import _derive_tier, MediaKind
        tier = _derive_tier("(min-width: 1280px)", MediaKind.media)
        assert tier == "Other:(min-width: 1280px)", tier

    def test_base_when_no_media(self):
        from ledger.declare_input import _derive_tier, MediaKind
        tier = _derive_tier(None, MediaKind.none)
        assert tier == "Base"

    def test_supports_is_base(self):
        from ledger.declare_input import _derive_tier, MediaKind
        tier = _derive_tier("(display: grid)", MediaKind.supports)
        assert tier == "Base"


# ---------------------------------------------------------------------------
# Acceptance criterion 1: Named properties from expected.md are present
# ---------------------------------------------------------------------------

class TestFixtureProperties:
    """Each fixture's named CSS properties must appear in declare_input."""

    def _props_in_fixture(self, filename: str) -> set[str]:
        rows = parse_fixture(filename)
        return {r.property for r in rows}

    def test_rt_background_url_background_family(self):
        """rt-background-url: full background family must be present."""
        props = self._props_in_fixture("rt-background-url.draft.html")
        required = {"background-image", "background-size", "background-position", "background-repeat", "background-color"}
        missing = required - props
        assert not missing, f"Missing background properties: {missing}"

    def test_rt_background_url_media_background_size(self):
        """rt-background-url: @media background-size row must be present at Mobile tier."""
        rows = parse_fixture("rt-background-url.draft.html")
        mobile_bg_size = [
            r for r in rows
            if r.property == "background-size" and r.tier == "Mobile"
        ]
        assert mobile_bg_size, "No Mobile-tier background-size row found in rt-background-url"

    def test_rt_pseudo_before_declarations(self):
        """rt-pseudo-before: ::before declarations (content, background, etc.) must be present."""
        rows = parse_fixture("rt-pseudo-before.draft.html")
        pseudo_rows = [r for r in rows if "::before" in r.selector]
        assert pseudo_rows, "No ::before selector rows found in rt-pseudo-before"
        pseudo_props = {r.property for r in pseudo_rows}
        # The ::before rule has: content, position, inset, background, z-index, pointer-events
        required_pseudo = {"content", "background"}
        missing = required_pseudo - pseudo_props
        assert not missing, f"Missing ::before properties: {missing}. Found: {pseudo_props}"

    def test_rt_media_600_other_tier(self):
        """rt-media-600: @media(max-width:600px) rows get tier=Other:<verbatim>.

        D228 / device-tier-vs-visual-breakpoints-are-distinct: 600px is a VISUAL
        breakpoint, not an SGS device tier. Snapping it to Mobile is a CHEAT
        (rt-media-600.expected.md line 47). The canonical-threshold rule only
        matches exact device thresholds {767, 767.98, 768} for Mobile.
        """
        rows = parse_fixture("rt-media-600.draft.html")
        media_600_rows = [
            r for r in rows
            if r.media is not None and "600" in r.media
        ]
        assert media_600_rows, "No @media (max-width:600px) rows found in rt-media-600"
        for r in media_600_rows:
            assert r.tier == "Other:(max-width: 600px)", (
                f"Expected Other:(max-width: 600px) for the 600px visual breakpoint, "
                f"got {r.tier!r} for {r.selector}"
            )

    def test_rt_media_600_grid_declarations(self):
        """rt-media-600: declarations inside @media(max-width:600px) must be captured."""
        rows = parse_fixture("rt-media-600.draft.html")
        media_600_rows = [r for r in rows if r.media is not None and "600" in r.media]
        props = {r.property for r in media_600_rows}
        # Inside @media (max-width:600px): grid-template-columns, gap, padding
        assert "grid-template-columns" in props, f"grid-template-columns missing from 600px block. Got: {props}"
        assert "gap" in props, f"gap missing from 600px block. Got: {props}"

    def test_sgs_media_all_properties(self):
        """sgs-media: all 6 required properties must be present."""
        props = self._props_in_fixture("sgs-media.draft.html")
        required = {"max-width", "aspect-ratio", "object-fit", "object-position", "border-radius"}
        missing = required - props
        assert not missing, f"Missing sgs-media properties: {missing}"

    def test_rt_centred_maxwidth_properties(self):
        """rt-centred-maxwidth: max-width, margin, display, grid-template-columns, gap, etc."""
        props = self._props_in_fixture("rt-centred-maxwidth.draft.html")
        required = {"max-width", "margin", "display", "grid-template-columns", "gap", "padding", "background"}
        missing = required - props
        assert not missing, f"Missing rt-centred-maxwidth properties: {missing}"

    def test_rt_video_media_properties(self):
        """rt-video-media: object-fit, object-position, min-height, grid-template-columns."""
        props = self._props_in_fixture("rt-video-media.draft.html")
        required = {"object-fit", "object-position", "min-height", "grid-template-columns"}
        missing = required - props
        assert not missing, f"Missing rt-video-media properties: {missing}"


# ---------------------------------------------------------------------------
# Acceptance criterion 2: Count goldens (parametrised over all fixtures)
# ---------------------------------------------------------------------------

class TestCountGoldens:
    """Per-fixture row counts match committed goldens if they exist."""

    @pytest.mark.parametrize("stem", PHASE_F_STEMS)
    def test_row_count_matches_golden(self, stem: str):
        golden_path = LEDGER_DIR / f"{stem}.declare-input.json"
        if not golden_path.exists():
            pytest.skip(f"No golden yet for {stem} — run declare_input.py to generate")

        golden = json.loads(golden_path.read_text(encoding="utf-8"))
        fixture_file = FIXTURES_DIR / f"{stem}.draft.html"
        raw_html = fixture_file.read_text(encoding="utf-8")

        from ledger.declare_input import declare_input
        rows = declare_input(raw_html, stem)

        assert len(rows) == golden["row_count"], (
            f"{stem}: current row_count={len(rows)}, golden={golden['row_count']}. "
            "If rows legitimately changed, regenerate with --regenerate."
        )

    @pytest.mark.parametrize("stem", PHASE_F_STEMS)
    def test_row_count_not_decreased(self, stem: str):
        """The ledger's own count-floor: row_count must never silently decrease."""
        golden_path = LEDGER_DIR / f"{stem}.declare-input.json"
        if not golden_path.exists():
            pytest.skip(f"No golden yet for {stem}")

        golden = json.loads(golden_path.read_text(encoding="utf-8"))
        fixture_file = FIXTURES_DIR / f"{stem}.draft.html"
        raw_html = fixture_file.read_text(encoding="utf-8")

        from ledger.declare_input import declare_input
        rows = declare_input(raw_html, stem)

        assert len(rows) >= golden["row_count"], (
            f"COUNT-FLOOR FAIL: {stem} row_count dropped from {golden['row_count']} "
            f"to {len(rows)}. A shrinking ledger is the exact failure F2 exists to catch."
        )


# ---------------------------------------------------------------------------
# Acceptance criterion 3: Stability + reproducibility
# ---------------------------------------------------------------------------

class TestDeterminism:
    @pytest.mark.parametrize("stem", PHASE_F_STEMS)
    def test_two_runs_identical(self, stem: str):
        """Two runs on the same fixture must produce identical output."""
        from ledger.declare_input import declare_input

        fixture_file = FIXTURES_DIR / f"{stem}.draft.html"
        raw_html = fixture_file.read_text(encoding="utf-8")

        run1 = [r.as_dict() for r in declare_input(raw_html, stem)]
        run2 = [r.as_dict() for r in declare_input(raw_html, stem)]

        assert run1 == run2, f"{stem}: two runs produced different output"

    @pytest.mark.parametrize("stem", PHASE_F_STEMS)
    def test_output_is_sorted(self, stem: str):
        """Output rows must be sorted by (selector, media or '', property, source_index)."""
        from ledger.declare_input import declare_input

        fixture_file = FIXTURES_DIR / f"{stem}.draft.html"
        raw_html = fixture_file.read_text(encoding="utf-8")

        rows = declare_input(raw_html, stem)
        keys = [(r.selector, r.media or "", r.property, r.source_index) for r in rows]
        assert keys == sorted(keys), f"{stem}: rows are not in sorted order"


# ---------------------------------------------------------------------------
# Detailed fixture-specific tests
# ---------------------------------------------------------------------------

class TestRtBackgroundUrl:
    """Detailed checks for rt-background-url fixture."""

    @pytest.fixture(scope="class")
    def rows(self):
        return parse_fixture("rt-background-url.draft.html")

    def test_background_image_present(self, rows):
        props = {r.property for r in rows}
        assert "background-image" in props

    def test_background_image_value_verbatim(self, rows):
        bg_img_rows = [r for r in rows if r.property == "background-image"]
        assert bg_img_rows
        assert any("pattern-dots.svg" in r.value for r in bg_img_rows)

    def test_background_size_desktop(self, rows):
        desktop_bg = [r for r in rows if r.property == "background-size" and r.tier == "Base"]
        assert desktop_bg, "No Base-tier background-size row"
        assert any("320px" in r.value for r in desktop_bg)

    def test_background_size_mobile(self, rows):
        mobile_bg = [r for r in rows if r.property == "background-size" and r.tier == "Mobile"]
        assert mobile_bg, "No Mobile-tier background-size row"
        assert any("200px" in r.value for r in mobile_bg)

    def test_background_position_present(self, rows):
        assert any(r.property == "background-position" for r in rows)

    def test_background_repeat_present(self, rows):
        assert any(r.property == "background-repeat" for r in rows)

    def test_no_shorthand_expansion(self, rows):
        """Physical declarations only — no padding-top, padding-bottom etc. from padding shorthand."""
        # padding shorthand should be present, not exploded
        props = {r.property for r in rows}
        assert "padding" in props, "padding shorthand should be captured verbatim"
        # padding-top should NOT be present (no shorthand expansion in v2)
        assert "padding-top" not in props, "v2: no shorthand expansion — padding-top must not appear"


class TestRtPseudoBefore:
    """Detailed checks for rt-pseudo-before fixture."""

    @pytest.fixture(scope="class")
    def rows(self):
        return parse_fixture("rt-pseudo-before.draft.html")

    def test_pseudo_before_selector_present(self, rows):
        pseudo_rows = [r for r in rows if "::before" in r.selector]
        assert pseudo_rows, "No ::before rows found"

    def test_pseudo_before_content_property(self, rows):
        pseudo_rows = [r for r in rows if "::before" in r.selector]
        props = {r.property for r in pseudo_rows}
        assert "content" in props, f"content missing from ::before. Props: {props}"

    def test_pseudo_before_background_property(self, rows):
        pseudo_rows = [r for r in rows if "::before" in r.selector]
        props = {r.property for r in pseudo_rows}
        assert "background" in props, f"background missing from ::before. Props: {props}"

    def test_pseudo_before_position_property(self, rows):
        pseudo_rows = [r for r in rows if "::before" in r.selector]
        props = {r.property for r in pseudo_rows}
        assert "position" in props, f"position missing from ::before. Props: {props}"

    def test_pseudo_before_kind_is_box_css(self, rows):
        pseudo_rows = [r for r in rows if "::before" in r.selector]
        for r in pseudo_rows:
            assert r.kind.value == "box-css", f"::before row kind should be box-css, got {r.kind}"

    def test_non_pseudo_rules_also_present(self, rows):
        """Non-pseudo rules like .sgs-info-box must also be captured."""
        non_pseudo = [r for r in rows if "::before" not in r.selector and not r.selector.startswith("@")]
        assert non_pseudo, "No non-pseudo rows found — parser may have only captured ::before"


class TestRtMedia600:
    """Detailed checks for rt-media-600 fixture."""

    @pytest.fixture(scope="class")
    def rows(self):
        return parse_fixture("rt-media-600.draft.html")

    def test_600px_media_rows_captured(self, rows):
        media_600 = [r for r in rows if r.media and "600" in r.media]
        assert media_600, "No rows from @media (max-width:600px)"

    def test_767px_media_rows_captured(self, rows):
        media_767 = [r for r in rows if r.media and "767" in r.media]
        assert media_767, "No rows from @media (max-width:767px)"

    def test_767px_tier_is_mobile(self, rows):
        media_767 = [r for r in rows if r.media and "767" in r.media]
        for r in media_767:
            assert r.tier == "Mobile", f"767px tier should be Mobile, got {r.tier}"

    def test_600px_tier_is_other(self, rows):
        """600px is a visual breakpoint → Other:<verbatim> (D228, never Mobile)."""
        media_600 = [r for r in rows if r.media and "600" in r.media]
        assert media_600
        for r in media_600:
            assert r.tier == "Other:(max-width: 600px)", (
                f"600px tier should be Other:(max-width: 600px), got {r.tier!r}"
            )

    def test_600px_grid_template_columns_captured(self, rows):
        media_600 = [r for r in rows if r.media and "600" in r.media]
        props = {r.property for r in media_600}
        assert "grid-template-columns" in props, f"grid-template-columns missing. Got: {props}"

    def test_600px_gap_captured(self, rows):
        media_600 = [r for r in rows if r.media and "600" in r.media]
        props = {r.property for r in media_600}
        assert "gap" in props, f"gap missing from 600px block. Got: {props}"

    def test_600px_padding_captured(self, rows):
        media_600 = [r for r in rows if r.media and "600" in r.media]
        props = {r.property for r in media_600}
        assert "padding" in props, f"padding missing from 600px block. Got: {props}"


# ---------------------------------------------------------------------------
# DataModel integrity tests
# ---------------------------------------------------------------------------

class TestDataModel:
    def test_input_decl_is_frozen(self):
        """InputDecl must be frozen (immutable)."""
        from ledger.models import InputDecl, MediaKind, DeclKind
        row = InputDecl(
            fixture="test",
            selector=".foo",
            property="color",
            value="red",
            important=False,
            media=None,
            media_kind=MediaKind.none,
            tier="Base",
            source_index=0,
            shadowed=False,
            kind=DeclKind.box_css,
            excluded_candidate=False,
        )
        with pytest.raises((AttributeError, TypeError)):
            row.property = "background"  # type: ignore[misc]

    def test_important_extraction(self):
        """!important is extracted into the important bool, not in value."""
        from ledger.declare_input import declare_input

        html = "<style>.foo { color: red !important; }</style>"
        rows = declare_input(html, "test-important")
        assert rows
        row = rows[0]
        assert row.important is True
        assert "!important" not in row.value
        assert row.value == "red"

    def test_custom_property_kind(self):
        """CSS custom properties get kind=custom-prop."""
        from ledger.declare_input import declare_input
        from ledger.models import DeclKind

        html = "<style>:root { --primary-color: #ff0000; }</style>"
        rows = declare_input(html, "test-custom-prop")
        custom_rows = [r for r in rows if r.property.startswith("--")]
        assert custom_rows
        assert all(r.kind == DeclKind.custom_prop for r in custom_rows)

    def test_inline_style_kind(self):
        """Inline style="" attributes get kind=inline-style."""
        from ledger.declare_input import declare_input
        from ledger.models import DeclKind

        html = '<div style="color: blue; margin: 0 auto;"></div>'
        rows = declare_input(html, "test-inline")
        inline_rows = [r for r in rows if r.kind == DeclKind.inline_style]
        assert inline_rows
        assert all("[inline:" in r.selector for r in inline_rows)

    def test_keyframes_excluded_candidate(self):
        """@keyframes rows get excluded_candidate=True."""
        from ledger.declare_input import declare_input

        html = "<style>@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }</style>"
        rows = declare_input(html, "test-keyframes")
        kf_rows = [r for r in rows if r.kind.value == "at-keyframes"]
        assert kf_rows
        assert all(r.excluded_candidate for r in kf_rows)

    def test_box_css_not_excluded_candidate(self):
        """Regular box-css rows must NOT have excluded_candidate=True."""
        from ledger.declare_input import declare_input

        html = "<style>.foo { color: red; background: blue; }</style>"
        rows = declare_input(html, "test-box-css")
        for r in rows:
            if r.kind.value == "box-css":
                assert not r.excluded_candidate, (
                    f"box-css row {r.selector}/{r.property} has excluded_candidate=True — "
                    "only structural at-rules may be marked excluded_candidate"
                )

    def test_shadowed_cascade_losers(self):
        """When same (selector, property, media) appears twice, first is shadowed."""
        from ledger.declare_input import declare_input

        html = "<style>.foo { color: red; color: blue; }</style>"
        rows = declare_input(html, "test-shadowed")
        color_rows = [r for r in rows if r.selector == ".foo" and r.property == "color"]
        assert len(color_rows) == 2
        # Sorted by source_index; first = shadowed
        sorted_rows = sorted(color_rows, key=lambda r: r.source_index)
        assert sorted_rows[0].shadowed is True
        assert sorted_rows[1].shadowed is False

    def test_source_index_monotonic(self):
        """source_index values must be monotonically increasing in parse order."""
        from ledger.declare_input import declare_input

        html = (FIXTURES_DIR / "rt-background-url.draft.html").read_text(encoding="utf-8")
        rows = declare_input(html, "test-monotonic")
        indexes = [r.source_index for r in sorted(rows, key=lambda r: r.source_index)]
        assert indexes == list(range(len(indexes))), "source_index is not monotonic 0..N-1"

    def test_template_elements_skipped(self):
        """<template> element contents must not be parsed."""
        from ledger.declare_input import declare_input

        html = """
        <style>.real { color: red; }</style>
        <template>
          <style>.template-only { color: blue; }</style>
        </template>
        """
        rows = declare_input(html, "test-template")
        selectors = {r.selector for r in rows}
        assert ".real" in selectors
        assert ".template-only" not in selectors, "<template> content must be skipped"

    def test_none_media_is_base_tier(self):
        """Top-level rules (no @media) have tier=Base."""
        from ledger.declare_input import declare_input

        html = "<style>.foo { color: red; }</style>"
        rows = declare_input(html, "test-base")
        for r in rows:
            assert r.tier == "Base"
            assert r.media is None
            assert r.media_kind.value == "none"


# ---------------------------------------------------------------------------
# Artefact format tests
# ---------------------------------------------------------------------------

class TestArtefactFormat:
    """Verify JSON artefact structure matches the §7 schema."""

    @pytest.fixture(scope="class")
    def artefact(self):
        from ledger.declare_input import _build_artefact, declare_input
        raw_html = (FIXTURES_DIR / "sgs-media.draft.html").read_text(encoding="utf-8")
        rows = declare_input(raw_html, "sgs-media")
        return _build_artefact("sgs-media", rows)

    def test_required_top_level_keys(self, artefact):
        required = {"fixture", "generated_by", "row_count", "by_kind", "rows"}
        assert required.issubset(set(artefact.keys()))

    def test_generated_by_contains_tinycss2_version(self, artefact):
        gb = artefact["generated_by"]
        assert "tinycss2_version" in gb
        assert gb["tinycss2_version"] == "1.5.1"

    def test_row_count_matches_rows(self, artefact):
        assert artefact["row_count"] == len(artefact["rows"])

    def test_row_fields_complete(self, artefact):
        required_fields = {
            "fixture", "selector", "property", "value", "important",
            "media", "media_kind", "tier", "source_index", "shadowed",
            "kind", "excluded_candidate",
        }
        for row in artefact["rows"]:
            assert required_fields.issubset(set(row.keys())), f"Missing fields in row: {row}"

    def test_none_fields_emitted_as_null(self, artefact):
        """media=None must serialise as null in JSON."""
        base_rows = [r for r in artefact["rows"] if r["media"] is None]
        assert base_rows, "No base (media=null) rows found"

    def test_tinycss2_version_pinned(self, artefact):
        """tinycss2 version must be exactly 1.5.1."""
        assert artefact["generated_by"]["tinycss2_version"] == "1.5.1", (
            f"tinycss2 version mismatch: {artefact['generated_by']['tinycss2_version']}"
        )


# ---------------------------------------------------------------------------
# SF-4 (a): Count-floor parametrised over ALL fixtures (phase-f + conformance)
# ---------------------------------------------------------------------------

CONFORMANCE_DIR = FIXTURES_DIR.parent / "conformance"
CONFORMANCE_FILES = sorted(CONFORMANCE_DIR.glob("*.html")) if CONFORMANCE_DIR.exists() else []
CONFORMANCE_STEMS = [f.stem for f in CONFORMANCE_FILES]

ALL_STEMS = PHASE_F_STEMS + CONFORMANCE_STEMS


class TestCountGoldensAllFixtures:
    """SF-4(a): Count-floor check parametrised over ALL fixtures, not just phase-f.

    The conformance fixtures also generate goldens (via the conformance/ directory
    branch in generate_goldens/check_goldens).  This test class ensures that a
    new conformance fixture + golden is auto-covered without editing the test.
    """

    @pytest.mark.parametrize("stem", ALL_STEMS)
    def test_row_count_not_decreased_all_fixtures(self, stem: str):
        """Count-floor: row_count must never silently decrease for any fixture."""
        golden_path = LEDGER_DIR / f"{stem}.declare-input.json"
        if not golden_path.exists():
            pytest.skip(f"No golden yet for {stem} — run declare_input.py to generate")

        golden = json.loads(golden_path.read_text(encoding="utf-8"))
        committed_count = golden["row_count"]

        # Determine which directory the fixture lives in.
        phase_f_path = FIXTURES_DIR / f"{stem}.draft.html"
        conformance_path = CONFORMANCE_DIR / f"{stem}.html" if CONFORMANCE_DIR.exists() else None

        if phase_f_path.exists():
            fixture_path = phase_f_path
        elif conformance_path and conformance_path.exists():
            fixture_path = conformance_path
        else:
            pytest.skip(f"Fixture file not found for {stem}")

        raw_html = fixture_path.read_text(encoding="utf-8")
        from ledger.declare_input import declare_input
        rows = declare_input(raw_html, stem)

        assert len(rows) >= committed_count, (
            f"COUNT-FLOOR FAIL: {stem} row_count dropped from {committed_count} "
            f"to {len(rows)}. A shrinking ledger is the exact failure F2 exists to catch."
        )


# ---------------------------------------------------------------------------
# SF-4 (b): Named properties from *.expected.md auto-covered for all phase-f
# ---------------------------------------------------------------------------

def _parse_expected_md_properties(expected_md_path: Path) -> set[str]:
    """Parse a *.expected.md file and extract CSS property names from its tables.

    The expected.md tables have rows like:
        | `.sgs-media__image { max-width: 640px }` | `maxWidth` | ...

    We extract the CSS property name from the first column (the CSS source cell).
    Pattern: look for `{ <property>: ` inside backtick-fenced table cells.

    Returns a set of lower-cased property names mentioned in the table.
    """
    import re as _re
    text = expected_md_path.read_text(encoding="utf-8")
    # Match CSS property names inside table cells of form:
    # `...{ property: value }...`
    props: set[str] = set()
    for match in _re.finditer(r'\{\s*([\w-]+)\s*:', text):
        props.add(match.group(1).lower())
    return props


# Collect all (stem, property) pairs from phase-f *.expected.md files.
_EXPECTED_MD_FILES = sorted(FIXTURES_DIR.glob("*.expected.md"))


def _all_expected_md_properties() -> list[tuple[str, str]]:
    """Return [(stem, property), ...] for every property named in any phase-f expected.md."""
    pairs: list[tuple[str, str]] = []
    for expected_md in _EXPECTED_MD_FILES:
        stem = expected_md.stem.removesuffix(".expected")
        props = _parse_expected_md_properties(expected_md)
        for prop in sorted(props):
            pairs.append((stem, prop))
    return pairs


_EXPECTED_MD_PARAM_IDS = [f"{s}::{p}" for s, p in _all_expected_md_properties()]
_EXPECTED_MD_PARAMS = _all_expected_md_properties()


class TestExpectedMdPropertiesParametrised:
    """SF-4(b): Every property named in a phase-f *.expected.md must be present in
    the declare_input output.  Adding a new fixture + expected.md is auto-covered
    without editing this test class.
    """

    @pytest.mark.parametrize("stem,prop", _EXPECTED_MD_PARAMS, ids=_EXPECTED_MD_PARAM_IDS)
    def test_property_in_declare_input(self, stem: str, prop: str):
        """Property named in expected.md must appear in at least one declare_input row."""
        fixture_path = FIXTURES_DIR / f"{stem}.draft.html"
        if not fixture_path.exists():
            pytest.skip(f"No fixture file for {stem}")

        raw_html = fixture_path.read_text(encoding="utf-8")
        from ledger.declare_input import declare_input
        rows = declare_input(raw_html, stem)
        props_found = {r.property for r in rows}
        assert prop in props_found, (
            f"{stem}: property {prop!r} named in {stem}.expected.md is missing "
            f"from declare_input output. Found: {sorted(props_found)}"
        )


# ---------------------------------------------------------------------------
# MF-1: Empty-value declaration captured, empty-property-name raises
# ---------------------------------------------------------------------------

class TestMF1EmptyValue:
    """MF-1 — empty VALUE is captured (not dropped); empty PROPERTY NAME raises."""

    def test_empty_value_declaration_captured(self):
        """A declaration with an empty value (e.g. 'color: ;') must be captured
        with value='' rather than silently dropped.

        The ledger records; the gate (F4/F5) decides whether it counts.
        Silently dropping it would make the ledger miss a declaration.
        """
        from ledger.declare_input import declare_input

        # tinycss2 parses `color: ;` as a declaration with an empty value.
        html = "<style>.foo { color: ; }</style>"
        rows = declare_input(html, "test-mf1-empty-value")
        color_rows = [r for r in rows if r.property == "color" and r.selector == ".foo"]
        assert color_rows, (
            "Expected a row for 'color: ;' with value='', but no row was emitted. "
            "MF-1: empty-value declarations must be captured, not silently dropped."
        )
        assert color_rows[0].value == "", (
            f"Expected value='' for 'color: ;', got {color_rows[0].value!r}"
        )

    def test_empty_value_inline_style_captured(self):
        """Empty-value declaration in inline style must also be captured."""
        from ledger.declare_input import declare_input

        html = '<div style="color: ;"></div>'
        rows = declare_input(html, "test-mf1-inline-empty-value")
        inline_rows = [r for r in rows if r.property == "color"]
        assert inline_rows, (
            "Expected a row for inline 'color: ;' with value='', but no row was emitted."
        )
        assert inline_rows[0].value == "", (
            f"Expected value='' for inline 'color: ;', got {inline_rows[0].value!r}"
        )


# ---------------------------------------------------------------------------
# MF-2: Nested @supports+@media context preserved in media field
# ---------------------------------------------------------------------------

class TestMF2NestedMediaStack:
    """MF-2 — nested @supports+@media serialises full stack into media field."""

    def test_nested_supports_inside_media(self):
        """@supports nested inside @media: media field must contain both conditions
        joined by ' && ' in outer→inner order.  Tier must still derive from the
        @media condition only.
        """
        from ledger.declare_input import declare_input

        html = """
        <style>
        @media (max-width: 767px) {
            @supports (display: grid) {
                .foo { color: red; }
            }
        }
        </style>
        """
        rows = declare_input(html, "test-mf2-nested")
        foo_rows = [r for r in rows if r.selector == ".foo"]
        assert foo_rows, "No .foo rows found in nested @supports+@media fixture"

        row = foo_rows[0]
        # The media field must contain both conditions.
        assert "(max-width: 767px)" in row.media, (
            f"Outer @media condition missing from media field: {row.media!r}"
        )
        assert "(display: grid)" in row.media, (
            f"Inner @supports condition missing from media field: {row.media!r}"
        )
        assert "&&" in row.media, (
            f"Expected ' && ' separator in nested media field, got: {row.media!r}"
        )

    def test_nested_stack_tier_still_uses_media_condition(self):
        """Tier must derive from the @media condition, not the full concatenated string."""
        from ledger.declare_input import declare_input

        html = """
        <style>
        @media (max-width: 767px) {
            @supports (display: grid) {
                .foo { color: red; }
            }
        }
        </style>
        """
        rows = declare_input(html, "test-mf2-tier")
        foo_rows = [r for r in rows if r.selector == ".foo"]
        assert foo_rows
        # 767px is a canonical Mobile threshold → tier must be Mobile.
        assert foo_rows[0].tier == "Mobile", (
            f"Expected tier=Mobile for 767px @media condition, got {foo_rows[0].tier!r}"
        )

    def test_non_nested_single_level_unchanged(self):
        """Single-level @media still returns just that condition (no regression)."""
        from ledger.declare_input import declare_input

        html = "<style>@media (max-width: 767px) { .foo { color: red; } }</style>"
        rows = declare_input(html, "test-mf2-single")
        foo_rows = [r for r in rows if r.selector == ".foo"]
        assert foo_rows
        row = foo_rows[0]
        assert row.media == "(max-width: 767px)", (
            f"Single-level @media condition changed: {row.media!r}"
        )
        assert "&&" not in (row.media or ""), (
            "Single-level @media must not contain ' && ' separator"
        )


# ---------------------------------------------------------------------------
# MF-3: at-rule inside declaration list raises LedgerParseError
# ---------------------------------------------------------------------------

class TestMF3AtRuleInDeclarationList:
    """MF-3 — an at-rule inside a declaration body raises LedgerParseError."""

    def test_at_rule_inside_declaration_raises(self):
        """An @media (or any at-rule) nested directly inside a qualified-rule body
        must raise LedgerParseError (fail-closed), not be silently skipped.
        """
        from ledger import LedgerParseError
        from ledger.declare_input import declare_input

        # This is syntactically invalid CSS — an @media nested inside a selector body.
        # tinycss2 may parse it as an at-rule token inside the declaration list.
        html = "<style>.foo { @media (max-width: 767px) { color: red; } }</style>"
        with pytest.raises(LedgerParseError):
            declare_input(html, "test-mf3-at-rule-in-decl")


# ---------------------------------------------------------------------------
# SF-1: Blockless @media/@supports raises LedgerParseError
# ---------------------------------------------------------------------------

class TestSF1BlocklessAtRule:
    """SF-1 — blockless @media/@supports raises rather than being silently skipped."""

    def test_blockless_media_raises(self):
        """A bare '@media (max-width: 767px);' with no block body must raise."""
        from ledger import LedgerParseError
        from ledger.declare_input import declare_input

        # tinycss2 represents a blockless @media as an at-rule node with content=None.
        # The spec says raise, not skip.
        html = "<style>@media (max-width: 767px); .foo { color: red; }</style>"
        with pytest.raises(LedgerParseError, match="has no content block"):
            declare_input(html, "test-sf1-blockless-media")

    def test_blockless_supports_raises(self):
        """A bare '@supports (display: grid);' with no block must raise."""
        from ledger import LedgerParseError
        from ledger.declare_input import declare_input

        html = "<style>@supports (display: grid); .foo { color: red; }</style>"
        with pytest.raises(LedgerParseError, match="has no content block"):
            declare_input(html, "test-sf1-blockless-supports")

    def test_media_with_block_does_not_raise(self):
        """Normal @media with block must still work (no regression)."""
        from ledger.declare_input import declare_input

        html = "<style>@media (max-width: 767px) { .foo { color: red; } }</style>"
        rows = declare_input(html, "test-sf1-normal-media")
        assert rows, "Expected rows from @media with block"


# ---------------------------------------------------------------------------
# Content-stream chrome scoping — root-only, matching converter/entry.py's
# SKIP_TOP_LEVEL_TAGS semantics (fix, 2026-07-05). A nested <header>/<footer>/
# <nav> INSIDE a section (e.g. a testimonial attribution block, an in-page
# mini-nav) is CONTENT, never chrome — only a header/footer/nav that IS the
# document root or a direct child of <body> is chrome.
# ---------------------------------------------------------------------------

class TestContentChromeRootOnly:
    def test_top_level_footer_is_still_chrome_excluded(self):
        """A footer that's a direct child of <body> (page-level chrome) must
        still be excluded_candidate=True — no regression on the real case."""
        from ledger.declare_input import declare_content

        html = "<html><body><footer><p>copyright footer text</p></footer></body></html>"
        rows = declare_content(html, "test-top-level-footer")
        text_rows = [r for r in rows if r.value == "copyright footer text"]
        assert text_rows, "Expected a content-text row for the footer's paragraph"
        assert text_rows[0].excluded_candidate is True, (
            "Top-level (body-child) footer text must remain chrome-excluded"
        )

    def test_nested_footer_inside_section_is_declared_not_excluded(self):
        """A block-local <footer> nested inside a <section> (e.g. testimonial
        attribution) is CONTENT — it must be DECLARED (excluded_candidate=False),
        not silently bucketed as chrome-excluded. This is the bug: the old
        _chrome_depth counter incremented on ANY header/footer/nav at ANY
        nesting depth, mis-bucketing this as a gate blind-spot."""
        from ledger.declare_input import declare_content

        html = (
            "<html><body>"
            "<section class=\"sgs-testimonial\">"
            "<p class=\"sgs-testimonial__quote\">Great service.</p>"
            "<footer class=\"sgs-testimonial__attribution\">Jane Doe, London</footer>"
            "</section>"
            "</body></html>"
        )
        rows = declare_content(html, "test-nested-footer")
        text_rows = [r for r in rows if r.value == "Jane Doe, London"]
        assert text_rows, "Expected a content-text row for the nested footer's text"
        assert text_rows[0].excluded_candidate is False, (
            "A block-local <footer> nested inside a section must be DECLARED "
            "(content), not chrome-excluded — only page-level (body-child) "
            "header/footer/nav is chrome (converter/entry.py root-only semantics)."
        )

    def test_nested_nav_inside_section_is_declared_not_excluded(self):
        """Same fix, for a block-local <nav> (e.g. an in-page mini pagination nav)."""
        from ledger.declare_input import declare_content

        html = (
            "<html><body>"
            "<section class=\"sgs-blog-list\">"
            "<nav class=\"sgs-blog-list__pagination\">Next page</nav>"
            "</section>"
            "</body></html>"
        )
        rows = declare_content(html, "test-nested-nav")
        text_rows = [r for r in rows if r.value == "Next page"]
        assert text_rows, "Expected a content-text row for the nested nav's text"
        assert text_rows[0].excluded_candidate is False, (
            "A block-local <nav> nested inside a section must be DECLARED, not chrome-excluded"
        )

    def test_content_inside_top_level_header_still_excluded(self):
        """Content nested inside a genuinely top-level (body-child) <header> must
        still be chrome-excluded — the fix scopes chrome to root-only, but
        everything nested WITHIN a real chrome root is still chrome."""
        from ledger.declare_input import declare_content

        html = (
            "<html><body>"
            "<header class=\"sgs-header\"><nav><a href=\"#\">Home</a></nav></header>"
            "</body></html>"
        )
        rows = declare_content(html, "test-header-nested-nav-still-chrome")
        text_rows = [r for r in rows if r.value == "Home"]
        assert text_rows, "Expected a content-text row for the nav link text"
        assert text_rows[0].excluded_candidate is True, (
            "A <nav> nested inside a genuinely top-level <header> must still be "
            "chrome-excluded (chrome_depth propagates to descendants of a real root)"
        )


# ---------------------------------------------------------------------------
# SF-2: Spoofed @import host rejected
# ---------------------------------------------------------------------------

class TestSF2ImportHostCheck:
    """SF-2 — @import allow-list is checked against the extracted HOST only."""

    def test_spoofed_query_param_blocked(self):
        """An @import whose path references fonts.googleapis.com only in the query
        string (not the host) must raise LedgerParseError.

        e.g. @import url('/evil.css?ref=fonts.googleapis.com')
        """
        from ledger import LedgerParseError
        from ledger.declare_input import declare_input

        html = "<style>@import url('/evil.css?ref=fonts.googleapis.com');</style>"
        with pytest.raises(LedgerParseError, match="@import outside font CDN"):
            declare_input(html, "test-sf2-spoofed-query")

    def test_spoofed_path_segment_blocked(self):
        """An @import whose path contains fonts.googleapis.com as a path segment
        (not the host) must raise LedgerParseError.
        """
        from ledger import LedgerParseError
        from ledger.declare_input import declare_input

        html = "<style>@import url('https://evil.com/fonts.googleapis.com/css');</style>"
        with pytest.raises(LedgerParseError, match="@import outside font CDN"):
            declare_input(html, "test-sf2-spoofed-path")

    def test_real_google_fonts_still_allowed(self):
        """A genuine Google Fonts URL (host = fonts.googleapis.com) must still pass."""
        from ledger.declare_input import declare_input

        html = "<style>@import url('https://fonts.googleapis.com/css2?family=Inter');</style>"
        rows = declare_input(html, "test-sf2-real-google-fonts")
        assert any(r.kind.value == "at-import" for r in rows), (
            "Genuine Google Fonts @import must be captured, not rejected"
        )
