#!/usr/bin/env python
"""Extend canary page 3145 (`[GATE - DO NOT DELETE] media atom object-fit
probe`) with a video instance and an SVG instance, closing owed-debt item 4
(`.claude/prompts/2026-09-01-media-owed-debts.md`): video/SVG object-fit was
reasoned from the census and the deleted style.css selector but never
measured on a rendered <video> or confirmed absent on an SVG.

Appends to the EXISTING three image instances rather than replacing them —
those are the object-fit-on-images proof from `media-2026-08-31.md` and stay
live as a reference. Video uses the real canary media-library video (id 2181,
resolved live via REST, never hardcoded) with mediaType='video' and no
explicit objectFit, so the rendered <video> shows the block's post-D905-gut
DEFAULT resolution (expected `cover`, per the deleted `:where(.sgs-media__img)`
selector only ever having covered `__img`, never video). SVG uses
mediaType='svg' with a trivial inline shape and likewise no objectFit, to
confirm the atom never applies to the SVG wrapper at all (render.php's own
comment: object-fit is a replaced-element property and does nothing on a
<div>/<svg> wrapper, so the marker class 'sgs-media-el' is deliberately never
emitted on it).

Idempotent: re-running detects the two new instances are already present
(matched by their distinctive `caption`) and exits without duplicating them.

Usage:
    python plugins/sgs-blocks/scripts/probes/extend-page-3145-video-svg.py --dry-run
    python plugins/sgs-blocks/scripts/probes/extend-page-3145-video-svg.py --apply
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
PAGE_ID = 3145

VIDEO_MARKER = 'video default object-fit'
SVG_MARKER = 'svg never gets object-fit'

SVG_SHAPE = (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'
    '<circle cx="50" cy="50" r="40" fill="#2563eb"/></svg>'
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


def resolve_canary_video(env: dict) -> dict:
    items = rest(env, 'media?media_type=video&per_page=1&orderby=id&order=asc')
    if not items:
        sys.exit('FAIL: the canary media library holds no video — upload one and re-run.')
    m = items[0]
    return {'id': m['id'], 'url': m['source_url']}


def video_block(video: dict) -> str:
    payload = json.dumps({
        'mediaType': 'video',
        'videoSource': 'internal',
        'videoId': video['id'],
        'videoUrl': video['url'],
        'videoAutoplay': False,
        'videoMuted': True,
        'videoControls': True,
        'caption': VIDEO_MARKER,
        'mediaSizing': 'height',
        'height': {'desktop': '200'},
        'heightUnit': 'px',
    }, separators=(',', ':'), ensure_ascii=False)
    return f'<!-- wp:sgs/media {payload} /-->'


def svg_block() -> str:
    payload = json.dumps({
        'mediaType': 'svg',
        'svgContent': SVG_SHAPE,
        'caption': SVG_MARKER,
        'mediaSizing': 'height',
        'height': {'desktop': '200'},
        'heightUnit': 'px',
    }, separators=(',', ':'), ensure_ascii=False)
    return f'<!-- wp:sgs/media {payload} /-->'


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--apply', action='store_true')
    args = ap.parse_args()
    if not args.dry_run and not args.apply:
        sys.exit('usage: --dry-run or --apply')

    env = load_env()
    page = rest(env, f'pages/{PAGE_ID}?context=edit')
    content = page['content']['raw']

    if VIDEO_MARKER in content and SVG_MARKER in content:
        print(f'Page {PAGE_ID} already carries both fixtures — nothing to do.')
        return

    video = resolve_canary_video(env)
    additions = []
    if VIDEO_MARKER not in content:
        additions.append(video_block(video))
    if SVG_MARKER not in content:
        additions.append(svg_block())

    new_content = content.rstrip() + '\n\n' + '\n'.join(additions) + '\n'

    print(f'Adding {len(additions)} block(s) to page {PAGE_ID}:')
    for a in additions:
        print(' ', a[:140], '...')

    if args.dry_run:
        print('\n--dry-run: not written.')
        return

    rest(env, f'pages/{PAGE_ID}', data={'content': new_content}, method='POST')
    print(f'\nWritten. Live at https://sandybrown-nightingale-600381.hostingersite.com/?page_id={PAGE_ID}')


if __name__ == '__main__':
    main()
