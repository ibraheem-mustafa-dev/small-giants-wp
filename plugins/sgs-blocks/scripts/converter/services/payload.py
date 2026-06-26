"""payload — content-payload extractor for Stage 3 scalar-content-lift.

Design ref: `.claude/plans/2026-06-26-stage3-child-shape-fork-design.md` §1
(the extract_payload 6-role table).

Given a parsed bs4 node and a content-bearing role, returns the content string
to lift, or "" if the node is empty or unrecognisable.  The CALLER decides
whether "" is a gap — this function never gaps.

Pure function: no DB, no I/O, no block-name or slot literals.
"""
from __future__ import annotations

import html
import re
from typing import Any

# Inline tags whose markup we preserve verbatim (with restrictions).
_INLINE_ALLOWLIST = {"strong", "em", "b", "i", "br", "a"}

# Unicode "filled star" characters used for rating glyphs.
_FILLED_STAR_CHARS = {"★", "★"}  # BLACK STAR variants


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def extract_payload(node: Any, role: str) -> str:
    """Return the content string for *node* under *role*, or "" if empty/unknown.

    Roles (the live _content_bearing_roles() set):
      text-content, content, identity  → inner markup with inline-tag allowlist
      image-object                     → media src URL
      link-href                        → href of nearest <a>
      rating                           → numeric rating as a string
      <anything else>                  → ""
    """
    if node is None or not hasattr(node, "get"):
        return ""

    if role in {"text-content", "content", "identity"}:
        return _extract_inline_text(node)
    if role == "image-object":
        return _extract_media_src(node)
    if role == "link-href":
        return _extract_href(node)
    if role == "rating":
        return _extract_rating(node)
    return ""


# ---------------------------------------------------------------------------
# Role handlers
# ---------------------------------------------------------------------------


def _extract_inline_text(node: Any) -> str:
    """Inner content preserving {strong, em, b, i, br, a} — strip other tags.

    For <a> only the href attribute is kept; all other attributes are dropped on
    all tags.  Text nodes are html.unescape'd at append time so &amp; → & in
    body copy, while the assembled markup (including escaped <a href="...">
    attributes) is returned intact — no double-pass unescape that would break
    href values containing & or ".
    """
    # Quick empty guard — avoid returning whitespace-only strings.
    if not node.get_text(strip=True):
        return ""

    parts: list[str] = []
    _walk_inline(node, parts)
    result = "".join(parts).strip()
    return result if result else ""


def _walk_inline(node: Any, parts: list[str]) -> None:
    """Recursively walk *node*'s children, accumulating allowed markup."""
    from bs4 import NavigableString, Tag  # local import — bs4 is a runtime dep

    for child in node.children:
        if isinstance(child, NavigableString):
            parts.append(html.unescape(str(child)))
        elif isinstance(child, Tag):
            tag = child.name.lower() if child.name else ""
            if tag in _INLINE_ALLOWLIST:
                if tag == "br":
                    parts.append("<br>")
                elif tag == "a":
                    href = child.get("href", "")
                    if href:
                        parts.append(f'<a href="{html.escape(href, quote=True)}">')
                    else:
                        parts.append("<a>")
                    _walk_inline(child, parts)
                    parts.append("</a>")
                else:
                    parts.append(f"<{tag}>")
                    _walk_inline(child, parts)
                    parts.append(f"</{tag}>")
            else:
                # Strip the tag — keep only its text recursively.
                _walk_inline(child, parts)


def _extract_media_src(node: Any) -> str:
    """Return the src of the nearest <img> or <video>/<source> (node or descendant)."""
    from bs4 import Tag  # local import

    def _src_from(el: Any) -> str:
        if not isinstance(el, Tag):
            return ""
        name = (el.name or "").lower()
        if name == "img":
            return el.get("src", "") or ""
        if name == "video":
            src = el.get("src", "")
            if src:
                return src
            source = el.find("source")
            if source:
                return source.get("src", "") or ""
        return ""

    # Try the node itself first.
    direct = _src_from(node)
    if direct:
        return direct

    # Walk descendants: prefer img, fall back to video.
    img = node.find("img")
    if img:
        return img.get("src", "") or ""

    video = node.find("video")
    if video:
        vsrc = video.get("src", "")
        if vsrc:
            return vsrc
        source = video.find("source")
        if source:
            return source.get("src", "") or ""

    return ""


def _extract_href(node: Any) -> str:
    """Return the href of *node* if it is an <a>, or its first descendant <a>."""
    name = (getattr(node, "name", "") or "").lower()
    if name == "a":
        return node.get("href", "") or ""
    a_tag = node.find("a")
    if a_tag:
        return a_tag.get("href", "") or ""
    return ""


def _extract_rating(node: Any) -> str:
    """Return a numeric rating signal as a string, or "" if none found.

    Priority:
      1. aria-label or title containing a number (e.g. "4.5 out of 5").
      2. Count of filled-star glyphs (★ / unicode stars / .filled/.active elements).
      3. First number extracted from the text.
    """
    # 1 — aria-label / title on the node itself or any descendant.
    for attr in ("aria-label", "title"):
        val = node.get(attr, "")
        if val:
            m = re.search(r"\d+(?:\.\d+)?", val)
            if m:
                return m.group(0)
        # Also check descendants.
        for el in node.find_all(attrs={attr: True}):
            v = el.get(attr, "")
            if v:
                m = re.search(r"\d+(?:\.\d+)?", v)
                if m:
                    return m.group(0)

    # 2 — Count filled star glyphs.
    text = node.get_text("")
    filled_count = sum(text.count(c) for c in _FILLED_STAR_CHARS)
    if filled_count:
        return str(filled_count)

    # Filled/active CSS class elements.
    from bs4 import Tag  # local import

    class_filled = node.find_all(
        lambda el: isinstance(el, Tag)
        and bool(
            set(el.get("class", [])) & {"filled", "active", "star--filled", "star--active"}
        ),
    )
    if class_filled:
        return str(len(class_filled))

    # 3 — First number from node text.
    m = re.search(r"\d+(?:\.\d+)?", node.get_text(" "))
    if m:
        return m.group(0)

    return ""
