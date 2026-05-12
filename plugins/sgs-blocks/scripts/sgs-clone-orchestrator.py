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

VOTER_SCRIPT = RECOGNISER_DIR / "per-section-convention-voter.py"
MATRIX_SCRIPT = RECOGNISER_DIR / "confidence-matrix.py"
ROUTER_SCRIPT = RECOGNISER_DIR / "leftover-bucket-router.py"
REVIEW_SCRIPT = RECOGNISER_DIR / "simple_html_review_report.py"


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
    """Import a python file whose name contains hyphens (e.g. confidence-matrix.py)."""
    spec = importlib.util.spec_from_file_location(module_name, path)
    if spec is None or spec.loader is None:
        raise ImportError(f"Could not load module from {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


# Lazy-import the confidence-matrix module on first call.
_confidence_matrix_mod = None


def confidence_matrix():
    global _confidence_matrix_mod
    if _confidence_matrix_mod is None:
        _confidence_matrix_mod = _load_module_from_path("sgs_confidence_matrix", MATRIX_SCRIPT)
    return _confidence_matrix_mod


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

        # Skip extract entirely when the matched block is the deferred core/group
        # fallback -- the section is in the leftover bucket already and extract.py
        # has no real target.
        if target_block == "core/group" or m.get("confidence", 0) == 0:
            aggregate_warnings.append(f"{boundary_id}: deferred fallback, skipping extract")
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

        per_section_results.append({
            "boundary_id": boundary_id,
            "section_id": m.get("section_id"),
            "selector": section_selector,
            "block_name": target_block,
            "status": section_status,
            "extract_path": str(per_section_out),
            "extracted_attributes": section_attrs,
            "block_markup": section_markup,
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


def stage_9_report(boundary: dict, match: dict, slot_list: dict, extract: dict, run_dir: Path) -> dict:
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
    extracted_attrs = (extract or {}).get("extracted_attributes") or {}
    slot_lists = (slot_list or {}).get("slot_lists") or {}
    coverage_by_boundary: dict[str, dict] = {}
    for boundary_id, scaffold in slot_lists.items():
        slots = scaffold.get("slots", [])
        open_slots = [s["slot_name"] for s in slots if s["slot_name"] not in extracted_attrs]
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

    report = stage_9_report(boundary, match, slot_list, extract_out, run_dir)
    print(f"[stage-9] leftover entries: {report['leftover_total_count']} across {sum(1 for v in report['leftover_totals'].values() if v > 0)} buckets")
    print(f"[stage-9] recognition_log rows inserted: {report['recognition_log_rows_inserted']}")
    print(f"[stage-9] operator-review: {report['operator_review_html_path']}")
    print(f"[orchestrator] DONE. Artefacts in {run_dir}")


if __name__ == "__main__":
    main()
