"""Shared Tier 4a gate re-verification helper (QC-council hardening,
2026-09-11 -- see `.claude/reports/2026-09-11-r8-tag-heuer-full-verification.md`).

WHY THIS MODULE EXISTS
----------------------------------------------------
`webgl_style_classifier.py::check_tier4a_confirmed_webgl()` produces a gate
dict shaped `{"confirmed": bool, "evidence": {...}, "source": ..., "reason":
...}`. Both Tier 4c (`webgl_style_classifier.py::_require_gate()`) and
Tier 4d (`webgl_reference_puller.py::check_tier4d_eligible()`) previously
trusted `gate.get("confirmed")` as a bare boolean -- which meant a
hand-built `{"confirmed": True}` dict, carrying ZERO real Tier 4a evidence,
passed both gates and reached `build_pull_offer()` /
`match_to_shipped_effect()` successfully. Confirmed live by a 2-rater QC
council (2026-09-11): the docstrings' claim ("impossible to bypass by
construction") was false in practice.

`reverify_gate()` closes that hole. It never trusts the claimed
`confirmed` value directly -- it independently RE-DERIVES, from the gate's
own embedded `evidence` field, whether confirmation is genuinely warranted,
using the exact same decision logic `check_tier4a_confirmed_webgl()` uses.
A forged gate (missing evidence, empty evidence, or evidence that doesn't
actually contain a three-js signal / a real draw-call result) fails
re-verification even when `confirmed` was hand-set to `True`.

Deliberately a SHARED module rather than duplicated logic in each consumer
-- one place to keep the re-derivation in lockstep with
`check_tier4a_confirmed_webgl()`'s own decision rule, per this codebase's
universal-mechanism discipline (no per-caller carve-outs).

UK English in comments + output.
"""
from __future__ import annotations

# Mirrors `webgl_style_classifier.py::_THREEJS_LIBRARY_NAME` exactly -- the
# one Tier-4a DOM signal that, on its own, confirms genuine WebGL
# rendering. Kept as a separate constant (not imported) so this module has
# no import-time dependency on `webgl_style_classifier.py` and can be
# imported by either consumer without a circular-import risk.
_THREEJS_LIBRARY_NAME = "three-js"


def _evidence_supports_confirmed(evidence: dict) -> bool:
    """Recompute, from raw evidence alone, whether Tier 4a confirmation is
    genuinely warranted. This is a RE-DERIVATION of
    `check_tier4a_confirmed_webgl()`'s own decision logic -- not a second,
    independently-invented policy that could silently drift from it.
    """
    library_signals = evidence.get("library_signals") or []
    for sig in library_signals:
        if isinstance(sig, dict) and sig.get("library_name") == _THREEJS_LIBRARY_NAME:
            return True

    draw_call_result = evidence.get("draw_call_result")
    if isinstance(draw_call_result, dict) and not draw_call_result.get("error"):
        if draw_call_result.get("webgl_draw_call_seen") is True:
            return True

    return False


def reverify_gate(gate: dict) -> bool:
    """Independently re-verify a Tier 4a gate dict produced by
    `webgl_style_classifier.py::check_tier4a_confirmed_webgl()`.

    Returns `True` only when ALL of the following hold:
      1. `gate` is a dict.
      2. `gate["confirmed"]` is exactly `True` (the claim being checked).
      3. `gate["evidence"]` is a real, non-empty dict.
      4. That evidence, re-checked from scratch by
         `_evidence_supports_confirmed()`, ACTUALLY supports the claim.

    A hand-built `{"confirmed": True}` (no evidence key at all), or
    `{"confirmed": True, "evidence": {}}` (empty evidence), or evidence
    that doesn't actually contain a three-js signal or a genuine draw-call
    result, all return `False` regardless of what `confirmed` claims.

    A genuine gate produced by `check_tier4a_confirmed_webgl()` -- which
    always embeds the real evidence it derived `confirmed` from -- passes
    through cleanly; this function changes nothing about the legitimate
    path.
    """
    if not isinstance(gate, dict):
        return False

    if gate.get("confirmed") is not True:
        return False

    evidence = gate.get("evidence")
    if not isinstance(evidence, dict) or not evidence:
        return False

    return _evidence_supports_confirmed(evidence)
