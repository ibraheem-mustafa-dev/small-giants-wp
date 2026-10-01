"""Gives every Eye Care brand its logo: uploads assets/brand-logos/* (the draft's own logos, lifted
from its LOGOS map; the two vector ones kept as SVG) and sets each WooCommerce brand's image,
so every block that shows a brand (brand strip, brand tiles, product cards) can draw the logo.
Idempotent: an attachment already uploaded under the same slug (brand-logo-<slug>) is reused, and
a brand that already carries that image is left alone.

Over the site's REST API with an application password, from an env file holding
WP_URL_<KEY>, WP_USER_<KEY> and WP_APP_PWD_<KEY> (.claude/secrets/<site>.env).

Usage: python apply_brand_logos.py --env-file ../../../.claude/secrets/eye-care-test.env --env-key EYECARETEST"""
import argparse
import base64
import html
import json
import mimetypes
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
LOGOS = os.path.join(HERE, '..', 'assets', 'brand-logos')


def read_env(path, key):
    values = {}
    with open(path, encoding='utf-8') as handle:
        for line in handle:
            match = re.match(r'\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$', line)
            if match:
                values[match.group(1)] = match.group(2).strip('"\'')
    try:
        return values[f'WP_URL_{key}'].rstrip('/'), values[f'WP_USER_{key}'], values[f'WP_APP_PWD_{key}']
    except KeyError as missing:
        sys.exit(f'{path} has no {missing.args[0]}')


class Api:
    def __init__(self, url, user, password):
        self.url = url
        self.auth = 'Basic ' + base64.b64encode(f'{user}:{password}'.encode()).decode()

    def call(self, method, route, body=None, raw=None, headers=None):
        request = urllib.request.Request(self.url + '/wp-json' + route, method=method)
        request.add_header('Authorization', self.auth)
        data = raw
        if body is not None:
            data = json.dumps(body).encode()
            request.add_header('Content-Type', 'application/json')
        for name, value in (headers or {}).items():
            request.add_header(name, value)
        try:
            with urllib.request.urlopen(request, data=data, timeout=60) as response:
                return json.loads(response.read().decode() or 'null')
        except urllib.error.HTTPError as error:
            sys.exit(f'{method} {route} failed ({error.code}): {error.read().decode()[:300]}')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--env-file', required=True)
    parser.add_argument('--env-key', required=True)
    args = parser.parse_args()
    api = Api(*read_env(args.env_file, args.env_key))

    with open(os.path.join(LOGOS, 'brands.json'), encoding='utf-8') as handle:
        logo_for = json.load(handle)
    brands = api.call('GET', '/wc/v3/products/brands?per_page=100')
    by_name = {html.unescape(brand['name']): brand for brand in brands}

    done = 0
    for name, filename in logo_for.items():
        brand = by_name.get(name)
        if not brand:
            print(f'skip {name}: no such brand on this site')
            continue
        slug = 'brand-logo-' + os.path.splitext(filename)[0]
        found = api.call('GET', '/wp/v2/media?' + urllib.parse.urlencode({'slug': slug, '_fields': 'id'}))
        if found:
            attachment = found[0]['id']
        else:
            with open(os.path.join(LOGOS, filename), 'rb') as handle:
                payload = handle.read()
            mime = mimetypes.guess_type(filename)[0] or 'application/octet-stream'
            ext = os.path.splitext(filename)[1]
            uploaded = api.call('POST', '/wp/v2/media', raw=payload, headers={
                'Content-Type': mime,
                'Content-Disposition': f'attachment; filename="{slug}{ext}"',
            })
            attachment = uploaded['id']
            api.call('POST', f'/wp/v2/media/{attachment}', body={'slug': slug, 'title': f'{name} logo', 'alt_text': name})
        if (brand.get('image') or {}).get('id') != attachment:
            api.call('PUT', f"/wc/v3/products/brands/{brand['id']}", body={'image': {'id': attachment}})
        done += 1
        print(f'{name}: attachment {attachment}')
    print(f'{done} brand logos set')


if __name__ == '__main__':
    main()
