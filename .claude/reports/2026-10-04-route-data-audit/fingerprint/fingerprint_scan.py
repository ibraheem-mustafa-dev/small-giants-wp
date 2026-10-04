#!/usr/bin/env python3
"""Wiring-fingerprint scanner (read-only prototype).

Classifies every SGS block attribute (framework DB, source='sgs') plus every
extension attribute against the wiring links a painting setting must show:

  L1 declared      block.json / extension roster (given by the DB row)
  L2 control       an editor control writes it (setAttributes key, a panel file
                   binding, or a prefix-built key from a prefixed control)
  L3 canvas        the editor canvas reads it outside InspectorControls
                   (edit.js / block-own preview files / preview helper with a
                   literal prefix), or the editor uses ServerSideRender, or a
                   child block consumes it through block context
  L4 front end     a reached PHP emitter reads it (literal, prefix helper,
                   shared wrapper, dynamic prefix, block context)
  L5 channel       the PHP statements touching it produce a CSS channel:
                   DECL (property declaration / emitter helper), CP (custom
                   property), CLASS (modifier class)
  L6 consumer      a CP channel has a var() reader; a CLASS channel has a rule
  L7 parity        a CP channel's custom property is also set by the editor
                   (unless the editor uses SSR or reads the attribute directly
                   into a property)
  C1 conditional   every reader of the CP sits behind a child-block selector
                   (the setting paints only when the child is a given block)

Inputs: editor-facts.json (from editor-facts.js), dump.json (from
`node scripts/check-dead-controls.js --dump-json`), the framework DB opened
read-only, block.json files, scripts/computed-route/cache/*.json.
Outputs: fingerprint-report.json + a printed summary.
"""
import glob
import json
import os
import re
import sqlite3
import sys
from collections import Counter, defaultdict

REPO = 'C:/Users/Bean/Projects/small-giants-wp'
PB = REPO + '/plugins/sgs-blocks'
OUT = os.path.dirname(os.path.abspath(__file__))
DB = 'file:C:/Users/Bean/.claude/skills/sgs-wp-engine/sgs-framework.db?mode=ro'


def read(p):
    try:
        with open(p, encoding='utf-8', errors='replace') as f:
            return f.read()
    except OSError:
        return ''


def strip_php_comments(s):
    """Remove // # and /* */ comments outside string literals (keeps offsets)."""
    out = []
    i, n = 0, len(s)
    in_s = None
    while i < n:
        c = s[i]
        if in_s:
            out.append(c)
            if c == chr(92) and i + 1 < n:
                out.append(s[i + 1])
                i += 2
                continue
            if c == in_s:
                in_s = None
            i += 1
            continue
        if c in ('"', "'"):
            in_s = c
            out.append(c)
            i += 1
            continue
        if c == '/' and i + 1 < n and s[i + 1] == '*':
            e = s.find('*/', i + 2)
            e = n if e == -1 else e + 2
            out.append(' ' * (e - i))
            i = e
            continue
        if (c == '/' and i + 1 < n and s[i + 1] == '/') or (c == '#' and not (i + 1 < n and s[i + 1] == '[')):
            e = s.find(chr(10), i)
            e = n if e == -1 else e
            if s.find('?>', i, e) != -1:
                e = s.find('?>', i, e)
            out.append(' ' * (e - i))
            i = e
            continue
        out.append(c)
        i += 1
    return ''.join(out)


def strip_css_comments(s):
    return re.sub(r'/\*.*?\*/', ' ', s, flags=re.S)


def lower_first(s):
    return s[:1].lower() + s[1:]


# --------------------------------------------------------------------------
# PHP function / method index
# --------------------------------------------------------------------------
FUNC_RE = re.compile(r'function\s+&?\s*(\w+)\s*\(([^)]*)\)[^{;]*\{')
CLASS_RE = re.compile(r'\bclass\s+(\w+)')


def brace_body(src, open_idx):
    depth = 0
    i = open_idx
    n = len(src)
    in_s = None
    while i < n:
        c = src[i]
        if in_s:
            if c == '\\':
                i += 2
                continue
            if c == in_s:
                in_s = None
        elif c in ('"', "'"):
            in_s = c
        elif c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                return src[open_idx:i + 1]
        i += 1
    return src[open_idx:]


def index_php(files):
    funcs = {}
    classes = {}
    for f in files:
        src = strip_php_comments(read(f))
        for m in CLASS_RE.finditer(src):
            ob = src.find('{', m.end())
            if ob != -1:
                classes[m.group(1)] = (f, brace_body(src, ob))
        for m in FUNC_RE.finditer(src):
            name = m.group(1)
            params = [p.strip() for p in m.group(2).split(',')]
            pnames = []
            for p in params:
                mm = re.search(r'\$(\w+)', p)
                pnames.append(mm.group(1) if mm else '')
            body = brace_body(src, m.end() - 1)
            funcs.setdefault(name, (f, pnames, body))
    return funcs, classes


CALL_RE = re.compile(r'\b([A-Za-z_]\w*)\s*\(')
STATIC_RE = re.compile(r'\b([A-Z]\w*)::(\w+)\s*\(')
PHP_KEYWORDS = {'if', 'elseif', 'foreach', 'for', 'while', 'switch', 'array', 'isset', 'empty', 'function', 'return', 'list', 'echo', 'print', 'unset', 'catch', 'fn', 'match', 'static', 'new'}


def split_args(src, open_paren):
    """Top-level argument strings of the call whose '(' is at open_paren."""
    depth = 0
    i = open_paren
    args = []
    cur = []
    in_s = None
    while i < len(src):
        c = src[i]
        if in_s:
            cur.append(c)
            if c == '\\':
                cur.append(src[i + 1] if i + 1 < len(src) else '')
                i += 2
                continue
            if c == in_s:
                in_s = None
        elif c in ('"', "'"):
            in_s = c
            cur.append(c)
        elif c in '([{':
            depth += 1
            if depth > 1:
                cur.append(c)
        elif c in ')]}':
            depth -= 1
            if depth == 0:
                args.append(''.join(cur).strip())
                return args
            cur.append(c)
        elif c == ',' and depth == 1:
            args.append(''.join(cur).strip())
            cur = []
        else:
            cur.append(c)
        i += 1
    return args


# --------------------------------------------------------------------------
# Prefix helpers: which parameter is a prefix, and which suffixes it builds
# --------------------------------------------------------------------------
def prefix_helpers(funcs):
    table = defaultdict(lambda: defaultdict(set))  # fname -> param_idx -> suffixes
    for name, (f, pnames, body) in funcs.items():
        for idx, pn in enumerate(pnames):
            if not pn or pn == 'attributes':
                continue
            for m in re.finditer(r'\$' + pn + r"\s*\.\s*'([A-Z]\w*)'", body):
                table[name][idx].add(m.group(1))
            for m in re.finditer(r"sgs_typography_attr\(\s*\$" + pn + r"\s*,\s*'(\w+)'", body):
                table[name][idx].add(m.group(1))
    # propagate one level: helper passes its own prefix param to another helper
    for _ in range(3):
        changed = False
        for name, (f, pnames, body) in funcs.items():
            for idx, pn in enumerate(pnames):
                if not pn or pn == 'attributes':
                    continue
                for callee in list(table.keys()):
                    if callee == name:
                        continue
                    for m in re.finditer(r'\b' + callee + r'\s*\(', body):
                        args = split_args(body, m.end() - 1)
                        for cidx, sfx in list(table[callee].items()):
                            if cidx < len(args) and re.fullmatch(r'\$' + pn, args[cidx]):
                                before = len(table[name][idx])
                                table[name][idx] |= sfx
                                changed = changed or len(table[name][idx]) != before
        if not changed:
            break
    # merge check-dead-controls.js's own table (tested resolver)
    js = read(PB + '/scripts/check-dead-controls.js')
    m = re.search(r'const PREFIXED_HELPER_SUFFIXES = \{(.*?)\n\};', js, re.S)
    if m:
        for fm in re.finditer(r'(\w+):\s*\[(.*?)\]', m.group(1), re.S):
            sfx = set(re.findall(r"'(\w+)'", fm.group(2)))
            table[fm.group(1)][1] |= sfx
    return table


# --------------------------------------------------------------------------
# CSS consumer index
# --------------------------------------------------------------------------
def css_rules(src):
    """Yield (selector, body) pairs; nested at-rules flattened."""
    src = strip_css_comments(src)
    out = []
    stack = []
    buf = ''
    i = 0
    while i < len(src):
        c = src[i]
        if c == '{':
            stack.append(buf.strip())
            buf = ''
        elif c == '}':
            sel = stack.pop() if stack else ''
            if buf.strip() and not sel.startswith('@'):
                out.append((sel, buf))
            buf = ''
        elif c == ';' and stack and not stack[-1].startswith('@'):
            buf += c
        else:
            buf += c
        i += 1
    return out


def build_css_index():
    files = []
    for pat in ['/src/**/*.css', '/src/**/*.scss', '/assets/**/*.css']:
        files += glob.glob(PB + pat, recursive=True)
    files += glob.glob(REPO + '/theme/sgs-theme/**/*.css', recursive=True)
    readers = defaultdict(list)  # --cp -> [(file, selector)]
    selectors = []  # (file, selector)
    for f in files:
        if '/build/' in f.replace('\\', '/') or 'node_modules' in f:
            continue
        for sel, body in css_rules(read(f)):
            selectors.append((f, sel))
            for cp in set(re.findall(r'var\(\s*(--sgs-[a-z0-9-]+)', body)):
                readers[cp].append((f, sel))
    return readers, selectors


# --------------------------------------------------------------------------
# PHP statement channel extraction
# --------------------------------------------------------------------------
CSS_PROPS = r'(?:color|background(?:-color|-image)?|border(?:-(?:top|right|bottom|left))?(?:-(?:width|style|color|radius))?|border-radius|padding(?:-\w+)?|margin(?:-\w+)?|font-(?:size|family|weight|style)|line-height|letter-spacing|text-(?:transform|decoration|align|shadow|indent|wrap)|box-shadow|width|max-width|min-width|height|max-height|min-height|gap|row-gap|column-gap|grid-template-columns|grid-template-rows|justify-content|align-items|align-self|flex-direction|flex-wrap|flex|opacity|transform|filter|object-fit|object-position|aspect-ratio|inset|top|left|right|bottom|z-index|display|order|fill|stroke|outline(?:-\w+)?|backdrop-filter|transition(?:-\w+)?|animation(?:-\w+)?|mix-blend-mode|clip-path|mask(?:-\w+)?|columns|column-count|writing-mode|white-space|overflow(?:-\w+)?|position|scale|rotate|translate|cursor|accent-color|caret-color|text-underline-offset|font-variant|word-spacing|hyphens|vertical-align|list-style(?:-\w+)?|background-(?:size|position|repeat|attachment|blend-mode))'
DECL_RE = re.compile(r"""['"\s;{(]""" + CSS_PROPS + r"""\s*:""")
QUOTED_PROP_RE = re.compile(r"""['\"]""" + CSS_PROPS + r"""['\"]""")
TIER_CSS_RE = re.compile(r"""['"](?:css|property|prop)['"]\s*=>\s*['"]([a-z-]+|--sgs-[a-z0-9-]+)['"]""")
CP_RE = re.compile(r'--sgs-[a-z0-9-]+')
CLASS_RE2 = re.compile(r"""['"\s]((?:sgs|is|has)-[a-z0-9-]*--)(['"]|[a-z0-9-]*)""")
EMITTER_HELPER_RE = re.compile(r'\b(sgs_\w*(?:css|decls?|rules?|style|paint\w*|preview|tier\w*|serialise\w*|shadow\w*|hover\w*|border\w*|background\w*|colour\w*|typography\w*|spacing\w*|box\w*)\w*)\s*\(')


def statement_at(text, pos):
    s = max(text.rfind(';', 0, pos), text.rfind('{', 0, pos), text.rfind('}', 0, pos)) + 1
    e = text.find(';', pos)
    if e == -1:
        e = len(text)
    # widen to the enclosing array literal when the read sits inside one
    return text[s:e + 1]


def enclosing_array(t, pos):
    """Smallest array( ... ) or [ ... ] literal around pos, else None."""
    best = None
    for m in re.finditer(r'array\s*\(', t[max(0, pos - 1500):pos]):
        start = max(0, pos - 1500) + m.end() - 1
        args_end = start
        depth = 0
        i = start
        while i < len(t) and i < start + 4000:
            c = t[i]
            if c == '(':
                depth += 1
            elif c == ')':
                depth -= 1
                if depth == 0:
                    args_end = i
                    break
            i += 1
        if args_end > pos:
            best = t[start:args_end + 1]
    return best


EMITTER_NAME_RE = re.compile(r'\b(sgs_\w*(?:_css|_css_rule|_decls?|_rules?|_paint_decl|_state_css)|sgs_emit_\w+|sgs_hover_state_rules|sgs_tier_\w+|sgs_typography_css_rule)\s*\(')
SCALAR_ASSIGN_RE = re.compile(r'\s*\$(\w+)\s*=(?!=)')


BLOCK_SLUGS = {os.path.basename(os.path.dirname(p)) for p in glob.glob(PB + '/src/blocks/*/block.json')}


def channel_for(attr, texts, extra_anchor_texts=()):
    """Token-bearing PHP statements for one attribute: anchor statements that
    name it, plus statements using a scalar variable assigned from it (two
    hops). Accumulator appends ($a[] = / .=) are not followed."""
    stmts = []
    lit = re.compile(r"""['"]""" + re.escape(attr) + r"""['"]""")
    for t in texts:
        hits = [m.start() for m in lit.finditer(t)]
        if not hits:
            continue
        vars_ = set()
        for h in hits:
            arr = enclosing_array(t, h)
            st = statement_at(t, h)
            if arr and len(lit.findall(st)) and len(re.findall(r"""['"][a-z][A-Za-z0-9]+['"]\s*\]""", st)) > 2:
                stmts.append(arr)
            else:
                stmts.append(st)
            mv = SCALAR_ASSIGN_RE.match(st)
            if mv:
                vars_.add(mv.group(1))
        frontier = set(vars_)
        for _hop in range(2):
            new = set()
            for v in frontier:
                for m in re.finditer(r'\$' + v + r'\b(?!\s*=(?!=))', t):
                    st = statement_at(t, m.start())
                    if st in stmts:
                        continue
                    stmts.append(st)
                    mv = SCALAR_ASSIGN_RE.match(st)
                    if mv and mv.group(1) not in vars_:
                        new.add(mv.group(1))
            vars_ |= new
            frontier = new
            if len(stmts) > 300:
                break
    stmts += list(extra_anchor_texts)
    joined = chr(10).join(stmts)
    cps = set(re.findall(r"""['"]\s*(--sgs-[a-z0-9-]+)\s*:""", joined)) | set(re.findall(r"""=>\s*['"](--sgs-[a-z0-9-]+)['"]""", joined))
    decl = bool(DECL_RE.search(joined)) or bool(re.search(r"""['"]css['"]\s*=>\s*['"][a-z]""", joined)) or bool(QUOTED_PROP_RE.search(joined))
    helpers = set(EMITTER_NAME_RE.findall(joined))
    classes = set(m.group(1) + (m.group(2) if m.group(2) not in ("'", '"') else '') for m in CLASS_RE2.finditer(joined))
    child_sel = sorted(set(m.group(1) for m in re.finditer(r""">\s*\.sgs-([a-z][a-z-]*[a-z])\s*['\"]""", joined) if m.group(1) in BLOCK_SLUGS))
    return {'cp': cps, 'decl': decl or bool(helpers), 'classes': classes, 'helpers': helpers, 'nstmts': len(stmts), 'child_sel': child_sel}


# --------------------------------------------------------------------------
def main():
    db = sqlite3.connect(DB, uri=True)
    rows = db.execute("SELECT block_slug, attr_name, attr_type, css_property, css_element, css_state, role, tier_shape, box_family, source FROM block_attributes WHERE source IN ('sgs','sgs-ext')").fetchall()

    ef = json.load(open(os.path.join(OUT, 'editor-facts.json'), encoding='utf-8'))
    files = ef['files']
    dump = {(r['block'], r['attr']): r for r in json.load(open(os.path.join(OUT, 'dump.json'), encoding='utf-8'))}

    calib = {}
    for f in glob.glob(REPO + '/scripts/computed-route/cache/*.json'):
        if f.endswith('.tree.json'):
            continue
        d = json.load(open(f, encoding='utf-8'))
        calib[d['block']] = d

    php_files = glob.glob(PB + '/includes/**/*.php', recursive=True) + glob.glob(PB + '/src/blocks/**/*.php', recursive=True)
    funcs, classes = index_php(php_files)
    ptable = prefix_helpers(funcs)
    cp_readers, css_selectors = build_css_index()
    block_slugs = {os.path.basename(os.path.dirname(p)) for p in glob.glob(PB + '/src/blocks/*/block.json')}
    root_class_re = re.compile(r'\.sgs-(' + '|'.join(sorted(map(re.escape, block_slugs), key=len, reverse=True)) + r')(?![\w-])')

    # block.json data
    bj = {}
    uses_ctx = defaultdict(set)
    for p in glob.glob(PB + '/src/blocks/*/block.json'):
        d = json.load(open(p, encoding='utf-8'))
        bj[d['name']] = (os.path.dirname(p), d)
        for k in d.get('usesContext', []) or []:
            uses_ctx[k].add(d['name'])

    # PHP reach per block
    def php_reach(bdir):
        texts = []
        seen_f = set()
        queue = []
        for f in glob.glob(bdir + '/**/*.php', recursive=True):
            t = strip_php_comments(read(f))
            texts.append(t)
            queue.append((t, 0))
        while queue:
            t, d = queue.pop()
            if d > 5:
                continue
            for m in STATIC_RE.finditer(t):
                cls = m.group(1)
                if cls in classes and cls not in seen_f:
                    seen_f.add(cls)
                    body = classes[cls][1]
                    texts.append(body)
                    queue.append((body, d + 1))
            for m in CALL_RE.finditer(t):
                n = m.group(1)
                if n in PHP_KEYWORDS or n in seen_f or n not in funcs:
                    continue
                seen_f.add(n)
                body = funcs[n][2]
                texts.append(body)
                queue.append((body, d + 1))
        return texts, seen_f

    # prefix-derived attr anchors per block
    def prefix_attrs(texts):
        derived = defaultdict(list)  # attr -> [helper]
        for t in texts:
            for fname, idxmap in ptable.items():
                for m in re.finditer(r'\b' + fname + r'\s*\(', t):
                    args = split_args(t, m.end() - 1)
                    for idx, sfx in idxmap.items():
                        if idx < len(args):
                            mm = re.fullmatch(r"""['"](\w*)['"]""", args[idx])
                            if mm:
                                pre = mm.group(1)
                                for s in sfx:
                                    derived[(pre + s) if pre else lower_first(s)].append(fname)
        return derived

    # helper output channels (what a prefix helper emits)
    helper_channel_cache = {}

    def helper_channel(fname):
        if fname not in helper_channel_cache:
            body = funcs.get(fname, ('', [], ''))[2]
            helper_channel_cache[fname] = {'cp': set(CP_RE.findall(body)), 'decl': bool(DECL_RE.search(body)) or 'css_rule' in fname or True}
        return helper_channel_cache[fname]

    results = []
    by_block_rows = defaultdict(list)
    for r in rows:
        by_block_rows[r[0]].append(r)

    ext_rows = [r for r in rows if r[9] == 'sgs-ext']
    sgs_rows = [r for r in rows if r[9] == 'sgs']

    block_cache = {}
    for block, rlist in sorted(by_block_rows.items()):
        if block not in bj:
            continue
        bdir, bjson = bj[block]
        slug = os.path.basename(bdir)
        texts, reached = php_reach(bdir)
        derived = prefix_attrs(texts)
        eb = ef['blocks'].get(slug, {'files': [], 'edit': ''})
        efiles = [files.get(f, {}) for f in eb['files'] if f in files]
        edit = files.get(eb['edit'], {})
        ssr = bool(edit.get('ssr'))
        control = set()
        canvas = set()
        editor_cps = set()
        editor_lits = set()
        for fx in efiles:
            fpath = fx.get('file', '').replace('\\', '/')
            control |= set(fx.get('setKeys', []))
            editor_cps |= set(fx.get('cpTokens', []))
            editor_lits |= set(fx.get('literals', []))
            is_block_own = ('/src/blocks/' + slug + '/') in fpath
            if fx is edit:
                control |= set(fx.get('inside', []))
                canvas |= set(fx.get('outside', []))
            elif fx.get('panel'):
                control |= set(fx.get('destructured', [])) | set(fx.get('memberReads', [])) | set(x for x in fx.get('literals', []) if re.fullmatch(r'[a-z][A-Za-z0-9]+', x))
            elif fx is edit or is_block_own:
                canvas |= set(fx.get('outside', []))
            # prefixed controls: <TypographyControls prefix="title" />
            for pj in fx.get('prefixJsx', []):
                from_files = [f for f in eb['files'] if f.replace('\\', '/').endswith('/' + pj['tag'] + '.js')]
                for ff in from_files:
                    for s in files.get(ff, {}).get('prefixSuffixes', []):
                        control.add((pj['prefix'] + s) if pj['prefix'] else lower_first(s))
            # prefixed preview helpers in canvas files: fn( attributes, 'title' )
            if not fx.get('panel'):
                for pc in fx.get('prefixCalls', []):
                    fn = pc['fn']
                    for ff in eb['files']:
                        f2 = files.get(ff, {})
                        if fn and re.search(r'export\s+(?:function|const)\s+' + re.escape(fn) + r'\b', read(ff)):
                            for s in f2.get('prefixSuffixes', []):
                                canvas.add((pc['prefix'] + s) if pc['prefix'] else lower_first(s))
                            # helper reading attributes.X directly
                            canvas |= set(f2.get('memberReads', [])) | set(f2.get('destructured', []))
                    if fn in ('typographyAttrKeys',):
                        pass
        # declared-name closure for controls: a literal prefix in edit.js or a
        # panel file + a suffix some reached file builds = a declared attribute
        declared = set(bjson.get('attributes', {}).keys())
        all_sfx = set()
        for fx in efiles:
            all_sfx |= set(fx.get('prefixSuffixes', []))
        for fx in efiles:
            if fx is edit or fx.get('panel'):
                for L in fx.get('literals', []):
                    if L in declared:
                        control.add(L)
                    if re.fullmatch(r'[a-z][A-Za-z0-9]*', L):
                        for S in all_sfx:
                            if L + S in declared:
                                control.add(L + S)
        # util helpers called with `attributes` from canvas files
        edit_src = read(eb['edit']) if eb['edit'] else ''
        for ff in eb['files']:
            if '/utils/' in ff.replace('\\', '/'):
                src2 = read(ff)
                for m in re.finditer(r'export\s+(?:function|const)\s+(\w+)', src2):
                    if re.search(r'\b' + m.group(1) + r'\s*\(\s*(?:attributes|\{\s*\.\.\.attributes)', edit_src):
                        canvas |= set(files.get(ff, {}).get('memberReads', [])) | set(files.get(ff, {}).get('destructured', []))
        provides = bjson.get('providesContext', {}) or {}
        ctx_consumed = {}
        for key, attr in provides.items():
            consumers = uses_ctx.get(key, set())
            ok = []
            for cb in consumers:
                cdir = bj[cb][0]
                csrc = ''.join(read(p) for p in glob.glob(cdir + '/**/*.js', recursive=True) + glob.glob(cdir + '/**/*.php', recursive=True))
                if key in csrc:
                    ok.append(cb)
            ctx_consumed[attr] = (key, sorted(consumers), ok)
        block_cache[block] = dict(texts=texts, derived=derived, ssr=ssr, control=control, canvas=canvas, editor_cps=editor_cps, ctx=ctx_consumed, editor_lits=editor_lits)

    def classify_paint(block, attr, css_property, role):
        c = calib.get(block, {})
        if attr in c.get('settings', {}) or attr in c.get('discovered', {}):
            return True, 'calibrated'
        if css_property:
            return True, 'db-css-property'
        if attr in c.get('dead', []) or attr in c.get('noMarker', []):
            return True, 'calibration-candidate'
        return False, role or 'no-role'

    for r in sgs_rows:
        block, attr, atype, css_property, css_element, css_state, role, tier_shape, box_family, source = r
        if block not in block_cache:
            continue
        bc = block_cache[block]
        is_paint, why = classify_paint(block, attr, css_property, role)
        rec = {'block': block, 'attr': attr, 'type': atype, 'css_property': css_property, 'css_state': css_state, 'role': role, 'tier_shape': tier_shape, 'box_family': box_family, 'paint': is_paint, 'paint_basis': why}
        if not is_paint:
            rec['class'] = 'not-paint'
            results.append(rec)
            continue
        d = dump.get((block, attr), {})
        fe_read = bool(d.get('renderConsumed')) or attr in bc['derived']
        rec['fe_via'] = d.get('renderVia') if d else ('prefix-helper' if attr in bc['derived'] else None)
        ch = channel_for(attr, bc['texts'])
        if attr in bc['derived']:
            for h in bc['derived'][attr]:
                hc = helper_channel(h)
                ch['decl'] = True
                ch['helpers'].add(h)
                ch['cp'] |= hc['cp'] & set()  # helper CPs are internal to the helper; not attr-specific
        # tier / box siblings: base attr name carries the channel for Tablet/Mobile tiers
        base = re.sub(r'(Tablet|Mobile|Desktop|Hover|Unit)$', '', attr)
        if not (ch['cp'] or ch['decl'] or ch['classes']) and base != attr:
            ch2 = channel_for(base, bc['texts'])
            for k in ('cp', 'classes', 'helpers'):
                ch[k] |= ch2[k]
            ch['decl'] = ch['decl'] or ch2['decl']
        channel = []
        if ch['decl']:
            channel.append('DECL')
        if ch['cp']:
            channel.append('CP')
        if ch['classes']:
            channel.append('CLASS')
        rec['channel'] = channel
        rec['cps'] = sorted(ch['cp'])[:6]
        rec['helpers'] = sorted(ch['helpers'])[:6]
        ctx = bc['ctx'].get(attr)
        ctl = attr in bc['control']
        canvas_mode = None
        if bc['ssr']:
            canvas_mode = 'ssr'
        elif attr in bc['canvas']:
            canvas_mode = 'direct'
        elif ctx and ctx[2]:
            canvas_mode = 'context'
        rec['control'] = ctl
        rec['canvas'] = canvas_mode
        if ctx:
            rec['context'] = {'key': ctx[0], 'usesContext': ctx[1], 'consumersReading': ctx[2]}
        # consumer + parity for CP channel
        missing = []
        if not ctl:
            missing.append('L2-control')
        if not canvas_mode:
            missing.append('L3-canvas')
        if not fe_read:
            missing.append('L4-frontend-read')
        elif not channel:
            missing.append('L5-channel')
        cp_info = {}
        if ch['cp']:
            readers_all = []
            for cp in ch['cp']:
                rd = cp_readers.get(cp, [])
                # PHP-built readers
                php_read = any(('var(' + cp) in t or ("var( " + cp) in t for t in bc['texts'])
                readers_all.append((cp, rd, php_read))
            unread = [cp for cp, rd, pr in readers_all if not rd and not pr]
            if unread and len(unread) == len(readers_all) and not ch['decl']:
                missing.append('L6-consumer')
            # child-block-conditional consumer
            cond = []
            for cp, rd, pr in readers_all:
                if rd and not pr:
                    subj_child = []
                    for f, sel in rd:
                        parts = [s.strip() for s in sel.split(',')]
                        allc = True
                        for s in parts:
                            s2 = re.sub(r':where\(\s*|\s*\)$', '', s).strip()
                            toks = re.split(r'\s*[>+~]\s*|\s+', s2)
                            last = toks[-1] if toks else ''
                            if not (len(toks) > 1 and root_class_re.search(last)):
                                allc = False
                        subj_child.append(allc)
                    if subj_child and all(subj_child):
                        cond.append(cp)
            if cond and len(cond) == len(readers_all):
                missing.append('C1-child-conditional-consumer')
            # editor parity
            if canvas_mode == 'direct' and not (set(ch['cp']) & bc['editor_cps']):
                missing.append('L7-editor-var-parity')
            cp_info = {cp: {'css_readers': len(rd), 'php_reader': pr} for cp, rd, pr in readers_all}
        if ch.get('child_sel') and 'C1-child-conditional-consumer' not in missing:
            missing.append('C1-child-conditional-consumer')
            rec['child_sel'] = ch['child_sel']
        rec['cp_info'] = cp_info
        rec['missing'] = missing
        if not missing:
            rec['class'] = 'full'
        elif not fe_read and not ctl and not canvas_mode:
            rec['class'] = 'no-pattern'
        else:
            rec['class'] = 'partial'
        # fingerprint label
        fp = []
        if attr in bc['derived']:
            fp.append('F2-prefix-helper')
        if rec.get('fe_via') == 'shared-include':
            fp.append('F3-shared-wrapper/include')
        if 'CP' in channel:
            fp.append('F4-custom-property')
        if 'CLASS' in channel:
            fp.append('F5-class-modifier')
        if tier_shape == 'tier_object' or box_family:
            fp.append('F6-tier/box')
        if css_state == 'hover' or attr.endswith('Hover'):
            fp.append('F7-hover-state')
        if canvas_mode == 'ssr':
            fp.append('F9-ssr')
        if canvas_mode == 'context' or rec.get('fe_via') == 'block-context':
            fp.append('F10-context')
        if not fp and 'DECL' in channel:
            fp.append('F1-direct-scoped-decl')
        rec['fingerprint'] = fp
        results.append(rec)

    # ---------------- extension attributes (per attribute, not per block)
    roster = json.load(open(PB + '/src/blocks/extensions/extension-roster.json', encoding='utf-8'))['extensions']
    ext_results = []
    inc_texts = [strip_php_comments(read(f)) for f in glob.glob(PB + '/includes/**/*.php', recursive=True)]
    ext_files = {f.replace('\\', '/'): files.get(f, {}) for f in ef['extensions']}
    for ext in roster:
        efile = PB + '/src/blocks/extensions/' + ext['file']
        efile_n = efile.replace('\\', '/')
        # editor facts for the whole extension directory family (attributes.js + panels + index)
        fam_dir = os.path.dirname(efile_n)
        fam = [v for k, v in ext_files.items() if k.startswith(fam_dir + '/') and (fam_dir.endswith('hover-effects') or k == efile_n)]
        if not fam_dir.endswith('hover-effects'):
            fam = [v for k, v in ext_files.items() if k == efile_n]
        fam_src = ''.join(read(v.get('file', '')) for v in fam)
        has_blb = 'editor.BlockListBlock' in fam_src
        for attr, spec in (ext.get('attributes') or {}).items():
            ctl = any(attr in v.get('setKeys', []) or attr in v.get('literals', []) for v in fam)
            canvas = has_blb and any(attr in v.get('outside', []) for v in fam)
            fe = any(re.search(r"""['"]""" + attr + r"""['"]""", t) for t in inc_texts)
            ch = channel_for(attr, inc_texts) if fe else {'cp': set(), 'decl': False, 'classes': set(), 'helpers': set()}
            paint = bool(spec.get('css_property')) or bool(ch['cp'] or ch['classes'])
            missing = []
            if not ctl:
                missing.append('L2-control')
            if not canvas:
                missing.append('L3-canvas(editor.BlockListBlock)')
            if not fe:
                missing.append('L4-frontend(render_block filter)')
            ext_results.append({'extension': ext['file'], 'attr': attr, 'paint': paint, 'control': ctl, 'canvas_blb': canvas, 'fe': fe, 'channel': [k for k, v in (('DECL', ch['decl']), ('CP', ch['cp']), ('CLASS', ch['classes'])) if v], 'missing': missing, 'class': ('not-paint' if not paint else ('full' if not missing else 'partial'))})

    rep = {'attributes': results, 'extensions': ext_results}
    json.dump(rep, open(os.path.join(OUT, 'fingerprint-report.json'), 'w', encoding='utf-8'), indent=1, default=list)

    # ---------------- summary
    cls = Counter(r['class'] for r in results)
    print('SGS block attributes scanned:', len(results), dict(cls))
    paint = [r for r in results if r['paint']]
    print('paint basis:', dict(Counter(r['paint_basis'] for r in paint)))
    print('missing-link counts (paint attrs):', dict(Counter(m for r in paint for m in r.get('missing', []))))
    print('canvas mode:', dict(Counter(r.get('canvas') for r in paint)))
    print('channel:', dict(Counter('+'.join(r.get('channel', [])) or 'none' for r in paint)))
    print('fingerprints:', dict(Counter(f for r in paint for f in r.get('fingerprint', []))))
    cal = [r for r in paint if r['paint_basis'] == 'calibrated']
    print('calibrated (known-good FE) attrs:', len(cal), dict(Counter(r['class'] for r in cal)), dict(Counter(m for r in cal for m in r.get('missing', []))))
    print('not-paint roles:', dict(Counter(r['paint_basis'] for r in results if not r['paint']).most_common(12)))
    ec = Counter(r['class'] for r in ext_results)
    print('extension attrs:', len(ext_results), dict(ec), dict(Counter(m for r in ext_results if r['paint'] for m in r['missing'])))
    if '--container' in sys.argv:
        for r in results:
            if r['block'] == 'sgs/container' and r['attr'].startswith('gridItem'):
                print(json.dumps(r, default=list))


if __name__ == '__main__':
    main()
