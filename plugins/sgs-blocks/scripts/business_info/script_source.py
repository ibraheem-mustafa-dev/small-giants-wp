"""Source 1: the draft script's runtime data object (`key: 'value'` pairs in VOCABULARY)."""
from __future__ import annotations

from .shapes import resolve
from .vocabulary import LINK_SUFFIXES, VOCABULARY, ESCAPE_RE, PAIR_RE, SCRIPT_RE


def split_key(key: str) -> tuple[str, str | None] | None:
    """(vocabulary base, link suffix or None) for a data-object key, else None."""
    low = key.lower()
    if low in VOCABULARY:
        return low, None
    for suffix in LINK_SUFFIXES:
        if low.endswith(suffix) and low[: -len(suffix)] in VOCABULARY:
            return low[: -len(suffix)], suffix
    return None


def script_candidates(html: str) -> list[tuple[str, str, str | None, str]]:
    """Every vocabulary `key: 'value'` pair in script text: (key as written, base, suffix, value)."""
    found: list[tuple[str, str, str | None, str]] = []
    for script in SCRIPT_RE.findall(html):
        for m in PAIR_RE.finditer(script):
            split = split_key(m.group(1))
            if split:
                value = m.group(2) if m.group(2) is not None else m.group(3)
                found.append((m.group(1), split[0], split[1], ESCAPE_RE.sub(r"\1", value)))
    return found


def from_script(html: str) -> dict[str, str]:
    """Source 1. Per Site Info key the unsuffixed (display) key beats a link-suffixed one, then document order."""
    best: dict[str, tuple[tuple[int, int], dict[str, str]]] = {}
    for order, (_key, base, suffix, value) in enumerate(script_candidates(html)):
        site_key, shape = VOCABULARY[base]
        if site_key is None:
            continue
        res = resolve(shape, site_key, value)
        rank = (0 if suffix is None else 1, order)
        if res and (site_key not in best or rank < best[site_key][0]):
            best[site_key] = (rank, res)
    return {k: v for _rank, res in best.values() for k, v in res.items()}


def find_unmapped(html: str) -> dict[str, str]:
    """Data-object keys that are known but have no Site Info key (e.g. mapHref): {key as written: value}."""
    out: dict[str, str] = {}
    for key, base, _suffix, value in script_candidates(html):
        site_key, shape = VOCABULARY[base]
        if site_key is None and resolve(shape, None, value):
            out.setdefault(key, " ".join(value.split()))
    return out
