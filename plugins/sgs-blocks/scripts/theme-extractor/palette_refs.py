"""Spec 33: route palette colours into buttons and the page base.

Two small helpers that consume the finished site palette: a hex -> slug lookup (used for the base
page background and text) and the rewrite of MEASURED button preset hex values into palette variable
references. Vocabulary is DATA at the top of the module; nothing here names a client.
"""
from __future__ import annotations

from declared_sources import HEX_RE, normalise_hex

# The slugs whose job each page role is, in preference order, when one hex serves several slugs.
PAGE_BACKGROUND_SLUGS = ("surface", "surface-alt")
PAGE_TEXT_SLUGS = ("text",)
# Button preset keys -> role group, and each group's slug preference.
BUTTON_KEY_GROUP = {"background": "fill", "hover-background": "fill", "text": "text",
                    "hover-text": "text", "border": "edge", "hover-border": "edge"}
BUTTON_SLUG_PREFERENCE = {"fill": ("primary", "accent", "surface", "surface-alt"),
                          "text": ("primary-text", "text", "text-inverse"),
                          "edge": ("primary", "border", "accent", "primary-text", "text")}


def slug_for_role(palette: list, hexv: str | None, preference: tuple) -> str | None:
    """The slug a page role references for ``hexv``: the first slug of ``preference`` (the slugs whose job the
    role is) holding that hex, else the first palette slug holding it in palette order; None when none does."""
    if not hexv:
        return None
    wanted = hexv.lower()
    held = [e["slug"] for e in palette
            if isinstance(e.get("color"), str) and e["color"].startswith("#") and e["color"].lower() == wanted]
    return next((s for s in preference if s in held), held[0] if held else None)


def tokenise_button_presets(snap: dict, trace: list, derived: dict) -> None:
    """Rewrite MEASURED button preset hex values that equal the colour of a slug fit for the key (its group's
    ``BUTTON_SLUG_PREFERENCE``) into that slug's variable reference; any other hex stays as measured.

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
            # Only a slug whose job fits the key: a fill never references a text slug that merely shares its hex.
            slug = next((s for s in BUTTON_SLUG_PREFERENCE[group] if by_slug.get(s) == wanted), None)
            if slug:
                preset[key] = f"var(--wp--preset--color--{slug})"
                changed.append(f"{key}={slug}")
        if changed:
            trace.append({"kind": "overlay", "what": f"buttonPresets.{slot}", "value": ",".join(changed),
                          "reason": "preset hex values that equal a palette colour now reference it"})
