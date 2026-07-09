"""
test_button_preset_seed.py
==========================
Regression suite for the button preset COLOUR routing (assembly.py step 5b).

The button block is "preset-as-seed": `inheritStyle` is a data-label only — the
button paints entirely from its OWN colour attrs. When the converter detects a
preset modifier (`.sgs-button--secondary`), step 5b routes the preset's COLOURS
+ hover into the button's colour attrs so a cloned button paints the client's
real look (incl. hover, which the base CSS pass skips) instead of the block's
primary defaults.

Source of truth (2026-07-07): the CLIENT theme-snapshot
`settings.custom.buttonPresets` (per-client, faithful) via
`styling_helpers.button_preset_colour_attrs`. Fallback when the client has no
snapshot preset: the framework block.json variation seed via
`db_lookup.variation_attrs_for` (colours only). Both are runtime DATA (R-31-1),
no hardcoded dict.

Run from the canonical cwd plugins/sgs-blocks/scripts:
    python -m pytest converter/tests/test_button_preset_seed.py -q --import-mode=importlib
"""

from __future__ import annotations

from converter.db import db_lookup
from converter.services import styling_helpers


# ---------------------------------------------------------------------------
# variation_attrs_for — the FALLBACK accessor (framework block.json seed)
# ---------------------------------------------------------------------------

def test_variation_attrs_for_secondary_returns_dict():
    """A real button variation returns a dict. Tolerant: the seed may be {}
    (or minimal) if the DB isn't fully seeded in this environment; when
    non-empty it must carry inheritStyle == 'secondary'."""
    result = db_lookup.variation_attrs_for("sgs/button", "secondary")
    assert isinstance(result, dict)
    if result:
        assert result.get("inheritStyle") == "secondary"


def test_variation_attrs_for_nonexistent_returns_empty():
    assert db_lookup.variation_attrs_for("sgs/button", "nonexistent") == {}


def test_variation_attrs_for_empty_block_slug_returns_empty():
    assert db_lookup.variation_attrs_for("", "primary") == {}


# ---------------------------------------------------------------------------
# button_preset_colour_attrs — the PRIMARY source (client snapshot)
# ---------------------------------------------------------------------------

def _configure(preset_map):
    styling_helpers.configure_button_presets(preset_map)


def teardown_function():
    # Never leak a configured preset map into other tests / the global run.
    styling_helpers.reset_colour_resolution()


def test_snapshot_colours_map_var_to_slug():
    """A var(--wp--preset--color--X) value yields the bare slug X; base + hover
    colour roles map to the six SGS colour attrs; geometry keys are ignored."""
    _configure({
        "secondary": {
            "background": "transparent",
            "text": "var(--wp--preset--color--text)",
            "border": "var(--wp--preset--color--primary)",
            "hover-background": "var(--wp--preset--color--text)",
            "hover-text": "var(--wp--preset--color--text-inverse)",
            "hover-border": "var(--wp--preset--color--text)",
            "border-radius": "10px",      # geometry — must be ignored
            "padding": "14px 24px",       # geometry — must be ignored
            "font-size": "15px",          # geometry — must be ignored
        }
    })
    out = styling_helpers.button_preset_colour_attrs("secondary")
    assert out == {
        "colourBackground": "",              # 'transparent' → ''
        "colourText": "text",
        "colourBorder": "primary",
        "colourBackgroundHover": "text",
        "colourTextHover": "text-inverse",
        "colourBorderHover": "text",
    }, out


def test_snapshot_bare_var_and_hex_pass_through():
    """A bare var(--X) yields slug X; a raw hex passes through verbatim."""
    _configure({"primary": {"text": "var(--brand)", "background": "#E68A95"}})
    out = styling_helpers.button_preset_colour_attrs("primary")
    assert out["colourText"] == "brand"
    assert out["colourBackground"] == "#E68A95"


def test_snapshot_missing_variant_returns_empty():
    """No preset for the variant → {} (caller falls back to the framework seed)."""
    _configure({"primary": {"text": "var(--wp--preset--color--text)"}})
    assert styling_helpers.button_preset_colour_attrs("outline") == {}


def test_snapshot_unconfigured_returns_empty():
    """No client snapshot configured at all → {}."""
    styling_helpers.reset_colour_resolution()
    assert styling_helpers.button_preset_colour_attrs("primary") == {}


# ---------------------------------------------------------------------------
# step-5b WIRING: snapshot wins, framework seed is the fallback, overwrite
# ---------------------------------------------------------------------------

def test_step5b_snapshot_overwrites_and_fallback(monkeypatch):
    """Replicates assembly.py step 5b: the snapshot colour map is applied by
    OVERWRITE (the preset defines the button's colour identity); when the
    snapshot has no preset the framework variation seed (colours only) fills in.
    Mirrors the exact loop in assembly.py — kept in sync by hand."""
    _BTN_COLOUR_ATTRS = frozenset({
        "colourBackground", "colourText", "colourBorder",
        "colourBackgroundHover", "colourTextHover", "colourBorderHover",
    })

    # Case 1: snapshot present → overwrite even a pre-existing (default) value.
    _configure({"secondary": {"text": "var(--wp--preset--color--text)"}})
    attrs = {"inheritStyle": "secondary", "colourText": "text-inverse"}
    colour_attrs = styling_helpers.button_preset_colour_attrs(attrs["inheritStyle"])
    for k, v in colour_attrs.items():
        attrs[k] = v
    assert attrs["colourText"] == "text"  # snapshot overwrote the default

    # Case 2: snapshot absent for the variant → framework seed fallback (colours only).
    styling_helpers.reset_colour_resolution()
    monkeypatch.setattr(
        db_lookup, "variation_attrs_for",
        lambda slug, name: {"inheritStyle": "outline", "colourText": "text",
                            "colourBorder": "border-subtle", "fontWeight": "600"},
    )
    attrs2 = {"inheritStyle": "outline"}
    colour_attrs2 = styling_helpers.button_preset_colour_attrs(attrs2["inheritStyle"])
    if not colour_attrs2:
        seed = db_lookup.variation_attrs_for("sgs/button", attrs2["inheritStyle"])
        colour_attrs2 = {k: v for k, v in seed.items() if k in _BTN_COLOUR_ATTRS}
    for k, v in colour_attrs2.items():
        attrs2[k] = v
    assert attrs2["colourText"] == "text"
    assert attrs2["colourBorder"] == "border-subtle"
    assert "fontWeight" not in attrs2  # geometry/typography filtered out of the fallback
