"""Validate-then-write helper for uimax tables.

Single chokepoint for any Python code (skill runs, scripts, /sgs-clone Stage 9
+REGISTER) that writes rows into uimax. Calls the validator first; raises if
the payload violates row 213 (Rosetta Stone — every artefact-table row carries
equivalent_implementations.sgs_block). Only writes if validation passes.

This module exists so future write code cannot accidentally skip the validator
by calling sqlite3 directly. Use `validate_and_write()` instead of raw INSERT.

Usage:
    from uimax_write import validate_and_write, ValidationError

    try:
        validate_and_write(
            db_path="path/to/uimax.db",
            table="patterns",
            payload={"name": "hero-split", "source": "https://...",
                     "equivalent_implementations": {"sgs_block": "sgs/hero"}},
        )
    except ValidationError as exc:
        # exc.errors is the list from the validator (row 213 messages)
        print(exc.errors)
"""

from __future__ import annotations

import json
import sqlite3
import subprocess
import sys
from pathlib import Path
from typing import Any

VALIDATOR_PATH = Path(__file__).parent / "uimax-write-validator.py"


class ValidationError(Exception):
    """Raised when uimax-write-validator rejects a payload."""

    def __init__(self, errors: list[str], warnings: list[str]):
        self.errors = errors
        self.warnings = warnings
        super().__init__("\n".join(errors))


def validate(table: str, payload: dict[str, Any]) -> dict[str, Any]:
    """Run the validator subprocess. Returns its JSON result dict.

    Result shape: {"valid": bool, "errors": [str], "warnings": [str]}.
    Raises FileNotFoundError if validator script missing.
    """
    if not VALIDATOR_PATH.exists():
        raise FileNotFoundError(
            f"uimax-write-validator.py missing at {VALIDATOR_PATH}. "
            "Cannot validate writes — refusing to proceed."
        )

    # Payload via stdin (arg sentinel '-'), not as an argv string: Windows caps a
    # command line at 32,767 chars (CreateProcess) -> WinError 206 on large pattern
    # payloads carrying embedded markup/CSS. stdin has no such limit.
    proc = subprocess.run(
        [sys.executable, str(VALIDATOR_PATH), table, "-"],
        input=json.dumps(payload),
        capture_output=True,
        text=True,
        check=False,
    )
    # Validator prints JSON result to stdout regardless of exit code.
    try:
        return json.loads(proc.stdout)
    except json.JSONDecodeError:
        raise RuntimeError(
            f"Validator returned non-JSON output (exit {proc.returncode}):\n"
            f"stdout: {proc.stdout}\nstderr: {proc.stderr}"
        )


def validate_and_write(
    db_path: str | Path,
    table: str,
    payload: dict[str, Any],
) -> int:
    """Validate the payload, then INSERT into uimax `table`.

    Returns the new row's lastrowid. Raises ValidationError if the validator
    rejects (row 213 Rosetta Stone violation).
    """
    result = validate(table, payload)
    if not result["valid"]:
        raise ValidationError(result["errors"], result.get("warnings", []))

    db_path = Path(db_path)
    if not db_path.exists():
        raise FileNotFoundError(f"uimax DB not found: {db_path}")

    conn = sqlite3.connect(db_path)
    try:
        cols = list(payload.keys())
        # Serialise dict/list values to JSON for SQLite text storage.
        vals = [
            json.dumps(v) if isinstance(v, (dict, list)) else v
            for v in payload.values()
        ]
        placeholders = ",".join("?" * len(cols))
        sql = f"INSERT INTO {table} ({','.join(cols)}) VALUES ({placeholders})"
        cur = conn.execute(sql, vals)
        conn.commit()
        return cur.lastrowid
    finally:
        conn.close()


if __name__ == "__main__":
    # Smoke-test the validator-only path when run directly.
    import argparse

    parser = argparse.ArgumentParser(description="Validate a uimax payload.")
    parser.add_argument("table", help="uimax table name")
    parser.add_argument("payload_json", help="JSON payload as string")
    args = parser.parse_args()

    payload = json.loads(args.payload_json)
    result = validate(args.table, payload)
    print(json.dumps(result, indent=2))
    sys.exit(0 if result["valid"] else 1)
