#!/usr/bin/env python3
"""visual_qa_capture.py -- Stage 8 autonomy-gate capture stub.

The live PIL/Playwright pixel-diff capture engine (CaptureContext,
make_capture_callable, _run_playwright_capture, _pixel_diff) was removed
2026-07-04. It scored an EMPTY section as a false WIN (matches background)
and a REFLOWED-to-correct section as a false LOSS (Spec 20 problem
statement) -- the same structural blind spot as Stage 11 pixel-diff and
parity2. sgs-clone-orchestrator.py now always calls stub_capture() below,
which never auto-passes -- every run surfaces to the operator for manual
review via /visual-qa, or is gated on Stage 11.6 computed-parity
(overall_css_pct == 100) before auto-promotion to the canonical pattern
library (see the +REGISTER block in sgs-clone-orchestrator.py).

Pure module -- no CLI surface. Imported by sgs-clone-orchestrator.py.

UK English in comments + output.
"""
from __future__ import annotations

import sys

sys.stdout.reconfigure(encoding="utf-8")


def stub_capture(_viewport_px: int) -> dict:
    """Return a ``stage_8_skipped`` sentinel that autonomy_gate.autonomy_decision()
    treats as ``surface-to-operator`` (never auto-pass).

    This is now the ONLY capture path -- there is no live pixel-diff
    alternative. Stage 8 visual QA is always a human/operator step
    (/visual-qa against the deployed URL) or the Stage 11.6 computed-parity
    gate on pattern auto-promotion.
    """
    return {
        "diff_ratio":       None,
        "screenshot_path":  "",
        "regions":          [],
        "stage_8_skipped":  True,
        "skip_reason":      (
            "Stage 8 visual QA has no automated pixel-diff path (removed "
            "2026-07-04 -- pixel-diff was an unreliable fidelity signal, "
            "Spec 20). Operator must run /visual-qa against the deployed "
            "URL manually. Pattern auto-promotion is gated on Stage 11.6 "
            "computed-parity instead (see +REGISTER)."
        ),
    }
