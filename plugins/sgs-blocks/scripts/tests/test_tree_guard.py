"""test_tree_guard.py -- the stale-checkout guard on the shared framework DB writers.

Proves ``dbschema/tree_guard.py`` refuses a reseed from a tree that is behind the local
``origin/main`` ref, and that ``sgs-update-v2.py`` and ``dbschema/seed_reference_data.py`` are wired
to it. Every stale case is built from a throwaway git repo in a temp dir, never the real repo, and
no test touches the shared DB or the network.
"""
from __future__ import annotations

import importlib.util
import os
import subprocess
import sys
from pathlib import Path

import pytest

SCRIPTS_DIR = Path(__file__).resolve().parents[1]
DBSCHEMA_DIR = SCRIPTS_DIR / "dbschema"
sys.path.insert(0, str(DBSCHEMA_DIR))

import tree_guard  # noqa: E402


def _git(repo: Path, *args: str) -> str:
    result = subprocess.run(
        ["git", "-C", str(repo), "-c", "user.name=t", "-c", "user.email=t@example.com", *args],
        capture_output=True, text=True, check=True,
    )
    return result.stdout.strip()


def _commit(repo: Path, name: str) -> str:
    (repo / name).write_text(name, encoding="utf-8")
    _git(repo, "add", name)
    _git(repo, "commit", "-q", "-m", f"add {name}")
    return _git(repo, "rev-parse", "HEAD")


@pytest.fixture()
def repo(tmp_path: Path) -> Path:
    path = tmp_path / "repo"
    path.mkdir()
    _git(path, "init", "-q", "-b", "main")
    return path


def test_equal_to_origin_main_passes(repo: Path) -> None:
    sha = _commit(repo, "a.txt")
    _git(repo, "update-ref", "refs/remotes/origin/main", sha)
    assert tree_guard.check_tree(repo).state == "current"
    assert tree_guard.enforce(repo, label="t") == "current"


def test_ahead_of_origin_main_passes(repo: Path) -> None:
    base = _commit(repo, "a.txt")
    _git(repo, "update-ref", "refs/remotes/origin/main", base)
    _commit(repo, "b.txt")
    assert tree_guard.enforce(repo, label="t") == "current"


def test_behind_origin_main_refuses_naming_the_commit_and_the_fix(repo: Path, capsys) -> None:
    old = _commit(repo, "a.txt")
    new = _commit(repo, "b.txt")
    _git(repo, "update-ref", "refs/remotes/origin/main", new)
    _git(repo, "checkout", "-q", old)
    with pytest.raises(SystemExit) as exc:
        tree_guard.enforce(repo, label="sgs-update-v2.py")
    assert exc.value.code not in (0, None)
    err = capsys.readouterr().err
    assert old[:9] in err, "the message must name the stale commit"
    assert new[:9] in err, "the message must name origin/main"
    assert "--allow-stale-tree" in err
    assert "worktree" in err


def test_diverged_from_origin_main_refuses(repo: Path) -> None:
    base = _commit(repo, "a.txt")
    _git(repo, "checkout", "-q", "-b", "side")
    side = _commit(repo, "side.txt")
    _git(repo, "checkout", "-q", "main")
    main_sha = _commit(repo, "main.txt")
    _git(repo, "update-ref", "refs/remotes/origin/main", main_sha)
    _git(repo, "checkout", "-q", side)
    assert base != side != main_sha
    with pytest.raises(SystemExit):
        tree_guard.enforce(repo, label="t")


def test_missing_origin_ref_warns_and_passes(repo: Path, capsys) -> None:
    _commit(repo, "a.txt")
    assert tree_guard.enforce(repo, label="t") == "unknown"
    assert "WARNING" in capsys.readouterr().err


def test_not_a_git_repo_warns_and_passes(tmp_path: Path, capsys) -> None:
    plain = tmp_path / "plain"
    plain.mkdir()
    assert tree_guard.enforce(plain, label="t") == "unknown"
    assert "WARNING" in capsys.readouterr().err


def test_git_unavailable_warns_and_passes(repo: Path, monkeypatch, capsys) -> None:
    _commit(repo, "a.txt")
    monkeypatch.setenv("PATH", str(repo))
    assert tree_guard.enforce(repo, label="t") == "unknown"
    assert "WARNING" in capsys.readouterr().err


def _make_stale(repo: Path) -> None:
    old = _commit(repo, "a.txt")
    new = _commit(repo, "b.txt")
    _git(repo, "update-ref", "refs/remotes/origin/main", new)
    _git(repo, "checkout", "-q", old)


def test_allow_stale_flag_passes_with_a_warning(repo: Path, capsys) -> None:
    _make_stale(repo)
    assert tree_guard.enforce(repo, allow_stale=True, label="t") == "stale"
    assert "WARNING" in capsys.readouterr().err


def test_dry_run_passes_from_a_stale_tree(repo: Path) -> None:
    _make_stale(repo)
    assert tree_guard.enforce(repo, dry_run=True, label="t") == "skipped"


def test_a_db_other_than_the_shared_one_is_not_guarded(repo: Path, tmp_path: Path) -> None:
    _make_stale(repo)
    shared = tmp_path / "shared.db"
    proof = tmp_path / "proof.db"
    assert tree_guard.enforce(repo, target_db=proof, shared_dbs=(shared,), label="t") == "skipped"
    with pytest.raises(SystemExit):
        tree_guard.enforce(repo, target_db=shared, shared_dbs=(shared,), label="t")


def test_fresh_linked_worktree_at_origin_main_passes_and_stale_one_fails(repo: Path, tmp_path: Path) -> None:
    old = _commit(repo, "a.txt")
    new = _commit(repo, "b.txt")
    _git(repo, "update-ref", "refs/remotes/origin/main", new)
    fresh = tmp_path / "fresh"
    stale = tmp_path / "stale"
    _git(repo, "worktree", "add", "-q", "--detach", str(fresh), new)
    _git(repo, "worktree", "add", "-q", "--detach", str(stale), old)
    assert tree_guard.enforce(fresh, label="t") == "current"
    with pytest.raises(SystemExit):
        tree_guard.enforce(stale, label="t")


# --- wiring: both writers call the shared helper ------------------------------------------


def _stale_status() -> "tree_guard.TreeStatus":
    return tree_guard.TreeStatus("stale", "1111111111", "2222222222", "behind")


def test_seed_reference_data_main_refuses_a_stale_tree(tmp_path: Path, monkeypatch, capsys) -> None:
    home = tmp_path / "home"
    shared = home / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"
    shared.parent.mkdir(parents=True)
    shared.write_bytes(b"")
    monkeypatch.setenv("USERPROFILE", str(home))
    monkeypatch.setenv("HOME", str(home))
    monkeypatch.delenv("SGS_FRAMEWORK_DB", raising=False)
    monkeypatch.setattr(tree_guard, "check_tree", lambda _p: _stale_status())
    spec = importlib.util.spec_from_file_location("seed_reference_data_under_test", DBSCHEMA_DIR / "seed_reference_data.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    called: list[object] = []
    monkeypatch.setattr(module, "seed_all", lambda *_a, **_k: called.append(1))
    with pytest.raises(SystemExit) as exc:
        module.main([])
    assert exc.value.code not in (0, None)
    assert not called, "seed_all must not run when the tree is stale"
    assert "--allow-stale-tree" in capsys.readouterr().err
    assert module.main(["--allow-stale-tree"]) == 0
    assert called, "the override flag lets the seeder run"


def test_sgs_update_v2_guard_function_refuses_a_stale_tree(monkeypatch) -> None:
    spec = importlib.util.spec_from_file_location("sgs_update_v2_guard_test", SCRIPTS_DIR / "sgs-update-v2.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    monkeypatch.setattr(tree_guard, "check_tree", lambda _p: _stale_status())

    class Args:
        allow_stale_tree = False
        dry_run = False
        self_test = False
        db = None

    with pytest.raises(SystemExit) as exc:
        module._enforce_tree_guard(Args())
    assert exc.value.code not in (0, None)
    Args.dry_run = True
    module._enforce_tree_guard(Args())
    Args.dry_run = False
    Args.allow_stale_tree = True
    module._enforce_tree_guard(Args())
