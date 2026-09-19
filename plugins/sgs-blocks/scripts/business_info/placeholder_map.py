"""The placeholder map: which `{{ binding }}` in a draft template resolves to which Site Info key."""
from __future__ import annotations

from .script_source import script_candidates
from .shapes import resolve
from .vocabulary import VOCABULARY, BINDING_RE


def build_placeholder_map(html: str) -> dict[str, dict[str, str | None]]:
    """Map each template `{{ binding }}` that resolves (last path segment) to a data-object key.

    {"{{ phone }}": {"key": "phone", "as": "text"}, "{{ phoneHref }}": {"key": "phone", "as": "tel-href"}, ...}
    Known keys with no Site Info equivalent map to {"key": None, ...}. Only keys whose data-object
    value passes its shape check are listed.
    """
    known: dict[str, tuple[str | None, str, str | None]] = {}
    for key, base, suffix, value in script_candidates(html):
        site_key, shape = VOCABULARY[base]
        if resolve(shape, site_key, value):
            known.setdefault(key.lower(), (site_key, shape, suffix))
    cut = html.find('<script type="text/x-dc"')
    if cut < 0:
        cut = html.lower().find("<script")
    template = html if cut < 0 else html[:cut]
    out: dict[str, dict[str, str | None]] = {}
    for m in BINDING_RE.finditer(template):
        expr = " ".join(m.group(1).split())
        entry = known.get(expr.split(".")[-1].lower())
        if entry:
            site_key, shape, suffix = entry
            if suffix:
                kind = {"phone": "tel-href", "email": "mailto-href"}.get(shape, "url")
            else:
                kind = "url" if shape in ("social", "url") else "text"
            out["{{ " + expr + " }}"] = {"key": site_key, "as": kind}
    return out
