"""Audit v2 — multi-suffix decomposition.

Recursively peels off modifier suffixes in priority order to expose the TRUE
base slot word. Compared to v1, this handles:

  * Breakpoint suffix (Mobile/Tablet/Desktop)
  * Corner suffix (TL/TR/BL/BR)
  * Side suffix (Top/Right/Bottom/Left)
  * State suffix (Hover/Active/Focus/Disabled)
  * Variant suffix (Primary/Secondary/Tertiary)
  * Unit suffix (Unit only — no value)
  * Prefix normalisation (bg* -> background*, sub* preserved)
  * Property-type suffix (Colour, FontSize, Padding, BorderRadius, ...)

After full decomposition, what remains is the slot identity.
"""
from __future__ import annotations
import os, re, sqlite3, sys
from collections import defaultdict, Counter

DB = os.path.expanduser('~/.claude/skills/sgs-wp-engine/sgs-framework.db')
PROJECT = os.path.expanduser('~/Projects/small-giants-wp')
REPORT_DIR = os.path.join(PROJECT, 'reports')

BREAKPOINTS = ('Mobile', 'Tablet', 'Desktop')
CORNERS     = ('TL', 'TR', 'BL', 'BR')
SIDES       = ('Top', 'Right', 'Bottom', 'Left')
STATES      = ('Hover', 'Active', 'Focus', 'Disabled')
VARIANTS    = ('Primary', 'Secondary', 'Tertiary')
UNIT_TOKENS = ('Unit',)

PROPERTY_SUFFIXES = [
    # Most-specific compound colour props first
    'BackgroundColour', 'BackgroundColor', 'BorderColour', 'BorderColor',
    'TextColour', 'TextColor', 'TextDecoration', 'TextTransform', 'TextAlign',
    'FontFamily', 'FontSize', 'FontWeight',
    'LineHeight', 'LetterSpacing',
    'BorderRadius', 'BorderWidth', 'BorderStyle',
    'BoxShadow', 'AspectRatio', 'ObjectFit', 'ObjectPosition',
    'Background', 'Foreground',
    'Padding', 'Margin', 'Gap',
    'MinHeight', 'MaxWidth', 'MaxHeight', 'MinWidth',
    'Colour', 'Color', 'Opacity', 'Shadow', 'Stroke',
    'Width', 'Height',
    'Url', 'Href', 'Link',
    'Style', 'Variant', 'Layout', 'Alignment',
    'Required', 'Placeholder', 'HelpText', 'ErrorMessage',
]

# Strip rules in priority order — each rule returns (new_name, was_stripped)
def strip_one(name: str, suffixes: tuple) -> tuple[str, str | None]:
    for s in sorted(suffixes, key=len, reverse=True):
        if name.endswith(s) and len(name) > len(s):
            return name[:-len(s)], s
    return name, None


def normalise_prefix(name: str) -> str:
    """Map known prefix abbreviations to their canonical form."""
    # `bg*` -> `background*` (but only when followed by a property hint OR uppercase letter)
    # bgParallax -> backgroundParallax (yes — first letter uppercase)
    # bgVideo -> backgroundVideo
    # bgColor -> backgroundColor
    if name.startswith('bg') and len(name) > 2 and name[2].isupper():
        return 'background' + name[2:]
    return name


def decompose(name: str) -> dict:
    """Return {base, props, modifiers} after full recursive stripping."""
    n = normalise_prefix(name)
    modifiers: list[str] = []
    properties: list[str] = []
    iterations = 0
    changed = True
    while changed and iterations < 10:
        iterations += 1
        changed = False
        # Strip breakpoint (only one, terminal)
        n2, hit = strip_one(n, BREAKPOINTS)
        if hit:
            n = n2; modifiers.append(('breakpoint', hit)); changed = True; continue
        # Strip corner
        n2, hit = strip_one(n, CORNERS)
        if hit:
            n = n2; modifiers.append(('corner', hit)); changed = True; continue
        # Strip side
        n2, hit = strip_one(n, SIDES)
        if hit:
            n = n2; modifiers.append(('side', hit)); changed = True; continue
        # Strip variant
        n2, hit = strip_one(n, VARIANTS)
        if hit:
            n = n2; modifiers.append(('variant', hit)); changed = True; continue
        # Strip state (Hover/Active/Focus/Disabled) — but only as suffix
        n2, hit = strip_one(n, STATES)
        if hit:
            n = n2; modifiers.append(('state', hit)); changed = True; continue
        # Strip unit
        n2, hit = strip_one(n, UNIT_TOKENS)
        if hit:
            n = n2; modifiers.append(('unit', hit)); changed = True; continue
        # Strip ONE property suffix
        n2, hit = strip_one(n, tuple(PROPERTY_SUFFIXES))
        if hit:
            n = n2; properties.append(hit); changed = True; continue
    # After stripping, the residue is the slot base
    return {'base': n, 'properties': list(reversed(properties)), 'modifiers': list(reversed(modifiers))}


BOOL_PREFIXES = ('is', 'has', 'show', 'hide', 'enable', 'disable', 'allow', 'auto')


def is_structural(name: str) -> bool:
    for pref in BOOL_PREFIXES:
        if name.startswith(pref) and len(name) > len(pref) and name[len(pref)].isupper():
            return True
    return False


def main() -> int:
    c = sqlite3.connect(DB)
    rows = list(c.execute(
        "SELECT block_slug, attr_name FROM block_attributes WHERE block_slug LIKE 'sgs/%'"
    ))
    c.close()

    base_to_blocks: dict[str, set[str]] = defaultdict(set)
    base_to_attrs:  dict[str, list[str]] = defaultdict(list)
    prop_freq: Counter = Counter()
    mod_freq: Counter = Counter()
    structurals: int = 0
    skipped: int = 0

    for slug, attr in rows:
        if attr.startswith('_'):
            skipped += 1; continue
        if is_structural(attr):
            structurals += 1; continue
        d = decompose(attr)
        base = d['base']
        if not base or not base[0].islower():
            continue
        # Normalise case
        base = base[0].lower() + base[1:]
        base_to_blocks[base].add(slug)
        base_to_attrs[base].append(attr)
        for p in d['properties']:
            prop_freq[p] += 1
        for kind, val in d['modifiers']:
            mod_freq[f'{kind}:{val}'] += 1

    by_freq = sorted(base_to_blocks.items(), key=lambda kv: -len(kv[1]))
    long_tail = [(b, blks) for b, blks in by_freq if len(blks) == 1]

    # Per-block long-tail count after v2 decomposition
    block_unique: dict[str, int] = defaultdict(int)
    for b, blks in long_tail:
        block_unique[list(blks)[0]] += 1

    # Report
    os.makedirs(REPORT_DIR, exist_ok=True)
    out_path = os.path.join(REPORT_DIR, 'attr-vocabulary-audit-v2-2026-05-12.md')
    lines = []
    lines.append('# Attribute vocabulary audit v2 — multi-suffix decomposition')
    lines.append('')
    lines.append(f'Scanned **{len(rows)}** attribute rows across **{len(set(s for s,_ in rows))}** SGS blocks. ')
    lines.append(f'Skipped: {skipped} placeholders + {structurals} structural booleans (is*/has*/show*/hide* etc.).')
    lines.append(f'After full multi-suffix decomposition: **{len(base_to_blocks)}** distinct base slot words.')
    lines.append('')
    lines.append('## Decomposition vocabulary in use')
    lines.append('')
    lines.append('### Property suffixes (controlled vocabulary)')
    lines.append('')
    lines.append('| Suffix | Usage count |')
    lines.append('|---|---|')
    for p, n in prop_freq.most_common(30):
        lines.append(f'| `{p}` | {n} |')
    lines.append('')
    lines.append('### Modifier suffixes (corners/sides/states/variants/breakpoints)')
    lines.append('')
    lines.append('| Suffix | Usage count |')
    lines.append('|---|---|')
    for m, n in mod_freq.most_common(40):
        lines.append(f'| `{m}` | {n} |')
    lines.append('')
    lines.append('## Top slot bases by block coverage')
    lines.append('')
    lines.append('| Base slot | Blocks | Sample attrs |')
    lines.append('|---|---|---|')
    for base, blks in by_freq[:30]:
        if len(blks) >= 2:
            samples = sorted(set(base_to_attrs[base]))[:4]
            lines.append(f'| `{base}` | **{len(blks)}** | {", ".join("`"+s+"`" for s in samples)} |')
    lines.append('')
    lines.append('## Genuine block-specific bases (long tail per block)')
    lines.append('')
    lines.append('| Block | Unique bases after v2 decomposition |')
    lines.append('|---|---|')
    for slug, n in sorted(block_unique.items(), key=lambda kv: -kv[1])[:20]:
        lines.append(f'| `{slug}` | {n} |')
    lines.append('')
    lines.append(f'Total single-block-only bases after v2 decomposition: **{len(long_tail)}** (was 401 in v1).')
    lines.append('')

    open(out_path, 'w', encoding='utf-8', newline='\n').write('\n'.join(lines) + '\n')
    print(f'Wrote {out_path}')
    print(f'  total attr rows: {len(rows)}')
    print(f'  structurals skipped: {structurals}')
    print(f'  placeholders skipped: {skipped}')
    print(f'  distinct base slots: {len(base_to_blocks)}')
    print(f'  property suffixes seen: {len(prop_freq)}')
    print(f'  modifier suffixes seen: {len(mod_freq)}')
    print(f'  single-block long-tail: {len(long_tail)} (was 401)')
    return 0


if __name__ == '__main__':
    sys.exit(main())
