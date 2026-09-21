"""JS-array-sourced repeated content (Spec 31 FR-31-26; multi-field items and default-on in plan step A2b, D1134).

A `<sc-for>` item template binds to `{{ r.title }}` / `{{ r.body }}` mustaches and the real content lives in a
draft `static ARRAY = [...]` class property, resolved at runtime by the draft's own `support.js`. The module
renders the draft in a real browser (subprocess to `resolve-js-content.js`), captures each field of each row
by marker, and expands the loop into real items. These tests mock the subprocess boundary for the module's own
logic (slot detection, marker injection, splice, fail-soft); `test_the_eye_care_v2_draft_...` runs the real
browser against the real draft when it is present.

Each guard has a negative control: what must NOT be touched is asserted as carefully as what must.

FR-31-31 additions: field markers (the resolver leaves `data-src-field` on an element whose whole content is one
`{{ var.field }}`, only for a draft that carries a manifest) and the seamless-marquee duplicate collapse (a loop
that is exactly one set written twice is collapsed ONLY when the draft itself says it is a seamless loop).
"""
import json
import shutil
import sys
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent))

from js_content_resolver import (  # noqa: E402
    ATTR_MARKER_PREFIX,
    TEXT_MARKER,
    find_expandable_sc_fors,
    inject_capture_markers,
    is_exact_repeat,
    item_slots,
    resolve_js_array_content,
    resolve_js_array_content_with_report,
)

REPO = Path(__file__).resolve().parents[4]
EYE_CARE_V2 = REPO / "sites/eye-care-ward-end/design_handoff_ward_end_eye_care_v2"

_TICKER = """
<div>
  <sc-for list="{{ ticker }}" as="t" hint-placeholder-count="4">
    <span style="padding: {{ tickerItemPad }}">
      <svg><path d="{{ t.icon }}"></path></svg>
      {{ t.text }}
    </span>
  </sc-for>
</div>
"""

_REASONS = """
<ol>
  <sc-for list="{{ reasons }}" as="r">
    <li><b>{{ r.no }}</b><h3>{{ r.title }}</h3><p>{{ r.body }}</p></li>
  </sc-for>
</ol>
"""

_TWO_LOOPS = """
<div>
  <sc-for list="{{ ticker }}" as="t"><span>{{ t.text }}</span></sc-for>
  <sc-for list="{{ brands }}" as="b"><a>{{ b.name }}</a></sc-for>
</div>
"""


def _payload(stdout: dict) -> MagicMock:
    return MagicMock(returncode=0, stdout=json.dumps(stdout), stderr="")


def _run(html: str, tmp_path: Path, stdout: dict):
    (tmp_path / "draft.dc.html").write_text(html, encoding="utf-8")
    with patch("js_content_resolver.subprocess.run") as run:
        run.return_value = _payload(stdout)
        return resolve_js_array_content_with_report(html, tmp_path)


def test_a_ticker_item_yields_a_text_slot_and_an_attribute_slot_but_not_the_width_binding():
    candidates, skipped = find_expandable_sc_fors(_TICKER)
    assert skipped == [] and len(candidates) == 1
    slots = candidates[0]["slots"]
    assert [(s["kind"], s["mustache"]) for s in slots] == [("attr", "{{ t.icon }}"), ("text", "{{ t.text }}")]
    assert "{{ tickerItemPad }}" not in [s["mustache"] for s in slots]   # width-driven: the script-bindings stage owns it


def test_a_multi_field_item_is_now_expandable():
    candidates, _ = find_expandable_sc_fors(_REASONS)
    assert [s["mustache"] for s in candidates[0]["slots"]] == ["{{ r.no }}", "{{ r.title }}", "{{ r.body }}"]


def test_an_item_that_already_has_literal_text_is_still_expandable():
    html = '<sc-for list="{{ rows }}" as="i"><span>Free delivery {{ i.detail }}</span></sc-for>'
    candidates, _ = find_expandable_sc_fors(html)
    assert len(candidates) == 1


def test_a_bare_row_reference_is_not_a_slot():
    """Negative control: `{{ p }}` is the whole row (a nested card), so there is no single value to capture."""
    html = '<sc-for list="{{ featured }}" as="p"><div>{{ p }}</div></sc-for>'
    assert find_expandable_sc_fors(html) == ([], [])


def test_handlers_refs_and_directive_tags_are_never_slots():
    body = '<div onClick="{{ r.toggle }}" ref="{{ r.ref }}"><sc-if cond="{{ r.open }}"><i>{{ r.title }}</i></sc-if></div>'
    assert [s["mustache"] for s in item_slots(body, "r")] == ["{{ r.title }}"]


def test_a_mustache_that_does_not_mention_the_loop_variable_is_never_a_slot():
    assert item_slots('<p style="gap:{{ secGap }}">{{ other.x }} {{ r.a }}</p>', "r")[0]["mustache"] == "{{ r.a }}"
    assert len(item_slots('<p style="gap:{{ secGap }}">{{ other.x }} {{ r.a }}</p>', "r")) == 1


def test_a_nested_loop_and_a_conditional_first_child_are_skipped_with_a_reason():
    nested = '<sc-for list="{{ a }}" as="g"><div>{{ g.label }}<sc-for list="{{ g.items }}" as="i"><b>{{ i.n }}</b></sc-for></div></sc-for>'
    cond = '<sc-for list="{{ a }}" as="g"><sc-if cond="{{ g.on }}"><b>{{ g.n }}</b></sc-if></sc-for>'
    assert find_expandable_sc_fors(nested) == ([], [{"loop": "{{ a }}", "reason": "contains a nested loop"}])
    candidates, skipped = find_expandable_sc_fors(cond)
    assert candidates == [] and "conditional" in skipped[0]["reason"]


def test_no_expandable_loop_spawns_no_subprocess(tmp_path):
    for html in ("<p>Static page</p>", '<sc-for list="{{ a }}" as="x"><b>{{ x }}</b></sc-for>'):
        with patch("js_content_resolver.subprocess.run") as run:
            out, count = resolve_js_array_content(html, tmp_path)
            assert (out, count) == (html, 0)
            run.assert_not_called()


def test_render_failure_and_error_payload_are_non_fatal(tmp_path):
    (tmp_path / "draft.dc.html").write_text(_TICKER, encoding="utf-8")
    with patch("js_content_resolver.subprocess.run") as run:
        run.return_value = MagicMock(returncode=1, stdout="", stderr="boom")
        assert resolve_js_array_content(_TICKER, tmp_path) == (_TICKER, 0)
        run.return_value = _payload({"error": "navigation timeout"})
        assert resolve_js_array_content(_TICKER, tmp_path) == (_TICKER, 0)


def test_every_field_of_every_row_is_spliced_and_the_loop_wrapper_is_removed(tmp_path):
    rows = {"r1": [
        {"fields": {"f0": "01", "f1": "Fitted properly", "f2": "Measured, not guessed."}},
        {"fields": {"f0": "02", "f1": "Second <opinion>", "f2": 'Say "hello" & goodbye'}},
    ]}
    out, count, report = _run(_REASONS, tmp_path, rows)
    assert count == 1 and report["gaps"] == []
    assert out.count("<li>") == 2 and "<sc-for" not in out and "{{" not in out
    assert "<h3>Fitted properly</h3>" in out
    assert "<h3>Second &lt;opinion&gt;</h3>" in out                       # text is escaped
    assert report["resolved"] == [{"loop": "{{ reasons }}", "items": 2, "fields_captured": 6, "fields_per_item": 3,
                                   "branches_pruned": 0}]


def test_an_attribute_value_is_spliced_in_place_and_the_width_binding_beside_it_survives(tmp_path):
    rows = {"r1": [{"fields": {"f0": "M12 2 4 5", "f1": "100% genuine"}}]}
    out, _, _ = _run(_TICKER, tmp_path, rows)
    assert '<path d="M12 2 4 5">' in out and "100% genuine" in out
    assert "padding: {{ tickerItemPad }}" in out                            # left for the script-bindings stage


def test_two_loops_resolve_independently_by_marker_with_different_counts(tmp_path):
    _, marker_map = inject_capture_markers(_TWO_LOOPS, find_expandable_sc_fors(_TWO_LOOPS)[0])
    ticker = next(m for m, c in marker_map.items() if c["list_expr"] == "{{ ticker }}")
    brands = next(m for m, c in marker_map.items() if c["list_expr"] == "{{ brands }}")
    rows = {ticker: [{"fields": {"f0": "One"}}, {"fields": {"f0": "Two"}}, {"fields": {"f0": "Three"}}],
            brands: [{"fields": {"f0": "Gucci"}}]}
    out, count, _ = _run(_TWO_LOOPS, tmp_path, rows)
    assert count == 2 and out.count("<span>") == 3 and out.count("<a>") == 1 and "Gucci" in out


def test_a_field_the_runtime_did_not_produce_stays_raw_and_is_reported(tmp_path):
    rows = {"r1": [{"fields": {"f0": "01", "f1": "Only a title"}}]}      # f2 (the body) never rendered
    out, count, report = _run(_REASONS, tmp_path, rows)
    assert count == 1 and "<p>{{ r.body }}</p>" in out
    assert report["gaps"] == [{"loop": "{{ reasons }}", "item": 1, "expr": "{{ r.body }}",
                               "reason": report["gaps"][0]["reason"]}]


def test_a_function_valued_field_is_not_spliced_as_content(tmp_path):
    rows = {"r1": [{"fields": {"f0": "01", "f1": "e => { this.go('shop') }", "f2": "ok"}}]}
    out, _, report = _run(_REASONS, tmp_path, rows)
    assert "this.go" not in out and [g["expr"] for g in report["gaps"]] == ["{{ r.title }}"]


def test_a_loop_that_renders_no_rows_is_skipped_with_a_reason_and_left_untouched(tmp_path):
    out, count, report = _run(_REASONS, tmp_path, {})
    assert (out, count) == (_REASONS, 0)
    assert report["skipped"] == [{"loop": "{{ reasons }}", "reason": "rendered 0 items at load (state-driven or hidden)"}]


_LOGO_OR_NAME = (
    '<sc-for list="{{ marquee }}" as="b"><a>'
    '<sc-if value="{{ b.hasLogo }}"><img src="{{ b.logo }}" alt="{{ b.name }}"></sc-if>'
    '<sc-if value="{{ b.noLogo }}"><span>{{ b.name }}</span></sc-if>'
    '</a></sc-for>'
)


def test_a_branch_the_runtime_did_not_render_is_removed_from_that_rows_copy(tmp_path):
    """The marquee shows a logo OR the brand name. Both branches used to be converted, so the name showed as raw
    `{{ b.name }}` text for every logo row. Slots: f0 img src, f1 img alt, f2 span text."""
    rows = {"r1": [
        {"fields": {"b0": "", "f0": "logos/a.png", "f1": "Alpha"}},             # logo row: only the logo branch rendered
        {"fields": {"b1": "", "f2": "BETA"}},                                   # text row: only the name branch rendered
    ]}
    out, count, report = _run(_LOGO_OR_NAME, tmp_path, rows)
    assert count == 1 and "{{" not in out.replace('value="{{ b.hasLogo }}"', "").replace('value="{{ b.noLogo }}"', "")
    assert out.count('<img src="logos/a.png" alt="Alpha">') == 1 and out.count("<span>BETA</span>") == 1
    assert out.count("<img") == 1 and out.count("<span>") == 1                  # the other branch of each row is gone
    assert report["gaps"] == [] and report["resolved"][0]["branches_pruned"] == 2


def test_a_branch_of_attributes_only_is_decided_by_its_marker_not_by_its_content(tmp_path):
    """The runtime drops an undefined attribute even when its branch rendered, so content cannot decide an
    attribute-only branch. The presence marker does: rendered (marker present) stays and its uncaptured field is a
    reported gap; not rendered (marker absent) is removed."""
    html = '<sc-for list="{{ rows }}" as="r"><a><sc-if value="{{ r.on }}"><img src="{{ r.src }}"></sc-if></a></sc-for>'
    kept, _, report = _run(html, tmp_path, {"r1": [{"fields": {"b0": ""}}]})
    assert '<img src="{{ r.src }}">' in kept and report["gaps"][0]["expr"] == "{{ r.src }}"
    gone, _, report = _run(html, tmp_path, {"r1": [{"fields": {"f9": "x"}}]})
    assert "<img" not in gone and report["gaps"] == [] and report["resolved"][0]["branches_pruned"] == 1


def test_a_rendered_branch_that_lacks_one_of_two_fields_is_kept(tmp_path):
    """Negative control: the branch rendered (marker present); the missing field is a reported gap, not a prune."""
    html = '<sc-for list="{{ rows }}" as="r"><a><sc-if value="{{ r.on }}"><b>{{ r.a }}</b><i>{{ r.b }}</i></sc-if></a></sc-for>'
    out, _, report = _run(html, tmp_path, {"r1": [{"fields": {"b0": "", "f0": "A"}}]})
    assert "<b>A</b>" in out and "<i>{{ r.b }}</i>" in out and len(report["gaps"]) == 1


def test_an_unrendered_runtime_is_refused_not_spliced(tmp_path):
    """The runtime never ran (no support.js beside the draft), so the 'captured' values are the raw template."""
    rows = {"r1": [{"fields": {"f0": "{{ r.no }}", "f1": "{{ r.title }}", "f2": "{{ r.body }}"}}]}
    out, count, report = _run(_REASONS, tmp_path, rows)
    assert (out, count) == (_REASONS, 0) and "did not render" in report["skipped"][0]["reason"]


def test_capture_markers_go_only_into_a_copy():
    candidates, _ = find_expandable_sc_fors(_TICKER)
    marked, _map = inject_capture_markers(_TICKER, candidates)
    assert 'data-sgs-resolve-id="r1"' in marked and 'data-sgs-f="f1"' in marked and 'data-sgs-a-f0="{{ t.icon }}"' in marked
    assert "data-sgs" not in _TICKER


def test_orchestrator_passes_the_original_draft_dir_not_run_dir():
    """Wiring pin: Stage -2 reassigns args.mockup into run_dir, which has no support.js; the resolver needs the draft's folder."""
    src = (Path(__file__).resolve().parent.parent / "sgs-clone-orchestrator.py").read_text(encoding="utf-8")
    assert "_js_raw, _draft_dir, collapse_loop_duplicates=" in src
    assert "_resolve_js_content(_js_raw, args.mockup.parent)" not in src


def test_it_runs_by_default_and_can_be_switched_off():
    src = (Path(__file__).resolve().parent.parent / "sgs-clone-orchestrator.py").read_text(encoding="utf-8")
    assert '"--resolve-js-content", action=argparse.BooleanOptionalAction, default=True' in src


@pytest.mark.skipif(shutil.which("node") is None or not (EYE_CARE_V2 / "Eye Care Birmingham.dc.html").exists(),
                    reason="needs node and the Eye Care v2 bundle")
def test_the_eye_care_v2_draft_gets_real_copy_in_a_real_browser():
    html = (EYE_CARE_V2 / "Eye Care Birmingham.dc.html").read_text(encoding="utf-8")
    out, count, report = resolve_js_array_content_with_report(html, EYE_CARE_V2)
    if count == 0:
        pytest.skip("no browser available here: %s" % report)
    done = {r["loop"]: r["items"] for r in report["resolved"]}
    assert done["{{ reasons }}"] == 4 and done["{{ reviews }}"] == 13 and done["{{ ticker }}"] >= 2
    assert "100% genuine, supplied direct by the brands" in out
    assert "{{ r.title }}" not in out.split("Four reasons")[1][:6000]


# --------------------------------------------------------------------------------------------------------------
# FR-31-31: field markers
# --------------------------------------------------------------------------------------------------------------

_MANIFEST = '<script type="application/json" data-sgs-manifest>{"sectionBlocks": {}}</script>'


def test_a_whole_content_field_is_marked_and_a_mixed_one_is_not():
    """`{{ r.title }}` is all of its `<h3>`: marked. `Free delivery {{ i.x }}`, two mustaches in one element and a
    mustache beside a child element are mixed content: no single field name describes them, so no marker."""
    slots = item_slots("<h3>{{ r.title }}</h3><p>Free delivery {{ r.detail }}</p><p>{{ r.a }} {{ r.b }}</p>"
                       "<p>{{ r.c }}<b>x</b></p><p> {{ r.d }} </p><p>{{ r.a + r.b }}</p>", "r")
    marked = {s["mustache"]: s.get("field") for s in slots}
    assert marked == {"{{ r.title }}": "title", "{{ r.detail }}": None, "{{ r.a }}": None, "{{ r.b }}": None,
                      "{{ r.c }}": None, "{{ r.d }}": "d", "{{ r.a + r.b }}": None}


def test_a_void_element_and_a_directive_are_never_a_text_holder():
    """Negative control: text right after `<br>` / inside `<sc-if>` has no element of its own to carry the marker."""
    slots = item_slots('<br>{{ r.a }}</br><sc-if value="{{ r.on }}">{{ r.b }}</sc-if>', "r")
    assert [s.get("field") for s in slots] == [None, None]


def test_an_attribute_that_is_wholly_one_field_is_marked_per_attribute_and_a_mixed_one_is_not():
    slots = item_slots('<img src="{{ b.logo }}" alt="{{ b.name }}" style="padding: {{ b.pad }}">', "b")
    got = {s["mustache"]: (s.get("field"), s.get("marker")) for s in slots}
    assert got == {"{{ b.logo }}": ("logo", ATTR_MARKER_PREFIX + "src"), "{{ b.name }}": ("name", ATTR_MARKER_PREFIX + "alt"),
                   "{{ b.pad }}": (None, None)}


def test_the_marker_names_sit_outside_the_converters_data_sgs_namespace():
    """`lift_behavioural_attrs` reads any `data-sgs-<x>` as a candidate value for a block attribute called `x`."""
    assert not TEXT_MARKER.startswith("data-sgs-")
    assert not ATTR_MARKER_PREFIX.startswith("data-sgs-")


def test_markers_are_stamped_into_the_expanded_items_when_the_draft_carries_a_manifest(tmp_path):
    rows = {"r1": [{"fields": {"f0": "01", "f1": "Fitted properly", "f2": "Measured, not guessed."}}]}
    out, _, report = _run(_REASONS + _MANIFEST, tmp_path, rows)
    assert '<b data-src-field="no">01</b>' in out
    assert '<h3 data-src-field="title">Fitted properly</h3>' in out
    assert '<p data-src-field="body">Measured, not guessed.</p>' in out
    assert report["resolved"][0]["fields_marked"] == 3 and report["gaps"] == []


def test_a_draft_without_a_manifest_gets_no_markers(tmp_path):
    """Negative control: the markers serve only the manifest annotator, so any other draft is expanded exactly as before."""
    rows = {"r1": [{"fields": {"f0": "01", "f1": "Fitted properly", "f2": "Measured, not guessed."}}]}
    out, _, report = _run(_REASONS, tmp_path, rows)
    assert "data-src-field" not in out and "fields_marked" not in report["resolved"][0]
    assert out.count("<li>") == 1 and "<h3>Fitted properly</h3>" in out


def test_an_attribute_field_is_marked_and_a_field_the_runtime_did_not_produce_is_not(tmp_path):
    html = '<sc-for list="{{ rows }}" as="b"><a><img src="{{ b.logo }}" alt="{{ b.name }}"><i>{{ b.tag }}</i></a></sc-for>' + _MANIFEST
    out, _, report = _run(html, tmp_path, {"r1": [{"fields": {"f0": "a.png", "f1": "Alpha"}}]})    # f2 (tag) missing
    assert 'data-src-field-src="logo"' in out and 'data-src-field-alt="name"' in out and 'src="a.png"' in out
    assert "data-src-field=" not in out and "<i>{{ b.tag }}</i>" in out           # no marker on an uncaptured field
    assert [g["expr"] for g in report["gaps"]] == ["{{ b.tag }}"]


def test_a_draft_with_no_sc_for_is_byte_identical_even_with_a_manifest(tmp_path):
    html = "<p>Static page</p>" + _MANIFEST
    with patch("js_content_resolver.subprocess.run") as run:
        out, count, report = resolve_js_array_content_with_report(html, tmp_path)
        run.assert_not_called()
    assert out == html and count == 0 and report == {"resolved": [], "gaps": [], "skipped": []}


# --------------------------------------------------------------------------------------------------------------
# FR-31-31: seamless-marquee duplicate collapse
# --------------------------------------------------------------------------------------------------------------

_KEYFRAMES = "<style>@keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}</style>"
_LOOP = '<sc-for list="{{ marquee }}" as="b"><a>{{ b.name }}</a></sc-for>'
_STRIP = '<div style="display:flex;animation:marquee 64s linear infinite">' + _LOOP + "</div>"
_PLAIN_STRIP = '<div style="display:flex;gap:1px">' + _LOOP + "</div>"
_TWICE = {"r1": [{"fields": {"f0": n}} for n in ("Ray-Ban", "Gucci", "Ray-Ban", "Gucci")]}


def test_a_list_the_script_doubles_is_collapsed_to_one_set_and_the_report_says_so(tmp_path):
    html = "<script>const marquee = mBrands.concat(mBrands).map(b => ({name:b}));</script>" + _PLAIN_STRIP
    out, count, report = _run(html, tmp_path, _TWICE)
    assert count == 1 and out.count("<a>") == 2 and out.count("Ray-Ban") == 1
    entry = report["resolved"][0]
    assert entry["loop_duplicate_collapsed"] is True and entry["items"] == 2
    assert (entry["items_before_collapse"], entry["items_after_collapse"]) == (4, 2)
    assert "x.concat(x)" in entry["duplicate_evidence"]


def test_a_spread_doubled_list_is_recognised_too(tmp_path):
    html = "<script>return {marquee: [...names, ...names].map(n => ({name:n}))}</script>" + _PLAIN_STRIP
    out, _, report = _run(html, tmp_path, _TWICE)
    assert out.count("<a>") == 2 and report["resolved"][0]["loop_duplicate_collapsed"] is True


def test_an_ancestor_running_a_half_shift_animation_forever_is_evidence_without_any_script(tmp_path):
    out, _, report = _run(_KEYFRAMES + _STRIP, tmp_path, _TWICE)
    assert out.count("<a>") == 2
    entry = report["resolved"][0]
    assert entry["loop_duplicate_collapsed"] is True and "'marquee'" in entry["duplicate_evidence"]


def test_a_class_rule_can_carry_the_looping_animation(tmp_path):
    html = (_KEYFRAMES.replace("</style>", ".strip{animation:marquee 40s linear infinite}</style>")
            + '<div class="strip">' + _LOOP + "</div>")
    out, _, report = _run(html, tmp_path, _TWICE)
    assert out.count("<a>") == 2 and report["resolved"][0]["loop_duplicate_collapsed"] is True


def test_a_repeated_list_with_no_evidence_is_content_and_is_never_collapsed(tmp_path):
    """Negative control: an FAQ may legitimately repeat an entry. Exact repetition alone proves nothing."""
    out, count, report = _run("<div>" + _LOOP.replace("marquee", "faqs") + "</div>", tmp_path, _TWICE)
    assert count == 1 and out.count("<a>") == 4
    assert "loop_duplicate_collapsed" not in report["resolved"][0] and report["resolved"][0]["items"] == 4


def test_an_infinite_animation_that_does_not_shift_by_half_is_not_evidence(tmp_path):
    """Negative control: a pulsing strip over a repeated list says nothing about the list being a loop copy."""
    html = "<style>@keyframes pulse{from{opacity:.5}to{opacity:1}}</style>" + _STRIP.replace("animation:marquee", "animation:pulse")
    out, _, report = _run(html, tmp_path, _TWICE)
    assert out.count("<a>") == 4 and "loop_duplicate_collapsed" not in report["resolved"][0]


def test_a_half_shift_animation_that_is_not_infinite_or_not_an_ancestor_is_not_evidence(tmp_path):
    once = _KEYFRAMES + _STRIP.replace(" infinite", " 1")
    sibling = _KEYFRAMES + '<div style="animation:marquee 9s linear infinite"></div><div>' + _LOOP + "</div>"
    for html in (once, sibling):
        out, _, report = _run(html, tmp_path, _TWICE)
        assert out.count("<a>") == 4 and "loop_duplicate_collapsed" not in report["resolved"][0], html


def test_script_evidence_for_a_different_variable_is_not_evidence_for_this_loop(tmp_path):
    html = "<script>const other = xs.concat(xs); const marquee = names.map(n => n);</script>" + _PLAIN_STRIP
    out, _, report = _run(html, tmp_path, _TWICE)
    assert out.count("<a>") == 4 and "loop_duplicate_collapsed" not in report["resolved"][0]


def test_evidence_without_an_exact_repeat_collapses_nothing(tmp_path):
    """Negative control: the script says concat, but the rows are not one set twice (a mobile-only double, a filter)."""
    rows = {"r1": [{"fields": {"f0": n}} for n in ("Ray-Ban", "Gucci", "Ray-Ban", "Prada")]}
    out, _, report = _run(_KEYFRAMES + _STRIP, tmp_path, rows)
    assert out.count("<a>") == 4 and "loop_duplicate_collapsed" not in report["resolved"][0]


def test_is_exact_repeat_needs_an_even_length_and_every_field_equal():
    def row(**f):
        return {"fields": f}

    assert is_exact_repeat([row(a="1", b="2"), row(a="3"), row(a="1", b="2"), row(a="3")])
    assert not is_exact_repeat([row(a="1"), row(a="2"), row(a="1")])                        # odd
    assert not is_exact_repeat([row(a="1", b="2"), row(a="1", b="9")])                      # one field differs
    assert not is_exact_repeat([])


@pytest.mark.skipif(shutil.which("node") is None or not (EYE_CARE_V2 / "Eye Care Birmingham.dc.html").exists(),
                    reason="needs node and the Eye Care v2 bundle")
def test_the_eye_care_v2_marquee_is_collapsed_to_sixteen_brands_and_the_reviews_are_marked():
    """Real draft, real browser. The script builds `mBrands.concat(mBrands)` (16 brands twice = 32) and the strip
    runs `animation: marquee 64s linear infinite` over `translateX(-50%)` keyframes: both kinds of evidence exist."""
    html = (EYE_CARE_V2 / "Eye Care Birmingham.dc.html").read_text(encoding="utf-8")
    out, count, report = resolve_js_array_content_with_report(html, EYE_CARE_V2)
    if count == 0:
        pytest.skip("no browser available here: %s" % report)
    marquee = next(r for r in report["resolved"] if r["loop"] == "{{ marquee }}")
    assert marquee["items"] == 16 and marquee["loop_duplicate_collapsed"] is True
    assert (marquee["items_before_collapse"], marquee["items_after_collapse"]) == (32, 16)
    assert out.count('title="Ray-Ban"') == 1 and out.count('title="Superdry"') == 1
    reviews = next(r for r in report["resolved"] if r["loop"] == "{{ reviews }}")
    assert reviews["items"] == 13 and "loop_duplicate_collapsed" not in reviews
    assert reviews["fields_marked"] == 13 * 5                     # initial, who, meta, date, text (colour is mixed content)
    assert out.count('data-src-field="who"') == 13 and out.count('data-src-field="text"') == 13
    assert 'data-src-field="colour"' not in out and "background: #1A73E8" in out
    assert {r["loop"]: r["items"] for r in report["resolved"]}["{{ reasons }}"] == 4     # a genuine list is left alone


# --------------------------------------------------------------------------------------------------------------
# QC fix wave: the collapse can be switched off alone; the CSS evidence does not over-match
# --------------------------------------------------------------------------------------------------------------

def _run_opts(html: str, tmp_path: Path, stdout: dict, **kwargs):
    (tmp_path / "draft.dc.html").write_text(html, encoding="utf-8")
    with patch("js_content_resolver.subprocess.run") as run:
        run.return_value = _payload(stdout)
        return resolve_js_array_content_with_report(html, tmp_path, **kwargs)


def test_the_collapse_can_be_switched_off_alone_and_the_entry_says_it_had_evidence(tmp_path):
    html = "<script>const marquee = mBrands.concat(mBrands).map(b => ({name:b}));</script>" + _PLAIN_STRIP
    out, count, report = _run_opts(html, tmp_path, _TWICE, collapse_loop_duplicates=False)
    assert count == 1 and out.count("<a>") == 4                       # the loop is still expanded, every row kept
    entry = report["resolved"][0]
    assert "loop_duplicate_collapsed" not in entry and entry["items"] == 4
    assert "--no-collapse-loop-duplicates" in entry["loop_duplicate_collapse_skipped"]
    assert "x.concat(x)" in entry["duplicate_evidence"]


def test_negative_control_the_same_draft_collapses_by_default(tmp_path):
    html = "<script>const marquee = mBrands.concat(mBrands).map(b => ({name:b}));</script>" + _PLAIN_STRIP
    out, _, report = _run_opts(html, tmp_path, _TWICE)
    assert out.count("<a>") == 2 and report["resolved"][0]["loop_duplicate_collapsed"] is True


def test_the_orchestrator_declares_the_collapse_flag_default_on_and_passes_it_through():
    src = (Path(__file__).resolve().parent.parent / "sgs-clone-orchestrator.py").read_text(encoding="utf-8")
    assert '"--collapse-loop-duplicates", action=argparse.BooleanOptionalAction, default=True' in src
    assert 'collapse_loop_duplicates=getattr(args, "collapse_loop_duplicates", True)' in src


_HALF = "@keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}"


def _class_strip(css: str, classes: str = "strip") -> str:
    return "<style>" + _HALF + css + '</style><div class="' + classes + '">' + _LOOP + "</div>"


def test_a_looping_animation_inside_a_media_query_is_not_evidence(tmp_path):
    """It applies only under that condition (here: narrow screens), so it says nothing about the list at large."""
    html = _class_strip("@media (max-width:600px){.strip{animation:marquee 40s linear infinite}}")
    out, _, report = _run(html, tmp_path, _TWICE)
    assert out.count("<a>") == 4 and "loop_duplicate_collapsed" not in report["resolved"][0]


def test_negative_control_the_same_rule_outside_a_media_query_is_evidence(tmp_path):
    out, _, report = _run(_class_strip(".strip{animation:marquee 40s linear infinite}"), tmp_path, _TWICE)
    assert out.count("<a>") == 2 and report["resolved"][0]["loop_duplicate_collapsed"] is True


def test_a_rule_after_a_media_block_and_one_in_a_selector_list_are_still_read(tmp_path):
    css = "@media print{.q{color:red}} .other, .strip{animation:marquee 40s linear infinite}"
    out, _, report = _run(_class_strip(css), tmp_path, _TWICE)
    assert out.count("<a>") == 2 and report["resolved"][0]["loop_duplicate_collapsed"] is True


def test_a_nested_conditional_block_is_skipped_whole(tmp_path):
    css = "@media (min-width:1px){@supports (display:grid){.strip{animation:marquee 40s linear infinite}}}"
    out, _, report = _run(_class_strip(css), tmp_path, _TWICE)
    assert out.count("<a>") == 4 and "loop_duplicate_collapsed" not in report["resolved"][0]


def test_a_descendant_or_compound_selector_is_not_taken_for_this_elements_rule(tmp_path):
    for css in (".page .strip{animation:marquee 40s linear infinite}", ".a.strip{animation:marquee 40s linear infinite}"):
        out, _, report = _run(_class_strip(css), tmp_path, _TWICE)
        assert out.count("<a>") == 4 and "loop_duplicate_collapsed" not in report["resolved"][0], css


def test_the_evidence_text_states_what_the_css_reading_does_not_evaluate(tmp_path):
    out, _, report = _run(_class_strip(".strip{animation:marquee 40s linear infinite}"), tmp_path, _TWICE)
    assert "media queries and cascade order were not evaluated" in report["resolved"][0]["duplicate_evidence"]
