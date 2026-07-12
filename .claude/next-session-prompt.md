---
doc_type: next-session-prompt
project: small-giants-wp
generated: 2026-07-12
thread: post-D314 — BUILD the parity-tool rebuild to Spec 20 v1.1.0 (design LOCKED), validated vs the D314 ledger. (Page-8 in-contract fidelity COMPLETE: A/B accepted, C+E fixed, D safe.)
---

# NEXT SESSION — BUILD the parity tool to the locked Spec 20 v1.1.0

You are the SGS cloning-pipeline developer. **D314 closed out page-8 in-contract fidelity:** proved it's ~95% not 100%, **fixed C** (product-card description + price-note colour — null-role seeding, LANDED), **fixed E** (product-card CTA padding — composite-mirror, LANDED 14/24/48/flex), confirmed **D safe** (inline `<a>` stays inline), A+B Bean-accepted. **The sole remaining Bean task:** BUILD the parity-tool rebuild to the LOCKED Spec 20 v1.1.0, validating its verdict against the independent D314 ledger (`reports/visual-diff/page8-dom-ledger-2026-07-12.md`) — it must AGREE (~94–95% visible), never self-report. Invoke `/autopilot` first.

**Also (small):** the remaining C-type same-type sweep — `sgs/mobile-nav` (focus/active/sublink) + `sgs/trust-bar` (shapeDivider*Colour) have the same null-role gap but DIFFERENT mechanisms (state selectors / SVG pseudo-element), so verify each before seeding (do NOT blind-seed — wake-latent-misseeds).

Read `.claude/handoff.md` + `.claude/CLAUDE.md` for full context.

## ⛔ MANDATORY READING GATE (read IN FULL before any Write/Edit)
1. `.claude/handoff.md` (D312/D313) + `.claude/decisions.md` head (D313, D312, D311).
2. **Spec 31 IN FULL** (Bean-locked every session) — §3.A CSS routing, §13.4 FR-31-5.2, §13.6 composite-mirror + D294, FR-31-22 box-object, §7b, the cheat catalogue.
3. **Spec 20 (`.claude/specs/20-CLONE-FIDELITY-MEASUREMENT.md`) IN FULL** — the CANONICAL spec for the parity tool Task 2 rebuilds (v1.0.0, FR-20-1..8). It already defines: FR-20-1 effective-value **content-matched** comparison (`getComputedStyle`, keyed by text content NOT class), FR-20-2 universal draft-agnostic capture, FR-20-4 unmatched-element surfacing, FR-20-6 documented-limits-not-silent-gaps, FR-20-8 Stage 11.6 wiring. Read what it CLAIMS vs what the tool DOES (it over-counts — STOP-48/49). **Note:** Bean's ask (match tags + classes + elements + content + CSS) is BROADER than Spec 20 v1.0.0 (computed-CSS-focused) → Task 2 AMENDS Spec 20 first (spec-first, like Spec 32 this session), then builds to it.
4. `.claude/parking.md` head — `P-PATTERNS-USE-CORE-BLOCKS`, `P-DRAFT-TOKEN-EXTRACTION-SETUP-PIPELINE`, `P-PAGE8-DISCREPANCY-REGISTER`.
5. The parity tool source: `plugins/sgs-blocks/scripts/parity/computed-parity.js` + how Stage 11.6 calls it in `sgs-clone-orchestrator.py`.

## ⛔ ANTI-PATTERN STOPs (carried forward + this session's — NEVER subtract, D101)
- **STOP-NULL-ROLE-BLOCKS-ROUTING (NEW, D314)** — a block scalar-styling attr with `role=NULL` (and/or `derived_selector=NULL`) in `block_attributes` is INVISIBLE to the D301 role-driven CSS router → the draft's value silently drops to the block default (this was C: product-card `descColour`/`descFontSize`/`descLineHeight`). Fix = seed `role`+`derived_selector` via `ATTR_CLASSIFICATION_OVERRIDES` in `sgs-update-v2.py` (R-31-1 channel, NOT manual SQL) → `/sgs-update --stage 1`. STOP-44 pre-check FIRST (does render.php consume the attr?), and `enabling-a-capability-wakes-latent-misseeds` (audit before enabling). Other blocks likely carry the same latent gap.
- **STOP-LAZY-LOAD-FALSE-NEGATIVE (NEW, D314)** — a below-fold `loading="lazy"` image is in the DOM but may NOT be painted/sized when a headless `fullPage` screenshot or computed capture fires → it false-flags as "missing"/zero-size (caught D314 on the brand-story image; the live-DOM probe was right). ALWAYS force-load deferred content (scroll full height / `loading='eager'` + `decode()` + settle) before measuring. Now Spec 20 FR-20-11.
- **STOP-PARITY-OVERCOUNTS-SUBVISIBLE (NEW, D314)** — the v1.0.0 computed-parity % under-counts visible fidelity BROADLY: font-family fallback-stack (37% of mismatches, same primary font), clone-only/UA props (`interactivity`/`appearance`), AND sub-visible representational twins (line-height px reps, margin absorbed by flex-gap, `display:flex↔block`, `align-items:normal↔stretch`, flex-grow). 76% raw = ~94–95% VISIBLE. Never cite the raw % as fidelity; the rebuilt tool (Spec 20 FR-20-3a) must track VISIBLE fidelity + agree with the D314 ledger.
- **STOP-E-IS-NOT-A-ROLE-SEED (NEW, D314)** — E (product-card CTA padding) looks like C but is NOT a role-seed: `ctaPaddingX/Y` have no `property_suffixes` row, padding isn't a scalar-styling-lift role, and cta* is D284-owned. Don't apply the C fix to it.
- **STOP-FIX-DRAFT-NOT-CLONE (D313)** — an a11y/fidelity issue that is INHERITED FROM THE DRAFT is fixed at the DRAFT source (edit the mockup, then re-clone), NEVER patched on the clone and NEVER via a converter carve-out (Bean-locked: "we should not depart from the draft at all"). The clone stays a faithful mirror of the (corrected) draft. Verify the draft actually has the issue before deciding (a draft-inherited issue vs a clone bug are handled differently).
- **STOP-PARITY-NOT-A-MEASURE (D309, ELEVATED)** — the CURRENT computed-parity % is NOT trustworthy (over-counts font-stacks + clone-only props; STOP-48/49). Task 2 is to FIX this so the number CAN be trusted. Until it is fixed + Bean-validated, do NOT cite the aggregate % as an outcome; the signal is a direct per-element compare (matched by content) + Bean's eye.
- **STOP-VERIFY-CACHE-LAYER-INSTALLED (D312)** — before leaning on a cache/CDN optimiser, VERIFY it is installed/active (`wp plugin list`, response headers). LiteSpeed Cache IS now installed on sandybrown (page cache active) — `wp litespeed-purge all` before any live measure.
- **STOP-SELF-CONSISTENT-RENDER-UNDER-CACHE (D312)** — a delivery whose correctness needs a cross-request "warm up" is frozen by a full-page cache (reproduced live). Prefer a design where every render is self-consistent. Test WITH the cache layer installed.
- **STOP-STYLE-TAG-IS-NOT-STYLE-ATTR (D311)** — a `<style>` TAG is NOT an inline `style="…"` ATTRIBUTE; Spec 32 §6.1(b) sanctions the block's own scoped `<style>`. Check BOTH `style=` attributes AND `<style>`/`<link>` placement.
- **STOP-GOLDEN-CAN-BE-STALE (D311)** — a committed conformance golden can be STALE; prove a converter emit claim with a real-node trace of the CURRENT converter, not by reading a golden. A render-side-only change can't newly break a golden.
- **STOP-VERIFY-COLOUR-HOVER-AND-VS-DRAFT (D310)** — verifying a cloned colour = measure REST **and** HOVER (`.hover()`) vs the DRAFT's exact rule, never resting-contrast-only. A composite's own `style.css .block .sgs-x--y` (0,2,0) overrides the shared channel.
- **STOP-CSS-VER-CACHE-BUST (D310)** — a `style.css`-ONLY change is served STALE (`?ver` pinned to block.json version) → bump the version. Render-side inline/output-buffer changes land fresh.
- **STOP-STANDARDISE-NAMING-FIRST (D309)** — standardise a naming convention across the ecosystem FIRST, then build the mechanism; recognise capability by whether the block DECLARES the attr, never a name-guess.
- **STOP-REGISTER-MECHANISMS-UNRELIABLE** — a pre-diagnosed register lists SYMPTOMS but its CAUSES are often wrong. Prove each cause on the live DOM OR a real-node converter trace FIRST.
- **STOP-CDN-STALE-CACHE** — a block CSS change at an UNCHANGED `?ver` serves stale; always `hosting_clearWebsiteCacheV1` + OPcache + `wp litespeed-purge all` before any live CSS measure.
- **STOP-16** — a subagent/"it works"/build-green is a HYPOTHESIS. Re-run yourself: `cd plugins/sgs-blocks/scripts && python -m pytest converter/tests -q --import-mode=importlib`; `npm run build` (PowerShell — nvm shim broken in Git Bash).
- **STOP-21** — emit-green ≠ LANDED. LANDED = deploy/reclone + OPcache + CDN + LiteSpeed clear + live computed-style.
- **STOP-static-vs-live** — for "does this class/style land?" use the LIVE DOM, NEVER static PHP/CSS parsing.
- **STOP-34** — verify a converter fix on the REAL draft node, not a synthetic fixture.
- **STOP-D228** — a framework default overriding the draft's faithfully-ABSENT/present value is a CHEAT to REMOVE/GATE. Universal (R-31-9).
- **STOP-WP-CORE-SERIALISATION (D306)** — a schema-valid emitted `style.*` value can be DROPPED by WP-core if the property definition lacks `css_vars`. Emit a form WP serialises.
- **STOP-COLOUR-SLUG-VALIDATION (D308)** — never emit a bare `var()` capture as a colour slug without validating it exists in the theme palette.
- **STOP-VERIFY-CLAIM** — do NOT assert "X isn't recognised / lacks Z" from a failed grep. Verify against emitted markup / render code / live DOM first.
- **STOP-60** — a converter change adding attrs changes conformance goldens (reseed deliberately + cited). A render-side-only change does NOT change the emit.
- **STOP-44** — a schema-valid emitted attr can be a render no-op; verify the LIVE painted value.
- **STOP-48/49** — do NOT trust `computed-parity.js` numbers or leftover-buckets; IGNORE header/footer + the accepted testimonial static-grid→slider. (Task 2 exists to make the tool trustworthy — until then this stands.)
- **STOP-67** — pre-commit visual-diff report per CHANGED block at repo-ROOT `reports/visual-diff/<block>-<date>.md` (frontmatter `verdict: PASS` + `first_paint_capture_passed: true`).
- **safecss strips functional colours (D302)** — any INLINE colour VALUE must be hex/named/var; the scoped `<style>` channel is NOT filtered.
- **Path-scoped commits** — `git commit -F <msgfile> -- <paths>` (message FILE). `git add <file>` for NEW files; never `git add -A`. No version bumps / deprecations pre-production (except a cache-bust bump). No co-author line. Verify branch + D-ceiling before commit.
- **DB seed not in git** — a new block.json attr / `property_suffixes` row needs `/sgs-update --stage 1` (or a dated `migrations/*.py`) to reach the DB.
- **One writer per file** — parallel coding subagents only across DISJOINT files; a SOLO coding subagent (foreground, named files, main-verified) is optimal for a coupled surface.
- **Re-clone command:** `python plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py --mockup "sites/mamas-munches/mockups/homepage/index.html" --auto-section --client mamas-munches --page homepage --media-map sites/mamas-munches/research/sandybrown-media-map.json --deploy-target page:8`. Deploy plugin (PHP-only): `python plugins/sgs-blocks/scripts/build-deploy.py --skip-build --allow-dirty`.

## Skills to Invoke
| Skill | When |
|---|---|
| `/brainstorming` | design the rebuilt parity-tool architecture (what "match" means per dimension) before coding |
| `/gap-analysis` | grade the parity tool against its acceptance criteria before delivery |
| `/lifecycle` | any skill/agent/pipeline change |
| `/research` | gold-standard DOM-diff / visual-regression approaches (how Percy/BackstopJS/axe structure element matching) |
| `/strategic-plan` | order the parity-tool rebuild |
| `/systematic-debugging` | prove each parity mis-count cause on the real draft-vs-live pair before fixing |
| `/qc-council` | validate the parity-tool fix-shapes before dispatch (it's a measurement instrument — get the design right) |
| `/qc-inline` | per-change QC |
| `/sgs-clone` `/sgs-db` `/wp-blocks` | ground truth (block schema, css_property, presets) |
| `/visual-qa` | per-section cropped visual compare to cross-check the tool's verdict |
| `/handoff` `/capture-lesson` | session close |

## MCP Servers & Tools
| Tool | For |
|---|---|
| Playwright / chrome-devtools MCP | THE draft-vs-live DOM diff (tags/classes/elements/content/computed-CSS) + the tool's live capture |
| Hostinger MCP `hosting_clearWebsiteCacheV1` | CDN clear before any live measure (user u945238940); plus `wp litespeed-purge all` (LiteSpeed active) |
| REST app-pwd `.claude/secrets/sandybrown.env` | user `Claude`; pass creds inline (env has unquoted specials — don't `source`) |

## Agents to Delegate To
| Agent | When |
|---|---|
| general-purpose (Sonnet) | parallel read-only draft-vs-live diff investigators (per-section) + the parity-tool implementer (solo, one writer) |
| feature-dev:code-reviewer | pre-commit review on the rebuilt parity tool (it's a trust-bearing instrument) |

## Research Approach
1. `/research` how mature visual-regression / DOM-diff tools structure element matching (Percy, BackstopJS, axe-core, Playwright's toMatchAriaSnapshot) — especially how they PAIR draft↔clone elements (by content? position? role?) and how they avoid false positives on inherited/computed values.
2. Enumerate the CURRENT `computed-parity.js` over-count/under-count causes (STOP-48/49 says font-family stacks + clone-only props inflate it) against the real page-8 draft-vs-live pair — pinpoint every mis-count before redesigning.

---

## Task 2 (small) — the remaining C-type same-type sweep
**What:** the D314 C-type audit found the null-role scalar-styling gap in 2 more blocks: `sgs/mobile-nav` (`focusColour`/`linkActiveColour`/`sublinkColour`/`sublinkFontSize`/`sublinkFontWeight`) + `sgs/trust-bar` (`shapeDividerTopColour`/`shapeDividerBottomColour`). Unlike product-card desc*/priceNote* (clean text-element lifts, DONE D314), these are DIFFERENT mechanisms — **state selectors** (focus/active) and an **SVG shape-divider pseudo-element**. Verify each before seeding.
**Why:** completeness of the C-type universality (R-31-9), but LOW priority — these aren't page-8 gaps.
**Orchestration:** per attr, confirm (a) the render selector it paints at, (b) whether it's a `:hover`/`:focus`/`:active` STATE (route via the D309 state suffix, not a base derived_selector) or an SVG fill (may not be a clean text-element lift at all). Seed via `ATTR_CLASSIFICATION_OVERRIDES` only where a clean element+role exists; document any that don't fit. Do NOT blind-seed (`enabling-a-capability-wakes-latent-misseeds`). `/sgs-update --stage 1` → reclone a page exercising those blocks → verify live.
**Acceptance:** each of the 7 attrs is either seeded-and-verified-live OR documented with why it isn't a clean lift.

## Task 1 — BUILD the parity-tool rebuild to Spec 20 v1.1.0 (design LOCKED)
**What:** make `plugins/sgs-blocks/scripts/parity/computed-parity.js` (Stage 11.6) trustworthy per the LOCKED Spec 20 v1.1.0 — track VISIBLE fidelity, add tag/structure/class-info dims, force-load lazy content. **The spec amend (STEP 0) is DONE (D314)** — Spec 20 is v1.1.0.
**Why:** the current tool reports 76% while visible fidelity is ~94–95% (STOP-PARITY-OVERCOUNTS-SUBVISIBLE); Bean needs a dependable instrument for future drafts.
**Estimated time:** ~40–50 min.
**Orchestration:**
- Read Spec 20 v1.1.0 IN FULL. Core fixes (all evidence-quantified in the D314 ledger): (1) **font-family primary-only** (kills 37% false bucket); (2) **blocklist `interactivity`+`appearance`**; (3) **threshold sub-visible representational twins** (line-height reps, margin-absorbed-by-gap, `display:flex↔block`, `align-items:normal↔stretch`, flex-grow) — FR-20-3a; (4) **add tag + element-structure scored dims** (FR-20-9) + **class-info-only capture** (FR-20-10); (5) **force-load lazy/below-fold before measuring** (FR-20-11).
- `/brainstorming` the matching model, then `/qc-council` on the fix-shapes (trust-bearing instrument, blub.db 255), then a SOLO implementer (one writer). `feature-dev:code-reviewer` pre-commit.
- Depends on: the D314 ledger (the ground truth). /qc gate: `/qc-council` design + `/qc-inline` build.
**Acceptance:** the rebuilt tool, run on page 8, reports a CSS % within a few points of the D314 ledger's ~94–95% VISIBLE verdict (font-family primary-only, false buckets blocklisted, sub-visible twins thresholded), plus per-dimension tag/structure reports matching the ledger's recorded divergences; runs on a DIFFERENT draft with no page-8 hardcoding (FR-20-2); Spec 20 `last_verified` + test-strategy updated. **Do NOT declare done on the self-reported number — it must agree with the independent D314 ledger.**

## Dependency graph
```
Task 1 (PRIMARY): BUILD parity tool to Spec 20 v1.1.0 (spec already LOCKED, D314; page-8 fidelity DONE)
  /brainstorming matching model → /qc-council fix-shapes → solo build → /qc-inline
  ↓ VALIDATE tool output == D314 ledger (~94–95% visible) AND == Spec 20 v1.1.0 FRs
Commit (tool + any Spec 20 last_verified bump together)

Task 2 (small, independent): remaining C-type sweep (mobile-nav/trust-bar) — verify each before seeding
```

## Methodology guardrails (do not skip)
- Read the governing spec IN FULL (Spec 31 + Spec 20). Prove every parity mis-count on the real draft-vs-live pair before redesigning. NEVER cite the CURRENT computed-parity % as a measure (STOP-48/49) — the whole point is to make a future number trustworthy.
- **Fix at the draft, not the clone** (STOP-FIX-DRAFT-NOT-CLONE) — any fidelity gap Task 1 finds that stems from the draft is corrected in the mockup + re-cloned; the clone never diverges from the draft.
- **Deploy/re-clone before measure** — build + deploy + OPcache + CDN clear + `wp litespeed-purge all` before any live measurement (STOP-21/CDN).
- The parity tool is a TRUST-BEARING instrument — validate its verdict against an independent manual ledger, never against its own self-report. `/qc-council` its design before building (blub.db 255).
- Branch appropriately (core SGS = `main`); path-scoped commits (message FILE); no co-author line. `/qc-inline` per change; end with `/handoff`.
