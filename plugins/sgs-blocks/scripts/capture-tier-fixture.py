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

# Which measured tier each viewport should bind, given the SGS device-tier
# standard (768/1024 — max-width:1023px is tablet, max-width:767px is mobile).
# Read from the standard, not guessed: 900 is < 1024 so it is TABLET, and 390 is
# < 768 so it is MOBILE.
VIEWPORT_TIER = {'desktop': 'desktop', 'tablet': 'tablet', 'mobile': 'mobile'}

PROBE = """(args) => {
  const { selector, prop } = args;
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
    return {
      classes: node.className,
      prop: c.getPropertyValue( prop ),
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
    ap.add_argument('--manifest', required=True)
    ap.add_argument('--label', required=True, help='before | after')
    ap.add_argument('--out', required=True, help='directory for JSON + screenshots')
    ap.add_argument('--url', default=None, help='override the manifest URL')
    args = ap.parse_args()

    manifest = json.loads(Path(args.manifest).read_text(encoding='utf-8'))
    url = args.url or manifest.get('url')
    if not url:
        sys.exit('FAIL: manifest has no `url` — publish the fixture page first '
                 '(build-tier-fixture-page.py --publish --manifest …).')

    prop_css = manifest.get('css_property') or manifest['property']
    blocks = [b for b in manifest['blocks'] if not b.get('skipped')]
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    result = {
        'label': args.label,
        'url': url,
        'property': manifest['property'],
        'css_property': prop_css,
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
                measured = page.evaluate(
                    PROBE, {'selector': b['selector'], 'prop': prop_css})
                measured['variant'] = b['variant']
                measured['block'] = b['dir']
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
