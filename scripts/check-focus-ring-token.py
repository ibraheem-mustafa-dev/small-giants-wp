#!/usr/bin/env python3
"""
check-focus-ring-token.py: every keyboard focus ring is drawn from the focus-ring token.

THE RULE
--------
A rule whose selector contains `:focus`, `:focus-visible` or `:focus-within` may only colour its
focus ring (`outline`, `outline-color`, `box-shadow`, `border-color`) from the focus-ring token:

    --wp--custom--focus-ring--color-*   (theme.json settings.custom.focus-ring)
    --sgs-focus-color                   (theme: core-blocks-critical.css)
    --sgs-focus-glow                    (the halo that accompanies --sgs-focus-color)

Why: a client palette can set primary == text, so `var(--wp--preset--color--primary)` or a hardcoded
#141414 fallback paints a black ring over the design's focus colour and overrides the correct
global `:focus-visible` rule.

WHAT PASSES
-----------
  - a colour reference to an allowed token, with any fallback chain;
  - a block-level customisable var (e.g. `--sgs-<block>-focus-colour`) ONLY when it has a fallback
    and that fallback is itself ok (reaches an allowed token, or is a colourless keyword);
  - color-mix() whose operands are all ok (the glow around the ring);
  - keywords `currentColor`, `transparent`, `none`, `0`, `inherit`, `initial`, `unset`, `revert`;
  - a declaration with no colour component at all (`outline: 2px solid` is currentColor);
  - non-colour vars (names containing width, offset, style, thickness, size, radius, spread, blur).
WHAT FAILS
----------
  - any `--wp--preset--color--*` var (even with an allowed token as fallback), a customisable var
    with no fallback, any hex, rgb(), hsl(), oklch(), color-mix() or named colour not routed
    through an allowed token. Applies inside nested @media / @supports.

NOT A FOCUS RING (skipped)
--------------------------
  - a rule whose selector list also contains `:hover`: shared hover-and-focus presentation, the
    colour is a hover style;
  - `:not(:focus...)` negations: the rule is not a focus state.
  - ALLOWLIST below: brand-coloured third-party widgets and rings drawn over a known dark ground,
    each with its reason.

SCOPE
-----
  plugins/sgs-blocks/src/blocks/**/style.css, plugins/sgs-blocks/assets/css/**/*.css,
  theme/sgs-theme/assets/css/**/*.css. Skips build/, node_modules/, *.min.css.

Usage:
  python scripts/check-focus-ring-token.py --check       # exit 1 on violations
  python scripts/check-focus-ring-token.py --self-test   # negative + positive controls
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path
from typing import Iterator, List, Tuple

REPO = Path(__file__).resolve().parent.parent
GLOBS = [
    ("plugins/sgs-blocks/src/blocks", "**/style.css"),
    ("plugins/sgs-blocks/assets/css", "**/*.css"),
    ("theme/sgs-theme/assets/css", "**/*.css"),
]
SKIP_PARTS = {"build", "node_modules"}
PROPS = {"outline", "outline-color", "box-shadow", "border-color"}
ALLOWED_VARS = re.compile(r"^--(wp--custom--focus-ring--color-[\w-]+|sgs-focus-color|sgs-focus-glow)$")
NON_COLOUR_VAR = re.compile(r"width|offset|style|thickness|size|radius|spread|blur", re.I)
KEYWORDS = {"currentcolor", "transparent", "none", "inherit", "initial", "unset", "revert", "0"}
IGNORED_WORDS = {
    "solid", "dashed", "dotted", "double", "groove", "ridge", "inset", "outset", "hidden",
    "auto", "thin", "medium", "thick", "!important", "important", "revert-layer",
}
COLOUR_FN = re.compile(r"^(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix)\(", re.I)
NAMED = {"white", "black", "red", "green", "blue", "yellow", "orange", "purple", "pink", "grey",
         "gray", "brown", "cyan", "magenta", "navy", "teal", "gold", "silver"}


# (path suffix, selector fragment, reason). A hit matching an entry is not reported.
ALLOWLIST: List[Tuple[str, str, str]] = [
    ("google-reviews/style.css", "sgs-google-reviews", "Google Reviews follows Google's UI colours"),
    ("trustpilot-reviews/style.css", "__header-logo-link", "Trustpilot brand green on its own logo"),
    ("trustpilot-reviews/style.css", "__arrow", "Trustpilot brand green on its own widget controls"),
    ("trustpilot-reviews/style.css", "__dot", "Trustpilot brand green on its own widget controls"),
    ("trustpilot-reviews/style.css", "--theme-dark", "ring on a known dark ground"),
    ("media/style.css", ".sgs-video", "ring drawn over arbitrary video frames needs a fixed light colour"),
    ("fx-generative-background.css", "__toggle", "control sits over a dark generative canvas"),
    ("fx-wave-gradient.css", "__toggle", "control sits over a dark gradient canvas"),
    ("utilities.css", ".skip-link", "skip link paints on its own coloured ground"),
]


def split_top(value: str, sep: str) -> List[str]:
    """Split on a separator (a char, or " " for any whitespace) at parenthesis depth 0."""
    out: List[str] = []
    depth = 0
    cur = ""
    for ch in value:
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth -= 1
        is_sep = ch.isspace() if sep == " " else ch == sep
        if depth == 0 and is_sep:
            if cur.strip():
                out.append(cur.strip())
            cur = ""
        else:
            cur += ch
    if cur.strip():
        out.append(cur.strip())
    return out


def token_ok(tok: str) -> bool:
    """A colour token is ok only if routed through the focus-ring token."""
    low = tok.lower()
    if low in KEYWORDS or low in IGNORED_WORDS or re.match(r"^[-+]?[\d.]", low):
        return True
    if low.startswith(("calc(", "min(", "max(", "clamp(")):
        return True
    if low.startswith("var("):
        inner = tok[4:-1] if tok.endswith(")") else tok[4:]
        name, _, fallback = inner.partition(",")
        name = name.strip()
        if ALLOWED_VARS.match(name):
            return True
        if NON_COLOUR_VAR.search(name):
            return True
        if name.startswith("--wp--preset--color"):
            return False  # a palette colour is never the focus-ring colour
        # Block-level var: ok only when its fallback is present and itself ok (reaches the
        # focus token, or is a colourless keyword such as none / currentColor).
        return fallback.strip() != "" and declaration_ok(fallback)
    if low.startswith("color-mix("):
        return declaration_ok(tok[len("color-mix("):-1])
    if low.startswith("#") or COLOUR_FN.match(low) or low in NAMED:
        return False
    return True  # unknown word; not a colour


def declaration_ok(value: str) -> bool:
    for layer in split_top(value, ","):
        for tok in split_top(layer, " "):
            if not token_ok(tok):
                return False
    return True


def strip_comments(css: str) -> str:
    return re.sub(r"/\*.*?\*/", "", css, flags=re.S)


def iter_rules(css: str) -> Iterator[Tuple[str, str]]:
    """Yield (selector, body) for every leaf rule, descending into @media/@supports/@layer."""
    css = strip_comments(css)
    stack: List[Tuple[int, int]] = []  # (open brace pos, prelude start)
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


NOT_RE = re.compile(r":not\((?:[^()]|\([^()]*\))*\)")


def scan_css(css: str) -> List[Tuple[str, str, str]]:
    """Return (selector, property, value) for every violating declaration."""
    hits = []
    for selector, body in iter_rules(css):
        bare = NOT_RE.sub("", selector)
        if not re.search(r":focus(-visible|-within)?\b", bare) or ":hover" in bare:
            continue
        for decl in split_top(body, ";"):
            prop, sep, value = decl.partition(":")
            prop = prop.strip().lower()
            if not sep or prop not in PROPS:
                continue
            if not declaration_ok(value.strip()):
                hits.append((" ".join(selector.split()), prop, " ".join(value.split())))
    return hits


def files() -> Iterator[Path]:
    for base, pattern in GLOBS:
        for p in sorted((REPO / base).glob(pattern)):
            if p.name.endswith(".min.css") or SKIP_PARTS & set(p.relative_to(REPO).parts):
                continue
            yield p


def self_test() -> int:
    bad = ".x__swatch--button:focus-visible{outline:2px solid var(--wp--preset--color--text);}"
    good = (".x:focus-visible{outline:var(--wp--custom--focus-ring--width,3px) solid "
            "var(--wp--custom--focus-ring--color-primary);}")
    chain = (".x:focus-visible{outline-color:var(--sgs-x-focus-colour, "
             "var(--wp--custom--focus-ring--color-primary));}")
    chain_bad = ".x:focus-visible{outline-color:var(--sgs-x-focus-colour, #141414);}"
    nested = "@media (min-width:1px){.x:focus{box-shadow:0 0 0 3px #141414}}"
    plain = ".x:hover{outline:2px solid #141414}"
    checks = [(bad, 1), (good, 0), (chain, 0), (chain_bad, 1), (nested, 1), (plain, 0)]
    failed = [c for c, want in checks if len(scan_css(c)) != want]
    print("self-test:", "FAIL " + str(failed) if failed else "ok (negative and positive controls)")
    return 1 if failed else 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--self-test", action="store_true")
    args = ap.parse_args()
    if args.self_test:
        return self_test()
    total = 0
    for p in files():
        text = p.read_text(encoding="utf-8", errors="replace")
        rel = p.relative_to(REPO).as_posix()
        for selector, prop, value in scan_css(text):
            if any(rel.endswith(f) and frag in selector for f, frag, _ in ALLOWLIST):
                continue
            total += 1
            print(f"{rel}::{selector} {prop}: {value}")
    print(f"focus-ring token violations: {total}")
    return 1 if (args.check and total) else 0


if __name__ == "__main__":
    sys.exit(main())
