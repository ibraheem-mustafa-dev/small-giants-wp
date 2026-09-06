#!/usr/bin/env python3
"""Migrate hand-authored `style.spacing` to the block-OWNED padding/margin attrs.

WHY THIS EXISTS (2026-08-21). D707/D555 moved `padding`/`margin` on four blocks off WP's
native `supports.spacing` and onto block-owned object attrs, because **a WP-native support
cannot carry a framework default** — which is why `sgs/container` had no horizontal gutter
and rendered flush to the viewport edge. The block.json half shipped. The ~57 hand-authored
`style.spacing` values across the theme's templates, parts and patterns did not.

They still RENDER today, via the wrapper's `style.spacing` read — but on the four migrated
blocks that read is now a legacy path, and the authorings sit on a native family the block no
longer declares. `check-dead-pattern-attrs.py` flags them (advisory, exit 0).

⛔ THE WRAPPER'S `style.spacing` READ IS **NOT** REMOVED BY THIS, AND MUST NOT BE. It is the
ACTIVE path for the **49** blocks that still declare `supports.spacing` — measured, not
assumed. Only **4** blocks dropped it (container, gallery, site-header-row, site-footer-row).
Deleting that read to "finish the migration" would silently kill padding on 49 blocks.

SCOPE, deliberately narrow:
  - only blocks whose block.json has NO `supports.spacing` AND declares its own `padding`
    or `margin` attr. The block's own schema is the gate, never a name list.
  - only the `padding` and `margin` keys. `blockGap` is NOT migrated: the shared wrapper has
    ZERO reads of it (grep it), so a `blockGap` authoring on these blocks is already dead and
    silently moving it to `gap` would change rendering under cover of a mechanical migration.
    It is REPORTED instead.

Usage:
    --survey            census, changes nothing
    --fix               show the diff, writes nothing
    --fix --apply       write it
    --check             CI gate: exit 1 if any un-migrated authoring remains
    --self-test         proves the parser and the refusals work
"""
from __future__ import annotations

import argparse
import io
import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
THEME = REPO / "theme" / "sgs-theme"
BLOCKS = REPO / "plugins" / "sgs-blocks" / "src" / "blocks"

# A block comment opening: `<!-- wp:sgs/container {...} -->` or self-closing `/-->`.
BLOCK_RE = re.compile(r"<!--\s+wp:(sgs/[a-z0-9-]+)\s+(\{)", re.S)

MIGRATE_KEYS = ("padding", "margin")


def owned_spacing_blocks() -> set[str]:
    """Blocks that dropped `supports.spacing` AND own a padding/margin attr.

    Read live from every block.json rather than hardcoded — the same DB-first/schema-first
    discipline the rest of this toolchain uses. A block that still declares supports.spacing
    is NOT a target: its authorings are correct as they stand.
    """
    out: set[str] = set()
    for bj in sorted(BLOCKS.glob("*/block.json")):
        try:
            d = json.loads(bj.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            continue
        name = d.get("name")
        if not name:
            continue
        supports = d.get("supports") or {}
        attrs = d.get("attributes") or {}
        if "spacing" in supports:
            continue
        if "padding" in attrs or "margin" in attrs:
            out.add(name)
    return out


def theme_files() -> list[Path]:
    files: list[Path] = []
    for sub in ("templates", "parts", "patterns"):
        d = THEME / sub
        if d.is_dir():
            files.extend(sorted(d.rglob("*.html")))
            files.extend(sorted(d.rglob("*.php")))
    return files


def scan(text: str, targets: set[str]):
    """Yield (start, end, block_name, attrs) for every target block comment.

    Uses json.JSONDecoder().raw_decode() from the `{` so nested objects parse correctly —
    a hand-rolled brace matcher breaks on the nested `spacing`/`padding` objects that are
    the whole point of this migration.
    """
    dec = json.JSONDecoder()
    for m in BLOCK_RE.finditer(text):
        name = m.group(1)
        if name not in targets:
            continue
        brace = m.start(2)
        try:
            attrs, length = dec.raw_decode(text[brace:])
        except ValueError:
            continue
        if not isinstance(attrs, dict):
            continue
        yield brace, brace + length, name, attrs


def plan_for(attrs: dict):
    """Return (new_attrs, moved_keys, blockgap_present) or None when nothing to do."""
    style = attrs.get("style")
    if not isinstance(style, dict):
        return None
    spacing = style.get("spacing")
    if not isinstance(spacing, dict):
        return None

    moved = [k for k in MIGRATE_KEYS if k in spacing]
    blockgap = "blockGap" in spacing
    if not moved:
        return None

    new = json.loads(json.dumps(attrs))          # deep copy, no aliasing
    nsp = new["style"]["spacing"]
    for k in moved:
        # Refuse rather than clobber: an existing owned attr is a real conflict.
        if k in new and new[k] not in (None, {}, ""):
            return ("CONFLICT", k)
        new[k] = nsp.pop(k)
    if not nsp:
        new["style"].pop("spacing")
    if not new["style"]:
        new.pop("style")
    return (new, moved, blockgap)


def process(write: bool, show: bool):
    targets = owned_spacing_blocks()
    total = conflicts = blockgaps = 0
    touched_files = 0
    for f in theme_files():
        text = io.open(f, encoding="utf-8", newline="").read()
        edits = []
        for start, end, name, attrs in scan(text, targets):
            res = plan_for(attrs)
            if res is None:
                continue
            if res[0] == "CONFLICT":
                conflicts += 1
                print(f"  [CONFLICT] {f.relative_to(REPO)} :: {name} already has an owned "
                      f"`{res[1]}` — refusing to overwrite; fix by hand")
                continue
            new_attrs, moved, blockgap = res
            if blockgap:
                blockgaps += 1
            edits.append((start, end, json.dumps(new_attrs, separators=(",", ":"),
                                                 ensure_ascii=False)))
            total += 1
            if show:
                print(f"  {f.relative_to(REPO)} :: {name} -> moved {', '.join(moved)}"
                      + ("  ⚠ blockGap left in place (wrapper never reads it)" if blockgap else ""))
        if edits and write:
            for start, end, replacement in reversed(edits):   # right-to-left keeps offsets valid
                text = text[:start] + replacement + text[end:]
            io.open(f, "w", encoding="utf-8", newline="").write(text)
            touched_files += 1
    return total, conflicts, blockgaps, touched_files


def self_test() -> int:
    """Prove the parser handles nesting, and that both refusals actually fire."""
    dec_ok = True
    sample = ('<!-- wp:sgs/container {"tagName":"div","style":{"spacing":{"padding":'
              '{"top":"1px","left":"2px"}}},"contentWidth":{"desktop":"normal"}} -->')
    got = list(scan(sample, {"sgs/container"}))
    if len(got) != 1:
        print("FAIL: nested-object parse found", len(got)); dec_ok = False
    else:
        _, _, _, attrs = got[0]
        res = plan_for(attrs)
        if res is None or res[0] == "CONFLICT":
            print("FAIL: plan_for returned", res); dec_ok = False
        else:
            new, moved, bg = res
            if moved != ["padding"] or "style" in new or new["padding"]["top"] != "1px":
                print("FAIL: bad migration result", new, moved); dec_ok = False

    # NEGATIVE 1 — a block that still declares supports.spacing must never be a target.
    if "sgs/button" in owned_spacing_blocks():
        print("FAIL: a supports.spacing block leaked into the target set"); dec_ok = False

    # NEGATIVE 2 — an existing owned key must produce a CONFLICT, not a silent overwrite.
    clash = {"padding": {"top": "9px"}, "style": {"spacing": {"padding": {"top": "1px"}}}}
    if plan_for(clash) != ("CONFLICT", "padding"):
        print("FAIL: conflict refusal did not fire"); dec_ok = False

    # NEGATIVE 3 — blockGap alone is not a migration target.
    if plan_for({"style": {"spacing": {"blockGap": "1px"}}}) is not None:
        print("FAIL: blockGap alone was treated as migratable"); dec_ok = False

    print("self-test:", "PASS (4 assertions)" if dec_ok else "FAIL")
    return 0 if dec_ok else 1


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--survey", action="store_true")
    p.add_argument("--fix", action="store_true")
    p.add_argument("--apply", action="store_true")
    p.add_argument("--check", action="store_true")
    p.add_argument("--self-test", action="store_true")
    a = p.parse_args()

    if a.self_test:
        return self_test()

    if a.survey or a.fix or a.check:
        show = a.survey or a.fix
        if show:
            print("[theme-native-spacing] targets:", ", ".join(sorted(owned_spacing_blocks())))
        total, conflicts, blockgaps, files = process(write=bool(a.fix and a.apply), show=show)
        verb = "MIGRATED" if (a.fix and a.apply) else "would migrate"
        print(f"[theme-native-spacing] {verb} {total} authoring(s)"
              + (f" across {files} file(s)" if files else "")
              + (f"; {conflicts} conflict(s)" if conflicts else "")
              + (f"; {blockgaps} blockGap authoring(s) LEFT (wrapper has no read — report only)"
                 if blockgaps else ""))
        if a.check:
            if total or conflicts:
                print("[theme-native-spacing] FAIL: un-migrated style.spacing authorings remain")
                return 1
            print("[theme-native-spacing] PASS: no style.spacing authorings on owned-spacing blocks")
        return 0

    p.print_help()
    return 0


if __name__ == "__main__":
    sys.exit(main())
