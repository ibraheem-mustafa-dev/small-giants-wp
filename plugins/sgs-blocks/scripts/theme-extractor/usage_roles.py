"""Spec 33 usage-proposed fallback roles: neutral palette slots a README's wording did not fill.

A README that names its colours differently ("Canvas", "Text strong", "Line") gives the phrase table
nothing to match, yet the draft still USES a clear light ground, dark ink, mid-tone secondary text and
hairline colour. ``propose_roles`` lets the usage census PROPOSE a base slug for each by rank within its
dominant property family. Every proposal is advisory (the push step strips it back to the base theme's
value), traced, and only ever fills a slot no phrase and no measurement filled. Nothing names a client.
"""
from __future__ import annotations

import usage_census
from palette_vocab import (DARK_TEXT_MAX_LUMINANCE, LIGHT_MIN_LUMINANCE, MID_TONE_BAND, NON_NEUTRAL_SLUGS,
                           PROPOSAL_CONFIDENCE, PROPOSAL_EXCLUDING_SKIPS, PROPOSAL_MIN_FAMILY_SHARE, trace_row)


def luminance(hex6: str) -> float:
    """WCAG relative luminance of ``#RRGGBB`` (0 black .. 1 white)."""
    def channel(pair: str) -> float:
        c = int(pair, 16) / 255
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = (channel(hex6[i:i + 2]) for i in (1, 3, 5))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def _candidates(census: dict, declared_hexes: set[str], blocked: set[str]) -> dict[str, dict]:
    """Colours with a proven role (declared and used, or frequent) that sit almost wholly in ONE family."""
    promoted = usage_census.promote(census, declared_hexes)
    return {c: p for c, p in promoted.items()
            if c not in blocked and p["share"] >= PROPOSAL_MIN_FAMILY_SHARE}


def _ranked(cands: dict[str, dict], family: str, *, tone=None, order: str = "uses") -> list[str]:
    """Candidate hexes of one family (optionally within a luminance test), best first."""
    picked = [c for c, p in cands.items() if p["family"] == family and (tone is None or tone(luminance(c)))]
    if order == "dark":
        return sorted(picked, key=lambda c: (luminance(c), c))
    if order == "light":
        return sorted(picked, key=lambda c: (-luminance(c), c))
    return sorted(picked, key=lambda c: (-cands[c]["uses"], c))


def _open_slots(palette: list, taken: dict[str, str]) -> set[str]:
    """Slots no phrase or measurement filled and no earlier advisory guess holds."""
    held = {e["slug"] for e in palette if e.get("advisory")} | set(taken)
    return {"text", "text-inverse", "text-muted", "surface", "surface-alt", "border"} - held


def propose_roles(census: dict, declared_hexes: set[str], taken: dict[str, str], skipped: dict[str, str],
                  palette: list, trace: list) -> dict[str, tuple[str, float]]:
    """{slug: (HEX, confidence)} for open neutral slots, each traced as an advisory derivation."""
    blocked = {c for c, reason in skipped.items() if reason in PROPOSAL_EXCLUDING_SKIPS}
    blocked |= {c for slug, c in taken.items() if slug in NON_NEUTRAL_SLUGS}
    cands = _candidates(census, declared_hexes, blocked)
    open_slots = _open_slots(palette, taken)
    text_dark = _ranked(cands, "text", tone=lambda lum: lum <= DARK_TEXT_MAX_LUMINANCE, order="dark")
    text_light = _ranked(cands, "text", tone=lambda lum: lum >= LIGHT_MIN_LUMINANCE, order="light")
    text_mid = _ranked(cands, "text", tone=lambda lum: MID_TONE_BAND[0] <= lum < MID_TONE_BAND[1])
    light_grounds = _ranked(cands, "background", tone=lambda lum: lum >= LIGHT_MIN_LUMINANCE)
    plan = (("text", text_dark, "darkest text colour"),
            ("text-inverse", text_light, "lightest text colour"),
            ("text-muted", text_mid, "most-used mid-tone text colour"),
            ("surface", light_grounds, "most-used light background"),
            ("surface-alt", light_grounds, "next most-used light background"),
            ("border", _ranked(cands, "border"), "most-used border colour"))
    chosen: dict[str, tuple[str, float]] = {}
    used: set[str] = set()
    for slug, ranked, label in plan:
        already = used | ({taken["surface"]} if slug == "surface-alt" and "surface" in taken else set())
        pick = next((c for c in ranked if c not in already), None)
        if slug not in open_slots or pick is None:
            continue
        used.add(pick)
        chosen[slug] = (pick, PROPOSAL_CONFIDENCE)
        info = cands[pick]
        trace_row(trace, "derive", f"palette.{slug}",
                  f"advisory: {label} ({info['uses']} uses, {round(100 * info['share'])}% {info['family']}); "
                  "no README phrase and no measurement filled this slot", pick,
                  _source="derived", confidence=PROPOSAL_CONFIDENCE, advisory=True)
    return chosen
