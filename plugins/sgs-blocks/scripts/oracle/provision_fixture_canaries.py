#!/usr/bin/env python3
"""oracle.provision_fixture_canaries — deploy the fixture corpus as live canary pages.

Spec ref: .claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md §7b (multi-fixture
false-win guard: "a page-8 match does NOT prove the universal engine ... blocks
absent from any live page are UNVERIFIED, never COVERED") + §12.7 F3.
Design ref: .claude/plans/archive/2026-06-18-f3-render-oracle-design.md §5
("page-per-fixture provisioning, slug prefix ``f3-oracle-<fixture>``, no reused
page — avoids cross-fixture CDN/OPcache contamination").

WHY THIS EXISTS
---------------
``oracle/batch_runner.py`` can only produce a genuine LANDED verdict for a
fixture that has a DEPLOYED canary page — every other fixture honestly reports
SKIPPED-NO-LIVE-URL. Without those pages the LANDED leg of the Spec 31 closing
gate cannot run at all, so ``ledger/coverage_check.py::check_landed()`` stays
deliberately unwired. This script provisions those pages.

WHAT IT DOES (per fixture)
--------------------------
Runs the REAL ``/sgs-clone`` pipeline (``sgs-clone-orchestrator.py``) with
``--deploy-target page:<id>``. It deliberately does NOT hand-roll a conversion:
a hand-rolled emit would skip Stage 10's scoped-CSS (D2) injection and media
resolution, so the rendered page would diverge from what the pipeline actually
ships — producing FALSE ``WRITTEN-not-LANDED`` verdicts that look like converter
bugs but are harness artefacts.

The page IDs are supplied by ``--pages-map`` (a ``{stem: wp_page_id}`` JSON),
because page creation is a WP-CLI-over-SSH operation outside this script's
remit. Provisioning them is idempotent on the WP side (look up
``f3-oracle-<stem>`` by ``post_name`` before creating).

HONEST REPORTING
----------------
A fixture whose clone or deploy fails is recorded with its failure reason and
is NOT written into the URL map — an unreachable page must never masquerade as
a probeable one (that would convert an infrastructure failure into a silent
"LANDED" gap in the corpus). The written URL map therefore contains ONLY
fixtures whose page was genuinely patched.

Usage
-----
    python oracle/provision_fixture_canaries.py --pages-map pages.json \
        [--site-url https://...] [--urls-map oracle/fixture-canary-urls.json] \
        [--only stem1,stem2] [--dry-run]
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

_HERE = Path(__file__).resolve().parent
_SCRIPTS_DIR = _HERE.parent

sys.stdout.reconfigure(encoding="utf-8")

_DEFAULT_SITE_URL = "https://sandybrown-nightingale-600381.hostingersite.com"
_DEFAULT_URLS_MAP = _HERE / "fixture-canary-urls.json"
_ORCHESTRATOR = _SCRIPTS_DIR / "sgs-clone-orchestrator.py"
_PHASE_F_DIR = _SCRIPTS_DIR / "tests" / "fixtures" / "phase-f"
_CONFORMANCE_DIR = _SCRIPTS_DIR / "tests" / "fixtures" / "conformance"

# Slug prefix per the F3 design doc §5 — one page per fixture, never reused.
_SLUG_PREFIX = "f3-oracle-"


def discover_fixture_paths() -> dict[str, Path]:
    """{stem: draft_path} over the SAME corpus batch_runner/coverage_check use."""
    out: dict[str, Path] = {}
    for fpath in sorted(_PHASE_F_DIR.glob("*.draft.html")):
        stem = fpath.stem
        if stem.endswith(".draft"):
            stem = stem[: -len(".draft")]
        out[stem] = fpath
    for fpath in sorted(_CONFORMANCE_DIR.glob("*.html")):
        out[fpath.stem] = fpath
    return out


def clone_and_deploy(stem: str, draft_path: Path, page_id: int) -> tuple[bool, str]:
    """Run the real pipeline for ONE fixture. Returns (ok, detail)."""
    cmd = [
        sys.executable, str(_ORCHESTRATOR),
        "--mockup", str(draft_path),
        "--page", f"{_SLUG_PREFIX}{stem}",
        "--auto-section",
        "--mode", "draft",
        "--no-playwright",
        "--skip-register",
        "--no-computed-parity",
        # A fixture lives outside sites/<client>/, so there is no client theme
        # snapshot for FR-33-12 to validate. The gate is skipped HERE ONLY (a
        # fixture is not a client draft); it stays armed for every client clone.
        "--skip-freshness-gate",
        "--deploy-target", f"page:{page_id}",
    ]
    try:
        result = subprocess.run(
            cmd, capture_output=True, text=True, encoding="utf-8",
            errors="replace", timeout=900, cwd=str(_SCRIPTS_DIR),
        )
    except subprocess.TimeoutExpired:
        return False, "orchestrator timed out (>900s)"

    stdout = result.stdout or ""
    stderr = result.stderr or ""
    patched = [ln for ln in stdout.splitlines() if "[stage-10] deploy: patched" in ln]
    if patched:
        return True, patched[-1].strip()

    # Surface the most informative failure line rather than a generic message.
    fail_lines = [
        ln for ln in (stdout + "\n" + stderr).splitlines()
        if "stage-10" in ln or "HALTED" in ln or "Traceback" in ln
    ]
    detail = fail_lines[-1].strip() if fail_lines else f"exit {result.returncode}"
    return False, detail


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pages-map", type=Path, required=True,
                        help="JSON {fixture_stem: wp_page_id} for already-created pages")
    parser.add_argument("--site-url", type=str, default=_DEFAULT_SITE_URL)
    parser.add_argument("--urls-map", type=Path, default=_DEFAULT_URLS_MAP)
    parser.add_argument("--only", type=str, default=None,
                        help="Comma-separated fixture stems to process (default: all in pages-map)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Print what would run; deploy nothing")
    args = parser.parse_args(argv)

    pages_map: dict[str, int] = {
        str(k): int(v) for k, v in json.loads(args.pages_map.read_text(encoding="utf-8")).items()
    }
    fixtures = discover_fixture_paths()
    wanted = (
        [s.strip() for s in args.only.split(",") if s.strip()]
        if args.only else sorted(pages_map)
    )

    site = args.site_url.rstrip("/")
    ok_urls: dict[str, str] = {}
    failures: dict[str, str] = {}

    for i, stem in enumerate(wanted, 1):
        if stem not in fixtures:
            failures[stem] = "no fixture file found for this stem"
            print(f"[{i}/{len(wanted)}] {stem}: SKIP — no fixture file")
            continue
        if stem not in pages_map:
            failures[stem] = "no page id in --pages-map"
            print(f"[{i}/{len(wanted)}] {stem}: SKIP — no page id")
            continue

        page_id = pages_map[stem]
        if args.dry_run:
            print(f"[{i}/{len(wanted)}] {stem}: would deploy -> page:{page_id}")
            continue

        ok, detail = clone_and_deploy(stem, fixtures[stem], page_id)
        if ok:
            ok_urls[stem] = f"{site}/{_SLUG_PREFIX}{stem}/"
            print(f"[{i}/{len(wanted)}] {stem}: OK  page:{page_id}")
        else:
            failures[stem] = detail
            print(f"[{i}/{len(wanted)}] {stem}: FAIL — {detail}")

    if args.dry_run:
        return 0

    # Merge into the existing URL map, preserving its "_"-prefixed doc keys and
    # any previously-verified entries this run did not touch.
    existing: dict = {}
    if args.urls_map.exists():
        try:
            existing = json.loads(args.urls_map.read_text(encoding="utf-8"))
        except Exception:
            existing = {}
    existing.update(ok_urls)
    args.urls_map.write_text(
        json.dumps(existing, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )

    print(f"\n  deployed OK : {len(ok_urls)}")
    print(f"  failed      : {len(failures)}")
    for stem, why in failures.items():
        print(f"    [{stem}] {why}")
    print(f"\n  wrote {args.urls_map}")
    # Failures are reported, not swallowed — but they do not abort the batch
    # (one bad fixture must not block provisioning the other 35).
    return 0 if not failures else 2


if __name__ == "__main__":
    sys.exit(main())
