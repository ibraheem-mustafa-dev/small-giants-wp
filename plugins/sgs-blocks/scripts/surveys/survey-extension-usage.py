#!/usr/bin/env python3
"""Phase 2.1 usage derivation — the prerequisite before inverting a universal
extension's denylist (`hideExtensions`) to an allowlist (`enabledExtensions`).

WHY THIS EXISTS
----------------
The Phase 2.1 plan (`.claude/plans/go-track-1b-playful-hamster.md`) and the
control-type contract (`.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` PART O §H)
both say the same thing: flipping a universal extension to opt-in WITHOUT
first measuring real usage risks silently deleting a client capability — the
extension attaches invisibly (a `blocks.registerBlockType` JS filter, not a
`block.json` declaration), so no DB axis or per-block scan can see it. D551
made the hover/blockLink call safe by MEASURING zero stored usage across 194
canary pages before disconnecting. This script generalises that measurement
to the remaining denylist-gated extensions so the same call can be made
about them from evidence, not assumption.

SOUND vs UNSOUND SIGNALS (spec-35-control-type-contract.md, `decisions.md`
D544/D545) — this script implements ONLY the sound one:
  SOUND    — actual usage in stored post_content (an extension's attribute
             set away from its declared default, in a REAL page/pattern).
  UNSOUND  — `hideExtensions` itself (it IS the denylist being replaced —
             using it as ground truth just re-encodes today's
             under-measured defaults).

SCOPE — only the STYLING/INTERACTION universals that are still on the
denylist model after the D551 hover/blockLink flip: `animation`,
`clickEffects`, `parallax`. `imageControls` is already opt-in.
`conditionalVisibility` / `customCss` / `responsiveVisibility` are
UTILITY extensions (advisory-opt-in-by-use, universal by design per
check-universal-fit.js's own `isUtility` flag) — deliberately excluded,
not a phase 2.1 gap. `hover` / `blockLink` are included as a SANITY CHECK
only (they should now report zero attachment-with-usage everywhere, proving
the D551 flip didn't miss a live instance).

Extension → attr list is transcribed VERBATIM from the `EXTENSIONS` array in
`scripts/check-universal-fit.js` (the file that already mirrors the real JS
source) — re-check both if either drifts.

USAGE
-----
  python scripts/surveys/survey-extension-usage.py --survey \
      --canary-json <path to `wp post list --fields=ID,post_content --format=json`>

  # or, with SSH access already configured, let the script pull it itself:
  python scripts/surveys/survey-extension-usage.py --survey --pull

Reads local theme patterns/parts/templates too (`theme/sgs-theme/{patterns,templates,parts}`)
— the second stored-content surface per Spec 35's own S4 precedent
(`migrate-theme-tier-scalars.py`).

Outputs one row per (block, extension) that is currently ATTACHED
(not opted out today): whether real usage was found, in how many
instances, and where — the reviewable diff Bean signs off before any
`--fix` exists. This script has NO `--fix` mode by design (per the plan's
own triad rule: survey first, decide, THEN build the codemod for what
survives review).
"""

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[4]
BLOCKS_DIR = REPO / 'plugins' / 'sgs-blocks' / 'src' / 'blocks'
THEME_DIRS = [
    REPO / 'theme' / 'sgs-theme' / 'patterns',
    REPO / 'theme' / 'sgs-theme' / 'templates',
    REPO / 'theme' / 'sgs-theme' / 'parts',
]

SSH_CMD = [
    'ssh', '-i', str(Path.home() / '.ssh' / 'id_ed25519'), '-p', '65002',
    'u945238940@141.136.39.73',
]
WP_PATH = 'domains/sandybrown-nightingale-600381.hostingersite.com/public_html'

# Transcribed from scripts/check-universal-fit.js EXTENSIONS array (verbatim,
# re-check both if either file changes). hover/blockLink included as a
# post-D551 sanity check, not a live candidate.
EXTENSIONS = {
    'animation': {
        'attrs': ['sgsAnimation', 'sgsAnimationDelay', 'sgsAnimationDuration', 'sgsAnimationEasing'],
        'hide_slug': 'animation',
        'candidate': True,
    },
    'clickEffects': {
        'attrs': ['sgsClickEffect', 'sgsClickRippleColour', 'sgsClickRippleDuration'],
        'hide_slug': 'clickEffects',
        'candidate': True,
    },
    'parallax': {
        'attrs': ['sgsParallax', 'sgsParallaxStrength'],
        'hide_slug': 'parallax',
        'candidate': True,
    },
    'hover': {
        'attrs': [
            'sgsHoverBgColour', 'sgsHoverTextColour', 'sgsHoverBorderColour',
            'sgsHoverScale', 'sgsHoverScalePreset', 'sgsHoverShadow',
            'sgsHoverDuration', 'sgsHoverEasing', 'sgsHoverImageZoom',
            'sgsStaggerDelay', 'sgsHoverGrayscale', 'sgsHoverBorderAccent',
            'sgsHoverTilt3D', 'sgsFocusRing',
        ],
        'hide_slug': 'hover',
        'candidate': False,  # already flipped to opt-in, D551 — sanity check only.
    },
    'blockLink': {
        'attrs': ['sgsBlockLink', 'sgsBlockLinkTarget', 'sgsBlockLinkLabel'],
        'hide_slug': 'blockLink',
        'candidate': False,  # already flipped to opt-in, D551 — sanity check only.
    },
}

# A value counts as "real usage" unless it's one of these falsy/no-op forms.
_FALSY_STRINGS = {'', 'none', 'default', 'medium', '0', 'false'}


def is_real_value(value) -> bool:
    if value is None:
        return False
    if isinstance(value, bool):
        return value is True
    if isinstance(value, (int, float)):
        return value != 0
    if isinstance(value, str):
        return value.strip().lower() not in _FALSY_STRINGS
    if isinstance(value, (list, dict)):
        return bool(value)
    return bool(value)


# Matches `<!-- wp:sgs/block-slug {"attr":"val", ...} -->` (and the void
# self-closing `/-->` form) — attrs JSON is optional.
_BLOCK_COMMENT_RE = re.compile(r'<!--\s*wp:(sgs/[a-z0-9-]+)(\s+(\{.*?\}))?\s*(/)?-->', re.DOTALL)


def find_block_instances(content: str):
    """Yield (block_slug, attrs_dict) for every sgs/* block comment in content.

    Uses json.JSONDecoder().raw_decode() from the attrs JSON start rather than
    the regex's own capture group, because a nested object (e.g. `spacing`)
    can contain `}` before the real end — the same robustness fix
    migrate-theme-tier-scalars.py already proved necessary (D571).
    """
    decoder = json.JSONDecoder()
    for m in re.finditer(r'<!--\s*wp:(sgs/[a-z0-9-]+)(\s+)?', content):
        slug = m.group(1)
        rest = content[m.end():]
        stripped = rest.lstrip()
        if not stripped.startswith('{'):
            yield slug, {}
            continue
        offset = len(rest) - len(stripped)
        try:
            attrs, _ = decoder.raw_decode(rest, offset)
        except json.JSONDecodeError:
            continue
        yield slug, attrs


def load_block_json(block_dir: Path):
    p = block_dir / 'block.json'
    if not p.exists():
        return None
    try:
        return json.loads(p.read_text(encoding='utf-8'))
    except json.JSONDecodeError:
        return None


def is_attached_today(meta: dict, ext_id: str, ext_def: dict) -> bool:
    """Mirrors check-universal-fit.js's attachment logic for the 3 candidate
    extensions: universal by default, opted out via hideExtensions, and
    (for hover/blockLink/clickEffects) requires supports.className !== false.
    """
    supports = meta.get('supports') or {}
    if supports.get('className') is False:
        return False
    sgs = supports.get('sgs') or {}
    hide_list = sgs.get('hideExtensions') or []
    enabled_list = sgs.get('enabledExtensions') or []
    if ext_def['hide_slug'] and ext_def['hide_slug'] in hide_list:
        return False
    if not ext_def['candidate']:
        # hover/blockLink — now opt-IN; attached only if explicitly enabled.
        return ext_def['hide_slug'] in enabled_list
    return True


def pull_canary_content(out_path: Path):
    cmd = SSH_CMD + [
        'wp post list --path=%s --post_type=page,post --post_status=any '
        '--format=json --fields=ID,post_content' % WP_PATH
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    if result.returncode != 0:
        print(f'SSH pull failed: {result.stderr}', file=sys.stderr)
        sys.exit(1)
    out_path.write_text(result.stdout, encoding='utf-8')
    return json.loads(result.stdout)


def theme_pattern_sources():
    for d in THEME_DIRS:
        if not d.exists():
            continue
        for f in sorted(d.rglob('*.php')):
            yield f'theme:{f.relative_to(REPO)}', f.read_text(encoding='utf-8')
        for f in sorted(d.rglob('*.html')):
            yield f'theme:{f.relative_to(REPO)}', f.read_text(encoding='utf-8')


def survey(canary_posts):
    # block_slug -> block.json meta, only for blocks with a folder.
    block_meta = {}
    for d in sorted(BLOCKS_DIR.iterdir()):
        if not d.is_dir():
            continue
        meta = load_block_json(d)
        if meta and meta.get('name', '').startswith('sgs/'):
            block_meta[meta['name']] = meta

    # findings[ (block_slug, ext_id) ] = { 'attached': bool, 'usages': [ (source, attr, value) ] }
    findings = {}

    def note_attached(slug):
        meta = block_meta.get(slug)
        if not meta:
            return
        for ext_id, ext_def in EXTENSIONS.items():
            key = (slug, ext_id)
            if key not in findings:
                findings[key] = {
                    'attached': is_attached_today(meta, ext_id, ext_def),
                    'usages': [],
                }

    def record_usage(source, slug, attrs):
        if slug not in block_meta:
            return
        note_attached(slug)
        for ext_id, ext_def in EXTENSIONS.items():
            for attr in ext_def['attrs']:
                if attr in attrs and is_real_value(attrs[attr]):
                    findings[(slug, ext_id)]['usages'].append((source, attr, attrs[attr]))

    sources = []
    for post in canary_posts:
        source = f'canary:post-{post["ID"]}'
        sources.append((source, post.get('post_content') or ''))
    sources.extend(theme_pattern_sources())

    for source, content in sources:
        for slug, attrs in find_block_instances(content):
            record_usage(source, slug, attrs)

    # Make sure every currently-attached block x extension pair has a row,
    # even with zero usages found — that IS the finding.
    for slug, meta in block_meta.items():
        for ext_id, ext_def in EXTENSIONS.items():
            key = (slug, ext_id)
            if key not in findings:
                findings[key] = {'attached': is_attached_today(meta, ext_id, ext_def), 'usages': []}

    return findings, len(sources)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--survey', action='store_true', help='run the census (only mode implemented)')
    ap.add_argument('--pull', action='store_true', help='fetch fresh canary post_content via SSH')
    ap.add_argument('--canary-json', type=Path, help='path to a pre-pulled wp post list --format=json dump')
    ap.add_argument('--json', action='store_true', help='machine-readable output')
    args = ap.parse_args()

    if not args.survey:
        print('Only --survey is implemented (deliberately no --fix yet — see docstring).', file=sys.stderr)
        sys.exit(2)

    cache_path = REPO / 'plugins' / 'sgs-blocks' / 'scripts' / 'surveys' / '.extension-usage-canary-cache.json'
    if args.pull:
        canary_posts = pull_canary_content(cache_path)
    elif args.canary_json:
        canary_posts = json.loads(args.canary_json.read_text(encoding='utf-8'))
    elif cache_path.exists():
        canary_posts = json.loads(cache_path.read_text(encoding='utf-8'))
    else:
        print('No canary content source: pass --pull or --canary-json.', file=sys.stderr)
        sys.exit(2)

    findings, source_count = survey(canary_posts)

    if args.json:
        out = [
            {
                'block': slug, 'extension': ext_id,
                'attached_today': v['attached'],
                'usage_count': len(v['usages']),
                'usages': [{'source': s, 'attr': a, 'value': val} for s, a, val in v['usages'][:20]],
            }
            for (slug, ext_id), v in sorted(findings.items())
        ]
        print(json.dumps(out, indent=2))
        return

    print(f'Scanned {source_count} sources ({len(canary_posts)} canary posts + theme patterns/parts/templates).\n')

    for ext_id, ext_def in EXTENSIONS.items():
        rows = [(slug, v) for (slug, e), v in findings.items() if e == ext_id]
        attached = [r for r in rows if r[1]['attached']]
        used = [r for r in attached if r[1]['usages']]
        unused = [r for r in attached if not r[1]['usages']]
        label = 'CANDIDATE' if ext_def['candidate'] else 'sanity-check (already opt-in)'
        print(f'== {ext_id} ({label}) ==')
        print(f'  attached to {len(attached)} block(s) today; {len(used)} have real stored usage; {len(unused)} do not.')
        if used:
            print('  USED (must be pre-populated into enabledExtensions before any disconnect):')
            for slug, v in sorted(used):
                total = len(v['usages'])
                sample = v['usages'][0]
                print(f'    - {slug}: {total} instance(s), e.g. {sample[1]}={sample[2]!r} in {sample[0]}')
        if unused:
            print('  UNUSED (safe-to-disconnect candidates, pending Bean review):')
            for slug, v in sorted(unused):
                print(f'    - {slug}')
        print()


if __name__ == '__main__':
    main()
