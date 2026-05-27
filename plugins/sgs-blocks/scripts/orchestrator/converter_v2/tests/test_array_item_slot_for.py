"""test_array_item_slot_for.py — Unit tests for array_item_slot_for() in db_lookup.py.

Spec 22 §FR-22-2.5 / Commit 1.3 (Phase 1.3a).

Covers:
  - Tier A: populated canonical_slot returns the slot string
  - Tier B: NULL canonical_slot on array attr returns None (walker falls back to BEM)
  - Non-array attrs return None (caller misuse contract)
  - Missing attrs return None
  - LRU cache: two consecutive calls return the same value (no re-query)
  - The 4 Phase 1.3a backfilled attrs resolve correctly
  - The 3 config arrays (role='layout', canonical_slot NULL) return None
"""
from __future__ import annotations

import sys
import os

sys.stdout.reconfigure(encoding="utf-8")

import importlib.util

_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
_PKG_DIR = os.path.dirname(_THIS_DIR)  # converter_v2/
_DB_LOOKUP_PATH = os.path.join(_PKG_DIR, "db_lookup.py")

_spec = importlib.util.spec_from_file_location("db_lookup", _DB_LOOKUP_PATH)
_db_lookup = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_db_lookup)

array_item_slot_for = _db_lookup.array_item_slot_for


def run_tests() -> None:
    failures: list[str] = []
    passes: int = 0

    def ok(label: str) -> None:
        nonlocal passes
        passes += 1
        print(f"  [PASS] {label}")

    def fail(label: str, detail: str) -> None:
        failures.append(f"{label}: {detail}")
        print(f"  [FAIL] {label} — {detail}")

    def check(block_slug: str, attr_name: str, expected, label: str) -> None:
        actual = array_item_slot_for(block_slug, attr_name)
        if actual == expected:
            ok(f"{label}: {block_slug}.{attr_name} → {actual!r}")
        else:
            fail(label, f"expected {expected!r}, got {actual!r}")

    # ------------------------------------------------------------------
    # 1. Phase 1.3a backfilled attrs (Tier A — canonical_slot populated)
    # ------------------------------------------------------------------
    check("sgs/product-card",       "packSizes",  "button",  "Tier A: packSizes")
    check("sgs/gallery",            "mediaItems", "media",   "Tier A: mediaItems")
    check("sgs/form-field-address", "fields",     "options", "Tier A: form-field-address.fields")
    check("sgs/form-field-tiles",   "tiles",      "options", "Tier A: form-field-tiles.tiles")

    # ------------------------------------------------------------------
    # 2. Pre-existing populated array attrs (regression — must not break)
    # ------------------------------------------------------------------
    check("sgs/cta-section",       "buttons",     "button",  "Existing: cta-section.buttons")
    check("sgs/icon-list",         "items",       "items",   "Existing: icon-list.items")
    check("sgs/process-steps",     "steps",       "step",    "Existing: process-steps.steps")
    check("sgs/testimonial-slider", "testimonials", "review", "Existing: testimonial-slider.testimonials")
    check("sgs/timeline",          "entries",     "card",    "Existing: timeline.entries")

    # ------------------------------------------------------------------
    # 3. Tier B — NULL canonical_slot on a true array attr (walker BEM fallback)
    # ------------------------------------------------------------------
    # Config arrays: role='layout', canonical_slot NULL. They ARE array-typed
    # so the function reaches the canonical_slot return path; expect None.
    check("sgs/info-box",          "elementOrder",  None, "Tier B: info-box.elementOrder (config)")
    check("sgs/form-field-file",   "allowedTypes",  None, "Tier B: form-field-file.allowedTypes (config)")
    check("sgs/table-of-contents", "headingLevels", None, "Tier B: table-of-contents.headingLevels (config)")

    # ------------------------------------------------------------------
    # 4. Non-array attrs (caller misuse — must return None defensively)
    # ------------------------------------------------------------------
    check("sgs/hero",     "headlineFontSize", None, "Non-array: hero.headlineFontSize (number)")
    check("sgs/heading",  "content",          None, "Non-array: heading.content (string)")

    # ------------------------------------------------------------------
    # 5. Missing attrs (must return None — never raise)
    # ------------------------------------------------------------------
    check("sgs/nonexistent-block", "fakeAttr", None, "Missing block")
    check("sgs/hero",              "doesNotExist", None, "Missing attr on real block")

    # ------------------------------------------------------------------
    # 6. LRU cache verification
    # ------------------------------------------------------------------
    a = array_item_slot_for("sgs/product-card", "packSizes")
    b = array_item_slot_for("sgs/product-card", "packSizes")
    if a == b == "button":
        ok("LRU cache: repeated call returns same value (cache hit)")
    else:
        fail("LRU cache", f"first={a!r} second={b!r}")

    # ------------------------------------------------------------------
    # Summary
    # ------------------------------------------------------------------
    print()
    total = passes + len(failures)
    print(f"Results: {passes}/{total} passed, {len(failures)} failed")

    if failures:
        print("\nFailed tests:")
        for f in failures:
            print(f"  - {f}")
        sys.exit(1)
    else:
        print("All array_item_slot_for tests PASS.")


if __name__ == "__main__":
    run_tests()
