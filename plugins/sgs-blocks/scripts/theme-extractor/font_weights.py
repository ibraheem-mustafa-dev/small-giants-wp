"""font_weights.py — weight evidence for the Google fonts the extractor self-hosts (Spec 33).

A VARIABLE font face must declare a weight RANGE ("300 900"). Declared as a single weight the
browser synthesises bold for every weight above it, so the framework's own precedent
(Inter "100 900", Fraunces "300 900", DM Sans "400 700") is always a range.

The weight of a self-hosted variable face is decided from evidence in this order:
  1. the range Google's own CSS response declares for the face (``font-weight: 400 900;``);
  2. else the weights the draft's font ``<link>`` requests for that family (min and max);
  3. else the weights measured as used for that family on the rendered draft.
A STATIC face (Google refuses the variable-axis request) keeps the single weight it always had.

Pure functions, no network and no file access: extract.py owns every fetch and write.
"""
from __future__ import annotations

import re
import urllib.parse

# Axis extents asked of Google to learn whether a family is variable, in order. Google answers a
# ``wght@A..B`` request with HTTP 200 and the declared range when the family's axis covers A..B, and
# HTTP 400 when it does not: Playfair Display's axis is 400..900, so 100..900 is refused although the
# family IS variable. A 400 therefore never means "static" until every extent has been refused.
# The draft link's own requested extent goes second (see ``axis_probe_ranges``).
FULL_AXIS_REQUEST = "100..900"
FALLBACK_AXIS_REQUESTS = ("400..900", "300..700")

# CSS keyword weights that can appear in measured facts.
_KEYWORD_WEIGHTS = {"normal": 400, "bold": 700}

_FACE_BLOCK = re.compile(r"@font-face\s*\{([^}]*)\}")


def variable_axis_url(family: str, axis: str = FULL_AXIS_REQUEST) -> str:
    """Google Fonts CSS2 URL asking for the family's variable weight axis over ``axis`` (``A..B``)."""
    return (f"https://fonts.googleapis.com/css2?family={urllib.parse.quote_plus(family)}"
            f":wght@{axis}&display=swap")


def axis_probe_ranges(links: list, family: str) -> list[str]:
    """The ``A..B`` extents to probe, in order: the full axis, the draft link's requested
    ``<min>..<max>`` (when it requests two or more weights), then the fallback extents. Deduplicated."""
    requested = requested_weights(links, family)
    from_link = [f"{min(requested)}..{max(requested)}"] if len(set(requested)) >= 2 else []
    out: list[str] = []
    for extent in [FULL_AXIS_REQUEST, *from_link, *FALLBACK_AXIS_REQUESTS]:
        if extent not in out:
            out.append(extent)
    return out


def face_blocks(css_text: str, family: str) -> list[tuple[str | None, str]]:
    """``(subset, block_body)`` for every @font-face of ``family`` in a Google CSS response.
    ``subset`` is the comment Google puts above each block ('latin', 'latin-ext', ...) or None.
    When a ``latin`` block exists it is the only one returned: the framework self-hosts ONE latin
    file per family, and Google lists the other scripts (cyrillic, latin-ext ...) BEFORE it."""
    out = []
    for m in _FACE_BLOCK.finditer(css_text):
        m_family = re.search(r"font-family:\s*['\"]?([^;'\"]+)['\"]?\s*;", m.group(1))
        if m_family and m_family.group(1).strip().lower() == family.lower():
            out.append((_subset_comment(css_text[:m.start()]), m.group(1)))
    latin = [b for b in out if b[0] == "latin"]
    return latin or out


def _subset_comment(before: str) -> str | None:
    """The ``/* latin */`` comment ending ``before`` (the text preceding a block), else None."""
    tail = before.rstrip()
    if not tail.endswith("*/"):
        return None
    start = tail.rfind("/*")
    return tail[start + 2:-2].strip() or None if start >= 0 else None


def parse_range(value: str) -> tuple[int, int] | None:
    """``"400 900"`` -> (400, 900). A single weight or anything unparseable -> None."""
    m = re.fullmatch(r"\s*(\d{1,4})\s+(\d{1,4})\s*", value or "")
    if not m:
        return None
    low, high = int(m.group(1)), int(m.group(2))
    return (low, high) if low < high else None


def link_names_family(url: str, family: str) -> bool:
    """True when a Google Fonts CSS2 URL requests ``family`` (``+`` or ``%20`` for spaces)."""
    return any(name.lower() == family.lower() for name, _ in _family_specs(url))


def _family_specs(url: str) -> list[tuple[str, str]]:
    """``[(family_name, axis_spec)]`` for every ``family=`` parameter of a CSS2 URL."""
    try:
        query = urllib.parse.urlparse(url).query
    except ValueError:
        return []
    out = []
    for value in urllib.parse.parse_qs(query).get("family", []):
        name, _, spec = value.partition(":")
        out.append((name.strip(), spec))
    return out


def _wght_weights(spec: str) -> set[int]:
    """Weights in one family's axis spec: ``wght@500;600;700`` / ``wght@300..600`` /
    ``opsz,wght@9..144,300..900`` (only the ``wght`` column of each tuple counts)."""
    axes_part, _, tuples = spec.partition("@")
    axes = axes_part.split(",")
    if "wght" not in axes:
        return set()
    idx = axes.index("wght")
    out: set[int] = set()
    for tup in tuples.split(";"):
        parts = tup.split(",")
        if idx < len(parts):
            out.update(int(n) for n in re.findall(r"\d{1,4}", parts[idx]))
    return out


def requested_weights(links: list, family: str) -> list[int]:
    """Every weight (range endpoints included) the draft's font links request for ``family``."""
    out: set[int] = set()
    for url in links:
        for name, spec in _family_specs(url):
            if name.lower() == family.lower():
                out |= _wght_weights(spec)
    return sorted(out)


def _weight_number(value) -> int | None:
    """A measured ``fontWeight`` ('500', 'bold', 500) as an int, else None."""
    text = str(value).strip().lower()
    text = str(_KEYWORD_WEIGHTS.get(text, text))
    return int(text) if text.isdigit() else None


def _walk_facts(node, want: str, found: set[int]) -> None:
    if isinstance(node, list):
        for child in node:
            _walk_facts(child, want, found)
        return
    if not isinstance(node, dict):
        return
    stack, weight = node.get("fontFamily"), node.get("fontWeight")
    if isinstance(stack, str) and weight is not None:
        primary = stack.split(",")[0].strip().strip("'\"").lower()
        number = _weight_number(weight) if primary == want else None
        if number is not None:
            found.add(number)
    for child in node.values():
        _walk_facts(child, want, found)


def used_weights(facts: dict | None, family: str) -> list[int]:
    """Every font weight measured on the rendered draft for ``family`` (any nested facts entry that
    carries both ``fontFamily`` and ``fontWeight``, hover states included)."""
    found: set[int] = set()
    _walk_facts(facts, family.lower(), found)
    return sorted(found)


def _as_range(weights: list[int]) -> str | None:
    return f"{min(weights)} {max(weights)}" if len(set(weights)) >= 2 else None


def choose_weight(block_weight: str, variable: bool, links: list, facts: dict | None,
                  family: str) -> tuple[str, str]:
    """``(fontWeight, source)`` for the emitted fontFace. ``source`` is one of ``google-css``,
    ``draft-link``, ``measured``, ``static`` (Google refused the variable axis) or ``single-weight``
    (variable, but no evidence of a second weight)."""
    if parse_range(block_weight):
        return block_weight.strip(), "google-css"
    if not variable:
        return block_weight, "static"
    for source, weights in (("draft-link", requested_weights(links, family)),
                            ("measured", used_weights(facts, family))):
        rng = _as_range(weights)
        if rng:
            return rng, source
    return block_weight, "single-weight"
