---
doc_type: report
project: small-giants-wp
date: 2026-08-04
note: "ANALYSIS ONLY. No LEDGER.md edits were made. Recommendations for whoever executes the sweep."
---

# LEDGER.md sweep — recommendations (not executed)

**Current size:** 37,035 bytes. **Cap (LEDGER's own frontmatter):** 24,576 bytes. **Over by:** 12,459 bytes (34%).
**Measured, not estimated** — every figure below is `wc -c` / byte-slice of the real file, not a guess.

---

## 1. Byte budget by section (measured)

Line ranges and byte counts taken directly from `.claude/LEDGER.md` (byte-exact, CRLF preserved). Percentages are of the 37,035-byte whole file (some bytes are separator blank lines not attributed to any section, so rows don't sum to exactly 100%).

| # | Section | Lines | Bytes | % of file |
|---|---|---|---:|---:|
| 1 | Frontmatter | 1–6 | 445 | 1.2% |
| 2 | Human Summary (plain-English top) | 8–25 | 1,035 | 2.8% |
| 3 | CURRENT FRONTS — QC-BYPASSED box | 27–36 | 700 | 1.9% |
| 4 | Track 3 (Tier W / physics-canvas narrative) | 37–74 | 3,556 | 9.6% |
| 5 | Tracks 1b/1c/2/2+2b narrative | 75–137 | 5,765 | **15.6%** |
| 6 | HANDOFF QC box | 138–148 | 768 | 2.1% |
| 7 | Standing constraints | 149–218 | 5,493 | **14.8%** |
| 8 | State Snapshot | 220–244 | 1,666 | 4.5% |
| 9 | Product queue | 246–255 | 592 | 1.6% |
| 10 | Pointers table | 258–270 | 787 | 2.1% |
| 11 | Blockers | 271–278 | 451 | 1.2% |
| 12 | NEXT SESSION — Track 1b/Spec 35 | 281–373 | 6,563 | **17.7%** |
| 13 | NEXT SESSION — Snooza pitch / motion gap | 374–437 | 4,368 | 11.8% |
| 14 | TRACK 1 (routing) follow-on | 439–499 | 4,822 | 13.0% |

**The three heaviest sections (§5, §12, §14) are 47.1% of the file on their own** — all three are narrative/task-plan detail, not "current status".

---

## 2. What the file is actually for (from its own frontmatter + the project CLAUDE.md manifest)

- LEDGER = "plain-English top + live status + product queue + pointers" (canonical structure table in `.claude/CLAUDE.md`).
- "History → dated snapshots in `memory/session-YYYY-MM-DD*.md`" — LEDGER's own frontmatter.
- "Structural defences live UNCAPPED in `STOP-CATALOGUE.md`" — LEDGER's own frontmatter.
- Phase/task plans belong in `plans/` (canonical structure table).
- "A summary sentence here is a copy that drifts" — `.claude/CLAUDE.md`, i.e. LEDGER should hold **pointers**, not re-narrated detail that already exists in a memory file, plan file, or report.

Measured against that mandate, sections §4, §5, §6, §12, §13, §14 are not violating any single rule by existing — they violate the file's stated *purpose*: they are narrative history and forward task-plan detail sitting in a doc whose job is "where are we, what's next, in brief, with pointers to the detail."

---

## 3. Every candidate cut, classified

### MOVE → STOP-CATALOGUE.md (uncapped; verified zero overlap — see §6)

| Item | Bytes | Destination | Note |
|---|---:|---|---|
| Standing constraints, all 23 bullets (§7 above, lines 149–218) | 5,493 | `STOP-CATALOGUE.md` | LEDGER's own frontmatter names this file as the uncapped home for exactly this content class. **This is a relocation, not a deletion — nothing is lost.** |
| "Methodology guardrails (do not skip)" — 6 bullets, lines 421–436 | ~950 | `STOP-CATALOGUE.md` | Universal lessons (stale-doc trap, guessed-attribute discard, probe-vs-effect, licence verification, shared-worktree commit discipline, deploy-before-measure) — not tied to one task, belongs with the other structural defences. |
| "Routing guardrails (earned 2026-08-03)" — 4 bullets, lines 494–499 | ~750 | `STOP-CATALOGUE.md` | Same reasoning — general measurement lessons (denominator-first, static-audit-is-a-third-of-the-truth, fix-is-a-hypothesis-too, prove-dead-by-reaching). |
| "Guardrail carried from this session" — 1 bullet, lines 371–372 | ~200 | `STOP-CATALOGUE.md` | "A rule returning zero is a claim requiring evidence" — already stated once inside Task F's Definition of Enforced; this is a duplicate restatement, safe to fold into the STOP-CATALOGUE entry instead of keeping twice. |

**Subtotal moved to the uncapped file: ~7,393 bytes**, replaced in LEDGER by four one-line pointers (~200 bytes total). **Net LEDGER saving: ~7,193 bytes.**

### MOVE → memory/session-*.md (narrative history; largely already duplicated there)

| Item | Bytes | Destination | Note |
|---|---:|---|---|
| CURRENT FRONTS — QC-BYPASSED box | 700 | `memory/session-2026-08-04*.md` | Describes a completed re-verification. Compress LEDGER to one line: "QC-BYPASSED CLEARED 2026-08-04 — see `.claude/reports/2026-08-04-step0-qc-bypassed-reverification.md`." |
| Track 3 narrative table + proof paragraphs | 3,556 | `memory/session-2026-08-03*.md` (confirm it holds this, else create) | This is a shipped-and-proven record (Tier W, physics-canvas, gap register). Compress to 4 bullets + pointer. |
| Tracks 1b/1c/2/2+2b narrative | 5,765 | Already-cited files: `memory/session-2026-08-04-spec35-enforcement.md`, `memory/session-2026-08-02-track1-phase1.md`, `memory/session-2026-08-02-track1-phase0.md` | **The LEDGER text itself says "Full narrative: ... — read before acting" and then repeats the full narrative anyway.** This is a documented near-duplicate. Compress to one status line per sub-track + the existing pointers. |
| HANDOFF QC box | 768 | `memory/session-2026-08-03*.md` or `-04*.md` | Describes a completed independent-rater pass (already resolved, two stale figures fixed). One-line summary + pointer suffices. |

**Subtotal moved to memory: 10,789 bytes**, replaced by ~600 bytes of compressed status + pointers. **Net LEDGER saving: ~10,189 bytes.**

### MOVE → plans/ (forward task-plan detail; plans/ is the canonical home per CLAUDE.md)

| Item | Bytes | Destination | Note |
|---|---:|---|---|
| NEXT SESSION — Track 1b/Spec 35, Tasks A–F + "Definition of Enforced" (10 numbered criteria) | 6,563 | `plans/spec-35-inspector-DONE-checklist.md` (already exists — natural home for enforcement-definition detail) + a new `plans/2026-08-04-spec35-next-session-tasks.md` for the task ordering/dependency detail | Task A's own residuals are already itemised in the Track 1b narrative (§5) — another duplicate once §5 is compressed. Keep in LEDGER: 5 lines (which task is next, one blocking fact, pointer). |
| NEXT SESSION — Snooza pitch demo / Tier W / client-usability tasks | 4,368 | `plans/2026-08-03-motion-gap-register.md` (append, it's already the consolidated register) or a new `plans/2026-08-04-snooza-and-motion-next-tasks.md` | Dependency graph + 4 task briefs are execution detail, not status. Keep in LEDGER: 5 lines (highest-value task, deadline note, pointer). |
| TRACK 1 (routing) follow-on — R1–R4 detail | 4,822 | New `plans/2026-08-04-track1-routing-followon.md`, cross-referenced from `.claude/reports/2026-08-02-pipeline-routing-review.md` | R1 is already SHIPPED+ruled (historical — could split: the ruling → `decisions.md`/memory, the open R2/R3 → plan file). Keep in LEDGER: 4 lines (R2 next, R3 blocked-on-what, pointer). |

**Subtotal moved to plans/: 15,753 bytes**, replaced by ~450 bytes of compressed pointers. **Net LEDGER saving: ~15,303 bytes.**

### REPLACE-with-a-pointer (already have this classification folded into the MOVE rows above)

No additional standalone candidates — every REPLACE case above is paired with its MOVE destination in the tables.

### DELETE-as-genuine-duplicate

| Item | Bytes | Note |
|---|---:|---|
| "Guardrail carried from this session" restating Task F point 1 | ~200 | Counted once already under STOP-CATALOGUE moves above — flagging here so it isn't double-counted as a separate saving. **Do not subtract twice.** |

No content was found that is safe to delete outright with zero destination — everything identified either is standing-constraint (must move, not delete) or narrative/plan detail (must move, not delete) under D101 discipline.

### KEEP (do not touch)

| Section | Bytes | Why |
|---|---:|---|
| Frontmatter | 445 | Operational metadata (cap, rotation policy) — the file's own self-description. |
| Human Summary (plain-English top) | 1,035 | This IS the canonical "plain-English top" — Bean-facing, exactly the shape the manifest specifies. Light trim possible (see §5) but not a move/delete candidate. |
| State Snapshot | 1,666 | Genuinely live, machine-checkable status (branch, D-ceiling command, sites, fixtures, latent-not-blocking items). This is what "live status" means. |
| Product queue | 592 | Already pointer-shaped ("LIVE backlog: `plans/strategy/product-queue.md`"), correctly short. |
| Pointers table | 787 | This is the pointer mechanism itself — the model every other section should imitate. |
| Blockers | 451 | Live, short, correctly scoped. |

---

## 4. Explicit KEEP list — every standing constraint, for the D101 count-check

**23 standing-constraint bullets** currently in the "Standing constraints" section (lines 149–218), recommended for **MOVE to `STOP-CATALOGUE.md`, verbatim, not deletion**:

1. "IT FUNCTIONS" IS NOT "IT IS SAFE" (100% routing accuracy target; supersedes D474/D476 wording)
2. Do NOT write a tactical "never delete X" rule into this section (anti-carve-out meta-rule)
3. ORDER IS LOAD-BEARING for `property_suffixes` / `modifier_suffixes` (compare-first + ordered re-INSERT, never `INSERT OR REPLACE`)
4. Do NOT add `block_composition.has_inner_blocks` to a population gate (derived, not cached)
5. `block_composition.composition_role` looks dead from the converter but is LIVE (read by `check_tier_composition.py`)
6. A self-healing seeder blinds an in-process test (detector must be a separate process)
7. A population count cannot see a reclassification (right row, wrong value)
8. A table with `CREATE TABLE IF NOT EXISTS` on a hot path cannot be retired by dropping it alone
9. A shrinking seed file prunes the live DB on next import
10. A negative control has its own vacuity modes (confirm the break landed)
11. Two migrations (`testimonial-*`) are held back deliberately — regenerability unproven
12. `fx-horizontal-panel` has no defect — a CSS bug (`overflow-x:clip` computing `overflow-y` to `hidden`) provides the WCAG 2.4.11 rescue; do not "fix" it
13. The WooCommerce gallery bug did not exist — check which product actually rendered before diagnosing
14. Per-row `position:sticky` rejected (short-parent trap, D389) — sticky stays header-level
15. No absolute size value in a shared state-only stylesheet (D386), gated by `check-shared-css-state-rules.js`
16. After any `edit.js` / shared `src/components` change: deploy and open the real editor (D388)
17. A scoped axe run on a closed surface passes vacuously
18. `templateLock:'all'`/`'contentOnly'` re-applies the template on every mount, matched by array position (D393)
19. The D343 phantom border was WP core's `html :where([style*="border-width"])` substring-matching a custom property name, not shadows-as-borders
20. No-login shareable preview link is dropped, not deferred (Bean, 2026-07-27)
21. `<footer>` is generic — key any assertion on the class `wp-block-template-part`, never a naive regex
22. `~/.agents` is not a git repo — the skillscore script + grafted skills are live but unversioned
23. No block version bumps / deprecations pre-production (Bean D293, overrides STOP-57)

Plus **11 additional guardrail-shaped bullets found outside the labelled "Standing constraints" section** (embedded in the two NEXT SESSION blocks and the TRACK 1 follow-on), recommended for the same MOVE treatment so nothing is lost by only sweeping the labelled section:

24. A stale doc is a trap that fires on the next reader
25. Never hand-author block markup with a guessed attribute — WP silently discards undeclared attrs (D338)
26. A probe that never reaches the effect measures the probe
27. Fix the instrument, never the gate field (`probe-first-paint.mjs` explicit `--not-a-loop` opt-out)
28. Verify licences with `gh api`, never a README badge
29. Shared worktree, other tracks active — commit by exact path, never `git add -A`
30. Deploy before measure; `--dry-run` does not run the dirty gate; page-HTML grep cannot see block CSS
31. A static audit of this pipeline is a third of the truth — run the pipeline before concluding
32. Establish the denominator before quoting a percentage
33. A fix is a hypothesis too
34. Prove a path is dead by reaching it, not by observing it not fire (D474)

**Total standing-constraint-shaped statements identified: 34.** After the sweep, `STOP-CATALOGUE.md`'s entry count must be **≥ its pre-sweep count + 34** (some may already be duplicates of existing STOP-CATALOGUE entries — a real duplicate is fine to fold into one entry, but a genuine loss is not; see §6 verification).

---

## 5. Ranked plan to hit the 24,576-byte target

| Step | Action | Bytes saved | Running total (bytes) | Still over cap by |
|---|---|---:|---:|---:|
| 0 | Start | — | 37,035 | 12,459 |
| 1 | Move 23 Standing-constraints bullets → `STOP-CATALOGUE.md`; leave a 4-line pointer | ~5,343 | 31,692 | 7,116 |
| 2 | Move the 11 embedded guardrail bullets → `STOP-CATALOGUE.md`; leave pointer text folded into step 3/4's summaries (no separate line needed) | ~1,900 | 29,792 | 5,216 |
| 3 | Compress Tracks 1b/1c/2/2+2b narrative (§5) to per-sub-track status lines + existing pointers | ~5,150 | 24,642 | 66 |
| 4 | Compress Track 3 narrative (§4) to 4 bullets + pointer | ~3,150 | 21,492 | **under cap** |
| 5 | Compress HANDOFF QC box + CURRENT FRONTS QC-BYPASSED box to one line each | ~1,150 | 20,342 | under cap, 4,234 headroom |

**Target is reachable after Step 3 alone** (66 bytes over — Steps 4–5 close it with margin). **Nothing on this list requires cutting a standing constraint** — every byte removed from LEDGER in Steps 1–5 is relocated, not deleted, and the destinations (STOP-CATALOGUE.md uncapped, existing/new memory files, existing/new plan files) are exactly where the file's own frontmatter and the project's canonical-structure table say this content belongs.

**Optional Step 6 (not needed to hit the cap, but consistent with the file's stated purpose):** move the two remaining NEXT SESSION task-plan blocks (§12 minus what Step 1–3 already removed, and §13/§14 task detail) into `plans/`, leaving ~450 bytes of pointers. This buys ~4,200 bytes of extra headroom against future sessions' growth and stops LEDGER re-accumulating task-plan detail that belongs in `plans/`. Recommended as a follow-up, not required to close the immediate gap.

**Honest minimum, if only D101-safe moves are made (no plan-file relocation at all):** Steps 1–5 alone reach ~20,342 bytes — comfortably under the 24,576 cap, with zero rule cut. The target is fully reachable without sacrificing anything load-bearing.

---

## 6. Verification for whoever executes this

1. **Before the sweep:** count STOP-CATALOGUE.md's existing STOP/constraint entries (`grep -c` on its own heading pattern, e.g. `^- ⛔\|^- ⚠\|^\d+\.` — confirm the exact pattern from the file itself first).
2. **After the sweep:** re-count the same pattern in STOP-CATALOGUE.md. It must be **≥ pre-sweep count + 34**, minus any genuine duplicates you fold together (record each fold explicitly: "constraint #N folded into existing STOP-CATALOGUE entry X because Y").
3. **Diff the 34-item list in §4 of this report against STOP-CATALOGUE.md's new content** — every one of the 34 must appear verbatim or as a clearly-superset rewrite. Any missing item is a regression per D101 — do not close the sweep until resolved.
4. **Byte-check LEDGER.md** with `wc -c .claude/LEDGER.md` (or Python `len(open(...,'rb').read())` to avoid CRLF/LF ambiguity) — confirm ≤ 24,576.
5. **Link-check every new pointer** LEDGER.md now contains (memory/session files, plan files, STOP-CATALOGUE anchors) — a dangling pointer is worse than a copy, per the project's own `handoff-preflight.py --check` gate philosophy.
6. **Run `python .claude/hooks/handoff-preflight.py --check`** (the existing mechanical gate) after the sweep — it already checks the LEDGER byte cap and D101 STOP carry-forward; use it as the final pass/fail, not just this report's manual count.

---

## Summary

- **Current:** 37,035 bytes. **Target:** 24,576 bytes. **Gap:** 12,459 bytes.
- **Total recommended saving if all MOVE actions in §3 are executed:** ~32,585 bytes relocated (far more than needed — gives headroom), landing LEDGER at roughly **20,342 bytes** using only the D101-safe moves (Steps 1–5), or **~11,500 bytes** if the optional plans/ relocation (Step 6) is also done.
- **Target is reachable without cutting a single rule.** Every recommended cut is a relocation to a file the LEDGER's own frontmatter or the project's canonical-structure table already names as that content's home (`STOP-CATALOGUE.md` for standing constraints, `memory/session-*.md` for narrative history, `plans/` for task-plan detail).
- **Single biggest win:** compressing the Tracks 1b/1c/2/2+2b narrative (§5, lines 75–137, 5,765 bytes / 15.6% of the file) to per-sub-track status lines plus its own already-cited pointers — the section literally tells the reader "Full narrative: [file] — read before acting" and then repeats that full narrative anyway, so this is nearest to a genuine duplicate, not just a move.
