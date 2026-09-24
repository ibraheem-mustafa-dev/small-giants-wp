"""Which loop-item boundaries sit inside another boundary.

Stage 1 emits an "item" boundary for each ``<sc-for>`` iteration it finds, in addition to the
top-level sections (``per-section-convention-voter.py::detect_sc_for_item_boundaries``). Spec 44
uses an item to recognise the repeated group it belongs to. An item that sits INSIDE another
boundary is part of that boundary's content, so Stage 4 must never convert it again as a
standalone section: that is how a loop template (``{{ s.name }}``) reached the foot of the Eye
Care page. This module names each nested item's nearest owning boundary.
"""
from __future__ import annotations


def nested_item_owners(tagged_html: str, item_ids: set[str]) -> dict[str, str]:
    """item boundary id -> id of the nearest enclosing boundary, for items that have one.

    ``tagged_html`` is Stage 1's ``tagged-mockup.html`` (every boundary carries
    ``data-sgs-boundary-id``). An item with no enclosing boundary is absent from the result.
    """
    if not item_ids:
        return {}
    from bs4 import BeautifulSoup

    soup = BeautifulSoup(tagged_html, "html.parser")
    owners: dict[str, str] = {}
    for el in soup.find_all(attrs={"data-sgs-boundary-id": True}):
        bid = el["data-sgs-boundary-id"]
        if bid not in item_ids:
            continue
        owner = el.find_parent(attrs={"data-sgs-boundary-id": True})
        if owner is not None:
            owners[bid] = owner["data-sgs-boundary-id"]
    return owners
