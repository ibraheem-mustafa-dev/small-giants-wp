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
| F1 Recognise blocks by measuring them: fingerprint each SGS block (structure, behaviour, the parts it draws) by rendering it on a mirror with intake's browser instrument, fingerprint each draft region the same way, place the best clear match over the whole region it draws, raise a review row with the evidence otherwise | R1, R2 | Waiting on Bean (2026-10-30: "wait on this"); a design doc comes first if Bean asks for one |
| F3 The reader keeps inline markup as ordered runs; phrasing content is never a block child; the text block holds the rebuilt inline HTML (links through the draft-link resolver; no inline style) | R3 | Approved 2026-10-30, track `fix/lists` |
| F4 Every repeater item field declares its role from its block's render.php, with a detector gate; Fill reads every draft marker form into markerType and numberFormat | R4 | Approved 2026-10-30, track `fix/item-roles`; DB reseed from clean main after the merge |
| F5 A part the page map gives to an inserted block or plugin is that block, never rebuilt from the draft's code (Bean: "skip trying to clone the code when we have inserted the part"); no form root without a real field; folded account routes recorded and signed-in views in the account region; the shop count read anywhere on the shop surface | R5 | Approved 2026-10-30, track `fix/commerce` |
| F6 Claude Design tags each pattern with its SGS block, checked by `handoff-check.mjs` | R1 (future exports only) | Parked (Bean 2026-10-30: natural names as guidance may serve better than relying on tags; a detour not needed now) |

Rejected: widening each rule to the missed shapes (it fixes symptoms; each new draft variant misses again).

## Fixed on main the same day (separate causes)

- `bd048f7bf`: a palette value every token of which is named for a registry brand never competes for a slot (Indus's `--social-linkedin` had taken `section`); the route's read-only DB opener waits 10 s for a lock.
- `4c5479726`: a WooCommerce page surface reads its commerce role from its template manifest entry (`manifestEntryOf` took the page entry first), so the cart and checkout regions are placed.
- `c4b90b047`: a skeleton mark on a repeated element is saved for every copy under its own words (Indus's terms headings had split into one heading and six containers).
- `e382b3c9f`: the product card's title motion part declares `text: true` (the full deploy gate failed on it).
