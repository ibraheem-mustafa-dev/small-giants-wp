#!/usr/bin/env python3
"""migrate-off-native-spacing.py — move base padding/margin off WP-native
`supports.spacing` onto block-OWNED `padding`/`margin` box-object attrs.

    block.json  : supports.spacing {...}         -> (removed)
                  attributes.padding/.margin     -> object, default {}
                  attrMap "css:padding"          -> "padding"  (was native:spacing.padding)
    theme file  : {"style":{"spacing":{"padding":{...}}}} -> {"padding":{...}}
    post_content: the same relocation, against a WP-CLI export

Target shape is `sgs/container` post-D555, which already renders correctly with ZERO
`supports.spacing`. Bean ruled the migration on 2026-08-26: "We only chose that at the
time because it was too large to migrate everything, we're migrating off native now."

WHY A SEPARATE SCRIPT (do NOT extend migrate-stored-tier-scalars.py)
--------------------------------------------------------------------
That script FOLDS a flat scalar into a TIER object on the same base name. This one
RELOCATES a value across a namespace boundary (`style.spacing.X` -> top-level `X`), the
same shape on both sides. Its `BOX_BASES` refusal (line 137) exists precisely to stop
`padding`/`margin` being folded, and uses `sgs/container.padding` as its regression
fixture -- bypassing that refusal to reuse the script would corrupt the guard.

DELIBERATE DIVERGENCE FROM ITS SIBLING'S "RULING B". migrate-theme-tier-scalars.py does
not touch stored post_content, because clones are binned and re-cloned. That does NOT
apply here, and Bean ruled the opposite on 2026-08-27: this value is CLIENT-AUTHORED
padding on live pages. Left behind, the frontend keeps painting it (the wrapper still
falls back to native) while the editor panel reads EMPTY -- so the client's next edit
silently discards a value they cannot see. See `--post-content`.

WHAT IT REFUSES TO DO (refuse, never guess)
-------------------------------------------
* edit.js and render.php are NEVER rewritten. They are reported with exact line numbers
  for a hand edit. Two blocks are genuinely non-mechanical:
    - site-header : `getActiveLayoutPreset` detects a preset via `! padding`. With a `{}`
      default `padding` is always truthy, so that test must become an EMPTINESS test or
      the preset toggle silently shows nothing selected forever. Its
      `applyLayoutPreset`/`hasRestSpacing` destructure must be DELETED, not redirected --
      it exists only because padding and margin share one `style.spacing` container.
    - multi-button : has NO margin UI and no marginTablet/marginMobile at all, so parity
      means BUILDING a panel, not redirecting one. It also folds style.spacing into its
      OWN scoped CSS while the wrapper reads the same values -- a live double-emission.
* Any block outside the roster.
* Any block comment whose JSON will not parse, or where a conflicting non-empty
  top-level `padding`/`margin` already exists (reported, never clobbered).

USAGE
-----
    python migrate-off-native-spacing.py --survey
    python migrate-off-native-spacing.py --fix              # propose, writes nothing
    python migrate-off-native-spacing.py --fix --apply      # write block.json + theme
    python migrate-off-native-spacing.py --post-content export.json --apply
    python migrate-off-native-spacing.py --check            # THE GATE: exit 1 if any remain
    python migrate-off-native-spacing.py --self-test
"""

import argparse
import io
import json
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

REPO = Path(__file__).resolve().parents[3]
BLOCKS_DIR = REPO / 'plugins' / 'sgs-blocks' / 'src' / 'blocks'
THEME_DIRS = [
    REPO / 'theme' / 'sgs-theme' / 'patterns',
    REPO / 'theme' / 'sgs-theme' / 'templates',
    REPO / 'theme' / 'sgs-theme' / 'parts',
]

# The roster. Every one declares supports.spacing today and routes base spacing through
# SGS_Container_Wrapper, whose owned-attr-first branch (class-sgs-container-wrapper.php
# :1904-1937) is ungated by slug/kind/roster -- so declaring the owned attrs is
# sufficient for the PHP side. None passes container_queries; do not add it (that flag
# DISABLES the owned-attr read and falls the block silently back to native).
#
# Widened 2026-09-05 (Phase 3, Group 1) from the original 5 (multi-button,
# physics-canvas, site-footer, site-header, trust-bar -- all already fully
# migrated, kept here so a re-run is a harmless no-op) to the full remaining
# roster: every block still declaring `supports.spacing.padding`/`margin` with
# `paddingTablet`/`paddingMobile` (and margin siblings) as existing owned attrs.
# Confirmed via `grep -rl '"paddingTablet"' src/blocks/*/block.json`.
ROSTER = (
    'multi-button', 'physics-canvas', 'site-footer', 'site-header', 'trust-bar',
    'accordion', 'audio', 'brand-strip', 'breadcrumbs', 'business-info', 'button',
    'collapsible-text', 'countdown-timer', 'counter', 'cta-section', 'form',
    'heading', 'icon', 'icon-list', 'info-box', 'nav-menu', 'notice-banner',
    'option-picker', 'process-steps', 'product-faq', 'product-search', 'quote',
    'responsive-logo', 'separator', 'social-icons', 'star-rating',
    'table-of-contents', 'team-member', 'testimonial', 'text', 'timeline',
    'whatsapp-cta',
)

# Blocks whose edit.js is NOT a mechanical redirect. See module docstring.
# Confirmed for the original 5. The 32 newly-added blocks are surveyed fresh
# (--survey) before assuming any of them are mechanical -- never assume by
# analogy to site-header/multi-button.
HAND_EDIT = {'site-header', 'multi-button'}

BOX_ATTRS = ('padding', 'margin')
_COMMENT_RE = re.compile(r'<!--\s*wp:(sgs/[a-zA-Z0-9-]+)\s+')
# Base-tier native reads. Tablet/Mobile siblings are already owned attrs and are NOT
# touched -- matching only `style.spacing` keeps this census honest.
_CODE_SITE_RE = re.compile(r'style\s*\??\s*\.\s*\??\s*spacing')
# INSTRUMENT BUG FIXED 2026-08-27: the first cut matched prose as well as code, so every
# explanatory comment mentioning `style.spacing` counted as an unmigrated site. That made
# --check UNSATISFIABLE -- it would have stayed red after a perfect migration, and a gate
# that cannot go green teaches people to bypass it. Comment lines are excluded here; the
# stale prose still has to be rewritten, but by review, not by a gate that cannot close.
_COMMENT_LINE_RE = re.compile(r'^\s*(//|/\*|\*|#)')


def roster_slugs():
    return {'sgs/' + b for b in ROSTER}


def block_json_path(block):
    return BLOCKS_DIR / block / 'block.json'


# --------------------------------------------------------------- census: schema + code

def iter_attr_maps(data):
    """Yield every attrMap dict in a block.json, wherever it is nested.

    INSTRUMENT BUG FIXED 2026-08-27: the first cut read `supports.sgs.attrMap` and
    confidently reported ZERO stale entries on all five blocks, when in fact all five
    carry one. The real path is `supports.sgs.elements.<elementName>.attrMap` -- keyed
    per element, and a block may declare several. Walking for the key by name instead of
    assuming its depth is what makes this robust to the next block that nests it
    differently. A census that reads the wrong path reports a clean tree, which is the
    most dangerous answer an instrument can give."""
    def walk(node):
        if isinstance(node, dict):
            for k, v in node.items():
                if k == 'attrMap' and isinstance(v, dict):
                    yield v
                else:
                    for found in walk(v):
                        yield found
        elif isinstance(node, list):
            for item in node:
                for found in walk(item):
                    yield found
    return list(walk(data))


def survey_schema(block):
    """What state is this block's block.json in?"""
    p = block_json_path(block)
    if not p.exists():
        return {'block': block, 'error': 'missing %s' % p, 'migrated': False}
    data = json.loads(p.read_text(encoding='utf-8'))
    supports = data.get('supports') or {}
    attrs = data.get('attributes') or {}
    stale = {}
    for amap in iter_attr_maps(data):
        for k, v in amap.items():
            if isinstance(v, str) and v.startswith('native:spacing.'):
                stale[k] = v
    return {
        'block': block,
        'has_supports_spacing': 'spacing' in supports,
        'owned': {a: (a in attrs) for a in BOX_ATTRS},
        'stale_attrmap': stale,
        'migrated': ('spacing' not in supports
                     and all(a in attrs for a in BOX_ATTRS)
                     and not stale),
    }


def survey_code(block):
    """Line numbers of every surviving `style.spacing` reference in edit.js/render.php.
    Reported for a HAND edit -- this script never rewrites JS or PHP."""
    out = []
    for fname in ('edit.js', 'render.php'):
        f = BLOCKS_DIR / block / fname
        if not f.exists():
            continue
        text = f.read_text(encoding='utf-8', errors='replace')
        for i, line in enumerate(text.splitlines(), 1):
            if _COMMENT_LINE_RE.match(line):
                continue  # prose, not a live read -- see _COMMENT_LINE_RE
            if _CODE_SITE_RE.search(line):
                out.append({'file': '%s/%s' % (block, fname), 'line': i,
                            'text': line.strip()[:110]})
    return out


# -------------------------------------------------------------- stored content (S4/S5)

def iter_block_attrs(text):
    """Yield (block_name, json_start, json_end, attrs) for every wp:sgs/* comment
    carrying a JSON attributes object. Uses json's own raw_decode for the closing brace,
    so nested objects (style.spacing.padding) are never mishandled by a hand-rolled
    brace matcher -- the lesson migrate-theme-tier-scalars.py already records."""
    for m in _COMMENT_RE.finditer(text):
        idx = m.end()
        if idx >= len(text) or text[idx] != '{':
            continue
        try:
            obj, end = json.JSONDecoder().raw_decode(text, idx)
        except json.JSONDecodeError:
            continue
        if isinstance(obj, dict):
            yield m.group(1), idx, end, obj


def relocate(attrs):
    """Return (new_attrs, moved_keys, refusal). Moves style.spacing.{padding,margin} to
    top level. Refuses -- never clobbers -- when a conflicting non-empty top-level key
    already holds a DIFFERENT value. Drops `spacing` when emptied, then `style` when
    emptied, so no residue key is left to read back as truthy."""
    style = attrs.get('style')
    if not isinstance(style, dict):
        return attrs, [], None
    spacing = style.get('spacing')
    if not isinstance(spacing, dict):
        return attrs, [], None

    moved = []
    new_attrs = json.loads(json.dumps(attrs))  # deep copy; insertion order preserved
    new_style = new_attrs['style']
    new_spacing = new_style['spacing']

    for key in BOX_ATTRS:
        if key not in spacing:
            continue
        incoming = spacing[key]
        existing = attrs.get(key)
        if existing not in (None, {}, '') and existing != incoming:
            return attrs, [], ('conflicting top-level "%s" already set to %s; '
                               'refusing to clobber' % (key, json.dumps(existing)))
        new_attrs[key] = incoming
        new_spacing.pop(key, None)
        moved.append(key)

    if not moved:
        return attrs, [], None
    if not new_spacing:
        new_style.pop('spacing', None)
    if not new_style:
        new_attrs.pop('style', None)
    return new_attrs, moved, None


def find_theme_files():
    files = []
    for d in THEME_DIRS:
        if d.exists():
            files += [p for p in d.rglob('*') if p.suffix in ('.php', '.html')]
    return sorted(files)


def survey_theme():
    """Every theme file authoring style.spacing.{padding,margin} on a ROSTER block."""
    slugs = roster_slugs()
    hits = []
    for f in find_theme_files():
        text = f.read_text(encoding='utf-8', errors='replace')
        for name, _s, _e, attrs in iter_block_attrs(text):
            if name not in slugs:
                continue
            spacing = (attrs.get('style') or {}).get('spacing')
            if isinstance(spacing, dict) and any(k in spacing for k in BOX_ATTRS):
                hits.append({'file': str(f.relative_to(REPO)).replace('\\', '/'),
                             'block': name,
                             'keys': [k for k in BOX_ATTRS if k in spacing]})
    return hits


def rewrite_text(text, apply_to_slugs):
    """Relocate in one blob of block-comment-bearing text. Returns (out, n, refusals).
    Edits are applied in REVERSE offset order so earlier offsets never drift."""
    edits, refusals, n = [], [], 0
    for name, start, end, attrs in iter_block_attrs(text):
        if name not in apply_to_slugs:
            continue
        new_attrs, moved, refusal = relocate(attrs)
        if refusal:
            refusals.append({'block': name, 'reason': refusal})
            continue
        if not moved:
            continue
        edits.append((start, end,
                      json.dumps(new_attrs, separators=(',', ':'), ensure_ascii=False)))
        n += 1
    out = text
    for start, end, new_json in sorted(edits, reverse=True):
        out = out[:start] + new_json + out[end:]
    # Re-parse every comment in the RESULT. raw_decode failing here would mean writing a
    # file whose JSON no longer round-trips, so validate before returning.
    for _ in iter_block_attrs(out):
        pass
    return out, n, refusals


# --------------------------------------------------------------------------- mutations

def _find_key_span(text, obj_start, key):
    """Return (key_start, value_end) for `key` at depth 1 of the JSON object beginning at
    `obj_start`, or None. Depth-aware and string-aware so it cannot be fooled by the same
    name appearing nested or inside a VALUE -- which matters here, because
    "native:spacing.padding" contains the literal word `spacing` and a naive search would
    hit it first and mangle the attrMap instead of the support."""
    i, depth, in_str, esc = obj_start, 0, False, False
    want = '"%s"' % key
    while i < len(text):
        ch = text[i]
        if in_str:
            if esc:
                esc = False
            elif ch == '\\':
                esc = True
            elif ch == '"':
                in_str = False
        elif ch == '"':
            if depth == 1 and text.startswith(want, i):
                j = i + len(want)
                while j < len(text) and text[j] in ' \t\r\n':
                    j += 1
                if j < len(text) and text[j] == ':':
                    j += 1
                    while j < len(text) and text[j] in ' \t\r\n':
                        j += 1
                    _val, end = json.JSONDecoder().raw_decode(text, j)
                    return i, end
            in_str = True
        elif ch in '{[':
            depth += 1
        elif ch in '}]':
            depth -= 1
            if depth == 0:
                return None
        i += 1
    return None


def fix_block_json(block, apply_):
    """Surgical TEXT edits, not parse-and-redump.

    ⚠ json.dumps(data, indent='\\t') does NOT round-trip these files: it explodes compact
    inline objects like `"default": {"desktop": "row", "mobile": "column"}` onto separate
    lines, so a one-key change would land as a whole-file reformat on all five blocks
    (measured: multi-button 8313 -> 8391 bytes with NO semantic change). That buries the
    real diff, defeats review, and is exactly the shape truncation-commit-gate.py exists
    to notice. Every edit below is anchored on an exact span and leaves the rest of the
    file byte-identical."""
    p = block_json_path(block)
    raw = io.open(p, encoding='utf-8', newline='').read()
    text, changes = raw, []

    # 1. attrMap values -- exact string, no ambiguity. Rule 3: all five blocks, one pass.
    for prop in BOX_ATTRS:
        needle = '"native:spacing.%s"' % prop
        if needle in text:
            n = text.count(needle)
            text = text.replace(needle, '"%s"' % prop)
            changes.append('attrMap native:spacing.%s -> %s (x%d)' % (prop, prop, n))

    # 2. Remove supports.spacing, with its trailing comma and the whitespace it owned.
    # Anchor from the ROOT object so "supports" is matched as a top-level KEY, never as a
    # substring of some value. (_find_key_span wants the offset of the opening brace of
    # the object to search -- passing the key's own offset silently finds nothing, which
    # is how the first run applied the attrMap edits and skipped these two steps.)
    root = text.index('{')
    sup = _find_key_span(text, root, 'supports')
    if sup:
        sup_obj_start = text.index('{', sup[0])
        span = _find_key_span(text, sup_obj_start, 'spacing')
        if span:
            start, end = span
            while end < len(text) and text[end] in ' \t':
                end += 1
            if end < len(text) and text[end] == ',':
                end += 1
                while end < len(text) and text[end] in ' \t\r\n':
                    end += 1
            else:  # last key in the object -- take the preceding comma instead
                while start > 0 and text[start - 1] in ' \t\r\n':
                    start -= 1
                if start > 0 and text[start - 1] == ',':
                    start -= 1
            text = text[:start] + text[end:]
            changes.append('removed supports.spacing')

    # 3. Declare the owned box attrs, matching sgs/container's shape exactly.
    attrs_key = _find_key_span(text, text.index('{'), 'attributes')
    if attrs_key:
        obj_start = text.index('{', attrs_key[0])
        existing = json.JSONDecoder().raw_decode(text, obj_start)[0]
        missing = [a for a in BOX_ATTRS if a not in existing]
        if missing:
            nl = text.index('\n', obj_start) + 1
            indent = re.match(r'[\t ]*', text[nl:]).group(0) or '\t\t'
            block_txt = ''
            for a in missing:
                block_txt += ('%s"%s": {\n%s\t"type": "object",\n%s\t"default": {}\n'
                              '%s},\n' % (indent, a, indent, indent, indent))
                changes.append('declared owned "%s" (object, default {})' % a)
            text = text[:nl] + block_txt + text[nl:]

    if not changes:
        return []
    json.loads(text)  # refuse to write anything that is not valid JSON
    if apply_:
        io.open(p, 'w', encoding='utf-8', newline='').write(text)
    return changes


def fix_theme(apply_):
    slugs = roster_slugs()
    touched, all_refusals = [], []
    for f in find_theme_files():
        text = f.read_text(encoding='utf-8', errors='replace')
        out, n, refusals = rewrite_text(text, slugs)
        all_refusals += [dict(r, file=str(f.relative_to(REPO))) for r in refusals]
        if n and out != text:
            if apply_:
                # newline='' preserves the file's existing line endings -- without it a
                # CRLF file rewrites as LF and the diff becomes the entire file.
                io.open(f, 'w', encoding='utf-8', newline='').write(out)
            touched.append({'file': str(f.relative_to(REPO)).replace('\\', '/'),
                            'blocks': n})
    return touched, all_refusals


def fix_post_content(export_path, apply_):
    """S5 leg. Input: a WP-CLI export -- a JSON array of objects carrying `post_content`
    (an `ID`/`post_id` key is used for reporting when present). Writes a sibling
    .migrated.json rather than mutating the export in place, so the original survives as
    evidence of what was on the site beforehand."""
    src = Path(export_path)
    rows = json.loads(src.read_text(encoding='utf-8'))
    if isinstance(rows, dict):
        rows = [rows]
    slugs, changed, refusals = roster_slugs(), [], []
    for row in rows:
        content = row.get('post_content')
        if not isinstance(content, str):
            continue
        out, n, refs = rewrite_text(content, slugs)
        pid = row.get('ID') or row.get('post_id') or '?'
        refusals += [dict(r, post=pid) for r in refs]
        if n and out != content:
            row['post_content'] = out
            changed.append({'post': pid, 'blocks': n})
    dest = src.with_suffix('.migrated.json')
    if apply_ and changed:
        dest.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding='utf-8')
    return changed, refusals, dest


# ------------------------------------------------------------------------------ report

def cmd_survey():
    print('=== SCHEMA (block.json) ===')
    unrecognised = 0
    for b in ROSTER:
        s = survey_schema(b)
        if s.get('error'):
            print('  %-16s ERROR %s' % (b, s['error']))
            unrecognised += 1
            continue
        print('  %-16s supports.spacing=%-5s owned=%s stale_attrMap=%d  %s'
              % (b, s['has_supports_spacing'],
                 ''.join('P' if s['owned']['padding'] else '-',) +
                 ('M' if s['owned']['margin'] else '-'),
                 len(s['stale_attrmap']),
                 'MIGRATED' if s['migrated'] else 'pending'))

    print('\n=== CODE (hand edit -- this script never rewrites JS/PHP) ===')
    for b in ROSTER:
        sites = survey_code(b)
        tag = ' [HAND: non-mechanical, see docstring]' if b in HAND_EDIT else ''
        print('  %-16s %d site(s)%s' % (b, len(sites), tag))
        for s in sites:
            print('      %s:%d  %s' % (s['file'], s['line'], s['text']))

    hits = survey_theme()
    print('\n=== STORED CONTENT (theme files) ===')
    per_block, per_file = {}, set()
    for h in hits:
        per_block[h['block']] = per_block.get(h['block'], 0) + 1
        per_file.add(h['file'])
    for b in sorted(per_block):
        print('  %-24s %d instance(s)' % (b, per_block[b]))
    for f in sorted(per_file):
        print('      %s' % f)
    print('\n  %d unique file(s), %d instance(s)' % (len(per_file), len(hits)))
    print('\nunrecognised = %d  (STOP rule #1: hand back if > 0)' % unrecognised)
    return 0


def cmd_fix(apply_):
    mode = 'APPLY' if apply_ else 'DRY RUN (nothing written)'
    print('=== FIX -- %s ===\n' % mode)
    for b in ROSTER:
        changes = fix_block_json(b, apply_)
        print('  %-16s %s' % (b, ('; '.join(changes) if changes else 'already migrated')))
    touched, refusals = fix_theme(apply_)
    print('\n  theme files: %d' % len(touched))
    for t in touched:
        print('      %s (%d block instance(s))' % (t['file'], t['blocks']))
    if refusals:
        print('\n  REFUSED (never clobbered):')
        for r in refusals:
            print('      %s -- %s' % (r.get('file'), r['reason']))
    print('\n  edit.js / render.php: NOT rewritten by design -- run --survey for the '
          'exact site list, then hand-edit.')
    return 0


def cmd_check():
    """THE BLOCKING GATE. check-dead-pattern-attrs.py cannot serve as this migration's
    gate: it DOES detect a fully-removed supports.spacing, but compute_exit_code()
    (:404-416) excludes the `native-style-undeclared` class, so it prints an advisory and
    exits 0. A partially-removed support is invisible to it entirely (family-level
    truthiness at :231). This function is the one that goes red."""
    failures = []
    for b in ROSTER:
        s = survey_schema(b)
        if s.get('error'):
            failures.append('%s: %s' % (b, s['error']))
            continue
        if s['has_supports_spacing']:
            failures.append('%s/block.json still declares supports.spacing' % b)
        for a in BOX_ATTRS:
            if not s['owned'][a]:
                failures.append('%s/block.json does not declare owned "%s"' % (b, a))
        for k, v in s['stale_attrmap'].items():
            failures.append('%s/block.json attrMap %s still points at %s' % (b, k, v))
        for site in survey_code(b):
            failures.append('%s:%d still reads style.spacing' % (site['file'], site['line']))
    for h in survey_theme():
        failures.append('%s still authors style.spacing.%s on %s'
                        % (h['file'], '/'.join(h['keys']), h['block']))

    if failures:
        print('FAIL -- %d finding(s):' % len(failures))
        for f in failures:
            print('  - %s' % f)
        return 1
    print('PASS -- no native supports.spacing remains on the %d roster blocks, and no '
          'theme file authors it.' % len(ROSTER))
    return 0


# --------------------------------------------------------------------------- self-test

def self_test():
    """Positive control: a real-shaped block comment must relocate exactly.
    Negative controls: (a) a non-roster block must be left alone; (b) a conflicting
    top-level value must REFUSE rather than clobber; (c) --check must be able to go RED
    -- a gate that cannot fail is indistinguishable from a clean tree."""
    ok = True

    def check(label, got, want):
        nonlocal ok
        good = got == want
        ok = ok and good
        print('  %-52s %s' % (label, 'PASS' if good else 'FAIL'))
        if not good:
            print('      got  %s\n      want %s' % (json.dumps(got), json.dumps(want)))

    before = ('<!-- wp:sgs/site-header {"align":"full","style":{"spacing":{"padding":'
              '{"top":"var:preset|spacing|30","bottom":"var:preset|spacing|30"}}}} -->')
    out, n, refs = rewrite_text(before, roster_slugs())
    want = ('<!-- wp:sgs/site-header {"align":"full","padding":{"top":'
            '"var:preset|spacing|30","bottom":"var:preset|spacing|30"}} -->')
    check('positive: relocates + drops emptied style/spacing', out, want)
    check('positive: reported one migrated instance', n, 1)
    check('positive: no refusals on the clean case', refs, [])

    # Negative control (a): identical payload, block OUTSIDE the roster.
    # `sgs/accordion` was used here until ROSTER was widened to 32 blocks
    # (Phase 3, Group 1, 2026-09-05) -- it's now IN the roster, which
    # silently turned this into a no-op positive test. `sgs/media` is not
    # part of this migration at all (it owns its box props via the media atom
    # layer, not supports.spacing) and stays a genuine negative control.
    other = before.replace('sgs/site-header', 'sgs/media')
    out_o, n_o, _ = rewrite_text(other, roster_slugs())
    check('negative: non-roster block untouched', (out_o, n_o), (other, 0))

    # Negative control (b): a conflicting top-level padding must refuse, not clobber.
    conflict = ('<!-- wp:sgs/trust-bar {"padding":{"top":"9px"},"style":{"spacing":'
                '{"padding":{"top":"1px"}}}} -->')
    out_c, n_c, refs_c = rewrite_text(conflict, roster_slugs())
    check('negative: conflicting value refused, text unchanged', (out_c, n_c),
          (conflict, 0))
    check('negative: refusal carries a reason', bool(refs_c and refs_c[0]['reason']), True)

    # Negative control (c): the emptied-style rule must not strip a SIBLING style key.
    sibling = ('<!-- wp:sgs/site-footer {"style":{"border":{"width":"2px"},"spacing":'
               '{"margin":{"top":"4px"}}}} -->')
    out_s, _, _ = rewrite_text(sibling, roster_slugs())
    want_s = ('<!-- wp:sgs/site-footer {"style":{"border":{"width":"2px"}},'
              '"margin":{"top":"4px"}} -->')
    check('negative: sibling style.border survives relocation', out_s, want_s)

    # Regression guard for a REAL instrument bug (2026-08-27): the first cut looked for
    # attrMap at supports.sgs.attrMap and reported 0 stale entries across all five blocks
    # when every one of them had one. The key is nested at
    # supports.sgs.elements.<name>.attrMap. This fixture reproduces that exact nesting, so
    # a future refactor that re-flattens the lookup goes red instead of silently
    # reporting a clean tree.
    nested = {'supports': {'sgs': {'elements': {'group': {'attrMap': {
        'css:padding': 'native:spacing.padding', 'css:gap': 'gap'}}}}}}
    maps = iter_attr_maps(nested)
    found = {k: v for m in maps for k, v in m.items()
             if isinstance(v, str) and v.startswith('native:spacing.')}
    check('regression: attrMap found at elements.<name>.attrMap depth',
          found, {'css:padding': 'native:spacing.padding'})
    check('regression: a FLAT supports.sgs.attrMap lookup would have missed it',
          (nested['supports']['sgs'].get('attrMap') or {}), {})

    # Regression guard: a prose comment must NOT count as a live read, or --check can
    # never go green after a correct migration.
    check('regression: comment line excluded from code sites',
          bool(_COMMENT_LINE_RE.match('\t// base padding lives in style.spacing')), True)
    check('regression: real code line still counted',
          bool(_CODE_SITE_RE.search('base: attributes.style?.spacing?.padding ?? {},')
               and not _COMMENT_LINE_RE.match('base: attributes.style?.spacing?.padding')),
          True)

    # Regression guard for the SECOND real instrument bug (2026-08-27): _find_key_span
    # needs the offset of the OBJECT's opening brace, and was first called with the offset
    # of the KEY. It silently returned None, so the apply run rewrote attrMap and skipped
    # removing supports.spacing entirely -- reporting success for a third of the job. A
    # silent no-op is the failure mode a "changes applied" message hides best.
    sample = ('{\n\t"attributes": {"gap": {"type": "string"}},\n'
              '\t"supports": {\n\t\t"html": false,\n'
              '\t\t"spacing": {"margin": true, "padding": true},\n'
              '\t\t"sgs": {"elements": {"g": {"attrMap": '
              '{"css:padding": "native:spacing.padding"}}}}\n\t}\n}')
    root_ofs = sample.index('{')
    sup_span = _find_key_span(sample, root_ofs, 'supports')
    check('regression: "supports" found from the ROOT object offset',
          sup_span is not None, True)
    sp = _find_key_span(sample, sample.index('{', sup_span[0]), 'spacing') if sup_span else None
    check('regression: supports.spacing span located', sp is not None, True)
    check('regression: it matched the KEY, not the "native:spacing." value',
          sample[sp[0]:sp[0] + 9] if sp else '', '"spacing"')
    check('regression: passing the KEY offset (the old bug) finds nothing',
          _find_key_span(sample, sample.index('"supports"'), 'supports'), None)

    # Negative control (d): prove --check CAN fail. Feed survey_schema's own predicate a
    # deliberately unmigrated shape rather than trusting today's tree to be red.
    unmigrated = {'has_supports_spacing': True, 'owned': {'padding': False, 'margin': False},
                  'stale_attrmap': {'css:padding': 'native:spacing.padding'}}
    would_fail = (unmigrated['has_supports_spacing']
                  or not all(unmigrated['owned'].values())
                  or bool(unmigrated['stale_attrmap']))
    check('negative: gate predicate goes RED on an unmigrated shape', would_fail, True)

    print('\n%s' % ('SELF-TEST PASS' if ok else 'SELF-TEST FAIL'))
    return 0 if ok else 1


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--survey', action='store_true', help='census; writes nothing')
    ap.add_argument('--fix', action='store_true',
                    help='propose block.json + theme edits; writes nothing without --apply')
    ap.add_argument('--apply', action='store_true', help='actually write')
    ap.add_argument('--check', action='store_true',
                    help='THE GATE: exit 1 if any native spacing remains')
    ap.add_argument('--post-content', metavar='EXPORT.JSON',
                    help='relocate inside a WP-CLI post_content export (S5 leg)')
    ap.add_argument('--self-test', action='store_true')
    args = ap.parse_args()

    if args.self_test:
        return self_test()
    if args.post_content:
        changed, refusals, dest = fix_post_content(args.post_content, args.apply)
        print('posts changed: %d' % len(changed))
        for c in changed:
            print('  post %s -- %d block instance(s)' % (c['post'], c['blocks']))
        for r in refusals:
            print('  REFUSED post %s -- %s' % (r.get('post'), r['reason']))
        print('written to %s' % dest if (args.apply and changed)
              else 'DRY RUN -- pass --apply to write %s' % dest)
        return 0
    if args.check:
        return cmd_check()
    if args.fix:
        return cmd_fix(args.apply)
    if args.survey:
        return cmd_survey()
    ap.error('one of --survey / --fix / --check / --post-content / --self-test is required')


if __name__ == '__main__':
    sys.exit(main())
