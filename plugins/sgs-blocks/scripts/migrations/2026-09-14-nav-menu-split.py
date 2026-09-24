#!/usr/bin/env python3
"""2026-09-14-nav-menu-split.py — census + codemod for splitting `sgs/nav-menu` into
`sgs/nav-bar-menu` (header) and `sgs/nav-drawer-menu` (inside sgs/nav-drawer).

    <!-- wp:sgs/nav-menu {...} -->                     (top level)   -> sgs/nav-bar-menu
    <!-- wp:sgs/nav-drawer --><!-- wp:sgs/nav-menu --> (nested)      -> sgs/nav-drawer-menu

THE D542 TRIAD (`.claude/THE-MIGRATION-METHOD.md`): --survey (exhaustive census before any
design decision) -> --fix (codemod) -> --check (gate). ONE detector, three modes. No phase
does by hand what its own detector could do.

WHY A NEW SCRIPT AND NOT `migrate-core-blocks/driver.py` (verified 2026-09-14, three
disqualifiers, none of them cosmetic):
  1. Its replacement map is `source -> exactly ONE target` (`load_replaces_map` does
     `out[core] = slug`). A bar/drawer split is one source to TWO targets; the data model
     cannot express it.
  2. Its pairing hook `transform(node, text)` receives only the node and the raw text —
     no ancestor chain. It therefore cannot DECIDE the fork even if the map could hold it.
  3. `driver.py::HANDS_OFF` hard-skips `*framework-header-default.php` and
     `*header-search-*.php` — four of the nine pattern files this migration must touch,
     skipped SILENTLY (`if zone_of(rel) != 'safe': continue`).
This script instead models on `migrate-theme-attr-rename.py`: same parsing primitive
(`json.JSONDecoder().raw_decode()` on the JSON inside a `<!-- wp:sgs/* {...} -->` comment),
same refuse-rather-than-guess discipline, and NO exclusion list.

WHY THE ROUTING KEY IS NESTING, NOT AN ATTRIBUTE: every header pattern carries TWO
nav-menu instances — a bar one at top level and a drawer one inside `sgs/nav-drawer` — and
the distinction is encoded nowhere in the attributes (the drawer instance is typically a
bare `{"ref":0}`). Depth inside `sgs/nav-drawer` is the ONLY discriminator, so this script
parses real block-comment nesting rather than regex-matching opening comments alone.

⛔ GATED ON THE DESTINATION BLOCKS EXISTING. `--fix` and `--check` refuse to run until
`src/blocks/nav-bar-menu/block.json` and `src/blocks/nav-drawer-menu/block.json` are both
present. Rewriting a pattern to a block WordPress cannot resolve would render nothing and
fail the (deliberately empty) oldshape-audit baseline on the next deploy. `--survey` is
ungated by design — the census is exactly what you run BEFORE the blocks exist.

WHAT --survey REPORTS
---------------------
  SECTION A  every `sgs/nav-menu` block-comment instance, with its ancestor chain, and the
             bar/drawer routing each one would receive.
  SECTION B  every `sgs-nav-menu` / `sgs_nav_menu` / `sgs/nav-menu` LITERAL, bucketed by
             kind. The buckets exist because a naive replace of `sgs-nav-menu__` misses
             five of them — see BLIND_SPOT_KINDS.
  SECTION C  which files read each of the 156 block attributes, as the evidence base for
             the bar/drawer/both classification Step 2 needs. Reported as EVIDENCE, never
             as a verdict — a name-prefix guess is not a classification.

WHAT IT DOES NOT DO
-------------------
* Does not touch stored post_content. Live pages, `wp_template_part` 2671, `wp_block`
  reusables and revisions are a separate pass modelled on `migrate-stored-tier-scalars.py`
  (D788, proven on canary page 2742). See the plan's Step 5.
* Does not rename BEM roots, CSS, JS selectors or PHP identifiers — that is Step 3, and it
  is a different edit shape (literals in source, not JSON in block comments). This script
  only COUNTS them, so Step 3 has an authoritative denominator.
* Does not guess when a block comment's JSON will not parse — it reports the instance as
  UNPARSEABLE and leaves it alone.
"""

import argparse
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

REPO = Path(__file__).resolve().parents[4]
BLOCKS_DIR = REPO / 'plugins' / 'sgs-blocks' / 'src' / 'blocks'

SOURCE_BLOCK = 'sgs/nav-menu'
DRAWER_BLOCK = 'sgs/nav-drawer'
TARGET_BAR = 'sgs/nav-bar-menu'
TARGET_DRAWER = 'sgs/nav-drawer-menu'

# ── Step 4 fix targets (plan "Build sequence" Step 4) ──────────────────────────────────
# Editor-side drawer seeds: both insert a DEFAULT nav-menu instance INSIDE a new drawer,
# so both are fixed-target (always TARGET_DRAWER) rather than nesting-routed.
NAV_DRAWER_VARIATIONS_JS = BLOCKS_DIR / 'nav-drawer' / 'variations.js'
NAV_DRAWER_EDIT_JS = BLOCKS_DIR / 'nav-drawer' / 'edit.js'
BLOCK_REPLACEMENTS_JSON = (
    REPO / 'plugins' / 'sgs-blocks' / 'scripts' / 'data' / 'block-replacements.json'
)
CHECK_UNGATED_PAINT_PY = REPO / 'plugins' / 'sgs-blocks' / 'scripts' / 'check-ungated-paint-rules.py'
CLASSIFICATION_REPORT = (
    REPO / '.claude' / 'reports' / '2026-09-14-nav-menu-split-attribute-classification.md'
)
# One known additional real `block_slug` literal file the Section B census turned up
# beyond the plan's named list: these two editor rows seed the header/footer row's
# "quick insert" buttons and reference the now-deleted block by name. Both promote a
# BAR-shaped instance (a flat list dropped straight into a header/footer row, never
# inside sgs/nav-drawer, whose "ancestor" constraint would refuse it there anyway) —
# so both are fixed-target TARGET_BAR, same reasoning as the drawer seeds above but the
# other route. Flagged distinctly in the fix report as found-not-briefed.
SITE_HEADER_ROW_EDIT_JS = BLOCKS_DIR / 'site-header-row' / 'edit.js'
SITE_FOOTER_ROW_EDIT_JS = BLOCKS_DIR / 'site-footer-row' / 'edit.js'

THEME_DIRS = [
    REPO / 'theme' / 'sgs-theme' / 'patterns',
    REPO / 'theme' / 'sgs-theme' / 'templates',
    REPO / 'theme' / 'sgs-theme' / 'parts',
]

# Source trees scanned for LITERALS (section B) and attribute reads (section C).
# `build/` is excluded: it is generated by `npm run build` from `src/`, so editing it is
# never correct and counting it would double every figure.
LITERAL_ROOTS = [
    REPO / 'plugins' / 'sgs-blocks' / 'src',
    REPO / 'plugins' / 'sgs-blocks' / 'includes',
    REPO / 'plugins' / 'sgs-blocks' / 'scripts',
    REPO / 'theme' / 'sgs-theme',
]
LITERAL_EXTS = {'.php', '.js', '.jsx', '.ts', '.css', '.json', '.py', '.html'}
EXCLUDE_PARTS = {'node_modules', 'build', '__pycache__', '.git', 'vendor'}

# One full block-comment token: opening, closing, or self-closing.
#   group 1 = '/' when this is a CLOSING comment
#   group 2 = namespaced block name
#   group 3 = '/' when this is SELF-CLOSING (never pushes a nesting level)
_BLOCK_TOKEN_RE = re.compile(
    r'<!--\s*(/?)wp:([a-z][a-z0-9-]*/[a-zA-Z0-9-]+)((?:(?!-->).)*?)(/?)-->',
    re.DOTALL,
)

# ── Literal buckets ────────────────────────────────────────────────────────────────────
# The five marked BLIND SPOT are invisible to a naive replace of `sgs-nav-menu__`, which is
# the obvious pattern and the one a first attempt reaches for. Each is a real breakage:
# the root-class array is STOP E25 (a cross-file detector cannot see a split literal array),
# and `.wp-block-sgs-nav-menu` is generated by WP from the slug, so hand-written selectors
# referencing it go dead SILENTLY the moment the block is renamed.
BLIND_SPOT_KINDS = {
    'root_class_literal', 'uid_prefix', 'wp_block_selector', 'keyframes_or_details_name',
    'php_identifier',
}
# ⚠ NO `\b` AFTER A HYPHENATED NAME. In a regex a hyphen is a non-word character, so `\b`
# matches BETWEEN `menu` and a following `-`: `sgs/nav-menu\b` also matches inside
# `sgs/nav-menu-anything` (likewise `\borchestrator\.py\b` matching inside `sgs-clone-orchestrator.py`). `_END` is a
# negative lookahead for any slug character instead — `--self-test` asserts it.
_END = r'(?![a-zA-Z0-9_-])'
LITERAL_PATTERNS = [
    ('bem_element',              re.compile(r'sgs-nav-menu__[a-z0-9-]+')),
    ('root_class_literal',       re.compile(r'''['"]sgs-nav-menu['"]''')),
    ('wp_block_selector',        re.compile(r'wp-block-sgs-nav-menu' + _END)),
    ('keyframes_or_details_name', re.compile(r'sgs-nav-menu-(?:submenu|accordion)[a-z0-9-]*')),
    ('uid_prefix',               re.compile(r'''['"]sgs-nav-menu-['"]''')),
    ('php_identifier',           re.compile(r'\bsgs_nav_menu_[a-z_]+')),
    ('block_slug',               re.compile(r'sgs/nav-menu' + _END)),
]


def _skip(path: Path) -> bool:
    return any(p in EXCLUDE_PARTS for p in path.parts)


SELF = Path(__file__).resolve()


def iter_source_files():
    """Every scannable source file. Excludes THIS script: its own docstring names every
    literal it hunts for, which on the first run added 12 phantom `sgs/nav-menu` and 2
    phantom `.wp-block-sgs-nav-menu` hits to the very denominator it exists to establish."""
    for root in LITERAL_ROOTS:
        if not root.exists():
            continue
        for f in root.rglob('*'):
            if (f.is_file() and f.suffix in LITERAL_EXTS and not _skip(f)
                    and f.resolve() != SELF):
                yield f


def iter_theme_files():
    for d in THEME_DIRS:
        if not d.exists():
            continue
        for f in sorted(d.rglob('*')):
            if f.is_file() and f.suffix in {'.php', '.html'}:
                yield f


# ── Section A: block-comment instances with real nesting ───────────────────────────────

def iter_instances(text: str):
    """Walk every block comment in `text`, maintaining a real nesting stack, and yield one
    record per `sgs/nav-menu` instance.

    A hand-rolled brace matcher is NOT used for the attributes JSON: `raw_decode` consumes
    exactly one JSON value starting at the opening brace, so nested objects (`padding`,
    `gridTemplateColumns`, ...) are never mishandled. Self-closing comments never push a
    level, which is what keeps `<!-- wp:sgs/nav-menu /-->` from swallowing its siblings.

    Yields: (start, end, attrs|None, ancestors:list[str], raw_attr_span|None, unparseable:bool)
    """
    stack: list[str] = []
    for m in _BLOCK_TOKEN_RE.finditer(text):
        closing, name, middle, self_closing = m.group(1), m.group(2), m.group(3), m.group(4)

        if closing:
            # Pop to the matching ancestor. Tolerates malformed markup rather than
            # desynchronising the whole file on one stray closer.
            if name in stack:
                while stack and stack.pop() != name:
                    pass
            continue

        attrs = None
        attr_span = None
        brace = middle.find('{')
        if brace != -1:
            idx = m.start(3) + brace
            try:
                obj, end = json.JSONDecoder().raw_decode(text, idx)
                if isinstance(obj, dict):
                    attrs, attr_span = obj, (idx, end)
            except json.JSONDecodeError:
                attrs, attr_span = None, None
        # An opening brace that did not decode to a dict. Computed HERE, from the real
        # parse, so --self-test exercises the same logic the survey reports.
        unparseable = brace != -1 and attrs is None

        if name == SOURCE_BLOCK:
            yield m.start(), m.end(), attrs, list(stack), attr_span, unparseable

        if not self_closing:
            stack.append(name)


def route_for(ancestors: list[str]) -> str:
    """The ONLY routing rule: nested anywhere inside sgs/nav-drawer -> drawer block."""
    return TARGET_DRAWER if DRAWER_BLOCK in ancestors else TARGET_BAR


def survey_instances():
    rows = []
    for f in iter_theme_files():
        text = f.read_text(encoding='utf-8', errors='replace')
        for start, _end, attrs, ancestors, _span, unparseable in iter_instances(text):
            line = text.count('\n', 0, start) + 1
            rows.append({
                'file': f,
                'line': line,
                'attrs': attrs,
                'unparseable': unparseable,
                'ancestors': ancestors,
                'route': route_for(ancestors),
            })
    return rows


# ── Section B: literal census ──────────────────────────────────────────────────────────

def survey_literals():
    buckets: dict[str, list] = defaultdict(list)
    for f in iter_source_files():
        try:
            text = f.read_text(encoding='utf-8', errors='replace')
        except OSError:
            continue
        if 'nav-menu' not in text and 'nav_menu' not in text:
            continue
        for kind, pat in LITERAL_PATTERNS:
            n = len(pat.findall(text))
            if n:
                buckets[kind].append((f, n))
    return buckets


def is_cross_block(f: Path) -> bool:
    """A file outside the nav-menu/nav-drawer block folders and outside the shared nav
    includes still reading nav-menu's classes — mega-panel/view.js is the known case, and
    it breaks silently if Step 3 misses it."""
    s = f.as_posix()
    if '/blocks/nav-menu/' in s or '/blocks/nav-drawer/' in s:
        return False
    if '/includes/nav-menu-' in s or 'class-sgs-nav-menu-source' in s:
        return False
    return True


def is_frozen_fixture(f: Path) -> bool:
    return 'hover-guard/test-fixtures' in f.as_posix()


# ── Section C: attribute read-sites ────────────────────────────────────────────────────

def load_source_attributes() -> list[str]:
    bj = BLOCKS_DIR / 'nav-menu' / 'block.json'
    if not bj.exists():
        return []
    data = json.loads(bj.read_text(encoding='utf-8'))
    return sorted(data.get('attributes', {}).keys())


def _is_nav_file(f: Path, text: str) -> bool:
    """Section C scans ONLY nav-related files. Without this gate the scan is worthless for
    generically-named attributes: a bare word-boundary match on `gap` hit 832 files on the
    first run, because "gap" is also an English word appearing in prose and comments across
    the whole plugin. Restricting to files that actually touch nav is what makes a count
    mean "reads this nav attribute" rather than "contains this substring"."""
    s = f.as_posix()
    if '/blocks/nav-menu/' in s or '/blocks/nav-drawer/' in s:
        return True
    if '/includes/nav-menu-' in s or 'nav-interactivity' in s or 'effects/nav-' in s:
        return True
    return ('sgs/nav-menu' in text) or ('sgs-nav-menu' in text) or ('sgs_nav_menu' in text)


def survey_attribute_reads(attrs: list[str]):
    """For each attribute, which nav files reference it. EVIDENCE for the Step 2
    classification, deliberately not a verdict: a name-prefix guess ("`burger*` is
    bar-only") is exactly the kind of inference this project's root-cause rule forbids
    acting on unproven.

    Two precision gates, both learned from the first run:
      * `_is_nav_file` — see its docstring (the `gap` = 832 files problem).
      * an IDENTIFIER context — the name must appear quoted (`'gap'`), as a property
        (`.gap`), or as a key/assignment (`gap:` / `gap =`). A bare `\\b` match still
        counts prose. Generic names (gap, ref, padding, margin) are unusable without this.
    """
    reads: dict[str, set] = {a: set() for a in attrs}
    pats = {
        a: re.compile(
            r'''['"]{}['"]'''.format(re.escape(a))          # 'gap' / "gap"
            + r'|\.' + re.escape(a) + r'\b'                  # .gap
            + r'|\b' + re.escape(a) + r'\s*[:=]'             # gap: / gap =
        )
        for a in attrs
    }
    for f in iter_source_files():
        if is_frozen_fixture(f):
            continue
        try:
            text = f.read_text(encoding='utf-8', errors='replace')
        except OSError:
            continue
        if not _is_nav_file(f, text):
            continue
        for a in attrs:
            if a in text and pats[a].search(text):
                reads[a].add(f)
    return reads


# ── Step 4: --fix implementation ────────────────────────────────────────────────────────

def load_classification() -> tuple[frozenset, frozenset]:
    """Parse the BAR-only and DRAWER-only attribute name sets out of the Step 1/2
    classification report (ground truth, not re-derived). BOTH/NO-EFFECT attrs, and
    anything the report doesn't mention at all (e.g. the framework-injected `ref`
    item-source binding, which is declared on both new blocks — verified against both
    block.json files), are treated as safe on either route. Only a BAR-only attribute
    landing on a drawer-routed instance, or a DRAWER-only attribute landing on a
    bar-routed one, is a real conflict `--fix` must surface rather than silently keep.
    """
    if not CLASSIFICATION_REPORT.exists():
        return frozenset(), frozenset()
    text = CLASSIFICATION_REPORT.read_text(encoding='utf-8')

    def _section(heading: str) -> frozenset:
        m = re.search(rf'^### {heading} \(\d+\)\s*\n(.*?)(?=\n###|\Z)', text, re.S | re.M)
        return frozenset(re.findall(r'`([a-zA-Z0-9]+)`', m.group(1))) if m else frozenset()

    return _section('BAR'), _section('DRAWER')


def iter_fix_matches(text: str):
    """Like `iter_instances`, but yields the raw regex Match object for every
    `sgs/nav-menu` OPENING token (plus its ancestor snapshot), so `--fix` can replace
    exactly the block-NAME substring (`m.span(2)`) and leave the attributes JSON
    byte-for-byte untouched. Deliberately a separate function rather than widening
    `iter_instances`' return shape, which `--self-test`'s positional tuple-unpacking
    (`for *_, anc, _span, _unp in iter_instances(text)`) depends on staying fixed.
    Mirrors `iter_instances`' nesting-stack logic exactly.
    """
    stack: list[str] = []
    for m in _BLOCK_TOKEN_RE.finditer(text):
        closing, name, _middle, self_closing = m.group(1), m.group(2), m.group(3), m.group(4)
        if closing:
            if name in stack:
                while stack and stack.pop() != name:
                    pass
            continue
        if name == SOURCE_BLOCK:
            yield m, list(stack)
        if not self_closing:
            stack.append(name)


def fix_pattern_text(text: str, bar_only: frozenset, drawer_only: frozenset):
    """Rewrite every `sgs/nav-menu` instance in `text` to its routed target block,
    preserving the attributes JSON verbatim. Returns (new_text, per-instance records).
    Each record is {'route', 'attrs', 'gap_attrs'} -- `gap_attrs` lists any attribute
    that is meaningless on the routed target (BLIND_SPOT-style accounting per
    `driver.py::gate_result`'s mapped/dropped/gap three-verb model; this migration
    never DROPS an attribute -- an incompatible one is kept verbatim AND reported as a
    gap, since silently deciding to drop it would itself be an undisclosed decision).
    """
    records = []
    pieces = []
    last = 0
    for m, ancestors in iter_fix_matches(text):
        route = route_for(ancestors)
        g2_start, g2_end = m.start(2), m.end(2)
        pieces.append(text[last:g2_start])
        pieces.append(route)
        last = g2_end

        attrs = None
        brace = m.group(3).find('{')
        if brace != -1:
            idx = m.start(3) + brace
            try:
                obj, _end = json.JSONDecoder().raw_decode(text, idx)
                if isinstance(obj, dict):
                    attrs = obj
            except json.JSONDecodeError:
                attrs = None

        gap_attrs = []
        for attr_name in (attrs or {}):
            if route == TARGET_BAR and attr_name in drawer_only:
                gap_attrs.append(attr_name)
            elif route == TARGET_DRAWER and attr_name in bar_only:
                gap_attrs.append(attr_name)
        records.append({'route': route, 'attrs': attrs, 'gap_attrs': gap_attrs})
    pieces.append(text[last:])
    return ''.join(pieces), records


# The exact literal shape both drawer editor seeds use for their default InnerBlocks
# entry -- narrow ON PURPOSE. A blind whole-file `sgs/nav-menu` -> TARGET_DRAWER
# replace would also rewrite `nav-drawer/edit.js`'s unrelated prose comment about
# "sgs/nav-menu's three-value triggerMode" (which is talking about the BAR fork's own
# burger-trigger attribute, not anything seeded inside the drawer) -- see the
# hand-written fix for that line in `fix_seed_files()` below.
_SEED_ARRAY_RE = re.compile(r"(\[\s*)'sgs/nav-menu'")

# The one prose mention in nav-drawer/edit.js that is NOT the seed array -- it
# describes the BAR fork's own `triggerMode` enum (the "open side"), so it routes to
# TARGET_BAR, not TARGET_DRAWER like the seed arrays in the same file.
_EDIT_JS_PROSE_OLD = "sgs/nav-menu's three-value triggerMode"
_EDIT_JS_PROSE_NEW = "sgs/nav-bar-menu's three-value triggerMode"


def fix_seed_files(apply: bool):
    """Rewrite the two drawer editor seeds (`variations.js` default-look factory,
    `edit.js` default InnerBlocks template) -- both insert a fresh nav-menu instance
    INSIDE a new drawer, so both are fixed-target TARGET_DRAWER, never nesting-routed
    (there is no markup to walk -- these are JS array literals, not block comments).
    """
    results = []
    for f in (NAV_DRAWER_VARIATIONS_JS, NAV_DRAWER_EDIT_JS):
        if not f.exists():
            results.append((f, 0, 'MISSING'))
            continue
        text = f.read_text(encoding='utf-8')
        new_text, n = _SEED_ARRAY_RE.subn(r"\1'" + TARGET_DRAWER + "'", text)
        prose_hits = 0
        if f == NAV_DRAWER_EDIT_JS and _EDIT_JS_PROSE_OLD in new_text:
            prose_hits = new_text.count(_EDIT_JS_PROSE_OLD)
            new_text = new_text.replace(_EDIT_JS_PROSE_OLD, _EDIT_JS_PROSE_NEW)
        total = n + prose_hits
        if total:
            results.append((f, total, 'OK'))
            if apply:
                f.write_text(new_text, encoding='utf-8')
    return results


def fix_promoted_quick_insert_files(apply: bool):
    """Found-not-briefed (see the module-level comment above
    `SITE_HEADER_ROW_EDIT_JS`): `HEADER_PROMOTED`/`FOOTER_PROMOTED` quick-insert arrays
    reference the deleted block by literal slug. Both route to TARGET_BAR -- a flat
    list dropped straight into a header/footer row, never inside sgs/nav-drawer.
    """
    pat = re.compile(r"""(slug:\s*)'sgs/nav-menu'""")
    results = []
    for f in (SITE_HEADER_ROW_EDIT_JS, SITE_FOOTER_ROW_EDIT_JS):
        if not f.exists():
            results.append((f, 0, 'MISSING'))
            continue
        text = f.read_text(encoding='utf-8')
        new_text, n = pat.subn(r"\1'" + TARGET_BAR + "'", text)
        if n:
            results.append((f, n, 'OK'))
            if apply:
                f.write_text(new_text, encoding='utf-8')
    return results


def fix_block_replacements_json(apply: bool):
    """`sgs/nav-menu` currently claims `["core/navigation"]` in the migrate-core-blocks
    replacement map. The plan recommends `nav-bar-menu` inherit it -- the bar is the
    more direct successor to a flat WP nav-menu conversion (a WP core/navigation block
    is always a flat list, never a drawer accordion). Renaming the KEY in place keeps
    the file's existing alphabetical ordering correct (`nav-bar-menu` still sorts after
    `multi-button` and before `post-grid`).
    """
    if not BLOCK_REPLACEMENTS_JSON.exists():
        return False
    text = BLOCK_REPLACEMENTS_JSON.read_text(encoding='utf-8')
    old_key = '"sgs/nav-menu": ['
    new_key = '"sgs/nav-bar-menu": ['
    if old_key not in text:
        return False
    if apply:
        BLOCK_REPLACEMENTS_JSON.write_text(text.replace(old_key, new_key, 1), encoding='utf-8')
        # Validate the write didn't corrupt the JSON.
        json.loads(BLOCK_REPLACEMENTS_JSON.read_text(encoding='utf-8'))
    return True


def fix_hard_fail_blocks(apply: bool):
    """`check-ungated-paint-rules.py::HARD_FAIL_BLOCKS` is a `block_slug`-kind list
    (currently `["sgs/nav-menu"]`) naming the scope Step 26 of Spec 41's phase-plan will
    flip `--check` to hard-fail for. Both new slugs replace the one old one -- the paint
    gate's scope should track the split blocks, not vanish along with the retired slug.
    """
    if not CHECK_UNGATED_PAINT_PY.exists():
        return False
    text = CHECK_UNGATED_PAINT_PY.read_text(encoding='utf-8')
    old = 'HARD_FAIL_BLOCKS: list[str] = ["sgs/nav-menu"]'
    new = f'HARD_FAIL_BLOCKS: list[str] = ["{TARGET_BAR}", "{TARGET_DRAWER}"]'
    if old not in text:
        return False
    if apply:
        CHECK_UNGATED_PAINT_PY.write_text(text.replace(old, new, 1), encoding='utf-8')
    return True


def report_fix(apply: bool) -> int:
    ok, missing = targets_exist()
    if not ok:
        print('[nav-menu-split] REFUSED — destination block(s) not present: '
              f'{", ".join(missing)}.')
        return 1

    bar_only, drawer_only = load_classification()
    mode = 'APPLYING' if apply else 'DRY RUN (pass --apply to write)'
    print('=' * 78)
    print(f'--fix ({mode})')
    print('=' * 78)

    print('\n-- theme pattern instances (nesting-routed) --')
    total_mapped = 0
    total_gap = 0
    gap_rows = []
    files_touched = 0
    for f in iter_theme_files():
        text = f.read_text(encoding='utf-8', errors='replace')
        new_text, records = fix_pattern_text(text, bar_only, drawer_only)
        if not records:
            continue
        for rec in records:
            n_attrs = len(rec['attrs'] or {})
            n_gap = len(rec['gap_attrs'])
            total_mapped += n_attrs - n_gap
            total_gap += n_gap
            for attr in rec['gap_attrs']:
                gap_rows.append((f, rec['route'], attr))
        if new_text != text:
            files_touched += 1
            print(f'  {_short(f)}  ({len(records)} instance(s))')
            if apply:
                f.write_text(new_text, encoding='utf-8')

    print(f'\n  {files_touched} file(s) touched.')

    print('\n-- drawer editor seeds (fixed-target: TARGET_DRAWER) --')
    seed_results = fix_seed_files(apply)
    for f, n, status in seed_results:
        print(f'  {_short(f)}: {n} occurrence(s) [{status}]')
    if not seed_results:
        print('  (nothing to do)')

    print('\n-- header/footer row quick-insert arrays (found-not-briefed; fixed-target: TARGET_BAR) --')
    promoted_results = fix_promoted_quick_insert_files(apply)
    for f, n, status in promoted_results:
        print(f'  {_short(f)}: {n} occurrence(s) [{status}]')
    if not promoted_results:
        print('  (nothing to do)')

    print('\n-- scripts/data/block-replacements.json --')
    br_changed = fix_block_replacements_json(apply)
    print(f'  "sgs/nav-menu" -> "sgs/nav-bar-menu" key rename: '
          f'{"done" if (apply and br_changed) else ("pending" if br_changed else "nothing found")}')

    print('\n-- check-ungated-paint-rules.py::HARD_FAIL_BLOCKS --')
    hf_changed = fix_hard_fail_blocks(apply)
    print(f'  ["sgs/nav-menu"] -> ["{TARGET_BAR}", "{TARGET_DRAWER}"]: '
          f'{"done" if (apply and hf_changed) else ("pending" if hf_changed else "nothing found")}')

    print()
    print('=' * 78)
    print('ACCOUNTING (driver.py::gate_result three-verb model)')
    print('=' * 78)
    print(f'  mapped: {total_mapped} attribute(s) across {files_touched} pattern file(s)')
    print(f'  dropped: 0 (this migration never silently drops an attribute)')
    print(f'  gap: {total_gap} attribute(s)')
    if gap_rows:
        for f, route, attr in gap_rows:
            print(f'     ** {_short(f)} -> {route}: `{attr}` is not classified for this '
                  f'route — kept verbatim, needs a human call.')
    if not apply:
        print('\n  DRY RUN — no files were written. Re-run with --apply to write.')
    return 0


def report_check() -> int:
    ok, missing = targets_exist()
    if not ok:
        print('[nav-menu-split] REFUSED — destination block(s) not present: '
              f'{", ".join(missing)}.')
        return 1

    failures = []

    rows = survey_instances()
    if rows:
        failures.append(f'{len(rows)} sgs/nav-menu block-comment instance(s) remain in '
                         f'theme/sgs-theme/ (patterns/templates/parts).')
        for r in rows:
            failures.append(f'   {_short(r["file"])}:{r["line"]}')

    block_slug_re = dict(LITERAL_PATTERNS)['block_slug']
    # Files Step 4 owns the WHOLE literal surface of (every `sgs/nav-menu` mention,
    # including prose, must be gone): the two drawer editor seeds, the replacements
    # map, and the two found-not-briefed quick-insert arrays.
    owned_files_whole_surface = [
        NAV_DRAWER_VARIATIONS_JS, NAV_DRAWER_EDIT_JS, BLOCK_REPLACEMENTS_JSON,
        SITE_HEADER_ROW_EDIT_JS, SITE_FOOTER_ROW_EDIT_JS,
    ]
    for f in owned_files_whole_surface:
        if not f.exists():
            continue
        text = f.read_text(encoding='utf-8', errors='replace')
        n = len(block_slug_re.findall(text))
        if n:
            failures.append(f'{n} `sgs/nav-menu` literal(s) survive in {_short(f)} '
                             f'(owned by Step 4, not Step 3).')

    # check-ungated-paint-rules.py: Step 4 only owns the HARD_FAIL_BLOCKS constant —
    # the rest of that file's prose is legitimate FR-41-15 incident history describing
    # a real defect found on the OLD block, and stays. Assert only the constant.
    if CHECK_UNGATED_PAINT_PY.exists():
        text = CHECK_UNGATED_PAINT_PY.read_text(encoding='utf-8', errors='replace')
        expected = f'HARD_FAIL_BLOCKS: list[str] = ["{TARGET_BAR}", "{TARGET_DRAWER}"]'
        if expected not in text:
            failures.append('check-ungated-paint-rules.py::HARD_FAIL_BLOCKS was not '
                             f'updated to {[TARGET_BAR, TARGET_DRAWER]!r}.')

    if failures:
        print('[nav-menu-split --check] FAIL:')
        for line in failures:
            print(f'   - {line}')
        return 1
    print('[nav-menu-split --check] OK — zero sgs/nav-menu block-comment instances in '
          'theme/sgs-theme/, and zero block_slug literals in Step 4-owned files '
          '(class-sgs-nav-menu-source.php excluded — Step 3 owns it).')
    return 0


def _short(f: Path) -> str:
    try:
        return str(f.relative_to(REPO)).replace('\\', '/')
    except ValueError:
        return str(f)


# ── Gate ───────────────────────────────────────────────────────────────────────────────

def targets_exist() -> tuple[bool, list[str]]:
    missing = [
        t for t in (TARGET_BAR, TARGET_DRAWER)
        if not (BLOCKS_DIR / t.split('/', 1)[1] / 'block.json').exists()
    ]
    return (not missing), missing


# ── Reporting ──────────────────────────────────────────────────────────────────────────

def report_survey() -> int:
    print('=' * 78)
    print('SECTION A — sgs/nav-menu block-comment instances (routing by nesting)')
    print('=' * 78)
    rows = survey_instances()
    if not rows:
        print('  none found in theme patterns/templates/parts.')
    by_route = defaultdict(list)
    for r in rows:
        by_route[r['route']].append(r)
    for route in (TARGET_BAR, TARGET_DRAWER):
        group = by_route.get(route, [])
        print(f'\n  -> {route}  ({len(group)} instance(s))')
        for r in group:
            chain = ' > '.join(r['ancestors'][-2:]) or '(top level)'
            keys = ','.join(sorted(r['attrs'].keys())) if r['attrs'] else '(no attrs)'
            flag = '  ** UNPARSEABLE JSON' if r['unparseable'] else ''
            print(f'     {_short(r["file"])}:{r["line"]}')
            print(f'        in: {chain}')
            print(f'        attrs: {keys}{flag}')
    files = {r['file'] for r in rows}
    print(f'\n  TOTAL: {len(rows)} instance(s) across {len(files)} file(s) — '
          f'{len(by_route.get(TARGET_BAR, []))} bar, {len(by_route.get(TARGET_DRAWER, []))} drawer.')
    unparseable = [r for r in rows if r['unparseable']]
    if unparseable:
        print(f'  ** {len(unparseable)} instance(s) with unparseable JSON — --fix will refuse these.')

    print()
    print('=' * 78)
    print('SECTION B — literal census (the Step 3 denominator)')
    print('=' * 78)
    buckets = survey_literals()
    grand = 0
    for kind, _pat in LITERAL_PATTERNS:
        entries = buckets.get(kind, [])
        total = sum(n for _f, n in entries)
        grand += total
        blind = '  [BLIND SPOT — a naive `sgs-nav-menu__` replace MISSES this]' \
            if kind in BLIND_SPOT_KINDS else ''
        print(f'\n  {kind}: {total} occurrence(s) in {len(entries)} file(s){blind}')
        for f, n in sorted(entries, key=lambda e: -e[1]):
            marks = []
            if is_cross_block(f):
                marks.append('CROSS-BLOCK')
            if is_frozen_fixture(f):
                marks.append('FROZEN FIXTURE - regenerate, do not edit')
            suffix = ('   <- ' + ', '.join(marks)) if marks else ''
            print(f'     {n:5}  {_short(f)}{suffix}')
    print(f'\n  GRAND TOTAL: {grand} literal occurrence(s).')

    print()
    print('=' * 78)
    print('SECTION C — attribute read-sites (evidence for bar/drawer classification)')
    print('=' * 78)
    attrs = load_source_attributes()
    if not attrs:
        print('  could not read src/blocks/nav-menu/block.json — skipped.')
    else:
        reads = survey_attribute_reads(attrs)
        orphans = [a for a in attrs if not reads[a]]
        print(f'  {len(attrs)} attribute(s) declared on {SOURCE_BLOCK}.\n')
        for a in attrs:
            fs = sorted(reads[a], key=lambda p: _short(p))
            where = ', '.join(_short(f) for f in fs[:4])
            more = f' (+{len(fs) - 4} more)' if len(fs) > 4 else ''
            print(f'  {a:34} {len(fs):3} file(s)  {where}{more}')
        if orphans:
            print(f'\n  ** {len(orphans)} attribute(s) with NO read site found — '
                  f'candidates for deletion rather than migration:')
            for a in orphans:
                print(f'     {a}')
    print()
    ok, missing = targets_exist()
    if not ok:
        print(f'NOTE: --fix / --check are gated until these exist: {", ".join(missing)}')
    return 0


# ── Self-test ──────────────────────────────────────────────────────────────────────────
#
# Every fixture below is a shape the REAL theme files do not happen to contain today, which
# is exactly why each one needs planting: a census that has only ever run against the tree
# it describes reports its own blind spots as "clean". Each case names the specific parser
# behaviour it pins, so a failure says which rule broke rather than just "something".

_ROUTE_CASES = [
    ('top-level instance routes to the bar',
     '<!-- wp:sgs/nav-menu {"ref":0} /-->',
     [TARGET_BAR]),
    ('direct child of the drawer routes to the drawer',
     '<!-- wp:sgs/nav-drawer --><!-- wp:sgs/nav-menu {"ref":0} /--><!-- /wp:sgs/nav-drawer -->',
     [TARGET_DRAWER]),
    ('nested TWO deep inside the drawer still routes to the drawer (ancestor, not parent)',
     '<!-- wp:sgs/nav-drawer --><!-- wp:sgs/container --><!-- wp:sgs/nav-menu /-->'
     '<!-- /wp:sgs/container --><!-- /wp:sgs/nav-drawer -->',
     [TARGET_DRAWER]),
    ('a SELF-CLOSING drawer must not push a level: its later sibling is a bar instance',
     '<!-- wp:sgs/nav-drawer /--><!-- wp:sgs/nav-menu {"ref":0} /-->',
     [TARGET_BAR]),
    ('the drawer CLOSER must pop: an instance after the closed drawer is a bar instance',
     '<!-- wp:sgs/nav-drawer --><!-- wp:sgs/nav-menu /--><!-- /wp:sgs/nav-drawer -->'
     '<!-- wp:sgs/nav-menu {"gap":"28px"} /-->',
     [TARGET_DRAWER, TARGET_BAR]),
    ('a self-closing drawer carrying attributes must not push a level either',
     '<!-- wp:sgs/nav-drawer {"drawerRef":"x/y"} /--><!-- wp:sgs/nav-menu /-->',
     [TARGET_BAR]),
    ('a prefix-colliding slug is NOT an instance of sgs/nav-menu',
     '<!-- wp:sgs/nav-menu-extra {"ref":0} /-->',
     []),
    ('the real pattern shape: header bar + sibling drawer, in one file',
     '<!-- wp:sgs/site-header --><!-- wp:sgs/site-header-row -->'
     '<!-- wp:sgs/nav-menu {"ref":0,"itemColour":"text","gap":"28px"} /-->'
     '<!-- /wp:sgs/site-header-row --><!-- /wp:sgs/site-header -->'
     '<!-- wp:sgs/nav-drawer --><!-- wp:sgs/nav-menu {"ref":0} /--><!-- /wp:sgs/nav-drawer -->',
     [TARGET_BAR, TARGET_DRAWER]),
]

# (kind, text, expected match count)
_LITERAL_CASES = [
    ('block_slug',        "'sgs/nav-menu'",                 1),
    ('block_slug',        'sgs/nav-menu-extra',             0),   # the \b bug: must NOT match
    ('block_slug',        'sgs/nav-menus',                  0),
    ('block_slug',        'sgs/nav-bar-menu',               0),   # the Step 2 target name
    ('block_slug',        'sgs/nav-drawer-menu',            0),   # the Step 2 target name
    ('wp_block_selector', '.wp-block-sgs-nav-menu .x',      1),
    ('wp_block_selector', '.wp-block-sgs-nav-menu-extra',   0),   # the \b bug: must NOT match
    ('bem_element',       '.sgs-nav-menu__link',            1),
    ('bem_element',       '.sgs-nav-bar-menu__link',        0),   # renamed root: must NOT match
    ('root_class_literal', "array( 'sgs-nav-menu', $uid )", 1),
    ('uid_prefix',        "$uid = 'sgs-nav-menu-' . x",     1),
]


def _route_failures(route_fn) -> list[str]:
    fails = []
    for label, text, expected in _ROUTE_CASES:
        got = [route_fn(anc) for *_, anc, _span, _unp in iter_instances(text)]
        if got != expected:
            fails.append(f'{label}: expected {expected}, got {got}')
    return fails


def self_test() -> int:
    failures: list[str] = []

    # 1. Routing, against the real router.
    failures += _route_failures(route_for)

    # 2. Unparseable JSON is reported, never crashes, never silently becomes "no attrs".
    rows = list(iter_instances('<!-- wp:sgs/nav-menu {"ref":0 /-->'))
    if len(rows) != 1 or not rows[0][5] or rows[0][2] is not None:
        failures.append(f'malformed JSON: expected one row flagged unparseable, got {rows!r}')
    rows = list(iter_instances('<!-- wp:sgs/nav-menu /-->'))
    if len(rows) != 1 or rows[0][5]:
        failures.append('a bare self-closing instance with no attrs must NOT be flagged unparseable')

    # 3. Literal patterns, including the hyphen-boundary regression.
    pats = dict(LITERAL_PATTERNS)
    for kind, text, want in _LITERAL_CASES:
        got = len(pats[kind].findall(text))
        if got != want:
            failures.append(f'literal {kind} on {text!r}: expected {want} match(es), got {got}')

    # 4. NEGATIVE CONTROL ON THE SELF-TEST ITSELF. A suite that cannot fail proves nothing,
    #    and a suite whose fixtures all happen to agree with a broken router is vacuous.
    #    Two sabotaged routers must each be CAUGHT; if either passes clean, the fixtures do
    #    not discriminate and every green result above is meaningless.
    for name, broken in (('always-bar', lambda _anc: TARGET_BAR),
                         ('parent-only (ignores deeper ancestors)',
                          lambda anc: TARGET_DRAWER if anc[-1:] == [DRAWER_BLOCK] else TARGET_BAR)):
        if not _route_failures(broken):
            failures.append(f'NEGATIVE CONTROL FAILED: the sabotaged "{name}" router passed '
                            f'every routing fixture — the fixtures do not discriminate')

    total = len(_ROUTE_CASES) + 2 + len(_LITERAL_CASES) + 2
    if failures:
        print(f'[nav-menu-split --self-test] FAIL — {len(failures)} of {total} check(s):')
        for f in failures:
            print(f'   - {f}')
        return 1
    print(f'[nav-menu-split --self-test] OK — {total} check(s) passed, including 2 negative '
          f'controls proving the routing fixtures reject a broken router.')
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(
        description='Census + codemod for the sgs/nav-menu bar/drawer split.')
    mode = ap.add_mutually_exclusive_group()
    mode.add_argument('--survey', action='store_true',
                      help='Exhaustive read-only census (default).')
    mode.add_argument('--fix', action='store_true',
                      help='Rewrite theme pattern instances. Dry-run unless --apply.')
    mode.add_argument('--check', action='store_true',
                      help='Gate: non-zero exit while any sgs/nav-menu instance remains.')
    mode.add_argument('--self-test', action='store_true',
                      help='Run planted fixtures + negative controls against the parser.')
    ap.add_argument('--apply', action='store_true', help='With --fix, actually write.')
    args = ap.parse_args()

    if args.self_test:
        return self_test()

    if args.fix:
        ok, missing = targets_exist()
        if not ok:
            print('[nav-menu-split] REFUSED — destination block(s) not present: '
                  f'{", ".join(missing)}.')
            print('  Scaffold them first (plan Step 2). Rewriting a pattern to a block '
                  'WordPress cannot resolve renders nothing and fails the oldshape gate.')
            return 1
        return report_fix(args.apply)

    if args.check:
        return report_check()

    return report_survey()


if __name__ == '__main__':
    sys.exit(main())
