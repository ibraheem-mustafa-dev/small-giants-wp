#!/usr/bin/env python3
"""validate-stage-artifact.py -- Spec 15 Phase 5b.2 per-stage validator.

Validates a /sgs-clone stage artefact against its declared schema in
`plugins/sgs-blocks/scripts/orchestrator/schemas/stage-<N>.json`.

Modelled on the pattern at `~/.claude/hooks/validate-pipeline-artifact.py`
but scoped to a single pipeline (/sgs-clone) with schemas externalised
as JSON files so each stage can evolve its contract independently.

Checks (in order):
  1. Artefact file exists + parses as JSON
  2. Schema for the stage exists
  3. Every `required_top_level` field is present in the artefact
  4. Every `field_types` entry has the correct Python type
  5. Every entry in `list_item_required` has its required keys
  6. Every entry in `dict_value_required` has its required keys
  7. Every entry in `dict_required_keys` has its required keys

Exit codes:
  0 -- valid; pipeline may proceed
  1 -- invalid; pipeline must halt (errors printed to stdout)
  2 -- usage / config error (missing file / unknown stage)

UK English in comments + output.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

HERE = Path(__file__).parent
SCHEMA_DIR = HERE / "schemas"

_TYPE_NAME_MAP: dict[str, type] = {
    "dict":  dict,
    "list":  list,
    "str":   str,
    "int":   int,
    "float": (int, float),  # tolerate ints as floats
    "bool":  bool,
}


def load_schema(stage: int) -> dict | None:
    path = SCHEMA_DIR / f"stage-{stage}.json"
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def validate(artefact: dict, schema: dict) -> list[str]:
    """Return a list of error strings; empty list = valid."""
    errors: list[str] = []

    # 1. required_top_level
    for field in schema.get("required_top_level", []):
        if field not in artefact:
            errors.append(f"missing required top-level field: {field!r}")

    # 2. field_types
    for field, type_name in schema.get("field_types", {}).items():
        if field not in artefact:
            continue
        expected = _TYPE_NAME_MAP.get(type_name)
        if expected is None:
            errors.append(f"schema error: unknown type {type_name!r} for {field!r}")
            continue
        if not isinstance(artefact[field], expected):
            errors.append(
                f"field {field!r} has type {type(artefact[field]).__name__}, "
                f"expected {type_name}"
            )

    # 3. list_item_required -- field is a list, every item must have these keys
    for field, required_keys in schema.get("list_item_required", {}).items():
        if not isinstance(artefact.get(field), list):
            continue
        for idx, item in enumerate(artefact[field]):
            if not isinstance(item, dict):
                errors.append(f"{field}[{idx}] not a dict; cannot enforce required keys")
                continue
            for key in required_keys:
                if key not in item:
                    errors.append(f"{field}[{idx}] missing required key: {key!r}")

    # 4. dict_value_required -- field is a dict, every VALUE must have these keys
    for field, required_keys in schema.get("dict_value_required", {}).items():
        if not isinstance(artefact.get(field), dict):
            continue
        for sub_key, value in artefact[field].items():
            if not isinstance(value, dict):
                errors.append(f"{field}[{sub_key}] not a dict; cannot enforce required keys")
                continue
            for required in required_keys:
                if required not in value:
                    errors.append(f"{field}[{sub_key}] missing required key: {required!r}")

    # 5. dict_required_keys -- field is a dict, must have these KEYS at top
    for field, required_keys in schema.get("dict_required_keys", {}).items():
        if not isinstance(artefact.get(field), dict):
            continue
        for required in required_keys:
            if required not in artefact[field]:
                errors.append(f"{field} missing required sub-key: {required!r}")

    return errors


def validate_path(artefact_path: Path, stage: int) -> tuple[bool, list[str]]:
    if not artefact_path.exists():
        return False, [f"artefact file not found: {artefact_path}"]
    try:
        artefact = json.loads(artefact_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        return False, [f"artefact is not valid JSON: {e}"]
    if not isinstance(artefact, dict):
        return False, [f"artefact must be a JSON object, got {type(artefact).__name__}"]

    schema = load_schema(stage)
    if schema is None:
        return False, [f"no schema declared for stage {stage}"]

    errors = validate(artefact, schema)
    return (not errors), errors


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n", 1)[0])
    parser.add_argument("artefact", type=Path, help="Path to the stage artefact JSON")
    parser.add_argument("--stage", type=int, required=True, help="Stage number (1-9)")
    args = parser.parse_args(argv)

    valid, errors = validate_path(args.artefact, args.stage)
    if valid:
        print(f"VALIDATE-STAGE-{args.stage}: PASS ({args.artefact})")
        return 0
    print(f"VALIDATE-STAGE-{args.stage}: FAIL ({args.artefact})")
    for err in errors:
        print(f"  ERROR  {err}")
    return 1


if __name__ == "__main__":
    sys.exit(main())
