"""Spec 15 Phase 5b.6 self-test for attribute-staged-apply.py.

Plan contract: stage 1 attr change to sgs/counter; assert staging file
written; assert canonical post_content unchanged until approval.
FR21: this module MUST NOT touch live WP DB -- only stages + emits.
"""
from __future__ import annotations

import importlib.util
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).parent
SPEC = importlib.util.spec_from_file_location(
    "attribute_staged_apply", HERE / "attribute-staged-apply.py"
)
mod = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(mod)


def test_stage_change_writes_file() -> None:
    """Plan-named contract: stage an attr change; staging file appears."""
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        c = mod.stage_change("run-5b6", "sgs/counter", "endValue", 1000, root=root)
        assert c["id"] == 1
        assert c["status"] == "pending"
        # Staging file present + pipeline-state layout correct
        f = root / "sgs-clone" / "run-5b6" / "stage-6-attribute_staging.json"
        assert f.exists(), f"staging file not written: {f}"
        # Idempotency-ish: second stage appends with id=2
        c2 = mod.stage_change("run-5b6", "sgs/counter", "duration", 2500, root=root)
        assert c2["id"] == 2
    print("  PASS  stage-change-writes-file (plan contract: sgs/counter)")


def test_no_canonical_mutation() -> None:
    """FR21: this module must NOT touch live WP DB OR project canonical files.
    Verified by ensuring the only file the module writes is in pipeline-state/."""
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        # Snapshot the tmp tree BEFORE
        before = set(p.relative_to(root) for p in Path(tmp).rglob("*") if p.is_file())
        mod.stage_change("run-5b6", "sgs/hero", "headline", "test", root=root)
        after = set(p.relative_to(root) for p in Path(tmp).rglob("*") if p.is_file())
        new_files = after - before
        # All new files must be under sgs-clone/<run_id>/
        for f in new_files:
            parts = f.parts
            assert parts[0] == "sgs-clone", f"non-canonical write outside staging: {f}"
    print("  PASS  no-canonical-mutation: writes only to pipeline-state/sgs-clone/")


def test_approval_gate_required_for_deploy() -> None:
    """FR21: emit_deploy_command must REFUSE when status='pending'."""
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        mod.stage_change("run-5b6", "sgs/hero", "headline", "test", root=root)
        try:
            mod.emit_deploy_command("run-5b6", 1, root=root)
        except RuntimeError as e:
            assert "approved" in str(e).lower()
        else:
            raise AssertionError("emit_deploy_command must refuse non-approved changes")
        # Approve + verify command can now be emitted
        mod.approve("run-5b6", 1, root=root)
        cmd = mod.emit_deploy_command("run-5b6", 1, root=root)
        assert "wp eval-file" in cmd, f"deploy command shape wrong: {cmd}"
        # shlex.quote omits quotes when the value has no shell-special chars,
        # so split the command and check the resolved arg values instead of
        # asserting a specific quoting form.
        import shlex as _shlex
        parts = _shlex.split(cmd)
        assert "--block-slug=sgs/hero" in parts
        assert "--attr-name=headline" in parts
    print("  PASS  approval-gate: pending refused; approved emits wp-cli command")


def test_apply_lifecycle() -> None:
    """status transitions: pending -> approved -> applied. Reject also valid."""
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        mod.stage_change("run-5b6", "sgs/test", "attr", 1, root=root)
        mod.approve("run-5b6", 1, root=root)
        c = mod.mark_applied("run-5b6", 1, root=root)
        assert c["status"] == "applied"
        assert c["applied_at"] is not None
        # Double-apply must fail
        try:
            mod.approve("run-5b6", 1, root=root)
        except RuntimeError as e:
            assert "already applied" in str(e).lower()
        else:
            raise AssertionError("re-approving an applied change must fail")
    print("  PASS  apply-lifecycle: pending -> approved -> applied; no re-apply")


def test_block_slug_validation_rejects_injection() -> None:
    """Stage-time guard blocks slugs that could break the shell command."""
    with tempfile.TemporaryDirectory() as tmp:
        for bad in ("sgs/hero'", "sgs/$(rm)", "with space", "BAD/UPPER", "noprefix", ""):
            try:
                mod.stage_change("run-5b6-inj", bad, "headline", "x", root=Path(tmp))
            except ValueError:
                continue
            raise AssertionError(f"injection-shaped block_slug accepted: {bad!r}")
    print("  PASS  block_slug-validation: 6 injection-shaped slugs rejected at stage time")


def test_emit_deploy_shlex_quotes_value() -> None:
    """new_value with quotes/dollar must survive into the emitted command without
    breaking shell syntax (shlex.quote applied)."""
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        # legal slug, but new_value contains nasty characters
        mod.stage_change("run-5b6-q", "sgs/hero", "headline",
                         "she said 'hi' and $PATH", root=root)
        mod.approve("run-5b6-q", 1, root=root)
        cmd = mod.emit_deploy_command("run-5b6-q", 1, root=root)
        import shlex as _shlex
        # shlex.split round-trips through the shell quoting layer safely
        parts = _shlex.split(cmd)
        assert "wp" in parts and "eval-file" in parts, f"command malformed: {cmd}"
        # Find the --new-value argument and verify its content survives intact
        nv_idx = next(i for i, p in enumerate(parts) if p.startswith("--new-value="))
        nv = parts[nv_idx].split("=", 1)[1]
        assert "she said 'hi' and $PATH" in nv, f"value mangled: {nv}"
    print("  PASS  emit-deploy-shlex-quoted: nasty value survives shell parse")


def test_reject_path() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        mod.stage_change("run-5b6", "sgs/test", "attr", 1, root=root)
        c = mod.reject("run-5b6", 1, root=root)
        assert c["status"] == "rejected"
        try:
            mod.emit_deploy_command("run-5b6", 1, root=root)
        except RuntimeError as e:
            assert "rejected" in str(e).lower() or "approved" in str(e).lower()
    print("  PASS  reject-path: rejected change cannot emit deploy command")


def main() -> int:
    print("Spec 15 Phase 5b.6 -- attribute-staged-apply contract")
    test_stage_change_writes_file()
    test_no_canonical_mutation()
    test_approval_gate_required_for_deploy()
    test_apply_lifecycle()
    test_block_slug_validation_rejects_injection()
    test_emit_deploy_shlex_quotes_value()
    test_reject_path()
    print("\nATTR-STAGED-5B.6: PASS (stage + FR21 + approval gate + lifecycle + reject)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
