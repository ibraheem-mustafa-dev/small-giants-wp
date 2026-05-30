#!/usr/bin/env python3
"""Pre-write validator for uimax tables.

Enforces the Rosetta Stone discipline (blub.db row 213): every artefact-table
row MUST carry equivalent_implementations.sgs_block populated with a slug
string OR explicit null combined with gap_candidate=true.

Also enforces Hard Rule 1 (blub.db row 211): no licensing keywords in payloads.

CLI contract (called by uimax_write.py via subprocess):

    python uimax-write-validator.py <table> <payload_json>

Always emits a JSON object on stdout:

    {"valid": bool, "errors": [str], "warnings": [str]}

Exit 0 when valid, 1 when rejected. uimax_write.py reads stdout regardless of exit
code so the contract is the JSON shape, not the exit code.
"""

from __future__ import annotations

import json
import sys
from typing import Any

# Row 213 -- these tables hold design-artefact rows that must carry the Rosetta
# Stone mapping. Other tables (e.g. design_tokens, raw lookups) are exempt.
ARTEFACT_TABLES = frozenset(
    {
        "patterns",
        "components",
        "animations",
        "naming_conventions",
        "component_libraries",
    }
)

# Licensing infrastructure intentionally NOT present.
#
# This validator does NOT check for licensing keywords. Bean's binding rule
# (feedback_no_licensing_talk_in_cloning_context.md): the cloning domain has no
# licensing concept. Web designs and component patterns aren't licenseable in
# the way an IP-defence gate would imply. The whole source taxonomy is `idea` /
# `draft` / `<URL>` — there is no licence/copyright column to validate against.
#
# A previous incarnation of this validator scanned payloads for forbidden tokens
# (`license`, `copyright`, etc.). That gate was deliberately stripped on
# 2026-05-14 (decisions.md Phase 6 v2 Step 5, sub-decision (b) — "IP-defence
# framing removed at the root"). Wave 2b on 2026-05-21 mis-implemented the gate
# AGAIN from stale SKILL.md text; reverted same session. This comment is the
# tombstone — re-implementing licensing scans here is a regression.
#
# The Rosetta Stone gate (row 213 — every artefact carries
# equivalent_implementations.sgs_block) is the real engineering invariant.
# That stays.


def check_rosetta_stone(table: str, payload: dict[str, Any]) -> tuple[list[str], list[str]]:
    """Row 213 enforcement for artefact tables.

    Returns (errors, warnings). Validation rules:
    - equivalent_implementations must be present and a dict (or a JSON-encoded
      string that decodes to a dict).
    - equivalent_implementations.sgs_block must be either a non-empty slug string
      OR explicit None combined with payload.gap_candidate=true.
    - Slug strings without a '/' produce a warning (likely typo) but pass.
    """
    if table not in ARTEFACT_TABLES:
        return [], []

    errors: list[str] = []
    warnings: list[str] = []

    ei = payload.get("equivalent_implementations")

    # Allow JSON-encoded string (some callers serialise the dict before passing it).
    if isinstance(ei, str):
        try:
            ei = json.loads(ei)
        except json.JSONDecodeError:
            errors.append(
                f"row-213 violation: '{table}.equivalent_implementations' is a string "
                "but not valid JSON"
            )
            return errors, warnings

    if not isinstance(ei, dict):
        errors.append(
            f"row-213 violation: '{table}' rows must include 'equivalent_implementations' as a dict "
            "(Rosetta Stone discipline)"
        )
        return errors, warnings

    if "sgs_block" not in ei:
        errors.append(
            f"row-213 violation: '{table}.equivalent_implementations' missing 'sgs_block' key. "
            "Set to an SGS slug (e.g. 'sgs/hero') OR explicit null + payload.gap_candidate=true."
        )
        return errors, warnings

    sgs = ei["sgs_block"]

    if sgs is None:
        if not payload.get("gap_candidate"):
            errors.append(
                f"row-213 violation: '{table}' row has null 'sgs_block' but is not flagged "
                "gap_candidate=true. Flag the gap or supply an SGS slug."
            )
        return errors, warnings

    if isinstance(sgs, str):
        stripped = sgs.strip()
        if not stripped:
            errors.append(
                "row-213 violation: 'sgs_block' is an empty string. Use null + gap_candidate=true "
                "to flag a gap, or supply a real slug."
            )
        elif "/" not in stripped:
            warnings.append(
                f"row-213 warning: 'sgs_block' value '{sgs}' does not look like a block slug "
                "(expected 'sgs/<name>')"
            )
        return errors, warnings

    errors.append(
        f"row-213 violation: 'sgs_block' must be a non-empty slug string or explicit null, "
        f"got {type(sgs).__name__}"
    )
    return errors, warnings


def validate(table: str, payload: dict[str, Any]) -> dict[str, Any]:
    errors: list[str] = []
    warnings: list[str] = []

    # Licensing-keyword scanning intentionally NOT performed. See top-of-file
    # tombstone for context (decisions.md 2026-05-14 sub-decision (b) +
    # feedback_no_licensing_talk_in_cloning_context.md). The cloning domain has
    # no licensing concept; an IP-defence gate would be theatre, not engineering.

    # Check Rosetta Stone discipline (Row 213)
    rosetta_errors, rosetta_warnings = check_rosetta_stone(table, payload)
    errors.extend(rosetta_errors)
    warnings.extend(rosetta_warnings)

    return {"valid": len(errors) == 0, "errors": errors, "warnings": warnings}


def main(argv: list[str]) -> int:
    if len(argv) < 3:
        result = {
            "valid": False,
            "errors": ["Usage: uimax-write-validator.py <table> <payload_json>"],
            "warnings": [],
        }
        print(json.dumps(result))
        return 1

    table = argv[1]
    # Payload via stdin when arg is '-': avoids Windows' 32,767-char command-line
    # limit (WinError 206), which large pattern payloads (embedded markup/CSS) hit
    # when passed as an argv string.
    payload_raw = sys.stdin.read() if argv[2] == "-" else argv[2]
    try:
        payload = json.loads(payload_raw)
    except json.JSONDecodeError as exc:
        print(json.dumps({"valid": False, "errors": [f"Invalid JSON payload: {exc}"], "warnings": []}))
        return 1

    if not isinstance(payload, dict):
        print(json.dumps({"valid": False, "errors": ["Payload must be a JSON object"], "warnings": []}))
        return 1

    result = validate(table, payload)
    print(json.dumps(result))
    return 0 if result["valid"] else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
