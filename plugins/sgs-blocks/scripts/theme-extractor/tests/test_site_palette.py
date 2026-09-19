"""Spec 33 declared-design overlay (site_palette): one unit test per step, synthetic inputs only.

Run:  cd plugins/sgs-blocks/scripts && python -m pytest theme-extractor/tests/test_site_palette.py -q
"""
from __future__ import annotations

import copy
import json
import pathlib
import sys

import pytest

HERE = pathlib.Path(__file__).resolve().parent
PKG = HERE.parent
sys.path.insert(0, str(PKG))

import palette_refs  # noqa: E402
import site_palette as sp  # noqa: E402
import usage_census  # noqa: E402


def _base_snap() -> dict:
    return {"settings": {
        "color": {"palette": [
            {"slug": "primary", "color": "#1F7A7A", "name": "Primary"},
            {"slug": "primary-text", "color": "#F1F5F9", "name": "Primary Text"},
            {"slug": "primary-dark", "color": "#0F4C4C", "name": "Primary Dark"},
            {"slug": "accent", "color": "#F59E0B", "name": "Accent"},
            {"slug": "accent-text", "color": "#92400E", "name": "Accent Text"},
            {"slug": "accent-light", "color": "#FEF3C7", "name": "Accent Light"},
            {"slug": "surface", "color": "#FAF9F6", "name": "Surface"},
            {"slug": "text", "color": "#1A202C", "name": "Text"},
            {"slug": "text-muted", "color": "#606D80", "name": "Text Muted"},
            {"slug": "border", "color": "#D4DBE5", "name": "Border"},
        ]},
        "layout": {"contentSize": "1200px", "wideSize": "1400px"},
        "custom": {"borderRadius": {"small": "4px", "medium": "8px", "large": "16px", "pill": "9999px"},
                   "buttonPresets": {"primary": {"background": "#141414", "text": "#faf8f5",
                                                 "border": "#141414", "hover-background": "#2a2a2a",
                                                 "hover-text": "#faf8f5", "border-width": "1px"}}},
    }}


def _html(uses: dict[str, dict[str, int]]) -> str:
    """A draft whose inline styles use each colour the stated number of times per property."""
    parts = []
    for colour, per_prop in uses.items():
        for prop, count in per_prop.items():
            parts += [f'<div style="{prop}:{colour}">x</div>'] * count
    return "<html><body>" + "".join(parts) + "</body></html>"


def _row(name: str, colour: str, use: str = "") -> dict:
    return {"name": name, "hexes": [colour], "value_raw": f"`{colour}`", "use": use}


def _run(rows, uses, variant_sets=None, facts=None, layout=None, snap=None):
    snap = snap or _base_snap()
    trace: list = []
    sp.apply_declared_design(snap, {"found": True, "colours": rows, "layout": layout or {}},
                             variant_sets or {}, usage_census.census_colours(_html(uses)), facts or {}, trace)
    return snap, trace


def _pal(snap) -> dict:
    return {e["slug"]: e for e in snap["settings"]["color"]["palette"]}


# ---- step 2: role mapping ------------------------------------------------------------------------

def test_role_table_maps_row_name_and_use_to_slugs():
    rows = [_row("Page background", "#FAF8F5", "Body, header, footer"),
            _row("Ink", "#141414", "Primary text, buttons"),
            _row("Body text", "#5E584F", "Paragraphs"),
            _row("Hairline", "#E6E1DA", "All borders")]
    uses = {"#FAF8F5": {"background": 3}, "#141414": {"color": 3, "background": 2},
            "#5E584F": {"color": 4}, "#E6E1DA": {"border-color": 5}}
    pal = _pal(_run(rows, uses)[0])
    assert (pal["surface"]["color"], pal["text"]["color"], pal["primary"]["color"]) == \
        ("#FAF8F5", "#141414", "#141414")
    assert pal["text-muted"]["color"] == "#5E584F" and pal["border"]["color"] == "#E6E1DA"
    assert all(pal[s]["_source"] == "declared" for s in ("surface", "text", "primary", "border"))


def test_ink_on_dark_is_not_mistaken_for_ink_and_muted_text_gets_a_new_slug():
    rows = [_row("Ink on dark", "#FAF8F5", "Text on #141414"), _row("Muted text", "#77716A", "Spec labels")]
    snap, _ = _run(rows, {"#FAF8F5": {"color": 2}, "#77716A": {"color": 2}})
    pal = _pal(snap)
    assert pal["primary-text"]["color"] == pal["text-inverse"]["color"] == "#FAF8F5"
    assert pal["primary"]["color"] == "#1F7A7A"  # 'ink' never fired for the on-dark row
    assert pal["text-label"] == {"slug": "text-label", "color": "#77716A", "name": "Text Label",
                                 "_source": "declared"}


@pytest.mark.parametrize("name,use", [("Faint text", "Captions"), ("Image placeholder", "Empty areas"),
                                      ("Google blue", "Review buttons"), ("Ordered in", "Stock dot")])
def test_skip_table_rows_never_reach_the_palette_and_are_logged(name, use):
    snap, trace = _run([_row(name, "#ABCDEF", use)], {"#ABCDEF": {"color": 30}})
    assert "#ABCDEF" not in {e["color"] for e in snap["settings"]["color"]["palette"]}
    assert any(t["kind"] == "skip" and t.get("what") == name for t in trace)


def test_declared_colour_never_used_is_skipped_with_a_reason():
    snap, trace = _run([_row("Hairline", "#E6E1DA", "borders")], {"#111111": {"color": 2}})
    assert _pal(snap)["border"]["color"] == "#D4DBE5"
    assert any("declared but never used" in t["reason"] for t in trace)


def test_colour_used_across_unrelated_families_is_skipped():
    rows = [_row("Hairline", "#E6E1DA", "borders")]
    snap, trace = _run(rows, {"#E6E1DA": {"border-color": 2, "color": 6}})
    assert _pal(snap)["border"]["color"] == "#D4DBE5"
    assert any("used across families" in t["reason"] for t in trace)


def test_contested_slug_first_row_wins_and_second_is_logged():
    rows = [_row("Hairline", "#E6E1DA", "borders"), _row("Divider", "#D0D0D0", "rules")]
    snap, trace = _run(rows, {"#E6E1DA": {"border-color": 3}, "#D0D0D0": {"border-color": 3}})
    assert _pal(snap)["border"]["color"] == "#E6E1DA"
    assert any("first row wins" in t["reason"] for t in trace)


def test_a_hex_named_by_two_rows_is_validated_per_row_not_by_the_union_of_their_families():
    """`#FAF8F5` is both "Page background" (background) and "Ink on dark" (text). Used only as text, the
    background row has no use in its OWN families, so it must not earn the surface slug."""
    rows = [_row("Page background", "#FAF8F5", "Body"), _row("Ink on dark", "#FAF8F5", "Text on dark")]
    snap, trace = _run(rows, {"#FAF8F5": {"color": 3}})
    pal = _pal(snap)
    assert pal["surface"]["color"] == "#FAF9F6"                       # untouched: no background use
    assert pal["text-inverse"]["color"] == pal["primary-text"]["color"] == "#FAF8F5"
    assert any(t["kind"] == "skip" and t["what"] == "Page background" and "own families" in t["reason"]
               for t in trace)
    declared = next(t for t in trace if t["kind"] == "declared" and t["what"] == "palette.text-inverse")
    assert "3 of 3 uses" in declared["reason"] and "text 3" in declared["reason"]


def test_a_hex_used_in_each_rows_own_family_earns_both_slugs():
    rows = [_row("Page background", "#FAF8F5", "Body"), _row("Ink on dark", "#FAF8F5", "Text on dark")]
    snap, trace = _run(rows, {"#FAF8F5": {"background": 1, "color": 5}})    # a single use is enough
    pal = _pal(snap)
    assert pal["surface"]["color"] == pal["text-inverse"]["color"] == "#FAF8F5"
    assert any("1 of 6 uses" in t["reason"] for t in trace if t["what"] == "palette.surface")


# ---- step 3: overlay -------------------------------------------------------------------------------

def test_overlay_keeps_base_order_appends_new_slugs_sorted_and_derives_primary_dark():
    rows = [_row("Ink", "#141414", "Primary text"), _row("Muted text", "#77716A", "labels")]
    snap, _ = _run(rows, {"#141414": {"color": 2}, "#77716A": {"color": 2}})
    slugs = [e["slug"] for e in snap["settings"]["color"]["palette"]]
    assert slugs == [e["slug"] for e in _base_snap()["settings"]["color"]["palette"]] + ["text-label"]
    pal = _pal(snap)
    assert pal["primary-dark"]["_source"] == "derived" and pal["primary-dark"]["color"] == "#0F0F0F"
    assert pal["accent"] == _pal(_base_snap())["accent"]  # untouched base entry


def test_no_overlay_no_primary_dark_change_when_primary_is_not_declared():
    snap, _ = _run([_row("Hairline", "#E6E1DA", "borders")], {"#E6E1DA": {"border-color": 3}})
    assert _pal(snap)["primary-dark"]["color"] == "#0F4C4C"


def test_slug_by_hex_prefers_page_slugs_when_hexes_collide():
    pal = [{"slug": "primary", "color": "#141414"}, {"slug": "surface", "color": "#FAF8F5"},
           {"slug": "text", "color": "#141414"}, {"slug": "text-inverse", "color": "#FAF8F5"}]
    assert palette_refs.slug_by_hex(pal) == {"#141414": "text", "#faf8f5": "surface"}


def test_every_overlaid_base_slug_carries_the_base_themes_hex():
    rows = [_row("Ink", "#141414", "Primary text"), _row("Muted text", "#77716A", "labels")]
    snap, _ = _run(rows, {"#141414": {"color": 2}, "#77716A": {"color": 2}})
    base = {e["slug"]: e["color"] for e in _base_snap()["settings"]["color"]["palette"]}
    pal = _pal(snap)
    for slug in ("primary", "text", "primary-dark"):                  # declared x2 + derived
        assert pal[slug]["_baseline_color"] == base[slug]
    assert "_baseline_color" not in pal["text-label"]                 # a new slug has no base to restore
    assert "_baseline_color" not in pal["accent"]                     # untouched base entry


def test_a_pass_b_entry_keeps_its_true_base_hex_when_a_declared_colour_replaces_it():
    snap = _base_snap()
    surface = next(e for e in snap["settings"]["color"]["palette"] if e["slug"] == "surface")
    surface.update({"color": "#eeeeee", "_source": "derived", "advisory": True, "_baseline_color": "#FAF9F6"})
    _snap, _ = _run([_row("Page background", "#FAF8F5", "Body")], {"#FAF8F5": {"background": 2}}, snap=snap)
    entry = _pal(snap)["surface"]
    assert (entry["color"], entry["_baseline_color"], entry["_source"]) == ("#FAF8F5", "#FAF9F6", "declared")
    assert "advisory" not in entry


def test_unconfirmed_accent_is_advisory_and_confirmed_accent_is_not():
    unconfirmed, trace = _run([], {}, VARIANTS)                       # no rendered custom property at all
    other_prop = {"customProps": [{"path": "html", "name": "--other", "value": "#123456"}]}
    still_unconfirmed, _ = _run([], {}, VARIANTS, other_prop)          # a property, but not an accent value
    confirmed, _ = _run([], {}, VARIANTS, {"customProps": [{"path": "html", "name": "--acc", "value": "#8A9A86"}]})
    for snap in (unconfirmed, still_unconfirmed):
        pal = _pal(snap)
        assert all(pal[s]["advisory"] is True and pal[s]["_baseline_color"] for s in sp.ACCENT_SLUGS)
    pal = _pal(confirmed)
    assert pal["accent"]["color"] == "#8A9A86"
    assert all("advisory" not in pal[s] and pal[s]["_baseline_color"] for s in sp.ACCENT_SLUGS)
    assert any("not confirmed" in t["reason"] for t in trace)


# ---- step 1 + 4: accent variant sets --------------------------------------------------------------

VARIANTS = {"accent": {"default": "taupe", "options": ["taupe", "sage"], "sets": {
    "taupe": {"acc": "#9C8B78", "ink": "#6F6152", "soft": "#EFEAE2"},
    "sage": {"acc": "#8A9A86", "ink": "#55654F", "soft": "#E8ECE6"}}}}


def test_accent_sets_written_sorted_and_default_is_active_without_rendered_evidence():
    snap, trace = _run([], {}, VARIANTS)
    sets = snap["settings"]["custom"]["accentSets"]
    assert list(sets) == ["sage", "taupe"] and list(sets["taupe"]) == ["accent", "accent-light", "accent-text"]
    pal = _pal(snap)
    assert (pal["accent"]["color"], pal["accent-text"]["color"], pal["accent-light"]["color"]) == \
        ("#9C8B78", "#6F6152", "#EFEAE2")
    assert any("declared default" in t["reason"] for t in trace)


def test_rendered_custom_property_beats_the_declared_default():
    facts = {"customProps": [{"path": "html>body", "name": "--acc", "value": "#8A9A86"}]}
    snap, trace = _run([], {}, VARIANTS, facts)
    assert _pal(snap)["accent"]["color"] == "#8A9A86"
    assert any("rendered custom property" in t["reason"] for t in trace)


def test_variant_set_without_its_default_option_is_skipped():
    broken = {"accent": dict(VARIANTS["accent"], default="missing")}
    snap, trace = _run([], {}, broken)
    assert "accentSets" not in snap["settings"]["custom"]
    assert any("default option's set is absent" in t["reason"] for t in trace)


def test_readme_accent_rows_yield_to_the_variant_set():
    rows = [_row("Accent", "#111111", "focus rings")]
    snap, trace = _run(rows, {"#111111": {"background": 3}}, VARIANTS)
    assert _pal(snap)["accent"]["color"] == "#9C8B78"
    assert any("supplied by the script variant set" in t["reason"] for t in trace)


# ---- steps 5 + 6: layout and radius ---------------------------------------------------------------

def test_content_width_lifts_wide_size_never_narrower():
    snap, _ = _run([], {}, layout={"max_content_width": "1440px"})
    assert snap["settings"]["layout"] == {"contentSize": "1440px", "wideSize": "1440px"}


def test_wider_base_wide_size_is_kept():
    snap, _ = _run([], {}, layout={"max_content_width": "1100px"})
    assert snap["settings"]["layout"] == {"contentSize": "1100px", "wideSize": "1400px"}


@pytest.mark.parametrize("text,square", [("`0` almost everywhere, pills 50%", True), ("0px", True),
                                         ("8px", False), ("0.5rem", False), ("", False)])
def test_square_radius_zeroes_only_small_medium_large(text, square):
    snap, _ = _run([], {}, layout={"border_radius": text})
    radius = snap["settings"]["custom"]["borderRadius"]
    assert radius["pill"] == "9999px"
    assert (radius["medium"] == "0px") is square
    assert (radius["small"] == radius["large"] == "0px") is square


# ---- step 7: button presets -----------------------------------------------------------------------

def test_button_hex_values_that_equal_a_palette_colour_become_variable_references():
    snap, _ = _run([_row("Ink", "#141414", "Primary text"), _row("Ink on dark", "#FAF8F5", "Text on dark")],
                   {"#141414": {"color": 2}, "#FAF8F5": {"color": 2}})
    trace: list = []
    measured = {"primary": dict(snap["settings"]["custom"]["buttonPresets"]["primary"])}
    palette_refs.tokenise_button_presets(snap, trace, measured)
    primary = snap["settings"]["custom"]["buttonPresets"]["primary"]
    assert primary["background"] == "var(--wp--preset--color--primary)"
    assert primary["text"] == "var(--wp--preset--color--primary-text)"
    assert primary["hover-text"] == "var(--wp--preset--color--primary-text)"
    assert primary["hover-background"] == "#2a2a2a"  # not a palette colour: stays literal
    assert primary["border-width"] == "1px" and trace and trace[0]["kind"] == "overlay"


def test_button_values_the_draft_did_not_measure_stay_as_the_baseline_has_them():
    snap, _ = _run([_row("Ink", "#141414", "Primary text"), _row("Ink on dark", "#FAF8F5", "Text on dark")],
                   {"#141414": {"color": 2}, "#FAF8F5": {"color": 2}})
    presets = snap["settings"]["custom"]["buttonPresets"]
    presets["primary"]["hover-border"] = "#141414"                # baseline value, key never measured
    presets["secondary"] = {"background": "#faf8f5", "text": "#141414"}  # baseline slot never measured
    measured = {"primary": {"background": "#141414", "text": "#faf8f5"}}
    trace: list = []
    palette_refs.tokenise_button_presets(snap, trace, measured)
    assert presets["primary"]["background"] == "var(--wp--preset--color--primary)"
    assert presets["primary"]["text"] == "var(--wp--preset--color--primary-text)"
    assert presets["primary"]["hover-border"] == "#141414"        # unmeasured key: literal baseline
    assert presets["secondary"] == {"background": "#faf8f5", "text": "#141414"}  # unmeasured slot
    assert trace[0]["value"] == "background=primary,text=primary-text"
    palette_refs.tokenise_button_presets(snap, [], {})
    assert presets["primary"]["hover-border"] == "#141414"


# ---- step 8: trace + determinism ------------------------------------------------------------------

def test_census_rejections_are_traced_for_colours_the_palette_did_not_take():
    rows = [_row("Hairline", "#E6E1DA", "borders")]
    _snap, trace = _run(rows, {"#E6E1DA": {"border-color": 3}, "#ABCDEF": {"color": 2}})
    assert any(t.get("value") == "#ABCDEF" and "below" in t["reason"] for t in trace)
    assert {t["kind"] for t in trace} <= {"declared", "skip", "overlay"}


def test_two_runs_are_byte_identical():
    rows = [_row("Ink", "#141414", "Primary text"), _row("Muted text", "#77716A", "labels")]
    uses = {"#141414": {"color": 2}, "#77716A": {"color": 2}, "#ABCDEF": {"color": 1}}
    outs = [json.dumps(_run(rows, uses, copy.deepcopy(VARIANTS), layout={"max_content_width": "1440px"}),
                       sort_keys=False) for _ in range(2)]
    assert outs[0] == outs[1]
