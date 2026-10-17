#!/usr/bin/env python3
"""deploy_timing.py - wall-clock time of each deploy stage, a summary table and an append-only history.

One job: make a slow deploy visible the moment it happens. build-deploy.py wraps its steps in
``timed()`` / ``stage()``; each stage prints ``[time] <name> 12.3s`` when it ends, and
``finish()`` prints one summary table (slowest first) and appends one JSON line per real
deploy to ``~/.sgs-deploy-timings.jsonl`` (outside the repo, so it never dirties the git
tree). The path can be overridden with the ``SGS_DEPLOY_TIMINGS_FILE`` environment variable
or the ``path`` argument, so tests never touch the real file.

The functions that format and build entries are pure; only ``append_history`` and
``short_commit`` touch the outside world, and neither can fail a deploy.
"""
from __future__ import annotations

import json
import os
import subprocess
import time
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Iterator

from deploy_common import log

HISTORY_ENV = "SGS_DEPLOY_TIMINGS_FILE"
OTHER_LABEL = "(other, unaccounted)"
STAGES: dict[str, float] = {}


def history_path() -> Path:
    """Where the history lives: the env override, else the user's home folder."""
    override = os.environ.get(HISTORY_ENV)
    return Path(override) if override else Path.home() / ".sgs-deploy-timings.jsonl"


def record(name: str, seconds: float, *, recorder: dict[str, float] | None = None, quiet: bool = False) -> None:
    """Store ``seconds`` against ``name`` (a repeated name adds up) and print the [time] line."""
    target = STAGES if recorder is None else recorder
    target[name] = target.get(name, 0.0) + seconds
    if not quiet:
        log(f"[time] {name} {seconds:.1f}s")


@contextmanager
def stage(name: str, *, recorder: dict[str, float] | None = None) -> Iterator[None]:
    """Time the block. The time is recorded even when the block raises, and the error propagates."""
    began = time.monotonic()
    try:
        yield
    finally:
        record(name, time.monotonic() - began, recorder=recorder)


def timed(name: str, fn: Callable[..., Any], *args: Any, **kwargs: Any) -> Any:
    """Call ``fn(*args, **kwargs)`` as a timed stage and return its result unchanged."""
    with stage(name):
        return fn(*args, **kwargs)


def format_summary(stages: dict[str, float], total_s: float | None = None) -> str:
    """The summary table, slowest first. Percentages are of the total, so they sum to about 100.

    When ``total_s`` (the run's wall clock) exceeds the stages' sum by half a second or more,
    the gap is shown as its own row so no time is hidden.
    """
    rows = dict(stages)
    summed = sum(rows.values())
    total = summed if total_s is None else max(total_s, summed)
    if total - summed >= 0.5:
        rows[OTHER_LABEL] = total - summed
    ordered = sorted(rows.items(), key=lambda kv: kv[1], reverse=True)
    width = max([len(name) for name, _ in ordered] + [len("stage")])
    lines = ["[time] ---- stage timings, slowest first ----",
             f"[time] {'stage':<{width}}  {'seconds':>9}  {'share':>6}"]
    for name, secs in ordered:
        pct = (secs / total * 100.0) if total > 0 else 0.0
        lines.append(f"[time] {name:<{width}}  {secs:>9.1f}  {pct:>5.1f}%")
    lines.append(f"[time] {'TOTAL':<{width}}  {total:>9.1f}  100.0%")
    return "\n".join(lines)


def scope_label(theme_only: bool, blocks_only: bool) -> str:
    return "theme-only" if theme_only else "blocks-only" if blocks_only else "both"


def build_entry(*, commit: str, target: str, scope: str, total_s: float,
                stages: dict[str, float], dry_run: bool, when: datetime | None = None) -> dict[str, Any]:
    """One history record, with exactly the documented keys."""
    stamp = (when or datetime.now(timezone.utc)).astimezone(timezone.utc)
    return {
        "when": stamp.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "commit": commit or "unknown",
        "target": target,
        "scope": scope,
        "total_s": round(total_s, 1),
        "stages": {name: round(secs, 1) for name, secs in stages.items()},
        "dry_run": dry_run,
    }


def append_history(entry: dict[str, Any], path: Path | None = None) -> bool:
    """Append ``entry`` as one JSON line. A dry run writes nothing. A failure logs one line, never raises."""
    if entry.get("dry_run"):
        return False
    try:
        dest = path or history_path()
        with open(dest, "a", encoding="utf-8") as fh:
            fh.write(json.dumps(entry, sort_keys=False) + "\n")
        return True
    except Exception as exc:  # noqa: BLE001 - history is a convenience; it must never fail a deploy
        log(f"[time] could not write the timing history ({type(exc).__name__}: {exc}); the deploy is unaffected")
        return False


def short_commit() -> str:
    """The short hash of HEAD in the current checkout, or "unknown"."""
    try:
        out = subprocess.run(["git", "rev-parse", "--short", "HEAD"], capture_output=True,
                             text=True, check=False, timeout=15)
        return out.stdout.strip() if out.returncode == 0 and out.stdout.strip() else "unknown"
    except Exception:  # noqa: BLE001
        return "unknown"


def finish(*, target: str, theme_only: bool, blocks_only: bool, total_s: float, dry_run: bool,
           path: Path | None = None) -> None:
    """Print the summary table and append the history line. Call just before the [DONE] line."""
    if not STAGES:
        return
    log(format_summary(STAGES, total_s))
    entry = build_entry(commit=short_commit(), target=target, scope=scope_label(theme_only, blocks_only),
                        total_s=total_s, stages=STAGES, dry_run=dry_run)
    append_history(entry, path)
