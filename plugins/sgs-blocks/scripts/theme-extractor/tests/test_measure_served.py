"""measure.js reads a draft page served over HTTP, so the components it mounts are drawn and measured.

Run:  cd plugins/sgs-blocks/scripts && python -m pytest theme-extractor/tests/test_measure_served.py -q

The draft runtime fetches each ``<dc-import>`` component with fetch(), which a page opened from disk (file://) cannot
do, so a header, footer, button or field built as a component was missing from every measurement. The fixture page's
only heading, button and coloured band sit inside a mounted component. Skipped without node, Playwright or a draft
runtime (support.js) in the repo.
"""
from __future__ import annotations

import json
import pathlib
import shutil
import subprocess

import pytest

HERE = pathlib.Path(__file__).resolve().parent
PKG = HERE.parent
BLOCKS = PKG.parent.parent
REPO = BLOCKS.parent.parent
FIXTURES = HERE / "fixtures"
RUNTIME = REPO / "sites" / "mamas-munches-redesign" / "handoff" / "support.js"


def _measure(draft: pathlib.Path) -> dict:
    node = shutil.which("node")
    if not node:
        pytest.skip("node is not on PATH")
    if not (BLOCKS / "node_modules" / "playwright").is_dir():
        pytest.skip("Playwright is not installed under plugins/sgs-blocks/node_modules")
    proc = subprocess.run([node, str(PKG / "measure.js"), "--draft", str(draft)], cwd=str(BLOCKS),
                          capture_output=True, text=True, encoding="utf-8", timeout=180)
    if proc.returncode != 0 and "Executable doesn't exist" in proc.stderr:
        pytest.skip("Playwright's Chromium browser is not installed")
    assert proc.returncode == 0, proc.stderr
    return json.loads(proc.stdout)


@pytest.fixture()
def mounted_page(tmp_path) -> pathlib.Path:
    if not RUNTIME.is_file():
        pytest.skip("no Claude Design runtime (support.js) in the repo to mount the component with")
    folder = tmp_path / "export with spaces"
    shutil.copytree(FIXTURES / "mounted-page", folder)
    shutil.copy(RUNTIME, folder / "support.js")
    page = folder / "Mounted Page.dc.html"                  # a name with a space, as Indus and Eye Care have
    (folder / "Page.dc.html").rename(page)
    return page


def test_a_mounted_component_is_measured(mounted_page):
    facts = _measure(mounted_page)
    assert facts["headings"].get("h2", {}).get("fontSize") == "40px"
    button = next(b for b in facts["buttons"] if b["rest"]["backgroundColor"] == "rgb(255, 204, 0)")
    assert button["textLen"] == len("Start your order") and button["hover"] is not None
    assert any(s["backgroundColor"] == "rgb(51, 102, 170)" for s in facts["sections"])


def test_a_mounted_header_is_chrome_and_its_closed_drawer_is_not_measured(mounted_page):
    """A header drawn by a component comes first in the page: its button is keyed as chrome (never the call to
    action's representative), and the off-canvas drawer beside it (fixed, moved outside the window) is not seen."""
    import sys
    sys.path.insert(0, str(PKG))
    import presets

    facts = _measure(mounted_page.parent / "Chrome.dc.html")
    yellow = [b for b in facts["buttons"] if b["rest"]["backgroundColor"] == "rgb(255, 204, 0)"]
    assert {b["rest"]["fontSize"] for b in yellow} == {"17px", "14px"}       # no 13px drawer button
    chrome = next(b for b in yellow if b["inChrome"])
    assert chrome["classKey"].endswith("|chrome") and chrome["rest"]["fontSize"] == "14px"
    assert facts["headings"]["h2"]["fontSize"] == "36px"                       # not the drawer's heading
    assert presets.build_button_presets(facts, [])["primary"]["font-size"] == "17px"


def test_the_page_itself_is_still_measured(mounted_page):
    """Negative control: what the page draws itself is read as before (the body ground and its own paragraph)."""
    facts = _measure(mounted_page)
    assert facts["body"]["backgroundColor"] == "rgb(255, 250, 240)"
    assert any(p["textSample"].startswith("Everything that paints") for p in facts["paragraphs"])
