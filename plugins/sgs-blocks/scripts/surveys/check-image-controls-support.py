#!/usr/bin/env python3
"""Standing defence for the `imageControls` "declared-but-unverified capability"
defect class (D585 / Spec 35 capability-routing doctrine Part 9).

WHY THIS EXISTS
----------------
D585 (2026-08-11) found that `supports.sgs.imageControls: true` was declared on
15 blocks but functionally DEAD on 13 of them — the client saw a working
Image Controls panel in the inspector (object position / object-fit / max-width
/ per-breakpoint height) that visibly did nothing on the frontend, because
nothing ever consumed the attributes the panel wrote. That was fixed as a
one-off MANUAL sweep: 7 dead declarations removed, 6 blocks converted to the
explicit consumption mechanism (`imageControlsExplicit: true` + a call to the
shared `sgs_media_position_css()`/`sgs_media_position_focal_to_css()` helper
with the block's own selector), 1 block (before-after) was already genuine.

That sweep was never turned into a standing gate — this script is that gate,
cloned from the proven shape of `survey-background-colour-support.py` (same
triad: --survey census / --check gate / --self-test positive control).

THE TWO CONSUMPTION MECHANISMS
-------------------------------
A block declaring `supports.sgs.imageControls: true` gets its attributes
consumed one of two ways:

  (a) GENERIC — the block does NOT declare `imageControlsExplicit: true`, so
      `includes/image-controls.php`'s `render_block` filter injects a
      `sgs-has-image-controls` class + CSS custom properties onto the block's
      ROOT element. This only has any visible effect because
      `assets/css/extensions.css` (":655 Image Controls Extension") declares a
      rule keyed on that class reaching an `<img>`/`<video>` via exactly THREE
      selector shapes: `.sgs-has-image-controls > img` (direct child),
      `.sgs-has-image-controls .wp-block-image > img` (WP core image markup),
      or `.sgs-has-image-controls figure > img` (figure-wrapped). If the
      block's own render.php nests its image any other way (an extra `<div>`
      wrapper, an avatar wrapper class, etc.) the class and CSS vars are still
      injected onto the DOM — but no CSS rule anywhere ever reaches the image,
      and the panel is silently dead. This is EXACTLY the D585 defect shape.

  (b) EXPLICIT — the block declares `imageControlsExplicit: true` (opting out
      of mechanism (a)'s guessing injector) and its OWN render.php calls the
      shared helper `sgs_media_position_css()` (or the lower-level
      `sgs_media_position_focal_to_css()`) with a selector it knows is
      correct. Verified 6 blocks do this today: before-after, card-grid,
      gallery, product-card, team-member, testimonial-slider.

DETECTION — DELIBERATELY LOOSE (same tradeoff as survey-background-colour-
support.py's own docstring: a false "clean" costs one human re-verification;
a false "dead" repeats a mistake). For mechanism (a) this script cannot
reliably reconstruct DOM nesting from PHP string-concatenation source order
(a wrapping `<div>` literal can appear textually AFTER the function call whose
output it wraps at runtime) — so it uses a positive-signal heuristic: a block
is judged reachable-by-the-universal-selector if its render.php/style.css
contains ANY of `<figure`, `wp-block-image`, or has ZERO intervening `<div`
between the block's root wrapper and its first image-emitting call (the
"naked" pattern, e.g. decorative-image). Absence of all three signals is the
"declared but dead" finding. This can under-report a MIXED block (one image
slot reachable, another not — e.g. testimonial: its work-image sits inside a
`<figure>` but its avatar sits inside a plain `<div>`) — see the script's own
report for known limitations of this heuristic on any given run.

USAGE
-----
  python scripts/surveys/check-image-controls-support.py --survey
  python scripts/surveys/check-image-controls-support.py --survey --json
  python scripts/surveys/check-image-controls-support.py --check
  python scripts/surveys/check-image-controls-support.py --self-test
"""

import argparse
import json
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

REPO = Path(__file__).resolve().parents[4]
BLOCKS_DIR = REPO / 'plugins' / 'sgs-blocks' / 'src' / 'blocks'

# --- Mechanism (b): explicit self-consumption. ---
MEDIA_POSITION_HELPER_RE = re.compile(
    r'sgs_media_position_css\s*\(|sgs_media_position_focal_to_css\s*\('
)

# --- Mechanism (a): universal-selector reachability signals. ---
FIGURE_RE = re.compile(r'<figure\b', re.IGNORECASE)
WP_BLOCK_IMAGE_RE = re.compile(r'wp-block-image')
WRAPPER_ATTRS_RE = re.compile(r'get_block_wrapper_attributes\s*\(')
IMAGE_EMIT_RE = re.compile(
    r'sgs_render_media\s*\(|sgs_responsive_image\s*\(|<img\b',
    re.IGNORECASE,
)
DIV_OPEN_RE = re.compile(r'<div\b', re.IGNORECASE)


def _load_block_json(block_dir):
    bj_path = block_dir / 'block.json'
    if not bj_path.exists():
        return None
    try:
        return json.loads(bj_path.read_text(encoding='utf-8'))
    except (json.JSONDecodeError, OSError):
        return None


def _naked_direct_child(render_text):
    """True if the FIRST image-emitting call appears with zero intervening
    `<div` between the block's root wrapper-attributes call and that call —
    the "naked mode" pattern (e.g. decorative-image's <img> IS the block
    root). A weak positive signal used only when figure/wp-block-image are
    both absent."""
    wrapper_match = WRAPPER_ATTRS_RE.search(render_text)
    if not wrapper_match:
        return False
    image_match = IMAGE_EMIT_RE.search(render_text, wrapper_match.end())
    if not image_match:
        return False
    window = render_text[wrapper_match.end():image_match.start()]
    return DIV_OPEN_RE.search(window) is None


def survey_block(block_dir):
    """Return a finding dict for one block, or None if it doesn't declare
    supports.sgs.imageControls: true."""
    bj = _load_block_json(block_dir)
    if bj is None:
        return None

    sgs_supports = (bj.get('supports') or {}).get('sgs')
    if not isinstance(sgs_supports, dict):
        return None
    if not sgs_supports.get('imageControls'):
        return None

    slug = bj.get('name', block_dir.name)
    is_explicit = bool(sgs_supports.get('imageControlsExplicit'))

    render_path = block_dir / 'render.php'
    is_dynamic = render_path.exists()
    render_text = render_path.read_text(encoding='utf-8', errors='ignore') if is_dynamic else ''

    style_path = block_dir / 'style.css'
    style_text = style_path.read_text(encoding='utf-8', errors='ignore') if style_path.exists() else ''

    combined = render_text + '\n' + style_text

    if is_explicit:
        mechanism = 'explicit'
        consumed = bool(MEDIA_POSITION_HELPER_RE.search(render_text))
    else:
        mechanism = 'generic'
        consumed = bool(
            FIGURE_RE.search(combined)
            or WP_BLOCK_IMAGE_RE.search(combined)
            or (is_dynamic and _naked_direct_child(render_text))
        )

    # A static (save.js-only) block has no render.php for either mechanism to
    # hook into — the generic PHP injector (`render_block` filter) still runs
    # against save.js output (WP applies render_block to every block
    # regardless of static/dynamic), so the same figure/wp-block-image/naked
    # signal check applies against save.js instead when there's no render.php.
    if not is_dynamic and not is_explicit:
        save_path = block_dir / 'save.js'
        save_text = save_path.read_text(encoding='utf-8', errors='ignore') if save_path.exists() else ''
        consumed = bool(FIGURE_RE.search(save_text) or WP_BLOCK_IMAGE_RE.search(save_text))

    dead_declaration = not consumed

    return {
        'slug': slug,
        'mechanism': mechanism,
        'is_dynamic': is_dynamic,
        'consumed': consumed,
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
    explicit = [f for f in findings if f['mechanism'] == 'explicit']
    generic = [f for f in findings if f['mechanism'] == 'generic']
    dead = [f for f in findings if f['dead_declaration']]

    print(f"imageControls audit — {total} blocks declare supports.sgs.imageControls:true\n")

    print(f"EXPLICIT mechanism (imageControlsExplicit:true, own render.php calls "
          f"sgs_media_position_css()) — {len(explicit)}:")
    for f in explicit:
        status = 'DEAD' if f['dead_declaration'] else 'wired'
        print(f"  - {f['slug']}: {status}")
    print()

    print(f"GENERIC mechanism (relies on the render_block injector + the universal "
          f"CSS selector in extensions.css) — {len(generic)}:")
    for f in generic:
        status = 'DEAD' if f['dead_declaration'] else 'reachable'
        print(f"  - {f['slug']}: {status}")
    print()

    print(f"DECLARED BUT DEAD — declares imageControls:true, nothing consumes it "
          f"({len(dead)}):")
    for f in dead:
        print(f"  - {f['slug']} ({f['mechanism']})")
    print()

    if not dead:
        print("Clean — no declared-but-dead findings.")
    else:
        print("NOTE — detection is deliberately LOOSE (see script docstring). A "
              "block with MIXED image slots (one figure-wrapped, one not) can "
              "still read 'reachable' here even if one slot is genuinely dead — "
              "verify any live finding by hand before treating it as exhaustive.")


def run_check():
    """Enforcement gate — same detector as --survey, third mode of the triad
    (D542 shape). Fails the build on a genuine 'declared but dead' finding.
    No baseline file: unlike survey-background-colour-support.py's own
    baseline-free --check, this mirrors that exact convention rather than the
    briefing's assumed baseline-JSON pattern — there is no accepted-debt list
    here either, so every declared-but-dead finding fails the build.
    """
    findings = run_survey()
    violations = [f for f in findings if f['dead_declaration']]

    if not violations:
        print(f"[check-image-controls-support] CHECK PASSED — "
              f"{len(findings)} blocks declare imageControls:true, 0 violations.")
        return True

    print(f"[check-image-controls-support] CHECK FAILED — "
          f"{len(violations)} violation(s):")
    for f in violations:
        print(f"  - {f['slug']}: declares supports.sgs.imageControls:true "
              f"({f['mechanism']} mechanism) but nothing consumes the resulting "
              f"attributes — the editor panel is a dead control.")
    print("\nFix: either (a) set supports.sgs.imageControlsExplicit:true and call "
          "sgs_media_position_css()/sgs_media_position_focal_to_css() with the "
          "block's own known image selector in render.php, or (b) restructure the "
          "block's markup so the image sits inside a <figure>, inside "
          "'.wp-block-image', or as a direct child of the block root so the "
          "universal extensions.css rule reaches it, or (c) remove the dead "
          "imageControls:true declaration if the block has no genuine crop-box "
          "use case (per D585's precedent on info-box/decorative-image/etc).")
    return False


def self_test():
    """Prove the detector can distinguish explicit-wired / explicit-dead /
    generic-reachable / generic-dead / clean. In-memory fixtures, never real
    block files, so it never depends on repo state."""
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

        # Positive control: explicit mechanism, genuinely wired (team-member's
        # real shape — imageControlsExplicit:true + sgs_media_position_css()).
        wired_dir = tmp_path / 'explicit-wired-block'
        wired_dir.mkdir()
        (wired_dir / 'block.json').write_text(json.dumps({
            'name': 'sgs/explicit-wired-block',
            'supports': {'sgs': {'imageControls': True, 'imageControlsExplicit': True}},
        }))
        (wired_dir / 'render.php').write_text(
            "<?php $css = sgs_media_position_css( $attributes, 'sgs', $root_sel . ' img' );"
        )
        result = survey_block(wired_dir)
        check('explicit-wired: detected as a candidate', result is not None)
        check('explicit-wired: mechanism explicit', result and result['mechanism'] == 'explicit')
        check('explicit-wired: not dead', result and result['dead_declaration'] is False)

        # Positive control: explicit mechanism, DECLARED but the helper is
        # never called — the real defect class this gate exists to catch.
        explicit_dead_dir = tmp_path / 'explicit-dead-block'
        explicit_dead_dir.mkdir()
        (explicit_dead_dir / 'block.json').write_text(json.dumps({
            'name': 'sgs/explicit-dead-block',
            'supports': {'sgs': {'imageControls': True, 'imageControlsExplicit': True}},
        }))
        (explicit_dead_dir / 'render.php').write_text(
            "<?php echo '<div><img src=\"x.jpg\"></div>';"
        )
        result = survey_block(explicit_dead_dir)
        check('explicit-dead: dead_declaration True', result and result['dead_declaration'] is True)

        # Positive control: generic mechanism, reachable via <figure> (matches
        # the universal extensions.css selector `.sgs-has-image-controls figure > img`).
        generic_ok_dir = tmp_path / 'generic-figure-block'
        generic_ok_dir.mkdir()
        (generic_ok_dir / 'block.json').write_text(json.dumps({
            'name': 'sgs/generic-figure-block',
            'supports': {'sgs': {'imageControls': True}},
        }))
        (generic_ok_dir / 'render.php').write_text(
            "<?php $wrapper = get_block_wrapper_attributes(); "
            "echo '<div ' . $wrapper . '><figure><img src=\"x.jpg\"></figure></div>';"
        )
        result = survey_block(generic_ok_dir)
        check('generic-figure: mechanism generic', result and result['mechanism'] == 'generic')
        check('generic-figure: not dead', result and result['dead_declaration'] is False)

        # Positive control: generic mechanism, "naked" direct-child <img>
        # (matches decorative-image's real shape — the <img> IS effectively
        # the first thing rendered after the wrapper, no intervening <div>).
        generic_naked_dir = tmp_path / 'generic-naked-block'
        generic_naked_dir.mkdir()
        (generic_naked_dir / 'block.json').write_text(json.dumps({
            'name': 'sgs/generic-naked-block',
            'supports': {'sgs': {'imageControls': True}},
        }))
        (generic_naked_dir / 'render.php').write_text(
            "<?php $wrapper = get_block_wrapper_attributes( array( 'class' => 'sgs-x' ) ); "
            "echo sgs_responsive_image( $id, $url, $alt, 'large', array() );"
        )
        result = survey_block(generic_naked_dir)
        check('generic-naked: not dead', result and result['dead_declaration'] is False)

        # Positive control: generic mechanism, genuinely DEAD — an intervening
        # <div> wrapper with no figure/wp-block-image anywhere (matches
        # image-sequence's real live shape: <img> sits inside
        # .sgs-image-sequence__stage, a plain div, two levels below root).
        generic_dead_dir = tmp_path / 'generic-dead-block'
        generic_dead_dir.mkdir()
        (generic_dead_dir / 'block.json').write_text(json.dumps({
            'name': 'sgs/generic-dead-block',
            'supports': {'sgs': {'imageControls': True}},
        }))
        (generic_dead_dir / 'render.php').write_text(
            "<?php $wrapper = get_block_wrapper_attributes( array( 'class' => 'sgs-x' ) ); "
            "echo '<div ' . $wrapper . '><div class=\"sgs-x__stage\">'; "
            "echo sgs_responsive_image( $id, $url, $alt, 'large', array() ); "
            "echo '</div></div>';"
        )
        result = survey_block(generic_dead_dir)
        check('generic-dead: dead_declaration True', result and result['dead_declaration'] is True)

        # Negative control: no supports.sgs.imageControls at all — must
        # return None (not a candidate).
        skip_dir = tmp_path / 'skip-block'
        skip_dir.mkdir()
        (skip_dir / 'block.json').write_text(json.dumps({
            'name': 'sgs/skip-block',
            'supports': {'sgs': {'imageControls': False}},
        }))
        result = survey_block(skip_dir)
        check('skip fixture: returns None (not a candidate)', result is None)

        # Negative control: imageControls absent from supports.sgs entirely
        # (e.g. a block with other sgs supports but not this one).
        other_sgs_dir = tmp_path / 'other-sgs-block'
        other_sgs_dir.mkdir()
        (other_sgs_dir / 'block.json').write_text(json.dumps({
            'name': 'sgs/other-sgs-block',
            'supports': {'sgs': {'variants': {}}},
        }))
        result = survey_block(other_sgs_dir)
        check('other-sgs fixture: returns None (not a candidate)', result is None)

    # Gate-level proof — not just the detector function but the GATE
    # (run_check, exit-code contract) itself, against a real on-disk fixture
    # tree. Per this project's own standard that every gate ships proven able
    # to fail (not just its underlying function).
    global BLOCKS_DIR
    real_blocks_dir = BLOCKS_DIR
    try:
        with tempfile.TemporaryDirectory() as gate_tmp:
            gate_tmp_path = Path(gate_tmp)

            violating_dir = gate_tmp_path / 'violating-block'
            violating_dir.mkdir()
            (violating_dir / 'block.json').write_text(json.dumps({
                'name': 'sgs/violating-block',
                'supports': {'sgs': {'imageControls': True, 'imageControlsExplicit': True}},
            }))
            (violating_dir / 'render.php').write_text("<?php echo '<img src=\"x.jpg\">';")
            BLOCKS_DIR = gate_tmp_path
            check('gate fixture (1 violation): run_check() returns False', run_check() is False)

            import shutil
            shutil.rmtree(violating_dir)

            clean_dir = gate_tmp_path / 'clean-block'
            clean_dir.mkdir()
            (clean_dir / 'block.json').write_text(json.dumps({
                'name': 'sgs/clean-block',
                'supports': {'sgs': {'imageControls': True, 'imageControlsExplicit': True}},
            }))
            (clean_dir / 'render.php').write_text(
                "<?php $css = sgs_media_position_css( $attributes, 'sgs', '.uid img' );"
            )
            check('gate fixture (0 violations): run_check() returns True', run_check() is True)
    finally:
        BLOCKS_DIR = real_blocks_dir

    print(f"\nself-test: {passed} passed, {failed} failed")
    return failed == 0


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
