#!/usr/bin/env python3
"""Detector: inspector spacing controls that still use a raw numeric/text input.

A control whose label names a spacing length (gap, padding, margin, spacing,
space between) must be the shared token control (SgsLengthControl for a single
length, SgsBoxControl / ResponsiveBoxControl for sides), never a RangeControl /
UnitControl / NumberControl / TextControl (core or the SGS primitives
re-exports), which store a raw unit and bypass the theme spacing presets.

Any `<SpacingControl` mount is also a finding: SgsLengthControl is the one
length control. --fix rewrites a mount with the same stored values (`custom`
becomes `presets`, `freeInput` is dropped, a mount with neither gains
`presets`); a dynamic `custom={...}` or `freeInput={...}` is refused and left
for a hand edit.

Read-only, stdlib only. Scans plugins/sgs-blocks/src/**/*.js (not tests).
A SgsBoxControl / ResponsiveBoxControl with such a label but no `presets` prop is
reported too: it offers raw units only and no theme spacing tokens.
Usage:  python check-raw-spacing-controls.py [--check | --fix | --self-test]
Prints file:line label (component) for every offender; with --check exits 1
when any remain; --fix rewrites every SpacingControl mount and its import;
--self-test proves the rewrite and the scan on in-memory samples. Allowlist entries live in ALLOW below (path suffix, label
substring) with the reason they are legitimate.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

SRC = Path(__file__).resolve().parent.parent / "src"

RAW = {"RangeControl", "UnitControl", "NumberControl", "TextControl", "NumberInput"}
# Token boxes that must opt in to the theme spacing scale with the `presets` prop.
BOX = {"SgsBoxControl", "ResponsiveBoxControl"}
PRESETS_RE = re.compile(chr(92) + "bpresets" + chr(92) + "b")
LABEL_RE = re.compile(r"gap|padding|margin|spacing|space between", re.I)
# Letter/word/line spacing, column counts etc. are typography or counts, not CSS box lengths.
NOT_LENGTH_LABEL_RE = re.compile(r"letter spacing|word spacing|line spacing|line height|tracking", re.I)

# (path suffix, label substring, reason)
ALLOW: list[tuple[str, str, str]] = [
    ("blocks/image-sequence/edit.js", "Filename zero-padding", "the digit count of a frame filename (frame-001), not a CSS length"),
]

TAG_RE = re.compile(r"<([A-Z][A-Za-z0-9_.]*)\b")
LABEL_PROP_RE = re.compile(
    r"\blabel\s*=\s*(?:\{\s*(?:__\(\s*)?)?(['\"`])((?:\\.|(?!\1).)*)\1", re.S
)


def tag_span(text: str, start: int) -> str:
    """Return the opening-tag source from '<' to its closing '>' (brace/quote aware)."""
    depth = 0
    quote = ""
    i = start
    n = len(text)
    while i < n:
        c = text[i]
        if quote:
            if c == "\\":
                i += 2
                continue
            if c == quote:
                quote = ""
        elif c in "'\"`":
            quote = c
        elif c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
        elif c == ">" and depth == 0:
            return text[start : i + 1]
        i += 1
    return text[start:]


def scan(path: Path) -> list[tuple[int, str, str]]:
    text = path.read_text(encoding="utf-8", errors="replace")
    hits: list[tuple[int, str, str]] = []
    rel = path.relative_to(SRC).as_posix()
    for m in TAG_RE.finditer(text):
        name = m.group(1).split(".")[-1]
        if name not in RAW and name not in BOX:
            continue
        line_start = text.rfind(chr(10), 0, m.start()) + 1
        if text[line_start : m.start()].lstrip().startswith("*"):
            continue  # a JSX example inside a doc comment
        span = tag_span(text, m.start())
        if name in BOX and PRESETS_RE.search(span):
            continue
        lm = LABEL_PROP_RE.search(span)
        if not lm:
            continue
        label = lm.group(2)
        if not LABEL_RE.search(label) or NOT_LENGTH_LABEL_RE.search(label):
            continue
        if any(rel.endswith(p) and sub.lower() in label.lower() for p, sub, _ in ALLOW):
            continue
        line = text.count("\n", 0, m.start()) + 1
        hits.append((line, label, name))
    return hits


OLD_NAME = "SpacingControl"
NEW_NAME = "SgsLengthControl"
OLD_TAG_RE = re.compile(r"<SpacingControl\b")
DYNAMIC_FLAG_RE = re.compile(r"\b(?:custom|freeInput)\s*=")
IMPORT_RE = re.compile(r"import\s*\{([^}]*)\}\s*from\s*(['\"])([^'\"]*)\2\s*;?", re.S)
FREE_RE = re.compile(r"(?<![\w-])freeInput(?![\w-])")
CUSTOM_RE = re.compile(r"(?<![\w-])custom(?![\w-])")


def line_is_comment(text: str, pos: int) -> bool:
    line_start = text.rfind(chr(10), 0, pos) + 1
    return text[line_start:pos].lstrip().startswith(("*", "//"))


def old_mounts(text: str) -> list[int]:
    """Offsets of every real `<SpacingControl` mount (a JSX example in a doc comment is skipped)."""
    return [m.start() for m in OLD_TAG_RE.finditer(text) if not line_is_comment(text, m.start())]


def drop_flag(span: str, flag_re: re.Pattern[str]) -> str:
    """Remove a bare boolean prop, taking its whole line when it sits alone on one."""
    alone = re.compile(r"\r?\n[ \t]*" + flag_re.pattern + r"[ \t]*(?=\r?\n)")
    if alone.search(span):
        return alone.sub("", span, count=1)
    return re.sub(r"[ \t]+" + flag_re.pattern, "", span, count=1)


def rewrite_tag(span: str) -> str | None:
    """Rewrite one opening tag, or None when a prop is dynamic. Same stored values: `custom` becomes `presets`, `freeInput` is dropped (presets off)."""
    if DYNAMIC_FLAG_RE.search(span):
        return None
    out = span.replace("<" + OLD_NAME, "<" + NEW_NAME, 1)
    if FREE_RE.search(out):
        out = drop_flag(out, FREE_RE)
        if CUSTOM_RE.search(out):
            out = drop_flag(out, CUSTOM_RE)
        return out
    if CUSTOM_RE.search(out):
        return CUSTOM_RE.sub("presets", out, count=1)
    # A bare dropdown (neither prop) keeps its preset list.
    return out.replace("<" + NEW_NAME, "<" + NEW_NAME + " presets", 1)


def rewrite_import(text: str) -> str:
    """Swap the SpacingControl import specifier for SgsLengthControl, or drop it when SgsLengthControl is already imported."""
    has_new = any(re.search(r"\b" + NEW_NAME + r"\b", m.group(1)) for m in IMPORT_RE.finditer(text))
    old = r"\b" + OLD_NAME + r"\b"

    def sub(m: re.Match[str]) -> str:
        names = m.group(1)
        if not re.search(old, names):
            return m.group(0)
        if not has_new:
            names = re.sub(old, NEW_NAME, names, count=1)
        elif re.search(old + r"\s*,", names):
            names = re.sub(old + r"\s*,\s*", "", names, count=1)
        else:
            names = re.sub(r",\s*" + old, "", names, count=1)
        return m.group(0).replace(m.group(1), names, 1)

    return IMPORT_RE.sub(sub, text)


def fix_text(text: str) -> tuple[str, int, int]:
    """Return (new text, mounts rewritten, mounts refused)."""
    done = refused = 0
    for start in reversed(old_mounts(text)):
        span = tag_span(text, start)
        new = rewrite_tag(span)
        if new is None:
            refused += 1
            continue
        text = text[:start] + new + text[start + len(span):]
        done += 1
    if done and not old_mounts(text):
        text = rewrite_import(text)
    return text, done, refused


def source_files() -> list[Path]:
    return [
        p for p in sorted(SRC.rglob("*.js"))
        if ".test." not in p.name and "node_modules" not in p.parts
    ]


def run_fix() -> int:
    total_done = total_refused = 0
    for path in source_files():
        text = path.read_bytes().decode("utf-8")
        if not old_mounts(text):
            continue
        new, done, refused = fix_text(text)
        total_done += done
        total_refused += refused
        if new != text:
            path.write_bytes(new.encode("utf-8"))
        print(f"{path.relative_to(SRC.parent).as_posix()}: rewrote {done}, refused {refused}")
    print(f"SpacingControl mounts rewritten: {total_done}, refused: {total_refused}")
    return 1 if total_refused else 0


def run_self_test() -> int:
    failures: list[str] = []

    def expect(name: str, got: object, want: object) -> None:
        if got != want:
            failures.append(f"{name}: got {got!r}, want {want!r}")

    imp = "import { A, SpacingControl, B } from '../../components';\n"
    custom = imp + "<SpacingControl\n\tcustom\n\tlabel='x'\n/>\n"
    out, done, refused = fix_text(custom)
    expect("custom becomes presets", ("<SgsLengthControl\n\tpresets\n\tlabel='x'\n/>" in out, done, refused), (True, 1, 0))
    expect("import renamed", "A, SgsLengthControl, B" in out, True)

    free = "import { SpacingControl } from '../c';\n<SpacingControl\n\tfreeInput\n\tvalue={ v }\n/>\n"
    out, done, refused = fix_text(free)
    expect("freeInput dropped", ("presets" not in out and "<SgsLengthControl\n\tvalue={ v }" in out, done), (True, 1))

    inline = "import { SpacingControl } from '../c';\n<SpacingControl freeInput value={ v } />\n"
    out, _, _ = fix_text(inline)
    expect("inline freeInput", "<SgsLengthControl value={ v } />" in out, True)

    bare = "import { SpacingControl } from '../c';\n<SpacingControl label='x' value={ v } />\n"
    out, _, _ = fix_text(bare)
    expect("bare gains presets", "<SgsLengthControl presets label='x'" in out, True)

    both = "import { SgsLengthControl, SpacingControl } from '../c';\n<SpacingControl custom value={ v } />\n<SgsLengthControl />\n"
    out, _, _ = fix_text(both)
    expect("import dedup", "import { SgsLengthControl } from '../c';" in out, True)

    first = "import {\n\tSpacingControl,\n\tSgsLengthControl,\n} from '../c';\n<SpacingControl custom />\n"
    out, _, _ = fix_text(first)
    expect("import dedup first", "SpacingControl" not in out and "SgsLengthControl,\n}" in out, True)

    dynamic = "import { SpacingControl } from '../c';\n<SpacingControl custom={ on } value={ v } />\n"
    out, done, refused = fix_text(dynamic)
    expect("dynamic refused", (out, done, refused), (dynamic, 0, 1))

    expect("doc comment skipped", old_mounts(" *   <SpacingControl custom />\n"), [])
    expect("real mount found", len(old_mounts("<SpacingControl custom />")), 1)
    expect("idempotent", fix_text(fix_text(custom)[0])[1], 0)

    if failures:
        print("self-test FAILED:")
        for f in failures:
            print("  " + f)
        return 1
    print("self-test passed")
    return 0


def main() -> int:
    if "--self-test" in sys.argv:
        return run_self_test()
    if "--fix" in sys.argv:
        return run_fix()
    total = 0
    for path in source_files():
        text = path.read_text(encoding="utf-8", errors="replace")
        for start in old_mounts(text):
            total += 1
            line = text.count(chr(10), 0, start) + 1
            print(f"{path.relative_to(SRC.parent).as_posix()}:{line}  '<SpacingControl>'  (retired; run --fix)")
        for line, label, comp in scan(path):
            total += 1
            print(f"{path.relative_to(SRC.parent).as_posix()}:{line}  '{label}'  ({comp})")
    print(f"raw spacing controls: {total}")
    return 1 if (total and "--check" in sys.argv) else 0


if __name__ == "__main__":
    sys.exit(main())
