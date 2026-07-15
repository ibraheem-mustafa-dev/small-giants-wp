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


def main() -> int:
    print("Spec 31 Phase 5c.4 -- stage1_boundary_hook contract")
    test_canonical_sgs_bem_skipped()
    test_bootstrap_boundary_converts()
    test_unknown_classes_become_gap_candidates()
    test_full_stage1_payload_enrichment()
    test_writes_back_to_staged_output()
    test_injected_classifier_takes_precedence()
    print("\nSTAGE1-HOOK-5C.4: PASS (canonical skip + bootstrap convert + gap candidates + payload + writeback + injectable)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
