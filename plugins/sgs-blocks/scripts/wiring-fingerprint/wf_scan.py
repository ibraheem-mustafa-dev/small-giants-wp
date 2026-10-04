"""The scan: every SGS block attribute (DB `source='sgs'`) through the paint
classifier and, when it paints, through the wiring links (wf_links), plus the
per-block bug classes (B1 scope hash, B2 root prefix) and the extension roster
(wf_extensions). Output is sorted and deterministic.
"""
from __future__ import annotations

import re
from collections import Counter

from wf_bugs import root_prefix_bug
from wf_css import build_css_index, frontend_js, js_cp_reads
from wf_editor import EditorModel
from wf_extensions import scan_extensions
from wf_inputs import Inputs
from wf_links import LinkEnv, assess
from wf_paint import SWITCH_ROLES, PaintClassifier
from wf_pass import BlockJob, FrontPass, PassRun
from wf_paths import Roots
from wf_resolve import Resolver


def jobs_for(roots: Roots, inp: Inputs, by_block: dict[str, list[dict]]) -> list[BlockJob]:
    jobs = []
    for block in sorted(by_block):
        if block not in inp.blockjson:
            continue
        bdir, bjson = inp.blockjson[block]
        ctx_of = {a: k for k, a in (bjson.get("providesContext") or {}).items()}
        consumers = []
        for r in by_block[block]:
            key = ctx_of.get(r["attr_name"])
            if key:
                dirs = tuple(inp.blockjson[cb][0] for cb in sorted(inp.uses_context.get(key, ())) if cb in inp.blockjson)
                consumers.append((r["attr_name"], key, dirs))
        attrs = tuple((r["attr_name"], (r.get("role") or "") in SWITCH_ROLES) for r in by_block[block])
        jobs.append(BlockJob(block=block, bdir=bdir, attrs=attrs, consumers=tuple(consumers)))
    return jobs


def scan(roots: Roots, inp: Inputs) -> dict:
    by_block: dict[str, list[dict]] = {}
    for r in inp.rows:
        by_block.setdefault(r["block_slug"], []).append(r)
    run = PassRun(roots, jobs_for(roots, inp, by_block))   # workers start now
    local = FrontPass(roots)
    index, fe = local.index, local.fe
    slugs = local.slugs
    css = build_css_index(roots.plugin, roots.theme, list(index.files.values()))
    js = frontend_js(roots.plugin)
    css.js_cp_readers = js_cp_reads(js)
    env = LinkEnv(css=css, js=js, root_class_re=re.compile(
        r"\.sgs-(" + "|".join(sorted(map(re.escape, slugs), key=len, reverse=True) or ["\x00"]) + r")(?![\w-])"))
    editor = EditorModel(inp.facts, roots.plugin)   # first use of the Node collectors' output
    paint = PaintClassifier(inp.suffixes)
    ext_files = list(inp.facts.get("extensions", []))
    # An extension attribute may be controlled by any extension file
    # (conditional-visibility.js writes responsive-visibility.js's toggles).
    ext_attrs = {a for ext in inp.roster for a in (ext.get("attributes") or {})}
    passed = run.result(local)
    resolver = Resolver(passed, {(r["block_slug"], r["attr_name"]): r for r in inp.rows}, inp.blockjson, inp.dump, css, js, paint)

    records: list[dict] = []
    findings: list[dict] = []
    for block in sorted(by_block):
        if block not in inp.blockjson:
            continue
        bdir, bjson = inp.blockjson[block]
        res = passed[block]
        derived = res.derived
        declared = set((bjson.get("attributes") or {}).keys())
        be = editor.block(bdir.name, bjson, ext_files if declared & ext_attrs else [])
        ctx_of = {a: k for k, a in (bjson.get("providesContext") or {}).items()}
        named_typo = {re.sub(r"FontSize$", "", a) for a in derived if a.endswith("FontSize") and a != "fontSize"}
        root_emitted = any(a in derived for a in ("fontSize", "lineHeight", "fontWeight"))
        b2 = set(root_prefix_bug(declared, be.control, root_emitted, named_typo))
        if res.scoped_ctx:
            findings.append({"block": block, "attr": "(scope-hash)", "link": "B1",
                             "detail": "uid hash omits $block->context; context in scoped CSS: " + ", ".join(res.scoped_ctx)})
        for r in by_block[block]:
            attr = r["attr_name"]
            key = ctx_of.get(attr)
            rv = resolver.get(block, attr)
            ch, where, cat, basis = rv.ch, rv.where, rv.category, rv.basis
            d = inp.dump.get((block, attr), {})
            rec = {"block": block, "attr": attr, "role": r.get("role"), "css_property": r.get("css_property"),
                   "category": cat, "basis": basis, "classes": sorted(ch.classes)[:8], "data": sorted(ch.data)[:6],
                   "props": sorted(ch.decl_props)[:10]}
            if ch.forwards:
                rec["forwards"] = sorted(f"{b}::{a}" for b, a in ch.forwards)
            if cat == "not":
                rec["class"] = "not-paint"
                records.append(rec)
                continue
            ctx_canvas = bool(key) and bool(set(inp.context_reads.get(key, {}).get("editor", ()))
                                            & set(inp.uses_context.get(key, ())))
            res_l = assess(r, cat, ch, d, be, ctx_canvas, b2, env, frozenset(bjson.get("allowedBlocks") or ()))
            rec.update({"control": be.control.get(attr), "canvas": res_l["canvas"], "frontend": where or d.get("renderVia"),
                        "channel": res_l["channel"], "cps": sorted(ch.cps), "helpers": sorted(ch.helpers)[:8],
                        "missing": res_l["missing"], "class": res_l["class"]})
            if res_l["unconsumed"]:
                rec["unconsumed"] = res_l["unconsumed"]
            records.append(rec)
            findings += [{"block": block, "attr": attr, "link": m, "detail": res_l["details"].get(m, "")} for m in res_l["missing"]]
    ext_findings, ext_records = scan_extensions(inp, fe, css, js, editor, paint)
    findings += ext_findings
    records += ext_records
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
