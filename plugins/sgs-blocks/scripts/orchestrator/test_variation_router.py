"""Spec 31 Phase 5d.3 self-test for variation_router.py.

Plan contract: simulate a --primary change for indus-foods; assert write
lands in theme/sgs-theme/styles/indus-foods.json and root theme.json
untouched.
"""
from __future__ import annotations

import importlib.util
import json
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).parent
SPEC = importlib.util.spec_from_file_location("variation_router", HERE / "variation_router.py")
mod = importlib.util.module_from_spec(SPEC)
sys.modules["variation_router"] = mod
SPEC.loader.exec_module(mod)


def _scaffold_theme_root(tmp: Path) -> Path:
    """Build a minimal theme/sgs-theme/ tree with a baseline root theme.json."""
    root = tmp / "theme" / "sgs-theme"
    root.mkdir(parents=True)
    (root / "theme.json").write_text(json.dumps({
        "version": 3,
        "settings": {"color": {"palette": [{"slug": "primary", "color": "#0F7E80"}]}},
    }, indent=2), encoding="utf-8")
    (root / "styles").mkdir()
    return root


def test_insert_into_existing_variation() -> None:
    """Plan contract: --primary change for indus-foods lands in variation file."""
    with tempfile.TemporaryDirectory() as tmp:
        root = _scaffold_theme_root(Path(tmp))
        (root / "styles" / "indus-foods.json").write_text(json.dumps({
            "version": 3, "settings": {"color": {"palette": []}}
        }), encoding="utf-8")
        root_theme_before = (root / "theme.json").read_text()

        report = mod.add_token("indus-foods", "color", "primary", "#0A7EA8",
                               name="Indus Primary", theme_root=root, write=True)
        assert report["action"] == "inserted"
        assert report["root_theme_untouched"] is True
        # Variation file got the new token
        var = json.loads((root / "styles" / "indus-foods.json").read_text())
        palette = var["settings"]["color"]["palette"]
        assert any(e["slug"] == "primary" and e["color"] == "#0A7EA8" for e in palette), (
            f"token not written: {palette}"
        )
        # Root theme.json UNTOUCHED
        root_after = (root / "theme.json").read_text()
        assert root_after == root_theme_before, "root theme.json mutated! FR21 violated"
    print("  PASS  insert-indus-primary (plan contract: variation only, root untouched)")


def test_upsert_idempotent() -> None:
    """Re-adding the same token returns action='noop' on the 2nd call."""
    with tempfile.TemporaryDirectory() as tmp:
        root = _scaffold_theme_root(Path(tmp))
        r1 = mod.add_token("indus-foods", "color", "accent", "#F87A1F",
                           name="Indus Accent", theme_root=root, write=True)
        r2 = mod.add_token("indus-foods", "color", "accent", "#F87A1F",
                           name="Indus Accent", theme_root=root, write=True)
        assert r1["action"] == "inserted", f"first call: {r1}"
        assert r2["action"] == "noop", f"second call should be noop: {r2}"
    print("  PASS  upsert-idempotent: 2nd identical add is no-op")


def test_update_changes_existing_value() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = _scaffold_theme_root(Path(tmp))
        mod.add_token("indus-foods", "color", "accent", "#F87A1F",
                      theme_root=root, write=True)
        r = mod.add_token("indus-foods", "color", "accent", "#FF0000",
                          theme_root=root, write=True)
        assert r["action"] == "updated", f"expected update, got {r}"
        var = json.loads((root / "styles" / "indus-foods.json").read_text())
        accent = next(e for e in var["settings"]["color"]["palette"] if e["slug"] == "accent")
        assert accent["color"] == "#FF0000"
    print("  PASS  update-existing-token: value mutates, slug preserved")


def test_dry_run_does_not_write() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = _scaffold_theme_root(Path(tmp))
        # Pre-create the variation file empty so we can verify it stays empty
        (root / "styles" / "indus-foods.json").write_text(json.dumps({
            "version": 3, "settings": {}
        }), encoding="utf-8")
        before = (root / "styles" / "indus-foods.json").read_text()
        r = mod.add_token("indus-foods", "color", "new-token", "#123456",
                          theme_root=root, write=False)
        after = (root / "styles" / "indus-foods.json").read_text()
        assert r["mode"] == "dry-run"
        assert before == after, "dry-run should not write to disk"
    print("  PASS  dry-run-no-disk-write")


def test_creates_variation_file_if_missing() -> None:
    """First-ever add for a client creates the variation file."""
    with tempfile.TemporaryDirectory() as tmp:
        root = _scaffold_theme_root(Path(tmp))
        target = root / "styles" / "new-client.json"
        assert not target.exists()
        r = mod.add_token("new-client", "spacing", "10", "4px",
                          theme_root=root, write=True)
        assert r["action"] == "inserted"
        assert target.exists()
        var = json.loads(target.read_text())
        assert var["settings"]["spacing"]["spacingSizes"][0]["slug"] == "10"
    print("  PASS  creates-variation-file-if-missing")


def test_rejects_bad_client_slug() -> None:
    for bad in ("", "../etc", "with/slash", "with..parent"):
        try:
            mod.variation_path(bad)
        except mod.VariationRouterError:
            continue
        raise AssertionError(f"bad client slug accepted: {bad!r}")
    print("  PASS  rejects-bad-client-slug: 4 traversal/empty patterns blocked")


def test_rejects_unknown_role() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = _scaffold_theme_root(Path(tmp))
        try:
            mod.add_token("indus-foods", "fictional-role", "x", "y", theme_root=root)
        except mod.VariationRouterError as e:
            assert "unknown role" in str(e).lower()
        else:
            raise AssertionError("unknown role accepted")
    print("  PASS  rejects-unknown-role")


def main() -> int:
    print("Spec 31 Phase 5d.3 -- variation_router contract")
    test_insert_into_existing_variation()
    test_upsert_idempotent()
    test_update_changes_existing_value()
    test_dry_run_does_not_write()
    test_creates_variation_file_if_missing()
    test_rejects_bad_client_slug()
    test_rejects_unknown_role()
    print("\nVARIATION-ROUTER-5D.3: PASS (plan contract + 6 supporting cases)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
