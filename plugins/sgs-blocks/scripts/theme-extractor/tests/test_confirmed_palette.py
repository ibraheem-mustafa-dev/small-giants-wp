"""Spec 48 FR-33-2 — the snapshot palette follows Bean's confirmed intake roles (confirmed_palette.py).

Run:  cd plugins/sgs-blocks/scripts && python -m pytest theme-extractor/tests/test_confirmed_palette.py -q

Browser-free: unit cases on synthetic intake data, plus build_snapshot on the checked-in bakery-client
draft and facts, where the confirmed map deliberately differs from the extractor's own proposal.
"""
from __future__ import annotations

import json
import pathlib
import re
import sys

import pytest

HERE = pathlib.Path(__file__).resolve().parent
PKG = HERE.parent
SCRIPTS = PKG.parent
REPO = SCRIPTS.parents[2]
sys.path.insert(0, str(PKG))

import confirmed_palette as cp  # noqa: E402
import extract  # noqa: E402

BASELINE = json.loads((REPO / "theme" / "sgs-theme" / "theme.json").read_text(encoding="utf-8"))
FRAMEWORK = cp.framework_slugs(BASELINE)
DRAFT = REPO / "sites/mamas-munches/mockups/homepage/index.html"
FACTS = PKG / "mamas-computed-facts.json"


def _intake(rows, marks):
    """rows: [(token, hex, proposed role)], marks: {token: mark}."""
    return {"palette": {"rows": [{"token": t, "hex": h, "role": r} for t, h, r in rows]},
            "review": [{"rowId": f"palette:{t}", "rowType": "palette-role", "mark": m} for t, m in marks.items()]
            + [{"rowId": "page:home", "rowType": "page-map", "mark": "accept"}]}


# ── confirmed_map ───────────────────────────────────────────────────────────────────────────────
def test_marks_resolve_to_slugs():
    intake = _intake(
        [("--blue", "#0A7EA8", "primary"), ("--topbar", "#0a7ea8", "custom-topbar"),
         ("--slate", "#2C3E50", "heading"), ("--fb", "#1877F2", "custom-fb"), ("--spare", "#EEEEEE", None)],
        {"--blue": "accept", "--topbar": "role:primary", "--slate": "role:footer-bg", "--fb": "one-off",
         "--spare": "accept"})
    confirmed, unmarked = cp.confirmed_map(intake, FRAMEWORK)
    # A confirmed colour keeps the case its first token writes it in.
    assert confirmed == {"primary": {"hex": "#0A7EA8", "tokens": ["--blue", "--topbar"]},
                         "footer-bg": {"hex": "#2C3E50", "tokens": ["--slate"]}}
    assert unmarked == []


def test_one_mark_can_give_a_draft_colour_several_roles():
    intake = _intake([("--text-heading", "#2C3E50", "heading")],
                     {"--text-heading": "role:heading, accent-text,section-text"})
    confirmed, _ = cp.confirmed_map(intake, FRAMEWORK)
    assert confirmed == {slug: {"hex": "#2C3E50", "tokens": ["--text-heading"]}
                         for slug in ("heading", "accent-text", "section-text")}


def test_accept_takes_every_role_the_proposal_gave_one_value():
    intake = _intake([("--ink", "#3A2A22", "text")], {"--ink": "accept"})
    intake["palette"]["rows"][0]["roles"] = ["text", "heading", "border"]
    confirmed, _ = cp.confirmed_map(intake, FRAMEWORK)
    assert sorted(confirmed) == ["border", "heading", "text"]


COLOURS = cp.framework_colours(BASELINE)
REDESIGN = REPO / "sites/mamas-munches-redesign/build/intake/intake.json"


def _translucent_rows():
    """The redesign client's real intake rows whose colour carries alpha (--mm-rule, --mm-rule-soft, --mm-tape)."""
    rows = json.loads(REDESIGN.read_text(encoding="utf-8"))["palette"]["rows"]
    picked = [(r["token"], r["hex"], r["role"]) for r in rows if len(r["hex"]) == 9]
    assert {t for t, _, _ in picked} == {"--mm-rule", "--mm-rule-soft", "--mm-tape"}
    return picked


def test_must_fail_a_translucent_custom_colour_is_confirmed_with_its_alpha():
    rows = _translucent_rows()
    intake = _intake(rows, {t: "accept" for t, _, _ in rows})
    confirmed, _ = cp.confirmed_map(intake, FRAMEWORK, COLOURS)
    assert confirmed == {r: {"hex": h, "tokens": [t]} for t, h, r in rows}
    snap = {"settings": {"color": {"palette": []}}}
    cp.apply_confirmed(snap, confirmed, FRAMEWORK, [], frozenset())
    assert {e["slug"]: e["color"] for e in snap["settings"]["color"]["palette"]} == {r: h for t, h, r in rows}


def test_must_fail_a_translucent_colour_fills_a_framework_slug_only_at_the_framework_alpha():
    token, hexv, _ = _translucent_rows()[0]
    assert set(COLOURS) == set(FRAMEWORK) and re.fullmatch(r"#[0-9a-fA-F]{6}", COLOURS["border"]), "framework colours are read"
    with pytest.raises(cp.ConfirmError, match=r"alpha 4d but the framework slug 'border' has alpha ff"):
        cp.confirmed_map(_intake([(token, hexv, "border")], {token: "accept"}), FRAMEWORK, COLOURS)
    same = {**COLOURS, "border": "#00000033"}
    confirmed, _ = cp.confirmed_map(_intake([("--line", "#11223333", "border")], {"--line": "accept"}), FRAMEWORK, same)
    assert confirmed["border"]["hex"] == "#11223333"
    opaque, _ = cp.confirmed_map(_intake([("--ink", "#3A2A22FF", "text")], {"--ink": "accept"}), FRAMEWORK, COLOURS)
    assert opaque["text"]["hex"] == "#3A2A22", "a fully opaque alpha byte is dropped"


EYE_CARE = REPO / "sites/eye-care-ward-end/build/intake/intake.json"


def test_must_fail_near_identical_tokens_on_one_slug_keep_the_colour_that_earned_the_role():
    # Eye Care's real rows: --acc-soft (#EFEAE2) and --surface-soft (#F0EBE3) differ by under ΔE 1, so intake merges
    # them and Accept all gives both accent-light. The draft paints #EFEAE2 (the group's `value`), so that colour
    # earned the role, whichever is declared first and whatever order the marks come in.
    real = {r["token"]: r for r in json.loads(EYE_CARE.read_text(encoding="utf-8"))["palette"]["rows"]}
    assert real["--surface-soft"]["value"] == real["--acc-soft"]["value"] == "#EFEAE2"

    def intake(order):
        rows = [dict(real[t], role="accent-light") for t in order]
        return {"palette": {"rows": rows}, "review": [{"rowId": f"palette:{t}", "rowType": "palette-role", "mark": "accept"} for t in order]}

    for order in (("--surface-soft", "--acc-soft"), ("--acc-soft", "--surface-soft")):
        confirmed, _ = cp.confirmed_map(intake(order), FRAMEWORK, COLOURS)
        assert confirmed["accent-light"]["hex"] == "#EFEAE2", order
        assert sorted(confirmed["accent-light"]["tokens"]) == ["--acc-soft", "--surface-soft"]
    # With no painted value recorded (an older intake record), the token declared first keeps its colour.
    pair = [(t, real[t]["hex"], "accent-light") for t in ("--surface-soft", "--acc-soft")]
    old, _ = cp.confirmed_map(_intake(pair, {t: "accept" for t, _, _ in pair}), FRAMEWORK, COLOURS)
    assert old["accent-light"]["hex"] == "#F0EBE3"
    with pytest.raises(cp.ConfirmError, match="one slug cannot hold two colours"):
        cp.confirmed_map(_intake([("--a", "#EFEAE2", "accent-light"), ("--b", "#E6E1DA", "accent-light")], {"--a": "accept", "--b": "accept"}), FRAMEWORK, COLOURS)
    with pytest.raises(cp.ConfirmError, match="one slug cannot hold two colours"):
        cp.confirmed_map(_intake([("--a", "#3A2A224D", "custom-rule"), ("--b", "#3A2A2247", "custom-rule")], {"--a": "accept", "--b": "accept"}), FRAMEWORK, COLOURS)


@pytest.mark.parametrize("mark", ["role:heading,brand-blue", "role:heading,", "role:,heading"])
def test_a_bad_slug_anywhere_in_a_several_role_mark_is_refused(mark):
    intake = _intake([("--text-heading", "#2C3E50", "heading")], {"--text-heading": mark})
    with pytest.raises(cp.ConfirmError, match="neither a framework palette slug"):
        cp.confirmed_map(intake, FRAMEWORK)


def test_two_hexes_on_one_slug_are_refused():
    intake = _intake([("--a", "#111111", "accent"), ("--b", "#222222", "custom-b")],
                     {"--a": "accept", "--b": "role:accent"})
    with pytest.raises(cp.ConfirmError, match="cannot hold two colours"):
        cp.confirmed_map(intake, FRAMEWORK)


@pytest.mark.parametrize("mark", ["role:brand-blue", "role:Custom-Ink", "role:custom-", "role:"])
def test_a_slug_that_is_not_real_is_refused(mark):
    intake = _intake([("--a", "#111111", "custom-a")], {"--a": mark})
    with pytest.raises(cp.ConfirmError, match="neither a framework palette slug"):
        cp.confirmed_map(intake, FRAMEWORK)


def test_unknown_mark_and_unknown_token_are_refused():
    with pytest.raises(cp.ConfirmError, match="unrecognised palette mark"):
        cp.confirmed_map(_intake([("--a", "#111111", "accent")], {"--a": "maybe"}), FRAMEWORK)
    intake = _intake([], {"--ghost": "accept"})
    with pytest.raises(cp.ConfirmError, match="no row for it"):
        cp.confirmed_map(intake, FRAMEWORK)


def test_unmarked_rows_are_reported_not_confirmed():
    confirmed, unmarked = cp.confirmed_map(
        _intake([("--a", "#111111", "accent"), ("--b", "#222222", "text")], {"--a": "accept"}), FRAMEWORK)
    assert set(confirmed) == {"accent"} and unmarked == ["--b"]


# ── apply_confirmed ─────────────────────────────────────────────────────────────────────────────
def test_apply_sets_drops_adds_and_clears_the_proposal_keys():
    snap = {"settings": {"color": {"palette": [
        {"slug": "primary", "color": "#0a7ea8", "name": "Primary", "_source": "derived", "advisory": True,
         "confidence": 0.8, "_baseline_color": "#1F7A7A"},
        {"slug": "accent", "color": "#F59E0B", "name": "Accent"},
        {"slug": "success", "color": "#2E7D4F", "name": "Success"},
        {"slug": "surface-topbar", "color": "#0a7ea8", "name": "Surface Topbar"},
        {"slug": "custom-old", "color": "#123456", "name": "Old"}]}}}
    confirmed = {"primary": {"hex": "#0a7ea8", "tokens": ["--blue"]},
                 "accent": {"hex": "#d8ca50", "tokens": ["--gold"]},
                 "custom-ink": {"hex": "#1e2a3c", "tokens": ["--ink"]}}
    trace: list = []
    # surface-topbar is this draft's token slug; custom-old is a client slug the snapshot already held.
    cp.apply_confirmed(snap, confirmed, FRAMEWORK, trace, frozenset({"surface-topbar", "custom-surface-topbar"}))
    pal = {e["slug"]: e for e in snap["settings"]["color"]["palette"]}
    assert set(pal) == {"primary", "accent", "success", "custom-ink", "custom-old"}
    assert pal["accent"]["color"] == "#d8ca50" and pal["custom-ink"]["color"] == "#1e2a3c"
    assert pal["success"]["color"] == "#2E7D4F"  # a framework slug nobody confirmed stays
    assert not {"advisory", "confidence", "_baseline_color"} & set(pal["primary"])
    assert pal["primary"]["_source"] == "confirmed"
    actions = sorted((r["slug"], r["action"]) for r in trace)
    assert actions == [("accent", "set"), ("custom-ink", "added"), ("custom-old", "kept"),
                       ("primary", "set"), ("surface-topbar", "dropped")]
    # idempotent: a second pass (after merge_onto) changes nothing (it logs only the kept client slug)
    again: list = []
    cp.apply_confirmed(snap, confirmed, FRAMEWORK, again, frozenset({"surface-topbar"}))
    assert [(r["slug"], r["action"]) for r in again] == [("custom-old", "kept")]


def test_draft_slugs_name_both_proposal_forms():
    assert cp.draft_custom_slugs(_intake([("--brand-blue", "#0a7ea8", "primary")], {})) == {"brand-blue", "custom-brand-blue"}


# ── build_snapshot on a real draft: the confirmed map differs from the extractor's proposal ────────
INTAKE = _intake(
    [("--cookie-brown", "#8b6f4e", "custom-cookie-brown"), ("--surface-pink", "#f5c2c8", "custom-surface-pink"),
     ("--accent-dark", "#7a6500", "custom-accent-dark"), ("--primary", "#e68a95", "primary")],
    {"--cookie-brown": "role:footer-bg", "--surface-pink": "one-off", "--accent-dark": "accept",
     "--primary": "accept"})


def _build(confirmed):
    html = DRAFT.read_text(encoding="utf-8")
    css = "\n".join(re.findall(r"<style[^>]*>(.*?)</style>", html, re.DOTALL))
    facts = json.loads(FACTS.read_text(encoding="utf-8"))
    return extract.build_snapshot("bakery-client", css, facts, html, BASELINE, [], REPO, confirmed=confirmed,
                                  draft_slugs=cp.draft_custom_slugs(INTAKE))


def _assert_follows_confirmed(snap):
    pal = {e["slug"]: e["color"].lower() for e in snap["settings"]["color"]["palette"]}
    assert pal.get("footer-bg") == "#8b6f4e"
    assert pal.get("custom-accent-dark") == "#7a6500"
    assert pal.get("primary") == "#e68a95"
    for slug in ("cookie-brown", "surface-pink", "accent-dark"):
        assert slug not in pal, f"{slug} is not a confirmed role and must not be in the palette"


def test_snapshot_follows_the_confirmed_map():
    confirmed, _ = cp.confirmed_map(INTAKE, FRAMEWORK)
    _assert_follows_confirmed(_build(confirmed))


def test_negative_control_the_extractor_proposal_alone_fails_the_check():
    # MUST FAIL without the confirm step: the extractor proposes cookie-brown / surface-pink /
    # accent-dark as raw slugs and never puts #8b6f4e on footer-bg.
    with pytest.raises(AssertionError):
        _assert_follows_confirmed(_build(None))


# ── merge_onto keeps the client's settings.custom keys the extractor does not derive ───────────────
def test_merge_carries_client_custom_keys_and_keeps_derived_ones():
    snap = {"settings": {"custom": {"focus": {"ring": "var(--wp--preset--color--accent)"},
                                    "buttonPresets": {"primary": {"background": "#new"}},
                                    "header": {}}}, "styles": {}}
    existing = {"settings": {"custom": {"focus": {"ring": "#815311"},
                                        "buttonPresets": {"primary": {"background": "#old"}},
                                        "duration": {"slow": "560ms"},
                                        "sgs": {"headerPattern": "sgs/framework-header-default"}}},
                "styles": {}}
    out = extract.merge_onto(snap, existing, [])
    custom = out["settings"]["custom"]
    assert custom["focus"]["ring"] == "#815311"
    assert custom["duration"]["slow"] == "560ms"
    assert custom["sgs"]["headerPattern"] == "sgs/framework-header-default"
    assert custom["buttonPresets"]["primary"]["background"] == "#new"


def test_a_none_mark_is_no_correction_and_not_an_error():
    """FR-32-28: a mark is a correction, so a row with no mark names no slug and raises nothing."""
    assert cp._mark_slugs("--x", None, {"role": "heading"}) == []
    with pytest.raises(cp.ConfirmError):
        cp._mark_slugs("--x", "bogus", {})
