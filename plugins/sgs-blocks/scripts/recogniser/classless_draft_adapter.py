"""Draft-side input adapter for Spec 44's Stage A / Stage B — the missing half.

Stage A (`render_repeater_recogniser`) compares a DRAFT group's structural-role
sequence against `block_render_repeaters`; Stage B (`array_schema_eliminator`)
compares a DRAFT item's field set against `array_item_schema`. Task 1 built the
BLOCK side of both (roles derived from real PHP). Nothing built the DRAFT side —
Task 2's and Task 3's fixtures were hand-derived from the real draft file, which is
correct for a test and unusable from the orchestrator.

This module is that derivation, and it is deliberately its own module rather than a
section of the trust gate: reading a draft's markup and deciding a trust policy are
different jobs with different failure modes, and folding them together is what makes
an audit trail hard to read. It holds no policy and writes nothing.

THE ROLE VOCABULARY IS IMPORTED, NEVER REDEFINED. `render_repeater_seeder.ROLE_*` is
the single source; a second spelling here would silently never match a seeded row.

WHY `render_repeater_seeder.derive_roles` IS NOT REUSED DIRECTLY. Two of its four
signals are PHP-specific and cannot fire on a draft: `_IMAGE_RE` matches `<img>` /
`sgs_render_media` / `wp_get_attachment_image`, while a Claude Design draft paints a
thumbnail with `background-image:url({{ t.img }})`; and `_ALTERNATIVE_RE` matches
`else` / `elseif` / `endif`, where a draft branches with a second `<sc-if>`. The other
two (a `data-*`/`onClick` click target; a templated `aria-current`-family value) fire
on both because the seeder already reads `{{ }}` as a templated value. Reusing the
function wholesale would therefore derive a SHORTER draft sequence than the real item
has — a partial match reported as a shorter exact one, the precise failure §3.1
exists to prevent. The signals are re-expressed here for the draft's own syntax,
against the same vocabulary.

DISCLOSED LIMITS (a reader must know what a clean result means):
  - **Stage B values are NOT read.** A draft's field VALUES live in its JS builder
    (`thumbs = views.map(...)`), not in its markup. Every `DraftField` this module
    builds carries `value=None`, so `classify_value_shape` reads them all as plain
    text. Stage B driven from this adapter therefore discriminates on ARITY and the
    action signal alone — it cannot use §5.2's value-shape priorities at all, and
    will usually return ambiguous. That is a real ceiling, not a tuning problem:
    closing it needs a draft-JS parser, which is Spec 45's territory and whose
    import chain mutates the live DB (see `array_schema_eliminator`'s docstring).
  - **`required_capabilities` is empty.** Observing "this parent provides
    add-to-cart" from draft markup is a second mechanism nobody has built (Task 2
    report, concern 1). Step 0's capability signal is exclusion-only, so supplying
    nothing narrows nothing and is safe; it means more boundaries reach review, not
    fewer. Named rather than faked.
  - A role is deduplicated by `(role, bound draft key)`, so one field rendered twice
    in the same item (the real `thumbs` item renders `{{ t.label }}` as both an
    `aria-label` and a text fallback) contributes ONE marker, matching how the
    seeder counts the block side.

UK English throughout.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path
from typing import Any

_HERE = Path(__file__).resolve().parent
_SCRIPTS_DIR = _HERE.parent
for _p in (str(_HERE), str(_SCRIPTS_DIR)):
    if _p not in sys.path:
        sys.path.insert(0, _p)

from converter.services import repeated_sibling_detector as _rsd  # noqa: E402

import array_schema_eliminator as _stage_b  # noqa: E402
import render_repeater_recogniser as _stage_a  # noqa: E402
import render_repeater_seeder as _seeder  # noqa: E402

ROLE_ACTION = _seeder.ROLE_ACTION
ROLE_IMAGE = _seeder.ROLE_IMAGE
ROLE_CURRENT = _seeder.ROLE_CURRENT
ROLE_LABEL = _seeder.ROLE_LABEL

# `{{ t.pick }}` / `{{ cur.name }}` / `{{ thumbs }}` — the draft's only binding syntax.
_BINDING_RE = re.compile(r"\{\{\s*([A-Za-z_$][\w$]*(?:\.[\w$]+)*)\s*\}\}")
_STATE_ATTRS = _seeder._STATE_ATTRS
_CLICK_ATTR_RE = re.compile(r"^(?:on[a-z]+|data-[a-z][\w-]*)$", re.IGNORECASE)
_CLICK_TAGS = frozenset({"button", "a"})
# A draft paints an item image either as a real <img> or as a bound background-image.
_BG_IMAGE_RE = re.compile(r"background-image\s*:\s*url\(", re.IGNORECASE)


def _binding_keys(text: str) -> list[str]:
    return [m.group(1) for m in _BINDING_RE.finditer(text or "")]


def _leaf_key(binding: str) -> str:
    """`t.label` -> `label`. The draft's loop alias carries no identity of its own."""
    return binding.rsplit(".", 1)[-1]


def _attrs(el: Any) -> dict:
    return dict(getattr(el, "attrs", {}) or {})


def _attr_text(value: Any) -> str:
    return " ".join(value) if isinstance(value, list) else str(value or "")


# ---------------------------------------------------------------- repeated item

def _sc_for_items(element: Any) -> list[Any]:
    """Representative item(s) under any `<sc-for>` at or inside `element`.

    The draft states its own repetition explicitly; when it does, that statement
    beats a similarity score derived from the rendered placeholder count.
    """
    if getattr(element, "name", "") == "sc-for":
        holders = [element]
    else:
        holders = list(element.find_all("sc-for")) if hasattr(element, "find_all") else []
    out = []
    for holder in holders:
        children = [c for c in holder.find_all(True, recursive=False)
                    if getattr(c, "name", "") != "sc-for"]
        if children:
            out.append(children[0])
    return out


def representative_item(element: Any) -> Any | None:
    """ONE member of `element`'s repeated group, or None when there is no group.

    `sc-for` first (the draft's own declaration), then
    `repeated_sibling_detector.detect_repeater_groups` — reused as is, including its
    own disclosed, UNMEASURED thresholds. Both paths take the FIRST member in
    document order, matching `RepeaterGroup.representative`'s determinism rule.
    """
    declared = _sc_for_items(element)
    if declared:
        return declared[0]
    children = _rsd._get_children(element)
    groups = _rsd.detect_repeater_groups(children)
    return groups[0].representative if groups else None


# ---------------------------------------------------------------- Stage A input

def derive_draft_roles(item: Any) -> tuple[tuple[str, str], ...]:
    """§3.1's structural markers on ONE draft item, as `(role, bound key)` pairs.

    Document order, deduplicated per `(role, key)`. Returned with the key attached
    rather than bare so a caller can show WHICH draft field produced each marker in
    the review queue — a bare role sequence is unauditable by an operator.
    """
    found: list[tuple[int, str, str]] = []
    if not hasattr(item, "find_all"):
        return ()
    nodes = [item, *item.find_all(True)]
    for order, node in enumerate(nodes):
        name = (getattr(node, "name", "") or "").lower()
        attrs = _attrs(node)

        if name in _CLICK_TAGS:
            for attr, value in attrs.items():
                if _CLICK_ATTR_RE.match(attr) and attr.lower() not in _STATE_ATTRS:
                    keys = _binding_keys(_attr_text(value))
                    found.append((order, ROLE_ACTION, _leaf_key(keys[0]) if keys else attr))
                    break

        for state in _STATE_ATTRS:
            if state in attrs:
                keys = _binding_keys(_attr_text(attrs[state]))
                # A hardcoded state is chrome; only a BOUND one varies per item.
                if keys:
                    found.append((order, ROLE_CURRENT, _leaf_key(keys[0])))

        for label_attr in ("aria-label", "title"):
            if label_attr in attrs:
                keys = _binding_keys(_attr_text(attrs[label_attr]))
                found.append((order, ROLE_LABEL, _leaf_key(keys[0]) if keys else label_attr))

        if name == "sc-if":
            keys = _binding_keys(_attr_text(attrs.get("value", "")))
            branch = str(node)
            has_image = bool(_BG_IMAGE_RE.search(branch)) or node.find("img") is not None
            # image-or-fallback needs BOTH halves — an image branch and a sibling
            # alternative. An unconditional image is not a per-item conditional.
            if has_image and keys and _has_alternative_branch(node):
                found.append((order, ROLE_IMAGE, _leaf_key(keys[0])))

    seen: set[tuple[str, str]] = set()
    out: list[tuple[str, str]] = []
    for _order, role, key in found:
        if (role, key) in seen:
            continue
        seen.add((role, key))
        out.append((role, key))
    return tuple(out)


def _has_alternative_branch(sc_if: Any) -> bool:
    """A sibling `<sc-if>` of this one — the draft's `else`."""
    parent = getattr(sc_if, "parent", None)
    if parent is None:
        return False
    siblings = [c for c in parent.find_all(True, recursive=False)
                if getattr(c, "name", "") == "sc-if"]
    return len(siblings) > 1


def build_stage_a_group(
    element: Any,
    item: Any,
    parent_siblings: list[Any] | None = None,
    label: str = "",
) -> _stage_a.DraftGroup:
    """`DraftGroup` for §4.4, with §4.3 Step 0's two signals as far as they are real.

    Signal (i) comes from `repeated_sibling_detector` via Stage A's own
    `parent_repetition_context`. Signal (ii) is left EMPTY — see this module's
    disclosed limits; it is exclusion-only, so an empty set narrows nothing.
    """
    roles = tuple(role for role, _key in derive_draft_roles(item))
    repetition = _stage_a.parent_repetition_context(element, parent_siblings or [])
    return _stage_a.DraftGroup(
        roles=roles,
        parent=_stage_a.ParentContext(repetition=repetition),
        label=label,
    )


# ---------------------------------------------------------------- Stage B input

def build_stage_b_group(item: Any, label: str = "") -> _stage_b.DraftItemGroup:
    """`DraftItemGroup` for §5, from ONE draft item's bindings.

    Every field carries `value=None` — the draft's values live in its JS builder,
    not its markup (disclosed limit above). `onclick_bound` IS derivable from
    markup and is set, so §5.2 priority 1 (Thread 1 Finding 2c) still works.
    """
    fields: dict[str, _stage_b.DraftField] = {}
    if not hasattr(item, "find_all"):
        return _stage_b.DraftItemGroup(fields=(), label=label)

    for node in (item, *item.find_all(True)):
        name = (getattr(node, "name", "") or "").lower()
        if name == "sc-if":
            continue  # a display-branch flag, not a content field (Finding 1d)
        attrs = _attrs(node)
        for attr, value in attrs.items():
            for binding in _binding_keys(_attr_text(value)):
                key = _leaf_key(binding)
                bound = bool(_CLICK_ATTR_RE.match(attr)) and attr.lower().startswith("on")
                prior = fields.get(key)
                fields[key] = _stage_b.DraftField(
                    key=key,
                    value=None,
                    tag=(prior.tag if prior and prior.tag else name),
                    onclick_bound=bound or bool(prior and prior.onclick_bound),
                )
        for binding in _binding_keys(_own_text(node)):
            key = _leaf_key(binding)
            if key not in fields:
                fields[key] = _stage_b.DraftField(key=key, value=None, tag=name)

    return _stage_b.DraftItemGroup(fields=tuple(fields.values()), label=label)


def _own_text(node: Any) -> str:
    """Text belonging to THIS node, not to its descendants — otherwise every
    ancestor re-claims every binding below it and the tag signal is meaningless."""
    return "".join(c for c in getattr(node, "children", []) if isinstance(c, str))
