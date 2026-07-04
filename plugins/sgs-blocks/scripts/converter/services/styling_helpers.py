"""styling_helpers.py — ported helper functions for the styling-attr lift.

Faithful port of the following from orchestrator/converter_v2/convert.py,
behaviour-IDENTICAL (Spec 31 §1/§3.B1, D246):

  - ``_VAR_TOKEN_RE``               (convert.py:56)   → ``_VAR_TOKEN_RE``
  - ``_IMPORTANT_RE``               (convert.py:55)   → ``_IMPORTANT_RE``
  - ``_DECL_RE``                    (convert.py:54)   → ``_DECL_RE``
  - ``_strip_important``            (convert.py:377)  → ``strip_important``
  - ``_extract_token_or_hex``       (convert.py:443)  → ``extract_token_or_hex``
  - ``_split_value_unit``           (convert.py:568)  → ``split_value_unit``
  - ``_collect_css_decls_for_element`` (convert.py:585) → ``collect_css_decls_for_element``
  - ``_css_value_to_attr``          (convert.py:1359) → ``css_value_to_attr``
  - ``_css_selector_has_class``     (convert.py:5243) → ``css_selector_has_class``

Internal helper re-ported here (not exposed publicly):
  - ``_parse_decls``                (convert.py:367)  → ``_parse_decls``
  - ``_colour_value_to_style``      (convert.py:460)  → ``_colour_value_to_style``
  - ``_CSS_NAMED_COLOURS``          (convert.py:454)  → ``_CSS_NAMED_COLOURS``

No block-slug literals. No import from convert.py.
Only ``from converter.db import db_lookup`` is used (moved off the frozen
tree in EXECUTION Step 9, Phase 3, 2026-07-04).
"""
from __future__ import annotations

import logging
import re
from typing import Any

from bs4 import Tag

from converter.db import db_lookup

_LOG = logging.getLogger("sgs.converter.styling")


# ---------------------------------------------------------------------------
# Media-query cascade helper (Spec 31 §3 F-fork / FR-31-5.2)
# ---------------------------------------------------------------------------

_MEDIA_MIN_RE = re.compile(r"min-width\s*:\s*(\d+)")
_MEDIA_MAX_RE = re.compile(r"max-width\s*:\s*(\d+)")


def _media_condition_applies_at(media_cond: str, width: int) -> bool:
    """True if a ``width``px viewport satisfies the @media condition.

    Handles the common single-constraint and ``... and ...`` cases (ALL min/max
    constraints in a part must hold) plus a comma OR-list (any part applies).
    A part with no width constraint (e.g. a bare ``@media screen``) is treated as
    always-applies so its declarations are not spuriously dropped.

    Spec 31 §3 F-fork / FR-31-5.2 — the cascade evaluates each device-tier sample
    width against every matched @media rule to derive the effective per-tier value.
    """
    for part in media_cond.split(","):
        if all(width >= int(m.group(1)) for m in _MEDIA_MIN_RE.finditer(part)) and all(
            width <= int(m.group(1)) for m in _MEDIA_MAX_RE.finditer(part)
        ):
            return True
    return False


# ---------------------------------------------------------------------------
# Regex constants (convert.py:54-56 — verbatim copies)
# ---------------------------------------------------------------------------

_DECL_RE = re.compile(r"\s*([\w-]+)\s*:\s*([^;]+);?\s*", re.DOTALL)
_IMPORTANT_RE = re.compile(r"\s*!important\s*$", re.IGNORECASE)
_VAR_TOKEN_RE = re.compile(r"var\(--(?:wp--preset--color--)?([a-z0-9-]+)\)")


# ---------------------------------------------------------------------------
# _parse_decls (convert.py:367 — ported verbatim, private)
# ---------------------------------------------------------------------------

def _parse_decls(decl_text: str) -> dict[str, str]:
    """Parse a CSS declaration block text into a {property: value} dict."""
    out: dict[str, str] = {}
    for m in _DECL_RE.finditer(decl_text):
        prop = m.group(1).strip()
        val = m.group(2).strip()
        if prop and val:
            out[prop] = val
    return out


# ---------------------------------------------------------------------------
# strip_important (convert.py:377 — ported verbatim, renamed)
# ---------------------------------------------------------------------------

def strip_important(value: str) -> str:
    """Strip ``!important`` from a CSS value string."""
    return _IMPORTANT_RE.sub("", value).strip()


# ---------------------------------------------------------------------------
# extract_token_or_hex (convert.py:443 — ported verbatim, renamed)
# ---------------------------------------------------------------------------

def extract_token_or_hex(value: str) -> str | None:
    """Extract a colour token slug or hex from a CSS value string.

    Returns the token slug (e.g. ``'primary'`` from ``var(--wp--preset--color--primary)``),
    the raw hex (e.g. ``'#ff0000'``), or ``None`` when neither pattern matches.
    """
    v = value.strip()
    m = _VAR_TOKEN_RE.search(v)
    if m:
        return m.group(1)
    if v.startswith("#"):
        return v.split()[0]
    return None


# ---------------------------------------------------------------------------
# _CSS_NAMED_COLOURS + _colour_value_to_style (convert.py:454/460 — private)
# ---------------------------------------------------------------------------

_CSS_NAMED_COLOURS: dict[str, str] = {
    "white": "#ffffff",
    "black": "#000000",
}


def _colour_value_to_style(raw: str) -> str | None:
    """Convert a CSS colour expression to WP style.* colour form (private helper)."""
    if not raw:
        return None
    v = raw.strip()
    if v in _CSS_NAMED_COLOURS:
        return _CSS_NAMED_COLOURS[v]
    token_or_hex = extract_token_or_hex(raw)
    if token_or_hex is None:
        return None
    if token_or_hex.startswith("#"):
        return token_or_hex
    return f"var:preset|color|{token_or_hex}"


# ---------------------------------------------------------------------------
# split_value_unit (convert.py:568 — ported verbatim, renamed)
# ---------------------------------------------------------------------------

def split_value_unit(raw: Any, default_unit: str = "px") -> tuple:
    """Split ``'22px'`` → ``(22.0, 'px')``. Returns ``(None, None)`` on parse failure."""
    if not raw:
        return None, None
    s = str(raw).strip().rstrip(";")
    m = re.match(r"^([+-]?[\d.]+)\s*([a-zA-Z%]*)$", s)
    if not m:
        return None, None
    try:
        num = float(m.group(1))
        unit = m.group(2) or default_unit
        return num, unit
    except ValueError:
        return None, None


# ---------------------------------------------------------------------------
# collect_css_decls_for_element (convert.py:585 — ported verbatim, renamed)
# ---------------------------------------------------------------------------

def collect_css_decls_for_element(
    node: Tag,
    css_rules: dict,
) -> tuple[dict[str, str], dict[str, dict[str, str]]]:
    """Collect CSS declarations targeting this element, resolved to device tiers.

    Returns ``(base_decls, bp_decls)`` where:

    - ``base_decls`` — the EFFECTIVE ``{prop: val}`` at DESKTOP (the SGS base /
      unsuffixed tier). This is the value after cascading the element's non-media
      rules + every @media rule that applies at the desktop sample width — NOT the
      raw non-media rules (a mobile-first draft's base CSS is the mobile value, so
      returning it raw would land the mobile layout on the desktop base attr).
    - ``bp_decls``   — ``{tier: {prop: val}}`` for the ``Tablet`` / ``Mobile`` tiers,
      containing ONLY the properties whose effective value at that tier DIFFERS from
      ``base_decls`` (a tier that matches base inherits it — no redundant attr).

    Sources for the non-media cascade (in priority order):

    1. Inline style attribute on the element (highest specificity)
    2. Direct class selectors (``.sgs-hero__sub``)
    3. Parent-qualified selectors (``.sgs-hero__copy h1``)
    4. Grouped selectors (``h1, h2, h3``)

    Responsive resolution (Spec 31 §3 F-fork / FR-31-5.2): the CSS cascade is
    sampled at one representative interior width per device tier
    (``db_lookup.device_tier_samples`` — Desktop 1440 / Tablet 800 / Mobile 375).
    ``min-width:X`` = "X and up" therefore naturally populates every tier whose
    sample ≥ X; ``max-width:X`` = "X and down" every tier whose sample ≤ X — one
    symmetric calculation, both directions. A non-device threshold (∉ 767/768/
    1023/1024) that falls inside a tier's range is preserved as an F-ii residual
    (logged, never snapped, never silently dropped — D228).

    Ported from convert.py:585 (selector-matching behaviour-identical); the
    breakpoint routing is REPLACED by the FR-31-5.2 device-tier cascade.
    """
    desc_classes: list[str] = node.get("class", []) or []
    desc_tag: str = node.name or ""

    base_decls: dict[str, str] = {}
    bp_decls: dict[str, dict[str, str]] = {}

    # CSS specificity (ids, classes/attrs/pseudo-class, tags/pseudo-element) of one
    # comma-split selector — used to apply the cascade CORRECTLY so a more specific
    # rule (.sgs-testimonial__text) beats a generic one (blockquote p) regardless of
    # source order. The old first-wins merge ignored specificity AND source order,
    # silently letting an earlier generic rule corrupt an element's real values.
    def _sel_specificity(sel: str) -> tuple[int, int, int]:
        ids = len(re.findall(r"#[\w-]+", sel))
        cls = len(re.findall(r"\.[\w-]+|\[[^\]]+\]|:[\w-]+", sel))
        tags = len(re.findall(r"(?:^|[\s>+~])([a-zA-Z][\w-]*)", sel))
        return (ids, cls, tags)

    matched_base: list[tuple[tuple[int, int, int], int, dict[str, str]]] = []
    matched_media: list[tuple[str, dict[str, str]]] = []
    _src_order = 0

    for sel, decls in css_rules.items():
        _src_order += 1
        # The @media sentinel is the SPACED ' :: ' (convert.py:431 — the port must
        # stay behaviour-identical). Splitting on bare '::' mis-parsed any
        # pseudo-element selector ('.x::before' → media='.x', sel='before'), which
        # both dropped the pseudo rule as junk-media AND, for a comma rule
        # ('.x::before, .y'), routed the plain '.y' half through the always-true
        # junk-media path — bypassing the base cascade's specificity ordering.
        if " :: " in sel:
            media_part, sel_part = sel.split(" :: ", 1)
            media_part = media_part.strip()
            sel_part = sel_part.strip()
        else:
            media_part = ""
            sel_part = sel.strip()

        matched_sel: str | None = None
        for individual_sel in sel_part.split(","):
            individual_sel = individual_sel.strip()
            if not individual_sel:
                continue
            # Strip leading .page-id-N scope prefix
            individual_sel = re.sub(r"^\.page-id-\d+\s+", "", individual_sel)
            if not individual_sel:
                continue
            parts = individual_sel.split()
            if not parts:
                continue
            last_part = parts[-1]
            if last_part.startswith(".") and last_part[1:] in desc_classes:
                # CLASS match: verify every ancestor token in parts[:-1] resolves
                # to a real ancestor of node (fixes GF-B.2 cross-section CSS bleed).
                # A compound single-element selector (no whitespace tokens before the
                # final class) means parts[:-1] is empty → no ancestor required → MATCH.
                ancestor_tokens = parts[:-1]
                class_match = True
                if ancestor_tokens:
                    idx = len(ancestor_tokens) - 1
                    while idx >= 0:
                        token = ancestor_tokens[idx]
                        if token in (">", "+", "~"):
                            idx -= 1
                            continue
                        if token.startswith("."):
                            req_cls = token[1:]
                            ancestor = node.parent
                            found = False
                            while ancestor and ancestor.name:
                                if req_cls in (ancestor.get("class", []) or []):
                                    found = True
                                    break
                                ancestor = ancestor.parent
                            if not found:
                                class_match = False
                                break
                        elif token and not token.startswith(("#", "[", ":")):
                            # Tag ancestor token
                            ancestor = node.parent
                            found = False
                            while ancestor and ancestor.name:
                                if ancestor.name == token:
                                    found = True
                                    break
                                ancestor = ancestor.parent
                            if not found:
                                class_match = False
                                break
                        idx -= 1
                if class_match:
                    matched_sel = individual_sel
                    break
            elif last_part == desc_tag:
                parent_match = True
                if len(parts) > 1:
                    parent_token = parts[-2]
                    if parent_token in (">", "+", "~"):
                        parent_token = parts[-3] if len(parts) > 2 else ""
                    if parent_token.startswith("."):
                        parent_cls = parent_token[1:]
                        ancestor = node.parent
                        ancestor_match = False
                        while ancestor and ancestor.name:
                            if parent_cls in (ancestor.get("class", []) or []):
                                ancestor_match = True
                                break
                            ancestor = ancestor.parent
                        parent_match = ancestor_match
                    elif parent_token and not parent_token.startswith(("#", "[", ":")):
                        # TAG ancestor (e.g. 'blockquote p') — REQUIRE a real ancestor
                        # with this tag. Previously skipped, so 'blockquote p' matched
                        # EVERY <p>, pulling wrong values onto unrelated elements.
                        ancestor = node.parent
                        ancestor_match = False
                        while ancestor and ancestor.name:
                            if ancestor.name == parent_token:
                                ancestor_match = True
                                break
                            ancestor = ancestor.parent
                        parent_match = ancestor_match
                if parent_match:
                    matched_sel = individual_sel
                    break

        if matched_sel is None:
            continue
        if media_part:
            matched_media.append((media_part, decls))
        else:
            matched_base.append((_sel_specificity(matched_sel), _src_order, decls))

    # Apply base rules in CASCADE order: ascending specificity then source order;
    # later/more-specific OVERRIDES earlier (last-wins). Inline style wins over all.
    matched_base.sort(key=lambda x: (x[0], x[1]))
    for _spec_key, _ord, d in matched_base:
        base_decls.update(d)
    inline = node.get("style", "") or ""
    if inline:
        base_decls.update(_parse_decls(inline))

    def _specificity_key(media_cond: str) -> tuple[int, int]:
        mn = re.search(r"min-width\s*:\s*(\d+)", media_cond)
        mx = re.search(r"max-width\s*:\s*(\d+)", media_cond)
        if mn:
            return (0, int(mn.group(1)))
        if mx:
            return (1, -int(mx.group(1)))
        return (2, 0)

    # ---- Device-tier cascade (Spec 31 §3 F-fork / FR-31-5.2) -------------------
    # SGS blocks are DESKTOP-BASE (the unsuffixed attr IS the desktop value), but
    # mockups are usually mobile-first (base CSS = mobile + `min-width` overrides).
    # A substring marker-match either dropped a non-device threshold (min-width:600
    # matched nothing → silently discarded) or snapped it to the wrong tier. Instead
    # compute the EFFECTIVE value at each device tier by cascading base + every
    # @media rule that applies at that tier's representative width (db_lookup
    # .device_tier_samples), then map Desktop→base_decls, Tablet/Mobile→bp_decls.
    #
    # This INVERTS a mobile-first draft correctly (the value effective at desktop
    # becomes the SGS base; the displaced mobile value lands on ...Mobile) and is
    # symmetric for max-width (desktop-first) drafts — ONE calculation, both
    # directions. `min-width:X` populates every tier whose sample ≥ X; `max-width:X`
    # every tier whose sample ≤ X.
    #
    # Cascade order among applicable media rules: min-width ascending / max-width
    # widest-first (_specificity_key) so a narrower breakpoint last-wins at a width.
    matched_media.sort(key=lambda mc: _specificity_key(mc[0]))

    def _effective_at(width: int) -> dict[str, str]:
        eff = dict(base_decls)
        for media_cond, media_decls in matched_media:
            if _media_condition_applies_at(media_cond, width):
                eff.update(media_decls)
        return eff

    tier_effective: dict[str, dict[str, str]] = {
        tier: _effective_at(width) for tier, width in db_lookup.device_tier_samples()
    }
    # Desktop is the SGS BASE (unsuffixed) tier — collapse it onto base_decls.
    desktop_decls = tier_effective.get("Desktop", dict(base_decls))
    out_base: dict[str, str] = dict(desktop_decls)
    out_bp: dict[str, dict[str, str]] = {}
    for tier, _width in db_lookup.device_tier_samples():
        if tier == "Desktop":
            continue
        for prop, val in tier_effective.get(tier, {}).items():
            # Emit a tier override only where it DIFFERS from the base — a tier that
            # matches base inherits it (no redundant …Tablet/…Mobile attr).
            if out_base.get(prop) != val:
                out_bp.setdefault(tier, {})[prop] = val

    # ---- F-ii residual: non-device thresholds (D228; never snap, never drop) ---
    # A media threshold outside the canonical device set (767/768/1023/1024) falls
    # strictly inside a tier's range → a sub-tier band the 3-tier attr model cannot
    # represent (e.g. min-width:600's 4-col band for 600–767 of Mobile). The three
    # device tiers above still capture the rule everywhere it aligns to a tier; the
    # residual band is surfaced (never silently dropped) for the F-ii passthrough
    # follow-up. Logged, not rendered — rendering the raw band is a future
    # passthrough-CSS channel (Spec 31 §3 F-ii).
    device_thresholds = db_lookup.device_tier_thresholds()
    for media_cond, media_decls in matched_media:
        thresholds = [
            int(v) for v in re.findall(r"(?:min|max)-width\s*:\s*(\d+)", media_cond)
        ]
        if any(t not in device_thresholds for t in thresholds):
            _LOG.info(
                "F-ii residual (non-device breakpoint preserved, not snapped): "
                "%s → %s [Spec 31 §3 F-ii passthrough follow-up]",
                media_cond.strip(), sorted(media_decls),
            )

    return out_base, out_bp


# ---------------------------------------------------------------------------
# css_value_to_attr (convert.py:1359 — ported verbatim, renamed)
# ---------------------------------------------------------------------------

def css_value_to_attr(value: str, kind: str) -> object | None:
    """Convert a CSS value string to a typed Python value.

    ``kind`` is the resolved ``kind`` column from ``property_suffixes`` (e.g.
    ``'colour'``, ``'number_px'``, ``'number_unitless'``, ``'string'``).

    Ported from convert.py:1359 (behaviour-identical).
    """
    raw = strip_important(value)
    if kind == "colour":
        return _colour_value_to_style(raw)
    if kind in ("number_px", "number_unitless", "number_px_or_em"):
        num, unit = split_value_unit(raw)
        if num is None:
            return None
        if kind == "number_unitless":
            return num
        return f"{num}{unit}"
    if kind == "string":
        return raw or None
    return None


# ---------------------------------------------------------------------------
# css_selector_has_class (convert.py:5243 — ported verbatim, renamed)
# ---------------------------------------------------------------------------

def css_selector_has_class(sel_key: str, selector: str) -> bool:
    """True if ``sel_key`` contains ``selector`` as a whole class-token.

    Handles both plain selectors and ``@media``-scoped keys with the
    ``' :: '`` sentinel. The CSS part after ``' :: '`` is what we match
    against.

    Ported from convert.py:5243 (behaviour-identical).
    """
    css_part = sel_key.split(" :: ", 1)[-1]  # works whether ' :: ' is present or not
    pattern = re.escape(selector) + r"(?=[ \t\r\n,:\[#>~+{]|$)"
    return bool(re.search(pattern, css_part))
