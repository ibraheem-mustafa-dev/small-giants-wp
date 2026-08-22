#!/usr/bin/env python3
"""Census: how does each block's render.php route its COLOUR PAINT?

WHY THIS EXISTS: the figure this produces gates the scope of the mechanism-aware
detector work (`.claude/plans/phase-colour-conformance.md` Step 2). It was first
derived with an uncommitted shell loop, and an independent QC agent could not
reproduce it — getting materially different buckets because it used a different
helper set and a different tie-break. A gating number with no committed method is
an estimate wearing a measurement's clothes (memory: `an-estimate-is-not-an-enumeration`).

THE METHOD, STATED SO IT IS REPRODUCIBLE AND ARGUABLE:

  DIRECT   the render.php contains a literal call to one of the four PAINT helpers
           below. These are the functions that actually EMIT a colour declaration —
           NOT `sgs_colour_value()`, which is the slug->var() resolver and is used
           in far more places for values that are not a paint (borders on a divider,
           a shadow composite, an SVG fill). Counting the resolver would inflate
           DIRECT and answer a different question.

  WRAPPER  no direct paint-helper call, but the block hands its attributes to
           `SGS_Container_Wrapper::render(` — so the paint happens inside a SHARED
           PHP file the per-block scan never reads. This is the population a
           per-block resolver is blind to.

  NEITHER  no paint-helper call and no wrapper call. Either the block paints no
           colour at all, or it paints through a route not yet named here — which
           is itself a finding, not a clean result.

⛔ TIE-BREAK, and it is load-bearing: DIRECT wins over WRAPPER. A block that does
   BOTH (paints something itself AND routes the rest through the wrapper) counts as
   DIRECT, because a per-block resolver CAN see at least part of its paint. This
   choice moves blocks between buckets and must be stated, not left implicit — it is
   the most likely reason two people counting "the same thing" disagree.

Run:  python plugins/sgs-blocks/scripts/census-colour-paint-route.py [--json]
"""
import argparse
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
BLOCKS_DIR = ROOT / 'src' / 'blocks'

# The four helpers that EMIT a colour paint declaration. Deliberately NOT
# sgs_colour_value() — see the docstring.
PAINT_HELPERS = (
    'sgs_background_paint_decl',
    'sgs_text_colour_decl',
    'sgs_border_gradient_css',
    'sgs_overlay_decls',
)
WRAPPER_CALL = 'SGS_Container_Wrapper::render('

# A helper name inside a // or # line comment, or a /* */ block, is prose, not a
# call. Stripping them is the difference between counting code and counting
# documentation — this repo has been bitten by exactly that (heading/render.php's
# comment quoting a bug was once flagged as the bug).
BLOCK_COMMENT = re.compile(r'/\*.*?\*/', re.S)
LINE_COMMENT = re.compile(r'^\s*(//|#).*$', re.M)


def strip_comments(src: str) -> str:
    return LINE_COMMENT.sub('', BLOCK_COMMENT.sub('', src))


def classify(path: pathlib.Path):
    src = strip_comments(path.read_text(encoding='utf-8', errors='ignore'))
    hits = [h for h in PAINT_HELPERS if h + '(' in src]
    if hits:
        return 'direct', hits
    if WRAPPER_CALL in src:
        return 'wrapper', []
    return 'neither', []


def main():
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
    ap = argparse.ArgumentParser()
    ap.add_argument('--json', action='store_true')
    args = ap.parse_args()

    buckets = {'direct': [], 'wrapper': [], 'neither': []}
    no_render = []

    for d in sorted(BLOCKS_DIR.iterdir()):
        if not d.is_dir():
            continue
        # `extensions/` holds no block.json and is not a block — excluding it is
        # why an `ls | wc -l` of this directory disagrees with the block roster.
        if not (d / 'block.json').exists():
            continue
        rp = d / 'render.php'
        if not rp.exists():
            no_render.append(d.name)
            continue
        bucket, hits = classify(rp)
        buckets[bucket].append((d.name, hits))

    total = sum(len(v) for v in buckets.values()) + len(no_render)
    if args.json:
        print(json.dumps({
            'method': 'paint-helpers only; DIRECT beats WRAPPER; comments stripped',
            'paint_helpers': list(PAINT_HELPERS),
            'counts': {k: len(v) for k, v in buckets.items()},
            'no_render_php': no_render,
            'total_blocks': total,
            'blocks': {k: [n for n, _ in v] for k, v in buckets.items()},
        }, indent=1))
        return 0

    print('Colour-paint routing census (method in this script\'s docstring)')
    print(f'  DIRECT  (a paint helper is called in the block\'s own render.php) : {len(buckets["direct"]):>3}')
    print(f'  WRAPPER (no paint helper; routes via SGS_Container_Wrapper)      : {len(buckets["wrapper"]):>3}')
    print(f'  NEITHER (no paint helper, no wrapper call)                       : {len(buckets["neither"]):>3}')
    if no_render:
        print(f'  NO render.php (static blocks, excluded from the three above)     : {len(no_render):>3}')
    print(f'  TOTAL blocks with a block.json                                    : {total:>3}')
    print()
    print('WRAPPER + NEITHER is the population a PER-BLOCK resolver cannot see:'
          f' {len(buckets["wrapper"]) + len(buckets["neither"])}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
