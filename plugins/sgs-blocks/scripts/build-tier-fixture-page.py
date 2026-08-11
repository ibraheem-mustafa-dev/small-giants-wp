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


# Typed blocks render from an attribute ARRAY, not from InnerBlocks, and emit
# nothing at all when it is empty (card-grid/render.php:522 `if ( empty( $items )
# ) return '';`). Minimal valid rows so the block renders and its gap has
# something to sit between. Read from block.json's own item schema.
TYPED_ITEMS = {
    'sgs/card-grid': ('items', [{'title': 'Fixture card 1', 'subtitle': 'One'},
                                {'title': 'Fixture card 2', 'subtitle': 'Two'}]),
}


def css_class(block_name: str) -> str:
    """`sgs/card-grid` → `.wp-block-sgs-card-grid` (WordPress's own convention)."""
    return '.wp-block-' + block_name.replace('/', '-')


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


def block_markup(blk: dict, props: list[str], variant: str, inner: str = '') -> str:
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
    attrs: dict = {}
    # `props` is empty for a HOST block — scaffolding that exists only so
    # WordPress will accept its child (a shell parent like sgs/site-header,
    # which does not own any target property at all). Without this guard the
    # probe variant would write nothing extra, which is already correct, but
    # the explicit empty-list check keeps the host path legible.
    if variant == 'probe' and props:
        for prop in props:
            attrs[prop] = dict(PROBE_TIERS)
    lay = layout_value(blk['attrs'])
    if lay:
        attrs['layout'] = lay
    typed = TYPED_ITEMS.get(blk['name'])
    if typed and typed[0] in blk['attrs']:
        attrs[typed[0]] = typed[1]
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
        return (f'{scope} {css_class(blk["name"])}',
                f'inside the anchored wrapper, nested in {parent["name"]}')
    return f'{scope} > {css_class(blk["name"])}', 'direct child of the anchored wrapper'


def build_content(props: list[str]) -> tuple[str, list[dict]]:
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
                inner += block_markup(c, c['properties'], variant, c_inner) + '\n'
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
            parts.append(wrap_anchored(block_markup(b, host_props, variant, inner.strip()),
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


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--property', required=True,
                    help='e.g. gap — or a comma-separated list for a batch pass, '
                         'e.g. fontSize,letterSpacing,lineHeight')
    ap.add_argument('--slug', default=None, help='page slug (default tier-fixture-<property>)')
    ap.add_argument('--dry-run', action='store_true', help='print the markup, publish nothing')
    ap.add_argument('--publish', action='store_true', help='create/update the page')
    ap.add_argument('--delete', metavar='ID', help='permanently delete a fixture page by id')
    ap.add_argument('--manifest', default=None, help='write the block manifest JSON here')
    args = ap.parse_args()

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

    content, manifest = build_content(props)
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

    env = load_env()
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
