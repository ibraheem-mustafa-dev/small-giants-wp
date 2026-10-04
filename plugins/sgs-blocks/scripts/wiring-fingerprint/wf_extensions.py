"""Extension attributes from the roster (`src/blocks/extensions/extension-roster.json`,
the source `includes/extension-attributes.generated.php` is generated from),
scanned once per extension (identity `ext/<file>::<attr>::<link>`). They enter the
paint population like block attributes: the roster's role and `css_property`
decide paint first, then the channel signals. The front end is the `includes/`
hook emitters, the canvas is the extension's `editor.BlockListBlock` filter, and
the control may live in any extension file.
"""
from __future__ import annotations

from wf_css import CssIndex, data_consumed
from wf_editor import EditorModel
from wf_frontend import FrontEnd
from wf_inputs import Inputs
from wf_links import ADVISORY
from wf_paint import PaintClassifier, is_motion, is_state


def scan_extensions(inp: Inputs, fe: FrontEnd, css: CssIndex, js: str, editor: EditorModel,
                    paint: PaintClassifier) -> tuple[list[dict], list[dict]]:
    """(findings, records) for every roster attribute."""
    out: list[dict] = []
    records: list[dict] = []
    files = editor.files
    all_ext = list(inp.facts.get("extensions", []))
    for ext in inp.roster:
        fam = "src/blocks/extensions/" + ext.get("file", "")
        fam_dir = fam.rsplit("/", 1)[0] + "/"
        fam_files = [f for f in all_ext if f == fam or (fam_dir != "src/blocks/extensions/" and f.startswith(fam_dir))]
        blb = any(files.get(f, {}).get("blockListBlock") for f in fam_files)
        ident = "ext/" + ext.get("file", "")
        for attr, spec in sorted((ext.get("attributes") or {}).items()):
            ch = fe.flow_texts(fe.hook_texts, attr, lambda t, a=attr: list(t.literals.get(a, ())))
            row = {"attr_name": attr, "role": spec.get("role"), "css_property": spec.get("css_property")}
            signals = {
                "class_rule": any(css.has_class(c) for c in ch.classes if "--" in c),
                "cp_reader": any(css.cp_read(c) for c in ch.cps),
                "decl_channel": ch.decl or ch.gate_decl,
                # State utility modifiers the framework styles (`sgs-on-dark`, `sgs-has-hover-overlay`).
                "utility_class_rule": any(css.has_class(c) for c in ch.classes if c.startswith(("sgs-on-", "sgs-has-"))),
                "data_consumed": data_consumed(ch.data, css, js),
                "fx_data_consumed": data_consumed(ch.fx_data, css, js),
            }
            cat, basis = paint.classify(row, signals)
            rec = {"block": ident, "attr": attr, "role": spec.get("role"), "css_property": spec.get("css_property"),
                   "category": cat, "basis": basis, "classes": sorted(ch.classes)[:8], "data": sorted(ch.data)[:6]}
            if cat == "not":
                rec["class"] = "not-paint"
                records.append(rec)
                continue
            ctl = any(attr in files.get(f, {}).get("setKeys", []) or (files.get(f, {}).get("callsSet") and attr in files.get(f, {}).get("literals", []))
                      for f in all_ext)
            canvas = blb and any(attr in files.get(f, {}).get("canvasReads", {}) for f in fam_files)
            missing, details = [], {}
            if not ctl:
                missing.append("L2")
                details["L2"] = "no extension file writes it with setAttributes"
            if not canvas:
                state = is_state(attr, spec.get("css_state")) or is_motion(attr, spec.get("css_property"))
                link = "L3-state" if state else "L3"
                missing.append(link)
                details[link] = "the extension's editor.BlockListBlock filter never reads it"
            if not ch.read:
                missing.append("L4")
                details["L4"] = "no includes/ hook emitter reads it"
            elif not ch.kinds():
                missing.append("L5")
                details["L5"] = "a hook emitter reads it but reaches no declaration, custom property, class or data attribute"
            blocking = [m for m in missing if m not in ADVISORY]
            rec.update({"control": "extension" if ctl else None, "canvas": "blockListBlock" if canvas else None,
                        "channel": ch.kinds(), "cps": sorted(ch.cps), "missing": missing,
                        "class": "full" if not missing else ("advisory" if not blocking else "partial")})
            records.append(rec)
            out += [{"block": ident, "attr": attr, "link": m, "detail": details[m]} for m in missing]
    return out, records
