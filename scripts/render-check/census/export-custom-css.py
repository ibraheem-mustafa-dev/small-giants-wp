#!/usr/bin/env python3
"""Custom CSS census: count every sgsCustomCss block attribute on a site (read-only), then recount independently.

  python export-custom-css.py --site <wsl-site-folder> [--out <dir>] [--no-verify]

Steps:
  1. export-posts.php (WP-CLI in WSL)  -> <out>/posts-raw.json (every post with content, any post type; revisions, autosaves,
     auto-drafts, trash, attachments and menu items skipped)
  2. parse-custom-css.py               -> <out>/custom-css.json (one record per sgsCustomCss attribute: post id, type, title or slug,
     block name, className or anchor, character count, the CSS split into rules with selector, declarations and enclosing @media)
  3. verify-count.php (unless --no-verify) -> <out>/verify-count.txt, an independent per-post recount by WordPress's own block parser;
     the totals are compared with step 2.

Prints the census line (posts scanned, attributes, characters, rules, parse errors), the recount TOTAL line and whether they agree.
Exit 0 when they agree (or with --no-verify), 1 when they differ, 2 when a step fails. No site data is written.
"""
import argparse
import os
import re
import subprocess
import sys

from census_common import HERE, add_site_args, resolve, run_php, to_wsl


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    add_site_args(ap)
    ap.add_argument('--no-verify', action='store_true', help='skip the independent recount')
    a = ap.parse_args()
    out = resolve(a)
    raw = os.path.join(out, 'posts-raw.json')
    code, so, se = run_php(a.site, os.path.join(HERE, 'export-posts.php'), [to_wsl(raw)])
    print(so.strip())
    if code or not os.path.exists(raw):
        print(se.strip(), file=sys.stderr)
        return 2
    parsed = subprocess.run([sys.executable, os.path.join(HERE, 'parse-custom-css.py'), '--site', a.site, '--out', out], capture_output=True, text=True, encoding='utf-8')
    print(parsed.stdout.strip())
    if parsed.returncode:
        print(parsed.stderr.strip(), file=sys.stderr)
        return 2
    if a.no_verify:
        return 0
    code, so, se = run_php(a.site, os.path.join(HERE, 'verify-count.php'))
    open(os.path.join(out, 'verify-count.txt'), 'w', encoding='utf-8').write(so)
    total = next((l for l in so.splitlines() if l.startswith('TOTAL')), None)
    if code or not total:
        print(se.strip(), file=sys.stderr)
        return 2
    print('recount: ' + total.replace('\t', '  '))
    m = re.search(r'(\d+) blocks\s+(\d+) chars', total)
    c = re.search(r'(\d+) sgsCustomCss attributes, (\d+) chars', parsed.stdout)
    agree = bool(m and c and m.group(1) == c.group(1) and m.group(2) == c.group(2))
    print('recount %s the census (%s attributes, %s characters)' % ('agrees with' if agree else 'DIFFERS from', c.group(1) if c else '?', c.group(2) if c else '?'))
    return 0 if agree else 1


if __name__ == '__main__':
    sys.exit(main())
