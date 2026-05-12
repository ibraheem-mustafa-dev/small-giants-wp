"""Spec 15 Phase 5b.1 self-test for staged_output.py.

Asserts:
  - Run dir layout: pipeline-state/sgs-clone/<run_id>/
  - Stage filename convention: stage-<N>-<name>.json
  - Round-trip write/read with payload preserved
  - Orphan detection (files not matching convention)
  - Stage number + run_id validation reject bad inputs
"""
from __future__ import annotations

import importlib.util
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).parent
SPEC = importlib.util.spec_from_file_location(
    "staged_output", HERE / "staged_output.py"
)
mod = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(mod)


def test_run_dir_layout() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        d = mod.init_run("test-5b1", root=Path(tmp))
        rel = d.relative_to(tmp)
        assert str(rel).replace("\\", "/") == "sgs-clone/test-5b1", (
            f"run dir wrong: {rel}"
        )
        assert d.is_dir()
    print("  PASS  run-dir-layout: pipeline-state/sgs-clone/<run_id>/")


def test_stage_filename_convention() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        p = mod.stage_path("test-5b1", 4, root=Path(tmp))
        assert p.name == "stage-4-extract.json", f"got {p.name}"
        p2 = mod.stage_path("test-5b1", 4, name="coverage", root=Path(tmp))
        assert p2.name == "stage-4-coverage.json", f"got {p2.name}"
    print("  PASS  stage-filename-convention: stage-<N>-<name>.json")


def test_write_read_roundtrip() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        payload = {"boundaries": [{"section_id": "s1"}], "meta": "test"}
        mod.write_artefact("test-5b1", 1, payload, root=Path(tmp))
        recovered = mod.read_artefact("test-5b1", 1, root=Path(tmp))
        assert recovered == payload, f"round-trip mismatch: {recovered}"
    print("  PASS  write-read-roundtrip: payload preserved byte-identical")


def test_orphan_detection() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        mod.init_run("test-5b1", root=Path(tmp))
        # Write a valid stage file
        mod.write_artefact("test-5b1", 1, {"x": 1}, root=Path(tmp))
        # Write an ORPHAN file directly (not via write_artefact)
        run = mod.run_dir("test-5b1", root=Path(tmp))
        (run / "stray.txt").write_text("not a stage artefact", encoding="utf-8")
        (run / "stage-99-bad.json").write_text("{}", encoding="utf-8")  # bad stage number
        orphans = mod.find_orphans("test-5b1", root=Path(tmp))
        orphan_names = sorted(r["name"] for r in orphans)
        assert "stray.txt" in orphan_names, f"stray.txt missing from orphans: {orphan_names}"
        assert any("stage-99-bad" in n for n in orphan_names), (
            f"stage-99-bad should be flagged orphan: {orphan_names}"
        )
    print(f"  PASS  orphan-detection: {len(orphans)} orphan(s) surfaced")


def test_validators_reject_bad_inputs() -> None:
    # Bad run_id (path traversal / spaces / empty)
    for bad in ("", "../etc/passwd", "with space", "tab\tname", "x" * 100):
        try:
            mod.validate_run_id(bad)
        except mod.StagedOutputError:
            continue
        raise AssertionError(f"bad run_id accepted: {bad!r}")

    # Bad stage number
    for bad_n in (0, 10, -1, "1", None):
        try:
            mod.validate_stage(bad_n)
        except mod.StagedOutputError:
            continue
        raise AssertionError(f"bad stage accepted: {bad_n!r}")
    print("  PASS  validators-reject-bad-inputs: 5 bad run_ids + 5 bad stages rejected")


def test_list_artefacts_sorted() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        mod.write_artefact("test-5b1", 4, {"a": 1}, root=Path(tmp))
        mod.write_artefact("test-5b1", 1, {"a": 1}, root=Path(tmp))
        mod.write_artefact("test-5b1", 9, {"a": 1}, root=Path(tmp))
        rows = mod.list_stage_artifacts("test-5b1", root=Path(tmp))
        stages = [r["stage"] for r in rows if not r["orphan"]]
        assert stages == [1, 4, 9], f"sort wrong: {stages}"
    print("  PASS  list-artefacts-sorted: stages returned in stage-number order")


def main() -> int:
    print("Spec 15 Phase 5b.1 -- staged-output dir + filename convention")
    test_run_dir_layout()
    test_stage_filename_convention()
    test_write_read_roundtrip()
    test_orphan_detection()
    test_validators_reject_bad_inputs()
    test_list_artefacts_sorted()
    print("\nSTAGED-OUTPUT-5B.1: PASS (layout + naming + roundtrip + orphans + validators)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
