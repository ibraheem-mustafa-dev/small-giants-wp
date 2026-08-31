#!/usr/bin/env python
"""Create the canary page carrying the REAL-PATH SMIL bypass payload for
owed-debt item 2 (.claude/prompts/2026-09-01-media-owed-debts.md).

D905's shared SVG sanitiser (includes/helpers-svg-kses.php) allows <animate>
but strips href/xlink:href/target from <a> entirely — reasoned to close the
`<a><animate attributeName="href" to="javascript:...">` bypass (SMIL rewriting
href after sanitisation), but never fired against a real browser. This script
puts the exact payload through the REAL sanitisation path: `sgs/media`'s
svgContent attribute, sanitised server-side by wp_kses($raw,
sgs_allowed_svg_tags()) — the same shared helper item 1 diffed button against.

The probe script (probe-smil-bypass.mjs) reads this page AND independently
builds its own positive-control payload client-side (bypassing WordPress
entirely) to prove the harness can observe a `javascript:` URI actually
executing before trusting any "blocked" verdict from this page.

Usage:
    python plugins/sgs-blocks/scripts/probes/build-smil-bypass-fixture.py --dry-run
    python plugins/sgs-blocks/scripts/probes/build-smil-bypass-fixture.py --apply
"""

from __future__ import annotations

import argparse
import base64
import json
import sys
import urllib.error
import urllib.request
from pathlib import Path

for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding='utf-8')
    except (AttributeError, ValueError):
        pass

REPO = Path(__file__).resolve().parents[4]
SECRETS = REPO / '.claude' / 'secrets' / 'sandybrown.env'
PAGE_TITLE = '[GATE - DO NOT DELETE] SMIL bypass probe'
STATE_FILE = Path(__file__).with_name('smil-bypass-fixture-page-id.txt')

# The exact D905-reasoned payload. `id="smil-anchor"` survives sanitisation
# (id is in core_attrs) so the probe can select the element deterministically
# without depending on DOM structure.
PAYLOAD_SVG = (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'
    '<a id="smil-anchor">'
    '<animate attributeName="href" begin="0s" dur="0.1s" fill="freeze" '
    'to="javascript:window.SGS_PWNED=true"/>'
    '<circle cx="50" cy="50" r="40" fill="red"/>'
    '</a>'
    '</svg>'
)


def load_env() -> dict:
    if not SECRETS.exists():
        sys.exit(f'FAIL: credentials not found at {SECRETS}')
    env: dict[str, str] = {}
    for line in SECRETS.read_text(encoding='utf-8').splitlines():
        if line.startswith('#') or '=' not in line:
            continue
        k, v = line.split('=', 1)
        env[k.strip()] = v.strip().strip('\'"')
    missing = [k for k in ('WP_USER_SANDYBROWN', 'WP_APP_PWD_SANDYBROWN', 'WP_URL_SANDYBROWN')
               if not env.get(k)]
    if missing:
        sys.exit(f'FAIL: {SECRETS} is missing {missing}')
    return env


def rest(env: dict, path: str, data: dict | None = None, method: str = 'GET'):
    auth = base64.b64encode(
        f"{env['WP_USER_SANDYBROWN']}:{env['WP_APP_PWD_SANDYBROWN']}".encode()).decode()
    body = json.dumps(data).encode() if data is not None else None
    req = urllib.request.Request(
        f"{env['WP_URL_SANDYBROWN'].rstrip('/')}/wp-json/wp/v2/{path}",
        data=body, method=method,
        headers={'Content-Type': 'application/json', 'Authorization': 'Basic ' + auth})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.load(r)
    except urllib.error.HTTPError as exc:
        sys.exit(f'FAIL: REST {method} {path} -> HTTP {exc.code}: {exc.read()[:400]!r}')


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--apply', action='store_true')
    args = ap.parse_args()
    if not args.dry_run and not args.apply:
        sys.exit('usage: --dry-run or --apply')

    env = load_env()
    payload = json.dumps({
        'mediaType': 'svg',
        'svgContent': PAYLOAD_SVG,
        'caption': 'SMIL bypass real-path payload',
    }, separators=(',', ':'), ensure_ascii=False)
    content = f'<!-- wp:sgs/media {payload} /-->\n'

    existing_id = int(STATE_FILE.read_text().strip()) if STATE_FILE.exists() else None

    print('Fixture page content:')
    print(content)

    if args.dry_run:
        print('--dry-run: not written.')
        return

    if existing_id:
        page = rest(env, f'pages/{existing_id}', data={'content': content}, method='POST')
    else:
        page = rest(env, 'pages', data={
            'title': PAGE_TITLE, 'status': 'publish', 'content': content,
        }, method='POST')
        STATE_FILE.write_text(str(page['id']))

    # Confirm what actually survived sanitisation, straight from the DB —
    # never trust the write echoed back without checking storage.
    stored = rest(env, f'pages/{page["id"]}?context=edit')
    print('\nStored post_content (post-sanitisation, as WP saved it):')
    print(stored['content']['raw'])

    url = f"https://sandybrown-nightingale-600381.hostingersite.com/?page_id={page['id']}"
    print(f'\nWritten. Live at {url}')


if __name__ == '__main__':
    main()
