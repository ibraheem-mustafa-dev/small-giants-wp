"""token_families.py: tokens are defaults, presets are the picker scale (Spec 32 FR-32-29).

Read from the export's ``tokens/*.css`` (the files ``shade_palette.py`` reads for colour). Each non-colour literal token ends
in exactly one of three places:

  * a DEFAULT: the token has a job and its value becomes that job's default. ``declared_tokens.py`` writes body text, each
    heading level (fluid per width), line heights, tracking, the gutters and the section padding per tier; this module writes
    ``settings.custom.borderRadius`` (``pill`` the pill-shaped token, ``medium`` the token equal to the primary button's
    radius, ``small`` and ``large`` the smallest and largest of the rest), ``settings.custom.duration.fast`` and
    ``settings.custom.easing.default`` (the draft's most used transition timing across its elements);
  * a PRESET: the framework's picker slots stay, valued from the draft's own scale. Font sizes ``small`` to ``hero`` (at most
    6, so the picker keeps its quick buttons) and spacing ``10`` to ``80`` (at most 8, so the picker keeps its slider) take
    the draft's most used scale tokens (``var(--token)`` references across the export), in ascending order, each slot named
    for the token it carries ("Gap 3"); the body size token is pinned to ``regular``. Which token each slot carries is
    recorded in ``settings.custom.presetTokens.<family>.<slot>``, the key the clone reads to write a preset reference where
    an element uses that token. A slot no token is assigned keeps its framework value;
  * a LITERAL: every other token (a one-off size, a shadow, a hit target, an outline) stays out of the snapshot and the
    clone writes its value where an element uses it.

Nothing here names a client.
"""
from __future__ import annotations

import math
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
    aliases = {a.lstrip("-").lower() for a in tokens.get("aliases") or ()}
    for raw, value in tokens["tokens"].items():
        name = raw.lstrip("-").lower()
        if name in aliases:
            continue
        family = classify(name, str(value))
        if family is None or not _SLUG.match(name):
            if parse_colour(str(value)) is None and not _GRADIENT.match(str(value).strip()) and not str(value).strip().lower().startswith("var("):
                skipped.append(name)
            continue
        rows.append((family, name, str(value).strip()))
    ns = namespace_of([n for _, n, _ in rows])
    for family, name, value in rows:
        label = display_name(name, ns)
        out.setdefault(family, []).append({"token": name, "value": value, "name": display_name(name, None) if label.replace(" ", "").isdigit() else label})
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



# --- scale presets -----------------------------------------------------------------------------------------

SCALE_SIZE = {"fontSizes": 6, "spacing": 8}
SPACING_WORDS = frozenset({"space", "gap"})


_DECL = re.compile(r"(font-size|(?:row-|column-)?gap|padding(?:-[a-z]+)?|margin(?:-[a-z]+)?)\s*:\s*([^;}\"'<]+)", re.I)


def usage_counts(draft_dir, rows: list[dict]) -> dict[str, int]:
    """``{token: uses}``: ``var(--token)`` references plus the declarations that state the token's own value
    (a draft that does not load its tokens states the value: ``font-size:14px``, ``gap:14px``, ``padding:6px 12px``)."""
    folder = pathlib.Path(draft_dir)
    text = ""
    for path in sorted(folder.glob("*.html")) + sorted((folder / dt.TOKENS_DIR).glob("*.css")):
        text += path.read_text(encoding="utf-8", errors="replace")
    stated: dict[tuple[str, str], int] = {}
    for prop, value in _DECL.findall(text):
        kind = "size" if prop.lower() == "font-size" else "space"
        for part in re.split(r"\s+", value.strip().lower()):
            stated[(kind, part)] = stated.get((kind, part), 0) + 1
    out = {}
    for r in rows:
        kind = "size" if classify(r["token"], r["value"]) == "fontSizes" else "space"
        refs = len(re.findall(r"var\(\s*--" + re.escape(r["token"]) + r"(?![\w-])", text))
        out[r["token"]] = refs + stated.get((kind, r["value"].lower()), 0)
    return out


def _assign(slots: list[tuple[str, float]], rows: list[dict], family: str) -> dict[str, dict]:
    """Ascending tokens onto ascending slots, injective, minimising the summed log ratio to the slot defaults."""
    vals = sorted(((_scalar(r["value"], family) or 0.0, r) for r in rows), key=lambda v: v[0])
    vals = vals[:len(slots)]
    n, m = len(vals), len(slots)
    if not n or not m:
        return {}

    def cost(i: int, j: int) -> float:
        return abs(math.log((vals[i][0] + 1.0) / (slots[j][1] + 1.0)))

    inf = float("inf")
    dp = [[inf] * (m + 1) for _ in range(n + 1)]
    for j in range(m + 1):
        dp[0][j] = 0.0
    for i in range(1, n + 1):
        for j in range(i, m + 1):
            dp[i][j] = min(dp[i][j - 1], dp[i - 1][j - 1] + cost(i - 1, j - 1))
    out: dict[str, dict] = {}
    i, j = n, m
    while i > 0:
        if j > i and dp[i][j] == dp[i][j - 1]:
            j -= 1
        else:
            out[slots[j - 1][0]] = vals[i - 1][1]
            i, j = i - 1, j - 1
    return out


def scale_tokens(family: str, rows: list[dict]) -> list[dict]:
    """The scale candidates of a preset family: spacing keeps its ``space`` and ``gap`` tokens (the gutters and the
    section padding are defaults)."""
    if family == "spacing":
        return [r for r in rows if set(_words(r["token"])) & SPACING_WORDS]
    return rows


def pick_scale(family: str, rows: list[dict], slots: list[tuple[str, float]], usage: dict[str, int],
               pinned: dict | None = None) -> dict[str, dict]:
    """``{slot: token row}``: the scale spans the draft's range. The smallest token in use and the largest token take the
    ends, the most used tokens fill between, all placed ascending; a pinned token (the body size) holds its own slot and
    the rest are placed on the other slots. A slot is left without a token only when the draft has fewer tokens than slots."""
    free = [(s, v) for s, v in slots if not pinned or s != pinned["slot"]]
    k = min(SCALE_SIZE[family] - (1 if pinned else 0), len(free))
    order = {r["token"]: i for i, r in enumerate(rows)}
    pool = [r for r in rows if not pinned or r["token"] != pinned["row"]["token"]]

    def val(r: dict) -> float:
        return _scalar(r["value"], family) or 0.0

    in_use = [r for r in pool if usage.get(r["token"], 0) > 0] or pool
    chosen: list[dict] = []
    if pool and k:
        chosen.append(min(in_use, key=lambda r: (val(r), order[r["token"]])))
        top = max(pool, key=lambda r: (val(r), -order[r["token"]]))
        if top not in chosen and k > 1:
            chosen.append(top)
    for r in sorted(pool, key=lambda r: (-usage.get(r["token"], 0), order[r["token"]])):
        if len(chosen) >= k:
            break
        if r not in chosen:
            chosen.append(r)
    placed = _assign(free, chosen, family)
    if pinned:
        placed[pinned["slot"]] = pinned["row"]
    return placed


def _widest_headings_only(rows: list[dict]) -> list[dict]:
    """Drop a heading level's narrower-width tokens: they are that level's per-width defaults, the widest is its scale entry."""
    keep = set(_heading_tokens(rows).values())
    return [r for r in rows if not dt.HEADING_SIZE_RE.match(r["token"]) or r["token"] in keep]


def _heading_tokens(rows: list[dict]) -> dict[str, str]:
    by_level: dict[str, dict] = {}
    for row in rows:
        m = dt.HEADING_SIZE_RE.match(row["token"])
        if m:
            by_level.setdefault("h" + m.group(1), {})[dt._TIER.get(m.group(2) or "", "default")] = row["token"]
    return {lv: next(t[k] for k in ("desktop", "default", "tablet", "mobile") if k in t) for lv, t in by_level.items()}


def _alias_target(draft_dir, tokens: dict | None) -> str | None:
    """The literal token a body-size alias (``--text-body-size: var(--size-16)``) names."""
    import shade_palette
    raw = shade_palette._raw_aliases(draft_dir)
    for alias, target in raw.items():
        if dt.BODY_SIZE_RE.match(alias):
            hops = 0
            while target in raw and hops < 8:
                target, hops = raw[target], hops + 1
            return target
    return None


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


def _body_pref(family: str, draft_dir, tokens: dict | None, rows: list[dict]) -> str | None:
    """The token that is the draft's body text size: the body rule's, an alias's target, else a body-size name."""
    if family != "fontSizes":
        return None
    return _body_size_token(draft_dir) or _alias_target(draft_dir, tokens) or next(
        (r["token"] for r in rows if dt.BODY_SIZE_RE.match(r["token"])), None)


def _one_per_value(rows: list[dict], usage: dict[str, int], prefer: str | None) -> list[dict]:
    """Two tokens with one value are one scale step: keep the preferred one, else the most used, else the first declared."""
    best: dict[str, dict] = {}
    for i, r in enumerate(rows):
        key = re.sub(r"\s+", "", r["value"].lower())
        held = best.get(key)
        rank = (r["token"] == prefer, usage.get(r["token"], 0))
        if held is None or rank > (held["token"] == prefer, usage.get(held["token"], 0)):
            best[key] = r
    keep = {id(r) for r in best.values()}
    return [r for r in rows if id(r) in keep]


def apply_scales(snap: dict, baseline: dict, families: dict, draft_dir, trace: list, tokens: dict | None = None) -> dict:
    """Value the framework slots from the draft's scale; returns ``{family: {slot: token}}`` (stored as presetTokens)."""
    carried: dict[str, dict[str, str]] = {}
    settings = snap.setdefault("settings", {})
    for family, ((a, b), key) in LISTS.items():
        rows = scale_tokens(family, families.get(family) or [])
        if family == "fontSizes":
            rows = _widest_headings_only(rows)
        if not rows:
            continue
        base_rows = [e for e in (((baseline.get("settings") or {}).get(a) or {}).get(b) or []) if isinstance(e, dict)]
        slots = [(e["slug"], _scalar(e[key], family) or 1.0) for e in base_rows]
        usage = usage_counts(draft_dir, rows)
        body = _body_pref(family, draft_dir, tokens, rows)
        rows = _one_per_value(rows, usage, body)
        pinned = None
        if family == "fontSizes":
            row = next((r for r in rows if r["token"] == body), None)
            if row is not None and any(s == "regular" for s, _ in slots):
                pinned = {"slot": "regular", "row": row}
        chosen = pick_scale(family, rows, slots, usage, pinned)
        existing = {e["slug"]: e for e in (settings.get(a) or {}).get(b) or [] if isinstance(e, dict) and isinstance(e.get("slug"), str)}
        out = []
        for e in base_rows:
            slot = e["slug"]
            if slot in chosen:
                out.append({"slug": slot, "name": chosen[slot]["name"], key: chosen[slot]["value"]})
                carried.setdefault(family, {})[slot] = chosen[slot]["token"]
                trace_row(trace, "token", f"{a}.{b}.{slot}",
                          f"the draft's scale token (used {usage.get(chosen[slot]['token'], 0)} time(s))", chosen[slot]["token"])
            else:
                out.append(e)
        framework = {e["slug"] for e in base_rows}
        settings.setdefault(a, {})[b] = out + [e for s, e in existing.items() if s not in framework]
    if carried:
        settings.setdefault("custom", {})["presetTokens"] = carried
    return carried


# --- defaults ----------------------------------------------------------------------------------------------

def _px(value: str) -> float | None:
    return _scalar(value, "borderRadius")


def read_radius_defaults(rows: list[dict], button_radius: str | None) -> dict[str, dict]:
    """``{slot: token row}`` for ``custom.borderRadius`` (see the module docstring)."""
    pills = [r for r in rows if r["value"].endswith("%") or (_px(r["value"]) or 0) >= 200]
    rest = sorted((r for r in rows if r not in pills), key=lambda r: _px(r["value"]) or 0)
    out: dict[str, dict] = {}
    long_pills = [r for r in pills if (_px(r["value"]) or 0) >= 200]
    if long_pills:
        out["pill"] = max(long_pills, key=lambda r: _px(r["value"]) or 0)
    if rest:
        out["small"], out["large"] = rest[0], rest[-1]
        want = _px(button_radius) if button_radius else None
        out["medium"] = next((r for r in rest if want is not None and _px(r["value"]) == want), rest[len(rest) // 2])
    return out


def apply_defaults(snap: dict, families: dict, movement: dict | None, trace: list) -> dict[str, list[str]]:
    """Write the radius, duration and easing defaults; returns ``{token: [paths]}`` for the tokens it used."""
    custom = snap.setdefault("settings", {}).setdefault("custom", {})
    used: dict[str, list[str]] = {}

    def put(path: tuple, row: dict, why: str) -> None:
        node = custom
        for k in path[:-1]:
            node = node.setdefault(k, {})
        node[path[-1]] = row["value"]
        used.setdefault(row["token"], []).append("settings.custom." + ".".join(path))
        trace_row(trace, "token", "settings.custom." + ".".join(path), why, row["token"])

    radius = families.get("borderRadius") or []
    if radius:
        button = ((custom.get("buttonPresets") or {}).get("primary") or {}).get("border-radius")
        for slot, row in read_radius_defaults(radius, button if isinstance(button, str) else None).items():
            put(("borderRadius", slot), row, "the draft's radius token for this role")
    if movement:
        dur = next((r for r in families.get("duration") or []
                    if _scalar(r["value"], "duration") == float(movement["duration_ms"])), None)
        if dur:
            put(("duration", "fast"), dur, "the draft's most used transition duration")
        want = _curve(str(movement["easing"]))
        ease = next((r for r in families.get("easing") or [] if want is not None and _curve(r["value"]) == want), None)
        if ease:
            put(("easing", "default"), ease, "the draft's most used transition easing")
    return used


def apply(snap: dict, tokens: dict | None, draft_dir, baseline: dict, movement: dict | None, trace: list) -> dict:
    """Value the picker scales and write the defaults this module owns; returns ``read``'s result.

    A draft with no token file leaves ``snap`` untouched (a starter keeps its generic slots as they are)."""
    parsed = read(tokens)
    if not parsed["families"]:
        return parsed
    custom = snap.setdefault("settings", {}).setdefault("custom", {})
    custom.pop("tokenRoles", None)
    apply_scales(snap, baseline, parsed["families"], draft_dir, trace, tokens)
    apply_defaults(snap, parsed["families"], movement, trace)
    where = accounting(snap, tokens, draft_dir)
    custom["defaultTokens"] = sorted(t for t, w in where.items() if w["where"] == "default")
    return parsed


# --- accounting --------------------------------------------------------------------------------------------

_RULE = re.compile(r"([^{}]+)\{([^{}]*)\}")
_VAR_REF = re.compile(r"var\(\s*--([\w-]+)")


def rule_defaults(draft_dir) -> dict[str, list[str]]:
    """``{token: [selector]}`` for tokens the token files' own ``body``, heading, ``a`` and ``button`` rules use."""
    out: dict[str, list[str]] = {}
    folder = pathlib.Path(draft_dir) / dt.TOKENS_DIR
    for path in sorted(folder.glob("*.css")) if folder.is_dir() else []:
        css = _COMMENT.sub("", path.read_text(encoding="utf-8", errors="replace"))
        for m in _RULE.finditer(css):
            selector = m.group(1).strip().lower()
            if selector.startswith((":root", "@")):
                continue
            if any(p.strip() in ("body", "a", "a:hover", "button") or _LEVEL.match(p.strip()) for p in selector.split(",")):
                for name in _VAR_REF.findall(m.group(2)):
                    out.setdefault(name.lower(), []).append(selector)
    return out


def accounting(snap: dict, tokens: dict | None, draft_dir) -> dict[str, dict]:
    """``{token: {"where": "default"|"preset"|"literal", ...}}`` for every non-colour literal token.

    A default: ``declared_tokens`` reads it for a job (its source names the token), a token-file rule uses it, or it is the
    value of a ``borderRadius``, ``duration`` or ``easing`` default this module wrote. A preset: ``presetTokens`` carries it
    (a token that is both reports ``default`` and the slot). Otherwise a literal."""
    parsed = read(tokens)
    names = {r["token"] for rows in parsed["families"].values() for r in rows} | set(parsed["skipped"])
    defaults: dict[str, list[str]] = {}
    for row in dt.expectations(dt.read_roles(draft_dir), snap):
        for name in re.findall(r"--([\w-]+)", row["source"]):
            defaults.setdefault(name.lower(), []).append(row["path"])
    for name, selectors in rule_defaults(draft_dir).items():
        defaults.setdefault(name, []).extend("styles " + s for s in selectors)
    custom = (snap.get("settings") or {}).get("custom") or {}
    radius = parsed["families"].get("borderRadius") or []
    if radius:
        button = ((custom.get("buttonPresets") or {}).get("primary") or {}).get("border-radius")
        for slot, r in read_radius_defaults(radius, button if isinstance(button, str) else None).items():
            defaults.setdefault(r["token"], []).append(f"settings.custom.borderRadius.{slot}")
    for family, slot in (("duration", "fast"), ("easing", "default")):
        value = (custom.get(family) or {}).get(slot) if isinstance(custom.get(family), dict) else None
        for r in parsed["families"].get(family) or []:
            if value is not None and r["value"] == value:
                defaults.setdefault(r["token"], []).append(f"settings.custom.{family}.{slot}")
    carried = {t: f"{fam}.{slot}" for fam, m in (custom.get("presetTokens") or {}).items() for slot, t in m.items()}
    out: dict[str, dict] = {}
    for name in sorted(names):
        if name in defaults:
            out[name] = {"where": "default", "paths": sorted(set(defaults[name]))}
            if name in carried:
                out[name]["slot"] = carried[name]
        elif name in carried:
            out[name] = {"where": "preset", "slot": carried[name]}
        else:
            out[name] = {"where": "literal"}
    return out
