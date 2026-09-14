#!/usr/bin/env python3
"""2026-09-14-nav-menu-split-classify.py — deterministic bar / drawer / both verdict for every
`sgs/nav-menu` attribute, as the input to Step 2 of the nav-menu split.

THE QUESTION: when `sgs/nav-menu` becomes `sgs/nav-bar-menu` + `sgs/nav-drawer-menu`, which
block does each of its OWN attributes belong to? (Framework-injected attributes — fx*, sgs*
extensions — attach to every block automatically and are excluded.) Getting one wrong is silent — the client
simply loses a control, or keeps a control that does nothing.

WHY NOT READ THE CODE: `render.php` forks the MARKUP deterministically
(`sgs_nav_menu_render_items` vs `sgs_nav_menu_render_items_drawer`), but it calls its CSS
emitters for BOTH forks. `sgs_nav_menu_trigger_css` runs for a drawer instance that renders no
burger. "Which branch reads the attribute" would therefore call every burger attribute "both".

THE METHOD, all mechanical:
  1. `...-classify-harness.php` renders the block inside WordPress on the canary, in the bar
     context and the drawer context, once as a baseline and once per attribute with that
     attribute changed. It returns the markup and the CSS rules that changed.
  2. For each fork, an attribute AFFECTS that fork when either its markup changed, or a
     changed CSS rule's selector matches an element that fork actually rendered.
  3. A changed rule whose selector matches nothing in that fork is DEAD CSS there — reported
     separately, because it is exactly the case static analysis gets wrong.

Selectors are matched structurally: pseudo-classes (`:hover`), pseudo-elements (`::after`)
and client-side runtime attributes (`aria-current`, `[open]`) are stripped first, since the
server render cannot carry them. Stripping a qualifier only ever WIDENS a selector, so it can
never make a fork look unaffected when it is affected.

⛔ A SELECTOR THAT CANNOT BE PARSED IS NEVER COUNTED AS "MATCHES NOTHING". That would silently
exclude a fork. It is reported as UNCERTAIN instead.

MODES
  --run            render on the canary over SSH, then classify (read-only: zero DB writes —
                   see the harness docblock)
  --from FILE      classify a saved harness JSON offline
  --save FILE      with --run, also save the raw harness JSON for re-analysis
  --out FILE       write the classification (no markup blobs) as JSON
  --self-test      offline controls for the selector normaliser and the verdict logic
"""

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

from bs4 import BeautifulSoup
from soupsieve import SelectorSyntaxError

sys.stdout.reconfigure(encoding='utf-8')

HERE = Path(__file__).resolve().parent
HARNESS = HERE / '2026-09-14-nav-menu-split-classify-harness.php'
SENTINELS = HERE / '2026-09-14-nav-menu-split-classify-sentinels.php'

SSH = ['ssh', '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=20',
       '-i', str(Path.home() / '.ssh' / 'id_ed25519'), '-p', '65002',
       'u945238940@141.136.39.73']
WP_ROOT = 'domains/sandybrown-nightingale-600381.hostingersite.com/public_html'

US = '\x1f'  # rule field separator — see the harness's sgs_probe_rules()

# ── Selector normalisation ─────────────────────────────────────────────────────────────

_PSEUDO_ELEMENT = re.compile(
    r'::?(?:before|after|marker|backdrop|placeholder|selection|first-line|first-letter|'
    r'file-selector-button)\b')
_STATE_PSEUDO = re.compile(
    r':(?:hover|focus-visible|focus-within|focus|active|visited|checked|disabled|enabled|'
    r'target|placeholder-shown|popover-open)\b')
_ATTR = re.compile(
    r'\[\s*([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*(?:([~|^$*]?=)\s*("[^"]*"|\'[^\']*\'|[^\]\s]+)'
    r'\s*[iIsS]?)?\s*\]')
# Set in the browser after load, so the server render never carries them.
RUNTIME_ATTRS = {'aria-current', 'open', 'data-drill-enhanced', 'data-drill-active',
                 'data-sgs-nav-fixed'}
_EMPTY_FUNC = re.compile(r':(?:not|is|where|has)\(\s*\)')


def split_selector_list(sel: str) -> list[str]:
    """Split on top-level commas only — `:is(.a, .b)` must stay one selector."""
    out, depth, buf = [], 0, []
    for ch in sel:
        if ch in '([':
            depth += 1
        elif ch in ')]':
            depth -= 1
        if ch == ',' and depth == 0:
            out.append(''.join(buf).strip())
            buf = []
        else:
            buf.append(ch)
    if ''.join(buf).strip():
        out.append(''.join(buf).strip())
    return out


def normalise(sel: str) -> str:
    """Reduce a selector to the structural part a server render can match."""
    def attr(m):
        name, op = m.group(1), m.group(2)
        if name in RUNTIME_ATTRS:
            return ''
        # Relax value conditions to presence: [aria-expanded="true"] -> [aria-expanded].
        # The server emits aria-expanded="false"; the open state only exists at runtime.
        return f'[{name}]' if op else m.group(0)

    s = _ATTR.sub(attr, sel)
    s = _PSEUDO_ELEMENT.sub('', s)
    s = _STATE_PSEUDO.sub('', s)
    prev = None
    while prev != s:
        prev, s = s, _EMPTY_FUNC.sub('', s)
    s = re.sub(r'\s*([>+~])\s*$', '', s)      # dangling combinator left by a strip
    s = re.sub(r'^\s*[>+~]\s*', '', s)
    return re.sub(r'\s+', ' ', s).strip()


# ── Verdict logic ──────────────────────────────────────────────────────────────────────

def fork_effect(html: str, html_changed: bool, changed_rules: list[str], matcher=None):
    """Returns (affected, matched, dead, uncertain) for one fork."""
    soup = BeautifulSoup(html, 'html.parser')
    match = matcher or (lambda s: soup.select_one(s) is not None)
    matched, dead, uncertain = [], [], []
    for rule in changed_rules:
        parts = rule.split(US)
        sel = parts[1] if len(parts) >= 3 else rule
        if sel.startswith('@'):
            uncertain.append(sel)          # @keyframes / @font-face — no element to match
            continue
        for one in split_selector_list(sel):
            norm = normalise(one)
            if not norm:
                uncertain.append(one)
                continue
            try:
                (matched if match(norm) else dead).append(one)
            except (SelectorSyntaxError, NotImplementedError, ValueError):
                uncertain.append(one)
    return (html_changed or bool(matched)), matched, dead, uncertain


def classify(doc: dict, matcher_factory=None) -> dict:
    base = doc['baseline']
    out = {}
    for name, row in doc['attributes'].items():
        per = {}
        for fork in ('bar', 'drawer'):
            f = row[fork]
            html = f['html'] if f['html'] is not None else base[fork]['html']
            m = matcher_factory(html) if matcher_factory else None
            affected, matched, dead, uncertain = fork_effect(
                html, f['html_changed'], f['changed_rules'], m)
            per[fork] = {'affected': affected, 'html_changed': f['html_changed'],
                         'matched': sorted(set(matched)), 'dead': sorted(set(dead)),
                         'uncertain': sorted(set(uncertain))}
        out[name] = finish(per, [row['sentinel']], bool(row.get('sentinel_equals_baseline')))
    return out


def finish(per: dict, sentinels: list, untested: bool) -> dict:
    """Turn per-fork evidence into a verdict. Shared by single-config and merged results."""
    bar, drw = per['bar']['affected'], per['drawer']['affected']
    if bar and drw:
        verdict = 'BOTH'
    elif bar:
        verdict = 'BAR'
    elif drw:
        verdict = 'DRAWER'
    elif per['bar']['dead'] or per['drawer']['dead']:
        verdict = 'DEAD-CSS'
    elif untested:
        # The test value equalled the value already in force, so nothing was actually changed.
        # Reporting that as NO-EFFECT is how four generator bugs hid in v1.
        verdict = 'UNTESTED'
    else:
        verdict = 'NO-EFFECT'
    # A fork is only uncertain if it is NOT already affected — an affected fork's verdict
    # cannot be changed by one more unparseable selector.
    unsure = [fk for fk in ('bar', 'drawer') if per[fk]['uncertain'] and not per[fk]['affected']]
    return {'verdict': verdict, 'uncertain_forks': unsure, 'sentinels': sentinels, **per}


def merge(results: list[dict]) -> dict:
    """Union across configurations. The ownership question is "can this control EVER affect
    this fork", so a fork counts as affected if it is affected under any configuration. An
    enabler reveals an effect; it cannot move one between forks, because which fork renders
    which element is structural."""
    out = {}
    for name in results[0]:
        rows = [r[name] for r in results]
        per = {}
        for fk in ('bar', 'drawer'):
            per[fk] = {
                'affected': any(r[fk]['affected'] for r in rows),
                'html_changed': any(r[fk]['html_changed'] for r in rows),
                'matched': sorted({x for r in rows for x in r[fk]['matched']}),
                'dead': sorted({x for r in rows for x in r[fk]['dead']}),
                'uncertain': sorted({x for r in rows for x in r[fk]['uncertain']}),
            }
        untested = all(r['verdict'] == 'UNTESTED' for r in rows)
        out[name] = finish(per, [s for r in rows for s in r['sentinels']], untested)
    return out


# ── Live-run preconditions and controls ────────────────────────────────────────────────

# Expected verdicts derived from render.php's STRUCTURE, not from this tool's output:
#   burgerSize            — the burger is only emitted when not a drawer list (render.php
#                           `$toggle_html = $sgs_nm_is_drawer_list ? '' : ...`)
#   megaDrawerFallbackIds — passed only to sgs_nav_menu_render_items_drawer()
#   listColumns           — its CSS is scoped `.sgs-nav-drawer …`; proves forks render inside
#                           their REAL ancestors (v1 rendered in isolation and scored it DEAD)
#   burgerFontSize        — styles `.sgs-nav-menu__burger-text`, which only renders when the
#                           trigger shows text; proves the enabler configuration ran (v1: DEAD)
POSITIVE_CONTROLS = {'burgerSize': 'BAR', 'megaDrawerFallbackIds': 'DRAWER',
                     'listColumns': 'DRAWER', 'burgerFontSize': 'BAR'}


def preconditions(doc: dict) -> list[str]:
    if 'error' in doc:
        return [f'harness refused: {doc["error"]}']
    errs = []
    meta = doc['meta']
    if not meta.get('lifter_detached'):
        errs.append('CSS lifter still attached — every render would report zero CSS')
    if not meta.get('mega_id'):
        errs.append('no sgs_mega_menu post on the site — mega code paths are unexercised')
    for cfg, c in doc['configs'].items():
        for fork, ok in c['deterministic'].items():
            if not ok:
                errs.append(f'config {cfg}: {fork} baseline is NOT deterministic across two renders — '
                            f'every attribute would show a spurious change')
        for fork in ('bar', 'drawer'):
            if c['baseline'][fork]['rule_count'] == 0:
                errs.append(f'config {cfg}: {fork} baseline has zero CSS rules')
        # Structural: each fork must actually have rendered its own shape. A wrapper that
        # failed to provide context would render the bar shape twice and look "deterministic".
        bar_html, drw_html = c['baseline']['bar']['html'], c['baseline']['drawer']['html']
        if 'sgs-nav-menu__bar--drawer' in bar_html or 'sgs-nav-menu__bar' not in bar_html:
            errs.append(f'config {cfg}: the bar fork did not render the bar shape')
        if 'sgs-nav-menu__bar--drawer' not in drw_html:
            errs.append(f'config {cfg}: the drawer fork did not render the drawer shape')
        if 'sgs-nav-drawer' not in drw_html:
            errs.append(f'config {cfg}: the drawer fork is missing its real .sgs-nav-drawer ancestor')
    return errs


def run_harness() -> dict:
    sentinels = re.sub(r'^\s*<\?php', '', SENTINELS.read_text(encoding='utf-8'), count=1)
    stream = HARNESS.read_text(encoding='utf-8') + '\n' + sentinels
    cmd = SSH + [f'cd {WP_ROOT} && wp eval-file - 2>/dev/null']
    proc = subprocess.run(cmd, input=stream, capture_output=True, text=True,
                          encoding='utf-8', timeout=900)
    raw = proc.stdout.strip()
    start = raw.find('{')
    if proc.returncode != 0 or start == -1:
        raise SystemExit(f'harness failed (rc={proc.returncode}): {proc.stderr[:600] or raw[:600]}')
    return json.loads(raw[start:])


# ── Report ─────────────────────────────────────────────────────────────────────────────

def report(doc: dict, result: dict) -> int:
    meta = doc['meta']
    # Defensive: harness runs before the `_note` fix counted two block.json prose annotations as
    # injected. Filtering here keeps older --save files reporting the true figure.
    injected = [n for n in meta['injected'] if not n.startswith('_note')]
    print(f'{meta["own_count"]} OWN attribute(s) classified across {len(doc["configs"])} '
          f'configuration(s). {len(injected)} framework-injected attribute(s) excluded — '
          f'every block receives those automatically, so they are not a split decision.')
    for cfg, c in doc['configs'].items():
        print(f'   config {cfg}: baseline CSS rules bar {c["baseline"]["bar"]["rule_count"]}, '
              f'drawer {c["baseline"]["drawer"]["rule_count"]}  |  deterministic {c["deterministic"]}')
    print()

    groups = {}
    for name, r in result.items():
        groups.setdefault(r['verdict'], []).append(name)
    for verdict in ('BAR', 'DRAWER', 'BOTH', 'DEAD-CSS', 'NO-EFFECT', 'UNTESTED'):
        names = sorted(groups.get(verdict, []))
        print(f'── {verdict} ({len(names)}) ' + '─' * max(0, 60 - len(verdict)))
        for n in names:
            r = result[n]
            why = []
            for fk in ('bar', 'drawer'):
                p = r[fk]
                if p['html_changed']:
                    why.append(f'{fk}:markup')
                elif p['matched']:
                    why.append(f'{fk}:css')
                if p['dead'] and not p['affected']:
                    why.append(f'{fk}:DEAD-css×{len(p["dead"])}')
            flag = f'   ⚠ uncertain in {",".join(r["uncertain_forks"])}' if r['uncertain_forks'] else ''
            print(f'   {n:34} {", ".join(why)}{flag}')
        print()

    dead_other = [n for n, r in result.items() if r['verdict'] in ('BAR', 'DRAWER')
                  and r['drawer' if r['verdict'] == 'BAR' else 'bar']['dead']]
    if dead_other:
        print(f'── EMITS DEAD CSS INTO THE OTHER FORK ({len(dead_other)}) — the case static '
              f'"which branch reads it" analysis gets wrong')
        for n in sorted(dead_other):
            other = 'drawer' if result[n]['verdict'] == 'BAR' else 'bar'
            print(f'   {n:34} {result[n]["verdict"]}-only, but emits {len(result[n][other]["dead"])} '
                  f'rule(s) into the {other} that match nothing')
        print()

    failed = []
    for name, want in POSITIVE_CONTROLS.items():
        got = result.get(name, {}).get('verdict')
        if got != want:
            failed.append(f'{name}: expected {want} from render.php structure, got {got}')
    unsure = sorted(n for n, r in result.items() if r['uncertain_forks'])
    print(f'POSITIVE CONTROLS: {"PASS" if not failed else "FAIL"}')
    for f in failed:
        print(f'   ✗ {f}')
    if unsure:
        print(f'UNCERTAIN ({len(unsure)}) — a selector could not be parsed in an unaffected fork; '
              f'resolve by hand before trusting: {", ".join(unsure)}')
    return 1 if failed else 0


# ── Self-test ──────────────────────────────────────────────────────────────────────────

def self_test() -> int:
    fails = []

    def eq(label, got, want):
        if got != want:
            fails.append(f'{label}: expected {want!r}, got {got!r}')

    eq('runtime aria-current is dropped, pseudo-element stripped',
       normalise('.nav a[aria-current="page"]::after'), '.nav a')
    eq('value relaxed to presence, state pseudo stripped',
       normalise('.x__burger[aria-expanded="true"]:hover'), '.x__burger[aria-expanded]')
    eq('an emptied :not() is removed, not left invalid',
       normalise('.x__link:not(:hover)'), '.x__link')
    eq('[open] on <details> is runtime-only',
       normalise('.x__acc[open] > .x__panel'), '.x__acc > .x__panel')
    eq('a server-emitted data attribute is kept',
       normalise('.x__bar[data-sgs-nav-indicator]'), '.x__bar[data-sgs-nav-indicator]')
    eq('commas inside :is() do not split the selector',
       split_selector_list(':is(.a, .b) .c, .d'), [':is(.a, .b) .c', '.d'])

    bar_html = '<nav class="n"><ul class="n__bar"><li><a class="n__link">A</a></li></ul>' \
               '<div class="n__toggle"><button class="n__burger" aria-expanded="false"></button></div></nav>'
    drw_html = '<nav class="n"><ul class="n__bar n__bar--drawer"><li><details class="n__acc">' \
               '<summary>A</summary></details></li></ul></nav>'
    r = lambda sel: f'{US}{sel}{US}color:red'

    doc = {'baseline': {'bar': {'html': bar_html}, 'drawer': {'html': drw_html}},
           'attributes': {
               # emitted into BOTH forks' CSS, but the burger exists only in the bar
               'burgerOnly': {'sentinel': 1,
                              'bar': {'html_changed': False, 'html': None,
                                      'changed_rules': [r('.n__burger[aria-expanded="true"]')]},
                              'drawer': {'html_changed': False, 'html': None,
                                         'changed_rules': [r('.n__burger[aria-expanded="true"]')]}},
               'drawerMarkup': {'sentinel': 1,
                                'bar': {'html_changed': False, 'html': None, 'changed_rules': []},
                                'drawer': {'html_changed': True, 'html': drw_html, 'changed_rules': []}},
               'shared': {'sentinel': 1,
                          'bar': {'html_changed': False, 'html': None, 'changed_rules': [r('.n__link')]},
                          'drawer': {'html_changed': False, 'html': None, 'changed_rules': [r('.n__bar')]}},
               'deadEverywhere': {'sentinel': 1,
                                  'bar': {'html_changed': False, 'html': None, 'changed_rules': [r('.n__mega')]},
                                  'drawer': {'html_changed': False, 'html': None, 'changed_rules': [r('.n__mega')]}},
               'nothing': {'sentinel': 1,
                           'bar': {'html_changed': False, 'html': None, 'changed_rules': []},
                           'drawer': {'html_changed': False, 'html': None, 'changed_rules': []}},
               # an unparseable selector must NOT quietly exclude the drawer
               'unparseable': {'sentinel': 1,
                               'bar': {'html_changed': False, 'html': None, 'changed_rules': [r('.n__link')]},
                               'drawer': {'html_changed': False, 'html': None, 'changed_rules': [r('.n__bar >>> ]')]}},
           }}
    got = classify(doc)
    eq('dead-CSS-in-drawer case resolves to BAR, not BOTH', got['burgerOnly']['verdict'], 'BAR')
    eq('the drawer is recorded as receiving dead CSS', bool(got['burgerOnly']['drawer']['dead']), True)
    eq('a markup-only change is attributed to its fork', got['drawerMarkup']['verdict'], 'DRAWER')
    eq('matching CSS in each fork is BOTH', got['shared']['verdict'], 'BOTH')
    eq('CSS matching nothing anywhere is DEAD-CSS, not NO-EFFECT', got['deadEverywhere']['verdict'], 'DEAD-CSS')
    eq('no change at all is NO-EFFECT', got['nothing']['verdict'], 'NO-EFFECT')
    eq('an unparseable selector flags the fork UNCERTAIN', got['unparseable']['uncertain_forks'], ['drawer'])
    eq('...and is not silently counted as a dead-CSS match', got['unparseable']['drawer']['dead'], [])

    # NEGATIVE CONTROL: a matcher that always says "matches" must turn the dead-CSS cases into
    # BOTH. If it does not, the verdict logic never consults the matcher and every result
    # above is decided by something other than the selectors.
    always = classify(doc, matcher_factory=lambda _h: (lambda _s: True))
    if always['burgerOnly']['verdict'] != 'BOTH' or always['deadEverywhere']['verdict'] != 'BOTH':
        fails.append('NEGATIVE CONTROL FAILED: an always-matching matcher did not change the '
                     'dead-CSS verdicts — the classifier is not deciding by selector match')

    # ── Configuration merge + UNTESTED (the v1 generator bugs) ──
    empty = {'affected': False, 'html_changed': False, 'matched': [], 'dead': [], 'uncertain': []}
    hit = dict(empty, affected=True, matched=['.x'])
    def res(bar, drw, verdict):
        return {'n': {'verdict': verdict, 'sentinels': [1], 'uncertain_forks': [],
                      'bar': bar, 'drawer': drw}}
    merged = merge([res(empty, empty, 'NO-EFFECT'), res(hit, empty, 'BAR')])
    eq('a fork affected under ANY configuration counts (union)', merged['n']['verdict'], 'BAR')
    merged = merge([res(empty, empty, 'UNTESTED'), res(empty, empty, 'UNTESTED')])
    eq('untested in every configuration stays UNTESTED, never NO-EFFECT', merged['n']['verdict'], 'UNTESTED')
    merged = merge([res(empty, empty, 'UNTESTED'), res(empty, empty, 'NO-EFFECT')])
    eq('genuinely tested once with no effect is NO-EFFECT', merged['n']['verdict'], 'NO-EFFECT')
    one = {'baseline': {'bar': {'html': bar_html}, 'drawer': {'html': drw_html}},
           'attributes': {'same': {'sentinel': 1, 'sentinel_equals_baseline': True,
                                   'bar': {'html_changed': False, 'html': None, 'changed_rules': []},
                                   'drawer': {'html_changed': False, 'html': None, 'changed_rules': []}}}}
    eq('a test value equal to the baseline is UNTESTED', classify(one)['same']['verdict'], 'UNTESTED')

    total = 6 + 8 + 1 + 4
    if fails:
        print(f'[classify --self-test] FAIL — {len(fails)} of {total}:')
        for f in fails:
            print(f'   - {f}')
        return 1
    print(f'[classify --self-test] OK — {total} check(s), including a negative control proving '
          f'verdicts are decided by selector matching.')
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    mode = ap.add_mutually_exclusive_group(required=True)
    mode.add_argument('--run', action='store_true')
    mode.add_argument('--from', dest='src')
    mode.add_argument('--self-test', action='store_true')
    ap.add_argument('--save')
    ap.add_argument('--out')
    args = ap.parse_args()

    if args.self_test:
        return self_test()

    doc = run_harness() if args.run else json.loads(Path(args.src).read_text(encoding='utf-8'))
    if args.run and args.save:
        Path(args.save).write_text(json.dumps(doc), encoding='utf-8')

    errs = preconditions(doc)
    if errs:
        print('PRECONDITIONS FAILED — refusing to classify:')
        for e in errs:
            print(f'   ✗ {e}')
        return 2

    result = merge([classify(c) for c in doc['configs'].values()])
    if args.out:
        # results carry evidence and verdicts only — markup blobs stay in the raw --save file
        Path(args.out).write_text(json.dumps(result, indent=1, ensure_ascii=False), encoding='utf-8')
    return report(doc, result)


if __name__ == '__main__':
    sys.exit(main())
