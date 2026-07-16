---
doc_type: strategic-plan
project: small-giants-wp
title: Setup simplification + fresh enforcement layer + go-forward protocol (v3 — cold-safe, qc-council-cleared)
date: 2026-07-16
status: v3 FIX-APPLIED — awaiting Bean sign-off. Supersedes v1/v2 (same path).
already_executed_this_session: TWO separate approved bugfixes ONLY — (1) the 3 agent YAML quote-fixes (verified parse + hot-loaded), (2) the point-4 rule captured to memory. EVERYTHING BELOW (culls, enforcement layer, doc model, refreshes) is UNEXECUTED and awaits sign-off.
scope: project files execute in P1-P3proj; GLOBAL ~/.claude edits are quarantined to their own mini-sign-off (P3glob) + P6
cull_safety: hard-delete, COMMIT-FIRST scoped by exact path (never `git add -A` — live Track A/B/C hazard) so history has a copy
furthest_extent_note: this is furthest-SAFE, not absolute-furthest — the council REVERSED 5+ culls that would break live hooks/consumers (§1E). Deliberate.
evidence_basis: 6 recon agents + 5-persona adversarial council + gap-analysis (folded into the per-artefact skillscore + council grading, not run as a separate pass) + 2 falsification agents + qc-council on fix-shapes + qc-council on this plan (3 raters, all premises ground-truth-verified)
---

# Setup simplification + fresh enforcement layer + protocol — v3 (cold-safe)

## 0. Thesis + what the gauntlet changed
Architecture is sound; the docs/counts/cruft rotted. The 5-persona council caught 2 culls that would silently break live hooks (fixed §1E). Falsification **partially overturned** my keep-bespoke verdict (2 niche repos beat `f5` on specific axes → adopt 3 patterns, keep `f5` as base). qc-council **failed the v2 on cold-executability** → this v3 fixes the scope leak, the P1 data-loss, the unphased items, and the missing done-when checks.

## 1. Cull register (council-corrected)
**PRE-FLIGHT (mandatory):** re-verify LIVE before deleting (recon is a stale cache — `iapi.html`/`rr.json` already gone, "7 DBs"→4, "420MB"→461MB, "17 citers"→~5); commit-first scoped by exact path (NOT `git add -A`).

**A. Zero-risk deletes** — self-declared-dead root files, untracked debug cruft (`NUL` via Bash only), stray `sgs-framework.db` copies (re-count live), completed one-shot scripts, the byte-identical nested duplicate project. `git rm` tracked / `rm` untracked.
**B. Repo-bloat (461MB git-tracked `reports/*` pixel dumps)** — `git rm -r`, **EXCLUDING** `reports/visual-diff/` (STOP-67), `reports/phase4-*.txt` (in-flight), **AND `reports/2026-05-20-pipeline-root-gap-council/` → MOVED to bucket D** (it's live-cited by `dev-setup.md:684` + `goals.md:78`; must be redirect-first, not hard-deleted).
**C. Workspace hygiene (gitignored)** — `pipeline-state/` (3.3GB), ~97 root screenshots (71MB), named scratch ephemera only (`.claude/scratch/` has 26 TRACKED files — scope the delete to the named untracked items).
**D. Archive-with-redirect (update citers FIRST):** `WRAPPER-CSS-ROUTING-DESIGN-GATE.md` (real citers = `CLAUDE.md`, `architecture.md`, `decisions.md`, `docs-registry.yaml`, `Spec 31` + 2 code strings incl. the already-broken `seed-slot-synonyms.py:688` — fix in same pass), `WOOCOMMERCE-PAGE-TYPE-SOLUTION`, `2026-07-14-adaptive-nav-drawer-design` plan, `master-plan/`, **`reports/2026-05-20-pipeline-root-gap-council/`** (moved here from B), ~89 unreferenced `.claude/reports/*` → `memory/reports-archive/` (EXCLUDE the 2 wave2 files cited by `plugins/sgs-blocks/CLAUDE.md:67,73` + the 2 in-flight `.json`/`.md`).
**E. DO NOT cull/merge (council reversed my draft):** `docs-registry.yaml` (machine-consumed + already holds the caps), `cloning-pipeline-flow.md`/`-stages.md` (folding kills the live `drift-check-dispatcher.py` + 2.4×'s the mandatory read), specs 07/08 (archive-with-redirect, ~1,450 lines of roadmap — not lossy-merge).

## 1b. Truth-doc verdict (the `project-init`/`project-consolidate` question — was dropped, now answered)
Those skills generate ~13 status docs. Verdict per doc:
- **USEFUL, keep:** `decisions.md`, `parking.md`, `mistakes.md` (the lean template), `goals.md`, `dev-setup.md`, `.claude/CLAUDE.md` (the index), `docs-registry.yaml` (machine-consumed).
- **DETRIMENT (drift-prone, overwrite each other):** `state.md` + `handoff.md` + `next-session-prompt.md` → collapse to one `LEDGER.md` (§2). The retired "per-entry doc-walk" registry check is already dead (correctly).
- **Net:** the truth-doc *system* isn't a detriment; the specific 3-way status split is. Fixing that is §2.

## 2. Doc model (corrected — no byte-cap)
Collapse `state.md`+`handoff.md`+`next-session-prompt.md` → one **`LEDGER.md`**, rotated by a **`Stop` hook** to `memory/session-YYYY-MM-DD.md` (NOT a PreToolUse byte-cap — dead 3×: PostToolUse can't block, PreToolUse Write/Edit unreliable, cap fights the agent). Fixed **plain-English + "why this matters" top section for Bean** (ADHD Rule 3/7). **STOP/gate catalogue split to its own uncapped file** (D101 — never force-drop a defence). **One-time migration:** sweep the current 65KB un-archived `state.md` history to `memory/` + run the D101 count-check BEFORE deleting. `decisions.md`: **tag `INCIDENT`/`ROUTINE`, externalise big ones stub+link** (do NOT truncate to 5 lines — gutting root-cause records). **F1 (global):** `session-spec-anchor.py` + `session-init.py` hardcode the old filenames — the LEDGER rename + these patches ship in ONE commit, and because these are GLOBAL files that commit runs in **P3glob** (global mini-sign-off), never split from the project rename.

## 3. Fresh enforcement layer (falsification + qc-council validated)
Keep `f5-commit-gate.py` as base (out-enforces the GitHub field for solo/local/Windows). Priority order — **G = edits a GLOBAL file (needs the P3glob mini-sign-off)**, **P = project file**:
1. **[HIGHEST · G] `sgs-selfreport-gate.py` → read machine evidence, not the agent's `state=verified` string.** It's a wired global `Stop` hook (`~/.claude/settings.json:517`); the EVENT exists, the evidence-scan LOGIC is the build. Scan the transcript for a real verification tool-result since the last edit.
2. **[G, net-new] Gate the baseline-update behind a human token.** NOTE: `f5-commit-gate.py` has NO `--update-baseline` flag — the **8 gate scripts in its `_GATES` list** each own it (`cheat-gate/run.py`, `excluded-gate/run.py`, `ledger/coverage_check.py`, `ledger/content_gap_check.py`, `db-consistency/run.py`, `converter/gates/{no_slug_literal,import_ban,check_raw_sqlite}.py`). Fix = a new `PreToolUse(Bash)` matcher that denies any agent-run command containing the **`--update-baseline` FLAG** (match the flag, NOT a `run.py` filename glob — 5 of the 8 aren't named `run.py`), across all 8 paths, unless a human token is present. Enumerate the 8 from `_GATES` so none is missed. NOT a reuse of `f5`'s `[gates-ok:…]` (that governs the commit gate only).
3. **[G, new logic] Extend `handoff-enforce.py`** — today it fires only on an in-progress `/handoff` (reads `.pipeline-state/handoff.json`). New trigger = fire on ANY main-thread `Stop` + detect consequential-work-uncommitted. Main-thread Stop only (SubagentStop unreliable, #20221/#19220). Sized as new logic, not a one-liner.
4. **[standard] Hook-type discipline:** blocking gates on **Bash/commit + Stop only** — never PreToolUse(Write/Edit) (#13744), never expect PostToolUse to block.
5. **[P, one-shot] Kill the stubs:** delete the `lifecycle-gate-stop.py` no-op WIRING (don't wire the real one); fold `qc-on-converter-edit.py`'s one live watch into `f5`, THEN remove. (Global stubs `tooling-map-drift-check.py` + `__pycache__` → P6.)
6. **[P, to-build] Build fresh commands/hooks** per your preference — take advisory content from `obra/superpowers` verification tables, use **`disler/claude-code-hooks-mastery`** as the hook-TYPE reference (the named source you asked for: PreToolUse=only deny, Stop=only done-gate, PostToolUse=evidence), model enforcement on `f5`, hold every new gate to the Enforcement Contract.

**The Enforcement Contract** — a gate counts only if it: (1) auto-fires on an event, (2) fails closed, (3) denies on NEW violations only, (4) reads machine evidence not narration, (5) fails legibly (names the fix), (6) is detectable when broken.

## 4. Agents
- **Already executed this session:** the 3 YAML quote-fixes (`wp-sgs-developer`/`design-reviewer`/`seo-auditor`) — verified parse + hot-loaded live. (This is the ONLY agent work done; the rest is pending.)
- **[P5] Optional refresh** from `wshobson/agents` (has a real validation CI) / `VoltAgent/awesome-claude-code-subagents` as **templates** — layer SGS context (SGS-BEM, WCAG **2.1** per §4c, deploy path). They're 56–59% skillscore.
- **[P5 cleanup]** remove archived agents shadowing the roster (`_archived/seo-visual`, `seo-sitemap`); create-or-dereference phantom `seo-geo`.

## 4b. Skills roster refresh — [P5]
Generic/process skills (research tiers, design-quality leaves, brainstorming, debugging, planning, lifecycle) → evaluate adopting the current `superpowers`/community version wholesale + delete the bespoke fork. SGS-domain skills (`sgs-clone`, `sgs-wp-engine`, `uimax`, converter tooling) → KEEP bespoke. Method: diff each generic skill vs its community equivalent; adopt-whole only where cleaner + current; gated, never a blind swap. WCAG 2.1 (§4c) removes the rewrite blocker.

## 4c. Accessibility → WCAG 2.1 AA baseline — [P5, edits global + project CLAUDE.md]
Relax "2.2 AA everywhere" → 2.1 AA baseline + keep 2.2's cheap wins (visible focus; 24px target already beaten by the 44px rule). Not legally required for private UK SME/charity clients (Equality Act = reasonable adjustments; UK PSBAR + EU EN 301 549 both cite 2.1 AA). Unblocks community adoption (they cite 2.1). Revisit to 2.2 only per a public-sector/EU client.

## 5. Go-forward protocol (each rule tagged ENFORCED(event) / TO-BUILD(event) / MANUAL)
1. One ledger, Stop-rotated — **TO-BUILD (Stop)**.
2. Structural gates over prose — **MANUAL (governing principle)**.
3. Done = machine evidence — **ENFORCED (Stop), logic-upgrade pending §3.1**.
4. Minimal always-on context — **the ≤80-line cap applies ONLY to the GLOBAL always-on CLAUDE.md** (per-component project CLAUDE.mds are on-demand + legitimately longer — keep lean, no hard cap). ENFORCE the global cap via a line-count check on CLAUDE.md edits, else mark MANUAL/aspirational — do NOT leave it as decaying prose the repo already violates.
5. Clean folders — **TO-BUILD (PreToolUse(Bash) commit size/binary gate + Stop scratch-sweep)**.
6. Docs gated like code — **TO-BUILD (PostToolUse(Write/Edit) doc-drift check — the pattern `drift-check-dispatcher` already proves)**.
7. Verify contents not filenames — **MANUAL (behavioural rule, captured)**.
8. Protect architecture, cull description — **MANUAL (principle)**.

## 6. Execution phasing (after sign-off — each has a "DONE-WHEN")
- **P0 — commit in-flight work**, scoped by path; finish the 2 started moves (destinations already exist at `.claude/scratch/HTML_Insert.html` + `.claude/scratch/TRACK-B-…md` — commit the deletes+moves). *Done-when: `git status` clean of the 2 moved files; working tree committed.* ~10 min.
- **P1 — cull A + B + C** (project, after live re-verify). *Done-when: `git grep` for each culled path returns 0 live-doc references; `du -sh reports/` dropped ~461MB; build still green.* ~20 min.
- **P2 — archive-with-redirect (D)** — update citers FIRST (grep names each), then move. *Done-when: `git grep` for each archived doc's old path = 0 hits outside `archive/`.* ~20 min.
- **P3proj — project enforcement (§3.5 stub-kill + §3.6 fresh build)**. *Done-when: `lifecycle-gate-stop` unwired; each new gate passes its Enforcement-Contract self-test (fire it, confirm deny+legible message).* ~30 min.
- **P3glob — GLOBAL hook edits (§3.1, §3.2, §3.3, F1) — MINI-SIGN-OFF GATE.** These edit `~/.claude/`; they run ONLY after you approve this sub-batch. *Done-when: each global hook edited + its event proven to fire (trigger it, observe the deny/rotation).* ~30 min.
- **P4 — LEDGER + doc model §2** (F1 patch ships in P3glob's commit). *Done-when: D101 count-check passes (new STOP-catalogue ≥ old); old status docs' unique history swept to `memory/`.* ~30 min.
- **P5 — agent refresh (§4) + skills refresh (§4b) + WCAG edit (§4c).** *Done-when: refreshed agents ≥85% skillscore; adopted skills pass their own tests; CLAUDE.md non-negotiable line updated to 2.1.* ~large — its own session(s).
- **P6 — remaining GLOBAL simplifications** (tooling-map-drift, `__pycache__`, global CLAUDE.md ≤80, rule path-scoping) — separate sign-off. *Done-when: `tooling-map-drift-check.py` + stale `__pycache__` removed; global CLAUDE.md `wc -l` ≤80; situational rule files carry `paths:` frontmatter, verified loading live.*
- **Sprawl guard: ONE phase per session; checkpoint via the LEDGER (once P4 lands) or `handoff.md` (before it).** Do NOT run P0→P5 in one sitting.

## 7. Sign-off decisions (all ranked)
1. **461MB bloat:** *`git rm` now (recommended — stops growth immediately; full reclaim is a later, heavier history-rewrite)* vs history-rewrite now.
2. **Start P3proj/P3glob with the `sgs-selfreport` evidence-scan upgrade** — *recommended (smallest, highest-value; it IS the "done=proof" fix)*.
3. **Agent refresh:** *recommended to refresh from templates (they're 56–59%)* vs leave the now-working bespoke ones.
4. **Hooks freshness:** *recommended: replace `doc-audit`/`lint-spec-drift` with fresh builds (your stated preference)* vs keep+wire.
5. **Capture §5 protocol** via `/capture-lesson` — *recommended (free, correct)*.
6. **WCAG → 2.1 AA baseline** — *recommended (removes the perfectionism tax blocking community adoption; revisit per public-sector/EU client)*.
7. **Skills refresh (§4b)** — *recommended to evaluate (not blind-swap); keep SGS-domain bespoke*.
