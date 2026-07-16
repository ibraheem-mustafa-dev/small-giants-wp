#!/usr/bin/env python3
"""core/details -> sgs/accordion + sgs/accordion-item (N sibling details -> 1 accordion).

Bean-directed (2026-07-16): the block-replacements map wrongly pointed
core/details at sgs/collapsible-text (a read-more TEXT-TRUNCATION block with no
title and no child slot). core/details is a disclosure widget — question that
expands to an answer — which IS sgs/accordion-item (it has `title` + `isOpen` +
an InnerBlocks content slot). The map is corrected; this transform executes it.

Shape no generic pairing handles: a RUN of consecutive sibling core/details
collapses into ONE sgs/accordion wrapping N sgs/accordion-item. Each detail's
<summary> text becomes the item `title`; the content after </summary> (already
sgs/text from the paragraph sweep) becomes the item's InnerBlocks child; core's
`open` becomes `isOpen`.

The per-detail `style.border.bottom` + `style.spacing.padding` are DROPPED with
reason, not lost: sgs/accordion's default `style:"bordered"` provides item
dividers and each accordion-item provides its own padding — the block's native
equivalent of what the core details hand-rolled. (Project philosophy: use the
SGS block's own capability, never re-emit the core hack.)

Run from the worktree root:
  python plugins/sgs-blocks/scripts/migrate-core-blocks/migrate-details-to-accordion.py [--write]
"""

import argparse
import json
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from block_parser import parse_blocks, walk, serialize_comment, serialize_closer  # noqa: E402

REPO = pathlib.Path(__file__).resolve().parents[4]
THEME = REPO / 'theme' / 'sgs-theme'
BLOCKS_DIR = REPO / 'plugins' / 'sgs-blocks' / 'src' / 'blocks'

SUMMARY_RE = re.compile(r'<summary\b[^>]*>(.*?)</summary>', re.S | re.I)
TAG_RE = re.compile(r'<[^>]+>')
# The block's inner span is the whole <details>…</details> element; peel the
# wrapper so `content` is only what sits between </summary> and </details>.
DETAILS_RE = re.compile(r'<details\b[^>]*>(.*)</details>\s*$', re.S | re.I)


def _declared(block_slug):
    bj = BLOCKS_DIR / block_slug.split('/', 1)[1] / 'block.json'
    return set(json.loads(bj.read_text(encoding='utf-8')).get('attributes', {}).keys())


def _detail_to_item(node, text):
    """Build the sgs/accordion-item markup for one core/details node."""
    span = node.inner_html_span()
    inner = text[span[0]:span[1]] if span else ''
    # Peel the <details>…</details> wrapper so the trailing </details> doesn't
    # leak into the content (the block's inner span is the whole HTML element).
    dm = DETAILS_RE.search(inner.strip())
    element = dm.group(1) if dm else inner
    m = SUMMARY_RE.search(element)
    if not m:
        raise SystemExit('a core/details has no <summary> — cannot derive the accordion-item title')
    title = TAG_RE.sub('', m.group(1)).strip()
    # Everything after </summary> (inside <details>) is the answer content.
    content = element[m.end():].strip()

    attrs = {'title': title}
    if (node.attrs or {}).get('open'):
        attrs['isOpen'] = True

    declared = _declared('sgs/accordion-item')
    bad = [k for k in attrs if k not in declared]
    if bad:
        raise SystemExit(f'accordion-item emit has undeclared attr(s) {bad}')

    return (serialize_comment('sgs/accordion-item', attrs, void=False) + '\n'
            + content + '\n'
            + serialize_closer('sgs/accordion-item'))


def process(path, rel, write):
    text = path.read_text(encoding='utf-8')
    details = [n for n in walk(parse_blocks(text, rel)) if n.name == 'core/details']
    if not details:
        return None
    # Group consecutive same-parent siblings into runs (each run -> one accordion).
    runs = []
    cur = [details[0]]
    for prev, node in zip(details, details[1:]):
        if node.parent is prev.parent:
            cur.append(node)
        else:
            runs.append(cur)
            cur = [node]
    runs.append(cur)

    # Rewrite back-to-front so earlier spans keep their offsets (runs don't nest).
    new_text = text
    log = []
    for run in sorted(runs, key=lambda r: r[0].start, reverse=True):
        items = ''.join('\t' + _detail_to_item(d, text) + '\n' for d in run)
        accordion = (serialize_comment('sgs/accordion', {}, void=False) + '\n'
                     + items
                     + serialize_closer('sgs/accordion'))
        new_text = new_text[: run[0].start] + accordion + new_text[run[-1].end:]
        log.append((text[: run[0].start].count('\n') + 1, len(run)))

    if write:
        path.write_text(new_text, encoding='utf-8')
        parse_blocks(path.read_text(encoding='utf-8'), rel)  # round-trip guard
    return {'rel': rel, 'log': log, 'diff': new_text != text, 'new_text': new_text, 'old': text}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--write', action='store_true')
    args = ap.parse_args()
    total = 0
    for sub in ('parts', 'patterns', 'templates'):
        d = THEME / sub
        if not d.is_dir():
            continue
        for path in sorted(d.iterdir()):
            if path.suffix not in ('.php', '.html'):
                continue
            r = process(path, f'{sub}/{path.name}', args.write)
            if r and r['diff']:
                for line, n in r['log']:
                    print(f'  {r["rel"]}:{line}  {n} core/details -> 1 sgs/accordion')
                    total += n
                if not args.write:
                    import difflib
                    print(''.join(difflib.unified_diff(
                        r['old'].splitlines(keepends=True), r['new_text'].splitlines(keepends=True),
                        fromfile='a/' + r['rel'], tofile='b/' + r['rel']))[:2000])
    print(f'[{"WROTE" if args.write else "DRY-RUN"}] {total} core/details collapsed into accordions.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
