"""Module 3 — Recogniser (main entry point).

Orchestrates the full pipeline: section_detector → fingerprint_indexer
→ AI match per section (via Claude CLI subscription) → style_extractor
→ serialiser → output_router.

For each section, the AI is prompted with the section HTML plus the
fingerprint catalogue, and returns a 4-tier match decision (full /
partial / fallback / deferred) per the schema in
prompts/recogniser-prompt.md.

Implementation lives in the overnight build's Module 3 dispatch (Sonnet,
sequential after Modules 1+2).

Spec: .claude/plans/recogniser-v1.md  Module 3.
"""

from __future__ import annotations

raise NotImplementedError(
    "recogniser is a Module 3 scaffold. "
    "Dispatch to Sonnet sequentially after Modules 1+2 land."
)


if __name__ == "__main__":
    raise SystemExit(
        "Module 3 not yet implemented. See .claude/plans/recogniser-v1.md."
    )
