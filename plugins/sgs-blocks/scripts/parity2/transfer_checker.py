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
clone.  Matching is done via STRUCTURAL TREE-ALIGNMENT — own-text anchoring for leaves,
Lowest Common Ancestor (LCA) for containers — so that clone restructuring (extra wrapper
<div>s, renamed classes) does not cause false drops.

NodeRecord schema (both draft and clone):
  { "domPath": str, "tag": str, "classes": [str], "section": str,
    "text": str, "ownText": str, "css": {prop: value}, "media": {"src","alt"}|None,
    "imgNaturalW": int|None }

  ownText: the element's DIRECT text-node children only.  Containers carry empty
           ownText; text leaves carry their words.  Used as the anchor signal.
  text:    full descendant textContent (pre-existing field, still present).

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
# Computed-DERIVED dimensions: a faithful element computes a different width/height
# inside a different layout context (the clone adds WP wrapper divs / different grid),
# so a raw width/height mismatch is a layout CONSEQUENCE, not an authored-rule failure.
# Excluded from the transfer VERDICT; still reported separately as `dim_dropped`.
_DERIVED_DIMS = frozenset({"width", "height"})

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
# domPath helpers
# ---------------------------------------------------------------------------

def _segments(node: dict) -> list[str]:
    """Return the domPath split into individual step segments."""
    return node.get("domPath", "").split(">")


def _node_id(node: dict) -> int:
    """Stable identity — use Python object id (works within one check() call)."""
    return id(node)


def _build_path_index(nodes: list[dict]) -> dict[tuple, dict]:
    """
    Build a lookup from segment-tuple → node for a node pool.
    When two nodes share the same domPath, the last one wins (degenerate case).
    """
    idx: dict[tuple, dict] = {}
    for n in nodes:
        key = tuple(_segments(n))
        idx[key] = n
    return idx


def _longest_common_prefix(seglists: list[list[str]]) -> list[str]:
    """
    Return the longest common prefix of a list of segment lists.
    Returns [] when the list is empty or there is no common prefix.
    """
    if not seglists:
        return []
    prefix = seglists[0]
    for segs in seglists[1:]:
        # Shorten prefix to match segs
        new_len = 0
        for i, seg in enumerate(prefix):
            if i >= len(segs) or segs[i] != seg:
                break
            new_len = i + 1
        else:
            new_len = min(len(prefix), len(segs))
        prefix = prefix[:new_len]
        if not prefix:
            break
    return prefix


# ---------------------------------------------------------------------------
# BEM helpers
# ---------------------------------------------------------------------------

def _bem_classes(node: dict) -> list[str]:
    """Return the BEM classes (those starting with 'sgs-') from a node."""
    return [c for c in node.get("classes", []) if c.startswith("sgs-")]


def _shared_bem(draft: dict, clone: dict) -> int:
    """Count of shared BEM classes between two nodes."""
    ds = set(_bem_classes(draft))
    cs = set(_bem_classes(clone))
    return len(ds & cs)


# ---------------------------------------------------------------------------
# Structural tree-alignment matcher
# ---------------------------------------------------------------------------

class _StructuralMatcher:
    """
    Builds own-text anchor and LCA maps once per check() call, then serves
    per-draft-node lookups.

    Algorithm
    ---------
    Step 1 — Anchor matching (leaves):
        For each draft node with non-empty ownText, find the clone node(s)
        whose normalised ownText EQUALS it.  Tiebreak: (a) most shared BEM
        classes, (b) shallowest depth (fewest segments), (c) same tag.

    Step 2 — Container mapping (LCA):
        For each draft node WITHOUT ownText, collect the clone-anchor nodes
        belonging to draft descendants (draft nodes whose domPath starts with
        this node's segments).  The clone equivalent is the LCA of those
        anchors in the clone tree — the node at the longest common prefix of
        their paths that actually EXISTS in the clone pool.

    Step 3 — Textless-leaf fallback:
        Draft nodes with neither ownText nor anchored descendants (e.g. icon
        or img leaves) fall back to: same section + same tag + most shared BEM
        class + closest depth.
    """

    def __init__(self, draft_nodes: list[dict], clone_nodes: list[dict]) -> None:
        self._draft_nodes = draft_nodes
        self._clone_nodes = clone_nodes

        # Index clone nodes by their path-segment tuple
        self._clone_by_path: dict[tuple, dict] = _build_path_index(clone_nodes)

        # Build own-text → clone-node(s) index for clone pool
        # ownText may be absent on older NodeRecords — fall back to ""
        self._clone_by_own_text: dict[str, list[dict]] = {}
        for cn in clone_nodes:
            ot = _normalise_text(cn.get("ownText") or "")
            if not ot:
                continue
            self._clone_by_own_text.setdefault(ot, []).append(cn)

        # Build anchor map: draft node id → clone node (for leaf anchors)
        self._anchor: dict[int, dict] = {}
        self._build_anchors()

    # ------------------------------------------------------------------
    # Step 1 — anchor leaves
    # ------------------------------------------------------------------

    def _build_anchors(self) -> None:
        for dn in self._draft_nodes:
            own = _normalise_text(dn.get("ownText") or "")
            if not own:
                continue
            candidates = self._clone_by_own_text.get(own)
            if not candidates:
                continue
            best = self._pick_best_anchor(dn, candidates)
            self._anchor[_node_id(dn)] = best

    def _pick_best_anchor(self, draft: dict, candidates: list[dict]) -> dict:
        """
        Among candidates whose ownText equals the draft's, pick the best one.
        Priority: (a) most shared BEM classes, (b) shallowest depth,
                  (c) same tag.
        """
        def sort_key(cn: dict) -> tuple:
            shared = _shared_bem(draft, cn)
            depth = len(_segments(cn))
            tag_match = 0 if cn.get("tag", "").lower() == draft.get("tag", "").lower() else 1
            return (-shared, depth, tag_match)

        return min(candidates, key=sort_key)

    # ------------------------------------------------------------------
    # Step 2 — LCA for containers
    # ------------------------------------------------------------------

    def _anchored_descendants(self, draft_segs: list[str]) -> list[dict]:
        """
        Return all clone-anchor nodes whose DRAFT counterpart is a descendant
        of the draft node at draft_segs (i.e. its domPath starts with draft_segs).
        """
        result: list[dict] = []
        for dn in self._draft_nodes:
            dn_segs = _segments(dn)
            # Must be a STRICT descendant (longer path starting with draft_segs)
            if len(dn_segs) <= len(draft_segs):
                continue
            if dn_segs[:len(draft_segs)] != draft_segs:
                continue
            clone_anchor = self._anchor.get(_node_id(dn))
            if clone_anchor is not None:
                result.append(clone_anchor)
        return result

    def _lca_in_clone(
        self,
        anchors: list[dict],
        draft_segs: list[str],
    ) -> dict | None:
        """
        Find the Lowest Common Ancestor of *anchors* within the clone tree for
        a CONTAINER draft node (i.e. one with no ownText of its own).

        Algorithm
        ---------
        1.  Compute the longest common prefix of all anchor paths.  For
            multiple anchors this is naturally their shared ancestor.  For a
            single anchor the prefix equals that anchor's full path.
        2.  Walk UP from the prefix (shorten by one segment at a time) until we
            find a clone node that exists in the pool AND is NOT one of the
            anchor leaves themselves.  This guarantees a container (structural
            parent) rather than a text leaf, even when there is only one anchor.
        3.  If every candidate is an anchor-leaf and nothing else is found,
            return the shallowest available node (last resort).

        Why exclude anchor leaves?
            A draft container must map to a STRUCTURAL equivalent in the clone,
            not the text leaf its content ends up in.  Without the exclusion, a
            single-child container maps to its own child — comparing a flex-
            container's CSS to a span's — which produces false drops.
        """
        if not anchors:
            return None

        anchor_ids = {id(a) for a in anchors}
        anchor_seglists = [_segments(a) for a in anchors]
        prefix = _longest_common_prefix(anchor_seglists)

        if not prefix:
            return None

        # Walk UP from the full common prefix, skipping anchor leaves themselves
        candidate_prefix = list(prefix)
        while candidate_prefix:
            node = self._clone_by_path.get(tuple(candidate_prefix))
            if node is not None and id(node) not in anchor_ids:
                return node
            candidate_prefix = candidate_prefix[:-1]

        # Last resort: return shallowest clone node in the pool
        if self._clone_by_path:
            return min(self._clone_by_path.values(), key=lambda n: len(_segments(n)))
        return None

    # ------------------------------------------------------------------
    # Step 3 — textless-leaf fallback
    # ------------------------------------------------------------------

    def _fallback_match(self, draft: dict, section: str) -> dict | None:
        """
        For draft nodes with no ownText and no anchored descendants, use a
        structural fallback: same section + same tag + most shared BEM
        class + closest depth.
        """
        section_pool = [n for n in self._clone_nodes if n.get("section") == section]
        if not section_pool:
            section_pool = self._clone_nodes

        tag = draft.get("tag", "").lower()
        draft_depth = len(_segments(draft))

        # Score: (-shared_bem, tag_mismatch, abs_depth_diff)
        def sort_key(cn: dict) -> tuple:
            shared = _shared_bem(draft, cn)
            tag_match = 0 if cn.get("tag", "").lower() == tag else 1
            depth_diff = abs(len(_segments(cn)) - draft_depth)
            return (-shared, tag_match, depth_diff)

        return min(section_pool, key=sort_key, default=None)

    # ------------------------------------------------------------------
    # Public lookup
    # ------------------------------------------------------------------

    def match(self, draft: dict) -> dict | None:
        """
        Return the best-matching clone node for *draft*, using:
          1. Direct anchor (if draft is a leaf with ownText).
          2. LCA of anchored descendants (if draft is a container).
          3. Textless-leaf fallback (if neither applies).
        """
        # 1. Leaf anchor
        anchor = self._anchor.get(_node_id(draft))
        if anchor is not None:
            return anchor

        # 2. LCA of anchored descendants
        draft_segs = _segments(draft)
        desc_anchors = self._anchored_descendants(draft_segs)
        if desc_anchors:
            return self._lca_in_clone(desc_anchors, draft_segs)

        # 3. Fallback
        return self._fallback_match(draft, draft.get("section", ""))


# ---------------------------------------------------------------------------
# Fold-parent matcher (unchanged from original strategy)
# ---------------------------------------------------------------------------

def _fold_match(
    draft: dict,
    clone_nodes: list[dict],
    fate_block: str,
    section: str,
) -> dict | None:
    """
    Find the clone node that carries the parent-block wrapper for a fold-parent
    draft node.

    fate_block names the parent block slug (e.g. "sgs-hero" or "sgs/hero").
    When absent, derive "sgs-<section>" from the section name.
    """
    section_pool = [n for n in clone_nodes if n.get("section") == section]

    if fate_block:
        bem = fate_block.replace("sgs/", "sgs-").replace("/", "-")
    else:
        bem = ("sgs-" + section) if section else ""

    if bem:
        candidates = [n for n in section_pool if bem in _bem_classes(n)]
        if candidates:
            return candidates[0]

    # Fallback: shallowest node in the section (section-root container)
    return section_pool[0] if section_pool else None


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

    # Build the structural matcher once for the whole check() call
    matcher = _StructuralMatcher(draft_nodes, clone_nodes)
    # Lazily-built (once) combined clone text, used by the word-overlap content check.
    _clone_text_blob: list[str | None] = [None]

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
        # A node is content-ok when:
        #   (a) it has no ownText (structural container — content carried by
        #       descendants), OR
        #   (b) its ownText is trivially short (≤ 2 chars after normalisation), OR
        #   (c) its ownText was successfully anchored to a clone node, OR
        #   (d) (legacy fallback) the full text appears anywhere in the clone pool.
        own_text_norm = _normalise_text(draft.get("ownText") or "")
        full_text_norm = _normalise_text(draft.get("text") or "")

        if not own_text_norm:
            # Structural container — no direct text content to verify
            content_ok = True
        elif len(own_text_norm) <= 2:
            # Trivially short text (e.g. "£") — don't penalise
            content_ok = True
        elif _node_id(draft) in matcher._anchor:
            # ownText was matched to a clone leaf → content is present
            content_ok = True
        else:
            # ownText not anchored: credit content by WORD-OVERLAP against the clone's
            # combined text — robust to the clone splitting / reordering / re-wrapping
            # the text under a renamed vocabulary. Full verbatim containment was too
            # strict: a converted clone rarely preserves exact text-node boundaries, so
            # a paragraph that transferred but got re-split read as a false DROPPED.
            draft_words = [w for w in own_text_norm.split() if len(w) > 2]
            if not draft_words:
                content_ok = True
            else:
                if _clone_text_blob[0] is None:
                    _clone_text_blob[0] = " ".join(
                        _normalise_text(n.get("text") or "") for n in clone_nodes
                    )
                blob = _clone_text_blob[0]
                hits = sum(1 for w in draft_words if w in blob)
                content_ok = (hits / len(draft_words)) >= 0.7

        # ------------------------------------------------------------------
        # Find clone match + compare CSS
        # ------------------------------------------------------------------
        clone_match: dict | None = None
        css_dropped: list[str] = []
        fold_match = False

        if fate == "fold-parent":
            clone_match = _fold_match(draft, clone_nodes, fate_block, section)
            if clone_match is not None:
                css_dropped = _compare_css(
                    draft_css, clone_match.get("css") or {}, fold_only=True
                )
                fold_match = True
        else:
            # emit-block or lift-attr — use structural matcher
            clone_match = matcher.match(draft)
            if clone_match is not None:
                css_dropped = _compare_css(draft_css, clone_match.get("css") or {})

        clone_match_path = clone_match.get("domPath") if clone_match else None

        # ------------------------------------------------------------------
        # Verdict — graded CSS match-rate (authored rules), dimensions de-weighted.
        # css_pct = matched authored-rule props / authored-rule props compared.
        # width/height are reported separately (dim_dropped) but do not fail the node.
        # ------------------------------------------------------------------
        meaningful_dropped = [p for p in css_dropped if p not in _DERIVED_DIMS]
        dim_dropped = [p for p in css_dropped if p in _DERIVED_DIMS]
        css_considered = max(1, len([
            p for p in draft_css
            if not _is_vendor_prefixed(p) and p not in _DERIVED_DIMS
        ]))
        css_pct = round(100.0 * (css_considered - len(meaningful_dropped)) / css_considered, 1)

        if fate == "fold-parent" and fold_match and not meaningful_dropped:
            verdict = "FOLDED"
            totals["folded"] += 1
        elif content_ok and css_pct >= 80.0:
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
            "css_pct": css_pct,
            "css_dropped": meaningful_dropped,
            "dim_dropped": dim_dropped,
            "clone_match": clone_match_path,
        }
        by_node.append(entry)

        for cls in bem_classes:
            _record_class(cls, verdict, meaningful_dropped)

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
    Self-test suite covering:

    Fixture A — rename + extra wrapper (the primary regression case):
        draft:  section.sgs-trust-bar > div.sgs-trust-bar__badge > span.sgs-trust-bar__label
        clone:  section.sgs-trust-bar > div.wp-wrapper > div.sgs-badge-x > span.sgs-thing
        Assert:
          - __label  anchors to clone span.sgs-thing (ownText match)
          - __badge  maps via LCA to clone div.sgs-badge-x (NOT wp-wrapper, NOT span)
            → display/gap CSS compare equal → TRANSFERRED
          - section.sgs-trust-bar (draft) maps via LCA to section.sgs-trust-bar (clone)

    Fixture B — genuinely absent content:
        draft:  div.sgs-cta__ribbon with ownText "Limited offer"
        clone:  no node with ownText "Limited offer" anywhere
        Assert: DROPPED

    Legacy fixture C — original 5-node suite (TRANSFERRED/FOLDED/DROPPED/CHROME/tolerance)
    """
    import json

    # ===================================================================
    # Fixture A — rename + extra wrapper
    # ===================================================================
    print("=" * 60)
    print("FIXTURE A — rename + extra wrapper (LCA test)")
    print("=" * 60)

    draft_a = [
        # Section root — no ownText
        {
            "domPath": "main[0]>section[0]",
            "tag": "section",
            "classes": ["sgs-trust-bar"],
            "section": "trust-bar",
            "text": "Handmade",
            "ownText": "",
            "css": {"padding": "32px"},
            "media": None,
            "imgNaturalW": None,
        },
        # Badge container — no ownText, has CSS we want to verify
        {
            "domPath": "main[0]>section[0]>div[0]",
            "tag": "div",
            "classes": ["sgs-trust-bar__badge"],
            "section": "trust-bar",
            "text": "Handmade",
            "ownText": "",
            "css": {"display": "flex", "gap": "8px"},
            "media": None,
            "imgNaturalW": None,
        },
        # Label leaf — has ownText
        {
            "domPath": "main[0]>section[0]>div[0]>span[0]",
            "tag": "span",
            "classes": ["sgs-trust-bar__label"],
            "section": "trust-bar",
            "text": "Handmade",
            "ownText": "Handmade",
            "css": {"font-size": "14px", "color": "rgb(33,33,33)"},
            "media": None,
            "imgNaturalW": None,
        },
    ]

    clone_a = [
        # Clone section root
        {
            "domPath": "main[0]>section[0]",
            "tag": "section",
            "classes": ["sgs-trust-bar"],
            "section": "trust-bar",
            "text": "Handmade",
            "ownText": "",
            "css": {"padding": "32px"},
            "media": None,
            "imgNaturalW": None,
        },
        # Extra WordPress wrapper div — NOT in draft
        {
            "domPath": "main[0]>section[0]>div[0]",
            "tag": "div",
            "classes": ["wp-wrapper"],
            "section": "trust-bar",
            "text": "Handmade",
            "ownText": "",
            "css": {},
            "media": None,
            "imgNaturalW": None,
        },
        # Renamed badge div — matches draft __badge structurally via LCA
        {
            "domPath": "main[0]>section[0]>div[0]>div[0]",
            "tag": "div",
            "classes": ["sgs-badge-x"],
            "section": "trust-bar",
            "text": "Handmade",
            "ownText": "",
            "css": {"display": "flex", "gap": "8px"},
            "media": None,
            "imgNaturalW": None,
        },
        # Renamed label span — matches draft __label by ownText
        {
            "domPath": "main[0]>section[0]>div[0]>div[0]>span[0]",
            "tag": "span",
            "classes": ["sgs-thing"],
            "section": "trust-bar",
            "text": "Handmade",
            "ownText": "Handmade",
            "css": {"font-size": "14px", "color": "rgb(33,33,33)"},
            "media": None,
            "imgNaturalW": None,
        },
    ]

    def fate_a(node: dict) -> dict:
        return {"fate": "emit-block", "block": "sgs/trust-bar", "note": ""}

    result_a = check(draft_a, clone_a, fate_a)

    print("\nPer-node verdicts:")
    verdict_a: dict[str, dict] = {}
    for entry in result_a["by_node"]:
        cls_str = ", ".join(entry["classes"]) or "(no classes)"
        print(
            f"  [{entry['verdict']:12s}]  {cls_str:<35s}  "
            f"clone_match={entry['clone_match'] or '—'}  "
            f"css_dropped={entry['css_dropped']}"
        )
        for cls in entry["classes"]:
            verdict_a[cls] = entry

    # Assertions for Fixture A
    print("\nRunning Fixture A assertions …")

    label_entry = verdict_a.get("sgs-trust-bar__label")
    assert label_entry is not None, "No entry for sgs-trust-bar__label"
    assert label_entry["verdict"] == "TRANSFERRED", (
        f"__label should be TRANSFERRED, got {label_entry['verdict']}"
    )
    # The label's clone_match must be the span.sgs-thing path
    assert label_entry["clone_match"] == "main[0]>section[0]>div[0]>div[0]>span[0]", (
        f"__label clone_match wrong: {label_entry['clone_match']}"
    )

    badge_entry = verdict_a.get("sgs-trust-bar__badge")
    assert badge_entry is not None, "No entry for sgs-trust-bar__badge"
    assert badge_entry["verdict"] == "TRANSFERRED", (
        f"__badge should be TRANSFERRED (display/gap match via LCA), got {badge_entry['verdict']}"
    )
    # The badge's clone_match MUST be sgs-badge-x (the LCA of the label anchor),
    # NOT wp-wrapper (one level too high) and NOT the label span (too deep).
    assert badge_entry["clone_match"] == "main[0]>section[0]>div[0]>div[0]", (
        f"__badge clone_match should be sgs-badge-x path, got {badge_entry['clone_match']}"
    )

    print("Fixture A assertions passed.\n")

    # ===================================================================
    # Fixture B — genuinely absent content → DROPPED
    # ===================================================================
    print("=" * 60)
    print("FIXTURE B — genuinely absent content")
    print("=" * 60)

    draft_b = [
        {
            "domPath": "main[0]>section[0]>div[0]",
            "tag": "div",
            "classes": ["sgs-cta__ribbon"],
            "section": "cta",
            "text": "Limited offer",
            "ownText": "Limited offer",
            "css": {"background-color": "rgb(200,50,50)", "font-size": "18px"},
            "media": None,
            "imgNaturalW": None,
        },
    ]

    clone_b = [
        # Completely different content — no "Limited offer" anywhere
        {
            "domPath": "main[0]>section[0]>p[0]",
            "tag": "p",
            "classes": ["sgs-cta__body"],
            "section": "cta",
            "text": "Contact us today",
            "ownText": "Contact us today",
            "css": {"font-size": "16px"},
            "media": None,
            "imgNaturalW": None,
        },
    ]

    def fate_b(node: dict) -> dict:
        return {"fate": "emit-block", "block": "sgs/cta-section", "note": ""}

    result_b = check(draft_b, clone_b, fate_b)

    print("\nPer-node verdicts:")
    for entry in result_b["by_node"]:
        cls_str = ", ".join(entry["classes"]) or "(no classes)"
        print(
            f"  [{entry['verdict']:12s}]  {cls_str:<35s}  "
            f"content_ok={entry['content_ok']}  "
            f"clone_match={entry['clone_match'] or '—'}"
        )

    print("\nRunning Fixture B assertions …")
    ribbon_verdict = result_b["by_node"][0]["verdict"]
    assert ribbon_verdict == "DROPPED", (
        f"Ribbon with absent text should be DROPPED, got {ribbon_verdict}"
    )
    assert result_b["by_node"][0]["content_ok"] is False, (
        "content_ok should be False when ownText is absent from clone"
    )
    print("Fixture B assertions passed.\n")

    # ===================================================================
    # Fixture C — legacy 5-node suite (backwards compatibility)
    # ===================================================================
    print("=" * 60)
    print("FIXTURE C — legacy 5-node suite")
    print("=" * 60)

    draft_c = [
        # 1. Trust-bar badge — should TRANSFER (shared BEM class + ownText anchor)
        {
            "domPath": "body>main>section.sgs-trust-bar>div.sgs-trust-bar__badge",
            "tag": "div",
            "classes": ["sgs-trust-bar__badge"],
            "section": "trust-bar",
            "text": "Google Reviews 4.9★",
            "ownText": "Google Reviews 4.9★",
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
            "domPath": "body>main>section.sgs-hero>div.sgs-hero__inner",
            "tag": "div",
            "classes": ["sgs-hero__inner"],
            "section": "hero",
            "text": "",
            "ownText": "",
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
            "domPath": "body>main>section.sgs-cta>div.sgs-cta__ribbon",
            "tag": "div",
            "classes": ["sgs-cta__ribbon"],
            "section": "cta",
            "text": "Limited offer",
            "ownText": "Limited offer",
            "css": {
                "background-color": "rgb(200, 50, 50)",
                "font-size": "18px",
            },
            "media": None,
            "imgNaturalW": None,
        },
        # 4. Site header chrome — CHROME (excluded from denominator)
        {
            "domPath": "body>header.sgs-site-header",
            "tag": "header",
            "classes": ["sgs-site-header"],
            "section": "site-header",
            "text": "Small Giants Studio",
            "ownText": "Small Giants Studio",
            "css": {"background-color": "#ffffff"},
            "media": None,
            "imgNaturalW": None,
        },
        # 5. text-align: start in draft vs left in clone → TRANSFERRED (tolerance)
        {
            "domPath": "body>main>section.sgs-about>p.sgs-about__lead",
            "tag": "p",
            "classes": ["sgs-about__lead"],
            "section": "about",
            "text": "We are a strategy-first studio.",
            "ownText": "We are a strategy-first studio.",
            "css": {
                "text-align": "start",
                "font-size": "16px",
                "color": "rgb(40, 40, 40)",
            },
            "media": None,
            "imgNaturalW": None,
        },
    ]

    clone_c = [
        # Matching trust-bar badge
        {
            "domPath": "body>main>.wp-block-sgs-trust-bar>.sgs-trust-bar__badge",
            "tag": "div",
            "classes": ["sgs-trust-bar__badge"],
            "section": "trust-bar",
            "text": "Google Reviews 4.9★",
            "ownText": "Google Reviews 4.9★",
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
            "domPath": "body>main>.wp-block-sgs-hero",
            "tag": "div",
            "classes": ["sgs-hero", "wp-block-sgs-hero"],
            "section": "hero",
            "text": "Hero headline text",
            "ownText": "Hero headline text",
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
            "domPath": "body>main>.wp-block-sgs-about>p",
            "tag": "p",
            "classes": ["sgs-about__lead"],
            "section": "about",
            "text": "We are a strategy-first studio.",
            "ownText": "We are a strategy-first studio.",
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

    fate_map_c: dict[str, dict] = {
        "sgs-trust-bar__badge": {"fate": "emit-block", "block": "sgs/trust-bar", "note": "badge repeater item"},
        "sgs-hero__inner":      {"fate": "fold-parent", "block": "sgs-hero", "note": "inner wrapper folds onto hero block"},
        "sgs-cta__ribbon":      {"fate": "emit-block", "block": "sgs/cta-section", "note": "promotional ribbon"},
        "sgs-site-header":      {"fate": "chrome", "block": "", "note": "site header excluded"},
        "sgs-about__lead":      {"fate": "emit-block", "block": "sgs/about", "note": "lead copy"},
    }

    def fate_c(node: dict) -> dict:
        for cls in node.get("classes", []):
            if cls in fate_map_c:
                return fate_map_c[cls]
        return {"fate": "emit-block", "block": "", "note": ""}

    result_c = check(draft_c, clone_c, fate_c)

    print(f"\nScore: {result_c['score_pct']}%")
    print(f"Totals: {result_c['totals']}")
    print()
    print("Per-node verdicts:")
    for entry in result_c["by_node"]:
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
    for cls, stats in result_c["by_class"].items():
        print(f"  {cls:<30s}  {stats}")

    print()
    print("Running Fixture C assertions …")

    verdict_c: dict[str, str] = {}
    for entry in result_c["by_node"]:
        for cls in entry["classes"]:
            verdict_c[cls] = entry["verdict"]

    assert verdict_c.get("sgs-trust-bar__badge") == "TRANSFERRED", (
        f"Expected TRANSFERRED for trust-bar badge, got {verdict_c.get('sgs-trust-bar__badge')}"
    )
    assert verdict_c.get("sgs-hero__inner") == "FOLDED", (
        f"Expected FOLDED for hero inner, got {verdict_c.get('sgs-hero__inner')}"
    )
    assert verdict_c.get("sgs-cta__ribbon") == "DROPPED", (
        f"Expected DROPPED for cta ribbon, got {verdict_c.get('sgs-cta__ribbon')}"
    )
    assert verdict_c.get("sgs-site-header") == "CHROME", (
        f"Expected CHROME for site header, got {verdict_c.get('sgs-site-header')}"
    )
    assert verdict_c.get("sgs-about__lead") == "TRANSFERRED", (
        f"Expected TRANSFERRED for about lead (start==left tolerance), "
        f"got {verdict_c.get('sgs-about__lead')}"
    )

    # Score: 4 non-chrome nodes (badge + inner + ribbon + lead)
    #        2 transferred + 1 folded + 1 dropped = 75 %
    assert result_c["score_pct"] == 75.0, (
        f"Expected score 75.0, got {result_c['score_pct']}"
    )

    t = result_c["totals"]
    assert t["draft_total"] == 5, f"Expected draft_total=5, got {t['draft_total']}"
    assert t["chrome"] == 1,      f"Expected chrome=1, got {t['chrome']}"
    assert t["transferred"] == 2, f"Expected transferred=2, got {t['transferred']}"
    assert t["folded"] == 1,      f"Expected folded=1, got {t['folded']}"
    assert t["dropped"] == 1,     f"Expected dropped=1, got {t['dropped']}"

    print("Fixture C assertions passed.")
    print()
    print("All self-tests passed.")


if __name__ == "__main__":
    _self_test()
