#!/usr/bin/env python3
"""Make every reader of `data-sgs-fx` match a TOKEN, not the whole attribute value (Spec 38A FR-38A-23).

WHY
    One element can carry several effect layers, so the fx emitter writes `data-sgs-fx` as a
    whitespace-separated list (`data-sgs-fx="particles grid-dots"`). A reader that matches the whole value
    (`[data-sgs-fx="particles"]`, `get_attribute( 'data-sgs-fx' ) === 'particles'`) misses a listed element.

TARGET SHAPE (settled by Spec 38A, no client-visible change)
    CSS / JS selector      [data-sgs-fx="x"]                        ->  [data-sgs-fx~="x"]
    JS comparison          el.dataset.sgsFx === 'x'                 ->  ( el.dataset.sgsFx || '' ).split( /\\s+/ ).includes( 'x' )
                           el.getAttribute( 'data-sgs-fx' ) === 'x' ->  same token test
    PHP comparison         'x' !== $p->get_attribute( 'data-sgs-fx' ) ->  ! sgs_fx_has_effect( $p->get_attribute( 'data-sgs-fx' ), 'x' )
    PHP markup pre-filter  false === strpos( $html, 'data-sgs-fx="x"' ) ->  ! sgs_fx_markup_has_effect( $html, 'x' )
    (helpers: includes/fx-token-match.php, loaded by includes/fx-attributes.php)

NOT READERS (never flagged): comments; emitters such as `' data-sgs-fx="draggable"'` or
`set_attribute( 'data-sgs-fx', 'flip' )`; presence checks (`null !== get_attribute( 'data-sgs-fx' )`,
`hasAttribute`, `[data-sgs-fx]`); and the separate `data-sgs-fx-<param>` attributes.

UNRECOGNISED (reported, never guessed, `--check` stays red): a read of the attribute that is neither a
selector, a literal comparison nor a presence check, and a capture regex `data-sgs-fx="([a-z0-9-]+)"`.

    python migrate-fx-list-match.py --survey [--json] | --fix [--apply] | --check | --self-test [--blind]

`--fix` prints a unified diff; `--fix --apply` writes. A file with any uncommitted change (git status) is
SKIPPED and listed, never overwritten. `--self-test --blind` swaps in a detector that finds nothing and must
therefore exit 1. `check-motion-fx-list-match.py` is the motion-gate wrapper.
"""
from __future__ import annotations

import argparse
import difflib
import json
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Callable, NamedTuple

try:
    sys.stdout.reconfigure(encoding="utf-8")
except (AttributeError, ValueError):
    pass

ROOT = Path(__file__).resolve().parents[3]
SCAN_DIRS = (
    "plugins/sgs-blocks/src",
    "plugins/sgs-blocks/assets",
    "plugins/sgs-blocks/includes",
    "plugins/sgs-blocks/scripts/motion-qa",
    "theme/sgs-theme",
)
EXTENSIONS = {".css": "css", ".scss": "scss", ".js": "js", ".mjs": "js", ".php": "php"}
SKIP_PARTS = {"build", "node_modules", "vendor", "vendor-modules", "fonts", "__pycache__"}

LITERAL = r"""(?P<q>['"])(?P<name>[a-z0-9-]+)(?P=q)"""
JS_READ = (r"[\w$.]+\.getAttribute\(\s*['\"]data-sgs-fx['\"]\s*\)", r"[\w$.]+\.dataset\.sgsFx\b")
JS_READ_ANY = "(?:" + "|".join(JS_READ) + ")"
PHP_READ = r"\$[\w>-]+->get_attribute\(\s*'data-sgs-fx'\s*\)"

RE_SELECTOR = re.compile(r"\[data-sgs-fx=")
RE_PHP_STRPOS = re.compile(
    r"false\s*===\s*\\?strpos\(\s*(?P<h>\$\w+)\s*,\s*'data-sgs-fx=\"(?P<name>[a-z0-9-]+)\"'\s*\)")
RE_PHP_STRPOS_ANY = re.compile(r"\\?(?:strpos|str_contains|stripos)\([^;]*?'data-sgs-fx=\"[a-z0-9-]+\"'")
RE_PHP_CMP_L = re.compile(r"(?P<l>'(?P<name>[a-z0-9-]+)')\s*(?P<op>===|!==)\s*(?P<e>" + PHP_READ + ")")
RE_PHP_CMP_R = re.compile(r"(?P<e>" + PHP_READ + r")\s*(?P<op>===|!==)\s*'(?P<name>[a-z0-9-]+)'")
RE_JS_CMP_R = re.compile(r"(?P<e>" + JS_READ_ANY + r")\s*(?P<op>===|!==|==|!=)\s*" + LITERAL)
RE_JS_CMP_L = re.compile(LITERAL + r"\s*(?P<op>===|!==|==|!=)\s*(?P<e>" + JS_READ_ANY + ")")
RE_READ_PHP = re.compile(r"get_attribute\(\s*'data-sgs-fx'\s*\)")
RE_READ_JS = re.compile(r"getAttribute\(\s*['\"]data-sgs-fx['\"]\s*\)|\bdataset\.sgsFx\b")
RE_NULL_PRESENCE = re.compile(r"(?:null\s*[!=]==?\s*[\w$>.-]*\s*->?\s*$)|(?:[!=]==?\s*null)")
RE_CAPTURE = re.compile(r"data-sgs-fx=\"\(\[a-z0-9-\]\+\)\"")


class Finding(NamedTuple):
    path: str
    line: int
    kind: str  # selector | php-strpos | php-compare | js-compare | unrecognised
    text: str
    start: int
    end: int
    replacement: str | None  # None = needs a human


def mask_comments(text: str, lang: str) -> str:
    """Blank every comment (same length, newlines kept) so detectors see code only. String-aware."""
    out = list(text)
    n, i = len(text), 0
    line_comments = lang in ("js", "scss", "php")
    quotes = "'\"`" if lang == "js" else "'\""
    while i < n:
        c, two = text[i], text[i:i + 2]
        if two == "/*":
            j = text.find("*/", i + 2)
            j = n if j < 0 else j + 2
        elif line_comments and two == "//":
            j = text.find("\n", i)
            j = n if j < 0 else j
        elif c in quotes:
            j = i + 1
            while j < n and text[j] != c:
                j += 2 if text[j] == "\\" else 1
            i = min(j + 1, n)
            continue
        else:
            i += 1
            continue
        for k in range(i, j):
            if out[k] not in "\r\n":
                out[k] = " "
        i = j
    return "".join(out)


def js_token_test(expr: str, name: str, op: str) -> str:
    test = f"( {expr} || '' ).split( /\\s+/ ).includes( '{name}' )"
    return test if op in ("===", "==") else "! " + test


def scan_text(text: str, lang: str, rel: str) -> list[Finding]:
    code = mask_comments(text, lang)
    found: list[Finding] = []
    claimed: list[tuple[int, int]] = []

    def add(m_start: int, m_end: int, kind: str, repl: str | None) -> None:
        line = text.count("\n", 0, m_start) + 1
        found.append(Finding(rel, line, kind, text[m_start:m_end].strip()[:90], m_start, m_end, repl))
        claimed.append((m_start, m_end))

    def free(s: int, e: int) -> bool:
        return not any(s < ce and cs < e for cs, ce in claimed)

    for m in RE_SELECTOR.finditer(code):
        add(m.start(), m.end(), "selector", "[data-sgs-fx~=")
    if lang == "php":
        for m in RE_PHP_STRPOS.finditer(code):
            add(m.start(), m.end(), "php-strpos", f"! sgs_fx_markup_has_effect( {m['h']}, '{m['name']}' )")
        for m in RE_PHP_CMP_L.finditer(code):
            neg = "! " if m["op"] == "!==" else ""
            add(m.start(), m.end(), "php-compare", f"{neg}sgs_fx_has_effect( {m['e']}, '{m['name']}' )")
        for m in RE_PHP_CMP_R.finditer(code):
            if free(m.start(), m.end()):
                neg = "! " if m["op"] == "!==" else ""
                add(m.start(), m.end(), "php-compare", f"{neg}sgs_fx_has_effect( {m['e']}, '{m['name']}' )")
        for m in RE_PHP_STRPOS_ANY.finditer(code):
            if free(m.start(), m.end()):
                add(m.start(), m.end(), "unrecognised", None)
        for m in RE_CAPTURE.finditer(code):
            add(m.start(), m.end(), "unrecognised", None)
        for m in RE_READ_PHP.finditer(code):
            before = code[max(0, m.start() - 70):m.start()]
            presence = (re.search(r"null\s*[!=]==\s*\$[\w>-]+->$", before)
                        or re.search(r"sgs_fx_has_effect\(\s*\$[\w>-]+->$", before)
                        or re.match(r"\s*[!=]==\s*null", code[m.end():m.end() + 12]))
            if free(m.start(), m.end()) and not presence:
                add(m.start(), m.end(), "unrecognised", None)
    else_js = lang in ("js",)
    if else_js:
        for rx in (RE_JS_CMP_R, RE_JS_CMP_L):
            for m in rx.finditer(code):
                if free(m.start(), m.end()):
                    add(m.start(), m.end(), "js-compare", js_token_test(m["e"], m["name"], m["op"]))
        for m in RE_READ_JS.finditer(code):
            after = code[m.end():m.end() + 30]
            before = code[max(0, m.start() - 12):m.start()]
            presence = (re.match(r"\s*[!=]==?\s*null", after) or re.search(r"null\s*[!=]==?\s*[\w$.]*$", before)
                        or re.match(r"\s*\|\|\s*''\s*\)\.split", after))
            if free(m.start(), m.end()) and not presence:
                add(m.start(), m.end(), "unrecognised", None)
    found.sort(key=lambda f: f.start)
    return found


def blind_scan(text: str, lang: str, rel: str) -> list[Finding]:
    return []


def corpus(root: Path, dirs: tuple[str, ...] = SCAN_DIRS) -> list[Path]:
    files: list[Path] = []
    for d in dirs:
        base = root / d
        for dirpath, dirnames, names in os.walk(base):
            dirnames[:] = [x for x in dirnames if x not in SKIP_PARTS]
            for name in names:
                p = Path(dirpath) / name
                if p.suffix in EXTENSIONS and ".min." not in name:
                    files.append(p)
    return sorted(files)


def survey(root: Path, scan: Callable = scan_text, dirs: tuple[str, ...] = SCAN_DIRS) -> dict[str, list[Finding]]:
    result: dict[str, list[Finding]] = {}
    for p in corpus(root, dirs):
        text = p.read_bytes().decode("utf-8", errors="replace")
        rel = p.relative_to(root).as_posix()
        hits = scan(text, EXTENSIONS[p.suffix], rel)
        if hits:
            result[rel] = hits
    return result


def apply_fixes(text: str, hits: list[Finding]) -> str:
    for h in sorted((x for x in hits if x.replacement is not None), key=lambda f: f.start, reverse=True):
        text = text[:h.start] + h.replacement + text[h.end:]
    return text


def is_dirty(root: Path, rel: str) -> bool:
    done = subprocess.run(["git", "status", "--porcelain", "--", rel], cwd=root, capture_output=True, text=True)
    return bool(done.stdout.strip()) or done.returncode != 0


def atomic_write(path: Path, data: bytes) -> None:
    tmp = path.with_name(path.name + ".tmp")
    tmp.write_bytes(data)
    os.replace(tmp, path)


def summarise(found: dict[str, list[Finding]]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for hits in found.values():
        for h in hits:
            counts[h.kind] = counts.get(h.kind, 0) + 1
    return counts


def cmd_survey(root: Path, as_json: bool) -> int:
    found = survey(root)
    counts = summarise(found)
    if as_json:
        print(json.dumps({"files": len(found), "counts": counts, "total": sum(counts.values()),
                          "findings": {p: [h._asdict() for h in hs] for p, hs in found.items()}}, indent=1, default=str))
        return 0
    for rel, hits in found.items():
        kinds: dict[str, int] = {}
        for h in hits:
            kinds[h.kind] = kinds.get(h.kind, 0) + 1
        print(f"{sum(kinds.values()):4d}  {rel}  {kinds}")
        for h in hits:
            if h.kind == "unrecognised":
                print(f"        unrecognised line {h.line}: {h.text}")
    print(f"survey: {sum(counts.values())} exact-match reader(s) in {len(found)} file(s) {counts}; unrecognised={counts.get('unrecognised', 0)}")
    return 0


def cmd_fix(root: Path, apply: bool) -> int:
    found = survey(root)
    skipped, changed = [], []
    for rel, hits in found.items():
        fixable = [h for h in hits if h.replacement is not None]
        if not fixable:
            continue
        if is_dirty(root, rel):
            skipped.append(rel)
            continue
        path = root / rel
        old = path.read_bytes().decode("utf-8")
        new = apply_fixes(old, fixable)
        if new == old:
            continue
        changed.append(rel)
        if apply:
            atomic_write(path, new.encode("utf-8"))
        else:
            sys.stdout.writelines(difflib.unified_diff(old.splitlines(True), new.splitlines(True), f"a/{rel}", f"b/{rel}", n=0))
    print(f"fix: {'wrote' if apply else 'would change'} {len(changed)} file(s); skipped dirty: {len(skipped)}")
    for rel in skipped:
        print(f"  SKIPPED (uncommitted changes): {rel}")
    return 0


def cmd_check(root: Path, scan: Callable = scan_text) -> int:
    found = survey(root, scan)
    total = sum(len(h) for h in found.values())
    for rel, hits in found.items():
        for h in hits:
            print(f"{rel}:{h.line}: {h.kind}: {h.text}")
    if total:
        print(f"check: FAIL - {total} exact-match reader(s) of data-sgs-fx in {len(found)} file(s); match a token (~=, sgs_fx_has_effect)")
        return 1
    print("check: ok - no exact-match reader of data-sgs-fx")
    return 0


FIXTURES = {
    "plugins/sgs-blocks/assets/css/bad.css": '/* [data-sgs-fx="comment-only"] */\n[data-sgs-fx="magnet"] { color: red; }\n',
    "plugins/sgs-blocks/src/bad.js": ("const A = `[data-sgs-fx=\"${ e }\"]`;\n"
                                      "if ( el.dataset.sgsFx === 'x' ) {}\n"
                                      "if ( 'y' !== a.b.getAttribute( 'data-sgs-fx' ) ) {}\n"),
    "plugins/sgs-blocks/includes/bad.php": ("<?php\nif ( false === \\strpos( $html, 'data-sgs-fx=\"particles\"' ) ) {}\n"
                                            "if ( 'particles' !== $processor->get_attribute( 'data-sgs-fx' ) ) {}\n"),
    "plugins/sgs-blocks/src/clean.css": '[data-sgs-fx~="magnet"] { color: red; }\n[data-sgs-fx-start="load"] { top: 0; }\n[data-sgs-fx] { top: 1px; }\n',
    "plugins/sgs-blocks/src/clean.js": ("// [data-sgs-fx=\"only-a-comment\"]\nconst s = '[data-sgs-fx~=\"x\"]';\n"
                                        "const start = el.getAttribute( 'data-sgs-fx-start' ) === 'load';\n"
                                        "const has = null !== el.getAttribute( 'data-sgs-fx' );\n"),
    "plugins/sgs-blocks/includes/clean.php": ("<?php\n// 'x' === $p->get_attribute( 'data-sgs-fx' )\n"
                                              "$a = null !== $p->get_attribute( 'data-sgs-fx' );\n"
                                              "$b = $p->get_attribute( 'data-sgs-fx-start' ) === 'load';\n"
                                              "$c = ' data-sgs-fx=\"draggable\"';\n"
                                              "$p->set_attribute( 'data-sgs-fx', 'flip' );\n"),
}


def self_test(scan: Callable = scan_text) -> list[str]:
    """Return the list of failed assertions (empty = pass)."""
    failures: list[str] = []
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        for rel, body in FIXTURES.items():
            target = root / rel
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(body.encode("utf-8"))
        found = survey(root, scan, ("plugins/sgs-blocks",))
        want = {"plugins/sgs-blocks/assets/css/bad.css": {"selector": 1},
                "plugins/sgs-blocks/src/bad.js": {"selector": 1, "js-compare": 2},
                "plugins/sgs-blocks/includes/bad.php": {"php-strpos": 1, "php-compare": 1}}
        for rel, kinds in want.items():
            got = summarise({rel: found.get(rel, [])})
            if got != kinds:
                failures.append(f"{rel}: wanted {kinds}, found {got}")
        for rel in FIXTURES:
            if "clean" in rel and rel in found:
                failures.append(f"clean fixture flagged: {rel} {summarise({rel: found[rel]})}")
        for rel in want:
            path = root / rel
            fixed = apply_fixes(path.read_bytes().decode("utf-8"), found.get(rel, []))
            path.write_bytes(fixed.encode("utf-8"))
        after = survey(root, scan, ("plugins/sgs-blocks",))
        if after:
            failures.append(f"fixed fixtures still flagged: {summarise(after)}")
        css = (root / "plugins/sgs-blocks/assets/css/bad.css").read_text(encoding="utf-8")
        if '[data-sgs-fx~="magnet"]' not in css or '/* [data-sgs-fx="comment-only"] */' not in css:
            failures.append("css fix wrong or touched a comment")
        js = (root / "plugins/sgs-blocks/src/bad.js").read_text(encoding="utf-8")
        if "( el.dataset.sgsFx || '' ).split( /\\s+/ ).includes( 'x' )" not in js or "! ( a.b.getAttribute" not in js:
            failures.append("js fix wrong")
        php = (root / "plugins/sgs-blocks/includes/bad.php").read_text(encoding="utf-8")
        if "! sgs_fx_markup_has_effect( $html, 'particles' )" not in php or "sgs_fx_has_effect( $processor->get_attribute( 'data-sgs-fx' ), 'particles' )" not in php:
            failures.append("php fix wrong")
        if survey(root, scan, ("plugins/sgs-blocks",)) != {}:
            failures.append("not idempotent")
    return failures


def cmd_self_test(blind: bool) -> int:
    failures = self_test(blind_scan if blind else scan_text)
    for f in failures:
        print(f"  FAIL: {f}")
    if failures:
        print(f"self-test: FAIL ({len(failures)} assertion(s))")
        return 1
    print("self-test: ok - selector, JS comparison and PHP comparison caught; clean fixtures, comments, presence checks and data-sgs-fx-start ignored; fixes idempotent")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--survey", action="store_true")
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--fix", action="store_true")
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--self-test", action="store_true")
    ap.add_argument("--blind", action="store_true", help="with --self-test: use a detector that finds nothing (must exit 1)")
    a = ap.parse_args()
    if a.self_test:
        return cmd_self_test(a.blind)
    if a.check:
        return cmd_check(ROOT)
    if a.fix:
        return cmd_fix(ROOT, a.apply)
    if a.survey:
        return cmd_survey(ROOT, a.json)
    ap.print_help()
    return 2


if __name__ == "__main__":
    sys.exit(main())
