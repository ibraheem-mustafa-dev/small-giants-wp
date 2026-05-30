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
TOKEN_RESOLVER_SCRIPT = ORCHESTRATOR_DIR / "token_resolver.py"
VARIATION_ROUTER_SCRIPT = ORCHESTRATOR_DIR / "variation_router.py"
TOKEN_LINT_SCRIPT = LINTS_DIR / "token-lint.py"
SUPPORTS_WRITER_SCRIPT = ORCHESTRATOR_DIR / "supports_writer.py"
TRACE_SCRIPT = ORCHESTRATOR_DIR / "trace.py"
MODIFIER_EXTRACTORS_SCRIPT = ORCHESTRATOR_DIR / "modifier_extractors.py"
STAGE1_BOUNDARY_HOOK_SCRIPT = ORCHESTRATOR_DIR / "stage1_boundary_hook.py"
ATTRIBUTE_GAP_WRITER_SCRIPT = RECOGNISER_DIR / "attribute-gap-writer.py"
FUNCTIONALITY_GAP_DETECTOR_SCRIPT = RECOGNISER_DIR / "functionality-gap-detector.py"
GAP_REVIEW_REPORT_SCRIPT = RECOGNISER_DIR / "gap-review-report.py"
ATTRIBUTE_STAGED_APPLY_SCRIPT = ORCHESTRATOR_DIR / "attribute-staged-apply.py"
FUNCTIONALITY_BULK_APPLY_SCRIPT = ORCHESTRATOR_DIR / "functionality-bulk-apply.py"
MEDIA_SIDELOAD_SCRIPT = ORCHESTRATOR_DIR / "media-sideload.py"
WP_INTEGRATION_SCRIPT = ORCHESTRATOR_DIR / "wp_integration.py"
CRITICAL_FIX_VERIFICATION_SCRIPT = ORCHESTRATOR_DIR / "critical-fix-verification.py"

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
    strict-or-warn verdict semantics (per Spec 15 §9 modes).
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
      D1 — typed-attr lift    → written to pipeline-state/<run>/css-d1-assignments.json
      D2 — wrapper CSS        → written scoped to .page-id-N in variation CSS
      D3 — gap candidates     → written to sgs-framework.db.attribute_gap_candidates
                                  + ALSO to D2 as fallback

    Hard rule (Spec 16 §R5): every CSS rule routes to exactly one bucket.
    Chrome-skip: rules targeting <header>/<footer>/<nav> are not emitted to D2.

    Output:
      - pipeline-state/<run>/variation-d0-d2.css  (D0 + D2 + D3-fallback only; Q3 fix 2026-05-23)
      - pipeline-state/<run>/css-d1-assignments.json  (D1 typed-attr sidecar for cv2)
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
    d1_assignments: dict = router_result.get("d1", {})
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

    # ---- 5. Write D1 assignments sidecar (consumed by cv2 convert.py) ----
    d1_sidecar_path = run_dir / "css-d1-assignments.json"
    try:
        d1_sidecar_path.write_text(
            json.dumps(d1_assignments, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )
    except Exception as exc:  # noqa: BLE001
        warnings.append(f"css-d1-assignments.json write failed: {exc}")

    # ---- 6. Write D3 gap candidates to sgs-framework.db ----
    d3_inserted = 0
    if d3_entries:
        try:
            d3_inserted = _css_router_mod.write_d3_to_db(d3_entries, sgs_db_path=None)
        except Exception as exc:  # noqa: BLE001
            warnings.append(f"D3 gap candidate DB write failed: {exc}")

    output = {
        "output_path": str(out_path.relative_to(REPO)) if out_path.exists() else "",
        "total_chars": total_chars,
        "css_body_chars": css_body_chars,
        "sources": sources,
        "d1_sidecar_path": str(d1_sidecar_path.relative_to(REPO)) if d1_sidecar_path.exists() else "",
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
        "d1_sidecar_path": "",
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


# Lazy-import the token_resolver module on first call (Spec 15 Phase 5d.2 - wired by Phase 6 v2 Step 4a).
_token_resolver_mod = None


def token_resolver():
    global _token_resolver_mod
    if _token_resolver_mod is None:
        _token_resolver_mod = _load_module_from_path("sgs_token_resolver", TOKEN_RESOLVER_SCRIPT)
    return _token_resolver_mod


# Lazy-import variation_router + token-lint slug generator (Spec 15 Phase 6 v2 Step 4b).
# token-lint is loaded for its canonical _generate_slug() helper -- module reuse
# avoids duplicating slug rules already covered by the additive token-discovery
# tests in token-lint's suite. variation_router owns the single write path
# into client style variation JSONs.
_variation_router_mod = None
_token_lint_mod = None


def variation_router():
    global _variation_router_mod
    if _variation_router_mod is None:
        _variation_router_mod = _load_module_from_path("sgs_variation_router", VARIATION_ROUTER_SCRIPT)
    return _variation_router_mod


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


# Lazy-import supports_writer (Spec 15 Phase 6 v2 Step 4c). supports_writer
# itself transitively loads value-matcher/inheritance.py when present, so the
# Phase 5 inheritance check is reachable through this single dispatch.
_supports_writer_mod = None


def supports_writer():
    global _supports_writer_mod
    if _supports_writer_mod is None:
        _supports_writer_mod = _load_module_from_path("sgs_supports_writer", SUPPORTS_WRITER_SCRIPT)
    return _supports_writer_mod


# Lazy-import modifier_extractors (Spec 15 Phase 6 v2 Step 4d).
_modifier_extractors_mod = None


def modifier_extractors():
    global _modifier_extractors_mod
    if _modifier_extractors_mod is None:
        _modifier_extractors_mod = _load_module_from_path("sgs_modifier_extractors", MODIFIER_EXTRACTORS_SCRIPT)
    return _modifier_extractors_mod


# Lazy-import stage1_boundary_hook (Spec 15 Phase 6 v2 Step 4e). The module
# transitively loads orchestrator/lingua_franca.py at import time so wiring
# this single helper flips lingua_franca's reachability column too.
_stage1_boundary_hook_mod = None


def stage1_boundary_hook():
    global _stage1_boundary_hook_mod
    if _stage1_boundary_hook_mod is None:
        _stage1_boundary_hook_mod = _load_module_from_path("sgs_stage1_boundary_hook", STAGE1_BOUNDARY_HOOK_SCRIPT)
    return _stage1_boundary_hook_mod


# Lazy-import attribute-gap-writer (Spec 15 Phase 6 v2 Step 4f).
_attribute_gap_writer_mod = None


def attribute_gap_writer():
    global _attribute_gap_writer_mod
    if _attribute_gap_writer_mod is None:
        _attribute_gap_writer_mod = _load_module_from_path("sgs_attribute_gap_writer", ATTRIBUTE_GAP_WRITER_SCRIPT)
    return _attribute_gap_writer_mod


# Lazy-import functionality-gap-detector (Spec 15 Phase 6 v2 Step 4g).
_functionality_gap_detector_mod = None


def functionality_gap_detector():
    global _functionality_gap_detector_mod
    if _functionality_gap_detector_mod is None:
        _functionality_gap_detector_mod = _load_module_from_path(
            "sgs_functionality_gap_detector", FUNCTIONALITY_GAP_DETECTOR_SCRIPT,
        )
    return _functionality_gap_detector_mod


# Lazy-import gap-review-report (Spec 15 Phase 6 v2 Step 4h).
_gap_review_report_mod = None


def gap_review_report():
    global _gap_review_report_mod
    if _gap_review_report_mod is None:
        _gap_review_report_mod = _load_module_from_path("sgs_gap_review_report", GAP_REVIEW_REPORT_SCRIPT)
    return _gap_review_report_mod


# Lazy-import attribute-staged-apply + functionality-bulk-apply + media-sideload
# (Spec 15 Phase 6 v2 Step 4i). All three are operator-gated workflows: they
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


# Lazy-import wp_integration (Spec 15 Phase 6 v2 Step 4j).
_wp_integration_mod = None


def wp_integration():
    global _wp_integration_mod
    if _wp_integration_mod is None:
        _wp_integration_mod = _load_module_from_path(
            "sgs_wp_integration", WP_INTEGRATION_SCRIPT,
        )
    return _wp_integration_mod


# Lazy-import critical-fix-verification (Spec 15 Phase 6 v2 Step 4k).
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


# ---------------------------------------------------------------------------
# Stage 1 -- BOUNDARY (dispatcher: per-section-convention-voter.py)
# ---------------------------------------------------------------------------

def stage_1_boundary(mockup_path: Path, section_selector: str, auto_section: bool, run_dir: Path) -> dict:
    """Stage 1 -- delegate to per-section-convention-voter.py via subprocess."""
    started = now_iso()
    voter_out = run_dir / "voter.json"
    cmd = [
        sys.executable, str(VOTER_SCRIPT),
        "--mockup", str(mockup_path),
        "--out", str(voter_out),
    ]
    if auto_section:
        cmd.append("--auto-section")
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

    status = "complete" if not errors else "failed"
    write_artefact(run_dir, 1, "boundary", status, output, started, errors, warnings)
    return output


# ---------------------------------------------------------------------------
# Stage 2 -- MATCH (dispatcher: confidence-matrix.score_candidates importable)
# ---------------------------------------------------------------------------

def _wp_blocks_match(description: str) -> dict:
    """Call wp-blocks.py match and return the parsed dict. Soft-fail returns {}."""
    if not WP_BLOCKS_CLI.exists():
        return {}
    result = _run_cli([sys.executable, str(WP_BLOCKS_CLI), "match", description])
    return result if "_error" not in result else {}


def stage_2_match(boundary_output: dict, run_dir: Path) -> dict:
    """Stage 2 -- import confidence-matrix.score_candidates and rank candidates per boundary.

    5.3.2 enhancement: after scoring, cross-check each match against wp-blocks.py match.
    When the two disagree by > 0.3 confidence, favour the wp-blocks result (it has
    the SGS pattern DB behind it) and log a warning for operator review.
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

            matches.append({
                "boundary_id": boundary["boundary_id"],
                "section_id": section_id,
                "block_name": chosen_block,
                "confidence": max(cm_confidence, wp_top_score),
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
        from orchestrator.converter_v2.db_lookup import block_attrs  # type: ignore[import]
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

    # Reset converter_v2's pipeline-seed state at the start of every run so
    # back-to-back orchestrator invocations in the same Python process (multi-
    # client batch mode, test runners) don't carry stale theme_widths across
    # clients. No-op when converter_v2 isn't importable on this run.
    try:
        _conv_pkg_dir_reset = ORCHESTRATOR_DIR.parent
        if str(_conv_pkg_dir_reset) not in sys.path:
            sys.path.insert(0, str(_conv_pkg_dir_reset))
        from orchestrator.converter_v2 import reset_pipeline_seed as _reset_seed
        _reset_seed()
    except ImportError:
        pass

    # Stage 4.5 — seed theme_json into converter_v2._LIFT_CONTEXT so
    # _snap_style_dict_leaves can resolve against the palette + spacing + font-size
    # registries during the per-section walk. Uses the same merged theme_json that
    # was built at Stage 0 (base theme.json + variation overlay).
    if theme_json and getattr(args, "converter_v2", False):
        try:
            _cv2_dir_seed = ORCHESTRATOR_DIR.parent
            if str(_cv2_dir_seed) not in sys.path:
                sys.path.insert(0, str(_cv2_dir_seed))
            from orchestrator.converter_v2 import seed_theme_json as _seed_theme_json
            _seed_theme_json(theme_json)
        except Exception:  # noqa: BLE001
            pass  # token-snap gracefully degrades if seeding fails

    # P1.B — seed css-d1-assignments.json sidecar into cv2's D1 cache.
    # stage_0_7_css_lift already wrote the sidecar at run_dir/css-d1-assignments.json.
    # Seeding here (before the per-section loop) means every section's
    # _lift_root_supports_to_style / _lift_core_block_style call can MERGE the
    # router's pre-classified D1 assignments alongside what _collect_css_decls_for_element
    # derives at runtime — richer CSS context = more attrs lifted, fewer D3 gap candidates.
    # Graceful-degradation: if the sidecar file is absent, seed_d1_sidecar returns False
    # and cv2 falls back to _collect_css_decls_for_element exclusively.
    if getattr(args, "converter_v2", False):
        try:
            _cv2_d1_dir = ORCHESTRATOR_DIR.parent
            if str(_cv2_d1_dir) not in sys.path:
                sys.path.insert(0, str(_cv2_d1_dir))
            from orchestrator.converter_v2 import seed_d1_sidecar as _seed_d1_sidecar
            _d1_loaded = _seed_d1_sidecar(run_dir)
            if _d1_loaded:
                from orchestrator.converter_v2 import convert as _cv2_convert_mod
                _d1_entry_count = sum(
                    len(v) for v in _cv2_convert_mod._D1_SIDECAR.values()
                    if isinstance(v, dict)
                )
                print(f"[stage-4.5] D1 sidecar loaded: {_d1_entry_count} typed-attr assignments available for cv2")
            else:
                print("[stage-4.5] D1 sidecar not available; cv2 uses _collect_css_decls_for_element exclusively")
        except Exception as _d1_exc:  # noqa: BLE001
            print(f"[stage-4.5] D1 sidecar seed soft-failed ({_d1_exc}); cv2 falls back gracefully")

    for m in matches:
        boundary_id = m["boundary_id"]
        target_block = m["block_name"]
        boundary = boundaries_by_id.get(boundary_id, {})
        section_selector = boundary.get("selector") or args.section
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
        if getattr(args, "converter_v2", False):
            _class_sig = boundary.get("class_signature") or []
            try:
                _s1bh = stage1_boundary_hook()
                if _s1bh is not None and hasattr(_s1bh, "_is_sgs_bem_canonical"):
                    _cv2_eligible = bool(_s1bh._is_sgs_bem_canonical(_class_sig))
            except Exception:  # noqa: BLE001
                _cv2_eligible = False

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
                # Import the production converter package. The orchestrator
                # runs from REPO root, so the package path is discoverable
                # via importlib if sys.path includes ORCHESTRATOR_DIR's parent.
                _conv_pkg_dir = ORCHESTRATOR_DIR.parent  # .../scripts/
                if str(_conv_pkg_dir) not in sys.path:
                    sys.path.insert(0, str(_conv_pkg_dir))
                from orchestrator.converter_v2 import convert_section as _conv_section
                # Read section HTML from the mockup (same source as legacy extract.py).
                # The boundary selector identifies which top-level element to extract.
                from bs4 import BeautifulSoup as _BS4
                _mockup_html = args.mockup.read_text(encoding="utf-8")
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
                # Prefer ID-based lookup; fall back to class-based CSS selector.
                _sec_el = None
                _sec_id = boundary.get("section_id") or ""
                if _sec_id:
                    _sec_el = _soup.find(id=_sec_id)
                if _sec_el is None and section_selector:
                    # Strip the leading tag name if present (e.g. "section.sgs-hero" → "sgs-hero")
                    _sel_parts = section_selector.split(".", 1)
                    _tag = _sel_parts[0] if len(_sel_parts) > 1 else None
                    _cls = _sel_parts[1] if len(_sel_parts) > 1 else _sel_parts[0]
                    _sec_el = _soup.find(_tag, class_=_cls.split(".")[0]) if _tag else _soup.find(class_=_cls.split(".")[0])
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
                )
                # Normalise to orchestrator per_section_results schema.
                _cv2_markup = result.get("block_markup", "")
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
                    "extracted_attributes": result.get("extracted_attributes", {}),
                    "block_markup": _cv2_markup,
                    "token_resolutions": _cv2_token_res,
                    "new_tokens_written": _new_tokens,
                    "supports_decisions": [],
                    "supports_emitted_attributes": result.get("extracted_attributes", {}),
                    "supports_omitted_attributes": {},
                    "modifier_signals": {},
                    "variation_css": result.get("variation_css", ""),
                    "attribute_gap_candidates": result.get("attribute_gap_candidates", []),
                    "class_signature": _class_sig,
                    "converter_v2": True,
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
    proc_review = subprocess.run(cmd_review, capture_output=True, text=True, encoding="utf-8")
    if proc_review.returncode != 0:
        errors.append(f"simple_html_review_report exited {proc_review.returncode}: {(proc_review.stderr or '')[:500]}")

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
        }
        for s in per_section_results
        if s.get("status") == "unmatched"
    ]

    output = {
        "coverage": coverage_by_boundary,
        "leftover_buckets": buckets_output.get("leftover_buckets", {}),
        "leftover_totals": buckets_output.get("totals", {}),
        "leftover_total_count": buckets_output.get("total_count", 0),
        "recognition_log_rows_inserted": rows_inserted,
        "operator_review_html_path": str(review_html_path),
        "autonomy_chain": autonomy_out,
        "attribute_gap_writer": attribute_gap_writer_result,
        "functionality_gap_detector": functionality_gap_detector_result,
        "gap_review_report_path": gap_review_report_path,
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
        "--clone-url", type=str, default=None,
        help="URL of deployed clone for visual-qa capture. When omitted, visual-qa "
             "uses the stub (0.0 diff). Required for the autonomy-gate pixel-parity check.",
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
        "--spec-22-acceptance", action="store_true", default=False,
        help="Spec 22 Phase 1 acceptance-gate mode. Propagates --wait-fonts to "
             "Stage 11 pixel-diff invocations so the ≤5%% per-section gate "
             "(FR-22-7) is measured against `document.fonts.ready`-stable "
             "screenshots, not flash-of-unstyled-text noise. OFF by default "
             "for backward-compat with pre-Spec-22 runs.",
    )
    parser.add_argument(
        "--strict-spec-22-gate", action="store_true", default=False,
        help="When set, Stage 11 exits non-zero if ANY pixel-diff cell reports "
             "diff.json.wait_fonts=false. Use during Phase 1 acceptance runs to "
             "fail hard rather than soft-warn. Implied by --spec-22-acceptance "
             "only at the warning level; this flag elevates the gate to a "
             "hard halt. (default: False — soft warning only)",
    )
    parser.add_argument(
        "--no-schema-validation", action="store_true", default=False,
        help="Skip Stage 6 block.json attribute schema validation. By default, the "
             "orchestrator halts with an actionable error if any block emits attributes "
             "that violate the block.json schema. Use this flag only for developer "
             "debugging when you need to inspect a broken payload without halting. "
             "(default: False — validation is required)",
    )
    args = parser.parse_args()

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

    run_id = make_run_id(args.client, args.page)
    run_dir = REPO / "pipeline-state" / run_id
    run_dir.mkdir(parents=True, exist_ok=True)

    print(f"[orchestrator] run_id={run_id}")
    print(f"[orchestrator] run_dir={run_dir}")
    print(f"[orchestrator] mode={args.mode}")

    # Wave 3a follow-up: seed cv2's gap-candidate accumulator with this run's
    # run_id so every attribute_gap_candidate row emitted under D3 carries
    # traceable provenance. Soft-fail on ImportError (cv2 not importable on
    # this Python path — same fallback shape as the existing reset_pipeline_seed
    # at line ~976).
    try:
        from orchestrator.converter_v2 import seed_gap_context as _seed_gap_context
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

    boundary = stage_1_boundary(args.mockup, args.section or "", args.auto_section, run_dir)
    bcount = len(boundary.get("boundaries", []))
    primary_conv = (boundary.get("convention_summary") or {}).get("primary", "?")
    print(f"[stage-1] voter: {bcount} boundaries, primary convention={primary_conv}")

    match = stage_2_match(boundary, run_dir)
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
    autonomy = report.get("autonomy_chain") or {}
    if autonomy.get("enabled"):
        print(f"[stage-9b] autonomy: {autonomy.get('scaffolded_count', 0)} scaffolded ({autonomy.get('promoted_count', 0)} promoted) from {autonomy.get('candidates_seen', 0)} candidates")

    # ------------------------------------------------------------------
    # Phase 6 v2 Step 4i — Apply-module surface (between Stage 7 compose
    # and Stage 8 autonomy-gate / deploy). All three apply modules are
    # operator-gated by FR21 contract; they stage + emit deploy commands
    # and NEVER auto-mutate live WordPress. We:
    #   1. Run media-sideload.sideload_batch in dry-run mode to harvest
    #      every image-object slot from the extract and write a manifest
    #      the operator can later promote with --upload.
    #   2. Lazy-load attribute-staged-apply + functionality-bulk-apply
    #      so they're registered in sys.modules and reachable by
    #      post-clone operator scripts via the orchestrator's namespace.
    # Result lands on a stage_4i.json artefact at run_dir/.
    # ------------------------------------------------------------------
    stage_4i_summary: dict = {"media_sideload": None, "modules_loaded": []}
    try:
        msl = media_sideload()
        sideload_report = msl.sideload_batch(
            extract_out,
            mockup_root=args.mockup.parent,
            upload=False,
        )
        manifest_path = run_dir / "media-sideload-manifest.json"
        manifest_path.write_text(
            json.dumps(sideload_report, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )
        stage_4i_summary["media_sideload"] = {
            "slots_found": sideload_report.get("slots_found", 0),
            "mode": sideload_report.get("mode", "dry-run"),
            "manifest_path": str(manifest_path),
        }
        print(f"[stage-4i] media-sideload: {sideload_report.get('slots_found', 0)} image slot(s) staged (dry-run); manifest at {manifest_path}")
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
    try:
        _logsurf = _load_module_from_path(
            "surface_pipeline_logs",
            Path(__file__).parent / "orchestrator" / "surface_pipeline_logs.py",
        )
        _surf = _logsurf.surface(run_dir)
        if _surf.get("status") == "ok":
            counts = _surf.get("counts", {})
            print(
                f"[stage-9c] surfaced logs: "
                f"chrome_skip={counts.get('chrome_skip',0)} "
                f"errors={counts.get('error',0)} "
                f"warnings={counts.get('warning',0)} "
                f"-> {', '.join(_surf.get('files_written', {}).keys())}"
            )
    except Exception as exc:  # noqa: BLE001 - surfacing is observability; soft-fail
        print(f"[stage-9c] surface-logs soft-failed: {exc}", file=sys.stderr)

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
            import subprocess
            _upload_script = Path(__file__).parent / "orchestrator" / "upload_and_patch.py"
            # Pass --client so Stage 10 diffs (or pushes, with --push-theme-snapshot)
            # the matching theme.json snapshot at sites/<client>/theme-snapshot.json
            # to the target site. Phase 5a (2026-05-22 Decision 16') replacement for
            # the deleted /wp-json/sgs/v1/active-variation REST endpoint and the
            # retired theme/sgs-theme/styles/<client>.json overlay system.
            _upload_cmd = [
                sys.executable, str(_upload_script), str(run_dir),
                "--target", target_kind, "--target-id", str(target_id),
                "--client", args.client,
            ]
            if args.push_theme_snapshot:
                _upload_cmd.append("--push-theme-snapshot")
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
        except Exception as exc:  # noqa: BLE001 — Stage 10 is opt-in observability; soft-fail
            print(f"[stage-10] deploy soft-failed: {exc}", file=sys.stderr)

    # ------------------------------------------------------------------
    # Stage 11 — Pixel-diff against the page Stage 10 actually patched
    # (added 2026-05-23 per P-PIXEL-DIFF-NOT-IN-ORCHESTRATOR).
    #
    # Naturally skips when Stage 10 halted (no link= in stdout → no URL →
    # warning + skip). The new exit codes 4/5/6 from Stage 10 mean any
    # phantom-page deploy gets caught here without producing misleading
    # pixel-diff numbers against a 404 / wrong-id page.
    #
    # Per-section pixel-diff across 375 / 768 / 1440 viewports.
    # blub.db row 256: NEVER full-page; always --selector .sgs-{section}.
    # Soft-fail design — never blocks the autonomy chain that follows.
    # ------------------------------------------------------------------
    if args.deploy_target and 'result' in locals() and result.returncode == 0:
        try:
            import re as _re
            tail_lines_s11 = [
                ln for ln in result.stdout.splitlines()
                if "link=" in ln
            ]
            link_match = None
            if tail_lines_s11:
                link_match = _re.search(r"link=(https?://\S+)", tail_lines_s11[-1])
            if not link_match:
                print(
                    "[stage-11] pixel-diff SKIPPED — no link= URL found in Stage 10 stdout. "
                    "Stage 10 may have soft-failed without surfacing.",
                    file=sys.stderr,
                )
            else:
                sgs_url = link_match.group(1).rstrip(".,;")
                pixel_diff_script = REPO / "scripts" / "pixel-diff.py"
                if not pixel_diff_script.exists():
                    print(
                        f"[stage-11] pixel-diff SKIPPED — script not found at {pixel_diff_script}",
                        file=sys.stderr,
                    )
                else:
                    pd_out_root = run_dir / "pixel-diff"
                    pd_out_root.mkdir(parents=True, exist_ok=True)
                    mockup_uri = args.mockup.resolve().as_uri()
                    selectors = [
                        b.get("selector", "") for b in boundary.get("boundaries", [])
                        if b.get("selector")
                    ]
                    viewports = ("375x812", "768x1024", "1440x900")
                    # Spec 22 Phase 0.3.b — propagate --wait-fonts to pixel-diff
                    # when the run is a Spec 22-gated acceptance run or a
                    # debug-trace walkdown. Without this the ≤5% gate (FR-22-7)
                    # measures against FOUT-noisy screenshots. Backward-compat:
                    # pre-Spec-22 runs (no --spec-22-acceptance, no --debug-trace)
                    # behave exactly as before. See P-SGS-CLONE-WAIT-FONTS-ORCHESTRATION.
                    _wait_fonts_on = bool(
                        getattr(args, "spec_22_acceptance", False)
                        or getattr(args, "debug_trace", False)
                    )
                    results_s11: list[dict] = []
                    for selector in selectors:
                        # Drop any non-class component for the directory name
                        safe_sel = _re.sub(r"[^a-zA-Z0-9_-]", "_", selector).strip("_")
                        for vp in viewports:
                            pd_out = pd_out_root / f"{safe_sel}-{vp.split('x')[0]}"
                            try:
                                _pd_cmd = [
                                    sys.executable, str(pixel_diff_script),
                                    "--mockup", mockup_uri,
                                    "--sgs", sgs_url,
                                    "--viewport", vp,
                                    "--selector", selector,
                                    "--out", str(pd_out),
                                ]
                                if _wait_fonts_on:
                                    _pd_cmd.append("--wait-fonts")
                                pd_proc = subprocess.run(
                                    _pd_cmd,
                                    capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=120,
                                )
                                diff_json_path = pd_out / "diff.json"
                                if diff_json_path.exists():
                                    diff_data = json.loads(diff_json_path.read_text(encoding="utf-8"))
                                    results_s11.append({
                                        "selector": selector,
                                        "viewport": vp,
                                        "mismatch_percent": diff_data.get("mismatch_percent"),
                                        "verdict": diff_data.get("verdict"),
                                        "wait_fonts": diff_data.get("wait_fonts"),
                                        "diff_json": str(diff_json_path.relative_to(REPO)),
                                    })
                                else:
                                    results_s11.append({
                                        "selector": selector,
                                        "viewport": vp,
                                        "error": pd_proc.stderr.strip()[:200] or "no diff.json produced",
                                    })
                            except subprocess.TimeoutExpired:
                                results_s11.append({
                                    "selector": selector, "viewport": vp,
                                    "error": "timeout (120s) — Playwright capture stalled",
                                })
                            except Exception as inner_exc:  # noqa: BLE001
                                results_s11.append({
                                    "selector": selector, "viewport": vp,
                                    "error": f"{type(inner_exc).__name__}: {inner_exc}"[:200],
                                })
                    # Spec 22 FR-22-7 wait_fonts assertion — count cells whose
                    # diff.json reports wait_fonts=false. Soft-warn by default;
                    # --strict-spec-22-gate elevates to hard exit.
                    _wait_fonts_false_cells = [
                        r for r in results_s11
                        if "mismatch_percent" in r and r.get("wait_fonts") is False
                    ]
                    s11_artefact = {
                        "stage": 11,
                        "name": "pixel-diff",
                        "sgs_url": sgs_url,
                        "mockup_uri": mockup_uri,
                        "wait_fonts_requested": _wait_fonts_on,
                        "results": results_s11,
                        "summary": {
                            "captures_attempted": len(results_s11),
                            "captures_ok": sum(1 for r in results_s11 if "mismatch_percent" in r),
                            "captures_error": sum(1 for r in results_s11 if "error" in r),
                            "wait_fonts_false_count": len(_wait_fonts_false_cells),
                            "mean_mismatch_percent": (
                                sum(r["mismatch_percent"] for r in results_s11 if "mismatch_percent" in r)
                                / max(1, sum(1 for r in results_s11 if "mismatch_percent" in r))
                            ) if any("mismatch_percent" in r for r in results_s11) else None,
                        },
                    }
                    (run_dir / "stage-11-pixel-diff.json").write_text(
                        json.dumps(s11_artefact, indent=2), encoding="utf-8",
                    )
                    s11_summary = s11_artefact["summary"]
                    print(
                        f"[stage-11] pixel-diff: {s11_summary['captures_ok']}/{s11_summary['captures_attempted']} "
                        f"captures, mean_mismatch={s11_summary['mean_mismatch_percent']:.1f}%"
                        if s11_summary['mean_mismatch_percent'] is not None
                        else f"[stage-11] pixel-diff: {s11_summary['captures_ok']}/{s11_summary['captures_attempted']} captures, no valid measurements"
                    )
                    # Spec 22 FR-22-7 wait_fonts gate.
                    if _wait_fonts_false_cells:
                        for _cell in _wait_fonts_false_cells:
                            print(
                                f"[stage-11] WARNING: diff.json.wait_fonts=false on "
                                f"section.{_cell['selector']}.{_cell['viewport']} — "
                                f"Spec 22 acceptance gate (FR-22-7) requires "
                                f"wait_fonts=true. Re-run with --spec-22-acceptance "
                                f"(or --debug-trace) to propagate --wait-fonts.",
                                file=sys.stderr,
                            )
                        if getattr(args, "strict_spec_22_gate", False):
                            sys.exit(
                                f"[stage-11] FATAL: --strict-spec-22-gate set and "
                                f"{len(_wait_fonts_false_cells)} of "
                                f"{s11_summary['captures_ok']} pixel-diff cells reported "
                                f"wait_fonts=false. FR-22-7 acceptance measurement invalid."
                            )
                    elif _wait_fonts_on and s11_summary['captures_ok']:
                        print(
                            f"[stage-11] FR-22-7 wait_fonts gate PASS: all "
                            f"{s11_summary['captures_ok']} cells report wait_fonts=true."
                        )
        except Exception as exc:  # noqa: BLE001 — Stage 11 is observability; soft-fail
            print(f"[stage-11] pixel-diff soft-failed: {exc}", file=sys.stderr)

    if args.skip_autonomy_gate:
        print("[orchestrator] DONE (autonomy gate skipped per --skip-autonomy-gate).")
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

    # 3. capture_callable: live Playwright multi-viewport when --clone-url
    #    is supplied; otherwise the stub (0.0 diff, lets autonomy pass).
    if args.clone_url:
        ctx = vqa_capture.CaptureContext(
            clone_url=args.clone_url,
            mockup_dir=args.mockup.parent.resolve(),
            mockup_relative_path=args.mockup.name,
            out_dir=so_run_dir / "screenshots",
        )
        capture_fn = vqa_capture.make_capture_callable(ctx)
        capture_mode = "real"
        print(f"[autonomy] visual-qa capture: live (clone-url={args.clone_url})")
    else:
        capture_fn = vqa_capture.stub_capture
        capture_mode = "stub"
        print("[autonomy] visual-qa capture: stub (no --clone-url; autonomy will pass)")

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

    # 4. +REGISTER — two-tier gate (added 2026-05-14 after the 5 composer-shape
    #    residue patterns from a stub-capture 2026-05-13 run were caught polluting
    #    theme/sgs-theme/patterns/):
    #      a) PROMOTE to canonical theme/sgs-theme/patterns/ ONLY when
    #         outcome.overall == "success" AND capture_mode == "real". Stub
    #         capture always returns diff 0.0, so it can't be trusted to gate a
    #         canonical-tree mutation.
    #      b) Otherwise STAGE to pipeline-state/<run>/proposed-patterns/ so
    #         operators can review and manually promote later.
    #    --skip-register opts out of both paths.
    if args.skip_register:
        print("[+REGISTER] skipped per --skip-register")
    else:
        promote_to_canonical = (outcome.overall == "success" and capture_mode == "real")
        if promote_to_canonical:
            target_dir = reg_mod.PATTERNS_DIR
            print(f"[+REGISTER] promoting to canonical: {target_dir}")
        else:
            target_dir = so_run_dir / "proposed-patterns"
            target_dir.mkdir(parents=True, exist_ok=True)
            reason = (
                "stub capture" if capture_mode == "stub"
                else f"autonomy outcome={outcome.overall}"
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

    print(f"[orchestrator] DONE. Artefacts in {run_dir} + {so_run_dir}")


if __name__ == "__main__":
    main()
