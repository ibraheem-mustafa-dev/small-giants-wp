#!/usr/bin/env python3
"""Audit stored post_content for SGS blocks that can no longer render their content.

WHY THIS EXISTS
---------------
Two silent content-loss classes, both proven live on the Indus homepage (page 13,
palestine-lives.org, 2026-07-14/15):

  1. STRANDED CONTENT (the D270/D271 hole): a block migrated from scalar content
     attrs to InnerBlocks renders ONLY its children ($content). A post still stored
     in the old self-closing shape renders an empty shell — every word intact in
     wp_posts.post_content, unreadable to the renderer. No error, no failing test.

  2. UNDECLARED ATTRS (the D338 class): WordPress silently DISCARDS any block
     attribute the block.json does not declare — worse, the first editor save
     round-trip deletes it from post_content permanently.

This scanner is READ-ONLY: it takes post_content text (exported via the guard-
sanctioned `wp post get <id> --field=post_content`) and reports findings against
the LOCAL block.json schemas — i.e. the code about to be deployed. Wire it into
the deploy path (build-deploy.py step_oldshape_audit) so a renderer that abandons
a stored shape can never ship silently again (the gate D182 used and D271 skipped).

DETECTION (all schema/source-derived — no hardcoded block lists, R-31-1)
------------------------------------------------------------------------
* undeclared-attr : attr key absent from block.json attributes and not a WP-native
                    / SGS-extension key.
* stranded-content: SELF-CLOSING instance of a block whose save.js emits
                    <InnerBlocks.Content /> (i.e. content is child-rendered) while
                    the instance carries populated content — a `role:"content"`
                    attr, or a declared array attr holding objects (legacy
                    repeater data, e.g. testimonial-slider `testimonials`).
* empty-innerblocks: self-closing InnerBlocks block with no stranded content.
                    Informational (renders empty; may be a deliberate placeholder).

USAGE
-----
  python audit-post-content-blocks.py <file-or-dir> [...] [--check] [--json]
                                      [--baseline <file.json>]

Files are raw post_content dumps (one post per file; the filename is used as the
post label). Directories are scanned for *.txt. `--check` exits 1 if any HIGH
finding exists (gate mode). `--json` emits machine-readable findings on stdout.

`--baseline` points at a JSON file of ACCEPTED findings (documented debt — the
dead-controls-baseline.json pattern): {"accepted": {"<post>|<block>|<type>|<attr>":
"<reason + register ref>"}}. Baselined findings are reported but do not fail
--check; every NEW finding still does. Never dump a fresh casualty into the
baseline instead of migrating it — entries need a register reference.
"""

import json
import pathlib
import re
import sys

REPO = pathlib.Path(__file__).resolve().parents[3]
BLOCKS_DIR = REPO / 'plugins' / 'sgs-blocks' / 'src' / 'blocks'

# Attrs WP accepts on ANY block via supports/global machinery.
NATIVE = {
    'align', 'className', 'style', 'backgroundColor', 'textColor', 'gradient',
    'fontSize', 'fontFamily', 'borderColor', 'lock', 'metadata', 'anchor', 'layout',
}
# SGS universal extensions injected server-side.
EXT_PREFIXES = ('sgsHideOn', 'sgsAnim')
EXT_EXACT = {'sgsCustomCss'}

OPEN_RE = re.compile(r'<!--\s*wp:(sgs/[\w-]+)(\s+\{)?')


JS_COMMENT_RE = re.compile(r'/\*.*?\*/|//[^\n]*', re.S)


def load_schemas():
    """{block name: {'attrs': {name: def}, 'innerblocks_save': bool, 'render': str}}

    innerblocks_save is checked on COMMENT-STRIPPED save.js — sgs/testimonial's
    save.js mentions InnerBlocks.Content only in its docblock (typed block, v8
    history note) and must not classify as InnerBlocks-rendered.
    """
    out = {}
    for bj in sorted(BLOCKS_DIR.glob('*/block.json')):
        try:
            d = json.loads(bj.read_text(encoding='utf-8'))
        except json.JSONDecodeError:
            continue
        if 'name' not in d:
            continue
        save = bj.parent / 'save.js'
        save_code = JS_COMMENT_RE.sub('', save.read_text(encoding='utf-8')) if save.exists() else ''
        render = bj.parent / 'render.php'
        out[d['name']] = {
            'attrs': d.get('attributes', {}),
            'innerblocks_save': 'InnerBlocks.Content' in save_code,
            'render': render.read_text(encoding='utf-8', errors='replace') if render.exists() else '',
        }
    return out


def render_reads(schema, key):
    """True when render.php reads $attributes['key'] — i.e. the attr still renders."""
    return re.search(r"\$attributes\[\s*'" + re.escape(key) + r"'\s*\]", schema['render']) is not None


def harvest_blocks(markup):
    """Yield (slug, attrs, self_closing, line) for every sgs/* block comment.

    Brace-depth-balanced (attrs contain nested objects, e.g. splitImage {id,url}),
    unlike the non-greedy regex in check-dead-pattern-attrs.py.
    """
    for m in OPEN_RE.finditer(markup):
        slug, attrs, end = m.group(1), {}, m.end()
        if m.group(2):
            bs = markup.index('{', m.start())
            depth = 0
            for i in range(bs, len(markup)):
                ch = markup[i]
                if ch == '{':
                    depth += 1
                elif ch == '}':
                    depth -= 1
                    if depth == 0:
                        try:
                            attrs = json.loads(markup[bs:i + 1])
                        except ValueError:
                            attrs = {}
                        end = i + 1
                        break
        self_closing = markup[end:end + 16].lstrip().startswith('/-->')
        line = markup[:m.start()].count('\n') + 1
        yield slug, attrs, self_closing, line


def is_legit(key, declared):
    if key in declared or key in NATIVE or key in EXT_EXACT:
        return True
    return key.startswith(EXT_PREFIXES)


def populated_content(attrs, schema):
    """Names of populated content-bearing attrs on this instance."""
    hits = []
    for key, val in attrs.items():
        spec = schema['attrs'].get(key)
        if spec is None:
            continue
        is_content = spec.get('role') == 'content' and val not in ('', None, [], {})
        is_repeater = (spec.get('type') == 'array' and isinstance(val, list) and val
                       and all(isinstance(v, dict) for v in val))
        # Only stranded if render.php no longer reads the attr (typed blocks like
        # sgs/testimonial read their content attrs directly — that shape is fine).
        if (is_content or is_repeater) and not render_reads(schema, key):
            hits.append(key)
    return hits


def scan_text(label, markup, schemas):
    findings = []
    for slug, attrs, self_closing, line in harvest_blocks(markup):
        schema = schemas.get(slug)
        if schema is None:
            findings.append({'post': label, 'line': line, 'block': slug,
                             'type': 'unknown-block', 'severity': 'HIGH',
                             'detail': 'no local block.json — renders a deleted-block placeholder'})
            continue
        for key in attrs:
            if not is_legit(key, schema['attrs']):
                findings.append({'post': label, 'line': line, 'block': slug,
                                 'type': 'undeclared-attr', 'severity': 'HIGH',
                                 'detail': f'"{key}" not declared in block.json — WP discards it; '
                                           'the next editor save DELETES it from post_content'})
        if self_closing and schema['innerblocks_save']:
            stranded = populated_content(attrs, schema)
            if stranded:
                findings.append({'post': label, 'line': line, 'block': slug,
                                 'type': 'stranded-content', 'severity': 'HIGH',
                                 'detail': 'old-shape (self-closing, no children) but render is '
                                           f'InnerBlocks-driven — stranded: {", ".join(stranded)}'})
            else:
                findings.append({'post': label, 'line': line, 'block': slug,
                                 'type': 'empty-innerblocks', 'severity': 'INFO',
                                 'detail': 'self-closing InnerBlocks block — renders an empty shell'})
    return findings


def collect_inputs(args):
    files = []
    for a in args:
        p = pathlib.Path(a)
        if p.is_dir():
            files.extend(sorted(q for q in p.rglob('*.txt') if not q.name.startswith('_')))
        elif p.is_file():
            files.append(p)
        else:
            print(f'[audit-post-content] no such path: {a}', file=sys.stderr)
            return None
    return files


def finding_key(x):
    """Stable identity for baselining: post|block|type|attr (line numbers drift)."""
    attr = ''
    if x['type'] == 'undeclared-attr':
        attr = x['detail'].split('"')[1]
    elif x['type'] == 'stranded-content':
        attr = x['detail'].split('stranded: ')[-1]
    return f"{x['post']}|{x['block']}|{x['type']}|{attr}"


def main():
    argv = sys.argv[1:]
    check = '--check' in argv
    as_json = '--json' in argv
    baseline_path = None
    if '--baseline' in argv:
        baseline_path = argv[argv.index('--baseline') + 1]
    skip_next = False
    paths = []
    for i, a in enumerate(argv):
        if skip_next:
            skip_next = False
            continue
        if a == '--baseline':
            skip_next = True
            continue
        if not a.startswith('--'):
            paths.append(a)
    if not paths:
        print(__doc__.strip().splitlines()[0])
        print('usage: audit-post-content-blocks.py <file-or-dir> [...] [--check] [--json] [--baseline <file>]')
        return 2
    files = collect_inputs(paths)
    if files is None:
        return 2
    accepted = {}
    if baseline_path:
        try:
            accepted = json.loads(pathlib.Path(baseline_path).read_text(encoding='utf-8')).get('accepted', {})
        except (OSError, json.JSONDecodeError) as e:
            print(f'[audit-post-content] cannot read baseline {baseline_path}: {e}', file=sys.stderr)
            return 2
    schemas = load_schemas()
    findings = []
    for f in files:
        label = f'{f.parent.name}/{f.stem if f.suffix == ".txt" else f.name}'
        findings.extend(scan_text(label,
                                  f.read_text(encoding='utf-8', errors='replace'), schemas))
    for x in findings:
        x['key'] = finding_key(x)
        x['baselined'] = x['key'] in accepted
    high = [x for x in findings if x['severity'] == 'HIGH' and not x['baselined']]
    baselined = [x for x in findings if x['baselined']]
    if as_json:
        print(json.dumps({'files_scanned': len(files), 'findings': findings,
                          'high': len(high), 'baselined': len(baselined)}, indent=1))
    elif not findings:
        print(f'[audit-post-content] OK — {len(files)} post(s) scanned, no findings.')
    else:
        print(f'[audit-post-content] {len(findings)} finding(s) '
              f'({len(high)} NEW HIGH, {len(baselined)} baselined) across {len(files)} post(s):\n')
        for x in findings:
            if x['baselined']:
                continue
            print(f'  [{x["severity"]}] post {x["post"]} line {x["line"]} — {x["block"]}')
            print(f'      {x["type"]}: {x["detail"]}\n')
        if baselined:
            print(f'  (+{len(baselined)} baselined finding(s) — documented debt, see the baseline file)\n')
        if high:
            print('NEW HIGH findings mean stored content will silently fail to render or be')
            print('deleted on the next editor save. Migrate the stored shape via the block')
            print('editor (scripts/wp-migrate-oldshape-blocks.js — dry-run by default) BEFORE')
            print('deploying, or baseline WITH a register reference if genuinely accepted.')
    return 1 if (check and high) else 0


if __name__ == '__main__':
    sys.exit(main())
