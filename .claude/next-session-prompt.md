---
doc_type: next-session-prompt
project: small-giants-wp
thread: cloning-pipeline
generated: 2026-06-13
primary_goal: "Close the remaining OPEN clone-fix ledger rows. The universal child-CSS styling-lift SHIPPED this session (D223, commit c1543df5 — testimonial slice, capability-gated, verified faithful + reproducible) + 6 dead core/* handlers removed + the FR-22-3 slug-literal guard is live. The styling-lift fixed ZERO open ledger rows (they are distinct mechanisms — confirmed). NEXT = (1) live-verify the styling-lift renders on canary page 8, then (2) evidence-first root-cause + design solutions for the ~8 genuinely-OPEN converter rows: H-C1 (per-area max-width), IN-B (content-band width), FP-P (full-width CTA), IN-E/GF-B.2 (text-align), SP-C (vertical-align), SP-D.1 (SVG star-size = the ratingSize gap), SP-E (F8). LEDGER: .claude/plans/2026-06-09-clone-fix-sign-off-ledger.md. Each row = its own root-cause (read draft + live DOM + render.php), NOT a guess. Rule 7: any shared-mechanism fix gets a design-gate + /adversarial-council BEFORE build."
---

# Next session — close the OPEN clone-fix ledger rows (evidence-first, one family at a time)

> Invoke `/autopilot` first. Then read, end-to-end, BEFORE acting: the LIVE ledger **`.claude/plans/2026-06-09-clone-fix-sign-off-ledger.md`** (the OPEN rows + their family classification + per-row notes) + `.claude/specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md` §FR-22-5.3/FR-22-21 (the cross-node CSS-routing layers — H-C1/IN-B live here) + `.claude/decisions.md` D223 (this session's styling-lift + the 2 deferred gaps) + `.claude/plans/2026-06-13-universal-child-css-lift-DESIGN.md` (the styling-lift mechanism + its known gaps).

## ⛔ THE 7 NON-NEGOTIABLE RULES (Bean-set; gate every converter/block action — carried forward verbatim)

1. **CONVERT, don't mirror** — output = native SGS blocks driven by attributes; NOT a div-by-div copy of draft classes/DOM.
2. **NO CHEATS** — no `sourceMode='bound'` converter emit, no echo-`$content` passthrough, no shallow-test workaround. Only the live WC configurator `sourceMode='wc-product'/'sgs-cpt'` is legitimate.
3. **UNIVERSAL, no carve-outs** — a fix applies to every qualifying block/case; no per-block/per-tier exception. Over-broad universality is ALSO a break (the styling-lift is capability-gated for exactly this reason).
4. **NO SKIPPING** — every draft class's content + CSS transfers, OR is reported skipped-with-reason, per class. (This is WHY the styling-lift exists — child CSS must transfer. The 2 deferred gaps below are tracked, not skipped silently.)
5. **VERIFY ON THE REAL HOMEPAGE** — Playwright/chrome-devtools live DOM + computed-style on page 8 vs the draft's real values. Emit-green ≠ rendered.
6. **RESPONSIVE VALUES IN BLOCK ATTRIBUTES, never inline CSS.**
7. **DESIGN-GATE sensitive/high-blast-radius changes** (shared wrapper, walker, converter, most-used block) via `/adversarial-council` or `/qc-council` + Bean approval BEFORE building. The cross-node routers (`_route_interior_css_to_parent_slot`, `_route_area_css_to_block_attrs`) that H-C1/IN-B touch ARE high-blast — design-gate any change to them.

## State recap (plain English, 2026-06-13 close — D223)

**This session shipped a lot to `main` (cloning thread):**
- **FR-22-3 slug-literal guard** (commit `524c7aa5`): `plugins/sgs-blocks/scripts/check-atomic-slug-literals.py`, wired to prebuild — FAILS the build if a NEW `if slug==` branch is added to `_atomic_attrs_for` outside the documented allow-list. The allow-list can only shrink.
- **D223 build** (commit `c1543df5`): (1) **6 dead `core/*` handlers removed** from `_atomic_attrs_for` — `atomic_tag_map()` resolves every HTML tag to an `sgs/*` block via `blocks.replaces`, so they were unreachable (conformance 43/43 confirms). Guard allow-list 17→11. (2) **Universal child-CSS styling-lift** — new sibling `_lift_styling_attrs_by_selector` in `convert.py` lifts child-element typography/colour CSS onto a block's styling attrs by `derived_selector`, gated by a NEW per-block `scalar-styling-lift` capability (declared on `sgs/testimonial` ONLY). Class = `role in {color,typography}` with a non-NULL `css_property` suffix; auto-excludes select-from-enum (quoteStyle) + ratingSize (SVG dimension); excludes hover/active/focus selectors; double-write tripwire vs `route_node_css`. DB classification corrected via `ATTR_CLASSIFICATION_OVERRIDES` (durable, reseed-reproducible). VERIFIED: lift values exact-match the fixture draft CSS; both conformance suites green (43+26) after a FULL `/sgs-update` reseed; capability + classifications survive reseed. Council-gated (two `/adversarial-council` rounds — the first NO-GO'd a flawed mechanism that would have DROPPED child CSS).

**The honest ROI fact (council-confirmed):** the styling-lift fixed ZERO currently-OPEN ledger rows — the testimonial cases it covers were already hand-read-covered. Its value is future-block fidelity + insurance. **The genuinely-OPEN converter rows are DIFFERENT mechanisms** and are the next session's real work.

**Two deferred styling-lift gaps (DB-data refinements, not blockers — pick up if touching testimonial):**
1. `quoteStyle` (font-style:italic) does NOT transfer — the `Style` suffix has `css_property=NULL` and is shared by ~28 `behaviour` attrs (can't globally remap). Fix: rename attr to `quoteFontStyle` (block change + deprecated.js) OR a per-attr css_property mapping.
2. `nameFontWeight` derived_selector is the RENDER class `.sgs-testimonial__name`, but drafts may use `.sgs-testimonial__author`. Fix: multi-selector `.sgs-testimonial__name, .sgs-testimonial__author`.

## The OPEN ledger rows — ROOT CAUSES ALREADY RE-VERIFIED (2026-06-13)

**READ FIRST: `.claude/reports/2026-06-13-open-row-rootcause-verification.md`** — 7 parallel agents re-verified every OPEN row against ground truth (draft CSS + live rebaseline + converter emit + render.php). **The ledger's original diagnoses were WRONG/PARTIAL on IN-B, FP-P, IN-E, BR-B.** Use the report's CORRECTED causes below; do NOT rebuild to the stale ledger notes. (Spec 27 AND Spec 30 are BUILT — NOTHING is gated.)

| Row | VERDICT vs ledger | Corrected root cause | Fix direction | Live-probe |
|-----|-------------------|----------------------|---------------|-----------|
| H-C1 | CORRECT | `_route_area_css_to_block_attrs` excludes `max-width` (convert.py:2307); draft `.sgs-hero__sub{max-width:420px}` literal; `subHeadlineMaxWidth` attr+render ready | leaf-elem max-width→per-area-attr map (mirror `subHeadlineMarginBottom`) | no |
| IN-B | **WRONG** | converter emits `contentWidth:"var(--content-width)"` raw — doesn't resolve the co-declared `--content-width:960px` literal; + separate `__intro{max-width:540px}` inner-elem not extracted | resolve co-declared `var()`→literal; impl inner-elem maxWidth | no |
| FP-P | **PARTIAL** | full-width comes from COLUMN-FLEX-PARENT STRETCH, not width:100%; converter never emits `widthType`→default "fit"→182px (F8 extraction gap, not F3) | detect button-in-column-flex → emit `widthType:"full"` / slot-default for CTA in card body | no |
| IN-E | **WRONG** (IS a defect) | info-box has no text-align → inherits `center` from `__inner{text-align:center}`; converter emits `left` because walk stops at resolved-block boundary (container-wrapper-lift gap, FR-22-21) | transfer `__inner` text-align→section container block attr | **YES** |
| GF-B.2 | CORRECT + **PINNED** | `_collect_css_decls_for_element` matches scoped `.sgs-social-proof .sgs-section-heading__sub` as single-class → center BLEEDS cross-section. ⚠ BROAD bug | make CSS matcher respect ancestor-scoped compound selectors | no |
| SP-C | **NOT-A-DEFECT** | no align property in draft; zero `%lign%` attrs | **DROP the row** | no |
| SP-D.1 | STILL-DEFECT | draft `__stars{font-size:15px}`; SVG sized by `ratingSize` default 16; not harvested | harvest star font-size→`ratingSize:15` (extraction map) | YES |
| SP-E | STILL-DEFECT | D223 closed quote font/colour/lineHeight; remaining = `quoteStyle:italic` + `nameFontWeight:600` not emitted | extend testimonial harvest | YES |
| BR-B | **WRONG** (IS converter) | converter emits `imageUrl` but NOT `imageId` (media-map HAS `id:24`)→no intrinsic dims→0×0; + `__image{max-height:380px}` not lifted | emit `imageId` from media-map (convert.py:2951); verify maxHeight lift | YES |
| FP-E / FP-H | SHIPPED (D204) | working post-Spec-27 | — | — |
| FP-D | the real Spec-27 open item | card-grid block resolution — design-decision close now Spec 27 built | confirm featured→`sgs/card-grid wc-product` emit+live render, flip DESIGN→VERIFIED | YES |

**3 shared-mechanism fixes are Rule-7 (design-gate BEFORE build):** GF-B.2 (CSS selector-scope matcher — affects ALL clones), IN-E (container-wrapper text-align transfer), IN-B Bug1 (co-declared var resolution). H-C1/FP-P/SP-D.1/SP-E/BR-B are localised per-block extraction maps.

## Tasks

### Task 1 — Live-verify the D223 styling-lift renders on canary page 8 (close the loop)
**What:** re-clone the Mama's mockup + deploy + computed-style probe to confirm the testimonial quote font-size/colour/line-height now RENDER (not just emit).
**Why:** the council (live-verify) demanded rendered-output proof (R-22-11) — this session proved emit + conformance, not live render. Emit-green ≠ rendered.
**Estimated:** 15 min.
**Orchestration:** INLINE Opus drives deploy; computed-style probe via chrome-devtools (Playwright fallback on "Browser already in use"). Build via PowerShell (`npm run build` — broken node wrapper in Bash). Deploy + OPcache reset per dev-setup.md. Probe `.sgs-testimonial__quote` fontSize/color at 1440/768/375 vs the draft (17px/#3a2e26).
**Depends on:** none. **/qc gate after:** the live probe IS the gate.
**Acceptance:** computed style on page-8 testimonial quote = draft values; no regression on the rest of the testimonial.

### Task 2 — DESIGN + BUILD fixes from the VERIFIED root causes, ONE FAMILY AT A TIME
**What:** root-cause is DONE (report `.claude/reports/2026-06-13-open-row-rootcause-verification.md`). For each row, design the fix-shape from its CORRECTED cause, then build. SP-C = DROP (not a defect). FP-E/FP-H = SHIPPED. FP-D = a design-decision close (confirm emit+live, flip ledger).
**Why:** these are the customer-visible fidelity bugs — and the root causes are now grounded (the ledger's stale diagnoses on IN-B/FP-P/IN-E/BR-B were corrected).
**Estimated:** ~20-40 min per family.
**Orchestration:** the **3 shared-mechanism fixes** (GF-B.2 CSS selector-scope matcher; IN-E container-wrapper text-align transfer; IN-B Bug1 co-declared-var resolution) get `/adversarial-council` or `/qc-council` on the APPROACH BEFORE any code (Rule 7 — they touch all clones). The **localised per-block extraction maps** (H-C1, FP-P, SP-D.1, SP-E, BR-B) DELEGATE to a sonnet subagent (via `/delegate`); main agent `/qc-council` + live-verify + commit. Suggested order: GF-B.2 first (broadest impact — may close other leaks), then BR-B + H-C1 (localised, high-confidence), then the testimonial cluster (SP-D.1/SP-E), then IN-B + IN-E (content-band + container-wrapper, council-gated), then FP-P, then FP-D.
**Depends on:** Task 1 (live baseline) for the rows flagged live-probe=YES (IN-E, SP-D.1, SP-E, BR-B, FP-D). **/qc gate after:** `/qc-council` before each converter/block commit (blub.db 255) + both conformance suites + live page-8.
**Acceptance:** per row — fix built from the verified cause, council-GO'd if shared-mechanism, live-verified on page 8 (computed-style = draft value), ledger row flipped to VERIFIED with the commit hash.

## Dependency graph
```
Task 1 (inline Opus: deploy + live-probe the D223 styling-lift)   <- close the render loop
  |
Task 2 (per family: inline root-cause -> /adversarial-council if shared-mechanism -> sonnet build -> /qc-council -> live-verify -> commit)
  |  (families independent; testimonial cluster shares files — sequential within it)
each commit: path-scoped; merge to main via temp-worktree if main is co-actively held
```

## Methodology guardrails (do not skip — carried forward + extended)
- **Emit-green ≠ rendered** — verify the full render chain on the LIVE DOM (attr TYPE → WP supports → render.php → safecss). Grep render.php + the wrapper for the attr BEFORE lifting onto it ([[converter-attr-must-match-the-attr-render-reads]]).
- **TWO conformance suites** — `converter_v2/tests/` (26) AND the Gate A golden harness `plugins/sgs-blocks/scripts/tests/test_converter_conformance.py` (43, the pre-commit one). Run BOTH; a subagent "conformance passed" can miss Gate A (D222/D223 lesson).
- **DB changes must be reproducible** — dated `migrations/*.py` for property_suffixes/schema; `ATTR_CLASSIFICATION_OVERRIDES`/`HAS_INNER_BLOCKS_OVERRIDES` for per-attr/composition; reproduced by a FULL `/sgs-update` reseed — NEVER a manual DB edit or module-load write-side-effect ([[db-changes-reproducible-via-migration-not-manual-or-moduleload]]). Verify the change SURVIVES a full reseed (D223 did this).
- **Golden regen is high-risk** — a subagent can make conformance pass by rewriting the golden to match its own (wrong) output. ALWAYS diff a regenerated golden: confirm the new values exact-match the FIXTURE DRAFT CSS + nothing was dropped (Rule 4). D223 verified the testimonial golden this way.
- **Deploy before measure** — re-clone via `sgs-clone-orchestrator.py … --converter-v2 --mode draft`; upload via `upload_and_patch.py <run-dir> --target-id 8 --target page --client mamas-munches`. `npm run build` via PowerShell.
- **/qc-council BEFORE every converter/SGS-block commit** (blub.db 255). **/adversarial-council before any shared-mechanism change** (Rule 7). Fact-check EVERY rater/subagent claim against live ground truth — findings are HYPOTHESES.
- **Commit by explicit path** (`git commit -- <paths>`). **Visual-diff gate:** a block.json metadata-only change (e.g. a `supports.sgs` capability flag, render/style/save untouched) uses `--no-verify` per the documented non-visual exemption (D222/D223). A REAL visual change needs a passing `reports/visual-diff/<block>-<date>.md`.
- **Merge to main via temp-worktree cherry-pick** if main is co-actively held; verify is-ancestor + staged-count after each push.
- **Subagents implement; Opus orchestrates** (plan/delegate/QC/live-test/commit). Subagents have NO commit/deploy authority; NEVER `git checkout/restore/stash/reset/clean` the shared tree.
- **Bean's "are you sure?" on a deletion = a mandate to research, not reassure.** Default KEEP+document over DELETE when reducibility is uncertain.
- **Pixel-diff is misleading — verify the LIVE DOM (R-22-11), not the number** (empty section = false WIN). Per-row live probes are the acceptance, never the aggregate differ (BEM-blind-spot, [[parity-bem-class-blind-spot-for-converted-output]]).
- **Context is load-bearing for in-flight builds** — when a sensitive multi-stage build's corrected understanding lives in the session, prefer continuing in-context over a fresh restart (Bean directive 2026-06-13). But a FRESH problem domain (these OPEN rows are layout/max-width/text-align, not the styling-lift) loses little to a clean session.

## Pre-flight self-attestation ritual (answer before the first action)
1. Which thread am I? (cloning-pipeline — owner of convert.py + the homepage pipeline.)
2. What branch is the tree on? (`git branch --show-current`.) Has `origin/main` moved? Is anything co-actively staged? (`git status` — if so, commit ONLY by explicit path.)
3. Have I read the LIVE ledger + the relevant Spec 22 FR + decisions D223 end-to-end before proposing a fix-shape for the row I'm about to touch?
4. What is the MEASURABLE acceptance for this row (live computed-style on page 8 = draft value), not "code shipped"?
5. Is this change Rule-7 high-blast (cross-node router / container-mirror / convert.py)? Then `/adversarial-council` (approach) + `/qc-council` (per commit) BEFORE/AROUND the build.

## Skills to Invoke
| Skill | When |
|-------|------|
| `/brainstorming` | the per-row fix-shape design (Task 2) — reduce-vs-keep / which-layer judgement |
| `/gap-analysis` | grade any unit vs its FR acceptance before delivery |
| `/lifecycle` | before any skill/agent/pipeline change |
| `/research` (+ `/library-docs`) | any WP/converter pattern you're unsure of |
| `/strategic-plan` + `/phase-planner` | if Task 2 needs the per-family phased plan formalised |
| `/systematic-debugging` | root-cause each OPEN row (iron-law: root cause before fix) |
| `/adversarial-council` | MANDATORY on any shared-mechanism (cross-node router) approach BEFORE building (Rule 7) |
| `/qc-council` | MANDATORY before every converter/SGS-block commit (blub.db 255) |
| `/sgs-clone` · `/sgs-update` · `/wp-blocks` · `/sgs-db` | re-clone / DB sync / schema + attr TYPES ground truth |
| `/subagent-driven-development` · `/dispatching-parallel-agents` · `/subagent-prompt` | per-family dispatch (parallel across families; sequential within the testimonial cluster) |
| `/verify-loop` · `/capture-lesson` · `/handoff` | 2-attestation / new rules / session close |

## MCP Servers & Tools
| Tool | For |
|------|-----|
| chrome-devtools (Playwright fallback on "Browser already in use") | live page-8 DOM + computed-style probes (creds `.claude/secrets/sandybrown.env` — grep/cut, never `source`) |
| `/wp-blocks` (`python ~/.claude/hooks/wp-blocks.py dump`) | block schema + attr TYPES before asserting capability |
| `/sgs-db` (`python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py`) | block roster / attrs / classification (DB-authoritative; never hardcode counts) |
| WooCommerce Store/REST + `/wc/v3` (app-password Basic auth) | only if a row touches a WC-bound block |

## Agents to Delegate To
| Agent | When |
|-------|------|
| general-purpose (sonnet) | per-family fix build — NO commit/deploy authority, returns uncommitted |
| general-purpose (haiku / gemini-flash) | 2nd-council-family rater on the /qc-council pass |
| `wp-sgs-developer` | if a row needs heavier WP/block work (FP-P width, IN-B content-band) |
| `design-reviewer` | if a row changes a visible surface (live page-8 3-breakpoint) |

## Guardrails
Cloning thread owns the converter + homepage pipeline. The OPEN rows are customer-visible fidelity — root-cause each one (read draft + live DOM + render.php) before designing; section-by-section instance-tuning is the anti-pattern. Cross-node-router changes are Rule-7 high-blast → design-gate. Build per family, `/qc-council` + Gate A + live page-8 per commit. The FR-22-3 guard now blocks new `if slug==` literals — if a fix genuinely needs one, add it to the allow-list with a justification + record in decisions.md.
