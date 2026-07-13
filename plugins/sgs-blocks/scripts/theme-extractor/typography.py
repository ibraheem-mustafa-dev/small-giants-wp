"""typography.py — base + heading typography from COMPUTED nodes (Spec 33 FR-33-3, the drift-killer).

D303 was caused by trusting a DECLARED value (and, worse, a hero-section override lifted into the
GLOBAL h1). This module reads only COMPUTED facts and picks the REPRESENTATIVE base:

  * body base = the computed style of the longest non-chrome main-content ``<p>`` (the canonical body
    copy), NOT the ``body{}`` selector — so the brand quote inherits the real 16px, not a theme 18px.
  * heading base line-height = the MODE ratio across non-chrome headings; the hero's 1.15 is an
    outlier (one vote) and is excluded by construction — the global 1.2 (h2+h3) wins. No fabricated
    ``1.15``/letter-spacing is ever synthesised.
  * ``rem`` resolves against the REAL computed ``documentElement`` font-size, never a hardcoded 16.
"""
from __future__ import annotations

import re
from collections import Counter

_NUM_RE = re.compile(r"^([0-9.]+)")


def _px(value: str, root_px: float) -> float | None:
    """Resolve a computed length to px. Browser computed values are already px, but be unit-aware
    for rem/em against the REAL root (never assume 16)."""
    if not value:
        return None
    v = value.strip().lower()
    m = _NUM_RE.match(v)
    if not m:
        return None
    n = float(m.group(1))
    if v.endswith("rem") or v.endswith("em"):
        return n * root_px
    return n  # px (computed) or unitless number


def _ratio(line_height: str, font_size: str, root_px: float):
    lh = _px(line_height, root_px)
    fs = _px(font_size, root_px)
    if lh is None or fs is None or fs == 0:
        # unitless line-height (rare in computed) → use directly
        m = _NUM_RE.match((line_height or "").strip())
        return round(float(m.group(1)), 3) if m and "px" not in line_height else None
    return round(lh / fs, 3)


def _primary_family(fam: str) -> str:
    return (fam or "").split(",")[0].strip().strip('"\'')


def representative_paragraph(facts: dict) -> dict | None:
    """The longest non-chrome, main-content ``<p>`` — the canonical body copy (FR-33-3)."""
    paras = [p for p in facts.get("paragraphs", []) if not p.get("inChrome")]
    if not paras:
        return None
    # longest text = the body-copy paragraph; ties → largest area then first.
    paras.sort(key=lambda p: (-p.get("textLen", 0), -p.get("area", 0)))
    return paras[0]


def base_typography(facts: dict, trace: list) -> dict:
    """Return ``styles.typography`` for the theme base body, computed-driven."""
    root_px = _px(facts.get("root", {}).get("fontSize", "16px"), 16.0) or 16.0
    p = representative_paragraph(facts)
    body = facts.get("body", {})
    fam = _primary_family((p or body).get("fontFamily", ""))
    fs_px = _px((p or body).get("fontSize", ""), root_px)
    lh = _ratio((p or body).get("lineHeight", ""), (p or body).get("fontSize", ""), root_px)
    weight = (p or body).get("fontWeight", "400")
    out = {
        "fontFamily": "var:preset|font-family|body",
        "fontSize": f"{int(fs_px)}px" if fs_px else "16px",
        "lineHeight": str(lh) if lh else "1.6",
        "fontWeight": str(weight or "400"),
    }
    trace.append({"kind": "base", "what": "styles.typography", "_source": "declared",
                  "reason": f"computed on representative <p> '{(p or {}).get('textSample','body')[:32]}'",
                  "fontSize": out["fontSize"], "lineHeight": out["lineHeight"], "root_px": root_px})
    return out


def heading_base(facts: dict, trace: list) -> dict:
    """Return the base heading line-height (MODE ratio, hero outlier excluded) + letter-spacing.

    Only emits letter-spacing if the MAJORITY of non-chrome headings declare a non-``normal`` value
    (Mama's = ``normal`` → omitted; never synthesise the fabricated tracking).
    """
    root_px = _px(facts.get("root", {}).get("fontSize", "16px"), 16.0) or 16.0
    headings = facts.get("headings", {})
    ratios = []
    ls_values = []
    for tag in ("h1", "h2", "h3", "h4", "h5", "h6"):
        h = headings.get(tag)
        if not h or h.get("inChrome"):
            continue
        r = _ratio(h.get("lineHeight", ""), h.get("fontSize", ""), root_px)
        if r is not None:
            ratios.append(r)
        ls = (h.get("letterSpacing", "") or "").strip().lower()
        ls_values.append("normal" if ls in ("", "normal") else ls)
    lh = None
    if ratios:
        lh = Counter(ratios).most_common(1)[0][0]  # MODE — hero outlier loses to the majority
    ls_mode = Counter(ls_values).most_common(1)[0][0] if ls_values else "normal"
    out = {"lineHeight": str(lh) if lh else "1.2"}
    if ls_mode != "normal":
        out["letterSpacing"] = ls_mode
    trace.append({"kind": "base", "what": "styles.elements.heading", "_source": "declared",
                  "reason": f"mode line-height ratio {lh} across non-chrome headings "
                            f"(ratios={sorted(set(ratios))}); hero outlier excluded",
                  "lineHeight": out["lineHeight"], "letterSpacing": out.get("letterSpacing", "(omitted)")})
    return out


def heading_family(facts: dict) -> str:
    """Heading family ← first present computed h1/h2/h3 (FR-33-3)."""
    for tag in ("h1", "h2", "h3"):
        h = facts.get("headings", {}).get(tag)
        if h:
            return _primary_family(h.get("fontFamily", ""))
    return ""
