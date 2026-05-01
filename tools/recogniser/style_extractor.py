"""Module 4 — Style Extractor.

Reads the computed CSS for a matched element and maps it to SGS palette,
spacing, and typography tokens. Colours nearest within ΔE<5 are mapped
to the active style variation's palette; misses are flagged for the gap
detector.

Implementation lives in the overnight build's Module 4 dispatch (Sonnet).

Spec: .claude/plans/recogniser-v1.md  Module 4.
"""

from __future__ import annotations

raise NotImplementedError(
    "style_extractor is a Module 4 scaffold. "
    "Dispatch to Sonnet per recogniser-v1.md spec."
)
