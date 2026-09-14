"""Spec 31 Phase 5c.4 self-test for stage1_boundary_hook.

Plan contract:
  - Run /sgs-clone against a Bootstrap-style mockup -> lingua_franca
    fires + downstream stages see SGS-BEM as canonical.
  - Run /sgs-clone against Mama's (already SGS-BEM) -> lingua_franca
    skips (no false rewrites).
"""
from __future__ import annotations

import importlib.util
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).parent
SPEC = importlib.util.spec_from_file_location("stage1_boundary_hook",
                                              HERE / "stage1_boundary_hook.py")
mod = importlib.util.module_from_spec(SPEC)
sys.modules["stage1_boundary_hook"] = mod
SPEC.loader.exec_module(mod)


def test_canonical_sgs_bem_skipped() -> None:
    """Bean-controlled SGS-BEM draft: hook skips, no rewrites."""
    boundary = {
        "section_id": "sec-hero",
        "selector": ".sgs-hero",
        "class_signature": ["sgs-hero", "sgs-hero__copy", "sgs-hero__cta--primary"],
    }
    out = mod.enrich_boundary(boundary)
    assert out["lingua_franca_skipped"] is True, f"expected skipped, got {out}"
    assert out["source_convention"] == "SGS WordPress"
    # No rewrites: every source class maps to itself
    for src, dst in out["equivalent_implementations"].items():
        assert src == dst, f"canonical class rewritten: {src} -> {dst}"
    assert not out["gap_candidate_classes"]
    print("  PASS  canonical-sgs-bem-skipped: 3 classes preserved")


def test_bootstrap_boundary_converts() -> None:
    """Bootstrap-style class signature converts to SGS-BEM downstream."""
    boundary = {
        "section_id": "sec-cta",
        "selector": ".btn.btn-primary",
        "class_signature": ["btn", "btn-primary"],
    }
    out = mod.enrich_boundary(boundary)
    assert out["lingua_franca_skipped"] is False, f"should not skip non-canonical: {out}"
    assert out["source_convention"] == "Bootstrap 5", f"got {out['source_convention']}"
    assert out["primary_sgs_bem"], f"no primary picked: {out}"
    assert "sgs-button" in out["primary_sgs_bem"]
    # equivalent_implementations is the Rosetta-stone map
    assert set(out["equivalent_implementations"].keys()) == {"btn", "btn-primary"}
    print(f"  PASS  bootstrap-converts: primary={out['primary_sgs_bem']}")


def test_unknown_classes_become_gap_candidates() -> None:
    """Garbage / hashed classes route to layout-signature + flag gap candidates."""
    boundary = {
        "section_id": "sec-evil",
        "selector": "[class*=css-]",
        "class_signature": ["css-x4j8m2k1", "uagb-block-a1b2c3d4"],
    }
    out = mod.enrich_boundary(boundary)
    # Both classes should be gap-flagged
    assert len(out["gap_candidate_classes"]) == 2, f"got {out['gap_candidate_classes']}"
    print(f"  PASS  unknown-classes: {len(out['gap_candidate_classes'])} gap candidate(s)")


def test_full_stage1_payload_enrichment() -> None:
    """enrich_stage1_payload iterates every boundary + preserves shape."""
    payload = {
        "boundaries": [
            {"section_id": "s1", "selector": ".x", "class_signature": ["sgs-hero"]},
            {"section_id": "s2", "selector": ".y", "class_signature": ["btn", "btn-primary"]},
        ],
        "meta": {"source": "test"},
    }
    out = mod.enrich_stage1_payload(payload)
    # Meta preserved
    assert out["meta"] == {"source": "test"}
    assert len(out["boundaries"]) == 2
    # First boundary skipped (SGS-BEM); second converted (Bootstrap)
    assert out["boundaries"][0]["lingua_franca_skipped"] is True
    assert out["boundaries"][1]["lingua_franca_skipped"] is False
    print("  PASS  stage1-payload: 2 boundaries enriched, meta preserved")


def test_writes_back_to_staged_output() -> None:
    """enrich_run reads + writes via staged_output convention."""
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        # Load staged_output through the same mechanism so we share the path
        # convention.
        so = mod._so
        so.write_artefact("run-5c4", 1, {
            "boundaries": [
                {"section_id": "s1", "selector": ".x", "class_signature": ["sgs-hero"]},
            ]
        }, root=root)
        target = mod.enrich_run("run-5c4", root=root)
        result = so.read_artefact("run-5c4", 1, root=root)
        assert result["boundaries"][0]["lingua_franca_skipped"] is True
        rel = str(target.relative_to(root)).replace(chr(92), '/')
        assert rel == "sgs-clone/run-5c4/stage-1-boundary.json"
    print("  PASS  writes-back: enriched artefact persists at canonical path")


def test_injected_classifier_takes_precedence() -> None:
    """Pluggable classifier overrides the heuristic."""
    boundary = {"section_id": "s", "selector": ".x",
                "class_signature": ["btn", "btn-primary"]}
    # Force kebab-semantic classification instead of the heuristic Bootstrap match
    forced = lambda _classes: "kebab-semantic"
    out = mod.enrich_boundary(boundary, classifier=forced)
    assert out["source_convention"] == "kebab-semantic"
    print("  PASS  injected-classifier: overrides heuristic when provided")


# --- Tier 1 addition (2026-09-14, BEM-recognition brainstorm doc Q1) -------

def test_data_slot_resolves_a_hashed_class_signature() -> None:
    """A boundary carrying a hashed/generated class (CSS-in-JS output) plus
    a real data-slot attribute -- per-section-convention-voter.py threads
    the attribute through as boundary['data_slot'] -- resolves via the
    attribute even though the class string itself carries zero signal."""
    boundary = {
        "section_id": "sec-shadcn-card",
        "selector": "[data-slot=card]",
        "class_signature": ["sc-a1b2c3d4x5"],
        "data_slot": "card",
    }
    out = mod.enrich_boundary(boundary)
    assert out["lingua_franca_skipped"] is False
    assert out["primary_is_slot_map_hit"] is True, f"expected data-slot hit: {out}"
    assert "sgs-card-grid" in out["primary_sgs_bem"], f"got {out['primary_sgs_bem']}"
    print(f"  PASS  data-slot-resolves-hashed-class: primary={out['primary_sgs_bem']}")


# --- research-buddies fix (2026-09-14): w-/h- Webflow vs Tailwind --------

def test_w_prefix_regression_cases() -> None:
    """Every case the research-buddies investigation traced through,
    re-confirmed as a durable test (not just an inline python -c check)."""
    webflow_cases = ["w-nav", "w-nav-link", "w-dyn-item", "w-slider-mask",
                      "w-col-4", "w-commerce-cartitem", "w--current",
                      "w-icon-nav-menu"]
    tailwind_cases = ["w-full", "w-64", "w-screen", "w-1/2", "w-auto",
                       "w-[300px]", "h-8", "h-screen", "h-lh", "w-sm", "w-7xl"]
    for cls in webflow_cases:
        got = mod.classify_w_prefixed(cls)
        assert got == "Webflow", f"{cls!r} -> {got!r}, expected Webflow"
    for cls in tailwind_cases:
        got = mod.classify_w_prefixed(cls)
        assert got == "Tailwind utility", f"{cls!r} -> {got!r}, expected Tailwind utility"
    print(f"  PASS  w-prefix-regression: {len(webflow_cases)} Webflow + {len(tailwind_cases)} Tailwind cases")


def test_w_prefix_residue_defaults_to_webflow_without_hint() -> None:
    """A novel w-/h- class matching NEITHER closed vocabulary, with no
    source_builder hint, defaults to Webflow -- confirmed empirically
    (not assumed) that Tailwind never emits a word-suffixed w-/h- class
    outside its own closed keyword set."""
    got = mod.classify_w_prefixed("w-totally-novel-thing")
    assert got == "Webflow", f"got {got}"
    print("  PASS  w-prefix-residue-default: unknown w- class defaults to Webflow")


def test_w_prefix_per_class_certainty_outranks_page_hint() -> None:
    """THE hard-constraint test for the mixed-page guarantee: per-class
    certainty (either closed vocabulary matching) must ALWAYS outrank the
    page-level source_builder hint -- a page-level flag overriding a
    per-class certainty would be a worse bug than the one being fixed."""
    # w-full is unambiguously Tailwind even when the page hint says Webflow
    # (a Tailwind custom-code embed inside an otherwise-Webflow page).
    assert mod.classify_w_prefixed("w-full", source_builder="webflow") == "Tailwind utility"
    # w-nav is unambiguously Webflow even when the page hint says Tailwind
    # (a vendored Webflow form fragment inside a Tailwind-built page).
    assert mod.classify_w_prefixed("w-nav", source_builder="tailwind") == "Webflow"
    print("  PASS  w-prefix-hint-never-overrides: per-class certainty always wins")


def test_heuristic_classify_uses_w_prefix_classifier() -> None:
    """heuristic_classify() must route w-/h- classes through
    classify_w_prefixed(), not the generic pattern list -- proves the
    end-to-end wiring, not just the standalone function."""
    assert mod.heuristic_classify(["w-nav"]) == "Webflow"
    assert mod.heuristic_classify(["w-full", "flex"]) == "Tailwind utility"
    # Mixed signature: 2 Webflow classes should outvote 1 Tailwind class.
    assert mod.heuristic_classify(["w-nav", "w-dyn-item", "w-full"]) == "Webflow"
    print("  PASS  heuristic-classify-w-prefix-wiring: routes through classify_w_prefixed")


def test_enrich_boundary_threads_source_builder() -> None:
    """A boundary carrying source_builder="tailwind" resolves an otherwise-
    ambiguous w- class correctly through the full enrich_boundary() path."""
    boundary = {
        "section_id": "s", "selector": ".x",
        "class_signature": ["w-full"],
        "source_builder": "tailwind",
    }
    out = mod.enrich_boundary(boundary)
    assert out["source_convention"] == "Tailwind utility", f"got {out['source_convention']}"
    print("  PASS  enrich-boundary-source-builder: threaded through end-to-end")


def main() -> int:
    print("Spec 31 Phase 5c.4 -- stage1_boundary_hook contract")
    test_canonical_sgs_bem_skipped()
    test_bootstrap_boundary_converts()
    test_unknown_classes_become_gap_candidates()
    test_full_stage1_payload_enrichment()
    test_writes_back_to_staged_output()
    test_injected_classifier_takes_precedence()
    test_data_slot_resolves_a_hashed_class_signature()
    test_w_prefix_regression_cases()
    test_w_prefix_residue_defaults_to_webflow_without_hint()
    test_w_prefix_per_class_certainty_outranks_page_hint()
    test_heuristic_classify_uses_w_prefix_classifier()
    test_enrich_boundary_threads_source_builder()
    print("\nSTAGE1-HOOK-5C.4: PASS (canonical skip + bootstrap convert + gap candidates + payload + writeback + injectable)")
    print("STAGE1-HOOK-TIER-1: PASS (data-slot attribute resolves a hashed class signature)")
    print("STAGE1-HOOK-W-PREFIX: PASS (research-buddies Webflow/Tailwind disambiguation)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
