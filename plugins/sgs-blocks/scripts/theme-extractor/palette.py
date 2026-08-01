"""palette.py — build the theme colour palette from draft tokens (Spec 33 FR-33-1/2/9).

Token-first pipeline (corpus reality: the palette IS the draft's named ``:root`` colours):
  1. Split rules into RESTING vs interaction-STATE (``:hover``/``:focus``/``:active``); role identity
     comes ONLY from resting declarations (a hover that swaps bg→text must not classify text as
     "primary").
  2. For each SOLID (alpha=1) ``:root`` token, gather resting colour usages → infer role by
     usage-context (roles.py). Translucent (alpha<1) + decorative one-offs → TRACE, not the picker
     (FR-33-9). A declared-but-zero-usage token → gap-log (FR-33-1).
  3. ΔE≤1 dedup (alpha a separate axis).
  4. COMPUTED-VALIDATE per token AT ITS OWN measured node (body bg/text, button bg/text) — computed
     wins, divergence logged; no cross-token bucket overwrite.
  5. Map role buckets → the theme's 16 named slugs (within-role frequency rank); overflow/low-conf →
     ``custom-<name>``.
"""
from __future__ import annotations

import re

from colour import parse_colour, dedupe, delta_e
from roles import selector_role, _prop_family, infer_role

_STATE_RE = re.compile(r":(hover|focus|active|visited)")
_COLOUR_PROPS = {"background", "background-color", "color", "border-color",
                 "border-top-color", "border-bottom-color", "border-left-color",
                 "border-right-color", "outline-color", "fill"}

# The theme's 16 named palette slugs (Appendix B) — the slug vocabulary a token may claim.
BASELINE_SLUGS = ["primary", "primary-dark", "accent", "accent-text", "accent-light", "success",
                  "error", "whatsapp", "surface", "surface-alt", "text", "text-muted",
                  "text-inverse", "border-subtle", "border-light", "footer-bg"]

# HIGH-CONFIDENCE identity roles (placed FIRST by WHERE the colour is used, not its name) → the one
# slug that role owns. These claim their slug before any name-tiebreak runs, so e.g. the coral
# button-background always becomes `primary` even if another token is *named* similarly.
_IDENTITY_ROLE_SLUG = {
    "surface": "surface", "text": "text", "primary": "primary",
    "success": "success", "error": "error",
    # NOTE (2026-08-01, Spec 32/33 investigation): "surface-alt" is deliberately NOT added here. An
    # identity-role claim overrides a client's own named draft token (see PASS 1 vs PASS 2 order) —
    # that is correct for high-certainty roles like primary/success/error, but "background on a
    # content-selector" is a much weaker, easily-false-positived signal (any section/card counts), and
    # doing so broke the D318 regression guard (`test_client_colour_keeps_raw_token_slug_not_custom`):
    # a client's own named large-surface colour (`--surface-pink`) got silently renamed to the generic
    # `surface-alt` slug, exactly the kind of silent rename D318 exists to prevent. Distinct-surface-alt
    # guarantee is instead handled by the `_synthesise_surface_alt` fallback below, which only fires
    # when NOTHING (identity or name-tiebreak) already claimed the slug — it never overwrites a real
    # client token.
}
# A token NAME → baseline slug it may claim as a LOGGED tiebreak (Spec 33: name is a within-role
# tiebreak, never the primary signal). ``--border`` → ``border-subtle`` (the theme's border slug).
_NAME_ALIASES = {"border": "border-subtle"}


def _measured_token_values(root_tokens, resting_rules, facts):
    """Map ``token_name → computed hex`` for tokens that feed a MEASURED node (iron law, per-token)."""
    body = facts.get("body", {})
    measured = {}

    def token_of(value):
        m = re.search(r"var\(\s*--([a-zA-Z0-9-]+)", value or "")
        return m.group(1).lower() if m else None

    for sel, prop, value, _imp, _off in resting_rules:
        t = token_of(value)
        if not t:
            continue
        s = sel.strip().lower()
        if s == "body" and prop in ("background", "background-color"):
            c = parse_colour(body.get("backgroundColor", ""))
            if c:
                measured[t] = c.hex
        elif s == "body" and prop == "color":
            c = parse_colour(body.get("color", ""))
            if c:
                measured[t] = c.hex
    # buttons: the token feeding .sgs-button--primary background/color → computed button rest
    for b in facts.get("buttons", []):
        classes = " ".join(b.get("classes", [])).lower()
        if "primary" not in classes:
            continue
        rest = b.get("rest", {})
        for sel, prop, value, _imp, _off in resting_rules:
            if "primary" not in sel.lower() or _STATE_RE.search(sel):
                continue
            t = token_of(value)
            if not t:
                continue
            if prop in ("background", "background-color"):
                c = parse_colour(rest.get("backgroundColor", ""))
                if c:
                    measured[t] = c.hex
            elif prop == "color":
                c = parse_colour(rest.get("color", ""))
                if c:
                    measured[t] = c.hex
    return measured


def build_palette(root_tokens: dict, base_rules: list, facts: dict, trace: list) -> list:
    resting = [r for r in base_rules if not _STATE_RE.search(r[0])]
    measured = _measured_token_values(root_tokens, resting, facts)

    # Gather resting usage evidence per :root token.
    usage_by_token = {name: [] for name in root_tokens}
    for sel, prop, value, _imp, _off in resting:
        if prop not in _COLOUR_PROPS:
            continue
        for ref in re.findall(r"var\(\s*--([a-zA-Z0-9-]+)", value or ""):
            n = ref.lower()
            if n in usage_by_token:
                usage_by_token[n].append(
                    {"selector": sel, "role_ctx": selector_role(sel), "propfam": _prop_family(prop),
                     "property": prop, "name": n, "colour": parse_colour(root_tokens[n])})

    # Classify each SOLID token. EVERY declared :root colour is emitted (a named brand token is the
    # client's intentional palette — dropping it renames/breaks any block/pattern that references it
    # by slug, the D318 pink-regression). Only TRANSLUCENT one-offs → trace. A token with no resting
    # colour-usage still emits (role 'custom' → raw-name slug); "usage" only informs the ROLE, never
    # whether to emit.
    solid = []          # (name, Colour, first_offset)
    offset = 0
    for name in sorted(root_tokens):
        col = parse_colour(root_tokens[name])
        if col is None:
            continue
        if col.alpha < 0.999:
            trace.append({"kind": "gap", "reason": "translucent token → trace, not palette (decorative)",
                          "name": name, "value": root_tokens[name]})
            continue
        solid.append((name, col, offset))
        offset += 1

    clusters = dedupe(solid)

    assigned = []
    for cl in clusters:
        evs = []
        for nm in cl["names"]:
            evs.extend(usage_by_token.get(nm, []))
        role, conf, reason = infer_role([e for e in evs if e.get("colour")])
        assigned.append({"cluster": cl, "role": role, "conf": conf, "reason": reason, "freq": len(evs),
                         "names": cl["names"], "primary_name": cl["names"][0]})

    slug_of = {}       # id(cl) → slug
    slug_used = set()

    # PASS 1 — high-confidence identity roles claim their slug first (by usage-context, not name).
    for a in sorted(assigned, key=lambda a: (-a["conf"], -a["freq"], a["cluster"]["first_offset"])):
        want = _IDENTITY_ROLE_SLUG.get(a["role"])
        if want and want not in slug_used and a["conf"] >= 0.85:
            slug_of[id(a["cluster"])] = want
            slug_used.add(want)
            a["slug_reason"] = f"identity role {a['role']} (usage-context)"

    # PASS 2 — remaining tokens: NAME-tiebreak onto a free baseline slug (logged); else usage-role
    # secondary slug; else custom-<name> (conservation, FR-33-9).
    for a in sorted(assigned, key=lambda a: (a["cluster"]["first_offset"],)):
        if id(a["cluster"]) in slug_of:
            continue
        slug = None
        for n in a["names"]:
            cand = _NAME_ALIASES.get(n, n)
            if cand in BASELINE_SLUGS and cand not in slug_used:
                slug = cand
                a["slug_reason"] = f"name-tiebreak '{n}'→{cand} (usage role {a['role']} conf {a['conf']:.2f})"
                break
        if slug is None:
            # Keep the client colour's OWN draft-token name as the slug (NEVER a custom- prefix or a
            # dropped entry) so blocks that reference it by name resolve — the D318 pink regression
            # was `surface-pink` → `custom-surface-pink` breaking every block using --…--surface-pink.
            slug = a["primary_name"]
            a["slug_reason"] = f"raw draft-token slug (usage role {a['role']} conf {a['conf']:.2f}, no baseline match)"
        slug_of[id(a["cluster"])] = slug
        slug_used.add(slug)

    palette = []
    for a in assigned:
        cl = a["cluster"]
        slug = slug_of[id(cl)]
        declared_hex = cl["canonical"].hex
        emit_hex, snap = declared_hex, 0.0
        comp = next((measured[n] for n in a["names"] if n in measured), None)
        if comp and comp != declared_hex:
            snap = delta_e(comp, declared_hex)
            if snap > 1.0:
                trace.append({"kind": "reconcile", "slug": slug, "declared": declared_hex,
                              "computed": comp, "reason": f"computed wins (ΔE {snap:.2f}) role {a['role']}"})
            emit_hex = comp
        palette.append({"slug": slug, "color": emit_hex, "name": _title(slug), "_source": "declared"})
        trace.append({"kind": "token", "slug": slug, "_source": "declared", "role": a["role"],
                      "confidence": round(a["conf"], 2), "value": emit_hex,
                      "reason": a.get("slug_reason", a["reason"]), "usage": a["reason"],
                      "aliases": ", ".join(f"{n}={c.hex}" for n, c in cl["aliases"]),
                      "delta_e_snap": round(snap, 3)})

    _synthesise_surface_alt(palette, trace)

    palette.sort(key=lambda e: e["slug"])
    return palette


def _mix_hex(hex6: str, towards: str, amount: float) -> str:
    """Blend ``hex6`` toward ``towards`` (also a hex string) by ``amount`` (0..1)."""
    a = hex6.lstrip("#")
    b = towards.lstrip("#")
    ar, ag, ab = int(a[0:2], 16), int(a[2:4], 16), int(a[4:6], 16)
    br, bg, bb = int(b[0:2], 16), int(b[2:4], 16), int(b[4:6], 16)
    r = round(ar + (br - ar) * amount)
    g = round(ag + (bg - ag) * amount)
    bl = round(ab + (bb - ab) * amount)
    return "#{:02x}{:02x}{:02x}".format(r, g, bl)


def _relative_luminance(hex6: str) -> float:
    hexs = hex6.lstrip("#")
    r, g, b = int(hexs[0:2], 16) / 255.0, int(hexs[2:4], 16) / 255.0, int(hexs[4:6], 16) / 255.0
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def _synthesise_surface_alt(palette: list, trace: list) -> None:
    """FR-33-6 fallback (Spec 32/33 fix, 2026-08-01): guarantee a `surface-alt` that is genuinely
    distinct from `surface`, even when the draft carries no separate content-background signal (e.g. a
    single-background minimal draft with no card/panel element for roles.py to key on).

    Runs AFTER the identity/name-tiebreak passes so any genuinely-extracted `surface-alt` (real draft
    evidence) always wins — this only fires when nothing claimed the slug. Direction of the tint
    follows the resolved `surface` colour's own luminance (light surface → tint darker/greyer; dark
    surface → tint lighter), so the synthesised value is a plausible "raised" panel colour in either a
    light-mode or dark-mode draft, never a re-emission of `surface` itself.
    """
    slugs = {e["slug"] for e in palette}
    if "surface-alt" in slugs:
        return
    surface_entry = next((e for e in palette if e["slug"] == "surface"), None)
    if surface_entry is None:
        return
    surface_hex = surface_entry["color"]
    towards = "#000000" if _relative_luminance(surface_hex) > 0.5 else "#ffffff"
    synthesised = _mix_hex(surface_hex, towards, 0.06)
    palette.append({"slug": "surface-alt", "color": synthesised, "name": _title("surface-alt"),
                    "_source": "derived"})
    trace.append({"kind": "token", "slug": "surface-alt", "_source": "derived", "role": "surface-alt",
                 "confidence": 0.5, "value": synthesised,
                 "reason": "synthesised — no distinct content-background signal in draft; tinted from "
                           f"surface {surface_hex} (FR-33-6 fallback)", "usage": "synthesised",
                 "aliases": "", "delta_e_snap": 0.0})


def _title(slug: str) -> str:
    return slug.replace("custom-", "").replace("-", " ").title()
