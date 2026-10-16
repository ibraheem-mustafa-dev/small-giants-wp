#!/usr/bin/env python3
"""check-motion-item-parts.py -- a block that repeats items names its whole-item motion part first.

THE RULE (Spec 38A FR-38A-8, Bean 2026-10-16): a repeated item that has no inspector of its own (a trust-bar badge, a
brand-strip tile, a pricing plan, a process step) is revealed through a part of its parent's Target picker. The whole item
(icon and text together) is the default target: its part is labelled "Whole ...", is the only part so labelled, and sorts
before every other part, so a reveal never leaves the text behind while the image moves. The finer parts say what they leave
out ("Icon circle only").

CORPUS (derived, never listed): the SGS blocks on disk that
  - keep repeated items as array data (rows in the framework DB table `array_item_schema`), or
  - call the server stagger (`Sgs_Motion_Loop_Delays::` in a file of the block's own folder).
The DB can be wider than the tree, so a block with no block.json folder is skipped.

FINDINGS (per block, from `supports.sgs.elements`, wrapper parts ignored):
  no-whole-part     no part is labelled "Whole ..."
  two-whole-parts   more than one part is labelled "Whole ..."
  whole-not-first   a part sorts at or before the "Whole ..." part (the picker sorts by `order`)
  stale-exemption   an EXEMPT block is no longer in the corpus, or now passes

EXEMPT is a register of reasons for corpus blocks whose items are not revealed units. It only tightens.

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
WHOLE = "Whole "
ITEM_ARRAY_CALL = re.compile(r"Sgs_Motion_Loop_Delays::item_array\(\s*'(sgs/[a-z0-9-]+)'")

# Corpus blocks whose items are not revealed units. Reason is mandatory.
EXEMPT = {
    "sgs/option-picker": "options are selectable pills inside a form control, not revealed items",
    "sgs/product-card": "pack sizes and colour swatches are controls inside one card, not revealed items",
    "sgs/choice-flow-question": "options belong to a question; the question is the unit",
    "sgs/form-field-tiles": "tiles are form inputs, not revealed items",
    "sgs/nav-drawer-menu": "nav items follow the navigation motion model (Spec 36)",
    "sgs/nav-bar-menu": "nav items follow the navigation motion model (Spec 36)",
}

# The part --fix renames, per block. Used once to bring the existing blocks to the rule; the check never reads it.
ITEM_PART = {
    "sgs/card-grid": "item",
    "sgs/gallery": "item",
    "sgs/icon-list": "item",
    "sgs/pricing-table": "plan-card",
    "sgs/process-steps": "step",
    "sgs/google-reviews": "review",
    "sgs/timeline": "entry",
    "sgs/post-grid": "card",
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


def evaluate(elements: dict[str, dict]) -> list[str]:
    """Findings for one block's elements. Pure, so the self-test can feed it fixtures."""
    parts = []
    for index, (key, spec) in enumerate(elements.items()):
        # A wrapper is the whole block under another name, and a `motion: false` part never reaches the Target picker.
        if spec.get("isWrapper") or spec.get("motion") is False:
            continue
        order = spec.get("order")
        parts.append((key, str(spec.get("label", "")), order if isinstance(order, (int, float)) else index + 1))
    wholes = [p for p in parts if p[1].startswith(WHOLE)]
    if not wholes:
        return ["no-whole-part"]
    if len(wholes) > 1:
        return ["two-whole-parts"]
    key, _, order = wholes[0]
    if any(other[2] <= order for other in parts if other[0] != key):
        return ["whole-not-first"]
    return []


def survey() -> tuple[list[tuple[str, list[str], str]], list[str]]:
    rows = []
    for slug in corpus():
        findings = evaluate(elements_of(slug))
        exempt = EXEMPT.get(slug, "")
        rows.append((slug, findings, exempt))
    stale = []
    in_corpus = {r[0]: r for r in rows}
    for slug in EXEMPT:
        row = in_corpus.get(slug)
        if row is None or not row[1]:
            stale.append(slug)
    return rows, stale


def report(rows, stale) -> list[str]:
    problems = []
    for slug, findings, exempt in rows:
        if findings and not exempt:
            problems.extend(f"{slug}: {f}" for f in findings)
    problems.extend(f"{slug}: stale-exemption" for slug in stale)
    return problems


def new_label(old: str) -> str:
    base = re.sub(r"\s*\([^)]*\)\s*$", "", old).strip()
    return WHOLE + base[:1].lower() + base[1:]


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


def rewrite(slug: str, key: str) -> tuple[str, str]:
    """(old text, new text) of block.json with the part `key` renamed and moved first."""
    path = BLOCKS_DIR / slug.split("/", 1)[1] / "block.json"
    text = path.read_text(encoding="utf-8")
    els = elements_of(slug)
    others = [v.get("order", 99) for k, v in els.items() if k != key and not v.get("isWrapper")]
    order = max(1, int(min(others)) - 1)
    anchor = text.index('"elements"')
    key_at = text.index(f'"{key}": {{', anchor)
    open_at = text.index("{", key_at)
    end = object_span(text, open_at)
    chunk = text[open_at:end]
    label_match = re.search(r'"label":\s*"([^"]*)"', chunk)
    order_match = re.search(r'"order":\s*(\d+)', chunk)
    if not label_match or not order_match:
        raise SystemExit(f"[check-motion-item-parts] {slug}: part {key} has no label or order to rewrite")
    chunk = chunk.replace(label_match.group(0), f'"label": "{new_label(label_match.group(1))}"', 1)
    chunk = chunk.replace(order_match.group(0), f'"order": {order}', 1)
    new = text[:open_at] + chunk + text[end:]
    before, after = json.loads(text), json.loads(new)
    before_part = before["supports"]["sgs"]["elements"][key]
    after_part = after["supports"]["sgs"]["elements"][key]
    before_part = {k: v for k, v in before_part.items() if k not in ("label", "order")}
    after_part = {k: v for k, v in after_part.items() if k not in ("label", "order")}
    if before_part != after_part:
        raise SystemExit(f"[check-motion-item-parts] {slug}: the rewrite changed more than label and order")
    return text, new


def fix(apply: bool) -> int:
    rows, _ = survey()
    todo = [(slug, ITEM_PART[slug]) for slug, findings, exempt in rows if findings and not exempt and slug in ITEM_PART]
    if not todo:
        print("[check-motion-item-parts] nothing to fix")
        return 0
    for slug, key in todo:
        old, new = rewrite(slug, key)
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

    good = {"wrapper": {"isWrapper": True, "label": "W", "order": 1}, "item": {"label": "Whole badge", "order": 2}, "label": {"label": "Text only", "order": 3}}
    need("passes when the whole part is first", evaluate(good) == [])
    need("no whole part", evaluate({"item": {"label": "Badge", "order": 2}}) == ["no-whole-part"])
    two = dict(good, extra={"label": "Whole thing", "order": 4})
    need("two whole parts", evaluate(two) == ["two-whole-parts"])
    need("whole part buried", evaluate({"title": {"label": "Title", "order": 2}, "item": {"label": "Whole card", "order": 4}}) == ["whole-not-first"])
    need("a tie is not first", evaluate({"title": {"label": "Title", "order": 2}, "item": {"label": "Whole card", "order": 2}}) == ["whole-not-first"])
    need("a wrapper never counts", evaluate({"w": {"isWrapper": True, "label": "Whole wrapper", "order": 1}, "x": {"label": "X", "order": 2}}) == ["no-whole-part"])
    need("a motion:false part never counts as the whole part", evaluate({"a": {"label": "Whole a", "order": 2, "motion": False}, "b": {"label": "B", "order": 3}}) == ["no-whole-part"])
    need("a motion:false part never blocks the whole part", evaluate({"a": {"label": "Whole a", "order": 3}, "b": {"label": "B", "order": 2, "motion": False}}) == [])
    need("includes/ callers are in the corpus pattern", ITEM_ARRAY_CALL.findall("Sgs_Motion_Loop_Delays::item_array( 'sgs/nav-bar-menu', $uid") == ["sgs/nav-bar-menu"])
    need("missing order falls back to position",evaluate({"a": {"label": "Whole a"}, "b": {"label": "B"}}) == [])
    need("label wording", new_label("Plan card (repeater item)") == "Whole plan card" and new_label("Card") == "Whole card")
    need("every ITEM_PART entry is a real block", all((BLOCKS_DIR / s.split("/", 1)[1] / "block.json").exists() for s in ITEM_PART))
    need("every EXEMPT entry has a reason", all(EXEMPT.values()))
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
        for slug, findings, exempt in rows:
            status = "ok" if not findings else ("exempt: " + exempt if exempt else ",".join(findings))
            print(f"{slug:28} {status}")
        for slug in stale:
            print(f"{slug:28} stale-exemption")
        print(f"corpus={len(rows)} failing={sum(1 for r in rows if r[1] and not r[2])} exempt={sum(1 for r in rows if r[1] and r[2])} stale={len(stale)}")
        return 0
    problems = report(rows, stale)
    if problems:
        print("[check-motion-item-parts] FAIL:")
        for p in problems:
            print("  " + p)
        return 1
    print(f"[check-motion-item-parts] OK -- {len(rows)} item-repeating block(s) name their whole-item part first")
    return 0


if __name__ == "__main__":
    sys.exit(main())
