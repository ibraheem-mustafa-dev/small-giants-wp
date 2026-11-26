#!/usr/bin/env python3
"""check-carousel-package.py - every carousel block draws its arrows and dots, styles them and scrolls them through the one shared package.

THE PACKAGE (Task 11, track W3): arrows and the pause button are the button kit (`supports.sgs.builtinButtons`, prefix `arrow`,
`src/components/button-kit/`), dots are the carousel dots kit (`supports.sgs.carouselDots`, prefix `dot`,
`src/components/carousel-dots/`), both mounted by `src/components/CarouselControls.js` and printed by
`includes/helpers-carousel-dots.php::sgs_carousel_controls_css`; the front-end behaviour (arrow and dot clicks, keyboard,
loop, autoplay with the shared pause runtime) is `src/shared/carousel/index.js::createCarousel`.

THREE RULES, one finding each per block:
  KITS    a block whose own source (anything in its folder that is not a view script) names a carousel arrow or dot class
          (`__arrow`, `__dot`, `__dots`, `carousel-prev`, `carousel-next`, `carousel-dots`) declares BOTH kits.
  ATTRS   a block that holds arrow or dot look attributes (`arrow<Colour|Size|Border...>`, `dot<Colour|Size...>`) declares the
          kit that owns that prefix, so the attribute set comes from the one registry.
  VIEW    a block view script that scrolls a track and drives arrows or dots imports `shared/carousel`.

NAMED EXCLUSIONS (EXCLUDED below, each with its reason, printed by --survey): a block is excluded only by an entry there, never
by a silent filter.

MODES
  --survey [--json]  every block the rules look at: OK, EXCLUDED (with reason) or a finding per rule
  --check            exit 1 on any finding
  --self-test        a hand-built view (caught), the same importing the package (passes), an undeclared kit (caught), the same
                     declared (passes), an excluded block (passes)

Run from the repo root:  python plugins/sgs-blocks/scripts/check-carousel-package.py --survey|--check|--self-test
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

# block slug -> { rule -> reason }: the rules a block is let off, each with why. "*" names every rule. The first three blocks keep
# their own carousel code (not part of the W3 move). google-reviews moved its view and its arrows; its dots wait for the dots kit to
# paint a gradient and a resting colour on the current dot too (see the reason).
EXCLUDED = {
    "gallery": {"*": "own 467-line view script and its own carousel modes (swipe row, masonry); not part of the W3 move"},
    "testimonial-slider": {"*": "own 631-line view script (slide stage, peek, bleed); not part of the W3 move"},
    "container": {"*": "scroll-row arrows and dots are `shared/scroll-row-controls` and `class-sgs-container-wrapper.php`; not part of the W3 move"},
    "google-reviews": {
        "KITS": "the dots keep their own colour panel and CSS: dotColour and dotColourHover take a gradient and also paint the current dot, which the dots kit does not do yet",
        "ATTRS": "dotColour, dotColourGradient, dotColourHover, dotColourHoverGradient: same reason as KITS",
    },
}

MARKUP_RE = re.compile(r"__arrow\b|__dots?\b|carousel-prev|carousel-next|carousel-dots")
ATTR_ARROW_RE = re.compile(r"^arrow(Colour|Size|Border|Position|Inset|Shadow|Padding|Width|MinHeight|Hover)")
ATTR_DOT_RE = re.compile(r"^dot(Colour|Size|Active|Gap|Border|Radius)")
CAROUSEL_ATTR_RE = re.compile(r"^(showArrows|showDots|carouselShow(Arrows|Dots)|scrollArrows|scrollDots)$")
SCROLL_RE = re.compile(r"scrollBy|scrollTo\(|scrollIntoView")
CONTROL_RE = re.compile(r"\b(prev|next)\b|__arrow|__dot|carousel-prev|carousel-next|\bdots?\b", re.IGNORECASE)
IMPORT_RE = re.compile(r"""from\s+['"][./]*(?:shared/)?carousel(?:/index(?:\.js)?)?['"]""")


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace")


def block_json(block_dir: Path) -> dict:
    path = block_dir / "block.json"
    return json.loads(read(path)) if path.exists() else {}


def declares(block: dict) -> tuple[bool, bool]:
    sgs = (block.get("supports") or {}).get("sgs") or {}
    buttons = sgs.get("builtinButtons") or []
    arrow = any(isinstance(b, dict) and b.get("prefix") == "arrow" for b in buttons)
    dots = isinstance(sgs.get("carouselDots"), dict)
    return arrow, dots


def view_files(block_dir: Path) -> list[Path]:
    return sorted(p for p in block_dir.glob("view*.js"))


def own_source_files(block_dir: Path) -> list[Path]:
    out = []
    for p in block_dir.rglob("*"):
        if p.is_file() and p.suffix in (".php", ".js", ".css") and not p.name.startswith("view") and "node_modules" not in p.parts:
            out.append(p)
    return out


def inspect(blocks_dir: Path) -> list[dict]:
    rows = []
    for block_dir in sorted(p for p in blocks_dir.iterdir() if p.is_dir()):
        slug = block_dir.name
        block = block_json(block_dir)
        has_arrow_kit, has_dots_kit = declares(block)
        attrs = block.get("attributes") or {}
        arrow_attrs = sorted(a for a in attrs if ATTR_ARROW_RE.match(a))
        dot_attrs = sorted(a for a in attrs if ATTR_DOT_RE.match(a))
        markup_files = [p for p in own_source_files(block_dir) if MARKUP_RE.search(read(p))]
        hand_views = []
        for view in view_files(block_dir):
            text = read(view)
            if SCROLL_RE.search(text) and CONTROL_RE.search(text) and "dot" in text.lower() and not IMPORT_RE.search(text):
                hand_views.append(view.name)
        # A carousel is a block that declares a kit or holds a carousel switch (arrows, dots or loop); another block's
        # `__dot` or `arrow*` names (an icon, a label, a diagram) are not carousel controls.
        carousel = has_arrow_kit or has_dots_kit or any(CAROUSEL_ATTR_RE.match(a) for a in attrs)
        if not carousel:
            continue
        findings = []
        if markup_files and not (has_arrow_kit and has_dots_kit):
            findings.append("KITS: names carousel arrows or dots in %s but declares %s" % (
                ", ".join(sorted({p.name for p in markup_files})),
                "neither kit" if not (has_arrow_kit or has_dots_kit) else ("only the arrow kit" if has_arrow_kit else "only the dots kit"),
            ))
        if arrow_attrs and not has_arrow_kit:
            findings.append("ATTRS: arrow attributes (%s) without supports.sgs.builtinButtons prefix arrow" % ", ".join(arrow_attrs[:3]))
        if dot_attrs and not has_dots_kit:
            findings.append("ATTRS: dot attributes (%s) without supports.sgs.carouselDots" % ", ".join(dot_attrs[:3]))
        for name in hand_views:
            findings.append("VIEW: %s drives arrows or dots without importing shared/carousel" % name)
        status = "OK"
        reason = ""
        if findings:
            let_off = EXCLUDED.get(slug, {})
            open_findings = [f for f in findings if f.split(":", 1)[0] not in let_off and "*" not in let_off]
            if open_findings:
                status = "FINDING"
                findings = open_findings
            else:
                status = "EXCLUDED"
                reason = "; ".join(sorted(set(let_off.values())))
        rows.append({"block": slug, "status": status, "reason": reason, "findings": findings,
                     "arrow_kit": has_arrow_kit, "dots_kit": has_dots_kit})
    return rows


def survey(blocks_dir: Path, as_json: bool) -> list[dict]:
    rows = inspect(blocks_dir)
    if as_json:
        print(json.dumps(rows, indent=2))
        return rows
    counts = {"OK": 0, "EXCLUDED": 0, "FINDING": 0}
    for row in rows:
        counts[row["status"]] += 1
        print("%-9s %-22s arrow-kit=%-5s dots-kit=%-5s" % (row["status"], row["block"], row["arrow_kit"], row["dots_kit"]))
        for f in row["findings"]:
            print("            - " + f)
        if row["reason"]:
            print("            (excluded: %s)" % row["reason"])
    print("carousel blocks: %d  ok: %d  excluded: %d  findings: %d" % (len(rows), counts["OK"], counts["EXCLUDED"], counts["FINDING"]))
    return rows


def check(blocks_dir: Path) -> int:
    bad = [r for r in inspect(blocks_dir) if r["status"] == "FINDING"]
    for row in bad:
        print("FAIL %s" % row["block"])
        for f in row["findings"]:
            print("  - " + f)
    if bad:
        print("%d block(s) build carousel arrows, dots or a view script outside the shared package (see this script's header)." % len(bad))
        return 1
    print("check-carousel-package: every carousel block uses the shared package or is a named exclusion.")
    return 0


def self_test() -> int:
    tmp = Path(tempfile.mkdtemp(prefix="carousel-pkg-"))
    failures = []
    try:
        def make(slug, kits, markup=True, view=None, attrs=None):
            d = tmp / slug
            d.mkdir()
            sgs = {}
            if kits:
                sgs = {"builtinButtons": [{"prefix": "arrow"}], "carouselDots": {"prefix": "dot"}}
            attributes = {"showArrows": {"type": "boolean"}}
            attributes.update(attrs or {})
            (d / "block.json").write_text(json.dumps({"supports": {"sgs": sgs}, "attributes": attributes}), encoding="utf-8")
            if markup:
                (d / "render.php").write_text("<button class='x__arrow'></button>", encoding="utf-8")
            if view:
                (d / "view.js").write_text(view, encoding="utf-8")
        hand = "const next=1; track.scrollBy({left:1}); const dots = 1;"
        make("hand-view", True, view=hand)
        make("pkg-view", True, view=hand + "\nimport { createCarousel } from '../../shared/carousel/index.js';")
        make("undeclared", False)
        make("declared", True)
        make("gallery", False)
        make("attrs-only", False, markup=False, attrs={"arrowColourText": {"type": "string"}})
        make("not-a-carousel", False, markup=True, attrs={})
        (tmp / "not-a-carousel" / "block.json").write_text(json.dumps({"attributes": {"dotColour": {"type": "string"}}}), encoding="utf-8")
        got = {r["block"]: r["status"] for r in inspect(tmp)}
        want = {"hand-view": "FINDING", "pkg-view": "OK", "undeclared": "FINDING", "declared": "OK", "gallery": "EXCLUDED", "attrs-only": "FINDING"}
        got.pop("not-a-carousel", None) if "not-a-carousel" not in got else failures.append("not-a-carousel was treated as a carousel")
        for slug, status in want.items():
            if got.get(slug) != status:
                failures.append("%s: wanted %s, got %s" % (slug, status, got.get(slug)))
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    if failures:
        print("self-test FAILED:\n  " + "\n  ".join(failures))
        return 1
    print("self-test passed (7 cases)")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--survey", action="store_true")
    parser.add_argument("--json", action="store_true")
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        return self_test()
    if args.check:
        return check(BLOCKS)
    survey(BLOCKS, args.json)
    return 0


if __name__ == "__main__":
    sys.exit(main())
