# Next session — mobile parity, and the converter residue

**Invoke `/autopilot` before anything else.**

> Mobile is measured for the first time: **73% at 375, 77% at 768, against 80% at desktop.**
> Not broken — behind. Typography is 38% of the gap. The converter fix that closes most of it
> is shipped and proven in the converter, but no live page has run through it yet.

---

## The rule that governs this track

> **Never assess a page by reading code, the DB or REST. Open it and LOOK.**

It earned itself four more times on 2026-08-26, and every one was a *consistent* reading of
the code that was wrong about the product:

- Three separate root-cause diagnoses died in a row — a cascade patch, a mobile-first
  mismatch, a stranded-CSS census. Each was killed by a different gate: Bean's pushback,
  `/qc-council`, then the real parity tool.
- A detector I built returned **zero** findings on a tree containing two, because it read a
  line window instead of the brace stack.
- Three build gates called a live attribute dead because both ends construct its key.
- A hand census of 37 border sites missed two.

The instrument was wrong every time. Opening the page, or running the thing, was faster.

---

## Read first, in this order

1. `.claude/LEDGER.md` — the Mama's clone block
2. `decisions.md` **D801–D803** (this session)
3. `reports/mamas-parity-mobile-postdeploy-2026-08-26.json` — the mobile numbers
4. `reports/2026-08-26-border-width-live-verification.md` — live evidence, and why the
   visual-diff bypasses cannot be retired
5. `.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md` — **in full**, before touching the converter

---

## What shipped, and what it did not do

| Commit | Change |
|---|---|
| `14707b01e` | Converter emits per-device **tier objects**; 8 tests, 4 watched failing first |
| `559cc6d97` | font-family gets a renderer; a border style with no width paints nothing; the detector |
| `75ca71be9` | Three gates called `titleFontFamily` dead — fixed at the resolver |
| `1a4e45b6a` | Live border verification |

**All deployed. Measured effect on page 2742: zero elements fixed, zero newly broken.**

That is correct, not disappointing. The tier fix only changes **new** clones, and page 2742
still holds the old desktop-only attributes. The zero-regression half is the real result: 43
files moved nothing they should not have.

---

## Task 1 — Re-clone Mama's, then measure

The converter half is proven. Running `convert_section()` on the draft's hero emits:

```
sgs/heading  fontSize  {"desktop": 52, "mobile": 34}
sgs/text     fontSize  {"desktop": 18, "mobile": 16}
retired tier siblings: (none)
```

The draft says the hero h1 is 34px on mobile and 52px above 768. It now carries both. **No
live page has been through the fixed converter**, so re-clone and re-measure.

⛔ **Clone to a NEW page id. Never write `post_content` to a page Bean has open in the
editor** — a save wrote his pre-change editor state over a full session's work on 2026-08-25
(D788).

⚠ A full clone run scaffolds blocks, writes pattern PHP and touches the shared DB. Use
`--no-scaffold-new-blocks --skip-register` unless you want all of that, and check no other
session is mid-build first.

**Done when:** computed-parity at 375/768 against the new clone beats 73/77%, and Bean's eye
agrees (R-31-13). A number alone does not close it.

---

## Task 2 — Typography is 38% of the mobile gap

456 property differences across the two viewports. Ranked:

| Property | Diffs | Share |
|---|---|---|
| `line-height` | 90 | 20% |
| `font-size` | 82 | 18% |
| `padding-*` | 52 | 11% |
| `background-color` | 28 | 6% |
| `margin-bottom` | 20 | 4% |

Scoped to `<main>`, 50 elements carry an authored font-size and 9 inherit one. Task 1 should
move most of the authored half. **The 9 inherited ones will not move** — nothing sets their
size, so they take the theme's base where the draft takes its own. That points at the theme
snapshot (Spec 33), not the converter.

Measure again after Task 1 before touching anything here. The split will have changed.

---

## Task 3 — Two live defects the parity run found

**A WCAG touch-target regression.** `[a] "read the full story"` and `[a] "find out more"`
render `min-height: 0px` where the draft renders `44px`. That fails the project's own AA
baseline. Not a fidelity nicety — a real accessibility defect.

**A border the draft does not have.** `[a] "find out more"` renders `2px solid` where the
draft renders none. ⚠ This is **not** the G5 defect and G5 never would have fixed it: G5
suppresses a style with *no* width, and here the clone has both — the block's own stylesheet
default painting where the draft asked for nothing. A different mechanism.

---

## Task 4 — Converter defects (b) and (d)

Both located, neither started.

**(b) A block-root BEM modifier routes to a child element.** `.sgs-product-card--trial`'s
border landed on `ctaBorder*`. `services/styling_helpers.py:664-671` matches the modifier as
an ordinary class, with no block/element/modifier distinction. The `css_element` guard exists
only on the `css_layer='OUTER'` query (`db_lookup.py:1348-1352`); the suffix fallback
(`db_lookup.py:2530-2555`) never reads it.

**(d) `layout:"grid"` onto blocks whose `layout` is a different enum.** It collapsed the
testimonial slider to width 0. `services/arrangement.py:81-91` hard-codes the literals;
`assembly.py:212-216` gates on attribute *existence* and never calls `validate()`.
⚠ Only 5 of 18 blocks declaring `layout` have `enum_values` seeded — seed the rest, or the
check passes everything and is vacuous.

**Also owed from Bean's G2 ruling:** make the pipeline fail closed when it writes a shape a
block does not declare. That is what let this run silently for a fortnight.

---

## Task 5 — The stranded CSS, and the two decisions it needs

`variation-d0-d2.css` holds section CSS that is never deployed. Header and footer are a
separate pipeline stage and are excluded. In scope: **90 rules, ~84 genuinely stranded.**

| Cause | Rules | Stranded |
|---|---|---|
| A — selector resolves to no registered block | 43 | 43 |
| B — block resolves, property has no attribute | 36 | 36 |
| C — breakpoint outside 768/1024 | 9 | 5 |
| D — pseudo-element | 1 | 0 |

⚠ **Verify B against cv2 before acting on it.** The census reads `css_router`, which is a
*diagnostic* pass. The real converter captures CSS through `css_pass`, and that gap already
made two counts wrong: cause C was 44% not-actually-lost, and `sgs/hero`'s background plus
`sgs/button`'s border both turned out captured after all.

**Two decisions for Bean, neither mine to make:**

1. **`grid-template-areas` on `sgs/hero`** — the draft stacks the hero on mobile using areas.
   `supports.sgs.gridAreas` was retired at D639 on the reasoning that per-area attributes
   *are* the definition of the regions. Either give the hero a typed destination, or accept
   that area-based stacking cannot transfer.
2. **Cause A** — these sections became `sgs/container`, but their CSS keys on a draft class
   with no `sgs/<block>` counterpart. How should a converted section's CSS find its way back
   to the container it became? ⚠ Split `sgs-brand` (7 rules) out first: that one is a naming
   mismatch, `sgs-brand` against the registered `sgs/brand-strip`.

---

## Task 6 — The border rule, parked by Bean

Bean's rule, stated correctly: **an empty border width falls back to the block's own default
width.** Most blocks have no default, so it resolves to nothing. `sgs/button` has one, so it
resolves to 2px. Button was never an exception.

That makes the shipped gate wrong for any block declaring its own default: it replaces the
operator's style with the stylesheet's. **Confirmed on `sgs/product-card`** —
`render.php:121` puts `product-card` on the root and `style.css:33` gives that element
`border: 1px solid`, so a style of `dashed` with no width now renders solid. Roughly 17 more
blocks are candidates, unproven.

And the detector encodes the wrong question — *"is there a width test?"* rather than *"is
there a default?"*.

**Bean parked this deliberately**, and he was right to: the affected state is narrow (the
editor's border control normally sets both), nothing is deployed in that state, and the hero
bug he actually reported is fixed. Do not reopen it without a reason better than tidiness.

---

## Task 7 — Carried, still open

- **`/sgs-update` owed.** `specs/02-SGS-BLOCKS-REFERENCE.md` is stale on this session's new
  attributes. A shared-DB reseed is a **cross-track action** — check no other session is
  mid-build.
- **Twelve-template assessment.** Deferred three times now. Open each template in
  `theme/sgs-theme/templates/` and look at it. ⚠ Canary content constrains it: 9 posts, 135
  pages, 5 products, **0 approved comments**, so `single.html`'s 14 comment blocks cannot be
  demonstrated without seeding one.
- **Archive residue.** `core/query-pagination` has no CSS across 7 templates (⚠
  `catalog-sorting` **is** already themed — an older prompt was wrong); harmonise the two
  search blocks' look; register Task 6; the single-child-shrunk sweep; `oldshape-audit` is
  over-broad on `--theme-only`.
- **`sgs/button::fontFamily` is genuinely dead** — one of two survivors in inspector-scan
  rule 34. Now that the shared helper renders font-family, it may simply be wireable.
- **`sgs/quote`'s attribution panel** is still a bespoke emitter predating
  `TypographyControls`. Only the duplicated sanitiser folded in. Its font-family was never
  dead, so the defect is closed; full panel parity is a separate design gate.

---

## Two things that are not tasks

**The visual-diff bypasses cannot be retired.** `visual-report-sha.py` derives `source_sha`
from the **staged** bytes of a block's `src/` directory, and the gate recomputes it at commit
time. A report only certifies the version staged in the commit it accompanies; run against an
already-committed change it correctly returns `no staged files`. `manual-skips.log` is a
permanent audit record, not a queue to drain. The forward obligation is that the **next**
commit touching each block carries a real report. Producing one now would mean re-staging
files to manufacture a matching hash — gaming the mechanism `source_sha` exists to defend.

**The product-card media panel is handed off.** `.claude/handovers/2026-08-26-product-card-media-panel.md`.
That track replied: the hero video/SVG blocker is cleared — they made the sizing rules
unconditional rather than deleting them, and `splitImageBleed` is now gone (`93e8df23d`).

---

## Standing hazards

- **`main` is shared with several live sessions.** Commit with explicit paths — `git commit -- <paths>`,
  not a bare commit after `git add`. A bare commit flushes the whole index; four of another
  track's staged files were sitting in it tonight.
- **Never write `post_content` to a page Bean has open in the editor** (D788).
- **A JSON round-trip reformats the whole file.** A `json.dumps` rewrite of
  `attr-classification-overrides.json` produced a 2863/2854 diff. A surgical text insert was 9 lines.
- **Verify a subagent's destructive-command claims.** One ran `git stash` while a second agent
  was editing concurrently, against an explicit instruction. It flagged this itself; nothing
  was lost. `git diff --stat` catches all four ways a subagent destroys work.
- **A green gate is not evidence. An opened page is.**
