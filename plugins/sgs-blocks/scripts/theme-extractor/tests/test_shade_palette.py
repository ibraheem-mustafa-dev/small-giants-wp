"""Spec 32 FR-32-28: the palette is the draft's own shades and the framework roles are pointers (shade_palette.py).

Run:  cd plugins/sgs-blocks/scripts/theme-extractor && python -m pytest tests/test_shade_palette.py -q

Browser-free: each case writes a small ``tokens/colors.css`` to a temp folder and runs ``shade_palette.apply`` on a
snapshot whose palette is the extractor's own proposal.
"""
from __future__ import annotations

import json
import pathlib
import sys

import pytest

PKG = pathlib.Path(__file__).resolve().parent.parent
REPO = PKG.parents[3]
sys.path.insert(0, str(PKG))

import shade_palette as sp  # noqa: E402
import token_files  # noqa: E402

BASELINE = json.loads((REPO / "theme" / "sgs-theme" / "theme.json").read_text(encoding="utf-8"))

CSS = """
:root{
  --zz-ink:#1E2A3C; --zz-paper:#FFFAF0; --zz-brand:#0A7EA8; --zz-glass:rgba(30,42,60,.3);
  --zz-grad:linear-gradient(90deg,#fff,#000);
  --social-linkedin:#0A66C2; --zz-instagram:radial-gradient(circle,#fff,#000); --wa:#25D366;
  --zz-text:var(--zz-ink); --zz-surface-page:var(--zz-paper); --zz-cta:var(--zz-brand);
  --zz-body-alias:var(--zz-text);
  --zz-link:var(--zz-body-alias);
}
"""


def draft(tmp_path: pathlib.Path, css: str = CSS) -> pathlib.Path:
    (tmp_path / "tokens").mkdir()
    (tmp_path / "tokens" / "colors.css").write_text(css, encoding="utf-8")
    return tmp_path


def run(tmp_path: pathlib.Path, palette_before=(), confirmed=None, css: str = CSS):
    d = draft(tmp_path, css)
    snap = {"settings": {"color": {"palette": list(palette_before)}}}
    trace: list = []
    review = sp.apply(snap, token_files.read_token_files(d), d, BASELINE, confirmed, trace)
    return snap, review, trace


def test_palette_is_the_drafts_shades_with_plain_names(tmp_path):
    snap, _review, _trace = run(tmp_path)
    palette = {e["slug"]: e for e in snap["settings"]["color"]["palette"]}
    assert list(palette) == ["zz-ink", "zz-paper", "zz-brand", "zz-glass"]
    assert palette["zz-ink"]["name"] == "Ink" and palette["zz-paper"]["color"] == "#FFFAF0"
    assert palette["zz-glass"]["color"] == "#1E2A3C4D"
    assert [g["slug"] for g in snap["settings"]["color"]["gradients"]] == ["zz-grad"]


def test_alias_tokens_are_no_entry_and_name_roles_through_the_chain(tmp_path):
    """MUST FAIL if an alias becomes an entry or a chain stops at its first hop."""
    snap, _review, _trace = run(tmp_path)
    slugs = {e["slug"] for e in snap["settings"]["color"]["palette"]}
    assert not slugs & {"zz-text", "zz-surface-page", "zz-cta", "zz-body-alias", "zz-link"}
    roles = snap["settings"]["custom"]["colourRoles"]
    assert roles["text"] == "zz-ink" and roles["surface"] == "zz-paper" and roles["primary"] == "zz-brand"
    assert roles["link"] == "zz-ink", "--zz-link -> --zz-body-alias -> --zz-text -> --zz-ink"


def test_third_party_brand_colours_are_no_entry(tmp_path):
    """MUST FAIL if a registry brand's token becomes a palette entry or gradient."""
    snap, _review, trace = run(tmp_path)
    slugs = {e["slug"] for e in snap["settings"]["color"]["palette"]}
    assert not slugs & {"social-linkedin", "wa"}
    assert "zz-instagram" not in {g["slug"] for g in snap["settings"]["color"]["gradients"]}
    skipped = {r["what"] for r in trace if r["kind"] == "gap"}
    assert {"tokens/*.css --social-linkedin", "tokens/*.css --wa", "tokens/*.css --zz-instagram"} <= skipped


def test_negative_control_a_non_brand_token_with_a_similar_name_stays(tmp_path):
    css = ":root{--waves:#112233;--a-b:#445566;--c-d:#778899;}"
    snap, _review, _trace = run(tmp_path, css=css)
    assert {e["slug"] for e in snap["settings"]["color"]["palette"]} == {"waves", "a-b", "c-d"}


def test_confirmed_mark_beats_alias_and_alias_beats_usage_proposal(tmp_path):
    proposal = [{"slug": "text", "color": "#FFFAF0", "_source": "derived"}]
    snap, _r, _t = run(tmp_path, palette_before=proposal)
    roles = snap["settings"]["custom"]["colourRoles"]
    assert roles["text"] == "zz-ink", "the draft's alias beats the usage proposal"
    assert roles["heading"] == "zz-ink", "heading follows text when nothing names it"
    (tmp_path / "b").mkdir()
    snap, _r, _t = run(tmp_path / "b", confirmed={"text": {"hex": "#0A7EA8", "tokens": ["--zz-brand"]}})
    assert snap["settings"]["custom"]["colourRoles"]["text"] == "zz-brand", "Bean's confirmed mark wins"


def test_status_role_keeps_the_framework_hex_and_no_role_is_left_without_a_value(tmp_path):
    snap, unresolved, trace = run(tmp_path)
    roles = snap["settings"]["custom"]["colourRoles"]
    assert roles["success"] == "#2E7D4F" and roles["error-light"] == "#FEF2F2"
    assert unresolved == [] and "border" in roles, "a role nothing names still renders as the draft does"
    assert not any(r["kind"] == "review" for r in trace), "no row ever asks anyone to pick a role"


READ_CSS = ":root{--zz-ink:#141414;--zz-paper:#FAF8F5;--zz-brand:#0A7EA8;--zz-hover:#2A2A2A;--zz-pink:#EE8088;--zz-pink-soft:#F9D5D3;--zz-text:var(--zz-ink);--zz-surface-page:var(--zz-paper);--zz-cta:var(--zz-brand);--zz-accent:var(--zz-pink);}"


def run_read(tmp_path, usage, presets=None, css=READ_CSS):
    """A draft folder at ``<tmp>/handoff`` with the intake's recorded usage at ``<tmp>/build/intake/palette.json``."""
    d = tmp_path / "handoff"
    (d / "tokens").mkdir(parents=True)
    (d / "tokens" / "colors.css").write_text(css, encoding="utf-8")
    (tmp_path / "build" / "intake").mkdir(parents=True)
    (tmp_path / "build" / "intake" / "palette.json").write_text(json.dumps({"usage": usage}), encoding="utf-8")
    snap = {"settings": {"color": {"palette": []}, "custom": {"buttonPresets": presets or {}}}}
    unresolved = sp.apply(snap, token_files.read_token_files(d), d, BASELINE, None, [])
    return snap["settings"]["custom"]["colourRoles"], unresolved


def row(hex_, prop, tag, count, length=0):
    return {"hex": hex_, "property": prop, "tag": tag, "count": count, "length": length}


def test_border_is_the_control_border_colour_and_border_light_the_lighter_divider():
    """MUST FAIL if either role falls back to a related role or a framework hex instead of the draft's own colour."""
    import tempfile
    usage = [row("#DCE3E9", "border-top-color", "input", 28), row("#DCE3E9", "border-top-color", "select", 8), row("#1E2A3C33", "border-top-color", "input", 99),
             row("#FFFFFF", "border-top-color", "div", 300, 90000), row("#EEF2F5", "border-top-color", "div", 2, 1952), row("#F3F4F6", "border-top-color", "figure", 52, 99999),
             row("#E8EAED", "border-top-color", "figure", 52, 4000), row("#E8EAED", "border-top-color", "div", 1, 1282)]
    with tempfile.TemporaryDirectory() as tmp:
        roles, unresolved = run_read(pathlib.Path(tmp), usage)
    assert roles["border"] == "#DCE3E9", "most used opaque control border; a translucent one never wins"
    assert roles["border-light"] == "#EEF2F5", "white is no divider, a figure is no divider element, and a colour mostly carried by a card (one div among 52 figures) is that card's border"
    assert unresolved == []


def test_border_light_renders_as_border_when_the_draft_shows_no_lighter_divider():
    import tempfile
    usage = [row("#DCE3E9", "border-top-color", "input", 28), row("#CCCCCC", "border-top-color", "div", 40, 5000)]
    with tempfile.TemporaryDirectory() as tmp:
        roles, _u = run_read(pathlib.Path(tmp), usage)
    assert roles["border-light"] == roles["border"] == "#DCE3E9"


def test_primary_dark_is_the_primary_buttons_hover_fill_and_equals_primary_when_it_keeps_its_fill():
    import tempfile
    with tempfile.TemporaryDirectory() as tmp:
        roles, _u = run_read(pathlib.Path(tmp), [], {"primary": {"hover-background": "#2a2a2a"}})
    assert roles["primary-dark"] == "zz-hover", "the hover fill is a token of the draft: the role points at its shade"
    with tempfile.TemporaryDirectory() as tmp:
        roles, _u = run_read(pathlib.Path(tmp), [], {"primary": {"hover-background": "var(--wp--preset--color--primary)"}})
    assert roles["primary-dark"] == roles["primary"] == "zz-brand"
    with tempfile.TemporaryDirectory() as tmp:
        roles, _u = run_read(pathlib.Path(tmp), [], {"primary": {"hover-background": "#123456"}})
    assert roles["primary-dark"] == "#123456", "a hover colour with no token holds the draft's raw hex"


def test_accent_light_is_the_most_used_pale_fill_in_the_accents_hue():
    import tempfile
    usage = [row("#F9D5D3", "background-color", "section", 111), row("#FCEBBE", "background-color", "a", 400), row("#E8505B", "background-color", "a", 50)]
    with tempfile.TemporaryDirectory() as tmp:
        roles, _u = run_read(pathlib.Path(tmp), usage)
    assert roles["accent-light"] == "zz-pink-soft", "a pale yellow in another hue and a darker pink do not qualify"


def test_shade_sharing_a_role_slug_that_points_elsewhere_is_suffixed(tmp_path):
    css = ":root{--surface-alt:#F3F0EB;--white:#FFFFFF;--ink:#141414;--card:var(--white);--surface-card:var(--white);}"
    snap, _r, _t = run(tmp_path, css=css)
    slugs = [e["slug"] for e in snap["settings"]["color"]["palette"]]
    assert "surface-alt-shade" in slugs and "surface-alt" not in slugs
    assert snap["settings"]["custom"]["colourRoles"]["surface-alt"] == "white"


def test_role_naming_its_own_shade_needs_no_map_key(tmp_path):
    css = ":root{--success:#1B7F43;--ink:#141414;--paper:#FAF8F5;}"
    snap, _r, _t = run(tmp_path, css=css)
    assert "success" not in snap["settings"]["custom"]["colourRoles"]
    assert "success" in {e["slug"] for e in snap["settings"]["color"]["palette"]}


def test_references_to_a_removed_slug_follow_the_shade_of_the_same_colour(tmp_path):
    before = [{"slug": "custom-zz-ink", "color": "#1E2A3C", "_source": "confirmed"}]
    d = draft(tmp_path)
    snap = {"settings": {"color": {"palette": before}}, "styles": {"color": {"text": "var:preset|color|custom-zz-ink"},
            "css": "a{color:var(--wp--preset--color--custom-zz-ink)}"}}
    sp.apply(snap, token_files.read_token_files(d), d, BASELINE, None, [])
    assert snap["styles"]["color"]["text"] == "var:preset|color|zz-ink"
    assert snap["styles"]["css"] == "a{color:var(--wp--preset--color--zz-ink)}"


def test_a_draft_with_no_colour_token_is_untouched(tmp_path):
    d = draft(tmp_path, ":root{--space:8px;}")
    snap = {"settings": {"color": {"palette": [{"slug": "primary", "color": "#111111"}]}}}
    assert sp.apply(snap, token_files.read_token_files(d), d, BASELINE, None, []) == []
    assert "custom" not in snap["settings"] and snap["settings"]["color"]["palette"][0]["slug"] == "primary"
