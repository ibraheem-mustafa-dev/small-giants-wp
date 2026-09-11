"""Ad-hoc verification harness for `load_settle_probe.py` (Tier 4b, D1032).

Not wired into any pytest suite -- same convention as
`test_motion_shape_fixtures.py`/`test_motion_trigger_fixtures.py` in this
directory (no existing pytest config references `converter/resolvers/`;
the real gate is `scripts/gates.json`'s `pytest-oracle-converter`, which
targets `scripts/oracle/tests/` + `scripts/converter/tests/` only). Run
directly: `python test_load_settle_probe_fixtures.py`. Exits non-zero on
any failed fixture.

Deliberately tests only the PURE functions
(`build_transition_shape_from_probe_result`, `classify_load_settle_
candidate`) rather than `probe()` itself -- `probe()`'s own job is a real
Playwright browser navigation + `getComputedStyle()` sample, which this
harness has no business faking a browser for; every property this module
adds beyond "call Playwright correctly" (the adapter mapping, the
fail-closed no-diff gate, the `fxTrigger='load'` tagging) lives entirely in
these pure functions and needs no browser, real or mocked, to verify.
"""
from __future__ import annotations

import sys

from load_settle_probe import (
    build_transition_shape_from_probe_result,
    classify_load_settle_candidate,
)

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


# ---------------------------------------------------------------------------
# (a) A genuine before/after opacity diff -> a real match, tagged
#     fxTrigger='load'. Mirrors Locomotive's real `.c-preloader` shape
#     (D1026's disclosed 3rd unreachable gap): opacity 1 -> 0, 900ms ease,
#     no :hover/:focus counterpart at all.
# ---------------------------------------------------------------------------
preloader_candidate = {
    "selector": ".c-preloader",
    "before": {"opacity": "1", "transform": "none", "filter": "none"},
    "after": {"opacity": "0", "transform": "none", "filter": "none"},
    "changed_properties": ["opacity"],
    "error": None,
}
check(
    "(a) genuine opacity diff -> fade-in match, fxTrigger=load",
    classify_load_settle_candidate(preloader_candidate, "opacity 900ms ease"),
    ({"sgsAnimation": "fade-in", "fxTrigger": "load"}, []),
)

# ---------------------------------------------------------------------------
# (b) Identical before/after -> no match, no guess (fail-closed gate).
# ---------------------------------------------------------------------------
identical_candidate = {
    "selector": ".c-preloader",
    "before": {"opacity": "1", "transform": "none", "filter": "none"},
    "after": {"opacity": "1", "transform": "none", "filter": "none"},
    "changed_properties": [],
    "error": None,
}
check(
    "(b) identical before/after -> no match, no guess",
    classify_load_settle_candidate(identical_candidate, "opacity 900ms ease"),
    ({}, []),
)

# (b2) Same fail-closed gate, exercised directly on the adapter rather than
# the full classify wrapper -- proves the gate lives in the adapter itself,
# not merely as a side effect of the downstream extractor declining.
check(
    "(b2) adapter itself declines on empty changed_properties",
    build_transition_shape_from_probe_result(identical_candidate),
    None,
)

# ---------------------------------------------------------------------------
# (c) The adapter correctly maps a sampled diff into
#     extract_shape_from_transition()'s expected from_declarations input
#     shape: before.transform/filter/opacity + after.opacity as opacity_to.
# ---------------------------------------------------------------------------
check(
    "(c) adapter maps sampled diff -> from_declarations shape (only the "
    "AXIS that actually changed -- transform/filter stayed 'none' on both "
    "sides here, so they are correctly excluded, not just passed through)",
    build_transition_shape_from_probe_result(preloader_candidate),
    {"opacity": "1", "opacity_to": "0"},
)

# (c2) A candidate missing its 'before' snapshot (selector matched nothing
# at the first sample point) -> the adapter declines rather than mapping a
# partial/half-formed shape.
missing_before_candidate = {
    "selector": ".c-preloader",
    "before": None,
    "after": {"opacity": "0", "transform": "none", "filter": "none"},
    "changed_properties": [],
    "error": "selector matched an element at only one sample point",
}
check(
    "(c2) missing 'before' snapshot -> adapter declines",
    build_transition_shape_from_probe_result(missing_before_candidate),
    None,
)

# (c3) A per-candidate sampling error is treated the same as "nothing to
# see" even if changed_properties were somehow non-empty (defence in
# depth -- probe() itself never produces this combination, but the
# adapter must not trust changed_properties over an explicit error).
error_candidate = {
    "selector": ".c-preloader",
    "before": {"opacity": "1", "transform": "none", "filter": "none"},
    "after": {"opacity": "0", "transform": "none", "filter": "none"},
    "changed_properties": ["opacity"],
    "error": "some sampling error",
}
check(
    "(c3) an explicit per-candidate error -> adapter declines regardless of diff",
    build_transition_shape_from_probe_result(error_candidate),
    None,
)

# ---------------------------------------------------------------------------
# (d) A transform-only diff (computed matrix() form -- never the authored
#     translateY()/scaleX() notation) still declines cleanly: the shared
#     extractor's own parse-or-decline chain fails to parse a matrix() and
#     falls through to filter/clip-path/opacity, all absent here -> no
#     shape, no guess. Proves the disclosed "transform rarely matches"
#     limitation is a clean decline, not a crash or a wrong match.
# ---------------------------------------------------------------------------
transform_only_candidate = {
    "selector": ".card",
    "before": {"opacity": "1", "transform": "matrix(1, 0, 0, 1, 0, -20)", "filter": "none"},
    "after": {"opacity": "1", "transform": "matrix(1, 0, 0, 1, 0, 0)", "filter": "none"},
    "changed_properties": ["transform"],
    "error": None,
}
check(
    "(d) computed-matrix transform diff -> declines cleanly (no guessed shape)",
    classify_load_settle_candidate(transform_only_candidate, "transform 300ms ease-out"),
    ({}, []),
)

print(f"\n{PASS} passed, {FAIL} failed")
sys.exit(1 if FAIL else 0)
