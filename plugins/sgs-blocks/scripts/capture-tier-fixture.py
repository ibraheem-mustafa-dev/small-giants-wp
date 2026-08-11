#!/usr/bin/env python
"""Measure the tier-fixture page — one scoped measurement per block, three viewports.

Pairs with `build-tier-fixture-page.py` (which publishes the page and writes the
manifest) and `make-visual-diff-reports.py` (which turns two captures into
per-block visual-diff reports).

WHAT IT MEASURES, AND WHY COMPUTED VALUES RATHER THAN PIXELS
------------------------------------------------------------
The claim under test is "this block's `<property>` renders the value it is set
to, at the tier that applies". That is a COMPUTED value, so it is measured
explicitly; a screenshot corroborates but cannot settle it. (Same reasoning as
the hero capture that produced reports/visual-diff/hero-2026-08-10.md.)

Per block, per viewport:
  * the computed property on the block's own scoped element
  * the same on its `> .sgs-container__inner` band, when one exists — the shared
    wrapper relocates grid/flex onto that element for container-query blocks, so
    measuring only the outer element would miss where the value actually landed
  * `display`, because a gap computes whether or not it can paint — recording
    display keeps "declared" and "visible" separate instead of conflating them
  * the uid class, so a report can cite the exact element it measured
  * every `--sgs-*` custom property in scope, because several blocks route the
    value through a custom property rather than the property itself
  * the bounding box

Plus, once per viewport: console errors, and the served HTML scanned for PHP
diagnostics — `Array to string conversion` is the specific failure a tier object
reaching a scalar read produces, on every render.

⛔ EVERY QUERY IS SCOPED to the selector the manifest supplies. An unscoped
`querySelector('.wp-block-sgs-container')` returned the site HEADER in a previous
session and produced a confident false failure.

Usage:
    python capture-tier-fixture.py --manifest <manifest.json> --label before --out <dir>
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

# Windows consoles default to cp1252, which raises UnicodeEncodeError on the
# em-dashes and arrows in this script's output. Force UTF-8 so a cosmetic
# encoding fault can never masquerade as a failed measurement run.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding='utf-8')
    except (AttributeError, ValueError):
        pass

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    sys.exit('FAIL: playwright is not installed — `pip install playwright` '
             'and `playwright install chromium`.')

VIEWPORTS = [(1440, 900, 'desktop'), (900, 900, 'tablet'), (390, 844, 'mobile')]

# ---------------------------------------------------------------------------
# Attribute name → CSS property name.
#
# ⛔ THIS EXISTS BECAUSE THE SCRIPT SILENTLY MEASURED NOTHING FOR A WHOLE PASS.
# The manifest carries the ATTRIBUTE name (`maxWidth`), and this script fed it
# straight to `getComputedStyle().getPropertyValue()`. CSSOM's getPropertyValue
# takes the HYPHENATED CSS name and returns an EMPTY STRING for anything else —
# it does not throw, and `''` is indistinguishable in the output from "the block
# genuinely has no value". Every measurement for the property came back blank.
#
# It went unnoticed through pass 1 because that pass migrated `gap`, whose
# attribute name and CSS name are IDENTICAL — the one property in the programme
# that cannot expose the bug. It fired the moment pass 2 measured `maxWidth`,
# and only because make-visual-diff-reports.py runs a POSITIVE CONTROL: it sets
# a real per-tier value and refuses to report a PASS unless that value is
# observed to bind. Without that control this would have produced 15 confident
# "no measured value moved" reports off 90 blank readings.
#
# Most names are a plain camelCase → kebab-case conversion. The entries below
# are the ones that are NOT derivable and must be stated:
_CSS_PROPERTY_OVERRIDES = {
    # The content BAND is capped with max-width on the inner element; there is
    # no `content-width` CSS property at all.
    'contentWidth': 'max-width',
    # The `columns` attr drives the grid track list, not the CSS `columns`
    # (multi-column layout) shorthand — measuring `columns` would read an
    # unrelated property that happens to exist. Lands in pass 4.
    'columns': 'grid-template-columns',
}


def css_property_for(attr: str) -> str:
    """Map a block ATTRIBUTE name to the CSS property a browser will answer for.

    camelCase → kebab-case, with the non-derivable cases named explicitly above.
    """
    if attr in _CSS_PROPERTY_OVERRIDES:
        return _CSS_PROPERTY_OVERRIDES[attr]
    out = []
    for ch in attr:
        if ch.isupper():
            out.append('-')
            out.append(ch.lower())
        else:
            out.append(ch)
    return ''.join(out)


def self_test() -> int:
    """Prove the mapping, and prove it can still FAIL.

    A mapping test that only asserts the happy path is the shape that let the
    original defect ship, so the negative cases are asserted too.
    """
    cases = [
        ('gap', 'gap'),                                    # the pass-1 blind spot
        ('maxWidth', 'max-width'),                         # the pass-2 defect
        ('gridTemplateColumns', 'grid-template-columns'),  # pass 3a
        ('gridTemplateRows', 'grid-template-rows'),        # pass 3b
        ('contentWidth', 'max-width'),                     # override, not derivable
        ('columns', 'grid-template-columns'),              # override, not derivable
        ('padding', 'padding'),
    ]
    failures = []
    for attr, expected in cases:
        got = css_property_for(attr)
        if got != expected:
            failures.append(f'  css_property_for({attr!r}) → {got!r}, expected {expected!r}')

    # NEGATIVE CONTROL: the pre-fix behaviour must be detectably wrong, or this
    # test would pass just as happily against the broken version.
    if css_property_for('maxWidth') == 'maxWidth':
        failures.append('  NEGATIVE CONTROL: maxWidth was not converted — the '
                        'pre-fix identity behaviour is still present')
    if 'contentWidth' not in _CSS_PROPERTY_OVERRIDES:
        failures.append('  NEGATIVE CONTROL: contentWidth override missing — it '
                        'would kebab to `content-width`, which no browser answers')

    # BATCH MODE (D572): every property in a batch pass must map to a REAL CSS
    # property. A batch is where a bad mapping hides best — 40 good mappings and
    # one silently-blank reading looks like a clean run, which is precisely the
    # pass-2 failure at larger scale. These are the batch this pass shipped.
    batch = ['minHeight', 'labelFontSize', 'fontSize', 'letterSpacing', 'lineHeight',
             'width', 'height', 'maxHeight', 'iconSize', 'rotation', 'order',
             'alignItems', 'flexDirection', 'flexWrap', 'justifyContent', 'thickness',
             'positionX', 'splitContentOrder', 'maxResults']
    for attr in batch:
        got = css_property_for(attr)
        if not got or got != got.lower() or '_' in got:
            failures.append(f'  BATCH: css_property_for({attr!r}) → {got!r} is not a '
                            'plausible CSS property name')
    # Spot-check the derivable ones actually kebab correctly.
    for attr, expected in (('minHeight', 'min-height'), ('maxHeight', 'max-height'),
                           ('labelFontSize', 'label-font-size'),
                           ('flexDirection', 'flex-direction')):
        if css_property_for(attr) != expected:
            failures.append(f'  BATCH: css_property_for({attr!r}) → '
                            f'{css_property_for(attr)!r}, expected {expected!r}')

    for line in failures:
        print(line)
    # Count every assertion, not just the `cases` table — a count that under-reports
    # what ran makes a growing self-test look static, and this one now covers the
    # batch mappings too. (2 explicit negative controls + the batch checks.)
    total = len(cases) + 2 + len(batch) + 4
    print(f'self-test: {total} assertion(s), {len(failures)} failure(s)')
    return 1 if failures else 0

# Which measured tier each viewport should bind, given the SGS device-tier
# standard (768/1024 — max-width:1023px is tablet, max-width:767px is mobile).
# Read from the standard, not guessed: 900 is < 1024 so it is TABLET, and 390 is
# < 768 so it is MOBILE.
VIEWPORT_TIER = {'desktop': 'desktop', 'tablet': 'tablet', 'mobile': 'mobile'}

PROBE = """(args) => {
  const { selector, props } = args;
  const el = document.querySelector( selector );
  if ( ! el ) {
    return { found: false, selector };
  }
  const read = ( node ) => {
    const c = getComputedStyle( node );
    const r = node.getBoundingClientRect();
    // Every --sgs-* custom property resolvable on this node. Several blocks
    // route the value through a custom property (--sgs-gap,
    // --sgs-card-grid-gap) rather than setting the CSS property directly, so a
    // report that cited only `gap` would call those "unset" when they are not.
    const vars = {};
    for ( const sheet of Array.from( document.styleSheets ) ) {
      let rules;
      try { rules = sheet.cssRules; } catch ( e ) { continue; }  // cross-origin
      for ( const rule of Array.from( rules || [] ) ) {
        if ( ! rule.style ) continue;
        for ( const name of Array.from( rule.style ) ) {
          if ( name.startsWith( '--sgs-' ) && ! ( name in vars ) ) {
            const v = c.getPropertyValue( name ).trim();
            if ( v ) vars[ name ] = v;
          }
        }
      }
    }
    // `props` is a list of {attr, css} pairs — a block can carry several
    // migrated properties (sgs/button has 8), and measuring only one would
    // leave the rest unevidenced while looking complete. `prop` is retained
    // as the FIRST property's value so single-property consumers that predate
    // batch mode keep reading what they expect.
    const propValues = {};
    for ( const p of props ) {
      propValues[ p.attr ] = c.getPropertyValue( p.css );
    }
    return {
      classes: node.className,
      prop: props.length ? c.getPropertyValue( props[ 0 ].css ) : '',
      propValues,
      display: c.display,
      gridTemplateColumns: c.gridTemplateColumns,
      boxWidth: Math.round( r.width ),
      boxHeight: Math.round( r.height ),
      sgsVars: vars,
    };
  };
  const inner = el.querySelector( ':scope > .sgs-container__inner' );
  return {
    found: true,
    selector,
    tag: el.tagName.toLowerCase(),
    outer: read( el ),
    inner: inner ? read( inner ) : null,
  };
}"""

PHP_NEEDLES = ('Array to string conversion', 'Fatal error', 'Warning:',
               'Notice:', 'Deprecated:', 'Uncaught')


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--manifest')
    ap.add_argument('--label', help='before | after')
    ap.add_argument('--out', help='directory for JSON + screenshots')
    ap.add_argument('--url', default=None, help='override the manifest URL')
    ap.add_argument('--self-test', action='store_true',
                    help='prove the attribute→CSS-property mapping (and that it can fail)')
    args = ap.parse_args()

    if args.self_test:
        return self_test()
    missing = [f'--{n}' for n in ('manifest', 'label', 'out') if not getattr(args, n)]
    if missing:
        ap.error('the following arguments are required: ' + ', '.join(missing))

    manifest = json.loads(Path(args.manifest).read_text(encoding='utf-8'))
    url = args.url or manifest.get('url')
    if not url:
        sys.exit('FAIL: manifest has no `url` — publish the fixture page first '
                 '(build-tier-fixture-page.py --publish --manifest …).')

    # The manifest's property names are block ATTRIBUTE names; CSSOM needs the
    # CSS property name. An explicit `css_property` in the manifest still wins
    # for a single-property run, but the fallback CONVERTS rather than assuming
    # the two names are the same. See css_property_for() for why that assumption
    # silently blanked every measurement in pass 2.
    #
    # BATCH MODE (D572): `properties` is the list form; `property` is the
    # single-property form kept for manifests that predate batch mode. Each
    # BLOCK also carries its own `properties` subset, because a 41-property
    # pass does not mean every block has 41 — sgs/button has 8, sgs/heading 1.
    all_props = manifest.get('properties') or (
        [manifest['property']] if manifest.get('property') else [])
    if not all_props:
        sys.exit('FAIL: manifest declares neither `properties` nor `property`.')
    css_override = manifest.get('css_property')
    css_for = {p: (css_override if (css_override and len(all_props) == 1)
                   else css_property_for(p)) for p in all_props}
    for attr, css in css_for.items():
        if css != attr:
            print(f'  property: attr `{attr}` → CSS `{css}`')
    blocks = [b for b in manifest['blocks'] if not b.get('skipped')]
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    result = {
        'label': args.label,
        'url': url,
        'properties': all_props,
        # Retained for single-property consumers that predate batch mode.
        **({'property': all_props[0], 'css_property': css_for[all_props[0]]}
           if len(all_props) == 1 else {}),
        'css_properties': css_for,
        'probe_tiers': manifest.get('probe_tiers'),
        'viewports': {},
    }

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        errors: list[str] = []
        page.on('console', lambda m: errors.append(f'{m.type}: {m.text}')
                if m.type == 'error' else None)
        page.on('pageerror', lambda e: errors.append(f'pageerror: {e}'))

        for width, height, vp in VIEWPORTS:
            page.set_viewport_size({'width': width, 'height': height})
            page.goto(url, wait_until='networkidle')
            page.wait_for_timeout(600)

            # Keyed by dir AND variant: each block appears twice on the page
            # (once rendering its default, once with the property explicitly
            # set), and keying on dir alone would silently overwrite one with
            # the other — losing exactly the comparison the report needs.
            per_block = {}
            for b in blocks:
                # Each block measures ONLY the properties it actually carries —
                # asking for a property a block never declared would read the
                # browser's initial value and record it as evidence, which is
                # exactly the "looks measured, proves nothing" failure this
                # pipeline exists to prevent.
                b_props = b.get('properties') or all_props
                probe_props = [{'attr': p, 'css': css_for.get(p, css_property_for(p))}
                               for p in b_props]
                measured = page.evaluate(
                    PROBE, {'selector': b['selector'], 'props': probe_props})
                measured['variant'] = b['variant']
                measured['block'] = b['dir']
                measured['properties'] = b_props
                per_block[f'{b["dir"]}::{b["variant"]}'] = measured

            html = page.content()
            result['viewports'][vp] = {
                'width': width,
                'expected_tier': VIEWPORT_TIER[vp],
                'blocks': per_block,
                'phpDiagnostics': [n for n in PHP_NEEDLES if n in html],
            }
            page.screenshot(path=str(out_dir / f'{args.label}-{vp}.png'), full_page=True)

        result['consoleErrors'] = errors
        browser.close()

    json_path = out_dir / f'measurements-{args.label}.json'
    json_path.write_text(json.dumps(result, indent=2), encoding='utf-8')

    missing = [
        (vp, key) for vp, v in result['viewports'].items()
        for key, m in v['blocks'].items() if not m.get('found')
    ]
    print(f'captured {len(blocks)} blocks × {len(VIEWPORTS)} viewports → {json_path}')
    for vp, v in result['viewports'].items():
        if v['phpDiagnostics']:
            print(f'  ⚠ {vp}: PHP diagnostics in served HTML → {v["phpDiagnostics"]}')
    if errors:
        print(f'  ⚠ {len(errors)} console error(s): {errors[:3]}')
    if missing:
        print(f'  ⚠ {len(missing)} block/viewport pair(s) NOT FOUND — the selector '
              f'matched nothing. This is a measurement failure, not a pass:')
        for vp, d in missing[:10]:
            print(f'      {vp}: {d}')
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
