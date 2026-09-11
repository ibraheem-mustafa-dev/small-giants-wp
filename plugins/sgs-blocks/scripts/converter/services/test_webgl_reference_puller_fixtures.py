"""Ad-hoc verification harness for webgl_reference_puller.py (Phase R8 Step 13).

3 required fixtures per the step's own Test block:
  1. Happy  -- Tier 4c reports no match, operator confirms -> offer carries
              the D1019 framing, fetch executes.
  2. Edge   -- operator declines -> nothing fetched, no residual state.
  3. Fail   -- Tier 4a has NOT confirmed WebGL presence -> Tier 4d refuses
              to even offer (hard gate, executed and asserted, not just
              described).
"""
import shutil
import sys
import tempfile
from pathlib import Path

from webgl_reference_puller import (
    LEGAL_FRAMING_TEXT,
    Tier4dNotEligibleError,
    build_pull_offer,
    check_tier4d_eligible,
    execute_pull,
)

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


tmp_root = Path(tempfile.mkdtemp(prefix="tier4d-fixture-"))

# ---------------------------------------------------------------------------
# Fixture 1 -- Happy: Tier 4c reports no match, operator confirms.
# ---------------------------------------------------------------------------
tier4a_confirmed = {
    "confirmed": True,
    "source": "three-js-dom-signal",
    "reason": "Three.js self-tagged its own <canvas data-engine> attribute.",
}
tier4c_no_match = {
    "matched_effect": None,
    "confidence": 0.31,
    "method": "heuristic-fallback",
    "message": "No confident match to either shipped Tier W effect.",
    "next_step": "tier_4d",
    "requires_operator_confirmation": True,
}

# Use a tiny, always-reachable public asset so the fixture proves a real
# fetch happens rather than mocking the network away. A raw-served static
# GitHub file matches "the source's own publicly-served files" shape this
# tier is designed for.
source_urls = {
    "readme": "https://raw.githubusercontent.com/octocat/Hello-World/master/README",
}

offer = None
offer_built_ok = False
try:
    offer = build_pull_offer(source_urls, tier4a_confirmed, tier4c_suggestion=tier4c_no_match)
    offer_built_ok = True
except Tier4dNotEligibleError:
    offer_built_ok = False

check("fixture 1: offer built when Tier 4a confirmed + Tier 4c no-match", offer_built_ok)
check(
    "fixture 1: offer carries the D1019 framing text verbatim",
    offer is not None and offer.get("legal_framing") == LEGAL_FRAMING_TEXT,
)
check(
    "fixture 1: D1019 framing names 'not a legal clearance' and 'derivative work'",
    offer is not None
    and "NOT a legal clearance" in offer["legal_framing"]
    and "derivative work" in offer["legal_framing"],
)
check("fixture 1: offer requires operator confirmation", offer is not None and offer.get("requires_operator_confirmation") is True)

dest1 = tmp_root / "fixture1"
fetch_result = execute_pull(offer, operator_confirmed=True, dest_dir=dest1) if offer else {"fetched": [], "errors": ["no offer"]}
check(
    "fixture 1: confirmed pull actually fetched the file",
    bool(fetch_result.get("fetched")) and not fetch_result.get("errors"),
)
if fetch_result.get("fetched"):
    fetched_path = Path(fetch_result["fetched"][0]["path"])
    check("fixture 1: fetched file exists on disk with real bytes", fetched_path.exists() and fetched_path.stat().st_size > 0)

# ---------------------------------------------------------------------------
# Fixture 2 -- Edge: operator declines -> nothing fetched, no residual state.
# ---------------------------------------------------------------------------
dest2 = tmp_root / "fixture2"
decline_result = execute_pull(offer, operator_confirmed=False, dest_dir=dest2)
check("fixture 2: decline reports skipped=True", decline_result.get("skipped") is True)
check("fixture 2: decline fetched nothing", decline_result.get("fetched") == [])
check("fixture 2: decline created no destination directory (no residual state)", not dest2.exists())

# ---------------------------------------------------------------------------
# Fixture 3 -- Fail: Tier 4a has NOT confirmed WebGL presence -> Tier 4d
# never even offers the option. Executed directly, not just described.
# ---------------------------------------------------------------------------
tier4a_unconfirmed = {
    "confirmed": False,
    "source": None,
    "reason": "Neither a Three.js DOM signal nor a confirmed draw-call was supplied.",
}

eligibility = check_tier4d_eligible(tier4a_unconfirmed, tier4c_suggestion=tier4c_no_match)
check("fixture 3: check_tier4d_eligible() reports ineligible when Tier 4a unconfirmed", eligibility.get("eligible") is False)

raised = False
try:
    build_pull_offer(source_urls, tier4a_unconfirmed, tier4c_suggestion=tier4c_no_match)
except Tier4dNotEligibleError:
    raised = True
check("fixture 3: build_pull_offer() actually RAISES Tier4dNotEligibleError (real execution, not description)", raised)

# Also prove: even with the operator explicitly preferring a pull, the
# Tier 4a gate is a HARD requirement that cannot be worked around.
raised_even_with_preference = False
try:
    build_pull_offer(source_urls, tier4a_unconfirmed, operator_prefers_pull=True)
except Tier4dNotEligibleError:
    raised_even_with_preference = True
check(
    "fixture 3: unconfirmed Tier 4a refuses even with operator_prefers_pull=True (hard gate, no override)",
    raised_even_with_preference,
)

shutil.rmtree(tmp_root, ignore_errors=True)

print(f"\n{PASS} passed, {FAIL} failed")
sys.exit(1 if FAIL else 0)
