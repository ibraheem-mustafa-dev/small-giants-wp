"""test_metamorphic_real_draft.py — REAL-DRAFT metamorphic legs (D278, 2026-07-05).

``test_metamorphic_universality.py`` proves its 3 relations against small
SYNTHETIC fixtures. That is a real gap per STOP-34 /
``feedback_synthetic_fixture_green_not_real_draft_correct`` — a hand-written
node can take a DIFFERENT recognition path than the real draft and pass while
real input fails (the multi-button synthetic-vs-real divergence that STOP-34
itself documents). This file adds TWO metamorphic relations exercised against
the FULL real ``sites/mamas-munches/mockups/homepage/index.html`` draft — all
9 top-level sections (header, the 7 <section class="sgs-*"> children of
<main>, footer), through the same production entry point
(``converter.entry.convert_section``) and the same harness
``tests/seed_conformance_goldens.py`` uses for the D278 golden re-seed.

Run from plugins/sgs-blocks/scripts:
    python -m pytest converter/tests/test_metamorphic_real_draft.py -q --import-mode=importlib

Relations:

  1. SECTION-ORDER permutation — convert the 9 real sections in draft order,
     then again in REVERSED order; each section's OWN emit must be identical
     regardless of processing order (no cross-section state leakage). If
     state genuinely leaks, that is a real bug and this test reports it with
     evidence — it does not weaken the assertion to pass.

  2. PX-SCALE-BY-K — multiply every integer ``NNNpx`` value in the draft's
     CSS text by k=2 (regex on the raw CSS string, declaration bodies only —
     see ``_scale_css_px_declarations`` for why ``@media`` breakpoint
     conditions are excluded from the scale), re-convert all 9 sections, and
     assert every draft-derived px value transferred into the emitted markup
     scaled by exactly k. Values that legitimately do NOT scale (device-tier
     breakpoint constants the converter reads from a hardcoded source, not
     from the css literal) are excluded via a NAMED list with a cited reason,
     never silently ignored.

If a relation genuinely fails against the real draft, this file reports the
failure with full evidence (that IS the point of a real-draft metamorphic
leg) rather than narrowing the assertion until it passes.

UK English throughout.
"""
from __future__ import annotations

import importlib.util as _importlib_util
import re
import sys
from pathlib import Path

import pytest
from bs4 import BeautifulSoup

# ---------------------------------------------------------------------------
# sys.path — mirror test_metamorphic_universality.py's own setup so
# converter.* resolves when this file is run standalone or as part of a
# combined multi-path pytest invocation.
# ---------------------------------------------------------------------------

_SCRIPTS_ROOT = Path(__file__).resolve().parents[2]  # plugins/sgs-blocks/scripts
if str(_SCRIPTS_ROOT) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_ROOT))

from converter.entry import convert_section, reset_pipeline_seed  # noqa: E402

# ---------------------------------------------------------------------------
# Load tests/seed_conformance_goldens.py by FILE PATH, not package import.
# Several sibling directories in this repo are named "tests" (this file's own
# converter/tests, ledger/tests, and cheat-gate/tests under an invalid
# hyphenated parent) — under --import-mode=importlib a combined multi-path
# pytest run can bind the bare module name "tests" to whichever of those
# directories collection reaches first, so a package import is not reliable.
# See the identical note in tests/test_converter_conformance.py.
# ---------------------------------------------------------------------------

_SEED_MODULE_PATH = _SCRIPTS_ROOT / "tests" / "seed_conformance_goldens.py"
_seed_spec = _importlib_util.spec_from_file_location(
    "sgs_conformance_golden_seeder", _SEED_MODULE_PATH
)
_seed_mod = _importlib_util.module_from_spec(_seed_spec)
_seed_spec.loader.exec_module(_seed_mod)  # type: ignore[union-attr]

collect_real_draft_sections = _seed_mod.collect_real_draft_sections
run_converter_full = _seed_mod.run_converter_full


# ---------------------------------------------------------------------------
# Relation 1 — SECTION-ORDER permutation
# ---------------------------------------------------------------------------

def test_metamorphic_section_order_permutation_real_draft():
    """Convert all 9 real-draft sections in draft order, then in REVERSED
    order; each section's own emitted block_markup must be byte-identical
    regardless of which order the sections were processed in.

    Mirrors how sgs-clone-orchestrator.py calls reset_pipeline_seed() ONCE
    per RUN (not per section) — see entry.py module docstring + the
    orchestrator call site around Stage 4.5 — so this test calls it once
    before each full pass, matching production, rather than between every
    individual section.

    A failure here means some module-level mutable state (a cache, an
    accumulator) is leaking between sections and biasing the emit by
    processing order — a real converter bug, not a test to weaken.
    """
    sections = collect_real_draft_sections()  # [(golden_id, tag, css_text), ...], draft order
    assert len(sections) == 9, f"Expected 9 real-draft sections, got {len(sections)}"

    reset_pipeline_seed()
    forward_markup = {gid: run_converter_full(tag, css)["block_markup"] for gid, tag, css in sections}

    reset_pipeline_seed()
    reversed_sections = list(reversed(sections))
    reversed_markup = {gid: run_converter_full(tag, css)["block_markup"] for gid, tag, css in reversed_sections}

    mismatches = [
        gid for gid, _, _ in sections
        if forward_markup[gid] != reversed_markup.get(gid)
    ]
    assert not mismatches, (
        "Section emit changed when processing order changed — cross-section "
        f"state leakage detected for: {mismatches}\n"
        + "\n".join(
            f"  {gid}:\n    forward:  {forward_markup[gid][:400]!r}\n    reversed: {reversed_markup[gid][:400]!r}"
            for gid in mismatches
        )
    )

    # Sanity: the relation isn't vacuously true because every section emits
    # empty/broken markup. At least the 7 non-chrome sections must have real
    # content (header/footer are legitimately chrome-skipped — empty markup
    # is their CORRECT output, not a vacuous pass).
    non_chrome_ids = [gid for gid, _, _ in sections if not gid.endswith("__header") and not gid.endswith("__footer")]
    assert non_chrome_ids, "Fixture selection produced no non-chrome sections to sanity-check"
    empty_non_chrome = [gid for gid in non_chrome_ids if not forward_markup[gid]]
    assert not empty_non_chrome, (
        f"These non-chrome real-draft sections emitted EMPTY markup — the "
        f"order-invariance check above would be vacuous for them: {empty_non_chrome}"
    )


# ---------------------------------------------------------------------------
# Relation 2 — PX-SCALE-BY-K
# ---------------------------------------------------------------------------

_PX_TOKEN_RE = re.compile(r"(\d+)px")
_MEDIA_CONDITION_RE = re.compile(r"@media[^{]*")
_INLINE_STYLE_ATTR_RE = re.compile(r'style="([^"]*)"')

# Named exclusions — px numbers that legitimately do NOT scale 1:1 with the
# CSS literal they originate from, with a cited reason. Extend this list with
# evidence (not by assumption) if a genuine new case is found.
#
#   768, 1024  — device-tier breakpoint constants. The converter classifies
#                a declaration's responsive TIER (mobile/tablet/desktop) by
#                comparing the @media condition's boundary against hardcoded
#                768/1024 constants (see CLAUDE.md "Responsive breakpoint
#                discipline" + db_lookup's tier-boundary constants), not by
#                reading the boundary as a literal style value to transfer.
#                _scale_css_px_declarations() below deliberately does NOT
#                scale text inside @media(...) conditions for exactly this
#                reason, so 768/1024 should not even appear as "scaled-away"
#                — they are excluded here as a documented belt-and-braces
#                guard in case a declaration BODY (not a media condition)
#                also happens to carry one of these numbers as a legitimate,
#                non-scaling default.
_NON_SCALING_PX_VALUES: frozenset[int] = frozenset({768, 1024})


def _scale_css_px_declarations(css_text: str, k: int) -> str:
    """Multiply every integer ``NNNpx`` value in css_text by k, EXCLUDING
    text inside ``@media(...)`` breakpoint conditions.

    Breakpoint conditions (e.g. ``@media (max-width: 768px)``) are structural
    tier boundaries the converter reads via hardcoded 768/1024 constants, not
    literal style values threaded through to block attrs. Scaling them would
    corrupt which media query a declaration falls under (a classification
    artefact) rather than exercise the value-scaling relation this test is
    checking. Declaration BODIES (between ``{`` and ``}``) are scaled in
    full — that is where "the draft's px value" lives.
    """
    def _sub(m: "re.Match[str]") -> str:
        return f"{int(m.group(1)) * k}px"

    out: list[str] = []
    last = 0
    for m in _MEDIA_CONDITION_RE.finditer(css_text):
        out.append(_PX_TOKEN_RE.sub(_sub, css_text[last:m.start()]))
        out.append(m.group(0))  # leave the @media condition itself untouched
        last = m.end()
    out.append(_PX_TOKEN_RE.sub(_sub, css_text[last:]))
    return "".join(out)


def _scale_inline_style_attr_px(html_str: str, k: int) -> str:
    """Multiply every integer ``NNNpx`` value inside HTML ``style="..."``
    attributes by k.

    Discovered live (D278, evidence-first — see CLAUDE.md "prove the cause
    before the fix"): the real draft carries at least one INLINE style on an
    element (``<a class="sgs-brand__cta" ... style="margin-top:8px;">`` in
    the ``sgs-brand`` section) that is a real CSS source the converter reads
    (mirrors ``sgs-clone-orchestrator.py``'s own inline+stylesheet CSS
    merge), but lives in the section HTML, not the ``css`` text argument.
    Without also scaling this channel, the relation produces a FALSE
    failure — the 8px value never gets a 16px counterpart because it was
    never touched, not because the converter dropped/mis-scaled it. Scaling
    it here closes that scope gap so the relation tests what it claims to
    test (every draft-derived px value, from EITHER CSS source).
    """
    def _sub_attr(m: "re.Match[str]") -> str:
        scaled_inner = _PX_TOKEN_RE.sub(lambda mm: f"{int(mm.group(1)) * k}px", m.group(1))
        return f'style="{scaled_inner}"'

    return _INLINE_STYLE_ATTR_RE.sub(_sub_attr, html_str)


def test_metamorphic_px_scale_by_k_real_draft():
    """Scale every declaration-body px value in the real draft's CSS (both
    the <style> block text AND any inline style="" attributes on the section
    elements — see _scale_inline_style_attr_px) by k=2 and re-convert all 9
    sections; every draft-derived px value in the emitted markup must scale
    by exactly k (excluding the named non-scaling device-tier constants).
    """
    k = 2
    sections = collect_real_draft_sections()
    assert len(sections) == 9

    scaled_sections = []
    for gid, tag, css in sections:
        scaled_html = _scale_inline_style_attr_px(str(tag), k)
        scaled_tag = BeautifulSoup(scaled_html, "html.parser").find(True)
        scaled_css = _scale_css_px_declarations(css, k)
        scaled_sections.append((gid, scaled_tag, scaled_css))

    # Sanity: scaling actually changed the CSS fed in (relation would be
    # vacuous otherwise).
    assert scaled_sections[0][2] != sections[0][2], "px-scaling produced identical CSS text — regex did not match anything"

    failures: list[str] = []
    checked_any_px = False

    for (gid, tag, base_css), (_, scaled_tag, scaled_css) in zip(sections, scaled_sections):
        base_result = run_converter_full(tag, base_css)
        scaled_result = run_converter_full(scaled_tag, scaled_css)
        base_markup = base_result["block_markup"]
        scaled_markup = scaled_result["block_markup"]

        if not base_markup:
            continue  # chrome-skipped (header/footer) — nothing to scale-check

        base_px_values = sorted({int(v) for v in _PX_TOKEN_RE.findall(base_markup)} - _NON_SCALING_PX_VALUES)
        if not base_px_values:
            continue  # this section transferred no px-valued attrs at all

        checked_any_px = True
        scaled_px_present = {int(v) for v in _PX_TOKEN_RE.findall(scaled_markup)}

        missing = [v for v in base_px_values if (v * k) not in scaled_px_present]
        if missing:
            failures.append(
                f"  {gid}: original px values {missing} have NO {k}x counterpart "
                f"({[v * k for v in missing]}) in the scaled emit.\n"
                f"    base_markup:   {base_markup[:500]!r}\n"
                f"    scaled_markup: {scaled_markup[:500]!r}"
            )

    assert checked_any_px, "No real-draft section transferred any px value — relation is vacuous, harness is broken"
    assert not failures, (
        f"px-scale-by-k relation violated for {len(failures)} section(s) "
        f"(k={k}, excluded non-scaling values={sorted(_NON_SCALING_PX_VALUES)}):\n"
        + "\n".join(failures)
    )
