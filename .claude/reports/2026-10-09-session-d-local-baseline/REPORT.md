# Session D, 9 October 2026: the local test run, what it found, and how sure we are

**Who this is for:** Bean. Plain English first; the technical name follows in brackets where it helps.

---

## 1. The short version (read this if nothing else)

- **The test reports are not trustworthy row by row.** An independent audit of 30 random open rows found **about 57% are false positives** (somewhere between 39% and 73%). Your footer "icon gap" was one of them. Every fix below was checked against the live page or the code before being called real.
- **I got one conclusion wrong, and the council caught it.** I said the header's problem was padding on the wrong layer. A live read showed the header is identical on both sides; the tool had compared two different elements. Corrected below.
- **One of my own shipped fixes is too generous** (the shared "paints nothing" rule). It can hide a real difference. It is the first job for the next session.
- **The tool got much better today on some pages, worse on two.** Mega menus improved sharply (mega-lenses: 111 open issues to 29). Home and product got worse during their runs; the cause is proven for home, not yet for product.
- **Overall:** 1,817 open issues this morning, 1,613 now, across all 17 pages and panels.

---

## 2. Why the reports were full of false positives (the six patterns)

Each pattern below was proven on a real example, not inferred.

| # | Pattern | Plain English | Real example (proof) |
|---|---|---|---|
| 1 | **Measured, but paints nothing** | A setting's value differs but nothing on screen changes | Your footer address: a 7px flex gap on a link with **one** child. There is no icon on either site, so the gap separates nothing (live read: one `<a>`, one span, zero svg/img). The report's words "between the text and the icon" were made up from a raw gap value. |
| 2 | **Two different elements compared** | The tool paired the wrong things | Shop compared the word "SHAPE" with "SHOP"; the header compared the draft's inner row with the live outer header (live read, rater A). |
| 3 | **The value came from a child but was blamed on the parent** | The row names block X but measured an element inside it | Footer links: the underline is on the `<a>` inside; the row named the paragraph around it (live read + code read). |
| 4 | **One element reported several times** | Every block around an element re-reported its text styles | A mega-menu heading appeared 5 times under 5 enclosing blocks (walker data). |
| 5 | **Knock-on shifts counted as their own problem** | Something above moved, so everything below "moved" | The footer wordmark's "39px shift" is 34px inherited, only 4px its own. |
| 6 | **The draft side was never read** | Comparing against nothing | 45 rows where the draft value was blank. |

**What was done about it:** patterns 1, 4 and 6 are now caught automatically (labels and walker rules, all tested). Pattern 2 is now labelled "mispaired" in triage, but Solve still writes through it (next session). Pattern 3 has a prepared fix (next session). Pattern 5 is partly handled (nested pairs no longer count each other).

---

## 3. What happened, in order

1. **Re-read every label** the tool gives a difference, on all 17 pages, and had an independent agent re-check every "missing feature" label against the code. Of 217, only **105** held up.
2. **Fixed six labelling mistakes** in the tool, each with a test that failed first: blank draft values, one element counted many times, rows that follow your ledger decisions, guesses by setting name, and two-different-elements comparisons. *(commits ac78fee32, d5f7e4c4a)*
3. **Built the two framework gaps that were real:** a padding and transition control for mega-menu tiles, and the chip-spacing control you chose for the shop filters (checked first: WooCommerce has no such setting). *(a5977f7a7, 8e0e32a01, 371d8a27a, a56437129)*
4. **Your decisions applied:** the engine fixes you approved; 216 contact-page rows were already your decision (44px tap area) but only recorded for one page state, now all states; Google Reviews follows Google's look (8 ledger entries); S9 stays as it is, because the ledger cannot target one element inside a block.
5. **Set up the local route:** refreshed the local copy of the site from the test site (369 of 369 files), and taught Solve to run against it. A whole page now measures in about 40 seconds instead of minutes; About measured identically on both. *(e1f814775)*
6. **Recalibrated 14 blocks** on the local copy (about 35 seconds each). The link-underline and accordion settings are now visible to the tool.
7. **Ran the full 3-round baseline** on all 17 pages and panels locally, then triage and the sweep.
8. **Ran the QC council** (three independent checkers: live pages, code, random-row audit).

---

## 4. Every page and panel, one line each

"Closed" = differences Solve fixed in this run. "New" = differences that appeared during it. "Wrong" = settings Solve wrote that the guard had to undo (the target is 10% or fewer).

| Page / panel | Open before → after | Closed | New | Wrong settings | Verdict |
|---|---|---|---|---|---|
| mega-lenses | 111 → 29 | 82 | 0 | 1 of 22 | Best result. Near the finish line. |
| mega-help | 43 → 12 | 31 | 0 | 0 of 18 | Good. |
| mega-sunglasses | 43 → 26 | 17 | 0 | 0 of 11 | Good. |
| mobile menu | 94 → 84 | 11 | 1 | 0 of 14 | Good writes, little left to write. |
| size guide | 69 → 54 | 15 | 0 | 0 of 13 | Good. |
| help | 180 → 142 | 47 | 9 | 4 of 24 (17%) | Good progress; ran alone (failed in parallel). |
| footer | 77 → 76 | 1 | 0 | 0 of 4 | Underline rows show the "wrong element named" fault (proven). |
| about | 1 → 1 | 0 | 0 | 0 of 1 | One button timing row; the framework may be the cause (to check). |
| lenses | 3 → 3 | 0 | 0 | 0 | Nothing to write. |
| lens configurator | 52 → 52 | 0 | 0 | 0 | Its "missing features" were the same spacing on a different layer (assessed, not real). |
| contact | 26 → 26 | 0 | 0 | 0 | Down from 44 yesterday thanks to labelling and ledger fixes. |
| contact form | 82 → 81 | 1 | 0 | 2 of 4 | Known: the dropdown is a different height from the inputs; needs your call (in the plan). |
| mega-brands | 139 → 115 | 27 | 3 | 6 of 19 (32%) | 5 of the 6 wrong settings came from comparing two different elements. |
| header | 49 → 50 | 0 | 1 | 3 of 3 | All wrong. **Cause: two different elements compared** (not padding on the wrong layer, as I first said). |
| home | 199 → 208 | 28 | **37** | 3 of 24 | **Got worse.** Proven cause below. |
| product | 317 → 350 | 54 | **87** | 5 of 39 | **Got worse.** Cause **not yet proven**. |
| shop | 311 → 309 | 2 | 0 | 8 of 11 | **Do not trust.** First attempt crashed mid-run and the retry started from its half-finished state. Needs a clean re-run. |

---

## 5. The findings, each with its proof

Proof levels: **Live** = read from the rendered page. **Code** = read from the source. **Measured** = reproduced in a run. **Report-only** = a report row, not checked.

| Finding | Proof | What it means |
|---|---|---|
| Home got worse because Solve doubled card padding | **Live + measured.** Solve wrote 22px left and right padding on three cards whose inner box already had the same 22px; 2 × 22 = 44px, exactly how much their contents narrowed (291px to 247px). A fourth card (-43) is correct. | Solve needs to notice when a level below already carries the padding. |
| The guard repeats itself instead of finishing | **Code + measured.** When it runs out of suspects it throws away its memory of who it tried, then starts again (home rounds 5 to 13 repeat exactly). | It ran out of rounds before undoing home's doubled padding. Fixable in one place. |
| Solve writes through two-different-elements comparisons | **Code + live.** Triage spots them; Solve's write step does not check. mega-brands' "Ray-Ban" label was compared with the whole "Ray-Ban, 48 frames" card. | Copy the triage check into Solve. |
| Underlines are blamed on the paragraph, not the link | **Code + live.** The walker reads the underline from the link but labels the row with the paragraph's path, so Solve changes a setting that cannot reach the link. | Fix and test prepared (`walker-decoration.test.mjs.pending` in this folder). |
| The header problem is two different elements compared | **Live** (rater A). Draft and live header are built the same way (no padding on the outer header, 12px/16px on the row inside, same 1px border). | My first diagnosis (padding on the wrong layer) was wrong. |
| Product got worse | **Report-only for the cause.** A nested section repeats the page padding (live read), but that padding was already in the tree; today's writes were text styles only. | Cause unknown. Do not fix until proven. |
| Solve crashes instead of reporting a failed page build | **Code + measured** (help, about, lens, contact in parallel). | Small fix; also: run local pages one at a time (parallel editor builds time out). |
| Parent settings that reach several identical children are never written | **Code + measured** (mega-lenses tile padding, 40 rows; accordion headers). | Spec 47 §3.8 (the ancestor-hop rule, justified by R-47-5). **Your decision:** allow it when every child wants the same value? Risk: if only one child is measured, the others move too. |
| Mega-group "child sizing" still not discovered by calibration | **Measured** (a clean solo run still finds nothing). | The old "two runs collided" theory is disproved; cause still open. |

---

## 6. Problems the council found in my own fixes (shipped today)

| Fix | Problem | Severity | Next step |
|---|---|---|---|
| Shared "paints nothing" rule (ba31e5157) | Accepts gap, display, alignment and text-align differences whenever the element's own box matches, even if things inside it moved | **High**: can hide a real difference | Require everything inside to be settled too (the padding rule already does this) |
| Ledger "placed after" attribution (ac78fee32) | Never checks the size of the shift, so a separate real shift after an accepted element can hide | Medium | Compare the shift amounts |
| Open-state fallback (65c464f4b) | If live adds an open-only style that the draft does not have, the tool looks for the wrong setting | Medium, unproven | Add a case test |
| Padding rule (d5f7e4c4a) | Ignores unpaired icons and images moving inside | Medium | Include unpaired children |
| Nested position fix (e0660afa0) | A container's shift can now show up once per child | Low | Count once |
| Local switch (e1f814775) | A stray setting in the environment would retarget every walk | Low | Only read it when `--site` is passed |

Also fixed during the session: a test whose premise my own framework fix made untrue (fce3a46d6), two gate failures my commits caused on a peer's deploy (a56437129, 8e0e32a01), and a full database rebuild leaving one hero setting wrong (re-asserted; the plan says to do this after every rebuild).

---

## 7. What to do next, in order

1. **Fix the over-generous "paints nothing" rule** (high; my own).
2. **Stop Solve writing through two-different-elements comparisons** (header, mega-brands).
3. **Give the guard a memory** so it stops repeating trials.
4. **Apply the prepared underline fix.**
5. **Clean re-run of shop**, then prove product's cause before touching it.
6. **Your decision on Spec 47 §3.8** (parent settings reaching several identical children).
7. Then re-run the baseline locally and re-audit a random sample, so the false-positive rate is measured again, not assumed.

**The tree files** (the saved page designs Solve edits) were put back to their committed state at the end of the session: today's writes only ever reached the local copy, and some were proven wrong (home, shop). Everything measured is kept in the reports.

---

## 8. Where the evidence lives

- This folder: `A.md` (live checks), `B.md` (code checks), `C.md` (random-row audit), `baseline-table.json`.
- Solve runs: `sites/eye-care-ward-end/build/qa/solve/<page>/2026-10-09T*/`.
- Labels: `sites/eye-care-ward-end/build/qa/triage/*.json`; sweep: `sites/eye-care-ward-end/build/qa/sweep/2026-10-09/sweep.json`.
- Plan: `.claude/plans/2026-10-04-spec47-full-coverage.md` ("Session D, 2026-10-09").
