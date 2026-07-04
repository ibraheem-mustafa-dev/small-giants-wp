"""section_passes.py — the two universal section passes, ported from the frozen
engine (EXECUTION Step 14, Phase 5, 2026-07-04).

FAITHFUL byte-copies of ``convert.py::_absorb_transparent_wrappers`` (:2944, the
transparent-wrapper absorb PRE-pass) + ``convert.py::ensure_root_section_class``
(:5181, the universal className guarantee POST-pass) and their private helpers —
assembled programmatically from the frozen source so the port cannot drift
(only the import bindings below differ):

  - ``db``     → ``converter.db.db_lookup`` (the Step-9 permanent home; the
                 frozen tree bound the same module via its package alias)
  - ``_trace`` → an injectable no-op (the fold_helpers idiom); ``entry.py``
                 passes the live trace when one is bound.

Both passes run unconditionally for every section (verified D273:
``converter_v2/__init__.py:407``/``:454``); after this port the new engine no
longer borrows them from the frozen tree (two fewer STOP-28 fallback imports).
"""
from __future__ import annotations

import json
import re

from bs4 import Tag

from converter.db import db_lookup as db

# THE one permitted constant (R-31-1: 3 bounded HTML chrome tags — same value as
# the frozen convert.py definition; new-engine copies live here + entry.py).
SKIP_TOP_LEVEL_TAGS = frozenset({"header", "footer", "nav"})


def _noop_trace(stage: str, **kwargs) -> None:  # noqa: ARG001
    """Default no-op trace (injectable — entry.py binds the live trace)."""


_trace = _noop_trace


def set_trace_fn(fn) -> None:
    """Bind the live trace callable (or None → no-op). Mirrors convert.set_trace."""
    global _trace
    _trace = fn if callable(fn) else _noop_trace


_ABSORB_GAP_PROPS = frozenset({
    "padding", "padding-top", "padding-right", "padding-bottom", "padding-left",
    "margin", "margin-top", "margin-right", "margin-bottom", "margin-left",
    "gap", "row-gap", "column-gap",
})
_ABSORB_POSITIONING_PROPS = frozenset({
    "position", "top", "right", "bottom", "left",
    "z-index", "transform", "overflow",
})


def _is_absorbable_wrapper(child: "Tag", css_rules: dict) -> tuple[bool, str]:
    """Decide whether a direct child is an absorbable transparent wrapper."""
    if not isinstance(child, Tag):
        return False, "not a Tag"
    if child.name in SKIP_TOP_LEVEL_TAGS:
        return False, f"<{child.name}> in SKIP_TOP_LEVEL_TAGS"
    if not any(isinstance(c, Tag) for c in child.children):
        return False, "leaf (no Tag children)"
    classes = child.get("class", []) or []
    bem_classes = [c for c in classes if c.startswith("sgs-") and "__" in c]
    if not bem_classes:
        return False, "no sgs-X__Y BEM class"
    root_classes = [c for c in classes if c.startswith("sgs-") and "__" not in c and "--" not in c]
    for c in root_classes:
        slug = f"sgs/{c[4:]}"
        if db.block_exists(slug):
            return False, f".{c} is a registered block ({slug})"
    for bc in bem_classes:
        target_sel = f".{bc}"
        for css_sel, decls in css_rules.items():
            if target_sel not in css_sel:
                continue
            for prop in decls:
                p = prop.lower()
                if p in _ABSORB_GAP_PROPS:
                    return False, f"child has spacing rule ({css_sel} {{ {prop}: ... }})"
                if p in _ABSORB_POSITIONING_PROPS:
                    return False, f"child has positioning rule ({css_sel} {{ {prop}: ... }})"
    return True, ""


def _absorb_transparent_wrappers(section_root: "Tag", css_rules: dict) -> list[str]:
    """Pre-pass: absorb one transparent wrapper child into the section root.

    Mutates section_root in place. Returns list of class names absorbed.
    """
    if not isinstance(section_root, Tag):
        return []
    section_classes = list(section_root.get("class", []) or [])
    root_block_classes = [c for c in section_classes
                          if c.startswith("sgs-") and "__" not in c and "--" not in c]
    for c in root_block_classes:
        slug = f"sgs/{c[4:]}"
        if db.block_exists(slug):
            _trace("absorb_skipped_section", node_tag=section_root.name,
                   node_classes=section_classes,
                   reason=f"section root .{c} is registered block ({slug}) — FR1 path")
            return []
    direct_children = [c for c in list(section_root.children) if isinstance(c, Tag)]
    if len(direct_children) != 1:
        _trace("absorb_skipped_section", node_tag=section_root.name,
               node_classes=section_classes,
               reason=f"{len(direct_children)} direct element children (need exactly 1)")
        return []
    child = direct_children[0]
    ok, reason = _is_absorbable_wrapper(child, css_rules)
    if not ok:
        _trace("absorb_skipped_child", node_tag=child.name,
               node_classes=child.get("class", []) or [],
               reason=reason)
        return []
    child_classes = list(child.get("class", []) or [])
    added: list[str] = []
    for cc in child_classes:
        if cc not in section_classes:
            section_classes.append(cc)
            added.append(cc)
    section_root["class"] = section_classes
    _trace("absorb_applied", node_tag=child.name, node_classes=child_classes,
           classes_added=added, section_classes_after=section_classes)
    child.unwrap()
    return added


def _extract_first_block_comment(line: str) -> tuple[str, str | None, str] | None:
    """Parse a WP block comment line into (tag_part, attrs_json, closing)."""
    slug_m = re.match(r"(<!-- wp:[\w/\-]+)", line)
    if not slug_m:
        return None
    tag_part = slug_m.group(1)
    rest = line[slug_m.end():]
    if rest.rstrip().endswith("/-->"):
        closing = "/-->"
    elif rest.rstrip().endswith("-->"):
        closing = "-->"
    else:
        return None
    close_idx = rest.rfind(closing)
    attrs_region = rest[:close_idx].strip()
    if not attrs_region or not attrs_region.startswith("{"):
        return (tag_part, None, closing)
    depth = 0
    end = -1
    in_str = False
    escape = False
    for i, ch in enumerate(attrs_region):
        if escape:
            escape = False
            continue
        if ch == "\\" and in_str:
            escape = True
            continue
        if ch == '"' and not escape:
            in_str = not in_str
            continue
        if in_str:
            continue
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                end = i
                break
    if end == -1:
        return (tag_part, None, closing)
    return (tag_part, attrs_region[: end + 1], closing)


def ensure_root_section_class(block_markup: str, section_id: str) -> str:
    """Guarantee that the first WP block in block_markup carries sgs-{section_id}
    in its className attribute.

    Universal — fires for every Stage-3 section regardless of which converter
    branch produced the markup. Never overwrites existing classNames; only
    prepends the missing section class when absent. Idempotent.
    """
    if not block_markup or not section_id:
        return block_markup
    section_class = f"sgs-{section_id}"
    lines = block_markup.split("\n")
    first_block_line_idx: int | None = None
    for idx, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith("<!-- wp:") and not stripped.startswith("<!-- /wp:"):
            first_block_line_idx = idx
            break
    if first_block_line_idx is None:
        return block_markup
    first_line = lines[first_block_line_idx]
    parsed = _extract_first_block_comment(first_line)
    if parsed is None:
        return block_markup
    tag_part, attrs_json_str, closing = parsed
    if attrs_json_str:
        try:
            attrs_dict = json.loads(attrs_json_str)
            existing_class = attrs_dict.get("className", "")
            if section_class in existing_class.split():
                return block_markup
            attrs_dict["className"] = (section_class + " " + existing_class).strip()
            new_attrs_str = json.dumps(attrs_dict, separators=(",", ":"), ensure_ascii=False)
            new_first_line = f"{tag_part} {new_attrs_str} {closing}"
        except (ValueError, AttributeError):
            return block_markup
    else:
        new_attrs_str = json.dumps({"className": section_class}, separators=(",", ":"), ensure_ascii=False)
        new_first_line = f"{tag_part} {new_attrs_str} {closing}"
    lines[first_block_line_idx] = new_first_line
    return "\n".join(lines)
