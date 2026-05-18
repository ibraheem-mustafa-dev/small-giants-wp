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

# Hard Rule 1 (blub.db row 211) -- forbidden licensing keywords.
# Scanned case-insensitively as substrings in all string values and column names.
FORBIDDEN_KEYWORDS = frozenset(
    {
        "license",
        "licence",
        "licensing",
        "licensed",
        "provenance_license",
        "provenance license",
        "ip-firewall",
        "ip firewall",
        "redistribution",
        "redistribute",
        "promotion_path",
        "promotion path",
        "copyright",
        "intellectual property",
        "trademark",
        "patent",
    }
)

# Benign allowlist -- tokens that contain a forbidden keyword but are not licensing
# violations in context. Defaults to empty; extend only with explicit justification.
LICENSING_ALLOWLIST = frozenset({
    "license-free",
})


def check_licensing_keywords(
    payload: dict[str, Any], path_prefix: str = "payload"
) -> tuple[list[str], list[str]]:
    """Hard Rule 1 enforcement: reject payloads containing licensing keywords.

    Scans recursively through all string values and column names (keys).
    Returns (errors, warnings). Warnings are logged for allowlisted matches.
    """
    errors: list[str] = []
    warnings: list[str] = []

    def scan_value(value: Any, current_path: str) -> None:
        """Recursively scan value for forbidden keywords."""
        if isinstance(value, str):
            lower_val = value.lower()
            for keyword in FORBIDDEN_KEYWORDS:
                if keyword in lower_val:
                    # Check allowlist first
                    is_allowed = False
                    for allowed in LICENSING_ALLOWLIST:
                        if allowed in lower_val:
                            is_allowed = True
                            warnings.append(
                                f"Licensing keyword '{keyword}' found at '{current_path}' but matches allowlist entry '{allowed}' — passing."
                            )
                            break
                    if not is_allowed:
                        errors.append(
                            f"Licensing keyword '{keyword}' detected at path '{current_path}' in uimax write payload. "
                            "Hard Rule 1 (blub.db row 211) — uimax payloads must use source taxonomy 'idea' / 'draft' / '<URL>' only. "
                            "Strip the licensing reference and resubmit."
                        )
                        return
        elif isinstance(value, dict):
            for key, val in value.items():
                # Scan the key (column name) for forbidden keywords
                lower_key = key.lower()
                for keyword in FORBIDDEN_KEYWORDS:
                    if keyword in lower_key:
                        errors.append(
                            f"Licensing keyword '{keyword}' detected in column name '{key}' at path '{current_path}'. "
                            "Hard Rule 1 (blub.db row 211) — rename the column and resubmit."
                        )
                        return
                # Recursively scan the value
                scan_value(val, f"{current_path}.{key}")
        elif isinstance(value, list):
            for idx, item in enumerate(value):
                scan_value(item, f"{current_path}[{idx}]")

    scan_value(payload, "payload")
    return errors, warnings


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
                f"row-213 violation: 'sgs_block' is an empty string. Use null + gap_candidate=true "
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

    # Check licensing keywords first (Hard Rule 1)
    licensing_errors, licensing_warnings = check_licensing_keywords(payload)
    errors.extend(licensing_errors)
    warnings.extend(licensing_warnings)

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
    try:
        payload = json.loads(argv[2])
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
