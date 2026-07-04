"""css_router.py — Spec 16 §FR6 four-destination CSS router.

Routes every CSS rule from a mockup to exactly one of four destinations:

  D0 — Global / reset rules  → unscoped in variation CSS (top of file)
  D1 — Typed-attr lift       → block attrs with token-snap (per-section JSON sidecar)
  D2 — Wrapper CSS fallback  → scoped to .page-id-N in variation CSS
  D3 — Gap candidates        → write to attribute_gap_candidates DB + D2 fallback

Hard rule (Spec 16 §R5): every CSS rule MUST hit exactly one of D0/D1/D2/D3.
No silent drops. Malformed rules are logged and routed to D2 rather than dropped.

Universal — no Mama-specific or client-specific routing logic.
"""
from __future__ import annotations

import importlib.util
import logging
import re
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path

import tinycss2

HERE = Path(__file__).parent
_SCRIPTS_ROOT = HERE.parent  # .../scripts/

# Lazy-import db_lookup from converter.db.db_lookup (the canonical home since
# EXECUTION Step 9, 2026-07-04; the frozen orchestrator/converter_v2/db_lookup.py
# re-export shim it used to live behind was deleted at EXECUTION Step 16,
# 2026-07-05). We import lazily so this module can be loaded even when the
# package hasn't been added to sys.path yet (test isolation).
_db = None


def _get_db():
    global _db
    if _db is None:
        if str(_SCRIPTS_ROOT) not in sys.path:
            sys.path.insert(0, str(_SCRIPTS_ROOT))
        from converter.db import db_lookup
        _db = db_lookup
    return _db


log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Selector classification helpers
# ---------------------------------------------------------------------------

# Tag selectors that indicate D0 (global/reset) when there is NO class component.
_GLOBAL_BARE_TAGS: frozenset[str] = frozenset({
    "html", "body", ":root", "*",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "p", "a", "ul", "ol", "li", "div", "span",
    "img", "figure", "figcaption", "section", "article", "main",
    "blockquote", "pre", "code", "strong", "em", "b", "i", "s", "u",
    "button", "input", "textarea", "select", "form", "label", "fieldset",
    "table", "thead", "tbody", "tr", "th", "td",
    "::before", "::after", "::placeholder", "::selection", "::marker",
    "*::before", "*::after",
    ":focus", ":focus-visible", ":hover", ":active", ":visited",
    "*, *::before, *::after",
})

# Chrome elements — rules whose selectors target these TOP-LEVEL elements
# get NO D2 emission (they are template parts, not variation CSS).
_CHROME_TOP_ELEMENTS: frozenset[str] = frozenset({"header", "footer", "nav"})

# CSS values that are never tokenisable (pre-snap filter per P1.A nice-to-have #3).
_NON_TOKENISABLE_VALUES: frozenset[str] = frozenset({
    "0", "auto", "none", "inherit", "initial", "unset", "revert",
})

# ---------------------------------------------------------------------------
# F-ii / pseudo-element passthrough helpers (EXECUTION Step 13, 2026-07-04 —
# Spec 31 §3 F-fork + FR-31-5.2.3 + D228 device-tier-vs-visual lock).
# ---------------------------------------------------------------------------

# A PSEUDO-ELEMENT in the selector (::before/::after/... or legacy one-colon
# :before/:after). Pseudo-CLASSES (:hover/:focus) are NOT pseudo-elements and
# keep their existing routing.
_PSEUDO_ELEMENT_RE = re.compile(
    r"(::[a-z-]+|:(?:before|after|first-line|first-letter|placeholder|selection|marker)\b)",
    re.IGNORECASE,
)

# The canonical SGS device-tier thresholds (Spec 31 FR-31-5.2 / ledger
# declare_input._*_CANONICAL — the R-31-1 permitted-constant boundary set).
_DEVICE_TIER_THRESHOLDS: frozenset[float] = frozenset({767.0, 767.98, 768.0, 1023.0, 1024.0})

_MEDIA_PX_RE = re.compile(r"([0-9]+(?:\.[0-9]+)?)\s*px")


def _selector_has_pseudo_element(selector: str) -> bool:
    """True when the selector targets a pseudo-ELEMENT (paint-only surface —
    no block-attr destination exists; the whole rule must D2-passthrough)."""
    return bool(_PSEUDO_ELEMENT_RE.search(selector or ""))


def _is_device_tier_media(media: str) -> bool:
    """True when EVERY px threshold in the @media condition is a canonical SGS
    device-tier boundary. A rule at 600/640/781 etc. is an arbitrary VISUAL
    breakpoint (D228) whose sub-tier band the 3-tier attr model cannot express
    — the caller F-ii-passthroughs it to D2. A media with NO px thresholds
    (print, prefers-reduced-motion) is treated as non-device → D2 (faithful
    preservation)."""
    nums = [float(m) for m in _MEDIA_PX_RE.findall(media or "")]
    if not nums:
        return False
    return all(n in _DEVICE_TIER_THRESHOLDS for n in nums)


# Pseudo-selectors to strip before analysis (don't affect block routing).
_PSEUDO_STRIP_RE = re.compile(
    r"::(before|after|placeholder|selection|marker|first-line|first-letter)"
    # Longer pseudo-classes MUST come before shorter ones (regex alternation is greedy left-to-right).
    # e.g. focus-visible before focus, focus-within before focus — otherwise 'focus' matches early
    # and '-visible' / '-within' is left as a dangling suffix. Captured 2026-05-20.
    r"|:(focus-visible|focus-within|first-of-type|last-of-type|nth-child\([^)]*\)"
    r"|not\([^)]*\)|first-child|last-child|only-child"
    r"|hover|focus|active|visited|checked|disabled|enabled|empty|link|root|target)"
    r"|::?[-a-z]+",
    re.IGNORECASE,
)

# The CSS property → typed-attr suffix table is keyed by normalised CSS property.
# Cache after first load.
_CSS_PROP_SUFFIXES: list[tuple[str, str, str]] | None = None  # [(css_prop, suffix, kind)]


def _css_prop_suffixes() -> list[tuple[str, str, str]]:
    """Return DB-driven list of (css_property, suffix, kind)."""
    global _CSS_PROP_SUFFIXES
    if _CSS_PROP_SUFFIXES is None:
        _CSS_PROP_SUFFIXES = _get_db().css_property_suffixes()
    return _CSS_PROP_SUFFIXES


# ---------------------------------------------------------------------------
# tinycss2 parsing helpers
# ---------------------------------------------------------------------------

def _parse_qualified_rules(css_text: str) -> list[dict]:
    """Parse css_text into a flat list of rule dicts.

    Each dict has:
        selector  : str  — raw selector text (may be comma-grouped)
        props     : dict — {property: value} declarations
        media     : str | None — enclosing @media condition (None for top-level rules)

    @keyframes, @font-face, and other at-rules without qualified rules are skipped.
    Malformed rules are included with props={} so they still route (to D2).
    """
    rules: list[dict] = []

    # Strip comments first.
    css_clean = re.sub(r"/\*.*?\*/", "", css_text, flags=re.DOTALL)

    # We need to handle @media nesting.  tinycss2 tokenises; we do a light
    # brace-scan to split top-level vs @media-nested rules first, then parse
    # each block with tinycss2.

    _extract_rules(css_clean, media=None, out=rules)
    return rules


def _extract_rules(css_text: str, media: str | None, out: list[dict]) -> None:
    """Recursively extract qualified rules, following @media nesting."""
    try:
        parsed = tinycss2.parse_stylesheet(css_text, skip_comments=True, skip_whitespace=True)
    except Exception as exc:  # noqa: BLE001
        log.warning("css_router: tinycss2 parse error (%s) — skipping block", exc)
        return

    for node in parsed:
        if node.type == "qualified-rule":
            selector = tinycss2.serialize(node.prelude).strip()
            props = _parse_declarations(node.content)
            out.append({"selector": selector, "props": props, "media": media})

        elif node.type == "at-rule" and node.lower_at_keyword in ("media", "supports"):
            # Recurse into @media / @supports blocks.
            condition = tinycss2.serialize(node.prelude).strip()
            media_label = f"@{node.at_keyword} {condition}"
            if node.content:
                inner_css = tinycss2.serialize(node.content)
                _extract_rules(inner_css, media=media_label, out=out)

        # @keyframes, @font-face, @import etc. are skipped — not relevant for routing.


def _parse_declarations(content: list) -> dict[str, str]:
    """Parse a tinycss2 content list (rule body) into {prop: value}."""
    props: dict[str, str] = {}
    decl_text = tinycss2.serialize(content)
    for token in tinycss2.parse_declaration_list(decl_text, skip_comments=True, skip_whitespace=True):
        if token.type == "declaration":
            name = token.name.lower().strip()
            value = tinycss2.serialize(token.value).strip()
            # Strip !important suffix.
            value = re.sub(r"\s*!important\s*$", "", value).strip()
            if name and value:
                props[name] = value
    return props


# ---------------------------------------------------------------------------
# Selector analysis
# ---------------------------------------------------------------------------

def _selector_classes(selector: str) -> list[str]:
    """Extract all class names from a selector string."""
    # Handle comma-grouped selectors — collect from all parts.
    classes: list[str] = []
    for part in selector.split(","):
        part = part.strip()
        # Strip pseudo-selectors so e.g. `.sgs-hero:hover` → `.sgs-hero`.
        part = _PSEUDO_STRIP_RE.sub("", part).strip()
        for tok in re.findall(r"\.([a-zA-Z_-][a-zA-Z0-9_-]*)", part):
            classes.append(tok)
    return classes


def _is_d0_global(selector: str) -> bool:
    """Return True if the selector has NO class component and targets a global element.

    Per Spec 16 §FR6 D0: element selectors with no class anchor are global/reset.
    Includes `:root`, `*`, `::before`, pseudo-selectors without a class anchor.
    """
    # Normalise: strip @media wrapper that may have leaked through.
    sel = selector.strip()
    # Comma-grouped: ALL parts must be global for D0 (if any part has a class, not D0).
    for part in sel.split(","):
        part = _PSEUDO_STRIP_RE.sub("", part.strip()).strip()
        if not part:
            continue
        # Has a class component → not D0.
        if "." in part:
            return False
        # Has an ID component → not D0 (ID-targeted rules are D2).
        if "#" in part:
            return False
        # Strip pseudo-class/pseudo-element residue.
        base = re.sub(r":+\S+", "", part).strip()
        if not base:
            base = part  # e.g. ":root" after strip is empty → keep original
        # Normalise compound tag selectors like "*, *::before, *::after".
        bases = {b.strip().lower() for b in base.split() if b.strip()}
        for b in bases:
            # Acceptable global bases: tags, *, :root, bare pseudo-roots.
            clean_b = re.sub(r"::?[a-z-]+", "", b).strip()
            if clean_b and clean_b not in _GLOBAL_BARE_TAGS:
                # Check if it looks like a bare tag or * or :root
                if not re.match(r"^[a-z][a-z0-9]*$", clean_b) and clean_b not in ("*", ":root"):
                    return False
    return True


def _selector_targets_chrome(selector: str) -> bool:
    """Return True if the selector directly targets header/footer/nav as the
    FIRST (outermost) element in ANY of the comma-parts.

    e.g. 'header .sgs-nav__link' → True (outermost is <header>)
         '.sgs-hero' → False
         'nav ul' → True
         '.sgs-header' → False (class-based, not a bare tag)
    """
    for part in selector.split(","):
        part = part.strip()
        if not part:
            continue
        first_token = part.split()[0].lower() if part.split() else ""
        # Strip pseudo-class from first token.
        first_token = re.sub(r"::?[a-z-]+", "", first_token).strip()
        # Only bare tag names (no . or #) that are in the chrome set.
        if (
            first_token in _CHROME_TOP_ELEMENTS
            and not first_token.startswith(".")
            and not first_token.startswith("#")
        ):
            return True
    return False


def _resolve_block_for_class(class_name: str) -> str | None:
    """Given a CSS class name, return the SGS block slug if the class is an
    SGS-BEM block-root or block element belonging to a registered block.

    Returns e.g. 'sgs/hero' for 'sgs-hero' or 'sgs-hero__sub'.
    Returns None when the class doesn't map to a registered block.
    """
    db = _get_db()
    parsed = db.parse_sgs_bem(class_name)
    if parsed is None or parsed.block is None:
        return None
    slug = f"sgs/{parsed.block}"
    if db.block_exists(slug):
        return slug
    return None


def _find_block_root_in_classes(classes: list[str]) -> str | None:
    """Return the first block slug found among the class list, or None."""
    for cls in classes:
        slug = _resolve_block_for_class(cls)
        if slug:
            return slug
    return None


def _css_prop_maps_to_typed_attr(block_slug: str, css_prop: str) -> bool:
    """Return True if `css_prop` maps to a typed attribute on `block_slug`
    via the property_suffixes table.

    Uses db.block_attrs to confirm the block actually declares an attribute
    matching the suffix (avoids false positives from the suffix table alone).

    F4 fix (2026-05-20): replaced 3-candidate heuristic with a full suffix-scan
    across ALL block attrs.  The old heuristic missed slot-prefixed names like
    labelColour, ctaPrimaryColour, contentPaddingTop, subHeadlineFontSize, etc.
    The scan checks attr_name.endswith(suffix) for every (suffix, attr) pair,
    which correctly handles any prefix convention including bare, block-name,
    slot-name, and background.
    """
    db = _get_db()
    attrs = db.block_attrs(block_slug)

    for prop, suffix, _kind in _css_prop_suffixes():
        if prop.lower() != css_prop.lower():
            continue
        # Scan ALL attrs for any name that ends with the suffix (case-insensitive).
        # This matches: labelColour, ctaPrimaryColour, backgroundColour, overlayColour,
        # contentPaddingTop, subHeadlineFontSize, imageWidth, etc.
        suffix_lower = suffix.lower()
        for attr_name in attrs:
            if attr_name.lower().endswith(suffix_lower):
                return True
    return False


# ---------------------------------------------------------------------------
# Value pre-snap filter
# ---------------------------------------------------------------------------

def _is_non_tokenisable(value: str) -> bool:
    """Return True if the value should skip the token resolver (P1.A #3).

    Values like '0', 'auto', 'none', 'inherit' are structural keywords — the
    resolver has nothing to snap them to.
    """
    v = value.strip().lower().rstrip(";")
    return v in _NON_TOKENISABLE_VALUES


# ---------------------------------------------------------------------------
# Main router
# ---------------------------------------------------------------------------

def route_css(
    css_text: str,
    boundaries_meta: dict,   # from voter.json / boundary list — {section_id: {...}}
    theme_json: dict,
    run_id: str,
) -> dict:
    """Route every CSS rule in css_text to exactly one of D0/D1/D2/D3.

    Returns:
        {
          'd0': [str],         # unscoped global rules (CSS text lines)
          'd1': {              # per-section typed-attr assignments
              '<section_id>': {
                  '<attr_path>': {
                      'value': str,
                      'role': str,
                      'source_class': str,
                      'snap_skipped': bool,   # True when value is non-tokenisable
                  }
              }
          },
          'd2': [str],         # scoped wrapper CSS rules (CSS text lines)
          'd3': [dict],        # gap candidates {block_slug, css_property, raw_value, source_class, run_id}
          'stats': {
              'd0_count': int,
              'd1_count': int,
              'd2_count': int,
              'd3_count': int,
              'total_rules': int,
              'chrome_skipped': int,
              'malformed': int,
          }
        }

    Hard rule: every CSS rule in css_text lands in exactly one bucket.
    If a rule cannot be classified, it is logged at ERROR level and routed to D2
    rather than silently dropped. No CSS rule is ever lost.

    Universal — no client-specific routing logic.
    """
    result: dict = {
        "d0": [],
        "d1": {},
        "d2": [],
        "d3": [],
        "stats": {
            "d0_count": 0,
            "d1_count": 0,
            "d2_count": 0,
            "d3_count": 0,
            "total_rules": 0,
            "chrome_skipped": 0,
            "malformed": 0,
        },
    }

    if not css_text or not css_text.strip():
        return result

    rules = _parse_qualified_rules(css_text)
    result["stats"]["total_rules"] = len(rules)

    for rule in rules:
        selector = rule.get("selector", "")
        props = rule.get("props", {})
        media = rule.get("media")

        if not selector:
            result["stats"]["malformed"] += 1
            result["stats"]["d2_count"] += 1
            continue

        # Reconstruct the CSS rule text for D0/D2 output.
        def _rule_text() -> str:
            decls = "; ".join(f"{p}: {v}" for p, v in props.items())
            bare_rule = f"{selector} {{ {decls} }}"
            if media:
                return f"{media} {{ {bare_rule} }}"
            return bare_rule

        # ----------------------------------------------------------------
        # Chrome-skip check: header/footer/nav top-level → route to D0.
        # Chrome element rules (template-part CSS) are emitted globally but
        # not page-id-scoped — they will be overridden by the actual template
        # part CSS. This satisfies §FR6 hard rule: every CSS rule hits at
        # least one of D0/D1/D2/D3. The chrome_skipped stat still fires for
        # reporting. No silent drops.
        # F6 fix (2026-05-20): changed from silent continue to D0 emission.
        # ----------------------------------------------------------------
        if _selector_targets_chrome(selector):
            result["stats"]["chrome_skipped"] += 1
            # Route to D0 (unscoped global) — spec-compliant, not a page-id
            # scoped rule, and harmless because template parts override it.
            result["d0"].append(_rule_text())
            result["stats"]["d0_count"] += 1
            continue

        # ----------------------------------------------------------------
        # D0 — global/reset rules
        # Only classify as D0 when at the top level (media is None).
        # Rules like @media (min-width:768px) { h1, h2, h3 { ... } } must NOT
        # go D0-unscoped — they would lose their media-query wrapper entirely.
        # Such rules fall through to D2 below, preserving the @media context.
        # F7 fix (2026-05-20): added `and media is None` guard.
        # ----------------------------------------------------------------
        if _is_d0_global(selector) and media is None:
            result["d0"].append(_rule_text())
            result["stats"]["d0_count"] += 1
            continue

        # ----------------------------------------------------------------
        # F-ii / pseudo-element PASSTHROUGH -> D2 (EXECUTION Step 13, Spec 31
        # §3 F-fork + FR-31-5.2.3, 2026-07-04). Two rule classes the typed-attr
        # model structurally CANNOT represent route to the scoped D2 channel
        # BEFORE class-based D1 routing:
        # (a) a PSEUDO-ELEMENT selector — previously _selector_classes stripped
        #     the pseudo residue, so the props D1-lifted onto the block ROOT (a
        #     mis-lift) AND the F2 exclusion kept the rule OUT of D2 — silently
        #     unpainted. A pseudo element has no attr destination; the whole
        #     rule paints via D2.
        # (b) a NON-DEVICE @media rule (thresholds outside the canonical
        #     device set — D228 arbitrary VISUAL breakpoint, e.g. min-width:600).
        #     The D259 cascade already captures its tier-aligned effects in the
        #     tier attrs; the SUB-TIER residual band (600-767) has NO 3-tier
        #     representation, so the raw rule paints via D2. Inside a device
        #     tier both sources carry the SAME faithful draft value — no
        #     specificity fight. This is the spec's F-ii lock ("preserve, never
        #     snap, never drop"), NOT an R-31-15c breach: no D1 destination
        #     exists for the residual band.
        # ----------------------------------------------------------------
        if _selector_has_pseudo_element(selector):
            result["d2"].append(_rule_text())
            result["stats"]["d2_count"] += 1
            log.info("css-router: pseudo-element passthrough -> D2: %s", selector)
            continue
        if media is not None and not _is_device_tier_media(media):
            result["d2"].append(_rule_text())
            result["stats"]["d2_count"] += 1
            log.info("css-router: F-ii non-device-media passthrough -> D2: %s | %s",
                        media, selector)
            continue

        # ----------------------------------------------------------------
        # Class-based routing (D1 / D2 / D3)
        # ----------------------------------------------------------------
        classes = _selector_classes(selector)

        if not classes:
            # No class component and not D0 (e.g. an ID selector or attribute
            # selector) → D2 fallback.
            result["d2"].append(_rule_text())
            result["stats"]["d2_count"] += 1
            continue

        block_slug = _find_block_root_in_classes(classes)

        if block_slug is None:
            # Selector has class components but none resolve to a known SGS block.
            # D2 fallback.
            result["d2"].append(_rule_text())
            result["stats"]["d2_count"] += 1
            continue

        # We have a block slug.  Determine if each property in the rule can
        # lift to a typed attribute (D1) or needs D3/D2.
        #
        # Strategy: for this rule, we route PER-PROPERTY.
        # A rule with some D1-able props and some D3 props → splits:
        #   D1-able props → D1 entry
        #   D3 props (block-root CSS prop with no matching typed attr) → D3 + D2
        #   Other props (no suffix mapping at all) → D2

        # Identify the section_id this block belongs to.
        # F3 fix (2026-05-20): key by "<block_slug>:<selector>" so that multiple
        # instances of the same block class on the same page (different selectors,
        # different padding/colour rules) maintain distinct D1 entries rather than
        # collapsing to the last-written value.
        # The bare block_slug key is also kept for backward-compat with callers
        # that don't pass a selector (accumulates all assignments as a merged view).
        section_key = f"{block_slug}:{selector}"  # e.g. 'sgs/hero:.sgs-hero'

        # MF-2 DECISION (EXECUTION Step 14, RECORDED 2026-07-04): the d1 payload
        # is KEPT. The D274 "dead output" trace was ENGINE-scoped and wrong at
        # pipeline scope — ledger/coverage_check.py:199 consumes result["d1"]
        # for F5 conservation accounting (a retirement attempt was BLOCKED by
        # that very gate at commit time — the structural gate working as
        # designed). Consumer: the F5 ledger; the engine still re-derives its
        # own lifts from raw css_rules.
        d1_for_section = result["d1"].setdefault(section_key, {})

        rule_routed = False  # Did at least one prop from this rule go D1/D3?
        # F2 fix (2026-05-20): track which props were D1-lifted so D2 emission
        # EXCLUDES them.  Without this, a rule with mixed D1/D2 props emits the
        # full rule to D2 (including the D1 properties), creating a specificity
        # fight where the D2 scoped rule overrides the typed-attr value.
        d1_lifted_props: set[str] = set()

        source_cls = next(
            (c for c in classes if _resolve_block_for_class(c) == block_slug),
            classes[0] if classes else "",
        )

        for css_prop, raw_value in props.items():
            if not raw_value:
                continue

            # Check whether this prop maps to a typed attribute on the block.
            has_typed_attr = _css_prop_maps_to_typed_attr(block_slug, css_prop)

            if has_typed_attr:
                # D1 — typed attribute lift.
                skip_snap = _is_non_tokenisable(raw_value)
                attr_path = f"{block_slug}.{css_prop}"
                d1_for_section[attr_path] = {
                    "value": raw_value,
                    "role": _infer_role(css_prop),
                    "source_class": source_cls,
                    "snap_skipped": skip_snap,
                    "block_slug": block_slug,
                    "css_prop": css_prop,
                    "media": media,
                }
                result["stats"]["d1_count"] += 1
                rule_routed = True
                d1_lifted_props.add(css_prop)  # exclude from D2 (F2)

            else:
                # Check if this prop LOGICALLY belongs as a typed attr on the
                # block (it IS inside a block-root) but the block doesn't
                # currently declare it → D3 + D2 fallback.
                prop_in_suffix_table = any(
                    p.lower() == css_prop.lower() for p, _s, _k in _css_prop_suffixes()
                )
                if prop_in_suffix_table:
                    # D3 — gap candidate (CSS prop is in the suffix table but
                    # this block doesn't have the matching attribute yet).
                    result["d3"].append({
                        "block_slug": block_slug,
                        "css_property": css_prop,
                        "raw_value": raw_value,
                        "source_class": source_cls,
                        "run_id": run_id,
                        "media": media,
                    })
                    result["stats"]["d3_count"] += 1
                    rule_routed = True
                    # D3 ALSO ships to D2 as a temporary fallback (filtered by F2).
                    # D2 emission happens after the loop below.

                else:
                    # No suffix mapping at all — D2 straight (wrapper CSS).
                    # Actual D2 emission happens after the loop below.
                    rule_routed = True

        # ---- D2 emission for this rule (F2: exclude D1-lifted props) --------
        # Build a filtered props dict omitting anything that went D1.
        # If all props were D1-lifted, no D2 entry is emitted for this rule.
        remaining_props = {p: v for p, v in props.items() if p not in d1_lifted_props and v}
        if remaining_props:
            def _rule_text_filtered() -> str:
                decls = "; ".join(f"{p}: {v}" for p, v in remaining_props.items())
                bare_rule = f"{selector} {{ {decls} }}"
                if media:
                    return f"{media} {{ {bare_rule} }}"
                return bare_rule
            result["d2"].append(_rule_text_filtered())
            result["stats"]["d2_count"] += 1

        if not rule_routed:
            # Safety net: rule had props but none routed above (empty props dict
            # scenario or all values were empty).  Route the bare rule to D2 so
            # it isn't silently dropped.
            result["d2"].append(_rule_text())
            result["stats"]["d2_count"] += 1

    return result


# ---------------------------------------------------------------------------
# Role inference
# ---------------------------------------------------------------------------

def _infer_role(css_prop: str) -> str:
    """Return the role string for a CSS property using property_suffixes DB."""
    for prop, _suffix, _kind in _css_prop_suffixes():
        if prop.lower() == css_prop.lower():
            # role comes from the suffix entry in db_lookup._kind_for
            # We infer from the _kind_for heuristic.
            if any(t in css_prop for t in ("color", "colour", "background")):
                return "color"
            if any(t in css_prop for t in ("font-size", "font-family", "font-weight",
                                            "line-height", "letter-spacing")):
                return "typography"
            if any(t in css_prop for t in ("padding", "margin", "gap")):
                return "spacing"
            return "visual"
    # Fallback role inference from CSS property name alone.
    if any(t in css_prop for t in ("color", "colour", "background")):
        return "color"
    if "font" in css_prop or "line-height" in css_prop:
        return "typography"
    if css_prop in ("padding", "margin", "gap", "top", "right", "bottom", "left"):
        return "spacing"
    return "visual"


# ---------------------------------------------------------------------------
# D3 DB write helper
# ---------------------------------------------------------------------------

def write_d3_to_db(d3_entries: list[dict], sgs_db_path: Path) -> int:
    """Write D3 gap candidates to sgs-framework.db.attribute_gap_candidates.

    Uses INSERT OR IGNORE on (block_slug, attr_name) unique constraint so
    running the router multiple times is idempotent.

    Returns the number of rows actually inserted (0 for duplicates).
    """
    if not d3_entries:
        return 0

    db = _get_db()
    inserted = 0
    for entry in d3_entries:
        try:
            proposed_attr = db.propose_attr_name(
                entry["block_slug"],
                entry["css_property"],
                entry.get("source_class", ""),
            )
            db.write_attribute_gap_candidate(
                block_slug=entry["block_slug"],
                css_property=entry["css_property"],
                raw_value=entry.get("raw_value", ""),
                source_class=entry.get("source_class", ""),
                source_run_id=entry.get("run_id", ""),
                proposed_attr=proposed_attr,
            )
            inserted += 1
        except Exception as exc:  # noqa: BLE001
            log.warning("css_router: D3 DB write failed for %s.%s: %s",
                        entry.get("block_slug"), entry.get("css_property"), exc)
    return inserted


# ---------------------------------------------------------------------------
# Variation CSS file writer helpers
# ---------------------------------------------------------------------------

def _scope_media_rule(rule: str, scope_prefix: str) -> str:
    """Inject scope_prefix before each inner selector inside a @media block.

    F1 fix (2026-05-20): without this, @media rules have specificity (0,1,0)
    while base D2 rules scoped to .page-id-N have (0,2,0).  The scoped base
    rule wins at every breakpoint, silencing every responsive layout override.

    Strategy:
      1. Find the opening `{` of the @media condition (outer brace).
      2. Extract the inner CSS text.
      3. For each inner qualified rule, prepend scope_prefix to its selector.
      4. Re-wrap in the @media condition.

    Uses a simple brace-depth scan rather than full CSS parsing to avoid adding
    a tinycss2 dependency at write-time and to keep this function standalone.

    Example:
      Input:  @media (min-width: 768px) { .sgs-hero { grid-template-columns: 1fr 1fr } }
      Output: @media (min-width: 768px) { .page-id-144 .sgs-hero { grid-template-columns: 1fr 1fr } }
    """
    # Locate the outer @media condition (everything before the first top-level `{`).
    # Walk by character to handle nested `{` correctly.
    depth = 0
    outer_open = -1
    for i, ch in enumerate(rule):
        if ch == "{":
            if depth == 0:
                outer_open = i
            depth += 1
        elif ch == "}":
            depth -= 1

    if outer_open == -1:
        # Malformed — no opening brace found; return unchanged.
        return rule

    media_prefix = rule[:outer_open].rstrip()  # e.g. "@media (min-width: 768px)"
    inner = rule[outer_open + 1:].rstrip()
    # Strip the final closing `}` of the @media block.
    if inner.endswith("}"):
        inner = inner[:-1].strip()

    # Now scope each inner rule.  Inner text looks like:
    #   ".sgs-hero { grid-template-columns: 1fr 1fr } .sgs-hero__content { padding: 28px }"
    # We walk by brace depth to split into individual inner rules.
    scoped_inner_parts: list[str] = []
    inner_depth = 0
    buf_start = 0
    for i, ch in enumerate(inner):
        if ch == "{":
            if inner_depth == 0:
                # Everything from buf_start to i is the selector.
                inner_selector = inner[buf_start:i].strip()
                buf_start = i  # include `{` in the body slice
            inner_depth += 1
        elif ch == "}":
            inner_depth -= 1
            if inner_depth == 0:
                # Full inner rule: selector + { body }
                body = inner[buf_start:i + 1]  # includes `{` and `}`
                scoped_sel = f"{scope_prefix}{inner_selector}"
                # body starts with `{`, so: "<scoped-sel> <body>"
                scoped_inner_parts.append(f"{scoped_sel} {body.strip()}")
                buf_start = i + 1

    if not scoped_inner_parts:
        # Could not parse inner rules — return original rule unchanged to avoid data loss.
        return rule

    inner_joined = " ".join(scoped_inner_parts)
    return f"{media_prefix} {{ {inner_joined} }}"


# ---------------------------------------------------------------------------
# Variation CSS file writer
# ---------------------------------------------------------------------------

def write_variation_css(
    client: str,
    d0_rules: list[str],
    d2_rules: list[str],
    mockup_path: Path,
    page_id: int | None,
    repo_root: Path,
    run_dir: Path | None = None,
) -> tuple[Path, int]:
    """Write D0 + D2 rules to the pipeline-state run directory.

    Output path: <run_dir>/variation-d0-d2.css (pipeline intermediate only).
    Falls back to <repo_root>/pipeline-state/<client>-fallback/variation-d0-d2.css
    when run_dir is not supplied.

    D0 rules are written first, unscoped (they're global/reset).
    D2 rules are scoped with `.page-id-N` when page_id is supplied.

    Returns (output_path, char_count).
    """
    if run_dir is not None:
        out_path = run_dir / "variation-d0-d2.css"
    else:
        # Fallback: run_dir unavailable — write to a predictable pipeline-state
        # location so theme/sgs-theme/styles/ is never written.
        out_path = repo_root / "pipeline-state" / f"{client}-fallback" / "variation-d0-d2.css"
    out_path.parent.mkdir(parents=True, exist_ok=True)

    ts = datetime.now(timezone.utc).isoformat()
    header = (
        "/*!\n"
        f" * SGS clone-pipeline CSS-lift output for client: {client}\n"
        f" * Source mockup: {mockup_path.relative_to(repo_root) if mockup_path.is_absolute() else mockup_path}\n"
        f" * Lifted: {ts}\n"
        " *\n"
        " * Generated by css_router.py (Spec 16 §FR6 four-destination router).\n"
        " * D0 rules: global/reset, unscoped.\n"
        " * D2 rules: wrapper CSS, scoped to .page-id-N.\n"
        " * D1 rules: classified by css_router; consumed inline by cv2 via _collect_css_decls_for_element.\n"
        " *\n"
        " * PIPELINE INTERMEDIATE ONLY — not a deploy artefact.\n"
        " * Written to pipeline-state/<run>/variation-d0-d2.css.\n"
        " * theme/sgs-theme/styles/ is intentionally empty (Phase 5a).\n"
        " */\n\n"
    )

    parts: list[str] = [header]

    # Deduplicate rules before writing. The verbatim Stage 0.7 dump relied on
    # browser parser idempotency; the router emits per-property routes so a
    # mockup rule repeated across @media blocks or duplicated source <style>
    # tags would write multiple times if we didn't dedup here. Preserves first-
    # occurrence order so cascade ordering matches the source CSS. Captured
    # 2026-05-20 in P1.B QC panel (Sonnet rater).
    d0_rules = list(dict.fromkeys(d0_rules))
    d2_rules = list(dict.fromkeys(d2_rules))

    if d0_rules:
        parts.append("/* ── D0 — global/reset rules ──────────────────────────── */\n")
        parts.extend(f"{r}\n" for r in d0_rules)
        parts.append("\n")

    if d2_rules:
        scope_prefix = f".page-id-{page_id} " if page_id else ""
        parts.append(f"/* ── D2 — wrapper CSS (scoped: {scope_prefix or 'all-pages'}) ─── */\n")
        for rule in d2_rules:
            if scope_prefix and not rule.startswith("@"):
                # Prepend the page scope to the selector in each rule.
                # Simple heuristic: everything before the first `{` is the selector.
                brace_idx = rule.index("{")
                sel = rule[:brace_idx].strip()
                body = rule[brace_idx:]
                parts.append(f"{scope_prefix}{sel}{body}\n")
            elif scope_prefix and rule.startswith("@"):
                # F1 fix (2026-05-20): scope @media rules by injecting .page-id-N
                # INSIDE the @media block, onto each inner selector.  Without this,
                # @media rules have specificity (0,1,0) while base D2 rules have
                # (0,2,0) — the base rules always win, breaking every responsive layout.
                #
                # Before: @media (min-width:768px) { .sgs-hero { grid-template-columns: 1fr 1fr } }
                # After:  @media (min-width:768px) { .page-id-144 .sgs-hero { grid-template-columns: 1fr 1fr } }
                parts.append(_scope_media_rule(rule, scope_prefix) + "\n")
            else:
                parts.append(f"{rule}\n")
        parts.append("\n")

    payload = "".join(parts)
    out_path.write_text(payload, encoding="utf-8")
    return out_path, len(payload)
