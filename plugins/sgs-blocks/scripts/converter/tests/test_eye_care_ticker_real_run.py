"""test_eye_care_ticker_real_run.py -- the real Eye Care draft's ticker and brand strip through the real Stage-4 path.

Pins what the group-D converter work changed, on the real run artefacts (pipeline-state/, local and untracked,
so every test skips when the run directory is absent): the tagged mockup, the merged variation CSS and the
draft script's per-device bindings, exactly as ``sgs-clone-orchestrator.py`` hands them to
``converter.entry.convert_section``. The synthetic, draft-agnostic behaviour tests live beside this file
(test_marquee_lift.py, test_bare_svg_icon_lift.py, test_write_type_gate.py); this one exists so a converter
change that breaks the REAL draft shows up here.

Run from plugins/sgs-blocks/scripts:
    python -m pytest converter/tests/test_eye_care_ticker_real_run.py -q -p no:cacheprovider
"""
from __future__ import annotations

import json
import re
from pathlib import Path

import pytest
from bs4 import BeautifulSoup

from converter.entry import convert_section
from converter.services import content_gap_collector as gap_collector

REPO = Path(__file__).resolve().parents[5]
RUN = REPO / "pipeline-state" / "eye-care-ward-end-eye-care-birmingham-2026-09-21-024409"
needs_run = pytest.mark.skipif(
    not (RUN / "tagged-mockup.html").exists() or not (RUN / "script-bindings.json").exists(),
    reason="needs the local Eye Care run artefacts in pipeline-state",
)


@pytest.fixture(scope="module")
def draft():
    soup = BeautifulSoup((RUN / "tagged-mockup.html").read_text(encoding="utf-8"), "html.parser")
    css = "\n\n".join(t.get_text() for t in soup.find_all("style"))
    variation = RUN / "variation-d0-d2.css"
    if variation.exists() and variation.read_text(encoding="utf-8").strip():
        css += "\n\n/* variation CSS (G2 merge) */\n" + variation.read_text(encoding="utf-8")
    bindings = json.loads((RUN / "script-bindings.json").read_text(encoding="utf-8"))["resolved"]
    return soup, css, bindings


def _convert(draft, cls: str) -> dict:
    soup, css, bindings = draft
    gap_collector.clear()
    el = BeautifulSoup(str(soup.find(class_=cls)), "html.parser").find()
    del el["data-sgs-boundary-id"]
    return convert_section(html=str(el), css=css, media_map={}, boundary_id="b1", section_id="s1", tier_bindings=bindings)


def _block(result: dict, slug: str) -> dict:
    m = re.search(r"<!-- wp:sgs/%s (\{.*?\}) /?-->" % slug, result["block_markup"], re.S)
    assert m, result["block_markup"][:200]
    return json.loads(m.group(1))


@needs_run
def test_the_ticker_carries_its_marquee_icons_and_item_spacing(draft):
    t = _block(_convert(draft, "sgs-trust-bar"), "trust-bar")
    assert (t["autoScroll"], t["autoScrollBelow"], t["autoScrollDuration"]) == (True, 768, 30)
    assert "bgKenBurns" not in t                                             # the wrong route (F3)
    assert t["gap"] == {"desktop": "6px 32px", "mobile": "0"}                # the band's items gap
    assert t["itemGap"]["desktop"] == "9px"                                  # the badge's icon-to-label gap
    assert t["itemPadding"]["mobile"] == {"top": "0", "right": "20px", "bottom": "0", "left": "20px"}
    assert len(t["items"]) == 4 and all(i["iconSvg"].startswith("<svg") and i["label"] for i in t["items"])
    assert "sourceMode" not in t


@needs_run
def test_the_brand_strip_scrolls_and_reports_the_duration_it_cannot_carry(draft):
    result = _convert(draft, "sgs-brand-marquee")
    assert _block(result, "brand-strip")["scrolling"] is True
    rows = [g for g in result["content_gaps"] if g.get("where") == "sgs/brand-strip.marquee"]
    assert len(rows) == 1 and "64.0" in rows[0]["detail"] and "no marquee-duration attribute" in rows[0]["detail"]
