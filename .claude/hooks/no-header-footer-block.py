#!/usr/bin/env python3
"""no-header-footer-block.py — PostToolUse hook that hard-rejects Write/Edit
on plugins/sgs-blocks/src/blocks/(header|footer|nav)/.

WHY: Header, footer, and nav are TEMPLATE PARTS per Spec 17 — they live in
theme/sgs-theme/parts/. NOT Gutenberg blocks. This is the 5th-occurrence
prevention (blub.db row 274). Prompt-discipline has failed 4 times.
Structural enforcement at the tool layer.

Output schema (CC hook):
  BLOCK: {"decision": "block", "reason": "..."}  exit 2
  ALLOW: no output, exit 0

Captured 2026-05-20 (Phase 2 P2.0 of spec16-architectural-rewrite plan).
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

# Path-anchored regex: matches the `src/blocks/(header|footer|nav)/` segment
# anywhere in a forward- or backslash-normalised path.
# Boundary (/|$) ensures 'header-style.css' or 'mobile-nav-renderer.php'
# are NOT matched — only actual header/footer/nav DIRECTORIES under src/blocks/.
_BLOCKED_PATTERN = re.compile(
    r"plugins[\\/]sgs-blocks[\\/]src[\\/]blocks[\\/](header|footer|nav)([\\/]|$)",
    re.IGNORECASE,
)


def main() -> int:
    try:
        raw = sys.stdin.read()
        payload = json.loads(raw) if raw.strip() else {}
    except Exception:
        return 0  # malformed input — fail silent, never block legitimate work

    tool_name = payload.get("tool_name", "")
    if tool_name not in ("Write", "Edit"):
        return 0  # only intercept file-write operations

    tool_input = payload.get("tool_input") or {}
    file_path = tool_input.get("file_path", "") if isinstance(tool_input, dict) else ""
    if not file_path:
        return 0

    # Normalise to forward slashes for consistent matching
    normalised = file_path.replace("\\", "/")

    if _BLOCKED_PATTERN.search(normalised):
        block_msg = {
            "decision": "block",
            "reason": (
                "BLOCKED by no-header-footer-block.py (PostToolUse hook, P2.0). "
                "Header, footer, and nav are TEMPLATE PARTS per Spec 17 — NOT Gutenberg blocks. "
                "Editing src/blocks/(header|footer|nav)/ would cause the 5th occurrence "
                "of this anti-pattern (blub.db row 274). "
                "To edit template parts: use theme/sgs-theme/parts/header.html or "
                "theme/sgs-theme/parts/footer.html. "
                "To add nav logic: use plugins/sgs-blocks/includes/class-sgs-header-rules.php. "
                "To override (e.g. delete this guard): remove this hook from "
                ".claude/settings.json hooks.PostToolUse."
            ),
        }
        print(json.dumps(block_msg))
        return 2

    return 0


if __name__ == "__main__":
    sys.exit(main())
