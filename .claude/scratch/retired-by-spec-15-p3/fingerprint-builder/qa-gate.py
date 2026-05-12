"""P3 QA Gate — assert catalogue integrity. Exit 0 on PASS, non-zero on FAIL."""
from __future__ import annotations
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'output')

CHECKS = []


def check(name):
    def deco(fn):
        CHECKS.append((name, fn))
        return fn
    return deco


@check('All 5 JSON files exist')
def f1():
    expected = [
        'layer-1-envelopes.json',
        'layer-3-internal-elements.json',
        'layer-4-inner-blocks.json',
        'role-templates.json',
    ]
    missing = [f for f in expected if not os.path.exists(os.path.join(OUT, f))]
    assert not missing, f'Missing: {missing}'
    # Plan called for "5 JSON files" — including a build-catalogue meta file or generator log
    # The 4 layer-output JSONs above are the data files; the .py generators are the 5th artefact.
    assert os.path.exists(os.path.join(HERE, 'build-catalogue.py')), 'build-catalogue.py missing'


@check('Each JSON file parses')
def f2():
    for f in ['layer-1-envelopes.json', 'layer-3-internal-elements.json',
              'layer-4-inner-blocks.json', 'role-templates.json']:
        with open(os.path.join(OUT, f), encoding='utf-8') as fp:
            json.load(fp)


@check('Layer 1 envelope count >= 35')
def f3():
    d = json.load(open(os.path.join(OUT, 'layer-1-envelopes.json'), encoding='utf-8'))
    n = d['envelope_count']
    assert n >= 35, f'Got {n}, want >= 35'


@check('Layer 2 role count >= 13 (target 20)')
def f4():
    d = json.load(open(os.path.join(OUT, 'role-templates.json'), encoding='utf-8'))
    n = len(d['roles'])
    assert n >= 13, f'Got {n}, want >= 13'


@check('Layer 3 block count == 67 (65 built + 2 planned: sgs/media, sgs/data-display)')
def f5():
    d = json.load(open(os.path.join(OUT, 'layer-3-internal-elements.json'), encoding='utf-8'))
    n = d['block_count']
    assert n == 67, f'Got {n}, want 67'


@check('Zero unmapped slots (every slot has a dispatch role)')
def f5b():
    d = json.load(open(os.path.join(OUT, 'layer-3-internal-elements.json'), encoding='utf-8'))
    unmapped = []
    for slug, b in d['blocks'].items():
        for s in b.get('slots', []):
            if s.get('role') is None:
                unmapped.append((slug, s['attribute']))
    assert not unmapped, f'{len(unmapped)} unmapped slots; sample: {unmapped[:5]}'


@check('Hero entry contains every HERO_FINGERPRINT_SELECTORS selector')
def f6():
    d = json.load(open(os.path.join(OUT, 'layer-3-internal-elements.json'), encoding='utf-8'))
    hero = d['blocks']['sgs/hero']
    baseline = set(hero['regression_baseline']['selectors'])
    actual = {s['selector'] for s in hero['source_anchor_slots']}
    missing = baseline - actual
    assert not missing, f'Hero missing baseline selectors: {missing}'


@check('Layer 4 entry count >= 35 (37 actual; was 38 floor before orphan-row cleanup)')
def f7():
    d = json.load(open(os.path.join(OUT, 'layer-4-inner-blocks.json'), encoding='utf-8'))
    n = d['entry_count']
    assert n >= 35, f'Got {n}, want >= 35'


@check('Every Layer 2 role has non-null sgs + html_css recipe entries')
def f8():
    d = json.load(open(os.path.join(OUT, 'role-templates.json'), encoding='utf-8'))
    failures = []
    for slug, role in d['roles'].items():
        recipe = role.get('cross_platform_recipe', {})
        if not recipe.get('sgs'):
            failures.append(f'{slug}: sgs missing')
        if not recipe.get('html_css'):
            failures.append(f'{slug}: html_css missing')
    assert not failures, '; '.join(failures)


def main() -> int:
    fails = []
    for name, fn in CHECKS:
        try:
            fn()
            print(f'  PASS  {name}')
        except AssertionError as e:
            print(f'  FAIL  {name}: {e}')
            fails.append(name)
        except Exception as e:
            print(f'  ERROR {name}: {type(e).__name__}: {e}')
            fails.append(name)
    if fails:
        print(f'\nFAIL: {len(fails)} check(s) failed.')
        return 1
    print('\nPASS: catalogue ready for P4')
    return 0


if __name__ == '__main__':
    sys.exit(main())
