"""FR-33-18: every font family a draft LOADS and RENDERS becomes a fontFamilies entry.

Proven gap on Eye Care: the draft loads Roboto for its Google-reviews widget and paints it there,
but the three role slots (body / heading / display) never name it, so the snapshot dropped it.

Each positive assertion has a negative control beside it: a family loaded but never rendered is
NOT added; a family rendered but never loaded (a system font) is NOT added; a loaded family that
only appears after a generic in a stack does not count as painting.

Run:  cd plugins/sgs-blocks/scripts && python -m pytest theme-extractor/tests/test_used_fonts.py -q
"""
from __future__ import annotations

import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

import used_fonts  # noqa: E402

LINK = ("https://fonts.googleapis.com/css2?family=Outfit:wght@400;500"
        "&family=Playfair+Display:wght@500&family=Roboto:wght@400;500"
        "&family=Lobster&display=swap")


def _facts(rows):
    return {"fontUsage": [dict(zip(("fontFamily", "fontWeight", "fontStyle", "count"), r)) for r in rows]}


EYE_CARE_ROWS = [
    ("Outfit, system-ui, sans-serif", "400", "normal", 120),
    ("Outfit, system-ui, sans-serif", "500", "normal", 30),
    ('"Playfair Display", serif', "500", "normal", 12),
    ("Roboto, Arial, sans-serif", "400", "normal", 9),
    ("Roboto, Arial, sans-serif", "500", "normal", 3),
    ("Arial, sans-serif", "400", "normal", 2),            # rendered, never loaded
    ("system-ui, Lobster", "400", "normal", 4),           # Lobster after a generic: never paints
]


def _snap():
    return {"settings": {"typography": {"fontFamilies": [
        {"slug": "body", "fontFamily": "Outfit, system-ui, sans-serif",
         "fontFace": [{"fontFamily": "Outfit", "src": ["file:./assets/fonts/outfit/o.woff2"]}]},
        {"slug": "heading", "fontFamily": '"Playfair Display", serif',
         "fontFace": [{"fontFamily": "Playfair Display", "src": ["file:./assets/fonts/p/p.woff2"]}]},
        {"slug": "display", "fontFamily": '"Playfair Display", serif'},
    ]}}}


def _run(snap, rows=EYE_CARE_ROWS, links=(LINK,), css=""):
    trace, resolved = [], []

    def resolve(name):
        resolved.append(name)
        return [{"fontFamily": name, "src": [f"file:./assets/fonts/{used_fonts.slugify(name)}/x.woff2"]}]

    used_fonts.add_rendered_families(snap, _facts(rows), list(links), css, trace, resolve, set())
    fams = {f["slug"]: f for f in snap["settings"]["typography"]["fontFamilies"]}
    return fams, trace, resolved


def test_link_families_parses_css2_and_v1():
    assert used_fonts.link_families(LINK) == ["Outfit", "Playfair Display", "Roboto", "Lobster"]
    v1 = "https://fonts.googleapis.com/css?family=Open+Sans:400,700|Lato"
    assert used_fonts.link_families(v1) == ["Open Sans", "Lato"]


def test_every_loaded_and_rendered_family_is_added_with_weights():
    fams, _, _ = _run(_snap())
    assert fams["roboto"]["fontWeights"] == ["400", "500"]
    assert fams["roboto"]["google"] is True
    assert fams["roboto"]["fontFamily"] == "Roboto, Arial, sans-serif"   # the stack as the draft writes it
    assert fams["outfit"]["fontWeights"] == ["400", "500"]
    assert fams["playfair-display"]["fontWeights"] == ["500"]
    assert fams["playfair-display"]["fontStyles"] == ["normal"]


def test_role_slots_are_untouched():
    before = _snap()
    fams, _, _ = _run(_snap())
    for slug in ("body", "heading", "display"):
        assert fams[slug] == {f["slug"]: f for f in before["settings"]["typography"]["fontFamilies"]}[slug]


def test_negative_loaded_but_never_rendered_is_not_added():
    fams, trace, _ = _run(_snap())
    assert "lobster" not in fams
    assert any(t["what"] == "fontFamilies:Lobster" and t["kind"] == "skip" for t in trace)


def test_negative_rendered_but_not_loaded_is_not_added():
    fams, _, _ = _run(_snap())
    assert "arial" not in fams


def test_negative_control_the_census_is_what_adds_the_family():
    # Same links, Roboto rows removed -> Roboto must disappear. Proves the add is driven by the census.
    rows = [r for r in EYE_CARE_ROWS if not r[0].startswith("Roboto")]
    fams, _, _ = _run(_snap(), rows=rows)
    assert "roboto" not in fams


def test_face_is_only_fetched_for_a_family_no_entry_already_loads():
    fams, _, resolved = _run(_snap())
    assert resolved == ["Roboto"]                 # Outfit + Playfair are already faced by role slots
    assert "fontFace" in fams["roboto"]
    assert "fontFace" not in fams["outfit"]


def test_font_face_rule_in_draft_css_counts_as_loaded():
    css = ("@font-face{font-family:'Roboto';src:url(https://fonts.gstatic.com/s/roboto/x.woff2)}"
           "@font-face{font-family:Brand;src:url(./brand.woff2)}")
    rows = [("Roboto, sans-serif", "400", "normal", 1), ("Brand, serif", "700", "normal", 1)]
    fams, trace, _ = _run(_snap(), rows=rows, links=(), css=css)
    assert fams["roboto"]["google"] is True
    assert "brand" not in fams                      # rendered, not Google, not bundled -> gap, not added
    assert any(t["what"] == "fontFamilies:Brand" and t["kind"] == "gap" for t in trace)


def test_no_census_is_a_logged_gap_not_a_silent_pass():
    snap = _snap()
    trace = []
    used_fonts.add_rendered_families(snap, {}, [LINK], "", trace, lambda n: None, set())
    assert len(snap["settings"]["typography"]["fontFamilies"]) == 3
    assert trace and trace[0]["kind"] == "gap"


def test_non_https_or_lookalike_host_is_not_google():
    evil = "https://fonts.googleapis.com.evil.example/css2?family=Roboto"
    assert used_fonts.loaded_families([evil], "") == {}
