"""Spec 48 FR-33-2, FR-33-11: a re-extraction of a Spec 48A draft keeps what the draft does not restate.

Run:  cd plugins/sgs-blocks/scripts && python -m pytest theme-extractor/tests/test_rebuild_keeps_client_values.py -q

Built from the optician client's committed snapshot (sites/eye-care-ward-end/theme-snapshot.json, the approved
build): an undeclared primary-dark follows this client's own primary, never the framework teal; a client slug the
existing snapshot holds keeps its name when Bean confirms its token as ``custom-<name>``; a radius, accent set or
page padding this run did not derive keeps the client's value; a measured button colour equal to a palette colour
references its slug whatever the draft's kind.
"""
from __future__ import annotations

import copy
import json
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
PKG = HERE.parent
REPO = PKG.parents[3]
sys.path.insert(0, str(PKG))

import confirmed_palette as cp  # noqa: E402
import extract  # noqa: E402
import palette_refs  # noqa: E402
import role_defaults  # noqa: E402

BASELINE = json.loads((REPO / "theme" / "sgs-theme" / "theme.json").read_text(encoding="utf-8"))
COMMITTED = json.loads((REPO / "sites" / "eye-care-ward-end" / "theme-snapshot.json").read_text(encoding="utf-8"))
FRAMEWORK = cp.framework_slugs(BASELINE)


def _pal(snap):
    return {e["slug"]: e for e in snap["settings"]["color"]["palette"]}


def test_must_fail_an_undeclared_primary_dark_follows_this_clients_primary_and_link_hover_follows_it():
    snap = copy.deepcopy(BASELINE)
    pal = snap["settings"]["color"]["palette"]
    next(e for e in pal if e["slug"] == "primary").update(color="#141414", _source="confirmed")
    role_defaults.apply_role_defaults(snap, BASELINE, [])
    got = _pal(snap)
    assert got["primary-dark"]["color"] == _pal(COMMITTED)["primary-dark"]["color"] == "#0F0F0F"
    assert got["primary-dark"]["_source"] == "derived"
    assert got["link-hover"]["color"] == "#0F0F0F"
    confirmed = copy.deepcopy(BASELINE)
    for e in confirmed["settings"]["color"]["palette"]:
        if e["slug"] == "primary":
            e.update(color="#141414", _source="confirmed")
        if e["slug"] == "primary-dark":
            e.update(color="#2A2A2A", _source="confirmed")
    role_defaults.apply_role_defaults(confirmed, BASELINE, [])
    assert _pal(confirmed)["primary-dark"]["color"] == "#2A2A2A", "a confirmed primary-dark is kept"


def test_must_fail_a_confirmed_custom_colour_keeps_the_client_slug_the_snapshot_already_holds():
    assert "border-strong" not in FRAMEWORK and _pal(COMMITTED)["border-strong"]["color"] == "#D8D2C8"
    snap = {"settings": {"color": {"palette": copy.deepcopy(COMMITTED["settings"]["color"]["palette"])
                                   + [{"slug": "custom-border-strong", "color": "#D8D2C8", "name": "Border Strong"}]}}}
    confirmed = {"custom-border-strong": {"hex": "#D8D2C8", "tokens": ["--border-strong"]},
                 "custom-surface-alt": {"hex": "#F3F0EB", "tokens": ["--surface-alt"]}}
    client = frozenset(e["slug"] for e in COMMITTED["settings"]["color"]["palette"])
    cp.apply_confirmed(snap, confirmed, FRAMEWORK, [], frozenset({"border-strong", "custom-border-strong", "surface-alt", "custom-surface-alt"}), client)
    got = _pal(snap)
    assert got["border-strong"]["color"] == "#D8D2C8" and got["border-strong"]["_source"] == "confirmed"
    assert "custom-border-strong" not in got
    assert "custom-surface-alt" in got, "a framework slug's name is never taken by a custom colour"
    plain = {"settings": {"color": {"palette": [{"slug": "custom-border-strong", "color": "#D8D2C8"}]}}}
    cp.apply_confirmed(plain, {"custom-border-strong": {"hex": "#D8D2C8", "tokens": ["--border-strong"]}}, FRAMEWORK, [])
    assert "custom-border-strong" in _pal(plain), "with no client slug of that name the custom name stands"


def test_must_fail_values_this_run_did_not_derive_keep_the_clients():
    snap = copy.deepcopy(BASELINE)  # a run that derived no radius, accent set or page padding
    merged = extract.merge_onto(snap, copy.deepcopy(COMMITTED), [], BASELINE)
    assert merged["settings"]["custom"]["borderRadius"] == COMMITTED["settings"]["custom"]["borderRadius"]
    assert merged["settings"]["custom"]["accentSets"] == COMMITTED["settings"]["custom"]["accentSets"]
    assert merged["styles"]["spacing"] == COMMITTED["styles"]["spacing"]
    derived = copy.deepcopy(BASELINE)
    derived["settings"]["custom"]["borderRadius"] = {"small": "2px", "medium": "2px", "large": "2px"}
    out = extract.merge_onto(derived, copy.deepcopy(COMMITTED), [], BASELINE)
    assert out["settings"]["custom"]["borderRadius"]["medium"] == "2px", "a radius this run derived wins"


def test_must_fail_measured_button_colours_reference_palette_slugs():
    snap = {"settings": {"color": {"palette": [{"slug": "primary", "color": "#141414"}, {"slug": "primary-text", "color": "#FAF8F5"},
                                               {"slug": "accent-text", "color": "#2C3E50"}]},
                         "custom": {"buttonPresets": {"primary": {"background": "#141414", "text": "#faf8f5", "border": "#FAF8F5",
                                                                  "hover-background": "#2c3e50", "hover-border": "#123456"}}}}}
    palette_refs.tokenise_button_presets(snap, [], {"primary": {"background": 1, "text": 1, "border": 1, "hover-background": 1, "hover-border": 1}})
    got = snap["settings"]["custom"]["buttonPresets"]["primary"]
    assert got == {"background": "var(--wp--preset--color--primary)", "text": "var(--wp--preset--color--primary-text)",
                   "border": "var(--wp--preset--color--primary-text)",
                   "hover-background": "#2c3e50", "hover-border": "#123456"}, "a fill never references a text slug that only shares its hex"
