#!/usr/bin/env python
"""Build (and publish) ONE canary page carrying every block that has migrated
ONE OR MORE responsive properties to the tier-object shape.

WHY THIS EXISTS
---------------
The pre-commit visual-diff gate wants one before/after report per block, each
citing a measurement OF THAT BLOCK. A migration pass touches ~20 blocks at once,
and most of the pages that carried them get binned by ruling B. Hand-building 20
probe pages per pass is the step that does not happen — and the recorded failure
mode is then writing N reports from ONE block's capture, which is fabricated
evidence, not weak evidence.

So: one page, every migrated block on it, captured once. This script builds that
page. `capture-tier-fixture.py` measures it; `make-visual-diff-reports.py` turns
the measurements into per-block reports.

MULTI-PROPERTY BATCH MODE (D572, 2026-08-11) — `--property` now accepts a
comma-separated list (e.g. `--property fontSize,letterSpacing,lineHeight`). A
block carrying SEVERAL of the listed properties (e.g. sgs/button, which has 6)
still gets exactly ONE default instance and ONE probe instance — not one pair
per property — with every applicable property set together in the probe
variant. This is what makes batching actually cut cost: a 41-property pass
against ~35 blocks is ONE deploy + ONE capture cycle, not 41. Bean's framing
that motivated this: "is there really a difference between 30 one-offs and one
property across 30 blocks with our setup?" — no, not once verification is
batched too; this is the batching. The manifest's per-block entries now carry
a `properties` LIST, not a single `property` string — `capture-tier-fixture.py`
and `make-visual-diff-reports.py` were extended alongside this to measure and
report on that whole list per block, in the SAME commit (D571's own rule: keep
the classifier/fixer/report generator in lockstep or they drift apart).

⛔ post_content is written via REST with an application password — the sanctioned
path. Never via WP-CLI/PHP.

DERIVED, NOT HARDCODED
----------------------
The block list, each block's tier-object default, its `layout` enum and its
parent/ancestor constraints are all read from the block.json files at run time.
A hardcoded roster would rot at the next pass; this one cannot (R-31-1 in
spirit — behaviour comes from the schema, not from a dict in this file).

Usage:
    python build-tier-fixture-page.py --property gap --dry-run
    python build-tier-fixture-page.py --property gap --publish
    python build-tier-fixture-page.py --property gap --delete <page-id>
    python build-tier-fixture-page.py --property fontSize,letterSpacing,lineHeight --publish
"""

from __future__ import annotations

import argparse
import base64
import json
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

# Windows consoles default to cp1252, which raises UnicodeEncodeError on the
# em-dashes and arrows in this script's output. Force UTF-8 so a cosmetic
# encoding fault can never masquerade as a failed measurement run.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding='utf-8')
    except (AttributeError, ValueError):
        pass

REPO = Path(__file__).resolve().parents[3]
BLOCKS_DIR = REPO / 'plugins' / 'sgs-blocks' / 'src' / 'blocks'
SECRETS = REPO / '.claude' / 'secrets' / 'sandybrown.env'

# Distinct per-tier probe values. They must differ from each other AND from any
# block default, so a measurement can prove WHICH tier bound rather than merely
# that "a" value is present. Explicit units throughout: a bare number now means
# px (Bean-ruled 2026-08-10) and relying on that here would test the unit rule
# rather than the tier rule.
#
# ⚠ This is the LENGTH-shaped probe only (D577, 2026-08-11). It is correct for
# any property whose value IS a CSS length string ('64px') — the majority of
# migrated properties (fontSize, gap, minHeight...). It is MEANINGLESS for a
# keyword (alignItems: 'center'), an integer with no unit (order, splitContentOrder
# is actually a keyword — see below), or a transform (rotation, in degrees):
# writing '64px' into any of those either gets silently coerced away or compared
# against a value of the wrong shape, so the positive control can never pass no
# matter how correct the code under test is. `derive_probe_tiers()` below picks
# the RIGHT shape per property, derived from the block's own declared default +
# its edit.js control wiring — never a hand-written per-block/per-property
# table (R-31-1). This constant is kept as the LENGTH case's actual value (used
# by `_length_string_probe()`) and as the top-level manifest field for backward
# compatibility with the frozen consumers — see `derive_probe_tiers()`'s
# docstring for the compatibility limitation this leaves open.
PROBE_TIERS = {'desktop': '64px', 'tablet': '32px', 'mobile': '8px'}

# A CSS length VALUE as a string: a number followed by a recognised unit, e.g.
# '64px', '1.5rem', '100%'. Distinguishes a genuine length default ('360px')
# from a keyword default ('media-first') and from a legacy-shape length that
# only LOOKS numeric ('64').
_CSS_LENGTH_RE = re.compile(r'^-?\d+(?:\.\d+)?(px|em|rem|%|vh|vw|vmin|vmax)$')

# CSS properties that are numbers with NO unit at all, ever — a small, fixed
# CSS-spec fact (not a per-block roster: it is keyed on the CSS PROPERTY name,
# and holds for any block that ever declares one of these). Used only as a
# last-resort classifier when a block's OWN default is entirely empty and no
# sibling `{prop}Unit` attribute exists to say otherwise (see
# `derive_probe_tiers()` case 2b).
_UNITLESS_CSS_PROP_NAMES = {'order', 'zindex', 'opacity', 'flexgrow', 'flexshrink'}

# Property-NAME fragments that read as a CSS length even with no declared
# default value to inspect (e.g. `sgs/container`'s `minHeight`, whose control
# lives in the SHARED `LayoutPanel` component, not this block's own edit.js —
# so the edit.js scan below finds nothing to derive from). This is the
# ORIGINAL, already-proven-working PROBE_TIERS behaviour, kept as the last
# fallback rather than refusing a property that almost certainly is a length.
_LENGTH_NAME_HINTS = ('height', 'width', 'size', 'spacing', 'top', 'bottom',
                      'left', 'right', 'gap', 'radius', 'margin', 'padding')

# Extracts every `value: 'x'` (or `"x"`) literal out of a JS array-of-options
# body, e.g. `{ label: __('Row'), value: 'row' }` → 'row'. The '' inherit
# sentinel used throughout this codebase's `…_WITH_INHERIT`/`…_TIER` variants
# is filtered by the caller, never treated as a legal probe value.
_VALUE_LIT_RE = re.compile(r"""value:\s*['"]([^'"]*)['"]""")

# Per-block edit.js source, cached — many properties on the SAME block are
# classified in one run (batch mode), and re-reading the file per property
# would be wasted IO for no benefit (the file does not change mid-run).
_EDIT_JS_CACHE: dict[str, str | None] = {}

# Memoises `derive_probe_tiers()` by (block dir, property) so `block_markup()`
# (which WRITES the probe payload) and `build_content()` (which later reports
# what got refused, for the manifest and the console) see the IDENTICAL
# decision — computed once, read twice, never re-derived and risking drift.
_PROBE_CACHE: dict[tuple[str, str], tuple[dict | None, str]] = {}

# The ONLY structural knowledge in this file, and it is a WordPress fact rather
# than a per-block behaviour: a block declaring `parent` cannot sit at top level,
# so it is emitted inside that parent. Read from block.json, not assumed.
FALLBACK_INNER_TEXT = 'Tier fixture probe.'


def _read_edit_js(blk: dict) -> str | None:
    """This block's own edit.js source, or None if it has none (a render-only
    composite, or a block whose only controls live in a shared component)."""
    dir_name = blk['dir']
    if dir_name not in _EDIT_JS_CACHE:
        path = BLOCKS_DIR / dir_name / 'edit.js'
        _EDIT_JS_CACHE[dir_name] = path.read_text(encoding='utf-8') if path.is_file() else None
    return _EDIT_JS_CACHE[dir_name]


def _is_number(v) -> bool:
    return isinstance(v, (int, float)) and not isinstance(v, bool)


def _resolve_options_array(edit_js: str, const_name: str) -> list[str]:
    """The literal `value:` strings inside `const NAME = [ ... ];` in this
    block's edit.js, in declaration order, with the '' inherit sentinel
    dropped. Empty list if the constant cannot be found or holds no values —
    the caller treats that as "nothing derivable", never as a green light to
    guess.
    """
    m = re.search(r'const\s+' + re.escape(const_name) + r'\s*=\s*\[(.*?)\];',
                 edit_js, re.DOTALL)
    if not m:
        return []
    return [v for v in _VALUE_LIT_RE.findall(m.group(1)) if v]


def _keyword_pool_per_tier(edit_js: str, prop: str) -> dict[str, list[str]] | None:
    """The legal keyword values THIS block's own edit.js wires up to `prop`,
    per tier — derived from the actual JSX control binding, never a hand-listed
    per-block table (R-31-1).

    Every tier-object keyword control in this codebase follows one of three
    shapes (all seen live, none invented):
      1. ONE shared options list for every tier:
             options={ SOME_OPTIONS }
      2. a desktop-vs-rest ternary (adds a "— Same as desktop —" '' sentinel
         to every tier but desktop):
             options={ tier === 'desktop' ? DESKTOP_OPTIONS : REST_OPTIONS }
      3. a genuinely PER-TIER lookup object (desktop/tablet/mobile each show
         different choices, e.g. hero's column-order control):
             const xMap = { desktop: A, tablet: B, mobile: C };
             …
             options={ xMap[ tier ] }

    Returns None when none of the three shapes can be found — the caller
    refuses to probe that property on that block rather than emit a keyword
    of unknown legality (D573 doctrine).
    """
    m = re.search(r'value=\{\s*' + re.escape(prop) + r'\s*\}', edit_js)
    if not m:
        return None
    # Window forward to this control's own closing tag, so a LATER unrelated
    # control's `options=` can never leak into this property's pool. Falls
    # back to a fixed span when no closing tag is found in range (a render-prop
    # body can run long, e.g. hero's column-order control below).
    end = edit_js.find('</ResponsiveOverride>', m.end())
    window = edit_js[m.end(): end if end != -1 else m.end() + 4000]

    # Shape 3 — per-tier lookup object.
    mm = re.search(
        r'const\s+(\w+)\s*=\s*\{\s*desktop:\s*([A-Z][A-Z0-9_]*)\s*,'
        r'\s*tablet:\s*([A-Z][A-Z0-9_]*)\s*,\s*mobile:\s*([A-Z][A-Z0-9_]*)\s*,?\s*\}',
        window)
    if mm:
        pools = {tier: _resolve_options_array(edit_js, const)
                for tier, const in zip(('desktop', 'tablet', 'mobile'), mm.groups()[1:])}
        if any(pools.values()):
            return pools

    # Shape 2 — desktop-vs-rest ternary, either operand order. Matched
    # WHEREVER the ternary text appears in the window, not only inline inside
    # `options={}` — button's widthType control assigns the SAME ternary to a
    # local `const options = …` first and references that variable in the
    # JSX (`options={ options }`), so anchoring on the JSX attribute itself
    # missed it; multi-button's inline form still matches this looser anchor
    # identically (same core `'desktop' === tier ? A : B` text either way).
    tm = re.search(
        r"(?:tier\s*===\s*'desktop'|'desktop'\s*===\s*tier)"
        r"\s*\?\s*([A-Z][A-Z0-9_]*)\s*:\s*([A-Z][A-Z0-9_]*)", window)
    if tm:
        desktop_pool = _resolve_options_array(edit_js, tm.group(1))
        rest_pool = _resolve_options_array(edit_js, tm.group(2))
        if desktop_pool or rest_pool:
            return {'desktop': desktop_pool or rest_pool,
                    'tablet': rest_pool or desktop_pool,
                    'mobile': rest_pool or desktop_pool}

    # Shape 1 — one shared constant referenced directly.
    om = re.search(r'options=\{\s*([A-Z][A-Z0-9_]*)\s*\}', window)
    if om:
        pool = _resolve_options_array(edit_js, om.group(1))
        if pool:
            return {'desktop': pool, 'tablet': pool, 'mobile': pool}

    return None


def _unit_pool(edit_js: str, base_prop: str) -> list[str] | None:
    """Legal unit keywords for a `{base_prop}Unit` sibling, derived from the
    `units={ SOME_UNITS }` prop of the `<UnitControl>` this block wires to
    `base_prop` — the standard WP UnitControl contract (`units` is an array of
    `{value,label,default}` entries, e.g. `[{value:'px',...},{value:'%',...}]`).

    `base_prop` is not always independently `value={}`-bound (e.g. button's
    `customWidth` is written ALONGSIDE `widthType` inside widthType's own
    control, not via its own `<ResponsiveOverride>`), so this scans every
    `units={}` occurrence in the file and keeps the one whose PRECEDING text
    mentions `base_prop` — i.e. the UnitControl actually wired to it, wherever
    in the file that control lives.
    """
    for um in re.finditer(r'units=\{\s*([A-Z][A-Z0-9_]*)\s*\}', edit_js):
        window = edit_js[max(0, um.start() - 1500):um.start()]
        if base_prop in window:
            pool = _resolve_options_array(edit_js, um.group(1))
            if pool:
                return pool
    return None


def _pick_from_pool(pool: dict[str, list[str]], default: dict) -> dict | None:
    """One value per tier: excluded from THAT TIER'S OWN declared default
    (the hard requirement — see module docstring), and best-effort distinct
    from the tier immediately above.

    The "distinct from the tier above" part is not cosmetic: `sgs_emit_
    responsive_css` (helpers-responsive.php) suppresses a tier's CSS
    declaration ENTIRELY when it equals the effective value cascading down
    from the tier above it — mobile is compared to tablet's effective value,
    tablet to desktop's. Two adjacent tiers sharing one probe value would
    silently drop the lower tier's own rule; the computed style would still
    read correctly (it cascades from the tier above), but no dedicated rule
    would exist for that tier, so a capture could not tell "genuinely bound"
    from "inherited and never tested". Where a property's pool is too small
    to keep all three mutually distinct (e.g. a 2-value enum), this falls
    back to reuse — the own-tier-default exclusion is the one hard promise
    this file makes; full mutual distinctness is best-effort on top.
    """
    order = ('desktop', 'tablet', 'mobile')
    chosen: dict[str, str] = {}
    prev = None
    for tier in order:
        candidates = [v for v in pool.get(tier, []) if v != default.get(tier)]
        if not candidates:
            return None
        pick = next((c for c in candidates if c != prev), candidates[0])
        chosen[tier] = pick
        prev = pick
    return chosen


def _numeric_probe(existing: dict) -> dict:
    """Three distinct raw numbers (no unit — the unit, where one applies,
    comes from a separate `{prop}Unit` attribute this file leaves untouched),
    none equal to any value already present in the block's own declared
    default at any tier. A small fixed candidate pool keeps the numbers
    predictable and always inside any plausible RangeControl bound (angles,
    counts, pixel dimensions) without needing to parse each control's own
    min/max out of edit.js.
    """
    used = {v for v in existing.values() if _is_number(v)}
    pool = (64, 32, 8, 96, 48, 16, 128, 40, 4, 256, 200, 100)
    picked = [c for c in pool if c not in used][:3]
    while len(picked) < 3:
        picked.append((max(used) if used else 0) + 1000 + len(picked))
    return {'desktop': picked[0], 'tablet': picked[1], 'mobile': picked[2]}


def _length_string_probe(existing: dict) -> dict:
    """The historic PROBE_TIERS px-string values — correct as-is for a
    property whose OWN declared shape already IS a CSS length string. Bumped
    only in the (unmeasured-in-practice) case where a declared default
    happens to collide with one of the standard values exactly, so a probe
    value can never be silently indistinguishable from the default itself.
    """
    base = dict(PROBE_TIERS)
    existing_strs = {v for v in existing.values() if isinstance(v, str)}
    if any(base[t] in existing_strs for t in base):
        base = {'desktop': '640px', 'tablet': '480px', 'mobile': '240px'}
    return base


def _keyword_probe(blk: dict, prop: str, default: dict) -> tuple[dict | None, str]:
    """Shared keyword-derivation path for BOTH callers below: a property whose
    declared default already contains a keyword string, and a property whose
    default is empty but everything else has been ruled out. Tries the direct
    control-binding scan first, then — for a `{base}Unit` sibling specifically
    — the UnitControl `units=` scan, since a Unit sibling is never bound via
    its own `value={}` (see `_unit_pool()`'s docstring).
    """
    edit_js = _read_edit_js(blk)
    if not edit_js:
        return None, (f'{blk["dir"]} has no edit.js to derive an options pool from '
                      f'(a render-only composite, or controls live in a shared component)')
    pool = _keyword_pool_per_tier(edit_js, prop)
    if not pool and prop.endswith('Unit'):
        base = prop[:-len('Unit')]
        if base in blk['attrs']:
            u = _unit_pool(edit_js, base)
            if u:
                pool = {'desktop': u, 'tablet': u, 'mobile': u}
    if not pool:
        return None, (f'no options pool could be derived from {blk["dir"]}/edit.js for '
                      f'`{prop}` (no `value={{ {prop} }}` control binding and, for a Unit '
                      f'sibling, no matching `units={{}}` prop found)')
    tiers = _pick_from_pool(pool, default)
    if tiers is None:
        return None, (f'{blk["dir"]}/edit.js declares an options pool for `{prop}` but every '
                      f'legal value at some tier equals that tier\'s own default — no distinct '
                      f'probe value exists to prove binding')
    return tiers, 'keyword (options pool derived from edit.js control wiring)'


def _derive_probe_tiers_uncached(blk: dict, prop: str) -> tuple[dict | None, str]:
    """The per-tier probe VALUE for one (block, property) pair — TYPE-CORRECT
    for what that property actually holds, derived from the block's own
    declared shape (block.json default + edit.js control wiring), never a
    hand-written per-block table (R-31-1 in spirit).

    `PROBE_TIERS` alone (a CSS length string at every tier) is correct for a
    length property but silently wrong for anything else: a keyword compared
    against '64px' can never match; an integer-with-no-unit CSS property
    (`order`) or a plain number (`rotation`, in degrees) gets a value of the
    wrong JS type where the framework's own convention (TypographyControls,
    plugins/sgs-blocks/CLAUDE.md) is a bare NUMBER paired with a separate
    `{prop}Unit` attribute. This function classifies each property from what
    the block itself declares, in priority order:

      1. Default has a value → the value's OWN shape decides:
         (a) a JSON number at every declared tier         → NUMERIC, bare
         (b) a CSS-length STRING at every declared tier    → LENGTH, px-string
         (c) anything else (a keyword like 'row'/'media-first'/'fit')
                                                            → KEYWORD, derived
                                                              pool from edit.js
      2. Default is entirely empty ({}) — classify from other signals:
         (a) a sibling `{prop}Unit` attribute exists        → NUMERIC, bare
             (the unit comes from that separate, untouched attribute)
         (b) the property name is a known unitless CSS property (`order`,
             `zIndex`, `opacity`, `flexGrow`, `flexShrink`)  → NUMERIC, bare
         (c) an options pool is derivable from edit.js       → KEYWORD
         (d) the property name reads as a CSS length (`…Height`, `…Width`,
             `…Size`, `…Spacing`, `…Gap`, `…Margin*`, `…Padding*`, `…Radius`,
             `…Top`/`…Bottom`/`…Left`/`…Right`)             → LENGTH (the
             original, already-proven PROBE_TIERS behaviour — covers
             `sgs/container`'s `minHeight`, whose control lives in the SHARED
             `LayoutPanel` component rather than this block's own edit.js)
      3. Nothing above matched                              → REFUSE

    Returns `(tiers, reason)`. `tiers` is None when refused — the caller must
    leave that property UNSET in the probe variant rather than emit a value of
    unknown/wrong shape (D573: an invalid probe looks like evidence and proves
    nothing). `reason` is always a human sentence, used for both the console
    output and the manifest, per rule 4 (no skipping without a stated reason).

    ⚠ MANIFEST/CONSUMER LIMITATION (D577, flagged not silently absorbed): the
    manifest's top-level `probe_tiers` field and `make-visual-diff-reports.py`'s
    `tier_binds()` both assume ONE flat {desktop,tablet,mobile} value set
    applies to EVERY property in a batch — `tier_binds()` never indexes by
    property name, only by viewport. That assumption held while every probed
    property used the same LENGTH-shaped PROBE_TIERS; it does not hold once
    properties get type-correct DIFFERENT values. This file cannot fix that
    without editing `make-visual-diff-reports.py` (out of scope — see the
    build's own CLAUDE.md instructions), so `main()` keeps the top-level
    `probe_tiers` field as the literal PROBE_TIERS constant (unchanged, still
    correct for LENGTH-classified properties) and additionally records the
    REAL per-property value written, per block, under the additive
    `probe_values`/`probe_refused` manifest keys the current consumers simply
    ignore. `tier_binds()` will therefore under-report ("does NOT bind") for
    every non-LENGTH property until it is updated to read `probe_values` per
    property — reported here, not fixed here, per the scope boundary.
    """
    decl = blk['attrs'].get(prop)
    default = decl.get('default') if isinstance(decl, dict) else None
    default = default if isinstance(default, dict) else {}
    non_empty = {k: v for k, v in default.items() if v not in (None, '')}

    if non_empty:
        if all(_is_number(v) for v in non_empty.values()):
            return _numeric_probe(non_empty), 'numeric (block.json default is a bare number)'
        if all(isinstance(v, str) and _CSS_LENGTH_RE.match(v) for v in non_empty.values()):
            return (_length_string_probe(non_empty),
                    'length (block.json default is a CSS length string)')
        return _keyword_probe(blk, prop, default)

    if f'{prop}Unit' in blk['attrs']:
        return _numeric_probe({}), f'numeric (sibling {prop}Unit attr supplies the CSS unit)'
    if prop.lower() in _UNITLESS_CSS_PROP_NAMES:
        return _numeric_probe({}), f'numeric ({prop} is a unitless CSS property)'

    edit_js = _read_edit_js(blk)
    if edit_js:
        pool = _keyword_pool_per_tier(edit_js, prop)
        if pool:
            tiers = _pick_from_pool(pool, {})
            if tiers:
                return tiers, 'keyword (options pool derived from edit.js control wiring)'

    if any(hint in prop.lower() for hint in _LENGTH_NAME_HINTS):
        return (_length_string_probe({}),
                'length (no declared value; property name reads as a CSS length)')

    return None, ('no default value, no sibling Unit attr, not a known unitless CSS '
                  'property, and no options pool derivable from edit.js — refusing '
                  'rather than emit a value of unknown shape')


def derive_probe_tiers(blk: dict, prop: str) -> tuple[dict | None, str]:
    """Memoised wrapper — see `_derive_probe_tiers_uncached()` for the actual
    derivation. Memoised so `block_markup()` (which writes the payload) and
    `build_content()` (which later reports what got refused) read the exact
    same decision rather than risking two independently-computed answers."""
    key = (blk['dir'], prop)
    if key not in _PROBE_CACHE:
        _PROBE_CACHE[key] = _derive_probe_tiers_uncached(blk, prop)
    return _PROBE_CACHE[key]


def load_env() -> dict:
    if not SECRETS.exists():
        sys.exit(f'FAIL: credentials not found at {SECRETS}')
    env = {}
    for line in SECRETS.read_text(encoding='utf-8').splitlines():
        if line.startswith('#') or '=' not in line:
            continue
        k, v = line.split('=', 1)
        # Strip surrounding quotes — the env file quotes its values, and an
        # unstripped quote produced `unknown url type: 'https`, which reads like
        # a network fault rather than a parsing one.
        env[k.strip()] = v.strip().strip('\'"')
    missing = [k for k in ('WP_USER_SANDYBROWN', 'WP_APP_PWD_SANDYBROWN', 'WP_URL_SANDYBROWN')
               if not env.get(k)]
    if missing:
        sys.exit(f'FAIL: {SECRETS} is missing {missing}')
    return env


def supports_anchor(meta: dict) -> bool:
    """Does this block DECLARE `supports.anchor`?

    ⚠ Retained for the manifest's record, but NO LONGER used to build selectors,
    and the reason is worth keeping: declaring `supports.anchor` is not the same
    as HONOURING it. WordPress applies the anchor automatically only when the
    block renders through `get_block_wrapper_attributes()`. Blocks that
    hand-build their wrapper markup — measured: site-header, site-footer, their
    rows, multi-button and feature-grid — silently drop it. No error, no
    warning: the id simply never appears, the probe finds nothing, and the run
    reports a missing measurement that looks exactly like a regression.

    So every fixture instance is now wrapped in an anchored `sgs/container` and
    selected as its child. That depends on nothing the measured block does.
    """
    sup = meta.get('supports') or {}
    return bool(sup.get('anchor')) or 'anchor' in (meta.get('attributes') or {})


# ---------------------------------------------------------------------------
# RENDER MINIMUMS — what makes a block paint at all
# ---------------------------------------------------------------------------
# Many blocks render NOTHING when their content attribute is empty, by design:
# a media block with no picture, a text block with no words, a WhatsApp button
# with no number. Placed on the fixture page bare, they emit no element, the
# probe's `querySelector` matches nothing, and the capture reports NOT-FOUND
# and refuses to score them. That refusal is the instrument working — but it
# leaves the block unmeasured, and the pre-commit gate then has no evidence for
# a property that really did migrate.
#
# Measured on the 41-property batch page, SEVEN blocks did exactly this:
# before-after, collapsible-text, decorative-image, media, option-picker, text,
# whatsapp-cta — 42 NOT-FOUND readings (7 blocks x 3 viewports x 2 variants).
#
# ⛔ The minimum is NOT invented here. Every block already declares it, in its
# own block.json, as `example.attributes` — the author's canonical "this is what
# this block looks like" set, the one WordPress renders in the inserter preview.
# It is read from there (D573's rule, Bean's correction: the mapping is in the
# source files; do not design a scheme around what the code already declares).
# A hand-written roster in this file would rot at the next block change; this
# cannot.
#
# Three filters decide what is safe to write. Each exists because of a recorded
# silent-failure mode, not for tidiness — see `render_minimums()`.

# Where a block's own `example` is not enough. Each entry cites the line it
# answers, and adds ONLY what that line reads.
EXTRA_MINIMUMS = {
    'sgs/whatsapp-cta': {
        # whatsapp-cta/render.php:49 — `if ( ! $phone_number ) { return; }`.
        # The example sets variant/label/message but no number, so the block
        # renders nothing at all. Ofcom's reserved drama range, which can never
        # reach a real subscriber.
        'phoneNumber': '+447700900000',
        # Overrides the example's own `floating`, for a MEASUREMENT reason
        # rather than a rendering one. render.php:338 emits the
        # `.sgs-whatsapp-cta__label` span ONLY when the variant is not
        # floating, and `labelFontSize` — the migrated property under test on
        # this block — is scoped to exactly that span (render.php:248). Left
        # floating, the block WOULD render and the selector WOULD match, and
        # the reading would be taken off an element the property does not
        # style: clean-looking evidence that measures nothing, which is the
        # precise failure D573 exists to stop. `floating` is also
        # `position:fixed` (style.css:93-94), so it leaves the anchored
        # container's layout box and both variants stack on screen. `inline`
        # is one of the block's own three options (edit.js:22-26).
        'variant': 'inline',
    },
    # D577 (Task 2) — each entry below cites the render.php line(s) its
    # supplement satisfies, per the file's own rule (line 151-152 above).
    # None of these attributes is under test by any current migration
    # property, so filter (b) never touches them.
    'sgs/trust-bar': {
        # trust-bar/render.php:258-260 — `$title_html` is built ONLY when
        # `trim(wp_strip_all_tags($block_title))` is non-empty; the block's
        # own example never sets `title` at all, so `.sgs-trust-bar__title`
        # (titleFontSize's target, render.php:475) never renders.
        'title': 'Why choose us',
    },
    'sgs/icon-list': {
        # icon-list/render.php:147 — `$heading_text = trim($attributes['heading'] ?? '')`;
        # a blank heading means NO heading element at all (render.php:143 comment
        # "heading blank = no heading element"), so `.sgs-icon-list__heading`
        # (headingFontSize's target, render.php:336) never renders. The example
        # sets `items` only, never `heading`.
        'heading': 'Why choose us',
    },
    'sgs/separator': {
        # separator/render.php:90 — `$content_mode_raw = $attributes['contentMode']
        # ?? 'none'`; the content slot (render.php:310 onward) is built ONLY when
        # contentMode !== 'none'. The example sets width/thickness/lineStyle/
        # alignment but never contentMode, so `.sgs-separator__content`
        # (contentFontSize's target, render.php:349) never renders.
        'contentMode': 'text',
        'contentText': 'OR',
    },
    'sgs/product-card': {
        # product-card/render.php:503-506 — `$sgs_resolved_badge` reads
        # `trialTag` ONLY when `variantStyle === 'trial'` (or `featuredTag` when
        # 'featured'); the example sets `variantStyle: 'standard'`, so the badge
        # is ALWAYS empty and `.sgs-product-card__tag` (tagFontSize's target,
        # render.php:546/988/1394) never renders regardless of any tag text.
        'variantStyle': 'trial',
        'trialTag': 'Trial offer',
    },
    'sgs/brand-strip': {
        # brand-strip/render.php:71 — `$show_names = !empty($attributes['showNames'])`;
        # block.json declares `showNames` default FALSE, so the caption never
        # renders even with a named logo, unless explicitly turned on.
        'showNames': True,
        # A single stub logo carrying `name` (render.php:469-470 needs it
        # non-empty) — the placeholder `media.url` here is REPLACED by
        # `apply_image()` via REPEATER_IMAGE_SLOTS below, following this
        # file's own no-dead-placeholder rule; it exists only so the key is
        # present for that overwrite to target.
        'logos': [{'name': 'Acme Ltd', 'media': {'url': '', 'type': 'image'}}],
    },
}

# Blocks whose minimum content is a REPEATER item needing a real image inside
# one of its array entries (a materially different shape from the flat id/url
# pairs `IMAGE_SLOTS` below covers, so it cannot reuse that map directly).
# `(attr, index, media_key)` — `attrs[attr][index][media_key]` is overwritten
# with `{url, id, type:'image'}` from the SAME resolved canary image
# `apply_image()` already uses, extending that existing mechanism rather than
# inventing a parallel one.
#   brand-strip/render.php:465 — `if (null === $media || empty($media['url']))
#   continue;` skips a logo entry with no media at all; render.php:470
#   `$has_caption = $show_names && '' !== $logo_name` additionally needs
#   `showNames` true (block.json default false) AND a non-empty `name` — both
#   supplied via EXTRA_MINIMUMS above, the media URL supplied here.
REPEATER_IMAGE_SLOTS = {
    'sgs/brand-strip': [('logos', 0, 'media')],
}

# Blocks that paint only once a picture resolves, and the exact attribute pair
# each one reads. In all three the ID wins and the URL falls back, so both are
# written:
#   media/render.php:538-563            imageId -> wp_get_attachment_image_src(),
#                                       else imageUrl, else `return`
#   decorative-image/render.php:54-70   decorMedia synthesised from
#                                       imageUrl/imageId; :123 bails without it
#   before-after/media-render.php:66-77 per slot — and render.php:50 requires
#                                       BOTH slots, or the whole block emits
#                                       nothing at all, with no HTML comment
IMAGE_SLOTS = {
    'sgs/media': [('imageId', 'imageUrl')],
    'sgs/decorative-image': [('imageId', 'imageUrl')],
    'sgs/before-after': [('beforeImageId', 'beforeImageUrl'),
                         ('afterImageId', 'afterImageUrl')],
}


def render_minimums(blk: dict, props: list[str]) -> dict:
    """The block's own `example.attributes`, filtered to what is safe to write.

    Each filter is a recorded silent-failure mode:

    (a) NOT DECLARED — WordPress drops an undeclared attribute from the EDITOR
        schema (uneditable, invisible in the inspector), but PHP does NOT drop
        it before render.php runs — no error, no warning, no failing build
        (D338, which found 45 live in shipped patterns; several were still
        painting the frontend, so "not declared" is NOT proof of "dead at
        render"). Excluded from this fixture regardless, because it also
        trips the deploy's stored-content audit — the exclusion is about
        keeping this generator's own output clean, not a claim the value
        can never render.

    (b) UNDER TEST — the `default` variant exists to measure what the block does
        with the property UNSET; that is the regression surface the gate is
        about. sgs/text's example sets `fontSize`, which IS one of the migrated
        properties — writing it would quietly turn the regression surface into a
        second probe and mask exactly the change being looked for. So a property
        under test is never set from an example, in either variant.

    (c) WRONG SHAPE — a flat value on an object-typed attribute is coerced to
        that attribute's default by WordPress, silently. sgs/text's example
        `fontSize: 16` is a bare number against a now-object attr; writing it
        achieves nothing while reading like an intent that landed.
    """
    example = (blk.get('example') or {}).get('attributes') or {}
    merged = {**example, **EXTRA_MINIMUMS.get(blk['name'], {})}
    out = {}
    for key, val in merged.items():
        decl = blk['attrs'].get(key)
        if not isinstance(decl, dict):
            continue                                             # (a)
        if key in props:
            continue                                             # (b)
        if decl.get('type') == 'object' and not isinstance(val, dict):
            continue                                             # (c)
        out[key] = val
    return out


def apply_image(blk: dict, attrs: dict, props: list[str], image: dict | None) -> None:
    """Point every image slot this block declares at ONE real canary image.

    Overwrites whatever the example supplied, because two of the three examples
    point at `via.placeholder.com` — a service that no longer exists. Such a
    block still EMITS (so the selector matches and the measurement is taken),
    but every screenshot shows a broken image and the box collapses to nothing.
    """
    if not image:
        return
    for id_attr, url_attr in IMAGE_SLOTS.get(blk['name'], []):
        for key, val in ((id_attr, image['id']), (url_attr, image['url'])):
            if key in blk['attrs'] and key not in props:
                attrs[key] = val
    # Intrinsic dimensions, only where the block declares them — otherwise the
    # example's stale 800x600 would describe an image that is not this one.
    for key, val in (('imageWidth', image.get('width')),
                     ('imageHeight', image.get('height'))):
        if val and key in blk['attrs'] and key not in props:
            attrs[key] = val
    # Repeater-shaped image slots (D577 Task 2) — same "point at ONE real
    # canary image" contract as the flat IMAGE_SLOTS above, applied INSIDE an
    # array attribute's own entry rather than at the top level.
    for attr_name, idx, media_key in REPEATER_IMAGE_SLOTS.get(blk['name'], []):
        if attr_name not in blk['attrs'] or attr_name in props:
            continue
        items = attrs.get(attr_name)
        if isinstance(items, list) and len(items) > idx and isinstance(items[idx], dict):
            items[idx][media_key] = {'url': image['url'], 'id': image['id'], 'type': 'image'}


def css_class(block_name: str) -> str:
    """`sgs/card-grid` → `.wp-block-sgs-card-grid` (WordPress's own convention)."""
    return '.wp-block-' + block_name.replace('/', '-')


def bem_class(block_name: str) -> str:
    """`sgs/card-grid` → `.sgs-card-grid` (the block's own BEM root class)."""
    return '.' + block_name.replace('/', '-')


def root_classes(block_name: str, scope: str, combinator: str) -> str:
    """BOTH classes a block's root element might carry, as one selector list.

    ⚠ WordPress only adds `wp-block-<ns>-<name>` when the block renders through
    `get_block_wrapper_attributes()`. A block that hand-builds its own root
    markup never gets it — measured on the live page: `sgs/decorative-image`
    renders in "naked mode", emitting the `<img>` ITSELF as the block root with
    `class="sgs-decorative-image sgs-di-<uid>"` and no `wp-block-` class at all.
    Selecting on the convention alone found nothing and reported NOT-FOUND at
    all three viewports — a measurement failure that looks exactly like a block
    that failed to render.

    This is the same lesson as `supports_anchor()` above, one class along:
    DECLARING a convention is not HONOURING it, so the selector matches on what
    the block actually emits. Both alternatives are scoped to the anchored
    wrapper, and the root always precedes its own descendants in document
    order, so `querySelector` cannot pick a child over the root.
    """
    return f'{scope} {combinator} {css_class(block_name)}, ' \
           f'{scope} {combinator} {bem_class(block_name)}'.replace('  ', ' ')


def read_block(slug_dir: Path) -> dict | None:
    bj = slug_dir / 'block.json'
    if not bj.is_file():
        return None
    try:
        return json.loads(bj.read_text(encoding='utf-8'))
    except json.JSONDecodeError as exc:
        sys.exit(f'FAIL: {bj} is not valid JSON — {exc}')


def migrated_blocks(props: list[str]) -> list[dict]:
    """Every block that has migrated AT LEAST ONE of `props` to the tier-object
    shape (type=object, no Tablet/Mobile siblings — same phase test the
    storage-shape gate uses). Each returned block carries its OWN `properties`
    list — the subset of `props` it actually has — since a block like
    sgs/button can carry several (customWidth, iconSize, letterSpacing,
    lineHeight, minHeight, fontSize) while most carry exactly one."""
    out = []
    for d in sorted(BLOCKS_DIR.iterdir()):
        if not d.is_dir():
            continue
        meta = read_block(d)
        if not meta:
            continue
        attrs = meta.get('attributes') or {}
        matched = []
        for prop in props:
            base = attrs.get(prop)
            if not isinstance(base, dict) or base.get('type') != 'object':
                continue
            # A surviving flat sibling means the family is BLENDED, not migrated.
            if f'{prop}Tablet' in attrs or f'{prop}Mobile' in attrs:
                continue
            matched.append(prop)
        if not matched:
            continue
        out.append({
            'dir': d.name,
            'name': meta.get('name'),
            'parent': (meta.get('parent') or [None])[0],
            'attrs': attrs,
            'properties': matched,
            'anchorable': supports_anchor(meta),
            'allowed': meta.get('allowedBlocks'),
            # The block's own minimum-render recipe. See `render_minimums()`.
            'example': meta.get('example'),
        })
    return out


def layout_value(attrs: dict) -> str | None:
    """Pick a layout that makes a gap observable, honouring the block's own enum.

    A gap COMPUTES regardless of `display`, so the measurement works either way —
    but a grid/flex layout makes it actually paint, which is what the gate is
    about. Never invents a value the block does not allow.
    """
    lay = attrs.get('layout')
    if not isinstance(lay, dict):
        return None
    enum = lay.get('enum')
    if enum:
        for pref in ('grid', 'flex'):
            if pref in enum:
                return pref
        return None  # its enum has no grid/flex — leave the block's own default
    return 'grid'


def _numeric_unit_companion(blk: dict, prop: str, tiers: dict, props: list[str]) -> str | None:
    """The sibling `{prop}Unit` attr to PIN to 'px' alongside a bare-number
    probe value — the sibling `{prop}Unit`'s own block.json-declared default
    is the unit a bare number resolves against, and D578 (live measurement,
    2026-08-11, reported after this file's D577 pass shipped) proved it is
    NOT always 'px': text/heading/button all declare `letterSpacingUnit`/
    `lineHeightUnit` default `'em'`. An untouched sibling silently turned a
    bare `64` into `64em`, which the browser resolves AGAINST FONT-SIZE —
    measured live: `letterSpacing@tablet` probe `32` computed `1024px`
    (32em x a 32px font, exact arithmetic match) — not a failure to bind, a
    correctly-bound value the comparison could not recognise because the
    unit silently changed underneath it.

    Only pins when EVERY tier value is a genuine bare number (the numeric
    branch — never called for a keyword/length-string probe) AND the sibling
    itself is NOT independently under test this run (`customWidthUnit` gets
    its own deliberately-varying enum probe in that case; forcing 'px' over
    it would corrupt THAT property's own positive control, and the combined
    result is still not a probe-shape bug — see `derive_probe_tiers()`'s
    "Two cases to leave alone" note for why `customWidth`+`customWidthUnit`
    together produce a percentage-resolved computed value no probe string can
    literally match).
    """
    if not all(_is_number(v) for v in tiers.values()):
        return None
    unit_attr = f'{prop}Unit'
    if unit_attr in props or unit_attr not in blk['attrs']:
        return None
    unit_decl = blk['attrs'].get(unit_attr)
    # An object-shaped Unit sibling (e.g. customWidthUnit) is itself a
    # migrated tier property with its own probe derivation — never flatten a
    # bare 'px' string onto an object-typed attr (WordPress silently coerces
    # a wrong-shape value to the default, D338).
    if not isinstance(unit_decl, dict) or unit_decl.get('type') == 'object':
        return None
    return unit_attr


def block_markup(blk: dict, props: list[str], variant: str, inner: str = '',
                 image: dict | None = None) -> str:
    """One block instance.

    `variant` is either:
      * 'default' — none of `props` is set, so the block renders its own
        block.json defaults. THIS IS THE REGRESSION SURFACE: almost every real
        instance leaves the property unset, so a change to a default is what
        would actually reach a client site.
      * 'probe' — EVERY property in `props` this block actually has is set to
        distinct per-tier values in the SAME instance, proving each object
        shape genuinely binds. This is the POSITIVE CONTROL, and it can only
        be meaningful AFTER the migration: under the pre-migration code the
        attribute is a scalar, so an object value is coerced away. A capture
        of this variant on the old build measures defaults, and the report
        must say so rather than present it as a matched pair.
    """
    # ORDER MATTERS. The render minimums go on FIRST and the probe values LAST,
    # so a probe value can never be overwritten by scaffolding. `render_minimums`
    # already refuses to emit a property under test, so the two cannot collide —
    # but the ordering makes that structural rather than a property of one
    # filter, which is what the previous shape got wrong: the old TYPED_ITEMS
    # write sat AFTER the probe loop, harmless with one entry and a live bug the
    # moment the map covered a block whose content attr was also measured.
    attrs: dict = render_minimums(blk, props)
    apply_image(blk, attrs, props, image)
    # `layout` is the one scaffolding writer NOT filtered against the property
    # list, so if a pass ever measures `layout` the ORDERING below is what keeps
    # its probe value — nothing else does. ⛔ Do not "also" add a
    # `'layout' not in props` guard here: tried, and its removal changed no
    # assertion, because the ordering already covered it. Two overlapping fixes
    # for one failure are unfalsifiable — neither can ever be safely removed.
    lay = layout_value(blk['attrs'])
    if lay:
        attrs['layout'] = lay
    # `props` is empty for a HOST block — scaffolding that exists only so
    # WordPress will accept its child (a shell parent like sgs/site-header,
    # which does not own any target property at all). Without this guard the
    # probe variant would write nothing extra, which is already correct, but
    # the explicit empty-list check keeps the host path legible.
    if variant == 'probe' and props:
        for prop in props:
            # TYPE-CORRECT per property (D577) — see `derive_probe_tiers()`.
            # A REFUSED property is left UNSET here (never written as a value
            # of unknown shape); `build_content()` reads the same memoised
            # decision afterwards to narrow that block's probe-row `properties`
            # list and report the refusal, so the two never disagree.
            tiers, _reason = derive_probe_tiers(blk, prop)
            if tiers is not None:
                attrs[prop] = tiers
                # D578 — see `_numeric_unit_companion()`. Written in the SAME
                # ordering pass as the probe value it accompanies, never
                # before it, so it cannot itself be the thing scaffolding
                # later overwrites.
                companion = _numeric_unit_companion(blk, prop, tiers, props)
                if companion:
                    attrs[companion] = 'px'
                # D578 — see `_numeric_unit_companion()`. Written in the SAME
                # ordering pass as the probe value it accompanies, never
                # before it, so it cannot itself be the thing scaffolding
                # later overwrites.

    payload = json.dumps(attrs, separators=(',', ':'), ensure_ascii=False)
    if inner:
        return f'<!-- wp:{blk["name"]} {payload} -->\n{inner}\n<!-- /wp:{blk["name"]} -->'
    return f'<!-- wp:{blk["name"]} {payload} /-->'


def anchor_id(block_dir: str, variant: str) -> str:
    return f'tierfx-{variant}-{block_dir}'


# Blocks whose permitted children are declared in edit.js rather than block.json.
# ⚠ These are FIXTURE-CONSTRUCTION hints, not behaviour: they decide what child
# markup makes the block render at all, and nothing here changes how any block
# works. Verified by reading each edit.js (tabs/edit.js:133). If a block renders
# nothing without children and is not covered here, the capture REFUSES to
# measure it rather than reporting a false empty — which is the correct outcome
# and the signal to extend this map.
EDITJS_ALLOWED = {'sgs/tabs': 'sgs/tab'}

# Generic filler for a container-equivalent that permits anything.
GENERIC_CHILD = 'sgs/text'


def child_block(meta_name: str, allowed: list | None) -> str:
    if allowed:
        return allowed[0]
    return EDITJS_ALLOWED.get(meta_name, GENERIC_CHILD)


def children_markup(child_name: str, count: int = 2) -> str:
    """`count` sibling children.

    TWO, not one, and deliberately: a gap paints BETWEEN children, so a block
    holding a single child would compute the gap correctly and show nothing —
    evidence that looks fine and proves less than it appears to.
    """
    out = []
    for i in range(count):
        if child_name == GENERIC_CHILD:
            # ⚠ The attribute is `text`, NOT `content`. An earlier version wrote
            # `content` — which sgs/text does not declare, so WordPress would
            # have discarded it (D338). The deploy's stored-content audit caught
            # it as 56 HIGH findings before it reached anything. Check the
            # block's own attribute names; do not assume the obvious one.
            out.append(f'<!-- wp:{child_name} {{"text":"Fixture child {i + 1}"}} /-->')
        else:
            out.append(f'<!-- wp:{child_name} /-->')
    return '\n'.join(out)


def wrap_anchored(inner: str, block_dir: str, variant: str) -> str:
    """Put one fixture instance inside an `sgs/container` carrying the anchor.

    The container is the ONE block proven to honour `anchor` (measured on the
    live page), so scoping never depends on the block under test honouring it
    too. The wrapper is identical on both sides of a before/after pair, so it
    cannot itself be the source of a difference.
    """
    payload = json.dumps({'anchor': anchor_id(block_dir, variant)},
                         separators=(',', ':'))
    return f'<!-- wp:sgs/container {payload} -->\n{inner}\n<!-- /wp:sgs/container -->'


def selector_for(blk: dict, parent: dict | None, variant: str) -> tuple[str, str]:
    """The CSS selector the probe uses for this block, plus how it was derived.

    ⛔ Every selector is SCOPED to the anchored wrapper. An unscoped query on a
    block class returned the site HEADER in a previous session and produced a
    confident false failure — and this very page proves why: it carries EIGHT
    `.wp-block-sgs-site-header` elements, because the real site header renders
    on it too.
    """
    scope = f'#{anchor_id((parent or blk)["dir"], variant)}'
    if parent:
        return (root_classes(blk['name'], scope, ''),
                f'inside the anchored wrapper, nested in {parent["name"]}')
    return (root_classes(blk['name'], scope, '>'),
            'direct child of the anchored wrapper (matching either the '
            'wp-block- convention class or the block\'s own BEM root class)')


def _probe_manifest_fields(blk: dict, props: list[str],
                           variant: str) -> tuple[list[str], dict, dict]:
    """For the PROBE row only: split `props` into what actually got a
    type-correct probe value vs what was REFUSED (D577), reading the exact
    same memoised `derive_probe_tiers()` decision `block_markup()` already
    wrote the payload from — never a second, possibly-drifted guess.

    The DEFAULT row is untouched (`props` unchanged, no probe_values/
    probe_refused) — the default variant never writes a probe value at all,
    so there is nothing to split.

    Narrowing the PROBE row's own `properties` list (rather than the block's
    whole `properties`) matters because `capture-tier-fixture.py` reads
    `properties` PER MANIFEST ROW (`b.get('properties') or all_props`,
    keyed `f'{dir}::{variant}'`) — the default row still asks for evidence on
    every migrated property (rule 4: still a valid regression-surface
    measurement even for a refused property), while the probe row only asks
    for evidence on what it actually set.
    """
    if variant != 'probe' or not props:
        return props, {}, {}
    bound_props: list[str] = []
    probe_values: dict = {}
    probe_refused: dict = {}
    for prop in props:
        tiers, reason = derive_probe_tiers(blk, prop)
        if tiers is None:
            probe_refused[prop] = reason
        else:
            bound_props.append(prop)
            probe_values[prop] = tiers
    return bound_props, probe_values, probe_refused


def build_content(props: list[str], image: dict | None = None) -> tuple[str, list[dict]]:
    blocks = migrated_blocks(props)
    if not blocks:
        sys.exit(f'FAIL: no block has any of {props} in the tier-object shape — '
                 'nothing to fixture.')

    by_name = {b['name']: b for b in blocks}
    children: dict[str, list[dict]] = {}
    top: list[dict] = []
    hosts: dict[str, dict] = {}
    for b in blocks:
        if b['parent'] and b['parent'] in by_name:
            children.setdefault(b['parent'], []).append(b)
        elif b['parent']:
            # ⛔ CORRECTED 2026-08-11. This branch used to SKIP the child with
            # "needs parent X, which has not migrated <prop>" — reasoning that is
            # simply wrong, and it blocked pass 3a's commit for two blocks that
            # were perfectly measurable.
            #
            # A `parent` constraint is WordPress asking "may this block be placed
            # here". It has nothing to do with the property under test. A shell
            # parent like sgs/site-header declares NO gridTemplateColumns and no
            # `layout` at all — it is an empty skeleton whose whole job is to
            # house rows — so it will NEVER "migrate the property", and the old
            # condition could never become true. Its rows, which DO own the grid,
            # were therefore permanently unmeasurable.
            #
            # The parent only has to EXIST and be able to host the child. So load
            # it as a HOST and render it with the property UNSET, then nest the
            # measured child inside. The host is never measured and never appears
            # in the manifest; it is scaffolding.
            host = hosts.get(b['parent'])
            if host is None:
                host_dir = BLOCKS_DIR / b['parent'].split('/', 1)[-1]
                host_meta = read_block(host_dir) if host_dir.is_dir() else None
                if host_meta is not None:
                    # Same record shape migrated_blocks() builds — read_block()
                    # returns the RAW block.json, which has no 'dir'/'parent'
                    # keys, and every downstream helper expects them.
                    host = {
                        'dir': host_dir.name,
                        'name': host_meta.get('name'),
                        'parent': (host_meta.get('parent') or [None])[0],
                        'attrs': host_meta.get('attributes') or {},
                        'anchorable': supports_anchor(host_meta),
                        'allowed': host_meta.get('allowedBlocks'),
                        'example': host_meta.get('example'),
                        'is_host': True,
                    }
                    hosts[b['parent']] = host
                    top.append(host)
            if host is not None:
                children.setdefault(b['parent'], []).append(b)
            else:
                # Genuinely unhostable — the parent block does not exist on disk.
                # Reported, never silently dropped (rule 4: no skipping).
                b['skipped'] = (f"parent {b['parent']} does not exist on disk, so this "
                                f"block cannot be placed anywhere WordPress will accept")
                top.append(b)
        else:
            top.append(b)

    parts, manifest = [], []
    for variant in ('default', 'probe'):
        parts.append(f'<!-- wp:paragraph --><p><strong>SECTION: {variant}</strong> — '
                     + ('properties NOT set; blocks render their own block.json '
                        'defaults (the regression surface).'
                        if variant == 'default' else
                        'every applicable property set to a distinct, TYPE-CORRECT '
                        'per-tier value derived from its own declared shape (the '
                        'positive control) — see the manifest\'s per-block '
                        'probe_values for the exact figures.')
                     + '</p><!-- /wp:paragraph -->')
        for b in top:
            if b.get('skipped'):
                if variant == 'default':
                    manifest.append({'dir': b['dir'], 'name': b['name'], 'variant': variant,
                                     'properties': b.get('properties', []),
                                     'selector': None, 'skipped': b['skipped']})
                continue
            inner = ''
            for c in children.get(b['name'], []):
                # A measured child that is itself a container needs its own
                # children, or it renders an empty shell and cannot be measured.
                c_inner = children_markup(child_block(c['name'], c['allowed']))
                inner += block_markup(c, c['properties'], variant, c_inner, image) + '\n'
                sel, basis = selector_for(c, b, variant)
                bound_props, probe_values, probe_refused = _probe_manifest_fields(
                    c, c['properties'], variant)
                manifest.append({'dir': c['dir'], 'name': c['name'], 'variant': variant,
                                 'properties': bound_props,
                                 **({'probe_values': probe_values} if probe_values else {}),
                                 **({'probe_refused': probe_refused} if probe_refused else {}),
                                 'selector': sel, 'selector_basis': basis,
                                 'nested_in': b['name']})
            if not inner:
                inner = children_markup(child_block(b['name'], b['allowed']))
            # A HOST is scaffolding: it exists only so WordPress will accept its
            # child. It does not own any target property, is rendered with none
            # set, and is never measured — so it must not enter the manifest, or
            # the report generator would demand evidence for a block that has
            # none to give.
            host_props = [] if b.get('is_host') else b['properties']
            parts.append(wrap_anchored(
                block_markup(b, host_props, variant, inner.strip(), image),
                b['dir'], variant))
            if b.get('is_host'):
                continue
            sel, basis = selector_for(b, None, variant)
            bound_props, probe_values, probe_refused = _probe_manifest_fields(
                b, b['properties'], variant)
            manifest.append({'dir': b['dir'], 'name': b['name'], 'variant': variant,
                             'properties': bound_props,
                             **({'probe_values': probe_values} if probe_values else {}),
                             **({'probe_refused': probe_refused} if probe_refused else {}),
                             'selector': sel, 'selector_basis': basis, 'nested_in': None})

    unscoped = [m for m in manifest if m.get('selector') == '']
    if unscoped:
        sys.exit('FAIL: no scoped selector for ' + ', '.join(m['name'] for m in unscoped) +
                 '. An unscoped query can match the wrong element and produce a '
                 'confident false result — refusing to emit one.')

    return '\n\n'.join(parts), manifest


def rest(env: dict, path: str, data: dict | None = None, method: str = 'GET'):
    auth = base64.b64encode(
        f"{env['WP_USER_SANDYBROWN']}:{env['WP_APP_PWD_SANDYBROWN']}".encode()).decode()
    body = json.dumps(data).encode() if data is not None else None
    req = urllib.request.Request(
        f"{env['WP_URL_SANDYBROWN'].rstrip('/')}/wp-json/wp/v2/{path}",
        data=body, method=method,
        headers={'Content-Type': 'application/json', 'Authorization': 'Basic ' + auth})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.load(r)
    except urllib.error.HTTPError as exc:
        sys.exit(f'FAIL: REST {method} {path} → HTTP {exc.code}: {exc.read()[:400]!r}')


def resolve_canary_image(env: dict) -> dict:
    """ONE real image, taken from the canary's own media library.

    ⛔ REFUSES rather than falling back. Three blocks paint only once a picture
    resolves, and two of their block.json examples point at
    `via.placeholder.com` — a service that no longer exists. Such a block still
    EMITS, so the selector matches and a measurement is dutifully recorded; but
    every screenshot shows a broken image and the box collapses. That is the
    same failure shape as the blank readings D573 was about: evidence that looks
    clean and describes nothing. Better to stop and say why.
    """
    items = rest(env, 'media?media_type=image&per_page=1&orderby=id&order=asc')
    if not items:
        sys.exit('FAIL: the canary media library holds no image, so sgs/media, '
                 'sgs/decorative-image and sgs/before-after cannot be made to '
                 'render. Upload one image and re-run — refusing to emit a '
                 'known-dead placeholder URL instead.')
    m = items[0]
    details = m.get('media_details') or {}
    return {'id': m['id'], 'url': m['source_url'],
            'width': details.get('width'), 'height': details.get('height')}


# The attribute each previously-blank block's render guard actually READS —
# named individually, and cited. ⚠ Asserting that a block "received some
# attributes" would pass while writing the wrong ones: `sgs/text` given
# `content` instead of `text` looks populated and renders nothing, which is the
# exact mistake already recorded in `children_markup()` below. D573's lesson is
# that a weak assertion converts "untested" into "tested and green", so every
# entry here names the real key.
SELFTEST_REQUIRED = {
    'sgs/before-after': ('beforeImageUrl', 'afterImageUrl'),   # render.php:50 — BOTH
    'sgs/collapsible-text': ('text',),                         # render.php:73
    'sgs/decorative-image': ('imageUrl',),                     # render.php:123
    'sgs/media': ('imageUrl',),                                # render.php:560
    'sgs/option-picker': ('optionItems',),                     # render.php:144
    'sgs/text': ('text',),                                     # render.php:178
    'sgs/whatsapp-cta': ('phoneNumber',),                      # render.php:49
}

# A stand-in for `resolve_canary_image()`'s return, so the self-test needs no
# network. The URL is deliberately NOT a placeholder-service address — one
# assertion below proves the dead example URLs are replaced, and it could not
# fail if the stub looked like them.
SELFTEST_IMAGE = {'id': 4242, 'url': 'https://example.invalid/wp-content/fixture.jpg',
                  'width': 1200, 'height': 800}


def payload_of(markup: str) -> dict:
    """The attributes JSON out of a `<!-- wp:ns/name {...} -->` comment.

    `raw_decode` rather than string-slicing on `-->`: an attribute VALUE can
    itself contain `-->` or a nested object, and a slice would truncate mid-JSON
    and read as malformed output rather than as a bad parser.
    """
    start = markup.index('{')
    return json.JSONDecoder().raw_decode(markup[start:])[0]


def self_test() -> int:
    """Assert the render minimums put the RIGHT keys on the RIGHT blocks."""
    checks: list[tuple[str, bool]] = []

    def ok(label: str, cond: bool) -> None:
        checks.append((label, bool(cond)))

    all_props = sorted({p for d in BLOCKS_DIR.iterdir() if d.is_dir()
                        for p in ((read_block(d) or {}).get('attributes') or {})})
    by_name = {b['name']: b for b in migrated_blocks(all_props)}

    def attrs_for(name: str, props: list[str] | None = None,
                  variant: str = 'default') -> dict:
        blk = by_name.get(name)
        if blk is None:
            return {}
        return payload_of(block_markup(blk, props if props is not None else [],
                                       variant, image=SELFTEST_IMAGE))

    # 1-8. Every previously-NOT-FOUND block gets the specific key its guard reads.
    for name, keys in SELFTEST_REQUIRED.items():
        ok(f'{name}: block is on the fixture roster', name in by_name)
        got = attrs_for(name)
        for key in keys:
            ok(f'{name}: sets {key}', bool(got.get(key)))

    # 9. sgs/text takes `text`, NOT `content` — the recorded D338 mistake.
    text_attrs = attrs_for('sgs/text')
    ok('sgs/text: does NOT set `content`', 'content' not in text_attrs)

    # 10. option-picker items each need a non-empty `key`, or render.php:172
    #     drops them all after validation and the block still emits nothing.
    picker = attrs_for('sgs/option-picker').get('optionItems') or []
    ok('sgs/option-picker: every item has a non-empty key',
       bool(picker) and all((i.get('key') or '').strip() for i in picker))

    # 11. card-grid needs TWO rows, not one — a gap paints BETWEEN children.
    cards = attrs_for('sgs/card-grid').get('items') or []
    ok('sgs/card-grid: at least 2 items', len(cards) >= 2)

    # 12-14. The dead placeholder URLs are REPLACED by the resolved image, in
    #        every slot, including both of before-after's.
    media_attrs = attrs_for('sgs/media')
    ok('sgs/media: imageUrl is the resolved image, not the example placeholder',
       media_attrs.get('imageUrl') == SELFTEST_IMAGE['url'])
    ok('sgs/media: imageId is the resolved id',
       media_attrs.get('imageId') == SELFTEST_IMAGE['id'])
    ba = attrs_for('sgs/before-after')
    ok('sgs/before-after: BOTH slot urls are the resolved image',
       ba.get('beforeImageUrl') == SELFTEST_IMAGE['url']
       and ba.get('afterImageUrl') == SELFTEST_IMAGE['url'])

    # 15. Intrinsic dimensions describe the resolved image, not the example's
    #     stale 800x600.
    ok('sgs/media: imageWidth comes from the resolved image',
       media_attrs.get('imageWidth') == SELFTEST_IMAGE['width'])

    # 16-17. Filter (b): a property UNDER TEST is never written from an example.
    #        sgs/text's example sets `fontSize`, which is a migrated property.
    ok('sgs/text: fontSize NOT written when it is under test',
       'fontSize' not in attrs_for('sgs/text', ['fontSize']))
    ok('sgs/text: text IS still written when fontSize is under test',
       bool(attrs_for('sgs/text', ['fontSize']).get('text')))

    # 18. Filter (c): a flat example value on an object-typed attr is dropped —
    #     WordPress would coerce it to the default anyway. sgs/text's example
    #     carries `fontSize: 16` against an object attr, so it must not appear
    #     even when fontSize is NOT in the property list.
    ok('sgs/text: flat fontSize dropped as wrong-shape for an object attr',
       'fontSize' not in attrs_for('sgs/text', []))

    # 19. Filter (a): an example key the schema does not declare is dropped.
    fake = {'name': 'sgs/fake', 'attrs': {'real': {'type': 'string'}},
            'example': {'attributes': {'real': 'yes', 'undeclared': 'no'}}}
    minimums = render_minimums(fake, [])
    ok('undeclared example key is dropped', minimums == {'real': 'yes'})

    # 20-21. A property under test is never taken from an example, in EITHER
    #        variant. ⚠ This proves filter (b), NOT the write ordering — with
    #        every example write already filtered, the probe cannot collide with
    #        one, so an ordering assertion built on an example would pass no
    #        matter which order the writes ran in. Ordering is proved at 22.
    # `items` is given an explicit LENGTH-shaped default ('10px' at desktop)
    # purely so `derive_probe_tiers()` classifies it deterministically as
    # LENGTH — this test is about the WRITE-ORDER/filter guarantee, not about
    # type derivation (that gets its own assertions at 27+ below), so pinning
    # the classification keeps the historic `== PROBE_TIERS` assertion valid.
    clash = {'dir': 'clash', 'name': 'sgs/clash',
             'attrs': {'items': {'type': 'object', 'default': {'desktop': '10px'}}},
             'example': {'attributes': {'items': ['from-example']}}}
    probe = payload_of(block_markup(clash, ['items'], 'probe'))
    ok('probe value is not displaced by a colliding example',
       probe['items'] == PROBE_TIERS)
    default = payload_of(block_markup(clash, ['items'], 'default'))
    ok('default variant leaves a property under test unset',
       'items' not in default)

    # 22-24. The selector matches a hand-built root. `sgs/decorative-image`
    #        emits its `<img>` AS the block root with no `wp-block-` class, so
    #        the convention-only selector found nothing and reported NOT-FOUND
    #        at all three viewports. Measured on the live page, not reasoned.
    di = by_name.get('sgs/decorative-image')
    di_sel = selector_for(di, None, 'default')[0] if di else ''
    ok('decorative-image selector covers its own BEM root class',
       '.sgs-decorative-image' in di_sel)
    ok('decorative-image selector still covers the wp-block- convention',
       '.wp-block-sgs-decorative-image' in di_sel)
    ok('both alternatives stay scoped to the anchor',
       di_sel.count('#tierfx-default-decorative-image') == 2)

    # 25-26. ORDERING, for real. `layout` is the one scaffolding writer that is
    #        NOT filtered against the property list, so it is the only place a
    #        genuine write collision can occur — which makes it the only
    #        non-vacuous test of "probe values are written LAST". Verified to
    #        go red when the probe loop is moved above the layout write.
    # 'layout' is given the SAME LENGTH-shaped default as `clash` above, for
    # the identical reason: this is a write-ORDER test, not a type-derivation
    # test, so the classification is pinned rather than left to fall through
    # to a length-name-hint guess.
    laid = {'dir': 'laid', 'name': 'sgs/laid',
            'attrs': {'layout': {'type': 'object', 'default': {'desktop': '10px'},
                                 'enum': ['grid', 'flex']}}}
    ok('probe value survives the layout writer (write order holds)',
       payload_of(block_markup(laid, ['layout'], 'probe'))['layout'] == PROBE_TIERS)
    ok('layout is still set when it is NOT under test',
       payload_of(block_markup(laid, [], 'default')).get('layout') == 'grid')

    # 22. A HOST carries no properties and must still survive minimum-building
    #     (it has no `example` key at all in the record when block.json has none).
    hostless = {'name': 'sgs/hostless', 'attrs': {'a': {'type': 'string'}}}
    ok('a record with no example yields no minimums', render_minimums(hostless, []) == {})

    # ── D577 (Task 1): probe values must be TYPE-CORRECT for their property ──
    # `real_blocks` reads the ACTUAL on-disk blocks so these assertions prove
    # the derivation against real block.json + edit.js, not an invented
    # fixture — the same standard `SELFTEST_REQUIRED` above holds for
    # render-minimums.
    real_blocks = {b['name']: b for b in migrated_blocks(
        sorted({p for d in BLOCKS_DIR.iterdir() if d.is_dir()
               for p in ((read_block(d) or {}).get('attributes') or {})}))}

    # 27-30. multi-button's 4 layout keywords — each must resolve to a LEGAL
    #        CSS keyword for that property (not a bare '64px' length string,
    #        which is what PROBE_TIERS alone would have written and which
    #        `alignItems`/`flexDirection`/`flexWrap`/`justifyContent` cannot
    #        parse — the exact defect this task exists to fix).
    mb = real_blocks.get('sgs/multi-button')
    _KEYWORD_LEGAL = {
        'alignItems': {'flex-start', 'center', 'flex-end', 'stretch'},
        'flexDirection': {'row', 'column'},
        'flexWrap': {'wrap', 'nowrap'},
        'justifyContent': {'flex-start', 'center', 'flex-end', 'space-between'},
    }
    for prop, legal in _KEYWORD_LEGAL.items():
        tiers, reason = derive_probe_tiers(mb, prop) if mb else (None, 'block missing')
        ok(f'multi-button {prop}: block is on the fixture roster', mb is not None)
        ok(f'multi-button {prop}: probe derivation did not refuse ({reason})',
           tiers is not None)
        if tiers:
            ok(f'multi-button {prop}: every tier is a LEGAL keyword for this property, '
               f'not a length string', all(v in legal for v in tiers.values()))
            default = (mb['attrs'][prop].get('default') or {})
            ok(f'multi-button {prop}: each tier differs from THAT TIER\'S OWN default',
               all(tiers[t] != default.get(t) for t in tiers))

    # 31. decorative-image.rotation — must be a bare NUMBER (matching the
    #     framework's own number+separate-unit convention this attr already
    #     uses, block.json default {"desktop":0}), never a '64px' string —
    #     RangeControl's `min=-180,max=180` would reject a string outright.
    di2 = real_blocks.get('sgs/decorative-image')
    rot_tiers, rot_reason = derive_probe_tiers(di2, 'rotation') if di2 else (None, 'missing')
    ok('decorative-image rotation: probe derivation did not refuse', rot_tiers is not None)
    if rot_tiers:
        ok('decorative-image rotation: every tier is a bare int/float, not a string',
           all(isinstance(v, (int, float)) and not isinstance(v, bool)
               for v in rot_tiers.values()))
        ok('decorative-image rotation: differs from the declared default (0)',
           all(v != 0 for v in rot_tiers.values()))

    # 32. hero.splitContentOrder — a STRING ENUM ('media-first'/'content-first'/
    #     ''), not the integer the task brief's own initial hypothesis named it
    #     — verified against the real per-tier option lists in hero/edit.js
    #     (DESKTOP_ORDER_OPTIONS/TABLET_ORDER_OPTIONS/MOBILE_ORDER_OPTIONS),
    #     never against an assumption.
    hero_blk = real_blocks.get('sgs/hero')
    sco_tiers, sco_reason = (derive_probe_tiers(hero_blk, 'splitContentOrder')
                             if hero_blk else (None, 'missing'))
    ok('hero splitContentOrder: probe derivation did not refuse', sco_tiers is not None)
    if sco_tiers:
        legal_split = {'media-first', 'content-first'}
        ok('hero splitContentOrder: every tier is a legal order keyword',
           all(v in legal_split for v in sco_tiers.values()))
        ok('hero splitContentOrder: mobile differs from its own default (media-first)',
           sco_tiers.get('mobile') != 'media-first')

    # 33. button.widthType — one of the block's own three WIDTH_OPTIONS
    #     ('fit'/'full'/'custom'), never a length string.
    btn = real_blocks.get('sgs/button')
    wt_tiers, wt_reason = derive_probe_tiers(btn, 'widthType') if btn else (None, 'missing')
    ok('button widthType: probe derivation did not refuse', wt_tiers is not None)
    if wt_tiers:
        ok('button widthType: every tier is a legal width-type keyword',
           all(v in {'fit', 'full', 'custom'} for v in wt_tiers.values()))
        # Only DESKTOP has a declared default ({"desktop":"fit"}) — tablet and
        # mobile have none, so any legal value differs from "nothing declared"
        # by construction; only desktop's own value needs to differ from 'fit'.
        ok('button widthType: desktop differs from the declared default (fit)',
           wt_tiers['desktop'] != 'fit')

    # 34. media.order — a unitless CSS property (no `orderUnit` sibling, no
    #     edit.js control at all) — must resolve to a bare int via the
    #     UNITLESS_CSS_PROP_NAMES fallback, not be refused.
    media_blk = real_blocks.get('sgs/media')
    ord_tiers, ord_reason = (derive_probe_tiers(media_blk, 'order')
                             if media_blk else (None, 'missing'))
    ok('media order: probe derivation did not refuse', ord_tiers is not None)
    if ord_tiers:
        ok('media order: every tier is a bare int, not a string',
           all(isinstance(v, int) for v in ord_tiers.values()))

    # 35. button.customWidth (empty default, sibling customWidthUnit exists)
    #     resolves NUMERIC via the sibling-Unit-attr rule, not a length string.
    cw_tiers, cw_reason = derive_probe_tiers(btn, 'customWidth') if btn else (None, 'missing')
    ok('button customWidth: probe derivation did not refuse', cw_tiers is not None)
    if cw_tiers:
        ok('button customWidth: every tier is a bare number (unit comes from '
           'customWidthUnit, left untouched)',
           all(_is_number(v) for v in cw_tiers.values()))

    # 36. button.customWidthUnit — derived via the `units={}` UnitControl scan
    #     (customWidth's own control, not an independent binding) — must be a
    #     legal CSS unit keyword ('px'/'%'), not '64px'.
    cwu_tiers, cwu_reason = (derive_probe_tiers(btn, 'customWidthUnit')
                             if btn else (None, 'missing'))
    ok('button customWidthUnit: probe derivation did not refuse', cwu_tiers is not None)
    if cwu_tiers:
        ok('button customWidthUnit: every tier is a legal unit keyword',
           all(v in {'px', '%'} for v in cwu_tiers.values()))
        ok('button customWidthUnit: differs from the declared default (px)',
           all(v != 'px' for v in cwu_tiers.values()))

    # 37. The REFUSE path is real, not vacuous — a keyword-shaped default with
    #     NO derivable edit.js pool (fictional block, no edit.js on disk at
    #     all) must come back None with a stated reason, never a guessed value.
    unresolvable = {'dir': 'no-such-block-dir', 'name': 'sgs/no-such-block',
                    'attrs': {'mood': {'type': 'object', 'default': {'desktop': 'happy'}}}}
    mood_tiers, mood_reason = derive_probe_tiers(unresolvable, 'mood')
    ok('an undeclared keyword control REFUSES rather than guesses', mood_tiers is None)
    ok('the refusal carries a non-empty stated reason', bool(mood_reason))

    # 38. A refused property is never written into the probe payload at all
    #     (not even as a partial/placeholder value) — proven end-to-end
    #     through block_markup(), not just at the derivation layer.
    refused_payload = payload_of(block_markup(unresolvable, ['mood'], 'probe'))
    ok('a refused property is left UNSET in the actual probe markup',
       'mood' not in refused_payload)

    # 39. Adjacent-tier distinctness is at least best-effort, not accidental —
    #     multi-button flexWrap's pool has exactly 2 legal values and a
    #     default at desktop+mobile, so a naive pick could land the same
    #     value on every tier; assert desktop != tablet and tablet != mobile
    #     (the tier-diff-suppression concern documented on `_pick_from_pool`).
    if mb:
        fw_tiers, _ = derive_probe_tiers(mb, 'flexWrap')
        if fw_tiers:
            ok('multi-button flexWrap: desktop and tablet probe values differ '
               '(else the tablet CSS rule is suppressed as redundant)',
               fw_tiers['desktop'] != fw_tiers['tablet'])
            ok('multi-button flexWrap: tablet and mobile probe values differ '
               '(else the mobile CSS rule is suppressed as redundant)',
               fw_tiers['tablet'] != fw_tiers['mobile'])

    # ── D577 (Task 2): the measured CHILD ELEMENT must exist ──────────────────
    # Each asserts the SPECIFIC attribute render.php actually reads (D573's
    # rule — a weak "received something" assertion would pass while writing
    # the wrong key), not merely that render_minimums() "did something".

    # 40-41. trust-bar — render.php:258-260 needs a non-empty `title`.
    tb = real_blocks.get('sgs/trust-bar')
    ok('trust-bar: block is on the fixture roster', tb is not None)
    if tb:
        tb_min = render_minimums(tb, [])
        ok('trust-bar: sets a non-empty `title`', bool(tb_min.get('title')))

    # 42-43. icon-list — render.php:147 needs a non-empty `heading`.
    il = real_blocks.get('sgs/icon-list')
    ok('icon-list: block is on the fixture roster', il is not None)
    if il:
        il_min = render_minimums(il, [])
        ok('icon-list: sets a non-empty `heading`', bool(il_min.get('heading')))

    # 44-46. separator — render.php:90/310 needs contentMode!='none' AND text.
    sep = real_blocks.get('sgs/separator')
    ok('separator: block is on the fixture roster', sep is not None)
    if sep:
        sep_min = render_minimums(sep, [])
        ok('separator: contentMode is not the render-guard default (none)',
           sep_min.get('contentMode') not in (None, 'none'))
        ok('separator: sets a non-empty contentText',
           bool(sep_min.get('contentText')))

    # 47-49. product-card — render.php:503-506 needs variantStyle='trial' (or
    #        'featured') PLUS the matching tag text, or the badge is always ''.
    pc = real_blocks.get('sgs/product-card')
    ok('product-card: block is on the fixture roster', pc is not None)
    if pc:
        pc_min = render_minimums(pc, [])
        ok('product-card: variantStyle is trial or featured, not the example\'s '
           '"standard" (which can never carry a badge)',
           pc_min.get('variantStyle') in ('trial', 'featured'))
        ok('product-card: the matching tag text is set for that variant',
           bool(pc_min.get('trialTag')) if pc_min.get('variantStyle') == 'trial'
           else bool(pc_min.get('featuredTag')))

    # 50-52. brand-strip — render.php:71/469-470 needs showNames=true AND a
    #        logo entry with a non-empty `name`; render.php:465 additionally
    #        needs that entry's `media.url` non-empty, supplied by
    #        `apply_image()` via REPEATER_IMAGE_SLOTS, proved end-to-end
    #        through the real `block_markup()` write path (not just the
    #        minimums layer), matching the SAME image-substitution proof
    #        already used for sgs/media above.
    bs = real_blocks.get('sgs/brand-strip')
    ok('brand-strip: block is on the fixture roster', bs is not None)
    if bs:
        bs_attrs = payload_of(block_markup(bs, [], 'default', image=SELFTEST_IMAGE))
        ok('brand-strip: showNames is true', bs_attrs.get('showNames') is True)
        logos = bs_attrs.get('logos') or []
        ok('brand-strip: at least one logo carries a non-empty name',
           bool(logos) and bool((logos[0] or {}).get('name')))
        ok('brand-strip: that logo\'s media.url is the RESOLVED image, not the '
           'empty EXTRA_MINIMUMS placeholder',
           bool(logos) and (logos[0].get('media') or {}).get('url') == SELFTEST_IMAGE['url'])

    # ── D578: a bare-number probe's UNIT SIBLING must be pinned to 'px' ────────
    # Proven live (coordinator report, 2026-08-11): text/heading/button declare
    # `letterSpacingUnit`/`lineHeightUnit` default 'em', so an untouched sibling
    # silently turned a bare `64` into `64em` — measured `32em x 32px font =
    # 1024px`. `fontSizeUnit` defaults 'px' everywhere checked, so THAT family
    # is unaffected either way; letterSpacing/lineHeight is the proven case.
    text_blk = real_blocks.get('sgs/text')
    ok('text: block is on the fixture roster', text_blk is not None)
    if text_blk:
        text_probe = payload_of(block_markup(text_blk, ['letterSpacing', 'lineHeight'],
                                             'probe', image=SELFTEST_IMAGE))
        ok('text: letterSpacing probe is a bare number (unit supplied separately)',
           all(_is_number(v) for v in text_probe.get('letterSpacing', {}).values()))
        ok("text: letterSpacingUnit is PINNED to 'px', not left at its own "
           "block.json default ('em') — this is the D578 fix",
           text_probe.get('letterSpacingUnit') == 'px')
        ok("text: lineHeightUnit is PINNED to 'px' likewise",
           text_probe.get('lineHeightUnit') == 'px')

    # 54. The companion pin never flattens an OBJECT-typed Unit sibling
    #     (button.customWidthUnit is itself a migrated tier-object with its
    #     OWN probe derivation) — proven end-to-end through block_markup(),
    #     not just the guard in isolation.
    if btn:
        btn_probe = payload_of(block_markup(btn, ['customWidth', 'customWidthUnit'],
                                            'probe', image=SELFTEST_IMAGE))
        ok('button: customWidthUnit keeps its OWN object-shaped probe value '
           "(never flattened to a bare 'px' string)",
           isinstance(btn_probe.get('customWidthUnit'), dict))

    # 55-56. Direct test of the OTHER exclusion — a FLAT-STRING Unit sibling
    #        that IS independently under test this run. No real block hits
    #        this branch today (a Unit attr that has itself migrated to a
    #        tier-object is always object-typed, caught by 54 above instead),
    #        so it is exercised on a synthetic fixture — otherwise this half
    #        of `_numeric_unit_companion()`'s guard is unreachable by any
    #        assertion and untested by construction, the D573 trap.
    fake_len = {'dir': 'fakelen', 'attrs': {'gap': {'type': 'object', 'default': {}},
                                            'gapUnit': {'type': 'string', 'default': 'em'}}}
    fake_tiers = {'desktop': 64, 'tablet': 32, 'mobile': 8}
    ok('companion pin fires for a flat-string Unit sibling NOT under test',
       _numeric_unit_companion(fake_len, 'gap', fake_tiers, []) == 'gapUnit')
    ok('companion pin is WITHHELD when that same flat-string sibling IS under test',
       _numeric_unit_companion(fake_len, 'gap', fake_tiers, ['gap', 'gapUnit']) is None)

    failed = [label for label, passed in checks if not passed]
    for label, passed in checks:
        print(f"  {'PASS' if passed else 'FAIL'}  {label}")
    print(f'\n{len(checks) - len(failed)}/{len(checks)} assertions pass')
    if failed:
        print('FAILED:\n  - ' + '\n  - '.join(failed))
        return 1
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--self-test', action='store_true',
                    help='assert the render minimums put the right keys on the '
                         'right blocks (no network, no writes)')
    ap.add_argument('--property',
                    help='e.g. gap — or a comma-separated list for a batch pass, '
                         'e.g. fontSize,letterSpacing,lineHeight')
    ap.add_argument('--slug', default=None, help='page slug (default tier-fixture-<property>)')
    ap.add_argument('--dry-run', action='store_true', help='print the markup, publish nothing')
    ap.add_argument('--publish', action='store_true', help='create/update the page')
    ap.add_argument('--delete', metavar='ID', help='permanently delete a fixture page by id')
    ap.add_argument('--manifest', default=None, help='write the block manifest JSON here')
    args = ap.parse_args()

    if args.self_test:
        return self_test()
    if not args.property:
        ap.error('--property is required (or pass --self-test)')

    props = [p.strip() for p in args.property.split(',') if p.strip()]
    if not props:
        ap.error('--property is empty')
    # A multi-property page needs a stable slug that is not 200 chars of
    # concatenated attribute names. Single-property runs keep their existing
    # slug EXACTLY, so previously-published fixture pages still resolve.
    default_slug = (f'tier-fixture-{props[0]}' if len(props) == 1
                    else f'tier-fixture-batch-{len(props)}props')
    slug = args.slug or default_slug

    if args.delete:
        env = load_env()
        rest(env, f'pages/{args.delete}?force=true', method='DELETE')
        print(f'deleted page {args.delete}')
        return 0

    # Resolved unconditionally, NOT only under --publish, so `--dry-run` prints
    # the markup that would actually be published rather than a near-miss of it.
    # Credentials are always present (`.claude/secrets/sandybrown.env`).
    env = load_env()
    image = resolve_canary_image(env)
    print(f"fixture image: #{image['id']} {image['url']}")

    content, manifest = build_content(props, image)
    present = [m for m in manifest if not m.get('skipped')]
    skipped = [m for m in manifest if m.get('skipped')]

    print(f'properties : {len(props)} — {", ".join(props)}')
    for variant in ('default', 'probe'):
        rows = [m for m in present if m['variant'] == variant]
        print(f'\nSECTION {variant}  ({len(rows)} blocks)')
        for m in rows:
            nested = f"  (inside {m['nested_in']})" if m['nested_in'] else ''
            props_note = ','.join(m.get('properties') or [])
            print(f"  - {m['name']:26} [{props_note}] {m['selector']}{nested}")
            if 'own anchor' not in m['selector_basis']:
                print(f"      -> {m['selector_basis']}")
            if m.get('probe_values'):
                for prop, tiers in m['probe_values'].items():
                    print(f"      probe `{prop}` = {tiers}")
    if skipped:
        print(f'SKIPPED ({len(skipped)}) — reported, not dropped:')
        for m in skipped:
            print(f"  - {m['name']}: {m['skipped']}")
    # D577 — a REFUSED probe (Task 1: type-correct probe values) is reported
    # exactly like a SKIPPED block above: named, with a reason, never silently
    # dropped (rule 4). This only ever affects the PROBE variant's `properties`
    # list — the default variant still measures every migrated property.
    refused = [(m['name'], prop, reason)
              for m in present if m['variant'] == 'probe'
              for prop, reason in (m.get('probe_refused') or {}).items()]
    if refused:
        print(f'\nPROBE REFUSED ({len(refused)}) — no type-correct value could be '
             'derived, reported not guessed:')
        for name, prop, reason in refused:
            print(f"  - {name} `{prop}`: {reason}")
    print(f'probe tiers (legacy flat field, LENGTH properties only): {PROBE_TIERS}')

    if args.manifest:
        Path(args.manifest).write_text(
            json.dumps({
                # `properties` is the batch-mode field. `property` is retained
                # ONLY when the run is single-property, so an existing manifest
                # consumer that predates batch mode still reads what it expects
                # rather than silently seeing None.
                'properties': props,
                **({'property': props[0]} if len(props) == 1 else {}),
                'slug': slug,
                'probe_tiers': PROBE_TIERS, 'blocks': manifest}, indent=2),
            encoding='utf-8')
        print(f'manifest → {args.manifest}')

    if args.dry_run or not args.publish:
        print('\n--- markup ---')
        print(content)
        if not args.publish:
            print('\n(dry run — nothing published; pass --publish to create the page)')
        return 0

    existing = rest(env, f'pages?slug={slug}&status=any&per_page=1')
    title_props = props[0] if len(props) == 1 else f'{len(props)} properties'
    payload = {'title': f'Tier fixture — {title_props}', 'slug': slug,
               'status': 'publish', 'content': content}
    if existing:
        out = rest(env, f'pages/{existing[0]["id"]}', payload, method='POST')
        print(f'updated page {out["id"]} → {out["link"]}')
    else:
        out = rest(env, 'pages', payload, method='POST')
        print(f'created page {out["id"]} → {out["link"]}')

    if args.manifest:
        data = json.loads(Path(args.manifest).read_text(encoding='utf-8'))
        data['page_id'] = out['id']
        data['url'] = out['link']
        Path(args.manifest).write_text(json.dumps(data, indent=2), encoding='utf-8')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
