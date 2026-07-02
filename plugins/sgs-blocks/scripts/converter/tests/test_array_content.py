"""test_array_content — the DB-recognition array field-lift (Spec 31 §3.B4 / FR-31-2.5).

Replaces the 2026-06-28 hand-declared-selector tests (deleted with the
``array_item_fields``/``_lift_field`` mechanism, 2026-07-02). These exercise the
DB-recognition resolver on a REAL block (sgs/trust-bar) + the real Mama's badge
structure: structural item detection + the 2-layer field match (slot name, then
role-fallback) — no hand-declared selectors anywhere.

Run from plugins/sgs-blocks/scripts:
    python -m pytest converter/tests/test_array_content.py -v --import-mode=importlib
"""
from __future__ import annotations

from bs4 import BeautifulSoup

from converter.resolvers.array_content import lift_array_content

# The real Mama's trust-bar section shape: __inner grid → 3 __badge siblings,
# each with __icon (svg) + __text (caption). Note __text, NOT __label — the
# role-fallback must still fill the block's `label` field (text-content).
_TRUST_BAR = """
<section class="sgs-trust-bar"><div class="sgs-trust-bar__inner">
  <div class="sgs-trust-bar__badge">
    <span class="sgs-trust-bar__icon"><svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg></span>
    <span class="sgs-trust-bar__text">Registered Food Business</span></div>
  <div class="sgs-trust-bar__badge">
    <span class="sgs-trust-bar__icon"><svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg></span>
    <span class="sgs-trust-bar__text">Free UK Delivery</span></div>
  <div class="sgs-trust-bar__badge">
    <span class="sgs-trust-bar__icon"><svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg></span>
    <span class="sgs-trust-bar__text">Trusted Service</span></div>
</div></section>
"""


def _root(html: str):
    return BeautifulSoup(html, "html.parser").find(True)


def test_structural_item_detection_finds_all_badges():
    """The resolver detects the repeating __badge siblings with no item_selector."""
    attrs, _gaps = lift_array_content(_root(_TRUST_BAR), "sgs/trust-bar", media_map={})
    assert "items" in attrs
    assert len(attrs["items"]) == 3  # all 3 badges detected structurally


def test_role_fallback_fills_label_from_text_child():
    """A draft __text child (text-content role) fills the block's `label` field
    (also text-content) via the role-fallback — the mechanism's whole point."""
    attrs, _gaps = lift_array_content(_root(_TRUST_BAR), "sgs/trust-bar", media_map={})
    labels = [it.get("label") for it in attrs["items"]]
    assert labels == ["Registered Food Business", "Free UK Delivery", "Trusted Service"]


def test_slot_name_match_fills_icon():
    """__icon → icon slot → icon field by direct name/slot match (Layer 1)."""
    attrs, _gaps = lift_array_content(_root(_TRUST_BAR), "sgs/trust-bar", media_map={})
    # The check-path svg resolves to the lucide 'check' slug on every badge.
    assert all(it.get("icon") == "check" for it in attrs["items"])


def test_no_client_copy_leak_only_draft_content():
    """The lifted items carry the DRAFT captions, never the block.json default."""
    attrs, _gaps = lift_array_content(_root(_TRUST_BAR), "sgs/trust-bar", media_map={})
    joined = " ".join(it.get("label", "") for it in attrs["items"])
    assert "Handmade in Birmingham" not in joined  # the old client-copy default


def test_capability_gate_blocks_uncapable():
    """A block without array-content-lift is a no-op (opt-in, R-31-1)."""
    attrs, gaps = lift_array_content(_root(_TRUST_BAR), "sgs/container", media_map={})
    assert attrs == {} and gaps == []
