"""fate_classifier.py — Module 2 of 3 for the cloning-fidelity verifier.

Given a draft DOM node's BEM classes + HTML tag + section identifier, decides
the EXPECTED FATE of that node when the cloning converter processes it.  This
lets the verifier look for content/CSS in the RIGHT place rather than at the
same DOM path.

The 4 fates
-----------
chrome       — node belongs to a theme template part (header / footer / skip-link)
               that the converter never clones.  Excluded from the fidelity
               denominator.

emit-block   — the node's BEM block part resolves to a registered SGS block.
               Content + CSS should appear ON that block.

fold-parent  — transparent structural wrapper that the converter folds into its
               parent.  CSS appears on the PARENT block, not a separate element.
               Detected when:
               • BEM element is 'inner' (slots table: standalone_block IS NULL)
               • BEM element resolves via slots to standalone_block='sgs/container'
               • BEM element is a known structural-wrapper synonym (see
                 _STRUCTURAL_ELEMENTS below)

lift-attr    — BEM element whose content/CSS becomes a block ATTRIBUTE of its
               parent block (e.g. sgs-trust-bar__label → items[].label;
               sgs-hero__title → headline attr).  Content appears inside the
               parent block; it is NOT a separately emitted element.
               This is the safe default for unrecognised elements — a wrong
               'lift-attr' causes a false-negative score; a wrong 'fold-parent'
               causes a false exclusion (worse).

Mapping rules (BEM-driven — Spec 00 §3.1, BEM is the recognition signal)
--------------------------------------------------------------------------
1. Chrome check first: section/class prefix matches sgs-header*, sgs-footer*,
   or *skip-link* → fate='chrome'.
2. Parse every class as sgs-<block>[__<element>][--<modifier>].
   For each parsed class:
   a. No __element → candidate block = sgs/<block>.
      block_exists(candidate) → emit-block.
   b. __element present →
      i.  resolve_slug_from_bem([class]) — if it returns a registered block
          slug that is NOT sgs/container → emit-block.  (The converter will
          emit this as a child block, not fold it.)
      ii. Is the element structurally transparent?  Check:
          - element in _STRUCTURAL_ELEMENTS  (inner, wrapper, container,
            shell, wrap)
          - OR slots table standalone_block = 'sgs/container' for this slot
          - OR slots table standalone_block IS NULL AND element resolves to
            canonical slot 'inner'
          → fold-parent.
      iii. Otherwise → lift-attr.
3. If no sgs-* class matches the rules above (e.g. plain utility class):
   fate='lift-attr', note explains.

DB tables consulted
-------------------
• blocks (slug, status)                       — block_exists() / registered_block_slugs()
• slots (slot_name, scope, standalone_block)  — standalone_block_for() / canonical_slot_for()
• block_composition (block_slug, wraps_block) — implicit via resolve_slug_from_bem

Author: Claude Code (Module 2 / parity2)
Spec: Spec 22 §FR-22-21; Spec 00 §3.1; R-22-1 (DB-first), R-22-9 (universal)
"""
from __future__ import annotations

import re
import sqlite3
import sys
from pathlib import Path
from typing import NamedTuple

# ---------------------------------------------------------------------------
# Path setup — allow running from any cwd by finding db_lookup relative to
# this file's location.
# ---------------------------------------------------------------------------
_HERE = Path(__file__).resolve()
_CONVERTER_V2 = _HERE.parents[1] / "orchestrator" / "converter_v2"
if str(_CONVERTER_V2) not in sys.path:
    sys.path.insert(0, str(_CONVERTER_V2))

import db_lookup as _db  # noqa: E402  (import after sys.path manipulation)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

#: BEM element names that always signal a transparent structural wrapper
#: regardless of whether they appear in the slots table.  These are folded
#: into the parent by the converter (see convert.py _process_container_children
#: fold rule: cslug is None + csgs + fold_eligible → fold).
_STRUCTURAL_ELEMENTS: frozenset[str] = frozenset({
    "inner",
    "wrapper",
    "container",
    "shell",
    "wrap",
    "outer",
    "body",   # used as a pure layout wrapper (not content) on some composites
})

#: Class prefixes / substrings that identify chrome template-part nodes.
#: Checked against the SECTION parameter (the outermost section class) and
#: against individual class names so element classes inside a chrome section
#: are also caught.
_CHROME_PREFIXES: tuple[str, ...] = ("sgs-header", "sgs-footer")
_CHROME_SUBSTRINGS: tuple[str, ...] = ("skip-link",)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

class ClassifyResult(NamedTuple):
    fate: str          # 'chrome' | 'emit-block' | 'fold-parent' | 'lift-attr'
    block: str | None  # 'sgs/<name>' if fate is emit-block, else None
    note: str          # human-readable explanation (DB values cited)


def classify(classes: list[str], tag: str, section: str) -> dict:
    """Classify a draft DOM node's expected fate after conversion.

    Parameters
    ----------
    classes : list[str]
        All CSS classes on this DOM node (e.g. ['sgs-trust-bar__inner', 'u-flex']).
    tag : str
        HTML tag name, lower-case (e.g. 'div', 'section', 'header').
        Used only for chrome detection; not the routing signal (Spec 00 §3.1).
    section : str
        The BEM block class of the outermost section containing this node
        (e.g. 'sgs-trust-bar', 'sgs-hero').  Used for chrome detection and
        context in notes.

    Returns
    -------
    dict with keys 'fate', 'block', 'note'.
    """
    result = _classify_inner(classes, tag, section)
    return {"fate": result.fate, "block": result.block, "note": result.note}


# ---------------------------------------------------------------------------
# Internal implementation
# ---------------------------------------------------------------------------

def _is_chrome(classes: list[str], tag: str, section: str) -> bool:
    """Return True if this node belongs to a template-part the converter skips."""
    # HTML tag gate (header/footer/nav are in SKIP_TOP_LEVEL_TAGS in convert.py)
    if tag in ("header", "footer", "nav"):
        return True
    # Section gate: if the OUTERMOST section is a chrome section, everything
    # inside it is chrome.
    if any(section.startswith(p) for p in _CHROME_PREFIXES):
        return True
    if any(sub in section for sub in _CHROME_SUBSTRINGS):
        return True
    # Per-class gate: any class on THIS node matches a chrome prefix.
    for cls in classes:
        if any(cls.startswith(p) for p in _CHROME_PREFIXES):
            return True
        if any(sub in cls for sub in _CHROME_SUBSTRINGS):
            return True
    return False


def _slot_standalone_block(element_token: str) -> str | None:
    """Return the standalone_block for an element token via the slots table.

    Uses canonical_slot_for() (alias-aware) then standalone_block_for() —
    exactly the same resolution chain the converter's resolve_slug_from_bem
    uses internally.  Returns None when the slot is unknown or has no
    standalone_block.

    DB path: slots (scope='element') → standalone_block column.
    """
    canonical = _db.canonical_slot_for(element_token)
    if canonical is None:
        # Try the raw token as a canonical slot name (some elements ARE canonical)
        canonical = element_token
    return _db.standalone_block_for(canonical)


def _is_structural_element(element_token: str) -> bool:
    """True when the BEM element is a known structural/transparent wrapper.

    Checks two sources (in order):
    1. _STRUCTURAL_ELEMENTS constant — hard-listed known wrapper names.
    2. Slots table standalone_block — if standalone_block='sgs/container',
       the element routes to sgs/container (a structural wrapper, not content).
    """
    if element_token in _STRUCTURAL_ELEMENTS:
        return True
    standalone = _slot_standalone_block(element_token)
    if standalone == "sgs/container":
        return True
    return False


def _classify_inner(classes: list[str], tag: str, section: str) -> ClassifyResult:
    """Core classification logic.  Iterates sgs-* classes in priority order."""

    # ------------------------------------------------------------------ #
    # Step 1 — chrome check (highest priority)                           #
    # ------------------------------------------------------------------ #
    if _is_chrome(classes, tag, section):
        return ClassifyResult(
            fate="chrome",
            block=None,
            note=(
                f"Node is in a theme template part (tag={tag!r}, section={section!r}). "
                "Converter skips header/footer/skip-link sections entirely (SKIP_TOP_LEVEL_TAGS). "
                "Excluded from fidelity denominator."
            ),
        )

    # ------------------------------------------------------------------ #
    # Step 2 — parse sgs-* classes                                       #
    # ------------------------------------------------------------------ #
    sgs_classes = [c for c in classes if c.startswith("sgs-")]
    if not sgs_classes:
        return ClassifyResult(
            fate="lift-attr",
            block=None,
            note=(
                f"No sgs-* classes on this node (classes={classes!r}). "
                "Treated as lift-attr (utility / non-BEM class; CSS folds to parent)."
            ),
        )

    # Collect BEM parses — we process them in order: block-roots first, then elements.
    parses: list[tuple[str, _db.BemParse]] = []
    for cls in sgs_classes:
        bem = _db.parse_sgs_bem(cls)
        if bem is not None:
            parses.append((cls, bem))

    if not parses:
        return ClassifyResult(
            fate="lift-attr",
            block=None,
            note=(
                f"sgs-* classes present but none match SGS-BEM pattern: {sgs_classes!r}. "
                "Treated as lift-attr."
            ),
        )

    # ------------------------------------------------------------------ #
    # Step 2a — block-root classes (no __element): candidate emit-block  #
    # ------------------------------------------------------------------ #
    block_root_candidates: list[tuple[str, str]] = []
    for cls, bem in parses:
        if bem.element is None:
            slug = f"sgs/{bem.block}"
            if _db.block_exists(slug):
                block_root_candidates.append((cls, slug))

    if block_root_candidates:
        # Use the first registered block root (capability tiebreaking is
        # the converter's responsibility — the verifier just needs the slug).
        cls, slug = block_root_candidates[0]
        return ClassifyResult(
            fate="emit-block",
            block=slug,
            note=(
                f"Class {cls!r} has no __element; sgs/{bem.block} is registered "
                f"(blocks.status='built'). Converter emits this as a standalone "
                f"SGS block. DB: blocks.slug={slug!r}."
            ),
        )

    # ------------------------------------------------------------------ #
    # Step 2b — element classes: check resolve_slug_from_bem             #
    # ------------------------------------------------------------------ #
    # The converter calls resolve_slug_from_bem(sgs_classes) which applies a
    # two-tier lookup:
    #   Tier A: standalone_block_for(canonical_slot_for(element)) from slots table
    #   Tier B: direct block slug match
    # If it returns a non-None, non-container slug → the element routes to an
    # emit-block child (e.g. sgs-trust-bar__label → sgs/label).
    #
    # We call resolve_slug_from_bem on the FULL sgs_classes list (matching the
    # converter) but also test each class individually so we can explain the
    # decision in the note.

    resolved_slug = _db.resolve_slug_from_bem(sgs_classes)

    if resolved_slug is not None and resolved_slug != "sgs/container":
        # Find which class caused the resolution for the note.
        explaining_class = sgs_classes[0]
        for cls in sgs_classes:
            if _db.resolve_slug_from_bem([cls]) == resolved_slug:
                explaining_class = cls
                break
        bem_of_cls = _db.parse_sgs_bem(explaining_class)
        element_token = bem_of_cls.element if (bem_of_cls and bem_of_cls.element) else "?"
        standalone = _slot_standalone_block(element_token)
        return ClassifyResult(
            fate="emit-block",
            block=resolved_slug,
            note=(
                f"Class {explaining_class!r}: element {element_token!r} resolves via "
                f"slots.standalone_block={standalone!r} to block {resolved_slug!r} "
                f"(blocks.status='built'). Converter emits this as a child block, "
                f"not a folded element."
            ),
        )

    # ------------------------------------------------------------------ #
    # Step 2c — element is structural (fold-parent) vs content (lift-attr)#
    # ------------------------------------------------------------------ #
    # At this point resolve_slug_from_bem returned None (or sgs/container which
    # is structural).  Iterate element tokens to classify.

    fold_reasons: list[str] = []
    lift_reasons: list[str] = []

    for cls, bem in parses:
        if bem.element is None:
            # A block-root class that is NOT registered — unregistered block root.
            # Converter falls back to sgs/container (the section default).
            # Classify as emit-block with a note flagging the unregistered state.
            slug_candidate = f"sgs/{bem.block}"
            return ClassifyResult(
                fate="emit-block",
                block="sgs/container",
                note=(
                    f"Class {cls!r} has no __element but sgs/{bem.block} is NOT in "
                    f"blocks (blocks.status='built' check returned False). "
                    "Converter falls back to sgs/container for unregistered block roots. "
                    "Content/CSS will appear on the emitted sgs/container wrapper."
                ),
            )

        element = bem.element

        # Structural element?
        if element in _STRUCTURAL_ELEMENTS:
            fold_reasons.append(
                f"{cls!r}: element={element!r} is in _STRUCTURAL_ELEMENTS "
                f"(known transparent wrapper names)."
            )
            continue

        # Slots table: standalone_block = 'sgs/container' → structural
        standalone = _slot_standalone_block(element)
        if standalone == "sgs/container":
            fold_reasons.append(
                f"{cls!r}: element={element!r} → slots.standalone_block='sgs/container' "
                f"(structural wrapper route)."
            )
            continue

        # Slots table: standalone_block IS NULL and canonical slot is 'inner'
        # (inner is a known pass-through with no standalone block)
        canonical = _db.canonical_slot_for(element) or element
        if canonical == "inner" and standalone is None:
            fold_reasons.append(
                f"{cls!r}: element={element!r} → canonical_slot='inner', "
                f"slots.standalone_block=NULL (pass-through wrapper)."
            )
            continue

        # Not structural — it's a content element that lifts to a parent attr.
        lift_reasons.append(
            f"{cls!r}: element={element!r} → canonical_slot={canonical!r}, "
            f"slots.standalone_block={standalone!r}. "
            "Content/CSS lifts into the parent block as an attribute."
        )

    # ------------------------------------------------------------------ #
    # Step 3 — decide fold-parent vs lift-attr from collected evidence   #
    # ------------------------------------------------------------------ #
    # Fold wins if ANY class signals a structural wrapper.
    # Lift wins if NO fold signal found.
    # When uncertain (mixed signals from multiple classes), prefer lift-attr
    # (a wrong fold is worse: it excludes content from the fidelity score).

    if fold_reasons and not lift_reasons:
        return ClassifyResult(
            fate="fold-parent",
            block=None,
            note=(
                "Structural wrapper: CSS/layout folds into the parent block. "
                "Evidence: " + "; ".join(fold_reasons)
            ),
        )

    if lift_reasons:
        note_parts = ["Content element: lifts to parent block attribute."]
        note_parts += lift_reasons
        if fold_reasons:
            note_parts.append(
                "Mixed signals (some structural, some content classes). "
                "Defaulting to lift-attr (safer — wrong fold → false exclusion)."
            )
            note_parts += fold_reasons
        return ClassifyResult(
            fate="lift-attr",
            block=None,
            note=" ".join(note_parts),
        )

    # Fallback: fold-parent with uncertainty note (only fold signals, but
    # this branch should be unreachable given the logic above — kept as
    # a defensive default)
    return ClassifyResult(
        fate="fold-parent",
        block=None,
        note=(
            "Defensive fallback — fold signals only, no content signals. "
            + ("; ".join(fold_reasons) or "No BEM element evidence found.")
        ),
    )


# ---------------------------------------------------------------------------
# __main__ — self-test
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import textwrap
    # Ensure the console can handle the output on Windows (cp1252 lacks some arrows).
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[attr-defined]

    TEST_CASES = [
        # (description, classes, tag, section, expected_fate)
        (
            "sgs-trust-bar (section root)",
            ["sgs-trust-bar"],
            "section",
            "sgs-trust-bar",
            "emit-block",
        ),
        (
            "sgs-trust-bar__badge (BEM element)",
            ["sgs-trust-bar__badge"],
            "div",
            "sgs-trust-bar",
            None,  # could be fold-parent or lift-attr — show DB evidence
        ),
        (
            "sgs-trust-bar__inner (structural wrapper)",
            ["sgs-trust-bar__inner"],
            "div",
            "sgs-trust-bar",
            "fold-parent",
        ),
        (
            "sgs-trust-bar__label (content element)",
            ["sgs-trust-bar__label"],
            "span",
            "sgs-trust-bar",
            None,  # explain via DB
        ),
        (
            "sgs-hero (section root)",
            ["sgs-hero"],
            "section",
            "sgs-hero",
            "emit-block",
        ),
        (
            "sgs-hero__content (structural or lift?)",
            ["sgs-hero__content"],
            "div",
            "sgs-hero",
            None,  # explain via DB
        ),
        (
            "sgs-header__logo (chrome section)",
            ["sgs-header__logo"],
            "div",
            "sgs-header",
            "chrome",
        ),
        (
            "sgs-featured-product (no registered block)",
            ["sgs-featured-product"],
            "section",
            "sgs-featured-product",
            "emit-block",  # falls back to sgs/container per converter
        ),
    ]

    col_w = [42, 14, 16, 60]
    header = (
        f"{'Test case':<{col_w[0]}} "
        f"{'Fate':<{col_w[1]}} "
        f"{'Block':<{col_w[2]}} "
        f"Note (truncated)"
    )
    print(header)
    print("-" * (sum(col_w) + 3 + 60))

    all_pass = True
    for desc, classes, tag, section, expected_fate in TEST_CASES:
        result = classify(classes, tag, section)
        fate = result["fate"]
        block = result["block"] or "-"
        note_short = textwrap.shorten(result["note"], width=80, placeholder="…")

        pass_flag = ""
        if expected_fate is not None:
            if fate == expected_fate:
                pass_flag = " OK"
            else:
                pass_flag = f" FAIL(expected {expected_fate})"
                all_pass = False

        print(
            f"{desc:<{col_w[0]}} "
            f"{fate:<{col_w[1]}} "
            f"{block:<{col_w[2]}} "
            f"{note_short}{pass_flag}"
        )

    print()
    print("=== Full notes ===")
    for desc, classes, tag, section, _ in TEST_CASES:
        result = classify(classes, tag, section)
        print(f"\n[{desc}]")
        print(f"  fate  : {result['fate']}")
        print(f"  block : {result['block']}")
        print(f"  note  : {result['note']}")

    print()
    if all_pass:
        print("Self-test: all expected fates PASS.")
    else:
        print("Self-test: one or more FAIL — review notes above.")
        sys.exit(1)
