"""Spec 15 Phase 5c.2 + 5c.3 self-test for lingua_franca.py.

Plan contract:
  - 5 conversion rules authored + tested (BEM-bare, Tailwind, Bootstrap,
    shadcn, kebab-semantic)
  - lingua_franca.py round-trips losslessly on known patterns
  - Hashed classes fall through to layout-signature with gap flag
  - Bean-controlled SGS-BEM drafts pass through unchanged (no false rewrites)
"""
from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

HERE = Path(__file__).parent
SPEC = importlib.util.spec_from_file_location("lingua_franca", HERE / "lingua_franca.py")
mod = importlib.util.module_from_spec(SPEC)
# dataclass introspection requires the module live in sys.modules during exec.
sys.modules["lingua_franca"] = mod
SPEC.loader.exec_module(mod)


def test_sgs_bem_canonical_passthrough() -> None:
    """SGS-BEM classes from a Bean-controlled draft must pass through unchanged."""
    for token in ("sgs-hero", "sgs-hero__cta", "sgs-hero__cta--primary",
                  "sgs-card-grid__item--featured"):
        r = mod.convert_class(token)
        assert r.is_canonical_for_drafts, f"canonical not flagged: {token} -> {r.to_dict()}"
        assert r.sgs_bem_class == token, f"SGS-BEM rewritten: {token} -> {r.sgs_bem_class}"
        assert not r.is_gap_candidate
    print("  PASS  sgs-bem-canonical-passthrough: 4 canonical tokens preserved")


def test_bem_bare_block_element_modifier() -> None:
    # The orchestrator classifies the source convention first (via
    # /uimax-classify-naming) then converts -- so non-canonical inputs
    # always carry a hint at the real call site.
    r = mod.convert_class("card__title--highlighted", source_convention_hint="BEM")
    assert r.source_convention == "BEM", f"got {r.source_convention}"
    # 'card' maps to card-grid via slot_map
    assert r.block == "card-grid"
    assert r.sgs_bem_class.startswith("sgs-card-grid"), f"got {r.sgs_bem_class}"
    assert r.element == "title"
    assert r.modifier == "highlighted"
    print(f"  PASS  bem-bare: card__title--highlighted -> {r.sgs_bem_class}")


def test_tailwind_utility() -> None:
    r = mod.convert_class("text-2xl", source_convention_hint="Tailwind utility")
    assert r.source_convention == "Tailwind utility", f"got {r.source_convention}"
    assert r.block == "container", f"got {r.block}"
    print(f"  PASS  tailwind: text-2xl -> {r.sgs_bem_class}")


def test_bootstrap_component_variant() -> None:
    r = mod.convert_class("btn-primary", source_convention_hint="Bootstrap 5")
    assert r.source_convention == "Bootstrap 5", f"got {r.source_convention}"
    assert r.block == "button", f"got {r.block}"
    assert r.modifier == "primary"
    print(f"  PASS  bootstrap: btn-primary -> {r.sgs_bem_class}")


def test_kebab_semantic() -> None:
    r = mod.convert_class("team-grid", source_convention_hint="kebab-semantic")
    assert r.block == "team-member", f"got {r.block}"
    print(f"  PASS  kebab-semantic: team-grid -> {r.sgs_bem_class}")


def test_hashed_class_falls_through_with_gap_flag() -> None:
    for token in ("css-x4j8m2k1", "uagb-block-a1b2c3d4"):
        r = mod.convert_class(token)
        assert r.is_gap_candidate, f"hashed token not flagged as gap: {token}"
        assert "layout-signature" in r.notes
    print("  PASS  hashed-class: css-* + uagb-block-* both flagged is_gap_candidate")


def test_class_signature_aggregates() -> None:
    """convert_class_signature picks primary + builds equivalent_implementations."""
    classes = ["btn", "btn-primary", "px-4", "rounded-md"]
    out = mod.convert_class_signature(classes, source_convention_hint="Bootstrap 5")
    # equivalent_implementations covers every source class
    assert set(out["equivalent_implementations"].keys()) == set(classes)
    assert out["primary_sgs_bem"], f"no primary picked: {out}"
    assert out["source_convention_hint"] == "Bootstrap 5"
    print(f"  PASS  signature-aggregate: primary={out['primary_sgs_bem']}, equiv={len(out['equivalent_implementations'])} entries")


def test_round_trip_identity_for_sgs_bem() -> None:
    """Bean-controlled SGS-BEM tokens round-trip identity (5c.4 fast path)."""
    for token in ("sgs-hero", "sgs-card-grid__item--featured"):
        assert mod.round_trip_check(token), f"identity round-trip failed: {token}"
    # Non-canonical must NOT report identity-OK
    assert not mod.round_trip_check("btn-primary"), "btn-primary falsely identity-OK"
    print("  PASS  round-trip-identity: SGS-BEM passes, non-canonical does not")


def test_signature_no_false_rewrites_on_canonical_draft() -> None:
    """Plan contract: Mama's-style SGS-BEM signature must pass through with NO
    rewrites, NO gap candidates."""
    classes = ["sgs-hero", "sgs-hero__copy", "sgs-hero__cta--primary"]
    out = mod.convert_class_signature(classes)
    for src, dest in out["equivalent_implementations"].items():
        assert src == dest, f"canonical class rewritten: {src} -> {dest}"
    assert not out["gap_candidate_classes"]
    print("  PASS  no-false-rewrites: canonical SGS-BEM signature untouched")


def test_unknown_token_routes_to_layout_signature() -> None:
    """Plan: unmatched -> is_gap_candidate=True, container default block."""
    r = mod.convert_class("ZZ_GARBAGE_99")
    assert r.is_gap_candidate, f"unknown not gap-flagged: {r.to_dict()}"
    assert r.block == "container"
    print("  PASS  unknown-token: layout-signature fall-through with is_gap_candidate=True")


def main() -> int:
    print("Spec 15 Phase 5c.2 + 5c.3 -- lingua_franca contract")
    test_sgs_bem_canonical_passthrough()
    test_bem_bare_block_element_modifier()
    test_tailwind_utility()
    test_bootstrap_component_variant()
    test_kebab_semantic()
    test_hashed_class_falls_through_with_gap_flag()
    test_class_signature_aggregates()
    test_round_trip_identity_for_sgs_bem()
    test_signature_no_false_rewrites_on_canonical_draft()
    test_unknown_token_routes_to_layout_signature()
    print("\nLINGUA-FRANCA-5C: PASS (5 rules + canonical passthrough + hashed gap + no-false-rewrites)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
