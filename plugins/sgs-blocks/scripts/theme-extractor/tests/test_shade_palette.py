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


def test_brand_role_with_no_shade_is_a_review_row_and_status_keeps_the_framework_hex(tmp_path):
    snap, review, trace = run(tmp_path)
    roles = snap["settings"]["custom"]["colourRoles"]
    assert "border" in review and "border" not in roles, "never a framework default for a brand role"
    assert roles["success"] == "#2E7D4F" and roles["error-light"] == "#FEF2F2"
    assert any(r["kind"] == "review" and r["what"] == "colourRoles.border" for r in trace)


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
