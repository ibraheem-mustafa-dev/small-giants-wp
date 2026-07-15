"""Spec 31 Phase 5d.5 + 5d.6 + 5d.8 self-test for modifier_extractors.py.

Plan contracts:
  5d.5  3 button DOM elements with different visual treatments -> correct
        modifier (primary / secondary / ghost).
  5d.6  3 modifier strings -> well-formed {verb, args, raw, parsed} JSON.
  5d.8  hero attrs matching `variant: split` defaults exactly -> matcher
        picks split + emits zero overrides.
"""
from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

HERE = Path(__file__).parent
SPEC = importlib.util.spec_from_file_location("modifier_extractors",
                                              HERE / "modifier_extractors.py")
mod = importlib.util.module_from_spec(SPEC)
sys.modules["modifier_extractors"] = mod
SPEC.loader.exec_module(mod)


# ---- 5d.5 button-role ----


def test_button_role_primary() -> None:
    out = mod.button_role({
        "backgroundColor": "#0F7E80",
        "textColor": "#FFFFFF",
        "borderColor": "",
        "borderWidth": "0",
        "textDecoration": "none",
    })
    assert out["modifier"] == "primary", f"got {out}"
    assert out["confidence"] >= 0.9
    print(f"  PASS  button-primary: solid bg -> primary (signals={out['signals']})")


def test_button_role_secondary() -> None:
    out = mod.button_role({
        "backgroundColor": "transparent",
        "textColor": "#0F7E80",
        "borderColor": "#0F7E80",
        "borderWidth": "2px",
        "textDecoration": "none",
    })
    assert out["modifier"] == "secondary", f"got {out}"
    print(f"  PASS  button-secondary: transparent + border -> secondary")


def test_button_role_ghost() -> None:
    out = mod.button_role({
        "backgroundColor": "transparent",
        "textColor": "#0F7E80",
        "borderColor": "",
        "borderWidth": "0",
        "textDecoration": "underline",
    })
    assert out["modifier"] == "ghost", f"got {out}"
    print(f"  PASS  button-ghost: transparent + no border + underline -> ghost")


# ---- 5d.6 dynamic-link ----


def test_dynamic_link_latest_post() -> None:
    out = mod.dynamic_link(":latest-post(category=blog,limit=3)")
    assert out["parsed"] is True, f"should parse, got {out}"
    assert out["verb"] == "latest-post"
    assert out["args"] == {"category": "blog", "limit": "3"}
    print(f"  PASS  dynamic-link: :latest-post(category=blog,limit=3) parsed")


def test_dynamic_link_no_args() -> None:
    out = mod.dynamic_link(":site-url")
    assert out["parsed"] is True
    assert out["verb"] == "site-url"
    assert out["args"] == {}
    print(f"  PASS  dynamic-link: :site-url (no args) parsed")


def test_dynamic_link_archive() -> None:
    out = mod.dynamic_link(":archive-link(post-type=event)")
    assert out["parsed"] is True
    assert out["verb"] == "archive-link"
    assert out["args"] == {"post-type": "event"}
    print(f"  PASS  dynamic-link: :archive-link(post-type=event) parsed")


def test_dynamic_link_non_modifier_href_not_parsed() -> None:
    """Regular URLs must NOT be misclassified as dynamic-link modifiers."""
    for href in ("https://example.com", "/about", "#anchor", "mailto:x@y.z", "", None):
        out = mod.dynamic_link(href)
        assert out["parsed"] is False, f"{href!r} mis-parsed: {out}"
    print(f"  PASS  dynamic-link: 5 plain hrefs correctly NOT parsed")


# ---- 5d.8 block-variation matcher ----


def hero_block_json_with_variations() -> dict:
    return {
        "name": "sgs/hero",
        "attributes": {},
        "variations": [
            {
                "name": "centered",
                "attributes": {"variant": "centered", "verticalAlignment": "center"},
            },
            {
                "name": "split",
                "attributes": {
                    "variant": "split",
                    "splitColumnRatio": "1fr 1fr",
                    "verticalAlignment": "center",
                },
            },
            {
                "name": "background-image",
                "attributes": {"variant": "background-image"},
            },
        ],
    }


def test_variation_match_split_zero_overrides() -> None:
    """Plan contract: extracted attrs match `split` defaults exactly -> zero overrides."""
    extracted = {
        "variant": "split",
        "splitColumnRatio": "1fr 1fr",
        "verticalAlignment": "center",
    }
    out = mod.match_block_variation(hero_block_json_with_variations(), extracted)
    assert out["variation_slug"] == "split", f"got {out['variation_slug']}"
    assert out["match_score"] == 3, f"expected score 3, got {out['match_score']}"
    assert out["overrides_to_emit"] == {}, f"expected zero overrides, got {out['overrides_to_emit']}"
    print(f"  PASS  variation-split-zero-overrides (plan contract)")


def test_variation_match_picks_closest() -> None:
    """Partial match still picks the closest variation."""
    extracted = {"variant": "split", "verticalAlignment": "center"}   # 2 of split's attrs
    out = mod.match_block_variation(hero_block_json_with_variations(), extracted)
    assert out["variation_slug"] == "split"
    # No overrides needed since all extracted attrs ARE in the split variation
    assert out["overrides_to_emit"] == {}
    print(f"  PASS  variation-partial: picks closest match")


def test_variation_overrides_differing_attrs() -> None:
    """Extracted attrs that differ from the picked variation become overrides."""
    extracted = {
        "variant": "split",
        "splitColumnRatio": "2fr 1fr",     # differs from variation's 1fr 1fr
    }
    out = mod.match_block_variation(hero_block_json_with_variations(), extracted)
    assert out["variation_slug"] == "split"
    assert "splitColumnRatio" in out["overrides_to_emit"]
    print(f"  PASS  variation-overrides: differing attr emitted as override")


def test_variation_no_variations_declared() -> None:
    """When block.json declares no variations, all extracted attrs are overrides."""
    bj = {"name": "sgs/info-box", "attributes": {}, "variations": []}
    extracted = {"variant": "boxed", "borderWidth": "1px"}
    out = mod.match_block_variation(bj, extracted)
    assert out["variation_slug"] is None
    assert out["overrides_to_emit"] == extracted
    print(f"  PASS  variation-none-declared: all attrs become overrides")


def main() -> int:
    print("Spec 31 Phase 5d.5 + 5d.6 + 5d.8 -- modifier_extractors contract")
    # 5d.5
    test_button_role_primary()
    test_button_role_secondary()
    test_button_role_ghost()
    # 5d.6
    test_dynamic_link_latest_post()
    test_dynamic_link_no_args()
    test_dynamic_link_archive()
    test_dynamic_link_non_modifier_href_not_parsed()
    # 5d.8
    test_variation_match_split_zero_overrides()
    test_variation_match_picks_closest()
    test_variation_overrides_differing_attrs()
    test_variation_no_variations_declared()
    print("\nMODIFIER-EXTRACTORS-5D.5+6+8: PASS (3 button + 4 dynamic-link + 4 variation)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
