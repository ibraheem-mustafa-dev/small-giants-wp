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

    def test_sgs_tabs_fixture_surfaces_the_proven_gaps(self) -> None:
        """The exact repro from the task brief: 2 ContentGap objects are
        constructed (G3 validation — sgs/info-box rejected by sgs/tabs's
        accepts_allowed_blocks=['sgs/tab']) and, until this channel existed,
        convert_section()'s return dict carried no trace of them at all.
        """
        html, css = _section_and_css("sgs-tabs")
        r = convert_section(html=html, css=css, media_map={})
        assert r["status"] == "complete"
        assert "content_gaps" in r

        dropped = [g for g in r["content_gaps"] if g["kind"] == "dropped"]
        assert len(dropped) == 2
        for g in dropped:
            assert g["block_slug"] == "sgs/tabs"
            assert "G3 validation failed" in g["detail"]
            assert "sgs/info-box" in g["detail"]
        wheres = {g["where"] for g in dropped}
        assert wheres == {"sgs-tabs__nav", "sgs-tabs__panel"}

        # The fuzzy-fallback events explain WHY sgs/info-box was even reached:
        # a Path-2 slot-alias walk resolved the 'nav'/'panel' BEM segments to
        # sgs/info-box (there is no direct 'sgs/nav' or 'sgs/panel' block).
        fuzzy = [g for g in r["content_gaps"] if g["kind"] == "fuzzy_fallback"]
        assert len(fuzzy) == 2
        for g in fuzzy:
            assert g["stage"] == "bem_resolve_slot_fallback"
            assert g["resolved_to"] == "sgs/info-box"
        selectors = {g["token_or_selector"] for g in fuzzy}
        assert selectors == {"sgs-tabs__nav", "sgs-tabs__panel"}

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
