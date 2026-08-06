"""Device-tier detection must read a modifier on ANY own-family BEM class.

WHY THIS FILE EXISTS
--------------------
``walk._family_modifier`` used to return ``bem.modifier`` from the FIRST
own-family class it matched, whether or not that class carried a modifier.
SGS drafts author the modifier as a SECOND class::

    class="sgs-container__background-image sgs-container__background-image--mobile"

so the first class parsed to ``modifier=None``, the device tier was never
detected, and the element resolved to the BASE attr. The mobile asset was
therefore written into the DESKTOP attribute and the desktop one dropped.

That is the D474 failure, and this file exists because it was NOT hero-only.
Measured 2026-08-06 on ``sgs/container`` — a block with no scalar-media role
and no bespoke branch — the pre-fix walk lifted
``backgroundImage='/bg-mob.jpg'``. Any block whose draft uses the two-class
shape was affected; ``sgs/hero`` merely had a bespoke branch (Mechanism-B
branch A) papering over it, which is why it looked block-specific.

WHAT THESE TESTS PIN
--------------------
  * the TWO-CLASS shape resolves the tier sibling (the regression itself);
  * the ONE-CLASS shape still resolves it (no behaviour traded away);
  * a NON-TIER modifier (``--active``) does NOT invent a tier, and does not
    block one either — the selection rule is "the modifier that maps to a DB
    breakpoint suffix wins", never "whichever modifier came first". A
    positional tie-break here would be the same defect class D505 removed
    from the sibling resolver.

They enter at ``run_universal_content_walk`` — the function the pipeline
actually calls — and stub NOTHING, so they read the real database. If the DB
is absent (fresh clone, CI) they skip rather than fail, matching the contract
the prebuild DB gates use: a skip is honest, a false pass is not.
"""

from __future__ import annotations

import sqlite3

import pytest
from bs4 import BeautifulSoup

from converter import walk as W
from converter.context import Recognition, ScalarLift
from converter.db import db_lookup


def _db_available() -> bool:
    try:
        con = sqlite3.connect(f"file:{db_lookup.SGS_DB}?mode=ro", uri=True)
    except sqlite3.OperationalError:
        return False
    try:
        con.execute("SELECT 1 FROM block_attributes LIMIT 1").fetchone()
        return True
    except sqlite3.OperationalError:
        return False
    finally:
        con.close()


requires_db = pytest.mark.skipif(
    not _db_available(), reason="knowledge-base DB absent (gitignored local artefact)"
)


def _walk(markup: str) -> dict[str, object]:
    rec = Recognition(
        kind="named", slug="sgs/container", container_kind="section", delegates_content=1
    )
    root = BeautifulSoup(markup, "html.parser").find("section")
    results = W.run_universal_content_walk(rec, root, {}, {})
    return {
        r.attr: (r.value.get("url") if isinstance(r.value, dict) else r.value)
        for r in results
        if isinstance(r, ScalarLift)
    }


# The shape SGS drafts actually author: base element class FIRST, modifier
# class second. Verbatim structure from sites/mamas-munches/.../index.html:775.
TWO_CLASS = (
    '<section class="sgs-container">'
    '  <img class="sgs-container__background-image '
    'sgs-container__background-image--mobile" src="/bg-mob.jpg" alt="m">'
    '</section>'
)

ONE_CLASS = (
    '<section class="sgs-container">'
    '  <img class="sgs-container__background-image--mobile"'
    '       src="/bg-mob.jpg" alt="m">'
    '</section>'
)

NON_TIER_MODIFIER = (
    '<section class="sgs-container">'
    '  <img class="sgs-container__background-image '
    'sgs-container__background-image--active" src="/bg.jpg" alt="a">'
    '</section>'
)


@requires_db
def test_two_class_markup_resolves_the_tier_sibling():
    """THE REGRESSION. Pre-fix this lifted backgroundImage='/bg-mob.jpg' —
    the mobile crop written into the desktop attribute."""
    lifts = _walk(TWO_CLASS)
    assert lifts.get("backgroundImageMobile") == "/bg-mob.jpg", (
        "the --mobile modifier on the SECOND own-family class was not read; "
        f"got {lifts!r}. A value under 'backgroundImage' is the known failure: "
        "the mobile asset lands in the desktop attr and renders on desktop."
    )
    assert "backgroundImage" not in lifts, (
        f"base attr must not also claim the mobile asset; got {lifts!r}"
    )


@requires_db
def test_single_class_markup_still_resolves_the_tier_sibling():
    """The one-class shape already worked — prove it was not traded away."""
    assert _walk(ONE_CLASS).get("backgroundImageMobile") == "/bg-mob.jpg"


@requires_db
def test_non_tier_modifier_does_not_invent_a_device_tier():
    """NEGATIVE CONTROL. `--active` is a real modifier in the corpus
    (product-card__pill) and is NOT a breakpoint. It must resolve the BASE
    attr — never a tier sibling, and never a loud gap."""
    lifts = _walk(NON_TIER_MODIFIER)
    assert lifts.get("backgroundImage") == "/bg.jpg", (
        f"a non-tier modifier must fall through to the base attr; got {lifts!r}"
    )
    assert "backgroundImageMobile" not in lifts, (
        f"'--active' must not be mapped to a device tier; got {lifts!r}"
    )
