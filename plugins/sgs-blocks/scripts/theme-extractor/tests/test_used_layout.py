"""FR-33-19: the site's contentSize / wideSize come from the draft's RENDERED content boxes.

Proven need on Eye Care: the README says "max width 1440px", but that is the PADDED section box. The
content sits 1336px wide in four home bands and 1440px wide in three (an inner div with no padding),
and SGS_Container_Wrapper applies contentSize to the content band, inside the section padding.

Two layers:
  * rule tests on hand-built census rows (no browser), each with a negative control;
  * real-browser tests that run layout-census.js on three fixture drafts at 1440 and 1920: two widths,
    no width at all, and a draft whose only max-width is on a card.

Run:  cd plugins/sgs-blocks/scripts && python -m pytest theme-extractor/tests/test_used_layout.py -q
"""
from __future__ import annotations

import json
import pathlib
import shutil
import subprocess
import sys

import pytest

HERE = pathlib.Path(__file__).resolve().parent
PKG = HERE.parent
sys.path.insert(0, str(PKG))

import used_layout  # noqa: E402

FIXTURES = HERE / "fixtures" / "layout"


def _cap(path, max_width, pad=0.0, content=None, own_text=False, offset=None, box="border-box"):
    mw = float(max_width)
    return {"path": path, "label": path, "ownText": own_text, "maxWidth": f"{max_width}px", "boxSizing": box,
            "paddingLeft": pad, "paddingRight": pad, "borderLeft": 0, "borderRight": 0,
            "offsetWidth": mw if offset is None else offset,
            "contentWidth": (mw - 2 * pad) if content is None else content, "contentX": 0}


def _band(path, caps, chains, chrome=False, text_count=3):
    return {"path": path, "label": path, "chrome": chrome, "text": path, "textCount": text_count,
            "caps": caps, "chains": [{"caps": c, "count": 1} for c in chains]}


def _census(*bands):
    return [{"viewport": 1920, "bands": list(bands)}]


NORMAL = _band("n", [_cap("n/sec", 1440, pad=52)], [[0]])
WIDE = _band("w", [_cap("w/div", 1440)], [[0]])


def test_most_common_width_is_content_and_the_recurring_wider_one_is_wide():
    out = used_layout.derive(_census(NORMAL, NORMAL, NORMAL, WIDE, WIDE))
    assert (out["contentSize"], out["wideSize"]) == (1336, 1440)


def test_a_wider_width_used_by_one_band_only_is_not_wide():
    out = used_layout.derive(_census(NORMAL, NORMAL, WIDE))
    assert (out["contentSize"], out["wideSize"]) == (1336, None)


def test_content_size_is_the_content_box_not_the_padded_box():
    out = used_layout.derive(_census(NORMAL))
    assert out["contentSize"] == 1336            # max-width 1440 minus 52px each side


def test_a_reading_measure_on_a_text_element_is_skipped_for_its_layout_ancestor():
    heading = _cap("h1", 700, own_text=True)                 # 700px measure on the heading itself
    band = _band("b", [heading, _cap("sec", 1200, pad=40)], [[0, 1]])
    assert used_layout.derive(_census(band))["contentSize"] == 1120
    control = _band("b", [_cap("h1", 700), _cap("sec", 1200, pad=40)], [[0, 1]])   # same box, not text
    assert used_layout.derive(_census(control))["contentSize"] == 700


def test_a_cap_that_does_not_bind_gives_way_to_the_ancestor_that_does():
    loose = _cap("div", 1440, pad=10, offset=996, content=976)   # inside a 1100px main: never reaches 1440
    main = _cap("main", 1100, pad=52)
    assert used_layout.derive(_census(_band("b", [loose, main], [[0, 1]])))["contentSize"] == 996


def test_a_cap_wider_than_the_viewport_is_full_width_not_a_viewport_sized_value():
    huge = _cap("div", 2400, offset=1920, content=1920)          # the viewport, not the cap, set its width
    assert used_layout.derive(_census(_band("b", [huge], [[0]])))["contentSize"] is None


def test_a_small_card_is_never_the_content_width():
    lone_card = _band("c", [_cap("card", 420, pad=24)], [[0]])
    assert used_layout.derive(_census(lone_card))["contentSize"] is None
    control = _band("c", [_cap("card", 820, pad=24)], [[0]])           # above the floor: counts
    assert used_layout.derive(_census(control))["contentSize"] == 772


def test_a_band_with_any_uncapped_text_is_full_width():
    band = _band("b", [_cap("card", 760, pad=24)], [[], [0]])           # heading uncapped, card capped
    out = used_layout.derive(_census(band))
    assert out["contentSize"] is None and "full width" in out["evidence"][0]["reason"]
    control = _band("b", [_cap("card", 760, pad=24)], [[0], [0]])
    assert used_layout.derive(_census(control))["contentSize"] == 712


def test_chrome_bands_do_not_vote():
    header = _band("header", [_cap("hdr", 1200, pad=24)], [[0]], chrome=True)
    assert used_layout.derive(_census(header, header, NORMAL))["contentSize"] == 1336
    assert used_layout.derive(_census(header))["contentSize"] is None


def test_apply_writes_both_keys_and_records_what_it_superseded():
    settings, trace = {"layout": {"contentSize": "1440px", "wideSize": "1440px"}}, []
    used_layout.apply_rendered_layout(settings, {"layoutCensus": _census(NORMAL, NORMAL, WIDE, WIDE)}, trace)
    assert settings["layout"] == {"contentSize": "1336px", "wideSize": "1440px"}
    assert trace[-1]["superseded"] == {"contentSize": "1440px", "wideSize": "1440px"}
    assert trace[-1]["_source"] == "rendered" and len(trace[-1]["evidence"]) == 4


def test_one_width_keeps_a_wider_existing_wide_size_and_raises_a_narrower_one():
    settings = {"layout": {"contentSize": "1200px", "wideSize": "1400px"}}
    used_layout.apply_rendered_layout(settings, {"layoutCensus": _census(NORMAL)}, [])
    assert settings["layout"] == {"contentSize": "1336px", "wideSize": "1400px"}
    wide_band = _band("w", [_cap("w", 1500)], [[0]])
    used_layout.apply_rendered_layout(settings, {"layoutCensus": _census(wide_band)}, [])
    assert settings["layout"] == {"contentSize": "1500px", "wideSize": "1500px"}


def test_no_census_and_no_width_write_nothing():
    for facts in ({}, {"layoutCensus": _census(_band("b", [], [[]]))}):
        settings, trace = {"layout": {"contentSize": "1200px", "wideSize": "1400px"}}, []
        used_layout.apply_rendered_layout(settings, facts, trace)
        assert settings["layout"] == {"contentSize": "1200px", "wideSize": "1400px"}
        assert trace[-1]["kind"] == "gap"


def test_derivation_is_deterministic():
    census = _census(WIDE, NORMAL, WIDE, NORMAL)
    assert json.dumps(used_layout.derive(census)) == json.dumps(used_layout.derive(census))
    assert used_layout.derive(census)["contentSize"] == 1336       # a tie goes to the narrower width


# ---- real browser: layout-census.js on the fixture drafts ----------------------------------------

HARNESS = r"""
const { chromium } = require('playwright');
const { pathToFileURL } = require('url');
const { LAYOUT_CENSUS_SRC } = require(process.argv[1]);
(async () => {
  const browser = await chromium.launch();
  const out = {};
  try {
    for (const file of process.argv.slice(2)) {
      const page = await (await browser.newContext({ deviceScaleFactor: 1 })).newPage();
      out[file] = [];
      for (const width of [1440, 1920]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(pathToFileURL(file).href);
        out[file].push(await page.evaluate('(' + LAYOUT_CENSUS_SRC.toString() + ')()'));
      }
    }
  } finally { await browser.close(); }
  process.stdout.write(JSON.stringify(out));
})();
"""


@pytest.fixture(scope="module")
def censuses() -> dict:
    node = shutil.which("node")
    if not node:
        pytest.skip("node is not on PATH")
    files = [str(FIXTURES / n) for n in ("two-widths.html", "no-width.html", "card-only.html")]
    proc = subprocess.run([node, "-e", HARNESS, str(PKG / "layout-census.js"), *files], capture_output=True,
                          text=True, encoding="utf-8", timeout=120, cwd=str(PKG.parent.parent))
    if proc.returncode != 0 and "Cannot find module 'playwright'" in proc.stderr:
        pytest.skip("playwright is not installed")
    assert proc.returncode == 0, proc.stderr
    return {pathlib.Path(k).name: v for k, v in json.loads(proc.stdout).items()}


def test_browser_two_widths_draft(censuses):
    out = used_layout.derive(censuses["two-widths.html"])
    assert (out["contentSize"], out["wideSize"]) == (1120, 1400)
    assert out["tally"] == {"1120": 3, "1400": 2}                   # ticker and chrome did not vote
    wide = next(r for r in out["evidence"] if r.get("contentWidth") == 1400)
    assert wide["at1440"]["width"] == 1360 and wide["at1920"] == {"x": 260, "width": 1400}


def test_browser_draft_with_no_max_width(censuses):
    assert used_layout.derive(censuses["no-width.html"])["contentSize"] is None


def test_browser_draft_whose_only_max_width_is_a_card(censuses):
    out = used_layout.derive(censuses["card-only.html"])
    assert out["contentSize"] is None
    assert [r["reason"].split(" (")[0] for r in out["evidence"]] == ["full width"] * 3
