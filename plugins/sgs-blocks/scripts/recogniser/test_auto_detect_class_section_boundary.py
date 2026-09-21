"""Self-test for per-section-convention-voter.py::auto_detect_sections --
class-section boundary promotion.

A non-landmark element (typically a <div>) whose BEM ROOT class `sgs-<slug>`
names a block with `blocks.tier = 'class-section'` in sgs-framework.db is a
section boundary whatever its tag; it is emitted once and not recursed into.
Everything else about the walk is unchanged.

Cases (a)-(f) mirror the brief:
  a  <div class="sgs-trust-bar"> between header and main -> boundary
  b  <div class="sgs-testimonial-slider"> (tier 'block')    -> NOT promoted
  c  <div class="sgs-trust-bar__item"> (element class)      -> NOT promoted
  d  <div class="sgs-unknown-thing"> (not in the DB)        -> NOT promoted
  e  <section class="sgs-trust-bar"> is emitted exactly once
  f  DB unreachable -> today's behaviour, no exception, one stderr warning

Run: python test_auto_detect_class_section_boundary.py   (or pytest)
"""
from __future__ import annotations

import importlib.util
import io
import sys
from contextlib import redirect_stderr
from pathlib import Path

from bs4 import BeautifulSoup

HERE = Path(__file__).parent
SPEC = importlib.util.spec_from_file_location(
    "voter", HERE / "per-section-convention-voter.py"
)
voter = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(voter)


def _selectors(html: str) -> list[str]:
    soup = BeautifulSoup(html, "html.parser")
    return [sel for _node, sel in voter.auto_detect_sections(soup)]


def _page(between: str) -> str:
    return (
        "<html><body>"
        "<header class=\"sgs-header\"><p>h</p></header>"
        f"{between}"
        "<main><section class=\"sgs-hero\"><h1>x</h1></section></main>"
        "<footer class=\"sgs-footer\"><p>f</p></footer>"
        "</body></html>"
    )


def test_a_class_section_div_between_header_and_main_is_a_boundary() -> None:
    sels = _selectors(_page('<div class="sgs-trust-bar"><span>a</span></div>'))
    assert sels == [
        "header.sgs-header",
        "div.sgs-trust-bar",
        "section.sgs-hero",
        "footer.sgs-footer",
    ], sels


def test_a_class_section_div_is_not_recursed_into() -> None:
    sels = _selectors(
        _page('<div class="sgs-trust-bar"><section class="sgs-inner">i</section></div>')
    )
    assert "section.sgs-inner" not in sels, sels
    assert "div.sgs-trust-bar" in sels, sels


def test_a_class_section_div_promoted_at_depth() -> None:
    sels = _selectors(
        _page('<div class="wrap"><div class="inner"><div class="sgs-trust-bar">t</div></div></div>')
    )
    assert "div.sgs-trust-bar" in sels, sels


def test_a_second_root_class_is_enough() -> None:
    # Draft class first, annotated root class second: still a boundary.
    sels = _selectors(_page('<div class="sgs-trust-ticker sgs-trust-bar">t</div>'))
    assert "div.sgs-trust-ticker" in sels, sels


def test_b_non_class_section_block_is_not_promoted() -> None:
    sels = _selectors(_page('<div class="sgs-testimonial-slider"><p>q</p></div>'))
    assert not any("testimonial-slider" in s for s in sels), sels


def test_c_bem_element_class_is_not_promoted() -> None:
    sels = _selectors(_page('<div class="sgs-trust-bar__item">i</div>'))
    assert not any("trust-bar__item" in s for s in sels), sels


def test_c2_bem_modifier_class_is_not_promoted() -> None:
    sels = _selectors(_page('<div class="sgs-trust-bar--dark">i</div>'))
    assert not any("trust-bar--dark" in s for s in sels), sels


def test_d_unknown_sgs_class_is_not_promoted() -> None:
    sels = _selectors(_page('<div class="sgs-unknown-thing">u</div>'))
    assert not any("unknown-thing" in s for s in sels), sels


def test_e_section_tag_with_class_section_root_is_emitted_once() -> None:
    sels = _selectors(_page('<section class="sgs-trust-bar"><span>a</span></section>'))
    assert sels.count("section.sgs-trust-bar") == 1, sels


def test_f_db_unreachable_degrades_to_todays_behaviour() -> None:
    original_path = voter._framework_db_path
    original_flag = voter._CLASS_SECTION_WARNED
    voter._framework_db_path = lambda: HERE / "definitely-missing-framework.db"
    voter._CLASS_SECTION_WARNED = False
    try:
        buf = io.StringIO()
        with redirect_stderr(buf):
            first = _selectors(_page('<div class="sgs-trust-bar">t</div>'))
            second = _selectors(_page('<div class="sgs-trust-bar">t</div>'))
        assert first == second == [
            "header.sgs-header",
            "section.sgs-hero",
            "footer.sgs-footer",
        ], (first, second)
        warning = buf.getvalue()
        assert warning.count("[voter] WARN") == 1, warning  # once, not per call
        assert "class-section boundary promotion disabled" in warning, warning
    finally:
        voter._framework_db_path = original_path
        voter._CLASS_SECTION_WARNED = original_flag


def test_landmark_tags_behave_as_before() -> None:
    sels = _selectors(_page(""))
    assert sels == ["header.sgs-header", "section.sgs-hero", "footer.sgs-footer"], sels


def test_class_section_slug_roots_come_from_the_db() -> None:
    roots = voter._class_section_slug_roots()
    assert "trust-bar" in roots and "hero" in roots, roots
    assert "testimonial-slider" not in roots, roots


def main() -> int:
    tests = [(n, f) for n, f in sorted(globals().items()) if n.startswith("test_") and callable(f)]
    failures: list[str] = []
    for name, fn in tests:
        try:
            fn()
            print(f"  OK {name}")
        except AssertionError as exc:
            failures.append(name)
            print(f"  FAIL {name}: {exc}")
    print()
    if failures:
        print(f"FAILED ({len(failures)}): {failures}")
        return 1
    print(f"PASSED ({len(tests)} tests)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
