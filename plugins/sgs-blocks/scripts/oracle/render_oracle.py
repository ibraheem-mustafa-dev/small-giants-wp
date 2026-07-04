#!/usr/bin/env python3
"""oracle.render_oracle — F3 render-oracle: the live Playwright capture leg.

EXECUTION Step 15 sub-task 2 (Phase 5). Wires the Playwright probe that
``oracle/capture.py::probe_rendered_observation`` documents as a STUB
(F3-core-B, "orchestrator wires the live Playwright implementation"). This
module IS that wiring — it renders BOTH the DRAFT html file and the LIVE
clone URL at each device tier and reports a per-section, per-tier
LANDED/GUARD-FAIL/UNVERIFIED verdict using the EXISTING verdict engine
(``oracle.verdict.compute_report`` / ``oracle.models`` / ``oracle.guards``),
reused rather than duplicated (R-31-9).

Scope (deliberately narrow — task spec): innerText-presence (guard 1) +
element-count/selector-presence (guard 2) + height-parity (guard 4) per
section. NO per-property computed-style cells are captured here (that is
the fuller F3-core-B contract in ``capture.py`` / F5's job) — every section
observation is built with ``cells=[]``; ``compute_report`` already handles
that via its FIX-C synthetic-cell path, so every section still contributes
one coherent verdict without a hand-rolled report shape.

THIS IS A DIAGNOSTIC HARNESS (R-31-4) — its aggregate verdicts are a
per-commit signal, never the LANDED closing gate. The closing gate remains
computed-style-vs-draft + Bean's eye (R-31-13).

Section discovery (draft side): every top-level BEM root class
(``sgs-<x>`` with no ``__`` element token and no ``--`` modifier) that
resolves to a REGISTERED block via ``db_lookup.block_exists`` — the exact
same signal ``converter.recognition.recognise`` branch 1 uses (R-31-2, BEM is
the only recognition signal). Pairing to the live clone is by BLOCK SLUG →
``.wp-block-sgs-<slug>`` (``oracle.capture._default_element_selector``),
NEVER by draft BEM class (parity-bem-class-blind-spot, blub.db 2026-06-11).

Usage
-----
    python oracle/render_oracle.py --draft <path/to/draft.html> --live-url <URL>
        [--viewports 375,768,1440] [--out <path.json>]

    # Self-test mode (no live site available): render the SAME file as both
    # sides, proving the harness mechanics without a deployed clone.
    python oracle/render_oracle.py --draft <path/to/draft.html> --self-test

Requires: Playwright for Python (``pip install playwright && playwright install chromium``).
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

_HERE = Path(__file__).resolve().parent
_SCRIPTS_DIR = _HERE.parent

if str(_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_DIR))

from oracle.capture import _default_element_selector  # noqa: E402
from oracle.models import RenderedObservation  # noqa: E402
from oracle.verdict import compute_report  # noqa: E402

from converter.db import db_lookup  # noqa: E402


# ---------------------------------------------------------------------------
# Section discovery (draft side) — pure, no Playwright.
# ---------------------------------------------------------------------------

_ROOT_CLASS_RE = re.compile(r"^sgs-[a-z0-9-]+$")


def discover_sections(draft_html: str) -> list[dict]:
    """Find every top-level registered BEM-root section in the draft HTML.

    Mirrors ``converter.recognition._root_classes`` + branch-1 candidate
    filtering (R-31-2 — BEM is the only recognition signal): a class is a
    root candidate when it starts with ``sgs-``, carries no ``__`` element
    token and no ``--`` modifier, AND ``sgs/<name>`` is a registered block.

    Only TOP-LEVEL sections are returned (a root candidate nested inside
    another root candidate is skipped) — nested composites are each block's
    own concern, not a section-oracle concern.

    Returns one dict per section:
      {section_id, block_slug, draft_selector, native_selector}
    """
    from bs4 import BeautifulSoup

    soup = BeautifulSoup(draft_html, "html.parser")
    sections: list[dict] = []
    seen_nodes: list[Any] = []

    for node in soup.find_all(True):
        # Skip if this node is nested inside an already-picked section.
        if any(node in parent.descendants for parent in seen_nodes):
            continue

        classes = node.get("class") or []
        root_classes = [
            c for c in classes
            if c.startswith("sgs-") and "__" not in c and "--" not in c
        ]
        candidates = [
            "sgs/" + c[len("sgs-"):] for c in root_classes
            if db_lookup.block_exists("sgs/" + c[len("sgs-"):])
        ]
        if not candidates:
            continue
        # Ambiguous multi-root ties are a recognition concern, not this
        # harness's — pick the first candidate deterministically and note it.
        slug = candidates[0]
        draft_root_class = next(
            c for c in root_classes if c == "sgs-" + slug.split("/")[-1]
        )
        section_id = node.get("id") or f"section-{len(sections) + 1}-{slug.split('/')[-1]}"
        sections.append({
            "section_id": section_id,
            "block_slug": slug,
            "draft_selector": f".{draft_root_class}",
            "native_selector": _default_element_selector(slug),
        })
        seen_nodes.append(node)

    return sections


# ---------------------------------------------------------------------------
# Live probe (Playwright) — the F3-core-B wiring.
# ---------------------------------------------------------------------------

def _measure(page, selector: str) -> tuple[bool, int, float | None]:
    """Return (element_present, inner_text_len, height_px) for `selector` on `page`."""
    result = page.evaluate(
        """(sel) => {
            const el = document.querySelector(sel);
            if (!el) return [false, 0, null];
            const text = (el.innerText || '').length;
            const rect = el.getBoundingClientRect();
            return [true, text, rect.height];
        }""",
        selector,
    )
    present, text_len, height = result
    return bool(present), int(text_len), (float(height) if height is not None else None)


def probe(
    draft_path: Path,
    live_url: str,
    sections: list[dict],
    viewports: list[int],
) -> list[RenderedObservation]:
    """Render the draft file + the live URL at each viewport; build observations.

    One observation per (section, viewport) pair — section_id is suffixed
    with the viewport so each tier gets its own verdict row.
    """
    try:
        from playwright.sync_api import sync_playwright
    except ImportError as exc:  # pragma: no cover — environment guard, not a test path
        raise RuntimeError(
            "playwright (python) is not installed. Run: pip install playwright && "
            "playwright install chromium"
        ) from exc

    draft_url = draft_path.resolve().as_uri()
    observations: list[RenderedObservation] = []

    with sync_playwright() as p:
        browser = p.chromium.launch()
        try:
            for viewport in viewports:
                draft_page = browser.new_page(viewport={"width": viewport, "height": 1024})
                live_page = browser.new_page(viewport={"width": viewport, "height": 1024})
                draft_loaded = True
                live_loaded = True
                try:
                    draft_page.goto(draft_url, wait_until="networkidle", timeout=30000)
                except Exception:
                    draft_loaded = False
                try:
                    live_page.goto(live_url, wait_until="networkidle", timeout=30000)
                except Exception:
                    live_loaded = False

                for sec in sections:
                    draft_present, draft_text_len, draft_height = (
                        _measure(draft_page, sec["draft_selector"]) if draft_loaded
                        else (False, 0, None)
                    )
                    live_present, live_text_len, live_height = (
                        _measure(live_page, sec["native_selector"]) if live_loaded
                        else (False, 0, None)
                    )
                    observations.append(RenderedObservation(
                        section_id=f"{sec['section_id']}@{viewport}",
                        block_slug=sec["block_slug"],
                        element_selector=sec["native_selector"],
                        element_present=live_present,
                        inner_text_len=live_text_len,
                        rendered_height_px=live_height,
                        draft_height_px=draft_height if draft_present else None,
                        cells=[],
                        page_loaded=live_loaded,
                    ))
                draft_page.close()
                live_page.close()
        finally:
            browser.close()

    return observations


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--draft", type=Path, required=True, help="Path to the draft HTML file")
    parser.add_argument("--live-url", type=str, default=None, help="URL of the rendered SGS clone page")
    parser.add_argument(
        "--self-test", action="store_true",
        help="Use the draft file itself as the 'live' side (harness mechanics only, no deployed clone required)",
    )
    parser.add_argument("--viewports", type=str, default="375,768,1440", help="Comma-separated viewport widths")
    parser.add_argument("--out", type=Path, default=None, help="Optional path to write the JSON report")
    args = parser.parse_args(argv)

    if not args.draft.exists():
        print(f"ERROR: draft file not found: {args.draft}", file=sys.stderr)
        return 1
    if not args.live_url and not args.self_test:
        print("ERROR: --live-url is required unless --self-test is given.", file=sys.stderr)
        return 1

    draft_html = args.draft.read_text(encoding="utf-8")
    sections = discover_sections(draft_html)
    if not sections:
        print("No registered top-level BEM-root sections found in the draft — nothing to probe.")
        return 0

    viewports = [int(v.strip()) for v in args.viewports.split(",") if v.strip()]
    live_url = args.live_url or args.draft.resolve().as_uri()

    print(f"[render_oracle] DIAGNOSTIC harness — {len(sections)} section(s) x {len(viewports)} viewport(s).")
    print("[render_oracle] R-31-4: this is a per-commit diagnostic, NEVER the LANDED closing gate.")
    for sec in sections:
        print(f"  - {sec['section_id']}: {sec['block_slug']} "
              f"(draft={sec['draft_selector']!r} native={sec['native_selector']!r})")

    observations = probe(args.draft, live_url, sections, viewports)
    report = compute_report(fixture=args.draft.stem, observations=observations)

    print(f"\n=== render_oracle report — {args.draft.stem} ===")
    for sec in report.sections:
        g = sec.guards
        print(
            f"  {sec.section_id:30s} ({sec.block_slug:20s}) "
            f"verdict={sec.summary_verdict():18s} "
            f"guards[empty={g.empty} element={g.element} height={g.height}]"
        )
    print(f"\nPLAIN: {report.plain_summary}")

    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        artefact = report.as_dict()
        artefact["live_url"] = live_url
        args.out.write_text(json.dumps(artefact, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"\nwrote {args.out}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
