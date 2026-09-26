"""
Tests for scripts/derive-dark-palette.py (U-12 §D.1-D.3), run on the real Mama's
Munches snapshot (sites/mamas-munches/theme-snapshot.json, 31 palette slugs) — the
live shape the derivation must handle, not a synthetic fixture.

The real snapshot never carries `_sgsDark` itself (Bean's ruling: only the main
thread sets it, on the test site). Every test here builds its own IN-MEMORY copy of
the snapshot with `_sgsDark` injected, so the file on disk is never touched.

Run: python -m pytest plugins/sgs-blocks/scripts/tests/test_derive_dark_palette.py -q
"""
from __future__ import annotations

import copy
import importlib.util
import json
import sys
from pathlib import Path

import pytest

SCRIPTS_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = SCRIPTS_DIR.parents[2]
SNAPSHOT_PATH = REPO_ROOT / "sites" / "mamas-munches" / "theme-snapshot.json"


def _load_module():
    """derive-dark-palette.py has a hyphen, so it cannot be `import`ed by name —
    load it from its file path instead (same technique push-theme-snapshot.py's own
    integration uses, see that file's `_load_derive_dark_palette`)."""
    path = SCRIPTS_DIR / "derive-dark-palette.py"
    spec = importlib.util.spec_from_file_location("sgs_derive_dark_palette_test", path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


ddp = _load_module()


@pytest.fixture(scope="module")
def real_snapshot() -> dict:
    assert SNAPSHOT_PATH.is_file(), f"fixture snapshot not found: {SNAPSHOT_PATH}"
    return json.loads(SNAPSHOT_PATH.read_text(encoding="utf-8"))


@pytest.fixture
def snapshot_with_dark(real_snapshot):
    """A deep copy of the real snapshot with `_sgsDark.enabled: true` and no other
    overrides — the plain "just turn it on" case."""
    snap = copy.deepcopy(real_snapshot)
    snap["_sgsDark"] = {"enabled": True}
    return snap


def _palette_dict(snapshot: dict) -> dict:
    entries = snapshot["settings"]["color"]["palette"]
    return {e["slug"]: e["color"] for e in entries}


# ---------------------------------------------------------------------------
# Colour-maths sanity (round-trip + known WCAG pairs) — cheap guard before the
# real-snapshot tests, so a maths bug fails here first with a small, readable case.
# ---------------------------------------------------------------------------

def test_hex_oklch_round_trip_is_stable():
    for hexc in ("#ffffff", "#000000", "#e68a95", "#3a2e26", "#25d366"):
        lch = ddp.hex_to_oklch(hexc)
        back = ddp.oklch_to_hex(lch)
        # Round-trip through OKLCh may shift by a rounding unit — never more.
        r1, g1, b1 = ddp.hex_to_rgb01(hexc)
        r2, g2, b2 = ddp.hex_to_rgb01(back)
        assert max(abs(r1 - r2), abs(g1 - g2), abs(b1 - b2)) < 0.01, (hexc, back)


def test_contrast_white_on_black_is_21_to_1():
    assert ddp.contrast_ratio("#ffffff", "#000000") == pytest.approx(21.0, abs=0.05)


def test_contrast_same_colour_is_1_to_1():
    assert ddp.contrast_ratio("#8b6f4e", "#8b6f4e") == pytest.approx(1.0, abs=1e-9)


# ---------------------------------------------------------------------------
# Role classification, on the real palette's actual slugs.
# ---------------------------------------------------------------------------

def test_role_classification_on_real_slugs():
    assert ddp.classify_role("surface", {}) == "surface"
    assert ddp.classify_role("surface-alt", {}) == "surface"
    assert ddp.classify_role("footer-bg", {}) == "surface"
    assert ddp.classify_role("text", {}) == "text"
    assert ddp.classify_role("text-inverse", {}) == "text"
    assert ddp.classify_role("border-subtle", {}) == "border"
    assert ddp.classify_role("whatsapp", {}) == "locked"
    assert ddp.classify_role("primary", {}) == "brand"
    assert ddp.classify_role("cookie-brown", {}) == "brand"
    # Override wins over the name-based guess.
    assert ddp.classify_role("cookie-brown", {"cookie-brown": "locked"}) == "locked"


# ---------------------------------------------------------------------------
# Full derivation on the real snapshot.
# ---------------------------------------------------------------------------

def test_disabled_by_default_produces_nothing(real_snapshot):
    # The real file never sets _sgsDark (Bean's ruling: only the main thread does,
    # on the test site) — confirms the "off by default" path on the actual fixture.
    assert "_sgsDark" not in real_snapshot
    result = ddp.derive(real_snapshot)
    assert result["enabled"] is False
    assert result["dark"] == {}
    assert result["failures"] == []


def test_every_banded_surface_has_l_at_most_027(snapshot_with_dark):
    """Every LIGHT surface gets banded to L<=0.27 — but an ALREADY-DARK surface
    (`footer-bg`, #3A2E26, light-mode L=0.312) is explicitly excluded from the
    band (kept unchanged instead, see `test_footer_bg_is_already_dark_and_kept_unchanged`),
    so this only asserts the rule for surfaces that actually got banded."""
    result = ddp.derive(snapshot_with_dark)
    roles = {}
    for slug, hexc in result["dark"].items():
        if ddp.classify_role(slug, roles) == "surface" and slug != "footer-bg":
            L, _, _ = ddp.hex_to_oklch(hexc)
            # +0.003 headroom for sRGB 8-bit hex quantisation on the round trip
            # (OKLCh -> clamped sRGB byte -> OKLCh reads back a hair lighter).
            assert L <= 0.27 + 0.003, f"{slug} dark L={L} exceeds 0.27"


def test_footer_bg_is_already_dark_and_kept_unchanged(snapshot_with_dark):
    """The live defect (measured on the canary): `footer-bg` (#3A2E26, light-mode
    OKLCh L=0.312) was being pushed further into the 0.21-0.27 band even though it
    was already dark, ending up at #20160e — near-black enough that `text-inverse`
    (paired with it in the real footer, per the theme's shared footer pattern) hit
    only 1.55:1. Kept byte-identical, it stays #3A2E26 and works with a near-white
    text colour at 12.66:1."""
    result = ddp.derive(snapshot_with_dark)
    palette = _palette_dict(snapshot_with_dark)
    assert result["dark"]["footer-bg"] == palette["footer-bg"] == "#3A2E26"


def test_base_surface_is_darkest(snapshot_with_dark):
    result = ddp.derive(snapshot_with_dark)
    base_L, _, _ = ddp.hex_to_oklch(result["dark"]["surface"])
    assert base_L == pytest.approx(0.18, abs=0.005)


def test_real_usage_pairs_are_collected_and_mostly_pass(snapshot_with_dark, capsys):
    """Every real (text, background) pair Mama's Munches' own `styles.color`,
    `styles.elements.*` (incl. `:hover`) and `styles.blocks.*` declare — printed so
    a human can read the whole checked set, per the fix's own reporting
    requirement. All but the ones covered by the conflict tests below pass."""
    palette = _palette_dict(snapshot_with_dark)
    pairs = ddp.collect_usage_pairs(snapshot_with_dark, palette)
    assert pairs, "no usage pairs were found in the real snapshot's declared styles"
    result = ddp.derive(snapshot_with_dark)
    seen = set()
    print("\nUsage pairs found in sites/mamas-munches/theme-snapshot.json:")
    for fg, bg, kind in pairs:
        key = (fg, bg, kind)
        if key in seen:
            continue
        seen.add(key)
        target = ddp.TEXT_TARGET if kind == "text" else ddp.UI_TARGET
        final_fg = result["dark"].get(fg) or palette.get(fg)
        final_bg = result["dark"].get(bg) or palette.get(bg)
        ratio = ddp.contrast_ratio(final_fg, final_bg)
        verdict = "PASS" if ratio >= target - 1e-9 else "FAIL"
        print(f"  {fg} on {bg} ({kind}, target {target}): {ratio:.2f}:1 {verdict}")
    # The concrete pair the live defect was measured on: `text` used as the
    # button label on the `accent` fill (styles.elements.button.color) — a real
    # declared usage the OLD narrow surface+surface-alt default never checked.
    assert ("text", "accent", "text") in {(f, b, k) for f, b, k in pairs}
    accent_dark = result["dark"].get("accent") or palette["accent"]
    text_dark = result["dark"].get("text") or palette["text"]
    assert ddp.contrast_ratio(text_dark, accent_dark) >= ddp.TEXT_TARGET - 1e-9


def test_real_snapshot_has_named_irresolvable_conflicts(snapshot_with_dark):
    """Checking every text-role colour against EVERY surface (not just the base
    `surface` + `surface-alt`, the old narrow default) surfaces genuine, real
    conflicts already baked into Mama's Munches' palette: `text-inverse`,
    `primary-text` and `accent-text` are each paired (by name) with a light brand
    fill that itself stays light in dark mode (brand colours only need 3:1
    against a surface, which a light colour clears trivially against a near-black
    one) — but the SAME slug is also checked against every surface, and no single
    lightness can be both dark enough for the light fill and light enough for the
    dark surfaces. Per D.3 this fails closed (the value is left unchanged rather
    than guessing) and is reported here so Bean can decide a `_sgsDark.palette`
    override for whichever of these the client's real markup actually renders."""
    result = ddp.derive(snapshot_with_dark)
    failing_slugs = {f["slug"] for f in result["failures"]}
    assert failing_slugs == {"text", "text-inverse", "primary-text", "accent-text"}, failing_slugs
    # text-inverse's own value must stay unchanged (near-white) — it already
    # passes every SURFACE at that value (including the un-darkened footer-bg,
    # 12.66:1); only the `primary` fill pairing fails. That unchanged value is
    # exactly what keeps the real footer readable; see the negative control below
    # for what happens when this broader check is missing.
    palette = _palette_dict(snapshot_with_dark)
    assert result["dark"]["text-inverse"] == palette["text-inverse"]
    text_inverse_failures = [f for f in result["failures"] if f["slug"] == "text-inverse"]
    assert {f["against"] for f in text_inverse_failures} == {"primary"}


def test_negative_control_without_the_all_surfaces_check_the_footer_defect_is_invisible(
    snapshot_with_dark, monkeypatch
):
    """NEGATIVE CONTROL. `text-inverse` on `footer-bg` is never discoverable as a
    usage pair from this JSON file at all — the real footer markup lives in the
    theme's shared `footer-*.php` patterns, not in a client snapshot. The only
    thing standing between a passing-looking derivation and the measured live
    defect (1.55:1 in the footer) is checking text-role slugs against EVERY
    surface, not just the base + alt. Force that check back to empty surfaces
    (the OLD, narrow behaviour `_default_pairs_for_slug` used before this fix)
    and prove the gate goes green while the real render would still be broken."""
    monkeypatch.setattr(ddp, "_surface_bg_slugs", lambda palette, roles: [])
    result = ddp.derive(snapshot_with_dark)
    assert not any(f["slug"] == "text-inverse" for f in result["failures"]), (
        "NEGATIVE CONTROL FAILED: the gate still caught the conflict even with "
        "the all-surfaces check disabled — it can no longer prove this check is "
        "load-bearing."
    )
    # With the broader check gone, text-inverse is free to move to satisfy ONLY
    # the primary pairing — and does, landing on a DARK value that would be
    # unreadable against the real (unchanged, still-dark) footer-bg.
    palette = _palette_dict(snapshot_with_dark)
    moved = result["dark"]["text-inverse"]
    assert moved != palette["text-inverse"]
    footer_bg_dark = result["dark"]["footer-bg"]
    real_footer_ratio = ddp.contrast_ratio(moved, footer_bg_dark)
    assert real_footer_ratio < ddp.TEXT_TARGET, (
        f"expected the disabled-check case to reproduce the live defect "
        f"(<4.5:1), got {real_footer_ratio:.2f}:1"
    )


def test_whatsapp_is_locked_and_unchanged(snapshot_with_dark):
    result = ddp.derive(snapshot_with_dark)
    palette = _palette_dict(snapshot_with_dark)
    assert result["dark"]["whatsapp"] == palette["whatsapp"]


def test_an_already_passing_light_colour_is_byte_identical(snapshot_with_dark):
    """`whatsapp` (#25D366, locked) already passes 3:1 against the derived dark
    surface — prove a SECOND, non-locked case also comes out unchanged when it
    already passes EVERY surface it is checked against, including the
    moderately-dark (not near-black) `footer-bg`: `border` (#e8d5c0, a light tan)
    clears 3:1 against every derived surface without being moved. (`success`,
    the previous example here, now FAILS unchanged against `footer-bg` once
    every surface is checked rather than just the base one — a real, if minor,
    consequence of the broader check that the minimum-change search below
    resolves for a comparable case, `cookie-brown`.)"""
    result = ddp.derive(snapshot_with_dark)
    palette = _palette_dict(snapshot_with_dark)
    for slug, hexc in result["dark"].items():
        if ddp.classify_role(slug, {}) == "surface":
            assert ddp.contrast_ratio(palette["border"], hexc) >= 3.0, (
                f"fixture premise broken: border must already pass 3:1 against "
                f"every derived dark surface (failed against {slug})"
            )
    assert result["dark"]["border"] == palette["border"]


def test_a_midtone_brand_colour_is_lightened_and_passes(snapshot_with_dark):
    """`cookie-brown` (#8b6f4e) fails 3:1 unchanged against the derived
    `footer-bg` (#3A2E26, kept moderately dark rather than near-black — see the
    already-dark-surface tests) even though it easily clears 3:1 against the
    near-black `surface`. Prove the minimum-change search moves it and the
    result passes against EVERY surface, footer-bg included — the WORST-case
    background, not just the easiest one."""
    result = ddp.derive(snapshot_with_dark)
    palette = _palette_dict(snapshot_with_dark)
    original = palette["cookie-brown"]
    derived = result["dark"]["cookie-brown"]
    assert derived != original, "cookie-brown should have been moved by the search"
    for slug, hexc in result["dark"].items():
        if ddp.classify_role(slug, {}) == "surface":
            assert ddp.contrast_ratio(derived, hexc) >= 3.0 - 1e-9, (
                f"cookie-brown still fails 3:1 against {slug} after the search"
            )


def test_text_inverse_is_still_one_of_the_named_conflicts(snapshot_with_dark):
    """Superseded premise: this test used to assert `text-inverse` always passes
    against `primary` alone, because that was the ONLY pairing the old code ever
    checked it against. `test_real_snapshot_has_named_irresolvable_conflicts`
    covers this properly now (Mama's real palette has no lightness that
    satisfies both `primary` and every surface at once) — this test just pins
    the specific pairing that fails, so a future change to `_text_pairs_with_fill`
    is still caught here even if the broader conflict set changes shape."""
    result = ddp.derive(snapshot_with_dark)
    palette = _palette_dict(snapshot_with_dark)
    dark_primary = result["dark"]["primary"]
    dark_text_inverse = result["dark"]["text-inverse"]
    assert dark_text_inverse == palette["text-inverse"], "text-inverse must stay unchanged (fail-closed)"
    assert ddp.contrast_ratio(dark_text_inverse, dark_primary) < 4.5


def test_hand_set_palette_value_is_used_and_checked(real_snapshot):
    snap = copy.deepcopy(real_snapshot)
    # A hand-set value that clearly passes 3:1/4.5:1 against every derived surface.
    snap["_sgsDark"] = {"enabled": True, "palette": {"primary": "#ffb6c1"}}
    result = ddp.derive(snap)
    assert result["dark"]["primary"] == "#ffb6c1"
    # The hand-set value itself introduces no NEW failure — it is not the source
    # of the pre-existing, unrelated conflicts covered by
    # `test_real_snapshot_has_named_irresolvable_conflicts` (text/text-inverse/
    # primary-text/accent-text), which a hand-set override for THOSE slugs would
    # separately resolve.
    assert not any(f["slug"] == "primary" for f in result["failures"])


def test_hand_set_palette_value_that_fails_is_reported(real_snapshot):
    snap = copy.deepcopy(real_snapshot)
    # A hand-set value that CANNOT pass 3:1 against the near-black derived
    # surface — dark grey on near-black.
    snap["_sgsDark"] = {"enabled": True, "palette": {"primary": "#1a1a1a"}}
    result = ddp.derive(snap)
    assert result["dark"]["primary"] == "#1a1a1a"  # used as-is, not silently moved
    assert any(f["slug"] == "primary" for f in result["failures"])


def test_roles_override_reclassifies_a_slug(real_snapshot):
    snap = copy.deepcopy(real_snapshot)
    snap["_sgsDark"] = {"enabled": True, "roles": {"cookie-brown": "locked"}}
    palette = _palette_dict(snap)
    result = ddp.derive(snap)
    assert result["dark"]["cookie-brown"] == palette["cookie-brown"]


# ---------------------------------------------------------------------------
# NEGATIVE CONTROL — a roles override that takes the base `surface` slug OUT of
# the surface role must make the gate fail. This is the "test goes red" proof:
# without it, a broken role map could silently produce a passing-looking palette.
# ---------------------------------------------------------------------------

def test_negative_control_surface_role_override_fails_the_gate(real_snapshot):
    """Force EVERY slug the palette currently classifies `surface` out of that
    role (a roles override leaving no surface at all to check anything
    against — the same "a light slug ends up standing in for the surface"
    failure shape D.3 names). Overriding only the base `surface` is no longer
    enough to prove this on its own: since the fix now checks against every
    surface (§1), `footer-bg`/`surface-alt`/etc. would still be there to check
    non-locked colours against, and the control would pass by accident. With
    every surface gone, `_surface_bg_slugs` falls back to the ORIGINAL,
    un-darkened light `surface` hex (#fbf3dc) — every ADJUSTABLE colour can still
    be searched into passing against a fixed light background (moving the
    foreground to near-black beats a light background easily, by design), but
    `whatsapp`, which is LOCKED and never moved, cannot: its real, fixed green
    (#25D366) measures only ~1.79:1 against the light fallback (< 3:1), a fact
    independent of any search this module runs. If the gate ever stops
    reporting this it means locked colours silently stopped being checked.
    """
    snap = copy.deepcopy(real_snapshot)
    palette = _palette_dict(snap)
    surface_slugs = [s for s in palette if ddp.classify_role(s, {}) == "surface"]
    assert surface_slugs, "fixture premise broken: the real palette has no surface slugs"
    snap["_sgsDark"] = {"enabled": True, "roles": {s: "brand" for s in surface_slugs}}
    result = ddp.derive(snap)
    assert result["failures"], (
        "NEGATIVE CONTROL FAILED: forcing every surface out of the surface role "
        "should have produced at least one contrast failure, but the gate "
        "reported none — it cannot be trusted to catch a broken role map."
    )
    assert any(f["slug"] == "whatsapp" for f in result["failures"]), result["failures"]


def test_negative_control_disabled_derivation_never_raises_or_fails(real_snapshot):
    """A companion sanity check to the negative control above: with the feature
    OFF (no _sgsDark, the real file's actual state), derive() must be a pure
    no-op — never a source of failures a caller could misread as a contrast
    problem."""
    assert "_sgsDark" not in real_snapshot
    result = ddp.derive(real_snapshot)
    assert result["failures"] == []


def test_dark_palette_contrast_error_names_every_pair():
    err = ddp.DarkPaletteContrastError(
        [{"slug": "x", "against": "#000000", "ratio": 1.0, "target": 3.0}]
    )
    assert "x" in str(err)
    assert "3.0" in str(err) or "3.0:1" in str(err)
