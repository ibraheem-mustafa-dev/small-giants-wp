"""content_select — bs4 selection + DOM-shape helpers for content extraction (Stage 3).

Design ref: `.claude/plans/2026-06-26-stage3-child-shape-fork-design.md` §1/§2.

Pure DOM helpers — no DB, no I/O, no block-name or slot literals.
All functions accept a bs4.Tag (typed as Any to avoid a hard bs4 import at module level).
"""
from __future__ import annotations

import re
from typing import Any

# ---------------------------------------------------------------------------
# BEM regex — mirrors _BEM_ELEMENT_RE in recognise_helpers (same pattern,
# kept local so this module has no import dependency on recognise_helpers).
# A BEM element class: sgs-<block>__<element>[--<modifier>]
# A BEM root class:    sgs-<block>  (no __, no --)
# ---------------------------------------------------------------------------
_BEM_ELEMENT_RE = re.compile(r"^sgs-[a-z0-9-]+__[a-z0-9-]+(?:--[a-z0-9-]+)*$")
_BEM_ROOT_RE = re.compile(r"^sgs-[a-z0-9-]+$")


def _classes(node: Any) -> list[str]:
    """Return the node's CSS class list (mirrors recognise_helpers._classes)."""
    cls = node.get("class", []) if hasattr(node, "get") else []
    return list(cls or [])


def _has_bem_element_class(node: Any) -> bool:
    """True iff the node itself carries at least one BEM element class."""
    return any(_BEM_ELEMENT_RE.match(c) for c in _classes(node))


def _has_bem_root_class(node: Any) -> bool:
    """True iff the node itself carries at least one BEM root class."""
    return any(_BEM_ROOT_RE.match(c) for c in _classes(node))


# ---------------------------------------------------------------------------
# Public helpers
# ---------------------------------------------------------------------------


def select_one(section_root: Any, selector: str) -> Any | None:
    """Thin wrapper over bs4 select_one.

    Supports comma-list selectors (bs4 handles them natively).
    Returns None if section_root is None, selector is None/empty, or no match.
    On a selector parse/CSS error, emits a stderr trace (no raise — callers
    treat None as a ContentGap, which is the correct graceful-degradation path).
    """
    if not section_root or not selector:
        return None
    try:
        return section_root.select_one(selector)
    except Exception as exc:  # noqa: BLE001
        import sys
        print(
            f"[content_select] select_one parse error — selector={selector!r}: {exc}",
            file=sys.stderr,
        )
        return None


def has_bem_element_descendant(node: Any) -> bool:
    """True iff node has at least one DESCENDANT (not itself) with a BEM element class.

    Used as the wrapper-shell guard: a node selected as a content slot but whose
    subtree contains BEM element children is a routing wrapper, not a content leaf.
    """
    if not node:
        return False
    # find_all searches descendants only when called on a tag; we exclude the node
    # itself by iterating its children's sub-trees.
    for child in node.children:
        if not hasattr(child, "find_all"):
            # NavigableString — not a tag
            continue
        # Check the direct child itself
        if _has_bem_element_class(child):
            return True
        # Check all deeper descendants of this child
        for desc in child.find_all(True):
            if _has_bem_element_class(desc):
                return True
    return False


def is_bem_root(node: Any) -> bool:
    """True iff node carries a BEM root class (sgs-<block>, no __, no --).

    Marks a nested recognised composite — a boundary that content_children must
    not cross (it is handled by its own recognition + extraction pass).
    """
    return bool(node) and _has_bem_root_class(node)


def content_children(section_root: Any):
    """Generator yielding CONTENT-LEAF nodes under section_root (Mechanism B).

    Rules (design §2):
    - content leaf   = carries a BEM element class AND NOT has_bem_element_descendant
                       → YIELD.
    - wrapper-shell  = carries a BEM element class AND has_bem_element_descendant
                       → do NOT yield; RECURSE into its children.
    - nested composite = is_bem_root (but is not section_root itself)
                       → STOP; do not yield or descend.
    - non-BEM node with real text (no sgs class, leaf-ish, has text)
                       → YIELD (caller emits ContentGap; never a silent drop).

    Each node is yielded at most once (depth-first, no double-yield).
    """
    if not section_root:
        return
    yield from _walk_children(section_root, is_root=True)


def _walk_children(node: Any, *, is_root: bool = False):
    """Internal depth-first walk used by content_children."""
    for child in node.children:
        if not hasattr(child, "get"):
            # NavigableString — carry text up only if non-empty and parent is
            # being yielded; individual text nodes are not yielded here (they
            # are part of their parent tag's content).
            continue

        # --- nested composite guard (stop; do not yield or descend) ----------
        # We never treat section_root itself as a composite boundary.
        if not is_root and is_bem_root(child):
            continue

        # --- BEM element class on this child? ---------------------------------
        if _has_bem_element_class(child):
            if has_bem_element_descendant(child):
                # wrapper-shell: recurse, do not yield
                yield from _walk_children(child)
            else:
                # content leaf: yield it
                yield child
        else:
            # no BEM element class on this child
            text = child.get_text(strip=True) if hasattr(child, "get_text") else ""
            if text:
                # non-BEM node with real text — yield so caller can emit ContentGap
                yield child
            else:
                # empty non-BEM node — recurse in case BEM-element children live inside
                yield from _walk_children(child)
