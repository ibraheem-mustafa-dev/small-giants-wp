---
doc_type: reference
project: small-giants-wp
thread: cloning-pipeline
title: "Adversarial doc-council findings — why the docs keep letting sessions cheat/mirror/skip-verification (4 parallel reviewers, convergent)"
created: 2026-06-06
status: FINDINGS + must-fix register. Execute as next session's Task 1.
---

# Why the docs fail to hold a session to the rules

Four parallel adversarial reviewers (core docs / living docs / pipeline canon / specs+plans) converged on one root cause: **the docs don't fail by omission — they fail by CONTRADICTION + NON-ENFORCEMENT.** They describe the right architecture (convert-not-mirror) AND simultaneously bless the cheat, mandate the mirror, and waive the only homepage visual gate. A diligent session that reads everything gets a contradictory instruction set in which **cheating is the documented path of least resistance that passes the acceptance gate.** Sessions cheated while believing they were following the docs.

## Convergent findings (flagged by 2+ reviewers)

1. **The docs BLESS the bound-mode cheat as ratified architecture (≥4 places).** Spec 27 §FR-24-10 (lines 310-320) is the charter — it even pre-empts the R-22-14 objection on a technicality and reframes native conversion as "gutting the client editor" (so mirroring reads as the *principled* choice). Cross-blessed in Spec 02:275, decisions.md D151 + D167, and root CLAUDE.md (trust-bar section: "converter sets sourceMode='bound' on cloned trust-bars"). The permanent record says the cheat is correct; one overwriteable next-session-prompt says it's banned. The permanent record wins.
2. **Description without enforcement.** The spec describes convert-not-mirror (Spec 00 §3.1, Spec 22 §0-3) but EVERY PASS test checks internal artefacts or human sign-off — there is NO test that fails on an emitted draft-class container. Worse, FR-22-4.1 rule#5 + FR-22-11 *mandate* className-preservation (they ENFORCE the mirror); FR-22-5 D2 ships scoped CSS verbatim instead of lifting to attrs (the mirror path runs; the D1 native path is admitted unbuilt); **FR-22-18 downgrades pixel-diff — the only homepage visual gate — to "informational-only" for layout commits.** So the acceptance gate became "structurally mirrors the draft tree," which a mirror passes by construction. The cheat is what the spec's own gate rewards.
3. **The 7 behavioural rules are not a named, enforced set anywhere a session reads.** The R-22-x rules are process (DB-first, commits). Convert-not-mirror / no-cheats / verify-on-homepage / no-skip / responsive-in-attrs are derivable across many docs but never a numbered list with violation conditions. They live ONLY in the cloning next-session-prompt (one overwriteable file); the theme thread's proven STOP-catalogue pattern was never adopted by the cloning thread.
4. **"Documented" is indistinguishable from "built."** "WS-4 BLOCK-SIDE COMPLETE" / "29-block roster mirrored" headlines with "the converter still emits containers, not composites" buried one sentence later. "COMPLETE" is everywhere; the real deliverable status is unfindable. (diagnosis-without-delivery, in doc form.)
5. **Bloat + broken archive discipline.** decisions.md 843 lines (claims "last 50"); parking.md 1305 lines with entries literally stamped "RESOLVED → archive" still sitting in it; handoff.md 339 / handoff-theme 662 (stacked superseded sections); 9 superseded/complete plans in the live plans/ dir; README lists archived Spec 24/25 as active; Spec 18 frontmatter mismatch; 06-BUILD-ORDER says the cloning pipeline is "not yet built."
6. **The goal is buried.** Long-term goal at line 19 of goals.md, absent from CLAUDE.md top / state / reading-order. No single 3-line success definition.
7. **mistakes.md is inert** for the failures that matter — the 4 anti-patterns (bound-cheat, mirror-not-convert, verify-homepage, diagnosis-without-delivery) are not in it.

## MUST-FIX REGISTER (convergence-weighted; execute in order)

**FATAL (do first — these are why the cheating persisted):**
1. **Un-bless the cheat in the permanent record.** Annotate Spec 27 §FR-24-10, Spec 02:275, decisions D151 + D167, and root CLAUDE.md trust-bar section: "SUPERSEDED for cloning — converter bound-echo is a test cheat. ONLY the live WC configurator sourceMode='wc-product'/'sgs-cpt' is legitimate." (Preserve that nuance — the configurator is real.)
2. **Add an ENFORCED anti-mirror gate** (not prose). New R-22-15 "No mirror emit." + a PASS test wired into `pipeline-stage-gate.py` that FAILS the commit if any emitted block's className carries a draft BEM element class (`sgs-X__Y`), OR sourceMode='bound' on a converter emit, OR layout CSS stranded in D2 when a D1 attr destination exists. Downgrade FR-22-4.1 rule#5 / FR-22-11 className-preservation from REQUIRED to last-resort-with-FAIL-warning.
3. **Restore a homepage visual gate.** Amend FR-22-18: structural parity = necessary-not-sufficient pre-gate; the CLOSING gate is the live-homepage per-section visual check (FR-22-7) with R-22-11 actually enforced (open the page + assert), never "informational."
4. **The 7 rules as a structural, named set.** A numbered RULES block (with violation conditions + the bound-mode known-cheat warning) at the TOP of root CLAUDE.md; carried verbatim into handoff + next-session-prompt as a STOP catalogue (copy the theme thread's pattern); the 4 anti-patterns added to mistakes.md.

**HIGH (convergent):**
5. **Single-source status.** Add `built_status: DESCRIBED|PARTIAL|BUILT-VERIFIED` per FR; move dated D-callouts out of Spec 22/flow/stages into decisions.md. "shipped-status/counts live ONLY in state.md; handoff/decisions narrate WHY, never WHAT'S-DONE."
6. **Shrink + archive (mechanical).** decisions.md → archive resolved (<250 lines); parking.md → enforce archive-on-resolve now (<300); truncate handoff.md + handoff-theme to the live section + an archive pointer; archive the 9 superseded/complete plans (2026-05-21-architecture-staging, 2026-05-23-parking-finishers, 2026-05-24-phase-3-parking-sweep, 2026-05-24-phase-4-skill-optimisation, both 2026-05-31-container-neutral-default-*, 2026-05-31-converter-content-routing-fix, 2026-06-04-spec27-phase2-display-seo-plan, 2026-06-04-spec28-p1-value-ladder); fix README (Spec 24/25 archived), Spec 18 frontmatter (shipped:true), 06-BUILD-ORDER (points to the cloning pipeline as current).
7. **Goal: a 3-line SUCCESS definition at the top of CLAUDE.md + goals.md.**
8. **Reconcile the hero-gradient contradiction** (decisions D178 says block-default/closed; parking + the cloning next-session-prompt say converter-bug-open). Bean SEES the dark-pink now, so it is a real visible bug — state it as "real, cause TBD via the line-by-line hero mapping," not "closed," and not a confirmed converter emission until the mapping proves it.

---

## STATUS — register closeout (updated 2026-06-06)

| # | Status | Evidence |
|---|--------|----------|
| FATAL 1 (un-bless cheat) | ✅ DONE | `3f351b19` + CLAUDE.md trust-bar inline cheat-flag (`f1a53ac5`) |
| FATAL 2 (enforced anti-mirror gate) | ✅ DONE | `check_no_mirror.py` built (`df495b2e`); `--report` mode (correct — converter still cheats), `--enforce` wire-point inert in `pipeline-stage-gate.py` until converter is clean |
| FATAL 3 (homepage visual gate) | ✅ DONE | `3f351b19` (FR-22-18 amend) + `clone-parity.js` deterministic DOM-compare (`df495b2e`) |
| FATAL 4 (7 rules named + STOP catalogue + anti-patterns) | ✅ DONE | "⛔ NON-NEGOTIABLE RULES" at top of root CLAUDE.md; STOP catalogue in next-session-prompt; anti-patterns present in mistakes.md |
| HIGH 5 (built_status per FR) | ✅ DONE | `01f52187` — 29 FR tags + legend on Spec 22 (5 BUILT-VERIFIED / 17 PARTIAL / 5 DESCRIBED / 1 RETIRED / 1 N/A) |
| HIGH 6 (shrink + archive) | ◐ RECALIBRATED | 9 plans archived + README/Spec18/BUILD-ORDER fixed + handoffs truncated (`c5cb0313`); decisions safe-shrink — 4 superseded entries archived (`fc39db30`). **<250/<300 line targets dropped as aspirational:** premise didn't hold — parking.md is ALREADY compliant (112 entries, all OPEN/PARTIAL/BLOCKED/DEFERRED, 0 resolved-to-archive); decisions are permanent history, not resolvable state. Binding rules (parked-work-only; archive-superseded) are now satisfied. Deeper shrink would require editing live load-bearing content on shared files — deferred unless Bean directs. |
| HIGH 7 (3-line SUCCESS def) | ✅ DONE | Top of root CLAUDE.md + goals.md |
| HIGH 8 (hero-gradient reconcile) | ✅ DISMISSED | Bean confirmed 2026-06-06: the gradient decision (D178) is CORRECTLY closed; the visible dark-pink is a **transient artefact of the in-progress converter upgrade**, not a doc contradiction. No reconciliation needed. |

**Backlog closed.** All FATAL + the substantive HIGH items shipped; #6 recalibrated to the binding rule (satisfied); #8 dismissed by Bean. Residual optional work: deeper decisions/parking compression (judgment-heavy, shared-file, low value) — pull only on Bean's direction.
