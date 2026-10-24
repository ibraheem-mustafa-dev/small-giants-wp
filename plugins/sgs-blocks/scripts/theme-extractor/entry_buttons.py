"""entry_buttons.py — button facts gathered across every entry draft of a Spec 48A export (FR-33-1).

A draft's button style is the style its pages share, not the style of the one page the extractor was
pointed at. When the export's ``MANIFEST.json`` lists several ``entry_drafts``, each other entry is
measured too and its buttons are folded into the entry draft's facts: a signature met on several pages
sums its ``count``, its authored-padding census and its companions; a signature met on one other page
only is added with that page's reading. The entry draft's own reading (rest and hover) of a signature
always stands, so the measured element stays the one on the draft the run was pointed at.
"""
from __future__ import annotations

import copy
import json
import pathlib

MANIFEST_NAME = "MANIFEST.json"


def other_entry_drafts(draft_dir, draft_name: str) -> list:
    """Paths of the export's other entry drafts, in MANIFEST order (empty without a MANIFEST)."""
    manifest = pathlib.Path(draft_dir) / MANIFEST_NAME
    if not manifest.is_file():
        return []
    entries = json.loads(manifest.read_text(encoding="utf-8")).get("entry_drafts") or []
    out = []
    for name in entries:
        path = pathlib.Path(draft_dir) / str(name)
        if str(name) != draft_name and path.is_file():
            out.append(path)
    return out


def _add_counts(dst: dict, src: dict) -> None:
    for key, count in (src or {}).items():
        dst[key] = int(dst.get(key, 0) or 0) + int(count or 0)


def fold_entry_buttons(facts: dict, others: list, trace: list) -> dict:
    """Fold each ``(name, facts)`` in ``others`` into ``facts["buttons"]`` (see the module docstring)."""
    buttons = facts.setdefault("buttons", [])
    by_key = {b.get("classKey"): b for b in buttons}
    pages = []
    for name, other in others:
        added = merged = 0
        for b in (other or {}).get("buttons", []) or []:
            key = b.get("classKey")
            mine = by_key.get(key)
            if mine is None:
                mine = copy.deepcopy(b)
                mine["entry"] = name
                buttons.append(mine)
                by_key[key] = mine
                added += 1
                continue
            mine["count"] = int(mine.get("count", 1) or 1) + int(b.get("count", 1) or 1)
            if "paddings" in b:
                _add_counts(mine.setdefault("paddings", {}), b.get("paddings"))
            if "companions" in b:
                _add_counts(mine.setdefault("companions", {}), b.get("companions"))
            merged += 1
        pages.append(f"{name}(+{added} new, {merged} summed)")
    if others:
        trace.append({"kind": "measure", "what": "buttons", "_source": "declared",
                      "reason": "button signatures read on every entry draft the MANIFEST lists",
                      "entries": ", ".join(pages)})
    return facts
