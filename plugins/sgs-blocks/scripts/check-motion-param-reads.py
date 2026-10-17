#!/usr/bin/env python3
"""check-motion-param-reads.py: every effect parameter is read by that effect's runtime (FR-38A-48).

Run: python plugins/sgs-blocks/scripts/check-motion-param-reads.py --check | --self-test
The logic lives in motion_param_reads.py beside this file.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import motion_param_reads  # noqa: E402

if __name__ == "__main__":
    raise SystemExit(motion_param_reads.main())
