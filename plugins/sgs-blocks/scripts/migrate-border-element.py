#!/usr/bin/env python3
"""Border-element census: HOW each block's PHP glues its border CSS together today.

Every render.php hand-builds its border CSS from shared helpers (sgs_border_box_decls,
sgs_border_states_css, sgs_border_gradient_css, sgs_border_radius_tiers, the corner helpers,
wp_style_engine_get_styles ...) plus literal declarations. This script reads each PHP file that
prints border CSS, splits it into bordered ELEMENTS (grouped by attribute prefix: borderWidth =
'' prefix, galleryThumbBorderWidth = 'galleryThumb', cardRadius = 'card'), and records per element
the FEATURES that decide how a shared declaration builder would have to behave:

    width         sides-literal | border-box-decls | native-style-engine | serialise-box-sides |
                  button-style | shorthand-border | none | unclear
    style         keyword-helper | literal | native | button-style | none | unclear   (+ explicit_none_rule)
    colour        states-css | gradient-ring | native | literal-border-color | custom-property |
                  button-style | none | unclear                                       (+ hover_gradient)
    radius_base   style-engine | corner-shorthand | corner-longhands | serialise-corners |
                  button-style | single-length | custom-property | none | unclear
    radius_tiers  the same enum for the tablet and mobile tiers, or none
    sink          decls-array | scoped-css-array | string-concat | mixed | unclear
    selector      the selector variable or expression of the element's border rule (first found)
    shares_rule_with  other property families in the same declaration list (sink decls-array)
    line          first line of the element's border code

A feature that matches more than one path is written joined with '+' (for example
'sides-literal+native-style-engine'). A feature the recogniser cannot read is 'unclear', never a guess.
SHAPE = width|style|colour|radius_base|radius_tiers|sink; elements are grouped by SHAPE.

How it reads: comments are blanked first (offsets kept), then the file is cut into statements at ';', '{'
and '}' outside quotes. An element's region is the statements that name one of its attribute keys, or a
border-related variable derived from them (three propagation passes). Radius statements are placed in the
base, tablet or mobile tier from tablet/mobile/_tab/_mob/1023/767 in the statement.

Current behaviour: census only. There is no --fix and no --check mode.

Usage (from plugins/sgs-blocks):
    python scripts/migrate-border-element.py --survey            census to stdout
    python scripts/migrate-border-element.py --survey --json     also writes reports/migrations/border-element-census.json
    python scripts/migrate-border-element.py --self-test

Method: .claude/THE-MIGRATION-METHOD.md. Modelled on scripts/migrate-box-longhands.py.
"""
import argparse
import io
import json
import os
import re
import sys
from datetime import datetime, timezone

if sys.stdout.encoding is None or sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except (AttributeError, ValueError):
        pass

PLUGIN = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _repo_root():
    """The repo root, found by a file that exists only there (never CLAUDE.md, which every package has)."""
    d = PLUGIN
    while True:
        if os.path.isfile(os.path.join(d, '.claude', 'THE-MIGRATION-METHOD.md')):
            return d
        parent = os.path.dirname(d)
        if parent == d:
            raise SystemExit('repo root not found: no .claude/THE-MIGRATION-METHOD.md above ' + PLUGIN)
        d = parent


REPO = _repo_root()
CENSUS = os.path.join(REPO, 'reports', 'migrations', 'border-element-census.json')

HELPERS = (
    'sgs_border_box_decls', 'sgs_border_states_css', 'sgs_border_gradient_css', 'sgs_border_radius_tiers',
    'sgs_corner_object_shorthand', 'sgs_corner_object_longhands', 'sgs_serialise_box_corners',
    'sgs_button_element_style_css', 'sgs_native_border_style_width_args', 'sgs_gate_native_border_style',
)
HELPER_CALL = re.compile(r'\b(?:' + '|'.join(HELPERS) + r')\s*\(')
LITERAL_DECL = re.compile(r'(?<![-\w])border(?:-width|-style)?\s*:')
STYLE_ENGINE_BORDER = re.compile(r"\bwp_style_engine_get_styles\b")
TIER_WORD = re.compile(r'tablet|mobile|\btab_|_tab\b|_tab_|\bmob_|_mob\b|_mob_|1023|767', re.I)
VAR_NAME = re.compile(r'border|radius|^\$bw|^\$bc$|^\$bs$|corner', re.I)
KEY = re.compile(r"\[\s*'([a-z]\w*)'\s*\]")
ATTR_KEY = re.compile(
    r'^(?P<p>[a-z]\w*?)??(?:[Bb]order(?:Width|Style|Colou?r|Radius)|Radius)\w*$')


def rel(path):
    return os.path.relpath(path, PLUGIN).replace('\\', '/')


def read(path):
    with io.open(path, encoding='utf-8', newline='') as f:
        return f.read()


def targets():
    out = []
    for base in ('src/blocks', 'includes'):
        for dirpath, dirnames, filenames in os.walk(os.path.join(PLUGIN, base)):
            dirnames[:] = sorted(d for d in dirnames if 'fixture' not in d.lower())
            out += [os.path.join(dirpath, f) for f in sorted(filenames) if f.endswith('.php')]
    return out


def line_of(text, idx):
    return text.count('\n', 0, idx) + 1


def blank_comments(text):
    """The text with every PHP comment replaced by spaces (newlines kept, so offsets and lines survive)."""
    out, i, n = [], 0, len(text)
    php, quote = False, None
    while i < n:
        c = text[i]
        if not php:
            j = text.find('<?', i)
            if j == -1:
                out.append(text[i:])
                break
            k = j + 5 if text.startswith('<?php', j) else j + 2
            out.append(text[i:k])
            i, php = k, True
            continue
        if quote:
            out.append(c)
            if c == '\\' and i + 1 < n:
                out.append(text[i + 1])
                i += 2
                continue
            if c == quote:
                quote = None
            i += 1
            continue
        if c in ('"', "'"):
            quote = c
            out.append(c)
            i += 1
        elif text.startswith('?>', i):
            php = False
            out.append('?>')
            i += 2
        elif text.startswith('/*', i):
            j = text.find('*/', i + 2)
            j = n if j == -1 else j + 2
            out.append(re.sub(r'[^\n]', ' ', text[i:j]))
            i = j
        elif text.startswith('//', i) or (c == '#' and not text.startswith('#[', i)):
            j = text.find('\n', i)
            j = n if j == -1 else j
            out.append(' ' * (j - i))
            i = j
        else:
            out.append(c)
            i += 1
    return ''.join(out)


def statements(text):
    """[(start, end, text)] cut at ';', '{' and '}' outside quotes."""
    out, start, quote, i = [], 0, None, 0
    while i < len(text):
        c = text[i]
        if quote:
            if c == '\\':
                i += 2
                continue
            if c == quote:
                quote = None
        elif c in ('"', "'"):
            quote = c
        elif c in ';{}':
            seg = text[start:i]
            if seg.strip():
                out.append((start, i, seg))
            start = i + 1
        i += 1
    seg = text[start:]
    if seg.strip():
        out.append((start, len(text), seg))
    return out


def close_paren(text, open_idx):
    """Index of the parenthesis closing the one at open_idx, skipping quoted strings."""
    depth, i, quote = 0, open_idx, None
    while i < len(text):
        c = text[i]
        if quote:
            if c == '\\':
                i += 2
                continue
            if c == quote:
                quote = None
        elif c in ('"', "'"):
            quote = c
        elif c == '(':
            depth += 1
        elif c == ')':
            depth -= 1
            if depth == 0:
                return i
        i += 1
    return -1


def split_args(argtext):
    """Top-level comma split of a call's argument text."""
    out, depth, quote, cur, i = [], 0, None, [], 0
    while i < len(argtext):
        c = argtext[i]
        if quote:
            cur.append(c)
            if c == '\\' and i + 1 < len(argtext):
                cur.append(argtext[i + 1])
                i += 2
                continue
            if c == quote:
                quote = None
        elif c in ('"', "'"):
            quote = c
            cur.append(c)
        elif c in '([{':
            depth += 1
            cur.append(c)
        elif c in ')]}':
            depth -= 1
            cur.append(c)
        elif c == ',' and depth == 0:
            out.append(''.join(cur).strip())
            cur = []
        else:
            cur.append(c)
        i += 1
    if ''.join(cur).strip():
        out.append(''.join(cur).strip())
    return out


def calls(text, name):
    """[(args list, offset)] for each call of `name` in text."""
    out = []
    for m in re.finditer(r'(?<!function )\b' + name + r'\s*\(', text):
        o = m.end() - 1
        c = close_paren(text, o)
        if c != -1:
            out.append((split_args(text[o + 1:c]), m.start()))
    return out


def blank_definitions(text):
    """Rename `function sgs_x(` so a helper's own definition is not read as a call of it."""
    return re.sub(r'\bfunction\s+(&\s*)?(sgs_\w+)', r'function \2_DEF', text)


def in_scope(text):
    if HELPER_CALL.search(text) or LITERAL_DECL.search(text):
        return True
    return bool(STYLE_ENGINE_BORDER.search(text) and re.search(r"'border'\s*=>", text))


def prefix_of_key(key):
    m = ATTR_KEY.match(key)
    if not m:
        return None
    return m.group('p') or ''


def lhs_var(stmt):
    m = re.match(r'\s*(?:\}\s*)?(\$\w+)\s*(\[\s*\])?\s*(\.)?=(?!=)', stmt)
    return m.groups() if m else (None, None, None)


def element_regions(stmts):
    """{prefix: set of statement indexes}. Seeds from attribute keys, then three propagation passes."""
    regions = {}
    for idx, (_, _, s) in enumerate(stmts):
        for k in KEY.findall(s):
            p = prefix_of_key(k)
            if p is not None:
                regions.setdefault(p, set()).add(idx)
        if re.search(r"\$\w+\s*\[\s*'border'\s*\]", s) or re.search(r"\bsgs_border_radius_tiers\s*\(", s):
            regions.setdefault('', set()).add(idx)
        for args, _ in calls(s, 'sgs_button_element_style_css'):
            if len(args) > 1:
                lit = re.match(r"^'([^']*)'$", args[1])
                regions.setdefault(lit.group(1) if lit else '(var)', set()).add(idx)
        for args, _ in calls(s, 'sgs_border_box_decls'):
            for a in args:
                for k in KEY.findall(a):
                    p = prefix_of_key(k)
                    if p is not None:
                        regions.setdefault(p, set()).add(idx)
    seeded = {i: p for p, members in regions.items() for i in members}
    for p, members in regions.items():
        for _ in range(3):
            vars_ = set()
            for idx in members:
                v, app, cat = lhs_var(stmts[idx][2])
                if v and not cat and (VAR_NAME.search(v) or (
                        has(r'border|radius', stmts[idx][2], re.I) and 'hover' not in v.lower())):
                    vars_.add(v)
            grew = False
            for idx, (_, _, s) in enumerate(stmts):
                if idx in members or seeded.get(idx, p) != p:
                    continue
                if any(re.search(re.escape(v) + r'(?!\w)', s) for v in vars_):
                    members.add(idx)
                    grew = True
            if not grew:
                break
    return regions


def carries(stmt):
    return has(r'border|radius|corner', stmt, re.I) or HELPER_CALL.search(stmt) is not None


EMIT_HELPERS = re.compile(r'(?:sgs_border_gradient_css|sgs_border_states_css|sgs_button_element_style_css)\s*\(')


def has(pattern, text, flags=0):
    return re.search(pattern, text, flags) is not None


def join(found, order):
    got = [o for o in order if o in found]
    return '+'.join(got)


def width_of(stmts, text, whole, native_all):
    f = set()
    if has(r'\bsgs_border_box_decls\s*\(', text):
        f.add('border-box-decls')
    if has(r'\bsgs_button_element_style_css\s*\(', text):
        f.add('button-style')
    if has(r'\bsgs_native_border_style_width_args\s*\(|\bsgs_gate_native_border_style\s*\(', text) or native_all:
        f.add('native-style-engine')
    for s in stmts:
        if has(r"'border'", s) and has(r"'width'", s) and (has(r'wp_style_engine_get_styles', s) or has(r"=>\s*array", s)):
            f.add('native-style-engine')
        if has(r'\bsgs_serialise_box_sides\s*\(', s) and has(r'border', s, re.I):
            f.add('serialise-box-sides')
        if has(r'border-width\s*:', s) or has(r'border[_-]width', s, re.I):
            if (has(r'\{\$\w+\}\s\{\$\w+\}\s\{\$\w+\}\s\{\$\w+\}', s)
                    or has(r"\$\w+\s*\.\s*'\s'\s*\.\s*\$\w+\s*\.\s*'\s'\s*\.\s*\$\w+", s)
                    or (has(r"implode\(\s*'\s'", s) and has(r'border-width\s*:', s))):
                f.add('sides-literal')
        if has(r"(?<![-\w])border:\s*(?!0\b|none)", s) and not has(r'--[\w-]*border', s):
            f.add('shorthand-border')
    if 'sides-literal' not in f and has(r'border-width\s*:\s*[\'"]?\s*\.?\s*\$', text) is False and has(r'border-width\s*:', text):
        if has(r'border-width\s*:\s*[\w.]+', text):
            f.add('sides-literal')
    out = join(f, ('border-box-decls', 'button-style', 'native-style-engine', 'serialise-box-sides',
                   'sides-literal', 'shorthand-border'))
    if out:
        return out
    return 'unclear' if has(r'[Bb]order[Ww]idth|border_width', text) else 'none'


def style_of(text, native_all, width):
    f = set()
    if has(r'\bsgs_border_style_keyword\s*\(', text) or 'border-box-decls' in width:
        f.add('keyword-helper')
    if has(r'\bsgs_native_border_style_width_args\s*\(|\bsgs_gate_native_border_style\s*\(', text) or native_all:
        f.add('native')
    if 'button-style' in width:
        f.add('button-style')
    if has(r'border-style\s*:\s*(?!none)', text) and 'keyword-helper' not in f:
        f.add('literal')
    if 'shorthand-border' in width and not f:
        f.add('literal')
    out = join(f, ('keyword-helper', 'native', 'button-style', 'literal'))
    if out:
        return out
    return 'unclear' if has(r'[Bb]order[Ss]tyle|border_style', text) else 'none'


def colour_of(text, native_all, native_colour_unset, width):
    f = set()
    if has(r'\bsgs_border_states_css\s*\(', text):
        f.add('states-css')
    if has(r'\bsgs_border_gradient_css\s*\(', text):
        f.add('gradient-ring')
    if native_all and not native_colour_unset:
        f.add('native')
    if has(r'border-colou?r\s*:', text):
        f.add('literal-border-color')
    if has(r"--[\w-]*border[\w-]*\s*:", text):
        f.add('custom-property')
    if 'button-style' in width:
        f.add('button-style')
    out = join(f, ('states-css', 'gradient-ring', 'native', 'literal-border-color', 'custom-property', 'button-style'))
    if out:
        return out
    return 'unclear' if has(r'[Bb]order[Cc]olou?r|border_colou?r', text) else 'none'


def hover_gradient_of(text):
    for args, _ in calls(text, 'sgs_border_gradient_css'):
        if len(args) > 2 and args[2].strip() not in ('null', 'NULL', "''", '""'):
            return True
        if args and ':hover' in args[0]:
            return True
    return has(r'\bsgs_border_states_css\s*\(', text) and has(r"'hover_gradient'", text)


def radius_methods(text, native_all):
    f = set()
    if has(r'\bsgs_corner_object_shorthand\s*\(', text):
        f.add('corner-shorthand')
    if has(r'\bsgs_corner_object_longhands\s*\(', text):
        f.add('corner-longhands')
    if has(r'\bsgs_serialise_box_corners\s*\(', text):
        f.add('serialise-corners')
    if has(r'\bsgs_button_element_style_css\s*\(', text):
        f.add('button-style')
    if has(r"'border'", text) and has(r"'radius'", text):
        f.add('style-engine')
    if has(r"--[\w-]*radius[\w-]*\s*:", text):
        f.add('custom-property')
    return f


def radius_of(stmts, native_all, width):
    tiers = {'base': [], 'tablet': [], 'mobile': []}
    for s in stmts:
        if not has(r'radius|corner|sgs_button_element_style_css|\[\s*\'border\'\s*\]', s, re.I):
            continue
        t = TIER_WORD.search(s)
        key = 'base'
        if t:
            word = t.group(0).lower()
            key = 'mobile' if ('mob' in word or '767' in word) else 'tablet'
        tiers[key].append(s)
    res = {}
    for k, ss in tiers.items():
        text = '\n'.join(ss)
        f = radius_methods(text, native_all)
        if k == 'base' and native_all:
            f.add('style-engine')
        if 'button-style' in width and k == 'base':
            f.add('button-style')
        if not f and has(r'border-radius\s*:', text):
            f.add('single-length' if has(r'sgs_css_length_value|\d(?:px|rem|em|%)', text) else 'unclear')
        order = ('style-engine', 'corner-shorthand', 'corner-longhands', 'serialise-corners', 'button-style',
                 'single-length', 'custom-property', 'unclear')
        res[k] = join(f, order) or ('none')
    if res['tablet'] == 'none' and res['mobile'] == 'none':
        tier = 'none'
    elif res['tablet'] == res['mobile']:
        tier = res['tablet']
    else:
        tier = 'tablet:%s,mobile:%s' % (res['tablet'], res['mobile'])
    base = res['base']
    if base == 'none' and has(r'radius', '\n'.join(stmts), re.I) and tier == 'none':
        base = 'unclear' if has(r"[Rr]adius'", '\n'.join(stmts)) else 'none'
    return base, tier


def sink_of(stmts, region_idx, all_stmts):
    kinds, decl_vars, selector, selector_hover = set(), set(), '', False
    for idx in sorted(region_idx):
        s = all_stmts[idx][2]
        appends = has(r'\[\s*\]\s*=|\.=', s)
        emits = (has(r'border(?:-width|-style|-colou?r|-radius)?\s*:', s) or EMIT_HELPERS.search(s)
                 or has(r"\['css'\]", s) or (appends and HELPER_CALL.search(s)))
        if not emits or has(r'^\s*(?:\$\w+\s*=\s*)?(?:is_array|isset)\(', s) and not has(r'\[\]\s*=|\.=', s):
            continue
        if has(r'\bwp_style_engine_get_styles', s) and not has(r'\[\]\s*=|\.=', s):
            continue
        m = re.match(r'\s*(\$\w+)\s*(\[\s*\])?\s*(\.)?=(?!=)', s)
        if m and has(r'sgs_border_box_decls\s*\(', s) and not appends:
            kinds.add('decls-array')
            decl_vars.add(m.group(1))
        elif m:
            var, app, cat = m.groups()
            if app and re.search(r'decl|styles|props|vars|declarations', var, re.I):
                kinds.add('decls-array')
                decl_vars.add(var)
            elif app:
                kinds.add('scoped-css-array')
            elif cat:
                kinds.add('string-concat')
            else:
                kinds.add('string-concat')
        elif has(r'\[\]\s*=', s):
            kinds.add('scoped-css-array')
        else:
            continue
        cand = selector_of(s)
        if cand and (not selector or (selector_hover and not has(r'hover|::(?:before|after)', cand + s, re.I))):
            selector, selector_hover = cand, has(r'hover|::(?:before|after)', cand + s, re.I)
    if not selector and decl_vars:
        selector = rule_selector(decl_vars, all_stmts)
    if not kinds:
        return 'unclear', selector, decl_vars, kinds
    return (next(iter(kinds)) if len(kinds) == 1 else 'mixed'), selector, decl_vars, kinds


def selector_of(stmt):
    for args, _ in calls(stmt, 'sgs_border_gradient_css') + calls(stmt, 'sgs_border_states_css'):
        if args:
            return args[0]
    m = re.search(r"(\$\w+)\s*\.\s*'[^']*\{", stmt)
    if m:
        return m.group(1)
    m = re.search(r'"\{(\$\w+)\}([^"{]*)\{', stmt)
    if m:
        return '"{%s}%s"' % (m.group(1), m.group(2))
    m = re.search(r'"\{(\$\w+)\}', stmt)
    return '"{%s}..."' % m.group(1) if m else ''


def rule_selector(decl_vars, all_stmts):
    """Where a decls array is consumed (implode into a rule): the selector next to that use."""
    for var in sorted(decl_vars):
        for _, _, s in all_stmts:
            if re.match(r'\s*' + re.escape(var) + r'\s*\[', s):
                continue
            if re.search(re.escape(var) + r'(?!\w)', s) and 'implode' in s:
                m = re.search(r'(\$\w*(?:sel|scope|selector|root)\w*)', s) or re.search(r'"\{(\$\w+)\}', s)
                if m:
                    return m.group(1)
    return ''


FAMILY = (
    ('padding', r'^padding'), ('margin', r'^margin'), ('shadow', r'^box-shadow'), ('background', r'^background'),
    ('max-width', r'^max-width'), ('sizing', r'^(?:width|min-width|height|min-height|max-height|aspect)'),
    ('typography', r'^(?:font|line-height|letter-spacing|text-|word-)'), ('colour', r'^color$'),
    ('layout', r'^(?:display|gap|flex|grid|align|justify|position|overflow)'),
)


def shares_of(decl_vars, all_stmts):
    fams = set()
    for var in decl_vars:
        for _, _, s in all_stmts:
            if not re.match(r'\s*' + re.escape(var) + r'\s*\[\s*\]\s*=', s):
                continue
            body = s.split('=', 1)[1]
            for prop in re.findall(r'(?<![-\w$])([a-z-]+)\s*:', re.sub(r'\{\$\w+\}', '', body)):
                if prop.startswith('border') or prop.startswith('--'):
                    continue
                for name, rx in FAMILY:
                    if re.match(rx, prop):
                        fams.add(name)
                        break
                else:
                    fams.add('other')
    return sorted(fams)


def analyse(text, relpath):
    """The list of element records for one PHP file, or [] when it prints no border CSS."""
    clean = blank_definitions(blank_comments(text))
    if not in_scope(clean):
        return []
    all_stmts = statements(clean)
    regions = element_regions(all_stmts)
    carrying = {i for i, st in enumerate(all_stmts) if carries(st[2])}
    if not regions:
        regions = {'(none)': set(carrying)}
    elif len(regions) == 1:
        # One element in the file: every border statement belongs to it.
        regions = {next(iter(regions)): set(carrying)}
    else:
        claimed = set().union(*regions.values())
        home = '' if '' in regions else sorted(regions)[0]
        regions[home] = regions[home] | (carrying - claimed)
    multi = len(regions) > 1
    out = []
    for prefix in sorted(regions):
        idxs = regions[prefix]
        stmts = [all_stmts[i][2] for i in sorted(idxs)]
        region_text = '\n'.join(stmts)
        # An element's border CSS: only statements that actually carry border material count.
        carry = [i for i in sorted(idxs) if carries(all_stmts[i][2])]
        if not carry:
            continue
        stmts = [all_stmts[i][2] for i in carry]
        region_text = '\n'.join(stmts)
        native_all = any(has(r"\[\s*'border'\s*\]\s*=\s*\$\w+|'border'\s*=>\s*\$\w+", s) for s in stmts)
        native_colour_unset = has(r"unset\(\s*\$\w+\[\s*'color'\s*\]", clean)
        width = width_of(stmts, region_text, region_text, native_all)
        style = style_of(region_text, native_all, width)
        colour = colour_of(region_text, native_all, native_colour_unset, width)
        base, tiers = radius_of(stmts, native_all, width)
        sink, selector, decl_vars, kinds = sink_of(stmts, set(carry), all_stmts)
        if width == 'none' and style == 'none' and colour == 'none' and base == 'none' and tiers == 'none':
            continue
        out.append({
            'file': relpath,
            'block': block_of(relpath),
            'prefix': prefix,
            'width': width,
            'style': style,
            'explicit_none_rule': has(r'border-style\s*:\s*none\s*;?\s*border-width\s*:\s*0', region_text),
            'colour': colour,
            'hover_gradient': hover_gradient_of(region_text),
            'radius_base': base,
            'radius_tiers': tiers,
            'sink': sink,
            'sink_kinds': sorted(kinds),
            'selector': selector or '(unknown)',
            'shares_rule_with': shares_of(decl_vars, all_stmts) if 'decls-array' in kinds else [],
            'line': line_of(clean, all_stmts[carry[0]][0] + len(all_stmts[carry[0]][2]) - len(all_stmts[carry[0]][2].lstrip())),
            'shape': '|'.join((width, style, colour, base, tiers, sink)),
            'multi_element_file': multi,
        })
    return out


def block_of(relpath):
    m = re.match(r'src/blocks/([^/]+)/', relpath)
    return m.group(1) if m else relpath


def census():
    elements = []
    files = 0
    for p in targets():
        els = analyse(read(p), rel(p))
        if els:
            files += 1
            elements += els
    return files, elements


UNCLEAR_FIELDS = ('width', 'style', 'colour', 'radius_base', 'radius_tiers', 'sink')


def unclear_list(elements):
    out = []
    for e in elements:
        bad = [f for f in UNCLEAR_FIELDS if 'unclear' in e[f]]
        if e['selector'] == '(unknown)' and e['sink'] != 'unclear':
            bad.append('selector')
        if bad:
            out.append((e['file'], e['prefix'], bad, e['line']))
    return out


def grouped(elements):
    g = {}
    for e in elements:
        g.setdefault(e['shape'], []).append(e)
    return sorted(g.items(), key=lambda kv: (-len(kv[1]), kv[0]))


def survey(write_json):
    files, elements = census()
    shapes = grouped(elements)
    print('Border-element census')
    print('files in scope: %d   elements: %d   distinct shapes: %d' % (files, len(elements), len(shapes)))
    print()
    print('Shapes (width|style|colour|radius_base|radius_tiers|sink), most common first:')
    for shape, els in shapes:
        names = sorted({(e['block'] + ('[' + e['prefix'] + ']' if e['prefix'] else '')) for e in els})
        print('%4d  %s' % (len(els), shape))
        print('        %s' % ', '.join(names))
    print()
    unc = unclear_list(elements)
    print('Unclear features (%d elements): where the recogniser is weak' % len(unc))
    for f, p, bad, ln in unc:
        print('  %s  prefix=%r  %s  (line %d)' % (f, p, ','.join(bad), ln))
    if write_json:
        os.makedirs(os.path.dirname(CENSUS), exist_ok=True)
        doc = {
            'generated': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
            'tool': 'scripts/migrate-border-element.py --survey',
            'totals': {'files': files, 'elements': len(elements), 'shapes': len(shapes), 'unclear_elements': len(unc)},
            'shapes': [{'shape': s, 'count': len(els), 'elements': [e['file'] + '#' + e['prefix'] for e in els]}
                       for s, els in shapes],
            'elements': elements,
        }
        with io.open(CENSUS, 'w', encoding='utf-8', newline='\n') as fh:
            json.dump(doc, fh, indent=2, ensure_ascii=False)
            fh.write('\n')
        print()
        print('wrote ' + os.path.relpath(CENSUS, REPO).replace('\\', '/'))
    return 0


SNIPPETS = {
    'sides-literal + keyword + radius tiers (corner shorthand) + style-engine base': ("""<?php
$radius_tiers = sgs_border_radius_tiers( $attributes );
$base_border_radius = $radius_tiers['base'];
$border_radius_tablet_obj = $radius_tiers['tablet'];
$border_radius_mobile_obj = $radius_tiers['mobile'];
$border_width_top = sgs_css_length_value( $attributes['borderWidth']['top'] ?? '' );
$border_style = sgs_border_style_keyword( $attributes['borderStyle'] ?? '' );
$base_decls[] = "border-width:{$bwt} {$bwr} {$bwb} {$bwl}";
$base_decls[] = 'border-style:' . $border_style;
$base_decls[] = 'padding:4px';
$base_style_engine_args['border'] = array( 'radius' => $base_border_radius );
$radius_tab_val = sgs_corner_object_shorthand( $border_radius_tablet_obj );
$radius_mob_val = sgs_corner_object_shorthand( $border_radius_mobile_obj );
$tablet_box_decls[] = "border-radius:{$radius_tab_val}";
$mobile_box_decls[] = "border-radius:{$radius_mob_val}";
""", {'prefix': '', 'width': 'sides-literal', 'style': 'keyword-helper', 'radius_base': 'style-engine',
      'radius_tiers': 'corner-shorthand', 'sink': 'decls-array'}),
    'border-box-decls + states-css + corner longhands, prefix field': ("""<?php
$sgs_field_border = sgs_border_box_decls( $attributes['fieldBorderWidth'] ?? array(), $attributes['fieldBorderStyle'] ?? '' );
$css .= sgs_border_states_css( $sel, $attributes, array( 'base' => 'fieldBorderColour' ) );
$fieldRadiusTab = sgs_corner_object_longhands( $attributes['fieldBorderRadiusTablet'] ?? null );
$tab_decls[] = $fieldRadiusTab;
$base_r = sgs_corner_object_longhands( $attributes['fieldBorderRadius'] ?? null );
$field_decls[] = $base_r;
""", {'prefix': 'field', 'width': 'border-box-decls', 'colour': 'states-css', 'radius_base': 'corner-longhands'}),
    'native style engine width + serialise corners + custom-property colour': ("""<?php
$args = wp_style_engine_get_styles( array( 'border' => array( 'width' => $w, 'style' => 'solid' ) ) );
$scoped_css[] = $root . '{' . $args['css'] . '}';
$radius = sgs_serialise_box_corners( $attributes['galleryThumbBorderRadius'] ?? null );
$scoped_css[] = $root . '{border-radius:' . $radius . '}';
$vars[] = '--sgs-g-border:' . $attributes['galleryThumbBorderColour'];
""", {'prefix': 'galleryThumb', 'width': 'native-style-engine', 'radius_base': 'serialise-corners',
      'colour': 'custom-property', 'sink': 'mixed'}),
    'button-style helper, prefix cta': ("""<?php
$out = sgs_button_element_style_css( $attributes, 'cta', $sel );
$parts[] = $out;
$x = $attributes['ctaBorderRadius'];
""", {'prefix': 'cta', 'width': 'button-style', 'radius_base': 'button-style'}),
    'custom-property radius': ("""<?php
$card_radius = $attributes['cardRadius'] ?? '';
$vars[] = '--sgs-card-radius:' . sgs_css_length_value( $card_radius ) . ';';
$card_border_width = $attributes['cardBorderWidth'];
$vars[] = '--sgs-card-border-width:' . implode( ' ', $sides ) . ';';
$css .= sgs_border_gradient_css( $sel, $g );
""", {'prefix': 'card', 'radius_base': 'custom-property', 'width': 'sides-literal'}),
    'shorthand border + single length radius + gradient ring with hover': ("""<?php
$base_decls[] = 'border:' . $bwt . ' ' . $bs . ' ' . $bc;
$b = $attributes['borderWidth'];
$css .= $sel . '{border-radius:' . sgs_css_length_value( $attributes['borderRadius'] ) . ';}';
$css .= sgs_border_gradient_css( $sel, $g, $gh, '2px' );
""", {'prefix': '', 'width': 'shorthand-border', 'radius_base': 'single-length', 'colour': 'gradient-ring',
      'hover_gradient': True, 'sink': 'mixed'}),
}


def self_test():
    failed = 0
    for name, (src, want) in SNIPPETS.items():
        got = analyse(src, 'src/blocks/demo/render.php')
        el = next((e for e in got if e['prefix'] == want['prefix']), None)
        if el is None:
            print('FAIL  %s: no element with prefix %r (got %s)' % (name, want['prefix'], [e['prefix'] for e in got]))
            failed += 1
            continue
        bad = {k: (v, el[k]) for k, v in want.items() if k != 'prefix' and el[k] != v}
        if bad:
            print('FAIL  %s: %s' % (name, bad))
            failed += 1
        else:
            print('ok    %s' % name)
    neg = """<?php
// sgs_border_box_decls( $a, $b ) and sgs_border_gradient_css( $s, $g ) are named here only in a comment.
/* sgs_border_states_css( $s, $a, $m ); border-width: 1px; $attributes['borderWidth'] */
# border-style: solid
$x = 1;
"""
    if analyse(neg, 'src/blocks/demo/render.php'):
        print('FAIL  negative control: a comment-only mention was counted')
        failed += 1
    else:
        print('ok    negative control: comment-only mentions are not counted')
    twin = """<?php
function sgs_border_box_decls( $w, $s ) { return array(); }
"""
    if analyse(twin, 'includes/x.php'):
        print('FAIL  negative control: a helper definition was read as a call')
        failed += 1
    else:
        print('ok    negative control: a helper definition is not a call of it')
    multi = analyse(SNIPPETS['custom-property radius'][0] + "\n$bwt = $attributes['borderWidth']['top'];\n$d[] = 'border-width:' . $bwt;\n", 'src/blocks/demo/render.php')
    if {e['prefix'] for e in multi} != {'card', ''}:
        print('FAIL  prefix grouping: %s' % sorted({e['prefix'] for e in multi}))
        failed += 1
    else:
        print('ok    prefix grouping: card and the empty prefix are separate elements')
    print('self-test: %s' % ('FAILED (%d)' % failed if failed else 'passed'))
    return 1 if failed else 0


def main():
    ap = argparse.ArgumentParser(description='Border-element census (census only).')
    ap.add_argument('--survey', action='store_true')
    ap.add_argument('--json', action='store_true', help='with --survey: also write ' + os.path.relpath(CENSUS, REPO))
    ap.add_argument('--self-test', action='store_true')
    a = ap.parse_args()
    if a.self_test:
        return self_test()
    if a.survey:
        return survey(a.json)
    ap.print_help()
    return 2


if __name__ == '__main__':
    sys.exit(main())
