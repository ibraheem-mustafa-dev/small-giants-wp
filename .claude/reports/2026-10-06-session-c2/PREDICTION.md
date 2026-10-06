# Session C2 — the re-sweep prediction, recorded before measuring

**Written 2026-10-06, before any host job.** Its whole value is that it predates the measurement, so a
miss is a finding rather than a narration. Do not edit it after the sweep; record the outcome beside it.

## What is being predicted

The input is raw **F = 192** at block code `7f375f765`, in `sites/eye-care-ward-end/build/qa/triage/*.json`
(17 files, 2026-10-06). Verified by tally, not quoted: F 192, W 1,242, T 378, U 29, per-surface matching
the Session C figures exactly.

Bean's decision (2026-10-06) is to re-sweep **before** the peer session's eye-care-test deploy, at the
documented baseline `94122e326`. So the question is: how far does F fall when the same 17 surfaces are
measured against the deployed code rather than `7f375f765`?

## The prediction

**F falls by at most 15 rows, most likely single digits. F lands in the 177 to 192 band.**

Stated so it can fail: a fall of more than 15 rows means something other than the register fixes moved,
and that cause must be found and named before the new count is used.

### Why, against the brief's expectation

The brief expects a meaningful fall: "Expect it to FALL — rows fixed since `7f375f765` will clear." The
register does not support that.

Eleven register items are both (a) still carrying an open or partly-measured Sweep verdict and (b)
narrating a completion in their Fix cell, with every cited commit an ancestor of `94122e326`:

| Ref | Section | Sweep | Blocks it names that carry F rows |
|---|---|---|---|
| S1 | Site-wide | still open | `sgs/button` 7, `sgs/text` 7 |
| N46 | Footer | still open | `sgs/site-footer-row` 1 |
| S3 | Site-wide | partly measured | none |
| S4, S5, S11 | Site-wide | still open | none |
| 15 | Phone drawer | still open | none |
| 38 | Footer | still open | none |
| 52, N17b | Home | still open | none |
| 68 | Product page | still open | none |

So the eleven touch blocks carrying **15 F rows in total**, and that is an upper bound: naming a block in
a register row is not the same as closing that block's specific property rows.

### Two corrections to the brief's examples

- **Register 87 (breadcrumb weight, `9776e7d86`) cannot clear anything.** Its Sweep verdict is already
  `clean on the walker`, and `sgs/breadcrumbs` is not among the 24 blocks carrying an F row. The brief
  offers it as an example of a row that "STILL READS OPEN in this triage"; it reads clean.
- **Register 15 (drawer column, `31aa51090`) names no F-carrying block either.** It is correctly listed
  as fixed-and-deployed, but it has no F rows to clear.

### Where the 192 actually lives

F is concentrated in blocks nothing in that commit range touched. Top six hold 60%:

`sgs/accordion-item` 40, `sgs/brand-strip` 20, `sgs/business-info` 17, `sgs/social-icons` 17,
`sgs/google-reviews` 14, `sgs/choice-flow` 12, `sgs/choice-flow-question` 12, `sgs/mega-group` 9,
`sgs/text` 7, `sgs/button` 7, `sgs/process-steps` 6, then 13 blocks with 4 or fewer. 24 blocks, 122
distinct block-and-property families.

## Fixed but NOT deployed — must not be judged as gaps

| Ref | Not-deployed commits | Consequence |
|---|---|---|
| 75, 82, 158 | `b68db67c9`, `06b22220f` | The `sgs/product-card` gallery-strip opt-in is committed but not deployed at `94122e326`. Its rows will not clear on this sweep and must not be judged as framework gaps |

The register separately flags `be4ca112b` (an eighth tick site) as committed but not deployed.

## Deductions before register matching

| Deduction | Rows | Basis |
|---|---|---|
| `sgs/google-reviews` | 14 | Out of scope — the parallel Google reviews track owns them; its colours and 40px sizes are an accepted difference (Bean, 2026-10-05) |
| transition-family | 14 | `lib/calibrate-markers.mjs::markersFor` has no `transition,*` branch and falls through to `return []`, so no such row calibrates anywhere (Spec 47 §5 Residual). Register S1 also already decided transition behaviour |
| **overlap** | **6** | `sgs/google-reviews` transition-duration rows are in both sets |
| **union deducted** | **22** | |

**192 − 22 = 170 rows** enter register matching. Match target: the **90** register items whose Sweep
verdict is `still open` (75) or `partly measured` (15).

## Scope limit on the number itself

`F = 192` is not every visual difference. `lib/issue-classes.mjs::VISUAL` counts only `style`, `hover`,
`box`, `text` and `presence`, and says so in the source: *"A row of any other kind is reported, never
counted here (motion, structure, inventory, scroll, drive and L2's tag, active, lines and entrance
rows)."* Confirmed: zero `motion` and zero `scroll` rows reach triage on any of the 17 surfaces, while
`about`'s solve report carries a `motion` row under `classes.other`.

That exclusion is by design and is not a finding. It is separate from §5's unexplained defect that
`scroll` rows fell 24 to 0 on product and 2 to 0 on shop, which the route owns.

## Checks that must accompany the sweep

- **The canvas-roster negative control, not the sweep-to-triage identity.** The identity cannot fail:
  `lib/sweep.mjs` and `lib/triage.mjs` both import `isIssue`, `isContentRow` and `issueKey` from
  `lib/issue-classes.mjs`, so they agree by construction. The control that does turn red is triaging the
  new reports with all 12 `canvas` flags stripped from `surfaces.json` and confirming F rises to ~338.
- **Ref stability before any row-for-row diff.** Row identity is `key = ref|path|kind|property` and refs
  are positional (`addRefs` assigns `cr-ref-<surface>-<n>`). If anything renumbers, the diff is
  meaningless. Confirm the ref set is unchanged first.
- **Tree cleanliness immediately before the run.** `solve.mjs --rounds 0` is not read-only against the
  live site: `solve.mjs::build` runs `scripts/wp-build-page.js` twice per surface, dry then real, so all
  17 pages, templates and template parts are rebuilt from their tree files. Local drift would be pushed
  live. All 17 trees were clean at `f19a66e27` when this was written, on a shared worktree.
- **SHA by checksum, not liveness.** Read `~/.sgs-deploy-marker-eye-care-test.json` and spot-check with
  `lib/deploy-hash.mjs::localBlockHash` against `::remoteBlockHash`. Session C saw 6 of 7 blocks
  identical; `product-card` differed because the local build predated `ea72eab7b` and `23d3f5aea`.
  Expect that same mismatch.

## Pre-flight already done

All 17 walker configs pass `node scripts/parity/draft-live-walk.mjs <config> --lint` (17 of 17,
2026-10-06). This is the gate Spec 47 §5 records as existing but never run — `draft-live-walk.mjs` calls
`lib/lint.mjs::lintConfig` and reports before any browser opens — and it is why a surface stayed
unwalkable for a whole sitting.
