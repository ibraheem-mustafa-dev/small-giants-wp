#!/usr/bin/env python3
"""One-off fix (2026-09-06): render.php CSS-emission side of the tier-object
padding/margin migration (9636f0129) was never updated for block-private
(non-SGS_Container_Wrapper) blocks. Each of these ~29 blocks hand-rolls its
own scoped <style> for base/tablet/mobile padding+margin, and every one of
them still reads the PRE-migration shape:
  - `$attributes['padding']` / `['margin']` treated as a flat 4-side box
    (it is now `{desktop:{...}, tablet:{...}, mobile:{...}}`)
  - `$attributes['paddingTablet']` / `['paddingMobile']` / `['marginTablet']`
    / `['marginMobile']` read as separate flat attrs (block.json no longer
    declares any of the four -- they were folded into the tier object)

Surveyed 2026-09-06: the downstream code that CONSUMES these values differs
per block (a foreach loop filtering strings, a ternary passthrough, a direct
assignment into a style-engine args array, differing local variable names/
prefixes) -- at least 4 distinct shapes across 29 files, discovered by
reading a sample of each. Rather than pattern-match every shape (proven
fragile elsewhere in this migration -- see the codemod-completeness lesson
in .claude/prompts/2026-09-06-tier-object-phase-3-remaining-work.md), this
fix normalises ONCE, immediately after the ABSPATH guard, then does a plain
literal substitution of the four dead flat-attribute expressions everywhere
they appear in the file, pointing them at the normalised tier instead --
every downstream shape keeps reading a value with the same meaning it always
had, whatever code shape it uses to consume it.

`paddingTablet`/`paddingMobile`/`marginTablet`/`marginMobile` are NOT
declared any more -- writing back into those literal key names re-introduces
the exact undeclared-reference string the gate flags (proven by a first
attempt at this fix, reverted after the gate's finding count went UP not
down). A second attempt then overwrote `$attributes['padding']`/`['margin']`
in place (those two keys ARE still declared, so that part is gate-clean) --
but a DIFFERENT gate (control-vs-render mismatch, part of `npm run build`'s
gate:full) flagged that as "render.php overwrites a user-controlled attribute
with a hardcoded value" -- a false positive from its point of view (my RHS
IS derived from the user's own value), but a real code-smell the gate is
right to catch given the general shape. So: fresh local variables for
EVERYTHING, no writes back into `$attributes[...]` at all. All six literal
expressions get substituted file-wide to point at normalised locals instead.

Usage:
  python scripts/fix-render-tier-object-spacing.py --check   # report only
  python scripts/fix-render-tier-object-spacing.py --fix     # apply
"""
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
BLOCKS_DIR = SCRIPT_DIR.parent / 'src' / 'blocks'

BLOCKS = [
    'audio', 'brand-strip', 'breadcrumbs', 'business-info', 'button',
    'collapsible-text', 'countdown-timer', 'counter', 'heading', 'icon',
    'icon-list', 'info-box', 'nav-menu', 'notice-banner', 'option-picker',
    'process-steps', 'product-faq', 'product-search', 'quote',
    'responsive-logo', 'separator', 'social-icons', 'star-rating',
    'table-of-contents', 'team-member', 'testimonial', 'text', 'timeline',
    'whatsapp-cta',
]

ANCHOR = "defined( 'ABSPATH' ) || exit;\n"

MARKER = "// [D-tier-object-render-fix 2026-09-06]"

PATCH = (
    MARKER + "\n"
    "// Group 1 folded padding/margin into owned tier-object attrs\n"
    "// {desktop,tablet,mobile}, but this block's own scoped CSS below still\n"
    "// reads the pre-migration flat shape (a plain box for the base value,\n"
    "// plus four separate flat attrs for the tablet/mobile overrides --\n"
    "// block.json no longer declares any of those four). Normalise once,\n"
    "// into fresh locals only -- every literal reference below has been\n"
    "// redirected to these instead of writing back into $attributes.\n"
    "$sgs_tor_padding_tiers  = sgs_responsive_normalise_object( $attributes['padding'] ?? null, true );\n"
    "$sgs_tor_margin_tiers   = sgs_responsive_normalise_object( $attributes['margin'] ?? null, true );\n"
    "$sgs_tor_padding_desktop = is_array( $sgs_tor_padding_tiers['desktop'] ) ? $sgs_tor_padding_tiers['desktop'] : array();\n"
    "$sgs_tor_margin_desktop  = is_array( $sgs_tor_margin_tiers['desktop'] ) ? $sgs_tor_margin_tiers['desktop'] : array();\n"
)

# Literal substitutions applied file-wide, AFTER the preamble is inserted --
# every occurrence of these six dead/misshapen expressions anywhere in the
# file (whatever the surrounding code shape) now reads a normalised local
# instead. Order matters: the two-key forms must run before their shorter
# substrings would otherwise never collide here, but keep padding/margin
# last since they are substrings only of themselves, not of the tier forms.
SUBSTITUTIONS = [
    ("$attributes['paddingTablet']", "$sgs_tor_padding_tiers['tablet']"),
    ("$attributes['paddingMobile']", "$sgs_tor_padding_tiers['mobile']"),
    ("$attributes['marginTablet']", "$sgs_tor_margin_tiers['tablet']"),
    ("$attributes['marginMobile']", "$sgs_tor_margin_tiers['mobile']"),
    ("$attributes['padding']", "$sgs_tor_padding_desktop"),
    ("$attributes['margin']", "$sgs_tor_margin_desktop"),
]


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else '--check'
    for block in BLOCKS:
        render = BLOCKS_DIR / block / 'render.php'
        if not render.exists():
            print(f'{block}: MISSING render.php')
            continue
        text = render.read_text(encoding='utf-8')
        if MARKER in text:
            print(f'{block}: already patched')
            continue
        if ANCHOR not in text:
            print(f'{block}: ANCHOR NOT FOUND -- needs hand review')
            continue
        sub_counts = {old: text.count(old) for old, _ in SUBSTITUTIONS}
        if mode == '--fix':
            # Substitute FIRST (on the pre-migration reads), THEN insert the
            # preamble -- so the preamble's own two $attributes[...] reads
            # (the true source values) are never touched by the substitution.
            for old, new in SUBSTITUTIONS:
                text = text.replace(old, new)
            text = text.replace(ANCHOR, ANCHOR + '\n' + PATCH + '\n', 1)
            render.write_text(text, encoding='utf-8')
            print(f'{block}: patched, substitutions={sub_counts}')
        else:
            print(f'{block}: would patch, substitutions={sub_counts}')


if __name__ == '__main__':
    main()
