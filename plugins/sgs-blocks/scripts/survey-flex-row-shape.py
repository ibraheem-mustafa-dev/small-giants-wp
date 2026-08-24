#!/usr/bin/env python3
"""Classify every authored sgs/container flex ROW by what it is actually doing.

The flexWrap default is being moved out of the shared wrapper and into block.json
(see reports/visual-diff/container-2026-08-24.md). Before the default can become the
CSS default (`nowrap`), every authored row that RELIES on the injected `wrap` has to
say so itself -- or be converted to the primitive that suits it better.

Three populations, and they want three different answers:

  NO-OP        fewer than 2 children. A flex container with one item cannot wrap,
               so flex-wrap is definitionally inert. Needs NOTHING; it can take the
               CSS default today with zero risk.

  CARD-SHAPED  3+ homogeneous children (same block type). These are card / stat /
               feature rows. flex+wrap is a workaround here: it gives no column
               alignment across rows and leaves the last row under-filled. The
               right primitive is layout:"grid", which sgs/container already has
               (`columns` per tier + `minColumnWidth` -> sgs_intrinsic_columns_track()).

  FLEX-ROW     everything else -- 2 children, or heterogeneous children. Nav bars,
               button pairs, price rows. Genuinely a flex row; wrap is usually a
               no-op because they fit, but that is CONTENT-dependent and this script
               cannot see rendered width, so it does not claim it.

⛔ This script does NOT edit anything and has no --fix. The CARD-SHAPED call is a
CANDIDATE, not a verdict: converting flex->grid changes cross-row alignment and item
sizing, which is a visible redesign that wants an eye on each surface. Auto-applying
it would be exactly the "measured the thing I changed, not the thing the change was
meant to achieve" failure this project keeps recording.
"""
import re, json, io, glob, os, sys
from collections import Counter

# ⛔ The namespace is OPTIONAL. Core blocks serialise WITHOUT one -- `wp:paragraph`,
# `wp:list`, `wp:heading` -- while SGS blocks carry `wp:sgs/container`. The first version
# of this regex required `namespace/name`, so every core-block child was INVISIBLE to the
# child count. Containers mixing sgs/* with bare core blocks were undercounted and
# misclassified NO-OP ("fewer than 2 children, wrap cannot apply"), which is exactly the
# bucket that gets no `flexWrap` authored. Caught 2026-08-24 by a before/after computed
# tally, not by this script: 3 elements changed on / and 6 on /shop/ after the default
# flip, traced to framework-footer-default.php's "Quick Links" container -- sgs/heading +
# wp:list, counted as 1 child. A detector that cannot see half the block vocabulary reports
# a confident wrong answer.
TOK = re.compile(r'<!--\s*(/?)wp:([a-z0-9-]+(?:/[a-z0-9-]+)?)([^>]*?)(/?)-->', re.S)
DEC = json.JSONDecoder()


def theme_files():
    out = []
    for d in ('theme/sgs-theme/patterns', 'theme/sgs-theme/templates', 'theme/sgs-theme/parts'):
        for ext in ('*.php', '*.html'):
            out += glob.glob(os.path.join(d, ext))
    return sorted(out)


def parse_attrs(raw):
    raw = raw.strip()
    if not raw.startswith('{'):
        return {}
    try:
        attrs, _ = DEC.raw_decode(raw)
        return attrs
    except Exception:
        return {}


def direct_children(toks, i):
    """Block names of the DIRECT children of toks[i], honouring nesting."""
    if toks[i].group(4):          # self-closing: no children
        return []
    depth, kids = 0, []
    for n in toks[i + 1:]:
        closing, name, _, selfclose = n.groups()
        if closing:
            if depth == 0:
                break
            depth -= 1
        else:
            if depth == 0:
                kids.append(name)
            if not selfclose:
                depth += 1
    return kids


def classify(kids):
    if len(kids) < 2:
        return 'NO-OP'
    uniq = set(kids)
    if len(kids) >= 3 and len(uniq) == 1:
        return 'CARD-SHAPED'
    return 'FLEX-ROW'


def survey():
    rows = []
    for f in theme_files():
        s = io.open(f, encoding='utf-8', errors='replace').read()
        toks = list(TOK.finditer(s))
        for i, m in enumerate(toks):
            if m.group(1) or m.group(2) != 'sgs/container':
                continue
            attrs = parse_attrs(m.group(3))
            if attrs.get('layout', 'flex') != 'flex':
                continue
            if str(attrs.get('flexDirection', '')).startswith('column'):
                continue
            if attrs.get('flexWrap', '') != '':
                continue          # already explicit -- nothing owed
            kids = direct_children(toks, i)
            rows.append({
                'file': os.path.relpath(f).replace(os.sep, '/'),
                'line': s[:m.start()].count('\n') + 1,
                'children': len(kids),
                'child_types': sorted(set(kids)),
                'verdict': classify(kids),
            })
    return rows


def main():
    rows = survey()
    tally = Counter(r['verdict'] for r in rows)

    print(f"Authored sgs/container flex ROWS with flexWrap unset: {len(rows)}\n")
    print(f"  NO-OP        {tally['NO-OP']:>4}   <2 children - wrap cannot apply, needs nothing")
    print(f"  CARD-SHAPED  {tally['CARD-SHAPED']:>4}   3+ homogeneous children - CANDIDATE for layout:grid")
    print(f"  FLEX-ROW     {tally['FLEX-ROW']:>4}   genuine flex row - needs explicit wrap, or proof it fits")

    if '--verbose' in sys.argv:
        for v in ('CARD-SHAPED', 'FLEX-ROW'):
            print(f"\n--- {v} ---")
            for r in [x for x in rows if x['verdict'] == v]:
                types = ','.join(t.replace('sgs/', '') for t in r['child_types'])[:44]
                print(f"  {r['file']}:{r['line']:<5} children={r['children']:<3} [{types}]")

    if '--json' in sys.argv:
        out = 'reports/flex-row-shape-survey.json'
        io.open(out, 'w', encoding='utf-8').write(json.dumps(rows, indent=2))
        print(f"\nwrote {out}")

    # Self-test: the classifier must DISCRIMINATE, not label everything one way.
    if '--self-test' in sys.argv:
        cases = [
            ([], 'NO-OP'), (['sgs/heading'], 'NO-OP'),
            (['sgs/card', 'sgs/card', 'sgs/card'], 'CARD-SHAPED'),
            (['sgs/card', 'sgs/card', 'sgs/card', 'sgs/card'], 'CARD-SHAPED'),
            (['sgs/card', 'sgs/card'], 'FLEX-ROW'),               # 2 is a pair, not a grid
            (['sgs/heading', 'sgs/button', 'sgs/text'], 'FLEX-ROW'),
            (['sgs/card', 'sgs/card', 'sgs/button'], 'FLEX-ROW'),  # heterogeneous
            # Regression: bare core blocks are children too (2026-08-24 undercount bug).
            (['sgs/heading', 'list'], 'FLEX-ROW'),
            (['paragraph', 'paragraph', 'paragraph'], 'CARD-SHAPED'),
        ]
        bad = [(k, e, classify(k)) for k, e in cases if classify(k) != e]
        print(f"\nself-test: {len(cases) - len(bad)}/{len(cases)} pass")
        for k, e, g in bad:
            print(f"  FAIL {k} expected {e} got {g}")
        return 1 if bad else 0
    return 0


if __name__ == '__main__':
    sys.exit(main())
