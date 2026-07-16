"""Spec 31 Phase 5b.4 self-test for mutex.py.

Plan contract: start two concurrent /sgs-clone runs; second must block
+ report mutex holder. Also covers stale-lock takeover, status report,
and context-manager release-on-exception.
"""
from __future__ import annotations

import importlib.util
import sys
import tempfile
import time
from pathlib import Path

HERE = Path(__file__).parent
SPEC = importlib.util.spec_from_file_location("mutex", HERE / "mutex.py")
mod = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(mod)


def test_concurrent_second_acquirer_blocks() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        lock_path = Path(tmp) / "test.lock"
        a = mod.BuildMutex("sgs-clone-A", command="clone-A", lock_path=lock_path)
        b = mod.BuildMutex("sgs-clone-B", command="clone-B", lock_path=lock_path)
        a.acquire()
        try:
            try:
                b.acquire()
            except mod.MutexBusy as e:
                assert e.current_holder["holder"] == "sgs-clone-A", (
                    f"holder mis-reported: {e.current_holder}"
                )
                assert e.current_holder["command"] == "clone-A"
            else:
                raise AssertionError("second acquirer must raise MutexBusy")
        finally:
            a.release()
        # After release, B can acquire
        b.acquire()
        b.release()
    print("  PASS  concurrent-second-acquirer-blocks (plan contract)")


def test_status_states() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        lock_path = Path(tmp) / "s.lock"
        lock = mod.BuildMutex("status-test", lock_path=lock_path)
        assert lock.status() == {"state": "free"}, "fresh state must be free"
        lock.acquire()
        try:
            st = lock.status()
            assert st["state"] == "held", f"after acquire state must be held, got {st}"
            assert st["holder"]["holder"] == "status-test"
        finally:
            lock.release()
        assert lock.status() == {"state": "free"}, "post-release must be free"
    print("  PASS  status-states: free -> held -> free transitions")


def test_stale_lock_takeover() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        lock_path = Path(tmp) / "stale.lock"
        old = mod.BuildMutex("old-holder", lock_path=lock_path, stale_after_seconds=1)
        old.acquire()
        # Don't release; sleep past staleness window
        time.sleep(1.2)
        # Take over from a new holder
        new = mod.BuildMutex("new-holder", lock_path=lock_path, stale_after_seconds=1)
        new.acquire()
        st = new.status()
        # The 'held' status reads through the new holder's stale-window;
        # since the lock was JUST written, it's NOT stale to the new
        # process even with stale_after=1 (sleep was 1.2). Just verify
        # the new holder owns it.
        assert st["holder"]["holder"] == "new-holder", f"takeover failed: {st}"
        new.release()
    print("  PASS  stale-lock-takeover: old holder evicted after stale_after_seconds")


def test_context_manager_release_on_exception() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        lock_path = Path(tmp) / "ctx.lock"
        try:
            with mod.build_mutex("ctx-holder", lock_path=lock_path):
                raise RuntimeError("simulated work failure")
        except RuntimeError:
            pass
        # After exception, lock must be released
        assert not lock_path.exists(), "context manager must release on exception"
        # And a new acquirer succeeds
        with mod.build_mutex("after-failure", lock_path=lock_path):
            pass
    print("  PASS  context-manager-release-on-exception")


def test_status_cli_does_not_acquire() -> None:
    """Status checks must NOT side-effect the lock state."""
    with tempfile.TemporaryDirectory() as tmp:
        lock_path = Path(tmp) / "no-side.lock"
        # Free state
        st = mod.BuildMutex("checker", lock_path=lock_path).status()
        assert st == {"state": "free"}
        assert not lock_path.exists(), "status call must not create the lock"
    print("  PASS  status-no-side-effect")


def main() -> int:
    print("Spec 31 Phase 5b.4 -- mutex FR19 contract")
    test_concurrent_second_acquirer_blocks()
    test_status_states()
    test_stale_lock_takeover()
    test_context_manager_release_on_exception()
    test_status_cli_does_not_acquire()
    print("\nMUTEX-5B.4: PASS (block + status + stale-takeover + ctx-mgr + no-side-effect)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
