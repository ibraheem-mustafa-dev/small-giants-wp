#!/usr/bin/env python3
"""
promote-icon.py — human promote / reject step for SGS icon proposals.

The cloning pipeline records unmatched draft pictograms in
``assets/icons/icon-proposals.jsonl`` (see ``icon_resolver.record_icon_proposal``).
A human decides what happens to each one:

    promote-icon.py list
        Print pending proposals with the three nearest existing icons. The
        similarity score is ADVISORY ONLY (see ``similarity``): shape similarity
        proved unreliable (a truck matched a car), so code never decides a
        near-duplicate. You do.

    promote-icon.py promote <fingerprint> --slug <semantic-slug> [--paint outline|filled|both]
        Validate, normalise, add to ``assets/icons/sgs-icons.json`` (+ provenance in
        ``sgs-icons.meta.json``), mark the proposal approved, then regenerate
        ``includes/lucide-icons.php`` via ``scripts/generate-icons.js``.
        Refuses, changing NOTHING, on any validation failure.

    promote-icon.py reject <fingerprint> [--reason "..."]
        Mark the proposal rejected. It is never proposed again; the icon stays raw
        SVG in the draft. Use for logos, wordmarks, trademarks and one-off art.

Only generic pictograms belong in the framework set. Logos, wordmarks and
trademarks never do.

Path overrides (tests): --proposals, --library, --meta, --out-dir (passed to the
generator so nothing tracked is touched), --no-generate.
"""

from __future__ import annotations

import argparse
import html
import json
import math
import os
import re
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET
from collections import Counter
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from converter.services import icon_resolver as ir  # noqa: E402

PLUGIN_ROOT = os.path.dirname(HERE)
ICONS_DIR = os.path.join(PLUGIN_ROOT, "assets", "icons")
DEFAULT_LIBRARY = os.path.join(ICONS_DIR, "sgs-icons.json")
DEFAULT_META = os.path.join(ICONS_DIR, "sgs-icons.meta.json")
GENERATOR = os.path.join(HERE, "generate-icons.js")
KSES_FILE = os.path.join(PLUGIN_ROOT, "includes", "helpers-svg-kses.php")

# Pictogram allowlist: ONE definition shared with scripts/generate-icons.js (the same JSON),
# so this normaliser and the generator's validator cannot drift apart. A drawing element must
# ALSO be in sgs_svg_kses_allowed_tags() (read live from PHP below), so this can only ever
# narrow the kses list, never widen it.
ALLOWLIST_FILE = os.path.join(ICONS_DIR, "svg-allowlist.json")
with open(ALLOWLIST_FILE, encoding="utf-8") as _fh:
    ALLOW = json.load(_fh)
DRAWING_ELEMENTS = frozenset(ALLOW["drawingElements"])
FORBIDDEN_ATTR_PREFIXES = tuple(ALLOW["forbiddenAttributePrefixes"])
FORBIDDEN_ATTR_NAMES = frozenset(ALLOW["forbiddenAttributeNames"])
FORBIDDEN_MARKUP = [re.compile(p, re.I) for p in ALLOW["forbiddenMarkupPatterns"]]
FORBIDDEN_PAINT = [re.compile(p, re.I) for p in ALLOW["forbiddenPaintValuePatterns"]]
# Attributes never carried into the library (colours, sizing and hooks are the block's job).
DROP_ATTRS = frozenset(
    {"class", "id", "style", "width", "height", "stroke-width", "color", "xmlns", "xmlns:xlink",
     "version", "baseprofile", "role", "aria-label", "aria-hidden", "focusable", "xml:space", "xml:lang"}
)
PAINT_ATTRS = tuple(ALLOW["paintAttributes"])
NS_RE = re.compile(r"^\{[^}]*\}")


class Refusal(Exception):
    """A validation failure: message is shown to the user, nothing has been changed."""


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


# ---------------------------------------------------------------------------
# kses allow-list (single source of truth: includes/helpers-svg-kses.php)
# ---------------------------------------------------------------------------

def kses_allowed() -> dict[str, set[str]]:
    """Run PHP to dump sgs_svg_kses_allowed_tags() as {tag: {attr,...}} (lower-case)."""
    code = (
        'define("ABSPATH",1); require %s; '
        "echo json_encode(array_map('array_keys', sgs_svg_kses_allowed_tags()));"
    ) % json.dumps(KSES_FILE)
    try:
        proc = subprocess.run(
            ["php", "-r", code], capture_output=True, text=True, timeout=30, check=True
        )
        data = json.loads(proc.stdout)
    except (OSError, subprocess.SubprocessError, ValueError) as exc:
        raise Refusal(
            f"cannot read the kses allow-list from {KSES_FILE} (is php on PATH?): {exc}"
        ) from exc
    return {tag.lower(): {a.lower() for a in attrs} for tag, attrs in data.items()}


# ---------------------------------------------------------------------------
# SVG validation + normalisation
# ---------------------------------------------------------------------------

def _local(name: str) -> str:
    return NS_RE.sub("", name).lower()


def _fmt(num: float) -> str:
    return ("%.6f" % num).rstrip("0").rstrip(".")


def _paint(value: str) -> str:
    """fill/stroke value -> "none" | "currentColor". Gradients / patterns are refused."""
    v = value.strip().lower()
    if v == "none":
        return "none"
    if any(p.search(v) for p in FORBIDDEN_PAINT):
        raise Refusal("fill/stroke references a gradient or pattern (url(...)); not allowed")
    return "currentColor"


def _viewbox(root: ET.Element) -> tuple[float, float, float]:
    """Return (min_x, min_y, size) for a square viewBox, or refuse."""
    raw = root.get("viewBox") or root.get("viewbox")
    if raw:
        parts = [p for p in re.split(r"[\s,]+", raw.strip()) if p]
        try:
            x, y, w, h = (float(p) for p in parts)
        except ValueError as exc:
            raise Refusal(f"viewBox {raw!r} is not four numbers") from exc
    else:
        try:
            x, y = 0.0, 0.0
            w = float(re.sub(r"px$", "", root.get("width", "").strip()))
            h = float(re.sub(r"px$", "", root.get("height", "").strip()))
        except ValueError as exc:
            raise Refusal("no viewBox and no numeric width/height to derive one from") from exc
    if w <= 0 or abs(w - h) > 1e-6:
        raise Refusal(f"viewBox must be square and positive (got {_fmt(w)} x {_fmt(h)})")
    return x, y, w


def normalise_svg(raw_svg: str, paint_mode: str = "auto") -> str:
    """
    Validate and normalise a proposal's raw SVG into library markup, or raise Refusal.

    Rules: single <svg> root; only drawing elements that sgs_svg_kses_allowed_tags()
    also allows; no <script>, no on* attributes, no href / xlink:href (no external
    references), no DOCTYPE / entities; every fill/stroke becomes currentColor or none
    (url(...) refused); class/id/style/width/height/stroke-width dropped; root gets the
    Lucide-style wrapper (24x24, round caps). A square viewBox other than 0 0 24 24 is
    normalised with a <g transform> so the path `d` strings (the fingerprint) never change.
    """
    text = raw_svg.strip()
    for pattern in FORBIDDEN_MARKUP:
        if pattern.search(text):
            raise Refusal(f"markup matches a forbidden pattern ({pattern.pattern}): "
                          "DOCTYPE / ENTITY / <script> / javascript: are not allowed")
    try:
        root = ET.fromstring(text)
    except ET.ParseError as exc:
        raise Refusal(f"raw SVG is not well-formed XML: {exc}") from exc
    if _local(root.tag) != "svg":
        raise Refusal("root element is not <svg> (single-root svg required)")

    allowed = kses_allowed()
    kses_tags = set(allowed)
    x0, y0, size = _viewbox(root)

    def clean(el: ET.Element) -> tuple[str, dict[str, str], list]:
        tag = _local(el.tag)
        if tag not in DRAWING_ELEMENTS or tag not in kses_tags:
            raise Refusal(f"element <{tag}> is not allowed (drawing elements only: "
                          f"{', '.join(sorted(DRAWING_ELEMENTS))})")
        attrs: dict[str, str] = {}
        for raw_name, value in el.attrib.items():
            name = _local(raw_name)
            if name.startswith(FORBIDDEN_ATTR_PREFIXES):
                raise Refusal(f"event-handler attribute {name!r} is not allowed")
            if name in FORBIDDEN_ATTR_NAMES or raw_name.endswith("}href"):
                raise Refusal("href / xlink:href (external reference) is not allowed")
            if name in PAINT_ATTRS:
                attrs[name] = _paint(value)
            elif name in DROP_ATTRS or name in ("viewbox",) or name not in allowed[tag]:
                continue
            else:
                attrs[name] = value
        # Inline style may carry the real colours; they are dropped, but a style that
        # sets fill/stroke still tells us the icon's paint intent.
        style = el.get("style", "")
        for prop in PAINT_ATTRS:
            m = re.search(r"(?:^|;)\s*%s\s*:\s*([^;]+)" % prop, style)
            if m and prop not in attrs:
                attrs[prop] = _paint(m.group(1))
        kids = [clean(child) for child in el if isinstance(child.tag, str)]
        return tag, attrs, kids

    tree = clean(root)

    def paints(node: tuple[str, dict[str, str], list], prop: str) -> list[str]:
        out = [node[1][prop]] if prop in node[1] else []
        for kid in node[2]:
            out += paints(kid, prop)
        return out

    fill_active = "currentColor" in paints(tree, "fill")
    stroke_active = "currentColor" in paints(tree, "stroke")
    if paint_mode == "auto":
        if not (fill_active or stroke_active):
            raise Refusal(
                "the SVG carries no fill/stroke information (its colours came from the "
                "draft's CSS). Re-run with --paint outline (stroked, Lucide-style) or "
                "--paint filled (solid)."
            )
        paint_mode = "both" if (fill_active and stroke_active) else ("filled" if fill_active else "outline")
    root_paint = {
        "outline": {"fill": "none", "stroke": "currentColor"},
        "filled": {"fill": "currentColor", "stroke": "none"},
        "both": {"fill": "currentColor", "stroke": "currentColor"},
    }[paint_mode]

    def emit(node: tuple[str, dict[str, str], list], is_root: bool = False) -> str:
        tag, attrs, kids = node
        if not is_root:
            # A child that repeats the root's paint carries nothing extra.
            attrs = {k: v for k, v in attrs.items() if not (k in root_paint and root_paint[k] == v)}
        pairs = " ".join('%s="%s"' % (k, html.escape(v, quote=True)) for k, v in attrs.items())
        inner = "".join(emit(k) for k in kids)
        head = "<%s%s" % (tag, (" " + pairs) if pairs else "")
        return head + (">" + inner + "</%s>" % tag if inner else "/>")

    body = "".join(emit(kid) for kid in tree[2])
    if abs(size - 24.0) > 1e-9 or x0 != 0 or y0 != 0:
        scale = 24.0 / size
        move = "" if (x0 == 0 and y0 == 0) else " translate(%s %s)" % (_fmt(-x0), _fmt(-y0))
        body = '<g transform="scale(%s)%s">%s</g>' % (_fmt(scale), move, body)
    if "transform" in tree[1]:
        raise Refusal("a transform on the root <svg> is not supported")
    root_map = {
        "xmlns": "http://www.w3.org/2000/svg",
        "width": "24",
        "height": "24",
        "viewBox": "0 0 24 24",
        "fill": root_paint["fill"],
        "stroke": root_paint["stroke"],
    }
    if root_paint["stroke"] != "none":
        root_map.update({"stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round"})
    # Inheritable presentation attributes the source set on its root (fill-rule, opacity,
    # linecap...) apply to every child, so they must survive.
    root_map.update({k: v for k, v in tree[1].items() if k not in PAINT_ATTRS})
    root_attrs = " ".join('%s="%s"' % (k, html.escape(v, quote=True)) for k, v in root_map.items())
    return "<svg %s>%s</svg>" % (root_attrs, body)


# ---------------------------------------------------------------------------
# Advisory similarity (never a decision)
# ---------------------------------------------------------------------------

def _features(svg: str) -> tuple[Counter, Counter, set[str]]:
    """(path-command letter counts, element-type counts, normalised path strings)."""
    paths = ir._extract_paths_from_svg_str(svg)
    cmds = Counter(c for p in paths for c in p if c.isalpha())
    elems = Counter(re.findall(r"<(path|circle|rect|ellipse|line|polyline|polygon)\b", svg))
    return cmds, elems, {ir._normalise_d(p) for p in paths}


def _cosine(a: Counter, b: Counter) -> float:
    dot = sum(a[k] * b[k] for k in a)
    na, nb = math.sqrt(sum(v * v for v in a.values())), math.sqrt(sum(v * v for v in b.values()))
    return dot / (na * nb) if na and nb else 0.0


def similarity(svg_a: str, svg_b: str) -> float:
    """
    ADVISORY 0..1 score = 0.5 * cosine(path-command letter counts)
                        + 0.3 * cosine(element-type counts)
                        + 0.2 * Jaccard(exact normalised path strings).
    It compares how the icons are DRAWN, not what they LOOK like; it says nothing about
    meaning. Treat it as "worth a glance", never as "duplicate".
    """
    ca, ea, pa = _features(svg_a)
    cb, eb, pb = _features(svg_b)
    jac = len(pa & pb) / len(pa | pb) if (pa | pb) else 0.0
    return 0.5 * _cosine(ca, cb) + 0.3 * _cosine(ea, eb) + 0.2 * jac


def nearest(svg: str, k: int = 3) -> list[tuple[float, str, str]]:
    """The k most similar existing icons as (score, source, name)."""
    scored = [
        (similarity(svg, other), source, name)
        for source, icons in ir.known_icons().items()
        for name, other in icons.items()
    ]
    return sorted(scored, key=lambda t: (-t[0], t[2]))[:k]


# ---------------------------------------------------------------------------
# File helpers
# ---------------------------------------------------------------------------

def read_json_obj(path: str) -> dict:
    if not os.path.exists(path):
        return {}
    with open(path, "r", encoding="utf-8") as fh:
        data = json.load(fh)
    if not isinstance(data, dict):
        raise Refusal(f"{path} must contain a JSON object")
    return data


def write_json_atomic(path: str, data: dict) -> None:
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    tmp = f"{path}.{os.getpid()}.tmp"
    with open(tmp, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(json.dumps(data, indent="\t", sort_keys=True, ensure_ascii=False) + "\n")
    os.replace(tmp, path)


def snapshot(paths: list[str]) -> dict[str, bytes | None]:
    return {p: (open(p, "rb").read() if os.path.exists(p) else None) for p in paths}


def restore(snap: dict[str, bytes | None]) -> None:
    for path, data in snap.items():
        if data is None:
            if os.path.exists(path):
                os.remove(path)
        else:
            with open(path, "wb") as fh:
                fh.write(data)


def find_row(rows: list, prefix: str) -> dict:
    """The single proposal row whose fingerprint equals / starts with ``prefix``."""
    hits = {r["fingerprint"]: r for r, _raw in rows if r is not None and r["fingerprint"].startswith(prefix)}
    if not prefix or len(prefix) < 8:
        raise Refusal("give at least the first 8 characters of the fingerprint")
    if not hits:
        raise Refusal(f"no proposal with fingerprint starting {prefix!r}")
    if len(hits) > 1:
        raise Refusal(f"fingerprint prefix {prefix!r} is ambiguous ({len(hits)} matches)")
    return next(iter(hits.values()))


def run_generator(extra: list[str]) -> subprocess.CompletedProcess:
    return subprocess.run(["node", GENERATOR, *extra], capture_output=True, text=True, timeout=300)


# ---------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------

def cmd_list(args: argparse.Namespace) -> int:
    rows, ok = ir.read_proposal_rows(args.proposals)
    if not ok:
        print(f"cannot read {args.proposals}", file=sys.stderr)
        return 1
    pending = [r for r, _raw in rows if r is not None and r.get("status") == "pending"]
    if not pending:
        print(f"No pending icon proposals in {args.proposals}.")
        return 0
    print("Similarity scores are ADVISORY: they compare how icons are drawn, not what they mean.")
    print("Decide near-duplicates yourself, then promote or reject.\n")
    for row in sorted(pending, key=lambda r: r.get("first_seen", "")):
        svg = row.get("raw_svg", "")
        print(f"{row['fingerprint']}")
        print(f"  first seen {row.get('first_seen')}  last seen {row.get('last_seen')}  "
              f"in {len(row.get('seen_in', []))} run(s)  draft: {row.get('source_draft')}")
        print(f"  markup: {svg[:140]}{'...' if len(svg) > 140 else ''}")
        for score, source, name in nearest(svg):
            print(f"  nearest: {name} ({source})  advisory score {score:.2f}")
        print()
    return 0


def cmd_promote(args: argparse.Namespace) -> int:
    if not ir.SLUG_RE.match(args.slug):
        raise Refusal(f"slug {args.slug!r} must match ^[a-z][a-z0-9-]*$")
    rows, ok = ir.read_proposal_rows(args.proposals)
    if not ok:
        raise Refusal(f"cannot read {args.proposals}")
    row = find_row(rows, args.fingerprint)
    if row.get("status") != "pending":
        raise Refusal(f"proposal {row['fingerprint'][:12]} is {row.get('status')!r}, not pending")
    if args.slug in ir.reserved_names():
        raise Refusal(f"slug {args.slug!r} is a Lucide/WordPress icon name (reserved)")
    library = read_json_obj(args.library)
    if args.slug in library:
        raise Refusal(f"slug {args.slug!r} already exists in the SGS library")
    fp = row["fingerprint"]
    existing = {ir.fingerprint_of_svg(v): k for k, v in ir.known_icons()["lucide"].items()}
    existing.update({ir.fingerprint_of_svg(v): k for k, v in ir.known_icons()["wp"].items()})
    existing.update({ir.fingerprint_of_svg(v): k for k, v in library.items()})
    if fp in existing:
        raise Refusal(f"this fingerprint is already in the library as {existing[fp]!r}")

    svg = normalise_svg(row.get("raw_svg", ""), args.paint)
    if ir.fingerprint_of_svg(svg) != fp:
        raise Refusal("normalised SVG no longer matches the proposal fingerprint (path data changed)")

    candidate = dict(library)
    candidate[args.slug] = svg
    with tempfile.TemporaryDirectory() as tmp:
        cand_file = os.path.join(tmp, "candidate-library.json")
        write_json_atomic(cand_file, candidate)
        check = run_generator(["--check", "--library", cand_file])
    if check.returncode != 0:
        raise Refusal((check.stderr or check.stdout).strip() or "generator refused the library")

    meta = read_json_obj(args.meta)
    meta[args.slug] = {
        "fingerprint": fp,
        "source_draft": row.get("source_draft"),
        "first_seen": row.get("first_seen"),
        "promoted": now_iso(),
        "seen_in_runs": len(row.get("seen_in", [])),
    }
    snap = snapshot([args.library, args.meta, args.proposals])
    try:
        write_json_atomic(args.library, candidate)
        write_json_atomic(args.meta, meta)
        row.update(status="approved", slug=args.slug, approved_at=now_iso())
        ir.write_rows_atomic(args.proposals, rows)
        if not args.no_generate:
            gen_args = ["--library", args.library] + (["--out-dir", args.out_dir] if args.out_dir else [])
            gen = run_generator(gen_args)
            if gen.returncode != 0:
                raise Refusal("generator failed, everything rolled back: " + (gen.stderr or gen.stdout).strip())
    except BaseException:
        restore(snap)
        raise
    print(f"Promoted {fp[:12]} as {args.slug!r}. Library now has {len(candidate)} SGS icon(s).")
    if args.no_generate:
        print("Generator skipped (--no-generate): run node scripts/generate-icons.js to update the PHP map.")
    return 0


def cmd_reject(args: argparse.Namespace) -> int:
    rows, ok = ir.read_proposal_rows(args.proposals)
    if not ok:
        raise Refusal(f"cannot read {args.proposals}")
    row = find_row(rows, args.fingerprint)
    if row.get("status") == "rejected":
        print(f"Proposal {row['fingerprint'][:12]} is already rejected.")
        return 0
    if row.get("status") != "pending":
        raise Refusal(f"proposal {row['fingerprint'][:12]} is {row.get('status')!r}, only pending can be rejected")
    row.update(status="rejected", rejected_at=now_iso())
    if args.reason:
        row["reject_reason"] = args.reason
    ir.write_rows_atomic(args.proposals, rows)
    print(f"Rejected {row['fingerprint'][:12]}. It will not be proposed again.")
    return 0


def build_parser() -> argparse.ArgumentParser:
    ap = argparse.ArgumentParser(description="Promote or reject SGS icon proposals.")
    ap.add_argument("--proposals", default=ir.proposals_path(), help="proposals JSONL (default: $SGS_ICON_PROPOSALS_LOG or the tracked file)")
    ap.add_argument("--library", default=DEFAULT_LIBRARY, help="SGS library JSON")
    ap.add_argument("--meta", default=DEFAULT_META, help="provenance JSON")
    ap.add_argument("--out-dir", default=None, help="generator output dir (tests); tracked files untouched")
    ap.add_argument("--no-generate", action="store_true", help="skip the generate-icons.js run")
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("list", help="show pending proposals + advisory nearest icons")
    p = sub.add_parser("promote", help="approve a pending proposal into the SGS library")
    p.add_argument("fingerprint")
    p.add_argument("--slug", required=True)
    p.add_argument("--paint", choices=["auto", "outline", "filled", "both"], default="auto")
    r = sub.add_parser("reject", help="reject a pending proposal permanently")
    r.add_argument("fingerprint")
    r.add_argument("--reason", default="")
    return ap


def main(argv: list[str] | None = None) -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    args = build_parser().parse_args(argv)
    try:
        return {"list": cmd_list, "promote": cmd_promote, "reject": cmd_reject}[args.cmd](args)
    except Refusal as exc:
        print(f"REFUSED: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
