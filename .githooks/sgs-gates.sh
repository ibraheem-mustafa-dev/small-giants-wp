#!/bin/sh
#
# SGS commit gates — the VERSION-CONTROLLED logic (D564, 2026-08-11).
#
# WHY THIS FILE EXISTS
# --------------------
# `.githooks/README.md` sets out the intended split: `.git/hooks/pre-commit` is a
# thin PER-MACHINE wrapper (it carries the Gitleaks scanner Blub installs, whose
# path differs per machine and which is not this repo's concern), and `.githooks/`
# holds the check LOGIC under version control.
#
# That split had drifted. ~200 lines of SGS-specific gate logic — the visual-diff
# gate and its five auto-skip branches, the M1 CSS first-paint audit, the Stage
# 0.1/0.5 mockup lints, the wp-* pre-merge gate and Gate A — lived only in the
# untracked wrapper. Every one of them therefore existed on exactly one machine:
# a fresh clone, a second worktree, or a co-active session on another box got
# none of them, while the tracked half looked like the whole defence. One comment
# inside the wrapper had already recorded the consequence in 2026-07-29 ("NOTE:
# .git/hooks/ is untracked, so this fix is LOCAL ONLY and will not reach other
# clones") without the logic ever being moved.
#
# Moving the logic here fixes that WITHOUT repointing `core.hooksPath`, which
# README.md explicitly forbids (it would disable the Gitleaks scanner).
#
# INVOCATION
# ----------
#   .git/hooks/pre-commit  →  gitleaks (machine-specific)
#                          →  sh .githooks/sgs-gates.sh     ← this file
#                          →  sh .githooks/pre-commit       ← the commit floor
#
# Exits non-zero if any blocking gate fails; the wrapper propagates it.
# Bypass is `--no-verify`, which discards every gate at once — that is the trade
# the auto-skip branches inside the visual-diff gate exist to make unnecessary.
#
# ⛔ Do NOT re-inline this into `.git/hooks/pre-commit`. Untracked means invisible
#    to review, absent from other clones, and lost on a re-clone.

# SGS block uniformity audit — runs only when block.json files are staged
if git diff --cached --name-only | grep -q "plugins/sgs-blocks/src/blocks/.*\.json$"; then
    echo "Running SGS block uniformity audit..."
    python plugins/sgs-blocks/scripts/audit-block-uniformity.py || exit 1
fi

# ─── SGS Visual QC STOP GATE ────────────────────────────────────────────────
# Enforces M4 from common-wp-styling-errors.md: Phase 3 STOP GATE must be a
# hard gate, not an honour system.

REPO_ROOT=$(git rev-parse --show-toplevel)
SGS_EXIT=0

# Check 1: CSS pattern audit — M1 (animation-fill-mode:both + delay = first-paint invisibility)
STAGED_CSS=$(git diff --cached --name-only --diff-filter=ACM | grep '\.css$' | grep 'plugins/sgs-blocks')
if [ -n "$STAGED_CSS" ]; then
    echo "SGS: Checking staged CSS for animation first-paint defects (M1)..."
    for css_file in $STAGED_CSS; do
        OUTPUT=$(node "$REPO_ROOT/scripts/css-pattern-audit.js" --file "$REPO_ROOT/$css_file" 2>&1)
        if echo "$OUTPUT" | grep -q "\[CRITICAL\]"; then
            echo ""
            echo "❌ COMMIT BLOCKED by SGS CSS pattern audit"
            echo "   File: $css_file"
            echo "   Critical violation: animation-fill-mode:both + non-zero delay detected"
            echo "   This makes elements invisible at first paint (M1 defect)"
            echo "   Run: node scripts/css-pattern-audit.js --file $css_file"
            echo ""
            SGS_EXIT=1
        fi
    done
    if [ "$SGS_EXIT" -eq 0 ]; then
        echo "   ✅ CSS pattern audit: clean"
    fi
fi

# Check 2: Visual diff gate — block src changes need a passing QC report
STAGED_BLOCK_SRC=$(git diff --cached --name-only --diff-filter=ACM | grep 'plugins/sgs-blocks/src/blocks/')
if [ -n "$STAGED_BLOCK_SRC" ]; then
    BLOCK_NAMES=$(echo "$STAGED_BLOCK_SRC" | sed 's|plugins/sgs-blocks/src/blocks/\([^/]*\)/.*|\1|' | sort -u)
    echo "SGS: Checking visual diff reports for:$(echo $BLOCK_NAMES | tr '\n' ' ')"
    MISSING=""
    TODAY=$(date +%Y-%m-%d 2>/dev/null || echo "")
    for block_name in $BLOCK_NAMES; do
        BLOCK_JSON="$REPO_ROOT/plugins/sgs-blocks/src/blocks/${block_name}/block.json"
        # NOT A BLOCK — no block.json, so it cannot have a visual-diff report.
        #
        # BLOCK_NAMES is derived by taking the first path segment under
        # src/blocks/, but that directory also holds NON-block code —
        # `extensions/` (the universal editor extensions: animation, hover,
        # parallax, fx …). Those have no block.json and never will, so the
        # report this gate demands can never exist for them: the gate was
        # UNSATISFIABLE for every extension change, permanently, and the only
        # way past it was the --no-verify escape it exists to prevent.
        #
        # Skipping here is a precision fix, not a relaxation: every real block
        # has a block.json, so no block loses coverage. Same spirit as the
        # metadata-only branch below, whose comment likewise notes it
        # "Replaces the --no-verify escape".
        #
        # Added 2026-07-29 during Spec 38 Wave A (first extension change since
        # this gate landed). NOTE: .git/hooks/ is untracked, so this fix is
        # LOCAL ONLY and will not reach other clones.
        if [ ! -f "$BLOCK_JSON" ]; then
            echo "   ⊙ $block_name: not a block (no block.json) — visual gate N/A"
            continue
        fi
        # Spec 15 FR21 staged-merge channel: scaffold-grade blocks
        # (version 0.1.0-scaffold) skip the visual-diff gate — visual
        # verification is deferred to phase 5h promotion polish.
        if [ -f "$BLOCK_JSON" ] && grep -q '"version": *"0\.1\.0-scaffold"' "$BLOCK_JSON"; then
            echo "   ⊙ $block_name: scaffold-grade (0.1.0-scaffold) — visual gate deferred to 5h"
            continue
        fi
        # Metadata-only block.json change (supports.sgs converter/capability flags
        # — arrayContentLift / scalarContentLift / variantAttr / containerKind …)
        # has ZERO render impact, so a visual-diff report is N/A. Deterministic
        # semantic check (HEAD vs staged, minus supports.sgs); only fires when the
        # block's SOLE staged file is block.json. Replaces the --no-verify escape.
        STAGED_FOR_BLOCK=$(git diff --cached --name-only -- "plugins/sgs-blocks/src/blocks/${block_name}/")
        if [ "$STAGED_FOR_BLOCK" = "plugins/sgs-blocks/src/blocks/${block_name}/block.json" ] && \
           python "$REPO_ROOT/plugins/sgs-blocks/scripts/check-blockjson-metadata-only.py" "$block_name" >/dev/null 2>&1; then
            echo "   ⊙ $block_name: metadata-only block.json (supports.sgs) — visual gate N/A"
            continue
        fi
        # MARKUP-NEUTRAL PHP change (a no-output registry call, a comment) has ZERO
        # render impact, so a first-paint capture would compare a page against
        # itself. Deterministic check (see check-markup-neutral.py): PHP-only, no
        # deletions, no added output construct, and no added assignment to a
        # variable the block actually prints. Replaces the --no-verify escape,
        # exactly as the metadata-only branch above does.
        #
        # Added 2026-07-30 after W2-a (bd67a641) had to use --no-verify for two
        # one-line registry calls — which discarded gitleaks, the wp-* pre-merge
        # gate, cheat-gate, F5 and F6, all of which had already passed in the same
        # run. Turning off six working gates to skip a seventh is the bad trade
        # this branch removes.
        if python "$REPO_ROOT/plugins/sgs-blocks/scripts/check-markup-neutral.py" "$block_name" >/dev/null 2>&1; then
            echo "   ⊙ $block_name: markup-neutral PHP change — visual gate N/A"
            continue
        fi
        # INTERACTION-ONLY CSS: a pure value substitution inside rules whose
        # selector needs a gesture (:hover / :active / :focus-visible) cannot
        # match at first paint, so first_paint_capture_passed is not a question
        # this change can answer. Deterministic check — see
        # check-interaction-only-css.py for the rule set and why :focus and
        # :target are deliberately EXCLUDED (autofocus / fragment URLs make both
        # live at first paint).
        #
        # Added 2026-08-02, Bean-approved. The D467 focus-ring sweep repointed 10
        # :focus-visible outline colours across 9 blocks and the gate demanded a
        # capture per block; most of those blocks were not on the measured canary
        # page, so no capture was possible. The three available answers were all
        # bad: stamp a field nobody measured (9 reports did), REVERT correct
        # deployed work to avoid stamping it (sgs/nav-menu, the day before), or
        # --no-verify away five passing gates. The gate was asking an inapplicable
        # question; that is a gate bug, not an honesty problem in the author.
        if python "$REPO_ROOT/plugins/sgs-blocks/scripts/check-interaction-only-css.py" "$block_name" >/dev/null 2>&1; then
            echo "   ⊙ $block_name: interaction-only CSS value swap — visual gate N/A"
            continue
        fi
        # TOKEN-RENAME-NEUTRAL: the block's only staged change is renaming a
        # var(--wp--preset--*) reference whose DEFINITION moved with it and whose
        # resolved value is byte-identical (verified against HEAD's theme.json).
        # First paint cannot change, so a capture cannot answer anything.
        #
        # Added 2026-08-07 for the shadow rename (sm->subtle, md->raised,
        # lg->floating), which touched every block referencing those presets —
        # six of them on no published canary page. The rule was MEASURED before
        # being encoded, not assumed: sgs/info-box painted
        # `rgba(0, 0, 0, 0.1) 0px 4px 12px 0px` after the rename, byte-identical
        # to its pre-rename value, and the retired slugs resolved to nothing.
        # See reports/visual-diff/info-box-2026-08-07.md.
        #
        # Deliberately narrow: it refuses any line differing beyond the token
        # name, any group change, and — the load-bearing check — any rename where
        # the old and new resolved VALUES differ. A rename that silently repoints
        # a block at a different-looking preset is a visual change wearing a
        # rename's clothes, and is rejected. Ships with --self-test.
        if python "$REPO_ROOT/plugins/sgs-blocks/scripts/check-token-rename-neutral.py" "$block_name" >/dev/null 2>&1; then
            echo "   ⊙ $block_name: preset token rename, value unchanged — visual gate N/A"
            continue
        fi
        # EDITOR-ONLY: the block's sole staged file is edit.js — the inspector /
        # editor component. WordPress never serves it to a visitor, so frontend
        # first paint cannot change and a capture would compare a page against
        # itself.
        #
        # Added 2026-08-11 (D562) for the Spec 35 Phase 0 control fixes: three raw
        # TextControl corner-radius boxes became UnitControl (contract §14.3 ->
        # §14.1/§14.2) in card-grid and trust-bar, touching edit.js and nothing
        # else. Same three bad answers as the branches above — stamp a
        # first_paint_capture_passed nobody measured, revert correct work, or
        # --no-verify away five passing gates.
        #
        # Deliberately narrow, and every rule fails safe (see check-editor-only.py):
        # editor.css is NOT admitted (it restyles the editor canvas, a surface an
        # author may want captured); edit.js must be MODIFIED, not added; it must
        # carry no NAMED export (which a frontend bundle could import); and no
        # sibling but index.js may import ./edit. Rules 3 and 4 are re-checked per
        # block on every run, never assumed. Ships with --self-test (12 cases,
        # both controls per rule) and was proven able to fail on the live tree by
        # staging a real render.php and watching it refuse.
        if python "$REPO_ROOT/plugins/sgs-blocks/scripts/check-editor-only.py" "$block_name" >/dev/null 2>&1; then
            echo "   ⊙ $block_name: editor-only (edit.js) — visual gate N/A"
            continue
        fi
        # EDITOR-CANVAS-ONLY: the staged files are edit.js and/or editor.css and
        # nothing else — see check-editor-canvas-css.py. Unlike the branch above,
        # this does NOT skip the gate: editor.css can have a real visible effect
        # on the editor sidebar, just never on the frontend, so it still needs a
        # genuine capture — of the EDITOR CANVAS, not first paint. A report may
        # satisfy this branch with `editor_capture_passed: true` instead of
        # `first_paint_capture_passed: true`; the CHANGE_KEYED source_sha check
        # below applies identically either way.
        #
        # Added 2026-08-14 for the D4 ToolsPanel/PanelBody title-dedup fix (7
        # blocks, edit.js + editor.css only). check-editor-only.py correctly
        # refuses editor.css by design (its own comment: "an author may
        # legitimately want [it] captured") and make-visual-diff-reports.py is
        # built for FRONTEND before/after captures, which cannot answer a
        # question about the editor sidebar. Bean: "Need diffs to be more
        # flexible so we're able to actually verify with screenshots that are
        # legit." This is that path — narrow, deterministic file-scope proof
        # PLUS a still-required real capture, not a free skip.
        EDITOR_CANVAS_ONLY=0
        if python "$REPO_ROOT/plugins/sgs-blocks/scripts/check-editor-canvas-css.py" "$block_name" >/dev/null 2>&1; then
            EDITOR_CANVAS_ONLY=1
        fi
        # MANUAL SKIP (last resort, added 2026-08-15): none of the six deterministic
        # auto-skip branches above are pattern-detectors for every case — sometimes
        # a change IS visual and a real capture just isn't possible right now (no
        # canary page for the block, sandbox down). The only escape used to be
        # `git commit --no-verify`, which discards gitleaks, block-uniformity, the
        # F5 gates, the wp-* pre-merge gate and Gate A too — turning off six working
        # gates to skip a seventh, exactly the bad trade the markup-neutral branch
        # above was already built to remove for its own case.
        #
        # SGS_VISUAL_GATE_SKIP="block-name[,block-name...]" + a mandatory
        # SGS_VISUAL_GATE_REASON scope the bypass to ONLY this gate, ONLY the named
        # block(s) — every other gate in the chain still runs. SKIP without REASON
        # fails closed (falls through to the normal MISSING path) rather than
        # allowing a silent bypass. Every use is appended to
        # reports/visual-diff/manual-skips.log, which is tracked in git like the
        # rest of this directory, so the bypass leaves a permanent, reviewable
        # trail instead of vanishing when the shell closes.
        MANUAL_SKIP=0
        for _skip_name in $(printf '%s' "${SGS_VISUAL_GATE_SKIP:-}" | tr ',' ' '); do
            [ "$_skip_name" = "$block_name" ] && MANUAL_SKIP=1
        done
        if [ "$MANUAL_SKIP" = "1" ]; then
            if [ -z "${SGS_VISUAL_GATE_REASON:-}" ]; then
                echo "   ✗ $block_name: SGS_VISUAL_GATE_SKIP set but SGS_VISUAL_GATE_REASON is empty — refusing silent bypass"
            else
                echo "   ⚠ $block_name: MANUAL SKIP — $SGS_VISUAL_GATE_REASON"
                mkdir -p "$REPO_ROOT/reports/visual-diff"
                printf '%s | %s | MANUAL SKIP | %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$block_name" "$SGS_VISUAL_GATE_REASON" >> "$REPO_ROOT/reports/visual-diff/manual-skips.log"
                continue
            fi
        fi
        REPORT="$REPO_ROOT/reports/visual-diff/${block_name}-${TODAY}.md"
        CAPTURE_FIELD="first_paint_capture_passed: true"
        if [ "$EDITOR_CANVAS_ONLY" = "1" ] && [ -f "$REPORT" ] && grep -q "editor_capture_passed: true" "$REPORT"; then
            CAPTURE_FIELD="editor_capture_passed: true"
        fi
        # INTENT CAPTURE (added 2026-08-15): a third, always-available evidence
        # type alongside first-paint diff and editor-canvas capture — a single
        # LIVE capture of the current state checked against an explicitly stated
        # assertion, no before-state needed. Unlike editor_capture_passed above,
        # this is NOT gated behind a file-scope detector: whether a before/after
        # diff is the right evidence for a given change is an author judgement
        # call (same trust level the batch tool already extends to a human
        # --known-dead/--removed-attr reason), not something a heuristic can
        # decide. See .githooks/README.md for the required report shape and
        # reports/visual-diff/info-box-2026-08-15.md for a worked example (a dead
        # CSS selector removal, where "before" was a non-rendering state and a
        # diff against it couldn't answer anything a live check couldn't).
        if [ -f "$REPORT" ] && grep -q "intent_capture_passed: true" "$REPORT"; then
            CAPTURE_FIELD="intent_capture_passed: true"
        fi
        if [ -f "$REPORT" ] && grep -q "verdict: PASS" "$REPORT" && grep -q "$CAPTURE_FIELD" "$REPORT"; then
            # CHANGE-KEYED, not date-keyed (added 2026-08-07). A PASS report used
            # to be accepted purely because its filename carried today's date —
            # so on a repo where two tracks share main, a report another author
            # generated hours earlier for THEIR edit to the same block waved this
            # commit through. Measured that day: six blocks passed on reports that
            # described a different change entirely.
            #
            # A report now declares `source_sha:` (see visual-report-sha.py) and
            # the gate recomputes it from the STAGED bytes. Mismatch = the capture
            # does not describe what is being committed, so it does not count.
            DECLARED=$(grep -m1 '^source_sha:' "$REPORT" | sed 's/^source_sha:[[:space:]]*//')
            if [ -z "$DECLARED" ]; then
                echo "   ✗ $block_name: report has no 'source_sha:' — cannot tell which change it describes"
                echo "      add:  source_sha: $(python "$REPO_ROOT/plugins/sgs-blocks/scripts/visual-report-sha.py" "$block_name" 2>/dev/null)"
                MISSING="$MISSING $block_name"
            elif python "$REPO_ROOT/plugins/sgs-blocks/scripts/visual-report-sha.py" "$block_name" --check "$DECLARED" >/dev/null 2>&1; then
                echo "   ✅ $block_name: passing report, source_sha matches staged content"
            else
                echo "   ✗ $block_name: report is STALE — describes $DECLARED, staged content is $(python "$REPO_ROOT/plugins/sgs-blocks/scripts/visual-report-sha.py" "$block_name" 2>/dev/null)"
                MISSING="$MISSING $block_name"
            fi
        else
            MISSING="$MISSING $block_name"
        fi
    done
    if [ -n "$MISSING" ]; then
        echo ""
        echo "❌ COMMIT BLOCKED by SGS visual diff gate"
        echo "   No passing visual diff report for:$MISSING"
        echo "   Create: reports/visual-diff/<block>-${TODAY}.md"
        echo "   Required fields: 'verdict: PASS' AND one of —"
        echo "     'first_paint_capture_passed: true'  (before/after diff, the default)"
        echo "     'editor_capture_passed: true'        (edit.js/editor.css-only — see"
        echo "                                            check-editor-canvas-css.py)"
        echo "     'intent_capture_passed: true'        (single live capture vs a stated"
        echo "                                            assertion — no before-state needed;"
        echo "                                            see .githooks/README.md)"
        echo "   Genuinely non-visual changes are auto-detected and skipped:"
        echo "     - block.json supports.sgs only  -> check-blockjson-metadata-only.py"
        echo "     - markup-neutral PHP            -> check-markup-neutral.py <block>"
        echo "     - editor-only (edit.js alone)   -> check-editor-only.py <block>"
        echo "     - interaction-only CSS value    -> check-interaction-only-css.py <block>"
        echo "   Run that checker to see WHY this block did not qualify."
        echo "   --no-verify is NOT the answer: it also discards gitleaks, the wp-* pre-merge"
        echo "   gate, cheat-gate, F5 and F6, which are unrelated and were passing."
        echo "   Genuinely can't capture right now? Use the scoped bypass instead — it skips"
        echo "   ONLY this gate, ONLY the named block, and logs the reason:"
        echo "     SGS_VISUAL_GATE_SKIP=<block> SGS_VISUAL_GATE_REASON=\"...\" git commit ..."
        echo ""
        SGS_EXIT=1
    fi
fi

# ─── Spec 15 Phase 4: Stage 0.1 BEM + 0.5 token-usage lints ──────────────────
# Runs on any staged file under sites/*/mockups/. Warning-only by default;
# set SGS_LINT_STRICT=1 to enforce as a hard gate.

STAGED_MOCKUPS=$(git diff --cached --name-only --diff-filter=ACM | grep -E '^sites/[^/]+/mockups/.*\.(html|htm|css)$' || true)
if [ -n "$STAGED_MOCKUPS" ]; then
    LINT_MODE="draft"
    [ "${SGS_LINT_STRICT:-0}" = "1" ] && LINT_MODE="strict"
    echo "SGS: Running Stage 0.1 BEM + 0.5 token lints on staged mockups (mode=$LINT_MODE)..."
    LINT_EXIT=0
    for mockup in $STAGED_MOCKUPS; do
        # Derive the client slug from sites/<client>/mockups/... → variation overlay
        CLIENT_SLUG=$(echo "$mockup" | sed -E 's|^sites/([^/]+)/mockups/.*|\1|')
        VARIATION_ARG=""
        VARIATION_FILE="$REPO_ROOT/theme/sgs-theme/styles/${CLIENT_SLUG}.json"
        if [ -f "$VARIATION_FILE" ]; then
            VARIATION_ARG="--variation $VARIATION_FILE"
        fi
        case "$mockup" in
            *.html|*.htm)
                python "$REPO_ROOT/plugins/sgs-blocks/scripts/lints/bem-lint.py" "$REPO_ROOT/$mockup" --mode "$LINT_MODE" || LINT_EXIT=$?
                python "$REPO_ROOT/plugins/sgs-blocks/scripts/lints/token-lint.py" "$REPO_ROOT/$mockup" --mode "$LINT_MODE" --inline-styles $VARIATION_ARG || LINT_EXIT=$?
                ;;
            *.css)
                python "$REPO_ROOT/plugins/sgs-blocks/scripts/lints/token-lint.py" "$REPO_ROOT/$mockup" --mode "$LINT_MODE" $VARIATION_ARG || LINT_EXIT=$?
                ;;
        esac
    done
    if [ "$LINT_MODE" = "strict" ] && [ "$LINT_EXIT" -ne 0 ]; then
        echo ""
        echo "COMMIT BLOCKED by SGS Stage 0.1/0.5 lints (strict mode)"
        echo "   Fix violations OR unset SGS_LINT_STRICT to commit with warnings only"
        echo ""
        SGS_EXIT=1
    fi
fi

# ─── 5.3.5 — wp-* CLI pre-merge gate (advisory, soft-fail) ─────────────────
# Runs wp-blocks health + wp-docs hook validate + wp-hook-graph validate.
# Always exits 0 (--soft) so it NEVER blocks a commit. Output is informational.
STAGED_PIPELINE=$(git diff --cached --name-only --diff-filter=ACM | grep -E \
    'plugins/sgs-blocks/scripts/(orchestrator|sgs-clone-orchestrator|wp-pre-merge-gate)|plugins/sgs-blocks/src/blocks/' || true)
if [ -n "$STAGED_PIPELINE" ]; then
    echo "SGS: Running wp-* pre-merge gate (advisory)..."
    python "$REPO_ROOT/plugins/sgs-blocks/scripts/wp-pre-merge-gate.py" --soft 2>&1 \
        | sed 's/^/  /'
fi


# ─── Gate A — converter golden-fixture conformance (D178) ────────────────────
# Runs whenever staged files touch converter/ to catch "good docs + undelivered
# code" regressions. Non-zero exit blocks the commit with a clear message.
# Re-baseline: REGEN=1 git commit ... OR run tests with --regen-golden and
# commit the new goldens with a cited reason.
#
# TRIGGER REPOINTED 2026-08-24: this watched
# `plugins/sgs-blocks/scripts/orchestrator/converter_v2/`, a directory DELETED at
# D276 (2026-07-05, c8690345). The gate therefore could not fire for seven weeks
# while its harness stayed alive and its goldens went stale. It now watches the
# live modular engine at `plugins/sgs-blocks/scripts/converter/`. The dead
# `converter_v2` alternative was dropped from the 5.3.5 regex above at the same
# time; `orchestrator` there is still live and was left alone.
STAGED_CONVERTER=$(git diff --cached --name-only --diff-filter=ACM | grep -E \
    'plugins/sgs-blocks/scripts/converter/' || true)
if [ -n "$STAGED_CONVERTER" ]; then
    echo "SGS Gate A: running converter golden-fixture conformance harness..."
    # Portability fix (D564): this line hardcoded /c/Python313/python.exe. On any
    # machine without that exact path the gate died with "command not found" —
    # and because the exit status was then read from a failed lookup rather than
    # from pytest, a REAL fixture regression and a MISSING interpreter were
    # indistinguishable. Resolve the same way .githooks/pre-commit already does.
    if command -v python.exe >/dev/null 2>&1; then GATE_A_PY=python.exe
    elif command -v python >/dev/null 2>&1; then GATE_A_PY=python
    elif command -v py >/dev/null 2>&1; then GATE_A_PY=py
    else GATE_A_PY=""; fi
    if [ -z "$GATE_A_PY" ]; then
        echo "   Gate A SKIPPED — no python on PATH (install python to enforce)."
        GATE_A_EXIT=0
    else
        # Second portability fix (D564): the status used to come from
        # `${PIPESTATUS[0]:-$?}` after piping pytest through `sed`. PIPESTATUS is
        # a BASH array and this file is `#!/bin/sh` — under a POSIX shell it
        # expands to nothing, leaving `$?` (the exit status of `sed`, which is
        # essentially always 0). Gate A would then report PASS on a real fixture
        # regression. It happens to work today only because Git-for-Windows' sh
        # IS bash. Capture the output instead, so the status is pytest's own.
        GATE_A_OUT=$("$GATE_A_PY" -m pytest \
            plugins/sgs-blocks/scripts/tests/test_converter_conformance.py \
            -q --tb=short 2>&1)
        GATE_A_EXIT=$?
        echo "$GATE_A_OUT" | sed 's/^/  /'
        if [ "$GATE_A_EXIT" -ne 0 ]; then
            echo ""
            echo "COMMIT BLOCKED by Gate A — converter emit diverged from golden fixtures."
            echo "   Fix the regression, OR run with REGEN=1 to re-baseline."
            echo "   Re-baseline requires a cited reason in the commit message."
            echo ""
            SGS_EXIT=1
        else
            echo "   Gate A: all conformance fixtures pass."
        fi
    fi
fi

# ─── Gate 31 — inspector-scan on staged EDITOR surfaces ──────────────────────
# There is no CI on this repo: .github/workflows/ does not exist, and until this
# gate the entire inspector-scan rule set (7 gate rules + 14 advisory, incl. the
# golden-colour conformance rule) ran ONLY when somebody typed `npm run build`.
# A detector nothing triggers is a detector nobody has.
#
# Scope is deliberately narrow — a block's edit.js or a shared editor component
# is exactly the surface every inspector rule reads. Staging a .md, a render.php
# or a style.css does NOT trigger it.
STAGED_INSPECTOR=$(git diff --cached --name-only --diff-filter=ACM | grep -E     'plugins/sgs-blocks/src/(blocks/[^/]+/edit\.js|components/.*\.js)$' || true)
if [ -n "$STAGED_INSPECTOR" ]; then
    if [ -n "${SGS_INSPECTOR_GATE_SKIP:-}" ]; then
        # Same discipline as the visual gate: a bypass MUST carry a reason and
        # MUST be logged. A silent skip is how a gate quietly stops existing.
        if [ -z "${SGS_INSPECTOR_GATE_REASON:-}" ]; then
            echo "   ✗ SGS_INSPECTOR_GATE_SKIP set but SGS_INSPECTOR_GATE_REASON is empty — refusing silent bypass"
            SGS_EXIT=1
        else
            echo "   ⚠ inspector-scan: MANUAL SKIP — $SGS_INSPECTOR_GATE_REASON"
            mkdir -p "$REPO_ROOT/reports/visual-diff"
            printf '%s | inspector-scan | MANUAL SKIP | %s
' "$(date '+%Y-%m-%d %H:%M:%S')" "$SGS_INSPECTOR_GATE_REASON"                 >> "$REPO_ROOT/reports/visual-diff/manual-skips.log"
        fi
    else
        # Resolve node the same way Gate A resolves python (D564): a hardcoded
        # interpreter path made "missing interpreter" and "real regression"
        # indistinguishable, because $? then came from a failed lookup.
        if command -v node >/dev/null 2>&1; then INSPECTOR_NODE=node
        elif command -v node.exe >/dev/null 2>&1; then INSPECTOR_NODE=node.exe
        else INSPECTOR_NODE=""; fi
        if [ -z "$INSPECTOR_NODE" ]; then
            echo "   inspector-scan SKIPPED — no node on PATH (install node to enforce)."
        else
            echo "SGS: Running inspector-scan (staged editor surface)..."
            INSPECTOR_OUT=$(mktemp)
            # Redirect FIRST, then read $?. After a pipe, $? is the LAST command's
            # status, not the scan's — that exact mistake has shipped here before.
            "$INSPECTOR_NODE" "$REPO_ROOT/plugins/sgs-blocks/scripts/inspector-scan/run.js" --check > "$INSPECTOR_OUT" 2>&1
            INSPECTOR_EXIT=$?
            if [ "$INSPECTOR_EXIT" -ne 0 ]; then
                sed 's/^/  /' "$INSPECTOR_OUT"
                echo ""
                echo "COMMIT BLOCKED by inspector-scan — a gate rule flagged, or an advisory"
                echo "   rule grew past its openBacklog (the ratchet: debt may not increase)."
                echo "   Fix the finding, or — if the growth is intended and justified —"
                echo "   raise that rule's openBacklog in rules.json with a stated reason."
                echo "   --no-verify is NOT the answer: it also discards gitleaks, cheat-gate,"
                echo "   F5 and F6, which are unrelated. Use the scoped bypass instead —"
                echo "   set both SGS_INSPECTOR_GATE_SKIP=1 and SGS_INSPECTOR_GATE_REASON."
                echo ""
                SGS_EXIT=1
            else
                tail -4 "$INSPECTOR_OUT" | sed 's/^/  /'
            fi
            rm -f "$INSPECTOR_OUT"
        fi
    fi
fi


exit $SGS_EXIT
