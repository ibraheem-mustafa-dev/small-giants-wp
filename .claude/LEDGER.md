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

⭐ **If you are the colour-golden track:** read `.claude/prompts/2026-08-26-let-the-method-apply.md`
— TASK A and TASK C in it are SHIPPED (D775); only TASK B, the 27 orphans, remains. (The older
`2026-08-24-db-and-script-code-only-investigation.md` this line used to name has been DELETED.)

⛔ **Before building ANY script or hand-doing investigative work, grep the two GENERATED
catalogues in `.claude/dev-setup.md`.** 524 scripts across FIVE directories, and this repo's
recorded failure mode is rebuilding one that already exists. Search the SUBJECT (colour,
token, element, parity), never the verb — the same idea is spelled `census-*`, `survey-*`,
`audit-*`, `check-*`, `scan-*`, `probe-*` and `report-*`.

## ▶ MAMA'S CLONE TRACK — 2026-08-25 (desktop CLOSED; mobile never looked at)

⭐ **START HERE: `.claude/prompts/2026-08-28-mamas-clone-mobile-and-converter.md`.**
⛔ Read **D786 / D787 / D788** first. Detail is single-sourced there — not restated here.

**Governing rule (Bean's):** never assess a page by reading code, the DB or REST. Open it and
LOOK. It earned itself four more times this session — a media control I insisted existed from
reading edit.js (it does; the editor shows only "Remove image"), a class list truncated by
`slice(0,110)`, a margin measured on `__inner` not the outer element, and a grep for `★` when
the block draws SVG.

### ✅ CLOSED + LIVE-VERIFIED
Parity **72% → 80%**, elements off 64 → 41, overflow **9px → 0**. Hero media cell **392 →
733px** · hero shows the draft's pink (its own fallback gradient painted over a correct
background-colour — different properties never compete) · reviews restored (slider 0 → 960px)
· star icon pink · sections padded · product cards 640/384 · gift labels 6px · ingredients
centred and **icons inherit it** · both white strips padded + 28px gap · trial card
transparent · all 5 images mapped.
**Site-wide:** 175 tier folds + 27 heading levels across **72 posts** (backups in
`.claude/backups/2026-08-25/`). `audit-post-content-blocks.py` now checks attribute TYPES — it
passed page 2742 clean while that page held 102 broken values.
**Commits:** `6db78e0e7` · `283335ae7` · `d3e31c890`, all deployed, motion QA green each time.

### ▶ OPEN — all in the next prompt
1. **Mobile at 375/768 — never assessed.** Containers squash rather than stack. ⚠ Two dead
   hypotheses: `flexWrap` defaults to `wrap`; the `layout:flex` row default is already fixed
   here. Untested: `min-width:0` letting children shrink past any wrap point.
2. **The converter still produces all of this** — flat scalars into object attrs; a block-root
   BEM modifier routed to a child; section padding sent to an undeployed page-id-scoped
   stylesheet; `layout:"grid"` onto blocks whose `layout` is a different enum.
3. **`splitImageBleed` crops the split image as if on mobile when ON** (Bean, in the editor).
   Meant to be deleted once object-fit + media padding shipped; D600 made it default `true`.
4. **6 visual-diff bypasses to retire** — all three commits used `SGS_VISUAL_GATE_SKIP`.
5. **Archive residue:** `core/query-pagination` has zero CSS across 7 templates (⚠
   `catalog-sorting` IS already themed — the old prompt was wrong); harmonise the two search
   blocks' LOOK; register Task 6; single-child-shrunk sweep; `oldshape-audit` over-broad on
   `--theme-only`.
6. **`/sgs-update` owed** — `specs/02-…` stale on this session's new attrs. Cross-track action.

### ⚠ Hazards proved this session
- **Never write `post_content` to a page the operator has open in the editor.** A save wrote
  Bean's pre-change editor state over a whole session of content fixes; only the last survived.
- **`main` is shared.** HEAD moved 4× mid-session; two deploys aborted on other tracks' dirty
  files (both correct). Commit with explicit paths, never `-A`.
- **A JSON round-trip reformats the whole file** — 206/194 lines vs 12 for a surgical insert.
- **A ratchet at zero slack**: rule 31 sat exactly on the live count, so one incomplete colour
  row red the build. A correct row costs zero findings.

## ▶ MOTION TRACK — 2026-08-25 (FR-38-30 + FR-38-31 shipped; the gradient's LOOK is the open gap)

⭐ **START HERE: `.claude/prompts/2026-08-27-fr3831-hygiene-and-the-look.md`** → executes
`.claude/plans/phase-1-fr3831-hygiene-and-look.md` (docscore A).
⛔ **DO NOT start at "form", and DO NOT build from the technique spec** — both were reversed by a
6-seat council (D794). The spec is **NO-GO**: no animation section, no camera, no acceptance
criteria, §2 contradicts §5. Only its §5 (hue adjacency) + §6 (ground) survive.
⭐ **The rejected look is FOUR CSS VALUES** — `fxWave*` all default `''`, effect defaults off, only
page **2740** uses it. ~30 min, one file, reversible. Everything else waits on Bean's eye.
⛔ Council's sharpest: "B-movie 3D VFX" = reads as rendered 3D, and "form" builds MORE 3D-ness with
its flattening antidote (§7) deferred. Starting there bets against the diagnosis.
✅ **POC + Q6 + Gate E CLOSED (D790/D791/D794).** Post pass = **70% of frame cost** → a framebuffer
pass is a DESIGN GATE. Fidelity n=1→3 (0.67/0.69%). Gate E deferred by Bean until the rework ships.
⚠ **3 verified live bugs** in Phase 1: context-loss dead rectangle (violates the §1.2b house
contract Spec 38 claims is honoured), `hexToRgb` silent kill switch, `capability.js` never wired.

**Status:** D766/D767 + 9 commits `cb39fbd54`..`41946db35`, 2026-08-24/25, logged as **D778-D781**.
Canary page 2721 (cursor field) + page 2737 (magnetic pull — cross-track warning above).

✅ Bean's eye-review of 2721 found 3 gate-passed defects: TORCH's mask had no height (fixed);
"Trail" renamed **"Drag weight"** (a lerp follower, no fade); invariant **I8** computed but was
never registered, so `--check` silently under-reported. AURORA rebuilt as a mesh gradient that now
arrives/leaves WITH the pointer (was parking a lit pool at each section's centre).
✅ **Editor opened for the first time** — Spec 38 §9's "canvas shows the resting field" claim was
WRONG, not unverified (canvas iframe carries zero fx attrs; `sgs/container` uses `edit.js` there).
Info Notice now ships; otherwise healthy (36 blocks, 0 invalid, 0 console errors).
✅ **FR-38-30 Magnetic pull** shipped — generalised mega-menu's `magnet.js` to 2 axes + proximity
radius. Reaches every fx-panel block, live-verified on 2737.
✅ **FR-38-31 Flowing gradient** shipped (Tier W's 2nd entry, autonomous, fixes mobile where
cursor-fx shows nothing) — simplex-displaced mesh, 4 stops, 3648B gzip, pause control. Its
clobbered canvas was `sgs/container`'s child-lift list missing the canvas.
✅ Deploy gate scoped — blocks-only/theme-only no longer aborts on another track's dirty theme
files; 3 new self-tests, each watched failing first.

⭐ **The gradient's rejected LOOK is diagnosed** — see the top of this track. Its cause stated
here ("4 interpolated stops can't reproduce that variation") was measured FALSE on 2026-08-25.

### ▶ NEXT, in order

⭐ **START HERE: `.claude/prompts/2026-08-26-hover-decision-and-gate-residue.md`** — carries
Tasks A-E below with exact file:line and done-when for each.

1. ✅ **CHILD-LIFT — CLOSED.** Six rules de-specified to `:where()`, 47 exclusions deleted.
   Deployed + live-verified: 141 container children, exactly ONE changed. Gate
   `check-container-child-lift` (fast, `--self-test` proven) stops it regrowing. Detail: D784.
2. ✅ **EDITOR SURFACE — CLOSED.** Opened on 2744; every control reachable, 0 console errors.
   FR-38-32's `verify-both-surfaces` gap is closed. ⚠ Live cap-binding and loop-stop remain
   UNMEASURED — the first probe was unreliable. Detail: Spec 38 §3.3.
3. ✅ **Stripe-hero POC — DONE 2026-08-25** (0.66%, 26/26 mechanisms, QC 10/10). Superseded by
   **the FR-38-31 rework**: form → ground → hue adjacency → detail field → colour source.
4. ⛔ **Hover: decide the 8 conflicted blocks — RE-MEASURE FIRST.** 3 of 11 shipped
   (google-reviews / pricing-table / whatsapp-cta). ⚠ **The "33 duplicates + 24 dead" figure
   previously recorded here is STALE and must not be acted on.** The gate that produced it was
   wrong in BOTH directions and was fixed on 2026-08-25 (D785) — of its 64 findings only 10 were
   real. A later hand-audit put it nearer 13 and 10, and that predates the final rewrite too.
   Re-run `check-duplicate-controls.js --json` per block, then put the real numbers to Bean.
   ⚠ D338 hazard on any attr REMOVAL.
5. **Gate the three ungated registration points** (motion-registry module map, its CSS map, the
   webpack entry) — see D784. Five features have now hit the child-lift trap independently.
6. **`floating-objects`** + **generative cover images** — both approved-in-principle, unbuilt.
   ⛔ Covers were scoped as needing "the same palette-texture capability (D781)". **That premise
   was measured false 2026-08-25** — no texture-palette pipeline is required. Scope covers from
   form, ground and hue adjacency instead.

⛔ **Carried:** the real fading trail is `particles`/Sparks. "Drag weight" is momentum and is NOT
it — never report it as satisfying that ask.

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
   Phase 3 (the per-template pass, P3-1 through P3-9) is the only work left in this plan
   and has not been started.
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
2. **Wave C** — checks 5 and 7 live per surface (375/768/1440 + canvas-moves).
3. **Three small correctness items:** `main` missing from `edit.js` `TAG_NAME_OPTIONS`
   (declared in the enum, so a client cannot select or recover it); h1→h3 heading skip on
   `archive.html:21` + `search.html:16`; redundant nested `contentWidth` in 5 files.

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

✅ **2026-08-27 CLOSED.** Method councilled -> **C+**, 9 fixes. **Rule 21: 211 -> 83** (128 were
ONE detector bug) · **Rule 34: 319 -> 2** (~505 lines of duplicated resolver deleted) · scanner
**945 -> 499** · `templateMode` removed from 6 blocks. Full triage:
`reports/2026-08-27-rule-21-triage.md` + `-rule-34-false-positives.md`.
✅ **HERO CANVAS + colourVar — CLOSED 2026-08-26, live-verified, pushed** (`14d3801bb`
`9efc58348` `dc2243e1e`). ⛔ **Detail single-sourced to D792 — do not restate.** Headlines:
· Hero needed **TWO** fixes, not one — inline paint AND `has-background`; the default
  `background-image` gradient stacked over the client's `background-color`. D792 records the
  reasoning error, which is the useful part.
· **`colourVar()` slug-wrapped unconditionally** → every custom (non-palette) colour was
  invisible in the canvas across **120 call sites / 39 blocks**, fine on the live page. Fixed via
  `CSS.supports`. Gate `check-colour-preview-resolver` (gates.json 74), `--self-test` **watched
  failing first: 7/10 break on the old code.** Bean-approved Rule 7 blast radius.
· ⛔ **CHECK A missed both** — a 2nd and 3rd proven false negative. TASK 1b still open.
· **Stored content migrated** (the rename's missing half): 2742/2511/2353 held 6 old `image*`
  names WP was discarding; the next editor save would have DELETED them. Backups in
  `.claude/backups/2026-08-26-hero-rename-oldshape/`. RESTORED the homepage hero's authored crop.
  ⚠ My first pass renamed 2 attrs on an `sgs/media` block — gate caught it, reverted, byte-clean.
· **`check-box-family-guard` FP fixed** — `'top'` matched inside `'Desktop'`; 21-case control.
⛔ **STILL OPEN:** `splitImageBleed`. The "4 rows carry `css_element: media`" claim is **FALSE** —
exactly ONE does; measured table + the real unnamed anomaly in **D792**.

⭐ **SCOPE REGISTER: `.claude/plans/2026-08-25-road-to-uniform-then-spec-39.md`** — 24 open
items surveyed against source (Spec 32: 5 · Spec 35: 19) plus the tier migration. Matches the
project's own ordering rule **D552: standard leads, pipeline follows.**

⛔ **SPEC 39 DOES NOT EXIST AS A FILE.** No `39-*.md`, absent from `specs/README.md`, yet D554-C
names it THE PACING ITEM: the clone gate (`orchestrator/check_flat_tier_regression.py`) blocks
cloning for every migrated property until it lands. **Measured cost: 37 conformance goldens sit
`xfail(strict=True)` in `tests/fixtures/conformance/quarantine.json`, whose `unquarantine_when`
literally names "Spec 39's converter rework".** Finishing more of the migration INCREASES the
blocked surface until it lands — by design, but that is why it follows immediately.

1. **Step 0 — fix the instruments (small, do first).** `migrate-tier-object.py` has a 3-family
   BLIND SPOT: `classify()` needs a BARE base, so it cannot see a family whose base is
   `<name>Desktop` — `brand-strip.columns`, `hero.textAlign`, `whatsapp-cta.showOn`. **True
   remaining scope is 37 families, not 34.** Then check whether `audit-inline-styling.js`'s 11
   "tier-without-base" blocks share that cause. Scope A honestly only after both agree.
2. **Step 1 — batch the SIX Bean decisions in one sitting** (register C14-C19: CO-28 panel order ·
   Bindings scope · spacing tokens · Section Styles · façade `inspector_control_type` ·
   testimonial/image-sequence crop). Four block ready-to-run mechanical work.
3. **Step 2 — the mechanical sweep behind detectors:** 37 families · Spec 32 B1/B3/B5 ·
   Spec 35 C1-C11 (colour R2-R6, ToolsPanel 0/15, decorative-image 1/14, imageControls 2/15,
   border-builder 1-of-48). THE-MIGRATION-METHOD.md applies to every one.
4. **Step 3-4 — the two live passes** (a11y + element-first panel order) and the hex-literal triage.
5. **Step 5 — WRITE SPEC 39**, then the converter rework. Check first whether its scope is already
   settled across D276/D552/D554 — it may be transcription plus a design gate, not open design.
6. ⏸ Whole-file-diff detection — **downgraded** (Bean, 2026-08-25): a reformat is recoverable via
   git/worktree, so this is a detection nicety, not a safety gate. Only the truncation case is
   genuinely undetectable, and it is narrow.

⚠ **`check-box-flat` is wired into `prebuild` but its exit code is NOT propagated** — its findings
sit behind a passing suite. That is how `multi-button::childBtnBorderRadius` went unnoticed.
### ▶ Anchored grades — round 4, 2026-08-27 (as EXERCISED)

working-change **C** · recoverability **D** (held) · governance **C** · durability **C** ·
first-attempt reach **C**. **Overall C+, was B−.** CONFIRMED 45 · PEDANTIC 6 · WRONG 3.
Four dimensions fell: the D778 edits made the doc WIDER and WRONGER. **Recoverability is still
the ceiling — 72 gates, none inspects diff shape; it failed again this session.** Bean's call.
⚠ Ratchet slack removed everywhere: rule 34 416→319 (97 slack), 31 292→291, 01 58→57, 21 →83.
## ▶ EDITOR-ERRORS TRACK — CLOSED 2026-08-22 (D743)

Drawer covered the fold in every template editor; several blocks errored. Three unrelated
causes, all closed — **full detail in D743, do not restate here**: the drawer shell was
exactly `100dvh` (now a 46px strip + a preview toggle); six validation errors from comments
inside `sgs/container`/`sgs/tab` inner content (**dynamic ≠ unvalidated**), 0 bad / 20
surfaces; and `check-undeclared-attrs.py` read JSX tags before stripping comments — 17 false
findings, fixed on `main` (`1693918f`), it had broken every build.

⚠ **Not ours:** the canary intermittently 500s (`Error establishing a database connection`)
under the ~12 concurrent block-renderer calls a template load fires, producing phantom
"Error loading block" banners that vanish on reload. Infrastructure — don't chase it.

