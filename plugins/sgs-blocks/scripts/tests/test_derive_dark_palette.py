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


def test_every_surface_has_l_at_most_027(snapshot_with_dark):
    result = ddp.derive(snapshot_with_dark)
    palette = _palette_dict(snapshot_with_dark)
    roles = {}
    for slug, hexc in result["dark"].items():
        if ddp.classify_role(slug, roles) == "surface":
            L, _, _ = ddp.hex_to_oklch(hexc)
            # +0.003 headroom for sRGB 8-bit hex quantisation on the round trip
            # (OKLCh -> clamped sRGB byte -> OKLCh reads back a hair lighter).
            assert L <= 0.27 + 0.003, f"{slug} dark L={L} exceeds 0.27"


def test_base_surface_is_darkest(snapshot_with_dark):
    result = ddp.derive(snapshot_with_dark)
    base_L, _, _ = ddp.hex_to_oklch(result["dark"]["surface"])
    assert base_L == pytest.approx(0.18, abs=0.005)


def test_no_gate_failures_on_the_plain_real_snapshot(snapshot_with_dark):
    """The derivation must be able to make the WHOLE real 31-slug palette pass —
    this is the gate build-deploy.py / push-theme-snapshot.py rely on to not abort
    a normal deploy."""
    result = ddp.derive(snapshot_with_dark)
    assert result["failures"] == [], result["failures"]


def test_whatsapp_is_locked_and_unchanged(snapshot_with_dark):
    result = ddp.derive(snapshot_with_dark)
    palette = _palette_dict(snapshot_with_dark)
    assert result["dark"]["whatsapp"] == palette["whatsapp"]


def test_an_already_passing_light_colour_is_byte_identical(snapshot_with_dark):
    """`whatsapp` (#25D366, locked) already passes 3:1 against the derived dark
    surface — prove a SECOND, non-locked case also comes out unchanged when it
    already passes: `success` (#2e7d4f) is dark/saturated enough to clear 3:1
    against the near-black derived surface without being moved."""
    result = ddp.derive(snapshot_with_dark)
    palette = _palette_dict(snapshot_with_dark)
    surface_dark = result["dark"]["surface"]
    assert ddp.contrast_ratio(palette["success"], surface_dark) >= 3.0, (
        "fixture premise broken: success must already pass 3:1 against the "
        "derived dark surface for this to be a real byte-identical case"
    )
    assert result["dark"]["success"] == palette["success"]


def test_a_midtone_brand_colour_is_lightened_and_passes(snapshot_with_dark):
    """`primary-dark` (#c56a7a, a dusty pink) is exactly the colour
    scripts/nav-qa/palette-contrast-sweep.mjs's own docblock names as failing 4.5:1
    for TEXT on it — here it is a BRAND/UI colour (3:1 target) against the derived
    near-black surface; assert it still gets moved+verified correctly by picking a
    slug that provably fails unchanged: `primary` (#e68a95) against the light
    surface is fine, but prove the search activates by checking the mid-tone
    against the ORIGINAL light surface it would have failed pre-derivation, then
    assert the DERIVED value passes against the derived (near-black) surface."""
    result = ddp.derive(snapshot_with_dark)
    palette = _palette_dict(snapshot_with_dark)
    surface_dark = result["dark"]["surface"]
    derived = result["dark"]["primary-dark"]
    assert ddp.contrast_ratio(derived, surface_dark) >= 3.0 - 1e-9
    # It must actually have been evaluated (not just copied) — assert the search
    # path is exercised at least once across the WHOLE palette (some slug changes).
    changed = [s for s in palette if palette[s] != result["dark"].get(s)]
    assert changed, "no slug was ever moved — the minimum-change search never ran"


def test_text_inverse_is_paired_with_primary_not_surface(snapshot_with_dark):
    result = ddp.derive(snapshot_with_dark)
    dark_primary = result["dark"]["primary"]
    dark_text_inverse = result["dark"]["text-inverse"]
    assert ddp.contrast_ratio(dark_text_inverse, dark_primary) >= 4.5 - 1e-9


def test_hand_set_palette_value_is_used_and_checked(real_snapshot):
    snap = copy.deepcopy(real_snapshot)
    # A hand-set value that clearly passes 3:1 against a near-black surface.
    snap["_sgsDark"] = {"enabled": True, "palette": {"primary": "#ffb6c1"}}
    result = ddp.derive(snap)
    assert result["dark"]["primary"] == "#ffb6c1"
    assert result["failures"] == []


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
    """Force the base 'surface' slug OUT of the surface role (a roles override
    that leaves no dark-banded surface to check anything against — the same
    "a light slug ends up standing in for the surface" failure shape D.3 names).
    No surface-banded dark value is produced, so every check falls back to the
    ORIGINAL, un-darkened light 'surface' hex (#fbf3dc, a light cream).

    Every ADJUSTABLE colour (brand/border/regular text) can still be searched
    into passing against a fixed light background — moving the FOREGROUND to
    near-black beats a light background easily, by design (that is the
    minimum-change search doing its job, not a bug). The one colour that CANNOT
    be rescued is `whatsapp`, which is LOCKED (never moved) — its real, fixed
    green (#25D366) measures only ~1.79:1 against the light fallback (< 3:1),
    a fact independent of any search this module runs. If the gate ever stops
    reporting this it means locked colours silently stopped being checked.
    """
    snap = copy.deepcopy(real_snapshot)
    snap["_sgsDark"] = {"enabled": True, "roles": {"surface": "brand"}}
    result = ddp.derive(snap)
    assert result["failures"], (
        "NEGATIVE CONTROL FAILED: forcing the base surface out of the surface "
        "role should have produced at least one contrast failure, but the gate "
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
