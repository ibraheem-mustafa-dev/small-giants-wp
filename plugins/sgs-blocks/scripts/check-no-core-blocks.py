#!/usr/bin/env python3
"""Prebuild gate: NO banned core blocks in theme pattern/part/template FILES.

Agents building a page/pattern easily forget Bean's "no core blocks that have an
SGS replacement" rule. A git/prebuild hook can only see FILES (a live page's
post_content lives in the WP DB, not git — lint that on-demand with
`migrate-core-blocks/lint-page.py`), so this gate covers the file surface:
theme/sgs-theme/{patterns,parts,templates}. It reuses the migrate-core-blocks
detector (DB-first `block-replacements.json`), so the fixer and the gate agree
on exactly what "banned" means.

Fix a finding: `python plugins/sgs-blocks/scripts/migrate-core-blocks/driver.py
--pairing <core/type> --file <rel> --write` (dry-run first without --write).

Exit 1 on any banned core block (fails the build). `--check` is accepted as a
no-op alias so it can sit in the same prebuild chain style as the JS gates.
"""

import pathlib
import sys

REPO = pathlib.Path(__file__).resolve().parents[3]
MIG = REPO / 'plugins' / 'sgs-blocks' / 'scripts' / 'migrate-core-blocks'
sys.path.insert(0, str(MIG))
from block_parser import parse_blocks, walk, BlockParseError  # noqa: E402
import driver  # noqa: E402 — load_replaces_map only (NOT HANDS_OFF/zone_of, see below)

THEME = REPO / 'theme' / 'sgs-theme'
SUBDIRS = ('parts', 'patterns', 'templates')

# This gate's OWN exclusion policy (2026-07-23) — deliberately NOT
# `driver.HANDS_OFF` / `driver.zone_of()`. That list is parallel-track
# coordination for the migrate-core-blocks WRITER ("Track C's automated sweep
# must not rewrite files Track A owns") — correct for a tool that edits files,
# meaningless for a tool that only reads them. Borrowing it here silently
# turned "another track owns this file" into "this file is exempt from the
# ban": the gate reported `clean` while never looking at 13 files, including
# both framework default patterns shipped to every install, and one of its
# entries (`*footer-*.php`) was a glob that could silently swallow any future
# footer pattern too.
#
# A GATE scans everything unless there is a reason specific to READING the
# file, not to writing it. Track ownership is not such a reason. Every one of
# the 13 previously-borrowed exclusions was re-examined; 11 had no
# gate-specific reason and are now scanned. Only these 2 remain, and only for
# a reason that has nothing to do with who owns the file:
NO_CONTENT_TO_SCAN = {
    # `parts/header.html` and `parts/footer.html` each contain exactly one
    # `<!-- wp:pattern {"slug":"sgs/framework-*-default"} /-->` reference and
    # no block markup of their own — there is nothing here for the walker to
    # find a banned block IN. The markup it resolves to at render time
    # (`patterns/framework-header-default.php` / `patterns/framework-footer-
    # default.php`) is a real file in this same scan and IS checked directly.
    # Retire this entry if either file ever stops being a bare pattern
    # reference (i.e. gains inline block markup of its own).
    'parts/header.html',
    'parts/footer.html',
}


def main():
    replaces = driver.load_replaces_map(driver.DEFAULT_DB)
    findings = []
    scanned = 0
    for sub in SUBDIRS:
        d = THEME / sub
        if not d.is_dir():
            continue
        for path in sorted(d.iterdir()):
            if path.suffix not in ('.php', '.html') or not path.is_file():
                continue
            rel = f'{sub}/{path.name}'
            if rel in NO_CONTENT_TO_SCAN:
                continue
            scanned += 1
            try:
                nodes = walk(parse_blocks(path.read_text(encoding='utf-8'), rel))
            except BlockParseError as e:
                findings.append(f'{rel}: parse error — {e}')
                continue
            for n in nodes:
                if n.name in replaces:
                    findings.append(f'{rel}: {n.name} -> should be {replaces[n.name]}')

    if findings:
        print('[check-no-core-blocks] BANNED core blocks in theme files:')
        for f in findings:
            print(f'  - {f}')
        print(f'\n  Fix each with: python plugins/sgs-blocks/scripts/migrate-core-blocks/'
              f'driver.py --pairing <core/type> --file <rel> --write (dry-run first).')
        return 1
    print(f'[check-no-core-blocks] clean — {scanned} theme file(s), 0 banned core blocks.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
