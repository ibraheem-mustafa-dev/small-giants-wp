#!/usr/bin/env python3
"""migrate-motion-helpers.py - retire `sgs_motion\x5fvalid_cubic_bezier` and `sgs_motion\x5fms` (Spec 38A FR-38A-55).

The two helpers were the old per-feature easing validator and millisecond clamp. The easing validator is now
`Sgs_Motion_Field_Types::is_valid_cubic_bezier()` (includes/motion/class-sgs-motion-field-types.php; editor twin
`isValidCubicBezier` in src/components/motion/field-types.js). The flat-millisecond clamp the nav, cart, icon and header
attributes still use is `sgs_flat_duration_ms()` in includes/helpers-motion-easing.php, which validates through the
duration field type.

  --survey [--json]   every reference under plugins/ by file, line and kind (code call, test call, comment or
                      description, definition, other code)
  --fix [--apply]     prints the diff; with --apply writes it. Rewrites the mechanical shapes only: a one-line
                      `sgs_motion\x5fms( a, b[, c] )` call, and the comment and description wordings in COMMENT_RULES.
                      Refuses a file that has uncommitted changes, a definition, a multi-line call, a call with a
                      wrong argument count and any code line it has no rule for; every refusal is listed.
  --check             exit 1 while any reference to either name remains anywhere under plugins/ (comments and
                      block.json included)
  --self-test         plants a caller in a temp copy: --check must exit 1 on it and 0 on the clean copy, and --fix
                      must clear a planted caller, comment and description

Run from anywhere:  python plugins/sgs-blocks/scripts/migrate-motion-helpers.py --check
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

sys.stdout.reconfigure(encoding="utf-8")
HERE = Path(__file__).resolve()
REPO = HERE.parents[3]

OLD_NAMES = ("sgs_motion\x5fvalid_cubic_bezier", "sgs_motion\x5fms")
NAME_RE = re.compile(r"\b(?:sgs_motion\x5fvalid_cubic_bezier|sgs_motion\x5fms)\b")
CALL_RE = re.compile(r"\bsgs_motion\x5fms(\s*)\(")
NEW_CALL = "sgs_flat_duration_ms"
TEXT_SUFFIXES = {".php", ".js", ".mjs", ".cjs", ".jsx", ".ts", ".tsx", ".json", ".md", ".py", ".css", ".scss", ".txt", ".html", ".sh", ".yml", ".yaml"}
SKIP_PARTS = {"node_modules", "vendor", "build", ".git", ".phpunit.cache"}
DEFINITION_RE = re.compile(r"\bfunction\s+(?:sgs_motion\x5fvalid_cubic_bezier|sgs_motion\x5fms)\b|function_exists\(\s*['\"](?:sgs_motion\x5fvalid_cubic_bezier|sgs_motion\x5fms)['\"]")
COMMENT_LINE_RE = re.compile(r"^\s*(?://|\*|/\*|#)")
JSON_TEXT_KEY_RE = re.compile(r'^\s*"(?:description|_note|help|label)"\s*:')

# Ordered (old, new) wordings for comment and description lines. Each is applied wherever it occurs on such a line.
COMMENT_RULES: tuple[tuple[str, str], ...] = (
    ("includes/helpers-motion-easing.php::sgs_motion\x5fvalid_cubic_bezier",
     "includes/motion/class-sgs-motion-field-types.php::Sgs_Motion_Field_Types::is_valid_cubic_bezier"),
    ("validated by sgs_motion\x5fms()", "validated by sgs_flat_duration_ms() against the duration field type"),
    ("`sgs_motion\x5fvalid_cubic_bezier()`", "`Sgs_Motion_Field_Types::is_valid_cubic_bezier()`"),
    ("sgs_motion\x5fvalid_cubic_bezier()", "Sgs_Motion_Field_Types::is_valid_cubic_bezier()"),
    ("validated by sgs_motion\x5fvalid_cubic_bezier)", "validated by the easing field type, Sgs_Motion_Field_Types::is_valid_cubic_bezier)"),
    ("sgs_motion\x5fms()", "sgs_flat_duration_ms()"),
)


def plugin_root(repo: Path) -> Path:
    return repo / "plugins"


def list_files(repo: Path) -> list[Path]:
    """Every scannable text file under plugins/: tracked and untracked-unignored in the real repo, a walk elsewhere."""
    base = plugin_root(repo)
    found: list[Path] = []
    if repo == REPO:
        out = subprocess.run(["git", "ls-files", "-co", "--exclude-standard", "-z", "--", "plugins"], cwd=repo,
                             capture_output=True, check=True).stdout.decode("utf-8", "replace")
        found = [repo / p for p in out.split("\0") if p]
    else:
        for dirpath, dirnames, filenames in os.walk(base):
            dirnames[:] = [d for d in dirnames if d not in SKIP_PARTS]
            found += [Path(dirpath) / f for f in filenames]
    return sorted(p for p in found if p.suffix in TEXT_SUFFIXES and p.is_file() and p.resolve() != HERE
                  and not (SKIP_PARTS & set(p.parts)))


def read(path: Path) -> str:
    with open(path, encoding="utf-8", errors="replace", newline="") as handle:
        return handle.read()


def write_atomic(path: Path, text: str) -> None:
    tmp = path.with_name(path.name + ".tmp")
    with open(tmp, "w", encoding="utf-8", newline="") as handle:
        handle.write(text)
    os.replace(tmp, path)


def classify(rel: str, line: str) -> str:
    """definition | comment | code-call | test-call | other-code, for one line that names an old helper."""
    suffix = Path(rel).suffix
    if DEFINITION_RE.search(line):
        return "definition"
    if suffix == ".json":
        return "comment" if JSON_TEXT_KEY_RE.match(line) else "other-code"
    if suffix == ".md":
        return "comment"
    if COMMENT_LINE_RE.match(line):
        return "comment"
    if CALL_RE.search(line) and "sgs_motion\x5fvalid_cubic_bezier" not in line:
        return "test-call" if "/tests/" in "/" + rel else "code-call"
    return "other-code"


def survey(repo: Path) -> list[dict]:
    rows: list[dict] = []
    for path in list_files(repo):
        rel = path.relative_to(repo).as_posix()
        for number, line in enumerate(read(path).splitlines(), 1):
            if NAME_RE.search(line):
                names = sorted(set(NAME_RE.findall(line)))
                rows.append({"file": rel, "line": number, "kind": classify(rel, line), "names": names, "text": line.strip()[:140]})
    return rows


def call_shape_ok(line: str) -> bool:
    """True when every `sgs_motion\x5fms(` on the line closes on the same line with two or three top-level arguments."""
    for match in CALL_RE.finditer(line):
        depth, args, quote, index = 1, 1, "", match.end()
        while index < len(line) and depth:
            char = line[index]
            if quote:
                if char == "\\":
                    index += 1
                elif char == quote:
                    quote = ""
            elif char in "'\"":
                quote = char
            elif char in "([{":
                depth += 1
            elif char in ")]}":
                depth -= 1
            elif char == "," and depth == 1:
                args += 1
            index += 1
        if depth or args not in (2, 3):
            return False
    return True


def transform_line(rel: str, line: str, kind: str) -> tuple[str, str]:
    """Return (new_line, refusal). A non-empty refusal means the line was left alone."""
    if kind == "comment":
        new = line
        for old, repl in COMMENT_RULES:
            new = new.replace(old, repl)
        return (new, "") if not NAME_RE.search(new) else (line, "comment wording has no rule")
    if kind in ("code-call", "test-call"):
        if not call_shape_ok(line):
            return line, "call is not a one-line two- or three-argument call"
        new = CALL_RE.sub(NEW_CALL + "(", line)
        return (new, "") if not NAME_RE.search(new) else (line, "line names the old helpers outside a plain call")
    return line, f"{kind} needs a hand edit"


def is_dirty(repo: Path, rel: str) -> bool:
    if repo != REPO:
        return False
    for args in (["git", "diff", "--quiet", "--", rel], ["git", "diff", "--cached", "--quiet", "--", rel]):
        if subprocess.run(args, cwd=repo).returncode != 0:
            return True
    return False


def plan_fix(repo: Path) -> tuple[dict[Path, str], list[dict]]:
    """Per-file rewritten text for the fixable files, plus every refusal (file-level or line-level)."""
    rewrites: dict[Path, str] = {}
    refusals: list[dict] = []
    by_file: dict[str, list[dict]] = {}
    for row in survey(repo):
        by_file.setdefault(row["file"], []).append(row)
    for rel, rows in by_file.items():
        path = repo / rel
        if is_dirty(repo, rel):
            refusals += [dict(r, reason="file has uncommitted changes (another session may own it)") for r in rows]
            continue
        lines = read(path).splitlines(keepends=True)
        changed = False
        for row in rows:
            index = row["line"] - 1
            body = lines[index].rstrip("\r\n")
            ending = lines[index][len(body):]
            new, reason = transform_line(rel, body, row["kind"])
            if reason:
                refusals.append(dict(row, reason=reason))
            elif new != body:
                lines[index] = new + ending
                changed = True
        if changed:
            rewrites[path] = "".join(lines)
    return rewrites, refusals


def cmd_survey(repo: Path, as_json: bool) -> int:
    rows = survey(repo)
    counts: dict[str, int] = {}
    for row in rows:
        counts[row["kind"]] = counts.get(row["kind"], 0) + 1
    files = sorted({r["file"] for r in rows})
    if as_json:
        print(json.dumps({"total": len(rows), "files": len(files), "by_kind": counts, "rows": rows}, indent=2))
        return 0
    for row in rows:
        print(f"{row['kind']:<11} {row['file']}:{row['line']}  {row['text']}")
    print(f"survey: {len(rows)} references in {len(files)} files; by kind {json.dumps(counts, sort_keys=True)}")
    return 0


def cmd_fix(repo: Path, apply: bool) -> int:
    rewrites, refusals = plan_fix(repo)
    for path, text in sorted(rewrites.items()):
        rel = path.relative_to(repo).as_posix()
        diff = difflib.unified_diff(read(path).splitlines(), text.splitlines(), f"a/{rel}", f"b/{rel}", lineterm="", n=0)
        print("\n".join(diff))
        if apply:
            write_atomic(path, text)
    for refusal in refusals:
        print(f"REFUSED {refusal['file']}:{refusal['line']} [{refusal['kind']}] {refusal['reason']}: {refusal['text']}")
    print(f"fix: {'wrote' if apply else 'would rewrite'} {len(rewrites)} files, {len(refusals)} references refused (hand edit)")
    return 0


def cmd_check(repo: Path, quiet: bool = False) -> int:
    rows = survey(repo)
    if not quiet:
        for row in rows:
            print(f"{row['kind']:<11} {row['file']}:{row['line']}  {row['text']}")
        print(f"check: {len(rows)} references to {' / '.join(OLD_NAMES)} remain under plugins/" if rows
              else "check: 0 references to the old helpers under plugins/")
    return 1 if rows else 0


def build_fixture(root: Path, planted: bool) -> None:
    files = {
        "plugins/x/includes/clean.php": "<?php\n$ms = sgs_flat_duration_ms( $attributes['d'] ?? null, 250, 1000 );\n"
                                        "$ok = \\SGS\\Blocks\\Motion\\Sgs_Motion_Field_Types::is_valid_cubic_bezier( $c );\n",
        "plugins/x/src/blocks/b/block.json": '{\n\t"attributes": {\n\t\t"c": {\n\t\t\t"description": "A curve (validated by the easing field type)."\n\t\t}\n\t}\n}\n',
    }
    if planted:
        files["plugins/x/includes/planted.php"] = "<?php\n$ms = sgs_motion\x5fms( $attributes['d'] ?? null, 250 );\n// Mirrors sgs_motion\x5fvalid_cubic_bezier().\n"
        files["plugins/x/src/blocks/b/block.json"] = files["plugins/x/src/blocks/b/block.json"].replace(
            "(validated by the easing field type)", "(validated by sgs_motion\x5fvalid_cubic_bezier)")
    for rel, text in files.items():
        target = root / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        write_atomic(target, text)


def cmd_self_test() -> int:
    failures: list[str] = []
    with tempfile.TemporaryDirectory(prefix="migrate-motion-helpers-") as tmp:
        clean, dirty = Path(tmp) / "clean", Path(tmp) / "planted"
        build_fixture(clean, planted=False)
        build_fixture(dirty, planted=True)
        if cmd_check(clean, quiet=True) != 0:
            failures.append("clean copy: --check should exit 0")
        if cmd_check(dirty, quiet=True) != 1:
            failures.append("planted copy: --check should exit 1 (code call, comment and block.json description)")
        kinds = sorted({r["kind"] for r in survey(dirty)})
        if kinds != ["code-call", "comment"]:
            failures.append(f"planted copy: survey kinds should be code-call and comment, got {kinds}")
        rewrites, refusals = plan_fix(dirty)
        for path, text in rewrites.items():
            write_atomic(path, text)
        if refusals or cmd_check(dirty, quiet=True) != 0:
            failures.append(f"planted copy: --fix should clear every planted reference, refused {len(refusals)}")
        else:
            fixed = read(dirty / "plugins/x/includes/planted.php")
            if "sgs_flat_duration_ms( $attributes['d'] ?? null, 250 )" not in fixed:
                failures.append("planted copy: the call was not rewritten to sgs_flat_duration_ms")
        hand = clean / "plugins/x/includes/hand.php"
        write_atomic(hand, "<?php\nfunction sgs_motion\x5fms( $raw, int $default ) {\n\treturn $default;\n}\n")
        _, refused = plan_fix(clean)
        if not refused or cmd_check(clean, quiet=True) != 1:
            failures.append("a definition must be refused by --fix and still fail --check")
    for failure in failures:
        print(f"self-test FAIL: {failure}")
    print("self-test: " + ("FAILED" if failures else "ok (planted caller caught, clean copy passes, --fix clears and refuses correctly)"))
    return 1 if failures else 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--survey", action="store_true")
    parser.add_argument("--json", action="store_true", help="with --survey: machine-readable census")
    parser.add_argument("--fix", action="store_true")
    parser.add_argument("--apply", action="store_true", help="with --fix: write the changes")
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--self-test", dest="self_test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        return cmd_self_test()
    if args.survey:
        return cmd_survey(REPO, args.json)
    if args.fix:
        return cmd_fix(REPO, args.apply)
    if args.check:
        return cmd_check(REPO)
    parser.print_help()
    return 2


if __name__ == "__main__":
    sys.exit(main())
