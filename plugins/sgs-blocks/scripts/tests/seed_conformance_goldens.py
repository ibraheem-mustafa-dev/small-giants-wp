"""seed_conformance_goldens.py  -  (re-)seed the Gate A conformance golden corpus.

Context (D278, 2026-07-05): ``test_converter_conformance.py``'s golden-diff
assertion was rewired at EXECUTION Step 16 to a near-zero-protection smoke
check ("did the converter emit >=1 wp: block at all") because the OLD
top-level ``*.golden.json`` files were captured from the retired FROZEN
walker and no longer matched the new modular engine's (deliberately
different) emit shape. That left the regression net effectively dead.

This script re-seeds a FRESH golden corpus, captured from the current,
LANDED-verified engine, into ``tests/fixtures/conformance/goldens/`` (a new
directory  -  the old top-level goldens are left untouched as historical
reference for the frozen engine, per the module docstring in
``test_converter_conformance.py``). ``test_converter_conformance.py`` then
byte-compares against THESE goldens, restoring real regression protection.

Golden set (40 total):
  - 31 golden files: one per existing fixture under
    ``tests/fixtures/conformance/*.html`` (the same fixtures the old harness
    used), run through ``converter.entry.convert_section``.
  - 9 golden files: one per top-level section of the REAL
    ``sites/mamas-munches/mockups/homepage/index.html`` draft  -  header,
    the 7 ``<section class="sgs-...">`` children of ``<main>``, and footer.
    Two of these (header, footer) are expected to come back
    ``status: "chrome-skipped"`` with empty ``block_markup``  -  that IS the
    correct, spec'd behaviour (FR-31-3 exception 2 / SKIP_TOP_LEVEL_TAGS) and
    the golden captures it so a regression that starts cloning chrome (or
    stops chrome-skipping) is caught.

PROVENANCE GATE (read before re-running this script):
    Never re-seed from a bare local emit. Only re-seed immediately after a
    LANDED deploy proof  -  i.e. the engine state has been deployed to the
    canary and verified there (computed-parity run + Bean's eye / A-ledger
    green), per CLAUDE.md rule 4a + R-31-13. A golden captured from an
    unverified local emit just pins whatever bug happens to be in the tree
    that day.

    The 2026-07-05 (D278) seed was taken from the state landed on canary
    page 8 that day: computed-parity content 90% / CSS 67-69-76, A2 ledger
    green (commit 7c8c9bd0 and prior in the D276 execution chain).

Usage (from plugins/sgs-blocks/scripts):
    python tests/seed_conformance_goldens.py

Re-run ONLY after a fresh LANDED deploy proof, and cite that proof (deploy
target, computed-parity numbers, date) in the commit message alongside the
regenerated golden files.

The script re-runs the full seed pass TWICE (write, then a read-only
verification pass) and reports whether the two runs are byte-identical, as a
determinism smoke check before anything is trusted or committed.

UK English throughout.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Iterator

from bs4 import BeautifulSoup, Tag

# ---------------------------------------------------------------------------
# Paths + sys.path  -  mirrors test_converter_conformance.py's own setup.
# ---------------------------------------------------------------------------

_SCRIPTS_ROOT = Path(__file__).resolve().parents[1]           # plugins/sgs-blocks/scripts
_REPO_ROOT = _SCRIPTS_ROOT.parents[2]                          # small-giants-wp/

if str(_SCRIPTS_ROOT) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_ROOT))

from converter.entry import convert_section  # noqa: E402

FIXTURE_DIR = _SCRIPTS_ROOT / "tests" / "fixtures" / "conformance"
GOLDEN_DIR = FIXTURE_DIR / "goldens"
MAMAS_DRAFT_PATH = _REPO_ROOT / "sites" / "mamas-munches" / "mockups" / "homepage" / "index.html"

_SEED_NOTE = (
    "Seeded 2026-07-05 (D278) from the LANDED-verified engine state  -  "
    "deployed to canary page 8 that day, computed-parity content 90% / CSS "
    "67-69-76, A2 ledger green. Never re-seed from emit alone; re-seed only "
    "WITH a fresh LANDED proof (a real deploy + computed-parity run, not "
    "just a local emit) and cite that proof in the commit message."
)

_REAL_DRAFT_SLUG_PREFIX = "mamas-munches-homepage__"


# ---------------------------------------------------------------------------
# Fixture helpers
# ---------------------------------------------------------------------------

def extract_fixture_parts(html_content: str) -> tuple[str, Tag]:
    """Extract CSS text and the <section> Tag from a fixture HTML file."""
    soup = BeautifulSoup(html_content, "html.parser")
    style_tag = soup.find("style")
    css_text = style_tag.get_text() if style_tag else ""
    section = soup.find("section")
    if section is None:
        raise ValueError("No <section> element found in fixture")
    return css_text, section


def run_converter_full(section_tag: Tag, css_text: str) -> dict:
    """Run the converter on a single section via the real production entry
    point and return the FULL result dict (not just the markup string), so
    goldens also pin ``status``/``selector``/``block_name``  -  load-bearing
    for the header/footer chrome-skip goldens, which have empty markup."""
    return convert_section(html=str(section_tag), css=css_text, media_map={})


def iter_conformance_fixtures() -> Iterator[tuple[str, Path]]:
    """Yield (golden_id, html_path) for every fixture .html file.

    golden_id == the fixture's filename stem (e.g. "sgs-hero"), matching the
    existing fixture-naming convention.
    """
    for html_path in sorted(FIXTURE_DIR.glob("*.html")):
        yield html_path.stem, html_path


# ---------------------------------------------------------------------------
# Real-draft helpers
# ---------------------------------------------------------------------------

def collect_real_draft_sections() -> list[tuple[str, Tag, str]]:
    """Return [(golden_id, section_tag, css_text), ...] for the 9 top-level
    sections of the real mamas-munches homepage draft: the <header
    class="sgs-header">, the 7 <section class="sgs-*"> children of <main>,
    and the <footer class="sgs-footer">, in draft document order.

    css_text is the SAME for every entry  -  the draft's full inline <style>
    text (all <style> tags concatenated)  -  mirroring how
    sgs-clone-orchestrator.py feeds convert_section in production (the whole
    mockup's CSS, not a per-section slice).
    """
    if not MAMAS_DRAFT_PATH.exists():
        raise FileNotFoundError(f"Real draft not found: {MAMAS_DRAFT_PATH}")

    html_content = MAMAS_DRAFT_PATH.read_text(encoding="utf-8")
    soup = BeautifulSoup(html_content, "html.parser")
    css_text = "\n\n".join(t.get_text() for t in soup.find_all("style"))

    body = soup.find("body")
    if body is None:
        raise ValueError("Real draft has no <body>  -  structure changed, update this seeder")

    header = body.find("header", class_="sgs-header", recursive=False)
    footer = body.find("footer", class_="sgs-footer", recursive=False)
    main = body.find("main", recursive=False)
    if header is None or footer is None or main is None:
        raise ValueError(
            "Real draft structure changed  -  expected direct <body> children "
            "<header class=sgs-header>, <main>, <footer class=sgs-footer>. "
            "Update collect_real_draft_sections() (and re-verify the LANDED "
            "deploy proof) before re-seeding."
        )

    sections = main.find_all("section", recursive=False)
    top_level = [header, *sections, footer]
    if len(top_level) != 9:
        raise ValueError(
            f"Expected 9 top-level sections (header + 7 <section> + footer) "
            f"in the real draft, found {len(top_level)}. The draft structure "
            "changed since D278  -  update this seeder's extraction logic (and "
            "re-verify the LANDED deploy proof) before re-seeding."
        )

    out: list[tuple[str, Tag, str]] = []
    for tag in top_level:
        classes = tag.get("class") or []
        sgs_class = next((c for c in classes if c.startswith("sgs-")), tag.name)
        slug = sgs_class[len("sgs-"):] if sgs_class.startswith("sgs-") else sgs_class
        golden_id = f"{_REAL_DRAFT_SLUG_PREFIX}{slug}"
        out.append((golden_id, tag, css_text))
    return out


def real_draft_source_tag(golden_id: str) -> str:
    """Return the documentary 'source' string for a real-draft golden_id."""
    slug = golden_id[len(_REAL_DRAFT_SLUG_PREFIX):]
    rel_path = MAMAS_DRAFT_PATH.relative_to(_REPO_ROOT).as_posix()
    return f"real-draft:{rel_path}#{slug}"


# ---------------------------------------------------------------------------
# Golden record shape
# ---------------------------------------------------------------------------

def build_golden_record(golden_id: str, source: str, result: dict) -> dict:
    markup = result.get("block_markup") or ""
    m = re.search(r"wp:([a-z/][a-z0-9/-]+)", markup)
    primary_block = m.group(1) if m else "unknown"
    return {
        "seed_note": _SEED_NOTE,
        "golden_id": golden_id,
        "source": source,
        "status": result.get("status", ""),
        "block_name": result.get("block_name", ""),
        "selector": result.get("selector", ""),
        "failure_reason": result.get("failure_reason", ""),
        "primary_block_emitted": primary_block,
        "block_markup": markup,
    }


# ---------------------------------------------------------------------------
# Seed pass
# ---------------------------------------------------------------------------

def seed_all(write: bool = True) -> dict[str, dict]:
    """Run the engine over every conformance fixture + every real-draft
    section. When write=True, write/overwrite the golden JSON files under
    GOLDEN_DIR. Always returns {golden_id: golden_record} for the caller
    (used for the determinism double-run check).
    """
    if write:
        GOLDEN_DIR.mkdir(parents=True, exist_ok=True)

    records: dict[str, dict] = {}

    for golden_id, html_path in iter_conformance_fixtures():
        css_text, section = extract_fixture_parts(html_path.read_text(encoding="utf-8"))
        result = run_converter_full(section, css_text)
        record = build_golden_record(golden_id, f"fixture:{html_path.name}", result)
        records[golden_id] = record
        if write:
            (GOLDEN_DIR / f"{golden_id}.golden.json").write_text(
                json.dumps(record, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
            )

    for golden_id, section_tag, css_text in collect_real_draft_sections():
        result = run_converter_full(section_tag, css_text)
        record = build_golden_record(golden_id, real_draft_source_tag(golden_id), result)
        records[golden_id] = record
        if write:
            (GOLDEN_DIR / f"{golden_id}.golden.json").write_text(
                json.dumps(record, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
            )

    return records


def _diff_records(a: dict[str, dict], b: dict[str, dict]) -> list[str]:
    """Return a list of golden_ids whose comparable fields differ between two
    seed passes (ignoring the static seed_note/source documentary fields)."""
    keys_to_compare = ("status", "block_name", "selector", "failure_reason", "block_markup")
    mismatches = []
    all_ids = sorted(set(a) | set(b))
    for gid in all_ids:
        ra, rb = a.get(gid), b.get(gid)
        if ra is None or rb is None:
            mismatches.append(gid)
            continue
        if any(ra.get(k) != rb.get(k) for k in keys_to_compare):
            mismatches.append(gid)
    return mismatches


def main() -> int:
    print(f"Seeding conformance goldens into {GOLDEN_DIR} ...")
    first = seed_all(write=True)
    print(f"Wrote {len(first)} golden files "
          f"({sum(1 for g in first if not g.startswith(_REAL_DRAFT_SLUG_PREFIX))} fixtures + "
          f"{sum(1 for g in first if g.startswith(_REAL_DRAFT_SLUG_PREFIX))} real-draft sections).")

    print("Re-running once more (read-only) to verify determinism...")
    second = seed_all(write=False)
    mismatches = _diff_records(first, second)
    if mismatches:
        print(f"NON-DETERMINISM DETECTED across {len(mismatches)} golden(s): {mismatches}")
        print("Investigate the source of nondeterminism (e.g. dict/set ordering feeding "
              "into JSON serialisation) before trusting or committing these goldens.")
        return 1

    print(f"Determinism verified across {len(first)} goldens  -  two independent runs, byte-identical.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
