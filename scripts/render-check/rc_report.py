"""The render check's report: report.json (everything) and report.md (what a reader acts on), plus a before-and-after
crop pair for each confirmed difference, cut from round two's screenshots.
"""
from __future__ import annotations

import json
from pathlib import Path

from rc_compare import describe

PAD = 24
MAX_PAIRS = 4


def _crop_pair(a_png: Path, b_png: Path, a_box, b_box, dest: Path) -> bool:
    from PIL import Image

    if not (a_png.exists() and b_png.exists()):
        return False
    boxes = [b for b in (a_box, b_box) if b and b[2] > 0 and b[3] > 0]
    if not boxes:
        return False
    x0 = max(0, min(b[0] for b in boxes) - PAD)
    y0 = max(0, min(b[1] for b in boxes) - PAD)
    x1 = max(b[0] + b[2] for b in boxes) + PAD
    y1 = min(max(b[1] + b[3] for b in boxes) + PAD, y0 + 1600)
    a, b = Image.open(a_png).convert("RGB"), Image.open(b_png).convert("RGB")
    # A box can lie past a screenshot's right or bottom edge (a ticker's off-screen copy): the pair shows only what
    # both screenshots hold, and no pair is cut when that is nothing.
    xa, ya = int(min(x1, a.width)), int(min(y1, a.height))
    xb, yb = int(min(x1, b.width)), int(min(y1, b.height))
    if min(xa, xb) <= int(x0) or min(ya, yb) <= int(y0):
        return False
    ca = a.crop((int(x0), int(y0), xa, ya))
    cb = b.crop((int(x0), int(y0), xb, yb))
    out = Image.new("RGB", (ca.width + cb.width + 12, max(ca.height, cb.height)), (255, 0, 255))
    out.paste(ca, (0, 0))
    out.paste(cb, (ca.width + 12, 0))
    dest.parent.mkdir(parents=True, exist_ok=True)
    out.save(dest)
    return True


def make_pairs(run_dir: Path, state: str, width: int, diffs: list[dict], probes_a: dict, probes_b: dict) -> list[str]:
    """Crop pairs (before left, after right) for up to MAX_PAIRS differences of one state and width."""
    r2 = run_dir / "dom-r2"
    name = f"{state}@{width}"
    made = []
    for n, d in enumerate(diffs):
        if len(made) >= MAX_PAIRS:
            break
        dest = run_dir / "pairs" / f"{name}-{n}.png"
        if "probe" in d:
            ia, ib = probes_a.get(d["probe"]), probes_b.get(d["probe"])
            kind = d["probe"].rsplit("|", 1)[1]
            if ia is None or ib is None:
                continue
            a_png, b_png = r2 / "a" / "probes" / f"{name}-{ia}-{kind}.png", r2 / "b" / "probes" / f"{name}-{ib}-{kind}.png"
            if not (a_png.exists() and b_png.exists()):
                continue
            from PIL import Image

            ca, cb = Image.open(a_png).convert("RGB"), Image.open(b_png).convert("RGB")
            out = Image.new("RGB", (ca.width + cb.width + 12, max(ca.height, cb.height)), (255, 0, 255))
            out.paste(ca, (0, 0))
            out.paste(cb, (ca.width + 12, 0))
            dest.parent.mkdir(parents=True, exist_ok=True)
            out.save(dest)
            made.append(str(dest))
        elif _crop_pair(r2 / "a" / f"{name}.png", r2 / "b" / f"{name}.png", d.get("old_box"), d.get("new_box"), dest):
            made.append(str(dest))
    return made


def write(run_dir: Path, meta: dict, results: dict) -> None:
    (run_dir / "report.json").write_text(json.dumps({"meta": meta, "states": results}, indent=1), encoding="utf-8")
    L = [f"# Render check: {meta['source']} ({meta['before']} -> {meta['after']})", ""]
    L.append(f"Exit {meta['exit']}: {meta['verdict']}. Copies {meta['copies']['a']} (before) and {meta['copies']['b']} (after), dropped: {meta['dropped']}. Accepted entries from {meta['accepted_file'] or 'none'}.")
    if meta.get("steps"):
        L.append(f"Steps on the after copy: {'; '.join(meta['steps'])}.")
    if meta.get("seed_steps"):
        L.append(f"Seed steps on both copies: {'; '.join(meta['seed_steps'])}.")
    if meta.get("viewer_errors"):
        L.append("Viewer failures: " + "; ".join(meta["viewer_errors"]))
    L += ["", "## Every state", "", "| State | Viewer | Reached before | Reached after | Result |", "|---|---|---|---|---|"]
    for name, r in results.items():
        viewer = r["auth"] + (" + basket" if r["basket"] else "") + (" (signed-in view)" if r["signedInView"] else "")
        reach = ["yes" if r["reached"][s] else "NO: " + "; ".join(r["fails"][s])[:160] for s in ("a", "b")]
        L.append(f"| {name} | {viewer} | {reach[0]} | {reach[1]} | {r['verdict']} |")
    for name, r in results.items():
        if r["verdict"] not in ("differs", "differs (accepted)"):
            continue
        L += ["", f"## {name}", "", "Responses that differ: " + ", ".join(r["response_diffs"][:12]) + (" ..." if len(r["response_diffs"]) > 12 else "")]
        for w, wr in r["widths"].items():
            if not wr["confirmed"]:
                continue
            L.append(f"\n### {name} at {w}px: {len(wr['confirmed'])} confirmed, {len(wr['accepted'])} accepted, {wr['flapping']} seen in one round only")
            for p in wr["pairs"]:
                L.append(f"- pair: `{p}`")
            for d in wr["confirmed"][:20]:
                L.append("- " + describe(d) + (f" (accepted: {d['accepted_by']['commit']})" if d.get("accepted_by") else ""))
            if len(wr["confirmed"]) > 20:
                L.append(f"- ... {len(wr['confirmed']) - 20} more in report.json")
    (run_dir / "report.md").write_text("\n".join(L) + "\n", encoding="utf-8")
