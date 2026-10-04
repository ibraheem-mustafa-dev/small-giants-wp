#!/usr/bin/env python3
"""check-wiring-fingerprint.py: every attribute that paints must be wired end to
end (control, editor canvas, front-end read, CSS channel, consumer, parity).

    python scripts/check-wiring-fingerprint.py --check            # fail on a NEW gap
    python scripts/check-wiring-fingerprint.py --update-baseline  # rewrite the ratchet
    python scripts/check-wiring-fingerprint.py --json report.json # full report

The implementation lives in scripts/wiring-fingerprint/ (one module per job);
the baseline is scripts/wiring-fingerprint-baseline.json. Design: the route data
audit's wiring fingerprints (2026-10-04) and the plan
.claude/plans/2026-10-04-wiring-fingerprint-gate.md (Task 2).
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / "wiring-fingerprint"))

from wf_cli import main  # noqa: E402

if __name__ == "__main__":
    sys.exit(main())
