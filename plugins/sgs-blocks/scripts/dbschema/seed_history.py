#!/usr/bin/env python3
"""Record the last N seeding runs' row counts and REPORT what moved unexpectedly.

WHY THIS EXISTS (and what it replaced)
--------------------------------------
This is the successor to ``dbschema/check_row_floor.py``'s row-count FLOOR, which
was deleted on 2026-08-07. The floor tracked an absolute minimum per table/column
and FAILED the build below it. Two things were wrong with that shape, and they were
the worst possible pair:

  * It failed LOUDLY on INTENDED reductions. Deliberately dropping a batch of
    ``attribute_gap_candidates`` tripped the gate; the operator's only moves were
    "re-baseline" (which silently accepts whatever actually happened, intended or
    not) or "be blocked". A gate whose normal resolution is to overwrite itself is
    not measuring anything.
  * It passed SILENTLY on real losses, because a floor is a single number sitting
    well below the live count. ``emit_shape`` had floor 199 against 237 live, so
    losing all 38 ``child`` rows landed exactly ON the floor and read green.

So it cried wolf on intent and stayed quiet on loss. This tool inverts that: it
never blocks anything, and it judges a change against what this database's OWN
recent runs actually did, rather than against a hand-set constant.

WHAT IT DOES
------------
``--record`` (wired into the END of every ``sgs-update-v2.py`` full run) appends
one entry — a UTC timestamp plus the row count of every table and the populated
count of every seeded column — to ``seed-history.json``, keeps only the last
``KEEP_RUNS`` entries, and prints a report comparing the new entry to the one
before it.

``--report`` does the same comparison WITHOUT appending, for when you want to look
without recording (e.g. mid-session, or from another track's session).

WHY IT STAYS SMALL
------------------
Ring buffer, fixed width: ~46 integers per entry (one per table + one per seeded
column) × 5 entries. Appending a 6th drops the oldest. There is no per-row detail,
no diff text, no growth log — the file cannot grow with the age of the project,
only with the width of the schema.

WHAT "UNEXPECTED" MEANS HERE (the whole point — it must stay QUIET on normal runs)
---------------------------------------------------------------------------------
A change is ALARMING only if at least one of these holds:

  1. the metric vanished (table/column no longer exists), or
  2. it went to zero from non-zero (emptied), or
  3. the swing is >= ``PCT_ALARM``% of the previous count, or
  4. the absolute swing EXCEEDS every swing in the recorded history and is at
     least ``MIN_ABS_ALARM`` rows.

Rule 4 is the one that makes this adaptive: ``attribute_gap_candidates`` moving by
a few hundred is unremarkable because it has moved by a few hundred before, and the
history says so. Anything smaller is summarised as a count, not printed — otherwise
this becomes noise and gets ignored, which is how the floor died.

Nothing here returns a failing exit code for a data finding. rc is 0 for any
successful run and 2 only for an operational error (unreadable/malformed history
file). If a count needs to BLOCK a build, that is a value-identity assertion in
``check_value_identity.py``, not a count.

⚠ IMPORTS sqlite3 ONLY — NEVER ``db_lookup``, DIRECTLY OR INDIRECTLY.
``converter/db/db_lookup.py`` re-asserts seeded roles at MODULE LOAD. Anything that
imports it REPAIRS the drift before it can be observed, so a recorder that imported
it would faithfully record the healed state and report "nothing changed" through a
real loss. A history recorder that heals what it is measuring is worthless. This is
the same constraint ``check_value_identity.py`` carries, for the same reason.
"""

from __future__ import annotations

import argparse
import json
import sqlite3
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
SEED_HISTORY_JSON = HERE / "seed-history.json"
NOTINT = "name NOT LIKE 'sqlite@_%' ESCAPE '@'"
LIVE_DB_DEFAULT = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"

#: How many runs the ring buffer holds. Bean's spec: five — enough history to know
#: what this DB's normal movement looks like, small enough that the file never
#: becomes a log nobody reads.
KEEP_RUNS = 5

#: A swing of this percentage of the previous count is alarming on its own, however
#: small the absolute number — it is how a small, fully-seeded column losing half its
#: rows gets noticed at all.
PCT_ALARM = 10.0

#: Floor on rule 4 (record-breaking absolute swing). Without it, a metric whose
#: history happens to be perfectly flat would alarm on a single row moving.
MIN_ABS_ALARM = 5

# --------------------------------------------------------------------------
# The curated seeded-column roster (moved here from check_row_floor.py, 2026-08-07,
# when that script was reduced to value-identity assertions only — this is now its
# single home).
#
# Every entry is a column known to hold structurally load-bearing data (not
# free-text commentary) that the converter/pipeline actually reads. Extend it
# deliberately when a new column earns that status; never by mechanically adding
# every nullable column in the schema (most populate opportunistically and would
# only add noise).
#
# NOTE: a population count is the right instrument for a CACHED fact and the wrong
# one for a DERIVED fact. ``block_composition.has_inner_blocks`` is deliberately
# absent: FR-31-2.6 RETIRED it as a cached column, and the surviving signal is
# derived fresh at convert time by ``converter/services/has_inner.py``. Before
# adding an entry, confirm the value is genuinely STORED. Pairs absent from the
# live schema are skipped silently by ``collect_counts`` (that is schema drift,
# which ``check_schema_drift.py`` owns) — so a retired column left listed here
# would sit inert and read as covered.
SEEDED_COLUMNS: list[tuple[str, str]] = [
    ("block_composition", "container_kind"),
    ("block_composition", "wraps_block"),
    ("block_attributes", "emit_shape"),
    ("block_attributes", "css_property"),
    ("block_attributes", "box_family"),
    ("block_attributes", "canonical_slot"),
    ("block_attributes", "role"),
    ("blocks", "variant_attr"),
    ("blocks", "tier"),
    ("roles", "classification"),
]


class SeedHistoryError(RuntimeError):
    pass


# --------------------------------------------------------------------------
# counting (sqlite3 only)
# --------------------------------------------------------------------------

def table_names(con: sqlite3.Connection) -> list[str]:
    return [
        r[0]
        for r in con.execute(
            f"SELECT name FROM sqlite_master WHERE type='table' AND {NOTINT} ORDER BY name"
        )
    ]


def collect_counts(
    con: sqlite3.Connection, seeded_columns: list[tuple[str, str]] = SEEDED_COLUMNS
) -> dict[str, int]:
    """Return a FLAT ``{metric_name: count}`` map.

    Tables are keyed by bare name, seeded columns by ``table.column``. Flat because
    every consumer here treats the two granularities identically, and a flat map
    keeps the stored entry half the size of a nested one.
    """
    live_tables = set(table_names(con))
    counts: dict[str, int] = {t: con.execute(f'SELECT COUNT(*) FROM "{t}"').fetchone()[0]
                              for t in sorted(live_tables)}
    for table, column in seeded_columns:
        if table not in live_tables:
            continue
        existing = {row[1] for row in con.execute(f'PRAGMA table_info("{table}")')}
        if column not in existing:
            continue
        counts[f"{table}.{column}"] = con.execute(
            f'SELECT COUNT(*) FROM "{table}" WHERE "{column}" IS NOT NULL AND "{column}" != \'\''
        ).fetchone()[0]
    return counts


# --------------------------------------------------------------------------
# history file I/O
# --------------------------------------------------------------------------

def load_history(path: Path) -> dict:
    if not path.exists():
        return {"keep": KEEP_RUNS, "runs": []}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise SeedHistoryError(f"malformed history file at {path}: {exc}") from exc
    if not isinstance(data, dict) or not isinstance(data.get("runs"), list):
        raise SeedHistoryError(f"malformed history file at {path} — missing a 'runs' list")
    return data


def save_history(path: Path, runs: list[dict]) -> None:
    payload = {
        "note": (
            "Rolling record of the last %d seeding runs. Written by dbschema/seed_history.py "
            "--record at the end of every sgs-update-v2.py full run. REPORTING ONLY — nothing "
            "here blocks a build. Oldest entry is dropped on append." % KEEP_RUNS
        ),
        "keep": KEEP_RUNS,
        "runs": runs[-KEEP_RUNS:],
    }
    path.write_text(json.dumps(payload, indent=2, sort_keys=False) + "\n", encoding="utf-8")


# --------------------------------------------------------------------------
# analysis
# --------------------------------------------------------------------------

def prior_deltas(runs: list[dict], metric: str) -> list[int]:
    """Absolute run-to-run swings for ``metric`` across the recorded history.

    Only consecutive pairs where the metric is present on BOTH sides count — an
    appearance or disappearance is not a swing, and treating it as one would
    inflate the "normal movement" band and hide a later real loss.
    """
    deltas: list[int] = []
    for older, newer in zip(runs, runs[1:]):
        a, b = older.get("counts", {}), newer.get("counts", {})
        if metric in a and metric in b:
            deltas.append(abs(b[metric] - a[metric]))
    return deltas


def analyse(runs: list[dict], latest: dict[str, int]) -> dict:
    """Compare ``latest`` against the last recorded run.

    ``runs`` is the history BEFORE ``latest`` is appended. Returns
    ``{"alerts": [...], "quiet": [...], "new": [...], "baseline": bool}``.
    """
    if not runs:
        return {"alerts": [], "quiet": [], "new": sorted(latest), "baseline": True}

    previous = runs[-1].get("counts", {})
    alerts: list[str] = []
    quiet: list[str] = []
    new: list[str] = []

    for metric in sorted(set(previous) | set(latest)):
        if metric not in previous:
            new.append(metric)
            continue
        prev = previous[metric]
        if metric not in latest:
            alerts.append(
                f"{metric}: {prev} -> GONE — the table or column no longer exists. That is "
                "schema drift (check_schema_drift.py owns it), but the data it held is gone too."
            )
            continue
        cur = latest[metric]
        delta = cur - prev
        if delta == 0:
            continue

        pct = (delta / prev * 100.0) if prev else 100.0
        history = prior_deltas(runs, metric)
        biggest_before = max(history, default=0)
        direction = "drop" if delta < 0 else "rise"

        reasons: list[str] = []
        if cur == 0 and prev > 0:
            reasons.append("EMPTIED — went to zero")
        if abs(pct) >= PCT_ALARM:
            reasons.append(f"{abs(pct):.0f}% swing")
        if history and abs(delta) > biggest_before and abs(delta) >= MIN_ABS_ALARM:
            reasons.append(
                f"largest single-run {direction} in the recorded history "
                f"(previous largest swing {biggest_before})"
            )

        line = f"{metric}: {prev} -> {cur} ({delta:+d}, {pct:+.0f}%)"
        if reasons:
            alerts.append(f"{line} — {'; '.join(reasons)}")
        else:
            quiet.append(line)

    return {"alerts": alerts, "quiet": quiet, "new": new, "baseline": False}


def print_report(result: dict, history_len: int, path: Path) -> None:
    if result["baseline"]:
        print(
            f"SEED HISTORY: first recorded run — {len(result['new'])} metric(s) baselined into "
            f"{path.name}. Nothing to compare against yet; the next run gets a real report."
        )
        return

    if result["alerts"]:
        print(f"SEED HISTORY: {len(result['alerts'])} UNEXPECTED change(s) vs the previous run:")
        for a in result["alerts"]:
            print(f"  ! {a}")
        print(
            "\n  These are REPORTED, not gated — nothing is blocked. If the change was "
            "intended, no action is needed and the next run will treat this size of swing "
            "as normal. If it was not, find the writer that stopped populating the data "
            "before running anything else that reseeds."
        )
    else:
        print("SEED HISTORY: no unexpected changes vs the previous run.")

    print(
        f"  {len(result['quiet'])} metric(s) moved within recent norms; "
        f"{len(result['new'])} new metric(s); {history_len} run(s) on record (keep={KEEP_RUNS})."
    )
    if result["new"]:
        print(f"    new: {', '.join(result['new'])}")


# --------------------------------------------------------------------------
# commands
# --------------------------------------------------------------------------

def read_live(live_db: Path) -> dict[str, int] | None:
    if not live_db.exists():
        print(
            f"SEED HISTORY SKIPPED — DB not found: {live_db}\n"
            "  Expected on a machine without the local dev DB (it is unversioned by design)."
        )
        return None
    con = sqlite3.connect(f"file:{live_db}?mode=ro", uri=True)
    try:
        return collect_counts(con)
    finally:
        con.close()


def cmd_record(history_path: Path, live_db: Path) -> int:
    counts = read_live(live_db)
    if counts is None:
        return 0
    history = load_history(history_path)
    runs = history["runs"]
    result = analyse(runs, counts)
    runs.append({
        "at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "counts": counts,
    })
    save_history(history_path, runs)
    print_report(result, min(len(runs), KEEP_RUNS), history_path)
    return 0


def cmd_report(history_path: Path, live_db: Path) -> int:
    counts = read_live(live_db)
    if counts is None:
        return 0
    history = load_history(history_path)
    result = analyse(history["runs"], counts)
    print_report(result, len(history["runs"]), history_path)
    if not history["runs"]:
        print("  (nothing recorded yet — run --record at the end of an sgs-update run)")
    return 0


# --------------------------------------------------------------------------
# self-test — a tool that has never been shown to report the thing it exists to
# report is decoration. All four arms run the REAL --record path against a throwaway
# sqlite DB and a throwaway history file; none of them touches the live database.
# --------------------------------------------------------------------------

def _toy_db(path: Path, rows: int) -> None:
    con = sqlite3.connect(str(path))
    con.execute("CREATE TABLE IF NOT EXISTS widgets (id INTEGER PRIMARY KEY, kind TEXT)")
    con.execute("DELETE FROM widgets")
    con.executemany("INSERT INTO widgets (kind) VALUES (?)", [("alpha",)] * rows)
    con.commit()
    con.close()


def _self_test() -> int:
    failures: list[str] = []
    tmp = Path(tempfile.mkdtemp(prefix="sgs-seed-history-selftest-"))
    db = tmp / "toy.db"
    hist = tmp / "seed-history.json"

    def counts_of() -> dict[str, int]:
        con = sqlite3.connect(f"file:{db}?mode=ro", uri=True)
        try:
            return collect_counts(con, [("widgets", "kind")])
        finally:
            con.close()

    def record() -> dict:
        """The real record path, minus the live-DB default."""
        counts = counts_of()
        history = load_history(hist)
        runs = history["runs"]
        res = analyse(runs, counts)
        runs.append({"at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                     "counts": counts})
        save_history(hist, runs)
        return res

    # --- CASE D: first-ever run, no history file at all ---------------------
    print("case (d) — first-ever run, no history file: must behave sensibly, not crash "
          "and not false-alarm:")
    _toy_db(db, 237)
    res = record()
    if not res["baseline"] or res["alerts"]:
        failures.append(f"first run did not read as a clean baseline: {res}")
        print(f"  FAIL  {res}")
    elif not hist.exists():
        failures.append("first run did not create the history file")
        print("  FAIL  no history file written")
    else:
        print(f"  PASS  baseline recorded, 0 alerts, {len(res['new'])} metric(s) baselined")

    # --- CASE A: a normal run appends one entry and reports nothing alarming --
    print("\ncase (a) — normal run (237 -> 240, +1%): appends one entry, reports nothing "
          "alarming:")
    before_entries = len(load_history(hist)["runs"])
    _toy_db(db, 240)
    res = record()
    after_entries = len(load_history(hist)["runs"])
    if after_entries != before_entries + 1:
        failures.append(f"normal run did not append exactly one entry: {before_entries}->{after_entries}")
        print(f"  FAIL  entries {before_entries}->{after_entries}")
    elif res["alerts"]:
        failures.append(f"normal run raised a false alarm: {res['alerts']}")
        print(f"  FAIL  alerts={res['alerts']}")
    else:
        print(f"  PASS  entries {before_entries}->{after_entries}, 0 alerts, "
              f"quiet={res['quiet']}")

    # --- CASE B: a large unexpected drop is REPORTED with the right magnitude -
    # Two more small runs first, so the history holds a real "normal movement" band
    # (+3, +2, +2) and the rule-4 claim about a record-breaking swing is honest.
    print("\ncase (b) — build a normal band (+3, +2, +2), then drop 240 -> 199: must be "
          "REPORTED with the right magnitude:")
    for n in (242, 244):
        _toy_db(db, n)
        record()
    _toy_db(db, 199)
    # Confirm the break actually landed in the data before asserting on the report
    # (do not trust that the rewrite did what was intended).
    landed = counts_of()["widgets"]
    if landed != 199:
        failures.append(f"the drop did not land in the toy DB: widgets={landed}")
        print(f"  FAIL  toy DB shows widgets={landed}, expected 199")
    else:
        res = record()
        hits = [a for a in res["alerts"] if a.startswith("widgets:")]
        ok = bool(hits) and "244 -> 199" in hits[0] and "-45" in hits[0] and "-18%" in hits[0] \
            and "largest single-run drop" in hits[0]
        col_hits = [a for a in res["alerts"] if a.startswith("widgets.kind:")]
        if not ok or not col_hits:
            failures.append(f"large drop not reported correctly: {res['alerts']}")
            print(f"  FAIL  alerts={res['alerts']}")
        else:
            print("  PASS  reported, table AND seeded column both:")
            for a in res["alerts"]:
                print(f"    ! {a}")

    # --- CASE C: ring buffer holds at exactly 5 and drops the oldest ---------
    print(f"\ncase (c) — ring buffer holds at exactly {KEEP_RUNS} and drops the oldest:")
    runs_now = load_history(hist)["runs"]
    oldest_ts_before = runs_now[0]["at"]
    oldest_counts_before = runs_now[0]["counts"]["widgets"]
    for n in (200, 201, 202):
        _toy_db(db, n)
        record()
    runs_after = load_history(hist)["runs"]
    dropped = not any(
        r["at"] == oldest_ts_before and r["counts"]["widgets"] == oldest_counts_before
        for r in runs_after
    )
    if len(runs_after) != KEEP_RUNS:
        failures.append(f"ring buffer holds {len(runs_after)} entries, expected {KEEP_RUNS}")
        print(f"  FAIL  {len(runs_after)} entries")
    elif not dropped:
        failures.append("oldest entry was not dropped by the ring buffer")
        print("  FAIL  oldest entry survived")
    else:
        print(f"  PASS  {len(runs_after)} entries after 8 recorded runs; the oldest "
              f"(widgets={oldest_counts_before}) was dropped. Newest first-to-last: "
              + ", ".join(str(r['counts']['widgets']) for r in runs_after))

    # --- negative control for case (c): prove the assertion could have failed --
    # A buffer check that cannot fail reads green forever. Force a 6-entry list past
    # save_history and confirm it is TRIMMED, not accepted.
    save_history(hist, runs_after + [{"at": "1999-01-01T00:00:00Z", "counts": {"widgets": 1}}])
    trimmed = load_history(hist)["runs"]
    if len(trimmed) != KEEP_RUNS:
        failures.append(f"save_history accepted {len(trimmed)} entries past the cap")
        print(f"  FAIL  negative control: cap not enforced ({len(trimmed)})")
    else:
        print(f"  PASS  negative control: a deliberate {KEEP_RUNS + 1}-entry write was "
              f"trimmed back to {KEEP_RUNS}")

    size = hist.stat().st_size
    print(f"\nhistory file size with {KEEP_RUNS} entries of this toy schema: {size} bytes")

    import shutil

    shutil.rmtree(tmp, ignore_errors=True)

    print()
    if failures:
        print(f"SELF-TEST FAILED ({len(failures)}):")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("SELF-TEST PASSED — quiet on a normal run, loud with the right magnitude on a "
          "real drop, ring buffer capped at 5, and a first-ever run baselines cleanly.")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    ap.add_argument("--history", type=Path, default=SEED_HISTORY_JSON,
                    help="history file (default: sibling seed-history.json)")
    ap.add_argument("--live-db", type=Path, default=LIVE_DB_DEFAULT,
                    help="live database, opened READ-ONLY (default: the real knowledge base)")
    ap.add_argument("--record", action="store_true",
                    help="append this run's counts, trim to the last %d, and report" % KEEP_RUNS)
    ap.add_argument("--report", action="store_true",
                    help="report live counts vs the last recorded run WITHOUT appending")
    ap.add_argument("--self-test", action="store_true",
                    help="prove the reporter is quiet on a normal run, loud on a real drop, "
                         "caps the ring buffer, and survives a first-ever run")
    args = ap.parse_args()

    try:
        if args.self_test:
            return _self_test()
        if args.record:
            return cmd_record(args.history, args.live_db)
        if args.report:
            return cmd_report(args.history, args.live_db)
    except SeedHistoryError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2

    ap.print_help()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
