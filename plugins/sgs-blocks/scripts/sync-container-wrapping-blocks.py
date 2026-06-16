#!/usr/bin/env python3
"""
sync-container-wrapping-blocks.py
=================================

Tracks every SGS block that is container-bearing (wraps children via InnerBlocks,
layout orchestration, or structural parent), keeps `block_composition.wraps_block`
+ `container_kind` consistent, and emits a per-block attribute-diff so the operator
can propagate new sgs/container capabilities (e.g. contentWidth) to the right
blocks with the right attr-subset.

Criterion (D150 validated, 5 qc-council rounds — R-22-1 DB-first, no hardcoded
block→kind dict):
  A block is container-bearing iff it WRAPS CHILDREN via ANY of:
  (a) a real InnerBlocks slot (save.js InnerBlocks.Content OR edit.js
      useInnerBlocksProps / <InnerBlocks)
  (b) a strong layout-orchestration attr (grid: columns*/gridTemplate*/
      gridItem*/justifyItems/alignContent; flex: direction/justifyContent/
      wrap/alignItems; or `layout`). `gap` ALONE does NOT qualify.
  NOTE: D150 also defines criterion (c) — array-of-OBJECTS content attr
  (e.g. a block with a `type: "array"` attr whose items are objects
  representing child content units). This criterion is NOT currently
  implemented in detection. Every block in the validated 28-block roster
  qualifies via (a) or (b); the only candidate that is container-bearing
  SOLELY via (c) is sgs/social-icons, which is intentionally excluded
  (icon array, not child-block parenting). A future block that is
  container-bearing ONLY via an array-of-objects attr would not be
  detected by this script — tracked as a latent R-22-9 gap requiring a
  future detection extension.
  Excludes: sgs/container itself, chrome-only blocks (mobile-nav-toggle,
  mega-menu), pure-InnerBlocks blocks that have no layout surface (handled
  by KIND below).

KIND (role-based, drives per-block diff sub-typing):
  section  — self-contained panel owning its whole frame (full attr surface).
             Detected via: section-frame attrs (background*/overlay*/shapeDivider*/
             bgVideo) OR operator override in block.json
             supports.sgs.containerKind:"section".
             (widthMode removed from section signals 2026-06-04 — it is now a
             universal width capability mirrored onto every KIND, not a section
             discriminator.)
  layout   — arranges/parents MULTIPLE children. Detected via: layout-
             orchestration attr (grid/flex/columns) OR structural-parent
             (a non-form-field child block declares parent=[this_slug]).
  content  — holds ONE unit's content (InnerBlocks only, no layout or
             section attrs, not a structural parent).

Two operator overrides via block.json supports.sgs.containerKind. /sgs-update
Stage 1 reads this flag into block_composition.container_kind.
  - trust-bar: override IS load-bearing. Without it, trust-bar's `columns`
    attr would route it to KIND=layout. The override forces KIND=section
    (full-bleed wrapper + max-width grid).
  - modal: override is redundant defence-in-depth, NOT strictly required.
    modal IS attr-derivable to KIND=section via its `overlayColour` and
    `overlayOpacity` attrs (both match SECTION_ATTR_RE). The
    containerKind:"section" override on modal is therefore belt-and-braces
    rather than load-bearing.

R-22-1 (DB-first / no hardcoded dicts): block roster is derived from
block.json source files. Attribute lists come from each block's block.json.
The KIND→attr-scope map replaces the old GRID_ONLY_ATTRS constant (Rater B:
mandatory to avoid noise diffs when propagating capabilities to the wrong KIND).

R-22-9 (universal mechanism): one diff-emitter walks every container-bearing
block. No per-block branches.

Usage:
  python sync-container-wrapping-blocks.py                           # dry-run (prints roster, no DB writes, no block.json writes)
  python sync-container-wrapping-blocks.py --apply                   # write wraps_block + container_kind to DB
  python sync-container-wrapping-blocks.py --write-block-json        # dry-run of block.json attribute mirror (reports what would change)
  python sync-container-wrapping-blocks.py --write-block-json --apply  # mirror KIND-scoped attrs into each composite block.json
  python sync-container-wrapping-blocks.py --target-block sgs/hero   # limit detection to one block
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sqlite3
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

sys.stdout.reconfigure(encoding="utf-8")

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

SCRIPT_DIR = Path(__file__).resolve().parent
PLUGIN_ROOT = SCRIPT_DIR.parent              # plugins/sgs-blocks
SRC_BLOCKS = PLUGIN_ROOT / "src" / "blocks"
REPO_ROOT = PLUGIN_ROOT.parent.parent        # small-giants-wp/
PIPELINE_STATE = REPO_ROOT / "pipeline-state" / "container-inheritance-sync"

DB_CANDIDATES = [
    Path(os.path.expanduser("~/.agents/skills/sgs-wp-engine/sgs-framework.db")),
    SCRIPT_DIR / "sgs-framework.db",
]


def find_db() -> Path:
    for p in DB_CANDIDATES:
        if p.exists() and p.stat().st_size > 0:
            return p
    raise SystemExit(f"No populated sgs-framework.db found. Tried: {DB_CANDIDATES}")


# ---------------------------------------------------------------------------
# Detection criterion patterns (D150 validated)
# ---------------------------------------------------------------------------

# (b) Strong layout-orchestration attrs — presence of ANY qualifies (gap alone does NOT).
LAYOUT_ATTR_RE = re.compile(
    r"^("
    r"columns|columnsMobile|columnsTablet|columnsDesktop|"
    r"gridTemplateColumns|gridTemplateColumnsTablet|gridTemplateColumnsMobile|"
    r"gridTemplateRows|gridTemplateRowsTablet|gridTemplateRowsMobile|"
    r"gridAutoRows|"
    r"gridItemPadding|gridItemBackground|gridItemBorderRadius|"
    r"gridItemBorder|gridItemShadow|gridItemTextColour|"
    r"justifyItems|alignContent|"
    r"direction|flexDirection|justifyContent|flexWrap|wrap|alignItems|"
    r"layout|layoutMode"
    r")$",
    re.IGNORECASE,
)

# Section-frame attrs — presence triggers KIND=section (if no operator override).
# NOTE: `widthMode` was REMOVED 2026-06-04 — it is no longer a section discriminator.
# WS-4's composite-mirror added `widthMode` (a shared width capability) to every
# layout- and content-KIND composite, so its presence no longer signals a section;
# leaving it here mis-tagged all 25 mirrored composites as `section`. The genuine
# section signals are the bespoke background/overlay/shape-divider/bg-video attrs
# below, plus the explicit `supports.sgs.containerKind:"section"` override.
SECTION_ATTR_RE = re.compile(
    r"^("
    r"backgroundImage|backgroundImageTablet|backgroundImageMobile|"
    r"backgroundOverlayColour|backgroundOverlayOpacity|"
    r"backgroundMedia|backgroundVideo|"
    r"overlayGradient|overlayColour|overlayOpacity|overlayColor|"
    r"shapeDivider|shapeDividerTop|shapeDividerBottom|"
    r"bgSvgContent|bgVideo|bgVideoMobile"
    r")$",
    re.IGNORECASE,
)

# Blocks that are never container-bearing regardless of their attrs.
EXCLUDE_SLUGS: Set[str] = {
    "sgs/container",       # the reference block itself
    "sgs/mobile-nav-toggle",  # chrome-only toggle button
    "sgs/mega-menu",          # navigation chrome, not a content wrapper
}

# ---------------------------------------------------------------------------
# KIND → attribute scope map (replaces old GRID_ONLY_ATTRS constant, Rater B)
# ---------------------------------------------------------------------------
# Each KIND only receives diff coverage for the attr subset that makes sense.
# section  → full container attr surface (all capabilities propagate).
# layout   → grid/flex/width/contentWidth (layout orchestration only).
# content  → width/contentWidth/spacing (per-item sizing only).
# Attrs outside a KIND's scope are excluded from the diff as noise.

KIND_ATTR_SCOPE: Dict[str, Set[str]] = {
    "section": set(),   # empty = all attrs included (no filter for sections)
    "layout": {
        "columns", "columnsMobile", "columnsTablet", "columnsDesktop",
        "gridTemplateColumns", "gridTemplateColumnsTablet", "gridTemplateColumnsMobile",
        "gridTemplateRows", "gridTemplateRowsTablet", "gridTemplateRowsMobile",
        "gridAutoRows",
        "justifyItems", "alignContent",
        "direction", "flexDirection", "justifyContent", "flexWrap", "wrap", "alignItems",
        "layout", "layoutMode",
        "gap", "gapTablet", "gapMobile",
        "maxWidth", "customWidth", "widthMode", "contentWidth",
        "templateMode",
    },
    "content": {
        "maxWidth", "customWidth", "widthMode", "contentWidth",
        "padding", "paddingTop", "paddingBottom", "paddingLeft", "paddingRight",
        "paddingBlock", "paddingInline",
    },
}


# ---------------------------------------------------------------------------
# Mirrored WP-native styling SUPPORTS (WS-4 supports propagation)
# ---------------------------------------------------------------------------
# Each composite that wraps sgs/container should expose the SAME native styling
# capabilities (border / background / gradient / text colour) as sgs/container,
# for ALL KINDs identically (Bean's decision: full styling for all KINDs). Today
# these are hand-authored per composite and drift (e.g. notice-banner has
# supports.color.background:false; product-card has no color support at all),
# so we FORCE each path to the container's value — overriding an absent OR
# explicitly-false composite value, because making them universally available
# is the whole point.
#
# These (top_key, sub_key) pairs are the ONLY supports paths propagated. The
# actual values are read from the container's own block.json supports at runtime
# (NOT hardcoded here) so this stays truth-from-container (R-22-1 spirit).
#
# DELIBERATELY EXCLUDES supports.spacing (padding / margin): forcing native
# spacing.padding onto blocks that already carry a custom padding attribute
# (e.g. product-card's `innerPadding`) would create a duplicate dead control
# (D192). Padding stays handled by the KIND_ATTR_SCOPE attribute mirror above.
MIRRORED_SUPPORT_PATHS: List[Tuple[str, str]] = [
    ("color", "background"),
    ("color", "gradients"),
    ("color", "text"),
    ("__experimentalBorder", "radius"),
    ("__experimentalBorder", "width"),
    ("__experimentalBorder", "color"),
    ("__experimentalBorder", "style"),
]


def container_support_values(container_json: Dict[str, Any]) -> Dict[Tuple[str, str], Any]:
    """Read the truthy values for MIRRORED_SUPPORT_PATHS from the container's own
    block.json supports — truth-from-container (R-22-1), never a hardcoded value dict.
    Missing paths are skipped (only present container values are propagated)."""
    supports = container_json.get("supports", {}) or {}
    values: Dict[Tuple[str, str], Any] = {}
    for top, sub in MIRRORED_SUPPORT_PATHS:
        top_block = supports.get(top, {})
        if isinstance(top_block, dict) and sub in top_block:
            values[(top, sub)] = top_block[sub]
    return values


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def load_block_json(slug: str) -> Optional[Dict[str, Any]]:
    """Load src/blocks/<name>/block.json for sgs/<name>. Soft-fail on errors."""
    if not slug.startswith("sgs/"):
        return None
    name = slug.split("/", 1)[1]
    path = SRC_BLOCKS / name / "block.json"
    if not path.exists():
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"  [warn] failed to parse {path}: {e}", file=sys.stderr)
        return None


def read_js_combined(slug: str) -> str:
    """Read save.js + edit.js for a block into one string for pattern matching."""
    if not slug.startswith("sgs/"):
        return ""
    name = slug.split("/", 1)[1]
    block_dir = SRC_BLOCKS / name
    combined = ""
    for js_file in ("save.js", "edit.js"):
        p = block_dir / js_file
        if p.exists():
            try:
                combined += p.read_text(encoding="utf-8", errors="ignore")
            except OSError:
                pass
    return combined


def has_innerblocks_slot(slug: str) -> bool:
    """True if save.js or edit.js contains a real InnerBlocks usage."""
    js = read_js_combined(slug)
    return bool(re.search(r"useInnerBlocksProps|InnerBlocks\.Content|<InnerBlocks", js))


def layout_attrs_for(attrs: Dict[str, Any]) -> List[str]:
    """Return attr names that qualify as layout-orchestration attrs."""
    return [k for k in attrs if LAYOUT_ATTR_RE.match(k)]


def section_attrs_for(attrs: Dict[str, Any]) -> List[str]:
    """Return attr names that qualify as section-frame attrs."""
    return [k for k in attrs if SECTION_ATTR_RE.match(k)]


def build_structural_parents(slugs: List[str]) -> Set[str]:
    """Return the set of block slugs that are structural parents.

    A structural parent is a block that is declared as `parent` by a NON-form-field,
    NON-chrome child block. This covers:
      - sgs/accordion  (accordion-item declares parent=['sgs/accordion'])
      - sgs/tabs       (tab declares parent=['sgs/tabs'])
      - sgs/form       (form-step declares parent=['sgs/form'])

    Explicitly excluded from the child scan:
      - sgs/form-field-* (config inputs, not structural items)
      - sgs/form-review  (config block)
      - sgs/mega-menu    (navigation chrome)
    These blocks declare parent relationships for constraining their editor
    placement, not because the parent is a layout container of multiple items.
    """
    structural: Set[str] = set()
    for slug in slugs:
        bj = load_block_json(slug)
        if not bj:
            continue
        parents = bj.get("parent", None)
        if not parents:
            continue
        # Skip if this child is a form-field input, chrome block, or review block
        if (slug.startswith("sgs/form-field")
                or slug in {"sgs/form-review", "sgs/mega-menu"}):
            continue
        for parent_slug in parents:
            structural.add(parent_slug)
    return structural


def derive_kind(
    slug: str,
    bj: Dict[str, Any],
    structural_parents: Set[str],
) -> str:
    """Derive the container KIND for a block.

    Priority:
    1. Operator override in block.json supports.sgs.containerKind.
    2. Section-frame attrs → section.
    3. Layout-orchestration attrs OR structural parent → layout.
    4. Default → content.
    """
    supports = bj.get("supports", {}) or {}
    sgs_supports = supports.get("sgs", {}) or {}
    override = sgs_supports.get("containerKind", None)
    if override in ("section", "layout", "content"):
        return override

    attrs = bj.get("attributes", {}) or {}
    if section_attrs_for(attrs):
        return "section"
    if layout_attrs_for(attrs) or slug in structural_parents:
        return "layout"
    return "content"


# ---------------------------------------------------------------------------
# Naming-drift detection (unchanged from original — informational only)
# ---------------------------------------------------------------------------

KNOWN_NAMING_DRIFTS: Dict[str, str] = {
    "overlayColour": "backgroundOverlayColour",
    "overlayColor": "backgroundOverlayColour",
    "overlayOpacity": "backgroundOverlayOpacity",
    "bgImage": "backgroundImage",
    "bgColor": "backgroundColor",
    "bgColour": "backgroundColor",
}


def detect_naming_drifts(block_attrs: List[str], container_attrs: List[str]) -> List[Tuple[str, str]]:
    drifts: List[Tuple[str, str]] = []
    c_lower = {a.lower(): a for a in container_attrs}
    for ba in block_attrs:
        if ba in KNOWN_NAMING_DRIFTS:
            target = KNOWN_NAMING_DRIFTS[ba]
            if target in container_attrs and ba not in container_attrs:
                drifts.append((ba, target))
            continue
        if ba in container_attrs:
            continue
        ba_l = ba.lower()
        for c_l, c_orig in c_lower.items():
            if c_l == ba_l:
                continue
            if ba_l.endswith(c_l) and len(ba_l) > len(c_l) and c_l not in {"colour", "color", "size", "image"}:
                drifts.append((ba, c_orig))
                break
    return drifts


# ---------------------------------------------------------------------------
# Diff report rendering
# ---------------------------------------------------------------------------

def scoped_container_attrs(container_non_grid: List[str], kind: str, container_attrs_def: Dict[str, Any]) -> List[str]:
    """Filter container attrs to those relevant for this KIND (Rater B — no noise diffs)."""
    if kind == "section":
        return container_non_grid   # sections get the full surface
    scope = KIND_ATTR_SCOPE.get(kind, set())
    return [a for a in container_non_grid if a in scope]


def _spec_fields(spec: Any) -> Tuple[str, Any, Any]:
    """Extract (type, default, enum) from an attr spec dict. Safe on non-dict."""
    if not isinstance(spec, dict):
        return ("?", _SENTINEL, None)
    t = spec.get("type", "?")
    default = spec.get("default", _SENTINEL)
    enum = spec.get("enum", None)
    return (t, default, enum)


# Sentinel for "no default defined" (distinct from explicit None / 0 / "" defaults).
_SENTINEL = object()


def detect_altered_attrs(
    block_attrs_def: Dict[str, Any],
    container_attrs_def: Dict[str, Any],
    scoped_attrs: List[str],
) -> List[Dict[str, Any]]:
    """Return attrs present in BOTH the composite and container (within KIND scope)
    whose spec (type / default / enum) differs.

    Each entry is a dict with keys:
      attr, c_type, c_default, c_enum, b_type, b_default, b_enum, differs_in
    """
    altered: List[Dict[str, Any]] = []
    for attr in scoped_attrs:
        if attr not in block_attrs_def:
            continue  # missing, not altered
        c_spec = container_attrs_def.get(attr, {})
        b_spec = block_attrs_def.get(attr, {})
        c_type, c_default, c_enum = _spec_fields(c_spec)
        b_type, b_default, b_enum = _spec_fields(b_spec)

        differs_in: List[str] = []
        if c_type != b_type:
            differs_in.append("type")
        # Compare defaults carefully — treat _SENTINEL as "not defined".
        c_def_val = None if c_default is _SENTINEL else c_default
        b_def_val = None if b_default is _SENTINEL else b_default
        c_has_default = c_default is not _SENTINEL
        b_has_default = b_default is not _SENTINEL
        if c_has_default != b_has_default or c_def_val != b_def_val:
            differs_in.append("default")
        # Normalise enum to sorted tuple for stable comparison.
        c_enum_norm = tuple(sorted(c_enum)) if c_enum else None
        b_enum_norm = tuple(sorted(b_enum)) if b_enum else None
        if c_enum_norm != b_enum_norm:
            differs_in.append("enum")

        if differs_in:
            altered.append({
                "attr": attr,
                "c_type": c_type,
                "c_default": c_def_val,
                "c_enum": c_enum,
                "b_type": b_type,
                "b_default": b_def_val,
                "b_enum": b_enum,
                "differs_in": differs_in,
            })
    return altered


# All attr names that appear in any KIND_ATTR_SCOPE value — used to classify extras.
_ALL_SCOPED_NAMES: Set[str] = set().union(*KIND_ATTR_SCOPE.values())


def _is_wrapper_namespace(attr_name: str) -> bool:
    """Return True if an extra attr looks like a wrapper/layout concern.

    Heuristic (deterministic — no fuzzy matching):
      - Name matches LAYOUT_ATTR_RE or SECTION_ATTR_RE, OR
      - Name appears in any KIND_ATTR_SCOPE value (width/spacing/grid family), OR
      - Name matches KNOWN_NAMING_DRIFTS (old alias for a container wrapper attr).
    """
    if LAYOUT_ATTR_RE.match(attr_name):
        return True
    if SECTION_ATTR_RE.match(attr_name):
        return True
    if attr_name in _ALL_SCOPED_NAMES:
        return True
    if attr_name in KNOWN_NAMING_DRIFTS:
        return True
    return False


def detect_added_attrs(
    block_attrs_def: Dict[str, Any],
    container_attrs_def: Dict[str, Any],
) -> Tuple[List[str], List[str]]:
    """Return (wrapper_extras, interior_attrs) — attrs the composite HAS that container does NOT.

    wrapper_extras — look like wrapper/layout concerns → likely drift to reconcile.
    interior_attrs — everything else → composite's own content, legitimately keep.
    """
    extras = [a for a in block_attrs_def if a not in container_attrs_def]
    wrapper_extras: List[str] = []
    interior_attrs: List[str] = []
    for attr in extras:
        if _is_wrapper_namespace(attr):
            wrapper_extras.append(attr)
        else:
            interior_attrs.append(attr)
    return (sorted(wrapper_extras), sorted(interior_attrs))


def _fmt_spec(t: str, default: Any, enum: Any) -> str:
    """Format a spec tuple as a compact Markdown-safe string."""
    parts = [f"type={t}"]
    if default is not None:
        parts.append(f"default={json.dumps(default)}")
    if enum:
        enum_str = json.dumps(enum)
        if len(enum_str) > 50:
            enum_str = enum_str[:47] + "..."
        parts.append(f"enum={enum_str}")
    return " · ".join(parts)


def render_diff_markdown(
    block_slug: str,
    kind: str,
    detection_reasons: List[str],
    block_attrs: List[str],
    block_attrs_def: Dict[str, Any],
    scoped_attrs: List[str],
    drifts: List[Tuple[str, str]],
    container_attrs_def: Dict[str, Any],
) -> str:
    missing = [a for a in scoped_attrs if a not in block_attrs]
    altered = detect_altered_attrs(block_attrs_def, container_attrs_def, scoped_attrs)
    wrapper_extras, interior_attrs = detect_added_attrs(block_attrs_def, container_attrs_def)

    lines: List[str] = []
    lines.append(f"# Container inheritance diff — `{block_slug}`")
    lines.append("")
    lines.append(f"_Generated: {datetime.now(timezone.utc).isoformat()}_")
    lines.append(f"_container_kind: **{kind}**_")
    lines.append("")
    lines.append("## Why this block is tracked")
    lines.append("")
    lines.append(f"Detection signals: {', '.join(detection_reasons)}")
    lines.append("")

    # ------------------------------------------------------------------
    # Section 1: Missing attributes (KIND-scoped) — unchanged
    # ------------------------------------------------------------------
    lines.append("## Missing attributes (KIND-scoped)")
    lines.append("")
    if not missing:
        lines.append(f"None. This block already covers every `{kind}`-scoped attribute on `sgs/container`.")
    else:
        lines.append(f"`sgs/container` defines {len(missing)} `{kind}`-scoped attribute(s)")
        lines.append("absent from this block. Operator decides: port, alias, or deliberate skip.")
        lines.append("")
        lines.append("| Attribute | Type | Container default |")
        lines.append("|---|---|---|")
        for a in missing:
            spec = container_attrs_def.get(a, {}) or {}
            t = spec.get("type", "?") if isinstance(spec, dict) else "?"
            default = spec.get("default", "") if isinstance(spec, dict) else ""
            d_str = json.dumps(default) if default not in ("", None) else ""
            if len(d_str) > 40:
                d_str = d_str[:37] + "..."
            lines.append(f"| `{a}` | `{t}` | `{d_str}` |")
    lines.append("")

    # ------------------------------------------------------------------
    # Section 2: Naming drift candidates — unchanged
    # ------------------------------------------------------------------
    lines.append("## Naming drift candidates")
    lines.append("")
    if not drifts:
        lines.append("None detected.")
    else:
        lines.append("| Block attribute | Container equivalent |")
        lines.append("|---|---|")
        for ba, ca in drifts:
            lines.append(f"| `{ba}` | `{ca}` |")
    lines.append("")

    # ------------------------------------------------------------------
    # Section 3 (NEW): Altered / drifted attributes
    # ------------------------------------------------------------------
    lines.append("## Altered / drifted attributes")
    lines.append("")
    lines.append(
        "Attributes present in BOTH this block and `sgs/container` (within KIND scope) "
        "whose spec (type / default / enum) has drifted."
    )
    lines.append("")
    if not altered:
        lines.append("None. All shared KIND-scoped attributes match `sgs/container` spec exactly.")
    else:
        lines.append(f"{len(altered)} shared attribute(s) have diverged from `sgs/container`.")
        lines.append("")
        lines.append("| Attribute | Container spec | This block spec | Differs in |")
        lines.append("|---|---|---|---|")
        for row in altered:
            c_str = _fmt_spec(row["c_type"], row["c_default"], row["c_enum"])
            b_str = _fmt_spec(row["b_type"], row["b_default"], row["b_enum"])
            diffs = ", ".join(row["differs_in"])
            lines.append(f"| `{row['attr']}` | `{c_str}` | `{b_str}` | {diffs} |")
    lines.append("")

    # ------------------------------------------------------------------
    # Section 4 (NEW): Added attributes
    # ------------------------------------------------------------------
    lines.append("## Added attributes")
    lines.append("")
    lines.append(
        "Attributes this block defines that `sgs/container` does NOT. "
        "Split by wrapper-namespace (potential drift → reconcile) vs interior content (keep)."
    )
    lines.append("")

    lines.append("### Wrapper-namespace extras (reconcile)")
    lines.append("")
    lines.append(
        "These names match layout/section/width/spacing patterns — they may be drift from "
        "an older version of `sgs/container` or a parallel implementation that should be merged."
    )
    lines.append("")
    if not wrapper_extras:
        lines.append("None.")
    else:
        lines.append("| Attribute | Type | Default |")
        lines.append("|---|---|---|")
        for attr in wrapper_extras:
            spec = block_attrs_def.get(attr, {}) or {}
            t = spec.get("type", "?") if isinstance(spec, dict) else "?"
            default = spec.get("default", "") if isinstance(spec, dict) else ""
            d_str = json.dumps(default) if default not in ("", None) else ""
            if len(d_str) > 40:
                d_str = d_str[:37] + "..."
            lines.append(f"| `{attr}` | `{t}` | `{d_str}` |")
    lines.append("")

    lines.append("### Interior attrs (keep)")
    lines.append("")
    lines.append(
        "These are this block's own content/config attributes — legitimately absent from "
        "`sgs/container`. No action needed."
    )
    lines.append("")
    if not interior_attrs:
        lines.append("None.")
    else:
        lines.append("| Attribute | Type | Default |")
        lines.append("|---|---|---|")
        for attr in interior_attrs:
            spec = block_attrs_def.get(attr, {}) or {}
            t = spec.get("type", "?") if isinstance(spec, dict) else "?"
            default = spec.get("default", "") if isinstance(spec, dict) else ""
            d_str = json.dumps(default) if default not in ("", None) else ""
            if len(d_str) > 40:
                d_str = d_str[:37] + "..."
            lines.append(f"| `{attr}` | `{t}` | `{d_str}` |")
    lines.append("")

    # ------------------------------------------------------------------
    # Action gate — unchanged
    # ------------------------------------------------------------------
    lines.append("## Action gate")
    lines.append("")
    lines.append("This file is informational. No `block.json` is mutated by the")
    lines.append("sync script. Bring decisions back into the canonical plan before")
    lines.append("editing block source.")
    lines.append("")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Block.json mirror writer (WS-4 propagation, D160)
# ---------------------------------------------------------------------------

def mirror_attrs_to_block_json(
    container_bearing: List[Tuple[str, str, List[str]]],
    container_attrs_def: Dict[str, Any],
    container_non_grid: List[str],
    container_support_vals: Dict[Tuple[str, str], Any],
    apply: bool = False,
) -> List[Dict[str, Any]]:
    """Mirror KIND-scoped sgs/container attrs AND native styling supports into
    each composite block.json.

    Rules (WS-4 spec):
    - Only blocks with wraps_block='sgs/container' qualification (i.e. in
      container_bearing) are candidates.
    - Blocks with supports.sgs.containerMirror === false are SKIPPED (C6) —
      neither attrs NOR supports are touched.
    - Per KIND, the attr subset is derived from KIND_ATTR_SCOPE (reused, no
      new hardcoded dict):
        section → all container attrs (KIND_ATTR_SCOPE["section"] == empty set
                  means no filter — full surface)
        layout  → KIND_ATTR_SCOPE["layout"]
        content → KIND_ATTR_SCOPE["content"]
    - An attr that is ALREADY present in the composite's block.json is NOT
      overwritten (composite's own definition wins — log as ALTERED/kept).
    - SUPPORTS (MIRRORED_SUPPORT_PATHS) are FORCED to the container's value for
      ALL KINDs identically — overriding an absent OR explicitly-false composite
      value (universal availability is the whole point). Spacing is NOT mirrored
      (D192 — see MIRRORED_SUPPORT_PATHS comment).
    - Idempotent: running twice produces no further changes.
    - apply=False (dry-run): reports per-composite plan, writes nothing.
    - apply=True: writes block.json in-place (validate JSON before write;
      fail LOUD if validation fails — never partial write).

    Returns a list of per-block result dicts, one per composite:
      {
        "slug": str,
        "kind": str,
        "skipped": bool,          # True if containerMirror:false
        "skip_reason": str | None,
        "would_add": List[str],   # attrs that would be / were added
        "already_present": List[str],  # scoped attrs already in composite (kept)
        "supports_added": List[str],   # "top.sub" support paths newly added
        "supports_forced": List[str],  # "top.sub" present-but-different, overridden
        "written": bool,          # True only if apply=True and file was written
        "error": str | None,
      }
    """
    results: List[Dict[str, Any]] = []

    for slug, kind, _reasons in container_bearing:
        entry: Dict[str, Any] = {
            "slug": slug,
            "kind": kind,
            "skipped": False,
            "skip_reason": None,
            "would_add": [],
            "already_present": [],
            "supports_added": [],
            "supports_forced": [],
            "written": False,
            "error": None,
        }

        # Load block.json
        bj = load_block_json(slug)
        if not bj:
            entry["error"] = "Could not load block.json"
            results.append(entry)
            continue

        # Check containerMirror exclusion (C6)
        supports = bj.get("supports", {}) or {}
        sgs_supports = supports.get("sgs", {}) or {}
        if sgs_supports.get("containerMirror") is False:
            entry["skipped"] = True
            entry["skip_reason"] = "containerMirror:false"
            results.append(entry)
            continue

        # Compute KIND-scoped attr subset from container
        scoped = scoped_container_attrs(container_non_grid, kind, container_attrs_def)

        block_attrs_def: Dict[str, Any] = bj.get("attributes", {}) or {}

        would_add: List[str] = []
        already_present: List[str] = []
        for attr in scoped:
            if attr in block_attrs_def:
                already_present.append(attr)
            else:
                would_add.append(attr)

        entry["would_add"] = sorted(would_add)
        entry["already_present"] = sorted(already_present)

        # Reconcile native styling supports (MIRRORED_SUPPORT_PATHS) — FORCED to
        # the container's value for ALL KINDs. Build the updated supports block so
        # both dry-run reporting AND apply can use it. Spacing is never touched.
        existing_supports = bj.get("supports", {}) or {}
        updated_supports = dict(existing_supports)  # shallow copy; preserves all other keys
        supports_added: List[str] = []
        supports_forced: List[str] = []
        for (top, sub), value in container_support_vals.items():
            top_block = updated_supports.get(top, {})
            # Only mirror into a dict-shaped support block (or create one).
            top_block = dict(top_block) if isinstance(top_block, dict) else {}
            path_label = f"{top}.{sub}"
            if sub not in top_block:
                top_block[sub] = value
                supports_added.append(path_label)
            elif top_block[sub] != value:
                top_block[sub] = value
                supports_forced.append(path_label)
            updated_supports[top] = top_block

        entry["supports_added"] = sorted(supports_added)
        entry["supports_forced"] = sorted(supports_forced)

        if not apply:
            # Dry-run: report only, no file write
            results.append(entry)
            continue

        if not would_add and not supports_added and not supports_forced:
            # Nothing to add — already fully mirrored (attrs + supports) for this KIND scope
            entry["written"] = False
            results.append(entry)
            continue

        # Build updated attributes dict: existing attrs first (composite wins),
        # then append the missing container attrs in sorted order.
        updated_attrs = dict(block_attrs_def)  # shallow copy preserves composite defs
        for attr in sorted(would_add):
            updated_attrs[attr] = container_attrs_def[attr]

        # Build updated block.json with the new attributes + reconciled supports
        updated_bj = dict(bj)
        updated_bj["attributes"] = updated_attrs
        updated_bj["supports"] = updated_supports

        # Validate the resulting JSON before writing (fail LOUD, never partial)
        try:
            serialised = json.dumps(updated_bj, indent="\t", ensure_ascii=False)
            # Round-trip validation: parse back and verify attr count + supports survived
            parsed_back = json.loads(serialised)
            expected_attr_count = len(updated_attrs)
            actual_attr_count = len(parsed_back.get("attributes", {}))
            if expected_attr_count != actual_attr_count:
                raise ValueError(
                    f"Round-trip attr count mismatch: expected {expected_attr_count}, "
                    f"got {actual_attr_count}"
                )
            pb_supports = parsed_back.get("supports", {}) or {}
            for (top, sub), value in container_support_vals.items():
                top_block = pb_supports.get(top, {})
                if not isinstance(top_block, dict) or top_block.get(sub) != value:
                    raise ValueError(
                        f"Round-trip supports mismatch: {top}.{sub} did not survive "
                        f"as {value!r}"
                    )
        except Exception as exc:
            entry["error"] = f"JSON validation failed before write: {exc}"
            results.append(entry)
            continue

        # Write to disk
        name = slug.split("/", 1)[1]
        block_json_path = SRC_BLOCKS / name / "block.json"
        try:
            with open(block_json_path, "w", encoding="utf-8", newline="\n") as fh:
                fh.write(serialised)
                if not serialised.endswith("\n"):
                    fh.write("\n")
            entry["written"] = True
        except Exception as exc:
            entry["error"] = f"File write failed: {exc}"

        results.append(entry)

    return results


def print_mirror_report(
    mirror_results: List[Dict[str, Any]],
    apply: bool,
) -> None:
    """Print a human-readable summary of the block.json mirror operation."""
    mode_label = "APPLY" if apply else "DRY-RUN"
    print()
    print("=" * 70)
    print(f"BLOCK.JSON ATTR MIRROR — {mode_label}")
    print("=" * 70)

    total_would_add = 0
    total_supports_changed = 0
    total_written = 0
    total_skipped = 0
    total_errors = 0

    for r in mirror_results:
        slug = r["slug"]
        if r["skipped"]:
            print(f"  SKIPPED  {slug}  ({r['skip_reason']})")
            total_skipped += 1
            continue
        if r["error"]:
            print(f"  ERROR    {slug}  — {r['error']}")
            total_errors += 1
            continue

        add_count = len(r["would_add"])
        keep_count = len(r["already_present"])
        sup_added = r.get("supports_added", [])
        sup_forced = r.get("supports_forced", [])
        sup_change_count = len(sup_added) + len(sup_forced)
        total_would_add += add_count
        total_supports_changed += sup_change_count

        if apply and r["written"]:
            total_written += 1
            status = "WRITTEN"
        elif apply and not r["written"] and add_count == 0 and sup_change_count == 0:
            status = "ALREADY-MIRRORED"
        else:
            status = "WOULD-ADD"

        verb = "added" if (apply and r["written"]) else "would add"
        print(
            f"  {status:<18} {slug:<40}  KIND={r['kind']}  "
            f"{verb}={add_count}  kept={keep_count}  supports±={sup_change_count}"
        )
        if r["would_add"]:
            # Show the attrs being added (truncated for readability)
            attr_preview = ", ".join(r["would_add"][:8])
            if len(r["would_add"]) > 8:
                attr_preview += f" … (+{len(r['would_add']) - 8} more)"
            print(f"    attrs: {attr_preview}")
        if sup_added:
            print(f"    supports_added: {', '.join(sup_added)}")
        if sup_forced:
            print(f"    supports_forced (override): {', '.join(sup_forced)}")

    print()
    if apply:
        print(
            f"MIRROR SUMMARY: {total_written} block.json(s) written  "
            f"| {total_supports_changed} support path change(s)  "
            f"| {total_skipped} skipped  | {total_errors} errors"
        )
    else:
        print(
            f"MIRROR DRY-RUN: {total_would_add} total attr additions + "
            f"{total_supports_changed} support path change(s) across "
            f"{sum(1 for r in mirror_results if not r['skipped'] and not r['error'] and (r['would_add'] or r.get('supports_added') or r.get('supports_forced')))} block(s)  "
            f"| {total_skipped} skipped  | {total_errors} errors"
        )
        print("  Re-run with --write-block-json --apply to write.")
    print()


# ---------------------------------------------------------------------------
# DB migration helper (Fix 1a)
# ---------------------------------------------------------------------------

def ensure_container_kind_column(conn: sqlite3.Connection) -> None:
    """Idempotently add container_kind to block_composition if absent.

    Mirrors the migration in orchestrator/converter_v2/db_lookup.py so this
    script can be run standalone without importing that module (which has
    side-effects and path assumptions). The CHECK constraint matches exactly.
    """
    cur = conn.cursor()
    cols = {row[1] for row in cur.execute("PRAGMA table_info(block_composition)").fetchall()}
    if "container_kind" not in cols:
        try:
            cur.execute(
                "ALTER TABLE block_composition ADD COLUMN container_kind TEXT "
                "CHECK (container_kind IN ('section','layout','content'))"
            )
            conn.commit()
            print("  [migration] added container_kind column to block_composition")
        except sqlite3.OperationalError:
            pass  # column already exists (race or concurrent migration)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> int:
    ap = argparse.ArgumentParser(
        description="Detect container-bearing SGS blocks and sync block_composition."
    )
    ap.add_argument(
        "--apply", action="store_true",
        help="Write wraps_block and container_kind to DB (DB mode). "
             "When combined with --write-block-json, also writes block.json files.",
    )
    ap.add_argument(
        "--write-block-json", action="store_true",
        help="Enable the block.json attr mirror writer. "
             "Dry-run by default — reports what would change without writing. "
             "Combine with --apply to actually write block.json files. "
             "Operator-gated: /sgs-update runs this WITHOUT --apply (report only).",
    )
    ap.add_argument(
        "--target-block", default=None,
        help="Limit to one block slug (e.g. sgs/hero).",
    )
    ap.add_argument("--db", default=None, help="Override DB path.")
    args = ap.parse_args()

    dry_run = not args.apply

    db_path = Path(args.db) if args.db else find_db()
    print(f"DB: {db_path}")
    if dry_run:
        print("MODE: DRY-RUN (no DB writes — pass --apply to write)")
    else:
        print("MODE: APPLY (will write wraps_block + container_kind to DB)")
    if getattr(args, "write_block_json", False):
        write_apply = args.apply
        print(
            f"BLOCK.JSON WRITER: {'APPLY — will write block.json files' if write_apply else 'DRY-RUN — report only (pass --apply to write)'}"
        )
    print()

    # 1. Load sgs/container's attributes (block.json source)
    container_json = load_block_json("sgs/container")
    if not container_json:
        print("FATAL: could not load sgs/container block.json", file=sys.stderr)
        return 2
    container_attrs_def: Dict[str, Any] = container_json.get("attributes", {}) or {}
    container_attrs: List[str] = list(container_attrs_def.keys())
    # Exclude attrs that are only relevant at the layout layer (skip from section/content diffs)
    # The KIND_ATTR_SCOPE map handles per-KIND filtering in the diff output.
    # For the base "non-grid" list we keep everything — scoping happens in render_diff_markdown.
    container_non_grid = container_attrs  # scoping is KIND-level, not a single global filter
    # Source the truthy values for the mirrored native styling supports from the
    # container's own block.json (truth-from-container, R-22-1 spirit).
    container_support_vals = container_support_values(container_json)
    print(f"sgs/container: {len(container_attrs)} attributes loaded")
    print(f"sgs/container: {len(container_support_vals)} mirrored support path(s) loaded "
          f"({', '.join(f'{t}.{s}' for (t, s) in container_support_vals)})")

    # 2. Collect all candidate slugs from block.json source files
    conn = sqlite3.connect(str(db_path))
    cur = conn.cursor()

    if args.target_block:
        candidate_slugs = [args.target_block]
    else:
        # Derive from src/blocks directory (R-22-1: roster from source, not hardcoded)
        candidate_slugs = []
        for d in sorted(SRC_BLOCKS.iterdir()):
            if not d.is_dir():
                continue
            bjp = d / "block.json"
            if not bjp.exists():
                continue
            try:
                bj_data = json.load(open(bjp, "r", encoding="utf-8"))
                slug = bj_data.get("name", "sgs/" + d.name)
                if slug not in EXCLUDE_SLUGS:
                    candidate_slugs.append(slug)
            except Exception:
                continue

    print(f"Candidate blocks to scan: {len(candidate_slugs)}")

    # 3. Build structural-parent set (blocks whose non-form-field children declare parent=[slug])
    structural_parents = build_structural_parents(candidate_slugs)
    print(f"Structural parents detected: {sorted(structural_parents)}")
    print()

    # 4. Detect container-bearing blocks and derive KIND
    container_bearing: List[Tuple[str, str, List[str]]] = []  # (slug, kind, reasons)

    for slug in candidate_slugs:
        bj = load_block_json(slug)
        if not bj:
            continue

        attrs = bj.get("attributes", {}) or {}
        ib = has_innerblocks_slot(slug)
        layout = layout_attrs_for(attrs)
        has_layout = bool(layout)

        # Container-bearing = InnerBlocks OR layout attrs (criterion a or b)
        if not (ib or has_layout):
            continue

        kind = derive_kind(slug, bj, structural_parents)

        reasons: List[str] = []
        if ib:
            reasons.append("InnerBlocks")
        if layout:
            reasons.append(f"layout:{layout}")
        if slug in structural_parents:
            reasons.append("structural-parent")
        supports = bj.get("supports", {}) or {}
        sgs_supports = supports.get("sgs", {}) or {}
        if sgs_supports.get("containerKind"):
            reasons.append(f"containerKind-override:{sgs_supports['containerKind']}")

        container_bearing.append((slug, kind, reasons))

    # Sort by KIND then slug
    KIND_ORDER = {"section": 0, "layout": 1, "content": 2}
    container_bearing.sort(key=lambda t: (KIND_ORDER.get(t[1], 9), t[0]))

    # 5. Print dry-run roster (always printed)
    print("=" * 70)
    print("CONTAINER-BEARING BLOCK ROSTER")
    print("=" * 70)
    cur_kind = None
    for slug, kind, reasons in container_bearing:
        if kind != cur_kind:
            print(f"\n--- {kind.upper()} ---")
            cur_kind = kind
        print(f"  {slug:36}  {' | '.join(reasons)}")

    counts = Counter(k for _, k, _ in container_bearing)
    print()
    print(f"TOTAL: {len(container_bearing)}  "
          f"section={counts['section']}  layout={counts['layout']}  content={counts['content']}")
    print()

    # Ground-truth validation
    EXPECTED = {
        "section": {"sgs/cta-section", "sgs/hero", "sgs/modal", "sgs/trust-bar"},
        "layout": {
            "sgs/card-grid", "sgs/content-collection", "sgs/feature-grid", "sgs/gallery",
            "sgs/multi-button", "sgs/post-grid", "sgs/pricing-table", "sgs/trustpilot-reviews",
            "sgs/google-reviews", "sgs/form-field-tiles", "sgs/testimonial-slider",
            "sgs/tabs", "sgs/accordion", "sgs/form",
        },
        "content": {
            "sgs/info-box", "sgs/testimonial", "sgs/quote",
            "sgs/tab", "sgs/accordion-item", "sgs/form-step", "sgs/notice-banner",
            "sgs/option-picker", "sgs/mobile-nav",
            # product-faq + product-faq-item added 2026-06-10 (new since D160 — F2/D197).
            "sgs/product-faq", "sgs/product-faq-item",
            # product-card REMOVED 2026-06-10: the D204 built-in-element rebuild made it
            # a standalone block (no sgs/container InnerBlocks wrapper) — it is no longer
            # structurally container-bearing, so it is styled directly (own color+border
            # supports) rather than mirror-managed.
            # team-member REMOVED 2026-06-16 (D228): structurally identical to product-card
            # post scalar-rebuild — it uses SGS_Container_Wrapper for its OUTER shell but has
            # built-in/scalar children (no sgs/container InnerBlocks) + its own color/border/
            # typography supports, so it styles directly rather than mirror-managed. The
            # container-bearing detection correctly excludes both; the roster just wasn't
            # updated after team-member's scalar rebuild (the Stage-11 sync WARN root cause).
        },
    }
    got: Dict[str, Set[str]] = {"section": set(), "layout": set(), "content": set()}
    for slug, kind, _ in container_bearing:
        got[kind].add(slug)

    all_match = True
    for kind_name in ("section", "layout", "content"):
        expected_set = EXPECTED[kind_name]
        got_set = got[kind_name]
        missing_from_got = expected_set - got_set
        extra_in_got = got_set - expected_set
        if missing_from_got or extra_in_got:
            all_match = False
            print(f"[VALIDATION FAIL] {kind_name.upper()}:")
            if missing_from_got:
                print(f"  MISSING (expected but not detected): {sorted(missing_from_got)}")
            if extra_in_got:
                print(f"  EXTRA (detected but not expected): {sorted(extra_in_got)}")

    if all_match:
        print("[VALIDATION PASS] Roster matches ground truth (D150+D160, reconciled 2026-06-10: +product-faq/-item, -product-card; correct KINDs)")
    else:
        print()
        print("[VALIDATION FAIL] Roster does NOT match ground truth — fix detection before --apply")

    print()

    # 6. Emit per-block diff files to pipeline-state
    # NOTE: diffs are always emitted regardless of validation result so the operator
    # has per-block evidence available exactly when debugging a mismatch (Fix 4).
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    out_dir = PIPELINE_STATE / today
    out_dir.mkdir(parents=True, exist_ok=True)
    # Clean stale diffs from prior runs today
    for stale in out_dir.glob("*.md"):
        try:
            stale.unlink()
        except OSError:
            pass

    diff_files_written: List[str] = []

    # Collect per-block divergence counts for the INDEX roll-up.
    # Each entry: (slug, kind, missing_count, altered_count, wrapper_extras_count)
    rollup_rows: List[Tuple[str, str, int, int, int]] = []

    for slug, kind, reasons in container_bearing:
        bj = load_block_json(slug)
        if not bj:
            continue
        attrs = bj.get("attributes", {}) or {}
        block_attrs = list(attrs.keys())
        scoped = scoped_container_attrs(container_non_grid, kind, container_attrs_def)
        drifts = detect_naming_drifts(block_attrs, container_attrs)

        # Compute counts for the roll-up before rendering.
        missing_count = sum(1 for a in scoped if a not in attrs)
        altered = detect_altered_attrs(attrs, container_attrs_def, scoped)
        wrapper_extras, _ = detect_added_attrs(attrs, container_attrs_def)
        rollup_rows.append((slug, kind, missing_count, len(altered), len(wrapper_extras)))

        md = render_diff_markdown(
            slug, kind, reasons, block_attrs, attrs, scoped, drifts, container_attrs_def
        )
        fname = slug.replace("/", "__") + ".diff.md"
        fpath = out_dir / fname
        try:
            with open(fpath, "w", encoding="utf-8") as f:
                f.write(md)
            diff_files_written.append(str(fpath))
        except Exception as e:
            print(f"  [warn] failed to write {fpath}: {e}", file=sys.stderr)

    # Sort roll-up by total divergence descending (most-drifted first).
    rollup_rows.sort(key=lambda r: -(r[2] + r[3] + r[4]))

    # Emit index
    index_path = out_dir / "INDEX.md"
    with open(index_path, "w", encoding="utf-8") as f:
        f.write(f"# Container inheritance sync — {today}\n\n")
        f.write(f"Total container-bearing blocks: **{len(container_bearing)}**  \n")
        f.write(f"section={counts['section']} layout={counts['layout']} content={counts['content']}  \n\n")

        # --- Divergence roll-up (headline deliverable) ---
        f.write("## Divergence roll-up (sorted by total drift)\n\n")
        f.write(
            "| Block | KIND | Missing | Altered | Wrapper-extras | **Total** |\n"
            "|---|---|---|---|---|---|\n"
        )
        for slug, kind, miss, alt, wext in rollup_rows:
            total = miss + alt + wext
            f.write(f"| `{slug}` | {kind} | {miss} | {alt} | {wext} | **{total}** |\n")
        f.write("\n")
        f.write(
            "_Missing_ = KIND-scoped container attrs absent from this block.  \n"
            "_Altered_ = shared KIND-scoped attrs whose type/default/enum has drifted.  \n"
            "_Wrapper-extras_ = attrs the composite adds that match layout/section/width patterns "
            "(likely old drift to reconcile).  \n\n"
        )

        # --- Roster (existing) ---
        f.write("## Roster\n\n")
        cur_kind2 = None
        for slug, kind, reasons in container_bearing:
            if kind != cur_kind2:
                f.write(f"\n### {kind.upper()}\n\n")
                cur_kind2 = kind
            f.write(f"- `{slug}` — {', '.join(reasons)}\n")
        f.write("\n## KIND → attr scope map\n\n")
        for k, scope in KIND_ATTR_SCOPE.items():
            f.write(f"### {k}\n")
            if scope:
                for a in sorted(scope):
                    f.write(f"- `{a}`\n")
            else:
                f.write("_(all attrs — full container surface)_\n")
            f.write("\n")
    diff_files_written.append(str(index_path))
    print(f"Diff files emitted: {len(diff_files_written)} (to {out_dir})")

    # Return failure for dry-run on validation fail, AFTER diffs are written (Fix 4).
    if dry_run and not all_match:
        conn.close()
        return 1

    # 7. DB writes (only if --apply AND validation passed)
    if args.apply:
        if not all_match:
            print("[APPLY BLOCKED] Roster validation failed — fix detection first", file=sys.stderr)
            conn.close()
            return 1

        # Fix 1(a): ensure container_kind column exists before writing
        ensure_container_kind_column(conn)

        # Fix 1(b): per-block rowcount tracking — fail-loud on missing rows
        missing_rows: List[str] = []
        for slug, kind, _ in container_bearing:
            cur.execute(
                "UPDATE block_composition SET wraps_block = 'sgs/container', container_kind = ? "
                "WHERE block_slug = ?",
                (kind, slug),
            )
            if cur.rowcount == 0:
                missing_rows.append(slug)

        if missing_rows:
            print(
                f"\n[APPLY ERROR] {len(missing_rows)} roster block(s) have NO row in block_composition "
                f"and were NOT written:\n  " + "\n  ".join(missing_rows),
                file=sys.stderr,
            )
            print(
                "These roster blocks have NO row in block_composition. "
                "Run `python plugins/sgs-blocks/scripts/orchestrator/sgs-update.py` "
                "(or the canonical /sgs-update) to reconcile block_composition rows first, "
                "then re-run --apply.",
                file=sys.stderr,
            )
            conn.rollback()
            conn.close()
            return 1

        conn.commit()
        print(f"DB: wrote wraps_block + container_kind for {len(container_bearing)} rows")
    else:
        print(f"DRY-RUN: {len(container_bearing)} rows would be written (wraps_block + container_kind) — re-run with --apply to write")

    conn.close()

    # 8. Block.json attr mirror writer (WS-4, D160)
    # Runs whenever --write-block-json is passed, regardless of --apply.
    # --apply controls whether files are actually written; omitting it = report only.
    if getattr(args, "write_block_json", False):
        if not all_match:
            print(
                "\n[BLOCK.JSON WRITER BLOCKED] Roster validation failed — fix detection before mirroring attrs.",
                file=sys.stderr,
            )
            return 1
        write_apply = args.apply
        mirror_results = mirror_attrs_to_block_json(
            container_bearing,
            container_attrs_def,
            container_non_grid,
            container_support_vals,
            apply=write_apply,
        )
        print_mirror_report(mirror_results, apply=write_apply)
        # Return non-zero if any block had an error
        if any(r["error"] for r in mirror_results):
            return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
