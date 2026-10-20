"""Compatibility entry point: the hover-only gate became the general states gate, scripts/check-state-classification.py.

The hover rule is one case of the states rule there. This file keeps the old command line working and delegates to it.
"""

from __future__ import annotations

import runpy
from pathlib import Path

if __name__ == "__main__":
    runpy.run_path(str(Path(__file__).resolve().with_name("check-state-classification.py")), run_name="__main__")
