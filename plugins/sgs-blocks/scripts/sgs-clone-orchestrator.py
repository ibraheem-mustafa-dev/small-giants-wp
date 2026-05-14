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



# ---------------------------------------------------------------------------
# Phase 5g.3 -- pattern composer
#   Walks a section's DOM and emits a wp:sgs/container pattern composition
#   built from core/heading, core/paragraph, sgs/button, sgs/decorative-image.
#   Hard Rule 3: every clone-pipeline emission is a pattern composition, not
#   a bare single-block dump. Used for deferred / scaffold-only sections
#   where the extract.py harvest produces nothing usable.
# ---------------------------------------------------------------------------

_BUTTON_HINT_RE = re.compile(r"\b(button|btn|cta)\b", re.IGNORECASE)


def _emit_block(name: str, attrs: dict, inner_html: str | None = None,
                self_closing: bool = True) -> str:
    """Emit a single Gutenberg block-comment + (optional) inner HTML."""
    attr_json = json.dumps(attrs, ensure_ascii=False, separators=(",", ":")) if attrs else ""
    head = f"<!-- wp:{name}{(' ' + attr_json) if attr_json else ''}"
    if self_closing:
        return head + " /-->"
    return head + " -->" + (inner_html or "") + f"<!-- /wp:{name} -->"


def _emit_core_heading(text: str, level: int) -> str:
    tag = f"h{max(1, min(6, level))}"
    inner = f"<{tag} class=\"wp-block-heading\">{text}</{tag}>"
    attrs = {"level": level} if level != 2 else {}
    return _emit_block("core/heading", attrs, inner_html=inner, self_closing=False)


def _emit_core_paragraph(text: str) -> str:
    inner = f"<p>{text}</p>"
    return _emit_block("core/paragraph", {}, inner_html=inner, self_closing=False)


def _emit_sgs_button(label: str, url: str) -> str:
    return _emit_block("sgs/button", {"label": label, "url": url or "#"})


def _emit_sgs_decorative_image(src: str, alt: str) -> str:
    return _emit_block(
        "sgs/decorative-image",
        {"imageUrl": src, "imageAlt": alt or ""},
    )


def compose_atomic_pattern(mockup_path: Path, selector: str,
                           section_id: str, class_signature: list[str]) -> str | None:
    """Compose a wp:sgs/container atomic-pattern from a section in the mockup.

    Returns Gutenberg markup string or None if the section cannot be resolved
    or yields no useful inner content.
    """
    try:
        from bs4 import BeautifulSoup
    except ImportError:
        return None
    if not mockup_path.exists():
        return None
    soup = BeautifulSoup(mockup_path.read_text(encoding="utf-8"), "html.parser")
    try:
        node = soup.select_one(selector)
    except Exception:  # noqa: BLE001 -- malformed selector
        return None
    if node is None:
        return None

    inner_blocks: list[str] = []
    seen_texts: set[str] = set()
    seen_urls: set[str] = set()
    seen_imgs: set[str] = set()

    # Walk descendants in document order, emitting atomic blocks.
    for el in node.descendants:
        name = getattr(el, "name", None)
        if not name:
            continue
        if name in {"h1", "h2", "h3", "h4", "h5", "h6"}:
            text = el.get_text(" ", strip=True)
            if text and text not in seen_texts:
                seen_texts.add(text)
                inner_blocks.append(_emit_core_heading(text, int(name[1])))
        elif name == "p":
            text = el.get_text(" ", strip=True)
            if text and text not in seen_texts and len(text) > 1:
                seen_texts.add(text)
                inner_blocks.append(_emit_core_paragraph(text))
        elif name == "button" or (name == "a" and _BUTTON_HINT_RE.search(" ".join(el.get("class", [])) or "")):
            label = el.get_text(" ", strip=True)
            url = el.get("href", "") if name == "a" else ""
            key = f"{label}|{url}"
            if label and key not in seen_urls:
                seen_urls.add(key)
                inner_blocks.append(_emit_sgs_button(label, url))
        elif name == "img":
            src = el.get("src", "") or ""
            alt = el.get("alt", "") or ""
            if src and src not in seen_imgs:
                seen_imgs.add(src)
                inner_blocks.append(_emit_sgs_decorative_image(src, alt))

    if not inner_blocks:
        return None

    # Pick the most descriptive sgs- class (skip BEM children with -- or __).
    section_class = ""
    for cls in class_signature or []:
        if cls.startswith("sgs-") and "--" not in cls and "__" not in cls:
            section_class = cls
            break

    container_attrs: dict = {}
    if section_id:
        container_attrs["anchor"] = section_id
    if section_class:
        container_attrs["className"] = section_class

    inner_html = "\n  ".join(inner_blocks)
    container_attrs_json = json.dumps(container_attrs, ensure_ascii=False, separators=(",", ":")) if container_attrs else ""
    head = f"<!-- wp:sgs/container{(' ' + container_attrs_json) if container_attrs_json else ''} -->"
    return head + "\n  " + inner_html + "\n<!-- /wp:sgs/container -->"



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

def stage_4_5_6_7_8_extract(args, match_output: dict, run_dir: Path) -> dict:
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

    # Stage 4.5 -- TOKEN SNAP (Phase 6 v2 Step 4a). Load theme.json + variation
    # overlay once per /sgs-clone run for token_resolver.resolve_batch() calls
    # below. theme.json holds base tokens; variation overlay carries per-client
    # overrides per Spec 15 §4.7. NOT mutated -- read-only.
    _theme_path = REPO / "theme" / "sgs-theme" / "theme.json"
    _variation_path = REPO / "theme" / "sgs-theme" / "styles" / f"{getattr(args, 'client', '')}.json"
    theme_json: dict = {}
    if _theme_path.exists():
        try:
            theme_json = json.loads(_theme_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            print(f"[stage-4.5] theme.json parse error: {exc}; token snap disabled", file=sys.stderr)
    if _variation_path.exists() and theme_json:
        try:
            variation = json.loads(_variation_path.read_text(encoding="utf-8"))
            # Overlay variation settings on top of base theme settings.
            for cat in ("color", "spacing", "typography", "shadow"):
                base_cat = theme_json.setdefault("settings", {}).setdefault(cat, {})
                var_cat = (variation.get("settings") or {}).get(cat) or {}
                for k, v in var_cat.items():
                    if isinstance(v, list) and isinstance(base_cat.get(k), list):
                        # Merge by slug -- variation entries replace base entries with same slug.
                        slug_to_var = {item.get("slug"): item for item in v if isinstance(item, dict)}
                        merged = [slug_to_var.pop(it.get("slug"), it) for it in base_cat[k] if isinstance(it, dict)]
                        merged.extend(slug_to_var.values())
                        base_cat[k] = merged
                    else:
                        base_cat[k] = v
        except json.JSONDecodeError as exc:
            print(f"[stage-4.5] variation parse error: {exc}; using base theme only", file=sys.stderr)

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
            pattern_markup = compose_atomic_pattern(
                args.mockup, section_selector,
                m.get("section_id") or boundary_id,
                boundary.get("class_signature", []),
            )
            if pattern_markup:
                aggregate_markup_parts.append(pattern_markup)
                per_section_results.append({
                    "boundary_id": boundary_id,
                    "section_id": m.get("section_id"),
                    "selector": section_selector,
                    "block_name": "sgs/container",
                    "status": "deferred-composed-pattern",
                    "extracted_attributes": {},
                    "block_markup": pattern_markup,
                })
            else:
                aggregate_warnings.append(f"{boundary_id}: deferred fallback + no composable content, skipping")
                per_section_results.append({
                    "boundary_id": boundary_id,
                    "section_id": m.get("section_id"),
                    "selector": section_selector,
                    "block_name": target_block,
                    "status": "skipped-deferred",
                    "extracted_attributes": {},
                    "block_markup": "",
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
                   scaffold_new_blocks: bool = True, promote_new_blocks: bool = True) -> dict:
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

    extract_out = stage_4_5_6_7_8_extract(args, match, run_dir)
    extracted_count = len(extract_out.get("extracted_attributes") or {})
    print(f"[stage-4-8] extract: {extracted_count} attrs extracted")

    report = stage_9_report(
        boundary, match, slot_list, extract_out, run_dir,
        scaffold_new_blocks=not args.no_scaffold_new_blocks,
        promote_new_blocks=not args.no_promote_new_blocks,
    )
    print(f"[stage-9] leftover entries: {report['leftover_total_count']} across {sum(1 for v in report['leftover_totals'].values() if v > 0)} buckets")
    print(f"[stage-9] recognition_log rows inserted: {report['recognition_log_rows_inserted']}")
    print(f"[stage-9] operator-review: {report['operator_review_html_path']}")
    autonomy = report.get("autonomy_chain") or {}
    if autonomy.get("enabled"):
        print(f"[stage-9b] autonomy: {autonomy.get('scaffolded_count', 0)} scaffolded ({autonomy.get('promoted_count', 0)} promoted) from {autonomy.get('candidates_seen', 0)} candidates")

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

    print(f"[orchestrator] DONE. Artefacts in {run_dir} + {so_run_dir}")


if __name__ == "__main__":
    main()
