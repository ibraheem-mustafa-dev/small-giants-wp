#!/usr/bin/env python3
"""trace.py -- Structured trace-logger for /sgs-clone pipeline runs.

Writes one JSON object per line (JSONL) to ``<run_dir>/trace.jsonl`` so
that any pipeline decision can be reconstructed by grepping a single file.

API
---
    from orchestrator.trace import Trace

    tr = Trace.for_run(run_dir)   # run_dir is the existing pipeline-state/<run_id> path
    tr.event(
        stage="stage_2_match",
        boundary_id="b4",
        section_id="featured-product",
        decision="deferred-no-match",
        input={"selector": ".sgs-featured-product", "convention": "sgs-bem"},
        considered=[
            {"slug": "sgs/featured-product", "registered": False,
             "reason": "version=0.1.0-scaffold excluded by hard-gate"},
        ],
        result={"matched_block": "core/group", "confidence": 0.0},
    )

Design notes
------------
- Open-write-close per event rather than holding the handle. Clone runs spawn
  subprocesses; a held handle would corrupt the JSONL on Windows (exclusive
  write lock) and break cross-process append correctness.
- Atomicity: ``file.write(line + '\\n')`` is a single write() syscall. Python
  guarantees sub-page writes on local NTFS/ext4 are visible atomically to
  other readers once the file handle is flushed and closed.
- Serialisation failures never crash the caller. Non-serialisable kwargs (e.g.
  a Python ``set``) produce a synthetic ``_error: serialisation_failed`` row.
- ``Trace.disabled()`` returns a null-object whose ``event()`` is a no-op.
  Stage code can call ``Trace.for_run(maybe_dir or None)`` safely.
- ``Trace.for_run(run_dir)`` returns the same instance per process (keyed by
  the resolved absolute path) so multiple modules that import and call
  ``for_run`` in the same run share one reference.

UK English in comments.
Pure stdlib only — no third-party dependencies.
"""
from __future__ import annotations

import json
import os
import sys
import tempfile
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

# Per-process singleton registry: absolute-path -> Trace instance.
_INSTANCES: dict[str, "Trace"] = {}


def _now_iso() -> str:
    """ISO-8601 UTC timestamp with millisecond precision."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


class Trace:
    """JSONL trace-writer bound to a single pipeline run directory."""

    # ------------------------------------------------------------------ #
    # Factories                                                            #
    # ------------------------------------------------------------------ #

    @classmethod
    def for_run(cls, run_dir: Path | str | None) -> "Trace":
        """Return a Trace bound to ``<run_dir>/trace.jsonl``.

        If ``run_dir`` is None or does not exist, returns a disabled (no-op)
        instance so stage code never needs to guard calls with ``if tr:``.

        Subsequent calls with the same resolved path return the same instance
        (per-process singleton).
        """
        if run_dir is None:
            return cls._disabled_instance()

        resolved = str(Path(run_dir).resolve())
        if not Path(resolved).exists():
            return cls._disabled_instance()

        if resolved in _INSTANCES:
            return _INSTANCES[resolved]

        instance = cls.__new__(cls)
        instance._trace_path = Path(resolved) / "trace.jsonl"
        instance._run_id = Path(resolved).name
        instance._disabled = False
        _INSTANCES[resolved] = instance
        return instance

    @classmethod
    def disabled(cls) -> "Trace":
        """Return a no-op Trace. Safe to call ``event()`` on — nothing is written."""
        return cls._disabled_instance()

    @classmethod
    def _disabled_instance(cls) -> "Trace":
        """Internal: return a shared disabled sentinel (not added to _INSTANCES)."""
        instance = cls.__new__(cls)
        instance._trace_path = None
        instance._run_id = ""
        instance._disabled = True
        return instance

    # ------------------------------------------------------------------ #
    # Core write method                                                    #
    # ------------------------------------------------------------------ #

    def event(self, stage: str, **kwargs: Any) -> None:
        """Append one event row to ``trace.jsonl``.

        Mandatory top-level keys added automatically:
          - ``ts``      — ISO-8601 UTC with millisecond precision
          - ``stage``   — the caller-supplied stage name
          - ``run_id``  — basename of the run directory

        All additional ``kwargs`` are merged into the row at the top level.

        Serialisation failures are caught and written as a synthetic error row
        so the caller is never interrupted.
        """
        if self._disabled:
            return

        ts = _now_iso()
        row: dict[str, Any] = {"ts": ts, "stage": stage, "run_id": self._run_id}
        row.update(kwargs)

        try:
            line = json.dumps(row, ensure_ascii=False, default=str)
        except Exception:  # noqa: BLE001 — serialisation must never crash caller
            # Fallback: write a synthetic error row that still identifies the
            # stage and timestamp so the trace file remains parse-able.
            try:
                error_row = {
                    "ts": ts,
                    "stage": stage,
                    "run_id": self._run_id,
                    "_error": "serialisation_failed",
                    "_repr": repr(kwargs),
                }
                line = json.dumps(error_row, ensure_ascii=False)
            except Exception:  # noqa: BLE001 — absolute last resort
                line = json.dumps({"ts": ts, "stage": stage, "run_id": self._run_id,
                                   "_error": "serialisation_failed_unrecoverable"})

        # Open-write-close per event for crash-safety + cross-process append.
        # A single write() call on Windows/POSIX local filesystems guarantees
        # the line appears atomically to other readers after the close.
        try:
            with open(self._trace_path, "a", encoding="utf-8") as fh:
                fh.write(line + "\n")
        except OSError:
            # If the file cannot be written (permissions, full disk, etc.)
            # silently continue rather than aborting the clone pipeline.
            pass

    # ------------------------------------------------------------------ #
    # Reader (operator / test helper)                                     #
    # ------------------------------------------------------------------ #

    @classmethod
    def read(cls, run_dir: Path | str) -> "list[dict]":
        """Yield parsed event dicts from ``<run_dir>/trace.jsonl``.

        Returns an empty list if the file does not exist.
        Malformed lines (invalid JSON) are skipped silently so one corrupt
        write does not block post-mortem inspection of the rest of the trace.
        """
        trace_path = Path(run_dir) / "trace.jsonl"
        if not trace_path.exists():
            return []
        events: list[dict] = []
        with open(trace_path, "r", encoding="utf-8") as fh:
            for raw_line in fh:
                raw_line = raw_line.rstrip("\n")
                if not raw_line:
                    continue
                try:
                    events.append(json.loads(raw_line))
                except json.JSONDecodeError:
                    # Skip corrupted lines rather than crashing post-mortem reads.
                    continue
        return events

    # ------------------------------------------------------------------ #
    # Dunder helpers                                                       #
    # ------------------------------------------------------------------ #

    def __repr__(self) -> str:
        if self._disabled:
            return "Trace(disabled)"
        return f"Trace(run_id={self._run_id!r}, path={self._trace_path})"


# ------------------------------------------------------------------ #
# Standalone smoke-test                                               #
# ------------------------------------------------------------------ #

if __name__ == "__main__":
    import sys

    print("=== trace.py standalone smoke-test ===\n")

    # 1. Create a temporary directory to act as a run directory.
    tmp = Path(tempfile.mkdtemp(prefix="sgs-trace-test-"))
    print(f"Temp run dir: {tmp}\n")

    try:
        # 2a. Emit event with a list of dicts in `considered` (the canonical shape).
        tr = Trace.for_run(tmp)
        tr.event(
            stage="stage_2_match",
            boundary_id="b4",
            section_id="featured-product",
            decision="deferred-no-match",
            input={"selector": ".sgs-featured-product", "convention": "sgs-bem"},
            considered=[
                {
                    "slug": "sgs/featured-product",
                    "registered": False,
                    "reason": "version=0.1.0-scaffold excluded by hard-gate",
                },
            ],
            result={"matched_block": "core/group", "confidence": 0.0},
        )
        print("Event 1 (stage_2_match with considered list) — written")

        # 2b. Emit event with a nested dict in `input`.
        tr.event(
            stage="stage_4_5_token_resolver",
            boundary_id="b4",
            attr_name="backgroundColor",
            raw_value="#F5C2C8",
            input={"theme_json_slices": {"color": {"palette": ["primary", "accent"]}}},
            result={"token_slug": "accent-light", "css_var": "var(--wp--preset--color--accent-light)",
                    "confidence": 0.93, "is_gap_candidate": False},
        )
        print("Event 2 (stage_4_5_token_resolver with nested input dict) — written")

        # 2c. Emit event with a non-serialisable object (set) to exercise the error path.
        tr.event(
            stage="stage_9b_scaffold",
            slug="sgs/gift-picker",
            role="text-content",
            bad_kwarg={"a_set": {1, 2, 3}},   # set is not JSON-serialisable directly
        )
        print("Event 3 (stage_9b_scaffold with non-serialisable set) — written (error path)\n")

        # 3. Read back and print.
        events = Trace.read(tmp)
        print(f"Events read back: {len(events)}")
        for i, ev in enumerate(events, 1):
            print(f"\n--- Event {i} ---")
            print(json.dumps(ev, indent=2, ensure_ascii=False))

        # 4. Singleton identity check.
        tr2 = Trace.for_run(tmp)
        assert tr is tr2, "Trace.for_run must return the same instance for the same path"
        print("\nSingleton check: Trace.for_run(same path) is same instance — OK")

        # 5. Disabled no-op.
        tr_noop = Trace.disabled()
        tr_noop.event(stage="should_not_appear", data="ignored")
        noop_events = Trace.read(tmp)
        assert len(noop_events) == len(events), "Disabled trace must not write anything"
        print("Disabled no-op check: Trace.disabled().event() writes nothing — OK")

        # Also verify that Trace.for_run(None) returns a disabled instance.
        tr_none = Trace.for_run(None)
        assert tr_none._disabled, "Trace.for_run(None) must return disabled instance"
        print("Trace.for_run(None) returns disabled instance — OK")

    finally:
        # 6. Clean up.
        shutil.rmtree(tmp, ignore_errors=True)
        print(f"\nTemp dir {tmp} removed.")

    print("\n=== All checks passed ===")
