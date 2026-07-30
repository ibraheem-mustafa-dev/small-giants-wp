---
doc_type: report
title: "Track 1 verification audit — what is truly unfinished across Specs 31 / 32 / 35"
project: small-giants-wp
date: 2026-07-30
method: 3 parallel read-only investigators, every load-bearing claim fact-checked inline, then reassessed against Specs 31 + 32 + 35 read END TO END
status: findings banked (no parking entries created, Bean-directed)
---

# Track 1 verification audit (2026-07-30)

**Why this exists.** Bean believed Track 1a–1c was complete. This audit tested that. The
answer: almost nothing is unbuilt — what is missing is **verification**. Three named
mechanisms account for nearly every finding: a gate that passes because it cannot see the
violation, a completion claim backed by prose rather than a committed artefact, and an entire
inspector wave never opened in the editor it targets.

Spec 31 §7b already names the disease: *"internal metrics … are progress signals, never
closing gates."*

> **Naming note.** "Track 1a" appears nowhere in the repo or its git history. The LEDGER carries
> only `Track 1b` (Spec 35) and `Track 1c` (Spec 31). The third was audited as the Spec 32
> no-inline programme, which the LEDGER filed as *"no-inline COMPLETE bar 5 block-fixes"*.

---

## Claims WITHDRAWN by the full-spec read (recorded so they are not re-raised)

Reading the specs end to end killed three findings. They are listed first deliberately —
each would have sent work in the wrong direction.

1. **"The Spec 35 gate only covers 6 of 21 items."** WRONG BAR. Spec 35 **Part K** specifies
   *four* gate rules; `audit-inspector-conformance.js` implements **six** — a superset.
   **Part K is MET.** The 21-item/9-phantom-enforcer problem is real but belongs to the plan
   doc `plans/spec-35-inspector-DONE-checklist.md`, not the spec.
2. **"Custom CSS is a Part-F anti-pattern failing 81/81 blocks."** REFRAMED — it is a
   **cross-spec conflict**, not neglect. Spec 32 FR-32-4 calls `sgsCustomCss` *"the only
   permitted non-attr … styling output"* and Spec 31 FR-31-5.2 makes it **load-bearing** (the
   `ResidualBand` passthrough that carries arbitrary draft breakpoints onto a clone). Deleting
   it would break cloning fidelity. D401's "flagged, NOT fixed" was correct. Resolution =
   amend Spec 35 Part F to exempt it.
3. **Two items found in Spec 31 and then killed by checking them.** §12.6's *"orchestrator does
   not branch on `status:'failed'`"* — it does, `sgs-clone-orchestrator.py:1478-1504`. §12.6
   item 2's *"most §5 properties have no LIFT resolver"* — `resolvers/outer_box.py:37-47` now
   handles `overflow`/`object-fit`/`aspect-ratio`/`position`. **Both spec passages are stale,
   not both gaps real.**

Also corrected: `P-OLDSHAPE-AUDIT-TEXTALIGN` was reported as a dangling slug. It is not — it is
correctly archived RESOLVED at `memory/parking-archive.md:198`. (The agent grepped `parking.md`
only.)

---

## Track 1a — Spec 32 no-inline styling

**Primary deliverable genuinely done.** Measured: 81 blocks → 62 declare styling supports → **0**
missing `__experimentalSkipSerialization`; `audit-inline-styling.js` → 0 inline-via-render sites.
(`build-roster.py` counts `styling=63` on a marginally wider support set — the numbers are
method-dependent, which is precisely why no count should be cached in prose.)

**The bar, verbatim (FR-32-1):** *"no `style` attribute at all … neither a property declaration
NOR a custom-property value NOR an empty `style=""`"*. FR-32-4 forbids inline `--var` (D345).

| ID | Finding | Evidence |
|---|---|---|
| 1a-1 | **The "last render-level inline writer" claim rests on a narrowly-scoped sweep.** §6.2's 2026-07-28 amendment declares team-member the last one, found by *"a roster sweep of all 8 `sgs_transition_vars()` consumers"* — scoped to one helper's consumers. Outside that scope: **9 more**. | see 1a-2 / 1a-3 |
| 1a-2 | `countdown-timer` emits inline `--var` **on the block root**. Its own header comment vouches for it under the *superseded* pre-D345 contract — which is what stopped re-investigation. | `countdown-timer/render.php:297` → `get_block_wrapper_attributes()` |
| 1a-3 | 7 blocks / 8 sites emit inline `--var` on sub-elements: `card-grid:503`, `cta-section:333`, `form:234`, `google-reviews:447`, `pricing-table:222`, `product-card:1062`+`:1119`, `trust-bar:370`. Plus `gallery` emits an unguarded `style=""` (`render.php:337`,`:389`). | non-comment grep |
| 1a-4 | **The gate is root-only and fail-open** — which is *why* the above read green. `check-no-inline.py:88` inspects only tags carrying a `wp-block-sgs-*` class; unreachable canary → WARN + exit 0. Spec 32 §6.2 already concedes D346's inline-zero win was **"partly vacuous"**. | `P-NO-INLINE-GATE-COVERAGE-GAPS` OPEN |
| 1a-5 | Spec's own un-triaged list: 3 non-injector inline writers. `class-sgs-container-wrapper.php` verified **clean** (`:1081-1083` scopes into `.{uid}`); `post-grid-rest` + `shape-dividers` remain untriaged. | §6.2 amendment |
| 1a-6 | Per-block LANDED accounting never done for most blocks (condition 10 of 11). | `P-NO-INLINE-LAND-ROSTER` OPEN — self-described as *"the main remaining work"* |
| 1a-7 | 2 missing visual-diff reports: `product-faq`, `product-faq-item`. | 410 reports vs the 62-block roster |

### Settled: are block variants allowed inline? (Bean's challenge)

**No — and the question turned out to be about something else.** A variant is a BEM **class**
(FR-32-2 styles `.sgs-{block}--{variant}` from tokens); FR-32-8 requires the variant class *"and
NO inline colour/geometry style"*. Nothing flagged above is a variant.

The 9 sites split two ways, **both breaches**:
- **6 = per-instance styling values** (colours). Plain FR-32-4; fix is the standard scoped
  `.{uid}` rule.
- **3 = per-ITEM repeater data** (`--sgs-item-index` stagger, `--sgs-gr-pct` bar fill,
  `--sgs-item-aspect`), where one `.{uid}` rule cannot carry N different values. This *would*
  be a genuine spec gap — **except the compliant pattern already exists in-repo**:
  `social-icons/render.php:458` emits one `{$root_sel} .sgs-…__item:nth-child({$pos}){--var:…}`
  scoped rule per item, commented *"no inline style, contract"*. Copy that.

---

## Track 1b — Spec 35 inspector-UX standard

"BUILD SURFACE COMPLETE" **faithfully mirrors Spec 35 Part M**. The shared components really were
built (`ShadowControl`, `SgsLinkControl`, `MediaGalleryPicker`, `ResponsiveTriStateControl`,
`resolveTier` dual-runtime golden-tested) and Part K's gate is genuinely wired fail-closed as the
last of 24 prebuild steps. The question is whether Part M is accurate.

| ID | Finding | Evidence |
|---|---|---|
| **1b-1** | **⭐ Nothing in Spec 35 has ever been opened in the real block editor.** Part M says so itself: *"editor-CANVAS verification — everything to date verified by frontend render + REST attribute registration, never by opening the block editor"*, citing `ShadowControl`, which *"crashed on first live render despite 180 passing unit tests"*. The LEDGER carries the matching rule (D388: **two** editor-killing crashes shipped past ALL-GREEN gates). An ~18-package wave of `edit.js`/shared-component changes is unverified in the only surface clients use. | Spec 35 Part M, closing para |
| 1b-2 | **Spec 35 contradicts itself.** Part M: *"no remaining build items"*. Part I, same file: Spacing token control, Dynamic content, Reduced-motion gate each *"still open"*. | Part I rows |
| 1b-3 | **Per-block rollout (Part L) is thin:** `group` tab split **4/81**, `StateToggleControl` **3/81**, `hideExtensions` 26/81, ToolsPanel 20/81 with 7 dense panels flagged (worst `hero/edit.js:756`, ~20 controls). Not a Part-K failure — Part K never gated these. | greps across all 81 `edit.js` |
| 1b-4 | **The gate's roster was stale by 6 blocks** — scanned 79 of 81, listing 2 deleted (`adaptive-nav`, `mega-menu`) and omitting 4 real ones (`mega-aside`, `mega-group`, `mega-panel`, `nav-drawer`). **FIXED this session** by regenerating from the DB (the DB was already correct; `roster.json` is a generated artefact that was never re-run). | `build-roster.py` → 81 |
| 1b-5 | **T1 feature-parity: 140 gaps, unmoved since the 2026-07-19 baseline** — and `feature-parity-exceptions.json` has **zero** block entries, so none is explained. Neither `audit-feature-parity.py` nor `audit-shrink-to-fit.js` is in the prebuild chain. | both files read directly |
| 1b-6 | The DONE-checklist names a **non-existent "consistency-scanner"** as enforcer for 9 of 21 items, and credits the audit with a `group`-prop rule it lacks (`grep -c group` → 0). | `grep -rl` → 2 plan docs, no code |
| 1b-7 | **Part D4 carries a stale passage** claiming FR-37-14's four header behaviours *"are still flat `boolean`s"* — they are now `{"type":"object"}`. Part M says the opposite in the same file. | `site-header/block.json` |
| 1b-8 | FR-37-14 is genuinely BUILT, but **"live-proven" is prose only** — no visual-diff report, screenshot or harness output, unlike the drawer work which banked one. | `.claude/reports/` holds no FR-37-14 artefact |
| **1b-9** | **A latent bug in `build-roster.py`, surfaced by fixing 1b-4 and FIXED this session.** Regenerating the roster recomputed surface flags and flipped 18 blocks to `animation=true`, turning the fail-closed gate red with 18 `animation-no-reduced-motion` WARNs. **All 18 were false positives.** Cause: `build-roster.py:80` tested `"animation" in sgs_val.lower()` against the raw `supports.sgs` JSON — but `hideExtensions` is an opt-**OUT** list, so a block declaring `hideExtensions:["animation"]` (i.e. "do NOT give me the animation extension") was read as *having* animation. The same substring shape affected the `media` flag. Fixed by stripping `hideExtensions` before any substring match. Corroborating: none of the 18 has a `style.css` at all, and a genuine framework-wide gate already covers every block (`core-blocks-critical.css:69-78`, `*`/`*::before`/`*::after` + `!important`, enqueued unconditionally at `functions.php:233`). Post-fix: `animation` 36 → 18, gate **PASS**, and the 18 retained are the genuinely-animating blocks (hero/gallery/card-grid/container/media/…), all passing. | `build-roster.py:80`; `form-field-text/block.json` `supports.sgs` |

**Honest restatement:** *Spec 35's component layer and Part-K gate are complete; per-block
rollout (Part L) is 4–32% and ungated; T1 feature-parity untouched; the whole wave is unverified
in the editor canvas.*

---

## Track 1c — Spec 31 converter completion

**The LEDGER's three "NEXT" items were ~7 days stale — all three had been executed.** Canary
fixtures deployed 2026-07-23 (`oracle/fixture-canary-urls.json`, 35 live URLs); `check_landed()`
wired (`ledger/coverage_check.py:386`, called `:857`); a live verify ran 2026-07-24/25.

| ID | Finding | Evidence |
|---|---|---|
| **1c-1** | **⭐ By Spec 31's OWN completion definition, C2 is not met.** §5: *"Completion = every non-N/A cell is COVERED or explicitly BLOCKED …, zero CHEAT cells, **zero UNVERIFIED cells**"*. The committed artefact shows **36 UNVERIFIED**, 23 GUARD-FAIL, 8 NOT-RENDERED, 2 WRITTEN-not-LANDED, 393 unattributed. | `batch-report.json` |
| 1c-2 | **The completion claim has no committed artefact.** `batch-report.json` was last committed `1669a785` (2026-07-23); the fix `9babcfd5` landed 2026-07-25; `git status` on that dir is clean — it was never regenerated. The v0.6 "0 WRITTEN-not-LANDED" claim rests on a prose `seed_note` **inside the same commit that made the fix**. `96bfeb66` states plainly the run *"is NOT a green LANDED leg"* and that triage was the next unit; no triage artefact exists. | git log + git status |
| 1c-3 | `--with-landed` is passed by **nothing** — the LANDED leg never runs in the commit gate (`f5-commit-gate.py:41` omits it), so the green can rot silently. Documented as deliberate. | `coverage_check.py:1000` |
| 1c-4 | **FR-31-2.1a — the only FR with an explicit open marker**, but **INERT** by measurement (name-regex yields correct roles 9/9) with a designed 3-step closure. Architectural debt, not a live defect. | `specs/31…:585`; `P-FR-31-2.1A-CLOSURE` |
| 1c-5 | **§6 completion goals unmet:** goal 8 (parity rises) sits at content ~90% / CSS 67–69–76%; goal 4 (coverage matrix green) was blocked on COVERED/CHEAT classification *"pending the F3-RUNTIME LANDED leg"* — now landed, so newly actionable. | D276 block; §5:307 |
| 1c-6 | Three spec-declared open follow-ups: FR-31-21.2 auto-propagation `--apply` **build-pending**; FR-31-5.2's no-width media condition (`@media print`/`orientation`) still folds into the screen base + overlapping residual bands resolve by emission order; FR-31-22's `border-width` shorthand+longhand collision needs extraction-time expansion. | §13.6 / §13.4 / FR-31-22 |
| 1c-7 | The D372 **live BoxControl editor check** — never done, never recorded. Same class as 1b-1. | `decisions.md:826` |
| 1c-8 | Two stale comments misdirect: `coverage_check.py:371` reads *"LANDED leg placeholder (DEFERRED)"* directly above the armed function; `provision_fixture_canaries.py:16` asserts `check_landed()` *"stays deliberately unwired"* — false since the commit that added the file. | read directly |

**Fragmentation note:** five OPEN parking entries have the same residual — "LANDED proof owed"
(`P-INFOBOX-STAR-EMOJI-LANDED`, `P-RAWSVG-FILLED-VS-OUTLINE`, `P-NO-INLINE-LAND-ROSTER`,
`P-PRODUCT-CARD-BOUND-CTA-LANDED`, plus 1c-1). One unfinished thing, five tickets.

---

## Cross-cutting

- **`P-CLONING-DEPLOY-BLOCKED-SHARED-TREE` never existed** in `parking.md` or the archive, yet
  the LEDGER cited it twice — including as *the only thing blocking the next session* — while
  contradicting itself two cells earlier. It described an environmental condition (dirty shared
  worktree), not deferred work, and that condition is long gone. **Removed this session, not
  re-homed** (Bean-directed).
- **FOUR phantom slugs found this session — a CLASS, not a coincidence.** Beyond the one above:
  `P-UIMAX-ENFORCE-CREDIT-CLASSIFIER` (Spec 33, struck) and — caught only by an adversarial THIRD
  pass, after two sweeps had already declared the file clean — `P-F5-REMAINING` (D238) and
  `P-UNIVERSAL-RESPONSIVE-ROUTING` (D288). Both of the last two are benign once traced: F5's five
  named gates all SHIPPED (verified — they run on every commit), and the other was RENAMED to the
  still-open `P-RESPONSIVE-ROUTER-ROBUSTNESS` (`parking.md:467`). Annotated in place, not re-homed.
- `handoff-preflight.py --check` passes 6/6 including `no-dangling-links` — but that check
  inspects markdown *links*, **not parking-slug citations**, which is exactly how four of these
  survived. **A `P-[A-Z0-9-]+` resolution check belongs in that gate** — the cheapest durable fix
  for a failure mode that has now recurred four times in one session.

---

## What was FIXED in this session

| Fix | Where |
|---|---|
| Phantom blocker citation removed | `LEDGER.md` (Track-1c cell + Blockers), `decisions.md:826` |
| Track-1c cell corrected — 3 stale "NEXT" items replaced with the real open item (proof, not build) | `LEDGER.md` |
| Gate roster regenerated from the DB, 79 → **81** blocks | `scripts/consistency/roster.json` |
| Spec 35 Part F / Part M / Part D4 + DONE-checklist enforcement claims | see git log for this date |
| Spec 31 §12.6 stale passages + v0.6 claim marked artefact-pending; 2 stale code comments | see git log |
| `CLAUDE.md` "7/59" roster line + `#uid` → `.{uid}.{block}` (D303) | `CLAUDE.md` |

## Second pass (same day) — what was attempted after the audit

| Item | Outcome |
|---|---|
| **1c-1/1c-2 — Spec 31 C2 proof** | **RESOLVED-IN-PART (`aa45737d`).** Re-ran `oracle.batch_runner` against the live canaries and COMMITTED the artefacts. **`WRITTEN-not-LANDED: 2 → 0`** — the v0.6 claim was CORRECT, just unbanked. C2 still NOT closed on §5's terms (33 UNVERIFIED). The apparent LANDED 37→31 / GUARD-FAIL 23→33 shift is not a regression: **30 of 33 GUARD-FAILs are on the five `rt-*` red-team fixtures** built to exercise the known HIGH gaps. Method caveat: `batch_runner` only PROBES deployed pages. |
| **1a-2/1a-3 — the 9 inline breaches** | **CODE WRITTEN, NOT COMMITTED.** All 9 fixed (8 blocks); `php -l` passes, `phpcs` shows no new violations. **The SGS visual-diff gate correctly BLOCKED the commit** — the changes alter markup (removing `style` attributes), `check-markup-neutral.py` returns NOT-neutral for all 7 named blocks, and no build/deploy was available to produce honest visual-diff evidence. A passing report was NOT fabricated. Work banked as **`.claude/reports/2026-07-30-fr32-inline-fixes.patch`** and left in the working tree. |
| **1a-4 — the root-only gate** | **INSTRUMENT SHIPPED (`fefa3c4a`)** — opt-in `--deep` nesting-aware scan, 7/7 selftests incl. a negative control proving the root-only scan genuinely misses the same input. Left opt-in: the canaries are DEPLOYED pages, so arming it before the deploy would fail the build on already-fixed code and block a co-active track. |
| **Doc retirement** | **Nothing to archive** — verified. Archiving the five "LANDED proof owed" entries would contradict the audit that surfaced them; the four no-inline/box-object plan docs are contracts still being built against. One **second phantom slug** found and struck: Spec 33 cited `P-UIMAX-ENFORCE-CREDIT-CLASSIFIER`, present in neither parking file. |

### Two findings that only emerged by doing the work

1. **⭐ Fixing the inline breaches is NOT independently completable — it is COUPLED to the deploy.** The audit ranked it as separable from editor-verification. The visual-diff gate disproved that: any change to a block's rendered markup needs visual evidence, which needs a build + deploy. Points "fix the inline breaches" and "open the editor" are one session, not two.
2. **A naive widening of the no-inline gate manufactures false positives.** Attributing every styled descendant to its nearest SGS ancestor flagged 4 elements on palestine-lives that turned out to be **core WordPress blocks** (`core/heading`, `core/site-logo`) carrying WP's own inline serialisation — which FR-32-1 does not govern. The correct rule (shipped): attribute to the nearest enclosing block root of ANY kind; a core root shadows its SGS ancestor. The old root-only scope was not purely a blind spot — it was also a false-positive guard.
3. **Measured gate blindness:** 5 of the 8 blocks needing fixes (`countdown-timer`, `form`, `pricing-table`, `google-reviews`, `gallery`) appear on **no canary page**, so neither scan mode can verify them regardless of depth. That is `P-NO-INLINE-GATE-COVERAGE-GAPS` item 1 and needs a seeded canary page, not code.

### Also fixed this pass

- **`product-card` dead read** (pre-existing, found via IDE diagnostics): `render.php` read `$inner_padding` with **zero assignments** — leftover from the `innerPadding`→`cardPadding` migration (FR-31-22). Harmless in output (`sgs_container_gap_value(null)` → `''`) but raised a **PHP 8 "Undefined variable" warning on every render**. Deleted (in the patch).

---

## What is still OPEN (no parking entries created — this report is the record)

Ranked by risk:

1. **1b-1 / 1c-7 — open the editor.** An ~18-package inspector wave plus the owed BoxControl
   check, never verified in the block editor, against a project history of two editor-killing
   crashes that passed all-green gates.
2. **1b-9 — triage the 18 reduced-motion findings.** The gate currently exits 1.
3. **1a-2/1a-3 — 9 live FR-32 inline violations**, plus widening `check-no-inline.py` past
   root-only (1a-4) and triaging the 2 remaining non-injector writers (1a-5).
4. **1c-1/1c-2 — re-run the oracle batch + `--with-landed --check` and COMMIT the artefacts**,
   then triage the 36 UNVERIFIED / 23 GUARD-FAIL cells.
5. **1b-5 — 140 unexplained feature-parity gaps**; wire the audit into prebuild.
6. **1b-3 — Part L per-block rollout** (4–32%).
7. **1c-6 — three spec-declared converter follow-ups**; **1c-4** FR-31-2.1a closure (inert).

## Reproduce

```bash
# 1a — the inline emits the root-only gate cannot see
grep -rn 'style="--' plugins/sgs-blocks/src/blocks/*/render.php | grep -vE ':\s*(//|\*|#)'

# 1b — the gate, post-roster-fix
node plugins/sgs-blocks/scripts/audit-inspector-conformance.js --check

# 1c — the artefact vs the claim
python -c "import json;print(json.load(open('plugins/sgs-blocks/scripts/tests/fixtures/phase-f/_render-oracle/batch-report.json'))['cell_verdict_counts'])"
git log -1 --date=iso -- plugins/sgs-blocks/scripts/tests/fixtures/phase-f/_render-oracle/batch-report.json
```
