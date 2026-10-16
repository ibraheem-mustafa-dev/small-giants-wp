#!/usr/bin/env python3
"""check-motion-item-parts.py -- a block that repeats items names its repeated-item motion parts "Each ..." and lists them first.

THE RULE (Spec 38A FR-38A-8, Bean 2026-10-16): a repeated item that has no inspector of its own (a trust-bar badge, a
brand-strip tile, a pricing plan, a process step, a nav item) is revealed through a part of its parent's Target picker. The
picker's first option is always "Whole block" (the block root). The part that is one repeated item (icon and text together)
is labelled "Each ..." ("Each badge (icon and text)"), so it cannot be mistaken for the root, and it sorts before every other
part of the block, so a reveal never leaves the text behind while the image moves. The finer parts say what they leave out
("Icon circle only"). A block may have several kinds of repeated item (the nav bar has top-level items, dropdown items and mega
panel columns); each is an "Each ..." part and all of them sort before the rest.

CORPUS (derived, never listed): the SGS blocks on disk that
  - keep repeated items as array data (rows in the framework DB table `array_item_schema`), or
  - call the server stagger (`Sgs_Motion_Loop_Delays::` in a file of the block's own folder, or an `item_array( 'sgs/<slug>'`
    call in includes/).
The DB can be wider than the tree, so a block with no block.json folder is skipped.

FINDINGS (per block, from `supports.sgs.elements`; wrapper parts and `motion: false` parts never reach the picker, so are
ignored):
  no-item-part      no part is labelled "Each ..."
  item-not-first    a part that is not "Each ..." sorts at or before the last "Each ..." part (the picker sorts by `order`)
  stale-gap         a GAPS block is no longer in the corpus, or now passes

GAPS lists corpus blocks whose items have NO motion part at all, so there is nothing to name: the fact is recorded, and the
entry is deleted the day the block gets an item part. It only tightens.

Usage:
    python scripts/check-motion-item-parts.py --survey         one line per corpus block
    python scripts/check-motion-item-parts.py --fix            print the diff the fix would make (nothing written)
    python scripts/check-motion-item-parts.py --fix --apply    write the renames
    python scripts/check-motion-item-parts.py --check          exit 1 on any finding
    python scripts/check-motion-item-parts.py --self-test      exit 1 when the detector itself is wrong
"""
from __future__ import annotations

import argparse
import difflib
import json
import os
import re
import sqlite3
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent
BLOCKS_DIR = ROOT / "src" / "blocks"
EACH = "Each "
ITEM_ARRAY_CALL = re.compile(r"Sgs_Motion_Loop_Delays::item_array\(\s*'(sgs/[a-z0-9-]+)'")

# Corpus blocks with no motion part for one item. Each reason is a fact read from the block's own parts.
GAPS: dict[str, str] = {}

# The repeated-item parts --fix names, per block, and the label each takes (None keeps the old label, "Whole " becoming
# "Each "). Used to bring the existing blocks to the rule; the check never reads it.
ITEM_PARTS = {
    "sgs/trust-bar": {"item": None},
    "sgs/brand-strip": {"tile": None, "item": "Each logo tile (the whole tile when names are off)"},
    "sgs/card-grid": {"item": None},
    "sgs/gallery": {"item": None},
    "sgs/icon-list": {"item": None},
    "sgs/pricing-table": {"plan-card": None},
    "sgs/process-steps": {"step": None},
    "sgs/google-reviews": {"review": None},
    "sgs/timeline": {"entry": None},
    "sgs/post-grid": {"card": None},
    "sgs/option-picker": {"pill": "Each option (chip, label and sub-label)"},
    "sgs/product-card": {"swatch": "Each colour swatch"},
    "sgs/nav-drawer-menu": {"item": "Each nav item (resting)"},
    "sgs/nav-bar-menu": {"item": "Each nav item (resting)", "subitem": "Each dropdown item", "mega-item": "Each mega panel column"},
}


def db_path() -> Path:
    env = os.environ.get("SGS_FRAMEWORK_DB")
    if env:
        return Path(env)
    for root in (".claude", ".agents"):
        candidate = Path.home() / root / "skills" / "sgs-wp-engine" / "sgs-framework.db"
        if candidate.exists():
            return candidate
    return Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"


def corpus() -> list[str]:
    """SGS block slugs on disk that repeat items (array data or the server stagger)."""
    slugs: set[str] = set()
    path = db_path()
    if not path.exists():
        raise SystemExit(f"[check-motion-item-parts] framework DB not found: {path}")
    con = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
    try:
        slugs.update(r[0] for r in con.execute("SELECT DISTINCT block_slug FROM array_item_schema WHERE block_slug LIKE 'sgs/%'"))
    finally:
        con.close()
    for folder in BLOCKS_DIR.iterdir():
        if not (folder / "block.json").exists():
            continue
        for php in folder.glob("*.php"):
            if "Sgs_Motion_Loop_Delays::" in php.read_text(encoding="utf-8", errors="replace"):
                slugs.add(f"sgs/{folder.name}")
                break
    # A shared helper under includes/ can make the server stagger call for a block (the nav bar's motion model).
    for php in (ROOT / "includes").glob("*.php"):
        slugs.update(ITEM_ARRAY_CALL.findall(php.read_text(encoding="utf-8", errors="replace")))
    return sorted(s for s in slugs if (BLOCKS_DIR / s.split("/", 1)[1] / "block.json").exists())


def elements_of(slug: str) -> dict[str, dict]:
    data = json.loads((BLOCKS_DIR / slug.split("/", 1)[1] / "block.json").read_text(encoding="utf-8"))
    return (data.get("supports", {}).get("sgs", {}) or {}).get("elements", {}) or {}


def picker_parts(elements: dict[str, dict]) -> list[tuple[str, str, float]]:
    """(key, label, order) of every part the Target picker can list: no wrapper, no `motion: false`."""
    parts = []
    for index, (key, spec) in enumerate(elements.items()):
        if spec.get("isWrapper") or spec.get("motion") is False:
            continue
        order = spec.get("order")
        parts.append((key, str(spec.get("label", "")), order if isinstance(order, (int, float)) else index + 1))
    return parts


def evaluate(elements: dict[str, dict]) -> list[str]:
    """Findings for one block's elements. Pure, so the self-test can feed it fixtures."""
    parts = picker_parts(elements)
    items = [p for p in parts if p[1].startswith(EACH)]
    if not items:
        return ["no-item-part"]
    last_item = max(p[2] for p in items)
    if any(p[2] <= last_item for p in parts if not p[1].startswith(EACH)):
        return ["item-not-first"]
    return []


def survey() -> tuple[list[tuple[str, list[str], str]], list[str]]:
    rows = []
    for slug in corpus():
        rows.append((slug, evaluate(elements_of(slug)), GAPS.get(slug, "")))
    in_corpus = {r[0]: r for r in rows}
    stale = [slug for slug in GAPS if slug not in in_corpus or not in_corpus[slug][1]]
    return rows, stale


def report(rows, stale) -> list[str]:
    problems = []
    for slug, findings, gap in rows:
        if findings and not gap:
            problems.extend(f"{slug}: {f}" for f in findings)
    problems.extend(f"{slug}: stale-gap" for slug in stale)
    return problems


def new_label(old: str) -> str:
    if old.startswith(EACH):
        return old
    if old.startswith("Whole "):
        return EACH + old[len("Whole "):]
    base = re.sub(r"\s*\([^)]*\)\s*$", "", old).strip()
    return EACH + base[:1].lower() + base[1:]


def object_span(text: str, start: int) -> int:
    """Index just past the object whose opening brace is at `start`."""
    depth = 0
    in_string = False
    i = start
    while i < len(text):
        c = text[i]
        if in_string:
            if c == "\\":
                i += 1
            elif c == '"':
                in_string = False
        elif c == '"':
            in_string = True
        elif c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                return i + 1
        i += 1
    raise ValueError("unbalanced braces")


def set_part(text: str, slug: str, key: str, label: str, order: float | int) -> str:
    """`text` with the part `key` given `label` and `order`; every other byte unchanged."""
    anchor = text.index('"elements"')
    key_at = text.index(f'"{key}": {{', anchor)
    open_at = text.index("{", key_at)
    end = object_span(text, open_at)
    chunk = text[open_at:end]
    label_match = re.search(r'"label":\s*"([^"]*)"', chunk)
    order_match = re.search(r'"order":\s*(\d+(?:\.\d+)?)', chunk)
    if not label_match or not order_match:
        raise SystemExit(f"[check-motion-item-parts] {slug}: part {key} has no label or order to rewrite")
    chunk = chunk.replace(label_match.group(0), f'"label": "{label}"', 1)
    chunk = chunk.replace(order_match.group(0), f'"order": {order:g}', 1)
    return text[:open_at] + chunk + text[end:]


def rewrite(slug: str) -> tuple[str, str]:
    """(old text, new text) of block.json with the block's item parts named "Each ..." and sorted first."""
    path = BLOCKS_DIR / slug.split("/", 1)[1] / "block.json"
    text = path.read_text(encoding="utf-8")
    els = elements_of(slug)
    keys = list(ITEM_PARTS[slug])
    others = [p[2] for p in picker_parts(els) if p[0] not in keys]
    base = min(others)
    n = len(keys)
    new = text
    for k, key in enumerate(keys, 1):
        label = ITEM_PARTS[slug][key] or new_label(str(els[key].get("label", key)))
        current = els[key].get("order")
        if isinstance(current, (int, float)) and all(isinstance(els[x].get("order"), (int, float)) and els[x]["order"] < base for x in keys):
            order = current  # already ahead of every other part: keep the author's order
        else:
            order = max(1, int(base) - 1) if n == 1 else round(base - 1 + 0.1 * k, 1)
        new = set_part(new, slug, key, label, order)
    # The rewrite may change only the item parts' label and order.
    before, after = json.loads(text), json.loads(new)
    for part, spec in before["supports"]["sgs"]["elements"].items():
        got = after["supports"]["sgs"]["elements"][part]
        if part in keys:
            spec = {k: v for k, v in spec.items() if k not in ("label", "order")}
            got = {k: v for k, v in got.items() if k not in ("label", "order")}
        if spec != got:
            raise SystemExit(f"[check-motion-item-parts] {slug}: the rewrite changed more than label and order of {keys}")
    return text, new


def fix(apply: bool) -> int:
    rows, _ = survey()
    todo = [slug for slug, findings, gap in rows if findings and not gap and slug in ITEM_PARTS]
    # A block that already has "Whole ..." labels is also brought to the "Each ..." wording.
    for slug in ITEM_PARTS:
        if slug not in todo and any(p[1].startswith("Whole ") for p in picker_parts(elements_of(slug))):
            todo.append(slug)
    if not todo:
        print("[check-motion-item-parts] nothing to fix")
        return 0
    for slug in sorted(todo):
        old, new = rewrite(slug)
        path = BLOCKS_DIR / slug.split("/", 1)[1] / "block.json"
        sys.stdout.writelines(difflib.unified_diff(old.splitlines(True), new.splitlines(True), f"a/{path.name}", f"b/{slug}", n=1))
        if apply:
            tmp = path.with_suffix(".json.tmp")
            tmp.write_text(new, encoding="utf-8", newline="")
            os.replace(tmp, path)
    print(f"[check-motion-item-parts] {'applied' if apply else 'dry run'}: {len(todo)} block(s)")
    return 0


def self_test() -> int:
    failures = []

    def need(name, ok):
        if not ok:
            failures.append(name)

    good = {"wrapper": {"isWrapper": True, "label": "W", "order": 1}, "item": {"label": "Each badge", "order": 2}, "label": {"label": "Text only", "order": 3}}
    need("passes when the item part is first", evaluate(good) == [])
    need("no item part", evaluate({"item": {"label": "Badge", "order": 2}}) == ["no-item-part"])
    need("item part buried", evaluate({"title": {"label": "Title", "order": 2}, "item": {"label": "Each card", "order": 4}}) == ["item-not-first"])
    need("a tie is not first", evaluate({"title": {"label": "Title", "order": 2}, "item": {"label": "Each card", "order": 2}}) == ["item-not-first"])
    need("a wrapper never counts", evaluate({"w": {"isWrapper": True, "label": "Each wrapper", "order": 1}, "x": {"label": "X", "order": 2}}) == ["no-item-part"])
    need("a wrapper never blocks", evaluate({"w": {"isWrapper": True, "label": "W", "order": 5}, "a": {"label": "Each a", "order": 2}, "b": {"label": "B", "order": 3}}) == [])
    need("several item kinds, all first", evaluate({"a": {"label": "Each a", "order": 1.1}, "b": {"label": "Each b", "order": 1.2}, "c": {"label": "C", "order": 2}}) == [])
    need("an item kind behind another part", evaluate({"a": {"label": "Each a", "order": 1.1}, "c": {"label": "C", "order": 2}, "b": {"label": "Each b", "order": 3}}) == ["item-not-first"])
    need("a motion:false part never counts as the item part", evaluate({"a": {"label": "Each a", "order": 2, "motion": False}, "b": {"label": "B", "order": 3}}) == ["no-item-part"])
    need("a motion:false part never blocks the item part", evaluate({"a": {"label": "Each a", "order": 3}, "b": {"label": "B", "order": 2, "motion": False}}) == [])
    need("includes/ callers match the corpus pattern", ITEM_ARRAY_CALL.findall("Sgs_Motion_Loop_Delays::item_array( 'sgs/nav-bar-menu', $uid") == ["sgs/nav-bar-menu"])
    need("missing order falls back to position", evaluate({"a": {"label": "Each a"}, "b": {"label": "B"}}) == [])
    need("label wording", new_label("Plan card (repeater item)") == "Each plan card" and new_label("Whole card") == "Each card" and new_label("Each card") == "Each card")
    need("every ITEM_PARTS block exists", all((BLOCKS_DIR / s.split("/", 1)[1] / "block.json").exists() for s in ITEM_PARTS))
    need("every GAPS entry has a reason", all(GAPS.values()))
    print(json.dumps({"selfTest": True, "failures": failures}))
    return 1 if failures else 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--survey", action="store_true")
    parser.add_argument("--fix", action="store_true")
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        return self_test()
    if args.fix:
        return fix(args.apply)
    rows, stale = survey()
    if args.survey:
        for slug, findings, gap in rows:
            status = "ok" if not findings else ("gap: " + gap if gap else ",".join(findings))
            print(f"{slug:28} {status}")
        for slug in stale:
            print(f"{slug:28} stale-gap")
        print(f"corpus={len(rows)} failing={sum(1 for r in rows if r[1] and not r[2])} gaps={sum(1 for r in rows if r[1] and r[2])} stale={len(stale)}")
        return 0
    problems = report(rows, stale)
    if problems:
        print("[check-motion-item-parts] FAIL:")
        for p in problems:
            print("  " + p)
        return 1
    print(f"[check-motion-item-parts] OK -- {len(rows)} item-repeating block(s): item parts named \"Each ...\" and listed first (or recorded as a gap)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
