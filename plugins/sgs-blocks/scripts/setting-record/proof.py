"""Prove each placement the run found with the cascade, and decide its kind.

For an entry (setting, part, props, state, tiers), every pair of renders behind it (the plain render and the render
with the setting changed) is built into a page, the entry's state held true and its media conditions set (forced colours,
reduced motion), and the entry's properties are computed on the part's elements at each screen width its tiers allow.

  proved       a property differs between the plain and the changed page on the part (or the part is drawn only in
               the changed page)
  re-filed     no difference on the named part, but the same properties differ on another part: the entry moves there
  removed      the part is drawn and the entry's own rule matches it, yet nothing differs on any part: the rule loses
               to a stronger one (its winner is reported) or the change never reaches the part
  blind        the proof cannot see what decides it, so the entry is kept and the cause is named: the part is not in
               the server render (built by a script, switched off, printed at wp_footer, printed by another block or the
               theme), the entry's rule needs a class or attribute no render here carries, its state is one the proof
               cannot hold, or its container query cannot be evaluated

Before an entry is called blind, these mechanisms try to settle it (each general, none names a block):
  theme        the theme's CSS is the lowest author sheet of every page (theme.py), so a theme custom property is defined
  underlay     a declaration the setting switches on that computes to the plain value (inherit, none, a floor) is tried over
               two sentinel rules (one on the part, a different one on its ancestors): proved when it now differs
  completion   a missing part, class or attribute is printed by the setting the source scanner says decides it, as an
               extra pair of renders, and the entry is proved on that pair
  dead part    a class no source prints (the scanner, the block's code and the whole plugin and theme searched) styles
               nothing: the entry is removed and the class is listed as a block fault
  states       `filled` (inputs given a value) and a class token (`.is-detached`) are held; `checked`, `disabled` and the
               other markup-decided states follow the markup
  container    `@container` preludes are evaluated at the block's content width at each screen width (the page frame's)

Kind: `value` when the changed computed value carries the setting's own value (as written, or as the browser writes it:
a hex colour as rgb(), a number as px or seconds), else `switched-on` (always for a true/false setting).
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import sys
from functools import lru_cache
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parent / 'block-source-scan'))
import cascade as C  # noqa: E402
import computed as CP  # noqa: E402
import diff as D  # noqa: E402
import instances as I  # noqa: E402
import render as RN  # noqa: E402
import scriptsets as SS  # noqa: E402
import reference as R  # noqa: E402
import vocab as V  # noqa: E402
sys.path.insert(0, str(HERE.parent / 'lib'))
import block_source_files as BSF  # noqa: E402
import soupsieve as sv  # noqa: E402

WIDTHS = R.WIDTHS  # the reference's breakpoint widths (block-source-scan/reference.py)
TIER_WIDTH = dict(zip(('mobile', 'tablet', 'desktop'), sorted(R.WIDTHS)))
HOLDABLE = {name for name, _ in R.STATE_WORDS} | set(V.EXTRA_STATES)


def holdable(state) -> bool:
    """A state the proof can hold: a reference state, `filled`, or a class token (`.is-detached`: the element carries it)."""
    return state in HOLDABLE or bool(re.fullmatch(r'\.[\w-]+', state or ''))


def load_theme(run: dict) -> tuple:
    """(theme css, page layout, error): the theme's CSS and the page frame's measurements from theme.py, or the run's own
    `theme_css` / `layout` keys (a test or a caller that already holds them). Nothing is loaded when the plugin has no
    theme beside it; the error says why, and every entry that needed the theme then keeps its cause."""
    if 'theme_css' in run or 'layout' in run:
        return run.get('theme_css', ''), run.get('layout'), None
    root = Path(run['plugin']).resolve().parents[1]
    if not (root / 'theme' / 'sgs-theme' / 'theme.json').is_file():
        return '', None, f'no theme folder at {root}'
    try:
        import theme as TH  # imported when needed, so a checkout without theme.py still runs
        return TH.theme_css(root), TH.layout(root), None
    except Exception as ex:  # noqa: BLE001 - reported in the proof's report, never silent
        return '', None, f'{type(ex).__name__}: {str(ex)[:200]}'


def frame_widths(layout, widths=None) -> dict:
    """The width a block's container has at each screen width: the page's content size, or the screen less the root
    padding on both sides when that is narrower ({375: px, 768: px, 1440: px}); empty when the layout is unknown. A width
    other than the three sampled ones takes the root padding of its tier (theme.layout: below 768 the mobile gutter, below
    1024 the tablet one, then the desktop one)."""
    if not layout:
        return {}
    pad = layout.get('rootPadding') or {}
    out = {}
    for w in (widths or WIDTHS):
        key = min(WIDTHS) if w < 768 else sorted(WIDTHS)[1] if w < 1024 else max(WIDTHS)
        p = pad.get(key, pad.get(str(key)))
        if p is not None and layout.get('contentSize'):
            out[w] = min(float(layout['contentSize']), w - 2 * float(p))
    return out


# The screen widths the probe covers: a phone held narrow to a wide desktop.
PROBE_RANGE = (320, 1600)
_WIDTH_TEST = re.compile(r'(min|max)-width\s*:\s*([\d.]+)px')


def width_breaks(css_texts, frame_all) -> list:
    """Every screen width at which a rule of these sheets starts or stops applying: each `min-width` / `max-width` of an
    `@media` prelude as it stands, and each of an `@container` prelude as the screen width whose container (frame_all)
    first passes it. Sorted, inside PROBE_RANGE."""
    out = set()
    for text in css_texts:
        for at, prelude in re.findall(r'@(media|container)([^{;]*)\{', text or ''):
            for _, n in _WIDTH_TEST.findall(prelude):
                v = float(n)
                if at == 'media':
                    out.add(v)
                else:
                    cross = next((w for w in sorted(frame_all) if frame_all[w] >= v), None)
                    if cross is not None:
                        out.add(float(cross))
    return sorted(v for v in out if PROBE_RANGE[0] < v < PROBE_RANGE[1])


def tier_ranges(tiers) -> list:
    """[(lo, hi)] screen widths an entry's tiers cover: each comma alternative of each `@media` tier with its min and max
    width; the whole PROBE_RANGE for no tiers or a tier that tests no width; an alternative whose min passes its max is empty."""
    ranges = []
    for t in tiers or ():
        t = str(t).strip()
        if not t.startswith('@media'):
            continue
        for alt in C.split_list(t[len('@media'):]):
            lo, hi = PROBE_RANGE
            for kind, n in _WIDTH_TEST.findall(alt):
                if kind == 'min':
                    lo = max(lo, float(n))
                else:
                    hi = min(hi, float(n))
            if lo <= hi:
                ranges.append((lo, hi))
    return ranges or ([PROBE_RANGE] if not any(str(t).strip().startswith('@media') for t in tiers or ()) else [])


def probe_widths(tiers, breaks, sampled) -> list:
    """Screen widths between the sampled ones where a rule may apply that none of them sees: inside each range the tiers
    cover, the midpoint of every stretch between two breakpoints (or a breakpoint and the range's edge) that holds no
    sampled width. A midpoint, not a width beside the breakpoint, so a root padding a pixel or two off still lands inside."""
    out = set()
    for lo, hi in tier_ranges(tiers):
        points = sorted({lo, hi} | {b for b in breaks if lo < b < hi})
        for a, b in zip(points, points[1:]):
            if b - a < 4 or any(a < w < b for w in sampled):
                continue
            out.add(int((a + b) // 2))
    return sorted(out)


class Pages:
    """Pages built from cached renders, shared by every entry that names them. The theme's CSS is the lowest author
    sheet (ahead of the block's own), so a value that reads a theme custom property is defined."""

    def __init__(self, short: str, run: dict, with_theme: bool = True):
        self.short = short
        self.run = run
        css, layout, err = load_theme(run)
        self.theme = {'loaded': bool(css), 'error': err}
        if not with_theme:
            css = ''
        self.frame = frame_widths(layout)
        # the container's width at every screen width the probe can ask for (probe_widths)
        self.frame_all = frame_widths(layout, range(PROBE_RANGE[0], PROBE_RANGE[1] + 1))
        # the block drawn inside its fixture's parents (a menu in a header row), so a rule scoped by the parent matches
        self.shell = parent_shell(run)
        parents = self.shell.get('blocks') or [p['name'].split('/', 1)[1] for p in self.shell['parents']]
        files = sorted(set(D.sheet_files(run['plugin'], short, run['children'])) | {f for b in parents for f in D.sheet_files(run['plugin'], b, [])})
        texts = [f.read_text(encoding='utf-8', errors='ignore') for f in files]
        self.base = CP.Page.static_rules(([css] if css else []) + texts)
        # static_rules numbers the user-agent sheet from 0 and each sheet after it from 10,000 in steps of 100,000: the
        # theme (the first sheet) holds the rules numbered in this range
        self.theme_orders = range(10_000, 110_000) if css else range(0)
        self.memo = {}
        self.aliases = {}
        self.subject_memo = {}
        # every custom property the block's own stylesheets or any of its renders declare (not the theme's: a theme
        # property that is not in force on the element is still undefined for the block)
        self.known = set(re.findall(r'(--[\w-]+)\s*:', ' '.join(texts)))
        self.breaks = width_breaks(([css] if css else []) + texts + [self.shell['css']] + [r.get('css', '') for r in run['results'].values()], self.frame_all)
        for res in run['results'].values():
            self.known |= set(re.findall(r'(--[\w-]+)\s*:', res.get('css', '') + ' ' + res.get('html', '')))

    def add_job(self, job: str, attrs: dict, res: dict) -> None:
        """Register a render made during the proof (a completion's pair, a second test value)."""
        self.run['results'][job] = res
        self.run['jobs'][job] = attrs
        self.known |= set(re.findall(r'(--[\w-]+)\s*:', res.get('css', '') + ' ' + res.get('html', '')))

    def get(self, job: str, held=(), conditions=frozenset(), underlay=None, tokens=()):
        k = (job, frozenset(held), frozenset(conditions), (underlay[0], tuple(underlay[1])) if underlay else None, tuple(tokens))
        if k not in self.memo:
            res = self.run['results'][job]
            html = self.shell['before'] + res.get('html', '') + self.shell['after']
            self.memo[k] = CP.Page(html, [self.shell['css'], res.get('css', '')], self.short, held=held, conditions=conditions,
                                   base_rules=self.base, underlay=underlay, container_frame=self.frame_all or self.frame, tokens=tuple(tokens),
                                   script_set=script_tokens_of(held))
        return self.memo[k]

    def alias(self, job: str):
        """sel -> sel for one render: each instance-id class the render prints also counts as the block class diff.uid_map
        gives it. The entries' selectors are written with the block class where the render prints `.sgs-x-1a2b3c4d` (diff.read
        folds the id into the class so two renders compare), so a selector is matched against the raw page by letting
        `.sgs-x` also name the elements that carry that id."""
        if job not in self.aliases:
            groups = {}
            for tok, cls in D.uid_map(self.run['results'][job].get('html', ''), self.short).items():
                if tok != cls:
                    groups.setdefault(cls, []).append(tok)
            self.aliases[job] = groups
        groups = self.aliases[job]

        def widen(sel: str) -> str:
            for cls, toks in groups.items():
                sel = re.sub(r'\.' + re.escape(cls) + r'(?![\w-])', ':is(' + ','.join('.' + t for t in [cls] + sorted(toks)) + ')', sel)
            return sel
        return widen

    def subjects(self, job: str, selectors, held, conds=frozenset()) -> list:
        """[(element, pseudo)] the entry's own rules select in this render (the rule's subject, which is the named part or a
        child of it), the alias widening applied; memoised per render, selector and held set."""
        out, seen = [], set()
        widen = None
        for sel in sorted(selectors):
            k = (job, frozenset(held), frozenset(conds), sel)
            if k not in self.subject_memo:
                widen = widen or self.alias(job)
                page = self.get(job, held, conds)
                pseudo = selector_pseudo(sel)
                try:
                    hits = sv.select(widen(C.resting(_strip_pseudo(sel), held)), page.soup)
                except Exception:  # noqa: BLE001 - a selector soupsieve cannot read selects nothing here
                    hits = []
                self.subject_memo[k] = [(el, pseudo) for el in hits]
            for el, pseudo in self.subject_memo[k]:
                if (id(el), pseudo) not in seen:
                    seen.add((id(el), pseudo))
                    out.append((el, pseudo))
        return out


CHILD_MARK = '<!--sgs-setting-record-child-->'


def parent_shell(run: dict) -> dict:
    """The markup and CSS of the fixture's `parents` (outermost first) around the block: each parent rendered through its
    own render.php with the next one inside it as its content, the innermost holding a marker where the block goes. A
    parent's `siblings` ([{name, attributes, content?}]) are rendered and placed after the block inside that parent (a
    button beside the menu in a header row, for the rules that reach the row's other controls).
    {'before', 'after', 'css', 'parents', 'blocks', 'error'}: `blocks` names every block drawn around the block (its sheets
    load too); empty strings when the fixture names no parents or one fails to render."""
    out = {'before': '', 'after': '', 'css': '', 'parents': [], 'blocks': [], 'error': None}
    fixture = (run.get('plan') or {}).get('fixture') or {}
    parents = fixture.get('parents') or []
    rn = run.get('renderer')
    if not parents or rn is None:
        return out
    plugin = Path(run['plugin'])
    content, css, blocks = CHILD_MARK, [], []
    for p in reversed(parents):
        name = p['name']
        short = name.split('/', 1)[1]
        try:
            attrs = RN.with_defaults(plugin, short, RN.fill(p.get('attributes') or {}))
        except OSError as exc:
            out['error'] = f'{name}: {exc}'
            return out
        for sib in p.get('siblings') or []:
            sshort = sib['name'].split('/', 1)[1]
            try:
                sres = rn.render(sib['name'], RN.with_defaults(plugin, sshort, RN.fill(sib.get('attributes') or {})), sib.get('content', ''))
            except OSError as exc:
                out['error'] = f'{sib["name"]}: {exc}'
                return out
            if not sres.get('ok'):
                out['error'] = f'{sib["name"]}: ' + (sres.get('error') or 'did not render')[:200]
                return out
            content += sres.get('html', '')
            css.insert(0, sres.get('css', ''))
            blocks.append(sshort)
        blocks.append(short)
        res = rn.render(name, attrs, content)
        if not res.get('ok') or CHILD_MARK not in res.get('html', ''):
            out['error'] = f'{name}: ' + (res.get('error') or 'its render does not print its content')[:200]
            return out
        content = res['html']
        css.insert(0, res.get('css', ''))
    before, _, after = content.partition(CHILD_MARK)
    out.update(before=before, after=after, css='\n'.join(css), parents=parents, blocks=blocks)
    return out


def leaves(v) -> list:
    if isinstance(v, dict):
        return [x for y in v.values() for x in leaves(y)]
    if isinstance(v, list):
        return [x for y in v for x in leaves(y)]
    if isinstance(v, bool) or v is None:
        return []
    return [str(v)]


def value_forms(raw: str) -> set:
    """A setting's value as written and as the browser writes it."""
    v = raw.strip().lower()
    out = {v} if len(v) >= 2 or v.isdigit() else set()
    c = CP.parse_colour(v, (0, 0, 0, 1)) if v.startswith('#') else None
    if c:
        out.add(CP.fmt_colour(c).lower())
    if re.fullmatch(r'-?[\d.]+', v):
        out |= {f'{v}px', CP.fmt_time(f'{v}ms').lower()}
    m = re.fullmatch(r'(-?[\d.]+)ms', v)
    if m:
        out.add(CP.fmt_time(v).lower())
    return {x for x in out if x not in ('0', '0px', 'none', 'auto', 'true', 'false', '')}


def tier_value(setting_value, width: int):
    """The part of a per-device value that applies at a width (desktop carries down when a tier is unset)."""
    if isinstance(setting_value, dict) and set(setting_value) & set(TIER_WIDTH):
        order = [t for t, w in sorted(TIER_WIDTH.items(), key=lambda x: -x[1]) if w >= width]
        for t in reversed(order):
            if t in setting_value and setting_value[t] not in (None, '', {}):
                return setting_value[t]
        return None
    return setting_value


def part_of_element(page, el) -> str | None:
    if el is page.root:
        return 'ROOT'
    classes = [c for c in (el.get('class') or []) if c.startswith('sgs-') and '__' in c and '--' not in c]
    if not classes:
        return None
    return min(classes, key=lambda c: (len(c), c))


def longhands(props) -> list:
    """The names the calculator stores a property under: a shorthand as its longhands (border-width as
    border-top-width ..., margin as margin-top ..., text-decoration as text-decoration-line ...)."""
    out = {lh for p in props for lh in CP.expand(p, 'initial')}
    if 'border-radius' in out:  # the calculator keeps a corner written on its own under its own name
        out |= {f'_border-{c}-radius' for c in ('top-left', 'top-right', 'bottom-right', 'bottom-left')}
    return sorted(out)


# Dynamic pseudo-classes nothing in the render can decide (the browser or the visitor does): the proof holds none of them.
# The markup-decided ones (:checked, :placeholder-shown, :required, :empty, ...) follow the markup, and `filled` is held
# by giving the inputs a value.
UNNAMED_STATE = re.compile(r':(user-invalid|user-valid|autofill|-webkit-autofill|invalid|valid|target|visited|playing|paused|fullscreen|modal|popover-open)(?![\w-])')


def unnamed_states(selectors) -> list:
    """Dynamic pseudo-classes in the entry's rules that the proof cannot hold (the record's state names, `filled` and
    the markup-decided ones are held or read from the markup)."""
    return sorted({f':{m.group(1)}' for s in selectors for m in UNNAMED_STATE.finditer(s) if m.group(1) not in HOLDABLE})


def outside_vars(page, el, pse, names, width, conds, known, with_known=False, kinds=None) -> set:
    """Custom properties the winning declarations for these names read that the element does not inherit and that no
    stylesheet of the block, no render of it and no rule of the theme sheet in force ever declares (`known` is the block's
    own; the theme's reach the element through `custom`): their values come from a client's tokens, a parent block or a
    script, which the proof lacks, so no difference between the pages is no proof of none. A block's own optional custom
    property is known, so its fallback is what the block really draws; a property with a fallback that nothing here defines
    is still unknown, because a client site defines it. With `with_known`, a property of the block's own that this page
    leaves undefined is listed too: another setting of the block defines it (a motion setting's `--sgs-nav-item-motion`),
    so a setting that switches whether it is read is tested with a placeholder for it (token_test)."""
    custom = page.computed(el, pse, width)['_custom']
    out = set()
    decls = page.cascade.declared(el, pse, width, frozenset(conds))
    for name in names:
        win = [d for d in decls if name in CP.expand(d[1], d[2]) or d[1] == name]
        reader = name
        if win:
            todo, seen = re.findall(r'var\(\s*(--[\w-]+)', win[-1][2]), set()
            while todo:
                v = todo.pop()
                if v in seen:
                    continue
                seen.add(v)
                if v in custom:
                    # a property the element has, defined as another variable (a preset class's `--x: var(--wp--custom--y)`):
                    # the value is only as defined as that variable is
                    todo += re.findall(r'var\(\s*(--[\w-]+)', custom[v] or '')
                elif with_known or v not in known:
                    out.add(v)
                if kinds is not None:
                    # the property whose value the token ends up in: its placeholder takes that property's kind
                    kinds.setdefault(v, reader)
    return out


def conditions_of(tiers) -> set:
    """The conditions to set so each tier holds: for each tier, those named by its first query that names one and is
    not negated (`not print` needs no condition; `(forced-colors: active), print` needs forced colours only)."""
    out = set()
    for t in tiers:
        body = re.sub(r'^@\w+\s*', '', t.strip())
        for q in C.split_list(body):
            q = q.strip().lower()
            if q.startswith('not '):
                continue
            named = {name for name, rx in C.CONDITIONS.items() if rx.search(q)}
            if named:
                out |= named
                break
    return out


SCRIPT_HOLD = 'script:'
HOLD_SEP = '\x1f'


def script_hold(tok: dict) -> str:
    """A script-set token as a `held` entry (`script:` then kind, name and landing joined by HOLD_SEP): the page puts it on
    its landing elements (computed.Page `script_set`), so the rule that waits on it can match. HOLD_SEP is a control
    character, so an attribute name with a colon (`xlink:href`) or a landing selector with one (`:not(...)`) reads back whole."""
    return SCRIPT_HOLD + HOLD_SEP.join((tok['kind'], tok['name'], str(tok['landing'])))


def script_tokens_of(held) -> tuple:
    """((kind, name, landing), ...) for the `script:` entries of a held set."""
    out = []
    for h in sorted(held):
        if h.startswith(SCRIPT_HOLD):
            kind, name, landing = h[len(SCRIPT_HOLD):].split(HOLD_SEP, 2)
            out.append((kind, name, landing if landing != 'None' else None))
    return tuple(out)


def selector_pseudo(sel: str):
    """The pseudo-element a selector ends in (`before`, `after`, ...), or None."""
    m = list(C.PSEUDO_EL.finditer(sel.strip()))
    return m[-1].group(1) if m and m[-1].end() == len(sel.strip()) else None


def printed_by_server(run, pairs, tok: dict) -> bool:
    """Whether any render of the entry's pairs already carries the token (the class in a class attribute, the attribute on a
    tag): the server prints it, so which page has it is the setting's doing and is read as rendered, never held."""
    if tok['kind'] == 'class':
        pat = re.compile(r'\bclass\s*=\s*["\'][^"\']*(?<![\w-])' + re.escape(tok['name']) + r'(?![\w-])')
    else:
        pat = re.compile(r'<[a-zA-Z][^<>]*\s' + re.escape(tok['name']) + r'(?:\s*=|[\s/>])')
    for b, c in pairs:
        for j in (b, c):
            if pat.search((run['results'].get(j) or {}).get('html', '')):
                return True
    return False


def script_holds(run, short: str, selectors, held, pairs=()) -> set:
    """The `held` entries that make each token a front-end script sets (scriptsets.py) true for these rules: a class or
    attribute the rule waits on that some script writes is put on the elements the script puts it on (its landing selector),
    or, with no landing, held as a state (a class token the rule's selector then reads as always there). A token the entry's
    own state already holds is left to that state. A token the server already prints in a render of the entry's pairs is
    never held: the script toggles it, but the server decides it here (hideWhenEmpty prints `sgs-cart--hidden-empty`,
    which view.js also toggles), and holding it on both pages would erase the setting's own difference."""
    out = set()
    toks = SS.scan(tuple((r, t) for r, t in corpus(str(run['plugin'])) if r.endswith(('.php', '.js', '.mjs'))))
    for tok in SS.needed_by(selectors, toks):
        if f'.{tok["name"]}' in held or printed_by_server(run, pairs, tok):
            continue
        if tok['landing']:
            out.add(script_hold(tok))
        elif tok['kind'] == 'class':
            out.add(f'.{tok["name"]}')
    return out


def _values(page, lst, names, widths) -> dict:
    return {(w, n): [page.value(x, pse, n, w) for x, pse in lst] for w in widths for n in names}


def counterparts(page, elements) -> list:
    """[(element, pseudo)] of `page` that are the same elements as `elements` (of the other render): the same tag carrying
    every class the element carries apart from instance ids and modifiers (`--x`), in document order. A rule the setting
    switches off matches its subject on one side only; the other side's copy of that element is what the paint left."""
    out, seen = [], set()
    for el, pse in elements:
        keep = sorted(c for c in (el.get('class') or []) if '--' not in c and not D.UID_RE.fullmatch(c))
        sel = el.name + ''.join('.' + c for c in keep)
        try:
            hits = page.soup.select(sel)
        except Exception:  # noqa: BLE001 - a class soupsieve cannot read matches nothing
            hits = []
        for h in hits:
            if (id(h), pse) not in seen:
                seen.add((id(h), pse))
                out.append((h, pse))
    return out


def compare_lists(pb, pc, lb, lc, names, widths) -> list:
    """[(property, width, plain value, changed value)] where two lists of elements (the plain render's, the changed
    render's) differ. Lists of the same length are compared element by element in order. Lists of different lengths are
    compared by the values they hold: a value only one side has differs (an element the setting adds or takes away, such as a
    second burger drawn only when detached, is compared too), and an extra element that repeats a value the other side has
    shows nothing. An empty list on one side only is the caller's (the part or the rule's subject is drawn only on one side)."""
    diffs = []
    if not lb or not lc:
        return diffs
    if len(lb) == len(lc):
        for (xb, pse), (xc, _) in zip(lb, lc):
            for w in widths:
                for prop in names:
                    vb, vc = pb.value(xb, pse, prop, w), pc.value(xc, pse, prop, w)
                    if vb != vc:
                        diffs.append((prop, w, vb, vc))
        return diffs
    for w in widths:
        for prop in names:
            vb = [pb.value(x, pse, prop, w) for x, pse in lb]
            vc = [pc.value(x, pse, prop, w) for x, pse in lc]
            only_b, only_c = [v for v in vb if v not in vc], [v for v in vc if v not in vb]
            if only_b or only_c:
                diffs.append((prop, w, ', '.join(map(str, dict.fromkeys(only_b or vb))), ', '.join(map(str, dict.fromkeys(only_c or vc)))))
    return diffs


# The removals that rest on reading the part on the page (the winning declaration, a per-device override sweep, a rule
# restating the plain value): each needs a drawn element of the part (part_drawn).
MEASURED_REMOVALS = ('the winning declaration is the same', 'a per-device override tried', 'the setting changes which rule declares')


def part_drawn(pages, pairs, part, held, conds) -> bool:
    """Whether any page of any pair draws an element of the part (not only a selector that matches)."""
    return any(pages.get(j, held, conds).elements(part) for b, c in pairs for j in (b, c))


def scan_pairs(pages, run, setting, part, names, pairs, held, conds, widths, selectors) -> dict:
    """Read every (plain, changed) pair of renders for one entry: whether the part is drawn (`seen_part`), whether the
    entry's own rule matches an element in either render (`matched`), the first pair that proves it (`verdict`, `evidence`,
    `kind`), and the other parts the same properties change on (`refile`).

    A pair proves the entry when a property differs between the renders on the named part's elements or on the rule's own
    subject elements (the elements its selector picks: the part, or a child of it; the selector's instance-id classes widened
    as `Pages.alias` says). The change can go either way: a rule that matches the plain render and not the changed one is the
    setting switching a paint off, and shows as the same difference."""
    r = {'seen_part': False, 'matched': False, 'verdict': None, 'evidence': None, 'kind': None, 'refile': set()}
    for b, c in pairs:
        pb, pc = pages.get(b, held, conds), pages.get(c, held, conds)
        eb, ec = pb.elements(part), pc.elements(part)
        sb, sc = pages.subjects(b, selectors, held, conds), pages.subjects(c, selectors, held, conds)
        if sb or sc:
            r['matched'] = True
        if not (eb or ec or sb or sc):
            continue
        r['seen_part'] = True
        if bool(eb) != bool(ec):
            r.update(verdict='proved', evidence=f'the part is drawn only in the {"changed" if ec else "plain"} render', kind='switched-on')
            return r
        if bool(sb) != bool(sc):
            # the rule matches its subject (a child of the part) on one side only: read the same element on the other side
            if sb:
                sc = counterparts(pc, sb)
            else:
                sb = counterparts(pb, sc)
        diffs = compare_lists(pb, pc, eb, ec, names, widths) + compare_lists(pb, pc, sb, sc, names, widths)
        if diffs:
            r.update(verdict='proved', evidence=[list(map(str, d)) for d in diffs[:3]], kind=kind_of(run, c, b, setting, diffs))
            return r
        r['refile'] |= other_parts(pb, pc, names, widths, part)
    return r


def prove(short: str, run: dict):
    """(entries with kind, report). Entries proved or blind keep their key; re-filed ones move; removed ones go."""
    pages = Pages(short, run)
    plain = Pages(short, run, with_theme=False) if pages.theme['loaded'] else pages
    out, report = {}, {'proved': [], 'refiled': [], 'removed': [], 'blind': [], 'deadParts': [], 'completions': [],
                       'theme': pages.theme, 'frame': pages.frame,
                       'parents': {'names': [p['name'] for p in pages.shell['parents']], 'error': pages.shell['error']}}
    scan = scan_of(run, short)
    dead_seen = {}
    for k, e in run['entries'].items():
        setting, part, props, state, tiers = e['setting'], e['part'], e['props'], e['state'], e['tiers']
        names = longhands(props)
        pairs = sorted(run['pairs'].get(k, ()))
        selectors = run['selectors'].get(k, ())
        held = {state} if state else set()
        held |= script_holds(run, short, selectors, held, pairs)
        conds = conditions_of(tiers)
        widths = sorted(R.tier_widths(tiers) or WIDTHS)
        verdict, evidence, kind, cause, refile = None, None, None, None, set()
        container = [t for t in tiers if t.lstrip().startswith('@container')]
        never_taken = next((t for t in tiers if t.lstrip().startswith('@supports') and not C.supports_holds(t.lstrip()[len('@supports'):])), None)
        nested = None if never_taken else forbidden_nesting(run['plugin'], short, part, pages, pairs)
        if never_taken:
            verdict, evidence = 'removed', (f'the rule sits under `{never_taken.strip()}`, which a current Chromium never takes (cascade.supports_holds: a property test it '
                                            f'implements holds, so the fallback written under `not` never applies); the entry is a fallback for engines the proof does not assume')
        elif nested:
            verdict, evidence = 'removed', nested
        elif state and not holdable(state):
            verdict, cause, evidence = 'blind', 'state-not-holdable', f'state {state} is a token the proof cannot hold'
        elif container and not all(C.container_evaluable('container ' + t.lstrip()[len('@container'):].strip()) for t in container):
            verdict, cause, evidence = 'blind', 'container-query', f'it holds under a container query ({container[0]}) that tests more than the width, which the proof cannot evaluate'
        elif container and not pages.frame:
            verdict, cause, evidence = 'blind', 'container-query', f'it holds under a container query ({container[0]}) and the page frame\'s width is unknown here ({pages.theme["error"] or "no layout given"})'
        else:
            # A difference the block's own sheets already show is a proof as it stands; the theme sheet can only hide it
            # behind a rule whose values it cannot always resolve. Only an entry that is not proved so is judged with the
            # theme loaded.
            r = scan_pairs(plain, run, setting, part, names, pairs, held, conds, widths, selectors)
            if r['verdict'] != 'proved':
                r = scan_pairs(pages, run, setting, part, names, pairs, held, conds, widths, selectors)
            if r['verdict'] is None and not (r['seen_part'] and r['matched']):
                extra = completion(pages, run, scan, setting, part, names, pairs, held, conds, widths, selectors, missing_part=not r['seen_part'])
                if extra:
                    report['completions'].append({'setting': setting, 'part': part, 'with': extra['with']})
                    pairs = pairs + [extra['pair']]
                    r = scan_pairs(pages, run, setting, part, names, pairs, held, conds, widths, selectors)
            if r['verdict'] is None:
                sweep = override_sweep(pages, run, setting, pairs)
                if sweep:
                    # a per-device override: every value of it over every desktop value it can override
                    pairs = pairs + [x for x in sweep if x not in pairs]
                    r = scan_pairs(pages, run, setting, part, names, pairs, held, conds, widths, selectors)
                    report.setdefault('overrideSweeps', {})[setting] = len(sweep)
            seen_part, matched, refile = r['seen_part'], r['matched'], r['refile']
            verdict, evidence, kind = r['verdict'], r['evidence'], r['kind']
            if verdict is None:
                unnamed = unnamed_states(selectors)
                if not seen_part:
                    src = part_source(run['plugin'], short, part, scan)
                    if src['kind'] == 'dead':
                        verdict, evidence = 'removed', src['evidence']
                        d = dead_seen.setdefault(src['token'], {'part': src['token'], 'evidence': src['evidence'], 'entries': 0})
                        d['entries'] += 1
                    else:
                        verdict, cause, evidence = 'blind', src['cause'], f'the part is not in the server render ({src["evidence"]})'
                elif not matched and unnamed:
                    # the rule waits on a state nothing in the render decides (a visitor's or the browser's)
                    verdict, cause, evidence = 'blind', 'state-not-holdable', f'the rule holds in a state the record cannot name ({", ".join(unnamed)}), which the proof cannot hold'
                elif not matched:
                    # the entry's own rule matches no element of the part here: a fixture without that markup, not a wrong entry
                    need = sorted({c for s in selectors for c in C.required_classes(C.resting(_strip_pseudo(s), held))} - _present(pages, pairs, held, conds))
                    verdict, cause, evidence = 'blind', 'rule-needs-absent-markup', f'the rule needs what no render here carries: {need[:4] or sorted(selectors)[:1]}'
                elif refile:
                    verdict, evidence = 'refiled', sorted(refile)
                else:
                    theme, undefined, kinds = set(), set(), {}
                    for b, c in pairs:
                        for j in (b, c):
                            pg = pages.get(j, held, conds)
                            for el, pse in pg.elements(part)[:1]:
                                for w in widths:
                                    theme |= outside_vars(pg, el, pse, names, w, conds, pages.known)
                                    undefined |= outside_vars(pg, el, pse, names, w, conds, pages.known, with_known=True, kinds=kinds)
                    # every property read and undefined here gets a placeholder, the block's own included: the setting may
                    # switch whether a token another setting defines is read
                    token = token_test(pages, pairs, part, names, widths, held, conds, theme | undefined, kinds) if (theme or undefined) else ''
                    scripted = script_set_tokens(run['plugin'], theme) if theme and not token else []
                    if theme and not token and not scripted:
                        # the value comes from a token no page here defines, and the setting does not switch which one is
                        # read: the token's value is the site's, not this setting's, so the entry is judged as any other
                        theme = set()
                    changed_decl = declaration_changes(pages, pairs, part, names, widths, held, conds)
                    probes = [] if theme else [w for w in probe_widths(tiers, pages.breaks, widths) if w not in widths]
                    wide = scan_pairs(pages, run, setting, part, names, pairs, held, conds, probes, selectors) if probes else None
                    if wide and wide['verdict'] != 'proved':
                        wide = None
                    other = None if (theme or wide) else scan_pairs(pages, run, setting, part, names, sibling_pairs(run, setting, pairs), held, conds, widths, selectors)
                    second = '' if (theme or wide or (other and other['verdict'])) else second_value(pages, run, pairs, setting, part, names, widths, held, conds)
                    under = '' if (theme or wide or second or not changed_decl) else underlay_test(pages, pairs, part, names, widths, held, conds)
                    if token:
                        # the setting switches which token the value reads: proved whatever each site's token holds
                        verdict, evidence, kind = 'proved', token, 'switched-on'
                    elif scripted:
                        # a front-end script writes the token (from what the setting printed): only a browser sees its value
                        verdict, cause = 'blind', 'script-set-token'
                        evidence = f'the value reads {scripted[0][0]}, which a front-end script sets ({scripted[0][1]}): the browser pass reads it'
                    elif wide:
                        # the sampled screens miss it: a screen width between two breakpoints shows the setting's paint
                        verdict, kind = 'proved', wide['kind']
                        evidence = f'at a screen width between the sampled ones ({", ".join(map(str, probes))}px probed): {wide["evidence"]}' if isinstance(wide['evidence'], str) else [['probe width', *d] for d in wide['evidence']]
                    elif unnamed and not second:
                        verdict, cause, evidence = 'blind', 'state-not-holdable', f'the rule holds in a state the record cannot name ({", ".join(unnamed)}), which the proof cannot hold'
                    elif other and other['verdict'] == 'proved':
                        # this test value left the property as it was (the plain state already holds it); another value of the setting moves it
                        verdict, kind = 'proved', other['kind']
                        evidence = f'with another test value of the setting: {other["evidence"]}' if isinstance(other['evidence'], str) else [['another test value', *d] for d in other['evidence']]
                    elif second:
                        # a test value under a floor or a coincidence: a second value moves the property
                        verdict, evidence, kind = 'proved', second, 'value'
                    elif under:
                        # the declaration the setting switches on computes to the plain value here, but not over a sentinel
                        verdict, evidence, kind = 'proved', under, 'switched-on'
                    elif changed_decl and _OVERRIDE.match(setting) and report.get('overrideSweeps', {}).get(setting, 0) > 1:
                        # a per-device override tried over every desktop value it can override (override_sweep), the same also over
                        # the underlay: the declaration is written but its value is the one the part already has in every combination
                        verdict, evidence = 'removed', (f'a per-device override tried in {report["overrideSweeps"][setting]} combinations of its values over the values of the setting it '
                                                        f'overrides: the part computes the same in every one, also over a sentinel underlay; the winning declaration changes ({changed_decl}) '
                                                        f'but never its value')
                    elif changed_decl and other_value_tried(run, setting, pairs) and restated_value(pages, pairs, part, names, widths, held, conds):
                        verdict, evidence = 'removed', (f'the setting changes which rule declares the property, not its value ({restated_value(pages, pairs, part, names, widths, held, conds)}; '
                                                        f'{changed_decl}): the rule restates what the plain render already declares, also with a second test value and over a sentinel underlay')
                    elif changed_decl:
                        verdict, cause, evidence = 'blind', 'same-value-here', f'the winning declaration changes ({changed_decl}) but computes to the same value in these renders, also over a sentinel underlay (it inherits, or meets a floor or the initial value)'
                    elif container and not pages.frame_all:
                        # the container's width between the three sampled screens is not seen: no difference here is no proof of none
                        verdict, cause, evidence = 'blind', 'container-query', f'under a container query ({container[0]}): the container is {sorted(set(pages.frame.values()))} px wide at the three screen widths, and the threshold of its rule may sit between them'
                    elif theme_winner(pages, pairs, part, names, widths, held, conds):
                        verdict, cause, evidence = 'blind', 'same-value-here', 'the winning declaration is a rule of the theme in this page frame, the same with and without the setting (' + theme_winner(pages, pairs, part, names, widths, held, conds) + '): another layout would not apply it, so the entry stays'
                    else:
                        # the note reads the last pair whose changed page draws the part (a completion or sibling pair may not)
                        drawn = next((pr for pr in reversed(pairs) if pages.get(pr[1], held, conds).elements(part)), pairs[-1])
                        verdict, evidence = 'removed', 'the winning declaration is the same with and without the setting, also with a second test value: ' + winner_note(pages, drawn, part, names, widths, held, conds)
        if verdict == 'removed' and str(evidence).startswith(MEASURED_REMOVALS) and not part_drawn(pages, pairs, part, held, conds):
            # A removal that says it measured the part (nothing on it moves) needs an element of the part on some page; with
            # none (only a selector matched) nothing was read, so the entry stays, unproven, never removed. Removals that
            # need no element (a rule a browser never applies, a rule that can match nothing, a class no source prints) stand.
            verdict, cause = 'blind', 'part-not-rendered'
            evidence = f'no page draws the part {part} (its rule matched, its element was never found), so the proof read nothing: {evidence}'
        row = {'setting': setting, 'part': part, 'props': props, 'state': state, 'tiers': tiers, 'verdict': verdict, 'evidence': evidence}
        if verdict == 'proved':
            out[k] = {**e, 'kind': kind}
            report['proved'].append(row)
        elif verdict == 'blind':
            row['unproved'] = cause or unproved_slug(str(evidence))
            out[k] = {**e, 'kind': _kind_guess(run, pairs, setting), 'unproved': row['unproved']}
            report['blind'].append(row)
        elif verdict == 'refiled':
            for p in sorted(refile):
                n = {**e, 'part': p}
                n['kind'] = _kind_guess(run, pairs, setting)
                out[(setting, p, tuple(props), state, tuple(tiers))] = n
            report['refiled'].append(row)
        else:
            report['removed'].append(row)
    report['deadParts'] = sorted(dead_seen.values(), key=lambda d: d['part'])
    counts = {v: len(report[v]) for v in ('proved', 'refiled', 'removed', 'blind')}
    counts['byKind'] = {kd: sum(1 for e in out.values() if e.get('kind') == kd) for kd in ('value', 'switched-on')}
    counts['byCause'] = {c: sum(1 for e in out.values() if e.get('unproved') == c) for c in sorted({e['unproved'] for e in out.values() if e.get('unproved')})}
    counts['completions'] = len(report['completions'])
    counts['deadParts'] = len(report['deadParts'])
    report['counts'] = counts
    return out, report


# What the HTML parser takes apart: an `a` start tag inside an open `a`, and a `button` inside an open `button`, close the
# outer element first, so a parsed document never holds either nesting. Other interactive content inside an `a` or a
# `button` is invalid but stays in the tree (and a script can build it), so it is never called dead.
INTERACTIVE = {'a', 'button'}
INTERACTIVE_INSIDE = {'a', 'button'}


def forbidden_nesting(plugin, short: str, part: str, pages, pairs):
    """Evidence (text) that the entry's rule asks for an element no render can put inside the part, or None. The part names a
    tag inside an element (`sgs-x__view a`): when that element is itself an `a` or a `button` (read from any render here, else
    from the PHP template that prints its class) and the tag is the same tag, no render can draw the rule's subject: a parsed
    document never holds an `a` inside an `a` or a `button` inside a `button`. Nor can an element hold a child element when
    every template that prints it fills it with escaped text and no front-end script builds it (text_only_printers). Such a
    rule is dead whatever the setting does."""
    head, _, tag = part.split('::')[0].strip().partition(' ')
    tag = tag.strip()
    if not head.startswith('sgs-') or not re.fullmatch(r'[a-z][a-z0-9]*', tag or ''):
        return None
    outer, where = None, None
    for b, c in pairs[:1]:
        for j in (b, c):
            els = pages.get(j).soup.select('.' + head)
            if els:
                outer, where = els[0].name, 'a render of the block'
                break
    if outer is None:
        pat = re.compile(r'<(a|button)\b[^<>]*?\bclass\s*=\s*["\'][^"\']*(?<![\w-])' + re.escape(head) + r'(?![\w-])')
        for rel, text in corpus(str(plugin)):
            if rel.endswith('.php'):
                m = pat.search(text)
                if m:
                    outer, where = m.group(1), f'the template in {rel}'
                    break
    if outer in INTERACTIVE and outer == tag:
        return (f'dead rule: {part} asks for an `{tag}` inside {head}, which is itself an `{outer}` ({where}); HTML forbids interactive content '
                f'inside an `{outer}`, so no render can draw the rule\'s subject')
    text_only = text_only_printers(str(plugin), short, head)
    if text_only:
        return (f'dead rule: {part} asks for an `{tag}` inside {head}, which holds only escaped text: every template that prints it fills it '
                f'with esc_html() ({"; ".join(text_only)}) and no front-end script builds it, so no render can draw the rule\'s subject')
    return None


_PRINTF = re.compile(r"\b(?:s?printf)\(\s*([\"'])(.*?)(?<!\\)\1\s*,(.*)$")


def _top_args(text: str) -> list:
    """The top-level comma-separated arguments of a call's argument text (up to its closing parenthesis)."""
    out, depth, cur, quote = [], 0, '', None
    for ch in text:
        if quote:
            cur += ch
            if ch == quote:
                quote = None
            continue
        if ch in ('"', "'"):
            quote = ch
        elif ch in '([':
            depth += 1
        elif ch in ')]':
            if depth == 0:
                out.append(cur.strip())
                return out
            depth -= 1
        elif ch == ',' and depth == 0:
            out.append(cur.strip())
            cur = ''
            continue
        cur += ch
    out.append(cur.strip())
    return out


_EDITOR_IMPORT = re.compile(r"""from\s*['"]@wordpress/(?:block-editor|components|element|editor|edit-post|data)['"]""")


@lru_cache(maxsize=8)
def front_end_scripts(plugin: str) -> tuple:
    """((path, text), ...) of the corpus's scripts that can run on the front end: every JS file of corpus() except those that
    import the editor's packages (@wordpress/block-editor, components, element, editor, edit-post, data), which are the
    editor's own code (a block's preview and its controls)."""
    return tuple((rel, text) for rel, text in corpus(plugin) if rel.endswith(('.js', '.mjs')) and not _EDITOR_IMPORT.search(text))


_IMPORT = re.compile(r"""(?:import|export)\s[^'";]*?from\s*['"](\.{1,2}/[^'"]+)['"]|import\s*\(?\s*['"](\.{1,2}/[^'"]+)['"]""")
EDITOR_ENTRIES = ('index.js', 'edit.js', 'editor.js')


def _resolve_import(base: Path, spec: str, files: set):
    """The corpus file a relative import names (with or without its extension, or a folder's index)."""
    p = (base.parent / spec)
    for cand in (p, p.with_suffix('.js'), p.with_suffix('.mjs'), p / 'index.js'):
        key = cand.resolve()
        if key in files:
            return key
    return None


@lru_cache(maxsize=8)
def front_end_reachable(plugin: str) -> frozenset:
    """The corpus scripts (their relative paths) a visitor's page can run: every script reached through relative imports
    from a starting point (a script nothing imports) that is not the editor's. A starting point is the editor's when it
    is a block's editor entry (index.js, edit.js, editor.js) or imports the editor's packages (_EDITOR_IMPORT); every
    other starting point (a block's view script, a webpack entry, a script the plugin or theme enqueues) counts as the
    front end's, so an unknown entry is never dropped."""
    rels = {}
    for rel, text in corpus(plugin):
        if rel.endswith(('.js', '.mjs')):
            root = Path(plugin).resolve().parents[1] if rel.startswith('theme/') else Path(plugin).resolve()
            rels[(root / rel).resolve()] = (rel, text)
    # the editor's own entries are left out of corpus(); read them as starting points too
    src = Path(plugin) / 'src'
    for f in src.rglob('*.js'):
        if f.name in EDITOR_ENTRIES and f.resolve() not in rels:
            rels[f.resolve()] = (None, f.read_text(encoding='utf-8', errors='ignore'))
    files = set(rels)
    edges, imported = {}, set()
    for f, (_rel, text) in rels.items():
        targets = set()
        for m in _IMPORT.finditer(text):
            hit = _resolve_import(f, m.group(1) or m.group(2), files)
            if hit is not None:
                targets.add(hit)
        edges[f] = targets
        imported |= targets
    starts = [f for f in rels if f not in imported and not (f.name in EDITOR_ENTRIES or _EDITOR_IMPORT.search(rels[f][1]))]
    seen, todo = set(starts), list(starts)
    while todo:
        for t in edges.get(todo.pop(), ()):
            if t not in seen:
                seen.add(t)
                todo.append(t)
    return frozenset(rels[f][0] for f in seen if rels[f][0])


def text_only_printers(plugin: str, short: str, head: str) -> list:
    """['file:line', ...] when every PHP template that prints the class `head` fills its element with esc_html() text (a
    printf whose format puts one argument between the tag's opening and closing, that argument escaped as text), and no
    front-end script (front_end_scripts) names the class outside a selector. [] otherwise, or when no template prints it."""
    cls = re.compile(r"class\s*=\s*\\?[\"'][^\"']*(?<![\w-])" + re.escape(head) + r"(?![\w-])[^\"']*\\?[\"'][^>]*>\s*%(\d+)\$s\s*</")
    hits = []
    for rel, text in corpus(plugin):
        if not rel.endswith('.php') or head not in text:
            continue
        for n, line in enumerate(text.split('\n'), 1):
            if head not in line:
                continue
            m = _PRINTF.search(line)
            fm = cls.search(m.group(2)) if m else None
            if not fm:
                if re.search(r'(?<![.\w-])' + re.escape(head) + r'(?![\w-])', line) and 'class' in line:
                    return []  # printed some other way: its content is not known to be text
                continue
            args = _top_args(m.group(3))
            k = int(fm.group(1)) - 1
            if k >= len(args) or not args[k].startswith(('esc_html(', 'esc_html__(')):
                return []
            hits.append(f'{rel}:{n}')
    if not hits:
        return []
    for rel, text in front_end_scripts(plugin):
        if re.search(r'(?<![.\w-])' + re.escape(head) + r'(?![\w-])', text):
            return []
    return hits


# Why an entry stays unproved, by the cause slug each mechanism or task owns (README, "The record"). A caller that names no
# cause gets the slug whose words its evidence carries.
UNPROVED = (
    ('script-set-token', 'a front-end script sets'),
    ('script-built-part', "front-end script"),
    ('part-not-rendered', 'printed by PHP only'),
    ('part-printed-nowhere', 'printed nowhere'),
    ('part-printed-elsewhere', 'printed by another block'),
    ('theme-value', 'theme, global styles'),
    ('same-value-here', 'same value in these renders'),
    ('rule-needs-absent-markup', 'needs what no render'),
    ('state-not-holdable', 'cannot hold'),
    ('container-query', 'container query'),
)


def unproved_slug(evidence: str) -> str:
    """Why the proof could not decide an entry, as the record's `unproved` value."""
    return next((slug for slug, text in UNPROVED if text in evidence), 'other')


def _strip_pseudo(sel: str) -> str:
    return re.sub(r'::?(before|after|placeholder|marker|first-letter|first-line|selection|backdrop|file-selector-button)\b(\([^)]*\))?\s*$', '', sel.strip())


def _present(pages, pairs, held, conds) -> set:
    out = set()
    for b, c in pairs:
        for j in (b, c):
            out |= {cl for el in pages.get(j, held, conds).soup.find_all(True) for cl in (el.get('class') or [])}
    return out


def _is_bool(run, setting) -> bool:
    for j in run['jobs'].values():
        if isinstance(j.get(setting), bool):
            return True
    return False


def kind_of(run, changed: str, base: str, setting: str, diffs) -> str:
    """value when a changed computed value carries the setting's value at that width, else switched-on."""
    val = run['jobs'][changed].get(setting)
    if isinstance(val, bool) or val is None:
        return 'switched-on'
    for prop, w, _, vc in diffs:
        tv = tier_value(val, int(w))
        forms = {f for leaf in leaves(tv) for f in value_forms(leaf)}
        if forms and vc is not None and any(f in str(vc).lower() for f in forms):
            return 'value'
    return 'switched-on'


def _kind_guess(run, pairs, setting) -> str:
    return 'switched-on' if _is_bool(run, setting) else 'value'


def other_parts(pb, pc, props, widths, part) -> set:
    """The parts other than `part` whose elements change in these properties between the two pages."""
    import difflib
    found = set()
    eb = [el for el in pb.soup.find_all(True) if el.get('class')]
    ec = [el for el in pc.soup.find_all(True) if el.get('class')]
    sig = lambda el: el.name + '.' + '.'.join(sorted(c for c in el.get('class') if not D.UID_RE.fullmatch(c) and '--' not in c))  # noqa: E731
    pairs = []
    for m in difflib.SequenceMatcher(None, [sig(x) for x in eb], [sig(x) for x in ec], autojunk=False).get_matching_blocks():
        pairs += [(eb[m.a + i], ec[m.b + i]) for i in range(m.size)]
    pse = part.partition('::')[2] or None
    for xb, xc in pairs:
        p = part_of_element(pc, xc)
        if p is None or p == part.partition('::')[0]:
            continue
        for w in widths:
            if any(pb.value(xb, pse, prop, w) != pc.value(xc, pse, prop, w) for prop in props):
                found.add(p + (f'::{pse}' if pse else ''))
                break
    return found


UID_TOKEN = re.compile(r'(sgs-[a-z0-9-]+?)-[0-9a-f]{8}(?![0-9a-f])')


def bump(v):
    """A clearly different test value of the same shape: numbers scaled (37px -> 152px), a hex colour swapped; None when
    the value has nothing to vary (a true/false, a keyword)."""
    if isinstance(v, bool) or v is None:
        return None
    if isinstance(v, (int, float)):
        return v * 3 + 41
    if isinstance(v, dict):
        out = {k: bump(x) for k, x in v.items()}
        return None if all(x is None for x in out.values()) else {k: (out[k] if out[k] is not None else v[k]) for k in v}
    if isinstance(v, list):
        return None
    t = str(v)
    if re.fullmatch(r'#[0-9a-fA-F]{3,8}', t):
        return '#2c8a4f' if t.lower() != '#2c8a4f' else '#7a3b9c'
    if re.search(r'\d', t) and not re.search(r'[a-z]+\(', t.replace('calc(', '').replace('clamp(', '')):
        return re.sub(r'\d+(?:\.\d+)?', lambda m: f'{float(m.group(0)) * 3 + 41:g}', t)
    return None


def second_values(run, setting, plain_attrs, changed_attrs) -> list:
    """Other test values for a setting whose first value left the part as it was: the values the plan's own generator gives
    when the first test value is taken as the setting's current one, so each differs from it and keeps the setting's type
    (a font weight of 700 that equals the block's own weight gets 300; a keyword gets another keyword), then the first value
    scaled (bump). A value the plain render already holds is skipped. Each is the changed render's attributes with that value."""
    first = changed_attrs.get(setting)
    cands = []
    try:
        cands += I.switching_values(Path(run['plugin']), run['slug'].split('/', 1)[1], setting, dict(changed_attrs))
    except (OSError, KeyError, ValueError):
        pass
    alt = bump(first)
    if alt is not None:
        cands.append({setting: alt})
    out, seen = [], set()
    for cand in cands:
        if cand.get(setting) in (first, plain_attrs.get(setting)):
            continue
        k = json.dumps(cand, sort_keys=True, default=str)
        if k not in seen:
            seen.add(k)
            out.append({**changed_attrs, **cand})
    return out[:3]


def second_value(pages, run, pairs, setting, part, names, widths, held, conds) -> str:
    """Render once more with a clearly different value of the setting (second_values) and compare with the plain render:
    a declaration the first value left at the same computed value (a floor, a coincidence, a test value equal to the
    block's own) shows here whether it follows the setting."""
    rn = run.get('renderer')
    if rn is None:
        return ''
    for b, c in pairs[:2]:
        todo = {f'second{n}:{c}': attrs for n, attrs in enumerate(second_values(run, setting, run['jobs'][b], run['jobs'][c]))}
        done = rn.render_many(run['slug'], todo, run['content'], run['inner']) if todo else {}
        for job, attrs in todo.items():
            alt, res = attrs.get(setting), done.get(job) or {}
            if not res.get('ok'):
                continue
            pages.add_job(job, attrs, res)
            pb, pa = pages.get(b, held, conds), pages.get(job, held, conds)
            for (xb, pse), (xa, _) in zip(pb.elements(part), pa.elements(part)):
                for w in widths:
                    for name in names:
                        vb, va = pb.value(xb, pse, name, w), pa.value(xa, pse, name, w)
                        if vb != va:
                            return f'with a second test value ({alt!s:.40}): {name} at {w}px {vb} -> {va}'
    return ''


def winning_text(page, el, pse, name, width, conds):
    """The winning declaration for one property, as text with instance ids taken out, or None."""
    decls = page.cascade.declared(el, pse, width, frozenset(conds))
    win = [d for d in decls if d[1] == name or name in CP.expand(d[1], d[2])]
    if not win:
        return None
    pri, prop, value, rule = win[-1]
    return UID_TOKEN.sub(r'', f'{prop}: {value} @ {rule.selector if rule else "inline"}')


def declaration_changes(pages, pairs, part, names, widths, held, conds) -> str:
    """The first property whose winning declaration on the part differs between the plain and the changed page."""
    for b, c in pairs:
        pb, pc = pages.get(b, held, conds), pages.get(c, held, conds)
        for (xb, pse), (xc, _) in zip(pb.elements(part), pc.elements(part)):
            for w in widths:
                for name in names:
                    tb, tc = winning_text(pb, xb, pse, name, w, conds), winning_text(pc, xc, pse, name, w, conds)
                    if tb != tc:
                        return f'{name} at {w}px: {tb!s:.90} -> {tc!s:.90}'
    return ''


def declared_text(page, el, pse, name, width, conds):
    """(property, value text) of the winning declaration for a property on an element, as written (var() not substituted), or None."""
    decls = page.cascade.declared(el, pse, width, frozenset(conds))
    win = [d for d in decls if d[1] == name or name in CP.expand(d[1], d[2])]
    return (win[-1][1], re.sub(r'\s*!important\s*$', '', win[-1][2])) if win else None


def other_value_tried(run, setting, pairs) -> bool:
    """Whether the proof has seen the setting at a value other than the first test value: a true/false setting (both values
    are its plain and changed render), pairs of its own that change it to two different values (a two-choice setting tried
    each way), another test value's pair (sibling_pairs), or a second value second_value rendered.
    A setting tried at one value only may restate the block's own value by coincidence (a font weight of 700 over the
    block's 700), so its entry is never removed as restating."""
    if _is_bool(run, setting) or sibling_pairs(run, setting, pairs):
        return True
    changed = {json.dumps(run['jobs'][c].get(setting), sort_keys=True, default=str) for _, c in pairs}
    if len(changed) > 1:
        return True
    return any(second_values(run, setting, run['jobs'][b], run['jobs'][c]) for b, c in pairs[:2])


def declared_longhand(page, el, pse, name, width, conds):
    """The text the winning declaration gives one longhand, var() left as written: `border: 1px solid var(--edge)` gives
    border-bottom-style `solid` and border-bottom-color `var(--edge)`. None when nothing is declared."""
    d = declared_text(page, el, pse, name, width, conds)
    if d is None:
        return None
    prop, value = d
    return value if prop == name else CP.expand(prop, value).get(name, value)


def restated_value(pages, pairs, part, names, widths, held, conds) -> str:
    """Evidence (text) that the setting only changes which rule declares the part's properties, never their value: in every pair,
    on every element and at every width, the winning declaration of each property, var() substituted and shorthands expanded,
    is the same text in the plain and the changed page (a rule that restates the value the plain page already declares, such as
    `pointer-events: none` over `pointer-events: none`, or `text-align: center` over a button's own `center`). '' when any
    value differs, when nothing is declared at all, or when there is no element to read."""
    seen = 0
    sample = ''
    for b, c in pairs:
        pb, pc = pages.get(b, held, conds), pages.get(c, held, conds)
        eb, ec = pb.elements(part), pc.elements(part)
        if len(eb) != len(ec) or not eb:
            return ''
        for (xb, pse), (xc, _) in zip(eb, ec):
            for w in widths:
                rb, rc = pb.raw(xb, pse, w), pc.raw(xc, pse, w)
                for name in names:
                    if rb.get(name) != rc.get(name):
                        return ''
                    if rb.get(name) is None:
                        continue
                    # a value read through var() is judged by the declaration's own text for this longhand: two rules reading
                    # different tokens give one value only because of the tokens defined here (a theme's, a page's), which a
                    # site can define otherwise. A shorthand's other parts do not count: `border: 1px solid var(--edge)` and
                    # `border-style: solid` give the same style whatever --edge holds.
                    db, dc = declared_longhand(pb, xb, pse, name, w, conds), declared_longhand(pc, xc, pse, name, w, conds)
                    if db != dc and 'var(' in f'{db}{dc}':
                        return ''
                    seen += 1
                    sample = sample or f'{name}: {rb[name]}'
    return f'{sample} in all {seen} readings' if seen else ''


def sibling_pairs(run: dict, setting: str, known) -> list:
    """The (plain, changed) render pairs of the same setting's other test values (each enum value, a second shape of a
    per-device value) that the entry's own pairs leave out: the renders are already made, so another value costs nothing."""
    insts = (run.get('plan') or {}).get('instances') or []
    bases = {i.get('baseKey'): i for i in insts if i.get('isBase')}
    defaults = {i.get('variant'): i for i in insts if i.get('isDefault')}
    out = []
    for i in insts:
        if i.get('attr') != setting or i.get('isDefault') or i.get('isBase') or i.get('paintState') or i.get('_key') not in run['results']:
            continue
        base = bases.get(i.get('baseKey')) if i.get('baseKey') else defaults.get(i.get('variant'))
        pair = (base['_key'], i['_key']) if base and base.get('_key') in run['results'] else None
        if pair and pair not in known and pair not in out and run['results'][pair[0]].get('ok', True) and run['results'][pair[1]].get('ok', True):
            out.append(pair)
    return out


_OVERRIDE = re.compile(r'^(.+?)(Tablet|Mobile)$')


def override_of(schema: dict, setting: str) -> str | None:
    """The setting a per-device override overrides: `fooMobile` and `fooTablet` override `foo` when the block has both
    (block.json: "Mobile-tier override of triggerStyle"). None for any other setting."""
    m = _OVERRIDE.match(setting)
    return m.group(1) if m and m.group(1) in schema and setting in schema else None


def override_sweep(pages, run, setting: str, pairs) -> list:
    """For a per-device override, (plain, changed) render pairs that try every value of the override over every value of
    the setting it overrides: a desktop value the plain render already shares with the override's test value shows
    nothing, so the override is judged against a desktop value it really changes. For a per-device value held in one
    attribute (desktop, tablet, mobile), every test value's tablet and mobile slots over its own desktop slot. Made once
    per setting and shared by its entries; [] for a setting that overrides nothing."""
    memo = run.setdefault('_sweeps', {})
    if setting in memo:
        return memo[setting]
    memo[setting] = []
    rn = run.get('renderer')
    if rn is None or not pairs:
        return []
    plugin, short = Path(run['plugin']), pages.short
    try:
        schema = {k: v for k, v in (I.block_json(plugin, short).get('attributes') or {}).items() if isinstance(v, dict)}
    except OSError:
        return []
    base = dict(run['jobs'][pairs[0][0]])
    stem = override_of(schema, setting)
    combos = []
    if stem:
        unset = schema[setting].get('default', '')
        desktop = [{stem: base.get(stem, schema[stem].get('default'))}] + I.switching_values(plugin, short, stem, base)
        for d in desktop:
            for o in I.switching_values(plugin, short, setting, {**base, setting: unset}):
                if o.get(setting) not in (None, unset) and o.get(setting) != d.get(stem):
                    plain = {**base, **d, setting: unset}
                    combos.append((plain, {**plain, **o}))
    else:
        for o in I.switching_values(plugin, short, setting, base):
            v = o.get(setting)
            if isinstance(v, dict) and 'desktop' in v and ({'tablet', 'mobile'} & set(v)):
                plain = {**base, **o, setting: {'desktop': v['desktop']}}
                combos.append((plain, {**base, **o}))
    if not combos:
        return []
    todo, out = {}, []
    for plain, changed in combos[:24]:
        pair = []
        for attrs_ in (plain, changed):
            jk = 'ovr:' + hashlib.md5(json.dumps(attrs_, sort_keys=True, default=str).encode()).hexdigest()
            pair.append(jk)
            if jk not in run['results'] and jk not in todo:
                todo[jk] = attrs_
        out.append(tuple(pair))
    if todo:
        for jk, res in rn.render_many(run['slug'], todo, run['content'], run['inner']).items():
            pages.add_job(jk, todo[jk], res)
    memo[setting] = [x for x in out if run['results'][x[0]].get('ok') and run['results'][x[1]].get('ok')]
    return memo[setting]


def theme_winner(pages, pairs, part, names, widths, held, conds) -> str:
    """The first property on the part whose winning declaration in the changed page is a rule of the theme's sheet (the
    page frame's layout rules, a global style), as text, or ''."""
    if not pages.theme_orders:
        return ''
    pc = pages.get(pairs[-1][1], held, conds)
    for el, pse in pc.elements(part):
        for w in widths:
            decls = pc.cascade.declared(el, pse, w, frozenset(conds))
            for name in names:
                win = [d for d in decls if d[1] == name or name in CP.expand(d[1], d[2])]
                if win and win[-1][3] is not None and win[-1][3].order in pages.theme_orders:
                    return f'{name} at {w}px from {win[-1][3].selector[:90]}'
    return ''


def winner_note(pages, pair, part, props, widths, held, conds) -> str:
    """The rule that wins each property on the part in the changed render: why the entry's own rule changes nothing."""
    b, c = pair
    pc = pages.get(c, held, conds)
    els = pc.elements(part)
    if not els:
        return 'no element'
    el, pse = els[0]
    notes = []
    for prop in props[:2]:
        decls = [d for d in pc.cascade.declared(el, pse, widths[-1], frozenset(conds)) if d[1] == prop or CP.expand(d[1], d[2]).get(prop) is not None]
        if decls:
            pri, p, v, r = decls[-1]
            notes.append(f'{prop}: {v} from {(r.selector if r else "inline")[:120]} (specificity {pri[2]})')
        else:
            notes.append(f'{prop}: no declaration reaches the part')
    return '; '.join(notes)


# ---------------------------------------------------------------- where a missing part comes from
CORPUS_DIRS = ('src', 'includes', 'assets', 'templates')
SKIP_DIRS = {'node_modules', 'build', 'vendor', '.git', 'tests', 'test', '__tests__', '__pycache__'}
EDITOR_FILES = {'edit.js', 'editor.js', 'index.js', 'deprecated.js'}  # the editor's code: not front-end markup


@lru_cache(maxsize=8)
def corpus(plugin: str) -> tuple:
    """((path relative to the plugin, or `theme/...`, text), ...) of every front-end PHP, JS and HTML file of the plugin
    (src, includes, assets, templates) and of the theme beside it: the places a class can be printed from. The editor's own
    code, stylesheets, build output and tests are left out."""
    root = Path(plugin)
    theme = root.resolve().parents[1] / 'theme' / 'sgs-theme'
    files = []
    for base in [root / d for d in CORPUS_DIRS] + [theme]:
        for dirpath, dirs, names in os.walk(base):
            dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
            for n in names:
                if n.endswith(('.php', '.js', '.mjs', '.html')) and n not in EDITOR_FILES and '.min.' not in n and not n.endswith('.test.js'):
                    files.append(Path(dirpath) / n)
    out = []
    for f in sorted(files):
        try:
            rel = f.relative_to(root).as_posix()
        except ValueError:
            rel = 'theme/' + f.relative_to(theme).as_posix()
        out.append((rel, f.read_text(encoding='utf-8', errors='ignore')))
    return tuple(out)


def scan_of(run: dict, short: str):
    """The block source scanner's reading of the block (instances.scan_json), or None when the block folder is absent or the
    scanner cannot read it."""
    try:
        return I.scan_json(Path(run['plugin']) / 'src' / 'blocks', short)
    except Exception:
        return None


def part_source(plugin, short: str, part: str, scan) -> dict:
    """Where a part that no render here draws comes from, decided by the source scanner's reading of the block (scan.py:
    the parts it finds printed, the class families it finds assembled) and a search of every front-end file of the plugin
    and the theme for the class:

      php          the block's code or a shared helper prints it: under a setting or content the fixture leaves off, or
                   at wp_footer                                                       -> part-not-rendered
      script       the block's front-end script or a shared script builds it        -> script-built-part
      assembled    its name is built from pieces (a family the scanner flags, or `%s__name` in a helper) that nothing
                   here prints                                                      -> script-built-part (browser pass)
      elsewhere    another block or the theme prints it                               -> part-printed-elsewhere
      dead         nothing prints it: the CSS styles a class no source emits         -> the entry is removed and the class
                   is listed as a block fault

    Returns {kind, cause, evidence, token}."""
    base = part.split('::')[0].split(' ')[0]
    if base == 'ROOT':
        return {'kind': 'root', 'cause': 'part-not-rendered', 'evidence': 'the block root', 'token': base}
    pat = re.compile(r'(?<![.\w-])' + re.escape(base) + r'(?![\w-])')
    files = corpus(str(plugin))
    own = f'src/blocks/{short}/'
    shared_dirs = ('includes/', 'src/shared/', 'assets/')
    hits = {'php': [], 'script': [], 'other': []}
    for rel, text in files:
        if not pat.search(text):
            continue
        if rel.startswith(own) or rel.startswith(shared_dirs):
            hits['php' if rel.endswith('.php') else 'script'].append(rel)
        else:
            hits['other'].append(rel)
    origins = set((((scan or {}).get('parts') or {}).get(base) or {}).get('origins') or ())
    if hits['php'] or origins & {'php', 'php-html'}:
        return {'kind': 'php', 'cause': 'part-not-rendered', 'token': base,
                'evidence': f'{base} is printed by PHP only under settings or content the fixture leaves off, or at wp_footer ({(hits["php"] or ["the scanner"])[0]})'}
    if hits['script'] or origins & {'js', 'save'}:
        return {'kind': 'script', 'cause': 'script-built-part', 'token': base,
                'evidence': f'{base} is built by the block\'s front-end script ({(hits["script"] or ["the scanner"])[0]})'}
    fams = [f['key'] for f in (scan or {}).get('unread') or [] if f.get('kind') == 'dynamic-class' and f.get('key')]
    fam = next((f for f in fams if base.startswith(f) and f != base and '__' not in base[len(f):] and '--' not in base[len(f):]), None)
    suffix = None
    if '__' in base:
        sfx = re.compile(r'__' + re.escape(base.split('__', 1)[1]) + r'(?![\w-])')
        for rel, text in files:
            if rel.startswith(own) or rel.startswith(shared_dirs):
                for m in sfx.finditer(text):
                    if not re.search(r'sgs-[a-z0-9-]*$', text[max(0, m.start() - 60):m.start()]):  # not the full class written out
                        suffix = rel
                        break
            if suffix:
                break
    if suffix and not fam and suffix.endswith('.php'):
        # PHP builds the name from pieces (sgs_nav_shared_badge_html prints `$bem_root . '__badge'`): the server render
        # prints it once the content or setting it waits on is there, so no browser is needed.
        return {'kind': 'php', 'cause': 'part-not-rendered', 'token': base,
                'evidence': f'{base} is assembled by PHP ({suffix} holds `...{base.split("__", 1)[1]}`) only under settings or content the fixture leaves off'}
    if fam or suffix:
        how = f'its name starts a family the scanner finds built at run time ({fam}...)' if fam else f'a script builds it from pieces ({suffix} holds `...{base.split("__", 1)[1]}`)'
        return {'kind': 'assembled', 'cause': 'script-built-part', 'token': base,
                'evidence': f'{base} is assembled from pieces no render here prints: {how}; the browser pass (front-end script) reads it'}
    if hits['other']:
        return {'kind': 'elsewhere', 'cause': 'part-printed-elsewhere', 'token': base,
                'evidence': f'{base} is printed by another block or the theme ({", ".join(hits["other"][:3])}), which this block\'s render does not include'}
    return {'kind': 'dead', 'cause': None, 'token': base,
            'evidence': f'dead CSS: no source prints {base}: the scanner reads it as {sorted(origins) or "absent"} and {len(files)} front-end PHP, JS and HTML files of the plugin and theme '
                        f'hold it only inside a selector (a leading dot) or not at all, and no family or helper assembles its name'}


# ---------------------------------------------------------------- the underlay test
_COLOUR_PROP = re.compile(r'colou?r|fill|stroke|shadow|background|outline|border(?!-(radius|width|style|spacing|collapse|image-width))')


def script_set_tokens(plugin, tokens) -> list:
    """[(token, file)] for each custom property a front-end script of the plugin or theme writes (setProperty, or the
    name in a style string a script builds): its value is the script's, read only in a browser. Only scripts a
    front-end entry reaches count (front_end_reachable): an editor preview that mirrors a token is not the visitor's."""
    out = []
    reach = front_end_reachable(str(plugin))
    for t in sorted(tokens):
        pat = re.compile(re.escape(t) + r'(?![\w-])')
        for rel, text in corpus(str(plugin)):
            if rel.endswith(('.js', '.mjs')) and rel in reach and pat.search(text):
                out.append((t, rel))
                break
    return out


_EASING_TOKEN = re.compile(r'eas(?:e|ing)|timing', re.I)
_TIME_TOKEN = re.compile(r'transition|duration|delay|speed', re.I)
_COLOUR_TOKEN = re.compile(r'colou?r|-bg\b|background|fill|stroke|border-c', re.I)


_TIME_PROP = re.compile(r'^(transition|animation)(-duration|-delay)?$')
_EASING_PROP = re.compile(r'timing-function$')


def _kind_value(prop: str, i: int):
    """A placeholder of the kind `prop` takes, or None when the property gives no kind."""
    if _EASING_PROP.search(prop):
        return f'cubic-bezier(0.{11 + i}, 0.2, 0.3, 1)'
    if _TIME_PROP.match(prop):
        return f'{1001 + i}ms'
    if prop in ('transform',):
        return f'translateX({1001 + i}px)'
    if prop in ('opacity',):
        return f'0.{11 + i}'
    if prop in ('z-index', 'order', 'flex-grow', 'flex-shrink', 'column-count', '-webkit-line-clamp'):
        return f'{101 + i}'
    if prop == 'font-weight':
        return f'{101 + i}'
    if _COLOUR_PROP.search(prop):
        return f'rgb({17 + i}, {29 + 2 * i}, {41 + 3 * i})'
    return None


def token_values(tokens, names, kinds=None) -> tuple:
    """A placeholder value for each custom property no page here defines, distinct from every other and of the kind the
    property itself holds, read from its name first (an easing token gets a cubic-bezier, a transition, duration or delay
    token a time, a colour token a colour), else from the entry's properties (a colour for a colour property, else a
    length). A placeholder of the wrong kind makes the declaration invalid on both pages alike (a length where a transition
    wants a time), which would hide the switch the test is for. `kinds` (token -> the property whose declaration reads it,
    from outside_vars) decides a token its name says nothing about, ahead of the entry's properties."""
    colour = any(_COLOUR_PROP.search(n.lstrip('_')) for n in names)
    kinds = kinds or {}
    out = []
    for i, t in enumerate(sorted(tokens)):
        by_reader = _kind_value(kinds[t], i) if t in kinds else None
        if _EASING_TOKEN.search(t):
            v = f'cubic-bezier(0.{11 + i}, 0.2, 0.3, 1)'
        elif _TIME_TOKEN.search(t):
            v = f'{1001 + i}ms'
        elif by_reader is not None:
            v = by_reader
        elif t in kinds:
            v = f'{1001 + i}px'
        elif _COLOUR_TOKEN.search(t) or colour:
            v = f'rgb({17 + i}, {29 + 2 * i}, {41 + 3 * i})'
        else:
            v = f'{1001 + i}px'
        out.append((t, v))
    return tuple(out)


def token_test(pages, pairs, part, names, widths, held, conds, tokens, kinds=None) -> str:
    """The value reads a custom property no page here defines (a client's token, a parent block's default). Both pages are
    rebuilt with each such property given its own placeholder on the page root: a setting that switches which property the
    value reads now changes the computed value, whatever a site's own token holds. Returns the first difference, or ''."""
    toks = token_values(tokens, names, kinds)
    for b, c in pairs[:4]:
        tb, tc = pages.get(b, held, conds, tokens=toks), pages.get(c, held, conds, tokens=toks)
        for (xb, pse), (xc, _) in zip(tb.elements(part), tc.elements(part)):
            for w in widths:
                for prop in names:
                    vb, vc = tb.value(xb, pse, prop, w), tc.value(xc, pse, prop, w)
                    if vb != vc:
                        return f'with each undefined token given its own placeholder ({", ".join(t for t, _ in toks[:3])}), {prop} at {w}px: {str(vb)[:40]} -> {str(vc)[:40]}'
    return ''


def underlay_test(pages, pairs, part, names, widths, held, conds) -> str:
    """A declaration the setting switches on that computes to the plain value (an inherit under a root with none, `none`, a
    floor): both pages rebuilt over two lowest-priority sentinel rules, one on the part's elements and a different one on
    their ancestors. The plain page then shows the part's sentinel; a declaration the setting switched on overrides it, or
    inherits the ancestors', and so differs. Returns the first difference as text, or ''."""
    for b, c in pairs[:3]:
        ub, uc = pages.get(b, held, conds, underlay=(part, names)), pages.get(c, held, conds, underlay=(part, names))
        for (xb, pse), (xc, _) in zip(ub.elements(part), uc.elements(part)):
            for w in widths:
                for prop in names:
                    vb, vc = ub.value(xb, pse, prop, w), uc.value(xc, pse, prop, w)
                    if vb != vc:
                        return f'over a sentinel underlay {prop} at {w}px: {str(vb)[:40]} -> {str(vc)[:40]}'
    return ''


# ---------------------------------------------------------------- completion: print the missing part with the setting that prints it
_ATTR_NEED = re.compile(r'\[\s*data-([a-z0-9-]+)')


def completion(pages, run, scan, setting, part, names, pairs, held, conds, widths, selectors, missing_part: bool):
    """A part, class or data attribute the renders here lack, printed by the settings the scanner says decide it
    (instances.switching_attrs): the plain and the changed render again with those settings moved, and the first pair that
    draws the part (or matches the entry's rule) is the pair the entry is proved on. Returns {'pair': (plain job, changed
    job), 'with': attrs} or None.

    It is asked for only when no render, on either side of any pair, matches the entry's rule. The demand is then the rule's
    whole condition, not what the renders happen to lack: every class the rule requires and every data attribute it names.
    Each demanded token has its own supplies (the test values of the settings that print it, never the entry's own setting,
    which stays on the changed side); a candidate is one supply for each token that has any, so a rule that needs two
    classes together (`.x--pill.x--count-bubble`) is tried with both printed at once, whichever of them some other pair of
    renders already has on its own."""
    rn = run.get('renderer')
    if rn is None or scan is None or not pairs:
        return None
    base = part.split('::')[0].split(' ')[0]
    if missing_part:
        demands = [([base], [])]
    else:
        demands = []
        for sel in sorted(selectors):
            toks = sorted(C.required_classes(C.resting(_strip_pseudo(sel), held)))
            data = sorted(set(_ATTR_NEED.findall(sel)))
            if toks or data:
                demands.append((toks, data))
    plugin, short = Path(run['plugin']), pages.short
    b, c = pairs[0]
    base_attrs, changed_attrs = run['jobs'][b], run['jobs'][c]
    options = {}

    def supply(token, is_data) -> list:
        """The attribute dicts that print one token: each deciding setting's test values alone, then two deciding settings
        together (a class printed only when both hold)."""
        names_ = [a for a in (I.switching_attrs(scan, [], [token]) if is_data else I.switching_attrs(scan, [token])) if a != setting]
        for a in names_:
            if a not in options:
                options[a] = I.switching_values(plugin, short, a, changed_attrs)
        out = [v for a in names_ for v in options[a][:4]]               # a few values of each deciding setting, not every value of the first
        for i, a in enumerate(names_[:6]):
            for a2 in names_[i + 1:6]:
                out += [{**v, **w} for v in options[a][:3] for w in options[a2][:3]]
        return out

    cands, key_parts = [], []
    for toks, data in demands:
        key_parts.append((tuple(toks), tuple(data)))
        lists = [x for x in ([supply(t, False) for t in toks] + [supply(d, True) for d in data]) if x]
        if not lists:
            continue
        combos = [{}]
        for lst in lists:
            nxt = []
            for cur in combos:
                for v in lst[:60]:
                    if all(cur.get(k, v[k]) == v[k] for k in v):      # two tokens printed by one setting at different values: no such render
                        nxt.append({**cur, **v})
            combos = nxt[:400] or combos
        cands += sorted((x for x in combos if x), key=len)         # the fewest settings moved first
    memo = run.setdefault('_completed', {})
    key = (tuple(key_parts), part)
    if key in memo and memo[key] is None:
        return None                                                    # an earlier entry of this part found nothing prints it
    if memo.get(key):
        cands = [memo[key]] + [x for x in cands if x != memo[key]]
    seen, order = set(), []
    for x in cands:
        k = json.dumps(x, sort_keys=True, default=str)
        if x and setting not in x and k not in seen:
            seen.add(k)
            order.append(x)
    for i in range(0, min(len(order), 240), 12):                       # twelve candidates (24 renders) at a time, in parallel
        chunk = order[i:i + 12]
        todo, pair_of = {}, {}
        for extra in chunk:
            pair = []
            for attrs_ in ({**base_attrs, **extra}, {**changed_attrs, **extra}):
                jk = 'fix:' + hashlib.md5(json.dumps(attrs_, sort_keys=True, default=str).encode()).hexdigest()
                pair.append(jk)
                if jk not in run['results']:
                    todo[jk] = attrs_
            pair_of[json.dumps(extra, sort_keys=True, default=str)] = pair
        if todo:
            for jk, res in rn.render_many(run['slug'], todo, run['content'], run['inner']).items():
                pages.add_job(jk, todo[jk], res)
        for extra in chunk:
            jb, jc = pair_of[json.dumps(extra, sort_keys=True, default=str)]
            if not (run['results'][jb].get('ok') and run['results'][jc].get('ok')):
                continue
            got = scan_pairs(pages, run, setting, part, names, [(jb, jc)], held, conds, widths, selectors)
            if got['verdict'] or (got['seen_part'] if missing_part else got['matched']):
                memo[key] = extra
                return {'pair': (jb, jc), 'with': extra}
    memo[key] = None
    return None
