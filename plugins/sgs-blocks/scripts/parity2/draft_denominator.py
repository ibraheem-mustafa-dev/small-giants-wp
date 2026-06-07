"""
draft_denominator.py — Module 1 of 3, cloning-fidelity verifier.

PURPOSE
-------
Reshapes the parity golden captured by clone-parity.js into a canonical
NodeRecord list — one per DOM element, per viewport.  This list is the 100%
denominator: every node the draft contains, with its computed CSS, text, and
media data.  Modules 2 and 3 compare the cloned WP page against this baseline.

GOLDEN STRUCTURE (real, inspected 2026-06-07)
---------------------------------------------
Top-level keys: "375", "768", "1440"  (strings, not ints)
Each value: list of node dicts with these fields —
  sgsClasses  : str   — space-separated BEM class(es), e.g. "sgs-trust-bar__badge"
  tag         : str   — HTML tag, e.g. "div"
  text        : str   — element's text content (may include descendant text)
  section     : str   — JS-assigned bucket: "sgs-header" | "sgs-footer" | "root"
                        ("root" covers ALL main-content sections — too coarse to use
                        directly; we re-derive the section name from the BEM class)
  depth       : int   — DOM depth
  domPath     : str   — e.g. "main[0]>section[1]>div[0]>div[0]"
  rect        : dict  — {"w": int, "h": int}
  props       : dict  — computed CSS subset (61 properties + 4 pseudo-element keys)
  fontsLoaded : list  — font families loaded at capture time
  # img-only fields:
  src         : str   — file:// or https:// URL of the image
  naturalWidth: int   — natural pixel width (0 if not loaded)
  naturalHeight:int  — natural pixel height
  # NOTE: alt is NOT captured by clone-parity.js; media.alt is always "".

SECTION DERIVATION
------------------
The JS-captured `section` field is too coarse for `root` nodes.  We re-derive
from the node's first BEM class using the block-name portion:

  "sgs-trust-bar__badge"  →  "trust-bar"   (strip "sgs-" prefix + element/modifier)
  "sgs-hero__content"     →  "hero"
  "sgs-hero"              →  "hero"         (block root class)
  "sgs-button sgs-button--primary" → "button"
  "sgs-header"            →  "header"       (JS section already says "sgs-header")
  "sgs-footer__logo"      →  "footer"

Algorithm (for each node):
  1. Take the first space-separated token from sgsClasses.
  2. Strip the "sgs-" prefix to get the BEM block-element string.
  3. Split on "__" and take the first part → block name.
  4. That is the section.  If sgsClasses is empty, fall back to the JS section
     value stripped of the "sgs-" prefix.

CANONICAL NodeRecord SCHEMA
----------------------------
{
  "domPath"    : str,          # as captured
  "tag"        : str,
  "classes"    : [str],        # list of individual CSS classes
  "section"    : str,          # derived block name, e.g. "trust-bar"
  "text"       : str,          # trimmed text (may include descendant text; see note)
  "css"        : {str: str},   # the full props dict from the golden
  "media"      : {"src": str, "alt": str} | None,
  "imgNaturalW": int | None
}
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Optional

# ---------------------------------------------------------------------------
# Section derivation helpers
# ---------------------------------------------------------------------------

_SGS_PREFIX = "sgs-"

def _derive_section(sgs_classes: str, js_section: str) -> str:
    """
    Return the section name (plain block name, no 'sgs-' prefix) for a node.

    Strategy:
      • Take the first space-separated token from sgs_classes.
      • Strip 'sgs-' prefix.
      • Split on '__', take the first part (the BEM block name).
      • Fall back to stripping 'sgs-' from the JS-captured section field.
    """
    first_class = sgs_classes.split()[0] if sgs_classes.strip() else ""
    if first_class.startswith(_SGS_PREFIX):
        block_element = first_class[len(_SGS_PREFIX):]   # e.g. "trust-bar__badge"
        block_name = block_element.split("__")[0]         # e.g. "trust-bar"
        if block_name:
            return block_name

    # Fallback: strip 'sgs-' from the JS section value.
    if js_section.startswith(_SGS_PREFIX):
        return js_section[len(_SGS_PREFIX):]
    return js_section  # e.g. "root" as a last resort


# ---------------------------------------------------------------------------
# Media extraction
# ---------------------------------------------------------------------------

def _extract_media(node: dict) -> tuple[Optional[dict], Optional[int]]:
    """
    Return (media_dict | None, img_natural_width | None).
    Only img tags have src/naturalWidth fields in the golden.
    alt is not captured by clone-parity.js — always set to "".
    """
    if node.get("tag") != "img":
        return None, None

    src = node.get("src", "")
    natural_w_raw = node.get("naturalWidth")
    natural_w = int(natural_w_raw) if natural_w_raw is not None else None

    return {"src": src, "alt": ""}, natural_w


# ---------------------------------------------------------------------------
# Single-node reshape
# ---------------------------------------------------------------------------

def _reshape_node(node: dict) -> dict:
    """Convert one raw golden node into a canonical NodeRecord."""
    sgs_classes = node.get("sgsClasses", "")
    js_section = node.get("section", "")

    # classes list — split space-separated, drop empties
    classes = [c for c in sgs_classes.split() if c]

    # section derived from BEM class
    section = _derive_section(sgs_classes, js_section)

    # text — trimmed; the golden stores the element's textContent which may
    # include descendant text when the JS capturer traverses the DOM.
    text = (node.get("text") or "").strip()

    # ownText — direct text-node children only (added alongside `text` so the
    # verifier can match container elements structurally when their full
    # textContent is shared with a descendant).
    own_text = (node.get("ownText") or "").strip()

    # css — the full props dict (61 computed-style properties + 4 pseudo keys)
    css: dict[str, str] = node.get("props") or {}

    # media + naturalWidth (img nodes only)
    media, img_natural_w = _extract_media(node)

    return {
        "domPath": node.get("domPath", ""),
        "tag": node.get("tag", ""),
        "classes": classes,
        "section": section,
        "text": text,
        "ownText": own_text,
        "css": css,
        "media": media,
        "imgNaturalW": img_natural_w,
    }


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def build_denominator(golden_path: str) -> dict[int, list[dict]]:
    """
    Load the parity golden and reshape every node into a canonical NodeRecord.

    Returns
    -------
    dict mapping viewport width (int) → list of NodeRecord dicts.
    Keys are always 375, 768, 1440 (or whatever viewports the golden contains).
    """
    path = Path(golden_path)
    with path.open(encoding="utf-8") as fh:
        raw: dict = json.load(fh)

    result: dict[int, list[dict]] = {}
    for vp_key, nodes in raw.items():
        vp_int = int(vp_key)
        result[vp_int] = [_reshape_node(n) for n in nodes]

    return result


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

def _default_golden() -> str:
    """Resolve the default golden path relative to this script's repo location."""
    here = Path(__file__).resolve()
    # parity2/ → scripts/ → sgs-blocks/ → plugins/ → repo root
    repo_root = here.parents[4]
    return str(
        repo_root
        / "sites"
        / "mamas-munches"
        / "mockups"
        / "homepage"
        / ".parity-golden.json"
    )


def _main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")

    parser = argparse.ArgumentParser(
        description="Build the draft denominator (NodeRecord list) from parity-golden.json."
    )
    parser.add_argument(
        "--golden",
        default=_default_golden(),
        help="Path to .parity-golden.json (default: auto-detected from repo layout).",
    )
    parser.add_argument(
        "--out",
        default="expectations.json",
        help="Output path for the serialised NodeRecord list (default: expectations.json).",
    )
    args = parser.parse_args()

    print(f"Loading golden: {args.golden}")
    denominator = build_denominator(args.golden)

    # ---- summary stats ----
    print()
    print("=== Denominator summary ===")
    for vp, records in sorted(denominator.items()):
        with_text = sum(1 for r in records if r["text"])
        with_media = sum(1 for r in records if r["media"] is not None)
        print(
            f"  {vp}px viewport : {len(records):>4} nodes"
            f"  |  {with_text:>3} with text"
            f"  |  {with_media:>2} with media (img)"
        )

    # ---- spot-check: trust-bar__badge ----
    records_1440 = denominator.get(1440, [])
    badge_nodes = [r for r in records_1440 if "sgs-trust-bar__badge" in r["classes"]]
    print()
    print(f"=== trust-bar__badge nodes (1440px, count={len(badge_nodes)}) ===")
    if badge_nodes:
        print(json.dumps(badge_nodes[0], indent=2, ensure_ascii=False))

    # ---- spot-check: sgs-hero__content ----
    hero_content_nodes = [r for r in records_1440 if "sgs-hero__content" in r["classes"]]
    print()
    print(f"=== sgs-hero__content nodes (1440px, count={len(hero_content_nodes)}) ===")
    if hero_content_nodes:
        sample = hero_content_nodes[0]
        # Truncate text and css to keep output readable
        display = dict(sample)
        display["text"] = sample["text"][:80] + ("…" if len(sample["text"]) > 80 else "")
        display["css"] = {k: v for k, v in list(sample["css"].items())[:8]}
        display["css"]["..."] = f"({len(sample['css'])} total props)"
        print(json.dumps(display, indent=2, ensure_ascii=False))

    # ---- write output ----
    out_path = Path(args.out)
    serialisable = {str(vp): records for vp, records in denominator.items()}
    with out_path.open("w", encoding="utf-8") as fh:
        json.dump(serialisable, fh, ensure_ascii=False, indent=2)
    print()
    print(f"Written: {out_path.resolve()} ({out_path.stat().st_size:,} bytes)")


if __name__ == "__main__":
    _main()
