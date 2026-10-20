"""FR-33-18: every font family a draft LOADS and RENDERS becomes a fontFamilies entry.

Proven gap on the optician client: the draft loads Roboto for its Google-reviews widget and paints it there,
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


OPTICIAN_ROWS = [
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


def _run(snap, rows=OPTICIAN_ROWS, links=(LINK,), css=""):
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
    rows = [r for r in OPTICIAN_ROWS if not r[0].startswith("Roboto")]
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


# The design system's tokens/typography.css: a family its --*font* properties declare is added even when the
# measured render never paints it (Indus's Geist Mono paints only in the mega menu, drawer and timeline numbers).
TOKENS = ('@import url("https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600&family=Outfit:wght@400'
          '&family=Geist+Mono:wght@400;500&display=swap");\n'
          ':root{--font-heading:"Montserrat",sans-serif;--font-body:Outfit,sans-serif;--font-mono:"Geist Mono",monospace;'
          '--font-brand:"Brand Sans",serif;--font-size-body:16px;--font-alias:var(--font-body)}')


def _draft(tmp_path, css=TOKENS):
    (tmp_path / "tokens").mkdir()
    (tmp_path / "tokens" / "typography.css").write_text(css, encoding="utf-8")
    return tmp_path


def test_import_urls_keep_a_css2_address_whole():
    css = ('@import url(https://fonts.googleapis.com/css2?family=A:wght@400;500&family=B);'
           '@import url("https://x.test/a;b.css"); @import "y.css"; @import url( \'z.css\' );')
    assert used_fonts.import_urls(css) == [
        "https://fonts.googleapis.com/css2?family=A:wght@400;500&family=B", "https://x.test/a;b.css", "y.css", "z.css"]
    assert set(used_fonts.loaded_families([], css)) == {"a", "b"}, "B after the ';' between weights is loaded too"


def test_token_families_reads_the_declared_font_roles(tmp_path):
    fams, imports = used_fonts.token_families(_draft(tmp_path))
    assert [(f["name"], f["var"], f["google"]) for f in fams] == [
        ("Montserrat", "--font-heading", True), ("Outfit", "--font-body", True),
        ("Geist Mono", "--font-mono", True), ("Brand Sans", "--font-brand", False)]
    assert len(imports) == 1
    assert used_fonts.token_families(tmp_path / "missing") == ([], [])
    assert used_fonts.token_families(None) == ([], [])


def test_a_token_declared_family_no_entry_names_is_added_and_self_hosted(tmp_path):
    snap, trace, resolved = _snap(), [], []

    def resolve(name):
        resolved.append(name)
        return [{"fontFamily": name, "src": [f"file:./assets/fonts/{used_fonts.slugify(name)}/x.woff2"]}]

    code = '<h2 style="font-family:Montserrat,sans-serif">x</h2><span style="font-family:var(--font-mono)">01</span><em style="font-family:Brand Sans">b</em>'
    used_fonts.add_token_families(snap, _draft(tmp_path), trace, resolve, set(), code)
    fams = {f["slug"]: f for f in snap["settings"]["typography"]["fontFamilies"]}
    assert fams["geist-mono"]["fontFace"][0]["fontFamily"] == "Geist Mono"
    assert fams["geist-mono"]["_source"] == "tokens"
    assert fams["montserrat"]["fontFamily"] == "'Montserrat'"
    assert "outfit" not in fams, "the body slot already names Outfit"
    assert resolved == ["Montserrat", "Geist Mono"]
    assert "brand-sans" not in fams and any(t["kind"] == "gap" and t["what"] == "fontFamilies:Brand Sans" for t in trace)
    assert [f["slug"] for f in snap["settings"]["typography"]["fontFamilies"][:3]] == ["body", "heading", "display"]


def test_negative_without_a_tokens_file_nothing_is_added(tmp_path):
    snap, trace = _snap(), []
    used_fonts.add_token_families(snap, tmp_path, trace, lambda n: [{"fontFamily": n}], set(), "font-family:'Geist Mono'")
    assert len(snap["settings"]["typography"]["fontFamilies"]) == 3
    assert trace == []


def test_negative_a_declared_family_the_draft_code_never_uses_is_not_added(tmp_path):
    snap, trace = _snap(), []
    used_fonts.add_token_families(snap, _draft(tmp_path), trace, lambda n: [{"fontFamily": n}], set(),
                                  "<p style=\"font-family:Outfit\">only the body font</p>")
    assert len(snap["settings"]["typography"]["fontFamilies"]) == 3
    assert {t["what"] for t in trace if t["kind"] == "skip"} == {"fontFamilies:Montserrat", "fontFamilies:Geist Mono", "fontFamilies:Brand Sans"}


def test_code_names_family_by_name_or_by_its_token():
    assert used_fonts.code_names_family("font-family:'Geist Mono',monospace", "Geist Mono", "--font-mono")
    assert used_fonts.code_names_family("font-family: var(--font-mono, monospace)", "Geist Mono", "--font-mono")
    assert not used_fonts.code_names_family("font-family:system-ui,'Geist Mono'", "Geist Mono", "--font-mono")
    assert not used_fonts.code_names_family("font-family:var(--font-mono-x)", "Geist Mono", "--font-mono")
