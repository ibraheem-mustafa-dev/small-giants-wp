"""Audit block.json attribute names across all 65 SGS blocks.

Strips property + breakpoint suffixes to expose the BASE WORD per slot
(e.g. `headlineFontSizeMobile` -> base `headline`). Clusters base words
across blocks to surface synonym candidates — different words used by
different blocks for what looks like the same semantic slot.

Output:
  reports/attr-vocabulary-audit-<date>.md  — human-readable report
"""
from __future__ import annotations
import json, os, re, sqlite3, sys
from collections import defaultdict, Counter

DB = os.path.expanduser('~/.claude/skills/sgs-wp-engine/sgs-framework.db')
PROJECT = os.path.expanduser('~/Projects/small-giants-wp')
REPORT_DIR = os.path.join(PROJECT, 'reports')

# Suffixes that mean "property of the base slot", not the slot itself
PROPERTY_SUFFIXES = [
    # Order matters — longest-most-specific FIRST
    'BackgroundColour', 'BackgroundColor', 'BorderColour', 'BorderColor',
    'HoverBackground', 'HoverColour', 'HoverColor', 'HoverBorder',
    'TextColour', 'TextColor',
    'FontFamily', 'FontSize', 'FontWeight',
    'LineHeight', 'LetterSpacing',
    'TextTransform', 'TextDecoration', 'TextAlign',
    'BorderRadius', 'BorderWidth', 'BorderStyle', 'BoxShadow',
    'PaddingTop', 'PaddingRight', 'PaddingBottom', 'PaddingLeft',
    'MarginTop', 'MarginRight', 'MarginBottom', 'MarginLeft',
    'Padding', 'Margin', 'Gap',
    'MinHeight', 'MaxWidth', 'MaxHeight', 'MinWidth',
    'AspectRatio', 'ObjectFit', 'ObjectPosition',
    'Background', 'Foreground',
    'Colour', 'Color',
    'Opacity',
    'Width', 'Height',
    'Url', 'Href', 'Link',
    'Style', 'Variant', 'Layout', 'Alignment',
    'Shadow', 'Stroke',
    'Unit',
    'Required', 'Placeholder', 'HelpText', 'ErrorMessage',
]

BREAKPOINT_SUFFIXES = ('Mobile', 'Tablet', 'Desktop')

# Boolean / structural prefixes (NOT slot-bearing words — strip from base computation)
BOOL_PREFIXES = ('is', 'has', 'show', 'hide', 'enable', 'disable', 'allow', 'auto')


def strip_breakpoint(name: str) -> str:
    for bp in BREAKPOINT_SUFFIXES:
        if name.endswith(bp):
            return name[:-len(bp)]
    return name


def strip_property_suffix(name: str) -> str:
    base = strip_breakpoint(name)
    for suf in sorted(PROPERTY_SUFFIXES, key=len, reverse=True):
        if base.endswith(suf) and base != suf:
            base = base[:-len(suf)]
            return base
    return base


def is_structural(name: str) -> bool:
    """Booleans + structural attrs that aren't content slots."""
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
    base_to_attrs:  dict[str, set[str]] = defaultdict(set)
    block_to_bases: dict[str, set[str]] = defaultdict(set)

    for slug, attr in rows:
        if is_structural(attr):
            continue
        if attr.startswith('_'):  # _comment_ placeholders
            continue
        base = strip_property_suffix(attr)
        if not base or not base[0].islower():
            continue
        # Lower the first char so case isn't a confound
        base_norm = base[0].lower() + base[1:]
        base_to_blocks[base_norm].add(slug)
        base_to_attrs[base_norm].add(attr)
        block_to_bases[slug].add(base_norm)

    # Bin bases by frequency (how many blocks use this base word)
    by_freq = sorted(base_to_blocks.items(), key=lambda kv: -len(kv[1]))

    # Heuristic synonym clusters — words likely meaning the same thing
    SEMANTIC_CLUSTERS = {
        'text content (paragraph)':   ['text', 'body', 'description', 'content', 'paragraph', 'copy', 'caption'],
        'primary heading':            ['headline', 'heading', 'title', 'name'],
        'secondary heading':          ['subHeadline', 'subheading', 'subTitle', 'subtitle', 'sub', 'lede'],
        'small label / pre-heading':  ['label', 'tag', 'eyebrow', 'kicker', 'pretitle'],
        'primary image':              ['image', 'media', 'photo', 'picture'],
        'background image':           ['backgroundImage', 'bgImage', 'heroImage'],
        'avatar / portrait':          ['avatar', 'portrait', 'profile', 'authorImage'],
        'icon':                       ['icon', 'symbol', 'glyph'],
        'primary CTA':                ['cta', 'ctaPrimary', 'button', 'buttonPrimary', 'primaryCta', 'primaryButton'],
        'secondary CTA':              ['ctaSecondary', 'buttonSecondary', 'secondaryCta', 'secondaryButton'],
        'list of items':              ['items', 'features', 'badges', 'list', 'options'],
        'card / tile':                ['card', 'cards', 'tile', 'tiles', 'panel'],
        'date':                       ['date', 'datetime', 'time', 'year', 'timestamp'],
        'price':                      ['price', 'cost', 'amount', 'pricing'],
        'rating / stars':             ['rating', 'stars', 'score', 'review'],
        'author / person':            ['author', 'person', 'speaker', 'member'],
        'link / URL':                 ['link', 'url', 'href', 'anchor'],
        'video':                      ['video', 'videoUrl', 'embed'],
        'placeholder text':           ['placeholder', 'hint'],
        'help text':                  ['helpText', 'help', 'hint', 'guidance'],
    }

    # Find which clusters have actual drift (2+ different base words used across blocks)
    cluster_findings: list[dict] = []
    for concept, synonyms in SEMANTIC_CLUSTERS.items():
        present_bases = [b for b in synonyms if b in base_to_blocks]
        if len(present_bases) >= 2:
            # Drift detected
            details = []
            for b in present_bases:
                blocks = sorted(base_to_blocks[b])
                details.append({
                    'base_word': b,
                    'used_by_blocks': blocks,
                    'block_count': len(blocks),
                    'sample_attrs': sorted(base_to_attrs[b])[:5],
                })
            cluster_findings.append({
                'concept': concept,
                'drift_count': len(present_bases),
                'details': details,
            })

    # Sort findings by drift severity (number of competing synonyms × blocks affected)
    cluster_findings.sort(key=lambda f: -sum(d['block_count'] for d in f['details']))

    # Write report
    os.makedirs(REPORT_DIR, exist_ok=True)
    today = '2026-05-12'
    out_path = os.path.join(REPORT_DIR, f'attr-vocabulary-audit-{today}.md')

    lines = []
    lines.append(f'# SGS block.json attribute vocabulary audit — {today}')
    lines.append('')
    lines.append(f'Scanned **{len(rows)}** attribute rows across **{len(block_to_bases)}** SGS blocks. ')
    lines.append(f'Stripped property + breakpoint suffixes to expose base slot words.')
    lines.append(f'**{len(base_to_blocks)}** distinct base words found.')
    lines.append('')
    lines.append('## 1. Drift findings — synonym clusters in use today')
    lines.append('')
    lines.append('Concepts where 2+ different base words are used across blocks for what is plausibly the same semantic slot. Each row is a candidate for the synonym table.')
    lines.append('')
    for f in cluster_findings:
        lines.append(f'### {f["concept"]} ({f["drift_count"]} competing words)')
        lines.append('')
        lines.append('| Base word | Blocks using it | Sample attribute names |')
        lines.append('|---|---|---|')
        for d in f['details']:
            blocks_short = ', '.join(s.replace('sgs/', '') for s in d['used_by_blocks'][:6])
            if len(d['used_by_blocks']) > 6:
                blocks_short += f' ... (+{len(d["used_by_blocks"])-6} more)'
            samples = ', '.join(f'`{a}`' for a in d['sample_attrs'])
            lines.append(f'| `{d["base_word"]}` | **{d["block_count"]}** — {blocks_short} | {samples} |')
        lines.append('')
    lines.append('## 2. Top base words by block coverage')
    lines.append('')
    lines.append('Base words used in 3+ blocks. Anything here is a candidate slot identifier.')
    lines.append('')
    lines.append('| Base word | Blocks | Sample attrs |')
    lines.append('|---|---|---|')
    for base, blocks in by_freq[:50]:
        if len(blocks) >= 3:
            samples = sorted(base_to_attrs[base])[:4]
            lines.append(f'| `{base}` | {len(blocks)} | {", ".join("`"+a+"`" for a in samples)} |')
    lines.append('')
    lines.append('## 3. Long tail — base words used in only 1 block')
    lines.append('')
    lines.append('These are block-specific custom slots. Most are legitimate (e.g. `splitColumnRatio` is genuinely hero-only). A few might be drift candidates that didn\'t cluster.')
    lines.append('')
    long_tail = [(b, len(blks)) for b, blks in by_freq if len(blks) == 1]
    lines.append(f'**{len(long_tail)}** base words used by exactly one block.')
    lines.append('')
    open(out_path, 'w', encoding='utf-8', newline='\n').write('\n'.join(lines) + '\n')
    print(f'Wrote {out_path}')
    print(f'  total attr rows scanned: {len(rows)}')
    print(f'  distinct base words: {len(base_to_blocks)}')
    print(f'  drift clusters surfaced: {len(cluster_findings)}')
    print(f'  base words in 3+ blocks: {sum(1 for _, bs in by_freq if len(bs) >= 3)}')
    print(f'  long-tail single-block bases: {len(long_tail)}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
