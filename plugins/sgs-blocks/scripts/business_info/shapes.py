"""Shape validation: a value is kept only if it LOOKS like the field it claims to be."""
from __future__ import annotations

import html
import re
from urllib.parse import urlparse

from .vocabulary import (
    DAYS, GOOGLE_HOSTS, SOCIAL_DOMAINS,
    EMAIL_SHAPE_RE, HOURS_RE, PHONE_SHAPE_RE, POSTCODE_RE,
)


def network_for_host(host: str) -> str | None:
    """Network key for a host, matching the host itself or a sub-domain of a known domain."""
    host = host.lower()
    host = host[4:] if host.startswith("www.") else host
    if any(host == g or host.endswith("." + g) for g in GOOGLE_HOSTS):
        return "google"
    for domain, key in SOCIAL_DOMAINS.items():
        if host == domain or host.endswith("." + domain):
            return key
    return None


def hours_fields(text: str) -> dict[str, str]:
    """`Mon-Sat 9.30-17.30` style ranges -> {opening_hours.<day>: range}; first range per day wins."""
    out: dict[str, str] = {}
    for m in HOURS_RE.finditer(text):
        start = DAYS.index(m.group(1).lower())
        end = DAYS.index(m.group(2).lower()) if m.group(2) else start
        for day in DAYS[start:end + 1]:
            out.setdefault(f"opening_hours.{day}", m.group(3).strip())
    return out


BR_RE = re.compile(r"<\s*br\s*/?\s*>|[\r\n]+", re.IGNORECASE)
TAG_RE = re.compile(r"<[^>]*>")


def has_binding(value: str) -> bool:
    """True if the text carries a template binding half (`{{` or `}}`): never a stored value."""
    return "{{" in value or "}}" in value


def plain_address(raw: str) -> str:
    """Address text from a script string: line breaks become ', ', tags are stripped, entities decoded."""
    text = html.unescape(TAG_RE.sub(" ", BR_RE.sub(", ", raw)))
    text = " ".join(text.split())
    return re.sub(r"\s+,", ",", re.sub(r"(?:,\s*)+,", ",", text)).strip(" ,")


def resolve(shape: str, site_key: str | None, raw: str) -> dict[str, str]:
    """Validate `raw` by SHAPE. Returns {site_info_key: value} (hours expand to several), or {}.

    A `url` shape with no Site Info key returns {"": value}: the caller records it as unmapped.
    """
    value = plain_address(raw) if shape == "address" else " ".join(raw.split())
    if not value or has_binding(value):
        return {}
    if shape == "phone":
        value = re.sub(r"^tel:", "", value, flags=re.IGNORECASE).strip()
        digits = re.sub(r"\D", "", value)
        ok = PHONE_SHAPE_RE.fullmatch(value) and 7 <= len(digits) <= 15
        return {site_key: value} if ok and site_key else {}
    if shape == "email":
        value = re.sub(r"^mailto:", "", value, flags=re.IGNORECASE).split("?")[0].strip()
        return {site_key: value} if site_key and EMAIL_SHAPE_RE.match(value) else {}
    if shape == "address":
        plausible = POSTCODE_RE.search(value) or len(value.split()) >= 3
        clean = "@" not in value and "://" not in value and len(value) <= 200
        return {site_key: value} if site_key and plausible and clean else {}
    if shape == "hours":
        return hours_fields(value)
    parsed = urlparse(value)
    if parsed.scheme.lower() != "https" or not parsed.netloc:
        return {}
    if shape == "url":
        return {"": value}
    network = network_for_host(parsed.netloc)
    return {site_key: value} if site_key and network == site_key.split(".", 1)[1] else {}
