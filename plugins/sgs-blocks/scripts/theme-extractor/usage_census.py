"""Colour usage census for a draft's HTML and JavaScript.

Counts how each colour is USED (family, rest/hover, label/body-like) and decides
which colours have a proven, consistent role and may become site palette entries.
Everything else stays a literal colour on the blocks that use it.

Sources: inline `style` (rest), the custom `style-hover` attribute (hover), every
`<style>` block declaration (`:hover` selector = hover), and JS style-bound colours.

Template region: if the document has `<script type="text/x-dc"` (Claude Design)
the template is everything before it and the script text everything after it.
Otherwise the template is the body with `<script>` elements removed and there is
no script text. `data:image...` payloads are stripped before scanning.

JS RULE (binding): a colour literal in the script text COUNTS ONLY when its value
flows into a style attribute through a binding. The binding names are those used
as `{{ name }}` / `{{ obj.name }}` inside `style` / `style-hover` values in the
template (last path segment). A colour in the script counts only as the value of
an object key of that name (`name: '#HEX'` or `name: cond ? '#HEX' : '#HEX'`), and
is attributed to the property family of the declaration the binding sat in. When
one key name is bound under several template objects (`t.colour`, `r.colour`) the
enclosing object literal's sibling keys pick the matching one. Colours that are NOT
bound into a style (colour-name lookup tables, reviewer or product data arrays,
swatch lists) are content, not global styling, and are never counted. Product swatch gradients
that ARE bound into a style (`swatch: 'linear-gradient(...)'` under `background:{{ o.swatch }}`) do
count, as content colours (a shop draft's product swatches, for example, all as background). Only the
undeclared 25-use floor and the declared-colour requirement in `promote` keep them out of the palette.

Plain dicts; deterministic ordering (descending uses, then colour).
"""

from __future__ import annotations

import re
from collections import defaultdict

from bs4 import BeautifulSoup

import usage_js

FAMILIES = ("text", "background", "border", "fill", "outline")
PROMOTABLE_FAMILIES = ("text", "background", "border", "fill")  # outline merges into border
LABEL_LETTER_SPACING_EM = 0.08

# Property -> family. Exact names first, then prefixes.
FAMILY_EXACT = {"color": "text", "background": "background", "background-color": "background",
                "fill": "fill", "stroke": "fill"}
FAMILY_PREFIX = (("border", "border"), ("outline", "outline"))

_HEX = r"#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b"
_RGB = r"rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})(?:\s*[,/]\s*([\d.]+%?))?\s*\)"
COLOUR_RE = re.compile(f"({_HEX})|{_RGB}", re.I)
BINDING_RE = re.compile(r"\{\{\s*([\w.$]+)\s*\}\}")
DECL_RE = re.compile(r"\s*([\w-]+)\s*:\s*((?:[^;()]|\([^)]*\))*)")
DATA_IMAGE_RE = re.compile(r"data:image/[^\"')\s]*", re.I)
OPAQUE_HEX_RE = re.compile(r"#[0-9A-F]{6}")
DC_SCRIPT = '<script type="text/x-dc"'


def _property_family(prop: str) -> str | None:
    prop = prop.strip().lower()
    if prop in FAMILY_EXACT:
        return FAMILY_EXACT[prop]
    for prefix, family in FAMILY_PREFIX:
        if prop == prefix or prop.startswith(prefix + "-"):
            return family
    return None


def _fmt_alpha(value: float) -> str:
    return f"{value:.3f}".rstrip("0").rstrip(".") or "0"


def _normalise(match: re.Match) -> str:
    """Opaque -> `#RRGGBB`; translucent -> `rgba(r,g,b,a)`."""
    hexv = match.group(1)
    if hexv:
        digits = hexv[1:].upper()
        if len(digits) == 3:
            digits = "".join(c * 2 for c in digits)
        if len(digits) == 6:
            return "#" + digits
        alpha = int(digits[6:], 16) / 255
        if alpha >= 0.999:
            return "#" + digits[:6]
        r, g, b = (int(digits[i:i + 2], 16) for i in (0, 2, 4))
        return f"rgba({r},{g},{b},{_fmt_alpha(alpha)})"
    r, g, b = (min(255, int(match.group(i))) for i in (2, 3, 4))   # rgb(999,...) clamps, as a browser does
    a = match.group(5)
    try:
        alpha = 1.0 if a is None else float(a[:-1]) / 100 if a.endswith("%") else float(a)
    except ValueError:
        alpha = 1.0
    if alpha >= 0.999:
        return "#%02X%02X%02X" % (r, g, b)
    return f"rgba({r},{g},{b},{_fmt_alpha(alpha)})"


def _colours_in(value: str) -> list[str]:
    return [_normalise(m) for m in COLOUR_RE.finditer(value)]


def _declarations(text: str) -> list[tuple[str, str]]:
    return [(m.group(1).lower(), m.group(2).strip()) for m in DECL_RE.finditer(text)]


def _label_like(decls: list[tuple[str, str]]) -> bool:
    for prop, value in decls:
        if prop == "text-transform" and value.lower().strip() == "uppercase":
            return True
        if prop == "letter-spacing":
            m = re.match(r"(-?[\d.]+)em\b", value.strip(), re.I)
            if m and float(m.group(1)) >= LABEL_LETTER_SPACING_EM:
                return True
    return False


def _empty_entry() -> dict:
    return {"uses": 0, "by_family": {f: 0 for f in FAMILIES}, "by_state": {"rest": 0, "hover": 0},
            "label_like": 0, "body_like": 0, "sources": {"html": 0, "style_block": 0, "js_bound": 0}}


def _record(census: dict, colour: str, family: str, state: str, label: bool, source: str) -> None:
    entry = census.setdefault(colour, _empty_entry())
    entry["uses"] += 1
    entry["by_family"][family] += 1
    entry["by_state"][state] += 1
    entry["sources"][source] += 1
    entry["label_like" if label else "body_like"] += family == "text"


def _split_regions(html: str) -> tuple[BeautifulSoup, str]:
    cut = html.find(DC_SCRIPT)
    if cut >= 0:
        return BeautifulSoup(html[:cut], "html.parser"), html[cut:]
    soup = BeautifulSoup(html, "html.parser")
    for script in soup.find_all("script"):
        script.decompose()
    return soup, ""


def _scan_group(census: dict, decls: list[tuple[str, str]], state: str, source: str,
                bindings: list[dict] | None) -> None:
    label = _label_like(decls)
    for prop, value in decls:
        family = _property_family(prop)
        if family is None:
            continue
        for colour in _colours_in(value):
            _record(census, colour, family, state, label, source)
        if bindings is not None:
            for path in BINDING_RE.findall(value):
                head, _, name = path.rpartition(".")
                bindings.append({"name": name, "prefix": head, "family": family, "state": state, "label": label})


def _scan_style_blocks(soup: BeautifulSoup, census: dict) -> None:
    for block in soup.find_all("style"):
        css = re.sub(r"/\*.*?\*/", "", block.get_text(), flags=re.S)
        for m in re.finditer(r"([^{}]+)\{([^{}]*)\}", css):
            state = "hover" if ":hover" in m.group(1) else "rest"
            _scan_group(census, _declarations(m.group(2)), state, "style_block", None)


def _value_expression(script: str, pos: int) -> str:
    """The value after `name:` up to a depth-0 `,` `}` `;` (quotes respected), capped."""
    depth, quote, out = 0, "", []
    for ch in script[pos:pos + 300]:
        if quote:
            if ch == quote:
                quote = ""
        elif ch in "'\"`":
            quote = ch
        elif ch in "([{":
            depth += 1
        elif ch in ")]}":
            if depth == 0:
                break
            depth -= 1
        elif ch in ",;" and depth == 0:
            break
        out.append(ch)
    return "".join(out)


def _scan_js_bound(census: dict, script: str, bindings: list[dict]) -> None:
    by_name: dict[str, list[dict]] = defaultdict(list)
    for binding in bindings:
        by_name[binding["name"]].append(binding)
    spans = usage_js.bracket_spans(script)
    siblings: dict[str, set[str]] = defaultdict(set)
    for binding in bindings:
        siblings[binding["prefix"]].add(binding["name"])
    for name, contexts in sorted(by_name.items()):
        key_re = re.compile(r"(?:^|[{,])\s*['\"]?" + re.escape(name) + r"['\"]?\s*:", re.M)
        for m in key_re.finditer(script):
            colours = _colours_in(_value_expression(script, m.end()))
            if not colours:
                continue
            keys = usage_js.enclosing_keys(script, spans, m.end())
            scored = [(len((siblings[c["prefix"]] - {name}) & keys) if c["prefix"] else 0, c) for c in contexts]
            best = max(score for score, _ in scored)
            chosen = {(c["family"], c["state"], c["label"]) for score, c in scored if best == 0 or score == best}
            for family, state, label in sorted(chosen):
                for colour in colours:
                    _record(census, colour, family, state, label, "js_bound")


def census_colours(html: str) -> dict[str, dict]:
    """Count every colour's uses by family, state, label-likeness and source."""
    soup, script = _split_regions(DATA_IMAGE_RE.sub("", html))
    census: dict[str, dict] = {}
    bindings: list[dict] = []
    for tag in soup.find_all(True):
        for attr, state in (("style", "rest"), ("style-hover", "hover")):
            value = tag.get(attr)
            if isinstance(value, str) and value.strip():
                _scan_group(census, _declarations(value), state, "html", bindings)
    _scan_style_blocks(soup, census)
    if script:
        _scan_js_bound(census, script, bindings)
    return dict(sorted(census.items(), key=lambda kv: (-kv[1]["uses"], kv[0])))


def _promotion_families(entry: dict) -> dict[str, int]:
    fams = {f: entry["by_family"][f] for f in PROMOTABLE_FAMILIES}
    fams["border"] += entry["by_family"]["outline"]
    return fams


def _top_family(entry: dict) -> tuple[str, int]:
    fams = _promotion_families(entry)
    top = max(PROMOTABLE_FAMILIES, key=lambda f: (fams[f], -PROMOTABLE_FAMILIES.index(f)))
    return top, fams[top]


def _declared_set(declared_hexes: set[str]) -> set[str]:
    out = set()
    for raw in declared_hexes:
        m = COLOUR_RE.fullmatch(raw.strip())
        if m:
            out.add(_normalise(m))
    return out


def _judge(census: dict, declared_hexes: set[str], min_uses: int, min_share: float) -> tuple[dict, dict]:
    declared = _declared_set(declared_hexes)
    promoted: dict[str, dict] = {}
    rejected: dict[str, str] = {}
    order = sorted(set(census) | declared, key=lambda c: (-census.get(c, {"uses": 0})["uses"], c))
    for colour in order:
        entry = census.get(colour)
        if not OPAQUE_HEX_RE.fullmatch(colour):     # only a whole #RRGGBB is ever promotable
            rejected[colour] = "translucent" if colour.startswith("rgba") else "not an opaque #RRGGBB colour"
            continue
        if entry is None or entry["uses"] == 0:
            rejected[colour] = "declared but never used in its claimed family"
            continue
        family, count = _top_family(entry)
        share = round(count / entry["uses"], 4)
        if colour in declared:
            promoted[colour] = {"colour": colour, "family": family, "basis": "declared+used",
                                "uses": entry["uses"], "share": share}
        elif entry["uses"] < min_uses:
            rejected[colour] = f"undeclared, {entry['uses']} uses below {min_uses}"
        elif share < min_share:
            fams = sorted(((n, f) for f, n in _promotion_families(entry).items() if n), key=lambda p: (-p[0], p[1]))
            split = " / ".join(f"{f} {round(100 * n / entry['uses'])}%" for n, f in fams[:2])
            rejected[colour] = f"used across families: {split}"
        else:
            promoted[colour] = {"colour": colour, "family": family, "basis": "undeclared-consistent",
                                "uses": entry["uses"], "share": share}
    return promoted, rejected


def promote(census: dict, declared_hexes: set[str], *, min_undeclared_uses: int = 25,
            min_single_family_share: float = 0.9) -> dict[str, dict]:
    """Colours that earn a palette role: declared and used, or undeclared, frequent and single-role."""
    return _judge(census, declared_hexes, min_undeclared_uses, min_single_family_share)[0]


def explain_rejections(census: dict, declared_hexes: set[str], *, min_undeclared_uses: int = 25,
                       min_single_family_share: float = 0.9) -> dict[str, str]:
    """A short reason for every colour `promote` did not accept."""
    return _judge(census, declared_hexes, min_undeclared_uses, min_single_family_share)[1]
