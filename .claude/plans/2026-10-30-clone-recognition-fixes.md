# Cloning: fix the roots behind the third re-clone's skeleton faults

**Why (Bean, 2026-10-30):** making the low-confidence picks for the third re-clone (prompt `.claude/prompts/Cloning Third Re-clone Prompt.md`, step 1) surfaced more than ten skeleton faults across the three clients: lists became containers, FAQs were not accordions, tabs and breadcrumbs had no block, the reviews and slider summaries were cloned outside their blocks, paragraphs with bold words split, numbered lists lost their numbers, and commerce sub-surfaces were cloned as imitation forms. Bean: find the root problem first and fix that, universally, so every variation of the same problem is solved. The re-clone (prompt steps 2 to 8) waits on these fixes.

**How:** each track proves its causes with a detector sweep over all three clients' saved inventories, fixes in its own worktree on `B:/sgs-wt/`, and proves each fix with a MUST FAIL test plus look-alike negative controls; the main session checks each diff and merges to `main`. After the merges: one full intake of each client, the new low-confidence picks, Bean's review batch, then the re-clone.

## Root problems (evidence: track sweeps, 2026-10-30)

- **R1. Block choice is pattern matching.** One hand-written shape or code-syntax rule per block: no rule for tabs or breadcrumbs (Indus's trail is `sgs/breadcrumbs` only by Bean's 2026-10-19 mark); the accordion rule needs one code style and a holder holding nothing but its items; the list unit takes only links or empty-dot marker rows with no words of their own; the generic recogniser covers floating and sticky blocks only, by class words. The FR-48-80 mechanism recognisers set behaviour settings in Fill and never choose a block.
- **R2. Placement is exact-element.** A block lands on the element its rule matched (`skeleton-loop-blocks.mjs::loopBlocks` uses the loop holder), so the parts it draws itself (the reviews score, stars, buttons, arrows; the slider's arrows) are cloned again outside it. The DB already lists each block's parts (`motion_targets`, 77 of 97 blocks).
- **R3. The draft reader loses inline structure.** The inventory records no inline markup and drops a templated inline child's words from its parent; `skeleton-model.mjs::blockKids` counts inline phrasing elements as block children (Mama's 19 hits, Indus 30).
- **R4. Block data is incomplete.** 122 of 153 repeater item fields (20 blocks) declare no `role` in block.json, so `array_item_schema` cannot tell Fill which draft content goes in which field; `fill-list-marker.mjs::markerSlots` pairs only svg markers, so a numbered or bulleted list is written as unmarked.
- **R5. The skeleton ignores the page map's ownership verdicts.** It builds each surface from its handoff record alone, so parts the page map already gives to WooCommerce, a block or another page are cloned as their own blocks: 14 commerce sub-surfaces, 6 form surfaces without fields (Mama's hollow flow post 159), and both account areas as static blocks; the shop count is read only from the filter region.

## Fixes

| Fix | Roots | Status |
|---|---|---|
| F1 Recognise blocks by measuring them: fingerprint each SGS block (structure, behaviour, the parts it draws) by rendering it on a mirror with intake's browser instrument, fingerprint each draft region the same way, place the best clear match over the whole region it draws, raise a review row with the evidence otherwise | R1, R2 | Redesigned with Bean 2026-10-30 as identification by elimination (section F1 below); starts once F3, F4 and F5 merge |
| F3 The reader keeps inline markup as ordered runs; phrasing content is never a block child; the text block holds the rebuilt inline HTML (links through the draft-link resolver; no inline style) | R3 | Approved 2026-10-30, track `fix/lists` |
| F4 Every repeater item field declares its role from its block's render.php, with a detector gate; Fill reads every draft marker form into markerType and numberFormat | R4 | Approved 2026-10-30, track `fix/item-roles`; DB reseed from clean main after the merge |
| F5 A part the page map gives to an inserted block or plugin is that block, never rebuilt from the draft's code (Bean: "skip trying to clone the code when we have inserted the part"); no form root without a real field; folded account routes recorded and signed-in views in the account region; the shop count read anywhere on the shop surface | R5 | Approved 2026-10-30, track `fix/commerce` |
| F6 Claude Design tags each pattern with its SGS block, checked by `handoff-check.mjs` | R1 (future exports only) | Parked (Bean 2026-10-30: natural names as guidance may serve better than relying on tags; a detour not needed now) |

Rejected: widening each rule to the missed shapes (it fixes symptoms; each new draft variant misses again). Rejected for F1 (Bean 2026-10-30): whole-block fingerprint matching, and a hand-maintained capability catalogue or design document.

## F1: identify blocks by elimination (Bean approved 2026-10-30)

**Model.** No single fact names a block: each fact rules blocks out, and the facts are gathered until one candidate is left. What a block can hold is a query over the tables the framework DB already has (`block_attributes` roles, `array_item_schema` roles after F4, `block_composition` followed through every block it can hold, the `supports.sgs` extensions it opts into). The DB gains only the identification facts it lacks, seeded like `block_attributes`: the tags and ARIA roles a block renders; how its open state behaves (exactly one open, none or one, any); whether a timer or control moves a track; the platform it belongs to (the brand registry and the `sgs/<brand>-reviews` blocks); where it may sit (header, footer, drawer, form, commerce page). The draft's facts are the ones intake already records per element (tags, ARIA, structure, handlers, words, links, image labels, boxes).

**Rules.** Only a proven absence rules a block out: an unknown never does. A platform's name in the words, a link to the platform or an image labelled with it separates the members of one look-alike family (the testimonial, Google and Trustpilot sliders); it never rules out a block outside that family. Zero or several survivors become a review row naming what ruled out what, never a guess. Order of authority: Bean's marks and client decisions, then the structural standing rules (header and footer slots, form link, commerce region), then the matcher, then the generic DB scoring.

**Phases.**

| Phase | Step | Who | Runs with | Time |
|---|---|---|---|---|
| A Data | A0 The new columns' schema and the render-read file contract | main session | first, alone | 15 min |
| | A1 Seeder: the facts read from code (platform, context, open-state settings, timers in the view script), following shared extensions, helpers and allowed blocks | agent, worktree `fix/id-seed` | A2, B1 | 30 min |
| | A2 Render read: each block's existing calibration fixture page on a mirror, read for rendered tags and ARIA, and probed (click each control, count the open panels; watch a track move); written to a data file the seeder imports (the seeder stays the DB's only writer) | agent, worktree `fix/id-render` | A1, B1 | 45 min |
| | A3 Cross-check: a cold agent checks 20 blocks' facts (every look-alike family included) against their code and render, without seeing A1 or A2's reasoning | agent | after A1, A2 | 15 min |
| B Matcher | B1 The elimination matcher in the skeleton writer, against the A0 schema, with the authority order above | agent, worktree `fix/id-match` | A1, A2 | 45 min |
| C Proof | C1 Regression: every block Bean marked or accepted across the three clients keeps its block; every change is explained before the merge | agent, then main session | after A and B merge | 20 min |
| | C2 Look-alikes: filter chips, card grids, button rows, account side tabs, frame-card link rows stay as they are | same | with C1 | with C1 |
| | C3 Hold-out: the facts tuned on two drafts are run unchanged on the third, in all three rotations | same | with C1 | with C1 |
| | C4 Full intake of the three clients (one browser run at a time, about 2 hours), the new picks, Bean's review batch | main session | after C1 to C3 | 2 h machine |

Prerequisites: F3, F4 and F5 merged (F4's item roles feed what a block can hold; F3 and F5 share skeleton files with B1).

**QC.** Before each merge the main session runs `/qc-inline` on the track: the whole diff read; the track's MUST FAIL tests shown failing on the old code; its negative controls; its detector over the three clients' saved inventories with before and after counts; the route suite run alone (`node --test "scripts/computed-route/tests/*.test.mjs"`, main's 5 baseline failures only); `python scripts/check-no-client-names.py --check`. After each phase a gate: A, every block has a fact or an explicit unknown for each column, A3 finds no wrong fact, and every rendered fact agrees with the code fact or is flagged; B, a tie or no survivor always becomes a review row (a test plants both); C, C1 shows no unexplained change, C2 no change, C3 the same result on the held-out draft. The session's work ends with `/qc-council` before `/handoff`.

**Checked every time.** Accuracy on both sides (each fact cites its code symbol, DB row or render; each draft fact its element and width); no false elimination (a block ruled out only by a proven absence, with shared extensions, helpers and allowed blocks read); no hard-coded block list (FP-1); universal (any client, any draft); blast radius (rows changed per surface, each explained); intake time not worse.

**Settled before the build (cold-review pass, 2026-10-30).**

- *A0's output.* One long table, `block_identity_facts( block_slug, fact, value, state, source, evidence )`: `state` is `yes`, `no` or `unknown`; `source` is `code` or `render`; `evidence` cites the code symbol or the rendered selector and width. Defined in `plugins/sgs-blocks/scripts/dbschema/schema.sql`, written only by `sgs-update-v2.py`. The render read writes `scripts/computed-route/data/block-render-facts.json`, keyed block, variant, fixture, width, with each fact's evidence; the seeder imports it.
- *Proven absence.* A fact is `no` only when the code read (the block, every `supports.sgs` extension it opts into, its shared helpers and components, every block it can hold, its variants and styles) finds it nowhere AND the render read finds it in no variant, state or width. Anything less is `unknown`. A code `no` beside a render `yes` is flagged and counted at gate A.
- *Fixtures needing state.* The render read uses calibration's existing fixture pages (`scripts/computed-route/calibration-targets.json`, `calibration-fixtures.json`) and their refs, products and carts (`lib/calibration-refs.mjs`, `lib/shop-fixtures.mjs`). A block whose fixture or ref is missing gets `unknown` render facts, listed at gate A, never skipped silently.
- *Where the matcher sits.* A pruning stage over each element's candidate set in `lib/skeleton-classify.mjs::makeClassifier`, before the candidates are finished: it removes a candidate only on a proven `no`. It never touches Bean's marks or client decisions, nor the structural rules (header and footer slots, form link, commerce region). When it proves a standing rule's block wrong for the element, the row becomes low confidence with the evidence (a review row), never a silent swap.
- *Survivors.* One survivor keeps the DB scoring's confidence. Several survivors are ranked by the existing DB scoring; a review row only when the scoring cannot separate the top two (the existing low-confidence margin). None left is a review row naming what ruled out each candidate.
- *Look-alike families.* Derived, never listed: blocks whose facts agree everywhere except the platform facts form a family, so the platform evidence decides between them.
- *Region.* The matcher reads the element with its subtree. A block's own parts (`motion_targets`) found in the draft beside it widen its placement to the smallest element holding them, and those parts are absorbed (R2).
- *Widths.* Draft facts are read at 375, 768 and 1440; a draft fact counts at a width where the element renders.
- *Cost.* Each element's facts are computed once per intake; the intake's run time may grow at most 10 per cent (gate C).
- *Ground truth for C1.* `sites/<client>/build/skeleton/decisions.json` (Bean's saved marks and accepted picks) and the dated marks in `build/intake/intake.json` `review`.
- *A3's sample.* Every derived look-alike family, then a spread of the rest up to 20 blocks.
- *Order.* B1 is built against A0's schema with planted rows while A1 and A2 run; it joins their real data once A merges.
- *Baseline.* The route suite is run on `main` at the start of F1 and its failing test names recorded in this plan; a track may add no failure to that list.
- *C4 done.* Each client's `review.md` marked by Bean and `intake.mjs --apply-review <client>` exiting 0.

**Docs, in the same commit as the code they describe.** Spec 48 §3.4 (the skeleton writer's recognition), FR-48-6 and FR-48-80 status lines, the module table; `scripts/computed-route/README.md` for each new module; `.claude/dev-setup.md` for the new DB columns; `plugins/sgs-blocks/scripts/dbschema/schema.sql`; `scripts/computed-route/data/clone-coverage.json` for each ARIA role now read; the catalogues regenerated; this plan's status. `LEDGER.md` at `/handoff`.

## Fixed on main the same day (separate causes)

- `bd048f7bf`: a palette value every token of which is named for a registry brand never competes for a slot (Indus's `--social-linkedin` had taken `section`); the route's read-only DB opener waits 10 s for a lock.
- `4c5479726`: a WooCommerce page surface reads its commerce role from its template manifest entry (`manifestEntryOf` took the page entry first), so the cart and checkout regions are placed.
- `c4b90b047`: a skeleton mark on a repeated element is saved for every copy under its own words (Indus's terms headings had split into one heading and six containers).
- `e382b3c9f`: the product card's title motion part declares `text: true` (the full deploy gate failed on it).
