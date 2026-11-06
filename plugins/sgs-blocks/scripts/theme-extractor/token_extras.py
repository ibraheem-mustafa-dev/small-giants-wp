"""token_extras.py: three draft token groups the other passes leave out of a snapshot (Spec 32 FR-32-18, FR-32-26a).

  * SHADOW ROLES: a literal ``--shadow-<role>`` (or ``--<role>-shadow``) token becomes the ``settings.shadow.presets`` entry
    whose slug is the role (``--shadow-card`` -> ``card``, printed as ``--wp--preset--shadow--card``). The framework's own
    presets stay; only a slug the draft names is replaced.
  * SELECTION: a ``--selection-bg`` / ``--selection-fg`` pair (any ``selection`` token naming a background or a text
    colour) becomes ``settings.custom.selection.background`` and ``.colour``, read by ``theme/sgs-theme/inc/selection.php``
    and ``assets/css/selection.css``. A value equal to a palette entry is written as that preset's variable. Only a
    complete pair is written.
  * ALT COLOURS: a hex the README's colour bullets list that no palette entry holds (within delta E 1) and the draft's code
    uses becomes a ``custom-<hex>`` palette entry. A bullet naming a registry brand, and any registry brand colour,
    takes no entry: the brand's own block paints it.

A draft with none of these changes nothing. Nothing here names a client.
"""
from __future__ import annotations

import pathlib
import re

from colour import delta_e, parse_colour
from palette_vocab import brand_colours, brand_row_pattern, trace_row
import token_families

_HEX = re.compile(r"#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![0-9a-zA-Z])")
_BG_WORDS = {"bg", "background"}
_FG_WORDS = {"fg", "foreground", "text", "colour", "color"}
_COLOUR_HEADING = re.compile(r"^\W*colou?rs?\b", re.I)
_NEXT_HEADING = re.compile(r"^(?:#+\s|\*\*|[A-Z][A-Za-z ]+$)")


def shadow_presets(tokens: dict | None) -> list[dict]:
    """``[{"slug", "name", "shadow"}]`` for each literal shadow token, in token order."""
    out: list[dict] = []
    for row in token_families.read(tokens)["families"].get("shadow") or []:
        words = [w for w in re.split(r"[-_]+", row["token"]) if w and w != "shadow"]
        if not words or row["value"].strip().lower() == "none":
            continue
        slug = "-".join(words)
        out.append({"slug": slug, "name": " ".join(w.capitalize() for w in words), "shadow": row["value"].strip()})
    return out


def selection_pair(tokens: dict | None) -> dict | None:
    """``{"background", "colour"}`` hex values of the draft's selection tokens, or None unless both exist."""
    found: dict[str, str] = {}
    for raw, value in ((tokens or {}).get("tokens") or {}).items():
        words = set(re.split(r"[-_]+", raw.lstrip("-").lower()))
        colour = parse_colour(str(value))
        if "selection" not in words or colour is None or colour.alpha < 0.999:
            continue
        key = "background" if words & _BG_WORDS else "colour" if words & _FG_WORDS else None
        if key:
            found.setdefault(key, "#" + colour.hex.lstrip("#").upper())
    return found if {"background", "colour"} <= set(found) else None


def _colour_bullets(draft_dir) -> list[str]:
    """The README's list lines under its colour heading (up to the next heading), or [] with none."""
    readme = next((p for p in pathlib.Path(draft_dir).glob("*") if p.name.lower() == "readme.md"), None) if draft_dir else None
    if readme is None:
        return []
    lines, inside, out = readme.read_text(encoding="utf-8", errors="replace").splitlines(), False, []
    for line in lines:
        stripped = line.strip()
        if _COLOUR_HEADING.match(stripped.lstrip("#").strip()) and not stripped.startswith(("-", "*", "|")):
            inside = True
        elif inside and stripped and not stripped.startswith(("-", "*", "|")):
            break
        elif inside and stripped.startswith(("-", "*")):
            out.append(stripped)
    return out


def alt_colours(draft_dir, palette: list, census: dict, trace: list) -> list[dict]:
    """Palette entries for README colour-bullet hexes no palette entry holds and the draft's code uses."""
    brand_row, brands = re.compile(brand_row_pattern(), re.I), brand_colours()
    held = [e["color"] for e in palette if isinstance(e.get("color"), str)]
    entries: list[dict] = []
    for bullet in _colour_bullets(draft_dir):
        if brand_row.search(bullet):
            continue
        for raw in _HEX.findall(bullet):
            colour = parse_colour(raw)
            hexv = "#" + colour.hex.lstrip("#").upper()
            if hexv.lower() in brands or any(delta_e(colour.hex, h) <= 1.0 for h in held):
                continue
            uses = (census.get(hexv) or {}).get("uses", 0)
            if not uses:
                continue
            held.append(hexv)
            slug = f"custom-{hexv[1:].lower()}"
            entries.append({"slug": slug, "color": hexv, "name": f"Custom {hexv[1:]}", "_source": "declared"})
            trace_row(trace, "token", slug, f"README colour bullet lists it, the draft's code uses it {uses} time(s), no palette entry holds it",
                      hexv, _source="declared")
    return entries


def _palette_ref(hexv: str, palette: list) -> str:
    match = next((e["slug"] for e in palette if str(e.get("color", "")).upper() == hexv and e.get("slug")), None)
    return f"var(--wp--preset--color--{match})" if match else hexv


def apply(snap: dict, tokens: dict | None, draft_dir, census: dict, trace: list) -> dict:
    """Write the three groups into ``snap``; returns ``{"shadow": [slugs], "selection": bool, "palette": [slugs]}``."""
    settings = snap.setdefault("settings", {})
    palette = (settings.setdefault("color", {}).get("palette")) or []
    done = {"shadow": [], "selection": False, "palette": []}
    presets = (settings.setdefault("shadow", {}).setdefault("presets", []))
    for row in shadow_presets(tokens):
        entry = {"slug": row["slug"], "name": row["name"], "shadow": row["shadow"], "_source": "declared"}
        at = next((i for i, p in enumerate(presets) if p.get("slug") == row["slug"]), None)
        presets.append(entry) if at is None else presets.__setitem__(at, entry)
        done["shadow"].append(row["slug"])
        trace_row(trace, "token", f"settings.shadow.presets.{row['slug']}", "the draft's shadow role token", row["shadow"])
    if not presets and not done["shadow"]:
        settings["shadow"].pop("presets", None)
        if not settings["shadow"]:
            settings.pop("shadow")
    pair = selection_pair(tokens)
    if pair:
        settings.setdefault("custom", {})["selection"] = {k: _palette_ref(v, palette) for k, v in pair.items()}
        done["selection"] = True
        trace_row(trace, "token", "settings.custom.selection", "the draft's selection tokens", pair["background"])
    extra = alt_colours(draft_dir, palette, census, trace)
    if extra:
        palette.extend(extra)
        settings["color"]["palette"] = palette
    done["palette"] = [e["slug"] for e in extra]
    return done
