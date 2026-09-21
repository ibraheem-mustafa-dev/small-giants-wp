"""
icon_resolver.py — SGS Trust-Bar Icon Identity Resolver
=========================================================

Takes a badge's icon DOM node (BeautifulSoup element containing an <svg>)
and resolves it to either:
  - A confident icon slug (matches the deployed lucide-icons.json library), or
  - A raw SVG fallback (sanitised outer string) when no confident match found.

Returns a dict:
  {
      "slug":        str | None,   # present on confident match
      "confidence":  str,          # "high" | "medium" | "none"
      "raw_svg":     str | None,   # present on fallback (confidence="none")
      "state":       str,          # "library" | "pending" | "rejected" | "new"
      "fingerprint": str | None,   # sha1 of the normalised sorted path set
  }

Icon states (keyed by the stable path-set fingerprint, never by run):
  library  — already in the framework set (Lucide, WordPress, or the SGS library
             ``assets/icons/sgs-icons.json``). Never re-proposed.
  pending  — seen before in a draft, awaiting a human decision in the proposals
             file. Stays raw SVG; never gets a second proposal row.
  rejected — a human rejected it (logo, wordmark, trademark, one-off art). Stays raw
             SVG in the draft and is never proposed again.
  new      — not seen before. ``record_icon_proposal`` may add one pending row.

``resolve_icon`` is a PURE lookup: it reads the proposals file read-only and never
writes. Recording is a separate, opt-in call, ``record_icon_proposal``, and only
writes when ``SGS_ICON_PROPOSALS_LOG=<path>`` is set. Unset means nothing is ever
written anywhere. ``scripts/promote-icon.py`` is the human promote / reject step.

Confidence levels:
  high   — exact path-data fingerprint match in the reverse index
  medium — structural heuristic match (shape, element types, fill/stroke hints)
  none   — no match; raw_svg is set to the outer <svg> string for verbatim render

Design constraints:
  R-22-1  DB-first / no hardcoded dicts where a data source exists: the reverse
          index is built lazily from lucide-icons.json (1 917 icons) at first call.
          The structural-hint table only covers patterns that cannot be expressed
          as path-data (polygon, rect, mixed-element shapes from old lucide versions).
  Rule 2  No silent wrong icon — on confidence="none" the caller must set
          item["iconSvg"] instead of item["icon"] so render.php emits the raw SVG.
  Rule 1  Universal — handles any icon library or emoji glyph passed as an <svg>
          node; not limited to Lucide.

Usage (from convert.py trust-bar handler):

    from .icon_resolver import resolve_icon

    icon_node = badge_node.find("svg")  # may be None
    result    = resolve_icon(icon_node)

    if result["confidence"] in ("high", "medium"):
        item["icon"] = result["slug"]
    else:
        item["icon"] = ""        # leave slug empty — block editor shows empty slot
        if result["raw_svg"]:
            item["iconSvg"] = result["raw_svg"]

Author: SGS Framework / Claude Code

Moved here from ``orchestrator/converter_v2/icon_resolver.py`` in EXECUTION
Step 9 (Phase 3, 2026-07-04) — this IS the canonical implementation now; the
old path is a re-export shim.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import sys
import time
from datetime import datetime, timezone
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from collections.abc import Iterable

    from bs4 import Tag

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

_HERE = os.path.dirname(__file__)
# Traverse: converter/services -> converter -> scripts -> sgs-blocks -> assets/icons
# (same depth-from-scripts/ as the pre-move orchestrator/converter_v2/ location,
# so this ../../../ derivation is unchanged by the Phase-3 move).
_LUCIDE_JSON = os.path.normpath(
    os.path.join(_HERE, "..", "..", "..", "assets", "icons", "lucide-icons.json")
)
_WP_JSON = os.path.normpath(
    os.path.join(_HERE, "..", "..", "..", "assets", "icons", "wp-icons.json")
)
# Third source: the SGS library (generic pictograms promoted from drafts).
_SGS_JSON = os.path.normpath(
    os.path.join(_HERE, "..", "..", "..", "assets", "icons", "sgs-icons.json")
)
# Default proposals file: READ-ONLY unless SGS_ICON_PROPOSALS_LOG is set.
_PROPOSALS_DEFAULT = os.path.normpath(
    os.path.join(_HERE, "..", "..", "..", "assets", "icons", "icon-proposals.jsonl")
)
PROPOSALS_ENV = "SGS_ICON_PROPOSALS_LOG"
SLUG_RE = re.compile(r"^[a-z][a-z0-9-]*$")
SEEN_IN_CAP = 20

# ---------------------------------------------------------------------------
# Lazy reverse index (built once per process)
# ---------------------------------------------------------------------------

# _PATH_INDEX maps frozenset(normalised path strings) -> icon slug
_PATH_INDEX: dict[frozenset, str] | None = None


_PATH_COMMAND_RE = re.compile(r"([MmLlHhVvCcSsQqTtAaZz])")


def _normalise_d(d: str) -> str:
    """Normalise an SVG path `d` value for comparison: separators and whitespace ONLY, never case.

    Command letters are case-significant in SVG path data: upper case is ABSOLUTE and lower case is RELATIVE
    (``L-5-5`` draws to the point (-5,-5); ``l-5-5`` draws 5 left and 5 up from the current point). The old
    normaliser lower-cased the whole string, so a draft path that used an absolute command where a library
    icon uses the relative one collided with it and resolved to the wrong icon at ``high`` confidence, and
    two different proposals shared one fingerprint. Now a comma is a space, every command letter is set off
    by single spaces (``M20 6`` and ``M20,6`` and ``M 20 6`` all read alike) and runs of whitespace collapse;
    the letters keep their case. Existing proposals files fingerprinted by the old function must be
    re-fingerprinted (none exists in the repo: ``assets/icons/icon-proposals.jsonl`` is created on demand).
    """
    spaced = _PATH_COMMAND_RE.sub(r" \1 ", d.replace(",", " "))
    return re.sub(r"\s+", " ", spaced).strip()


def _extract_paths_from_svg_str(svg_str: str) -> list[str]:
    """Return all `d="…"` path data strings from an SVG markup string."""
    return re.findall(r'\s+d="([^"]+)"', svg_str)


_WARNED: set[str] = set()


def _warn_once(key: str, message: str) -> None:
    """Warn on stderr once per process per key — never raises, never crashes a run."""
    if key in _WARNED:
        return
    _WARNED.add(key)
    try:
        print(f"[icon_resolver] WARNING: {message}", file=sys.stderr)
    except Exception:  # pragma: no cover - stderr closed
        pass


def _read_json_dict(json_path: str) -> dict[str, str]:
    """Load a {name: svg} JSON file; a missing file is {}, a corrupt one warns once."""
    if not os.path.exists(json_path):
        return {}
    try:
        with open(json_path, "r", encoding="utf-8") as fh:
            data = json.load(fh)
        if not isinstance(data, dict):
            raise ValueError("top-level value is not an object")
        return {str(k): v for k, v in data.items() if isinstance(v, str)}
    except (OSError, ValueError) as exc:
        _warn_once("json:" + json_path, f"cannot read {json_path}: {exc}")
        return {}


def fingerprint_of_paths(paths: list[str]) -> str | None:
    """sha1 hex of the normalised, de-duplicated, sorted path-data set (None if no paths)."""
    norm = sorted({_normalise_d(p) for p in paths})
    if not norm:
        return None
    return hashlib.sha1("\n".join(norm).encode("utf-8")).hexdigest()


def fingerprint_of_svg(svg_str: str) -> str | None:
    """Fingerprint of an SVG markup string (see ``fingerprint_of_paths``)."""
    return fingerprint_of_paths(_extract_paths_from_svg_str(svg_str))


def reserved_names() -> frozenset[str]:
    """Lucide + WordPress icon names. Reserved: an SGS library slug may not equal one."""
    return frozenset(_read_json_dict(_LUCIDE_JSON)) | frozenset(_read_json_dict(_WP_JSON))


def known_icons() -> dict[str, dict[str, str]]:
    """Every icon the framework already has, by source: {"lucide"|"wp"|"sgs": {name: svg}}."""
    return {
        "lucide": _read_json_dict(_LUCIDE_JSON),
        "wp": _read_json_dict(_WP_JSON),
        "sgs": _read_json_dict(_SGS_JSON),
    }


def _build_index() -> dict[frozenset, str]:
    """
    Build (lazily, once) a reverse index from path-data fingerprint to icon name.

    Reads lucide-icons.json, wp-icons.json and sgs-icons.json (each if present).
    Each icon's SVG markup is parsed for `d="…"` attributes. The normalised
    frozenset of those strings becomes the key. On collision the first-encountered
    name wins (Lucide, then WordPress, then SGS; alphabetical within a source,
    since the JSON keys are sorted in the generated files). An SGS library slug
    that equals a Lucide/WordPress name (or is not a valid slug) is rejected with
    a warning, so the reserved namespace can never be shadowed.
    """
    index: dict[frozenset, str] = {}
    reserved = reserved_names()

    for json_path, is_sgs in ((_LUCIDE_JSON, False), (_WP_JSON, False), (_SGS_JSON, True)):
        icons = _read_json_dict(json_path)
        for name, svg_str in icons.items():
            if is_sgs and (name in reserved or not SLUG_RE.match(name)):
                _warn_once(
                    "sgs-slug:" + name,
                    f"SGS library slug {name!r} is reserved or invalid, ignored",
                )
                continue
            paths = _extract_paths_from_svg_str(svg_str)
            if not paths:
                continue
            key = frozenset(_normalise_d(p) for p in paths)
            if key not in index:
                index[key] = name

    return index


def _get_index() -> dict[frozenset, str]:
    global _PATH_INDEX
    if _PATH_INDEX is None:
        _PATH_INDEX = _build_index()
    return _PATH_INDEX


_FP_SET: frozenset[str] | None = None


def _library_fingerprints() -> frozenset[str]:
    """Fingerprints of every icon already in the framework set (cached with the index)."""
    global _FP_SET
    if _FP_SET is None:
        _FP_SET = frozenset(fingerprint_of_paths(list(k)) for k in _get_index()) - {None}
    return _FP_SET


def _reset_caches() -> None:
    """Drop every process-level cache (tests, and long-lived processes after a promote)."""
    global _PATH_INDEX, _FP_SET
    _PATH_INDEX = None
    _FP_SET = None
    _PROPOSAL_CACHE.clear()


# ---------------------------------------------------------------------------
# Proposals file (JSONL): read-only lookup + opt-in atomic recording
# ---------------------------------------------------------------------------

_PROPOSAL_CACHE: dict[str, tuple[tuple[int, int], dict[str, dict]]] = {}


def proposals_path() -> str:
    """The proposals file: ``$SGS_ICON_PROPOSALS_LOG`` if set, else the tracked default."""
    return os.environ.get(PROPOSALS_ENV, "").strip() or _PROPOSALS_DEFAULT


def read_proposal_rows(path: str) -> tuple[list[tuple[dict | None, str]], bool]:
    """
    Read a proposals file as [(row | None, raw_line)]. ``None`` marks a line that is
    not a valid proposal object; it is kept verbatim so a rewrite never destroys it.

    Returns (rows, ok). A missing file is ([], True). An unreadable file is ([], False)
    with a single stderr warning; a file with corrupt lines warns once and still
    returns the good rows.
    """
    if not os.path.exists(path):
        return [], True
    try:
        with open(path, "r", encoding="utf-8") as fh:
            lines = fh.read().splitlines()
    except (OSError, UnicodeDecodeError) as exc:
        _warn_once("prop-read:" + path, f"cannot read proposals file {path}: {exc}")
        return [], False
    rows: list[tuple[dict | None, str]] = []
    bad = 0
    for line in lines:
        if not line.strip():
            continue
        try:
            obj = json.loads(line)
            valid = isinstance(obj, dict) and isinstance(obj.get("fingerprint"), str)
        except ValueError:
            obj, valid = None, False
        if valid:
            rows.append((obj, line))
        else:
            bad += 1
            rows.append((None, line))
    if bad:
        _warn_once(
            "prop-corrupt:" + path,
            f"{bad} corrupt line(s) in proposals file {path}, ignored and preserved on rewrite",
        )
    return rows, True


def _load_proposals(path: str) -> dict[str, dict]:
    """fingerprint -> latest row. Cached on (mtime_ns, size); missing/corrupt degrades to {}."""
    try:
        st = os.stat(path)
        sig = (st.st_mtime_ns, st.st_size)
    except OSError:
        return {}
    hit = _PROPOSAL_CACHE.get(path)
    if hit and hit[0] == sig:
        return hit[1]
    rows, _ok = read_proposal_rows(path)
    table = {r["fingerprint"]: r for r, _raw in rows if r is not None}
    _PROPOSAL_CACHE[path] = (sig, table)
    return table


def _state_for(fingerprint: str | None) -> str:
    """pending | rejected | new for a fingerprint NOT in the library (read-only)."""
    if not fingerprint:
        return "new"
    row = _load_proposals(proposals_path()).get(fingerprint)
    if row is None:
        return "new"
    return "rejected" if row.get("status") == "rejected" else "pending"


class _FileLock:
    """Tiny cross-process lock (O_EXCL lock file) so parallel runs cannot lose an update."""

    def __init__(self, path: str, timeout: float = 5.0, stale: float = 30.0) -> None:
        self.path, self.timeout, self.stale = path + ".lock", timeout, stale

    def __enter__(self) -> "_FileLock":
        os.makedirs(os.path.dirname(os.path.abspath(self.path)), exist_ok=True)
        deadline = time.monotonic() + self.timeout
        while True:
            try:
                os.close(os.open(self.path, os.O_CREAT | os.O_EXCL | os.O_WRONLY))
                return self
            except FileExistsError:
                try:
                    if time.time() - os.path.getmtime(self.path) > self.stale:
                        os.remove(self.path)
                        continue
                except OSError:
                    pass
                if time.monotonic() > deadline:
                    raise TimeoutError(f"lock busy: {self.path}")
                time.sleep(0.05)

    def __exit__(self, *exc: object) -> None:
        try:
            os.remove(self.path)
        except OSError:
            pass


def write_rows_atomic(path: str, rows: list[tuple[dict | None, str]]) -> None:
    """Rewrite the JSONL via a temp file in the same directory + os.replace (atomic)."""
    directory = os.path.dirname(os.path.abspath(path))
    os.makedirs(directory, exist_ok=True)
    tmp = f"{path}.{os.getpid()}.tmp"
    with open(tmp, "w", encoding="utf-8", newline="\n") as fh:
        for obj, raw in rows:
            line = json.dumps(obj, ensure_ascii=False, sort_keys=True) if obj is not None else raw
            fh.write(line + "\n")
    os.replace(tmp, path)


def record_icon_proposal(result: dict, source_draft: str, run_label: str) -> dict:
    """
    Record an unmatched draft icon as a proposal. OPT-IN and NEVER raises.

    Writes only when ``SGS_ICON_PROPOSALS_LOG=<path>`` is set; unset writes nothing.
    ``result`` is the dict returned by ``resolve_icon`` (needs ``fingerprint`` and
    ``raw_svg``). The decision is made against the file as it is NOW (re-read under a
    lock), not against ``result["state"]`` alone:

      - fingerprint already in the library        -> no row             ("library")
      - fingerprint present with status rejected  -> no row, no change  ("rejected")
      - fingerprint present (pending / approved)  -> append run_label to seen_in
                                                     (capped, de-duplicated) and update
                                                     last_seen; NO second row ("seen").
                                                     Same label again: no write
                                                     ("already-recorded")
      - new fingerprint                           -> exactly one pending row ("added")

    Returns {"action": ..., "fingerprint": ..., "path": ...}. Other actions:
    "disabled" (env unset), "no-fingerprint" (no path data, or no raw SVG to propose), "unreadable"
    (proposals file cannot be read, left untouched), "error" (I/O failure, warned once).
    """
    path = os.environ.get(PROPOSALS_ENV, "").strip()
    fp = result.get("fingerprint") if isinstance(result, dict) else None
    out = {"action": "disabled", "fingerprint": fp, "path": path or None}
    if not path:
        return out
    if not fp:
        out["action"] = "no-fingerprint"
        return out
    try:
        if fp in _library_fingerprints():
            out["action"] = "library"
            return out
        if not result.get("raw_svg"):
            out["action"] = "no-fingerprint"  # nothing raw to propose
            return out
        now = datetime.now(timezone.utc).isoformat(timespec="seconds")
        with _FileLock(path):
            rows, ok = read_proposal_rows(path)
            if not ok:
                out["action"] = "unreadable"
                return out
            existing = None
            for obj, _raw in rows:
                if obj is not None and obj["fingerprint"] == fp:
                    existing = obj
            if existing is not None:
                if existing.get("status") == "rejected":
                    out["action"] = "rejected"
                    return out
                seen = [x for x in existing.get("seen_in", []) if isinstance(x, str)]
                if run_label in seen:
                    out["action"] = "already-recorded"
                    return out
                existing["seen_in"] = (seen + [run_label])[-SEEN_IN_CAP:]
                existing["last_seen"] = now
                out["action"] = "seen"
            else:
                new_row = {
                    "fingerprint": fp,
                    "status": "pending",
                    "first_seen": now,
                    "last_seen": now,
                    "seen_in": [run_label],
                    "source_draft": source_draft,
                    "raw_svg": result["raw_svg"],
                }
                rows.append((new_row, ""))
                out["action"] = "added"
            write_rows_atomic(path, rows)
        _PROPOSAL_CACHE.pop(path, None)
        return out
    except Exception as exc:  # never crash the pipeline over an advisory log
        _warn_once("prop-write:" + path, f"could not record icon proposal in {path}: {exc}")
        out["action"] = "error"
        return out


# ---------------------------------------------------------------------------
# Structural heuristics
# ---------------------------------------------------------------------------
# These cover icon shapes that cannot be matched via path-data because:
#   (a) they use non-path SVG elements (polygon, rect, circle combinations), or
#   (b) they originate from an older Lucide version whose path data differs.
#
# Each rule is a tuple of:
#   (predicate_fn, slug)
# where predicate_fn receives the raw SVG *string* and returns True/False.
#
# Ordered most-specific first so an early match stops evaluation.

def _has_polygon_star(svg_str: str) -> bool:
    """
    Classic 5-point star expressed as a filled polygon with stroke=none.
    Pattern: <polygon points="12 2 15.09 8.26 22 9.27 …" /> with fill active,
    stroke absent or 'none'. Used in older Lucide as 'star'.
    """
    if "<polygon" not in svg_str:
        return False
    # stroke should be none or absent (fill-only star)
    stroke_none = 'stroke="none"' in svg_str or "stroke='none'" in svg_str
    stroke_absent = "stroke=" not in svg_str
    fill_active = "fill=" in svg_str and "fill=\"none\"" not in svg_str and "fill='none'" not in svg_str
    return fill_active and (stroke_none or stroke_absent)


def is_filled_glyph(svg_str: str) -> bool:
    """True when an SVG paints a SOLID fill rather than being a stroke-only outline.

    The universal fill signal (Spec 31 §3.B.0 — styling follows the recognised
    element): a Lucide-style outline sets ``fill="none"`` on the <svg>; a filled
    glyph (e.g. a filled polygon star) carries an active ``fill`` (currentColor /
    a colour). Callers use this to set a block's per-icon ``fillStyle`` so a cloned
    solid icon renders filled, not forced to the uniform outline. Conservative:
    any ``fill="none"`` present returns False (won't over-claim filled).
    """
    if not svg_str:
        return False
    return (
        "fill=" in svg_str
        and 'fill="none"' not in svg_str
        and "fill='none'" not in svg_str
    )


def _is_vehicle_truck(svg_str: str) -> bool:
    """
    Old Lucide 'truck' fingerprint: a <rect> body + 1 small path for the cab
    section + exactly 2 <circle> elements (wheels). The rect is roughly the
    trailer (x≈1, y≈3, width≈15, height≈13 on a 24×24 grid).
    """
    has_rect = bool(re.search(r"<rect\b", svg_str))
    circle_count = len(re.findall(r"<circle\b", svg_str))
    path_count = len(re.findall(r"<path\b", svg_str))
    # Exactly 1 cab path + 2 wheel circles + 1 rect trailer body
    return has_rect and circle_count == 2 and path_count == 1


def _is_old_home(svg_str: str) -> bool:
    """
    Old Lucide 'home' fingerprint (pre-redesign): exactly 2 path elements,
    one of which begins with a diagonal roof stroke 'm3 12' or 'M3 12'
    (the classic peaked roof glyph, distinct from the current house/home redesign).
    """
    paths = _extract_paths_from_svg_str(svg_str)
    if len(paths) != 2:
        return False
    for p in paths:
        # Classic peaked-roof path: starts with 'm3 12 9-9 9 9'. A path's FIRST moveto is absolute
        # whichever case it is written in, so 'M3 12' and 'm3 12' are the same start here.
        if re.match(r"[Mm] 3 12(?: |$)", _normalise_d(p)):
            return True
    return False


# Ordered heuristics: (predicate, slug)
#
# Note: _has_polygon_star is intentionally NOT listed here.
# A filled-polygon star (fill=currentColor, stroke=none) cannot be faithfully
# represented by the "star" slug — that Lucide entry is a path-based outline
# (fill="none", stroke="currentColor"), a geometrically different shape.
# Mapping the polygon star to "star" renders a hollow outline instead of a
# filled polygon. Instead, polygon stars fall through to Stage 3 so their
# raw SVG is preserved verbatim via item["iconSvg"] (confidence="none").
# Stroked stars in the draft still resolve via Stage 1 path-fingerprint → "star"
# (high confidence), which is unaffected by this change.
_STRUCTURAL_HINTS: list[tuple] = [
    (_is_vehicle_truck, "truck"),
    (_is_old_home, "home"),
]


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def resolve_icon(
    icon_node: "Tag | None",
    *,
    min_path_count: int = 1,
) -> dict:
    """
    Resolve a BeautifulSoup <svg> tag (or its parent span) to an icon identity.

    Parameters
    ----------
    icon_node:
        A BeautifulSoup element. May be the <svg> itself, a <span> wrapping
        the SVG, or None (when no icon was found in the badge).
    min_path_count:
        Minimum number of path-d values required to attempt path matching.
        Default 1 — even a single-path icon can be matched.

    Returns
    -------
    dict with keys:
        slug         str | None
        confidence   "high" | "medium" | "none"
        raw_svg      str | None   (set only when confidence == "none")
        state        "library" | "pending" | "rejected" | "new"
        fingerprint  str | None   (sha1 of the normalised sorted path set; None
                                   when the SVG has no path data or no SVG was found)

    A pure lookup: reads the proposals file read-only, writes nothing.
    ``state`` is "library" for any slug match (high or medium), otherwise the
    proposals-file status of the fingerprint ("new" when unseen or unfingerprintable).
    """
    _none = {
        "slug": None,
        "confidence": "none",
        "raw_svg": None,
        "state": "new",
        "fingerprint": None,
    }

    if icon_node is None:
        return _none

    # Find the <svg> element regardless of whether we were passed the span or svg.
    if icon_node.name == "svg":
        svg_el = icon_node
    else:
        svg_el = icon_node.find("svg")

    if svg_el is None:
        return _none

    svg_str: str = str(svg_el)

    # ------------------------------------------------------------------
    # Stage 1: exact path-data fingerprint match (high confidence)
    # ------------------------------------------------------------------
    paths = _extract_paths_from_svg_str(svg_str)
    fingerprint = fingerprint_of_paths(paths)
    if len(paths) >= min_path_count:
        key = frozenset(_normalise_d(p) for p in paths)
        idx = _get_index()
        if key in idx:
            return {
                "slug": idx[key],
                "confidence": "high",
                "raw_svg": None,
                "state": "library",
                "fingerprint": fingerprint,
            }

    # ------------------------------------------------------------------
    # Stage 2: structural heuristics (medium confidence)
    # ------------------------------------------------------------------
    for predicate, slug in _STRUCTURAL_HINTS:
        if predicate(svg_str):
            return {
                "slug": slug,
                "confidence": "medium",
                "raw_svg": None,
                "state": "library",
                "fingerprint": fingerprint,
            }

    # ------------------------------------------------------------------
    # Stage 3: fallback — emit raw SVG for verbatim render
    # ------------------------------------------------------------------
    # Strip the outer <svg> wrapper's class, width, height, style attrs
    # (the block's CSS handles sizing); keep viewBox, fill, stroke, paths.
    raw = _strip_svg_wrapper_attrs(svg_str)
    return {
        "slug": None,
        "confidence": "none",
        "raw_svg": raw,
        "state": _state_for(fingerprint),
        "fingerprint": fingerprint,
    }


# ---------------------------------------------------------------------------
# SVG strip helper
# ---------------------------------------------------------------------------

# Attributes to strip from the outer <svg> tag before storing raw markup.
# The block renders these via CSS; keeping them would conflict. ``id`` (an id repeated across every item of
# a row is a duplicate id in the page) and every ``data-*`` attribute are draft wiring, never icon shape.
_STRIP_ATTRS = frozenset({"class", "width", "height", "style", "id", "xmlns", "xmlns:xlink"})
_DATA_ATTR_RE = re.compile(r"""\s+data-[\w:.-]+\s*=\s*(?:"[^"]*"|'[^']*')""")
_CLASS_ATTR_RE = re.compile(r"""\s+class\s*=\s*(?:"([^"]*)"|'([^']*)')""")
_DRAFT_CLASS_PREFIX = "sgs-"


# The presentation attributes the strip removes or leaves inert, and which the icon lift routes to block
# attributes instead of discarding: the glyph's drawn size, its stroke width and its stroke colour. ``width`` /
# ``height`` are stripped from the stored markup (the block's CSS sizes the icon); ``stroke`` / ``stroke-width``
# stay in the markup but the block's stylesheet overrides them, so only the block attributes ever take effect.
SVG_PRESENTATION_ATTRS = ("width", "height", "stroke", "stroke-width")
_ATTR_PAIR_RE = re.compile(r"""\s([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')""")


def _svg_presentation_of_open_tag(open_tag: str) -> dict[str, str]:
    """The ``SVG_PRESENTATION_ATTRS`` present on an ``<svg ...>`` opening tag, name lower-cased, value trimmed.
    An attribute that is absent is absent from the result: no default is ever invented."""
    found: dict[str, str] = {}
    for m in _ATTR_PAIR_RE.finditer(open_tag):
        name = m.group(1).lower()
        if name in SVG_PRESENTATION_ATTRS and name not in found:
            value = (m.group(2) if m.group(2) is not None else m.group(3) or "").strip()
            if value:
                found[name] = value
    return found


def strip_svg_wrapper_attrs_with_presentation(svg_str: str) -> tuple[str, dict[str, str]]:
    """Strip the wrapper attributes (see ``_strip_svg_wrapper_attrs``) AND return the presentation attributes
    (``SVG_PRESENTATION_ATTRS``) the outer ``<svg>`` carried, read BEFORE the strip. The caller routes them to
    block attributes through the DB; nothing here decides where they go. ``(stripped, {})`` for an svg with
    none; the original string and ``{}`` on a parse error."""
    try:
        # Use a simple regex approach — avoids requiring lxml in the converter env.
        def _remove_attr(m: "re.Match") -> str:
            full = m.group(0)
            # Strip each unwanted attr="…" or attr='…' occurrence
            for attr in _STRIP_ATTRS:
                full = re.sub(
                    r'\s+' + re.escape(attr) + r'\s*=\s*(?:"[^"]*"|\'[^\']*\')',
                    "",
                    full,
                )
            return _DATA_ATTR_RE.sub("", full)

        def _drop_draft_classes(m: "re.Match") -> str:
            tokens = (m.group(1) if m.group(1) is not None else m.group(2)).split()
            kept = [t for t in tokens if not t.startswith(_DRAFT_CLASS_PREFIX)]
            return f' class="{" ".join(kept)}"' if kept else ""

        open_match = re.search(r"<svg\b[^>]*>", svg_str)
        presentation = _svg_presentation_of_open_tag(open_match.group(0)) if open_match else {}
        # Replace only the opening <svg …> tag (not child elements), then drop draft BEM classes below it.
        cleaned = re.sub(r"<svg\b[^>]*>", _remove_attr, svg_str, count=1)
        head_end = cleaned.find(">") + 1
        cleaned = cleaned[:head_end] + _CLASS_ATTR_RE.sub(_drop_draft_classes, cleaned[head_end:])
        return cleaned.strip(), presentation
    except Exception:
        return svg_str.strip(), {}


# Which attributes of an item's own outer ``<svg>`` a lifted presentation kind (``route_svg_presentation``'s
# kinds) makes dead: once the block attribute carries the value the block's stylesheet paints it, and the
# stored markup's copy (a draft custom property such as ``var(--acc,#9C8B78)`` that has no definition on the
# clone) does nothing. The size kind is absent: width / height are already stripped from the stored markup.
SVG_LIFTED_KIND_TO_ATTRS = {"stroke-width": ("stroke-width",), "colour": ("stroke",)}


def strip_svg_open_tag_attrs(svg_str: str, names: "Iterable[str]") -> str:
    """``svg_str`` without the named attributes on its OUTER ``<svg ...>`` opening tag. Child elements, every
    other attribute (``viewBox``, ``fill``, ``stroke-linecap``, ...) and an absent attribute are untouched."""
    wanted = tuple(names)
    if not wanted:
        return svg_str

    def _drop(m: "re.Match") -> str:
        tag = m.group(0)
        for attr in wanted:
            tag = re.sub(r"""\s+""" + re.escape(attr) + r"""\s*=\s*(?:"[^"]*"|'[^']*')""", "", tag)
        return tag

    return re.sub(r"<svg\b[^>]*>", _drop, svg_str, count=1)


def _strip_svg_wrapper_attrs(svg_str: str) -> str:
    """
    Remove the wrapper attributes we don't want stored: class/width/height/style/id and every ``data-*``
    on the outer <svg> tag, plus any draft BEM class (an ``sgs-`` token) on a child element, since a draft
    class copied into a block is a mirror of the draft's DOM (R-31-15). Keeps viewBox, fill, stroke, and
    every child element and its drawing attributes intact. Falls back to the original string on parse error.
    The presentation attributes it drops (width / height) are NOT lost to the icon lift: the item lift reads
    them through ``strip_svg_wrapper_attrs_with_presentation`` and routes them to block attributes.
    """
    return strip_svg_wrapper_attrs_with_presentation(svg_str)[0]


# ---------------------------------------------------------------------------
# Item-icon presentation -> block attributes (Spec 31 section 3.A step 6, R-31-1 / R-31-9)
# ---------------------------------------------------------------------------

_LENGTH_RE = re.compile(r"^([0-9]*[.]?[0-9]+)(?:px)?$")
_VAR_FN_RE = re.compile(r"^var\(\s*--([A-Za-z0-9_-]+)\s*(?:,(.*))?\)$", re.DOTALL)
# A stroke value that names no colour of its own: it inherits, so there is nothing to lift and nothing to report.
_NO_OWN_COLOUR = frozenset({"none", "currentcolor", "inherit", "transparent"})


def _plain_number(value: float) -> "int | float":
    return int(value) if float(value).is_integer() else value


def _length_px(raw: str) -> "float | None":
    """A bare number or a ``px`` length as a float; ``None`` for any other unit (em, %, ...)."""
    m = _LENGTH_RE.match(raw.strip())
    return float(m.group(1)) if m else None


def _svg_stroke_colour(raw: str) -> "str | None":
    """A stroke value as the pipeline's ONE colour normaliser reads it (``extract_token_or_hex``: a theme
    palette slug, or a concrete hex / rgb() literal). ``var(--name, fallback)``: the custom property is tried
    first, so a draft ``:root`` colour or a palette slug snaps exactly as in the CSS lift; when it names
    neither, the fallback inside the ``var()`` is the colour. ``None`` when nothing resolves."""
    from converter.services.styling_helpers import extract_token_or_hex

    value = raw.strip()
    m = _VAR_FN_RE.match(value)
    if m is None:
        return extract_token_or_hex(value)
    resolved = extract_token_or_hex("var(--" + m.group(1) + ")")
    if resolved is None and m.group(2) and m.group(2).strip():
        resolved = extract_token_or_hex(m.group(2).strip())
    return resolved


def route_svg_presentation(
    per_item: "list[dict[str, str]]",
    destinations: "dict[str, tuple[str, ...]]",
    attr_types: "dict[str, str | None]",
) -> "tuple[dict[str, object], list[tuple[str, str]]]":
    """Route the ``<svg>`` presentation of a block's items to block-level attributes.

    ``per_item`` holds one dict per item that HAS an icon svg (``strip_svg_wrapper_attrs_with_presentation``'s
    second value). ``destinations`` is ``db_lookup.svg_glyph_destinations`` (kind -> attribute names, looked
    up by declared css_property and element, never by name). ``attr_types`` maps a destination attribute to its
    declared ``attr_type``. Returns ``(attrs, gaps)``: ``attrs`` the values to write, ``gaps`` a
    ``(kind, reason)`` per value the svgs carried and nothing could take.

    A value is written only when EVERY item's svg gives the same one and the block declares exactly one
    destination for it; anything else writes nothing and is reported. A missing attribute is never filled
    with a default.
    """
    attrs: dict = {}
    gaps: list = []
    if not per_item:
        return attrs, gaps

    def _resolve_kind(kind: str, values: list, wanted: "type", note_after: "str | None" = None) -> None:
        distinct = set(values)
        if distinct == {None}:
            return  # no item's svg carried this value: nothing to lift, nothing to report
        if len(distinct) > 1:
            gaps.append((kind, "icons differ: the items' svgs give different values, so no block-level value is written"))
            return
        value = values[0]
        names = destinations.get(kind, ())
        if not names:
            gaps.append((kind, "the block declares no attribute for this icon value"))
            return
        if len(names) > 1:
            gaps.append((kind, "ambiguous destination: the block declares several attributes for this icon value ("
                         + ", ".join(names) + ")"))
            return
        name = names[0]
        declared = attr_types.get(name)
        written = (declared == "number" and wanted in (int, float)) or (declared == "string" and wanted is str)
        if written:
            attrs[name] = value
            if note_after:
                # A note about HOW the value was read (the width taken from a non-square icon) describes a value
                # that was written; when nothing took it the reason above already says so, so the note would be
                # a second gap row for one loss.
                gaps.append((kind, note_after))
        else:
            gaps.append((kind, "destination " + name + " has type " + str(declared) + ", not the type this value needs"))

    # size: a square glyph size in px; width and height that differ take the width and are reported.
    sizes: list = []
    non_square = False
    for pres in per_item:
        w = _length_px(pres["width"]) if "width" in pres else None
        h = _length_px(pres["height"]) if "height" in pres else None
        if ("width" in pres and w is None) or ("height" in pres and h is None):
            gaps.append(("size", "an svg size is not a px length (" + ", ".join(
                k + "=" + pres[k] for k in ("width", "height") if k in pres) + "), so no size is lifted"))
            sizes.append(None)
            continue
        if w is not None and h is not None and w != h:
            non_square = True
        chosen = w if w is not None else h
        sizes.append(_plain_number(chosen) if chosen is not None else None)
    _resolve_kind("size", sizes, float, "non-square icon: width and height differ, the width is used" if non_square else None)

    widths: list = []
    for pres in per_item:
        raw = pres.get("stroke-width")
        n = _length_px(raw) if raw is not None else None
        if raw is not None and n is None:
            gaps.append(("stroke-width", "stroke-width " + raw + " is not a number, so it is not lifted"))
        widths.append(_plain_number(n) if n is not None else None)
    _resolve_kind("stroke-width", widths, float)

    colours: list = []
    for pres in per_item:
        raw = pres.get("stroke")
        if raw is None or raw.strip().lower() in _NO_OWN_COLOUR:
            colours.append(None)
            continue
        colour = _svg_stroke_colour(raw)
        if colour is None:
            gaps.append(("colour", "stroke " + raw + " resolves to no colour, so it is not lifted"))
        colours.append(colour)
    _resolve_kind("colour", colours, str)
    return attrs, gaps


# ---------------------------------------------------------------------------
# CLI smoke-test (python icon_resolver.py)
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")

    try:
        from bs4 import BeautifulSoup
    except ImportError:
        print("BeautifulSoup4 not available — run: pip install beautifulsoup4")
        sys.exit(1)

    # The four actual draft badge SVGs from sites/mamas-munches/mockups/homepage/index.html
    draft_badges = [
        # Badge 1: home-like (old Lucide home, 2 paths, peaked-roof style)
        (
            '<svg viewBox="0 0 24 24"><path d="m3 12 9-9 9 9"/>'
            '<path d="M5 10v10a1 1 0 0 0 1 1h3v-6h6v6h3a1 1 0 0 0 1-1V10"/></svg>',
            "Handmade in Birmingham",
        ),
        # Badge 2: check (exact Lucide match)
        (
            '<svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>',
            "Registered Food Business",
        ),
        # Badge 3: truck (old Lucide truck — rect + path + 2 circles)
        (
            '<svg viewBox="0 0 24 24">'
            '<rect x="1" y="3" width="15" height="13"/>'
            '<path d="m16 8 5 2v5h-5z"/>'
            '<circle cx="5.5" cy="18.5" r="2.5"/>'
            '<circle cx="18.5" cy="18.5" r="2.5"/>'
            "</svg>",
            "Free UK Delivery Over £35",
        ),
        # Badge 4: star (polygon, fill=currentColor, stroke=none)
        (
            '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none" '
            'style="fill: var(--primary-dark);">'
            '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 '
            "12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2\"/>"
            "</svg>",
            "Loved by Breastfeeding Mums",
        ),
    ]

    print("=== Icon Resolver — Smoke Test (draft badges) ===\n")
    for i, (svg_markup, label) in enumerate(draft_badges, 1):
        soup = BeautifulSoup(svg_markup, "html.parser")
        svg_node = soup.find("svg")
        result = resolve_icon(svg_node)
        slug = result["slug"] or "(none)"
        conf = result["confidence"]
        raw = "(set)" if result["raw_svg"] else "(not set)"
        print(
            f"Badge {i}: '{label}'\n"
            f"  slug={slug!r}  confidence={conf}  raw_svg={raw}"
        )
        if result["confidence"] == "none":
            print(f"  raw_svg preview: {result['raw_svg'][:80]}...")
        print()
