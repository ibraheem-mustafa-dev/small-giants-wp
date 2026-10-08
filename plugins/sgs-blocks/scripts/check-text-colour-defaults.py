#!/usr/bin/env python3
"""
check-text-colour-defaults.py: no SGS text defaults to the brand colour.

THE RULE (Bean, 2026-10-08)
---------------------------
A site's `primary` is a brand colour and can be a light mid-tone, so it is never a default
TEXT colour in a block:

  - text content (titles, names, numbers, labels, prices, read-more, buttons) inherits the
    site's text colour: the fallback is `inherit`, or the declaration is absent;
  - state text (hover, focus, active/current/selected/open) and links inside running text
    use `primary-dark`;
  - icons and decorative graphics may stay on `primary` (ALLOWLIST, each with its reason).

Palette values themselves are a client's choice and are not checked here.

WHAT FAILS
----------
  1. CSS: a `color:` declaration in src/blocks/**/*.css whose first palette preset, in
     var()-fallback order, is `--wp--preset--color--primary`, unless the rule is allowlisted.
     Applies inside @media / @supports.
  2. block.json: a colour attribute whose default is "primary" and which the framework DB
     routes to the CSS `color` property, unless allowlisted as a graphic.
  3. PHP: a `?? 'primary'` / `?: 'primary'` fallback for such an attribute in the block's
     render.php or a partial it requires.

Usage:
  python scripts/check-text-colour-defaults.py --check       # exit 1 on any finding (1-3)
  python scripts/check-text-colour-defaults.py --survey      # list findings, exit 0
  python scripts/check-text-colour-defaults.py --self-test   # negative + positive controls
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sqlite3
import sys
from pathlib import Path
from typing import Iterator, List, Tuple

PLUGIN_ROOT = Path(__file__).resolve().parent.parent
BLOCKS = PLUGIN_ROOT / "src" / "blocks"
DB = Path(os.path.expanduser("~/.claude/skills/sgs-wp-engine/sgs-framework.db"))

# (path suffix, selector fragment, reason). A CSS hit matching an entry is not reported.
ALLOWLIST: List[Tuple[str, str, str]] = [
    ("card-grid/style.css", "__badge--primary", "a badge variant the client picks by name, beside success and accent"),
    ("counter/style.css", ".sgs-counter__icon", "icon glyph (graphic)"),
    ("icon-list/style.css", ":where(.sgs-icon-list__icon)", "icon glyph (graphic)"),
    ("process-steps/style.css", ".sgs-process-steps__icon", "icon glyph (graphic)"),
    ("process-steps/style.css", "::after", "connector arrow (graphic)"),
    ("pricing-table/style.css", ".sgs-pricing-table__icon", "feature icon (graphic)"),
    ("product-card/style.css", "__rating-stars", "rating stars (graphic)"),
]

# (block slug, attribute, reason). A block.json / PHP hit matching an entry is not reported.
ATTR_ALLOWLIST: List[Tuple[str, str, str]] = [
    ("sgs/icon", "iconColour", "icon glyph (graphic)"),
    ("sgs/icon-list", "iconColour", "icon glyph (graphic)"),
]

FIRST_PRESET = re.compile(r"--wp--preset--color--([a-z0-9-]+)")
COLOR_DECL = re.compile(r"(?<![\w-])color\s*:\s*([^;{}]+)")


def strip_comments(css: str) -> str:
    return re.sub(r"/\*.*?\*/", "", css, flags=re.S)


def iter_rules(css: str) -> Iterator[Tuple[str, str]]:
    """Yield (selector, body) for every leaf rule, descending into @media/@supports/@layer.
    Same walker as scripts/check-focus-ring-token.py::iter_rules."""
    css = strip_comments(css)
    stack: List[Tuple[int, int]] = []
    prelude_start = 0
    for i, ch in enumerate(css):
        if ch == "{":
            stack.append((i, prelude_start))
            prelude_start = i + 1
        elif ch == "}":
            if stack:
                open_pos, sel_start = stack.pop()
                body = css[open_pos + 1:i]
                selector = css[sel_start:open_pos].strip()
                if "{" not in body and not selector.startswith("@"):
                    yield selector, body
            prelude_start = i + 1
        elif ch == ";" and not stack:
            prelude_start = i + 1


def scan_css(css: str) -> List[Tuple[str, str]]:
    """(selector, value) for every `color:` whose first palette preset is `primary`."""
    hits = []
    for selector, body in iter_rules(css):
        for m in COLOR_DECL.finditer(body):
            value = " ".join(m.group(1).split())
            first = FIRST_PRESET.search(value)
            if first and first.group(1) == "primary":
                hits.append((" ".join(selector.split()), value))
    return hits


def css_findings(blocks: Path) -> List[str]:
    out = []
    for p in sorted(blocks.glob("*/*.css")):
        rel = p.relative_to(blocks).as_posix()
        for selector, value in scan_css(p.read_text(encoding="utf-8", errors="replace")):
            if any(rel.endswith(f) and frag in selector for f, frag, _ in ALLOWLIST):
                continue
            out.append(f"css  {rel}::{selector} color: {value}")
    return out


def _text_colour_attrs(db: Path) -> set:
    """(block slug, attr) pairs the framework DB routes to the CSS `color` property."""
    con = sqlite3.connect(f"file:{db.as_posix()}?mode=ro", uri=True)
    try:
        rows = con.execute(
            "SELECT block_slug, attr_name FROM block_attributes WHERE css_property = 'color'"
        ).fetchall()
    finally:
        con.close()
    return {(slug, attr) for slug, attr in rows}


PARTIAL_REQUIRE_RE = re.compile(
    r"(?<![\w$>:])(?:require|include)(?!_once)\s*\(?\s*__DIR__\s*\.\s*['\"]/([\w./-]+\.php)['\"]"
)


def _render_text(block_dir: Path) -> str:
    """render.php plus every partial it plain-requires from its own folder."""
    seen, out, todo = set(), [], [block_dir / "render.php"]
    while todo:
        p = todo.pop()
        if p in seen or not p.is_file():
            continue
        seen.add(p)
        src = p.read_text(encoding="utf-8", errors="replace")
        out.append(src)
        todo += [p.parent / m.group(1) for m in PARTIAL_REQUIRE_RE.finditer(src)]
    return "\n".join(out)


def attr_findings(blocks: Path, text_attrs: set) -> List[str]:
    out = []
    for bj in sorted(blocks.glob("*/block.json")):
        meta = json.loads(bj.read_text(encoding="utf-8"))
        slug = meta.get("name", "")
        render = None
        for attr, spec in (meta.get("attributes") or {}).items():
            if (slug, attr) not in text_attrs or any(slug == s and attr == a for s, a, _ in ATTR_ALLOWLIST):
                continue
            rel = bj.parent.name
            if isinstance(spec, dict) and spec.get("default") == "primary":
                out.append(f"attr {rel}/block.json::{attr} default \"primary\"")
            if render is None:
                render = _render_text(bj.parent)
            if re.search(r"\[\s*'" + re.escape(attr) + r"'\s*\]\s*(\?\?|\?:)\s*'primary'", render):
                out.append(f"php  {rel}/render.php::{attr} falls back to 'primary'")
    return out


def self_test() -> int:
    import tempfile

    failed = []

    def expect(label, got, want):
        ok = got == want
        print(f"  {'PASS' if ok else 'FAIL'} {label}: got {got}, want {want}")
        if not ok:
            failed.append(label)

    expect("bare primary text", len(scan_css(".x__title{color:var(--wp--preset--color--primary)}")), 1)
    expect("primary as a control var's fallback", len(scan_css(".x{color:var(--sgs-x, var(--wp--preset--color--primary, #123))}")), 1)
    expect("primary-dark is not primary", len(scan_css(".x:hover{color:var(--wp--preset--color--primary-dark)}")), 0)
    expect("inherit fallback passes", len(scan_css(".x{color:var(--sgs-x, inherit)}")), 0)
    expect("text first, primary later passes", len(scan_css(".x{color:var(--wp--preset--color--text, var(--wp--preset--color--primary))}")), 0)
    expect("nested @media", len(scan_css("@media (min-width:1px){.x{color:var(--wp--preset--color--primary)}}")), 1)
    expect("background is not color", len(scan_css(".x{background-color:var(--wp--preset--color--primary)}")), 0)
    expect("border-color is not color", len(scan_css(".x{border-color:var(--wp--preset--color--primary)}")), 0)
    expect("comment ignored", len(scan_css("/* .x{color:var(--wp--preset--color--primary)} */")), 0)

    with tempfile.TemporaryDirectory() as tmp:
        blocks = Path(tmp)
        b = blocks / "demo"
        b.mkdir()
        (b / "block.json").write_text(json.dumps({"name": "sgs/demo", "attributes": {
            "titleColour": {"type": "string", "default": "primary"},
            "bgColour": {"type": "string", "default": "primary"},
            "nameColour": {"type": "string", "default": ""},
        }}), encoding="utf-8")
        (b / "render.php").write_text("<?php\nrequire __DIR__ . '/part.php';\n", encoding="utf-8")
        (b / "part.php").write_text("<?php\n$n = $attributes['nameColour'] ?? 'primary';\n", encoding="utf-8")
        text_attrs = {("sgs/demo", "titleColour"), ("sgs/demo", "nameColour")}
        got = attr_findings(blocks, text_attrs)
        expect("text attr default primary", sum("titleColour" in g and "block.json" in g for g in got), 1)
        expect("background attr ignored", sum("bgColour" in g for g in got), 0)
        expect("fallback in a required partial", sum("nameColour" in g and "render.php" in g for g in got), 1)


    print("self-test:", "FAIL " + str(failed) if failed else "ok (negative and positive controls)")
    return 1 if failed else 0


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--survey", action="store_true")
    ap.add_argument("--self-test", action="store_true")
    args = ap.parse_args()
    if args.self_test:
        return self_test()
    if not DB.is_file():
        print(f"[text-colour-defaults] FAIL: framework DB not found at {DB}")
        return 1
    findings = css_findings(BLOCKS) + attr_findings(BLOCKS, _text_colour_attrs(DB))
    for f in findings:
        print(f"  {f}")
    print(f"[text-colour-defaults] {len(findings)} finding(s): text never defaults to primary; "
          f"state text and in-text links use primary-dark.")
    return 1 if (args.check and findings) else 0


if __name__ == "__main__":
    sys.exit(main())
