"""test_outer_box_shadow_layers.py — Task 4f-2: the converter carries a
multi-layer box-shadow as a shape list + colour list (not just a preset slug).

GROUND-TRUTH: spec=31 §13.1 R-31-1/R-31-9; design=`.claude/reports/
2026-09-21-u1-4f-shadow-design.md` "4f-2 changes" paragraph + decisions 6/10.
  attr_for_shadow_colour_sibling('sgs/mega-panel', 'shadow') = 'shadowColour'
    (block_attributes: shadow/shadowColour both css_element='wrapper', css_state IS NULL)
  attr_for_shadow_colour_sibling('sgs/container', 'shadow') = 'shadowColour' (same pairing)
  Real draft values (mega-panel box-shadow), quoted verbatim from the mockups:
    Halcyon  (sites/Mega-menu design/Mega Menu.dc.html, line 71):
      '0 30px 80px -30px rgba(0,0,0,.35),0 2px 8px -2px rgba(0,0,0,.1)'
    Indus    (sites/Indus Foods Mega Menu Design/Indus Foods Mega Menu.dc.html, line 68):
      '0 30px 80px -30px rgba(20,25,35,.28),0 2px 8px -2px rgba(0,0,0,.08)'
  Neither matches a design_tokens shadow preset (verified: no preset default_value
  equals either normalised literal) — before this task both gapped NO_DESTINATION.

Two layers of proof:
  1. Unit tests directly against `converter.services.shadow_layers` (the grammar) and
     `process_element` (the resolver's DB wiring — proves the shape+colour destination
     attrs are the REAL DB-resolved siblings, never name-guessed).
  2. A round-trip validator that shells out to the REAL PHP composer
     (`includes/helpers-shadow-layers.php::sgs_shadow_layers`) and asserts the composed
     CSS the converter's shape+colour pair would render is EQUIVALENT (same lengths,
     same effective colour+opacity, normalised — never byte-identical, since the
     colour-list path renders a translucent colour as `color-mix(...)` while the
     draft's OWN embedded-colour form renders it as an 8-digit hex; both are the SAME
     colour) to composing the draft's own raw layers directly.

Run from plugins/sgs-blocks/scripts:
    python -m pytest converter/tests/test_outer_box_shadow_layers.py --import-mode=importlib
"""
from __future__ import annotations

import json
import re
import sqlite3
import subprocess
from pathlib import Path

import pytest

from converter.context import Ctx, Decl
from converter.models import GapOrigin
from converter.dispatch_spine import process_element
from converter.db.db_lookup import SGS_DB
from converter.services import shadow_layers

# ---------------------------------------------------------------------------
# The REAL PHP composer, shelled out to (task step 5) — never a re-implementation.
# ---------------------------------------------------------------------------

_HELPERS_SHADOW_LAYERS = Path(__file__).resolve().parents[3] / "includes" / "helpers-shadow-layers.php"
assert _HELPERS_SHADOW_LAYERS.is_file(), (
    f"expected {_HELPERS_SHADOW_LAYERS} to exist — the round-trip test needs the real composer"
)

# Stubs matching tests/php/run-shadow-layers-standalone.php (the existing standalone
# harness this task's brief points at): ABSPATH so the file's own
# `defined('ABSPATH') || exit;` guard passes, and esc_attr() since no WP bootstrap
# is loaded. Reads {"shape":.., "colour":..} as JSON on stdin, writes {"css":..} on stdout.
_PHP_HARNESS = (
    "if (!defined('ABSPATH')) { define('ABSPATH', '/'); }\n"
    "if (!function_exists('esc_attr')) { "
    "function esc_attr($t) { return htmlspecialchars((string) $t, ENT_QUOTES, 'UTF-8'); } }\n"
    f"require '{str(_HELPERS_SHADOW_LAYERS).replace(chr(92), '/')}';\n"
    "$in = json_decode(stream_get_contents(STDIN), true);\n"
    "echo json_encode(['css' => sgs_shadow_layers($in['shape'], $in['colour'])]);\n"
)


def _php_compose(shape: "str | None", colour: "str | None") -> str:
    """Compose `(shape, colour)` through the REAL `sgs_shadow_layers()`."""
    payload = json.dumps({"shape": shape, "colour": colour})
    result = subprocess.run(
        ["php", "-r", _PHP_HARNESS],
        input=payload, capture_output=True, text=True, timeout=15,
    )
    assert result.returncode == 0, (
        f"PHP composer failed (exit {result.returncode}):\n{result.stderr}"
    )
    return json.loads(result.stdout)["css"]


# ---------------------------------------------------------------------------
# Normalising comparator: a composed box-shadow CSS value -> ordered layer
# tuples of (inset, (x,y,blur,spread), effective (r,g,b,alpha)) — so a
# translucent colour written as an 8-digit hex compares EQUAL to the same
# colour written as `color-mix(in srgb, #RRGGBB N%, transparent)`.
# ---------------------------------------------------------------------------

_COLOUR_MIX_RE = re.compile(r"^color-mix\(in srgb, (#[0-9A-Fa-f]{6}) (\d+(?:\.\d+)?)%, transparent\)$")
_HEX8_RE = re.compile(r"^#[0-9A-Fa-f]{8}$")
_HEX6_RE = re.compile(r"^#[0-9A-Fa-f]{6}$")


def _effective_rgba(token: str) -> "tuple[int, int, int, float]":
    token = token.strip()
    match = _COLOUR_MIX_RE.match(token)
    if match:
        hexpart, pct = match.group(1), round(float(match.group(2)), 1)
        return (int(hexpart[1:3], 16), int(hexpart[3:5], 16), int(hexpart[5:7], 16), pct)
    if _HEX8_RE.match(token):
        alpha = round(int(token[7:9], 16) / 255 * 100, 1)
        return (int(token[1:3], 16), int(token[3:5], 16), int(token[5:7], 16), alpha)
    if _HEX6_RE.match(token):
        return (int(token[1:3], 16), int(token[3:5], 16), int(token[5:7], 16), 100.0)
    raise AssertionError(f"unrecognised composed colour token: {token!r}")


def _normalise_composed_css(css: str) -> list:
    if css.strip().lower() == "none":
        return ["none"]
    layers = []
    for layer_text in shadow_layers.split_top(css, ","):
        tokens = shadow_layers.split_top(layer_text, " ")
        inset = tokens[0].lower() == "inset"
        num_tokens = tokens[1:5] if inset else tokens[0:4]
        nums = tuple(round(shadow_layers.parse_length(t), 3) for t in num_tokens)
        colour_token = tokens[5] if inset else tokens[4]
        layers.append((inset, nums, _effective_rgba(colour_token)))
    return layers


def _layers_match(expected: list, actual: list) -> bool:
    """Compare two normalised layer lists for the SAME painted colour. RGB and
    lengths compare exactly; alpha allows a small tolerance (<=0.5) because the
    draft's OWN embedded-colour path round-trips through an 8-bit hex alpha
    BYTE (`sgs_functional_colour_to_hex()`) — 35% quantises to byte 89
    (0x59) = 34.9%, a real ~0.4-point rounding loss inherent to hex-alpha
    storage, NOT a converter defect. The colour-LIST path this task adds
    keeps the percentage exactly (no byte round-trip), so a byte-quantised
    "expected" and an exact "actual" are still the SAME colour.
    """
    if expected == ["none"] or actual == ["none"]:
        return expected == actual
    if len(expected) != len(actual):
        return False
    for (e_inset, e_nums, e_rgba), (a_inset, a_nums, a_rgba) in zip(expected, actual):
        if e_inset != a_inset or e_nums != a_nums:
            return False
        if e_rgba[:3] != a_rgba[:3] or abs(e_rgba[3] - a_rgba[3]) > 0.5:
            return False
    return True


def _assert_shadows_equivalent(expected_css: str, actual_css: str, label: str) -> None:
    """Assert two composed `box-shadow` CSS values draw the SAME thing —
    same lengths, same effective colour+opacity per layer, normalised
    (never a byte-for-byte compare: the colour-list path and the draft's own
    embedded-colour path render a translucent colour differently, and the
    embedded-colour path loses a little precision to 8-bit hex-alpha
    quantisation — see `_layers_match`)."""
    expected = _normalise_composed_css(expected_css)
    actual = _normalise_composed_css(actual_css)
    assert _layers_match(expected, actual), (
        f"{label}: normalised composed layers differ\n"
        f"  expected ({expected_css!r}): {expected}\n"
        f"  actual   ({actual_css!r}): {actual}"
    )


@pytest.fixture(scope="module")
def php_available():
    try:
        subprocess.run(["php", "-v"], capture_output=True, timeout=10, check=True)
    except (OSError, subprocess.CalledProcessError) as exc:  # pragma: no cover
        pytest.skip(f"php CLI not available: {exc}")


# ---------------------------------------------------------------------------
# Real draft literals (quoted verbatim — see GROUND-TRUTH above).
# ---------------------------------------------------------------------------

HALCYON_MEGA_PANEL_SHADOW = "0 30px 80px -30px rgba(0,0,0,.35),0 2px 8px -2px rgba(0,0,0,.1)"
INDUS_MEGA_PANEL_SHADOW = "0 30px 80px -30px rgba(20,25,35,.28),0 2px 8px -2px rgba(0,0,0,.08)"


# ---------------------------------------------------------------------------
# 1. Grammar unit tests (converter.services.shadow_layers), no DB/PHP needed.
# ---------------------------------------------------------------------------

def test_halcyon_two_layer_literal_parses_shape_and_colour():
    parsed = shadow_layers.parse_draft_box_shadow(HALCYON_MEGA_PANEL_SHADOW)
    assert parsed.shape == "0px 30px 80px -30px, 0px 2px 8px -2px"
    assert parsed.colour == "#000000 35%, #000000 10%"


def test_indus_two_layer_literal_parses_shape_and_colour():
    parsed = shadow_layers.parse_draft_box_shadow(INDUS_MEGA_PANEL_SHADOW)
    assert parsed.shape == "0px 30px 80px -30px, 0px 2px 8px -2px"
    assert parsed.colour == "#141923 28%, #000000 8%"


def test_comma_with_and_without_space_parse_identically():
    tight = "0 4px 12px rgba(0,0,0,.1),0 1px 2px rgba(0,0,0,.05)"
    spaced = "0 4px 12px rgba(0,0,0,.1), 0 1px 2px rgba(0,0,0,.05)"
    assert shadow_layers.parse_draft_box_shadow(tight) == shadow_layers.parse_draft_box_shadow(spaced)


def test_inset_layer_parses_with_inset_prefix_in_shape():
    parsed = shadow_layers.parse_draft_box_shadow("inset 0 2px 4px 0 rgba(0,0,0,.5)")
    assert parsed.shape == "inset 0px 2px 4px 0px"
    assert parsed.colour == "#000000 50%"


def test_eight_digit_hex_colour_extracts_embedded_alpha():
    # #00000080 = alpha byte 0x80=128 -> 128/255*100 = 50.2%
    parsed = shadow_layers.parse_draft_box_shadow("0 4px 12px #00000080")
    assert parsed.shape == "0px 4px 12px 0px"
    assert parsed.colour == "#000000 50.2%"


def test_var_colour_layer_raises_grammar_error_naming_var():
    with pytest.raises(shadow_layers.ShadowGrammarError, match="var\\(\\)"):
        shadow_layers.parse_draft_box_shadow("0 4px 12px var(--tomato)")


def test_three_different_colours_write_a_full_list():
    parsed = shadow_layers.parse_draft_box_shadow(
        "0 1px 2px #ff0000, 0 2px 4px #00ff00, 0 4px 8px rgba(0,0,255,.5)"
    )
    assert parsed.colour == "#FF0000, #00FF00, #0000FF 50%"


def test_one_repeated_colour_is_written_once():
    parsed = shadow_layers.parse_draft_box_shadow(
        "0 1px 2px rgba(0,0,0,.2), 0 2px 4px rgba(0,0,0,.2), 0 4px 8px rgba(0,0,0,.2)"
    )
    assert parsed.colour == "#000000 20%"
    assert "," not in parsed.colour


def test_none_writes_none():
    parsed = shadow_layers.parse_draft_box_shadow("none")
    assert parsed.is_none is True
    assert parsed.folded_shape == "none"


def test_more_than_eight_layers_gaps_with_cap_reason():
    nine_layers = ", ".join(["0 1px 2px red"] * 9)
    with pytest.raises(shadow_layers.ShadowGrammarError, match="8-layer"):
        shadow_layers.parse_draft_box_shadow(nine_layers)


# ---------------------------------------------------------------------------
# 2. Resolver integration tests (process_element) — proves the DB-resolved
# destination attrs, not just the parser. sgs/mega-panel's shadow/shadowColour
# rows share css_element='wrapper', css_state IS NULL (verified: GROUND-TRUTH
# above) — the exact pairing `attr_for_shadow_colour_sibling()` reads.
# ---------------------------------------------------------------------------

def _mega_panel_ctx(conn: sqlite3.Connection) -> Ctx:
    return Ctx(
        block_slug="sgs/mega-panel",
        container_kind="section",
        delegates_content=1,
        variant_value=None,
        variant_attr=None,
        node=None,
        is_root=True,
        base_layer="OUTER",
        conn=conn,
    )


@pytest.fixture
def conn():
    c = sqlite3.connect(SGS_DB)
    yield c
    c.close()


def test_halcyon_mega_panel_shadow_writes_shape_and_colour_via_resolver(conn):
    result = process_element(
        _mega_panel_ctx(conn), [Decl("box-shadow", HALCYON_MEGA_PANEL_SHADOW, "Base")]
    )
    attrs = result.attrs()
    assert attrs.get("shadow") == "0px 30px 80px -30px, 0px 2px 8px -2px"
    assert attrs.get("shadowColour") == "#000000 35%, #000000 10%"
    assert not any(g.property == "box-shadow" for g in result.gaps)
    assert result.decl_results == result.decl_count
    assert result.unrouted() == []


def test_indus_mega_panel_shadow_writes_shape_and_colour_via_resolver(conn):
    result = process_element(
        _mega_panel_ctx(conn), [Decl("box-shadow", INDUS_MEGA_PANEL_SHADOW, "Base")]
    )
    attrs = result.attrs()
    assert attrs.get("shadow") == "0px 30px 80px -30px, 0px 2px 8px -2px"
    assert attrs.get("shadowColour") == "#141923 28%, #000000 8%"
    assert not any(g.property == "box-shadow" for g in result.gaps)


def test_var_colour_layer_gaps_no_destination_via_resolver(conn):
    """A layer the grammar rejects still gaps honestly through the full resolver
    (not just the standalone parser) — never a partial/guessed write."""
    result = process_element(
        _mega_panel_ctx(conn), [Decl("box-shadow", "0 4px 12px var(--tomato)", "Base")]
    )
    assert result.attrs().get("shadow") is None
    assert result.attrs().get("shadowColour") is None
    gaps = [g for g in result.gaps if g.property == "box-shadow"]
    assert len(gaps) == 1
    assert gaps[0].origin is GapOrigin.NO_DESTINATION
    assert "var()" in gaps[0].detail


# ---------------------------------------------------------------------------
# 3. Round-trip validation through the REAL PHP composer (task step 5).
# ---------------------------------------------------------------------------

def test_halcyon_shape_and_colour_round_trip_through_php_composer(php_available):
    parsed = shadow_layers.parse_draft_box_shadow(HALCYON_MEGA_PANEL_SHADOW)
    expected = _php_compose(HALCYON_MEGA_PANEL_SHADOW, None)  # draft's own embedded colours
    actual = _php_compose(parsed.shape, parsed.colour)  # converter's shape+colour pair
    _assert_shadows_equivalent(expected, actual, "Halcyon mega-panel shadow")


def test_indus_shape_and_colour_round_trip_through_php_composer(php_available):
    parsed = shadow_layers.parse_draft_box_shadow(INDUS_MEGA_PANEL_SHADOW)
    expected = _php_compose(INDUS_MEGA_PANEL_SHADOW, None)
    actual = _php_compose(parsed.shape, parsed.colour)
    _assert_shadows_equivalent(expected, actual, "Indus mega-panel shadow")


def test_folded_shape_round_trips_byte_identical_when_no_colour_sibling(php_available):
    """The folded (no-colour-sibling) form keeps the draft's OWN colour tokens
    verbatim per layer, so composing it directly reproduces the draft's own
    composed CSS byte-for-byte (a stronger guarantee than the normalised
    comparison the two-attribute path needs)."""
    parsed = shadow_layers.parse_draft_box_shadow(INDUS_MEGA_PANEL_SHADOW)
    expected = _php_compose(INDUS_MEGA_PANEL_SHADOW, None)
    actual = _php_compose(parsed.folded_shape, None)
    assert expected == actual


def test_inset_layer_round_trips_through_php_composer(php_available):
    draft = "inset 0 2px 4px 0 rgba(0,0,0,.5)"
    parsed = shadow_layers.parse_draft_box_shadow(draft)
    expected = _php_compose(draft, None)
    actual = _php_compose(parsed.shape, parsed.colour)
    _assert_shadows_equivalent(expected, actual, "inset layer")


def test_negative_control_round_trip_fails_when_colour_list_is_dropped(php_available):
    """Prove the comparator has teeth: composing the SHAPE alone (the colour
    list silently dropped — the exact regression this test suite guards
    against) must NOT compare equivalent to the real draft's composed output."""
    parsed = shadow_layers.parse_draft_box_shadow(HALCYON_MEGA_PANEL_SHADOW)
    expected = _php_compose(HALCYON_MEGA_PANEL_SHADOW, None)
    broken_actual = _php_compose(parsed.shape, "")  # colour list dropped
    with pytest.raises(AssertionError):
        _assert_shadows_equivalent(expected, broken_actual, "negative control (colour dropped)")


# --- Colour-sibling pairing against the real framework DB -----------------------------
def test_sibling_pairs_by_element_and_state():
    from converter.db import db_lookup
    assert db_lookup.attr_for_shadow_colour_sibling("sgs/team-member", "cardShadow") == "cardShadowColour"
    assert db_lookup.attr_for_shadow_colour_sibling("sgs/team-member", "cardShadowHover") == "cardShadowColourHover"
    assert db_lookup.attr_for_shadow_colour_sibling("sgs/trust-bar", "iconCircleShadow") == "iconCircleShadowColour"
    assert db_lookup.attr_for_shadow_colour_sibling("sgs/trust-bar", "badgeImageShadow") == "badgeImageShadowColour"


def test_sibling_single_candidate_on_another_element_pairs():
    # sgs/media tags its shape 'wrapper' and its colour 'media'; the block has one colour list.
    from converter.db import db_lookup
    assert db_lookup.attr_for_shadow_colour_sibling("sgs/media", "boxShadow") == "boxShadowColour"


def test_sibling_two_candidates_on_other_elements_stay_ambiguous():
    # Negative control for the fallback: trust-bar's own `shadow` has two colour lists, both on
    # other elements; picking either would be a guess, so there is no pair.
    from converter.db import db_lookup
    assert db_lookup.attr_for_shadow_colour_sibling("sgs/trust-bar", "shadow") is None
