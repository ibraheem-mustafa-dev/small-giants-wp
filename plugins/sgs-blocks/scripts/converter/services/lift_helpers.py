"""lift_helpers.py — ported helper closure for the scalar-content lift.

Faithful port of the following from orchestrator/converter_v2/convert.py,
behaviour-IDENTICAL (Spec 31 §1/§3.B1, D246):

  - ``_RICH_TEXT_INLINE_TAGS``  (convert.py:3158)
  - ``_safe_href``               (convert.py:3165)
  - ``_rich_text_content``       (convert.py:3177)   → ``rich_text_content``
  - ``_extract_star_count``      (convert.py:4081)   → ``extract_star_count``
  - ``_resolve_media_url``       (convert.py:143)    → ``resolve_media_url``
                                  (module global ``_MEDIA_MAP`` replaced by an
                                  explicit ``media_map: dict`` parameter)
  - ``_lift_scalar_media_from_img`` (convert.py:4098) → ``scalar_media_from_img``

No block-slug literals. No import from convert.py. No module-level media-map
global (passed explicitly so callers control the scope).
"""
from __future__ import annotations

import re

from bs4 import Comment, NavigableString, Tag

# ---------------------------------------------------------------------------
# Rich-text constant (convert.py:3158 — verbatim copy)
# ---------------------------------------------------------------------------

# Pending per-block render.php audit (their escape policy is currently unknown
# — applying rich-text to sgs/heading etc. without confirming wp_kses_post()
# wrap could either lose tags to escaping OR introduce XSS).
_RICH_TEXT_INLINE_TAGS = frozenset({"br", "strong", "b", "em", "i", "a", "span", "code"})

# Safe URL schemes for <a href>. Empty string covers relative URLs (/about/).
# Excludes javascript:, data:, vbscript:, file: per WP wp_allowed_protocols defaults.
_SAFE_HREF_SCHEMES = frozenset({"http", "https", "mailto", "tel", ""})


# ---------------------------------------------------------------------------
# _safe_href (convert.py:3165 — ported verbatim)
# ---------------------------------------------------------------------------

def _safe_href(value: str) -> str | None:
    """Validate href scheme against allowlist. Returns trimmed value or None."""
    if not value:
        return None
    try:
        from urllib.parse import urlparse
        scheme = urlparse(value).scheme.lower()
    except ValueError:
        return None
    return value if scheme in _SAFE_HREF_SCHEMES else None


# ---------------------------------------------------------------------------
# rich_text_content (convert.py:3177 — ported verbatim, renamed)
# ---------------------------------------------------------------------------

def rich_text_content(node: Tag) -> str:
    """Extract inner content preserving safe inline HTML tags with XSS hardening.

    Used for core/* atomic-tag swaps where the target block natively accepts
    rich-text (core/heading, core/paragraph, core/quote, core/button). Preserves
    ``<br>``, ``<strong>``, ``<em>``, ``<a>``, ``<span>``, ``<b>``, ``<i>``,
    ``<code>``; strips disallowed tags to text content. Defence-in-depth:
    1. Text nodes are HTML-escaped (prevents ``<script>`` etc. in NavigableString)
    2. <a href> values are scheme-allowlisted then attribute-escaped
    3. All other tag attributes are dropped (only href on <a> survives)

    Defence-in-depth is needed even though mockup HTML is author-controlled,
    because mockups may be scraped from external sites via /uimax-scrape +
    /uimax-sgs-scrape-pattern. Downstream WP render still applies wp_kses_post
    as a second layer.

    XS-9 fix 2026-05-30 — diagnostic register hero F3: mockup ``<h1>Made for
    the mum<br>who needs it most</h1>`` was collapsing to "Made for the mumwho
    needs it most" because node.get_text(strip=True) dropped the <br>.
    """
    from html import escape
    parts: list[str] = []
    for child in node.children:
        if isinstance(child, Comment):
            continue
        if isinstance(child, NavigableString):
            # Escape ampersand + angle-brackets in literal text (prevents
            # raw HTML injection via text content)
            parts.append(escape(str(child), quote=False))
            continue
        if isinstance(child, Tag):
            if child.name in _RICH_TEXT_INLINE_TAGS:
                if child.name == "br":
                    parts.append("<br>")
                    continue
                attrs_str = ""
                if child.name == "a":
                    safe = _safe_href(child.get("href", ""))
                    if safe is not None:
                        # quote=True escapes both " and & so the attr value
                        # cannot break out of the surrounding href=" ... "
                        attrs_str = f' href="{escape(safe, quote=True)}"'
                inner = rich_text_content(child)
                parts.append(f"<{child.name}{attrs_str}>{inner}</{child.name}>")
            else:
                # Disallowed tag — strip to text content (recurse)
                parts.append(rich_text_content(child))
    result = "".join(parts).strip()
    if result:
        return result
    # D1109 — placeholder-as-content fallback: a node whose only visible text is
    # an <input placeholder="...">'s hint (a form field with no static label/value)
    # has genuinely no OTHER extractable content, so the walk above returns empty.
    # Treat the placeholder(s) as the node's literal text rather than silently
    # returning "" — that emptiness is exactly what the D244 conservation gate
    # (ContentConservationError) reads as "this leaf has nothing", even though the
    # draft visibly shows the placeholder hint text to a real user.
    return placeholder_fallback_text(node)


def placeholder_fallback_text(node: Tag) -> str:
    """Every descendant `<input placeholder="...">`'s hint text (or the node's
    own, when `node` IS the input), escaped and space-joined. `""` when none.

    Shared between `rich_text_content()`'s own fallback and the text-leaf gate
    in `extraction.py::_emit_content_leaf` (D1109) — the gate's "does this node
    have anything to lift" check and the actual lift must agree, or the gate
    passes a node the lift still returns empty for.
    """
    from html import escape
    inputs = [node] if getattr(node, "name", None) == "input" else node.find_all("input")
    placeholders = [
        escape(value, quote=False)
        for inp in inputs
        if (value := (inp.get("placeholder") or "").strip())
    ]
    return " ".join(placeholders)


# ---------------------------------------------------------------------------
# extract_star_count (convert.py:4081 — ported verbatim, renamed)
# ---------------------------------------------------------------------------

def extract_star_count(element: Tag) -> int:
    """Extract a 0..5 star count from a rating element.

    First tries the element's ``aria-label`` with a bounded ``\\b(\\d{1,2})\\b``
    regex (so 'aria-label="5 stars"' → 5); if no aria-label digit, counts ★/⭐
    glyph characters in the element text. Clamped to 0..5 and returned as int.
    """
    aria = element.get("aria-label", "")
    if aria:
        m = re.search(r"\b(\d{1,2})\b", aria)
        if m:
            return min(5, max(0, int(m.group(1))))
    text = element.get_text()
    glyphs = sum(1 for ch in text if ch in ("★", "⭐"))  # ★ ⭐
    return min(5, max(0, glyphs))


# ---------------------------------------------------------------------------
# Decimal-capable numbers (numeric-content role) -- the sibling of extract_star_count
# ---------------------------------------------------------------------------

# One number token: an optional sign, then EITHER digits grouped with thousands commas ('1,204') OR
# plain digits, then an optional decimal part. The grouped alternative comes first so '1,204 reviews'
# reads 1204, not 1. A comma is only ever a thousands separator here: a lone ',5' is not a number.
_NUMBER_RE = re.compile(r"-?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?")


def first_number(text: str) -> int | float | None:
    """The FIRST number in ``text``, or None when it holds none.

    Typed by how it was written, never guessed: a token with a decimal part ('4.7') is a ``float``;
    a whole token ('15', '1,204') is an ``int``. That is what lets one role fill both a review COUNT
    (``reviewCount: 15``) and a rating or score (``averageRating: 4.7``, ``ratingScale: 9.2``) with the
    right JSON type, where the previous ``float(...)`` turned every whole number into ``15.0``.
    """
    match = _NUMBER_RE.search(text or "")
    if match is None:
        return None
    token = match.group(0).replace(",", "")
    return float(token) if "." in token else int(token)


def extract_aria_number(element: Tag) -> int | float | None:
    """The first number in the element's ``aria-label``, decimal-capable, or None.

    The decimal-capable counterpart of the aria branch in ``extract_star_count``: that one matches
    ``\\b(\\d{1,2})\\b``, so ``aria-label="4.7 out of 5"`` reads 4 (the ``\\b`` sits between the 4 and the
    dot) and it clamps to an int 0..5, so it can never carry a decimal. This one reads ``4.7``. The value is
    returned VERBATIM: no clamp and no rescale by an ``out of N`` denominator, because the caller is a
    generic numeric role (a 0..5 rating, a 0..10 score and a 0..100 score all use it) and only the target
    attribute knows its own range. Deliberately does NOT fall back to counting star glyphs: a glyph run
    is decoration, and a decorated header such as five glyphs with a clipped overlay draws 4.7 as ten
    characters, which would read as a false 5.
    """
    aria = element.get("aria-label", "")
    if not isinstance(aria, str) or not aria:
        return None
    return first_number(aria)


# ---------------------------------------------------------------------------
# resolve_media_url (convert.py:143 — ported, _MEDIA_MAP global → parameter)
# ---------------------------------------------------------------------------

def resolve_media_url(src: str, media_map: dict) -> str:
    """Resolve a mockup src against a caller-supplied media-map.

    Ported from ``_resolve_media_url`` (convert.py:143). The module-global
    ``_MEDIA_MAP`` is replaced by an explicit ``media_map`` parameter so this
    module carries no global state — callers pass the map they loaded.

    Returns ``src`` unchanged on miss (empty src, empty map, or no basename hit).
    """
    if not src or not media_map:
        return src
    basename = src.split("?", 1)[0].rstrip("/").rsplit("/", 1)[-1]
    entry = media_map.get(basename)
    if entry and entry.get("url"):
        return entry["url"]
    return src


# ---------------------------------------------------------------------------
# is_decorative_img / first_content_img — a decorative <img> is never content
# ---------------------------------------------------------------------------

# Why this exists (measured, Eye Care draft, 2026-09-21): each of 13 review cards holds one
# ``<img src="assets/google-g.svg" alt="" aria-hidden="true" width="17">`` — the Google "G"
# source mark. The image-object lift took "the first <img> in the item" as the reviewer's
# ``photo``, so 13 reviews carried a dead relative URL as their photo.

DECORATIVE_IMG_REASON = "decorative image (aria-hidden) not lifted as content"

# WAI-ARIA / WAI decorative-images guidance: an image is decorative when the author HIDES it
# from the accessibility tree — ``aria-hidden="true"`` — or strips its semantics with
# ``role="presentation"`` / ``role="none"``. An empty ``alt`` on its own is deliberately NOT
# treated as decorative here: the draft convention is that ``alt=""`` without ``aria-hidden`` is
# an unlabelled CONTENT image (a real avatar or photo whose author left the alt off), and
# dropping it would lose a real photo. The author signal that survives is the explicit hide.
_DECORATIVE_IMG_ROLES = frozenset({"presentation", "none"})


def is_decorative_img(tag: object) -> bool:
    """True when ``tag`` is an ``<img>`` its author marked decorative.

    Decorative = ``aria-hidden="true"`` OR ``role="presentation"`` / ``role="none"``
    (WAI decorative-images guidance). Universal and draft-agnostic: it reads the element's own
    attributes and knows no block name, class or URL. A non-``<img>`` is never decorative.
    """
    if not isinstance(tag, Tag) or (tag.name or "").lower() != "img":
        return False
    if str(tag.get("aria-hidden", "") or "").strip().lower() == "true":
        return True
    return str(tag.get("role", "") or "").strip().lower() in _DECORATIVE_IMG_ROLES


def first_content_img(element: Tag) -> Tag | None:
    """The ``<img>`` an image-object lift should read for ``element``.

    ``element`` itself when it IS an ``<img>`` — it was bound explicitly (an atomic leaf block
    recognised on the image, or a BEM-classed image slot), so it is never second-guessed here.
    Otherwise the first NON-decorative ``<img>`` descendant: a decorative image found by
    searching inside a container is inferred, not bound, and must not become the container's
    content image. ``None`` when every descendant image is decorative or there is none.
    """
    if (element.name or "").lower() == "img":
        return element
    for img in element.find_all("img"):
        if isinstance(img, Tag) and not is_decorative_img(img):
            return img
    return None


def has_only_decorative_imgs(element: Tag) -> bool:
    """True when ``element`` holds at least one ``<img>`` descendant and every one is decorative."""
    imgs = [i for i in element.find_all("img") if isinstance(i, Tag)]
    return bool(imgs) and all(is_decorative_img(i) for i in imgs)


# ---------------------------------------------------------------------------
# scalar_media_from_img (convert.py:4098 — ported verbatim, renamed)
# ---------------------------------------------------------------------------

def scalar_media_from_img(img_node: Tag, media_map: dict) -> dict:
    """Build a scalar-media object value from a bare <img> element.

    Ported from ``_lift_scalar_media_from_img`` (convert.py:4098). ``media_map``
    is passed explicitly (no module global).

    Returns a dict matching the ``object``-typed schema that hero/slider attrs
    expect: ``{"url": ..., "id": 0, "alt": ...}``. The ``id`` is set to 0
    because no WP media-library id is available from the mockup HTML; the
    block's render.php renders the image from ``url`` + ``alt`` when ``id`` is 0.
    """
    return {
        "url": resolve_media_url(img_node.get("src", ""), media_map),
        "id": 0,
        "alt": img_node.get("alt", ""),
    }


# ---------------------------------------------------------------------------
# scalar_media_from_video — sibling of scalar_media_from_img for a <video>
# scalar-media column (2026-09-02, sgs/hero split-media video/svg tier widening).
# ---------------------------------------------------------------------------

def scalar_media_from_video(video_node: Tag, media_map: dict) -> dict:
    """Build a scalar-media object value from a bare <video> element.

    Mirrors ``scalar_media_from_img`` for the video media kind — same shape
    minus ``alt`` (a video has none). Reads ``src`` from the ``<video>`` tag
    itself; falls back to the first ``<source src>`` child when the tag has no
    ``src`` attribute of its own (both are valid HTML5 video-embedding shapes
    a hand-authored draft may use).

    Returns ``{"url": ..., "id": 0}`` — ``id`` is 0 for the same reason as
    ``scalar_media_from_img``: no WP media-library id is available from
    mockup HTML.
    """
    src = video_node.get("src", "") or ""
    if not src:
        source_el = video_node.find("source")
        if source_el is not None and isinstance(source_el, Tag):
            src = source_el.get("src", "") or ""
    return {
        "url": resolve_media_url(src, media_map),
        "id": 0,
    }


# ---------------------------------------------------------------------------
# svg_markup_from_node — raw <svg>...</svg> serialisation for a scalar-media
# column (2026-09-02). Mirrors the EXISTING role='svg' pattern in
# field_extractors.py (str(svg_el).strip()) rather than inventing a fresh
# sanitiser — render.php applies the same wp_kses() allowlist to every
# splitMediaSvgContent* tier at render time (see hero render.php + CLAUDE.md's
# "SVG art-direction tiers" note), so the converter never needs to sanitise.
# ---------------------------------------------------------------------------

def svg_markup_from_node(svg_node: Tag) -> str:
    """Serialise an <svg> element to its raw markup string, stripped.

    Returns "" when the node has no renderable markup (defensive — bs4 always
    round-trips a parsed Tag, so this is effectively unreachable in practice,
    but callers must not assume a non-empty result).
    """
    return str(svg_node).strip()
