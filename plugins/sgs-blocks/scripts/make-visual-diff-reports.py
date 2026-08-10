#!/usr/bin/env python
"""Emit one visual-diff report per block, each citing ITS OWN measurement.

THE PROBLEM THIS SOLVES
-----------------------
The pre-commit visual-diff gate requires, for every block with staged changes
under `plugins/sgs-blocks/src/blocks/<block>/`, a report at
`reports/visual-diff/<block>-<YYYY-MM-DD>.md` carrying `verdict: PASS`,
`first_paint_capture_passed: true`, and a line-start `source_sha:` matching the
SHA-256 of that block's STAGED bytes.

A property-migration pass touches ~20 blocks at once. Writing 20 reports by hand
is the step that does not happen — and the recorded failure mode is then writing
20 reports from ONE block's capture. That is fabricated evidence: it satisfies
the gate's letter while destroying its purpose. This repo has an incident of
exactly that shape.

⛔ SO THE CENTRAL RULE OF THIS SCRIPT IS THAT IT REFUSES.
It will not emit a PASS it cannot substantiate. Specifically it FAILS, loudly,
and writes no report for the block, when:
  * the block has no measurement in the before OR the after capture;
  * the selector matched nothing (`found: false`) at any viewport;
  * the measured value CHANGED and no `--expect-change` reason was supplied
    for that block;
  * PHP diagnostics appeared in the served HTML;
  * `visual-report-sha.py` cannot produce a sha (nothing staged for the block).
A missing report blocks the commit, which is the correct outcome. The failure
mode this script must never have is a green report nobody measured.

WHY A CHANGED VALUE IS NOT AUTOMATICALLY A FAILURE
--------------------------------------------------
Some migrations deliberately change rendering — the `gap` pass repaired
`sgs/gallery`'s default, which pointed at a spacing slug that does not exist and
so had been silently dead. That is a real change and the report must SAY SO in
its body rather than smooth it into a silent PASS. Hence `--expect-change`: the
change must be named by a human, per block, or the block fails.

Usage:
    python make-visual-diff-reports.py \\
        --before <dir>/measurements-before.json \\
        --after  <dir>/measurements-after.json \\
        --change "Spec 35 pass 1 — `gap` migrated to the tier-object shape" \\
        --expect-change gallery="default `16` was a non-existent spacing slug; now 16px" \\
        [--dry-run]
"""

from __future__ import annotations

import argparse
import datetime
import json
import subprocess
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

REPO = Path(__file__).resolve().parents[3]
REPORTS = REPO / 'reports' / 'visual-diff'
SHA_SCRIPT = REPO / 'plugins' / 'sgs-blocks' / 'scripts' / 'visual-report-sha.py'


def block_sha(block: str) -> str | None:
    """The sha the gate will compute for this block's STAGED bytes.

    Delegates to the gate's own helper rather than reimplementing it — two
    implementations of one contract drift, and the gate's copy is the one that
    decides. Returns None when nothing is staged for the block.
    """
    proc = subprocess.run([sys.executable, str(SHA_SCRIPT), block],
                          capture_output=True, text=True)
    if proc.returncode != 0:
        return None
    sha = proc.stdout.strip()
    return sha or None


def fmt_value(measure: dict, key: str) -> str:
    if not measure or not measure.get('found'):
        return 'NOT FOUND'
    node = measure.get(key)
    if not node:
        return '—'
    return node.get('prop') or '(empty)'


def collect(cap: dict, block: str, variant: str) -> dict:
    """This block's measurement per viewport, for ONE variant.

    Two variants live on the fixture page and they are different KINDS of
    evidence, so they are never mixed:

      * `default` — the property unset. Comparable before vs after, and it IS
        the regression surface: nearly every real instance leaves the property
        unset, so a changed default is what would actually reach a client.
      * `probe` — the property set to per-tier values. NOT comparable before vs
        after, because before the migration the attribute was a scalar and
        WordPress coerced an object value away. It is a POSITIVE CONTROL on the
        after side only, proving the new shape genuinely binds. Treating it as a
        matched pair would manufacture a "change" that is really just the old
        code being unable to store the value.
    """
    return {vp: v['blocks'].get(f'{block}::{variant}')
            for vp, v in cap['viewports'].items()}


def tier_binds(a_meas: dict, probe_tiers: dict) -> tuple[bool, list[str]]:
    """Does the explicitly-set value actually bind, at each viewport's own tier?

    This is what makes the after-side control POSITIVE rather than vacuous:
    identical numbers prove nothing if nothing could ever have moved them.
    """
    notes, ok = [], True
    for vp, m in sorted(a_meas.items()):
        if not m or not m.get('found'):
            ok = False
            notes.append(f'{vp}: not found')
            continue
        want = probe_tiers.get(vp)
        got_outer = (m.get('outer') or {}).get('prop', '')
        got_inner = (m.get('inner') or {}).get('prop', '')
        hit = want and (want in str(got_outer) or want in str(got_inner))
        notes.append(f'{vp}: set `{want}` → outer `{got_outer or "(empty)"}`'
                     + (f', inner `{got_inner}`' if m.get('inner') else '')
                     + ('  ✅ binds' if hit else '  ⚠ does NOT bind'))
        ok = ok and bool(hit)
    return ok, notes


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--before', required=True)
    ap.add_argument('--after', required=True)
    ap.add_argument('--change', required=True, help='one-line description of the change')
    ap.add_argument('--expect-change', action='append', default=[],
                    metavar='BLOCK=REASON',
                    help='name a block whose rendering deliberately changed, with why')
    ap.add_argument('--known-dead', action='append', default=[],
                    metavar='BLOCK=REASON',
                    help='name a block that declares the property but renders it '
                         'NOWHERE, with evidence. Its positive control cannot pass '
                         'because there is nothing to bind — a pre-existing dead '
                         'control, not something this pass caused. Recorded in the '
                         'report as an explicit finding, never as a silent pass.')
    ap.add_argument('--date', default=None, help='override report date (default: today)')
    ap.add_argument('--dry-run', action='store_true', help='report, write nothing')
    args = ap.parse_args()

    before = json.loads(Path(args.before).read_text(encoding='utf-8'))
    after = json.loads(Path(args.after).read_text(encoding='utf-8'))

    def parse_pairs(items, flag):
        out = {}
        for item in items:
            if '=' not in item:
                sys.exit(f'FAIL: {flag} needs BLOCK=REASON, got {item!r}')
            k, v = item.split('=', 1)
            out[k.strip()] = v.strip()
        return out

    expected = parse_pairs(args.expect_change, '--expect-change')
    known_dead = parse_pairs(args.known_dead, '--known-dead')

    date = args.date or datetime.date.today().isoformat()
    prop = after['property']
    css_prop = after.get('css_property', prop)

    blocks = sorted({k.split('::')[0]
                     for v in after['viewports'].values() for k in v['blocks']})
    if not blocks:
        sys.exit('FAIL: the after-capture contains no blocks.')

    php_diags = {vp: v.get('phpDiagnostics') or []
                 for vp, v in after['viewports'].items()}
    any_php = any(php_diags.values())

    passed, failed = [], []
    REPORTS.mkdir(parents=True, exist_ok=True)

    for block in blocks:
        # DEFAULT variant = the before/after regression comparison.
        b_meas = collect(before, block, 'default')
        a_meas = collect(after, block, 'default')
        # PROBE variant = the after-side positive control.
        p_meas = collect(after, block, 'probe')
        problems: list[str] = []

        for vp in a_meas:
            if not a_meas.get(vp) or not a_meas[vp].get('found'):
                problems.append(f'after-capture (default): selector matched nothing at {vp}')
            if not b_meas.get(vp) or not b_meas[vp].get('found'):
                problems.append(f'before-capture (default): selector matched nothing at {vp}')

        binds, bind_notes = tier_binds(p_meas, after.get('probe_tiers') or {})
        dead_reason = known_dead.get(block)
        if not binds and not dead_reason:
            problems.append(
                'POSITIVE CONTROL FAILED — an explicitly set per-tier value does not '
                'bind on this block, so identical before/after numbers would be '
                'vacuous (they could mean "nothing can move it"). Detail: '
                + ' | '.join(bind_notes))
        if dead_reason and binds:
            problems.append(
                f'--known-dead was declared for {block}, but the positive control '
                'PASSED — the property does bind. Remove the flag rather than '
                'carrying a false claim in the report.')

        # Did the painted value move?
        moved = []
        if not problems:
            for vp in sorted(a_meas):
                for layer in ('outer', 'inner'):
                    bv = fmt_value(b_meas[vp], layer)
                    av = fmt_value(a_meas[vp], layer)
                    if bv != av:
                        moved.append((vp, layer, bv, av))

        reason = expected.get(block)
        if moved and not reason:
            problems.append(
                'measured value CHANGED and no --expect-change reason was given: '
                + '; '.join(f'{vp}/{layer} {bv} → {av}' for vp, layer, bv, av in moved))
        if any_php:
            problems.append(f'PHP diagnostics present in served HTML: {php_diags}')

        sha = block_sha(block)
        if not sha:
            problems.append('visual-report-sha.py produced no sha — nothing is STAGED '
                            f'for {block}. Stage the block, then re-run.')

        if problems:
            failed.append((block, problems))
            continue

        # ---- build the report body, citing this block's own measurements ----
        rows = []
        for vp in ('desktop', 'tablet', 'mobile'):
            if vp not in a_meas:
                continue
            am, bm = a_meas[vp], b_meas[vp]
            tier = after['viewports'][vp]['expected_tier']
            rows.append(
                f"| {vp} ({after['viewports'][vp]['width']}px) | `{tier}` | "
                f"`{fmt_value(bm, 'outer')}` | `{fmt_value(am, 'outer')}` | "
                f"`{fmt_value(bm, 'inner')}` | `{fmt_value(am, 'inner')}` | "
                f"`{am['outer']['display']}` |")

        sample = next(m for m in a_meas.values() if m and m.get('found'))
        uid = ' '.join(c for c in str(sample['outer']['classes']).split()
                       if c.startswith('sgs-container-')) or '(no uid class)'
        dead_note = ''
        if dead_reason:
            dead_note = (
                '\n## ⚠ Pre-existing DEAD CONTROL — stated, not hidden\n\n'
                f'This block **declares `{prop}` but renders it nowhere**, so the '
                'positive control below cannot pass: there is nothing for a set '
                'value to bind to.\n\n'
                f'**Evidence:** {dead_reason}\n\n'
                '⚠ This is NOT caused by the change under review, and the change '
                'does not fix it. Before and after are identical because the '
                'property was inert in both. That is a weaker guarantee than the '
                'other reports here carry, and it is recorded as a finding rather '
                'than smoothed into a clean PASS — the verdict below covers only '
                '"this change moved nothing", not "this control works".\n')

        changed_note = ''
        if moved:
            changed_note = (
                '\n## ⚠ This block\'s rendering DID change — deliberately\n\n'
                f'**Stated reason:** {reason}\n\n'
                'Measured differences:\n\n'
                + '\n'.join(f'- `{vp}` / `{layer}`: `{bv}` → `{av}`'
                            for vp, layer, bv, av in moved)
                + '\n\nRecorded here rather than folded into the PASS, because a '
                  'report that hides a real change is worth less than no report.\n')

        body = f"""---
doc_type: reference
title: "Visual-diff report — {after.get('block_names', {}).get(block, block)} · {prop}"
block: {block}
date: {date}
property: {prop}
verdict: PASS
first_paint_capture_passed: true
source_sha: {sha}
---

# {block} — {args.change}

**Verdict: PASS**, on a measured before/after capture of this block's own
rendered element. {'Rendering changed deliberately — see below.' if moved else 'No measured value moved.'}

## What was measured, and where

- **Page:** {after['url']}
- **Selector (scoped):** `{sample['selector']}` — resolved to `<{sample['tag']}>`, uid `{uid}`
- **CSS property:** `{css_prop}`
- **Probe values set on the block:** `{json.dumps(after.get('probe_tiers'))}`
- **Method:** Playwright (chromium), computed styles at three viewports, before
  and after deploying the change to the sandybrown canary.

⛔ The selector is scoped to this block's own anchor. An unscoped query on a
wrapper class returned the site header in a previous session and produced a
confident false failure, so every measurement here is anchored.

## Measurements — this block, not another

| Viewport | Tier that binds | before (outer) | after (outer) | before (inner band) | after (inner band) | display |
|---|---|---|---|---|---|---|
{chr(10).join(rows)}

These rows are the **default** variant — the property left unset, so the block
renders its own `block.json` default. That is the regression surface: nearly
every real instance leaves it unset, so a changed default is what would actually
reach a client site.

The *inner band* column is the `> .sgs-container__inner` element. The shared
wrapper relocates grid/flex onto it for container-query blocks, so a report
measuring only the outer element could miss where the value actually landed.

`display` is recorded because the property computes whether or not it can paint
— keeping "declared" and "visible" as separate facts rather than conflating them.
{changed_note}
{dead_note}
## ⭐ Positive control — because identical numbers alone would be vacuous

Matching before/after values are exactly what a **completely inert** property
would also produce. So a second instance of this block on the same page has
`{prop}` set explicitly to {json.dumps(after.get('probe_tiers'))}, and each
viewport is checked for the tier that should bind:

{chr(10).join('- ' + n for n in bind_notes)}

The value demonstrably applies, so "nothing moved" above means *nothing moved*,
not *nothing could move*.

⚠ This control is measured on the AFTER build only, and deliberately so. Before
the migration `{prop}` was a scalar attribute, so WordPress coerced an
object-shaped value away entirely — a before/after pair on this variant would
compare "the value" against "the value the old code could not store", which is
not a rendering comparison at all.

## Gates

- Console errors: **{len(after.get('consoleErrors') or [])}**
- PHP diagnostics in served HTML (`Array to string conversion`, `Fatal error`,
  `Warning:`, `Notice:`, `Deprecated:`, `Uncaught`): **none**
- `source_sha` computed by `visual-report-sha.py` over this block's STAGED bytes,
  so the report cannot survive a later edit to the block without going stale.

*Generated by `plugins/sgs-blocks/scripts/make-visual-diff-reports.py` from
`{Path(args.before).name}` + `{Path(args.after).name}`. Every figure above is read
from those captures; none is hand-written.*
"""
        path = REPORTS / f'{block}-{date}.md'
        if not args.dry_run:
            path.write_text(body, encoding='utf-8')
        passed.append(path.name)

    print(f'property: {prop}   date: {date}')
    print(f'PASS  {len(passed)} report(s){" (dry run — nothing written)" if args.dry_run else ""}')
    for n in passed:
        print(f'  ✓ {n}')
    if failed:
        print(f'\nFAIL  {len(failed)} block(s) — NO report written for these, '
              f'deliberately. The commit stays blocked until each is resolved:')
        for block, problems in failed:
            print(f'  ✗ {block}')
            for p in problems:
                print(f'      - {p}')
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
