"""token_families.py: every draft token family mirrors the draft, wired the way colour is (Spec 32 FR-32-29).

Written from the export's ``tokens/*.css`` (the same files ``shade_palette.py`` reads for colour). Each token whose value is
a literal becomes exactly one entry under its exact name without the leading ``--``:

  * a preset-list entry where WordPress has a list for the family: ``settings.typography.fontSizes`` (``size``),
    ``settings.spacing.spacingSizes`` (``size``), ``settings.typography.fontFamilies`` (the existing self-hosting entries
    stay and carry the faces) and ``settings.shadow.presets`` (``shadow``);
  * otherwise a key of ``settings.custom.<family>``: ``easing``, ``duration``, ``borderRadius``, ``fontWeight``,
    ``lineHeight``, ``letterSpacing`` and ``distance`` (WordPress prints ``--wp--custom--<family-kebab>--<token>``).

A per-width set (``--mm-h1-m``, ``-t``, ``-d``) is one entry per token. An alias (``var(--x)``), a colour or gradient (the
palette's) and a compound value (``104px 52px``, ``translateY(-3px)``) is no entry. A token whose name is a framework slot
of its own list is entered as ``<name>-token``.

The framework slots SGS's own code reads (font sizes ``small`` to ``hero``, spacing ``10`` to ``80``, and the ``duration``,
``easing``, ``borderRadius`` and ``distance`` keys) are hidden pointers: ``settings.custom.tokenRoles.<family>.<slot>`` names
the token the slot stands for, and the theme prints ``--wp--preset--font-size--<slot>: var(--wp--preset--font-size--<token>)``
(``theme/sgs-theme/inc/token-roles.php``). A slot is read from the job it does in the draft: ``regular`` is the token the
``body`` rule (or the body-size name) uses, ``hero``, ``xx-large``, ``x-large`` and ``large`` are the heading levels h1 to h4
at the draft's widest width, the ``gutter`` and ``section`` tokens answer spacing ``40``, ``70`` and ``80``, and the
hover movement timing's duration and easing answer ``fast`` and ``default``. Any other slot points at the token whose
value is nearest the slot's current value, provided it is close (``NEAR``); a slot with no close token (a ``linear`` easing
beside a draft that has only eased curves) stays a real entry carrying its framework value, so a generic slot never turns
into a different thing. The role map is a reading of the draft: no slot is ever a review row.

Nothing here names a client.
"""
from __future__ import annotations

import pathlib
import re

from colour import parse_colour
import declared_tokens as dt
from shade_palette import display_name, namespace_of
from palette_vocab import trace_row

_SLUG = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
_GRADIENT = re.compile(r"^(?:repeating-)?(?:linear|radial|conic)-gradient\(", re.I)
_LENGTH = re.compile(r"^-?\d*\.?\d+(?:px|rem|em)$|^0$")
_TIME = re.compile(r"^(\d*\.?\d+)(ms|s)$")
_EASING = re.compile(r"^(?:cubic-bezier|linear|steps)\(", re.I)
_EASING_WORDS = frozenset({"ease", "ease-in", "ease-out", "ease-in-out", "linear", "step-start", "step-end"})
_FAMILY_WORDS = re.compile(r"\b(?:serif|sans-serif|monospace|cursive|fantasy|system-ui|ui-[a-z-]+)\b", re.I)
_NUMBER = re.compile(r"^\d*\.?\d+$")
_PX_IN = re.compile(r"(-?\d*\.?\d+)px")
_LEVEL = re.compile(r"^h[1-6]$")
_BODY_RULE = re.compile(r"(?:^|[}\s,])body\s*\{([^}]*)\}", re.I)
_VAR_FONT_SIZE = re.compile(r"font-size\s*:\s*var\(\s*--([\w-]+)", re.I)
_COMMENT = re.compile(r"/\*.*?\*/", re.S)

# Where each preset-list family lives in a snapshot, and the entry's value key.
LISTS = {"fontSizes": (("typography", "fontSizes"), "size"), "spacing": (("spacing", "spacingSizes"), "size")}
FONT_FAMILIES = ("typography", "fontFamilies")
SHADOWS = ("shadow", "presets")
CUSTOM_FAMILIES = ("easing", "duration", "borderRadius", "fontWeight", "lineHeight", "letterSpacing", "distance")
POINTER_FAMILIES = ("fontSizes", "spacing", "duration", "easing", "borderRadius", "distance")
# The heading levels that answer the larger font-size slots, and the slots the section and gutter tokens answer.
LEVEL_SLOTS = {"h1": "hero", "h2": "xx-large", "h3": "x-large", "h4": "large"}
GUTTER_SLOT, SECTION_SLOTS = "40", ("70", "80")
# How close a token must be to a slot's current value to stand in for it (when no job names it).
NEAR_RATIO, NEAR_FLOOR = 0.34, {"fontSizes": 2.0, "spacing": 2.0, "borderRadius": 2.0, "distance": 2.0, "duration": 40.0}
NEAR_EASING = 0.3
_CANON_EASING = {"ease": (0.25, 0.1, 0.25, 1.0), "ease-in": (0.42, 0.0, 1.0, 1.0), "ease-out": (0.0, 0.0, 0.58, 1.0),
                 "ease-in-out": (0.42, 0.0, 0.58, 1.0), "linear": (0.0, 0.0, 1.0, 1.0)}


def _words(name: str) -> list[str]:
    return [w for w in re.split(r"[-_]+", name.lower()) if w]


def _is_length(value: str) -> bool:
    return bool(_LENGTH.match(value)) or value.startswith(("clamp(", "min(", "max(", "calc("))


def classify(name: str, value: str) -> str | None:
    """The family a literal token belongs to, or None for an alias, a colour, a gradient or a value no family holds."""
    v = value.strip()
    if not v or v.lower().startswith("var(") or _GRADIENT.match(v) or parse_colour(v) is not None:
        return None
    words = set(_words(name))
    if _EASING.match(v) or v.lower() in _EASING_WORDS:
        return "easing"
    if _TIME.match(v):
        return "duration"
    if "shadow" in words:
        return "shadow"
    if "radius" in words and (_is_length(v) or re.match(r"^\d*\.?\d+%$", v)):
        return "borderRadius"
    if (v[:1] in "'\"" or _FAMILY_WORDS.search(v)) and not _is_length(v):
        return "fontFamilies"
    if "weight" in words and re.match(r"^[1-9]00$", v):
        return "fontWeight"
    if words & {"lh", "leading"} and _NUMBER.match(v):
        return "lineHeight"
    if ("track" in words or "tracking" in words or {"letter", "spacing"} <= words) and re.match(r"^-?\d*\.?\d+(?:px|em|rem)$", v):
        return "letterSpacing"
    if "distance" in words and _LENGTH.match(v):
        return "distance"
    if _is_length(v) and (words & {"size", "fs", "hero", "lead", "text", "base"} or any(_LEVEL.match(w) for w in words)):
        return "fontSizes"
    if _is_length(v) and words & {"space", "gap", "gutter", "section", "pad", "padding"}:
        return "spacing"
    return None


def read(tokens: dict | None) -> dict:
    """``{"families": {family: [{"token", "value", "name"}]}, "skipped": [names], "ns"}`` from ``read_token_files`` output.

    Shared by the extractor and the completeness checks: the same classification names what must be in a snapshot."""
    out: dict[str, list] = {}
    skipped: list[str] = []
    if not tokens:
        return {"families": out, "skipped": skipped, "ns": None}
    rows = []
    for raw, value in tokens["tokens"].items():
        name = raw.lstrip("-").lower()
        family = classify(name, str(value))
        if family is None or not _SLUG.match(name):
            if parse_colour(str(value)) is None and not _GRADIENT.match(str(value).strip()) and not str(value).strip().lower().startswith("var("):
                skipped.append(name)
            continue
        rows.append((family, name, str(value).strip()))
    ns = namespace_of([n for _, n, _ in rows])
    for family, name, value in rows:
        out.setdefault(family, []).append({"token": name, "value": value, "name": display_name(name, ns)})
    return {"families": out, "skipped": skipped, "ns": ns}


# --- values -------------------------------------------------------------------------------------------------

def _scalar(value: str, family: str) -> float | None:
    """A comparable number: px for a length (``clamp`` and the like read at their widest px), ms for a time."""
    v = str(value).strip().lower()
    if family == "duration":
        m = _TIME.match(v)
        return float(m.group(1)) * (1000.0 if m.group(2) == "s" else 1.0) if m else None
    if v == "0":
        return 0.0
    m = re.match(r"^(-?\d*\.?\d+)(px|rem|em)$", v)
    if m:
        return float(m.group(1)) * (16.0 if m.group(2) != "px" else 1.0)
    found = [float(x) for x in _PX_IN.findall(v)]
    return max(found) if found else None


def _curve(value: str) -> tuple | None:
    v = str(value).strip().lower()
    if v in _CANON_EASING:
        return _CANON_EASING[v]
    m = re.match(r"^cubic-bezier\(\s*([^)]*)\)$", v)
    if not m:
        return None
    parts = [p.strip() for p in m.group(1).split(",")]
    try:
        nums = tuple(float(p) for p in parts)
    except ValueError:
        return None
    return nums if len(nums) == 4 else None


def _distance(family: str, a: str, b: str) -> float | None:
    """How far apart two values are in the family's own measure; None when either has none."""
    if family == "easing":
        ca, cb = _curve(a), _curve(b)
        return sum((x - y) ** 2 for x, y in zip(ca, cb)) ** 0.5 if ca and cb else None
    sa, sb = _scalar(a, family), _scalar(b, family)
    return abs(sa - sb) if sa is not None and sb is not None else None


def _near(family: str, want: str, got: str) -> bool:
    d = _distance(family, want, got)
    if d is None:
        return False
    if family == "easing":
        return d <= NEAR_EASING
    top = max(_scalar(want, family) or 0.0, _scalar(got, family) or 0.0)
    return d <= max(NEAR_FLOOR[family], NEAR_RATIO * top)


def nearest(family: str, want: str, candidates: list[dict]) -> dict | None:
    """The candidate closest to ``want`` that is also near it (ties go to the smaller value), else None."""
    scored = [(d, _scalar(c["value"], family) or 0.0, i, c) for i, c in enumerate(candidates)
              if (d := _distance(family, want, c["value"])) is not None and _near(family, want, c["value"])]
    return min(scored, key=lambda s: (s[0], s[1], s[2]))[3] if scored else None


# --- job readings -------------------------------------------------------------------------------------------

def _body_size_token(draft_dir) -> str | None:
    """The token the draft's ``body`` rule gives ``font-size`` (``body{font-size:var(--fs-body)}``)."""
    folder = pathlib.Path(draft_dir) / dt.TOKENS_DIR if draft_dir else None
    for path in sorted(folder.glob("*.css")) if folder and folder.is_dir() else []:
        css = _COMMENT.sub("", path.read_text(encoding="utf-8", errors="replace"))
        for rule in _BODY_RULE.finditer(css):
            m = _VAR_FONT_SIZE.search(rule.group(1))
            if m:
                return m.group(1).lower()
    return None


def _heading_tokens(sizes: list[dict]) -> dict[str, str]:
    """``{level: token}`` at the widest width the draft states (desktop, else the untiered token, tablet, mobile)."""
    by_level: dict[str, dict] = {}
    for row in sizes:
        m = dt.HEADING_SIZE_RE.match(row["token"])
        if m:
            by_level.setdefault("h" + m.group(1), {})[dt._TIER.get(m.group(2) or "", "default")] = row["token"]
    return {level: next(t[k] for k in ("desktop", "default", "tablet", "mobile") if k in t) for level, t in by_level.items()}


def _tier_tokens(rows: list[dict], pattern: re.Pattern) -> dict[str, str]:
    """``{tier: token}`` for the gutter or section tokens; an untiered token answers every tier the draft leaves unnamed."""
    named: dict[str, str] = {}
    for row in rows:
        m = pattern.match(row["token"])
        if m:
            named[dt._TIER.get(m.group(1) or "", "default")] = row["token"]
    if not named:
        return {}
    out, last = {}, None
    for tier in dt.TIERS:
        last = named.get(tier) or named.get("default") or last
        out[tier] = last
    first = next(out[t] for t in dt.TIERS if out[t])
    return {t: v or first for t, v in out.items()}


def _slot_values(snap: dict, baseline: dict, family: str) -> dict[str, str]:
    """``{slot: current value}``: the snapshot's own literal where it has one, else the framework's."""
    out: dict[str, str] = {}
    for source in (baseline, snap):
        settings = source.get("settings") or {}
        if family in LISTS:
            (a, b), key = LISTS[family]
            rows = (settings.get(a) or {}).get(b) or []
            for e in rows:
                if isinstance(e, dict) and isinstance(e.get("slug"), str) and isinstance(e.get(key), str):
                    out[e["slug"]] = e[key]
        else:
            for k, v in ((settings.get("custom") or {}).get(family) or {}).items():
                if isinstance(v, str) and not v.startswith("var("):
                    out[k] = v
    return out


def framework_slots(baseline: dict, family: str) -> list[str]:
    """The slots of ``family`` that the framework ``theme.json`` carries (file order)."""
    settings = baseline.get("settings") or {}
    if family in LISTS:
        (a, b), _ = LISTS[family]
        return [e["slug"] for e in (settings.get(a) or {}).get(b) or [] if isinstance(e, dict) and isinstance(e.get("slug"), str)]
    return list(((settings.get("custom") or {}).get(family) or {}).keys())


def read_roles(snap: dict, baseline: dict, families: dict, draft_dir, movement: dict | None, trace: list) -> dict:
    """``{family: {slot: token}}`` for every pointer family the draft has tokens in (see the module docstring)."""
    roles: dict[str, dict] = {}
    for family in POINTER_FAMILIES:
        rows = families.get(family) or []
        if not rows:
            continue
        slots = framework_slots(baseline, family)
        current = _slot_values(snap, baseline, family)
        chosen: dict[str, tuple[str, str]] = {}
        by_token = {r["token"]: r for r in rows}

        def job(slot: str, token: str | None, why: str) -> None:
            if token in by_token and slot in slots and slot not in chosen:
                chosen[slot] = (token, why)

        if family == "fontSizes":
            body = _body_size_token(draft_dir)
            if body is None:
                body = next((r["token"] for r in rows if dt.BODY_SIZE_RE.match(r["token"])), None)
            job("regular", body, "the draft's body text size")
            for level, token in _heading_tokens(rows).items():
                if level in LEVEL_SLOTS:
                    job(LEVEL_SLOTS[level], token, f"the draft's {level} size at its widest width")
        elif family == "spacing":
            gutter = _tier_tokens(rows, dt.GUTTER_RE)
            section = _tier_tokens(rows, dt.SECTION_RE)
            if gutter:
                job(GUTTER_SLOT, gutter["desktop"], "the draft's side gutter")
            if section:
                job(SECTION_SLOTS[0], section["mobile"], "the draft's section padding on mobile")
                job(SECTION_SLOTS[1], section["desktop"], "the draft's section padding on desktop")
        elif movement and family in ("duration", "easing"):
            want = movement["duration_ms"] if family == "duration" else movement["easing"]
            match = next((r["token"] for r in rows if (_scalar(r["value"], "duration") == float(want) if family == "duration"
                                                       else _curve(r["value"]) is not None and _curve(r["value"]) == _curve(str(want)))), None)
            job("fast" if family == "duration" else "default", match, "the draft's button and link transition")
        for slot in slots:
            if slot in chosen:
                continue
            hit = nearest(family, current.get(slot, ""), rows) if current.get(slot) else None
            if hit is not None:
                chosen[slot] = (hit["token"], f"nearest the slot's value {current[slot]}")
        roles[family] = {}
        for slot in slots:
            if slot in chosen:
                roles[family][slot] = _entry_slug(chosen[slot][0], set(slots))
                trace_row(trace, "role", f"tokenRoles.{family}.{slot}", chosen[slot][1], chosen[slot][0])
            else:
                trace_row(trace, "gap", f"tokenRoles.{family}.{slot}", "no draft token is close to this slot: it stays a real entry", current.get(slot, ""))
        if not roles[family]:
            del roles[family]
    return roles


# --- writing ------------------------------------------------------------------------------------------------

def _entry_slug(token: str, reserved: set[str]) -> str:
    return token + "-token" if token in reserved else token


def _px_key(value: str, family: str) -> float:
    s = _scalar(value, family)
    return s if s is not None else float("inf")


def _rewrite(node, renames: dict[str, str]):
    """Rename every ``--wp--custom--easing--<old>`` reference to the token that replaced the key."""
    if isinstance(node, dict):
        for k, v in node.items():
            node[k] = _rewrite(v, renames)
        return node
    if isinstance(node, list):
        return [_rewrite(v, renames) for v in node]
    if isinstance(node, str) and "--wp--custom--easing--" in node:
        return re.sub(r"(--wp--custom--easing--)([a-z0-9-]+)", lambda m: m.group(1) + renames.get(m.group(2), m.group(2)), node)
    return node


def _write_list(snap: dict, baseline: dict, family: str, rows: list[dict], pointed: dict[str, str]) -> None:
    (a, b), key = LISTS[family]
    settings = snap.setdefault("settings", {})
    section = settings.setdefault(a, {})
    framework = set(framework_slots(baseline, family))
    existing = [e for e in section.get(b) or [] if isinstance(e, dict) and isinstance(e.get("slug"), str)]
    tokens = {r["token"] for r in rows}
    entries = [{"slug": _entry_slug(r["token"], framework), "name": r["name"], key: r["value"]}
               for r in sorted(rows, key=lambda r: _px_key(r["value"], family))]
    base_rows = {e["slug"]: e for e in (((baseline.get("settings") or {}).get(a) or {}).get(b) or []) if isinstance(e, dict)}
    kept: list[dict] = []
    seen = {e["slug"] for e in entries}
    for slot in framework_slots(baseline, family):
        if slot in pointed or slot in seen:
            continue
        kept.append(next((e for e in existing if e["slug"] == slot), base_rows[slot]))
        seen.add(slot)
    others = [e for e in existing if e["slug"] not in seen and e["slug"] not in framework and e["slug"] not in tokens]
    section[b] = kept + others + entries


def apply(snap: dict, tokens: dict | None, draft_dir, baseline: dict, movement: dict | None, trace: list) -> dict:
    """Write every draft token family and ``settings.custom.tokenRoles`` into ``snap``; returns ``read``'s result.

    A draft with no token file leaves ``snap`` untouched (a starter keeps its generic slots as real entries)."""
    parsed = read(tokens)
    families = parsed["families"]
    if not families:
        return parsed
    settings = snap.setdefault("settings", {})
    custom = settings.setdefault("custom", {})
    roles = read_roles(snap, baseline, families, draft_dir, movement, trace)
    for family in LISTS:
        if families.get(family):
            _write_list(snap, baseline, family, families[family], roles.get(family, {}))
    if families.get("fontFamilies"):
        section = settings.setdefault(FONT_FAMILIES[0], {})
        have = {e.get("slug") for e in section.get(FONT_FAMILIES[1]) or [] if isinstance(e, dict)}
        for r in families["fontFamilies"]:
            slug = _entry_slug(r["token"], have)
            section.setdefault(FONT_FAMILIES[1], []).append({"slug": slug, "name": r["name"], "fontFamily": r["value"]})
            have.add(slug)
    if families.get("shadow"):
        section = settings.setdefault(SHADOWS[0], {})
        have = {e.get("slug") for e in section.get(SHADOWS[1]) or [] if isinstance(e, dict)}
        for r in families["shadow"]:
            slug = _entry_slug(r["token"], have)
            section.setdefault(SHADOWS[1], []).append({"slug": slug, "name": r["name"], "shadow": r["value"]})
            have.add(slug)
    renames: dict[str, str] = {}
    for family in CUSTOM_FAMILIES:
        rows = families.get(family) or []
        if not rows:
            continue
        group = custom.setdefault(family, {})
        framework = set(framework_slots(baseline, family))
        for slot in roles.get(family, {}):
            group.pop(slot, None)
        if family == "easing":
            for key in [k for k in group if k not in framework and any(_curve(group[k]) is not None and _curve(group[k]) == _curve(r["value"]) for r in rows)]:
                renames[key] = next(r["token"] for r in rows if _curve(r["value"]) == _curve(group[key]))
                del group[key]
        for r in rows:
            group[_entry_slug(r["token"], framework)] = r["value"]
    if renames:
        for k in [k for k in snap if k != "settings"]:
            snap[k] = _rewrite(snap[k], renames)
        for k in [k for k in settings if k != "custom"]:
            settings[k] = _rewrite(settings[k], renames)
        for k in [k for k in custom if k != "easing"]:
            custom[k] = _rewrite(custom[k], renames)
    custom["tokenRoles"] = roles
    _reference_derived(snap, families, trace)
    if not custom["tokenRoles"]:
        custom.pop("tokenRoles")
    return parsed


def _reference_derived(snap: dict, families: dict, trace: list) -> None:
    """Derived keys that state a token's own value reference the token: the gutter tiers and a heading size that is one token."""
    spacing = families.get("spacing") or []
    custom = snap["settings"]["custom"]
    tiers = _tier_tokens(spacing, dt.GUTTER_RE)
    for tier, token in tiers.items():
        custom.setdefault("gutter", {})[tier] = f"var(--wp--preset--spacing--{token})"
        trace_row(trace, "token", f"custom.gutter.{tier}", "the draft's gutter token", token)
    sizes = families.get("fontSizes") or []
    by_level: dict[str, list] = {}
    for row in sizes:
        m = dt.HEADING_SIZE_RE.match(row["token"])
        if m:
            by_level.setdefault("h" + m.group(1), []).append(row)
    elements = (snap.get("styles") or {}).get("elements") or {}
    for level, rows in by_level.items():
        typo = (elements.get(level) or {}).get("typography")
        if len(rows) == 1 and isinstance(typo, dict) and "fontSize" in typo:
            typo["fontSize"] = f"var:preset|font-size|{rows[0]['token']}"
            trace_row(trace, "token", f"styles.elements.{level}.typography.fontSize", "the draft's one token for this level", rows[0]["token"])
