#!/usr/bin/env python3
"""Follow-up to fix-render-tier-object-spacing.py (2026-09-06): the preamble
that fix inserted right after the ABSPATH guard calls
sgs_responsive_normalise_object() -- but that function is only DEFINED once
`require_once .../render-helpers.php` actually EXECUTES, and in every one of
the 29 patched files that require comes LATER than the ABSPATH guard (28-84
lines later). Calling the function before the require line runs is a fatal
"Call to undefined function" -- confirmed live on the sandybrown canary via
sgs/business-info (invoked early through class-sgs-header-rules.php's
pattern-evaluation path), rolled back immediately.

Fix: cut the preamble block from its current position and re-insert it
immediately after the FIRST `require_once .../render-helpers.php` line in
each file (require_once is idempotent, so a file with more than one such
line is unaffected by anchoring on the first).

Usage:
  python scripts/fix-render-tier-object-spacing-reposition.py --check
  python scripts/fix-render-tier-object-spacing-reposition.py --fix
"""
import re
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

MARKER = "// [D-tier-object-render-fix 2026-09-06]"

# The whole inserted block, MARKER through the last preamble line, as one
# capture group -- tolerant of the blank line the original insertion left
# trailing.
PREAMBLE_RE = re.compile(
    re.escape(MARKER) + r".*?\$sgs_tor_margin_desktop\s*=.*?array\(\);\n",
    re.DOTALL,
)

REQUIRE_LINE_RE = re.compile(
    r"require_once[^\n]*render-helpers\.php['\"]\s*;\s*\n"
)


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else '--check'
    for block in BLOCKS:
        render = BLOCKS_DIR / block / 'render.php'
        if not render.exists():
            print(f'{block}: MISSING render.php')
            continue
        text = render.read_text(encoding='utf-8')
        preamble_match = PREAMBLE_RE.search(text)
        if not preamble_match:
            print(f'{block}: PREAMBLE NOT FOUND -- needs hand review')
            continue
        require_match = REQUIRE_LINE_RE.search(text)
        if not require_match:
            print(f'{block}: REQUIRE LINE NOT FOUND -- needs hand review')
            continue
        if require_match.start() < preamble_match.start():
            print(f'{block}: already correctly ordered (require before preamble) -- skipping')
            continue
        preamble_text = preamble_match.group(0)
        without_preamble = text[: preamble_match.start()] + text[preamble_match.end():]
        # Re-find the require line in the text with the preamble removed
        # (positions shifted).
        require_match2 = REQUIRE_LINE_RE.search(without_preamble)
        if not require_match2:
            print(f'{block}: REQUIRE LINE LOST AFTER REMOVAL -- needs hand review')
            continue
        insert_at = require_match2.end()
        new_text = (
            without_preamble[:insert_at]
            + '\n' + preamble_text
            + without_preamble[insert_at:]
        )
        if mode == '--fix':
            render.write_text(new_text, encoding='utf-8')
            print(f'{block}: repositioned')
        else:
            print(f'{block}: would reposition')


if __name__ == '__main__':
    main()
