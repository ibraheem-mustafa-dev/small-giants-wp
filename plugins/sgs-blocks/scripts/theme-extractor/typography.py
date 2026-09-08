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


BASE_FONT_SIZE_SLUG = "base"


def register_base_font_size_preset(settings: dict, base_styles: dict, trace: list) -> None:
    """Route the measured base body size through a NON-FLUID preset (FR-33-4).

    A literal ``styles.typography.fontSize`` is rewritten by WordPress's fluid-typography
    engine into a ``clamp()`` carrying WP's own 14px minimum-font-size floor — so a
    faithfully-measured 16px base renders **14px at 375px**. That is the draft's authored
    value silently recomputed, which FR-33-4 forbids ("never recomputed via WP's fluid
    formula — that changes the curve").

    A per-preset ``"fluid": false`` is WordPress's own opt-out, and the framework baseline
    ALREADY uses exactly this shape: its ``styles.typography.fontSize`` is
    ``var:preset|font-size|medium``, and ``medium`` carries ``"fluid": false``. The extractor
    diverged from that working pattern by emitting a raw px literal; this puts it back on it.

    Deliberately a NEW slug rather than retargeting ``medium``: patterns author ``medium``
    for their own reasons, and silently resizing it per client would change every one of
    them. Additive, so nothing existing shifts meaning.
    """
    size = base_styles.get("fontSize")
    if not isinstance(size, str) or not size or size.startswith("var:"):
        return  # nothing measured, or already a preset reference — leave it alone

    typo = settings.setdefault("typography", {})
    presets = typo.setdefault("fontSizes", [])

    for entry in presets:
        if entry.get("slug") == BASE_FONT_SIZE_SLUG:
            entry["size"] = size
            entry["fluid"] = False
            break
    else:
        # Insert in ascending size order so the editor's font-size picker stays sensible —
        # a "Base" 16px sitting after "Hero" 50px reads as a bug to the client.
        new = {"slug": BASE_FONT_SIZE_SLUG, "name": "Base", "size": size, "fluid": False}
        mine = _px(size, 16.0) or 0.0
        for i, entry in enumerate(presets):
            if (_px(str(entry.get("size", "")), 16.0) or 0.0) > mine:
                presets.insert(i, new)
                break
        else:
            presets.append(new)

    base_styles["fontSize"] = f"var:preset|font-size|{BASE_FONT_SIZE_SLUG}"
    trace.append({"kind": "base", "what": "settings.typography.fontSizes[base]", "_source": "declared",
                  "reason": "base body size routed through a non-fluid preset so WP's fluid engine "
                            "cannot recompute the draft's authored value (FR-33-4)",
                  "size": size, "fluid": False})


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


def heading_sizes(facts: dict, trace: list) -> dict:
    """Return each non-chrome heading tag's COMPUTED ``fontSize`` in px (FR-33-3).

    Emitted as a literal computed value on the SINGLE tag (mirrors how ``heading_base`` emits a
    literal ``lineHeight``) rather than by re-pointing the shared ``var:preset|font-size|*`` slug the
    framework baseline's ``styles.elements.h1..h6`` reference — those slugs (``hero``/``xx-large``/
    ``x-large``/``large``/``medium``/``small``) are SHARED with other elements (e.g. ``medium`` also
    drives ``styles.elements.button``), so rewriting a slug's size to match one heading level would
    silently change unrelated components. A literal per-tag override avoids that collision while still
    satisfying the iron law: the value shipped is the COMPUTED value on the really-rendered node.
    """
    root_px = _px(facts.get("root", {}).get("fontSize", "16px"), 16.0) or 16.0
    out = {}
    for tag in ("h1", "h2", "h3", "h4", "h5", "h6"):
        h = facts.get("headings", {}).get(tag)
        if not h or h.get("inChrome"):
            continue
        fs_px = _px(h.get("fontSize", ""), root_px)
        if fs_px:
            # Keep sub-pixel precision (e.g. 28.8px) — rounding to int would drift from the measured
            # value; strip a trailing ".0" so whole-px sizes stay clean (e.g. "50px" not "50.0px").
            out[tag] = f"{round(fs_px, 2):g}px"
    if out:
        trace.append({"kind": "base", "what": "styles.elements.h1..h6.typography.fontSize",
                      "_source": "declared",
                      "reason": "literal computed fontSize per non-chrome heading tag (overrides the "
                                "shared preset var for that tag only, no unrelated element touched)",
                      "sizes": out})
    return out


def heading_family(facts: dict) -> str:
    """Heading family ← first present computed h1/h2/h3 (FR-33-3)."""
    for tag in ("h1", "h2", "h3"):
        h = facts.get("headings", {}).get(tag)
        if h:
            return _primary_family(h.get("fontFamily", ""))
    return ""
