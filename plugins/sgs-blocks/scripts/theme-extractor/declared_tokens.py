"""declared_tokens.py — the typography, layout and focus values an export's ``tokens/*.css`` declares (FR-33-1).

A Spec 48A export states its design system in ``tokens/colors.css``, ``spacing.css`` and ``typography.css``; those
files are the primary source and the render only fills what they leave unsaid. This module reads each token by the
JOB its name states (a heading size per level and device tier, the body size and line height, a heading line height
or tracking, the side gutter per tier, the section padding per tier, the focus ring, the display and body families)
and by the rules a token file writes on ``body``, ``h1, h2, h3`` and ``a``. Two consumers share it:

* ``apply`` writes the declared values into the snapshot (``extract.py::main`` runs it after the merge, so a
  declared value beats both the render and the client's earlier snapshot);
* ``expectations`` lists every declared value with the snapshot path it governs, which
  ``verify_against_draft.py`` compares against a finished snapshot.

Token names are matched by their job word with an optional short client prefix (``--mm-h1-d``, ``--fs-h1``,
``--size-h1-mobile``); nothing here names a client. A tier the draft gives once (``--gutter``) holds for every
wider tier the draft does not name. The section padding tokens are the section padding default (``settings.custom.section``): the route leaves a
section that takes the draft's own padding unset so it inherits the default (``APPLIED_ROLES`` lists what ``apply`` writes).
"""
from __future__ import annotations

import pathlib
import re

from colour import parse_colour
from token_map import parse_base_rules, resolve_value

TOKENS_DIR = "tokens"
TIERS = ("mobile", "tablet", "desktop")
_TIER = {"m": "mobile", "mobile": "mobile", "t": "tablet", "tablet": "tablet", "d": "desktop", "desktop": "desktop"}
_PREFIX = r"^(?:[a-z]{1,3}-)?"
_TIER_SUFFIX = r"(?:-(m|mobile|t|tablet|d|desktop))?$"
GUTTER_RE = re.compile(_PREFIX + r"gutter" + _TIER_SUFFIX)
SECTION_RE = re.compile(_PREFIX + r"section(?:-pad(?:ding)?)?" + _TIER_SUFFIX)
HEADING_SIZE_RE = re.compile(_PREFIX + r"(?:size-|fs-|font-size-)?h([1-6])" + _TIER_SUFFIX)
LINE_HEIGHT_RE = re.compile(_PREFIX + r"(?:lh|leading|line-height)-(body|heading|h[1-6])$")
TRACKING_RE = re.compile(_PREFIX + r"(?:track|tracking|letter-spacing)-(h[1-6])$")
BODY_SIZE_RE = re.compile(_PREFIX + r"(?:fs-body|text-body-size|text-base|size-body|font-size-body)$")
FOCUS_RE = re.compile(_PREFIX + r"focus(?:-ring)?$")
LINK_FOCUS_SELECTORS = frozenset({"a:focus", "a:focus-visible"})
_CSS_LINK_FOCUS_RE = re.compile(r"(?:^|[}\s,])a:focus(?:-visible)?\s*\{([^}]*)\}")
FAMILY_RE = re.compile(_PREFIX + r"font-(display|heading|body)$")
_LENGTH_RE = re.compile(r"^-?\d*\.?\d+(?:px|rem|em)$|^0$")
_NUMBER_RE = re.compile(r"^\d*\.?\d+$")
_PX_RE = re.compile(r"^(-?\d*\.?\d+)px$")
# The viewport range a heading declared per device tier scales across (mobile at 375px, desktop at 1440px).
FLUID_MIN_VW, FLUID_MAX_VW = 375, 1440
APPLIED_ROLES = frozenset({"gutter", "section", "heading-size", "heading-line-height", "heading-tracking", "body-size",
                           "body-line-height", "body-colour", "focus"})


def _is_length(value: str) -> bool:
    return bool(_LENGTH_RE.match(value.strip())) or value.strip().startswith(("clamp(", "min(", "max(", "calc("))


def _fmt(num: float) -> str:
    text = f"{num:.4f}".rstrip("0").rstrip(".")
    return text if text not in ("", "-0") else "0"


def fluid_size(tiers: dict) -> str | None:
    """One CSS size for a heading the draft gives per tier: the single value, or a ``clamp()`` that is the mobile
    value at 375px and the desktop value at 1440px. None when no tier is a plain length."""
    given = {t: v for t, v in tiers.items() if v}
    if not given:
        return None
    if "desktop" in given and not given["desktop"].startswith("clamp(") and ("mobile" in given):
        lo, hi = _PX_RE.match(given["mobile"]), _PX_RE.match(given["desktop"])
        if lo and hi and float(lo.group(1)) != float(hi.group(1)):
            a, b = float(lo.group(1)), float(hi.group(1))
            slope = (b - a) / (FLUID_MAX_VW - FLUID_MIN_VW)
            intercept = a - slope * FLUID_MIN_VW
            low, high = sorted((a, b))
            return f"clamp({_fmt(low)}px, {_fmt(intercept)}px + {_fmt(slope * 100)}vw, {_fmt(high)}px)"
    for tier in ("desktop", "tablet", "mobile"):
        if tier in given:
            return given[tier]
    return None


def read_token_css(draft_dir) -> tuple[dict, list]:
    """``({name: resolved value}, [(selector, prop, resolved value)])`` from the folder's ``tokens/*.css``."""
    from token_files import read_token_files
    declared = read_token_files(draft_dir)
    if declared is None:
        return {}, []
    tokens = {k.lstrip("-").lower(): str(v).strip() for k, v in declared["tokens"].items()}
    rules = []
    folder = pathlib.Path(draft_dir) / TOKENS_DIR
    for name in declared["files"]:
        css = (folder / name).read_text(encoding="utf-8", errors="replace")
        for selector, prop, value, _important, _offset in parse_base_rules(css):
            rules.append((selector.strip().lower(), prop, resolve_value(value, declared["tokens"])))
    return tokens, rules


def read_roles(draft_dir) -> dict:
    """Every declared value, by job: ``{role: {key: (value, source)}}``. Empty when the export has no token files."""
    tokens, rules = read_token_css(draft_dir)
    roles: dict = {}

    def put(role: str, key: str, value: str, source: str) -> None:
        roles.setdefault(role, {}).setdefault(key, (value, source))

    for name, value in tokens.items():
        src = f"tokens/*.css --{name}"
        if (m := GUTTER_RE.match(name)) and _is_length(value):
            put("gutter", _TIER.get(m.group(1) or "", "default"), value, src)
        elif (m := SECTION_RE.match(name)) and _is_length(value.split()[0]):
            put("section", _TIER.get(m.group(1) or "", "default"), value.split()[0], src)
        elif (m := HEADING_SIZE_RE.match(name)) and _is_length(value):
            put("heading-size", f"h{m.group(1)}.{_TIER.get(m.group(2) or '', 'default')}", value, src)
        elif (m := LINE_HEIGHT_RE.match(name)) and _NUMBER_RE.match(value):
            which = m.group(1)
            put("body-line-height" if which == "body" else "heading-line-height",
                "body" if which == "body" else which, value, src)
        elif (m := TRACKING_RE.match(name)) and _is_length(value):
            put("heading-tracking", m.group(1), value, src)
        elif BODY_SIZE_RE.match(name) and _is_length(value):
            put("body-size", "body", value, src)
        elif FOCUS_RE.match(name):
            colour = next((p for p in value.split() if parse_colour(p)), None)
            width = next((p for p in value.split() if _PX_RE.match(p)), None)
            if colour:
                put("focus", "colour", parse_colour(colour).hex, src)
            if width:
                put("focus", "width", width, src)
        elif (m := FAMILY_RE.match(name)):
            put("family", "heading" if m.group(1) in ("display", "heading") else "body",
                value.split(",")[0].strip().strip("'\""), src)
    for selector, prop, value in rules:
        src = f"tokens/*.css {selector} {{{prop}}}"
        if selector == "body" and prop == "font-size" and _is_length(value):
            roles.setdefault("body-size", {})["body"] = (value, src)
        elif selector == "body" and prop == "line-height" and _NUMBER_RE.match(value):
            roles.setdefault("body-line-height", {})["body"] = (value, src)
        elif selector == "body" and prop == "color" and parse_colour(value):
            put("body-colour", "text", parse_colour(value).hex, src)
        elif selector in ("h1", "h2", "h3") and prop == "color" and parse_colour(value):
            put("heading-colour", "heading", parse_colour(value).hex, src)
        elif selector == "a" and prop == "color" and parse_colour(value):
            put("link-colour", "link", parse_colour(value).hex, src)
        elif selector == "a:hover" and prop == "color" and parse_colour(value):
            put("link-colour", "link-hover", parse_colour(value).hex, src)
        elif selector in LINK_FOCUS_SELECTORS and prop == "color" and parse_colour(value):
            put("link-focus", "colour", parse_colour(value).hex, src)
        elif selector in LINK_FOCUS_SELECTORS and prop in ("text-decoration", "text-decoration-line"):
            put("link-focus", "decoration", value.split()[0], src)
    return roles


def _tiered(values: dict) -> dict:
    """A value per tier: the tier's own value, else the value the draft gives without a tier (``--gutter``), else
    the next narrower tier's; a mobile tier with none of these takes the narrowest value given."""
    out, last = {}, None
    for tier in TIERS:
        last = values.get(tier) or values.get("default") or last
        out[tier] = last
    first = next((out[t] for t in TIERS if out[t]), None)
    return {t: (v or first) for t, v in out.items()}


def _heading_tiers(roles: dict) -> dict:
    by_level: dict = {}
    for key, (value, source) in (roles.get("heading-size") or {}).items():
        level, tier = key.split(".")
        by_level.setdefault(level, {})[tier] = (value, source)
    return by_level


def expectations(roles: dict, snap: dict | None = None) -> list[dict]:
    """``[{"role", "path", "value", "source"}]``: each snapshot path a declared value governs, and that value.

    A declared heading line height governs every heading level with a declared size and every level ``snap``
    gives a line height of its own. ``path`` is dotted from the snapshot root (``styles.elements.h1.typography.fontSize``); a colour value is a
    ``#rrggbb`` the path must resolve to."""
    out: list[dict] = []

    def add(role, path, value, source):
        out.append({"role": role, "path": path, "value": value, "source": source})

    gutter = roles.get("gutter") or {}
    if gutter:
        tiers = _tiered({t: v[0] for t, v in gutter.items()})
        for tier in TIERS:
            add("gutter", f"settings.custom.gutter.{tier}", tiers[tier], ", ".join(sorted({v[1] for v in gutter.values()})))
    section = roles.get("section") or {}
    if section:
        tiers = _tiered({t: v[0] for t, v in section.items()})
        for tier in TIERS:
            add("section", f"settings.custom.section.padding.{tier}", tiers[tier],
                ", ".join(sorted({v[1] for v in section.values()})))
    for level, tiers in sorted(_heading_tiers(roles).items()):
        size = fluid_size(_tiered({t: v[0] for t, v in tiers.items()}))
        if size:
            add("heading-size", f"styles.elements.{level}.typography.fontSize", size,
                ", ".join(v[1] for v in tiers.values()))
    lh = roles.get("heading-line-height") or {}
    elements = ((snap or {}).get("styles") or {}).get("elements") or {}
    levels = sorted(set(_heading_tiers(roles)) | {
        f"h{n}" for n in range(1, 7) if "lineHeight" in ((elements.get(f"h{n}") or {}).get("typography") or {})})
    if "heading" in lh:
        add("heading-line-height", "styles.elements.heading.typography.lineHeight", lh["heading"][0], lh["heading"][1])
    for level in levels or []:
        own = lh.get(level) or lh.get("heading")
        if own:
            add("heading-line-height", f"styles.elements.{level}.typography.lineHeight", own[0], own[1])
    for level, (value, source) in sorted((roles.get("heading-tracking") or {}).items()):
        add("heading-tracking", f"styles.elements.{level}.typography.letterSpacing", value, source)
    if "body" in (roles.get("body-size") or {}):
        value, source = roles["body-size"]["body"]
        add("body-size", "styles.typography.fontSize", value, source)
    if "body" in (roles.get("body-line-height") or {}):
        value, source = roles["body-line-height"]["body"]
        add("body-line-height", "styles.typography.lineHeight", value, source)
    if "text" in (roles.get("body-colour") or {}):
        value, source = roles["body-colour"]["text"]
        add("body-colour", "styles.color.text", value, source)
    focus = roles.get("focus") or {}
    if "colour" in focus:
        add("focus", "settings.custom.focus.ring", focus["colour"][0], focus["colour"][1])
    if "width" in focus:
        add("focus", "settings.custom.focus.width", focus["width"][0], focus["width"][1])
    for key, (value, source) in (roles.get("family") or {}).items():
        add("family", f"settings.typography.fontFamilies.{key}", value, source)
    for key, (value, source) in (roles.get("heading-colour") or {}).items():
        add("heading-colour", "styles.elements.heading.color.text", value, source)
    for key, (value, source) in (roles.get("link-colour") or {}).items():
        path = "styles.elements.link.color.text" if key == "link" else "styles.elements.link.:hover.color.text"
        add("link-colour", path, value, source)
    return out


def _palette(snap: dict) -> list:
    return (((snap.get("settings") or {}).get("color") or {}).get("palette")) or []


def _colour_ref(snap: dict, hexv: str, preference: tuple, style_ref: bool) -> str:
    """The palette reference for ``hexv`` (a slug from ``preference`` first, then any slug), else the hex."""
    held = [e["slug"] for e in _palette(snap)
            if isinstance(e.get("color"), str) and (parse_colour(e["color"]) or None)
            and parse_colour(e["color"]).hex == hexv and parse_colour(e["color"]).alpha == 1.0]
    slug = next((s for s in preference if s in held), held[0] if held else None)
    if slug is None:
        return hexv
    return f"var:preset|color|{slug}" if style_ref else f"var(--wp--preset--color--{slug})"


def _set(snap: dict, path: str, value) -> None:
    node = snap
    keys = path.split(".")
    for key in keys[:-1]:
        node = node.setdefault(key, {})
    node[keys[-1]] = value


def _set_body_size(snap: dict, value: str) -> None:
    """The body size goes through the non-fluid ``regular`` preset (FR-33-4), as the measured size does."""
    from typography import register_base_font_size_preset
    settings = snap.setdefault("settings", {})
    register_base_font_size_preset(settings, {"fontSize": value}, [])
    snap.setdefault("styles", {}).setdefault("typography", {})["fontSize"] = "var:preset|font-size|regular"


def _css_link_focus(css: str) -> dict:
    """``{colour, decoration}`` from a bare ``a:focus`` / ``a:focus-visible`` rule in the draft's own CSS."""
    found: dict = {}
    for m in _CSS_LINK_FOCUS_RE.finditer(css or ""):
        for decl in m.group(1).split(";"):
            prop, _, value = decl.partition(":")
            prop, value = prop.strip().lower(), value.strip()
            if prop == "color" and parse_colour(value):
                found.setdefault("colour", (parse_colour(value).hex, "draft CSS a:focus {color}"))
            elif prop in ("text-decoration", "text-decoration-line") and value:
                found.setdefault("decoration", (value.split()[0], "draft CSS a:focus {text-decoration}"))
    return found


def apply_link_focus(snap: dict, roles: dict, css: str, trace: list) -> None:
    """``styles.elements.link[':focus-visible']`` exists only where the draft declares a link focus look.

    The framework ``theme.json`` carries a link focus look (hover colour, underline) that ``build_snapshot`` copies
    into every snapshot; a draft that declares none gets the key removed, a draft that declares one gets its
    colour and decoration."""
    declared = {**_css_link_focus(css), **(roles.get("link-focus") or {})}
    link = (((snap.get("styles") or {}).get("elements") or {}).get("link"))
    if not isinstance(link, dict):
        return
    if not declared:
        if link.pop(":focus-visible", None) is not None:
            trace.append({"kind": "declared", "what": "styles.elements.link.:focus-visible", "value": "(removed)",
                          "_source": "declared", "reason": "the draft declares no link focus look (no a:focus or "
                          "a:focus-visible rule in tokens/*.css or its CSS)"})
        return
    entry: dict = {}
    if "colour" in declared:
        entry["color"] = {"text": _colour_ref(snap, declared["colour"][0], ("link", "link-hover", "primary"), True)}
    if "decoration" in declared:
        entry["typography"] = {"textDecoration": declared["decoration"][0]}
    link[":focus-visible"] = entry
    trace.append({"kind": "declared", "what": "styles.elements.link.:focus-visible", "value": entry,
                  "_source": "declared", "reason": ", ".join(v[1] for v in declared.values())})


_CSS_RULE_RE = re.compile(r"([^{}]+)\{([^{}]*)\}")
_FOCUS_SEL_RE = re.compile(r":focus(?:-visible)?$")
_LINK_SEL_RE = re.compile(r"^a(?:[:.#\[]|$)")
_OUTLINE_STYLES = frozenset({"solid", "auto", "dashed", "dotted", "double", "groove", "ridge", "inset", "outset"})


def _focus_declarations(css: str, tokens: dict) -> dict:
    """The outline and shadow a draft's own ``:focus`` / ``:focus-visible`` rules declare.

    A bare ``:focus-visible`` rule is the draft's page-wide look and wins over a rule scoped to form controls; a
    link-only rule (``a:focus``) is the link focus look, not this one. Returns ``{width, style, colour, offset,
    shadow, source}`` with only the keys the CSS states."""
    best: tuple | None = None
    for m in _CSS_RULE_RE.finditer(re.sub(r"/\*.*?\*/", "", css or "", flags=re.S)):
        sels = [s.strip().lower() for s in m.group(1).split(",")]
        focus = [s for s in sels if _FOCUS_SEL_RE.search(s) and not _LINK_SEL_RE.match(s)]
        if not focus:
            continue
        found: dict = {}
        for decl in m.group(2).split(";"):
            prop, _, value = decl.partition(":")
            prop = prop.strip().lower()
            value = resolve_value(value.strip(), {k: v for k, v in tokens.items()})
            if prop in ("outline", "outline-width", "outline-style", "outline-color"):
                for part in re.split(r"\s+(?![^(]*\))", value):
                    if _PX_RE.match(part):
                        found["width"] = part
                    elif part in _OUTLINE_STYLES:
                        found["style"] = part
                    elif part in ("none", "0"):
                        found["none"] = True
                    elif parse_colour(part):
                        found["colour"] = parse_colour(part).hex
            elif prop == "outline-offset" and _is_length(value):
                found["offset"] = value
            elif prop == "box-shadow" and value.lower() != "none":
                found["shadow"] = value
        if "width" not in found:
            continue
        rank = 0 if any(s in (":focus-visible", ":focus") for s in focus) else 1
        if best is None or rank < best[0]:
            best = (rank, found, f"draft CSS {focus[0]} {{outline}}")
    if best is None:
        return {}
    return {**best[1], "source": best[2]}


def apply_focus_effect(snap: dict, roles: dict, tokens: dict, css: str, trace: list) -> None:
    """``settings.custom.focus`` carries the draft's own focus effect: its ring, and no framework glow.

    A draft that declares an outline on focus and no box-shadow gets width, ring, ringOnDark, offset, style,
    ``bloom`` 0, ``ringOnly`` 1 and ``source`` draft (the keys Fill's patch writes for a draft-declared ring), so the
    focused element shows the draft's ring alone. A draft that also declares a focus shadow keeps the framework's
    glow layers; only the ring keys are written. A draft that declares no outline on focus is left as it is."""
    found = _focus_declarations(css, tokens)
    if not found:
        return
    token_focus = roles.get("focus") or {}
    colour = found.get("colour") or (token_focus.get("colour") or (None,))[0]
    offset = found.get("offset") or "0px"
    written = {"width": found["width"], "offset": offset, "style": "auto" if found.get("style") == "auto" else "solid"}
    if colour:
        ring = _colour_ref(snap, colour, ("text", "primary", "accent"), False)
        written["ring"] = ring
        written["ringOnDark"] = ring
    if "shadow" not in found:
        written.update({"bloom": "0", "ringOnly": "1", "source": "draft"})
    snap.setdefault("settings", {}).setdefault("custom", {}).setdefault("focus", {}).update(written)
    kept = ("the draft also declares a focus box-shadow, so the framework glow layers stay" if "shadow" in found
            else "the draft declares no focus glow, so the ring stands alone (ringOnly 1, bloom 0)")
    trace.append({"kind": "declared", "what": "settings.custom.focus", "value": written, "_source": "declared",
                  "reason": f"{found['source']}; {kept}"})


def apply(snap: dict, draft_dir, trace: list, css: str = "") -> dict:
    """Write every declared value of an ``APPLIED_ROLES`` role into ``snap``; one trace row per value."""
    roles = read_roles(draft_dir)
    apply_link_focus(snap, roles, css, trace)
    tokens = read_token_css(draft_dir)[0]
    if not roles:
        apply_focus_effect(snap, roles, tokens, css, trace)
        return snap
    tracked = bool((roles.get("heading-tracking") or {}))
    for row in expectations(roles, snap):
        role, path, value = row["role"], row["path"], row["value"]
        if role not in APPLIED_ROLES:
            continue
        if role == "body-size":
            _set_body_size(snap, value)
        elif role == "body-colour":
            _set(snap, path, _colour_ref(snap, value, ("text",), True))
        elif role == "focus" and path.endswith(".ring"):
            _set(snap, path, _colour_ref(snap, value, ("text", "primary", "accent"), False))
        else:
            _set(snap, path, value)
        trace.append({"kind": "declared", "what": path, "value": value, "_source": "declared",
                      "reason": f"{row['source']} (the export's design system wins over the render)"})
    apply_focus_effect(snap, roles, tokens, css, trace)
    heading = (((snap.get("styles") or {}).get("elements") or {}).get("heading") or {}).get("typography") or {}
    if tracked and "letterSpacing" in heading:
        # A measured heading tracking is one level's px value; the draft states tracking per level instead.
        dropped = heading.pop("letterSpacing")
        trace.append({"kind": "declared", "what": "styles.elements.heading.typography.letterSpacing",
                      "value": "(removed)", "_source": "declared",
                      "reason": f"the token files state tracking per heading level; the measured {dropped} was one level's"})
    return snap
