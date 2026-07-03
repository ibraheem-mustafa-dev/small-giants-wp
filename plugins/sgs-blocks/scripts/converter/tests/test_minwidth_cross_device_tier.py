"""test_minwidth_cross_device_tier.py — FR-31-5.2 device-tier cascade.

The cloning pipeline's live CSS-transfer function ``collect_css_decls_for_element``
used to match ``@media`` rules by substring against a fixed marker table and
SILENTLY DROP any threshold that did not match (``min-width:600`` matched nothing).
It now computes the EFFECTIVE value per device tier by cascading base + every
applicable ``@media`` rule at a representative width (Spec 31 §3 F-fork / FR-31-5.2):

  - ``base_decls`` = the effective value at DESKTOP (the SGS base / unsuffixed tier)
  - ``bp_decls``   = the Tablet / Mobile overrides that DIFFER from base

This proves the mobile-first→desktop-base INVERSION (a draft whose base CSS is the
mobile layout with a ``min-width`` desktop override lands the desktop value on the
base attr and the mobile value on ``…Mobile``), the SYMMETRIC max-width direction,
and that NO declaration is silently dropped.

DB-free: uses only ``db_lookup.device_tier_samples`` / ``device_tier_thresholds``
(pure module constants), so it runs without the SGS DB.

Run from plugins/sgs-blocks/scripts:
    python -m pytest converter/tests/test_minwidth_cross_device_tier.py
"""
from __future__ import annotations

import logging

from bs4 import BeautifulSoup

from converter.services.styling_helpers import (
    _media_condition_applies_at,
    collect_css_decls_for_element,
)


def _node(html: str, cls: str):
    return BeautifulSoup(html, "html.parser").find(class_=cls)


# ---------------------------------------------------------------------------
# The real Mama's trust-bar draft (mamas-trust-bar-real.html) — the canary.
# ---------------------------------------------------------------------------

_TRUST_BAR_RULES = {
    ".sgs-trust-bar__inner": {
        "display": "grid",
        "grid-template-columns": "1fr 1fr",   # base CSS = MOBILE (2-col)
        "gap": "16px 12px",
        "max-width": "1100px",
        "margin": "0 auto",
    },
    "@media (min-width: 600px)::.sgs-trust-bar__inner": {
        "grid-template-columns": "repeat(4, 1fr)",   # desktop/tablet override (4-col)
    },
}


def test_minwidth_inverts_mobile_first_to_desktop_base():
    """min-width:600 (X-and-up) → desktop value becomes the SGS BASE; the base-CSS
    mobile value is displaced to …Mobile. The old substring match DROPPED 600."""
    node = _node('<div class="sgs-trust-bar__inner"></div>', "sgs-trust-bar__inner")
    base, bp = collect_css_decls_for_element(node, _TRUST_BAR_RULES)

    # Desktop (base): 4-col — the min-width:600 override wins at ≥1024.
    assert base["grid-template-columns"] == "repeat(4, 1fr)"
    # Mobile: 2-col — the base CSS applies at 375 (below 600).
    assert bp.get("Mobile", {}).get("grid-template-columns") == "1fr 1fr"
    # Tablet: inherits base (800 ≥ 600 → 4-col == base) → NO redundant override.
    assert "grid-template-columns" not in bp.get("Tablet", {})


def test_minwidth_never_silently_drops():
    """The declaration under @media(min-width:600) is PRESENT in the output (as the
    base value) — never the old silent drop where it appeared in neither bucket."""
    node = _node('<div class="sgs-trust-bar__inner"></div>', "sgs-trust-bar__inner")
    base, bp = collect_css_decls_for_element(node, _TRUST_BAR_RULES)
    all_values = {base.get("grid-template-columns")} | {
        d.get("grid-template-columns") for d in bp.values()
    }
    assert "repeat(4, 1fr)" in all_values  # the 4-col rule was NOT dropped


# ---------------------------------------------------------------------------
# Symmetric max-width (desktop-first) direction.
# ---------------------------------------------------------------------------

def test_maxwidth_desktop_first_routes_to_mobile():
    """max-width:767 (X-and-down) → the smaller-screen override lands on …Mobile;
    the base CSS stays the desktop base. Same calculation, opposite direction."""
    rules = {
        ".sgs-x__grid": {"grid-template-columns": "repeat(3, 1fr)"},   # desktop base
        "@media (max-width: 767px)::.sgs-x__grid": {
            "grid-template-columns": "1fr",   # mobile override (1-col)
        },
    }
    node = _node('<div class="sgs-x__grid"></div>', "sgs-x__grid")
    base, bp = collect_css_decls_for_element(node, rules)
    assert base["grid-template-columns"] == "repeat(3, 1fr)"          # desktop base
    assert bp.get("Mobile", {}).get("grid-template-columns") == "1fr"  # mobile override
    assert "grid-template-columns" not in bp.get("Tablet", {})         # tablet inherits base


def test_maxwidth_tablet_boundary_covers_mobile_and_tablet():
    """max-width:1023 covers Mobile (375) AND Tablet (800) but not Desktop (1440)."""
    rules = {
        ".sgs-x__grid": {"grid-template-columns": "repeat(4, 1fr)"},   # desktop base
        "@media (max-width: 1023px)::.sgs-x__grid": {
            "grid-template-columns": "repeat(2, 1fr)",   # tablet + mobile
        },
    }
    node = _node('<div class="sgs-x__grid"></div>', "sgs-x__grid")
    base, bp = collect_css_decls_for_element(node, rules)
    assert base["grid-template-columns"] == "repeat(4, 1fr)"           # desktop only
    assert bp.get("Tablet", {}).get("grid-template-columns") == "repeat(2, 1fr)"
    assert bp.get("Mobile", {}).get("grid-template-columns") == "repeat(2, 1fr)"


# ---------------------------------------------------------------------------
# Device-threshold min-width (768) still behaves — the historic device case.
# ---------------------------------------------------------------------------

def test_device_threshold_minwidth_768():
    """min-width:768 → Tablet (800) + Desktop (1440) get the value → base = value,
    tablet inherits base; Mobile (375) keeps the base-CSS value."""
    rules = {
        ".sgs-x__grid": {"grid-template-columns": "1fr"},              # base CSS = mobile
        "@media (min-width: 768px)::.sgs-x__grid": {
            "grid-template-columns": "repeat(3, 1fr)",
        },
    }
    node = _node('<div class="sgs-x__grid"></div>', "sgs-x__grid")
    base, bp = collect_css_decls_for_element(node, rules)
    assert base["grid-template-columns"] == "repeat(3, 1fr)"           # desktop base
    assert bp.get("Mobile", {}).get("grid-template-columns") == "1fr"  # mobile keeps base CSS
    assert "grid-template-columns" not in bp.get("Tablet", {})         # tablet inherits base


# ---------------------------------------------------------------------------
# F-ii residual — non-device threshold logged, never snapped, never dropped.
# ---------------------------------------------------------------------------

def test_non_device_threshold_logs_fii_residual(caplog):
    """min-width:600 (∉ {767,768,1023,1024}) is a D228 visual breakpoint — its
    sub-tier band is surfaced via a non-silent F-ii log, never snapped to a tier."""
    node = _node('<div class="sgs-trust-bar__inner"></div>', "sgs-trust-bar__inner")
    with caplog.at_level(logging.INFO, logger="sgs.converter.styling"):
        collect_css_decls_for_element(node, _TRUST_BAR_RULES)
    assert any("F-ii residual" in r.message for r in caplog.records)


def test_device_threshold_logs_no_residual(caplog):
    """A pure device-threshold rule (max-width:767) emits NO F-ii residual log."""
    rules = {
        ".sgs-x__grid": {"grid-template-columns": "repeat(3, 1fr)"},
        "@media (max-width: 767px)::.sgs-x__grid": {"grid-template-columns": "1fr"},
    }
    node = _node('<div class="sgs-x__grid"></div>', "sgs-x__grid")
    with caplog.at_level(logging.INFO, logger="sgs.converter.styling"):
        collect_css_decls_for_element(node, rules)
    assert not any("F-ii residual" in r.message for r in caplog.records)


# ---------------------------------------------------------------------------
# The cascade helper — boundary correctness.
# ---------------------------------------------------------------------------

def test_media_condition_applies_at_min_and_max():
    assert _media_condition_applies_at("@media (min-width: 600px)", 1440) is True
    assert _media_condition_applies_at("@media (min-width: 600px)", 375) is False
    assert _media_condition_applies_at("@media (max-width: 767px)", 375) is True
    assert _media_condition_applies_at("@media (max-width: 767px)", 800) is False


def test_media_condition_applies_at_and_band():
    cond = "@media (min-width: 768px) and (max-width: 1023px)"
    assert _media_condition_applies_at(cond, 800) is True    # inside the tablet band
    assert _media_condition_applies_at(cond, 375) is False   # below the band
    assert _media_condition_applies_at(cond, 1440) is False  # above the band
