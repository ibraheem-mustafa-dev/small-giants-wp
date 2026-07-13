"""Spec 33 draft global-styles extractor — unit + golden + determinism tests.

Run:  cd plugins/sgs-blocks/scripts && python -m pytest theme-extractor/tests -q

The tests are browser-free: they run against the checked-in ``mamas-computed-facts.json`` fixture,
so they are deterministic and need no Playwright. The one live-browser leg is the Mama's reclone
proof (Phase 4), done manually, not here.
"""
from __future__ import annotations

import json
import pathlib
import sys

import pytest

HERE = pathlib.Path(__file__).resolve().parent
PKG = HERE.parent
SCRIPTS = PKG.parent
REPO = SCRIPTS.parents[2]
sys.path.insert(0, str(PKG))       # theme-extractor modules
sys.path.insert(0, str(SCRIPTS))   # so `converter` package resolves for the freeze test

import extract  # noqa: E402
import token_map  # noqa: E402
import typography as typo  # noqa: E402
from colour import Colour, dedupe, parse_colour  # noqa: E402
from roles import infer_role  # noqa: E402
from schema_validate import validate_theme_json  # noqa: E402

DRAFT = REPO / "sites" / "mamas-munches" / "mockups" / "homepage" / "index.html"
FACTS = PKG / "mamas-computed-facts.json"
EXPECTED = PKG / "expected"


def _facts():
    return json.loads(FACTS.read_text(encoding="utf-8"))


def _css():
    import re
    html = DRAFT.read_text(encoding="utf-8")
    return "\n".join(re.findall(r"<style[^>]*>(.*?)</style>", html, re.DOTALL))


def _snapshot():
    baseline = json.loads((REPO / "theme" / "sgs-theme" / "theme.json").read_text(encoding="utf-8"))
    html = DRAFT.read_text(encoding="utf-8")
    return extract.build_snapshot("mamas-munches", _css(), _facts(), html, baseline, [])


# ── FR-33-3 — the D303 drift-killer ─────────────────────────────────────────────────────────────
def test_d303_base_body_is_16px():
    snap = _snapshot()
    assert snap["styles"]["typography"]["fontSize"] == "16px"   # brand quote inherits 16, not 18
    assert snap["styles"]["typography"]["lineHeight"] == "1.6"


def test_d303_heading_line_height_is_1_2_not_hero_1_15():
    snap = _snapshot()
    heading = snap["styles"]["elements"]["heading"]["typography"]
    assert heading["lineHeight"] == "1.2"          # global base, NOT the hero's 1.15 override
    assert "letterSpacing" not in heading          # never synthesise the fabricated tracking
    assert snap["styles"]["elements"]["h1"]["typography"]["lineHeight"] == "1.2"


def test_chrome_heading_excluded():
    snap = _snapshot()
    assert "h5" not in snap["styles"]["elements"]   # h5 only rendered in the footer (chrome)


def test_rem_resolves_against_real_root_not_16():
    # a 62.5% root → 10px; 1rem must resolve to 10, not the hardcoded 16.
    assert typo._px("1rem", 10.0) == 10.0
    assert typo._px("1.5rem", 10.0) == 15.0
    assert typo._px("16px", 10.0) == 16.0


# ── FR-33-2 — role by usage-context; ΔE alpha-axis ──────────────────────────────────────────────
def test_primary_is_the_coral_button_background():
    snap = _snapshot()
    by = {e["slug"]: e["color"] for e in snap["settings"]["color"]["palette"]}
    assert by["primary"] == "#e68a95"       # the button bg, NOT the near-white footer-link colour
    assert by["text"] == "#3a2e26"
    assert by["surface"] == "#fbf3dc"


def test_role_by_context_success():
    ev = [{"propfam": "background", "role_ctx": "success", "property": "background",
           "selector": ".badge.success", "colour": parse_colour("#2e7d4f")}]
    role, conf, _ = infer_role(ev)
    assert role == "success"


def test_alpha_is_a_separate_axis():
    solids = [("a", Colour("#e68a95", 1.0), 0), ("b", Colour("#e68a95", 0.1), 1)]
    clusters = dedupe(solids)
    assert len(clusters) == 2   # same hex, different alpha → NOT deduped


def test_near_colours_dedup_at_delta_e_1():
    near = [("a", Colour("#e68a95", 1.0), 0), ("b", Colour("#e78b96", 1.0), 1)]
    assert len(dedupe(near)) == 1   # ΔE 0.29 ≤ 1 → merged


# ── FR-33-4 — button presets: alpha preserved (transparent stays transparent) ───────────────────
def test_transparent_button_bg_not_opaque_black():
    # Regression guard: the draft's `background: transparent` computes to rgba(0,0,0,0); it MUST
    # serialise to 'transparent', never opaque '#000000' (the live secondary/outline CTA bug).
    snap = _snapshot()
    presets = snap["settings"]["custom"]["buttonPresets"]
    assert presets["secondary"]["background"] == "transparent"
    assert presets["outline"]["background"] == "transparent"
    assert presets["primary"]["background"] == "#e68a95"   # opaque still emits hex


# ── FR-33-4 — clamp verbatim / value coverage ───────────────────────────────────────────────────
def test_clamp_kept_verbatim_in_token_map():
    css = ":root{ --measure: clamp(1rem, 2vw, 3rem); --c:#fff; }"
    tm = token_map.build_draft_root_token_map(css)
    assert tm["measure"] == "clamp(1rem, 2vw, 3rem)"   # never recomputed


def test_var_chain_resolves_with_fallback():
    css = ":root{ --a:#123456; --b: var(--a); --c: var(--missing, #abcdef); }"
    tm = token_map.build_draft_root_token_map(css)
    assert tm["b"] == "#123456"
    assert tm["c"] == "#abcdef"


# ── FR-33-7 — schema validation catches a malformed emit ────────────────────────────────────────
def test_schema_rejects_malformed_emit():
    ok, _ = validate_theme_json({"version": 2, "settings": {}, "styles": {}})   # wrong version
    assert not ok
    ok2, _ = validate_theme_json({"version": 3, "settings": {"color": {"palette": [{"slug": "x"}]}},
                                  "styles": {}})   # palette entry missing `color`
    assert not ok2


def test_valid_snapshot_passes_schema():
    ok, errors = validate_theme_json(_snapshot())
    assert ok, errors


# ── FR-33-8 — determinism ───────────────────────────────────────────────────────────────────────
def test_determinism_byte_identical():
    a = json.dumps(_snapshot(), indent=2, ensure_ascii=False, sort_keys=False)
    b = json.dumps(_snapshot(), indent=2, ensure_ascii=False, sort_keys=False)
    assert a == b


# ── FR-33-7 — golden diff ───────────────────────────────────────────────────────────────────────
def test_matches_golden_snapshot():
    golden = json.loads((EXPECTED / "mamas-munches.snapshot.json").read_text(encoding="utf-8"))
    got = _snapshot()
    # compare the extracted subtrees (the golden also carries baseline passthrough)
    assert got["settings"]["color"]["palette"] == golden["settings"]["color"]["palette"]
    assert got["styles"]["typography"] == golden["styles"]["typography"]
    assert got["styles"]["elements"] == golden["styles"]["elements"]


# ── FR-33-10 — the frozen hex-only helper is byte-identical ─────────────────────────────────────
def test_frozen_colour_map_unchanged():
    from converter.services.styling_helpers import build_draft_root_colour_map
    got = build_draft_root_colour_map(_css())
    expected = json.loads((EXPECTED / "mamas-hex-colour-map.json").read_text(encoding="utf-8"))
    assert got == expected   # widening/altering the frozen helper (D306/D307 risk) fails here
