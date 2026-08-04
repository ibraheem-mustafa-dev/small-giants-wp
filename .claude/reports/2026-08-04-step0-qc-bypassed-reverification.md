# Step 0 — clearing the QC-BYPASSED flag: independent re-verification

**Date:** 2026-08-04 · **Track:** 1b / Spec 35 · **Method:** each figure re-measured by a route that
does NOT reuse the original one.

## Why this ran

The 2026-08-04 enforcement session closed with a **QC-BYPASSED** banner: the independent QC subagent
was dispatched but never returned, so the author self-verified six load-bearing figures. Self-review
is the exact thing the QC gate exists to prevent, so the LEDGER instructed the next session to re-run
the check before building on those numbers.

## Result — 4 of 6 clean, 2 measured against the wrong population

| # | Figure | Claimed | Independently measured | Verdict |
|---|---|---|---|---|
| 1 | D-ceiling | 484 | 484 | ✅ **CONFIRMED** — heading-anchored `grep -oE '^## D[0-9]+'` |
| 2 | Checklist rows self-tagged UNENFORCED | 11 | 11 | ✅ **CONFIRMED** — 11 occurrences in `spec-35-inspector-DONE-checklist.md` (lines 25, 30, 40, 43, 53, 57, 61, 64, 68, 77, 86) |
| 3 | Colour attrs with NULL role | 21 | **19** scoped · 21 unscoped | ⚠ **UNSCOPED** |
| 4 | Role-only rows (role set, canonical_slot NULL) | 1099 | **955** scoped · 1099 unscoped | ⚠ **UNSCOPED** |
| 5 | `placeholder` rows reclassified to content | 13 | 13 | ✅ **CONFIRMED** |
| 6 | Role descriptions populated | 29 | 29 | ✅ **CONFIRMED** — `roles.json` has 33 top-level keys, 4 are `__`-prefixed metadata |

## The finding: not fabricated, but counted over the wrong denominator

Figures 3 and 4 **reproduce to the digit** — but only when computed across the ENTIRE
`block_attributes` table (2,970 rows), which includes **506 rows describing `core/*` WordPress
blocks** the framework replaces. Those are not SGS blocks.

```
all rows 2970  ·  sgs/% rows 2464  ·  core/* rows 506
colour-NULL-role:  21 unscoped  →  19 scoped   (the 2 extras are core/social-links
                                                iconColorValue + iconBackgroundColorValue)
role-only:       1099 unscoped  →  955 scoped   (144 rows / 13% inflation)
```

This violates the project's own standing constraint — *"scope every DB stat to `sgs/%`"* — and both
figures **overstate the remaining problem**. Restate as **19** and **955**.

**Severity: LOW-MED.** Nothing was invented; the arithmetic is right and the direction of the D481
improvement (131 → 21 colour attrs healed) still holds. But a figure quoted as evidence of SGS
framework health should not include 506 rows of a different framework's blocks. This is the
"establish the denominator before quoting a number" lesson recurring in a new place.

## One result that is cleaner than the count suggests

Figure 5 deserves a note. There are **22** `placeholder` rows in total: 13 now `role='content'`, 9
still `role='behaviour'`. A bare count invites the reading "13 fixed, 9 missed". Checking *which*
rows shows the opposite — **all 13 reclassified rows are `sgs/*`, and all 9 remaining are `core/*`**:

```
role=content   (13): sgs/filter-search, sgs/form-field-{address,consent,date,email,file,number,
                     phone,select,text,textarea,tiles}, sgs/product-search
role=behaviour  (9): core/{button,details,form-input,heading,list,list-item,paragraph,
                     post-title,search}
```

Core blocks are not SGS's to reclassify, so the split is exactly right. **A value-identity check
saw what a population count could not** — the same principle that makes the NULL-count check
insufficient for Task A.

## Verdict on the bypassed gate

**The QC-BYPASSED flag was worth honouring, and the work behind it was sound.** No figure was
fabricated and no conclusion collapses. Two figures need restating to a scoped denominator. That is
a materially different — and much less serious — failure than the one the flag warned about.

## Actions

1. Restate figures 3 and 4 as **19** and **955** wherever they appear (LEDGER, decisions.md D481).
2. Candidate end condition for Task F: *any DB statistic quoted as evidence of framework health must
   declare its denominator and be scoped to `sgs/%`.* Cheap to enforce — a reviewer-facing rule
   rather than a script, since it governs prose, not code.
