---
doc_type: next-session-prompt
project: small-giants-wp
thread: cloning-pipeline
generated: 2026-06-05
primary_goal: "Fix the SGS cloning PIPELINE so the Mama's homepage clone is faithful. Implement the 9 evidence-grounded root causes (R1-R9) in `.claude/reports/2026-06-05-clone-fix-spec-9-roots.md`. Verify SIMPLY: re-clone to the actual homepage (page 8) and check each named symptom is gone. Pipeline fixes ONLY this session — no verifier-build, no per-section band-aids (R-22-1/R-22-9). Commit by explicit path (theme thread shares the tree)."
---

# Next Session — CLONING thread: FIX THE 9 PIPELINE ROOT CAUSES

> Invoke `/autopilot` first (auto-injected). Then read the MANDATORY READING below (it is TARGETED — the full historical STOP catalogue from prior prompts is in git history + captured in CC memory; per Bean's 2026-06-05 directive this prompt is curated, not a context dump).

## Objective (Bean-directed 2026-06-05)
Fix the cloning **pipeline** so the Mama's Munches homepage clone matches the draft. **Scope = the 9 root causes** consolidated in the fix-spec (each is a real problem + its solution + file:line + a symptom-check). **Focus solely on fixing the pipeline this session.** Do NOT build the deterministic verifier (`clone-parity.js`) this session — that is deferred. **Verification is simple:** re-clone, look at the live clone, confirm the named symptom is gone.

**Two changes from prior sessions:**
1. **Publish the clone to the ACTUAL HOMEPAGE = page 8** (`page_on_front=8` on sandybrown), NOT page 144. Use `--deploy-target page:8`.
2. Verifier-first sequencing is dropped; fix the pipeline, check the symptoms.

## State recap (plain English)
The cloning converter turns a HTML mockup into WordPress blocks. Bean manually QA'd the clone vs the draft and found 30+ issues. A strict evidence-only investigation (3 agents) + multi-agent QC + a 3-persona adversarial council distilled them into **9 systemic root causes (R1-R9)** — all live in the converter scripts / block.jsons, all IMPLEMENTATION except one small spec clause (R7). Prior conjecture (productId-empty-state, slot-collision, "class-CSS-not-extracted", circle-bg-invented) was FALSIFIED and removed. Several earlier "fixes" (typography/grid/padding/trust-bar, commits `1cf0692d`/`e75db509`/`642cad61`/`c97f85f1`/`b3e3b284`/`32b4c6fe`) landed but were DESKTOP-ONLY; the 9 roots supersede them with the complete fix set.

## MANDATORY READING (targeted — read these, in order)
1. **`.claude/reports/2026-06-05-clone-fix-spec-9-roots.md`** — THE actionable spec. R1-R9 + file:line + solution + symptom-check + the UNVERIFIED + NOT-a-defect buckets + the homepage(page 8) deploy. START HERE.
2. **`.claude/reports/2026-06-05-32pt-rootcause-QC-corrections.md`** — the QC verdict + corrected mechanisms (esp. R2 vs R3 are DISTINCT; #31 is array-driven not "correct").
3. **`.claude/reports/2026-06-05-32pt-rootcause-v2-part{1,2,3}-*.md`** — the per-point evidence chains (quote-backed) if you need the detail behind a root.
4. **`.claude/specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md` §FR-22-21 + §FR-22-5** — the transfer procedure the fixes must honour (+ where R7's new content-synthesis clause goes).
5. **`sites/mamas-munches/mockups/homepage/index.html`** — the draft (the truth). Latest run artefacts: `pipeline-state/mamas-munches-homepage-2026-06-05-103529/`.
6. Memories: `llm-eyeball-clone-verification-unreliable`, `diagnosis-without-delivery-needs-conformance-gate`, `composite-mirror-is-separate-from-cloning-fidelity`.

## Tasks (fix R1-R9 per the fix-spec; details + file:line live in the spec)

## Task 1 — R1 composite double-wrap + R6 button-wrapper paint + R8 lift mappings (convert.py converter-side)
**What:** exempt mirror composites at the wrap-gate (`convert.py:~2901`); skip button bg-lift when `inheritStyle` is a preset (`~2659`); add the R8 mappings (subHeadlineMaxWidth, --trial→variantStyle, object-fit/border-radius→media, icon-circle).
**Why:** closes #1/#2/#4 (hero+trust-bar structure), #9/#23 (all primary buttons), #3/#5B/#11d/#12D.
**Orchestration:** SERIAL Sonnet subagent(s) on `convert.py` (shared file). /qc-council pre-build on the wrap-gate change (high blast radius). **Acceptance:** re-clone page 8 — hero is single `sgs/hero` (no wrapper), no button colour-box, the R8 symptoms gone.

## Task 2 — R2 + R3 CSS-transfer (convert.py + theme + text-block controls)
**What:** R2 ancestor-inheritance for `text-align`/inheritable props → a per-instance `textAlign` control (theme default left); R3 add `margin-bottom`/`align-items`/`justify-content`/`font-family`/`background`/`max-width`→`contentWidth` to the harvest map. KEEP R2 and R3 as TWO distinct fixes.
**Why:** closes #13/#14/#16/#19/#20/#24/#27/#28/#12A (alignment + spacing + typography across sections).
**Orchestration:** Sonnet subagent (convert.py collector/harvest map) + a block-side bit (textAlign control on heading/text/label + theme default). /qc-council pre-build. **Acceptance:** sections centre where the draft centres, left otherwise; gaps/margins/fonts transfer.

## Task 3 — R4 `__experimentalBorder` codebase audit (block.json)
**What:** audit blocks that render a styleable box for missing `__experimentalBorder`; add `radius`/`width` (product-card, media, info-box — VERIFY each's block_supports first).
**Why:** closes #6/#7/#12C/#10 (rounded corners + borders).
**Orchestration:** Sonnet subagent (block.jsons — disjoint from convert.py, PARALLEL with Task 1/2). Build+deploy + symptom-check. **Acceptance:** cards rounded + bordered; brand image rounded.

## Task 4 — R5 icon/emoji identity + R7 array-driven content blocks (convert.py + db + spec clause)
**What:** R5 emoji→`emojiChar`/`iconSource`, SVG→sgs/icon; R7 router gate considers array-content attrs (`items`/`messages`/badges), add array extractors, notice-banner emit `sgs/text` InnerBlock not scalar `text`; add the §FR-22-21 content-synthesis clause (the one DOC fix).
**Why:** closes #5A/#15 (icons), #18 (notice-banner), #26 (announcement-bar), #31 (card-grid routing).
**Orchestration:** SERIAL Sonnet on convert.py + db_lookup; /qc-council pre-build (router-gate change is high blast radius). **Acceptance:** real icons/emojis; notice-banner + announcement-bar show draft content; products/gift route to the right grid populated with cards.

## Task 5 — UNVERIFIED sweep + homepage deploy + symptom sign-off
**What:** after R1-R8 land, re-clone to page 8 and check the UNVERIFIED bucket (#8/#11a-c/#17/#19/#25/#29e/#30) — many resolve via R1/R3/R7; live-diagnose only those still broken. Bean R-22-13 visual sign-off on the homepage clone.
**Orchestration:** inline (Opus) + Playwright. **Acceptance:** Bean confirms the homepage clone matches the draft section-by-section.

## Dependency graph
```
Task 3 (block.json, parallel) ─┐
Task 1 (convert.py serial) ─────┼─→ re-clone page 8 ─→ Task 2 (convert.py serial) ─→ re-clone
Task 4 (convert.py serial, after 1) ─┘                                                   ↓
                                                              Task 5 (UNVERIFIED sweep + Bean sign-off)
```
(convert.py tasks SERIALISE — one Sonnet subagent at a time; block.json/theme tasks parallel.)

## Methodology guardrails (do not skip)
- **Deploy before measure** — `build-deploy.py --blocks-only` + OPcache reset before any browser check; re-clone for converter changes; deploy to **page 8**.
- **Root cause before instance fix** — fix the root (R1-R9), never a per-section/per-Mama's patch (R-22-1 DB-first, R-22-9 universal).
- **Faithful transfer, not detection hacks** — fix the transfer/lift layer or a block capability; never a walker conditional.
- **--converter-v2 required**; **WP_DEBUG_DISPLAY false** on staging.
- **/qc-council before every converter/block/DB commit** (blub.db 255); commit by explicit path, `git log -1 --stat` (theme thread shares the tree).
- **Outcome ≠ code shipped** — a fix is done only when the named SYMPTOM is gone on the live homepage clone AND it's on `main`.

## Curated STOP entries that bind this session (full historical catalogue: git history of prior prompts)
- **#33** faithful-transfer, not detection hacks · **#34/#44** verify every subagent finding vs ground truth · **#50** confirm the target CSS reaches the targeted path BEFORE building · **#51** not-done-until-symptom-gone-AND-on-main · **#52** "exists"≠"applied" (grep call-sites) · **#19** roll back fast on regression · **#32** design-gate (qc-council) sensitive/high-blast-radius changes (wrap-gate, router-gate) · **#41/#45** shared tree: explicit-path commit, re-read shared docs first.
- **NEW (2026-06-05, binding):** never assert a causal mechanism without a quoted evidence chain (draft CSS + emit + code) — mark UNVERIFIED otherwise. Never conclude "correct/no-fault" from a single DB column or script logic without reading the block's ACTUAL capability (block.json attrs + render.php).

## Tooling
`/autopilot` · `/sgs-clone` + `sgs-clone-orchestrator.py` (deploy page:8) · `/sgs-db` (read) + direct `sqlite3` (writes) · `/wp-blocks` (schema before "missing X") · `/dispatching-parallel-agents` + `/subagent-driven-development` + `/delegate` · `/qc-council` (per converter/block/DB commit) · `/systematic-debugging` (root-cause from artefacts) · Playwright MCP (live symptom-check; cache-bust `?cb=N`; 1440/768/375) · `/handoff`.

## Minor consistency nits to clear early (1 min)
parking P-TRUSTBAR top `Status:` label (body already RESOLVED→archive); `.claude/CLAUDE.md` D-ceiling D167→D178.
