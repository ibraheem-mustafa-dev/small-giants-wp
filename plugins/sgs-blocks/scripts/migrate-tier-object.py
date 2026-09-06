#!/usr/bin/env python3
"""migrate-tier-object.py — collapse a flat per-device attribute trio into ONE tier object.

    <prop> / <prop>Tablet / <prop>Mobile   ->   <prop>: {"desktop":…, "tablet":…, "mobile":…}

Spec 35 / D549 / D554. Bean's ruling A is PROPERTY-BY-PROPERTY: one property is migrated
across every block that carries it, then the next. This script takes `--property` and does
exactly that, so each pass is the same edit repeated rather than 41 bespoke edits.

THE TRIAD (D542, and the reason this file exists at all): the thing that finds every
instance, the thing that fixes them and the thing that keeps them fixed are the SAME
detector. `--survey` (census) -> `--fix` (propose a diff) -> `--check` (gate).
⛔ `--fix` NEVER writes without `--apply`. Modelled on scripts/migrate-core-blocks/
(README.md:24 "lint -> judge -> apply"), and it copies that tool's load-bearing rule
(README.md:22): every source attr is mapped, dropped-with-reason, or flagged — a LOUD
failure, never a quiet loss.

WHAT IT DOES NOT DO, deliberately
---------------------------------
* **No stored-content migration.** Ruling B: old canary pages are binned, not converted.
  ⚠ Consequence, and it is not hypothetical — measured on the canary 2026-08-10 for `gap`:
  1,058 stored flat values across 230 posts (31 published, 7 draft, 191 revisions). Every
  one is silently coerced to the `{}` default by WordPress once the attr is object-typed,
  because WP discards a value whose shape contradicts the declaration. Those pages render
  with the CSS default until re-cloned. That is the accepted trade, not an oversight.
* **No render.php REWRITING (S3).** What matters for a render.php read isn't the read
  itself, it's what the surrounding code DOES with the value afterwards — trim()? cast?
  is_array() check? — a judgement call, not a schema edit. This is exactly where D569's
  and D570's real regressions lived (a `trim((string)$attr)` coercing an object to the
  literal string "Array"), so this script only DETECTS a RAW read (`render_state`) and
  never rewrites it.
  ⛔ **CORRECTED 2026-08-11 (D574) — the claim that used to sit here was FALSE and caused
  a live incident.** This paragraph used to assert *"blocks that delegate entirely to
  SGS_Container_Wrapper need no render.php change at all: the wrapper already reads an
  object value (class-sgs-container-wrapper.php:1948)"*. That is true ONLY for the reads
  around class-sgs-container-wrapper.php:2050-2067 (`sgs_responsive_normalise_object()`
  on `contentWidth`/`gridTemplateColumns` etc.) — it was FALSE for `minHeight` at the
  same file's line 323, which read `$attributes['minHeight']` raw plus the two DELETED
  `minHeightTablet`/`minHeightMobile` sibling attrs, and shipped `min-height:Array` to
  73 live declarations while silently never rendering the tablet/mobile tiers at all.
  Because every block that delegates to the wrapper was classified `DELEGATED` (= "done,
  nothing to check") purely on this unverified assumption, nothing ever surveyed the
  wrapper's OWN reads. Fixed by making the survey scan `includes/*.php` too (see "WHAT IT
  DOES DO" below) instead of trusting a claim about what the wrapper does — a claim this
  script never actually checked.
* **edit.js REWRITING (S2) is auto-applied, narrowly.** See `fix_edit_js` below — this is
  the one exception to "no JS/PHP rewriting", because the LEGACY control shape turned out
  to be a genuinely repeatable structural pattern (proven against two real historical
  examples, not assumed), unlike render.php's judgement-call problem above.

WHAT IT DOES DO (added Spec 35 pass 3b, 2026-08-11 — D571): CLASSIFY render.php and edit.js
state, not just count references. Session 6/7 evidence for why this exists: pass 3b's first
two dispatch attempts burned real agent time (one ~13 min, one duplicated in parallel for
another ~14 min — see D570) hand-re-reading every block's edit.js/render.php to answer "is
this ALREADY migrated, or does it still need the edit?", because the OLD `render_reads`/
`edit_refs` fields were raw regex hit-counts that stayed non-zero even on an already-correct
file (e.g. `value={ attributes.prop }` inside a working `<ResponsiveOverride>` still matches
a bare `\bprop\b` regex). `--survey` now reports an actual STATE per layer:

    render_state:  DELEGATED   prop never appears in render.php — wrapper handles it, done
                    NORMALISED prop is read via sgs_responsive_normalise_object(), done
                    RAW        prop is read as a raw $attributes['prop'] bracket access —
                               STILL NEEDS the render.php edit
                    UNCLEAR    prop appears but matches neither pattern — READ IT BY HAND,
                               never assume from this field alone

    edit_state:    SHARED      edit.js imports LayoutPanel/ContainerWrapperControls and does
                                NOT also locally destructure/wire this prop — the shared
                                component (fixed once) covers it, done
                    OVERRIDDEN a local <ResponsiveOverride> is wired directly to the object
                                attr (value={attributes.prop}, onChange writes prop: obj),
                                done
                    LEGACY      prop appears via the old flat-attrMap/ResponsiveControl
                                bridging pattern — STILL NEEDS the edit.js edit
                    UNCLEAR     prop appears but matches neither pattern — READ IT BY HAND
                    NONE        prop never appears in edit.js and no shared import found —
                                block does not expose a control for it at all

⛔ UNCLEAR is a REFUSAL to guess, same discipline as the block.json `--fix` refusing to write
invalid JSON. A human (or an agent) reads that specific file before touching it. This
classifier is pattern-matching, not a parser — it will not catch every future JSX/PHP
reshaping of these two controls, so if the shared components change shape again, update the
regexes here in the SAME commit (see `_EDIT_JS_OVERRIDE_RE`/`_RENDER_NORMALISED_RE` below).

WHAT IT DOES DO — PART 2 (added D574, 2026-08-11): SCAN SHARED INCLUDES, and detect two
specific HAZARD shapes wherever they appear (`includes/*.php` AND `src/blocks/*/render.php`),
not just count that a prop "appears". This closes the two-part gap that let `minHeight`,
`fontSize` (helpers-typography.php) and `fontSize` (heading/render.php) ship broken while
`--survey` reported 0 RAW findings across all 41 properties (D574 incident): (1) the OLD
survey only ever globbed `src/blocks/*/render.php` — the shared wrapper/helper files under
`includes/` were never in scope at all, and that is exactly where the highest-blast-radius
consumer lives (`class-sgs-container-wrapper.php` — reached by every delegating block); (2)
`render_state`'s literal bracket-key regex (`$attributes['prop']`) cannot see a COMPUTED key
access like `$attributes[ $k_size ]`, which is exactly how `helpers-typography.php` reads a
per-prefix attribute (`$k_size = sgs_typography_attr( $prefix, 'FontSize' )`, then `(string)
$attributes[ $k_size ]`).

`shared_include_files()` walks every `.php` under `includes/` (recursively — `trustpilot/`
etc.). `_scan_file_for_hazards(path, prop, declared_siblings)` is applied to that list AND to
every `src/blocks/*/render.php` (universal, not carve-out — R-31-9), and reports two hazard
kinds, both HIGH-CONFIDENCE (not "prop appears", an actual dangerous SHAPE):

    DELETED_SIBLING_READ   a literal `$attributes['<prop>Tablet']` / `['<prop>Mobile']`
                            bracket read, where `<prop>Tablet`/`Mobile` is declared by
                            NO block.json any more (declared_siblings is the live UNION
                            across every block.json — never hardcoded; a read stays
                            legitimate as long as ONE block still carries the flat sibling).
                            This is exactly the wrapper's `$attributes['minHeightTablet']`
                            bug: once every block finished the S1 migration the attr was
                            gone everywhere, but the wrapper kept reading it and got `''`.

    RAW_CAST                an UNGUARDED `(string) $attributes['prop']` — or, via a
                            computed-key alias built by a `$k = helper( ..., 'PropPascal' )`
                            call (the typography-helper shape) — `(string)
                            $attributes[ $k ]` — with no `is_array()` /
                            `sgs_responsive_normalise_object()` guard on that same key/alias
                            anywhere in the file. PHP array-to-string-coerces to the literal
                            "Array", which is D569/D570's and D574's exact bug class.

A file/prop pair with either hazard is folded into `render_state`'s existing `RAW` bucket
(same vocabulary, not a new state) — but the SPECIFIC finding (line, kind, detail) is always
printed, because "RAW" alone was too coarse to have caught these two before this pass. This
is DETECTION ONLY, matching S3's existing rule: no auto-rewrite, because what's SAFE to do
about a hazard depends on what the surrounding code does with the guarded value afterwards —
a judgement call, not a schema edit (see "No render.php REWRITING (S3)" above).

⛔ Still pattern-matching, not a parser, and it has its own known blind spots, recorded here
rather than discovered again: it will not catch a THIRD level of indirection (an alias of an
alias), a guard that lives in a DIFFERENT file than the read, or a cast spelled
`strval( $attributes['prop'] )`/`.''` string-coercion by concatenation rather than `(string)`.
Extend the regexes in the SAME commit if a new hazard shape like these is found.

`--fix` still only writes block.json (S1). render.php (S3) and edit.js (S2) fixes are NOT
auto-applied by this script — the survey tells you exactly which blocks need them and in
which file, so route those to a human or a small parallel per-block dispatch, not a script
that guesses at JSX. See `plugins/sgs-blocks/CLAUDE.md` "Survey detectors" section for how
this fits the wider census -> fix -> gate triad (D542).

THE THREE FAMILY SHAPES, and why only one of them is a target
-------------------------------------------------------------
    FLAT      base scalar + Tablet/Mobile siblings          -> MIGRATE
    BLENDED   base object + scalar siblings (half-migrated) -> DROP the orphan siblings
    OBJECT    base object, no siblings                      -> already done, skip

⛔ A base object WITH OBJECT siblings is NOT blended and is NOT a target: a per-tier ASSET
family (D521) and a per-tier BOX family (D496) are object at every tier by design. The
sibling's TYPE must differ from the base for the family to be half-migrated — same
discriminator as check-tier-storage-shape.py, deliberately, so gate and codemod agree.
"""

import argparse
import functools
import io
import json
import re
import sqlite3
import sys
from pathlib import Path

# Windows consoles default to cp1252 and raise UnicodeEncodeError on any non-ASCII
# output — which would crash this tool AFTER it had already written files, leaving a
# half-applied migration. Standing repo rule for Python scripts on this machine.
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

REPO = Path(__file__).resolve().parents[3]
BLOCKS_DIR = REPO / 'plugins' / 'sgs-blocks' / 'src' / 'blocks'
INCLUDES_DIR = REPO / 'plugins' / 'sgs-blocks' / 'includes'
TIERS = ('Tablet', 'Mobile')

# The framework DB. A DERIVED COPY of block.json, repopulated by /sgs-update — never the
# source of truth (migrate-core-blocks/driver.py:78 says so explicitly). That is exactly why
# declared_siblings() below reads it AND crosschecks it against disk instead of trusting it.
SGS_DB = Path.home() / '.claude' / 'skills' / 'sgs-wp-engine' / 'sgs-framework.db'
NEWLINE = chr(10)  # keeps the parity message readable without escapes in f-strings

# The immutable commit whose class-sgs-container-wrapper.php still carries the pre-fix
# minHeight shape (RAW + two DELETED_SIBLING_READ). Used by self_test() as a historical
# fixture. NEVER replace this with a moving ref — see the note in self_test().
_PRE_FIX_WRAPPER_SHA = 'e7f28b0fd'


def _base_attr_spec(attrs: dict, prop: str):
    """The base attribute's OWN declaration dict, or `None` if it isn't declared at all.

    ⛔ **The base declaration is not always the bare `prop` key.** Three families
    (`sgs/brand-strip.columns`, `sgs/hero.textAlign`, `sgs/whatsapp-cta.showOn`) declare
    their desktop-tier attribute as `<prop>Desktop` instead of bare `<prop>` — the same
    two-name ambiguity `programme-progress.py`'s `classify_families()` already had to
    handle for the DB-derived view (see that function's `base_bare`/`base_desktop`/
    `base_name` — this mirrors that logic exactly, disk-side). A bare-only lookup
    (`attrs.get(prop)`) sees no dict at either of these three, classifies ABSENT, and the
    census silently drops them — verified 2026-08-25: DB-derived flat families = 37,
    disk-derived (pre-fix) = 34, a 3-family gap entirely explained by this ambiguity.
    Prefer the bare name when BOTH exist (there is no known case of that today, but bare
    is the eventual/canonical target shape post-migration, so it wins ties). Shared by
    `classify()` (the FLAT/BLENDED/OBJECT/ASSET/ABSENT gate) and `survey()`'s own
    `default`/`base_type` report fields, so the two can never quietly disagree about
    which key IS the base."""
    base_bare = attrs.get(prop)
    if isinstance(base_bare, dict):
        return base_bare
    base_desktop = attrs.get(prop + 'Desktop')
    if isinstance(base_desktop, dict):
        return base_desktop
    return None


def _base_attr_key(attrs: dict, prop: str):
    """The actual JSON key holding the base declaration — `prop` or `prop + 'Desktop'`
    (see `_base_attr_spec` above for why). Returns None if neither is declared.

    S4 fix (2026-09-02, uniformity sweep): `apply_block_json` used to subscript
    `attrs[prop]` directly, assuming the bare key always exists — it doesn't for the
    three `<prop>Desktop`-base families (columns/textAlign/showOn), so `--fix` crashed
    with an uncaught KeyError the moment it reached one, aborting the whole batch.
    Callers now resolve the real key through this helper first."""
    if isinstance(attrs.get(prop), dict):
        return prop
    if isinstance(attrs.get(prop + 'Desktop'), dict):
        return prop + 'Desktop'
    return None


# S4 fix (2026-09-02, uniformity sweep): a SHAPE test alone (base + all responsive
# siblings are scalars of the same type) cannot distinguish a genuine flat-scalar fold
# candidate (columns/textAlign/backgroundOverlayOpacity/showOn) from an art-directed
# MEDIA REFERENCE (imageId/imageUrl/videoUrl/svgContent/...), which Bean's C19 ruling
# forbids ever folding into a per-breakpoint object — each tier's image/video/SVG is a
# genuinely independent piece of content, not a responsive VALUE of one property.
# Universal file-reference NAME test, not a hardcoded attr list (R-31-1): an attribute
# whose bare name ends in one of these suffixes IS the file reference by construction —
# a WP attachment ID, a URL, or raw embedded content. Verified against the live tree
# (2026-09-02): matches all 17 known art-directed media attrs across
# decorative-image/media/responsive-logo/before-after/hero, and does NOT match any of
# columns/textAlign/backgroundOverlayOpacity/showOn/videoAutoplay/videoControls/
# videoLazyLoad/videoLoop/videoMuted/videoPlaysInline/splitMediaObjectPosition/
# splitMediaType/splitMediaWidth — the negative control this fix requires.
_FILE_REFERENCE_SUFFIXES = ('Id', 'Url', 'Content')


def _is_file_reference_attr(prop: str) -> bool:
    return prop.endswith(_FILE_REFERENCE_SUFFIXES)


# C19 companion-field fix (2026-09-06, tier-object migration Phase 2). The suffix test
# above protects `splitImageUrl`/`splitImageId` themselves, but missed the mistake that
# actually shipped: `splitImageAlt` doesn't end in Id/Url/Content, so it fell through to
# FLAT and got folded — wrong, because it's alt text describing whichever image is
# rendering at that tier, not an independent value of its own (see hero/render.php's
# `$sgs_hero_resolve_split_image()`, which reads `splitImageAlt<suffix>` alongside
# `splitImageUrl<suffix>`/`splitImageId<suffix>` as one unit per tier).
#
# Structural detection, not a second hardcoded attr list (R-31-1): a companion field
# shares a PascalCase name STEM with a real, declared file-reference attribute on the
# same block (`splitImageAlt` stems from `splitImageUrl`'s "splitImage"), with a capital
# letter immediately after the stem so a coincidental substring match (e.g. an unrelated
# "imageQualityHint" attr merely containing "image") can't false-positive.
def _companion_media_stem(attrs: dict, prop: str) -> bool:
    """True if `prop` travels alongside an already-declared file-reference attribute
    on the same block — same name stem, PascalCase word boundary."""
    for other in attrs:
        if other == prop or not _is_file_reference_attr(other):
            continue
        for suffix in _FILE_REFERENCE_SUFFIXES:
            if other.endswith(suffix):
                stem = other[: -len(suffix)]
                break
        else:
            continue
        if stem and prop.startswith(stem) and len(prop) > len(stem) and prop[len(stem)].isupper():
            return True
    return False


# Phase 2 fix (2026-09-06, tier-object migration): classify()'s ASSET branch could not
# distinguish a genuine per-tier ASSET family (backgroundImage/backgroundImageTablet/
# backgroundImageMobile — three independent media references, correctly NOT a migration
# target) from a BOX-OF-SIDES family declared three times, once per device
# (padding/paddingTablet/paddingMobile — a box_family attribute that SHOULD fold into one
# tier-of-boxes object, exactly the shape contentBandPadding already uses). Both shapes are
# "object base + object siblings of the same type" at the block.json level, so the old
# ASSET test reported both as "correct as-is" — verified live: `--survey --property padding`
# reported "0 block(s) to migrate" against a real 63-block unmigrated surface (Ship-PM,
# adversarial council, 2026-09-06).
#
# The discriminator is the DB's `box_family` column — the SAME column the converter's
# `box_family_for()`/`tier_object_base()` already treat as the sole legitimate gate for
# this exact question (R-31-1: never re-derive from the attr NAME). A read-only,
# structural check: does ANY of this family's siblings carry a non-null box_family? A
# genuine box-of-sides family's siblings DO (measured: sgs/container.paddingTablet ->
# box_family='padding'); a genuine per-tier ASSET family's siblings do NOT (measured:
# sgs/container.backgroundImageTablet -> box_family=None).
#
# ⛔ Deliberately a lightweight read-only sqlite3 query here, NOT an import of
# `converter/db/db_lookup.py` — that module runs schema-migration side effects on import
# (confirmed live this session: importing it deleted 2 stale `roles.json`-orphaned rows as
# an "intended reconciliation" the module docstring never surfaces to a caller expecting a
# read). A survey/census tool must never become a writer as a side effect of being run.
@functools.lru_cache(maxsize=4096)
def _sibling_box_family(block_slug: "str | None", sibling_attr: str) -> "str | None":
    """Read-only: the DB's `box_family` for one sibling attr, or None if unknown/absent.

    Returns None immediately (no DB hit) when `block_slug` is unavailable — every existing
    self-test fixture calls `classify()` with a synthetic dict and no real block slug, and
    must keep classifying exactly as before this fix (ASSET, not BOX_FLAT) rather than
    silently querying a real block's DB row for a fabricated attribute name."""
    if not block_slug or not SGS_DB.exists():
        return None
    con = sqlite3.connect(f'file:{SGS_DB}?mode=ro', uri=True)
    try:
        row = con.execute(
            'SELECT box_family FROM block_attributes WHERE block_slug = ? AND attr_name = ?',
            (block_slug, sibling_attr),
        ).fetchone()
    finally:
        con.close()
    return row[0] if row and row[0] else None


def classify(attrs: dict, prop: str, block_slug: "str | None" = None):
    """Return (kind, sibling_names). kind in
    FLAT|BLENDED|OBJECT|ASSET|BOX_FLAT|ABSENT|ART_DIRECTED_MEDIA.

    `block_slug` is optional (defaults to None, preserving every existing self-test
    fixture's behaviour byte-for-byte) — pass the real block slug from `survey()`'s own
    disk scan to enable the BOX_FLAT discrimination below.

    See `_base_attr_spec()` for why the base lookup isn't a plain `attrs.get(prop)`."""
    spec = _base_attr_spec(attrs, prop)
    if spec is None:
        return 'ABSENT', []
    base_type = spec.get('type')
    sibs = [prop + t for t in TIERS if isinstance(attrs.get(prop + t), dict)]
    if base_type == 'object':
        if not sibs:
            return 'OBJECT', []
        # Sibling type must DIFFER from the base for this to be half-migrated.
        if all(attrs[s].get('type') == 'object' for s in sibs):
            if any(_sibling_box_family(block_slug, s) for s in sibs):
                # A box_family-tagged sibling means THIS is padding/margin/borderRadius's
                # shape: the same box declared once per device tier, not a genuine
                # per-tier asset. It needs the box-of-sides -> tier-of-boxes fold (a
                # separate codemod — this kind is deliberately excluded from every
                # MIGRATABLE filter in THIS script, same construction as
                # ART_DIRECTED_MEDIA, so it is reported, never silently folded here).
                return 'BOX_FLAT', sibs
            return 'ASSET', sibs          # consistent per-tier object family — correct as-is
        return 'BLENDED', sibs
    if not sibs:
        return 'ABSENT', []
    if _is_file_reference_attr(prop) or _companion_media_stem(attrs, prop):
        # C19-protected: would otherwise classify FLAT (scalar base + scalar siblings),
        # but every MIGRATABLE filter in this script checks kind in ('FLAT', 'BLENDED')
        # only, so this kind is excluded from every --survey/--fix/--check operation by
        # construction — never folded, never silently dropped from the report either.
        return 'ART_DIRECTED_MEDIA', sibs
    return 'FLAT', sibs


def reads_attr_directly(block_dir: Path, prop: str, base_key: str = None) -> int:
    """`base_key` is the actual JSON key holding the base declaration (`_base_attr_key`) —
    `prop` for the common case, `prop + 'Desktop'` for the three families whose base
    declares suffixed (see `_base_attr_spec`). Defaults to `prop` so every existing call
    site (self-test fixtures included) is unchanged when the caller doesn't have it."""
    rp = block_dir / 'render.php'
    if not rp.exists():
        return 0
    src = rp.read_text(encoding='utf-8', errors='replace')
    base = re.escape(base_key or prop)
    prop_re = re.escape(prop)
    return len(re.findall(
        r"\[['\"](?:" + base + r"|" + prop_re + r"Tablet|" + prop_re + r"Mobile)['\"]\]", src))


def edit_refs(block_dir: Path, prop: str, base_key: str = None) -> int:
    """See `reads_attr_directly`'s `base_key` note — same widening, same default."""
    ej = block_dir / 'edit.js'
    if not ej.exists():
        return 0
    src = ej.read_text(encoding='utf-8', errors='replace')
    base = re.escape(base_key or prop)
    prop_re = re.escape(prop)
    return len(re.findall(
        r"\b(?:" + base + r"|" + prop_re + r"Tablet|" + prop_re + r"Mobile)\b", src))


# Added D574 (2026-08-11) — see the module docstring's "WHAT IT DOES DO — PART 2" section.
# Root cause of the incident this closes: the survey's file scope stopped at
# `src/blocks/*/render.php` and never looked at `includes/*.php`, which is exactly where
# the highest-blast-radius consumer (SGS_Container_Wrapper) lives.

def shared_include_files():
    """Every `.php` file under `includes/`, recursively (covers subfolders like
    `trustpilot/`), sorted for stable output. DB-first / no-hardcoded-roster (R-31-1):
    this is a live directory walk, never a maintained list of "the includes that matter" —
    that list is exactly what went stale and let class-sgs-container-wrapper.php go
    unscanned."""
    return sorted(INCLUDES_DIR.rglob('*.php'))


def _disk_declared_siblings(prop: str) -> set:
    """The DISK half. Which `<prop>Tablet` / `<prop>Mobile` suffixes are declared by ANY
    block.json on disk right now — derived the same way `classify()` derives its own sibling
    list, so the two can never quietly disagree.

    This used to BE the answer (as `declared_siblings`). It is now the GUARD: the answer
    comes from the DB (R-31-1, DB-first), and this walk is what proves the DB has not gone
    stale against the tree. See `declared_siblings()`."""
    declared = set()
    for bj in sorted(BLOCKS_DIR.glob('*/block.json')):
        try:
            data = json.loads(bj.read_text(encoding='utf-8'))
        except json.JSONDecodeError:
            continue
        attrs = data.get('attributes', {})
        for t in TIERS:
            if (prop + t) in attrs:
                declared.add(t)
    return declared


def _db_declared_siblings(prop: str) -> set:
    """The DB half. Same question, asked of `block_attributes` in one SELECT.

    ⛔ `source='sgs'` IS LOAD-BEARING, and its absence is the trap this function exists to
    document. `block_attributes` also holds 507 `native_wp` rows for CORE blocks, which have
    no directory under `src/blocks/` at all — so an unfiltered SELECT returns a set that is
    WIDER than disk, not narrower. Measured 2026-08-24: `isStackedOnMobile` on `core/columns`
    and `core/media-text` are the only two such rows in the tier-sibling space, and both would
    have leaked in. Every documented caveat about this table warns of OMISSIONS; this is the
    opposite failure and nothing warned about it.

    Raises rather than falling back to disk on a missing/unreadable DB: a silent fallback
    would make the DB read decorative and the DB-first claim untrue."""
    if not SGS_DB.exists():
        raise RuntimeError(
            f'framework DB not found at {SGS_DB} — cannot answer DB-first. '
            'Run /sgs-update to build it. (Refusing to fall back to the disk walk: a silent '
            'fallback makes the DB read decorative and the R-31-1 claim false.)')
    names = [prop + t for t in TIERS]
    placeholders = ','.join('?' * len(names))
    try:
        con = sqlite3.connect(f'file:{SGS_DB}?mode=ro', uri=True)
    except sqlite3.Error as exc:
        raise RuntimeError(f'framework DB at {SGS_DB} could not be opened read-only: {exc}')
    try:
        rows = con.execute(
            'SELECT DISTINCT attr_name FROM block_attributes '
            "WHERE source = 'sgs' AND block_slug NOT LIKE 'core/%' "
            f'AND attr_name IN ({placeholders})', names).fetchall()
    except sqlite3.Error as exc:
        raise RuntimeError(f'framework DB query failed: {exc}')
    finally:
        con.close()
    found = {r[0] for r in rows}
    return {t for t in TIERS if (prop + t) in found}


class TierSiblingParityError(RuntimeError):
    """The DB and the tree disagree about which tier siblings are declared."""


def declared_siblings(prop: str) -> set:
    """Which `<prop>Tablet` / `<prop>Mobile` suffixes are STILL declared by ANY block.

    Answered from `block_attributes` (R-31-1, DB-first) and CROSSCHECKED against the tree,
    failing closed on disagreement.

    ⛔ Why not DB-only. `sgs-framework.db` is a DERIVED COPY repopulated by /sgs-update, and
    `classify()` still reads block.json directly. A DB-only answer here could therefore
    disagree with `classify()` silently — and `--fix --apply` WRITES block.json, so the DB
    goes stale the moment the fixer runs and stays stale until the next reseed. That is the
    exact D575 shape: the wrapper kept reading `minHeightTablet`/`minHeightMobile` after every
    block had migrated, got `''` back, and shipped `min-height:Array` to 73 live declarations.

    A shared include has no single "owning" block, so a literal read of `<prop>Tablet` in e.g.
    class-sgs-container-wrapper.php is legitimate as long as AT LEAST ONE block still declares
    that sibling (some other block may still be flat, mid property-by-property migration).
    Only once EVERY block has migrated does the read become provably dead."""
    db = _db_declared_siblings(prop)
    disk = _disk_declared_siblings(prop)
    if db != disk:
        raise TierSiblingParityError(
            NEWLINE.join([
                f'tier-sibling parity FAILED for "{prop}":',
                f'  DB   ({SGS_DB.name}) says: {sorted(db) or "none"}',
                f'  disk (src/blocks/*/block.json) says: {sorted(disk) or "none"}',
                'The framework DB is a derived copy — this almost always means '
                '/sgs-update has not been run since a block.json changed. Reseed, then '
                're-run. Refusing to guess which side is right: a wrong answer here marks '
                'a LIVE dead-sibling read as legitimate (D575).',
            ]))
    return db


def _disk_tier_pairs() -> set:
    """Every (block_slug, attr_name) on disk whose attr ends in a tier suffix."""
    pairs = set()
    for bj in sorted(BLOCKS_DIR.glob('*/block.json')):
        try:
            data = json.loads(bj.read_text(encoding='utf-8'))
        except json.JSONDecodeError:
            continue
        slug = data.get('name', bj.parent.name)
        for attr in data.get('attributes', {}):
            if attr.endswith(TIERS):
                pairs.add((slug, attr))
    return pairs


def _db_tier_pairs() -> set:
    """The same set, from block_attributes. `source='sgs'` filter as per _db_declared_siblings."""
    if not SGS_DB.exists():
        raise RuntimeError(f'framework DB not found at {SGS_DB} — run /sgs-update.')
    con = sqlite3.connect(f'file:{SGS_DB}?mode=ro', uri=True)
    try:
        rows = con.execute(
            'SELECT block_slug, attr_name FROM block_attributes '
            "WHERE source = 'sgs' AND block_slug NOT LIKE 'core/%'").fetchall()
    finally:
        con.close()
    return {(s, a) for s, a in rows if a.endswith(TIERS)}


def all_tier_properties() -> list:
    """Every base property with at least one declared tier sibling, DB-first and crosschecked.

    This is the property roster `--all-properties` iterates. It is derived from the same two
    sources as declared_siblings() so the two can never disagree about what exists."""
    check_db_parity(quiet=True)
    bases = set()
    for _slug, attr in _db_tier_pairs():
        for t in TIERS:
            if attr.endswith(t):
                bases.add(attr[:-len(t)])
                break
    return sorted(b for b in bases if b)


def check_db_parity(quiet: bool = False) -> int:
    """Gate: the framework DB and the tree must agree about every declared tier sibling.

    ⛔ Compares (block_slug, attr_name) PAIRS, not suffix sets. A suffix-level comparison
    passes whenever both sides are non-empty — so the DB could claim `gapTablet` on five
    blocks while disk has four and the check would still go green. The pair level is the
    level at which a stale row actually misleads.

    Exit 0 = agree. Exit 1 = disagree, with both sides named. This gate is GREEN from the day
    it is registered, which is NOT the shape THE-MIGRATION-METHOD.md Step 8 describes (it
    assumes a gate that is red until the migration lands). This one guards a derived copy
    against its source; there is nothing for it to be red about until /sgs-update lags."""
    try:
        db = _db_tier_pairs()
    except RuntimeError as exc:
        print(f'FAIL  {exc}')
        return 1
    disk = _disk_tier_pairs()
    only_db = sorted(db - disk)
    only_disk = sorted(disk - db)
    if not only_db and not only_disk:
        if not quiet:
            print(f'OK  tier-sibling parity: {len(db)} (block, attr) pairs, DB and tree agree.')
        return 0
    print('FAIL  tier-sibling parity: the framework DB and the tree disagree.')
    print(f'      DB pairs: {len(db)}   disk pairs: {len(disk)}')
    for slug, attr in only_db:
        print(f'      in DB, NOT on disk : {slug:32} {attr}   (stale row — reseed?)')
    for slug, attr in only_disk:
        print(f'      on disk, NOT in DB : {slug:32} {attr}   (unseeded — run /sgs-update)')
    print('      A stale row here marks a LIVE dead-sibling read as legitimate (D575).')
    return 1


def _has_working_object_path(src: str, prop: str) -> bool:
    """True when THIS file also contains a LIVE object-emission path for `prop` — proof
    that a deleted-sibling read for the same prop, in the same file, is dead code rather
    than a live defect.

    ⛔ **Discriminator corrected 2026-08-11, same day, after a false-positive was proven
    against real source (coordinator review).** The first version of this detector treated
    "reads a deleted `<prop>Tablet`/`<prop>Mobile` sibling" as sufficient on its own to fail
    `--check`. That is WRONG: `class-sgs-container-wrapper.php:236-245` (gridTemplateColumns),
    `:394` (maxWidth) and `:505` (contentWidth) all carry an explicit `⚠ LEGACY FLAT PATH, now
    UNREACHABLE` comment, and — verified directly against the file — each of `gap`,
    `gridTemplateColumns` and `contentWidth` has a SECOND, WORKING read a few hundred lines
    later (`class-sgs-container-wrapper.php:2098/2105/2111`, the `is_array( $attributes['gap'] )`
    guard that feeds `$obj_inner_props` and is genuinely emitted). The deleted-sibling read is
    dead code AWAITING a cleanup commit, not a bug — `gap`/`contentWidth`/`gridTemplateColumns`
    all render correctly today via that second path.

    `minHeight` was different, and that difference is the actual signal: pre-fix, it had NO
    second path anywhere in the file — the flat/deleted-sibling read WAS the only attempt,
    which is why it emitted `min-height:Array` and silently dropped tablet/mobile entirely.

    So the real discriminator is not "does a deleted-sibling read exist" but "does this file
    ALSO have a working object path for this prop" — checked here as any of THREE shapes
    actually used in this codebase: the newer `sgs_responsive_normalise_object(
    $attributes['prop'] )` call (what minHeight's own fix uses), the inline
    `is_array( $attributes['prop'] )` guard that feeds `$obj_inner_props` (what gap/
    contentWidth/gridTemplateColumns still use in class-sgs-container-wrapper.php), or the
    TWO-STEP form — read into a local variable first, THEN `is_array()` on that variable —
    confirmed live at `helpers-container.php:147-148`'s `sgs_container_tier_gap()`:
    `$raw = $attributes['gap'] ?? ''; if ( is_array( $raw ) ) { $by_tier = $raw; } else {
    $by_tier = array( … 'tablet' => $attributes['gapTablet'] ?? '' … ); }` — the deleted-
    sibling reads there only run in the `else` (legacy-scalar) branch, so once every block
    carries the object shape that branch is dead too, by the identical reasoning.

    ⛔ **Broadened same session** after `gap --check` still false-failed on
    `helpers-container.php` post the first correction — the inline-only regex missed this
    exact two-step shape. Per this repo's rule: broaden the detector, never dump a proven
    false positive into a baseline.

    ⚠ **Known limitation, recorded rather than silently accepted:** the two-step regex
    matches "assign then `is_array()`", not "assign then `is_array()` then genuinely EMIT
    something" — so a guard that merely nullifies the array to `''` and discards it (as
    the wrapper's OWN dead legacy line does for `gap`: `$gap = is_array( $gap ) ? '' :
    $gap;`) also satisfies it, even though that specific guard leads nowhere on its own.
    This has not produced a wrong verdict in this codebase: every two-step match checked
    either genuinely emits (helpers-container.php's `$by_tier` truly feeds
    `sgs_container_gap_value()`) or co-occurs with the inline shape ALSO being present in
    the same file (gap's wrapper has both), so the classification is correct either way.
    If a future property has ONLY a discard-to-empty two-step guard and no other path,
    this would wrongly downgrade a live bug — tighten the regex to require the guarded
    variable feed something beyond a ternary discard if that's ever observed for real.

    Absence of ALL THREE shapes means the deleted-sibling read is genuinely the only path —
    the live-bug shape — and must still fail `--check`."""
    if re.search(r"is_array\(\s*\$attributes\[['\"]" + re.escape(prop) + r"['\"]\]\s*\)", src):
        return True
    if re.search(
        r"sgs_responsive_normalise_object\(\s*\$attributes\[['\"]" + re.escape(prop) + r"['\"]\]",
        src,
    ):
        return True
    # Two-step: `$var = $attributes['prop'] ?? …;` followed, somewhere later in the same
    # file, by `is_array( $var )` on that SAME variable name. Window capped at 400 chars so
    # an unrelated later reassignment of a common name like `$raw` can't false-match across
    # a huge file — generous enough to span the handful of lines a real guard sits within
    # (confirmed against helpers-container.php's real 1-line gap: assignment then guard on
    # the very next line), never so wide it reaches into an unrelated function.
    for am in re.finditer(
        r"\$(\w+)\s*=\s*\$attributes\[['\"]" + re.escape(prop) + r"['\"]\]\s*(?:\?\?[^;]*)?;",
        src,
    ):
        var = am.group(1)
        window = src[am.end():am.end() + 400]
        if re.search(r"is_array\(\s*\$" + re.escape(var) + r"\s*\)", window):
            return True
    return False


def _scan_file_for_hazards(src: str, prop: str, declared_siblings: set) -> list:
    """Scan ONE already comment-stripped PHP source string for the hazard shapes a coarse
    "prop appears raw" regex cannot reliably distinguish from a safe read. Returns a list of
    finding dicts: `{'line': int, 'kind': ..., 'detail': str}`. `kind` is one of
    `DELETED_SIBLING_READ` (live bug — no working object path elsewhere in this file),
    `DELETED_SIBLING_READ_INERT` (informational only — a working object path exists, so this
    read is proven dead code, per `_has_working_object_path`'s docstring) or `RAW_CAST` (live
    bug — see Hazard 2a/2b; NOT downgraded by an object path existing elsewhere, because
    heading/render.php's real bug had a WORKING tiered path in the same file and the
    unguarded legacy-string cast was STILL live). Empty list = no hazard found in THIS file.

    Takes already-stripped `src` (not a path) so the caller computes `_strip_php_comments`
    and `_has_working_object_path` exactly once per file, instead of re-reading/re-stripping
    per hazard type.
    """
    findings = []
    has_obj_path = _has_working_object_path(src, prop)

    # --- Hazard 1: a literal bracket read of a TIER SIBLING that no block.json declares
    # any more. This is the exact shape of the wrapper's minHeight bug: `minHeightTablet`/
    # `minHeightMobile` were read raw long after every block.json had dropped them — BUT
    # ONLY a live bug when `has_obj_path` is False (see `_has_working_object_path`).
    for tier in TIERS:
        if tier in declared_siblings:
            continue  # still legitimately declared by at least one block — not dead
        sib = prop + tier
        for m in re.finditer(r"\[['\"]" + re.escape(sib) + r"['\"]\]", src):
            if has_obj_path:
                findings.append({
                    'line': src.count('\n', 0, m.start()) + 1,
                    'kind': 'DELETED_SIBLING_READ_INERT',
                    'detail': f'reads "{sib}" — no block.json declares this attribute any '
                              f'more, but this file ALSO has a working object-emission path '
                              f'for "{prop}" (is_array()/sgs_responsive_normalise_object() '
                              f'guard elsewhere in the same file) — this read is dead code, '
                              f'not a live defect (informational only, does not fail --check)',
                })
            else:
                findings.append({
                    'line': src.count('\n', 0, m.start()) + 1,
                    'kind': 'DELETED_SIBLING_READ',
                    'detail': f'reads "{sib}" — no block.json declares this attribute any '
                              f'more, and this file has NO working object-emission path for '
                              f'"{prop}" — this is the live-bug shape (minHeight\'s exact '
                              f'pre-fix defect)',
                })

    # --- Hazard 2a: a direct unguarded `(string)` cast on a LITERAL bracket read —
    # `(string) $attributes['prop']`. This is heading/render.php's exact pre-fix shape:
    # the raw object PHP-coerces to the literal string "Array".
    for m in re.finditer(
        r"\(string\)\s*\$attributes\[\s*['\"]" + re.escape(prop) + r"['\"]\s*\]", src
    ):
        findings.append({
            'line': src.count('\n', 0, m.start()) + 1,
            'kind': 'RAW_CAST',
            'detail': f"(string) cast directly on $attributes['{prop}']",
        })

    # --- Hazard 2b: the SAME cast, but reached via a COMPUTED key alias — the shape
    # `render_state`'s literal `\[['"]prop['"]\]` regex is structurally blind to.
    # helpers-typography.php's real pre-fix bug: `$k_size = sgs_typography_attr( $prefix,
    # 'FontSize' );` then, elsewhere, `(string) $attributes[ $k_size ]`. Generalised to ANY
    # helper call whose arguments include the prop's PascalCase form as a bare string
    # literal — not hardcoded to `sgs_typography_attr` specifically, so a future per-prefix
    # key-builder helper is caught the same way without a code change here.
    pascal = prop[0].upper() + prop[1:] if prop else prop
    alias_re = re.compile(
        r"\$(\w+)\s*=\s*\w+\(\s*[^;()]*?,\s*['\"]" + re.escape(pascal) + r"['\"]\s*\)\s*;"
    )
    for am in alias_re.finditer(src):
        alias = am.group(1)
        # A guard anywhere in the file — `is_array( $attributes[ $alias ] )` or
        # `sgs_responsive_normalise_object( $attributes[ $alias ] ... )` — means whatever
        # cast follows is reading an ALREADY-checked/normalised scalar, not the raw
        # object, and is safe. This is what heading/render.php's and
        # helpers-typography.php's ACTUAL fixes both do (`$size_is_tiered` /
        # `is_array( $attributes[ $k_size ] )`), so a fixed file must classify clean.
        guarded = bool(
            re.search(r"is_array\(\s*\$attributes\[\s*\$" + re.escape(alias) + r"\s*\]\s*\)", src)
            or re.search(
                r"sgs_responsive_normalise_object\(\s*\$attributes\[\s*\$" + re.escape(alias) + r"\s*\]",
                src,
            )
        )
        if guarded:
            continue
        for cm in re.finditer(
            r"\(string\)\s*\$attributes\[\s*\$" + re.escape(alias) + r"\s*\]", src
        ):
            findings.append({
                'line': src.count('\n', 0, cm.start()) + 1,
                'kind': 'RAW_CAST',
                'detail': f"(string) cast on $attributes[${alias}] — aliases \"{prop}\" via "
                          f"a \"{pascal}\"-suffix key-builder call",
            })

    return findings


# Hazard kinds that gate `--check` — proven live-bug shapes, never a "prop merely appears"
# coarse match. `DELETED_SIBLING_READ_INERT` and the generic `RAW_BRACKET` fallback below
# are informational only (see `_has_working_object_path`'s docstring for why).
_LIVE_HAZARD_KINDS = ('DELETED_SIBLING_READ', 'RAW_CAST')


def _object_typed_blocks(prop: str) -> set:
    """Block slugs whose OWN block.json declares `prop` as an already-migrated
    object-typed attr. Mirrors `scripts/migrate-theme-tier-scalars.py`'s function of the
    SAME NAME exactly (same contract, same live block.json scan) — this repo already
    solved this exact false-positive class once for the S4 (theme-pattern) leg of this
    migration and its docstring is the canonical record:

    'sgs/nav-menu declares `gap` as plain `"type":"string"` with NO Tablet/Mobile
    siblings ever — its `"gap":"8px"` is correct AS-IS'.

    D574 (2026-08-11, coordinator review, second correction same day): the S3/shared-
    include hazard scanner built earlier this session had the IDENTICAL blind spot —
    `RAW_CAST` fired on `nav-menu/render.php:1501`'s `(string) $attributes['gap']` even
    though `sgs/nav-menu`'s own block.json declares `gap` as a plain string, never
    object-typed, never part of this migration. A `(string)` cast on a genuinely
    string-typed attribute is correct code, not a hazard. Gating every hazard kind on
    this function closes that blind spot the same way S4 already closed it for theme
    patterns — two independent files, same rule, kept intentionally in sync rather than
    duplicated-and-drifted (only the file-glob source is shared conceptually, not the
    code, since the two scripts don't import each other by design — see
    migrate-theme-tier-scalars.py's own module docstring for why they're separate)."""
    out = set()
    for bj in sorted(BLOCKS_DIR.glob('*/block.json')):
        try:
            data = json.loads(bj.read_text(encoding='utf-8'))
        except json.JSONDecodeError:
            continue
        attr = data.get('attributes', {}).get(prop)
        if isinstance(attr, dict) and attr.get('type') == 'object':
            out.add(data.get('name', bj.parent.name))
    return out


def _block_slug_for_path(path: Path):
    """The block slug (block.json `name`) that OWNS this render.php, or `None` when
    `path` is not a block's own render.php — a shared include (`includes/*.php`), or a
    self-test fixture file with no adjacent block.json. Used to pick the correct
    object-typed scope: a BLOCK's own render.php is scoped to THAT block's own schema
    (nav-menu's `gap` is a plain string there, full stop); a SHARED include has no single
    owner, so it's scoped to the UNION — does ANY block declare this prop object-typed
    (coordinator's explicit instruction: keep the two scopes distinct, or the wrapper
    blind spot this session already closed reopens)."""
    bj = path.parent / 'block.json'
    if not bj.exists():
        return None
    try:
        data = json.loads(bj.read_text(encoding='utf-8'))
    except json.JSONDecodeError:
        return None
    return data.get('name', path.parent.name)


def file_hazard_state(path: Path, prop: str, declared_siblings: set, object_typed_blocks: set = None):
    """Classify ONE file's reads of `prop` using render_state's SAME vocabulary
    (DELEGATED/NORMALISED/RAW/UNCLEAR), folding in the hazard detectors above. Returns
    (state, findings) — findings is ALWAYS the full evidence list (live AND informational),
    never silently summarised into just the state string, so a human reading `--survey`
    output sees the exact line + reason, not just a verdict to take on faith.

    `object_typed_blocks` (from `_object_typed_blocks(prop)`) is accepted as an optional
    parameter so a caller scanning many files for the same prop computes it ONCE (same
    efficiency pattern as `declared_siblings`); when omitted it's computed here, which
    keeps every existing/self-test call site working unchanged.

    ⛔ **Scope gate added D574 (coordinator review, second correction same day):** hazard
    detection is SKIPPED entirely — the file is treated as out of scope for this prop's
    migration — unless the property can actually hold an array at the relevant scope. For
    a file that IS a block's own render.php (`_block_slug_for_path` resolves), the scope
    is THAT block's own schema; a `(string)` cast is only a hazard if that block's own
    `gap`/`fontSize`/etc is object-typed. For a SHARED include (no owning block), the
    scope is the UNION — is `prop` object-typed in ANY block at all — because the shared
    code might be reached by such a block. Without this, `sgs/nav-menu`'s plain-string
    `gap` (`"type":"string"`, never grew Tablet/Mobile siblings, never part of this
    migration) false-positived `RAW_CAST` on its own correct `(string)
    $attributes['gap']` cast — the exact class of bug `migrate-theme-tier-scalars.py`
    already solved once via `_object_typed_blocks` for the S4 leg (see that function's
    docstring, mirrored here on purpose).

    State is `RAW` only when a LIVE hazard is present (`_LIVE_HAZARD_KINDS`) — an
    INFORMATIONAL-only finding (a dead-but-harmless flat read, proven by
    `_has_working_object_path`) does NOT force RAW; the file falls through to whatever its
    non-hazard classification would otherwise be (typically NORMALISED, since a working
    object path is exactly what makes the read provably dead), but the informational
    finding is still carried in the returned list so `--survey` reports it."""
    if object_typed_blocks is None:
        object_typed_blocks = _object_typed_blocks(prop)
    src = _strip_php_comments(path.read_text(encoding='utf-8', errors='replace'))
    has_obj_path = _has_working_object_path(src, prop)

    block_slug = _block_slug_for_path(path)
    if block_slug is not None:
        in_scope = block_slug in object_typed_blocks
    else:
        in_scope = bool(object_typed_blocks)

    hazards = _scan_file_for_hazards(src, prop, declared_siblings) if in_scope else []
    live = [h for h in hazards if h['kind'] in _LIVE_HAZARD_KINDS]
    if live:
        return 'RAW', hazards

    # Same code-like-marker discipline as render_state — a bare \bprop\b also matches
    # plain-English prose (docblocks, changelog comments), not just code.
    if not re.search(r"[\$'\"]" + re.escape(prop) + r"\b", src):
        return 'DELEGATED', hazards
    if re.search(
        r"sgs_responsive_normalise_object\(\s*\$attributes\[['\"]" + re.escape(prop) + r"['\"]\]",
        src,
    ):
        return 'NORMALISED', hazards
    if has_obj_path:
        # The same discriminator as Hazard 1's INERT downgrade: a generic literal bracket
        # read of the BASE prop (not a sibling, no cast) — e.g. gap's guarded legacy
        # `$gap = $attributes['gap'] ?? ''; $gap = is_array( $gap ) ? '' : $gap;` — is
        # provably safe once a working object path exists elsewhere in the SAME file,
        # for the identical reason a dead sibling read is safe. Without this, the generic
        # RAW_BRACKET fallback below would re-introduce the exact false positive this
        # correction exists to remove, just via a different code path.
        return 'NORMALISED', hazards
    if in_scope and re.search(r"\[['\"]" + re.escape(prop) + r"(?:Tablet|Mobile)?['\"]\]", src):
        hazards = hazards + [{
            'line': None,
            'kind': 'RAW_BRACKET',
            'detail': f"raw $attributes['{prop}'] bracket read, unguarded by "
                      "is_array()/sgs_responsive_normalise_object(), and NO working object "
                      "path exists elsewhere in this file",
        }]
        return 'RAW', hazards
    return 'UNCLEAR', hazards


def survey_shared_includes(prop: str):
    """The shared-includes half of the census (D574) — mirrors survey()'s per-block loop
    but walks `includes/*.php` instead of `src/blocks/*/render.php`. Also re-scans every
    block's OWN render.php for the two hazard shapes (universal, no carve-outs — R-31-9):
    a block's render.php can carry the same RAW_CAST/DELETED_SIBLING_READ hazards the
    wrapper had, and `render_state()`'s literal-key regex is blind to the computed-key
    alias shape, so it would otherwise miss exactly the helpers-typography.php-style bug
    if it ever showed up directly inside a block's own render.php."""
    declared = declared_siblings(prop)
    # Computed ONCE per prop (same efficiency pattern as `declared`) and passed to every
    # `file_hazard_state` call below, rather than each call recomputing its own scan of
    # every block.json.
    object_typed = _object_typed_blocks(prop)
    out = []
    for path in shared_include_files():
        state, hazards = file_hazard_state(path, prop, declared, object_typed)
        if state == 'DELEGATED':
            continue  # prop never appears here — nothing to report
        out.append({'path': path, 'state': state, 'hazards': hazards})
    for bj in sorted(BLOCKS_DIR.glob('*/block.json')):
        rp = bj.parent / 'render.php'
        if not rp.exists():
            continue
        # ⛔ FIXED (coordinator review, 2026-08-11): this used to hardcode `state: 'RAW'`
        # unconditionally whenever ANY hazard (including an INFORMATIONAL-only one) was
        # present, ignoring the real state `file_hazard_state` had just computed. That
        # mislabelled a NORMALISED file with only a `DELETED_SIBLING_READ_INERT` finding
        # as RAW in the survey printout, which would have re-introduced the exact
        # false-positive class this whole correction removes, just one call site later.
        state, hazards = file_hazard_state(rp, prop, declared, object_typed)
        if hazards:
            out.append({'path': rp, 'state': state, 'hazards': hazards})
    return out


# Added D571 (Spec 35 pass 3b, 2026-08-11) — see the module docstring's
# "WHAT IT DOES DO" section for why these exist and what they refuse to guess at.

_SHARED_CONTROL_IMPORT_RE = re.compile(r'\b(?:LayoutPanel|ContainerWrapperControls)\b')


def _strip_php_comments(src: str) -> str:
    """Best-effort // and /* */ comment stripping, so a comment EXPLAINING what code
    used to read (e.g. "gap is consumed from $attributes['gap']") doesn't get
    classified as the code itself — confirmed against trust-bar/render.php:65, whose
    prose comment produced a false RAW finding before this was added. Not a real PHP
    parser (per the module docstring's own caveat) — a `//` inside a string literal
    would still be mis-stripped, but render.php files in this codebase don't do that
    next to attribute reads.

    ⛔ **A real bug found + fixed D574, while verifying THIS pass's own detector against
    class-sgs-container-wrapper.php.** The two `re.sub` calls used to run as SEPARATE
    passes (strip every block comment first, THEN strip every line comment). That is
    wrong whenever a `//` line comment's own TEXT contains the two-character substring
    `/*` immediately followed later by `*/` — e.g. this exact file's own D574 fix
    comment: "// `src/blocks/*/render.php`, never shared includes…". The glob
    `blocks/*/render.php` contains a literal `/*` (from `s/*`). Because the block-comment
    pass ran FIRST and is non-greedy, it treated that `/*` as an OPENING block comment and
    scanned forward for the next real `*/` — which was found ~87,500 characters later,
    silently deleting nearly the entire rest of the file (every subsequent finding for
    THIS run classified as DELEGATED, not because nothing was there, but because the
    comment-stripper had already eaten it). Measured directly: stripping this file went
    from 138,777 to 16,770 characters — an 88% loss — and re-adding `'minHeight' in
    stripped` returned False even though the real code at line 341 reads it.

    Real PHP tokenises left-to-right: whichever comment-opener (`//` or `/*`) occurs
    FIRST in the source wins, and a `//` comment's own text is never re-scanned for a
    `/*` inside it. A single combined alternation regex, applied in ONE pass, reproduces
    that: at any given starting position the two branches are mutually exclusive by their
    first character pair (`/*` vs `//`), so `re.sub` picks whichever the file actually
    opens with, and once a `//` branch matches it consumes to end-of-line as one atomic
    unit — the embedded `/*`/`*/` substrings inside that match are never re-examined.

    ⛔ **A second real bug, found immediately after the first while sanity-checking
    reported line numbers against a real file (nav-menu/render.php — D574).** A
    multi-line `/* … */` block comment being deleted OUTRIGHT removes its own internal
    newlines along with it, so every line AFTER that comment shifts upward in the
    stripped text relative to the real file. `_scan_file_for_hazards()` computes its
    reported `line` by counting `\n` in the STRIPPED text up to the match — so once any
    multi-line comment precedes a hazard, the reported line number is simply wrong.
    Measured: a `(string) $attributes['gap']` cast that is really at
    nav-menu/render.php:1501 was first reported as line 977 — 524 lines short, entirely
    attributable to the multi-line comments stripped ahead of it. Fixed by replacing each
    matched comment with an equal COUNT of bare newlines (via a replacement function,
    not the empty string) rather than deleting it — the code content is still gone, but
    line alignment with the real file is preserved exactly."""
    def _blank_but_keep_lines(m):
        return '\n' * m.group(0).count('\n')

    return re.sub(r'/\*.*?\*/|//[^\n]*', _blank_but_keep_lines, src, flags=re.DOTALL)


def render_state(block_dir: Path, prop: str, base_key: str = None) -> str:
    """Classify how render.php currently reads `prop`. See module docstring.

    `base_key` (see `reads_attr_directly`'s note) lets the three `<prop>Desktop`-based
    families (D777) be recognised by their ACTUAL declared key — without it, a block
    reading only `$attributes['columnsDesktop']` (never bare `$attributes['columns']`)
    read as DELEGATED/UNCLEAR because every pattern below anchored on the bare name."""
    rp = block_dir / 'render.php'
    if not rp.exists():
        return 'DELEGATED'
    src = _strip_php_comments(rp.read_text(encoding='utf-8', errors='replace'))
    base = re.escape(base_key or prop)
    prop_re = re.escape(prop)
    # A bare \bprop\b also matches plain-English prose — a docblock listing "gap" as a
    # feature, or "a real WCAG 2.1 gap" — which is not a code usage. Require a code-like
    # marker ($, ' or ") immediately before the token: `$gap`, `$attributes['gap']`,
    # `"gap"`. Confirmed against form/render.php:8,301, which mention "gap" only in
    # prose and correctly fall through to DELEGATED once this gate is applied.
    if not re.search(r"[\$'\"](?:" + base + r"|" + prop_re + r")\b", src):
        return 'DELEGATED'
    # NORMALISED: the object is read through the shared normaliser. Real call shape
    # (confirmed against gallery/render.php:58) is POSITIONAL —
    # `sgs_responsive_normalise_object( $attributes['prop'] ?? null )` — the helper
    # never takes the property name as a string argument, only the already-indexed
    # value. Anchor on the bracket-indexed argument, not a string-literal parameter.
    if re.search(r"sgs_responsive_normalise_object\(\s*\$attributes\[['\"]"
                 + base + r"['\"]\]", src):
        return 'NORMALISED'
    # RAW: the OLD flat-scalar bracket read — `$attributes['prop']` (or its Desktop-
    # suffixed base form) or `['propTablet']`/`['propMobile']` — the exact pattern that
    # PHP array-to-string-coerces to "Array" when the attr is actually object-typed
    # (D569/D570's root cause).
    if re.search(r"\[['\"](?:" + base + r"|" + prop_re + r"Tablet|" + prop_re + r"Mobile)['\"]\]", src):
        return 'RAW'
    return 'UNCLEAR'


def edit_state(block_dir: Path, prop: str, base_key: str = None) -> str:
    """Classify how edit.js currently wires the control for `prop`. See module docstring.

    `base_key` (see `reads_attr_directly`'s note) — without it, hero's real
    `desktop: 'textAlignDesktop'` attrMap entry matches neither the LEGACY pattern
    (which only recognised `textAlign`/`textAlignTablet`/`textAlignMobile`) nor the bare
    fallback (`\\btextAlign\\b` never matches inside `textAlignDesktop` — there is no word
    boundary between the shared "textAlign" and "Desktop"), so the block misclassified
    UNCLEAR/NONE despite genuinely having a wired control."""
    ej = block_dir / 'edit.js'
    if not ej.exists():
        return 'NONE'
    src = ej.read_text(encoding='utf-8', errors='replace')
    prop_re = re.escape(prop)
    base = re.escape(base_key or prop)
    has_shared_import = bool(_SHARED_CONTROL_IMPORT_RE.search(src))
    # A local <ResponsiveOverride ... value={attributes.prop} ...
    #   onChange={... setAttributes({ prop: ... })} pattern — the DONE shape, matching
    # exactly how ContainerWrapperControls.js wires gridTemplateColumns/gridTemplateRows
    # and how site-footer-row/site-header-row wire their own bespoke object attrs. Window
    # the match to a <ResponsiveOverride>...</ResponsiveOverride> block so a DIFFERENT
    # prop's onChange two controls away can't false-positive this one.
    for block_match in re.finditer(r'<ResponsiveOverride\b.*?</ResponsiveOverride>', src, re.DOTALL):
        block_src = block_match.group(0)
        # `value={attributes.prop}` (ContainerWrapperControls' pattern) OR a bare
        # `value={prop}` where `prop` was destructured from attributes at the top of the
        # file (site-footer-row/site-header-row's pattern) — both are equally DONE, the
        # variable's origin doesn't change the wiring's correctness.
        value_bound = (
            re.search(r'\battributes(?:\.|\[[\'"])' + base + r'\b', block_src)
            or (
                re.search(r'value=\{\s*' + base + r'\s*\}', block_src)
                and re.search(r'\b' + base + r'\s*,?\s*\}\s*=\s*attributes\b'
                               r'|\{[^{}]*\b' + base + r'\b[^{}]*\}\s*=\s*attributes\b',
                               src)
            )
        )
        if not value_bound:
            continue
        if re.search(r'setAttributes\(\s*\{\s*(?:\[[^\]]*\]|' + base + r')\s*:', block_src):
            return 'OVERRIDDEN'
    # LEGACY: the old flat-attrMap-inside-<ResponsiveControl> bridging pattern (what
    # site-footer-row's gridTemplateRows looked like before pass 3b) — a plain object
    # literal mapping breakpoint names to `prop`/`propTablet`/`propMobile` string values,
    # OR — the Desktop-suffixed base form (`desktop: 'textAlignDesktop'`, hero's real
    # shape) via `base`.
    if re.search(r"(?:desktop|tablet|mobile)\s*:\s*['\"](?:" + base + r"|"
                 + prop_re + r"Tablet|" + prop_re + r"Mobile)['\"]", src):
        return 'LEGACY'
    if re.search(r"\b(?:" + base + r"|" + prop_re + r")\b", src):
        return 'SHARED' if has_shared_import else 'UNCLEAR'
    return 'SHARED' if has_shared_import else 'NONE'


def survey(prop: str):
    out = []
    for bj in sorted(BLOCKS_DIR.glob('*/block.json')):
        try:
            data = json.loads(bj.read_text(encoding='utf-8'))
        except json.JSONDecodeError:
            continue
        attrs = data.get('attributes', {})
        slug = data.get('name', bj.parent.name)
        kind, sibs = classify(attrs, prop, block_slug=slug)
        if kind in ('ABSENT',):
            continue
        d = bj.parent
        base_spec = _base_attr_spec(attrs, prop) or {}
        base_key = _base_attr_key(attrs, prop)
        out.append({
            'slug': data.get('name', d.name),
            'dir': d,
            'kind': kind,
            'siblings': sibs,
            'default': base_spec.get('default'),
            'base_type': base_spec.get('type'),
            'render_reads': reads_attr_directly(d, prop, base_key),
            'edit_refs': edit_refs(d, prop, base_key),
            'render_state': render_state(d, prop, base_key),
            'edit_state': edit_state(d, prop, base_key),
        })
    return out


def survey_all_properties(json_out: bool = False) -> int:
    """Census EVERY property with a declared tier sibling, in one pass.

    WHY: 34 of 40 tier properties touch only 1-2 blocks each. Under property-by-property a
    one-block property carries the same ceremony as a 41-block one. This answers "what is
    actually left, and how big is each" in a single command, so the batching decision is made
    from a census rather than from recall.

    ⛔ It reports THREE populations and they are NOT interchangeable. Conflating them is how
    three different totals for "how many properties" got into circulation:
      declared   - has a <prop>Tablet/<prop>Mobile attr somewhere (the all_tier_properties roster)
      migratable - at least one block is FLAT or BLENDED for it (what a migration would touch)
      done       - declared, but every block is already OBJECT/ASSET (nothing to migrate)
    """
    rows = []
    for prop in all_tier_properties():
        survey_rows = survey(prop)
        targets = [r for r in survey_rows if r["kind"] in ("FLAT", "BLENDED")]
        rows.append({
            "property": prop,
            "blocks_declaring": len(survey_rows),
            "migratable_blocks": len(targets),
            "kinds": {k: sum(1 for r in survey_rows if r["kind"] == k)
                      for k in ("FLAT", "BLENDED", "OBJECT", "ASSET")},
            "render_followup": sum(1 for r in survey_rows
                                   if r["render_state"] in ("RAW", "UNCLEAR")),
            "edit_followup": sum(1 for r in survey_rows
                                 if r["edit_state"] in ("LEGACY", "UNCLEAR")),
        })
    migratable = [r for r in rows if r["migratable_blocks"] > 0]
    done = [r for r in rows if r["migratable_blocks"] == 0]

    if json_out:
        print(json.dumps({"declared": len(rows), "migratable": len(migratable),
                          "done": len(done), "properties": rows}, indent=2))
        return 0

    print("")
    print(f"DECLARED tier properties: {len(rows)}   "
          f"(MIGRATABLE {len(migratable)} - already done {len(done)})")
    print("")
    header = "property"
    print(f'  {header:34} {"declaring":>9} {"migratable":>10}   kinds')
    for r in sorted(rows, key=lambda x: (-x["migratable_blocks"], -x["blocks_declaring"],
                                         x["property"])):
        kinds = " ".join(f"{k}={v}" for k, v in r["kinds"].items() if v)
        flag = "" if r["migratable_blocks"] else "   (done)"
        print(f'  {r["property"]:34} {r["blocks_declaring"]:>9} '
              f'{r["migratable_blocks"]:>10}   {kinds}{flag}')

    band_1_2 = [r for r in migratable if r["migratable_blocks"] <= 2]
    band_3up = sorted([r for r in migratable if r["migratable_blocks"] > 2],
                      key=lambda x: -x["migratable_blocks"])
    big = ", ".join(f'{r["property"]}({r["migratable_blocks"]})' for r in band_3up)
    print("")
    print(f"BATCHING SHAPE (of the {len(migratable)} MIGRATABLE properties):")
    print(f"  1-2 blocks : {len(band_1_2)}")
    print(f"  3+  blocks : {len(band_3up)}   {big}")
    total_touches = sum(r["migratable_blocks"] for r in migratable)
    print(f"  total block-touches remaining: "
          f"{total_touches}")
    return 0

def build_object_default(rows) -> dict:
    """Preserve the authored default as the DESKTOP tier — dropping it would silently
    change every un-set instance's rendering, which is precisely the quiet loss this
    tool refuses to do."""
    obj = {}
    base = rows.get('default')
    if base not in (None, ''):
        obj['desktop'] = base
    for suffix, key in (('Tablet', 'tablet'), ('Mobile', 'mobile')):
        v = rows.get('sib_defaults', {}).get(suffix)
        if v not in (None, ''):
            obj[key] = v
    return obj


def apply_block_json(entry, prop: str, apply: bool):
    """Rewrite one block.json. Returns (changed, description, error)."""
    bj = entry['dir'] / 'block.json'
    raw = io.open(bj, encoding='utf-8', newline='').read()
    data = json.loads(raw)
    attrs = data['attributes']

    base_key = _base_attr_key(attrs, prop)
    if base_key is None:
        return False, None, f'no base declaration for "{prop}" or "{prop}Desktop" — refused'

    sib_defaults = {}
    for t in TIERS:
        name = prop + t
        if name in attrs:
            sib_defaults[t] = attrs[name].get('default')

    # A BLENDED base is ALREADY the tier object — its default is correct and must be
    # left exactly as it is. Only its orphan scalar siblings are deleted. Feeding it
    # through build_object_default would wrap the object inside itself
    # ({"desktop": {"desktop": …}}), which the retype below never applies for BLENDED —
    # but it WOULD be printed as the proposed change, and a human approving a diff
    # reads the description, not the code path. So compute it honestly per kind.
    if entry['kind'] == 'BLENDED':
        new_default = attrs[base_key].get('default')
    else:
        new_default = build_object_default({'default': attrs[base_key].get('default'),
                                            'sib_defaults': sib_defaults})

    out = raw
    # Delete sibling entries by exact key, preserving the file's own formatting.
    for t in TIERS:
        name = prop + t
        if name not in attrs:
            continue
        pat = re.compile(r'\n\s*"' + re.escape(name) + r'":\s*\{[^{}]*\},?')
        new = pat.sub('', out, count=1)
        if new == out:
            return False, None, f'could not delete "{name}" (nested braces? hand-edit)'
        out = new

    if entry['kind'] == 'FLAT':
        # Retype the base and swap its default for the tier object. Search on
        # base_key (which may be "<prop>Desktop" for the 3 Desktop-base families —
        # see _base_attr_key) but WRITE the bare `prop` name: bare is the canonical
        # post-migration target shape (_base_attr_spec's own docstring), so this also
        # completes the Desktop -> bare rename as part of the fold, in one pass.
        pat = re.compile(r'"' + re.escape(base_key) + r'":\s*\{[^{}]*\}')
        m = pat.search(out)
        if not m:
            return False, None, f'could not locate base "{base_key}" declaration'
        indent = '\t\t\t'
        body = f'"{prop}": {{\n{indent}"type": "object",\n{indent}"default": ' \
               + json.dumps(new_default) + f'\n\t\t}}'
        out = out[:m.start()] + body + out[m.end():]

    # Deleting the LAST entry of an object leaves the previous entry's comma dangling.
    # JSON permits no trailing comma anywhere, so stripping one is always a repair and
    # never a semantic change — but only attempt it when the document is actually broken,
    # so a well-formed file is never rewritten by a blunt regex. Then re-validate: if it
    # still will not parse, REFUSE. Writing invalid JSON would take the block out of the
    # registry silently, which is exactly the quiet loss this tool exists to prevent.
    try:
        json.loads(out)
    except json.JSONDecodeError:
        out = re.sub(r',(\s*[}\]])', r'\1', out)
        try:
            json.loads(out)
        except json.JSONDecodeError as exc:
            return False, None, f'result would be invalid JSON ({exc.msg}) — refused'
    if apply:
        io.open(bj, 'w', encoding='utf-8', newline='').write(out)
    return True, f'default -> {json.dumps(new_default)}', None


# Added D571 (Spec 35 pass 3b, 2026-08-11). See the module docstring: S2 (edit.js) is
# safe to auto-apply because the LEGACY shape — <ResponsiveControl> + a breakpoint-keyed
# attrMap + one self-closing child control — has now been seen TWICE in this codebase
# (ContainerWrapperControls.js pre-fix, site-footer-row/edit.js pre-fix) and both were
# byte-for-byte identical in structure, differing only in label/help text and which
# control component (TextControl etc) they wrap. S3 (render.php) is deliberately NOT
# given a --fix: what matters there is what the surrounding code DOES with the value
# after the read (trim()? cast? is_array() check?) — exactly where D569/D570's real
# regressions lived — so it stays detect-and-flag, never auto-rewritten.

_LEGACY_BLOCK_RE = re.compile(
    r'(?P<indent>[ \t]*)<ResponsiveControl\s+label=\{(?P<label>[^}]*)\}\s*>\s*\n'
    r'\s*\{\s*\(\s*breakpoint\s*\)\s*=>\s*\{\s*\n'
    r'(?P<map_body>[\s\S]*?)\n'
    r'\s*return\s*\(\s*\n'
    r'(?P<child>\s*<[A-Za-z][\s\S]*?/>\s*)\n'
    r'\s*\)\s*;\s*\n'
    r'\s*\}\s*\}\s*\n'
    r'\s*</ResponsiveControl>',
)


def fix_edit_js(entry, prop: str, apply: bool):
    """Rewrite ONE <ResponsiveControl>+attrMap LEGACY block to <ResponsiveOverride>.
    Returns (changed: bool, description, error). Refuses on anything that doesn't match
    the exact known LEGACY shape byte-for-byte — never guesses at unfamiliar JSX."""
    ej = entry['dir'] / 'edit.js'
    src = io.open(ej, encoding='utf-8', newline='').read()

    matches = [m for m in _LEGACY_BLOCK_RE.finditer(src)
               if re.search(r"desktop\s*:\s*['\"]" + re.escape(prop) + r"['\"]", m.group('map_body'))]
    if not matches:
        return False, None, 'no exact LEGACY <ResponsiveControl>+attrMap block found for this prop — hand-edit'
    if len(matches) > 1:
        return False, None, f'{len(matches)} matching blocks found — ambiguous, hand-edit'
    m = matches[0]
    child = m.group('child')

    # The child's value/onChange must reference the attrMap's derived `attr` variable —
    # if they reference something else, this isn't the known shape.
    value_m = re.search(r"value=\{\s*attributes\[\s*attr\s*\]\s*\|\|\s*('[^']*'|\"[^\"]*\")\s*\}", child)
    onchange_m = re.search(
        r"onChange=\{\s*\(\s*val\s*\)\s*=>\s*setAttributes\(\s*\{\s*\[\s*attr\s*\]:\s*val\s*\}\s*\)\s*\}", child)
    if not value_m or not onchange_m:
        return False, None, 'child control value/onChange do not match the known attrMap[attr] shape — hand-edit'

    # The value= line's own leading whitespace is what the inserted placeholder= line
    # should match — read it back from the source rather than guessing a tab count.
    value_line_start = child.rfind('\n', 0, value_m.start()) + 1
    value_line_indent = re.match(r'[ \t]*', child[value_line_start:]).group(0)

    # Rebuild precisely: replace the value= prop, insert a placeholder= prop right after
    # it, replace the onChange= prop — in that order, using the ORIGINAL child so offsets
    # don't drift across the two substitutions.
    new_child = child[:value_m.start()] \
        + f"value={{ ownValue || {value_m.group(1)} }}\n{value_line_indent}" \
        + f"placeholder={{ inherited ? effectiveValue || {value_m.group(1)} : '' }}" \
        + child[value_m.end():onchange_m.start()] \
        + "onChange={ ( val ) => setOwnValue( val ) }" \
        + child[onchange_m.end():]

    # The captured child sat one nesting level deeper than it will under the new wrapper
    # (the old shape had an extra `return (` level that the new shape's `=> (` doesn't
    # need) — dedent every line by exactly one tab, preserving each line's RELATIVE
    # indentation (multi-line props like `help={ __( ... ) }` keep their own internal
    # structure). Then normalise trailing whitespace so the closing `) }` always lands
    # on its own line — the ORIGINAL regex capture can end up with none, which is
    # exactly the glued-together `/>) }` bug found by testing this against a real
    # pre-migration file (site-footer-row's original gridTemplateRows block).
    lines = [(ln[1:] if ln.startswith('\t') else ln) for ln in new_child.rstrip('\n').split('\n')]
    new_child = '\n'.join(lines) + '\n'

    indent = m.group('indent')
    new_block = (
        f"{indent}<ResponsiveOverride\n"
        f"{indent}\tlabel={{{m.group('label')}}}\n"
        f"{indent}\tvalue={{ attributes.{prop} }}\n"
        f"{indent}\tonChange={{ ( obj ) => setAttributes( {{ {prop}: obj }} ) }}\n"
        f"{indent}>\n"
        f"{indent}\t{{ ( {{ ownValue, effectiveValue, inherited, setOwnValue }} ) => (\n"
        f"{new_child}"
        f"{indent}\t) }}\n"
        f"{indent}</ResponsiveOverride>"
    )
    out = src[:m.start()] + new_block + src[m.end():]

    # `ResponsiveOverride` must already be imported, or the build fails loudly at compile
    # time rather than at runtime — cheap to check here, no reason to make the build do it.
    if not re.search(r'^\s*import\s*\{[^}]*\bResponsiveOverride\b[^}]*\}', out, re.MULTILINE):
        return False, None, 'ResponsiveOverride is not imported in this file — add the import, then re-run'

    if apply:
        io.open(ej, 'w', encoding='utf-8', newline='').write(out)
    return True, f'ResponsiveControl+attrMap -> ResponsiveOverride for "{prop}"', None


_LEGACY_FIXTURE = """import { ResponsiveOverride, ResponsiveControl } from '../../../components';

function LayoutPanel( { attributes, setAttributes } ) {
\treturn (
\t\t<>
\t\t\t<ResponsiveControl label={ __( 'Row template', 'sgs-blocks' ) }>
\t\t\t\t{ ( breakpoint ) => {
\t\t\t\t\tconst attrMap = {
\t\t\t\t\t\tdesktop: 'gridTemplateRows',
\t\t\t\t\t\ttablet: 'gridTemplateRowsTablet',
\t\t\t\t\t\tmobile: 'gridTemplateRowsMobile',
\t\t\t\t\t};
\t\t\t\t\tconst attr = attrMap[ breakpoint ];
\t\t\t\t\treturn (
\t\t\t\t\t\t<TextControl
\t\t\t\t\t\t\tvalue={ attributes[ attr ] || '' }
\t\t\t\t\t\t\tonChange={ ( val ) => setAttributes( { [ attr ]: val } ) }
\t\t\t\t\t\t\thelp={ __(
\t\t\t\t\t\t\t\t"CSS grid-template-rows e.g. 'auto 1fr'. Leave empty for browser default.",
\t\t\t\t\t\t\t\t'sgs-blocks'
\t\t\t\t\t\t\t) }
\t\t\t\t\t\t\t__nextHasNoMarginBottom
\t\t\t\t\t\t/>
\t\t\t\t\t);
\t\t\t\t} }
\t\t\t</ResponsiveControl>
\t\t</>
\t);
}
"""


def self_test() -> int:
    """Regression fixture, sourced from a REAL pre-migration file (site-footer-row's
    gridTemplateRows block, before pass 3b hand-fixed it — captured verbatim, not
    invented), not a synthetic guess at the shape. Run standalone:
        python migrate-tier-object.py --self-test
    Exits non-zero and prints the failing assertion on any failure — CI-safe."""
    import tempfile
    failures = []

    def check(label, cond):
        mark = 'OK  ' if cond else 'FAIL'
        print(f'  [{mark}] {label}')
        if not cond:
            failures.append(label)

    with tempfile.TemporaryDirectory() as td:
        d = Path(td) / 'test-block'
        d.mkdir()
        (d / 'edit.js').write_text(_LEGACY_FIXTURE, encoding='utf-8')

        # --- positive control: the known LEGACY shape gets fixed correctly ---
        ok, desc, err = fix_edit_js({'dir': d}, 'gridTemplateRows', apply=True)
        check('positive control: fix reports success, no error', ok and err is None)
        out = (d / 'edit.js').read_text(encoding='utf-8')
        check('positive control: ResponsiveOverride now present',
              '<ResponsiveOverride' in out and '<ResponsiveControl' not in out)
        check('positive control: value bound to attributes.gridTemplateRows',
              'value={ attributes.gridTemplateRows }' in out)
        check('positive control: onChange writes the object attr directly',
              'onChange={ ( obj ) => setAttributes( { gridTemplateRows: obj } ) }' in out)
        check('positive control: child value reads ownValue', 'value={ ownValue || \'\' }' in out)
        check('positive control: child onChange calls setOwnValue',
              "onChange={ ( val ) => setOwnValue( val ) }" in out)
        check('positive control: placeholder inserted', 'placeholder={ inherited ? effectiveValue' in out)
        check('positive control: help text preserved verbatim',
              "CSS grid-template-rows e.g. 'auto 1fr'" in out)
        check('positive control: closing ) } lands on its own line, not glued to />',
              '/>\n' in out and '/>\t' not in out)
        check('positive control: re-running on the FIXED file now correctly refuses '
              '(no LEGACY block left to match)',
              fix_edit_js({'dir': d}, 'gridTemplateRows', apply=False)[2] is not None)
        check('positive control: survey now classifies this file as OVERRIDDEN, not LEGACY',
              edit_state(d, 'gridTemplateRows') == 'OVERRIDDEN')

        # --- negative control: an UNFAMILIAR shape must be refused, never mangled ---
        d2 = Path(td) / 'test-block-unfamiliar'
        d2.mkdir()
        unfamiliar = _LEGACY_FIXTURE.replace(
            "value={ attributes[ attr ] || '' }",
            "value={ someOtherHelper( attributes, attr ) }",
        )
        (d2 / 'edit.js').write_text(unfamiliar, encoding='utf-8')
        ok2, desc2, err2 = fix_edit_js({'dir': d2}, 'gridTemplateRows', apply=True)
        check('negative control: unfamiliar value= shape is REFUSED, not guessed at',
              not ok2 and err2 is not None)
        check('negative control: file was NOT written on refusal',
              (d2 / 'edit.js').read_text(encoding='utf-8') == unfamiliar)

        # --- negative control: render_state must not fire on a prose comment ---
        d3 = Path(td) / 'test-block-prose'
        d3.mkdir()
        (d3 / 'render.php').write_text(
            "<?php\n// gap is consumed from $attributes['gap'] by the shared wrapper.\n",
            encoding='utf-8')
        check('negative control: a comment mentioning $attributes[\'gap\'] does not '
              'classify as RAW (confirmed against trust-bar/render.php\'s real false '
              'positive before comment-stripping was added)',
              render_state(d3, 'gap') == 'DELEGATED')

        # === D574 hazard-detector fixtures ===================================
        # Sourced from the REAL pre-fix/post-fix shapes of the three files that shipped
        # broken while the old survey reported 0 RAW findings for all 41 properties:
        # class-sgs-container-wrapper.php:323 (minHeight), helpers-typography.php:166
        # (fontSize, computed-key alias), heading/render.php:453 (fontSize, literal key).
        # Every assertion below checks a REAL RETURNED VALUE (a state string, a specific
        # finding's 'kind'/'line'/'detail', a list length) — never just that a result
        # "looks like" a finding, per D573's own recorded failure (a weak assertion that
        # checked shape, not value, and passed while measuring nothing).

        # --- positive control 1: DELETED_SIBLING_READ (the wrapper's minHeight bug) ---
        d4 = Path(td) / 'test-shared-wrapper'
        d4.mkdir()
        (d4 / 'wrapper.php').write_text(
            "<?php\n"
            "$min_height        = $attributes['minHeight'] ?? '';\n"
            "$min_height_tablet = $attributes['minHeightTablet'] ?? '';\n"
            "$min_height_mobile = $attributes['minHeightMobile'] ?? '';\n",
            encoding='utf-8')
        state4, hazards4 = file_hazard_state(d4 / 'wrapper.php', 'minHeight', declared_siblings=set())
        check('positive control: DELETED_SIBLING_READ fires when NO block.json declares '
              'the Tablet/Mobile sibling any more (declared_siblings=set())',
              state4 == 'RAW')
        deleted_kinds = [h['kind'] for h in hazards4 if h['kind'] == 'DELETED_SIBLING_READ']
        check('positive control: exactly 2 DELETED_SIBLING_READ findings (Tablet + Mobile)',
              len(deleted_kinds) == 2)
        deleted_lines = sorted(h['line'] for h in hazards4 if h['kind'] == 'DELETED_SIBLING_READ')
        check('positive control: findings report the REAL line numbers (3 and 4), not a '
              'placeholder', deleted_lines == [3, 4])
        check('positive control: the Mobile finding names the exact dead attr "minHeightMobile" '
              'in its detail text, not a generic message',
              any('minHeightMobile' in h['detail'] for h in hazards4
                  if h['kind'] == 'DELETED_SIBLING_READ'))

        # --- negative control 1a: same file, but one block.json STILL declares the sibling
        # (mid property-by-property migration) — the read is legitimate, must NOT fire ---
        state4b, hazards4b = file_hazard_state(
            d4 / 'wrapper.php', 'minHeight', declared_siblings={'Tablet', 'Mobile'})
        check('negative control: DELETED_SIBLING_READ does NOT fire when a block.json still '
              'declares both siblings (the read stays legitimate)',
              state4b != 'RAW' or not any(h['kind'] == 'DELETED_SIBLING_READ' for h in hazards4b))

        # --- positive control 2: RAW_CAST via a LITERAL key (heading/render.php's shape) ---
        d5 = Path(td) / 'test-shared-literal-cast'
        d5.mkdir()
        (d5 / 'heading.php').write_text(
            "<?php\n"
            "if ( isset( $attributes['fontSize'] ) && '' !== $attributes['fontSize'] "
            "&& ! is_numeric( $attributes['fontSize'] ) ) {\n"
            "\t$preset_font_size = sgs_font_size_value( (string) $attributes['fontSize'] );\n"
            "}\n",
            encoding='utf-8')
        state5, hazards5 = file_hazard_state(d5 / 'heading.php', 'fontSize', declared_siblings=set())
        check('positive control: literal-key RAW_CAST fires on `(string) $attributes[\'fontSize\']`',
              state5 == 'RAW' and any(h['kind'] == 'RAW_CAST' for h in hazards5))
        check('positive control: literal-key RAW_CAST reports the real line (3)',
              any(h['kind'] == 'RAW_CAST' and h['line'] == 3 for h in hazards5))

        # --- positive control 3: RAW_CAST via a COMPUTED-KEY ALIAS
        # (helpers-typography.php's real pre-fix shape — the case render_state's literal
        # bracket regex is structurally blind to) ---
        d6 = Path(td) / 'test-shared-alias-cast'
        d6.mkdir()
        (d6 / 'helpers-typography.php').write_text(
            "<?php\n"
            "$k_size = sgs_typography_attr( $prefix, 'FontSize' );\n"
            "if ( isset( $attributes[ $k_size ] ) && '' !== $attributes[ $k_size ] "
            "&& ! is_numeric( $attributes[ $k_size ] ) ) {\n"
            "\t$legacy = sgs_font_size_value( (string) $attributes[ $k_size ] );\n"
            "}\n",
            encoding='utf-8')
        state6, hazards6 = file_hazard_state(d6 / 'helpers-typography.php', 'fontSize',
                                              declared_siblings=set())
        check('positive control: computed-key-alias RAW_CAST fires on '
              '`(string) $attributes[ $k_size ]` where $k_size aliases "fontSize" via a '
              '"FontSize"-suffix key-builder call (render_state\'s literal regex cannot '
              'see this shape at all)',
              state6 == 'RAW' and any(h['kind'] == 'RAW_CAST' for h in hazards6))
        check('positive control: the alias-cast finding names both the alias variable and '
              'the aliased prop in its detail text',
              any('$k_size' in h['detail'] and 'fontSize' in h['detail'] for h in hazards6
                  if h['kind'] == 'RAW_CAST'))

        # --- negative control 3a: the SAME alias shape, but GUARDED (the real post-fix
        # shape of helpers-typography.php) — must classify clean, proving the detector
        # tracks the guard, not just the alias's existence ---
        d7 = Path(td) / 'test-shared-alias-guarded'
        d7.mkdir()
        (d7 / 'helpers-typography.php').write_text(
            "<?php\n"
            "$k_size = sgs_typography_attr( $prefix, 'FontSize' );\n"
            "$size_is_tiered = isset( $attributes[ $k_size ] ) && is_array( $attributes[ $k_size ] );\n"
            "if ( isset( $attributes[ $k_size ] ) && ! $size_is_tiered "
            "&& '' !== $attributes[ $k_size ] && ! is_numeric( $attributes[ $k_size ] ) ) {\n"
            "\t$legacy = sgs_font_size_value( (string) $attributes[ $k_size ] );\n"
            "}\n",
            encoding='utf-8')
        state7, hazards7 = file_hazard_state(d7 / 'helpers-typography.php', 'fontSize',
                                              declared_siblings=set())
        check('negative control: the alias-cast shape does NOT fire once guarded by '
              'is_array( $attributes[ $k_size ] ) — the real post-fix shape of '
              'helpers-typography.php',
              not any(h['kind'] == 'RAW_CAST' for h in hazards7))

        # --- negative control 3b: a comment merely MENTIONING the alias-cast pattern must
        # not fire (same discipline as the existing prose negative control, re-applied to
        # the NEW detector rather than assumed to be inherited for free) ---
        d8 = Path(td) / 'test-shared-alias-prose'
        d8.mkdir()
        (d8 / 'helpers-typography.php').write_text(
            "<?php\n"
            "// old shape used to be:\n"
            "// $k_size = sgs_typography_attr( $prefix, 'FontSize' );\n"
            "// $legacy = sgs_font_size_value( (string) $attributes[ $k_size ] );\n",
            encoding='utf-8')
        state8, hazards8 = file_hazard_state(d8 / 'helpers-typography.php', 'fontSize',
                                              declared_siblings=set())
        check('negative control: a comment describing the alias-cast pattern does not '
              'fire RAW_CAST (comment-stripped before scanning, same as render_state)',
              state8 == 'DELEGATED' and not hazards8)

        # --- shared_include_files() + declared_siblings() sanity, against the REAL
        # repo tree (not a fixture) — these two feed survey_shared_includes() directly ---
        real_includes = shared_include_files()
        check('shared_include_files(): the real class-sgs-container-wrapper.php is in scope '
              '(this is the file the old survey never scanned at all)',
              any(p.name == 'class-sgs-container-wrapper.php' for p in real_includes))
        check('shared_include_files(): the real helpers-typography.php is in scope',
              any(p.name == 'helpers-typography.php' for p in real_includes))
        real_declared = declared_siblings('minHeight')
        check('declared_siblings(\'minHeight\') against the REAL repo returns a plain '
              'set (empty or populated, but never a truthy non-set) — proves it queries '
              'live block.json data rather than returning a hardcoded stub',
              isinstance(real_declared, set))

        # --- regression control: _strip_php_comments() must not over-strip when a `//`
        # comment's OWN TEXT contains a `/*` substring (a glob like `blocks/*/render.php`).
        # This is a REAL bug found + fixed during THIS pass while verifying the detector
        # against class-sgs-container-wrapper.php's actual D574 fix comment — the old
        # two-pass strip (block comments, then line comments) misread that `/*` as an
        # OPENING block comment and ate ~87,500 real characters looking for its `*/`,
        # which is why the very first live run of file_hazard_state() against the FIXED
        # wrapper wrongly returned DELEGATED for `minHeight` instead of NORMALISED.
        glob_comment_fixture = (
            "<?php\n"
            "// the survey only scans `src/blocks/*/render.php`, never shared includes.\n"
            "$min_height = sgs_responsive_normalise_object( $attributes['minHeight'] ?? null );\n"
        )
        stripped_glob = _strip_php_comments(glob_comment_fixture)
        check('_strip_php_comments(): a `//` comment containing a `/*`-shaped glob '
              '(`blocks/*/render.php`) does not swallow the REAL CODE LINE that follows it — '
              'the sgs_responsive_normalise_object() call must survive stripping',
              'sgs_responsive_normalise_object' in stripped_glob)
        check('_strip_php_comments(): the glob-comment line itself IS removed (proves this '
              'is a targeted fix, not "stop stripping // comments altogether")',
              'the survey only scans' not in stripped_glob)

        # --- regression control: a MULTI-LINE /* */ comment must not shift line numbers
        # for hazards reported after it. This is a SECOND real bug found + fixed during
        # this pass, discovered by sanity-checking a reported line number against the real
        # file — nav-menu/render.php's genuine `(string) $attributes['gap']` cast is at
        # line 1501, but was first reported as line 977 (524 lines short) purely because
        # multi-line comments earlier in the file had their internal newlines deleted
        # along with their text. ---
        multiline_comment_fixture = (
            "<?php\n"
            "/*\n"
            " * A five-line\n"
            " * block comment\n"
            " * that must not\n"
            " * shift line numbers\n"
            " */\n"
            "$x = (string) $attributes['gap'];\n"
        )
        (Path(td, 'test-multiline-comment')).mkdir()
        (Path(td, 'test-multiline-comment', 'x.php')).write_text(
            multiline_comment_fixture, encoding='utf-8')
        state_ml, hazards_ml = file_hazard_state(
            Path(td, 'test-multiline-comment', 'x.php'), 'gap', declared_siblings=set())
        check('_strip_php_comments(): a hazard AFTER a multi-line /* */ comment reports '
              'its REAL line number (8), not one shifted by the comment\'s deleted '
              'internal newlines (confirmed against nav-menu/render.php\'s real '
              '977-vs-1501 drift before this fix)',
              any(h['line'] == 8 for h in hazards_ml))

        # --- end-to-end proof against REAL git history: the wrapper's actual pre-fix
        # commit content (captured via `git show <sha>:...`, not reverting the live fix)
        #
        # ⛔ PIN THE SHA, NEVER `HEAD`. This block used to read `HEAD:` and asserted the
        # result was the PRE-FIX shape. That was true only while HEAD *was* the pre-fix
        # commit. Once the wrapper fix landed, `HEAD:` started returning the FIXED file,
        # which correctly classifies NORMALISED — so both assertions below inverted and
        # --self-test went red on main. It stayed red unnoticed because this script is not
        # in gates.json, so nothing ever ran it. A fixture asserting HISTORICAL content
        # must name an immutable object; a moving ref is not a fixture.
        # e7f28b0fd verified 2026-08-24: state=RAW, kinds=2x DELETED_SIBLING_READ.
        # must classify RAW with both minHeightTablet and minHeightMobile findings, and
        # the CURRENT (already-fixed) working-tree file must classify clean for minHeight.
        import subprocess
        try:
            pre_fix_src = subprocess.run(
                ['git', 'show', f'{_PRE_FIX_WRAPPER_SHA}:plugins/sgs-blocks/includes/'
                 'class-sgs-container-wrapper.php'],
                cwd=REPO, capture_output=True, text=True, check=True, encoding='utf-8',
            ).stdout
        except Exception as exc:  # pragma: no cover — environment without git history
            pre_fix_src = None
            check(f'git history probe for class-sgs-container-wrapper.php ran (skipped: {exc})',
                  True)
        if pre_fix_src:
            d9 = Path(td) / 'test-real-pre-fix-wrapper'
            d9.mkdir()
            (d9 / 'class-sgs-container-wrapper.php').write_text(pre_fix_src, encoding='utf-8')
            state9, hazards9 = file_hazard_state(
                d9 / 'class-sgs-container-wrapper.php', 'minHeight', declared_siblings=set())
            check('end-to-end: the REAL pre-fix HEAD content of class-sgs-container-wrapper.php '
                  '(via `git show`, live tree untouched) classifies RAW for minHeight',
                  state9 == 'RAW')
            kinds9 = sorted(h['kind'] for h in hazards9)
            check('end-to-end: both minHeightTablet and minHeightMobile fire as '
                  'DELETED_SIBLING_READ findings against the real pre-fix commit content',
                  kinds9 == ['DELETED_SIBLING_READ', 'DELETED_SIBLING_READ'])

            live_state, live_hazards = file_hazard_state(
                Path('plugins/sgs-blocks/includes/class-sgs-container-wrapper.php'),
                'minHeight', declared_siblings=set())
            check('end-to-end: the CURRENT (already-fixed) working-tree wrapper file has NO '
                  'hazard findings for minHeight (state is DELEGATED or NORMALISED, never RAW)',
                  live_state != 'RAW')

        # === Coordinator-review correction (2026-08-11, same day) ===========
        # `--check` originally failed on gap/contentWidth/gridTemplateColumns purely
        # because their block.json siblings are deleted — but the coordinator PROVED
        # against the real source that those three have a SECOND working object-emission
        # path in the same file (class-sgs-container-wrapper.php:2098/2105/2111,
        # `is_array( $attributes['prop'] )` feeding `$obj_inner_props`), unlike minHeight
        # which had none. `_has_working_object_path` is the discriminator this section
        # regression-tests, sourced from the REAL live files, not invented fixtures.

        # --- positive control: inline is_array( $attributes['prop'] ) downgrades a
        # deleted-sibling read to INFORMATIONAL, proven against the REAL live wrapper ---
        wrapper_path = Path('plugins/sgs-blocks/includes/class-sgs-container-wrapper.php')
        for real_prop in ('gap', 'contentWidth', 'gridTemplateColumns'):
            real_state, real_hazards = file_hazard_state(
                wrapper_path, real_prop, declared_siblings=set())
            check(f'coordinator-fix: "{real_prop}" against the REAL live wrapper is NOT RAW '
                  f'(a working is_array( $attributes[\'{real_prop}\'] ) object path exists '
                  f'at ~class-sgs-container-wrapper.php:2098-2115, confirmed by the '
                  f'coordinator against the actual file)',
                  real_state != 'RAW')
            inert_kinds = [h['kind'] for h in real_hazards if 'DELETED_SIBLING_READ' in h['kind']]
            check(f'coordinator-fix: "{real_prop}"\'s deleted-sibling findings are tagged '
                  f'DELETED_SIBLING_READ_INERT (informational), not the live DELETED_SIBLING_READ '
                  f'kind, and are STILL present in the returned list (not silently dropped)',
                  len(inert_kinds) > 0 and all(k == 'DELETED_SIBLING_READ_INERT' for k in inert_kinds))

        # --- positive control: the TWO-STEP object-path shape (assign to a local var,
        # THEN is_array() on the var) also downgrades — proven against the REAL
        # helpers-container.php:147-154 (sgs_container_tier_gap()), the exact file that
        # still false-failed `gap --check` after the first (inline-only) correction ---
        helpers_container_path = Path('plugins/sgs-blocks/includes/helpers-container.php')
        hc_state, hc_hazards = file_hazard_state(
            helpers_container_path, 'gap', declared_siblings=set())
        check('coordinator-fix: helpers-container.php\'s TWO-STEP is_array pattern '
              '($raw = $attributes[\'gap\'] ?? \'\'; ... if ( is_array( $raw ) )) is '
              'recognised as a working object path — "gap" is NOT RAW here',
              hc_state != 'RAW')
        hc_inert = [h for h in hc_hazards if h['kind'] == 'DELETED_SIBLING_READ_INERT']
        check('coordinator-fix: helpers-container.php\'s gapTablet/gapMobile reads are '
              'reported as exactly 2 DELETED_SIBLING_READ_INERT findings',
              len(hc_inert) == 2)

        # --- end-to-end: --check itself must now PASS for all three coordinator-cited
        # properties, using the REAL repo tree (not a fixture) ---
        for real_prop in ('gap', 'contentWidth', 'gridTemplateColumns'):
            declared_real = declared_siblings(real_prop)
            all_findings = survey_shared_includes(real_prop)
            live_only = [
                f for f in all_findings
                if any(h['kind'] in _LIVE_HAZARD_KINDS for h in f['hazards'])
                and any(h['kind'] == 'DELETED_SIBLING_READ' for h in f['hazards'])
            ]
            check(f'coordinator-fix end-to-end: "{real_prop}" has ZERO live '
                  f'DELETED_SIBLING_READ findings anywhere in the real repo (the specific '
                  f'false-positive class the coordinator reported is gone)',
                  len(live_only) == 0)

        # --- negative control (specificity): a DIFFERENT prop's is_array() guard must NOT
        # satisfy this prop's object-path check — proves the regex is anchored to the
        # exact prop name, not "is_array appears somewhere in the file" ---
        d10 = Path(td) / 'test-specificity'
        d10.mkdir()
        (d10 / 'x.php').write_text(
            "<?php\n"
            "$other = $attributes['contentWidth'] ?? '';\n"
            "if ( is_array( $other ) ) { /* handles contentWidth, NOT gap */ }\n"
            "$gap_tablet_dead = $attributes['gapTablet'] ?? '';\n"
            "$gap_mobile_dead = $attributes['gapMobile'] ?? '';\n",
            encoding='utf-8')
        state10, hazards10 = file_hazard_state(d10 / 'x.php', 'gap', declared_siblings=set())
        check('negative control (specificity): an is_array() guard on a DIFFERENT prop '
              '("contentWidth") does NOT falsely satisfy "gap"\'s object-path check — '
              '"gap" still classifies RAW with the LIVE (non-inert) finding kind',
              state10 == 'RAW'
              and any(h['kind'] == 'DELETED_SIBLING_READ' for h in hazards10))

        # === Second coordinator-review correction (2026-08-11, same day) ====
        # `gap --check` STILL false-failed after the first correction — this time citing
        # nav-menu/render.php:1501's `(string) $attributes['gap']`. Confirmed against the
        # schema: sgs/nav-menu declares `gap` as plain `{"type":"string","default":"8px"}`
        # — never object-typed, never grew Tablet/Mobile siblings, never part of this
        # migration at all. This is the IDENTICAL false-positive class
        # migrate-theme-tier-scalars.py already solved once for its own S4 leg (its own
        # docstring names sgs/nav-menu's `gap` as the exact real example it was built
        # against). Fixed here by `_object_typed_blocks(prop)` — mirroring that function's
        # name and contract exactly — scoping every hazard to "can this property actually
        # hold an array AT THIS SCOPE", per-block for a block's own render.php, union for
        # a shared include (coordinator's explicit instruction to keep the two distinct).

        # --- ground the fix in the REAL schema, not an assumption ---
        gap_object_typed = _object_typed_blocks('gap')
        check('_object_typed_blocks(\'gap\') against the REAL repo does NOT include '
              '"sgs/nav-menu" (its block.json declares gap as plain "type":"string", '
              'confirmed via direct read, never object-typed)',
              'sgs/nav-menu' not in gap_object_typed)
        check('_object_typed_blocks(\'gap\') against the REAL repo DOES include at least '
              'one block (e.g. sgs/container/sgs/hero — gap genuinely migrated to object '
              'for the blocks that use SGS_Container_Wrapper) — proves the function finds '
              'real object-typed blocks, not just correctly excluding nav-menu',
              len(gap_object_typed) > 0)

        # --- positive control: the REAL nav-menu/render.php, real block.json, must NOT
        # classify RAW for "gap" any more ---
        nav_menu_rp = Path('plugins/sgs-blocks/src/blocks/nav-menu/render.php')
        nav_menu_slug = _block_slug_for_path(nav_menu_rp)
        check('_block_slug_for_path resolves nav-menu/render.php to its real block.json '
              'name ("sgs/nav-menu")', nav_menu_slug == 'sgs/nav-menu')
        nav_state, nav_hazards = file_hazard_state(
            nav_menu_rp, 'gap', declared_siblings=declared_siblings('gap'))
        check('coordinator-fix #2: the REAL nav-menu/render.php no longer classifies RAW '
              'for "gap" (its own schema declares gap as a plain string — the '
              '(string) cast at line 1501 is correct code, not a hazard)',
              nav_state != 'RAW')
        check('coordinator-fix #2: nav-menu/render.php now reports ZERO hazard findings '
              'for "gap" (not merely downgraded to informational — genuinely out of scope, '
              'so nothing is printed by --survey either)',
              len(nav_hazards) == 0)

        # --- negative control: the per-block scope gate must NOT blanket-disable RAW_CAST
        # detection everywhere — a block whose OWN schema DOES declare the prop
        # object-typed must still be flagged for the identical unguarded-cast shape.
        # Built from a synthetic block.json (mirrors a real object-typed block like
        # sgs/hero) paired with a heading-style unguarded cast, proving the scope gate is
        # precise (excludes nav-menu) rather than blunt (excludes everything). ---
        d11 = Path(td) / 'test-fake-block' / 'fake-block'
        d11.mkdir(parents=True)
        (d11 / 'block.json').write_text(
            json.dumps({
                'name': 'sgs/fake-block',
                'attributes': {'gap': {'type': 'object', 'default': {}}},
            }),
            encoding='utf-8')
        (d11 / 'render.php').write_text(
            "<?php\n$x = (string) $attributes['gap'];\n", encoding='utf-8')
        # object_typed_blocks passed EXPLICITLY: `_object_typed_blocks` only scans the
        # REAL BLOCKS_DIR, so a synthetic fake block would never appear in its output no
        # matter what its own block.json says — this fixture proves the SCOPE-GATE logic
        # in isolation, using the same mechanism `survey_shared_includes` uses for real
        # files (passing a precomputed set in), not the live schema scan itself (already
        # proven separately above against the real repo).
        fake_state, fake_hazards = file_hazard_state(
            d11 / 'render.php', 'gap', declared_siblings=set(),
            object_typed_blocks={'sgs/fake-block'})
        check('negative control: a block whose OWN block.json DOES declare "gap" as '
              'object-typed still fires RAW_CAST on the identical unguarded (string) cast '
              '— the scope gate excludes nav-menu specifically, not RAW_CAST detection '
              'generally',
              fake_state == 'RAW'
              and any(h['kind'] == 'RAW_CAST' for h in fake_hazards))

        # --- end-to-end: --check itself must now PASS for "gap" against the REAL repo ---
        gap_findings = survey_shared_includes('gap')
        gap_live = [
            f for f in gap_findings
            if any(h['kind'] in _LIVE_HAZARD_KINDS for h in f['hazards'])
        ]
        check('coordinator-fix #2 end-to-end: "gap" has ZERO live hazard findings '
              'anywhere in the real repo (nav-menu\'s false positive is gone, and no '
              'other live hazard was masked by the scope gate)',
              len(gap_live) == 0)

    # ================================================================================
    # declared_siblings() — DB-first + disk crosscheck. Fixtures per
    # THE-MIGRATION-METHOD.md Step 6 (positive / negative control / edge / idempotence /
    # corpus control), plus a fixture for the source='sgs' trap.
    # ================================================================================

    # --- CORPUS CONTROL. Runs FIRST and everything below depends on it.
    # ⛔ This gate has a unique vacuity mode: check_db_parity() compares two sets, so if BOTH
    # collapse to empty it reports "agree" and exits 0 — a detector that has stopped detecting,
    # indistinguishable from a clean tree. Neither side may be empty, and both must be within
    # a band derived from a SECOND, dumber enumeration (count block.json files on disk) rather
    # than from a number this author chose.
    _db_pairs = _db_tier_pairs()
    _disk_pairs = _disk_tier_pairs()
    _n_blockjson = len(list(BLOCKS_DIR.glob('*/block.json')))
    check('corpus control: the DISK tier-pair enumeration is non-empty '
          f'(got {len(_disk_pairs)}) — an empty one would make parity vacuously green',
          len(_disk_pairs) > 0)
    check('corpus control: the DB tier-pair enumeration is non-empty '
          f'(got {len(_db_pairs)}) — ditto',
          len(_db_pairs) > 0)
    check('corpus control: the block.json corpus itself did not collapse '
          f'(found {_n_blockjson} block.json files, expected > 50) — the marker-file/ROOT '
          'failure that silently scanned 4 files instead of 380',
          _n_blockjson > 50)

    # --- POSITIVE. A property known to declare both tiers.
    check('positive: declared_siblings("margin") returns both tiers from the DB, '
          'crosschecked against the tree',
          declared_siblings('margin') == {'Tablet', 'Mobile'})

    # --- NEGATIVE CONTROL. A property that exists nowhere returns empty — and the assertion
    # can distinguish that from the positive case above, so it is not vacuous.
    check('negative control: a property declared nowhere returns the EMPTY set',
          declared_siblings('sgsPropertyThatDoesNotExistAnywhere') == set())
    check('negative control is not vacuous: the positive case above returns a NON-empty set, '
          'so "empty" is a real signal rather than what this function always returns',
          declared_siblings('margin') != set())

    # --- IDEMPOTENCE / determinism. Two calls agree; a set built from an unordered DB read
    # plus a glob walk is exactly the shape that has produced non-determinism here before
    # (extract-signatures.py's css_tier was randomised by set iteration + hash salting).
    check('idempotence: declared_siblings("padding") returns the same set on two calls',
          declared_siblings('padding') == declared_siblings('padding'))

    # --- THE source='sgs' TRAP. block_attributes also holds native_wp rows for CORE blocks,
    # which have no directory under src/blocks/ at all — so an UNFILTERED query returns a set
    # WIDER than disk. Every documented caveat about this table warns of omissions; this is the
    # opposite failure. This fixture fails the moment someone drops the filter.
    _con = sqlite3.connect(f'file:{SGS_DB}?mode=ro', uri=True)
    try:
        _unfiltered = {(s, a) for s, a in
                       _con.execute('SELECT block_slug, attr_name FROM block_attributes')
                       if a.endswith(TIERS)}
    finally:
        _con.close()
    check("source='sgs' is load-bearing: an UNFILTERED block_attributes query returns MORE "
          f'tier pairs ({len(_unfiltered)}) than the filtered one ({len(_db_pairs)}), so '
          'dropping the filter would silently widen the answer past what exists on disk',
          len(_unfiltered) > len(_db_pairs))
    check("source='sgs': every pair the filter removes is a core/ block with no src/blocks/ "
          'directory — i.e. the filter removes exactly the rows that cannot exist on disk',
          all(s.startswith('core/') and not (BLOCKS_DIR / s.split('/', 1)[1]).exists()
              for s, _a in (_unfiltered - _db_pairs)))

    # --- DIVERGENCE. The whole point of the crosscheck: when the derived DB disagrees with the
    # tree, this must RAISE, not quietly return one side. Injected by swapping the DB half for
    # a stub, so nothing on disk or in the DB is touched.
    _orig_db_fn = globals()['_db_declared_siblings']
    globals()['_db_declared_siblings'] = lambda prop: {'Tablet'}
    try:
        declared_siblings('margin')
        _raised = False
    except TierSiblingParityError:
        _raised = True
    finally:
        globals()['_db_declared_siblings'] = _orig_db_fn
    check('divergence: when the DB and the tree disagree, declared_siblings RAISES '
          'TierSiblingParityError rather than returning either side — a silent pick would '
          'mark a LIVE dead-sibling read as legitimate (D575)',
          _raised)
    check('divergence fixture restored the real DB function (the stub did not leak into the '
          'rest of the suite)',
          globals()['_db_declared_siblings'] is _orig_db_fn
          and declared_siblings('margin') == {'Tablet', 'Mobile'})

    # --- THE GATE ITSELF. check_db_parity must return 0 on the real repo right now.
    check('gate: check_db_parity() returns 0 against the real repo (DB and tree agree)',
          check_db_parity(quiet=True) == 0)

    # ================================================================================
    # classify() — the `<prop>Desktop` base-name fix (2026-08-25). Three real families
    # (sgs/brand-strip.columns, sgs/hero.textAlign, sgs/whatsapp-cta.showOn) declare their
    # desktop tier as `<prop>Desktop` rather than bare `<prop>`; classify() must still see
    # them as FLAT, or --all-properties/--check silently drop them (measured pre-fix: 34
    # disk-derived migratable block-touches vs 37 DB-derived — exactly this 3-family gap).
    # ================================================================================

    # --- positive: a synthetic Desktop-named base + both tier siblings classifies FLAT,
    # not ABSENT. Mirrors the real sgs/brand-strip.columns shape (columnsDesktop/
    # columnsTablet/columnsMobile, all plain-scalar), synthetic so the fixture doesn't
    # depend on any one block.json's exact declaration surviving future edits.
    _desktop_attrs = {
        'widgetProp': {'type': 'string'},          # unrelated attr, must not confuse classify()
        'widgetPropDesktop': {'type': 'number', 'default': 3},
        'widgetPropTablet': {'type': 'number', 'default': 2},
        'widgetPropMobile': {'type': 'number', 'default': 1},
    }
    _kind_desktop, _sibs_desktop = classify(_desktop_attrs, 'widgetProp')
    check('positive: a <prop>Desktop base + Tablet/Mobile siblings classifies FLAT '
          f'(got {_kind_desktop!r}), not ABSENT — the exact shape of the 3 real families '
          'this fix restores to the census',
          _kind_desktop == 'FLAT')
    check('positive: FLAT sibling list still names the Tablet/Mobile attrs correctly',
          set(_sibs_desktop) == {'widgetPropTablet', 'widgetPropMobile'})

    # --- negative control: tier siblings present, but NO base under EITHER name (bare or
    # Desktop) — must still classify ABSENT. Proven non-vacuous by first checking that the
    # SAME attrs dict WITH a Desktop base added (above) does NOT classify ABSENT — so this
    # isn't a fixture that would report ABSENT no matter what classify() does.
    _no_base_attrs = {
        'widgetPropTablet': {'type': 'number', 'default': 2},
        'widgetPropMobile': {'type': 'number', 'default': 1},
    }
    _kind_no_base, _sibs_no_base = classify(_no_base_attrs, 'widgetProp')
    check('negative control: siblings with NO base declared under either "widgetProp" or '
          f'"widgetPropDesktop" classifies ABSENT (got {_kind_no_base!r})',
          _kind_no_base == 'ABSENT' and _sibs_no_base == [])
    check('negative control is not vacuous: the SAME sibling attrs, with a Desktop base '
          'added, classify FLAT (not ABSENT) — so ABSENT above is a real signal, not '
          "classify()'s answer regardless of input",
          _kind_desktop == 'FLAT' and _kind_no_base == 'ABSENT')

    # --- regression: a normal bare-base family classifies exactly as before this fix.
    # Sourced from a real family (`sgs/container.gap` — bare "gap" base + both tier
    # siblings, all plain-scalar pre-migration shape) rather than another synthetic one,
    # so the regression check is grounded in the real repo, not just this fixture's own
    # internal consistency.
    _bare_bj = BLOCKS_DIR / 'container' / 'block.json'
    _bare_data = json.loads(_bare_bj.read_text(encoding='utf-8'))
    _bare_attrs = _bare_data.get('attributes', {})
    check('regression: sgs/container.gap has a bare "gap" base declared (fixture premise '
          'still holds against the real repo)',
          isinstance(_bare_attrs.get('gap'), dict))
    _kind_bare, _sibs_bare = classify(_bare_attrs, 'gap')
    check(f'regression: a normal bare-base family (sgs/container.gap) still classifies '
          f'{_kind_bare!r} exactly as it did before this fix (OBJECT/ASSET/BLENDED — '
          'gap is already migrated on this block, not FLAT)',
          _kind_bare in ('OBJECT', 'ASSET', 'BLENDED'))
    check('regression: the bare-base fixture does NOT also match on "gapDesktop" (proves '
          'the bare-name branch is taken, not a Desktop fallback masking it)',
          'gapDesktop' not in _bare_attrs)

    # --- end-to-end: --all-properties now sees all three real Desktop-based families as
    # non-ABSENT for their own block, matching the doc-block's verified figures.
    _real_cases = [
        ('brand-strip', 'columns'),
        ('hero', 'textAlign'),
        ('whatsapp-cta', 'showOn'),
    ]
    for _slug, _prop in _real_cases:
        _bj = BLOCKS_DIR / _slug / 'block.json'
        _data = json.loads(_bj.read_text(encoding='utf-8'))
        _attrs = _data.get('attributes', {})
        check(f'end-to-end: sgs/{_slug}.{_prop} (declared as "{_prop}Desktop" on disk) no '
              f'longer classifies ABSENT',
              classify(_attrs, _prop)[0] != 'ABSENT')

    # ================================================================================
    # classify() — the C19 art-directed-media exemption (2026-09-02, uniformity sweep).
    # ART_DIRECTED_MEDIA must be reachable (positive), must not overmatch a real
    # migratable property (negative control), and the negative control must not be
    # vacuous (same fixture shape, differing only in the name it tests).
    # ================================================================================
    _media_attrs = {
        'imageId': {'type': 'integer', 'default': 0},
        'imageIdTablet': {'type': 'integer', 'default': 0},
        'imageIdMobile': {'type': 'integer', 'default': 0},
    }
    _kind_media, _sibs_media = classify(_media_attrs, 'imageId')
    check(f'positive: "imageId" (scalar base + scalar Tablet/Mobile siblings) classifies '
          f'ART_DIRECTED_MEDIA (got {_kind_media!r}), never FLAT — C19 forbids folding a '
          'per-device media identity into a responsive object',
          _kind_media == 'ART_DIRECTED_MEDIA')
    check('ART_DIRECTED_MEDIA sibling list still names the Tablet/Mobile attrs (excluded '
          'from migration, not silently dropped from the report)',
          set(_sibs_media) == {'imageIdTablet', 'imageIdMobile'})

    # --- companion-field fix (2026-09-06): a field that travels WITH a file-reference
    # attr, but doesn't itself end in Id/Url/Content, must also be exempted — this is the
    # exact shape that let `splitImageAlt` get folded by mistake in the prior session.
    _companion_attrs = {
        'splitImageUrl': {'type': 'string', 'default': ''},
        'splitImageAlt': {'type': 'string', 'default': ''},
        'splitImageAltTablet': {'type': 'string', 'default': ''},
        'splitImageAltMobile': {'type': 'string', 'default': ''},
    }
    _kind_companion, _ = classify(_companion_attrs, 'splitImageAlt')
    check('positive: "splitImageAlt" (shares the "splitImage" stem with the declared '
          f'file-reference attr "splitImageUrl") classifies ART_DIRECTED_MEDIA '
          f'(got {_kind_companion!r}), never FLAT — this is the real splitImageAlt '
          'mistake this fix exists to close',
          _kind_companion == 'ART_DIRECTED_MEDIA')

    # --- negative control: a coincidental substring match with NO capital-letter word
    # boundary must NOT be treated as a companion (proves the stem test isn't a bare
    # `.startswith()`, which would false-positive on any prop merely containing the stem)
    _boundary_attrs = {
        'imageId': {'type': 'integer', 'default': 0},
        'images': {'type': 'string', 'default': ''},
        'imagesTablet': {'type': 'string', 'default': ''},
        'imagesMobile': {'type': 'string', 'default': ''},
    }
    _kind_boundary, _ = classify(_boundary_attrs, 'images')
    check('negative control: "images" (a coincidental lowercase-continuation substring '
          f'of "imageId", not a real companion) still classifies FLAT (got '
          f'{_kind_boundary!r}) — the companion test requires a PascalCase word boundary, '
          'not a bare substring match',
          _kind_boundary == 'FLAT')

    _opacity_attrs = {
        'backgroundOverlayOpacity': {'type': 'number', 'default': 1},
        'backgroundOverlayOpacityTablet': {'type': 'number', 'default': 1},
        'backgroundOverlayOpacityMobile': {'type': 'number', 'default': 1},
    }
    _kind_opacity, _ = classify(_opacity_attrs, 'backgroundOverlayOpacity')
    check('negative control: "backgroundOverlayOpacity" (same scalar-base/scalar-sibling '
          f'shape as imageId, but not a file-reference name) still classifies FLAT '
          f'(got {_kind_opacity!r}) — a real migration target must not be caught by the '
          'C19 exemption',
          _kind_opacity == 'FLAT')
    check('negative control is not vacuous: the SAME fixture shape classifies '
          'ART_DIRECTED_MEDIA for "imageId" and FLAT for "backgroundOverlayOpacity" — the '
          'suffix test is doing the discriminating, not classify() ignoring the name',
          _kind_media == 'ART_DIRECTED_MEDIA' and _kind_opacity == 'FLAT')

    # --- end-to-end: the 17 real art-directed media attrs in the live tree are excluded
    # from the MIGRATABLE population (--all-properties reported 32 before this fix, 15
    # after — exactly 32 - 17).
    _real_media_cases = [
        ('decorative-image', 'imageId'), ('decorative-image', 'imageUrl'),
        ('media', 'videoUrl'), ('media', 'svgContent'), ('media', 'thumbnailId'),
        ('responsive-logo', 'logoId'), ('responsive-logo', 'logoUrl'),
        ('before-after', 'beforeImageId'), ('before-after', 'afterImageUrl'),
        ('hero', 'splitImageId'), ('hero', 'splitSvgContent'),
        ('hero', 'splitImageAlt'),
    ]
    for _slug, _prop in _real_media_cases:
        _bj = BLOCKS_DIR / _slug / 'block.json'
        _data = json.loads(_bj.read_text(encoding='utf-8'))
        _attrs = _data.get('attributes', {})
        check(f'end-to-end: sgs/{_slug}.{_prop} classifies ART_DIRECTED_MEDIA, not FLAT '
              '(would have been silently folded into a responsive object pre-fix)',
              classify(_attrs, _prop)[0] == 'ART_DIRECTED_MEDIA')

    # ================================================================================
    # classify() — BOX_FLAT discrimination (2026-09-06, Phase 2 tier-object migration).
    # Must be REACHABLE (positive: a real box-of-sides family, box_family-tagged in the
    # DB), must NOT overmatch a genuine per-tier ASSET family (negative control, same
    # object-base+object-siblings shape), must NOT overmatch an ALREADY-migrated
    # tier-of-boxes family (second negative control), and the block_slug=None fallback
    # (every synthetic self-test fixture above this point) must keep classifying exactly
    # as before this fix — proving the DB check never fires without a real slug.
    # ================================================================================
    _kind_no_slug, _ = classify(
        {'padding': {'type': 'object'}, 'paddingTablet': {'type': 'object'},
         'paddingMobile': {'type': 'object'}},
        'padding',
    )
    check('negative control: classify() called with NO block_slug (every synthetic '
          f'fixture in this suite) still classifies ASSET (got {_kind_no_slug!r}), never '
          'BOX_FLAT — the DB check must not fire on a fabricated attribute name',
          _kind_no_slug == 'ASSET')

    _bj_container = json.loads((BLOCKS_DIR / 'container' / 'block.json').read_text(encoding='utf-8'))
    _attrs_container = _bj_container.get('attributes', {})
    _kind_padding, _sibs_padding = classify(_attrs_container, 'padding', block_slug='sgs/container')
    check(f'positive: sgs/container.padding (a real box-of-sides family, box_family '
          f'tagged on its Tablet/Mobile siblings) classifies BOX_FLAT (got {_kind_padding!r}), '
          'not ASSET — this is the exact "--survey reports 0 to migrate" defect the '
          'adversarial council proved live this session',
          _kind_padding == 'BOX_FLAT')
    check('BOX_FLAT sibling list still names the Tablet/Mobile attrs (reported, not '
          'silently absorbed into ASSET)',
          set(_sibs_padding) == {'paddingTablet', 'paddingMobile'})

    _kind_bg, _ = classify(_attrs_container, 'backgroundImage', block_slug='sgs/container')
    check(f'negative control: sgs/container.backgroundImage (same object-base + '
          f'object-siblings SHAPE as padding, but a genuine per-tier ASSET, not a box '
          f'family) still classifies ASSET (got {_kind_bg!r}), never BOX_FLAT — the '
          'box_family DB column is doing the discriminating, not classify() treating '
          'every consistent object family as a box',
          _kind_bg == 'ASSET')

    _kind_cbp, _ = classify(_attrs_container, 'contentBandPadding', block_slug='sgs/container')
    check('negative control is not vacuous: sgs/container.contentBandPadding (already '
          f'migrated to the tier-of-boxes shape, no Tablet/Mobile siblings declared) '
          f'classifies OBJECT (got {_kind_cbp!r}), not BOX_FLAT — an already-done family '
          'must not be re-flagged',
          _kind_cbp == 'OBJECT')

    if failures:
        print(f'\n{len(failures)} FAILURE(S): {failures}')
        return 1
    print('\nALL PASS')
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--property', help='attribute base name, e.g. gap (not required with --self-test)')
    ap.add_argument('--survey', action='store_true')
    ap.add_argument('--fix', action='store_true', help='propose; writes nothing without --apply')
    ap.add_argument('--apply', action='store_true')
    ap.add_argument('--check', action='store_true', help='exit 1 if any FLAT/BLENDED remain')
    ap.add_argument('--all-properties', action='store_true',
                     help='iterate every property with a declared tier sibling instead of one '
                          '--property; census only (combine with --survey)')
    ap.add_argument('--check-db-parity', action='store_true',
                     help='gate: exit 1 if the framework DB and the tree disagree about any '
                          'declared tier sibling; no --property needed')
    ap.add_argument('--json', action='store_true',
                     help='with --all-properties: emit the census as JSON for a durable artefact')
    ap.add_argument('--self-test', action='store_true',
                     help='run the built-in regression fixture and exit; no --property needed')
    args = ap.parse_args()
    if args.self_test:
        return self_test()
    if args.check_db_parity:
        return check_db_parity()
    if args.all_properties:
        return survey_all_properties(json_out=args.json)
    if not args.property:
        ap.error('--property is required unless --self-test, --check-db-parity or '
                 '--all-properties is given')
    prop = args.property
    rows = survey(prop)
    shared_findings = survey_shared_includes(prop)

    if args.survey or not (args.fix or args.check):
        for kind in ('FLAT', 'BLENDED', 'OBJECT', 'ASSET', 'BOX_FLAT'):
            group = [r for r in rows if r['kind'] == kind]
            if not group:
                continue
            print(f'\n{kind} ({len(group)}):')
            for r in group:
                print(f"   {r['slug']:28} default={json.dumps(r['default']):26} "
                      f"render={r['render_state']:10} edit={r['edit_state']}")
        targets = [r for r in rows if r['kind'] in ('FLAT', 'BLENDED')]
        print(f'\n{len(targets)} block(s) to migrate for "{prop}" (block.json shape).')
        box_targets = [r for r in rows if r['kind'] == 'BOX_FLAT']
        if box_targets:
            print(f'\n⚠ {len(box_targets)} block(s) declare "{prop}" as a box-of-sides family '
                  '(padding/margin/borderRadius-shaped: this box, once per device tier) that '
                  'is NOT migrated by this tool\'s --fix — it needs the separate box-of-sides '
                  '-> tier-of-boxes fold (Phase 2, Step 6):')
            for r in box_targets:
                print(f"   {r['slug']:28} default={json.dumps(r['default']):26} "
                      f"render={r['render_state']:10} edit={r['edit_state']}")
        # S2/S3 follow-up applies to EVERY block carrying the prop, not just S1 targets —
        # an OBJECT-kind block (block.json already done) can still have LEGACY edit.js or
        # RAW render.php, which is exactly what pass 3b's wasted re-discovery was about.
        needs_render = [r for r in rows if r['render_state'] in ('RAW', 'UNCLEAR')]
        needs_edit = [r for r in rows if r['edit_state'] in ('LEGACY', 'UNCLEAR')]
        if needs_render or needs_edit:
            print(f'\n⚠ S2/S3 follow-up still needed for "{prop}" (independent of block.json shape):')
            for r in needs_render:
                print(f"   {r['slug']:28} render.php is {r['render_state']} "
                      "— read via sgs_responsive_normalise_object(), or read by hand if UNCLEAR")
            for r in needs_edit:
                print(f"   {r['slug']:28} edit.js is {r['edit_state']} "
                      "— move to <ResponsiveOverride>, or read by hand if UNCLEAR")
        else:
            print(f'\nrender.php + edit.js are clean for every block carrying "{prop}" '
                  '(DELEGATED/NORMALISED, SHARED/OVERRIDDEN).')
        # D574 — shared includes (+ the hazard rescan of every block's own render.php)
        # were NEVER in scope before this pass; this is the section that would have
        # caught the wrapper's minHeight bug.
        if shared_findings:
            print(f'\n⛔ SHARED-INCLUDE / HAZARD findings for "{prop}" '
                  f'({len(shared_findings)} file(s) — these are CANDIDATES for a human to '
                  'judge, not confirmed defects unless the finding kind is DELETED_SIBLING_READ '
                  'or RAW_CAST; DELETED_SIBLING_READ_INERT/RAW_BRACKET-with-object-path are '
                  'INFORMATIONAL only and do NOT fail --check — see _has_working_object_path):')
            for f in shared_findings:
                rel = f['path'].relative_to(REPO)
                print(f"   {str(rel):70} state={f['state']}")
                for h in f['hazards']:
                    line = f"L{h['line']}" if h['line'] is not None else 'L?'
                    tag = '' if h['kind'] in _LIVE_HAZARD_KINDS else '  [informational]'
                    print(f"      {line:6} {h['kind']:26} {h['detail']}{tag}")
        else:
            print(f'\nNo shared-include or render.php hazard findings for "{prop}" '
                  '(includes/*.php scanned + every render.php rescanned for the two '
                  'hazard shapes — see module docstring "WHAT IT DOES DO — PART 2").')
        return 0

    if args.check:
        bad = [r for r in rows if r['kind'] in ('FLAT', 'BLENDED')]
        # D574 — a shared-include/render.php hazard finding gates --check ONLY when it is a
        # LIVE hazard (`_LIVE_HAZARD_KINDS` — DELETED_SIBLING_READ or RAW_CAST), a
        # HIGH-CONFIDENCE live-bug signal, not a judgement call like the general
        # render_state RAW bucket. This is "the gate matches the census": the class of bug
        # that shipped through a 0-RAW-findings survey must now fail the gate.
        #
        # ⛔ CORRECTED same-day (coordinator review) after this originally gated on ANY
        # hazard at all (`if f['hazards']`), which FALSE-POSITIVED `gap`/`contentWidth`/
        # `gridTemplateColumns` — each of those has a working object-emission path
        # elsewhere in class-sgs-container-wrapper.php (`is_array( $attributes['gap'] )`
        # etc feeding `$obj_inner_props`, confirmed live at :2098/2105/2111), so their
        # dead-sibling reads are informational, not a defect. `_has_working_object_path`'s
        # docstring on the earlier definition carries the full discriminator + evidence.
        hazard_files = [
            f for f in shared_findings
            if any(h['kind'] in _LIVE_HAZARD_KINDS for h in f['hazards'])
        ]
        if bad or hazard_files:
            if bad:
                print(f'[migrate-tier-object --check] {len(bad)} block(s) still un-migrated for "{prop}":')
                for r in bad:
                    print(f"   {r['slug']:28} {r['kind']}")
            if hazard_files:
                print(f'[migrate-tier-object --check] {len(hazard_files)} shared-include/render.php '
                      f'LIVE hazard(s) for "{prop}":')
                for f in hazard_files:
                    rel = f['path'].relative_to(REPO)
                    for h in f['hazards']:
                        if h['kind'] not in _LIVE_HAZARD_KINDS:
                            continue  # informational — printed by --survey, not the gate
                        line = f"L{h['line']}" if h['line'] is not None else 'L?'
                        print(f"   {str(rel):70} {line:6} {h['kind']:22} {h['detail']}")
            return 1
        print(f'[migrate-tier-object --check] OK - "{prop}" is fully object-shaped everywhere, '
              'and no LIVE shared-include/render.php hazards were found (informational-only '
              'findings, if any, are listed by --survey and do not gate).')
        return 0

    targets = [r for r in rows if r['kind'] in ('FLAT', 'BLENDED')]
    if not targets:
        print(f'Nothing to do for "{prop}".')
        return 0

    print(f'{"APPLYING" if args.apply else "PROPOSED (dry-run; pass --apply to write)"} '
          f'- "{prop}" across {len(targets)} block(s)\n')
    follow_up, errors = [], []
    for r in targets:
        ok, desc, err = apply_block_json(r, prop, args.apply)
        if err:
            errors.append((r['slug'], err))
            print(f"   {r['slug']:28} ⛔ REFUSED: {err}")
            continue
        verb = 'siblings dropped; default UNCHANGED' if r['kind'] == 'BLENDED' else desc
        print(f"   {r['slug']:28} {r['kind']:8} {verb}")
        if r['render_reads']:
            follow_up.append((r['slug'], 'render.php', r['render_reads']))
        if r['edit_refs']:
            follow_up.append((r['slug'], 'edit.js', r['edit_refs']))

    if follow_up:
        print('\n⚠ MANUAL FOLLOW-UP REQUIRED (reported, never silently skipped):')
        for slug, f, n in follow_up:
            print(f'   {slug:28} {f:12} {n} reference(s)')
        print('   render.php: read the object via sgs_responsive_normalise_object().')
        print('   edit.js   : move the control to <ResponsiveOverride>.')

    # S2 auto-fix — LEGACY edit.js only. See fix_edit_js's docstring + the module
    # docstring for why this is safe to auto-apply while S3 (render.php) is not: the
    # LEGACY shape is a narrow, byte-for-byte-repeatable structural pattern; render.php's
    # RAW reads need per-block judgement about downstream usage, so they stay flagged
    # above, never auto-rewritten.
    legacy = [r for r in rows if r['edit_state'] == 'LEGACY']
    if legacy:
        print(f'\n{"APPLYING" if args.apply else "PROPOSED (dry-run)"} '
              f'edit.js LEGACY -> ResponsiveOverride for "{prop}" across {len(legacy)} block(s):')
        for r in legacy:
            ok, desc, err = fix_edit_js(r, prop, args.apply)
            if err:
                errors.append((r['slug'], err))
                print(f"   {r['slug']:28} ⛔ REFUSED: {err}")
                continue
            print(f"   {r['slug']:28} {desc}")

    if errors:
        print(f'\n⛔ {len(errors)} block(s) REFUSED — nothing was written for them.')
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
