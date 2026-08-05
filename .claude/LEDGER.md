---
doc_type: state
project: small-giants-wp
last_updated: 2026-08-05
note: "THE single living-status doc. Status is REPLACED here each session, never appended. History → dated snapshots in memory/session-YYYY-MM-DD*.md (the ledger-rotate Stop hook snapshots automatically past the cap but NEVER edits this file — the sweep is manual). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep this file lean (< 24,576 bytes)."
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary

### FOR BEAN — plain English (read this first)

**What this is.** One file that answers "where are we and what's next", so a fresh session (or you)
gets ONE true answer instead of three drifting ones.

**Where 2026-08-05 left things, in a sentence each:**
- **The framework now understands 251 more of its own settings than it did this morning** — 661
  unclassified down to 410. Every one worked out by a rule, none typed in by hand, so the same rules
  keep working on new blocks without anyone maintaining a list.
- **Clients can finally set header and footer spacing on phone and tablet.** The controls existed in
  the code but were wired to nothing, so the setting silently did nothing.
- **The logo block was quietly losing your chosen logo in the editor** — it looked fine on the live
  site, but reopening the page showed an empty slot. Fixed.
- **A safety check that was written months ago had never actually run.** It is now wired into every
  build. Separately, another safety check stopped today's deploy from deleting settings off two
  pages — it caught a mistake my own checking had missed.
- **69 settings still need a human decision** — that is the first job next session, and they are
  listed with what to do about each.

**Older, still true:** WebGL is officially in the framework (Tier W, budgeted, closed list) · the
physics canvas block is live on the test site, decorative only · the Snooza job is 72 combinations,
not 24 · ⛔ GSAP's licence has a clause worth knowing before you sell a plugin built on it.

## CURRENT FRONTS

> **D-ceiling 496** — re-measure before writing any D reference, never trust this line.
> D491-D496 (2026-08-05) = the Step 0 close: tier inheritance, `styling` + `technical` roles,
> Detector 4, the never-wired pattern-attr gate, responsive-logo image shape, header/footer box
> spacing. (2026-08-04 QC-bypass: CLEARED, nothing fabricated —
> `reports/2026-08-04-step0-qc-bypassed-reverification.md`.)

### Track 3 — Tier W ADMITTED · physics-canvas SHIPPED · nine reports consolidated (D479)

**Pushed: `50c9122b` (physics-canvas) · `19d4d33f` (Tier W/D479 + Snooza) · `09960945` (gap register)
· `3a581721` (council fixes) · `faa1652f` (spec staleness).** Full narrative (proof-for-every-claim
table, licence detail, hand-authored-fixture correction): `memory/session-2026-08-03-track3.md`.

- **Tier W (WebGL) ADMITTED — doctrine now V/G/H/W** (D479, Bean-approved 4/4). 120KB
  Tier-W-pages-only budget; OGL wrapped for swappability; no-WebGL falls back to Tier V.
- **`sgs/physics-canvas` shipped + seeded**; **`sgs/google-reviews` WCAG 2.5.7 + reduced-motion
  sweep** (google-reviews/trustpilot/post-grid all 17/17 live).
- **Master gap register** — nine reports consolidated: `plans/2026-08-03-motion-gap-register.md`.
- ⛔ **GSAP is NOT MIT** (SPDX `NONE`; Prohibited Uses bans visual-motion-authoring tools competing
  with Webflow — exposes the 299/yr Configurator Pro, not client sites; MIT escape hatch: Motion,
  anime.js v4). ⛔ **LYGIA is Prosperity-licensed** (commercial = 30-day trial).
- ⛔ **A stale spec (Spec 38) made a fresh audit recommend re-fixing already-working code** —
  fixed `faa1652f`. Treat every "known defect" in any register as a claim with a date on it.
- ⚠ **Snooza product data CORRECTED by Bean:** 4 sizes x 6 colours x **3 headrests = 72 SKUs**
  (not 24); two accessories are NOT booleans. Assets: `sites/snooza-chair/assets/`.


### Tracks 1b / 1c / 2 / 2+2b — stable · **Track 1 MOVED 2026-08-01 (D437–D439)**

Per-sub-track status (one line each) + the pointer that owns the full narrative — read the pointer
before acting, do not assume it is current from memory alone:

- **⭐ Track 1 — ROUTING AUDIT COMPLETE + tier axis SHIPPED 2026-08-03 (D480).** Content tier axis
  is live (597 pass/1 skip) but does not yet reach `splitImage` (`scalar-media` blocks it from the
  content walk — Spec 35 prerequisite). Live parity: content 99%, CSS 83/84/89% (worst mobile).
  Registers: `.claude/reports/2026-08-02-pipeline-routing-review.md` +
  `.claude/reports/2026-08-03-handover-to-spec35-block-attribute-defects.md`.
- **Track 1 — Phases 0/1/1b/2/3 COMPLETE 2026-08-02 (D464, D470–D478). Phase 4 PARTIAL; Phase 5 OPEN.**
  Full narrative: `memory/session-2026-08-02-track1-phase1.md` + `-phase0.md`.
- **⭐ Track 1b (Spec 35) — STEP 0 CLOSED 2026-08-05. `role IS NULL` on `sgs/%` 661 → 410 (251 rows
  classified, ZERO hand-authored overrides).** Four deterministic mechanisms shipped + `/sgs-update`
  run + deployed and live-verified on the canary. Commits `6992e47e` `2d413758` `ddab201c`
  `36df6561` `801a076a` `40273154` `580f7885` `12931409`. Detail below under NEXT SESSION.
- **Track 1b (Spec 35) — ENFORCEMENT SESSION 2026-08-04 (D481–D484).** Measured: 0 of 24 end
  conditions have a script validated to cover all instantiations (1 enforced/8 partial/4 vacuous/2
  unwired/9 absent). Full narrative + 5 corrections: `memory/session-2026-08-04-spec35-enforcement.md`.
- **Track 1b Task A (2026-08-04, D485-D490)** — superseded by STEP 0 CLOSED above. Full narrative
  swept to `memory/session-2026-08-05-spec35-step0-close.md` (which also carries the corrected
  `authored-alt-text` retirement condition).
- **Track 1c (Spec 31 converter completion):** build shipped; open item is PROOF not build —
  `batch-report.json` reads 33 UNVERIFIED. `plans/2026-07-22-spec31-completion-to-100.md`.
- **Tracks 2+2b (nav/header/footer merge):** 5-wave plan landed (D413), Wave 1 CLOSED, Wave 2 in
  progress. `plans/2026-07-29-merged-spec36-37-track-strategic-plan.md`. Task 5 (drawer variants)
  REJECTED by Bean 2026-07-29 (`memory/session-2026-07-29-task5-drawer-rejection.md`).

---

> **Independent review beats self-review — twice now.** 2026-08-03: a rater caught two stale figures
> self-review missed. 2026-08-05: a doc subagent flagged a stale reference, and chasing WHY found the
> responsive-logo work sitting inert in the DB. Don't skip the second pair of eyes.

## Standing constraints (carry forward — these are rules, not history)

**MOVED to `STOP-CATALOGUE.md` §E1 (2026-08-05 sweep) — 23 rules, verbatim.** Read before touching
Track 1/DB, sticky/axe/template-lock, or block versioning. Headline: **"IT FUNCTIONS" IS NOT "IT IS
SAFE"** (100% routing accuracy target) · no block version bumps/deprecations pre-production (D293).

---

## State Snapshot

### Live status (machine-checkable — verify, don't trust the cache)

- **Branch:** `main`. **Shared worktree** — a co-active track commits between handoffs and holds
  uncommitted WIP. Commit by EXACT PATH, never `git add -A`; never touch another track's
  uncommitted files.
- **Verify every session, no cached line is authoritative:** `git log -1 --stat` + `git status` +
  `git branch --show-current` · D-ceiling `grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`
  (**heading-anchored on purpose** — the old unanchored form reported D5557 on 2026-08-01 by matching
  the hex colour `#0D5557`; true ceiling was D453)
  (currently D496 as of 2026-08-05 — re-check live BEFORE writing any D reference; this line has
  drifted before and will again) · framework
  counts via `/sgs-db` or `/wp-blocks`, never cached in prose.
- **Canonical specs:** cloning = `specs/31-UNIVERSAL-CLONING-PIPELINE.md` (read IN FULL each
  cloning session). Motion = `specs/38-SGS-MOTION-SYSTEM.md`. Nav = `specs/36-...`; header/footer
  = `specs/37-...`. Full roster: `specs/README.md`.
- **Sites:** staging/dev = palestine-lives.org. staging/canary = sandybrown-nightingale-600381.hostingersite.com.
  Both WP 7.0.2 (verified 2026-07-20 over SSH on both).
- **Fixtures on the canary (not assumed clean):** motion 2083/2086; mega page 1762, panel 1745,
  menu 100, item 1746; header CPT 1570, footer CPT 1654.
- **Latent + open (not blockers):** Mama's `#e68a95` text-contrast (`P-MAMAS-PRIMARY-CONTRAST`) ·
  two unnamed `<main>` landmarks · both sites GENERIC proof headers · FR-37-36.

---

## Product queue (the website-builder work)

**LIVE backlog:** `plans/strategy/product-queue.md`. Holds the Indus core→SGS migration (A/B/C),
sequenced header/footer goals, Track B reconciliation. Reconcile before acting.

**Standing programmes:** no-inline SUPPORTS migration complete, but 11 inline FR-32 sites across
9 blocks found 2026-07-30 (`reports/2026-07-30-track1-verification-audit.md`, 1 still live:
`cta-section:333`) · Spec 30 (WooCommerce) COMPLETE (D220) · L1–L4 DONE (D290). Parked, not ours:
`P-CONFORMANCE-GOLDEN-DRIFT`, `P-ARCHIVE-PRODUCT-WC-VALIDATION`.

---

## Pointers

| For | Read |
|---|---|
| Structural defences (STOP catalogue + pre-flight ritual) | `STOP-CATALOGUE.md` (uncapped, D101) |
| Spec roster + DEAD-never-cite list | `specs/README.md` |
| Decisions (D-numbered, INCIDENT/ROUTINE tagged) | `decisions.md` (+ `memory/decisions-archive.md`) |
| Parked work (OPEN/PARTIAL/BLOCKED/DEFERRED only) | `parking.md` (+ `memory/parking-archive.md`) |
| Prior sessions' full narrative | `memory/session-YYYY-MM-DD*.md` + `memory/state-archive.md` |
| Build / deploy / SSH / credentials / gotchas | `dev-setup.md` · deploy = `build-deploy.py --target sandybrown\|palestine-lives` |
| Goals + exit criteria | `goals.md` |
| Hook off-switches | `.claude/secrets/hook-off-switches.md` (gitignored) |

## Blockers

**NONE.** `--target palestine-lives` still aborts on the `oldshape-audit` (29 NEW HIGH / 28 posts,
evidence: `reports/2026-08-01-palestine-lives-oldshape-blocker.md`), but **palestine-lives is
disposable Indus staging that gets remade — not production**, so this blocks nothing that matters
and the rebuild clears it for free. Fixer if ever needed: `scripts/wp-migrate-oldshape-blocks.js`.
The canary is unblocked and current.

---

## NEXT SESSION (Track 1b / Spec 35) — orchestrate, don't do inline

### THE GOAL — why this track exists (state it before picking up any task)

**Bean's clients are tech-illiterate and use the block editor exclusively.** Spec 35 exists so every
SGS block's inspector is genuinely usable by them: controls that exist for things the block can do,
no controls for things it cannot, nothing that crashes, and one consistent shape across all 84
blocks. A setting that needs code is not done. The 24 end conditions are only worth having if
ENFORCED — measured 2026-08-04 at **0 of 24 validated**. Task F closes that gap; A-E settle block
architecture first so F is written once.

### STEP 0 — CLOSED 2026-08-05. `role IS NULL` on `sgs/%` **661 → 410**, zero hand-authored overrides.

Bean's steer ("check for a deterministic signal before writing overrides") paid off: every one of the
251 rows was classified by a mechanism, not a hand entry. Four shipped:

| Mechanism | Where | Effect |
|---|---|---|
| **Tier inheritance** | `extract-signatures.py` | `<base><Tier>` inherits its base's `css_property` + `css_tier`. 151 rows |
| **`styling` role** | `roles.json` + `assign-canonical.py` | Backstop for `css_property` set, no family role. 124 rows |
| **`technical` role** | same | Machine-facing values, positive evidence only. 59 rows |
| **Detector 4** | `content-role-detect/detector4_referenced_not_output.py` | "read by code, never escaped, never CSS". 42 rows |

Precedence is structural, not commented: content tiers > `css_property` > evidence-of-not-content >
NULL. `technical` is deliberately narrow — rows NO detector reached stay NULL, because "unreached"
and "proven technical" are different facts and merging them rebuilds the ambiguity the role removes.

**Also shipped:** `gap` = a GRID-element property (Bean's ruling) — explicit `attrMap` on
google-reviews + trustpilot, 32 rows, 12 of them resolved automatically by the tier rule. Emission
parser no longer collapses multi-element `css_element` evidence. `check-dead-pattern-attrs.py` WIRED
into `prebuild` — built at D338 against WP's silent attr-discard, it had **never run** (zero
references in `package.json`). `check-dead-controls.js` CHECK 4 added (advisory) for attrs with
neither a control nor any consumer.

**Blocks shipped + live-verified on the canary** (`12931409`, reports in `reports/visual-diff/`):
`responsive-logo` (prefix→suffix rename + `logoUrl*` string attrs mirroring `sgs/media`, so
`image-alt` fires natively), `site-header`/`site-footer` (32 flat scalars → 8 box-objects, Spec 32),
12 dead `direction`/`wrap` attrs removed from 6 blocks.

⛔ **LEDGER CORRECTION.** This file previously recorded the responsive-logo **rename** as the
retirement condition for `authored-alt-text`. Wrong, and verified wrong AFTER the rename: renaming
changed no `attr_type`, and `walk.py:295` gates alt capture on `role=='image-object' AND
attr_type=='string'`. It is the **attr-shape change** (`logoUrl` string attrs) that retires it.

### STEP 0.1 — the 69 rows that need a human call (FIRST TASK NEXT SESSION, Bean's instruction)

Re-run `fingerprint_content_roles.py`; still **69** on 2026-08-06.

⚠ **ALL 4 BUCKETS ROOT-CAUSED — verdicts exist, NOTHING APPLIED.** Per-row calls + file:line in the
2026-08-05/06 agent reports. Re-investigating is waste; APPLYING is the work. Apply by MECHANISM,
not hand overrides (D497); `technical` may be assigned ONLY from a D1 veto, so the 13 report-only
rows need D1 to REACH them.
⚠ **0.1 CANNOT CLOSE BEFORE 0.2** — `whatsapp-cta.phoneNumber` + `.message` both wait on 0.2's
`link-content` extractor. 67 of 69 independent; those 2 hard-blocked.

| Bucket | Rows | What to do |
|---|---|---|
| **Wrapper-rendered styling** | 33 | ⛔ **"declare an attrMap" is WRONG for ~10 rows (2026-08-05).** `shapeDividerTop/Bottom` pick an SVG PATH not a CSS prop → `select-from-enum`. `trust-bar.gridItemBorder` is DEAD (items are `__badge`, never `.sgs-container`). `overlayGradientTo` can't share `css:background-image` with `From` in a flat map. `container`/`cta-section` declare a deliberate `decorative` opt-out — extend it. Only `*Colour` is the plain attrMap case |
| **D4 needs review** | 32 | Technical OR styling painted later via a variable — separating them needs D1-style variable-flow analysis. `anchor`, `sgsCustomCss`, `justifyContent`, `rowSlot`, `customWidthUnit`, `orderBy`, `contentIconName`, `gradientColourStart/End`, + ~17 singletons |
| **Report-only (D2-only)** | 13 | Needs corroboration: 8× `fieldName`, `formName`, `excludeKeywords`, `posterAlt`, `drawerRef`, `schemaItemName`, `whatsapp-cta.message` |
| **Content gap** | 1 | `whatsapp-cta.phoneNumber` — waits on the `link-content` extractor below |

### STEP 0.2 — three residuals, each with its blocker already identified

1. **`sgs/multi-button` rename — PHASE A SHIPPED (`1d13997d`), PHASE B outstanding.** Both names are
   now declared; render.php reads new-first-legacy-fallback; the attribute-RENAME driver is BUILT.
   **Phase B = migrate posts 1596 + 2130, then delete the legacy declarations + fallback arms.**
   Blocked on `wp-login` rejecting the driver after its first successful run (reads as a lockout;
   stopped rather than risk the account). Full detail + steps:
   `reports/visual-diff/multi-button-2026-08-05.md`.
   ⚠ Stored legacy values are HARMLESS meanwhile — they are declared, so nothing is discarded.
2. **`link-content` role + extractor** — the CAPTURE half shipped (`580f7885`): render.php's URL
   template is recovered structurally into `output_signature.link_template` (no new column — Bean's
   call; `default_value` is occupied and `description` is prose). The EXTRACTOR is NOT built and the
   role is deliberately NOT seeded. It was drafted against an assumed `extra` parameter; the real
   signature is `extract_field_value(element, role, media_map=None)`, so it would have raised
   `NameError` on first use. Threading the template through changes a shared converter entry point
   used by both `array_content` and `scalar_content` — read Spec 31 §3.B.0 first. Covers
   `phoneNumber` AND `message` (Bean's scope call).
3. **Case mismatch `extract-signatures.py:1634`** — `base_candidate = prefix + suffix` builds
   `"" + "Gap"` = `"Gap"`, never matching a bare lowercase attr, silently disabling the
   prefix-convention path. `sgs/container`'s own `grid` `_note` documents the same limitation.

**Only after Step 0.1/0.2** move to Tasks B-F below.


### Tasks B–F, in order (per checklist `.claude/plans/spec-35-inspector-DONE-checklist.md` items 22-27 + Task-F bar)

| Task | What / Why | Est. | Orchestration | Depends on | /qc gate | Acceptance |
|---|---|---|---|---|---|---|
| **B** | Hero-background design gate. Collision gate proved a FOUR-block class (hero/container/cta-section/trust-bar). Bean's identity-rename lead (D484): distinct DRAFT-side selectors per colliding attr (`__background-image`/`__background-video`/`__background-svg`; `__image` vs `__poster`). Data-only, no schema change. | 20 min | Inline, Opus — Rule 7 design-gate (shared-mechanism) + `/qc-council` BEFORE building. | Step 0 | `/qc-council` pre-build | `check_content_attr_collisions.py` reports 0 genuine groups |
| **C** | Migrate the 6 existing gating rules into `inspector-scan`. The one step that can LOSE enforcement while reading green. | 30 min | Delegated, sonnet. Brief: run old + new rule sets side by side, diff finding sets, explain every delta in writing BEFORE deleting anything; delete old scripts in a separate later commit. | Step 0 | `/qc-inline` on the diff | Delta explained per-finding; old scripts deleted only after zero unexplained deltas |
| **D** | Flip advisory rules to fail-closed, one at a time. Each rule flips only when its backlog is zero AND fixtures cover the dominant real shape. | 15 min/rule | Inline — judgment call per rule, not mechanical. | C | n/a (self-test per rule) | Backlog=0 proven, not asserted; flip recorded in `decisions.md` |
| **E** | ⛔ **STRUCK — superseded by D497 (2026-08-05).** `supports.sgs.attrRoles` would RELOCATE hand declarations into 84 block.json files, not reduce them; the override file is already that channel. Goal is to make it irrelevant: 26 hand roles left of 67. Do NOT build. | — | — | — | — | Deleted, not deferred |
| **F** | Build the 24 enforcement scripts — the track's actual deliverable. Scope: 21 remaining (items 2-17, 19, 21 + T1/T2/T3); items 1/18/20 exist on `scripts/inspector-scan/` — do not start a new tool. | 30-60 min/rule | Delegated per rule, sonnet, `/subagent-driven-development` (implementer + 2 reviewers) — each rule is independent once B/E settle. | A-E settled | `/qc-council` per rule before fail-closed flip | Each of 24 rows meets the DEFINITION OF ENFORCED below, or a recorded exception naming a D-number |

⚠ **Why F is last (Bean's ruling):** A/B/E decide block structure; rules written before them get
rewritten after. Every new universal rule also enlarges the drift surface F exists to contain — so
architecture settles, then enforcement is written against it once. Re-read the checklist against the
settled architecture before writing F.

**Add to Task F's catch list this session earned:** a block INVISIBLE to a universal mechanism while
looking well-formed — nothing malformed, the device tier is just at the wrong end of the attr name
(prefix vs the framework's suffix convention) and every gate reads green. `sgs/responsive-logo` is
the live instance (see side-job below).

**DEFINITION OF ENFORCED** — a rule counts only when ALL hold (3 of 3 rules built 2026-08-04 were
blind on first build, each caught only by a human challenging a low number):
1. Expected population declared BEFORE the rule runs; a near-zero result is a claim requiring
   evidence, not a pass.
2. Population cross-checked by an independent method (second script/language/parse strategy).
3. Fixtures cover the DOMINANT real shape, not the convenient one — ≥1 `mustFlag` from a REAL block.
4. `mustNotFlag` fixtures for every legitimate exemption, each proving it load-bearing.
5. `--self-test` plants a violation, confirms it landed on disk, asserts it flags.
6. Baseline suppression proven to suppress; mode data proven to change the exit code both ways.
7. Blind spots ENUMERATED in the rule's own header, with a rough unmeasured-instance count.
8. The right document — name the consumer and prove it by reading the consumer, not the source doc.
9. Advisory first (exit 0); flip to fail-closed only when backlog is zero AND points 1-8 hold.
10. Checklist row updated with the real enforcer name — no phantom tools.

**Track acceptance:** every one of the 24 rows meets points 1-10 or carries a recorded exception
naming a `decisions.md` D-number. "Has a script" is not the bar.

### Side-job — standardise `sgs/responsive-logo` — DONE 2026-08-05 (`12931409`)

Renamed to the suffix convention AND given the `sgs/media` image shape, so `image-alt` now
fires natively. Deployed + live-verified. ⛔ Note the retirement condition recorded here
previously was WRONG — see STEP 0 above. Swept detail:
`memory/session-2026-08-05-spec35-step0-close.md`.

### Dependency graph

```
Step 0 (1-5, mostly inline, parallel-safe except item 2 needs item 1's overrides written first)
   -> Task B (design-gate + council)
        -> Task E (attrRoles channel; needs B's schema settled)
   -> Task C (migrate 6 rules)
        -> Task D (flip advisory -> fail-closed, per rule)
   B + E settled -> Task F (24 scripts, per-rule subagent-driven-development, parallel across rules)
Side-job (responsive-logo rename) -- independent, run anytime, feeds authored-alt-text retirement
```

### Methodology guardrails (earned this session — MOVED headline to `STOP-CATALOGUE.md` §E3)

- A number below your declared expectation is a CLAIM REQUIRING EVIDENCE. Declare the expected
  population BEFORE a rule runs.
- Measure recall against the eligible POOL, never the rule's own output — that is circular.
- A zero from a search you wrote needs a POSITIVE control before you trust it (3 zeroes this session
  were broken searches, not empty worlds).
- Name the CONSUMER before measuring a value, and prove it by reading that consumer (a wrong-document
  measurement produced 593 confident, plausible, wholly false findings — D484 repeat pattern).
- When merging evidence sources, the tie-break must be STATED or position becomes the tie-break by
  default (proven 3x: a rejection read as endorsement; `content_cats[0]` document order; a decision
  with no output slot).
- A fix that does not reach the WRITER changes nothing while looking done.
- Shared worktree: commit BY EXACT PATH, never `git add -A`. Re-check the D-ceiling immediately
  before writing any D reference (currently 496).
- `/sgs-update` is a CROSS-TRACK action on a shared DB — announce before running.

### Known non-blocker

`npm run build` fails on 2 tests (`test_batch_runner.py`) from the OTHER track's R1 section-root
gate. PROVEN not ours: identical failure with our converter change reverted. Converter suite 595 pass.

## NEXT SESSION (other backlog) — Snooza pitch demo + Track 1 (routing)

**SWEPT 2026-08-05 to `memory/session-2026-08-05-swept-narrative.md` (verbatim, byte-cap pressure,
neither closed).** Snooza pitch-demo tasks 1-4 (AR `.glb`/`.usdz`, Tier W cursor-field, client-
usability presets, 2 unproven-fix verifications) + TRACK 1 routing R1-R4 (R4/R1 SHIPPED 2026-08-04,
R2/R3 still open, R3 blocked on Spec 35 `scalar-media`). Read the pointer file before picking either
up — do not re-derive from memory.