#!/usr/bin/env python3
"""check-row-flex-wrap.py - a row of items the block authors has a wrap control.

THE RULE (Bean, 2026-10-24, plan 2026-10-23-cloning-tool-completion "Decisions for Phase 1" item 3): a block whose own
stylesheet lays repeated items out as a flex row declares `css:flex-wrap` for that element in `supports.sgs.elements`,
so a client (and the cloning tool) can choose between wrapping onto further rows and a single line. The attribute shape
is the dominant one: a string `flexWrap`, enum `["", "nowrap", "wrap"]`, default `""` (the stylesheet's own value stands).

A ROW CANDIDATE is a style.css rule with `display:flex|inline-flex`, no `flex-direction:column`, whose element is
  - named like a list of items (ROW_NAME_RE: list, links (plural; a single link is one item), social(s), items, options, buttons, steps,
    thumbs, swatches, actions, controls, meter, nav, stepper, price-row, cta-row), or
  - the block root, on a block that holds repeated items (an `allowedBlocks` list or an array attribute).
THE ELEMENT is the last class of the rule's last selector: `__<name>` on a `sgs-<slug>` class, `root` for the block
root class, otherwise the trailing word of the class. It is SATISFIED when `supports.sgs.elements.<name>` (or, for the
root, the wrapper/root element) maps `css:flex-wrap`.

NAMED EXCLUSIONS (EXCLUDE_BLOCKS / EXCLUDE_NAMES / EXCLUDE_SELECTOR_RE below, each with its reason, printed by --survey):
a row is excluded only by an entry in those tables, never by a silent filter.

MODES
  --survey [--json]  every candidate: SATISFIED, EXCLUDED (with reason) or MISSING
  --check            exit 1 on any MISSING row
  --self-test        a row with no setting (caught), the same with it (passes), an excluded row (passes), a
                     not-a-row column rule (passes), a root of a block with no repeated items (passes)

Run from the repo root:  python plugins/sgs-blocks/scripts/check-row-flex-wrap.py --survey|--check|--self-test
"""
from __future__ import annotations

import argparse
import json
import re
import shutil
import sys
import tempfile
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
BLOCKS = Path(__file__).resolve().parent.parent / "src" / "blocks"

ROW_NAME_RE = re.compile(r"(?:^|-)(?:list|links|socials?|items|options|buttons|steps|thumbs|swatches|actions|controls|meter|nav|stepper|price-row|cta-row)$")

# A whole block, with the reason its rows are not authored rows.
EXCLUDE_BLOCKS = {
    "testimonial-slider": "a slider track: scroll-snap lane that must never wrap by design",
    "brand-strip": "a marquee lane: the track and its sets must never wrap by design",
}
# (block, element) pairs inside a block that is otherwise checked.
EXCLUDE_NAMES = {
    ("business-info", "hours-row"): "a day-and-times pair, not a list of items",
    ("nav-bar-menu", "root"): "pairs the link bar with the burger; the bar element carries flexWrap",
    ("form", "progress-steps"): "a fixed step indicator whose count is the form's step count, laid on one line by design",
    ("choice-flow", "stepper"): "a fixed step indicator whose count is the flow's step count, laid on one line by design (the same reason as form's progress-steps)",
    ("cart", "item-add-options"): "one link, centred with inline-flex: a single control, not a row of items",
    ("wishlist-panel", "choose-options"): "one link, centred with inline-flex: a single control, not a row of items",
    ("tabs", "nav"): "the tab list: its direction and wrapping follow the orientation and mobileLayout settings (a column, a wrapping row or a scrolling lane), so a wrap toggle would contradict them",
}
# Any rule whose selector names a lane that must stay on one line.
EXCLUDE_SELECTOR_RE = re.compile(r"__(?:track|set|stars|dots|carousel|slider|marquee)\b|--(?:slider|carousel)\b|\[data-sgs-marquee")


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def multi_item(meta: dict) -> bool:
    return bool(meta.get("allowedBlocks")) or any(
        isinstance(a, dict) and a.get("type") == "array" for a in meta.get("attributes", {}).values()
    )


def row_rules(css: str):
    css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
    for m in re.finditer(r"([^{}]+)\{([^{}]*)\}", css):
        sel, body = " ".join(m.group(1).split()), m.group(2)
        if re.search(r"display\s*:\s*(?:inline-)?flex\b", body) and not re.search(r"flex-direction\s*:\s*column", body):
            yield sel


def element_of(slug: str, selector: str):
    last = selector.split(",")[-1].split()[-1] if selector else ""
    classes = re.findall(r"\.([A-Za-z_][\w-]*)", re.sub(r":[\w-]+(?:\([^)]*\))?", "", last))
    if not classes:
        return None
    cls = classes[-1]
    if cls in (f"sgs-{slug}", f"wp-block-sgs-{slug}"):
        return "root"
    if "__" in cls:
        return cls.split("__", 1)[1]
    prefix = f"sgs-{slug}-"
    return cls[len(prefix):] if cls.startswith(prefix) else cls.rsplit("-", 1)[-1]


def wrap_elements(meta: dict):
    out = set()
    for key, el in (meta.get("supports", {}).get("sgs", {}).get("elements", {}) or {}).items():
        if isinstance(el, dict) and "css:flex-wrap" in (el.get("attrMap") or {}):
            if el.get("isWrapper") or key in ("wrapper", "root"):
                out.add("root")
            out.add(key)
    return out


def survey(blocks: Path):
    rows = []
    for bj in sorted(blocks.glob("*/block.json")):
        slug = bj.parent.name
        css_file = bj.parent / "style.css"
        if not css_file.exists():
            continue
        meta = load(bj)
        have = wrap_elements(meta)
        seen = set()
        for sel in row_rules(css_file.read_text(encoding="utf-8")):
            name = element_of(slug, sel)
            if name is None or name in seen:
                continue
            if name == "root":
                if not multi_item(meta):
                    continue
            elif not ROW_NAME_RE.search(name):
                continue
            seen.add(name)
            if name in have:
                status, why = "SATISFIED", ""
            elif slug in EXCLUDE_BLOCKS:
                status, why = "EXCLUDED", EXCLUDE_BLOCKS[slug]
            elif (slug, name) in EXCLUDE_NAMES:
                status, why = "EXCLUDED", EXCLUDE_NAMES[(slug, name)]
            elif EXCLUDE_SELECTOR_RE.search(sel):
                status, why = "EXCLUDED", "a lane that must stay on one line (track, set, stars, dots, carousel, slider, marquee)"
            else:
                status, why = "MISSING", ""
            rows.append({"block": slug, "element": name, "selector": sel, "status": status, "reason": why})
    return rows


def report(rows, as_json=False):
    if as_json:
        print(json.dumps(rows, indent=1))
        return
    for r in rows:
        print(f"{r['status']:<9} {r['block']}:{r['element']}  {r['selector'][:70]}" + (f"  [{r['reason']}]" if r["reason"] else ""))
    print({s: sum(1 for r in rows if r["status"] == s) for s in ("SATISFIED", "EXCLUDED", "MISSING")})


def self_test() -> int:
    tmp = Path(tempfile.mkdtemp())
    try:
        def make(slug, css, meta):
            d = tmp / slug
            d.mkdir()
            (d / "style.css").write_text(css, encoding="utf-8")
            (d / "block.json").write_text(json.dumps(meta), encoding="utf-8")

        make("miss", ".sgs-miss__links{display:flex;gap:1rem}", {})
        make(
            "have",
            ".sgs-have__links{display:flex;gap:1rem}",
            {"supports": {"sgs": {"elements": {"links": {"attrMap": {"css:flex-wrap": "flexWrap"}}}}}},
        )
        make("brand-strip", ".sgs-brand-strip__list{display:flex}", {})
        make("col", ".sgs-col__links{display:flex;flex-direction:column}", {})
        make("single", ".sgs-single{display:flex}", {})
        make("multi", ".sgs-multi{display:flex}", {"allowedBlocks": ["sgs/icon"]})
        make("wide", ".sgs-wide__swatches{display:flex}.sgs-wide__price-row{display:flex}.sgs-wide__stepper{display:flex}", {})
        got = {(r["block"], r["element"], r["status"]) for r in survey(tmp)}
        want = {
            ("miss", "links", "MISSING"), ("have", "links", "SATISFIED"), ("brand-strip", "list", "EXCLUDED"),
            ("multi", "root", "MISSING"),
            ("wide", "swatches", "MISSING"), ("wide", "price-row", "MISSING"), ("wide", "stepper", "MISSING"),
        }
        print("self-test:", "ok" if got == want else f"FAILED got={sorted(got)} want={sorted(want)}")
        return 0 if got == want else 1
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--survey", action="store_true")
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--self-test", action="store_true")
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--blocks-dir", type=Path, default=BLOCKS)
    a = ap.parse_args()
    if a.self_test:
        return self_test()
    rows = survey(a.blocks_dir)
    if a.survey:
        report(rows, a.json)
        return 0
    if a.check:
        missing = [r for r in rows if r["status"] == "MISSING"]
        for r in missing:
            print(f"MISSING {r['block']}:{r['element']} lays items in a row ({r['selector'][:60]}) with no css:flex-wrap")
        print(f"check-row-flex-wrap: {len(missing)} missing")
        return 1 if missing else 0
    ap.print_help()
    return 2


if __name__ == "__main__":
    sys.exit(main())
