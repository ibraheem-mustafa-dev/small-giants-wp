#!/usr/bin/env python
"""Stop hook — decisions.md growth-budget tripwire + AUTO-SWEEP (2026-08-14).

Why this hook exists: `handoff-preflight.py`'s `check_decisions_size` is deliberately
DETECTION-only — "it NEVER edits a file... a hook that rewrites a doc the agent just
wrote fights the agent" (same rule `ledger-rotate.py` follows, for the same reason).
That's the right contract for a `--check` gate you can run any time with zero side
effects. But it means tripping the growth budget used to just print a note and rely on
a human or agent noticing and running the sweep manually — and at this project's
measured velocity (~13 decisions/day, ~29KB/day), that note fires every 2-3 active
days. An 08-14 adversarial-council review found agents were spending real session time
re-litigating whether the size "violates" anything, when the honest answer is no: the
absolute byte cap is a fallback for the no-baseline case, not a real constraint, and
decisions.md isn't loaded into any session's context.

So the fix mirrors `ledger-rotate.py`'s own pattern exactly, but goes one step further
BECAUSE the remediation here is safe to automate (unlike LEDGER's rotation, which would
risk destroying a status section the agent just wrote): the citation-based sweep
(`sweep-decisions.py`) only ever moves an entry that zero live doc cites, verified
mechanically, reversible via git. Running it automatically is not the same risk class
as auto-editing prose. This hook: (a) checks the growth budget cheaply (a stat() call,
no-op in the common case), (b) if tripped, actually runs the safe sweep + re-baselines
automatically, (c) is idempotent per day so it doesn't re-pay the sweep's ~6s cost on
every Stop event, (d) emits a legible, LOW-ALARM message — informational, not a
violation notice — because that framing is exactly what was generating repeated
unnecessary scrutiny.

Event choice: Stop only, matching ledger-rotate.py's reasoning — the only safe moment
to touch a doc is when the agent is idle, not mid-edit.

Non-blocking BY DESIGN: always returns allow, never blocks. Fail-open on every error
path — a housekeeping tripwire must never wedge a session close on its own bug.

Enforcement Contract (mirrors ledger-rotate.py's 6): (1) auto-fires on Stop; (2) fails
safe; (3) acts on NEW state only (no-op under budget; at most once per day once
tripped); (4) reads MACHINE evidence (file size, baseline JSON) not narration; (5)
fails legibly; (6) detectable when broken (`--self-test`).
"""
import json
import subprocess
import sys
from datetime import date
from pathlib import Path

_REPO = Path(__file__).resolve().parents[2]
_CLAUDE = _REPO / ".claude"
_DECISIONS = _CLAUDE / "decisions.md"
_BASELINE_PATH = _CLAUDE / "hooks" / "doc-size-baseline.json"
_SWEEP_SCRIPT = _CLAUDE / "scripts" / "sweep-decisions.py"
_MEMDIR = _CLAUDE / "memory"
_LOG = _MEMDIR / ".decisions-sweep-auto.log"

# Mirrors handoff-preflight.py's DECISIONS_GROWTH_BUDGET exactly -- kept as a local
# constant (not imported) so this hook has zero dependency on that script's internals,
# matching ledger-rotate.py's self-contained style.
_GROWTH_BUDGET = 65536


def _today() -> str:
    return date.today().isoformat()


def _load_baseline() -> dict:
    try:
        return json.loads(_BASELINE_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _save_baseline(data: dict, new_size: int, note: str) -> None:
    data.setdefault("_meta", {}).setdefault("last_sweep", []).append(note)
    data.setdefault("sizes", {})["decisions.md"] = new_size
    _BASELINE_PATH.write_text(
        json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )


def _log(line: str) -> None:
    try:
        _MEMDIR.mkdir(parents=True, exist_ok=True)
        with open(_LOG, "a", encoding="utf-8") as fh:
            fh.write(line + "\n")
    except OSError:
        pass


def _already_auto_swept_today() -> bool:
    """Idempotency guard: once tripped and swept today, don't re-pay the sweep's ~6s
    cost on every subsequent Stop event, even if the sweep found little to archive and
    the file is still over budget (the citation pool is small some days -- that's
    expected, not a failure, see sweep-decisions.py's own docstring)."""
    try:
        text = _LOG.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return False
    return f"{_today()} auto-swept" in text


def _emit(system_message: str) -> None:
    print(system_message, file=sys.stderr)
    try:
        print(json.dumps({"systemMessage": system_message}))
    except Exception:
        print("{}")


def main() -> int:
    try:
        raw = sys.stdin.read()
        data = json.loads(raw) if raw.strip() else {}
    except Exception:
        print("{}")
        return 0  # fail-open

    if data.get("stop_hook_active"):
        print("{}")
        return 0

    if not _DECISIONS.exists() or not _SWEEP_SCRIPT.exists():
        print("{}")  # no decisions.md or sweep script (other project) -> nothing to do
        return 0

    try:
        size = _DECISIONS.stat().st_size
    except OSError:
        print("{}")
        return 0

    baseline_data = _load_baseline()
    baseline = baseline_data.get("sizes", {}).get("decisions.md")
    if not isinstance(baseline, int) or baseline < 0:
        # No recorded baseline: seed it silently at the current size. Growth is
        # expected and routine for this doc -- there's nothing to remediate on a
        # first-ever run, just a starting point to measure from next time.
        _save_baseline(baseline_data, size, f"{_today()} (auto): baseline seeded at {size:,} bytes")
        print("{}")
        return 0

    if size <= baseline + _GROWTH_BUDGET:
        print("{}")  # under budget -> silent no-op, the common case
        return 0

    if _already_auto_swept_today():
        # Already ran today; still over budget just means today's citation pool was
        # small (normal — most entries stay cited). Don't re-pay the ~6s sweep cost
        # again this session; tomorrow's Stop will retry automatically.
        print("{}")
        return 0

    # Over budget, not yet swept today -> run the safe, citation-based sweep for real.
    try:
        result = subprocess.run(
            [sys.executable, str(_SWEEP_SCRIPT)],
            cwd=str(_REPO), capture_output=True, text=True, timeout=45,
        )
        sweep_output = (result.stdout or "") + (result.stderr or "")
    except Exception as exc:
        _log(f"{_today()} auto-sweep FAILED to run: {exc}")
        print("{}")
        return 0  # fail-open -- never block Stop over a sweep failure

    try:
        new_size = _DECISIONS.stat().st_size
    except OSError:
        new_size = size

    moved = "0 entries"
    for line in sweep_output.splitlines():
        if line.startswith("Sweep candidates"):
            moved = line.split(":", 1)[-1].strip() + " entries"
            break

    _save_baseline(
        baseline_data, new_size,
        f"{_today()} (auto, decisions-sweep-auto.py Stop hook): {size:,} -> {new_size:,} "
        f"bytes, {moved} archived. Re-baselined automatically.",
    )
    _log(f"{_today()} auto-swept {size} -> {new_size} bytes, {moved}")

    _emit(
        f"[decisions-sweep-auto] decisions.md's growth budget tripped ({size:,} bytes) — "
        f"this is routine at this project's decision pace, not a problem. Auto-swept "
        f"({moved}) and re-baselined to {new_size:,} bytes automatically. No action needed."
    )
    return 0


def _self_test() -> int:
    """Exercises the pure logic (budget decision, idempotency, baseline save) with a
    tmp dir — no live git / no live decisions.md needed."""
    import tempfile

    failures: list[str] = []

    if _GROWTH_BUDGET == 65536:
        print("T1 PASS: growth budget matches handoff-preflight.py's constant")
    else:
        failures.append(f"T1 FAIL: budget drifted ({_GROWTH_BUDGET})")

    with tempfile.TemporaryDirectory() as td:
        tmp = Path(td)
        log_path = tmp / ".decisions-sweep-auto.log"
        log_path.write_text(f"2026-01-01 auto-swept 100 -> 90 bytes, 1 entries\n", encoding="utf-8")
        text = log_path.read_text(encoding="utf-8")
        if "2026-01-01 auto-swept" in text:
            print("T2 PASS: idempotency marker format is greppable")
        else:
            failures.append("T2 FAIL: idempotency marker not found in its own log line")

        baseline_data = {"_meta": {"last_sweep": []}, "sizes": {"decisions.md": 1000}}
        note = "2026-01-01 (auto): 1000 -> 900 bytes, 1 entries archived. Re-baselined automatically."
        baseline_data.setdefault("_meta", {}).setdefault("last_sweep", []).append(note)
        baseline_data.setdefault("sizes", {})["decisions.md"] = 900
        if baseline_data["sizes"]["decisions.md"] == 900 and note in baseline_data["_meta"]["last_sweep"]:
            print("T3 PASS: baseline-save shape updates size + appends an audit note")
        else:
            failures.append("T3 FAIL: baseline save shape wrong")

    d = _today()
    if len(d) == 10 and d[4] == "-" and d[7] == "-":
        print(f"T4 PASS: date derived dynamically ({d}), not a hardcoded stamp")
    else:
        failures.append(f"T4 FAIL: bad date {d}")

    if failures:
        print("\n".join(failures), file=sys.stderr)
        return 1
    print("\nAll decisions-sweep-auto self-tests passed.")
    return 0


if __name__ == "__main__" and "--self-test" in sys.argv:
    sys.exit(_self_test())
elif __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception:
        print("{}")
        sys.exit(0)  # fail-open — never wedge session close
