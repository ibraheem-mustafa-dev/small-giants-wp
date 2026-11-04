"""Stage 2's upstream-scrape cache and Stage 12's scanner pool (sgs-update-v2.py)."""
import importlib.util
import sqlite3
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parents[1]

SCANNER_TEMPLATE = """import time
log = open(r'{log}', 'a')
log.write('{name} start ' + str(time.time()) + '\\n')
log.flush()
time.sleep(1.0)
log.write('{name} end ' + str(time.time()) + '\\n')
log.close()
"""


def _load():
    sys.path.insert(0, str(SCRIPTS / "dbschema"))
    sys.path.insert(0, str(SCRIPTS))
    spec = importlib.util.spec_from_file_location("sgs_update_speedups_under_test", SCRIPTS / "sgs-update-v2.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _conn(refreshed_hours_ago, version="7.1"):
    conn = sqlite3.connect(":memory:")
    conn.execute("CREATE TABLE schema_metadata (key TEXT PRIMARY KEY, value TEXT)")
    if refreshed_hours_ago is not None:
        stamp = (datetime.now(timezone.utc) - timedelta(hours=refreshed_hours_ago)).isoformat()
        conn.executemany("INSERT INTO schema_metadata VALUES (?, ?)", [("last_full_refresh_ts", stamp), ("wp_version_indexed", version)])
    return conn


def test_recent_refresh_for_the_same_version_skips_the_scrape(monkeypatch):
    update = _load()
    calls = []
    monkeypatch.setattr(update, "_mode_b_refresh_upstream", lambda *a, **k: calls.append(k) or {"status": "refreshed"})
    result = update.stage_2_core_gutenberg_cache_refresh(_conn(2), wp_version="7.1")
    assert result["status"] == "cached" and calls == []


def test_old_refresh_other_version_missing_record_or_force_scrape(monkeypatch):
    update = _load()
    calls = []
    monkeypatch.setattr(update, "_mode_b_refresh_upstream", lambda *a, **k: calls.append(k) or {"status": "refreshed"})
    for conn, kwargs in ((_conn(25), {}), (_conn(2, "7.0"), {}), (_conn(None), {}), (_conn(2), {"force": True})):
        assert update.stage_2_core_gutenberg_cache_refresh(conn, wp_version="7.1", **kwargs)["status"] == "refreshed"
    assert len(calls) == 4


def test_scanner_pool_runs_build_roster_first_and_alone_and_the_rest_together(tmp_path):
    update = _load()
    log = tmp_path / "log.txt"
    scripts = tmp_path / "s"
    scripts.mkdir()
    for name in ("build-roster", "a", "b", "c"):
        (scripts / f"{name}.py").write_text(SCANNER_TEMPLATE.format(log=log, name=name), encoding="utf-8")
    scanners = [("a.py", "a", []), ("build-roster.py", "build-roster", []), ("b.py", "b", []), ("c.py", "c", []), ("gone.py", "gone", [])]
    began = time.perf_counter()
    outcomes = update._prerun_scanners(scripts, scanners, workers=3)
    elapsed = time.perf_counter() - began
    assert set(outcomes) == {"build-roster", "a", "b", "c", "gone"}
    assert outcomes["gone"] is None and all(outcomes[k].returncode == 0 for k in ("build-roster", "a", "b", "c"))
    events = [line.split() for line in log.read_text().splitlines()]
    roster_end = next(float(t) for n, e, t in events if n == "build-roster" and e == "end")
    assert all(float(t) >= roster_end for n, e, t in events if n != "build-roster" and e == "start")
    starts = sorted(float(t) for n, e, t in events if n != "build-roster" and e == "start")
    first_end = min(float(t) for n, e, t in events if n != "build-roster" and e == "end")
    assert starts[-1] < first_end  # all three overlapped; run one after another the last would start after the first ended
    assert elapsed < 6
