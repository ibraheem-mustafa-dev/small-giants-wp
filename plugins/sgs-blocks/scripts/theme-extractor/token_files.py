"""token_files.py — the export's own ``tokens/*.css`` as the declared colour source (FR-33-1, FR-33-9).

A Spec 48A export keeps its design tokens in ``tokens/colors.css``, ``typography.css`` and
``spacing.css`` beside the drafts. No draft loads them, so a token counts only where the draft's code
uses its exact value (the colour census, ``usage_census.census_colours``). Three outcomes per colour token:

  * used by value  -> a ``custom-<name>`` palette entry, ``_source: declared`` (the confirmed role map,
    ``confirmed_palette.py``, decides which slug it fills; nothing here guesses a role);
  * declared, never used by the draft's code -> a ``gap`` row in the trace, no palette entry;
  * named by the file's own comment as a one-off (``One- and two-off colours (... #D9981C ...)``) ->
    stays a one-off hex, noted in the trace.

Parsing composes ``token_map.py::build_draft_root_token_map`` (FR-33-10); nothing else re-parses ``:root``.
Nothing here names a client.
"""
from __future__ import annotations

import pathlib
import re

from colour import delta_e, parse_colour
from token_map import build_draft_root_token_map

TOKENS_DIR = "tokens"
_COMMENT_RE = re.compile(r"/\*(.*?)\*/", re.DOTALL)
_ONE_OFF_RE = re.compile(r"\bone[-\s]*(?:and\s+two[-\s]*)?off\b", re.IGNORECASE)
_HEX_RE = re.compile(r"#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![0-9a-zA-Z])")
RENDER_DELTA_E = 1.0


def _upper_hex(raw: str) -> str:
    digits = raw.lstrip("#").upper()
    if len(digits) == 3:
        digits = "".join(c * 2 for c in digits)
    return "#" + digits


def read_token_files(draft_dir) -> dict | None:
    """The folder's ``tokens/*.css`` as ``{"files", "tokens", "one_off"}``, or None when it has none.

    ``tokens`` is ``{name: resolved value}`` across every file (later files do not override earlier
    ones: the first declaration of a name wins, in sorted file order); ``one_off`` is the set of
    ``#RRGGBB`` values a token file's own comment lists as one-offs.
    """
    if draft_dir is None:
        return None
    folder = pathlib.Path(draft_dir) / TOKENS_DIR
    if not folder.is_dir():
        return None
    files = sorted(p for p in folder.iterdir() if p.is_file() and p.suffix.lower() == ".css")
    if not files:
        return None
    tokens: dict = {}
    one_off: set = set()
    for path in files:
        css = path.read_text(encoding="utf-8", errors="replace")
        for name, value in build_draft_root_token_map(css).items():
            tokens.setdefault(name, value)
        for comment in _COMMENT_RE.findall(css):
            if _ONE_OFF_RE.search(comment):
                one_off.update(_upper_hex(h) for h in _HEX_RE.findall(comment))
    return {"files": [p.name for p in files], "tokens": tokens, "one_off": one_off}


def _rendered_colours(facts) -> list:
    """Every colour the measured nodes report, as parsed colours (the render's own evidence)."""
    found: list = []

    def walk(node) -> None:
        if isinstance(node, dict):
            for value in node.values():
                walk(value)
        elif isinstance(node, list):
            for value in node:
                walk(value)
        elif isinstance(node, str) and node.lstrip().lower().startswith(("rgb", "#")):
            colour = parse_colour(node)
            if colour is not None and colour.alpha >= 0.999:
                found.append(colour)

    walk(facts)
    return found


def palette_entries(token_files: dict, census: dict, facts: dict, trace: list) -> list:
    """Palette entries for the colour tokens the draft's code uses by exact value; the rest go to the trace."""
    rendered = _rendered_colours(facts)
    entries: list = []
    seen_hex: dict = {}
    non_colour = 0
    for name in sorted(token_files["tokens"]):
        value = token_files["tokens"][name]
        colour = parse_colour(value)
        if colour is None:
            non_colour += 1
            continue
        upper = _upper_hex(colour.hex)
        if colour.alpha < 0.999:
            trace.append({"kind": "gap", "what": f"tokens/*.css --{name}", "value": value,
                          "reason": "translucent token: a decorative value, in the trace and not the palette"})
            continue
        if upper in token_files["one_off"]:
            trace.append({"kind": "gap", "what": f"tokens/*.css --{name}", "value": upper,
                          "reason": "the token file's own comment marks this value a one-off: it stays a hex "
                                    "on the blocks that use it (FR-33-9)"})
            continue
        uses = (census.get(upper) or {}).get("uses", 0)
        if not uses:
            trace.append({"kind": "gap", "what": f"tokens/*.css --{name}", "value": upper,
                          "reason": "declared but the draft's code never uses this exact value: gap-logged, "
                                    "not emitted (FR-33-1)"})
            continue
        if upper in seen_hex:
            trace.append({"kind": "gap", "what": f"tokens/*.css --{name}", "value": upper,
                          "reason": f"same value as --{seen_hex[upper]}: an alias, one palette entry"})
            continue
        seen_hex[upper] = name
        nearest = min((delta_e(colour.hex, r.hex) for r in rendered), default=None)
        confirmed = nearest is not None and nearest <= RENDER_DELTA_E
        slug = f"custom-{name}"
        entries.append({"slug": slug, "color": upper, "name": slug.replace("custom-", "").replace("-", " ").title(),
                        "_source": "declared"})
        trace.append({"kind": "token", "slug": slug, "_source": "declared", "value": upper, "uses": uses,
                      "reason": f"tokens/*.css --{name}, used by value {uses} time(s) in the draft's code",
                      "render": "confirmed" if confirmed else "not in the measured nodes (the code uses it)"})
    if non_colour:
        trace.append({"kind": "gap", "what": "tokens/*.css non-colour tokens", "count": non_colour,
                      "reason": "typography and spacing tokens are read by their own passes, not the colour pass"})
    return entries
