#!/usr/bin/env python3
"""check-focus-rests-static.py - a static stylesheet hover look keeps the resting look on keyboard focus when asked.

THE RULE (Bean, 2026-10-24, "Keyboard focus keeps the resting look", `sgsFocusRests`): a block with the setting on wears
`.sgs-focus-rests` on its root (`includes/class-sgs-focus-rests.php`), and its hover colours, shadows and movement play on
pointer hover only. The PHP emitters drop their focus twin while the flag is on; a STATIC stylesheet rule cannot read a
PHP flag, so its focus half carries the one exclusion that matches the root and every descendant at zero specificity:

    <selector>:focus-visible:where(:not(.sgs-focus-rests, .sgs-focus-rests *))

A HIT is a style rule in `src/**/*.css` or `assets/css/**` whose selector pairs a hover look with a focus pseudo-class on
the SAME declarations, and whose focus member lacks the exclusion:
  (A) one rule listing a `:hover` member and a `:focus-visible` / `:focus-within` member, or
  (B) a focus-only rule whose declarations equal those of a `:hover` rule on the same selector in the same file (a twin).
A focus pseudo inside `:not()` is a negation, never a twin. A focus pseudo inside `:has()` is a twin on the subject, so the
exclusion goes after the `:has()`. A focus pseudo inside `:is()` / `:where()` takes the exclusion right after itself, inside the list (`:where(A:hover, A:focus-visible<exclusion>)`).

NAMED EXCLUSIONS (EXCLUDE_* below, each with its reason, printed by --survey): a rule is excluded only by an entry there.

MODES
  --survey [--json]  every hit (FIXED / HIT / COMPLEX) and every excluded rule with its reason
  --fix              rewrite every HIT's focus member in place with the one form (idempotent)
  --check            exit 1 on any HIT or COMPLEX
  --self-test        a compound twin (caught), a separate twin (caught), the fixed forms (pass), a :not() negation (pass),
                     a :has() twin (caught, exclusion after the :has()), an outline-only rule (excluded), a rule inside
                     forced-colors (excluded), a focus-only rule with different declarations (pass)

Run from the repo root:  python plugins/sgs-blocks/scripts/check-focus-rests-static.py --survey|--fix|--check|--self-test
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import tempfile
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).resolve().parent.parent
EXCLUSION = ":where(:not(.sgs-focus-rests, .sgs-focus-rests *))"
EXCLUSION_MARK = ".sgs-focus-rests *"
FOCUS_RE = re.compile(r":focus-(?:visible|within)(?![\w-])")

# A whole file, with the reason none of its rules is a block hover look.
EXCLUDE_FILES = {
    "motion-thumbnails.css": "editor inspector only (loaded through class-sgs-motion-editor-canvas.php): never on a rendered block",
    "editor.css": "editor canvas only: a block's root never wears `.sgs-focus-rests` there (the class is a render_block addition)",
    "editor-rtl.css": "editor canvas only (see editor.css)",
}
# At-rule preludes whose rules are not a hover look.
EXCLUDE_AT_RE = re.compile(r"forced-colors|print", re.I)
EXCLUDE_AT_REASON = "forced-colors and print rules restore a legible indicator, they are not a hover look"
# Declarations that make a rule a focus INDICATOR rather than a hover look.
INDICATOR_PROP_RE = re.compile(r"^(?:outline[\w-]*|--sgs-focus-[\w-]+)$")
OPACITY_REASON = "opacity-only rule: it resets a dimmed resting opacity so a focused control is never faded (tests/js/focus-resting-opacity.test.js); keeping the resting opacity on focus would break that"
INDICATOR_REASON = "every declaration is an outline or a focus-system custom property: a focus indicator, owned by focus.css and check-focus-system.js"


def scan_sources() -> list[Path]:
    out = sorted(ROOT.glob("src/**/*.css")) + sorted(ROOT.glob("assets/css/**/*.css"))
    return [p for p in out if "node_modules" not in p.parts]


def strip_comments(text: str) -> str:
    return re.sub(r"/\*.*?\*/", lambda m: re.sub(r"[^\n]", " ", m.group(0)), text, flags=re.S)


def rules(text: str):
    """Yield (prelude_start, prelude_end, selector_text, decl_text, at_context) for every style rule. Offsets index `text`."""
    clean = strip_comments(text)
    stack: list[tuple[str, bool]] = []  # (prelude, is_container)
    seg_start = 0
    i, n = 0, len(clean)
    quote = ""
    while i < n:
        c = clean[i]
        if quote:
            if c == "\\":
                i += 1
            elif c == quote:
                quote = ""
        elif c in "\"'":
            quote = c
        elif c == "{":
            prelude = clean[seg_start:i]
            stripped = prelude.strip()
            if stripped.startswith("@"):
                container = bool(re.match(r"@(?:media|supports|container|layer|scope|document)\b", stripped, re.I))
                stack.append((stripped, container))
                seg_start = i + 1
            else:
                depth, j, q2 = 1, i + 1, ""
                while j < n and depth:
                    d = clean[j]
                    if q2:
                        if d == "\\":
                            j += 1
                        elif d == q2:
                            q2 = ""
                    elif d in "\"'":
                        q2 = d
                    elif d == "{":
                        depth += 1
                    elif d == "}":
                        depth -= 1
                    j += 1
                in_skipped = any(not cont for _, cont in stack)
                if not in_skipped:
                    yield (seg_start, i, prelude, clean[i + 1:j - 1], tuple(p for p, _ in stack))
                i = j - 1
                seg_start = i + 1
        elif c == "}":
            if stack:
                stack.pop()
            seg_start = i + 1
        elif c == ";" and not stack or (c == ";" and stack and stack[-1][1]):
            seg_start = i + 1
        i += 1


def split_top_level(sel: str) -> list[tuple[int, int]]:
    """(start, end) offsets of each top-level comma member of a selector list."""
    spans, depth, start, quote = [], 0, 0, ""
    for k, ch in enumerate(sel):
        if quote:
            if ch == quote:
                quote = ""
        elif ch in "\"'":
            quote = ch
        elif ch in "([":
            depth += 1
        elif ch in ")]":
            depth -= 1
        elif ch == "," and depth == 0:
            spans.append((start, k))
            start = k + 1
    spans.append((start, len(sel)))
    return spans


def functional_ranges(part: str):
    """(open_paren_index, close_paren_index, name) for each functional pseudo-class in `part`."""
    out, stack = [], []
    for k, ch in enumerate(part):
        if ch == "(":
            m = re.search(r":([\w-]+)$", part[:k])
            stack.append((k, m.group(1).lower() if m else ""))
        elif ch == ")" and stack:
            o, name = stack.pop()
            out.append((o, k, name))
    return out


def classify_part(part: str) -> dict:
    """What a selector member holds: hover, focus positions (depth-0 and has-wrapped), complex (is/where) focus."""
    funcs = functional_ranges(part)

    def ctx(pos: int) -> list[str]:
        return [name for o, c, name in funcs if o < pos < c]

    hover, focus_sites, complex_focus = False, [], False
    for m in re.finditer(r":hover(?![\w-])", part):
        if "not" not in ctx(m.start()):
            hover = True
    for m in FOCUS_RE.finditer(part):
        inside = ctx(m.start())
        if "not" in inside:
            continue
        if "has" in inside:
            outer = max(c for o, c, name in funcs if o < m.start() < c and name == "has")
            focus_sites.append(outer + 1)
        else:
            focus_sites.append(m.end())
    return {"hover": hover, "focus_sites": sorted(set(focus_sites)), "complex": complex_focus, "fixed": EXCLUSION_MARK in part}


def norm_decls(decls: str) -> tuple:
    items = [re.sub(r"\s+", " ", d.strip()).lower() for d in decls.split(";") if d.strip()]
    return tuple(sorted(items))


def hover_base(part: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r":hover(?![\w-])", "", part)).strip()


def focus_base(part: str) -> str:
    return re.sub(r"\s+", " ", EXCLUSION_RE.sub("", FOCUS_RE.sub("", part))).strip()


EXCLUSION_RE = re.compile(re.escape(EXCLUSION))


def analyse(path: Path, text: str) -> list[dict]:
    items = list(rules(text))
    infos = []
    for start, end, sel, decls, at in items:
        parts = [(a, b, sel[a:b]) for a, b in split_top_level(sel)]
        infos.append({"start": start, "end": end, "sel": sel, "decls": decls, "at": at, "parts": [(a, b, p, classify_part(p)) for a, b, p in parts]})
    hover_index: dict[tuple, set[str]] = {}
    for r in infos:
        d = norm_decls(r["decls"])
        for _, _, p, c in r["parts"]:
            if c["hover"]:
                hover_index.setdefault(d, set()).add(hover_base(p))
    findings = []
    for r in infos:
        focus_parts = [(a, b, p, c) for a, b, p, c in r["parts"] if c["focus_sites"] or c["complex"]]
        if not focus_parts:
            continue
        d = norm_decls(r["decls"])
        has_hover = any(c["hover"] for _, _, _, c in r["parts"])
        twin = has_hover
        if not twin:
            bases = hover_index.get(d, set())
            twin = any(focus_base(p) in bases for _, _, p, _ in focus_parts)
        if not twin:
            continue
        props = [x.split(":", 1)[0].strip().lower() for x in r["decls"].split(";") if ":" in x]
        status_reason = None
        if path.name in EXCLUDE_FILES:
            status_reason = EXCLUDE_FILES[path.name]
        elif any(EXCLUDE_AT_RE.search(a) for a in r["at"]):
            status_reason = EXCLUDE_AT_REASON
        elif props and all(INDICATOR_PROP_RE.match(x) for x in props):
            status_reason = INDICATOR_REASON
        elif props and all(x == "opacity" for x in props):
            status_reason = OPACITY_REASON
        for a, b, p, c in focus_parts:
            if status_reason:
                status = "EXCLUDED"
            elif c["fixed"]:
                status = "FIXED"
            else:
                status = "HIT"
            findings.append({"file": str(path.relative_to(ROOT)).replace("\\", "/"), "selector": re.sub(r"\s+", " ", p.strip()), "status": status, "reason": status_reason, "member": (r["start"], a, b)})
    return findings


def rewrite_part(part: str) -> str:
    c = classify_part(part)
    if c["fixed"] or not c["focus_sites"]:
        return part
    pos = c["focus_sites"][0]
    return part[:pos] + EXCLUSION + part[pos:]


OLD_EXCLUSION = ":where(:not(.sgs-focus-rests))"


def fix_file(path: Path) -> int:
    text = path.read_text(encoding="utf-8")
    if OLD_EXCLUSION in text:  # the first form tested the class on the focused element only, never on a descendant of the root
        text = text.replace(OLD_EXCLUSION, EXCLUSION)
        path.write_text(text, encoding="utf-8", newline="")
    found = analyse(path, text)
    edits = sorted({f["member"] for f in found if f["status"] == "HIT"}, reverse=True)
    for start, a, b in edits:
        s0 = start + a
        text = text[:s0] + rewrite_part(text[s0:start + b]) + text[start + b:]
    # an excluded rule never carries the exclusion (an earlier run, before the rule was named, may have written it)
    undo = sorted({f["member"] for f in found if f["status"] == "EXCLUDED" and EXCLUSION in text[f["member"][0] + f["member"][1]:f["member"][0] + f["member"][2]]}, reverse=True)
    for start, a, b in undo:
        s0 = start + a
        text = text[:s0] + text[s0:start + b].replace(EXCLUSION, "") + text[start + b:]
    edits = edits + undo
    if edits:
        path.write_text(text, encoding="utf-8", newline="")
    return len(edits)


def all_findings(paths: list[Path]) -> list[dict]:
    out = []
    for p in paths:
        out.extend(analyse(p, p.read_text(encoding="utf-8")))
    return out


def survey(findings: list[dict], as_json: bool) -> None:
    if as_json:
        print(json.dumps([{k: v for k, v in f.items() if k != "member"} for f in findings], indent=1))
        return
    for f in findings:
        print(f"{f['status']:9} {f['file']}  {f['selector'][:110]}" + (f"   [{f['reason']}]" if f["reason"] else ""))
    counts = {s: sum(1 for f in findings if f["status"] == s) for s in ("HIT", "COMPLEX", "FIXED", "EXCLUDED")}
    files = len({f["file"] for f in findings if f["status"] in ("HIT", "COMPLEX")})
    print(f"\nsurvey: {len(findings)} focus members paired with a hover look: " + ", ".join(f"{k} {v}" for k, v in counts.items()) + f"; {files} file(s) with HIT/COMPLEX")
    print("named exclusions: " + "; ".join(f"{k} ({v})" for k, v in EXCLUDE_FILES.items()) + f"; at-rules forced-colors|print ({EXCLUDE_AT_REASON}); outline-only rules ({INDICATOR_REASON}); {OPACITY_REASON}")


def self_test() -> int:
    cases = [
        ("compound twin caught", ".a:hover,.a:focus-visible{color:red}", "HIT"),
        ("separate twin caught", ".a:hover{color:red}\n.a:focus-visible{color:red}", "HIT"),
        ("fixed compound passes", ".a:hover,.a:focus-visible" + EXCLUSION + "{color:red}", "FIXED"),
        ("fixed separate passes", ".a:hover{color:red}\n.a:focus-visible" + EXCLUSION + "{color:red}", "FIXED"),
        ("negation is not a twin", ".a:not(:focus-visible):hover{color:red}", None),
        ("has twin caught", ".a:hover,.a:has(:focus-visible){color:red}", "HIT"),
        ("outline-only excluded", ".a:hover,.a:focus-visible{outline:2px solid red}", "EXCLUDED"),
        ("forced-colors excluded", "@media (forced-colors: active){.a:hover,.a:focus-visible{color:red}}", "EXCLUDED"),
        ("opacity reset excluded", ".a:hover,.a:focus-visible{opacity:1}", "EXCLUDED"),
        ("different declarations pass", ".a:hover{color:red}\n.a:focus-visible{color:blue}", None),
        ("is() twin caught", ".a:is(:hover,:focus-visible){color:red}", "HIT"),
    ]
    failures = 0
    with tempfile.TemporaryDirectory() as tmp:
        for name, css, want in cases:
            f = Path(tmp) / "style.css"
            f.write_text(css, encoding="utf-8")
            global ROOT
            saved, ROOT = ROOT, Path(tmp)
            try:
                got = [x["status"] for x in analyse(f, css)]
            finally:
                ROOT = saved
            ok = (not got) if want is None else (want in got)
            print(("PASS " if ok else "FAIL ") + name + ("" if ok else f"  want {want}, got {got}"))
            failures += 0 if ok else 1
        # --fix puts the exclusion after the has() and is idempotent
        f = Path(tmp) / "style.css"
        f.write_text(".a:hover,.a:has(:focus-visible){color:red}", encoding="utf-8")
        saved, ROOT = ROOT, Path(tmp)
        try:
            n1 = fix_file(f)
            n2 = fix_file(f)
        finally:
            ROOT = saved
        fixed_text = f.read_text(encoding="utf-8")
        ok = n1 == 1 and n2 == 0 and fixed_text == ".a:hover,.a:has(:focus-visible)" + EXCLUSION + "{color:red}"
        print(("PASS " if ok else "FAIL ") + "fix is exact and idempotent" + ("" if ok else f"  {fixed_text}"))
        failures += 0 if ok else 1
    print("self-test: " + ("OK" if not failures else f"{failures} FAILED"))
    return 1 if failures else 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--survey", action="store_true")
    ap.add_argument("--fix", action="store_true")
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--self-test", action="store_true")
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()
    if a.self_test:
        return self_test()
    paths = scan_sources()
    if a.fix:
        total = sum(fix_file(p) for p in paths)
        print(f"fixed {total} focus member(s)")
    findings = all_findings(paths)
    if a.survey:
        survey(findings, a.json)
        return 0
    bad = [f for f in findings if f["status"] in ("HIT", "COMPLEX")]
    for f in bad:
        print(f"{f['status']}: {f['file']}  {f['selector'][:120]}")
    if a.check or a.fix:
        print(f"check-focus-rests-static: {'OK' if not bad else str(len(bad)) + ' unfixed'} ({len(findings)} paired focus members, {len(bad)} unfixed)")
        return 1 if bad else 0
    ap.print_help()
    return 2


if __name__ == "__main__":
    sys.exit(main())
