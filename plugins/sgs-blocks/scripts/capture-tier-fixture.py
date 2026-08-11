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
import re
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
    # ⛔ ADDED D573 (2026-08-11) after a REAL batch run proved kebab-casing is
    # wrong for most attributes. Each is read from the block's own render.php,
    # cited, never guessed:
    # decorative-image/render.php:~99 sets `left`/`top` from positionX/Y (%).
    'positionX': 'left',
    'positionY': 'top',
    # decorative-image/render.php:150 — `rotate(<deg>)` inside `transform`.
    # The measurable computed property is the matrix on `transform`.
    'rotation': 'transform',
    # button/render.php:610 — widthType is an ENUM selecting how width is
    # computed (full → 100%, custom → value+unit, fit → auto). What paints is
    # `width`.
    'widthType': 'width',
    # button — the icon size rides a CUSTOM PROPERTY, not a CSS property
    # (render.php prop_map: 'attr' => 'iconSize', 'css' => '--sgs-btn-icon-size').
    'iconSize': '--sgs-btn-icon-size',
    # separator/render.php prop_map: 'thickness' => 'border-bottom-width'.
    'thickness': 'border-bottom-width',
}

# Attributes that are deliberately NOT CSS-measurable. Naming them is the point:
# an unmeasurable property must be DECLARED unmeasurable, never silently read as
# an empty string and reported as evidence.
_NOT_CSS_MEASURABLE = {
    # A UNIT modifier — it changes the unit on customWidth's output, it is not a
    # property in its own right. customWidth itself IS measured (→ width).
    'customWidthUnit': 'a unit modifier for customWidth, not a property of its own',
    # product-search: a REST query limit (how many results to fetch). Genuinely
    # not a visual property — evidenced by its own render.php/edit.js, which use
    # it as a query arg, never in CSS.
    'maxResults': 'a REST query limit, not a rendered CSS value',
}


def _db_suffix_map() -> dict:
    """`property_suffixes` from sgs-framework.db — the project's CANONICAL
    attribute-suffix → CSS-property table (R-31-1: DB-first, no hardcoded
    dicts). Returns {} if the DB is unreachable, so this degrades to the
    explicit overrides rather than crashing a capture.
    """
    import os
    import re as _re
    import subprocess as _sp
    script = os.path.expanduser(
        '~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py')
    if not os.path.isfile(script):
        return {}
    try:
        out = _sp.run([sys.executable, script, 'sql',
                       'SELECT suffix, css_property FROM property_suffixes'],
                      capture_output=True, text=True, encoding='utf-8',
                      timeout=30).stdout
    except (OSError, _sp.SubprocessError):
        return {}
    rows = {}
    for line in out.splitlines():
        m = _re.match(r'\s{2}(\S+)\s+(\S.*?)\s*$', line)
        if m and m.group(1) not in ('suffix',) and not m.group(1).startswith('---'):
            if m.group(2) != 'None':
                rows[m.group(1)] = m.group(2)
    return rows


_DB_SUFFIXES: dict | None = None


def css_property_for(attr: str) -> str:
    """Map a block ATTRIBUTE name to the CSS property a browser will answer for.

    ⛔ THIS USED TO BE A BLIND camelCase→kebab-case CONVERSION, AND THAT IS
    WRONG FOR MOST ATTRIBUTES. Measured on the first real batch run (D573,
    2026-08-11): 29 of 41 properties kebab-cased to a CSS property that DOES
    NOT EXIST — `labelFontSize` → `label-font-size`, `priceFontSize` →
    `price-font-size`, `thickness` → `thickness`. `getPropertyValue()` returns
    an EMPTY STRING for an unknown property without throwing, and blank is
    indistinguishable from "this block has no value" — the exact pass-2
    blind-instrument bug, at ~70% of a pass rather than one property.

    The real mapping is DECLARED IN THE SOURCE and is derived here, in order:
      1. an explicit override above (each one cited to the render.php line it
         came from — the not-derivable cases);
      2. `property_suffixes` in sgs-framework.db, LONGEST suffix wins. This is
         the project's canonical table and the reason most of these resolve:
         `labelFontSize` ends in `FontSize` → `font-size`, which is what the
         block actually emits (onto its label element, via
         `sgs_typography_css_rule`);
      3. kebab-case, as a last resort for a genuinely plain attribute.

    ⚠ Longest-suffix wins deliberately: `labelFontSize` must match `FontSize`
    (font-size), never the shorter `Size`.
    """
    global _DB_SUFFIXES
    if attr in _CSS_PROPERTY_OVERRIDES:
        return _CSS_PROPERTY_OVERRIDES[attr]
    if _DB_SUFFIXES is None:
        _DB_SUFFIXES = _db_suffix_map()
    cap = attr[:1].upper() + attr[1:]
    best = None
    for suf, css in _DB_SUFFIXES.items():
        if cap == suf or cap.endswith(suf):
            if best is None or len(suf) > len(best[0]):
                best = (suf, css)
    if best:
        return best[1]
    out = []
    for ch in attr:
        if ch.isupper():
            out.append('-')
            out.append(ch.lower())
        else:
            out.append(ch)
    return ''.join(out)


# Every CSS property this pipeline is allowed to believe in. A property that
# resolves to something NOT in here is REFUSED rather than measured — because
# an unknown property reads back as '' and would be reported as "no value",
# which is how a whole pass can look green while measuring nothing at all.
# Custom properties (--sgs-*) are always allowed: they are real and resolvable.
_KNOWN_CSS_PROPERTIES = {
    'align-content', 'align-items', 'aspect-ratio', 'background-color',
    'border-bottom-width', 'border-color', 'border-radius', 'border-style',
    'border-width', 'bottom', 'box-shadow', 'color', 'column-gap', 'display',
    'flex-direction', 'flex-wrap', 'font-family', 'font-size', 'font-style',
    'font-weight', 'gap', 'grid-auto-flow', 'grid-auto-rows',
    'grid-template-columns', 'grid-template-rows', 'height', 'justify-content',
    'justify-items', 'left', 'letter-spacing', 'line-height', 'margin-bottom',
    'margin-left', 'margin-right', 'margin-top', 'max-height', 'max-width',
    'min-height', 'min-width', 'opacity', 'order', 'padding-bottom',
    'padding-left', 'padding-right', 'padding-top', 'position', 'right',
    'row-gap', 'text-align', 'text-decoration', 'text-transform', 'top',
    'transform', 'transition-duration', 'width', 'z-index',
}


def validate_css_property(attr: str, css: str) -> str | None:
    """None when the mapping is measurable; otherwise the reason it is not.

    This is the guard whose ABSENCE let 29 blank mappings through. It fails
    LOUDLY at capture time rather than producing empty readings that later look
    like clean evidence.
    """
    if attr in _NOT_CSS_MEASURABLE:
        return _NOT_CSS_MEASURABLE[attr]
    if css.startswith('--'):
        return None
    if css not in _KNOWN_CSS_PROPERTIES:
        return (f'`{attr}` resolved to `{css}`, which is not a CSS property this '
                'pipeline recognises. getPropertyValue() would return an empty '
                'string for it and the run would look clean while measuring '
                'nothing. Add it to _KNOWN_CSS_PROPERTIES if it is real, or to '
                '_CSS_PROPERTY_OVERRIDES / _NOT_CSS_MEASURABLE if it is not.')
    return None


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
    # ⛔ D573: these assert the REAL CSS property each attribute drives, read
    # from the block's own render.php / the property_suffixes DB — NOT a
    # kebab-cased guess. The earlier version of this block asserted only that
    # the result "looked like" a CSS property (lowercase, hyphenated), which
    # `label-font-size` satisfies perfectly while being measurable as nothing.
    # That weak assertion is exactly why 29 blank mappings reached a real run.
    batch = [
        ('minHeight', 'min-height'),
        ('maxHeight', 'max-height'),
        ('flexDirection', 'flex-direction'),
        # The whole point: a PREFIXED font-size drives real `font-size` on a
        # child element, never `<prefix>-font-size`.
        ('labelFontSize', 'font-size'),
        ('titleFontSize', 'font-size'),
        ('priceFontSize', 'font-size'),
        ('attributionFontSize', 'font-size'),
        ('nameLetterSpacing', 'letter-spacing'),
        ('nameLineHeight', 'line-height'),
        ('headlineMarginBottom', 'margin-bottom'),
        ('attributionMarginTop', 'margin-top'),
        ('splitContentOrder', 'order'),
        # From render.php prop_maps / explicit overrides, each cited above.
        ('thickness', 'border-bottom-width'),
        ('iconSize', '--sgs-btn-icon-size'),
        ('positionX', 'left'),
        ('positionY', 'top'),
        ('rotation', 'transform'),
        ('widthType', 'width'),
    ]
    for attr, expected in batch:
        got = css_property_for(attr)
        if got != expected:
            failures.append(f'  BATCH: css_property_for({attr!r}) → {got!r}, '
                            f'expected {expected!r}')

    # NEGATIVE CONTROL: the naive kebab-case result must be REJECTED by the
    # validator. Without this, a future refactor could reintroduce blind
    # kebab-casing and every assertion above would still be the only thing
    # standing between it and a silent all-blank run.
    for bogus in ('label-font-size', 'price-font-size', 'max-results'):
        if validate_css_property('someAttr', bogus) is None:
            failures.append(f'  NEGATIVE CONTROL: validate_css_property accepted '
                            f'{bogus!r}, which no browser answers for')
    if validate_css_property('fontSize', 'font-size') is not None:
        failures.append('  NEGATIVE CONTROL: validate_css_property REJECTED a real '
                        'property (font-size) — the guard is too strict')
    if validate_css_property('iconSize', '--sgs-btn-icon-size') is not None:
        failures.append('  NEGATIVE CONTROL: validate_css_property rejected a custom '
                        'property, which is real and resolvable')
    for declared in _NOT_CSS_MEASURABLE:
        if validate_css_property(declared, css_property_for(declared)) is None:
            failures.append(f'  NEGATIVE CONTROL: {declared!r} is declared '
                            'unmeasurable but the validator passed it')

    for line in failures:
        print(line)
    # Count every assertion, not just the `cases` table — a count that under-reports
    # what ran makes a growing self-test look static, and this one now covers the
    # batch mappings too. (2 explicit negative controls + the batch checks.)
    total = len(cases) + 2 + len(batch) + 3 + 2 + len(_NOT_CSS_MEASURABLE)
    print(f'self-test: {total} assertion(s), {len(failures)} failure(s)')
    return 1 if failures else 0

# Which measured tier each viewport should bind, given the SGS device-tier
# standard (768/1024 — max-width:1023px is tablet, max-width:767px is mobile).
# Read from the standard, not guessed: 900 is < 1024 so it is TABLET, and 390 is
# < 768 so it is MOBILE.
VIEWPORT_TIER = {'desktop': 'desktop', 'tablet': 'tablet', 'mobile': 'mobile'}

BLOCKS_DIR = Path(__file__).resolve().parents[3] / 'plugins' / 'sgs-blocks' / 'src' / 'blocks'

_TYPO_SUFFIXES = ('FontSize', 'FontWeight', 'FontStyle', 'LineHeight', 'LetterSpacing')


def element_hints(block_dir: str, attr: str) -> list[str]:
    """The BEM element class(es) `attr`'s CSS is actually emitted onto.

    ⛔ WHY A HINT IS NEEDED AT ALL. The probe finds a property's target by
    looking for the block's own rule that declares that CSS property — but two
    attributes on one block routinely map to the SAME property:
    `labelFontSize` and `titleFontSize` are both `font-size`. Measured on
    sgs/trust-bar, the search returned `.sgs-trust-bar__label` for BOTH, so
    `titleFontSize` was read off the label. A plausible element is not the
    right element.

    DERIVED FROM SOURCE, not from a naming convention: every per-element
    typography rule is emitted by a
    `sgs_typography_css_rule( $attributes, '<prefix>', <selector> )` call whose
    THIRD argument is the selector. `titleFontSize` -> prefix `title` -> that
    call's selector -> `.sgs-card-grid__title`. Where the selector is held in a
    variable the assignment is resolved, and a comma list returns every class
    (trust-bar's label rule covers `__label` AND `__badge-label`).

    Returns [] for a non-typography attribute or a block with no such call —
    the probe then falls back to the property search, which is unambiguous when
    only one attribute maps to that property.
    """
    prefix = next((attr[:-len(s)] for s in _TYPO_SUFFIXES
                   if attr.endswith(s) and len(attr) > len(s)), None)
    if not prefix:
        return []
    src_path = BLOCKS_DIR / block_dir / 'render.php'
    if not src_path.is_file():
        return []
    src = src_path.read_text(encoding='utf-8', errors='replace')
    call = re.search(r"sgs_typography_css_rule\(\s*\$attributes,\s*'"
                     + re.escape(prefix) + r"'\s*,\s*(.+?)\)\s*[;.]", src, re.S)
    if not call:
        return []
    expr = call.group(1)
    bare_var = re.fullmatch(r'\s*(\$[A-Za-z_][A-Za-z0-9_]*)\s*', expr)
    if bare_var:
        assign = re.search(re.escape(bare_var.group(1)) + r"\s*=\s*(.+?);", src, re.S)
        if assign:
            expr = assign.group(1)
    # Only class tokens from the QUOTED literal parts; `$uid` interpolation is
    # per-instance and already handled by the probe's own scoping.
    return re.findall(r"\.([a-z][a-z0-9-]*(?:__[a-z0-9-]+)*)", expr)


PROBE = """(args) => {
  const { selector, props, bemClass, conventionClass } = args;
  const el = document.querySelector( selector );
  if ( ! el ) {
    return { found: false, selector };
  }
  // ⛔ WHICH ELEMENT a property is read FROM is as load-bearing as which CSS
  // property it maps to. D573 fixed the NAME (`labelFontSize` -> `font-size`,
  // not `label-font-size`); this fixes the TARGET. Measured on the real page:
  // 22 of the 41 migrated properties are emitted onto a DESCENDANT of the block
  // root — `sgs_typography_css_rule( $attributes, 'label', '.{uid}
  // .sgs-trust-bar__label' )` and its siblings across trust-bar, card-grid,
  // product-card, brand-strip, counter, icon-list, nav-menu, option-picker,
  // quote, separator, whatsapp-cta. Reading the ROOT for those returns the
  // inherited base (16px/18px) — a real number, from an element the rule never
  // touches. It cannot move when the property moves, so the positive control
  // fails and the evidence is worthless either way.
  //
  // The target is DERIVED FROM THE EMITTED CSS, not from parsing render.php:
  // every SGS block scopes its per-instance <style> on a class its own root
  // carries, so a rule is "this block's" exactly when its selector mentions one
  // of the measured node's classes. That also excludes theme rules like
  // `:root :where(h2){font-size}` which declare the same property and match
  // nodes inside the block but say nothing about this attribute.
  // A class matches only at a CLASS BOUNDARY. ⚠ Plain `.includes()` is a
  // substring test, and every BEM element class starts with its block class:
  // `.sgs-button__icon svg` contains `.sgs-button`, so the icon's `width:15px`
  // was returned as the target for the button's own `customWidth`. Measured,
  // not hypothesised.
  const mentions = ( selectorText, cls ) => new RegExp(
    '\\.' + cls.replace( /[.*+?^${}()|[\\]\\\\]/g, '\\\\$&' ) + '(?![\\\\w-])'
  ).test( selectorText );

  const ownRules = ( node, instanceClasses ) => {
    const own = Array.from( node.classList );
    const out = [], generic = [];
    const walk = ( rules ) => {
      for ( const rule of Array.from( rules || [] ) ) {
        if ( rule.style && rule.selectorText ) {
          // PER-INSTANCE rules first. The scoped <style> render.php emits for
          // THIS instance is what the block attribute actually drives; the
          // block's shared style.css may declare the same property on a
          // different element entirely. Ranking by which class matched keeps
          // the attribute's own rule winning without guessing at specificity.
          if ( instanceClasses.some( ( c ) => mentions( rule.selectorText, c ) ) ) {
            out.push( rule );
          } else if ( own.some( ( c ) => mentions( rule.selectorText, c ) ) ) {
            generic.push( rule );
          }
        }
        // Recurse into @media LAST, and on `.length` — never on truthiness.
        // ⚠ Since CSS Nesting shipped, Chrome's CSSStyleRule ALSO exposes a
        // `cssRules` list; it is empty, but it is an object, so a truthiness
        // check is true for EVERY ordinary style rule. Measured: an
        // `if ( rule.cssRules ) { ...; continue; }` guard walked 64 stylesheets
        // and examined 0 rules, reporting "this block emits no rule" for all
        // 130 measurements — a total blackout that looked like a clean result.
        if ( rule.cssRules && rule.cssRules.length ) walk( rule.cssRules );
      }
    };
    for ( const sheet of Array.from( document.styleSheets ) ) {
      try { walk( sheet.cssRules ); } catch ( e ) { continue; }  // cross-origin
    }
    return out.concat( generic );
  };

  // The element THIS BLOCK styles for `cssProp`, or null when the block emits
  // no rule for it — null is reported rather than silently swapped for the
  // root, so a missing rule reads as "no target", never as a clean value.
  const targetFor = ( node, cssProp, rules, hints ) => {
    // A `hints` class comes from the attribute's OWN
    // `sgs_typography_css_rule` selector in render.php. When one exists it is
    // the ONLY acceptable target — there is deliberately no fall back to "any
    // rule declaring this property".
    //
    // ⛔ A fallback was tried and removed. `titleFontSize` is unset on the
    // default variant, so no rule is emitted for it; the fallback then handed
    // back `.sgs-trust-bar__label` — the other font-size rule on the block —
    // and the reading looked perfectly reasonable while describing the wrong
    // element. Returning null says "this block emits no rule for this
    // attribute", which is both true and useful. A plausible element is not
    // the right element.
    // With no hint the attribute belongs to the block ROOT, so the root is
    // tried before any descendant. ⚠ Without this, `minHeight` on
    // sgs/container resolved to `.sgs-container-<uid> > *` — a rule that sets
    // min-height on the container's CHILDREN — and read `0px` while the root
    // carried the value correctly. First-rule-wins is not root-wins.
    const passes = ( hints && hints.length )
      ? [ { need: hints, rootOnly: false } ]
      : [ { need: null, rootOnly: true }, { need: null, rootOnly: false } ];
    for ( const pass of passes ) {
      for ( const rule of rules ) {
        if ( rule.style.getPropertyValue( cssProp ) === '' ) continue;
        for ( const sel of rule.selectorText.split( ',' ) ) {
          const trimmed = sel.trim();
          if ( pass.need && ! pass.need.some( ( h ) => mentions( trimmed, h ) ) ) continue;
          let matches;
          try { matches = document.querySelectorAll( trimmed ); } catch ( e ) { continue; }
          for ( const m of Array.from( matches ) ) {
            if ( m === node ) return { node: m, selector: trimmed };
            if ( ! pass.rootOnly && node.contains( m ) ) {
              return { node: m, selector: trimmed };
            }
          }
        }
      }
    }
    return null;
  };

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
    // Each value is read from the element the BLOCK's own rule targets — the
    // root when the rule sits on the root, the descendant when it does not.
    // `propTargets` records which, so a report can never quietly present a
    // root reading as evidence for a descendant-scoped property.
    // The per-instance (uid) classes: everything on the root that is NOT the
    // WordPress convention class, the shared BEM root class, or one of its
    // `--modifier` forms. What remains is the uid render.php scopes this
    // instance's <style> on (`sgs-hdg-43da6855`, `sgs-tb-6`, …), derived from
    // the block name rather than pattern-guessed at a hash.
    const shared = [ conventionClass, bemClass ];
    const instanceClasses = Array.from( node.classList ).filter(
      ( c ) => shared.indexOf( c ) === -1 && c.indexOf( bemClass + '--' ) !== 0
    );
    const rules = ownRules( node, instanceClasses );
    const propValues = {};
    const propTargets = {};
    for ( const p of props ) {
      const t = targetFor( node, p.css, rules, p.hints );
      propValues[ p.attr ] = getComputedStyle( t ? t.node : node )
        .getPropertyValue( p.css );
      propTargets[ p.attr ] = t ? t.selector : null;
    }
    return {
      classes: node.className,
      prop: props.length ? c.getPropertyValue( props[ 0 ].css ) : '',
      propValues,
      propTargets,
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

    # ⛔ REFUSE before measuring anything (D573). A property that does not
    # resolve to a real CSS property reads back as '' — indistinguishable from
    # "no value set" — so a run would look clean while measuring nothing. This
    # gate exists because a real batch run proved 29 of 41 properties were in
    # exactly that state. Unmeasurable-by-design properties are DROPPED with a
    # stated reason rather than silently blanked; anything else is fatal.
    unmeasurable, fatal = {}, []
    for attr, css in sorted(css_for.items()):
        why = validate_css_property(attr, css)
        if why is None:
            if css != attr:
                print(f'  property: attr `{attr}` → CSS `{css}`')
            continue
        if attr in _NOT_CSS_MEASURABLE:
            unmeasurable[attr] = why
        else:
            fatal.append(why)
    if fatal:
        print('\nFAIL: unmeasurable property mapping(s) — refusing to capture:')
        for f in fatal:
            print(f'  - {f}')
        return 1
    for attr, why in unmeasurable.items():
        print(f'  ⚠ SKIPPED `{attr}` — {why} (declared unmeasurable, not blanked)')
        css_for.pop(attr, None)
    all_props = [p for p in all_props if p in css_for]
    if not all_props:
        sys.exit('FAIL: every requested property is unmeasurable — nothing to capture.')
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
                probe_props = [{'attr': p, 'css': css_for.get(p, css_property_for(p)),
                                'hints': element_hints(b['dir'], p)}
                               for p in b_props]
                # `sgs/trust-bar` -> shared classes `sgs-trust-bar` (BEM root)
                # and `wp-block-sgs-trust-bar` (the WP convention). Anything
                # else on the root is this instance's own uid class, which is
                # what its scoped <style> keys on.
                bem = b['name'].replace('/', '-')
                measured = page.evaluate(
                    PROBE, {'selector': b['selector'], 'props': probe_props,
                            'bemClass': bem, 'conventionClass': 'wp-block-' + bem})
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
