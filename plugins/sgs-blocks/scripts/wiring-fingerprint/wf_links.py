"""The wiring links one painting attribute must show (a finding is
`<block>::<attr>::<link>`):

  L2 control · L3 editor canvas · L3-tier the canvas reads one device tier only ·
  L3-state hover/focus/active/scrolled/motion with no canvas mirror (advisory,
  never blocks, never a pass) · L4 front-end read · L5 channel · L6 consumer (the
  attribute has no live paint channel left: every custom property it sets has no
  reader and every modifier class no rule or script) · L6-token a dead class or
  custom property on an attribute that still paints through another channel
  (advisory) · L7 editor/front-end custom-property parity (exempt when the editor
  reads the attribute straight into a real property; dynamic names match by
  prefix) · C1 child-conditional reader · B3 missing `__inner` depth · S1
  editor.css shadowing · B2 root prefix orphaned. B1 is per block (wf_scan).

Tokens a block the value is forwarded to emits (`fwd_tokens`) are that block's
own markup: they show the value paints, and never count for this block's L6,
L7, C1 or S1.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

from wf_bugs import child_conditional, editor_shadowing, inner_depth_bug
from wf_css import CssIndex, data_consumed
from wf_editor import BlockEditor, tier_only
from wf_paint import is_motion, is_state
from wf_tokens import FX_RUNTIME_RE, Channel

ADVISORY = frozenset({"L3-state", "L3-runtime", "L6-token"})

# One line per link for the failure output (wf_cli).
LINK_MEANING = {
    "L2": "no editor control: nothing in the inspector writes this attribute",
    "L3": "the editor canvas does not show it: no canvas read outside the controls, no server-side render",
    "L3-tier": "the editor canvas shows only one device tier of it",
    "L3-state": "a hover/focus/active/scrolled/motion setting with no editor-canvas preview (advisory)",
    "L3-runtime": "painted only by a front-end script the editor never runs, so a static canvas has nothing to show (advisory)",
    "L4": "the front end never reads it",
    "L5": "the front end reads it but it reaches no CSS: no declaration, custom property, class or data attribute",
    "L6": "it has no live paint channel left: its custom property has no reader, its modifier class no rule or script",
    "L6-token": "one class or custom property it emits is dead, but it still paints through another channel (advisory)",
    "L7": "the front end paints it through a custom property the editor canvas never sets",
    "C1": "its CSS reaches a grid cell only when the cell is one specific block (Spec 32 FR-32-12)",
    "S1": "an editor.css rule overrides its zero-specificity :where() front-end reader, so the canvas never shows it",
    "B1": "the scoping uid hashes $attributes but not $block->context, while a context value is written into the scoped CSS",
    "B2": "the root ('') typography family is declared but has no control or no front-end emission",
    "B3": "a `> .sgs-<block>` selector has no `__inner > .sgs-<block>` twin, so it misses cells inside the inner band",
}


@dataclass
class LinkEnv:
    """What every block's links read: the consumer indexes and the block-root pattern."""

    css: CssIndex
    js: str
    root_class_re: re.Pattern


def canvas_mode(be: BlockEditor, attr: str, ctx_canvas: bool, layout: bool = False) -> str | None:
    """How the editor canvas shows the attribute. A layout attribute whose every
    canvas read only feeds a comparison (the canvas derives a flag from it, never
    the value: wishlist-panel `columns`) is not shown."""
    if be.ssr == "full":
        return "ssr"
    if be.ssr == "partial" and attr in be.ssr_credit:
        return "ssr-branch"
    if attr in be.canvas and not (layout and be.canvas[attr].get("flag")):
        return "direct"
    if ctx_canvas:
        return "context"
    return None


def live_channels(ch: Channel, env: LinkEnv) -> list[str]:
    """The channels through which the value still paints: a declaration, a custom
    property with a reader, a modifier class with a rule or script, a data attribute
    a stylesheet selects, or a visual-effect runtime's data attribute."""
    out = []
    if ch.decl or ch.gate_decl:
        out.append("declaration")
    if any(env.css.cp_read(cp) for cp in ch.cps):
        out.append("custom property")
    if any("--" in c and (env.css.has_class(c) or c.rstrip("*") in env.js) for c in ch.classes):
        out.append("modifier class")
    if any(d in env.css.data_attrs for d in ch.data):
        out.append("data-attribute selector")
    if data_consumed({d for d in ch.fx_data if FX_RUNTIME_RE.search(d)}, env.css, env.js):
        out.append("effect runtime")   # a data attribute named for the runtime that reads it
    return out


def runtime_only(category: str, ch: Channel) -> bool:
    """Painted only through a front-end script (a data attribute or DB pseudo-property its view script reads, or an
    effect runtime's toggle): no declaration, custom property or modifier class a stylesheet applies."""
    return category == "js" and not (ch.decl or ch.gate_decl or ch.cps or any("--" in c for c in ch.classes))


def _editor_links(attr: str, state: bool, canvas: str | None, be: BlockEditor, missing: list, details: dict,
                  runtime: bool = False) -> None:
    if attr not in be.control:
        missing.append("L2")
        details["L2"] = "no inspector control writes it (no setAttributes key, control literal or extension control)"
    if canvas is None:
        link = "L3-state" if state else "L3-runtime" if runtime else "L3"
        missing.append(link)
        details[link] = "no editor-canvas read outside the inspector controls and no server-side render of it"
    elif canvas == "direct" and tier_only(be.canvas[attr]):
        missing.append("L3-tier")
        details["L3-tier"] = "the canvas reads only " + ", ".join(sorted(be.canvas[attr]["tiers"])) + " of the device tiers"


def _unconsumed(ch: Channel, env: LinkEnv) -> list[str]:
    """Custom properties with no reader and modifier classes with no rule or script."""
    unconsumed = sorted(cp for cp in ch.cps if not env.css.cp_read(cp))
    unconsumed += sorted(c for c in ch.classes if "--" in c and not env.css.has_class(c) and c.rstrip("*") not in env.js)
    unconsumed = [u for u in unconsumed if u not in ch.fwd_tokens]   # the forwarded block's own consumers
    own = (set(ch.cps) | {c for c in ch.classes if "--" in c}) - ch.ctx_tokens
    if own - set(unconsumed):
        # The value already paints through its own block; a token only a block-context
        # consumer emits (`sgs-accordion-item--{style}` beside `sgs-accordion--{style}`) is
        # that consumer's own markup, not this attribute's missing consumer.
        unconsumed = [u for u in unconsumed if u not in ch.ctx_tokens]
    return unconsumed


def _consumer_links(attr: str, state: bool, canvas: str | None, ch: Channel, be: BlockEditor, env: LinkEnv,
                    allowed: frozenset, missing: list, details: dict) -> list[str]:
    own_cps = set(ch.cps) - ch.fwd_tokens
    unconsumed = _unconsumed(ch, env)
    if unconsumed:
        live = live_channels(ch, env)
        link = "L6-token" if live else "L6"
        missing.append(link)
        dead = ", ".join(unconsumed)
        details[link] = (f"{dead} has no consumer; it still paints through: {', '.join(live)}" if live
                         else f"no live paint channel: {dead} has no reader, rule or script")
    if canvas == "direct" and own_cps and attr not in be.real_prop and not state:
        ecps = set(be.editor_cps)
        if not any(cp in ecps or (cp.endswith("-") and any(e.startswith(cp) for e in ecps)) for cp in own_cps):
            missing.append("L7")
            details["L7"] = f"the front end sets {', '.join(sorted(own_cps))}; the editor canvas sets none of them"
    if child_conditional(own_cps, env.css, env.root_class_re, ch.child_sel, allowed):
        missing.append("C1")
        details["C1"] = ("every reader of " + ", ".join(sorted(own_cps | {f'> .sgs-{c}' for c in ch.child_sel}))
                         + " reaches a grid cell only when the cell is one specific block")
    b3 = inner_depth_bug(ch.child_sel, ch.inner_sel, env.css)
    if b3:
        missing.append("B3")
        details["B3"] = ", ".join(f"`> .sgs-{s}` has no `__inner > .sgs-{s}` twin" for s in b3)
    s1 = editor_shadowing(own_cps, env.css)
    if s1:
        missing.append("S1")
        details["S1"] = "editor.css sets " + ", ".join(s1) + " over the zero-specificity :where() front-end reader"
    return unconsumed


def assess(row: dict, category: str, ch: Channel, dump_row: dict, be: BlockEditor, ctx_canvas: bool,
           b2: set[str], env: LinkEnv, allowed: frozenset = frozenset()) -> dict:
    """The missing links of one painting attribute, with the facts behind them."""
    attr = row["attr_name"]
    missing: list[str] = []
    details: dict[str, str] = {}
    state = is_state(attr, row.get("css_state")) or is_motion(attr, row.get("css_property"))
    canvas = canvas_mode(be, attr, ctx_canvas, row.get("role") == "layout")
    _editor_links(attr, state, canvas, be, missing, details, runtime_only(category, ch))
    kinds = ch.kinds()
    if category == "js" and ch.read and not kinds:
        kinds = ["DATA"]
    unconsumed: list[str] = []
    if not (dump_row.get("renderConsumed") or ch.read):
        missing.append("L4")
        details["L4"] = "the front-end render never reads it"
    elif not kinds:
        missing.append("L5")
        details["L5"] = "read on the front end but reaches no declaration, custom property, class or data attribute"
    else:
        unconsumed = _consumer_links(attr, state, canvas, ch, be, env, allowed, missing, details)
    if attr in b2:
        missing.append("B2")
        details["B2"] = "the root ('') typography family is declared but has no control or no front-end emission"
    blocking = [m for m in missing if m not in ADVISORY]
    status = "full" if not missing else ("partial" if blocking else "advisory")
    return {"missing": missing, "details": details, "canvas": canvas, "channel": kinds, "unconsumed": unconsumed, "class": status}
