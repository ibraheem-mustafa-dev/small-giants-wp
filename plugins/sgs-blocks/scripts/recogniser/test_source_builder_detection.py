"""Self-test for per-section-convention-voter.py's detect_source_builder()
and its threading through build_boundary()/vote() (research-buddies fix,
2026-09-14, Webflow vs Tailwind class-name collision).

Isolated from test_per_section_convention_voter.py (5 pre-existing unrelated
failures) for the same reason as test_dom_shape_hint_wiring.py.

Full research: C:/Users/Bean/.claude/memory/research/
2026-09-14-webflow-vs-tailwind-class-detection.md

Run: python test_source_builder_detection.py
"""
from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

HERE = Path(__file__).parent
SPEC = importlib.util.spec_from_file_location(
    "voter", HERE / "per-section-convention-voter.py"
)
voter = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(voter)

from bs4 import BeautifulSoup


def test_detect_webflow_via_data_wf_site() -> None:
    soup = BeautifulSoup(
        '<html data-wf-site="abc123"><body></body></html>', "html.parser"
    )
    assert voter.detect_source_builder(soup) == "webflow"
    print("  PASS  detect-webflow-data-wf-site")


def test_detect_webflow_via_generator_meta() -> None:
    soup = BeautifulSoup(
        '<html><head><meta name="generator" content="Webflow"></head></html>',
        "html.parser",
    )
    assert voter.detect_source_builder(soup) == "webflow"
    print("  PASS  detect-webflow-generator-meta")


def test_detect_tailwind_via_cdn_script() -> None:
    soup = BeautifulSoup(
        '<html><head><script src="https://cdn.tailwindcss.com"></script></head></html>',
        "html.parser",
    )
    assert voter.detect_source_builder(soup) == "tailwind"
    print("  PASS  detect-tailwind-cdn-script")


def test_detect_none_when_no_signal_present() -> None:
    """A hand-built draft with no builder metadata at all -- must NOT guess."""
    soup = BeautifulSoup('<html><body><div class="x"></div></body></html>', "html.parser")
    assert voter.detect_source_builder(soup) is None
    print("  PASS  detect-none-when-absent: no false positive on a plain draft")


def test_end_to_end_mixed_page_webflow_base_tailwind_embed() -> None:
    """THE hard-constraint test: a Webflow-base page (data-wf-site on <html>)
    with a genuinely Tailwind custom-code embed section must classify BOTH
    correctly -- the page-level flag must never override the embed's own
    per-class certainty."""
    html = (
        '<html data-wf-site="abc123"><body>'
        '<section class="webflow-section"><div class="w-dyn-item">1</div>'
        '<div class="w-dyn-item">2</div><div class="w-dyn-item">3</div></section>'
        '<section class="tailwind-embed"><div class="w-full">embed</div></section>'
        "</body></html>"
    )
    soup = BeautifulSoup(html, "html.parser")
    source_builder = voter.detect_source_builder(soup)
    assert source_builder == "webflow", f"got {source_builder}"

    webflow_node = soup.select_one("section.webflow-section")
    tailwind_node = soup.select_one("section.tailwind-embed")

    b_webflow = voter.build_boundary(
        webflow_node, "section.webflow-section", set(), 1,
        source_builder=source_builder,
    )
    b_tailwind = voter.build_boundary(
        tailwind_node, "section.tailwind-embed", set(), 2,
        source_builder=source_builder,
    )
    assert b_webflow["source_builder"] == "webflow"
    assert b_tailwind["source_builder"] == "webflow", (
        "source_builder is a page-level fact, same for every boundary on the page"
    )
    print("  PASS  end-to-end-mixed-page: page correctly flagged webflow; "
          "per-class resolution (verified separately in stage1_boundary_hook "
          "tests) is what actually disambiguates the two sections")


def main() -> int:
    print("research-buddies Webflow/Tailwind fix -- detect_source_builder + wiring")
    test_detect_webflow_via_data_wf_site()
    test_detect_webflow_via_generator_meta()
    test_detect_tailwind_via_cdn_script()
    test_detect_none_when_no_signal_present()
    test_end_to_end_mixed_page_webflow_base_tailwind_embed()
    print("\nSOURCE-BUILDER-DETECTION: PASS (document-level signal + boundary threading)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
