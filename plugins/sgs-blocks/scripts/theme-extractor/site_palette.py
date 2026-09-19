"""Spec 33 declared-design overlay: a per-site palette built from what a draft DECLARES.

A Claude Design draft states its design system outside `<style>` `:root`: a README token table and
script-held accent variant sets. These become a site palette OVERLAY on the framework's base palette,
validated against how the colours are USED (usage_census):

* a README colour earns a slot only with a role in the vocabulary tables below AND consistent usage;
* placeholder-tier, third-party-widget and status colours stay literal hex on their blocks;
* variant-set (accent) colours reach elements only via `var(--acc)`, so the census cannot count them:
  they are accepted when the default option is present and the RENDERED custom property picks the
  active option;
* undeclared base slugs are untouched. Vocabulary is DATA; nothing here names a client.
"""
from __future__ import annotations

import re

import usage_census
from declared_sources import HEX_RE, normalise_hex
from palette import mix_hex

# --------------------------------------------------------------------------- vocabulary (data)

# README row (name + " " + use) matched case-insensitively. First matching row wins, so order runs
# from the most specific phrase to the most general.
SKIP_TABLE = (
    (r"\bfaint\b|\bplaceholder\b|\bdisabled\b", "placeholder-tier role: no palette slot"),
    (r"\bgoogle\b|\bwidget\b|\bthird[- ]party\b", "third-party widget colour: stays literal"),
    (r"\bordered in\b|\bout of stock\b|\bout-of-stock\b|\bbackorder", "status colour with no base slug"),
)
# (pattern, slugs, property families the role legitimately covers)
ALL_FAMILIES = ("text", "background", "border", "fill")
ROLE_TABLE = (
    (r"\bwhats\s?app\b", ("whatsapp",), ALL_FAMILIES),
    (r"\baccent ink\b|\bink accent\b", ("accent-text",), ("text", "fill")),
    (r"\b(?:ink|text) on dark\b", ("text-inverse", "primary-text"), ("text", "fill")),
    (r"\bpage background\b|\bbody background\b", ("surface",), ("background", "fill")),
    (r"\bwhite surface\b|^surface\b|\bcards?\b|\bpanels?\b", ("surface-alt",), ("background", "fill")),
    (r"\bbody text\b|\bparagraphs?\b", ("text-muted",), ("text", "fill")),
    (r"\bmuted text\b|\bspec labels?\b|\blabels?\b", ("text-label",), ("text", "fill")),
    (r"\bhairline\b|\bborders?\b|\bdividers?\b", ("border",), ("border", "background")),
    (r"\bsoft fill\b|\btint\b", ("accent-light",), ("background", "border", "fill")),
    (r"^accent\b", ("accent",), ALL_FAMILIES),
    (r"\bin stock\b|\bsuccess\b", ("success",), ALL_FAMILIES),
    (r"\bink\b|\bprimary text\b", ("text", "primary"), ALL_FAMILIES),
)
# Variant-set key -> palette slug.
VARIANT_KEY_TABLE = (
    (r"^(?:acc|accent)$", "accent"),
    (r"^ink$", "accent-text"),
    (r"^(?:soft|tint|light)$", "accent-light"),
)
ACCENT_SLUGS = ("accent", "accent-light", "accent-text")
# A colour whose census usage falls outside the role's families by more than this share drifts.
MAX_OFF_ROLE_SHARE = 0.25
# A README row needs at least this many census uses in its OWN role families.
MIN_ROW_USES = 1
SQUARE_RADIUS_RE = re.compile(r"^0+(?:px|rem|em)?(?![\d.])")
SQUARE_RADIUS_KEYS = ("small", "medium", "large")
PRIMARY_DARK_MIX = 0.25


def _log(trace: list, kind: str, what: str, reason: str, value: str | None = None, **extra) -> None:
    trace.append({"kind": kind, "what": what, **({"value": value} if value else {}), **extra,
                  "reason": reason})


def _classify(text: str):
    """(``skip``, reason) | (``role``, entry) | None for a README row's name + use."""
    for pattern, reason in SKIP_TABLE:
        if re.search(pattern, text, re.I):
            return "skip", reason
    return next((("role", e) for e in ROLE_TABLE if re.search(e[0], text, re.I)), None)


def _plan_rows(declared: dict, accent_supplied: bool, skipped: dict, trace: list) -> list[dict]:
    """Rows that want a palette slot, in README order; everything else is logged and dropped."""
    plan: list[dict] = []
    for row in declared.get("colours") or []:
        text = f"{row['name']} {row['use']}".strip()
        hexes = row.get("hexes") or []
        if not hexes:
            continue
        colour = hexes[0]
        verdict = _classify(text)
        if verdict is None:
            skipped[colour] = "no role in the vocabulary"
            _log(trace, "skip", row["name"], "README row has no recognised role: stays literal", colour)
        elif verdict[0] == "skip":
            skipped[colour] = verdict[1]
            _log(trace, "skip", row["name"], verdict[1], colour)
        else:
            _pattern, slugs, families = verdict[1]
            if accent_supplied and all(s in ACCENT_SLUGS for s in slugs):
                _log(trace, "skip", row["name"], "accent slugs are supplied by the script variant set", colour)
                continue
            plan.append({"row": row["name"], "colour": colour, "slugs": slugs, "families": set(families)})
    return plan


def _family_counts(entry: dict) -> dict[str, int]:
    fams = {f: entry["by_family"][f] for f in ALL_FAMILIES}
    fams["border"] += entry["by_family"]["outline"]
    return fams


def _off_role_share(entry: dict, allowed: set[str]) -> tuple[float, str]:
    """Share of a colour's uses outside ``allowed`` families, and a readable breakdown of them."""
    fams = _family_counts(entry)
    off = sorted(((n, f) for f, n in fams.items() if n and f not in allowed), key=lambda p: (-p[0], p[1]))
    total = entry["uses"] or 1
    return sum(n for n, _ in off) / total, " / ".join(f"{f} {round(100 * n / total)}%" for n, f in off)


def _row_uses(entry: dict, families: set[str]) -> tuple[int, str]:
    """Uses inside ONE row's own families, and a readable breakdown ("text 4, fill 1")."""
    fams = _family_counts(entry)
    mine = [(f, fams[f]) for f in ALL_FAMILIES if f in families and fams[f]]
    return sum(n for _, n in mine), ", ".join(f"{f} {n}" for f, n in mine)


def _map_readme_colours(declared: dict, accent_supplied: bool, census: dict, skipped: dict,
                        trace: list) -> dict[str, str]:
    """slug -> hex for README colours with a proven role. First row wins a contested slug.

    Two checks with different scope. Drift is a property of the COLOUR, so the off-role share is judged
    against the union of families every README row naming that hex allows (one hex can be both the page
    background and the ink on dark). The floor is a property of the ROW: it needs at least
    ``MIN_ROW_USES`` use in that row's OWN families, so a hex used only as text cannot also earn the
    page-background slug because another row of the table allows text. The floor stays at one use
    because a status colour legitimately has few. Rows whose role covers ``ALL_FAMILIES`` (accent,
    success, WhatsApp) can never be off-role, so their share check is a no-op by construction.
    """
    plan = _plan_rows(declared, accent_supplied, skipped, trace)
    used = usage_census.promote(census, {p["colour"] for p in plan})
    allowed: dict[str, set[str]] = {}
    for p in plan:
        allowed.setdefault(p["colour"], set()).update(p["families"])
    assigned: dict[str, str] = {}
    for p in plan:
        colour = p["colour"]
        if colour not in used:
            skipped[colour] = "declared but never used"
            _log(trace, "skip", p["row"], "declared but never used", colour)
            continue
        share, detail = _off_role_share(census[colour], allowed[colour])
        if share > MAX_OFF_ROLE_SHARE:
            skipped[colour] = f"used across families: {detail}"
            _log(trace, "skip", p["row"], f"drifting role, used across families: {detail}", colour)
            continue
        row_uses, row_detail = _row_uses(census[colour], p["families"])
        if row_uses < MIN_ROW_USES:
            _log(trace, "skip", p["row"], "no use in this row's own families "
                 f"({', '.join(sorted(p['families']))}): stays literal", colour)
            continue
        for slug in p["slugs"]:
            if slug in assigned:
                _log(trace, "skip", p["row"], f"slug {slug} already taken by {assigned[slug]}: first row wins",
                     colour)
                continue
            assigned[slug] = colour
            _log(trace, "declared", f"palette.{slug}",
                 f"README '{p['row']}', {row_uses} of {census[colour]['uses']} uses in its role's families "
                 f"({row_detail}), consistent with its role", colour)
    return assigned


def _slug_map(values: dict[str, str]) -> dict[str, str]:
    out: dict[str, str] = {}
    for key, colour in values.items():
        for pattern, slug in VARIANT_KEY_TABLE:
            if re.match(pattern, key, re.I):
                out.setdefault(slug, colour)
                break
    return out


def _rendered_option(mapped: dict[str, dict[str, str]], options: list[str], facts: dict) -> str | None:
    for prop in facts.get("customProps") or []:
        value = str(prop.get("value", "")).strip()
        if not HEX_RE.fullmatch(value):
            continue
        for option in options:
            if mapped[option].get("accent") == normalise_hex(value):
                return option
    return None


def _choose_accent_set(variant_sets: dict, facts: dict, trace: list) -> dict | None:
    for prop in sorted(variant_sets):
        spec = variant_sets[prop]
        mapped = {opt: _slug_map(vals) for opt, vals in spec["sets"].items()}
        if not all("accent" in m for m in mapped.values()):
            _log(trace, "skip", f"variant set {prop}", "an option has no accent colour")
            continue
        default = spec.get("default")
        if default not in mapped:
            _log(trace, "skip", f"variant set {prop}", "the default option's set is absent")
            continue
        rendered = _rendered_option(mapped, spec["options"], facts)
        active = rendered or default
        _log(trace, "declared", f"accentSets.{prop}", "active option " + (
            "confirmed by the rendered custom property" if rendered else "is the declared default"), active)
        sets = {opt: {s: m[s] for s in sorted(m) if s in ACCENT_SLUGS} for opt, m in sorted(mapped.items())}
        return {"prop": prop, "active": active, "sets": sets, "confirmed": rendered is not None}
    return None


def _title(slug: str) -> str:
    return slug.replace("-", " ").title()


def _overlay_palette(snap: dict, assigned: dict[str, str], trace: list,
                     advisory: frozenset[str] = frozenset()) -> None:
    """Replace base slugs in place with the assigned colours, each tagged ``_baseline_color`` (the base
    theme's hex, which the push script restores when stripping advisory; Pass B's entry carries it)."""
    pal = snap.setdefault("settings", {}).setdefault("color", {}).setdefault("palette", [])
    base_slugs = {e["slug"] for e in pal}
    out: list[dict] = []
    for entry in pal:
        slug = entry["slug"]
        base = entry.get("_baseline_color", entry.get("color"))
        if slug in assigned:
            out.append({"slug": slug, "color": assigned[slug], "name": entry.get("name", _title(slug)),
                        "_source": "declared", **({"advisory": True} if slug in advisory else {}),
                        "_baseline_color": base})
            _log(trace, "overlay", f"palette.{slug}", "base slug replaced in place", assigned[slug],
                 was=entry.get("color"))
        elif slug == "primary-dark" and "primary" in assigned:
            dark = mix_hex(assigned["primary"], "#000000", PRIMARY_DARK_MIX).upper()
            out.append({"slug": slug, "color": dark, "name": entry.get("name", _title(slug)),
                        "_source": "derived", "_baseline_color": base})
            _log(trace, "overlay", "palette.primary-dark",
                 f"derived: primary mixed {int(PRIMARY_DARK_MIX * 100)}% toward black", dark,
                 was=entry.get("color"))
        else:
            out.append(entry)
    for slug in sorted(s for s in assigned if s not in base_slugs):
        out.append({"slug": slug, "color": assigned[slug], "name": _title(slug), "_source": "declared"})
        _log(trace, "overlay", f"palette.{slug}", "new role-named slug appended (no base slug fits)",
             assigned[slug])
    snap["settings"]["color"]["palette"] = out


def _px(value) -> float | None:
    m = re.fullmatch(r"\s*(\d+(?:\.\d+)?)px\s*", value) if isinstance(value, str) else None
    return float(m.group(1)) if m else None


def _apply_layout(settings: dict, layout: dict, trace: list) -> None:
    content = layout.get("max_content_width")
    if not content:
        return
    target = settings.setdefault("layout", {})
    target["contentSize"] = content
    wide, narrow = _px(target.get("wideSize")), _px(content)
    if target.get("wideSize") is None or (wide is not None and narrow is not None and wide < narrow):
        target["wideSize"] = content
    _log(trace, "declared", "layout.contentSize",
         f"README max content width; wideSize {target['wideSize']} (never narrower)", content)


def _apply_radius(settings: dict, layout: dict, trace: list) -> None:
    text = str(layout.get("border_radius", "")).replace("`", "").strip()
    if not SQUARE_RADIUS_RE.match(text):
        return
    radius = settings.setdefault("custom", {}).setdefault("borderRadius", {})
    for key in SQUARE_RADIUS_KEYS:
        radius[key] = "0px"
    _log(trace, "declared", "custom.borderRadius",
         "README declares a square design; pill and other keys untouched", "0px")


def apply_declared_design(snap: dict, declared: dict, variant_sets: dict, census: dict, facts: dict,
                          trace: list) -> None:
    """Overlay the declared design system onto ``snap`` in place (palette, accent sets, layout, radius)."""
    accent = _choose_accent_set(variant_sets, facts, trace)
    skipped: dict[str, str] = {}
    assigned = _map_readme_colours(declared, accent is not None, census, skipped, trace)
    settings = snap.setdefault("settings", {})
    if accent:
        for slug, colour in accent["sets"][accent["active"]].items():
            assigned[slug] = colour
        settings.setdefault("custom", {})["accentSets"] = accent["sets"]
    unconfirmed = bool(accent) and not accent["confirmed"]
    if unconfirmed:
        _log(trace, "overlay", "palette.accent*", "accent not confirmed by a rendered custom property: "
             "advisory, so cached facts cannot make a wrong accent permanent")
    _overlay_palette(snap, assigned, trace, frozenset(ACCENT_SLUGS) if unconfirmed else frozenset())
    layout = declared.get("layout") or {}
    _apply_layout(settings, layout, trace)
    _apply_radius(settings, layout, trace)
    taken = set(assigned.values())
    for colours in (accent["sets"].values() if accent else ()):
        taken.update(colours.values())
    for colour, reason in usage_census.explain_rejections(census, taken).items():
        if colour not in skipped and colour not in taken:
            _log(trace, "skip", "census", reason, colour)
