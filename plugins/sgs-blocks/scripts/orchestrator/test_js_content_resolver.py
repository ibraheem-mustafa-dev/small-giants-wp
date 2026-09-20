"""JS-array-sourced repeated content (Spec 31 FR-31-26; multi-field items and default-on in plan step A2b, D1134).

A `<sc-for>` item template binds to `{{ r.title }}` / `{{ r.body }}` mustaches and the real content lives in a
draft `static ARRAY = [...]` class property, resolved at runtime by the draft's own `support.js`. The module
renders the draft in a real browser (subprocess to `resolve-js-content.js`), captures each field of each row
by marker, and expands the loop into real items. These tests mock the subprocess boundary for the module's own
logic (slot detection, marker injection, splice, fail-soft); `test_the_eye_care_v2_draft_...` runs the real
browser against the real draft when it is present.

Each guard has a negative control: what must NOT be touched is asserted as carefully as what must.
"""
import json
import shutil
import sys
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent))

from js_content_resolver import (  # noqa: E402
    find_expandable_sc_fors,
    inject_capture_markers,
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
    assert "_resolve_js_content(_js_raw, _draft_dir)" in src
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
