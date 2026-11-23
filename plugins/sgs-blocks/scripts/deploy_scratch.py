"""Where the deploy scripts put their temporary worktrees, upload batches, logs and locks.

Every temporary folder lives under E:/sgs-tmp; the system temp folder is the fallback only where E: has no such folder.
"""
from __future__ import annotations

import tempfile
from pathlib import Path

SCRATCH_ROOT = Path("E:/sgs-tmp")


def scratch_dir() -> str:
    """The folder to pass as `dir=` to tempfile calls and to build scratch paths in."""
    return str(SCRATCH_ROOT if SCRATCH_ROOT.exists() else Path(tempfile.gettempdir()))
