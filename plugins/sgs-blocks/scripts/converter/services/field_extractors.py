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
link-content     <a href> MINUS the block's own URL       str | None
                 template (needs ``link_template``)
plain-integer    element text verbatim                   str | None
css-modifier     BEM --<modifier> suffix on element cls  str | None
numeric-content  first signed decimal token in text      float | None
presence-boolean element MATCHED (existence is the value) True (always)

Design constraints (all inherited from Spec 31 §3.B.0 / R-31-1 / R-31-9):
  - No block-slug literals.
  - No hardcoded dicts.
  - icon_resolver (converter.services.icon_resolver — moved off the frozen tree
    in EXECUTION Step 9, Phase 3, 2026-07-04; formerly
    orchestrator.converter_v2.icon_resolver, vetted per D248) is imported here
    as a shared recognition primitive, equivalent in role to db_lookup.
  - ``rating`` is the STAR-count role.  ``plain-integer`` is for verbatim text
    numbers like "500+" or "01".  ``numeric-content`` is for a genuinely
    numeric (decimal-capable) score/value, e.g. a 0-100 review score — NOT a
    star count and NOT an enum pick. All are distinct and must not be
    conflated (Task 4, 2026-09-05: sgs/testimonial.ratingScale was previously
    misrouted through 'select-from-enum', which the resolver gate correctly
    excludes since a continuous score is not a fixed choice set).

This module carries NO block-slug or variant literals; no DB calls (those belong
in the resolvers that call us).
"""
from __future__ import annotations

from typing import TYPE_CHECKING, Any
from urllib.parse import unquote

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


LINK_TEMPLATE_PLACEHOLDER = "{value}"

# RFC 3986 gen-delims that TERMINATE a fragment, by the URL component the
# fragment occupies. A path segment ends at the query or the hash; a query
# parameter value ends at the next parameter or the hash. This is the URL
# grammar the assembling render.php already relies on when it concatenates
# (`'?text=' . $encoded_message` only parses as a query parameter BECAUSE `?`
# and `&` delimit) — it is not a bespoke grammar invented for this role.
_FRAGMENT_TERMINATORS_PATH = ("?", "#")
_FRAGMENT_TERMINATORS_QUERY = ("&", "#")


def _resolve_href(element: "Tag") -> str | None:
    """The element's own ``href`` (or its first descendant ``<a>``'s), scheme-
    allowlisted through the SHARED ``_safe_href`` — the exact resolution the
    ``url-href``/``link-href`` branch performs, reused so a fragment can never
    be read off a URL those roles would have rejected."""
    anchor = element if element.name == "a" else element.find("a")
    if anchor is None or not isinstance(anchor, Tag):
        return None
    raw = anchor.get("href", "")
    if not isinstance(raw, str):
        return None
    return _safe_href(raw)


def _fragment_bounds(href: str, prefix: str, suffix: str) -> "tuple[int, int] | None":
    """Locate ``[start, end)`` of the operator-supplied fragment inside ``href``.

    ``prefix``/``suffix`` are the template's literal halves either side of the
    placeholder. Returns None whenever the href does not carry the template's
    literals — the caller then yields NO value, which is the whole point of the
    role: a silently WRONG fragment (a phone number that is really half a URL)
    is far worse than no value.
    """
    if prefix:
        if "://" in prefix:
            # An ABSOLUTE template describes the start of the whole URL, so it
            # is anchored — never matched at some interior offset.
            if not href.startswith(prefix):
                return None
            start = len(prefix)
        else:
            idx = href.find(prefix)
            if idx < 0:
                return None
            start = idx + len(prefix)
    else:
        start = 0

    rest = href[start:]
    if suffix:
        offset = rest.find(suffix)
        if offset < 0:
            return None
        return (start, start + offset)

    # No trailing literal: the fragment runs to the next delimiter of whichever
    # URL component it sits in.
    question = href.find("?")
    terminators = (
        _FRAGMENT_TERMINATORS_QUERY
        if 0 <= question < start
        else _FRAGMENT_TERMINATORS_PATH
    )
    cut = len(rest)
    for delimiter in terminators:
        found = rest.find(delimiter)
        if 0 <= found < cut:
            cut = found
    return (start, start + cut)


def extract_link_fragment(element: "Tag", link_template: str | None) -> str | None:
    """``link-content`` handler — recover ONE operator-supplied fragment from a
    URL the block assembles around it.

    WHY THIS ROLE EXISTS. Every other content-bearing role extracts a WHOLE
    value. ``sgs/whatsapp-cta.phoneNumber`` and ``.message`` never do: render.php
    (``whatsapp-cta/render.php:54-58``) builds

        $clean_phone     = preg_replace( '/[^0-9]/', '', $phone_number );
        $wa_url          = 'https://wa.me/' . $clean_phone;
        $wa_url         .= '?text=' . rawurlencode( $message );

    so the draft's rendered ``<a href>`` is BLOCK LITERAL + OPERATOR VALUE
    concatenated. Handing that whole href to ``link-href`` would store
    ``https://wa.me/447700900123?text=Hi`` in ``phoneNumber``, which render.php
    then re-prefixes into ``https://wa.me/httpswame447700900123texthi`` (its
    digit-strip mangles it further) — a corrupted client phone number that still
    LOOKS like a successful clone. The template is what makes the round trip
    reversible.

    THE TEMPLATE is recovered from render.php by the behavioural analyser and
    stored on ``block_attributes.output_signature.link_template`` (capture half
    shipped 2026-08-05, ``580f7885``); the converter reads it via
    ``db_lookup.link_template_for``. It carries exactly one ``{value}``
    placeholder marking where the operator's value lands, e.g.
    ``https://wa.me/{value}`` (phoneNumber) and ``?text={value}`` (message).

    FRAGMENT BOUNDARIES are the URL's own delimiters (see the module constants),
    never a per-block rule: a path fragment ends at ``?``/``#``, a query fragment
    at ``&``/``#``.

    PERCENT-DECODING is applied to a QUERY fragment ONLY, because that is the
    exact inverse of the ``rawurlencode()`` the assembling render applies to the
    query half; a path fragment is returned verbatim rather than speculatively
    decoded.

    Returns None — never a guess — when there is no template, when the template
    is not single-placeholder, when the element carries no allowlisted href, or
    when the href does not contain the template's literals.
    """
    if not link_template or not isinstance(link_template, str):
        return None
    if link_template.count(LINK_TEMPLATE_PLACEHOLDER) != 1:
        return None
    href = _resolve_href(element)
    if not href:
        return None

    prefix, suffix = link_template.split(LINK_TEMPLATE_PLACEHOLDER, 1)
    bounds = _fragment_bounds(href, prefix, suffix)
    if bounds is None:
        return None
    start, end = bounds
    fragment = href[start:end]
    if not fragment:
        return None

    question = href.find("?")
    if 0 <= question < start:
        fragment = unquote(fragment)
    return fragment or None


def extract_field_value(
    element: Tag,
    role: str,
    media_map: dict | None = None,
    link_template: str | None = None,
) -> Any:
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
    link_template:
        Optional URL template for the ``link-content`` role ONLY — the block's
        own literal with a single ``{value}`` placeholder, read from
        ``block_attributes.output_signature.link_template`` by the caller (via
        ``db_lookup.link_template_for``).  Added as a KEYWORD-DEFAULTED
        parameter precisely so this shared §3.B.0 entry point stays call-
        compatible for BOTH existing paths: ``array_content`` and
        ``scalar_content`` pass three positional arguments and are unaffected.
        Every other role ignores it; ``link-content`` without it returns None.

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
    # svg — RAW SVG markup (Bean, 2026-08-05)
    #
    # This role exists because routing SVG through the text branch above is
    # ACTIVELY DESTRUCTIVE, not merely imprecise: rich_text_content() keeps only
    # a text-tag whitelist, so <svg>/<path>/<g> are stripped and a real icon
    # arrives as the empty string. sgs/hero.svgContent and sgs/media.svgContent
    # carried role='content' and would have been mangled the moment a draft
    # matched them.
    #
    # Distinct from the icon-slug path below: that resolves an <svg> to a NAMED
    # icon via icon_resolver and returns a slug. This returns the markup itself,
    # which is what svgContent / bgSvgContent attributes actually store — a
    # bespoke inline SVG that has no slug because it is not a library icon.
    #
    # Returns the element's own markup when it IS an <svg>, else the first <svg>
    # descendant. No match returns None so the caller gap-tracks it (flag, never
    # silently drop).
    # ------------------------------------------------------------------
    if role == "svg":
        svg_el = element if element.name == "svg" else element.find("svg")
        if svg_el is not None and isinstance(svg_el, Tag):
            markup = str(svg_el).strip()
            return markup if markup else None
        return None

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
    # numeric-content — a genuinely numeric (decimal-capable) scalar read
    # verbatim from element text, e.g. sgs/testimonial.ratingScale ("9.2 /
    # 10" -> 9.2). Distinct from 'rating' (STAR count, hardcoded 0..5 clamp
    # via extract_star_count) and from 'plain-integer' (verbatim TEXT, no
    # numeric parsing). Returns the FIRST signed decimal token found, as a
    # Python float, or None when the element carries no numeric token (no
    # guessed value, matching every other role's no-op floor).
    # ------------------------------------------------------------------
    if role == "numeric-content":
        match = re.search(r"-?\d+(?:\.\d+)?", element.get_text())
        return float(match.group(0)) if match else None

    # ------------------------------------------------------------------
    # presence-boolean — True purely because the matched element EXISTS
    # (e.g. sgs/testimonial.verified: the badge's presence in the draft IS
    # the signal, its text content is irrelevant). The caller only reaches
    # this branch after a derived_selector match already succeeded, so
    # there is nothing further to inspect on the element itself.
    # ------------------------------------------------------------------
    if role == "presence-boolean":
        return True

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
    # link-content — a CONCATENATED FRAGMENT of an assembled URL.
    #
    # Distinct from url-href/link-href above: those store the WHOLE href. This
    # stores only the operator-supplied part, recovered by subtracting the
    # block's own URL template. Full rationale + the whatsapp-cta ground truth
    # in extract_link_fragment's docstring.
    # ------------------------------------------------------------------
    if role == "link-content":
        return extract_link_fragment(element, link_template)

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
