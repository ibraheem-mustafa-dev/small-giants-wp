"""template_binding -- refuse to lift a style value that is an unresolved template binding.

WHY THIS FILE EXISTS
--------------------
A Claude Design draft is a classless prototype whose runtime resolves style
values such as ``padding: {{ secPad }}`` / ``font-size: {{ h2 }}`` /
``grid-template-columns: {{ twoColWide }}`` when the page renders. The static
HTML the converter reads still carries the raw ``{{ ... }}`` text. Read
verbatim, that text becomes junk in a block attribute:

- a box shorthand is tokenised on whitespace, so ``padding: {{ secPad }}``
  becomes the four sides ``{"top": "{{", "right": "secPad", "bottom": "}}", ...}``;
- a length/keyword value is passed through as ``{"desktop": "{{ twoColWide }}"}``;
- a value that looks like a design token is snapped to a preset that does not
  exist (``font-size: {{ h2 }}`` -> ``var(--wp--preset--font-size--h2)``), so the
  heading renders at the browser default instead of its real size.

THE RULE
--------
A declaration whose value contains ``{{`` or ``}}`` is not a value. It is
dropped whole at the point the declaration is first read (before it is
tokenised into box sides, split, or snapped to a token) and recorded as a
tracked gap through the existing content-gap channel
(``content_gap_collector``), never silently.

Universal: no per-block, per-property or per-client carve-out and no list of
binding names -- the test is the presence of the template delimiters. A draft
with no delimiter in any style value is passed through untouched. Only STYLE
declarations are filtered here; text/content nodes are a different problem and
are never read by this module.
"""
from __future__ import annotations

from typing import Any

from converter.services import content_gap_collector

_BINDING_MARKERS: tuple[str, ...] = ("{{", "}}")

GAP_REASON = "unresolved template binding"


def has_unresolved_binding(value: object) -> bool:
    """True when ``value`` is a string carrying a ``{{`` or ``}}`` delimiter."""
    return isinstance(value, str) and any(m in value for m in _BINDING_MARKERS)


def element_path(node: Any, max_depth: int = 4) -> str:
    """A short, stable ``ancestor > ... > tag.class:nth-of-type(n)`` label for ``node``.

    Classless drafts give the element no BEM identity, so the label is built from
    tag names, any classes, and the position among same-tag siblings.
    """
    parts: list[str] = []
    cur = node
    while cur is not None and getattr(cur, "name", None) and cur.name != "[document]":
        if len(parts) >= max_depth:
            break
        label = str(cur.name)
        classes = cur.get("class") or []
        if classes:
            label += "." + ".".join(classes)
        try:
            index = len(cur.find_previous_siblings(cur.name)) + 1
        except Exception:  # noqa: BLE001 -- a label must never break conversion
            index = 1
        parts.append(f"{label}:nth-of-type({index})")
        cur = cur.parent
    return " > ".join(reversed(parts)) or str(getattr(node, "name", "") or "element")


def drop_unresolved_bindings(decls: dict[str, str], node: Any) -> dict[str, str]:
    """Return ``decls`` without any declaration whose value is an unresolved binding.

    Each dropped declaration is recorded as a gap naming the element, the CSS
    property and the raw value. When nothing is dropped the SAME mapping is
    returned unchanged (byte-identical behaviour for a draft with no binding).
    """
    if not any(has_unresolved_binding(v) for v in decls.values()):
        return decls
    kept: dict[str, str] = {}
    path = ""
    for prop, val in decls.items():
        if has_unresolved_binding(val):
            path = path or element_path(node)
            content_gap_collector.record_declaration_gap(
                element=path, prop=prop, value=val, reason=GAP_REASON,
            )
            continue
        kept[prop] = val
    return kept
