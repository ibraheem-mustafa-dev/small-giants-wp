"""coverage_report.py — the Bean-visible sign-off grid (design §5).

Every (block, layer, property) row → the resolver it routed to → a colour status.
Bean signs off by reading the grid: "every row lands somewhere, no red, no silent drop."

LEGEND (design §10 A1 — the honesty rule):
  ✅ RESOLVED      a real Write (transferred to a native attr). The ONLY faithful row.
  🟡 STUB          UNIMPLEMENTED_STUB — resolver not built yet (NOT-yet-faithful).
  🟡 GAP-add-attr  NO_DESTINATION — real gap, the block needs a new attr (NOT faithful).
  ⬜ EXCLUDED      F4 intentional non-lift (still cloned via passthrough).
  🔴 UNROUTED      suspected routing bug — MUST be zero.
  🔴 UNRECOGNISED  Stage-2: a BEM section resolved to no registered block — MUST be zero
                   (a loud RED row, never a silent empty sgs/container; Spec 31 §12.7).

STUB / GAP rows are NOT-yet-faithful — only the RESOLVED (and live-LANDED) count
measures progress. Conservation being 100% green means "no leaks", NOT "faithful".

CLI (run from plugins/sgs-blocks/scripts):
    python converter/coverage_report.py --check <fixtures-dir>   # exit 1 on UNRECOGNISED
A fixture whose filename contains 'bogus' or 'unrecognised' is an INTENTIONAL
loud-fail case (baselined — it SHOULD be UNRECOGNISED, design §9-fold-J); any OTHER
fixture that recognises to UNRECOGNISED fails the gate.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import Any

# Bootstrap: when run as a script (`python converter/coverage_report.py`), the script's
# own dir is on sys.path, not scripts/. Put scripts/ on the path so `converter.*` imports
# resolve. No-op when imported as a module / run via `python -m converter.coverage_report`.
if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from converter.models import GAP, GapOrigin

_STATUS = {
    GapOrigin.UNIMPLEMENTED_STUB: ("🟡", "STUB"),
    GapOrigin.NO_DESTINATION: ("🟡", "GAP-add-attr"),
    GapOrigin.EXCLUDED: ("⬜", "EXCLUDED"),
    GapOrigin.UNROUTED: ("🔴", "UNROUTED"),
    GapOrigin.UNRECOGNISED: ("🔴", "UNRECOGNISED"),
}


def _rows(result: Any) -> list[tuple[str, str, str, str, str]]:
    """(layer, property, resolver/status, value, status-label) per declaration."""
    rows = []
    for w in result.writes:
        rows.append((result.block_slug, w.property, "outer_box→" + w.attr, w.value, "✅ RESOLVED"))
    for g in result.gaps:
        icon, label = _STATUS[g.origin]
        rows.append((result.block_slug, g.property, g.detail[:48], "", f"{icon} {label}"))
    return rows


def render_markdown(results: list[Any], fixture_name: str) -> str:
    lines = [
        f"# Coverage report — `{fixture_name}`",
        "",
        "| Block | Property | Resolver / detail | Value | Status |",
        "|-------|----------|-------------------|-------|--------|",
    ]
    landed = total = 0
    for result in results:
        for block, prop, detail, value, status in _rows(result):
            lines.append(f"| `{block}` | `{prop}` | {detail} | {value} | {status} |")
            total += 1
            if status.startswith("✅"):
                landed += 1
    lines += [
        "",
        f"**{landed}/{total} RESOLVED** (the only faithful rows — §10 A1). "
        f"STUB/GAP rows are NOT-yet-faithful; conservation-green ≠ faithful.",
        "",
        "_Symptom→file: section width/spacing/background → `outer_box.py` · inner band → "
        "`content_band.py` · columns/gaps → `grid.py` · fonts → `typography.py` · "
        "quote/name/stars → `scalar_content.py` · images → `scalar_media.py`._",
    ]
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Stage-2 recognition grid + the --check gate (design §5 / §9-fold-H/K)
# ---------------------------------------------------------------------------

def recognition_row(label: str, rec: Any) -> str:
    """One Bean-visible recognition row: what a draft section was recognised as.

    A 'named'/'atomic'/'scalar' Recognition -> ✅ with the block + variant; an
    'unrecognised' one -> 🔴 UNRECOGNISED (the loud RED, never a silent container).
    """
    if rec.kind == "unrecognised":
        return f"| `{label}` | 🔴 UNRECOGNISED | — | (block type not in the DB — flag to the developer) |"
    variant = f" · variant=`{rec.variant_value}`" if rec.variant_value else ""
    return f"| `{label}` | ✅ {rec.kind} | `{rec.slug}`{variant} | container_kind=`{rec.container_kind}` delegates_content=`{rec.delegates_content}` |"


def _is_baseline_fixture(path: Path) -> bool:
    """A fixture intentionally meant to be UNRECOGNISED (the tested loud-fail case)."""
    n = path.name.lower()
    return "bogus" in n or "unrecognised" in n or "unrecognized" in n


def _recognise_dir(fixtures_dir: Path) -> list[tuple[str, str, Any]]:
    """Recognise every BEM-root-classed element in each .html fixture.

    Returns [(fixture_name, element_label, Recognition)]. Imported lazily so the
    render library has no hard bs4 / recognition dependency.
    """
    from bs4 import BeautifulSoup  # noqa: PLC0415
    from converter.recognition import recognise  # noqa: PLC0415

    out: list[tuple[str, str, Any]] = []
    for html in sorted(fixtures_dir.rglob("*.html")):
        soup = BeautifulSoup(html.read_text(encoding="utf-8", errors="replace"), "html.parser")
        for tag in soup.find_all(True):
            classes = tag.get("class", []) or []
            roots = [c for c in classes if c.startswith("sgs-") and "__" not in c and "--" not in c]
            if not roots:
                continue
            out.append((html.name, roots[0], recognise(tag)))
    return out


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Stage-2 recognition coverage gate.")
    parser.add_argument("--check", metavar="FIXTURES_DIR",
                        help="Recognise every fixture; exit 1 on an UNRECOGNISED that is "
                             "not an intentional-bogus baseline fixture.")
    args = parser.parse_args(argv)

    if not args.check:
        parser.print_help()
        return 0

    fixtures_dir = Path(args.check)
    if not fixtures_dir.exists():
        print(f"[coverage] fixtures dir not found: {fixtures_dir}", file=sys.stderr)
        return 1

    results = _recognise_dir(fixtures_dir)
    offenders = [
        (f, label) for (f, label, rec) in results
        if rec.kind == "unrecognised" and not _is_baseline_fixture(Path(f))
    ]
    if offenders:
        print(f"[coverage] {len(offenders)} UNRECOGNISED section(s) (not baselined):")
        for f, label in offenders:
            print(f"  🔴 {f} — .{label} resolved to NO registered block. "
                  "Recognition must hard-fail loud, never emit an empty sgs/container.")
        return 1
    n_bogus = sum(1 for (f, _l, rec) in results
                  if rec.kind == "unrecognised" and _is_baseline_fixture(Path(f)))
    print(f"[coverage] OK — {len(results)} recognised, 0 unexpected UNRECOGNISED "
          f"({n_bogus} intentional-bogus baselined).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
