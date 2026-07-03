---
doc_type: next-session-prompt
project: small-giants-wp
thread: cloning-pipeline / L2 content-width universal → feature-grid variant → product-card structure
generated: 2026-07-03-EVEN-LATER
primary_goal: "Task 4 re-clone + icon-source correction (D264) + core→sgs mapping (D265) + block features (D266) are ALL DONE + PUSHED + LANDED-verified (previous session). NEXT (the remaining CLONING-fidelity work, Bean-set order): (1) L2 content-width UNIVERSAL — the __inner/__card-inner max-width drops; apply the container-mirror sync (Spec 29 `sync-container-wrapping-blocks.py --apply`, currently report-only) so all container-equivalents get contentWidth (ONE mirror-sync gap on a DB signal, NOT per-block, STOP-38) + fix the §2.4 sole-pass-through fold → contentWidth. (2) feature-grid layoutMode=auto-flex ignores transferred columns (renders 3 not 4) — ground the variant in variant_slots + blocks.variant_attr. (3) product-card Layer-B structure (price 28px Fraunces bold → renders 18px Inter). Follow Spec 31 in every detail; parity = computed values matched by content (CLAUDE.md rule 4a). NOTE: the AUDIO/VIDEO block build + core→sgs table completion is a SEPARATE one-time prompt `next-session-prompt-audio-video-blocks.md`."
---

# Next session — cloning fidelity: L2 content-width universal → feature-grid variant → product-card structure

Invoke `/autopilot` before anything else. This is a `/sgs-clone` (LANDED) + `/systematic-debugging` + `/sgs-wp-engine` + spec-conformance session.

**Agent identity.** You are the SGS cloning-pipeline engineer. The previous session (D264-D266) LANDED-verified the 4 held fixes on page 8 (emoji + star + 16px + min-width), corrected the icon-source lift to sgs/icon's 4 real sources via DB role-dispatch (D264), completed the core→sgs replacement mapping many-core→one-sgs (D265), and shipped 2 block features (D266 — divider gap variant + media audio mode). All pushed. Your job now: the remaining CLONING-fidelity converter fixes — L2 content-width, feature-grid variant, product-card structure.

**State recap (plain English).** The cloning pipeline converts a draft mockup into native SGS blocks. The homepage (sandybrown page 8) now reflects the current converter and is LANDED-clean for emoji/star/theme/min-width. The remaining fidelity gaps (from the 2026-07-03 clone-vs-draft audit): (A) **L2 content-width** — the content-band (`__inner`/`__card-inner`) `max-width` drops because 4 composites lack the mirrored `contentWidth` attr (the container-mirror sync is report-only); (B) **feature-grid** renders 3 columns not 4 (`layoutMode=auto-flex` ignores the transferred columns); (C) **product-card** typed-mode structure (price renders 18px Inter not 28px Fraunces bold). NOTE: a SEPARATE one-time prompt (`next-session-prompt-audio-video-blocks.md`) covers the dedicated sgs/audio block + video re-skin + finishing the core→sgs table — that is a distinct workstream; this prompt is the cloning pipeline only.

---

## ⛔ THE 7 NON-NEGOTIABLE RULES (Bean-set; gate every change)
1. **CONVERT, don't mirror** — output = native SGS blocks driven by attributes; NOT a div-by-div copy of draft classes.
2. **NO CHEATS** — no `sourceMode='bound'` converter emit, no echo-`$content` passthrough, no hardcoded `!important`/default overriding faithful draft CSS, **no hand-declared per-block/per-draft selectors**, **no client copy baked into a base block**, **no per-slug/per-slot/per-role literal in a resolver body**. Only the live WC configurator `wc-product`/`sgs-cpt` is legitimate.
3. **UNIVERSAL, no carve-outs** — a fix fires for every qualifying block/case; over-broad universality is ALSO a break. Universal signal = a DB fact (`is_root`, `container_kind`, a capability, a `role`), never `if slug == X`. **L2/contentWidth is UNIVERSAL across ALL container-equivalents (Spec 29) — one mirror-sync gap, not N fixes.**
4. **NO SKIPPING** — every draft content node + CSS declaration transfers, OR is EXCLUDED-with-reason, OR is a tracked GAP. Zero silent drops.
5. **VERIFY ON THE REAL HOMEPAGE** — live computed-style/innerText + draft-vs-clone at 375/768/1440. Emit-green ≠ LANDED. WRITTEN ≠ LANDED. "Deploy to homepage" = overwrite the REAL homepage page (sandybrown = page 8), never a new page (D254). Don't declare a section fixed from a grid+N-items impression (STOP-40).
6. **RESPONSIVE VALUES IN BLOCK ATTRIBUTES, never inline CSS.**
7. **FOLLOW THE SPEC IN EVERY DETAIL** — Spec 31 is the settled authority for every pipeline change. Read the governing section IN FULL and implement exactly what it specifies. Where silent, state that explicitly and pin the smallest spec-consistent rule (then write it INTO the spec), rather than inventing a mechanism.

## ⛔⛔ MANDATORY READING GATE (verify against ground truth, never guess; read WHOLE docs, not greps). Tick each in your first message:
1. ☐ **`.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md` — READ IT IN FULL, END TO END (Bean directive; STOP-26).** Especially §2 (core mechanism), §2.3/§2.4 (LAYER decomposition + the sole-pass-through fold → contentWidth), §3.A (CSS branch — max-width by LAYER), §3.B / §3.B.0 (content branch + the shared role-handler library + icon 3-kinds + leaf identity arm), §13.4 FR-31-5.2 (D259 device-tier cascade), §13.6 (composite-mirror).
2. ☐ **`.claude/specs/29-CONTAINER-EQUIVALENT-BLOCKS.md`** — the UNIVERSAL L1-L4 model + the container-mirror sync (`sync-container-wrapping-blocks.py --apply`, currently report-only) — this is the L2 content-width fix's universal channel.
3. ☐ **`.claude/handoff.md` (2026-07-03 EVEN LATER top entry)** — D264/D265/D266 done + the remaining L2/feature-grid/product-card gaps + the audit report pointer.
4. ☐ **`.claude/decisions.md` head** (verify D-ceiling: `grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1` → **D266**).
5. ☐ **`CLAUDE.md` root-cause methodology rule 4a** (parity = computed values matched by CONTENT) + the draft `sites/mamas-munches/mockups/homepage/index.html`.
6. ☐ **The live canary** — `https://sandybrown-nightingale-600381.hostingersite.com/` (page 8).

## Pre-flight self-attestation ritual (answer in your first message)
1. Have I completed the READING GATE — Spec 31 IN FULL + Spec 29 + handoff + decisions→D-ceiling + CLAUDE.md rule 4a + the draft? (Quote one specific thing to prove it.)
2. What branch + D-ceiling? (`git branch --show-current` → main; D-ceiling → **D266**.) Nothing is held from push — D264/D265/D266 are all on origin/main. Verify the D-ceiling before any new D.
3. For the fix I'm about to build: theme-layer or converter or block? Is it UNIVERSAL where it should be (Rule 3)? Does it FOLLOW SPEC 31 (Rule 7)?
4. Am I gating on the REAL page (LANDED page 8, computed-parity matched by content, Bean eye) not emit-green (Rules 4/5, STOP-4/21/37/40)?
5. For any subagent: CODING subagents CASCADE-FAIL here (STOP-39) — build INLINE. Read-only analysis/council/Explore agents work.

## ⛔ ANTI-PATTERN STOP CATALOGUE (carried forward; do NOT subtract)
- **STOP-1 — READ before you conjecture.** Verify every claim (yours, a subagent's, a doc's, a metric's) against ground truth — live code (file:line), the DB, the raw artefacts.
- **STOP-2 — Subagents RETURN data / implement assigned files; NEVER write shared files.**
- **STOP-4 — WRITTEN ≠ LANDED.** "An attr was emitted" is a progress signal, never a gate.
- **STOP-6 — A gate that EXISTS but isn't WIRED-TO-SOMETHING-THAT-RUNS protects nothing.** Grep the wiring + confirm it RUNS before claiming "enforced".
- **STOP-8 — Device-tier ≠ arbitrary visual breakpoints** (768/1024 vs 600/640/781).
- **STOP-10 — Empty cloned section = usually a cv2 soft-fail** — read extract.json + trace.jsonl first; gate on `innerText.length>0`.
- **STOP-11 — SCHEMA enumeration ≠ USAGE enumeration.** Knowing an attr/column exists is necessary-not-sufficient; grep how it's WRITTEN and READ.
- **STOP-15 — A council/analysis finding is a HYPOTHESIS.** FACT-CHECK it against ground truth (file:line, DB rows) before acting.
- **STOP-16 — A subagent's "N tests pass / gate green" is a HYPOTHESIS.** Re-run the suite + gate `--check` YOURSELF from the CANONICAL cwd (`plugins/sgs-blocks/scripts`, `--import-mode=importlib`).
- **STOP-21 — LANDED-proven only by deploying the GENUINE emit to a live page + computed-style/innerText — NOT new-vs-frozen attr equivalence.** Recipe: `/sgs-clone SGS_NEW_ENGINE=1` → overwrite page 8 → anonymous Playwright/chrome-devtools. Creds: `.claude/secrets/sandybrown.env` (grep/cut, never `source`).
- **STOP-23 — Run a pre-commit `/qc-council` (or an adversarial council) on the BUILT converter code** (blub 255). Verify input-class ≠ output-class; render.php reads the attr you write AND paints the element you check.
- **STOP-24 — A DB change a reseed RE-DERIVES must use a reseed-surviving channel** (block.json / a dated migration / `sgs-update` seeder), never a manual DB edit. NOTE: `composition_role`'s home is `seed-composition-roles.py`, now wired into `/sgs-update` as a Stage-1 tail (D260). `array_item_schema` reseeds from block.json `items.properties`.
- **STOP-26 — Read the WHOLE target spec section holistically before building.**
- **STOP-27 — A conservation/regression guard is `raise`, NEVER a bare `assert`** (`python -O` strips assert).
- **STOP-28 — Do NOT flip the PRODUCTION default to the new engine** until A1 (media-map) + A2 (content ledger) are green. `SGS_NEW_ENGINE=1` is the opt-in test switch. Intact.
- **STOP-31 — A commit-blocking static gate must be scoped to the cheat's ACTUAL syntactic context; plant-test it.**
- **STOP-32 — FOUR-CHANNEL CHECK before claiming a CSS property is "dropped"** (native supports→style.*, custom attrs, wrapper render, spec destination).
- **STOP-34 — SYNTHETIC-FIXTURE-GREEN ≠ REAL-DRAFT-CORRECT.** Reproduce on the FULL real draft.
- **STOP-35 — DEFAULT-IS-CONTAINER: a slug-None class-section defaults to `sgs/container` + recurse, it does NOT fail.**
- **STOP-37 — LANDED catches EMIT/SERIALISATION bugs unit tests structurally cannot.** Deploy + count rendered sections/items.
- **STOP-38 — A section-outer/wrapper fix scoped to ONE slug is an R-31-9 carve-out CHEAT.** Fire on a DB signal (`is_root`, capability, role), never a slug literal.
- **STOP-39 — CODING SUBAGENTS CASCADE-FAIL in this environment.** DO THE BUILD INLINE. Read-only analysis/council/Explore agents work fine.
- **STOP-40 — Don't declare a section "fixed" from seeing a grid + N items.** Check the RENDERED result vs the DRAFT's actual desktop layout.
- **STOP-41 — the `no_slug_literal` gate guards `role`/`slot`/`canonical_slot` too, not just `block_slug`.** Any per-slot/per-role LITERAL comparison in a resolver body is a carve-out it blocks. Normalise via the DB or the un-gated shared `field_extractors`.
- **STOP-42 — PARITY = computed values matched by CONTENT, never source-declaration-diff, never wrapper-class-keying.** Use `parity/computed-parity.js`. The pipeline drop-logs (`attribute_gap_candidates` cumulative, `leftover-buckets.json`) measure converter INPUT-side, NOT rendered fidelity — do NOT trust their counts as a per-clone drop signal.
- **STOP-43 (NEW, 2026-07-03) — PROVE THE PREMISE ON THE REAL NODE, not code inference.** Before designing OR committing a converter/extraction fix, REPRODUCE the failure by RUNNING the engine on the real draft node (`build_block_markup(recognise(node), node)`), then re-run AFTER. On the info-box emoji fix (D263) code-reading shipped an icon arm that did NOTHING — two wrong assumptions (identity role uncovered AND it never reached the leaf arm → Case-4 gap) that only running the real node exposed. Extends R-31-6 / STOP-1 / STOP-42 to the design/premise step. Memory: `verify-converter-fix-premise-on-real-node`.

---

## ORCHESTRATION PLAN (Bean-set order; every task FOLLOWS SPEC 31; parity = computed-matched-by-content)

> **Context:** the previous session's re-clone already LANDED emoji + star + 16px + min-width on page 8, so page 8 reflects the CURRENT converter — the precondition for measuring these fixes. Re-clone again after each fix to LANDED-verify.

### Task 1 — L2 content-width UNIVERSAL (the __inner max-width drop) — FIRST
**What:** The content-band (`__inner`/`__card-inner`) `max-width` drops; 4 composites lack the mirrored `contentWidth` attr because the container-mirror sync is report-only.
**Why:** Universal fidelity gap — ONE mirror-sync gap fired on a DB signal for ALL container-equivalents (Spec 29 §2 / Spec 31 §13.6), NOT 4 per-block fixes (Rule 3, STOP-38).
**Orchestration:** INLINE. Read Spec 29 (the L1-L4 model + `sync-container-wrapping-blocks.py --apply`) IN FULL first. Apply the mirror sync so all container-equivalents get `contentWidth` + fix the `__inner` fold routing (§2.4 sole-pass-through → contentWidth). `/qc-council` before commit. Re-clone `SGS_NEW_ENGINE=1` → page 8, verify computed max-width matches the draft band.
**Acceptance:** L2 content-width LANDS on trust-bar/gift/ingredients/social/featured on page 8 (computed max-width matches the draft band).

### Task 2 — feature-grid variant + product-card structure
- **feature-grid** — `layoutMode=auto-flex` ignores the transferred columns (renders 3 not 4); ground the variant in `variant_slots` + `blocks.variant_attr` (query, don't guess).
- **product-card** — typed-mode Layer-B structure (price 28px Fraunces bold → renders 18px Inter regular). Spec 27 FP-H. Big — its own design-gate.
**Acceptance:** feature-grid renders 4-col at 1440; product-card price/structure matches the draft.

## Dependency graph
```
Task 1 (inline — L2 content-width universal)  →  /qc-council  →  re-clone LANDED-verify  →  commit + push
  ↓
Task 2 (feature-grid + product-card)  →  /qc-council  →  re-clone LANDED-verify  →  commit + push
```
(SEPARATE workstream — NOT in this prompt: the dedicated sgs/audio block + video re-skin + core→sgs table completion → `next-session-prompt-audio-video-blocks.md`, one-time, delete when done.)

## Skills to Invoke
| Skill | When |
|-------|------|
| `/brainstorming` | design thinking where the spec leaves a detail open (then write it into the spec) |
| `/gap-analysis` | grade any output before delivery |
| `/lifecycle` | before any skill/agent/pipeline change |
| `/research` | auto-routes if a defect needs external reference |
| `/strategic-plan` | order the tasks before coding |
| `/systematic-debugging` | ALWAYS — root-cause on the DRAFT + live page before any fix |
| `/sgs-clone` · `/sgs-db` · `/wp-blocks` | the LANDED run (`SGS_NEW_ENGINE=1`) + DB ground-truth |
| `/sgs-wp-engine` | block/theme work — evidence-gate + SKILL-STATUS harness |
| `/qc-council` · `/qc-inline` | multi-rater on BUILT converter/block code before commit (STOP-23) |
| `/verify-loop` · `/handoff` · `/capture-lesson` | 2-attestation / session close |

## MCP Servers & Tools
| Tool | What for |
|------|----------|
| Playwright / chrome-devtools | LANDED proof on page 8 — computed-parity matched by CONTENT (rule 4a) at 375/768/1440 |
| `python ~/.claude/hooks/wp-blocks.py dump` · `sgs-db.py sql "..."` | schema/DB ground-truth before any "missing X" |
| REST (Basic auth, `.claude/secrets/sandybrown.env`) | overwrite page 8 (the homepage) — NOT a new page (Rule 5) |

## Agents to Delegate To
| Agent | When |
|-------|------|
| `Explore` (read-only) | parallel ground-truth analysis (works; coding agents cascade-fail — STOP-39) |
| `wp-sgs-developer` | heavy block-dev (product-card Layer-B) — via the agent OR inline, NOT general-purpose coding subagents |

## Methodology guardrails (do not skip)
- **Prove the premise on the real node (STOP-43)** — reproduce every converter fix by running the engine on the real draft node BEFORE + AFTER; never ship from code inference.
- **Deploy before measure** — any LANDED check requires the genuine `SGS_NEW_ENGINE=1` emit deployed to page 8 BEFORE any computed read (STOP-21). "Deploy to homepage" = overwrite page 8.
- **Universal or it's a cheat** — L2/contentWidth fires for ALL container-equivalents on a DB signal (Spec 29), never a slug literal (Rule 3, STOP-38/41).
- **PARITY = computed values matched by CONTENT** (rule 4a / STOP-42) — use `parity/computed-parity.js`, never declaration-diff or the input-side drop-logs.
- **/qc-council BEFORE every commit** touching converter/block/theme (blub 255). **LANDED (Bean eye on page 8) is the closing gate**, not emit-green (R-31-13 / STOP-4/21/37).
- **convert.py stays byte-identical** (D-MODULAR) — never edit the frozen engine; port-read only.
- Tests: `cd plugins/sgs-blocks/scripts && python -m pytest converter/tests cheat-gate/tests tests/test_converter_conformance.py -q --import-mode=importlib` (367 baseline; never drop). Cheat-gate: `python cheat-gate/run.py --check` exits 0. Branch `main`; verify D-ceiling; commit path-scoped (`git commit -- <paths>` or `-F msg`).
