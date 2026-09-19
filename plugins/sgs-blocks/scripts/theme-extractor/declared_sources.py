"""Spec 33 declared-source readers: the design system a draft states outright.

A Claude Design handoff records its design system in places the `:root` `<style>` reader never
looks. The README is read here, purely from text (no browser, no network): ``read_readme_tokens``
parses the ``README.md`` beside the draft (colour table, font bullets, layout and shape facts). The
script-held accent sets are read by ``variant_sets.read_script_variant_sets``.

Everything returned is a plain, JSON-serialisable dict. Nothing here names a client.
"""
from __future__ import annotations

import pathlib
import re

HEX_RE = re.compile(r"#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![0-9a-zA-Z])")
_LENGTH_RE = re.compile(r"\d+(?:\.\d+)?(?:px|rem|em|vw|%)")

# Vocabulary kept as data, not scattered conditionals.
_COLOUR_NAME_HEADERS = ("token", "colour", "color")
_VALUE_HEADERS = ("value",)
_USE_HEADERS = ("use", "role", "purpose", "usage")
_TYPO_SECTION_WORDS = ("typograph", "font")
_SPACING_SECTION_WORDS = ("spacing",)
_LAYOUT_LABELS = {  # normalised label -> layout key
    "max content width": "max_content_width",
    "max width": "max_content_width",
    "content width": "max_content_width",
    "border radius": "border_radius",
    "radius": "border_radius",
    "shadows": "shadows",
    "shadow": "shadows",
}

_BULLET_RE = re.compile(r"^\s*[-*+]\s+(.*)$")
_LABEL_RE = re.compile(r"^([^:*`|]+?):\s*(.*)$")
_FONT_BULLET_RE = re.compile(r"^([^:*`|]+?):\s*\*\*([^*]+)\*\*(.*)$")
_WEIGHTS_RE = re.compile(
    r"(?:weights?\s+|^[\s,]+)((?:\d{3}(?:\s*[\u2013\-]\s*\d{3})?(?:\s*[/,&]\s*|\s+and\s+)?)+)", re.IGNORECASE
)
_BOLD_LINE_RE = re.compile(r"^\s*\*\*([^*]+)\*\*\s*$")
_HEADING_RE = re.compile(r"^\s*#{1,6}\s+(.*?)\s*#*\s*$")


def normalise_hex(raw: str) -> str:
    """`#abc` and `#aabbcc` -> `#AABBCC`."""
    h = raw.strip().lstrip("#").upper()
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    return "#" + h


def _hexes(text: str) -> list[str]:
    return [normalise_hex(m) for m in HEX_RE.findall(text)]


def _clean(text: str) -> str:
    return text.replace("`", "").replace("**", "").strip()


# --------------------------------------------------------------------------- README


def _split_row(line: str) -> list[str]:
    cells = line.strip().strip("|").split("|")
    return [c.strip() for c in cells]


def _is_separator(line: str) -> bool:
    return bool(re.fullmatch(r"\s*\|?[\s:\-|]+\|?\s*", line)) and "-" in line


def _find_col(headers: list[str], words: tuple[str, ...]) -> int:
    for i, h in enumerate(headers):
        if any(w in h.lower() for w in words):
            return i
    return -1


def _parse_tables(lines: list[str]) -> list[dict]:
    """Every markdown table with a token/colour column and a value column -> colour rows."""
    rows: list[dict] = []
    i = 0
    while i < len(lines) - 1:
        line = lines[i]
        if line.lstrip().startswith("|") and _is_separator(lines[i + 1]):
            headers = _split_row(line)
            name_i = _find_col(headers, _COLOUR_NAME_HEADERS)
            value_i = _find_col(headers, _VALUE_HEADERS)
            use_i = _find_col(headers, _USE_HEADERS)
            j = i + 2
            body: list[list[str]] = []
            while j < len(lines) and lines[j].lstrip().startswith("|"):
                body.append(_split_row(lines[j]))
                j += 1
            if name_i >= 0 and value_i >= 0:
                if use_i < 0 and value_i + 1 < len(headers):
                    use_i = value_i + 1
                for cells in body:
                    if max(name_i, value_i) >= len(cells):
                        continue
                    value_raw = cells[value_i]
                    rows.append({
                        "name": _clean(cells[name_i]),
                        "hexes": _hexes(value_raw),
                        "value_raw": value_raw,
                        "use": _clean(cells[use_i]) if 0 <= use_i < len(cells) else "",
                    })
            i = j
        else:
            i += 1
    return rows


def _expand_weights(raw: str) -> list[int]:
    out: list[int] = []
    for part in re.split(r"\s*[/,&]\s*|\s+and\s+", raw.strip()):
        rng = re.fullmatch(r"(\d{3})\s*[\u2013\-]\s*(\d{3})", part.strip())
        if rng:
            lo, hi = int(rng.group(1)), int(rng.group(2))
            out.extend(range(lo, hi + 1, 100))
        elif re.fullmatch(r"\d{3}", part.strip()):
            out.append(int(part.strip()))
    return sorted(set(out))


def _font_role(label: str) -> str:
    role = label.strip().lower()
    role = re.sub(r"\s+only$", "", role)
    return role.split("/")[0].strip()


def _section_title(line: str) -> str | None:
    m = _HEADING_RE.match(line) or _BOLD_LINE_RE.match(line)
    return m.group(1).strip().lower() if m else None


def _parse_bullets(lines: list[str]) -> tuple[list[dict], dict]:
    """Typography bullets and layout/shape facts, tracking the current section title."""
    fonts: list[dict] = []
    layout: dict = {}
    spacing: dict = {}
    section = ""
    for line in lines:
        title = _section_title(line)
        if title is not None:
            section = title
            continue
        bullet = _BULLET_RE.match(line)
        if not bullet:
            continue
        text = bullet.group(1).strip()
        in_typo = any(w in section for w in _TYPO_SECTION_WORDS)
        font = _FONT_BULLET_RE.match(text)
        if font and (in_typo or "weight" in text.lower()):
            wm = _WEIGHTS_RE.search(font.group(3))
            fonts.append({
                "role": _font_role(font.group(1)),
                "family": font.group(2).strip(),
                "weights": _expand_weights(wm.group(1)) if wm else [],
                "scoped": bool(re.search(r"\bonly\b", text, re.IGNORECASE)),
            })
            continue
        label_m = _LABEL_RE.match(text)
        if not label_m:
            continue
        label, rest = label_m.group(1).strip(), label_m.group(2).strip()
        key = _LAYOUT_LABELS.get(label.lower())
        if key == "max_content_width":
            length = _LENGTH_RE.search(rest)
            if length:
                layout.setdefault(key, length.group(0))
        elif key == "border_radius":
            layout.setdefault(key, rest)
        elif key == "shadows":
            values = re.findall(r"`([^`]+)`", rest)
            if values:
                layout.setdefault(key, values)
        elif any(w in section for w in _SPACING_SECTION_WORDS):
            spacing.setdefault(label, rest)
    if spacing:
        layout["spacing"] = spacing
    return fonts, layout


def read_readme_tokens(folder: pathlib.Path) -> dict:
    """Parse the draft folder's README design tokens; ``{"found": False}`` when there is none."""
    folder = pathlib.Path(folder)
    readme = None
    if folder.is_dir():
        for child in sorted(folder.iterdir()):
            if child.is_file() and child.name.lower() == "readme.md":
                readme = child
                break
    if readme is None:
        return {"found": False}
    lines = readme.read_text(encoding="utf-8", errors="replace").splitlines()
    fonts, layout = _parse_bullets(lines)
    return {
        "found": True,
        "path": str(readme),
        "colours": _parse_tables(lines),
        "fonts": fonts,
        "layout": layout,
    }
