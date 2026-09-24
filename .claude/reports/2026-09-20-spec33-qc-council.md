# Spec 33 upgrade: review and QC council record (2026-09-20)

Scope reviewed: the Front F build (plan `plans/archive/2026-09-19-front-f-spec33-upgrade.md`, decision D1120, Spec 33 FR-33-15 to FR-33-17). Every reviewer and rater ran on a different model family from the implementers and was told to attack the work, not confirm it. All were read-only. Evidence scripts are in `pipeline-state/_review-*`, `_qc-a`, `_qc-b`, `_qc-c` (git-ignored).

## Wave review (before the first commit)

| Finding | Severity | Outcome |
|---|---|---|
| Committed Eye Care snapshot had advisory `surface`, `surface-alt`, `text` with no saved base colour; the push deleted them | Critical | Fixed: the push restores any base slug from the framework palette |
| A declared design switched Pass B off; a draft with an accent set and an unreadable README kept the framework teal | Critical | Fixed: Pass B runs first, the declared design lays on top |
| A form review summary was read as the business's contact details (sample applicant email and phone) | Important | Fixed: labels inside forms, dialogs, review summaries and modals are ignored |
| One bad secrets file broke credential lookup for every site | Important | Fixed: per-file try/except |
| The snapshot push could not authenticate to a non-canary site | Important | Fixed: host-matched credentials shared with the business step |
| A failed read of both server layers counted as a fresh site | Important | Fixed: read status distinguishes absent from error; errors abort |
| Accent entries had no base colour and no render confirmation | Important | Fixed: `_baseline_color` on overlays; unconfirmed accents are advisory |
| The `pass_a_found` half of the identity gate had no test | Important | Fixed and mutation-proved |
| Hover settling changed Mama's measured hover values | Important | Fixed: settle-polling only on runtime-class or classless buttons |
| Brace scan ignored quotes; malformed hex from out-of-range rgb | Minor | Fixed |
| Phone link: `tel:` kept spaces (`%20`) | Minor | Fixed in `Sgs_Site_Info_Binding::prefix_url_for_key` |
| 3 of 11 (business) and 1 of 12 (extractor) deliberate breakages uncaught by tests | Important | Fixed: tests added for each |

## QC council (after the first commits)

**Rater A, live site.** Theme parity 0 differences; all 22 palette custom properties equal the snapshot at 1440px and 375px; no element paints the framework's teal or amber; Mama's and Indus test sites unchanged. Found: Playfair Display and Outfit returned 404 (the font folders were never committed; fixed and deployed). Not Spec 33, recorded as open: raw `{{ }}` text (59 distinct) and no header or footer showing the saved details; cloned buttons paint transparent.

**Rater B, static-draft regression.** Snapshot and trace byte-identical before and after for all 9 static drafts that declare `:root` tokens (6 Mama's Munches, 3 Indus); live hover values differ only by the same noise two runs of the old code show. Two Indus mega-menu drafts (no `:root` palette) change on purpose. Converter suite 863 passed. Found: `run_measure` crashed on a Windows console (fixed).

**Rater C, spec and generalisation.** The upgrade worked on the draft it was built from and degraded on a second, differently worded README. Found and fixed: a colour table whose value column was not called `Value` was dropped silently; neutral role wording placed 3 of 10 colours (now 8 to 11 with a measured button); an accent set was discarded when its inner keys differed; the freshness key could not see inline or script changes; rounded radius was unreadable; `primary` was taken from a README word. Found and documented in Spec 33: the FR-33-14 tier boundary, the FR-33-1 carve-out (README hexes are cross-checked only for surface, text and primary).

## Found while fixing (not by a reviewer)

The committed Outfit file was Google's latin-ext subset (byte-identical, md5); Playfair Display was recorded with one weight; the draft's multi-word font link never matched; the weight probe treated Playfair's 400-900 axis as static. All fixed; the live browser now loads Outfit `100 900` and Playfair Display `500 700`.

## Left open on purpose

The pipeline inserting saved values in place of `{{ }}` bindings; the missing homepage sections; transparent cloned buttons; the primary button's hover text keeping the framework value; 11 pre-existing failures in `test_site_info_binding.php`; file-length debt in `measure.js` and `extract.py`.
