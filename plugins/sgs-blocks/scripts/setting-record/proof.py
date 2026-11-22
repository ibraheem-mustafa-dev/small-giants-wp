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


def frame_widths(layout) -> dict:
    """The width a block's container has at each screen width: the page's content size, or the screen less the root
    padding on both sides when that is narrower ({375: px, 768: px, 1440: px}); empty when the layout is unknown."""
    if not layout:
        return {}
    pad = layout.get('rootPadding') or {}
    out = {}
    for w in WIDTHS:
        p = pad.get(w, pad.get(str(w)))
        if p is not None and layout.get('contentSize'):
            out[w] = min(float(layout['contentSize']), w - 2 * float(p))
    return out


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
        files = D.sheet_files(run['plugin'], short, run['children'])
        texts = [f.read_text(encoding='utf-8', errors='ignore') for f in files]
        self.base = CP.Page.static_rules(([css] if css else []) + texts)
        # static_rules numbers the user-agent sheet from 0 and each sheet after it from 10,000 in steps of 100,000: the
        # theme (the first sheet) holds the rules numbered in this range
        self.theme_orders = range(10_000, 110_000) if css else range(0)
        self.memo = {}
        # every custom property the block's own stylesheets or any of its renders declare (not the theme's: a theme
        # property that is not in force on the element is still undefined for the block)
        self.known = set(re.findall(r'(--[\w-]+)\s*:', ' '.join(texts)))
        for res in run['results'].values():
            self.known |= set(re.findall(r'(--[\w-]+)\s*:', res.get('css', '') + ' ' + res.get('html', '')))

    def add_job(self, job: str, attrs: dict, res: dict) -> None:
        """Register a render made during the proof (a completion's pair, a second test value)."""
        self.run['results'][job] = res
        self.run['jobs'][job] = attrs
        self.known |= set(re.findall(r'(--[\w-]+)\s*:', res.get('css', '') + ' ' + res.get('html', '')))

    def get(self, job: str, held=(), conditions=frozenset(), underlay=None):
        k = (job, frozenset(held), frozenset(conditions), (underlay[0], tuple(underlay[1])) if underlay else None)
        if k not in self.memo:
            res = self.run['results'][job]
            self.memo[k] = CP.Page(res.get('html', ''), [res.get('css', '')], self.short, held=held, conditions=conditions,
                                   base_rules=self.base, underlay=underlay, container_frame=self.frame)
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


# Dynamic pseudo-classes nothing in the render can decide (the browser or the visitor does): the proof holds none of them.
# The markup-decided ones (:checked, :placeholder-shown, :required, :empty, ...) follow the markup, and `filled` is held
# by giving the inputs a value.
UNNAMED_STATE = re.compile(r':(user-invalid|user-valid|autofill|-webkit-autofill|invalid|valid|target|visited|playing|paused|fullscreen|modal|popover-open)(?![\w-])')


def unnamed_states(selectors) -> list:
    """Dynamic pseudo-classes in the entry's rules that the proof cannot hold (the record's state names, `filled` and
    the markup-decided ones are held or read from the markup)."""
    return sorted({f':{m.group(1)}' for s in selectors for m in UNNAMED_STATE.finditer(s) if m.group(1) not in HOLDABLE})


def outside_vars(page, el, pse, names, width, conds, known) -> set:
    """Custom properties the winning declarations for these names read that the element does not inherit and that no
    stylesheet of the block, no render of it and no rule of the theme sheet in force ever declares (`known` is the block's
    own; the theme's reach the element through `custom`): their values come from a client's tokens, a parent block or a
    script, which the proof lacks, so no difference between the pages is no proof of none. A block's own optional custom
    property is known, so its fallback is what the block really draws; a property with a fallback that nothing here defines
    is still unknown, because a client site defines it."""
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


def scan_pairs(pages, run, setting, part, names, pairs, held, conds, widths, selectors) -> dict:
    """Read every (plain, changed) pair of renders for one entry: whether the part is drawn (`seen_part`), whether the
    entry's own rule matches it (`matched`), the first pair that proves it (`verdict`, `evidence`, `kind`), and the other
    parts the same properties change on (`refile`)."""
    r = {'seen_part': False, 'matched': False, 'verdict': None, 'evidence': None, 'kind': None, 'refile': set()}
    for b, c in pairs:
        pb, pc = pages.get(b, held, conds), pages.get(c, held, conds)
        eb, ec = pb.elements(part), pc.elements(part)
        if not eb and not ec:
            continue
        r['seen_part'] = True
        if bool(eb) != bool(ec):
            r.update(verdict='proved', evidence=f'the part is drawn only in the {"changed" if ec else "plain"} render', kind='switched-on')
            return r
        diffs = []
        for (xb, pse), (xc, _) in zip(eb, ec):
            for w in widths:
                for prop in names:
                    vb, vc = pb.value(xb, pse, prop, w), pc.value(xc, pse, prop, w)
                    if vb != vc:
                        diffs.append((prop, w, vb, vc))
        if diffs:
            r.update(verdict='proved', evidence=[list(map(str, d)) for d in diffs[:3]], kind=kind_of(run, c, b, setting, diffs))
            return r
        # nothing differs on the part: does the entry's own rule match it here?
        for sel in selectors:
            try:
                ids = {id(el) for el, _ in ec}
                if any(id(x) in ids for x in sv.select(C.resting(_strip_pseudo(sel), held), pc.soup)):
                    r['matched'] = True
            except Exception:
                pass
        r['refile'] |= other_parts(pb, pc, names, widths, part)
    return r


def prove(short: str, run: dict):
    """(entries with kind, report). Entries proved or blind keep their key; re-filed ones move; removed ones go."""
    pages = Pages(short, run)
    plain = Pages(short, run, with_theme=False) if pages.theme['loaded'] else pages
    out, report = {}, {'proved': [], 'refiled': [], 'removed': [], 'blind': [], 'deadParts': [], 'completions': [],
                       'theme': pages.theme, 'frame': pages.frame}
    scan = scan_of(run, short)
    dead_seen = {}
    for k, e in run['entries'].items():
        setting, part, props, state, tiers = e['setting'], e['part'], e['props'], e['state'], e['tiers']
        names = longhands(props)
        pairs = sorted(run['pairs'].get(k, ()))
        selectors = run['selectors'].get(k, ())
        held = {state} if state else set()
        conds = conditions_of(tiers)
        widths = sorted(R.tier_widths(tiers) or WIDTHS)
        verdict, evidence, kind, cause, refile = None, None, None, None, set()
        container = [t for t in tiers if t.lstrip().startswith('@container')]
        if state and not holdable(state):
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
                    theme = set()
                    for b, c in pairs:
                        for j in (b, c):
                            pg = pages.get(j, held, conds)
                            for el, pse in pg.elements(part)[:1]:
                                for w in widths:
                                    theme |= outside_vars(pg, el, pse, names, w, conds, pages.known)
                    changed_decl = declaration_changes(pages, pairs, part, names, widths, held, conds)
                    other = None if theme else scan_pairs(pages, run, setting, part, names, sibling_pairs(run, setting, pairs), held, conds, widths, selectors)
                    second = '' if (theme or (other and other['verdict'])) else second_value(pages, run, pairs, setting, part, names, widths, held, conds)
                    under = '' if (theme or second or not changed_decl) else underlay_test(pages, pairs, part, names, widths, held, conds)
                    if unnamed and not second:
                        verdict, cause, evidence = 'blind', 'state-not-holdable', f'the rule holds in a state the record cannot name ({", ".join(unnamed)}), which the proof cannot hold'
                    elif theme:
                        verdict, cause, evidence = 'blind', 'theme-value', f'the value reads {sorted(theme)[:4]}, defined by neither the theme (loaded: {pages.theme["loaded"]}) nor the block\'s own sheets'
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
                    elif changed_decl:
                        verdict, cause, evidence = 'blind', 'same-value-here', f'the winning declaration changes ({changed_decl}) but computes to the same value in these renders, also over a sentinel underlay (it inherits, or meets a floor or the initial value)'
                    elif container:
                        # the container's width between the three sampled screens is not seen: no difference here is no proof of none
                        verdict, cause, evidence = 'blind', 'container-query', f'under a container query ({container[0]}): the container is {sorted(set(pages.frame.values()))} px wide at the three screen widths, and the threshold of its rule may sit between them'
                    elif theme_winner(pages, pairs, part, names, widths, held, conds):
                        verdict, cause, evidence = 'blind', 'same-value-here', 'the winning declaration is a rule of the theme in this page frame, the same with and without the setting (' + theme_winner(pages, pairs, part, names, widths, held, conds) + '): another layout would not apply it, so the entry stays'
                    else:
                        verdict, evidence = 'removed', 'the winning declaration is the same with and without the setting, also with a second test value: ' + winner_note(pages, pairs[-1], part, names, widths, held, conds)
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


# Why an entry stays unproved, by the cause slug each mechanism or task owns (README, "The record"). A caller that names no
# cause gets the slug whose words its evidence carries.
UNPROVED = (
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
    """A part, class or data attribute the renders here lack, printed by the setting the scanner says decides it
    (instances.switching_attrs): the plain and the changed render again with that setting moved (each test value it has,
    then all together), and the first pair that draws the part (or matches the entry's rule) is the pair the entry is
    proved on. Returns {'pair': (plain job, changed job), 'with': attrs} or None."""
    rn = run.get('renderer')
    if rn is None or scan is None or not pairs:
        return None
    base = part.split('::')[0].split(' ')[0]
    if missing_part:
        tokens, data = [base], []
    else:
        present = _present(pages, pairs, held, conds)
        tokens = sorted({c for s in selectors for c in C.required_classes(C.resting(_strip_pseudo(s), held))} - present)
        data = sorted({m for s in selectors for m in _ATTR_NEED.findall(s)})
    attrs = [a for a in I.switching_attrs(scan, tokens, data) if a != setting]
    if not attrs:
        return None
    plugin, short = Path(run['plugin']), pages.short
    b, c = pairs[0]
    base_attrs, changed_attrs = run['jobs'][b], run['jobs'][c]
    options = {a: I.switching_values(plugin, short, a, changed_attrs) for a in attrs}
    cands = [v for a in attrs for v in options[a]]                     # one setting at a time
    for i, a in enumerate(attrs[:4]):                                  # then two together (a class that needs both)
        for a2 in attrs[i + 1:4]:
            cands += [{**v, **w} for v in options[a][:4] for w in options[a2][:4]]
    if len(attrs) > 2:
        cands.append({k: v for a in attrs for k, v in (options[a][0] if options[a] else {}).items()})
    memo = run.setdefault('_completed', {})
    key = (tuple(tokens), tuple(data), part)
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
    for i in range(0, min(len(order), 30), 6):                         # six candidates (twelve renders) at a time, in parallel
        chunk = order[i:i + 6]
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
