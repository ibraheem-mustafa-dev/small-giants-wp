#!/usr/bin/env python3
"""oracle.run_canary_proof — F3-core-B: the live-canary LANDED proof (separate named command).

Spec ref: .claude/plans/2026-06-18-f3-render-oracle-design.md §7.1 + §7.7

This is the F3-core "separate named command" that runs the verdict engine on ONE
real fixture cloned + rendered on the canary. It reads a probe JSON (real
getComputedStyle readings captured from the rendered SGS block — pair by block
slug, NEVER the draft BEM class) and emits the frozen §6 `.landed.json` contract.

The probe JSON is the OUTPUT of the live Playwright getComputedStyle capture
(F3-core-B). Automating that capture loop across many fixtures (cache, deploy
orchestration, browser-reuse) is DEFERRED to F3-runtime (§5); for F3-core the
probe of one fixture is recorded into the probe JSON and replayed here so the
verdict ENGINE is proven end-to-end on real computed-style.

Probe JSON shape:
  {fixture, page_url, page_loaded, sections:[{section_id, block_slug,
    element_selector, element_present, inner_text_len, rendered_height_px,
    draft_height_px, cells:[{property, tier, draft_value, computed_value,
    expected_default, written}]}]}

Usage:
  python run_canary_proof.py --probe <probe.json> [--out-dir <_render-oracle/>]
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

try:
    from .models import CellInput, RenderedObservation
    from .verdict import compute_report
except ImportError:
    sys.path.insert(0, str(Path(__file__).parent.parent))
    from oracle.models import CellInput, RenderedObservation  # type: ignore[no-redef]
    from oracle.verdict import compute_report  # type: ignore[no-redef]


class ProbeError(ValueError):
    """Raised (fail-closed) when the probe JSON is missing a required field."""


def _require(obj: dict, key: str, where: str):
    """Fetch a required probe-JSON field or raise a clear ProbeError."""
    if key not in obj:
        raise ProbeError(f"probe JSON missing required field {key!r} in {where}")
    return obj[key]


def _build_observations(probe: dict) -> list[RenderedObservation]:
    """Build RenderedObservation objects from the probe JSON.

    Fail-closed (ProbeError) on any missing required field — a malformed probe
    must not silently produce a partial/empty report that could read as a pass.
    """
    page_loaded = bool(probe.get("page_loaded", True))
    sections = _require(probe, "sections", "probe root")
    observations: list[RenderedObservation] = []
    for i, sec in enumerate(sections):
        where = f"sections[{i}]"
        cells = [
            CellInput(
                property=_require(c, "property", f"{where}.cells[{j}]"),
                tier=_require(c, "tier", f"{where}.cells[{j}]"),
                draft_value=_require(c, "draft_value", f"{where}.cells[{j}]"),
                computed_value=c.get("computed_value"),
                expected_default=c.get("expected_default"),
                written=bool(c.get("written", True)),
            )
            for j, c in enumerate(_require(sec, "cells", where))
        ]
        observations.append(RenderedObservation(
            section_id=_require(sec, "section_id", where),
            block_slug=_require(sec, "block_slug", where),
            element_selector=_require(sec, "element_selector", where),
            element_present=bool(_require(sec, "element_present", where)),
            inner_text_len=int(_require(sec, "inner_text_len", where)),
            rendered_height_px=sec.get("rendered_height_px"),
            draft_height_px=sec.get("draft_height_px"),
            cells=cells,
            page_loaded=page_loaded,
        ))
    return observations


def _auto_out_dir() -> Path:
    here = Path(__file__).parent
    return here.parent / "tests" / "fixtures" / "phase-f" / "_render-oracle"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="F3-core-B live-canary LANDED proof")
    parser.add_argument("--probe", type=Path, required=True, help="Probe JSON from the live getComputedStyle capture")
    parser.add_argument("--out-dir", type=Path, default=None, help="_render-oracle/ output directory")
    args = parser.parse_args(argv)

    if not args.probe.exists():
        print(f"ERROR: probe JSON not found: {args.probe}", file=sys.stderr)
        return 1

    probe = json.loads(args.probe.read_text(encoding="utf-8"))
    try:
        fixture = _require(probe, "fixture", "probe root")
        observations = _build_observations(probe)
    except ProbeError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1

    report = compute_report(fixture, observations)

    out_dir = args.out_dir or _auto_out_dir()
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"{fixture}.landed.json"
    artefact = report.as_dict()
    artefact["page_url"] = probe.get("page_url")  # provenance (not part of the §6 join schema)
    out_path.write_text(json.dumps(artefact, indent=2, ensure_ascii=False), encoding="utf-8")

    # Console report.
    print(f"\n=== F3-core LANDED proof — {fixture} ===")
    print(f"  page: {probe.get('page_url')}")
    for sec in report.sections:
        print(f"\n  section {sec.section_id!r} ({sec.block_slug}) selector={sec.element_selector}")
        g = sec.guards
        print(f"    guards: empty={g.empty} element={g.element} height={g.height} non_default={g.non_default}")
        for c in sec.cells:
            print(f"    [{c.verdict.value:18s}] {c.property:24s} [{c.tier}]  "
                  f"draft={c.draft_value!r}  computed={c.computed_value!r}  default={c.expected_default!r}")
    print(f"\n  PLAIN: {report.plain_summary}")
    print(f"\n  wrote {out_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
