# The six ESCALATE sites — resolved against code

Each was quarantined because resolving it needed the code, not the prose. All six are now
settled by direct evidence. Commands and outputs are recorded so nobody has to re-derive them.

---

## E1 — Spec 11:193-202 — the `deprecated.js` migration procedure

**Verdict: RETIRED. Delete the procedure, replace with the current policy.**

```
find plugins theme -iname 'deprecated*.js' (excl. node_modules, build)  →  0 files
git log --diff-filter=D -- '*/deprecated.js'  →  1755a21f (2026-07-04)
    "refactor(blocks): consolidate core→SGS routing ... + remove all deprecations (D271)"
    35 files deleted in that one commit
git log --diff-filter=A --since=2026-07-04 -- '*/deprecated.js'  →  none
```

`plugins/sgs-blocks/CLAUDE.md:449` already states the live policy: "**Do NOT** create a
`deprecated.js`, wire `deprecated` into `registerBlockType`, or add block slugs to a
deprecation list." Spec 11 §5's four-step "Add `deprecated.js` v1" procedure is a followable
instruction to violate it, carrying no warning. **This was the most dangerous site in the corpus.**

**Apply:** replace the Migration shape steps that reference `deprecated.js` with a single line —
"No `deprecated.js` and no version bumps pre-production (D271/D293). Attribute changes ship
without a deprecation path; see `plugins/sgs-blocks/CLAUDE.md` §block deprecations." Keep the
InnerBlocks-slot step, which is unaffected.

---

## E2 — Spec 02:330 / 371 / 397 / 525-527 / 554 / 570 — six `deprecated.js` claims

**Verdict: all six STALE. Same evidence as E1.**

Six present-tense claims that specific blocks migrate old post content "via `deprecated.js` vN"
(`trust-bar`, `testimonial`, `certification-bar`, `notice-banner`, `svg-background`). They
contradict this same file's own correct statements at L143 and L159.

**Apply:** strike the `deprecated.js` clause from each of the six; the surrounding block
descriptions stay. Also flagged by the branch: `brand-strip/block.json` and
`feature-grid/block.json` carry stale `_comment_*` doc-strings referencing migrations that no
longer exist as code — outside this cleanup's scope, but worth a follow-up.

---

## E3 — Spec 31:11 — the oracle-artefact contradiction

**Verdict: the headline is HALF right. Keep the closing sentence, correct the headline, drop
two stale intermediate layers.**

Read from the committed artefact
`plugins/sgs-blocks/scripts/tests/fixtures/phase-f/_render-oracle/batch-report.json`:

```json
{"LANDED": 31, "UNVERIFIED": 33, "WRITTEN-not-LANDED": 0, "GUARD-FAIL": 33, "NOT-RENDERED": 8}
```

- The headline claim **"0 WRITTEN-not-LANDED" is TRUE** — the artefact reads 0.
- The entry's own mid-layer correction ("the artefact still reads `WRITTEN-not-LANDED: 2`") is
  **itself now stale** — the 2026-07-30 re-run cleared it. A correction that went stale is
  exactly the pattern this purge exists to remove.
- But **UNVERIFIED 33 and GUARD-FAIL 33 are non-zero**, so "C2 LANDED closing gate MET"
  overstates. The entry's own final sentence ("Remaining to close C2…") is the accurate one.

**Apply:** headline becomes "C2 partially closed — 0 WRITTEN-not-LANDED (verified against the
committed oracle artefact); 33 UNVERIFIED + 33 GUARD-FAIL remain." Keep the closing sentence.
Delete both intermediate correction layers. Cite the artefact path, not the number alone.

---

## E4 — Spec 35:125 vs :149 — `SgsLinkControl` vs `LinkPopover`

**Verdict: NOT a contradiction — a partial migration. Both components are live.**

```
grep -rl 'SgsLinkControl' src/blocks/*/edit.js               →   8 blocks
grep -rlE 'LinkPopoverField|LinkPopoverContent' .../edit.js  →  11 blocks
ls src/components/ | grep -i link  →  LinkPopoverControl.js, LinkPopoverControl.css, SgsLinkControl.js
```

Both files exist and both are mounted. Part B calling `SgsLinkControl` canonical is stale;
line 149 calling it "(superseded)" is correct but implies it is gone, which it is not.

**Apply:** Part B's row becomes "`LinkPopoverField` / `LinkPopoverContent` (canonical).
**8 blocks still mount the superseded `SgsLinkControl`** — migration outstanding." That states
the target, records the residual, and stops the next reader concluding either that the old
control is fine or that it has already gone. Re-measure with the two greps above; do not cache 19.

---

## E5 — Spec 37:945 vs :964-984 — "function" vs "silently dead"

**Verdict: the STATUS LINE is correct. The contradicting bullet is pre-fix history.**

`plugins/sgs-blocks/src/blocks/site-header/render.php:11-20`:

> "Rendered with tag `<header>` (FR-37-13 fix B, D375): this block IS the site header … leaving
> the page with zero `<header>` landmarks and the scroll-behaviour … **behaviours silently dead,
> live-proven 2026-07-23**. Emitting `<header>` here revives [them]."

The code names the exact failure the stale bullet describes, and states it was fixed. Fix B
landed. Note there is no `view.js` in that block — the `.sgs-site-header` selector lives in
`edit.js:367`, so the bullet's "targets an element no SGS header renders" describes the
pre-D375 world only.

**Apply:** delete the "silently dead" bullet and the "Queued; not yet started" line. Keep the
status line. Retain one sentence of the failure mode as a guard rail — "the header must render a
real `<header>` element; without it there are zero header landmarks and all three scroll
behaviours die silently (live-proven 2026-07-23, fixed D375)" — because that is a
regression that could recur if someone changes the wrapper tag.

**Also fold in the third layer:** `headerHideOnScroll` is an OBJECT tri-state
(`{desktop,tablet,mobile}`) per FR-37-14, not the boolean the retained text describes, and the
`site-header/block.json:76` citation no longer points at it. Drop the citation; point to FR-37-14.

---

## E6 — Spec 36:396-406 — ANSWERED label over a live-looking action

**Verdict: the action IS discharged. Delete the conditional, keep the answer.**

The retained body ends on "cheapest outcome to test first: lamalama's panel derives its width
from a 438px pill header, so **if** that header goes full-width on mobile, `header-attached`
already handles mobile correctly." That test was run. From
`.claude/reports/2026-07-28-drawer-code-extraction/lamalama-mobile.json`:

```
panel.computed.width     = 368px  (calc(100vw-32px), capped at max-width 438px —
                                   desktop showed the cap, mobile shows the fluid case)
panel.computed.max-width = 438px
```

Measured, both viewports, and `DIFF-ANALYSIS.md` covers lamalama across the eight-site sweep.
The panel is fluid on mobile rather than pinned to the pill-header width, which answers it.

**Apply:** keep the ANSWERED answer (flat value holds; lamalama derives width so mobile is free;
lusion = per-device `anchor`). Delete the retained question and the untested conditional. Add one
line: "Measured across all eight sites — `reports/2026-07-28-drawer-code-extraction/`."
