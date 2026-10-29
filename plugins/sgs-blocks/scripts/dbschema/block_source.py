"""What a block's own source declares that block.json does not: allowed values and item fields.

The seeder (sgs-update-v2.py, Stage 1) asks this module for two things per block, nothing is added to block.json:

* ``choices``: a setting's allowed values, read from the editor source (``block-source-choices.js``: SelectControl,
  RadioControl and ToggleGroupControl option lists, parsed as code with @babel/parser) and from the PHP allow-lists
  (``block-source-php.php``: PHP's tokenizer). A list built at run time, or PHP allow-lists that disagree, is a named
  gap, never a guess.
* ``item_fields``: an array setting's item field keys, from its default value's item shape and from the keys render.php
  reads from each item.

Self-test: python scripts/dbschema/block_source.py --self-test
"""
from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any

HERE = Path(__file__).resolve().parent
PLUGIN_DIR = HERE.parent.parent
CHOICES_JS = HERE / "block-source-choices.js"
SOURCE_PHP = HERE / "block-source-php.php"


class BlockSourceError(RuntimeError):
    """A reader could not run: the seed stops rather than writing a half-read database."""


def _run(cmd: list[str], cwd: Path) -> Any:
    try:
        # Popen, not subprocess.run: both readers only read source files and write nothing, so the seeder's --db guard
        # (which skips scripts that do not name the database) must not stand in for them.
        with subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, encoding="utf-8", cwd=str(cwd)) as proc:
            out, err = proc.communicate(timeout=300)
        done = subprocess.CompletedProcess(cmd, proc.returncode, out, err)
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise BlockSourceError(f"{cmd[0]} could not run: {exc}") from exc
    if done.returncode != 0:
        raise BlockSourceError(f"{' '.join(cmd[:2])} exited {done.returncode}: {done.stderr[-400:]}")
    try:
        return json.loads(done.stdout)
    except json.JSONDecodeError as exc:
        raise BlockSourceError(f"{cmd[0]} printed no JSON for {cmd}: {done.stdout[:200]!r} {done.stderr[-300:]}") from exc


class BlockSource:
    def __init__(self, js: dict, php: dict):
        self.js = js
        self.php = php

    @classmethod
    def read(cls, plugin_dir: Path = PLUGIN_DIR) -> "BlockSource":
        js = _run(["node", str(CHOICES_JS), str(plugin_dir / "src" / "blocks")], plugin_dir)
        php = _run(["php", str(SOURCE_PHP), str(plugin_dir)], plugin_dir)
        return cls(js, php)

    def choices(self, folder: str, attr: str, attr_def: dict) -> tuple[list | None, str | None, list[str]]:
        """(values, gap, files). values is the union of the editor list, the PHP allow-list and the default;
        gap names why a list the source declares could not be read; both None when the source declares none."""
        if attr_def.get("type", "string") != "string":
            return None, None, []
        js = self.js.get(folder, {}).get(attr)
        php = self.php.get(folder, {}).get("choices", {}).get(attr)
        values: list = []
        gaps: list[str] = []
        files: list[str] = []
        for found in (js, php):
            if not found:
                continue
            files += found.get("files", [])
            if "gap" in found:
                gaps.append(found["gap"])
            else:
                values += [v for v in found["values"] if v not in values]
        if php and "values" in php:
            default = attr_def.get("default")
            if isinstance(default, str) and default not in values:
                values.append(default)
        if values and all(isinstance(v, str) for v in values) and not (js and "gap" in js):
            return values, None, sorted(set(files))
        if gaps or (js and "gap" in js):
            return None, "; ".join(gaps) or "unreadable", sorted(set(files))
        return None, None, []

    def item_fields(self, folder: str, attr: str, attr_def: dict) -> list[str]:
        """The item keys of an array setting that declares no ``items.properties``: the default value's item shape first, then
        the keys render.php reads."""
        fields: list[str] = []
        default = attr_def.get("default")
        for item in default if isinstance(default, list) else []:
            if isinstance(item, dict):
                fields += [k for k in item if k not in fields]
        read = self.php.get(folder, {}).get("items", {}).get(attr, {}).get("fields", [])
        fields += [k for k in read if k not in fields]
        return fields


def _self_test() -> int:
    fails = 0

    def check(label: str, ok: bool) -> None:
        nonlocal fails
        print(("PASS" if ok else "FAIL") + "  " + label)
        fails += 0 if ok else 1

    with tempfile.TemporaryDirectory(prefix="bsrc-") as tmp:
        plugin = Path(tmp)
        blocks = plugin / "src" / "blocks"
        demo = blocks / "demo"
        demo.mkdir(parents=True)
        (demo / "block.json").write_text(json.dumps({"name": "sgs/demo", "attributes": {
            "shape": {"type": "string", "default": "round"},
            "mode": {"type": "string", "default": "a"},
            "tone": {"type": "string", "default": "x"},
            "dyn": {"type": "string", "default": "p"},
            "rows": {"type": "array", "default": [{"title": "T", "date": "D"}]},
        }}), encoding="utf-8")
        (demo / "edit.js").write_text(
            "import { SelectControl, ToggleGroupControl, ToggleGroupControlOption } from '@wordpress/components';\n"
            "const SHAPES = [ { label: 'R', value: 'round' }, { label: 'S', value: 'square' } ];\n"
            "export default function Edit( { attributes, setAttributes } ) {\n"
            "  const { shape, mode, dyn } = attributes;\n"
            "  return ( <>\n"
            "    <SelectControl value={ shape } options={ SHAPES } onChange={ () => {} } />\n"
            "    <ToggleGroupControl value={ mode }><ToggleGroupControlOption value=\"a\" /><ToggleGroupControlOption value=\"b\" /></ToggleGroupControl>\n"
            "    <SelectControl value={ dyn } options={ buildOptions() } />\n"
            "  </> );\n}\n", encoding="utf-8")
        (demo / "render.php").write_text(
            "<?php\n$tone = $attributes['tone'] ?? 'x';\n$tone = in_array( $tone, array( 'y', 'z' ), true ) ? $tone : 'x';\n"
            "foreach ( $attributes['rows'] as $row ) { echo $row['title'], $row['image']; }\n", encoding="utf-8")
        src = BlockSource.read(plugin)
        defs = json.loads((demo / "block.json").read_text(encoding="utf-8"))["attributes"]
        check("select options constant is read as code", src.choices("demo", "shape", defs["shape"])[0] == ["round", "square"])
        check("toggle children are read", src.choices("demo", "mode", defs["mode"])[0] == ["a", "b"])
        check("PHP allow-list plus its default", src.choices("demo", "tone", defs["tone"])[0] == ["y", "z", "x"])
        values, gap, _ = src.choices("demo", "dyn", defs["dyn"])
        check("a list built by a call is a named gap, not values", values is None and gap is not None and "call" in gap)
        check("a setting the source never lists is neither", src.choices("demo", "rows", defs["rows"]) == (None, None, []))
        check("item fields: default shape then keys render.php reads", src.item_fields("demo", "rows", defs["rows"]) == ["title", "date", "image"])
        edited = (demo / "edit.js").read_text(encoding="utf-8").replace("value: 'square'", "value: 'oval'")
        (demo / "edit.js").write_text(edited, encoding="utf-8")
        check("negative control: an edited list changes the values", BlockSource.read(plugin).choices("demo", "shape", defs["shape"])[0] == ["round", "oval"])
    print(f"{'ALL PASS' if not fails else str(fails) + ' FAILED'}")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(_self_test() if "--self-test" in sys.argv else 0)
