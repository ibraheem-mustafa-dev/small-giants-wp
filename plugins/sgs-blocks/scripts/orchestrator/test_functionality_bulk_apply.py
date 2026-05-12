"""Spec 15 Phase 5b.7 self-test for functionality-bulk-apply.py.

Plan contract: apply a fake new attribute to 3 sgs/info-box instances;
all 3 updated atomically; force rollback (deliberate error mid-apply);
verify zero side effects.
"""
from __future__ import annotations

import importlib.util
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).parent
SPEC = importlib.util.spec_from_file_location(
    "functionality_bulk_apply", HERE / "functionality-bulk-apply.py"
)
mod = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(mod)


def test_happy_path_all_three_atomic() -> None:
    """Apply hoverScale=true to 3 sgs/info-box instances."""
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        mod.stage_bulk_job(
            "run-5b7-a", "sgs/info-box", "hoverScale", True, [101, 102, 103],
            root=root,
        )
        mod.approve("run-5b7-a", root=root)
        result = mod.simulate_apply("run-5b7-a", root=root)  # default = all success
        assert result["outcome"] == "success"
        assert result["applied_instances"] == [101, 102, 103]
    print("  PASS  happy-path: 3 sgs/info-box instances applied atomically")


def test_rollback_on_mid_apply_error() -> None:
    """Force a failure on instance #2 of 3; assert ZERO applied + rolled-back list intact."""
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        mod.stage_bulk_job(
            "run-5b7-b", "sgs/info-box", "hoverScale", True, [201, 202, 203],
            root=root,
        )
        mod.approve("run-5b7-b", root=root)

        def applier(iid):
            if iid == 202:
                raise RuntimeError("simulated failure on 202")
            return True

        result = mod.simulate_apply("run-5b7-b", instance_applier=applier, root=root)
        assert result["outcome"] == "rolled-back", f"expected rolled-back, got {result}"
        assert result["applied_instances"] == [], (
            f"FR21: zero side effects on rollback, got {result['applied_instances']}"
        )
        assert result["rolled_back_instances"] == [201], (
            f"rollback should record in-flight applies, got {result}"
        )
        assert result["error"]["instance_id"] == 202
    print("  PASS  rollback: error on 202 -> zero applied + 201 logged as rolled-back")


def test_approval_gate_required() -> None:
    """simulate_apply must REFUSE when status='pending' (not yet approved)."""
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        mod.stage_bulk_job("run-5b7-c", "sgs/test", "x", 1, [1, 2], root=root)
        try:
            mod.simulate_apply("run-5b7-c", root=root)
        except RuntimeError as e:
            assert "approved" in str(e).lower()
        else:
            raise AssertionError("simulate_apply must refuse pending job")
    print("  PASS  approval-gate: pending refused on simulate_apply")


def test_emit_deploy_atomic_flag() -> None:
    """Emitted deploy command MUST carry --atomic=1 so live WP matches simulation."""
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        mod.stage_bulk_job("run-5b7-d", "sgs/card-grid", "hoverShadow", True,
                           [301, 302], root=root)
        mod.approve("run-5b7-d", root=root)
        cmd = mod.emit_deploy_command("run-5b7-d", root=root)
        assert "--atomic=1" in cmd, f"deploy command missing --atomic=1: {cmd}"
        assert "wp eval-file" in cmd
        # shlex.quote may strip quotes when not needed -- check the
        # parsed shell args instead of a literal substring.
        import shlex as _shlex
        parts = _shlex.split(cmd)
        assert "--instance-ids=301,302" in parts, f"instance-ids parse: {parts}"
    print("  PASS  emit-deploy: --atomic=1 flag present + instance IDs serialised")


def test_block_slug_validation_rejects_injection() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        for bad in ("sgs/hero'", "sgs/$(rm)", "BAD/UPPER", "noprefix", ""):
            try:
                mod.stage_bulk_job("run-5b7-inj", bad, "x", 1, [1], root=root)
            except ValueError:
                continue
            raise AssertionError(f"injection-shaped block_slug accepted: {bad!r}")
    print("  PASS  block_slug-validation: 5 injection-shaped slugs rejected at stage time")


def test_emit_deploy_shlex_quotes_value() -> None:
    """new_value with shell-special chars must survive emit through shlex.quote."""
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        mod.stage_bulk_job("run-5b7-q", "sgs/hero", "label",
                           "$(whoami) 'pwned'", [1, 2], root=root)
        mod.approve("run-5b7-q", root=root)
        cmd = mod.emit_deploy_command("run-5b7-q", root=root)
        import shlex as _shlex
        parts = _shlex.split(cmd)
        assert "wp" in parts and "eval-file" in parts
        v_idx = next(i for i, p in enumerate(parts) if p.startswith("--value="))
        v = parts[v_idx].split("=", 1)[1]
        assert "$(whoami) 'pwned'" in v, f"value mangled: {v}"
        # --atomic=1 flag must still be present
        assert "--atomic=1" in parts
    print("  PASS  emit-deploy-shlex-quoted: nasty value survives shell parse")


def test_pending_job_blocks_emit_deploy() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        mod.stage_bulk_job("run-5b7-e", "sgs/test", "x", 1, [1], root=root)
        try:
            mod.emit_deploy_command("run-5b7-e", root=root)
        except RuntimeError as e:
            assert "approved" in str(e).lower()
        else:
            raise AssertionError("pending job must not emit deploy")
    print("  PASS  emit-deploy: pending refused")


def main() -> int:
    print("Spec 15 Phase 5b.7 -- functionality-bulk-apply contract")
    test_happy_path_all_three_atomic()
    test_rollback_on_mid_apply_error()
    test_approval_gate_required()
    test_emit_deploy_atomic_flag()
    test_block_slug_validation_rejects_injection()
    test_emit_deploy_shlex_quotes_value()
    test_pending_job_blocks_emit_deploy()
    print("\nBULK-APPLY-5B.7: PASS (atomic + rollback + approval gate + --atomic + deploy gate)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
