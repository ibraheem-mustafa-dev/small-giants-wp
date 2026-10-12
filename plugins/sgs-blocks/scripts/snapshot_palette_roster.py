"""snapshot_palette_roster.py: the palette roster rule every client snapshot must satisfy (Spec 32 FR-32-14).

One importable home for the rule, shared by the completeness gate
(`check-snapshot-palette-roster.py`), the push guard (`push-theme-snapshot.py`) and the
migration (`migrate-palette-roster-slugs.py`):

  * the roster is the framework palette, read from `theme/sgs-theme/theme.json`;
  * the roster must be a subset of every snapshot's palette slugs (extras are allowed);
  * three colour pairs must reach WCAG 4.5:1 per snapshot, using that snapshot's own
    resolved values: `section-text` on `section`, `link` on `surface`, `link-hover` on `surface`.

No client is named or excluded anywhere in this file.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
FRAMEWORK_THEME_JSON = REPO_ROOT / "theme" / "sgs-theme" / "theme.json"
MIN_CONTRAST = 4.5
# (foreground slug, background slug)
CONTRAST_PAIRS = (("section-text", "section"), ("link", "surface"), ("link-hover", "surface"))

_PRESET_PIPE = re.compile(r"^var:preset\|color\|([a-z0-9-]+)$")
_PRESET_VAR = re.compile(r"^var\(\s*--wp--preset--color--([a-z0-9-]+)\s*(?:,[^)]*)?\)$")
_HEX = re.compile(r"^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$")


def palette_map(theme: dict) -> dict[str, str]:
    """slug -> colour string for a theme.json / snapshot dict."""
    entries = ((theme.get("settings") or {}).get("color") or {}).get("palette") or []
    return {e["slug"]: e["color"] for e in entries
            if isinstance(e, dict) and isinstance(e.get("slug"), str) and isinstance(e.get("color"), str)}


def framework_roster(theme_json: Path | None = None) -> list[str]:
    """The framework palette slugs, in file order."""
    path = theme_json or FRAMEWORK_THEME_JSON
    data = json.loads(path.read_text(encoding="utf-8"))
    entries = ((data.get("settings") or {}).get("color") or {}).get("palette") or []
    return [e["slug"] for e in entries if isinstance(e, dict) and isinstance(e.get("slug"), str)]


def missing_roster_slugs(snapshot: dict, roster: list[str]) -> list[str]:
    """Roster slugs the snapshot's palette does not carry (roster order)."""
    have = set(palette_map(snapshot))
    return [s for s in roster if s not in have]


def slug_of_reference(value: object) -> str | None:
    """The palette slug named by `var:preset|color|X` or `var(--wp--preset--color--X[, fallback])`."""
    if not isinstance(value, str):
        return None
    v = value.strip()
    m = _PRESET_PIPE.match(v) or _PRESET_VAR.match(v)
    return m.group(1) if m else None


def resolve_colour(value: object, palette: dict[str, str], _depth: int = 0) -> str | None:
    """A hex string (as written) for a slug reference, a palette slug's colour or a raw hex; None if unresolvable."""
    if not isinstance(value, str) or _depth > 4:
        return None
    v = value.strip()
    slug = slug_of_reference(v)
    if slug is not None:
        return resolve_colour(palette.get(slug), palette, _depth + 1)
    return v if _HEX.match(v) else None


def parse_hex(value: str) -> tuple[float, float, float, float] | None:
    """(r, g, b, a) in 0..255 / 0..1 from a 3, 4, 6 or 8-digit hex; None if not a hex."""
    m = _HEX.match(value.strip())
    if not m:
        return None
    h = m.group(1)
    if len(h) in (3, 4):
        h = "".join(c * 2 for c in h)
    r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
    a = int(h[6:8], 16) / 255 if len(h) == 8 else 1.0
    return float(r), float(g), float(b), a


def _channel(c: float) -> float:
    c /= 255
    return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4


def _luminance(rgb: tuple[float, float, float]) -> float:
    r, g, b = (_channel(c) for c in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def _over(top: tuple[float, float, float, float], under: tuple[float, float, float]) -> tuple[float, float, float]:
    a = top[3]
    return tuple(top[i] * a + under[i] * (1 - a) for i in range(3))  # type: ignore[return-value]


def contrast_ratio(fg_hex: str, bg_hex: str) -> float | None:
    """WCAG ratio. Alpha is composited: the background over white, then the foreground over that."""
    fg, bg = parse_hex(fg_hex), parse_hex(bg_hex)
    if fg is None or bg is None:
        return None
    bg_rgb = _over(bg, (255.0, 255.0, 255.0))
    fg_rgb = _over(fg, bg_rgb)
    la, lb = _luminance(fg_rgb), _luminance(bg_rgb)
    hi, lo = (la, lb) if la >= lb else (lb, la)
    return (hi + 0.05) / (lo + 0.05)


def contrast_report(snapshot: dict) -> list[dict]:
    """One row per CONTRAST_PAIRS entry: slugs, resolved hexes, ratio and status
    (ok / low / missing-slug / unresolvable)."""
    palette = palette_map(snapshot)
    rows = []
    for fg_slug, bg_slug in CONTRAST_PAIRS:
        row = {"fg": fg_slug, "bg": bg_slug, "fg_hex": None, "bg_hex": None, "ratio": None, "status": "ok"}
        if fg_slug not in palette or bg_slug not in palette:
            row["status"] = "missing-slug"
            rows.append(row)
            continue
        row["fg_hex"] = resolve_colour(palette[fg_slug], palette)
        row["bg_hex"] = resolve_colour(palette[bg_slug], palette)
        ratio = contrast_ratio(row["fg_hex"], row["bg_hex"]) if row["fg_hex"] and row["bg_hex"] else None
        if ratio is None:
            row["status"] = "unresolvable"
        else:
            row["ratio"] = round(ratio, 2)
            row["status"] = "ok" if ratio >= MIN_CONTRAST else "low"
        rows.append(row)
    return rows
