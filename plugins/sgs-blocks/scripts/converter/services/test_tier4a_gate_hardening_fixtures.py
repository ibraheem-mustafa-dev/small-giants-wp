"""Ad-hoc verification harness for the Tier 4a gate hardening fix
(QC-council findings, 2026-09-11 -- see this session's commit + report).

Proves, by REAL EXECUTION (not description):
  1. The forged-dict attack `{"confirmed": True}` (no evidence at all) is
     now REFUSED by both Tier 4c (`_require_gate`) and Tier 4d
     (`check_tier4d_eligible`) -- it previously passed both.
  2. The forged-dict attack `{"confirmed": True, "evidence": {}}` (empty
     evidence) is also refused.
  3. A GENUINE gate object, produced by actually calling
     `check_tier4a_confirmed_webgl()` with real signals, still passes
     through cleanly on both tiers -- no regression on the legitimate path.
  4. `_match_to_shipped_effect()` / `_classify_visual_character()` /
     `_sample_dominant_colours()` are no longer public names importable as
     the module's documented entry point -- `build_operator_suggestion()`
     is exercised instead.
"""
import sys

from tier4a_gate_verification import reverify_gate
from webgl_style_classifier import (
    ClassifierNotGatedError,
    _require_gate,
    check_tier4a_confirmed_webgl,
)
from webgl_reference_puller import check_tier4d_eligible

PASS = 0
FAIL = 0


def check(name, condition):
    global PASS, FAIL
    status = "PASS" if condition else "FAIL"
    print(f"[{status}] {name}")
    if condition:
        PASS += 1
    else:
        FAIL += 1


# ---------------------------------------------------------------------------
# Attack 1 -- bare forged dict, no evidence at all.
# ---------------------------------------------------------------------------
forged_bare = {"confirmed": True}

check(
    "attack 1: reverify_gate() rejects a bare {'confirmed': True} with no evidence",
    reverify_gate(forged_bare) is False,
)

raised = False
try:
    _require_gate(forged_bare)
except ClassifierNotGatedError:
    raised = True
check("attack 1: Tier 4c _require_gate() REFUSES the bare forged dict", raised)

eligibility = check_tier4d_eligible(forged_bare, tier4c_suggestion=None, operator_prefers_pull=True)
check(
    "attack 1: Tier 4d check_tier4d_eligible() REFUSES the bare forged dict",
    eligibility.get("eligible") is False,
)

# ---------------------------------------------------------------------------
# Attack 2 -- forged dict with an empty evidence object.
# ---------------------------------------------------------------------------
forged_empty_evidence = {"confirmed": True, "evidence": {}}

check(
    "attack 2: reverify_gate() rejects {'confirmed': True, 'evidence': {}}",
    reverify_gate(forged_empty_evidence) is False,
)

raised2 = False
try:
    _require_gate(forged_empty_evidence)
except ClassifierNotGatedError:
    raised2 = True
check("attack 2: Tier 4c _require_gate() REFUSES the empty-evidence forged dict", raised2)

eligibility2 = check_tier4d_eligible(forged_empty_evidence, tier4c_suggestion=None, operator_prefers_pull=True)
check(
    "attack 2: Tier 4d check_tier4d_eligible() REFUSES the empty-evidence forged dict",
    eligibility2.get("eligible") is False,
)

# ---------------------------------------------------------------------------
# Attack 3 -- evidence present but doesn't actually support the claim
# (e.g. a draw-call result carrying an error, or no three-js signal).
# ---------------------------------------------------------------------------
forged_bad_evidence = {
    "confirmed": True,
    "evidence": {
        "library_signals": [{"library_name": "gsap"}],
        "draw_call_result": {"webgl_draw_call_seen": False, "error": None},
    },
}
check(
    "attack 3: reverify_gate() rejects evidence that doesn't actually support the claim",
    reverify_gate(forged_bad_evidence) is False,
)

# ---------------------------------------------------------------------------
# Legitimate path -- a REAL gate produced by check_tier4a_confirmed_webgl()
# must still pass through cleanly on both tiers (no regression).
# ---------------------------------------------------------------------------
real_gate_three_js = check_tier4a_confirmed_webgl(
    found_signals=[{"library_name": "three-js"}],
    draw_call_result=None,
)
check(
    "legitimate: check_tier4a_confirmed_webgl() embeds real evidence",
    "evidence" in real_gate_three_js and real_gate_three_js["evidence"]["library_signals"],
)
check(
    "legitimate: reverify_gate() accepts the genuine three-js gate",
    reverify_gate(real_gate_three_js) is True,
)

no_raise = True
try:
    _require_gate(real_gate_three_js)
except ClassifierNotGatedError:
    no_raise = False
check("legitimate: Tier 4c _require_gate() PASSES a genuine gate (no regression)", no_raise)

eligibility_legit = check_tier4d_eligible(real_gate_three_js, tier4c_suggestion=None, operator_prefers_pull=True)
check(
    "legitimate: Tier 4d check_tier4d_eligible() PASSES a genuine gate (no regression)",
    eligibility_legit.get("eligible") is True,
)

real_gate_draw_call = check_tier4a_confirmed_webgl(
    found_signals=[],
    draw_call_result={"webgl_draw_call_seen": True, "error": None},
)
check(
    "legitimate: reverify_gate() accepts a genuine draw-call gate",
    reverify_gate(real_gate_draw_call) is True,
)

real_gate_unconfirmed = check_tier4a_confirmed_webgl(found_signals=[], draw_call_result=None)
check(
    "legitimate: reverify_gate() correctly rejects a genuinely-unconfirmed gate",
    reverify_gate(real_gate_unconfirmed) is False,
)

# ---------------------------------------------------------------------------
# Fix 2 -- internal functions are no longer importable under their old
# public names (privatised, `build_operator_suggestion()` is the sole
# public entry point).
# ---------------------------------------------------------------------------
import webgl_style_classifier as _mod  # noqa: E402

check(
    "fix2: old public name 'match_to_shipped_effect' no longer exists on the module",
    not hasattr(_mod, "match_to_shipped_effect"),
)
check(
    "fix2: old public name 'classify_visual_character' no longer exists on the module",
    not hasattr(_mod, "classify_visual_character"),
)
check(
    "fix2: old public name 'sample_dominant_colours' no longer exists on the module",
    not hasattr(_mod, "sample_dominant_colours"),
)
check(
    "fix2: build_operator_suggestion() remains the public entry point",
    hasattr(_mod, "build_operator_suggestion"),
)

print(f"\n{PASS} passed, {FAIL} failed")
sys.exit(1 if FAIL else 0)
