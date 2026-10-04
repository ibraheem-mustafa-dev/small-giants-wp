"""Editor model: links L2 (control) and L3 (editor canvas) from the collected
editor facts (`editor_facts.js`).

Control (L2) credits, in order: a literal `setAttributes` key (including
`const next = {…}; setAttributes(next)`), an attribute-shaped quoted literal in
any reached editor file that calls `setAttributes`, a literal prefix
(JSX `prefix=`, a `targets` entry, a prefix-contract helper call such as
`typoTarget('', …)`) joined to a suffix some reached file builds from a prefix
(including `*BASES` vocabularies such as the media atoms), the shadow-key family
of a `shadowAttrKeys`/`shadowAttrName` call, an extension's block-edit control,
and a `block.json` variation. Every credit must name a declared attribute.

Canvas (L3) credits a read outside control containers and control descriptors in
edit.js or a block-own file, a preview helper or component the canvas calls with
the attributes (barrel re-exports resolved, literal prefixes joined to the
helper's suffixes), a child block reading the context key in its editor, and
ServerSideRender: all attributes when unconditional or when the other branch is a
placeholder, otherwise only the guard's attributes and the controls behind it.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

from wf_php import lower_first, read

PREFIX_FN_RE = re.compile(r"typo|target|attr|prefix|preview|style|keys|name|media|element", re.I)
TIERS = ("desktop", "tablet", "mobile")


@dataclass
class BlockEditor:
    control: dict = field(default_factory=dict)       # attr -> reason
    canvas: dict = field(default_factory=dict)        # attr -> {'whole': bool, 'tiers': set, 'via': str}
    ssr: str = "none"                                 # none | full | partial
    ssr_credit: set = field(default_factory=set)
    editor_cps: dict = field(default_factory=dict)    # cp -> attrs referenced
    real_prop: set = field(default_factory=set)


class EditorModel:
    def __init__(self, facts: dict, plugin_dir) -> None:
        self.facts = facts
        self.files = facts.get("files", {})
        self.exports = facts.get("exports", {})
        self.plugin = plugin_dir

    def _f(self, rel: str) -> dict:
        return self.files.get(rel, {})

    def _declaring(self, name: str, among: list[str]) -> list[str]:
        out = [f for f in among if name in self.exports.get(f, ())]
        if not out:
            out = [f for f in among if f.rsplit("/", 1)[-1] == name + ".js"]
        return out

    def block(self, slug: str, bjson: dict, ext_files: list[str]) -> BlockEditor:
        be = BlockEditor()
        entry = self.facts.get("blocks", {}).get(slug)
        declared = set((bjson.get("attributes") or {}).keys())
        own_prefix = f"src/blocks/{slug}/"
        files = entry["files"] if entry else []
        own = [f for f in files if f.startswith(own_prefix)]

        # ---- L2 control
        def credit(name: str, why: str) -> None:
            if name in declared and name not in be.control:
                be.control[name] = why

        suffixes: set[str] = set()
        for rel in files:
            suffixes |= set(self._f(rel).get("prefixSuffixes", []))
        for rel in files:
            fx = self._f(rel)
            for k in fx.get("setKeys", []):
                credit(k, "setAttributes")
            for sb in fx.get("shadowBases", []):
                b = sb["base"]
                for n in (b, b + "Colour", b + "Hover", b + "ColourHover"):
                    credit(n, "shadow-keys")
        for rel in files:
            fx = self._f(rel)
            # Any reached editor file that writes attributes (no file-name test): its
            # quoted attribute names are control keys (descriptor tables written through
            # `setAttributes( { [ attr ]: v } )`, shared rows such as `scrimColourRow`).
            if fx.get("callsSet"):
                for lit in fx.get("literals", []):
                    credit(lit, "editor-file-literal")
        prefixes: set[str] = set()
        for rel in files:
            fx = self._f(rel)
            prefixes |= {p["prefix"] for p in fx.get("prefixJsx", [])}
            prefixes |= {c["prefix"] for c in fx.get("canvasJsx", []) if c.get("prefix") is not None}
            prefixes |= {c["prefix"] for c in fx.get("prefixCalls", []) if PREFIX_FN_RE.search(c.get("fn") or "") and c["idx"] <= 1}
        for p in sorted(prefixes):
            for s in suffixes:
                credit(p + s if p else lower_first(s), "prefix:" + (p or "''"))
        for rel in ext_files:
            fx = self._f(rel)
            for k in fx.get("setKeys", []) + (fx.get("literals", []) if fx.get("callsSet") else []):
                credit(k, "extension:" + rel.rsplit("/", 1)[-1])
        for var in bjson.get("variations", []) or []:
            for k in (var.get("attributes") or {}):
                credit(k, "variation")

        # ---- L3 canvas
        def add_reads(rel: str, via: str) -> None:
            for attr, r in self._f(rel).get("canvasReads", {}).items():
                cur = be.canvas.setdefault(attr, {"whole": False, "tiers": set(), "via": via, "flag": True})
                cur["whole"] = cur["whole"] or r["whole"]
                cur["tiers"] |= set(r["tiers"])
                cur["flag"] = cur["flag"] and r.get("flag", False)
            for cp, attrs in self._f(rel).get("cpCanvas", {}).items():
                be.editor_cps.setdefault(cp, set()).update(attrs)
            be.real_prop |= set(self._f(rel).get("realPropAttrs", []))

        def add_name(name: str, via: str) -> None:
            if name in declared:
                cur = be.canvas.setdefault(name, {"whole": True, "tiers": set(), "via": via, "flag": False})
                cur["whole"] = True
                cur["flag"] = False

        canvas_files = ([entry["edit"]] if entry else []) + own
        seen: set[str] = set()
        queue = [(f, 0) for f in canvas_files]
        while queue:
            rel, depth = queue.pop()
            if rel in seen:
                continue
            seen.add(rel)
            add_reads(rel, "direct" if rel in canvas_files else "helper")
            if depth >= 3:
                continue
            fx = self._f(rel)
            for call in fx.get("canvasCalls", []):
                for hf in self._declaring(call["fn"], files):
                    queue.append((hf, depth + 1))
                    for p in call.get("prefixes", []):
                        for s in self._f(hf).get("prefixSuffixes", []):
                            add_name(p + s if p else lower_first(s), "helper-prefix")
            for jsx in fx.get("canvasJsx", []):
                for hf in self._declaring(jsx["tag"], files):
                    queue.append((hf, depth + 1))
                    if jsx.get("prefix") is not None:
                        for s in self._f(hf).get("prefixSuffixes", []):
                            p = jsx["prefix"]
                            add_name(p + s if p else lower_first(s), "component-prefix")

        ssr_list = [s for rel in canvas_files for s in self._f(rel).get("ssr", [])]
        if any(not s["conditional"] or s["altReads"] == 0 for s in ssr_list):
            be.ssr = "full"
        elif ssr_list:
            be.ssr = "partial"
            for s in ssr_list:
                for g in s["guard"]:
                    if g in declared:
                        be.ssr_credit.add(g)
                    for rel in canvas_files:
                        be.ssr_credit |= set(self._f(rel).get("guarded", {}).get(g, [])) & declared
        return be

    def child_reads_context(self, slug: str, key: str) -> bool:
        entry = self.facts.get("blocks", {}).get(slug)
        if not entry:
            return False
        pat = re.compile(r"""context\s*(?:\?\.)?\[\s*['"]""" + re.escape(key) + r"""['"]\s*\]""")
        own = [f for f in entry["files"] if f.startswith(f"src/blocks/{slug}/")]
        return any(pat.search(read(self.plugin / f)) for f in own)


def tier_only(read_info: dict) -> bool:
    """A canvas read of a tier object that only ever touches one device tier."""
    return (not read_info["whole"]) and 0 < len(read_info["tiers"]) < len(TIERS)
