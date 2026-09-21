"""Write the manifest annotation stage's decisions to Spec 44's audit log.

Spec 31 FR-31-31: the draft's embedded manifest (`data-sgs-manifest`) declares which
block each section is; `manifest_annotation.py` turns each declaration into SGS-BEM
class names on the run copy and produces one REPORT ROW per declaration (applied,
partial, queued or rejected). This module stores those rows in the durable, git-tracked,
append-only log Spec 44 §7 already owns
(`recogniser/classless-recognition-log.jsonl`), tagged `source: "manifest"`, so the
operator review surface reads them exactly as it reads every other source.

Row schema = the field set `recogniser/classless_trust_gate.py::ClasslessDecision.to_log_row`
writes (the Spec 44 writer), mirrored here rather than imported because that writer needs a
dataclass instance shaped for Stage A/B. The default path is imported from the same module
(`classless_trust_gate.LOG_PATH`), so there is one place the log location is defined; the
import has no side effects (it opens no database and touches no file).

Guarantees:
  * append-only: the file is opened in append mode and never rewritten or truncated;
  * one write call per row (a line is never interleaved with another process's line);
  * idempotent per (client_slug, run_id, boundary_id, outcome) among `source: "manifest"`
    rows, so a re-run of the same run does not duplicate;
  * an unreadable existing log is treated as empty, with one warning line, never a crash.

UK English throughout.
"""
from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

_HERE = Path(__file__).resolve().parent
_RECOGNISER_DIR = _HERE.parent / "recogniser"
_SCRIPTS_DIR = _HERE.parent
for _p in (str(_RECOGNISER_DIR), str(_SCRIPTS_DIR)):
    if _p not in sys.path:
        sys.path.insert(0, _p)

import classless_trust_gate as _spec44  # noqa: E402  (Spec 44's writer: single source of the log path)

LOG_PATH: Path = _spec44.LOG_PATH
KIND_DECISION: str = _spec44.KIND_DECISION

SOURCE_MANIFEST = "manifest"
MATCH_TYPE_MANIFEST = "manifest"
STAGE_NONE = _spec44.STAGE_NONE

VALID_OUTCOMES = ("applied", "partial", "queued", "rejected")


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _warn(message: str) -> None:
    print(f"manifest_decisions_log: warning: {message}", file=sys.stderr)


def _dedupe_key(row: dict[str, Any]) -> tuple[str, str, str, str]:
    return (
        str(row.get("client_slug", "")),
        str(row.get("run_id", "")),
        str(row.get("boundary_id", "")),
        str(row.get("outcome", "")),
    )


def _read_existing_keys(path: Path) -> tuple[set[tuple[str, str, str, str]], bool]:
    """(keys of every existing `source: "manifest"` row, file-ends-without-newline).

    An unreadable log (permissions, bad encoding) is treated as empty with ONE warning.
    A malformed line is skipped (the Spec 44 reader's rule: a half-written line from an
    interrupted run must not stop later runs); one warning covers all of them.
    """
    if not path.exists():
        return set(), False
    try:
        raw = path.read_bytes()
        text = raw.decode("utf-8")
    except (OSError, UnicodeDecodeError) as exc:
        _warn(f"cannot read {path} ({exc.__class__.__name__}); treating it as empty")
        return set(), False
    keys: set[tuple[str, str, str, str]] = set()
    skipped = 0
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            row = json.loads(line)
        except ValueError:
            skipped += 1
            continue
        if isinstance(row, dict) and row.get("source") == SOURCE_MANIFEST:
            keys.add(_dedupe_key(row))
    if skipped:
        _warn(f"{skipped} unparseable line(s) in {path} were skipped")
    return keys, bool(raw) and not raw.endswith(b"\n")


def _to_log_row(report: dict[str, Any], client_slug: str, run_id: str) -> dict[str, Any]:
    status = report.get("status")
    if status not in VALID_OUTCOMES:
        raise ValueError(
            f"manifest report row has status {status!r}; expected one of {VALID_OUTCOMES}")
    root_class = report.get("root_class")
    if not isinstance(root_class, str) or not root_class.strip():
        raise ValueError("manifest report row has no root_class (boundary_id)")
    reason = report.get("reason")
    target = report.get("target") or "root"
    items = report.get("items") or 0
    fields = [str(f) for f in (report.get("fields") or [])]
    return {
        "ts": _now(),
        "source": SOURCE_MANIFEST,
        "kind": KIND_DECISION,
        "client_slug": client_slug,
        "run_id": run_id,
        "boundary_id": root_class.strip(),
        "stage": STAGE_NONE,
        "block": report.get("block"),
        "match_type": MATCH_TYPE_MANIFEST,
        "match_quality": report.get("confidence"),
        "outcome": status,
        "clause_a": False,
        "clause_b": False,
        "signal": (f"declared by the draft's manifest: {target} element, "
                   f"{items} item(s), {len(fields)} field(s)"),
        "reasons": [reason] if reason else [],
        "fields": fields,
        "target": target,
        "items": items,
    }


def append_manifest_decisions(
    rows: Iterable[dict[str, Any]],
    client_slug: str,
    run_id: str,
    log_path: Path | None = None,
) -> int:
    """Append one Spec 44 log row per annotation report row; return how many were appended.

    A row whose (client_slug, run_id, boundary_id, outcome) is already in the log for
    `source: "manifest"` is skipped, as is a repeat within this call. Raises ValueError
    for a malformed report row or an empty client_slug/run_id (an unattributed decision
    is not a decision).
    """
    if not (client_slug and client_slug.strip() and run_id and run_id.strip()):
        raise ValueError("append_manifest_decisions requires a client_slug and a run_id")
    path = Path(log_path) if log_path else LOG_PATH
    log_rows = [_to_log_row(r, client_slug, run_id) for r in rows]
    if not log_rows:
        return 0
    seen, needs_newline = _read_existing_keys(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    appended = 0
    with path.open("ab") as fh:
        for row in log_rows:
            key = _dedupe_key(row)
            if key in seen:
                continue
            payload = (json.dumps(row, ensure_ascii=False) + "\n").encode("utf-8")
            if needs_newline:
                # A previous interrupted write left a line with no terminator; start a
                # fresh line so this row is not glued onto it.
                payload = b"\n" + payload
                needs_newline = False
            fh.write(payload)
            seen.add(key)
            appended += 1
    return appended
