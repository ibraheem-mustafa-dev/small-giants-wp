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
Only ``from orchestrator.converter_v2 import db_lookup`` is used from the
frozen tree.
"""
from __future__ import annotations

import re
from typing import Any

from bs4 import Tag

from orchestrator.converter_v2 import db_lookup


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
    """Collect CSS declarations targeting this element.

    Returns ``(base_decls, bp_decls)`` where:

    - ``base_decls`` — ``{prop: val}`` from inline style + non-media CSS rules
    - ``bp_decls``   — ``{bp_suffix: {prop: val}}`` for @media rules keyed by
      breakpoint suffix (e.g. ``'Desktop'``, ``'Tablet'``, ``'Mobile'`` — NOT
      the raw media condition string)

    Sources (in priority order):

    1. Inline style attribute on the element (highest specificity)
    2. Direct class selectors (``.sgs-hero__sub``)
    3. Parent-qualified selectors (``.sgs-hero__copy h1``)
    4. Grouped selectors (``h1, h2, h3``)

    Media rules are routed to ``bp_decls`` by matching the media condition against
    ``db_lookup.breakpoint_suffix_rules()`` vocabulary
    (e.g. ``'min-width: 1280'`` → ``'Desktop'``).

    Ported from convert.py:585 (behaviour-identical). Calls
    ``db_lookup.breakpoint_suffix_rules()`` in place of the original
    ``db.breakpoint_suffix_rules()``.
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
        if "::" in sel:
            media_part, sel_part = sel.split("::", 1)
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

    bp_rules = db_lookup.breakpoint_suffix_rules()
    matched_media.sort(key=lambda mc: _specificity_key(mc[0]))
    for media_part, decls in matched_media:
        for bp_substr, bp_suffix_list in bp_rules:
            if bp_substr in media_part:
                for bp_suffix in bp_suffix_list:
                    bucket = bp_decls.setdefault(bp_suffix, {})
                    bucket.update(decls)
                break

    return base_decls, bp_decls


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
