#!/usr/bin/env python3
"""check-link-source-adoption.py — every shared link field offers the link source choice.

THE RULE: a link an editor fills in through the shared `LinkPopoverField`
(`src/components/LinkPopoverControl.js`) offers the "Link to" choice (a typed URL, a
page or post on this site, a Site Info link, back to top) by passing `linkSources`,
and its render path resolves the stored `<urlAttr>Source` sibling through
`includes/helpers-link-source.php`. A field without it sends editors back to typing
`tel:` numbers and Google URLs by hand, which go stale when Site Info or a page
address changes.

WHAT IT FLAGS: a `<LinkPopoverField …/>` element under src/ with no `linkSources`
prop that is not in EXEMPT below. Each exemption names the file, a snippet of the
field's label and the reason the choice does not belong there.

THE TRIAD
  --survey     list every call site with its state (adopted / exempt / missing)
  --check      exit 1 on a missing call site or an exemption that no longer matches
  --self-test  positive and negative fixtures, proving it can still fail

Run from plugins/sgs-blocks:  python scripts/check-link-source-adoption.py --check
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

PLUGIN = Path(__file__).resolve().parents[1]
SRC = PLUGIN / "src"
COMPONENT = "src/components/LinkPopoverControl.js"

# (file relative to plugins/sgs-blocks, label snippet) -> reason.
EXEMPT = {
    ("src/blocks/icon/inspector.js", "Fallback link (used when Site Info is empty)"): (
        "The bound icon's own link already comes from Site Info through its linkUrl binding; "
        "this field is only the typed fallback for an empty Site Info field, so a second source "
        "would be a second Site Info mechanism on the same link."
    ),
}

OPEN_TAG = re.compile(r"<LinkPopoverField\b")
LABEL = re.compile(r"label=\{\s*(?:__\(\s*)?([\"'])(.*?)\1", re.S)


def element_text(text: str, start: int) -> str:
    """The `<LinkPopoverField …/>` element starting at `start`, ending at the first `/>` outside braces."""
    depth = 0
    i = start
    while i < len(text) - 1:
        ch = text[i]
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
        elif depth == 0 and ch == "/" and text[i + 1] == ">":
            return text[start : i + 2]
        i += 1
    return text[start:]


BLOCK_COMMENT = re.compile(r"/\*.*?\*/", re.S)
# A `//` comment, but not the `//` of a URL scheme (`https://`) inside a string.
LINE_COMMENT = re.compile(r"(?<![:\w\"'])//[^\n]*")


def strip_comments(text: str) -> str:
    """Comments blanked to spaces, newlines kept, so a tag named in a comment is not a call site."""
    blank = lambda m: re.sub(r"[^\n]", " ", m.group(0))  # noqa: E731
    return LINE_COMMENT.sub(blank, BLOCK_COMMENT.sub(blank, text))


def call_sites(text: str):
    """(line, label, adopted) for every LinkPopoverField element in one file's text."""
    text = strip_comments(text)
    out = []
    for m in OPEN_TAG.finditer(text):
        el = element_text(text, m.start())
        label_m = LABEL.search(el)
        out.append((text.count("\n", 0, m.start()) + 1, label_m.group(2) if label_m else "", "linkSources=" in el))
    return out


def classify(rel: str, label: str, adopted: bool) -> tuple[str, str]:
    if adopted:
        return "adopted", ""
    for (path, snippet), reason in EXEMPT.items():
        if path == rel and snippet in label:
            return "exempt", reason
    return "missing", ""


def survey():
    rows = []
    for path in sorted(SRC.rglob("*.js")):
        rel = path.relative_to(PLUGIN).as_posix()
        if rel == COMPONENT or "/node_modules/" in rel:
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        if "<LinkPopoverField" not in text:
            continue
        for line, label, adopted in call_sites(text):
            state, reason = classify(rel, label, adopted)
            rows.append((rel, line, label, state, reason))
    return rows


def check(rows) -> int:
    missing = [r for r in rows if r[3] == "missing"]
    used = {(r[0], s) for r in rows if r[3] == "exempt" for (p, s) in EXEMPT if p == r[0] and s in r[2]}
    stale = [key for key in EXEMPT if key not in used]
    for rel, line, label, _, _ in missing:
        print(f"MISSING  {rel}:{line}  '{label}' — pass linkSources (and resolve its source in render) or add an EXEMPT entry with a reason")
    for rel, snippet in stale:
        print(f"STALE EXEMPTION  {rel} '{snippet}' matches no call site; delete it")
    adopted = sum(1 for r in rows if r[3] == "adopted")
    exempt = sum(1 for r in rows if r[3] == "exempt")
    print(f"[link-source-adoption] {len(rows)} call sites: {adopted} adopted, {exempt} exempt, {len(missing)} missing, {len(stale)} stale exemption(s)")
    return 1 if missing or stale else 0


def self_test() -> int:
    adopted = "<LinkPopoverField label={ __( 'Link', 'sgs-blocks' ) } linkSources={ X } renderExtraFields={ () => ( <TextControl /> ) } />"
    nested_without = "<LinkPopoverField label={ __( 'Link', 'sgs-blocks' ) } renderExtraFields={ () => ( <TextControl linkSources={ X } /> ) } />"
    missing = "<LinkPopoverField label={ __( 'Button link', 'sgs-blocks' ) } value={ url } />\n<Other linkSources={ X } />"
    exempt = "<LinkPopoverField label={ __( 'Fallback link (used when Site Info is empty)', 'sgs-blocks' ) } />"
    cases = [
        ("adopted field", call_sites(adopted), [(1, "Link", True)]),
        # The brace-aware end must not stop at the nested TextControl's `/>`, so a nested prop still counts as inside.
        ("prop inside nested JSX still belongs to the element", call_sites(nested_without), [(1, "Link", True)]),
        ("missing field; a later element's prop does not leak in", call_sites(missing), [(1, "Button link", False)]),
        ("a tag named in a comment is not a call site", call_sites("/** Mounts a `<LinkPopoverField ... />` */\n// <LinkPopoverField />\n"), []),
        ("a URL in a string is not a comment", call_sites("<LinkPopoverField help={ 'https://x.test' } />"), [(1, "", False)]),
    ]
    failed = 0
    for name, got, want in cases:
        ok = got == want
        failed += 0 if ok else 1
        print(("PASS  " if ok else "FAIL  ") + name + ("" if ok else f"  got {got}"))
    states = [
        ("missing classifies as missing", classify("src/blocks/x/edit.js", "Button link", False)[0], "missing"),
        ("listed exemption classifies as exempt", classify("src/blocks/icon/inspector.js", call_sites(exempt)[0][1], False)[0], "exempt"),
        ("an exemption does not cover another file", classify("src/blocks/y/edit.js", "Fallback link (used when Site Info is empty)", False)[0], "missing"),
    ]
    for name, got, want in states:
        ok = got == want
        failed += 0 if ok else 1
        print(("PASS  " if ok else "FAIL  ") + name)
    rows = [("src/blocks/x/edit.js", 1, "Button link", "missing", "")]
    gate_red = check(rows) == 1
    failed += 0 if gate_red else 1
    print(("PASS  " if gate_red else "FAIL  ") + "NEGATIVE CONTROL: --check exits 1 on a missing call site")
    print(f"\n{'OK' if not failed else 'FAILED'}: self-test")
    return 1 if failed else 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--survey", action="store_true")
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--self-test", action="store_true")
    args = ap.parse_args()
    if args.self_test:
        return self_test()
    rows = survey()
    if args.survey:
        for rel, line, label, state, reason in rows:
            print(f"{state:8} {rel}:{line}  '{label}'" + (f"  ({reason})" if reason else ""))
    if args.check or not args.survey:
        return check(rows)
    return 0


if __name__ == "__main__":
    sys.exit(main())
