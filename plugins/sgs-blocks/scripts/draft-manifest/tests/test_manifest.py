"""Draft manifest: screens, entities, references and build order.

Run:  cd plugins/sgs-blocks/scripts && python -m pytest draft-manifest/tests -q
"""
from __future__ import annotations

import pathlib
import sys

import pytest

HERE = pathlib.Path(__file__).resolve().parent
PKG = HERE.parent
REPO = PKG.parents[3]
sys.path.insert(0, str(PKG))
sys.path.insert(0, str(PKG.parent))

import build_order  # noqa: E402
import dc_script  # noqa: E402
import manifest  # noqa: E402
from readme_routes import read_readme_routes  # noqa: E402

EYE = REPO / "sites" / "eye-care-ward-end" / "design_handoff_ward_end_eye_care" / "Eye Care Birmingham.dc.html"
MAMAS = REPO / "sites" / "mamas-munches" / "mockups" / "homepage" / "index.html"

SYNTHETIC = """<x-dc>
<header><a onClick="{{ goAbout }}">About</a><button onClick="{{ openGuide }}">g</button></header>
<sc-if value="{{ isHome }}"><main data-screen-label="Home"><a onClick="{{ goAbout }}">x</a>
<button onClick="{{ openGuide }}">y</button></main></sc-if>
<sc-if value="{{ isAbout }}"><main data-screen-label="About"><a onClick="{{ goHome }}">h</a></main></sc-if>
<sc-if value="{{ guideOpen }}"><div style="position:fixed;inset:0;display:flex;align-items:center;justify-content:center">
<div role="dialog" aria-label="Guide"></div></div></sc-if>
<script type="text/x-dc" data-dc-script>
class P { render(){ const nav = page => e => { this.go(page); };
 const other = this.go('elsewhere');
 return { goHome: nav('home'), goAbout: nav('about'), openGuide: e => { this.setState({modal:'guide'}); },
  guideOpen: S.modal === 'guide' }; } }
</script></x-dc>
"""


@pytest.fixture()
def synthetic(tmp_path):
    p = tmp_path / "d.dc.html"
    p.write_text(SYNTHETIC, encoding="utf-8")
    return manifest.build_manifest(p)


def test_synthetic_screens_entity_and_references(synthetic):
    m = synthetic
    assert [s["label"] for s in m["screens"]] == ["Home", "About"]
    assert [e["id"] for e in m["entities"]] == ["overlay:guideOpen"]
    assert m["entities"][0]["kind"] == "modal" and m["entities"][0]["resolved_by"] == "state"
    refs = {(r["from"], r["how"], r["to"]) for r in m["references"]}
    assert ("content:Home", "references", "overlay:guideOpen") in refs
    assert ("header", "references", "overlay:guideOpen") in refs
    assert ("header", "links to", "shell:About") in refs
    assert m["unresolved"] == []


def test_a_helper_definition_does_not_leak_into_the_next_statement(synthetic):
    # `const other = this.go('elsewhere')` follows the `nav` helper; its view must not become a link target.
    assert not any("elsewhere" in u for u in synthetic["unresolved"])
    assert {r["to"] for r in synthetic["references"] if r["how"] == "links to"} <= {"shell:Home", "shell:About"}


def test_synthetic_build_order_puts_shells_first_and_entities_before_referrers(synthetic):
    order = synthetic["build_order"]
    assert order.index("shell:About") < order.index("overlay:guideOpen") < order.index("header")
    assert order.index("overlay:guideOpen") < order.index("content:Home")
    assert order[:2] == ["global-styles", "site-info"] and synthetic["cycle"] == []


def test_eye_care_screens_and_page_kinds():
    m = manifest.build_manifest(EYE)
    kinds = {s["label"]: s["kind"] for s in m["screens"]}
    assert m["counts"]["screens"] == 9 and m["normal_pages"] == ["Home", "About", "Help", "Contact"]
    assert kinds["Shop"] == "wc-archive" and kinds["Product"] == "single-template"
    assert kinds["Checkout"] == "wc-checkout" and kinds["Order confirmed"] == "wc-order-received"
    assert kinds["Lenses"] == "choice-flow"


def test_eye_care_entities_and_the_size_guide_is_built_once_and_referenced_many_times():
    m = manifest.build_manifest(EYE)
    by_id = {e["id"]: e for e in m["entities"]}
    assert by_id["overlay:sizeModalOpen"]["kind"] == "modal"
    assert by_id["overlay:bagOpen"]["kind"] == "cart-drawer" and by_id["overlay:menuOpen"]["kind"] == "drawer"
    assert by_id["form:Contact"]["kind"] == "form"
    referrers = {r["from"] for r in m["references"] if r["to"] == "overlay:sizeModalOpen"}
    assert {"content:Product", "content:Help", "footer"} <= referrers
    order = m["build_order"]
    assert order.index("overlay:sizeModalOpen") < min(order.index(r) for r in referrers)


def test_eye_care_mega_menu_is_not_merged_into_the_lens_configurator():
    m = manifest.build_manifest(EYE)
    by_id = {e["id"]: e for e in m["entities"]}
    assert by_id["overlay:megaAny"]["kind"] == "mega" and len(by_id["overlay:megaAny"]["panels"]) == 4
    assert by_id["choice-flow:lenses"]["openers"] == ["openLens"]


def test_eye_care_in_screen_regions_are_not_entities():
    m = manifest.build_manifest(EYE)
    assert {r["flag"] for r in m["in_screen_regions"]} >= {"showRail", "contactSent"}
    assert not {e["flag"] for e in m["entities"]} & {"showRail", "contactSent"}


def test_static_draft_is_one_page_with_no_entities():
    m = manifest.build_manifest(MAMAS)
    assert m["counts"] == {"screens": 1, "normal_pages": 1, "template_or_flow_screens": 0, "entities": 0}
    assert m["references"] == [] and m["cycle"] == []


def test_read_expr_stops_at_a_statement_end():
    s = "const nav = page => e => { this.go(page); };\nconst other = 1;"
    assert dc_script.read_expr(s, s.index("page")).strip().endswith("}")


def test_definition_prefers_a_handler_over_a_key_of_the_same_name():
    s = "a(() => this.setState({menuOpen:!s.menuOpen})); return { menuOpen: S.menuOpen };"
    assert dc_script.definition(s, "menuOpen", lambda e: "S." in e).strip() == "S.menuOpen"


def test_readme_routes_table():
    text = "| View | Route | Purpose |\n|---|---|---|\n| `home` | `/` | Hero |\n| `lens` | `/x/[slug]/lenses` | Configurator |\n"
    assert read_readme_routes(text) == [{"view": "home", "route": "/", "purpose": "Hero"},
                                        {"view": "lens", "route": "/x/[slug]/lenses", "purpose": "Configurator"}]


def test_build_order_dependency_beats_tier_and_a_cycle_is_reported():
    nodes = [{"id": "a", "tier": 0}, {"id": "b", "tier": 4}, {"id": "c", "tier": 1}]
    assert build_order.order(nodes, [("b", "a")]) == (["c", "b", "a"], [])  # a (tier 0) waits for b (tier 4)
    seq, cycle = build_order.order(nodes, [("a", "b"), ("b", "a")])
    assert cycle == ["a", "b"] and seq == ["c"]
