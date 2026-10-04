"""Extension attributes from the roster (`src/blocks/extensions/extension-roster.json`),
scanned once per extension (finding identity `ext/<file>::<attr>::<link>`): the
front end is the `includes/` hook emitters, the canvas is the extension's
`editor.BlockListBlock` filter, and the control may live in any extension file.
"""
from __future__ import annotations

from wf_css import CssIndex, data_consumed
from wf_editor import EditorModel
from wf_frontend import FrontEnd
from wf_inputs import Inputs
from wf_paint import is_motion, is_state


def scan_extensions(inp: Inputs, fe: FrontEnd, css: CssIndex, js: str, editor: EditorModel) -> list[dict]:
    out = []
    files = editor.files
    all_ext = list(inp.facts.get("extensions", []))
    for ext in inp.roster:
        fam = "src/blocks/extensions/" + ext.get("file", "")
        fam_dir = fam.rsplit("/", 1)[0] + "/"
        fam_files = [f for f in all_ext if f == fam or (fam_dir != "src/blocks/extensions/" and f.startswith(fam_dir))]
        blb = any(files.get(f, {}).get("blockListBlock") for f in fam_files)
        for attr, spec in sorted((ext.get("attributes") or {}).items()):
            ch = fe.flow_texts(fe.hook_texts, attr, lambda t, a=attr: list(t.literals.get(a, ())))
            paint = (bool(spec.get("css_property")) or any(css.cp_read(c) for c in ch.cps)
                     or any(css.has_class(c) for c in ch.classes if "--" in c) or data_consumed(ch.data, css, js))
            if not paint:
                continue
            ident = "ext/" + ext.get("file", "")
            ctl = any(attr in files.get(f, {}).get("setKeys", []) or (files.get(f, {}).get("callsSet") and attr in files.get(f, {}).get("literals", []))
                      for f in all_ext)
            canvas = blb and any(attr in files.get(f, {}).get("canvasReads", {}) for f in fam_files)
            if not ctl:
                out.append({"block": ident, "attr": attr, "link": "L2"})
            if not canvas:
                state = is_state(attr, None) or is_motion(attr, spec.get("css_property"))
                out.append({"block": ident, "attr": attr, "link": "L3-state" if state else "L3"})
            if not ch.read:
                out.append({"block": ident, "attr": attr, "link": "L4"})
            elif not ch.kinds():
                out.append({"block": ident, "attr": attr, "link": "L5"})
    return out
