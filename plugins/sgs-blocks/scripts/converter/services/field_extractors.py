"""field_extractors.py — Shared per-element role→value dispatch (Spec 31 §3.B.0).

Single source of truth for every content-role handler.  Both array_content and
scalar_content delegate their per-element value extraction here, so the two
extraction paths are GUARANTEED to behave identically — no duplicate private
handlers that can drift.

Public API
----------
extract_field_value(element, role, media_map=None) -> Any | None

Role table (Spec 31 §3.B.0)
----------------------------
role             input signal                           returns
---------------  -------------------------------------  -------------------------
text-content     element inner HTML (safe inline tags)  str (rich HTML) | None
image-object     <img> (element or descendant)          dict {url,id,alt} | None
rating           aria-label / ★ glyph count             int 0-5 (STAR role only)
icon-slug        data-icon / data-lucide / inline <svg> str slug | None
                 / BEM --<modifier>
url-href         <a href> (element or descendant)        str | None
link-href        ALIAS of url-href (DB scalar-attr role)  str | None
plain-integer    element text verbatim                   str | None
css-modifier     BEM --<modifier> suffix on element cls  str | None

Design constraints (all inherited from Spec 31 §3.B.0 / R-31-1 / R-31-9):
  - No block-slug literals.
  - No hardcoded dicts.
  - icon_resolver (converter.services.icon_resolver — moved off the frozen tree
    in EXECUTION Step 9, Phase 3, 2026-07-04; formerly
    orchestrator.converter_v2.icon_resolver, vetted per D248) is imported here
    as a shared recognition primitive, equivalent in role to db_lookup.
  - ``rating`` is the STAR-count role.  ``plain-integer`` is for verbatim text
    numbers like "500+" or "01".  They are distinct and must not be conflated.

This module carries NO block-slug or variant literals; no DB calls (those belong
in the resolvers that call us).
"""
from __future__ import annotations

from typing import TYPE_CHECKING, Any

from bs4 import Tag

from converter.services.lift_helpers import (
    _safe_href,
    extract_star_count,
    rich_text_content,
    scalar_media_from_img,
)
from converter.services.icon_resolver import resolve_icon

if TYPE_CHECKING:
    pass  # noqa: F401

import re

# Emoji code-point ranges (pictographs, dingbats, symbols, regional indicators,
# variation selectors, ZWJ). Used to detect a BARE emoji glyph as icon content —
# an icon element that carries an emoji rather than a Lucide slug or an <svg>.
_EMOJI_RE = re.compile(
    "["
    "\U0001F000-\U0001FAFF"   # pictographs / emoji / symbols
    "\U00002600-\U000027BF"   # misc symbols + dingbats
    "\U0001F1E6-\U0001F1FF"   # regional-indicator flags
    "\U00002B00-\U00002BFF"   # misc symbols & arrows
    "\U00002190-\U000021FF"   # arrows
    "\U0000FE00-\U0000FE0F"   # variation selectors
    "\U0000200D"              # zero-width joiner (emoji sequences)
    "\U000020E3"              # combining enclosing keycap
    "]+",
    flags=re.UNICODE,
)


def _is_bare_emoji(text: str) -> bool:
    """True when ``text`` is a short glyph consisting ENTIRELY of emoji code points.

    Conservative: a long or mixed string (a heading, a sentence) is never an icon,
    so the length guard + all-emoji check rejects them. '🌾' → True; 'Oats' → False.
    """
    s = (text or "").strip()
    if not s or len(s) > 8:  # emoji sequences are short; prose is not an icon
        return False
    return _EMOJI_RE.sub("", s) == ""


def _icon_class_name(element: "Tag", prefix: str) -> str | None:
    """First class token (on ``element`` or any descendant) that starts with
    ``prefix``, returned with the prefix stripped. Used to read a Dashicons
    (``dashicons-heart``) or WP-icon (``wp-icon-star``) name off the draft markup.
    """
    for el in [element, *element.find_all(True)]:
        for cls in (el.get("class") or []):
            if isinstance(cls, str) and cls.startswith(prefix) and len(cls) > len(prefix):
                return cls[len(prefix):]
    return None


def resolve_icon_kind(element: "Tag | None") -> tuple[str | None, str | None]:
    """Shared icon-content resolver (Spec 31 §3.B.0) — the SINGLE place icon content
    is recognised, reusable from EVERY extraction path (leaf lift, array item, nested
    child). Resolves to exactly one of ``sgs/icon``'s FOUR real sources (block.json
    ``iconSource`` enum = lucide / wp-icon / dashicon / emoji — there is NO raw-svg
    source, so a raw ``<svg>`` the fingerprinter can't map is intentionally NOT a kind;
    it becomes a loud content gap upstream rather than a silent default-star):

        ('lucide',   slug)  — a confident Lucide slug (data-*/inline-svg fingerprint/BEM)
        ('wp-icon',  name)  — an explicit WordPress-icon marker (data-wp-icon/wp-icon-*)
        ('dashicon', name)  — an explicit Dashicons class (dashicons-<name>)
        ('emoji',    char)  — a BARE emoji glyph (no <svg>, no slug)
        (None,       None)  — no supported icon source

    A wp-icon authored as an inline ``<svg>`` (from ``@wordpress/icons``) that
    fingerprint-matches a Lucide glyph folds into ``('lucide', slug)`` — visually
    identical — via the shared slug chain; only an EXPLICIT wp-icon marker returns
    the ``wp-icon`` kind. Detection lives HERE ONCE (not per block / per path), so
    trust-bar badges, icon-list items, info-box icons — any icon anywhere — get the
    same source coverage (R-31-9). No block/slug literal; pure element inspection.
    """
    if element is None or not isinstance(element, Tag):
        return (None, None)
    # 1. Dashicons — explicit `dashicons-<name>` class (Dashicons font source).
    dash = _icon_class_name(element, "dashicons-")
    if dash:
        return ("dashicon", dash)
    # 2. WordPress-icon — explicit `data-wp-icon` attr or `wp-icon-<name>` class.
    wp_attr = element.get("data-wp-icon")
    if isinstance(wp_attr, str) and wp_attr.strip():
        return ("wp-icon", wp_attr.strip())
    wp_cls = _icon_class_name(element, "wp-icon-")
    if wp_cls:
        return ("wp-icon", wp_cls)
    # 3. Confident Lucide slug via the shared icon-slug handler (data-icon / inline
    #    <svg> fingerprint / BEM --modifier). Folds fingerprinted wp-icon SVGs here.
    slug = extract_field_value(element, "icon-slug", {})
    if slug:
        return ("lucide", slug)
    # 4. A bare emoji glyph (no slug, no explicit dashicon/wp-icon marker).
    if _is_bare_emoji(element.get_text(strip=True)):
        return ("emoji", element.get_text(strip=True))
    return (None, None)


def extract_field_value(element: Tag, role: str, media_map: dict | None = None) -> Any:
    """Dispatch a role to its canonical value handler for a single DOM element.

    Parameters
    ----------
    element:
        A BeautifulSoup Tag node that has already been resolved by the caller
        (the class-selector lookup is the caller's responsibility — this function
        receives the matched element, not the item root).
    role:
        One of the recognised role strings from the role table above.  Unknown
        roles return None without error (no gap — schema-author responsibility).
    media_map:
        Optional basename→entry dict for media URL resolution.  Pass ``{}`` or
        omit when no media-map was loaded for this run.

    Returns
    -------
    The extracted value (str / dict / int) or ``None`` when no value could be
    resolved for the given role.  A ``None`` return means the caller OMITS the
    attr key (not a gap — the field is optional / the element carried nothing).
    """
    _media = media_map or {}

    # ------------------------------------------------------------------
    # text-content — rich HTML extraction preserving safe inline tags
    #
    # 'content' is a first-class ALIAS of 'text-content' (mirroring the
    # link-href/url-href alias pattern above) — a `block_attributes.role`
    # value of 'content' (e.g. a scalar text attr whose canonical_slot
    # peeled to a generic content slot) is the SAME operation as
    # 'text-content': rich-text extraction from the matched element. Adding
    # it here (rather than a per-caller hardcoded "text-content" literal)
    # lets every caller pass the ROW'S REAL role straight through (Spec 31
    # §3.B.0 single-source role library; D279 QC fix — walk.py used to
    # hardcode "text-content" even when the DB row's role was 'content').
    # ------------------------------------------------------------------
    if role in ("text-content", "content"):
        value = rich_text_content(element)
        return value if value else None

    # ------------------------------------------------------------------
    # image-object — resolve a scalar media dict from an <img>
    # ------------------------------------------------------------------
    if role == "image-object":
        img_node = element if element.name == "img" else element.find("img")
        if img_node is not None and isinstance(img_node, Tag):
            return scalar_media_from_img(img_node, _media)
        return None

    # ------------------------------------------------------------------
    # rating — STAR-count only (0..5 int).  Distinct from plain-integer.
    # ------------------------------------------------------------------
    if role == "rating":
        return extract_star_count(element)

    # ------------------------------------------------------------------
    # icon-slug — priority chain (data-icon > data-lucide > inline <svg>
    #             via icon_resolver > BEM modifier)
    # 'identity' is the DB role on an icon block's source attr (sgs/icon.iconSource);
    # it resolves to an icon slug via the SAME chain (D-2026-07-02).
    # ------------------------------------------------------------------
    if role in ("icon-slug", "identity"):
        # Priority 1: data-icon / data-lucide attribute on the element.
        for attr_name in ("data-icon", "data-lucide"):
            val = element.get(attr_name)
            if val and isinstance(val, str):
                stripped = val.strip()
                if stripped:
                    return stripped

        # Priority 2: inline <svg> resolved via icon_resolver.
        # icon_resolver is a vetted shared recognition primitive (same class as
        # db_lookup); it is explicitly added to import_ban.py's allowlist (D248).
        svg_node = element if element.name == "svg" else element.find("svg")
        if svg_node is not None and isinstance(svg_node, Tag):
            result = resolve_icon(svg_node)
            if result.get("confidence") in ("high", "medium"):
                return result["slug"]
            # confidence == "none" → raw SVG falls back; return None here
            # (callers that want the raw SVG should call resolve_icon directly).

        # Priority 3: BEM --<modifier> suffix on the element's class list.
        for cls in (element.get("class") or []):
            if isinstance(cls, str) and "--" in cls:
                slug = cls.rsplit("--", 1)[-1].strip()
                if slug:
                    return slug

        return None

    # ------------------------------------------------------------------
    # url-href / link-href — <a href> on the element itself or first descendant <a>
    #
    # ``url-href`` is the array-schema role name; ``link-href`` is the DB role on
    # scalar URL attrs (block_attributes.role — 30 attrs, e.g. sgs/button.url).
    # They are the SAME operation (resolve the nearest <a href> via _safe_href), so
    # link-href is a true ALIAS of url-href, never a parallel handler that can drift
    # (Spec 31 §3.B.0 single-source role library; council MF3, 2026-06-30). For a
    # leaf <a class="sgs-button" href> the element IS the anchor (element-self href),
    # so this resolves the button's own href — the .sgs-button__link derived_selector
    # is a DESCENDANT that does not exist on the real draft (council MF4).
    # ------------------------------------------------------------------
    if role in ("url-href", "link-href"):
        anchor = element if element.name == "a" else element.find("a")
        if anchor is not None and isinstance(anchor, Tag):
            raw = anchor.get("href", "")
            return _safe_href(raw) if isinstance(raw, str) else None
        return None

    # ------------------------------------------------------------------
    # plain-integer — verbatim text (preserves "500+" and "01")
    # ------------------------------------------------------------------
    if role == "plain-integer":
        text = element.get_text(strip=True)
        return text if text else None

    # ------------------------------------------------------------------
    # css-modifier — extract the BEM --<modifier> suffix from the element's
    # class list (e.g. "badge--light" → "light").
    # NOT wired into any schema in this task; provided for future callers.
    # ------------------------------------------------------------------
    if role == "css-modifier":
        for cls in (element.get("class") or []):
            if isinstance(cls, str) and "--" in cls:
                modifier = cls.rsplit("--", 1)[-1].strip()
                if modifier:
                    return modifier
        return None

    # Unknown role → no value, no gap (schema-author responsibility).
    return None
