#!/usr/bin/env python3
"""
qc-on-converter-edit.py — Structural QC enforcement hook (Decision 31)

Decision source: .claude/plans/2026-05-21-architecture-staging.md §11 Decision 31
Phase:           0.5 (ships before Phase 1 dispatches subagents)
Binding rule:    blub.db row 255 — multi-model /qc panel BEFORE every
                 converter/pipeline commit. This hook makes that gate structural.

POSTURE: WARNING-ONLY (systemMessage + permissionDecision: "allow").
  Commits proceed regardless. Operator can bypass intentionally by including
  [qc-skipped:<reason>] in the commit message body.

AUTO-ESCALATION CRITERION (future phase):
  If compliance <80% across 5+ commits (measured by absence of [qc:...] markers
  in tracked commits), escalate to hard-block via permissionDecision: "block".
  Track compliance in .qc-edit-tracker.json "commits" array.
  Threshold check: if len(skipped) / max(len(all_commits), 1) > 0.20 after 5
  commits, open a follow-up task to flip posture.

WATCHED PATHS (partial match — any part of the path must contain one of these):
  - plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py
  - plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py
  - plugins/sgs-blocks/scripts/sgs-update.py  (Phase 4 creates this; future-proof)

EXPLICIT EXCLUSIONS (never fire on these even if partial-match is ambiguous):
  - lucide-icons.php (not converter logic)
  - Any path NOT ending in one of the watched filenames

HOOK MODES:
  PostToolUse — tracks edits to watched converter paths in .qc-edit-tracker.json
  PreToolUse  — gates git commit Bash commands when tracker has live entries

TRACKER FILE:
  c:/Users/Bean/Projects/small-giants-wp/.claude/.qc-edit-tracker.json
  Format: {"edits": [{"path": "...", "timestamp": "ISO8601", "tool": "..."}],
            "commits": []}
  Stale-purge: entries older than 2 hours are removed on every read.

CC HOOK SCHEMA (blub.db feedback_cc_hook_schema_decision_allow):
  CORRECT: permissionDecision: "allow" + systemMessage
  WRONG:   decision: "allow"  ← invalid, freezes Claude
  CORRECT: permissionDecision: "block"  ← only for hard-block (not used here)
"""
from __future__ import annotations

import json
import os
import re
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

# ---------- paths ----------
PROJECT = Path(__file__).resolve().parents[2]
TRACKER_PATH = PROJECT / ".claude" / ".qc-edit-tracker.json"
STALE_HOURS = 2

# ---------- watched files (exact basename match required) ----------
WATCHED_BASENAMES = frozenset({
    "convert.py",            # converter_v2/convert.py
    "sgs-clone-orchestrator.py",
    "sgs-update.py",         # Phase 4 — future-proof
})

# Additional guard: full path must also contain a converter-context segment
# to prevent false-positive on e.g. a different plugin's convert.py
WATCHED_PATH_SEGMENTS = (
    "plugins/sgs-blocks/scripts/orchestrator/converter_v2/",
    "plugins/sgs-blocks/scripts/orchestrator/converter_v2\\",
    "plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py",
    "plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py".replace("/", "\\"),
    "plugins/sgs-blocks/scripts/sgs-update.py",
    "plugins/sgs-blocks/scripts/sgs-update.py".replace("/", "\\"),
)

# Explicit exclusion list — never fire on these
EXCLUDED_FRAGMENTS = (
    "lucide-icons.php",
    "lucide-icons",
)


def _normalise(path: str) -> str:
    """Forward-slash normalise for cross-platform substring matching."""
    return path.replace("\\", "/")


def _is_watched_path(file_path: str) -> bool:
    """Return True iff this path is a watched converter/orchestrator file."""
    fp = _normalise(file_path)

    # Explicit exclusion guard — comes first
    for excl in EXCLUDED_FRAGMENTS:
        if excl in fp:
            return False

    basename = Path(fp).name

    # Basename must be in the watched set
    if basename not in WATCHED_BASENAMES:
        return False

    # For convert.py (common name) — require converter_v2 context segment
    if basename == "convert.py":
        return "converter_v2/" in fp

    # sgs-clone-orchestrator.py and sgs-update.py are unique enough by basename
    return True


# ---------- tracker I/O ----------
def _load_tracker() -> dict:
    """Load tracker JSON; stale-purge entries older than STALE_HOURS."""
    default: dict = {"edits": [], "commits": []}
    try:
        with open(TRACKER_PATH, "r", encoding="utf-8") as fh:
            data = json.load(fh)
    except (FileNotFoundError, json.JSONDecodeError):
        return default

    cutoff = datetime.now(timezone.utc) - timedelta(hours=STALE_HOURS)
    live_edits = []
    for entry in data.get("edits", []):
        try:
            ts = datetime.fromisoformat(entry["timestamp"])
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=timezone.utc)
            if ts > cutoff:
                live_edits.append(entry)
        except (KeyError, ValueError):
            pass  # malformed entry — drop it
    data["edits"] = live_edits
    if "commits" not in data:
        data["commits"] = []
    return data


def _save_tracker(data: dict) -> None:
    """Write tracker JSON; silently no-op on failure (hook must never crash)."""
    try:
        TRACKER_PATH.parent.mkdir(parents=True, exist_ok=True)
        with open(TRACKER_PATH, "w", encoding="utf-8") as fh:
            json.dump(data, fh, indent=2)
    except Exception:
        pass


def _add_edit_entry(file_path: str, tool_name: str) -> None:
    data = _load_tracker()
    data["edits"].append({
        "path": file_path,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "tool": tool_name,
    })
    _save_tracker(data)


def _has_live_converter_edits() -> bool:
    """Return True if tracker has any non-stale converter-path edit entries."""
    data = _load_tracker()
    return len(data["edits"]) > 0


# ---------- output helpers ----------
def emit_warning(message: str) -> None:
    """Posture A: allow the action but surface a systemMessage warning."""
    out = {
        "permissionDecision": "allow",
        "suppressOutput": False,
        "systemMessage": message,
    }
    print(json.dumps(out))


def emit_allow() -> None:
    """Silent allow — no systemMessage needed."""
    out = {"permissionDecision": "allow"}
    print(json.dumps(out))


# ---------- PostToolUse: track converter edits ----------
def handle_post_tool_use(tool_name: str, tool_input: dict) -> int:
    """
    Called after Write/Edit on any file.
    If the file is a watched converter path, record in tracker.
    """
    if tool_name not in ("Write", "Edit"):
        return 0

    file_path = (tool_input or {}).get("file_path", "")
    if not file_path:
        return 0

    if _is_watched_path(file_path):
        _add_edit_entry(file_path, tool_name)
        # No systemMessage on write — silent tracking only

    return 0


# ---------- PreToolUse: gate git commit ----------
def handle_pre_tool_use(tool_name: str, tool_input: dict) -> int:
    """
    Called before Bash commands.
    If it's a `git commit` and the tracker has live converter edits,
    warn unless the commit message contains [qc:<...>] or [qc-skipped:<...>].
    """
    if tool_name != "Bash":
        return 0

    cmd = (tool_input or {}).get("command", "")
    if not cmd:
        return 0

    # Only gate `git commit` (not git push, git add, etc.)
    if not re.search(r"\bgit\s+commit\b", cmd):
        return 0

    # Check if tracker has live converter edits
    if not _has_live_converter_edits():
        return 0

    # Check if commit message already has a QC marker
    # Match [qc:...] or [qc-skipped:...] anywhere in the command string
    if re.search(r"\[qc(?:-skipped)?:[^\]]+\]", cmd):
        return 0

    # Emit warning
    emit_warning(
        "[QC gate — Decision 31] You have edited converter/orchestrator files this session "
        "but this commit message does not contain a [qc:<run_id>] marker.\n\n"
        "Binding rule blub.db 255 requires a multi-model /qc panel (Sonnet + Haiku + "
        "Gemini Flash + Cerebras) BEFORE committing to converter/pipeline paths.\n\n"
        "Options:\n"
        "  1. Run /qc first, then add [qc:<run_id>] to the commit message body.\n"
        "  2. Intentionally skip (conscious decision only): add [qc-skipped:<reason>] "
        "to the commit message body.\n\n"
        "Commit will proceed — this is a warning, not a block."
    )
    return 0


# ---------- main dispatch ----------
def main() -> int:
    try:
        payload = json.loads(sys.stdin.read())
    except Exception:
        return 0  # malformed input → fail silent

    hook_type = payload.get("hook_event_name", "")
    tool_name = payload.get("tool_name", "")
    tool_input = payload.get("tool_input") or {}

    try:
        if hook_type == "PostToolUse":
            return handle_post_tool_use(tool_name, tool_input)
        elif hook_type == "PreToolUse":
            return handle_pre_tool_use(tool_name, tool_input)
        else:
            # Unknown hook type — silently allow
            return 0
    except Exception as exc:
        # Hook must never crash — log to stderr, exit cleanly
        sys.stderr.write(f"[qc-on-converter-edit] ERROR: {exc}\n")
        return 0


# ---------- self-test mode ----------
if __name__ == "__main__" and "--self-test" in sys.argv:
    """
    Self-test: 3 assertions. Exit 0 on all pass, exit 1 with reason on failure.
    Uses an isolated test-tracker file to avoid polluting the real tracker.
    """
    import tempfile
    import copy

    TEST_TRACKER = Path(tempfile.gettempdir()) / "qc-edit-tracker-selftest.json"
    # Monkey-patch TRACKER_PATH for the duration of the test
    _orig_tracker = TRACKER_PATH

    failures: list[str] = []

    # ---- Test 1: watched-path edit → tracker gains an entry ----
    TRACKER_PATH = TEST_TRACKER  # type: ignore[assignment]
    try:
        TEST_TRACKER.write_text('{"edits": [], "commits": []}', encoding="utf-8")
        _add_edit_entry(
            "c:/Users/Bean/Projects/small-giants-wp/plugins/sgs-blocks/scripts/"
            "orchestrator/converter_v2/convert.py",
            "Edit",
        )
        data_after = _load_tracker()
        if len(data_after["edits"]) == 1:
            print("Test 1 PASS: watched-path edit → tracker entry added")
        else:
            failures.append(f"Test 1 FAIL: expected 1 edit entry, got {len(data_after['edits'])}")
    except Exception as e:
        failures.append(f"Test 1 FAIL (exception): {e}")

    # ---- Test 2: lucide-icons.php edit → tracker NOT updated ----
    try:
        TEST_TRACKER.write_text('{"edits": [], "commits": []}', encoding="utf-8")
        is_watched = _is_watched_path(
            "c:/Users/Bean/Projects/small-giants-wp/plugins/sgs-blocks/includes/lucide-icons.php"
        )
        if not is_watched:
            print("Test 2 PASS: lucide-icons.php correctly excluded (false-positive guard OK)")
        else:
            failures.append("Test 2 FAIL: lucide-icons.php incorrectly matched as a watched path")
    except Exception as e:
        failures.append(f"Test 2 FAIL (exception): {e}")

    # ---- Test 3: stale entry (3 hours old) purged on load ----
    try:
        stale_ts = (datetime.now(timezone.utc) - timedelta(hours=3)).isoformat()
        stale_data = {"edits": [{"path": "convert.py", "timestamp": stale_ts, "tool": "Edit"}], "commits": []}
        TEST_TRACKER.write_text(json.dumps(stale_data), encoding="utf-8")
        loaded = _load_tracker()
        if len(loaded["edits"]) == 0:
            print("Test 3 PASS: stale entry (3h old) purged on load")
        else:
            failures.append(f"Test 3 FAIL: expected 0 entries after stale purge, got {len(loaded['edits'])}")
    except Exception as e:
        failures.append(f"Test 3 FAIL (exception): {e}")

    # Cleanup
    TRACKER_PATH = _orig_tracker  # type: ignore[assignment]
    try:
        TEST_TRACKER.unlink(missing_ok=True)
    except Exception:
        pass

    if failures:
        for f in failures:
            print(f, file=sys.stderr)
        sys.exit(1)
    else:
        print("All 3 self-tests passed.")
        sys.exit(0)
elif __name__ == "__main__":
    sys.exit(main())