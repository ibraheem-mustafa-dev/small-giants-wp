"""Spec 33 declared-source readers: the design system a draft states outright.

A Claude Design handoff records its design system in places the `:root` `<style>` reader never
looks. The README is read here, purely from text (no browser, no network): ``read_readme_tokens``
parses the ``README.md`` beside the draft (colour tables in any column wording, font bullets, layout and
shape facts) and reports, rather than drops, a colour table it could not read. The
script-held accent sets are read by ``variant_sets.read_script_variant_sets``.

Everything returned is a plain, JSON-serialisable dict. Nothing here names a client.
"""
from __future__ import annotations

import pathlib
import re

HEX_RE = re.compile(r"#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![0-9a-zA-Z])")
_LENGTH_RE = re.compile(r"\d+(?:\.\d+)?(?:px|rem|em|vw|%)")

# Vocabulary kept as data, not scattered conditionals. A header matches when it CONTAINS a word.
_NAME_HEADERS = ("token", "colour", "color", "name", "swatch", "variable", "slug", "palette")
_VALUE_HEADERS = ("value", "hex", "colour", "color", "code")
_USE_HEADERS = ("use", "role", "description", "usage", "purpose")
_TYPO_SECTION_WORDS = ("typograph", "font")
_SPACING_SECTION_WORDS = ("spacing",)
_LAYOUT_LABELS = {  # normalised label -> layout key
    "max content width": "max_content_width",
    "max width": "max_content_width",
    "content width": "max_content_width",
    "border radius": "border_radius",
    "corner radius": "border_radius",
    "rounded corners": "border_radius",
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
_PROSE_RADIUS_RE = re.compile(r"border[- ]radius\s*[:=]\s*`?(\d+(?:\.\d+)?(?:px|rem|em|%)?)", re.IGNORECASE)


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
    return bool(re.fullmatch(r"\s*\|?[\s:\-|]+\|?\s*", line)) and "-" in line and "|" in line


def _header_has(header: str, words: tuple[str, ...]) -> bool:
    return any(w in header.lower() for w in words)


def _pick_hex_col(headers: list[str], counts: dict[int, int]) -> int:
    """The column colours are read from: a value-like header first, else the column with most hex cells."""
    return min(counts, key=lambda c: (not _header_has(headers[c], _VALUE_HEADERS), -counts[c], c))


def _pick_name_col(headers: list[str], hex_col: int) -> int:
    named = next((i for i, h in enumerate(headers) if i != hex_col and _header_has(h, _NAME_HEADERS)), None)
    if named is not None:
        return named
    return next((i for i in range(len(headers)) if i != hex_col), hex_col)


def _read_colour_table(headers: list[str], body: list[list[str]]) -> tuple[list[dict], list[str]] | None:
    """(rows, names of rows without a hex) for a table with hex colours in some column; else None.

    No column has to be literally called "Value": the colours come from whichever column holds them, the
    row's name from a token/colour/name-like column, the role text from the use-like columns (else every
    remaining cell), so a differently worded README reads the same as the first one.
    """
    counts: dict[int, int] = {}
    for cells in body:
        for i, cell in enumerate(cells[:len(headers)]):
            if _hexes(cell):
                counts[i] = counts.get(i, 0) + 1
    if not counts:
        return None
    hex_i = _pick_hex_col(headers, counts)
    name_i = _pick_name_col(headers, hex_i)
    rest = [i for i in range(len(headers)) if i not in (name_i, hex_i)]
    use_cols = [i for i in rest if _header_has(headers[i], _USE_HEADERS)] or rest
    rows: list[dict] = []
    without: list[str] = []
    for cells in body:
        name = _clean(cells[name_i]) if name_i < len(cells) else _clean(cells[0]) if cells else ""
        if hex_i >= len(cells) or name_i >= len(cells):
            without.append(name)     # a ragged row: nothing dropped silently
            continue
        hexes = _hexes(cells[hex_i])
        rows.append({"name": name, "hexes": hexes, "value_raw": cells[hex_i],
                     "use": " ".join(c for c in (_clean(cells[i]) for i in use_cols if i < len(cells)) if c)})
        if not hexes:
            without.append(name)
    return rows, without


def _parse_tables(lines: list[str]) -> tuple[list[dict], int, list[str]]:
    """Every markdown table that holds hex colours -> (colour rows, unreadable table count, rows without hex)."""
    rows: list[dict] = []
    unreadable = 0
    without: list[str] = []
    i = 0
    while i < len(lines) - 1:
        if "|" in lines[i] and "|" in lines[i + 1] and _is_separator(lines[i + 1]):
            headers = _split_row(lines[i])
            j = i + 2
            body: list[list[str]] = []
            while j < len(lines) and "|" in lines[j]:
                body.append(_split_row(lines[j]))
                j += 1
            table = _read_colour_table(headers, body)
            if table is not None:
                rows.extend(table[0])
                without.extend(table[1])
                unreadable += not table[0]
            i = j
        else:
            i += 1
    return rows, unreadable, without


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


def _norm_label(label: str) -> str:
    """`Border-radius`, `border_radius` and `Border radius` are one label."""
    return re.sub(r"[\s_\-]+", " ", label.strip().lower())


def _layout_fact(label: str, rest: str, layout: dict) -> bool:
    """Record a layout/shape fact when ``label`` names one; True when it did."""
    key = _LAYOUT_LABELS.get(_norm_label(label))
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
    return key is not None


def _parse_bullets(lines: list[str]) -> tuple[list[dict], dict]:
    """Typography bullets and layout/shape facts (bullets and two-column table rows), by section."""
    fonts: list[dict] = []
    layout: dict = {}
    spacing: dict = {}
    section = ""
    for line in lines:
        title = _section_title(line)
        if title is not None:
            section = title
            continue
        if line.lstrip().startswith("|") and not _is_separator(line):
            cells = _split_row(line)
            if len(cells) >= 2:
                _layout_fact(_clean(cells[0]), " ".join(cells[1:]), layout)
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
        if not _layout_fact(label, rest, layout) and any(w in section for w in _SPACING_SECTION_WORDS):
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
    text = readme.read_text(encoding="utf-8", errors="replace")
    lines = text.splitlines()
    fonts, layout = _parse_bullets(lines)
    prose_radius = _PROSE_RADIUS_RE.search(text)
    if prose_radius:
        layout.setdefault("border_radius", prose_radius.group(1))
    colours, unreadable, without_hex = _parse_tables(lines)
    return {
        "found": True,
        "path": str(readme),
        "colours": colours,
        "unreadable_tables": unreadable,
        "rows_without_hex": without_hex,
        "fonts": fonts,
        "layout": layout,
    }
