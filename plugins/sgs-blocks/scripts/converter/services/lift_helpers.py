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
    return "".join(parts).strip()


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
