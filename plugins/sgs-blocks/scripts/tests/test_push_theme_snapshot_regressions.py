"""
Regression tests for push-theme-snapshot.py: list-aware drift detection and honest rollback failure.

Run from repo root:
    python -m pytest plugins/sgs-blocks/scripts/tests/test_push_theme_snapshot_regressions.py -q
"""
import importlib.util
import sys
import types
from pathlib import Path

SCRIPT = Path(__file__).resolve().parent.parent / "push-theme-snapshot.py"
_spec = importlib.util.spec_from_file_location("push_theme_snapshot", SCRIPT)
pts = importlib.util.module_from_spec(_spec)
sys.modules["push_theme_snapshot"] = pts
_spec.loader.exec_module(pts)


def test_collect_leaves_keeps_list_items_apart():
    leaves = pts.collect_leaves({"palette": [{"a": "#f00"}, {"b": "#000"}]})
    assert leaves == {"palette[0].a": "#f00", "palette[1].b": "#000"}


def test_drift_warning_reports_a_changed_list_item():
    live = {"settings": {"color": {"palette": [{"c": "#f00"}, {"c": "#000"}]}}}
    ours = {"settings": {"color": {"palette": [{"c": "#0f0"}, {"c": "#000"}]}}}
    assert pts.drift_warning(ours, live) == 1


def _rollback_args(tmp_path, monkeypatch):
    backup = tmp_path / "backup.json"
    backup.write_text('{"server_theme_json": {"a": 1}, "wp_global_styles": {"styles": {}}}', encoding="utf-8")
    monkeypatch.setattr(pts, "_backup_dir", lambda client: tmp_path)
    monkeypatch.setattr(pts, "push_snapshot", lambda *a, **k: True)
    monkeypatch.setattr(pts, "flush_cache", lambda *a, **k: None)
    monkeypatch.setattr(pts, "_basic_auth_header", lambda *a: "Basic x")
    return types.SimpleNamespace(
        rollback=str(backup), client="c", target="t", port=1, target_domain="d.example",
        app_user=None, app_password=None,
    )


def test_rollback_fails_when_global_styles_post_fails(tmp_path, monkeypatch, capsys):
    args = _rollback_args(tmp_path, monkeypatch)
    monkeypatch.setattr(pts, "resolve_app_credentials", lambda *a: ("u", "p"))
    monkeypatch.setattr(pts, "discover_global_styles_post_id", lambda *a: 7)
    monkeypatch.setattr(pts, "post_global_styles", lambda *a, **k: False)
    assert pts.do_rollback(args) == 1
    assert "ROLLBACK INCOMPLETE" in capsys.readouterr().err


def test_rollback_fails_when_no_credentials(tmp_path, monkeypatch, capsys):
    args = _rollback_args(tmp_path, monkeypatch)
    monkeypatch.setattr(pts, "resolve_app_credentials", lambda *a: None)
    assert pts.do_rollback(args) == 1
    assert "ROLLBACK INCOMPLETE" in capsys.readouterr().err


def test_rollback_succeeds_when_global_styles_restored(tmp_path, monkeypatch):
    args = _rollback_args(tmp_path, monkeypatch)
    monkeypatch.setattr(pts, "resolve_app_credentials", lambda *a: ("u", "p"))
    monkeypatch.setattr(pts, "discover_global_styles_post_id", lambda *a: 7)
    monkeypatch.setattr(pts, "post_global_styles", lambda *a, **k: True)
    assert pts.do_rollback(args) == 0
