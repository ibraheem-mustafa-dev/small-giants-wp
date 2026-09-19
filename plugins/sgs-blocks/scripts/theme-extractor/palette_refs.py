"""Spec 33: route palette colours into buttons and the page base.

Two small helpers that consume the finished site palette: a hex -> slug lookup (used for the base
page background and text) and the rewrite of MEASURED button preset hex values into palette variable
references. Vocabulary is DATA at the top of the module; nothing here names a client.
"""
from __future__ import annotations

from declared_sources import HEX_RE, normalise_hex

# Slug preference when one hex serves several slugs (page background and body text resolve here).
PAGE_SLUG_PREFERENCE = ("surface", "surface-alt", "text")
# Button preset keys -> role group, and each group's slug preference.
BUTTON_KEY_GROUP = {"background": "fill", "hover-background": "fill", "text": "text",
                    "hover-text": "text", "border": "edge", "hover-border": "edge"}
BUTTON_SLUG_PREFERENCE = {"fill": ("primary", "accent", "surface", "surface-alt"),
                          "text": ("primary-text", "text", "text-inverse"),
                          "edge": ("primary", "border", "accent")}


def slug_by_hex(palette: list) -> dict[str, str]:
    """hex (lower-case) -> slug; when several slugs share a hex, page background and body text win."""
    hexes = {e["slug"]: e["color"].lower() for e in palette
             if isinstance(e.get("color"), str) and e["color"].startswith("#")}
    mapping = {colour: slug for slug, colour in hexes.items()}
    mapping.update({hexes[slug]: slug for slug in PAGE_SLUG_PREFERENCE if slug in hexes})
    return mapping


def tokenise_button_presets(snap: dict, trace: list, derived: dict) -> None:
    """Rewrite MEASURED button preset hex values that equal a palette colour into palette variable refs.

    ``derived`` is the button-preset dict measured in this run (slot -> key -> value). Only those slots
    and keys are rewritten: a value that came from the framework baseline for a slot or key the draft
    never measured is not the draft's colour, so it stays exactly as the baseline has it.
    """
    settings = snap.get("settings", {})
    palette = settings.get("color", {}).get("palette", [])
    by_slug = {e["slug"]: str(e.get("color", "")).lower() for e in palette}
    presets = settings.get("custom", {}).get("buttonPresets") or {}
    for slot, measured in sorted(derived.items()):
        preset = presets.get(slot)
        if not isinstance(preset, dict):
            continue
        changed = []
        for key in sorted(measured):
            value = preset.get(key)
            group = BUTTON_KEY_GROUP.get(key)
            if group is None or not isinstance(value, str) or not HEX_RE.fullmatch(value):
                continue
            wanted = normalise_hex(value).lower()
            slug = (next((s for s in BUTTON_SLUG_PREFERENCE[group] if by_slug.get(s) == wanted), None)
                    or next((e["slug"] for e in palette if by_slug[e["slug"]] == wanted), None))
            if slug:
                preset[key] = f"var(--wp--preset--color--{slug})"
                changed.append(f"{key}={slug}")
        if changed:
            trace.append({"kind": "overlay", "what": f"buttonPresets.{slot}", "value": ",".join(changed),
                          "reason": "preset hex values that equal a palette colour now reference it"})
