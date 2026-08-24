---
doc_type: report
title: Migration method — the evidence behind the thesis
date: 2026-08-24
source: split out of .claude/THE-MIGRATION-METHOD.md
---

# Why the method claims what it claims

Moved out of the method itself: a cold agent mid-task is not adjudicating the
thesis, and the method labelled these 60 lines skippable while citing them twice.
The argument is kept in full here because it is auditable and was expensive to get
right — four figures in it were wrong before they were right.

## What the evidence actually supports

| Work | What the change WAS | Target shape existed | Corrections |
|---|---|---|---|
| `migrate-length-sanitiser.py` | identifier rename, 204 sites, zero behaviour change | **19 days** (`5db768726`, 2026-08-02) | 1 landing, 0 |
| `migrate-render-closures.py` | closure -> shared helper, bodies byte-identical | **40 days** (`cef1fca99`, 2026-07-12) | 1 landing + 1 prerequisite |
| Colour panel rollout | a NEW component, its mount, its tab and its placement rule — **all undecided at start** | did not exist | many |

⛔ **Both fast migrations renamed onto a target that had been in production for weeks. Zero
corrections is what that predicts. The census is not what made them cheap — a settled target
shape is.** That is why Step 3 exists.

## The claim that does NOT survive, and the better one that does

❌ *"A census-driven pass lands once."* Falsified by this repo's own most recent census:
`5770ecb40` -> `74060ffd8` (*"derived_selector is not a selector — re-ground the census"*) ->
`daf9e6935` (*"the census promised 75% and the fixer could deliver 14%"*). One census, three
commits, an error of 5x.

✅ **A census relocates the corrections from the TREE into the DETECTOR.** Those three
commits corrected a *script*, once each, over a census of 255 colour rows — and the
third of them is why the honest number is **29**, not 255: `daf9e6935` records
`AUTOFIXABLE 161 (75%) -> 29 (14%)`. The same corrections made block-by-block would
have cost one commit **per block**.

⚠ **That 255 was this document's FIFTH unsound figure, and it sat four lines below
the sentence quoting "the fixer could deliver 14%".** Caught by a round-3 reviewer,
not by me. The census size is not the delivery. That is the whole argument,
and the evidence supports it.

## The slow track was never a counter-example

**The 33-block colour wave was census-driven on DAY 2.** `f6f3c0331` (2026-08-15) built
its worklist *"from the DB's `role='color'` census this session"*, landed 33 blocks in one
commit, and caught two errors in the hand-derived list it replaced. That is Step 2 of this
document, executed correctly, on day 2.

**What cost the fortnight was that the target shape was still being decided while the
rollout ran.** The five corrections, and what settled each:

| | The decision | How it was settled |
|---|---|---|
| D609 | ONE colour control everywhere, states inside it | amended the SAME DAY, after Bean rejected a build on sight |
| D618 | must NOT mount into native's `group="color"` | Bean looking at a live editor page |
| D621 | the panel belongs in the STYLES tab | overturned D618 |
| D622 | placement follows the D533/D537 resolver | a census (`placement-reach.py`, 2,262 attrs) |
| D632 | colour split from `ShadowControl`, 11 blocks | a survey — run AFTER the shape was decided |

Every one of those is a **global shape decision, not a per-block judgement** — Bean's
correction on that point was right and the decision log confirms it. But *not-per-block* does
not mean *census-derivable*. **A census answers how many, where, and which are exempt. It
cannot answer what shape is right.** Three of the five (D609, D618, D621) were settled only
by Bean looking at something rendered — and the two a census DID settle came after the shape
was already decided.

That gap is what Step 3 closes, and it is the difference between this method and the version
that was reviewed twelve times and still would not have prevented the fortnight.
