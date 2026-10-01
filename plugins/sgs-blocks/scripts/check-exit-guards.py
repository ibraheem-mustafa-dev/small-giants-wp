"""Fail when a PHP file's direct-access guard names a constant WordPress never defines.

A guard such as `defined( 'ABSPATH' ) || exit;` stops a file being run directly. Misspell the
constant and the guard exits on EVERY load, silently: no error, no log, an empty 200 page. That
happened on 2026-09-26: theme/sgs-theme/inc/shop-toolbar-settings.php shipped
`defined( 'A\\PATH' ) || exit;` (a text replacement ate "BS") and the optician client's test site served blank pages
until the theme was rolled back.

Scans the theme and the sgs-blocks plugin (not vendor/, node_modules/ or build/).

Usage: python scripts/check-exit-guards.py [--self-test]
Exit 0 clean, 1 violations (or a failed self-test).
"""
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
ROOTS = [REPO / 'theme' / 'sgs-theme', REPO / 'plugins' / 'sgs-blocks']
SKIP = {'vendor', 'node_modules', 'build', '.phpunit.cache'}
KNOWN = {'ABSPATH', 'WPINC', 'WP_UNINSTALL_PLUGIN', 'WP_CLI', 'WP_INSTALLING'}
# defined( 'X' ) || exit / die, and if ( ! defined( 'X' ) ) { exit / die / return
GUARD = re.compile(
    r"""(?:\bdefined\s*\(\s*['"]([^'"]+)['"]\s*\)\s*(?:\|\||or)\s*(?:exit|die)"""
    r"""|!\s*defined\s*\(\s*['"]([^'"]+)['"]\s*\)\s*\)\s*\{?\s*(?:exit|die))""",
    re.IGNORECASE,
)


def scan_text(text: str) -> list[tuple[int, str]]:
    hits = []
    for n, line in enumerate(text.splitlines(), 1):
        for m in GUARD.finditer(line):
            name = m.group(1) or m.group(2)
            if name not in KNOWN:
                hits.append((n, name))
    return hits


def targets() -> list[Path]:
    files = []
    for root in ROOTS:
        for f in root.rglob('*.php'):
            if not SKIP.intersection(f.relative_to(root).parts):
                files.append(f)
    return sorted(files)


def self_test() -> int:
    bad = "defined( 'A" + chr(92) + "PATH' ) || exit;"
    good = "defined( 'ABSPATH' ) || exit;"
    bad_if = "if ( ! defined( 'ABSPAHT' ) ) { exit; }"
    good_if = "if ( ! defined( 'WPINC' ) ) { die; }"
    ok = (len(scan_text(bad)) == 1 and scan_text(good) == []
          and len(scan_text(bad_if)) == 1 and scan_text(good_if) == [])
    print('[check-exit-guards] self-test', 'PASS' if ok else 'FAIL')
    return 0 if ok else 1


def main() -> int:
    if '--self-test' in sys.argv:
        return self_test()
    hits = []
    files = targets()
    for f in files:
        for n, name in scan_text(f.read_text(encoding='utf-8', errors='replace')):
            hits.append(f'{f.relative_to(REPO).as_posix()}:{n} guards on {name!r}')
    if hits:
        print('[check-exit-guards] FAILED: a direct-access guard names a constant WordPress never defines,')
        print('  so the file exits silently on every load:')
        for h in hits:
            print('   ', h)
        return 1
    print(f'[check-exit-guards] OK: {len(files)} PHP files, every direct-access guard names a real constant.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
