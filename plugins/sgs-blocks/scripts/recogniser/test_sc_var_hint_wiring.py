"""Self-test for per-section-convention-voter.py's sc_var_hint wiring +
leftover-bucket-router.py's route_sc_var_hints (universal-pipeline upgrade,
Piece 1, 2026-09-14).

Run: python test_sc_var_hint_wiring.py
"""
from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

HERE = Path(__file__).parent

_VOTER_SPEC = importlib.util.spec_from_file_location(
    "voter", HERE / "per-section-convention-voter.py"
)
voter = importlib.util.module_from_spec(_VOTER_SPEC)
_VOTER_SPEC.loader.exec_module(voter)

_ROUTER_SPEC = importlib.util.spec_from_file_location(
    "router", HERE / "leftover-bucket-router.py"
)
router = importlib.util.module_from_spec(_ROUTER_SPEC)
_ROUTER_SPEC.loader.exec_module(router)

from bs4 import BeautifulSoup


def _build(html: str, selector: str) -> dict:
    soup = BeautifulSoup(html, "html.parser")
    node = soup.find("section")
    return voter.build_boundary(node, selector, set(), 1)


def test_sc_for_wrapper_on_section_root_attaches_var_metadata() -> None:
    """A Claude Design section itself wrapped by sc-for (e.g. the reasons
    strip) must carry sc_var_kind/name/hint_count on the boundary."""
    html = (
        '<sc-for list="{{ reasons }}" as="r" hint-placeholder-count="4">'
        "<section><h3>{{ r.title }}</h3></section></sc-for>"
    )
    b = _build(html, "section")
    assert b.get("sc_var_kind") == "for", f"got {b}"
    assert b.get("sc_var_name") == "reasons"
    assert b.get("sc_var_hint_count") == 4
    print(f"  PASS  section wrapped by sc-for carries var metadata: sc_var_name={b['sc_var_name']!r}")


def test_no_sc_wrapper_leaves_fields_absent() -> None:
    """A plain BEM section (the overwhelming majority case) must not carry
    any sc_var_* keys at all -- zero footprint for non-Claude-Design drafts."""
    b = _build('<section class="sgs-hero"><h1>Title</h1></section>', "section.sgs-hero")
    assert "sc_var_kind" not in b
    assert "sc_var_name" not in b
    assert "sc_var_hint" not in b
    print("  PASS  ordinary BEM section carries zero sc_var_* keys")


def test_gap_candidate_sc_for_section_with_bespoke_name_gets_count_hint() -> None:
    """A classless, unrecognised section wrapped by sc-for with a bespoke
    (non-alias-matching) name and a repeat count must fall to fall to the
    Tier A count-based card-grid hint."""
    html = (
        '<sc-for list="{{ megaTopBrands }}" as="b" hint-placeholder-count="10">'
        "<section><div>1</div><div>2</div></section></sc-for>"
    )
    b = _build(html, "section")
    assert b["fallback_strategy"] == "gap-candidate", f"got {b['fallback_strategy']}"
    hint = b.get("sc_var_hint")
    assert hint is not None and hint["block"] == "card-grid", f"got {hint}"
    assert hint["confidence"] <= 0.5
    print(f"  PASS  gap-candidate sc-for section (bespoke name) gets count hint: {hint}")


def test_sc_if_never_produces_a_block_identity_hint() -> None:
    """Research-buddies finding, hard-enforced: sc-if wrapping a section
    must NEVER produce sc_var_hint, even if the section is a gap-candidate
    and the sc-if value name happens to collide with a slots.aliases entry."""
    html = (
        '<sc-if value="{{ menuOpen }}"><section><div>x</div></section></sc-if>'
    )
    b = _build(html, "section")
    assert b.get("sc_var_kind") == "if"
    assert "sc_var_hint" not in b, f"sc-if must never yield a block-identity hint: {b.get('sc_var_hint')}"
    print("  PASS  sc-if wrapper never produces a block-identity hint")


def test_route_sc_var_hints_enriches_matching_gap_bucket_item() -> None:
    """End-to-end: a gap-candidate boundary's sc_var_hint reaches the
    matching unrecognised_class bucket item as pure enrichment."""
    html = (
        '<sc-for list="{{ megaTopBrands }}" as="b" hint-placeholder-count="10">'
        "<section><div>1</div><div>2</div></section></sc-for>"
    )
    b = _build(html, "section")
    boundaries = [b]
    buckets = {
        "unrecognised_class": [
            {"boundary_id": b["boundary_id"], "section_id": b["section_id"]}
        ],
        "unrecognised_section": [],
    }
    router.route_sc_var_hints(boundaries, buckets)
    item = buckets["unrecognised_class"][0]
    assert item.get("sc_var_hint", {}).get("block") == "card-grid", f"got {item}"
    print(f"  PASS  route_sc_var_hints enriches bucket item: {item['sc_var_hint']}")


def test_route_sc_var_hints_never_overwrites_existing_key() -> None:
    """Pure-enrichment guarantee: an item that already carries sc_var_hint
    (e.g. from a prior routing pass) must not be overwritten."""
    html = (
        '<sc-for list="{{ megaTopBrands }}" as="b" hint-placeholder-count="10">'
        "<section><div>1</div><div>2</div></section></sc-for>"
    )
    b = _build(html, "section")
    boundaries = [b]
    sentinel = {"block": "sentinel", "confidence": 0.1, "evidence": "pre-existing"}
    buckets = {
        "unrecognised_class": [
            {
                "boundary_id": b["boundary_id"],
                "section_id": b["section_id"],
                "sc_var_hint": sentinel,
            }
        ],
        "unrecognised_section": [],
    }
    router.route_sc_var_hints(boundaries, buckets)
    assert buckets["unrecognised_class"][0]["sc_var_hint"] == sentinel
    print("  PASS  route_sc_var_hints never overwrites an existing sc_var_hint")


def main() -> int:
    print("Universal-pipeline upgrade Piece 1 -- sc_var_hint wiring")
    test_sc_for_wrapper_on_section_root_attaches_var_metadata()
    test_no_sc_wrapper_leaves_fields_absent()
    test_gap_candidate_sc_for_section_with_bespoke_name_gets_count_hint()
    test_sc_if_never_produces_a_block_identity_hint()
    test_route_sc_var_hints_enriches_matching_gap_bucket_item()
    test_route_sc_var_hints_never_overwrites_existing_key()
    print("\nSC-VAR-HINT-WIRING: PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
