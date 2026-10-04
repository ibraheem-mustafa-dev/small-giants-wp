"""The wiring links one painting attribute must show (a finding is
`<block>::<attr>::<link>`):

  L2 control · L3 editor canvas · L3-tier the canvas reads one device tier only ·
  L3-state hover/focus/active/scrolled/motion with no canvas mirror (advisory,
  never blocks, never a pass) · L4 front-end read · L5 channel · L6 consumer (a
  custom property no stylesheet reads, a modifier class no rule or script uses) ·
  L7 editor/front-end custom-property parity (exempt when the editor reads the
  attribute straight into a real property; dynamic names match by prefix) ·
  C1 child-conditional reader · B3 missing `__inner` depth · S1 editor.css
  shadowing · B2 root prefix orphaned. B1 is per block (wf_scan).
"""
from __future__ import annotations

import re
from dataclasses import dataclass

from wf_bugs import child_conditional, editor_shadowing, inner_depth_bug
from wf_css import CssIndex
from wf_editor import BlockEditor, tier_only
from wf_paint import is_motion, is_state
from wf_tokens import Channel

ADVISORY = frozenset({"L3-state"})


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


def assess(row: dict, category: str, ch: Channel, dump_row: dict, be: BlockEditor, ctx_canvas: bool,
           b2: set[str], env: LinkEnv, allowed: frozenset = frozenset()) -> dict:
    """The missing links of one painting attribute, with the facts behind them."""
    attr = row["attr_name"]
    missing: list[str] = []
    state = is_state(attr, row.get("css_state")) or is_motion(attr, row.get("css_property"))
    canvas = canvas_mode(be, attr, ctx_canvas, row.get("role") == "layout")
    if attr not in be.control:
        missing.append("L2")
    if canvas is None:
        missing.append("L3-state" if state else "L3")
    elif canvas == "direct" and tier_only(be.canvas[attr]):
        missing.append("L3-tier")
    kinds = ch.kinds()
    if category == "js" and ch.read and not kinds:
        kinds = ["DATA"]
    unconsumed: list[str] = []
    if not (dump_row.get("renderConsumed") or ch.read):
        missing.append("L4")
    elif not kinds:
        missing.append("L5")
    else:
        unconsumed = sorted(cp for cp in ch.cps if not env.css.cp_read(cp))
        unconsumed += sorted(c for c in ch.classes if "--" in c and not env.css.has_class(c) and c.rstrip("*") not in env.js)
        own = (set(ch.cps) | {c for c in ch.classes if "--" in c}) - ch.ctx_tokens
        if own - set(unconsumed):
            # The value already paints through its own block; a token only a block-context
            # consumer emits (`sgs-accordion-item--{style}` beside `sgs-accordion--{style}`) is
            # that consumer's own markup, not this attribute's missing consumer.
            unconsumed = [u for u in unconsumed if u not in ch.ctx_tokens]
        if unconsumed:
            missing.append("L6")
        if canvas == "direct" and ch.cps and attr not in be.real_prop and not state:
            ecps = set(be.editor_cps)
            if not any(cp in ecps or (cp.endswith("-") and any(e.startswith(cp) for e in ecps)) for cp in ch.cps):
                missing.append("L7")
        if child_conditional(ch.cps, env.css, env.root_class_re, ch.child_sel, allowed):
            missing.append("C1")
        if inner_depth_bug(ch.child_sel, ch.inner_sel, env.css):
            missing.append("B3")
        if editor_shadowing(ch.cps, env.css):
            missing.append("S1")
    if attr in b2:
        missing.append("B2")
    blocking = [m for m in missing if m not in ADVISORY]
    return {
        "missing": missing,
        "canvas": canvas,
        "channel": kinds,
        "unconsumed": unconsumed,
        "class": "full" if not missing else ("advisory" if not blocking else "partial"),
    }
