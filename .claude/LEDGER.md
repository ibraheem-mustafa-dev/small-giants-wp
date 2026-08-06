---
doc_type: state
project: small-giants-wp
last_updated: 2026-08-06
note: "THE single living-status doc. Status is REPLACED here each session, never appended. History → dated snapshots in memory/session-YYYY-MM-DD*.md (the ledger-rotate Stop hook snapshots automatically past the cap but NEVER edits this file — the sweep is manual). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep this file lean (< 24,576 bytes)."
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary

### FOR BEAN — plain English (read this first)

**What this is.** One file that answers "where are we and what's next", so a fresh session (or you)
gets ONE true answer instead of three drifting ones.

**Where 2026-08-06 left things, in a sentence each:**
- **The 14 half-finished blocks are finished and live.** They were described as waiting on a
  screenshot check; they actually did not build at all. Two settings were wired to nothing — a client
  could pick an option and nothing would happen. Both fixed.
- **Your footer spot was a real bug.** Screen readers had no way to jump to the footer on any page,
  because nothing marked it as one. Now there is exactly one, checked on the live site.
- **A piece of the framework had been switched off without anyone noticing** — a spelling mismatch
  meant 56 settings across 7 blocks were being skipped. Working again.
- **A warning that cried wolf on every run now only fires when something is genuinely wrong.**
- **69 settings still need a human decision — and they need YOUR decisions, not more code.** No
  amount of clever detection closes them; that is the honest shape of the remaining work.

**Older, still true:** WebGL is in the framework (Tier W, budgeted) · ⛔ GSAP's licence has a clause
worth knowing before selling a plugin built on it · the Snooza job is 72 combinations, not 24.

## CURRENT FRONTS

> **D-ceiling 500** — re-measure before writing any D reference, never trust this line.
> D491-D496 (2026-08-05) = the Step 0 close: tier inheritance, `styling` + `technical` roles,
> Detector 4, the never-wired pattern-attr gate, responsive-logo image shape, header/footer box
> spacing. (2026-08-04 QC-bypass: CLEARED, nothing fabricated —
> `reports/2026-08-04-step0-qc-bypassed-reverification.md`.)

### Track 3 — CLOSED (D479). Tier W admitted, physics-canvas shipped.

Narrative + licences: `memory/session-2026-08-03-track3.md`. Binding facts: ⛔ **GSAP is NOT MIT**
(Prohibited Uses bans visual-motion-authoring tools competing with Webflow — exposes the Configurator
Pro, not client sites) · ⛔ **LYGIA is Prosperity-licensed** · ⚠ **Snooza = 72 SKUs**.

### Tracks 1b / 1c / 2 / 2+2b — stable · **Track 1 MOVED 2026-08-01 (D437–D439)**

Per-sub-track status (one line each) + the pointer that owns the full narrative — read the pointer
before acting, do not assume it is current from memory alone:

- **Track 1 — routing audit COMPLETE + tier axis SHIPPED (D480); Phases 0-3 COMPLETE (D464, D470-D478),
  Phase 4 PARTIAL, Phase 5 OPEN.** Tier axis does not yet reach `splitImage` (`scalar-media` blocks it
  — Spec 35 prerequisite). Live parity: content 99%, CSS 83/84/89% (worst mobile). Registers:
  `reports/2026-08-02-pipeline-routing-review.md` + `reports/2026-08-03-handover-to-spec35-block-attribute-defects.md`.
  Narrative: `memory/session-2026-08-02-track1-phase1.md` + `-phase0.md`.
- **⭐ Track 1b (Spec 35) — STEP 0 CLOSED 2026-08-05. `role IS NULL` on `sgs/%` 661 → 410 (251 rows
  classified, ZERO hand-authored overrides).** Four deterministic mechanisms shipped + `/sgs-update`
  run + deployed and live-verified on the canary. Commits `6992e47e` `2d413758` `ddab201c`
  `36df6561` `801a076a` `40273154` `580f7885` `12931409`. Detail below under NEXT SESSION.
- **Track 1b enforcement baseline (2026-08-04, D481-D484):** 0 of 24 end conditions had a validated
  script (1 enforced/8 partial/4 vacuous/2 unwired/9 absent). Tasks C+D closed 2 of those 2026-08-06.
  Narrative: `memory/session-2026-08-04-spec35-enforcement.md`.
- **Track 1c (Spec 31 converter completion):** build shipped; open item is PROOF not build —
  `batch-report.json` reads 33 UNVERIFIED. `plans/2026-07-22-spec31-completion-to-100.md`.
- **Tracks 2+2b (nav/header/footer merge):** 5-wave plan landed (D413), Wave 1 CLOSED, Wave 2 in
  progress. `plans/2026-07-29-merged-spec36-37-track-strategic-plan.md`. Task 5 (drawer variants)
  REJECTED by Bean 2026-07-29 (`memory/session-2026-07-29-task5-drawer-rejection.md`).

---

> **Independent review beats self-review — three times now.** 2026-08-03 a rater caught two stale
> figures; 2026-08-05 a doc subagent's flag led to inert DB work; 2026-08-06 re-running an agent's
> own claim myself caught three of MY probe bugs. Don't skip the second pair of eyes.

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
  (currently D498 as of 2026-08-06 — re-check live BEFORE writing any D reference; this line has
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

### ✅ 2026-08-06 — CLOSED. Narrative: `memory/session-2026-08-06-spec35-payload-close.md`.

⚠ **Two beliefs this section used to carry were FALSE — do not re-derive:** there was no
deploy↔commit circularity (`build-deploy.py --payload` exists for it), and those files were not
blocked by the visual gate — they did not BUILD.

### THE GOAL — why this track exists (state it before picking up any task)

**Bean's clients are tech-illiterate and live in the block editor.** Spec 35 exists so every SGS
block's inspector is genuinely usable by them: controls for what the block can do, none for what it
cannot, nothing that crashes, one consistent shape across all 84 blocks. A setting that needs code is
not done. The 24 end conditions are only worth having if ENFORCED — measured 2026-08-04 at 0 of 24.

### STEP 0 — CLOSED 2026-08-05. `role IS NULL` on `sgs/%` 661 → 410, zero hand-authored overrides.

251 rows classified by MECHANISM (tier inheritance 151, `styling` backstop 124, `technical` from a D1
veto 59, Detector 4 42). Detail: `memory/session-2026-08-05-spec35-step0-close.md`.

### STEP 0.1 — pool 69 → **34** (2026-08-06, D499+D500). Bucket 1 CLOSED; 20+13+1 left.

**Bean's ruling that reshaped it:** a NULL role means the row is UNREACHED or UNSEEDABLE — never
"reached, understood, and filed nowhere". Full narrative + all measurements: **D499 + D500**.
Commits `49aca606` `b6010874`.

⛔ **The old Task-1 guidance ("the 33 owe an attrMap declaration") was WRONG and is deleted — do not
restore it from an older revision.** Only `gridItemBorder` was a real attrMap case; the other 29 are
decorative families `sgs/container` deliberately declines to map (R-31-9). Declaring them would have
REVERSED that decision.

⚠ **The remaining 34 are DECISIONS, not detector work.** `ASSIGNABLE` 0 is the CORRECT steady state;
every row IS reached (`unreached` = 0) and lands in a bucket that deliberately declines to assign.
Apply by MECHANISM, never hand overrides (D497).
⚠ **0.1 CANNOT CLOSE BEFORE 0.2** — `whatsapp-cta.phoneNumber` + `.message` wait on 0.2's
`link-content` extractor. 32 of 34 independent; those 2 hard-blocked.

| Bucket | Rows | What to do |
|---|---|---|
| ~~**Wrapper-rendered styling**~~ | ~~33~~ **0** | ✅ **CLOSED D499.** 31 seeded `styling` via TIER 2.4. `trust-bar`/`physics-canvas` `gridItemBorder` DELETED — dead by two different mechanisms (badge children vs the `.sgs-container--grid > .sgs-container` selector; `container_kind` NULL gating the emit out). `site-header`/`site-footer` now match container |
| **D4 needs review** | 20 | ⛔ **BLOCKED ON A DECISION, not on effort — read before starting.** Verdicts exist for all 20 (2026-08-05 report): 11 technical, 8 styling, 1 content. **There is no MECHANISM to apply them.** `technical` may come ONLY from a D1 veto (the role's own contract) and D1 vetoes none of them; the 8 styling rows have no `css_property` and a non-wrapper consumer, so TIER 2.4 can't reach them either. Hand-assigning is banned (D497). Two clean sub-mechanisms are available if Bean wants them: (a) `button.anchor`/`className` + `heading.anchor` are WP-CORE native supports, checkable against `block_supports`; (b) `sgsCustomCss` ×2 is raw CSS emitted into a `<style>` element. That is 5 of 20; the other 15 need a widened evidence contract or a new flow-analysis detector |
| **Report-only (D2-only)** | 13 | Needs corroboration: 8× `fieldName`, `formName`, `excludeKeywords`, `posterAlt`, `drawerRef`, `schemaItemName`, `whatsapp-cta.message` |
| **Content gap** | 1 | `whatsapp-cta.phoneNumber` — waits on the `link-content` extractor below |

**OPEN QUESTION for Bean (not blocking):** `site-header`/`site-footer` declare NO `elements` block at
all, so all 6 of their `gridItem*` attrs lack a `css_property` (the other 5 already have correct roles
by name). Their ROLE is now right, but the converter still cannot route draft CSS to them. Mirroring
container's full `grid-item` element would fix 12 rows across the 2 blocks — wider than the scope
approved on 2026-08-06, hence parked as a question rather than done silently.

### STEP 0.2 — ONE residual left (2 of 3 shipped 2026-08-06)

1. ✅ **`sgs/multi-button` rename — PHASE B COMPLETE** (`96136e77`). Both posts migrated in ONE
   Playwright session (the blocker was a per-run login against a rate-limited wp-login FORM, not a
   lockout); six legacy declarations + the legacy fallback arm deleted. ⚠ **Two theme patterns were
   missing from the recorded Phase B steps** — `footer-centred.php` / `footer-simple.php` still used
   legacy `wrap`; deleting the declaration would have silently un-wrapped both footers (D338).
2. ⬜ **`link-content` role + extractor — STILL OPEN.** Capture half shipped (`580f7885`); the
   EXTRACTOR is NOT built and the role is deliberately NOT seeded. It was drafted against an assumed
   `extra` parameter; the real signature is `extract_field_value(element, role, media_map=None)`, so
   it would raise `NameError` on first use. Threading the template through changes a shared converter
   entry point used by BOTH `array_content` and `scalar_content` — read Spec 31 §3.B.0 first. Covers
   `whatsapp-cta.phoneNumber` AND `.message` (Bean's scope call). **This is what blocks 2 of the 69.**
3. ✅ **Case mismatch in `extract-signatures.py` — FIXED** (`60f7fbbb`). `"" + "Gap"` could never
   match a camelCase `gap`, silently disabling the prefix-convention path for every bare-prefix
   element. 224 → 280 attr→element matches (+56) across 7 blocks.

**Only after Step 0.1/0.2** move to Tasks B-F below.


### ⭐ NEXT SESSION STARTS HERE — STEP 0.1 Tasks 2 + 3 (36 rows left)

**State recap, plain English.** The framework stores a "role" for every setting a block has — what
the value IS (text, colour, image…). Task 1's 33 rows are DONE (D499): they were settings the shared
wrapper paints, and they now carry the `styling` role instead of reading as unexamined work. 36 rows
remain and they are NOT waiting on better tooling — every one already reaches a detector that
DELIBERATELY declines to classify it. They need decisions.

⛔ **Do not re-investigate. Verdicts already exist** in the 2026-08-05/06 agent reports with per-row
file:line. Re-deriving them is waste; APPLYING them is the work. Apply by MECHANISM, never hand
overrides (D497); `technical` may be assigned ONLY from a D1 veto.

## ~~Task 1 — Wrapper-rendered styling~~ ✅ DONE 2026-08-06 (D499+D500)

Closed by MECHANISM (TIER 2.4 + the D500 render-over-editor tie-break), not attrMaps. Pool 69 → 34.

## Task 2 — D4 needs review (20 rows) — ⛔ NEEDS BEAN'S CALL FIRST, not effort

**What:** the verdicts already exist (11 technical / 8 styling / 1 content, 2026-08-05 report with
per-row file:line). **What does NOT exist is a mechanism to apply them**, and D497 bans hand
overrides — so this cannot be ground out inline. 2026-08-06 fixed the 2 rows that DID have one
(D500) and re-pointed 5 more onto their true render.php consumer; the residue is a design call.

**The blocker, precisely:** `technical` may be assigned ONLY from a D1 veto (that role's own
documented contract, and the reason it is trustworthy). D1 vetoes none of these 20. The 8 styling
rows carry no `css_property` and their consumer is their own render.php, not the shared wrapper,
so TIER 2.4 cannot reach them either.

**Menu for Bean (ranked):**
1. **Two narrow mechanisms, 5 rows** — (a) an attr that exists because the block declares the
   WP-CORE native support of the same name is technical by construction (`button.anchor`,
   `button.className`, `heading.anchor`); checkable against `block_supports`, no new evidence
   class. (b) an attr whose value is emitted INSIDE a `<style>` element is styling by
   construction (`nav-drawer`/`nav-menu.sgsCustomCss`). Leaves 15.
2. **Build the flow-analysis detector** — D1-style, follows a value from read site to paint site.
   Closes most of the 15 honestly. The largest build on this track.
3. **Widen the `technical` evidence contract** — cheapest, and the one to be most careful with:
   the role's trustworthiness comes from being veto-only.
**Acceptance:** every row resolved WITH its evidence, by mechanism — never a hand override.

## Task 3 — Report-only (13 rows) — needs a DECISION, not code

**What:** 8× `fieldName`, `formName`, `excludeKeywords`, `posterAlt`, `drawerRef`, `schemaItemName`,
`whatsapp-cta.message`. D2-only; `technical` needs a D1 veto to REACH them.
**Why:** the script's own docstring says closing these "needs a new role with a real consumer — a
decision, not a detector". Inventing a plausible-looking role is the exact "wrong document" failure
this track exists to stop.
**Estimated time:** 20 min + Bean's call

**Orchestration:** inline, Opus. **ASK BEAN** before seeding any new role.
**Depends on:** none. **/qc gate after:** n/a (a decision, not a build).
**Acceptance:** either a new role with a NAMED consumer, or a recorded decision to leave NULL.

## Task 4 — Content gap (1 row) — HARD-BLOCKED

**What:** `whatsapp-cta.phoneNumber` waits on the `link-content` extractor (STEP 0.2 #2 above).
**Acceptance:** 0.1 CANNOT close before 0.2 #2 ships. 67 of 69 are independent; 2 are blocked.

### Dependency graph

```
Task 1 (33) ── ✅ DONE D499 (49aca606)
Task 2 (22, inline Opus) ─┬─ independent, any order ─→ /qc-inline ─→ commit
Task 3 (13, inline Opus + Bean's call) ─┘
Task 4 (1) ── BLOCKED on STEP 0.2 #2 (link-content extractor)
```

### Methodology guardrails (do not skip)

- **A number below your declared expectation is a CLAIM REQUIRING EVIDENCE.** Declare the expected
  population BEFORE a rule runs. (`fingerprint_content_roles.py`'s own expectation was re-declared
  2026-08-06 — it had been calibrated against a 262-row pool and cried wolf on every run.)
- **The ONLY valid test that a role is mechanism-derivable is: clear the row, reseed, read it back**
  (STOP-71). A probe calling the function directly proves nothing about what a reseed writes.
- **`/sgs-update` is a CROSS-TRACK action on a shared DB — announce before running, back up first.**
- **Deploy before measure**; a page-HTML grep cannot see block CSS (lifted to `uploads/sgs-css/`).
- **Shared worktree:** commit BY EXACT PATH, never `git add -A`. Re-check the D-ceiling immediately
  before writing any D reference (currently 498).
- **Verify a subagent's absence claim before acting on it** (STOP-73) — and verify your OWN probe
  before believing a defect: three "failures" on 2026-08-06 were probe bugs (a cp1252 decode crash,
  a wrong class selector, a guessed JSON schema), not code defects.

### Tasks B–F, in order (per checklist `.claude/plans/spec-35-inspector-DONE-checklist.md` items 22-27 + Task-F bar)

| Task | What / Why | Est. | Orchestration | Depends on | /qc gate | Acceptance |
|---|---|---|---|---|---|---|
| **B** | Hero-background design gate. Collision gate proved a FOUR-block class (hero/container/cta-section/trust-bar). Bean's identity-rename lead (D484): distinct DRAFT-side selectors per colliding attr (`__background-image`/`__background-video`/`__background-svg`; `__image` vs `__poster`). **+ TIER 5 (Bean 2026-08-06): retire `scalar-media` AND reshape `splitImage`.** See the note below — B is no longer data-only. | 40 min | Inline, Opus — Rule 7 design-gate (shared-mechanism) + `/qc-council` BEFORE building. | Step 0 | `/qc-council` pre-build | `check_content_attr_collisions.py` 0 genuine groups **+ `splitImage` carries the standard responsive shape + `scalar-media` has 0 rows** |

**Task B — TIER 5 addition (Bean's instruction 2026-08-06). Two coupled problems, ONE design.**
`scalar-media` is a hyperspecific role (2 rows) invented to mark a composite's built-in media slot
instead of fitting it to a general rule — and it is already the recorded blocker stopping the tier
axis from reaching `splitImage`. **`splitImage`'s SHAPE is the deeper fault:** it exists as
`splitImage` + `splitImageMobile` ONLY, which is not a standard responsive-override-capable content
attribute (no tablet tier, prefix-not-suffix). It must be reworked to the standard shape — the
`sgs/responsive-logo` precedent (D496) is the model: base + `Tablet` + `Mobile` SUFFIX convention,
plus the `sgs/media` id+url pair so `image-alt` fires natively.
⛔ **Do NOT reshape before settling B's collision answer** — same decision: B decides how a
composite's interior media is IDENTIFIED draft-side, and that identity is what the reshaped attr's
routing keys off. Order: settle B's selector identity → derive the shape → migrate `splitImage` →
retire `scalar-media` → confirm the tier axis reaches it.
| ~~**C**~~ | ✅ **DONE `3cbdd89f`** — 6 rules ported, equivalence re-verified; only 4 actually GATE (2 were informational, ported as advisory). | — | — | — | — | — |
| ~~**D**~~ | ✅ **DONE `4e07ab6c`** — `inspector-scan/run.js --check` is the prebuild gate, proven by negative control; baseline keys made repo-relative. | — | — | — | — | — |
| **F** | Build the remaining enforcement scripts — the track's actual deliverable. Scope: 19 remaining (items 2-17, 19, 21 + T1/T2/T3 minus C/D's 2); items 1/18/20 exist on `scripts/inspector-scan/`. | 30-60 min/rule | Delegated per rule, sonnet, `/subagent-driven-development` — each rule is independent once B settles. | A-D settled | `/qc-council` per rule before fail-closed flip | Each row meets `STOP-CATALOGUE.md` §E6, or a recorded exception naming a D-number |

⚠ **Why F is last (Bean's ruling):** A/B/E decide block structure; rules written before them get
rewritten after. Every new universal rule also enlarges the drift surface F exists to contain — so
architecture settles, then enforcement is written against it once. Re-read the checklist against the
settled architecture before writing F.

**Add to Task F's catch list this session earned:** a block INVISIBLE to a universal mechanism while
looking well-formed — nothing malformed, the device tier is just at the wrong end of the attr name
(prefix vs the framework's suffix convention) and every gate reads green. `sgs/responsive-logo` is
the live instance (see side-job below).

**DEFINITION OF ENFORCED (the Task-F bar, 10 points) + track acceptance: `STOP-CATALOGUE.md` §E6.**
Moved there 2026-08-06 (byte cap); it is a structural defence, uncapped by design. "Has a script" is not the bar.

### Side-job — `sgs/responsive-logo` — DONE 2026-08-05 (`12931409`)

Suffix convention + `sgs/media` image shape, so `image-alt` fires natively. Live-verified.
Detail: `memory/session-2026-08-05-spec35-step0-close.md`.

### Tasks B/F guardrails — see the NEXT SESSION section above.

### Known non-blocker

`npm run build` fails on 2 tests (`test_batch_runner.py`) from the OTHER track's R1 section-root
gate. PROVEN not ours: identical failure with our converter change reverted. Converter suite 595 pass.

## NEXT SESSION (other backlog) — Snooza pitch demo + Track 1 (routing)

**SWEPT to `memory/session-2026-08-05-swept-narrative.md` (verbatim, neither closed).** Snooza
pitch-demo tasks 1-4 + Track 1 routing R1-R4 (R4/R1 shipped 2026-08-04; R2/R3 open). ⚠ **R3 is
blocked on `scalar-media` — the same role Task B tier 5 retires, so B unblocks R3.** Read the
pointer file; do not re-derive from memory.