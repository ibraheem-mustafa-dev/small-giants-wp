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
               the server render (built by a script, switched off, printed at wp_footer), the entry's rule needs a
               class or attribute no render here carries, or its state is one the proof cannot hold

Kind: `value` when the changed computed value carries the setting's own value (as written, or as the browser writes it:
a hex colour as rgb(), a number as px or seconds), else `switched-on` (always for a true/false setting).
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parent / 'block-source-scan'))
import cascade as C  # noqa: E402
import computed as CP  # noqa: E402
import diff as D  # noqa: E402
import reference as R  # noqa: E402
import soupsieve as sv  # noqa: E402

WIDTHS = (375, 768, 1440)
TIER_WIDTH = {'desktop': 1440, 'tablet': 768, 'mobile': 375}
HOLDABLE = {name for name, _ in R.STATE_WORDS}


class Pages:
    """Pages built from cached renders, shared by every entry that names them."""

    def __init__(self, short: str, run: dict):
        self.short = short
        self.run = run
        files = D.sheet_files(run['plugin'], short, run['children'])
        self.base = CP.Page.static_rules([f.read_text(encoding='utf-8', errors='ignore') for f in files])
        self.memo = {}
        # every custom property the block's stylesheets or any of its renders declare
        self.known = {p for r in self.base for p, _, _ in r.decls if p.startswith('--')}
        for res in run['results'].values():
            self.known |= set(re.findall(r'(--[\w-]+)\s*:', res.get('css', '') + ' ' + res.get('html', '')))

    def get(self, job: str, held=(), conditions=frozenset()):
        k = (job, frozenset(held), frozenset(conditions))
        if k not in self.memo:
            res = self.run['results'][job]
            self.memo[k] = CP.Page(res.get('html', ''), [res.get('css', '')], self.short, held=held, conditions=conditions, base_rules=self.base)
        return self.memo[k]


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


UNNAMED_STATE = re.compile(r':(placeholder-shown|user-invalid|user-valid|autofill|-webkit-autofill|invalid|valid|empty|target|visited|playing|paused|fullscreen|modal|popover-open|checked|indeterminate|in-range|out-of-range|required|optional|read-only|read-write)\b')


def unnamed_states(selectors) -> list:
    """Dynamic pseudo-classes in the entry's rules that the record's state names (hover, focus, current, open,
    disabled, active, checked) do not cover: `:not(:placeholder-shown)` is a filled field, not the resting one."""
    return sorted({f':{m.group(1)}' for s in selectors for m in UNNAMED_STATE.finditer(s) if m.group(1) not in HOLDABLE})


def outside_vars(page, el, pse, names, width, conds, known) -> set:
    """Custom properties the winning declarations for these names read that the element does not inherit and that no
    stylesheet of the block and no render of it ever declares (`known`): their values come from the theme, global
    styles or the site, which the proof lacks. A block's own optional custom property is known, so its fallback is
    what the block really draws."""
    custom = page.computed(el, pse, width)['_custom']
    out = set()
    decls = page.cascade.declared(el, pse, width, frozenset(conds))
    for name in names:
        win = [d for d in decls if name in CP.expand(d[1], d[2]) or d[1] == name]
        if win:
            for v in re.findall(r'var\(\s*(--[\w-]+)', win[-1][2]):
                if v not in custom and v not in known:
                    out.add(v)
    return out


def conditions_of(tiers) -> set:
    return {name for name, rx in C.CONDITIONS.items() if any(rx.search(t) for t in tiers)}


def prove(short: str, run: dict):
    """(entries with kind, report). Entries proved or blind keep their key; re-filed ones move; removed ones go."""
    pages = Pages(short, run)
    out, report = {}, {'proved': [], 'refiled': [], 'removed': [], 'blind': []}
    for k, e in run['entries'].items():
        setting, part, props, state, tiers = e['setting'], e['part'], e['props'], e['state'], e['tiers']
        names = longhands(props)
        pairs = sorted(run['pairs'].get(k, ()))
        held = {state} if state else set()
        conds = conditions_of(tiers)
        widths = sorted(R.tier_widths(tiers) or WIDTHS)
        verdict, evidence, kind, refile = None, None, None, set()
        if state and state not in HOLDABLE:
            verdict, evidence = 'blind', f'state {state} is a token the proof cannot hold'
        elif any(t.lstrip().startswith('@container') for t in tiers):
            verdict, evidence = 'blind', f'it holds under a container query ({tiers[0]}), which depends on laid-out widths the proof does not compute'
        else:
            seen_part = matched = False
            for b, c in pairs:
                pb, pc = pages.get(b, held, conds), pages.get(c, held, conds)
                eb, ec = pb.elements(part), pc.elements(part)
                if not eb and not ec:
                    continue
                seen_part = True
                if bool(eb) != bool(ec):
                    verdict, evidence = 'proved', f'the part is drawn only in the {"changed" if ec else "plain"} render'
                    kind = 'switched-on'
                    break
                diffs = []
                for (xb, pse), (xc, _) in zip(eb, ec):
                    for w in widths:
                        for prop in names:
                            vb, vc = pb.value(xb, pse, prop, w), pc.value(xc, pse, prop, w)
                            if vb != vc:
                                diffs.append((prop, w, vb, vc))
                if diffs:
                    verdict = 'proved'
                    evidence = [list(map(str, d)) for d in diffs[:3]]
                    kind = kind_of(run, c, b, setting, diffs)
                    break
                # nothing differs on the part: does the entry's own rule match it here?
                for sel in run['selectors'].get(k, ()):
                    try:
                        ids = {id(el) for el, _ in ec}
                        if any(id(x) in ids for x in sv.select(C.resting(_strip_pseudo(sel), held), pc.soup)):
                            matched = True
                    except Exception:
                        pass
                refile |= other_parts(pb, pc, names, widths, part)
            if verdict is None:
                if not seen_part:
                    verdict, evidence = 'blind', f'the part is not in the server render ({printed_where(run["plugin"], short, part)})'
                elif not matched:
                    # the entry's own rule matches no element of the part here: a fixture without that markup, not a wrong entry
                    sels = run['selectors'].get(k, ())
                    need = sorted({c for s in sels for c in C.required_classes(C.resting(_strip_pseudo(s), held))} - _present(pages, pairs, held, conds))
                    verdict, evidence = 'blind', f'the rule needs what no render here carries: {need[:4] or sorted(sels)[:1]}'
                elif refile:
                    verdict, evidence = 'refiled', sorted(refile)
                else:
                    theme = set()
                    for b, c in pairs:
                        for j in (b, c):
                            pg = pages.get(j, held, conds)
                            for el, pse in pg.elements(part)[:1]:
                                for w in widths:
                                    theme |= outside_vars(pg, el, pse, names, w, conds, pages.known)
                    changed_decl = declaration_changes(pages, pairs, part, names, widths, held, conds)
                    second = '' if theme else second_value(pages, run, pairs, setting, part, names, widths, held, conds)
                    unnamed = unnamed_states(run['selectors'].get(k, ()))
                    if unnamed and not second:
                        verdict, evidence = 'blind', f'the rule holds in a state the record cannot name ({", ".join(unnamed)}), which the proof cannot hold'
                    elif theme:
                        verdict, evidence = 'blind', f'the value reads {sorted(theme)[:4]}, defined by the theme, global styles or the site, which the proof does not load'
                    elif second:
                        # a test value under a floor or a coincidence: a second value moves the property
                        verdict, evidence, kind = 'proved', second, 'value'
                    elif changed_decl:
                        verdict, evidence = 'blind', f'the winning declaration changes ({changed_decl}) but computes to the same value in these renders (it inherits, or meets a floor or the initial value)'
                    else:
                        verdict, evidence = 'removed', 'the winning declaration is the same with and without the setting, also with a second test value: ' + winner_note(pages, pairs[-1], part, names, widths, held, conds)
        row = {'setting': setting, 'part': part, 'props': props, 'state': state, 'tiers': tiers, 'verdict': verdict, 'evidence': evidence}
        if verdict == 'proved':
            out[k] = {**e, 'kind': kind}
            report['proved'].append(row)
        elif verdict == 'blind':
            row['unproved'] = unproved_slug(str(evidence))
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
    counts = {v: len(report[v]) for v in report}
    counts['byKind'] = {kd: sum(1 for e in out.values() if e.get('kind') == kd) for kd in ('value', 'switched-on')}
    report['counts'] = counts
    return out, report


UNPROVED = (
    ('script-built-part', "front-end script"),
    ('part-not-rendered', 'printed by PHP only'),
    ('part-printed-nowhere', 'printed nowhere'),
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


def second_value(pages, run, pairs, setting, part, names, widths, held, conds) -> str:
    """Render once more with a clearly different value of the setting and compare with the plain render: a declaration
    the first value left at the same computed value (a floor, a coincidence) shows here whether it follows the setting."""
    rn = run.get('renderer')
    if rn is None:
        return ''
    for b, c in pairs[:2]:
        attrs = dict(run['jobs'][c])
        alt = bump(attrs.get(setting))
        if alt is None:
            continue
        attrs[setting] = alt
        res = rn.render(run['slug'], attrs, run['content'], run['inner'])
        if not res.get('ok'):
            continue
        job = f'second:{c}'
        run['results'][job] = res
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


def printed_where(plugin: Path, short: str, part: str) -> str:
    """Where the part's class is printed: by PHP, by a front-end script, or nowhere this search can find."""
    base = part.split('::')[0].split(' ')[0]
    if base == 'ROOT':
        return 'the block root'
    pat = re.compile(r'(?<![.\w-])' + re.escape(base) + r'(?![\w-])')
    bdir = plugin / 'src' / 'blocks' / short
    php = list(bdir.glob('*.php')) + list((plugin / 'includes').rglob('*.php'))
    if any(pat.search(f.read_text(encoding='utf-8', errors='ignore')) for f in php):
        return f'{base} is printed by PHP only under settings or content the fixture leaves off, or at wp_footer'
    js = [f for f in bdir.rglob('*.js') if f.name not in ('edit.js', 'index.js', 'save.js') and not f.name[0].isupper()]
    js += list((plugin / 'src' / 'shared').rglob('*.js'))
    if any(pat.search(f.read_text(encoding='utf-8', errors='ignore')) for f in js):
        return f'{base} is built by the block\'s front-end script'
    return f'{base} is printed nowhere this search finds (a class built from parts, or styled but never printed)'
