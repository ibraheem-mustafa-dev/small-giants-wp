"""test_preset_absence.py — Build #3 Option B: preset-absence transfer.

GROUND-TRUTH: spec=31 §13.1 R-31-1/R-31-9 source=db (verified 2026-07-24, live
`/sgs-update` run against the real block.json + render.php + style.css files —
re-verified after folding in google-reviews as a 5th block; the original 4
blocks' rows are byte-for-byte unchanged):

    SELECT block_slug, preset_attr, enum_value, implied_property, presence,
           is_neutral FROM preset_implications;

    sgs/card-grid       effectHover  lift           box-shadow,transform present 0
    sgs/card-grid       effectHover  none                                absent 1
    sgs/card-grid       effectHover  zoom           transform            present 0
    sgs/google-reviews  cardStyle    bordered       border               present 0
    sgs/google-reviews  cardStyle    elevated       box-shadow           present 0
    sgs/google-reviews  cardStyle    flat                                 absent 1
    sgs/info-box        cardStyle    bordered       border               present 0
    sgs/info-box        cardStyle    elevated       box-shadow           present 0
    sgs/info-box        cardStyle    filled                               absent 0
    sgs/info-box        cardStyle    flat                                 absent 1
    sgs/info-box        cardStyle    subtle                               absent 0
    sgs/info-box        effectHover  border-accent  transform            present 0
    sgs/info-box        effectHover  glow           box-shadow           present 0
    sgs/info-box        effectHover  lift           box-shadow,transform present 0
    sgs/info-box        effectHover  none                                 absent 1
    sgs/team-member     cardStyle    bordered       border               present 0
    sgs/team-member     cardStyle    elevated       box-shadow           present 0
    sgs/team-member     cardStyle    filled                               absent 0
    sgs/team-member     cardStyle    flat                                 absent 1
    sgs/testimonial     effectHover  glow           box-shadow           present 0
    sgs/testimonial     effectHover  lift           box-shadow,transform present 0
    sgs/testimonial     effectHover  none                                 absent 1
    sgs/testimonial     effectHover  scale          transform            present 0

    google-reviews's cardStyle CSS targets a DESCENDANT
    (`.sgs-google-reviews--card-elevated .sgs-google-reviews__review`), not
    the class element itself, and 'flat' paints no CSS rule at all (seeded via
    the generalised neutral-fallback, same mechanism as effectHover's 'none').
    google-reviews has NO dedicated base-state box-shadow/border writer, so it
    exercises the SAME raw-decl fallback path as info-box.

    Reconciliation attrs (block_attributes, css_state):
      sgs/card-grid    cardShadow  box-shadow  None (base)
      sgs/team-member  cardShadow  box-shadow  None (base)
      sgs/info-box, sgs/google-reviews — no base-state box-shadow/border
      writer (raw-decl fallback)
      all 4 hover-declaring blocks  scaleHover  transform   hover
      all 4 hover-declaring blocks  shadowHover box-shadow  hover

    post-grid is explicitly OUT OF SCOPE (Bean-confirmed): its cardStyle is a
    structural/layout choice consumed by view.js at runtime against live
    query results, produces NO `.sgs-post-grid--{value}` CSS rule, and is not
    a static clone target. It carries no supports.sgs.presetSelectors and has
    zero rows in preset_implications — no code in this module or
    sgs-update-v2.py names it.

These tests require the real sgs-framework.db already populated by
`/sgs-update` (this build re-ran it — see the report). Run from
plugins/sgs-blocks/scripts:

    python -m pytest converter/tests/test_preset_absence.py --import-mode=importlib -q
"""
from __future__ import annotations

import sqlite3
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import pytest  # noqa: E402

from converter.context import Recognition  # noqa: E402
from converter.db.db_lookup import SGS_DB  # noqa: E402
from converter.resolvers import preset_absence  # noqa: E402
from converter.resolvers.preset_absence import _pick_value, apply_preset_absence  # noqa: E402


def _rec(slug: str) -> Recognition:
    return Recognition(kind="named", slug=slug, container_kind=None, delegates_content=None)


@pytest.fixture(autouse=True)
def _require_db():
    if not SGS_DB.exists():
        pytest.skip("sgs-framework.db not present in this environment")


# ---------------------------------------------------------------------------
# 1. Shadowless info-box draft -> cardStyle == neutral (flat)
# ---------------------------------------------------------------------------


def test_shadowless_infobox_picks_neutral_cardstyle():
    """A draft `.sgs-info-box` root with NO box-shadow/border at rest must not
    be left at the block's hard-coded default (elevated) — it should pick the
    catalogued neutral value (flat)."""
    result = apply_preset_absence(
        _rec("sgs/info-box"),
        attrs_so_far={},
        base_decls={"background": "#fff", "padding": "24px"},
        state_decls={},
    )
    assert result.get("cardStyle") == "flat", result
    # info-box also declares effectHover; with no hover decls at all it must
    # resolve to its own neutral (none), not stay silently unset.
    assert result.get("effectHover") == "none", result


def test_shadowed_infobox_picks_elevated():
    """A draft with a genuine resting box-shadow must resolve to 'elevated'
    (info-box has no dedicated base-state shadow-writer attr, so this proves
    the raw-base_decls fallback path)."""
    result = apply_preset_absence(
        _rec("sgs/info-box"),
        attrs_so_far={},
        base_decls={"box-shadow": "0 4px 12px rgba(0,0,0,0.1)"},
        state_decls={},
    )
    assert result.get("cardStyle") == "elevated", result


def test_bordered_infobox_over_neutral():
    result = apply_preset_absence(
        _rec("sgs/info-box"),
        attrs_so_far={},
        base_decls={"border-width": "1px", "border-style": "solid"},
        state_decls={},
    )
    assert result.get("cardStyle") == "bordered", result


def test_infobox_shadow_beats_border_on_tie():
    """Component 4 step 4: when >=2 candidates fully qualify with the SAME
    property count, box-shadow (priority 3) wins over border (priority 2) —
    'elevated' over 'bordered'."""
    result = apply_preset_absence(
        _rec("sgs/info-box"),
        attrs_so_far={},
        base_decls={
            "box-shadow": "0 4px 12px rgba(0,0,0,0.1)",
            "border-width": "1px",
            "border-style": "solid",
        },
        state_decls={},
    )
    assert result.get("cardStyle") == "elevated", result


# ---------------------------------------------------------------------------
# 2. Shadowed team-member draft -> cardShadow set AND cardStyle == elevated,
#    exactly ONE shadow-bearing write (double-inject regression guard).
# ---------------------------------------------------------------------------


def test_shadowed_team_member_reconciles_with_cardshadow_writer():
    """team-member HAS a dedicated base-state box-shadow writer (cardShadow).
    When that resolver already wrote a real value into attrs_so_far, the
    preset resolver must DEFER to that presence (never re-scan raw decls) and
    resolve cardStyle to 'elevated' — proving the reconciliation path, not the
    raw-decl fallback (info-box's path, tested above)."""
    attrs_so_far = {"cardShadow": "0 4px 12px rgba(0,0,0,0.2)"}
    result = apply_preset_absence(
        _rec("sgs/team-member"),
        attrs_so_far=attrs_so_far,
        base_decls={},  # deliberately EMPTY — proves reconciliation, not raw-decl re-scan
        state_decls={},
    )
    assert result.get("cardStyle") == "elevated", result
    # Double-inject guard: the preset resolver's own output NEVER contains the
    # underlying shadow attr — it writes ONLY the preset-selector attr itself,
    # so there is exactly one shadow-bearing write in the combined attrs
    # (attrs_so_far's pre-existing cardShadow; nothing added here).
    assert "cardShadow" not in result, result
    combined = {**attrs_so_far, **result}
    shadow_bearing_keys = [k for k in combined if "shadow" in k.lower()]
    assert shadow_bearing_keys == ["cardShadow"], (
        f"expected exactly one shadow-bearing write, got {shadow_bearing_keys}"
    )


def test_shadowless_team_member_stays_flat():
    """team-member with NO shadow anywhere — cardShadow unwritten AND no
    box-shadow in the draft's decls — resolves to the neutral 'flat'."""
    result = apply_preset_absence(
        _rec("sgs/team-member"),
        attrs_so_far={},  # cardShadow never written
        base_decls={},    # genuinely no shadow in the draft
        state_decls={},
    )
    assert result.get("cardStyle") == "flat", result


def test_non_token_shadow_team_member_picks_elevated():
    """FIDELITY FLOOR (qc-council finding, 2026-07-24). The draft HAS a real
    resting box-shadow, but its value is not one of design_tokens' shadow
    presets, so outer_box's token-snap GAPS cardShadow (writes nothing). The
    preset resolver must still see the real shadow in the raw decls and pick
    'elevated' (rendering the block's generic preset-shadow fallback) — NOT
    drop to 'flat' and paint no shadow at all. Before the fix this returned
    'flat', silently turning a real shadow into no shadow on the clone."""
    result = apply_preset_absence(
        _rec("sgs/team-member"),
        attrs_so_far={},  # cardShadow gapped by token-snap -> never written
        base_decls={"box-shadow": "0 2px 6px rgba(0,0,0,0.15)"},  # real, non-preset shadow
        state_decls={},
    )
    assert result.get("cardStyle") == "elevated", result


# ---------------------------------------------------------------------------
# 2b. google-reviews — descendant-selector cardStyle, folded in as a 5th block
#     on the SAME universal mechanism (no per-block code).
# ---------------------------------------------------------------------------


@pytest.fixture
def no_default(monkeypatch):
    """Take the block's own default out of the pick. The three google-reviews tests below test SIGNAL DETECTION on a
    descendant-scoped preset (does a shadow / a border / nothing reach the right value?), not the default. Since the
    prefer-the-default-on-a-tie rule (design 2026-09-23 section 4) the outcome also depends on which value block.json
    declares as default, and the redesign moves that default to the signal-less `google-card` look, which would then
    (correctly) be kept for the shadowed and the bordered draft. Pinning the default to "unknown" keeps these tests about
    what they were written to prove; the rule itself is tested in section 6."""
    monkeypatch.setattr(preset_absence, "_block_default", lambda slug, attr: None)


def test_google_reviews_shadowed_review_picks_elevated(no_default):
    """google-reviews's cardStyle CSS targets a DESCENDANT
    (`.sgs-google-reviews--card-elevated .sgs-google-reviews__review`), not
    the class element itself — proves the resolver's raw-decl signal
    detection is agnostic to WHERE in the draft's cascade the property was
    collected, only that it's present in the element's own base_decls."""
    result = apply_preset_absence(
        _rec("sgs/google-reviews"),
        attrs_so_far={},
        base_decls={"box-shadow": "0 4px 12px rgba(0,0,0,0.08)"},
        state_decls={},
    )
    assert result.get("cardStyle") == "elevated", result


def test_google_reviews_bordered_review_picks_bordered(no_default):
    result = apply_preset_absence(
        _rec("sgs/google-reviews"),
        attrs_so_far={},
        base_decls={"border-width": "1px", "border-style": "solid"},
        state_decls={},
    )
    assert result.get("cardStyle") == "bordered", result


def test_google_reviews_plain_review_picks_flat_neutral(no_default):
    """'flat' paints NO CSS rule at all (a real SelectControl option with zero
    dedicated declarations) — proves the generalised neutral-fallback seeding
    (mirrors effectHover's 'none'), not a hardcoded google-reviews carve-out."""
    result = apply_preset_absence(
        _rec("sgs/google-reviews"),
        attrs_so_far={},
        base_decls={},
        state_decls={},
    )
    assert result.get("cardStyle") == "flat", result


# ---------------------------------------------------------------------------
# 3. Hover-absent card-grid draft -> effectHover == none
# ---------------------------------------------------------------------------


def test_hover_absent_card_grid_picks_none():
    result = apply_preset_absence(
        _rec("sgs/card-grid"),
        attrs_so_far={},
        base_decls={},
        state_decls={},  # no Hover bucket at all
    )
    assert result.get("effectHover") == "none", result


def test_hover_transform_only_card_grid_picks_zoom_not_lift():
    """card-grid's 'zoom' needs ONLY transform; 'lift' needs transform AND
    box-shadow. With only a hover transform present (via the scaleHover
    reconciliation attr) and no shadowHover write, 'zoom' must win — proves
    the full-match-required rule (a partial match on 'lift' must not win)."""
    result = apply_preset_absence(
        _rec("sgs/card-grid"),
        attrs_so_far={"scaleHover": "1.05"},
        base_decls={},
        state_decls={},
    )
    assert result.get("effectHover") == "zoom", result


def test_hover_child_image_zoom_does_not_leak_into_card_effecthover():
    """Hardening regression (qc-council finding, 2026-07-24). card-grid
    registers TWO transform/hover attrs: `scaleHover` (the CARD's own
    effect, css_element=NULL) and `imageZoomHover` (a per-CHILD image-only
    effect, css_element='image'). Before the `attrs_for_css_property_state`
    element-scoping fix, the unscoped lookup returned both, and
    `imageZoomHover` being written alone (no `scaleHover`) was wrongly read
    as evidence the CARD scales on hover -> effectHover fell to 'zoom'. The
    card itself has NO hover effect here, so it must resolve to 'none'."""
    result = apply_preset_absence(
        _rec("sgs/card-grid"),
        attrs_so_far={"imageZoomHover": True},  # per-child only, card's own scaleHover absent
        base_decls={},
        state_decls={},
    )
    assert result.get("effectHover") == "none", result


def test_hover_transform_and_shadow_card_grid_picks_lift():
    """Both scaleHover AND cardShadowHover written -> 'lift' (more specific, 2
    properties) beats 'zoom' (1 property).

    ATTR RENAMED 2026-09-07 (Wave A1 ShadowControl redesign, D1000): sgs/card-grid's
    hover shadow moved `shadowHover` -> `cardShadowHover` when its two ShadowControl
    mounts collapsed onto one tabbed control and the whole family converged on the
    `cardShadow*` base. Production was never wrong here -- `_resolve_present_props`
    reads the attr name from the DB via `attrs_for_css_property_state()`, which now
    returns `('cardShadowHover',)`. It was THIS test that hardcoded the old name, so
    it silently stopped exercising the two-property path and asserted 'lift' against
    a result that had legitimately become 'zoom'.
    """
    result = apply_preset_absence(
        _rec("sgs/card-grid"),
        attrs_so_far={"scaleHover": "1.05", "cardShadowHover": "0 8px 24px rgba(0,0,0,0.12)"},
        base_decls={},
        state_decls={},
    )
    assert result.get("effectHover") == "lift", result


# ---------------------------------------------------------------------------
# 4. Universal — parametrised over every (block, preset_attr) the DB actually
#    declares, proving the SAME function handles each with no per-block branch.
# ---------------------------------------------------------------------------


def _all_block_preset_attrs() -> list[tuple[str, str]]:
    if not SGS_DB.exists():
        return []
    conn = sqlite3.connect(SGS_DB)
    try:
        rows = conn.execute(
            "SELECT DISTINCT block_slug, preset_attr FROM preset_implications"
        ).fetchall()
    finally:
        conn.close()
    return [tuple(r) for r in rows]


@pytest.mark.parametrize("block_slug,preset_attr", _all_block_preset_attrs())
def test_universal_no_decls_resolves_to_the_blocks_own_neutral(block_slug, preset_attr):
    """With zero declarations anywhere, every block's preset attr resolves to
    ITS OWN catalogued neutral value — same call path, no per-block code."""
    result = apply_preset_absence(
        _rec(block_slug), attrs_so_far={}, base_decls={}, state_decls={}
    )
    conn = sqlite3.connect(SGS_DB)
    try:
        row = conn.execute(
            "SELECT enum_value FROM preset_implications "
            "WHERE block_slug = ? AND preset_attr = ? AND is_neutral = 1",
            (block_slug, preset_attr),
        ).fetchone()
    finally:
        conn.close()
    assert row is not None, f"{block_slug}.{preset_attr} has no is_neutral row"
    assert result.get(preset_attr) == row[0], result


# ---------------------------------------------------------------------------
# 5. No-op for a block with zero preset_implications rows.
# ---------------------------------------------------------------------------


def test_block_with_no_preset_rows_is_a_true_no_op():
    result = apply_preset_absence(
        _rec("sgs/container"), attrs_so_far={}, base_decls={"box-shadow": "0 4px 12px #000"}, state_decls={}
    )
    assert result == {}, result


def test_unrecognised_node_returns_empty():
    rec = Recognition(kind="unrecognised", slug=None, container_kind=None, delegates_content=None)
    assert apply_preset_absence(rec, {}, {}, {}) == {}


# ---------------------------------------------------------------------------
# 6. Prefer the block's default on a tie (design 2026-09-23 section 4, Bean-approved shared change). Pure-function
#    cases on synthetic candidates (no block named), then the wiring through apply_preset_absence with a pinned default.
# ---------------------------------------------------------------------------

_B, _S, _T = frozenset({"border"}), frozenset({"box-shadow"}), frozenset({"transform"})
_LOOKS = (("flat", frozenset(), True), ("bordered", _B, False), ("elevated", _S, False),
          ("lift", _S | _T, False), ("manual-look", frozenset(), False))


def test_tie_a_signal_default_that_qualifies_is_kept_over_an_equal_count_rival():
    # border + shadow present: bordered and elevated both need one property; the default wins the tie
    assert _pick_value(_LOOKS, {"border", "box-shadow"}, default="bordered") == "bordered"


def test_negative_control_without_the_default_the_old_priority_decides_the_same_tie():
    assert _pick_value(_LOOKS, {"border", "box-shadow"}, default=None) == "elevated"
    assert _pick_value(_LOOKS, {"border", "box-shadow"}, default="flat") == "elevated"      # a neutral default is no tie-breaker


def test_negative_control_a_signal_default_that_does_not_qualify_is_not_kept():
    assert _pick_value(_LOOKS, {"box-shadow"}, default="bordered") == "elevated"


def test_a_strictly_more_specific_value_still_beats_a_qualifying_default():
    assert _pick_value(_LOOKS, {"box-shadow", "transform"}, default="elevated") == "lift"


def test_a_signal_less_default_is_kept_when_the_draft_matches_a_one_property_look():
    assert _pick_value(_LOOKS, {"border"}, default="manual-look") == "manual-look"
    assert _pick_value(_LOOKS, {"box-shadow"}, default="manual-look") == "manual-look"


def test_negative_control_the_same_draft_without_the_signal_less_default_gets_the_one_property_look():
    assert _pick_value(_LOOKS, {"border"}, default=None) == "bordered"


def test_negative_control_a_signal_less_default_loses_to_a_two_property_match():
    assert _pick_value(_LOOKS, {"box-shadow", "transform"}, default="manual-look") == "lift"


def test_negative_control_a_signal_less_default_is_not_kept_when_the_draft_paints_nothing():
    """The neutral is the exact match for a draft that paints none of the signal properties."""
    assert _pick_value(_LOOKS, set(), default="manual-look") == "flat"


def test_wiring_the_default_comes_from_the_block_and_a_bordered_draft_keeps_it(monkeypatch):
    """Through the real entry point: google-reviews' cardStyle candidates from the DB, the default pinned to the value the
    redesign declares (a hand-picked, signal-less look). A bordered review card now keeps the default instead of
    switching to `bordered` (design 2026-09-23 section 1: the converter chose 'bordered' so the Google look never applied)."""
    rows = [c for c in __import__("converter.db.db_lookup", fromlist=["x"]).preset_implications_for("sgs/google-reviews")
            if c[0] == "cardStyle"]
    signal_less = sorted(v for _a, v, props, neutral in rows if not props and not neutral)
    if not signal_less:
        pytest.skip("the DB has no signal-less cardStyle look for google-reviews")
    look = signal_less[0]
    monkeypatch.setattr(preset_absence, "_block_default", lambda slug, attr: look)
    bordered = {"border-width": "1px", "border-style": "solid"}
    assert apply_preset_absence(_rec("sgs/google-reviews"), {}, bordered, {}).get("cardStyle") == look
    monkeypatch.setattr(preset_absence, "_block_default", lambda slug, attr: None)            # negative control
    assert apply_preset_absence(_rec("sgs/google-reviews"), {}, bordered, {}).get("cardStyle") == "bordered"


def test_the_default_is_read_from_the_database_the_converter_is_pointed_at(tmp_path, monkeypatch):
    """`_block_default` reads block_attributes.default_value (JSON) from db_lookup.SGS_DB, whatever that is repointed to."""
    db = tmp_path / "d.db"
    conn = sqlite3.connect(db)
    conn.execute("CREATE TABLE block_attributes (block_slug TEXT, attr_name TEXT, default_value TEXT)")
    conn.execute("INSERT INTO block_attributes VALUES ('x/y', 'look', '\"plain\"')")
    conn.commit()
    conn.close()
    monkeypatch.setattr(preset_absence.db_lookup, "SGS_DB", db)
    assert preset_absence._block_default("x/y", "look") == "plain"
    assert preset_absence._block_default("x/y", "missing") is None
