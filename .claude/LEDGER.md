---
doc_type: state
project: small-giants-wp
last_updated: 2026-08-22
note: "THE single living-status doc. REPLACED each session, never appended. History → memory/session-YYYY-MM-DD*.md (ledger-rotate.py Stop hook snapshots automatically past the cap but NEVER edits this file). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep < 24576 bytes."
---

# small-giants-wp — LEDGER (the one living status)

# ▶ NEXT SESSION STARTS HERE

**Invoke `/autopilot` first.**

⚠ **FIVE TRACKS HAVE TOUCHED `main`. Establish which you are before reading anything else.**
The shop-archive / R-3 track owns the sections immediately below. The **colour-golden**
track owns `## ▶ COLOUR-GOLDEN TRACK`. The **motion** track owns
`## ▶ MOTION TRACK` below.
The **consolidation** track is summarised in the next block and is CLOSED bar one phase.
The fifth is the **editor-errors / nav-drawer** track (D742) — CLOSED, section at the bottom.

⭐ **If you are the colour-golden / client-controls track:** read
`.claude/prompts/2026-08-28-check-a-backlog-and-the-settled-designs.md` — it carries EVERY
remaining task on this track. Its four predecessors were all executed and DELETED on 2026-08-27
(`the-remaining-client-controls`, `the-container-gap-and-the-remaining-controls`,
`check-a-blind-spot-and-the-first-controls`, `council-the-burn-down-method`) — if you find a
reference to any of them anywhere, it is stale.

⛔ **Before building ANY script or hand-doing investigative work, grep the two GENERATED
catalogues in `.claude/dev-setup.md`.** 524 scripts across FIVE directories, and this repo's
recorded failure mode is rebuilding one that already exists. Search the SUBJECT (colour,
token, element, parity), never the verb — the same idea is spelled `census-*`, `survey-*`,
`audit-*`, `check-*`, `scan-*`, `probe-*` and `report-*`.

## ▶ MAMA'S CLONE TRACK — 2026-08-27 SESSION CLOSED (D830-D851); Task 1 is the ONLY thing left, first in queue

⭐ **NEXT SESSION: the twelve-template live review — see `.claude/prompts/2026-08-28-finish-the-template-review.md` (fresh prompt; the 2026-08-27 predecessor was executed and DELETED).**
Its 5 defects + the missing `main` `TAG_NAME_OPTIONS` gap are UNTOUCHED. This is now the ONLY open
item on this track — everything else (D830-D850) shipped and closed this session.
⛔ Full mechanism detail is single-sourced to **D830-D850** in `decisions.md` — do not restate here.

**Shipped + closed this session, nothing left open on any of these:**
- 8 converter/block fixes merged (D830-D834 baseline + D843/D844/D845 this session), each
  root-caused and `/qc-council`-validated before dispatch — padding-routing bug (universal across
  the composite-mirror family), a 5th-sibling tier-object bug, `sgs/quote`'s attribution panel
  rebuilt onto shared `TypographyControls`.
- Typography re-measured fresh (D847): 74/75/79% CSS parity (page 2884), +4pt vs prior baseline.
  Font-size split reversed from ~50 authored/~9 inherited to 91% inherited (Spec 33 theme-base
  issue, not a converter bug) — the 2 remaining "authored" cases (`option-picker`, `testimonial`)
  turned out to be the framework's correct designed value, not bugs (D850). No code change needed.
- D843's fix confirmed live on production, page 2742 (D850) — both paddings exact match.
- `/sgs-update` DB refresh ran clean (D849) — genuine no-op, F6 green before/after.
- flexWrap migration tool built (D847), dry-run only — 127 stack-conversion candidates found, none
  applied. Needs Bean's per-candidate screenshot sign-off before any live conversion.

**Carried, not this session's scope:** the 375px readable-card floor (design question for Bean —
shop archive 312px, PDP carousel 140px/card, mechanism changed grid→carousel) · archive residue ·
`sgs/button::fontFamily` genuinely dead, maybe wireable.

⚠ **NEW, found late by a peer session (D851): page 2884 (this session's own fresh clone) has a real
converter bug** — `sgs/product-card.titleLineHeight`/`descLineHeight` stored as STRINGS, block.json
declares `number`, WordPress silently drops both to default. Same bug class as D802/D833. Not
root-caused or fixed — treat as a live bug next session, not stale content.

### ▶ G3 answered this session (2026-08-27)
All 12 templates under `theme/sgs-theme/templates/` are framework-authored (real `sgs/*` block
usage + real commit history) — no stock WooCommerce/core default hiding among them. Order
Confirmation and Coming soon templates named in Task 1's "never opened" list **do not exist** as
files in that directory — confirm with Bean whether they live elsewhere or are still unbuilt before
Task 1 tries to open them next session.

### ⛔ The visual-diff bypasses CANNOT be retired — not a queue
`source_sha` comes from STAGED bytes, so a report only certifies the commit it accompanies;
`manual-skips.log` is a permanent audit record. The NEXT commit touching each block owes a real
report. D831 shipped its own (`reports/visual-diff/button-2026-08-27.md`); everything else in
D830-D834 still owes one. Reasoning: D804.

### ⚠ Hazards (full list in the next-session prompt)
- **`main` is shared:** `git add <paths>` then a BARE commit flushes the whole index — four of
  another track's staged files were in it. Use `git commit -- <paths>`.
- **A subagent ran `git stash` beside a concurrent agent**, against instruction. Nothing lost;
  `git diff --stat` catches all four ways a subagent destroys work.

## ▶ MOTION TRACK — 2026-08-27 (TWO SEPARATE TRACKS — do not merge them again)

⛔ **These were ONE plan file and that cost a full session (D838).** FR-38-31 is a SHIPPED effect;
the engine is an UNBUILT rebuild. No phase number is shared between them. Never re-merge.

### ▶ A. FR-38-31 `flowing-gradient` — ✅ CLOSED 2026-08-27 (shipped, verified live)

Bean's verdict on the D828 re-fix: *"insanely slow… nothing like an aurora, just blurry random
shapes."* ⭐ **Aurora was never this effect's target** — it was built as a Stripe-hero clone, and
D781 already found that reference was the wrong thing. **Not reopened for look work.**
⚠ **A working `fxWaveSpeed` control EXISTS** (`fx.js:2598` → `fx-wave-gradient.js:250,271`) — an
earlier claim that there was none was wrong. The DEFAULT is the defect: ~115s to cross one screen.
**Derive it as `drift/(2·freq·aspect)`, never from the raw constant** — eyeballing it was wrong 4×.
✅ **SHIPPED + LIVE-VERIFIED (`edc7fed9f`):** LAYER_DRIFT x3.5 (default ~115s -> ~33s per screen,
max ~11s), morph raised only 1.5x so flow leads over shape-change, Speed + Wave depth now
`isShownByDefault`, help text reworded, docblock records this is NOT an aurora.
Both palettes measured drifting on real GPU (negative control 0.0%); editor rows visible without
the "+" menu; payload-verify 83/83; motion QA 3/3. Figures in **D838**.
⚠ Measure with a FIXED integer clip, never an element screenshot (D838).
Plan CLOSED: `plans/archive/2026-08-26-fr3831-look-gate.md`. ✅ D813/D814/D815/D826 closed;
D827 technique change + D828 regression fix — read the D-numbers, do not restate.

### ▶ B. GENERATIVE BACKGROUND ENGINE — the POC rebuild (NOT started)

⭐ **Plan: `.claude/plans/2026-08-27-generative-background-engine.md`.** ONE configurable engine —
colours / shapes / sizes / positions / speed as client controls, not one fixed hero look.
The technique spec **IS its build spec** (renamed
`reports/2026-08-25-generative-background-engine-technique-spec.md`); **D794's NO-GO was
COMPLETENESS, not purpose** — stop calling it a document rewrite.
⛔ **Phase 1 = pick a reference BEFORE any code.** Never once done; skipping it wasted every prior
round (D781's rule, in capitals). Licence: nimitz = NON-COMMERCIAL; paper-design (Apache-2.0) ships
no aurora — **an aurora must be WRITTEN, not borrowed**. Differentiator (parked): recolours itself
from the per-client theme tokens.

### ▶ NEXT

✅ **THE THREE DESIGN GATES ARE DECIDED (2026-08-27).** Single-sourced to **D839-D842** — do not
restate. `floating-objects` was the WRONG effect → now FR-38-33/34, gate gone ·
`decorative-image` wraps only when treated · generative covers → **Spec 40** (scope only,
build-gated on a reference Bean has seen).

**OPEN:** tasks 7/8/9 (trail demo · pin keyboard focus · reduced-motion row-collapse) + 3
fx-registry gaps needing Bean's call (D842).
⛔ **Page 2114 is TRASHED (D730)**; restoring it = silently-broken page. Build a FRESH pin fixture,
COMMIT its markup (3rd lost). Reuse `probe-step13-pin-focus.mjs` — do not hand-roll.
⛔ **Carried:** Sparks (FR-38-32) is the real fading trail, NOT "Drag weight" — and **Bean has
still never seen it** (canary 2744 only, very faint). Show him before calling it done.

## ▶ CONSOLIDATION TRACK — CLOSED 2026-08-22 (Phase 4 shipped)

Shipped, deployed, canary-verified. **Nothing remains on this track; Prompt B is deleted.**
Detail is single-sourced — do not restate it here: **D731/D732/D733 + Phase 4** in
`decisions.md` (commits `a2f6d5df`, `bbf13cc2`), **Spec 32 §6.1 (a1)/(a2)** (shared
shorthand builders; sanitiser contract) and **Spec 35 Part K** (the gate + two method
rules). Enforcement: `npm run check:vacuous-guards`, wired into `prebuild`.

**If you are the shop-archive track**, read, in this order:

1. `.claude/plans/phase-shop-container-remediation.md` — **Phase 1 AND Phase 2 are BOTH
   COMPLETE (2026-08-22, D742).** P2-2/P2-4/P2-5/P2-7 (the four steps still open at the end
   of the fourth session) shipped, deployed to sandybrown, live-verified, and reseeded.
   Phase 3 (the per-template pass, P3-1 through P3-9) is the only work left in this plan.
   ⛔ **OWNERSHIP MOVED 2026-08-27 (Bean's call) to
   `.claude/prompts/2026-08-28-finish-the-template-review.md` — do NOT start it here.**
   Split ownership (queued here, a loose scrap in the Mama's track) is why it deferred 4×.
2. `.claude/decisions.md` D725 + D726 (width model) and **D742** (P2-2/P2-4/P2-5/P2-7
   close-out) — read before any further container work.
3. `.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md` — IN FULL if touching converter/walker.

## Task 1 — container width model: ✅ CLOSED 2026-08-21 (D725 / D726)

**Settled the OPPOSITE way to how the task was written — read D725 before acting on any older
note about it.** Our `contentWidth` already caps content, so core's duplicate
`layout:{"type":"constrained"}` was DELETED (`c984a676`). One cap per page, and it is ours.
Measured 1440/768/390: stacked caps 3 → 0; `<main>` 1425px unbanded; 26 sections full-bleed
outer + 1280px inner.

⛔ **Three instructions that used to live here are now WRONG** — full text in D725. In short:
the inspector-scan rule-23 widening is NOT needed; a full-bleed section is a SIBLING not a
child, so nothing needs `alignfull`; and `<main>` at `contentWidth:full` is CANONICAL, not a
workaround. **Accepted consequence:** a block placed straight into a page is intentionally
full-width. Do not "fix" it.

## Task 2 — Two decisions the colour-golden track is waiting on

Sticky sidebar (their evidence says the accordion already solved it — RE-MEASURE before
building anything) and the band-replacement model, which is Task 1 by another name. See their
section below.

## ▶ LIVE STATUS — 2026-08-23 (shop-archive track — PHASE 3 WAVE A CLOSED)

**All pushed. Build GREEN (677 converter tests). Canary deployed + live-verified.**
✅ `a85a87d2` (the cosmetic `--flex` marker-class fix, a plugin file) SHIPPED on the
2026-08-23 blocks deploy. Nothing outstanding.

**Phase 3 has TWO axes.** Correctness (the 7-point checklist) and design. Wave A closed
the STATIC half of correctness across all 10 surfaces; the design axis has never run.

**Wave A: 10 parallel agents, one per surface, ZERO FAILs.** Register:
`reports/2026-08-22-phase3-template-audit-register.md`. Global gates run ONCE and
attributed rather than per-agent — both scripts are whole-repo and take no file argument,
so a per-surface run returns the same answer ten times and attributes nothing.

**⭐ The headline: the whole `align` mechanism was inert and is now GONE from
`sgs/container`.** Measured, not reasoned — stripping `.alignfull` from a real element in
a real `.wp-block-post-content` context changed nothing (left, width, all four margins
identical; A/B against an unaligned sibling byte-identical). Core's breakout resolves
`calc(var(--wp--style--root--padding-left) * -1)` against a variable that is EMPTY at
`:root`. `align:"wide"` never had a matching rule at all. No SGS-BEM draft can express
either — there is no such CSS property — so emitting it failed the R-1 honest-mapping
test. **Full-bleed comes from `maxWidth` defaulting to `{}`.** Canary DB held 0 align
authorings. Spec 31's L1 rule amended; converter self-disabled via the DB reseed.

**⭐ Second: a `<main>` is not a flex container.** D742's `layout:flex` default was
retroactive and no `<main>` had ever set the attr, so every page laid its top-level
sections out in a ROW — measured at 634/1328/1328px on the product page. Bean's call, and
he was right about the shape: normal block flow already stacks, so the outer flex is now
suppressed for a `<main>` rather than re-pointed to `column`. Explicit `layout:"stack"`
removed from the eight templates so ONE owner remains; `404.html` states nothing at all
and is the **living canary** for the behaviour. Verified: 3 sections → 1732px each,
stacked, backgrounds spanning.

**Also fixed, both root-caused rather than worked around:** `extract-signatures.py`'s
`css_tier` was RANDOM (set iteration + per-process string-hash salting) — three sessions
had hand-reverted the same diff without finding it; now deterministic, proven across three
`PYTHONHASHSEED` values. And Stage 2's live scrape was failing on an expired root in the
**Windows** trust store, not WordPress's cert (their leaf is valid to October); both
`urlopen` sites now use a certifi context — 3/7 sources → **10/0**, and `wp_version_indexed`
corrected 7.0 → 7.1.

### ▶ NEXT for this track, in order

1. **The design benchmark — ✅ IT DID RUN (2026-08-23). This line said otherwise and was
   wrong.** Output: `.claude/reports/2026-08-23-template-design-benchmark.md`, ten surfaces
   graded; most of the ranked list was implemented, deployed and live-verified. Its prompt
   carried its own `⛔ EXECUTED` banner the whole time. Bean deleted the prompt on that
   basis and was right to; the deletion is committed. **Read the register's four
   corrections before trusting any of its findings** — Bean caught all four by eye.
2. ⛔ **Wave C + the three correctness items — MOVED 2026-08-27 to
   `.claude/prompts/2026-08-28-finish-the-template-review.md`. Do not start here.** Of the
   three: `main` missing from `edit.js` `TAG_NAME_OPTIONS` IS carried forward in that prompt.
   The h1→h3 skip was re-checked live 2026-08-27 and came back CLEAN on both `archive.html:21`
   and `search.html:16` — resolved, nothing to do. **The third item — redundant nested
   `contentWidth` in 5 files — is NOT in the new prompt** (found missing during the 2026-08-27
   handoff QC pass; it never made it into an earlier prompt rewrite). File names for the 5
   instances were not recorded anywhere still readable — next session needs to re-derive them
   (likely via `grep -rn 'contentWidth' plugins/sgs-blocks/src/blocks/*/render.php` cross-checked
   against nesting depth) before fixing.

⚠ **Canary content constrains Wave C:** 9 posts, 135 pages, 5 products, 1 category,
**0 approved comments** (so `single.html`'s 14 comment blocks cannot be demonstrated
without seeding one). `index.html` is genuinely unreachable — `show_on_front=posts`,
`page_for_posts=0` — which is the healthy state for a fallback template, not a defect.
`front-page.html` renders ~104 chars and ZERO `<h1>`: the template is CORRECT as a shell,
the mismatch is that the site shows latest posts while the template holds `post-content`.
That is a Settings → Reading finding.

## ▶ shop-archive track — Phases 1 & 2: CLOSED 2026-08-22 (D742)

Narrative swept VERBATIM to `memory/session-2026-08-22-shop-archive-phase2.md` on
2026-08-23 (this file was 2,074 bytes over its cap). Nothing pending there.

⛔ **One item in that archive is still OPEN and is NOT part of Phase 2** — the
`sgs/container` capability gap: the container injects `.sgs-container__inner` carrying
`max-width` on ITSELF, where core caps CHILDREN via
`.is-layout-constrained > :where(:not(.alignfull))`. Ours therefore cannot express
"full-bleed child of a constrained parent". Read it there before reopening it.

## ▶ COLOUR-GOLDEN / TOOLING TRACK — 2026-08-25 (T0/T1/T3/T4 + orphans CLOSED)

⭐ **START HERE: `.claude/prompts/2026-08-26-let-the-method-apply.md`** — but note TASK A and
TASK C in it are now SHIPPED. Only **TASK B (the 27 orphans)** remains.

⭐ Narrative: `memory/session-2026-08-24-detector-first-and-the-serial-loop.md` · method
application log: `reports/2026-08-26-migration-method-application-log.md` · grading rubric:
`rubrics/migration-method-grading.md`.

### ✅ CLOSED — detail single-sourced, do NOT restate

T0 (method APPLIED, D775) · T1 (`prebuild` 153.4s -> 31.0s) · T2 (7 of 27 orphans wired) ·
T3 (burn-down, `scripts/programme-progress.py`) · T4 (`--all-properties` REFUTED the batching
carve-out). History: `memory/session-2026-08-24-detector-first-and-the-serial-loop.md` + the
application log + `reports/2026-08-24-script-revival-register.md`.
⛔ A red gate asserting a DELETED contract is worse than none — its red reads as a backlog.
🚫 `button_group.py` — Bean: not wanted.

✅ **STRUCTURAL DEFENCE — THE RULE IS ENFORCED** (`hooks/detector-first-commit-gate.py`,
PreToolUse/Bash). 4+ code files with substantially the same change and no detector → DENIED;
bypass `[repeat-ok:<reason>]`.

### ▶ OPEN — Bean's order (2026-08-25): clear Spec 32 + 35 + uniformity, THEN Spec 39

✅ **2026-08-27 CLOSED.** Method councilled → **C+**, 9 fixes. Rule 21 **211→83** (128 were ONE
detector bug) · rule 34 **319→2** · scanner **945→499**. `reports/2026-08-27-rule-21-triage.md`.

✅ **CLOSED 2026-08-26.** ⛔ Detail single-sourced to **D792/D797/D798/D799**. Hero canvas bg ·
`colourVar()` slug-wrap (120 sites / 39 blocks) · rule 21 ceiling 83→82 · truncation gate ·
**Gate C picker BUILT** (footer-row only, `2e46fc3f2`).

✅ **COLOUR-GOLDEN CLOSED 2026-08-27.** Gate C picker APPROVED. CHECK A blind spot FIXED (ceiling
208→288→238). Canvas padding/margin fixed; SECTION GAPS CLOSED — `sgs/container` + `sgs/site-footer`
joined the reset, homepage has ZERO gapped sections (1.5.83). ⚠ Two of my claims were wrong, Bean
caught both: it was our theme not WordPress, and `maxWidth`(OUTER)=full-bleed vs
`contentWidth`(INNER)=normal, so no detect-and-mark was needed.
⭐ **NEXT + all detail: `.claude/prompts/2026-08-28-check-a-backlog-and-the-settled-designs.md`**

### ✅ SPACING MIGRATION 4/5 SHIPPED (`fa11f794c`) · picker header-row (`71a5d4d42`)
Full detail: `~/.claude/plans/next-session-ethereal-lightning.md`. **Q1/Q3/Q4 ANSWERED from
source — do not re-derive.** Q4 wrapper needs NO change → no design gate. **Q1
`check-dead-pattern-attrs.py` is ADVISORY (`compute_exit_code` drops its finding class, exits 0)
— it CANNOT gate this; the gate is `scripts/migrate-off-native-spacing.py --check`, verified RED
pre-migration.** Q3 site-header's `! padding` is now an EMPTINESS test (a `{}` default is
truthy — else Split/Centred breaks silently) and `hasRestSpacing` was DELETED. Also fixed
multi-button's real double-emission + built its margin parity; `attrMap` fixed on all, not one.
🔶 **THREE pieces complete in the tree but UNCOMMITTED — another track has concurrent
`SgsLengthControl` edits in the same files. Land each the moment they commit; never sweep or
revert their hunks:** `trust-bar` (edit.js, 6 foreign hunks — the last spacing block) ·
`container` picker (`LayoutPanel.js`, opt-in prop DEFAULTING OFF — ~20 blocks render it, so
never an unconditional mount) · `product-card` replace fix + its new
`check-destructive-only-controls.js` (⛔ land detector AND fix together, or the gate goes red
for everyone).
⚠ **4 visual-diff MANUAL SKIPs logged** — renders identically BY DESIGN but is **unverified
visually** (deploy impossible, shared tree dirty). Next commit on each block owes a real report.
⚠ `gate:full` FAILS on `sgs/hero` orphan attrs — NOT orphans; another track's refactor builds the
names via `gradientOverlayAttrKeys()`. Deleting them deletes working features. Use
`--skip-gate-full` until they fix it.
✅ 2849 TRASHED — stored-content audit passes again (had blocked 5 deploys).
✅ Gate C picker roll-out COMPLETE on all 3 blocks (footer-row, header-row, container).
⛔ **TASK 2 WAS BUILT BY ANOTHER TRACK (D805) — do not duplicate.**
⭐ **NEXT: `.claude/prompts/2026-08-28-check-a-backlog-and-the-settled-designs.md`.**

⚠ **Five tracks on `main`:** 3 deploys aborted, 2 commits blocked by others' staged work.

⭐ **SCOPE REGISTER: `.claude/plans/2026-08-25-road-to-uniform-then-spec-39.md`** — 24 open
items surveyed against source (Spec 32: 5 · Spec 35: 19) plus the tier migration. Matches the
project's own ordering rule **D552: standard leads, pipeline follows.**

⛔ **SPEC 39 DOES NOT EXIST AS A FILE** — absent from `specs/README.md`, yet D554-C names it THE
PACING ITEM: `orchestrator/check_flat_tier_regression.py` blocks cloning for every migrated
property until it lands, and **37 conformance goldens sit `xfail(strict=True)`** naming it.
Finishing more of the migration INCREASES the blocked surface until it ships. Detail: D554-C.

1. **Step 0 — fix the instruments (small, do first).** `migrate-tier-object.py` has a 3-family
   BLIND SPOT: `classify()` needs a BARE base, so it cannot see a family whose base is
   `<name>Desktop` — `brand-strip.columns`, `hero.textAlign`, `whatsapp-cta.showOn`. **True
   remaining scope is 37 families, not 34.** Then check whether `audit-inline-styling.js`'s 11
   "tier-without-base" blocks share that cause. Scope A honestly only after both agree.
2. ✅ **Step 1 — the SIX Bean decisions are ANSWERED** (C14-C19). C15 researched + scoped
   2026-08-26 (4 items adopted); C19's sizing-mode picker approved. Do NOT re-ask.
3. **Step 2 — the mechanical sweep behind detectors:** 37 families · Spec 32 B1/B3/B5 ·
   Spec 35 C1-C11 (colour R2-R6, ToolsPanel 0/15, decorative-image 1/14, imageControls 2/15,
   border-builder 1-of-48). THE-MIGRATION-METHOD.md applies to every one.
4. **Step 3-4 — the two live passes** (a11y + element-first panel order) and the hex-literal triage.
5. **Step 5 — WRITE SPEC 39**, then the converter rework. Check first whether its scope is already
   settled across D276/D552/D554 — it may be transcription plus a design gate, not open design.
6. ✅ **Whole-file-diff detection — BUILT 2026-08-26** as the TRUNCATION gate
   (`.claude/hooks/truncation-commit-gate.py`, `0fdfc7ea9`). Bean narrowed it: a reformat is
   recoverable from git, truncation is the case no other gate can see.

⚠ **`check-box-flat` is wired into `prebuild` but its exit code is NOT propagated** — its findings
sit behind a passing suite. That is how `multi-button::childBtnBorderRadius` went unnoticed.
### ▶ Anchored grades — round 4, 2026-08-27 (as EXERCISED)

working-change **C** · recoverability **D** (held) · governance **C** · durability **C** ·
first-attempt reach **C**. **Overall C+, was B−.** CONFIRMED 45 · PEDANTIC 6 · WRONG 3.
Four dimensions fell: the D778 edits made the doc WIDER and WRONGER. **Recoverability is still
the ceiling — 72 gates, none inspects diff shape; it failed again this session.** Bean's call.
⚠ Ratchet slack removed everywhere: rule 34 416→319 (97 slack), 31 292→291, 01 58→57, 21 →83.
## ▶ EDITOR-ERRORS TRACK — CLOSED 2026-08-22 (D743)

Narrative swept VERBATIM to `memory/session-2026-08-22-editor-errors-track.md` on 2026-08-26 (cap). Nothing pending. Detail: **D743**.

