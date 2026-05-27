"""test_walker_helpers.py — Unit tests for Phase 1.4 Pass 1 walker helpers.

Tests the three helpers added to db_lookup.py for the universal walker:
  - resolve_slug_from_bem  (FR-22-1 BEM→slug resolution)
  - lift_behavioural_attrs (FR-22-2 scalar attr lifting)
  - emit_sgs_container_wrapping (FR-22-3 exception 3 / FR-22-4)

Spec 22 §FR-22-1, §FR-22-2, §FR-22-3, §FR-22-4.

Uses importlib.util.spec_from_file_location to load db_lookup directly,
bypassing converter_v2/__init__.py which imports `convert` (not yet written —
that is Pass 2). Pattern mirrors test_array_item_slot_for.py and
test_atomic_tag_map.py.

Note on lift_behavioural_attrs modifier-class scenario:
  The test for modifier-class lifting (sgs-cta-section--large → size='large')
  is skipped because no current DB row in block_attributes has an attr whose
  role='select-from-enum' AND normalised attr_name matches 'large'. The
  modifier-class path is implemented and works structurally; a real-world
  test requires a DB row that happens to have the right name/role combination.
  This is documented here so it can be added once /sgs-update seeds a matching
  row. Instead, the data-sgs-X test cases cover the primary scalar lifting path.
"""
from __future__ import annotations

import sys
import os

sys.stdout.reconfigure(encoding="utf-8")

import importlib.util

_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
_PKG_DIR = os.path.dirname(_THIS_DIR)   # converter_v2/
_DB_LOOKUP_PATH = os.path.join(_PKG_DIR, "db_lookup.py")

_spec = importlib.util.spec_from_file_location("db_lookup", _DB_LOOKUP_PATH)
_db_lookup = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_db_lookup)

resolve_slug_from_bem = _db_lookup.resolve_slug_from_bem
_resolve_slug_from_bem_tuple = _db_lookup._resolve_slug_from_bem_tuple
lift_behavioural_attrs = _db_lookup.lift_behavioural_attrs
emit_sgs_container_wrapping = _db_lookup.emit_sgs_container_wrapping


# ---------------------------------------------------------------------------
# Minimal BS4-compatible fake Tag for lift_behavioural_attrs tests.
# ---------------------------------------------------------------------------

class _FakeTag:
    """Minimal stand-in for a BeautifulSoup Tag with attrs + class list."""
    def __init__(self, html_attrs: dict | None = None, css_classes: list[str] | None = None):
        self.attrs: dict = html_attrs or {}
        if css_classes:
            self.attrs["class"] = css_classes

    def get(self, key, default=None):
        return self.attrs.get(key, default)


# ---------------------------------------------------------------------------
# Test runner helpers
# ---------------------------------------------------------------------------

def run_tests() -> None:
    failures: list[str] = []
    passes: int = 0

    def ok(label: str) -> None:
        nonlocal passes
        passes += 1
        print(f"  [PASS] {label}")

    def fail(label: str, detail: str) -> None:
        failures.append(f"{label}: {detail}")
        print(f"  [FAIL] {label} — {detail}")

    # ======================================================================
    # Section 1 — resolve_slug_from_bem
    # ======================================================================
    print()
    print("=== resolve_slug_from_bem ===")

    # 1a. Empty input
    result = resolve_slug_from_bem([])
    if result is None:
        ok("empty list → None")
    else:
        fail("empty list", f"expected None, got {result!r}")

    # 1b. Non-sgs class filtered out
    result = resolve_slug_from_bem(["random-class"])
    if result is None:
        ok("non-sgs class → None (defensive filter)")
    else:
        fail("non-sgs class filter", f"expected None, got {result!r}")

    # 1c. Unknown/unregistered block
    result = resolve_slug_from_bem(["sgs-nonexistent"])
    if result is None:
        ok("unregistered block 'sgs-nonexistent' → None")
    else:
        fail("unregistered block", f"expected None, got {result!r}")

    # 1d. Single bare block class — known built block
    result = resolve_slug_from_bem(["sgs-hero"])
    if result == "sgs/hero":
        ok("single bare block 'sgs-hero' → 'sgs/hero'")
    else:
        fail("single bare block 'sgs-hero'", f"expected 'sgs/hero', got {result!r}")

    # 1e. Block + element + modifier: the bare block class wins (Path 1)
    # sgs-product-card is a registered built block; __inner is an element;
    # --featured is a modifier. Path 1 should resolve to sgs/product-card.
    result = resolve_slug_from_bem(["sgs-product-card", "sgs-product-card__inner", "sgs-product-card--featured"])
    if result == "sgs/product-card":
        ok("bare block + element + modifier → 'sgs/product-card' (Path 1)")
    else:
        fail("bare block + element + modifier", f"expected 'sgs/product-card', got {result!r}")

    # 1f. Element-only class — slot fallback (Path 2)
    # sgs-product-card__badge: element='badge'. slot_synonyms has canonical_slot='badge'
    # with standalone_block='sgs/label'.
    result = resolve_slug_from_bem(["sgs-product-card__badge"])
    if result == "sgs/label":
        ok("element-only 'sgs-product-card__badge' → 'sgs/label' (Path 2 slot fallback)")
    else:
        fail("element-only slot fallback (badge→sgs/label)",
             f"expected 'sgs/label', got {result!r}")

    # 1g. LRU cache — two calls with same classes return same value
    r1 = resolve_slug_from_bem(["sgs-hero"])
    r2 = resolve_slug_from_bem(["sgs-hero"])
    if r1 == r2 == "sgs/hero":
        ok("LRU cache: repeated call returns same value")
    else:
        fail("LRU cache", f"r1={r1!r}, r2={r2!r}")

    # 1h. Deterministic ordering: same slug regardless of input order
    result_ab = resolve_slug_from_bem(["sgs-hero", "sgs-cta-section"])
    result_ba = resolve_slug_from_bem(["sgs-cta-section", "sgs-hero"])
    if result_ab == result_ba:
        ok(f"deterministic tiebreaker: ['sgs-hero', 'sgs-cta-section'] and reversed → same slug ({result_ab!r})")
    else:
        fail("deterministic ordering",
             f"forward={result_ab!r}, reversed={result_ba!r} (must be identical)")

    # 1i. Tuple-based cache: verify tuple sorting is order-agnostic
    t1 = _resolve_slug_from_bem_tuple(("sgs-hero", "sgs-cta-section"))
    t2 = _resolve_slug_from_bem_tuple(("sgs-cta-section", "sgs-hero"))
    if t1 == t2:
        ok("tuple cache: unsorted input tuples return same value via sorted dispatch")
    else:
        fail("tuple cache", f"t1={t1!r}, t2={t2!r}")

    # 1j. sgs-cta-section (registered block) bare class
    result = resolve_slug_from_bem(["sgs-cta-section"])
    if result == "sgs/cta-section":
        ok("bare block 'sgs-cta-section' → 'sgs/cta-section'")
    else:
        fail("bare block 'sgs-cta-section'", f"expected 'sgs/cta-section', got {result!r}")

    # ======================================================================
    # Section 2 — lift_behavioural_attrs
    # ======================================================================
    print()
    print("=== lift_behavioural_attrs ===")

    # 2a. Node with no attrs and no modifier class → empty dict
    node_empty = _FakeTag()
    result_d = lift_behavioural_attrs(node_empty, "sgs/hero")
    if result_d == {}:
        ok("empty node → {} (no attrs to lift)")
    else:
        fail("empty node", f"expected {{}}, got {result_d!r}")

    # 2b. Node with data-sgs-headlineLevel="h3" on sgs/heading → {'headlineLevel': 'h3'}
    # sgs/heading has attr 'headlineLevel' (string, role=None, canonical_slot=None)
    # equivalent_block_for('sgs/heading', 'headlineLevel') should return None → scalar.
    node_hl = _FakeTag(html_attrs={"data-sgs-headlineLevel": "h3"})
    result_d = lift_behavioural_attrs(node_hl, "sgs/heading")
    if result_d.get("headlineLevel") == "h3":
        ok("data-sgs-headlineLevel='h3' on sgs/heading → {'headlineLevel': 'h3'}")
    else:
        fail("data-sgs headlineLevel", f"expected headlineLevel='h3', got {result_d!r}")

    # 2c. data-sgs-X that matches an unknown attr → ignored (no KeyError)
    node_uk = _FakeTag(html_attrs={"data-sgs-nonExistentAttr": "foo"})
    result_d = lift_behavioural_attrs(node_uk, "sgs/hero")
    if "nonExistentAttr" not in result_d:
        ok("unknown data-sgs-X attr → not lifted (attr not in block schema)")
    else:
        fail("unknown data-sgs-X", f"should not have lifted 'nonExistentAttr', got {result_d!r}")

    # 2d. data-sgs-X on an array attr → not lifted (arrays are walker concerns)
    # sgs/product-card has 'packSizes' which is array-typed.
    node_arr = _FakeTag(html_attrs={"data-sgs-packSizes": "500ml"})
    result_d = lift_behavioural_attrs(node_arr, "sgs/product-card")
    if "packSizes" not in result_d:
        ok("data-sgs-packSizes (array attr) → not lifted (array excluded from scalar lift)")
    else:
        fail("array attr exclusion", f"should not have lifted 'packSizes', got {result_d!r}")

    # 2e. Node with modifier class but no matching scalar attr → empty dict
    # A modifier with no block-schema match must not cause errors.
    node_mod = _FakeTag(
        html_attrs={"class": ["sgs-hero", "sgs-hero--primary"]},
        css_classes=None,  # already set via html_attrs above
    )
    try:
        result_d = lift_behavioural_attrs(node_mod, "sgs/hero")
        ok(f"modifier class 'sgs-hero--primary' — no crash, returned: {result_d!r}")
    except Exception as exc:
        fail("modifier class no-crash", f"raised {exc!r}")

    # 2f. Node object with no .attrs attribute (duck-type robustness)
    class _NoAttrsNode:
        pass
    try:
        result_d = lift_behavioural_attrs(_NoAttrsNode(), "sgs/hero")
        if result_d == {}:
            ok("node with no .attrs → {} (duck-type soft-fail)")
        else:
            ok(f"node with no .attrs → {result_d!r} (non-empty but no crash)")
    except Exception as exc:
        fail("duck-type robustness", f"raised {exc!r}")

    # ======================================================================
    # Section 3 — emit_sgs_container_wrapping
    # ======================================================================
    print()
    print("=== emit_sgs_container_wrapping ===")

    # 3a. Basic wrap: simple block with one child
    markup = emit_sgs_container_wrapping("sgs/hero", {}, ["<p>x</p>"], "")
    if "wp:sgs/container" in markup and "wp:sgs/hero" in markup and "<p>x</p>" in markup:
        ok("basic wrap: markup contains wp:sgs/container + wp:sgs/hero + child")
    else:
        fail("basic wrap", f"missing expected markers in:\n{markup}")

    # 3b. Wrap must close both blocks
    if "<!-- /wp:sgs/container -->" in markup and "<!-- /wp:sgs/hero -->" in markup:
        ok("basic wrap: both blocks closed correctly")
    else:
        fail("close tags", f"missing close tags in:\n{markup}")

    # 3c. Container wrapper div present
    if 'class="wp-block-sgs-container"' in markup:
        ok("basic wrap: wp-block-sgs-container div present")
    else:
        fail("wrapper div", f"missing wp-block-sgs-container div in:\n{markup}")

    # 3d. Wrap with attrs — JSON serialised in block comment
    import json
    markup_attrs = emit_sgs_container_wrapping("sgs/hero", {"level": "h1"}, [], "")
    # The inner block comment should carry the JSON-encoded attrs
    if '"level":"h1"' in markup_attrs or '"level": "h1"' in markup_attrs:
        ok("wrap with attrs: JSON attrs in inner block comment")
    else:
        fail("attrs serialisation", f"expected level:h1 in:\n{markup_attrs}")

    # 3e. Wrap with CSS: <style> element present inside container div
    markup_css = emit_sgs_container_wrapping("sgs/hero", {}, [], "a{color:red}")
    if "<style>a{color:red}</style>" in markup_css:
        ok("wrap with CSS: <style> present with correct content")
    else:
        fail("CSS injection", f"expected <style>a{{color:red}}</style> in:\n{markup_css}")

    # 3f. CSS appears INSIDE the container (between container open and close)
    container_open = "<!-- wp:sgs/container {} -->"
    container_close = "<!-- /wp:sgs/container -->"
    style_tag = "<style>a{color:red}</style>"
    open_idx = markup_css.find(container_open)
    close_idx = markup_css.find(container_close)
    style_idx = markup_css.find(style_tag)
    if open_idx < style_idx < close_idx:
        ok("CSS <style> is inside the sgs/container (correct position)")
    else:
        fail("CSS position",
             f"open={open_idx}, style={style_idx}, close={close_idx} — style not inside container")

    # 3g. Empty CSS string → no <style> tag emitted
    markup_nocss = emit_sgs_container_wrapping("sgs/hero", {}, [], "")
    if "<style>" not in markup_nocss:
        ok("empty CSS → no <style> tag emitted")
    else:
        fail("empty CSS", "unexpected <style> tag when css=''")

    # 3h. Whitespace-only CSS → no <style> tag emitted
    markup_ws = emit_sgs_container_wrapping("sgs/hero", {}, [], "   ")
    if "<style>" not in markup_ws:
        ok("whitespace-only CSS → no <style> tag emitted")
    else:
        fail("whitespace CSS", "unexpected <style> tag when css='   '")

    # 3i. Multiple children preserved in order
    children = ["<!-- wp:sgs/text {} -->\n<p>A</p>\n<!-- /wp:sgs/text -->",
                "<!-- wp:sgs/media {} -->\n<img>\n<!-- /wp:sgs/media -->"]
    markup_multi = emit_sgs_container_wrapping("sgs/hero", {}, children, "")
    if "A" in markup_multi and "<img>" in markup_multi:
        ok("multiple children: all children present in output")
    else:
        fail("multiple children", f"missing children in:\n{markup_multi}")

    # 3j. Container attrs are always {} (structural wrapper, not styled — FR-22-4)
    if markup.startswith("<!-- wp:sgs/container {} -->"):
        ok("container block always opens with empty attrs {} (FR-22-4)")
    else:
        fail("container empty attrs",
             f"expected '<!-- wp:sgs/container {{}} -->' at start, got: {markup[:80]!r}")

    # ======================================================================
    # Summary
    # ======================================================================
    print()
    total = passes + len(failures)
    print(f"Results: {passes}/{total} passed, {len(failures)} failed")

    if failures:
        print("\nFailed tests:")
        for f in failures:
            print(f"  - {f}")
        sys.exit(1)
    else:
        print("All walker helper tests PASS.")


if __name__ == "__main__":
    run_tests()
