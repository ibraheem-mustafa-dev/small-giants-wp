#!/usr/bin/env python3
"""check-border-width-defaults.py — "the stylesheet never chooses a border width".

THE RULE (Bean, 2026-10-05; .claude/rules/block-editor-controls.md "Border
defaults"): a stylesheet never gives an element that HAS a border control a
width the client did not choose. The control's value, painted by render.php,
is the only width. Two kinds of rule may still paint one:
  - a look whose identity is a border (a "bordered" / "card" / pull-quote
    variant), wrapped in :where() so its specificity is zero and the control's
    scoped per-instance rule always wins;
  - an exceptional type listed in EXCEPTIONAL below, with its reason.

WHAT IT FLAGS: a rule in src/blocks/*/style.css whose selector is not wholly
inside :where(), whose subject element carries a class a border-width control
paints, and which declares a non-zero border width (`border`, `border-<side>`,
`border-width`, `border-<side>-width`, a `var(--x, <fallback>)` fallback, or a
style keyword with no width, which paints `medium`).

WHICH ELEMENTS: the framework DB (block_attributes rows whose css_property
contains border-width, read-only) names each control's block and element. The
element maps to a class: `wrapper` is the block root (`sgs-<name>`,
`wp-block-sgs-<name>`, any `sgs-<name>--<modifier>`); any other element is
`sgs-<name>__<element in kebab-case>`. ROOT_CLASS and ELEMENT_CLASS hold the
elements whose real class differs from that convention (each read from the
block's render.php). EXTRA_CONTROLS holds border-width controls the DB does
not record as a border-width row.

THE TRIAD
  --survey     list every instance
  --check      exit 1 on any instance
  --self-test  positive and negative fixtures, proving it can still fail

Run from plugins/sgs-blocks:  python scripts/check-border-width-defaults.py --check
"""
from __future__ import annotations

import argparse
import re
import sqlite3
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

PLUGIN = Path(__file__).resolve().parents[1]
BLOCKS = PLUGIN / "src" / "blocks"
DB = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"

# Block roots whose class is not `sgs-<name>` (render.php's root class list).
ROOT_CLASS = {
    "sgs/countdown-timer": ["sgs-countdown"],
    "sgs/table-of-contents": ["sgs-toc"],
    "sgs/product-card": ["product-card", "sgs-product-card"],
}

# (block, css_element) -> classes, where `sgs-<name>__<kebab element>` is not the class.
ELEMENT_CLASS = {
    ("sgs/account", "cardBox"): ["sgs-account__card"],
    ("sgs/cart", "pill"): ["sgs-cart__trigger"],
    ("sgs/nav-drawer", "chromeButton"): ["sgs-nav-drawer__chrome-slot"],
    ("sgs/notice-banner", "icon"): ["sgs-notice-banner__icon--circle"],
    ("sgs/product-card", "attributeTag"): ["sgs-product-card__attribute-tag"],
    ("sgs/trust-bar", "icon-badge"): ["sgs-trust-bar__circle"],
}

# Border-width controls the DB has no border-width row for: (block, attribute, classes).
EXTRA_CONTROLS = (
    # header row divider (block.json maps it on the `header` element's border-width member).
    ("sgs/google-reviews", "headerDividerWidth", ["sgs-google-reviews__aggregate"]),
    # asideSeparator.width: the divider render.php paints on the aside column.
    ("sgs/mega-panel", "asideSeparator", ["sgs-mega-aside"]),
)

# Look classes that are not `--` modifiers (render.php's own variant class names).
VARIANT_CLASSES = {
    "trial-card",  # sgs/product-card's trial look
}

# DB border-width rows that paint no border, so the element's own border is not theirs.
NOT_BORDER_CONTROLS = {
    # Drives the active-tab indicator through --sgs-tab-indicator-thickness (an inset box-shadow);
    # the tab's box border in the boxed/horizontal looks has no border control.
    ("sgs/tabs", "tabIndicatorThickness"),
}

# Exceptional types: an element whose border is part of what it is. Class -> reason.
EXCEPTIONAL = {
    "sgs-button--primary": "button preset border width comes from the client's buttonPresets token (theme snapshot)",
    "sgs-button--secondary": "button preset border width comes from the client's buttonPresets token (theme snapshot)",
    "sgs-button--outline": "an outline button's border is what it is; width from the buttonPresets token",
    "sgs-google-reviews__write-review": "copies Google's own outlined button styling, not a theme default (Bean, 2026-10-05)",
    "sgs-google-reviews__arrow": "copies Google's own outlined arrow styling, not a theme default (Bean, 2026-10-05)",
    "sgs-google-reviews__see-all": "the filled pill's transparent 1px edge matches the outlined write-review pill's box; it paints no visible line",
    "sgs-notice-banner": "the accent edge is the banner's identity (each tone colours it); kept at zero specificity so the control wins",
}

_WIDTH_PROPS = re.compile(
    r"^border(?:-(?:top|right|bottom|left|block|inline|block-start|block-end|inline-start|inline-end))?(?:-width)?$"
)
_STYLE_WORDS = {"solid", "dashed", "dotted", "double", "groove", "ridge", "inset", "outset"}
_ZERO = re.compile(r"^-?0(?:\.0+)?(?:px|rem|em|%)?$")
_LENGTH = re.compile(r"^-?\d*\.?\d+(?:px|rem|em|vw|vh|ch|ex|%)?$")


def _kebab(name: str) -> str:
    return re.sub(r"(?<=[a-z0-9])([A-Z])", r"-\1", name).lower()


def load_controls(db_path: Path = DB) -> list[tuple[str, str, list[str], bool]]:
    """(block, attribute, classes, is_root) for every border-width control."""
    conn = sqlite3.connect(f"file:{db_path.as_posix()}?mode=ro", uri=True)
    rows = conn.execute(
        "SELECT block_slug, attr_name, css_element FROM block_attributes "
        "WHERE css_property LIKE '%border-width%' AND css_element IS NOT NULL"
    ).fetchall()
    conn.close()
    out = []
    for slug, attr, element in rows:
        if (slug, attr) in NOT_BORDER_CONTROLS:
            continue
        name = slug.split("/", 1)[1]
        if "wrapper" == element:
            out.append((slug, attr, ROOT_CLASS.get(slug, [f"sgs-{name}"]) + [f"wp-block-sgs-{name}"], True))
        else:
            out.append((slug, attr, ELEMENT_CLASS.get((slug, element), [f"sgs-{name}__{_kebab(element)}"]), False))
    out.extend((slug, attr, classes, False) for slug, attr, classes in EXTRA_CONTROLS)
    return out


def _split_top(text: str, seps: str) -> list[str]:
    parts, depth, cur = [], 0, ""
    for ch in text:
        if "(" == ch:
            depth += 1
        elif ")" == ch:
            depth -= 1
        if 0 == depth and ch in seps:
            parts.append(cur)
            cur = ""
            continue
        cur += ch
    parts.append(cur)
    return parts


def _strip_parens(text: str, fn: str) -> str:
    """Remove every `:fn( … )` group (balanced) from a selector."""
    out, i = "", 0
    token = f":{fn}("
    while i < len(text):
        if text.startswith(token, i):
            depth, j = 1, i + len(token)
            while j < len(text) and depth:
                depth += {"(": 1, ")": -1}.get(text[j], 0)
                j += 1
            i = j
            continue
        out += text[i]
        i += 1
    return out


def _is_look(selector: str) -> bool:
    """A selector naming a ready-made look: a block-level modifier (`sgs-<block>--<look>`, never
    an element's own `__el--type`), a block style (`is-style-*`) or a VARIANT_CLASSES class."""
    classes = re.findall(r"\.(-?[A-Za-z_][\w-]*)", selector)
    return any(
        ("--" in c and "__" not in c) or c.startswith("is-style-") or c in VARIANT_CLASSES for c in classes
    )


def unwrap(selector: str) -> list[str]:
    """The selectors to judge. A selector wholly inside one :where() is judged by its inner
    selectors, and an inner selector that names a look is exempt (that is how a look whose
    identity is a border keeps it while the control wins). A bare :where() base is still judged."""
    sel = selector.strip()
    m = re.fullmatch(r":where\((.*)\)", sel, flags=re.S)
    if not m or _strip_parens(sel, "where").strip():
        return [sel]
    return [inner for inner in _split_top(m.group(1), ",") if inner.strip() and not _is_look(inner)]


def subject_classes(selector: str) -> list[str] | None:
    """Classes on the selector's subject element; None when the selector has zero specificity
    on its own (a :where() not at the top level of the selector) or styles a pseudo-element."""
    sel = selector.strip()
    if not _strip_parens(sel, "where").strip():
        return None
    compounds = [c for c in _split_top(re.sub(r"\s*([>+~])\s*", " ", sel), " ") if c.strip()]
    subject = compounds[-1] if compounds else ""
    if "::" in subject or re.search(r":(?:before|after)\b", subject):
        return None
    subject = _strip_parens(_strip_parens(subject, "not"), "where")
    return re.findall(r"\.(-?[A-Za-z_][\w-]*)", subject)


def _width_tokens(value: str) -> list[str]:
    """Resolve `var(--x, fallback)` to its fallback; a var() with no fallback yields nothing."""
    value = re.sub(r"!important", "", value).strip()
    while True:
        m = re.search(r"var\(\s*--[\w-]+\s*(,\s*)?", value)
        if not m:
            break
        depth, j = 1, m.end()
        while j < len(value) and depth:
            depth += {"(": 1, ")": -1}.get(value[j], 0)
            j += 1
        inner = value[m.end(): j - 1] if m.group(1) else ""
        value = value[: m.start()] + " " + inner + " " + value[j:]
    return _split_top(value, " ")


def paints_width(prop: str, value: str) -> bool:
    """True when the declaration gives the element a non-zero border width."""
    if not _WIDTH_PROPS.match(prop):
        return False
    tokens = [t for t in _width_tokens(value) if t.strip()]
    if prop.endswith("-width"):
        return any(not _ZERO.match(t) and (_LENGTH.match(t) or t in ("thin", "medium", "thick")) for t in tokens)
    widths = [t for t in tokens if _LENGTH.match(t) or t in ("thin", "medium", "thick")]
    if "none" in tokens or "hidden" in tokens:
        return False
    if widths:
        return any(not _ZERO.match(t) for t in widths)
    return any(t in _STYLE_WORDS for t in tokens)


def iter_rules(css: str):
    """(line, selector text, [(prop, value)]) for every style rule, descending into @-blocks.
    Rules inside @media (forced-colors …) are skipped: a system-colour border there keeps an
    element visible in high-contrast mode and is not a design default."""
    css = re.sub(r"/\*.*?\*/", lambda m: "\n" * m.group(0).count("\n"), css, flags=re.S)
    stack, buf, buf_line, i, line = [], "", 1, 0, 1
    while i < len(css):
        ch = css[i]
        if "\n" == ch:
            line += 1
        if "{" == ch:
            head = buf.strip()
            if head.startswith("@"):
                stack.append(head)
                buf = ""
            else:
                j = css.index("}", i)
                body = css[i + 1: j]
                decls = []
                for d in body.split(";"):
                    if ":" in d:
                        p, v = d.split(":", 1)
                        decls.append((p.strip().lower(), v.strip()))
                if not any("forced-colors" in at for at in stack):
                    yield (buf_line, head, decls)
                line += body.count("\n")
                i = j + 1
                buf = ""
                continue
        elif "}" == ch:
            if stack:
                stack.pop()
            buf = ""
        else:
            if not buf.strip() and ch.strip():
                buf_line = line
            buf += ch
        i += 1


def scan_css(css: str, controls) -> list[tuple[int, str, str, str, str]]:
    """(line, selector, declaration, block, attribute) for each violation."""
    hits = []
    for line, head, decls in iter_rules(css):
        painted = [f"{p}: {v}" for p, v in decls if paints_width(p, v)]
        if not painted:
            continue
        for listed in _split_top(head, ","):
            for sel in unwrap(listed):
                classes = subject_classes(sel)
                if not classes or any(c in EXCEPTIONAL for c in classes):
                    continue
                # An owned class or one of its modifiers (a root look, or an element's type class).
                for slug, attr, owned, _is_root in controls:
                    if any(c in owned or any(c.startswith(o + "--") for o in owned) for c in classes):
                        hits.append((line, listed.strip(), painted[0], slug, attr))
                        break
    return hits


def scan(root: Path = BLOCKS, controls=None) -> list[tuple[str, int, str, str, str, str]]:
    controls = controls if controls is not None else load_controls()
    out = []
    for path in sorted(root.glob("*/style.css")):
        for line, sel, decl, slug, attr in scan_css(path.read_text(encoding="utf-8"), controls):
            out.append((path.relative_to(root.parent.parent).as_posix(), line, sel, decl, slug, attr))
    return out


def cmd_survey(root: Path) -> int:
    hits = scan(root)
    for path, line, sel, decl, slug, attr in hits:
        print(f"{path}:{line}  {sel}  {{ {decl} }}  <- {slug}::{attr}")
    print(f"\n{len(hits)} stylesheet border width(s) on a border-controlled element.")
    return 0


def cmd_check(root: Path) -> int:
    hits = scan(root)
    if not hits:
        print("check-border-width-defaults: OK (no stylesheet width on a border-controlled element).")
        return 0
    for path, line, sel, decl, slug, attr in hits:
        print(f"{path}:{line}  {sel}  {{ {decl} }}  <- {slug}::{attr}")
    print(
        f"\ncheck-border-width-defaults: FAIL ({len(hits)}). Give the element width 0 (keep style/colour), "
        "or wrap a border-named variant's border in :where() so the control wins."
    )
    return 1


def cmd_self_test() -> int:
    controls = [
        ("sgs/demo", "borderWidth", ["sgs-demo", "wp-block-sgs-demo"], True),
        ("sgs/demo", "cardBorderWidth", ["sgs-demo__card"], False),
    ]
    flagged = {
        "base shorthand": ".sgs-demo__card { border: 1px solid red; }",
        "side shorthand": ".sgs-demo__card { border-bottom: 2px solid red; }",
        "width longhand": ".sgs-demo__card { border-width: 1px; }",
        "var fallback": ".sgs-demo__card { border-width: var(--x, 1px); }",
        "var fallback in shorthand": ".sgs-demo__card { border-left: var(--x, 1px) solid red; }",
        "style with no width": ".sgs-demo__card { border: solid red; }",
        "root modifier": ".sgs-demo--bordered { border: 1px solid red; }",
        "descendant subject": ".sgs-demo--x .sgs-demo__card { border: 1px solid red; }",
        "subject outside :where": ":where(.sgs-demo--x) .sgs-demo__card { border: 1px solid red; }",
        "inside @media": "@media (min-width: 1px) { .sgs-demo__card { border: 1px solid red; } }",
        "comma list": ".other, .sgs-demo__card { border: 1px solid red; }",
        "wrapped base": ":where(.sgs-demo__card) { border: 1px solid red; }",
        "wrapped element type": ":where(.sgs-demo__card--button) { border: 1px solid red; }",
        "wrapped base in a list": ":where(.sgs-demo--x .sgs-other, .sgs-demo__card) { border: 1px solid red; }",
    }
    clean = {
        "zero shorthand": ".sgs-demo__card { border: 0 solid red; }",
        "none": ".sgs-demo__card { border: none; }",
        "zero longhand": ".sgs-demo__card { border-width: 0; }",
        "zero var fallback": ".sgs-demo__card { border-width: var(--x, 0); }",
        "var without fallback": ".sgs-demo__card { border-width: var(--x); }",
        "wrapped variant": ":where(.sgs-demo--bordered .sgs-demo__card) { border: 1px solid red; }",
        "wrapped root look": ":where(.sgs-demo--bordered) { border: 1px solid red; }",
        "wrapped block style": ":where(.wp-block-sgs-demo.is-style-pull) { border: 1px solid red; }",
        "colour only": ".sgs-demo__card { border-color: red; border-style: solid; }",
        "radius": ".sgs-demo__card { border-radius: 4px; }",
        "pseudo-element": ".sgs-demo__card::before { border: 1px solid red; }",
        "uncontrolled element": ".sgs-demo__title { border: 1px solid red; }",
        "exceptional type": ".sgs-google-reviews__arrow { border: 1px solid red; }",
        "descendant of root": ".sgs-demo .sgs-other { border: 1px solid red; }",
        "forced-colors": "@media (forced-colors: active) { .sgs-demo__card { border: 1px solid CanvasText; } }",
    }
    fails = 0
    for label, css in flagged.items():
        if not scan_css(css, controls):
            print(f"  FAIL (missed): {label}")
            fails += 1
    for label, css in clean.items():
        if scan_css(css, controls):
            print(f"  FAIL (false positive): {label}")
            fails += 1
    if fails:
        print(f"self-test: {fails} failure(s)")
        return 1
    print(f"self-test: OK ({len(flagged)} flagged, {len(clean)} clean)")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    group = ap.add_mutually_exclusive_group(required=True)
    group.add_argument("--survey", action="store_true")
    group.add_argument("--check", action="store_true")
    group.add_argument("--self-test", action="store_true")
    ap.add_argument("--root", type=Path, default=BLOCKS, help="blocks directory to scan (default src/blocks)")
    args = ap.parse_args()
    if args.self_test:
        return cmd_self_test()
    if args.survey:
        return cmd_survey(args.root)
    return cmd_check(args.root)


if __name__ == "__main__":
    sys.exit(main())
