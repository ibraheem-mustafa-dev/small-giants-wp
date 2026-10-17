#!/usr/bin/env python3
"""check-motion-literals.py - no hard-coded motion time or easing in block CSS (Spec 38A FR-38A-53).

THE TOKENS: `settings.custom.duration` and `settings.custom.easing` in `theme/sgs-theme/theme.json`, read at run time.
Nothing here hard-codes a token. Equality is computed across units (`0.3s` equals `300ms`) and after whitespace and
leading-zero normalisation (`cubic-bezier(.4,0,.2,1)` equals `cubic-bezier(0.4, 0, 0.2, 1)`).

WHAT IS SCANNED  every transition / animation declaration (shorthand, -duration, -delay, -timing-function) in
`plugins/sgs-blocks/src/blocks/**/*.css|scss`, `plugins/sgs-blocks/assets/css/*.css`, and the CSS text inside every
PHP file under `src/blocks/` and `includes/` (any file there can emit CSS). What counts as a literal, the role rule for delays and the PHP
string limits are in motion_literals_scan.py.

ALLOWED  a literal inside a var() fallback (`var(--wp--custom--duration--medium, 300ms)`); `none`; property names that
merely contain a keyword; and the zero values `0s`, `0ms` and the reduced-motion idiom `0.01ms`, which switch motion
off, and a `1ms` animation-duration that sits beside an `animation-timeline` (a scroll-driven animation needs a non-zero
duration). Exempt values are never failed or rewritten, but `--survey` counts them so nothing is hidden.

MODES
  --check      exit 0 when no unallowed literal exists, else 1 and print each. Reads the shared allow-list
               (`motion_gate_allowlist.load(root, 'motion-literals')`, entries {gate, pattern, reason,
               delete_in_unit}); pattern is a file path or `file::selector`. An entry that is malformed or whose unit
               has landed fails the run; an entry that matches nothing is noted.
  --survey     list every literal (file, line, property, literal, kind, exact token or nearest token, exempt) with
               totals per kind, per outcome and per directory; --json returns the same as JSON. Nearest duration is
               by absolute difference; nearest easing is `linear` to easing.linear only, otherwise "no token".
  --fix        rewrite only literals that exactly equal a token into `var(--wp--custom--<family>--<key>, <literal>)`
               (the original stays as the fallback so the page paints if the token is missing). Delays, zero values
               and non-equal literals are left and listed as decisions. Idempotent; keeps line endings; in a
               render.php only CSS text is rewritten. Run it on the real repo only in the sweep unit.
  --self-test  plants cases on in-memory strings and a temp folder; exits 0 only when each behaves as expected.

--root <dir> points every mode at another tree laid out like the repo (used by --self-test and fix proofs).

NOT WIRED: this gate is not in run-gates.py or package.json. The repo still holds literals, so wiring it now would fail
every commit; the wiring belongs to the sweep unit that runs after the old motion code is deleted.

Run from the repo root:  python plugins/sgs-blocks/scripts/check-motion-literals.py --check
"""
from __future__ import annotations

import argparse
import json
import shutil
import sys
import tempfile
from collections import Counter
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, str(Path(__file__).resolve().parent))
import motion_gate_allowlist as allowlist  # noqa: E402
import motion_literals_scan as scan  # noqa: E402

REPO = Path(__file__).resolve().parents[3]
GATE = "motion-literals"
VAR_OK = "var(--wp--custom--duration--medium, 300ms) var(--wp--custom--easing--default)"


def collect(root: Path) -> tuple[list[scan.Finding], int, list[dict], list[str]]:
    tokens = scan.load_tokens(root)
    findings, nfiles = scan.scan_repo(root, tokens)
    entries, errors = allowlist.load(root, GATE)
    used: set[int] = set()
    for f in findings:
        if f.exempt:
            continue
        masked = None
        for i, entry in enumerate(entries):
            pat = str(entry["pattern"])
            file_part, _, sel = pat.partition("::")
            if file_part != f.file:
                continue
            if sel:
                if masked is None:
                    masked = scan.mask((root / f.file).read_bytes().decode("utf-8"), f.file.endswith(".php"))
                if scan.selector_at(masked, f.start) != " ".join(sel.split()):
                    continue
            f.allowed = True
            used.add(i)
    errors += [f"note: allow-list entry {e['pattern']!r} matches no literal" for i, e in enumerate(entries) if i not in used]
    return findings, nfiles, entries, errors


def survey(root: Path, as_json: bool) -> int:
    findings, nfiles, _, _ = collect(root)
    live = [f for f in findings if not f.exempt]
    exact = [f for f in live if f.match]
    totals = {
        "literals": len(live), "exempt_zero": len(findings) - len(live), "files_scanned": nfiles,
        "files_with_literals": len({f.file for f in live}),
        "by_kind": dict(Counter(f.kind for f in live)),
        "by_outcome": {"exact_token": len(exact), "needs_decision": len(live) - len(exact),
                       "exempt": len(findings) - len(live)},
        "by_directory": dict(sorted(Counter(Path(f.file).parent.as_posix() for f in live).items())),
    }
    if as_json:
        print(json.dumps({"totals": totals, "findings": [f.as_dict() for f in findings]}, indent=1))
        return 0
    for f in findings:
        if f.exempt:
            verdict = "exempt"
        elif f.match:
            verdict = f"= {f.match[0]}.{f.match[1]}"
        else:
            verdict = f"needs decision; nearest: {f.nearest}"
        print(f"{f.file}:{f.line}  {f.prop}  {f.literal}  [{f.kind}/{f.role}]  {verdict}")
    print("\nTOTALS")
    for key in ("literals", "files_with_literals", "files_scanned", "exempt_zero"):
        print(f"  {key}: {totals[key]}")
    print(f"  by kind: {totals['by_kind']}")
    print(f"  by outcome: {totals['by_outcome']}")
    print("  by directory:")
    for d, n in totals["by_directory"].items():
        print(f"    {n:4d}  {d}")
    return 0


def check(root: Path, quiet: bool = False) -> int:
    findings, _, _, notes = collect(root)
    bad = [f for f in findings if not f.exempt and not f.allowed]
    hard = [n for n in notes if not n.startswith("note:")]
    if not quiet:
        for f in bad:
            print(f"FAIL {f.file}:{f.line}  {f.prop}: {f.literal} ({f.kind}) - use a motion token")
        for n in notes:
            print(("FAIL " if n in hard else "") + n)
        print(f"motion-literals: {len(bad)} unallowed literal(s), {len(hard)} allow-list error(s)")
    return 1 if bad or hard else 0


def fix(root: Path) -> int:
    findings, _, _, _ = collect(root)
    changed = rewritten = 0
    for rel in sorted({f.file for f in findings}):
        path = root / rel
        raw = path.read_bytes().decode("utf-8")
        new, n = scan.rewrite(raw, [f for f in findings if f.file == rel])
        if n:
            path.write_bytes(new.encode("utf-8"))
            changed += 1
            rewritten += n
            print(f"fixed {rel}: {n} literal(s)")
    left = [f for f in findings if not f.exempt and not (f.match and f.role != "delay")]
    print(f"\nrewrote {rewritten} literal(s) in {changed} file(s)")
    print(f"{len(left)} literal(s) need a decision (no exact token):")
    for f in left:
        print(f"  {f.file}:{f.line}  {f.prop}  {f.literal}  nearest: {f.nearest or 'n/a'}")
    return 0


CASES = [
    ("spec negative control: animation: x 0.5s ease", ".a{animation: x 0.5s ease;}", "css", 1, 0),
    ("spec fallback position: rotate var(.., 300ms) var(..)",
     f".a{{transition: rotate {VAR_OK};}}", "css", 0, 0),
    ("comma list of transitions", ".a{transition: opacity .3s ease, transform var(--d, 300ms) var(--e);}", "css", 1, 0),
    ("multi-line value", ".a{\n  transition:\n    opacity 0.2s,\n    transform var(--d);\n}", "css", 1, 0),
    ("!important", ".a{transition: opacity var(--d) 0.3s !important;}", "css", 1, 0),
    ("clean multi-line, tokens only", ".a{\n transition:\n  opacity var(--d),\n  transform var(--d, 1s);\n}", "css", 0, 0),
    ("0s / 0ms / 0.01ms exempt", ".a{transition: none 0s; animation-duration: 0.01ms; transition-delay: 0ms;}", "css", 0, 3),
    ("1ms duration beside animation-timeline is exempt",
     ".a{animation-name:x;animation-duration:1ms;animation-timeline:scroll(root block);}", "css", 0, 1),
    ("1ms duration with no animation-timeline is a literal", ".a{animation-duration:1ms;}", "css", 1, 0),
    ("PHP string with a scroll-timeline 1ms is exempt",
     "<?php\n$c = 'animation-name:x-' . $uid . ';animation-duration:1ms;animation-timeline:scroll(root block);';\n", "php", 0, 1),
    (".01ms without the leading zero is exempt too", ".a{transition-duration:.01ms;}", "css", 0, 1),
    ("none, animation-name, transition-property",
     ".a{transition: none; animation-name: linear-gradient-x; transition-property: opacity, transform;}", "css", 0, 0),
    ("easing in var() fallback", ".a{transition-timing-function: var(--e, ease-in-out);}", "css", 0, 0),
    ("nested var() fallback", ".a{animation-duration: var(--a, var(--b, 1s));}", "css", 0, 0),
    ("cubic-bezier literal", ".a{animation-timing-function: cubic-bezier(.4,0,.2,1);}", "css", 1, 0),
    ("steps() and linear() literals", ".a{animation: x var(--d) steps(4); transition-timing-function: linear(0, 1);}", "css", 1, 0),
    ("delay literal", ".a{animation-delay: 1s;}", "css", 1, 0),
    ("vendor prefix", ".a{-webkit-transition: opacity .3s;}", "css", 1, 0),
    ("literal in block comment ignored", ".a{/* transition: opacity .3s ease; */ color: red;}", "css", 0, 0),
    ("minified last declaration", ".a{transition:opacity .25s}", "css", 1, 0),
    ("PHP string holds a declaration", "<?php\n$css .= '.a{transition:opacity .3s ease-out}';\n", "php", 1, 0),
    ("PHP tokens only", "<?php\n$css = '.a{transition:opacity var(--wp--custom--duration--fast) var(--e)}';\n", "php", 0, 0),
    ("PHP heredoc declaration", "<?php\n$css = <<<CSS\n.a {\n  animation: x 2s linear;\n}\nCSS;\n", "php", 1, 0),
    ("PHP file with a later ?> still scans its CSS strings",
     "<?php\n$css = '.a{transition:transform .2s ease;}';\n?>\n<div><?php echo esc_html( $x ); ?></div>\n", "php", 1, 0),
    ("PHP // comment ignored, code after it still scanned",
     "<?php\n// transition: opacity .3s ease;\n$a = '.b{transition:opacity .3s}';\n", "php", 1, 0),
    ("PHP // comment ignored", "<?php\n// transition: opacity .3s ease;\n$a = 300;\n", "php", 0, 0),
]


def self_test() -> int:
    tokens = scan.load_tokens(REPO)
    failed = 0

    def report(name: str, ok: bool, detail: str) -> None:
        nonlocal failed
        failed += not ok
        print(f"{'PASS' if ok else 'FAIL'}  {name}  [{detail}]")

    for name, text, kind, want, want_exempt in CASES:
        found = scan.scan_text(text, "case." + kind, tokens)
        code = 1 if any(not f.exempt for f in found) else 0
        exempt = sum(f.exempt for f in found)
        report(name, code == want and exempt == want_exempt, f"scanner exit {code}, want {want}; exempt {exempt}, want {want_exempt}")

    tmp = Path(tempfile.mkdtemp(prefix="motion-literals-"))
    try:
        (tmp / scan.THEME_REL).parent.mkdir(parents=True)
        shutil.copy(REPO / scan.THEME_REL, tmp / scan.THEME_REL)
        css = tmp / "plugins/sgs-blocks/src/blocks/demo/style.css"
        php = tmp / "plugins/sgs-blocks/src/blocks/demo/render.php"
        css.parent.mkdir(parents=True)
        css.write_bytes(b".a{transition: opacity .3s cubic-bezier(.4,0,.2,1), color 350ms;}\r\n.b{animation: x 0.25s linear 0.3s;}\r\n")
        php.write_bytes(b"<?php\n$ms = 300;\n$css = '.c{transition:opacity 300ms}';\n")
        before = {p: p.read_bytes() for p in (css, php)}
        code = check(tmp, quiet=True)
        report("temp tree: --check fails before fix", code == 1, f"exit {code}")
        fix_out = fix_quiet(tmp)
        after = {p: p.read_bytes() for p in (css, php)}
        text = after[css].decode()
        ok = ("var(--wp--custom--duration--medium, .3s)" in text and "var(--wp--custom--easing--default, cubic-bezier(.4,0,.2,1))" in text
              and "var(--wp--custom--duration--fast, 0.25s)" in text and "var(--wp--custom--easing--linear, linear)" in text)
        report("--fix swaps exact-token literals (time, easing, equal across units)", ok, "css rewritten")
        report("--fix keeps CRLF", b"\r\n" in after[css] and b"\n" not in after[css].replace(b"\r\n", b""), "line endings")
        report("negative control: non-equal 350ms and the 0.3s delay untouched", "color 350ms" in text and text.count(" 0.3s") == 1, "left as is")
        report("--fix touches only CSS text in render.php", b"$ms = 300;" in after[php] and b"var(--wp--custom--duration--medium, 300ms)" in after[php], "php code kept")
        report("--fix lists non-equal literals as decisions", "350ms" in fix_out and "0.3s" in fix_out, "listed")
        fix_quiet(tmp)
        report("--fix is idempotent", {p: p.read_bytes() for p in (css, php)} == after, "second run changed nothing")
        report("--fix changed something at all", after != before, "first run changed files")
        css.write_bytes(css.read_bytes().replace(b"color 350ms", b"color var(--d)").replace(b" 0.3s;", b" var(--l);"))
        php.write_bytes(php.read_bytes())
        code = check(tmp, quiet=True)
        report("temp tree: --check passes once literals are tokens", code == 0, f"exit {code}")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    print("self-test:", "FAILED" if failed else "all cases passed")
    return 1 if failed else 0


def fix_quiet(root: Path) -> str:
    import contextlib
    import io
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        fix(root)
    return buf.getvalue()


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    mode = ap.add_mutually_exclusive_group(required=True)
    for flag in ("check", "survey", "fix", "self-test"):
        mode.add_argument(f"--{flag}", action="store_true")
    ap.add_argument("--json", action="store_true", help="with --survey, print JSON")
    ap.add_argument("--root", type=Path, default=REPO, help="tree laid out like the repo (default: this repo)")
    args = ap.parse_args()
    root = args.root.resolve()
    if args.self_test:
        return self_test()
    if args.survey:
        return survey(root, args.json)
    if args.fix:
        return fix(root)
    return check(root)


if __name__ == "__main__":
    sys.exit(main())
