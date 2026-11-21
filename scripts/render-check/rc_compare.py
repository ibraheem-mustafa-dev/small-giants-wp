"""Comparison for the render check: response hashes, element records, confirmation across two rounds, accepted entries.

An element record (capture.mjs, lib/page.mjs::recordTree) is [key, x, y, width, height, style, ::before, ::after, text,
picture]; style and the pseudo-elements index a style table, -1 when absent (style -1: display none). Elements are
matched by key and occurrence. A difference is a moved or resized box (over 1px), a changed computed value, a changed
own text or picture, or an element only one side has.
"""
from __future__ import annotations

import fnmatch
import re
from collections import defaultdict

TOL = 1.0


def hash_diff(a: dict, b: dict) -> list[str]:
    """The response keys whose hashes differ between two hash-pass records of one state ([] when identical)."""
    ra, rb = a.get("responses", {}), b.get("responses", {})
    out = [k for k in sorted(set(ra) | set(rb)) if ra.get(k) != rb.get(k)]
    if a.get("url") != b.get("url"):
        out.insert(0, f"final address {a.get('url')} -> {b.get('url')}")
    return out


def _index(els):
    idx, cnt = {}, defaultdict(int)
    for e in els:
        cnt[e[0]] += 1
        idx[(e[0], cnt[e[0]])] = e
    return idx


def _vec_diff(props, sa, sb, ia, ib, pseudo=False):
    if ia == ib == -1:
        return {}
    if ia == -1 or ib == -1:
        return {"(present)": [ia != -1, ib != -1]}
    a, b = sa[ia], sb[ib]
    names = props + (["content", "width", "height"] if pseudo else [])
    return {names[i]: [a[i], b[i]] for i in range(min(len(a), len(b))) if a[i] != b[i]}


def element_diffs(o: dict, n: dict, props: list[str]) -> list[dict]:
    """Every element difference between two records (each with els and styles)."""
    oi, ni = _index(o["els"]), _index(n["els"])
    out = []
    for k, a in oi.items():
        b = ni.get(k)
        if b is None:
            out.append({"el": k[0], "n": k[1], "kind": "removed", "old_box": a[1:5]})
            continue
        rec = {}
        if (a[5] == -1) != (b[5] == -1):
            rec["display"] = ["none" if a[5] == -1 else "shown", "none" if b[5] == -1 else "shown"]
        else:
            geo = [round(b[i] - a[i], 1) for i in range(1, 5)]
            if max(abs(g) for g in geo) > TOL:
                rec["box"] = {"old": a[1:5], "new": b[1:5]}
            st = _vec_diff(props, o["styles"], n["styles"], a[5], b[5])
            if st:
                rec["style"] = st
            for name, i in (("::before", 6), ("::after", 7)):
                d = _vec_diff(props, o["styles"], n["styles"], a[i], b[i], True)
                if d:
                    rec[name] = d
            if a[8] != b[8]:
                rec["text"] = [a[8], b[8]]
            if a[9] != b[9]:
                rec["picture"] = [a[9], b[9]]
        if rec:
            rec.update({"el": k[0], "n": k[1], "kind": "changed", "old_box": a[1:5], "new_box": b[1:5]})
            out.append(rec)
    for k, b in ni.items():
        if k not in oi:
            out.append({"el": k[0], "n": k[1], "kind": "added", "new_box": b[1:5]})
    return out


def capture_diffs(o: dict, n: dict) -> list[dict]:
    """Element differences at rest plus under each forced hover and focus probe, each tagged with where it was seen."""
    props = o["props"]
    out = [dict(d, where="rest") for d in element_diffs(o, n, props)]
    if o["scrollHeight"] != n["scrollHeight"]:
        out.append({"el": "(page)", "n": 1, "kind": "changed", "where": "rest", "height": [o["scrollHeight"], n["scrollHeight"]]})
    po = {(p["key"], p["kind"]): p for p in o.get("probes", [])}
    pn = {(p["key"], p["kind"]): p for p in n.get("probes", [])}
    for pk in sorted(set(po) | set(pn)):
        if pk not in po or pk not in pn:
            out.append({"el": pk[0], "n": 1, "kind": "probe only on " + ("after" if pk in pn else "before"), "where": pk[1]})
            continue
        for d in element_diffs(po[pk], pn[pk], props):
            out.append(dict(d, where=f"{pk[1]} on {pk[0]}", probe=pk[0] + "|" + pk[1]))
    return out


PX_CHANNEL = 36  # summed RGB change for a pixel to count as changed (0-765)
PX_MIN = 60  # changed pixels a screenshot pair needs before it counts
STEM = re.compile(r"-\d+x\d+(?=\.\w+$)")


def changed_picture_stems(response_diffs: list[str]) -> set[str]:
    """Picture files whose bytes differ, by name without the size suffix (photo-300x200.jpg -> photo.jpg)."""
    out = set()
    for k in response_diffs:
        m = re.match(r"GET (\S+\.(?:jpe?g|png|gif|webp|avif|svg))", k, re.I)
        if m:
            out.add(STEM.sub("", m.group(1)))
    return out


def masks(rec: dict, changed_stems: set[str]) -> list[list[float]]:
    """Boxes left out of the pixel comparison: pictures whose file did not change (which size of an unchanged picture
    the browser loads varies between loads), embedded frames (another site's content) and elements an endless animation
    moves (a marquee parked at its start still sits wherever its load-time measurements put it, a pixel either way);
    those elements are still compared by their readings."""
    out = [list(b) for b in rec.get("endless", [])]
    for e in rec["els"]:
        tag = e[0].split(".", 1)[0]
        if e[5] == -1 or e[3] <= 0 or e[4] <= 0:
            continue
        if tag == "iframe" or (tag == "img" and STEM.sub("", e[9]) not in changed_stems):
            out.append(e[1:5])
    return out


def pixel_diff(a_png, b_png, mask_boxes: list[list[float]]) -> dict | None:
    """A screenshot difference outside the masked boxes, as a difference record, or None."""
    import numpy as np
    from PIL import Image

    a = np.asarray(Image.open(a_png).convert("RGB")).astype(np.int16)
    b = np.asarray(Image.open(b_png).convert("RGB")).astype(np.int16)
    h, w = min(a.shape[0], b.shape[0]), min(a.shape[1], b.shape[1])
    d = np.abs(a[:h, :w] - b[:h, :w]).sum(axis=2) > PX_CHANNEL
    for x, y, bw, bh in mask_boxes:
        d[max(0, int(y)):max(0, int(y + bh) + 1), max(0, int(x)):max(0, int(x + bw) + 1)] = False
    n = int(d.sum())
    if n < PX_MIN:
        return None
    ys, xs = np.where(d)
    box = [int(xs.min()), int(ys.min()), int(xs.max() - xs.min() + 1), int(ys.max() - ys.min() + 1)]
    # Rounded to a 40px grid so the same region in both rounds signs the same.
    cell = [v // 40 for v in (box[0], box[1], box[0] + box[2], box[1] + box[3])]
    return {"el": "(screenshot)", "n": 1, "kind": "changed", "where": "rest", "pixels": {"changed": n, "region": cell},
            "old_box": box, "new_box": box}


def signature(d: dict) -> str:
    """What a difference is, without its values: used to keep only differences seen in both rounds."""
    fields = [k for k in ("display", "box", "text", "picture", "height") if k in d]
    if "pixels" in d:
        fields.append("pixels:" + ",".join(map(str, d["pixels"]["region"])))
    for k in ("style", "::before", "::after"):
        if k in d:
            fields.append(k + ":" + ",".join(sorted(d[k])))
    return "|".join([d["where"], d["el"], str(d["n"]), d["kind"], *fields])


def confirmed(round1: list[dict], round2: list[dict]) -> tuple[list[dict], int]:
    """Round two's differences that round one also showed, and the count seen in one round only."""
    s1 = {signature(d) for d in round1}
    keep = [d for d in round2 if signature(d) in s1]
    s2 = {signature(d) for d in round2}
    return keep, len(s1 ^ s2)


def validate_accepted(data: dict) -> list[str]:
    """Problems with an accepted-differences file; each entry must name its state, commit and the pair Bean saw."""
    errs = []
    for i, e in enumerate(data.get("entries", [])):
        for k in ("state", "commit", "pair"):
            if not str(e.get(k, "")).strip():
                errs.append(f"entry {i}: missing {k}")
    return errs


def accepted_by(d: dict, state: str, width: int, entries: list[dict]) -> dict | None:
    """The first entry that covers one difference: its state pattern, and its width, element and where (a part of the
    difference's `rest`, `hover on ...` or `focus on ...`) when it names them."""
    for e in entries:
        if not fnmatch.fnmatch(state, e["state"]):
            continue
        if "width" in e and int(e["width"]) != width:
            continue
        if e.get("element") and e["element"] not in d["el"]:
            continue
        if e.get("where") and e["where"] not in str(d.get("where", "")):
            continue
        return e
    return None


def describe(d: dict) -> str:
    """One line for a report."""
    bits = []
    if "pixels" in d:
        bits.append(f"{d['pixels']['changed']} screenshot pixels differ within the box {d['old_box']}")
    if "height" in d:
        bits.append(f"page height {d['height'][0]} -> {d['height'][1]}")
    if "display" in d:
        bits.append(f"display {d['display'][0]} -> {d['display'][1]}")
    if "box" in d:
        bits.append(f"box {d['box']['old']} -> {d['box']['new']}")
    for k in ("text", "picture"):
        if k in d:
            bits.append(f"{k} {d[k][0][:60]!r} -> {d[k][1][:60]!r}")
    for k in ("style", "::before", "::after"):
        if k in d:
            items = list(d[k].items())
            bits.append(("" if k == "style" else k + " ") + "; ".join(f"{p}: {v[0]} -> {v[1]}" for p, v in items[:6]) + (f" (+{len(items) - 6})" if len(items) > 6 else ""))
    return f"{d['kind']} `{d['el'][:100]}` #{d['n']} [{d['where']}] " + " | ".join(bits)
