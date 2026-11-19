#!/usr/bin/env python3
"""Parse every sgsCustomCss attribute out of posts-raw.json (written by export-posts.php) and write custom-css.json:
one record per attribute, with the CSS split into rules.

Usage: python parse-custom-css.py --site <wsl-site-folder> [--out <dir>]
Reads <out>/posts-raw.json and writes <out>/custom-css.json. It never touches a site.
"""
import argparse
import json
import os
import re
import sys

from census_common import add_site_args, resolve

BS = chr(92)

COMMENT_RE = re.compile(r'<!--\s+(/)?wp:([a-z][a-z0-9_-]*(?:/[a-z][a-z0-9_-]*)?)\s+(\{.*?\}\s+)?(/)?-->', re.S)


def parse_blocks(content):
    """Yield one dict per block: name, attrs, depth, parent chain (names), index. Uses the comment delimiters only."""
    stack, out = [], []
    for m in COMMENT_RE.finditer(content):
        closer, name, jsn, selfclose = m.group(1), m.group(2), m.group(3), m.group(4)
        if closer:
            if stack:
                stack.pop()
            continue
        try:
            attrs = json.loads(jsn) if jsn else {}
        except Exception as e:  # keep going; report it
            attrs = {'__parse_error__': str(e)}
        node = {'name': name, 'attrs': attrs, 'depth': len(stack), 'parents': [s['name'] for s in stack],
                'parent_classes': [s['attrs'].get('className', '') for s in stack], 'index': len(out)}
        out.append(node)
        if not selfclose:
            stack.append(node)
    return out


def strip_comments(css):
    return re.sub(r'/\*.*?\*/', '', css, flags=re.S)


def split_css(css, media=''):
    """Split into rules: list of {selector, declarations, media, text}. Nested at-rules (@media, @supports,
    @container, @layer) are flattened with their prelude in `media`; @keyframes/@font-face are kept as one rule."""
    rules = []
    i, n = 0, len(css)
    while i < n:
        # skip whitespace
        while i < n and css[i].isspace():
            i += 1
        if i >= n:
            break
        if css.startswith('/*', i):
            j = css.find('*/', i + 2)
            i = n if j < 0 else j + 2
            continue
        # read prelude up to { or ;
        j = i
        depth_paren = 0
        while j < n and not (css[j] in '{;' and depth_paren == 0):
            if css[j] == '(':
                depth_paren += 1
            elif css[j] == ')':
                depth_paren -= 1
            elif css[j] in '"\'':
                q = css[j]
                j += 1
                while j < n and css[j] != q:
                    j += 2 if css[j] == BS else 1
            j += 1
        prelude = css[i:j].strip()
        if j >= n or css[j] == ';':  # bare declarations or an at-statement
            if prelude:
                rules.append({'selector': '(bare declarations)' if not prelude.startswith('@') else prelude,
                              'declarations': prelude if not prelude.startswith('@') else '', 'media': media, 'text': prelude})
            i = j + 1
            continue
        # find matching brace
        d, k = 0, j
        while k < n:
            c = css[k]
            if c == '{':
                d += 1
            elif c == '}':
                d -= 1
                if d == 0:
                    break
            elif c in '"\'':
                q = c
                k += 1
                while k < n and css[k] != q:
                    k += 2 if css[k] == BS else 1
            k += 1
        body = css[j + 1:k]
        text = css[i:k + 1]
        if prelude.startswith('@') and re.match(r'@(media|supports|container|layer|scope)\b', prelude):
            inner = split_css(body, (media + ' ' + prelude).strip() if media else prelude)
            rules.extend(inner)
        else:
            rules.append({'selector': prelude, 'declarations': body.strip(), 'media': media, 'text': text.strip()})
        i = k + 1
    return rules


def find_css(attrs):
    return attrs.get('sgsCustomCss')


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    add_site_args(ap)
    a = ap.parse_args()
    out_dir = resolve(a)
    src, dest = os.path.join(out_dir, 'posts-raw.json'), os.path.join(out_dir, 'custom-css.json')
    posts = json.load(open(src, encoding='utf-8'))
    records, errors = [], []
    posts_scanned = 0
    for p in posts:
        posts_scanned += 1
        content = p['post_content']
        if p['post_type'] == 'wp_global_styles':
            continue
        blocks = parse_blocks(content)
        for b in blocks:
            if '__parse_error__' in b['attrs']:
                errors.append({'post': p['ID'], 'block': b['name'], 'error': b['attrs']['__parse_error__']})
            css = b['attrs'].get('sgsCustomCss')
            if css is None:
                continue
            if not isinstance(css, str):
                errors.append({'post': p['ID'], 'block': b['name'], 'error': 'sgsCustomCss is not a string'})
                continue
            clean = strip_comments(css)
            rules = split_css(clean)
            comments = re.findall(r'/\*.*?\*/', css, flags=re.S)
            slug = p['post_name']
            records.append({
                'post_id': p['ID'], 'post_type': p['post_type'], 'post_status': p['post_status'],
                'post_title': p['post_title'], 'slug': slug, 'theme': p.get('theme', ''),
                'block': b['name'], 'block_index': b['index'], 'parents': b['parents'][-4:],
                'className': b['attrs'].get('className', ''), 'anchor': b['attrs'].get('anchor', ''),
                'sgsCustomCssId': b['attrs'].get('sgsCustomCssId', ''), 'sgsCustomCssNote': b['attrs'].get('sgsCustomCssNote', ''),
                'chars': len(css), 'comment_chars': sum(len(c) for c in comments), 'comments': comments,
                'rule_count': len(rules), 'rules': [dict(r, chars=len(r['text'])) for r in rules],
                'css': css,
            })
    json.dump({'posts_scanned': posts_scanned, 'attribute_count': len(records), 'parse_errors': errors, 'records': records},
              open(dest, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'{posts_scanned} posts scanned, {len(records)} sgsCustomCss attributes, '
          f'{sum(r["chars"] for r in records)} chars ({sum(len(r["css"].encode("utf-8")) for r in records)} bytes), {sum(r["rule_count"] for r in records)} rules, {len(errors)} parse errors')


if __name__ == '__main__':
    main()
