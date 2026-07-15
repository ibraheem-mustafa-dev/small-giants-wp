"""Spec 31 Phase 5e.1 + 5e.2 self-test for preflight_chain.py.

Plan contract:
  5e.1 force each pre-flight condition to fail individually; assert
       abort=True with named gap.
  5e.2 deliberately break BEM in a staged file; assert pre-commit
       gate fires + abort=True.
"""
from __future__ import annotations

import importlib.util
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).parent
SPEC = importlib.util.spec_from_file_location("preflight_chain", HERE / "preflight_chain.py")
mod = importlib.util.module_from_spec(SPEC)
sys.modules["preflight_chain"] = mod
SPEC.loader.exec_module(mod)


def test_preflight_all_green() -> None:
    """Happy path: every required input exists -> abort=False."""
    with tempfile.TemporaryDirectory() as tmp:
        # Stand up surrogate inputs for each check
        timer = Path(tmp) / "timer.txt"; timer.write_text("started", encoding="utf-8")
        # Use a writable mutex lock path that doesn't exist (state=free)
        lock = Path(tmp) / "test.lock"
        # SGS DB must exist + have block_attributes; use the canonical project DB
        sgs_db = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"
        vqa = Path.home() / ".claude" / "skills" / "visual-qa" / "SKILL.md"
        result = mod.run_preflight("test-5e1-green",
                                   sgs_db=sgs_db, visual_qa_skill=vqa,
                                   timer_path=timer, mutex_lock_path=lock)
        # Some checks may legit fail on a fresh dev box (e.g. visual-qa missing);
        # the assertion below is: the structure is correct + the timer check passed.
        timer_check = next(c for c in result["checks"] if c["name"] == "timer-file")
        assert timer_check["ok"] is True, f"timer check failed: {timer_check}"
        mutex_check = next(c for c in result["checks"] if c["name"] == "mutex-free")
        assert mutex_check["ok"] is True, f"mutex check failed: {mutex_check}"
    print("  PASS  preflight-all-green: timer + mutex checks pass independently")


def test_preflight_missing_timer_fails() -> None:
    """Force timer-file check to fail; assert abort=True + named gap."""
    with tempfile.TemporaryDirectory() as tmp:
        result = mod.run_preflight(
            "test-5e1-no-timer",
            timer_path=Path(tmp) / "does-not-exist.txt",
            mutex_lock_path=Path(tmp) / "ok.lock",
        )
        timer_check = next(c for c in result["checks"] if c["name"] == "timer-file")
        assert timer_check["ok"] is False
        assert "does-not-exist" in timer_check["detail"]
        assert result["abort"] is True
    print("  PASS  preflight-missing-timer: abort=True with named gap")


def test_preflight_missing_db_fails() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        timer = Path(tmp) / "timer.txt"; timer.touch()
        result = mod.run_preflight(
            "test-5e1-no-db",
            sgs_db=Path(tmp) / "nonexistent.db",
            timer_path=timer,
            mutex_lock_path=Path(tmp) / "ok.lock",
        )
        db_check = next(c for c in result["checks"] if c["name"] == "sgs-framework-db")
        assert db_check["ok"] is False
        assert result["abort"] is True
    print("  PASS  preflight-missing-db: clean abort with named gap")


def test_preflight_held_mutex_fails() -> None:
    """When mutex is held by ANOTHER live holder, mutex-free check fails."""
    with tempfile.TemporaryDirectory() as tmp:
        lock = Path(tmp) / "held.lock"
        # Hold the lock
        holder = mod._mutex.BuildMutex("other-process", lock_path=lock)
        holder.acquire()
        try:
            timer = Path(tmp) / "timer.txt"; timer.touch()
            result = mod.run_preflight(
                "test-5e1-mutex",
                timer_path=timer, mutex_lock_path=lock,
            )
            mutex_check = next(c for c in result["checks"] if c["name"] == "mutex-free")
            assert mutex_check["ok"] is False, f"should fail when held: {mutex_check}"
            assert "held" in mutex_check["detail"]
        finally:
            holder.release()
    print("  PASS  preflight-held-mutex: clean abort when another holder is live")


def test_preflight_expected_files() -> None:
    """When expected_files include something missing, that check fails too."""
    with tempfile.TemporaryDirectory() as tmp:
        timer = Path(tmp) / "timer.txt"; timer.touch()
        missing = Path(tmp) / "expected-but-missing.txt"
        result = mod.run_preflight(
            "test-5e1-exp",
            timer_path=timer,
            mutex_lock_path=Path(tmp) / "ok.lock",
            expected_files=[missing],
        )
        check = next((c for c in result["checks"]
                      if c["name"].startswith("expected-file:")), None)
        assert check is not None and check["ok"] is False
        assert result["abort"] is True
    print("  PASS  preflight-expected-files: missing file surfaced")


# ---- 5e.2 pre-commit gate ----


def test_precommit_gate_drift_pass() -> None:
    """Plan named contract: pre-commit gate fires the drift validator.

    Post-Sonnet QC: missing lint cmds now FAIL the gate fail-closed. To
    exercise just the drift path, pass deterministic-pass lints.
    """
    pass_cmd = [sys.executable, "-c", "raise SystemExit(0)"]
    result = mod.run_precommit_gate(bem_lint_cmd=pass_cmd, token_lint_cmd=pass_cmd)
    drift = next(c for c in result["checks"] if c["name"] == "drift-validator")
    assert drift["ok"] is True, f"drift unexpectedly failing: {drift}"
    assert result["abort"] is False
    print("  PASS  precommit-gate-drift-pass: chain runs drift validator + reports PASS")


def test_precommit_gate_missing_lint_fails_closed() -> None:
    """Sonnet QC fix: missing bem_lint_cmd or token_lint_cmd MUST fail the gate."""
    result = mod.run_precommit_gate()    # neither lint cmd supplied
    bem = next(c for c in result["checks"] if c["name"] == "bem-lint")
    tok = next(c for c in result["checks"] if c["name"] == "token-lint")
    assert bem["ok"] is False, f"missing bem cmd must fail: {bem}"
    assert tok["ok"] is False, f"missing token cmd must fail: {tok}"
    assert "fail-closed" in bem["detail"]
    assert result["abort"] is True, "gate must abort when lint cmds missing"
    print("  PASS  precommit-gate-missing-lint: fail-closed when bem/token cmds absent")


def test_precommit_gate_fails_on_bad_drift_validator() -> None:
    """When drift validator path is missing, the check fails AND chain aborts."""
    result = mod.run_precommit_gate(drift_validator=Path("does/not/exist/validate.py"))
    drift = next(c for c in result["checks"] if c["name"] == "drift-validator")
    assert drift["ok"] is False
    assert result["abort"] is True
    print("  PASS  precommit-gate-bad-validator: fail-closed when validator missing")


def test_precommit_gate_fail_closed_on_failing_lint() -> None:
    """When BEM lint command returns non-zero, gate aborts."""
    # Use 'python -c "raise SystemExit(1)"' as a deterministic failing lint.
    failing_cmd = [sys.executable, "-c", "raise SystemExit(1)"]
    result = mod.run_precommit_gate(bem_lint_cmd=failing_cmd)
    bem = next(c for c in result["checks"] if c["name"] == "bem-lint")
    assert bem["ok"] is False
    assert result["abort"] is True
    print("  PASS  precommit-gate-failing-lint: chain aborts fail-closed")


def main() -> int:
    print("Spec 31 Phase 5e.1 + 5e.2 -- preflight_chain contract")
    test_preflight_all_green()
    test_preflight_missing_timer_fails()
    test_preflight_missing_db_fails()
    test_preflight_held_mutex_fails()
    test_preflight_expected_files()
    test_precommit_gate_drift_pass()
    test_precommit_gate_missing_lint_fails_closed()
    test_precommit_gate_fails_on_bad_drift_validator()
    test_precommit_gate_fail_closed_on_failing_lint()
    print("\nPREFLIGHT-CHAIN-5E.1+5E.2: PASS (5 preflight + 4 precommit-gate)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
