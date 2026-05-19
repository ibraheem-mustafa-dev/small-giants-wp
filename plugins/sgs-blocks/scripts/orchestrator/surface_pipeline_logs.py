"""Surface structured per-severity logs from trace.jsonl at pipeline end.

Reads `<run_dir>/trace.jsonl`, groups events into severity buckets, and writes
human-readable companion logs that surface issues operators care about without
forcing them to scan the full trace.

Output files (each only written if the bucket has >0 entries):
  - chrome-skipped.log    — every chrome-skip event (B1 fix, 2026-05-19)
  - errors.log            — events with `passed: false` or `error*` fields
  - warnings.log          — bem-lint violations, token-lint findings, soft-fails
  - summary.log           — one-line per stage outcome

Per Bean's request 2026-05-19: surface the info/debug/warning/error/critical
messages into separate files so operators don't have to scan trace.jsonl.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")


def _classify(event: dict) -> str:
    """Map a trace event to one of: error, warning, chrome_skip, info."""
    if event.get("branch") == "chrome_skip":
        return "chrome_skip"
    if event.get("passed") is False:
        return "error"
    if any(k.startswith("error") for k in event):
        return "error"
    stage = event.get("stage", "")
    # Soft-fails surfaced by various stages
    if "soft_fail" in stage or event.get("soft_failed"):
        return "warning"
    # Lint stages with violations
    if event.get("violations_count", 0):
        return "warning"
    if event.get("new_tokens_count", 0):
        return "warning"
    return "info"


def _format_line(event: dict) -> str:
    """One-line summary of an event for the log."""
    ts = event.get("ts", "")
    stage = event.get("stage", "<unknown>")
    extras = []
    for k in ("boundary_id", "node_tag", "reason", "branch", "violations_count",
              "new_tokens_count", "error", "error_message", "soft_failed"):
        if k in event and event[k] not in (None, ""):
            extras.append(f"{k}={event[k]}")
    extras_str = " ".join(extras) if extras else ""
    return f"{ts} [{stage}] {extras_str}".rstrip()


def surface(run_dir: Path) -> dict:
    """Read trace.jsonl in run_dir, emit per-severity log files. Returns a summary dict."""
    trace_path = run_dir / "trace.jsonl"
    if not trace_path.exists():
        return {"status": "no_trace", "run_dir": str(run_dir)}

    buckets: dict[str, list[str]] = {
        "chrome_skip": [],
        "error": [],
        "warning": [],
        "info": [],
    }
    stage_outcomes: dict[str, dict[str, int]] = {}

    for line in trace_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            event = json.loads(line)
        except json.JSONDecodeError:
            continue
        bucket = _classify(event)
        buckets[bucket].append(_format_line(event))
        stage = event.get("stage", "<unknown>")
        outcome = stage_outcomes.setdefault(stage, {"events": 0, "errors": 0, "warnings": 0})
        outcome["events"] += 1
        if bucket == "error":
            outcome["errors"] += 1
        elif bucket == "warning":
            outcome["warnings"] += 1

    written: dict[str, str] = {}

    # chrome-skipped.log — always written if any chrome_skip events fired,
    # since this replaces the leaked HTML comments in block_markup (B1 fix).
    if buckets["chrome_skip"]:
        path = run_dir / "chrome-skipped.log"
        path.write_text(
            "# Chrome-skip events (header / footer / nav elements lifted out of post_content)\n"
            "# These belong in WP template parts; cv2 emits nothing for them.\n\n"
            + "\n".join(buckets["chrome_skip"]) + "\n",
            encoding="utf-8",
        )
        written["chrome-skipped.log"] = str(path)

    if buckets["error"]:
        path = run_dir / "errors.log"
        path.write_text("\n".join(buckets["error"]) + "\n", encoding="utf-8")
        written["errors.log"] = str(path)

    if buckets["warning"]:
        path = run_dir / "warnings.log"
        path.write_text("\n".join(buckets["warning"]) + "\n", encoding="utf-8")
        written["warnings.log"] = str(path)

    # summary.log — one line per stage with counts
    summary_lines = ["# Pipeline stage outcomes", ""]
    for stage in sorted(stage_outcomes):
        s = stage_outcomes[stage]
        summary_lines.append(
            f"{stage:50} events={s['events']:4} errors={s['errors']:3} warnings={s['warnings']:3}"
        )
    summary_path = run_dir / "summary.log"
    summary_path.write_text("\n".join(summary_lines) + "\n", encoding="utf-8")
    written["summary.log"] = str(summary_path)

    return {
        "status": "ok",
        "run_dir": str(run_dir),
        "counts": {k: len(v) for k, v in buckets.items()},
        "files_written": written,
    }


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: surface_pipeline_logs.py <run_dir>", file=sys.stderr)
        return 2
    result = surface(Path(sys.argv[1]))
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
