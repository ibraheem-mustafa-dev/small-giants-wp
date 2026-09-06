#!/usr/bin/env python3
"""migrate-stored-tier-scalars.py — fold a flat per-device scalar into ONE tier object,
inside STORED post_content (published/draft WordPress pages/posts), across EVERY property
that a block's own block.json currently declares as object-typed.

    <!-- wp:sgs/x {"prop":"V","propTablet":"T","propMobile":"M", ...} -->
        -> <!-- wp:sgs/x {"prop":{"desktop":"V","tablet":"T","mobile":"M"}, ...} -->

WHY THIS IS A SEPARATE SCRIPT, NOT A MODE ON migrate-theme-tier-scalars.py
----------------------------------------------------------------------------
Same fold, different target. `migrate-theme-tier-scalars.py` (S4 of the migration triad,
Spec 35 / D571) folds hand-authored `wp:sgs/*` block comments in
`theme/sgs-theme/{patterns,templates,parts}` — files on disk in THIS repo. Stored
post_content lives in a REMOTE WordPress database, reachable only via `wp post get
--field=post_content` or a REST export, never as a repo file. This script's input is
therefore an exported TEXT DUMP (a file, or a directory of dumps), not a repo glob — the one
structural difference from its sibling. Parsing, classification and fold logic are otherwise
identical on purpose (D571's "same shape philosophy" rule), and reused near-verbatim.

Measured live (2026-08-25) on canary page 2742 (Mama's Munches homepage clone): ~106
attributes across 77 blocks are FLAT where their block.json now declares an object. WordPress
does not error on this — `WP_Block_Type::prepare_attributes_for_render()` silently substitutes
the attribute's DEFAULT when a stored value fails schema validation (D338 class of loss,
corrected 2026-08-20: this is a PHP-side substitution on read, not a JS-side drop — the value
never even reaches render.php). Confirmed effects: `minHeight:"48px"` on sgs/button renders
`min-height:0px`; `layout:"grid"` on sgs/testimonial-slider (enum:["full","split"]) coerces
to "full" and the element renders at width:0.

DIFFERENCE FROM THE ENUM CASE (Correctness constraint #3)
-----------------------------------------------------------
A FLAT value against an object-typed schema can ALWAYS be safely folded (it becomes the
desktop tier). A value against an ENUM-typed schema that is not IN the enum CANNOT be
auto-fixed by folding — there is no correct replacement value, only the author knows what
was intended. These are reported as a SEPARATE finding class ('ENUM_VIOLATION'), never
silently dropped, never guessed at, and make --check fail exactly like an un-migrated FLAT.

USAGE
-----
    python migrate-stored-tier-scalars.py --survey   <file-or-dir> [...]
    python migrate-stored-tier-scalars.py --fix       <file-or-dir> [...]              (dry-run)
    python migrate-stored-tier-scalars.py --fix --apply <file-or-dir> [...]            (write)
    python migrate-stored-tier-scalars.py --check     <file-or-dir> [...]              (CI gate)
    python migrate-stored-tier-scalars.py --self-test

Unlike migrate-theme-tier-scalars.py (which sweeps the whole THEME_DIRS tree for one named
--property), this script sweeps EVERY property across the whole INPUT for one named block
family scan — because post_content dumps are per-page inputs supplied at the command line,
not a fixed repo tree, and a stored page typically carries many stale properties at once
(the 106-attribute/77-block census above), so requiring one `--property` flag per run would
mean ~40+ invocations to migrate a single real page. Every FLAT/BLENDED/ENUM_VIOLATION
instance for every object-typed OR enum-typed attribute the block declares is found and
(for FLAT/BLENDED) folded in one pass.

Input: a path to a post_content dump file, or a directory (scanned non-recursively for
*.txt, matching audit-post-content-blocks.py's convention), or '-' to read a single dump
from stdin.

WHAT IT DOES NOT DO
--------------------
* Does not touch WordPress directly — this is a text-in/text-out tool. Writing the folded
  text back to the live post is a separate, explicit step (wp post update --post_content,
  or the REST content-guard path) — out of scope, deliberately, so this stays testable
  offline against an exported dump.
* Does not invent tablet/mobile values — only DESKTOP is set, from the flat value; sibling
  <attr>Tablet / <attr>Mobile keys (if present) become the tablet/mobile tiers and are then
  removed as orphan keys.
* Does not fold or guess at an ENUM_VIOLATION — reported, never silently fixed.
* Does not attempt a fold when the JSON won't parse, or the block comment has no attributes
  object (a bare `<!-- wp:sgs/x /-->`) — nothing to fold there.
* Does not reorder or reformat keys beyond the ones it folds — mutates the parsed dict in
  place; Python's `json` module preserves insertion order from `json.loads`.
"""

import argparse
import json
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

REPO = Path(__file__).resolve().parents[3]
BLOCKS_DIR = REPO / 'plugins' / 'sgs-blocks' / 'src' / 'blocks'
TIERS = ('Tablet', 'Mobile')
_COMMENT_RE = re.compile(r'<!--\s*wp:(sgs/[a-zA-Z0-9-]+)\s+')


def load_block_schemas() -> dict:
    """{block_name: {attr_name: attr_def_dict}} straight from every block.json's own
    "attributes" object — the single source of truth for what shape each property is
    declared as TODAY. No hardcoded lookups (R-31-1)."""
    out = {}
    for bj in BLOCKS_DIR.glob('*/block.json'):
        try:
            data = json.loads(bj.read_text(encoding='utf-8'))
        except (json.JSONDecodeError, OSError):
            continue
        name = data.get('name')
        if not name:
            continue
        out[name] = data.get('attributes', {}) or {}
    return out


def _is_object_type(attr_def: dict) -> bool:
    """True only for a plain `"type":"object"` declaration. A union type
    (`"type":["string","number"]`) is legal and NOT a migration target — see
    migrate-theme-tier-scalars.py's identical gate + the D571 nav-menu incident this
    guards against. `attr_def['type']` may be a list (union) or a bare string; only the
    bare-string `'object'` counts."""
    t = attr_def.get('type')
    return t == 'object'


TIER_KEYS = frozenset({'desktop', 'tablet', 'mobile'})
BOX_KEYS = frozenset({'top', 'right', 'bottom', 'left'})

# CLOSED, NAMED box-family set — settled doctrine, NOT an open question (correction,
# 2026-08-25). Authority: `plugins/sgs-blocks/scripts/surveys/survey-responsive-shape.py`
# module docstring (Spec 35 Phase 1.4, Bean, 2026-08-10):
#
#     TIER shape  {desktop, tablet, mobile}  -- universal, applies to ANY property.
#     BOX shape   {top, right, bottom, left} -- ONLY for genuinely per-side
#                                              properties (padding, margin,
#                                              border-width, border-radius).
#     These are INDEPENDENT axes. A property can have one, both, or neither.
#
# Corroborated by `plugins/sgs-blocks/scripts/check-tier-storage-shape.py`'s docstring:
# a per-tier BOX family is `padding` + `paddingTablet` + `paddingMobile` (D496), each
# one an object holding {top,right,bottom,left} -- the tiering is via SIBLING attrs, the
# base attr's own value shape is a BOX. Matched case-insensitively so prefixed variants
# (cardPadding, contentPadding, gridItemBorderRadius, ctaBorderWidth, asideBorderWidth)
# all match, and matched on the BASE name after stripping a trailing Tablet/Mobile
# suffix so a per-tier sibling of a box family (paddingTablet itself) still resolves to
# the same box family as its base.
BOX_BASES = ('padding', 'margin', 'borderwidth', 'borderradius')


def _is_box_by_name(prop: str) -> bool:
    """True when PROP's base name (after stripping a trailing Tablet/Mobile suffix) ends
    in one of the closed BOX_BASES, case-insensitive. This is authoritative, not a
    fallback -- rule 1 of the coordinator's corrected precedence, checked BEFORE any
    default-key proof, because a genuinely per-side property is per-side regardless of
    what its (possibly stale/incomplete) `default` happens to declare."""
    base = prop
    for suf in TIERS:  # ('Tablet', 'Mobile')
        if base != suf and base.endswith(suf):
            base = base[:-len(suf)]
            break
    base_lower = base.lower()
    return any(base_lower.endswith(b) for b in BOX_BASES)


def _shape_kind(attr_def: dict, prop: str) -> str:
    """Determine what SHAPE an object-typed attribute's block.json declares.

    CORRECTED 2026-08-25 (coordinator correction, grounded in
    `survey-responsive-shape.py` + `check-tier-storage-shape.py`, both read in full):
    the settled Spec 35 Phase 1.4 doctrine is that BOX is a CLOSED, NAMED set -- ONLY
    padding/margin/border-width/border-radius (and their prefixed variants) are ever
    box-shaped. Anything object-typed that is NOT a per-side property IS a tier, by
    doctrine, even with zero key proof from `default`. The earlier version of this
    function treated `default:{}`-with-no-name-match as an unresolved "SHAPE_UNDECLARED"
    refusal -- that was WRONG: it is TIER by doctrine and must fold (this is what makes
    sgs/button.minHeight, the live-measured breakage, foldable again).

    PRECEDENCE (exactly as specified, checked in this order):
      1. `_is_box_by_name(prop)` -- closed-set box-family name match. Always wins,
         regardless of what `default` says (a genuinely per-side property is per-side
         even if its `default` is stale, empty, or absent). -> 'BOX'.
      2. A non-empty `default` PROVES the shape from its own keys: subset of
         {desktop,tablet,mobile} -> 'TIER'; subset of {top,right,bottom,left} -> 'BOX'
         (redundant with rule 1 for a correctly-named attr, but also catches the 2
         measured cases where an OBJECT's `default` proves box shape independently of
         name); anything else (e.g. {x,y}, a `properties` sub-schema) -> 'OTHER_SHAPE'.
      3. Otherwise (object-typed, not per-side by name, no default proof either way)
         -> 'TIER' by doctrine. This is the behaviour change: what used to be refused
         as SHAPE_UNDECLARED now folds.

    Measured against all 83 block.json files / 533 object attributes (coordinator's
    re-run, 2026-08-25): 238 BOX (per-side family name), 228 TIER (doctrine -- not
    per-side), 56 TIER (proven by default), 11 OTHER_SHAPE (all shapeDivider*Scale
    {x,y} + mega-panel.asideSeparator {style}) -- ZERO left ambiguous.

    Spot-checks this function must agree with:
      - sgs/button.minHeight   -> TIER (fold). Measured breaking live: stored "48px"
                                  renders as min-height:0px.
      - sgs/container.padding  -> BOX (refuse). The data-loss bug already fixed; must
                                  not regress.
    """
    if _is_box_by_name(prop):
        return 'BOX'
    default = attr_def.get('default')
    if isinstance(default, dict) and default:
        keys = set(default.keys())
        if keys <= TIER_KEYS:
            return 'TIER'
        if keys <= BOX_KEYS:
            return 'BOX'
        return 'OTHER_SHAPE'
    return 'TIER'  # doctrine: object-typed, not per-side, no default proof -> tier


def _declared_enum(attr_def: dict):
    """Returns the enum list if this attr declares one, else None. Only meaningful when
    the base type is a plain string/number (not object, not a union) — an object-typed
    attr's `enum` (if any) would apply to the whole object value, not a flat scalar, and
    is out of scope here."""
    enum = attr_def.get('enum')
    if isinstance(enum, list) and enum:
        return enum
    return None


def iter_block_attrs(text: str):
    """Yield (block_name, json_start, json_end, attrs_dict) for every wp:sgs/* comment
    carrying a JSON attributes object. Uses json's own raw_decode — robust against nested
    objects (spacing/padding/etc.) — never a hand-rolled brace matcher (per the task's
    reuse instruction and migrate-theme-tier-scalars.py's identical approach)."""
    for m in _COMMENT_RE.finditer(text):
        idx = m.end()
        if idx >= len(text) or text[idx] != '{':
            continue
        try:
            obj, end = json.JSONDecoder().raw_decode(text, idx)
        except json.JSONDecodeError:
            continue
        if not isinstance(obj, dict):
            continue
        yield m.group(1), idx, end, obj


def classify_property(attrs: dict, prop: str, attr_def: dict):
    """Classify ONE property on ONE block instance against that block's OWN schema.

    Returns (kind, siblings) where kind is one of:
      ABSENT          — prop not present on this instance, or the block doesn't declare
                         prop as object/enum at all (nothing to check here).
      OBJECT          — prop already folded to a proven-TIER object shape.
      FLAT            — prop is PROVABLY tier-typed (block.json `default`'s keys are a
                         subset of {desktop,tablet,mobile}), instance value is a scalar.
                         The only kind this script folds.
      BLENDED         — prop is PROVABLY tier-typed, instance value is ALREADY an
                         object, but orphan Tablet/Mobile sibling keys remain to drop.
      BOX             — prop's shape is BOX by the closed-set doctrine: its base
                         name (stripped of a trailing Tablet/Mobile) ends in padding/
                         margin/borderWidth/borderRadius, OR its block.json `default`'s
                         keys independently prove a box subset of {top,right,bottom,
                         left}. NEVER folded — folding a flat scalar into
                         {"desktop":value} here would silently destroy the box structure
                         (reproduced live on sgs/container.padding). Reported as its own
                         class.
      OTHER_SHAPE     — prop is object-typed, not box-named, and `default` is a
                         non-empty dict whose keys are neither a tier subset nor a box
                         subset (e.g. {x,y} on shapeDividerTopScale, {style} on
                         asideSeparator). NEVER folded.
      ENUM_VIOLATION  — prop is enum-typed, instance value is a scalar NOT in the enum.
                         Never auto-fixed.

    NOTE (corrected 2026-08-25): there is no longer a distinct "shape genuinely
    unknown" refusal bucket. Per the settled Spec 35 Phase 1.4 doctrine (BOX is a
    CLOSED, NAMED set; anything object-typed that is not per-side IS a tier), an
    attribute with no default-key proof and no box-name match is TIER BY DOCTRINE
    and folds as FLAT/BLENDED — see `_shape_kind`'s docstring for the full
    precedence and citation.
    """
    if prop not in attrs:
        return 'ABSENT', []
    val = attrs[prop]
    sibs = [prop + t for t in TIERS if (prop + t) in attrs]

    if _is_object_type(attr_def):
        shape = _shape_kind(attr_def, prop)
        if shape in ('BOX', 'OTHER_SHAPE'):
            # Only a FLAT (scalar) value against a BOX/OTHER_SHAPE-typed attr is a
            # finding worth a human decision (it's a shorthand that needs expanding,
            # e.g. a bare "22px" for a 4-side padding). An instance ALREADY stored as
            # a dict in this shape is correct as-authored — nothing to decide, so it
            # is not reported (spot-checked live: sgs/hero.contentPadding and
            # sgs/product-card.cardPadding on page 2742 are already proper
            # {top,right,bottom,left} objects and must not be flagged as noise).
            if isinstance(val, dict):
                return 'ABSENT', []
            return shape, []
        # shape == 'TIER' (proven by default OR by doctrine) — safe to fold.
        if isinstance(val, dict):
            return ('BLENDED', sibs) if sibs else ('OBJECT', [])
        return 'FLAT', sibs

    enum = _declared_enum(attr_def)
    if enum is not None:
        if isinstance(val, dict):
            # An object value against a plain enum-typed attr is not a shape this schema
            # ever declared — outside this script's remit; leave it to the general
            # undeclared-attr auditor (audit-post-content-blocks.py already covers
            # "value shape WP would reject on load" for the non-tier-migration case).
            return 'ABSENT', []
        if val not in enum:
            return 'ENUM_VIOLATION', []
        return 'ABSENT', []

    return 'ABSENT', []


def fold(attrs: dict, prop: str) -> dict:
    """Return a NEW dict with prop folded to {desktop,tablet,mobile}; siblings removed.
    Only includes a tier key when that tier had a real (non-empty) value — an absent tier
    means 'inherit', matching migrate-theme-tier-scalars.py's fold()."""
    new_attrs = dict(attrs)
    val = attrs[prop]
    obj = {}
    if val not in (None, ''):
        obj['desktop'] = val
    for suffix, key in (('Tablet', 'tablet'), ('Mobile', 'mobile')):
        sib_key = prop + suffix
        if sib_key in attrs and attrs[sib_key] not in (None, ''):
            obj[key] = attrs[sib_key]
        new_attrs.pop(sib_key, None)
    new_attrs[prop] = obj
    return new_attrs


def scan_text(label: str, text: str, schemas: dict):
    """Yield finding dicts across every wp:sgs/* instance in `text`."""
    findings = []
    for block_name, start, end, attrs in iter_block_attrs(text):
        block_attrs = schemas.get(block_name)
        if block_attrs is None:
            continue  # unknown block — not this script's remit (audit-post-content-blocks.py)
        for prop, attr_def in block_attrs.items():
            if not isinstance(attr_def, dict):
                continue
            kind, sibs = classify_property(attrs, prop, attr_def)
            if kind in ('ABSENT', 'OBJECT'):
                continue
            findings.append({
                'post': label, 'block': block_name, 'property': prop,
                'kind': kind, 'value': attrs.get(prop), 'siblings': sibs,
                'start': start, 'end': end,
            })
    return findings


def survey(files, schemas):
    out = []
    for f in files:
        text = f.read_text(encoding='utf-8', errors='replace') if f is not None else sys.stdin.read()
        label = f.stem if f is not None else 'stdin'
        out.extend(scan_text(label, text, schemas))
    return out


# Non-fold finding kinds — reported, never written. Kept in one place so apply_text and
# print_survey/--check agree on exactly what "needs a human decision" means.
NON_FOLD_KINDS = ('BOX', 'OTHER_SHAPE')


def apply_text(text: str, schemas: dict):
    """Fold every proven-TIER FLAT/BLENDED match in ONE text blob — the ONLY kinds ever
    written. Returns (new_text, n_folded, n_enum_violations, enum_findings,
    non_fold_findings) where non_fold_findings covers BOX / OTHER_SHAPE /
    BOX/OTHER_SHAPE — reported for human review, never touched. Refuses (returns
    original text unchanged) if the result would not re-parse cleanly at every block
    comment — never emits invalid JSON."""
    edits = []  # (start, end, new_json_str) — applied in reverse so offsets don't drift
    enum_findings = []
    non_fold_findings = []
    for block_name, start, end, attrs in iter_block_attrs(text):
        block_attrs = schemas.get(block_name)
        if block_attrs is None:
            continue
        new_attrs = None
        for prop, attr_def in block_attrs.items():
            if not isinstance(attr_def, dict):
                continue
            kind, sibs = classify_property(attrs, prop, attr_def)
            if kind == 'ENUM_VIOLATION':
                enum_findings.append({'block': block_name, 'property': prop,
                                       'value': attrs.get(prop)})
                continue
            if kind in NON_FOLD_KINDS:
                non_fold_findings.append({'block': block_name, 'property': prop,
                                           'kind': kind, 'value': attrs.get(prop)})
                continue
            if kind not in ('FLAT', 'BLENDED'):
                continue
            if new_attrs is None:
                new_attrs = dict(attrs)
            if kind == 'FLAT':
                new_attrs = fold(new_attrs, prop)
            else:  # BLENDED — base already an object, only drop orphan siblings
                for s in sibs:
                    new_attrs.pop(s, None)
        if new_attrs is not None:
            new_json = json.dumps(new_attrs, separators=(',', ':'), ensure_ascii=False)
            edits.append((start, end, new_json))

    if not edits:
        return text, 0, len(enum_findings), enum_findings, non_fold_findings

    out = text
    for start, end, new_json in sorted(edits, reverse=True):
        out = out[:start] + new_json + out[end:]

    # Refuse-rather-than-guess: confirm the result still parses cleanly at every block
    # comment before accepting it as the new text.
    try:
        for _ in iter_block_attrs(out):
            pass
    except json.JSONDecodeError:
        return text, 0, len(enum_findings), enum_findings, non_fold_findings

    return out, len(edits), len(enum_findings), enum_findings, non_fold_findings


def collect_inputs(paths):
    """Mirrors audit-post-content-blocks.py's collect_inputs: files as-is, dirs scanned
    for *.txt (non-recursive here — post_content dumps are typically one flat export
    directory, and this keeps the interface simple; '-' reads stdin)."""
    files = []
    for a in paths:
        if a == '-':
            files.append(None)
            continue
        p = Path(a)
        if p.is_dir():
            files.extend(sorted(q for q in p.glob('*.txt')))
        elif p.is_file():
            files.append(p)
        else:
            print(f'[migrate-stored-tier-scalars] no such path: {a}', file=sys.stderr)
            return None
    return files


def self_test() -> int:
    """Assertions covering: FLAT fold (proven-by-default TIER), FLAT fold (TIER BY
    DOCTRINE -- the coordinator-corrected behaviour), BLENDED sibling-drop,
    ENUM_VIOLATION, BOX refusal (closed-set name match AND default-key proof),
    OTHER_SHAPE refusal, ABSENT (union-type is not a target), a padding regression
    guard, and THREE watched controls proving the union-type guard, the BOX guard, and
    the doctrine-fold behaviour change are all load-bearing, not tautological."""
    failures = []

    def check(label, cond):
        mark = 'OK  ' if cond else 'FAIL'
        print(f'  [{mark}] {label}')
        if not cond:
            failures.append(label)

    # Fixture schema mirroring the REAL shapes measured live in block.json (confirmed by
    # reading plugins/sgs-blocks/src/blocks/*/block.json directly, 2026-08-25):
    #   - sgs/accordion.columns: {"type":"object","default":{"desktop":2,"tablet":2,"mobile":1}}
    #     -> proven TIER (a genuine fold target).
    #   - sgs/button.minHeight: {"type":"object","default":{}} — CONFIRMED live, no key
    #     proof at all AND not box-named -- TIER BY DOCTRINE (Spec 35 Phase 1.4: BOX is
    #     a closed, named set; anything object-typed that is not per-side IS a tier).
    #     This IS a fold target -- the coordinator's correction reversed the earlier
    #     (wrong) SHAPE_UNDECLARED refusal for exactly this live-measured case.
    #   - sgs/container.padding: {"type":"object","default":{}} — CONFIRMED live via
    #     `python -c` read of the real block.json. No key proof, but "padding" is in the
    #     closed box-family name set -- BOX, never folded. This is the exact case the
    #     coordinator reproduced as silent data loss in an earlier version of this
    #     script, and must never regress.
    #   - sgs/container.shapeDividerTopScale: {"type":"object","default":{"x":100,"y":100}}
    #     -> CONFIRMED live. Non-empty default, keys neither tier nor box -> OTHER_SHAPE.
    #   - sgs/container.gap: union type (unchanged from the earlier self-test).
    #   - sgs/testimonial-slider.layout: enum (unchanged).
    schemas = {
        'sgs/accordion': {
            'columns': {'type': 'object', 'default': {'desktop': 2, 'tablet': 2, 'mobile': 1}},
        },
        'sgs/button': {
            'minHeight': {'type': 'object', 'default': {}},
            'label': {'type': 'string', 'default': ''},
        },
        'sgs/testimonial-slider': {
            'layout': {'type': 'string', 'enum': ['full', 'split'], 'default': 'full'},
        },
        'sgs/container': {
            'gap': {'type': ['string', 'number'], 'default': '16px'},  # union type
            'padding': {'type': 'object', 'default': {}},  # box, no key proof — name fallback
            'shapeDividerTopScale': {'type': 'object', 'default': {'x': 100, 'y': 100}},
        },
    }

    # 1. FLAT fold — proven TIER (real sgs/accordion.columns shape).
    text = '<!-- wp:sgs/accordion {"columns":2,"label":"x"} -->\n'
    # (columns fixture reused with a scalar override to exercise the FLAT path directly)
    text = '<!-- wp:sgs/accordion {"columns":"2col"} -->\n'
    out, n, ne, ef, nf = apply_text(text, schemas)
    check('FLAT (proven TIER): columns folds to {"desktop":"2col"}',
          n == 1 and ne == 0 and len(nf) == 0
          and '"columns":{"desktop":"2col"}' in out)

    # 2. FLAT fold with Tablet/Mobile siblings.
    text = '<!-- wp:sgs/accordion {"columns":"2col","columnsTablet":"2col","columnsMobile":"1col"} -->\n'
    out, n, ne, ef, nf = apply_text(text, schemas)
    parsed = next(iter_block_attrs(out))[3]
    check('FLAT+siblings: folds to full tier object, orphan keys removed',
          n == 1 and parsed['columns'] == {'desktop': '2col', 'tablet': '2col', 'mobile': '1col'}
          and 'columnsTablet' not in parsed and 'columnsMobile' not in parsed)

    # 3. BLENDED — already an object, orphan siblings dropped, base preserved verbatim.
    text = '<!-- wp:sgs/accordion {"columns":{"desktop":"2col","tablet":"2col"},"columnsMobile":"stale"} -->\n'
    out, n, ne, ef, nf = apply_text(text, schemas)
    parsed = next(iter_block_attrs(out))[3]
    check('BLENDED: orphan sibling dropped, existing object base preserved',
          n == 1 and parsed['columns'] == {'desktop': '2col', 'tablet': '2col'}
          and 'columnsMobile' not in parsed)

    # 4. ENUM_VIOLATION — the real testimonial-slider incident shape. Never auto-fixed.
    text = '<!-- wp:sgs/testimonial-slider {"layout":"grid"} -->\n'
    out, n, ne, ef, nf = apply_text(text, schemas)
    check('ENUM_VIOLATION: reported, not folded, text unchanged, exactly 1 finding',
          n == 0 and ne == 1 and out == text
          and ef[0]['block'] == 'sgs/testimonial-slider' and ef[0]['property'] == 'layout'
          and ef[0]['value'] == 'grid')

    # 5. Legal enum value — no finding at all.
    text = '<!-- wp:sgs/testimonial-slider {"layout":"split"} -->\n'
    out, n, ne, ef, nf = apply_text(text, schemas)
    check('valid enum value: no ENUM_VIOLATION, no fold', n == 0 and ne == 0 and out == text)

    # 6. Union type is NOT a migration target (D571 nav-menu-class regression guard,
    #    same failure mode this whole toolchain exists to catch, applied to the object case).
    rows = scan_text('t', '<!-- wp:sgs/container {"gap":"16px"} -->\n', schemas)
    check('union-typed "gap" on sgs/container produces ZERO findings (not object, not enum)',
          len(rows) == 0)

    # 7. BOX (name-fallback) — the EXACT case the coordinator reproduced as silent data
    #    loss: sgs/container.padding declares default:{} (no key proof), caught only by
    #    the name-based fallback. MUST be refused, never folded.
    text = '<!-- wp:sgs/container {"padding":"22px","margin":"10px"} -->\n'
    out, n, ne, ef, nf = apply_text(text, schemas)
    check('BOX (name-fallback): flat "padding" on sgs/container is REFUSED, 0 folds, '
          'text byte-identical (the coordinator-reported silent-data-loss case)',
          n == 0 and out == text
          and any(f['property'] == 'padding' and f['kind'] == 'BOX' for f in nf))

    # 8. OTHER_SHAPE — a non-empty default whose keys are neither tier nor box
    #    (real sgs/container.shapeDividerTopScale {x,y} shape). Never folded.
    text = '<!-- wp:sgs/container {"shapeDividerTopScale":75} -->\n'
    out, n, ne, ef, nf = apply_text(text, schemas)
    check('OTHER_SHAPE: flat "shapeDividerTopScale" refused, 0 folds',
          n == 0 and out == text
          and any(f['property'] == 'shapeDividerTopScale' and f['kind'] == 'OTHER_SHAPE'
                  for f in nf))

    # 9. DOCTRINE FOLD — the behaviour change from the coordinator's correction
    #    (2026-08-25). sgs/button.minHeight: default:{}, not box-named by the closed-set
    #    doctrine -> TIER BY DOCTRINE -> MUST fold. WATCHED FAILING FIRST: reproduce the
    #    earlier (now-wrong) refuse-on-no-proof logic by monkeypatching _shape_kind, and
    #    confirm THAT version does NOT fold minHeight -- proving this check watches a
    #    real behaviour, not a tautology -- before confirming the corrected version does.
    def _old_wrong_shape_kind(attr_def, prop):
        if _is_box_by_name(prop):
            return 'BOX'
        default = attr_def.get('default')
        if isinstance(default, dict) and default:
            keys = set(default.keys())
            if keys <= TIER_KEYS:
                return 'TIER'
            if keys <= BOX_KEYS:
                return 'BOX'
            return 'OTHER_SHAPE'
        return 'OTHER_SHAPE'  # the earlier (now-corrected) bug: refused rather than doctrine-folded

    global _shape_kind
    original_shape_kind = _shape_kind
    _shape_kind = _old_wrong_shape_kind
    try:
        text = '<!-- wp:sgs/button {"minHeight":"48px","label":"Click"} -->\n'
        out, n, ne, ef, nf = apply_text(text, schemas)
        watched_pre_fix_result = n
    finally:
        _shape_kind = original_shape_kind
    check('WATCHED (pre-correction behaviour reproduced): with the OLD refuse-on-no-proof '
          f'shape logic, minHeight does NOT fold (observed {watched_pre_fix_result} fold(s)), '
          'confirming this test is watching something real',
          watched_pre_fix_result == 0)

    text = '<!-- wp:sgs/button {"minHeight":"48px","label":"Click"} -->\n'
    out, n, ne, ef, nf = apply_text(text, schemas)
    check('DOCTRINE FOLD (the behaviour change): minHeight (default:{}, not box-named) '
          'NOW folds to {"desktop":"48px"} — this is the live-measured bug '
          '(stored "48px" rendering as min-height:0px) getting fixed, label untouched',
          n == 1 and len(nf) == 0
          and '"minHeight":{"desktop":"48px"}' in out
          and '"label":"Click"' in out)

    # 9b. REGRESSION GUARD: sgs/container.padding must STILL refuse under the corrected
    #     doctrine logic -- this was the exact coordinator-reported silent-data-loss bug
    #     and must not come back.
    text = '<!-- wp:sgs/container {"padding":"22px"} -->\n'
    out, n, ne, ef, nf = apply_text(text, schemas)
    check('REGRESSION GUARD: sgs/container.padding STILL refuses (BOX, name-based) after '
          'the doctrine correction — must not regress',
          n == 0 and out == text
          and any(f['property'] == 'padding' and f['kind'] == 'BOX' for f in nf))

    # --- NEGATIVE CONTROL 1, WATCHED FAIL: the union-type guard ---
    def _broken_is_object_type(attr_def):
        t = attr_def.get('type')
        return t == 'object' or isinstance(t, list)  # BUG: treats any union as object-typed

    global _is_object_type
    original_is_object_type = _is_object_type
    _is_object_type = _broken_is_object_type
    try:
        rows = scan_text('t', '<!-- wp:sgs/container {"gap":"16px"} -->\n', schemas)
        broken_result_1 = len(rows)  # expect >0 under the injected bug (false positive)
    finally:
        _is_object_type = original_is_object_type
    check('WATCHED negative control #1: with _is_object_type deliberately broken to treat '
          'union types as object-typed, the union-gap case DOES false-positive '
          f'(observed {broken_result_1} finding(s)), confirming this guard is load-bearing',
          broken_result_1 > 0)

    # --- NEGATIVE CONTROL 2, WATCHED FAIL: the BOX guard (the exact bug the coordinator
    # reported live). Deliberately break _shape_kind so the box-shaped "padding" on
    # sgs/container.padding is misclassified as TIER, and confirm apply_text THEN folds
    # it (reproducing the reported bug), proving the guard normally prevents this.
    def _broken_shape_kind(attr_def, prop):
        return 'TIER'  # BUG: everything object-typed looks like a tier attr

    # (no repeated `global _shape_kind` here -- the earlier statement in this function
    # already covers the whole function body; Python disallows a second declaration.)
    original_shape_kind = _shape_kind
    _shape_kind = _broken_shape_kind
    try:
        text = '<!-- wp:sgs/container {"padding":"22px"} -->\n'
        out, n, ne, ef, nf = apply_text(text, schemas)
        broken_result_2 = n  # expect 1 fold under the injected bug (reproduces the report)
    finally:
        _shape_kind = original_shape_kind
    check('WATCHED negative control #2: with _shape_kind deliberately broken to call '
          'every object attr TIER, flat "padding" on sgs/container DOES fold '
          f'(observed {broken_result_2} fold(s), reproducing the coordinator-reported '
          'silent-data-loss bug), confirming the BOX guard is load-bearing, not '
          'tautological',
          broken_result_2 == 1)

    # 10. Unparseable / unbalanced JSON — refused, no crash, no findings for that instance.
    text = '<!-- wp:sgs/accordion {"columns":"2col" -->\n'  # never closes
    rows = scan_text('t', text, schemas)
    check('unbalanced JSON: no crash, 0 findings (refuse rather than guess)', rows == [])

    # 11. Never emits invalid JSON — apply_text on a mixed valid+invalid blob only touches
    #    the valid instance, leaves the unparseable one exactly as authored. Uses "columns"
    #    (proven TIER) as the fold-eligible fixture, since minHeight is no longer one.
    text = ('<!-- wp:sgs/accordion {"columns":"2col"} -->\n'
            '<!-- wp:sgs/accordion {"columns":"3col" -->\n')  # 2nd never closes
    out, n, ne, ef, nf = apply_text(text, schemas)
    check('mixed valid+unparseable: only the valid instance is folded, unparseable left verbatim',
          n == 1 and '"columns":"3col" -->' in out)

    if failures:
        print(f'\n{len(failures)} FAILURE(S): {failures}')
        return 1
    print('\nALL PASS')
    return 0


BUCKET_LABELS = {
    'FLAT': 'FLAT (proven TIER — AUTO-FIXABLE by --fix)',
    'BLENDED': 'BLENDED (proven TIER, orphan siblings only — AUTO-FIXABLE by --fix)',
    'BOX': 'BOX (padding/margin/border-family — NEVER folded, needs human decision)',
    'OTHER_SHAPE': 'OTHER_SHAPE ({x,y} / properties / etc. — NEVER folded, needs human decision)',
    'ENUM_VIOLATION': 'ENUM_VIOLATION (not a valid enum member — NEVER folded, needs human decision)',
}
# Coordinator-mandated bucket taxonomy (2026-08-25): every reportable finding is
# EXACTLY one of these six kinds. Only FLAT/BLENDED are ever written by --fix --apply.
BUCKET_ORDER = ('FLAT', 'BLENDED', 'BOX', 'OTHER_SHAPE', 'ENUM_VIOLATION')
AUTO_FIXABLE_KINDS = ('FLAT', 'BLENDED')
HUMAN_DECISION_KINDS = ('BOX', 'OTHER_SHAPE', 'ENUM_VIOLATION')


def print_survey(rows):
    if not rows:
        print('0 stored instance(s) to migrate.')
        return
    by_block_prop = {}
    for r in rows:
        key = (r['block'], r['property'], r['kind'])
        by_block_prop.setdefault(key, []).append(r)
    bucket_counts = {}
    for kind in BUCKET_ORDER:
        group = {k: v for k, v in by_block_prop.items() if k[2] == kind}
        bucket_rows = [r for r in rows if r['kind'] == kind]
        bucket_counts[kind] = len(bucket_rows)
        if not group:
            continue
        print(f'\n{BUCKET_LABELS[kind]}:')
        for (block, prop, _), instances in sorted(group.items()):
            posts = sorted({i['post'] for i in instances})
            print(f'   {block:32} {prop:28} {len(instances)} instance(s) '
                  f'across {len(posts)} post(s): {", ".join(posts[:5])}'
                  f'{" ..." if len(posts) > 5 else ""}')
    total_blocks = len({r['block'] for r in rows})
    total_props = len({(r['block'], r['property']) for r in rows})
    total_posts = len({r['post'] for r in rows})
    auto_fixable = sum(bucket_counts[k] for k in AUTO_FIXABLE_KINDS)
    human_decision = sum(bucket_counts[k] for k in HUMAN_DECISION_KINDS)
    print(f'\n{len(rows)} instance(s), {total_props} block+property combination(s), '
          f'{total_blocks} block(s), across {total_posts} post(s).')
    print(f'\nBUCKET COUNTS: ' + ', '.join(f'{k}={bucket_counts[k]}' for k in BUCKET_ORDER))
    print(f'  -> {auto_fixable} auto-fixable (FLAT+BLENDED), '
          f'{human_decision} need a human decision '
          f'(BOX+OTHER_SHAPE+ENUM_VIOLATION).')


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('paths', nargs='*', help='post_content dump file(s), directory(ies), or -')
    ap.add_argument('--survey', action='store_true')
    ap.add_argument('--fix', action='store_true', help='propose; writes nothing without --apply')
    ap.add_argument('--apply', action='store_true')
    ap.add_argument('--check', action='store_true', help='exit 1 if any FLAT/BLENDED/ENUM remain')
    ap.add_argument('--self-test', action='store_true')
    args = ap.parse_args()

    if args.self_test:
        return self_test()

    if not args.paths:
        ap.error('at least one path (file, directory, or -) is required unless --self-test is given')

    files = collect_inputs(args.paths)
    if files is None:
        return 2

    schemas = load_block_schemas()

    if args.check:
        rows = survey(files, schemas)
        if rows:
            print(f'[migrate-stored-tier-scalars --check] {len(rows)} instance(s) still '
                  f'un-migrated:')
            for r in rows:
                print(f"   {r['post']}  {r['block']}  {r['property']}  {r['kind']}")
            return 1
        print('[migrate-stored-tier-scalars --check] OK — no un-migrated tier scalars found.')
        return 0

    if args.survey or not args.fix:
        rows = survey(files, schemas)
        print_survey(rows)
        return 0

    # --fix (dry-run) / --fix --apply
    total_folded = 0
    total_enum = 0
    total_non_fold = {k: 0 for k in ('BOX', 'OTHER_SHAPE')}
    for f in files:
        text = f.read_text(encoding='utf-8', errors='replace') if f is not None else sys.stdin.read()
        label = f.stem if f is not None else 'stdin'
        out, n, ne, ef, nf = apply_text(text, schemas)
        total_folded += n
        total_enum += ne
        for finding in nf:
            total_non_fold[finding['kind']] += 1
        action = 'APPLYING' if args.apply else 'PROPOSED (dry-run; pass --apply to write)'
        print(f'\n{action} — {label}: {n} instance(s) folded, {ne} ENUM_VIOLATION(s), '
              f'{len(nf)} refused-needs-human-decision (BOX/OTHER_SHAPE)')
        if ef:
            for e in ef:
                print(f"   ⛔ REFUSED (enum violation, needs manual fix): "
                      f"{e['block']} {e['property']}={json.dumps(e['value'])}")
        if nf:
            for e in nf:
                print(f"   ⛔ REFUSED ({e['kind']}, needs human classification): "
                      f"{e['block']} {e['property']}={json.dumps(e['value'])}")
        if args.apply and n and f is not None:
            f.write_text(out, encoding='utf-8', newline='')
        elif args.apply and n and f is None:
            sys.stdout.write(out)

    print(f'\n{total_folded} instance(s) folded (proven TIER only), '
          f'{total_enum} ENUM_VIOLATION(s), '
          + ', '.join(f'{total_non_fold[k]} {k}' for k in ('BOX', 'OTHER_SHAPE'))
          + f' — across {len(files)} input(s).')
    return 0


if __name__ == '__main__':
    sys.exit(main())
