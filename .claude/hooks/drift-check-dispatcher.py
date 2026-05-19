#!/usr/bin/env python3
"""drift-check-dispatcher.py — single PostToolUse hook that runs 5 lightweight
drift checks against cloning-pipeline-flow.md + Spec 16 + DB schema.

POSTURE (mixed, per Bean 2026-05-21):
  Checks 1/3/4/5: POSTURE A (warn-only, exit 0). systemMessage JSON output.
  Check 2 (DB schema): POSTURE B (BLOCK, exit 2, stderr). DB drift is silently
    dangerous — a renamed column or row-count divergence can break the
    pipeline without obvious surface. Posture B forces Claude to address it
    before continuing.

Triggered by Edit/Write/Bash via .claude/settings.json. Internal path-filter
gates each check — typical fire is one early-exit + zero file reads.

5 checks (file-path-scoped):
  1. SCRIPT INVENTORY DRIFT  — Edit/Write on *.py under pipeline dirs (A)
  2. DB SCHEMA DRIFT          — Bash containing 'sgs-update' OR 'sgs-framework.db' (B)
  3. SKILL DISPATCH DRIFT     — Edit/Write on ~/.claude/skills/*/SKILL.md (A)
  4. STAGE STATUS NUDGE       — Edit/Write on stage-owning scripts (A)
  5. SPEC 16 FR/R DRIFT       — Edit/Write on cv2 / orchestrator surface (A)

Captured 2026-05-21.
"""
from __future__ import annotations

import json
import os
import re
import sqlite3
import sys
from pathlib import Path

# Re-encode stdout for emoji-free UK English compatibility
sys.stdout.reconfigure(encoding="utf-8")

# ---------- locate project + truth docs ----------
PROJECT = Path(__file__).resolve().parents[2]
FLOW_DOC = PROJECT / ".claude" / "cloning-pipeline-flow.md"
SPEC_16 = PROJECT / ".claude" / "specs" / "16-DETERMINISTIC-CONVERTER-V2.md"
SGS_DB = Path.home() / ".agents" / "skills" / "sgs-wp-engine" / "sgs-framework.db"

# Pipeline-script roots (relative to project)
PIPELINE_SCRIPT_DIRS = (
    "plugins/sgs-blocks/scripts/",
    "tools/recogniser-v2/",
    "tools/recogniser/",
    "scripts/",
)

# Stage-owning module patterns (for Stage status nudge)
STAGE_OWNERS = {
    "stage1_boundary_hook.py": "Stage 1",
    "per-section-convention-voter.py": "Stage 1",
    "confidence-matrix.py": "Stage 2",
    "leftover-bucket-router.py": "Stage 2 + Stage 9",
    "bucket-c-classifier.py": "Stage 9b autonomy chain",
    "atomic-block-scaffold.py": "Stage 9b autonomy chain",
    "convert.py": "Stages 4-7 (cv2 walker)",
    "convert_page.py": "Stages 4-7 (cv2 full-page)",
    "db_lookup.py": "Stages 3-7 (canonical DB lookups)",
    "autonomy_gate.py": "Stage 8",
    "visual_qa_capture.py": "Stage 8",
    "staged_merge.py": "Stage 7b",
    "supports_writer.py": "Stage 5 + Stage 6",
    "token_resolver.py": "Stage 4.5",
    "variation_router.py": "Stage 4.5",
    "modifier_extractors.py": "Stage 4",
    "wp_integration.py": "Pre-deploy gate (Stage 4j)",
    "register_patterns.py": "+REGISTER tail",
    "critical-fix-verification.py": "Final acceptance harness",
    "bem-lint.py": "Stage 0.1",
    "token-lint.py": "Stage 0.5",
    "sgs-clone-orchestrator.py": "Orchestrator entry-point (all stages)",
    "uimax-write-validator.py": "+REGISTER chokepoint (Rosetta Stone gate)",
}

# Spec 16 §3 FR-referenced functions / constants
SPEC_16_FR_SYMBOLS = (
    "convert_section", "walk", "lift_subtree_into_block_attrs",
    "_lift_styling_attrs", "_lift_root_supports_to_style",
    "_record_gap_candidate", "write_attribute_gap_candidate",
    "propose_attr_name", "seed_gap_context",
    "_detect_client_layout_widths", "_match_theme_width",
    "_collect_css_decls_for_element", "_SUPPORTS_HANDLED_PROPS",
)


# ---------- output helper ----------
def emit(message: str) -> None:
    """Posture A: exit 0 with systemMessage. Multiple findings stack."""
    out = {"continue": True, "suppressOutput": False, "systemMessage": message}
    print(json.dumps(out))


def _read_text(p: Path) -> str:
    try:
        return p.read_text(encoding="utf-8")
    except Exception:
        return ""


# ---------- Check 1 — Script inventory drift ----------
def check_script_inventory(file_path: str, tool_name: str) -> str | None:
    if tool_name not in ("Write", "Edit"):
        return None
    if not file_path.endswith(".py"):
        return None
    rel = file_path.replace(str(PROJECT).replace("\\", "/"), "").lstrip("/\\")
    if not any(rel.startswith(d) for d in PIPELINE_SCRIPT_DIRS):
        return None
    basename = Path(file_path).name
    flow = _read_text(FLOW_DOC)
    if not flow:
        return None
    if basename not in flow:
        return (
            f"[drift-check 1/5 Script inventory] {basename} edited under a pipeline dir but "
            f"isn't mentioned in cloning-pipeline-flow.md. If new, add an entry to the "
            f"Script inventory section. If renamed, update both names."
        )
    return None


# ---------- Check 2 — DB schema drift ----------
def check_db_schema(tool_name: str, tool_input: dict) -> str | None:
    if tool_name != "Bash":
        return None
    cmd = (tool_input or {}).get("command", "")
    if not re.search(r"sgs-update|sgs-framework\.db|/sgs-update", cmd):
        return None
    if not SGS_DB.exists():
        return None
    try:
        con = sqlite3.connect(f"file:{SGS_DB}?mode=ro", uri=True)
        # Spot-check the row counts most likely to drift (Spec 16 §12 claims)
        rows = {}
        for tbl in ("property_suffixes", "modifier_suffixes", "slot_synonyms",
                    "blocks", "block_attributes", "legacy_role_lookup"):
            try:
                rows[tbl] = con.execute(f"SELECT COUNT(*) FROM {tbl}").fetchone()[0]
            except sqlite3.Error:
                rows[tbl] = None
        con.close()
    except Exception:
        return None
    # Compare to flow doc / Spec 16 hardcoded counts.
    # TIGHT pattern: only match "<table> ... (<N> rows|entries|items)" where
    # the parenthesised count is within 40 chars of the table name. Looser
    # regex caused false positives (matched adjacent table's count in 5-line
    # window). Tested 2026-05-21.
    flow = _read_text(FLOW_DOC) + "\n" + _read_text(SPEC_16)
    mismatches = []
    for tbl, count in rows.items():
        if count is None:
            continue
        pattern = rf"\b{re.escape(tbl)}\b[^\n]{{0,40}}\((\d+)\s+(?:rows?|entries|items|attrs)\b"
        for m in re.finditer(pattern, flow, re.IGNORECASE):
            claimed = int(m.group(1))
            if claimed != count:
                mismatches.append(f"{tbl}: doc claims {claimed}, DB has {count}")
                break  # one per table is enough
    if mismatches:
        return (
            f"[drift-check 2/5 DB schema] Row counts in cloning-pipeline-flow.md / Spec 16 "
            f"diverge from sgs-framework.db: " + "; ".join(mismatches) +
            ". Update the doc counts."
        )
    return None


# ---------- Check 3 — Skill dispatch drift ----------
def check_skill_dispatch(file_path: str, tool_name: str) -> str | None:
    if tool_name not in ("Write", "Edit"):
        return None
    fp = file_path.replace("\\", "/")
    m = re.search(r"\.claude/skills/([^/]+)/SKILL\.md$", fp)
    if not m:
        return None
    skill_name = m.group(1)
    flow = _read_text(FLOW_DOC)
    if not flow:
        return None
    # Only fire for skills the pipeline could plausibly dispatch
    if skill_name.startswith(("uimax", "sgs", "wp", "design", "visual", "research")):
        if f"/{skill_name}" not in flow and skill_name not in flow:
            return (
                f"[drift-check 3/5 Skill dispatch] /{skill_name} SKILL.md edited but "
                f"isn't referenced in cloning-pipeline-flow.md. If the skill is a pipeline "
                f"dispatch target, add it to the Skill dispatch chain section."
            )
    return None


# ---------- Check 4 — Stage status nudge ----------
def check_stage_status_nudge(file_path: str, tool_name: str) -> str | None:
    if tool_name not in ("Write", "Edit"):
        return None
    basename = Path(file_path).name
    if basename not in STAGE_OWNERS:
        return None
    stage = STAGE_OWNERS[basename]
    return (
        f"[drift-check 4/5 Stage status nudge] {basename} owns {stage}. After this edit, "
        f"verify the STATUS line for {stage} in cloning-pipeline-flow.md still matches "
        f"the new code reality. Reminder only — no automated check."
    )


# ---------- Check 5 — Spec 16 FR/R drift ----------
def check_spec_16_fr_drift(file_path: str, tool_name: str) -> str | None:
    if tool_name not in ("Write", "Edit"):
        return None
    fp = file_path.replace("\\", "/")
    if not ("orchestrator/converter_v2/" in fp or "orchestrator_main.py" in fp or
            "autonomy_gate.py" in fp or "sgs-clone-orchestrator.py" in fp):
        return None
    # Surface a nudge only — actual symbol-presence check would require reading
    # the file post-edit, which is heavier. Keep the hook cheap.
    return (
        f"[drift-check 5/5 Spec 16 FR/R nudge] {Path(file_path).name} is in the cv2 / "
        f"orchestrator surface that Spec 16 §3 FR1-FR9 + §2 R1-R5 describe. After this "
        f"edit, verify the corresponding FR/R status entries in "
        f".claude/specs/16-DETERMINISTIC-CONVERTER-V2.md still match. Reminder only."
    )


# ---------- main dispatch ----------
def main() -> int:
    try:
        payload = json.loads(sys.stdin.read())
    except Exception:
        return 0  # malformed input → fail silent
    tool_name = payload.get("tool_name", "")
    tool_input = payload.get("tool_input") or {}
    file_path = tool_input.get("file_path", "") if isinstance(tool_input, dict) else ""

    # Posture A checks (warn via systemMessage, exit 0)
    warn_messages: list[str] = []
    for check in (
        lambda: check_script_inventory(file_path, tool_name),
        lambda: check_skill_dispatch(file_path, tool_name),
        lambda: check_stage_status_nudge(file_path, tool_name),
        lambda: check_spec_16_fr_drift(file_path, tool_name),
    ):
        try:
            m = check()
            if m:
                warn_messages.append(m)
        except Exception:
            pass  # never block on a buggy check

    # Posture B check (DB schema drift) — blocks via stderr + exit 2
    db_block_message = None
    try:
        db_block_message = check_db_schema(tool_name, tool_input)
    except Exception:
        pass

    if warn_messages:
        emit("\n\n".join(warn_messages))

    if db_block_message:
        sys.stderr.write(
            "DRIFT BLOCK (posture B — DB schema):\n"
            + db_block_message
            + "\n\nDB schema drift is silently dangerous (renamed column / missing row count "
            "can break the pipeline without an obvious surface). Update the affected counts in "
            "cloning-pipeline-flow.md DB heat-map AND/OR Spec 16 §12.4/§12.5 before continuing.\n"
        )
        return 2

    return 0


if __name__ == "__main__":
    sys.exit(main())
