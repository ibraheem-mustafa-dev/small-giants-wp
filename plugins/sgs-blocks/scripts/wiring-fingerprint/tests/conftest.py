"""Shared fixtures: the miniature plugin tree in fixtures/plugin, a framework DB
built from fixtures/db.json, and one gate run over them (module-scoped: the Node
collector runs once per test module). The repo runs pytest with
--import-mode=importlib, so helpers live in wf_testkit.py on sys.path."""
from __future__ import annotations

import sys
from pathlib import Path

import pytest

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
sys.path.insert(0, str(HERE))

from wf_testkit import make_roots  # noqa: E402


@pytest.fixture(scope="module")
def fixture_roots_dir(tmp_path_factory):
    return make_roots(tmp_path_factory.mktemp("wf"))


@pytest.fixture(scope="module")
def report(fixture_roots_dir):
    from wf_cli import run

    return run(fixture_roots_dir, with_dump=False)
