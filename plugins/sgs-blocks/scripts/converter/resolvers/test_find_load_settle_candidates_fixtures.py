"""Ad-hoc verification harness for `_find_load_settle_candidates()`
(`sgs-clone-orchestrator.py`, Tier 4b, D1032 -- F3/F2 fix, 2026-09-11).

Not wired into any pytest suite -- same convention as
`test_load_settle_probe_fixtures.py`/`test_motion_shape_fixtures.py` in this
directory (no existing pytest config references `converter/resolvers/`; the
real gate is `scripts/gates.json`'s `pytest-oracle-converter`, which targets
`scripts/oracle/tests/` + `scripts/converter/tests/` only). Run directly:
`python test_find_load_settle_candidates_fixtures.py`. Exits non-zero on any
failed fixture.

`_find_load_settle_candidates` lives in the hyphenated `sgs-clone-
orchestrator.py`, so it is loaded via `importlib.util.spec_from_file_location`
-- the same pattern `scripts/tests/test_orchestrator_failed_status.py`
already uses for the same reason.

⚠ UNLIKE its siblings, this harness's own imports (importlib/sys/tempfile/
types/pathlib) succeed cleanly under a bare `python -m pytest converter/`
collection sweep -- it does not fail fast with `ModuleNotFoundError` the way
`test_load_settle_probe_fixtures.py`/`test_motion_shape_fixtures.py` do (their
bare sibling imports, e.g. `from load_settle_probe import ...`, only resolve
when `converter/resolvers/` is already on `sys.path`). That means an
unconditional `sys.exit()` at module scope here WOULD raise `SystemExit`
during pytest's own import step and crash the whole pytest run with an
INTERNALERROR (confirmed live while building this fix) -- so, unlike its
siblings, the exit call below is guarded behind `if __name__ == "__main__"`.
Running this file directly still exits non-zero on any failure; being
imported (by pytest or anything else) runs every check and prints PASS/FAIL
but never calls `sys.exit()`.

Covers, per the task review's F3 requirement:
  (1) a genuine candidate is found -- transition, no hover, no resting
      transform/filter/clip-path value the static extractor could already
      resolve from.
  (2) an element Tier 1/2 already handles statically is correctly EXCLUDED
      -- the regression test for the F2 fix (a resting `transform` value +
      transition + no hover used to be flagged as a Tier 4b candidate even
      though `extract_shape_from_transition()` already resolves it with no
      hover at all -- D1026's whole point).
  (3) an element with a real `:hover` counterpart is correctly excluded
      (D1024's existing case, pre-dating this fix).
  (4) F4 regression control -- a genuinely broken import chain (a decoy
      `styling_helpers` module missing the expected name) raises rather
      than silently returning `[]`, so a broken finder is visibly different
      from a clean page with no candidates.
"""
from __future__ import annotations

import importlib.util
import sys
import tempfile
import types
from pathlib import Path

_SCRIPTS_DIR = Path(__file__).resolve().parents[2]
_ORCHESTRATOR_PATH = _SCRIPTS_DIR / "sgs-clone-orchestrator.py"


def _load_orchestrator() -> types.ModuleType:
    spec = importlib.util.spec_from_file_location(
        "sgs_clone_orchestrator_load_settle_candidates", str(_ORCHESTRATOR_PATH)
    )
    mod = importlib.util.module_from_spec(spec)  # type: ignore[arg-type]
    spec.loader.exec_module(mod)  # type: ignore[union-attr]
    return mod


_orch = _load_orchestrator()

# `_find_load_settle_candidates()` inserts `converter`/`converter/services`/
# `converter/resolvers` into the GLOBAL `sys.path`, and its own imports
# (`motion_shape`, `styling_helpers`, `css_parse`, ...) populate the GLOBAL
# `sys.modules` cache -- both correct and intended in a real orchestrator
# run, but a real hazard under a broad `pytest converter/` collection sweep:
# leaving either behind after this file finishes running would let a
# LATER-collected sibling harness's bare `from motion_shape import (...)` /
# `from load_settle_probe import (...)` (which currently fail fast with
# `ModuleNotFoundError` and are the ONLY thing stopping them being collected
# as real tests) suddenly succeed instead -- reaching that sibling's own
# unconditional `sys.exit()` during pytest's own import step and crashing
# the whole run with an INTERNALERROR. Confirmed live while building this
# fix, twice (once via `sys.path` alone, once via the `sys.modules` cache
# surviving even after `sys.path` was restored -- Python checks
# `sys.modules` first). Both are captured here and restored at the end of
# this file so it leaves the process exactly as it found it.
_ORIGINAL_SYS_PATH = list(sys.path)
_ORIGINAL_SYS_MODULES_KEYS = set(sys.modules.keys())

PASS = 0
FAIL = 0


def check(name: str, actual, expected):
    global PASS, FAIL
    ok = actual == expected
    status = "PASS" if ok else "FAIL"
    print(f"[{status}] {name}: actual={actual!r} expected={expected!r}")
    if ok:
        PASS += 1
    else:
        FAIL += 1


def _mockup(html: str) -> Path:
    """Write `html` to a real temp file (candidate-finder reads from disk,
    same convention as its own docstring: HTML + CSS "both genuinely
    available at Stage -1")."""
    f = tempfile.NamedTemporaryFile(
        mode="w", suffix=".html", delete=False, encoding="utf-8"
    )
    f.write(html)
    f.close()
    return Path(f.name)


# ---------------------------------------------------------------------------
# (1) A genuine candidate: transition, no hover, no resting value the
#     static extractor could already resolve from (opacity alone, with no
#     opacity_to available statically, is never resolvable here).
# ---------------------------------------------------------------------------
genuine_candidate_html = """
<html><head><style>
.c-preloader { opacity: 1; transition: opacity 900ms ease; }
</style></head><body>
<div class="c-preloader"></div>
</body></html>
"""
path1 = _mockup(genuine_candidate_html)
try:
    result1 = _orch._find_load_settle_candidates(path1)
    check(
        "(1) genuine candidate found (transition, no hover, no resolvable resting value)",
        [c["selector"] for c in result1],
        [".c-preloader"],
    )
finally:
    path1.unlink(missing_ok=True)


# ---------------------------------------------------------------------------
# (2) F2 regression control: a resting `transform` value + transition + no
#     hover is ALREADY resolvable by `extract_shape_from_transition()` with
#     no hover counterpart at all (D1026) -- must be EXCLUDED, not offered
#     to the live probe as a Tier 4b candidate.
# ---------------------------------------------------------------------------
already_resolvable_html = """
<html><head><style>
.card { transform: translateY(30px); transition: transform 300ms ease-out; }
</style></head><body>
<div class="card"></div>
</body></html>
"""
path2 = _mockup(already_resolvable_html)
try:
    result2 = _orch._find_load_settle_candidates(path2)
    check(
        "(2) F2 fix: Tier-1/2-resolvable resting transform is EXCLUDED "
        "(regression control for the over-match the reviewer found)",
        result2,
        [],
    )
finally:
    path2.unlink(missing_ok=True)


# ---------------------------------------------------------------------------
# (3) An element with a real :hover counterpart -- correctly excluded
#     (D1024's existing, pre-dating case; Tier 1/2 already reaches this one
#     via the hover-scoped path, so it is not this probe's target shape).
# ---------------------------------------------------------------------------
hover_reachable_html = """
<html><head><style>
.tooltip { opacity: 0; transition: opacity 200ms ease; }
.tooltip:hover { opacity: 1; }
</style></head><body>
<div class="tooltip"></div>
</body></html>
"""
path3 = _mockup(hover_reachable_html)
try:
    result3 = _orch._find_load_settle_candidates(path3)
    check(
        "(3) an element with a real :hover counterpart is excluded (D1024 case)",
        result3,
        [],
    )
finally:
    path3.unlink(missing_ok=True)


# ---------------------------------------------------------------------------
# (4) F4 regression control: a genuinely broken import chain must raise,
#     not silently return []. `_find_load_settle_candidates` now inserts
#     `_scripts_dir` itself unconditionally (the F4 fix), so the OLD
#     sys.path-gap reproduction no longer applies -- that specific gap is
#     closed by construction. What F4 actually requires is verified here
#     directly: a broken import (simulated via a decoy `styling_helpers`
#     module in `sys.modules` missing the expected name) raises out of the
#     function rather than being swallowed into a silent `[]` by a blanket
#     `except Exception`.
# ---------------------------------------------------------------------------
poison_html = """
<html><head><style>
.x { opacity: 1; transition: opacity 300ms ease; }
</style></head><body>
<div class="x"></div>
</body></html>
"""
path4 = _mockup(poison_html)
try:
    _saved_module = sys.modules.get("styling_helpers")
    decoy = types.ModuleType("styling_helpers")  # deliberately missing collect_css_decls_for_element
    sys.modules["styling_helpers"] = decoy

    raised = False
    try:
        _orch._find_load_settle_candidates(path4)
    except Exception:  # noqa: BLE001 - this IS the assertion under test
        raised = True
    check(
        "(4) F4 fix: a genuinely broken import chain raises, does not "
        "silently return [] (verified via the orchestrator's own "
        "surrounding try/except in stage_neg1_motion_probe(), which "
        "records this into result['tier4b']['error'])",
        raised,
        True,
    )
finally:
    if _saved_module is not None:
        sys.modules["styling_helpers"] = _saved_module
    else:
        sys.modules.pop("styling_helpers", None)
    path4.unlink(missing_ok=True)


# Restore sys.path AND sys.modules exactly as found (see the
# _ORIGINAL_SYS_PATH / _ORIGINAL_SYS_MODULES_KEYS comment above) before this
# module finishes importing/running.
sys.path[:] = _ORIGINAL_SYS_PATH
for _k in list(sys.modules.keys()):
    if _k not in _ORIGINAL_SYS_MODULES_KEYS:
        del sys.modules[_k]

print(f"\n{PASS} passed, {FAIL} failed")
if __name__ == "__main__":
    sys.exit(1 if FAIL else 0)
