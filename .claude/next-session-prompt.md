---
doc_type: next-session-prompt
project: small-giants-wp
thread: no-inline styling rollout — continue the ROSTER (52 styling-support blocks) to the full DONE bar
generated: 2026-07-09
primary_goal: "Continue the universal no-inline + box-object rollout. PROVEN + LANDED on button/container/heading/text/quote/media/hero (7 blocks) + the shared wrapper (max-width/contentWidth/band/GRID all scoped). The mechanism, the content-KIND→block-private principle (D294), and the grid-scoping (D296) are all settled. What remains is TEMPLATED REPETITION across the rest of the roster: ~52 blocks that declare styling supports, each to the 11-condition DONE checklist, LANDED-verified, committed — run in phased waves."
---

# NEXT SESSION — continue the no-inline ROSTER (52 blocks, phased waves)

Invoke `/autopilot` first. The hard architecture is DONE + LANDED (D294–D296): the box-object
no-inline mechanism, the content-KIND→block-private decision, hero (the biggest block), and the
universal grid-scoping. What remains is applying the PROVEN recipe to the rest of the roster —
one wave at a time, each block LANDED-verified.

**Agent identity.** SGS block engineer executing a Bean-approved no-inline styling rollout. You
ORCHESTRATE (Opus) + GATE + strictly QC; delegate each block to a SOLO Sonnet subagent (disjoint
block dir → parallel-safe per FR-31-6.1). Haiku for mechanical, Sonnet for higher-need blocks.
Prove every block LANDED on a live page before "done" (STOP-21/43/44); re-run gates + tests
yourself (STOP-16).

## ⛔ SCOPE REALITY (Bean-corrected 2026-07-09 — the prompt's "~26" was WRONG)
The real remaining scope is the FULL styling-support roster, NOT 26. DB ground truth:
**59 blocks declare styling supports; 7 migrated (button/container/heading/text/quote/media/hero);
→ 52 remaining** + 6 F3-debt blocks (content-collection/form/mega-menu/mobile-nav/pricing-table/
product-card) + a few no-support blocks with inline-render (decorative-image, modal, mega-menu).
This is a PHASED, MULTI-SESSION programme — you cannot LANDED-verify 52 blocks in one sitting.
Close a clean WAVE per session.

## ⛔ MANDATORY READING GATE (read IN FULL before any Write/Edit)
1. **`.claude/plans/block-migration-DONE-checklist.md`** — the 11 end conditions = definition of done per block. Tick them, don't re-derive.
2. **`.claude/plans/2026-07-09-per-block-no-inline-migration-contract.md`** — the HOW (§A no-inline, §B box-group, §B2 device-tiers-only 1023/767, §B3 no-wrapper, §C spec/no-churn, §D security, §E editor, §E2 F3-drain).
3. **`.claude/decisions.md` head (D294 + D295 + D296)** — the content-KIND principle + hero + grid-scoping + all context. Verify the D-ceiling: `grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1` (was D296).
4. **Spec 31 §2/§3.A/§4/§13.4 + Spec 32 §6.1** — read Spec 31 IN FULL (Bean-locked, every session).
5. **Proven exemplars to COPY:**
   - Single-element block-private: `src/blocks/{button,heading,text}/` (element-as-root, class/id uid, full bar).
   - Content-KIND composite → block-private: `src/blocks/quote/` (blockquote root, no wrapper, all CSS scoped).
   - Section/layout composite keeping the wrapper: `src/blocks/hero/` + `includes/class-sgs-container-wrapper.php` (per-area families block-private-scoped; wrapper owns section box/width/band/GRID, all now scoped).

## ⛔ THE D294 PRINCIPLE (which pattern each block uses — DO NOT re-litigate; qc-council-settled)
- **content-KIND composites** (`container_kind='content'`) that use ONLY box+width → **BLOCK-PRIVATE** (like quote). They don't use the wrapper's grid/section machinery; converter routing is indifferent to `wraps_block` (verified). Applies to: info-box, testimonial, team-member, product-faq-item, notice-banner, option-picker, product-card, product-faq, tab, accordion-item, form-step, mobile-nav — BUT verify per-block whether one genuinely needs the wrapper's structure before dropping it (STOP-and-ask if unsure — §B3).
- **section/layout-KIND composites** → **KEEP `SGS_Container_Wrapper`** (genuine grid/section). The wrapper is now fully scoped (spacing/max-width/contentWidth/band/GRID — D292/D294/D296), so keeping it is no-inline. Emit only the block's OWN extras block-private-scoped (like hero). Applies to: cta-section, modal, trust-bar (section); accordion, card-grid, feature-grid, form(+field-tiles), gallery, google-reviews, multi-button, post-grid, pricing-table, tabs, testimonial-slider, trustpilot-reviews, content-collection (layout).
- **single-element / leaf blocks** (no wrapper) → **BLOCK-PRIVATE** (like heading/text/button): label, icon, counter, whatsapp-cta, social-icons, star-rating, business-info, breadcrumbs, collapsible-text, brand-strip, countdown-timer, timeline, process-steps, icon-list, table-of-contents, decorative-image, etc.

## ⛔ ANTI-PATTERN STOPs (carry forward + this session's new ones)
- **STOP-16** — a subagent's "it works" is a HYPOTHESIS. Re-run yourself: `cd plugins/sgs-blocks/scripts && python -m pytest converter/tests -q --import-mode=importlib` (439 pass); `python check-box-family-guard.py --check`; `node check-dead-controls.js --check`; `node check-hardcoded-render-defaults.js --check`; `npm run build`.
- **STOP-21 / 43 / 44** — LANDED only by deploying + (re-cloning if attr-shape changed) + live computed-style on a real page. Emit-green ≠ LANDED. Asymmetric instance (4 distinct sides + asymmetric corners) is the box-family proof.
- **STOP-57 OVERRIDDEN (Bean D293)** — NO version bumps, NO deprecations (pre-production waste).
- **STOP-66** — after a block.json attr-shape change, `/sgs-update` (`sgs-update-v2.py`, Stage 10) prunes the orphaned flat rows; run it (or `--stage 1` for seeds + `--stage 10` for prune) before re-clone. `sgs-db.py sql` is READ-ONLY.
- **STOP-67** — the pre-commit visual-diff gate needs `<REPO_ROOT>/reports/visual-diff/<block>-<date>.md` (repo ROOT) with frontmatter `verdict: PASS` + `first_paint_capture_passed: true`. No report = commit blocked.
- **STOP-68 (CLOSED D296, but the lesson stands)** — grid CSS (`display:grid`/`grid-template-*`) is scoped in the SHARED wrapper (once, universally), NOT per block. Do not re-inline grid in any block; do not claim framework-wide zero-inline while any block still inlines a real property.
- **STOP-39** — one SOLO coding subagent per shared file; disjoint block dirs may run parallel. NEVER 2+ concurrent writers on a shared file (wrapper / sgs-update-v2.py / converter).
- **NEW this session — the subagent wrapper-rip-out trap:** a Sonnet migrator may unilaterally drop `SGS_Container_Wrapper` from a composite (it did on quote). QC every composite migration against the DB `wraps_block`/`container_kind` + the D294 principle before accepting. The `/qc-council` on the quote question is DONE — do not re-run it; apply the verdict.

## Pre-flight self-attestation (answer in your first message)
1. Read the DONE checklist + contract + D294/D295/D296? Quote one end condition + which pattern this wave's blocks use.
2. Branch `main`, D-ceiling verified (was D296), tree clean (ignore `lucide-icons.php`, `*.db` strays, generated `reports/phase4-*.txt` + `inline-styling-audit`)?
3. For each block: LANDED on a live page (asymmetric where box families apply), all 11 conditions ticked, visual-diff report at repo-root, gates + tests re-run by me?

## The LANDED verify recipe (every block — PROVEN this session)
1. Migrate block files (solo Sonnet, its dir only). I add box_family seeds CENTRALLY in `sgs-update-v2.py` (subagents never edit it).
2. `cd plugins/sgs-blocks && npm run build` (prebuild gates: dead-controls, hardcoded-defaults, box-family AST — all must pass).
3. `python scripts/build-deploy.py --target sandybrown --skip-build --blocks-only --allow-dirty`.
4. `python scripts/sgs-update-v2.py --stage 1` (apply seeds + new attrs) + `--stage 10` (prune orphans, STOP-66).
5. OPcache reset (HTTP `<?php opcache_reset()` to webroot + curl + rm) + LiteSpeed purge (Hostinger MCP `hosting_clearWebsiteCacheV1`, user `u945238940`, domain `sandybrown-nightingale-600381.hostingersite.com`).
6. **If the block is ON page 8 (hero, product-card, trust-bar, testimonial, card-grid, feature-grid, info-box, cta-section, etc.):** re-clone page 8 (orchestrator cmd — see git history of this prompt / the recipe used this session) so stored content carries the new attrs, then LANDED-verify the LIVE block via Playwright at 375/768/1440 (zero inline subtree + computed values + no regression). **If NOT on page 8:** craft an asymmetric REST test instance on the EXISTING page 1356 (`/sgs-box-object-test/`; new pages 404 until rewrite flush) + Playwright anonymous cache-bust.
7. Write `reports/visual-diff/<block>-<date>.md` (verdict PASS + first_paint true), commit path-scoped (`git commit -- <paths>`, never `git add -A`; the gate wants explicit `-- <paths>`).

---

## WAVE PLAN (do ONE wave per session; ~4–8 blocks/wave; gate each block yourself)

Derive the exact per-wave list from the DB each session (don't trust a cached list):
`python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "SELECT container_kind, group_concat(block_slug) FROM block_composition WHERE wraps_block='sgs/container' AND container_kind IS NOT NULL GROUP BY container_kind"` for composites; `grep -lE '__experimentalSkipSerialization' src/blocks/*/block.json` for what's DONE.

### Wave 1 — single-element / leaf block-private (FASTEST — copy heading/text/button)
label, icon, counter, whatsapp-cta, social-icons, star-rating, business-info, breadcrumbs — each renders one semantic element; box families → objects, supports skip-serialised, all scoped, F3-drain if listed. ~4 at a time, parallel solo Sonnet (disjoint dirs). Many are OFF page 8 → asymmetric on 1356.

### Wave 2 — more leaf blocks + F3-drains
collapsible-text, brand-strip, countdown-timer, timeline, process-steps, icon-list, table-of-contents, decorative-image (8 inline-render), + F3-drain: mega-menu, mobile-nav.

### Wave 3 — content-KIND composites → BLOCK-PRIVATE (per D294, like quote)
info-box, testimonial, team-member, product-faq-item, notice-banner, option-picker, product-faq. (product-card, mobile-nav, tab, accordion-item, form-step: verify per-block whether they truly drop the wrapper or keep it — STOP-and-ask if a wrapper looks load-bearing.) Most ARE on page 8 → LANDED directly + re-clone. `/qc-council` any that touch shared render.

### Wave 4 — section/layout composites KEEPING the wrapper (like hero)
cta-section, card-grid, feature-grid, accordion(+item), tabs(+tab), gallery, google-reviews, trustpilot-reviews, form(+step+field-tiles), post-grid, pricing-table, testimonial-slider, content-collection, trust-bar, multi-button, modal. The wrapper is fully scoped (D296) — emit only each block's OWN extras block-private-scoped. `/qc-council` before each composite commit (blub-255). F3-drain: content-collection, form, pricing-table, product-card.

### Task 4 (FINAL — after the roster is green) — wire gates zero-tolerance + close
Wire `audit-inline-styling.js --check` (0 inline) + `check-box-family-guard.py --check` into `prebuild` as zero-tolerance; reconcile Spec 31/32 + CLAUDE.md to "rollout complete"; `/handoff`.

## DONE this session (D294–D296 — no action needed)
- **Task 1 (`13fd1634`):** quote + media LANDED block-private (zero inline, box-objects); shared wrapper max-width/contentWidth/band inline→scoped.
- **qc-council (unanimous):** content-KIND composites → block-private (D294 principle above).
- **Task 2 (`74d164c6`):** hero LANDED — 6 per-area box-object families + F3-drain, keeps wrapper; blub-255 2-rater panel SHIP; overlay_colour sanitiser fixed.
- **Grid-scoping (`d65e7d10`, D296):** wrapper grid/flex CSS inline→scoped (STOP-68 closed); LANDED 0-inline across all 95 SGS elements, grids intact.

## Skills / MCP / Agents (carry forward)
| Skill | When |
|-------|------|
| /brainstorming | per-block design wrinkles |
| /qc-council | composite render / shared-file changes (blub-255) — but the quote wrapper Q is SETTLED, don't re-run |
| /qc-inline | per-block build check |
| /dispatching-parallel-agents | the parallel block waves |
| /sgs-clone /sgs-db /wp-blocks | pipeline + schema ground truth |
| /handoff /capture-lesson | session close |

| MCP / Tool | For |
|------|-----|
| Playwright / chrome-devtools | LANDED computed-style + inline scan at 375/768/1440 |
| Hostinger MCP `hosting_clearWebsiteCacheV1` | LiteSpeed purge before live verify (user `u945238940`) |
| `sgs-db.py sql` (READ) + `sgs-update-v2.py` (--stage 1 seeds / --stage 10 prune) | DB + orphan prune |
| REST app-pwd `.claude/secrets/sandybrown.env` | asymmetric test instances on page 1356 |

| Agent | When |
|-------|------|
| general-purpose (Sonnet, solo) | each block migration (disjoint dir); Haiku for the simplest leaf blocks |
| Explore / general-purpose (read-only, parallel) | map a block's current box-attr state before migrating |

## Methodology guardrails (do not skip)
- Deploy + (re-clone if attr-shape changed) + purge (LiteSpeed + OPcache) before measure (STOP-21).
- LANDED asymmetric where box families apply, never emit alone (STOP-4/44); prove the premise on the real node (STOP-43).
- One solo coding subagent per shared file (STOP-39); QC every composite's wrapper decision vs the DB + D294.
- No version bumps, no deprecations (D293). Visual-diff report at REPO-ROOT (STOP-67).
- Branch main; commit path-scoped `git commit -- <paths>` (never `git add -A`); verify D-ceiling before a new D.
