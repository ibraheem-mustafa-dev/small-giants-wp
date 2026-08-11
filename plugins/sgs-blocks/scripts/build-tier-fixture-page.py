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
PROBE_TIERS = {'desktop': '64px', 'tablet': '32px', 'mobile': '8px'}

# The ONLY structural knowledge in this file, and it is a WordPress fact rather
# than a per-block behaviour: a block declaring `parent` cannot sit at top level,
# so it is emitted inside that parent. Read from block.json, not assumed.
FALLBACK_INNER_TEXT = 'Tier fixture probe.'


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

    (a) NOT DECLARED — WordPress silently DISCARDS any attribute a block.json
        does not declare: no error, no warning, no failing build (D338, which
        found 45 live in shipped patterns). Writing one is dead weight that
        also trips the deploy's stored-content audit.

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
            attrs[prop] = dict(PROBE_TIERS)
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
                        f'every applicable property set to {PROBE_TIERS} '
                        '(the positive control).')
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
                manifest.append({'dir': c['dir'], 'name': c['name'], 'variant': variant,
                                 'properties': c['properties'],
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
            manifest.append({'dir': b['dir'], 'name': b['name'], 'variant': variant,
                             'properties': b['properties'],
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
    clash = {'name': 'sgs/clash', 'attrs': {'items': {'type': 'array'}},
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
    laid = {'name': 'sgs/laid', 'attrs': {'layout': {'type': 'string',
                                                     'enum': ['grid', 'flex']}}}
    ok('probe value survives the layout writer (write order holds)',
       payload_of(block_markup(laid, ['layout'], 'probe'))['layout'] == PROBE_TIERS)
    ok('layout is still set when it is NOT under test',
       payload_of(block_markup(laid, [], 'default')).get('layout') == 'grid')

    # 22. A HOST carries no properties and must still survive minimum-building
    #     (it has no `example` key at all in the record when block.json has none).
    hostless = {'name': 'sgs/hostless', 'attrs': {'a': {'type': 'string'}}}
    ok('a record with no example yields no minimums', render_minimums(hostless, []) == {})

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
    if skipped:
        print(f'SKIPPED ({len(skipped)}) — reported, not dropped:')
        for m in skipped:
            print(f"  - {m['name']}: {m['skipped']}")
    print(f'probe tiers: {PROBE_TIERS}')

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
