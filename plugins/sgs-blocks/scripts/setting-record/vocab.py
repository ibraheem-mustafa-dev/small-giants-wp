"""The vocabulary rules that decide when two descriptions of a block name the same thing, kept apart from the
reference modules they refine (block-source-scan/reference.py and score.py are used as they are, not patched).

  canon_props     a property as the reference names it, plus: `flex` is flex-grow, flex-shrink and flex-basis.
  plain_tiers     a tier list without `@media (prefers-reduced-motion: no-preference)`: that is the normal state.
  items           score.scan_items with canon_props above and plain tiers.
  fold_units      a fooUnit entry merged into foo (re-exported from score).
  fold_prefixed   a `-webkit-X` entry is not an entry of its own when the standard `X` is declared beside it.
  same_element    the one part name of an element that carries two part classes.
  norm_state      a placement's state as the record names it: the reference's names plus `filled`.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
SCAN = HERE.parent / 'block-source-scan'
if str(SCAN) not in sys.path:
    sys.path.insert(0, str(SCAN))
import reference as R  # noqa: E402
import score as S  # noqa: E402

fold_units = S.fold_units

# State names the record has beyond the reference's (block-source-scan/reference.py::STATE_WORDS, shared and read-only):
# `filled` is an input that holds a value, the rule `:not(:placeholder-shown)`.
EXTRA_STATES = ('filled',)
_FILLED = re.compile(r':not\(\s*:placeholder-shown\s*\)')

_NO_PREFERENCE = re.compile(r'@media\(prefers-reduced-motion:no-preference\)')


def canon_props(prop) -> set:
    """reference.canon_props, except that `flex` stands for its three longhands (the reference leaves it whole, so a
    flex-grow written on its own would not meet a `flex` shorthand)."""
    if str(prop).strip().removeprefix('css:').strip() == 'flex':
        return {'flex-grow', 'flex-shrink', 'flex-basis'}
    return R.canon_props(prop)


def is_no_preference(tier) -> bool:
    """True for @media (prefers-reduced-motion: no-preference) in any spacing or letter case."""
    return bool(_NO_PREFERENCE.fullmatch(re.sub(r'\s+', '', str(tier).lower())))


def plain_tiers(tiers) -> list:
    """The tiers without `@media (prefers-reduced-motion: no-preference)`: a page with no motion preference is the
    normal state, not a condition, so the tier does not narrow where a rule holds."""
    return [t for t in (tiers or ()) if not is_no_preference(t)]


def norm_state(state, selector=None):
    """A placement's state as the record names it. The reference's names (hover, focus, current, open, disabled,
    active, checked) and any other token stay as R.norm_state gives them; a placement with no state whose rule waits on
    `:not(:placeholder-shown)` (a field with a value) is `filled`."""
    named = R.norm_state(state)
    if named is None and selector and _FILLED.search(selector):
        return 'filled'
    return named


def items(placements: list, root_tok: str, aliases=()) -> list:
    """score.scan_items, with this module's canon_props and with no-preference tiers dropped (so two placements that
    differ only by that tier are one item). One item per (part, declared property) of every placement that paints. Placements
    that make one item show one selector: the smallest by `(len, text)`, so a record rewritten from the same code names the same
    selector whatever order the renders came back in."""
    out, seen = [], {}
    for p in placements:
        if not p.get('props'):
            continue
        key = S.scan_key(p.get('part'), root_tok, aliases)
        ev = S.evidence_of(p)
        tiers = tuple(plain_tiers(p.get('tiers')))
        for prop in p['props']:
            cps = tuple(sorted(canon_props(prop)))
            if not cps:
                continue
            sig = (key, cps, norm_state(p.get('state'), p.get('selector')), tiers, ev)
            if sig in seen:
                held = seen[sig]
                sel = p.get('selector')
                if sel and (not held.get('selector') or (len(sel), sel) < (len(held['selector']), held['selector'])):
                    held['selector'] = sel
                continue
            item = {'part': key, 'prop': '|'.join(cps), 'props': list(cps), 'state': sig[2], 'tiers': list(tiers), 'evidence': ev,
                    'mechanism': p['mechanism'], **({'selector': p['selector']} if p.get('selector') else {})}
            seen[sig] = item
            out.append(item)
    return out


def fold_prefixed(items_: list) -> tuple:
    """(kept, dropped). An item whose properties are all `-webkit-X` is dropped when another item with the same part,
    state and tiers has the standard `X` for each of them: the -webkit- line is the same paint written again for
    older browsers, not a second entry. A -webkit- property with no standard twin stays."""
    have = {}
    for i in items_:
        have.setdefault((i['part'], i['state'], tuple(i['tiers'])), set()).update(i['props'])
    kept, dropped = [], []
    for i in items_:
        twins = have[(i['part'], i['state'], tuple(i['tiers']))]
        if i['props'] and all(p.startswith('-webkit-') and p[len('-webkit-'):] in twins for p in i['props']):
            dropped.append(i)
        else:
            kept.append(i)
    return kept, dropped


def same_element(classes) -> str:
    """The part name of an element that carries more than one part class.

    One element can carry two part classes (nav-bar-menu's burger bar has `sgs-nav-bar-menu__burger-bar` and
    `sgs-nav-bar-menu__burger-bar-1`), and the scan names it by one while the render names it by the other. Rule: a
    part class is a BEM element class (it contains `__`) with no modifier (no `--`); the SHORTEST part class wins
    (the longer is the same name plus a counter), ties broken alphabetically. An element with no part class takes the
    shortest modifier-free class (its block class); an empty list gives ''."""
    cls = sorted({c for c in classes if c.startswith('sgs-')})
    parts = [c for c in cls if '__' in c and '--' not in c]
    pool = parts or [c for c in cls if '--' not in c] or cls
    return min(pool, key=lambda c: (len(c), c)) if pool else ''
