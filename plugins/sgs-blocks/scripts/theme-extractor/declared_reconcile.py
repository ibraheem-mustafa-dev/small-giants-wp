"""Spec 33 declared design checked against the RENDERED page (FR-33-1: computed wins).

A README states what the designer meant; the browser shows what the page paints. Two reconciliations
run on the README-mapped palette before it is laid over the base palette:

* ``apply_computed``: the README colour for ``surface`` and ``text`` is compared with the computed
  content background and body text; a difference above ``COMPUTED_WINS_DELTA_E`` means the computed
  colour wins and the trace records both;
* ``apply_measured_primary``: ``primary`` and ``primary-text`` come from the measured primary button
  (the one ``presets.build_button_presets`` picks) whenever there is one, not from a README word.

Nothing here names a client.
"""
from __future__ import annotations

import colour
import presets
from palette_vocab import COMPUTED_WINS_DELTA_E, trace_row


def _opaque_hex(value) -> str | None:
    parsed = colour.parse_colour(value) if isinstance(value, str) else None
    return parsed.hex.upper() if parsed and parsed.alpha >= 0.999 else None


def _visible_hex(value) -> str | None:
    """``#RRGGBB`` of any colour that paints at all (alpha ignored, as ``extract._hex`` does)."""
    parsed = colour.parse_colour(value) if isinstance(value, str) else None
    return parsed.hex.upper() if parsed and parsed.alpha > 0.001 else None


def content_background(facts: dict) -> str | None:
    """The widest content-containing section's opaque background, else the body's.

    Mirrors ``extract._theme_background`` (FR-33-6) minus its trace: a preview-shell wrapper and what
    encloses it are excluded, the widest remaining content region wins. ``extract`` imports this
    package, so it cannot be imported back from here without a cycle.
    """
    sections = facts.get("sections") or []
    markers = [m["path"] for m in (facts.get("previewShellMarkers") or []) if isinstance(m, dict) and m.get("path")]

    def shell_or_ancestor(path: str) -> bool:
        return any(path == mp or mp.startswith(path + ">") for mp in markers)

    cands = [s for s in sections if (s.get("hasParagraph") or s.get("hasHeading")) and not s.get("inChrome")
             and _visible_hex(s.get("backgroundColor", "")) and not shell_or_ancestor(s.get("path", ""))]
    cands.sort(key=lambda s: -(s.get("area") or 0))
    if cands:
        return _visible_hex(cands[0]["backgroundColor"])
    return _visible_hex((facts.get("body") or {}).get("backgroundColor", ""))


def apply_computed(assigned: dict[str, str], facts: dict, trace: list) -> None:
    """Replace README-mapped ``surface`` / ``text`` colours that the rendered page contradicts."""
    computed = {"surface": content_background(facts),
                "text": _visible_hex((facts.get("body") or {}).get("color", ""))}
    for slug in sorted(computed):
        declared, rendered = assigned.get(slug), computed[slug]
        if declared is None or rendered is None:
            continue
        distance = colour.delta_e(declared, rendered)
        if distance <= COMPUTED_WINS_DELTA_E:
            continue
        assigned[slug] = rendered
        trace_row(trace, "reconcile", f"palette.{slug}",
                  f"README declares {declared}, the rendered page computes {rendered} "
                  f"(colour distance {distance:.1f}): the computed value wins (FR-33-1)", rendered,
                  declared=declared, computed=rendered)


def _exclusion_palette(snap: dict, assigned: dict[str, str]) -> list[dict]:
    """Brand and status slugs with their final colours, so their buttons never become the primary."""
    palette = ((snap.get("settings") or {}).get("color") or {}).get("palette") or []
    base = {e.get("slug"): e.get("color") for e in palette}
    return [{"slug": s, "color": assigned.get(s) or base[s]}
            for s in presets.NON_VARIANT_SLUGS if assigned.get(s) or base.get(s)]


def measured_primary(snap: dict, assigned: dict[str, str], facts: dict) -> tuple[str, str | None] | None:
    """(background, text) of the measured primary button when it paints an opaque background."""
    found = presets.build_button_presets(facts, [], _exclusion_palette(snap, assigned)).get("primary") or {}
    background, text = _opaque_hex(found.get("background")), _opaque_hex(found.get("text"))
    return (background, text) if background else None


def apply_measured_primary(snap: dict, assigned: dict[str, str], facts: dict, trace: list) -> None:
    """``primary`` / ``primary-text`` from the measured primary button, ahead of any README phrase."""
    measured = measured_primary(snap, assigned, facts)
    if measured is None:
        return
    for slug, value, part in (("primary", measured[0], "background"), ("primary-text", measured[1], "text")):
        if value is None:
            continue
        previous = assigned.get(slug)
        assigned[slug] = value
        trace_row(trace, "reconcile" if previous and previous != value else "declared", f"palette.{slug}",
                  f"measured primary button {part}" + (f" (README phrase mapping gave {previous})"
                                                       if previous and previous != value else ""), value)
