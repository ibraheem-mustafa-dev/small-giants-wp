"""The scan: every SGS block attribute (DB `source='sgs'`) through the paint
classifier and, when it paints, through the wiring links (wf_links), plus the
per-block bug classes (B1 scope hash, B2 root prefix) and the extension roster
(wf_extensions). Output is sorted and deterministic.
"""
from __future__ import annotations

import re
from collections import Counter

from wf_bugs import root_prefix_bug, scope_hash_bug
from wf_channel import ChannelAnalyser
from wf_css import build_css_index, data_consumed, frontend_js
from wf_editor import EditorModel
from wf_extensions import scan_extensions
from wf_frontend import FrontEnd, prefix_helpers
from wf_inputs import Inputs
from wf_links import LinkEnv, assess
from wf_paint import PaintClassifier
from wf_paths import Roots
from wf_php import PhpIndex


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


def scan(roots: Roots, inp: Inputs) -> dict:
    index = PhpIndex(sorted(roots.includes.glob("**/*.php")) + sorted(roots.blocks.glob("**/*.php")))
    slugs = {d.name for d in roots.blocks.iterdir() if (d / "block.json").exists()} if roots.blocks.exists() else set()
    analyser = ChannelAnalyser(index, slugs)
    css = build_css_index(roots.plugin, roots.theme, list(index.files.values()))
    fe = FrontEnd(index, analyser, prefix_helpers(index, roots.plugin / "scripts" / "check-dead-controls.js"), roots.includes)
    js = frontend_js(roots.plugin)
    env = LinkEnv(css=css, js=js, root_class_re=re.compile(
        r"\.sgs-(" + "|".join(sorted(map(re.escape, slugs), key=len, reverse=True) or ["\x00"]) + r")(?![\w-])"))
    editor = EditorModel(inp.facts, roots.plugin)   # first use of the Node collectors' output
    paint = PaintClassifier(inp.suffixes)
    ext_files = list(inp.facts.get("extensions", []))
    # An extension attribute may be controlled by any extension file
    # (conditional-visibility.js writes responsive-visibility.js's toggles).
    ext_attrs = {a for ext in inp.roster for a in (ext.get("attributes") or {})}

    records: list[dict] = []
    findings: list[dict] = []
    by_block: dict[str, list[dict]] = {}
    for r in inp.rows:
        by_block.setdefault(r["block_slug"], []).append(r)

    for block in sorted(by_block):
        if block not in inp.blockjson:
            continue
        bdir, bjson = inp.blockjson[block]
        texts, derived = fe.block_texts(bdir)
        declared = set((bjson.get("attributes") or {}).keys())
        be = editor.block(bdir.name, bjson, ext_files if declared & ext_attrs else [])
        ctx_of = {a: k for k, a in (bjson.get("providesContext") or {}).items()}
        anim_map = manifest_motion_attrs(bjson)
        named_typo = {re.sub(r"FontSize$", "", a) for a in derived if a.endswith("FontSize") and a != "fontSize"}
        root_emitted = any(a in derived for a in ("fontSize", "lineHeight", "fontWeight"))
        b2 = set(root_prefix_bug(declared, be.control, root_emitted, named_typo))
        scoped_ctx = scope_hash_bug([t for t in texts if t.path.startswith(bdir.as_posix() + "/")], analyser)
        if scoped_ctx:
            findings.append({"block": block, "attr": "(scope-hash)", "link": "B1",
                             "detail": "uid hash omits $block->context; context in scoped CSS: " + ", ".join(scoped_ctx)})
        for r in by_block[block]:
            attr = r["attr_name"]
            key = ctx_of.get(attr)
            consumers = [(fe.block_texts(inp.blockjson[cb][0])[0], key)
                         for cb in sorted(inp.uses_context.get(key, ())) if key and cb in inp.blockjson]
            ch, where = fe.channel(attr, texts, derived, consumers, block, bdir.as_posix() + "/")
            d = inp.dump.get((block, attr), {})
            if attr in anim_map and not ch.kinds():
                ch.read = True
                ch.data.add("attrMap:" + anim_map[attr])
                where = where or "manifest"
            if d.get("renderVia") == "media-element-atom" and not ch.kinds():
                ch.read = True
                ch.decl = True
                ch.helpers.add("sgs_media_element_style")
                where = where or "media-atom"
            signals = {
                "class_rule": any(css.has_class(c) for c in ch.classes if "--" in c),
                "cp_reader": any(css.cp_read(cp) for cp in ch.cps),
                "decl_channel": ch.decl or ch.gate_decl,
                "data_consumed": data_consumed(ch.fx_data, css, js),
            }
            cat, basis = paint.classify(r, signals)
            rec = {"block": block, "attr": attr, "role": r.get("role"), "css_property": r.get("css_property"),
                   "category": cat, "basis": basis, "classes": sorted(ch.classes)[:8], "data": sorted(ch.data)[:6]}
            if cat == "not":
                rec["class"] = "not-paint"
                records.append(rec)
                continue
            ctx_canvas = bool(key) and any(editor.child_reads_context(inp.blockjson[cb][0].name, key)
                                           for cb in inp.uses_context.get(key, ()) if cb in inp.blockjson)
            res = assess(r, cat, ch, d, be, ctx_canvas, b2, env)
            rec.update({"control": be.control.get(attr), "canvas": res["canvas"], "frontend": where or d.get("renderVia"),
                        "channel": res["channel"], "cps": sorted(ch.cps), "helpers": sorted(ch.helpers)[:8],
                        "missing": res["missing"], "class": res["class"]})
            if res["unconsumed"]:
                rec["unconsumed"] = res["unconsumed"]
            records.append(rec)
            findings += [{"block": block, "attr": attr, "link": m} for m in res["missing"]]
    findings += scan_extensions(inp, fe, css, js, editor)
    findings.sort(key=lambda f: (f["block"], f["attr"], f["link"]))
    return {"records": records, "findings": findings, "summary": summarise(records, findings)}


def summarise(records: list[dict], findings: list[dict]) -> dict:
    cats = Counter(r["category"] for r in records)
    reasons = Counter(r["basis"] for r in records if r["category"] == "not")
    basis = Counter(r["basis"] for r in records if r["category"] != "not")
    return {
        "attributes": len(records),
        "population": {"css": cats.get("css", 0), "js": cats.get("js", 0), "not-paint": cats.get("not", 0)},
        "not_paint_reasons": dict(sorted(reasons.items(), key=lambda kv: (-kv[1], kv[0]))),
        "paint_basis": dict(sorted(basis.items(), key=lambda kv: (-kv[1], kv[0]))),
        "classes": dict(sorted(Counter(r["class"] for r in records).items())),
        "links": dict(sorted(Counter(f["link"] for f in findings).items(), key=lambda kv: (-kv[1], kv[0]))),
    }
