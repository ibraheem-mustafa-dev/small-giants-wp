---
doc_type: plan
title: The road to uniform — clear Spec 32 + Spec 35 + the tier migration, then Spec 39
date: 2026-08-25
status: OPEN — scoped, not started
owner: colour-golden / tooling track
ordering_rule: D552 — "standard leads, pipeline follows"
---

# The road to uniform, then Spec 39

## Why this exists, in Bean's words

> *"We need the blocks uniform so we're not constantly reformatting them and causing issues for
> clients, and we need the uniform blocks so we can rework our pipeline so it's actually fully
> universal and functional, which is the profit goal. Can't just turn the money on instantly —
> the revenue-minded action needs to be related to working on this stuff in a way that reaches
> the ready position as fast as possible with no issues and corners cut."* (2026-08-25)

This matches the project's own recorded ordering rule, **D552: standard leads, pipeline
follows**. Finish the standard (Spec 32 + Spec 35 + block uniformity), then rework the pipeline
to it (Spec 39).

## The dependency chain, and why Spec 39 is last but load-bearing

**D554-C**, Bean-ruled at a design gate on 2026-08-10:

> *"The converter stays flat; its output gets gated. A check FAILS a clone run emitting a flat
> tier for a property already migrated on the target block... **Consequence: cloning blocked for
> migrated properties until the Spec 39 rework lands, making that rework the pacing item.**"*

That gate is live: `plugins/sgs-blocks/scripts/orchestrator/check_flat_tier_regression.py`.

⛔ **Spec 39 does not exist as a file.** No `39-*.md` in `.claude/specs/`, absent from
`specs/README.md`, referenced four times in `decisions.md` — including a recorded ruling that
*"Spec 31 is superseded by Spec 39 (archive-and-salvage the current converter scripts, do not
delete)"*. It was decided, named the pacing item, and never written.

**Measured cost of that gap:** `scripts/tests/fixtures/conformance/quarantine.json` holds **37
goldens at `xfail(strict=True)`** ("13 passed, 37 xfailed"). Its `_meta.unquarantine_when` names
*"Spec 39's converter rework"*. That is 37 cloning-conformance tests that cannot pass until it
lands — a measurement, not an estimate.

**The consequence for ordering:** finishing more of the block migration *increases* the
cloning-blocked surface until Spec 39 lands. That is by design (divergence loud, not silent) —
but it means uniformity work and the converter rework are coupled, and the coupling is why
Spec 39 must follow immediately rather than eventually.

---

## Scope — 24 open items + the migration

Every item below was verified against source by a survey agent, not read off a doc's own claim.

### A. Block uniformity — the tier migration

**37 families remain flat.** Not 34, and not 24.

⛔ **`migrate-tier-object.py` has a 3-family BLIND SPOT — fix this first.** Its `classify()`
requires a *bare* base attribute, so it cannot see a family whose base is declared as
`<name>Desktop`. Reconciled 2026-08-25 (DB-derived 37 vs disk-derived 34, disk-minus-DB = 0):

| Block | Property | Base declared as |
|---|---|---|
| `sgs/brand-strip` | `columns` | `columnsDesktop` |
| `sgs/hero` | `textAlign` | `textAlignDesktop` |
| `sgs/whatsapp-cta` | `showOn` | `showOnDesktop` |

Left unfixed, `--check` eventually reports clean while three families are still flat — a green
gate over remaining work, the same shape as two other defects found on 2026-08-25.

⚠ `audit-inline-styling.js` reports a **separate** "tier-without-base" count of **11 blocks**
(per-side spacing + border/typography roots). It also does not recognise a `Desktop`-named base,
so some of the 11 may be false positives of the same cause. **Not yet measured — do that before
treating the 11 as defects.**

Of the 37: the census (`reports/migrations/tier-object-all-properties-census.json`) shows 23 of
24 visible properties touch 1-2 blocks; only `backgroundOverlayOpacity` (8) is larger. Run
`migrate-tier-object.py --all-properties` for the live picture.

### B. Spec 32 — Component Styling & Token Contract (5 open)

| # | Item | Kind |
|---|---|---|
| B1 | **§5 CSS-injection sanitisation has NO GATE.** Free-text keyword attrs (`borderStyle`, `textTransform`) must be filtered to `[^a-zA-Z-]` before CSS concatenation. Applied at 2 call sites; 9 `render.php` reference `borderStyle` directly and are unaudited. The spec says so itself: *"No gate enforces this yet"* | mechanical |
| B2 | **§3 "no client brand value hardcoded" verified only on `sgs/button`, never the population** (D656). Hex literals in 11 `render.php` + 41 `style.css` — unclassified; some are legitimate framework defaults per the spec's own default-vs-hardcode test | triage, some Bean calls |
| B3 | **`multi-button::childBtnBorderRadius`** — NEW untriaged flat box scalar, postdates the spec's roster | mechanical |
| B4 | **`mega-panel.borderRadius`** — untriaged, blocked on Track 2 resuming | blocked |
| B5 | **`P-PATTERNS-USE-CORE-BLOCKS`** — 4 theme pattern files still use core `wp:heading`/`paragraph`/`list`, which auto-inline their own styling. Outside the audited surface, so no SGS-block gate can see it | mechanical |

✅ Re-verified live, not taken on trust: `audit-inline-styling.js --check` → **0 violations
across 83 blocks, exit 0**. The D294 pattern selector spot-checked clean on 5 blocks.

⚠ `check-box-flat` is wired into `prebuild` but its exit code is **explicitly not propagated**
(`informational — not propagated`), so its findings sit behind a passing suite. B3 is only
visible because someone ran it by hand.

### C. Spec 35 — Block Inspector UX Standard (19 open)

**11 mechanical** — do these behind detectors, in batches:

- C1 **Colour-conformance R2-R6** — detector + 5 shared paint helpers are merged; adoption, hover
  shape, the 29-row worklist, QA Gate C and the ratchet all remain (`phase-colour-conformance.md:9`)
- C2 Shadow-row gradient exemption belongs in the rule-31 detector, not per-block
- C3 Stage-2 wrapper tier plumbing — 7 properties (6 `gridItem*` + `shadow`) still lack it
- C4 CO-2 element grouping has **no enforcing gate** (the `consistency-scanner` it cites does not exist)
- C5 No rule for "bespoke panel duplicating a native supports panel" — Part L item unverifiable
- C6 `ToolsPanel` conversion — **0 of 15** dense `PanelBody` panels converted
- C7 Decorative-image + ARIA — **1 of 14** image blocks has the toggle
- C8 Border-builder coverage unverified — 1 file checked against **48** blocks declaring `__experimentalBorder`
- C9 `imageControls` functional reach — **2 of 15** declaring blocks actually work
- C10 `MediaGalleryPicker` → `brand-strip` logos (the swap already done in `gallery/edit.js`)
- C11 `product-card.ctaBorderRadius` — detector attribution gap, or accept as disclosed limitation

**2 need a live pass, not code:**

- C12 Keyboard + contrast + `aria-describedby` (`/a11y-audit` on the editor)
- C13 Element-first panel ordering for direct-panel blocks — only container-family blocks route
  through the shared renderer, so the rest needs a live editor walkthrough

**⛔ 6 need a BEAN DECISION before anything can be built — batch these (see below):**

- C14 **CO-28 canonical panel/cluster/control ORDER.** Genuinely novel — *"nobody centralises
  panel order"*. Nothing can be built until Bean picks one
- C15 **Block Bindings scope** — wired for 3 blocks + 2 sources. Is 3 the intended final scope?
- C16 **Spacing token control** — every block uses raw px rather than the theme.json S/M/L scale.
  Does the contract require the token scale once it exists?
- C17 **Section Styles (WP 6.6 block style variations)** — 0 hits anywhere. Which variant-switching
  blocks should adopt it?
- C18 **`site-{header,footer}-row` NULL `inspector_control_type`** — a multi-attribute façade
  control cannot be recorded in a single-value column. A contract question, not a data bug
- C19 **`testimonial` / `image-sequence` crop conversion** — each needs its own per-block call

---

## Order of work

**Step 0 — unblock the instruments (do first, it is small).**
Fix `migrate-tier-object.py`'s `Desktop`-base blind spot so the migration's own detector can see
all 37 families. Then measure whether `audit-inline-styling.js`'s 11 "tier-without-base" blocks
are the same false-positive cause. **You cannot scope A honestly until both instruments agree.**

**Step 1 — batch the six Bean decisions (C14-C19) in ONE sitting.**
Four of them block mechanical work that is otherwise ready to run. Answering them together costs
one conversation; answering them as they surface costs six interruptions and stalls the queue.

**Step 2 — the mechanical sweep, behind detectors.**
A (37 families) · B1, B3, B5 · C1-C11. THE-MIGRATION-METHOD.md applies to every one of these:
more than 3 files means the detector is the first deliverable. Use worktree isolation for
codemods — a reformat is recoverable, but reviewing it is not free.

**Step 3 — the two live passes.** C12, C13. Bean's eye (R-31-13) plus `/a11y-audit`.

**Step 4 — the triage items.** B2 (classify every hex literal), B4 if Track 2 resumes.

**Step 5 — WRITE SPEC 39, then do the converter rework.**
Check first whether its scope is already settled across D276 / D552 / D554 and the archived
converter-completion plan — if so this is transcription plus a design gate, not open design.
Closing it un-quarantines 37 conformance goldens.

## Guardrails carried forward

- **Never quote a D-date or commit date as an elapsed cost.** Both record when work *landed*.
- **Enumerate, never recall.** Every figure here came from a command. Three separate counts of the
  tier migration were in circulation before this was written, and only the enumerated one was right.
- **A green gate is not fidelity**, and an informational check that never propagates its exit code
  is not a gate at all (`check-box-flat`).
- **A red gate may be asserting a contract we deleted** — check before "fixing" it. On 2026-08-25
  the obvious fix to one would have reintroduced 32 deliberately-removed attributes.
- **Five tracks share `main`.** Path-scoped commits, branch re-checked in the same command.
