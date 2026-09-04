"""section_passes.py — the two universal section passes, ported from the frozen
engine (EXECUTION Step 14, Phase 5, 2026-07-04).

FAITHFUL byte-copy of ``convert.py::ensure_root_section_class``
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

from converter.block_serialization import serialize_block_attributes
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


# _ABSORB_GAP_PROPS / _ABSORB_POSITIONING_PROPS / _is_absorbable_wrapper /
# _absorb_transparent_wrappers were DELETED 2026-08-01 (Bean-directed). Measured
# over 46 real invocations: fired ZERO times, and rejected the four real homepage
# content bands solely for declaring `margin` — the `max-width` + `margin:0 auto`
# pattern that IS the Spec 31 §2.3 L2 band it existed to fold. `_ABSORB_GAP_PROPS`
# was a DISQUALIFIER list despite its name, and contradicted the L2 rule on exactly
# padding/margin/gap. The L2 question now lives in `converter/services/l2_qualify.py`,
# triggered by the direct PARENT being a recognised container-kind block.
# This module retains `ensure_root_section_class` (the universal className POST-pass)
# and SKIP_TOP_LEVEL_TAGS.


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
            # SECURITY: re-serialise through the WP-core-faithful escaper. json.loads
            # above DECODES the -- escapes back to literal "--", so a plain
            # json.dumps here would silently strip the emitters' escaping off the
            # FIRST block line of every section and reopen the comment-breakout hole.
            new_attrs_str = serialize_block_attributes(attrs_dict)
            new_first_line = f"{tag_part} {new_attrs_str} {closing}"
        except (ValueError, AttributeError):
            return block_markup
    else:
        new_attrs_str = serialize_block_attributes({"className": section_class})
        new_first_line = f"{tag_part} {new_attrs_str} {closing}"
    lines[first_block_line_idx] = new_first_line
    return "\n".join(lines)
