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


def test_client_colour_keeps_raw_token_slug_not_custom():
    # Regression guard (D318 pink): a client colour with no baseline-slug match keeps its OWN draft
    # token name as the slug (surface-pink), NEVER `custom-surface-pink` and NEVER dropped — else
    # every already-cloned block referencing var(--wp--preset--color--surface-pink) breaks.
    snap = _snapshot()
    slugs = [e["slug"] for e in snap["settings"]["color"]["palette"]]
    assert "surface-pink" in slugs
    assert "custom-surface-pink" not in slugs
    # every declared solid :root colour is emitted, not dropped as "dead"
    for s in ("success", "cookie-brown", "accent-dark"):
        assert s in slugs, f"{s} declared in :root but dropped from palette"


def test_additive_merge_preserves_existing_slugs():
    # `merge_onto` must PRESERVE existing slugs the draft can't provide (warm-axis / aliases) while
    # the generated globals/base win — the non-destructive deploy (FR-33-11).
    import extract
    trace = []
    snap = {"settings": {"color": {"palette": [{"slug": "surface-pink", "color": "#f5c2c8"},
                                                {"slug": "primary", "color": "#e68a95"}]}},
            "styles": {"typography": {"fontSize": "16px"}}}
    existing = {"settings": {"color": {"palette": [{"slug": "surface-pink", "color": "#OLD"},
                                                   {"slug": "surface-peach", "color": "#fac47e"},
                                                   {"slug": "footer-bg", "color": "#3a2e26"}]},
                             "custom": {"sgs": {"headerPattern": "x"}}},
                "styles": {"css": ".focus{outline:1px}"}}
    out = extract.merge_onto(snap, existing, trace)
    slugs = {e["slug"]: e["color"] for e in out["settings"]["color"]["palette"]}
    assert slugs["surface-pink"] == "#f5c2c8"   # generated wins on a shared slug
    assert slugs["surface-peach"] == "#fac47e"  # existing extra preserved
    assert slugs["footer-bg"] == "#3a2e26"      # existing extra preserved
    assert out["styles"]["css"] == ".focus{outline:1px}"  # component CSS carried forward
    assert out["settings"]["custom"]["sgs"]["headerPattern"] == "x"


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


# ── FR-33-6 — dark-theme / preview-shell background safety ────────────────────────────────────────
def test_fr336_mamas_background_is_content_cream():
    # Mama's: widest content-containing ancestor is body itself (cream); no shell markers → no regression.
    assert extract._theme_background(_facts(), []) == "rgb(251, 243, 220)"


def test_fr336_dark_preview_shell_ignored_via_positive_signal():
    facts = {
        "body": {"backgroundColor": "rgb(42,42,42)"},
        "sections": [
            {"path": "html>body", "area": 9000000, "inChrome": False, "hasParagraph": True, "hasHeading": True, "backgroundColor": "rgb(42,42,42)"},
            {"path": "html>body>div.device-frame", "area": 8000000, "inChrome": False, "hasParagraph": True, "hasHeading": True, "backgroundColor": "rgb(42,42,42)"},
            {"path": "html>body>div.device-frame>main", "area": 6000000, "inChrome": False, "hasParagraph": True, "hasHeading": True, "backgroundColor": "rgb(255,255,255)"},
        ],
        "previewShellMarkers": [{"selector": ".device-frame", "path": "html>body>div.device-frame"}],
    }
    # the shell wrapper + everything enclosing it (body/html) are excluded → the inner light region wins
    assert extract._theme_background(facts, []) == "rgb(255,255,255)"


def test_fr336_legit_dark_theme_kept_without_markers():
    facts = {
        "body": {"backgroundColor": "rgb(18,18,18)"},
        "sections": [{"path": "html>body", "area": 9000000, "inChrome": False, "hasParagraph": True, "hasHeading": True, "backgroundColor": "rgb(18,18,18)"}],
        "previewShellMarkers": [],
    }
    assert extract._theme_background(facts, []) == "rgb(18,18,18)"   # darkness alone never discards


# ── FR-33-5 — Pass B advisory derivation ──────────────────────────────────────────────────────────
import derive  # noqa: E402
from token_map import parse_base_rules  # noqa: E402

_TOKENLESS_CSS = ("body{background:#ffffff;color:#222222}.btn,.cta{background:#0066cc;color:#fff}"
                  "a{color:#0066cc}.card{border-color:#dddddd}.success{color:#2e7d4f}")


def test_fr335_token_less_derives_advisory_palette_not_frequency_inverted():
    pal = derive.derive_palette(parse_base_rules(_TOKENLESS_CSS), [])
    assert pal, "a token-less draft should derive a palette"
    assert all(e["_source"] == "derived" and e.get("advisory") is True for e in pal)
    primary = next((e["color"] for e in pal if e["slug"] == "primary"), None)
    assert primary == "#0066cc"   # the button/link colour, NOT the most-frequent (raw frequency inverts)


def test_fr335_nothing_usable_returns_empty():
    # only a translucent decorative colour → nothing usable → [] (caller keeps the framework baseline)
    assert derive.derive_palette(parse_base_rules("body::before{background:rgba(0,0,0,0.02)}"), []) == []


def test_fr335_build_snapshot_token_less_uses_advisory_palette():
    facts = {"root": {"fontSize": "16px"},
             "body": {"backgroundColor": "rgb(255,255,255)", "color": "rgb(34,34,34)", "fontFamily": "Arial"},
             "paragraphs": [{"path": "html>body>p", "inChrome": False, "area": 10000, "textLen": 20,
                             "fontFamily": "Arial", "fontSize": "16px", "lineHeight": "25.6px", "fontWeight": "400"}],
             "headings": {}, "buttons": [],
             "sections": [{"path": "html>body", "area": 100000, "inChrome": False, "hasParagraph": True,
                           "hasHeading": False, "backgroundColor": "rgb(255,255,255)"}],
             "previewShellMarkers": []}
    baseline = json.loads((REPO / "theme" / "sgs-theme" / "theme.json").read_text(encoding="utf-8"))
    html = f"<html><head><style>{_TOKENLESS_CSS}</style></head><body><p>content here yes</p></body></html>"
    snap = extract.build_snapshot("synthetic", extract.extract_css(html), facts, html, baseline, [])
    pal = snap["settings"]["color"]["palette"]
    assert pal and all(e.get("_source") == "derived" for e in pal)


def test_fr335_mamas_pass_a_full_no_derived():
    pal = _snapshot()["settings"]["color"]["palette"]
    assert pal and not any(e.get("_source") == "derived" or e.get("advisory") for e in pal)


def test_fr335_push_strips_advisory_tokens():
    import importlib.util
    spec = importlib.util.spec_from_file_location("pts_test", SCRIPTS / "push-theme-snapshot.py")
    pts = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(pts)
    snap = {"settings": {"color": {"palette": [
        {"slug": "primary", "color": "#e68a95", "_source": "declared"},
        {"slug": "surface", "color": "#ffffff", "_source": "derived", "advisory": True}]}}}
    out, n = pts.strip_advisory(snap)
    assert n == 1
    assert [e["slug"] for e in out["settings"]["color"]["palette"]] == ["primary"]
    assert len(snap["settings"]["color"]["palette"]) == 2   # original untouched (deepcopy)
