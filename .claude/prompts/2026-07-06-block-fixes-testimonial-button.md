---
doc_type: next-session-prompt
project: small-giants-wp
thread: DEFERRED PIPELINE/DB WORK — typed-mode option-picker cloning fix → CSS-property column seeding → capability-roster rollout
generated: 2026-07-06 (rewritten at the D283 close; the block-side fixes this prompt originally held are DONE)
status: ALTERNATE SESSION PROMPT (distinct from the container L1-L4 cascade deep-dive in next-session-prompt.md). Pick THIS one for the three deferred pipeline/DB tasks below.
primary_goal: "2 Pipeline/DB tasks, IN ORDER: (1) seed the ~50-80 naming-mismatch corrections into the css_property/css_layer column (mechanism already shipped D281, 0 rows seeded); (2) apply the capability-roster 3-wave rollout after fixing the 4 latent mis-seeds. Each LANDED + committed before the next."
---

# NEXT SESSION — deferred pipeline/DB work (CSS-column seeding → capability rollout)

> **✅ DONE at D284 (2026-07-06) — Task 0 + Task 0b shipped, LANDED on page 8, pushed.** Task 0 (option-picker cloning): a new UNIVERSAL match layer **L1d** in `converter/resolvers/array_content.py` (a true-leaf array item lifts its own text; leaf-guarded) + `supports.sgs.arrayContentLift` + `packSizes` item-schema in product-card block.json + typed render emits the self-contained `sgs/option-picker` via `render_block` (`995a02b6`; content parity 96→100; 2 cross-model /qc-council raters GO). Task 0b (un-hardcoding, `5804128b`): typed CTA attr-driven via `sgs_button_element_style_css`; `descColour`/`priceNoteColour`/desc-line-height controls; price font `'Fraunces'`→`var(--wp--preset--font-family--display)` (client-font-in-framework-block bug, Bean-caught); editor preview mirrors the frontend picker. Full detail: handoff.md D284. **Deferred → parking.md:** P-PRODUCT-CARD-NAMED-PICKERS (optional picker name + multi-named-pickers), P-PACKSIZE-ACTIVE-DEFAULT, P-ARRAY-LIFT-LEAF-COLLISION, P-OPTIONPICKER-DUP-KEY. **THIS PROMPT NOW = Tasks 1 + 2 ONLY** (renumbered below; ignore any "Task 0"/"Task 0b" sections that remain).

Invoke /autopilot first. **This is high-stakes cloning-engine + DB work — do it on fresh context, root-cause-first, LANDED-before-commit.** The D283 session shipped 6 block-side fixes + the product-card built-in CTA; these three pipeline tasks were deferred here deliberately (they need clean context + a DB rebuilt). Read Spec 31 IN FULL first (STOP-26).

**State recap (plain English).** Branch main at `d7039a79`. Block fixes done + LANDED (handoff.md D283). The `css_property`/`css_layer` declarative column MECHANISM shipped at D281 but is EMPTY (0 seeded rows); the `attribute_gap_candidates` ledger has 2,461 rows. The capability-roster rollout was pre-audited at D280 (4 latent boolean-mis-seeds found) but never applied. D2 is NOT deployed (honest page; parity content 96 / CSS 70-71-71). The DB rebuilds via `/sgs-update` (the working copies are 0-byte until then).

## Mandatory READING (tick each; read WHOLE docs)
1. [ ] `.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md` — IN FULL. §3.A CSS branch + §13.4 FR-31-5.2/5.3 (the css_property column mechanism).
2. [ ] `.claude/plans/2026-07-05-css-property-column-design.md` — the COUNCIL OUTCOME block (seed-only-the-corrections, column-first-else-fallback, the 5 must-fixes). Build THAT, not the superseded original.
3. [ ] `.claude/handoff.md` D283 + D281 + D280 entries; verify D-ceiling (`grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1` — was D283).
4. [ ] `.claude/parking.md` — P-DRAFT-CSSVAR-COLOUR-RESOLUTION (blocks part of the css_property seed), P-PAGE8-QC-BATCH-9


## Pre-flight ritual (answer in your first message)
1. Branch + D-ceiling verified? Working tree clean (pre-existing churn only)?
2. Spec 31 read IN FULL? (Quote one specific thing.)
3. DB rebuilt this session via `/sgs-update` before any DB-dependent work?
4. For every fix: root cause PROVEN on the real node/DOM BEFORE (STOP-43); LANDED on page 8 AFTER (STOP-21); pre-commit /qc-council on any converter/DB change (blub 255).

## ⛔ Carry-forward STOP catalogue (load-bearing — do NOT subtract, D101)
Carry the FULL STOP-1..59 catalogue from `.claude/next-session-prompt.md` verbatim. The load-bearing ones here:
- **STOP-43** — prove the premise on the real node, not code inference.
- **STOP-21/4** — WRITTEN ≠ LANDED; deploy the genuine emit + read live.
- **STOP-53 (D280)** — replacing a name-guess resolver with a declarative column: seed ONLY the correcting subset, column-first-else-fallback, commit-per-correction. NEVER mass-reverse-derive.
- **STOP-54 (D280)** — enabling a capability flag wakes EVERY attr it gates; pre-audit each block for latent mis-seeds before flipping.
- **STOP-24** — a DB change a reseed re-derives must use a reseed-surviving channel (block.json / dated migration / sgs-update seeder / ATTR_CLASSIFICATION_OVERRIDES), never a bare SQLite UPDATE.
- **STOP-58** — Stage-1 reseed does NOT prune orphaned attr rows; use the full 10-stage `/sgs-update` or a durable prune.

---

## Task 1 — CSS-property column seeding (item 4)
Seed ONLY the ~50-80 naming-mismatch corrections into `block_attributes.css_property`/`css_layer` per the council-reshaped design (plan doc). Mine the corrections from `attribute_gap_candidates` (2,461 rows — identify the NAMING-MISMATCH class: an attr EXISTS but its name doesn't match the property_suffix, so the rule strands to D2). Declare per-block in `block.json supports.sgs` (cssProperty/cssLayer per attr) → the `/sgs-update` seeder materialises to the column → resolver reads column-first-else-fallback (byte-identical for untouched rows). Commit-per-correction; each correction lifts a stranded rule out of D2 → measurable parity gain, LANDED. **Sort blocked vs unblocked:** the button-colour correction is BLOCKED on `P-DRAFT-CSSVAR-COLOUR-RESOLUTION` (draft var() doesn't resolve on deploy) — do the UNBLOCKED corrections (token-slug / literal values that resolve). Address the 5 council must-fixes (grep ≥5 consumers, the reseed diff test, loud-fail contract per call site).

## Task 2 — Capability-roster 3-wave rollout (item 5)
Apply the D280 pre-audited 3-wave rollout (the paste-ready per-block overrides + capability flag flips). FIRST fix the 4 latent boolean-mis-seeds the pre-audit found (a boolean/non-CSS attr mis-classed role=color/typography would corrupt a raw string on the flip — STOP-54). Stage: Wave-1 flag-only / Wave-2 overrides-then-enable / Wave-3 exclude. LANDED per wave (the lifted per-element typography lands on the live page → parity CSS gain).

## Skills to Invoke
| Skill | When |
|-------|------|
| /autopilot | FIRST |
| /systematic-debugging | root-cause each defect on the live DOM/real node before fixing |
| /sgs-clone /sgs-db /wp-blocks | cloning runs + DB ground truth |
| /sgs-update | rebuild the DB (working copies are 0-byte) + reseed after column/capability changes |
| /qc-council | pre-commit on every converter/DB/shared-block change (blub 255) |
| /sgs-wp-engine | SGS ground truth for the SGS theme and blocks |
| /verify-loop /handoff /capture-lesson | 2-attestation / session close |

## Tool bindings
| Tool | For |
|------|-----|
| Playwright / chrome-devtools | LANDED computed-style + option-picker interaction on page 8 / a cloned card |
| `python ~/.claude/hooks/wp-blocks.py schema <slug>` + `sgs-db.py sql` | attr/supports/variant_slots ground truth |
| `node plugins/sgs-blocks/scripts/parity/computed-parity.js` | honest parity (Stage 11.6) |
| PowerShell `npm run build` → `build-deploy.py --target sandybrown` | deploy (bump block version on CSS change — STOP-57) |

## Agents to Delegate To
| Agent | When |
|-------|------|
| Explore / general-purpose (read-only, parallel OK) | ledger-mining the ~50-80 stranding attrs; option-picker cloning tracers; capability mis-seed pre-audit re-check |
| solo general-purpose coding subagent (foreground) | agreed fixes — ONE at a time, named files, spawn-no-agents; main-session-verified (STOP-16/39) |

## First action
Complete the READING GATE + pre-flight ritual, then `/sgs-update` (rebuild the DB), then Task 0 root-cause (trace the typed option-picker from draft → clone → live DOM). Verify D-ceiling D283 before any new D. Go in order; each task LANDED + committed before the next.
