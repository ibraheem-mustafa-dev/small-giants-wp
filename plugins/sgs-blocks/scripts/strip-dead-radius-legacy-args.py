#!/usr/bin/env python3
"""Strip the provably-dead legacy tier args from sgs_border_radius_tiers() calls.

WHY (2026-09-07). `sgs_border_radius_tiers( array $attributes, $legacy_tablet,
$legacy_mobile )` reads params 2 and 3 ONLY in its `else` branch — the path taken
when the block has NOT migrated to the tier-object `borderRadius` shape. Census
this date: all 50 caller blocks ARE migrated (their block.json declares
`borderRadius` with a desktop/tablet/mobile default), so `$has_tier_key` is always
true and the args are always ignored. Separately, NO caller block declares
`borderRadiusTablet`/`borderRadiusMobile` any more, so the expression
`$attributes['borderRadiusTablet'] ?? null` is always literally null — WordPress
discards attributes a block.json does not declare (D338).

So the args are dead twice over. They are not a bug, but they generate 96
"dead flat-attribute read" findings on every gate run, which is exactly the noise
that makes a REAL finding easy to miss.

NOT touched (verified 2026-09-07): `sgs/media` and `sgs/whatsapp-cta` genuinely
declare and use `borderRadiusTablet`/`borderRadiusMobile` as their own
separate-sibling attrs and never call this helper. `sgs/media` is also under active
development on another branch.

Usage:  --check (report only, exit 1 if changes pending) | --apply
"""
import argparse, pathlib, re, sys

REPO = pathlib.Path(__file__).resolve().parents[3]
BLOCKS = REPO / 'plugins/sgs-blocks/src/blocks'

# matches the call with its two legacy args, single- or multi-line
CALL = re.compile(
    r'sgs_border_radius_tiers\(\s*\$attributes\s*,\s*'
    r'\$attributes\[\s*[\'"]borderRadiusTablet[\'"]\s*\]\s*\?\?\s*null\s*,\s*'
    r'\$attributes\[\s*[\'"]borderRadiusMobile[\'"]\s*\]\s*\?\?\s*null\s*\)',
    re.S,
)

def main():
    ap = argparse.ArgumentParser()
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument('--check', action='store_true')
    g.add_argument('--apply', action='store_true')
    args = ap.parse_args()

    changed, total = [], 0
    for rp in sorted(BLOCKS.glob('*/render.php')):
        src = rp.read_text(encoding='utf-8')
        new, n = CALL.subn('sgs_border_radius_tiers( $attributes )', src)
        if n:
            total += n
            changed.append((rp.relative_to(REPO).as_posix(), n))
            if args.apply:
                rp.write_text(new, encoding='utf-8', newline='')

    verb = 'stripped' if args.apply else 'would strip'
    for path, n in changed:
        print('  %s %d legacy arg-pair(s): %s' % (verb, n, path))
    print('\n%s %d call(s) across %d file(s).' % (verb, total, len(changed)))

    if args.check and changed:
        return 1
    return 0

if __name__ == '__main__':
    sys.exit(main())
