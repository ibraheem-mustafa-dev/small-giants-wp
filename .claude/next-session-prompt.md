---
doc_type: next-session-prompt
project: small-giants-wp
thread: no-inline styling rollout — continue the roster (quote/media/hero + block-private blocks) against the LOCKED contract
generated: 2026-07-09
primary_goal: "Continue the universal no-inline + box-group rollout. The mechanism is PROVEN on button/container/heading/text (4 blocks LANDED) and the converter is hardened. Each remaining block: migrate to the DONE checklist's 11 end conditions, LANDED-verify, commit. Next up: quote, media, hero, then the ~26 block-private blocks."
---

# NEXT SESSION — continue the no-inline rollout (quote → media → hero → the rest)

Invoke `/autopilot` first. The hard, risky work is DONE and proven: the box-object no-inline
mechanism is LANDED on **button, container, heading, text**, and the shared converter merge
spine is hardened (3 silent-loss bugs a `/qc-council` caught, all fixed, 436 tests). What
remains is **templated repetition** — apply the proven pattern to the rest of the roster,
one block at a time, each verified LANDED.

**Agent identity.** SGS block engineer executing a Bean-approved no-inline styling rollout.
You ORCHESTRATE (Opus) + GATE; delegate each block to a SOLO Sonnet subagent (disjoint block
dir → parallel-safe per FR-31-6.1) against the LOCKED contract. Prove every block LANDED on a
live page before "done" (STOP-21/43/44); re-run gates + tests yourself (STOP-16).

## ⛔ READ FIRST (the authority for this rollout)
1. **`.claude/plans/block-migration-DONE-checklist.md`** — the 11 end conditions = the definition
   of done for EVERY block. Tick them, don't re-derive them.
2. **`.claude/plans/2026-07-09-per-block-no-inline-migration-contract.md`** — the HOW (§A no-inline,
   §B box-group, §B2 device-tiers-only, §B3 no-wrapper, §C Spec/no-churn, §D security, §E editor,
   §E2 F3-drain).
3. **`.claude/decisions.md` head (D293 + D292)** — the proven mechanism + all context. Verify the
   D-ceiling: `grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1` (was D293).
4. **Proven exemplars to copy:** `src/blocks/button/` (single-element, block-private) + `src/blocks/heading/`
   + `src/blocks/text/` (single-element, full bar) + `src/blocks/container/` + `includes/class-sgs-container-wrapper.php` (composite, shared wrapper).
5. **Spec 31 §3.A/§4/§13.4 (FR-31-22) + Spec 32 §6.1** — the mechanism spec (read Spec 31 in full — Bean-locked).

## ⛔ ANTI-PATTERN STOPs (most load-bearing for THIS work; full catalogue in decisions.md + git history of this prompt)
- **STOP-16** — a subagent's "it works" is a HYPOTHESIS. Re-run yourself: `cd plugins/sgs-blocks/scripts && python -m pytest converter/tests -q --import-mode=importlib` (436 pass); `python check-box-family-guard.py --check`; `npm run build`.
- **STOP-21 / 43 / 44** — LANDED only by deploying + re-cloning + live computed-style on a real page. Emit-green ≠ LANDED. A crafted ASYMMETRIC test instance (4 distinct sides + asymmetric corners) is the proof for box families.
- **STOP-57 OVERRIDDEN (Bean D293)** — do NOT bump block versions, do NOT add deprecations (pre-production waste).
- **STOP-66** — after a block.json attr-shape change, `/sgs-update` (Stage 10) prunes the orphaned flat rows; run it before re-clone. `sgs-db.py sql` is READ-ONLY.
- **STOP-67 (NEW)** — the pre-commit visual-diff gate needs `<REPO_ROOT>/reports/visual-diff/<block>-<date>.md` (repo ROOT, NOT `plugins/…/reports/`) with frontmatter `verdict: PASS` + `first_paint_capture_passed: true`. No report = commit blocked.
- **STOP-39** — one SOLO coding subagent per shared file; disjoint block dirs may run parallel.

## Pre-flight self-attestation (answer in your first message)
1. Read the DONE checklist + contract + D293? Quote one end condition.
2. Branch `main`, D-ceiling verified, tree clean (ignore `lucide-icons.php`, `*.db` strays, generated `reports/phase4-*.txt` + `inline-styling-audit`)?
3. For each block: LANDED on a live page (asymmetric computed values), all 11 conditions ticked, visual-diff report at repo-root, gates + tests re-run by me?

## The LANDED verify recipe (every block)
1. `cd plugins/sgs-blocks && npm run build` (prebuild gates must pass).
2. `python scripts/build-deploy.py --target sandybrown --skip-build --blocks-only --allow-dirty`.
3. `python scripts/sgs-update-v2.py` (prune orphans + apply box_family seeds).
4. Re-clone page 8: `python plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py --mockup sites/mamas-munches/mockups/homepage/index.html --auto-section --client mamas-munches --page homepage --media-map sites/mamas-munches/research/sandybrown-media-map.json --deploy-target page:8 --skip-autonomy-gate` (confirms recognition + no `ConservationError`).
5. OPcache reset (HTTP `<?php opcache_reset()` to webroot + curl) + **LiteSpeed purge** (Hostinger MCP `hosting_clearWebsiteCacheV1`, user `u945238940`, domain `sandybrown-nightingale-600381.hostingersite.com`).
6. Asymmetric test instance via REST on the EXISTING page (id 1356, `/sgs-box-object-test/` — NEW pages 404 until rewrite flush; reuse 1356). Note per-block content attr names differ (heading=`content`, text=`text`). Anonymous Playwright + cache-bust → `getAttribute('style')` = no property decls on the subtree + `getComputedStyle` = the set values at 375/768/1440.
7. Write `reports/visual-diff/<block>-<date>.md` (verdict PASS + first_paint true), commit path-scoped.

---

## ORCHESTRATION PLAN (do in order; one solo Sonnet per block, gate each yourself)

## Task 1 — quote + media (Wave 1b box-family blocks)
**What:** migrate `sgs/quote` + `sgs/media` to the DONE checklist. quote = dual native+scalar border (uses `SGS_Container_Wrapper` for the outer but border is block-private); media = only border-radius migrates (currently `radius:false`, reads native `style.border.radius` as fallback — flip to native scoped + remove custom corner attrs).
**Why:** completes the 4-side/4-corner box-family blocks; both have real wrinkles the contract §C note flags.
**Orchestration:** 2 parallel solo Sonnet agents (disjoint dirs), each against the DONE checklist + the button/heading exemplars. box_family seeds: quote `borderWidth` already seeded; media needs none (radius→native). I prune + `/sgs-update` + build + deploy + re-clone + verify each LANDED. /qc gate: `/qc-inline` per block.
**Depends on:** none. **Acceptance:** each ticks all 11 DONE conditions, LANDED asymmetric, visual-diff PASS.

## Task 2 — hero (the 5-family outlier)
**What:** migrate `sgs/hero`'s 5 per-area SGS-custom families (contentPadding/mediaPadding/imagePadding/imageBorderWidth/imageBorderRadius, each with tiers + non-standard token order `imageBorderRadiusTabletTL`) + contentBandPadding to objects; flip all supports to skipSerialization; F3-drain (`align-items:center` hardcode). Hero uses `SGS_Container_Wrapper` for the section but renders per-area families block-privately.
**Why:** hero is the biggest single block + on page 8 (LANDED-verifiable directly).
**Orchestration:** ONE dedicated solo Sonnet agent (do NOT lump with the parallel wave — it's the outlier). Add its box_family seeds centrally first. /qc-council before commit (composite render change, blub-255).
**Depends on:** Task 1 done (pattern re-confirmed). **Acceptance:** hero content/media/image padding + borders LANDED on page 8 at 3 breakpoints, zero inline, F3 entry drained.

## Task 3 — block-private roster (~26 blocks) + F3-drain
**What:** the remaining blocks with block-private `style=` (hero overlay/bgSvg, cta-section, card-grid, info-box, testimonial, product-card, etc.) each to the full DONE bar + drain their F3 baseline entry (content-collection, form, mega-menu, mobile-nav, pricing-table, product-card).
**Why:** delivers the "zero inline framework-wide" outcome.
**Orchestration:** parallel solo Sonnet agents, one per block (disjoint dirs, FR-31-6.1), grouped ~4 at a time; I gate + LANDED-or-GATE-verify each (on-page → LANDED; off-page → audit-inline-styling.js clean + AST gate + synthetic clone). Log which tier each got (no "all LANDED" overclaim).
**Depends on:** Task 2. **Acceptance:** every block 0 inline (`audit-inline-styling.js`), 0 F3 baseline rows, gates green.

## Task 4 — wire the gates zero-tolerance + close
**What:** once the roster is green, wire `audit-inline-styling.js --check` + `check-box-family-guard.py --check` into `prebuild` as zero-tolerance; reconcile Spec 31/32 + CLAUDE.md to "rollout complete".
**Acceptance:** prebuild fails on any new inline / name-based box merge.

## Dependency graph
```
Task 1 (quote + media — 2 parallel Sonnet) → /qc-inline + LANDED each
  ↓
Task 2 (hero — solo Sonnet) → /qc-council + LANDED page 8
  ↓
Task 3 (block-private roster — parallel Sonnet waves) → LANDED-or-gate each
  ↓
Task 4 (wire 2 gates zero-tolerance) → /handoff
```

## Skills to Invoke
| Skill | When |
|-------|------|
| /brainstorming | ALWAYS — per-block design wrinkles |
| /gap-analysis | ALWAYS — grade before delivery |
| /lifecycle | ALWAYS — before any skill/agent change |
| /research + /library-docs | ALWAYS — WP BoxControl / Style Engine / skipSerialization APIs |
| /strategic-plan | ALWAYS — order the roster waves |
| /qc-council | hero + any converter-touching change (blub-255) |
| /qc-inline | per-block build check |
| /dispatching-parallel-agents | the parallel block waves |
| /sgs-clone /sgs-db /wp-blocks | pipeline + schema ground truth |
| /verify-loop /handoff /capture-lesson | 2-attestation / session close |

## MCP Servers & Tools
| Tool | For |
|------|-----|
| Playwright / chrome-devtools | LANDED computed-style at 375/768/1440 |
| Hostinger MCP `hosting_clearWebsiteCacheV1` | LiteSpeed purge before live verify |
| `sgs-db.py sql` (READ) + `/sgs-update` (prune+seed) | DB queries + STOP-66 orphan prune |
| REST app-pwd (`.claude/secrets/sandybrown.env`) | craft asymmetric test instances on page 1356 |

## Agents to Delegate To
| Agent | When |
|-------|------|
| general-purpose (Sonnet, solo) | each block migration (disjoint dir) |
| Explore / general-purpose (read-only, parallel) | map a block's current box-attr state before migrating |
| wp-sgs-developer | heavier composites (hero) |

## Methodology guardrails (do not skip)
- **Deploy + re-clone + purge (LiteSpeed + OPcache) before measure** (STOP-21). Re-clone confirms recognition didn't break on the attr reshape.
- **Prove the premise on the real node** (STOP-43); LANDED asymmetric, never emit alone (STOP-4/44).
- **/qc-council before every converter/composite commit** (blub-255); re-run tests + gates yourself (STOP-16).
- **One solo coding subagent per shared file** (STOP-39); build each block against the DONE checklist (no drift).
- **No version bumps, no deprecations** (Bean D293). **Visual-diff report at REPO-ROOT** `reports/visual-diff/` (STOP-67).
- Branch main; commit path-scoped (never `git add -A`); verify D-ceiling before a new D.
