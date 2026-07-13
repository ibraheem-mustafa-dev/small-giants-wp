"""roles.py — colour ROLE inference by usage-context (Spec 33 FR-33-2).

Role is inferred from WHERE a colour is used (which CSS property, on which selector role) + its
within-role frequency — NEVER from the token NAME and NEVER from cross-role raw frequency (the
corpus proves names are unreliable: ``#2E7D4F`` is ``--success`` on Mama's and ``--green`` on Indus;
and raw frequency inverts a palette — the most-frequent colour is body-text/border-grey, not the
brand primary). Frequency ranks only WITHIN a role bucket.

Output = each concrete colour tagged with a role + confidence + the evidence (selector/property),
which ``extract.py`` maps onto the theme's 16 named palette slugs (overflow → ``custom-<name>``).
"""
from __future__ import annotations

import re
from collections import defaultdict

from colour import parse_colour, Colour

# ── Selector-role classification (what KIND of element a selector targets) ───────────────────────
_SEL_BUTTON = re.compile(r"(\.btn|\.cta|button|\.sgs-button|\.wp-block-button)", re.I)
_SEL_LINK = re.compile(r"(^|[\s,>])a([:\s.\[]|$)", re.I)
_SEL_STATUS_SUCCESS = re.compile(r"(success|\.green|\.valid|instock)", re.I)
_SEL_STATUS_ERROR = re.compile(r"(error|\.red|\.danger|\.invalid|outofstock)", re.I)
_SEL_BASE = re.compile(r"^(:root|html|body|\*)$", re.I)


def selector_role(selector: str) -> str:
    s = selector.strip().lower()
    if _SEL_BASE.match(s):
        return "base"
    if _SEL_STATUS_SUCCESS.search(s):
        return "success"
    if _SEL_STATUS_ERROR.search(s):
        return "error"
    if _SEL_BUTTON.search(s):
        return "interactive"
    if _SEL_LINK.search(s):
        return "link"
    return "content"


# Priority-ordered rule table: (css_property, selector_role) → (candidate_role, priority, confidence).
# Higher priority wins when a colour matches several signals. Confidence feeds the ``custom`` floor.
_RULES = [
    # property-prefix, selector_role(s), role, priority, confidence
    ("background", ("base",),         "surface",       90, 0.95),
    ("background", ("content",),      "surface-alt",   55, 0.70),
    ("color",      ("base",),         "text",          88, 0.95),
    ("background", ("interactive",),  "primary",       85, 0.90),
    ("background", ("link",),         "primary",       80, 0.85),
    ("color",      ("interactive",),  "on-interactive", 60, 0.75),
    ("color",      ("link",),         "link-colour",   70, 0.80),
    ("background", ("success",),      "success",       95, 0.95),
    ("color",      ("success",),      "success",       95, 0.95),
    ("background", ("error",),        "error",         95, 0.95),
    ("color",      ("error",),        "error",         95, 0.95),
    ("border",     ("base", "content", "interactive"), "border-subtle", 50, 0.70),
    ("color",      ("content",),      "text",          45, 0.60),
]

CONFIDENCE_FLOOR = 0.55  # below → ``custom`` (conservation, FR-33-9), never a mis-slugged guess.


def _prop_family(prop: str) -> str:
    if prop in ("background", "background-color"):
        return "background"
    if prop == "color":
        return "color"
    if prop.startswith("border") and prop.endswith("color"):
        return "border"
    if prop == "border-color":
        return "border"
    return prop


def _var_refs(value: str):
    return re.findall(r"var\(\s*(--[a-zA-Z0-9-]+)", value or "")


def collect_colour_usages(root_tokens: dict, base_rules: list) -> dict:
    """Map each concrete colour → list of usage evidences ``{selector, role, property, propfam}``.

    A rule value may be a literal colour OR ``var(--name)``; a var resolves through ``root_tokens``.
    Only colour-bearing properties (background*, color, border*-color) are scanned.
    """
    usages: dict = defaultdict(list)
    colour_props = {"background", "background-color", "color", "border-color",
                    "border-top-color", "border-bottom-color", "border-left-color",
                    "border-right-color", "outline-color", "fill"}
    for sel, prop, value, _imp, _off in base_rules:
        if prop not in colour_props:
            continue
        propfam = _prop_family(prop)
        srole = selector_role(sel)
        # resolve concrete colours in the value (a var → token; else a literal)
        candidates = []
        for ref in _var_refs(value):
            tok = root_tokens.get(ref[2:].lower())
            c = parse_colour(tok) if tok else None
            if c:
                candidates.append((ref[2:].lower(), c))
        lit = parse_colour(value)
        if lit:
            candidates.append((None, lit))
        for name, col in candidates:
            usages[col.key].append(
                {"selector": sel, "role_ctx": srole, "property": prop, "propfam": propfam,
                 "name": name, "colour": col}
            )
    return usages


def infer_role(evidences: list) -> tuple:
    """Given a colour's usage evidences, return ``(role, confidence, reason)``.

    Applies the priority-ordered rule table; the highest-priority matching rule wins. No confident
    match (below floor / no evidence) → ``('custom', conf, reason)`` — never a forced slug.
    """
    best = None  # (priority, role, confidence, reason)
    for ev in evidences:
        pf, sr = ev["propfam"], ev["role_ctx"]
        for prop_pat, roles_ctx, role, prio, conf in _RULES:
            if pf == prop_pat and sr in roles_ctx:
                reason = f"{ev['property']} on {sr}-selector ({ev['selector']})"
                if best is None or prio > best[0]:
                    best = (prio, role, conf, reason)
    if best is None or best[2] < CONFIDENCE_FLOOR:
        reason = best[3] if best else "no confident usage-context match"
        return ("custom", best[2] if best else 0.0, reason)
    return (best[1], best[2], best[3])
