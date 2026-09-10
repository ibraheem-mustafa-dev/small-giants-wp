#!/usr/bin/env python3
"""object_attr_shape.py — shared object-attribute shape discriminator.

WHY THIS EXISTS
================
`block_attributes.attr_type='object'` conflates THREE genuinely different
shapes (`.claude/plans/cloning-pipeline-tier-migration-requirements.md` G5):

  1. flat_sibling — the attribute has a declared `{attr}Tablet`/`{attr}Mobile`
     sibling (e.g. `sgs/hero.backgroundImage` + `backgroundImageTablet`/
     `backgroundImageMobile`, a per-device asset picker). Already correct —
     never a migration target.
  2. tier_object  — ONE attribute whose value is `{desktop,tablet,mobile}`,
     consumed via `sgs_responsive_normalise_object()` /
     `sgs_emit_responsive_css()` / `sgs_typography_css_rule()` /
     `sgs_resolve_on_tiers()` (e.g. `sgs/container.gap`, `.maxWidth`,
     `.contentBandPadding`).
  3. box_only     — object-typed, represents `{top,right,bottom,left}` box
     sides, decomposed in PHP into box sides, nothing to do with device
     tiers (e.g. `sgs/text.borderWidth`).

Both `attr_type` and `box_family` are IDENTICAL for shape 2 and shape 3
(verified live against sgs-framework.db, G5) — only the property's REAL PHP
consumer tells them apart. This module is the ONE place that logic lives,
so it is never duplicated or allowed to drift between its two callers:

  - `orchestrator/check_flat_tier_regression.py` — the D554 clone-output
    regression gate. Uses ONLY the evidence-required, no-elimination-
    fallback discriminator (`attr_tier_consumer_evidence` +
    `has_declared_tier_sibling`) via its own, deliberately CONSERVATIVE
    `build_migrated_property_map()` — a hard build-failing gate must never
    false-positive, so it stays narrower than the full classifier below.
  - `sgs-update-v2.py` — Stage 1 (`sgs_codebase_scan`) seeding. Uses the
    FULL 5-shape doctrine via `classify_object_attr_shape()` to populate
    both `block_attributes.is_responsive` (0/1, pre-existing) and
    `block_attributes.tier_shape` (flat_sibling/tier_object/box_only/NULL,
    D-pending 2026-09-10) in the same pass.

THE FULL 5-SHAPE DOCTRINE (`classify_object_attr_shape`)
==========================================================
Ported verbatim from `sgs-update-v2.py`'s `_compute_is_responsive()`
(D968) — ONLY the return values changed (shape strings instead of 0/1).
For an object-typed attribute, in order:

  a. Has a declared `{attr}Tablet`/`{attr}Mobile` sibling (or IS one)?
     -> 'flat_sibling' (shape 1).
  b. Real PHP evidence the value reaches the tier-normalisation pipeline
     (scanned across the block's own render.php PLUS the shared
     `class-sgs-container-wrapper.php`)? -> 'tier_object' (shape 2).
     Evidence wins over a box-shaped NAME (a box-named attr CAN still be
     genuinely tiered — e.g. `sgs/container.gridItemPadding`).
  c. Box-shaped by NAME (Spec 35's CLOSED, NAMED set — padding / margin /
     borderWidth / borderRadius and Capitalised-suffix variants), no
     evidence? -> 'box_only' (shape 3).
  d. A fixed-shape RECORD, proven by its own declaration (a top-level
     `"properties"` schema, or a non-empty `default` whose keys intersect
     NEITHER the device-tier vocabulary nor the box-side vocabulary — e.g.
     `shapeDividerTopScale`'s `{x,y}`)? -> None. Out of scope for the
     closed 3-value tier_shape enum; this is also where a `boxShadowHover`-
     style fixed-schema descriptor (`{colour,hOffset,vOffset,blur,spread,
     inset}`) would land IF it were ever object-typed (today it is
     `attr_type='string'` on `sgs/button`, so it is excluded earlier by the
     attr_type=='object' gate — but the doctrine covers the general case).
  e. A per-device media ASSET slot, proven by its final camelCase word
     (image/video/media/logo/svg/poster/url/id) — e.g. `sgs/testimonial.
     orgLogo`? -> None. Out of scope, same reasoning as (d).
  f. None of the above (elimination fallback, the dynamic-key typography
     family etc.) -> 'tier_object' (shape 2 by elimination).

A non-object-typed attribute always returns None from
`classify_object_attr_shape()` — the caller in `sgs-update-v2.py` checks
`has_declared_tier_sibling()` BEFORE branching on attr_type (mechanism 1a/1b
applies to scalars too, for `is_responsive`), but the closed tier_shape
COLUMN is scoped to object-typed attributes only per its own spec — scalars
get NULL there regardless of sibling status.

UK English in all output.
"""
from __future__ import annotations

import functools
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
HERE = Path(__file__).parent
_SCRIPTS_ROOT = HERE.parent  # .../plugins/sgs-blocks/scripts
REPO_ROOT = HERE.parent.parent.parent.parent  # scripts/orchestrator -> repo root
INCLUDES_DIR = REPO_ROOT / "plugins" / "sgs-blocks" / "includes"
WRAPPER_PHP = INCLUDES_DIR / "class-sgs-container-wrapper.php"
HELPERS_TYPOGRAPHY_PHP = INCLUDES_DIR / "helpers-typography.php"


# ---------------------------------------------------------------------------
# DB-backed breakpoint suffix vocabulary (R-31-1 — never a hardcoded dict)
# ---------------------------------------------------------------------------

def _get_db_lookup():
    """Lazy-import converter.db.db_lookup, so this module still loads
    without the converter package on sys.path (test isolation)."""
    if str(_SCRIPTS_ROOT) not in sys.path:
        sys.path.insert(0, str(_SCRIPTS_ROOT))
    from converter.db import db_lookup
    return db_lookup


@functools.lru_cache(maxsize=None)
def breakpoint_suffixes() -> tuple[str, ...]:
    """{'Mobile', 'Tablet', 'Desktop'} from modifier_suffixes WHERE kind='breakpoint'.

    R-31-1: the breakpoint suffix vocabulary is DB-owned. Used by
    `check_flat_tier_regression.py`'s own candidate filter (which needs the
    full DB-derived set, including 'Desktop', to exclude any suffix-named
    sibling attr from self-promoting to "migrated base").
    """
    return _get_db_lookup().modifier_suffixes("breakpoint")


# ---------------------------------------------------------------------------
# Shape 1 — flat-sibling test
# ---------------------------------------------------------------------------

def has_declared_tier_sibling(
    attr_name: str,
    attrs: dict,
    suffixes: tuple[str, ...] = ("Tablet", "Mobile"),
) -> bool:
    """True when `attr_name` either HAS a declared `{attr}{suffix}` sibling,
    or IS itself such a sibling of some other declared base.

    Default `suffixes=("Tablet","Mobile")` deliberately preserves
    `sgs-update-v2.py`'s `_compute_is_responsive()` CURRENT hardcoded
    behaviour byte-for-byte (mechanism 1a/1b) — this refactor must not ride
    an unrelated behaviour change (D734 doctrine: "a real behaviour change
    stacked onto a refactor makes both unfalsifiable"). A caller needing the
    DB-derived breakpoint vocabulary (`check_flat_tier_regression.py`'s own
    candidate filter, which also needs 'Desktop') passes `suffixes=
    breakpoint_suffixes()` explicitly.
    """
    for suffix in suffixes:
        if f"{attr_name}{suffix}" in attrs:
            return True
    for suffix in suffixes:
        if attr_name.endswith(suffix):
            base = attr_name[: -len(suffix)]
            if base and base in attrs:
                return True
    return False


# ---------------------------------------------------------------------------
# PHP-consumer evidence (2026-08-12 fix — see the D554 gate's own history)
# ---------------------------------------------------------------------------

@functools.lru_cache(maxsize=None)
def _read_text_cached(path_str: str) -> str:
    try:
        return Path(path_str).read_text(encoding="utf-8")
    except OSError:
        return ""


@functools.lru_cache(maxsize=None)
def _typography_property_suffixes(helpers_path: Path = HELPERS_TYPOGRAPHY_PHP) -> frozenset[str]:
    """Derive the typography sub-property suffix vocabulary (FontSize,
    LineHeight, LetterSpacing, …) from helpers-typography.php itself — the
    ONE shared `sgs_typography_attr( $prefix, '<Suffix>' )` helper's own
    call sites inside `sgs_typography_css_rule()` ARE the source of truth.
    """
    text = _read_text_cached(str(helpers_path))
    start = text.find("function sgs_typography_css_rule")
    if start == -1:
        return frozenset()
    end = text.find("\nfunction ", start + 1)
    if end == -1:
        end = len(text)
    body = text[start:end]
    return frozenset(re.findall(r"sgs_typography_attr\(\s*\$prefix\s*,\s*['\"]([A-Za-z]+)['\"]", body))


def _lcfirst(value: str) -> str:
    return value[:1].lower() + value[1:] if value else value


def attr_tier_consumer_evidence(
    block_slug: str,
    attr_name: str,
    blocks_dir: Path,
    wrapper_path: Path = WRAPPER_PHP,
) -> bool:
    """Return True when real PHP evidence shows `attr_name` on `block_slug`
    is genuinely read through the tier-normalisation pipeline
    (`sgs_responsive_normalise_object()` — directly, indirectly via a
    `'value' => $attributes['<attr>']` entry collected into an
    `sgs_emit_responsive_css()` prop-map, indirectly via a
    `'<attr>' => '<css-prop>'` array driving a `foreach ( … as $sgs_attr =>
    $sgs_css_prop )` DYNAMIC-KEY dispatch into the same prop-map, or via the
    shared `sgs_typography_css_rule()` helper) — i.e. is truly Shape 2 (a
    migrated tier-object), never merely Shape 3 (an object-typed,
    sibling-free box attribute with NO device-tier destination at all).
    Scans the block's own render.php PLUS the shared
    class-sgs-container-wrapper.php, since composite blocks (container,
    hero, cta-section, trust-bar, accordion, …) delegate wrapper-level
    properties like `gap`/`gridItemPadding` to that one shared file rather
    than reading them inline. Also covers the sibling tier-boolean pair
    `sgs_resolve_on_tiers()` / `sgs_emit_tier_rules()` — traced via the
    assigned variable name, not a literal-string match.
    """
    block_dir_name = block_slug.split("/")[-1]
    candidate_paths = [blocks_dir / block_dir_name / "render.php", wrapper_path]

    direct_re = re.compile(
        r"sgs_responsive_normalise_object\(\s*\$attributes\[\s*['\"]"
        + re.escape(attr_name) + r"['\"]\s*\]"
    )
    collected_re = re.compile(
        r"'value'\s*=>\s*\$attributes\[\s*['\"]" + re.escape(attr_name) + r"['\"]\s*\]"
    )
    dynamic_key_array_re = re.compile(
        r"['\"]" + re.escape(attr_name) + r"['\"]\s*=>\s*['\"][^'\"]*['\"]\s*,"
    )
    dynamic_key_dispatch_re = re.compile(r"'value'\s*=>\s*\$attributes\[\s*\$\w+\s*\]")
    emit_re = re.compile(r"sgs_emit_responsive_css\(")
    var_assign_re = re.compile(
        r"\$(\w+)\s*=[^;]*\$attributes\[\s*['\"]" + re.escape(attr_name) + r"['\"]\s*\]"
    )
    tier_fn_call_re = re.compile(r"sgs_(?:resolve_on_tiers|emit_tier_rules)\(")

    typo_suffixes = _typography_property_suffixes()
    prefixed_matches = sorted(
        (s for s in typo_suffixes if attr_name.endswith(s) and attr_name != s),
        key=len, reverse=True,
    )
    base_level_suffix = next(
        (s for s in typo_suffixes if attr_name == _lcfirst(s)), None
    )

    for path in candidate_paths:
        if not path.is_file():
            continue
        text = _read_text_cached(str(path))
        if direct_re.search(text):
            return True
        if collected_re.search(text) and emit_re.search(text):
            return True
        if (
            dynamic_key_array_re.search(text)
            and dynamic_key_dispatch_re.search(text)
            and emit_re.search(text)
        ):
            return True
        for suffix in prefixed_matches:
            prefix = attr_name[: -len(suffix)]
            typo_re = re.compile(
                r"sgs_typography_css_rule\(\s*\$attributes\s*,\s*['\"]"
                + re.escape(prefix) + r"['\"]"
            )
            if typo_re.search(text):
                return True
        if base_level_suffix is not None:
            typo_re = re.compile(r"sgs_typography_css_rule\(\s*\$attributes\s*,\s*(''|\"\")")
            if typo_re.search(text):
                return True

        var_match = var_assign_re.search(text)
        if var_match:
            var_name = var_match.group(1)
            var_use_re = re.compile(r"\$" + re.escape(var_name) + r"\b")

            tier_fn_match = tier_fn_call_re.search(text)
            if tier_fn_match and var_use_re.search(text, tier_fn_match.start()):
                return True

            collected_var_re = re.compile(r"'value'\s*=>\s*\$" + re.escape(var_name) + r"\b")
            if collected_var_re.search(text) and emit_re.search(text):
                return True

    return False


def tier_object_attrs_from_php(path: Path) -> set:
    """Attr names with literal render evidence of per-tier unpacking (either
    call shape) in one PHP file. Returns an empty set (never raises) when
    the file is absent or unreadable — moved verbatim from
    `sgs-update-v2.py`'s function of the same name (used to precompute a
    block's `render_tier_attrs`/the shared wrapper's `wrapper_tier_attrs`
    ONCE per block, not once per attribute).
    """
    if not path.is_file():
        return set()
    try:
        text = path.read_text(encoding="utf-8")
    except OSError:
        return set()
    evidence_re = re.compile(
        r"sgs_responsive_normalise_object\(\s*\$attributes\[\s*['\"]([A-Za-z0-9_]+)['\"]\s*\]"
        r"|'value'\s*=>\s*\$attributes\[\s*['\"]([A-Za-z0-9_]+)['\"]\s*\]"
    )
    found = set()
    for m in evidence_re.finditer(text):
        name = m.group(1) or m.group(2)
        if name:
            found.add(name)
    return found


# ---------------------------------------------------------------------------
# Shape 3 — box-by-name (Spec 35's CLOSED, NAMED set)
# ---------------------------------------------------------------------------

BOX_FAMILY_BASES = ("padding", "margin", "borderWidth", "borderRadius")


def is_box_family_base_name(attr_name: str) -> bool:
    """True when `attr_name` IS one of Spec 35's closed box bases, or a
    prefixed variant of one (name ends with the base, capitalised) — e.g.
    `cardPadding`, `ctaBorderRadius`. Moved verbatim from
    `sgs-update-v2.py`. Deliberately NOT consulted when render evidence
    exists (evidence wins — see `classify_object_attr_shape`).
    """
    for base in BOX_FAMILY_BASES:
        suffix = base[0].upper() + base[1:]
        if attr_name == base or attr_name.endswith(suffix):
            return True
    return False


# ---------------------------------------------------------------------------
# Shape 4 — fixed-shape RECORD (out of scope for tier_shape; NULL)
# ---------------------------------------------------------------------------

_TIER_KEY_NAMES = frozenset({"desktop", "tablet", "mobile"})
_BOX_SIDE_KEY_NAMES = frozenset({"top", "right", "bottom", "left"})


def is_record_object_attr(attr_def) -> bool:
    """True when an object-typed attr's OWN declaration proves it is a
    fixed-shape RECORD (a small config struct with named, non-tier,
    non-box fields) rather than a tier object or a box object. Moved
    verbatim from `sgs-update-v2.py`. This is where a `boxShadowHover`-
    style fixed-schema descriptor (`{colour,hOffset,vOffset,blur,spread,
    inset}`) would land if it were ever declared object-typed.
    """
    if not isinstance(attr_def, dict):
        return False
    _props = attr_def.get("properties")
    if isinstance(_props, dict) and _props:
        return True
    _default = attr_def.get("default")
    if isinstance(_default, dict) and _default:
        _keys = set(_default.keys())
        if not (_keys & _TIER_KEY_NAMES) and not (_keys & _BOX_SIDE_KEY_NAMES):
            return True
    return False


# ---------------------------------------------------------------------------
# Shape 5 — per-device media ASSET slot (out of scope for tier_shape; NULL)
# ---------------------------------------------------------------------------

_ASSET_HINT_WORDS = frozenset(
    {"image", "video", "media", "thumbnail", "logo", "svg", "poster", "url", "id"}
)
_CAMEL_WORD_RE = re.compile(r"[A-Z]?[a-z0-9]+|[A-Z]+(?![a-z])")


def _camel_words(name: str) -> list:
    return [w.lower() for w in _CAMEL_WORD_RE.findall(name)]


def is_asset_like_attr(attr_name: str) -> bool:
    """True when `attr_name`'s FINAL camelCase word names a per-device asset
    (image/video/media/logo/svg/poster/url/id) — i.e. the attribute itself
    IS an asset slot, not a styling property of one. Moved verbatim from
    `sgs-update-v2.py`.
    """
    words = _camel_words(attr_name)
    return bool(words) and words[-1] in _ASSET_HINT_WORDS


# ---------------------------------------------------------------------------
# The full 5-shape classifier
# ---------------------------------------------------------------------------

def classify_object_attr_shape(
    attr_name: str,
    attr_type: str,
    attr_def: dict,
    attrs: dict,
    render_tier_attrs: set,
    wrapper_tier_attrs: set,
) -> str | None:
    """Return 'flat_sibling' | 'tier_object' | 'box_only' | None for an
    OBJECT-TYPED attribute. Returns None immediately for a non-object
    `attr_type` — the caller decides separately whether a scalar
    flat-sibling base/sibling counts for its own purposes (e.g.
    `is_responsive`); the tier_shape COLUMN this feeds is scoped to
    object-typed attributes only, per its own spec.

    See the module docstring's "THE FULL 5-SHAPE DOCTRINE" section for the
    decision order and rationale — ported verbatim from `sgs-update-v2.py`'s
    `_compute_is_responsive()` (D968), only the return values differ.
    """
    if attr_type != "object":
        return None

    if has_declared_tier_sibling(attr_name, attrs):
        return "flat_sibling"

    has_evidence = attr_name in render_tier_attrs or attr_name in wrapper_tier_attrs
    is_box_by_name = is_box_family_base_name(attr_name)

    if has_evidence:
        # Real evidence overrides a box-shaped NAME (e.g.
        # sgs/container.gridItemPadding is box-named but genuinely tiered).
        return "tier_object"

    if is_box_by_name:
        return "box_only"

    if is_record_object_attr(attr_def):
        return None

    if is_asset_like_attr(attr_name):
        return None

    # Elimination fallback: object-typed, no sibling, no box name, no
    # evidence, no record shape, no asset shape — a tier by elimination
    # (the dynamic-key typography family etc.). Printed for auditability —
    # this is the one branch with no positive proof, only exclusion, so a
    # future corpus addition landing here silently should be visible on
    # every reseed, not just inferred from a 'tier_object' count going up.
    print(
        f"  NOTE tier_shape: '{attr_name}' classified 'tier_object' by "
        f"ELIMINATION (no sibling, no box name, no PHP evidence, no record "
        f"shape, no asset shape) — verify this is correct if it's a new "
        f"attribute."
    )
    return "tier_object"
