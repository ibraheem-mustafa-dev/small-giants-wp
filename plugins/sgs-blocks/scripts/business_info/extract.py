"""Extraction of high-confidence business-details fields from a draft's HTML.

Precedence per key: script data object > labelled text > literal links/text.
"""
from __future__ import annotations

import re
from urllib.parse import urlparse

from bs4 import BeautifulSoup, Comment, Tag

from .label_context import label_is_usable
from .script_source import from_script
from .shapes import has_binding, resolve
from .vocabulary import (
    LABEL_MAX_CHARS, LABELS, SOCIAL_DOMAINS,
    COPYRIGHT_RE, EMAIL_SHAPE_RE, HREF_RE, MAILTO_RE, TEL_RE,
)


def extract_literal(html: str) -> dict[str, str]:
    """Source 3: literal mailto:/tel:/href=/copyright text (the original extractor)."""
    fields: dict[str, str] = {}

    # email — first mailto:
    m = MAILTO_RE.search(html)
    if m:
        email = m.group(1).strip().rstrip(".,;")
        if EMAIL_SHAPE_RE.match(email) and not has_binding(email):
            fields["email"] = email

    # phone — first tel:
    m = TEL_RE.search(html)
    if m:
        phone = m.group(1).strip()
        # keep digits, spaces, +, -, (, ) — reject anything else as noise
        if re.fullmatch(r"[0-9+\-\s().]{6,20}", phone) and not has_binding(phone):
            fields["phone"] = phone

    # socials — first real URL per known network (skip '#'/relative/empty)
    for raw_href in HREF_RE.findall(html):
        href = raw_href.strip()
        if not href or href.startswith("#") or href.lower().startswith(("mailto:", "tel:")):
            continue
        parsed = urlparse(href)
        host = (parsed.netloc or "").lower()
        if parsed.scheme.lower() not in ("http", "https") or not host or has_binding(href):
            continue
        host = host[4:] if host.startswith("www.") else host
        for domain, key in SOCIAL_DOMAINS.items():
            social_key = f"socials.{key}"
            if domain in host and social_key not in fields:
                fields[social_key] = href
                break

    # copyright — text of the © line, prefixed with © for a clean stored value
    m = COPYRIGHT_RE.search(html)
    if m:
        tail = m.group(1).strip()
        if tail and not has_binding(tail):
            fields["copyright"] = f"© {tail}"

    return fields


# --- source 2: labelled page text ---------------------------------------------

def _sibling_lines(tag: Tag) -> list[str]:
    """Text following `tag` inside its parent, split at <br>, whitespace-collapsed, blanks dropped."""
    lines = [""]
    for sib in tag.next_siblings:
        if isinstance(sib, Comment):
            continue
        if isinstance(sib, Tag) and sib.name == "br":
            lines.append("")
            continue
        text = " ".join((sib.get_text(" ", strip=True) if isinstance(sib, Tag) else str(sib)).split())
        if text:
            lines[-1] = f"{lines[-1]} {text}".strip()
    return [ln for ln in lines if ln]


def _from_labels(html: str) -> dict[str, str]:
    """Source 2. An element whose OWN text is exactly a LABELS entry, then the value that follows it."""
    soup = BeautifulSoup(html, "html.parser")
    out: dict[str, str] = {}
    done: set[str] = set()
    for tag in soup.find_all(True):
        own = "".join(s for s in tag.find_all(string=True, recursive=False) if not isinstance(s, Comment))
        own = " ".join(own.split()).rstrip(":").strip().lower()
        if not own or own not in LABELS:
            continue
        # The element as a whole (not just its own text) must be label-sized: a wrapper holding the
        # value inside a child is not a label.
        if len(tag.get_text(" ", strip=True)) > LABEL_MAX_CHARS or not label_is_usable(tag):
            continue
        site_key, shape = LABELS[own]
        if site_key in done:
            continue
        lines = _sibling_lines(tag)
        if not lines:
            continue
        # An address may span <br> lines (joined); everything else uses the first line only, so
        # trailing prose after a line break ("Collections by arrangement") is ignored.
        res = resolve(shape, site_key, ", ".join(lines) if shape == "address" else lines[0])
        if res:
            out.update(res)
            done.add(site_key)
    return out


def extract_business_info(html: str) -> dict[str, str]:
    """Return {site_info_key: value} for every high-confidence field found.

    Precedence per key: script data object > labelled text > literal links/text.
    """
    return {**extract_literal(html), **_from_labels(html), **from_script(html)}
