"""test_draft_var_colour_resolution.py — P-DRAFT-CSSVAR.

A draft `var(--X)` colour that references a draft `:root` custom property (NOT a
WP theme token) must resolve to the concrete hex and snap to the theme palette
slug, so the clone emits a token WordPress can actually resolve — instead of the
proven ghost-button `var:preset|color|border` → currentColor bug.

Covers: draft-var → theme-token snap; existing wp-preset token untouched;
unmapped var degrades gracefully; feature inert without a configured palette;
the two map builders.
"""
from __future__ import annotations

import pytest

from converter.services import styling_helpers as sh
from converter.services.styling_helpers import (
    _colour_value_to_style,
    build_draft_root_colour_map,
    build_theme_palette_map,
    configure_colour_resolution,
    css_value_to_attr,
    extract_token_or_hex,
)

# Real Mama's Munches data (draft --border:#E8D5C0 → theme slug border-subtle).
_DRAFT_MAP = {"border": "#e8d5c0", "primary": "#e68a95"}
_PALETTE_MAP = {"#e8d5c0": "border-subtle", "#e68a95": "primary"}


@pytest.fixture(autouse=True)
def _reset_resolution():
    """Every test starts + ends with resolution cleared (no cross-test bleed)."""
    sh.reset_colour_resolution()
    yield
    sh.reset_colour_resolution()


def test_draft_var_snaps_to_theme_token():
    """var(--border) (draft :root prop) → var:preset|color|border-subtle."""
    configure_colour_resolution(_DRAFT_MAP, _PALETTE_MAP)
    assert _colour_value_to_style("var(--border)") == "var:preset|color|border-subtle"
    assert css_value_to_attr("var(--border)", "colour") == "var:preset|color|border-subtle"


def test_wp_preset_token_unchanged():
    """An existing WP theme token keeps its slug (never rewritten)."""
    configure_colour_resolution(_DRAFT_MAP, _PALETTE_MAP)
    assert _colour_value_to_style("var(--wp--preset--color--primary)") == "var:preset|color|primary"
    assert extract_token_or_hex("var(--wp--preset--color--primary)") == "primary"


def test_draft_var_also_covers_primary():
    """var(--primary) resolves via the :root map + palette to the primary slug."""
    configure_colour_resolution(_DRAFT_MAP, _PALETTE_MAP)
    assert _colour_value_to_style("var(--primary)") == "var:preset|color|primary"


def test_unmapped_var_degrades_gracefully():
    """var(--unknown) (not a draft :root prop) is left unchanged — prior behaviour."""
    configure_colour_resolution(_DRAFT_MAP, _PALETTE_MAP)
    assert _colour_value_to_style("var(--unknown)") == "var:preset|color|unknown"


def test_draft_var_without_palette_match_falls_to_hex():
    """A draft :root prop with no exact palette match → concrete hex literal."""
    configure_colour_resolution({"ghost": "#123456"}, _PALETTE_MAP)
    assert _colour_value_to_style("var(--ghost)") == "#123456"


def test_inert_without_configured_palette():
    """With no palette configured the feature is inert — behaviour-identical."""
    # No configure() call → maps empty.
    assert _colour_value_to_style("var(--border)") == "var:preset|color|border"
    assert _colour_value_to_style("var(--wp--preset--color--primary)") == "var:preset|color|primary"
    assert _colour_value_to_style("#E8D5C0") == "#E8D5C0"


def test_build_draft_root_colour_map():
    css = ":root { --primary:#E68A95; --border: #E8D5C0; --ref: var(--primary); }"
    m = build_draft_root_colour_map(css)
    assert m == {"primary": "#e68a95", "border": "#e8d5c0"}  # var() value skipped


def test_build_theme_palette_map():
    palette = [
        {"slug": "border-subtle", "color": "#E8D5C0"},
        {"slug": "primary", "color": "#E68A95"},
        {"slug": "client-alias", "color": "surface-pink"},  # non-hex → skipped
    ]
    m = build_theme_palette_map(palette)
    assert m == {"#e8d5c0": "border-subtle", "#e68a95": "primary"}
