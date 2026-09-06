#!/usr/bin/env python
"""Create (or verify) the canary page for owed-debt item 3
(.claude/prompts/2026-09-01-media-owed-debts.md): the no-JS autoplay/muted
coupling on `sgs/media`, closed at the PHP level in
`reports/visual-diff/media-2026-08-30.md` but never checked in a real browser
with JavaScript disabled.

Two instances, same page, same real canary video (resolved live via REST):
  A — videoAutoplay=true, videoMuted=false   (the case that was broken:
      server markup must still carry `autoplay muted playsinline` because the
      video-behaviour atom couples them, or a no-JS visitor gets unmuted
      autoplay a browser refuses to play).
  B — videoAutoplay=false, videoMuted=false  (negative control: must render
      an UNMUTED video with no `autoplay` attribute — if B is also muted, the
      coupling has over-applied).

Idempotent via a distinctive `caption` per instance, same pattern as
`extend-page-3145-video-svg.py`.

Usage:
    python plugins/sgs-blocks/scripts/probes/build-noJS-autoplay-fixture.py --dry-run
    python plugins/sgs-blocks/scripts/probes/build-noJS-autoplay-fixture.py --apply
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
PAGE_TITLE = '[GATE - DO NOT DELETE] no-JS autoplay probe'
STATE_FILE = Path(__file__).with_name('noJS-autoplay-fixture-page-id.txt')

CASE_A_MARKER = 'case A autoplay-on muted-off'
CASE_B_MARKER = 'case B negative control'


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


def video_block(video: dict, autoplay: bool, muted: bool, marker: str) -> str:
    payload = json.dumps({
        'mediaType': 'video',
        'videoSource': 'internal',
        'videoId': video['id'],
        'videoUrl': video['url'],
        'videoAutoplay': autoplay,
        'videoMuted': muted,
        'videoControls': True,
        'caption': marker,
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
    video = resolve_canary_video(env)
    content = (
        video_block(video, autoplay=True, muted=False, marker=CASE_A_MARKER) + '\n\n' +
        video_block(video, autoplay=False, muted=False, marker=CASE_B_MARKER) + '\n'
    )

    existing_id = int(STATE_FILE.read_text().strip()) if STATE_FILE.exists() else None
    if existing_id:
        page = rest(env, f'pages/{existing_id}?context=edit')
        if page and not isinstance(page, dict) or (page and page.get('code')):
            existing_id = None

    print(f'Fixture page ({"update" if existing_id else "create"}):')
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

    url = f"https://sandybrown-nightingale-600381.hostingersite.com/?page_id={page['id']}"
    print(f'\nWritten. Live at {url}')


if __name__ == '__main__':
    main()
