"""A node recognised by its tag (atomic swap) lifts its own content (2026-09-24 design, C2).

A classless ``<img>`` becomes ``sgs/media``. Before the fix, the universal walk's leaf fallback
ran only for a block with ONE unambiguous primary content attr and without the
scalar-content-lift capability. ``sgs/media`` fails both, so the block emitted its styling
and no image (the Eye Care about-strip photo).

Run from plugins/sgs-blocks/scripts:
    python -m pytest converter/tests/test_atomic_self_lift.py -q --import-mode=importlib
"""
from __future__ import annotations

import sys
from pathlib import Path

from bs4 import BeautifulSoup

_SCRIPTS_ROOT = Path(__file__).resolve().parents[2]
if str(_SCRIPTS_ROOT) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_ROOT))

from converter.db import db_lookup  # noqa: E402
from converter.recognition import recognise  # noqa: E402
from converter.services import extraction  # noqa: E402

_IMG = '<img alt="Person wearing sunglasses" src="https://example.test/p.jpg">'


def _convert(html: str) -> str:
    node = BeautifulSoup(html, "html.parser").find(True)
    rec = recognise(node)
    return extraction._child_content_for_node(node, rec.slug)


def test_precondition_old_gate_skipped_media():
    """Control: the two facts that made the old gate skip sgs/media still hold, so the
    positive test below exercises the new atomic route, not the old one."""
    assert db_lookup.primary_content_attr("sgs/media") is None
    assert "scalar-content-lift" in db_lookup.capabilities_for("sgs/media")
    rec = recognise(BeautifulSoup(_IMG, "html.parser").find("img"))
    assert (rec.slug, rec.kind) == ("sgs/media", "atomic")


def test_bare_img_lifts_url_and_alt():
    markup = _convert(_IMG)
    assert '"imageUrl":"https://example.test/p.jpg"' in markup
    assert '"imageAlt":"Person wearing sunglasses"' in markup


def test_bare_paragraph_unchanged():
    """A bare <p> already lifted through its primary attr; the atomic route keeps that."""
    markup = _convert("<p>Single vision from 59 pounds.</p>")
    assert "wp:sgs/text" in markup
    assert '"text":"Single vision from 59 pounds."' in markup
