---
doc_type: state
project: small-giants-wp
last_updated: 2026-08-03
note: "THE single living-status doc. Status is REPLACED here each session, never appended. History → dated snapshots in memory/session-YYYY-MM-DD*.md (the ledger-rotate Stop hook snapshots automatically past the cap but NEVER edits this file — the sweep is manual). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep this file lean (< 24,576 bytes)."
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary

### FOR BEAN — plain English (read this first)

**What this is.** One file that answers "where are we and what's next", so a fresh session (or you)
gets ONE true answer instead of three drifting ones.

**Where today left things, in a sentence each:**
- **WebGL is now officially part of the framework** (Tier W), with a budget and a closed list, so it
  cannot quietly spread and blow the page-weight limit.
- **The physics canvas block is built and live on the test site** — a decorative layer where things
  can be thrown around. It is not a physics engine and should never be sold as one.
- **Every gap found across nine research reports is now in ONE ranked document** instead of nine.
- **The Snooza chair job is bigger than the proposal says** — 72 product combinations, not 24, and
  two accessories that are not simple on/off choices.
- ⛔ **GSAP's licence has a clause worth knowing about** before you sell a plugin built on it.

## CURRENT FRONTS

> **QC-BYPASSED CLEARED (2026-08-04).** Independent re-check confirmed 4/6 figures exact and
> corrected 2 (scoped to `sgs/%`: 21->19, 1099->955); nothing fabricated. Full re-check:
> `.claude/reports/2026-08-04-step0-qc-bypassed-reverification.md`. D-ceiling now **490**
> (D485-D488 2026-08-04: Task A shipped, Track B/C root-causes, fluid-typography cause; D489-D490
> 2026-08-05: svg role + D1 forward-tracking + aggregator fixes shipped, `authored-alt-text` split).

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
- **⭐ Track 1b (Spec 35) — ENFORCEMENT SESSION 2026-08-04 (D481–D484).** Measured: 0 of 24 end
  conditions have a script validated to cover all instantiations (1 enforced/8 partial/4 vacuous/2
  unwired/9 absent). Full narrative + 5 corrections: `memory/session-2026-08-04-spec35-enforcement.md`.
- **⭐ Track 1b (Spec 35) Task A — structural content-role detection SHIPPED 2026-08-04 (D485).**
  `sgs/%` `role IS NULL` 703 -> 669 -> **661 after 2026-08-05 follow-ons (D489/D490)**. Residuals
  narrowed: a11y-metadata roles now RESOLVED (D489 a11y-text seeded + D490 `authored-alt-text` split
  fixes the alt/placeholder-excluded-from-content-walk defect); 127 unreached rows + name-regex
  fallback-still-present remain open. Same-session (2026-08-04): Track B fixed 3 `slots.aliases`
  collisions (D486); Track C refuted the tier-NULL mobile-parity theory and identified fluid
  typography as the real cause (D487/D488). **2026-08-05 follow-on (D489/D490):** svg role SHIPPED
  (was actively destructive — `rich_text_content()` stripped `<svg>`/`<path>` to empty text) + D1
  forward variable tracking SHIPPED (9/9 previously-unresolved rows now classify) + two aggregator
  position-vs-rule fixes SHIPPED (`content_cats[0]` document-order tie-break; D1-only-veto vanishing
  bucket) + `authored-alt-text` category split completed (PHP half pre-existed, Python `final_
  category` half was missing — now matches). `sgs/responsive-logo.alt` uses `authored-alt-text` as
  an INTERIM measure: its real defect is naming the device tier as a PREFIX
  (`desktopLogoId`/`tabletLogoId`/`mobileLogoId`) where the whole framework uses a SUFFIX
  (`backgroundImage`/`backgroundImageTablet`), making it invisible to the D480 device-tier axis —
  see D490 for the retirement condition. Full detail + the 6 new Task-F conditions:
  `memory/session-2026-08-04-spec35-enforcement.md` + `plans/spec-35-inspector-DONE-checklist.md`
  (items 22-27, condition 22 extended 2026-08-05 with the position-vs-rule aggregator pattern).
- **Track 1c (Spec 31 converter completion):** build shipped; open item is PROOF not build —
  `batch-report.json` reads 33 UNVERIFIED. `plans/2026-07-22-spec31-completion-to-100.md`.
- **Tracks 2+2b (nav/header/footer merge):** 5-wave plan landed (D413), Wave 1 CLOSED, Wave 2 in
  progress. `plans/2026-07-29-merged-spec36-37-track-strategic-plan.md`. Task 5 (drawer variants)
  REJECTED by Bean 2026-07-29 (`memory/session-2026-07-29-task5-drawer-rejection.md`).

---

> **HANDOFF QC (resolved):** an independent rater caught two stale figures my own self-review
> missed (a plan row claiming "37 tables" when live is 36; "gates invoked manually" when D473 had
> already wired them into `prebuild`). Both fixed. Lesson: self-review passed, independent review
> found real defects — don't skip the second pair of eyes. Full detail: `memory/session-2026-08-03-track3.md`.

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
  (currently D490 as of 2026-08-05 — re-check live BEFORE writing any D reference; this line has
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

### STEP 0 — close Task A's residuals FIRST. Task A is not done while these are open.

| # | What / Why | Est. | Orchestration | Acceptance |
|---|---|---|---|---|
| 1 | **Apply the 6 confident role assignments** from `.claude/reports/2026-08-05-report-only-row-categorisation.md`: `buybox.addToCartLabel`, `buybox.perUnitDenomination`, `whatsapp-cta.message` → `text-content`; `icon.ariaLabel`, `button.ariaLabel`, `nav-menu.navLabel` → `a11y-text`. | 10 min | Inline (main thread) — small, precise DB writes via the hand-authored override channel (`attr-classification-overrides.json`), not a raw DB write, so a reseed doesn't revert them. | `role IS NULL` count for `sgs/%` drops by 6 (from 661); overrides file diff shows exactly these 6 keys. |
| 2 | **Verify this session's direct DB role writes survive `/sgs-update`.** `a11y-text` on `cart.ariaLabel`+`tabs.blockLabel`; `svg` on 8 rows — written straight to the DB, not through the override channel. | 15 min | Inline. Read `assign-canonical.py`'s override precedence, confirm each of the 10 rows has a durable override entry OR is re-derived by a detector (svg role has one — the D489 extractor branch). ⚠ Known risk: `sgs/responsive-logo.alt`'s existing override sets ONLY `derived_selector`, no role — check it isn't silently dropping the role on reseed. | Announce before running `/sgs-update` (cross-track DB action). A dry-run diff of role columns pre/post shows zero unintended reverts. |
| 3 | **Update `P-FR-31-2.1A-CLOSURE`** (`.claude/parking.md:303-311`) OPEN → **PARTIAL**. Strip shipped clauses (the apiVersion-3 sub-item IS done per its own text), keep residual: `supports.sgs.attrRoles` not built (= Task E), name-regex still present as fallback not deleted. | 5 min | Inline edit. | Entry reads `**Status:** PARTIAL`, residual scope only, apiVersion-3 clause removed. |
| 4 | **Explain `sgs/container.bgSvgContent`** — genuine SVG markup landing in NO fingerprint bucket. Best current hypothesis (unproven): its only consumer is `includes/class-sgs-container-wrapper.php`, which the emission scanner never opens. | 15 min | Delegated, sonnet, foreground. Brief: read `class-sgs-container-wrapper.php`'s handling of `bgSvgContent`, then read the emission-scanner's file globs — confirm or refute the consumer hypothesis by reading the actual code, not by re-asserting it. | A stated PROVEN or REFUTED verdict with the file:line that decides it — not a repeated hypothesis. |
| 5 | **Document the 192 unreached rows** (of the 220-row eligible pool) as the honest open search space — mostly genuine styling (`gapTablet`, `gridTemplateColumnsMobile`, `shapeDividerTop`, `anchor`, `className`) but that composition is an ASSUMPTION, not a measurement. | 10 min | Inline — write the assumption + its unproven status into the Task A residual note; no new investigation this step, just stop treating it as measured. | LEDGER/checklist text no longer states the 192's composition as fact. |

**Only after Step 0 closes** move to Tasks B-F below.

### Tasks B–F, in order (per checklist `.claude/plans/spec-35-inspector-DONE-checklist.md` items 22-27 + Task-F bar)

| Task | What / Why | Est. | Orchestration | Depends on | /qc gate | Acceptance |
|---|---|---|---|---|---|---|
| **B** | Hero-background design gate. Collision gate proved a FOUR-block class (hero/container/cta-section/trust-bar). Bean's identity-rename lead (D484): distinct DRAFT-side selectors per colliding attr (`__background-image`/`__background-video`/`__background-svg`; `__image` vs `__poster`). Data-only, no schema change. | 20 min | Inline, Opus — Rule 7 design-gate (shared-mechanism) + `/qc-council` BEFORE building. | Step 0 | `/qc-council` pre-build | `check_content_attr_collisions.py` reports 0 genuine groups |
| **C** | Migrate the 6 existing gating rules into `inspector-scan`. The one step that can LOSE enforcement while reading green. | 30 min | Delegated, sonnet. Brief: run old + new rule sets side by side, diff finding sets, explain every delta in writing BEFORE deleting anything; delete old scripts in a separate later commit. | Step 0 | `/qc-inline` on the diff | Delta explained per-finding; old scripts deleted only after zero unexplained deltas |
| **D** | Flip advisory rules to fail-closed, one at a time. Each rule flips only when its backlog is zero AND fixtures cover the dominant real shape. | 15 min/rule | Inline — judgment call per rule, not mechanical. | C | n/a (self-test per rule) | Backlog=0 proven, not asserted; flip recorded in `decisions.md` |
| **E** | `supports.sgs.attrRoles` (FR-31-2.1a/D258). Declarative channel ending name-guessing. ⛔ Do NOT read WP 7.0's inline `"role":"content"` into the SGS role column — collides, corrupts 8 attrs. | 45 min | Delegated, sonnet, worktree isolation (touches block.json across many blocks). Brief: add the channel parallel to WP's own `role`, column-first-else-name-regex-fallback in the seeder. | B (schema settled) | `/qc-council` (shared-mechanism) | Audit script proves parity name-regex vs channel on every block before any flip |
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

### Side-job — standardise `sgs/responsive-logo`

Names responsive tiers with a PREFIX (`desktopLogoId`/`tabletLogoId`/`mobileLogoId`) where the whole
framework uses a SUFFIX (`backgroundImageTablet`) — `modifier_suffixes` peels a suffix, so the D480
device-tier axis is structurally blind to it (all 3 rows `is_responsive=0`, `css_tier=NULL`, every
gate green). Renaming to the suffix convention collapses the 3 images into one base attr with tier
siblings, gives `alt_companion_attr` a single image attr to name, lets `image-alt` fire natively, and
**retires the `authored-alt-text` category** (record this as its retirement condition — do not
maintain it once the rename lands). ⚠ `placeholder`'s D482 justification is SEPARATE and does not
depend on this rename. **Est. 30 min. Delegated, sonnet, worktree — block.json + converter attr
rename across one block.**

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
  before writing any D reference (currently 490).
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
