"""Spec 33 declared-design path: the gate between Pass A, Pass B and the declared design.

Run:  cd plugins/sgs-blocks/scripts && python -m pytest theme-extractor/tests/test_declared_path_gates.py -q

Facts come from the cached Eye Care measurement, so nothing here opens a browser or fetches a font.
"""
from __future__ import annotations

import json
import pathlib
import shutil
import sys

import pytest

HERE = pathlib.Path(__file__).resolve().parent
PKG = HERE.parent
REPO = PKG.parents[3]
sys.path.insert(0, str(PKG))
sys.path.insert(0, str(PKG.parent))

import extract  # noqa: E402

DRAFT_DIR = REPO / "sites" / "eye-care-ward-end" / "design_handoff_ward_end_eye_care"
DRAFT = DRAFT_DIR / "Eye Care Birmingham.dc.html"
FACTS = HERE / "fixtures" / "eye-care-computed-facts.json"
README_FIXTURE = HERE / "fixtures" / "declared-readme.md"
MAMAS = REPO / "sites" / "mamas-munches" / "mockups" / "homepage" / "index.html"
ACCENT_SLUGS = ("accent", "accent-light", "accent-text")


@pytest.fixture(autouse=True)
def _no_font_network(monkeypatch):
    monkeypatch.setattr(extract, "_self_host_google_font", lambda *a, **k: None)


def _baseline() -> dict:
    return json.loads((REPO / "theme" / "sgs-theme" / "theme.json").read_text(encoding="utf-8"))


def _eye_care(draft_dir: pathlib.Path) -> dict:
    html = DRAFT.read_text(encoding="utf-8")
    facts = json.loads(FACTS.read_text(encoding="utf-8"))
    return extract.build_snapshot("eye-care", extract.extract_css(html), facts, html, _baseline(), [], REPO,
                                  draft_dir=draft_dir)


def _palette(snap: dict) -> dict:
    return {e["slug"]: e for e in snap["settings"]["color"]["palette"]}


@pytest.fixture()
def draft_without_readme(tmp_path: pathlib.Path) -> pathlib.Path:
    shutil.copy(DRAFT, tmp_path / DRAFT.name)              # a copy of the draft folder, README left out
    assert not any(p.name.lower() == "readme.md" for p in tmp_path.iterdir())
    return tmp_path


def test_an_unreadable_readme_still_gets_pass_b_and_the_accent_sets(draft_without_readme):
    """The README parser found nothing, the script variant sets exist: Pass B must still run, and the
    declared accent is laid on top of it (it used to skip Pass B and keep the framework's teal ground)."""
    pal = _palette(_eye_care(draft_without_readme))
    base = {e["slug"]: e["color"] for e in _baseline()["settings"]["color"]["palette"]}
    for slug, colour in (("surface", "#FAF8F5"), ("text", "#141414")):
        assert pal[slug]["color"].upper() == colour
        assert pal[slug]["advisory"] is True and pal[slug]["_source"] == "derived"
        assert pal[slug]["_baseline_color"] == base[slug]
    for slug, colour in zip(ACCENT_SLUGS, ("#9C8B78", "#EFEAE2", "#6F6152")):
        assert pal[slug]["color"] == colour and pal[slug]["_source"] == "declared"
        assert "advisory" not in pal[slug]                    # confirmed by the rendered --acc
        assert pal[slug]["_baseline_color"] == base[slug]
    assert len(pal) == 21                                     # overlay only: nothing appended, none lost


def test_with_the_readme_present_the_declared_values_win_over_pass_b():
    pal = _palette(_eye_care(DRAFT_DIR))
    for slug in ("surface", "text"):
        assert pal[slug]["_source"] == "declared" and "advisory" not in pal[slug]
        assert pal[slug]["_baseline_color"]
    assert pal["surface"]["color"] == "#FAF8F5" and pal["text"]["color"] == "#141414"


def test_a_draft_with_root_tokens_ignores_a_readme_beside_it(tmp_path):
    """Pass A found the palette, so the declared design must not be applied: same bytes as no folder."""
    html = MAMAS.read_text(encoding="utf-8")
    facts = json.loads((PKG / "mamas-computed-facts.json").read_text(encoding="utf-8"))
    css = extract.extract_css(html)
    shutil.copy(README_FIXTURE, tmp_path / "README.md")     # a README with a real colour table
    plain = extract.build_snapshot("mamas-munches", css, facts, html, _baseline(), [], REPO)
    beside = extract.build_snapshot("mamas-munches", css, facts, html, _baseline(), [], REPO, draft_dir=tmp_path)
    assert json.dumps(plain) == json.dumps(beside)
    assert extract._declared_design(tmp_path, html, True) is None
    assert extract._declared_design(tmp_path, html, False) is not None   # the README alone WOULD apply
