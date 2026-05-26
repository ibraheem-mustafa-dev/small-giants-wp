"""test_atomic_tag_map.py — Unit tests for atomic_tag_map() in db_lookup.py.

Spec 22 §14 Appendix B / Commit 1.2.

Resolution is html-canonical (Tier A: _HTML_TAG_TO_CORE_SLUG → blocks.replaces
reverse-walk; Tier B: core slug fallback). slot_synonyms.html_semantic_tag is
NOT consulted (slot-contextual, not html-canonical — see module-level comment).

Covers:
  - All 9 legacy-domain tags (h1-h6, p, img, hr) resolve to spec-aligned SGS slugs
  - Bean's directive 2026-05-28: h2 → sgs/heading, button → sgs/button
  - Tier A resolutions via blocks.replaces reverse-walk
  - Tier B fallback when no SGS block replaces the core slug
  - LRU cache: two consecutive calls return the same dict object
  - Result is a dict[str, str] (all values are strings)
"""
from __future__ import annotations

import sys
import os

sys.stdout.reconfigure(encoding="utf-8")

# Import db_lookup directly by file path to avoid loading converter_v2/__init__.py,
# which imports `convert` (not yet written — Commit 1.4). This is safe because
# db_lookup.py has no intra-package dependencies.
import importlib.util

_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
_PKG_DIR = os.path.dirname(_THIS_DIR)  # converter_v2/
_DB_LOOKUP_PATH = os.path.join(_PKG_DIR, "db_lookup.py")

_spec = importlib.util.spec_from_file_location("db_lookup", _DB_LOOKUP_PATH)
_db_lookup = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_db_lookup)

atomic_tag_map = _db_lookup.atomic_tag_map
_HTML_TAG_TO_CORE_SLUG = _db_lookup._HTML_TAG_TO_CORE_SLUG


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

    m = atomic_tag_map()

    # ------------------------------------------------------------------
    # 1. Return type
    # ------------------------------------------------------------------
    if isinstance(m, dict) and all(isinstance(k, str) and isinstance(v, str) for k, v in m.items()):
        ok("atomic_tag_map() returns dict[str, str]")
    else:
        fail("return type", f"expected dict[str, str], got {type(m)}")

    # ------------------------------------------------------------------
    # 2. All 9 legacy-domain tags resolve to a non-None, non-empty slug
    # ------------------------------------------------------------------
    legacy_tags = ["h1", "h2", "h3", "h4", "h5", "h6", "p", "img", "hr"]
    for tag in legacy_tags:
        slug = m.get(tag)
        if slug:
            ok(f"legacy tag '{tag}' → '{slug}' (non-None)")
        else:
            fail(f"legacy tag '{tag}'", "resolved to None or missing")

    # ------------------------------------------------------------------
    # 3. Spec-aligned routing per Spec 22 §14 Appendix B example +
    #    Bean directive 2026-05-28
    # ------------------------------------------------------------------
    expected = {
        # Spec §14 example: h1-h6 → sgs/heading (all headings, not just h1)
        "h1": "sgs/heading",
        "h2": "sgs/heading",  # Bean directive 2026-05-28
        "h3": "sgs/heading",
        "h4": "sgs/heading",
        "h5": "sgs/heading",
        "h6": "sgs/heading",
        # Spec §14 example: p → sgs/text, img → sgs/media, hr → sgs/divider
        "p": "sgs/text",
        "img": "sgs/media",
        "hr": "sgs/divider",
        # Bean directive 2026-05-28: button → sgs/button (walker auto-wraps in sgs/multi-button)
        "button": "sgs/button",
        "a": "sgs/button",
        # Other atomic primitives via blocks.replaces reverse-walk
        "blockquote": "sgs/quote",
    }
    for tag, want in expected.items():
        got = m.get(tag)
        if got == want:
            ok(f"{tag} → {want}")
        else:
            fail(f"{tag} routing", f"expected {want!r}, got {got!r}")

    # ul / ol → sgs/icon-list (Tier A via core/list reverse-walk).
    # Note: multiple SGS blocks may replace core/list (sgs/icon-list).
    # Tiebreaker is alphabetical via _blocks_replaces_reverse().
    for tag in ("ul", "ol"):
        slug = m.get(tag)
        if slug and slug.startswith("sgs/"):
            ok(f"{tag} → {slug} (Tier A: core/list reverse-walk)")
        else:
            fail(f"{tag} routing", f"expected sgs/* via core/list reverse-walk, got {slug!r}")

    # ------------------------------------------------------------------
    # 4. Confirm slot_synonyms.html_semantic_tag is NOT consulted —
    #    slot-contextual tags like 'span'/'svg'/'article' that previously
    #    leaked into the map via Tier 1 should now be ABSENT.
    # ------------------------------------------------------------------
    slot_contextual_only = ["span", "svg", "article", "li", "figcaption", "figure", "time"]
    leaked = [t for t in slot_contextual_only if t in m]
    if not leaked:
        ok("slot-contextual tags (span/svg/article/li/figcaption/figure/time) NOT in map")
    else:
        fail("slot-contextual leakage",
             f"these tags leaked into atomic_tag_map (slot_synonyms still being queried?): {leaked}")

    # ------------------------------------------------------------------
    # 5. Map size — should equal len(_HTML_TAG_TO_CORE_SLUG); no extras.
    # ------------------------------------------------------------------
    if len(m) == len(_HTML_TAG_TO_CORE_SLUG):
        ok(f"atomic_tag_map size = {len(m)} (matches _HTML_TAG_TO_CORE_SLUG)")
    else:
        fail("map size",
             f"expected {len(_HTML_TAG_TO_CORE_SLUG)} entries (from _HTML_TAG_TO_CORE_SLUG), got {len(m)}")

    # ------------------------------------------------------------------
    # 6. LRU cache: two consecutive calls return the same dict object
    # ------------------------------------------------------------------
    m2 = atomic_tag_map()
    if m is m2:
        ok("LRU cache: atomic_tag_map() returns same dict object on second call")
    else:
        fail("LRU cache", "two calls returned different objects (cache miss)")

    # ------------------------------------------------------------------
    # 7. No None values in returned dict
    # ------------------------------------------------------------------
    none_tags = [tag for tag, slug in m.items() if slug is None]
    if not none_tags:
        ok("No None values in atomic_tag_map() result")
    else:
        fail("None values", f"tags with None slug: {none_tags}")

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
        print("All atomic_tag_map tests PASS.")

    # ------------------------------------------------------------------
    # Print the full resolved map for main-thread verification
    # ------------------------------------------------------------------
    print("\n=== atomic_tag_map() output ===")
    for tag, slug in sorted(m.items()):
        print(f"  {tag!r}: {slug!r}")


if __name__ == "__main__":
    run_tests()
