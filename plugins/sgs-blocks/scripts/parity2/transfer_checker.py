"""
transfer_checker.py — Module 3: Cloning-Fidelity Transfer Checker
=================================================================

PURPOSE
-------
Given:
  - draft_nodes   : list[NodeRecord]  (the draft DOM capture; the 100 % denominator)
  - clone_nodes   : list[NodeRecord]  (the cloned WP page DOM capture)
  - fate_of       : callable(node) -> {"fate", "block", "note"}  (wired in from Module 2)

Produce a FATE-AWARE audit of how much of the draft's content + CSS transferred to the
clone.  Matching is done by CONTENT / CLASS / SECTION — never by domPath.

NodeRecord schema (both draft and clone):
  { "domPath": str, "tag": str, "classes": [str], "section": str,
    "text": str, "css": {prop: value}, "media": {"src","alt"}|None,
    "imgNaturalW": int|None }

Fate values: "chrome" | "emit-block" | "lift-attr" | "fold-parent"
Fate dict:   {"fate": str, "block": str, "note": str}

VERDICTS
--------
  CHROME      — header/footer/nav chrome; excluded from denominator entirely.
  TRANSFERRED — content present AND ≤ 1 css prop dropped.
  FOLDED      — fold-parent and the fold-relevant props found on the parent block in clone.
  DROPPED     — content missing OR > 1 meaningful css prop dropped.

UK English throughout.  Pure stdlib, no third-party dependencies.

PUBLIC API
----------
  check(draft_nodes, clone_nodes, fate_of) -> result dict  (see RETURN SHAPE below)

RETURN SHAPE
------------
{
  "score_pct": float,
  "totals": {
    "draft_total": int, "chrome": int,
    "transferred": int, "folded": int, "dropped": int
  },
  "by_node": [
    { "classes": [str], "section": str, "fate": str,
      "verdict": str, "content_ok": bool,
      "css_dropped": [str], "clone_match": str | None }
  ],
  "by_class": {
    "<bem-class>": {
      "transferred": int, "folded": int, "dropped": int,
      "sample_dropped_props": [str]
    }
  }
}
"""

from __future__ import annotations

import math
import re
import sys
from typing import Callable

# ---------------------------------------------------------------------------
# Fold-relevant CSS properties (the set we inspect when fate == "fold-parent")
# ---------------------------------------------------------------------------
_FOLD_PROPS = frozenset({
    "display", "flex-direction", "flex-wrap",
    "grid-template-columns", "grid-template-rows",
    "gap", "row-gap", "column-gap",
    "max-width", "width",
    "padding", "padding-top", "padding-right", "padding-bottom", "padding-left",
    "background", "background-color", "background-image",
})

# ---------------------------------------------------------------------------
# CSS normalisation helpers
# ---------------------------------------------------------------------------

def _normalise_text(text: str) -> str:
    """Lower-case + collapse all whitespace to a single space."""
    return re.sub(r"\s+", " ", text.strip().lower())


def _parse_px(value: str) -> float | None:
    """
    Convert a CSS length to pixels (float).
    Supports: px, rem (1 rem == 16 px), unitless 0.
    Returns None if the value is not a numeric length.
    """
    v = value.strip()
    if v == "0" or v == "0px":
        return 0.0
    m = re.match(r"^([+-]?[\d.]+)(px|rem)$", v)
    if not m:
        return None
    num = float(m.group(1))
    unit = m.group(2)
    if unit == "rem":
        num *= 16.0
    return num


def _parse_rgb(value: str) -> tuple[int, int, int] | None:
    """
    Parse a colour value into (R, G, B) integers.
    Accepts: rgb(r,g,b), rgba(r,g,b,a), #rrggbb, #rgb, #rrggbbaa.
    Returns None on failure.
    """
    v = value.strip().lower()

    # rgb / rgba
    m = re.match(r"rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)", v)
    if m:
        return int(m.group(1)), int(m.group(2)), int(m.group(3))

    # hex
    v = v.lstrip("#")
    if len(v) in (3, 4):          # short-form
        v = v[0] * 2 + v[1] * 2 + v[2] * 2
    if len(v) in (6, 8):          # strip optional alpha
        try:
            return int(v[0:2], 16), int(v[2:4], 16), int(v[4:6], 16)
        except ValueError:
            pass
    return None


def _colour_delta(a: str, b: str) -> float:
    """Euclidean RGB distance.  Returns inf if either value cannot be parsed."""
    ca = _parse_rgb(a)
    cb = _parse_rgb(b)
    if ca is None or cb is None:
        return math.inf
    return math.sqrt(sum((x - y) ** 2 for x, y in zip(ca, cb)))


_LENGTH_PROPS = re.compile(
    r"(width|height|padding|margin|gap|font-size|line-height|border)",
    re.IGNORECASE,
)
_COLOUR_PROPS = re.compile(
    r"(color|background|border-color|outline)",
    re.IGNORECASE,
)
_TEXT_ALIGN_EQUIV = {
    "start": "left",
    "end": "right",
    "left": "left",
    "right": "right",
    "center": "center",
    "centre": "center",
    "justify": "justify",
}


def _props_match(prop: str, draft_val: str, clone_val: str) -> bool:
    """
    Return True if draft_val and clone_val are considered equivalent for `prop`.

    Tolerances
    ----------
    textAlign:   start == left, end == right.
    length props: equal if within ±2 px OR ±2 %.
    colour props: ΔE (Euclidean RGB) ≤ 8.
    everything else: exact string match after lower-casing + strip.
    """
    dv = draft_val.strip()
    cv = clone_val.strip()

    if dv.lower() == cv.lower():
        return True

    # text-align
    if prop.lower() in ("text-align", "textalign"):
        return _TEXT_ALIGN_EQUIV.get(dv.lower()) == _TEXT_ALIGN_EQUIV.get(cv.lower())

    # colour properties
    if _COLOUR_PROPS.search(prop):
        return _colour_delta(dv, cv) <= 8.0

    # length properties
    if _LENGTH_PROPS.search(prop):
        dpx = _parse_px(dv)
        cpx = _parse_px(cv)
        if dpx is not None and cpx is not None:
            # absolute tolerance
            if abs(dpx - cpx) <= 2.0:
                return True
            # relative tolerance (avoid div-by-zero)
            base = max(abs(dpx), abs(cpx))
            if base > 0 and abs(dpx - cpx) / base <= 0.02:
                return True

    return False


def _is_vendor_prefixed(prop: str) -> bool:
    return prop.startswith(("-webkit-", "-moz-", "-ms-", "-o-"))


# ---------------------------------------------------------------------------
# Clone-node matching helpers
# ---------------------------------------------------------------------------

def _bem_classes(node: dict) -> list[str]:
    """Return the BEM classes (those starting with 'sgs-') from a node."""
    return [c for c in node.get("classes", []) if c.startswith("sgs-")]


def _shared_bem(draft: dict, clone: dict) -> int:
    """Count of shared BEM classes between two nodes."""
    ds = set(_bem_classes(draft))
    cs = set(_bem_classes(clone))
    return len(ds & cs)


def _text_contained(draft: dict, clone: dict) -> bool:
    """True if the draft's normalised text appears inside the clone node's text."""
    dt = _normalise_text(draft.get("text") or "")
    ct = _normalise_text(clone.get("text") or "")
    return bool(dt) and dt in ct


def _find_best_match(
    draft_node: dict,
    clone_pool: list[dict],
    *,
    section: str,
    strategy: str,       # "emit" or "fold"
    fate_block: str,
) -> dict | None:
    """
    Find the best-matching clone node for *draft_node* within *section*.

    Strategy "emit":
      Priority: (a) shared BEM class → (b) text containment → (c) same tag + nearest text.

    Strategy "fold":
      Find the clone node whose class list contains *fate_block* (the parent block slug,
      e.g. "sgs-hero") within the same section.
    """
    section_pool = [n for n in clone_pool if n.get("section") == section]

    if strategy == "fold":
        # A fold-parent node folds into its parent block. fate_block names that block
        # when known (e.g. "sgs/hero"); when None (the common __inner case) the parent
        # is the SECTION's own composite block — derive "sgs-<section>".
        if fate_block:
            bem = fate_block.replace("sgs/", "sgs-").replace("/", "-")
        else:
            bem = ("sgs-" + section) if section else ""
        candidates = [n for n in section_pool if bem and bem in _bem_classes(n)]
        if candidates:
            return candidates[0]
        # Fallback: fold props live on the section root container — use the
        # shallowest node in the section so we still compare grid/gap/padding.
        return section_pool[0] if section_pool else None

    # strategy == "emit"
    # (a) shared BEM class — highest score wins
    scored = [(n, _shared_bem(draft_node, n)) for n in section_pool]
    scored.sort(key=lambda x: x[1], reverse=True)
    if scored and scored[0][1] > 0:
        return scored[0][0]

    # (b) text containment
    dt = _normalise_text(draft_node.get("text") or "")
    if dt:
        for n in section_pool:
            if dt in _normalise_text(n.get("text") or ""):
                return n

    # (c) same tag + nearest (first) candidate
    tag = draft_node.get("tag", "").lower()
    for n in section_pool:
        if n.get("tag", "").lower() == tag:
            return n

    return None


# ---------------------------------------------------------------------------
# CSS comparison
# ---------------------------------------------------------------------------

def _compare_css(
    draft_css: dict,
    clone_css: dict,
    *,
    fold_only: bool = False,
) -> list[str]:
    """
    Compare draft CSS to clone CSS.

    *draft is the denominator* — only score props the draft actually has.
    Vendor-prefixed props are ignored.

    Returns a list of property names that did NOT transfer (dropped).

    If *fold_only* is True, only inspect _FOLD_PROPS.
    """
    dropped: list[str] = []
    for prop, draft_val in draft_css.items():
        if _is_vendor_prefixed(prop):
            continue
        if fold_only and prop not in _FOLD_PROPS:
            continue
        clone_val = clone_css.get(prop)
        if clone_val is None:
            dropped.append(prop)
            continue
        if not _props_match(prop, draft_val, clone_val):
            dropped.append(prop)
    return dropped


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

def check(
    draft_nodes: list[dict],
    clone_nodes: list[dict],
    fate_of: Callable[[dict], dict],
) -> dict:
    """
    Compute cloning-fidelity transfer results.

    Parameters
    ----------
    draft_nodes : list[dict]   NodeRecord list from the draft page capture.
    clone_nodes : list[dict]   NodeRecord list from the cloned WP page capture.
    fate_of     : callable     Takes a draft NodeRecord, returns {"fate","block","note"}.

    Returns
    -------
    dict  (see module docstring for full shape)
    """
    totals = {"draft_total": 0, "chrome": 0, "transferred": 0, "folded": 0, "dropped": 0}
    by_node: list[dict] = []
    by_class: dict[str, dict] = {}

    def _record_class(cls: str, verdict: str, dropped_props: list[str]) -> None:
        if cls not in by_class:
            by_class[cls] = {"transferred": 0, "folded": 0, "dropped": 0, "sample_dropped_props": []}
        bucket = by_class[cls]
        key = verdict.lower()
        if key in bucket:
            bucket[key] += 1
        # Accumulate a sample of dropped props (cap at 5 per class)
        for p in dropped_props:
            if p not in bucket["sample_dropped_props"] and len(bucket["sample_dropped_props"]) < 5:
                bucket["sample_dropped_props"].append(p)

    totals["draft_total"] = len(draft_nodes)

    for draft in draft_nodes:
        fate_info = fate_of(draft)
        fate = fate_info.get("fate", "emit-block")
        fate_block = fate_info.get("block", "")
        section = draft.get("section", "")
        draft_text = draft.get("text") or ""
        draft_css = draft.get("css") or {}
        classes = draft.get("classes") or []
        bem_classes = _bem_classes(draft)

        # ------------------------------------------------------------------
        # CHROME: excluded from denominator
        # ------------------------------------------------------------------
        if fate == "chrome":
            totals["chrome"] += 1
            entry = {
                "classes": classes,
                "section": section,
                "fate": fate,
                "verdict": "CHROME",
                "content_ok": True,
                "css_dropped": [],
                "clone_match": None,
            }
            by_node.append(entry)
            for cls in bem_classes:
                _record_class(cls, "CHROME", [])
            continue

        # ------------------------------------------------------------------
        # Content check
        # ------------------------------------------------------------------
        dt_norm = _normalise_text(draft_text)
        content_ok: bool

        if not dt_norm:
            # Empty text — no content to verify
            content_ok = True
        else:
            # Search the WHOLE clone, not just the same draft-derived section.
            # Genuine conversion RENAMES the class vocabulary (draft
            # `sgs-product-card__title` -> clone `sgs-business-info__name`), so a
            # section-restricted text search misses content that DID transfer under
            # a different class. Text is unique enough to match page-wide; a short
            # min-length guard avoids spurious matches on tiny strings.
            content_ok = (
                len(dt_norm) <= 2  # trivial text (e.g. "£") — don't fail on it
                or any(
                    dt_norm in _normalise_text(n.get("text") or "")
                    for n in clone_nodes
                )
            )

        # ------------------------------------------------------------------
        # Find clone match + compare CSS
        # ------------------------------------------------------------------
        clone_match: dict | None = None
        css_dropped: list[str] = []
        fold_match = False

        if fate == "fold-parent":
            clone_match = _find_best_match(
                draft,
                clone_nodes,
                section=section,
                strategy="fold",
                fate_block=fate_block,
            )
            if clone_match is not None:
                css_dropped = _compare_css(
                    draft_css, clone_match.get("css") or {}, fold_only=True
                )
                fold_match = True
        else:
            # emit-block or lift-attr
            clone_match = _find_best_match(
                draft,
                clone_nodes,
                section=section,
                strategy="emit",
                fate_block=fate_block,
            )
            if clone_match is not None:
                css_dropped = _compare_css(draft_css, clone_match.get("css") or {})

        clone_match_path = clone_match.get("domPath") if clone_match else None

        # ------------------------------------------------------------------
        # Verdict
        # ------------------------------------------------------------------
        if fate == "fold-parent" and fold_match and len(css_dropped) <= 1:
            verdict = "FOLDED"
            totals["folded"] += 1
        elif content_ok and len(css_dropped) <= 1:
            verdict = "TRANSFERRED"
            totals["transferred"] += 1
        else:
            verdict = "DROPPED"
            totals["dropped"] += 1

        entry = {
            "classes": classes,
            "section": section,
            "fate": fate,
            "verdict": verdict,
            "content_ok": content_ok,
            "css_dropped": css_dropped,
            "clone_match": clone_match_path,
        }
        by_node.append(entry)

        for cls in bem_classes:
            _record_class(cls, verdict, css_dropped)

    # ------------------------------------------------------------------
    # Score: (transferred + folded) / non-chrome draft nodes × 100
    # ------------------------------------------------------------------
    denominator = totals["draft_total"] - totals["chrome"]
    if denominator > 0:
        score_pct = (totals["transferred"] + totals["folded"]) / denominator * 100.0
    else:
        score_pct = 100.0  # nothing to transfer → trivially perfect

    return {
        "score_pct": round(score_pct, 2),
        "totals": totals,
        "by_node": by_node,
        "by_class": by_class,
    }


# ---------------------------------------------------------------------------
# Self-test (run: python transfer_checker.py)
# ---------------------------------------------------------------------------

def _self_test() -> None:
    """
    Five fixture draft nodes exercising all five verdict paths.

    Fixture map
    -----------
    1. trust-bar badge          → TRANSFERRED
    2. __inner div              → FOLDED  (fold-parent onto sgs-hero)
    3. missing element          → DROPPED (not in clone at all)
    4. site header chrome       → CHROME  (excluded from denominator)
    5. text-align start vs left → TRANSFERRED  (tolerance match)
    """
    import json

    # -- Draft nodes ---------------------------------------------------------
    draft_nodes = [
        # 1. Trust-bar badge — should TRANSFER
        {
            "domPath": "body > main > section.sgs-trust-bar > div.sgs-trust-bar__badge",
            "tag": "div",
            "classes": ["sgs-trust-bar__badge"],
            "section": "trust-bar",
            "text": "Google Reviews 4.9★",
            "css": {
                "font-size": "14px",
                "color": "rgb(33, 33, 33)",
                "background-color": "#ffffff",
                "padding": "8px",
            },
            "media": None,
            "imgNaturalW": None,
        },
        # 2. Inner layout div — fold-parent onto sgs-hero block
        {
            "domPath": "body > main > section.sgs-hero > div.sgs-hero__inner",
            "tag": "div",
            "classes": ["sgs-hero__inner"],
            "section": "hero",
            "text": "",
            "css": {
                "display": "flex",
                "gap": "24px",
                "max-width": "1200px",
                "padding": "64px",
            },
            "media": None,
            "imgNaturalW": None,
        },
        # 3. Missing element — no clone equivalent → DROPPED
        {
            "domPath": "body > main > section.sgs-cta > div.sgs-cta__ribbon",
            "tag": "div",
            "classes": ["sgs-cta__ribbon"],
            "section": "cta",
            "text": "Limited offer",
            "css": {
                "background-color": "rgb(200, 50, 50)",
                "font-size": "18px",
            },
            "media": None,
            "imgNaturalW": None,
        },
        # 4. Site header chrome — CHROME (excluded from denominator)
        {
            "domPath": "body > header.sgs-site-header",
            "tag": "header",
            "classes": ["sgs-site-header"],
            "section": "site-header",
            "text": "Small Giants Studio",
            "css": {"background-color": "#ffffff"},
            "media": None,
            "imgNaturalW": None,
        },
        # 5. text-align: start in draft vs left in clone → TRANSFERRED (tolerance)
        {
            "domPath": "body > main > section.sgs-about > p.sgs-about__lead",
            "tag": "p",
            "classes": ["sgs-about__lead"],
            "section": "about",
            "text": "We are a strategy-first studio.",
            "css": {
                "text-align": "start",
                "font-size": "16px",
                "color": "rgb(40, 40, 40)",
            },
            "media": None,
            "imgNaturalW": None,
        },
    ]

    # -- Clone nodes ---------------------------------------------------------
    clone_nodes = [
        # Matching trust-bar badge
        {
            "domPath": "body > main > .wp-block-sgs-trust-bar > .sgs-trust-bar__badge",
            "tag": "div",
            "classes": ["sgs-trust-bar__badge"],
            "section": "trust-bar",
            "text": "Google Reviews 4.9★",
            "css": {
                "font-size": "14px",
                "color": "rgb(33, 33, 33)",
                "background-color": "#ffffff",
                "padding": "8px",
            },
            "media": None,
            "imgNaturalW": None,
        },
        # sgs-hero block — the fold target for fixture 2
        {
            "domPath": "body > main > .wp-block-sgs-hero",
            "tag": "div",
            "classes": ["sgs-hero", "wp-block-sgs-hero"],
            "section": "hero",
            "text": "Hero headline text",
            "css": {
                "display": "flex",
                "gap": "24px",
                "max-width": "1200px",
                "padding": "64px",
                "background-color": "#f5f5f5",
            },
            "media": None,
            "imgNaturalW": None,
        },
        # about section lead paragraph (text-align: left)
        {
            "domPath": "body > main > .wp-block-sgs-about > p",
            "tag": "p",
            "classes": ["sgs-about__lead"],
            "section": "about",
            "text": "We are a strategy-first studio.",
            "css": {
                "text-align": "left",   # draft has "start" — must match via tolerance
                "font-size": "16px",
                "color": "rgb(40, 40, 40)",
            },
            "media": None,
            "imgNaturalW": None,
        },
        # NOTE: no clone node in section "cta" → fixture 3 (sgs-cta__ribbon) will DROPPED
        # NOTE: no clone node in section "site-header" — irrelevant (CHROME, not scored)
    ]

    # -- Fate map ------------------------------------------------------------
    fate_map: dict[str, dict] = {
        # trust-bar badge
        "sgs-trust-bar__badge": {"fate": "emit-block", "block": "sgs/trust-bar", "note": "badge repeater item"},
        # hero inner div — fold onto parent
        "sgs-hero__inner": {"fate": "fold-parent", "block": "sgs-hero", "note": "inner wrapper folds onto hero block"},
        # missing cta ribbon
        "sgs-cta__ribbon": {"fate": "emit-block", "block": "sgs/cta-section", "note": "promotional ribbon"},
        # site header chrome
        "sgs-site-header": {"fate": "chrome", "block": "", "note": "site header excluded"},
        # about lead paragraph
        "sgs-about__lead": {"fate": "emit-block", "block": "sgs/about", "note": "lead copy"},
    }

    def fate_of(node: dict) -> dict:
        for cls in node.get("classes", []):
            if cls in fate_map:
                return fate_map[cls]
        return {"fate": "emit-block", "block": "", "note": ""}

    # -- Run -----------------------------------------------------------------
    result = check(draft_nodes, clone_nodes, fate_of)

    # -- Print results -------------------------------------------------------
    print("=" * 60)
    print("TRANSFER CHECKER — SELF-TEST RESULTS")
    print("=" * 60)
    print(f"\nScore: {result['score_pct']}%")
    print(f"Totals: {result['totals']}")
    print()
    print("Per-node verdicts:")
    for entry in result["by_node"]:
        cls_str = ", ".join(entry["classes"]) or "(no classes)"
        dropped_str = (
            f"  dropped props: {entry['css_dropped']}" if entry["css_dropped"] else ""
        )
        match_str = entry["clone_match"] or "—"
        print(
            f"  [{entry['verdict']:12s}]  {cls_str:<30s}  "
            f"section={entry['section']:<12s}  "
            f"content_ok={entry['content_ok']}  "
            f"clone_match={match_str}"
            f"{dropped_str}"
        )

    print()
    print("by_class ledger:")
    for cls, stats in result["by_class"].items():
        print(f"  {cls:<30s}  {stats}")

    # -- Assertions ----------------------------------------------------------
    print()
    print("Running assertions …")

    # Collect verdict by class
    verdict_by_cls: dict[str, str] = {}
    for entry in result["by_node"]:
        for cls in entry["classes"]:
            verdict_by_cls[cls] = entry["verdict"]

    assert verdict_by_cls.get("sgs-trust-bar__badge") == "TRANSFERRED", (
        f"Expected TRANSFERRED for trust-bar badge, got {verdict_by_cls.get('sgs-trust-bar__badge')}"
    )
    assert verdict_by_cls.get("sgs-hero__inner") == "FOLDED", (
        f"Expected FOLDED for hero inner, got {verdict_by_cls.get('sgs-hero__inner')}"
    )
    assert verdict_by_cls.get("sgs-cta__ribbon") == "DROPPED", (
        f"Expected DROPPED for cta ribbon, got {verdict_by_cls.get('sgs-cta__ribbon')}"
    )
    assert verdict_by_cls.get("sgs-site-header") == "CHROME", (
        f"Expected CHROME for site header, got {verdict_by_cls.get('sgs-site-header')}"
    )
    assert verdict_by_cls.get("sgs-about__lead") == "TRANSFERRED", (
        f"Expected TRANSFERRED for about lead (start==left tolerance), "
        f"got {verdict_by_cls.get('sgs-about__lead')}"
    )

    # Score: 4 non-chrome nodes (badge + inner + ribbon + lead);
    #        2 transferred + 1 folded + 1 dropped = 75 %
    assert result["score_pct"] == 75.0, (
        f"Expected score 75.0, got {result['score_pct']}"
    )

    # Totals
    t = result["totals"]
    assert t["draft_total"] == 5, f"Expected draft_total=5, got {t['draft_total']}"
    assert t["chrome"] == 1,      f"Expected chrome=1, got {t['chrome']}"
    assert t["transferred"] == 2, f"Expected transferred=2, got {t['transferred']}"
    assert t["folded"] == 1,      f"Expected folded=1, got {t['folded']}"
    assert t["dropped"] == 1,     f"Expected dropped=1, got {t['dropped']}"

    print("All assertions passed.")
    print()


if __name__ == "__main__":
    _self_test()
