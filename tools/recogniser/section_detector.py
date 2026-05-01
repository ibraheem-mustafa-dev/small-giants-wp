"""Module 1 — Section Detector.

Walks an HTML document and returns a list of sections keyed by their
semantic role (header / main / aside / footer) plus a class signature
that downstream modules use as a fingerprint key.

This is mechanical DOM walking — no AI. Implementation lives in the
overnight build's Module 1 dispatch (Cerebras Qwen 3 235B).

Spec: .claude/plans/recogniser-v1.md  Module 1.
"""

from __future__ import annotations

raise NotImplementedError(
    "section_detector is a Module 1 scaffold. "
    "Dispatch to Cerebras (Qwen 3 235B) per recogniser-v1.md spec."
)
