"""Stage 1's overlapped steps: the early component-adoption scan and the content-role detectors run side by side."""
import importlib.util
import json
import subprocess
import sys
import threading
import time
from pathlib import Path

import pytest

SCRIPTS = Path(__file__).resolve().parents[1]


def _load(name: str, relative: str):
    sys.path[:0] = [str(SCRIPTS / "dbschema"), str(SCRIPTS), str(SCRIPTS / "lib"), str(SCRIPTS / "content-role-detect")]
    spec = importlib.util.spec_from_file_location(name, SCRIPTS / relative)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class _Done:
    def __init__(self, returncode):
        self.returncode = returncode

    def wait(self, timeout=None):
        return self.returncode

    def kill(self):
        pass


def _stage(update, tmp_path, returncode, body):
    out = tmp_path / "scan.json"
    out.write_text(body, encoding="utf-8")
    update._ADOPTION_SCAN.update(proc=_Done(returncode), out=out, handle=out.open("rb"))
    return out


def test_a_finished_early_scan_is_handed_to_the_seeder(tmp_path):
    update = _load("update_overlap_a", "sgs-update-v2.py")
    out = _stage(update, tmp_path, 0, '{"rows": []}')
    assert update._collect_component_scan() == ["--scan-json", str(out)]


def test_a_failed_empty_or_missing_early_scan_leaves_the_seeder_to_scan_itself(tmp_path):
    update = _load("update_overlap_b", "sgs-update-v2.py")
    _stage(update, tmp_path, 1, '{"rows": []}')
    assert update._collect_component_scan() == []
    _stage(update, tmp_path, 0, "")
    assert update._collect_component_scan() == []
    assert update._collect_component_scan() == []


def test_the_seeder_reads_a_given_scan_without_running_node(tmp_path, monkeypatch):
    seeder = _load("seed_adoption_under_test", "seed-component-adoption.py")
    row = {"name": "x", "family": sorted(seeder.VALID_FAMILIES)[0], "file_path": "f", "functionality": "", "adopters": 1, "adopter_list": ["a"]}
    scan = tmp_path / "scan.json"
    scan.write_text(json.dumps({"rows": [row]}), encoding="utf-8")
    monkeypatch.setattr(subprocess, "run", lambda *a, **k: pytest.fail("the scanner was run although a scan was given"))
    assert seeder.run_scanner(scan) == [row]


def test_detectors_run_together_return_their_findings_by_name_and_a_crash_still_raises(monkeypatch):
    roles = _load("fingerprint_overlap_under_test", "content-role-detect/fingerprint_content_roles.py")
    running, peak, lock = [0], [0], threading.Lock()

    def fake_run(cmd, cwd):
        with lock:
            running[0] += 1
            peak[0] = max(peak[0], running[0])
        time.sleep(0.3)
        with lock:
            running[0] -= 1
        name = Path(cmd[1]).name
        return json.dumps({"detector": name}) + "\n"

    monkeypatch.setattr(roles, "_run", fake_run)
    found = roles.run_detectors(SCRIPTS)
    assert set(found) == {"D1", "D2", "D3"}
    assert found["D2"] == [{"detector": "detector2_editjs_controls.py"}]
    assert found["D3"] == [{"detector": "detector3_i18n_default.py"}]
    assert peak[0] >= 2, "the detectors did not overlap"

    def crashing_run(cmd, cwd):
        if "detector3" in cmd[1]:
            raise RuntimeError("detector failed")
        return ""

    monkeypatch.setattr(roles, "_run", crashing_run)
    with pytest.raises(RuntimeError):
        roles.run_detectors(SCRIPTS)
