#!/usr/bin/env python3
"""check-css-layer-orphans.py — DB-first orphan gate for ``block_attributes.css_layer``.

WHY THIS EXISTS (2026-08-26 ruling)
------------------------------------
D642 (2026-08-16) deleted a DIFFERENT mechanism that merely shares the word "layer":
``resolvers/grid_area.py``, the ``GRID_AREA`` branch in
``converter/services/layer_detect.py``, and their dispatch-table wiring. That
mechanism was triggered by ``ctx.area_name`` — never set by any production
``Ctx``-builder, only by test fixtures — so it was provably dead and its deletion
was correct and is NOT reopened here.

THIS script governs a completely different thing: the ``css_layer`` COLUMN on the
``block_attributes`` DB table, and in particular its ``'GRID_AREA'`` VALUE — seeded
from the ``"layer": "GRID_AREA"`` declarations inside block.json manifests
(``sgs/container``, ``sgs/cta-section``, ``sgs/gallery``, ``sgs/hero``) via
``behavioural-analyser/extract-signatures.py`` + ``/sgs-update``. Bean ruled
2026-08-26: change NOTHING about those declarations or the seeded rows — they stay
exactly as they are. The only permitted action is making an unread value VISIBLE,
never deleting it.

WHAT "ORPHANED" MEANS HERE
---------------------------
``block_attributes.css_layer`` is queried by exactly one production function,
``db_lookup.attr_for_layer_property(block_slug, layer, css_property)``, always
called with a LITERAL layer string (never a value read back out of the DB). This
script enumerates every DISTINCT non-NULL ``css_layer`` value actually stored in
the DB, then greps the live (non-test) converter/ codebase for that exact value
appearing as a genuine standalone string-literal token — a real call argument, a
dict key, a tuple/set/list member — as opposed to a mention inside a comment or a
prose docstring. A value with zero such standalone-literal occurrences anywhere in
production code is an ORPHAN: it is written to the DB but no query ever asks for
it by that name.

Note carefully what this does and does NOT prove: a ``css_layer`` value can be
orphaned as a QUERY KEY while its underlying ROWS are still perfectly reachable
through a DIFFERENT column (e.g. ``attr_for_area_property`` matches on
``css_property`` + ``css_element`` and never reads ``css_layer`` at all). This
script reports on the COLUMN VALUE as a lookup key only — it does not, and must
not, be read as "these rows are unused". That distinction is exactly why Bean
ruled "make it visible", not "delete it": a human needs to look at the finding
and decide, the detector must not pre-judge it.

DB-first (R-31-1): every value + row count + block roster comes from
``sgs-framework.db``, read-only, via ``block_attributes``. Nothing here is a
hand-typed roster of layer names — the set of values scanned for is whatever the
DB actually contains today, so a 5th layer value invented next month is picked up
automatically with zero code change.

USAGE
-----
    python check-css-layer-orphans.py                  # --survey (default)
    python check-css-layer-orphans.py --survey
    python check-css-layer-orphans.py --check
    python check-css-layer-orphans.py --self-test
"""
from __future__ import annotations

import argparse
import ast
import json
import shutil
import sqlite3
import sys
import tempfile
import tokenize
from pathlib import Path
from typing import Iterable

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

SCRIPT_PATH = Path(__file__).resolve()
# scripts/ -> sgs-blocks/ -> plugins/ -> repo root
REPO_ROOT = SCRIPT_PATH.parents[3]
CONVERTER_DIR = REPO_ROOT / "plugins" / "sgs-blocks" / "scripts" / "converter"
DB_PATH = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"
BASELINE_PATH = SCRIPT_PATH.with_name("check-css-layer-orphans-baseline.json")

# ---------------------------------------------------------------------------
# Anti-vacuity floors. A run that scans nothing must FAIL, never silently pass.
# Real numbers measured 2026-08-26: 509 non-NULL css_layer rows, 61 production
# .py files under converter/. Floors sit well below those so legitimate future
# pruning/growth doesn't false-fail, but a corpus that collapses to near-zero
# (a broken DB path, a moved directory, a botched exclude filter) trips them.
# ---------------------------------------------------------------------------

MIN_CSS_LAYER_ROWS = 100
MIN_FILES_SCANNED = 20


# ---------------------------------------------------------------------------
# DB census (read-only, R-31-1 DB-first)
# ---------------------------------------------------------------------------


def load_css_layer_census(db_path: Path) -> tuple[dict[str, dict], int]:
    """Return (per-value census, total non-NULL row count) from block_attributes.

    Never writes to the DB. Opens strictly read-only via the sqlite URI ``mode=ro``
    convention this repo uses for reporters (see audit-declared-vs-seeded-roles.py /
    generate-db-catalogue.py / audit-feature-parity.py) — never imports
    converter/db/db_lookup.py's sibling ``db_lookup.py`` module by that name, which
    runs schema migrations as an import side effect against the shared live DB.
    """
    if not db_path.exists():
        raise SystemExit(f"[FATAL] DB not found at {db_path} — cannot enumerate css_layer.")

    uri = f"file:{db_path.as_posix()}?mode=ro"
    conn = sqlite3.connect(uri, uri=True)
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT css_layer, block_slug, attr_name FROM block_attributes "
            "WHERE css_layer IS NOT NULL ORDER BY css_layer, block_slug, attr_name"
        )
        rows = cur.fetchall()
    finally:
        conn.close()

    census: dict[str, dict] = {}
    for layer, block_slug, attr_name in rows:
        entry = census.setdefault(layer, {"row_count": 0, "block_slugs": set(), "attrs": []})
        entry["row_count"] += 1
        entry["block_slugs"].add(block_slug)
        entry["attrs"].append(f"{block_slug}.{attr_name}")
    return census, len(rows)


# ---------------------------------------------------------------------------
# Production-file corpus (disk, R-31-1 — never a hand-typed roster of files)
# ---------------------------------------------------------------------------


def production_files(root_dir: Path) -> list[Path]:
    """Every .py file under root_dir that is LIVE production converter code —
    excludes __pycache__, any ``tests/`` directory, and any ``test_*.py`` file.
    """
    if not root_dir.exists():
        return []
    files = []
    for path in root_dir.rglob("*.py"):
        if "__pycache__" in path.parts:
            continue
        if "tests" in path.parts:
            continue
        if path.name.startswith("test_"):
            continue
        files.append(path)
    return sorted(files)


# ---------------------------------------------------------------------------
# Standalone-literal reader detection (tokenize-based, comment/docstring-safe)
# ---------------------------------------------------------------------------


def _standalone_string_literals(path: Path) -> Iterable[tuple[str, int]]:
    """Yield (evaluated_value, line_no) for every STRING token in ``path`` whose
    ast.literal_eval'd value is a short standalone string — i.e. a genuine code
    literal (call argument, dict key/value, tuple/list/set member), never a
    comment (tokenize's COMMENT token type is never STRING, so comments are
    structurally excluded) and never a docstring (a docstring is captured by
    tokenize as ONE long STRING token whose literal_eval'd value is the entire
    multi-sentence prose block — it can only equal a short value like
    "GRID_AREA" if the ENTIRE docstring were exactly that one word, which none
    of this codebase's docstrings are).
    """
    try:
        text = path.read_text(encoding="utf-8")
    except (UnicodeDecodeError, OSError):
        return

    try:
        line_iter = iter(text.splitlines(keepends=True))
        tokens = list(tokenize.generate_tokens(lambda: next(line_iter)))
    except (tokenize.TokenError, SyntaxError, IndentationError, StopIteration):
        return

    for tok in tokens:
        if tok.type != tokenize.STRING:
            continue
        raw = tok.string
        # Skip f-strings and byte-strings — literal_eval can't safely resolve an
        # f-string's runtime value, and it is never a static "GRID_AREA"-shaped
        # literal anyway (an f-string reader would show up as a distinct,
        # separately-worth-flagging finding, not a false negative here).
        prefix = raw[: raw.index(raw[-1] * 3 if raw.endswith(raw[-1] * 3) else raw[-1])].lower()
        if "f" in prefix or "b" in prefix:
            continue
        try:
            evaluated = ast.literal_eval(raw)
        except (ValueError, SyntaxError):
            continue
        if isinstance(evaluated, str):
            yield evaluated, tok.start[0]


def find_standalone_literal_readers(
    value: str, files: list[Path], *, root: Path = REPO_ROOT
) -> list[str]:
    """Return ["relpath:lineno", ...] for every file in ``files`` where ``value``
    appears as a standalone string-literal token (see ``_standalone_string_literals``).
    """
    hits: list[str] = []
    for path in files:
        for literal_value, lineno in _standalone_string_literals(path):
            if literal_value == value:
                try:
                    rel = path.relative_to(root).as_posix()
                except ValueError:
                    rel = str(path)
                hits.append(f"{rel}:{lineno}")
    return hits


# ---------------------------------------------------------------------------
# Report assembly
# ---------------------------------------------------------------------------


def build_report(
    db_path: Path = DB_PATH, converter_dir: Path = CONVERTER_DIR
) -> tuple[dict[str, dict], int, int]:
    census, total_rows = load_css_layer_census(db_path)
    files = production_files(converter_dir)

    report: dict[str, dict] = {}
    for value, entry in sorted(census.items()):
        readers = find_standalone_literal_readers(value, files)
        report[value] = {
            "row_count": entry["row_count"],
            "block_slugs": sorted(entry["block_slugs"]),
            "reader_count": len(readers),
            "readers": readers,
            "orphaned": len(readers) == 0,
        }
    return report, total_rows, len(files)


def _assert_anti_vacuity(total_rows: int, files_scanned: int) -> None:
    if total_rows < MIN_CSS_LAYER_ROWS:
        raise SystemExit(
            f"[FATAL] Anti-vacuity floor tripped: only {total_rows} non-NULL "
            f"css_layer rows found (floor {MIN_CSS_LAYER_ROWS}). This looks like "
            "a broken DB path or an empty corpus, not a real census. Refusing "
            "to report a pass on a scan that found (almost) nothing."
        )
    if files_scanned < MIN_FILES_SCANNED:
        raise SystemExit(
            f"[FATAL] Anti-vacuity floor tripped: only {files_scanned} production "
            f".py files scanned under {CONVERTER_DIR} (floor {MIN_FILES_SCANNED}). "
            "This looks like a broken path or an over-aggressive exclude filter, "
            "not a real corpus. Refusing to report a pass on a scan that found "
            "(almost) nothing."
        )


# ---------------------------------------------------------------------------
# Modes
# ---------------------------------------------------------------------------


def mode_survey() -> int:
    report, total_rows, files_scanned = build_report()
    _assert_anti_vacuity(total_rows, files_scanned)

    print("css_layer orphan census — block_attributes, read-only")
    print(f"DB: {DB_PATH}")
    print(f"Non-NULL css_layer rows: {total_rows}")
    print(f"Production converter/ files scanned: {files_scanned}")
    print()
    for value, entry in report.items():
        status = "ORPHANED (no standalone-literal reader found)" if entry["orphaned"] else "OK"
        print(f"  {value}: {entry['row_count']} rows across {len(entry['block_slugs'])} "
              f"block(s) {entry['block_slugs']} — {entry['reader_count']} reader(s) — {status}")
        for r in entry["readers"]:
            print(f"      read at {r}")
    orphans = [v for v, e in report.items() if e["orphaned"]]
    print()
    if orphans:
        print(f"Orphaned css_layer value(s): {orphans}")
        print("These values are WRITTEN to the DB but no production code queries them by")
        print("name. Per the 2026-08-26 ruling this is a VISIBILITY gate only — nothing is")
        print("deleted or renamed here. A human decides what (if anything) to do about it.")
    else:
        print("No orphaned css_layer values found.")
    return 0


def mode_check() -> int:
    if not BASELINE_PATH.exists():
        raise SystemExit(
            f"[FATAL] --check requires a baseline at {BASELINE_PATH}. "
            "None found — seed it first (see the baseline this script ships with)."
        )
    baseline = json.loads(BASELINE_PATH.read_text(encoding="utf-8"))
    known_orphans = set(baseline.get("known_orphan_css_layer_values", []))
    floor_rows = baseline.get("min_css_layer_rows_floor", MIN_CSS_LAYER_ROWS)
    floor_files = baseline.get("min_files_scanned_floor", MIN_FILES_SCANNED)

    report, total_rows, files_scanned = build_report()
    if total_rows < floor_rows:
        raise SystemExit(
            f"[FATAL] Anti-vacuity floor tripped: {total_rows} rows < baseline floor {floor_rows}."
        )
    if files_scanned < floor_files:
        raise SystemExit(
            f"[FATAL] Anti-vacuity floor tripped: {files_scanned} files < baseline floor {floor_files}."
        )

    current_orphans = {v for v, e in report.items() if e["orphaned"]}
    new_orphans = current_orphans - known_orphans
    healed_orphans = known_orphans - current_orphans

    print(f"css_layer orphan ratchet — baseline: {BASELINE_PATH.name}")
    print(f"Known orphans (baseline): {sorted(known_orphans)}")
    print(f"Current orphans:          {sorted(current_orphans)}")

    if healed_orphans:
        print(f"IMPROVEMENT (informational, not a failure): {sorted(healed_orphans)} "
              "now has a reader and is no longer orphaned — update the baseline when convenient.")

    if new_orphans:
        print(f"[FAIL] New orphan(s) not in baseline: {sorted(new_orphans)}")
        print("A css_layer value that used to have a reader has lost it (or a new value")
        print("was introduced with none). That is a regression this gate exists to catch.")
        return 1

    print("[PASS] No new orphans beyond the baselined set.")
    return 0


# ---------------------------------------------------------------------------
# Self-test
# ---------------------------------------------------------------------------


def _selftest_write(path: Path, content: str) -> None:
    path.write_text(content, encoding="utf-8")


def mode_self_test() -> int:
    failures: list[str] = []

    def check(label: str, condition: bool, detail: str = "") -> None:
        status = "PASS" if condition else "FAIL"
        print(f"  [{status}] {label}" + (f" — {detail}" if detail and not condition else ""))
        if not condition:
            failures.append(label)

    print("=== check-css-layer-orphans.py self-test ===")

    # -----------------------------------------------------------------
    # 1. Anti-vacuity floor fires closed on an empty corpus.
    # -----------------------------------------------------------------
    print("\n-- 1. Anti-vacuity floor (empty corpus must FAIL, never silently pass) --")
    try:
        _assert_anti_vacuity(total_rows=0, files_scanned=0)
        check("empty corpus raises SystemExit", False, "no exception raised")
    except SystemExit:
        check("empty corpus raises SystemExit", True)
    try:
        _assert_anti_vacuity(total_rows=MIN_CSS_LAYER_ROWS + 1, files_scanned=0)
        check("zero files-scanned raises SystemExit", False, "no exception raised")
    except SystemExit:
        check("zero files-scanned raises SystemExit", True)

    # -----------------------------------------------------------------
    # 2. Real-DB / real-corpus proof: GRID_AREA is orphaned, OUTER is not.
    #    This is the actual finding this script exists to surface — run
    #    live, not asserted from memory.
    # -----------------------------------------------------------------
    print("\n-- 2. Real DB + real corpus: GRID_AREA orphaned, OUTER has readers --")
    try:
        report, total_rows, files_scanned = build_report()
        _assert_anti_vacuity(total_rows, files_scanned)
        grid_area_orphaned = report.get("GRID_AREA", {}).get("orphaned")
        outer_orphaned = report.get("OUTER", {}).get("orphaned")
        print(f"  total_rows={total_rows} files_scanned={files_scanned}")
        print(f"  GRID_AREA: {report.get('GRID_AREA')}")
        print(f"  OUTER reader_count={report.get('OUTER', {}).get('reader_count')} "
              f"(sample: {report.get('OUTER', {}).get('readers', [])[:3]})")
        check("GRID_AREA reports orphaned=True on the real DB", grid_area_orphaned is True)
        check("OUTER reports orphaned=False on the real DB (NEGATIVE CONTROL — a value "
              "known to have a reader must NOT come back orphaned)", outer_orphaned is False)
    except Exception as exc:  # noqa: BLE001 — a self-test must report, never crash silently
        check("real DB + corpus census ran without error", False, repr(exc))

    # -----------------------------------------------------------------
    # 3. Synthetic corpus: docstring/comment mentions do NOT count as readers;
    #    a genuine standalone literal DOES. Proves the tokenize-based filter
    #    actually distinguishes the two, on a corpus this test fully controls.
    # -----------------------------------------------------------------
    print("\n-- 3. Synthetic corpus: docstring/comment noise vs a real literal reader --")
    tmp_root = Path(tempfile.mkdtemp(prefix="css-layer-selftest-", dir="C:/tmp"))
    try:
        noisy_file = tmp_root / "noisy.py"
        _selftest_write(
            noisy_file,
            '"""\n'
            "This module's css_layer can be 'OUTER'|'CONTENT'|'GRID'|'GRID_AREA' — a long\n"
            "prose docstring sentence that MENTIONS GRID_AREA but never uses it as a real\n"
            "standalone argument anywhere in actual code.\n"
            '"""\n'
            "# another mention in a comment: GRID_AREA\n"
            "LAYER_READERS = (\"OUTER\", \"CONTENT\", \"GRID\")\n",
        )
        files = [noisy_file]
        grid_area_hits = find_standalone_literal_readers("GRID_AREA", files, root=tmp_root)
        outer_hits = find_standalone_literal_readers("OUTER", files, root=tmp_root)
        print(f"  GRID_AREA hits in noisy.py (docstring+comment only): {grid_area_hits}")
        print(f"  OUTER hits in noisy.py (real tuple literal): {outer_hits}")
        check("docstring+comment mention of GRID_AREA is NOT counted as a reader",
              grid_area_hits == [])
        check("a real standalone literal (OUTER in a tuple) IS counted as a reader",
              len(outer_hits) == 1)

        # -------------------------------------------------------------
        # 4. NEGATIVE CONTROL + deliberate break/restore, on a file with a
        #    genuine GRID_AREA literal reader. Must be watched red, then
        #    green, not just asserted.
        # -------------------------------------------------------------
        print("\n-- 4. Deliberate break/restore on a real GRID_AREA literal reader --")
        reader_file = tmp_root / "reader.py"
        original_content = (
            "def resolve(layer):\n"
            "    if layer == \"GRID_AREA\":\n"
            "        return handle_area()\n"
        )
        _selftest_write(reader_file, original_content)
        files2 = [reader_file]

        before_hits = find_standalone_literal_readers("GRID_AREA", files2, root=tmp_root)
        print(f"  BEFORE break: GRID_AREA hits = {before_hits}")
        check("NEGATIVE CONTROL: file with a real GRID_AREA literal reports non-orphaned",
              len(before_hits) == 1)

        # Deliberately break it: remove the literal, keep the file otherwise valid.
        broken_content = (
            "def resolve(layer):\n"
            "    if layer == \"UNRELATED\":\n"
            "        return handle_area()\n"
        )
        _selftest_write(reader_file, broken_content)
        red_hits = find_standalone_literal_readers("GRID_AREA", files2, root=tmp_root)
        print(f"  AFTER deliberate break: GRID_AREA hits = {red_hits}  <-- watched RED")
        check("deliberate break: reader disappears (goes RED) when the literal is removed",
              red_hits == [])

        # Restore and re-confirm green.
        _selftest_write(reader_file, original_content)
        green_hits = find_standalone_literal_readers("GRID_AREA", files2, root=tmp_root)
        print(f"  AFTER restore: GRID_AREA hits = {green_hits}  <-- confirmed GREEN")
        check("restore: reader reappears (goes GREEN) once the literal is put back",
              len(green_hits) == 1)
    finally:
        shutil.rmtree(tmp_root, ignore_errors=True)

    # -----------------------------------------------------------------
    # 5. --check mode: baseline round-trip sanity (no repo writes).
    # -----------------------------------------------------------------
    print("\n-- 5. --check mode reads the shipped baseline without error --")
    try:
        if BASELINE_PATH.exists():
            baseline = json.loads(BASELINE_PATH.read_text(encoding="utf-8"))
            check("shipped baseline JSON parses", isinstance(baseline, dict))
            check("shipped baseline lists GRID_AREA as a known orphan",
                  "GRID_AREA" in baseline.get("known_orphan_css_layer_values", []))
        else:
            check("shipped baseline exists", False, f"missing at {BASELINE_PATH}")
    except Exception as exc:  # noqa: BLE001
        check("baseline round-trip", False, repr(exc))

    print(f"\n=== self-test {'FAILED' if failures else 'PASSED'} "
          f"({len(failures)} failing check(s)) ===")
    if failures:
        for f in failures:
            print(f"  - {f}")
        return 1
    return 0


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Census + orphan gate for block_attributes.css_layer values "
        "(currently: OUTER / CONTENT / GRID / GRID_AREA — read live from the DB, "
        "never hardcoded). See module docstring for the D642 distinction."
    )
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--survey", action="store_true", help="Print the full census (default).")
    group.add_argument("--check", action="store_true", help="Ratchet against the baseline JSON.")
    group.add_argument("--self-test", action="store_true", help="Run the self-test suite.")
    args = parser.parse_args(argv)

    if args.check:
        return mode_check()
    if args.self_test:
        return mode_self_test()
    return mode_survey()


if __name__ == "__main__":
    sys.exit(main())
