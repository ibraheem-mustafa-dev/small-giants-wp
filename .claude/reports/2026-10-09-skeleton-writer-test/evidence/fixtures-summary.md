# Answer sheet: summary (frozen 2026-10-09)

File: `fixtures.json` (same folder). 100 rows, every one found in the data files (nothing invented). The repo was only read.

## Counts

| Label | Rows | Proven | Assumed |
|---|---|---|---|
| false-alarm | 47 | 36 | 11 |
| wrong-write | 29 | 9 | 20 |
| real-problem (must stay open) | 24 | 22 | 2 |

"Proven" means a live read (A.md), the 30-row audit (C.md) or code read (B.md) establishes it. "Assumed" means only the council tables or the tool's own triage label support it, or the cause is unproven (all 20 assumed wrong-writes are rows where the guard's revert is proven but the cause of the original row is not, so the cause field says so).

Per surface: home 19, footer 17, mega-lenses 13, shop 13, product 13, mega-brands 12, header 6, contact-form 6, mega-sunglasses 1.

## Row keys

- False alarms and real problems: `surface|state|width|pair|ref|path|kind|property`, taken from `round-N/report.json` of the named Solve run (`source` field gives the file). Extra fields: `triageKey` and `triageClass` (the label the tool gave it in `triage/<surface>.json`, null if absent), `openInFinalSweep` (present in `sweep/2026-10-09/sweep.json`), `draftTag`/`liveTag`.
- Wrong-writes: `surface|solve-report|<group>` where `<group>` is the exact `writes[].group` / `wrong[].group` string; the `groups` array lists every setting folded into one fixture, `rows` the per-width draft/live values.
- Walker rounds used: footer round-2, home round-13, mega-lenses round-4, shop round-13, product round-final (as C.md). Three exceptions, flagged in each `note`: FA-P1-01 (footer address gap) exists only in the 2026-10-05T09-43-23 footer run; pattern 4 rows come from round-1 of today's mega-lenses (08-40-01) and mega-brands (08-19-54) runs; header and mega-brands pattern 2 rows use round-1 (before the writes changed the live side).

## Per-pattern coverage (false alarms)

| Pattern | Rows | Proven | Notes |
|---|---|---|---|
| 1 paints nothing | 12 | 12 | All 11 C.md "invisible" rows plus the footer address gap. Enough. |
| 2 mispair | 12 | 11 | brand-strip (home), gen-shop-5, header gen-header-1, mega-brands brands-top-first (round-1). One row (mega-sunglasses shop-link-mens) is the tool's label only. |
| 3 child blamed on parent | 3 | 3 | Only one family exists in the data: the footer privacy/terms underline (rows on -29, -30, -31). Fewer than the usual spread, and all three share one live read. |
| 4 once per enclosing block | 8 | 8 | Two groups of five identical rows (mega-lenses SINGLE VISION span; mega-brands MOST ASKED FOR heading), 4 duplicates each in the fixtures; the owner row of the mega-lenses group is RP-ML-01. Round-1 only; all gone by the final round. |
| 5 knock-on shift | 5 | 1 | Only the footer wordmark (35 of 39px inherited) is proven. Three more footer rows carry the identical delta as the footer root (assumed), and one is a scroll-position mismatch (home hero-image, 78 vs 3106). |
| 6 draft side blank | 7 | 1 | Exact C.md row (home hero-image top) is proven. The rest are tool-labelled `unmeasured-side` rows with the draft key absent or null in the walker data. |

Patterns 3, 5 and 6 are thin; the data does not hold more independently verified instances, so none were invented.

## Gaps

1. No fixture for the three negative controls (gap 48 vs 16 in a fixed-width box; unpaired icon moving inside an accepted padding change; ledger `placed-after` hiding a separate real shift). No real row proves any of them, so they would have to be synthetic. Candidates only (not fixtures): rows the walker already auto-accepts as "Layout property on an element whose painted box and content match", e.g. home about-step-1 `gap` 16px vs `0px 16px` and `align-items` baseline vs start (round-13).
2. Real-problem coverage is the 12 C.md REAL rows, the A.md items and council section C. A checker that closes any of them fails.
3. Pattern 4 and the mega-brands pair rows exist only in round-1 reports; the final reports no longer contain them.
4. The "mega-group child sizing not discovered by calibration" item has no difference row (see unlocated).

## Findings worth knowing while using the sheet

- 9 of the 24 real problems are labelled `W/consequence` by triage (knock-on), e.g. shop cards 99px taller, product spec cell, footer social row. A rule that drops `consequence` rows would hide them.
- Two pairs the tool labels `mispaired` are real: product breadcrumb nav (both sides are the same nav; A.md row 5) and mega-brands brands-top-first in the final round (82 vs 266 wide; A.md row 4 "PARTLY").
- The footer underline is both a false alarm (attributed to the paragraph, FA-P3) and a real problem (RP-FT-04). The sheet keeps both; a new mechanism may re-attribute it but must not close it.

## Unlocated or not row-shaped

| Item named in the reports | Reason |
|---|---|
| W10: guard repeats rounds 5-13 on home, so the card padding is never undone | A process fault, not a row. Home `writes[]` are all round 1; evidence is `guard.mjs::guardRound` (B.md claim c) plus the REPORT's measured repeat. |
| Link-terms x position 1623 vs 1019 (C.md, TP2) | Present only as snapshot box values (`pairs.link-terms.draft.box.x` = 1623, live 1019, 1920 round-2), not as a difference row. |
| Mega-group child sizing "still not discovered" | A calibration gap; no row exists. |
| Home "37 new" and product "87 new" rows after the run | Counts only; no individual rows named. Product's cause is unproven. |
| Council FP#17: "45 blank draft rows" | The 45 is a historical count. Today's final reports hold 178 distinct blank-draft style rows (mega-brands 86, footer 36, product 16, home 24, shop 12, mega-lenses 4), so the 45 cannot be matched row for row; seven representative rows are in the sheet. |
| Footer address "8px" (REPORT/A.md) | Data holds 0px vs 7px (A.md also measured 7px). The 8px is not located. |
| Shop gen-shop-10 "31px apart" | Data shows y-after-count 57 vs 85 and height 2889 vs 2762; 31 itself is not located. |
| Council FP#19 mega-lenses `painted-ground` none vs white (UNSURE) | Located (`mega-lenses|mega-lenses|1920|lenses-panel|cr-ref-header-4|...|style|painted-ground`, none vs rgba(255,255,255,1)) but the verdict is undecided until a 1920 screenshot of both open panels, so it is deliberately not in the sheet. |
| Three negative controls (B.md) | Synthetic; see gap 1. |

## Contradictions between reports and data

1. Home card -43: A.md calls it the correct shape and REPORT.md says it is correct, but `baseline-tree-writes.diff` shows the same padding written to it and walker round-2 shows its item (cr-ref-home-44 whybuy-4-number) at 247 vs 291. Kept as WW-HM-04, assumed, not as a clean control. The council flags this as open.
2. C.md says the triage files for home, shop and product point at yesterday's runs. They were regenerated at 12:24-12:26 and now point at today's runs (product round-13, mega-brands round-13, header round-9, not the rounds C.md read).
3. Footer root offset: C.md says 34px (6071 vs 6037); the y-in-main rows in footer round-2 give 35px (5951 vs 5916) at 1920. Wordmark 39px is unchanged, so own offset is 4px by the data, 5px by C.md's figures.
4. C.md quotes the home hero-image row as draft y 591 vs live y 3726; round-13 holds 78 vs 3106 for the same state.
5. C.md rates shop gen-shop-10 REAL (mis-described); triage labels it `mispaired`. The sheet follows C.md.
6. Triage `mispaired` on product gen-product-3 and mega-brands brands-top-first (final) conflicts with A.md rows 5 and 4.
7. REPORT.md tabulates "help" (180 to 142 open rows); `baseline-table.json` records help as `run: none` (triage/sweep point at a 10:53 run). `contact-form` shares a run timestamp (09-50-16) with product and the file records wrong "2/4" while `wrong[]` holds 24 entries (grouped by setting). No fixture depends on this.
8. Council table A has 19 rows and C.md has 17 definite false positives; the two are not the same list (table A merges some rows, adds A.md and walker items, and counts one UNSURE).
9. REPORT.md pattern 3 treats the footer underline as a mis-attribution; A.md and C.md call it a genuine divergence on the link. Both are true (value real, owner wrong).
10. C.md's own pattern list (invisible, mispaired, sub-pixel, upstream offset, meaningless on one side, symptom row) is not REPORT.md's six. The sheet uses REPORT.md numbering: sub-pixel is folded into 1; "top null" into 6; C.md's "symptom row" has no number (kept as real, RP-SH-04).
