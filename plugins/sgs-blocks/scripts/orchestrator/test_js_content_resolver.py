"""JS-array-sourced repeated content resolution (Spec 31 FR-31-26, D1108/D1109
follow-on, design-gated with Bean 2026-09-19 via `/brainstorming`).

A `<sc-for>` item template can bind entirely to `{{ t.field }}` mustaches with
no literal fallback text — the real content exists only in a draft
`static ARRAY = [...]` JS class property, resolved at runtime by the draft's
own `support.js`. This module renders the draft in a real browser (subprocess
to `resolve-js-content.js`) and splices the resolved text back non-
destructively. These tests mock the subprocess boundary (the render script
itself is live-verified separately against the real Eye Care Birmingham
draft — a real browser render is not something a fast unit suite should
depend on) and exercise the module's own logic: eligibility scoping, marker
injection, splice-back, and fail-soft behaviour.

Guards:
  1. A ticker-shaped item (single text field + an icon) is found eligible.
  2. An item with existing literal text is excluded — untouched, byte-
     identical (mirrors `test_no_dc_import_is_a_true_no_op`).
  3. A multi-field item (2+ distinct non-icon fields) is excluded — this
     module's splice mechanism can't correlate a concatenated `textContent`
     blob back to distinct fields; ship nothing rather than garbled content.
  4. Zero eligible `<sc-for>`s → no subprocess is spawned at all (proves the
     mechanism has zero cost on an already-fine draft).
  5. A render failure (non-zero exit) is non-fatal — original html returned
     unchanged (mirrors `test_unresolvable_import_is_left_as_is_not_fatal`).
  6. Two eligible groups get DISTINCT markers and resolve independently with
     DIFFERENT item counts — proves marker-based correlation, not document
     order (FR-31-26.2).
"""
import json
import sys
from pathlib import Path
from unittest.mock import patch, MagicMock

sys.path.insert(0, str(Path(__file__).resolve().parent))

from js_content_resolver import (  # noqa: E402
    find_unresolved_sc_fors,
    inject_resolve_markers,
    resolve_js_array_content,
)

_TICKER_SHAPED = """
<div>
  <sc-for list="{{ ticker }}" as="t" hint-placeholder-count="4">
    <span style="padding:0 20px">
      <svg><path d="{{ t.icon }}"></path></svg>
      {{ t.text }}
    </span>
  </sc-for>
</div>
"""

_ALREADY_HAS_CONTENT = """
<div>
  <sc-for list="{{ items }}" as="i">
    <span>Free UK delivery {{ i.detail }}</span>
  </sc-for>
</div>
"""

_MULTI_FIELD_CARD = """
<div>
  <sc-for list="{{ products }}" as="p" hint-placeholder-count="8">
    <div>
      <span>{{ p.name }}</span>
      <span>{{ p.price }}</span>
      <span>{{ p.rating }}</span>
    </div>
  </sc-for>
</div>
"""

_TWO_SIMPLE_GROUPS = """
<div>
  <sc-for list="{{ ticker }}" as="t">
    <span>{{ t.text }}</span>
  </sc-for>
  <sc-for list="{{ brands }}" as="b">
    <a>{{ b.name }}</a>
  </sc-for>
</div>
"""


def test_ticker_shaped_item_is_eligible():
    candidates = find_unresolved_sc_fors(_TICKER_SHAPED)
    assert len(candidates) == 1
    assert candidates[0]["list_expr"] == "{{ ticker }}"
    assert candidates[0]["as_name"] == "t"


def test_item_with_existing_literal_text_is_excluded():
    candidates = find_unresolved_sc_fors(_ALREADY_HAS_CONTENT)
    assert candidates == []


def test_multi_field_item_is_excluded_not_garbled():
    candidates = find_unresolved_sc_fors(_MULTI_FIELD_CARD)
    assert candidates == []


def test_zero_candidates_spawns_no_subprocess(tmp_path):
    with patch("js_content_resolver.subprocess.run") as mock_run:
        html, count = resolve_js_array_content(_ALREADY_HAS_CONTENT, tmp_path)
        assert count == 0
        assert html == _ALREADY_HAS_CONTENT
        mock_run.assert_not_called()


def test_render_failure_is_non_fatal(tmp_path):
    (tmp_path / "draft.dc.html").write_text(_TICKER_SHAPED, encoding="utf-8")
    with patch("js_content_resolver.subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=1, stdout="", stderr="boom")
        html, count = resolve_js_array_content(_TICKER_SHAPED, tmp_path)
        assert count == 0
        assert html == _TICKER_SHAPED  # untouched, exactly today's behaviour


def test_render_error_payload_is_non_fatal(tmp_path):
    (tmp_path / "draft.dc.html").write_text(_TICKER_SHAPED, encoding="utf-8")
    with patch("js_content_resolver.subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(
            returncode=0, stdout=json.dumps({"error": "navigation timeout"}), stderr=""
        )
        html, count = resolve_js_array_content(_TICKER_SHAPED, tmp_path)
        assert count == 0
        assert html == _TICKER_SHAPED


def test_ticker_resolves_and_splices_real_content(tmp_path):
    (tmp_path / "draft.dc.html").write_text(_TICKER_SHAPED, encoding="utf-8")
    resolved_payload = {
        "r1": [
            {"text": "100% genuine, supplied direct by the brands", "iconPath": "M12 2 4 5"},
            {"text": "Free UK delivery over £75", "iconPath": "M1 7h11"},
        ]
    }
    with patch("js_content_resolver.subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(
            returncode=0, stdout=json.dumps(resolved_payload), stderr=""
        )
        html, count = resolve_js_array_content(_TICKER_SHAPED, tmp_path)
    assert count == 1
    assert "100% genuine, supplied direct by the brands" in html
    assert "Free UK delivery over £75" in html
    assert "{{ ticker }}" not in html  # the <sc-for> wrapper is replaced
    assert "{{ t.text }}" not in html


def test_two_simple_groups_get_distinct_markers_and_resolve_independently(tmp_path):
    candidates = find_unresolved_sc_fors(_TWO_SIMPLE_GROUPS)
    assert len(candidates) == 2
    _marked, marker_map = inject_resolve_markers(_TWO_SIMPLE_GROUPS, candidates)
    marker_ids = list(marker_map.keys())
    assert len(set(marker_ids)) == 2  # distinct, no collision

    (tmp_path / "draft.dc.html").write_text(_TWO_SIMPLE_GROUPS, encoding="utf-8")
    ticker_marker = next(m for m, c in marker_map.items() if c["list_expr"] == "{{ ticker }}")
    brands_marker = next(m for m, c in marker_map.items() if c["list_expr"] == "{{ brands }}")
    # DIFFERENT item counts per marker — proves correlation is by marker
    # identity, not document position (FR-31-26.2's whole reason to exist).
    resolved_payload = {
        ticker_marker: [{"text": "Ticker one"}, {"text": "Ticker two"}, {"text": "Ticker three"}],
        brands_marker: [{"text": "Gucci"}],
    }
    with patch("js_content_resolver.subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(
            returncode=0, stdout=json.dumps(resolved_payload), stderr=""
        )
        html, count = resolve_js_array_content(_TWO_SIMPLE_GROUPS, tmp_path)
    assert count == 2
    assert html.count("Ticker one") == 1
    assert html.count("Ticker two") == 1
    assert html.count("Ticker three") == 1
    assert "Gucci" in html


def test_marker_injection_is_a_true_no_op_on_original_html():
    """The pipeline-bound mockup is never mutated by marker injection — only
    a copy is marked, matching FR-31-26.2's "never touches the pipeline-bound
    mockup" rule."""
    candidates = find_unresolved_sc_fors(_TICKER_SHAPED)
    marked, _marker_map = inject_resolve_markers(_TICKER_SHAPED, candidates)
    assert marked != _TICKER_SHAPED  # the COPY is marked
    assert "data-sgs-resolve-id" not in _TICKER_SHAPED  # the ORIGINAL never is
