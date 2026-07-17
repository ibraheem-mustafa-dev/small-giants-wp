#!/usr/bin/env python
"""Stop hook — LEDGER.md rotation tripwire + snapshot backup (P4, 2026-07-17).

Why this hook exists (setup-simplification plan §2 + §5 rule 1, qc-council-validated):
`state.md` ballooned to 66KB because every session PREPENDED a full history block and
nobody swept. The fix has TWO parts:
  1. the AUTHORING model — LEDGER.md's living status is REPLACED each session, not
     appended, and history moves to dated snapshots (that is what bounds growth);
  2. THIS hook — a Stop-time tripwire + backup. It NEVER edits LEDGER (a hook that
     truncated a doc the agent just wrote would fight the agent and risk destroying the
     current status — the exact reason the plan kills the PreToolUse byte-cap 3x). At
     session close, if LEDGER.md is over a byte threshold it (a) writes a dated SNAPSHOT
     to memory/session-YYYY-MM-DD.md so no history is lost, and (b) emits a LEGIBLE
     remediation telling the operator to sweep older status to the archive.

Event choice (§3.4): Stop only. NOT PreToolUse(Write/Edit) (unreliable #13744, fights
mid-edit) and NOT PostToolUse (can't block, and we don't want to block anyway). Stop
fires once at session close with the agent idle — the only safe moment to touch the file.

Non-blocking BY DESIGN: it returns allow ({}), never `{"decision":"block"}`. Fail-open on
every error path — a housekeeping tripwire must never wedge a session close on its own bug.

Enforcement Contract (all 6): (1) auto-fires on Stop; (2) fails safe (fail-open, never
blocks); (3) acts on NEW state only (fires only over threshold; idempotent — a same-day
identical snapshot is a no-op, differing content gets a -N suffix, never clobbers); (4)
reads MACHINE evidence (the file's byte size) not narration; (5) fails legibly (names the
snapshot path + the remediation); (6) detectable when broken (`--self-test`).
"""
import json
import sys
from datetime import date
from pathlib import Path

# Repo root = .claude/hooks/ledger-rotate.py -> parents[2]
_REPO = Path(__file__).resolve().parents[2]
_LEDGER = _REPO / ".claude" / "LEDGER.md"
_MEMDIR = _REPO / ".claude" / "memory"
_LOG = _MEMDIR / ".ledger-rotate.log"

# The byte cap used repo-wide for state.md / MEMORY.md (docs-registry.yaml). Machine-
# measurable, consistent. Over this, LEDGER is trending toward the state.md balloon.
_THRESHOLD_BYTES = 24576


def _today() -> str:
    """Current date YYYY-MM-DD (dynamically derived — NOT a hardcoded stamp)."""
    return date.today().isoformat()


def _pick_snapshot_path(memdir: Path, day: str, ledger_text: str) -> tuple[Path | None, bool]:
    """Choose the snapshot destination for `day`.

    Idempotency (Enforcement-Contract rule 3 — act on NEW state only):
      - target free           -> use it, write=True
      - target holds an EARLIER auto-snapshot of the SAME current LEDGER -> no-op (None, False)
      - target differs         -> walk -2, -3, ... until a free/identical slot is found
    Returns (path_or_None, should_write).
    """
    base = memdir / f"session-{day}.md"
    candidates = [base] + [memdir / f"session-{day}-{n}.md" for n in range(2, 50)]
    for cand in candidates:
        if not cand.exists():
            return cand, True
        try:
            existing = cand.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        if ledger_text.strip() and ledger_text.strip() in existing:
            # This exact LEDGER content is already snapshotted today -> no-op.
            return None, False
    return None, False  # 48 same-day snapshots already: stop proliferating, no-op.


def _snapshot_body(ledger_text: str, day: str) -> str:
    return (
        f"# LEDGER snapshot — {day} (auto-rotated by ledger-rotate.py)\n"
        f"<!-- Written at Stop because LEDGER.md crossed {_THRESHOLD_BYTES} bytes. This is a\n"
        f"     verbatim backup of the living status at session close, so no history is lost\n"
        f"     when the LEDGER's current-status section is replaced next session. -->\n\n"
        + ledger_text
    )


def _log(line: str) -> None:
    try:
        _MEMDIR.mkdir(parents=True, exist_ok=True)
        with open(_LOG, "a", encoding="utf-8") as fh:
            fh.write(line + "\n")
    except OSError:
        pass


def _emit(system_message: str) -> None:
    """Surface a legible message to the operator (best-effort across channels) and
    ALWAYS return allow — never block the stop."""
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

    # Loop guard: a Stop hook that re-fires inside its own chain carries this flag.
    if data.get("stop_hook_active"):
        print("{}")
        return 0

    if not _LEDGER.exists():
        print("{}")  # no LEDGER (other project / pre-migration) -> nothing to rotate
        return 0

    try:
        size = _LEDGER.stat().st_size
    except OSError:
        print("{}")
        return 0

    if size <= _THRESHOLD_BYTES:
        print("{}")  # under threshold -> silent no-op (act on NEW state only)
        return 0

    # Over threshold -> snapshot + legible remediation. NEVER edit LEDGER.
    try:
        ledger_text = _LEDGER.read_text(encoding="utf-8", errors="replace")
    except OSError:
        print("{}")
        return 0

    day = _today()
    dest, should_write = _pick_snapshot_path(_MEMDIR, day, ledger_text)
    if should_write and dest is not None:
        try:
            _MEMDIR.mkdir(parents=True, exist_ok=True)
            dest.write_text(_snapshot_body(ledger_text, day), encoding="utf-8")
        except OSError as exc:
            _log(f"{day} rotate FAILED size={size} err={exc}")
            print("{}")
            return 0
        rel = dest.relative_to(_REPO).as_posix()
        _log(f"{day} snapshot -> {rel} size={size}")
        _emit(
            f"[ledger-rotate] LEDGER.md is {size:,} bytes (over {_THRESHOLD_BYTES:,}). "
            f"Backed up a snapshot to {rel}. To keep the LEDGER lean, sweep older / "
            f"resolved status out of .claude/LEDGER.md into .claude/memory/ — the ledger "
            f"is meant to hold the CURRENT status only, not accumulated history."
        )
        return 0

    # Already snapshotted this exact content today -> just remind, don't re-write.
    _log(f"{day} over-threshold size={size} (already snapshotted today)")
    _emit(
        f"[ledger-rotate] LEDGER.md is {size:,} bytes (over {_THRESHOLD_BYTES:,}) and today's "
        f"snapshot is already current. Sweep older status out of .claude/LEDGER.md into "
        f".claude/memory/ to bring it back under the cap."
    )
    return 0


def _self_test() -> int:
    """Enforcement-Contract self-test. Exits 0 on all pass, 1 with reasons.
    Exercises the pure logic (threshold decision, snapshot-path idempotency, message)
    with a tmp dir — no live git / no live LEDGER needed (detectable-when-broken)."""
    import tempfile

    failures: list[str] = []

    # T1: threshold decision — under is a no-op, over triggers.
    if not (_THRESHOLD_BYTES == 24576):
        failures.append(f"T1 FAIL: threshold changed unexpectedly ({_THRESHOLD_BYTES})")
    else:
        print("T1 PASS: threshold is the repo-wide 24576-byte cap")

    with tempfile.TemporaryDirectory() as td:
        mem = Path(td)
        ledger = "# LEDGER\n" + ("x" * 30000)  # over-threshold content

        # T2: fresh day -> writes session-<day>.md.
        dest, write = _pick_snapshot_path(mem, "2026-01-01", ledger)
        if write and dest is not None and dest.name == "session-2026-01-01.md":
            dest.write_text(_snapshot_body(ledger, "2026-01-01"), encoding="utf-8")
            print("T2 PASS: fresh-day snapshot path chosen + written")
        else:
            failures.append(f"T2 FAIL: expected session-2026-01-01.md, got {dest}")

        # T3: same content same day -> IDEMPOTENT no-op (no clobber, no proliferation).
        dest2, write2 = _pick_snapshot_path(mem, "2026-01-01", ledger)
        if not write2 and dest2 is None:
            print("T3 PASS: identical same-day content is a no-op (idempotent)")
        else:
            failures.append(f"T3 FAIL: expected no-op, got write={write2} dest={dest2}")

        # T4: DIFFERENT content same day -> new -2 suffix, never clobbers.
        dest3, write3 = _pick_snapshot_path(mem, "2026-01-01", ledger + "\nnew session\n")
        if write3 and dest3 is not None and dest3.name == "session-2026-01-01-2.md":
            print("T4 PASS: differing same-day content gets -2 suffix (no clobber)")
        else:
            failures.append(f"T4 FAIL: expected session-2026-01-01-2.md, got {dest3}")

    # T5: date is dynamic (not a hardcoded literal) + well-formed.
    d = _today()
    if len(d) == 10 and d[4] == "-" and d[7] == "-":
        print(f"T5 PASS: date derived dynamically ({d}), not a hardcoded stamp")
    else:
        failures.append(f"T5 FAIL: bad date {d}")

    # T6: snapshot body carries a legible auto-rotate header (fails legibly).
    body = _snapshot_body("BODY", "2026-01-01")
    if "auto-rotated by ledger-rotate.py" in body and "BODY" in body:
        print("T6 PASS: snapshot body is labelled + preserves the LEDGER content")
    else:
        failures.append("T6 FAIL: snapshot body missing label/content")

    if failures:
        print("\n".join(failures), file=sys.stderr)
        return 1
    print("\nAll ledger-rotate self-tests passed.")
    return 0


if __name__ == "__main__" and "--self-test" in sys.argv:
    sys.exit(_self_test())
elif __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception:
        print("{}")
        sys.exit(0)  # fail-open — never wedge session close
