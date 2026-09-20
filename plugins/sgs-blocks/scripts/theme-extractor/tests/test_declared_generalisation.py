"""Spec 33 declared path generalises beyond one README's wording: one test per generalisation fix.

Run:  cd plugins/sgs-blocks/scripts && python -m pytest theme-extractor/tests/test_declared_generalisation.py -q

Every scenario goes through the public entry points (``read_readme_tokens`` and
``site_palette.apply_declared_design``), so each test fails on the code before the fix.
"""
from __future__ import annotations

import json
import pathlib
import sys

import pytest

HERE = pathlib.Path(__file__).resolve().parent
PKG = HERE.parent
sys.path.insert(0, str(PKG))
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(PKG.parent))

import declared_sources as ds  # noqa: E402
import site_palette as sp  # noqa: E402
import usage_census  # noqa: E402
from test_site_palette import _base_snap, _html, _pal  # noqa: E402


def _readme(tmp_path: pathlib.Path, text: str) -> dict:
    (tmp_path / "README.md").write_text(text, encoding="utf-8")
    return ds.read_readme_tokens(tmp_path)


def _apply(declared: dict, uses: dict, variant_sets=None, facts=None, snap=None):
    snap = snap or _base_snap()
    trace: list = []
    sp.apply_declared_design(snap, declared, variant_sets or {}, usage_census.census_colours(_html(uses)),
                             facts or {}, trace)
    return snap, trace


def _colour_declared(rows: list[tuple[str, str, str]], **extra) -> dict:
    return {"found": True, "layout": {}, **extra, "colours": [
        {"name": n, "hexes": [h], "value_raw": h, "use": u} for n, h, u in rows]}


# ---- 1. README colour tables: no column has to be called "Value" -----------------------------------

TABLES = {
    "colour-hex-role": "| Colour | Hex | Role |\n|---|---|---|\n| Canvas | `#FBF9F4` | Page behind everything |\n",
    "token-colour-description": "| Token | Colour | Description |\n|---|---|---|\n"
                                "| Canvas | `#FBF9F4` | Page behind everything |\n",
    "name-code-usage": "| Name | Code | Usage |\n|---|---|---|\n| Canvas | `#FBF9F4` | Page behind everything |\n",
    "no-leading-pipes": "Colour | Swatch | Role\n--- | --- | ---\nCanvas | `#FBF9F4` | Page behind everything\n",
    "hex-first-column": "| Hex | Colour | Role |\n|---|---|---|\n| `#FBF9F4` | Canvas | Page behind everything |\n",
}


@pytest.mark.parametrize("table", sorted(TABLES))
def test_colour_table_is_read_whatever_its_column_wording(tmp_path, table):
    out = _readme(tmp_path, "## Design tokens\n\n" + TABLES[table])
    assert [(r["name"], r["hexes"], r["use"]) for r in out["colours"]] == \
        [("Canvas", ["#FBF9F4"], "Page behind everything")]
    assert out["unreadable_tables"] == 0 and out["rows_without_hex"] == []


def test_role_text_falls_back_to_every_remaining_cell_when_no_column_is_use_like(tmp_path):
    out = _readme(tmp_path, "| Colour | Hex | Where | Extra |\n|---|---|---|---|\n"
                            "| Canvas | `#FBF9F4` | Behind pages | Body |\n")
    assert out["colours"][0]["use"] == "Behind pages Body"


def test_a_table_without_any_hex_is_not_a_colour_table(tmp_path):
    out = _readme(tmp_path, "| Route | Purpose |\n|---|---|\n| `/` | Home |\n")
    assert out["colours"] == [] and out["unreadable_tables"] == 0


def test_rows_without_a_hex_are_reported_and_become_a_trace_gap(tmp_path):
    out = _readme(tmp_path, "| Colour | Hex | Role |\n|---|---|---|\n| Canvas | `#FBF9F4` | Page |\n"
                            "| Sunrise | linear-gradient(red, gold) | Hero |\n")
    assert out["rows_without_hex"] == ["Sunrise"]
    _snap, trace = _apply(out, {"#FBF9F4": {"background": 2}})
    gap = [t for t in trace if t["kind"] == "gap"]
    assert len(gap) == 1 and "Sunrise" in gap[0]["reason"] and "cannot be mapped" in gap[0]["reason"]


def test_a_colour_table_that_yields_no_row_is_counted_and_becomes_a_trace_gap(tmp_path):
    # The name column sits beyond the only cells the rows carry, so no row can be built.
    out = _readme(tmp_path, "| Hex | Role | Note | Name |\n|---|---|---|---|\n| `#FBF9F4` | Page |\n")
    assert out["colours"] == [] and out["unreadable_tables"] == 1
    _snap, trace = _apply(out, {})
    assert any(t["kind"] == "gap" and "could not be read" in t["reason"] for t in trace)


def test_the_qc_rater_table_now_maps_roles_through_the_palette(tmp_path):
    out = _readme(tmp_path, "| Colour | Hex | Role |\n|---|---|---|\n| Line | `#E4DFD7` | Dividers and hairline gaps |\n"
                            "| Text soft | `#605A52` | Running paragraphs |\n")
    snap, _ = _apply(out, {"#E4DFD7": {"border-color": 5}, "#605A52": {"color": 5}})
    pal = _pal(snap)
    assert (pal["border"]["color"], pal["text-muted"]["color"]) == ("#E4DFD7", "#605A52")


# ---- 2. accent variant sets: any inner key names, an option may lack a role -------------------------

def _sets(**options) -> dict:
    return {"mood": {"default": next(iter(options)), "options": list(options), "sets": options}}


def test_variant_inner_keys_map_through_the_synonym_table():
    snap, trace = _apply(_colour_declared([]), {}, _sets(
        clay={"main": "#B4552F", "dark": "#7C3A1F", "tint": "#F6E9E1"},
        moss={"main": "#4E6B4A", "dark": "#33482F", "tint": "#E7EDE5"}))
    pal = _pal(snap)
    assert (pal["accent"]["color"], pal["accent-text"]["color"], pal["accent-light"]["color"]) == \
        ("#B4552F", "#7C3A1F", "#F6E9E1")
    assert snap["settings"]["custom"]["accentSets"]["moss"]["accent"] == "#4E6B4A"
    assert not [t for t in trace if t["kind"] == "skip" and "variant set" in t["what"]]


def test_an_option_missing_a_role_is_accepted_and_each_unmapped_key_is_traced():
    snap, trace = _apply(_colour_declared([]), {}, _sets(
        clay={"brand": "#B4552F", "shade": "#7C3A1F", "wash": "#F6E9E1"}, moss={"brand": "#4E6B4A"}))
    sets = snap["settings"]["custom"]["accentSets"]
    assert sets["clay"] == {"accent": "#B4552F", "accent-light": "#F6E9E1"} and sets["moss"] == {"accent": "#4E6B4A"}
    unmapped = [t for t in trace if t["what"] == "variant set mood.clay.shade"]
    assert len(unmapped) == 1 and "left unmapped" in unmapped[0]["reason"] and unmapped[0]["value"] == "#7C3A1F"


def test_an_option_with_no_accent_role_is_left_out_with_a_reason_but_the_set_survives():
    snap, trace = _apply(_colour_declared([]), {}, _sets(clay={"main": "#B4552F"}, odd={"bg": "#EEEEEE"}))
    assert list(snap["settings"]["custom"]["accentSets"]) == ["clay"]
    assert any(t["what"] == "variant set mood.odd" and "no accent colour" in t["reason"] for t in trace)


def test_a_set_is_rejected_only_when_no_option_maps_an_accent_colour():
    snap, trace = _apply(_colour_declared([]), {}, _sets(a={"bg": "#EEEEEE", "fg": "#111111"},
                                                        b={"bg": "#DDDDDD"}))
    assert "accentSets" not in snap["settings"]["custom"]
    assert any(t["what"] == "variant set mood" and t["reason"] == "no option maps an accent colour" for t in trace)


# ---- 3. rounded corners ------------------------------------------------------------------------------

@pytest.mark.parametrize("text", [
    "# Tokens\n- Radius: `14px` on cards and buttons, deliberately rounded.\n",
    "# Tokens\n\nCards use border-radius: 14px throughout.\n",
    "# Tokens\n| Radius | `14px` on cards |\n|---|---|\n",
    "# Tokens\n- Corner radius: 14px\n",
])
def test_an_explicit_pixel_radius_sets_medium_only_and_is_traced(tmp_path, text):
    snap, trace = _apply(_readme(tmp_path, text), {})
    radius = snap["settings"]["custom"]["borderRadius"]
    assert radius == {"small": "4px", "medium": "14px", "large": "16px", "pill": "9999px"}
    assert any(t["what"] == "custom.borderRadius.medium" and t["value"] == "14px" for t in trace)


def test_a_square_radius_still_zeroes_small_medium_large(tmp_path):
    snap, _ = _apply(_readme(tmp_path, "# Tokens\n- Radius: `0` everywhere, pills 50%\n"), {})
    assert snap["settings"]["custom"]["borderRadius"] == {"small": "0px", "medium": "0px", "large": "0px",
                                                          "pill": "9999px"}


def test_no_radius_statement_writes_nothing_and_logs_nothing(tmp_path):
    snap, trace = _apply(_readme(tmp_path, "# Tokens\nJust some prose about the shop.\n"), {})
    assert snap["settings"]["custom"]["borderRadius"] == _base_snap()["settings"]["custom"]["borderRadius"]
    assert not [t for t in trace if "borderRadius" in t.get("what", "") or t["kind"] == "error"]


# ---- 4. computed wins (FR-33-1) ----------------------------------------------------------------------

SURFACE_TEXT_ROWS = [("Page background", "#FAF8F5", "Body"), ("Ink", "#141414", "Primary text")]
SURFACE_TEXT_USES = {"#FAF8F5": {"background": 3}, "#141414": {"color": 4}}


def test_a_readme_colour_the_rendered_page_contradicts_loses_to_the_computed_value():
    facts = {"body": {"backgroundColor": "rgb(240, 240, 240)", "color": "rgb(51, 51, 51)"}}
    snap, trace = _apply(_colour_declared(SURFACE_TEXT_ROWS), SURFACE_TEXT_USES, facts=facts)
    pal = _pal(snap)
    assert (pal["surface"]["color"], pal["text"]["color"]) == ("#F0F0F0", "#333333")
    rows = {t["what"]: t for t in trace if t["kind"] == "reconcile"}
    assert rows["palette.surface"]["declared"] == "#FAF8F5" and rows["palette.surface"]["computed"] == "#F0F0F0"
    assert rows["palette.text"]["declared"] == "#141414" and "computed value wins" in rows["palette.text"]["reason"]


def test_a_readme_colour_the_page_confirms_is_kept_exactly():
    facts = {"body": {"backgroundColor": "rgb(250, 248, 245)", "color": "rgb(20, 20, 20)"}}
    snap, trace = _apply(_colour_declared(SURFACE_TEXT_ROWS), SURFACE_TEXT_USES, facts=facts)
    assert (_pal(snap)["surface"]["color"], _pal(snap)["text"]["color"]) == ("#FAF8F5", "#141414")
    assert not [t for t in trace if t["kind"] == "reconcile"]


def test_the_content_background_is_the_widest_content_section_not_blindly_the_body():
    facts = {"body": {"backgroundColor": "rgb(0, 0, 0)", "color": "rgb(20, 20, 20)"}, "sections": [
        {"path": "html>body", "backgroundColor": "rgb(0, 0, 0)", "area": 10, "hasParagraph": True},
        {"path": "main", "backgroundColor": "rgb(250, 248, 245)", "area": 500, "hasParagraph": True}],
        "previewShellMarkers": [{"path": "html>body"}]}
    snap, trace = _apply(_colour_declared(SURFACE_TEXT_ROWS), SURFACE_TEXT_USES, facts=facts)
    assert _pal(snap)["surface"]["color"] == "#FAF8F5" and not [t for t in trace if t["kind"] == "reconcile"]


def test_content_background_matches_extract_theme_background_on_real_facts():
    import declared_reconcile
    import extract
    fixtures = [HERE / "fixtures" / "eye-care-computed-facts.json", PKG / "mamas-computed-facts.json"]
    for path in fixtures:
        facts = json.loads(path.read_text(encoding="utf-8"))
        assert declared_reconcile.content_background(facts) == extract._hex(extract._theme_background(facts, [])).upper()


# ---- 5. primary from the measured button, not from a README word ------------------------------------

def _button(background: str, text: str, count: int = 4) -> dict:
    return {"classKey": f"sig:{background}", "classes": [], "ancestorClasses": [], "count": count, "textLen": 12,
            "w": 180, "h": 46, "rest": {"backgroundColor": background, "color": text, "borderTopColor": background,
                                         "borderTopWidth": "0px", "borderTopLeftRadius": "4px"}, "hover": {}}


def test_the_measured_primary_button_beats_a_readme_ink_row_claiming_primary():
    facts = {"buttons": [_button("rgb(180, 85, 47)", "rgb(255, 255, 255)")]}
    snap, trace = _apply(_colour_declared([("Ink (buttons)", "#1A1A1A", "Primary text, buttons")]),
                         {"#1A1A1A": {"color": 5}}, facts=facts)
    pal = _pal(snap)
    assert (pal["primary"]["color"], pal["primary-text"]["color"]) == ("#B4552F", "#FFFFFF")
    assert pal["text"]["color"] == "#1A1A1A"                      # the Ink row still maps to text
    assert pal["primary-dark"]["color"] != _pal(_base_snap())["primary-dark"]["color"]   # from the FINAL primary
    assert any(t["kind"] == "reconcile" and t["what"] == "palette.primary" and "#1A1A1A" in t["reason"]
               for t in trace)


def test_without_a_measured_button_the_readme_phrase_mapping_still_gives_primary():
    snap, _ = _apply(_colour_declared([("Ink (buttons)", "#1A1A1A", "Primary text, buttons")]),
                     {"#1A1A1A": {"color": 5}}, facts={"buttons": []})
    assert _pal(snap)["primary"]["color"] == "#1A1A1A"


def test_a_brand_status_button_is_never_the_measured_primary():
    facts = {"buttons": [_button("rgb(37, 211, 102)", "rgb(11, 43, 23)", count=9)]}
    snap = _base_snap()
    snap["settings"]["color"]["palette"].append({"slug": "whatsapp", "color": "#25D366", "name": "WhatsApp"})
    out, _ = _apply(_colour_declared([("Ink", "#1A1A1A", "Primary text, buttons")]),
                    {"#1A1A1A": {"color": 5}}, facts=facts, snap=snap)
    assert _pal(out)["primary"]["color"] == "#1A1A1A"


def test_eye_care_still_gets_primary_141414_and_primary_text_faf8f5():
    import test_declared_path_integration as integration
    pal = integration._palette(integration._eye_care())
    assert (pal["primary"]["color"], pal["primary-text"]["color"]) == ("#141414", "#FAF8F5")


# ---- 6. usage-proposed fallback roles (advisory) ------------------------------------------------------

NEUTRAL_ROWS = [("Canvas", "#FBF9F4", "Behind everything"), ("Text strong", "#1A1A1A", "Headlines and lead copy"),
                ("Text soft", "#605A52", "Secondary copy"), ("Line", "#E4DFD7", "Rules and separators"),
                ("Ghost", "#A8A296", "Disabled controls")]
NEUTRAL_USES = {"#FBF9F4": {"background": 31}, "#1A1A1A": {"color": 41}, "#605A52": {"color": 35},
                "#E4DFD7": {"border-color": 74}, "#A8A296": {"color": 40}, "#FFFFFF": {"background": 12, "color": 10}}


def test_neutral_wording_still_fills_the_neutral_slots_as_advisory_proposals():
    snap, trace = _apply(_colour_declared(NEUTRAL_ROWS), NEUTRAL_USES)
    pal, base = _pal(snap), _pal(_base_snap())
    proposed = {"surface": "#FBF9F4", "text": "#1A1A1A", "text-muted": "#605A52", "border": "#E4DFD7"}
    for slug, colour in proposed.items():
        entry = pal[slug]
        assert (entry["color"], entry["_source"], entry["advisory"], entry["confidence"]) == \
            (colour, "derived", True, 0.5)
        assert entry["_baseline_color"] == base[slug]["color"]
        assert any(t["kind"] == "derive" and t["what"] == f"palette.{slug}" and t["value"] == colour for t in trace)
    assert "#A8A296" not in {e["color"] for e in pal.values()}     # placeholder-tier: never proposed
    assert set(base) <= set(pal)                                    # no base slug lost


def test_a_slot_a_phrase_filled_is_never_proposed_again():
    rows = NEUTRAL_ROWS + [("Body text", "#605A52", "Paragraphs")]
    snap, trace = _apply(_colour_declared(rows), NEUTRAL_USES)
    entry = _pal(snap)["text-muted"]
    assert entry["_source"] == "declared" and "advisory" not in entry
    assert not [t for t in trace if t["kind"] == "derive" and t["what"] == "palette.text-muted"]


def test_no_readme_table_and_no_variant_set_proposes_nothing():
    snap, trace = _apply({"found": True, "colours": [], "layout": {}}, NEUTRAL_USES)
    assert _pal(snap) == _pal(_base_snap()) and not [t for t in trace if t["kind"] == "derive"]


def test_an_earlier_advisory_guess_in_a_slot_is_not_overwritten():
    snap = _base_snap()
    surface = next(e for e in snap["settings"]["color"]["palette"] if e["slug"] == "surface")
    surface.update({"color": "#EEEEEE", "_source": "derived", "advisory": True, "_baseline_color": "#FAF9F6"})
    out, _ = _apply(_colour_declared(NEUTRAL_ROWS), NEUTRAL_USES, snap=snap)
    assert _pal(out)["surface"]["color"] == "#EEEEEE"


def test_a_wash_or_tinted_row_maps_to_accent_light_by_phrase():
    snap, _ = _apply(_colour_declared([("Brand wash", "#F6E9E1", "Tinted fills behind brand content")]),
                     {"#F6E9E1": {"background": 9}})
    assert _pal(snap)["accent-light"]["color"] == "#F6E9E1"
