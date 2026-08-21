#!/usr/bin/env python3
"""STOP-NO-KSORT gate — never reorder $attributes before it is hashed into a uid.

WHY THIS EXISTS
---------------
Every content-addressed scoping uid in this plugin is built the same way:

    $uid = 'sgs-<block>-' . substr( md5( wp_json_encode( $attributes ) . <anchor?> ), 0, 8 );

That hash is only stable across saves if `$attributes` is hashed in the SHAPE WordPress
handed it in. `wp_json_encode()` preserves PHP array key order, so any sort applied to
`$attributes` (or the exact array passed into the hash) BEFORE the hash line silently
changes the uid for identical content — fragmenting the CSS cache (Spec 37 FR-37-16's
"re-save = same uid" golden) with no visible symptom; the page still renders correctly,
it just leaks scoped `<style>` blocks that never dedup. `nav-menu/render.php` and
`site-header/render.php` both carry a `STOP-NO-KSORT` comment recording this — this gate
is what makes the comment true rather than aspirational
(`.claude/reports/2026-08-21-unenforced-prohibition-register.md`).

SCOPE — universal, not per-block (R-31-9)
------------------------------------------
Any render.php (or the shared wrapper) that hashes `$attributes` via
`md5( wp_json_encode( $attributes ...` is in scope, not just the two files that carry
the comment today. A hardcoded file list would itself violate R-31-1 and would miss the
next block that adopts the same uid pattern.

WHAT IT CHECKS
--------------
For each PHP file under `src/blocks/*/render.php` and `includes/class-sgs-container-
wrapper.php`, find every hash line of the shape `md5( wp_json_encode( $VAR ...`. Then
scan every line in the SAME FILE, BEFORE that hash line, for a destructive sort call
(`ksort`, `krsort`, `asort`, `arsort`, `uasort`, `uksort`, `natsort`, `natcasesort`)
applied to that same `$VAR`. A match is a violation — content-addressing is a build
promise these functions can silently break with no other symptom.

GATE SHAPE
----------
- Default (no flag): observational report, exit 0.
- --check:     exit 1 on any violation.
- --self-test: proves the gate can fail — injects `ksort( $attributes );` before a real
  hash line in a temp copy of `nav-menu/render.php`, asserts RED, restores, asserts GREEN.

Run: python plugins/sgs-blocks/scripts/check-ksort-before-hash.py --check
"""
from __future__ import annotations

import argparse
import re
import shutil
import sys
import tempfile
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

PLUGIN_ROOT = Path(__file__).resolve().parent.parent
BLOCKS_DIR = PLUGIN_ROOT / "src" / "blocks"
WRAPPER_FILE = PLUGIN_ROOT / "includes" / "class-sgs-container-wrapper.php"

HASH_LINE_RE = re.compile(r"md5\(\s*wp_json_encode\(\s*\$(\w+)")
SORT_FUNCS = (
    "ksort",
    "krsort",
    "asort",
    "arsort",
    "uasort",
    "uksort",
    "natsort",
    "natcasesort",
)


def _sort_re(var_name: str) -> re.Pattern:
    funcs = "|".join(SORT_FUNCS)
    # Matches e.g. `ksort( $attributes )`, `ksort($attributes,` (by-ref 2nd arg forms).
    return re.compile(rf"\b(?:{funcs})\s*\(\s*\${re.escape(var_name)}\b")


def _target_files() -> list[Path]:
    files = sorted(BLOCKS_DIR.glob("*/render.php"))
    if WRAPPER_FILE.exists():
        files.append(WRAPPER_FILE)
    return files


def _scan_file(path: Path, text: str | None = None) -> list[str]:
    """Return violation strings for one file. `text` overrides disk contents (self-test)."""
    lines = (text if text is not None else path.read_text(encoding="utf-8")).splitlines()
    violations = []
    hash_line_numbers: list[tuple[int, str]] = []
    for i, line in enumerate(lines):
        m = HASH_LINE_RE.search(line)
        if m:
            hash_line_numbers.append((i, m.group(1)))
    if not hash_line_numbers:
        return violations
    for hash_idx, var_name in hash_line_numbers:
        sort_re = _sort_re(var_name)
        for j in range(hash_idx):
            if sort_re.search(lines[j]):
                violations.append(
                    f"{path}:{j + 1} — a sort function is applied to ${var_name} "
                    f"before it is hashed at line {hash_idx + 1} (STOP-NO-KSORT)"
                )
    return violations


def run_scan() -> list[str]:
    violations: list[str] = []
    for path in _target_files():
        violations.extend(_scan_file(path))
    return violations


def self_test() -> bool:
    fixture = BLOCKS_DIR / "nav-menu" / "render.php"
    if not fixture.exists():
        print("[ksort-before-hash --self-test] FAIL — fixture file missing: " + str(fixture))
        return False

    original = fixture.read_text(encoding="utf-8")
    clean_violations = _scan_file(fixture, original)
    if clean_violations:
        print(
            "[ksort-before-hash --self-test] FAIL — the unmodified nav-menu render.php "
            "already reports a violation; the negative control has no clean baseline:\n  "
            + "\n  ".join(clean_violations)
        )
        return False
    print("[ksort-before-hash --self-test] negative control: clean nav-menu is silent — OK")

    hash_line = "$uid        = 'sgs-nav-menu-' . substr( md5( wp_json_encode( $attributes ) . $anchor_val ), 0, 8 );"
    if hash_line not in original:
        print(
            "[ksort-before-hash --self-test] FAIL — the expected hash line anchor was "
            "not found in nav-menu/render.php (file shape changed; update the fixture)."
        )
        return False

    corrupted = original.replace(
        hash_line,
        "ksort( $attributes );\n" + hash_line,
        1,
    )
    corrupted_violations = _scan_file(fixture, corrupted)
    if not corrupted_violations:
        print(
            "[ksort-before-hash --self-test] FAIL — injecting `ksort( $attributes );` "
            "immediately before the real hash line was NOT reported. The gate cannot fail."
        )
        return False
    print(
        "[ksort-before-hash --self-test] positive control: injected ksort() reported — "
        + corrupted_violations[0]
    )

    # Prove it purely via the disk-write path too (not just the in-memory scanner),
    # using a temp copy so the real tree is never touched.
    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp) / "render.php"
        tmp_path.write_text(corrupted, encoding="utf-8")
        disk_violations = _scan_file(tmp_path)
        if not disk_violations:
            print(
                "[ksort-before-hash --self-test] FAIL — the on-disk temp-file scan did "
                "not reproduce the in-memory finding."
            )
            return False
        tmp_path.write_text(original, encoding="utf-8")
        restored_violations = _scan_file(tmp_path)
        if restored_violations:
            print(
                "[ksort-before-hash --self-test] FAIL — restoring the original content "
                "still reports a violation:\n  " + "\n  ".join(restored_violations)
            )
            return False
    print("[ksort-before-hash --self-test] post-restore: clean again — OK")
    print("[ksort-before-hash --self-test] PASS — the gate goes red for the injected defect.")
    return True


def main() -> int:
    parser = argparse.ArgumentParser(description="STOP-NO-KSORT gate.")
    parser.add_argument("--check", action="store_true", help="exit 1 on any violation")
    parser.add_argument("--self-test", action="store_true", help="prove the gate can fail")
    args = parser.parse_args()

    if args.self_test:
        return 0 if self_test() else 1

    violations = run_scan()
    if violations:
        print(f"[ksort-before-hash] {len(violations)} violation(s):")
        for v in violations:
            print("  " + v)
    else:
        print("[ksort-before-hash] 0 violations across " + str(len(_target_files())) + " files.")

    if args.check:
        return 1 if violations else 0
    return 0


if __name__ == "__main__":
    sys.exit(main())
