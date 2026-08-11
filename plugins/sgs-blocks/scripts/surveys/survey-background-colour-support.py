#!/usr/bin/env python3
"""Track A completion audit — native colour/gradient background support.

WHY THIS EXISTS
----------------
`spec-35-capability-routing-doctrine.md` Parts 1/6 + the Track-A/Track-B
background-panel design (`go-track-1b-playful-hamster.md` Phase 4, "Background
part 2", 2026-08-11) found that most SGS blocks already carry native WP
`supports.color.background` (mechanism (a)), self-applied into their own
scoped `<style>` via `wp_style_engine_get_styles()`. This script closes the
loop: for every block that declares `color.background: true`, check (1) does
it also declare `gradients: true` (a gap, not a bug — WP simply won't offer
the gradient half of the swatch popover without it), and (2) does the
block's OWN render.php actually apply `style.color.background`/`gradient`
into a scoped rule (a genuinely DEAD declaration — the `imageControls`
defect class, doctrine Part 6).

A block whose PHP delegates to `SGS_Container_Wrapper::render()` is exempt
from the render.php self-application check — the wrapper applies colour on
the block's behalf; verified separately by Phase 4's live census.

USAGE
-----
  python scripts/surveys/survey-background-colour-support.py --survey
  python scripts/surveys/survey-background-colour-support.py --survey --json
  python scripts/surveys/survey-background-colour-support.py --self-test
"""

import argparse
import json
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

REPO = Path(__file__).resolve().parents[4]
BLOCKS_DIR = REPO / 'plugins' / 'sgs-blocks' / 'src' / 'blocks'

WRAPPER_CALL_RE = re.compile(r'SGS_Container_Wrapper::render')
# "Self-applies colour" detection, deliberately LOOSE. Three real, correct
# blocks were each false-flagged as a dead declaration by three successively
# tighter variable-name regexes during this script's build — heading/
# testimonial split into style_color_bg/style_color_gradient; process-steps/
# table-of-contents read attributes['style']['color'] wholesale into one var;
# testimonial (a fourth shape) extracts attributes['style'] into $style_arr
# FIRST, then reads $style_arr['color'][...] as a separate statement — no
# regex on the exact chain survives every block's own hand-rolled variable
# naming. The safe, low-false-negative signal: does this render.php build a
# 'color' key for wp_style_engine_get_styles() at all? A block that calls the
# style engine AND references the literal WP array key 'color' somewhere in
# the file is applying SOME native support via the correct mechanism — a
# false "clean" here is far cheaper (a human re-verifies one block) than a
# false "dead" repeating the mistake three times running.
STYLE_ENGINE_CALL_RE = re.compile(r"wp_style_engine_get_styles\s*\(")
COLOR_KEY_RE = re.compile(r"""['"]color['"]""")


def _load_block_json(block_dir):
    bj_path = block_dir / 'block.json'
    if not bj_path.exists():
        return None
    try:
        return json.loads(bj_path.read_text(encoding='utf-8'))
    except (json.JSONDecodeError, OSError):
        return None


def survey_block(block_dir):
    """Return a finding dict for one block, or None if not a Track-A candidate."""
    bj = _load_block_json(block_dir)
    if bj is None:
        return None

    color_supports = (bj.get('supports') or {}).get('color')
    if not isinstance(color_supports, dict):
        return None
    if not color_supports.get('background'):
        return None

    slug = bj.get('name', block_dir.name)
    gradients_absent = 'gradients' not in color_supports
    gradients_explicit_false = color_supports.get('gradients') is False
    has_gradients = bool(color_supports.get('gradients'))
    has_skip_serialization = bool(color_supports.get('__experimentalSkipSerialization'))

    render_path = block_dir / 'render.php'
    is_dynamic = render_path.exists()
    render_text = render_path.read_text(encoding='utf-8', errors='ignore') if is_dynamic else ''

    delegates_to_wrapper = bool(WRAPPER_CALL_RE.search(render_text))
    self_applies = bool(
        STYLE_ENGINE_CALL_RE.search(render_text)
        and COLOR_KEY_RE.search(render_text)
    )

    # A static (save.js-rendered) block gets colour for free via WP core's
    # own save-side serialization/class application — not this script's concern.
    is_static = not is_dynamic

    dead_declaration = (
        is_dynamic
        and not delegates_to_wrapper
        and not self_applies
    )

    return {
        'slug': slug,
        'gradients_missing': not has_gradients,
        'gradients_absent': gradients_absent,
        'gradients_explicit_false': gradients_explicit_false,
        'skip_serialization_missing': not has_skip_serialization,
        'delegates_to_wrapper': delegates_to_wrapper,
        'self_applies': self_applies,
        'is_static': is_static,
        'dead_declaration': dead_declaration,
    }


def run_survey():
    findings = []
    for block_dir in sorted(BLOCKS_DIR.iterdir()):
        if not block_dir.is_dir():
            continue
        finding = survey_block(block_dir)
        if finding is not None:
            findings.append(finding)
    return findings


def print_report(findings):
    total = len(findings)
    gradient_absent = [f for f in findings if f['gradients_absent']]
    gradient_explicit_false = [f for f in findings if f['gradients_explicit_false']]
    dead = [f for f in findings if f['dead_declaration']]
    skip_gaps = [f for f in findings if f['skip_serialization_missing']]

    print(f"Track A audit — {total} blocks declare native color.background:true\n")

    print(f"gradients:true ABSENT — real gap, not a design choice ({len(gradient_absent)}):")
    for f in gradient_absent:
        print(f"  - {f['slug']}")
    print()

    print(f"gradients: EXPLICITLY false — a deliberate choice, verify before touching "
          f"({len(gradient_explicit_false)}):")
    for f in gradient_explicit_false:
        print(f"  - {f['slug']}")
    print()

    print(f"__experimentalSkipSerialization MISSING ({len(skip_gaps)}) "
          f"— Spec 32 violation risk, inline style could leak:")
    for f in skip_gaps:
        print(f"  - {f['slug']}")
    print()

    print(f"DEAD DECLARATION — declares background:true, PHP neither delegates "
          f"to the shared wrapper nor self-applies ({len(dead)}):")
    for f in dead:
        print(f"  - {f['slug']}")
    print()

    if not gradient_absent and not dead and not skip_gaps:
        print("Clean — no real gaps found.")


def self_test():
    """Prove the detector can distinguish gap / dead / clean. Uses in-memory
    fixtures, not real block files, so it never depends on repo state."""
    import tempfile

    passed = 0
    failed = 0

    def check(name, condition):
        nonlocal passed, failed
        if condition:
            passed += 1
        else:
            failed += 1
            print(f"FAIL: {name}")

    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)

        # Positive control: gradients missing.
        gap_dir = tmp_path / 'gap-block'
        gap_dir.mkdir()
        (gap_dir / 'block.json').write_text(json.dumps({
            'name': 'sgs/gap-block',
            'supports': {'color': {'background': True, '__experimentalSkipSerialization': True}},
        }))
        (gap_dir / 'render.php').write_text(
            "<?php $style_color_bg = $attributes['style']['color']['background'] ?? '';"
            "$out = wp_style_engine_get_styles( array('color' => array('background' => $style_color_bg)) );"
        )
        result = survey_block(gap_dir)
        check('gap fixture: detected as a block', result is not None)
        check('gap fixture: gradients_missing True', result and result['gradients_missing'] is True)
        check('gap fixture: not a dead declaration', result and result['dead_declaration'] is False)

        # Positive control: dead declaration (declares, PHP never reads it).
        dead_dir = tmp_path / 'dead-block'
        dead_dir.mkdir()
        (dead_dir / 'block.json').write_text(json.dumps({
            'name': 'sgs/dead-block',
            'supports': {'color': {'background': True, 'gradients': True,
                                    '__experimentalSkipSerialization': True}},
        }))
        (dead_dir / 'render.php').write_text(
            "<?php echo '<div>no colour applied here</div>';"
        )
        result = survey_block(dead_dir)
        check('dead fixture: dead_declaration True', result and result['dead_declaration'] is True)

        # Negative control: clean block (matches heading/testimonial's real shape).
        clean_dir = tmp_path / 'clean-block'
        clean_dir.mkdir()
        (clean_dir / 'block.json').write_text(json.dumps({
            'name': 'sgs/clean-block',
            'supports': {'color': {'background': True, 'gradients': True,
                                    '__experimentalSkipSerialization': True}},
        }))
        (clean_dir / 'render.php').write_text(
            "<?php $style_color_bg = $attributes['style']['color']['background'] ?? '';"
            "$style_color_gradient = $attributes['style']['color']['gradient'] ?? '';"
            "$out = wp_style_engine_get_styles( array('color' => array('background' => $style_color_bg, 'gradient' => $style_color_gradient)) );"
        )
        result = survey_block(clean_dir)
        check('clean fixture: no gradient gap', result and result['gradients_missing'] is False)
        check('clean fixture: not dead', result and result['dead_declaration'] is False)

        # Regression control: wholesale-passthrough shape (process-steps' /
        # table-of-contents' real shape) — must NOT be flagged dead. An
        # earlier version of this detector's APPLY_RE only knew the split
        # style_color_bg/style_color_gradient shape and false-flagged both
        # these real, correct blocks as dead declarations.
        wholesale_dir = tmp_path / 'wholesale-block'
        wholesale_dir.mkdir()
        (wholesale_dir / 'block.json').write_text(json.dumps({
            'name': 'sgs/wholesale-block',
            'supports': {'color': {'background': True, 'gradients': True,
                                    '__experimentalSkipSerialization': True}},
        }))
        (wholesale_dir / 'render.php').write_text(
            "<?php $style_color = $attributes['style']['color'] ?? array();"
            "$color_args = array(); if (!empty($style_color['background'])) "
            "{ $color_args['background'] = $style_color['background']; }"
            "$out = wp_style_engine_get_styles( array('color' => $color_args) );"
        )
        result = survey_block(wholesale_dir)
        check('wholesale fixture: not dead (self-applies)', result and result['dead_declaration'] is False)
        check('wholesale fixture: self_applies True', result and result['self_applies'] is True)

        # Negative control: wrapper-delegated block (info-box's real shape) —
        # must NOT be flagged dead even though it never self-applies.
        wrapper_dir = tmp_path / 'wrapper-block'
        wrapper_dir.mkdir()
        (wrapper_dir / 'block.json').write_text(json.dumps({
            'name': 'sgs/wrapper-block',
            'supports': {'color': {'background': True, 'gradients': True,
                                    '__experimentalSkipSerialization': True}},
        }))
        (wrapper_dir / 'render.php').write_text(
            "<?php SGS_Container_Wrapper::render( $attributes, $block, $content, 'layout' );"
        )
        result = survey_block(wrapper_dir)
        check('wrapper fixture: not dead (delegates)', result and result['dead_declaration'] is False)
        check('wrapper fixture: delegates_to_wrapper True',
              result and result['delegates_to_wrapper'] is True)

        # Negative control: no color.background support at all — must return None.
        skip_dir = tmp_path / 'skip-block'
        skip_dir.mkdir()
        (skip_dir / 'block.json').write_text(json.dumps({
            'name': 'sgs/skip-block',
            'supports': {'color': {'background': False}},
        }))
        result = survey_block(skip_dir)
        check('skip fixture: returns None (not a candidate)', result is None)

    # Gate-level proof — not just the detector function, the GATE (run_check,
    # exit-code contract) itself, against a real on-disk fixture tree. A
    # detector that returns correct per-block data is not the same claim as
    # "the gate fails the build" — this proves the latter, per the project's
    # own standard that every gate ships proven able to fail.
    global BLOCKS_DIR
    real_blocks_dir = BLOCKS_DIR
    try:
        with tempfile.TemporaryDirectory() as gate_tmp:
            gate_tmp_path = Path(gate_tmp)

            violating_dir = gate_tmp_path / 'violating-block'
            violating_dir.mkdir()
            (violating_dir / 'block.json').write_text(json.dumps({
                'name': 'sgs/violating-block',
                'supports': {'color': {'background': True,
                                        '__experimentalSkipSerialization': True}},
            }))
            BLOCKS_DIR = gate_tmp_path
            check('gate fixture (1 violation): run_check() returns False', run_check() is False)

            clean_dir2 = gate_tmp_path / 'clean-block-2'
            clean_dir2.mkdir()
            (clean_dir2 / 'block.json').write_text(json.dumps({
                'name': 'sgs/clean-block-2',
                'supports': {'color': {'background': True, 'gradients': True,
                                        '__experimentalSkipSerialization': True}},
            }))
            (clean_dir2 / 'render.php').write_text(
                "<?php $c = $attributes['style']['color'] ?? array();"
                "$out = wp_style_engine_get_styles( array('color' => $c) );"
            )
            # Delete the still-violating fixture so this second run is genuinely clean.
            import shutil
            shutil.rmtree(violating_dir)
            check('gate fixture (0 violations): run_check() returns True', run_check() is True)
    finally:
        BLOCKS_DIR = real_blocks_dir

    print(f"\nself-test: {passed} passed, {failed} failed")
    return failed == 0


def run_check():
    """Enforcement gate — same detector as --survey, third mode of the triad
    (D542). Fails the build on a REAL violation only:
      - gradients ABSENT (not explicit false — that's a recorded design choice)
      - a dead declaration (declares color.background:true, PHP neither
        delegates to the shared wrapper nor calls the style engine with a
        'color' key anywhere in the file)
    This is the "declared capability, verified by effect" gate the
    capability-routing doctrine's Part 6 asked for — the same defect class
    as `imageControls` (declared on 15 blocks, reached 2), scoped here to
    native colour/gradient support instead of a new render_block mechanism.
    """
    findings = run_survey()
    violations = [f for f in findings if f['gradients_absent'] or f['dead_declaration']]

    if not violations:
        print(f"[survey-background-colour-support] CHECK PASSED — "
              f"{len(findings)} blocks declare color.background:true, 0 violations.")
        return True

    print(f"[survey-background-colour-support] CHECK FAILED — "
          f"{len(violations)} violation(s):")
    for f in violations:
        reasons = []
        if f['gradients_absent']:
            reasons.append('gradients:true absent (WP colour panel offers no gradient option)')
        if f['dead_declaration']:
            reasons.append('declares color.background:true but nothing renders it '
                            '(neither SGS_Container_Wrapper::render() nor the style engine)')
        print(f"  - {f['slug']}: {'; '.join(reasons)}")
    print("\nFix: add \"gradients\": true to supports.color in block.json, or wire the "
          "colour support into render.php via wp_style_engine_get_styles(). If the gap "
          "is a deliberate design choice, set gradients EXPLICITLY to false (not absent) "
          "so this gate records it as a decision, not an oversight.")
    return False


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--survey', action='store_true', help='Run the census.')
    parser.add_argument('--check', action='store_true', help='Run the enforcement gate; exit 1 on a real violation.')
    parser.add_argument('--json', action='store_true', help='Emit JSON instead of the human report.')
    parser.add_argument('--self-test', action='store_true', help='Run the detector self-test and exit.')
    args = parser.parse_args()

    if args.self_test:
        ok = self_test()
        sys.exit(0 if ok else 1)

    if args.check:
        ok = run_check()
        sys.exit(0 if ok else 1)

    if args.survey:
        findings = run_survey()
        if args.json:
            print(json.dumps(findings, indent=2))
        else:
            print_report(findings)
        sys.exit(0)

    parser.print_help()
    sys.exit(1)


if __name__ == '__main__':
    main()
