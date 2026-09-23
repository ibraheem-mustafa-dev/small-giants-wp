"""used_layout.py — FR-33-19: the site's content width and wide width, read from the draft's RENDERED layout.

WordPress (theme.json v3 ``settings.layout.contentSize`` / ``wideSize``) and the SGS container apply
these as the ``max-width`` of the content band: ``SGS_Container_Wrapper`` resolves
``contentWidth: "normal"`` to ``var(--wp--style--global--content-size)`` and ``"wide"`` to
``var(--wp--style--global--wide-size)``, on ``.sgs-container__inner`` with ``margin-inline:auto`` and
``box-sizing:border-box``, while the section's side padding sits on the OUTER element. So the value
written here is the draft's CONTENT box (inside padding and border), never the padded box it was
declared on: a draft ``<section style="max-width:1440px;padding:0 52px">`` has a 1336px content box.

The census (``layout-census.js`` via measure.js, ``facts["layoutCensus"]``) reports, per top-level
band and per viewport, the chain of pixel-capped elements above each piece of text. The rule, per
band, at the widest census viewport:

  * a text's cap is the NEAREST element on its chain that (a) does not paint text itself (a ``ch``
    measure on a heading is a reading measure, not a layout width), (b) is BINDING (its box is exactly
    its max-width, so the cap, not the viewport or an ancestor, sets the width) and (c) has a content
    box of at least ``FLOOR_PX`` (a card is a component, not a page width);
  * a band is CONSTRAINED only when every one of its texts has such a cap; its width is the widest of
    them. A band with any uncapped text is full-width and does not vote. Chrome bands (header, footer,
    nav) are recorded as evidence but do not vote: they belong to Spec 37.

contentSize = the most common band width (a tie goes to the narrower). wideSize = the most common
width WIDER than contentSize used by at least ``MIN_WIDE_BANDS`` bands; with no such width it is not
derived and the existing value stays, raised to contentSize if it is narrower (wide is never narrower
than content). No constrained band at all → nothing is written and the trace says so; a value is
never invented.
"""
from __future__ import annotations

import argparse
import json
import pathlib
import re
import sys
from collections import Counter

# The narrowest contentSize among WordPress core default themes is 620px (Twenty Twenty-Four; Twenty
# Twenty-Two and -Three 650px, Twenty Twenty-Five 645px). A capped box narrower than this is a card,
# a form or a text column, not the width a site lays its sections out to.
FLOOR_PX = 600.0
BIND_TOLERANCE_PX = 1.0
MIN_WIDE_BANDS = 2

_PX_RE = re.compile(r"^\s*(\d+(?:\.\d+)?)px\s*$")


def _px(value) -> float | None:
    m = _PX_RE.match(value) if isinstance(value, str) else None
    return float(m.group(1)) if m else None


def _fmt(width: float) -> str:
    return f"{width:g}px"


def is_binding(cap: dict) -> bool:
    """True when the element's rendered box equals its max-width (the cap is what sets its width)."""
    limit = _px(cap.get("maxWidth"))
    if limit is None:
        return False
    if cap.get("boxSizing") != "border-box":
        limit += (cap.get("paddingLeft", 0) + cap.get("paddingRight", 0)
                  + cap.get("borderLeft", 0) + cap.get("borderRight", 0))
    return abs(float(cap.get("offsetWidth", 0)) - limit) <= BIND_TOLERANCE_PX


def qualifies(cap: dict) -> bool:
    return (not cap.get("ownText")) and is_binding(cap) and float(cap.get("contentWidth", 0)) >= FLOOR_PX


def band_cap(band: dict) -> tuple[dict | None, str]:
    """The cap that sets this band's content width, or ``(None, reason)``."""
    if band.get("chrome"):
        return None, "chrome (header/footer/nav): evidence only"
    if not band.get("textCount"):
        return None, "no rendered text"
    caps = band.get("caps", [])
    chosen = []
    for chain in band.get("chains", []):
        pick = next((caps[i] for i in chain.get("caps", []) if qualifies(caps[i])), None)
        if pick is None:
            return None, "full width (a row of text has no binding layout cap)"
        chosen.append(pick)
    if not chosen:
        return None, "no rendered text"
    return max(chosen, key=lambda c: float(c["contentWidth"])), "constrained"


def _match(band: dict, cap_path: str, census_entry: dict) -> dict | None:
    """The same band's same capped element at another viewport, matched by DOM path."""
    for other in census_entry.get("bands", []):
        if other.get("path") == band.get("path"):
            return next((c for c in other.get("caps", []) if c.get("path") == cap_path), None)
    return None


def derive(census: list) -> dict:
    """``{"contentSize", "wideSize", "evidence", "tally", "reason"}`` from ``facts["layoutCensus"]``."""
    entries = sorted((e for e in census or [] if e.get("bands") is not None), key=lambda e: e.get("viewport", 0))
    if not entries:
        return {"contentSize": None, "wideSize": None, "evidence": [], "tally": {},
                "reason": "the census recorded no viewport"}
    widest = entries[-1]
    evidence, tally = [], Counter()
    for band in widest["bands"]:
        cap, reason = band_cap(band)
        row = {"band": band.get("label"), "text": band.get("text", "")[:40], "reason": reason}
        if cap is not None:
            width = round(float(cap["contentWidth"]))
            tally[width] += 1
            row.update({"cap": cap.get("label"), "maxWidth": cap.get("maxWidth"), "boxSizing": cap.get("boxSizing"),
                        "padding": f"{cap.get('paddingLeft', 0):g}/{cap.get('paddingRight', 0):g}",
                        "contentWidth": width})
            for entry in entries:
                seen = _match(band, cap["path"], entry)
                if seen is not None:
                    row[f"at{entry['viewport']}"] = {"x": seen.get("contentX"), "width": seen.get("contentWidth")}
        evidence.append(row)
    if not tally:
        return {"contentSize": None, "wideSize": None, "evidence": evidence, "tally": {},
                "reason": "no top-level band is held to a content width (the draft is full width)"}
    content = max(tally, key=lambda w: (tally[w], -w))
    wider = [w for w in tally if w > content and tally[w] >= MIN_WIDE_BANDS]
    wide = max(wider, key=lambda w: (tally[w], -w)) if wider else None
    return {"contentSize": content, "wideSize": wide, "evidence": evidence,
            "tally": {str(w): tally[w] for w in sorted(tally)}, "reason": "derived"}


def apply_rendered_layout(settings: dict, facts: dict, trace: list) -> dict | None:
    """Write ``settings.layout`` from the census; the rendered value wins over a declared one (FR-33-1)."""
    census = facts.get("layoutCensus")
    if not census:
        trace.append({"kind": "gap", "what": "layout.contentSize", "_source": "rendered",
                      "reason": "facts carry no layoutCensus (measured by an older measure.js); "
                                "layout left as declared or as the framework default"})
        return None
    result = derive(census)
    layout = settings.setdefault("layout", {})
    if result["contentSize"] is None:
        trace.append({"kind": "gap", "what": "layout.contentSize", "_source": "rendered",
                      "reason": result["reason"] + "; nothing written, the existing value stays",
                      "evidence": result["evidence"]})
        return result
    prior = {k: layout.get(k) for k in ("contentSize", "wideSize")}
    layout["contentSize"] = _fmt(result["contentSize"])
    if result["wideSize"] is not None:
        layout["wideSize"] = _fmt(result["wideSize"])
        wide_reason = f"wideSize {layout['wideSize']}: the recurring wider band width"
    else:
        existing = _px(layout.get("wideSize"))
        if existing is None or existing < result["contentSize"]:
            layout["wideSize"] = layout["contentSize"]
            wide_reason = "one width only; wideSize raised to contentSize (never narrower)"
        else:
            wide_reason = f"one width only; wideSize {layout['wideSize']} kept"
    trace.append({"kind": "layout", "what": "layout.contentSize", "_source": "rendered",
                  "value": layout["contentSize"], "wideSize": layout["wideSize"],
                  "reason": f"most common content box of the top-level bands at the widest census viewport; "
                            f"{wide_reason}",
                  "tally": result["tally"], "superseded": prior, "evidence": result["evidence"]})
    return result


def main(argv=None) -> int:
    """Write ONLY ``settings.layout`` of an existing snapshot from a measure.js facts file."""
    ap = argparse.ArgumentParser(description="FR-33-19: content/wide width from a measure.js facts file")
    ap.add_argument("--facts", required=True, help="facts JSON written by measure.js --out")
    ap.add_argument("--snapshot", required=True, help="theme-snapshot.json whose settings.layout is updated")
    ap.add_argument("--write", action="store_true", help="write the snapshot (default: print only)")
    args = ap.parse_args(argv)
    facts = json.loads(pathlib.Path(args.facts).read_text(encoding="utf-8"))
    snap_path = pathlib.Path(args.snapshot)
    snap = json.loads(snap_path.read_text(encoding="utf-8"))
    trace: list = []
    apply_rendered_layout(snap.setdefault("settings", {}), facts, trace)
    print(json.dumps(trace, indent=2, ensure_ascii=False))
    print("settings.layout =", json.dumps(snap["settings"].get("layout")))
    if args.write:
        snap_path.write_text(json.dumps(snap, indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")
        print(f"Wrote {snap_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
