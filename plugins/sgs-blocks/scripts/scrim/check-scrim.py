#!/usr/bin/env python3
"""
check-scrim.py — the viewport-scrim detector (Wave 3C U-2, family M-14).

Design: `.claude/reports/2026-09-24-u2-scrim-design.md` (Addendum A: one shared scrim
for every block that dims the viewport). More than three blocks adopt it, so the
detector comes first (`.claude/THE-MIGRATION-METHOD.md`).

A SCRIM is the see-through layer that dims the page behind an open drawer, dialog or
panel. Every SGS block that paints one must paint it through the shared helper
`includes/helpers-scrim.php::sgs_scrim_render`, driven by four attributes, so a client
can set its colour, strength and blur per device in the editor.

CANDIDATES (a block is a scrim candidate when ANY of these hold):
  - its `style.css` has a rule whose selector contains `::backdrop` or `__scrim`
  - a file in its directory calls `showModal(` or renders a `<dialog`
  - its `block.json` declares `supports.sgs.scrim`

RULES (each finding names the block and the rule):
  R1 not-adopted   a candidate without `supports.sgs.scrim` (unless EXEMPT below)
  R2 attrs         an adopter missing one of the four attributes, or with the wrong type
  R3 paint         a hardcoded dimmer paint in the adopter's `style.css`: a `::backdrop`,
                   `__scrim` or `supports.sgs.scrim.owner` rule whose background /
                   background-color / background-image / backdrop-filter is anything
                   other than transparent / none / a `--sgs-scrim-*` variable
  R4 helper        no `sgs_scrim_render(` call in the adopter's PHP (its own directory,
                   or an `includes/*.php` file that renders its `sgs-<block>` markup)
  R5 editor        no `ScrimControls` reference in the adopter's editor JS

    python scripts/scrim/check-scrim.py --survey         table of candidates and findings
    python scripts/scrim/check-scrim.py --fix [--apply]  add the four attribute declarations
                                                          to adopters missing them (dry run
                                                          without --apply)
    python scripts/scrim/check-scrim.py --check          gate: exit 1 on any finding
    python scripts/scrim/check-scrim.py --self-test      fixtures prove each rule fires, plus
                                                          a disabled-rule negative control

`--fix` only ever writes `block.json` attribute declarations, with neutral defaults; each
adopter's own default look (for example the drawer's 0.55 black) is set by hand after.

UK English throughout.
"""
from __future__ import annotations

import argparse
import json
import re
import shutil
import sys
import tempfile
from pathlib import Path

if sys.stdout.encoding is None or sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

HERE = Path(__file__).resolve().parent           # plugins/sgs-blocks/scripts/scrim/
PLUGIN = HERE.parents[1]                          # plugins/sgs-blocks/
BLOCKS_DIR = PLUGIN / "src" / "blocks"
INCLUDES_DIR = PLUGIN / "includes"

# The four attributes and their block.json types. Names and types are fixed by the design.
ATTRS = {
    "scrimColour": "string",
    "scrimColourGradient": "string",
    "scrimOpacity": "object",
    "scrimBlur": "object",
}
NEUTRAL_DEFAULTS = {"string": '""', "object": "{}"}

# Candidates that are NOT scrims, each with its reason (reviewed, not silent).
EXEMPT: dict[str, str] = {}

PAINT_PROPS = ("background", "background-color", "background-image", "backdrop-filter", "-webkit-backdrop-filter")
ALLOWED_VALUE = re.compile(r"^\s*(transparent|none|var\(\s*--sgs-scrim-[a-z0-9-]+[^)]*\))\s*$", re.I)


def _strip_css_comments(css: str) -> str:
    return re.sub(r"/\*.*?\*/", "", css, flags=re.S)


def _strip_code_comments(src: str) -> str:
    src = re.sub(r"/\*.*?\*/", "", src, flags=re.S)
    return re.sub(r"(?m)(^|\s)//[^\n]*", r"\1", src)


def css_rules(css: str):
    """Yield (selector, body) for every innermost rule, descending into @media blocks."""
    css = _strip_css_comments(css)
    depth, start, stack = 0, 0, []
    for i, ch in enumerate(css):
        if ch == "{":
            stack.append((css[start:i].strip(), i + 1))
            start = i + 1
        elif ch == "}":
            if not stack:
                continue
            selector, body_start = stack.pop()
            body = css[body_start:i]
            if "{" not in body and not selector.startswith("@"):
                yield selector, body
            start = i + 1
        elif ch == ";" and not stack:
            start = i + 1


def declarations(body: str):
    for decl in body.split(";"):
        if ":" in decl:
            prop, value = decl.split(":", 1)
            yield prop.strip().lower(), value.strip()


def load_block_json(block_dir: Path) -> dict:
    path = block_dir / "block.json"
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}


def scrim_support(meta: dict):
    return ((meta.get("supports") or {}).get("sgs") or {}).get("scrim")


def is_candidate(block_dir: Path, meta: dict) -> list[str]:
    reasons = []
    style = block_dir / "style.css"
    if style.exists():
        for selector, _ in css_rules(style.read_text(encoding="utf-8")):
            if "::backdrop" in selector or "__scrim" in selector:
                reasons.append("style.css scrim selector")
                break
    for f in list(block_dir.glob("*.js")) + list(block_dir.glob("*.php")):
        src = _strip_code_comments(f.read_text(encoding="utf-8", errors="replace"))
        if "showModal(" in src or re.search(r"<dialog[\s>]", src):
            reasons.append(f"{f.name} opens a dialog")
            break
    if scrim_support(meta) is not None:
        reasons.append("declares supports.sgs.scrim")
    return reasons


def php_sources(block_dir: Path, includes_dir: Path, slug: str) -> list[Path]:
    files = list(block_dir.glob("*.php"))
    marker = f"sgs-{slug}"
    if includes_dir.exists():
        for inc in includes_dir.glob("*.php"):
            text = inc.read_text(encoding="utf-8", errors="replace")
            if marker in text:
                files.append(inc)
    return files


def findings_for(block_dir: Path, includes_dir: Path) -> tuple[list[str], list[str]]:
    """Return (candidate_reasons, findings) for one block directory."""
    meta = load_block_json(block_dir)
    reasons = is_candidate(block_dir, meta)
    if not reasons:
        return [], []
    slug = block_dir.name
    if slug in EXEMPT:
        return reasons, []
    support = scrim_support(meta)
    if support is None:
        return reasons, ["R1 not-adopted: no supports.sgs.scrim"]
    out = []
    attrs = meta.get("attributes") or {}
    for name, typ in ATTRS.items():
        if name not in attrs:
            out.append(f"R2 attrs: missing {name}")
        elif attrs[name].get("type") != typ:
            out.append(f"R2 attrs: {name} type is {attrs[name].get('type')!r}, expected {typ!r}")
    owner = support.get("owner", "") if isinstance(support, dict) else ""
    style = block_dir / "style.css"
    if style.exists():
        for selector, body in css_rules(style.read_text(encoding="utf-8")):
            targets = ("::backdrop" in selector or "__scrim" in selector
                       or (owner and re.search(re.escape(owner) + r"(?![\w-])", selector)))
            if not targets:
                continue
            for prop, value in declarations(body):
                if prop in PAINT_PROPS and not ALLOWED_VALUE.match(value):
                    out.append(f"R3 paint: {selector} {{{prop}: {value}}}")
    php = "\n".join(_strip_code_comments(p.read_text(encoding="utf-8", errors="replace"))
                    for p in php_sources(block_dir, includes_dir, slug))
    if "sgs_scrim_render(" not in php:
        out.append("R4 helper: no sgs_scrim_render( call")
    js = "\n".join(f.read_text(encoding="utf-8", errors="replace")
                   for f in block_dir.rglob("*.js") if f.name != "view.js")
    if "ScrimControls" not in js:
        out.append("R5 editor: no ScrimControls in the editor JS")
    return reasons, out


def scan(blocks_dir: Path = BLOCKS_DIR, includes_dir: Path = INCLUDES_DIR) -> dict:
    result = {}
    for block_dir in sorted(p for p in blocks_dir.iterdir() if p.is_dir()):
        reasons, found = findings_for(block_dir, includes_dir)
        if reasons:
            result[block_dir.name] = {"why": reasons, "findings": found,
                                      "exempt": EXEMPT.get(block_dir.name)}
    return result


def cmd_survey() -> int:
    data = scan()
    print(f"{'block':22} {'adopted':8} findings")
    for slug, row in data.items():
        adopted = "exempt" if row["exempt"] else ("no" if any(f.startswith("R1") for f in row["findings"]) else "yes")
        print(f"{slug:22} {adopted:8} {len(row['findings'])}  ({'; '.join(row['why'])})")
        for f in row["findings"]:
            print(f"{'':32}- {f}")
    total = sum(len(r["findings"]) for r in data.values())
    print(f"\n{len(data)} candidate blocks, {total} findings")
    return 0


def cmd_check() -> int:
    data = scan()
    bad = {s: r["findings"] for s, r in data.items() if r["findings"]}
    if not bad:
        print(f"check-scrim: OK ({len(data)} candidate blocks, 0 findings)")
        return 0
    for slug, found in bad.items():
        for f in found:
            print(f"check-scrim: {slug}: {f}")
    print(f"check-scrim: FAIL ({sum(len(v) for v in bad.values())} findings)")
    return 1


def fixed_block_json(text: str) -> str | None:
    """Insert missing scrim attribute declarations at the top of `attributes`."""
    meta = json.loads(text)
    if scrim_support(meta) is None:
        return None
    attrs = meta.get("attributes") or {}
    missing = [n for n in ATTRS if n not in attrs]
    if not missing:
        return None
    newline = "\r\n" if "\r\n" in text else "\n"
    m = re.search(r'"attributes"\s*:\s*\{(\r?\n)([ \t]+)', text)
    if not m:
        return None
    key_indent = m.group(2)
    unit = "\t" if key_indent.startswith("\t") else "  "
    lines = []
    for name in missing:
        typ = ATTRS[name]
        lines.append(f'{key_indent}"{name}": {{{newline}{key_indent}{unit}"type": "{typ}",'
                     f'{newline}{key_indent}{unit}"default": {NEUTRAL_DEFAULTS[typ]}{newline}{key_indent}}},')
    insert = newline.join(lines) + newline
    pos = m.end(1)
    return text[:pos] + insert + text[pos:]


def cmd_fix(apply: bool) -> int:
    changed = 0
    for block_dir in sorted(p for p in BLOCKS_DIR.iterdir() if p.is_dir()):
        path = block_dir / "block.json"
        if not path.exists():
            continue
        raw = path.read_bytes().decode("utf-8")
        new = fixed_block_json(raw)
        if new is None:
            continue
        json.loads(new)  # never write invalid JSON
        changed += 1
        print(f"{'WRITE' if apply else 'WOULD WRITE'} {path.relative_to(PLUGIN)}")
        if apply:
            path.write_bytes(new.encode("utf-8"))
    print(f"check-scrim --fix: {changed} block.json file(s) {'updated' if apply else 'to update (dry run)'}")
    return 0


# ---------------------------------------------------------------------------
# Self-test
# ---------------------------------------------------------------------------
GOOD_JSON = {
    "name": "sgs/good", "supports": {"sgs": {"scrim": {"open": "[open]"}}},
    "attributes": {"scrimColour": {"type": "string"}, "scrimColourGradient": {"type": "string"},
                   "scrimOpacity": {"type": "object"}, "scrimBlur": {"type": "object"}},
}


def _make_block(root: Path, slug: str, meta: dict | None, css: str = "", php: str = "", js: str = "") -> None:
    d = root / slug
    d.mkdir(parents=True)
    if meta is not None:
        (d / "block.json").write_text(json.dumps(meta, indent="\t"), encoding="utf-8")
    if css:
        (d / "style.css").write_text(css, encoding="utf-8")
    if php:
        (d / "render.php").write_text(php, encoding="utf-8")
    if js:
        (d / "edit.js").write_text(js, encoding="utf-8")


def cmd_self_test() -> int:
    passed, failed = 0, 0

    def check(label, cond):
        nonlocal passed, failed
        if cond:
            passed += 1
        else:
            failed += 1
            print(f"  FAIL: {label}")

    tmp = Path(tempfile.mkdtemp(prefix="check-scrim-"))
    try:
        blocks, inc = tmp / "blocks", tmp / "includes"
        blocks.mkdir()
        inc.mkdir()
        ok_css = ".x::backdrop{background:transparent}.x-scrim::before{background:var(--sgs-scrim-fill)}"
        _make_block(blocks, "good", GOOD_JSON, ok_css, "<?php sgs_scrim_render( $a );", "ScrimControls")
        _make_block(blocks, "unadopted", {"name": "sgs/u", "attributes": {}},
                    ".u::backdrop{background-color:rgba(0,0,0,.5)}")
        bad_attrs = json.loads(json.dumps(GOOD_JSON))
        del bad_attrs["attributes"]["scrimBlur"]
        bad_attrs["attributes"]["scrimOpacity"]["type"] = "number"
        _make_block(blocks, "badattrs", bad_attrs, ok_css, "<?php sgs_scrim_render( $a );", "ScrimControls")
        _make_block(blocks, "badpaint", GOOD_JSON,
                    "@media (max-width:767px){.p::backdrop{backdrop-filter:blur(6px)}}.p__scrim{background:#000}",
                    "<?php sgs_scrim_render( $a );", "ScrimControls")
        owner_json = json.loads(json.dumps(GOOD_JSON))
        owner_json["supports"]["sgs"]["scrim"]["owner"] = ".o__lightbox"
        _make_block(blocks, "owner", owner_json, ".o__lightbox{background:color-mix(in srgb,red 90%,transparent)}.o__lightbox-close:hover{background:red}",
                    "<?php sgs_scrim_render( $a );", "ScrimControls")
        _make_block(blocks, "nohelper", GOOD_JSON, ok_css, "<?php // sgs_scrim_render( $a ) in a comment", "ScrimControls")
        _make_block(blocks, "noeditor", GOOD_JSON, ok_css, "<?php sgs_scrim_render( $a );", "")
        _make_block(blocks, "viainclude", GOOD_JSON, ok_css, "<?php echo 1;", "ScrimControls")
        (inc / "helpers-viainclude.php").write_text("<?php $c='sgs-viainclude'; sgs_scrim_render($a);", encoding="utf-8")
        _make_block(blocks, "dialogjs", {"name": "sgs/d", "attributes": {}})
        (blocks / "dialogjs" / "view.js").write_text("el.showModal();", encoding="utf-8")
        _make_block(blocks, "plain", {"name": "sgs/plain", "attributes": {}}, ".plain{background:#000}")

        data = scan(blocks, inc)
        f = lambda s: data.get(s, {}).get("findings", [])
        check("good block has no findings", "good" in data and f("good") == [])
        check("R1 fires on an unadopted ::backdrop block", any(x.startswith("R1") for x in f("unadopted")))
        check("R1 fires on a showModal() block", any(x.startswith("R1") for x in f("dialogjs")))
        check("R2 fires on a missing attribute", any("missing scrimBlur" in x for x in f("badattrs")))
        check("R2 fires on a wrong type", any("scrimOpacity type" in x for x in f("badattrs")))
        check("R3 fires inside @media on backdrop-filter", any("backdrop-filter" in x for x in f("badpaint")))
        check("R3 fires on a __scrim literal", any("__scrim" in x for x in f("badpaint")))
        check("R3 fires on the declared owner selector", any(x.startswith("R3 paint: .o__lightbox {") for x in f("owner")))
        check("R3 ignores a longer class that only starts with the owner name", not any("lightbox-close" in x for x in f("owner")))
        check("R4 fires when the call is only in a comment", any(x.startswith("R4") for x in f("nohelper")))
        check("R4 accepts a call in an include that renders the block", not any(x.startswith("R4") for x in f("viainclude")))
        check("R5 fires with no ScrimControls", any(x.startswith("R5") for x in f("noeditor")))
        check("a non-scrim block is not a candidate", "plain" not in data)

        # --fix inserts exactly the missing declarations, keeps tabs + CRLF, stays valid JSON.
        partial = '{\r\n\t"name": "sgs/f",\r\n\t"supports": {"sgs": {"scrim": {"open": "[open]"}}},\r\n\t"attributes": {\r\n\t\t"scrimColour": {\r\n\t\t\t"type": "string"\r\n\t\t}\r\n\t}\r\n}\r\n'
        fixed = fixed_block_json(partial)
        check("--fix returns new text", fixed is not None)
        if fixed:
            meta = json.loads(fixed)
            check("--fix adds the three missing attributes", all(n in meta["attributes"] for n in ATTRS))
            check("--fix keeps CRLF only", "\n" not in fixed.replace("\r\n", ""))
            check("--fix is idempotent", fixed_block_json(fixed) is None)
        check("--fix leaves a non-adopter alone", fixed_block_json('{"attributes": {\n\t"a": {}\n}}') is None)

        # Negative control: disable R3 by widening the allow-list, prove the fixture then passes.
        global ALLOWED_VALUE
        saved = ALLOWED_VALUE
        ALLOWED_VALUE = re.compile(r".*")
        try:
            disabled = scan(blocks, inc)
            check("negative control: a disabled R3 misses the hardcoded paint",
                  not any(x.startswith("R3") for x in disabled["badpaint"]["findings"]))
        finally:
            ALLOWED_VALUE = saved
        check("R3 is live again after the control", any(x.startswith("R3") for x in scan(blocks, inc)["badpaint"]["findings"]))
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

    print(f"check-scrim --self-test: {passed} passed, {failed} failed")
    return 0 if failed == 0 else 1


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--survey", action="store_true")
    group.add_argument("--fix", action="store_true")
    group.add_argument("--check", action="store_true")
    group.add_argument("--self-test", action="store_true")
    parser.add_argument("--apply", action="store_true", help="with --fix: write the files")
    args = parser.parse_args()
    if args.survey:
        return cmd_survey()
    if args.fix:
        return cmd_fix(args.apply)
    if args.check:
        return cmd_check()
    return cmd_self_test()


if __name__ == "__main__":
    sys.exit(main())
