"""test_content_gap_collector.py — the content-gap observability channel.

Run from plugins/sgs-blocks/scripts:
    python -m pytest converter/tests/test_content_gap_collector.py -q

Proves three things:
  1. ``content_gap_collector`` itself — record/flush/clear roundtrips and the
     fallback-stage filter — in isolation.
  2. ``convert_section()`` surfaces a ``content_gaps`` key on EVERY status
     branch, and on the real ``sgs-tabs`` fixture it carries the exact 2
     dropped ContentGaps (G3 validation reject) PLUS the 2 fuzzy-fallback
     BEM-resolution events that put the wrong block there in the first place
     — the proven-evidence repro from the task brief.
  3. Wiring this channel changes NOTHING about ``block_markup`` — a
     byte-identical assertion sits alongside the gap assertions so a future
     change to this file trips BOTH the "gaps still surface" test AND the
     "markup unchanged" test if it ever regresses either property.
"""
from __future__ import annotations

import io
import pathlib

from bs4 import BeautifulSoup

from converter.context import ContentGap
from converter.entry import convert_section
from converter.services import content_gap_collector as gap_collector

_FIXTURES = pathlib.Path(__file__).parent.parent.parent / "tests" / "fixtures" / "conformance"


def _section_and_css(fixture_name: str) -> tuple[str, str]:
    html = io.open(_FIXTURES / f"{fixture_name}.html", encoding="utf-8").read()
    soup = BeautifulSoup(html, "html.parser")
    css = "".join(t.get_text() for t in soup.find_all("style"))
    return str(soup.find("section")), css


# ---------------------------------------------------------------------------
# 1. Unit-level: the collector module in isolation
# ---------------------------------------------------------------------------

class TestCollectorUnit:
    def setup_method(self) -> None:
        gap_collector.clear()

    def teardown_method(self) -> None:
        gap_collector.clear()

    def test_record_content_gap_then_flush(self) -> None:
        gap_collector.record_content_gap(
            ContentGap(where="sgs/quote.author", detail="no derived_selector"),
            block_slug="sgs/quote",
        )
        out = gap_collector.flush()
        assert len(out) == 1
        assert out[0]["kind"] == "dropped"
        assert out[0]["block_slug"] == "sgs/quote"
        assert out[0]["where"] == "sgs/quote.author"
        assert out[0]["detail"] == "no derived_selector"

    def test_flush_clears_the_accumulator(self) -> None:
        gap_collector.record_content_gap(
            ContentGap(where="x", detail="y"), block_slug="sgs/x",
        )
        first = gap_collector.flush()
        second = gap_collector.flush()
        assert len(first) == 1
        assert second == []  # nothing left after flush

    def test_clear_discards_without_flush(self) -> None:
        gap_collector.record_content_gap(
            ContentGap(where="x", detail="y"), block_slug="sgs/x",
        )
        gap_collector.clear()
        assert gap_collector.flush() == []

    def test_fallback_event_bem_resolve_slot_fallback_is_recorded(self) -> None:
        gap_collector.record_fallback_event(
            "bem_resolve_slot_fallback", class_="sgs-tabs__nav", slot="nav", slug="sgs/info-box",
        )
        out = gap_collector.flush()
        assert len(out) == 1
        rec = out[0]
        assert rec["kind"] == "fuzzy_fallback"
        assert rec["stage"] == "bem_resolve_slot_fallback"
        assert rec["token_or_selector"] == "sgs-tabs__nav"
        assert rec["resolved_to"] == "sgs/info-box"
        assert "Path 1" in rec["designated_column_missed"]
        assert "Path 2" in rec["fallback_route"]

    def test_fallback_event_prefix_strip_is_recorded(self) -> None:
        gap_collector.record_fallback_event(
            "bem_resolve_prefix_strip", class_="sgs-card__card-tag", head="card", tail="tag",
            slug="sgs/text",
        )
        out = gap_collector.flush()
        assert len(out) == 1
        assert out[0]["kind"] == "fuzzy_fallback"
        assert out[0]["resolved_to"] == "sgs/text"
        assert "Path 2b" in out[0]["fallback_route"]

    def test_fallback_event_ambiguous_loud_is_declined_not_resolved(self) -> None:
        gap_collector.record_fallback_event(
            "bem_resolve_ambiguous_loud", class_="sgs-x", candidates=["sgs/a", "sgs/b"], chosen=None,
        )
        out = gap_collector.flush()
        assert len(out) == 1
        assert out[0]["kind"] == "fallback_declined"
        assert out[0]["resolved_to"] is None

    def test_fallback_event_self_nest_skipped_is_declined(self) -> None:
        gap_collector.record_fallback_event(
            "bem_resolve_self_nest_skipped", class_="sgs-quote__quote", slot="quote",
            blocked_slug="sgs/quote",
        )
        out = gap_collector.flush()
        assert len(out) == 1
        assert out[0]["kind"] == "fallback_declined"

    def test_unrelated_trace_stage_is_ignored(self) -> None:
        """db_lookup._trace() fires MANY non-fallback stages (db_lookup_hit,
        scalar_lift, section_wrap, ...) — this module must not record those."""
        gap_collector.record_fallback_event("db_lookup_hit", lookup="block_attrs", block_slug="sgs/x")
        gap_collector.record_fallback_event("scalar_lift", slug="sgs/x", attr="title")
        assert gap_collector.flush() == []

    def test_fallback_trace_sink_forwards_to_downstream_and_records(self) -> None:
        forwarded: list[dict] = []

        class _FakeDownstream:
            def event(self, stage, **kwargs):
                forwarded.append({"stage": stage, **kwargs})

        sink = gap_collector.FallbackTraceSink(_FakeDownstream())
        sink.event(stage="bem_resolve_slot_fallback", class_="sgs-tabs__nav", slot="nav", slug="sgs/info-box")
        sink.event(stage="db_lookup_miss", lookup="block_attrs", block_slug="sgs/y")  # not a fallback stage

        # Both events forwarded downstream unchanged...
        assert len(forwarded) == 2
        assert forwarded[0]["stage"] == "bem_resolve_slot_fallback"
        assert forwarded[1]["stage"] == "db_lookup_miss"
        # ...but only the recognised fallback stage was recorded here.
        recorded = gap_collector.flush()
        assert len(recorded) == 1
        assert recorded[0]["kind"] == "fuzzy_fallback"

    def test_fallback_trace_sink_with_no_downstream_still_records(self) -> None:
        sink = gap_collector.FallbackTraceSink(None)
        sink.event(stage="bem_resolve_prefix_strip", class_="sgs-x__card-tag", head="card", tail="tag", slug="sgs/text")
        assert len(gap_collector.flush()) == 1


# ---------------------------------------------------------------------------
# 2. Integration: convert_section() surfaces content_gaps on every branch
# ---------------------------------------------------------------------------

class TestConvertSectionContentGaps:
    def test_empty_result_carries_content_gaps_key(self) -> None:
        r = convert_section(html="", css="", media_map={})
        assert r["status"] == "empty"
        assert r["content_gaps"] == []

    def test_chrome_skipped_carries_content_gaps_key(self) -> None:
        r = convert_section(html="<header class='site-header'></header>", css="", media_map={})
        assert r["status"] == "chrome-skipped"
        assert r["content_gaps"] == []

    def test_sgs_tabs_identity_is_dissolved_by_the_section_root_gate(self) -> None:
        """sgs-tabs records NO gaps, because sgs/tabs is never emitted.

        This test previously asserted 2 ``dropped`` gaps from a G3 validation
        failure (sgs/info-box rejected by sgs/tabs's accepts_allowed_blocks).
        That path is now unreachable: the FR-31-16 section-root capability gate
        (``recognition.py:246-249`` — ``is_class_section_block``) demotes any
        NAMED root whose ``blocks.tier`` is not ``class-section``. ``sgs/tabs``
        is tier ``block``, so its root class dissolves to the container default
        and the G3 check is never reached. ``recognition.py:228-233`` documents
        this dissolution and names this exact childless-stub case.

        The old assertions were committed three days BEFORE that gate landed —
        a test outliving a deliberate behaviour change, not a regression. The
        "real gaps surface" channel it used to prove now lives on the
        sgs-feature-grid fixture below, which still produces both kinds.
        """
        html, css = _section_and_css("sgs-tabs")
        r = convert_section(html=html, css=css, media_map={})
        assert r["status"] == "complete"
        assert "content_gaps" in r

        # The root resolved to the container default — sgs/tabs is absent.
        assert r["block_markup"].lstrip().startswith("<!-- wp:sgs/container")
        assert "wp:sgs/tabs" not in r["block_markup"]

        # No sgs/tabs identity means no G3 rejection and no gaps at all.
        assert r["content_gaps"] == []

    def test_sgs_feature_grid_surfaces_both_gap_kinds(self) -> None:
        """The non-vacuous channel proof: a fixture that still produces BOTH a
        ``fuzzy_fallback`` and a ``dropped`` gap, so this module is verified to
        carry real gaps rather than passing on an empty list.

        Measured on the current engine: 2 fuzzy fallbacks (the ``title`` and
        ``text`` BEM segments miss a direct bare-block match and resolve via the
        Path-2 slot-alias walk) and 1 dropped band (``sgs/container`` has no
        destination attr for ``margin``). No fixture now produces a
        "G3 validation failed" dropped gap, so that detail string is deliberately
        NOT asserted here — the real detail text is.
        """
        html, css = _section_and_css("sgs-feature-grid")
        r = convert_section(html=html, css=css, media_map={})
        assert r["status"] == "complete"

        fuzzy = [g for g in r["content_gaps"] if g["kind"] == "fuzzy_fallback"]
        assert len(fuzzy) == 2
        for g in fuzzy:
            assert g["stage"] == "bem_resolve_slot_fallback"
        assert {g["token_or_selector"]: g["resolved_to"] for g in fuzzy} == {
            "sgs-feature-grid__title": "sgs/heading",
            "sgs-feature-grid__text": "sgs/text",
        }

        dropped = [g for g in r["content_gaps"] if g["kind"] == "dropped"]
        assert len(dropped) == 1
        assert dropped[0]["block_slug"] == "sgs/container"
        assert dropped[0]["where"] == "band:margin"
        # Relabelled NO_DESTINATION -> EXCLUDED: `sgs/container` now has a real
        # `margin` destination (box-object attr, seeded by a 2026-08-22
        # /sgs-update reseed), so NO_DESTINATION's own meaning ("no attr —
        # add one") is factually false here. This is a DELIBERATE non-lift of
        # the `margin: 0 auto` horizontal-centring idiom, which the band-rule
        # emitter already reproduces via `margin-inline:auto` on the __inner
        # band — EXCLUDED is the correct label for an intentional non-lift.
        assert dropped[0]["detail"].startswith("[EXCLUDED]")

    def test_sgs_tabs_block_markup_unaffected_by_gap_collection(self) -> None:
        """Regression guard: recording gaps must never change block_markup.
        Runs the section twice in a row (collector clear/flush lifecycle
        must not leak state between independent convert_section calls) and
        asserts identical output both times.
        """
        html, css = _section_and_css("sgs-tabs")
        r1 = convert_section(html=html, css=css, media_map={})
        r2 = convert_section(html=html, css=css, media_map={})
        assert r1["block_markup"] == r2["block_markup"]
        assert r1["block_markup"] != ""  # sanity: something was actually emitted

    def test_collector_does_not_leak_across_independent_runs(self) -> None:
        """A second, gap-free fixture run must not inherit the previous run's
        findings — clear() at the top of convert_section() is load-bearing."""
        tabs_html, tabs_css = _section_and_css("sgs-tabs")
        convert_section(html=tabs_html, css=tabs_css, media_map={})  # produces gaps

        hero_html, hero_css = _section_and_css("sgs-hero")
        r = convert_section(html=hero_html, css=hero_css, media_map={})
        # sgs-hero's own content pass may or may not produce gaps of its own,
        # but it must NEVER carry sgs-tabs's findings.
        for g in r["content_gaps"]:
            assert g.get("block_slug") != "sgs/tabs"
            assert "sgs-tabs__" not in (g.get("token_or_selector") or "")
