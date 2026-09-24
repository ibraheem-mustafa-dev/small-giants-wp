"""Screen route: which screen of a multi-screen draft a clone run turns into the page.

Run:  cd plugins/sgs-blocks/scripts && python -m pytest tests/test_screen_route.py -q
"""
from __future__ import annotations

import importlib.util
import pathlib

import pytest

SCRIPTS = pathlib.Path(__file__).resolve().parents[1]
REPO = SCRIPTS.parents[2]
_spec = importlib.util.spec_from_file_location("screen_route_under_test", SCRIPTS / "orchestrator" / "screen_route.py")
sr = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(sr)

README = """# Handoff

## Routes / views

| Prototype view | Route | Purpose |
|---|---|---|
| `home` | `/` | Landing |
| `about` | `/about` | About us |

## Screens

### 2. Home

- **Hero** - eyebrow "WELCOME TO THE SHOP", headline, a "Photo to come" state.
- **Shape tiles** - a row of shapes with a "Photo to come" state.
- **Four reasons panel** - numbered reasons.
- **Reviews strip** - review cards.

### 3. About

- **Team** - the people.
"""

TAGGED = """<html><body>
<header data-sgs-boundary-id="b1">Menu</header>
<sc-if hint-placeholder-val="{{ true }}" value="{{ isHome }}"><main data-screen-label="Home">
<section data-sgs-boundary-id="b2"><p>WELCOME TO THE SHOP</p><h1>Designer shades</h1></section>
<section data-sgs-boundary-id="b3"><h2>Start with a shape</h2><p>Photo to come</p></section>
<section data-sgs-boundary-id="b4"><h2>Why us</h2><p>Four reasons, none of them a discount</p></section>
<div data-sgs-boundary-id="b5"><span>Photo to come</span></div>
</main></sc-if>
<sc-if hint-placeholder-val="{{ false }}" value="{{ isAbout }}"><main data-screen-label="About" data-sgs-boundary-id="b6">
<h2>The team</h2><p>Fatima and friends</p></main></sc-if>
<footer data-sgs-boundary-id="b7">Foot</footer>
</body></html>"""


def _voter():
    return {"boundaries": [{"boundary_id": f"b{n}", "boundary_kind": "container"} for n in range(1, 8)]}


def _run(tmp_path, tagged=TAGGED, readme=README, requested=None):
    if readme is not None:
        (tmp_path / "README.md").write_text(readme, encoding="utf-8")
    voter = _voter()
    return voter, sr.apply(voter, tagged, tmp_path, requested)


def test_the_readme_route_slash_chooses_the_screen_and_other_screens_are_marked(tmp_path):
    voter, summary = _run(tmp_path)
    roles = {b["boundary_id"]: b["screen_role"] for b in voter["boundaries"]}
    assert summary["chosen"] == "Home" and summary["chosen_by"] == "README route /"
    assert roles == {"b1": "outside", "b2": "default", "b3": "default", "b4": "default", "b5": "default",
                     "b6": "other", "b7": "outside"}
    about = next(s for s in summary["screens"] if s["label"] == "About")
    assert about["boundaries"] == ["b6"] and about["text_chars"] > 0


def test_a_screen_can_be_requested_and_an_unknown_one_halts(tmp_path):
    voter, summary = _run(tmp_path, requested="about")
    assert summary["chosen"] == "About" and summary["chosen_by"] == "--screen"
    assert {b["boundary_id"]: b["screen_role"] for b in voter["boundaries"]}["b2"] == "other"
    with pytest.raises(sr.ScreenRouteError, match="matches no screen"):
        _run(tmp_path, requested="nowhere")


def test_readme_and_draft_marker_that_disagree_halt(tmp_path):
    swapped = TAGGED.replace('hint-placeholder-val="{{ true }}" value="{{ isHome }}"', 'hint-placeholder-val="{{ false }}" value="{{ isHome }}"') \
        .replace('hint-placeholder-val="{{ false }}" value="{{ isAbout }}"', 'hint-placeholder-val="{{ true }}" value="{{ isAbout }}"')
    with pytest.raises(sr.ScreenRouteError, match="Pass --screen"):
        _run(tmp_path, tagged=swapped)


def test_the_draft_marker_alone_is_enough_and_no_default_at_all_is_inactive(tmp_path):
    _voter_out, summary = _run(tmp_path, readme=None)
    assert summary["chosen"] == "Home" and summary["chosen_by"] == "draft default marker"
    bare = TAGGED.replace('hint-placeholder-val="{{ true }}"', 'hint-placeholder-val="{{ false }}"')
    voter, summary = _run(tmp_path, tagged=bare, readme=None)
    assert summary["active"] is False and all("screen_role" not in b for b in voter["boundaries"])


def test_fewer_than_two_screens_leaves_the_draft_completely_alone(tmp_path):
    one = TAGGED.split('<sc-if hint-placeholder-val="{{ false }}"')[0] + "</body></html>"
    voter, summary = _run(tmp_path, tagged=one)
    assert summary is None and all("screen" not in b for b in voter["boundaries"])
    voter, summary = _run(tmp_path, tagged="<html><body><section data-sgs-boundary-id=\"b2\">x</section></body></html>")
    assert summary is None and all("screen_role" not in b for b in voter["boundaries"])


def test_readme_labels_use_verbatim_unique_phrases_only(tmp_path):
    voter, summary = _run(tmp_path)
    labels = {b["boundary_id"]: b.get("readme_section") for b in voter["boundaries"]}
    assert labels["b2"] == "Hero"  # its quoted eyebrow appears once in the whole draft
    assert labels["b4"] == "Four reasons panel"  # the name minus its trailing word
    assert labels["b3"] is None  # "Photo to come" recurs, so it identifies nothing
    assert labels["b6"] is None and labels["b1"] is None  # not on the chosen screen


def test_a_phrase_matching_two_boundaries_labels_neither(tmp_path):
    twice = TAGGED.replace("<h2>Start with a shape</h2>", "<h2>Start with a shape, four reasons why</h2>")
    voter, _summary = _run(tmp_path, tagged=twice)
    labels = {b["boundary_id"]: b.get("readme_section") for b in voter["boundaries"]}
    assert labels["b3"] is None and labels["b4"] is None  # "four reasons" is in both, so it labels neither


def test_the_real_eye_care_draft_readme_routes_home_to_slash():
    draft = REPO / "sites" / "eye-care-ward-end" / "design_handoff_ward_end_eye_care"
    readme = (draft / "README.md").read_text(encoding="utf-8")
    routes = sr.read_readme_routes(readme)
    screens = [{"label": "Home", "flag": "isHome", "default_marker": True}, {"label": "Lenses", "flag": "isLenses", "default_marker": False},
               {"label": "Order confirmed", "flag": "isDone", "default_marker": False}]
    chosen, how = sr.choose_screen(screens, routes, None)
    assert chosen["label"] == "Home" and how == "README route /"
    assert sr.choose_screen(screens, routes, "lenses")[0]["label"] == "Lenses"
    assert [s["name"] for s in sr.read_screen_sections(readme, ["Home", "home"])][:2] == ["Hero", "Shape tiles"]


# ── Overlay content (draft manifest) ──────────────────────────────────────────────────────────

OVERLAY_TAGGED = TAGGED.replace(
    '<footer data-sgs-boundary-id="b7">Foot</footer>',
    '<footer data-sgs-boundary-id="b7">Foot</footer>'
    '<sc-if value="{{ megaAny }}"><sc-if value="{{ megaSun }}"><a data-sgs-boundary-id="b8">{{ s.name }}</a></sc-if></sc-if>'
    '<sc-if value="{{ lensOpen }}"><aside data-sgs-boundary-id="b9">{{ cur.brand }}</aside></sc-if>'
    '<sc-if value="{{ promoOn }}"><div data-sgs-boundary-id="b10">Sale banner</div></sc-if>')

MANIFEST = {"entities": [
    {"id": "overlay:megaAny", "kind": "mega", "target": "sgs_mega_menu post", "flag": "megaAny",
     "panels": ["megaSun", "megaBrands"]},
    {"id": "overlay:lensOpen", "kind": "modal", "target": "sgs_modal post", "flag": "lensOpen", "panels": []},
    {"id": "form:Contact", "kind": "form", "target": "sgs_form post", "flag": None, "panels": []},
]}


def test_overlay_flags_cover_each_overlay_and_its_panels_but_not_forms():
    flags = sr.overlay_flags(MANIFEST)
    assert set(flags) == {"megaAny", "megaSun", "megaBrands", "lensOpen"}
    assert flags["megaSun"]["id"] == "overlay:megaAny"
    assert sr.overlay_flags(None) == {}


def test_content_under_an_overlay_gate_is_overlay_content_and_other_outside_content_is_not(tmp_path):
    (tmp_path / "README.md").write_text(README, encoding="utf-8")
    voter = {"boundaries": [{"boundary_id": f"b{n}", "boundary_kind": "container"} for n in range(1, 11)]}
    summary = sr.apply(voter, OVERLAY_TAGGED, tmp_path, None, overlays=sr.overlay_flags(MANIFEST))
    by = {b["boundary_id"]: b for b in voter["boundaries"]}
    assert by["b8"]["screen_role"] == "overlay" and by["b8"]["overlay"]["id"] == "overlay:megaAny"
    assert by["b9"]["screen_role"] == "overlay" and by["b9"]["overlay"]["kind"] == "modal"
    # Negative controls: a gate that is NOT a manifest overlay, and plain chrome, stay "outside".
    assert by["b10"]["screen_role"] == "outside"
    assert by["b1"]["screen_role"] == "outside" and by["b7"]["screen_role"] == "outside"
    assert summary["overlays"] == {"overlay:megaAny": ["b8"], "overlay:lensOpen": ["b9"]}
    assert summary["outside_screens"] == ["b1", "b7", "b10"]


def test_without_a_manifest_overlay_content_stays_outside_as_before(tmp_path):
    (tmp_path / "README.md").write_text(README, encoding="utf-8")
    voter = {"boundaries": [{"boundary_id": f"b{n}", "boundary_kind": "container"} for n in range(1, 11)]}
    summary = sr.apply(voter, OVERLAY_TAGGED, tmp_path, None)
    assert all(b["screen_role"] != "overlay" for b in voter["boundaries"])
    assert summary["overlays"] == {}
