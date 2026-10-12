#!/usr/bin/env python3
"""generate-motion-editor-defs.py -- writes src/components/motion/generated-motion-defs.json.

The editor's field types (src/components/motion/field-types.js) and atoms need only two parts of
`schemas/motion.schema.json`: the `$defs` (field types, value shapes, device sets) and `x-sgs-tokens` (the token bands
the duration and distance atoms label their presets from). Importing the whole schema would put the channel map, the
refusal texts and the effect tables in the editor bundle for nothing, so this generator copies those two keys into a
compact file. Annotation text (string-valued `description` keys) is dropped because no editor code reads it. The PHP
side keeps reading the full schema.

The output has no timestamp, keeps the schema's key order (field type order is meaningful) and uses fixed separators,
so a second run writes identical bytes.

Usage:
    python scripts/generate-motion-editor-defs.py              write the generated file
    python scripts/generate-motion-editor-defs.py --check      diff in memory, never write; exit 1 when stale
    python scripts/generate-motion-editor-defs.py --self-test  plant a stale file, a missing key and a dropped def
"""
from __future__ import annotations

import argparse
import json
import sys
import tempfile
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

PLUGIN = Path(__file__).resolve().parent.parent
SCHEMA_FILE = PLUGIN / "schemas" / "motion.schema.json"
OUTPUT_FILE = PLUGIN / "src" / "components" / "motion" / "generated-motion-defs.json"
KEPT_KEYS = ("$defs", "x-sgs-tokens")
# What the editor reads by name; the build refuses an extract that lacks one.
REQUIRED_DEFS = ("tokenReference", "duration", "easing", "distance", "angle", "ratio", "scale", "percentage",
                 "opacity", "colourReference", "partReference", "assetReference", "choice", "boolean", "propertyRow")


def strip_annotations(node):
    """The node with every string-valued `description` removed (an object-valued `description` is a property)."""
    if isinstance(node, dict):
        return {k: strip_annotations(v) for k, v in node.items() if not (k == "description" and isinstance(v, str))}
    if isinstance(node, list):
        return [strip_annotations(v) for v in node]
    return node


def render(schema: dict) -> str:
    """The extract's text; raises ValueError when the schema lacks a kept key or a def the editor reads."""
    missing = [k for k in KEPT_KEYS if k not in schema]
    if missing:
        raise ValueError(f"schema lacks {', '.join(missing)}")
    lacking = [d for d in REQUIRED_DEFS if d not in schema["$defs"]]
    if lacking:
        raise ValueError(f"schema $defs lacks {', '.join(lacking)}")
    extract = {k: strip_annotations(schema[k]) for k in KEPT_KEYS}
    return json.dumps(extract, separators=(",", ":"), ensure_ascii=False) + "\n"


def check(schema_file: Path, output_file: Path) -> int:
    try:
        text = render(json.loads(schema_file.read_text(encoding="utf-8")))
    except (OSError, ValueError) as error:
        print(f"[generate-motion-editor-defs] ERROR: {error}", file=sys.stderr)
        return 1
    if not output_file.exists() or output_file.read_text(encoding="utf-8") != text:
        print(f"[generate-motion-editor-defs] STALE: {output_file} no longer matches {schema_file.name}. "
              "Run without --check and commit the result.", file=sys.stderr)
        return 1
    print(f"[generate-motion-editor-defs] OK: {output_file.name} matches {schema_file.name} ({len(text.encode('utf-8'))} bytes).")
    return 0


def self_test() -> int:
    schema = json.loads(SCHEMA_FILE.read_text(encoding="utf-8"))
    failures: list[str] = []
    with tempfile.TemporaryDirectory() as tmp:
        folder = Path(tmp)
        schema_file, output_file = folder / "schema.json", folder / "defs.json"
        schema_file.write_text(json.dumps(schema), encoding="utf-8")
        output_file.write_text(render(schema), encoding="utf-8")
        if check(schema_file, output_file) != 0:
            failures.append("a fresh extract was reported stale")
        output_file.write_text(render(schema) + " ", encoding="utf-8")
        if check(schema_file, output_file) != 1:
            failures.append("a hand-edited extract was not reported stale")
        output_file.write_text(render(schema), encoding="utf-8")
        schema["$defs"]["duration"]["maximum"] = 1
        schema_file.write_text(json.dumps(schema), encoding="utf-8")
        if check(schema_file, output_file) != 1:
            failures.append("a changed $def was not reported stale")
        del schema["$defs"]["easing"]
        schema_file.write_text(json.dumps(schema), encoding="utf-8")
        if check(schema_file, output_file) != 1:
            failures.append("a removed required $def was not refused")
        del schema["x-sgs-tokens"]
        schema_file.write_text(json.dumps(schema), encoding="utf-8")
        if check(schema_file, output_file) != 1:
            failures.append("a removed x-sgs-tokens key was not refused")
    for failure in failures:
        print(f"self-test: WRONG: {failure}")
    print(f"self-test: {'FAIL' if failures else 'OK'} (5 cases)")
    return 1 if failures else 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--check", action="store_true", help="Compare in memory with the committed file; never write.")
    group.add_argument("--self-test", action="store_true", help="Plant stale and broken inputs; each must be caught.")
    args = parser.parse_args()
    if args.self_test:
        return self_test()
    if args.check:
        return check(SCHEMA_FILE, OUTPUT_FILE)
    text = render(json.loads(SCHEMA_FILE.read_text(encoding="utf-8")))
    OUTPUT_FILE.write_text(text, encoding="utf-8", newline="\n")
    print(f"[generate-motion-editor-defs] Generated {OUTPUT_FILE} ({len(text.encode('utf-8'))} bytes).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
