#!/usr/bin/env python3
"""Detector: inspector spacing controls that still use a raw numeric/text input.

A control whose label names a spacing length (gap, padding, margin, spacing,
space between) must be the shared token control (SpacingControl, SgsBoxControl,
ResponsiveBoxControl), never a RangeControl / UnitControl / NumberControl /
TextControl (core or the SGS primitives re-exports), which store a raw unit and
bypass the theme spacing presets.

Read-only, stdlib only. Scans plugins/sgs-blocks/src/**/*.js (not tests).
A SgsBoxControl / ResponsiveBoxControl with such a label but no `presets` prop is
reported too: it offers raw units only and no theme spacing tokens.
Usage:  python check-raw-spacing-controls.py [--check]
Prints file:line label (component) for every offender; with --check exits 1
when any remain. Allowlist entries live in ALLOW below (path suffix, label
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
    ("blocks/extensions/fx.js", "Spacing", "dot pitch of the grid-cell effect (12 to 200 px between drawn dots), an effect parameter, not a layout spacing token"),
    ("components/GridDotFieldRowControls.js", "Spacing", "dot pitch of the dot-grid field effect, an effect parameter, not a layout spacing token"),
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


def main() -> int:
    total = 0
    for path in sorted(SRC.rglob("*.js")):
        if ".test." in path.name or "node_modules" in path.parts:
            continue
        for line, label, comp in scan(path):
            total += 1
            print(f"{path.relative_to(SRC.parent).as_posix()}:{line}  '{label}'  ({comp})")
    print(f"raw spacing controls: {total}")
    return 1 if (total and "--check" in sys.argv) else 0


if __name__ == "__main__":
    sys.exit(main())
