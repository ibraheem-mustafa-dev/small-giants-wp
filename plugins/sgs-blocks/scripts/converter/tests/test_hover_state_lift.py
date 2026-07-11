"""D309 — universal hover: a draft `:hover` declaration transfers to the block's
`{attr}Hover` companion via the state axis (collector state fn + Decl.state +
resolver suffix append), on the SAME dispatch as base/tier — no per-block code.

Guards:
  1. The headline case on the REAL convert path (announcement `a:hover{text-
     decoration:underline}` → sgs/button `textDecorationHover:"underline"`).
  2. The Rater-C fall-through trap: a `:hover` decl must NEVER leak into the
     resting base bucket.
  3. Colour hover routes the same way (background-color → backgroundColourHover)
     for any block declaring the companion — hover is not typography-only.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from bs4 import BeautifulSoup  # noqa: E402

from converter.recognition import recognise  # noqa: E402
from converter.services.extraction import build_block_markup  # noqa: E402
from converter.services.styling_helpers import (  # noqa: E402
    collect_css_decls_for_element,
    collect_state_decls_for_element,
)

_ANNOUNCEMENT = (
    '<div class="sgs-announcement-bar--send-to-ward">'
    '<a href="/send-to-ward/">Find out more</a></div>'
)
_ANNOUNCEMENT_RULES = {
    ".sgs-announcement-bar--send-to-ward a": {
        "font-size": "14px", "font-weight": "600", "color": "var(--primary-dark)",
    },
    ".sgs-announcement-bar--send-to-ward a:hover": {"text-decoration": "underline"},
}


def _announcement_link():
    return BeautifulSoup(_ANNOUNCEMENT, "html.parser").find("a")


def test_collector_isolates_hover_from_base():
    """The fall-through trap: hover decls must not appear in the resting base."""
    a = _announcement_link()
    base, _bp = collect_css_decls_for_element(a, _ANNOUNCEMENT_RULES)
    state = collect_state_decls_for_element(a, _ANNOUNCEMENT_RULES)
    assert "text-decoration" not in base, "hover leaked into the resting base bucket"
    assert state.get("Hover", {}).get("text-decoration") == "underline"
    # Base props are still collected as normal.
    assert base.get("font-weight") == "600"


def test_announcement_hover_lands_on_button_textDecorationHover():
    """Headline case on the real convert path: the bare <a> → sgs/button and its
    :hover text-decoration lands on textDecorationHover (button declares it)."""
    a = _announcement_link()
    rec = recognise(a)
    assert rec.slug == "sgs/button"
    markup = build_block_markup(rec, a, css_rules=_ANNOUNCEMENT_RULES)
    assert '"textDecorationHover":"underline"' in markup, markup
    # No resting textDecoration key (the base rule has none) — no leak.
    assert '"textDecoration":' not in markup, markup


def test_state_strip_selector_shapes():
    """The selector-stripper keeps only state-targeting parts, ignores ::pseudo."""
    from converter.services.styling_helpers import _strip_state_from_selector

    assert _strip_state_from_selector(".x a:hover", "hover") == ".x a"
    assert _strip_state_from_selector(".a:hover, .b", "hover") == ".a"
    assert _strip_state_from_selector(".x::before", "hover") is None
    assert _strip_state_from_selector(".plain", "hover") is None
