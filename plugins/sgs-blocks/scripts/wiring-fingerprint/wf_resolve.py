"""Each attribute's final channel and paint category, as the scan uses them.

The front-end pass (wf_pass) gives the channel the block's own PHP shows. Three
things complete it here, where every block's result is at hand:

- an element-manifest motion entry (`supports.sgs.elements[].attrMap` anim/fx,
  read by an `includes/` hook emitter such as animation-stagger.php) or a
  media-element atom (the check-dead-controls dump's `renderVia`) supplies a
  channel the block's own PHP does not show;
- a value forwarded into a nested block (`render_block( array( 'blockName' =>
  'sgs/option-picker', 'attrs' => array( 'showSelectedTick' => $v ) ) )`) paints
  through the attribute it lands in, but only when that attribute paints in the
  nested block (a value forwarded into `optionItems`, a content attribute, is
  content). The nested block's tokens are its own markup: kept apart as
  `fwd_tokens` / `ctx_tokens`, and its cell selectors are dropped.
"""
from __future__ import annotations

from dataclasses import dataclass

from wf_css import CssIndex, data_consumed
from wf_paint import PaintClassifier
from wf_pass import BlockResult
from wf_tokens import Channel


def manifest_motion_attrs(bjson: dict) -> dict[str, str]:
    """attr -> pseudo-property for `supports.sgs.elements[].attrMap` motion/fx entries
    (the element manifest's hook emitters, e.g. includes/animation-stagger.php, read them)."""
    els = ((bjson.get("supports") or {}).get("sgs") or {}).get("elements") or []
    if isinstance(els, dict):
        els = list(els.values())
    out = {}
    for el in els:
        if isinstance(el, dict):
            for k, v in (el.get("attrMap") or {}).items():
                if isinstance(v, str) and k.startswith(("anim:", "fx:")) and not v.startswith("native:"):
                    out[v] = k
    return out


@dataclass
class Resolved:
    ch: Channel
    where: str
    category: str
    basis: str


def copy_channel(ch: Channel) -> Channel:
    out = Channel()
    out.merge(ch)
    return out


class Resolver:
    def __init__(self, passed: dict[str, BlockResult], rows: dict[tuple[str, str], dict], blockjson: dict,
                 dump: dict, css: CssIndex, js: str, paint: PaintClassifier) -> None:
        self.passed = passed
        self.rows = rows
        self.blockjson = blockjson
        self.dump = dump
        self.css = css
        self.js = js
        self.paint = paint
        self._done: dict[tuple[str, str], Resolved] = {}
        self._anim: dict[str, dict[str, str]] = {}

    def signals(self, ch: Channel, toggle: bool) -> dict:
        css, js = self.css, self.js
        return {
            "class_rule": any(css.has_class(c) for c in ch.classes if "--" in c),
            "cp_reader": any(css.cp_read(cp) for cp in ch.cps),
            "decl_channel": ch.decl or ch.gate_decl,
            # State utility modifiers the framework styles (`sgs-on-dark`, `sgs-has-hover-overlay`).
            "utility_class_rule": any(css.has_class(c) for c in ch.classes if c.startswith(("sgs-on-", "sgs-has-"))),
            "toggle_paint": toggle,
            "data_consumed": data_consumed(ch.fx_data, css, js),
            "fx_data_consumed": data_consumed(ch.fx_data, css, js),
        }

    def get(self, block: str, attr: str, stack: tuple = ()) -> Resolved:
        key = (block, attr)
        if key in self._done:
            return self._done[key]
        base, where, toggle = self.passed[block].channels[attr]
        ch = copy_channel(base)
        if block not in self._anim:
            self._anim[block] = manifest_motion_attrs(self.blockjson[block][1])
        anim = self._anim[block]
        d = self.dump.get(key, {})
        if attr in anim and not ch.kinds():
            ch.read = True
            ch.data.add("attrMap:" + anim[attr])
            where = where or "manifest"
        if d.get("renderVia") == "media-element-atom" and not ch.kinds():
            ch.read = True
            ch.decl = True
            ch.helpers.add("sgs_media_element_style")
            where = where or "media-atom"
        for fb, fa in sorted(ch.forwards):
            if (fb, fa) in stack or (fb, fa) == key or fb not in self.passed or fa not in self.passed[fb].channels:
                continue
            sub = self.get(fb, fa, stack + (key,))
            if sub.category == "not" or not sub.ch.kinds():
                continue
            part = copy_channel(sub.ch)
            part.forwards = set()
            part.child_sel, part.inner_sel = set(), set()   # the nested block's own cell selectors
            tokens = (part.classes | part.cps) - (ch.classes | ch.cps)
            ch.merge(part)
            ch.fwd_tokens |= tokens
            ch.ctx_tokens |= tokens
            where = where or "forwarded"
        category, basis = self.paint.classify(self.rows[key], self.signals(ch, toggle))
        res = Resolved(ch=ch, where=where, category=category, basis=basis)
        if not stack:
            self._done[key] = res
        return res
