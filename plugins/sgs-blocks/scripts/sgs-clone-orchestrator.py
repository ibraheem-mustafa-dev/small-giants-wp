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
COMPOSER_FALLBACK_SCRIPT = ORCHESTRATOR_DIR / "composer_fallback.py"

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
    """Resolve the client style variation JSON path, or None if not present."""
    if not client:
        return None
    path = REPO / "theme" / "sgs-theme" / "styles" / f"{client}.json"
    return path if path.exists() else None


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
#   references and writes a single client-variation stylesheet at
#   theme/sgs-theme/styles/<client>.css. functions.php enqueues it whenever
#   the matching style variation is active.
# ---------------------------------------------------------------------------

_STYLE_BLOCK_RE = re.compile(r"<style[^>]*>(.*?)</style>", re.DOTALL | re.IGNORECASE)
_STYLESHEET_HREF_RE = re.compile(
    r"<link[^>]+rel=[\"']stylesheet[\"'][^>]*href=[\"']([^\"']+)[\"']",
    re.IGNORECASE,
)


def _client_variation_css_path(client: str) -> Path:
    return REPO / "theme" / "sgs-theme" / "styles" / f"{client}.css"


def stage_0_7_css_lift(mockup_path: Path, client: str, run_dir: Path) -> dict:
    """Harvest the mockup's CSS and write a single per-variation stylesheet.

    Sources harvested (in document order):
      1. Every inline <style>...</style> block in the mockup HTML
      2. Every <link rel="stylesheet" href="..."> resolved to a local file
         relative to the mockup directory (external/CDN URLs skipped)

    Output: theme/sgs-theme/styles/<client>.css. Pre-existing content is
    overwritten -- this stage is the canonical writer for the file.
    """
    started = now_iso()
    errors: list[str] = []
    warnings: list[str] = []
    sources: list[dict] = []

    if not mockup_path.exists():
        errors.append(f"mockup not found at {mockup_path}")
        out = {"output_path": "", "total_chars": 0, "sources": [], "passed": False}
        write_artefact(run_dir, 7, "css-lift", "failed", out, started, errors, warnings)
        return out

    html = mockup_path.read_text(encoding="utf-8")
    parts: list[str] = []

    inline_blocks = _STYLE_BLOCK_RE.findall(html)
    for i, css in enumerate(inline_blocks):
        css = css.strip()
        if not css:
            continue
        parts.append(f"/* === mockup inline <style> #{i + 1} === */\n{css}\n")
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
        parts.append(f"/* === mockup linked CSS: {rel} === */\n{css}\n")
        sources.append({"kind": "linked_css", "href": href, "resolved": str(rel), "chars": len(css)})

    if not parts:
        warnings.append("no CSS sources found in mockup (zero inline <style>, zero local <link>)")

    header = (
        "/*!\n"
        f" * SGS clone-pipeline CSS-lift output for client: {client}\n"
        f" * Source mockup: {mockup_path.relative_to(REPO) if mockup_path.is_absolute() else mockup_path}\n"
        f" * Lifted: {started}\n"
        " *\n"
        " * Generated by stage_0_7_css_lift in sgs-clone-orchestrator.py.\n"
        " * Loaded by sgs-theme/functions.php when the matching style variation\n"
        " * is active (active_theme_style theme mod). Edits to this file will\n"
        " * be overwritten on the next clone run -- author changes in the\n"
        " * mockup source.\n"
        " */\n\n"
    )
    payload = header + "\n".join(parts)
    out_path = _client_variation_css_path(client)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(payload, encoding="utf-8")

    output = {
        "output_path": str(out_path.relative_to(REPO)),
        "total_chars": len(payload),
        "css_body_chars": sum(s.get("chars", 0) for s in sources if s.get("kind") in {"inline_style", "linked_css"}),
        "sources": sources,
        "passed": True,
    }
    status = "complete" if not errors else "failed"
    write_artefact(run_dir, 7, "css-lift", status, output, started, errors, warnings)
    return output



# Pattern composer (compose_atomic_pattern + helpers + _BUTTON_HINT_RE)
# extracted to orchestrator/composer_fallback.py 2026-05-14 (Phase 6 v2 Step 6c).
# Reached via the lazy-loaded composer_fallback() dispatcher above.


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


# Lazy-import composer_fallback (Phase 6 v2 Step 6c — extracted from inline
# compose_atomic_pattern + helpers per the deterministic-not-inline rule).
_composer_fallback_mod = None


def composer_fallback():
    global _composer_fallback_mod
    if _composer_fallback_mod is None:
        _composer_fallback_mod = _load_module_from_path("sgs_composer_fallback", COMPOSER_FALLBACK_SCRIPT)
    return _composer_fallback_mod


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

def stage_2_match(boundary_output: dict, run_dir: Path) -> dict:
    """Stage 2 -- import confidence-matrix.score_candidates and rank candidates per boundary."""
    started = now_iso()
    errors: list[str] = []
    warnings: list[str] = []

    try:
        cm = confidence_matrix()
        registered = cm.discover_registered_blocks()
        matches: list[dict] = []
        for boundary in boundary_output.get("boundaries", []):
            ranked = cm.score_candidates(boundary, registered)
            top = ranked[0] if ranked else {"block_name": "core/group", "confidence": 0.0, "tie_breaker": "deferred-no-match"}
            matches.append({
                "boundary_id": boundary["boundary_id"],
                "section_id": boundary.get("section_id"),
                "block_name": top["block_name"],
                "confidence": top["confidence"],
                "alternatives": ranked[1:],
                "ranked_candidates": ranked,
            })
        output = {"matches": matches}
    except Exception as exc:  # noqa: BLE001 -- top-level safety; capture and continue
        errors.append(f"confidence-matrix import/run failed: {exc}")
        output = {"matches": []}

    status = "complete" if not errors else "failed"
    write_artefact(run_dir, 2, "match", status, output, started, errors, warnings)
    return output


# ---------------------------------------------------------------------------
# Stage 3 -- SLOT LIST (unchanged; reads block.json directly)
# ---------------------------------------------------------------------------

def stage_3_slot_list(match_output: dict, run_dir: Path) -> dict:
    """Stage 3 -- build the slot scaffold from each matched block's block.json."""
    started = now_iso()
    warnings: list[str] = []
    slot_lists: dict[str, dict] = {}

    for m in match_output.get("matches", []):
        boundary_id = m["boundary_id"]
        block_name = m["block_name"]
        section_id = m.get("section_id")
        slug = block_name.split("/")[-1] if "/" in block_name else block_name
        block_json_path = REPO / "plugins" / "sgs-blocks" / "src" / "blocks" / slug / "block.json"
        slots: list[dict] = []
        if block_json_path.exists():
            block_json = json.loads(block_json_path.read_text(encoding="utf-8"))
            for attr_name, attr_def in (block_json.get("attributes") or {}).items():
                default_val = attr_def.get("default") if isinstance(attr_def, dict) else None
                slots.append({
                    "slot_name": attr_name,
                    "attribute_role": "auto-derived",
                    "default": default_val,
                    "search_scope": "self",
                })
        else:
            warnings.append(f"block.json not found at {block_json_path}")
        slot_lists[boundary_id] = {
            "block_name": block_name,
            "section_id": section_id,
            "slots": slots,
        }

    output = {"slot_lists": slot_lists, "version_drift_warnings": warnings}
    write_artefact(run_dir, 3, "slot-list", "complete" if not warnings else "warning", output, started, [], warnings)
    return output


# ---------------------------------------------------------------------------
# Stage 4-8 -- EXTRACT through SERIALISE (unchanged; calls extract.py)
# ---------------------------------------------------------------------------

def stage_4_5_6_7_8_extract(args, match_output: dict, run_dir: Path, run_ctx: dict | None = None) -> dict:
    """Stage 4-8 -- delegate to tools/recogniser-v2/extract.py (single-section v1)."""
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

    for m in matches:
        boundary_id = m["boundary_id"]
        target_block = m["block_name"]
        boundary = boundaries_by_id.get(boundary_id, {})
        section_selector = boundary.get("selector") or args.section
        if not section_selector:
            aggregate_warnings.append(f"{boundary_id}: no selector resolved; skipping")
            continue

        # Deferred fallback: matched block is core/group OR confidence is zero.
        # Phase 5g.3 — instead of emitting nothing, compose a wp:sgs/container
        # atomic-pattern from the source DOM (core/heading + core/paragraph +
        # sgs/button + sgs/decorative-image). This is the structural fix
        # for the "6 of 9 Mama's sections vapour on the page" gap.
        if target_block == "core/group" or m.get("confidence", 0) == 0:
            pattern_markup = composer_fallback().compose_atomic_pattern(
                args.mockup, section_selector,
                m.get("section_id") or boundary_id,
                boundary.get("class_signature", []),
            )
            # Schema-stable: every per_section_results entry carries the
            # full Step-4-era field set (Haiku QC panel finding 2026-05-14).
            # Deferred-fallback paths populate the trace fields with safe
            # empty defaults so any direct-key downstream consumer never
            # hits a KeyError.
            if pattern_markup:
                aggregate_markup_parts.append(pattern_markup)
                per_section_results.append({
                    "boundary_id": boundary_id,
                    "section_id": m.get("section_id"),
                    "selector": section_selector,
                    "block_name": "sgs/container",
                    "status": "deferred-composed-pattern",
                    "extract_path": "",
                    "extracted_attributes": {},
                    "block_markup": pattern_markup,
                    "token_resolutions": [],
                    "new_tokens_written": [],
                    "supports_decisions": [],
                    "supports_emitted_attributes": {},
                    "supports_omitted_attributes": {},
                    "modifier_signals": {},
                })
            else:
                aggregate_warnings.append(f"{boundary_id}: deferred fallback + no composable content, skipping")
                per_section_results.append({
                    "boundary_id": boundary_id,
                    "section_id": m.get("section_id"),
                    "selector": section_selector,
                    "block_name": target_block,
                    "status": "skipped-deferred",
                    "extract_path": "",
                    "extracted_attributes": {},
                    "block_markup": "",
                    "token_resolutions": [],
                    "new_tokens_written": [],
                    "supports_decisions": [],
                    "supports_emitted_attributes": {},
                    "supports_omitted_attributes": {},
                    "modifier_signals": {},
                })
            continue

        per_section_out = run_dir / f"extract-{boundary_id}.json"
        cmd = [
            sys.executable,
            str(REPO / "tools" / "recogniser-v2" / "extract.py"),
            "--mockup", str(args.mockup),
            "--section", section_selector,
            "--block", target_block,
            "--out", str(per_section_out),
        ]
        if args.media_map:
            cmd.extend(["--media-map", str(args.media_map)])
        if args.viewport:
            cmd.extend(["--viewport", str(args.viewport)])
        if args.no_playwright:
            cmd.append("--no-playwright")

        proc = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8")
        section_status = "complete"
        section_attrs: dict = {}
        section_markup = ""
        section_coverage: dict = {}
        if proc.returncode != 0:
            aggregate_errors.append(f"{boundary_id} ({section_selector} -> {target_block}): extract.py exit {proc.returncode}: {(proc.stderr or '')[:300]}")
            section_status = "failed"
        elif per_section_out.exists():
            try:
                extracted = json.loads(per_section_out.read_text(encoding="utf-8"))
                section_attrs = extracted.get("attributes") or {}
                section_markup = extracted.get("markup") or ""
                section_coverage = extracted.get("coverage") or {}
            except json.JSONDecodeError as e:
                aggregate_warnings.append(f"{boundary_id}: extract result malformed: {e}")
                section_status = "warning"

        # Stage 4.5 -- snap raw extracted values to theme.json token slugs
        # via token_resolver.resolve_batch (Phase 6 v2 Step 4a). For each attr:
        # if confidence >= threshold, replace raw value with token_slug so
        # block.json attributes hold slug references; else flag as gap candidate
        # for the (still-unwired) Stage 9 gap-writers to consume.
        section_token_resolutions: list[dict] = []
        if section_attrs and theme_json:
            try:
                tr = token_resolver()
                tr_items = [{"block_slug": target_block, "attr_name": k, "raw_value": v}
                            for k, v in section_attrs.items()]
                section_token_resolutions = tr.resolve_batch(tr_items, theme_json)
                for res in section_token_resolutions:
                    if not res.get("is_gap_candidate") and res.get("token_slug") is not None:
                        section_attrs[res["attr_name"]] = res["token_slug"]
            except Exception as exc:  # noqa: BLE001 - token snap is additive; soft-fail
                aggregate_warnings.append(f"{boundary_id}: token_resolver soft-failed: {exc}; raw values preserved")
                # Sonnet QC panel 2026-05-14: when 4a fails, 4b's
                # variation_router dispatch silently no-ops via the empty
                # section_token_resolutions guard. Surface that so operators
                # debugging a zero-new-tokens client run see the propagated
                # cause without having to read source.
                aggregate_warnings.append(f"{boundary_id}: variation_router gap-token writes also skipped (suppressed by upstream token_resolver failure)")

        # Stage 4.5 (Phase 6 v2 Step 4b) -- route every is_gap_candidate=true
        # resolution into the client's style variation JSON via variation_router.
        # Slug derivation reuses token-lint._generate_slug so candidates match
        # the rules tested in token-lint's additive-discovery suite. Soft-fail
        # so a variation write hiccup never breaks the extract loop.
        section_new_tokens_written: list[tuple[str, str]] = []
        _client_slug = getattr(args, "client", "") or ""
        if section_token_resolutions and _client_slug:
            try:
                vr = variation_router()
                tl = _token_lint()
                _theme_root = REPO / "theme" / "sgs-theme"
                for res in section_token_resolutions:
                    if not res.get("is_gap_candidate"):
                        continue
                    role = res.get("role")
                    raw_value = res.get("raw_value")
                    token_lint_class = _TOKEN_RESOLVER_ROLE_TO_TOKEN_LINT_CLASS.get(role)
                    if token_lint_class is None:
                        continue
                    if not isinstance(raw_value, str) or not raw_value.strip():
                        continue
                    slug = tl._generate_slug(token_lint_class, raw_value, res.get("attr_name", "") or "")
                    if not slug:
                        continue
                    report = vr.add_token(
                        _client_slug, role, slug, raw_value.strip(),
                        theme_root=_theme_root, write=True,
                    )
                    if report.get("action") in ("inserted", "updated"):
                        section_new_tokens_written.append((role, slug))
                        # Reflect the new token into the in-memory theme_json
                        # so the next section's token_resolver can snap to
                        # the new slug instead of re-flagging the same value.
                        _reflect_new_token_in_theme_json(theme_json, role, slug, raw_value)
            except Exception as exc:  # noqa: BLE001 - variation routing is additive; soft-fail
                aggregate_warnings.append(f"{boundary_id}: variation_router soft-failed: {exc}; gap tokens not written")

        # Load target block.json once -- consumed by Step 4c (supports_writer)
        # and Step 4d (modifier_extractors.match_block_variation). Soft-fail to
        # an empty dict so downstream dispatches no-op gracefully when the file
        # is missing (deferred fallback blocks, dynamically scaffolded blocks).
        _block_slug_local = target_block.split("/")[-1] if "/" in target_block else target_block
        _block_json_path = REPO / "plugins" / "sgs-blocks" / "src" / "blocks" / _block_slug_local / "block.json"
        block_json: dict = {}
        if _block_json_path.exists():
            try:
                block_json = json.loads(_block_json_path.read_text(encoding="utf-8"))
            except json.JSONDecodeError as exc:
                aggregate_warnings.append(f"{boundary_id}: block.json parse error: {exc}; downstream dispatches skipped")

        # Stage 5+6 prep (Phase 6 v2 Step 4c) -- supports-first override decision.
        # For each resolved attribute, ask supports_writer whether the value
        # matches the WP supports cascade default; emit-or-omit decision lands
        # on the per_section result so Step 4i staged-apply + Step 4j
        # wp_integration can strip cascade-matching overrides at deploy time.
        # supports_writer transitively loads value-matcher/inheritance.py so
        # the Phase 5 inheritance lookup fires through this single dispatch.
        # Soft-fail so a missing block.json or registry quirk never blocks
        # the extract loop -- absence of supports decisions == emit everything.
        section_supports_decisions: list[dict] = []
        section_supports_omitted: dict = {}
        section_supports_emitted: dict = dict(section_attrs)
        if section_attrs and theme_json and block_json:
            try:
                sw = supports_writer()
                decision_bundle = sw.filter_writes(target_block, section_attrs, block_json, theme_json)
                section_supports_decisions = decision_bundle.get("decisions") or []
                section_supports_omitted = decision_bundle.get("omitted_attributes") or {}
                section_supports_emitted = decision_bundle.get("emitted_attributes") or dict(section_attrs)
            except Exception as exc:  # noqa: BLE001 - supports decision is advisory; soft-fail
                aggregate_warnings.append(f"{boundary_id}: supports_writer soft-failed: {exc}; cascade override stripping skipped")

        # Stage 6 prep (Phase 6 v2 Step 4d) -- modifier_extractors classifies
        # post-extract / pre-emission modifiers. Three independent dispatches:
        #   button_role(visual_attrs)            -> primary/secondary/ghost
        #   dynamic_link(href)                   -> :verb(args) parse for FR25
        #   match_block_variation(block_json,    -> best registered variation +
        #                         extracted_attrs)  per-instance overrides
        # All three are pure functions; their outputs land on per_section_results
        # as modifier_signals so Step 7 compose / Step 4i staged-apply can act
        # on them. Soft-fail per dispatch -- one failing classifier never blocks
        # the others.
        section_modifier_signals: dict = {}
        if section_attrs:
            try:
                me = modifier_extractors()
                # button-role: only meaningful for button-shaped blocks.
                if "button" in (target_block or "").lower():
                    try:
                        section_modifier_signals["button_role"] = me.button_role(section_attrs)
                    except Exception as exc:  # noqa: BLE001
                        aggregate_warnings.append(f"{boundary_id}: modifier_extractors.button_role soft-failed: {exc}")
                # dynamic-link: parse every href-like attribute value once.
                dyn_links: dict = {}
                for k, v in section_attrs.items():
                    if not isinstance(v, str):
                        continue
                    if not v.lstrip().startswith(":"):
                        continue
                    parsed = me.dynamic_link(v)
                    if parsed.get("parsed"):
                        dyn_links[k] = parsed
                if dyn_links:
                    section_modifier_signals["dynamic_links"] = dyn_links
                # match-block-variation: only when block.json declares variations.
                if block_json.get("variations"):
                    try:
                        section_modifier_signals["block_variation"] = me.match_block_variation(
                            block_json, section_attrs,
                        )
                    except Exception as exc:  # noqa: BLE001
                        aggregate_warnings.append(f"{boundary_id}: modifier_extractors.match_block_variation soft-failed: {exc}")
            except Exception as exc:  # noqa: BLE001 - module load failure; soft-fail
                aggregate_warnings.append(f"{boundary_id}: modifier_extractors soft-failed: {exc}")

        per_section_results.append({
            "boundary_id": boundary_id,
            "section_id": m.get("section_id"),
            "selector": section_selector,
            "block_name": target_block,
            "status": section_status,
            "extract_path": str(per_section_out),
            "extracted_attributes": section_attrs,
            "block_markup": section_markup,
            "token_resolutions": section_token_resolutions,
            "new_tokens_written": section_new_tokens_written,
            "supports_decisions": section_supports_decisions,
            "supports_emitted_attributes": section_supports_emitted,
            "supports_omitted_attributes": section_supports_omitted,
            "modifier_signals": section_modifier_signals,
        })

        # Aggregate attributes prefixed with section_id so multi-section
        # results do not collide on the same attribute name (e.g. headline).
        section_id = m.get("section_id") or boundary_id
        for k, v in section_attrs.items():
            aggregate_attributes[f"{section_id}.{k}"] = v
        if section_markup:
            aggregate_markup_parts.append(section_markup)
        if section_coverage:
            aggregate_coverage[section_id] = section_coverage

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

    out = {
        "enabled": True,
        "promote_new_blocks": promote_new_blocks,
        "scaffolded": scaffolded,
        "scaffolded_count": len(scaffolded),
        "promoted_count": promoted_count,
        "candidates_seen": len(boundary_for_item),
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
    }
    status = "complete" if not errors else "failed"
    write_artefact(run_dir, 9, "report", status, output, started, errors, warnings)
    return output


# ---------------------------------------------------------------------------
# Driver
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="sgs-clone orchestrator (Phase 7 rewire)")
    parser.add_argument("--mockup", type=Path, required=True)
    parser.add_argument("--section", type=str, default=None, help="CSS selector for a single section")
    parser.add_argument("--auto-section", action="store_true", help="Auto-detect all top-level sections (Phase 8 forward)")
    parser.add_argument("--block", type=str, default=None, help="(deprecated; ignored when voter present) target block slug")
    parser.add_argument("--client", type=str, required=True)
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
    args = parser.parse_args()

    if not args.section and not args.auto_section:
        sys.exit("ERROR: provide --section <selector> or --auto-section")

    run_id = make_run_id(args.client, args.page)
    run_dir = REPO / "pipeline-state" / run_id
    run_dir.mkdir(parents=True, exist_ok=True)

    print(f"[orchestrator] run_id={run_id}")
    print(f"[orchestrator] run_dir={run_dir}")
    print(f"[orchestrator] mode={args.mode}")

    # Stage 0 -- THEME CACHE (Step 6a). Load theme.json + variation overlay once
    # per run. All downstream stages read from run_ctx["theme_json"] — single source
    # of truth. Mutations via _reflect_new_token_in_theme_json operate on the same
    # dict, so token discovery in section N is visible to section N+1.
    _theme_path = REPO / "theme" / "sgs-theme" / "theme.json"
    _variation_path = REPO / "theme" / "sgs-theme" / "styles" / f"{args.client}.json"
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
    css_lift = stage_0_7_css_lift(args.mockup, args.client, run_dir)
    print(f"[stage-0.7] css-lift: {css_lift.get('css_body_chars', 0)} chars from {len(css_lift.get('sources', []))} source(s) -> {css_lift.get('output_path','')}")

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
                stage_4j_summary["validate_block_markup"] = {
                    "status": validation.get("status"),
                    "errors": validation.get("errors") or [],
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
    #    each module; we pass require_schema=False to skip strict shape
    #    validation while the legacy artefact shape is still in flight.
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
        print(f"[autonomy] visual-qa capture: live (clone-url={args.clone_url})")
    else:
        capture_fn = vqa_capture.stub_capture
        print("[autonomy] visual-qa capture: stub (no --clone-url; autonomy will pass)")

    outcome = om.run(
        run_id=so_run_id,
        stage_handlers=handlers,
        capture_callable=capture_fn,
        sgs_update_cmd=[sys.executable,
                        str(Path.home() / ".claude/skills/sgs-wp-engine/scripts/update-db.py")],
        sgs_update_dry_run=True,  # safer default for an inline run
        require_schema=False,     # legacy artefact shapes feed the merger
    )
    print(f"[autonomy] outcome={outcome.overall} merge={outcome.merge_outcome} "
          f"decision={outcome.autonomy_decision} sgs_update_rc={outcome.sgs_update_returncode}")
    print(f"[autonomy] deliverable: {outcome.deliverable_path}")

    # 4. +REGISTER on success (writes pattern PHP files + sgs-db + uimax)
    if outcome.overall == "success" and not args.skip_register:
        register_result = reg_mod.register_run(
            run_id=so_run_id,
            extract_artefact={"output": extract_out},
            boundary_artefact=boundary,
        )
        print(reg_mod.summarise(register_result))
    elif args.skip_register:
        print("[+REGISTER] skipped per --skip-register")
    else:
        print(f"[+REGISTER] skipped: autonomy outcome={outcome.overall} (not 'success')")

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
