---
doc_type: phase-plan
project: small-giants-wp
phase: 0.5
phase_name: Structural QC Enforcement Hook
session_marker: Step 0.5.1 (single-step phase — entire phase is one session)
calibrated_time: ~25 min (10-15 min build + 10 min /qc-inline gate)
prerequisites: Phase 0 (SHIPPED commit aec54882)
parallel_with: none — must ship before Phase 1 dispatches
qc_gate_after: /qc-inline (smoke test on hook + settings.json load)
generated: 2026-05-21
---

# Phase 0.5 — Structural QC Enforcement Hook

## Plain-English goal

Three commits in the prior session shipped without running the multi-model /qc panel that binding rule blub.db 255 requires. That rule depends on Claude remembering it; that is provably insufficient. This phase builds a hook that makes the gate structural: when Write/Edit targets the converter or orchestrator files, a transient tracker notes the edit. When a subsequent git commit command runs on those paths without a `[qc:<run_id>]` marker, a systemMessage warning fires naming the missing gate. No human memory required. ADHD Rule 10 principle: structural enforcement, not remembered discipline. After this ships, every subsequent phase's commits are gated by this hook — making Phase 0.5 a pre-requisite multiplier for the entire programme.

## Decisions in scope

- **Decision 31** (§11) — PostToolUse + PreToolUse hook pair for converter/orchestrator edit tracking

## Risk mitigations (from risk-assessment.md)

| Risk | Mitigation step |
|---|---|
| Marker-in-commit-body is too easy to forget → hook becomes "annoying noise" | Step 0.5.1c: use transient file presence test (objective), not text matching in body |
| Pattern too broad → false-positive on lucide-icons.php edits | Step 0.5.1b: explicit exclusion test; false-positive verified before commit |
| PostToolUse doesn't fire on Bash heredoc writes to watched files | Step 0.5.1b: PreToolUse on Bash also added, matching `*convert.py*` / `*orchestrator*` patterns |

## Pre-resolved decisions (from hidden-decisions.md)

- **Hard-block vs warning-only** → warning-only (systemMessage). Commits proceed. Marker `[qc-skipped:<reason>]` bypasses intentionally. Escalate to hard-block only if compliance <80% after 5 commits.
- **Session state persistence across turns** → transient file `.claude/.qc-edit-tracker.json`; stale-purge entries older than 2 hours on every read.

---

## Steps

### Step 0.5.1 — Build hook + tracker + settings.json registration

- **Action:** Create `.claude/hooks/qc-on-converter-edit.py` (PostToolUse + PreToolUse combined handler), create `.claude/.qc-edit-tracker.json` (initial empty), update `.claude/settings.json` to register both hooks. Add `--self-test` CLI mode to the hook for explicit verification. Include explicit exclusion test for `lucide-icons.php` and all non-converter paths under sgs-blocks.
- **Files:**
  - CREATE `c:/Users/Bean/.claude/hooks/qc-on-converter-edit.py`
  - CREATE `c:/Users/Bean/Projects/small-giants-wp/.claude/.qc-edit-tracker.json`
  - MODIFY `c:/Users/Bean/Projects/small-giants-wp/.claude/settings.json`
- **Inputs:** staging doc §11 Decision 31 design; risk-assessment Phase 0.5 risk mitigations; hidden-decisions Phase 0.5 resolutions; existing hook shape from `~/.claude/hooks/drift-check-dispatcher.py`
- **Outputs:** Working hook that fires warning on watched-file edits before unguarded commits; settings.json with PostToolUse + PreToolUse registrations; tracker JSON initialised
- **Time:** 10-15 min
- **Tooling:** Write tool (new files), Edit tool (settings.json). No MCP needed.
- **On-Fail:** If settings.json fails to load after edit, revert settings.json entry and report — hook not in place but phase does not block Phase 1 from dispatching (warning-only gate, not hard dependency). Phase 1 proceeds without the hook; fix hook in parallel.
- **QC gate:** Self-test via `python qc-on-converter-edit.py --self-test` then /qc-inline (3-check inline review: hook fires on watched path, hook silent on lucide-icons.php, settings.json loads without error)
- **Session marker:** This is the only step. Full phase fits in one session block.

**Verification sequence (before committing):**

1. No-op whitespace edit to `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py` → attempt `git commit -m "test"` → confirm systemMessage warning fires citing missing `[qc:...]` marker.
2. Edit `plugins/sgs-blocks/includes/lucide-icons.php` → attempt commit → confirm NO warning fires.
3. `python ~/.claude/hooks/qc-on-converter-edit.py --self-test` exits 0.

---

## Acceptance criteria

- `c:/Users/Bean/.claude/hooks/qc-on-converter-edit.py` exists, passes self-test, wraps all logic in try/except
- `.claude/.qc-edit-tracker.json` exists at project root with valid JSON `{"edits": []}`
- `.claude/settings.json` has PostToolUse entry for watched paths + PreToolUse entry on Bash git-commit matching
- False-positive test (lucide-icons.php) passes cleanly — no warning fires
- True-positive test (convert.py edit → commit without marker) fires systemMessage
- Settings load verified — no Claude Code startup error

## Subagent cold prompt (for the orchestrator to dispatch)

```
You are implementing Decision 31 (Structural QC enforcement hook) from the SGS architecture programme.

# Plain-English context

Three commits in the previous session shipped without running the multi-model /qc panel that binding rule blub.db 255 requires. The rule depends on Claude remembering it; that's provably insufficient. Your job: build a hook that makes the gate structural.

# Read first

- .claude/plans/2026-05-21-architecture-staging.md §11 Decision 31 (the design)
- .claude/reports/strategic-plan-2026-05-21/risk-assessment.md Phase 0.5 section (3 risks + mitigations)
- .claude/reports/strategic-plan-2026-05-21/hidden-decisions.md Phase 0.5 section (pre-resolved decisions)
- An existing hook for shape reference: ~/.claude/hooks/drift-check-dispatcher.py

# What to build

1. NEW FILE: `~/.claude/hooks/qc-on-converter-edit.py`
2. Behaviour:
   - PostToolUse hook fires when Write/Edit targets these EXACT paths (partial match sufficient):
     - `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py`
     - `plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py`
     - `plugins/sgs-blocks/scripts/sgs-update.py` (Phase 4 will create it; future-proof now)
   - On those edits, write a transient marker to `.claude/.qc-edit-tracker.json` (path + ISO timestamp + tool name)
   - Stale-purge entries older than 2 hours from the tracker on every read
   - ALSO: PreToolUse hook on Bash commands matching `git commit`. If the tracker has a live (non-stale) entry on a converter path AND the commit command does NOT contain `[qc:` or `[qc-skipped:`, emit systemMessage warning naming the missing gate. Warning only — do NOT block. Use permissionDecision: "allow" + systemMessage (NEVER `decision: "allow"` — blub.db feedback_cc_hook_schema_decision_allow).
3. NEW FILE: `.claude/.qc-edit-tracker.json` at project root with content `{"edits": []}` 
4. UPDATE: `.claude/settings.json` — register PostToolUse entry (watched file paths) + PreToolUse entry (Bash git commit matching)

# Safety scope

- ONLY fire on the 3 specific converter/orchestrator/update paths above. Add explicit exclusion test: if `lucide-icons.php` or any path NOT matching the 3 watched patterns, hook is silent.
- Wrap ALL logic in try/except. On any exception, log to stderr and exit cleanly — hook must never crash the session.
- Use permissionDecision: "allow" + systemMessage for warnings. Never decision: "allow". Never decision: "block" (warning-only, never blocking).

# Self-test mode

Add `if __name__ == '__main__' and '--self-test' in sys.argv:` block that runs 3 assertions:
1. Simulates watched-path edit entry + prints "QC warning would fire: YES"
2. Simulates lucide-icons.php edit + prints "QC warning would fire: NO (false-positive excluded)"
3. Simulates stale entry (3 hours old) + prints "Stale entry purged: YES"
Exit 0 if all 3 pass; exit 1 with failure reason if any fail.

# Verification gate (run before committing)

1. python ~/.claude/hooks/qc-on-converter-edit.py --self-test → exit 0
2. No-op whitespace edit to convert.py → attempt git commit without [qc:] marker → confirm systemMessage fires
3. Edit lucide-icons.php → attempt commit → confirm NO warning fires (false-positive clean)

# Commit gate

Do NOT commit if:
- --self-test exits non-zero
- The lucide-icons.php false-positive test fires the warning
- settings.json fails to load after editing

Commit message: "feat(phase-0.5): structural QC enforcement hook + edit tracker — Decision 31 [qc:phase-0.5-self-verify]"

# Time budget

15 min realistic. 30 min ceiling. At ceiling, stop and report status.

# Methodology guardrails (do not skip)
- blub.db 254 — Read pipeline-state/<run>/leftover-buckets.json BEFORE conjecturing
- blub.db 255 — Multi-model /qc panel BEFORE every converter/pipeline/SGS-block commit (this phase IS the structural fix for that rule)
- blub.db 256 — Per-section cropped pixel-diff, never full-page
- blub.db 272 — Schema enumeration BEFORE missing-X claims
- blub.db 276 — Council fix-shape proposals are hypotheses; empirical pre/post baseline required
- blub.db 281 — QC gate must be structural; commit messages MUST cite [qc:<run_id>] for converter/orchestrator path commits
- No git stash, reset --hard, restore, checkout --, clean -f
- No --no-verify
- No Co-Authored-By
- Commit by exact path (never `git add .` or -A)
- Stay on main directly
```

## Post-phase QC

/qc-inline — 3 checks:
1. Hook file exists + passes self-test (file presence + exit code)
2. Settings.json has both hook registrations (grep for hook filename)
3. Tracker JSON is valid (python -c "import json; json.load(open('.claude/.qc-edit-tracker.json'))")

No /qc-council needed for Phase 0.5 — it is non-converter infrastructure. /qc-council gates Phase 1 and beyond, where the hook is now active.
