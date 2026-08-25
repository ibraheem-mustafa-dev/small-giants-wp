# Next session — finish the Mama's clone, then fix the converter that made it wrong

**Invoke `/autopilot` before anything else.**

> Desktop is closed and signed off. Mobile has never been looked at. The converter
> still produces the defects we spent this session hand-fixing — until it changes,
> the next clone arrives broken the same way.

---

## The one rule that governs this track

> **Never assess a page by reading code, the DB or REST. Open it and LOOK.**

It earned itself four more times on 2026-08-25:
- The product-card media control: I read `edit.js` three times and told Bean it existed. It does. Opening the editor showed only a **"Remove image"** button and no media panel — you must destroy the value to get a picker.
- A `slice(0,110)` truncated a class list and I concluded a class was absent. It was there.
- I measured `.sgs-container__inner` when the margin was on the outer element.
- I grepped for the `★` character when the block renders SVG stars.

Each was a wrong instrument, not a wrong fix. Opening the page was faster every time.

---

## ⚠ Read first, in this order

1. `.claude/LEDGER.md` — the Mama's-clone block at the top
2. `decisions.md` **D786–D788** (this session — renumbered from D783-785 on write, because another live session claimed those numbers first; the duplicate-id check caught it)
3. `reports/mamas-parity-final.json` — the live draft-vs-clone diff
4. `.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md` — **in full** before touching the converter

---

## ⛔ ANSWER THESE FIRST — design gates, before any implementation

Do not start work until these are settled. They each change what gets built.

**G1. `splitImageBleed` — delete it?**
Bean found it: the hero's split image crops as if on mobile whenever "Image bleed to edge" is ON. Turned OFF, the size and full-bleed work correctly. It was meant to be removed once object-fit and media padding shipped (padding defaults to 0), and never was. D600 made it default `true`.
→ Delete the attribute and its CSS, or keep it and fix the crop?
Blast radius: check stored usage first — `wp post list` + theme patterns.

**G2. Converter tier-object emission — scope.**
The converter emits flat scalars (`fontSize:"19px"`) into attributes the blocks now declare as per-device objects. WordPress silently discards every one. That is what broke this page.
→ Fix the emitter alone, or also make the pipeline fail closed when it writes a shape a block does not declare?

**G3. Section-level CSS — attributes or stylesheet?**
The pipeline routes section padding/background/max-width to a page-scoped stylesheet (`variation-d0-d2.css`) that is never deployed and is keyed to the page id it was cloned from. Bean's ruling this session: containers use **attributes**, not native CSS.
→ Should the converter write these to block attributes and the stylesheet layer be retired for D2?

**G4. `showFontFamily` — build the render half, or remove the control?**
`TypographyControls` exposes a font-family control that **no block had ever used**, and `sgs_typography_css_rule()` cannot emit font-family. Opting in alone produces a dead control. `sgs/quote` and now `sgs/product-card` each work around it block-privately.
→ Add font-family to the shared helper (one owner), or delete the unusable prop?

**G5. Border style with no width.**
Bean: "border with no width should mean no border by default." Today a style with empty widths renders the browser's 3px `medium`. This bit the hero image.
→ Framework-wide fix in the shared border helper, or per-block?

**G6. Product-card media in typed mode.**
No replace control and no media panel — only "Remove image". An operator with a broken URL must delete it to get a picker.
→ Add a "Replace" button beside Remove, or an inspector media panel, or both?

---

## Work, in order

### 1. Mobile — the whole point of this session

Nothing below 1440 has ever been assessed. Open `/` at **375 and 768** and look before measuring.

Known and accepted: the converter emits no responsive tier values, so per-device values were never authored. **Not** accepted, and the thing to investigate: containers do not degrade. They squash rather than stack when content runs out of room.

Two dead hypotheses — do not repeat them:
- `flexWrap` defaults to `"wrap"`, so containers *can* wrap. Not the cause.
- The container `layout:"flex"` row default was already fixed on this page (4 containers set to `stack`).

Untested and worth testing: the framework sets `min-width: 0` on flex children as an overflow backstop, which lets them shrink indefinitely rather than ever reaching a width that triggers a wrap. Measure it; do not assume it.

**Use `/dispatching-parallel-agents`** — one agent per viewport (375, 768), each reporting measured geometry, not impressions.

### 2. Converter — so the next clone is not born broken

Four defects, all proven from this page's artefacts. **Use `/subagent-driven-development`** — one task each, cross-model review per task.

| # | Defect | Evidence |
|---|---|---|
| a | Emits flat scalars into object-typed attrs | 175 folds needed across 72 posts |
| b | Routes a block-root BEM modifier to a child element | `.sgs-product-card--trial`'s border landed on `ctaBorder*` |
| c | Section padding/background go to an undeployed, page-id-scoped stylesheet | `variation-d0-d2.css`, keyed `.page-id-144` |
| d | Emits `layout:"grid"` onto blocks whose `layout` is a different enum | collapsed the testimonial slider to width 0 |

### 3. Retire six visual-diff gate bypasses

Commits `6db78e0e7`, `283335ae7`, `d3e31c890` each used `SGS_VISUAL_GATE_SKIP` because the after-capture needs a deploy and the deploy needs a commit. All are now deployed and verifiable.

Write `reports/visual-diff/{icon,info-box,testimonial,product-card,hero,container}-2026-08-28.md` in the shape of `container-2026-08-25.md`.

### 4. Archive-track residue (carried from the previous prompt, still open)

- **`core/query-pagination` has zero CSS** anywhere in the theme, across seven templates. ⚠ `catalog-sorting` is **already themed** (`woocommerce.css:2401` — 44px, tokenised border, chevron); the earlier prompt was wrong about it. Look before styling.
- **Harmonise the two search blocks' appearance** — `sgs/product-search` is product-scoped by design (D772); only the look changes, not the block choice. `core/search` has no theme rules at all.
- **Register Task 6** — `git log -p theme/sgs-theme/templates/`, findings only.
- **Single-child-shrunk container sweep** (D757/D773) — never swept repo-wide. Measure LEFT offsets, not TOP, when asking "is this a row".
- **`oldshape-audit` is over-broad on `--theme-only`** — it ships zero block schemas yet still evaluates them. Narrow it like `deploy_roots_for_scope()` was.

### 5. Template-by-template assessment — carried forward, twice deferred

The archive-track prompt deferred this to "the session after", and that session became this
one. It has now slipped twice, so it is written down rather than assumed: open each of the
twelve templates in `theme/sgs-theme/templates/` and LOOK at it — the governing rule at the
top of this file applies exactly here.

⚠ Canary content constrains it: 9 posts, 135 pages, 5 products, 1 category, **0 approved
comments** (so `single.html`'s 14 comment blocks cannot be demonstrated without seeding one).
`index.html` is genuinely unreachable and that is the healthy state for a fallback template.

### 6. `/sgs-update` — owed, deliberately deferred

Not run after this session's new attributes (`textAlign` ×3, container border family, `nameFontSize`, `titleFontFamily`). `specs/02-SGS-BLOCKS-REFERENCE.md` is stale on all of them. A shared-DB reseed is a **cross-track action** — check no other session is mid-build first.

---

## Standing hazards this session proved

**Never write `post_content` while Bean has that page open in the editor.** A save from the editor writes its in-memory state — loaded *before* your changes — over everything. It silently reverted an entire session of content fixes here; only the last write survived. Ask him to close or reload the tab first.

**`main` is shared with several live sessions.** Commit with explicit paths, never `-A` or a glob. HEAD moved four times mid-session, and a deploy aborted twice on other tracks' dirty files. Both aborts were correct.

**A JSON round-trip reformats the whole file.** Writing a tab-indented baseline with `indent=2` produced a 206/194-line diff. Surgical text insert: 12 lines. Check the file's own indentation first.

**`phpcbf` was safe here** (1 line on the test file) — but measure it on the smallest file before trusting it on a large one.

**A ratchet with zero slack.** `inspector-scan`'s rule 31 was lowered to exactly the live count this morning, so one new colour row red the build. A *correct* colour row costs zero findings — a trip means the row is incomplete, not that the gate is unfair.

---

## Done-when

Mobile renders correctly at 375 and 768 with Bean's sign-off (R-31-13). The converter no longer produces defects a–d, proven by a fresh clone run rather than by reading the diff. The six bypasses are retired with real captures. A green gate is not evidence; an opened page is.
