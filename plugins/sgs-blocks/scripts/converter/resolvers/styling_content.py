"""styling_content.py — modularised ``_lift_styling_attrs_by_selector`` (convert.py:3903).

Faithful port of the universal DB-driven styling-attr lift for G3-attrs content blocks,
ported per Spec 31 §1/§3.B1 (D246). The only INTENTIONAL behaviour difference from the
original is the **B2 fix** (qc-council D247):

  The frozen source discards ``_bp_decls`` at line ~4025, dropping responsive
  typography/colour to base-only.  This port consumes ``bp_decls`` and emits
  ``{attr}{bp_suffix}`` companion keys (e.g. ``quoteFontSizeTablet``,
  ``quoteColourMobile``) keyed off the DB-owned breakpoint suffix vocabulary
  (``modifier_suffixes(kind='breakpoint')``) + the ``property_suffixes``
  DB table — the EXACT pattern ``_lift_typography_to_block_attrs`` uses
  (convert.py:~1718).

All other behaviour is behaviour-IDENTICAL to the original.

Source reference: convert.py:3903 (``_lift_styling_attrs_by_selector``).
Spec refs: FR-31-2, FR-31-5 D1, R-31-1, R-31-9.
"""
from __future__ import annotations

from bs4 import Tag

from converter.services.styling_helpers import (
    collect_css_decls_for_element,
    css_value_to_attr,
    extract_token_or_hex,
    split_value_unit,
    strip_important,
)
from converter.db import db_lookup


# ---------------------------------------------------------------------------
# Constants (convert.py:3897 + 3980 — ported verbatim)
# ---------------------------------------------------------------------------

# font-weight keyword → numeric string (render.php enum-guards '400'..'900').
# R-31-1 PERMITTED named-constant exception (CSS-spec fact, no DB table); do NOT
# extend with other hardcoded sets.
_FONT_WEIGHT_KEYWORDS: dict[str, str] = {
    "normal": "400",
    "bold": "700",
}

# Processing ORDER for breakpoint passes — Desktop first so A-collapse (no
# per-device attr) writes to the base attr before the mobile base pass can,
# matching _lift_typography_to_block_attrs (convert.py:1721). This is an ORDERING
# constant (Desktop→Tablet→Mobile precedence), NOT a suffix vocabulary: each entry
# is validated against the DB-owned modifier_suffixes(kind='breakpoint') set at use
# (R-31-1 — the suffix grammar is DB-owned; the bp_decls key IS the device suffix,
# so the former identity _BP_SUFFIX_MAP was redundant and is removed).
_BP_ORDER = ("Desktop", "Tablet", "Mobile")


# ---------------------------------------------------------------------------
# Faithful port of _lift_styling_attrs_by_selector (convert.py:3903)
# with B2 fix: _bp_decls consumed → {attr}{bp_suffix} companion keys emitted.
# ---------------------------------------------------------------------------

def lift_styling_content(node: Tag, slug: str, css_rules: dict) -> dict:
    """Universal DB-driven styling-attr lift for a G3-attrs content block.

    Sibling of ``lift_scalar_content`` — lifts STYLING (typography / colour) attrs
    from named child elements, keyed by each attr's ``derived_selector``. Does NOT
    modify ``lift_scalar_content``.

    Selection rule (no-op floor):

    - capability gate: block MUST have ``'scalar-styling-lift'`` capability
      (block.json ``supports.sgs.scalarStylingLift === true``).
    - attr MUST have role in ``('color', 'typography')`` — all other roles
      (select-from-enum, behaviour, content …) are excluded.
    - attr MUST have a non-empty ``derived_selector``.
    - ``css_property`` for this attr MUST be non-NULL in ``property_suffixes``
      (correctly excludes ``quoteStyle``/``ratingSize`` whose suffixes
      ``Style``/``Size`` have NULL ``css_property``).

    **B2 fix (D247):** the frozen source discards ``_bp_decls`` at line 4025 of
    convert.py, dropping responsive typography/colour to base-only. This port
    consumes ``bp_decls`` and emits ``{attr}{bp_suffix}`` companion keys
    (e.g. ``quoteFontSizeTablet``) keyed off ``modifier_suffixes(kind='breakpoint')``
    + the ``property_suffixes`` DB table — the EXACT pattern
    ``_lift_typography_to_block_attrs`` uses (convert.py:~1718). When the block
    does NOT declare a per-device companion attr (e.g. no ``quoteFontSizeDesktop``),
    the A-collapse rule applies: the Desktop bp value is written to the base attr
    with ``setdefault`` so it is not overwritten by the mobile base pass.

    Double-write tripwire: each key is only written when absent from the
    already-merged attrs dict (atomic wins — see G3 wiring). At this call site,
    ``setdefault`` is used within the per-breakpoint loop to honour the same
    tripwire for the companion attrs.

    Spec refs: FR-31-2 (content-routing), FR-31-5 D1 (faithful transfer),
    R-31-1 (DB-driven, no per-slug branch), R-31-9 (universal G3 path).

    Args:
        node:      The resolved block's root Tag node (draft DOM subtree).
        slug:      The resolved SGS block slug (e.g. ``'sgs/testimonial'``).
        css_rules: The CSS rule-set dict in scope at the G3 call site
                   (passed to ``collect_css_decls_for_element``).

    Returns:
        dict of lifted styling attrs (possibly empty). No garbage keys.
    """
    if not slug.startswith("sgs/"):
        return {}
    # CAPABILITY GATE: hard NO-OP for every block that has NOT declared
    # 'scalar-styling-lift' (block.json supports.sgs.scalarStylingLift).
    # Prevents the role='color'/'typography' trigger from touching every block
    # that happens to declare colour/typography attrs (e.g. sgs/container).
    if "scalar-styling-lift" not in db_lookup.capabilities_for(slug):
        return {}
    catalogue = db_lookup.block_attrs(slug)
    if not catalogue:
        return {}

    # Build a fast suffix → (css_property, kind) reverse map from the DB.
    # css_property_suffixes() returns only rows with non-NULL css_property and
    # resolvable kind — exactly the set we can act on.
    # Key: suffix uppercased (e.g. 'FONTSIZE'); value: (css_property, kind).
    suffix_map: dict[str, tuple[str, str]] = {}
    for css_prop, suffix, kind in db_lookup.css_property_suffixes():
        suffix_map[suffix.upper()] = (css_prop, kind)

    lifted: dict = {}

    for attr_name, info in catalogue.items():
        if not isinstance(info, dict):
            continue
        role = info.get("role")
        if role not in ("color", "typography"):
            continue
        selector = info.get("derived_selector")
        if not selector or not isinstance(selector, str):
            continue
        # (Removed 2026-07-10, Bean-directed) The former blanket skip of
        # ``__hover``/``__active``/``__focus`` derived_selectors was a temporary
        # stopgap that DROPPED state styling instead of routing it. State attrs
        # now lift like any other element: an attr keyed on a state selector
        # (hover / persistent-selected) collects that selector's declarations
        # and lands on its own state attr — the universal §3.B.0 machinery, no
        # special case. (Spec 31 §3.B B2 / §3.B.0 / R-31-9.)

        # Resolve css_property by peeling the longest matching suffix from
        # attr_name (PascalCase tail).  Longest-first avoids 'Colour' being
        # shadowed by the 1-char tail of a longer suffix.
        css_property: str | None = None
        matched_kind: str | None = None
        # Try suffixes longest-first (sort by suffix length descending).
        for suf_upper, (cp, kd) in sorted(
            suffix_map.items(), key=lambda kv: len(kv[0]), reverse=True
        ):
            if attr_name.upper().endswith(suf_upper):
                css_property = cp
                matched_kind = kd
                break

        if css_property is None:
            continue

        # Resolve the element via derived_selector (same multi-selector pattern
        # as _lift_scalar_attrs_by_selector — comma-separated BEM classes,
        # first non-None match wins).
        element = None
        for part in selector.split(","):
            class_name = part.strip().lstrip(".")
            if not class_name:
                continue
            element = node.find(class_=class_name)
            if element is not None and isinstance(element, Tag):
                break
            element = None
        if element is None:
            continue  # absent draft element → emit no key

        # Collect CSS declarations for the matched element.
        # B2 fix: capture bp_decls (the original discards them at line 4025).
        base_decls, bp_decls = collect_css_decls_for_element(element, css_rules)
        raw = base_decls.get(css_property)
        # `background: <colour>` shorthand → background-color. Drafts commonly declare a
        # flat pill/card background with the SHORTHAND (e.g. `.pill{background:var(--cream)}`
        # / `.pill--active{background:rgba(230,138,149,0.1)}`), but the lift resolves the
        # attr to css_property `background-color` — so the shorthand key is missed and the
        # bg attr never emits (proven on the Mama's pack pills, 2026-07-10). Fall back to the
        # `background` shorthand ONLY when it is colour-only (no gradient / image / url —
        # those are NOT a flat colour and belong to the bgImage/gradient path). rgba()/hsla()
        # commas live inside the paren so they are safe; a multi-layer shorthand has `url(`
        # or `gradient`, both excluded here.
        if raw is None and css_property == "background-color":
            _bg_shorthand = base_decls.get("background")
            if _bg_shorthand and "gradient" not in _bg_shorthand and "url(" not in _bg_shorthand:
                raw = _bg_shorthand
        # `border: <width> <style> <colour>` shorthand → border-color. Drafts commonly
        # declare a pill/card border with the shorthand (e.g. `.pill{border:2px solid
        # var(--border)}`); the lift resolves *BorderColour to css_property `border-color`,
        # so the shorthand key is missed and the border-colour never emits. Extract the
        # colour token (var()/hex/rgb/hsl/keyword) from the shorthand — the width + line-
        # style tokens are ignored. Proven on the Mama's resting pill border (2026-07-10).
        if raw is None and css_property == "border-color":
            _border_sh = base_decls.get("border")
            if _border_sh:
                for _tok in _border_sh.split():
                    if _tok.startswith(("var(", "#", "rgb", "hsl")) or _tok in (
                        "transparent", "currentColor", "currentcolor", "inherit",
                    ):
                        raw = _tok
                        break
        if not raw:
            # No base declaration — still check bp_decls for B2 companion-only case.
            # Fall through to breakpoint loop below; skip value-normalise for base.
            base_raw = None
        else:
            base_raw = strip_important(raw).strip() or None

        # Normalise and emit the BASE attr value.
        attr_type = info.get("attr_type", "string")
        if base_raw:
            _emit_value(lifted, attr_name, css_property, attr_type, base_raw, catalogue)

        # B2 FIX — consume bp_decls → emit {attr}{bp_suffix} companions.
        # Mirrors _lift_typography_to_block_attrs (convert.py:1718-1748):
        # process Desktop first so A-collapse writes to base attr before
        # the mobile base pass can overwrite it.
        # DB-owned breakpoint suffix vocabulary (R-31-1) — the bp_decls key IS the
        # device suffix; gate each pass on DB membership rather than a hardcoded set.
        _bp_suffixes = set(db_lookup.modifier_suffixes("breakpoint"))
        for bp_key in _BP_ORDER:
            bp_decl_map = bp_decls.get(bp_key)
            if not bp_decl_map:
                continue
            if bp_key not in _bp_suffixes:
                continue
            bp_suffix = bp_key
            bp_raw_val = bp_decl_map.get(css_property)
            if not bp_raw_val:
                continue
            bp_raw_val = strip_important(bp_raw_val).strip()
            if not bp_raw_val:
                continue

            companion_attr = f"{attr_name}{bp_suffix}"
            if companion_attr in catalogue:
                # Per-device attr exists → emit to companion.
                _emit_value(lifted, companion_attr, css_property, attr_type, bp_raw_val, catalogue)
            else:
                # A-collapse: no per-device attr (e.g. quoteColourDesktop absent).
                # Write to base attr via setdefault so the Desktop-bp value is not
                # overwritten by a later base-decl write (matching convert.py:1744-1748).
                lifted.setdefault(attr_name,
                                  _compute_value(css_property, attr_type, bp_raw_val, attr_name, catalogue))

    return {k: v for k, v in lifted.items() if v is not None}


# ---------------------------------------------------------------------------
# Private value-computation helpers (not in convert.py — extracted to DRY
# the base + per-breakpoint emit paths introduced by the B2 fix).
# ---------------------------------------------------------------------------

def _compute_value(
    css_property: str,
    attr_type: str,
    raw: str,
    attr_name: str,
    catalogue: dict,
) -> object | None:
    """Compute a normalised attr value from a raw CSS string.

    Value normalisation per css_property mirrors the original convert.py:4036-4077:
    - color / background-color → extract_token_or_hex (bare slug or hex)
    - font-weight → normalise keywords: 'bold'→'700', 'normal'→'400'
    - font-size → raw string; if attr_type is 'number', split + return int/float
    - all other typography properties → raw CSS value as string
    """
    if css_property in ("color", "background-color", "border-color"):
        # border-color joins color/background-color here (2026-07-10): previously it fell
        # through to the raw-string return below, so a draft `border-color: var(--border)`
        # stored the DRAFT's own var name verbatim — a dangling reference on the SGS site
        # (the theme has no `--border`), rendering as the fallback default. Routing it
        # through extract_token_or_hex resolves the draft var to its concrete hex (or the
        # theme palette slug when it snaps), so the colour actually paints.
        return extract_token_or_hex(raw)

    if css_property == "font-weight":
        lc = raw.lower()
        if lc in _FONT_WEIGHT_KEYWORDS:
            return _FONT_WEIGHT_KEYWORDS[lc]
        if lc.isdigit():
            return lc
        # Unrecognised keyword — skip (matches convert.py:4053-4058 _trace path)
        return None

    if css_property == "font-size":
        if attr_type == "number":
            num, _unit = split_value_unit(raw)
            if num is None:
                return None
            return int(num) if num == int(num) else num
        return raw  # string-typed font-size: store raw CSS value

    # Remaining typography properties (line-height, letter-spacing,
    # text-align, etc.) — store raw CSS value as string.
    return raw


def _emit_value(
    lifted: dict,
    target_attr: str,
    css_property: str,
    attr_type: str,
    raw: str,
    catalogue: dict,
) -> None:
    """Compute and write a value into ``lifted``.

    For ``font-size`` with ``attr_type == 'number'``, also writes the Unit
    companion attr (e.g. ``quoteFontSizeUnit``) when the block declares it —
    mirroring convert.py:4065-4068.
    """
    value = _compute_value(css_property, attr_type, raw, target_attr, catalogue)
    if value is None:
        return
    lifted[target_attr] = value

    # Unit companion attr (e.g. quoteFontSizeUnit / quoteFontSizeTabletUnit) —
    # mirroring convert.py:4065-4068.
    if css_property == "font-size" and attr_type == "number":
        _, unit = split_value_unit(raw)
        if unit:
            unit_attr = target_attr + "Unit"
            if unit_attr in catalogue:
                lifted[unit_attr] = unit

# ---------------------------------------------------------------------------
# EXECUTION Step 12 (2026-07-04): the module-level `resolve(decl, ctx) -> GAP`
# CSS-dispatch stub that used to live here has been DELETED — it was never
# registered in converter/resolvers/__init__.py's REGISTRY (grepped the whole
# repo for "styling_content.resolve" / "from converter.resolvers.styling_content
# import resolve" / "from converter.resolvers import styling_content" as a
# REGISTRY key — zero hits outside this file, 2026-07-04). It had no caller and
# no dispatch_table.py resolver id pointed at it, so it was dead code, not a
# real seam. `lift_styling_content` above (the CONTENT-side lift, wired through
# services.extraction / walk.py's B1/B2 mechanism, a DIFFERENT dispatch entirely)
# is untouched.
# ---------------------------------------------------------------------------
