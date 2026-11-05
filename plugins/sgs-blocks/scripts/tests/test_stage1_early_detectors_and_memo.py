"""Stage 1 speed-ups: the early content-role detector run, the per-run PHP scan memo and the side-by-side block readers."""
import importlib.util
import json
import sys
import threading
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

    def poll(self):
        return self.returncode

    def kill(self):
        pass


@pytest.fixture(scope="module")
def roles():
    return _load("fingerprint_early_under_test", "content-role-detect/fingerprint_content_roles.py")


@pytest.fixture(scope="module")
def update():
    return _load("update_early_under_test", "sgs-update-v2.py")


def test_detector_findings_come_from_the_named_file(roles, tmp_path, monkeypatch):
    findings = {"D1": [{"block_slug": "sgs/x"}], "D2": [], "D3": [{"a": 1}]}
    named = tmp_path / "d.json"
    named.write_text(json.dumps(findings), encoding="utf-8")
    monkeypatch.setenv(roles.DETECTORS_ENV, str(named))
    monkeypatch.setattr(roles, "run_detectors", lambda *a, **k: pytest.fail("the detectors ran although a file was named"))
    assert roles.detector_findings() == findings


def test_detector_findings_run_the_detectors_when_no_file_is_named(roles, monkeypatch):
    monkeypatch.delenv(roles.DETECTORS_ENV, raising=False)
    monkeypatch.setattr(roles, "run_detectors", lambda *a, **k: {"D1": [], "D2": [], "D3": []})
    assert roles.detector_findings() == {"D1": [], "D2": [], "D3": []}


@pytest.mark.parametrize("body", ['{"D1": [], "D2": []}', '{"D1": [], "D2": [], "D3": {}}', "[]", "not json"])
def test_a_named_file_with_the_wrong_shape_is_a_fault_not_no_findings(roles, tmp_path, monkeypatch, body):
    named = tmp_path / "d.json"
    named.write_text(body, encoding="utf-8")
    monkeypatch.setenv(roles.DETECTORS_ENV, str(named))
    with pytest.raises(ValueError):
        roles.detector_findings()


def test_a_missing_named_file_is_a_fault(roles, tmp_path, monkeypatch):
    monkeypatch.setenv(roles.DETECTORS_ENV, str(tmp_path / "absent.json"))
    with pytest.raises(OSError):
        roles.detector_findings()


def test_write_detectors_round_trips_through_the_file(roles, tmp_path, monkeypatch):
    findings = {"D1": [{"k": "v"}], "D2": [{"k": 2}], "D3": []}
    monkeypatch.setattr(roles, "run_detectors", lambda *a, **k: findings)
    out = tmp_path / "out.json"
    monkeypatch.setattr(sys, "argv", ["x", "--write-detectors", str(out)])
    assert roles.main() == 0
    assert roles.detectors_from_file(out) == findings


def _stage_detectors(update, tmp_path, returncode, body):
    out = tmp_path / "detectors.json"
    out.write_text(body, encoding="utf-8")
    update._DETECTOR_RUN.clear()
    update._DETECTOR_RUN.update(proc=_Done(returncode), out=out)
    return out


def test_a_finished_early_run_is_handed_to_canonical_assignment(update, tmp_path):
    out = _stage_detectors(update, tmp_path, 0, '{"D1": [], "D2": [], "D3": []}')
    assert update._collect_content_role_detectors() == {"SGS_CONTENT_ROLE_DETECTORS_JSON": str(out)}


@pytest.mark.parametrize("returncode,body", [(1, '{"D1": [], "D2": [], "D3": []}'), (0, ""), (None, "{}")])
def test_a_failed_empty_or_timed_out_early_run_leaves_canonical_assignment_to_run_them(update, tmp_path, returncode, body):
    _stage_detectors(update, tmp_path, returncode, body)
    assert update._collect_content_role_detectors() == {}


def test_no_early_run_means_no_handoff(update):
    update._DETECTOR_RUN.clear()
    assert update._collect_content_role_detectors() == {}


def _two_blocks(tmp_path):
    shared = tmp_path / "includes"
    shared.mkdir()
    (shared / "helper.php").write_text("<?php // helper", encoding="utf-8")
    blocks = tmp_path / "blocks"
    for name in ("a", "b"):
        (blocks / name).mkdir(parents=True)
        (blocks / name / "render.php").write_text("<?php require_once plugin_dir_path( __FILE__ ) . '/includes/helper.php';", encoding="utf-8")
    return shared, blocks


def test_a_shared_include_is_scanned_once_per_run_and_every_block_still_gets_its_evidence(update, tmp_path, monkeypatch):
    shared, blocks = _two_blocks(tmp_path)
    monkeypatch.setattr(update, "_INCLUDES_DIR", shared)
    seen = []

    def scan(path):
        seen.append(path.name)
        return {"fromHelper"} if path.name == "helper.php" else {"own-" + path.parent.name}

    update._reset_php_scan_memo()
    first = update._render_tier_attrs_for_block(blocks / "a" / "render.php", scan)
    second = update._render_tier_attrs_for_block(blocks / "b" / "render.php", scan)
    assert first == {"own-a", "fromHelper"} and second == {"own-b", "fromHelper"}
    assert seen.count("helper.php") == 1


def test_resetting_the_memo_sees_an_edited_file(update, tmp_path, monkeypatch):
    shared, blocks = _two_blocks(tmp_path)
    monkeypatch.setattr(update, "_INCLUDES_DIR", shared)
    scan = lambda path: {path.read_text(encoding="utf-8")} if path.name == "helper.php" else set()  # noqa: E731
    update._reset_php_scan_memo()
    assert update._render_tier_attrs_for_block(blocks / "a" / "render.php", scan) == {"<?php // helper"}
    (shared / "helper.php").write_text("<?php // edited", encoding="utf-8")
    assert update._render_tier_attrs_for_block(blocks / "a" / "render.php", scan) == {"<?php // helper"}
    update._reset_php_scan_memo()
    assert update._render_tier_attrs_for_block(blocks / "a" / "render.php", scan) == {"<?php // edited"}


def test_a_caller_mutating_a_returned_set_does_not_change_the_memo(update, tmp_path):
    update._reset_php_scan_memo()
    path = tmp_path / "render.php"
    path.write_text("<?php", encoding="utf-8")
    scan = lambda p: {"x"}  # noqa: E731
    first = update._scan_once(scan, path)
    first.add("poison")
    assert update._scan_once(scan, path) == {"x"}


def test_block_source_runs_both_readers_side_by_side_and_keeps_both_results(monkeypatch):
    block_source = _load("block_source_under_test", "dbschema/block_source.py")
    gate = threading.Barrier(2, timeout=10)

    def fake_run(cmd, cwd):
        gate.wait()  # only passes when both readers are running at the same moment
        return {"reader": cmd[0]}

    monkeypatch.setattr(block_source, "_run", fake_run)
    source = block_source.BlockSource.read(Path("."))
    assert source.js == {"reader": "node"} and source.php == {"reader": "php"}


def test_block_source_raises_when_either_reader_fails(monkeypatch):
    block_source = _load("block_source_under_test2", "dbschema/block_source.py")

    def fake_run(cmd, cwd):
        if cmd[0] == "php":
            raise block_source.BlockSourceError("php failed")
        return {}

    monkeypatch.setattr(block_source, "_run", fake_run)
    with pytest.raises(block_source.BlockSourceError):
        block_source.BlockSource.read(Path("."))


class _Conn:
    def commit(self):
        pass


def _run_canonical(update, monkeypatch, env_before, collected):
    seen = {}

    class _Result:
        returncode = 0
        stdout = ""
        stderr = ""

    def fake_run(cmd, **kwargs):
        seen["env"] = kwargs["env"]
        return _Result()

    monkeypatch.setattr(update.subprocess, "run", fake_run)
    monkeypatch.setattr(update, "_collect_content_role_detectors", lambda: collected)
    for key, value in env_before.items():
        monkeypatch.setenv(key, value)
    update._run_canonical_assignment(_Conn())
    return seen["env"]


def test_a_stale_detector_file_in_the_shell_never_reaches_canonical_assignment(update, monkeypatch):
    env = _run_canonical(update, monkeypatch, {"SGS_CONTENT_ROLE_DETECTORS_JSON": "C:/old/run.json"}, {})
    assert "SGS_CONTENT_ROLE_DETECTORS_JSON" not in env


def test_the_early_runs_file_reaches_canonical_assignment(update, monkeypatch):
    env = _run_canonical(update, monkeypatch, {"SGS_CONTENT_ROLE_DETECTORS_JSON": "C:/old/run.json"}, {"SGS_CONTENT_ROLE_DETECTORS_JSON": "C:/new/run.json"})
    assert env["SGS_CONTENT_ROLE_DETECTORS_JSON"] == "C:/new/run.json"


def test_the_early_run_is_discarded_once_canonical_assignment_is_done(update, monkeypatch, tmp_path):
    folder = tmp_path / "sgs-detectors-x"
    folder.mkdir()
    update._DETECTOR_RUN.clear()
    update._DETECTOR_RUN.update(proc=_Done(0), out=folder / "detectors.json")
    _run_canonical(update, monkeypatch, {}, {})
    assert not update._DETECTOR_RUN and not folder.exists()
