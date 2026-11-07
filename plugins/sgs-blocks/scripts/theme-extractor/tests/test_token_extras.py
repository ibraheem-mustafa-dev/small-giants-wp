"""Shadow roles, selection pair and README alt colours reach a snapshot (token_extras.py).

Run:  cd plugins/sgs-blocks/scripts/theme-extractor && python -m pytest tests/test_token_extras.py -q
"""
from __future__ import annotations

import copy
import json
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parent))
import token_extras as te  # noqa: E402
import token_files  # noqa: E402

REPO = HERE.parents[3]
BASELINE = json.loads((REPO / "theme" / "sgs-theme" / "theme.json").read_text(encoding="utf-8"))

HTML = '<div style="color:#0A6E93;background:#25D366;border:1px solid #D8CA50">x</div>'
README = """## Design Tokens
Colours
- Brand gold `#D8CA50`; alt `#0A6E93` (text on gold)
- Social: WhatsApp `#25D366`, LinkedIn `#0A66C2`
Typography
- Headings `#123456`
"""


def folder(tmp_path, spacing="", colours="", readme=README):
    t = tmp_path / "tokens"
    t.mkdir()
    (t / "spacing.css").write_text(spacing or ":root{--gap-1:8px}", encoding="utf-8")
    (t / "colors.css").write_text(colours or ":root{--brand-gold:#D8CA50}", encoding="utf-8")
    (tmp_path / "README.md").write_text(readme, encoding="utf-8")
    return tmp_path


def run(tmp_path, **kw):
    d = folder(tmp_path, **kw)
    snap = copy.deepcopy(BASELINE)
    snap["settings"]["color"]["palette"] = [{"slug": "brand-gold", "color": "#D8CA50", "name": "Gold"}]
    import usage_census
    done = te.apply(snap, token_files.read_token_files(d), d, usage_census.census_colours(HTML), [])
    return snap, done


def test_draft_roles_are_produced(tmp_path):
    snap, done = run(tmp_path, spacing=":root{--shadow-card:0 20px 34px -20px rgba(44,62,80,.55);--shadow-button:0 8px 18px -8px rgba(0,0,0,.45)}",
                     colours=":root{--brand-gold:#D8CA50;--ink:#1E2A3C;--selection-bg:var(--brand-gold);--selection-fg:var(--ink)}")
    presets = {p["slug"]: p["shadow"] for p in snap["settings"]["shadow"]["presets"]}
    assert presets["card"] == "0 20px 34px -20px rgba(44,62,80,.55)" and presets["button"].startswith("0 8px")
    assert {"whisper", "soft", "diffuse"} <= set(presets)
    assert snap["settings"]["custom"]["selection"] == {"background": "var(--wp--preset--color--brand-gold)", "colour": "#1E2A3C"}
    assert "custom-0a6e93" in [e["slug"] for e in snap["settings"]["color"]["palette"]]


def test_draft_without_them_changes_nothing(tmp_path):
    before = copy.deepcopy(BASELINE)
    before["settings"]["color"]["palette"] = [{"slug": "brand-gold", "color": "#D8CA50", "name": "Gold"}]
    snap, done = run(tmp_path, readme="## Notes\nNo colours here.\n")
    assert snap == before and done == {"shadow": [], "selection": False, "palette": [], "typeRoles": []}


def test_selection_needs_both_halves(tmp_path):
    snap, done = run(tmp_path, colours=":root{--brand-gold:#D8CA50;--selection-bg:#D8CA50}")
    assert not done["selection"] and "selection" not in snap["settings"].get("custom", {})


def test_brand_colour_takes_no_palette_entry(tmp_path):
    snap, done = run(tmp_path, colours=":root{--brand-gold:#D8CA50;--social-linkedin:#0A66C2;--whatsapp-green:#25D366}")
    hexes = {e["color"].upper() for e in snap["settings"]["color"]["palette"]}
    assert not hexes & {"#0A66C2", "#25D366"} and done["palette"] == ["custom-0a6e93"]


def test_type_roles_reach_custom_with_their_tracking(tmp_path):
    snap, done = run(tmp_path, spacing=":root{--fs-eyebrow:13px;--fs-nav:17px;--tracking-eyebrow:.14em;--fs-mono:12px;--tracking-mono:.14em}")
    assert snap["settings"]["custom"]["typeRoles"] == {"eyebrow": {"fontSize": "13px", "letterSpacing": ".14em"}, "nav": {"fontSize": "17px"}}
    assert done["typeRoles"] == ["eyebrow", "nav"]


def test_type_roles_negative_controls(tmp_path):
    snap, done = run(tmp_path, spacing=":root{--fs-eyebrow:var(--fs-body);--tracking-nav:.1em;--fs-other:15px}")
    assert "typeRoles" not in snap["settings"].get("custom", {}) and done["typeRoles"] == []
