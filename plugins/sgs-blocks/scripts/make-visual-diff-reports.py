#!/usr/bin/env python
"""Emit visual-diff reports, each citing ITS OWN measurement.

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
  * `visual-report-sha.py` cannot produce a sha (nothing staged for the block);
  * an explicitly-set probe value does not demonstrably bind (positive
    control), UNLESS a reason is on record for why it cannot — either a human
    `--known-dead`/`--removed-attr`, or the auto-derived grid-only inference
    below (Change 2). Anything else with a failed positive control still fails.
A missing report blocks the commit, which is the correct outcome. The failure
mode this script must never have is a green report nobody measured.

WHY A CHANGED VALUE IS NOT AUTOMATICALLY A FAILURE
--------------------------------------------------
Some migrations deliberately change rendering — the `gap` pass repaired
`sgs/gallery`'s default, which pointed at a spacing slug that does not exist and
so had been silently dead. That is a real change and the report must SAY SO in
its body rather than smooth it into a silent PASS. Hence `--expect-change`: the
change must be named by a human, per block, or the block fails.

CHANGE 1 (2026-08-11) — unchanged blocks collapse into one summary report
---------------------------------------------------------------------------
A 19-block pass produced 19 near-identical reports, ~15 of which said "nothing
moved". Every block still needs a report satisfying the gate's per-block
`source_sha` binding at `reports/visual-diff/<block>-<date>.md` (see
`.githooks/sgs-gates.sh` ~line 204 — it looks up that exact path per staged
block and reads `source_sha:` from it, so a per-block file at that path can
never be dropped). So a block that is CHANGED, or that carries a human-supplied
`--expect-change`/`--known-dead`/`--removed-attr` reason, still gets the full
per-block report exactly as before. A block that is genuinely UNCHANGED (or
whose non-binding control is auto-explained, see Change 2) instead gets:
  * a small per-block STUB at the same gate-required path, carrying the
    required frontmatter (`source_sha`, `verdict`, `first_paint_capture_passed`)
    PLUS that block's own mini measurement table, so the stub alone already
    proves it was not copied from a neighbour, and
  * one shared summary report where that block's numbers appear as a row,
    always read from that block's own `collect()` result — never from another
    block's. The failure mode this guards is documented and real: this
    reporting design exists because someone once wrote N reports from ONE
    block's capture. A summary row with no numbers of its own would be that
    failure in a new shape, so every row is built from `measurement_tuples()`
    called with THAT block's `a_meas`/`b_meas`, the same function the full
    report uses — one code path, not two hand-synced copies that can drift.
  * Gate-level facts (console errors, PHP diagnostics) are run-wide, not
    per-block, so they are stated ONCE in the summary rather than repeated in
    every stub — that's ceremony, not evidence, and cutting it doesn't weaken
    anything the gate reads.

CHANGE 2 (2026-08-11) — physically-inapplicable blocks are auto-derived
---------------------------------------------------------------------------
`grid-*` CSS properties (grid-template-columns, grid-template-rows, ...) only
take effect when the element's computed `display` is `grid`/`inline-grid` —
that is a fact about CSS, not a guess. `sgs/multi-button` renders
`display:flex`, so before this change every migration pass needed a
hand-written `--known-dead multi-button="..."` paragraph explaining the same
fact the capture already proved. Now: when the positive control fails to bind
AND the property is `grid-*` AND every captured element/viewport shows a
non-grid `display` (never `grid`/`inline-grid`, anywhere), the "why" is derived
from the measurement and recorded as a one-line fact — no prose required.

⚠ Deliberately narrow. If the property is not `grid-*`, or display was `grid`
at even ONE captured element/viewport, this stays silent and falls through to
the existing requirement for a human `--known-dead` reason. "Not proven grid
elsewhere" is not the same claim as "proven never grid" — see
`~/.claude/rules/prove-the-cause-before-fix.md`. Silently marking something
inapplicable when it is actually broken would be worse than asking for a
sentence, so this only fires on evidence that leaves no other explanation.

Usage:
    python make-visual-diff-reports.py \\
        --before <dir>/measurements-before.json \\
        --after  <dir>/measurements-after.json \\
        --change "Spec 35 pass 1 — `gap` migrated to the tier-object shape" \\
        --expect-change gallery="default `16` was a non-existent spacing slug; now 16px" \\
        [--out-dir <dir>]   # default: reports/visual-diff/ ; use for --self-test
                            # or any run whose output must NOT touch the real
                            # committed evidence directory.
        [--dry-run]         # report, write nothing at all
        [--self-test]       # run the built-in self-test and exit; no other
                            # flags required or read
"""

from __future__ import annotations

import argparse
import datetime
import json
import subprocess
import sys
import tempfile
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

_GRID_LAYOUT_DISPLAYS = {'grid', 'inline-grid'}


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


def node_prop(node: dict, prop_name: str | None) -> str:
    """One node's measured value for `prop_name`.

    BATCH MODE (D572): a capture now stores `propValues` — every property that
    block carries, keyed by ATTRIBUTE name — alongside the legacy scalar `prop`
    (the first property's value). Reading `propValues[prop_name]` is what lets
    one report cover a block like sgs/button, which carries 8 migrated
    properties in a single instance.

    ⛔ Falls back to `prop` ONLY when no name is supplied (a pre-batch capture).
    It must NEVER silently fall back when a NAME was given but is absent from
    propValues — that would report another property's value under this
    property's heading, which is the exact cross-contamination this whole
    pipeline exists to prevent. Absent-but-named returns '' so the caller's
    own "did it bind?" check fails loudly instead.
    """
    if prop_name is None:
        return node.get('prop') or ''
    return (node.get('propValues') or {}).get(prop_name, '')


def fmt_value(measure: dict, key: str, prop_name: str | None = None) -> str:
    if not measure or not measure.get('found'):
        return 'NOT FOUND'
    node = measure.get(key)
    if not node:
        return '—'
    return node_prop(node, prop_name) or '(empty)'


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


def tier_binds(a_meas: dict, probe_tiers: dict,
               prop_name: str | None = None,
               d_meas: dict | None = None) -> tuple[bool, list[str]]:
    """Does the explicitly-set value actually bind, at each viewport's own tier?

    This is what makes the after-side control POSITIVE rather than vacuous:
    identical numbers prove nothing if nothing could ever have moved them.

    TWO acceptance paths, because the question is "can this attribute move the
    rendered value?" — not "does the authored string equal the computed one":

      1. EXACT — the authored value appears in the computed value. Holds for
         any property whose authored form survives computation (`64px`).

      2. MOVED — the probe variant's computed value DIFFERS from the default
         variant's at the same viewport. ⚠ This is not a weaker test, it is the
         RIGHT test for every property whose authored form CANNOT survive
         computation, and there are many: `rotation: 64` renders
         `matrix(0.438371, 0.898794, …)`; `widthType: 'full'` renders `1200px`;
         `positionX: 64` (a percentage) renders `768px`; `splitContentOrder:
         'media-first'` renders `order: 0`. Every one of those binds perfectly
         and no authored string could ever match. Scoring them "does NOT bind"
         reported a fault in the CODE that was really a limit of the COMPARISON.

    The two fixture variants are byte-identical except for the probed
    properties, so a difference between them IS attributable to the property —
    which is what makes path 2 sound rather than merely convenient. Path 2
    needs the default-variant measurement; without it only path 1 applies, and
    the note says so rather than silently passing.
    """
    notes, ok = [], True
    d_meas = d_meas or {}
    for vp, m in sorted(a_meas.items()):
        if not m or not m.get('found'):
            ok = False
            notes.append(f'{vp}: not found')
            continue
        # PER-PROPERTY expected value first. `probe_tiers` is ONE length-shaped
        # dict ('64px'/'32px'/'8px') applied to every property in the batch —
        # correct only where the value IS a length. Since the fixture began
        # deriving a type-correct probe per property (a keyword for
        # `alignItems`, a bare number for `order`), comparing those against
        # '64px' reported "does NOT bind" for properties that bound perfectly.
        # Falls back to the flat dict for pre-existing captures that predate
        # per-property values, so an older measurements file still reads the
        # same as it did before.
        per_prop = (m.get('probe_values') or {}).get(prop_name) if prop_name else None
        want = (per_prop or {}).get(vp) if per_prop else probe_tiers.get(vp)
        got_outer = node_prop(m.get('outer') or {}, prop_name)
        got_inner = node_prop(m.get('inner') or {}, prop_name)
        # ⚠ `want` is str(...)-ed, not assumed to be a string. Since the fixture
        # began deriving type-correct probes it can be an INT (`order: 64`,
        # `rotation: 64`), and `int in str` raises TypeError — which would abort
        # the whole report run rather than mis-score one property.
        want_s = '' if want is None else str(want)
        exact = bool(want_s) and (want_s in str(got_outer) or want_s in str(got_inner))

        # Path 2 — did setting the property MOVE the rendered value?
        moved, how = False, 'exact'
        dm = d_meas.get(vp) if d_meas else None
        if not exact and dm and dm.get('found'):
            d_outer = node_prop(dm.get('outer') or {}, prop_name)
            d_inner = node_prop(dm.get('inner') or {}, prop_name)
            # Compared against the DEFAULT variant of the same block at the same
            # viewport. An empty probe reading is never a move: '' is what an
            # unresolvable measurement looks like, and treating it as evidence
            # is the blank-reading failure this pipeline exists to prevent.
            if str(got_outer) and str(got_outer) != str(d_outer):
                moved, how = True, f'moved from `{d_outer or "(empty)"}`'
            elif str(got_inner) and str(got_inner) != str(d_inner):
                moved, how = True, f'inner moved from `{d_inner or "(empty)"}`'

        hit = exact or moved
        why = ('  ✅ binds' if exact else
               f'  ✅ binds ({how} — authored form cannot survive computation)'
               if moved else
               '  ⚠ does NOT bind' + ('' if dm else ' (no default-variant measurement '
                                      'to compare against — exact match only)'))
        notes.append(f'{vp}: set `{want}` → outer `{got_outer or "(empty)"}`'
                     + (f', inner `{got_inner}`' if m.get('inner') else '') + why)
        ok = ok and bool(hit)
    return ok, notes


def is_grid_only_css_property(css_prop: str) -> bool:
    """`grid-*` properties (grid-template-columns, grid-auto-flow, ...) have no
    effect unless the element's computed `display` is `grid`/`inline-grid` —
    a CSS fact, not an inference about any particular block. Kept as a plain
    prefix check, not a hardcoded per-block list (R-31-1 in the parent
    project's CLAUDE.md): the claim is about the PROPERTY, and holds for any
    block the property is ever measured against.
    """
    return css_prop.startswith('grid-')


def measured_displays(measures: dict) -> list[str]:
    """Every `display` actually observed, across outer + inner, at every
    viewport where the selector matched. Empty means no evidence at all,
    which this script must never treat as proof of anything — callers check
    for that explicitly rather than letting an empty list vacuously satisfy
    "never grid"."""
    out = []
    for m in measures.values():
        if not m or not m.get('found'):
            continue
        for layer in ('outer', 'inner'):
            node = m.get(layer)
            if node and 'display' in node:
                out.append(node['display'])
    return out


def measurement_tuples(a_meas: dict, b_meas: dict, viewport_meta: dict,
                       prop_name: str | None = None) -> list[dict]:
    """The exact per-viewport figures every report (full OR stub OR summary
    row) is built from. Factored out so a stub's table, a full report's
    table, and a summary row are provably the SAME code path reading THAT
    block's `a_meas`/`b_meas` — never two hand-synced copies that can drift,
    and never a value that could have been copied from another block's call.

    `prop_name` selects WHICH migrated property to read (batch mode, D572).
    None reads the legacy scalar `prop`, so pre-batch captures are unaffected.
    """
    out = []
    for vp in ('desktop', 'tablet', 'mobile'):
        if vp not in a_meas:
            continue
        am, bm = a_meas[vp], b_meas[vp]
        out.append({
            'vp': vp,
            'prop_name': prop_name,
            'width': viewport_meta[vp]['width'],
            'tier': viewport_meta[vp]['expected_tier'],
            'before_outer': fmt_value(bm, 'outer', prop_name),
            'after_outer': fmt_value(am, 'outer', prop_name),
            'before_inner': fmt_value(bm, 'inner', prop_name),
            'after_inner': fmt_value(am, 'inner', prop_name),
            'display': am['outer']['display'],
        })
    return out


def rows_markdown(tuples: list[dict]) -> list[str]:
    """One markdown row per (property, viewport). In batch mode a block can
    carry several properties, so the property is named in its own leading
    column — otherwise 8 properties x 3 viewports would render as 24
    indistinguishable rows, which reads as evidence while proving nothing
    about WHICH property each figure belongs to."""
    return [
        (f"| `{t['prop_name']}` " if t.get('prop_name') else '| ')
        + f"| {t['vp']} ({t['width']}px) | `{t['tier']}` | "
        f"`{t['before_outer']}` | `{t['after_outer']}` | "
        f"`{t['before_inner']}` | `{t['after_inner']}` | `{t['display']}` |"
        for t in tuples
    ]


def sample_and_uid(a_meas: dict) -> tuple[dict, str]:
    sample = next(m for m in a_meas.values() if m and m.get('found'))
    uid = ' '.join(c for c in str(sample['outer']['classes']).split()
                   if c.startswith('sgs-container-')) or '(no uid class)'
    return sample, uid


def generate_reports(before: dict, after: dict, change: str, expected: dict,
                     known_dead: dict, removed_attr: dict, date: str,
                     out_dir: Path, dry_run: bool, sha_fn=block_sha) -> dict:
    """The core generation loop. Pulled out of `main()` so `--self-test` can
    call it directly against synthetic captures with a fake `sha_fn` — no
    subprocess, no dependency on anything actually being staged in THIS repo's
    git index. Real CLI usage passes the real `block_sha` (the default) and
    never notices the seam.

    Returns {'passed': [...filenames...], 'failed': [(block, [problems])...],
    'summary_path': Path|None}.
    """
    # BATCH MODE (D572): a capture may carry MANY properties. `properties` is
    # the list form; `property` is the single-property form kept for captures
    # that predate batch mode. Each BLOCK measures only its own subset — a
    # 41-property pass does not mean every block has 41 (sgs/button has 8,
    # sgs/heading 1), and asking a block for a property it never declared
    # would read the browser's initial value and record it as evidence.
    all_props = after.get('properties') or (
        [after['property']] if after.get('property') else [])
    if not all_props:
        sys.exit('FAIL: the after-capture declares neither `properties` nor `property`.')
    css_props = after.get('css_properties') or {
        all_props[0]: after.get('css_property', all_props[0])}
    # Single-property captures keep prop_name=None so they read the legacy
    # scalar `prop` key exactly as before — pre-batch captures are untouched.
    batch_mode = len(all_props) > 1 or bool(after.get('properties'))
    prop = ', '.join(all_props)
    css_prop = ', '.join(css_props.get(p, p) for p in all_props)

    blocks = sorted({k.split('::')[0]
                     for v in after['viewports'].values() for k in v['blocks']})
    if not blocks:
        sys.exit('FAIL: the after-capture contains no blocks.')

    php_diags = {vp: v.get('phpDiagnostics') or []
                 for vp, v in after['viewports'].items()}
    any_php = any(php_diags.values())

    passed: list[str] = []
    failed: list[tuple[str, list[str]]] = []
    summary_rows: list[dict] = []  # one entry per collapsed (unchanged) block
    if not dry_run:
        out_dir.mkdir(parents=True, exist_ok=True)

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

        # Which properties does THIS block actually carry? The capture records
        # it per block; fall back to the whole list for a pre-batch capture.
        sample_m = next((m for m in a_meas.values() if m), None) or {}
        block_props = sample_m.get('properties') or all_props
        # prop_name=None preserves the exact pre-batch read path.
        prop_names = block_props if batch_mode else [None]

        dead_reason = known_dead.get(block)          # human-declared (CLI flag)
        removed_reason = removed_attr.get(block)      # human-declared (CLI flag)
        auto_dead_reason = None                        # Change 2: derived, not typed

        # EVERY property this block carries must bind, and each is checked
        # SEPARATELY — a batch where one property silently fails to bind while
        # 7 others pass is exactly the "looks measured, proves less than it
        # appears" failure the positive control exists to catch. The block
        # fails if ANY of its properties fails.
        binds = True
        bind_notes: list[str] = []
        per_prop_binds: dict[str | None, bool] = {}
        for pn in prop_names:
            p_ok, p_notes = tier_binds(p_meas, after.get('probe_tiers') or {}, pn,
                                       a_meas)
            per_prop_binds[pn] = p_ok
            binds = binds and p_ok
            label = f'`{pn}` ' if pn else ''
            bind_notes.extend(f'{label}{n}' for n in p_notes)

        if removed_reason:
            # The property was DELETED. A positive control is not merely absent,
            # it is meaningless — there is deliberately nothing left to bind.
            binds, dead_reason = True, None
        if not binds and not dead_reason and not removed_reason:
            # Change 2 — try to derive the "why" before demanding a sentence.
            # Only fires on proof (see module docstring): EVERY non-binding
            # property is grid-only AND every captured element/viewport shows
            # non-grid display. A batch block whose failures are NOT all
            # grid-only still demands a human sentence, as before.
            displays = measured_displays(p_meas)
            failing = [pn for pn, ok in per_prop_binds.items() if not ok]
            failing_css = [css_props.get(pn, pn) if pn else css_prop for pn in failing]
            if (failing_css and all(is_grid_only_css_property(c) for c in failing_css)
                    and displays and not (set(displays) & _GRID_LAYOUT_DISPLAYS)):
                seen = '/'.join(sorted(set(displays)))
                auto_dead_reason = (
                    f'auto-derived: measured `display` is `{seen}` at every '
                    f'element and viewport captured — never `grid` or '
                    f'`inline-grid` — and {", ".join(f"`{c}`" for c in failing_css)} '
                    'only take effect under grid layout, so they cannot apply '
                    'here by construction. ' + ' | '.join(bind_notes))
            if not auto_dead_reason:
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

        # Did the painted value move? Checked per property, so a change in ONE
        # of a block's 8 properties can never be masked by the other 7 matching.
        moved = []
        if not problems:
            for pn in prop_names:
                for vp in sorted(a_meas):
                    for layer in ('outer', 'inner'):
                        bv = fmt_value(b_meas[vp], layer, pn)
                        av = fmt_value(a_meas[vp], layer, pn)
                        if bv != av:
                            moved.append((f'{pn}/{vp}' if pn else vp, layer, bv, av))

        reason = expected.get(block)
        if moved and not reason:
            problems.append(
                'measured value CHANGED and no --expect-change reason was given: '
                + '; '.join(f'{vp}/{layer} {bv} → {av}' for vp, layer, bv, av in moved))
        if any_php:
            problems.append(f'PHP diagnostics present in served HTML: {php_diags}')

        sha = sha_fn(block)
        if not sha:
            problems.append('visual-report-sha.py produced no sha — nothing is STAGED '
                            f'for {block}. Stage the block, then re-run.')

        if problems:
            failed.append((block, problems))
            continue

        # One tuple set PER PROPERTY this block carries, concatenated. Built
        # from the same measurement_tuples() the stub and summary row use, so
        # a block's figures can never come from another block's call.
        tuples = []
        for pn in prop_names:
            tuples.extend(measurement_tuples(a_meas, b_meas, after['viewports'], pn))
        sample, uid = sample_and_uid(a_meas)
        block_title = after.get('block_names', {}).get(block, block)

        # A block is CHANGED, or carries a human-supplied reason (--expect-
        # change / --known-dead / --removed-attr), keeps its own full report
        # exactly as before Change 1 — those are the interesting cases a
        # reader needs the whole page for. Everything else (nothing moved,
        # including a block whose non-binding control Change 2 just explained
        # for free) collapses: gate-satisfying stub + one summary row.
        explained_by_human = bool(dead_reason or removed_reason)
        if moved or explained_by_human:
            path = _write_full_report(
                out_dir, block, block_title, date, prop, css_prop, change, sha,
                after, sample, uid, tuples, moved, reason, dead_reason,
                removed_reason, dry_run)
            passed.append(path.name)
        else:
            note = auto_dead_reason or ''
            path = _write_stub_report(
                out_dir, block, block_title, date, prop, sha, tuples, note,
                dry_run)
            passed.append(path.name)
            summary_rows.append({
                'block': block, 'title': block_title, 'selector': sample['selector'],
                'tuples': tuples, 'note': note,
            })

    summary_path = None
    if summary_rows:
        summary_path = _write_summary_report(
            out_dir, prop, css_prop, date, change, after, any_php, php_diags,
            summary_rows, dry_run)

    return {'passed': passed, 'failed': failed, 'summary_path': summary_path}


def _write_full_report(out_dir, block, block_title, date, prop, css_prop,
                       change, sha, after, sample, uid, tuples, moved, reason,
                       dead_reason, removed_reason, dry_run) -> Path:
    """Unchanged from the pre-Change-1 report body (same sections, same
    wording) — this is the "keeps its own full report exactly as now" path
    the trim brief requires for anything CHANGED or human-explained."""
    rows = rows_markdown(tuples)

    dead_note = ''
    if removed_reason:
        dead_note = (
            f'\n## The `{prop}` attribute was REMOVED from this block\n\n'
            f'**Why:** {removed_reason}\n\n'
            'The measurements below are therefore a check that removing it '
            'changed nothing — which is the whole claim. There is no positive '
            'control and there cannot be one: the property no longer exists on '
            'this block, so nothing could bind it. That is the intended end '
            'state, not a gap in the evidence.\n\n'
            '⚠ Stated plainly because identical numbers are also what a BROKEN '
            'capture produces: the deployed `block.json` was fetched over HTTP '
            'after the deploy and confirmed to no longer declare the attribute, '
            'BEFORE these measurements were trusted. An earlier run of this same '
            'change captured "after" against a deploy that had silently aborted, '
            'and it looked identical too.\n')
    elif dead_reason:
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

    positive_control = '' if removed_reason else (
        '\n## ⭐ Positive control — because identical numbers alone would be vacuous\n\n'
        'Matching before/after values are exactly what a **completely inert**\n'
        'property would also produce. So a second instance of this block on the\n'
        f'same page has `{prop}` set explicitly to '
        f'{json.dumps(after.get("probe_tiers"))}, and each viewport is checked\n'
        'for the tier that should bind:\n\n'
        + '\n'.join('- ' + n for n in tier_binds(
            collect(after, block, 'probe'), after.get('probe_tiers') or {},
            None, collect(after, block, 'default'))[1])
        + '\n\nThe value demonstrably applies, so "nothing moved" above means\n'
          '*nothing moved*, not *nothing could move*.\n\n'
          '⚠ This control is measured on the AFTER build only, and deliberately\n'
          f'so. Before the migration `{prop}` was a scalar attribute, so WordPress\n'
          'coerced an object-shaped value away entirely — a before/after pair on\n'
          'this variant would compare "the value" against "the value the old code\n'
          'could not store", which is not a rendering comparison at all.\n')

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
title: "Visual-diff report — {block_title} · {prop}"
block: {block}
date: {date}
property: {prop}
verdict: PASS
first_paint_capture_passed: true
source_sha: {sha}
---

# {block} — {change}

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

| Property | Viewport | Tier that binds | before (outer) | after (outer) | before (inner band) | after (inner band) | display |
|---|---|---|---|---|---|---|---|
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
{dead_note}{positive_control}
## Gates

- Console errors: **{len(after.get('consoleErrors') or [])}**
- PHP diagnostics in served HTML (`Array to string conversion`, `Fatal error`,
  `Warning:`, `Notice:`, `Deprecated:`, `Uncaught`): **none**
- `source_sha` computed by `visual-report-sha.py` over this block's STAGED bytes,
  so the report cannot survive a later edit to the block without going stale.

*Generated by `plugins/sgs-blocks/scripts/make-visual-diff-reports.py`. Every
figure above is read from the before/after captures; none is hand-written.*
"""
    path = out_dir / f'{block}-{date}.md'
    if not dry_run:
        path.write_text(body, encoding='utf-8')
    return path


def _write_stub_report(out_dir, block, block_title, date, prop, sha, tuples,
                       note, dry_run) -> Path:
    """Change 1's per-block file for an UNCHANGED block. Still satisfies the
    gate at the exact path it reads (`<block>-<date>.md`, `verdict: PASS`,
    `first_paint_capture_passed: true`, matching `source_sha:`) — see
    `.githooks/sgs-gates.sh` ~line 204. Carries this block's OWN mini
    measurement table (built by the same `measurement_tuples()` the full
    report uses) so the stub is self-evidently grounded in THIS block's
    capture even before a reader follows the link into the summary.
    """
    rows = rows_markdown(tuples)
    note_block = f'\n**Auto-derived finding:** {note}\n' if note else ''
    body = f"""---
doc_type: reference
title: "Visual-diff report — {block_title} · {prop}"
block: {block}
date: {date}
property: {prop}
verdict: PASS
first_paint_capture_passed: true
source_sha: {sha}
---

# {block} — unchanged

**Verdict: PASS.** No measured value moved for this block, so the full report
was collapsed into the shared summary (Change 1, 2026-08-11) — this stub still
carries this block's own numbers below, and exists in full so the pre-commit
gate's per-block `source_sha` binding is never dropped.
{note_block}
| Property | Viewport | Tier that binds | before (outer) | after (outer) | before (inner band) | after (inner band) | display |
|---|---|---|---|---|---|---|---|
{chr(10).join(rows)}

Full context (page, selector, probe values, gate totals) for this run:
`unchanged-summary-{prop}-{date}.md#{block}`.
"""
    path = out_dir / f'{block}-{date}.md'
    if not dry_run:
        path.write_text(body, encoding='utf-8')
    return path


def _write_summary_report(out_dir, prop, css_prop, date, change, after,
                          any_php, php_diags, summary_rows, dry_run) -> Path:
    """One report per run for every block that needed no story. Each block
    gets its own `##` heading (the stub's link target) and its own table rows
    built from ITS OWN `tuples` — never a value borrowed from another block's
    capture. See module docstring Change 1 for why that guarantee is the
    entire point of this function existing.
    """
    sections = []
    for row in summary_rows:
        rows = rows_markdown(row['tuples'])
        note_line = f"\n**Auto-derived finding:** {row['note']}\n" if row['note'] else ''
        sections.append(
            f"### {row['block']}\n\n"
            f"- **Selector:** `{row['selector']}`\n"
            f"{note_line}\n"
            '| Property | Viewport | Tier that binds | before (outer) | after (outer) | '
            'before (inner band) | after (inner band) | display |\n'
            '|---|---|---|---|---|---|---|---|\n'
            + chr(10).join(rows) + '\n')

    body = f"""---
doc_type: reference
title: "Visual-diff summary (unchanged blocks) — {prop}"
date: {date}
property: {prop}
verdict: PASS
blocks: {len(summary_rows)}
---

# Unchanged blocks — {change}

**{len(summary_rows)} block(s)** measured no rendering change for `{prop}`
(`{css_prop}`) and needed no human explanation (or Change 2 auto-derived one).
Each has its own gate-satisfying stub at `<block>-{date}.md`; this file is
where the per-block figures those stubs point to actually live, so the
evidence stays per-block even though the boilerplate does not repeat.

- **Page:** {after['url']}
- **Probe values set on the block:** `{json.dumps(after.get('probe_tiers'))}`
- **Method:** Playwright (chromium), computed styles at three viewports, before
  and after deploying the change to the sandybrown canary.
- **Console errors:** {len(after.get('consoleErrors') or [])}
- **PHP diagnostics in served HTML:** {'none' if not any_php else php_diags}

⛔ Every selector below is scoped to that block's own anchor — see the sibling
full reports' note on why an unscoped wrapper-class query is unsafe.

{chr(10).join(sections)}
*Generated by `plugins/sgs-blocks/scripts/make-visual-diff-reports.py`. Every
figure above is read from the before/after captures, per block; none is
hand-written or copied between sections.*
"""
    path = out_dir / f'unchanged-summary-{prop}-{date}.md'
    if not dry_run:
        path.write_text(body, encoding='utf-8')
    return path


def parse_pairs(items, flag):
    out = {}
    for item in items:
        if '=' not in item:
            sys.exit(f'FAIL: {flag} needs BLOCK=REASON, got {item!r}')
        k, v = item.split('=', 1)
        out[k.strip()] = v.strip()
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--before')
    ap.add_argument('--after')
    ap.add_argument('--change', help='one-line description of the change')
    ap.add_argument('--expect-change', action='append', default=[],
                    metavar='BLOCK=REASON',
                    help='name a block whose rendering deliberately changed, with why')
    ap.add_argument('--removed-attr', action='append', default=[],
                    metavar='BLOCK=REASON',
                    help='name a block from which the property was DELETED, with '
                         'evidence that it rendered nowhere. No positive control is '
                         'possible or meaningful — there is deliberately nothing '
                         'left to bind. Distinct from --known-dead, which is for an '
                         'attribute that still exists but is inert.')
    ap.add_argument('--known-dead', action='append', default=[],
                    metavar='BLOCK=REASON',
                    help='name a block that declares the property but renders it '
                         'NOWHERE, with evidence. Its positive control cannot pass '
                         'because there is nothing to bind — a pre-existing dead '
                         'control, not something this pass caused. Recorded in the '
                         'report as an explicit finding, never as a silent pass. '
                         'Only needed when Change 2 cannot auto-derive the same '
                         'fact — see module docstring.')
    ap.add_argument('--date', default=None, help='override report date (default: today)')
    ap.add_argument('--out-dir', default=None,
                    help='write reports here instead of reports/visual-diff/. '
                         'Use for verification runs so real committed evidence '
                         'is never touched.')
    ap.add_argument('--dry-run', action='store_true', help='report, write nothing')
    ap.add_argument('--self-test', action='store_true',
                    help='run the built-in self-test and exit; ignores every '
                         'other flag')
    args = ap.parse_args()

    if args.self_test:
        return self_test()

    if not (args.before and args.after and args.change):
        ap.error('--before, --after and --change are required unless --self-test')

    before = json.loads(Path(args.before).read_text(encoding='utf-8'))
    after = json.loads(Path(args.after).read_text(encoding='utf-8'))

    expected = parse_pairs(args.expect_change, '--expect-change')
    known_dead = parse_pairs(args.known_dead, '--known-dead')
    removed_attr = parse_pairs(args.removed_attr, '--removed-attr')
    both = set(known_dead) & set(removed_attr)
    if both:
        sys.exit(f'FAIL: {sorted(both)} given as BOTH --known-dead and '
                 '--removed-attr. An attribute cannot simultaneously still exist '
                 'and have been deleted; pick the one that is true.')

    date = args.date or datetime.date.today().isoformat()
    out_dir = Path(args.out_dir) if args.out_dir else REPORTS

    result = generate_reports(before, after, args.change, expected, known_dead,
                              removed_attr, date, out_dir, args.dry_run)
    passed, failed = result['passed'], result['failed']

    # ⚠ `properties` first, and NEVER a bare `after['property']`. A batch
    # capture omits `property` entirely (capture-tier-fixture.py keeps it only
    # when the run is single-property), so the direct subscript raised
    # KeyError here — AFTER every report had been written, turning a completed
    # run into a traceback and hiding its real pass/fail. Every other read in
    # this file already used this fallback; this one line did not.
    props_label = ', '.join(after.get('properties')
                            or ([after['property']] if after.get('property') else [])) or '(none)'
    print(f"property: {props_label}   date: {date}")
    print(f'PASS  {len(passed)} report(s){" (dry run — nothing written)" if args.dry_run else ""}')
    for n in passed:
        print(f'  ✓ {n}')
    if result['summary_path']:
        print(f"  (unchanged blocks summarised in {result['summary_path'].name})")
    if failed:
        print(f'\nFAIL  {len(failed)} block(s) — NO report written for these, '
              f'deliberately. The commit stays blocked until each is resolved:')
        for block, problems in failed:
            print(f'  ✗ {block}')
            for p in problems:
                print(f'      - {p}')
        return 1
    return 0


# ---------------------------------------------------------------------------
# SELF-TEST
# ---------------------------------------------------------------------------
# Proves the load-bearing behaviours survive this rewrite. Runs entirely
# against synthetic captures in a temp directory — never touches the real
# `reports/visual-diff/` (that holds today's committed evidence) and never
# depends on anything actually being staged in this repo's git index, because
# `sha_fn` is swapped for a deterministic fake. Four assertions, matching the
# four behaviours the trim brief named as load-bearing:
#   1. a block whose probe value does NOT bind still FAILS
#      (a) when the property isn't grid-only, Change 2 can't rescue it
#      (b) when the property IS grid-only but `grid` display was seen at
#          least once, Change 2 must NOT auto-derive — still FAILS
#   2. a block whose measurement CHANGED with no reason supplied still FAILS
#   3. an unchanged block's summary row carries THAT block's OWN numbers —
#      built from two blocks with deliberately different values, checked
#      that neither's numbers leak into the other's row
#   4. Change 2 itself: grid-only property, display never grid anywhere,
#      control fails to bind, NO --known-dead given → still PASSES, and the
#      auto-derived note actually explains why
_VIEWPORT_META = {
    'desktop': {'width': 1440, 'expected_tier': 'desktop', 'phpDiagnostics': []},
    'tablet': {'width': 900, 'expected_tier': 'tablet', 'phpDiagnostics': []},
    'mobile': {'width': 390, 'expected_tier': 'mobile', 'phpDiagnostics': []},
}


def _node(prop: str, display: str, inner_prop: str | None = None,
          inner_display: str | None = None) -> dict:
    n = {
        'found': True,
        'selector': '#test .wp-block-sgs-widget',
        'tag': 'div',
        'outer': {'classes': 'sgs-container sgs-container-abc123', 'prop': prop,
                  'display': display},
    }
    if inner_prop is not None:
        n['inner'] = {'classes': 'sgs-container__inner', 'prop': inner_prop,
                      'display': inner_display or 'block'}
    return n


def _capture(property_name: str, css_property: str, probe_tiers: dict,
            blocks_per_vp: dict) -> dict:
    """`blocks_per_vp`: {'name::variant': {'desktop': node, 'tablet': node,
    'mobile': node}}"""
    viewports = {}
    for vp, meta in _VIEWPORT_META.items():
        viewports[vp] = dict(meta, blocks={
            key: per_vp[vp] for key, per_vp in blocks_per_vp.items()
        })
    return {
        'label': 'self-test', 'url': 'http://self-test.invalid',
        'property': property_name, 'css_property': css_property,
        'probe_tiers': probe_tiers, 'viewports': viewports, 'consoleErrors': [],
    }


def _same_all_vps(node: dict) -> dict:
    return {'desktop': node, 'tablet': node, 'mobile': node}


def _multi_node(prop_values: dict, display: str, properties: list[str]) -> dict:
    """A node carrying SEVERAL migrated properties (batch mode, D572) — the
    sgs/button shape, which has 8. `prop_values` maps attribute name → measured
    value, exactly as capture-tier-fixture.py records in `propValues`."""
    return {
        'found': True,
        'selector': '#test .wp-block-sgs-widget',
        'tag': 'div',
        'properties': properties,
        'outer': {'classes': 'sgs-container sgs-container-abc123',
                  'prop': next(iter(prop_values.values()), ''),
                  'propValues': dict(prop_values),
                  'display': display},
    }


def _batch_capture(properties: list[str], css_properties: dict,
                   probe_tiers: dict, blocks_per_vp: dict) -> dict:
    viewports = {}
    for vp, meta in _VIEWPORT_META.items():
        viewports[vp] = dict(meta, blocks={
            key: per_vp[vp] for key, per_vp in blocks_per_vp.items()
        })
    return {
        'label': 'self-test', 'url': 'http://self-test.invalid',
        'properties': properties, 'css_properties': css_properties,
        'probe_tiers': probe_tiers, 'viewports': viewports, 'consoleErrors': [],
    }


def _fake_sha(block: str) -> str:
    return f'testsha-{block}'


def self_test() -> int:
    ok = True

    def check(label: str, cond: bool):
        nonlocal ok
        print(f"  {'✓' if cond else '✗'} {label}")
        if not cond:
            ok = False

    tmp = Path(tempfile.mkdtemp(prefix='visual-diff-selftest-'))
    print(f'--self-test: writing synthetic reports under {tmp}')

    # ---- Assertion 1a: non-bind, non-grid property, no flag -> FAILS ------
    before1 = _capture('columnGap', 'column-gap', {'desktop': '4px', 'tablet': '4px', 'mobile': '4px'}, {
        'widget-a::default': _same_all_vps(_node('16px', 'grid')),
    })
    after1 = _capture('columnGap', 'column-gap', {'desktop': '64px', 'tablet': '32px', 'mobile': '8px'}, {
        'widget-a::default': _same_all_vps(_node('16px', 'grid')),
        'widget-a::probe': _same_all_vps(_node('16px', 'grid')),  # never reflects the probe value
    })
    r1 = generate_reports(before1, after1, 'self-test 1a', {}, {}, {}, '2026-01-01',
                          tmp, dry_run=False, sha_fn=_fake_sha)
    check('1a: non-grid property, control never binds, no flag -> FAILS',
          any(b == 'widget-a' for b, _ in r1['failed']))

    # ---- Assertion 1b: grid-only property, but `grid` WAS seen once -------
    # -> Change 2 must NOT auto-derive (not proven "never grid") -> FAILS.
    mixed = {
        'desktop': _node('none', 'grid'),   # grid seen here
        'tablet': _node('none', 'flex'),
        'mobile': _node('none', 'flex'),
    }
    before1b = _capture('gridTemplateRows', 'grid-template-rows', {'desktop': '64px', 'tablet': '32px', 'mobile': '8px'}, {
        'widget-b::default': _same_all_vps(_node('none', 'flex')),
    })
    after1b = _capture('gridTemplateRows', 'grid-template-rows', {'desktop': '64px', 'tablet': '32px', 'mobile': '8px'}, {
        'widget-b::default': _same_all_vps(_node('none', 'flex')),
        'widget-b::probe': mixed,
    })
    r1b = generate_reports(before1b, after1b, 'self-test 1b', {}, {}, {}, '2026-01-01',
                           tmp, dry_run=False, sha_fn=_fake_sha)
    check('1b: grid-only property but `grid` seen once -> auto-derive stays '
          'silent, still FAILS (not proven "never grid")',
          any(b == 'widget-b' for b, _ in r1b['failed']))

    # ---- Assertion 2: measured value CHANGED, no --expect-change -> FAILS -
    # Probe must be tier-matched (like Assertion 3's fix below) so the ONLY
    # thing that can fail this block is the moved-with-no-reason check —
    # otherwise a false positive-control failure would mask whether this
    # specific check still works.
    _probe_per_vp_2 = {
        'desktop': _node('64px', 'grid'),
        'tablet': _node('32px', 'grid'),
        'mobile': _node('8px', 'grid'),
    }
    before2 = _capture('gap', 'gap', {'desktop': '64px', 'tablet': '32px', 'mobile': '8px'}, {
        'widget-c::default': _same_all_vps(_node('8px', 'grid')),
        'widget-c::probe': dict(_probe_per_vp_2),
    })
    after2 = _capture('gap', 'gap', {'desktop': '64px', 'tablet': '32px', 'mobile': '8px'}, {
        'widget-c::default': _same_all_vps(_node('16px', 'grid')),  # moved: 8px -> 16px
        'widget-c::probe': dict(_probe_per_vp_2),
    })
    r2 = generate_reports(before2, after2, 'self-test 2', {}, {}, {}, '2026-01-01',
                          tmp, dry_run=False, sha_fn=_fake_sha)
    check('2: measured value changed, no --expect-change -> FAILS',
          any(b == 'widget-c' for b, _ in r2['failed']))

    # ---- Assertion 3: unchanged blocks' summary rows carry THEIR OWN numbers
    # Probe nodes must report the TIER-MATCHED value per viewport (tier_binds
    # checks each viewport against its own probe_tiers entry), so each
    # viewport gets its own node rather than one node reused for all three.
    _probe_per_vp = {
        'desktop': _node('64px', 'block'),
        'tablet': _node('32px', 'block'),
        'mobile': _node('8px', 'block'),
    }
    before3 = _capture('maxWidth', 'max-width', {'desktop': '64px', 'tablet': '32px', 'mobile': '8px'}, {
        'alpha::default': _same_all_vps(_node('999px', 'block')),
        'alpha::probe': dict(_probe_per_vp),
        'bravo::default': _same_all_vps(_node('111px', 'block')),
        'bravo::probe': dict(_probe_per_vp),
    })
    after3 = _capture('maxWidth', 'max-width', {'desktop': '64px', 'tablet': '32px', 'mobile': '8px'}, {
        'alpha::default': _same_all_vps(_node('999px', 'block')),  # unchanged
        'alpha::probe': dict(_probe_per_vp),
        'bravo::default': _same_all_vps(_node('111px', 'block')),  # unchanged, DIFFERENT value
        'bravo::probe': dict(_probe_per_vp),
    })
    r3 = generate_reports(before3, after3, 'self-test 3', {}, {}, {}, '2026-01-01',
                          tmp, dry_run=False, sha_fn=_fake_sha)
    check('3: both widgets pass (nothing moved, controls bind)', not r3['failed'])
    check('3: exactly one summary report written', r3['summary_path'] is not None)
    if r3['summary_path'] is not None:
        summary_text = r3['summary_path'].read_text(encoding='utf-8')
        alpha_stub = (tmp / 'alpha-2026-01-01.md').read_text(encoding='utf-8')
        bravo_stub = (tmp / 'bravo-2026-01-01.md').read_text(encoding='utf-8')
        check('3: summary carries alpha`s own 999px, not bravo`s',
              '999px' in summary_text.split('### bravo')[0] if '### bravo' in summary_text else '999px' in summary_text)
        check('3: summary carries bravo`s own 111px under the bravo section',
              '111px' in summary_text.split('### bravo')[1] if '### bravo' in summary_text else False)
        check('3: bravo section of summary does NOT contain alpha`s 999px',
              '999px' not in summary_text.split('### bravo')[1] if '### bravo' in summary_text else False)
        check('3: alpha`s own stub cites 999px', '999px' in alpha_stub)
        check('3: alpha`s own stub does NOT cite bravo`s 111px', '111px' not in alpha_stub)
        check('3: bravo`s own stub cites 111px', '111px' in bravo_stub)
        check('3: bravo`s own stub does NOT cite alpha`s 999px', '999px' not in bravo_stub)

    # ---- Assertion 4: Change 2 auto-derives, no --known-dead needed -------
    before4 = _capture('gridTemplateColumns', 'grid-template-columns',
                       {'desktop': '64px', 'tablet': '32px', 'mobile': '8px'}, {
        'gridonly-dead::default': _same_all_vps(_node('none', 'flex')),
    })
    after4 = _capture('gridTemplateColumns', 'grid-template-columns',
                      {'desktop': '64px', 'tablet': '32px', 'mobile': '8px'}, {
        'gridonly-dead::default': _same_all_vps(_node('none', 'flex')),
        # probe never reflects the set value at ANY viewport, and display is
        # `flex` everywhere it was captured -> Change 2 should fire.
        'gridonly-dead::probe': _same_all_vps(_node('none', 'flex')),
    })
    r4 = generate_reports(before4, after4, 'self-test 4', {}, {}, {}, '2026-01-01',
                          tmp, dry_run=False, sha_fn=_fake_sha)
    check('4: grid-only prop, display never grid, no --known-dead -> still PASSES',
          not any(b == 'gridonly-dead' for b, _ in r4['failed'])
          and 'gridonly-dead-2026-01-01.md' in r4['passed'])
    if 'gridonly-dead-2026-01-01.md' in r4['passed']:
        stub4 = (tmp / 'gridonly-dead-2026-01-01.md').read_text(encoding='utf-8')
        check('4: stub states the auto-derived reason (mentions `flex` and `grid-only`/`grid layout`)',
              'auto-derived' in stub4 and 'flex' in stub4)

    # ---- 5. BATCH MODE (D572) -------------------------------------------
    # A block carrying SEVERAL migrated properties in ONE instance — the
    # sgs/button shape (8 properties). The failure this guards is specific and
    # nastier than the single-property case: with 8 properties on one block, a
    # report that measured only ONE of them would look complete while leaving 7
    # unevidenced, and a report that mixed them up would attribute one
    # property's value to another's heading.
    batch_props = ['minHeight', 'fontSize', 'letterSpacing']
    batch_css = {'minHeight': 'min-height', 'fontSize': 'font-size',
                 'letterSpacing': 'letter-spacing'}
    probe5 = {'desktop': '64px', 'tablet': '32px', 'mobile': '8px'}

    # All three properties bind at every tier -> PASS.
    def _b5(vals, display='grid'):
        return _same_all_vps(_multi_node(vals, display, batch_props))

    before5 = _batch_capture(batch_props, batch_css, probe5, {
        'multi::default': _b5({'minHeight': '10px', 'fontSize': '16px',
                               'letterSpacing': '1px'}),
        'multi::probe': _b5({'minHeight': '10px', 'fontSize': '16px',
                             'letterSpacing': '1px'}),
    })
    after5 = _batch_capture(batch_props, batch_css, probe5, {
        'multi::default': _b5({'minHeight': '10px', 'fontSize': '16px',
                               'letterSpacing': '1px'}),
        # Every tier's probe value present for EVERY property.
        'multi::probe': {
            vp: _multi_node({p: probe5[vp] for p in batch_props}, 'grid', batch_props)
            for vp in ('desktop', 'tablet', 'mobile')},
    })
    r5 = generate_reports(before5, after5, 'self-test 5 batch', {}, {}, {},
                          '2026-01-01', tmp, dry_run=False, sha_fn=_fake_sha)
    check('5: batch block with 3 properties, all binding -> PASSES',
          not r5['failed'] and 'multi-2026-01-01.md' in r5['passed'])
    if 'multi-2026-01-01.md' in r5['passed']:
        stub5 = (tmp / 'multi-2026-01-01.md').read_text(encoding='utf-8')
        for p in batch_props:
            check(f'5: report names property `{p}` in its own row', f'`{p}`' in stub5)

    # NEGATIVE CONTROL: exactly ONE of the three properties fails to bind.
    # The block MUST fail — a batch must not pass on a 2-of-3 majority.
    after5b = _batch_capture(batch_props, batch_css, probe5, {
        'multi::default': _b5({'minHeight': '10px', 'fontSize': '16px',
                               'letterSpacing': '1px'}),
        'multi::probe': {
            vp: _multi_node({'minHeight': probe5[vp], 'fontSize': probe5[vp],
                             # letterSpacing never reflects the set value.
                             'letterSpacing': '1px'}, 'grid', batch_props)
            for vp in ('desktop', 'tablet', 'mobile')},
    })
    r5b = generate_reports(before5, after5b, 'self-test 5b', {}, {}, {},
                           '2026-01-01', tmp, dry_run=True, sha_fn=_fake_sha)
    failed5b = dict(r5b['failed'])
    check('5b: NEGATIVE CONTROL — one of three properties does not bind -> block FAILS',
          'multi' in failed5b)
    check('5b: the failure names the property that did not bind',
          any('letterSpacing' in p for p in failed5b.get('multi', [])))

    # NEGATIVE CONTROL: one property's value CHANGES between before and after,
    # with no --expect-change. Must fail, and must not be masked by the other
    # two properties matching.
    after5c = _batch_capture(batch_props, batch_css, probe5, {
        'multi::default': _b5({'minHeight': '10px', 'fontSize': '99px',
                               'letterSpacing': '1px'}),
        'multi::probe': {
            vp: _multi_node({p: probe5[vp] for p in batch_props}, 'grid', batch_props)
            for vp in ('desktop', 'tablet', 'mobile')},
    })
    r5c = generate_reports(before5, after5c, 'self-test 5c', {}, {}, {},
                           '2026-01-01', tmp, dry_run=True, sha_fn=_fake_sha)
    failed5c = dict(r5c['failed'])
    check('5c: NEGATIVE CONTROL — one property changed, no reason -> block FAILS',
          'multi' in failed5c)
    check('5c: the failure names the CHANGED property, not a neighbour',
          any('fontSize' in p and '99px' in p for p in failed5c.get('multi', [])))

    print(f"\n{'ALL PASS' if ok else 'FAILURES ABOVE'} — fixtures under {tmp}")
    return 0 if ok else 1


if __name__ == '__main__':
    raise SystemExit(main())
