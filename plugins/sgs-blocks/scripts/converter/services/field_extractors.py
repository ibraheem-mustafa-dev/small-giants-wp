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
numeric-content  first number in text, else in the       int | float | None
                 aria-label (decimal-capable, verbatim)
colour-background  the element's INLINE background       str | None
                 colour (hex / rgb() / hsl() / named /
                 palette token slug)
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
    extract_aria_number,
    extract_star_count,
    first_content_img,
    first_number,
    rich_text_content,
    scalar_media_from_img,
)
from converter.services.styling_helpers import _DECL_RE, extract_token_or_hex
from converter.services.icon_resolver import record_icon_proposal, resolve_icon
from converter.db import db_lookup

if TYPE_CHECKING:
    pass  # noqa: F401

import os
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


# ---------------------------------------------------------------------------
# colour-background — the element's INLINE background colour
# ---------------------------------------------------------------------------
# Serves a per-item colour field such as sgs/google-reviews reviews[].avatarColour (an initials-avatar
# background, "a palette slug or a CSS colour"). Reads the inline ``style`` the draft actually carries,
# so a draft that stamps each review's colour at run time (a loop over a palette) yields each card's own
# colour. The value goes through the pipeline's ONE colour normaliser, styling_helpers.extract_token_or_hex
# (Spec 31 section 3.A step 6): a palette reference becomes its token slug, hex and rgb()/hsl() literals
# are kept verbatim (a per-instance client colour with no token equivalent), white/black become hex. No
# second colour parser is written here.

_BACKGROUND_PROPS = frozenset({"background", "background-color"})


def _background_declaration(element: "Tag") -> str | None:
    """The raw value of the LAST ``background`` / ``background-color`` in the element's inline style.

    The last one wins, as in CSS: ``background:#000;background-color:#fff`` paints white. None when the
    element declares neither, which is the strict no-op (the element simply has no colour to lift).
    """
    style = element.get("style", "")
    if not isinstance(style, str) or not style:
        return None
    value: str | None = None
    for match in _DECL_RE.finditer(style):
        if match.group(1).strip().lower() in _BACKGROUND_PROPS:
            value = match.group(2).strip()
    return value or None


def _top_level_tokens(value: str) -> list[str]:
    """Whitespace-separated tokens of a CSS value, keeping a ``rgb(0, 0, 0)`` group as one token."""
    tokens: list[str] = []
    depth = 0
    current: list[str] = []
    for ch in value:
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth = max(0, depth - 1)
        if ch.isspace() and depth == 0:
            if current:
                tokens.append("".join(current))
                current = []
        else:
            current.append(ch)
    if current:
        tokens.append("".join(current))
    return tokens


def _named_colour_hex(word: str) -> str | None:
    """A CSS named colour ('crimson') as its hex value, else None.

    Uses Pillow's ImageColor table (the full CSS colour-name set) rather than a hand-written dict, and
    imports it lazily like ``webgl_style_classifier``. ``white`` / ``black`` never reach here (the shared
    normaliser maps them); ``transparent`` / ``currentcolor`` / ``inherit`` are not in the table and so are
    correctly refused. Without Pillow a named colour is simply not resolved (reported as a gap by the caller).
    """
    try:
        from PIL import ImageColor
    except ImportError:  # pragma: no cover - Pillow is a pipeline dependency; degrade to a gap, not a crash
        return None
    return ImageColor.colormap.get(word.lower())


def extract_background_colour(element: "Tag") -> str | None:
    """Resolve the element's inline background to a token slug or a concrete colour, else None.

    ``background:`` shorthand and ``background-color:`` are both read (last declaration wins). Inside a
    shorthand the colour is the first token that resolves to a colour; ``url(...)`` / ``no-repeat`` / size
    tokens are skipped. A gradient (``linear-gradient(...)``), a bare unresolved ``var(--x)`` and anything
    else that is not a single colour return None: the caller reports that as a gap, never a guess.
    """
    raw = _background_declaration(element)
    if not raw or "gradient(" in raw.lower():
        return None
    for token in _top_level_tokens(raw):
        colour = extract_token_or_hex(token)
        if colour is None and token.isalpha():
            colour = _named_colour_hex(token)
        if colour is not None:
            return colour
    return None


def background_declaration(element: "Tag") -> str | None:
    """Public read of the raw inline background value, for a caller reporting an unresolved colour."""
    return _background_declaration(element)


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
        # A decorative <img> found by searching INSIDE a container (aria-hidden / role=presentation:
        # an icon, a source mark) is never the container's content image -- see lift_helpers.
        img_node = first_content_img(element)
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
    # 10" -> 9.2) or sgs/google-reviews.averageRating ("4.7") / .reviewCount
    # ("15 reviews" -> 15). Distinct from 'rating' (STAR count, hardcoded 0..5
    # clamp via extract_star_count) and from 'plain-integer' (verbatim TEXT, no
    # numeric parsing). Returns the FIRST number found: a float when written
    # with a decimal part, an int when written whole, or None when the element
    # carries no number (no guessed value, matching every other role's no-op
    # floor). Not clamped: this role serves 0..5, 0..10 and 0..100 scales alike.
    # ------------------------------------------------------------------
    if role == "numeric-content":
        # Typed by how it was written (lift_helpers.first_number): '4.7' -> 4.7, '15' -> 15, '1,204' -> 1204.
        # Falls back to the aria-label ONLY when the text carries no number at all (a glyph-run element that
        # states its value as aria-label="4.7 out of 5"); never to a star-glyph count, which is decoration.
        number = first_number(element.get_text())
        return number if number is not None else extract_aria_number(element)

    # ------------------------------------------------------------------
    # colour-background — the element's inline background colour (a per-item
    # colour field, e.g. sgs/google-reviews reviews[].avatarColour). See the
    # helpers above; a gradient / unresolved var() returns None (a gap).
    # ------------------------------------------------------------------
    if role == "colour-background":
        return extract_background_colour(element)

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
    # state-modifier-boolean (2026-09-08) — True when the matched element
    # itself is marked SELECTED/ACTIVE, False otherwise. Distinct from
    # presence-boolean: that role's value is always True once matched
    # (existence IS the signal); this role's element ALWAYS exists (e.g.
    # every pack-size pill in a repeater) and the boolean depends on which
    # ONE of the siblings carries the marker — e.g.
    # `.sgs-product-card__pill.sgs-product-card__pill--active
    # aria-pressed="true"` on exactly one option. Two independent signals,
    # either sufficient:
    #   (a) a standard ARIA state attribute (aria-pressed/aria-selected=
    #       "true") — a WAI-ARIA spec fact, not per-block data, the same
    #       permitted-constant class as _FONT_WEIGHT_KEYWORDS elsewhere in
    #       this tree;
    #   (b) a BEM --modifier suffix that is a member of the DB's own
    #       state-modifier vocabulary (modifier_suffixes(kind='state'),
    #       which already seeds 'Active') — gated on the DB set rather than
    #       a hardcoded string so an ARBITRARY content modifier (--trial,
    #       --outline) is never misread as "selected" (R-31-1).
    # ------------------------------------------------------------------
    if role == "state-modifier-boolean":
        if (element.get("aria-pressed") or "").strip().lower() == "true":
            return True
        if (element.get("aria-selected") or "").strip().lower() == "true":
            return True
        state_suffixes = {s.lower() for s in db_lookup.modifier_suffixes("state")}
        for cls in (element.get("class") or []):
            if not isinstance(cls, str):
                continue
            bem = db_lookup.parse_sgs_bem(cls)
            if bem and bem.modifier and bem.modifier.lower() in state_suffixes:
                return True
        return False

    # ------------------------------------------------------------------
    # icon-slug — priority chain (data-icon > data-lucide > inline <svg>
    #             via icon_resolver > BEM modifier)
    # 'identity' is the DB role on an icon block's source attr (sgs/icon.iconSource);
    # it resolves to an icon slug via the SAME chain (D-2026-07-02).
    # 'icon' (added 2026-09-06, Check#12 roleguess Build 1) is the array-item
    # field role — the analogous multi-format union to 'image-object' for a
    # repeater's own icon field (sgs/trust-bar items[].icon, sgs/process-steps
    # steps[].icon, sgs/form-field-tiles tiles[].icon) — resolves via the SAME
    # chain: it stores whatever format the resolver actually found (a lucide
    # slug, dashicon name, etc.), with a sibling field (e.g. iconSource) naming
    # which format that is.
    # ------------------------------------------------------------------
    if role in ("icon-slug", "identity", "icon"):
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
            # confidence == "none" → raw SVG falls back; return None here. The caller that
            # owns a raw-svg companion field (array_content._lift_item) preserves the markup.
            # An icon the library does not know is also RECORDED as a proposal so the library
            # can grow from real drafts. Opt-in (writes only when SGS_ICON_PROPOSALS_LOG is set)
            # and never raises; the draft path and run label come from the environment the
            # orchestrator sets (SGS_ICON_SOURCE_DRAFT / SGS_RUN_LABEL), 'unknown' otherwise.
            record_icon_proposal(
                result,
                source_draft=os.environ.get("SGS_ICON_SOURCE_DRAFT") or "unknown",
                run_label=os.environ.get("SGS_RUN_LABEL") or "unknown",
            )

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
    # Wired into the cloning pipeline via lift_scalar_content's gate;
    # first real DB adopter is sgs/testimonial's ratingType attribute (D885).
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
