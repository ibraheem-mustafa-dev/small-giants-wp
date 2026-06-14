---
doc_type: next-session-prompt
project: small-giants-wp
thread: cloning-pipeline
generated: 2026-06-14
primary_goal: "Close the FULL clone-vs-draft fidelity gap on the Mama's homepage by FIXING the live-grounded defect register (.claude/reports/2026-06-14-clone-vs-draft-defect-register.md, ~44 defects) by ROOT-CAUSE FAMILY, biggest lever first. Tasks 1 (doc-align) + 2 (defect enumeration) are DONE+COMMITTED. START Task 3 by: (step 0) deploy the contentSize 1200/1400 theme fix + re-clone page 8, (step 1) make the 5 block-match decisions with Bean, (step 2) design-gate + fix each systemic converter family (B unitless / C mobile-type / D max-width / E image / F grid) universally, live-verify per row on page 8."
---

# Next session — Task 3: fix the live-grounded defect register by root-cause FAMILY

> Invoke `/autopilot` first. READ the defect register + decisions D227/D226 + the live ground truth BEFORE acting. Tasks 1+2 are closed (commits `7b112d3a` doc-align, `33feb5ab` register). Do NOT re-do them.

## ⛔ THE 7 NON-NEGOTIABLE RULES (Bean-set; gate every converter/block/seeding action — carry forward verbatim)
1. **CONVERT, don't mirror** — output = native SGS blocks driven by attributes; NOT a div-by-div copy of draft classes/DOM.
2. **NO CHEATS** — no `sourceMode='bound'` converter emit, no echo-`$content` passthrough, no shallow-test workaround. Only the live WC configurator `wc-product`/`sgs-cpt` is legitimate.
3. **UNIVERSAL, no carve-outs** — a fix applies to every qualifying block/case; no per-block/per-tier exception. Over-broad universality is ALSO a break.
4. **NO SKIPPING** — every draft class's content + CSS transfers, OR is reported skipped-with-reason, per class.
5. **VERIFY ON THE REAL HOMEPAGE** — Playwright/chrome-devtools live DOM + computed-style on canary page 8 vs the draft. Emit-green ≠ rendered. (Proven D226: H-C1 conformance-green did nothing live. Proven D227: 2 static-diff "defects" — label-pill + author-font — were FALSE POSITIVES that the live computed-style probe killed before any build.)
6. **RESPONSIVE VALUES IN BLOCK ATTRIBUTES, never inline CSS.**
7. **DESIGN-GATE sensitive/high-blast-radius changes** (shared wrapper, walker, converter, the /sgs-update seeding pipeline, most-used block) via `/adversarial-council` or `/qc-council` + Bean approval BEFORE building.

## State recap (plain English, 2026-06-14 close — D227)
**Tasks 1 + 2 of the prior handoff are COMPLETE.** (1) Doc-align: the "content feels tight" root cause was a forgotten theme regression — `contentSize` had drifted to 780px; restored to the documented **1200px/1400px** (Bean chose widen-global). The button "breakage" was a FALSE ALARM (WP generates button-preset vars natively from theme.json — confirmed populated; admin file deliberately deleted D24). 8 docs count-corrected + 6 specs attr/artefact-corrected, all code-grep-verified — which caught the audit register OVER-STATING the Spec-21 artefact claims (the artefacts ARE emitted, by `sgs-clone-orchestrator.py` not `converter_v2/`). (2) Defect enumeration: a direct 4-agent clone-vs-draft diff produced **the honest ~44-defect register** (`.claude/reports/2026-06-14-clone-vs-draft-defect-register.md`) — it replaces the under-counting 55-ledger. Most defects collapse into **5 systemic converter families** (fix once, fix many): **B** malformed `Xunitless` line-heights · **C** mobile heading font-size tier dropped · **D** section/element max-width dropped (the class-section Method-2 gap; includes old H-C1) · **E** image radius/height/order dropped · **F** wrong/inverted grid breakpoints. PLUS 5 block-match DECISIONS (DEC-1..5, need Bean's eye) + 7 header/footer template-part gaps (theme/data layer, not converter). **Live-probe @1440+@502 CONFIRMED** C/D/E/IN-E/ingredients-2-col/disclaimer and CORRECTED 2 false positives (label-pill + author-font render correctly). **D-CEILING: D227.**

## 📚 MANDATORY READING (before any fix-shape)
1. `.claude/reports/2026-06-14-clone-vs-draft-defect-register.md` — THE to-do list (systemic families + per-section + DECISIONS + live-probe results). Start here.
2. `.claude/specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md` · `29-CONTAINER-EQUIVALENT-BLOCKS.md` (Method-2 callout now added — converter does NOT yet route to composites) · `WRAPPER-CSS-ROUTING-DESIGN-GATE.md` · `11-SGS-BUTTON-ARCHITECTURE.md` · `21-PIPELINE-STATE-ARTEFACTS.md` · `02-SGS-BLOCKS.md` (now attr-accurate).
3. `.claude/cloning-pipeline-flow.md` + `cloning-pipeline-stages.md` (now count-accurate).
4. Ground truth: `sites/mamas-munches/mockups/homepage/current-clone-page-source.html` (clone) + `index.html` (draft, CSS L10-715). Serve draft via `python -m http.server` to measure draft truth (file:// blocked).
5. `.claude/decisions.md` D227/D226 + `.claude/parking.md`.
6. **READ THE IMPLEMENTING SCRIPT** (`plugins/sgs-blocks/scripts/converter_v2/convert.py` + `sgs-clone-orchestrator.py`) at the exact line for each family BEFORE proposing its fix (blub 353). Key refs from D225/D227: line-height emit (Fam B), heading responsive emit (Fam C), `_lift_root_supports_to_style`/widthMode + per-area max-width `attr_for_area_property` convert.py:2399 (Fam D), media-CSS lift (Fam E), grid/breakpoint emit (Fam F).

## Tasks

### Task 3 — Fix the defect register by root-cause FAMILY, biggest lever first [THE BUILD]
**Step 0 (smallest first action, ~5 min):** deploy the committed `contentSize 1200/1400` theme fix to page 8 (theme deploy + bump `style.css` Version for the Hostinger 7-day CDN), re-clone page 8 (`/sgs-clone … --deploy-target page:8`), and re-probe the Fam-D max-width rows — some may partially resolve once the theme default is wide. Establishes the live baseline.
**Step 1 (Bean decisions, R-22-13 / Rule 9):** resolve the 5 block-match DECISIONS in the register before building their rows — DEC-1 disclaimer notice-banner→plain text? · DEC-2 gift cards info-box-with-motion→strip motion? · DEC-3 "Find out more →" button→link · DEC-4 testimonials carousel vs static grid · DEC-5 single-CTA multi-button unwrap.
**Step 2 (the build):** group by family, fix UNIVERSALLY (R-22-9). Order by lever size:
- **Fam D (max-width) — BIGGEST.** The 2 class-section composites (hero, cta-section, trust-bar) + per-element max-width not resolving = the Spec 29 Method-2 gap. Likely its own `/brainstorming` design session for the routing shape.
- **Fam F (grid/breakpoints)** — inversions + wrong tablet col counts + the ingredients auto-fill-conflict (renders 2-col not 4).
- **Fam C (mobile heading type)** — restore the <768 font-size tier in the heading responsive emit.
- **Fam E (image styling)** — lift border-radius/max-height/order onto media attrs.
- **Fam B (unitless)** — strip the `unitless` literal from the line-height emit (also fixes the brand dup-margin Fam K + hero doubled-display:grid HE11).
- Plus section-specific: T5 star stroked-not-filled (icon resolver), F7 product-card Fraunces, F12 trial gradient, F13 trial tag colour.
**Why:** root-cause families compound across sections; per-instance tuning is the anti-pattern.
**Estimated:** Fam B/C/E ~30-45 min each; Fam D (Method-2) bigger — own design session.
**Orchestration:** design inline (Opus) per family → `/brainstorming` for Fam-D Method-2 routing → `/adversarial-council` on each shared-mechanism/converter change (Rule 7) → delegate build to sonnet subagents (`/subagent-driven-development`; subagents implement, NO commit authority) → Opus `/qc-council` + BOTH conformance suites + **live page-8 verify per row** + commit path-scoped.
**Depends on:** Step 0 baseline. **/qc gate after:** `/qc-council` per converter commit + live-DOM per row.
**Acceptance:** each family's rows flip to VERIFIED via live computed-style on page 8 (R-22-11), both suites green, no regression on already-VERIFIED rows (D226 IN-B/GF-B.2).

### Task 3b — Header/footer content gap (HF-1..7) [theme/data layer — separate from converter]
**What:** the bespoke draft nav (curated 5 links + "Send to Ward ★") + footer (3-col, Shop/Info links, business meta, copyright disclaimer) are absent — replaced by generic theme template parts with empty SGS Site Info placeholders. Fix = assign a real nav menu + populate SGS Site Info + footer template-part content (NOT a converter change; chrome is R-22-1 skipped by design). Also HF-7: stop the converter lifting dead `.sgs-header__*` chrome CSS into the page `<style>`.
**Decision needed:** should clone runs auto-populate nav/footer/Site-Info from the draft, or is that a manual per-client setup step? (Bean.)

### Task 4 — block.json selector auto-seed (carried from D225/D226, still OPEN) [design-gate]
**What:** P-BLOCKJSON-SELECTOR-AUTOSEED — make per-attr lift selectors block-owned + auto-seeded, consolidating the 4 existing selector channels (do NOT add a 5th); converter reads `block_attributes.derived_selector`. **Orchestration:** `/brainstorming` + `/adversarial-council` on the seeding-pipeline approach (Rule 7) BEFORE build; full `/sgs-update` reseed verify; both suites. **Depends on:** none (independent; can interleave). **Acceptance:** one selector channel; full reseed reproduces all derived_selectors with zero hardcoded Python selector dict.

### Task 5 — Product-page redesign (oversized Trustpilot + tight content) [DEFERRED — after fidelity]
**What:** product page doesn't match the draft; Trustpilot block "stupidly large"; content "really tight" (the contentSize fix may help — re-check after Task 3 step 0). **Orchestration:** `/brainstorming` + `/innovative-design`; Bean sign-off (R-22-13). **Depends on:** Task 3. **Acceptance:** product page matches draft layout; Bean visual sign-off.

## Dependency graph
```
Task 3 step 0 (deploy width fix + re-clone page 8 baseline)   [SMALLEST FIRST ACTION]
  → Task 3 step 1 (5 block-match DECISIONS with Bean)
  → Task 3 step 2 (fix by family: D biggest → F → C → E → B; /brainstorming Fam-D Method-2 → /adversarial-council → SDD build → /qc-council + live-verify per row)
Task 3b (header/footer content — theme/data layer; parallel-able)
Task 4 (selector auto-seed — design-gate; independent, interleave)
  → Task 5 (product-page redesign — DEFERRED until Task 3 fidelity closes)
each commit: path-scoped (`git commit -m "msg" -- <paths>`, -m BEFORE --); merge to co-actively-held main via temp-worktree cherry-pick if origin moved
```

## Methodology guardrails (do not skip — carried forward + extended D227)
- **Emit-green ≠ live-verified — verify the rendered page (R-22-11).** D226: H-C1 passed both suites + committed, rendered NOTHING. D227: the static-diff agents flagged a "label coral pill" + a wrong author font — BOTH were FALSE POSITIVES the live computed-style probe killed (the inline `--sgs-label-bg` var resolves transparent). NO register row closes — and NO defect gets a build wave — without a live computed-style read on page 8. clone-parity's BEM matcher + parity2 aggregate are triage-only (blind to native-block output).
- **Measurement-vs-rendered (Bean global rule):** an inline CSS-var DECLARATION in the clone HTML is NOT proof of the rendered value — the var may resolve to transparent/default. Probe `getComputedStyle` before claiming a visible defect. Extend the measurement set (background family + the resolved var) before telling Bean something is wrong.
- **Read the implementing SCRIPT before proposing/critiquing ANY converter/seeding mechanism** — never trust spec `built_status:` labels, attr/column names, or "probably true" (blub 353). D227 proved the AUDIT REGISTER itself carried over-stated claims — distrust audit labels too; grep the real emitter.
- **Verify-first on any "gap"** — labels undersell scope. Confirm a gap is a contained wire before dispatching a build.
- **Draft is the truth source; pair by content+position, not draft BEM class** — the converter emits native blocks that don't carry draft classes.
- **Deploy before measure** — converter changes (convert.py) need no build; block.json/render.php/style.css/theme changes need `npm run build` (PowerShell) + deploy + bump version (Hostinger CDN 7-day cache).
- **Root-cause FAMILY before instance fix** — group by the family map; fix universally (R-22-9). Per-section tuning is the anti-pattern.
- **TWO conformance suites** — Gate A `plugins/sgs-blocks/scripts/tests/test_converter_conformance.py` (pre-commit) AND `converter_v2/tests/`. Run BOTH.
- **DB changes reproducible from the canonical path** (block.json `supports.sgs` auto-seed OR dated `migrations/*.py`), verified by a FULL `/sgs-update` reseed — NEVER a manual DB edit or hardcoded Python selector dict.
- **/qc-council BEFORE every converter/SGS-block/seeding commit** (blub 255). **/adversarial-council before any shared-mechanism change** (Rule 7).
- **Commit path-scoped** (`git commit -m "msg" -- <paths>` — `-m` BEFORE `--`). Merge to co-actively-held main via temp-worktree cherry-pick; verify is-ancestor after each push.
- **Subagents implement; Opus orchestrates** (plan/delegate/QC/live-test/commit). Subagents have NO commit/deploy authority; NEVER `git checkout/restore/stash/reset/clean` the shared tree (a rater once wiped uncommitted work this way).
- **Bean's "are you sure?"/"why?" on a hardcode/deletion = a mandate to investigate the architecture, not reassure.**
- **The SGS evidence gate is ON** — emit `GROUND-TRUTH:` before any SGS framework edit, `SKILL-STATUS:` at turn end/blocked.

## Pre-flight self-attestation ritual (answer before the first action)
1. Which thread am I? (cloning-pipeline — owner of convert.py + the homepage pipeline + state.md/handoff/next-session-prompt.)
2. What branch is the tree on? (`git branch --show-current`.) Has `origin/main` moved? Anything co-actively staged? (`git status` — commit ONLY by explicit path.)
3. Have I READ the defect register + decisions D227/D226 + the implementing script (for the family I'm about to touch) before proposing any fix-shape? Have I distrusted stale doc/audit labels per D227?
4. What is the MEASURABLE acceptance (live computed-style on page 8 = draft) — not "code shipped" / "conformance green"? Have I confirmed the defect is REAL on the live page (not a static-diff false positive)?
5. Is this Rule-7 high-blast (converter / shared wrapper / seeding pipeline / most-used block)? Then `/adversarial-council` (approach) + `/qc-council` (per commit) BEFORE/AROUND the build.

## Skills to Invoke
| Skill | When |
|-------|------|
| `/brainstorming` | Task 3 Fam-D Method-2 routing shape + Task 4 schema + Task 5 redesign (design mode) |
| `/gap-analysis` | grade any unit/register vs its acceptance before delivery |
| `/lifecycle` | before any skill/agent/pipeline change |
| `/research` (+ `/library-docs`) | any WP/theme.json/block.json pattern you're unsure of (e.g. flex-column stretch for CTA, grid auto-fill vs explicit columns) |
| `/strategic-plan` + `/phase-planner` | if Task 3's Fam-D Method-2 fix needs a formal phased plan |
| `/dispatching-parallel-agents` | parallel family builds on disjoint convert.py regions |
| `/adversarial-council` | MANDATORY on every shared-mechanism/converter change + the seeding approach (Rule 7) |
| `/qc-council` | MANDATORY before every converter/SGS-block/seeding commit (blub 255) |
| `/subagent-driven-development` · `/subagent-prompt` | Task 3 per-family dispatch (subagents implement) |
| `/sgs-clone` · `/sgs-update` · `/wp-blocks` · `/sgs-db` | re-clone+deploy / DB reseed / schema + attr TYPES ground truth |
| `/systematic-debugging` · `/verify-loop` · `/capture-lesson` · `/handoff` | root-cause / 2-attestation / new rules / session close |

## MCP Servers & Tools
| Tool | For |
|------|-----|
| Playwright (chrome-devtools fallback on "Browser already in use" — co-active thread holds Playwright) | live page-8 DOM + computed-style probes; serve the draft via `python -m http.server` to measure draft truth — creds `.claude/secrets/sandybrown.env` (grep/cut, never `source`); canary = `?page_id=8` on `WP_URL_SANDYBROWN` |
| `/wp-blocks` (`python ~/.claude/hooks/wp-blocks.py dump`) | block schema + attr TYPES + WP-native supports attr names |
| `/sgs-db` (`python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py`) | block roster / attrs / derived_selector / container_kind / blocks.tier (DB-authoritative) |

## Agents to Delegate To
| Agent | When |
|-------|------|
| general-purpose (sonnet) | Task 3 per-family build — NO commit/deploy authority, return uncommitted |
| general-purpose (haiku / gemini-flash) | 2nd cross-family rater on `/qc-council` passes |
| `wp-sgs-developer` | heavier WP/block.json/render.php work (product-card, composite blocks, media attrs) |
| `design-reviewer` | visible-surface changes (live page-8 at 375/768/1440) + Task 5 product-page redesign |

## Guardrails
Cloning thread owns the converter + homepage pipeline + /sgs-update seeding path. Converter + shared-wrapper + seeding changes are Rule-7 high-blast → design-gate. Build per family, `/qc-council` + Gate A + (live page-8) per commit. The FR-22-3 guard blocks new `if slug==` literals. Run BOTH conformance suites. D-ceiling check before any new D (`grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1` → D227).
