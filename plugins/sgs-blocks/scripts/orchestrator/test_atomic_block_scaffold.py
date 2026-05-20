"""Spec 15 Phase 5b.8 self-test for atomic-block-scaffold.py.

Plan contract:
  - scaffold a test block from a synthetic gap;
  - block.json valid;
  - the new attribute rows appear in sgs-framework.db.block_attributes
    (verified via ephemeral DB).

The promote() step is exercised against an ephemeral canonical root +
ephemeral DB to avoid any side-effect on the real codebase.
"""
from __future__ import annotations

import importlib.util
import json
import sqlite3
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).parent
SPEC = importlib.util.spec_from_file_location(
    "atomic_block_scaffold", HERE / "atomic-block-scaffold.py"
)
mod = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(mod)


SCHEMA = """
CREATE TABLE block_attributes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    block_slug TEXT NOT NULL,
    attr_name TEXT NOT NULL,
    attr_type TEXT,
    canonical_slot TEXT,
    UNIQUE(block_slug, attr_name)
);
"""


def test_scaffold_writes_six_files() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        manifest = mod.scaffold("toggle-widget", "text-content", "run-5b8-a", root=root)
        target = Path(manifest["staging_dir"])
        for name in ("block.json", "render.php", "edit.js", "save.js",
                     "index.js", "style.css", "manifest.json"):
            assert (target / name).exists(), f"missing scaffold file: {name}"
        # block.json parses + has the right name
        bj = json.loads((target / "block.json").read_text(encoding="utf-8"))
        assert bj["name"] == "sgs/toggle-widget"
        assert bj["apiVersion"] == 3
        assert "attributes" in bj
    print("  PASS  scaffold-writes-6-files (+ manifest.json)")


def test_role_drives_attributes() -> None:
    """role=color -> backgroundColor + textColor attrs."""
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        m = mod.scaffold("colour-band", "color", "run-5b8-b", root=root)
        attr_names = {r["attr_name"] for r in m["pending_db_rows"]}
        assert "backgroundColor" in attr_names, f"got {attr_names}"
        assert "textColor" in attr_names
    print("  PASS  role-drives-attributes: role=color -> bg+text attrs scaffolded")


def test_slug_validation() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        for bad in ("Bad-Slug", "with spaces", "../etc", "1numeric-start", "hero"):
            try:
                mod.scaffold(bad, "text-content", "run-5b8-c", root=Path(tmp))
            except mod.ScaffoldError:
                continue
            raise AssertionError(f"bad slug accepted: {bad!r}")
    print("  PASS  slug-validation: 5 invalid slugs rejected (incl. reserved 'hero')")


def test_promote_writes_to_canonical_and_db() -> None:
    """Plan contract: promoted scaffold appears in canonical tree + DB rows inserted."""
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        canonical = Path(tmp) / "canonical-blocks"
        db_path = Path(tmp) / "fw.db"
        conn = sqlite3.connect(str(db_path))
        conn.executescript(SCHEMA)
        conn.commit()
        conn.close()

        manifest = mod.scaffold("promotion-test", "color", "run-5b8-d", root=root)
        promoted = mod.promote(manifest, canonical_root=canonical, db_path=db_path)
        # Canonical files present
        assert (canonical / "promotion-test" / "block.json").exists()
        assert (canonical / "promotion-test" / "render.php").exists()
        # DB rows inserted
        conn = sqlite3.connect(str(db_path))
        try:
            count = conn.execute(
                "SELECT COUNT(*) FROM block_attributes WHERE block_slug='sgs/promotion-test'"
            ).fetchone()[0]
        finally:
            conn.close()
        assert count == 2, f"expected 2 attribute rows (color role), got {count}"
        assert promoted["promoted"] is True
        assert promoted["db_rows_inserted"] == 2
    print("  PASS  promote: canonical files written + 2 block_attributes rows inserted")


def test_no_canonical_mutation_without_promote() -> None:
    """FR21: scaffold() alone must NOT touch canonical or DB."""
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        canonical = Path(tmp) / "canonical-blocks"
        before_canonical = canonical.exists()
        mod.scaffold("staging-only", "text-content", "run-5b8-e", root=root)
        # canonical must NOT have been created
        assert canonical.exists() == before_canonical, (
            f"FR21 violated -- canonical mutated without --promote: {canonical}"
        )
    print("  PASS  fr21-no-canonical-mutation-without-promote")


def test_promote_refuses_existing_block() -> None:
    """promote() must refuse if canonical block already exists -- never overwrites."""
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        canonical = Path(tmp) / "canonical-blocks"
        (canonical / "existing-block").mkdir(parents=True)
        manifest = mod.scaffold("existing-block", "text-content", "run-5b8-f", root=root)
        try:
            mod.promote(manifest, canonical_root=canonical, db_path=None)
        except mod.ScaffoldError as e:
            assert "already exists" in str(e)
        else:
            raise AssertionError("promote must refuse to overwrite existing block")
    print("  PASS  promote-refuses-existing-block: never overwrites canonical")


def test_quality_score_five_of_five() -> None:
    """A clean scaffold must score 5/5."""
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        manifest = mod.scaffold("quality-check", "text-content", "run-5b8-g", root=root)
        assert manifest["quality_score"] == 5, (
            f"expected quality_score=5, got {manifest['quality_score']}; "
            f"details={manifest['quality_details']}"
        )
        assert manifest["quality_max"] == 5
        for fname, status in manifest["quality_details"].items():
            assert status == "ok", f"{fname}: expected 'ok', got {status!r}"
    print("  PASS  quality-score-five-of-five: clean scaffold scores 5/5")


def test_quality_score_missing_file() -> None:
    """Deleting a required file drops the score by 1."""
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        manifest = mod.scaffold("quality-miss", "color", "run-5b8-h", root=root)
        # Delete render.php from the staging dir
        staging = Path(manifest["staging_dir"])
        (staging / "render.php").unlink()
        # Re-score via the public helper
        quality = mod.score_scaffold(staging)
        assert quality["score"] == 4, f"expected 4 after deleting render.php, got {quality['score']}"
        assert quality["details"]["render.php"] == "missing"
    print("  PASS  quality-score-missing-file: deleted render.php -> score drops to 4/5")


def test_all_role_edit_js_have_inspector_controls() -> None:
    """Every role must produce an edit.js that contains InspectorControls import."""
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        for role in mod._ROLE_TO_ATTR_SCAFFOLD:
            manifest = mod.scaffold(f"role-{role.replace('-','-')}", role, "run-5b8-i", root=root)
            edit_js = (Path(manifest["staging_dir"]) / "edit.js").read_text(encoding="utf-8")
            assert "InspectorControls" in edit_js, (
                f"role={role}: edit.js missing InspectorControls import"
            )
    print("  PASS  all-role-edit-js-have-inspector-controls: 6 roles checked")


def main() -> int:
    print("Spec 15 Phase 5b.8 -- atomic-block-scaffold contract")
    test_scaffold_writes_six_files()
    test_role_drives_attributes()
    test_slug_validation()
    test_promote_writes_to_canonical_and_db()
    test_no_canonical_mutation_without_promote()
    test_promote_refuses_existing_block()
    test_quality_score_five_of_five()
    test_quality_score_missing_file()
    test_all_role_edit_js_have_inspector_controls()
    print("\nSCAFFOLD-5B.8: PASS (6 files + role-driven attrs + slug validation + promote + FR21 + no-overwrite + quality-score + inspector-controls)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
