"""
test_push_theme_snapshot.py
===========================
Unit tests (no network, no SSH, no live site) for the pure decisions in
`push-theme-snapshot.py`:

1. Advisory palette handling — an advisory entry that overlaid a base slug carries
   `_baseline_color` and is RESTORED at push time; one without it is removed.
2. Backup-or-abort gate — a site with a server theme.json but NO wp_global_styles post yet
   (fresh site) proceeds; a genuine fetch failure still aborts.
3. Exit code — a successful push whose wp_global_styles post does not exist exits 0; a
   failed one still exits non-zero.

Run from plugins/sgs-blocks/scripts:
    python -m pytest tests/test_push_theme_snapshot.py -q

UK English throughout.
"""

from __future__ import annotations

import copy
import importlib.util
import json
import subprocess
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest

SCRIPT = Path(__file__).resolve().parent.parent / "push-theme-snapshot.py"
REPO = SCRIPT.parents[3]


@pytest.fixture(scope="module")
def pts():
    spec = importlib.util.spec_from_file_location("pts_under_test", SCRIPT)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def _snap(palette: list) -> dict:
    return {"version": 3, "styles": {"x": 1},
            "settings": {"color": {"palette": palette, "custom": True}}}


def _pal(snap: dict) -> list:
    return snap["settings"]["color"]["palette"]


ADVISORY_OVERLAID = {"slug": "accent", "color": "#9C8B78", "name": "Accent",
                     "_source": "derived", "confidence": 0.4, "advisory": True,
                     "_baseline_color": "#E68A95"}
ADVISORY_NEW = {"slug": "ink", "color": "#111111", "name": "Ink", "_source": "derived",
                "confidence": 0.3, "advisory": True}
DECLARED = {"slug": "primary", "color": "#112233", "name": "Primary", "_source": "declared"}


# ---------------------------------------------------------------------------
# 1. Advisory handling
# ---------------------------------------------------------------------------
def test_advisory_with_baseline_is_restored(pts):
    out, restored, removed = pts.apply_advisory_policy(_snap([ADVISORY_OVERLAID]))
    assert (restored, removed) == (1, 0)
    assert _pal(out) == [{"slug": "accent", "color": "#E68A95", "name": "Accent"}]


def test_advisory_without_baseline_is_deleted(pts):
    out, restored, removed = pts.apply_advisory_policy(_snap([ADVISORY_NEW]))
    assert (restored, removed) == (0, 1)
    assert _pal(out) == []


# Shaped exactly like the entries the committed Eye Care snapshot carries (an older extractor wrote
# them with no _baseline_color): slugs the framework base palette HAS.
OLD_STYLE_SURFACE = {"slug": "surface", "color": "#faf8f5", "name": "Surface", "_source": "derived",
                     "confidence": 0.95, "advisory": True}


def _base_palette() -> dict:
    theme = json.loads((REPO / "theme" / "sgs-theme" / "theme.json").read_text(encoding="utf-8"))
    return {e["slug"]: e["color"] for e in theme["settings"]["color"]["palette"]}


def test_advisory_base_slug_without_baseline_is_restored_not_deleted(pts):
    """The proven defect: pushing the committed Eye Care snapshot deleted the base slugs surface,
    surface-alt and text, because their advisory entries carried no _baseline_color."""
    base = _base_palette()
    entries = [OLD_STYLE_SURFACE,
               dict(OLD_STYLE_SURFACE, slug="surface-alt", name="Surface Alt", color="#bdc1c6"),
               dict(OLD_STYLE_SURFACE, slug="text", name="Text", color="#141414")]
    out, restored, removed = pts.apply_advisory_policy(_snap(entries))
    assert (restored, removed) == (3, 0)
    assert [(e["slug"], e["color"]) for e in _pal(out)] == [
        ("surface", base["surface"]), ("surface-alt", base["surface-alt"]), ("text", base["text"])]
    assert all("advisory" not in e and "_source" not in e for e in _pal(out))


def test_advisory_without_baseline_and_not_a_base_slug_is_still_removed(pts):
    out, restored, removed = pts.apply_advisory_policy(_snap([OLD_STYLE_SURFACE, ADVISORY_NEW]))
    assert (restored, removed) == (1, 1)
    assert [e["slug"] for e in _pal(out)] == ["surface"]


def test_baseline_colour_wins_over_the_base_palette_lookup(pts):
    out, _, _ = pts.apply_advisory_policy(_snap([dict(OLD_STYLE_SURFACE, _baseline_color="#123456")]))
    assert _pal(out)[0]["color"] == "#123456"


def test_the_committed_eye_care_snapshot_keeps_every_base_slug_through_the_push_policy(pts):
    path = REPO / "sites" / "eye-care-ward-end" / "theme-snapshot.json"
    if not path.is_file():
        pytest.skip("Eye Care snapshot not present")
    snap = json.loads(path.read_text(encoding="utf-8"))
    base = _base_palette()
    slugs_before = {e["slug"] for e in _pal(snap)}
    out, _, _ = pts.apply_advisory_policy(snap)
    assert {s for s in base if s in slugs_before} <= {e["slug"] for e in _pal(out)}


def test_mixed_list_keeps_order_and_counts(pts):
    snap = _snap([DECLARED, ADVISORY_NEW, ADVISORY_OVERLAID,
                  {"slug": "surface", "color": "#fff", "name": "Surface"}])
    out, restored, removed = pts.apply_advisory_policy(snap)
    assert (restored, removed) == (1, 1)
    assert [e["slug"] for e in _pal(out)] == ["primary", "accent", "surface"]
    assert _pal(out)[1]["color"] == "#E68A95"


def test_all_advisory_palette_never_pushes_empty(pts):
    """The proven defect: an all-advisory overlaid palette used to push an EMPTY palette."""
    overlaid = [dict(ADVISORY_OVERLAID, slug=f"s{i}", _baseline_color=f"#00000{i}") for i in range(3)]
    out, restored, removed = pts.apply_advisory_policy(_snap(overlaid))
    assert restored == 3 and removed == 0
    assert [e["color"] for e in _pal(out)] == ["#000000", "#000001", "#000002"]


def test_non_advisory_and_other_keys_untouched(pts):
    snap = _snap([DECLARED, ADVISORY_OVERLAID])
    before = copy.deepcopy(snap)
    out, _, _ = pts.apply_advisory_policy(snap)
    assert snap == before                                  # input not mutated
    assert _pal(out)[0] == DECLARED
    assert out["styles"] == before["styles"]
    assert out["settings"]["color"]["custom"] is True


def test_snapshot_without_palette_is_unchanged(pts):
    snap = {"version": 3, "settings": {}}
    out, restored, removed = pts.apply_advisory_policy(snap)
    assert out == snap and (restored, removed) == (0, 0)


def test_strip_advisory_wrapper_returns_total(pts):
    out, n = pts.strip_advisory(_snap([ADVISORY_NEW, ADVISORY_OVERLAID, DECLARED]))
    assert n == 2 and [e["slug"] for e in _pal(out)] == ["accent", "primary"]


def test_include_advisory_passes_entries_but_drops_baseline_key(pts):
    snap = _snap([DECLARED, ADVISORY_OVERLAID, ADVISORY_NEW])
    deploy, note = pts.prepare_deploy_snapshot(snap, include_advisory=True)
    pal = _pal(deploy)
    assert [e["slug"] for e in pal] == ["primary", "accent", "ink"]
    assert pal[1]["advisory"] is True and pal[1]["color"] == "#9C8B78"   # passes through
    assert all("_baseline_color" not in e for e in pal)
    assert note and "1 palette entry" in note
    assert "_baseline_color" in _pal(snap)[1]                            # input untouched


def test_include_advisory_without_baseline_keys_is_a_no_op(pts):
    snap = _snap([DECLARED, ADVISORY_NEW])
    deploy, note = pts.prepare_deploy_snapshot(snap, include_advisory=True)
    assert deploy == snap and note is None


def test_prepare_deploy_default_reports_restored_and_removed(pts):
    deploy, note = pts.prepare_deploy_snapshot(_snap([ADVISORY_OVERLAID, ADVISORY_NEW]), False)
    assert "1 advisory (derived) palette token(s) restored" in note
    assert "1 removed" in note
    assert [e["slug"] for e in _pal(deploy)] == ["accent"]


# ---------------------------------------------------------------------------
# 1b. REST credentials for a non-canary site
# ---------------------------------------------------------------------------
def _secrets_dir(tmp_path, monkeypatch, files: dict[str, str]):
    from business_info import credentials as bic
    for name, text in files.items():
        (tmp_path / name).write_text(text, encoding="utf-8")
    monkeypatch.setattr(bic, "secrets_dir", lambda: tmp_path)
    monkeypatch.delenv("SGS_WP_APP_USER", raising=False)
    monkeypatch.delenv("SGS_WP_APP_PWD", raising=False)


def test_credentials_resolve_for_a_site_that_is_not_in_the_hard_coded_map(pts, tmp_path, monkeypatch):
    _secrets_dir(tmp_path, monkeypatch, {"example.env": (
        "WP_URL_EXAMPLE=https://example-test.hostingersite.com\nWP_USER_EXAMPLE=erin\nWP_APP_PWD_EXAMPLE=ab cd\n")})
    assert pts.resolve_app_credentials("example-test.hostingersite.com", None, None) == ("erin", "abcd")


def test_known_domains_fall_back_to_their_named_file_when_no_wp_url_matches(pts, tmp_path, monkeypatch):
    _secrets_dir(tmp_path, monkeypatch, {})  # generic lookup finds nothing
    named = tmp_path / ".claude" / "secrets"
    named.mkdir(parents=True)
    (named / "sandybrown.env").write_text("WP_USER_SANDYBROWN=sam\nWP_APP_PWD_SANDYBROWN=x y\n", encoding="utf-8")
    monkeypatch.setattr(pts, "repo_root", lambda: tmp_path)
    assert pts.resolve_app_credentials("sandybrown-nightingale-600381.hostingersite.com", None, None) == ("sam", "xy")
    assert pts.resolve_app_credentials("unknown.example.test", None, None) is None


def test_a_matching_wp_url_file_beats_the_hard_coded_fallback(pts, tmp_path, monkeypatch):
    _secrets_dir(tmp_path, monkeypatch, {"sb.env": (
        "WP_URL_SB=https://sandybrown-nightingale-600381.hostingersite.com\nWP_USER_SB=generic\nWP_APP_PWD_SB=g1\n")})
    assert pts.resolve_app_credentials("sandybrown-nightingale-600381.hostingersite.com", None, None) == ("generic", "g1")


# ---------------------------------------------------------------------------
# 2. Backup-or-abort gate
# ---------------------------------------------------------------------------
THEME = {"version": 3}
GS = {"styles": {}, "settings": {}}


def test_fresh_site_theme_json_but_no_global_styles_post_proceeds(pts):
    assert pts.backup_gate(THEME, "found", None, "absent", force_no_backup=False) == "no-user-layer"


def test_real_global_styles_fetch_failure_still_aborts(pts):
    # the post EXISTS (status found) but the REST read failed
    assert pts.backup_gate(THEME, "found", None, "found", force_no_backup=False) == "abort"
    # the post lookup itself failed (SSH / parse error)
    assert pts.backup_gate(THEME, "found", None, "error", force_no_backup=False) == "abort"


def test_force_no_backup_still_overrides_a_real_failure(pts):
    assert pts.backup_gate(THEME, "found", None, "error", force_no_backup=True) == "forced"


def test_both_layers_fetched_is_ok(pts):
    assert pts.backup_gate(THEME, "found", GS, "found", force_no_backup=False) == "ok"


def test_both_layers_genuinely_absent_is_a_fresh_site(pts):
    assert pts.backup_gate(None, "absent", None, "absent", force_no_backup=False) == "fresh"


def test_a_doubly_failed_read_is_not_a_fresh_site(pts):
    """CHANGED BEHAVIOUR (2026-09-20 review). This used to assert `fresh` for (None, None, "error"),
    because a failed theme.json read and an absent one were both None and the gate could not tell
    them apart, so an SSH outage on a live site proceeded with no backup at all. The gate now
    receives the read status and treats an unreadable layer as unknown, never as empty."""
    assert pts.backup_gate(None, "error", None, "error", force_no_backup=False) == "abort"
    assert pts.backup_gate(None, "error", None, "error", force_no_backup=True) == "forced"


@pytest.mark.parametrize("server,server_status,gs,gs_status,expected", [
    (None, "error", None, "absent", "abort"),      # SSH failed, no user layer: still unknown
    (None, "error", GS, "found", "abort"),         # theme.json unreadable even though the user layer was read
    (None, "absent", None, "error", "abort"),      # theme.json genuinely absent, post lookup failed
    (None, "absent", None, "found", "abort"),      # the user-layer post exists but could not be read
    (THEME, "found", None, "error", "abort"),
    (None, "absent", GS, "found", "ok"),           # missing disk theme.json alone never blocked
    (None, "absent", None, "absent", "fresh"),
    (THEME, "found", None, "absent", "no-user-layer"),
    (THEME, "found", GS, "found", "ok"),
])
def test_backup_gate_every_combination(pts, server, server_status, gs, gs_status, expected):
    assert pts.backup_gate(server, server_status, gs, gs_status, force_no_backup=False) == expected


def _ssh(monkeypatch, pts, *, returncode=0, stdout="", stderr="", raises=None):
    def fake_run(cmd, **kwargs):
        if raises:
            raise raises
        return SimpleNamespace(returncode=returncode, stdout=stdout, stderr=stderr)
    monkeypatch.setattr(pts.subprocess, "run", fake_run)


def test_fetch_reports_found_absent_or_error_from_the_ssh_result(pts, monkeypatch):
    fetch = lambda: pts.fetch_server_theme_json("u@h", 22, "/x/theme.json")  # noqa: E731
    _ssh(monkeypatch, pts, stdout='{"version": 3}')
    assert fetch() == ({"version": 3}, "found")
    _ssh(monkeypatch, pts, returncode=1, stderr="cat: /x/theme.json: No such file or directory\n")
    assert fetch() == (None, "absent")
    _ssh(monkeypatch, pts, returncode=255, stderr="ssh: connect to host h port 22: Connection timed out")
    assert fetch() == (None, "error")
    _ssh(monkeypatch, pts, returncode=1, stderr="cat: /x/theme.json: Permission denied")
    assert fetch() == (None, "error")
    _ssh(monkeypatch, pts, returncode=255, stderr="No such file or directory")   # ssh's own failure, not cat's
    assert fetch() == (None, "error")
    _ssh(monkeypatch, pts, stdout="not json")
    assert fetch() == (None, "error")
    _ssh(monkeypatch, pts, raises=subprocess.TimeoutExpired("ssh", 20))
    assert fetch() == (None, "error")


# ---------------------------------------------------------------------------
# 3. Exit code — main() with every network / SSH / disk-writing function stubbed
# ---------------------------------------------------------------------------
def _run_main(pts, monkeypatch, *, server, gs_state, gs_body, post_ok=True, extra_args=(),
              server_status=None):
    calls: dict[str, int] = {"post": 0, "scp": 0}

    monkeypatch.setattr(sys, "argv", ["push-theme-snapshot.py", "--client", "unit-client",
                                      "--target", "user@host", "--target-domain", "unit.example.com",
                                      "--yes", *extra_args])
    monkeypatch.setattr(pts, "load_local_snapshot", lambda client: _snap([DECLARED]))
    status = server_status or ("found" if server is not None else "absent")
    monkeypatch.setattr(pts, "fetch_server_theme_json", lambda *a, **k: (server, status))
    monkeypatch.setattr(pts, "discover_global_styles_state", lambda *a, **k: gs_state)
    monkeypatch.setattr(pts, "fetch_global_styles", lambda *a, **k: gs_body)
    monkeypatch.setattr(pts, "resolve_app_credentials", lambda *a, **k: ("u", "p"))
    monkeypatch.setattr(pts, "persist_backup", lambda *a, **k: None)

    def _scp(*a, **k):
        calls["scp"] += 1
        return True

    def _post(*a, **k):
        calls["post"] += 1
        return post_ok

    monkeypatch.setattr(pts, "push_snapshot", _scp)
    monkeypatch.setattr(pts, "post_global_styles", _post)
    monkeypatch.setattr(pts, "flush_cache", lambda *a, **k: None)
    return pts.main(), calls


def test_successful_push_on_fresh_site_exits_zero(pts, monkeypatch):
    """The proven cause of the false non-zero exit: the post lookup SUCCEEDED and found no
    wp_global_styles post (post_id None), and main() then returned 1 as if discovery had failed."""
    code, calls = _run_main(pts, monkeypatch, server=THEME, gs_state=(None, "absent"), gs_body=None)
    assert code == 0
    assert calls == {"scp": 1, "post": 0}       # disk push done, user-layer write correctly skipped


def test_successful_push_with_existing_post_exits_zero(pts, monkeypatch):
    code, calls = _run_main(pts, monkeypatch, server=THEME, gs_state=(7, "found"), gs_body=GS)
    assert code == 0 and calls == {"scp": 1, "post": 1}


def test_failed_global_styles_post_still_exits_non_zero(pts, monkeypatch):
    code, _ = _run_main(pts, monkeypatch, server=THEME, gs_state=(7, "found"), gs_body=GS, post_ok=False)
    assert code == 1


def test_genuine_discovery_failure_still_exits_non_zero(pts, monkeypatch):
    # backup gate needs --force-no-backup to get this far (global_styles None, lookup errored)
    code, calls = _run_main(pts, monkeypatch, server=THEME, gs_state=(None, "error"), gs_body=None,
                            extra_args=("--force-no-backup",))
    assert code == 1 and calls["scp"] == 1 and calls["post"] == 0


def test_real_fetch_failure_aborts_before_any_push(pts, monkeypatch):
    code, calls = _run_main(pts, monkeypatch, server=THEME, gs_state=(7, "found"), gs_body=None)
    assert code == 1 and calls == {"scp": 0, "post": 0}


def test_ssh_failure_on_the_theme_json_read_aborts_before_any_push(pts, monkeypatch):
    """The doubly failed read: SSH is down, so nothing is known about either layer."""
    code, calls = _run_main(pts, monkeypatch, server=None, server_status="error",
                            gs_state=(None, "error"), gs_body=None)
    assert code == 1 and calls == {"scp": 0, "post": 0}


def test_ssh_failure_can_be_overridden_only_with_force_no_backup(pts, monkeypatch):
    code, calls = _run_main(pts, monkeypatch, server=None, server_status="error", gs_state=(None, "absent"),
                            gs_body=None, extra_args=("--force-no-backup",))
    assert code == 0 and calls["scp"] == 1


def test_genuinely_fresh_site_still_proceeds_without_a_flag(pts, monkeypatch):
    code, calls = _run_main(pts, monkeypatch, server=None, server_status="absent",
                            gs_state=(None, "absent"), gs_body=None)
    assert code == 0 and calls["scp"] == 1
