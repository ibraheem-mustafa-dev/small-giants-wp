"""Fail when plugin-level PHP loads a file from src/.

Only build/ ships a block's files to the server (build-deploy.py), so a
require/include of a `src/...` path from includes/ or the plugin's root PHP
works locally and fatals every page on the live site. That happened on
2026-09-25: includes/class-sgs-blocks.php required
src/blocks/choice-flow-question/editor-data.php and eye-care-test went HTTP 500.

Block render.php files are not scanned: they are copied into build/blocks/<slug>/
and their `__DIR__`-relative requires resolve there.

Usage: python scripts/check-no-src-requires.py [--self-test]
Exit 0 clean, 1 violations (or a failed self-test).
"""
import re
import sys
from pathlib import Path

PLUGIN = Path(__file__).resolve().parents[1]
LOAD = re.compile(r"\b(?:require|include)(?:_once)?\b[^;]*['\"][^'\"]*\bsrc/", re.IGNORECASE)


def scan_text(text: str) -> list[int]:
    return [n for n, line in enumerate(text.splitlines(), 1)
            if LOAD.search(line) and not line.lstrip().startswith(('//', '*', '#'))]


def targets() -> list[Path]:
    files = sorted(PLUGIN.glob('*.php'))
    files += sorted((PLUGIN / 'includes').rglob('*.php'))
    return files


def self_test() -> int:
    bad = "require_once SGS_BLOCKS_PATH . 'src/blocks/x/editor-data.php';"
    good = "require_once __DIR__ . '/editor-data.php';"
    comment = "// require_once SGS_BLOCKS_PATH . 'src/blocks/x.php';"
    ok = scan_text(bad) == [1] and scan_text(good) == [] and scan_text(comment) == []
    print('[check-no-src-requires] self-test', 'PASS' if ok else 'FAIL')
    return 0 if ok else 1


def main() -> int:
    if '--self-test' in sys.argv:
        return self_test()
    hits = []
    for f in targets():
        for n in scan_text(f.read_text(encoding='utf-8', errors='replace')):
            hits.append(f'{f.relative_to(PLUGIN).as_posix()}:{n}')
    if hits:
        print('[check-no-src-requires] FAILED: plugin-level PHP loads a src/ file, which is not deployed:')
        for h in hits:
            print('   ', h)
        print('  Move the file into includes/ (or load the build/ copy).')
        return 1
    print(f'[check-no-src-requires] OK: {len(targets())} plugin-level PHP files, no src/ loads.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
