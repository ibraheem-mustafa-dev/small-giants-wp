#!/usr/bin/env python3
"""check-breakpoint-literals.py — device-tier breakpoints come from the shared source, never typed.

THE RULE: a tablet/mobile query is built from `SGS_Breakpoints` (PHP: includes/class-sgs-breakpoints.php,
emitted through `sgs_emit_responsive_css`) or `SGS_BREAKPOINTS` (JS: src/utils/responsive.js). A hand-typed
`@media (max-width:1023px)` / `(max-width:767px)` / `(min-width:768px)` / `(min-width:1024px)` in PHP or JS is a
second source of the same number. Static .css/.scss cannot import a constant, so they are held to RULE 3 instead.

RULE 3: in every .css/.scss under plugins/sgs-blocks/src and theme/sgs-theme/assets/css a px width media query must sit on a tier edge in the
right direction: `max-width` is MOBILE_MAX or TABLET_MAX, `min-width` is MOBILE_MAX+1 or TABLET_MAX+1, both read from
includes/class-sgs-breakpoints.php (never typed here), so no block switches 1px away from the rest. A deliberate exception is one entry per
file+condition in check-breakpoint-literals-css-allow.json with a one-line reason. `prefers-*`, `hover`, `forced-colors`, `@container`, range
syntax and non-px units are ignored.

RULE 2: a query ASSEMBLED from a constant or variable is the same defect in another shape: `'@media (max-width:' . SGS_Breakpoints::TABLET_MAX . 'px)'`,
`` `@media (max-width:${ SGS_BREAKPOINTS.TABLET_MAX }px)` ``, `'(min-width:' . $bp . 'px)'`. Named ranges come from `SGS_Breakpoints::media()` / `::query()`
(PHP) and the `QUERY_*` exports of src/utils/breakpoints.js (JS); a per-instance width comes from `SGS_Breakpoints::media_width()` / `mediaWidth()`.
Test files (tests/, which describe printed output) are not scanned.

KINDS: tablet-max (max 1023), mobile-max (max 767), tablet-min (min 768), desktop-min (min 1024), built-query (rule 2).
BASELINE: check-breakpoint-literals-baseline.json = file -> count. Fails when a count RISES or a file is new;
fails when a count FALLS without the baseline being lowered (ratchet only tightens).

  --survey        list every literal (file::line, kind)
  --survey-css    count static stylesheet literals (report only)
  --check         (also rule 3) exit 1 on a new literal or a stale baseline
  --write-baseline  rewrite the baseline from the tree
  --self-test     planted positive and negative fixtures

Run from plugins/sgs-blocks:  python scripts/check-breakpoint-literals.py --check
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
PLUGIN = Path(__file__).resolve().parents[1]
REPO = PLUGIN.parents[1]
BASELINE = Path(__file__).resolve().with_name("check-breakpoint-literals-baseline.json")
ROOTS = [PLUGIN, REPO / "theme" / "sgs-theme", REPO / "plugins" / "sgs-booking", REPO / "plugins" / "sgs-client-notes"]
SKIP_DIRS = {"node_modules", "build", "vendor", "tests", "scripts", ".phpunit.cache", "reports", "pipeline-state", "stackable"}
ALLOW = {"includes/class-sgs-breakpoints.php", "includes/helpers-responsive.php", "src/utils/responsive.js", "src/utils/breakpoints.js"}
# Whole-repo path -> why a literal is legitimate there. Keep this list to cases with no shared source reachable.
EXCEPTIONS = {
    "theme/sgs-theme/assets/js/sgs-shop-load-more.js": "a classic, unbundled theme script (it cannot import src/utils/breakpoints.js) and the theme "
    "must not depend on the blocks plugin's SGS_Breakpoints; the query also joins the width to `(pointer: fine)`",
}
LIT = re.compile(r"\(\s*(max|min)-width\s*:\s*(767|768|1023|1024)(?:\.98)?px\s*\)")
# Rule 2: a width condition whose value is concatenated (`' .`, `' +`), interpolated (`${`) or a variable (`$x`).
BUILT = re.compile(r"""\(\s*(?:max|min)-width\s*:\s*(?:['"`]\s*[.+]|\$\{|\{?\$[A-Za-z_])""")
KIND = {("max", "1023"): "tablet-max", ("max", "767"): "mobile-max", ("min", "768"): "tablet-min", ("min", "1024"): "desktop-min"}
CSS_ALLOW = Path(__file__).resolve().with_name("check-breakpoint-literals-css-allow.json")
CSS_ROOTS = [PLUGIN / "src", REPO / "theme" / "sgs-theme" / "assets" / "css"]
BP_SOURCE = PLUGIN / "includes" / "class-sgs-breakpoints.php"
MEDIA_PRELUDE = re.compile(r"@media([^{;]*)\{")
WIDTH_COND = re.compile(r"\(\s*(min|max)-width\s*:\s*([0-9.]+)px\s*\)")
COMMENT_LINE = re.compile(r"^\s*(//|\*|/\*|#)")


def strip_comments(text: str) -> str:
    """Blank `//` and `/* */` comments, keeping strings and newlines (so a `/*` inside a `//` comment or a string cannot swallow code)."""
    out, i, n, quote = [], 0, len(text), ""
    while i < n:
        c = text[i]
        two = text[i:i + 2]
        if quote:
            if c == "\\":
                out.append(text[i:i + 2])
                i += 2
                continue
            if c == quote or (c == "\n" and quote != "`"):
                quote = ""
            out.append(c)
            i += 1
        elif c in "'\"`":
            quote = c
            out.append(c)
            i += 1
        elif two == "//":
            j = text.find("\n", i)
            j = n if j < 0 else j
            out.append(" " * (j - i))
            i = j
        elif two == "/*":
            j = text.find("*/", i + 2)
            j = n if j < 0 else j + 2
            out.append("".join("\n" if ch == "\n" else " " for ch in text[i:j]))
            i = j
        else:
            out.append(c)
            i += 1
    return "".join(out)


def scan_text(text: str) -> list[tuple[int, str]]:
    hits = []
    text = strip_comments(text)
    for n, line in enumerate(text.splitlines(), 1):
        if COMMENT_LINE.match(line):
            continue
        for m in LIT.finditer(line):
            hits.append((n, KIND.get((m.group(1), m.group(2)), m.group(1) + "-" + m.group(2))))
    for m in BUILT.finditer(text):
        hits.append((text.count("\n", 0, m.start()) + 1, "built-query"))
    return sorted(hits)


def tier_edges(php: str | None = None) -> dict[str, set[float]]:
    """The legal px values per direction, parsed from the TABLET_MAX / MOBILE_MAX constants of SGS_Breakpoints."""
    php = php if php is not None else BP_SOURCE.read_text(encoding="utf-8")
    c = {n: int(v) for n, v in re.findall(r"const\s+(TABLET_MAX|MOBILE_MAX)\s*=\s*(\d+)\s*;", php)}
    if set(c) != {"TABLET_MAX", "MOBILE_MAX"}:
        raise SystemExit("[check-breakpoint-literals] cannot read TABLET_MAX / MOBILE_MAX from class-sgs-breakpoints.php")
    return {"max": {float(c["MOBILE_MAX"]), float(c["TABLET_MAX"])}, "min": {float(c["MOBILE_MAX"] + 1), float(c["TABLET_MAX"] + 1)}}


def scan_css_text(rel_path: str, text: str, edges: dict[str, set[float]], allow: set[tuple[str, str]]) -> list[tuple[int, str]]:
    """Rule 3: off-tier px width conditions inside @media preludes, minus allowlisted file+condition pairs."""
    text = re.sub(r"/\*.*?\*/", lambda m: re.sub(r"[^\n]", " ", m.group(0)), text, flags=re.S)
    hits = []
    for pm in MEDIA_PRELUDE.finditer(text):
        for m in WIDTH_COND.finditer(pm.group(1)):
            d, v = m.group(1), float(m.group(2))
            if v in edges[d]:
                continue
            cond = f"{d}-width:{m.group(2)}px"
            if (rel_path, cond) not in allow:
                hits.append((text.count("\n", 0, pm.start(1) + m.start()) + 1, cond))
    return hits


def load_css_allow() -> set[tuple[str, str]]:
    data = json.loads(CSS_ALLOW.read_text(encoding="utf-8"))
    for e in data["allow"]:
        if not e.get("reason", "").strip():
            raise SystemExit(f"[check-breakpoint-literals] allowlist entry without a reason: {e}")
    return {(e["file"], e["condition"]) for e in data["allow"]}


def css_files() -> list[Path]:
    return sorted(f for r in CSS_ROOTS if r.is_dir() for f in r.rglob("*") if f.suffix in (".css", ".scss") and f.is_file() and "node_modules" not in f.parts)


def collect_css() -> list[str]:
    edges, allow = tier_edges(), load_css_allow()
    out, used = [], set()
    for f in css_files():
        r = rel(f)
        for n, cond in scan_css_text(r, f.read_text(encoding="utf-8", errors="replace"), edges, set()):
            if (r, cond) in allow:
                used.add((r, cond))
            else:
                out.append(f"{r}::{n} @media ({cond.replace(':', ': ')}) is not a tier edge (max {sorted(edges['max'])}, min {sorted(edges['min'])}): move it to the edge or allowlist it with a reason in {CSS_ALLOW.name}")
    out += [f"{r}: allowlisted {c} no longer occurs: remove the entry from {CSS_ALLOW.name}" for r, c in sorted(allow - used)]
    return out


def files(exts: tuple[str, ...]) -> list[Path]:
    out = []
    for root in ROOTS:
        if not root.is_dir():
            continue
        for f in root.rglob("*"):
            if f.suffix not in exts or not f.is_file():
                continue
            parts = f.relative_to(root).parts
            if SKIP_DIRS.intersection(parts) or f.name.endswith(".min.js") or f.name.endswith(".asset.php"):
                continue
            if f.suffix == ".js" and root == PLUGIN and parts[0] != "src":
                continue
            out.append(f)
    return sorted(out)


def rel(f: Path) -> str:
    return f.relative_to(REPO).as_posix()


def collect() -> dict[str, list[tuple[int, str]]]:
    res = {}
    for f in files((".php", ".js")):
        r = rel(f)
        if r.removeprefix("plugins/sgs-blocks/") in ALLOW or r in EXCEPTIONS:
            continue
        h = scan_text(f.read_text(encoding="utf-8", errors="replace"))
        if h:
            res[r] = h
    return res


def skipped(r: str) -> bool:
    """True when a repo-relative path is not scanned: a test file, a build artefact, a shared source or an exception."""
    return bool(SKIP_DIRS.intersection(r.split("/"))) or r.removeprefix("plugins/sgs-blocks/") in ALLOW or r in EXCEPTIONS


def self_test() -> int:
    pos = "$c = '@media (max-width:1023px){a{b:c}}';"
    pos2 = "window.matchMedia( '(max-width: 767px)' )"
    pos3 = "'@media (min-width:768px) and (max-width:1023px){'"
    neg = "// @media (max-width:767px) in a comment\n/* (min-width:1024px) */\n$y='(max-width:600px)';"
    # A `/*` inside a `//` comment or a string must not swallow the code after it.
    swallow = "// see /*Mobile siblings\n$c = '@media (max-width:767px){a{b:c}}';\n$d = 'uploads/*';\n/* real */ $e = '(min-width:1024px)';"
    # Rule 2: queries assembled from a constant, an interpolation or a variable.
    built = [
        "$c = '@media (max-width:' . SGS_Breakpoints::TABLET_MAX . 'px){' . $x . '}';",
        "$c = '@media(min-width:' . ( SGS_Breakpoints::MOBILE_MAX + 1 ) . 'px)';",
        "$c = '@media (max-width:' . $bp . 'px){}';",
        '$c = "@media(max-width:{$bp}px){}";',
        "const q = `@media (max-width:${ SGS_BREAKPOINTS.TABLET_MAX }px)`;",
        "const q = '@media (max-width:' + bp + 'px)';",
        "window.matchMedia( `(min-width: ${ w }px)` )",
        "$c = '@container (max-width:' . SGS_Breakpoints::CONTAINER_MOBILE_MAX . 'px){'",
    ]
    clean = [
        "$c = SGS_Breakpoints::media( 'tablet' ) . '{' . $x . '}';",
        "$c = SGS_Breakpoints::media_width( 'max', $bp ) . '{}';",
        "const q = `${ MEDIA_TABLET }{a{b:c}}`;",
        "const q = mediaWidth( 'min', bp );",
        "$d = '.a{max-width:' . $w . 'px}';",
        "const d = `.a{max-width:${ w }px}`;",
        "$f = '@media (prefers-reduced-motion:no-preference){' . $css . '}';",
    ]
    ok = len(scan_text(pos)) == 1 and len(scan_text(pos2)) == 1 and len(scan_text(pos3)) == 2 and scan_text(neg) == []
    ok = ok and len(scan_text(swallow)) == 2
    ok = ok and all([h[1] for h in scan_text(t)] == ["built-query"] for t in built)
    ok = ok and all(scan_text(t) == [] for t in clean)
    # Test files describe printed output and are not scanned; shared sources are allowlisted.
    ok = ok and skipped("plugins/sgs-blocks/tests/php/FooTest.php") and skipped("plugins/sgs-blocks/includes/class-sgs-breakpoints.php")
    ok = ok and not skipped("plugins/sgs-blocks/includes/nav-menu.php")
    php = "const TABLET_MAX = 1023;\n const MOBILE_MAX = 767;"
    e = tier_edges(php)
    n = lambda css, al=(): scan_css_text("a.css", css, e, set(al))
    ok = ok and e == {"max": {767.0, 1023.0}, "min": {768.0, 1024.0}}
    ok = ok and [h[1] for h in n("@media (max-width: 768px){a{b:c}}")] == ["max-width:768px"]
    ok = ok and n("@media (max-width: 767px){a{max-width:768px}}") == [] and n("@media (min-width:768px) and (max-width:1023px){}") == []
    ok = ok and [h[1] for h in n("@media (min-width: 769px){}")] == ["min-width:769px"] and [h[1] for h in n("@media (max-width: 1024px){}")] == ["max-width:1024px"]
    ok = ok and n("@media (max-width: 781px){}", [("a.css", "max-width:781px")]) == []
    ok = ok and len(scan_css_text("b.css", "@media (max-width: 781px){}", e, {("a.css", "max-width:781px")})) == 1
    ok = ok and n("@media (prefers-reduced-motion:reduce){} @media (hover:hover){} @container (max-width: 600px){} @media (max-width: 40em){} /* @media (max-width: 600px){} */") == []
    print("[check-breakpoint-literals] self-test", "PASS" if ok else "FAIL")
    return 0 if ok else 1


def main() -> int:
    ap = argparse.ArgumentParser()
    for a in ("survey", "survey-css", "check", "write-baseline", "self-test"):
        ap.add_argument("--" + a, action="store_true")
    a = ap.parse_args()
    if a.self_test:
        return self_test()
    if a.survey_css:
        n = sum(len(scan_text(f.read_text(encoding="utf-8", errors="replace"))) for f in files((".css", ".scss")))
        print(f"static stylesheet tier-edge literals: {n} (gated by rule 3 for off-tier values only)")
        return 0
    cur = collect()
    counts = {k: len(v) for k, v in cur.items()}
    if a.survey:
        for k, v in cur.items():
            for n, kind in v:
                print(f"{k}::{n} {kind}")
        print(f"total {sum(counts.values())} in {len(counts)} files")
        return 0
    if a.write_baseline:
        BASELINE.write_text(json.dumps({"files": dict(sorted(counts.items()))}, indent=2) + "\n", encoding="utf-8")
        print("baseline written:", sum(counts.values()), "in", len(counts), "files")
        return 0
    base = json.loads(BASELINE.read_text(encoding="utf-8"))["files"]
    bad = []
    for k, c in counts.items():
        if c > base.get(k, 0):
            bad.append(f"{k}: {c} hand-typed or assembled tier queries (baseline {base.get(k, 0)}): use sgs_emit_responsive_css / SGS_Breakpoints::media() / ::media_width() / breakpoints.js")
    for k, c in base.items():
        if counts.get(k, 0) < c:
            bad.append(f"{k}: baseline {c} but now {counts.get(k, 0)}: lower the baseline (--write-baseline)")
    bad += collect_css()
    print("\n".join(bad) if bad else f"[check-breakpoint-literals] OK ({sum(counts.values())} baselined)")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
