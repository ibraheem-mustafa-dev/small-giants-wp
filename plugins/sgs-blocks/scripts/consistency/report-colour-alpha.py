#!/usr/bin/env python3
"""
report-colour-alpha.py

REPORT-ONLY (never non-zero exit) — surfaces colour controls that lack an
alpha/opacity channel, so an operator can't set a translucent overlay/border/
shadow colour even where the design would call for one.

What it does
------------
1. Counts colour-named attributes (name matches /colou?r/i, British or
   American spelling) across every `plugins/sgs-blocks/src/blocks/*/block.json`.
2. Determines, per block, whether its colour controls are ALPHA-CAPABLE. In
   SGS this capability comes from the shared `DesignTokenPicker` component,
   which sets `enableAlpha = true` BY DEFAULT (component line 57) and which no
   block opts out of (`grep -r "enableAlpha={false}"` → 0 hits). So a block is
   alpha-capable if its editor source (any `*.js`/`*.jsx` in the block's src
   folder) uses `DesignTokenPicker` or `StateToggleControl` (the hover/state
   colour switch built on the same token model) — OR the literal `enableAlpha`.
   Grepping ONLY the literal string (the original, wrong signal) reported 60
   false candidates on blocks that already offer alpha via DesignTokenPicker.
3. Emits a report:
   - total colour attrs found
   - how many blocks use `enableAlpha` at ALL (any colour control)
   - a per-attr list of colour attrs whose NAME suggests alpha is warranted
     (contains background|overlay|surface|border|shadow|scrim, case-
     insensitive) but whose block does NOT use `enableAlpha` anywhere —
     these are the strong upgrade candidates.
   - text/heading/link colour attrs are tagged "alpha not typically needed"
     (informational, not a candidate).

This is a discovery report, not a gate — it always exits 0. Use the output
to prioritise future `enableAlpha` additions; it does not block builds.

Usage
-----
    python scripts/consistency/report-colour-alpha.py

UK English throughout.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

if sys.stdout.encoding is None or sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
_HERE = Path(__file__).resolve().parent  # plugins/sgs-blocks/scripts/consistency/
_BLOCKS_DIR = _HERE.parent.parent / "src" / "blocks"  # plugins/sgs-blocks/src/blocks/

_COLOUR_ATTR_RE = re.compile(r"colou?r", re.IGNORECASE)
_ALPHA_WARRANTED_RE = re.compile(
    r"(background|overlay|surface|border|shadow|scrim)", re.IGNORECASE
)
# Names that are clearly text/heading/link colours — alpha not typically needed.
_TEXT_LIKE_RE = re.compile(
    r"(text|heading|title|label|link|headline|eyebrow|caption|body)",
    re.IGNORECASE,
)


def _iter_block_dirs() -> list[Path]:
    if not _BLOCKS_DIR.exists():
        return []
    return sorted(p.parent for p in _BLOCKS_DIR.glob("*/block.json"))


# Shared editor components that render an alpha-capable colour control.
# DesignTokenPicker sets enableAlpha=true by default (component line 57) and no
# block opts out; StateToggleControl (the Normal/Hover colour switch) is built on
# the same token model. A block using either — or the literal `enableAlpha` — is
# alpha-capable. (The original signal grepped ONLY `enableAlpha` and so missed
# the shared-component default, producing 60 false candidates.)
_ALPHA_CAPABLE_SIGNALS = ("DesignTokenPicker", "StateToggleControl", "enableAlpha")


def _block_uses_enable_alpha(block_dir: Path) -> bool:
    for js_path in list(block_dir.glob("*.js")) + list(block_dir.glob("*.jsx")):
        try:
            text = js_path.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        if any(sig in text for sig in _ALPHA_CAPABLE_SIGNALS):
            return True
    return False


def _collect_colour_attrs(block_json_path: Path) -> list[str]:
    try:
        with open(block_json_path, encoding="utf-8") as fh:
            data = json.load(fh)
    except (OSError, json.JSONDecodeError):
        return []

    if not isinstance(data, dict):
        return []

    attrs = data.get("attributes")
    if not isinstance(attrs, dict):
        return []

    return [name for name in attrs.keys() if _COLOUR_ATTR_RE.search(name)]


def main() -> int:
    block_dirs = _iter_block_dirs()

    total_colour_attrs = 0
    blocks_with_colour_attrs = 0
    blocks_using_enable_alpha: list[str] = []

    # (block_slug, attr_name) pairs
    alpha_warranted_missing: list[tuple[str, str]] = []
    text_like_attrs: list[tuple[str, str]] = []
    other_colour_attrs: list[tuple[str, str]] = []

    for block_dir in block_dirs:
        block_slug = block_dir.name
        bj_path = block_dir / "block.json"
        colour_attrs = _collect_colour_attrs(bj_path)
        if not colour_attrs:
            continue

        blocks_with_colour_attrs += 1
        total_colour_attrs += len(colour_attrs)

        uses_alpha = _block_uses_enable_alpha(block_dir)
        if uses_alpha:
            blocks_using_enable_alpha.append(block_slug)

        for attr_name in colour_attrs:
            if _TEXT_LIKE_RE.search(attr_name) and not _ALPHA_WARRANTED_RE.search(attr_name):
                text_like_attrs.append((block_slug, attr_name))
            elif _ALPHA_WARRANTED_RE.search(attr_name):
                if not uses_alpha:
                    alpha_warranted_missing.append((block_slug, attr_name))
            else:
                other_colour_attrs.append((block_slug, attr_name))

    # ------------------------------------------------------------------
    # Print report
    # ------------------------------------------------------------------
    print("=" * 78)
    print("COLOUR-ALPHA REPORT (informational only — never fails the build)")
    print("=" * 78)
    print()
    print(f"Total colour-named attributes found:     {total_colour_attrs}")
    print(f"Blocks with at least one colour attr:     {blocks_with_colour_attrs}")
    print(f"Blocks using `enableAlpha` anywhere:      {len(blocks_using_enable_alpha)}")
    if blocks_using_enable_alpha:
        for slug in blocks_using_enable_alpha:
            print(f"    - {slug}")
    print()

    print("-" * 78)
    print(
        f"STRONG UPGRADE CANDIDATES — {len(alpha_warranted_missing)} colour attr(s) "
        "whose name suggests alpha is warranted (background/overlay/surface/"
        "border/shadow/scrim), on a block that does NOT use enableAlpha:"
    )
    print("-" * 78)
    if alpha_warranted_missing:
        for slug, attr in sorted(alpha_warranted_missing):
            print(f"  [CANDIDATE] {slug}::{attr}")
    else:
        print("  (none)")
    print()

    print("-" * 78)
    print(
        f"Text/heading/link colours — alpha not typically needed "
        f"({len(text_like_attrs)}):"
    )
    print("-" * 78)
    if text_like_attrs:
        for slug, attr in sorted(text_like_attrs):
            print(f"  {slug}::{attr}")
    else:
        print("  (none)")
    print()

    if other_colour_attrs:
        print("-" * 78)
        print(f"Other colour attrs (unclassified — {len(other_colour_attrs)}):")
        print("-" * 78)
        for slug, attr in sorted(other_colour_attrs):
            print(f"  {slug}::{attr}")
        print()

    print("[report-colour-alpha] Report complete — always exits 0.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
