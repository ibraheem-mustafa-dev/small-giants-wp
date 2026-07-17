"""Theme-CSS hardcode lint — arbitrary typography/colour literals in THEME CSS.

WHY THIS EXISTS (2026-07-17). The pipeline's existing hardcode gate
(`check-hardcoded-render-defaults.js`) only scans the BLOCKS plugin's
render.php/style.css — it has never looked at the THEME's hand-authored CSS.
That hole let `.wp-block-heading { letter-spacing: -0.01em; }` ship into
`core-blocks-critical.css`: an arbitrary magic number with no token basis,
found via `extract-css-diff.js` to be tightening EVERY client's headings and
making clones drift from their reference sites (reference sites render
headings at `normal`). See the removal note left in `core-blocks-critical.css`
directly above the `/* ─── HEADINGS ─── */` block.

Bean's locked DEFAULT-vs-HARDCODE test (`CLAUDE.md`, D338): a value is a
HARDCODE when it is an arbitrary literal that overrides a legitimate
alternative source (a design token, `theme.json`, or "no value at all" i.e.
inherit) with no purposeful basis. A component's OWN scoped constant that
overrides no theme-wide default is NOT a hardcode — it just needs an honest
reason recorded, which is what the baseline's `reason` field is for.

SCOPE BOUNDARY: this lint reads THEME CSS files only
(`theme/sgs-theme/assets/css/*.css`). `theme.json` is JSON, not CSS — it is
OUT OF SCOPE for this lint (e.g. the h6 `letterSpacing: 0.08em` entry lives
there). `theme.json` typography/colour tokens are exactly the alternative
source this lint expects theme CSS to defer to; auditing theme.json's own
consistency is a different tool's job.

What is flagged (see `_is_literal_value()`):
  - `letter-spacing` with a literal em/px/rem value
  - `color` / `background-color` with a literal hex or rgb()/rgba()/hsl()/
    hsla()/hwb() value
  - `font-size` with a literal px/rem/em value
A value is NOT flagged when it is (or contains) `var(...)` — including a
`var(--token, #fallback)` call, a `color-mix(in srgb, var(...) ...)` mix, or
a `clamp(..., var(...), ...)` — or when it is a CSS-wide keyword
(`inherit`/`normal`/`initial`/`unset`/`currentColor`/`auto`).

Baseline model (mirrors `lint-spec-drift.py`): findings present in the
baseline JSON are KNOWN-LEGIT (each carries a `reason`) and are suppressed.
`--check` exits 1 if any NEW (un-baselined) finding exists, 0 otherwise.
`--update-baseline` writes the CURRENT findings to the baseline file,
preserving existing `reason` text for keys that still match and stamping
`"reason": "NEEDS REVIEW — auto-added by --update-baseline"` on brand-new keys
(so a silent auto-baseline is always visible in the diff, never invisible).

Usage:
    python lint-theme-css-hardcodes.py                  # report (exit 0)
    python lint-theme-css-hardcodes.py --check           # gate mode: exit 1 on new findings
    python lint-theme-css-hardcodes.py --update-baseline # refresh the baseline to current findings
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

REPO = Path(__file__).resolve().parents[4]
CSS_DIR = REPO / "theme" / "sgs-theme" / "assets" / "css"
BASELINE_PATH = Path(__file__).resolve().parent / "lint-theme-css-hardcodes-baseline.json"

FLAGGED_PROPS = {"letter-spacing", "color", "background-color", "font-size"}

_KEYWORDS_SKIP = {"inherit", "normal", "initial", "unset", "currentcolor", "auto", "0"}

_RE_LETTER_SPACING = re.compile(r"^-?\d*\.?\d+(em|px|rem)$")
_RE_FONT_SIZE = re.compile(r"^-?\d*\.?\d+(px|rem|em)$")
_RE_COLOUR_FUNC = re.compile(r"^(rgba?|hsla?|hwb)\(")
_RE_HEX = re.compile(r"^#[0-9a-f]{3,8}$")

_COMMENT_RE = re.compile(r"/\*.*?\*/", re.DOTALL)


@dataclass
class Finding:
    relpath: str
    line: int
    selector: str
    prop: str
    value: str

    def key(self) -> str:
        return f"{self.relpath}:{self.selector}:{self.prop}:{self.value}"


def _strip_comments(text: str) -> str:
    """Blank out /* ... */ comments with same-length whitespace (preserving
    newlines and byte offsets, so line numbers computed later stay valid)."""
    def repl(m: re.Match) -> str:
        chunk = m.group(0)
        return "".join("\n" if c == "\n" else " " for c in chunk)
    return _COMMENT_RE.sub(repl, text)


def _parse_css_blocks(text: str):
    """Single-pass, O(n) stack-based CSS block parser.

    Yields (selector, body_text, body_start_line) for every rule block,
    including ones nested inside an @-rule (e.g. a selector inside
    `@media (...) { ... }`) — the @-rule's OWN "selector" (the `@media ...`
    text) is never yielded itself (its body has no direct declarations of
    interest; any real rule nested inside it is yielded as its own entry
    when ITS closing brace is reached). Handles arbitrary nesting depth in
    a single linear pass — no re-scanning, no quadratic blowup.
    """
    i = 0
    n = len(text)
    line = 1
    stack: list[dict] = []
    pending_start = 0  # char index where the in-progress selector text begins
    while i < n:
        c = text[i]
        if c == "\n":
            line += 1
            i += 1
            continue
        if c == "{":
            selector = text[pending_start:i].strip()
            stack.append({"selector": selector, "body_start": i + 1, "body_start_line": line})
            pending_start = i + 1
            i += 1
            continue
        if c == "}":
            if stack:
                frame = stack.pop()
                if not frame["selector"].startswith("@"):
                    body_text = text[frame["body_start"]:i]
                    yield frame["selector"], body_text, frame["body_start_line"]
            pending_start = i + 1
            i += 1
            continue
        i += 1


def _normalise_selector(raw: str) -> str:
    return re.sub(r"\s+", " ", raw).strip()


def _is_literal_value(prop: str, value: str) -> bool:
    """True when `value` is an arbitrary literal for `prop` (not a token/keyword)."""
    v = re.sub(r"!important\s*$", "", value.strip(), flags=re.IGNORECASE).strip()
    if not v:
        return False
    vl = v.lower()
    if vl in _KEYWORDS_SKIP:
        return False
    if "var(" in vl:
        # var(--token), var(--token, #fallback), color-mix(... var(...) ...),
        # clamp(..., var(...), ...) — all token-derived, never flagged.
        return False
    if prop == "letter-spacing":
        return bool(_RE_LETTER_SPACING.match(vl))
    if prop in ("color", "background-color"):
        return bool(_RE_HEX.match(vl) or _RE_COLOUR_FUNC.match(vl))
    if prop == "font-size":
        return bool(_RE_FONT_SIZE.match(vl))
    return False


def _iter_declarations(body: str):
    """Yield (prop, value, line_offset) for each `prop: value;` in a CSS block body.
    line_offset is the count of newlines in `body` before the declaration starts,
    i.e. an offset relative to the FIRST line of body."""
    pos = 0
    for decl in body.split(";"):
        decl_start = pos
        pos += len(decl) + 1
        if ":" not in decl:
            continue
        prop, _, val = decl.partition(":")
        prop = prop.strip().lower()
        val = val.strip()
        if not prop:
            continue
        line_offset = decl.count("\n", 0, decl.find(":"))
        # decl.find(':') is relative to decl start, which is what we want combined
        # with newlines before decl_start.
        newlines_before_decl = body.count("\n", 0, decl_start)
        yield prop, val, newlines_before_decl + line_offset


def find_hardcodes_in_text(text: str, relpath: str) -> list[Finding]:
    """Parse CSS text and return every FLAGGED_PROPS declaration whose value
    is an arbitrary literal (see `_is_literal_value`)."""
    text = _strip_comments(text)
    findings: list[Finding] = []
    for selector_raw, body, body_start_line in _parse_css_blocks(text):
        selector = _normalise_selector(selector_raw)
        for prop, value, line_offset in _iter_declarations(body):
            if prop in FLAGGED_PROPS and _is_literal_value(prop, value):
                findings.append(Finding(
                    relpath=relpath,
                    line=body_start_line + line_offset,
                    selector=selector,
                    prop=prop,
                    value=re.sub(r"!important\s*$", "", value.strip(),
                                 flags=re.IGNORECASE).strip(),
                ))
    return findings


def scan_css_dir(css_dir: Path) -> list[Finding]:
    findings: list[Finding] = []
    for path in sorted(css_dir.glob("*.css")):
        relpath = str(path.relative_to(REPO)).replace("\\", "/")
        text = path.read_text(encoding="utf-8", errors="replace")
        findings.extend(find_hardcodes_in_text(text, relpath))
    return findings


def load_baseline() -> dict:
    if not BASELINE_PATH.exists():
        return {}
    with open(BASELINE_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def write_baseline(entries: dict) -> None:
    with open(BASELINE_PATH, "w", encoding="utf-8") as f:
        json.dump(entries, f, indent=2, ensure_ascii=False, sort_keys=True)
        f.write("\n")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--check", action="store_true", help="gate mode: exit 1 on any NEW (un-baselined) finding")
    ap.add_argument("--update-baseline", action="store_true", help="write current findings to the baseline file")
    args = ap.parse_args()

    findings = scan_css_dir(CSS_DIR)
    baseline = load_baseline()

    if args.update_baseline:
        new_entries = {}
        for f in findings:
            k = f.key()
            existing = baseline.get(k)
            reason = existing["reason"] if existing else "NEEDS REVIEW — auto-added by --update-baseline"
            new_entries[k] = {
                "file": f.relpath,
                "line": f.line,
                "selector": f.selector,
                "property": f.prop,
                "value": f.value,
                "reason": reason,
            }
        write_baseline(new_entries)
        print(f"Wrote {len(new_entries)} entries to {BASELINE_PATH}")
        needs_review = [k for k, v in new_entries.items() if v["reason"].startswith("NEEDS REVIEW")]
        if needs_review:
            print(f"\n{len(needs_review)} entr(y/ies) need an honest reason (currently NEEDS REVIEW):")
            for k in needs_review:
                print(f"  {k}")
        return 0

    baselined_keys = set(baseline.keys())
    new_findings = [f for f in findings if f.key() not in baselined_keys]

    print(f"Scanned {CSS_DIR} — {len(findings)} literal(s) found "
          f"({len(findings) - len(new_findings)} baselined, {len(new_findings)} new)\n")

    if new_findings:
        print(f"NEW findings ({len(new_findings)}) — not in the baseline:\n")
        for f in new_findings:
            print(f"  {f.relpath}:{f.line}")
            print(f"    selector : {f.selector}")
            print(f"    property : {f.prop}")
            print(f"    value    : {f.value}")
            print()

    if args.check:
        if new_findings:
            print(f"FAIL: {len(new_findings)} un-baselined theme-CSS literal(s). "
                  f"Either remove the hardcode, replace it with a theme.json token/var(), "
                  f"or add it to {BASELINE_PATH.name} with an honest `reason` "
                  f"(via --update-baseline, then edit the reason).")
            return 1
        print("PASS: no new theme-CSS hardcodes (all findings are baselined or none exist).")
        return 0

    return 0


if __name__ == "__main__":
    sys.exit(main())
