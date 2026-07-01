---
doc_type: next-session-prompt
project: small-giants-wp
thread: cloning-pipeline / new-engine LANDED — Bean-review defects #3-7 (A1 media-map first)
generated: 2026-07-01
primary_goal: "The new engine now clones a FULL Mama's homepage (2/9->9/9) + full-width + chrome-skip, LANDED on sandybrown page 8. Bean's page-8 eye-review (R-31-13) surfaced 5 remaining defects. NEXT = fix them, biggest first: #3 A1 MEDIA-MAP not wired (only hero img + trust icons show — the new engine accepts media_map but never remaps <img src> to uploaded WP URLs), then #5/#6 composite fidelity (trust-bar spurious all-caps column; product-card renders as text not sgs/product-card), then #4/#7 (hero split variant on desktop; ingredient card content). Each is a root-cause investigation on the highest-regression surface — design-gate + LANDED-verify per section."
---

# Next session — new engine is LANDED; close the Bean-review fidelity defects #3-7 (A1 media-map first)

Invoke `/autopilot` before anything else.

**Agent identity.** You are the SGS cloning-pipeline engineer. The new converter engine now clones a full homepage (all 9 sections), full-width and chrome-skip are correct, and it is LANDED on the sandybrown homepage (page 8). Your job: close the 5 fidelity defects Bean's eye caught — starting with wiring the A1 media-map so images actually migrate, then the composite-recognition/extraction gaps.

**State recap (plain English).** A "class-section" is a top-level page section (`<section class="sgs-hero">`, `<section class="sgs-brand">`, …). The new engine (behind `SGS_NEW_ENGINE=1`, opt-in; prod default = frozen convert.py) now: recognises every section (composites like hero/trust-bar directly; everything else defaults to `sgs/container`+recurse-descend children, FR-31-4); emits full-bleed `align:"full"` for no-max-width sections UNIVERSALLY (container + composites, gated on `block_supports.align`); and chrome-skips header/footer/nav. It LANDED on page 8. **What's still wrong (Bean's eye):** images barely migrate (A1 media-map not wired — #3), and 4 composite-fidelity gaps (#4 hero split, #5 trust-bar extra column, #6 product-card→text, #7 ingredient cards empty). D-ceiling D254; branch main; 6 commits `c2105981`->`7d694a54` NOT pushed (pending Bean sign-off).

---

## ⛔ THE 7 NON-NEGOTIABLE RULES (Bean-set; gate every change AND every council)
1. **CONVERT, don't mirror** — output = native SGS blocks driven by attributes; NOT a div-by-div copy of draft classes/DOM.
2. **NO CHEATS** — no `sourceMode='bound'` emit, no echo-`$content` passthrough, no hardcoded `!important`/default overriding faithful draft CSS. Only the live WC configurator `wc-product`/`sgs-cpt` is legitimate.
3. **UNIVERSAL, no carve-outs** — a fix applies to every qualifying block/case; no per-block/per-slot exception. Over-broad universality is ALSO a break. **A section-outer/wrapper fix must fire for container + container-equivalent + composite identically (they share `SGS_Container_Wrapper` + `supports.align`); slug-gating is an R-31-9 carve-out CHEAT (D254 — Bean caught it). Universal signal = `is_root`.**
4. **NO SKIPPING** — every draft content node + CSS declaration transfers, OR is EXCLUDED-with-reason, OR is a tracked GAP (visible to F5). Zero silent drops.
5. **VERIFY ON THE REAL HOMEPAGE** — live computed-style/innerText + draft-vs-clone. Emit-green ≠ rendered. WRITTEN (attr set) ≠ LANDED (renders on the page). Synthetic-fixture-green ≠ real-draft-correct (STOP-34). **"Deploy to homepage" = overwrite the REAL homepage page (sandybrown page 8), never a new page + front-page repoint (D254 — Bean caught it twice).**
6. **RESPONSIVE VALUES IN BLOCK ATTRIBUTES, never inline CSS.**
7. **DESIGN-GATE sensitive/high-blast-radius changes** (shared wrapper, walker, recognition, converter, seeding, ledger, gates) via `/adversarial-council` or `/qc-council` + Bean approval BEFORE building.

## ⛔⛔ MANDATORY READING GATE (verify against ground truth, never guess; read WHOLE docs/files, not greps). Tick each in your first message:
1. ☐ **`.claude/handoff.md` (2026-07-01)** — the D254 entry (container-default built + 2 LANDED bugs + Bean-review #1/#2 fixed + #3-7 open).
2. ☐ **`.claude/decisions.md` head → D254** (verify D-ceiling: `grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1` → D254). D253 = Spec 22→31 merge; D252 = W3 keystone.
3. ☐ **`.claude/parking.md`** — `P-MEMORY-MD-COMPACT` (Status: OPEN). The #3-7 defects are NOT in parking — they are specified in THIS prompt's ORCHESTRATION PLAN below + decisions.md D254.
4. ☐ **`.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md` — READ IT IN FULL, END TO END, NOT just the sections for today's task (Bean directive 2026-07-01; STOP-26).** The whole spec must be in context at session start so that when ANY issue pops up mid-work — in a section you weren't planning to touch — you already have the grounding and aren't in the dark. Do NOT grep-and-skim to the #3-7 areas only. (The most task-relevant anchors within it: §3 content+CSS routing incl. media/image-object + step-7 align gating spec:157/179; §13.2 FR-31-4/4.1 container default; §13.3 content fork FR-31-2 for #6 product-card; §13.5 FR-31-20 variant detection for #4 hero split — but read the whole thing first.)
5. ☐ **The new engine files** — `converter/recognition.py` (recognise + recognise_section), `converter/services/extraction.py` (run_container_default + run_mechanism_b + build_block_markup + the media_map threading for #3), `converter/services/field_extractors.py` + `lift_helpers.py` (image lift for #3), `converter/orchestrator.py` (emit_block_markup).
6. ☐ **The A1 media-map (#3)** — `sites/mamas-munches/research/sandybrown-media-map.json` (format `{filename:{id,url}}`) + how the FROZEN engine applies it (`convert.load_media_map` + filename→url lookup) as the port reference.
7. ☐ `pipeline-state/<latest-run>/{extract,leftover-buckets,stage-9}.json` — raw artefacts before ANY converter-quality conjecture.
8. ☐ **The live canary** — `https://sandybrown-nightingale-600381.hostingersite.com/` (page 8) — inspect the actual defects before theorising.

## Pre-flight self-attestation ritual (answer in your first message)
1. Have I completed the READING GATE — handoff (D254) + decisions→D254 + the #3-7 register + Spec 31 §3/§13.2/§13.3/§13.5 + the media-map format? (Quote one specific thing to prove it.)
2. What branch + D-ceiling? (`git branch --show-current` → main; D-ceiling → D254.) The 6 D254 commits are NOT pushed — confirm before adding.
3. For the fix I'm about to build: is it UNIVERSAL (fires for every qualifying block, not one slug — Rule 3 / R-31-9 / STOP-38)? Am I DESIGN-GATING a walker/recognition/converter change (Rule 7, STOP-19) BEFORE code, and FACT-CHECKING every council finding against ground truth (STOP-15)?
4. Am I gating on the REAL page (LANDED on page 8, draft-vs-clone, Bean eye) not emit-green (Rules 4/5, STOP-4/21)? "Deploy to homepage" = overwrite page 8, not a new page (Rule 5).
5. For any subagent: did I tell it "implement only your assigned files / RETURN findings; do NOT write shared docs or touch the shared git tree" (STOP-2)? Am I verifying its test/gate claims from the canonical cwd + proving the FAILURE path (STOP-16)?

## ⛔ ANTI-PATTERN STOP CATALOGUE (carried forward, D101 — verbatim; do NOT subtract)
- **STOP-1 — READ before you conjecture.** Verify every claim (yours, a subagent's, a doc's, a metric's) against ground truth — live code (file:line), the DB, decisions.md, the raw run artefacts. The reading gate is non-skippable.
- **STOP-2 — Subagents RETURN data / implement assigned files; NEVER write shared files.** Opus orchestrates all shared-file writes; commit valuable artefacts BEFORE dispatching.
- **STOP-3 — The ledger/oracle input is the DRAFT/rendered-clone, NOT the converter's recognised set.** (Spec 31 §12.2.1.)
- **STOP-4 — WRITTEN ≠ LANDED.** "An attr was emitted" is a progress signal, never a gate.
- **STOP-5 — Stage-by-stage is the BUILD ORDER; the ledger+oracle is the cross-stage TEST.**
- **STOP-6 — A gate that EXISTS but isn't WIRED-TO-SOMETHING-THAT-RUNS protects nothing.** The F5 gates run on every CC `git commit`. Before claiming "enforced", grep the wiring + confirm it RUNS.
- **STOP-7 — Hardcoded wrapper/converter defaults are CHEATS to remove, not blockers** (R-31-1).
- **STOP-8 — Device-tier ≠ arbitrary visual breakpoints.** Device-tier = {767/768, 1023/1024}; a single-rule visual breakpoint (600/640/781) is legitimate + must NOT be snapped to a tier.
- **STOP-9 — Composites are NEVER a separate system; variant grids are DB-defined** (`variant_slots` + `blocks.variant_attr`; query, don't guess). RELEVANT TO #4 (hero split) + #5/#6.
- **STOP-10 — Empty cloned section = usually a cv2 soft-fail, NOT a recognition miss.** Read extract.json `status` + trace.jsonl FIRST; gate on `innerText.length>0`. A content-gated block renders EMPTY without content BY DESIGN. RELEVANT TO #7 (ingredient cards empty).
- **STOP-11 — SCHEMA enumeration ≠ USAGE enumeration.** Knowing an attr/column/function EXISTS is necessary but NOT sufficient; grep the real signature + how it's WRITTEN and READ first.
- **STOP-12 — A cross-environment verifier must be apples-to-apples; reusing infra ≠ inheriting its assumptions** (D233).
- **STOP-13 — A cross-FAMILY rater catches what same-family review misses; if its tooling is broken, stand in with a structured branch trace** (D234).
- **STOP-14 — Before ARMING any gate, run it in report mode against CURRENT output + baseline today's legacy violations (key by identity, not line); fail only on NEW** (D236).
- **STOP-15 — Validate routing/variant claims against pipeline-PRODUCIBLE inputs, not synthetic dicts; run an adversarial-council AFTER a qc-council; then FACT-CHECK the council against ground truth** (D237/D242 — a council finding is a HYPOTHESIS). Applied D254 — caught a wrong DB-predicate proposal.
- **STOP-16 — A subagent's "N tests pass / gate green" is a HYPOTHESIS.** Re-run the suite + the gate's `--check` YOURSELF from the CANONICAL cwd (`plugins/sgs-blocks/scripts`, `--import-mode=importlib`); prove the FAILURE path; inspect the committed baseline for stale plants.
- **STOP-17 — A coverage/no-drop/diff gate's set-difference join must key BOTH sides on the FULL unit identity incl. responsive tier/media; red-team a BUILT gate before trusting it** (D240).
- **STOP-18 — Don't defer residuals out of habit; fact-check each against ground truth first** (D241). Label each DONE-NOW / DISMISSED-with-evidence / DEFERRED-with-cited-blocker.
- **STOP-19 — The walker/recognition is the HIGHEST-regression surface — design-gate + don't grind under context pressure.** Also: a path-scoped `git commit -- $(...)` can DROP a `git mv` source-path deletion — commit by explicit path list naming BOTH sides.
- **STOP-20 — Restructure a multi-file rebuild as a VERTICAL SLICE (one real output LANDED), not a horizontal scaffold of empty stubs; make LANDED the headline signal; DOUBLE-VERIFY a design before build then FACT-CHECK the verifiers** (D242).
- **STOP-21 — A new-engine resolver is only LANDED-proven by deploying its GENUINE output to a live page + computed-style/innerText + verdict — NOT by new-vs-frozen attr equivalence** (D243). Recipe: build markup via the engine → REST-create a FRESH canary page (guard-safe) OR overwrite page 8 (the homepage) → anonymous Chrome-DevTools/Playwright `getComputedStyle`/innerText → require the OUTPUT marker + non-default. Creds: `.claude/secrets/sandybrown.env` (grep/cut, never `source`). **Reachable via `/sgs-clone` with `SGS_NEW_ENGINE=1`.** D254: this caught 2 content-dropping emit/serialisation bugs unit tests passed.
- **STOP-22 — The frozen `convert.py` is NEVER the design reference for a rebuild stage — WITH ONE CARVE-OUT: read-to-port a function Spec 31 names as WORKING + in-scope** (D246). For #3 the frozen `load_media_map`/media-lookup IS the port reference.
- **STOP-23 — Run a pre-commit `/qc-council` on the BUILT converter code, not just the design** (blub 255). Input class ≠ output class is a live trap; verify render.php reads the attr you write AND paints the element you check.
- **STOP-24 — A DB change to a column `/sgs-update` RE-DERIVES must use the reseed-surviving `ATTR_CLASSIFICATION_OVERRIDES` channel, not a bare migration.**
- **STOP-25 — A rebuild's "fresh/modular" = RE-HOUSE existing WORKING logic behind one dispatch; NEVER recreate it with new logic + new DB columns.**
- **STOP-26 — Before designing ANY rebuild stage, read the WHOLE target spec holistically (not greps).**
- **STOP-27 — A regression/conservation guard is `raise`, NEVER a bare `assert`** (`python -O` strips assert).
- **STOP-28 — Do NOT flip the PRODUCTION-DEFAULT to the new engine until A1 (media-map) + A2 (content-conservation ledger) are green.** The `SGS_NEW_ENGINE=1` flag is the opt-in test switch (default-off keeps frozen convert.py live). Intact through D254. **NOTE: #3 (this session's Task 1) IS the A1 media-map — one of the two STOP-28 gates.**
- **STOP-29 — BIND DEFINITION-OF-DONE TO THE SPEC'S FULL SCOPE; never ship a minimum increment and call the rest "out of scope".** Map every deferral to a named spec STAGE.
- **STOP-30 — A subagent's "covered / N routes / no-cheating" verdict is a HYPOTHESIS.** Re-enumerate + verify against ground truth.
- **STOP-31 (D249) — A commit-blocking static gate must be scoped to the cheat's ACTUAL syntactic context; plant-test it FIRES on each real cheat + stays SILENT on a docstring quoting the pattern.**
- **STOP-32 (D250) — FOUR-CHANNEL CHECK before claiming a CSS property is "dropped / not routed / unbuilt".** (a) WP native `supports`→`style.*`, (b) custom block attrs, (c) the wrapper render, (d) the spec's declared destination. A gap is real ONLY after all four are negative.
- **STOP-33 (D251) — A "deterministic" DB tool only guarantees correct data for the steps it ACTUALLY runs.** Before blaming wrong/missing DB data, check whether the derivation STEP is even WIRED INTO the standard flow.
- **STOP-34 (D252) — SYNTHETIC-FIXTURE-GREEN ≠ REAL-DRAFT-CORRECT.** A unit test built from a hand-written node can take a DIFFERENT code path than the real draft and mask a bug. Reproduce on the FULL real draft (all sections).
- **STOP-35 (D252) — DEFAULT-IS-CONTAINER: a slug-None class-section DEFAULTS to `sgs/container` + recurse children (FR-31-4), it does NOT fail.** BUILT D254 (recognise_section + run_container_default). An EMPTY container (recursed to nothing) is still the bad case → conservation `raise`.
- **STOP-36 (D253) — Merging/renumbering a canonical spec: renumber via SCRIPT on an ACTIVE-FILE ALLOWLIST only; exclude frozen code + archives; keep an ID-mapping note; verify tests + cheat-gate green AFTER; QC-council the merged spec.**
- **STOP-37 (NEW, D254) — LANDED catches EMIT/SERIALISATION bugs unit tests structurally cannot.** A block-markup STRING can be 84 blocks and perfect while WP drops content on parse: (a) a line-based post-processor (`ensure_root_section_class`) drops children when the engine one-lines a block — WP block markup is newline-separated; (b) an empty dynamic block (save()=null) MUST self-close (`/-->`) — open+close fails WP validation and silently drops the whole section. ALWAYS deploy to a real page + count rendered sections + check for invalid-block, not just the emit string.
- **STOP-38 (NEW, D254) — A section-outer/wrapper fix scoped to ONE slug is an R-31-9 carve-out CHEAT.** Every section-class block (container + container-equivalent + composite) shares `SGS_Container_Wrapper` + `supports.align`/`is_section_root` (composite-mirror FR-31-21.1). Apply the fix on the `is_root` signal (true ONLY for the top-level section), gated on the relevant `block_supports.*` per Spec 31 step 7 — never `if rec.slug == <one block>`. Bean caught the slug-scoped full-width fix.

---

## ORCHESTRATION PLAN

### Task 1 — #3 A1 MEDIA-MAP wired (BIGGEST; Bean priority; also a STOP-28 gate)
**What:** Make the new engine remap draft `<img src>` (mockup filenames) to uploaded WP URLs via the client media-map, so images actually migrate on a clone.
**Why:** Currently only the hero image + trust-bar icons show; every other image is broken/absent — this dominates Bean's visual read of fidelity. Measurable: the LANDED page-8 clone shows the featured-product / brand / gift / ingredient images resolved to sandybrown URLs.
**Estimated time:** design ~15 min; build ~30 min.
**Orchestration:**
- Execution: **inline Opus** (converter/media surface; STOP-19). Design-gate first (Rule 7) — the media_map is threaded into `build_block_markup`/`field_extractors`/`lift_helpers` but not APPLIED; port the frozen `load_media_map` + filename→url lookup (STOP-22 carve-out) into the new engine's image lift.
- `/qc-council` on the built code (STOP-23); then LANDED-verify on page 8 (deploy → images resolve → Bean eye).
**Depends on:** none. **Acceptance:** the featured-product/brand/gift/ingredient images render from sandybrown URLs on page 8 (draft-vs-clone), zero broken images that the draft has, Bean sign-off.

### Task 2 — #5 trust-bar extra column + #6 product-card recognition
**What:** #5 — kill the spurious first trust-bar grid item (col-1 = all 4 columns' text concatenated in all-caps). #6 — make the featured-product cards recognise as `sgs/product-card`, not a text block + paragraph + link.
**Why:** Both are visible composite-fidelity breaks. #6 is a recognition-coverage gap (the product-card DOM isn't matching `sgs/product-card`); #5 is a content-extraction bug in the trust-bar composite.
**Estimated time:** ~20 min each (root-cause first).
**Orchestration:** inline Opus; root-cause each against the DRAFT DOM + `variant_slots`/`block_attributes` (STOP-9/11); design-gate the recognition change (Rule 7); `/qc-council` + LANDED-verify.
**Depends on:** none (parallel-safe with Task 1). **Acceptance:** trust-bar shows exactly its 4 icon columns; featured-product emits `sgs/product-card` blocks; both verified on page 8.

### Task 3 — #4 hero split variant + #7 ingredient card content
**What:** #4 — hero renders the 2-col split variant on desktop (variant-detect / split gridTemplateColumns). #7 — ingredient cards lift their text (icons depend on Task-1 media-map).
**Orchestration:** inline Opus; #4 grounds in `variant_slots` + `blocks.variant_attr` (STOP-9, query don't guess); #7 check extract.json status first (STOP-10 — empty may be a content-gated soft-fail). Design-gate + LANDED-verify.
**Depends on:** Task 1 for #7 icons. **Acceptance:** hero is split on desktop; ingredient cards show their text + icons on page 8, Bean sign-off.

### Dependency graph
```
Task 1 (#3 A1 media-map — inline Opus, design-gate -> build -> /qc-council -> LANDED page 8)
Task 2 (#5 trust-bar + #6 product-card — parallel-safe with Task 1)
  -> Task 3 (#4 hero split + #7 ingredient content [needs Task-1 media-map for icons])
-> Bean sign-off -> PUSH the D254 + new commits to main
```

## Skills to Invoke
| Skill | When to use |
|-------|-------------|
| `/brainstorming` | ALWAYS — architectural/recognition decisions (the #6 recognition fix, #4 variant) |
| `/gap-analysis` | ALWAYS — grade any output before delivery |
| `/lifecycle` | ALWAYS — before any skill/agent/pipeline change |
| `/research` | ALWAYS — auto-routes if a defect needs external reference |
| `/strategic-plan` | ALWAYS — order the #3-7 work before coding |
| `/adversarial-council` · `/qc-council` | design-gate + pre-commit on every recognition/walker/converter change (Rule 7 / STOP-23) |
| `/sgs-clone` · `/sgs-db` · `/wp-blocks` | DB ground-truth + the LANDED run (`SGS_NEW_ENGINE=1`) |
| `/systematic-debugging` · `/verify-loop` | root-cause each defect + 2-attestation |
| `/handoff` · `/capture-lesson` | session close |

## MCP Servers & Tools
| Tool | What to use it for |
|------|-------------------|
| Playwright / chrome-devtools | LANDED proof on page 8 (anonymous computed-style/innerText at 375/768/1440) |
| `python ~/.claude/hooks/wp-blocks.py dump` · `sgs-db.py` | schema/DB ground-truth (variant_slots, block_attributes) before any "missing X" |
| REST (Basic auth, `.claude/secrets/sandybrown.env`) | overwrite page 8 content (the homepage) — NOT a new page (Rule 5) |

## Agents to Delegate To
| Agent | When |
|-------|------|
| `wp-sgs-developer` | heavy build steps if dispatched (each RETURNS findings / implements assigned files, STOP-2) |
| `code-reviewer` (feature-dev) | pre-commit review on the recognition/media diff |

## Methodology guardrails (do not skip)
- **Deploy before measure** — any LANDED check requires the genuine emit deployed to page 8 BEFORE any computed-style read (STOP-21). "Deploy to homepage" = overwrite page 8, not a new page (Rule 5, D254).
- **Root cause before instance fix** — for each defect ask "what's the class of failure?" (media / recognition / extraction / variant) before a per-section tweak.
- **Universal or it's a cheat** — every fix fires for all qualifying blocks (Rule 3 / R-31-9 / STOP-38); slug-scoping is a carve-out.
- **/qc-council BEFORE every commit** touching recognition/walker/converter (blub 255). **LANDED (Bean eye on page 8) is the closing gate**, not emit-green (R-31-13 / STOP-4/21/37).
- **convert.py stays byte-identical** (D-MODULAR) — never edit the frozen engine; port-read only.
- Tests: `cd plugins/sgs-blocks/scripts && python -m pytest converter/tests cheat-gate/tests -q --import-mode=importlib` (299 baseline; never let it drop). Cheat gate: `python cheat-gate/run.py --check` exits 0. Branch `main`; D-ceiling D254; commit path-scoped (lucide/W3-plan/render.php/screenshot-pngs are NOT yours).
