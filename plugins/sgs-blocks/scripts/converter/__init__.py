"""SGS clean modular converter (Spec 31 §12.4 / §12.6 step 2 — vertical slice).

This is the FRESH modular home that replaces the frozen 6,379-line
``orchestrator/converter_v2/convert.py`` (D-MODULAR, D229). Build proceeds as a
vertical slice (D-A, D242): one real resolver (``outer_box``: max-width→maxWidth)
end-to-end first, the rest one-per-stage in step 3.

Architecture (design doc ``.claude/plans/2026-06-23-modular-scaffold-design.md`` v3):
    orchestrator → dispatch_table((block, layer, property)) → resolvers/<id>.py
    each resolver calls services/<step>.py; the whole thing is gated by the
    anti-cheat gates under converter/gates/ and the F2 ledger / F3 oracle.

HARD CONSTRAINT (import-ban gate): nothing under converter/ may import from
``orchestrator.converter_v2`` AT ALL (EXECUTION Step 9, Phase 3, 2026-07-04 —
``db_lookup`` and ``icon_resolver`` moved to ``converter.db.db_lookup`` /
``converter.services.icon_resolver``; the old frozen-tree paths are now
re-export shims kept only for the 4 importlib by-path loaders + the frozen
``convert.py`` itself). The frozen engine is NEVER a comparison oracle (D-B);
the only correctness comparison is draft-vs-clone (the F3 render-oracle).
"""
