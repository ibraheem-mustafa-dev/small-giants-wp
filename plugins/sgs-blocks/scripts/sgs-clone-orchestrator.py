#!/usr/bin/env python3
"""
sgs-clone orchestrator (Phase 7 rewire).

Drives the 9-stage Draft-to-SGS pipeline against an HTML+CSS mockup folder.
Wraps the recogniser dispatcher scripts + recogniser-v2 extractor + writes
JSON artefacts at pipeline-state/<run_id>/stage-N.json.

Phase 7 (2026-05-11) rewired stages 1, 2, 9 from hardcoded shortcuts to
real dispatcher calls:

  Stage 1: subprocess -> recogniser/per-section-convention-voter.py
  Stage 2: import       recogniser/confidence-matrix.py:score_candidates
  Stage 9: subprocess -> recogniser/leftover-bucket-router.py
           sqlite INSERT into uimax recognition_log (soft-fail)
           subprocess -> recogniser/simple_html_review_report.py

Stages 3 (slot list from block.json) and 4-8 (extract.py harvest) unchanged.

Usage:
  python plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py \\
    --mockup sites/mamas-munches/mockups/homepage/index.html \\
    --section "section.sgs-hero" \\
    --client mamas-munches \\
    --page homepage \\
    --media-map sites/mamas-munches/research/sandybrown-media-map.json
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import os
import re
import sqlite3
import subprocess
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

REPO = Path(__file__).resolve().parents[3]
RECOGNISER_DIR = Path(__file__).resolve().parent / "recogniser"
LINTS_DIR = Path(__file__).resolve().parent / "lints"
ORCHESTRATOR_DIR = Path(__file__).resolve().parent / "orchestrator"

VOTER_SCRIPT = RECOGNISER_DIR / "per-section-convention-voter.py"
MATRIX_SCRIPT = RECOGNISER_DIR / "confidence-matrix.py"
ROUTER_SCRIPT = RECOGNISER_DIR / "leftover-bucket-router.py"
REVIEW_SCRIPT = RECOGNISER_DIR / "simple_html_review_report.py"
CLASSIFIER_SCRIPT = RECOGNISER_DIR / "bucket-c-classifier.py"
SCAFFOLD_SCRIPT = ORCHESTRATOR_DIR / "atomic-block-scaffold.py"
TOKEN_LINT_SCRIPT = LINTS_DIR / "token-lint.py"
TRACE_SCRIPT = ORCHESTRATOR_DIR / "trace.py"
STAGE1_BOUNDARY_HOOK_SCRIPT = ORCHESTRATOR_DIR / "stage1_boundary_hook.py"
ATTRIBUTE_GAP_WRITER_SCRIPT = RECOGNISER_DIR / "attribute-gap-writer.py"
FUNCTIONALITY_GAP_DETECTOR_SCRIPT = RECOGNISER_DIR / "functionality-gap-detector.py"
GAP_REVIEW_REPORT_SCRIPT = RECOGNISER_DIR / "gap-review-report.py"
ATTRIBUTE_STAGED_APPLY_SCRIPT = ORCHESTRATOR_DIR / "attribute-staged-apply.py"
FUNCTIONALITY_BULK_APPLY_SCRIPT = ORCHESTRATOR_DIR / "functionality-bulk-apply.py"
MEDIA_SIDELOAD_SCRIPT = ORCHESTRATOR_DIR / "media-sideload.py"
WP_INTEGRATION_SCRIPT = ORCHESTRATOR_DIR / "wp_integration.py"
CRITICAL_FIX_VERIFICATION_SCRIPT = ORCHESTRATOR_DIR / "critical-fix-verification.py"
# Post-clone structural gates (R-31-15 anti-mirror, baseline-aware; and
# Spec 35/D554-C flat-tier-regression, no baseline). Both run on the
# converter output (extract.json) the moment Stage 9 has written it, BEFORE
# any media-sideload / deploy / +REGISTER tail, so a mirror-cheat clone or a
# flat-tier-on-a-migrated-property clone halts before it can reach the live
# page. Wired into main() after stage_9_report().
PIPELINE_STAGE_GATE_SCRIPT = ORCHESTRATOR_DIR / "pipeline-stage-gate.py"

# ---------------------------------------------------------------------------
# 5.3.x — wp-* CLI paths (advisory integration, soft-fail on any failure)
# ---------------------------------------------------------------------------
_HOOKS_DIR = Path.home() / ".claude" / "hooks"
WP_BLOCKS_CLI   = _HOOKS_DIR / "wp-blocks.py"
WP_DOCS_CLI     = _HOOKS_DIR / "wp-docs.py"
WP_HOOK_GRAPH_CLI = _HOOKS_DIR / "wp-hook-graph.py"


def _run_cli(cmd: list[str], timeout: int = 15) -> dict:
    """Run a wp-* CLI; return parsed JSON dict. Soft-fail returns {"_error": ...}."""
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout, encoding="utf-8")
        return json.loads(r.stdout) if r.stdout.strip() else {"_error": "empty_stdout", "_stderr": r.stderr[:200]}
    except json.JSONDecodeError:
        return {"_error": "json_parse", "_raw": r.stdout[:200] if r.stdout else ""}
    except Exception as exc:  # noqa: BLE001
        return {"_error": str(exc)[:200]}

# The set of HTML attributes that the functionality-gap-detector treats as
# behaviour fingerprints. Kept here so the orchestrator's BS4 walk only emits
# element dicts that the detector will actually score. Source: the
# _BEHAVIOUR_HTML_ATTRS constant inside the detector module.
_BEHAVIOUR_HTML_ATTR_SET = frozenset({
    "data-action", "data-toggle", "data-target", "data-modal-open",
    "data-modal-close", "data-tab-trigger", "data-tab-panel", "data-accordion",
    "data-dropdown", "data-scroll-to", "data-reveal", "data-animate",
    "data-lightbox", "aria-expanded", "aria-controls", "aria-haspopup",
    "data-copy-to-clipboard",
})

SGS_FRAMEWORK_DB = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"


def _load_lint_module(filename: str, attr_name: str):
    """Load a lint module by file path (hyphenated dir name blocks normal import)."""
    spec = importlib.util.spec_from_file_location(attr_name, LINTS_DIR / filename)
    if spec is None or spec.loader is None:
        raise ImportError(f"Cannot load {filename} from {LINTS_DIR}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[attr_name] = module  # required for dataclass module resolution
    spec.loader.exec_module(module)
    return module


def _find_load_settle_candidates(mockup_path: Path) -> "list[dict]":
    """Tier 4b candidate-finder (D1032) -- statically re-derives Tier 1/2's
    OWN "transition present, no reachable :hover/:focus counterpart, AND no
    resting value Tier 1/2 could already resolve a shape from" decline
    shape directly against the raw mockup file, reusing existing primitives
    (`collect_css_decls_for_element`, `motion_shape._own_hover_scoped_
    decls`, `motion_shape.extract_shape_from_transition`) rather than
    inventing a second CSS-reading implementation.

    WHY THIS RUNS HERE, AT STAGE -1 (before the walker / Stage 0 exists at
    all): Tier 1/2's real per-element declination happens deep inside
    `converter/services/assembly.py::build_block_markup` (step 3a1b),
    during Stage 0+ per-section conversion -- and even there, a genuine
    "shape extraction failed" decline produces NO recorded signal at all
    (`motion_shape.classify_css_motion()` returns `({}, [])`, completely
    silent; a ContentGap is only recorded for the DIFFERENT
    off-vocabulary-preset skip case, per that module's own docstring). So
    there is no existing sidecar/leftover-bucket this stage could read a
    declined-candidate list FROM -- confirmed by reading `assembly.py`'s
    step 3a1b directly before writing this function, not assumed. Rather
    than restructure Stage ordering or add new declined-candidate
    persistence to a sensitive shared file (`assembly.py`) just for this
    probe, this function re-derives the SAME shape directly from the
    mockup's own HTML + CSS -- both genuinely available at Stage -1 via the
    pre-existing `_collect_mockup_css()` helper (Stage 0.7's own CSS
    harvester, already a standalone module-level function, callable here
    unchanged) -- using the exact same primitives Tier 1/2 itself uses for
    this question.

    Returns a list of `{"selector": str, "transition_declaration": str}` --
    one entry per element carrying its own `transition:` declaration with
    no `animation`/`animation-name` (the keyframes path is Tier 1/2's own,
    unrelated territory), no reachable `:hover`/`:focus` counterpart for
    its own class(es), AND no resting `transform`/`filter`/`clip-path`
    value `extract_shape_from_transition()` could already resolve a shape
    from statically (fixed 2026-09-11, F2 -- see below).

    ERRORS PROPAGATE, ON PURPOSE (fixed 2026-09-11, F4). This function used
    to swallow every exception -- including a broken import chain -- into a
    silent `[]`, which is indistinguishable from "genuinely no candidates
    on this page" (this project's own documented failure pattern: a rule
    that loses is indistinguishable from one that is absent). The two
    remaining early `[]` returns below (mockup missing, no CSS text) are
    genuine zero-candidate OUTCOMES, not errors -- everything else (an
    import failure, a parse exception) now raises, and the caller
    (`stage_neg1_motion_probe()`'s own `try/except` around this call)
    records it into `result["tier4b"]["error"]` rather than the exception
    disappearing here first.

    Disclosed limitation: the selector is built from the element's own full
    class list, deduplicated -- two real elements sharing an identical
    class list are not disambiguated (both collapse to one selector, and
    the live probe will only ever see whichever one `querySelector` returns
    first). Accepted for this probe's target shape -- a page-load overlay/
    preloader is a singleton element by construction on every real-world
    instance this phase has measured -- not assumed safe in general.
    """
    _scripts_dir = Path(__file__).resolve().parent
    _converter_dir = _scripts_dir / "converter"
    _services_dir = _converter_dir / "services"
    _resolvers_dir = _converter_dir / "resolvers"
    # `_scripts_dir` itself must be on sys.path too, not just its
    # subdirectories -- `styling_helpers.py` (imported below) does a
    # package-qualified `from converter.db import db_lookup`, which needs
    # `converter`'s PARENT directory importable as the search root, not
    # `converter/` itself. When this module is run directly
    # (`python sgs-clone-orchestrator.py`) `sys.path[0]` already happens to
    # be `_scripts_dir`, which is why this worked in that one invocation
    # context and silently returned `[]` (via the old blanket except) under
    # any other (e.g. a pytest run from a different cwd) -- the reviewer
    # hit this directly running the fixture harness. Fixed by adding it
    # explicitly rather than relying on caller cwd.
    for _d in (_scripts_dir, _converter_dir, _services_dir, _resolvers_dir):
        _d_str = str(_d)
        if _d_str not in sys.path:
            sys.path.insert(0, _d_str)

    from bs4 import BeautifulSoup
    from css_parse import parse_css  # type: ignore[import]
    from motion_shape import (  # type: ignore[import]
        _own_hover_scoped_decls,
        extract_shape_from_transition,
    )
    from styling_helpers import collect_css_decls_for_element  # type: ignore[import]

    mockup_path = Path(mockup_path)
    if not mockup_path.exists():
        return []

    css_text, _sources, _warnings = _collect_mockup_css(mockup_path)
    if not css_text.strip():
        return []
    css_rules = parse_css(css_text)

    soup = BeautifulSoup(mockup_path.read_text(encoding="utf-8"), "html.parser")

    candidates: "list[dict]" = []
    seen_selectors: "set[str]" = set()
    for node in soup.find_all(class_=True):
        classes = node.get("class") or []
        if not classes:
            continue
        selector = "." + ".".join(classes)
        if selector in seen_selectors:
            continue

        base_decls, _bp_decls = collect_css_decls_for_element(node, css_rules)
        transition_value = base_decls.get("transition")
        if not transition_value:
            continue
        if base_decls.get("animation") or base_decls.get("animation-name"):
            # keyframes-driven -- Tier 1/2's own, unrelated territory.
            continue
        if _own_hover_scoped_decls(node, css_rules) is not None:
            # a reachable :hover/:focus counterpart exists -- Tier 1/2
            # can already resolve (or correctly decline) this one
            # statically; not this probe's target shape.
            continue

        # F2 fix (2026-09-11): a resting transform/filter/clip-path value
        # is ALREADY resolvable by `extract_shape_from_transition()` with
        # no hover counterpart at all (D1026's whole point -- a transform
        # shape needs only its own resting value, "animates toward
        # identity"; only an OPACITY shape needs a before/after pair, which
        # is unavailable here without a hover target anyway, so it is
        # correctly never offered to the extractor below). Re-running the
        # SAME check the static extractor itself would run -- rather than
        # guessing at a separate heuristic -- means this candidate list
        # only ever contains elements Tier 1/2 genuinely cannot resolve,
        # not ones it already owns. `opacity`/`opacity_to` are deliberately
        # excluded from this probe check: there is no live-page counterpart
        # sampled yet at this static-analysis point, so passing only
        # `opacity` (with no `opacity_to`) here would always decline
        # regardless, which is the same outcome as omitting it -- omitting
        # it keeps the check honest about what it is actually testing.
        resting_decls = {
            k: v for k, v in base_decls.items() if k in ("transform", "filter", "clip-path")
        }
        if resting_decls and extract_shape_from_transition(resting_decls, transition_value) is not None:
            # Tier 1/2 already resolves this one statically (or will, once
            # step 3a1b runs) -- not a genuine Tier 4b gap.
            continue

        seen_selectors.add(selector)
        candidates.append({"selector": selector, "transition_declaration": transition_value})

    return candidates


def stage_neg1_motion_probe(mockup_path: Path, source_url: "str | None", run_dir: Path) -> dict:
    """Stage -1 -- Phase R8 Tier 4a/4c motion-library pre-flight probe.

    Runs once per clone job, BEFORE Stage 0. Wires the four R8 modules
    (`.claude/decisions.md` D1021/D1022) into the real pipeline for the
    first time -- confirmed live by grep before this function existed that
    none of them had an external importer besides their own test fixtures.

    ONLY orchestration here -- none of the four modules' internal logic is
    touched. This function:
      1. Tier 4a-static (always, zero browser cost) -- re-parses the
         already-downloaded mockup file for GSAP/Lenis/Three.js DOM signals.
      2. Tier 4a-dynamic (conditional) -- a live Playwright draw-call probe
         against `source_url`, ONLY when a genuine non-Three.js `<canvas>`
         candidate exists AND a source URL was supplied. No `source_url` ->
         honestly skipped and recorded, never silently absent, never run
         against the static mockup (which may not preserve the source's
         bundled JS verbatim -- a false-negative risk).
      3. Tier 4c (conditional) -- only when Tier 4a's REAL evidence-carrying
         gate (`webgl_style_classifier.py::check_tier4a_confirmed_webgl()`)
         confirms genuine WebGL. `webgl_draw_call_probe.py::probe()` opens
         and closes its own Playwright browser internally and returns only a
         plain dict (confirmed by direct read) -- it exposes no reusable
         page handle, so Tier 4c captures its own screenshot independently
         via `capture_canvas_screenshot_standalone()` rather than inventing a
         session-sharing mechanism that doesn't exist yet.
      4. Tier 4d -- NEVER auto-fires here. This stage only records whether
         Tier 4c reported "no match" (so a LATER, separate operator-facing
         step could offer the Tier 4d pull); no confirmation UI is built in
         this function.
      5. Writes findings, shaped by
         `motion_library_signals.py::to_leftover_bucket_items()`, to a
         sidecar `stage--1-motion-signals.json` in `run_dir`. Stage 9's
         `leftover-bucket-router.py` reads this sidecar (new `--motion-
         signals` arg -- confirmed by reading `route()`'s real signature
         first: it had no such extensibility point, so this stage's sidecar
         would otherwise be written for nothing to read) and folds it into
         the existing `animation_unclassified` bucket an operator already
         reviews.

    Every step soft-fails to a recorded skip/error rather than raising --
    this is a pre-flight probe, never a reason to halt the clone.
    """
    started = now_iso()
    result: dict = {
        "started": started,
        "finished": None,
        "source_url": source_url,
        "tier4a_static": {"ran": False, "found_signals": [], "canvas_candidates": [], "error": None},
        "tier4a_dynamic": {"attempted": False, "ran": False, "probe_result": None, "skipped_reason": None},
        "tier4b": {
            "candidates_found": 0, "attempted": False, "ran": False,
            "probe_result": None, "matches": [], "skipped_reason": None, "error": None,
        },
        "tier4c": {"ran": False, "gate": None, "suggestion": None, "skipped_reason": None, "error": None},
        "tier4d": {
            "auto_fired": False,
            "no_match_recorded": False,
            "note": "Tier 4d never auto-fires from this stage; a later, separate "
                    "operator-facing step may offer it when no_match_recorded is true.",
        },
    }

    # Same sys.path convention this file already uses elsewhere (e.g. the
    # `converter.db.db_lookup` / `converter.entry` imports above) -- but the
    # R8 modules under converter/services/ use BARE sibling imports internally
    # (`webgl_style_classifier.py::from tier4a_gate_verification import
    # reverify_gate` -- confirmed by direct read), matching how their own test
    # fixtures import them (`test_tier4a_gate_hardening_fixtures.py::from
    # tier4a_gate_verification import reverify_gate`). Importing
    # `converter.services.webgl_style_classifier` as a package submodule would
    # break that internal bare import, so converter/services/ and
    # converter/resolvers/ are added to sys.path directly and every R8 module
    # is imported bare, exactly as its own tests already do.
    _scripts_dir = Path(__file__).resolve().parent
    _converter_dir = _scripts_dir / "converter"
    _resolvers_dir = _converter_dir / "resolvers"
    _services_dir = _converter_dir / "services"
    for _d in (_converter_dir, _resolvers_dir, _services_dir):
        _d_str = str(_d)
        if _d_str not in sys.path:
            sys.path.insert(0, _d_str)

    # --- Tier 4a-static -----------------------------------------------
    found_signals: list[dict] = []
    canvas_candidates: list[dict] = []
    leftover_items: list[dict] = []
    try:
        from motion_library_signals import (  # type: ignore[import]
            detect_from_html_file,
            find_non_threejs_canvases,
            to_leftover_bucket_items,
        )
        from bs4 import BeautifulSoup  # already a pipeline dependency elsewhere

        found_signals = detect_from_html_file(mockup_path)
        result["tier4a_static"]["ran"] = True
        result["tier4a_static"]["found_signals"] = found_signals
        leftover_items.extend(to_leftover_bucket_items(found_signals))

        mockup_path = Path(mockup_path)
        if mockup_path.exists():
            soup = BeautifulSoup(mockup_path.read_text(encoding="utf-8"), "html.parser")
            canvas_candidates = find_non_threejs_canvases(soup)
        result["tier4a_static"]["canvas_candidates"] = canvas_candidates
    except Exception as exc:  # noqa: BLE001 - pre-flight probe, never halts the clone
        result["tier4a_static"]["error"] = str(exc)

    # --- Tier 4a-dynamic (conditional on a real canvas candidate + a URL) --
    draw_call_result: dict | None = None
    if canvas_candidates and source_url:
        result["tier4a_dynamic"]["attempted"] = True
        try:
            try:
                from webgl_draw_call_probe import probe as _webgl_probe  # type: ignore[import]
            except SystemExit as exc:
                # webgl_draw_call_probe.py sys.exit()s at IMPORT time when
                # playwright isn't installed (confirmed by direct read) --
                # SystemExit is not an Exception subclass, so it must be
                # caught explicitly here or it would kill the whole
                # orchestrator process on a machine without playwright.
                raise RuntimeError(f"playwright unavailable for Tier 4a-dynamic: {exc}") from exc
            draw_call_result = _webgl_probe(url=source_url)
            result["tier4a_dynamic"]["ran"] = True
            result["tier4a_dynamic"]["probe_result"] = draw_call_result
        except Exception as exc:  # noqa: BLE001 - pre-flight probe, never halts the clone
            result["tier4a_dynamic"]["skipped_reason"] = f"probe failed: {exc}"
    elif canvas_candidates and not source_url:
        result["tier4a_dynamic"]["skipped_reason"] = (
            f"{len(canvas_candidates)} non-Three.js canvas candidate(s) found, but no "
            "--source-url was supplied. Skipped honestly rather than probing the static "
            "mockup file -- the mockup may not preserve the source's original bundled JS "
            "verbatim, which risks a false negative."
        )
        leftover_items.append({
            "selector": "canvas",
            "reason": "webgl-canvas-candidate-unprobed-no-source-url",
            "confirms": None,
            "evidence": {"canvas_candidates": canvas_candidates},
            "confidence": 1.0,
        })
    else:
        result["tier4a_dynamic"]["skipped_reason"] = "no non-Three.js canvas candidates found"

    # --- Tier 4c (conditional on Tier 4a's real evidence-carrying gate) ---
    try:
        from webgl_style_classifier import (  # type: ignore[import]
            check_tier4a_confirmed_webgl,
            build_operator_suggestion,
            capture_canvas_screenshot_standalone,
        )

        gate = check_tier4a_confirmed_webgl(found_signals, draw_call_result)
        result["tier4c"]["gate"] = gate

        if not gate.get("confirmed"):
            result["tier4c"]["skipped_reason"] = gate.get("reason")
        elif not source_url:
            result["tier4c"]["skipped_reason"] = (
                "Tier 4a confirmed genuine WebGL presence, but no --source-url was "
                "supplied to screenshot the canvas -- Tier 4c needs a live page capture."
            )
        else:
            screenshot_path = run_dir / "tier4c-canvas-screenshot.png"
            capture = capture_canvas_screenshot_standalone(source_url, screenshot_path)
            if capture.get("error") or not capture.get("path"):
                result["tier4c"]["skipped_reason"] = f"screenshot capture failed: {capture.get('error')}"
            else:
                suggestion = build_operator_suggestion(capture["path"], gate)
                result["tier4c"]["ran"] = True
                result["tier4c"]["suggestion"] = suggestion
                if suggestion.get("matched_effect") is None:
                    result["tier4d"]["no_match_recorded"] = True
                    leftover_items.append({
                        "selector": "canvas",
                        "reason": "webgl-tier4c-no-shipped-effect-match",
                        "confirms": gate.get("source"),
                        "evidence": {"tier4c_suggestion": suggestion},
                        "confidence": 1.0,
                    })
    except Exception as exc:  # noqa: BLE001 - pre-flight probe, never halts the clone
        result["tier4c"]["error"] = str(exc)

    # --- Tier 4b (D1032) -- conditional on a real source_url AND at least
    # one Tier 1/2-declined "transition, no reachable :hover/:focus
    # counterpart" candidate (`_find_load_settle_candidates`, above). See
    # that function's own docstring for why the candidate list is
    # re-derived directly from the mockup here rather than read from a
    # walker-produced declined-candidates list -- no such list exists
    # anywhere in the pipeline today (confirmed by reading `assembly.py`
    # step 3a1b directly), so this is the correct place to compute it, not
    # a workaround for a missing one.
    try:
        load_settle_candidates = _find_load_settle_candidates(mockup_path)
    except Exception as exc:  # noqa: BLE001 - pre-flight probe, never halts the clone
        load_settle_candidates = []
        result["tier4b"]["error"] = str(exc)
    result["tier4b"]["candidates_found"] = len(load_settle_candidates)

    if load_settle_candidates and source_url:
        result["tier4b"]["attempted"] = True
        try:
            try:
                from load_settle_probe import (  # type: ignore[import]
                    classify_load_settle_candidate,
                    probe as _load_settle_probe,
                )
            except SystemExit as exc:
                # load_settle_probe.py sys.exit()s at IMPORT time when
                # playwright isn't installed (mirrors webgl_draw_call_probe.py
                # -- SystemExit is not an Exception subclass, so it must be
                # caught explicitly here or it would kill the whole
                # orchestrator process on a machine without playwright.
                raise RuntimeError(f"playwright unavailable for Tier 4b: {exc}") from exc

            probe_candidates = [{"selector": c["selector"]} for c in load_settle_candidates]
            probe_result = _load_settle_probe(source_url, probe_candidates)
            result["tier4b"]["ran"] = True
            result["tier4b"]["probe_result"] = probe_result

            decl_by_selector = {c["selector"]: c["transition_declaration"] for c in load_settle_candidates}
            for candidate_entry in probe_result.get("candidates", []):
                selector = candidate_entry.get("selector")
                transition_decl = decl_by_selector.get(selector)
                if not transition_decl:
                    continue
                match_attrs, match_skipped = classify_load_settle_candidate(
                    candidate_entry, transition_decl
                )
                if match_attrs:
                    result["tier4b"]["matches"].append({"selector": selector, "attrs": match_attrs})
                    leftover_items.append({
                        "selector": selector,
                        "reason": "tier4b-load-settle-match",
                        "confirms": "page-load-settle transition (Tier 4b live probe)",
                        "evidence": {"attrs": match_attrs, "probe_candidate": candidate_entry},
                        "confidence": 1.0,
                    })
                for skip_detail in match_skipped:
                    leftover_items.append({
                        "selector": selector,
                        "reason": "tier4b-load-settle-skipped",
                        "confirms": None,
                        "evidence": {"detail": skip_detail, "probe_candidate": candidate_entry},
                        "confidence": 1.0,
                    })
        except Exception as exc:  # noqa: BLE001 - pre-flight probe, never halts the clone
            result["tier4b"]["skipped_reason"] = f"probe failed: {exc}"
    elif load_settle_candidates and not source_url:
        result["tier4b"]["skipped_reason"] = (
            f"{len(load_settle_candidates)} candidate(s) found (own transition property, "
            "no reachable :hover/:focus counterpart), but no --source-url was supplied -- "
            "Tier 4b needs a live page to sample before/after computed styles."
        )
    else:
        result["tier4b"]["skipped_reason"] = "no Tier 1/2-declined load-settle candidates found"

    # --- Sidecar write (Stage 9's leftover-bucket-router.py reads this) ---
    sidecar_path = run_dir / "stage--1-motion-signals.json"
    sidecar_path.write_text(
        json.dumps({"items": leftover_items}, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    result["sidecar_path"] = str(sidecar_path)
    result["finished"] = now_iso()

    _emit(
        _trace_for(run_dir), stage="stage_neg1_motion_probe",
        tier4a_static_ran=result["tier4a_static"]["ran"],
        tier4a_dynamic_ran=result["tier4a_dynamic"]["ran"],
        tier4b_ran=result["tier4b"]["ran"],
        tier4c_ran=result["tier4c"]["ran"],
        leftover_item_count=len(leftover_items),
    )

    trace_path = run_dir / "stage--1.json"
    trace_path.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
    print(
        f"[stage--1] motion-probe: tier4a_static={result['tier4a_static']['ran']} "
        f"found_signals={len(found_signals)} canvas_candidates={len(canvas_candidates)} "
        f"tier4a_dynamic={result['tier4a_dynamic']['ran']} "
        f"tier4b={result['tier4b']['ran']} tier4b_candidates={result['tier4b']['candidates_found']} "
        f"tier4c={result['tier4c']['ran']} "
        f"leftover_items={len(leftover_items)}"
    )
    return result


def stage_0_1_bem_lint(mockup: Path, mode: str, run_dir: Path) -> dict:
    """Stage 0.1 — SGS-BEM compliance lint on the draft HTML.

    Mode behaviour:
      strict — halts on any violation
      draft  — logs warnings, continues
      legacy — bypassed
    """
    if mode == "legacy":
        print("[stage-0.1] BEM lint: legacy bypass")
        return {"mode": mode, "violations": [], "passed": True, "bypassed": True}

    bem = _load_lint_module("bem-lint.py", "bem_lint")
    result = bem.lint_html_file(mockup, mode=mode)
    violations = [
        {
            "line": v.line,
            "col": v.col,
            "class_token": v.token,
            "source_label": v.source_label,
            "message": v.message,
        }
        for v in result.violations
    ]
    out = {
        "mode": mode,
        "total_classes_checked": result.total_classes_checked,
        "violations": violations,
        "passed": result.passed,
        "exit_code": result.exit_code,
    }
    (run_dir / "stage-0.1-bem-lint.json").write_text(json.dumps(out, indent=2), encoding="utf-8")

    _emit(_trace_for(run_dir), stage="stage_0_1_bem_lint", mode=mode,
          violations_count=len(violations), total_classes_checked=result.total_classes_checked,
          passed=result.passed)

    if mode == "draft":
        level = "warning"
    elif violations:
        level = "error"
    else:
        level = "ok"
    print(f"[stage-0.1] BEM lint ({mode}): {len(violations)} violations across {result.total_classes_checked} classes [{level}]")
    for v in violations[:5]:
        print(f"  {v['source_label']}:{v['line']}:{v['col']}: {v['message']}")
    if len(violations) > 5:
        print(f"  ... and {len(violations) - 5} more")

    if mode == "strict" and violations:
        sys.exit(f"[stage-0.1] STRICT mode halt: {len(violations)} BEM violations. Re-run with --mode draft to continue.")
    return out


def _client_variation_path(client: str | None) -> Path | None:
    """Resolve the per-client theme.json snapshot, or None if not present.

    Phase 5a (2026-05-22 Decision 19) — per-client snapshots moved from
    ``theme/sgs-theme/styles/<client>.json`` (the retired WP style-variation
    overlay) to ``sites/<client>/theme-snapshot.json`` (the canonical
    per-site theme.json). The legacy path is checked as a fallback so any
    transitional client folders that still hold the old layout keep working.
    """
    if not client:
        return None
    new_path = REPO / "sites" / client / "theme-snapshot.json"
    if new_path.exists():
        return new_path
    legacy_path = REPO / "theme" / "sgs-theme" / "styles" / f"{client}.json"
    return legacy_path if legacy_path.exists() else None


def stage_0_5_token_lint(mockup: Path, mode: str, run_dir: Path,
                         no_new_tokens: bool = False,
                         client: str | None = None) -> dict:
    """Stage 0.5 — token-usage lint on inline styles in the draft HTML.

    In additive mode (default, Phase 4.5+), discovered non-token values become
    NewTokenCandidate entries in a TokenWritePlan rather than violations. The
    write-plan is persisted as JSON for downstream stages to apply against the
    client's style variation.

    When ``no_new_tokens=True``, falls back to the legacy LintResult shim with
    strict-or-warn verdict semantics (per Spec 31 modes).
    """
    if mode == "legacy":
        print("[stage-0.5] token lint: legacy bypass")
        return {"mode": mode, "candidates": [], "passed": True, "bypassed": True}

    tok = _load_lint_module("token-lint.py", "token_lint")
    variation = _client_variation_path(client)
    variation_paths = [variation] if variation else None
    if variation:
        print(f"[stage-0.5] overlay variation: {variation.relative_to(REPO)}")
    elif client:
        expected = REPO / "theme" / "sgs-theme" / "styles" / f"{client}.json"
        print(f"[stage-0.5] no variation found for client={client!r} (expected {expected.relative_to(REPO)}) — using base theme only")
    result = tok.lint_html_inline_styles(
        mockup, mode=mode, no_new_tokens=no_new_tokens, variation_paths=variation_paths,
    )

    if no_new_tokens:
        # Legacy LintResult shim — preserve old verdict surface
        violations = [
            {
                "line": v.line,
                "col": v.col,
                "property": v.property,
                "raw_value": v.raw_value,
                "nearest_token": v.nearest_token,
                "confidence": v.confidence,
                "flag": v.flag,
                "source_label": v.source_label,
            }
            for v in result.violations
        ]
        out = {
            "mode": mode,
            "additive": False,
            "total_declarations_checked": result.total_declarations_checked,
            "violations": violations,
            "passed": result.passed,
            "exit_code": result.exit_code,
        }
        (run_dir / "stage-0.5-token-lint.json").write_text(json.dumps(out, indent=2), encoding="utf-8")

        _emit(_trace_for(run_dir), stage="stage_0_5_token_lint", mode=mode, additive=False,
              violations_count=len(violations),
              total_declarations_checked=result.total_declarations_checked,
              passed=result.passed)

        if mode == "draft":
            level = "warning"
        elif violations:
            level = "error"
        else:
            level = "ok"
        print(f"[stage-0.5] token lint ({mode}, no-new-tokens): {len(violations)} violations across {result.total_declarations_checked} declarations [{level}]")
        for v in violations[:5]:
            print(f"  {v['source_label']}:{v['line']}:{v['col']}: {v['flag']} {v['property']}='{v['raw_value']}' -> {v['nearest_token']} (conf={v['confidence']})")
        if mode == "strict" and violations:
            sys.exit(f"[stage-0.5] STRICT mode halt: {len(violations)} token violations. Re-run with --mode draft or drop --no-new-tokens to continue.")
        return out

    # Additive mode (TokenWritePlan)
    candidates = [
        {
            "token_class": c.token_class,
            "proposed_slug": c.proposed_slug,
            "raw_value": c.raw_value,
            "occurrences": [
                {"line": o.line, "col": o.col, "source_label": o.source_label, "property": o.css_property}
                for o in c.occurrences
            ],
        }
        for c in result.new_tokens
    ]
    out = {
        "mode": mode,
        "additive": True,
        "total_declarations_checked": result.total_declarations_checked,
        "new_tokens": candidates,
        "passed": result.passed,
        "summary": result.summary,
    }
    (run_dir / "stage-0.5-token-lint.json").write_text(json.dumps(out, indent=2), encoding="utf-8")

    _emit(_trace_for(run_dir), stage="stage_0_5_token_lint", mode=mode, additive=True,
          new_tokens_count=len(candidates),
          total_declarations_checked=result.total_declarations_checked,
          passed=result.passed)

    print(f"[stage-0.5] token lint ({mode}, additive): {len(candidates)} new-token candidates across {result.total_declarations_checked} declarations")
    for c in candidates[:5]:
        first = c["occurrences"][0] if c["occurrences"] else {}
        loc = f"{first.get('source_label','?')}:{first.get('line','?')}:{first.get('col','?')}"
        print(f"  {loc}: [{c['token_class']}] slug='{c['proposed_slug']}' value='{c['raw_value']}' ({len(c['occurrences'])}x)")
    if len(candidates) > 5:
        print(f"  ... and {len(candidates) - 5} more")
    return out

UIMAX_DB = Path(os.path.expanduser("~/.agents/skills/ui-ux-pro-max/scripts/ui-ux-pro-max.db"))


# ---------------------------------------------------------------------------
# Stage 0.7 -- CSS LIFT (Phase 5h.1)
#   The mockup's bespoke CSS (per-section backgrounds / padding / typography
#   keyed off .sgs-<section> classes) lives in <style> blocks + linked
#   stylesheets. The composer (5g.3) emits the right class hooks but without
#   this stage the rules are silently dropped and the rendered page falls back
#   to framework defaults. Stage 0.7 harvests every CSS source the mockup
#   references and writes a single pipeline-intermediate stylesheet at
#   pipeline-state/<run>/variation-d0-d2.css (Q3 fix 2026-05-23 — relocated
#   from theme/sgs-theme/styles/<client>.css which Phase 5a retired).
#   The G2 merge reader (line ~1419) reads from the same run_dir location.
#   theme/sgs-theme/styles/ is intentionally empty (Phase 5a, commit 43a93df9).
# ---------------------------------------------------------------------------

_STYLE_BLOCK_RE = re.compile(r"<style[^>]*>(.*?)</style>", re.DOTALL | re.IGNORECASE)
_STYLESHEET_HREF_RE = re.compile(
    r"<link[^>]+rel=[\"']stylesheet[\"'][^>]*href=[\"']([^\"']+)[\"']",
    re.IGNORECASE,
)


def _client_variation_css_path(client: str, run_dir: Path | None = None) -> Path:
    """Return the pipeline-intermediate CSS path for this run.

    Post Q3 fix (2026-05-23): output lives at pipeline-state/<run>/variation-d0-d2.css.
    run_dir=None falls back to a client-named subdirectory so the helper never
    writes to theme/sgs-theme/styles/ (Phase 5a retired that directory).
    """
    if run_dir is not None:
        return run_dir / "variation-d0-d2.css"
    # Fallback when called without a run_dir (e.g. error paths).
    return REPO / "pipeline-state" / f"{client}-fallback" / "variation-d0-d2.css"


def _collect_mockup_css(mockup_path: Path) -> tuple[str, list[dict], list[str]]:
    """Collect all CSS text from a mockup HTML file.

    Sources harvested (in document order):
      1. Every inline <style>...</style> block in the mockup HTML
      2. Every <link rel="stylesheet" href="..."> resolved to a local file
         relative to the mockup directory (external/CDN URLs skipped)

    Returns (combined_css_text, sources_list, warnings_list).
    """
    sources: list[dict] = []
    warnings: list[str] = []
    parts: list[str] = []

    if not mockup_path.exists():
        return "", sources, [f"mockup not found at {mockup_path}"]

    html = mockup_path.read_text(encoding="utf-8")

    inline_blocks = _STYLE_BLOCK_RE.findall(html)
    for i, css in enumerate(inline_blocks):
        css = css.strip()
        if not css:
            continue
        parts.append(css)
        sources.append({"kind": "inline_style", "index": i, "chars": len(css)})

    mockup_dir = mockup_path.parent
    for href in _STYLESHEET_HREF_RE.findall(html):
        if href.startswith(("http://", "https://", "//", "data:")):
            warnings.append(f"skipped external stylesheet {href!r}")
            sources.append({"kind": "external_skipped", "href": href})
            continue
        candidate = (mockup_dir / href).resolve()
        try:
            candidate.relative_to(REPO)  # guard against path traversal
        except ValueError:
            warnings.append(f"skipped stylesheet outside repo root: {href!r}")
            sources.append({"kind": "out_of_tree_skipped", "href": href})
            continue
        if not candidate.exists():
            warnings.append(f"stylesheet missing on disk: {candidate}")
            sources.append({"kind": "missing", "href": href})
            continue
        css = candidate.read_text(encoding="utf-8").strip()
        rel = candidate.relative_to(REPO)
        parts.append(css)
        sources.append({"kind": "linked_css", "href": href, "resolved": str(rel), "chars": len(css)})

    combined = "\n\n".join(parts)
    if not combined.strip():
        warnings.append("no CSS sources found in mockup (zero inline <style>, zero local <link>)")
    return combined, sources, warnings


def stage_0_7_css_lift(mockup_path: Path, client: str, run_dir: Path,
                       theme_json: dict | None = None,
                       page_id: int | None = None) -> dict:
    """Harvest the mockup's CSS and route it via the Spec 16 §FR6 four-destination router.

    Replaces the previous verbatim CSS dump with the css_router module.

    Destinations:
      D0 — global/reset rules → written unscoped to variation CSS (top of file)
      D1 — typed-attr lift    → classified by css_router; consumed inline by cv2 via _collect_css_decls_for_element
      D2 — wrapper CSS        → written scoped to .page-id-N in variation CSS
      D3 — gap candidates     → written to sgs-framework.db.attribute_gap_candidates
                                  + ALSO to D2 as fallback

    Hard rule (Spec 16 §R5): every CSS rule routes to exactly one bucket.
    Chrome-skip: rules targeting <header>/<footer>/<nav> are not emitted to D2.

    Output:
      - pipeline-state/<run>/variation-d0-d2.css  (D0 + D2 + D3-fallback only; Q3 fix 2026-05-23)
    """
    started = now_iso()
    errors: list[str] = []
    warnings: list[str] = []

    if not mockup_path.exists():
        errors.append(f"mockup not found at {mockup_path}")
        out = {"output_path": "", "total_chars": 0, "sources": [], "passed": False,
               "css_router_stats": {}}
        write_artefact(run_dir, 7, "css-lift", "failed", out, started, errors, warnings)
        return out

    # ---- 1. Collect raw CSS from all sources ----
    css_text, sources, collect_warnings = _collect_mockup_css(mockup_path)
    warnings.extend(collect_warnings)
    css_body_chars = sum(s.get("chars", 0) for s in sources
                         if s.get("kind") in {"inline_style", "linked_css"})

    # ---- 2. Load css_router (lazy import, same directory as this script) ----
    try:
        _css_router_path = ORCHESTRATOR_DIR / "css_router.py"
        _css_router_spec = importlib.util.spec_from_file_location("css_router", _css_router_path)
        _css_router_mod = importlib.util.module_from_spec(_css_router_spec)
        _css_router_spec.loader.exec_module(_css_router_mod)
    except Exception as exc:  # noqa: BLE001
        # Fallback: verbatim dump (preserves previous behaviour on import failure).
        warnings.append(f"css_router import failed ({exc}); falling back to verbatim CSS dump")
        return _stage_0_7_verbatim_fallback(css_text, sources, css_body_chars,
                                             client, mockup_path, run_dir, started, errors, warnings)

    run_id = run_dir.name
    th_json = theme_json or {}

    # ---- 3. Route CSS via the four-destination router ----
    try:
        router_result = _css_router_mod.route_css(
            css_text=css_text,
            boundaries_meta={},  # section_id → meta (not needed for CSS routing)
            theme_json=th_json,
            run_id=run_id,
        )
    except Exception as exc:  # noqa: BLE001
        warnings.append(f"css_router.route_css failed ({exc}); falling back to verbatim dump")
        return _stage_0_7_verbatim_fallback(css_text, sources, css_body_chars,
                                             client, mockup_path, run_dir, started, errors, warnings)

    routing_stats = router_result.get("stats", {})
    d0_rules: list[str] = router_result.get("d0", [])
    d2_rules: list[str] = router_result.get("d2", [])
    d3_entries: list[dict] = router_result.get("d3", [])

    # ---- 4. Write D0 + D2 + D3-fallback to variation CSS file ----
    try:
        out_path, total_chars = _css_router_mod.write_variation_css(
            client=client,
            d0_rules=d0_rules,
            d2_rules=d2_rules,
            mockup_path=mockup_path,
            page_id=page_id,
            repo_root=REPO,
            run_dir=run_dir,
        )
    except Exception as exc:  # noqa: BLE001
        errors.append(f"write_variation_css failed: {exc}")
        out_path = _client_variation_css_path(client, run_dir)
        total_chars = 0

    d3_inserted = 0

    output = {
        "output_path": str(out_path.relative_to(REPO)) if out_path.exists() else "",
        "total_chars": total_chars,
        "css_body_chars": css_body_chars,
        "sources": sources,
        "d3_inserted": d3_inserted,
        "css_router_stats": routing_stats,
        "passed": not bool(errors),
    }
    status = "complete" if not errors else "partial"
    write_artefact(run_dir, 7, "css-lift", status, output, started, errors, warnings)
    return output


def _stage_0_7_verbatim_fallback(
    css_text: str, sources: list[dict], css_body_chars: int,
    client: str, mockup_path: Path, run_dir: Path,
    started: str, errors: list[str], warnings: list[str],
) -> dict:
    """Verbatim CSS dump — preserves the pre-P1.B behaviour as a graceful fallback
    when css_router is unavailable. Writes all CSS to variation CSS unscoped.
    """
    header = (
        "/*!\n"
        f" * SGS clone-pipeline CSS-lift output for client: {client}\n"
        f" * Source mockup: {mockup_path.relative_to(REPO) if mockup_path.is_absolute() else mockup_path}\n"
        f" * Lifted: {started}\n"
        " *\n"
        " * FALLBACK MODE: css_router unavailable; verbatim dump (Spec 16 §FR6 routing bypassed).\n"
        " */\n\n"
    )
    payload = header + css_text
    out_path = _client_variation_css_path(client, run_dir)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(payload, encoding="utf-8")
    output = {
        "output_path": str(out_path.relative_to(REPO)),
        "total_chars": len(payload),
        "css_body_chars": css_body_chars,
        "sources": sources,
        "d3_inserted": 0,
        "css_router_stats": {},
        "passed": True,
        "fallback_mode": "verbatim",
    }
    status = "complete" if not errors else "failed"
    write_artefact(run_dir, 7, "css-lift", status, output, started, errors, warnings)
    return output



# composer_fallback retired 2026-05-14: unmatched sections now surface to
# operator (per_section_results[].status = "unmatched") instead of emitting
# best-effort atomic markup that masked catalogue gaps. The autonomy chain
# (stage_9b) handles the recovery path by scaffolding novel blocks.


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def make_run_id(client: str, page: str) -> str:
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%d-%H%M%S")
    return f"{client}-{page}-{ts}"


def write_artefact(run_dir: Path, stage_n: int, stage_name: str, status: str, output: dict, started_at: str, errors: list, warnings: list) -> Path:
    artefact = {
        "stage": stage_name,
        "stage_number": stage_n,
        "status": status,
        "run_id": run_dir.name,
        "started_at": started_at,
        "completed_at": now_iso(),
        "output": output,
        "warnings": warnings,
        "errors": errors,
    }
    path = run_dir / f"stage-{stage_n}.json"
    path.write_text(json.dumps(artefact, indent=2, ensure_ascii=False), encoding="utf-8")
    return path


def _load_module_from_path(module_name: str, path: Path):
    """Import a python file whose name contains hyphens (e.g. confidence-matrix.py).

    Registers the module in sys.modules BEFORE exec so @dataclass can look
    up the owning module during class processing (`sys.modules.get(cls.__module__)`
    returns None otherwise + dataclass crashes with `'NoneType' has no __dict__`).
    """
    spec = importlib.util.spec_from_file_location(module_name, path)
    if spec is None or spec.loader is None:
        raise ImportError(f"Could not load module from {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module


# Lazy-import the confidence-matrix module on first call.
_confidence_matrix_mod = None


def confidence_matrix():
    global _confidence_matrix_mod
    if _confidence_matrix_mod is None:
        _confidence_matrix_mod = _load_module_from_path("sgs_confidence_matrix", MATRIX_SCRIPT)
    return _confidence_matrix_mod


# Lazy-import the token_resolver module on first call (Spec 31 Phase 5d.2 - wired by Phase 6 v2 Step 4a).




# ----------------------------------------------------------------------------
# token_resolver / variation_router / supports_writer / modifier_extractors
# ----------------------------------------------------------------------------
# All four lazy-loader wrappers and their *_SCRIPT path constants were REMOVED
# 2026-08-02. The modules they pointed at were deleted in the same session's Phase-4
# purge, and every wrapper had exactly ONE occurrence in this file — its own `def`.
# Zero callers, here or anywhere (checked outside the repo too).
#
# ⚠ They are called out because the purge commit claimed "zero inbound refs,
# individually verified" for token_resolver.py while THIS file still named it. That
# claim was inaccurate: dead code referencing a dead file is still a reference, and it
# would have produced a confusing FileNotFoundError for anyone who wired the wrapper up
# later. An adversarial QC rater caught it.

# Lazy-import variation_router + token-lint slug generator (Spec 31 Phase 6 v2 Step 4b).
# token-lint is loaded for its canonical _generate_slug() helper -- module reuse
# avoids duplicating slug rules already covered by the additive token-discovery
# tests in token-lint's suite. variation_router owns the single write path
# into client style variation JSONs.
_token_lint_mod = None




def _token_lint():
    global _token_lint_mod
    if _token_lint_mod is None:
        _token_lint_mod = _load_module_from_path("sgs_token_lint", TOKEN_LINT_SCRIPT)
    return _token_lint_mod


# Lazy-import trace logger (2026-05-14, Q3 diagnostic synthesis).
# Writes one trace.jsonl per run; every event is soft-failed so trace failure
# never propagates and breaks the pipeline.
_trace_mod = None


def _trace_for(run_dir: "Path | None"):
    """Return a Trace bound to run_dir, or None if unavailable. Always safe."""
    global _trace_mod
    try:
        if _trace_mod is None:
            _trace_mod = _load_module_from_path("sgs_trace", TRACE_SCRIPT)
        return _trace_mod.Trace.for_run(run_dir)
    except Exception:
        return None


def _emit(tr, **kwargs) -> None:
    """Soft-fail wrapper around tr.event(...). No-op if tr is None."""
    if tr is None:
        return
    try:
        tr.event(**kwargs)
    except Exception:
        pass


# The run directory of the in-flight run, published by main() so the __main__
# finally-block can re-surface the per-severity logs after the final stage.
# See _surface_logs() for why a second pass is required.
_RUN_DIR: "Path | None" = None


def _surface_logs(run_dir: "Path | None", tag: str) -> dict:
    """Regenerate the per-severity companion logs from trace.jsonl. Soft-fail.

    Called TWICE per run, deliberately (R4, 2026-08-04):

      1. at stage 9c — before the ``--skip-autonomy-gate`` early return, so a
         dev run still gets its logs (the 2026-05-19 /qc-inline fix);
      2. from the ``__main__`` finally-block — AFTER the last stage.

    The second pass exists because ``summary.log`` is derived wholly from
    ``trace.jsonl``, and stages 10 / 11.6 / 4k run *after* the 9c call site.
    Without it those stages could never appear in the summary no matter how
    well they were instrumented — the artefact would keep describing a
    prefix of the run while looking complete.

    Returns the surfacer's result dict, or ``{}`` when it could not run.
    """
    if run_dir is None:
        return {}
    try:
        mod = _load_module_from_path(
            "surface_pipeline_logs",
            Path(__file__).parent / "orchestrator" / "surface_pipeline_logs.py",
        )
        result = mod.surface(run_dir)
        if result.get("status") == "ok":
            counts = result.get("counts", {})
            print(
                f"[{tag}] surfaced logs: "
                f"chrome_skip={counts.get('chrome_skip', 0)} "
                f"errors={counts.get('error', 0)} "
                f"warnings={counts.get('warning', 0)} "
                f"-> {', '.join(result.get('files_written', {}).keys())}"
            )
        return result
    except Exception as exc:  # noqa: BLE001 - surfacing is observability; soft-fail
        print(f"[{tag}] surface-logs soft-failed: {exc}", file=sys.stderr)
        return {}


# Role names from token_resolver (color / spacing / font_size / shadow / family)
# map onto token-lint's TokenClass values (color / spacing / fontSize / shadow /
# fontFamily) for slug generation. Keep this dict in lock-step with both modules.
_TOKEN_RESOLVER_ROLE_TO_TOKEN_LINT_CLASS = {
    "color":     "color",
    "spacing":   "spacing",
    "font_size": "fontSize",
    "shadow":    "shadow",
    "family":    "fontFamily",
}


# Per-role theme.json registry slice path + value-key, mirroring
# variation_router._ROLE_TO_REGISTRY. Used by the Step 4b dispatch to
# reflect newly-minted tokens back into the in-memory theme_json so
# subsequent sections in the same /sgs-clone run see them via
# token_resolver.resolve_batch (Gemini Flash QC panel finding 2026-05-14).
_TOKEN_RESOLVER_ROLE_TO_THEME_JSON_REGISTRY: dict[str, tuple[list[str], str]] = {
    "color":     (["color", "palette"],            "color"),
    "spacing":   (["spacing", "spacingSizes"],     "size"),
    "font_size": (["typography", "fontSizes"],     "size"),
    "shadow":    (["shadow", "presets"],           "shadow"),
    "family":    (["typography", "fontFamilies"],  "fontFamily"),
}


def _reflect_new_token_in_theme_json(theme_json: dict, role: str, slug: str, raw_value: str) -> None:
    """Append a newly-minted token to the in-memory theme_json registry.

    The variation_router writes the token to the client variation file on
    disk; this helper also mutates the orchestrator-scoped theme_json dict
    so the next section's token_resolver.resolve_batch can snap matching
    raw values to the new slug instead of re-flagging them as gap
    candidates. No-op when the token already exists at the slug.
    """
    cfg = _TOKEN_RESOLVER_ROLE_TO_THEME_JSON_REGISTRY.get(role)
    if cfg is None:
        return
    path, value_key = cfg
    settings = theme_json.setdefault("settings", {})
    area = settings.setdefault(path[0], {})
    bucket = area.setdefault(path[1], [])
    if not isinstance(bucket, list):
        return
    if any(isinstance(e, dict) and e.get("slug") == slug for e in bucket):
        return
    bucket.append({"slug": slug, value_key: raw_value.strip()})


# Lazy-import supports_writer (Spec 31 Phase 6 v2 Step 4c). supports_writer
# itself transitively loads value-matcher/inheritance.py when present, so the
# Phase 5 inheritance check is reachable through this single dispatch.




# Lazy-import modifier_extractors (Spec 31 Phase 6 v2 Step 4d).




# Lazy-import stage1_boundary_hook (Spec 31 Phase 6 v2 Step 4e). The module
# transitively loads orchestrator/lingua_franca.py at import time so wiring
# this single helper flips lingua_franca's reachability column too.
_stage1_boundary_hook_mod = None


def stage1_boundary_hook():
    global _stage1_boundary_hook_mod
    if _stage1_boundary_hook_mod is None:
        _stage1_boundary_hook_mod = _load_module_from_path("sgs_stage1_boundary_hook", STAGE1_BOUNDARY_HOOK_SCRIPT)
    return _stage1_boundary_hook_mod


# Lazy-import attribute-gap-writer (Spec 31 Phase 6 v2 Step 4f).
_attribute_gap_writer_mod = None


def attribute_gap_writer():
    global _attribute_gap_writer_mod
    if _attribute_gap_writer_mod is None:
        _attribute_gap_writer_mod = _load_module_from_path("sgs_attribute_gap_writer", ATTRIBUTE_GAP_WRITER_SCRIPT)
    return _attribute_gap_writer_mod


# Lazy-import functionality-gap-detector (Spec 31 Phase 6 v2 Step 4g).
_functionality_gap_detector_mod = None


def functionality_gap_detector():
    global _functionality_gap_detector_mod
    if _functionality_gap_detector_mod is None:
        _functionality_gap_detector_mod = _load_module_from_path(
            "sgs_functionality_gap_detector", FUNCTIONALITY_GAP_DETECTOR_SCRIPT,
        )
    return _functionality_gap_detector_mod


# Lazy-import gap-review-report (Spec 31 Phase 6 v2 Step 4h).
_gap_review_report_mod = None


def gap_review_report():
    global _gap_review_report_mod
    if _gap_review_report_mod is None:
        _gap_review_report_mod = _load_module_from_path("sgs_gap_review_report", GAP_REVIEW_REPORT_SCRIPT)
    return _gap_review_report_mod


# Lazy-import attribute-staged-apply + functionality-bulk-apply + media-sideload
# (Spec 31 Phase 6 v2 Step 4i). All three are operator-gated workflows: they
# stage / emit deploy commands; they NEVER auto-mutate live WordPress. The
# orchestrator wires them so that (a) the modules are reachable from the
# /sgs-clone runtime namespace and (b) media-sideload's dry-run harvester
# runs automatically each clone to leave a manifest the operator can review.
_attribute_staged_apply_mod = None
_functionality_bulk_apply_mod = None
_media_sideload_mod = None


def attribute_staged_apply():
    global _attribute_staged_apply_mod
    if _attribute_staged_apply_mod is None:
        _attribute_staged_apply_mod = _load_module_from_path(
            "sgs_attribute_staged_apply", ATTRIBUTE_STAGED_APPLY_SCRIPT,
        )
    return _attribute_staged_apply_mod


def functionality_bulk_apply():
    global _functionality_bulk_apply_mod
    if _functionality_bulk_apply_mod is None:
        _functionality_bulk_apply_mod = _load_module_from_path(
            "sgs_functionality_bulk_apply", FUNCTIONALITY_BULK_APPLY_SCRIPT,
        )
    return _functionality_bulk_apply_mod


def media_sideload():
    global _media_sideload_mod
    if _media_sideload_mod is None:
        _media_sideload_mod = _load_module_from_path(
            "sgs_media_sideload", MEDIA_SIDELOAD_SCRIPT,
        )
    return _media_sideload_mod


# Lazy-import wp_integration (Spec 31 Phase 6 v2 Step 4j).
_wp_integration_mod = None


def wp_integration():
    global _wp_integration_mod
    if _wp_integration_mod is None:
        _wp_integration_mod = _load_module_from_path(
            "sgs_wp_integration", WP_INTEGRATION_SCRIPT,
        )
    return _wp_integration_mod


# Lazy-import critical-fix-verification (Spec 31 Phase 6 v2 Step 4k).
_critical_fix_verification_mod = None


def critical_fix_verification():
    global _critical_fix_verification_mod
    if _critical_fix_verification_mod is None:
        _critical_fix_verification_mod = _load_module_from_path(
            "sgs_critical_fix_verification", CRITICAL_FIX_VERIFICATION_SCRIPT,
        )
    return _critical_fix_verification_mod


def _harvest_functionality_gap_elements(mockup_path: Path, match_output: dict) -> list[dict]:
    """Walk the mockup DOM under every matched section selector and emit
    element dicts (selector / matched_block_slug / html_attrs / inline_handlers)
    for every element that carries at least one behaviour-fingerprint
    attribute or an inline on*-style handler.

    The detector module owns the scoring logic; this helper is the BS4
    glue that produces detector-shaped input from the live mockup.
    """
    if not mockup_path or not mockup_path.exists():
        return []
    try:
        from bs4 import BeautifulSoup
    except ImportError:
        return []
    try:
        soup = BeautifulSoup(mockup_path.read_text(encoding="utf-8"), "html.parser")
    except Exception:  # noqa: BLE001
        return []

    elements: list[dict] = []
    for m in match_output.get("matches") or []:
        section_selector = (m.get("selector")
                            or m.get("boundary_selector")
                            or "")
        matched_slug = m.get("block_name")
        if not section_selector:
            continue
        try:
            root = soup.select_one(section_selector)
        except Exception:  # noqa: BLE001 - malformed selector
            continue
        if root is None:
            continue
        for el in root.descendants:
            tag = getattr(el, "name", None)
            if not tag:
                continue
            attrs = {k.lower(): v for k, v in (el.attrs or {}).items()}
            behaviour_attrs = {k: v for k, v in attrs.items() if k in _BEHAVIOUR_HTML_ATTR_SET}
            inline_handlers = [k for k in attrs.keys() if k.startswith("on") and len(k) > 2]
            if not behaviour_attrs and not inline_handlers:
                continue
            # Build a precise-ish selector for traceability.
            classes = " ".join(el.get("class") or [])
            sel_suffix = (f".{el.get('class')[0]}" if el.get("class") else f"#{el.get('id')}"
                          if el.get("id") else "")
            elements.append({
                "selector":            f"{section_selector} {tag}{sel_suffix}".strip(),
                "matched_block_slug":  matched_slug,
                "html_tag":            tag,
                "html_attrs":          behaviour_attrs,
                "inline_handlers":     inline_handlers,
                "class_signature":     classes,
            })
    return elements


def _harvest_attribute_gap_candidates(extract: dict) -> list[dict]:
    """Walk extract.per_section_results and collect every is_gap_candidate=True
    token resolution as an attribute-gap-writer input row.

    The attribute-gap-writer schema needs (block_slug, selector, css_property,
    value_seen, role_proposed, confidence). token_resolutions carry block_slug,
    attr_name, raw_value, role, confidence, is_gap_candidate. attr_name maps
    onto css_property as the closest semantic substitute (the resolver is
    attr-aware, not CSS-property-aware).
    """
    gaps: list[dict] = []
    for section in (extract or {}).get("per_section_results") or []:
        selector = section.get("selector") or ""
        for res in section.get("token_resolutions") or []:
            if not res.get("is_gap_candidate"):
                continue
            raw_value = res.get("raw_value")
            if not isinstance(raw_value, str) or not raw_value.strip():
                continue
            gaps.append({
                "block_slug":    res.get("block_slug") or section.get("block_name"),
                "selector":      selector,
                "css_property":  res.get("attr_name"),
                "value_seen":    raw_value.strip(),
                "role_proposed": res.get("role"),
                "confidence":    res.get("confidence"),
            })
    return gaps


def _harvest_content_gaps(extract: dict) -> list[dict]:
    """Walk extract.per_section_results and collect every content_gaps entry
    (converter.services.content_gap_collector — dropped ContentGaps + fuzzy/
    alias-fallback BEM resolutions) into the shape
    ``ledger/content_gap_check.py`` / ``ledger/content_coverage_check.py``
    already expect: ``{"block", "attr_or_slot", "fixture", "detail"}``. Those
    two gates existed BEFORE this task (F5 ContentGap visibility gate,
    plans/2026-06-26-stage3-child-shape-fork-design.md §4/§6) but had zero
    writer — ``content-gaps.json`` was never produced by anything, so both
    gates ran permanently in their fail-safe "absent file" green state. This
    harvest is that missing writer.

    Extra keys (``kind``, ``stage``, ``resolved_to``, ``fallback_route``, …)
    ride along unused by the two existing gates (dict.get-based readers) but
    let a human/report reading content-gaps.json directly see the full
    finding, not just the 4-field summary.
    """
    gaps: list[dict] = []
    for section in (extract or {}).get("per_section_results") or []:
        fixture = section.get("boundary_id") or section.get("selector") or ""
        for g in section.get("content_gaps") or []:
            kind = g.get("kind", "")
            if kind == "dropped":
                block = g.get("block_slug") or section.get("block_name") or ""
                attr_or_slot = g.get("where") or ""
            else:  # fuzzy_fallback / fallback_declined
                block = g.get("resolved_to") or ""
                attr_or_slot = g.get("token_or_selector") or ""
            gaps.append({
                "block": block,
                "attr_or_slot": attr_or_slot,
                "fixture": fixture,
                "detail": g.get("detail", ""),
                "kind": kind,
                **{k: v for k, v in g.items() if k not in ("kind", "detail", "block_slug", "where")},
            })
    return gaps


# ---------------------------------------------------------------------------
# Stage 1 -- BOUNDARY (dispatcher: per-section-convention-voter.py)
# ---------------------------------------------------------------------------

def stage_1_boundary(
    mockup_path: Path,
    section_selector: str,
    auto_section: bool,
    run_dir: Path,
    sc_var_cache_path: Path | None = None,
    draft_dir: Path | None = None,
    screen: str | None = None,
    screen_route: bool = True,
) -> dict:
    """Stage 1 -- delegate to per-section-convention-voter.py via subprocess.

    Multi-screen drafts (screen route): when the draft holds two or more ``<main
    data-screen-label>`` screens, every boundary is tagged with its screen and the run's chosen
    screen (``screen``, else the README's route ``/``); see orchestrator/screen_route.py. A draft
    with fewer than two screens is untouched. ``draft_dir`` is the ORIGINAL draft's folder (the
    README sits beside it, not beside the resolved copy Stage 1 reads).

    `sc_var_cache_path` (2026-09-14, Bean-directed): threaded straight through to
    the voter's own --sc-var-cache so already-committed Tier B classifications
    resolve here. After enrichment, if any sc-for boundary is still unresolved,
    stage_1_boundary hands off to _halt_for_tier_b() -- see that function for why
    this is a HALT, not a subagent/API dispatch.
    """
    started = now_iso()
    voter_out = run_dir / "voter.json"
    cmd = [
        sys.executable, str(VOTER_SCRIPT),
        "--mockup", str(mockup_path),
        "--out", str(voter_out),
    ]
    if sc_var_cache_path is not None:
        cmd.extend(["--sc-var-cache", str(sc_var_cache_path)])
    if auto_section:
        cmd.append("--auto-section")
        # 2026-09-14, "connect the pieces" follow-up — real bug found live:
        # Stage 4 re-parses args.mockup independently and re-locates each
        # boundary's element by id/class; for a classless boundary neither
        # ever matches uniquely (verified: BS4's tag-only find() always
        # returns the FIRST match of that tag, so every classless boundary
        # beyond the first of its tag silently resolved to the WRONG
        # element's content). This tagged copy carries a
        # data-sgs-boundary-id attribute per boundary, in the same order
        # write_tagged_mockup() derives deterministically, so Stage 4 can
        # find each boundary's REAL element without relying on class/id.
        cmd.extend(["--tagged-mockup-out", str(run_dir / "tagged-mockup.html")])
    else:
        cmd.extend(["--section", section_selector])

    proc = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8")
    errors: list[str] = []
    warnings: list[str] = []
    output: dict = {}
    if proc.returncode != 0:
        errors.append(f"voter exited {proc.returncode}: {(proc.stderr or '')[:500]}")
    elif voter_out.exists():
        output = json.loads(voter_out.read_text(encoding="utf-8"))
    else:
        errors.append("voter completed but voter.json was not written")

    # Stage 1 enrichment (Phase 6 v2 Step 4e) -- stage1_boundary_hook adds
    # lingua-franca conversion to each boundary: source_convention,
    # primary_sgs_bem, equivalent_implementations, gap_candidate_classes,
    # lingua_franca_skipped. Bean-controlled SGS-BEM drafts hit the fast path
    # (skipped=True). Downstream stages (Stage 2 match, Stage 4 extract by
    # boundary id) read voter.json which we rewrite below with the enriched
    # payload. Transitively wires orchestrator/lingua_franca.py at module
    # import time. Soft-fails to the original output so a hook crash never
    # blocks Stage 2.
    if output and output.get("boundaries"):
        try:
            sbh = stage1_boundary_hook()
            output = sbh.enrich_stage1_payload(output)
            # Rewrite voter.json so per-boundary lookups downstream pick up
            # the enriched fields without a second read of the original file.
            voter_out.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")
        except Exception as exc:  # noqa: BLE001 - enrichment is advisory; soft-fail
            warnings.append(f"stage1_boundary_hook soft-failed: {exc}; raw boundaries preserved")

    # Screen route: tag each boundary with the screen it sits in (multi-screen drafts only).
    tagged_path = run_dir / "tagged-mockup.html"
    if screen_route and output.get("boundaries") and tagged_path.exists():
        _sr = _load_module_from_path("sgs_screen_route", ORCHESTRATOR_DIR / "screen_route.py")
        try:
            summary = _sr.apply(output, tagged_path.read_text(encoding="utf-8"), Path(draft_dir or mockup_path.parent), screen)
        except _sr.ScreenRouteError as exc:
            sys.exit(f"HALT (screen route): {exc}")
        if summary is not None:
            (run_dir / "screens.json").write_text(json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8")
            voter_out.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")
            if summary.get("active"):
                other = [s for s in summary["screens"] if s["label"] != summary["chosen"]]
                warnings.append(
                    f"screen route: cloning screen '{summary['chosen']}' (chosen by {summary['chosen_by']}); "
                    f"{len(other)} other screen(s) are not converted into this page: "
                    + ", ".join(f"{s['label']} ({len(s['boundaries'])} boundaries, {s['text_chars']} characters of text)" for s in other))
            else:
                warnings.append(f"screen route inactive: {summary['reason']}")

    # Tier B halt (2026-09-14, Bean-directed): if a cache was supplied and any
    # sc-for boundary is still genuinely unresolved after Tier A + the cache,
    # stop the run here rather than silently converting without those
    # boundaries. See _halt_for_tier_b()'s own docstring for why this is a
    # HALT-and-resume, not a subagent dispatch or an API call.
    if sc_var_cache_path is not None and output.get("boundaries"):
        _maybe_halt_for_tier_b(output["boundaries"], sc_var_cache_path, run_dir)

    status = "complete" if not errors else "failed"
    write_artefact(run_dir, 1, "boundary", status, output, started, errors, warnings)
    return output


def _maybe_halt_for_tier_b(boundaries: list[dict], sc_var_cache_path: Path, run_dir: Path) -> None:
    """Halt the orchestrator process if Tier B classification is still needed.

    2026-09-14, Bean-directed correction to the earlier "wire an API key so the
    pipeline can call Haiku itself" design: the agent RUNNING this /sgs-clone
    invocation is already a full Claude Code session -- there is no need for a
    separate API call or subagent dispatch. sc_var_haiku_batch.py's own module
    docstring already names "the calling session (a Claude Code session...)" as
    the intended responder to its write-prompt/apply-response contract; this
    function is what actually makes the pipeline STOP and hand control back to
    that session instead of silently skipping Tier B, which is what happened
    every time this flag was omitted before today.

    Never calls an LLM itself, never spawns a subagent -- it writes a plain-text
    prompt file and exits. The SAME session that invoked this orchestrator run
    reads that file, answers it directly (no tool call needed -- it is already
    reasoning in this process), writes the response, runs sc_var_haiku_batch.py
    --apply-response to commit it to the cache, then re-invokes this exact
    /sgs-clone command. Already-resolved boundaries never re-prompt (Piece 1's
    own unresolved_sc_for_names() re-derives the unresolved set fresh each run).
    """
    sys.path.insert(0, str(RECOGNISER_DIR))
    import importlib.util as _ilu
    _spec = _ilu.spec_from_file_location(
        "sc_var_haiku_batch_for_halt", RECOGNISER_DIR / "sc_var_haiku_batch.py"
    )
    _batch = _ilu.module_from_spec(_spec)
    _spec.loader.exec_module(_batch)
    from recogniser import sc_var_classifier as _scv  # noqa: E402

    cache = _scv.load_cache(sc_var_cache_path)
    unresolved = _scv.unresolved_sc_for_names(boundaries, cache)
    if not unresolved:
        return  # nothing left to classify -- Tier A + the cache already covered everything

    boundary_data = {"boundaries": boundaries}
    boundary_json_path = run_dir / "stage1-boundaries-for-tier-b.json"
    boundary_json_path.write_text(json.dumps(boundary_data, indent=2), encoding="utf-8")

    prompt_path = run_dir / "tier-b-prompt.txt"
    response_path = run_dir / "tier-b-response.txt"
    items = _batch.build_batch_items(boundaries, cache)
    valid_blocks = _batch._load_valid_blocks()
    prompt = _batch.build_prompt(items, valid_blocks)
    prompt_path.write_text(prompt, encoding="utf-8")

    print(
        "\n"
        "======================================================================\n"
        "  TIER B CLASSIFICATION NEEDED -- run halted, no conversion happened\n"
        "======================================================================\n"
        f"  {len(unresolved)} sc-for name(s) in this draft have no confident identity yet.\n"
        f"  Prompt written to: {prompt_path}\n"
        "\n"
        "  Next steps (same session, no separate API call or subagent):\n"
        f"  1. Read {prompt_path.name} and answer it directly -- you are already a\n"
        "     capable model reasoning right now; just produce the JSON array it asks for.\n"
        f"  2. Write your JSON answer to: {response_path}\n"
        "  3. Commit it to the cache:\n"
        f"     python {RECOGNISER_DIR / 'sc_var_haiku_batch.py'} \\\n"
        f"       --boundary {boundary_json_path} --cache {sc_var_cache_path} \\\n"
        f"       --apply-response {response_path}\n"
        "  4. Re-run this exact /sgs-clone command -- already-resolved boundaries\n"
        "     will not re-prompt.\n"
        "======================================================================\n",
        file=sys.stderr,
    )
    sys.exit(2)


# ---------------------------------------------------------------------------
# sc_var responsive bridge (D1061 follow-up, 2026-09-15) -- patch extra attrs
# INTO already-serialised WP block-comment markup.
# ---------------------------------------------------------------------------

_WP_BLOCK_COMMENT_RE = re.compile(r"^<!--\s*wp:([a-z0-9-]+/[a-z0-9-]+)\s*(\{.*?\})?\s*-->", re.DOTALL)


def _patch_block_comment_attrs(markup: str, extra_attrs: dict) -> str:
    """Merge ``extra_attrs`` into an already-serialised block's OWN opening
    ``<!-- wp:slug {...} -->`` comment, one level deep (a dict value merges
    its own keys rather than being replaced whole -- the tier-object shape a
    responsive box attr needs). Returns ``markup`` UNCHANGED if it doesn't
    start with a recognisable WP block comment (never corrupts unexpected
    input) or if ``extra_attrs`` is empty.
    """
    if not extra_attrs:
        return markup
    match = _WP_BLOCK_COMMENT_RE.match(markup)
    if not match:
        return markup
    slug, attrs_json = match.group(1), match.group(2)
    try:
        attrs = json.loads(attrs_json) if attrs_json else {}
    except ValueError:
        return markup
    for key, value in extra_attrs.items():
        if isinstance(value, dict) and isinstance(attrs.get(key), dict):
            attrs[key] = {**attrs[key], **value}
        else:
            attrs[key] = value
    new_comment = f"<!-- wp:{slug} {json.dumps(attrs, separators=(',', ':'))} -->"
    return new_comment + markup[match.end():]


# ---------------------------------------------------------------------------
# Stage 2 -- MATCH (dispatcher: confidence-matrix.score_candidates importable)
# ---------------------------------------------------------------------------

def _wp_blocks_match(description: str) -> dict:
    """Call wp-blocks.py match and return the parsed dict. Soft-fail returns {}."""
    if not WP_BLOCKS_CLI.exists():
        return {}
    result = _run_cli([sys.executable, str(WP_BLOCKS_CLI), "match", description])
    return result if "_error" not in result else {}


def stage_2_match(
    boundary_output: dict,
    run_dir: Path,
    sc_var_min_confidence: float | None = None,
    dom_shape_min_confidence: float | None = None,
) -> dict:
    """Stage 2 -- import confidence-matrix.score_candidates and rank candidates per boundary.

    5.3.2 enhancement: after scoring, cross-check each match against wp-blocks.py match.
    When the two disagree by > 0.3 confidence, favour the wp-blocks result (it has
    the SGS pattern DB behind it) and log a warning for operator review.

    `sc_var_min_confidence` (2026-09-14, "connect the pieces" follow-up): opt-in third
    cross-check, same shape as the wp-blocks one above. For a classless Claude Design
    boundary, confidence-matrix has nothing to key on and its "top" pick is a low,
    non-discriminating default (sgs/container) -- Piece 1's sc_var_hint is the only
    real signal available, so unlike the wp-blocks override (which requires a >0.3
    margin against a MEANINGFUL confidence-matrix score), any sc_var_hint at or above
    the threshold wins outright. `None` (the default) disables this entirely -- zero
    behaviour change for every existing caller.
    """
    started = now_iso()
    errors: list[str] = []
    warnings: list[str] = []

    try:
        cm = confidence_matrix()
        registered = cm.discover_registered_blocks()
        patterns = cm.discover_registered_patterns()
        scaffolds = cm.discover_scaffold_blocks()
        matches: list[dict] = []
        for boundary in boundary_output.get("boundaries", []):
            ranked = cm.score_candidates(boundary, registered, patterns, scaffolds, run_dir=run_dir)
            top = ranked[0] if ranked else {"block_name": "sgs/container", "confidence": 0.0, "tie_breaker": "deferred-no-match"}

            # 5.3.2 — cross-check with wp-blocks.py match (advisory, soft-fail).
            # Build a description from section_id + selector for the natural-language query.
            section_id = boundary.get("section_id") or boundary.get("boundary_id") or ""
            selector   = boundary.get("selector", "")
            description = f"{section_id} {selector}".strip()
            wp_match_data = {}
            wp_top_block: str | None = None
            wp_top_score: float = 0.0
            if description and WP_BLOCKS_CLI.exists():
                wp_match_data = _wp_blocks_match(description)
                wp_matches_list = wp_match_data.get("matches", [])
                if wp_matches_list:
                    wp_top = wp_matches_list[0]
                    wp_top_block = wp_top.get("block")
                    # wp-blocks score is 0-10; normalise to 0-1 for comparison
                    raw_score = wp_top.get("score", 0)
                    wp_top_score = raw_score / 10.0 if isinstance(raw_score, (int, float)) else 0.0

            cm_confidence = top.get("confidence", 0.0)
            cm_block = top.get("block_name", "sgs/container")
            chosen_block = cm_block
            chosen_source = "confidence_matrix"

            if wp_top_block and wp_top_score > cm_confidence + 0.3:
                # wp-blocks is more confident by the threshold — favour it.
                warnings.append(
                    f"boundary={boundary['boundary_id']}: wp-blocks match "
                    f"({wp_top_block}, score={wp_top_score:.2f}) overrides "
                    f"confidence-matrix ({cm_block}, conf={cm_confidence:.2f})"
                )
                chosen_block = wp_top_block
                chosen_source = "wp_blocks_cli"

            # sc_var_hint cross-check (opt-in, see docstring) -- attached to the boundary by
            # per-section-convention-voter.py, not scored by confidence-matrix at all.
            #
            # NOTE on Tier A's count-based fallback (source="sc_var_count" -- names
            # "card-grid", a bare non-namespaced string, not a real DB block slug; D1062's
            # already-named observation): this WAS excluded here during live debugging of
            # the Stage 4 class-injection regression below, then the exclusion was reverted
            # -- verified live it was costing real recognition (414 -> 96 attrs extracted)
            # for no benefit, because `chosen_block` here is COSMETIC once cv2_eligible
            # admits the boundary (Stage 4's converter path derives identity from the HTML
            # itself via recognise_section, never from this field, when no class is
            # injected -- confirmed by reading real output: "complete" boundaries carried
            # block_name="sgs/container" regardless of what Stage 2 chose). The actual
            # regression cause was ALWAYS the Stage 4 HTML-class injection (now removed
            # entirely, see that comment) -- not this cross-check.
            sc_var_hint = boundary.get("sc_var_hint")
            sc_var_confidence = 0.0
            if (
                sc_var_min_confidence is not None
                and sc_var_hint
                and sc_var_hint.get("block")
                and sc_var_hint.get("confidence", 0) >= sc_var_min_confidence
            ):
                sc_var_confidence = float(sc_var_hint["confidence"])
                current_best = max(cm_confidence, wp_top_score if chosen_source == "wp_blocks_cli" else 0.0)
                if sc_var_confidence >= current_best:
                    warnings.append(
                        f"boundary={boundary['boundary_id']}: sc_var_hint match "
                        f"({sc_var_hint['block']}, conf={sc_var_confidence:.2f}) overrides "
                        f"{chosen_source} ({chosen_block}, conf={current_best:.2f}) "
                        f"-- Claude Design sc-for identity, --sc-var-min-confidence={sc_var_min_confidence}"
                    )
                    chosen_block = sc_var_hint["block"]
                    chosen_source = "sc_var_hint"

            # dom_shape Tier (2026-09-14, "the 20 real gaps" follow-up) -- same shape as
            # the sc_var cross-check above, one rung lower: fires only when sc_var_hint
            # gave nothing usable either (bespoke sc-for var name, no slots.aliases hit,
            # no repeat-count signal). Q1 Tier 2's dom_shape_classifier infers purely from
            # DOM shape (sibling repetition, heading position, tag identity) -- weaker
            # evidence, so it only wins when nothing stronger already claimed the boundary.
            dom_shape_hint = boundary.get("dom_shape_hint")
            dom_shape_confidence = 0.0
            if (
                dom_shape_min_confidence is not None
                and chosen_source != "sc_var_hint"
                and dom_shape_hint
                and dom_shape_hint.get("block")
                and dom_shape_hint.get("confidence", 0) >= dom_shape_min_confidence
            ):
                dom_shape_confidence = float(dom_shape_hint["confidence"])
                current_best = max(
                    cm_confidence,
                    wp_top_score if chosen_source == "wp_blocks_cli" else 0.0,
                    sc_var_confidence,
                )
                if dom_shape_confidence >= current_best:
                    warnings.append(
                        f"boundary={boundary['boundary_id']}: dom_shape_hint match "
                        f"({dom_shape_hint['block']}, conf={dom_shape_confidence:.2f}) overrides "
                        f"{chosen_source} ({chosen_block}, conf={current_best:.2f}) "
                        f"-- DOM-shape inference, --dom-shape-min-confidence={dom_shape_min_confidence}"
                    )
                    chosen_block = dom_shape_hint["block"]
                    chosen_source = "dom_shape_hint"

            matches.append({
                "boundary_id": boundary["boundary_id"],
                "section_id": section_id,
                "block_name": chosen_block,
                "confidence": max(cm_confidence, wp_top_score, sc_var_confidence, dom_shape_confidence),
                "alternatives": ranked[1:],
                "ranked_candidates": ranked,
                "wp_blocks_match": wp_top_block,
                "wp_blocks_score": wp_top_score,
                "chosen_source": chosen_source,
            })
        output = {"matches": matches}
    except Exception as exc:  # noqa: BLE001 -- top-level safety; capture and continue
        errors.append(f"confidence-matrix import/run failed: {exc}")
        output = {"matches": []}

    status = "complete" if not errors else "failed"
    write_artefact(run_dir, 2, "match", status, output, started, errors, warnings)
    return output


# ---------------------------------------------------------------------------
# Stage 3 -- SLOT LIST (DB-canonical; falls back to auto-derived with gap marker)
# ---------------------------------------------------------------------------

def _load_db_block_attrs(block_slug: str) -> dict:
    """Load {attr_name: {role, canonical_slot, attr_type}} from sgs-framework.db.

    Uses db_lookup.block_attrs() which is LRU-cached per slug.
    Returns an empty dict if the import fails or the block has no DB rows.
    This is a module-local helper so Wave 3a can freely modify db_lookup.py.
    """
    try:
        _db_dir = ORCHESTRATOR_DIR.parent
        if str(_db_dir) not in sys.path:
            sys.path.insert(0, str(_db_dir))
        # Repointed to converter.db.db_lookup (EXECUTION Step 10, 2026-07-04) —
        # the canonical implementation moved there in Step 9; the old
        # orchestrator/converter_v2/db_lookup.py path is now a re-export shim.
        from converter.db.db_lookup import block_attrs  # type: ignore[import]
        return block_attrs(block_slug)
    except Exception:  # noqa: BLE001 — never break Stage 3 on a DB miss
        return {}


def stage_3_slot_list(match_output: dict, run_dir: Path) -> dict:
    """Stage 3 -- build the slot scaffold from each matched block's block.json.

    For every attribute declared in block.json, the slot entry is tagged with
    DB-canonical metadata when available:

      canonical_source: 'db'          -- canonical_slot + role came from block_attributes
      canonical_source: 'auto-derived' -- DB had no row for this attr; fell back to
                                          block.json inference; slot_canonicalisation_gap=True
                                          is set so operators can see what needs canonicalising

    Universal-extraction principle: auto-derived is never silently treated as
    canonical. Every slot declares which path produced it.
    """
    started = now_iso()
    warnings: list[str] = []
    slot_lists: dict[str, dict] = {}

    for m in match_output.get("matches", []):
        boundary_id = m["boundary_id"]
        block_name = m["block_name"]
        section_id = m.get("section_id")

        # Pattern matches use a "pattern:<slug>" sentinel block_name (matcher Tier 2).
        # Patterns have no block.json and no per-attribute slot list -- they are
        # pre-composed PHP files. Record the pattern reference and emit an empty
        # slot list; downstream compose stage routes pattern_ref to wp:pattern directly.
        if isinstance(block_name, str) and block_name.startswith("pattern:"):
            slot_lists[boundary_id] = {
                "block_name": block_name,
                "section_id": section_id,
                "pattern_ref": block_name[len("pattern:"):],
                "slots": [],
            }
            continue

        slug = block_name.split("/")[-1] if "/" in block_name else block_name
        block_json_path = REPO / "plugins" / "sgs-blocks" / "src" / "blocks" / slug / "block.json"
        slots: list[dict] = []

        # Load DB canonical metadata for this block (keyed by attr_name).
        # Empty dict if block not in DB or import unavailable -- handled per-attr below.
        db_attrs = _load_db_block_attrs(block_name)

        db_canonical_count = 0
        auto_derived_count = 0

        if block_json_path.exists():
            block_json = json.loads(block_json_path.read_text(encoding="utf-8"))
            for attr_name, attr_def in (block_json.get("attributes") or {}).items():
                default_val = attr_def.get("default") if isinstance(attr_def, dict) else None

                db_row = db_attrs.get(attr_name)
                db_canonical_slot = db_row.get("canonical_slot") if db_row else None
                db_role = db_row.get("role") if db_row else None
                db_attr_type = db_row.get("attr_type") if db_row else None

                if db_row and db_canonical_slot:
                    # DB row exists and canonical_slot is populated -- use DB values.
                    slot_entry: dict = {
                        "slot_name": attr_name,
                        "canonical_slot": db_canonical_slot,
                        "attribute_role": db_role or "unknown",
                        "attr_type": db_attr_type,
                        "default": default_val,
                        "search_scope": "self",
                        "canonical_source": "db",
                    }
                    db_canonical_count += 1
                else:
                    # DB row missing or canonical_slot is NULL -- fall back to
                    # auto-derived behaviour but mark the gap explicitly.
                    # Never silently treat auto-derived as canonical.
                    slot_entry = {
                        "slot_name": attr_name,
                        "canonical_slot": attr_name,   # auto-derived: slot name = attr name
                        "attribute_role": db_role or "auto-derived",
                        "attr_type": db_attr_type,
                        "default": default_val,
                        "search_scope": "self",
                        "canonical_source": "auto-derived",
                        "slot_canonicalisation_gap": True,
                    }
                    auto_derived_count += 1

                slots.append(slot_entry)
        else:
            warnings.append(f"block.json not found at {block_json_path}")

        slot_lists[boundary_id] = {
            "block_name": block_name,
            "section_id": section_id,
            "slots": slots,
        }
        _emit(_trace_for(run_dir), stage="stage_3_slot_list",
              boundary_id=boundary_id, block_name=block_name, section_id=section_id,
              slot_count=len(slots), block_json_found=block_json_path.exists(),
              db_canonical_count=db_canonical_count,
              auto_derived_count=auto_derived_count)

    output = {"slot_lists": slot_lists, "version_drift_warnings": warnings}
    write_artefact(run_dir, 3, "slot-list", "complete" if not warnings else "warning", output, started, [], warnings)
    return output


# ---------------------------------------------------------------------------
# Stage 4-8 -- EXTRACT through SERIALISE (unchanged; calls extract.py)
# ---------------------------------------------------------------------------

def stage_4_5_6_7_8_extract(args, match_output: dict, run_dir: Path, run_ctx: dict | None = None) -> dict:
    """Stage 4-8 -- extract, token-snap, compose, and serialise per boundary.

    cv2 (converter_v2) is the only supported extraction path. Legacy
    tools/recogniser-v2/extract.py subprocess is permanently retired.
    Non-SGS-BEM boundaries halt with status 'unmatched-non-bem-compliant'
    and an operator-actionable warning (no subprocess fallback).
    """
    # Module-level cache populated lazily on first --debug-trace cv2 dispatch.
    # Without `global`, the assignment at the cv2 branch makes _trace_mod local
    # to this function and the prior `is None` check raises UnboundLocalError,
    # caught by the broad except, silently disabling per-section trace.
    global _trace_mod
    started = now_iso()
    extract_out = run_dir / "extract-result.json"

    # The current extract.py runs on a single section per invocation. For
    # multi-section mode we use the first match; multi-section walking is
    # Phase 8 scope (extract.py needs a per-boundary loop).
    matches = match_output.get("matches", [])
    if not matches:
        errors = ["no matches from stage 2 -- nothing to extract"]
        output = {"extract_result_path": "", "extracted_attributes": {}, "block_markup": "", "coverage": {}}
        write_artefact(run_dir, 4, "extract-harvest-classify-compose-serialise", "failed", output, started, errors, [])
        return output

    # Determine the boundary list to extract from. In single-section mode
    # (--section) just run once for that selector. In --auto-section mode
    # loop every matched boundary so multi-section pipelines work end-to-end.
    # Boundary selectors come from the voter; if missing fall back to the
    # CLI --section arg.
    boundary_path = run_dir / "voter.json"
    boundary_dict = json.loads(boundary_path.read_text(encoding="utf-8")) if boundary_path.exists() else {}
    boundaries_by_id = {b["boundary_id"]: b for b in boundary_dict.get("boundaries", [])}

    # Stage 4.5 -- TOKEN SNAP. theme_json is loaded once at Stage 0 in main()
    # and carried here via run_ctx (Step 6a cache). Mutations from _reflect_new_token
    # already operate on the same in-memory dict so multi-section runs stay coherent.
    theme_json: dict = (run_ctx or {}).get("theme_json", {})

    aggregate_attributes: dict = {}
    aggregate_markup_parts: list[str] = []
    aggregate_coverage: dict = {}
    aggregate_errors: list[str] = []
    aggregate_warnings: list[str] = []
    per_section_results: list[dict] = []

    # reset_pipeline_seed() is a documented no-op since EXECUTION Step 16
    # (2026-07-05) — the frozen convert.py consumer it used to reset
    # (_LIFT_CONTEXT["theme_widths"]) is deleted; the new engine never reads
    # _LIFT_CONTEXT. Call kept for signature compatibility / in case a future
    # per-run reset need reappears.
    try:
        _conv_pkg_dir_reset = ORCHESTRATOR_DIR.parent
        if str(_conv_pkg_dir_reset) not in sys.path:
            sys.path.insert(0, str(_conv_pkg_dir_reset))
        from converter.entry import reset_pipeline_seed as _reset_seed
        _reset_seed()
    except ImportError:
        pass

    # seed_theme_json() is a documented no-op since EXECUTION Step 16
    # (2026-07-05) — the frozen convert.py consumer it used to seed
    # (_LIFT_CONTEXT["theme_json"], read by _snap_style_dict_leaves) is
    # deleted. Call kept for signature compatibility.
    if theme_json and getattr(args, "converter_v2", False):
        try:
            _cv2_dir_seed = ORCHESTRATOR_DIR.parent
            if str(_cv2_dir_seed) not in sys.path:
                sys.path.insert(0, str(_cv2_dir_seed))
            from converter.entry import seed_theme_json as _seed_theme_json
            _seed_theme_json(theme_json)
        except Exception:  # noqa: BLE001
            pass  # no-op call; kept defensive in case of future re-wiring

    # sc_var responsive bridge (D1061 follow-up, 2026-09-15) — load the
    # correlator's joined-output JSON ONCE (--sc-var-responsive-correlated),
    # indexed by boundary_id, so the per-boundary loop below can look up its
    # record(s) in O(1). Opt-in: absent flag = today's behaviour unchanged.
    _sc_var_responsive_by_boundary: dict[str, list[dict]] = {}
    _sc_var_responsive_path = getattr(args, "sc_var_responsive_correlated", None)
    if _sc_var_responsive_path:
        try:
            _corr_data = json.loads(Path(_sc_var_responsive_path).read_text(encoding="utf-8"))
            for _rec in _corr_data.get("correlated", []):
                _bid = _rec.get("boundary_id")
                if _bid:
                    _sc_var_responsive_by_boundary.setdefault(_bid, []).append(_rec)
        except (OSError, ValueError) as _exc:  # noqa: BLE001
            aggregate_warnings.append(
                f"--sc-var-responsive-correlated read failed ({_exc}); "
                "responsive-bridge step skipped for this run"
            )

    # Spec 44 classless-group recognition (--classless-match, off by default).
    # The FR-44-1(b) precedent is snapshotted ONCE here, deliberately: the gate reads
    # the same log this run appends to, so a live re-read would let the row written by
    # a boundary's own forced first look satisfy the NEXT boundary's gate in the same
    # run — the "one-time human look" happening to nobody. See classless_trust_gate.
    _classless_enabled = bool(getattr(args, "classless_match", False))
    _classless_decisions: list = []
    _classless_precedent: tuple = ()
    _classless_gate = None
    _classless_adapter = None
    _classless_soup = None
    if _classless_enabled:
        try:
            if str(RECOGNISER_DIR) not in sys.path:
                sys.path.insert(0, str(RECOGNISER_DIR))
            import classless_draft_adapter as _classless_adapter  # noqa: F811
            import classless_trust_gate as _classless_gate  # noqa: F811
            _classless_precedent = _classless_gate.read_precedent()
        except Exception as _exc:  # noqa: BLE001
            _classless_enabled = False
            aggregate_warnings.append(
                f"--classless-match: Spec 44 modules unavailable ({_exc}); "
                "classless path skipped, conversion behaviour unchanged"
            )

    for m in matches:
        boundary_id = m["boundary_id"]
        target_block = m["block_name"]
        boundary = boundaries_by_id.get(boundary_id, {})
        section_selector = boundary.get("selector") or args.section
        # Screen route: a boundary on another screen of a multi-screen draft belongs to another page.
        # Reported with its text length, never converted into this one and never dropped silently.
        if boundary.get("screen_role") == "other":
            _emit(_trace_for(run_dir), stage="stage_4_other_route_view", boundary_id=boundary_id,
                  screen=boundary.get("screen"), text_chars=boundary.get("screen_text_chars", 0),
                  reason="boundary is on another screen of the draft")
            per_section_results.append({
                "boundary_id": boundary_id, "section_id": m.get("section_id"), "selector": section_selector,
                "block_name": target_block, "status": "other-route-view", "screen": boundary.get("screen"),
                "extract_path": "", "extracted_attributes": {}, "block_markup": "", "token_resolutions": [],
                "new_tokens_written": [], "supports_decisions": [], "supports_emitted_attributes": {},
                "supports_omitted_attributes": {}, "modifier_signals": {},
                "class_signature": boundary.get("class_signature") or [],
            })
            continue
        if not section_selector:
            aggregate_warnings.append(f"{boundary_id}: no selector resolved; skipping")
            continue

        # Spec 16 Phase 7 — compute converter_v2 eligibility once per boundary.
        # When --converter-v2 is active AND the boundary's class_signature is
        # already SGS-BEM canonical, the converter takes over Stages 4+4.5+5+7
        # inline. The converter emits sgs/container with the source className
        # for section wrappers it doesn't recognise as a registered block, so
        # the variation CSS still binds via className selector. This means the
        # legacy "unmatched -> operator review" gate below must NOT short-
        # circuit cv2-eligible boundaries — they get a recovery path the
        # legacy world didn't have.
        _cv2_eligible = False
        # Tier 0 (D1034, 2026-09-11) — True only when eligibility came from
        # lingua_franca's computed primary_sgs_bem rather than an already-
        # canonical raw class_signature. Consumed below to inject the
        # converted class onto the actual HTML root element (see comment
        # at _sec_el resolution) — without that injection the converter
        # re-derives recognition straight from the HTML and would still
        # find no `sgs-` root class.
        _cv2_eligible_via_lingua_franca = False
        if getattr(args, "converter_v2", False):
            _class_sig = boundary.get("class_signature") or []
            try:
                _s1bh = stage1_boundary_hook()
                if _s1bh is not None and hasattr(_s1bh, "_is_sgs_bem_canonical"):
                    _cv2_eligible = bool(_s1bh._is_sgs_bem_canonical(_class_sig))
            except Exception:  # noqa: BLE001
                _cv2_eligible = False
            # Tier 0 (D1034) — wire the already-computed primary_sgs_bem into
            # this gate instead of discarding it. lingua_franca.py computes a
            # real SGS-BEM equivalent for every class signature it recognises
            # in a genuine-slot-map convention; stage1_boundary_hook.py wrote
            # that value into voter.json's boundary['primary_sgs_bem'] at
            # Stage 1, but until now nothing downstream consulted it — this
            # gate checked ONLY the raw class_signature, so a boundary
            # lingua_franca had already successfully converted still hard-
            # halted with status 'unmatched-non-bem-compliant'.
            #
            # C1 fix (2026-09-11, post-review of D1034): keying this gate on
            # the CONVENTION NAME was proven wrong by execution, not just by
            # inspection — every one of the 3 "safe" conventions (bare BEM /
            # Bootstrap 5 / kebab-semantic) ALSO carries its own
            # `default_block: "container"` fallback, so a class whose regex
            # matches the convention's shape but MISSES every real slot_map
            # entry still returns a truthy primary_sgs_bem of
            # "sgs-container" -- indistinguishable downstream from a
            # genuine hit. Proven live: ['promo-banner'] and
            # ['services-grid'] both classify as kebab-semantic and both
            # produce primary_sgs_bem='sgs-container' via default_block,
            # with zero slot_map entries matched. kebab-semantic's pattern
            # matches almost any lowercase-hyphen class against a slot_map
            # of only 6 real entries, so that "safe" outcome was in fact
            # the MAJORITY outcome for admitted boundaries under the old
            # convention-name guard -- exactly the "everything becomes an
            # undifferentiated container" hazard this gate exists to
            # exclude.
            #
            # Fixed to key on lingua_franca's own
            # primary_is_slot_map_hit discriminator (added alongside this
            # fix — see lingua_franca.py::ConversionResult.is_slot_map_hit)
            # instead of the convention name. True ONLY when the winning
            # class actually matched a real slot_map entry (or was already
            # SGS-BEM canonical); False when the rule's regex matched
            # syntactically but the block token fell through to
            # default_block. This is a STRICT SUPERSET of the old
            # exclusion: Tailwind utility / shadcn Radix still can never
            # pass (their slot_map is permanently empty, so
            # is_slot_map_hit is always False for them), and every
            # previously-admitted genuine hit under the 3 named
            # conventions is still admitted -- but a matched-pattern/
            # missed-slot-map boundary (like the two proof cases above)
            # now correctly falls through to the hard halt instead of
            # being silently admitted as a generic container. Fail-closed:
            # a boundary whose primary_sgs_bem is None (lingua_franca could
            # not recognise it at all — source_convention is also None in
            # this case) or whose primary_is_slot_map_hit is False is
            # UNCHANGED by this branch and falls through to the existing
            # hard halt below, exactly as before Tier 0.
            if (
                not _cv2_eligible
                and boundary.get("primary_sgs_bem")
                and boundary.get("primary_is_slot_map_hit")
            ):
                _cv2_eligible = True
                _cv2_eligible_via_lingua_franca = True
                _emit(
                    _trace_for(run_dir),
                    stage="stage_4_lingua_franca_gate",
                    boundary_id=boundary_id,
                    source_convention=boundary.get("source_convention"),
                    primary_sgs_bem=boundary.get("primary_sgs_bem"),
                    class_signature=_class_sig,
                    reason="Tier 0 — non-canonical class_signature let through via primary_sgs_bem",
                )

            # sc_var Tier (2026-09-14, "connect the pieces" follow-up) — same shape as
            # Tier 0 above, for a Claude Design boundary that has NO class_signature at
            # all (zero classes, so Tier 0's lingua_franca path can never fire either).
            # Piece 1's sc_var_hint (plugins/sgs-blocks/scripts/recogniser/
            # sc_var_classifier.py) is the only identity signal available. Opt-in via
            # --sc-var-min-confidence (None = disabled, today's behaviour unchanged) --
            # Piece 1's hints are deliberately capped low-confidence and were never meant
            # to auto-admit a boundary on their own; this flag makes that policy decision
            # explicit and visible per-run rather than silently baked in here.
            _cv2_eligible_via_sc_var = False
            _sc_var_min_conf = getattr(args, "sc_var_min_confidence", None)
            # See the matching Stage 2 note on source="sc_var_count" -- tried excluding it
            # here too during live debugging, reverted: eligibility alone (no HTML class
            # injection, see below) is safe for every sc_var_hint source, verified live.
            _boundary_sc_var_hint = boundary.get("sc_var_hint")
            if (
                not _cv2_eligible
                and _sc_var_min_conf is not None
                and _boundary_sc_var_hint
                and _boundary_sc_var_hint.get("block")
                and _boundary_sc_var_hint.get("confidence", 0) >= _sc_var_min_conf
            ):
                _cv2_eligible = True
                _cv2_eligible_via_sc_var = True
                _emit(
                    _trace_for(run_dir),
                    stage="stage_4_sc_var_gate",
                    boundary_id=boundary_id,
                    sc_var_hint=_boundary_sc_var_hint,
                    sc_var_min_confidence=_sc_var_min_conf,
                    class_signature=_class_sig,
                    reason="sc_var Tier — classless Claude Design boundary let through via sc_var_hint",
                )

            # dom_shape Tier (2026-09-14, "the 20 real gaps" follow-up) — same shape as
            # the sc_var Tier above, one rung lower: fires only when neither Tier 0 nor
            # the sc_var Tier already admitted this boundary. Q1 Tier 2's
            # dom_shape_classifier.py infers purely from DOM shape (repeated siblings,
            # heading position, tag identity) — no class, no sc-for var name needed.
            # Same rule as the sc_var Tier's own hard-learned lesson (2026-09-14
            # regression, see the class-injection removal note above): eligibility
            # ONLY, NEVER an injected HTML class. The regression there was caused by
            # injecting a synthesized group-shape name ("card-grid") onto a small/atomic
            # element expecting composite child content it didn't have — dom_shape_hint
            # carries the identical risk (its own "card-grid" fallback is a GROUP shape,
            # not a per-item identity), so this gate copies the fix, not the mistake.
            _cv2_eligible_via_dom_shape = False
            _dom_shape_min_conf = getattr(args, "dom_shape_min_confidence", None)
            _boundary_dom_shape_hint = boundary.get("dom_shape_hint")
            if (
                not _cv2_eligible
                and _dom_shape_min_conf is not None
                and _boundary_dom_shape_hint
                and _boundary_dom_shape_hint.get("block")
                and _boundary_dom_shape_hint.get("confidence", 0) >= _dom_shape_min_conf
            ):
                _cv2_eligible = True
                _cv2_eligible_via_dom_shape = True
                _emit(
                    _trace_for(run_dir),
                    stage="stage_4_dom_shape_gate",
                    boundary_id=boundary_id,
                    dom_shape_hint=_boundary_dom_shape_hint,
                    dom_shape_min_confidence=_dom_shape_min_conf,
                    class_signature=_class_sig,
                    reason="dom_shape Tier — classless boundary with no sc_var signal let through via dom_shape_hint",
                )

            # Screen tier (screen route): a classless TOP-LEVEL section on the screen this run clones is
            # admitted as the plain container (Spec 31 FR-31-4 default). Eligibility only, like the
            # tiers above: no class is injected. Fires only for a multi-screen draft (screen_role is set
            # by orchestrator/screen_route.py) and never for an "item" boundary, so a static draft's
            # path is exactly what it was.
            _cv2_eligible_via_screen = False
            if (
                not _cv2_eligible
                and boundary.get("screen_role") == "default"
                and boundary.get("boundary_kind", "container") == "container"
                and not (boundary.get("class_signature") or [])
            ):
                _cv2_eligible = True
                _cv2_eligible_via_screen = True
                _emit(
                    _trace_for(run_dir),
                    stage="stage_4_screen_gate",
                    boundary_id=boundary_id,
                    screen=boundary.get("screen"),
                    readme_section=boundary.get("readme_section"),
                    reason="screen Tier — classless top-level section on the cloned screen admitted as the container default",
                )

        # Spec 44 §4.4 — classless repeated-group recognition, BEFORE convert_section.
        #
        # Fires only when --classless-match is set AND the boundary is a GENUINELY
        # classless repeated group: no class_signature at all (so Tier 0's lingua_franca
        # path can never fire either), no slot-map hit, and a real repeated sibling group
        # inside it. When Stage A or Stage B matches, this result is used INSTEAD of
        # convert_section for that boundary (§4.4) — either as an auto-completed emission
        # or as a review-queue entry; recognise_section()/build_block_markup()/walk.py are
        # never invoked for it. When NEITHER stage matches, nothing changes: the boundary
        # continues down exactly the path it takes today, which is what keeps §8's "the
        # existing dom_shape / sc_var eligibility gates — unchanged" true rather than
        # merely asserted.
        if _classless_enabled and not (boundary.get("class_signature") or []) \
                and not boundary.get("primary_is_slot_map_hit"):
            try:
                if _classless_soup is None:
                    from bs4 import BeautifulSoup as _CL_BS4
                    _cl_tagged = run_dir / "tagged-mockup.html"
                    _cl_src = _cl_tagged if _cl_tagged.exists() else args.mockup
                    _classless_soup = _CL_BS4(_cl_src.read_text(encoding="utf-8"), "html.parser")
                # A classless boundary is resolvable ONLY by the Stage-1 tag: neither id
                # nor class ever matches one uniquely, and a bare tag lookup returns the
                # FIRST element of that tag regardless of which boundary is wanted (the
                # real bug documented at the cv2 element resolution below).
                _cl_el = _classless_soup.find(attrs={"data-sgs-boundary-id": boundary_id})
                # D1108: representative_item() answers "does this CONTAINER hold a
                # repeated group -- give me one item", via a sibling-detector fallback
                # on the node's own children. A boundary tagged "item" (from
                # detect_sc_for_item_boundaries()) is ALREADY one resolved sc-for
                # iteration, not a container -- calling representative_item() on it
                # re-runs sibling-detection on the item's OWN fields and can
                # false-positive them as a repeated group (proven: a number-badge +
                # title + body card scored as one group, discarding title+body).
                # Use the element directly for "item"; only "container" (or a
                # boundary_kind-less older voter.json, defaulted safely) goes through
                # representative_item() as before.
                if boundary.get("boundary_kind") == "item":
                    _cl_item = _cl_el
                else:
                    _cl_item = (_classless_adapter.representative_item(_cl_el)
                                if _cl_el is not None else None)
            except Exception as _exc:  # noqa: BLE001
                _cl_el = _cl_item = None
                aggregate_warnings.append(
                    f"{boundary_id}: classless pre-check soft-failed ({_exc}); "
                    "boundary left on its existing path"
                )
            if _cl_item is not None:
                _cl_parent = getattr(_cl_el, "parent", None)
                _cl_siblings = ([c for c in _cl_parent.find_all(True, recursive=False)]
                                if _cl_parent is not None else [])
                try:
                    _cl_decision = _classless_gate.recognise_classless_group(
                        _classless_adapter.build_stage_a_group(
                            _cl_el, _cl_item, _cl_siblings, label=boundary_id),
                        _classless_adapter.build_stage_b_group(_cl_item, label=boundary_id),
                        client_slug=getattr(args, "client", "") or "",
                        precedent=_classless_precedent,
                        auto_complete_enabled=bool(
                            getattr(args, "classless_auto_complete", False)),
                        boundary_id=boundary_id,
                        run_id=run_dir.name,
                    )
                    _classless_decisions.append(_cl_decision)
                    _classless_gate.append_decision(_cl_decision)
                except Exception as _exc:  # noqa: BLE001
                    _cl_decision = None
                    aggregate_warnings.append(
                        f"{boundary_id}: classless recognition soft-failed ({_exc}); "
                        "boundary left on its existing path"
                    )
                if _cl_decision is not None and _cl_decision.outcome != "no-match":
                    _emit(
                        _trace_for(run_dir),
                        stage="stage_4_classless_recognition",
                        boundary_id=boundary_id,
                        classless_stage=_cl_decision.stage,
                        block=_cl_decision.block,
                        match_quality=_cl_decision.match_quality,
                        outcome=_cl_decision.outcome,
                        clause_a=_cl_decision.clause_a,
                        clause_b=_cl_decision.clause_b,
                        reason="Spec 44 FR-44-1",
                    )
                    _cl_auto = _cl_decision.auto_completed
                    if _cl_auto and _cl_decision.block_markup:
                        aggregate_markup_parts.append(_cl_decision.block_markup)
                    else:
                        # 'unmatched-*' so Stage 9's existing unmatched_sections filter
                        # picks it up — the REAL review surface, not a second queue.
                        aggregate_warnings.append(
                            f"{boundary_id}: classless group recognised as "
                            f"{_cl_decision.block} but did not clear FR-44-1 — "
                            "operator review required"
                        )
                    per_section_results.append({
                        "boundary_id": boundary_id,
                        "section_id": m.get("section_id"),
                        "selector": section_selector,
                        "block_name": _cl_decision.block or target_block,
                        "status": "complete" if _cl_auto else "unmatched-classless-review",
                        "failure_reason": "" if _cl_auto else "; ".join(_cl_decision.reasons),
                        "extract_path": "",
                        "extracted_attributes": {},
                        "block_markup": _cl_decision.block_markup,
                        "token_resolutions": [],
                        "new_tokens_written": [],
                        "supports_decisions": [],
                        "supports_emitted_attributes": {},
                        "supports_omitted_attributes": {},
                        "modifier_signals": {},
                        "class_signature": [],
                        "classless_stage": _cl_decision.stage,
                        "classless_outcome": _cl_decision.outcome,
                    })
                    continue

        # Unmatched section: confidence == 0.0 means no block / pattern / scaffold
        # matched the candidate slug. Per the 2026-05-14 retirement of
        # composer_fallback, the right response is to SURFACE the gap to the
        # operator -- not emit best-effort atomic markup that hides the catalogue
        # gap behind plausible-looking output.
        #
        # The autonomy chain (stage_9b) is the proper recovery path: it scaffolds
        # a v0.1.0-scaffold block which the matcher's Tier 3 then catches at
        # confidence 0.5 on the next run, giving the operator a one-step
        # promotion path. composer_fallback short-circuited that loop by
        # producing wrong markup that passed downstream schema checks but failed
        # visual parity, masking the catalogue gap.
        #
        # No block_markup is emitted for an unmatched section. The visual-parity
        # gate at Stage 8 will halt the autonomy_gate (a section-shaped hole in
        # the rendered page is impossible to miss). Stage 9 reports unmatched
        # sections in operator-review.html + the unmatched_sections list.
        #
        # Spec 16 Phase 7 — cv2-eligible boundaries skip this gate. The
        # converter handles unmatched section wrappers by emitting
        # sgs/container with className so the variation CSS binds. Surfacing
        # them as "unmatched" would mask successful converter output.
        #
        # Q1A fix 2026-05-23: sentinel is now SOLELY confidence == 0.0. The
        # previous check also tested `target_block == "core/group"` but that
        # coupled the sentinel to the fallback block name string, which broke
        # when the fallback was renamed to sgs/container (per Decision 3). The
        # confidence value is the canonical "no match" signal; the block name is
        # just what gets emitted when cv2 handles the section.
        if m.get("confidence", 0) == 0 and not _cv2_eligible:
            _emit(_trace_for(run_dir), stage="stage_4_unmatched_section",
                  boundary_id=boundary_id, section_id=m.get("section_id"),
                  selector=section_selector, target_block=target_block,
                  confidence=m.get("confidence", 0),
                  class_signature=boundary.get("class_signature", []),
                  reason="no block / pattern / scaffold matched candidate slug")
            aggregate_warnings.append(
                f"{boundary_id}: unmatched section -- operator review required "
                f"(selector={section_selector}, candidate={target_block})"
            )
            per_section_results.append({
                "boundary_id": boundary_id,
                "section_id": m.get("section_id"),
                "selector": section_selector,
                "block_name": target_block,
                "status": "unmatched",
                "extract_path": "",
                "extracted_attributes": {},
                "block_markup": "",
                "token_resolutions": [],
                "new_tokens_written": [],
                "supports_decisions": [],
                "supports_emitted_attributes": {},
                "supports_omitted_attributes": {},
                "modifier_signals": {},
                "class_signature": boundary.get("class_signature", []),
            })
            continue

        # Phase 7 Step 2.3 — Spec 16 converter_v2 branch.
        # _cv2_eligible was computed once at the top of the loop; reuse it.
        # When eligible, delegate to the slot-aware converter rather than the
        # legacy extract.py subprocess (which the 2026-05-15 closure-gate work
        # found to be unreliable across section shapes).
        if _cv2_eligible:
            _class_sig = boundary.get("class_signature") or []
            try:
                # Import the production converter's Stage-4 entry point. The
                # orchestrator runs from REPO root, so the package path is
                # discoverable via importlib if sys.path includes
                # ORCHESTRATOR_DIR's parent. converter.entry is the canonical
                # Stage-4 entry implementation (moved there EXECUTION Step 10,
                # 2026-07-04); the frozen orchestrator.converter_v2 package it
                # used to fall back to was deleted at EXECUTION Step 16
                # (2026-07-05) — converter.entry now runs the modular engine
                # unconditionally, no flag, no fallback.
                _conv_pkg_dir = ORCHESTRATOR_DIR.parent  # .../scripts/
                if str(_conv_pkg_dir) not in sys.path:
                    sys.path.insert(0, str(_conv_pkg_dir))
                from converter.entry import convert_section as _conv_section
                # Read section HTML from the mockup (same source as legacy extract.py).
                # The boundary selector identifies which top-level element to extract.
                from bs4 import BeautifulSoup as _BS4
                # 2026-09-14, "connect the pieces" follow-up — prefer the tagged copy
                # Stage 1 wrote (see stage_1_boundary's --tagged-mockup-out call) when
                # it exists. It's byte-identical to args.mockup except for one added
                # data-sgs-boundary-id attribute per boundary, so using it for CSS
                # lift too is safe and avoids maintaining two separate parses.
                _tagged_mockup_path = run_dir / "tagged-mockup.html"
                _mockup_source_path = _tagged_mockup_path if _tagged_mockup_path.exists() else args.mockup
                _mockup_html = _mockup_source_path.read_text(encoding="utf-8")
                _soup = _BS4(_mockup_html, "html.parser")
                # Extract inline CSS for variation-CSS lifting.
                _style_blocks = [t.get_text() for t in _soup.find_all("style")]
                _section_css = "\n\n".join(_style_blocks)
                # G2 — Merge generated variation CSS into _section_css so cv2's
                # _collect_css_decls_for_element can see the scoped rules emitted
                # by css_router (D2 destination). Without this, cv2 only ever
                # sees the mockup's inline <style> rules; the page-id-scoped
                # rules in pipeline-state/<run>/variation-d0-d2.css are invisible
                # to the consumer. Companion to the strip in convert.py
                # _collect_css_decls_for_element. See specs/16 §14.2 +
                # specs/common-wp-styling-errors §U. Captured 2026-05-20
                # honest-path council; producer-side fix 2026-05-21.
                # Q3 fix 2026-05-23: reads from run_dir/variation-d0-d2.css
                # (relocated from theme/sgs-theme/styles/<client>.css).
                _variation_css_path = _client_variation_css_path(args.client, run_dir)
                if _variation_css_path.exists():
                    try:
                        _variation_css = _variation_css_path.read_text(encoding="utf-8")
                        if _variation_css.strip():
                            _section_css = (
                                _section_css
                                + "\n\n/* variation CSS (G2 merge) */\n"
                                + _variation_css
                            )
                    except OSError as _exc:  # noqa: BLE001
                        aggregate_warnings.append(
                            f"{boundary_id}: variation CSS read soft-failed ({_exc})"
                        )
                # Find the section element matching the boundary selector.
                # Prefer the tagged data-sgs-boundary-id (unambiguous by construction --
                # see write_tagged_mockup); then ID-based lookup; then class-based CSS
                # selector. Real bug this ordering fixes: for a classless boundary,
                # neither id nor class ever matched uniquely -- id fell back to a
                # SYNTHETIC label ("section-2") that is never a real DOM attribute, and
                # a bare tag+class lookup with no class returns BS4's FIRST match of
                # that tag regardless of which boundary is being looked up. Every
                # classless boundary beyond the first of its tag silently re-resolved
                # to the WRONG element's content -- not merely "extracts nothing".
                _sec_el = None
                if _tagged_mockup_path.exists():
                    _sec_el = _soup.find(attrs={"data-sgs-boundary-id": boundary_id})
                    if _sec_el is not None:
                        del _sec_el["data-sgs-boundary-id"]  # pipeline bookkeeping, not real draft markup
                _sec_id = boundary.get("section_id") or ""
                if _sec_el is None and _sec_id:
                    _sec_el = _soup.find(id=_sec_id)
                if _sec_el is None and section_selector:
                    # Strip the leading tag name if present (e.g. "section.sgs-hero" → "sgs-hero")
                    _sel_parts = section_selector.split(".", 1)
                    _tag = _sel_parts[0] if len(_sel_parts) > 1 else None
                    _cls = _sel_parts[1] if len(_sel_parts) > 1 else _sel_parts[0]
                    _sec_el = _soup.find(_tag, class_=_cls.split(".")[0]) if _tag else _soup.find(class_=_cls.split(".")[0])
                # Tier 0 (D1034) — a boundary let through via primary_sgs_bem
                # needs the converted BEM class actually PRESENT on the root
                # element's `class` attribute in the HTML converter.entry
                # parses. converter.recognition.recognise_section() re-derives
                # block identity straight from the BS4 node's own class
                # attribute (never from voter.json / boundary dict) — without
                # this injection the walker would see only the ORIGINAL
                # non-BEM class, find no `sgs-` root class, and the section
                # would still fail (now as a loud converter 'failed', not the
                # halt this tier exists to get past). APPEND, never replace:
                # the original classes must survive so variation-CSS
                # selector matching (which keys off the source class names)
                # still finds this element.
                if _cv2_eligible_via_lingua_franca and _sec_el is not None:
                    _existing_classes = _sec_el.get("class") or []
                    _primary_bem_cls = boundary.get("primary_sgs_bem")
                    if _primary_bem_cls and _primary_bem_cls not in _existing_classes:
                        _sec_el["class"] = _existing_classes + [_primary_bem_cls]
                # sc_var Tier — deliberately NO class injection here, unlike Tier 0 above.
                # Tried live (2026-09-14) and reverted: injecting "sgs-<slug>" from
                # sc_var_hint onto a classless boundary's root element forces the
                # converter's recognise_section() to treat that element as a full instance
                # of a COMPOSITE block (info-box, card-grid, ...), which expects real child
                # content to recurse into. Claude Design's sc-for items are frequently
                # small/atomic (a single <button>, <label>, <span>) -- verified live: doing
                # this collapsed 17 real conversions (all genuinely correct `sgs/button`
                # emissions, produced by the converter's OWN internal atomic-tag
                # recognition once merely LET THROUGH the eligibility gate, no injection
                # needed) down to 0, all failing ContentConservationError ("recursed to N
                # results with ZERO content blocks"). The eligibility gate alone is the
                # right amount of intervention -- it lets the converter's own recognition
                # run; forcing a specific composite identity on top of it is not.
                _section_html = str(_sec_el) if _sec_el is not None else ""
                # Build media map dict from file if provided.
                _media_map_obj: dict = {}
                if args.media_map and args.media_map.exists():
                    import json as _json
                    _media_map_obj = _json.loads(args.media_map.read_text(encoding="utf-8"))
                # Per-section debug trace (Phase 9 pre-work Step 1) — emits
                # walker_branch_taken / attr_skipped / db_lookup_miss into
                # pipeline-state/<run>/convert-trace-<boundary>.jsonl when the
                # operator passes --debug-trace. No-op otherwise.
                _cv2_trace = None
                if getattr(args, "debug_trace", False):
                    try:
                        if _trace_mod is None:
                            _trace_mod = _load_module_from_path("sgs_trace", TRACE_SCRIPT)
                        _cv2_trace = _trace_mod.Trace.for_boundary(run_dir, boundary_id)
                    except Exception:  # noqa: BLE001
                        _cv2_trace = None
                    # Step 2 — expected-rules baseline. Writes alongside the
                    # trace so /systematic-debugging can diff expected vs seen.
                    try:
                        _exp_rules_mod = _load_module_from_path(
                            "sgs_expected_rules", ORCHESTRATOR_DIR / "expected_rules.py")
                        _exp_rules_mod.write_baseline(
                            _section_html, _section_css, run_dir, boundary_id,
                        )
                    except Exception as _exc:  # noqa: BLE001
                        # Baseline failure must not break the converter run.
                        aggregate_warnings.append(
                            f"{boundary_id}: expected-rules baseline soft-failed ({_exc})"
                        )
                result = _conv_section(
                    html=_section_html,
                    css=_section_css,
                    media_map=_media_map_obj,
                    client_slug=getattr(args, "client", "") or "",
                    repo_root=REPO,
                    trace=_cv2_trace,
                    boundary_id=boundary_id,
                    # Pass Stage-3 section_id so the universal className
                    # guarantee step can inject sgs-{section_id} onto the
                    # root block even when the HTML class attribute doesn't
                    # match (e.g. pattern:brand sections, external scrapes).
                    section_id=m.get("section_id") or "",
                    # Per-device values from the draft script's own width rules
                    # (Stage -1.4, script_bindings_stage.py). None = drop-and-gap.
                    tier_bindings=getattr(args, "_tier_bindings", None) or None,
                )
                if result.get("status") == "failed":
                    # Rule-4 loud path (post-programme QC fix, 2026-07-05):
                    # converter/entry.py returns status:'failed' + failure_reason
                    # (its loud contract, Step 16) — the orchestrator must not
                    # degrade that back into a silent drop. Record an ERROR (the
                    # Stage-4 artefact goes 'failed') and keep the section in
                    # per_section_results with status 'failed' so the Stage-9
                    # operator queue surfaces it. The page is emitted without
                    # the section, but never silently.
                    _failure_reason = result.get("failure_reason", "unspecified")
                    aggregate_errors.append(
                        f"{boundary_id}: converter returned status 'failed' "
                        f"({_failure_reason}); section absent from emitted markup"
                    )
                    _emit(
                        _trace_for(run_dir),
                        stage="stage_4_converter_failed",
                        boundary_id=boundary_id,
                        section_selector=section_selector,
                        failure_reason=_failure_reason,
                    )
                    per_section_results.append({
                        "boundary_id": boundary_id,
                        "section_id": m.get("section_id"),
                        "selector": section_selector,
                        "block_name": result.get("block_name", target_block),
                        "status": "failed",
                        "failure_reason": _failure_reason,
                        "extract_path": "",
                        "extracted_attributes": {},
                        "block_markup": "",
                        "token_resolutions": [],
                        "new_tokens_written": [],
                        "supports_decisions": [],
                        "supports_emitted_attributes": {},
                        "supports_omitted_attributes": {},
                        "modifier_signals": {},
                        "class_signature": _class_sig,
                        "converter_v2": True,
                        # Content-gap observability channel (2026-07-31) — whatever
                        # the content pass recorded before this failure fired.
                        "content_gaps": result.get("content_gaps", []),
                        # Admission-path observability (2026-09-14) — true when this boundary
                        # was admitted to conversion purely via sc_var_hint gate, with no
                        # genuine Tier-0 slot-map match. Appears on both successful and
                        # failed converter_v2 results so operator review can distinguish
                        # confident BEM-based matches from lower-confidence schema-variant hints.
                        "admitted_via_sc_var_gate": _cv2_eligible_via_sc_var,
                        "admitted_via_dom_shape_gate": _cv2_eligible_via_dom_shape,
                        "admitted_via_screen_gate": _cv2_eligible_via_screen,
                    })
                    continue
                # Normalise to orchestrator per_section_results schema.
                _cv2_markup = result.get("block_markup", "")
                _cv2_extracted_attrs = result.get("extracted_attributes", {})

                # sc_var responsive bridge (D1061 follow-up, 2026-09-15) — this
                # boundary's correlated classless-draft measurements (if any),
                # resolved against the RESOLVED block's real block_attributes
                # DB rows and merged in. A changed property with no matching
                # attr is dropped and reported (aggregate_warnings), never
                # guessed — mirrors the correlator's own strict-match rule.
                for _corr_rec in _sc_var_responsive_by_boundary.get(boundary_id, []):
                    from converter.services.sc_var_responsive_bridge import bridge_record as _bridge_record
                    _bridge_writes, _bridge_gaps = _bridge_record(_corr_rec)
                    if _bridge_writes:
                        _cv2_extracted_attrs = {**_cv2_extracted_attrs, **_bridge_writes}
                        _cv2_markup = _patch_block_comment_attrs(_cv2_markup, _bridge_writes)
                    for _gap in _bridge_gaps:
                        aggregate_warnings.append(
                            f"{boundary_id}: sc_var responsive bridge gap "
                            f"({_gap.get('reason')}, css_property={_gap.get('css_property')})"
                        )
                # Stage 4.5 — harvest token resolutions from the cv2 walker.
                # The converter snapped colour/spacing/font-size values during
                # _lift_root_supports_to_style / _lift_core_block_style and
                # accumulated them in convert._TOKEN_RESOLUTIONS, which
                # __init__._convert_section_body flushed into result["token_resolutions"].
                _cv2_token_res = result.get("token_resolutions", [])
                # Reflect any newly-minted tokens into the in-memory theme_json
                # so the next section's resolver sees them as snappable targets.
                _new_tokens: list[dict] = []
                for _tr in _cv2_token_res:
                    # A snapped result has token_slug + css_var set; is_gap_candidate=False.
                    if (
                        _tr.get("token_slug")
                        and _tr.get("css_var")
                        and not _tr.get("is_gap_candidate")
                        and _tr.get("role")
                    ):
                        # Only reflect if NOT already in the registry (resolver
                        # may have snapped to an existing token — no-op then).
                        # _reflect_new_token_in_theme_json is idempotent on the slug.
                        try:
                            _reflect_new_token_in_theme_json(
                                theme_json,
                                _tr["role"],
                                _tr["token_slug"],
                                _tr.get("raw_value", ""),
                            )
                            _new_tokens.append(_tr)
                        except Exception:  # noqa: BLE001
                            pass
                per_section_results.append({
                    "boundary_id": boundary_id,
                    "section_id": m.get("section_id"),
                    "selector": section_selector,
                    "block_name": result.get("block_name", target_block),
                    "status": result.get("status", "complete"),
                    "extract_path": "",
                    "extracted_attributes": _cv2_extracted_attrs,
                    "block_markup": _cv2_markup,
                    "token_resolutions": _cv2_token_res,
                    "new_tokens_written": _new_tokens,
                    "supports_decisions": [],
                    "supports_emitted_attributes": _cv2_extracted_attrs,
                    "supports_omitted_attributes": {},
                    "modifier_signals": {},
                    "variation_css": result.get("variation_css", ""),
                    "attribute_gap_candidates": result.get("attribute_gap_candidates", []),
                    # Content-gap observability channel (2026-07-31) — mirrors
                    # attribute_gap_candidates above but for the CONTENT side:
                    # dropped ContentGaps + fuzzy/alias-fallback resolutions from
                    # converter.services.content_gap_collector. See
                    # _harvest_content_gaps() + the Stage 9 content-gaps.json
                    # write-out (armed the pre-existing but previously-dormant F5
                    # ledger.content_gap_check gate — content-gaps.json was never
                    # written by anything before this).
                    "content_gaps": result.get("content_gaps", []),
                    "class_signature": _class_sig,
                    "converter_v2": True,
                    # Admission-path observability (2026-09-14) — true when this boundary
                    # was admitted to conversion purely via sc_var_hint gate, with no
                    # genuine Tier-0 slot-map match. Used for operator review to
                    # distinguish confident BEM-based matches from lower-confidence
                    # schema-variant hinting.
                    "admitted_via_sc_var_gate": _cv2_eligible_via_sc_var,
                    "admitted_via_dom_shape_gate": _cv2_eligible_via_dom_shape,
                    "admitted_via_screen_gate": _cv2_eligible_via_screen,
                })
                if _cv2_markup:
                    aggregate_markup_parts.append(_cv2_markup)
                # Aggregate converter_v2 extracted attrs into the combined dict so
                # Stage 9 leftover-bucket-router credits them correctly. Prefixed
                # by section_id to avoid key collisions across sections (same
                # pattern as the legacy path at the bottom of the loop).
                _cv2_attrs = result.get("extracted_attributes", {})
                _cv2_section_id = m.get("section_id") or boundary_id
                for _k, _v in _cv2_attrs.items():
                    aggregate_attributes[f"{_cv2_section_id}.{_k}"] = _v
                _emit(
                    _trace_for(run_dir),
                    stage="stage_4_converter_v2",
                    boundary_id=boundary_id,
                    section_selector=section_selector,
                    target_block=target_block,
                    markup_lines=_cv2_markup.count("\n") + 1 if _cv2_markup else 0,
                    variation_css_rules=result.get("variation_css", "").count("\n") + 1 if result.get("variation_css") else 0,
                    extracted_attr_count=len(_cv2_attrs),
                )
                continue  # Skip Stages 4.5, 5, 7 — converter handled them inline.
            except Exception as _exc:  # noqa: BLE001
                # Converter_v2 soft-fail. Per Bean 2026-05-15: legacy extract.py
                # was found to be unreliable across section shapes, so we do
                # NOT fall through to it. Instead surface as unmatched so the
                # operator-review queue catches it.
                aggregate_warnings.append(
                    f"{boundary_id}: converter_v2 soft-failed ({_exc}); marked unmatched (no legacy fallback)"
                )
                _emit(
                    _trace_for(run_dir),
                    stage="stage_4_converter_v2_softfail",
                    boundary_id=boundary_id,
                    exception_type=type(_exc).__name__,
                    exception_str=str(_exc),
                    fallback="unmatched_section",
                )
                per_section_results.append({
                    "boundary_id": boundary_id,
                    "section_id": m.get("section_id"),
                    "selector": section_selector,
                    "block_name": target_block,
                    "status": "unmatched-cv2-softfail",
                    "extract_path": "",
                    "extracted_attributes": {},
                    "block_markup": "",
                    "token_resolutions": [],
                    "new_tokens_written": [],
                    "supports_decisions": [],
                    "supports_emitted_attributes": {},
                    "supports_omitted_attributes": {},
                    "modifier_signals": {},
                    "class_signature": _class_sig,
                })
                continue

        # cv2 is the only supported converter path (Bean directive 2026-05-18).
        # Legacy tools/recogniser-v2/extract.py subprocess is permanently retired.
        # If we reach this point, _cv2_eligible is False — the boundary's
        # class_signature is not SGS-BEM canonical. Halt with a clear operator-
        # actionable message; collect ALL non-compliant boundaries in one pass
        # so the operator sees the complete picture without re-running.
        _non_bem_class_sig = boundary.get("class_signature") or []
        _non_bem_sig_str = " ".join(_non_bem_class_sig) if isinstance(_non_bem_class_sig, list) else str(_non_bem_class_sig)
        _non_bem_warning = (
            f"{boundary_id}: section class '{_non_bem_sig_str}' is not SGS-BEM compliant; "
            f"cv2 cannot process it. Re-author per Spec 13 §8.1 "
            f"(.sgs-<block>__<element>--<modifier>) or run /uimax-sgs-scrape-pattern "
            f"first to convert external classes."
        )
        aggregate_warnings.append(_non_bem_warning)
        _emit(
            _trace_for(run_dir),
            stage="stage_4_non_bem_halt",
            boundary_id=boundary_id,
            class_signature=_non_bem_class_sig,
            reason="non-bem-compliant",
        )
        per_section_results.append({
            "boundary_id": boundary_id,
            "section_id": m.get("section_id"),
            "selector": section_selector,
            "block_name": target_block,
            "status": "unmatched-non-bem-compliant",
            "extract_path": "",
            "extracted_attributes": {},
            "block_markup": "",
            "token_resolutions": [],
            "new_tokens_written": [],
            "supports_decisions": [],
            "supports_emitted_attributes": {},
            "supports_omitted_attributes": {},
            "modifier_signals": {},
            "class_signature": _non_bem_class_sig,
        })
        continue

    # Spec 44 §7 — hand the run's classless decisions to Stage 9 as a file rather than
    # through stage_9_report's signature. Stage 9 owns both consumers (the review page
    # and the end-of-run summary), and a sidecar keeps this stage's contract unchanged
    # for every other caller of it.
    if _classless_enabled and _classless_gate is not None:
        try:
            (run_dir / "classless-decisions.json").write_text(
                json.dumps(
                    {"decisions": _classless_gate.decisions_to_json(_classless_decisions)},
                    indent=2, ensure_ascii=False),
                encoding="utf-8",
            )
        except OSError as _exc:  # noqa: BLE001
            aggregate_warnings.append(f"classless-decisions.json write soft-failed ({_exc})")

    # Also write a single legacy extract-result.json so existing tooling
    # that expects one file still finds something.
    legacy_payload = {
        "attributes": aggregate_attributes,
        "markup": "\n\n".join(aggregate_markup_parts),
        "coverage": aggregate_coverage,
    }
    extract_out.write_text(json.dumps(legacy_payload, indent=2, ensure_ascii=False), encoding="utf-8")

    output = {
        "extract_result_path": str(extract_out),
        "extracted_attributes": aggregate_attributes,
        "block_markup": "\n\n".join(aggregate_markup_parts),
        "coverage": aggregate_coverage,
        "per_section_results": per_section_results,
    }
    status = "complete" if not aggregate_errors else "failed"
    write_artefact(run_dir, 4, "extract-harvest-classify-compose-serialise", status, output, started, aggregate_errors, aggregate_warnings)
    return output



# ---------------------------------------------------------------------------
# Stage 9b -- AUTONOMY CHAIN (Phase 5g.2)
#   For each unrecognised_section the voter pointed at an unregistered SGS
#   slug, route the boundary through bucket-c-classifier (role inference)
#   then atomic-block-scaffold to land starter files + DB rows. Closes the
#   "voter hallucinated, WP dropped the section" gap surfaced on Mama's
#   homepage 2026-05-13.
# ---------------------------------------------------------------------------

_SLUG_TOKEN_RE = re.compile(r"^[a-z][a-z0-9-]*$")
_RESERVED_SCAFFOLD_SLUGS = {"hero", "container", "form"}

# Chrome sections are template parts (header / footer / nav), not Gutenberg blocks.
# Spec 17 §S1-2 + blub.db row 274 (4th-occurrence rule).
# The regex matches the BEM root class or the slug component.
_CHROME_SLUG_RE = re.compile(r"^(header|footer|nav|site-header|site-footer|main-nav|mega-menu)$")
# Top-level HTML tags that signal chrome sections.
_CHROME_TAG_RE = re.compile(r"^<?(header|footer|nav)\b", re.IGNORECASE)


def _is_chrome_section(boundary: dict) -> bool:
    """Return True when the boundary is a template-part chrome section.

    Checks (in order):
      1. candidate_block_slug slug component matches a known chrome slug.
      2. selector starts with <header>, <footer>, or <nav> tag.
      3. class_signature root class matches a chrome BEM root.
      4. section_id matches a chrome slug.

    Universal (not client-specific): all four checks apply to any mockup.
    """
    candidate = boundary.get("candidate_block_slug") or ""
    if candidate.startswith("sgs/"):
        slug_part = candidate[len("sgs/"):]
        if _CHROME_SLUG_RE.match(slug_part):
            return True

    selector = boundary.get("selector") or ""
    if _CHROME_TAG_RE.match(selector.lstrip()):
        return True

    class_sig = boundary.get("class_signature") or []
    for cls in class_sig:
        root_part = cls.split("__")[0].split("--")[0]
        if _CHROME_SLUG_RE.match(root_part.replace("sgs-", "")):
            return True

    section_id = boundary.get("section_id") or ""
    if _CHROME_SLUG_RE.match(section_id):
        return True

    return False


def _autonomy_boundary_index(boundary_output: dict) -> dict[str, dict]:
    return {b["boundary_id"]: b for b in boundary_output.get("boundaries", [])}


def stage_9b_autonomy_chain(boundary: dict, match: dict, buckets_output: dict,
                            run_dir: Path, run_id: str,
                            scaffold_new_blocks: bool, promote_new_blocks: bool) -> dict:
    """Scaffold (and optionally promote) new SGS blocks for unrecognised sections."""
    started = now_iso()
    errors: list[str] = []
    warnings: list[str] = []
    scaffolded: list[dict] = []
    seen_slugs: set[str] = set()

    if not scaffold_new_blocks:
        out = {"enabled": False, "scaffolded": [], "promoted_count": 0}
        write_artefact(run_dir, 91, "autonomy-chain", "complete", out, started, [], ["disabled by --no-scaffold-new-blocks"])
        return out

    boundary_index = _autonomy_boundary_index(boundary)
    leftover = (buckets_output or {}).get("leftover_buckets", {}) or {}
    unrec = leftover.get("unrecognised_section", []) or []

    # Source-side chrome-skip: header / footer / nav sections are template parts
    # (Spec 17 §S1-2, blub.db row 274). The autonomy chain MUST NOT scaffold them
    # as Gutenberg blocks. P2.0 PostToolUse hook is the tool-layer safety net;
    # this check is the source-level prevention (defence in depth).
    chrome_skipped: list[dict] = []

    # Build minimal elements for the classifier. We have no computed_styles
    # at stage 9 (extract was skipped for deferred fallbacks) so the classifier
    # returns winning_role=None and the scaffold falls back to text-content,
    # which is the documented safe scaffold (atomic-block-scaffold.py:188-191).
    elements: list[dict] = []
    boundary_for_item: list[dict] = []
    for item in unrec:
        bid = item.get("boundary_id")
        b = boundary_index.get(bid) or {}
        candidate_slug = b.get("candidate_block_slug") or ""
        if not candidate_slug or not candidate_slug.startswith("sgs/"):
            continue
        slug = candidate_slug[len("sgs/"):]

        # Chrome-skip check BEFORE slug validation — even a valid-looking
        # header slug must never reach the scaffolder.
        if _is_chrome_section(b):
            chrome_skipped.append({
                "boundary_id": bid,
                "candidate_block_slug": candidate_slug,
                "selector": b.get("selector", ""),
                "section_id": b.get("section_id", ""),
                "reason": "template-part chrome section — use theme/sgs-theme/parts/ instead of sgs-blocks/src/blocks/",
            })
            warnings.append(
                f"{bid}: chrome-skip — {candidate_slug} is a template-part section "
                f"(selector={b.get('selector', '')!r}); not scaffolded as a Gutenberg block"
            )
            continue

        if not _SLUG_TOKEN_RE.match(slug) or slug in _RESERVED_SCAFFOLD_SLUGS or slug in seen_slugs:
            continue
        seen_slugs.add(slug)
        elements.append({
            "selector": b.get("selector"),
            "computed_styles": {},  # not available at stage 9; classifier degrades gracefully
            "class_signature": b.get("class_signature", []),
        })
        boundary_for_item.append({"slug": slug, "candidate_block_slug": candidate_slug, "boundary": b})

    # Dispatch the classifier in-process (single sqlite read, fast).
    classifier_results: list[dict] = []
    if elements:
        try:
            cls_mod = _load_module_from_path("sgs_bucket_c_classifier", CLASSIFIER_SCRIPT)
            classifier_results = cls_mod.classify_batch(elements, db_path=SGS_FRAMEWORK_DB)
        except Exception as exc:  # noqa: BLE001
            warnings.append(f"bucket-c-classifier soft-failed: {exc}; falling back to text-content for all")
            classifier_results = [{"winning_role": None, "confidence": 0.0} for _ in elements]

    # Scaffold + optionally promote each.
    scaffold_mod = None
    try:
        scaffold_mod = _load_module_from_path("sgs_atomic_block_scaffold", SCAFFOLD_SCRIPT)
    except Exception as exc:  # noqa: BLE001
        errors.append(f"atomic-block-scaffold import failed: {exc}")

    promoted_count = 0
    if scaffold_mod is not None:
        for meta, cls_out in zip(boundary_for_item, classifier_results):
            slug = meta["slug"]
            role = cls_out.get("winning_role") or "text-content"
            try:
                manifest = scaffold_mod.scaffold(slug=slug, role=role, run_id=run_id)
            except scaffold_mod.ScaffoldError as exc:
                warnings.append(f"scaffold({slug}, {role}) skipped: {exc}")
                continue
            entry = {
                "candidate_block_slug": meta["candidate_block_slug"],
                "slug": slug,
                "role": role,
                "role_confidence": cls_out.get("confidence", 0.0),
                "staging_dir": manifest.get("staging_dir"),
                "files": manifest.get("files", []),
                "promoted": False,
                "quality_score": manifest.get("quality_score", 0),
                "quality_max": manifest.get("quality_max", 5),
                "quality_details": manifest.get("quality_details", {}),
            }
            if promote_new_blocks:
                try:
                    promoted = scaffold_mod.promote(manifest, db_path=SGS_FRAMEWORK_DB)
                    entry["promoted"] = True
                    entry["canonical_path"] = promoted.get("canonical_path")
                    entry["db_rows_inserted"] = promoted.get("db_rows_inserted", 0)
                    promoted_count += 1
                except scaffold_mod.ScaffoldError as exc:
                    warnings.append(f"promote({slug}) skipped: {exc}")
            scaffolded.append(entry)

    # Scaffold quality report: per-block score + aggregate pass rate.
    scaffold_quality_report: list[dict] = []
    for entry in scaffolded:
        scaffold_quality_report.append({
            "slug": entry.get("slug"),
            "score": entry.get("quality_score", 0),
            "max_score": entry.get("quality_max", 5),
            "details": entry.get("quality_details", {}),
        })
    all_pass = all(r["score"] == r["max_score"] for r in scaffold_quality_report) if scaffold_quality_report else True
    quality_summary = {
        "total_scaffolded": len(scaffolded),
        "all_5_of_5": all_pass,
        "per_block": scaffold_quality_report,
    }

    out = {
        "enabled": True,
        "promote_new_blocks": promote_new_blocks,
        "scaffolded": scaffolded,
        "scaffolded_count": len(scaffolded),
        "promoted_count": promoted_count,
        "candidates_seen": len(boundary_for_item),
        "chrome_skipped": chrome_skipped,
        "chrome_skipped_count": len(chrome_skipped),
        "scaffold_quality_report": quality_summary,
    }
    status = "complete" if not errors else "failed"
    write_artefact(run_dir, 91, "autonomy-chain", status, out, started, errors, warnings)
    return out


# ---------------------------------------------------------------------------
# Stage 9 -- REPORT (dispatcher: leftover-bucket-router + recognition_log + simple_html_review_report)
# ---------------------------------------------------------------------------

def insert_recognition_log(run_id: str, buckets_output: dict) -> tuple[int, list[str]]:
    """INSERT one row per leftover entry into uimax recognition_log table.

    Soft-fail: any DB error logs a warning and returns the count of rows
    actually inserted. recognition_log is a learning surface, not a runtime
    gate, so DB unavailability does not block a clone that otherwise succeeded.
    """
    warnings: list[str] = []
    if not UIMAX_DB.exists():
        warnings.append(f"uimax DB not found at {UIMAX_DB}; recognition_log INSERT skipped")
        return 0, warnings

    leftover_buckets = buckets_output.get("leftover_buckets", {})
    if not any(leftover_buckets.values()):
        return 0, warnings

    rows_inserted = 0
    try:
        con = sqlite3.connect(str(UIMAX_DB), timeout=10.0)
        cur = con.cursor()
        now = now_iso()
        for bucket_type, items in leftover_buckets.items():
            for item in items:
                rid = str(uuid.uuid4())
                selector = item.get("selector") or item.get("section_id") or item.get("slot") or ""
                surrounding = json.dumps(item, ensure_ascii=False)[:1000]
                severity = "low"
                if bucket_type in ("unrecognised_section", "structural_mismatch_or_orphan"):
                    severity = "medium"
                proposed_action = "review-and-confirm"
                if bucket_type == "extraction_failed":
                    proposed_action = "improve-extractor-or-fill-manually"
                elif bucket_type == "unrecognised_class":
                    proposed_action = "register-as-new-block-or-pattern"
                cur.execute(
                    """INSERT INTO recognition_log
                       (id, clone_run_id, bucket_type, selector, surrounding_dom,
                        frequency, severity, proposed_action, operator_decision,
                        operator_notes, new_pattern_id, created_at, decided_at)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (rid, run_id, bucket_type, str(selector)[:500], surrounding,
                     "1", severity, proposed_action, None, None, None, now, None),
                )
                rows_inserted += 1
        con.commit()
        con.close()
    except sqlite3.Error as exc:
        warnings.append(f"recognition_log INSERT soft-failed: {exc}")

    return rows_inserted, warnings


def stage_9_report(boundary: dict, match: dict, slot_list: dict, extract: dict, run_dir: Path,
                   scaffold_new_blocks: bool = True, promote_new_blocks: bool = True,
                   mockup_path: Path | None = None) -> dict:
    """Stage 9 -- route leftovers + INSERT recognition_log + render review HTML."""
    started = now_iso()
    errors: list[str] = []
    warnings: list[str] = []

    # 9a. Run leftover-bucket-router via subprocess (writes its own JSON).
    buckets_path = run_dir / "leftover-buckets.json"
    boundary_path = run_dir / "stage-1.json"
    match_path = run_dir / "stage-2.json"
    slot_list_path = run_dir / "stage-3.json"
    extract_path = run_dir / "stage-4.json"

    # Router consumes the *output* sub-dicts, so write standalone copies.
    boundary_copy = run_dir / "voter.json"  # already written by stage 1
    match_copy = run_dir / "match.json"
    slot_list_copy = run_dir / "slot-list.json"
    extract_copy = run_dir / "extract.json"
    match_copy.write_text(json.dumps(match, indent=2, ensure_ascii=False), encoding="utf-8")
    slot_list_copy.write_text(json.dumps(slot_list, indent=2, ensure_ascii=False), encoding="utf-8")
    extract_copy.write_text(json.dumps(extract, indent=2, ensure_ascii=False), encoding="utf-8")

    cmd_router = [
        sys.executable, str(ROUTER_SCRIPT),
        "--boundary", str(boundary_copy),
        "--match", str(match_copy),
        "--slot-list", str(slot_list_copy),
        "--extract", str(extract_copy),
        "--out", str(buckets_path),
    ]
    # Phase R8 wiring -- fold Stage -1's motion-library pre-flight findings
    # (sgs-clone-orchestrator.py::stage_neg1_motion_probe) into the same
    # leftover-buckets output, via the router's own --motion-signals arg.
    # Optional: the sidecar only exists on runs where Stage -1 wrote findings.
    motion_signals_path = run_dir / "stage--1-motion-signals.json"
    if motion_signals_path.exists():
        cmd_router += ["--motion-signals", str(motion_signals_path)]
    proc = subprocess.run(cmd_router, capture_output=True, text=True, encoding="utf-8")
    buckets_output: dict = {"leftover_buckets": {}, "totals": {}, "total_count": 0}
    if proc.returncode != 0:
        errors.append(f"leftover-bucket-router exited {proc.returncode}: {(proc.stderr or '')[:500]}")
    elif buckets_path.exists():
        buckets_output = json.loads(buckets_path.read_text(encoding="utf-8"))
    else:
        warnings.append("router completed without writing leftover-buckets.json")

    # 9b. INSERT into recognition_log (soft-fail).
    rows_inserted, log_warnings = insert_recognition_log(run_dir.name, buckets_output)
    warnings.extend(log_warnings)

    # 9b-autonomy. Scaffold (and optionally promote) new blocks for any
    # unrecognised_section the voter pointed at an unregistered slug. The
    # autonomy chain runs BEFORE the review HTML is rendered so freshly
    # promoted slugs are visible to downstream tooling.
    autonomy_out = stage_9b_autonomy_chain(
        boundary, match, buckets_output, run_dir, run_dir.name,
        scaffold_new_blocks=scaffold_new_blocks,
        promote_new_blocks=promote_new_blocks,
    )

    # 9c-attr-gap-writer (Phase 6 v2 Step 4f). Harvest every
    # is_gap_candidate=true token resolution from the per-section extract
    # results into uimax.attribute_gap_candidates so operators can review
    # them. Provenance is `sgs-clone:<run_id>` -- filterable per run. The
    # writer dedupes against (block_slug, selector, css_property) so repeat
    # clone runs over the same draft don't proliferate rows. Soft-fails so
    # a uimax DB hiccup never breaks the rest of Stage 9.
    attribute_gap_writer_result: dict = {"row_count": 0, "inserted": 0, "bumped": 0, "mode": "skipped"}
    try:
        gaps = _harvest_attribute_gap_candidates(extract)
        if gaps:
            agw = attribute_gap_writer()
            attribute_gap_writer_result = agw.stage(gaps, run_id=run_dir.name, write=True)
    except Exception as exc:  # noqa: BLE001 - gap writes are operator-review artefact; soft-fail
        warnings.append(f"attribute_gap_writer soft-failed: {exc}; gap candidates not persisted")
        attribute_gap_writer_result = {"row_count": 0, "inserted": 0, "bumped": 0, "mode": "errored", "error": str(exc)}

    # 9c2-content-gap-writer (2026-07-31 content-gap observability task).
    # Mirrors 9c-attr-gap-writer immediately above, but for the CONTENT side:
    # harvest every content_gaps entry (converter.services.content_gap_collector
    # — dropped ContentGaps + fuzzy/alias-fallback BEM resolutions) from the
    # per-section extract results and write content-gaps.json into THIS run's
    # directory, next to leftover-buckets.json / attribute_gap_candidates.
    # This is the missing writer for the pre-existing F5 ContentGap visibility
    # gate (ledger/content_gap_check.py + ledger/content_coverage_check.py) —
    # both gates ran in permanent fail-safe "file absent" green before this,
    # because nothing produced content-gaps.json. Soft-fails so a write hiccup
    # never breaks the rest of Stage 9.
    content_gaps_path = run_dir / "content-gaps.json"
    content_gap_writer_result: dict = {"gap_count": 0, "mode": "skipped"}
    try:
        content_gaps = _harvest_content_gaps(extract)
        content_gaps_path.write_text(
            json.dumps(content_gaps, indent=2, ensure_ascii=False), encoding="utf-8",
        )
        content_gap_writer_result = {
            "gap_count": len(content_gaps),
            "mode": "written",
            "path": str(content_gaps_path),
        }
    except Exception as exc:  # noqa: BLE001 - gap writes are operator-review artefact; soft-fail
        warnings.append(f"content_gap_writer soft-failed: {exc}; content gaps not persisted")
        content_gap_writer_result = {"gap_count": 0, "mode": "errored", "error": str(exc)}

    # 9d-functionality-gap-detector (Phase 6 v2 Step 4g). Walk the mockup
    # DOM under every matched section selector and emit a gap-candidate row
    # for any element carrying a behaviour-fingerprint attribute (data-action,
    # data-toggle, aria-expanded, etc.) or an inline on*-handler. The
    # detector module owns the scoring + INSERT logic; this orchestrator
    # call provides the BS4 glue. Soft-fails so the rest of Stage 9 still
    # completes when bs4 is unavailable or a selector misfires.
    functionality_gap_detector_result: dict = {"candidate_count": 0, "rows_written": 0, "mode": "skipped"}
    try:
        elements = _harvest_functionality_gap_elements(mockup_path, match) if mockup_path else []
        if elements:
            fgd = functionality_gap_detector()
            functionality_gap_detector_result = fgd.detect_batch(elements, run_id=run_dir.name, write=True)
    except Exception as exc:  # noqa: BLE001 - functionality gap detection is operator-review artefact; soft-fail
        warnings.append(f"functionality_gap_detector soft-failed: {exc}; behavioural gaps not persisted")
        functionality_gap_detector_result = {"candidate_count": 0, "rows_written": 0, "mode": "errored", "error": str(exc)}

    # 9e-gap-review-report (Phase 6 v2 Step 4h, path fix 2026-05-14 QC panel).
    # Render the operator-facing markdown gap-review.md combining the
    # leftover-bucket-router output (severity + gap_level enrichment for
    # every bucket). The module appends `sgs-clone/<run_id>/gap-review.md`
    # to out_dir internally. run_dir is `REPO/pipeline-state/<run_id>` (two
    # segments past REPO), so out_dir must be `run_dir.parent` (== REPO/
    # pipeline-state). The .parent.parent variant introduced in the initial
    # 4h wire-in resolved to REPO and wrote the report to <repo-root>/
    # sgs-clone/<run_id>/gap-review.md, polluting the working tree.
    gap_review_report_path: str | None = None
    try:
        grr = gap_review_report()
        out_root = run_dir.parent  # = REPO/pipeline-state
        written = grr.write_report(buckets_output, run_dir.name, out_dir=out_root)
        gap_review_report_path = str(written)
    except Exception as exc:  # noqa: BLE001 - report rendering is advisory; soft-fail
        warnings.append(f"gap_review_report soft-failed: {exc}; markdown report not written")

    # 9c. Render operator-review HTML via simple_html_review_report subprocess.
    review_html_path = run_dir / "operator-review.html"
    cmd_review = [
        sys.executable, str(REVIEW_SCRIPT),
        "--boundary", str(boundary_copy),
        "--match", str(match_copy),
        "--slot-list", str(slot_list_copy),
        "--extract", str(extract_copy),
        "--buckets", str(buckets_path),
        "--run-id", run_dir.name,
        "--out", str(review_html_path),
    ]
    # Spec 44 §7 — the classless queue renders onto THIS page, not a second one. The
    # flag is passed only when Stage 4 actually wrote the sidecar, so a run without
    # --classless-match renders the pre-Spec-44 page byte for byte.
    classless_path = run_dir / "classless-decisions.json"
    if classless_path.exists():
        cmd_review += ["--classless", str(classless_path)]
    proc_review = subprocess.run(cmd_review, capture_output=True, text=True, encoding="utf-8")
    if proc_review.returncode != 0:
        errors.append(f"simple_html_review_report exited {proc_review.returncode}: {(proc_review.stderr or '')[:500]}")

    # 9c2. Spec 44 §7 — the end-of-run summary, printed AND written. Both, because a
    # terminal-only summary dies with the scrollback and cannot be surfaced by a later
    # /handoff or session-start hook.
    classless_summary_path: str | None = None
    if classless_path.exists():
        try:
            if str(RECOGNISER_DIR) not in sys.path:
                sys.path.insert(0, str(RECOGNISER_DIR))
            import classless_trust_gate as _cl_gate
            _cl_rows = json.loads(classless_path.read_text(encoding="utf-8")).get("decisions", [])
            _cl_decisions = [
                _cl_gate.ClasslessDecision(
                    client_slug="", boundary_id=r.get("boundary_id", ""),
                    run_id=run_dir.name, stage=r.get("stage", "none"),
                    block=r.get("block"), match_type=r.get("match_type"),
                    match_quality=r.get("match_quality", "none"),
                    outcome=r.get("outcome", "no-match"),
                    clause_a=bool(r.get("clause_a")), clause_b=bool(r.get("clause_b")),
                    signal=r.get("signal", ""), reasons=tuple(r.get("reasons") or []),
                    fields=tuple(r.get("fields") or []),
                )
                for r in _cl_rows
            ]
            classless_summary_path = str(
                _cl_gate.write_classless_summary(run_dir, _cl_decisions))
            for _line in _cl_gate.summary_lines(_cl_decisions):
                print(_line)
        except Exception as exc:  # noqa: BLE001 - summary is an operator artefact; soft-fail
            warnings.append(f"classless summary soft-failed: {exc}")

    # 9d. Coverage roll-up.
    # Bug fix 2026-05-13: extract['extracted_attributes'] keys are namespaced
    # `<block-short>.<slot_name>` (e.g. hero.headline) but slot_list slots
    # are bare names (e.g. headline). Match by `<short>.<slot>` lookup.
    extracted_attrs = (extract or {}).get("extracted_attributes") or {}
    slot_lists = (slot_list or {}).get("slot_lists") or {}
    matches = (match or {}).get("matches") or []
    block_by_bid = {m.get("boundary_id"): m.get("block_name", "") for m in matches}
    coverage_by_boundary: dict[str, dict] = {}
    for boundary_id, scaffold in slot_lists.items():
        slots = scaffold.get("slots", [])
        block_name = block_by_bid.get(boundary_id, "")
        block_short = block_name.rsplit("/", 1)[-1] if block_name else ""
        prefix = f"{block_short}." if block_short else ""
        def _is_extracted(name: str) -> bool:
            return (name in extracted_attrs) or (f"{prefix}{name}" in extracted_attrs)
        open_slots = [s["slot_name"] for s in slots if not _is_extracted(s["slot_name"])]
        attrs_total = len(slots)
        attrs_extracted = attrs_total - len(open_slots) if attrs_total else 0
        pct = round((attrs_extracted / attrs_total * 100), 1) if attrs_total else 0.0
        coverage_by_boundary[boundary_id] = {
            "attrs_extracted": attrs_extracted,
            "attrs_total": attrs_total,
            "coverage_percent": pct,
            "open_slots": open_slots,
        }

    # Surface unmatched sections to the operator. Each is a section the matcher
    # could not route to a block / pattern / scaffold; with composer_fallback
    # retired (2026-05-14) these sections produce no markup and instead require
    # operator review -- either add a block, add a pattern, or promote a
    # scaffold from the autonomy chain.
    per_section_results = (extract or {}).get("per_section_results") or []
    unmatched_sections = [
        {
            "boundary_id": s.get("boundary_id"),
            "section_id": s.get("section_id"),
            "selector": s.get("selector"),
            "candidate_block": s.get("block_name"),
            "class_signature": s.get("class_signature", []),
            # A converter-failed section carries its reason to the operator
            # queue directly (no cross-referencing the Stage-4 artefact).
            "failure_reason": s.get("failure_reason", ""),
        }
        for s in per_section_results
        # Queue every section that produced no markup and needs operator review:
        # plain 'unmatched' (matcher), 'unmatched-*' (cv2 softfail / non-BEM halt
        # — their own comments always intended the queue to catch them), and
        # 'failed' (the converter's loud Rule-4 contract, 2026-07-05 QC fix).
        if str(s.get("status", "")).startswith("unmatched") or s.get("status") == "failed"
    ]

    output = {
        "coverage": coverage_by_boundary,
        "leftover_buckets": buckets_output.get("leftover_buckets", {}),
        "leftover_totals": buckets_output.get("totals", {}),
        "leftover_total_count": buckets_output.get("total_count", 0),
        # Stage-9 schema-contract fields (enforced by staged_merge / autonomy_gate):
        # mirror the bucket router's canonical keys so schema validation passes.
        # Kept ALONGSIDE the leftover_* aliases that the summary line + operator
        # tooling read. Drift between these two name sets caused the autonomy
        # rollback ("missing required top-level field: 'totals'/'gap_level_totals'/
        # 'total_count'") on 2026-06-07.
        "totals": buckets_output.get("totals", {}),
        "gap_level_totals": buckets_output.get(
            "gap_level_totals",
            {"attribute": 0, "functionality": 0, "convention": 0, "structural": 0},
        ),
        "total_count": buckets_output.get("total_count", 0),
        "recognition_log_rows_inserted": rows_inserted,
        "operator_review_html_path": str(review_html_path),
        "autonomy_chain": autonomy_out,
        "attribute_gap_writer": attribute_gap_writer_result,
        "content_gap_writer": content_gap_writer_result,
        "functionality_gap_detector": functionality_gap_detector_result,
        "gap_review_report_path": gap_review_report_path,
        "classless_summary_path": classless_summary_path,
        "unmatched_sections": unmatched_sections,
        "unmatched_section_count": len(unmatched_sections),
    }
    status = "complete" if not errors else "failed"
    write_artefact(run_dir, 9, "report", status, output, started, errors, warnings)
    return output


# ---------------------------------------------------------------------------
# Decision 6 helper — auto-derive --client from mockup path
# ---------------------------------------------------------------------------

def _derive_client_from_mockup_path(mockup_path: Path) -> "str | None":
    """Walk the resolved mockup path's parents looking for a sites/<client>/ ancestor.

    Returns the client slug (e.g. 'mamas-munches') when found, or None when the
    mockup does not live under a sites/ directory (e.g. absolute path outside repo,
    or a flat path with no sites/ component).

    Examples:
        sites/mamas-munches/mockups/homepage/index.html  -> 'mamas-munches'
        /abs/path/sites/indus-foods/mockups/page.html    -> 'indus-foods'
        /tmp/mockup.html                                 -> None
    """
    try:
        resolved = Path(mockup_path).resolve()
    except Exception:
        return None
    for parent in resolved.parents:
        if parent.parent.name == "sites":
            return parent.name
    return None


def _source_freshness_problem(snap: dict, draft_html: str, readme_text: "str | None") -> "str | None":
    """FR-33-12, source key: why a Claude Design draft's snapshot is stale, or None when it is fine.

    A Claude Design draft keeps its design in inline styles, its script and a README, none of which
    ``draft_css_sha256`` covers. For such a draft the snapshot must carry ``draft_source_sha256`` and
    it must equal the value freshly computed from the ORIGINAL draft (README beside it included).
    Any other draft returns None here, so a static draft's gate is exactly the CSS-hash check.
    """
    from shared_utils import draft_source_sha256

    current = draft_source_sha256(draft_html, readme_text)
    if current is None:
        return None
    recorded = (snap.get("_sgsExtractor") or {}).get("draft_source_sha256")
    if not recorded:
        return ("this is a Claude Design draft, but the snapshot carries no draft_source_sha256, so "
                "its inline styles, script and README are NOT verified against this draft.")
    if recorded != current:
        return (f"the draft's inline styles, script or README changed since the snapshot was "
                f"generated (embedded source sha256 {str(recorded)[:12]}... != current {current[:12]}...). "
                f"Re-run the extractor.")
    return None


def _freshness_gate(mockup_path: Path, client: "str | None", skip: bool) -> None:
    """FR-33-12 — fail-closed unless the CANONICAL theme snapshot the converter reads was
    generated by the Spec 33 extractor for THIS draft's CSS.

    The converter exact-hex-snaps a draft colour against ``settings.color.palette`` in
    ``sites/<client>/theme-snapshot.json`` (styling_helpers._load_theme_palette_map). If that
    snapshot is stale — generated from a different draft, hand-authored, or absent (the loader
    fails soft to {}) — the clone silently mis-paints. So we read the freshness key EMBEDDED in
    that exact file (``_sgsExtractor.draft_css_sha256``, written by the extractor) and require it
    to match the current draft, re-hashed via the SAME shared_utils helper the extractor used.
    Reading the embedded key (not a sibling record) is deliberate: it proves the file-that-is-USED
    is fresh, closing the gap where a sibling record could pass while the canonical file is stale.
    No client slug → no per-client snapshot dependency → the gate is moot (base theme only).
    """
    if skip:
        print("[freshness-gate] ⚠ SKIPPED via --skip-freshness-gate — this clone is NOT "
              "verified against a fresh extractor snapshot (FR-33-12). Use only for "
              "extract-only / diagnostic runs.")
        return
    if not client:
        print("[freshness-gate] no client slug — no per-client theme snapshot to verify (skipped).")
        return

    # shared_utils (scripts/, this file's own dir) is the SINGLE source of the CSS hash —
    # the extractor embeds with it, we re-check with it, so the two can never drift.
    _scripts_dir = str(Path(__file__).resolve().parent)
    if _scripts_dir not in sys.path:
        sys.path.insert(0, _scripts_dir)
    from shared_utils import draft_css_sha256  # noqa: E402

    snapshot_path = REPO / "sites" / client / "theme-snapshot.json"
    remediate = (
        f"Regenerate + deploy the client's snapshot from this draft:\n"
        f"    python plugins/sgs-blocks/scripts/theme-extractor/extract.py --client {client} "
        f"--draft {mockup_path} --merge-onto {snapshot_path} --out {snapshot_path}\n"
        f"Or pass --skip-freshness-gate for an extract-only / diagnostic run."
    )
    if not snapshot_path.exists():
        sys.exit(
            f"HALT (FR-33-12 freshness gate): {snapshot_path} does not exist. The converter has "
            f"no per-client palette to snap draft colours against.\n{remediate}"
        )
    try:
        snap = json.loads(snapshot_path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        sys.exit(f"HALT (FR-33-12 freshness gate): could not read {snapshot_path}: {exc}\n{remediate}")

    recorded = ((snap.get("_sgsExtractor") or {}).get("draft_css_sha256"))
    if not recorded:
        sys.exit(
            f"HALT (FR-33-12 freshness gate): {snapshot_path} carries no _sgsExtractor freshness "
            f"key — it was hand-authored or predates the extractor, so it is NOT verified against "
            f"this draft. Converting now risks a stale palette.\n{remediate}"
        )
    from shared_utils import is_part_draft  # noqa: E402

    if is_part_draft(snap, mockup_path):
        print(f"[freshness-gate] '{Path(mockup_path).name}' is not the source draft of client '{client}' "
              f"(that is '{snap['_sgsExtractor']['source_draft']}'): it inherits the saved snapshot, "
              "so the draft hash is not checked (FR-33-12).")
        return
    draft_html = Path(mockup_path).read_text(encoding="utf-8")
    current = draft_css_sha256(draft_html)
    if recorded != current:
        sys.exit(
            f"HALT (FR-33-12 freshness gate): the deployed theme snapshot for client '{client}' was "
            f"generated from a DIFFERENT draft (embedded css sha256 {str(recorded)[:12]}… ≠ current "
            f"{current[:12]}…). Converting now would snap colours against a stale palette and "
            f"silently mis-paint.\n{remediate}"
        )
    from shared_utils import read_readme_text  # noqa: E402

    source_problem = _source_freshness_problem(snap, draft_html, read_readme_text(Path(mockup_path).parent))
    if source_problem:
        sys.exit(f"HALT (FR-33-12 freshness gate): {source_problem}\n{remediate}")
    print(f"[freshness-gate] ✓ deployed theme snapshot fresh for client '{client}' "
          f"(draft css sha256 {current[:12]}…).")


# ---------------------------------------------------------------------------
# Driver
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="sgs-clone orchestrator (Phase 7 rewire)")
    parser.add_argument("--mockup", type=Path, required=True)
    parser.add_argument("--section", type=str, default=None, help="CSS selector for a single section")
    parser.add_argument("--auto-section", action="store_true", help="Auto-detect all top-level sections (Phase 8 forward)")
    parser.add_argument("--block", type=str, default=None, help="(deprecated; ignored when voter present) target block slug")
    parser.add_argument(
        "--client", type=str, default=None,
        help="Client slug (e.g. mamas-munches). When omitted, auto-derived from the "
             "mockup path by walking up to find a sites/<client>/ parent directory. "
             "Stage 10 (style activation) fires only when the client slug is known.",
    )
    parser.add_argument("--page", type=str, required=True)
    parser.add_argument(
        "--source-url", type=str, default=None,
        help="Live source URL for Stage -1's Phase R8 motion-library pre-flight "
             "probe (Tier 4a-dynamic draw-call probe + Tier 4c screenshot capture). "
             "Omit to run Tier 4a-static only (DOM-signal detection against the "
             "already-downloaded mockup file) -- Tier 4a-dynamic/4c are then "
             "honestly skipped and recorded, never run against the static mockup.",
    )
    parser.add_argument("--media-map", type=Path, default=None)
    parser.add_argument("--viewport", type=int, default=1440)
    parser.add_argument("--no-playwright", action="store_true")
    parser.add_argument(
        "--mode",
        choices=("strict", "draft", "legacy"),
        default="strict",
        help="Stage 0.1/0.5 QA mode: strict halts on violations, draft warns, legacy bypasses",
    )
    parser.add_argument(
        "--no-scaffold-new-blocks", action="store_true",
        help="Skip stage 9b: do not scaffold new SGS blocks for unrecognised sections",
    )
    parser.add_argument(
        "--no-promote-new-blocks", action="store_true",
        help="Stage 9b scaffolds but does not promote into src/blocks/ (default is promote)",
    )
    parser.add_argument(
        "--skip-register", action="store_true",
        help="Skip the +REGISTER tail (do not write pattern PHP files or DB rows).",
    )
    parser.add_argument(
        "--skip-autonomy-gate", action="store_true",
        help="Skip orchestrator_main.run() autonomy chain (preflight + staged_merge + "
             "visual_qa + autonomy_decision + deliverable). Useful for diagnostic runs.",
    )
    parser.add_argument(
        "--skip-stage-gate", action="store_true",
        help="Skip the R-31-15 anti-mirror post-clone gate (pipeline-stage-gate.py). "
             "By default the gate runs on the converter output (extract.json) right "
             "after Stage 9 and HARD-HALTS the clone before deploy/register if a NEW "
             "mirror-cheat violation (draft-class container or bound sourceMode not in "
             "the baseline) is found. Use this flag only for diagnostic runs where you "
             "need to inspect the output without halting. (default: False — gate runs)",
    )
    parser.add_argument(
        "--skip-flat-tier-gate", action="store_true",
        help="Skip the Spec 35 / D554-C flat-to-object migration gate "
             "(check_flat_tier_regression.py, run inside pipeline-stage-gate.py "
             "alongside R-31-15). By default it runs on the converter output "
             "(extract.json) right after Stage 9 and HARD-HALTS the clone before "
             "deploy/register the moment a flat tier is emitted for a property "
             "already migrated to the object shape on the target block "
             "(decisions.md D554-C — no baseline, no shim, every violation blocks). "
             "Use this flag only for diagnostic runs where you need to inspect "
             "flat-tier output without halting; --skip-stage-gate also skips it "
             "(that flag skips the whole pipeline-stage-gate.py subprocess, "
             "including R-31-15). (default: False — gate runs)",
    )
    parser.add_argument(
        "--skip-attr-schema-gate", action="store_true",
        help="Skip the Task 3 / G2 attribute-schema conformance gate "
             "(check_attr_schema_conformance.py, run inside pipeline-stage-gate.py "
             "alongside R-31-15 and Spec 35/D554-C). By default it runs on the "
             "converter output (extract.json) right after Stage 9 and HARD-HALTS "
             "the clone before deploy/register the moment an emitted attribute is "
             "not declared on its target block, or an emitted value is outside a "
             "declared enum (Bean's 'fail closed on an undeclared shape' ruling — "
             "no baseline, every violation blocks). Use this flag only for "
             "diagnostic runs where you need to inspect the output without "
             "halting; --skip-stage-gate also skips it (that flag skips the whole "
             "pipeline-stage-gate.py subprocess). (default: False — gate runs)",
    )
    parser.add_argument(
        "--enforce-autonomy-gate", action="store_true",
        help="Force the autonomy gate ON even in --mode draft. By default draft runs "
             "(dev/verification) auto-skip the gate so the deploy stays inspectable; "
             "production runs (--mode strict) always enforce it. This flag re-enables "
             "the gate for a draft run when you specifically want the keep/rollback "
             "decision exercised.",
    )
    parser.add_argument(
        "--deploy-target", type=str, default=None,
        help="Per-page deploy target in shape 'page:<id>' or 'post:<id>'. When set, "
             "Stage 10 auto-runs upload_and_patch.py after pipeline completion — "
             "uploads referenced images to WP media library + patches the target "
             "page/post with the new block_markup. Omit for draft-only runs. "
             "Example: --deploy-target page:144",
    )
    parser.add_argument(
        "--push-theme-snapshot", action="store_true", default=False,
        help="After page patch, actually push the client's theme.json snapshot "
             "to the target site via push-theme-snapshot.py (Phase 5a Decision "
             "16'). Default OFF — Stage 10 runs a snapshot diff only (--no-push). "
             "Even with this flag set, push-theme-snapshot.py refuses to push to "
             "shared dev surfaces (sandybrown / palestine-lives) without an "
             "additional explicit confirmation.",
    )
    parser.add_argument(
        "--debug-trace", action=argparse.BooleanOptionalAction, default=True,
        help="Emit per-section convert-trace-<boundary>.jsonl files capturing "
             "walker_branch_taken, attr_skipped, and db_lookup_miss events. "
             "DEFAULT ON 2026-05-30 (Bean directive) so per-section evidence is "
             "always preserved for /qc-council + /systematic-debugging walkdowns. "
             "Adds ~5%% runtime overhead. Pass --no-debug-trace to opt out for "
             "production register-tail runs where runtime matters.",
    )
    parser.add_argument(
        "--converter-v2", action="store_true", default=True,
        help="Use Spec 16 converter_v2 (default: True — cv2 is the only supported "
             "converter path; legacy extract.py subprocess is disabled). Passing "
             "--converter-v2 explicitly is a no-op (idempotent). Non-SGS-BEM "
             "boundaries halt with a clear remediation message rather than "
             "falling through to the retired legacy extractor.",
    )
    parser.add_argument(
        "--no-computed-parity", action="store_true", default=False,
        help="Skip Stage 11.6 (computed-parity: universal draft-agnostic clone-vs-draft "
             "fidelity — every computed CSS property + content, matched by content, "
             "CLAUDE.md rule 4a). On by default after a successful deploy; this opts out "
             "(e.g. when 'node' is unavailable). (default: False — computed-parity runs)",
    )
    parser.add_argument(
        "--no-schema-validation", action="store_true", default=False,
        help="Skip Stage 6 block.json attribute schema validation. By default, the "
             "orchestrator halts with an actionable error if any block emits attributes "
             "that violate the block.json schema. Use this flag only for developer "
             "debugging when you need to inspect a broken payload without halting. "
             "(default: False — validation is required)",
    )
    parser.add_argument(
        "--skip-freshness-gate", action="store_true", default=False,
        help="Skip the FR-33-12 theme-snapshot freshness gate. By default the "
             "orchestrator HALTS if the client's theme snapshot was not generated by "
             "the Spec 33 extractor for the current draft's CSS — the converter snaps "
             "colours against that snapshot's palette, so a stale one silently mis-paints. "
             "Use this ONLY for extract-only / diagnostic runs. (default: False — gate runs)",
    )
    parser.add_argument(
        "--sc-var-min-confidence", type=float, default=None,
        help="Opt-in Tier for Claude Design (.dc.html) drafts: a boundary with no BEM "
             "class_signature at all normally hard-halts as 'unmatched-non-bem-compliant' "
             "(see stage_4_5_6_7_8_extract's D1034 Tier 0 gate). When set, a boundary "
             "carrying a Piece 1 sc_var_hint (plugins/sgs-blocks/scripts/recogniser/"
             "sc_var_classifier.py) with confidence >= this value is let through instead, "
             "mirroring the existing lingua_franca Tier 0 pattern. Omit for today's default "
             "behaviour (unchanged, zero risk to non-Claude-Design clones). A LOW value "
             "(e.g. 0.0) is a deliberate TESTING knob to prove the recognition path end to "
             "end -- Piece 1's hints are deliberately capped low-confidence "
             "(TIER2_MAX_CONFIDENCE=0.5) and were never meant to auto-assign a block on "
             "their own; production use of this flag is a separate, later policy decision.",
    )
    parser.add_argument(
        "--dom-shape-min-confidence", type=float, default=None,
        help="Opt-in Tier for a boundary with NO class_signature and NO usable sc_var_hint "
             "(e.g. a repeated sc-for item whose var NAME gives no signal either) -- the "
             "Q1 Tier 2 DOM-shape classifier (plugins/sgs-blocks/scripts/recogniser/"
             "dom_shape_classifier.py) already infers a block from sibling-repetition / "
             "heading-position / tag shape alone and is wired as an operator-review "
             "annotation today (dom_shape_hint on the boundary). When set, a boundary "
             "carrying a dom_shape_hint with confidence >= this value is let through the "
             "same way sc_var_min_confidence lets an sc_var_hint through -- same shape, "
             "same rule: eligibility ONLY, never an injected HTML class (the 2026-09-14 "
             "sc_var Tier 4 regression proved class injection from a repeat-cardinality "
             "guess corrupts unrelated small elements). Omit for today's default behaviour "
             "(unchanged, zero risk). A LOW value (e.g. 0.0) is a deliberate TESTING knob; "
             "production use is a separate, later policy decision -- same caveat as "
             "--sc-var-min-confidence.",
    )
    parser.add_argument(
        "--screen", default=None, metavar="LABEL",
        help="Multi-screen Claude Design draft: the screen (its data-screen-label) this run "
             "clones into the page. Default: the screen the README routes table sends to '/', "
             "cross-checked against the draft's own default marker. Ignored for a draft with "
             "fewer than two labelled screens.",
    )
    parser.add_argument(
        "--no-screen-route", action="store_true", default=False,
        help="Disable the screen route: convert every screen of a multi-screen draft, as before.",
    )
    parser.add_argument(
        "--classless-match", action="store_true", default=False,
        help="Opt-in Spec 44 Pass 1 (.claude/specs/44-CLASSLESS-REPEATER-RECOGNITION.md "
             "§9): before a boundary is handed to converter.entry.convert_section, a "
             "GENUINELY classless repeated group (no class_signature at all, no Tier-0 "
             "slot-map hit, and a real repeated sibling group inside it) is put through "
             "Stage A (recogniser/render_repeater_recogniser.py, structural match against "
             "block_render_repeaters) and then, if Stage A reached no known shape, Stage B "
             "(recogniser/array_schema_eliminator.py, DB-fact elimination against "
             "array_item_schema). A MATCH is recorded to the §7 audit log and routed to "
             "the existing operator-review surface; it does NOT auto-complete unless "
             "--classless-auto-complete is also set AND FR-44-1's gate passes. A NO-MATCH "
             "changes nothing — the boundary continues down exactly the path it takes "
             "today, so the existing dom_shape / sc_var gates are unaffected (§8). Omit "
             "for today's default behaviour (unchanged, zero risk to any existing client).",
    )
    parser.add_argument(
        "--classless-auto-complete", action="store_true", default=False,
        help="Opt-in FR-44-1 auto-completion, on top of --classless-match (no effect "
             "without it). When set, a classless group that clears BOTH trust clauses — "
             "(a) a parent-narrowed EXACT Stage A structural match against exactly one "
             "surviving candidate, and (b) a prior audit-log row for the SAME client and "
             "the same (block, match-type) pattern — emits the recognised composite "
             "instead of being converted. Spec 44 §9 keeps this off until at least one "
             "real client draft has run review-only and the review queue has been checked "
             "by hand; turning it off again is the rollback path, no code revert needed. "
             "A Stage B match NEVER auto-completes regardless of this flag (Stage B "
             "resolves field identity with no value attached — see classless_trust_gate's "
             "docstring). Production use is a separate, later policy decision — same "
             "caveat as --sc-var-min-confidence.",
    )
    parser.add_argument(
        "--no-script-bindings", action="store_true", default=False,
        help="Skip the script-bindings stage (plan step A1, D1132): by default the draft script's own "
             "width rules are evaluated for the three device tiers and given to the converter, so a style "
             "binding such as `padding: {{ secPad }}` becomes per-device block values instead of being "
             "dropped. Inert for a draft with no binding in a style value. This flag restores the old "
             "drop-and-gap behaviour for every binding.",
    )
    parser.add_argument(
        "--no-site-info-values", action="store_true", default=False,
        help="Skip the site-details stage (plan step A2a, D1134): by default the phone, review, social and map "
             "values the draft's script declares replace the bare `{{ name }}` bindings that carry them. This "
             "flag leaves those bindings as they were.",
    )
    parser.add_argument(
        "--resolve-js-content", action=argparse.BooleanOptionalAction, default=True,
        help="Spec 31 FR-31-26 (D1134 made it default-on): a <sc-for> whose item fields are bound to "
             "the loop variable (`{{ r.title }}`, `{{ r.body }}`) gets its content from a real "
             "headless-browser render of the draft, using the draft's own runtime "
             "(js_content_resolver.py -> resolve-js-content.js). Each captured field replaces its "
             "mustache in an expanded copy of the item; whatever cannot be captured is left as it was "
             "and listed in js-content-report.json. A draft with no <sc-for> is untouched and spawns "
             "no browser. Fail-soft. Use --no-resolve-js-content to switch it off.",
    )
    parser.add_argument(
        "--sc-var-cache", type=Path, default=None,
        help="Opt-in Tier B (2026-09-14, Bean-directed follow-up): the committed sc_var_hint "
             "cache sidecar path (plugins/sgs-blocks/scripts/recogniser/sc_var_classifier.py's "
             "load_cache/write_cache_entries format, e.g. sites/<client>/sc-var-hints.json). "
             "When set: (1) passed straight through to per-section-convention-voter.py's own "
             "--sc-var-cache, so Tier B classifications already committed to this file resolve "
             "immediately, no different from a Tier A hit; (2) after Stage 1, if any sc-for "
             "boundary is STILL unresolved (sc_var_classifier.unresolved_sc_for_names), the "
             "orchestrator writes a ready-to-answer batch prompt and HALTS the run rather than "
             "silently proceeding without those boundaries. The calling Claude Code session -- "
             "the same agent already driving this /sgs-clone invocation, not a separate API "
             "call or subagent -- reads that prompt directly and answers it inline (it is "
             "already a capable model; sc_var_haiku_batch.py's own docstring names exactly this "
             "as its intended responder), writes the answer via --apply-response, then re-runs "
             "this exact command; Tier A/B already-resolved items never re-prompt. Omit for "
             "today's default (Tier B fully skipped, zero behaviour change).",
    )
    parser.add_argument(
        "--sc-var-responsive-correlated", type=Path, default=None,
        help="Opt-in (D1061 follow-up, 2026-09-15): a "
             "recogniser/sc_var_responsive_correlator.py output JSON (its "
             "{'correlated': [...]} shape) for THIS draft. When set, each "
             "correlated record is resolved via converter/services/"
             "sc_var_responsive_bridge.py against the resolved block's real "
             "block_attributes DB rows and merged into that boundary's final "
             "emitted attrs -- e.g. a classless draft's measured responsive "
             "card padding (sgs/card-grid.cardPadding) lands as a real, "
             "editable, responsive attribute instead of being silently lost. "
             "A changed property with no matching attr is reported as a gap "
             "(never guessed), same discipline the correlator itself uses. "
             "Omit for today's default (unchanged, zero risk).",
    )
    args = parser.parse_args()

    # Verification-run ergonomics (2026-06-07): a draft run is a dev/verification
    # clone — the operator wants to SEE the output on the live page. The autonomy
    # gate defaults to rollback when it can't get a real visual-QA signal (stubbed
    # capture → decision=None), which silently reverts the deploy and makes the run
    # un-inspectable. So in --mode draft we auto-skip the gate unless the operator
    # explicitly re-enables it with --enforce-autonomy-gate. Production (--mode
    # strict) always enforces the gate — this only changes the dev/verification path.
    if args.mode == "draft" and not args.skip_autonomy_gate and not args.enforce_autonomy_gate:
        args.skip_autonomy_gate = True
        print("[orchestrator] --mode draft → autonomy gate auto-skipped "
              "(deploy stays inspectable; pass --enforce-autonomy-gate to override).")

    # Decision 6 (Phase 0): auto-derive --client from mockup path when not supplied.
    # Walks the resolved mockup path's parents looking for a sites/<client>/ ancestor.
    # e.g. sites/mamas-munches/mockups/homepage/index.html -> mamas-munches
    # Falls back to None (Stage 10 skipped) when no sites/ ancestor is found.
    if args.client is None:
        args.client = _derive_client_from_mockup_path(args.mockup)
        if args.client:
            print(f"[orchestrator] --client auto-derived from mockup path: {args.client}")
        else:
            print("[orchestrator] --client not supplied and could not be derived from mockup path — Stage 10 will be skipped")

    if not args.section and not args.auto_section:
        sys.exit("ERROR: provide --section <selector> or --auto-section")

    # FR-33-12 — the Spec 33 draft global-styles extractor is a HARD prerequisite of any
    # block clone: the converter snaps draft colours against the theme snapshot it
    # generates. Fail-closed here (before any pipeline work) if that snapshot is stale or
    # absent for the current draft. args.client is resolved just above.
    _freshness_gate(args.mockup, args.client, args.skip_freshness_gate)

    run_id = make_run_id(args.client, args.page)
    run_dir = REPO / "pipeline-state" / run_id
    run_dir.mkdir(parents=True, exist_ok=True)

    # Publish the run dir module-globally so the __main__ finally-block can
    # re-surface the per-severity logs after the LAST stage, on every exit path
    # (early return, sys.exit from the stage gate, or an exception). Without
    # this, summary.log is frozen at the stage-9c call site and can never
    # describe stages 10 / 11.6 / 4k, which run after it (R4, 2026-08-04).
    global _RUN_DIR
    _RUN_DIR = run_dir

    # Stage -2 -- dc-import resolution (D1106 follow-up, Bean-approved
    # 2026-09-18). A Claude Design draft that reuses a card/component across
    # multiple sections factors it out into its own `<name>.dc.html` file and
    # references it via `<dc-import name="X" prop="{{ expr }}">`. Splice the
    # referenced component's own markup in at each import site BEFORE any
    # stage (including the Stage 0 BEM/token lint) ever reads args.mockup —
    # every downstream stage then sees ordinary markup, no new recognition
    # logic needed. Reassigning args.mockup here is the single swap point
    # every later `args.mockup` read already relies on. A draft with no
    # `<dc-import>` tags is untouched (no file written, no reassignment).
    from converter.services.dc_import_resolver import resolve_dc_imports as _resolve_dc_imports
    # The draft's REAL folder, captured before Stage -2 reassigns args.mockup
    # into run_dir. Stage -1.5 needs it: the draft's own runtime (support.js,
    # image-slot.js, sibling .dc.html components) lives here, not in run_dir.
    _draft_dir = args.mockup.parent
    _draft_path = args.mockup  # ORIGINAL draft, before Stage -2 / -1.5 reassign args.mockup
    _dc_raw = args.mockup.read_text(encoding="utf-8")
    _draft_server = _load_module_from_path(
        "sgs_draft_server", ORCHESTRATOR_DIR / "draft_server.py"
    )
    _is_dsl_draft = _draft_server.is_dsl_draft(_dc_raw)
    _dc_resolved, _dc_count = _resolve_dc_imports(_dc_raw, args.mockup.parent)
    if _dc_count:
        _dc_resolved_path = run_dir / "dc-import-resolved.html"
        _dc_resolved_path.write_text(_dc_resolved, encoding="utf-8")
        args.mockup = _dc_resolved_path
        print(f"[orchestrator] dc-import: resolved {_dc_count} import(s) -> {_dc_resolved_path}")

    # Stage -1.5 -- JS-array-sourced content resolution (Spec 31 FR-31-26, design-gated with Bean
    # 2026-09-19; multi-field items and default-on in plan step A2b, D1134). Runs AFTER dc-import so a
    # JS-array-sourced group inside an imported component is covered too. Every `<sc-for>` whose fields
    # are bound to the loop variable is rendered by the draft's own runtime and expanded into real items;
    # anything it cannot capture stays as it was and is listed in js-content-report.json. Fail-soft: any
    # failure leaves args.mockup untouched. `--no-resolve-js-content` opts out. See js_content_resolver.py.
    if getattr(args, "resolve_js_content", True):
        _js_content_mod = _load_module_from_path(
            "sgs_js_content_resolver", ORCHESTRATOR_DIR / "js_content_resolver.py"
        )
        _resolve_js_content = _js_content_mod.resolve_js_array_content_with_report
        _js_raw = args.mockup.read_text(encoding="utf-8")
        _js_resolved, _js_count, _js_report = _resolve_js_content(_js_raw, _draft_dir)
        if _js_report["resolved"] or _js_report["gaps"] or _js_report["skipped"]:
            (run_dir / "js-content-report.json").write_text(
                json.dumps(_js_report, indent=1, ensure_ascii=False), encoding="utf-8")
            print(f"[orchestrator] js-content: expanded {_js_count} loop(s); {len(_js_report['gaps'])} field(s) "
                  f"left as they were; {len(_js_report['skipped'])} loop(s) skipped -> {run_dir / 'js-content-report.json'}")
        if _js_count:
            _js_resolved_path = run_dir / "js-content-resolved.html"
            _js_resolved_path.write_text(_js_resolved, encoding="utf-8")
            args.mockup = _js_resolved_path

    # Stage -1.45 -- SITE DETAILS (plan step A2a, D1134). The phone, review, social and map links the draft's
    # script declares replace the bare `{{ phone }}` / `{{ gmbHref }}` bindings that carry them, so they reach
    # the blocks as real values. Same reader as sync-business-info.py; inert (no file) for a draft without them.
    if not getattr(args, "no_site_info_values", False):
        try:
            _si_mod = _load_module_from_path("sgs_site_info_values", ORCHESTRATOR_DIR / "site_info_values.py")
            _si_html, _si_counts = _si_mod.resolve_site_info_bindings(args.mockup.read_text(encoding="utf-8"))
            if _si_counts:
                _si_path = run_dir / "site-info-resolved.html"
                _si_path.write_text(_si_html, encoding="utf-8")
                args.mockup = _si_path
                print(f"[orchestrator] site-info: replaced {sum(_si_counts.values())} binding(s) {dict(_si_counts)} -> {_si_path}")
        except Exception as _si_exc:  # noqa: BLE001 -- never a new failure mode: the bindings stay as they were
            print(f"[site-info] skipped ({_si_exc}); the bindings are left as they were")

    # Stage -1.4 -- SCRIPT BINDINGS (plan step A1, D1132). The draft script's own width rules, evaluated
    # for the three device tiers, become the per-device values of the style bindings the converter would
    # otherwise drop. Reads the run copy (after dc-import / js-content). Fail-soft, inert for a draft with
    # no binding in a style value (no file, empty map). See orchestrator/script_bindings_stage.py.
    args._tier_bindings = {}
    if not getattr(args, "no_script_bindings", False):
        try:
            _sb_stage = _load_module_from_path("sgs_script_bindings_stage", ORCHESTRATOR_DIR / "script_bindings_stage.py")
            args._tier_bindings = _sb_stage.build_run_map(args.mockup.read_text(encoding="utf-8"), run_dir)
        except Exception as _sb_exc:  # noqa: BLE001 -- never a new failure mode: fall back to drop-and-gap
            print(f"[script-bindings] skipped ({_sb_exc}); every style binding will be dropped and gapped as before")

    print(f"[orchestrator] run_id={run_id}")
    print(f"[orchestrator] run_dir={run_dir}")
    print(f"[orchestrator] mode={args.mode}")

    # seed_gap_context() is a documented no-op since EXECUTION Step 16
    # (2026-07-05) — the D3 attribute-gap-candidate accumulator it seeded
    # run_id provenance for had no live downstream reader (traced during the
    # Step-16 flip: the per-section attribute_gap_candidates field was written
    # into per_section_results but never read back by anything) and was
    # removed. Call kept for signature compatibility.
    try:
        from converter.entry import seed_gap_context as _seed_gap_context
        _seed_gap_context(run_id=run_id)
    except Exception:
        pass

    # Stage 0 -- THEME CACHE (Step 6a). Load theme.json + variation overlay once
    # per run. All downstream stages read from run_ctx["theme_json"] — single source
    # of truth. Mutations via _reflect_new_token_in_theme_json operate on the same
    # dict, so token discovery in section N is visible to section N+1.
    _theme_path = REPO / "theme" / "sgs-theme" / "theme.json"
    # Phase 5a (2026-05-22 Decision 19) — snapshot canonical path moved to
    # sites/<client>/theme-snapshot.json. _client_variation_path() falls back
    # to the legacy theme/sgs-theme/styles/<client>.json if the new location
    # is missing (transitional safety).
    _variation_path = _client_variation_path(args.client) or (REPO / "sites" / (args.client or "_none_") / "theme-snapshot.json")
    _theme_json: dict = {}
    if _theme_path.exists():
        try:
            _theme_json = json.loads(_theme_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            print(f"[stage-0] theme.json parse error: {exc}; token snap disabled", file=sys.stderr)
    if _variation_path.exists() and _theme_json:
        try:
            _variation = json.loads(_variation_path.read_text(encoding="utf-8"))
            for _cat in ("color", "spacing", "typography", "shadow"):
                _base_cat = _theme_json.setdefault("settings", {}).setdefault(_cat, {})
                _var_cat = (_variation.get("settings") or {}).get(_cat) or {}
                for _k, _v in _var_cat.items():
                    if isinstance(_v, list) and isinstance(_base_cat.get(_k), list):
                        _slug_to_var = {item.get("slug"): item for item in _v if isinstance(item, dict)}
                        _merged = [_slug_to_var.pop(it.get("slug"), it) for it in _base_cat[_k] if isinstance(it, dict)]
                        _merged.extend(_slug_to_var.values())
                        _base_cat[_k] = _merged
                    else:
                        _base_cat[_k] = _v
        except json.JSONDecodeError as exc:
            print(f"[stage-0] variation parse error: {exc}; using base theme only", file=sys.stderr)
    run_ctx: dict = {"theme_json": _theme_json}
    print(f"[stage-0] theme cache: {len(_theme_json.get('settings', {}).get('color', {}).get('palette', []))} palette tokens loaded")

    # Stage -1 -- Phase R8 motion-library pre-flight probe (D1021/D1022 first
    # real wiring into the pipeline). Runs BEFORE Stage 0 per the validated
    # design; soft-fails internally and never halts the clone.
    stage_neg1_motion_probe(args.mockup, args.source_url, run_dir)

    stage_0_1_bem_lint(args.mockup, args.mode, run_dir)
    stage_0_5_token_lint(args.mockup, args.mode, run_dir, client=args.client)
    # Derive page_id from --deploy-target page:<id> if available.
    _deploy_page_id: int | None = None
    _deploy_target = getattr(args, "deploy_target", "") or ""
    if _deploy_target.startswith("page:"):
        try:
            _deploy_page_id = int(_deploy_target.split(":", 1)[1])
        except ValueError:
            pass
    css_lift = stage_0_7_css_lift(
        args.mockup, args.client, run_dir,
        theme_json=_theme_json,
        page_id=_deploy_page_id,
    )
    _css_stats = css_lift.get("css_router_stats", {})
    _fallback = " [FALLBACK-VERBATIM]" if css_lift.get("fallback_mode") else ""
    print(
        f"[stage-0.7] css-lift{_fallback}: {css_lift.get('css_body_chars', 0)} chars "
        f"from {len(css_lift.get('sources', []))} source(s) -> {css_lift.get('output_path','')} "
        f"| D0={_css_stats.get('d0_count',0)} D1={_css_stats.get('d1_count',0)} "
        f"D2={_css_stats.get('d2_count',0)} D3={_css_stats.get('d3_count',0)} "
        f"total={_css_stats.get('total_rules',0)} chrome-skipped={_css_stats.get('chrome_skipped',0)}"
    )

    boundary = stage_1_boundary(
        args.mockup, args.section or "", args.auto_section, run_dir,
        sc_var_cache_path=args.sc_var_cache,
        draft_dir=_draft_path.parent,
        screen=getattr(args, "screen", None),
        screen_route=not getattr(args, "no_screen_route", False),
    )
    bcount = len(boundary.get("boundaries", []))
    primary_conv = (boundary.get("convention_summary") or {}).get("primary", "?")
    print(f"[stage-1] voter: {bcount} boundaries, primary convention={primary_conv}")

    match = stage_2_match(
        boundary,
        run_dir,
        sc_var_min_confidence=getattr(args, "sc_var_min_confidence", None),
        dom_shape_min_confidence=getattr(args, "dom_shape_min_confidence", None),
    )
    if match.get("matches"):
        top = match["matches"][0]
        print(f"[stage-2] confidence-matrix top: {top['block_name']} (conf={top['confidence']:.2f}) across {len(match['matches'])} sections")
    else:
        print("[stage-2] confidence-matrix produced no matches")

    slot_list = stage_3_slot_list(match, run_dir)
    slot_count = sum(len(v.get("slots", [])) for v in slot_list.get("slot_lists", {}).values())
    print(f"[stage-3] slot list: {slot_count} slots across {len(slot_list.get('slot_lists', {}))} sections")

    extract_out = stage_4_5_6_7_8_extract(args, match, run_dir, run_ctx)
    extracted_count = len(extract_out.get("extracted_attributes") or {})
    print(f"[stage-4-8] extract: {extracted_count} attrs extracted")

    report = stage_9_report(
        boundary, match, slot_list, extract_out, run_dir,
        scaffold_new_blocks=not args.no_scaffold_new_blocks,
        promote_new_blocks=not args.no_promote_new_blocks,
        mockup_path=args.mockup,
    )
    print(f"[stage-9] leftover entries: {report['leftover_total_count']} across {sum(1 for v in report['leftover_totals'].values() if v > 0)} buckets")
    print(f"[stage-9] recognition_log rows inserted: {report['recognition_log_rows_inserted']}")
    print(f"[stage-9] operator-review: {report['operator_review_html_path']}")
    _emit(_trace_for(run_dir), stage="stage_9_report",
          leftover_total_count=report.get("leftover_total_count"),
          leftover_totals=report.get("leftover_totals"),
          recognition_log_rows_inserted=report.get("recognition_log_rows_inserted"),
          operator_review_html_path=report.get("operator_review_html_path"))

    autonomy = report.get("autonomy_chain") or {}
    if autonomy.get("enabled"):
        print(f"[stage-9b] autonomy: {autonomy.get('scaffolded_count', 0)} scaffolded ({autonomy.get('promoted_count', 0)} promoted) from {autonomy.get('candidates_seen', 0)} candidates")
    _emit(_trace_for(run_dir), stage="stage_9b_autonomy_chain",
          enabled=bool(autonomy.get("enabled")),
          candidates_seen=autonomy.get("candidates_seen", 0),
          scaffolded_count=autonomy.get("scaffolded_count", 0),
          promoted_count=autonomy.get("promoted_count", 0))

    # ------------------------------------------------------------------
    # R-31-15 ANTI-MIRROR GATE (STOP-6 wire — 2026-06-21) + Spec 35/D554-C
    # FLAT-TIER-REGRESSION GATE (2026-08-10).
    # Stage 9 has just written extract.json. Run the post-clone structural
    # gates on the converter output NOW, before media-sideload / deploy /
    # +REGISTER, so a clone that introduced a NEW draft-class container, a
    # bound sourceMode (a "mirror cheat"), OR a flat tier for a property
    # already migrated to the object shape on the target block (D554-C)
    # halts before it can reach the live page. Both gates read extract.json
    # deterministically, so they run identically in every --mode (unlike
    # the autonomy gate, which needs a real visual-QA signal).
    # --skip-stage-gate opts out of BOTH gates (skips the whole
    # pipeline-stage-gate.py subprocess). --skip-flat-tier-gate opts out of
    # ONLY the D554-C gate, leaving R-31-15 enforced.
    # ------------------------------------------------------------------
    if args.skip_stage_gate:
        print("[stage-gate] skipped per --skip-stage-gate (both R-31-15 and Spec 35/D554-C gates)")
        _emit(_trace_for(run_dir), stage="stage_gate_anti_mirror",
              decision="skipped", reason="--skip-stage-gate")
    else:
        gate_cmd = [sys.executable, str(PIPELINE_STAGE_GATE_SCRIPT), str(run_dir)]
        if args.skip_flat_tier_gate:
            gate_cmd.append("--skip-flat-tier-gate")
            print("[stage-gate] Spec 35/D554-C flat-tier-regression gate skipped per --skip-flat-tier-gate")
        if args.skip_attr_schema_gate:
            gate_cmd.append("--skip-attr-schema-gate")
            print("[stage-gate] Task 3/G2 attr-schema-conformance gate skipped per --skip-attr-schema-gate")
        gate_proc = subprocess.run(gate_cmd)
        if gate_proc.returncode != 0:
            _emit(_trace_for(run_dir), stage="stage_gate_anti_mirror",
                  decision="halted", passed=False,
                  error="NEW mirror-cheat or flat-tier-regression violation in converter output",
                  returncode=gate_proc.returncode)
            _surface_logs(run_dir, "stage-9c")
            print(
                "[stage-gate] HALTED: pipeline-stage-gate.py found a violation in the "
                "converter output — either (a) the R-31-15 anti-mirror gate found a "
                "NEW mirror-cheat (a draft-class container or a bound sourceMode not "
                "in the baseline), (b) the Spec 35/D554-C gate found a flat tier "
                "emitted for a property already migrated to the object shape on the "
                "target block, or (c) the Task 3/G2 attr-schema-conformance gate "
                "found an attribute the target block does not declare, or an "
                "out-of-enum value for one it does. The clone was NOT deployed or "
                "registered. Scroll up for the specific gate's report. Fix (a) by "
                "converting the section to native block attributes instead of "
                "mirroring the draft wrapper, or regenerate the baseline with "
                "check_no_mirror.py --update-baseline if genuinely intended. Fix (b) "
                "by emitting the object shape for that property in the converter — "
                "there is no shim and no baseline for (b) by design (D554-C). Fix (c) "
                "by fixing the resolver that wrote the undeclared attribute/value — "
                "there is no baseline for (c) either.",
                file=sys.stderr,
            )
            sys.exit(gate_proc.returncode)
        print("[stage-gate] anti-mirror gate passed (no NEW violations).")
        _emit(_trace_for(run_dir), stage="stage_gate_anti_mirror",
              decision="passed", passed=True)

    # ------------------------------------------------------------------
    # Phase 6 v2 Step 4i — Apply-module surface (between Stage 7 compose
    # and Stage 8 autonomy-gate / deploy). All three apply modules are
    # operator-gated by FR21 contract; they stage + emit deploy commands
    # and NEVER auto-mutate live WordPress. We:
    #   1. Run media-sideload.sideload_batch.
    #      When --deploy-target is set: REAL upload mode — posts each
    #      image to the WP media library (idempotent; deduplicates by
    #      filename before uploading). Auth failure raises SideloadAuthError
    #      and is re-raised as a hard error — never silently falls back to
    #      dry-run leaving 404s in the page. Credentials are read from the
    #      per-client env file (sandybrown: .claude/secrets/sandybrown.env).
    #      When --deploy-target is not set: dry-run inventory only (no
    #      network calls) for operator review.
    #   2. Lazy-load attribute-staged-apply + functionality-bulk-apply
    #      so they're registered in sys.modules and reachable by
    #      post-clone operator scripts via the orchestrator's namespace.
    # Result lands on a stage_4i.json artefact at run_dir/.
    # ------------------------------------------------------------------

    # Determine whether this run is wired to a live deploy target. When it
    # is, promote stage-4i from inventory-only to REAL upload so the manifest
    # carries genuine attachment ids that stage-10 (upload_and_patch.py) can
    # consume. Credentials are read from the sandybrown env (the canonical
    # canary env) which is always available at .claude/secrets/sandybrown.env.
    _4i_do_upload: bool = bool(getattr(args, "deploy_target", None))
    _4i_env_path: Path = REPO / ".claude" / "secrets" / "sandybrown.env"

    stage_4i_summary: dict = {"media_sideload": None, "modules_loaded": []}
    # Load the module before the inner try block so SideloadAuthError is always
    # resolvable in the except clause (avoids NameError if msl were unbound).
    # Module load failure is still soft-fail — caught by the outer except.
    try:
        msl = media_sideload()
    except Exception as exc:  # noqa: BLE001
        print(f"[stage-4i] media-sideload load failed (soft-fail): {exc}", file=sys.stderr)
        stage_4i_summary["media_sideload"] = {"error": str(exc), "mode": "load-failed"}
        msl = None  # type: ignore[assignment]

    if msl is not None:
        try:
            sideload_report = msl.sideload_batch(
                extract_out,
                mockup_root=args.mockup.parent,
                upload=_4i_do_upload,
                env_path=_4i_env_path,
            )
            manifest_path = run_dir / "media-sideload-manifest.json"
            manifest_path.write_text(
                json.dumps(sideload_report, indent=2, ensure_ascii=False),
                encoding="utf-8",
            )
            uploaded_count = len(sideload_report.get("uploaded", []))
            reused_count = sum(
                1 for u in sideload_report.get("uploaded", []) if u.get("reused")
            )
            new_count = uploaded_count - reused_count
            stage_4i_summary["media_sideload"] = {
                "slots_found": sideload_report.get("slots_found", 0),
                "mode": sideload_report.get("mode", "dry-run"),
                "manifest_path": str(manifest_path),
                "uploaded": uploaded_count,
                "new_uploads": new_count,
                "reused": reused_count,
                "errors": len(sideload_report.get("errors", [])),
            }
            if _4i_do_upload:
                print(
                    f"[stage-4i] media-sideload: {sideload_report.get('slots_found', 0)} slot(s) "
                    f"processed — {new_count} new upload(s), {reused_count} reused, "
                    f"{len(sideload_report.get('errors', []))} error(s); manifest at {manifest_path}"
                )
            else:
                print(
                    f"[stage-4i] media-sideload: {sideload_report.get('slots_found', 0)} image slot(s) "
                    f"staged (dry-run, no --deploy-target); manifest at {manifest_path}"
                )
        except msl.SideloadAuthError as exc:
            # Auth failure is a hard error when in upload mode — never swallow it.
            # Re-raise so the caller sees an explicit message rather than a
            # mis-diagnosed "stage-4i soft-failed" with 404s left in the page.
            print(f"[stage-4i] media-sideload AUTH ERROR (hard-fail): {exc}", file=sys.stderr)
            stage_4i_summary["media_sideload"] = {"error": str(exc), "mode": "auth-error"}
            (run_dir / "stage-4i.json").write_text(
                json.dumps(stage_4i_summary, indent=2, ensure_ascii=False),
                encoding="utf-8",
            )
            raise RuntimeError(f"Stage 4i auth error — aborting pipeline: {exc}") from exc
        except Exception as exc:  # noqa: BLE001 - operator-review artefact; soft-fail
            print(f"[stage-4i] media-sideload soft-failed: {exc}", file=sys.stderr)
            stage_4i_summary["media_sideload"] = {"error": str(exc), "mode": "errored"}
    for loader_name, loader in (
        ("attribute_staged_apply", attribute_staged_apply),
        ("functionality_bulk_apply", functionality_bulk_apply),
    ):
        try:
            loader()
            stage_4i_summary["modules_loaded"].append(loader_name)
        except Exception as exc:  # noqa: BLE001 - load failure non-fatal
            print(f"[stage-4i] {loader_name} load soft-failed: {exc}", file=sys.stderr)
    (run_dir / "stage-4i.json").write_text(
        json.dumps(stage_4i_summary, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    _ms = stage_4i_summary.get("media_sideload") or {}
    _emit(_trace_for(run_dir), stage="stage_4i_media_sideload",
          mode=_ms.get("mode"),
          slots_found=_ms.get("slots_found"),
          new_uploads=_ms.get("new_uploads"),
          reused=_ms.get("reused"),
          modules_loaded=stage_4i_summary.get("modules_loaded", []),
          passed="error" not in _ms,
          **({"error": _ms["error"]} if "error" in _ms else {}))

    # ------------------------------------------------------------------
    # Phase 6 v2 Step 4j — wp_integration: validate aggregate block markup
    # via /wp-blocks CLI before the autonomy gate. route_native_feature +
    # build_deploy_command are operator-gated -- lazy-loader registration
    # makes them reachable from post-clone tooling. Soft-fails so a
    # missing CLI or malformed markup never blocks the autonomy decision.
    # Result lands at run_dir/stage-4j.json.
    # ------------------------------------------------------------------
    stage_4j_summary: dict = {"validate_block_markup": None, "modules_loaded": []}
    try:
        wpi = wp_integration()
        aggregate_markup = (extract_out or {}).get("block_markup") or ""
        if aggregate_markup.strip():
            try:
                validation = wpi.validate_block_markup(aggregate_markup)
                # wp-blocks CLI emits diagnostics as `issues` (not `errors`/`warnings`).
                # Read both shapes so a future CLI rename to `errors` stays compatible.
                # Without this fall-through, "invalid" was surfacing with empty errors --
                # silently dropping every "Unknown block" diagnostic. Caught 2026-05-14.
                stage_4j_summary["validate_block_markup"] = {
                    "status": validation.get("status"),
                    "errors": validation.get("issues") or validation.get("errors") or [],
                    "warnings": validation.get("warnings") or [],
                }
                status_str = validation.get("status", "unknown")
                print(f"[stage-4j] wp-blocks validate: {status_str}")
            except Exception as exc:  # noqa: BLE001 - CLI may be missing in dev; soft-fail
                stage_4j_summary["validate_block_markup"] = {"status": "skipped", "reason": str(exc)}
                print(f"[stage-4j] wp-blocks validate skipped: {exc}", file=sys.stderr)
        else:
            stage_4j_summary["validate_block_markup"] = {"status": "skipped", "reason": "empty aggregate markup"}
        stage_4j_summary["modules_loaded"] = ["wp_integration"]
    except Exception as exc:  # noqa: BLE001 - module load failure non-fatal
        print(f"[stage-4j] wp_integration load soft-failed: {exc}", file=sys.stderr)
        stage_4j_summary["validate_block_markup"] = {"status": "errored", "reason": str(exc)}
    (run_dir / "stage-4j.json").write_text(
        json.dumps(stage_4j_summary, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    _vb = stage_4j_summary.get("validate_block_markup") or {}
    # NB: field names here must NOT start with "error" — surface_pipeline_logs
    # ._classify() buckets an event as an ERROR on `any(k.startswith("error"))`,
    # so a plain `error_count=0` files a CLEAN validation as a pipeline error.
    # Caught on the first live run after instrumenting this stage (2026-08-04).
    _emit(_trace_for(run_dir), stage="stage_4j_wp_blocks_validate",
          validate_status=_vb.get("status"),
          invalid_count=len(_vb.get("errors") or []),
          warning_count=len(_vb.get("warnings") or []),
          passed=_vb.get("status") not in ("errored", "invalid"),
          **({"reason": _vb["reason"]} if "reason" in _vb else {}))

    # ------------------------------------------------------------------
    # Phase 6 Step 0 — compose with the Phase 5 module surface
    #
    # Up to this point we've run the legacy stage chain (writes
    # pipeline-state/<run_id>/stage-N.json artefacts in the original shape).
    # Now we:
    #   1. mirror the artefacts to the Phase 5 staged_output convention so
    #      staged_merge can find them
    #   2. build trivial pass-through StageHandlers
    #   3. call orchestrator_main.run() — preflight + staged_merge + visual_qa
    #      + autonomy_decision + sgs-update auto-invoke (on PASS) + deliverable
    #   4. run +REGISTER on success — write pattern PHP files + sgs-db rows
    #      + uimax rows for every novel pattern surfaced
    # ------------------------------------------------------------------
    # Surface per-severity pipeline logs from trace.jsonl (B1 fix, Spec 18).
    # MUST run BEFORE the --skip-autonomy-gate early return so summary.log
    # is written on every pipeline invocation (regardless of autonomy flag).
    # Caught 2026-05-19 by /qc-inline — original placement was AFTER the
    # early return so the surfacer never executed in dev mode.
    _surf = _surface_logs(run_dir, "stage-9c")
    _emit(_trace_for(run_dir), stage="stage_9c_surface_logs",
          counts=_surf.get("counts", {}),
          files_written=sorted((_surf.get("files_written") or {}).keys()),
          passed=_surf.get("status") == "ok")

    # Stage 10 — per-page deploy (upload images + patch target page) if requested.
    # Soft-fail: any deploy error logs to stderr but does NOT halt the pipeline.
    # Fires AFTER Stage 9c (sidecar logs already surfaced) and BEFORE the
    # --skip-autonomy-gate early return so the deploy lands even on dev runs
    # (the operator opted in via --deploy-target).
    if args.deploy_target:
        try:
            if ":" not in args.deploy_target:
                raise ValueError(f"--deploy-target must be 'page:<id>' or 'post:<id>', got {args.deploy_target!r}")
            target_kind, target_id_str = args.deploy_target.split(":", 1)
            target_id = int(target_id_str)
            if target_kind not in ("page", "post"):
                raise ValueError(f"--deploy-target kind must be 'page' or 'post', got {target_kind!r}")
            # subprocess is imported at module scope (line ~36); no local re-import
            # (a local `import subprocess` here would make the name function-local
            # for the whole of main() and shadow the module import upstream).
            _upload_script = Path(__file__).parent / "orchestrator" / "upload_and_patch.py"
            # Pass --client so Stage 10 diffs (or pushes, with --push-theme-snapshot)
            # the matching theme.json snapshot at sites/<client>/theme-snapshot.json
            # to the target site. Phase 5a (2026-05-22 Decision 16') replacement for
            # the deleted /wp-json/sgs/v1/active-variation REST endpoint and the
            # retired theme/sgs-theme/styles/<client>.json overlay system.
            #
            # --client is OPTIONAL and is OMITTED when unknown (2026-07-23). A mockup
            # outside sites/<client>/ (e.g. a tests/fixtures/ conformance or phase-f
            # fixture) leaves args.client None; appending None to the argv raised
            # TypeError inside subprocess.run, which the broad soft-fail below
            # swallowed as "deploy soft-failed" — so --deploy-target was a silent
            # no-op for EVERY non-client clone. upload_and_patch.py already treats
            # --client as optional ("No --client passed; skipping theme.json snapshot
            # push"), so omitting the flag is the correct universal behaviour, not a
            # fixture carve-out (R-31-9).
            _upload_cmd = [
                sys.executable, str(_upload_script), str(run_dir),
                "--target", target_kind, "--target-id", str(target_id),
            ]
            if args.client:
                _upload_cmd += ["--client", args.client]
            if args.push_theme_snapshot:
                _upload_cmd.append("--push-theme-snapshot")
            # The ORIGINAL draft, so the Spec 33 business-info sync finds a draft that
            # does not live under sites/<client>/mockups/ (e.g. a Claude Design handoff folder).
            if _draft_path.is_file():
                _upload_cmd += ["--draft", str(_draft_path)]
            result = subprocess.run(
                _upload_cmd,
                capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=180,
            )
            if result.returncode == 0:
                # Print only the final success line + the link, skip image-upload chatter
                tail_lines = [ln for ln in result.stdout.splitlines() if "modified" in ln or "link=" in ln]
                print(f"[stage-10] deploy: patched {target_kind} {target_id} — {tail_lines[-1] if tail_lines else 'OK'}")
            elif result.returncode == 3:
                # Exit code 3 = page-PATCH succeeded but variation activation
                # FAILED. The page now carries new block markup but renders
                # with default theme tokens. Surface as a named warning, not
                # generic deploy-failed (the deploy itself worked).
                variation_lines = [ln for ln in result.stdout.splitlines() if "variation" in ln.lower()]
                print(
                    f"[stage-10] deploy: patched {target_kind} {target_id} BUT variation activation FAILED — "
                    f"page renders with default theme tokens until resolved. "
                    f"Detail: {variation_lines[-1] if variation_lines else 'see stage-10 stdout'}",
                    file=sys.stderr,
                )
            elif result.returncode == 4:
                # Exit code 4 = target page does not exist on the WP install
                # (HTTP 404 from REST PATCH). Added 2026-05-23 to close
                # P-STAGE-10-DEPLOY-SILENT-PHANTOM-PAGE — prior to this fix,
                # the wrapper script swallowed 404s as exit-0 and the
                # orchestrator falsely reported "OK". Verified empirically
                # against sandybrown page 131 (deleted between 2026-05-20
                # and 2026-05-23) which would have shown as patched-OK.
                print(
                    f"[stage-10] deploy HALTED — {target_kind} {target_id} does not exist on the WP install "
                    f"(HTTP 404). Either the page was deleted, or the --deploy-target id is wrong. "
                    f"Detail (stderr): {result.stderr.strip()[:300]}",
                    file=sys.stderr,
                )
            elif result.returncode == 5:
                # Exit code 5 = WP REST returned a response with an id that
                # does NOT match the requested target id. Race / redirect /
                # upsert behaviour — halt rather than report wrong target.
                print(
                    f"[stage-10] deploy HALTED — WP REST returned a page with id != requested "
                    f"target id={target_id}. Detail: {result.stderr.strip()[:300]}",
                    file=sys.stderr,
                )
            elif result.returncode == 6:
                # Exit code 6 = HTTP 200 but response body lacks an id-bearing
                # JSON record. Could be HTML returned instead of JSON (auth
                # redirect, server error page rendered as 200). Halt + surface.
                print(
                    f"[stage-10] deploy HALTED — WP REST returned 200 but no recognisable "
                    f"id-bearing JSON record. Detail: {result.stderr.strip()[:300]}",
                    file=sys.stderr,
                )
            else:
                print(f"[stage-10] deploy soft-failed (exit {result.returncode}): {result.stderr[:200]}", file=sys.stderr)
            _emit(_trace_for(run_dir), stage="stage_10_deploy",
                  target_kind=target_kind, target_id=target_id,
                  returncode=result.returncode,
                  passed=result.returncode == 0,
                  **({"error": result.stderr.strip()[:300]} if result.returncode != 0 else {}))
        except Exception as exc:  # noqa: BLE001 — Stage 10 is opt-in observability; soft-fail
            print(f"[stage-10] deploy soft-failed: {exc}", file=sys.stderr)
            _emit(_trace_for(run_dir), stage="stage_10_deploy",
                  passed=False, error=str(exc),
                  deploy_target=args.deploy_target)

    # ------------------------------------------------------------------
    # Stage 11 (pixel-diff) and Stage 11.5 (parity2) REMOVED 2026-07-04.
    # Both had the same structural blind spot (Spec 20 problem statement):
    # pixel-diff scored an EMPTY section as a false WIN (matches background)
    # and a REFLOWED-to-correct section as a false LOSS; parity2 keyed
    # elements by BEM class, comparing the draft's raw section against the
    # clone's block WRAPPER and drowning real diffs in false positives.
    # Stage 11.6 (computed-parity, below) is now the sole fidelity signal —
    # effective/computed values matched by CONTENT, per CLAUDE.md rule 4a.
    # ------------------------------------------------------------------

    # Stage 11.6 — computed-parity (UNIVERSAL, draft-agnostic; D259, CLAUDE.md rule 4a).
    # Compares the EFFECTIVE (computed) values on the LIVE clone vs the SOURCE draft
    # (whatever --mockup + --deploy-target this run used — NOT client-specific),
    # matched by CONTENT not class/declaration — the dependable fidelity signal
    # (STOP-42). Universal: every computed CSS property is captured (minus a
    # documented blocklist verified against property_suffixes), so any draft's CSS is
    # covered. Soft-fail observability — never blocks the RUN. It IS, however, the
    # gate on +REGISTER pattern auto-promotion (see below) — the old pixel-diff-based
    # gate (Stage 11 / visual_qa_capture live capture) is retired 2026-07-04.
    # -----------------------------------------------------------------------------
    computed_parity_overall_pct = None  # populated below when the tool runs successfully
    if not getattr(args, "no_computed_parity", False) and args.deploy_target \
            and 'result' in locals() and result.returncode == 0:
        try:
            import re as _re3
            _tail3 = [ln for ln in result.stdout.splitlines() if "link=" in ln]
            _lm3 = _re3.search(r"link=(https?://\S+)", _tail3[-1]) if _tail3 else None
            if not _lm3:
                print("[stage-11.6] computed-parity SKIPPED — no link= URL from Stage 10.", file=sys.stderr)
            else:
                cp_url = _lm3.group(1).rstrip(".,;")
                cp_tool = REPO / "plugins" / "sgs-blocks" / "scripts" / "parity" / "computed-parity.js"
                cp_out = run_dir / "computed-parity.json"
                if not cp_tool.exists():
                    print(f"[stage-11.6] computed-parity SKIPPED — tool not found at {cp_tool}.", file=sys.stderr)
                else:
                    # Agnostic: the SOURCE draft is this run's --mockup; the CLONE is the
                    # page Stage 10 just deployed. No --exclude (compares everything;
                    # the operator can pass --exclude to computed-parity.js for a draft
                    # whose sections are known-broken).
                    # A Claude Design (.dc.html) draft renders only through its own runtime, so
                    # score the ORIGINAL draft folder over a temporary HTTP server (D1116). The
                    # run-dir copy (args.mockup) has no support.js and is unrendered template.
                    # Static drafts keep the file path unchanged.
                    import contextlib as _ctx3
                    import urllib.parse as _up3
                    with _ctx3.ExitStack() as _cp_stack:
                        _cp_draft_arg = str(args.mockup.resolve())
                        if _is_dsl_draft:
                            _cp_base = _cp_stack.enter_context(_draft_server.serve_dir(_draft_dir))
                            _cp_draft_arg = f"{_cp_base}/{_up3.quote(_draft_path.name)}"
                        cp_proc = subprocess.run(
                            ["node", str(cp_tool),
                             "--draft", _cp_draft_arg,
                             "--clone", cp_url,
                             "--viewports", "375,768,1440",
                             "--out", str(cp_out)],
                            capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=420,
                        )
                    if not cp_out.exists():
                        print(f"[stage-11.6] computed-parity produced no report (node rc={cp_proc.returncode}). "
                              f"stderr: {(cp_proc.stderr or '')[-200:]}", file=sys.stderr)
                    else:
                        import json as _json3
                        _cp = _json3.loads(cp_out.read_text(encoding="utf-8"))
                        computed_parity_overall_pct = _cp.get("overall_css_pct")
                        print(f"[stage-11.6] computed-parity (draft={_draft_path.name}"
                              f"{' [served over http]' if _is_dsl_draft else ''} vs live clone) — "
                              f"OVERALL CSS {_cp.get('overall_css_pct')}% (universal, matched by content):")
                        for _vp, _v in _cp.get("viewports", {}).items():
                            _cc = (_v.get("content") or {})
                            _cs = (_v.get("css") or {})
                            _unm = len(_cs.get("unmatched_elements") or [])
                            print(f"[stage-11.6]   [{_vp}px] content {_cc.get('pct')}% | css {_cs.get('pct')}% "
                                  f"({_cs.get('match')}/{_cs.get('meaningful_props')} props, {_unm} draft els unmatched)")
                        print(f"[stage-11.6] computed-parity report → {cp_out}")
                        _emit(_trace_for(run_dir), stage="stage_11_6_computed_parity",
                              overall_css_pct=_cp.get("overall_css_pct"),
                              viewports={
                                  _vp: {
                                      "content_pct": (_v.get("content") or {}).get("pct"),
                                      "css_pct": (_v.get("css") or {}).get("pct"),
                                  }
                                  for _vp, _v in (_cp.get("viewports") or {}).items()
                              },
                              report_path=str(cp_out), passed=True)
        except FileNotFoundError:
            print("[stage-11.6] computed-parity SKIPPED — 'node' not on PATH.", file=sys.stderr)
            _emit(_trace_for(run_dir), stage="stage_11_6_computed_parity",
                  decision="skipped", reason="node not on PATH", passed=False)
        except Exception as exc:  # noqa: BLE001 — observability; soft-fail
            print(f"[stage-11.6] computed-parity soft-failed: {exc}", file=sys.stderr)
            _emit(_trace_for(run_dir), stage="stage_11_6_computed_parity",
                  passed=False, error=str(exc))

    if args.skip_autonomy_gate:
        print("[orchestrator] DONE (autonomy gate skipped per --skip-autonomy-gate).")
        _emit(_trace_for(run_dir), stage="orchestrator_done",
              decision="autonomy-gate-skipped", reason="--skip-autonomy-gate",
              last_stage_reached="stage_11_6_computed_parity")
        return

    om = _load_module_from_path(
        "sgs_orchestrator_main", ORCHESTRATOR_DIR / "orchestrator_main.py",
    )
    sm = _load_module_from_path(
        "sgs_staged_merge", ORCHESTRATOR_DIR / "staged_merge.py",
    )
    so = _load_module_from_path(
        "sgs_staged_output", ORCHESTRATOR_DIR / "staged_output.py",
    )
    vqa_capture = _load_module_from_path(
        "sgs_visual_qa_capture", ORCHESTRATOR_DIR / "visual_qa_capture.py",
    )
    reg_mod = _load_module_from_path(
        "sgs_register_patterns", ORCHESTRATOR_DIR / "register_patterns.py",
    )

    # 1. Mirror legacy artefacts to the Phase 5 staged_output convention so
    #    staged_merge.merge() can read them. Stage 5 schemas live alongside
    #    each module. Schema validation is enabled by default (require_schema=True)
    #    unless the operator passes --no-schema-validation for debugging.
    so_run_id = run_id
    so_run_dir = so.run_dir(so_run_id)
    so_run_dir.mkdir(parents=True, exist_ok=True)
    legacy_to_phase5 = {
        1: ("boundary", boundary),
        2: ("match", match),
        3: ("slot_list", slot_list),
        4: ("extract", extract_out),
        9: ("coverage", report),
    }
    for stage_n, (canonical_name, payload) in legacy_to_phase5.items():
        target = so.stage_path(so_run_id, stage_n, name=canonical_name)
        target.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")

    # 2. Pass-through handlers. The stages already ran; staged_merge's job
    #    is to verify each artefact exists and call apply() before allowing
    #    the run to advance to visual-qa + autonomy. Canonical mutations
    #    (scaffold promotions in stage 9b) already happened during stage
    #    execution; rollback would need to revert those. For now, rollback
    #    is also a no-op -- atomic rollback is parking work for the next
    #    pass (the FR21 invariant holds because scaffold-promote uses the
    #    staged-merge channel itself).
    handlers = [
        sm.StageHandler(
            stage=stage_n,
            apply=lambda _a: None,
            rollback=lambda _a: None,
            artefact_name=name,
        )
        for stage_n, (name, _payload) in legacy_to_phase5.items()
    ]

    # 3. capture_callable: always the stub (2026-07-04 — the live Playwright +
    #    PIL pixel-diff capture path was removed; it had the same false-win/
    #    false-loss blind spot as Stage 11 pixel-diff, per Spec 20). Stage 8
    #    visual QA is now always a human step (/visual-qa) or the Stage 11.6
    #    computed-parity gate below on pattern auto-promotion.
    capture_fn = vqa_capture.stub_capture
    print("[autonomy] visual-qa capture: stub (no automated pixel-diff path; "
          "operator runs /visual-qa manually)")

    outcome = om.run(
        run_id=so_run_id,
        stage_handlers=handlers,
        capture_callable=capture_fn,
        sgs_update_cmd=[sys.executable,
                        str(Path.home() / ".claude/skills/sgs-wp-engine/scripts/update-db.py")],
        sgs_update_dry_run=True,  # safer default for an inline run
        require_schema=not args.no_schema_validation,  # Flip default: True (validate) unless --no-schema-validation
    )
    print(f"[autonomy] outcome={outcome.overall} merge={outcome.merge_outcome} "
          f"decision={outcome.autonomy_decision} sgs_update_rc={outcome.sgs_update_returncode}")
    print(f"[autonomy] deliverable: {outcome.deliverable_path}")

    # 4. +REGISTER — two-tier gate. REWIRED 2026-07-04: the old pixel-diff-based
    #    gate (outcome.overall == "success" AND live-capture "real" mode) is retired
    #    along with Stage 11 pixel-diff and the live visual_qa_capture engine (same
    #    false-win/false-loss blind spot, Spec 20). The gate is now:
    #      a) PROMOTE to canonical theme/sgs-theme/patterns/ ONLY when Stage 11.6
    #         computed-parity scored a PERFECT overall_css_pct == 100 for this run
    #         (the one dependable fidelity signal, per Spec 20 / CLAUDE.md rule 4a).
    #         Anything less than 100% is not proven faithful enough to auto-land in
    #         the framework's canonical pattern library.
    #      b) Otherwise STAGE to pipeline-state/<run>/proposed-patterns/ so the
    #         operator can review and manually promote later.
    #    Name-collision protection (avoid duplicate patterns) is unaffected by this
    #    rewire — it already happens inside reg_mod.register_run(): a SELECT-then-
    #    INSERT dedup in _insert_sgs_pattern() (patterns table keyed by slug) plus
    #    a pre-existing-PHP-file check, both independent of the promote/stage choice.
    #    --skip-register opts out of both paths.
    if args.skip_register:
        print("[+REGISTER] skipped per --skip-register")
    else:
        promote_to_canonical = (computed_parity_overall_pct == 100)
        if promote_to_canonical:
            target_dir = reg_mod.PATTERNS_DIR
            print(f"[+REGISTER] promoting to canonical: {target_dir} "
                  f"(computed-parity overall_css_pct=100)")
        else:
            target_dir = so_run_dir / "proposed-patterns"
            target_dir.mkdir(parents=True, exist_ok=True)
            reason = (
                f"computed-parity overall_css_pct={computed_parity_overall_pct}"
                if computed_parity_overall_pct is not None
                else "computed-parity not available for this run"
            )
            print(f"[+REGISTER] staging to proposed-patterns (reason: {reason}): {target_dir}")
        register_result = reg_mod.register_run(
            run_id=so_run_id,
            extract_artefact={"output": extract_out},
            boundary_artefact=boundary,
            patterns_dir=target_dir,
            run_dir=so_run_dir,
        )
        print(reg_mod.summarise(register_result))

    # 5. critical-fix-verification (Phase 6 v2 Step 4k) -- the 4-check FR21
    # acceptance harness runs after +REGISTER so it can verify the
    # canonical-mutation invariants held end-to-end: no root theme.json
    # mutation, no canonical-block mutation outside FR21 channels,
    # /sgs-update idempotency, pipeline-state clean post-success.
    # Soft-fail so a missing optional dependency (e.g. expected theme hash)
    # doesn't blow up a successful run -- the operator still sees the full
    # check matrix in the result.
    cfv_result: dict = {"checks": [], "summary": {"passed": 0, "failed": 0, "total": 0}}
    try:
        cfv = critical_fix_verification()
        cfv_result = cfv.run_harness(run_id=so_run_id)
        cfv_path = run_dir / "critical-fix-verification.json"
        cfv_path.write_text(json.dumps(cfv_result, indent=2, ensure_ascii=False, default=str), encoding="utf-8")
        summary = cfv_result.get("summary") or {}
        print(f"[stage-4k] critical-fix-verification: {summary.get('passed', 0)}/{summary.get('total', 0)} checks passed; artefact at {cfv_path}")
    except Exception as exc:  # noqa: BLE001 - harness is post-flight audit; soft-fail
        print(f"[stage-4k] critical-fix-verification soft-failed: {exc}", file=sys.stderr)
    _cfv_summary = cfv_result.get("summary") or {}
    _emit(_trace_for(run_dir), stage="stage_4k_critical_fix_verification",
          checks_passed=_cfv_summary.get("passed", 0),
          checks_failed=_cfv_summary.get("failed", 0),
          checks_total=_cfv_summary.get("total", 0),
          passed=_cfv_summary.get("failed", 0) == 0)

    print(f"[orchestrator] DONE. Artefacts in {run_dir} + {so_run_dir}")
    _emit(_trace_for(run_dir), stage="orchestrator_done",
          decision="complete", last_stage_reached="stage_4k_critical_fix_verification")


if __name__ == "__main__":
    # The final log-surface pass MUST run on every exit path — normal return,
    # the --skip-autonomy-gate early return, the stage-gate sys.exit, or an
    # uncaught exception. summary.log is derived wholly from trace.jsonl, so a
    # pass that only ran mid-pipeline would permanently describe a PREFIX of
    # the run while looking complete (R4, 2026-08-04).
    try:
        main()
    finally:
        _surface_logs(_RUN_DIR, "stage-9c-final")
