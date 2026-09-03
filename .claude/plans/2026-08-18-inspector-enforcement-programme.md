# Inspector enforcement programme

```
doc_type: plan
status: ACTIVE — Phase 0 CLOSED, 4 of 6 detectors shipped, commit-time trigger live,
                C1 design gate cleared (D677)
created: 2026-08-18
branch: feat/inspector-completeness (pushed; re-derive the count with
                `git rev-list --count main..HEAD` — never cache it here)
governing_spec: .claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md (v2.0, 2,685 lines)
                Spec-35 lettering (A4/A5/A8/CO-2/CO-28, Part O §1-§14) means THIS file.
governing_plan: C:\Users\Bean\.claude\plans\go-track-1b-playful-hamster.md
                Track 1b. Its A2/M3/D1-D6 entries and §3.4 are a DIFFERENT lettering
                scheme. Do not conflate the two.
supersedes:     C:\Users\Bean\.claude\plans\this-session-is-dedicated-pure-hearth.md
                (the pre-build plan; kept for its council record)
```

> **Every number in this doc was produced by running something.** Where a figure is
> inherited rather than measured, it says so. This rule exists because five instrument
> bugs surfaced in one day — see §6.

---

## Phase overview

| Phase | What it delivers | State |
|---|---|---|
| **0 — un-neuter the gates** | Every existing gate can fail; the corpus and ratchet exist | ✅ **CLOSED** |
| **1 — build the detectors** | 6 rules + the commit-time trigger | 🔄 **4 of 6 shipped; trigger ✅ live (D675)** |
| **1.5 — golden control schema** | The canonical SHAPE every control must have, as data (`scripts/consistency/golden-controls.json`) + rule 31 enforcing it + the commit-time trigger | 🔄 **schema ✅, rule 31 ✅ advisory (409), commit-time trigger ✅ live**, hover-helper (C1) design gate ✅ **CLEARED (D677)** — build ⬜ not started |
| **2 — hero** | The thirteen defects fixed, each with its gate | ⬜ not started (deliberately); **2 non-standalone repairs already landed** — 8 dead `gridItem*` attrs deleted (D672), rule 21 ratcheted 259→253 |
| **3 — rollout** | Every detector at `openBacklog: 0`, promoted to gate | 🔄 **2 of ~24 advisory detectors at `openBacklog: 0`** — `01-tab-group` (57→0, D933, 2026-09-03) and `21-render-without-control` (146→0, D933, 2026-09-03), both re-verified live via `node run.js --json`, neither yet promoted to gate mode (flagged as a candidate, not decided). Everything else in this phase (the Track B file-shard roster below, the seven stale-claim corrections, promotion decisions for the other ~22 detectors) is untouched. |
| **4 — correct the records** | 6 stale doc claims fixed | ⬜ not started |
| **5 — the golden-control audit (closing stage)** | One script enforcing colour + hover uniformly across every block, `sgs/button` the only exception | ⬜ not started; blocked on C1 → C2 (§7 Phase 5) |

Phases 1 and 2 are ordered that way on purpose: **a hero fix without its detector is the
thirteenth instance of the pattern this programme exists to end** (§3.2 — twelve fixes rotted,
and all twelve touched zero files under `scripts/`).

**Phase 1.5's rollout half needed a canonical `sgs_emit_state_colour_css` helper (C1)
before it could start, and that design gate is now CLEARED (Bean, D677).** Three blocks
currently implement hover colour three incompatible ways: `button` via CSS-var values plus
a static `style.css` rule, `info-box` via a per-instance scoped `:hover` rule, `card-grid`
via a third `--sgs-hover-*` scheme. The only genuinely shared hover helper today is
`sgs_border_gradient_css()` (`includes/helpers-tokens.php:1006`, 21 callers), and it covers
gradient borders only. `info-box`'s scoped-rule pattern is the Spec-32-compliant one — its
own docblock rejects the inline-var approach, citing FR-32-4 / D345 — so the helper
canonicalises on that shape, not a fourth.

**D677's three rulings, settled 2026-08-19:**

- **(a) emission shape** — `info-box`'s per-instance scoped `:hover` rule is canonical.
  Back-porting `card-grid` onto it is a **compliance fix**, not tidying.
- **(b) `sgs/button` is EXEMPT.** Its `--sgs-btn-*-hover` variables feed a static
  `style.css` rule (`:87-98`) AND three preset classes (`:104-130`) with `theme.json`
  fallback chains — a later reader must not "finish the job" and break the preset cascade.
  The exemption is recorded in the helper's own docblock, not left implicit.
- **(c) scope is colour only.** `sgs_emit_state_colour_css`, never a general
  `sgs_emit_state_css` covering transform/shadow — colour is the layer with a measured
  backlog (rule 31's 190 `row-below-minimum-states`); the other properties have none
  surveyed. Widening later is easy; narrowing a shipped helper is not.

**C1 → C2 → C3 is no longer blocked** — building the helper (C1), then the mechanical
conversion pass (C2), then the 22 blocks that need a colour panel created rather than
edited (C3), is now the next session's work with no open decision ahead of it. See Phase 5
(§7) for the closing audit that runs after C1 and C2.

---
## 1. Why this programme exists

Bean opened `sgs/hero` and found thirteen defects in its side panel. He asked the sharper
question: why did the scanners built for exactly these defects miss them?

**The answer, in one sentence:**

> The framework runs ~52 quality gates. Every one asks *"is what this block has correct?"*
> None asks *"does this block have what it should?"* Nothing checks that a past fix
> survives. And until today the whole chain ran only on a manual `npm run build`.

The governing plan reached the same conclusion a month earlier, in its §3.4: *"Each of
these was 'fixed' before in some block; the fixes were never enforced, so they regressed
or never propagated."*

**The client-facing stake.** The inspector *is* the product. Clients are tech-illiterate
and use the block editor exclusively. Bean's long-term goal is to be QC-only, which
requires the framework to catch these itself.

---

## 2. What already exists (build on this, do not rebuild it)

### 2.1 The rule engine — `plugins/sgs-blocks/scripts/inspector-scan/`

A finished framework. **Use it. Do not write standalone `check-*.js` scripts.**

| Capability | Where | Why it matters |
|---|---|---|
| A rule **cannot register without a self-test** | `run.js:99-105` — `loadRule` throws | No untested rule can exist |
| An **unregistered rule file hard-fails the build** | `run.js:172`, always enforced | "Built a detector, never wired it" is structurally impossible here |
| Shared AST cache | `core/sources.js` | One parse per file per run |
| Per-rule baselines | `core/baseline.js` | Mandatory human reason; seeded entries do **not** suppress |
| Fixture self-test harness | `core/selftest.js` | `mustFlag` / `mustNotFlag` per rule |
| Promotion advisory → gate | one line in `rules.json` | |
| `componentsDir` on ctx | added today, §5.1 | `src/components/*.js` is now reachable |

**Live state:** **22 entries** in `rules.json` — 2 are pseudo-rules (`roster-drift`,
`parse-error`), leaving **20 real rules: 7 gate** (0 findings) and **13 advisory** (383
findings). Free slots: **02, 05, 06, 09–13, 15, 16, 19, 31, 32**.

### 2.2 The gate chain

`plugins/sgs-blocks/package.json` `prebuild` — **52 segments, 0 advisory wrappers** as of
today. `build-deploy.py` adds no inspector gates of its own; it inherits this chain.

⛔ **There is no CI.** `.github/workflows/` does not exist. `build-deploy.py --skip-build`
still bypasses everything. **The commit-time trigger is now live (D675, commit
`0cd53fdb`):** `.githooks/sgs-gates.sh` runs `inspector-scan --check` when a staged path
matches `src/blocks/*/edit.js` or `src/components/*.js` — the surface every inspector rule
reads. Verified by running the hook: staging a `.md` does not trigger it, staging an
`edit.js` does, and lowering an `openBacklog` while staging an `edit.js` makes the hook
exit 1 with COMMIT BLOCKED. Before this landed, the whole rule set ran only on a manual
`npm run build`.

### 2.3 The data layer

| Source | Coverage | Use |
|---|---|---|
| `block_attributes.role` | **2,435 / 2,440 sgs attrs — 99.8%** | ⭐ the join key |
| `supports.sgs.elements` `label`/`order`/`clusters` | **307 elements, 83/83 blocks** ⚠ was 308 | the panel side |
| `scripts/consistency/roster.json` `surfaces.*` | 83 / 83 blocks | ⭐ **in-repo, DB-derived, regenerated in prebuild, staleness-gated** |
| `css_property` | 995 — 40.8% | secondary |
| `inspector_control_type` | 973 — 39.9% | secondary |
| `css_element` | 910 — 37.3% | ⛔ too sparse to gate on |
| `supports.sgs.elements` `contentAttrs` | **0 / 307** | ⛔ unpopulated; see §3.3 |

⚠ **Corrected 2026-08-19** — re-verified via `python scripts/surveys/survey-control-mounts.py .`:
`supports.sgs.elements` `label`/`order`/`clusters` totals **307 declared elements across 83 of
83 declaring blocks** (not 308 — the earlier figure was one over). §3.3's "308 declared
elements" carries the same stale figure and was not corrected here (out of this pass's scope).

The `role` vocabulary already separates content from style from behaviour: `layout` 598 ·
`color` 324 · `typography` 178 · `visual` 162 · `behaviour` 148 · `boolean-visibility` 145 ·
`select-from-enum` 121 · `technical` 111 · `text-content` 94 · `motion` 84 ·
`colour-gradient` 83 · `image-object` 76 · `content` 65.

⭐ **Block-equivalence is already a resolver:** `wp-blocks.py equivalent-block`
(Spec 22 FR-22-8, `db_lookup.equivalent_block_for()`).

⛔ **The canonical database lives OUTSIDE the repo** at
`~/.claude/skills/sgs-wp-engine/sgs-framework.db` (14.4 MB, 36 tables). Two **0-byte
decoys** sit inside the repo (`./sgs-framework.db`,
`./plugins/sgs-blocks/scripts/sgs-framework.db`). A relative resolve lands on an empty
file and passes clean forever. **Gate on `roster.json`, not on the DB.**

### 2.4 The control contracts

Spec 35 **Part O** holds **14 numbered control-type contracts** — colour, link, enum,
length/unit, 4-value box, state, media, boolean, free text, icon, shadow, responsive
wrapper, no-contract-yet, border. These are the schemas to make machine-checkable. Do not
invent new ones.

### 2.5 The shared panels

⚠ **Re-measured 2026-08-19** via `python scripts/surveys/survey-control-mounts.py .` (MOUNT
CENSUS `blocks` column). Two of the five prior figures were stale:
`SgsColourPanel` **61/83** (was 60) · `TypographyControls` 16/83 (confirmed) · `ShadowControl`
15/83 (confirmed) · `ResponsiveBoxControl` **48/83** (was 60 — the old figure over-counted) ·
`MediaPicker` **8/83** (confirmed; 13 mounts across 8 blocks; imported by path, not
barrel-exported). ⚠ An earlier draft said 9 — that conflated `MediaPicker` (8) with
`MediaGalleryPicker` (1), the multi-count trap §6 warns about; that warning still holds and the
survey confirms MediaPicker and MediaGalleryPicker (2 mounts / 1 block) remain distinct rows.
Every one is adopted by a developer typing an import and a mount. **No filter, HOC, flag or
DB row makes adoption happen or records that it is owed.** That is the root cause in §3.

---

## 3. Findings

### 3.1 The cause: adoption is a habit, not a mechanism

See §2.5. Nothing records that a block *should* have a panel, so "missing" is invisible.

### 3.2 Three amplifiers

**Hero fell between two tracks, and the roster is wrong.** Colour split into Track A
(block-owned, done) and Track B (wrapper-owned, never started). Hero was assigned to Track
B — but left the shared wrapper on 2026-07-09. It sits in neither. The roster is wrong on 3
of its 6 blocks: `cta-section` and `trust-bar` already migrated.

⛔ **Corrected 2026-08-19 — "Track B … never started" is no longer the honest description;**
**Track B is measured-as-invisible, not unmeasured-and-idle.** The shared wrapper panels
DO exist — `BackgroundPanel`, `ShapeDividersPanel`, `GridItemDefaultsPanel`,
`WrapperColourPanel`, all at `plugins/sgs-blocks/src/blocks/container/components/` — but
rule 31 (`plugins/sgs-blocks/scripts/inspector-scan/rules/31-golden-colour-control.js`,
~line 300) resolves its scan target as `path.join( ctx.blocksDir, block.tail, 'edit.js' )`
only, so it never reads a shared component directory. Consequently `openBacklog: 409` (§5.4)
is a FLOOR on the true colour-conformance backlog, not a total — Track B's colour surface has
never been run through rule 31 at all. Scheduled: extend rule 31 (or add a sibling rule) to
also scan the shared wrapper panels before Track B can be honestly called measured, let alone
started or complete.

**The gates could not fail, and mostly did not run.** Five segments were shell-neutralised
as `(cmd || echo [ADVISORY])`; three parsed `--check` then returned 0; **nine** advisory rules
carried **372** findings that never gated. (Today it is 13 rules and 383 findings — the four
new rules account for the difference. Do not mix the before-figure with the after-figure.) **All five wrappers and three exit-0 scripts are
fixed as of today.** The commit-time trigger that was missing when this section was
written has since shipped (D675, §2.2).

**Nothing checked that a past fix survived.** Commit `4a859e42` fixed the nested-panel
double-title by pairing `className="sgs-nested-tools-panel"` in `edit.js` with a hide rule
in `editor.css`. Two unrelated commits then deleted the className — `c5acba10` (a shadow
migration) from `button`, `f6f3c033` (the colour rollout) from `tabs`. Both passed a green
build. **A quarter of a fix vanished in four days**, because an orphaned CSS rule matching
nothing is not a syntax error, not a dead control, and not a style violation.

The wider pattern: four fixes stuck, and all four shipped **the gate in the same commit as
the sweep**. Twelve fixes rotted, and all twelve touched **zero files under `scripts/`**.

### 3.3 The per-element standard

**No element-grouping renderer exists.** Three hits for `supports.sgs.elements` across all
of `src/`, and all three are comments explaining why that file does not use it. The
manifest is a build-time artefact; no runtime code has ever read it.

Framework-wide: **308 declared elements, 29 exact-label panel matches, 1 fully conformant
block.** Half of all panel titles are property-family words — the shape A4 forbids at
Tier 1. No correlation with block age, `container_kind`, wrapper use, or element count.
Conformance is per-author accident.

⛔ **A4 is unimplementable exactly as written.** `contentAttrs`, the field it names as half
of a panel's contents, is declared by **0 of 308** elements and its specified generator was
never built.

### 3.4 ⭐ The colour / element rule — Bean-locked 2026-08-18

> **An element is anything that has, or earns, its own panel — a real, concrete,
> block-equivalent piece.**
>
> - **Root-level colours** (background, text, border) → the global **Colour** panel, first
> - **A panel-bearing piece** (hero's content column, media column) → its colour lives **in
>   that piece's own panel**
> - **Anything a child block owns** → **never appears in the parent**

Hero's headline, sub-headline and CTA are `sgs/heading` / `sgs/text` / `sgs/button`
InnerBlocks children that own their own controls. Under this rule hero needs about **seven
colour rows, not twelve**.

**This replaces the 308-row manifest as D4's population.** The manifest's 68 `isWrapper`
entries and ~90 `clusters: []` declaration-only entries are exactly the false positives the
rule excludes. Net gateable: **138 elements across 50 blocks**, derived by predicate, never
a hardcoded list.

⚠ **Not re-verified 2026-08-19 — flagged, not corrected.** No D4 script exists yet (§4 still
lists it "⬜ not built"), so this figure has no command that reproduces it; it was derived by
hand-applying the predicate above to the manifest, not by running something. Re-verification
attempted this session found no script under `scripts/` computing "138"/"50" for this rule (`git
grep -n 138` and `git grep -n isWrapper` over `scripts/` turn up unrelated hex colours and other
tooling only). Per this session's brief: leave the figure as-is rather than guess a replacement.
Whoever builds D4 should treat 138/50 as an unverified prior, not ground truth, and let the
built script's own count supersede it.

**Per-family placement was considered and rejected.** Splitting one piece's appearance
across a typography panel, a border panel and a colour panel means visiting three panels to
restyle one thing. Spec 35 CO-2 bans it; Kadence and Spectra both bundle an element's
colour, typography and spacing together.

⚠ `SgsColourPanel.js:26-32`'s docblock quotes Bean's 2026-08-14 rule; D622 refined it a day
later. **Correct the docblock, not the component.**

### 3.5 Hero, measured

126 attributes — 30% more than the next-largest block. `edit.js` 68 KB. Thirteen declared
elements; two have a matching panel. Nine hand-rolled panels. Zero colour UI: it is the only
block in the framework carrying a raw `DesignTokenPicker` with no `SgsColourPanel`, and its
`supports.color` key is absent entirely.

**Two of Bean's thirteen were not what they looked like.**

- **Split media had NOT reverted.** The per-tier Image/Video/SVG picker is live. But
  `hero/edit.js:588` gates the whole picker behind `splitImage?.url`, so **a fresh split hero
  offers no video or SVG until the client uploads an image they do not want.** A functional
  dead end, and Bean's original report was right.
- **Template mode works.** `hero/edit.js:443-446` wires it into `allowedBlocks`. Removing it is a
  design choice, not a repair. Safe to delete: zero hits in `render.php` / `save.js`.

---

## 4. What we are building

**Static-first, three tiers.** Build the deterministic layer as far as it goes; use the live
layer to keep it honest.

| Tier | Asserts | Gates? |
|---|---|---|
| **T1 Fingerprint** | an exact known-bad shape from a real defect | yes |
| **T2 Schema** | a control matches its Part O contract | yes, once baselined |
| **T3 Shape heuristic** | a structure worth investigating | ⛔ **advisory forever** |

⛔ **T3 never gates.** A heuristic promoted to a gate taxes legitimate work — which is how
nine advisory rules accumulated 383 findings nobody reads.

### The detector roster

| ID | Rule | Catches | State |
|---|---|---|---|
| D6 | **28-fix-durability** | a past fix silently deleted | ✅ **shipped, 0** |
| D1 | **29-duplicate-visible-label** | the same label painted twice, 2 mechanisms | ✅ **shipped, 8** |
| D3 | **30-raw-box-control** | banned lookalike primitive | ✅ **shipped, 0** |
| D7 | **33-ineffective-typography-selector** | a control that reaches nothing | ✅ **shipped, 3** |
| D2 | ~~`check-panel-expectations`~~ | ⭐ ~~a MISSING panel~~ | ⛔ **SUPERSEDED by 31-golden-colour-control** (✅ shipped, 409) |
| D4 | `check-element-panels` | one element, one panel | ⬜ not built |
| D5 | `capture-inspector-surface` | live editor oracle | ⬜ not built, never a gate |

**Why D2 was superseded, not built.** A binary "does a colour panel exist?" check conflates
three different defects — no colour control at all, core's NATIVE colour UI standing in for
one, and a control that exists but is non-conformant to the shape it should have. Proven on
D2's own 5-block candidate list (`buybox`, `container`, `hero`, `site-footer`,
`site-header`): on inspection it splits into two unrelated causes — `buybox` / `site-footer`
/ `site-header` have core's native colour UI as their *only* colour control, while
`container` and `hero` have neither. A single "missing panel" finding would have pointed at
the wrong fix for three of the five. Enforcement now measures *conformance to a schema*
(rule 31, below) rather than mere presence.

**D5 must walk states**, not snapshot one. D1–D4 all ask *"does the right JSX exist?"*, never
*"can a client reach it?"* Hero's split-media dead end is the proof: the picker exists,
correctly typed, and stays unreachable.

---

## 5. Progress

### 5.1 Phase 0 — CLOSED

| Step | Outcome |
|---|---|
| 0.1 measure the 5 advisory gates | 4 passed at exit 0; the 5th hid 3 stale overrides |
| 0.2 unwrap them | **all 5 unwrapped; 0 wrappers remain** |
| 0.3 `f5-commit-gate` DB | ⛔ **STRUCK — no defect existed.** All sub-gates resolve the real out-of-repo DB. Nothing changed |
| 0.4 exit codes | 3 scripts fixed, each proven able to fail |
| 0.5 components corpus | `componentsDir` plumbed; **purely additive** — advisory total 372 before and after |
| 0.6 advisory ratchet | live; ⛔ **self-check applied — correct the claim.** The code
enforces "debt may not go UP past a frozen number" (`run.js:189-209`), not "debt may only go
down". It does **not** self-heal: fixing a block lowers the live count but leaves
`openBacklog` frozen, silently accumulating slack. Proven today — deleting hero's dead attrs
dropped rule 21 from 259 to 253 and the build stayed green until the number was lowered by
hand |
| — 3 stale role overrides | retired, 381 → 378 entries |
| — surface counter | 2 over-counts fixed; site-footer 7 → 3 |

**The ratchet exposed two things nobody was watching.** Rule 21's debt had **doubled from
129 to 259**. Five other rules had cleared debt that was never recorded. Both directions
were invisible because `openBacklog` sat on 19 rule entries and nothing read it.

### 5.2 Detectors — 4 of 6 shipped

Each predicted its finding count before running, then matched:

| Rule | Predicted | Measured |
|---|---|---|
| 28-fix-durability | 2 | 2 → **fixed, now 0** |
| 29-duplicate-visible-label | 8 | 8 |
| 30-raw-box-control | 4 | **0 — the 4 were false positives** |
| 33-ineffective-typography-selector | 3 | 3 |

**11 real defects are now under enforcement**, including hero's seven dead typography
controls.

### 5.3 Rules 28 and 29 partition cleanly

Eight same-title `PanelBody`/`ToolsPanel` nestings exist tree-wide. Five carry the
`sgs-nested-tools-panel` marker and belong to **rule 28**, which guards whether an applied
fix survives. Three never received the fix and belong to **rule 29**. The two rules split
the defect class by lifecycle — never-fixed versus fixed-then-regressed — and neither can
see the other's half. This reconciles two earlier censuses that disagreed.

### 5.4 ⭐ The colour surface, measured (first honest census)

This is the first time the whole colour surface has been counted, and it is also the first
census taken *after* the gradient picker's crash was fixed the same day — until then nobody
had ever seen that UI working, so treat every gradient row below as newly-inspectable and
unverified against live behaviour.

- **83 `edit.js` scanned**: 60 mount `SgsColourPanel`; 5 mount `DesignTokenPicker` directly;
  1 mounts `GradientOverlayControl`; 22 mount none of the three
- **~226 colour rows total**: 174 single-state (83%), ~52 with ≥2 states (23%), **exactly 1
  with 3 states** (`sgs/tabs` `tab-bg`)
- **45 gradient-capable rows** (22%)
- **0 raw core `ColorPalette` / `PanelColorSettings` mounts** anywhere
- `supports.color`: **53 blocks declare it**, **26 have a live flag** (core renders its own
  UI), **23 of those also mount `SgsColourPanel`** (double-painted), **3 are core-only**
  (`buybox`, `site-footer`, `site-header`)
- DB: `role='color'` **364** + `colour-gradient` **89** = **453**; `css_state` **NULL 2311** /
  **hover 113** / **selected 16**

**Reference implementations to copy, not invent:** `sgs/button` (`edit.js:381-470`, 5 rows,
all 2-state, 3 gradient-capable) and `sgs/tabs` (the only 3-state row).

⚠ **The gradient rollout is now IN SCOPE, not parked.** `parking.md`'s
`P-GRADIENT-UNIVERSAL-ROLLOUT` entry needs closing or re-scoping — an item cannot be both
parked and in flight, and rule 31's `row-missing-gradient` finding kind (**193 findings**) is
now the measured backlog for it.

### 5.5 The golden control schema, shipped and standing on rule 31

`plugins/sgs-blocks/scripts/consistency/golden-controls.json` (D671, commit `cfd2aa16`)
now carries the canonical shape of a colour control as DATA — canonical components, banned
lookalikes, the native-core-colour fingerprint, minimum states, gradient-with-declared-
exemptions, scope predicate — so enforcement measures against data rather than prose. Only
colour is encoded in v1; the other 12 Part O contracts get a row when a rule needs one,
never speculatively.

**Rule 31 `31-golden-colour-control` shipped advisory** on top of it (D674, commit
`e5c47704`): **`openBacklog: 409`** across **64 blocks**, five finding kinds — `row-missing-
gradient` **193**, `row-below-minimum-states` **190**, `native-colour-ui` **26**,
`banned-lookalike` **0** (regression guard, proven failable), `roster-surface-unknown`
**0**. A real detector bug was found and fixed rather than baselined during shipping: the
first run scored `product-card`, `nav-menu` and `social-icons` at zero rows each because
all three build the `rows` prop indirectly (`.push()`, a separately-declared const, a
spread-of-conditional); the resolver was extended and now processes all 239 rows.

**The state vocabulary now lives in `golden-controls.json` itself, not
`cluster-member-sets.json` (D673, commit `fcbe90de`).** Measured: all four consumers of
`cluster-member-sets.json` read only its `clusters` and `order` keys — its `states` block
has zero readers, so it could not be a source of truth. `golden-controls.json` now splits
the vocabulary honestly: REAL versus NOTIONAL (`focus`, `pressed`, `disabled` — zero rows
anywhere).

**~~The rename is DEFERRED (D676)~~ ✅ SHIPPED SAME SESSION (D676 ruled it, D678 landed it).**
⚠ This paragraph said "deferred" and was not swept when the rename actually landed hours later —
caught by the handoff QC pass, and it is the only doc of the four canonical ones that disagreed.
Recorded rather than silently corrected, because "a written record is a claim, not ground truth,
even when you wrote it yourself" is the transferable part.

`selected` → `current` is DONE across all layers: the classifier's hardcoded strings, 4
`block.json` manifests, the derived classifications cache, the shared-DB reseed, the survey
script, Spec 35's SQL scope, and the `edit.js` UI literals (including `tabs`, whose visible label
followed on Bean's ruling). **Live DB verified: `current` 13, `hover` 115, `selected` 0.**

The blocking argument first given — that `active` collides with `pressed` — was weak (`pressed`
has zero DB rows and exists only in an unread block). The real constraint was that `css_state` is
a DERIVED column, so a direct `UPDATE` would be undone by the next reseed; the fix had to change
the derivation and then reseed. Step 5 (the reseed) touches other sessions' DB and was held until
Bean confirmed none was live.

**Two non-standalone repairs landed under rule 21's ratchet, each with the gate in the same
commit:**

- **`sgs/hero`** — 8 dead `gridItem*` attributes deleted (plus 2 `boxFamilies` entries and
  the `grid-item` element), proven dead by zero refs across `edit.js`/`render.php`/`save.js`
  and no reachable client path (D672, commit `a309638f`). Rule 21 `render-without-control`
  ratcheted **259 → 253**.
- **`sgs/site-header`** — 6 attributes deleted that could never render at all
  (`alignContent`/`alignItems`/`columns`/`flexDirection`/`flexWrap`/`justifyContent`,
  copy-pasted from the row block without the `layout` attribute the emit gate requires) —
  a class `check-dead-controls.js` cannot see, since it only catches the inverse (a control
  with nothing rendering it), not a control that never existed (D679, commit `d76651ef`).
  Rule 21 ratcheted
  **253 → 250**. The same audit recorded three findings on `contrastSafe`, transparent's
  scroll-state pair, and the header/row duplication (a naming problem, not redundancy) —
  none require code changes to this programme.
- **`sgs/nav-menu`** — the duplicate `selected` state that had mis-tagged 3 hover attributes
  (`itemColourHover`/`itemBgHover`/`itemRadiusHover` wrongly carried `css_state=selected`)
  was removed (D670, commit `4626fb31`); `submenuPadding` was tiered to match its sibling
  flyout surfaces (commit `27659122`) — a canary with zero stored values, so the fallback
  chain was proven by executing the helper, not by reading its source.

**Stage 1 reseeds but does not prune (D678, INCIDENT).** After hero's 8 deletions, a full
orphan census found **25** attribute-orphan DB rows — hero's 8 plus 17 pre-existing across
nine other blocks. The correct action was to prune all 25 (the F5/F6 DB-as-code gate had
already blocked the commit naming each of hero's 8 as a "rogue seed"), not to defer on the
reasoning that most predate this session — that reasoning was wrong, and the gate's
judgement was better. Fixed via Stage 9 (the sanctioned prune, dry-run first): DB attrs
**2440 → 2415**, orphans **0**, gate exit 0.

---

## 6. ⭐ Five instrument bugs in one day

Every figure produced by running something was right. Every figure reasoned about was
suspect. **This is the programme's most transferable finding.**

| # | Bug | Consequence |
|---|---|---|
| 1 | `<BoxControl[\s/>]` — multi-line JSX puts the tag at end-of-line | returned **1 instead of 16**; a false absence reading as a clean result |
| 2 | Rule 30 never opened `block.json` despite its docblock saying classification must be by storage shape | **4 false positives**; the "fix" would have silently dropped values |
| 3 | `ctx.cache.json()` returns an `{ok, error, data}` **wrapper**, not the parsed object | made every attribute look non-tiered, silently disabling rule 30 |
| 4 | AST line numbers compared against `strippedText()` line numbers — stripping a block comment removes its **newlines** and shifts every later line | produced **zero findings on hero**, the one block rule 33 exists to catch |
| 5 | The surface counter had **zero** occurrences of `initialOpen` and counted a `<Notice>` as a control | over-reported site-footer by 4 rows |

**The standing rule this earns:**

> ⛔ **No detector ships with a hand-counted baseline.** Declare an expected count before
> the first live run, run it, then reconcile the gap. Reconciliation is where the value
> is — rule 26 predicted 4, measured 8, and reconciling surfaced two real detector bugs.

Counts corrected by measurement this session: double-painted labels 12 → **5**; raw
`BoxControl` 12 → **0**; `BooleanResponsiveControl` mounts 9 → **7**; D4 population
~150/~55 → **138/50**; "178 orphan elements" → **no formula reproduces it, struck**.

---

## 7. What remains

### Build

1. ~~**D2 — panel expectations.**~~ ⛔ **SUPERSEDED, not built** — rule 31
   `31-golden-colour-control` (D674) does this job and does it better: it measures
   conformance to a schema instead of mere presence, so it does not conflate "no control",
   "core's native colour UI standing in", and "a non-conformant control" the way a binary
   panel-exists check would. See the detector roster (§4).
2. **D4 — element panels.** Population per §3.4's rule, not the raw manifest. ⛔ Do not gate
   panel **order** in v1: `brand-strip`, `product-card` and `trust-bar` carry duplicate
   `order` values.
3. **D5 — live editor oracle.** Standalone, never in `prebuild` (that chain is deliberately
   offline). Must **fail** when the canary is unreachable, never warn-and-pass.
4. ~~**The commit-time trigger.**~~ ✅ **SHIPPED (D675, commit `0cd53fdb`).** One segment in
   `.githooks/sgs-gates.sh`: staging a path under `src/blocks/*/edit.js` or
   `src/components/*.js` runs `inspector-scan --check`. Verified failing and passing both
   ways — see §2.2.
5. **Promote one existing advisory rule to gate**, proving the promotion path works before
   adding more to a pool that has never drained.
6. ⭐ **Two new standalone detectors exist, NOT yet registered in `rules.json` or wired into
   the `inspector-scan` framework** (built 2026-08-19; the main agent registers them — see
   the working rules in §10 on single-merge-point files):
   - **`scripts/check-inert-controls.py`** — catches a block attribute overwritten in
     `render.php` before use, so the client's control is visible but does nothing. **1 live
     finding:** `sgs/feature-grid` `layout` (CONDITIONAL — `render.php:156` overwrites it).
     Built by a subagent and required correction before it could be trusted: it shipped a
     self-test that exercised four helper functions and never called its own scanner, so
     breaking the detector's core matching pattern still passed self-test green.
   - **`scripts/check-undeclared-attrs.py`** — catches an attribute destructured in
     `edit.js` but never declared in `block.json`, which WordPress silently discards at
     render (the D338 pattern). **3 live findings:** `sgs/quote`
     `backgroundColourHoverGradient`, `sgs/text` `fontSizeMobile`, `sgs/text`
     `fontSizeTablet`. Also built by a subagent and also required correction: the first run
     reported 41 findings, of which 38 were false positives — it gated on `supports.style`,
     which is not a real WordPress supports key, and treated `className` as needing
     declaration when WordPress declares it by default.
   Re-verify: `python scripts/check-inert-controls.py --json` and
   `python scripts/check-undeclared-attrs.py --json` (both run clean today, post-correction).

### Phase 2 — hero, as a literal map of the thirteen

| # | Reported | Action |
|---|---|---|
| 1 | Panel out of date | none — versions are decorative |
| 2 | Typography not replaced | repoint `selectors.typography.root`, **as finding #1 of D7's sweep** |
| 3 | Template mode | remove (Bean-ruled); a deletion, not a repair |
| 4 | Wrapper leftovers | resolve `layout` / `gridItems` — see §8.1 first |
| 5 | No colour panel | mount per §3.4 |
| 6 | Shadow, one control | add `shadowColour`; 5-prop `ShadowControl` |
| 7 | Broken box icon | ⚠ **re-diagnose** — `hero/edit.js:1468` is the correct primitive |
| 8 | Not on one row | blocked; no rule exists. Feed D1's T3 tier |
| 9 | Duplicate labels | collapse; **recount by script** |
| 10 | Content fill | resolve three alignment controls; **name the outcome** |
| 11 | Indented panel | un-nest `803→809`; not deletable outright (11 of 22 carry `initialOpen={false}`) |
| 12 | Split media | **un-gate the picker at `edit.js:588`**; retitle |
| 13 | Wrong clustering | element panels per §3.4 |

⛔ **No standalone hero fixes.** Every change is finding #1 of its detector's sweep, fixed
with the gate in the same commit.

### Phase 3 — rollout · Phase 4 — correct the false records

Shard **by file, never by detector** (`product-card/edit.js` carries findings from two).
Correct: the Track B roster · `container/components/LayoutPanel.js:326` · `DesignTokenPicker`'s docblock ·
`SgsColourPanel.js:26-32` · `run.js:8` ("NOT wired into prebuild" — it is) · Spec 35's "5
sites" for raw `BoxControl` (the real figure is 0).

**Seven newly-found stale claims, all in Spec 35 unless noted:**

- Part O §1 field 9's "⚠ NOT YET BUILT — `DesignTokenPicker` has no state axis and no
  popover" — **STALE**; all three now exist (`DesignTokenPicker.js:205`, `:400-416`,
  `:289-317`)
- Part O §1 field 2's "`id` is REQUIRED and missing" — **STALE, fixed.** The identical
  claims for `IconPicker` and `ShadowControl` are still **TRUE**
- Part O §1 field 6's "49/50 conform, `sgs/star-rating` violates" — **STALE**; star-rating
  now mounts `SgsColourPanel` (`star-rating/edit.js:134`)
- "raw `GradientPicker` inside `GradientOverlayControl.js:191`" — **STALE**; it uses the SGS
  fork `SgsGradientPicker`
- `SgsColourPanel` is **never named** in Part O §1 despite being the 60-block vehicle for the
  rule §1 states
- Part O §6 names `StateToggleControl` as canonical and "verified adoptable today" —
  **FALSE**, and Spec 35:736 says so in the same document (0 JSX mounts across `src/blocks`)
- CO-15's "`check-duplicate-controls.js` exists and is wired to nothing" — **STALE**; it is
  wired into `prebuild` today

### ⭐ Phase 5 — the golden-control audit (closing stage)

**What it is:** one auditing script enforcing the now-unified colour AND hover controls
across every block, with **`sgs/button` as the only exception**. This is the programme's
closing stage — the point where "does this block have what it should?" is finally asked of
the whole library at once, not one detector at a time.

**Enforces three things:**

1. **Colour.** Every colour row conforms to `golden-controls.json`: canonical
   `SgsColourPanel` → `DesignTokenPicker`, minimum 2 states (normal + hover) extended by
   the element's DECLARED states, no banned lookalikes, no core-native colour UI
   double-painting.
2. **Hover.** Every block emitting hover colour goes through the shared
   `sgs_emit_state_colour_css` helper (C1), never a block-private mechanism. Today three
   blocks use three incompatible mechanisms; after C1 only one is sanctioned.
3. ⭐ **Gradient, MECHANISM-AWARE — the subtle part.** There are THREE gradient
   mechanisms and which is correct depends on what the row paints: a per-state toggle
   inside `DesignTokenPicker` (background / border / icon), `GradientCapableColourControl`
   (TEXT only — needs `background-clip:text`), `GradientOverlayControl` (whole-block
   overlay, single-state by construction). ⛔ A binary "does a gradient path exist?" check
   is INSUFFICIENT: a text row wired to the background mechanism would PASS while
   rendering nothing. The audit must check the row is on the RIGHT mechanism for its
   painted property. Rule 31's current `row-missing-gradient` kind is binary and needs
   this refinement.

**The one exception.** `sgs/button` is exempt from the hover-helper requirement (D677b) —
its `--sgs-btn-*-hover` vars feed a static `style.css` rule AND three preset classes with
`theme.json` fallback chains. ⛔ The exemption must be DECLARED IN DATA (an exemption entry
with a reason), never a hardcoded block name in the script — R-31-1 bans hardcoded dicts.

**Sequencing.** This stage runs **AFTER C1** (there is no unified hover mechanism to
enforce until the shared helper exists) **and after C2's conversion pass** (or it would
flag the entire backlog as violations on day one). Do not build it before both.

**Completion conditions** — §9's per-detector conditions apply to this one exactly as to
any other: expected finding count declared BEFORE the first live run, by a method
independent of the script's own code, then reconciled against the measured result;
`--self-test` with at least one negative control that genuinely fails; registered in
`rules.json` in the same commit as the rule file; ships ADVISORY, never promoted on the
run that introduces it; a false positive is a detector bug, never baseline fodder (§10).

---

## 8. Open decisions

1. ~~**Hero's orphaned `gridItem*` attrs** — mount the panels, or delete?~~ ✅ **RESOLVED —
   deleted (D672, commit `a309638f`).** Proven dead first (zero refs across
   `edit.js`/`render.php`/`save.js`, no reachable client path, render gated behind
   `'grid' === $layout` with no path writing `layout`), not deleted blind. §7's original
   caution stands as a genuine residual: **the cloning converter still writes them**
   (`converter/resolvers/grid.py:187`, `services/arrangement.py:154`), so a cloned hero can
   still receive `gridItem*` values that WordPress silently discards (the D338 pattern)
   until the converter's DB-derived GRID destination is reseeded via `/sgs-update` — a
   shared action across tracks, deliberately deferred rather than done inline.
2. **`sgs/site-header` — 5 default-visible rows against FR-37-27's cap of 3.** Still open.
   The cap is sound and the counter is now correct. Bean's 2026-08-13 F2 ruling kept exactly
   two visible (Header width, Sticky on scroll); `BackgroundPanel`, `minHeight` and `Layout
   preset` drifted in afterwards. Which three move behind disclosure is a client-facing UX
   call. `BackgroundPanel` is a major control. **A separate audit of the same block landed
   the same day (D679, commit `d76651ef`) but does not resolve this question** — it deleted
   6 attributes that could never render at all and recorded three findings
   (`contrastSafe` silently rewriting an explicit "None"; transparent's scrolled colour
   being hardcoded and not client-reachable; header/row duplication being a naming problem,
   not redundancy, so neither side is safe to delete). None of the three closes the
   visible-row-count question above.
3. **WP 7.1 landed 19 Aug 2026.** T1 fingerprints pin to core internals (`BoxControl`'s
   unconditional label; `.components-tools-panel-header > h2`). Add a `wpVersionVerified`
   field and re-check after the bump.

---

## 9. Completion conditions

### Per detector

- `--self-test` passes with **at least one negative control that genuinely fails**
- `--survey` covers all 83 blocks with **no `head -N`** anywhere
- expected finding count **declared before** the first live run, then reconciled
- registered in `rules.json` **in the same commit** as the rule file
- carries a `retireWhen` condition — no rule registers without one ⛔ **STALE, self-check
  applied: no `retireWhen` mechanism exists anywhere in `scripts/`.** No rule has ever had
  one. This is an open programme-level gap — either build the mechanism or drop the
  condition from this list; do not keep asserting a condition nothing enforces

### Per phase

- **Phase 0** ✅ zero advisory wrappers; every gate proven able to fail; prebuild exit 0
- **Phase 1** all 6 detectors registered and advisory-clean; commit-time trigger live; one
  existing advisory rule promoted to gate
- **Phase 2** **all thirteen ticked by eye in the live editor**, before/after screenshots,
  panel list saved to `reports/`. Not a green build
- **Phase 3** every detector at `openBacklog: 0` and promoted to gate

### Programme

Bean stops finding these by photographing his own screen.

⛔ **Never close a step on a green exit code.** On this repo an aborted deploy and a dropped
stash both reported success.

---

## 10. Working rules earned here

- ⛔ **`git grep`, never `grep -r`** — stale worktrees inflate counts.
- ⛔ **Use `\b`, not `[\s/>]`** — multi-line JSX puts `<Component` at end-of-line.
- ⛔ **Never pipe a population-defining survey through `head -N`.**
- ⛔ **A false positive is a detector bug, never baseline fodder.** Both times it came up —
  duplicate-controls' clear-the-sibling ternary and rule 30's third shape — fixing the
  detector was correct and baselining would have hidden real information.
- ⛔ **Prove the cause before the fix.** Rule 28's two findings looked like "restore the
  deleted marker". Reading the original commits proved the structures those fixes targeted
  had been legitimately removed, so the correct repair was deleting dead CSS. Restoring
  `button`'s marker would have hidden a label whose title now differs from its parent.
- ⛔ **Read a gate's header before calling it broken.** `check-editor-only.py`'s skip is
  deliberate and carries six rules with positive and negative controls.
- **Main agent owns `package.json` and `rules.json`.** Both are single-merge-point files.
  Agents deliver a rule file plus a registration string.
- **No agent runs a build** (`clean:build` does `rmSync('build')`), **edits a shared JSON**,
  or **mutates a repo file as a fixture** (D659).
- **The build goes red between "agent delivers a rule" and "main registers it"** —
  registry-drift is always enforced. Expected; register promptly.

---

## Out of scope

Named so nobody re-derives them, and so a deferral is never mistaken for an oversight.

- **The three-tab inspector bar.** Built, live-verified, merged, then reverted on Bean's call
  (D592→D593): *"it doesn't actually add any functionality or bring us closer to our uniformity
  or cloning goals."* Do not resume without Bean asking.
- **Hero split-media as an `sgs/media` child block.** Attempted twice, reverted twice, then
  DROPPED by ruling (D599) — not deferred. The per-device type-picker already delivers most of
  the practical benefit.
- **The cloning converter and the DB seeder.** Cross-track. `wraps_block` / `container_kind` are
  read by `converter/db/db_lookup.py`; changing what the seeder writes needs its own design gate.
- **Block version bumps and deprecations.** Banned pre-production (D293).
- **Panel ORDER as a gate.** The policy is ruled (element-first, visual order) but three blocks
  carry duplicate `order` values, so the data cannot support a gate yet. D4 v2.
- **`contentAttrs` population.** A4's content half needs a generator that was specified and never
  built. Until it exists, D4 verifies panel existence and naming, never content-completeness.
- **Raising the Simple-surface cap.** FR-37-27's cap of 3 is sound; the counter was wrong and is
  fixed. `site-header`'s overage is drift past Bean's own curation, not a cap problem.
