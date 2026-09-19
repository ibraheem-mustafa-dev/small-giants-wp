"""Spec 33 declared-design path, end to end through ``extract.build_snapshot`` (no browser, no network).

Run:  cd plugins/sgs-blocks/scripts && python -m pytest theme-extractor/tests/test_declared_path_integration.py -q

Facts come from ``fixtures/eye-care-computed-facts.json`` (measure.js run once against the real draft,
served over HTTP). ``extract._self_host_google_font`` is replaced so nothing is fetched or written.
"""
from __future__ import annotations

import json
import pathlib
import re
import sys

import pytest

HERE = pathlib.Path(__file__).resolve().parent
PKG = HERE.parent
REPO = PKG.parents[3]
sys.path.insert(0, str(PKG))
sys.path.insert(0, str(PKG.parent))

import extract  # noqa: E402
from schema_validate import validate_theme_json  # noqa: E402

DRAFT_DIR = REPO / "sites" / "eye-care-ward-end" / "design_handoff_ward_end_eye_care"
DRAFT = DRAFT_DIR / "Eye Care Birmingham.dc.html"
FACTS = HERE / "fixtures" / "eye-care-computed-facts.json"
MAMAS = REPO / "sites" / "mamas-munches" / "mockups" / "homepage" / "index.html"

EXPECTED = {"surface": "#FAF8F5", "surface-alt": "#FFFFFF", "text": "#141414", "text-inverse": "#FAF8F5",
            "primary": "#141414", "primary-text": "#FAF8F5", "text-muted": "#5E584F",
            "text-label": "#77716A", "border": "#E6E1DA", "accent": "#9C8B78", "accent-text": "#6F6152",
            "accent-light": "#EFEAE2", "success": "#1B7F43", "whatsapp": "#25D366"}
ABSENT = {"#8B8478", "#A39C90", "#6B655E", "#4A453E", "#F3F0EB", "#2B2721",
          "#1A73E8", "#FBBC04", "#DADCE0", "#E8EAED", "#202124", "#3C4043", "#5F6368", "#70757A"}


@pytest.fixture(autouse=True)
def _no_font_network(monkeypatch):
    monkeypatch.setattr(extract, "_self_host_google_font", lambda *a, **k: None)


def _baseline() -> dict:
    return json.loads((REPO / "theme" / "sgs-theme" / "theme.json").read_text(encoding="utf-8"))


def _eye_care(trace: list | None = None) -> dict:
    html = DRAFT.read_text(encoding="utf-8")
    facts = json.loads(FACTS.read_text(encoding="utf-8"))
    return extract.build_snapshot("eye-care", extract.extract_css(html), facts, html, _baseline(),
                                  [] if trace is None else trace, REPO, draft_dir=DRAFT_DIR)


def _palette(snap: dict) -> dict:
    return {e["slug"]: e for e in snap["settings"]["color"]["palette"]}


def test_fixture_carries_the_rendered_accent_custom_property():
    facts = json.loads(FACTS.read_text(encoding="utf-8"))
    assert {"path": "html>body>div>div>div", "name": "--acc", "value": "#9C8B78"} in facts["customProps"]


def test_palette_overlay_holds_the_declared_roles_and_drops_the_drifting_colours():
    snap = _eye_care()
    pal = _palette(snap)
    assert {slug: pal[slug]["color"] for slug in EXPECTED} == EXPECTED
    assert not ABSENT & {e["color"].upper() for e in pal.values()}
    base_slugs = [e["slug"] for e in _baseline()["settings"]["color"]["palette"]]
    assert len(base_slugs) == 21 and set(base_slugs) <= set(pal)
    assert [e["slug"] for e in snap["settings"]["color"]["palette"]][:21] == base_slugs  # base order kept
    assert pal["primary-dark"]["_source"] == "derived" and pal["primary-dark"]["color"] != "#0F4C4C"


def test_unmentioned_base_slugs_are_untouched():
    pal, base = _palette(_eye_care()), {e["slug"]: e for e in _baseline()["settings"]["color"]["palette"]}
    for slug in ("success-light", "error", "error-light", "info", "info-light", "border-light", "footer-bg"):
        assert pal[slug] == base[slug]


def test_accent_sets_layout_and_radius():
    settings = _eye_care()["settings"]
    sets = settings["custom"]["accentSets"]
    assert set(sets) == {"taupe", "sage", "navy"} and sets["navy"]["accent"] == "#3A4A6B"
    assert settings["layout"]["contentSize"] == "1440px"
    assert float(settings["layout"]["wideSize"].removesuffix("px")) >= 1440
    radius = settings["custom"]["borderRadius"]
    assert radius["medium"] == "0px" and radius["pill"] == "9999px"


def _resolve(value: str, palette: dict) -> str:
    """A ``var(--wp--preset--color--<slug>)`` reference resolved to that slug's palette hex."""
    m = re.fullmatch(r"var\(--wp--preset--color--([a-z0-9-]+)\)", value)
    return palette[m.group(1)]["color"].lower() if m else value.lower()


def test_styles_and_buttons_resolve_to_palette_slugs():
    trace: list = []
    snap = _eye_care(trace)
    assert snap["styles"]["color"] == {"background": "var:preset|color|surface", "text": "var:preset|color|text"}
    presets = snap["settings"]["custom"]["buttonPresets"]
    assert presets["primary"]["background"] == "var(--wp--preset--color--primary)"
    hexes = re.compile(r"^#[0-9a-fA-F]{6}$")
    palette_hexes = {e["color"].lower() for e in snap["settings"]["color"]["palette"]}
    baseline = _baseline()["settings"]["custom"]["buttonPresets"]
    merged = {t["what"].split(".", 1)[1]: set(t["overridden"].split(","))
              for t in trace if t.get("kind") == "merge" and t.get("what", "").startswith("buttonPresets.")}
    for slot, preset in presets.items():
        for key in ("background", "text", "border", "hover-background", "hover-text", "hover-border"):
            value = preset.get(key)
            if key in merged.get(slot, set()):      # measured in this run: palette hexes become references
                assert not (isinstance(value, str) and hexes.match(value) and value.lower() in palette_hexes)
            elif slot in baseline and key in baseline[slot]:   # not measured: exactly the baseline's value
                assert value == baseline[slot][key]


def test_measured_primary_hover_is_the_declared_2a2a2a():
    snap = _eye_care()
    palette = _palette(snap)
    primary = snap["settings"]["custom"]["buttonPresets"]["primary"]
    assert _resolve(primary["background"], palette) == "#141414"
    assert _resolve(primary["text"], palette) == "#faf8f5"
    assert primary["hover-background"].lower() == "#2a2a2a"   # settled value, not the mid-transition #252525
    assert primary["border-radius"] == "0px"


def test_schema_valid_and_two_runs_byte_identical():
    a = _eye_care()
    assert validate_theme_json(a)[0]
    dump = lambda snap: json.dumps(snap, indent=2, ensure_ascii=False)  # noqa: E731
    assert dump(a) == dump(_eye_care())
    t1, t2 = [], []
    _eye_care(t1), _eye_care(t2)
    assert json.dumps(t1) == json.dumps(t2)


def test_trace_explains_every_decision_kind():
    trace: list = []
    _eye_care(trace)
    assert {"declared", "skip", "overlay"} <= {t["kind"] for t in trace}
    reasons = " ".join(t.get("reason", "") for t in trace)
    assert "placeholder-tier" in reasons and "third-party widget" in reasons


# ---- identity: drafts without such declarations are unchanged --------------------------------------

def test_static_draft_with_a_root_palette_is_identical_with_or_without_draft_dir():
    html = MAMAS.read_text(encoding="utf-8")
    facts = json.loads((PKG / "mamas-computed-facts.json").read_text(encoding="utf-8"))
    css = extract.extract_css(html)
    plain = extract.build_snapshot("mamas-munches", css, facts, html, _baseline(), [], REPO)
    with_dir = extract.build_snapshot("mamas-munches", css, facts, html, _baseline(), [], REPO,
                                      draft_dir=MAMAS.parent)
    assert json.dumps(plain) == json.dumps(with_dir)


def test_readme_without_a_colour_table_and_no_variants_keeps_todays_behaviour(tmp_path):
    (tmp_path / "README.md").write_text("# Notes\n\nNothing about tokens here.\n", encoding="utf-8")
    html = "<html><head><style>body{margin:0}</style></head><body><p>hi</p></body></html>"
    facts = json.loads((PKG / "mamas-computed-facts.json").read_text(encoding="utf-8"))
    css = extract.extract_css(html)
    plain = extract.build_snapshot("x", css, facts, html, _baseline(), [], REPO)
    with_dir = extract.build_snapshot("x", css, facts, html, _baseline(), [], REPO, draft_dir=tmp_path)
    assert json.dumps(plain) == json.dumps(with_dir)
