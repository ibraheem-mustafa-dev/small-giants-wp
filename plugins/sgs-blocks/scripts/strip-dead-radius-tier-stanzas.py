#!/usr/bin/env python3
"""Delete the DEAD duplicate border-radius tier stanzas from render.php.

WHY (2026-09-07). Five blocks contain a SECOND border-radius tier emission that
reads `$attributes['borderRadiusTablet'|'borderRadiusMobile']` directly. Those
attributes are not declared in any of these blocks' block.json, and WordPress
discards undeclared attributes (D338), so the read is always null -> the guard
`if ( ! empty( ... ) )` is never true -> the stanza emits nothing, ever.

It is NOT a missing feature: every one of these blocks ALREADY emits the same
tablet/mobile radius, to the SAME selector, earlier in the file, from the shared
`sgs_border_radius_tiers()` tier object. Verified per block before writing this:

  brand-strip        live L190 emits at L599   | dead stanza at L835
  countdown-timer    live L165 emits at L302   | dead stanza at L481
  counter            live L258 emits at L267   | dead stanza at L398
  table-of-contents  live L304 emits at L307   | dead stanza at L454
  before-after       live L691 emits at L702   | dead stanza at L232

So REVIVING them (pointing them at the tier object) would double-emit the same
declaration to the same selector. Deletion is the correct fix and is provably a
behavioural no-op.

Deletes the dead assignment plus its guarded block, by brace matching.
Usage:  --check (print what would go) | --apply
"""
import argparse, pathlib, re, sys

REPO = pathlib.Path(__file__).resolve().parents[3]
BLOCKS = REPO / 'plugins/sgs-blocks/src/blocks'

# a dead assignment: any line assigning from $attributes['borderRadiusTablet'|'borderRadiusMobile']
DEAD_ASSIGN = re.compile(
    r"^\s*\$[A-Za-z_]\w*\s*=\s*.*\$attributes\[\s*['\"]borderRadius(?:Tablet|Mobile)['\"]\s*\].*$"
)
# blocks that legitimately declare + use these attrs — never touch
SKIP = {'media', 'whatsapp-cta'}


def stanza_end(lines, i):
    """From the assignment at i, consume a following `if (...) { ... }` block."""
    j = i + 1
    while j < len(lines) and lines[j].strip() == '':
        j += 1
    if j >= len(lines) or not lines[j].lstrip().startswith('if ('):
        return i + 1                      # bare assignment, no guard
    depth = 0
    started = False
    while j < len(lines):
        depth += lines[j].count('{') - lines[j].count('}')
        if '{' in lines[j]:
            started = True
        j += 1
        if started and depth <= 0:
            break
    return j


def main():
    ap = argparse.ArgumentParser()
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument('--check', action='store_true')
    g.add_argument('--apply', action='store_true')
    a = ap.parse_args()

    total_files = total_lines = 0
    for rp in sorted(BLOCKS.glob('*/render.php')):
        if rp.parent.name in SKIP:
            continue
        lines = rp.read_text(encoding='utf-8').split('\n')
        cuts = []
        i = 0
        while i < len(lines):
            if DEAD_ASSIGN.match(lines[i]):
                cuts.append((i, stanza_end(lines, i)))
                i = cuts[-1][1]
            else:
                i += 1
        if not cuts:
            continue
        total_files += 1
        print('=== %s' % rp.relative_to(REPO).as_posix())
        for s, e in cuts:
            total_lines += (e - s)
            print('    would remove L%d-%d:' % (s + 1, e))
            for ln in lines[s:e]:
                print('      | ' + ln)
        if a.apply:
            keep = [l for idx, l in enumerate(lines)
                    if not any(s <= idx < e for s, e in cuts)]
            rp.write_text('\n'.join(keep), encoding='utf-8', newline='')

    print('\n%s %d line(s) across %d file(s).'
          % ('REMOVED' if a.apply else 'WOULD REMOVE', total_lines, total_files))
    return 1 if (a.check and total_files) else 0


if __name__ == '__main__':
    sys.exit(main())
