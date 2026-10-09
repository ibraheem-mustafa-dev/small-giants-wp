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
so it is never duplicated or allowed to drift:

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
import os
import re
import sqlite3
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
HERE = Path(__file__).parent
REPO_ROOT = HERE.parent.parent.parent.parent  # scripts/lib -> repo root
INCLUDES_DIR = REPO_ROOT / "plugins" / "sgs-blocks" / "includes"
WRAPPER_PHP = INCLUDES_DIR / "class-sgs-container-wrapper.php"
HELPERS_TYPOGRAPHY_PHP = INCLUDES_DIR / "helpers-typography.php"


# ---------------------------------------------------------------------------
# DB-backed breakpoint suffix vocabulary (R-31-1 — never a hardcoded dict)
# ---------------------------------------------------------------------------

def _framework_db_path() -> Path:
    """The framework DB this process reads: $SGS_FRAMEWORK_DB, else the shared default."""
    override = os.environ.get("SGS_FRAMEWORK_DB")
    if override:
        return Path(override)
    return Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"


@functools.lru_cache(maxsize=None)
def breakpoint_suffixes() -> tuple[str, ...]:
    """{'Mobile', 'Tablet', 'Desktop'} from modifier_suffixes WHERE kind='breakpoint'.

    R-31-1: the breakpoint suffix vocabulary is DB-owned. A caller that needs the
    full DB-derived set, including 'Desktop', uses it to exclude any
    suffix-named sibling attr from self-promoting to "migrated base".
    """
    db = _framework_db_path()
    conn = sqlite3.connect(f"file:{db.as_posix()}?mode=ro", uri=True)
    try:
        rows = conn.execute(
            "SELECT suffix FROM modifier_suffixes WHERE kind = ? ORDER BY rowid",
            ("breakpoint",),
        ).fetchall()
    finally:
        conn.close()
    return tuple(suffix for (suffix,) in rows)


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
    DB-derived breakpoint vocabulary (which also includes 'Desktop') passes
    `suffixes=breakpoint_suffixes()` explicitly.
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
    hero, trust-bar, accordion, …) delegate wrapper-level
    properties like `gap`/`gridItemPadding` to that one shared file rather
    than reading them inline. Also covers the sibling tier-boolean pair
    `sgs_resolve_on_tiers()` / `sgs_emit_tier_rules()` — traced via the
    assigned variable name, not a literal-string match.
    """
    block_dir_name = block_slug.split("/")[-1]
    # render.php plus the block's other PHP files (render partials it requires
    # from its own folder, e.g. google-reviews/render-styles.php).
    block_dir = blocks_dir / block_dir_name
    candidate_paths = [block_dir / "render.php"] + sorted(
        p for p in block_dir.glob("*.php") if p.name != "render.php"
    ) + [wrapper_path]

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
    # The same call shape through a local variable that holds the attribute
    # unchanged (`$item_padding = $attributes['itemPadding'] ?? null;` then
    # `'value' => $item_padding`), as `attr_tier_consumer_evidence` already
    # accepts. A variable built by a transform (`= sgs_x( $attributes[...] )`)
    # does not match: the assignment must be the bare attribute, optionally
    # with a `??` default.
    var_assign_re = re.compile(
        r"\$([A-Za-z_][A-Za-z0-9_]*)\s*=\s*\$attributes\[\s*['\"]([A-Za-z0-9_]+)['\"]\s*\]"
        r"\s*(?:\?\?[^;]*)?;"
    )
    for m in var_assign_re.finditer(text):
        var_name, attr_name = m.group(1), m.group(2)
        if re.search(r"'value'\s*=>\s*\$" + re.escape(var_name) + r"\b", text):
            found.add(attr_name)
    found |= _closure_dispatched_tier_attrs(text)
    found |= _border_element_radius_attrs(text)
    found |= _normalising_closure_tier_attrs(text)
    found |= _border_element_tiered_width_attrs(text, path)
    return found


def _border_element_radius_attrs(text: str) -> set:
    """The radius attributes `sgs_border_element_decls( $attributes, '<prefix>', ..., $options )` unpacks per tier.

    The helper reads `{prefix}BorderRadius` (a bare `borderRadius` for the empty prefix) through
    `sgs_border_radius_tiers`, so the call site never names a tier. Its `radius` option swaps the attribute for a
    literal name, or turns the radius off with `false`. A prefix or option that is not a literal gives no evidence.
    """
    found = set()
    for call in _function_call_args(text, "sgs_border_element_decls"):
        args = _split_args(call)
        if len(args) < 2 or args[0].strip() != "$attributes":
            continue
        prefix = re.fullmatch(r"['\"]([A-Za-z0-9_]*)['\"]", args[1].strip())
        if not prefix:
            continue
        option = re.search(
            r"['\"]radius['\"]\s*=>\s*(false|true|['\"]([A-Za-z0-9_]+)['\"]|[^,)\s][^,)]*)",
            args[3] if len(args) > 3 else "",
        )
        if option and option.group(1) == "false":
            continue
        if option and option.group(2):
            found.add(option.group(2))
        elif option and option.group(1) != "true":
            continue
        else:
            found.add(prefix.group(1) + "BorderRadius" if prefix.group(1) else "borderRadius")
    return found


def _closure_bodies(text: str) -> list:
    """`(name, params, body_start, body_end)` for every `$name = (static) function ( params ) ... { body }`."""
    out = []
    for m in re.finditer(r"\$([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(?:static\s+)?function\s*\(", text):
        params_text = _balanced(text, m.end())
        params = [re.sub(r"=.*$", "", p).split()[-1] for p in _split_args(params_text) if p.split()]
        body_open = text.find("{", m.end() + len(params_text))
        if body_open == -1:
            continue
        depth, end = 1, body_open + 1
        while end < len(text) and depth:
            depth += {"{": 1, "}": -1}.get(text[end], 0)
            end += 1
        out.append((m.group(1), params, body_open, end))
    return out


def _normalising_closure_tier_attrs(text: str) -> set:
    """Attributes passed to a closure that unpacks its argument with `sgs_responsive_normalise_object()`.

    sgs/google-reviews' `$gr_box_rule = static function ( $selector, $raw, ... ) { $obj =
    sgs_responsive_normalise_object( $raw, true ); ... }` prints every tier of whatever it is handed, called as
    `$gr_box_rule( $sel, $attributes['cardPadding'] ?? null, ... )`. A call that hands it
    `$attributes[ $prefix . 'Suffix' ]` from inside another closure counts when that outer closure is called with a
    literal at the prefix's position (`$gr_button_box( $sel, 'writeReview' )` gives `writeReviewBorderWidth`).
    Only literal attribute names count.
    """
    found = set()
    closures = _closure_bodies(text)
    for name, params, start, end in closures:
        body = text[start:end]
        used = re.search(r"sgs_responsive_normalise_object\(\s*\$([A-Za-z_][A-Za-z0-9_]*)", body)
        if not used or "$" + used.group(1) not in params:
            continue
        position = params.index("$" + used.group(1))
        for arg_text in _call_arg_lists(text, name):
            args = _split_args(arg_text)
            if position >= len(args):
                continue
            arg = args[position].strip()
            literal = re.match(r"\$attributes\[\s*['\"]([A-Za-z0-9_]+)['\"]\s*\]", arg)
            if literal:
                found.add(literal.group(1))
                continue
            prefixed = re.match(r"\$attributes\[\s*\$([A-Za-z_][A-Za-z0-9_]*)\s*\.\s*['\"]([A-Za-z0-9_]+)['\"]\s*\]", arg)
            if not prefixed:
                continue
            call_at = text.find(arg_text)
            for outer, outer_params, o_start, o_end in closures:
                if not o_start < call_at < o_end or "$" + prefixed.group(1) not in outer_params:
                    continue
                prefix_position = outer_params.index("$" + prefixed.group(1))
                for outer_args in _call_arg_lists(text, outer):
                    o_args = _split_args(outer_args)
                    if prefix_position < len(o_args):
                        lit = re.fullmatch(r"['\"]([A-Za-z0-9_]+)['\"]", o_args[prefix_position].strip())
                        if lit:
                            found.add(lit.group(1) + prefixed.group(2))
    return found


def _border_element_tiered_width_attrs(text: str, path: Path) -> set:
    """The width attribute of an `sgs_border_element_decls( $attributes, '<prefix>', ... )` call that block.json
    declares as a tier envelope.

    The helper prints a width stored as `{desktop, tablet, mobile}` per tier and a flat box once, so the call site
    alone cannot say which a block stores; the attribute's declared default (`{"desktop": {}}`) does.
    """
    found = set()
    calls = _function_call_args(text, "sgs_border_element_decls")
    if not calls:
        return found
    block_json = path.parent / "block.json"
    try:
        import json
        attributes = json.loads(block_json.read_text(encoding="utf-8")).get("attributes", {})
    except (OSError, ValueError):
        return found
    for call in calls:
        args = _split_args(call)
        if len(args) < 2 or args[0].strip() != "$attributes":
            continue
        prefix = re.fullmatch(r"['\"]([A-Za-z0-9_]*)['\"]", args[1].strip())
        if not prefix:
            continue
        name = prefix.group(1) + "BorderWidth" if prefix.group(1) else "borderWidth"
        default = attributes.get(name, {}).get("default") if isinstance(attributes.get(name), dict) else None
        if isinstance(default, dict) and any(k in default for k in ("desktop", "tablet", "mobile")):
            found.add(name)
    return found


def _function_call_args(text: str, name: str) -> list:
    """The argument text of every `name( ... )` call, parentheses balanced."""
    return [_balanced(text, m.end()) for m in re.finditer(r"\b" + re.escape(name) + r"\s*\(", text)]


def context_tier_keys_from_php(path: Path) -> set:
    """Block-context keys a consumer block unpacks per tier in one PHP file.

    A provider block hands an attribute to its children through
    `providesContext` (`"sgs/accordionHeaderPadding": "headerPadding"`), so the
    tier unpacking sits in the child's render, which names the context key and
    never the attribute. The key counts when the file reads it into a variable
    (`$v = $block->context['key'] ?? ...;`) and that variable is the first
    argument of `sgs_responsive_normalise_object( $v ...)`, or of a closure
    whose body calls `sgs_responsive_normalise_object`. Empty set (never
    raises) when the file is absent or unreadable.
    """
    if not path.is_file():
        return set()
    try:
        text = path.read_text(encoding="utf-8")
    except OSError:
        return set()
    found = set()
    assign_re = re.compile(
        r"\$([A-Za-z_][A-Za-z0-9_]*)\s*=\s*\$block->context\[\s*['\"]([A-Za-z0-9_/-]+)['\"]\s*\]\s*(?:\?\?[^;]*)?;"
    )
    closure_re = re.compile(r"\$([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(?:static\s+)?function\s*\(")
    tier_closures = set()
    for closure in closure_re.finditer(text):
        body_open = text.find('{', closure.end())
        if body_open == -1:
            continue
        if "sgs_responsive_normalise_object(" in _brace_body(text, body_open):
            tier_closures.add(closure.group(1))
    for m in assign_re.finditer(text):
        var_name, key = m.group(1), m.group(2)
        direct = re.search(r"sgs_responsive_normalise_object\(\s*\$" + re.escape(var_name) + r"(?![A-Za-z0-9_])", text)
        via_closure = any(
            re.search(r"\$" + re.escape(fn) + r"\s*\(\s*\$" + re.escape(var_name) + r"(?![A-Za-z0-9_])", text)
            for fn in tier_closures
        )
        if direct or via_closure:
            found.add(key)
    return found


def _brace_body(text: str, body_open: int) -> str:
    """The text between the `{` at `body_open` and its matching `}`."""
    depth, i = 1, body_open + 1
    while i < len(text) and depth:
        depth += {'{': 1, '}': -1}.get(text[i], 0)
        i += 1
    return text[body_open + 1:i - 1]


def _split_args(arg_text: str) -> list:
    """Split a PHP argument list on its top-level commas (not inside brackets or quotes)."""
    args, depth, current, quote = [], 0, '', ''
    for char in arg_text:
        if quote:
            quote = '' if char == quote else quote
        elif char in '\'"':
            quote = char
        elif char in '([':
            depth += 1
        elif char in ')]':
            depth -= 1
        if char == ',' and depth == 0 and not quote:
            args.append(current.strip())
            current = ''
        else:
            current += char
    if current.strip():
        args.append(current.strip())
    return args


def _balanced(text: str, start: int) -> str:
    """The text from `start` (just after an opening parenthesis) to its match."""
    depth, i = 1, start
    while i < len(text) and depth:
        depth += {'(': 1, ')': -1}.get(text[i], 0)
        i += 1
    return text[start:i - 1]


def _call_arg_lists(text: str, callee: str) -> list:
    """The argument text of every `$callee( ... )` call, parentheses balanced."""
    return [_balanced(text, m.end()) for m in re.finditer(r"\$" + re.escape(callee) + r"\s*\(", text)]


def _closure_dispatched_tier_attrs(text: str) -> set:
    """The same call shape behind a closure: `$tier = static function ( $sel,
    $key, ... ) use ( $attributes ) { ... 'value' => $attributes[ $key ] ... }`,
    called as `$tier( ..., 'attrName', ... )` or, inside `foreach ( $rows as
    $row )`, as `$tier( ..., $row[1], ... )` over a literal `$rows = array(
    array( ..., 'attrName', ... ), ... )` (sgs/cart's mini-cart panel boxes).
    Only literal strings at the closure's key position count."""
    found = set()
    for key in re.finditer(r"'value'\s*=>\s*\$attributes\[\s*\$([A-Za-z_][A-Za-z0-9_]*)\s*\]", text):
        key_var = key.group(1)
        closure_re = re.compile(
            r"\$([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(?:static\s+)?function\s*\(([^)]*)\)"
        )
        for closure in closure_re.finditer(text, 0, key.start()):
            params = [re.sub(r"=.*$", '', p).split()[-1] for p in _split_args(closure.group(2)) if p.split()]
            if '$' + key_var not in params:
                continue
            # The emission must sit inside THIS closure's body, not a sibling's.
            body_open = text.find('{', closure.end())
            depth, body_end = 1, body_open + 1
            while body_open != -1 and body_end < len(text) and depth:
                depth += {'{': 1, '}': -1}.get(text[body_end], 0)
                body_end += 1
            if body_open == -1 or not body_open < key.start() < body_end:
                continue
            position = params.index('$' + key_var)
            for arg_text in _call_arg_lists(text, closure.group(1)):
                args = _split_args(arg_text)
                if position >= len(args):
                    continue
                arg = args[position]
                literal = re.fullmatch(r"['\"]([A-Za-z0-9_]+)['\"]", arg)
                if literal:
                    found.add(literal.group(1))
                    continue
                row_ref = re.fullmatch(r"\$([A-Za-z_][A-Za-z0-9_]*)\[\s*(\d+)\s*\]", arg)
                if not row_ref:
                    continue
                row_var, index = row_ref.group(1), int(row_ref.group(2))
                for loop in re.finditer(
                    r"foreach\s*\(\s*\$([A-Za-z_][A-Za-z0-9_]*)\s+as\s+\$" + re.escape(row_var) + r"\s*\)", text
                ):
                    rows_def = re.search(r"\$" + re.escape(loop.group(1)) + r"\s*=\s*array\s*\(", text)
                    if not rows_def:
                        continue
                    for row_text in _split_args(_balanced(text, rows_def.end())):
                        row = re.fullmatch(r"array\s*\((.*)\)", row_text, re.DOTALL)
                        if not row:
                            continue
                        cells = _split_args(row.group(1))
                        if index < len(cells):
                            cell = re.fullmatch(r"['\"]([A-Za-z0-9_]+)['\"]", cells[index])
                            if cell:
                                found.add(cell.group(1))
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
