#!/usr/bin/env python3
"""check-tap-floors.py — "a tap area fits its own shape; 44px is only the default".

THE RULE (Bean, ruling 11, 2026-10-23; project CLAUDE.md touch-target line): touch targets are at
least 44px on what SGS makes itself, but a block's own size setting overrules that, and a control's
tap area fits its own shape. So a stylesheet never forces a hard-coded 44px floor (or fixed 44px
size) on an element a size setting governs: the floor reads the setting, and 44px is its fallback
when nothing is set (`min-block-size: var(--sgs-<x>, 44px)`, the custom property printed by PHP).

WHAT IT READS:
  - every front-end stylesheet `src/blocks/**/style.css`, every rule (inside @media and other
    @-blocks, forced-colors included): each sizing declaration (min-/max- and plain width, height,
    inline-size, block-size) whose value holds a 44px that is not a `var(--x, 44px)` fallback (a
    literal floor, `max(100%, 44px)`, `max(var(--x), 44px)`), and each declaration of any other
    property holding a literal 44px inside calc()/min()/max()/clamp() (hit-area arithmetic such as
    `inset: min(0px, calc((100% - 44px) / 2))`);
  - the render code that prints CSS, `src/blocks/**/*.php` and `includes/**/*.php`: each sizing or
    inset declaration inside a string (`min-height:44px`, `max(44px,` …) with the same 44px test.
    A render floor in a block file is classified like its stylesheet; one in `includes/` (a shared
    helper, no single block) always needs a register entry or a fix. EXEMPT_PHP lists the files
    that print WordPress admin screens, which no client setting or cloned draft reaches.

HOW IT CLASSIFIES each literal floor:
  - auto-house: the block declares no box-size setting (framework DB, block_attributes, read-only):
    nothing can size the element, so 44px is SGS's own default. Clean.
  - house: the block has a size setting, and the floor is listed in data/tap-floors.json with the
    reason no setting sizes that element. Clean.
  - FINDING: the block has a size setting and the floor is not listed. Either the floor beats a
    setting (fix it: read the setting with 44px as the fallback) or it is a house floor (list it,
    with the reason).
And each `var(--sgs-x, 44px)` fallback: a FINDING when no PHP or JS under the plugin prints `--x`
(a fallback no setting can replace is a literal floor in disguise).
And each register entry that matches no floor in the tree: a FINDING (stale).

Theme stylesheets and editor stylesheets are out of scope: no block setting reaches them.

THE TRIAD (no --fix: the right floor for each element is a judgement, so each fix is hand-written)
  --survey [--json]  every floor with its class
  --check            exit 1 on any finding
  --self-test        fixtures proving each class, and that the check can fail

Run from plugins/sgs-blocks:  python scripts/check-tap-floors.py --check
"""
from __future__ import annotations

import argparse
import json
import re
import sqlite3
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

PLUGIN = Path(__file__).resolve().parents[1]
BLOCKS = PLUGIN / "src" / "blocks"
REGISTER = PLUGIN / "scripts" / "data" / "tap-floors.json"
DB = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"

SIZE_PROPS = re.compile(r"^(min-|max-)?(width|height|inline-size|block-size)$")
MATH_FNS = {"calc", "min", "max", "clamp"}
# A declaration inside a PHP string: a size or inset property and its value up to the next ; ' " or }.
PHP_DECL = re.compile(r"(?<![\w-])((?:min-|max-)?(?:width|height|inline-size|block-size)|inset(?:-[\w-]+)?)\s*:\s*([^;'\"}]*)")
PHP_MAX_FLOOR = re.compile(r"max\(")
EXEMPT_PHP = {
    "includes/product-template-fields.php": "the product-template metabox on the WordPress admin product screen; no client setting or cloned draft reaches it",
}
FLOOR = re.compile(r"(?<![\w.-])44px\b")
VAR_NAME = re.compile(r"--sgs-[\w-]+")

# A box-size setting: its name ends Size/Height/Width, or it writes a box-size property, and it is
# not a type, border, stroke, measure or unit setting (those never size a tap target's box).
NOT_BOX = re.compile(
    r"(FontSize|LineHeight|BorderWidth|StrokeWidth|^maxWidth|ContentWidth|^contentWidth|MaxWidth|"
    r"Unit$|Linked$|Type$|backgroundSize|^stackBelow|DividerWidth)",
    re.I,
)
BOX_PROP = re.compile(r"(^|,)\s*(min-)?(width|height|inline-size|block-size)\b")


def load_sized_blocks(db_path: Path = DB) -> dict[str, list[str]]:
    """block name (no namespace) -> its box-size settings, from the framework DB (read-only)."""
    conn = sqlite3.connect(f"file:{db_path.as_posix()}?mode=ro", uri=True)
    try:
        rows = conn.execute(
            "SELECT block_slug, attr_name, COALESCE(css_property, '') FROM block_attributes WHERE source = 'sgs'"
        ).fetchall()
    finally:
        conn.close()
    out: dict[str, list[str]] = {}
    for slug, attr, prop in rows:
        if NOT_BOX.search(attr):
            continue
        if re.search(r"(Size|Height|Width)$", attr) or BOX_PROP.search(prop):
            out.setdefault(slug.split("/")[-1], []).append(attr)
    return out


def iter_rules(css: str):
    """(line, selector, [(prop, value)]) for every style rule, descending into @-blocks. A rule inside an
    @-block carries the at-rule heads before its selector (`@media (max-width: 767px) .sgs-x`)."""
    css = re.sub(r"/\*.*?\*/", lambda m: "\n" * m.group(0).count("\n"), css, flags=re.S)
    buf, buf_line, i, line, at_stack = "", 1, 0, 1, []
    while i < len(css):
        ch = css[i]
        if "\n" == ch:
            line += 1
        if "{" == ch:
            head = buf.strip()
            buf = ""
            if head.startswith("@"):
                at_stack.append(" ".join(head.split()))
            else:
                j = css.index("}", i)
                body = css[i + 1: j]
                decls = []
                for d in body.split(";"):
                    if ":" in d:
                        p, v = d.split(":", 1)
                        decls.append((p.strip().lower(), v.strip()))
                yield (buf_line, " ".join([*at_stack, " ".join(head.split())]), decls)
                line += body.count("\n")
                i = j + 1
                continue
        elif "}" == ch:
            if at_stack:
                at_stack.pop()
            buf = ""
        else:
            if not buf.strip() and ch.strip():
                buf_line = line
            buf += ch
        i += 1


def floors_in(value: str) -> tuple[bool, list[str], bool]:
    """(has a literal 44px floor, the custom properties whose var() fallback is 44px,
    whether a literal sits inside calc()/min()/max()/clamp())."""
    literal, fallback_vars, in_math = False, [], False
    for m in FLOOR.finditer(value):
        # The innermost open function at the 44px, and whether a top-level comma of it precedes it.
        stack: list[list] = []
        k = 0
        while k < m.start():
            ch = value[k]
            if "(" == ch:
                name = re.search(r"([\w-]*)$", value[:k]).group(1)
                stack.append([name, k, False])
            elif ")" == ch and stack:
                stack.pop()
            elif "," == ch and stack:
                stack[-1][2] = True
            k += 1
        if stack and "var" == stack[-1][0] and stack[-1][2]:
            var = VAR_NAME.match(value[stack[-1][1] + 1:].strip())
            fallback_vars.append(var.group(0) if var else value[stack[-1][1] + 1:].split(",")[0].strip())
        else:
            literal = True
            in_math = in_math or any(frame[0] in MATH_FNS for frame in stack)
    return literal, fallback_vars, in_math


def block_of(path: Path, root: Path) -> str:
    """The block a stylesheet belongs to: the nearest block.json's name, else its top folder."""
    for parent in [path.parent, *path.parents]:
        bj = parent / "block.json"
        if bj.exists():
            return json.loads(bj.read_text(encoding="utf-8")).get("name", parent.name).split("/")[-1]
        if parent == root:
            break
    return path.relative_to(root).parts[0]


def printed_vars(plugin: Path = PLUGIN) -> str:
    """The render code that can print a custom property, joined: every block's PHP and the shared helpers
    in includes/. Tests and editor previews never count (a property only they name never reaches the page).
    A parent block may print one its children read (sgs/social-icons prints --sgs-si-* for sgs/icon)."""
    paths = [*(plugin / "src" / "blocks").glob("**/*.php"), *(plugin / "includes").glob("**/*.php")]
    return "\n".join(p.read_text(encoding="utf-8", errors="ignore") for p in sorted(paths))


def key(block: str, selector: str, prop: str) -> str:
    return f"{block} :: {selector} :: {prop}"


def classify(row: dict, sized: dict[str, list[str]], register: dict[str, str], matched: set, findings: list, shared: bool = False) -> None:
    """Give a literal floor its class, recording a finding for an unlisted one in a sized block or shared helper."""
    k = key(row["block"], row["selector"], row["property"])
    if k in register:
        row["class"] = "house"
        matched.add(k)
    elif not shared and row["block"] not in sized:
        row["class"] = "auto-house"
    else:
        row["class"] = "unclassified"
        settings = "a shared render helper" if shared else f"{row['block']} has size settings ({', '.join(sized[row['block']])})"
        findings.append({**row, "why": f"{settings}; read the setting with 44px as the fallback, or list it as a house floor"})


def scan_php(plugin: Path, root: Path, sized: dict[str, list[str]], register: dict[str, str], matched: set) -> tuple[list, list]:
    """Literal 44px floors in the render code that prints CSS."""
    floors, findings = [], []
    paths = sorted([*root.glob("**/*.php"), *(plugin / "includes").glob("**/*.php")])
    for path in paths:
        if {"node_modules", "build", "vendor"} & set(path.parts):
            continue
        rel = path.relative_to(plugin).as_posix()
        if rel in EXEMPT_PHP:
            continue
        shared = not path.is_relative_to(root)
        block = rel if shared else block_of(path, root)
        for n, text in enumerate(path.read_text(encoding="utf-8", errors="ignore").splitlines(), 1):
            if re.match(r"\s*(//|\*|/\*|#)", text):
                continue
            hits = [(m.group(1), m.group(2).strip()) for m in PHP_DECL.finditer(text) if floors_in(m.group(2))[0]]
            # A floor wrapped around a value built at run time, with no property in the string: 'max(44px,' . $v . ')'.
            if not hits:
                for mm in PHP_MAX_FLOOR.finditer(text):
                    tail = text[mm.start(): mm.start() + 120]
                    if floors_in(tail)[0]:
                        hits = [("max()", tail.split(")")[0] + ")")]
                        break
            for prop, value in hits:
                row = {"path": rel, "line": n, "block": block, "selector": f"{rel} {prop}:{value}", "property": prop, "value": value}
                classify(row, sized, register, matched, findings, shared)
                floors.append(row)
    return floors, findings


def scan(root: Path, sized: dict[str, list[str]], register: dict[str, str], printed) -> dict:
    """printed: the render code text (str, the self-test) or a function from a stylesheet to it."""
    floors, findings, matched = [], [], set()
    for path in sorted(root.glob("**/style.css")):
        if {"node_modules", "build"} & set(path.parts):
            continue
        printers = printed(path) if callable(printed) else printed
        block = block_of(path, root)
        rel = path.relative_to(root.parent.parent).as_posix()
        for line, sel, decls in iter_rules(path.read_text(encoding="utf-8")):
            for prop, value in decls:
                literal, fb_vars, in_math = floors_in(value)
                # Any other property counts only for hit-area arithmetic: a literal 44px inside calc()/min()/max().
                if not SIZE_PROPS.match(prop) and not in_math:
                    continue
                for var in fb_vars:
                    # A --wp-- token is set by theme.json and the client's snapshot, not by a block setting.
                    if var.startswith("--sgs-") and not re.search(re.escape(var) + r"(?![\w-])", printers):
                        findings.append({"path": rel, "line": line, "block": block, "selector": sel, "property": prop,
                                         "value": value, "why": f"{var} is never printed: the 44px fallback is a fixed floor"})
                if not literal:
                    continue
                row = {"path": rel, "line": line, "block": block, "selector": sel, "property": prop, "value": value}
                classify(row, sized, register, matched, findings)
                floors.append(row)
    php_floors, php_findings = scan_php(root.parent.parent, root, sized, register, matched)
    floors += php_floors
    findings += php_findings
    for k in sorted(set(register) - matched):
        findings.append({"path": REGISTER.name, "line": 0, "block": k.split(" :: ")[0], "selector": k, "property": "",
                         "value": "", "why": "register entry matches no literal floor (stale)"})
    return {"floors": floors, "findings": findings}


def load_register(path: Path = REGISTER) -> dict[str, str]:
    data = json.loads(path.read_text(encoding="utf-8"))
    return {key(e["block"], e["selector"], e["property"]): e["reason"] for e in data["house"]}


def run(root: Path = BLOCKS) -> dict:
    return scan(root, load_sized_blocks(), load_register(), printed_vars())


def cmd_survey(as_json: bool) -> int:
    result = run()
    if as_json:
        print(json.dumps(result, indent=1))
        return 0
    counts: dict[str, int] = {}
    for f in result["floors"]:
        counts[f["class"]] = counts.get(f["class"], 0) + 1
        print(f"{f['class']:<12} {f['path']}:{f['line']}  {f['selector']}  {{ {f['property']}: {f['value']} }}")
    for f in result["findings"]:
        print(f"FINDING      {f['path']}:{f['line']}  {f['selector']}  {f['property']}  ({f['why']})")
    print(f"\n{len(result['floors'])} literal 44px floor(s): {counts}; {len(result['findings'])} finding(s).")
    return 0


def cmd_check() -> int:
    result = run()
    if not result["findings"]:
        print(f"check-tap-floors: OK ({len(result['floors'])} literal floors, every one on an element no size setting governs).")
        return 0
    for f in result["findings"]:
        print(f"{f['path']}:{f['line']}  {f['selector']}  {f['property']}  ({f['why']})")
    print(f"\ncheck-tap-floors: FAIL ({len(result['findings'])}). A size setting overrules the 44px floor (ruling 11).")
    return 1


def cmd_self_test() -> int:
    import tempfile

    cases = {
        # name: (block folder, css, register keys, expect findings, expect class of the one floor or None)
        "literal floor, sized block, unlisted": ("demo", ".sgs-demo__link { min-height: 44px; }", [], 1, "unclassified"),
        "literal floor inside max()": ("demo", ".sgs-demo__hit { width: max(100%, 44px); }", [], 1, "unclassified"),
        "max() over a setting": ("demo", ".sgs-demo__hit { min-width: max(var(--sgs-demo-size), 44px); }", [], 1, "unclassified"),
        "floor in @media": ("demo", "@media (max-width: 600px) { .sgs-demo__link { min-block-size: 44px; } }", [], 1, "unclassified"),
        "listed house floor": ("demo", ".sgs-demo__close { min-width: 44px; }", [key("demo", ".sgs-demo__close", "min-width")], 0, "house"),
        "block with no size setting": ("plain", ".sgs-plain__btn { min-height: 44px; }", [], 0, "auto-house"),
        "fallback the setting prints": ("demo", ".sgs-demo__link { min-height: var(--sgs-demo-tap, 44px); }", [], 0, None),
        "nested fallback the setting prints": ("demo", ".sgs-demo__link { min-height: var(--sgs-demo-own, var(--sgs-demo-tap, 44px)); }", [], 0, None),
        "theme token fallback": ("demo", ".sgs-demo__link { min-height: var(--wp--custom--button--min-height, 44px); }", [], 0, None),
        "fallback nobody prints": ("demo", ".sgs-demo__link { min-height: var(--sgs-demo-ghost, 44px); }", [], 1, None),
        "44px in a comment only": ("demo", "/* min-height: 44px */ .sgs-demo__link { color: red; }", [], 0, None),
        "44px on a non-size property": ("demo", ".sgs-demo__link { padding: 44px; line-height: 44px; }", [], 0, None),
        "440px is not 44px": ("demo", ".sgs-demo__panel { max-width: 440px; }", [], 0, None),
        "hit-area arithmetic in inset": ("demo", ".sgs-demo__burger::after { inset: min(0px, calc((100% - 44px) / 2)); }", [], 1, "unclassified"),
        "plain 44px padding is not a floor": ("demo", ".sgs-demo__inner { padding: 40px 44px; }", [], 0, None),
        "same selector in @media is its own floor": ("demo", ".sgs-demo__close { min-width: 44px; } @media (max-width: 600px) { .sgs-demo__close { min-width: 44px; } }", [key("demo", ".sgs-demo__close", "min-width")], 1, "house"),
        "stale register entry": ("demo", ".sgs-demo__link { color: red; }", [key("demo", ".sgs-demo__gone", "min-width")], 1, None),
    }
    sized = {"demo": ["shapeSize"]}
    printed = "$d[] = '--sgs-demo-tap:0px'; $d[] = '--sgs-demo-own:' . $v;"
    failed = 0
    for name, (folder, css, reg, want_findings, want_class) in cases.items():
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / "src" / "blocks"
            (root / folder).mkdir(parents=True)
            (root / folder / "style.css").write_text(css, encoding="utf-8")
            result = scan(root, sized, {k: "fixture" for k in reg}, printed)
        got_class = result["floors"][0]["class"] if result["floors"] else None
        ok = len(result["findings"]) == want_findings and got_class == want_class
        failed += 0 if ok else 1
        print(f"{'ok  ' if ok else 'FAIL'} {name}: {len(result['findings'])} finding(s), class {got_class}")
    php_cases = {
        # name: (relative path under the fixture plugin, PHP source, expected findings)
        "shared helper floor": ("includes/demo-css.php", "<?php $css .= $sel . '{min-height:44px;padding:0;}';", 1),
        "block render max() floor": ("src/blocks/demo/render.php", "<?php return 'max(44px,' . $length . ')';", 1),
        "block render min floor, sized block": ("src/blocks/demo/render.php", "<?php $d[] = 'min-width:44px';", 1),
        "render fallback the setting prints": ("includes/demo-css.php", "<?php $css .= '{min-height:var(--sgs-demo-tap, 44px);}';", 0),
        "commented-out floor": ("includes/demo-css.php", "<?php\n// min-height:44px is the default.", 0),
    }
    for name, (rel, src, want_findings) in php_cases.items():
        with tempfile.TemporaryDirectory() as tmp:
            plugin = Path(tmp)
            (plugin / "src" / "blocks" / "demo").mkdir(parents=True)
            (plugin / "includes").mkdir()
            (plugin / rel).write_text(src, encoding="utf-8")
            result = scan(plugin / "src" / "blocks", sized, {}, printed)
        ok = len(result["findings"]) == want_findings
        failed += 0 if ok else 1
        print(f"{'ok  ' if ok else 'FAIL'} {name}: {len(result['findings'])} finding(s)")
    # The live register must name only blocks that exist, and give every entry a reason.
    data = json.loads(REGISTER.read_text(encoding="utf-8"))
    for e in data["house"]:
        if not e.get("reason", "").strip() or not any(BLOCKS.glob(f"**/{e['block']}/style.css")) and not (BLOCKS / e["block"]).exists():
            failed += 1
            print(f"FAIL register entry without a reason or block: {e}")
    print(f"\ncheck-tap-floors --self-test: {'OK' if not failed else f'FAIL ({failed})'}")
    return 1 if failed else 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--survey", action="store_true")
    g.add_argument("--check", action="store_true")
    g.add_argument("--self-test", action="store_true")
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()
    if a.survey:
        return cmd_survey(a.json)
    if a.check:
        return cmd_check()
    return cmd_self_test()


if __name__ == "__main__":
    sys.exit(main())
