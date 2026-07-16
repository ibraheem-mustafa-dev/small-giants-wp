#!/usr/bin/env python3
"""Publish a BEFORE/AFTER canary page pair for a migrated pattern file.

BEFORE = the pattern's block markup at a given git ref (default HEAD, i.e.
pre-swap); AFTER = the working-tree version. Both are posted as WP pages so
the two renders can be compared on the real front end — the only fidelity
signal that counts (R-31-11).

Usage (from the worktree root):
  python plugins/sgs-blocks/scripts/migrate-core-blocks/publish-pattern-pair.py \
      patterns/about-stats.php [--ref HEAD]
"""

import argparse
import base64
import json
import os
import pathlib
import re
import subprocess
import sys
import urllib.request

REPO = pathlib.Path(__file__).resolve().parents[4]
SECRETS = REPO / '.claude' / 'secrets' / 'sandybrown.env'


def load_env():
    env = {}
    for line in SECRETS.read_text(encoding='utf-8').splitlines():
        if line.startswith('#') or '=' not in line:
            continue
        k, v = line.split('=', 1)
        env[k.strip()] = v.strip()
    return env


def strip_php_header(text):
    """Drop the pattern's PHP docblock header, keeping only block markup."""
    return re.sub(r'^<\?php.*?\?>\s*', '', text, flags=re.S)


def publish(env, slug, title, content):
    auth = base64.b64encode(
        f"{env['WP_USER_SANDYBROWN']}:{env['WP_APP_PWD_SANDYBROWN']}".encode()
    ).decode()
    data = json.dumps({'title': title, 'slug': slug, 'status': 'publish', 'content': content}).encode()
    req = urllib.request.Request(
        f"{env['WP_URL_SANDYBROWN']}/wp-json/wp/v2/pages", data=data, method='POST',
        headers={'Content-Type': 'application/json', 'Authorization': 'Basic ' + auth})
    with urllib.request.urlopen(req) as r:
        out = json.load(r)
    return out['id'], out['link']


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('pattern', help='e.g. patterns/about-stats.php')
    ap.add_argument('--ref', default='HEAD', help='git ref for the BEFORE side')
    args = ap.parse_args()

    rel = f'theme/sgs-theme/{args.pattern}'
    path = REPO / rel
    if not path.exists():
        raise SystemExit(f'no such pattern: {rel}')

    before_src = subprocess.run(
        ['git', 'show', f'{args.ref}:{rel}'], cwd=REPO, capture_output=True, text=True, check=True
    ).stdout
    after_src = path.read_text(encoding='utf-8')

    env = load_env()
    stem = args.pattern.split('/')[-1].rsplit('.', 1)[0]
    for label, src in (('before', before_src), ('after', after_src)):
        slug = f'tc-{stem}-{label}'
        pid, link = publish(env, slug, slug, strip_php_header(src))
        print(f'{label:6} id={pid}  {link}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
