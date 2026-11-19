"""presets.py — button presets, layout, and font families for the Spec 33 extractor.

Button presets are the DIFF between the rest-state and ``:hover``-state COMPUTED declarations, kept
as an open property bag (FR-33-4) — a hover that changes colour AND transform is captured whole.
Layout ``contentSize`` comes from the ``.container`` max-width (scan beyond ``:root``). Font families
carry the primary + full fallback stack; the draft's font ``<link>`` hrefs are recorded so the face
can be loaded (FR-33-3).
"""
from __future__ import annotations

import re

from colour import parse_colour
from palette_vocab import brand_colours

# Map a CLASSIC draft's button-variant class word → the theme preset slot (a draft with class-bearing buttons and no button
# component). The classic path can only name the three framework slots; a draft built under Spec 48A FR-48A-17 names its
# presets itself, as the versions of its Button component (`_component_presets`), and is not limited to these words.
_VARIANT_SLOT = [
    ("primary", "primary"),
    ("secondary", "secondary"),
    ("ghost", "outline"),
    ("outline", "outline"),
]

def _HEXME(v):
    """Serialise a computed colour preserving ALPHA: transparent → 'transparent', partial → rgba(),
    opaque → hex. Dropping alpha turns the draft's transparent buttons into opaque black (a real
    regression caught on the live secondary/outline CTAs)."""
    c = parse_colour(v)
    if c is None:
        return None
    if c.alpha <= 0.001:
        return "transparent"
    if c.alpha < 0.999:
        r, g, b = int(c.hex[1:3], 16), int(c.hex[3:5], 16), int(c.hex[5:7], 16)
        return f"rgba({r}, {g}, {b}, {round(c.alpha, 3)})"
    return c.hex


def _slot_for(classes: list) -> str | None:
    joined = " ".join(classes).lower()
    for token, slot in _VARIANT_SLOT:
        if token in joined:
            return slot
    return None


def _slot_for_button(b: dict) -> str | None:
    """Resolve a button's variant slot from its OWN classes first, then its ancestor context.

    The element that PAINTS the button is not always the element that NAMES the variant. SGS drafts
    put both on the same node (``a.sgs-button.sgs-button--ghost``); builder markup splits them (UAGB
    renders ``div.wp-block-uagb-buttons-child.outline > a.wp-block-button__link`` — variant on the
    wrapper, paint on the ``<a>``). measure.js now always MEASURES the painting element and carries
    the nearest ancestors' classes as context, so the slot can still be resolved.

    Own classes take precedence: nearest-name-wins keeps SGS drafts byte-identical (their variant is
    always on the element) and stops a distant wrapper hijacking a correctly self-labelled button.
    """
    slot = _slot_for(b.get("classes", []) or [])
    if slot:
        return slot
    return _slot_for(b.get("ancestorClasses", []) or [])


# (rest-key, css-key) pairs whose value is passed through verbatim when present.
_REST_PASSTHROUGH = [("borderTopWidth", "border-width"), ("borderTopLeftRadius", "border-radius"),
                     ("fontSize", "font-size"), ("fontWeight", "font-weight")]


def _authored_padding(paddings: dict) -> str | None:
    """The authored padding most of a signature's instances use (the first one met wins a tie)."""
    best = None
    for value, count in paddings.items():
        if best is None or int(count or 0) > int(paddings[best] or 0):
            best = value
    return best


def _rest_entry(rest: dict, paddings: dict | None = None) -> dict:
    """The resting-state preset fields (colours alpha-preserved, geometry verbatim).

    ``paddings`` is measure.js's census of the signature's AUTHORED paddings (instances padded like a bare
    element of their tag are left out of it). When the census is present its most used padding is the
    preset padding, and an empty census means no instance authors one, so none is emitted."""
    entry = {}
    for css_key, rest_key in (("background", "backgroundColor"), ("text", "color"),
                              ("border", "borderTopColor")):
        val = _HEXME(rest.get(rest_key, ""))
        if val:
            entry[css_key] = val
    for rest_key, css_key in _REST_PASSTHROUGH:
        if rest.get(rest_key):
            entry[css_key] = rest[rest_key]
    # letter-spacing / text-transform: "normal" and "none" are the CSS initials, i.e. nothing authored.
    for rest_key, css_key, initial in (("letterSpacing", "letter-spacing", "normal"),
                                       ("textTransform", "text-transform", "none")):
        if rest.get(rest_key) and rest[rest_key] != initial:
            entry[css_key] = rest[rest_key]
    # min-height: BOTH "auto" and "0px" are the CSS initial (unset) value — an element with no
    # authored min-height computes to one of them. Emitting "0px" asserts a floor of zero that the
    # draft never declared, and would override the framework's 48px WCAG touch-target floor with
    # nothing. Unset is a blind spot → leave the baseline standing. Mama's buttons declare a real
    # 48px/44px and still emit normally.
    if rest.get("minHeight") and rest["minHeight"] not in ("auto", "0px"):
        entry["min-height"] = rest["minHeight"]
    # Padding is measured on the painting element, so emit it rather than leaving the framework's
    # generic 12px/24px standing over a button whose real padding we know (4-value shorthand matches
    # the baseline's format). Only when a side is actually non-zero — an all-zero box is the
    # signature of a wrapper/unpadded node, and emitting "0px 0px 0px 0px" would assert a padding
    # reset the draft never expressed.
    if paddings is not None:
        sides = (_authored_padding(paddings) or "").split()
    else:
        sides = [rest.get(k) for k in ("paddingTop", "paddingRight", "paddingBottom", "paddingLeft")]
    if len(sides) == 4 and all(s for s in sides) and any(s != "0px" for s in sides):
        entry["padding"] = " ".join(sides)
    return entry


def _hover_diff(entry: dict, rest: dict, hover: dict) -> None:
    """Append the hover-state colours and transform to ``entry``.

    A hover colour the reading measured is written even when it equals the rest colour: the preset is
    laid over the framework baseline, whose own hover colours (a white hover text) would otherwise paint
    a hover the draft never has."""
    for css_key, hkey, base_key in (("hover-background", "backgroundColor", "background"),
                                    ("hover-text", "color", "text"),
                                    ("hover-border", "borderTopColor", "border")):
        val = _HEXME(hover.get(hkey, ""))
        if val:
            entry[css_key] = val
    tform = hover.get("transform")
    if tform and tform not in ("none", rest.get("transform")):
        entry["hover-transform"] = tform


# The three preset names the classic path maps to and the renderers always carry. Any other name in `buttonPresets` is a
# preset the renderers read only on a site that carries the switch `settings.custom.namedButtonPresets`, which
# `named_presets` finds and extract.py writes.
FRAMEWORK_SLOTS = ("primary", "secondary", "outline")
# Keys of `buttonPresets` that are not preset names: the site-wide `default` look and the block's own `link` and `custom` styles.
RESERVED_PRESET_KEYS = ("default", "link", "custom")
# The snapshot token that turns on presets under any name (the per-site switch; absent or false is off).
NAMED_PRESETS_SWITCH = "namedButtonPresets"


def named_presets(presets: dict | None) -> list:
    """The preset names beyond the three framework slots (reserved keys are not names), in the snapshot's order."""
    return [k for k in (presets or {}) if k not in FRAMEWORK_SLOTS and k not in RESERVED_PRESET_KEYS]

# Transition property -> the part of a button's hover look it moves, matching the renderers' three easings:
# hover-easing (movement), hover-easing-colour and hover-easing-shadow.
_MOVEMENT_PROPS = ("transform", "translate", "scale", "rotate")
_GROUP_ORDER = ("movement", "colour", "shadow")


def _split_top(value) -> list:
    """A computed comma list split at its top-level commas (a cubic-bezier() or rgb() keeps its own)."""
    out, depth, cur = [], 0, ""
    for ch in str(value or ""):
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth -= 1
        if ch == "," and depth == 0:
            out.append(cur.strip())
            cur = ""
        else:
            cur += ch
    if cur.strip():
        out.append(cur.strip())
    return out


def _groups_of(prop: str) -> tuple:
    prop = prop.strip().lower()
    if prop == "all":
        return _GROUP_ORDER
    if prop in _MOVEMENT_PROPS:
        return ("movement",)
    if prop == "box-shadow":
        return ("shadow",)
    if prop == "color" or prop.startswith("background") or (prop.startswith("border") and (
            prop.endswith("color") or prop in ("border", "border-top", "border-right", "border-bottom", "border-left"))):
        return ("colour",)
    return ()


def _seconds(value) -> float:
    m = re.match(r"^\s*(-?\d*\.?\d+)\s*(ms|s)\s*$", str(value or ""))
    if not m:
        return 0.0
    return float(m.group(1)) / (1000.0 if m.group(2) == "ms" else 1.0)


def _transition_groups(rest: dict) -> dict:
    """{group: (duration, easing, delay)} for each part of the look the resting transition animates (a zero-length
    entry animates nothing). A later entry for the same part wins, as in CSS; shorter lists repeat."""
    props = _split_top(rest.get("transitionProperty"))
    durs = _split_top(rest.get("transitionDuration")) or ["0s"]
    eases = _split_top(rest.get("transitionTimingFunction")) or ["ease"]
    delays = _split_top(rest.get("transitionDelay")) or ["0s"]
    out: dict = {}
    for i, prop in enumerate(props):
        dur, ease, delay = durs[i % len(durs)], eases[i % len(eases)], delays[i % len(delays)]
        for group in _groups_of(prop):
            out[group] = (dur, ease, delay)
    return {g: v for g, v in out.items() if _seconds(v[0]) > 0}


def _num_text(n: str) -> str:
    """A number as a person writes it in an easing: no leading zero, no trailing zeros ('0.30' -> '.3')."""
    v = float(n)
    text = f"{v:.4f}".rstrip("0").rstrip(".") if v != int(v) else str(int(v))
    return text.replace("0.", ".", 1) if text.startswith(("0.", "-0.")) else text


def _easing_text(value: str) -> str:
    """A computed easing in its written form: ``cubic-bezier(0.3, 1.6, 0.5, 1)`` -> ``cubic-bezier(.3,1.6,.5,1)``
    (the form the snapshot's easing tokens use); any other easing as computed."""
    value = str(value or "").strip()
    m = re.fullmatch(r"cubic-bezier\(([^)]*)\)", value)
    if not m:
        return value
    nums = [p.strip() for p in m.group(1).split(",")]
    try:
        return "cubic-bezier(" + ",".join(_num_text(n) for n in nums) + ")"
    except ValueError:
        return value


_SHADOW_COLOUR_RE = re.compile(r"(rgba?\([^)]*\)|hsla?\([^)]*\)|#[0-9a-fA-F]{3,8})")
_LENGTH_RE = re.compile(r"^-?\d*\.?\d+(px|em|rem)?$")


def _length_text(v: str) -> str:
    return "0" if _num(v) == 0 else v


def shadow_text(value) -> str | None:
    """A computed box-shadow written the way a person writes one: ``rgb(58, 42, 34) 4px 4px 0px 0px`` ->
    ``4px 4px 0 #3a2a22`` (zero lengths as 0, a zero spread left out, the colour last, alpha kept). ``none`` and
    an empty value give None; a layer that is not lengths plus one colour is kept exactly as computed."""
    if not value or str(value).strip() == "none":
        return None
    layers = []
    for layer in _split_top(value):
        m = _SHADOW_COLOUR_RE.search(layer)
        colour = _HEXME(m.group(1)) if m else None
        words = (layer[:m.start()] + " " + layer[m.end():] if m else layer).split()
        inset = "inset" in words
        lengths = [w for w in words if w != "inset"]
        if colour is None or not 2 <= len(lengths) <= 4 or not all(_LENGTH_RE.match(w) for w in lengths):
            return str(value)
        lengths = [_length_text(w) for w in lengths]
        if len(lengths) == 4 and lengths[3] == "0":
            lengths = lengths[:3]
        layers.append(" ".join((["inset"] if inset else []) + lengths + [colour]))
    return ", ".join(layers)


def _look(b: dict) -> str:
    """A short description of a button reading's look, for a trace row."""
    rest = b.get("rest", {}) or {}
    return (f"{_HEXME(rest.get('backgroundColor', '')) or '?'} fill, {_HEXME(rest.get('color', '')) or '?'} text, "
            f"{rest.get('borderTopWidth', '?')} {_HEXME(rest.get('borderTopColor', '')) or '?'} border, "
            f"radius {rest.get('borderTopLeftRadius', '?')}, {rest.get('fontSize', '?')}")


def _gap(trace: list, what: str, look: str, count, reason: str) -> None:
    trace.append({"kind": "gap", "what": what, "_source": "declared", "look": look, "count": int(count or 1),
                  "reason": reason})


def _changes_on_hover(entry: dict, rest: dict, hover: dict) -> set:
    """The parts of the look (``_GROUP_ORDER``) that the hover reading changes."""
    changed = set()
    for key in ("backgroundColor", "color", "borderTopColor"):
        if hover.get(key) and hover.get(key) != rest.get(key):
            changed.add("colour")
    if "hover-transform" in entry:
        changed.add("movement")
    if "hover-shadow" in entry:
        changed.add("shadow")
    return changed


def _pressed(states: dict, prop: str) -> str | None:
    """The pressed value of ``prop`` when pressing changes it, else None.

    A mouse press is ``:hover`` with ``:active`` (``pressed``); where that equals the hover look the draft's pressed
    rule may still declare a change that its own hover rule outranks in the sheet (measure-node.js readStates), so
    ``:active`` alone against the resting look decides, and its value is the pressed look the draft declares."""
    if states["pressed"].get(prop) != states["hover"].get(prop):
        return states["pressed"].get(prop) or ""
    if states["active"].get(prop) != states["rest"].get(prop):
        return states["active"].get(prop) or ""
    return None


def _whole_look(entry: dict, b: dict, slot: str, trace: list) -> None:
    """Add the shadows, the pressed look and the hover timing to ``entry`` (Spec 32 FR-32-19 key names).

    * ``shadow`` the resting shadow, ``hover-shadow`` the hover shadow when hovering changes it (``none`` when it
      goes), each written as lengths and a colour (``shadow_text``).
    * ``active-transform`` / ``active-shadow``: the pressed look (measure.js ``states``, read with transitions off)
      where pressing changes it (``_pressed``).
    * ``hover-transition``: the transition's duration; ``hover-easing`` the movement's easing (or the first part
      that eases when nothing moves), ``hover-easing-colour`` and ``hover-easing-shadow`` the colour and shadow
      easings, each where the draft's transition names that part.

    What the renderers cannot hold is a ``gap`` row naming the look: a pressed state that could not be read, a
    pressed colour change, a second duration or a delay, and a part that changes on hover with no transition while
    another part eases."""
    rest, hover = b.get("rest", {}) or {}, b.get("hover", {}) or {}
    what, look, count = f"buttonPresets.{slot}", _look(b), b.get("count", 1)
    shadow = shadow_text(rest.get("boxShadow"))
    if shadow:
        entry["shadow"] = shadow
    if hover.get("boxShadow") and hover.get("boxShadow") != rest.get("boxShadow"):
        entry["hover-shadow"] = shadow_text(hover["boxShadow"]) or "none"
    if "states" not in b:
        _gap(trace, what, look, count, "the facts carry no pressed reading (measured before measure.js read "
                                       "states), so no active-transform or active-shadow is written")
    elif not isinstance(b.get("states"), dict) or not all(
            isinstance(b["states"].get(s), dict) for s in ("rest", "hover", "active", "pressed")):
        _gap(trace, what, look, count, "the pressed state could not be forced on this button, so no "
                                       "active-transform or active-shadow is written")
    else:
        transform, shadow_now = _pressed(b["states"], "transform"), _pressed(b["states"], "boxShadow")
        if transform is not None:
            entry["active-transform"] = transform or "none"
        if shadow_now is not None:
            entry["active-shadow"] = shadow_text(shadow_now) or "none"
        moved = [k for k in ("backgroundColor", "color", "borderTopColor") if _pressed(b["states"], k) is not None]
        if moved:
            _gap(trace, what, look, count, f"pressing changes {', '.join(moved)}; no button preset key holds a "
                                           "pressed colour, so the pressed button keeps its hover colours")
    groups = _transition_groups(rest)
    if not groups:
        return
    order = [g for g in _GROUP_ORDER if g in groups]
    durations = [groups[g][0] for g in order]
    duration = groups["movement"][0] if "movement" in groups else max(durations, key=durations.count)
    entry["hover-transition"] = duration
    entry["hover-easing"] = _easing_text(groups[order[0]][1])
    if "colour" in groups:
        entry["hover-easing-colour"] = _easing_text(groups["colour"][1])
    if "shadow" in groups:
        entry["hover-easing-shadow"] = _easing_text(groups["shadow"][1])
    for g in order:
        if _seconds(groups[g][0]) != _seconds(duration):
            _gap(trace, what, look, count, f"the {g} transition lasts {groups[g][0]}; the renderers run every part "
                                           f"for one duration, so hover-transition is {duration}")
        if _seconds(groups[g][2]) != 0:
            _gap(trace, what, look, count, f"the {g} transition waits {groups[g][2]} before it starts; no button "
                                           "preset key holds a delay")
    for g in sorted(_changes_on_hover(entry, rest, hover) - set(groups)):
        _gap(trace, what, look, count, f"the {g} change snaps in the draft (its transition leaves it out); the "
                                       "renderers ease it over hover-transition")


def _write_preset(presets: dict, slot: str, b: dict, trace: list, row: dict, paddings=None) -> None:
    rest, hover = b.get("rest", {}) or {}, b.get("hover", {}) or {}
    entry = _rest_entry(rest, paddings)
    _hover_diff(entry, rest, hover)
    _whole_look(entry, b, slot, trace)
    presets[slot] = entry
    trace.append(dict({"kind": "preset", "slot": f"buttonPresets.{slot}"}, **row, keys=",".join(entry.keys())))


def _component_presets(facts: dict, trace: list) -> dict:
    """One preset per named version of the draft's button component (measure.js ``componentButtons``), under the
    version's own name, read whole from the component itself in the size most of that version's mounts use."""
    presets: dict = {}
    for c in facts.get("componentButtons") or []:
        name = str(c.get("version") or "")
        look = f"{c.get('component', '?')} version '{name}'"
        if not c.get("painted"):
            _gap(trace, f"buttonPresets.{name}", look, c.get("mounts", 0),
                 "the component drew no button when mounted with this version"
                 + (f" ({c['error']})" if c.get("error") else "") + ", so no preset is written")
            continue
        if not name or name in presets:
            _gap(trace, f"buttonPresets.{name}", look, c.get("mounts", 0),
                 "a second button component names the same version; the first one's look is the preset")
            continue
        b = dict(c, count=c.get("mounts", 0))
        _write_preset(presets, name, b, trace, {
            "_source": "declared", "variant_from": "component version",
            "reason": f"{c.get('component')} mounted with version '{name}'"
                      + (f" and size '{c['size']}'" if c.get("size") else "")
                      + f" as a {c.get('form', 'button')} ({c.get('mounts', 0)} mount(s); sizes {c.get('sizes') or {}})"
                      + ", read at rest, on hover and pressed"})
    return presets


def build_button_presets(facts: dict, trace: list, palette: list | None = None) -> dict:
    """Build ``settings.custom.buttonPresets`` from computed rest + hover + pressed button facts.

    A draft with a button component (``facts["componentButtons"]``) takes its presets from it, one per named
    version; the page's other buttons are drawn with their own styles and logged as gaps. Otherwise the presets
    come from the page's buttons: class-bearing ones by their variant word, then classless ones by look.

    ``palette`` (optional, the site palette built so far) only steers CLASSLESS slot inference; it never
    touches a class-bearing button."""
    presets = _component_presets(facts, trace)
    if presets:
        for b in facts.get("buttons", []) or []:
            _gap(trace, "buttonPresets", _look(b), b.get("count", 1),
                 "drawn where it stands with its own styles: a draft with a button component takes its presets "
                 "from the component's versions only")
        return presets
    for b in facts.get("buttons", []):
        slot = _slot_for_button(b)
        if not slot:
            if b.get("classes"):
                _gap(trace, "buttonPresets", _look(b), b.get("count", 1),
                     f"class-bearing button ({' '.join(b.get('classes', []))}) with no variant word")
            continue
        if slot in presets:
            _gap(trace, f"buttonPresets.{slot}", _look(b), b.get("count", 1),
                 f"a further look named {slot}; the first one met is the preset")
            continue
        _write_preset(presets, slot, b, trace, {
            "_source": "declared",
            "reason": f"computed rest+hover diff on the PAINTING element "
                      f"<{b.get('path', '?').split('>')[-1]} class='{' '.join(b.get('classes', []))}'>",
            "variant_from": "own classes" if _slot_for(b.get("classes", []) or []) else "ancestor wrapper context"},
            b.get("paddings"))
    _add_classless_presets(facts, presets, trace, *_palette_hints(palette))
    return presets


def _is_visible_border(rest: dict) -> bool:
    """A border that actually paints: at least 1px wide with a non-transparent colour."""
    try:
        width = float(str(rest.get("borderTopWidth", "0")).replace("px", "") or 0)
    except ValueError:
        return False
    return width >= 1 and _HEXME(rest.get("borderTopColor", "")) not in (None, "transparent")


# DATA. A button-shaped control taller than this is a card/tile link, not a button. Palette slugs whose
# colour marks a status control (success/error/info messaging), and every registry brand's colour (WhatsApp, Facebook
# and the rest), never become a general-purpose button variant.
MAX_BUTTON_HEIGHT = 96
NON_VARIANT_SLUGS = ("success", "error", "info")


def _palette_hints(palette: list | None) -> tuple[str | None, set]:
    """(palette ``primary`` hex, hexes of the brand/status slugs) from the palette built so far."""
    by_slug = {e.get("slug"): _HEXME(e.get("color", "")) for e in (palette or [])}
    exclude = {by_slug[s] for s in NON_VARIANT_SLUGS if by_slug.get(s, "") and by_slug[s].startswith("#")}
    if palette is not None:
        exclude |= brand_colours()
    primary = by_slug.get("primary")
    return (primary if primary and primary.startswith("#") else None), exclude


def _num(value) -> float:
    """Leading number of a computed length/percentage ('50%', '9999px', 12) or 0 when there is none."""
    m = re.match(r"^\s*(-?\d+(?:\.\d+)?)", str(value if value is not None else ""))
    return float(m.group(1)) if m else 0.0


def _is_real_button(b: dict) -> bool:
    """A classless candidate must be a labelled, non-icon call to action.

    A control that holds a state (measure.js ``stateControl``: aria-pressed, aria-checked, aria-selected,
    aria-expanded, or a radio/tab/switch/checkbox/option role) is a choice or disclosure whose paint is a
    selected or unselected look, so it never stands for a button style.

    Colour swatches, close buttons and other icon-only controls paint like buttons but say nothing
    about the site's CTA style: they need at least 2 visible characters, must not be a circle
    (radius 50%, or at least half the height on a roughly square box) and must not be a small
    square/pill up to 48x48. A control taller than ``MAX_BUTTON_HEIGHT`` is a card link.
    """
    if b.get("stateControl") or int(b.get("textLen", 0) or 0) < 2:
        return False
    w, h = _num(b.get("w")), _num(b.get("h"))
    if 0 < w <= 48 and 0 < h <= 48:
        return False
    if h > MAX_BUTTON_HEIGHT:
        return False
    radius = str((b.get("rest", {}) or {}).get("borderTopLeftRadius", ""))
    if abs(w - h) <= 4 and h > 0 and (radius.strip() == "50%" or (
            radius.strip().endswith("px") and _num(radius) >= h / 2)):
        return False
    return True


def _add_classless_presets(facts: dict, presets: dict, trace: list, primary_hint: str | None = None,
                           exclude: set | None = None) -> None:
    """Fill ``primary`` / ``secondary`` / ``outline`` from CLASSLESS buttons (Claude Design drafts).

    A classless button has no class of its own and no variant word on its section wrappers (a section
    class such as ``sgs-hero`` names the section, not the variant). A link that leaves the site
    (measure.js ``external``) wears the other site's look, and a control in the page's own header,
    footer or nav (``inChrome``) is site chrome, so neither is a candidate. The slot is INFERRED from
    its painted style signature (measure.js dedupes classless buttons on that signature and records
    ``count``). Among the opaque-background signatures the most frequent is ``primary`` and
    ``secondary`` is the one on a different ground that sits beside it in an action group
    (``_secondary_for``); a
    transparent-background signature with a visible border is ``outline``. Icon-only, swatch and
    state-holding controls are ignored (``_is_real_button``). Ranking is by descending count, then
    descending text length, then signature ascending, so the result is deterministic. A slot a
    class-bearing button already defined is never overwritten, so class-bearing drafts are untouched.

    Palette steering: an opaque signature whose background IS the site's palette ``primary`` takes the
    ``primary`` slot ahead of the ranking (two equally frequent signatures cannot otherwise be told
    apart), and a signature painted in a brand/status colour (``NON_VARIANT_SLUGS``) is skipped.
    """
    classless = [b for b in facts.get("buttons", []) if not b.get("classes") and _slot_for_button(b) is None]
    cands = []
    for b in classless:
        why = _not_a_candidate(b)
        if why:
            _gap(trace, "buttonPresets", _look(b), b.get("count", 1), why)
        else:
            cands.append(b)
    cands.sort(key=lambda b: (-int(b.get("count", 1) or 1), -int(b.get("textLen", 0) or 0),
                              str(b.get("classKey", ""))))
    opaque, outline = [], []
    for b in cands:
        rest = b.get("rest", {}) or {}
        bg = _HEXME(rest.get("backgroundColor", ""))
        if bg and bg.startswith("#") and bg not in (exclude or ()):
            opaque.append(b)
        elif bg == "transparent" and _is_visible_border(rest):
            outline.append(b)
        elif bg and bg.startswith("#"):
            _gap(trace, "buttonPresets", _look(b), b.get("count", 1),
                 "painted in a brand or status colour (a WhatsApp, success or error button), never a site preset")
        else:
            _gap(trace, "buttonPresets", _look(b), b.get("count", 1),
                 "neither an opaque fill nor a transparent fill with a visible border, so no slot fits its look")
    opaque.sort(key=lambda b: _HEXME(b["rest"].get("backgroundColor", "")) != primary_hint)  # stable
    chosen = ([("primary", opaque[0])] if opaque else []) + (
        [("secondary", _secondary_for(opaque[0], opaque[1:]))] if len(opaque) > 1 else [])
    chosen = [(slot, b) for slot, b in chosen if b is not None] + list(zip(("outline",), outline))
    written = set()
    for slot, b in chosen:
        if slot in presets:
            _gap(trace, f"buttonPresets.{slot}", _look(b), b.get("count", 1),
                 f"a class-bearing button already defined {slot}, so this unclassed look is not written")
            continue
        written.add(id(b))
        _write_preset(presets, slot, b, trace, {
            "_source": "derived",
            "reason": f"slot inferred from an unclassed style signature ({b.get('classKey', '')}), "
                      f"{int(b.get('count', 1) or 1)} occurrence(s), on the PAINTING element "
                      f"<{b.get('path', '?').split('>')[-1]}>",
            "variant_from": "unclassed style signature"}, b.get("paddings"))
    ground = _HEXME((opaque[0].get("rest", {}) or {}).get("backgroundColor", "")) if opaque else None
    for b in opaque + outline:
        if id(b) in written or any(b is c for _s, c in chosen):
            continue
        if b in opaque and _HEXME((b.get("rest", {}) or {}).get("backgroundColor", "")) == ground:
            why = "another shade or size of the primary's fill; the most used one is the primary preset"
        elif b in opaque:
            why = "a further filled look: primary and secondary are taken and no framework slot is left for it"
        else:
            why = "a further outlined look: outline is taken and no framework slot is left for it"
        _gap(trace, "buttonPresets", _look(b), b.get("count", 1), why)


def _not_a_candidate(b: dict) -> str | None:
    """Why a classless button reading never stands for a preset, or None when it is a candidate."""
    if b.get("external"):
        return "a link to another site wears that site's look, not the draft's"
    if b.get("inChrome"):
        return "site chrome (in the page's own header, footer or nav), not a call to action"
    if b.get("stateControl"):
        return "a control that holds a state (a chip, tab or toggle): its paint is a selected look, not a button style"
    if not _is_real_button(b):
        return "icon-only, a swatch, a circle or a card-sized link, not a labelled call to action"
    return None


def _secondary_for(primary: dict, rest_opaque: list) -> dict | None:
    """The secondary call to action: an opaque signature on a DIFFERENT ground from the primary's (a second
    shade of the same fill is the primary again, in another state or size). The one that most often sits
    beside the primary in the same action group (measure.js ``companions``) wins; without a companion the
    ranking order decides."""
    ground = _HEXME((primary.get("rest", {}) or {}).get("backgroundColor", ""))
    others = [b for b in rest_opaque if _HEXME((b.get("rest", {}) or {}).get("backgroundColor", "")) != ground]
    if not others:
        return None
    beside = primary.get("companions", {}) or {}
    paired = [b for b in others if int(beside.get(b.get("classKey", ""), 0) or 0) > 0]
    if paired:
        return max(paired, key=lambda b: int(beside.get(b.get("classKey", ""), 0) or 0))  # first wins a tie
    return others[0]


def content_size(base_rules: list, trace: list) -> str | None:
    """``.container``/``.section`` max-width or a ``--content-width`` token (scan beyond :root)."""
    best = None
    for sel, prop, value, _imp, _off in base_rules:
        if prop == "max-width" and re.search(r"\.(container|section|wrap)", sel):
            m = re.match(r"^\s*(\d+)px", value)
            if m:
                best = int(m.group(1))
                break
    if best:
        trace.append({"kind": "layout", "what": "contentSize", "_source": "declared",
                      "reason": f"container max-width {best}px", "value": f"{best}px"})
        return f"{best}px"
    return None


def font_links(html: str) -> list:
    """Every ``<link rel=stylesheet href=...fonts...>`` / ``@import`` font URL in the draft head."""
    out = []
    for m in re.finditer(r'<link[^>]+href=["\']([^"\']+)["\']', html, re.I):
        href = m.group(1)
        if "font" in href.lower():
            out.append(href)
    for m in re.finditer(r"@import\s+url\(([^)]+)\)", html, re.I):
        href = m.group(1).strip("'\"")
        if "font" in href.lower():
            out.append(href)
    return out
