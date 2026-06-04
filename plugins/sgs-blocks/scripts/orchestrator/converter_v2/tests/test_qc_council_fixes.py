"""test_qc_council_fixes.py — Tests for D1, D2, D3, D4, D5 fixes.

Captures the five diagnostic findings from /qc-council 2026-05-27 and
asserts each is closed. Each test would FAIL against the pre-fix walker;
they pass after Phase 1.4b ships.
"""
from __future__ import annotations

import sys
import os

sys.stdout.reconfigure(encoding="utf-8")

# Add scripts/ to path so we can import the orchestrator package
_SCRIPTS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
if _SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, _SCRIPTS_DIR)

from bs4 import BeautifulSoup
from orchestrator.converter_v2 import convert


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

    # ------------------------------------------------------------------
    # D1 — variation_buf threaded through walk_passthrough
    # ------------------------------------------------------------------
    # Pre-fix: walk_passthrough dropped variation_buf, so any sgs-* node
    # nested below a non-BEM wrapper would have its CSS NOT collected.
    # Post-fix: variation_buf threads through and CSS is collected.
    html = '<div><section class="sgs-hero"></section></div>'
    css_rules = {".sgs-hero": {"background-color": "red"}}
    variation_buf: list[str] = []
    node = BeautifulSoup(html, "html.parser").find("div")
    convert.walk(node, css_rules, variation_buf, is_top_level=False)
    if len(variation_buf) >= 1 and "sgs-hero" in variation_buf[0]:
        ok("D1: variation_buf collects CSS through pass-through subtree")
    else:
        fail("D1", f"expected non-empty variation_buf with sgs-hero CSS, got {variation_buf!r}")

    # D1 regression: when no intervening wrapper, variation_buf still works
    html2 = '<section class="sgs-hero"></section>'
    variation_buf2: list[str] = []
    node2 = BeautifulSoup(html2, "html.parser").find("section")
    convert.walk(node2, css_rules, variation_buf2, is_top_level=True)
    if len(variation_buf2) >= 1:
        ok("D1 regression: variation_buf works without pass-through")
    else:
        fail("D1 regression", f"variation_buf empty in direct case: {variation_buf2!r}")

    # ------------------------------------------------------------------
    # D5 — chrome-skip ordering: SGS-classed <header> emits the block
    # ------------------------------------------------------------------
    # Pre-fix: <header class="sgs-hero"> at is_top_level → chrome-skip
    # fires → None returned, sgs/hero DROPPED.
    # Post-fix: chrome-skip checks `not sgs_classes` first; SGS-classed
    # <header> resolves via BEM and emits the block.
    html3 = '<header class="sgs-hero"><h1>Test</h1></header>'
    node3 = BeautifulSoup(html3, "html.parser").find("header")
    result = convert.walk(node3, css_rules={}, is_top_level=True)
    if result and "sgs/hero" in result:
        ok("D5: <header class='sgs-hero'> at top level emits sgs/hero (not chrome-skipped)")
    else:
        fail("D5", f"expected sgs/hero in markup, got {result!r}")

    # D5 regression: bare <header> still chrome-skipped
    html4 = '<header><div>chrome</div></header>'
    node4 = BeautifulSoup(html4, "html.parser").find("header")
    result4 = convert.walk(node4, css_rules={}, is_top_level=True)
    if result4 is None:
        ok("D5 regression: bare <header> still chrome-skipped (no sgs-* classes)")
    else:
        fail("D5 regression", f"bare <header> should chrome-skip, got {result4!r}")

    # D5 regression: <footer class="sgs-cta-section"> emits block
    html5 = '<footer class="sgs-cta-section"></footer>'
    node5 = BeautifulSoup(html5, "html.parser").find("footer")
    result5 = convert.walk(node5, css_rules={}, is_top_level=True)
    if result5 and "sgs/cta-section" in result5:
        ok("D5 regression: <footer class='sgs-cta-section'> emits sgs/cta-section")
    else:
        fail("D5 regression", f"expected sgs/cta-section, got {result5!r}")

    # ------------------------------------------------------------------
    # D3 — emit_atomic uses CURRENT block.json attr names
    # ------------------------------------------------------------------
    # Pre-fix: sgs/heading emitted with {headline, headlineLevel} (legacy
    # attrs from pre-γ-rebuild) — produces invalid block markup.
    # Post-fix: sgs/heading emits with {content, level} matching current schema.

    # Test bare <h2> → sgs/heading with content + level
    h2_node = BeautifulSoup("<h2>My heading</h2>", "html.parser").find("h2")
    attrs = convert._atomic_attrs_for(h2_node, "sgs/heading")
    if attrs.get("content") == "My heading" and attrs.get("level") == "h2":
        ok("D3 sgs/heading: emits content+level (current schema)")
    else:
        fail("D3 sgs/heading", f"expected content+level, got {attrs!r}")

    # Test core/heading still uses WP core schema (level int + content)
    h3_node = BeautifulSoup("<h3>Core heading</h3>", "html.parser").find("h3")
    attrs_core = convert._atomic_attrs_for(h3_node, "core/heading")
    if attrs_core.get("level") == 3 and attrs_core.get("content") == "Core heading":
        ok("D3 core/heading: emits level(int)+content (WP core schema)")
    else:
        fail("D3 core/heading", f"expected level=3 + content, got {attrs_core!r}")

    # Test sgs/media → imageUrl, imageAlt (NOT src/alt)
    img_node = BeautifulSoup('<img src="/a.jpg" alt="alt text">', "html.parser").find("img")
    img_attrs = convert._atomic_attrs_for(img_node, "sgs/media")
    if img_attrs.get("imageAlt") == "alt text" and "imageUrl" in img_attrs:
        ok("D3 sgs/media: emits imageUrl+imageAlt (current schema)")
    else:
        fail("D3 sgs/media", f"expected imageUrl+imageAlt, got {img_attrs!r}")

    # Test sgs/quote → body (array, not value string)
    bq_node = BeautifulSoup("<blockquote>Quote text</blockquote>", "html.parser").find("blockquote")
    bq_attrs = convert._atomic_attrs_for(bq_node, "sgs/quote")
    if isinstance(bq_attrs.get("body"), list) and "Quote text" in bq_attrs["body"]:
        ok("D3 sgs/quote: emits body as array (current schema)")
    else:
        fail("D3 sgs/quote", f"expected body=[...], got {bq_attrs!r}")

    # Test sgs/icon-list → items array of {icon, text} dicts
    ul_node = BeautifulSoup("<ul><li>A</li><li>B</li></ul>", "html.parser").find("ul")
    ul_attrs = convert._atomic_attrs_for(ul_node, "sgs/icon-list")
    items = ul_attrs.get("items") or []
    if (isinstance(items, list) and len(items) == 2
            and items[0].get("text") == "A" and items[0].get("icon") == "check"):
        ok("D3 sgs/icon-list: emits items=[{icon,text},...] (current schema)")
    else:
        fail("D3 sgs/icon-list", f"expected items=[{{icon,text}}], got {ul_attrs!r}")

    # Test sgs/button → label+url (still correct)
    a_node = BeautifulSoup('<a href="/x">Click</a>', "html.parser").find("a")
    a_attrs = convert._atomic_attrs_for(a_node, "sgs/button")
    if a_attrs.get("label") == "Click" and a_attrs.get("url") == "/x":
        ok("D3 sgs/button: emits label+url (correct unchanged)")
    else:
        fail("D3 sgs/button", f"expected label+url, got {a_attrs!r}")

    # Test sgs/text → text (still correct)
    p_node = BeautifulSoup("<p>Paragraph</p>", "html.parser").find("p")
    p_attrs = convert._atomic_attrs_for(p_node, "sgs/text")
    if p_attrs.get("text") == "Paragraph":
        ok("D3 sgs/text: emits text (correct unchanged)")
    else:
        fail("D3 sgs/text", f"expected text, got {p_attrs!r}")

    # Test sgs/divider hr → {} (no attrs)
    hr_node = BeautifulSoup("<hr>", "html.parser").find("hr")
    hr_attrs = convert._atomic_attrs_for(hr_node, "sgs/divider")
    if hr_attrs == {}:
        ok("D3 sgs/divider: emits empty attrs (no content)")
    else:
        fail("D3 sgs/divider", f"expected {{}}, got {hr_attrs!r}")

    # ------------------------------------------------------------------
    # D2 — flush_essence_matches importable from converter_v2 package
    # ------------------------------------------------------------------
    try:
        from orchestrator.converter_v2 import flush_essence_matches as fem
        result = fem()
        if isinstance(result, list):
            ok("D2: flush_essence_matches imports + returns list")
        else:
            fail("D2", f"flush_essence_matches returned {type(result)} not list")
    except ImportError as e:
        fail("D2", f"ImportError: {e}")

    # ------------------------------------------------------------------
    # D4 — seed_d1_sidecar fully removed (A4 cleanup 2026-06-04)
    # ------------------------------------------------------------------
    # The stub was deleted in A4; importing it must now raise ImportError.
    try:
        from orchestrator.converter_v2 import seed_d1_sidecar as sds  # noqa: F401
        fail("D4", "seed_d1_sidecar is still importable — should have been removed by A4 cleanup")
    except ImportError:
        ok("D4: seed_d1_sidecar correctly not importable (A4 cleanup)")
    except Exception as e:
        fail("D4", f"Unexpected exception importing seed_d1_sidecar: {e}")

    # D4 regression: _D1_SIDECAR + _load_d1_assignments removed from convert module
    convert_d1_present = hasattr(convert, "_D1_SIDECAR") or hasattr(convert, "_load_d1_assignments")
    if not convert_d1_present:
        ok("D4: _D1_SIDECAR + _load_d1_assignments deleted from convert module")
    else:
        fail("D4", "D1 sidecar internals still present in convert module")

    # ------------------------------------------------------------------
    # Summary
    # ------------------------------------------------------------------
    print()
    total = passes + len(failures)
    print(f"Results: {passes}/{total} passed, {len(failures)} failed")

    if failures:
        print("\nFailed tests:")
        for f in failures:
            print(f"  - {f}")
        sys.exit(1)
    else:
        print("All /qc-council fix tests PASS.")


if __name__ == "__main__":
    run_tests()
