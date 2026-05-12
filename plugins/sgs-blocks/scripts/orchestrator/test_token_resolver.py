"""Spec 15 Phase 5d.2 self-test for token_resolver.py.

Plan contract: resolve 5 attrs (3 should snap to known tokens, 2 should
flag as gap candidates); assert correct CSS var emitted.
"""
from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path

HERE = Path(__file__).parent
SPEC = importlib.util.spec_from_file_location("token_resolver", HERE / "token_resolver.py")
mod = importlib.util.module_from_spec(SPEC)
sys.modules["token_resolver"] = mod
SPEC.loader.exec_module(mod)


def sample_theme() -> dict:
    """Minimal theme.json shape sufficient for snap_* functions."""
    return {
        "settings": {
            "color": {
                "palette": [
                    {"slug": "primary",      "color": "#0F7E80"},
                    {"slug": "accent",       "color": "#F87A1F"},
                    {"slug": "text",         "color": "#1E1E1E"},
                    {"slug": "surface",      "color": "#FFFFFF"},
                ],
            },
            "spacing": {
                "spacingSizes": [
                    {"slug": "20", "size": "8px"},
                    {"slug": "30", "size": "16px"},
                    {"slug": "40", "size": "24px"},
                    {"slug": "50", "size": "32px"},
                ],
            },
            "typography": {
                "fontSizes": [
                    {"slug": "medium", "size": "16px"},
                    {"slug": "large",  "size": "20px"},
                    {"slug": "xlarge", "size": "32px"},
                ],
                "fontFamilies": [
                    {"slug": "inter", "fontFamily": "Inter, sans-serif", "name": "Inter"},
                ],
            },
        }
    }


def test_colour_snaps_to_token() -> None:
    theme = sample_theme()
    out = mod.resolve("sgs/hero", "backgroundColor", "#0F7E80", theme)
    assert out["role"] == "color", f"role wrong: {out}"
    assert out["token_slug"] == "primary"
    assert out["css_var"] == "var(--wp--preset--color--primary)"
    assert out["confidence"] >= 0.9
    assert out["is_gap_candidate"] is False
    print(f"  PASS  colour: #0F7E80 -> {out['css_var']} @ {out['confidence']}")


def test_spacing_snaps_to_token() -> None:
    theme = sample_theme()
    out = mod.resolve("sgs/hero", "paddingTop", "16px", theme)
    assert out["role"] == "spacing"
    assert out["token_slug"] == "30"
    assert out["css_var"] == "var(--wp--preset--spacing--30)"
    print(f"  PASS  spacing: 16px -> {out['css_var']}")


def test_font_size_snaps() -> None:
    theme = sample_theme()
    out = mod.resolve("sgs/hero", "headlineFontSize", "32px", theme)
    assert out["role"] == "font_size", f"role wrong: {out}"
    assert out["token_slug"] == "xlarge"
    assert "font-size" in out["css_var"]
    print(f"  PASS  font-size: 32px -> {out['css_var']}")


def test_bespoke_colour_flagged_as_gap() -> None:
    """Off-palette pink that Phase 4.5 would surface as a NewTokenCandidate."""
    theme = sample_theme()
    out = mod.resolve("sgs/hero", "backgroundColor", "#F5C2C8", theme)
    # Should be a gap candidate (no close palette match)
    assert out["is_gap_candidate"] is True, f"should flag as gap: {out}"
    assert out["css_var"] is None
    assert out["raw_value"] == "#F5C2C8"
    print(f"  PASS  bespoke-colour: #F5C2C8 flagged as gap candidate")


def test_bespoke_spacing_flagged_as_gap() -> None:
    """28px is between spacing tokens 30(16) and 40(24) -- gap."""
    theme = sample_theme()
    out = mod.resolve("sgs/hero", "paddingBottom", "100px", theme)
    assert out["is_gap_candidate"] is True, f"should flag as gap: {out}"
    print("  PASS  bespoke-spacing: 100px flagged as gap candidate")


def test_no_role_skipped() -> None:
    theme = sample_theme()
    out = mod.resolve("sgs/hero", "headline", "Made for mums", theme)
    assert out["role"] is None
    assert out["snap_skipped_reason"] == "no role mapping for attr"
    print("  PASS  no-role-skipped: text-content attrs not snapped")


def test_empty_value_skipped() -> None:
    theme = sample_theme()
    out = mod.resolve("sgs/hero", "backgroundColor", "", theme)
    assert "not a non-empty string" in out["snap_skipped_reason"]
    out2 = mod.resolve("sgs/hero", "paddingTop", None, theme)
    assert "not a non-empty string" in out2["snap_skipped_reason"]
    print("  PASS  empty-value-skipped: blank + None both skipped without crash")


def test_batch() -> None:
    theme = sample_theme()
    items = [
        {"block_slug": "sgs/hero", "attr_name": "backgroundColor", "raw_value": "#0F7E80"},
        {"block_slug": "sgs/hero", "attr_name": "paddingTop", "raw_value": "16px"},
        {"block_slug": "sgs/hero", "attr_name": "headlineFontSize", "raw_value": "32px"},
        {"block_slug": "sgs/hero", "attr_name": "backgroundColor", "raw_value": "#F5C2C8"},
        {"block_slug": "sgs/hero", "attr_name": "paddingBottom", "raw_value": "100px"},
    ]
    out = mod.resolve_batch(items, theme)
    assert len(out) == 5
    snapped = sum(1 for o in out if not o["is_gap_candidate"] and o["css_var"])
    gaps = sum(1 for o in out if o["is_gap_candidate"])
    assert snapped == 3, f"expected 3 snapped, got {snapped}"
    assert gaps == 2, f"expected 2 gaps, got {gaps}"
    print(f"  PASS  batch: 3 snapped + 2 gap candidates (plan contract)")


def main() -> int:
    print("Spec 15 Phase 5d.2 -- token_resolver contract")
    test_colour_snaps_to_token()
    test_spacing_snaps_to_token()
    test_font_size_snaps()
    test_bespoke_colour_flagged_as_gap()
    test_bespoke_spacing_flagged_as_gap()
    test_no_role_skipped()
    test_empty_value_skipped()
    test_batch()
    print("\nTOKEN-RESOLVER-5D.2: PASS (8 contracts: 3 snap + 2 gap + edge cases)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
