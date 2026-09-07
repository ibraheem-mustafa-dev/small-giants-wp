#!/usr/bin/env python3
"""Codemod: swap the per-block hand-rolled border-radius tier read in
render.php for a single call to the new shared `sgs_border_radius_tiers()`
helper (`includes/helpers-box.php`).

WHY THIS EXISTS
---------------
Every block using the SgsBorderControl radius composite duplicates the exact
same ~19-line block: read `$attributes['borderRadius']`, branch string vs
corner-object, extract the 4 corners, then read `borderRadiusTablet`/
`borderRadiusMobile` as separate flat siblings. Once those two sibling
attributes are folded into `borderRadius` itself (Phase 2 box-family
migration), that inline block silently MISREADS the new shape: it would see
an array with `desktop`/`tablet`/`mobile` keys, find none of the corner keys
it's looking for, and drop the base radius entirely. The shared helper is
shape-agnostic (handles old and new both) and was verified directly via a
standalone PHP execution before this script was written.

Matches the EXACT known shape only; anything else is left untouched and
reported so it can be reviewed by hand — never guesses.
"""

import argparse
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

REPO = Path(__file__).resolve().parents[3]
BLOCKS_DIR = REPO / 'plugins' / 'sgs-blocks' / 'src' / 'blocks'

PATTERN = re.compile(
    r'(?P<indent>[ \t]*)\$base_border_radius = null;\n'
    r'(?:[ \t]*//[^\n]*\n)*'  # tolerate 0+ comment lines directly above the if
    r'[ \t]*if\s*\(\s*isset\(\s*\$attributes\[\s*[\'"]borderRadius[\'"]\s*\]\s*\)\s*\)\s*\{\n'
    r'[ \t]*\$radius_raw = \$attributes\[\s*[\'"]borderRadius[\'"]\s*\];\n'
    r'[ \t]*if\s*\(\s*is_string\(\s*\$radius_raw\s*\)\s*&&\s*\'\'\s*!==\s*\$radius_raw\s*\)\s*\{\n'
    r'[ \t]*\$base_border_radius = \$radius_raw;\n'
    r'[ \t]*\}\s*elseif\s*\(\s*is_array\(\s*\$radius_raw\s*\)\s*\)\s*\{\n'
    r'[ \t]*\$radius_clean\s*=\s*array\(\);\n'
    r'[ \t]*\$has_any_corner\s*=\s*false;\n'
    r'[ \t]*foreach\s*\(\s*array\(\s*[\'"]topLeft[\'"]\s*,\s*[\'"]topRight[\'"]\s*,\s*[\'"]bottomLeft[\'"]\s*,\s*[\'"]bottomRight[\'"]\s*\)\s*as\s*\$corner\s*\)\s*\{\n'
    r'[ \t]*\$radius_clean\[\s*\$corner\s*\]\s*=\s*isset\(\s*\$radius_raw\[\s*\$corner\s*\]\s*\)\s*\?\s*sgs_css_length_value\(\s*\$radius_raw\[\s*\$corner\s*\]\s*\)\s*:\s*\'\';\n'
    r'[ \t]*if\s*\(\s*\'\'\s*!==\s*\$radius_clean\[\s*\$corner\s*\]\s*\)\s*\{\n'
    r'[ \t]*\$has_any_corner = true;\n'
    r'[ \t]*\}\n'
    r'[ \t]*\}\n'
    r'[ \t]*if\s*\(\s*\$has_any_corner\s*\)\s*\{\n'
    r'[ \t]*\$base_border_radius = \$radius_clean;\n'
    r'[ \t]*\}\n'
    r'[ \t]*\}\n'
    r'[ \t]*\}\n'
    r'(?P<indent2>[ \t]*)\$border_radius_tablet_obj = is_array\(\s*\$attributes\[\s*[\'"]borderRadiusTablet[\'"]\s*\]\s*\?\?\s*null\s*\)\s*\?\s*\$attributes\[\s*[\'"]borderRadiusTablet[\'"]\s*\]\s*:\s*array\(\);\n'
    r'[ \t]*\$border_radius_mobile_obj = is_array\(\s*\$attributes\[\s*[\'"]borderRadiusMobile[\'"]\s*\]\s*\?\?\s*null\s*\)\s*\?\s*\$attributes\[\s*[\'"]borderRadiusMobile[\'"]\s*\]\s*:\s*array\(\);\n',
    re.MULTILINE,
)


# Pattern B — the "always-array, feeds wp_style_engine_get_styles() directly"
# shape (sgs/info-box and 35 others): no string/corner-object branch at all,
# `borderRadius` is read straight as an array-or-empty and handed to the style
# engine's `border.radius` argument.
PATTERN_B = re.compile(
    r"(?P<indent>[ \t]*)\$border_radius_obj = is_array\(\s*\$attributes\[\s*['\"]borderRadius['\"]\s*\]\s*\?\?\s*null\s*\)\s*\?\s*\$attributes\[\s*['\"]borderRadius['\"]\s*\]\s*:\s*array\(\);\n",
    re.MULTILINE,
)
PATTERN_B_TABLET = re.compile(
    r"[ \t]*\$border_radius_tablet_obj = is_array\(\s*\$attributes\[\s*['\"]borderRadiusTablet['\"]\s*\]\s*\?\?\s*null\s*\)\s*\?\s*\$attributes\[\s*['\"]borderRadiusTablet['\"]\s*\]\s*:\s*array\(\);\n",
    re.MULTILINE,
)
PATTERN_B_MOBILE = re.compile(
    r"[ \t]*\$border_radius_mobile_obj = is_array\(\s*\$attributes\[\s*['\"]borderRadiusMobile['\"]\s*\]\s*\?\?\s*null\s*\)\s*\?\s*\$attributes\[\s*['\"]borderRadiusMobile['\"]\s*\]\s*:\s*array\(\);\n",
    re.MULTILINE,
)


def render_php_state(rp: Path):
    if not rp.exists():
        return 'ABSENT', None
    src = rp.read_text(encoding='utf-8')
    m = PATTERN.search(src)
    if m:
        return 'LEGACY', m
    mb = PATTERN_B.search(src)
    mt = PATTERN_B_TABLET.search(src)
    mm = PATTERN_B_MOBILE.search(src)
    if mb and mt and mm:
        return 'LEGACY_B', (mb, mt, mm)
    if 'borderRadiusTablet' in src or "'borderRadius'" in src or '"borderRadius"' in src:
        return 'UNCLEAR', None
    return 'ABSENT', None


def fix_render_php_b(block_dir: Path, apply: bool):
    rp = block_dir / 'render.php'
    state, matches = render_php_state(rp)
    if state != 'LEGACY_B':
        return False, '', f'render.php is {state} — refusing (not an exact Pattern-B match)'

    src = rp.read_text(encoding='utf-8')
    mb, mt, mm = matches
    indent = mb.group('indent')
    # 2026-09-07: emit the ONE-ARG call. The helper's $legacy_tablet/$legacy_mobile
    # params were removed - every caller block is migrated, and no block declares the
    # sibling attrs any more, so passing them was always a literal null (WP discards
    # undeclared attributes, D338) and produced 96 dead-read gate findings.
    helper_line = f"{indent}$radius_tiers = sgs_border_radius_tiers( $attributes );\n"
    obj_line = f"{indent}$border_radius_obj = is_array( $radius_tiers['base'] ) ? $radius_tiers['base'] : array();\n"
    tablet_line = f"{indent}$border_radius_tablet_obj = $radius_tiers['tablet'];\n"
    mobile_line = f"{indent}$border_radius_mobile_obj = $radius_tiers['mobile'];\n"

    # Replace all three spans, working from the LAST match backwards so earlier
    # offsets stay valid.
    spans = sorted([(mb.start(), mb.end(), helper_line + obj_line),
                    (mt.start(), mt.end(), tablet_line),
                    (mm.start(), mm.end(), mobile_line)], key=lambda s: s[0], reverse=True)
    new_src = src
    for start, end, repl in spans:
        new_src = new_src[:start] + repl + new_src[end:]

    if not apply:
        return True, f'would replace the 3 flat reads with sgs_border_radius_tiers() in {rp.relative_to(REPO)}', None
    rp.write_text(new_src, encoding='utf-8')
    return True, f'rewrote radius-tier read (Pattern B) in {rp.relative_to(REPO)}', None


def fix_render_php(block_dir: Path, apply: bool):
    rp = block_dir / 'render.php'
    state, match = render_php_state(rp)
    if state != 'LEGACY':
        return False, '', f'render.php is {state} — refusing (not an exact match)'

    src = rp.read_text(encoding='utf-8')
    indent = match.group('indent')
    replacement = (
        f"{indent}\\$radius_tiers            = sgs_border_radius_tiers( \\$attributes );\n"
        f"{indent}\\$base_border_radius       = \\$radius_tiers['base'];\n"
        f"{indent}\\$border_radius_tablet_obj = \\$radius_tiers['tablet'];\n"
        f"{indent}\\$border_radius_mobile_obj = \\$radius_tiers['mobile'];\n"
    ).replace('\\$', '$')
    new_src = src[:match.start()] + replacement + src[match.end():]

    if not apply:
        return True, f'would replace the inline radius-tier block with sgs_border_radius_tiers() in {rp.relative_to(REPO)}', None
    rp.write_text(new_src, encoding='utf-8')
    return True, f'rewrote radius-tier read in {rp.relative_to(REPO)}', None


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--survey', action='store_true')
    ap.add_argument('--fix', action='store_true')
    ap.add_argument('--apply', action='store_true')
    ap.add_argument('--check', action='store_true')
    args = ap.parse_args()

    rows = []
    for bj in sorted(BLOCKS_DIR.glob('*/block.json')):
        block_dir = bj.parent
        state, _ = render_php_state(block_dir / 'render.php')
        if state == 'ABSENT':
            continue
        rows.append({'slug': block_dir.name, 'dir': block_dir, 'state': state})

    if args.survey or not (args.fix or args.check):
        for r in rows:
            print(f"  {r['slug']:28} {r['state']}")
        n_a = sum(1 for r in rows if r['state'] == 'LEGACY')
        n_b = sum(1 for r in rows if r['state'] == 'LEGACY_B')
        n_unclear = sum(1 for r in rows if r['state'] == 'UNCLEAR')
        print(f'\n{n_a} block(s) Pattern A (string-or-corner-object), {n_b} block(s) Pattern B '
              f'(always-array/style-engine) — both auto-fixable.')
        if n_unclear:
            print(f'{n_unclear} block(s) UNCLEAR — needs individual review:')
            for r in rows:
                if r['state'] == 'UNCLEAR':
                    print(f"   {r['slug']}")
        return 0

    if args.fix:
        for r in rows:
            if r['state'] == 'LEGACY':
                ok, desc, err = fix_render_php(r['dir'], apply=args.apply)
            elif r['state'] == 'LEGACY_B':
                ok, desc, err = fix_render_php_b(r['dir'], apply=args.apply)
            else:
                continue
            tag = 'APPLY' if args.apply else 'DRY-RUN'
            print(f"[{tag}] {r['slug']:28} {'OK  ' if ok else 'SKIP'} {desc or err}")
        return 0

    if args.check:
        bad = [r for r in rows if r['state'] in ('LEGACY', 'LEGACY_B')]
        if bad:
            print(f'[migrate-border-radius-render --check] {len(bad)} block(s) still using an inline shape:')
            for r in bad:
                print(f"   {r['slug']}")
            return 1
        print('[migrate-border-radius-render --check] OK — no inline radius-tier reads remain.')
        return 0

    return 0


if __name__ == '__main__':
    sys.exit(main())
