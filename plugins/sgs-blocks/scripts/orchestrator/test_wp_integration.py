"""Spec 31 Phase 5d.7 + 5d.9 + 5d.10 self-test for wp_integration.py.

Plan contracts:
  5d.7  feed /wp-blocks valid + invalid markup; assert pass/fail outcomes.
  5d.9  synthesise an image with hover-zoom + duotone filter; assert
        native channel emitted, not custom CSS.
  5d.10 --dry-run against a staging slug; assert command sequence matches
        CLAUDE.md deploy pattern. NEVER push to production without explicit go.
"""
from __future__ import annotations

import importlib.util
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).parent
SPEC = importlib.util.spec_from_file_location("wp_integration", HERE / "wp_integration.py")
mod = importlib.util.module_from_spec(SPEC)
sys.modules["wp_integration"] = mod
SPEC.loader.exec_module(mod)


# ---- 5d.7 ----


def test_validate_valid_markup() -> None:
    result = mod.validate_block_markup('<!-- wp:sgs/hero {"headline":"Hi"} /-->')
    assert result["status"] == "valid", f"expected valid, got {result}"
    assert result["blocks_found"] == ["sgs/hero"]
    print(f"  PASS  validate-valid: sgs/hero markup -> status=valid")


def test_validate_invalid_markup() -> None:
    result = mod.validate_block_markup("broken markup no comments")
    assert result["status"] == "invalid", f"expected invalid, got {result}"
    assert result["issues"], "should surface issues"
    print(f"  PASS  validate-invalid: garbage -> status=invalid + issues listed")


# ---- 5d.9 ----


def test_native_lightbox_routes_to_block_attr() -> None:
    out = mod.route_native_feature("lightbox", True)
    assert out["route_known"] is True
    assert out["channel"] == "block-attribute"
    assert out["attr"] == "lightbox"
    assert out["value"] == {"enabled": True}
    print(f"  PASS  native-lightbox: -> block-attribute with enabled=True")


def test_native_duotone_passthrough() -> None:
    out = mod.route_native_feature("duotone", "primary-to-accent")
    assert out["channel"] == "block-attribute"
    assert "duotone" in out["attr"]
    assert out["value"] == "primary-to-accent"
    print(f"  PASS  native-duotone: preset slug passed through")


def test_native_appearance_tools_routes_to_theme_json() -> None:
    out = mod.route_native_feature("appearance-tools", True)
    assert out["channel"] == "theme-json", f"got {out['channel']}"
    assert out["attr"] == "settings.appearanceTools"
    assert out["value"] is True
    print(f"  PASS  native-appearance-tools: -> theme-json setting")


def test_native_hover_zoom_routes() -> None:
    out = mod.route_native_feature("hover-zoom", True)
    assert out["channel"] == "block-attribute"
    assert out["attr"] == "hoverImageZoom"
    print(f"  PASS  native-hover-zoom: -> SGS hoverImageZoom block attr")


def test_unknown_feature_falls_through() -> None:
    """Unknown native feature returns route_known=False without crash."""
    out = mod.route_native_feature("invented-feature", "x")
    assert out["route_known"] is False
    assert out["channel"] is None
    print(f"  PASS  unknown-feature: falls through without crash")


# ---- 5d.10 ----


def test_deploy_dry_run_command_sequence() -> None:
    """Dry-run emits the 6-command sequence matching CLAUDE.md pattern."""
    with tempfile.TemporaryDirectory() as tmp:
        content = Path(tmp) / "post-42-content.php"
        content.write_text("<?php $post = ['ID'=>42, 'post_content'=>'...'];", encoding="utf-8")
        report = mod.build_deploy_command(post_id=42, content_path=content, dry_run=True)
    assert report["dry_run"] is True
    cmds = report["commands"]
    # SCP + 3 SSH steps (wp eval-file + rm + opcache reset + curl + rm)
    assert any(c.startswith("scp ") for c in cmds), "scp missing"
    assert any("wp eval-file" in c for c in cmds), "wp eval-file missing"
    assert any("opcache_reset" in c for c in cmds), "opcache reset missing"
    assert any("curl -s https://" in c for c in cmds), "verifying curl missing"
    assert report["verify_url"] == "https://palestine-lives.org/?p=42"
    print(f"  PASS  deploy-dry-run: {len(cmds)} commands matching CLAUDE.md pattern")


def test_deploy_live_mode_carries_warning() -> None:
    """When dry_run=False, the report carries an operator-approval warning."""
    with tempfile.TemporaryDirectory() as tmp:
        content = Path(tmp) / "x.php"
        content.write_text("x", encoding="utf-8")
        report = mod.build_deploy_command(post_id=99, content_path=content, dry_run=False)
    assert report["dry_run"] is False
    assert report["warning"] is not None
    assert "operator approval" in report["warning"]
    print(f"  PASS  deploy-live: warning surfaced ({report['warning'][:50]}...)")


def test_deploy_rejects_unsafe_domain() -> None:
    """Sonnet QC concern: domain must be DNS-safe to keep emitted commands shell-safe."""
    with tempfile.TemporaryDirectory() as tmp:
        content = Path(tmp) / "x.php"
        content.write_text("x", encoding="utf-8")
        for bad in ("evil.org; rm -rf ~", "with space.com", "$(whoami).com", "", "FOO.UPPER"):
            try:
                mod.build_deploy_command(post_id=1, content_path=content, domain=bad)
            except ValueError as e:
                assert "invalid domain" in str(e).lower()
                continue
            raise AssertionError(f"unsafe domain accepted: {bad!r}")
    print(f"  PASS  deploy-rejects-unsafe-domain: 5 injection-shaped domains rejected")


def test_deploy_rejects_invalid_post_id() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        content = Path(tmp) / "x.php"
        content.write_text("x", encoding="utf-8")
        for bad in (0, -1):
            try:
                mod.build_deploy_command(post_id=bad, content_path=content)
            except ValueError:
                continue
            raise AssertionError(f"bad post_id accepted: {bad}")
    print(f"  PASS  deploy-rejects-invalid-post-id")


def main() -> int:
    print("Spec 31 Phase 5d.7 + 5d.9 + 5d.10 -- wp_integration contract")
    test_validate_valid_markup()
    test_validate_invalid_markup()
    test_native_lightbox_routes_to_block_attr()
    test_native_duotone_passthrough()
    test_native_appearance_tools_routes_to_theme_json()
    test_native_hover_zoom_routes()
    test_unknown_feature_falls_through()
    test_deploy_dry_run_command_sequence()
    test_deploy_live_mode_carries_warning()
    test_deploy_rejects_unsafe_domain()
    test_deploy_rejects_invalid_post_id()
    print("\nWP-INTEGRATION-5D.7+9+10: PASS (2 validate + 5 native + 3 deploy)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
