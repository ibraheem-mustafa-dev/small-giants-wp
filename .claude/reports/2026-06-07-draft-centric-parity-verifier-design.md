---
doc_type: reference
project: small-giants-wp
thread: cloning-pipeline
title: "Draft-centric transfer-accounting verifier — design (Bean-directed inversion)"
created: 2026-06-07
status: DESIGN — locked, build pending. Replaces the DOM-path-pairing model in clone-parity.js.
---

# Draft-centric transfer-accounting verifier

## Why the current tools all fail the same way
Every existing fidelity instrument over-reports because it measures the **wrong denominator**:
- **pixel-diff** (stage-11): denominator = painted pixels → photos + sub-pixel inflate it (hero 64% but visually faithful).
- **clone-parity.js** (DOM-path pairing): denominator = the draft's element TREE → a genuinely-converted native block has a different tree → scored "MISSING". **It rewards mirroring and penalises conversion** — backwards vs the 7 rules.
- **leftover-buckets** (block-slot census): denominator = the BLOCK's available slots → flags every slot the draft never set as `extraction_failed` (the perfectly-converted trust-bar logged 48 false "failures").

## The inversion (Bean, 2026-06-07)
> "It should recognise the opposite way around. It doesn't even need to know what's available in the block. It just needs to know everything in the draft and set that as the 100% we're aiming to achieve."

**The DRAFT is the 100% denominator.** Enumerate everything the draft actually contains; measure what fraction transferred to the clone. Never enumerate block slots. A block-slot the draft didn't use is not a gap — it doesn't exist in the denominator.

## Model

**1. Build the denominator from the draft (the "100%").** Parse the draft HTML + its applied CSS. The unit of account is the **draft node** (tag + class list) and, per node:
- its **text content** (the words that must appear on the clone)
- its **effective CSS** (the computed declarations that must be reproduced)
- its **media** (img src / svg — must resolve on the clone)

The existing `.parity-golden.json` already captures per-node computed styles from the draft — reuse it as the denominator source (rebuild via `--rebuild-golden`).

**2. Classify each draft node's EXPECTED FATE using the DB (same tables the converter reads).** This is the DB-driven part — the verifier must know what the converter *intends* to do with each class, or it will mis-score conversion as failure:
- `slots` / `slot_synonyms.standalone_block` → does this BEM class become its own block, or a block's attribute?
- `block_composition` (`wraps_block`, `container_kind`, the FR-22-4.1 fold rules) → does this class **fold into a parent** when converted (e.g. `.sgs-trust-bar__inner` folds onto the trust-bar; a transparent wrapper folds onto its container)?
- So each draft node is tagged: **emit-as-block** | **lift-to-attr** | **fold-into-parent** | **chrome (out of denominator — theme part, e.g. header/footer)**.

**3. Check transfer against the clone (live DOM + computed styles), fate-aware.** For each draft node, look for its content/CSS at the RIGHT place given its fate — NOT at the same DOM path:
- **content**: is the draft node's text present in the clone (anywhere in the equivalent block's subtree)?
- **CSS**: is the draft node's effective CSS present on its equivalent — on its own block if emit-as-block, on the **parent** block if fold-into-parent, as a block attribute if lift-to-attr?
- tolerances: `start`==`left`, sub-2px / sub-2% rounding ignored, colour ΔE threshold (not exact string).

**4. Score = transferred ÷ draft-total, with a per-class ledger (Rule 4).** Output, per draft class/tag:
- `TRANSFERRED` (content + CSS landed on the equivalent) /
- `FOLDED` (content+CSS correctly merged into parent) /
- `DROPPED` (in the draft, absent from the clone — a REAL gap, with which property) /
- `CHROME` (excluded from denominator).
Headline = % of the draft's content+CSS that reached the clone. 100% = faithful. This is the first denominator that can't be gamed by mirroring (a mirror scores 100% AND so does a correct conversion — because we measure transfer, not tree-sameness).

## What it reuses / replaces
- **Reuses:** `.parity-golden.json` (draft denominator), Playwright clone capture, the DB lookups from `db_lookup.py` (slots / block_composition / fold rules).
- **Replaces:** clone-parity.js's DOM-path pairing (the `present→MISSING` false-negatives) and supersedes `leftover-buckets`' block-slot census as the fidelity signal. Could also retro-fix `leftover-buckets` to be draft-aware (only fire `extraction_failed` when the DRAFT had a value).

## Build notes
- Language: keep it in the JS clone-parity harness (already does Playwright capture + golden), OR move to Python to reuse `db_lookup.py` directly. Python is the better fit (DB lookups + fold logic live there).
- The fold map is the hard part — it must mirror the converter's `_process_container_children` / `_is_container_mirror_block` fold decisions exactly, or folded classes read as DROPPED. Source the fold rules from the same DB columns the walker uses (no re-implementation of fold heuristics).
- Chrome exclusion: header/footer/skip-link are theme template parts — tag their draft classes as CHROME so they leave the denominator (they're never clone targets).

## Open question for Bean (build path)
This is the foundational fidelity instrument — every future "is the clone good" judgement depends on it. Given that, build it as its own focused pass (fresh session, this design as SoT) rather than inline at the tail of a long session. Smallest first slice: denominator + content-transfer only (no CSS), proven on the trust-bar (should score ~100% content) + a mirrored section (e.g. featured-product) before adding CSS + fold.
