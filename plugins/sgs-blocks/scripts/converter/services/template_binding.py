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

RESOLVING INSTEAD OF DROPPING (D1132, plan step A1)
---------------------------------------------------
When the orchestrator has evaluated the draft's own script for the three device
tiers (``orchestrator/script_bindings.py``), it hands the converter a map
``{binding name: {mobile, tablet, desktop, intra_tier}}`` through
``configure_tier_bindings``. A declaration whose bindings are ALL in that map is
then not dropped: ``resolve_binding_declarations`` substitutes each ``{{ name }}``
with its per-device text and returns the desktop text as the value plus the
tablet / mobile texts as per-tier overrides. The caller
(``styling_helpers.collect_css_decls_for_element``) applies those overrides after
its ``@media`` fold, because the draft's own inline style outranks any stylesheet
rule. Any name NOT in the map is dropped and gapped exactly as before. With no
map configured (every static or BEM draft) behaviour is byte-identical to the
guard alone.
"""
from __future__ import annotations

import re
from typing import Any

from converter.services import content_gap_collector

_BINDING_MARKERS: tuple[str, ...] = ("{{", "}}")

GAP_REASON = "unresolved template binding"
INTRA_TIER_GAP_REASON = "draft breakpoint inside a device tier"

_NAME_RE = re.compile(r"\{\{\s*([A-Za-z_$][\w$]*)\s*\}\}")
_TIERS: tuple[str, ...] = ("desktop", "tablet", "mobile")

# {binding name: {"mobile": v, "tablet": v, "desktop": v, "intra_tier": {...}}} for the run in progress.
_TIER_BINDINGS: dict[str, dict[str, Any]] = {}


def configure_tier_bindings(bindings: dict[str, dict[str, Any]] | None) -> None:
    """Install (or, with ``None``/empty, clear) the per-device values for the run in progress."""
    _TIER_BINDINGS.clear()
    if bindings:
        _TIER_BINDINGS.update(bindings)


def reset_tier_bindings() -> None:
    _TIER_BINDINGS.clear()


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


def _text(value: Any) -> str | None:
    """A per-device value as CSS text, or None when it is not something a declaration can carry."""
    if isinstance(value, bool) or value is None:
        return None
    if isinstance(value, (int, float)):
        return ("%g" % value)
    return value if isinstance(value, str) and value.strip() and not has_unresolved_binding(value) else None


def _resolve_one(value: str) -> dict[str, str] | None:
    """``{tier: css text}`` when every binding in ``value`` is in the configured map, else None."""
    names = _NAME_RE.findall(value)
    if not names or any(n not in _TIER_BINDINGS for n in names):
        return None
    out: dict[str, str] = {}
    for tier in _TIERS:
        text = value
        for name in names:
            piece = _text(_TIER_BINDINGS[name].get(tier))
            if piece is None:
                return None
            text = re.sub(r"\{\{\s*" + re.escape(name) + r"\s*\}\}", lambda _m, p=piece: p, text)
        if has_unresolved_binding(text):
            return None
        out[tier] = text
    return out


def resolve_binding_declarations(decls: dict[str, str], node: Any) -> tuple[dict[str, str], dict[str, dict[str, str]]]:
    """Resolve what the configured map can, drop and gap the rest.

    Returns ``(decls, tier_overrides)``. ``decls`` carries the DESKTOP text for every resolved
    declaration (the SGS base tier) and is otherwise ``drop_unresolved_bindings`` of the input.
    ``tier_overrides`` is ``{"desktop"|"tablet"|"mobile": {prop: text}}``: the per-device text for
    every resolved declaration, for the caller to apply as an inline-strength layer. A binding whose
    draft breakpoint still falls inside a device tier is resolved AND recorded as a gap naming the
    band, so the sliver the three tiers cannot express is never silent.
    """
    if not _TIER_BINDINGS or not any(has_unresolved_binding(v) for v in decls.values()):
        return drop_unresolved_bindings(decls, node), {}
    resolved: dict[str, dict[str, str]] = {}
    remaining: dict[str, str] = {}
    for prop, val in decls.items():
        tiers = _resolve_one(val) if has_unresolved_binding(val) else None
        if tiers is None:
            remaining[prop] = val
            continue
        resolved[prop] = tiers
        _record_intra_tier_gaps(node, prop, val)
    out = drop_unresolved_bindings(remaining, node)
    overrides: dict[str, dict[str, str]] = {}
    for prop, tiers in resolved.items():
        out[prop] = tiers["desktop"]
        for tier in _TIERS:
            overrides.setdefault(tier, {})[prop] = tiers[tier]
    return out, overrides


def _record_intra_tier_gaps(node: Any, prop: str, value: str) -> None:
    for name in _NAME_RE.findall(value):
        bands = (_TIER_BINDINGS.get(name) or {}).get("intra_tier") or {}
        for tier, runs in bands.items():
            for run in runs[1:] if isinstance(runs, list) else []:
                content_gap_collector.record_declaration_gap(
                    element=element_path(node), prop=prop, value=value,
                    reason="%s: %s from %s (draft value %s)" % (INTRA_TIER_GAP_REASON, tier, run.get("from"), run.get("value")),
                )
