"""Spec 33 declared-design overlay: a per-site palette built from what a draft DECLARES.

A Claude Design draft states its design system outside `<style>` `:root`: a README token table and
script-held accent variant sets. These become a site palette OVERLAY on the framework's base palette,
validated against how the colours are USED (usage_census):

* a README colour earns a slot only with a role in the vocabulary tables below AND consistent usage;
* placeholder-tier, third-party-widget and status colours stay literal hex on their blocks;
* variant-set (accent) colours reach elements only via `var(--acc)`, so the census cannot count them:
  they are accepted when the default option is present and the RENDERED custom property picks the
  active option;
* the rendered page wins over a README colour it contradicts, and the measured primary button gives
  `primary` (``declared_reconcile``); neutral slots no phrase filled get advisory usage proposals
  (``usage_roles``);
* undeclared base slugs are untouched. Vocabulary is DATA (``palette_vocab``); nothing here names a client.
"""
from __future__ import annotations

import re

import declared_layout
import declared_reconcile
import usage_census
import usage_roles
import variant_sets as variant_sets_mod
from palette import mix_hex
from palette_vocab import (ACCENT_SLUGS, ALL_FAMILIES, MAX_OFF_ROLE_SHARE, MIN_ROW_USES, PRIMARY_DARK_MIX,
                           ROLE_TABLE, SKIP_TABLE, trace_row)

_log = trace_row


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


def _title(slug: str) -> str:
    return slug.replace("-", " ").title()


def _overlay_palette(snap: dict, assigned: dict[str, str], trace: list,
                     advisory: frozenset[str] = frozenset(),
                     proposed: dict[str, tuple[str, float]] | None = None) -> None:
    """Replace base slugs in place with the assigned colours, each tagged ``_baseline_color`` (the base
    theme's hex, which the push script restores when stripping advisory; Pass B's entry carries it).
    ``proposed`` slots (usage-proposed fallbacks) are written as advisory derived entries."""
    proposed = proposed or {}
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
        elif slug in proposed:
            out.append({"slug": slug, "color": proposed[slug][0], "name": entry.get("name", _title(slug)),
                        "_source": "derived", "confidence": proposed[slug][1], "advisory": True,
                        "_baseline_color": base})
            _log(trace, "overlay", f"palette.{slug}", "base slug replaced in place by an advisory proposal",
                 proposed[slug][0], was=entry.get("color"))
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


def _report_unreadable_tables(declared: dict, trace: list) -> None:
    """FR-33-9: a README colour table the reader could not fully use is a trace gap, never a silent drop."""
    if declared.get("unreadable_tables"):
        _log(trace, "gap", "README colour table",
             f"a declared token table could not be read ({declared['unreadable_tables']} table(s) hold hex "
             "colours but yielded no row)")
    if declared.get("rows_without_hex"):
        _log(trace, "gap", "README colour table", "declared token rows carry no hex colour and cannot be "
             "mapped: " + ", ".join(declared["rows_without_hex"]))


def _readme_hexes(declared: dict) -> set[str]:
    return {h for row in declared.get("colours") or [] for h in row.get("hexes") or []}


def apply_declared_design(snap: dict, declared: dict, variant_sets: dict, census: dict, facts: dict,
                          trace: list) -> None:
    """Overlay the declared design system onto ``snap`` in place (palette, accent sets, layout, radius).

    Order: README phrase mapping, accent set, computed-wins reconciliation (FR-33-1), measured primary
    button, then advisory usage-proposed fallbacks for the neutral slots still open (only when a README
    table or variant set exists, so a static draft is never touched)."""
    _report_unreadable_tables(declared, trace)
    accent = variant_sets_mod.choose_accent_set(variant_sets, facts, trace)
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
    declared_reconcile.apply_computed(assigned, facts, trace)
    declared_reconcile.apply_measured_primary(snap, assigned, facts, trace)
    proposed: dict[str, tuple[str, float]] = {}
    if declared.get("colours") or variant_sets:
        proposed = usage_roles.propose_roles(census, _readme_hexes(declared), assigned, skipped,
                                             settings.get("color", {}).get("palette", []), trace)
    _overlay_palette(snap, assigned, trace, frozenset(ACCENT_SLUGS) if unconfirmed else frozenset(), proposed)
    layout = declared.get("layout") or {}
    declared_layout.apply_layout(settings, layout, trace)
    declared_layout.apply_radius(settings, layout, trace)
    taken = set(assigned.values()) | {colour for colour, _confidence in proposed.values()}
    for colours in (accent["sets"].values() if accent else ()):
        taken.update(colours.values())
    for colour, reason in usage_census.explain_rejections(census, taken).items():
        if colour not in skipped and colour not in taken:
            _log(trace, "skip", "census", reason, colour)
