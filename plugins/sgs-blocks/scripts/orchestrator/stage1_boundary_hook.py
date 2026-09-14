#!/usr/bin/env python3
"""stage1_boundary_hook.py -- Spec 31 Phase 5c.4 Stage 1 BOUNDARY hook.

Runs at the end of `/sgs-clone` Stage 1 (boundary detection). For each
boundary surfaced by the boundary-voter, this hook:

  1. Classifies the boundary's source naming convention. The
     production orchestrator dispatches to /uimax-classify-naming;
     this module accepts a pluggable `classifier` callable so tests
     and standalone runs can inject a deterministic stub.
  2. Runs lingua_franca on each class in `class_signature` to produce
     SGS-BEM primaries + an equivalent_implementations map.
  3. Enriches the boundary in place with:
        - source_convention:        classified convention name
        - primary_sgs_bem:          canonical SGS-BEM block class
        - primary_is_slot_map_hit:  True only when primary_sgs_bem came
                                    from a genuine slot-map hit (or a
                                    canonical identity match) -- False
                                    when the convention's regex matched
                                    syntactically but fell through to
                                    default_block (Tier 0 C1 fix,
                                    2026-09-11; see decisions.md D1034)
        - equivalent_implementations: {source -> sgs-bem}
        - gap_candidate_classes:    classes that fell through
        - lingua_franca_skipped:    True when the boundary was already
                                    SGS-BEM canonical (Spec 31 Bean-draft
                                    fast path)

FR9 contract: NEVER rewrite Bean-controlled SGS-BEM drafts. The fast
path detects canonical-shape classes and bypasses conversion entirely.

UK English in comments + output.
"""
from __future__ import annotations

import argparse
import importlib.util as _ilu
import json
import re
import sys
from pathlib import Path
from typing import Callable

sys.stdout.reconfigure(encoding="utf-8")

HERE = Path(__file__).parent

# Lazy load lingua_franca (sibling module).
_lf_spec = _ilu.spec_from_file_location("lingua_franca", HERE / "lingua_franca.py")
_lf = _ilu.module_from_spec(_lf_spec)
sys.modules.setdefault("lingua_franca", _lf)
_lf_spec.loader.exec_module(_lf)

# Lazy load staged_output for the stage-1 path convention.
_so_spec = _ilu.spec_from_file_location("staged_output", HERE / "staged_output.py")
_so = _ilu.module_from_spec(_so_spec)
sys.modules.setdefault("staged_output", _so)
_so_spec.loader.exec_module(_so)


def _load_trace():
    """Lazy-load orchestrator.trace.Trace; soft-fail to a no-op if unavailable."""
    from pathlib import Path as _Path
    here = _Path(__file__).resolve()
    for parent in [here.parent, *here.parents]:
        candidate = parent / "orchestrator" / "trace.py"
        if candidate.exists():
            spec = _ilu.spec_from_file_location("orchestrator_trace", candidate)
            mod = _ilu.module_from_spec(spec)
            try:
                spec.loader.exec_module(mod)
                return mod.Trace
            except Exception:
                return None
        candidate2 = parent / "trace.py"
        if candidate2.exists() and parent.name == "orchestrator":
            spec = _ilu.spec_from_file_location("orchestrator_trace", candidate2)
            mod = _ilu.module_from_spec(spec)
            try:
                spec.loader.exec_module(mod)
                return mod.Trace
            except Exception:
                return None
    return None

_Trace = _load_trace()


# Heuristic classifier used as the default when no explicit classifier is
# passed in. Production orchestrator should dispatch to /uimax-classify-naming
# for higher-confidence classification.
_HEURISTIC_PATTERNS = [
    ("SGS WordPress",    re.compile(r"^sgs-[a-z]")),                   # sgs-prefixed
    ("Bootstrap 5",      re.compile(r"^(btn|card|navbar|alert|col|row)(-|$)")),
    # Elementor/Divi's prefixes are narrow and unambiguous -- tried BEFORE
    # kebab-semantic's broad catch-all below, which would otherwise
    # misclassify `elementor-widget-button` as generic kebab-semantic and
    # never reach the real rule's slot_map. `w-`/`h-`-prefixed classes are
    # NOT handled here -- see classify_w_prefixed() below, consulted first
    # in heuristic_classify() before this list is ever tried, per the
    # 2026-09-14 research-buddies resolution (both Webflow AND Tailwind use
    # this prefix; a single regex here can never disambiguate them).
    ("Elementor / Divi", re.compile(r"^(elementor-widget-|et_pb_)")),
    ("Tailwind utility", re.compile(r"^[a-z]+-[0-9]+|^(flex|grid|hidden|truncate)$")),
    ("BEM",              re.compile(r"__|--")),                          # bare BEM seps
    ("kebab-semantic",   re.compile(r"^[a-z]+(-[a-z]+)+$")),
]

# --- w-/h- prefix disambiguation (2026-09-14, research-buddies) -----------
#
# Webflow and Tailwind BOTH use bare `w-`/`h-` prefixes -- the qc-council
# finding earlier this session confirmed a plain `^w-` regex mislabels
# genuine Tailwind classes (w-full, w-64, w-screen) as Webflow. Resolved via
# research-buddies (2 rounds, GitHub-verified against real Webflow exports
# 2014-2024 + Tailwind's own docs): BOTH vocabularies are closed and
# independently enumerable, and empirically DO NOT COLLIDE -- every
# real-world "collision" found was Tailwind vendored into a hybrid/rebuilt
# stack, never genuine Webflow using a Tailwind sizing keyword as its own
# class. Full research: C:/Users/Bean/.claude/memory/research/
# 2026-09-14-webflow-vs-tailwind-class-detection.md
#
# Webflow's runtime class vocabulary -- confirmed against real 2014-2024
# exports (nav/dropdown/slider/tab/form/commerce/pagination/layout-grid/
# grid-column families). NOT a hardcoded per-instance dict (R-31-1 sense) --
# this file's own module docstring already exempts it as a static rule
# table; this is that same precedent.
_W_WEBFLOW = re.compile(
    r"^[wh]-(?:nav|dyn|slider|tab|form|input|button|dropdown|layout|"
    r"richtext|container|row|col|embed|checkbox|radio|lightbox|"
    r"background-video|inline-block|clearfix|condition-invisible|mod-|"
    r"pagination|commerce|password-page|select|file-upload|video|icon|"
    r"-current)"  # the trailing state class is w--current (one dash already
                  # consumed by the shared `[wh]-` prefix above, one dash here)
)

# Tailwind's closed width/height sizing-keyword set -- identical v3/v4 apart
# from h-lh (v4-only, line-height unit) and the v4-only container-scale
# tier (w-3xs..w-7xl). Numeric scale (w-4, w-64), fractions (w-1/2), and
# arbitrary values (w-[300px]) also included -- confirmed complete against
# tailwindcss.com/docs/width + /docs/height (v4 current) and
# v3.tailwindcss.com/docs/width (v3 baseline). A plain Python tuple, not a
# hand-typed regex alternation, so it stays readable and testable.
_TAILWIND_SIZE_KEYWORDS = (
    "auto", "px", "full", "screen", "svw", "lvw", "dvw", "svh", "lvh", "dvh",
    "min", "max", "fit", "lh",
    "3xs", "2xs", "xs", "sm", "md", "lg", "xl",
    "2xl", "3xl", "4xl", "5xl", "6xl", "7xl",
)
_W_TAILWIND = re.compile(
    r"^[wh]-(?:"
    r"\d+(?:/\d+)?"                                  # w-4, w-64, w-1/2
    r"|\[.+\]"                                        # w-[300px], w-[calc(...)]
    r"|(?:" + "|".join(_TAILWIND_SIZE_KEYWORDS) + r")"  # closed keyword set
    r")$"
)


def classify_w_prefixed(cls: str, source_builder: str | None = None) -> str:
    """Resolve one `w-`/`h-`-prefixed class to "Webflow" or "Tailwind utility".

    Precedence is deliberate: per-class certainty (either closed vocabulary
    matching) OUTRANKS the page-level `source_builder` hint, so a Tailwind
    custom-code embed inside an otherwise-Webflow page (or vice versa)
    still classifies correctly section-by-section -- a page-level flag that
    overrode per-class evidence would be a worse bug than the one being fixed.

    The residue (matches NEITHER closed vocabulary) falls back to
    `source_builder` when known, else defaults to "Webflow" -- confirmed
    empirically (not assumed) that Tailwind never emits a novel
    word-suffixed `w-`/`h-` class outside its own closed keyword set.
    """
    if _W_WEBFLOW.match(cls):
        return "Webflow"
    if _W_TAILWIND.match(cls):
        return "Tailwind utility"
    if source_builder == "tailwind":
        return "Tailwind utility"
    if source_builder == "webflow":
        return "Webflow"
    return "Webflow"


def heuristic_classify(
    class_signature: list[str], source_builder: str | None = None
) -> str | None:
    """Cheap convention classifier from class names alone. Returns the
    convention_name of the FIRST rule that matches a majority of classes.

    `source_builder` (2026-09-14): the page-level document signal (see
    per-section-convention-voter.py::detect_source_builder), consulted only
    for `w-`/`h-`-prefixed classes whose vocabulary is ambiguous on their
    own -- see classify_w_prefixed().

    Production orchestrator should replace this with the higher-quality
    /uimax-classify-naming dispatch -- this exists so the hook is
    independently runnable in tests + standalone CLI.
    """
    if not class_signature:
        return None
    scores: dict[str, int] = {}
    for cls in class_signature:
        if cls.startswith("w-") or cls.startswith("h-"):
            name = classify_w_prefixed(cls, source_builder)
            scores[name] = scores.get(name, 0) + 1
            continue
        for name, pattern in _HEURISTIC_PATTERNS:
            if pattern.search(cls):
                scores[name] = scores.get(name, 0) + 1
                break
    if not scores:
        return None
    return max(scores.items(), key=lambda kv: kv[1])[0]


def _is_sgs_bem_canonical(class_signature: list[str]) -> bool:
    """Fast path: every class is already SGS-BEM canonical."""
    if not class_signature:
        return False
    return all(_lf.round_trip_check(c) for c in class_signature)


def enrich_boundary(
    boundary: dict,
    classifier: Callable[[list[str]], str | None] | None = None,
    run_dir: "Path | None" = None,
) -> dict:
    """Enrich ONE boundary record with lingua-franca conversion.

    Returns a NEW dict (does not mutate input). Keys added:
      source_convention, primary_sgs_bem, equivalent_implementations,
      gap_candidate_classes, lingua_franca_skipped.
    """
    enriched = dict(boundary)
    classes = boundary.get("class_signature") or []

    # Fast path: already-canonical SGS-BEM draft -- no conversion.
    if _is_sgs_bem_canonical(classes):
        enriched["source_convention"] = "SGS WordPress"
        enriched["primary_sgs_bem"] = classes[0]
        # Tier 0 C1 fix -- a canonical fast-path boundary is a genuine
        # identity match by definition, never a default_block fallback.
        enriched["primary_is_slot_map_hit"] = True
        enriched["equivalent_implementations"] = {c: c for c in classes}
        enriched["gap_candidate_classes"] = []
        enriched["lingua_franca_skipped"] = True
        enriched["lingua_franca_skipped_reason"] = "already SGS-BEM canonical"
        # Trace: fast-path skip (boundary already SGS-BEM canonical).
        tr = (_Trace.for_run(run_dir) if _Trace else None)
        if tr:
            try:
                tr.event(
                    stage="stage_1_boundary_hook",
                    boundary_id=boundary.get("boundary_id"),
                    source_convention="SGS WordPress",
                    lingua_franca_skipped=True,
                    skipped_reason="already SGS-BEM canonical",
                    primary_sgs_bem=classes[0] if classes else None,
                )
            except Exception:
                pass
        return enriched

    # source_builder (2026-09-14, research-buddies): the page-level document
    # signal (per-section-convention-voter.py::detect_source_builder), only
    # ever consulted for the w-/h- residue -- an injected `classifier`
    # keeps its simple single-arg contract (used by tests + the pluggable
    # production classifier), only the default heuristic reads it.
    if classifier is not None:
        convention = classifier(classes)
    else:
        convention = heuristic_classify(
            classes, source_builder=boundary.get("source_builder")
        )
    # Tier 1 (2026-09-14): the element's data-slot attribute, when present
    # (per-section-convention-voter.py::build_boundary threads it through as
    # boundary["data_slot"]) -- shadcn/Radix's real identity signal for a
    # hashed/generated class the string alone can't resolve.
    data_slot = boundary.get("data_slot")
    result = _lf.convert_class_signature(
        classes, source_convention_hint=convention, data_slot=data_slot,
    )
    enriched["source_convention"] = convention
    enriched["primary_sgs_bem"] = result["primary_sgs_bem"]
    enriched["primary_is_slot_map_hit"] = result["primary_is_slot_map_hit"]
    enriched["equivalent_implementations"] = result["equivalent_implementations"]
    enriched["gap_candidate_classes"] = result["gap_candidate_classes"]
    enriched["lingua_franca_skipped"] = False
    # Trace: heavy-path lingua-franca conversion result.
    tr = (_Trace.for_run(run_dir) if _Trace else None)
    if tr:
        try:
            tr.event(
                stage="stage_1_boundary_hook",
                boundary_id=boundary.get("boundary_id"),
                source_convention=convention,
                lingua_franca_skipped=False,
                primary_sgs_bem=result["primary_sgs_bem"],
                gap_candidate_classes=result["gap_candidate_classes"],
                equivalent_implementations_count=len(result["equivalent_implementations"]),
            )
        except Exception:
            pass
    return enriched


def enrich_stage1_payload(
    payload: dict,
    classifier: Callable[[list[str]], str | None] | None = None,
    run_dir: "Path | None" = None,
) -> dict:
    """Enrich every boundary in a Stage-1 artefact. Returns a new dict."""
    out = dict(payload)
    out["boundaries"] = [
        enrich_boundary(b, classifier=classifier, run_dir=run_dir)
        for b in payload.get("boundaries", [])
    ]
    return out


def enrich_run(
    run_id: str,
    classifier: Callable[[list[str]], str | None] | None = None,
    root: Path = _so.PIPELINE_ROOT,
) -> Path:
    """Read the stage-1 artefact for a run, enrich it, write it back."""
    payload = _so.read_artefact(run_id, 1, root=root)
    enriched = enrich_stage1_payload(payload, classifier=classifier)
    return _so.write_artefact(run_id, 1, enriched, root=root)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n", 1)[0])
    parser.add_argument("--run-id", required=True)
    args = parser.parse_args(argv)
    target = enrich_run(args.run_id)
    print(f"[stage1-hook] wrote {target}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
