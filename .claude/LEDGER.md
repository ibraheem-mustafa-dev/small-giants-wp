---
doc_type: state
project: small-giants-wp
last_updated: 2026-08-02
note: "THE single living-status doc. Status is REPLACED here each session, never appended. History → dated snapshots in memory/session-YYYY-MM-DD*.md (the ledger-rotate Stop hook snapshots automatically past the cap but NEVER edits this file — the sweep is manual). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep this file lean (< 24,576 bytes)."
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary

### FOR BEAN — plain English (read this first)

**What this is.** One file that answers "where are we and what's next", so a fresh session (or you)
gets ONE true answer instead of three drifting ones.

---

## CURRENT FRONTS

### Track 3 — motion drift GATED, looping ROLLED OUT, focus ring on the client palette (D465-D467)

**Commits `4f07a72a`, `b490bc40` (+ docs `d050fe62`/`8455c8f1`/`6ad91d19`), pushed. Every claim is a
measurement.**

| Shipped | Proven how |
|---|---|
| **Three-list fx drift GATED** (D465) — `scripts/check-fx-list-drift.py`, 6 invariants, in `prebuild` | `--self-test` breaks each invariant + a vacuity case; **deleting `'cursor-field'` from each list in turn was verified to fail the build**, each break confirmed in `git diff` first. Reads NO database. `fx_effects` gained `in_picker`. |
| **Looping rolled out** (D466) to `post-grid` / `trustpilot-reviews` / `google-reviews` / `buybox` | **dots == real cards on 4 of 5** (post-grid 9 real / 27 cloned / **9 dots**); buybox 8/8 + 1 honest `[N/A]`. Plus a no-JS **first-paint** capture, 3/3 each. |
| **`sgs/google-reviews` slider nav BUILT** | It had NONE: `showDots`/`showArrows` declared, exposed as toggles, read into variables, rendering nothing. Dots now live at 3 == 3 real reviews. |
| **Focus ring = ACCENT glow on the client's own palette** (D467) | **0 → 15 of 25 focusables on accent; the hardcoded teal is gone from every element.** |

⛔ **THE SPEC'S OWN ROSTER PREDICATE WAS WRONG.** Spec 38 + this LEDGER said "derive the roster from
`supports.sgs.fx.draggable`" — with a ⚠ to trust it. It returns 2 blocks, one with **no scroller at
all**. Correct: **"owns a native horizontal scroller"**. Fixed in Spec 38 §3.3; `before-after` and
`testimonial-slider` excluded with reasons.

⛔ **D322 WAS THREE-QUARTERS UNDONE FOR FOUR MONTHS.** The focus fix looked like a one-line
`theme.json` edit and was a **no-op**: the real overrides were **`wp_global_styles` post 7** (the DB
beats theme.json) **and the client snapshots**. D322 added the framework copy but never removed the
client copies, and the client copy wins. Ruled out first, in order: not a bad edit (deployed file
had the new value), not a cache (42 transients deleted + object cache + LiteSpeed purged).

⚠ **A `wp post list` FALSE NEGATIVE ALMOST CLOSED THAT INVESTIGATION.** It returned NOTHING for
`--post_type=wp_global_styles` — reading exactly like "no override". It defaults to a publish-ish
status filter; `--post_status=any` found post 7 instantly. **An absence from `wp post list` is not
evidence of absence unless the status filter was explicit.**

⚠ **FOUR probe defects, all measuring the INSTRUMENT not the code:** a hardcoded item selector made
"dots == real cards" read `0 === 0` on any non-gallery block; a `|| 0 === dots` escape-hatch let a
DOTLESS block bank a silent PASS; dots were counted document-wide against track-scoped items,
FAILING a correct block; `networkidle` never settles on a WooCommerce page. All fixed with negative
controls.

⛔ **`sgs/nav-menu`'s focus fix was built, deployed, measured working — then REVERTED + redeployed.**
`first_paint_capture_passed` cannot be honestly claimed for a block rendering a hidden second copy in
the drawer (capture reads `2/4 visible` — a probe artefact). **Faking a gate field to land a
long-tail fix was the wrong trade.** Do not re-land without a genuine capture.

**Bean's rulings (each now made TWICE — do not re-litigate):** the focus ring is gated on **palette
accuracy, not contrast** (`visual-standards.md`'s 3:1 is overruled for his sites), and the **outline
is ACCENT** — a glow effect, not a dark high-contrast object.

### Track 3 (previous) — Wave E (D447–D454, D457) → `memory/session-2026-08-01-wave-e.md`

Two Wave-E results are STANDING CONSTRAINTS, not history:
- ⛔ **`fx-horizontal-panel` has NO defect — a CSS bug provides the rescue.** `overflow-x: clip` with
  a non-clip `overflow-y` computes to `hidden`, which IS a scroll container, so native
  scroll-into-view rescues focus. **Do NOT "fix" it to clip on both axes** — that deletes the only
  WCAG 2.4.11 cover this effect has.
- **The WooCommerce gallery bug did not exist.** `core/query include:[540]` silently rendered product
  1125, whose gallery is genuinely empty. Check WHICH product rendered before diagnosing.

### Tracks 1b / 1c / 2 / 2+2b — stable · **Track 1 MOVED 2026-08-01 (D437–D439)**

Full detail lives where it already did — read before acting, do not assume it is current from
memory alone:

- **⭐ Track 1 — T1.1 CLOSED 2026-08-02 (D461, `8cdc1460`). Phase 0 still NOT executed.**
  All four fixed at their DERIVATION, not as rows: `parent_block` 18→23 (hardcoded dict deleted,
  R-31-1), `css_layer` 322→352, mis-typed roles 6→0, `block_selectors` 92→86 (retired 10→0).
  Controls judged non-vacuous by an independent adjudicator. Evidence + LIMITATIONS:
  `reports/2026-08-02-t1.1-evidence-pack.md`. Full corrections + 3 struck diagnoses: **D461**.
  ⛔ (e) `design_tokens` CLOSED, not a gap; real finding = `token_snap.py` is an inert stub vs
  Spec 31 §4 (needs a design gate). ⛔ Do NOT retry the Task A composite-var classifier fix —
  measured 1→3 violations, reverted. ⛔ `sgs/star-rating` lacks `scalar-content-lift` so the star
  lift no-ops despite the correct role; granting it is Bean's opt-in, not a bug.
  ✅ **CARRIED AND COMMITTED 2026-08-02** — `src/blocks/form/block.json` (the focus-ring `attrMap`
  fix that makes F6 green, plus that track's colour-default change) landed in the motion track's
  `d4bfa126`. F6 verified green afterwards. Nothing outstanding on that handover.
- **⭐ Track 1 — Phase 0 PART 1 SHIPPED 2026-08-02 (D464, `78347070`, pushed).** The DB now has a
  memory: `scripts/dbschema/` holds a verbatim `schema.sql` (39 tables + 22 indexes, round-trip
  proven identical), a `sandbox.py` that runs `Path.home()`-hardcoding scripts against a throwaway
  DB (guard proven to FIRE, 4 negative controls), and `migrate.py` + `schema_migrations`
  (`--apply` proven able to FAIL). 29 migrations adopted via `--mark-applied`; **zero row drift
  across all 40 pre-existing tables.**
  ⛔ **Phase 0 is NOT complete** — Steps 0.4 (`--rebuild` flag), 0.5 (rebuild-from-empty
  comparison), 0.7 (baseline commit) and **QA Gate B** (the negative-control rebuild proof, on
  `property_suffixes` AND `block_attributes`) all remain. **Phase 1 stays BLOCKED until Gate B**:
  it deletes migrations, and two `CREATE TABLE`s live only inside migrations queued for deletion.
  ⛔ Four plan statements measured FALSE (see D464): **30 migrations not 29** · **NO migration
  accepts `--db`** (the plan said 2 did; passing it would argparse-exit-2 into a fake failure) ·
  **the DB is WAL-mode**, so the planned file-copy backup was unsafe · the sync invocation is at
  `sgs-update-v2.py:4825`, not 4718. **Derive counts at runtime; never re-cache one here.**
  ✅ Step 0.6 answered (unblocks D-2): `--apply` alone changes ONLY
  `block_composition.wraps_block`/`container_kind` + the idempotent column-add; the block.json
  mirror needs BOTH `--apply` and `--write-block-json`, and `/sgs-update` passes only the latter.
  ⚠ A stray **empty, untracked, NOT-gitignored** `scripts/sgs-framework.db` sits in the repo — a
  `git add -A` landmine. Left pending Bean's word.
- **Track 1 (cloning/Spec 31) — Phase 0 background. Root cause found; parent plan otherwise NOT executed.**
  Registers: **`plans/2026-08-01-db-derivation-and-converter-cleanup.md`** (parent, 4 settled
  decisions + 8 findings) and **`plans/phase-0-db-rebuildable.md`** (fly-through, 9 steps + 2 QA
  gates, ~105 min). Prior L2 register: `plans/2026-08-01-wrapper-recognition-cascade-rework.md`.
  **ROOT CAUSE (2026-08-01):** the DB **cannot be rebuilt from scratch** — gitignored, its foundational
  tables exist only because ~15 one-off `migrations/` were each hand-run once, no runner, no replay. `blocks`/`block_attributes`/`block_composition` have
  **no `CREATE TABLE` anywhere**; `property_suffixes` (154 rows) has DDL only in test fixtures. Every
  "worked last month" bug traces here: `role='scalar-media'` 2→0 (hero art direction lost — worked in
  the real 2026-07-02 run, artefact in `scripts/pipeline-state/sgs-clone/`); `container_kind` never
  written on reseed.
  **SHIPPED:** D446 band-arrangement fold (`d2d0579f`) + L2 seam doc (`7a21d07d`).
  Suite **587/1 skip** (verified). Conformance **30 fail/20 pass** — re-measured 2026-08-01; the
  long-quoted "23/27" was stale and had never been re-run. Drift PRE-DATES this session.
  **DECISIONS SETTLED (Bean):** (1) fix `role` UNIVERSALLY, not scalar-media as a spot fix — 78
  routing call sites/8 files, 1594 of 2440 sgs attrs NULL; (2) `container_kind` auto-applies on
  reseed, drift → `parking.md`; (3) `delegates_content` DEMOTED not dropped (parent+`allowedBlocks`
  cover 12 of 17; the other 5 are open containers); (4) the section-annihilation bug stays in Phase 5
  — zero live blast radius today.
  **NEXT SESSION: execute Phase 0.** Starts with a backup — the DB is gitignored, no other copy.
  Council found 3 BLOCKERs, two of which would have damaged the live DB; read COUNCIL FINDINGS first.
  ⛔ **Do NOT delete `scalar-media` or Loop 2** — both are live/recoverable, evidence in the parent
  plan. ⛔ **Do NOT delete any migration before its replacement seeder is PROVEN** — two `CREATE
  TABLE`s live only inside migrations queued for deletion. ⛔ **Scope every DB stat to `sgs/%`** —
  core blocks inflated a percentage three times this session. ⛔ **`sgs-card-grid` "cardRadius
  12→18px" is WITHDRAWN as a probe artefact.** ⛔ **Do NOT alias `trigger`→`tab`** — Bean's call.
- **Track 1b (Spec 35 components):** editor gap CLOSED (D425); open residue = Part I (2 items),
  Part-L rollout 4–32%, T1 parity 157 gaps/23 blocks. `reports/2026-07-30-track1-verification-audit.md`.
- **Track 1c (Spec 31 converter completion):** build shipped; open item is PROOF not build —
  `batch-report.json` reads 33 UNVERIFIED. `plans/2026-07-22-spec31-completion-to-100.md`.
- **Tracks 2+2b (nav/header/footer merge):** 5-wave strategic plan landed (D413), Wave 1 CLOSED,
  Wave 2 in progress. `plans/2026-07-29-merged-spec36-37-track-strategic-plan.md`. Task 5 (drawer
  variants) was REJECTED by Bean 2026-07-29 — do not re-present those pairs without real work
  first (`memory/session-2026-07-29-task5-drawer-rejection.md`).

---

## Standing constraints (carry forward — these are rules, not history)

- Per-row `position:sticky` REJECTED (short-parent trap, D389). Sticky stays HEADER-level.
- No absolute size value in a shared state-only stylesheet (D386), gated by
  `check-shared-css-state-rules.js`.
- After any `edit.js` / shared `src/components` change: deploy and OPEN the real editor (D388).
- A scoped axe run on a CLOSED surface passes vacuously — guard openness or the run proves
  nothing; any earlier drawer-axe claim from before D418 proves nothing.
- `templateLock:'all'`/`'contentOnly'` re-applies the template on EVERY mount, matched by ARRAY
  POSITION (D393) — pass the template only into a genuinely empty container.
- The D343 phantom border was WP core's `html :where([style*="border-width"])` substring-matching
  a custom property *named* `--sgs-tile-border-width` — not shadows-as-borders. Width vars are
  named `--*-thickness`. Do not re-propagate the wrong diagnosis.
- No-login shareable preview link is DROPPED, not deferred (Bean, 2026-07-27).
- `<footer>` is generic — key any assertion on the CLASS `wp-block-template-part`, never a naive
  regex; the canary page has 5 `<footer>` elements, four are quote attributions.
- `~/.agents` is NOT a git repo — the skillscore script + 5 grafted skills + `nextjs-testing` are
  LIVE but UNVERSIONED (recovery = per-file `.bak-2026-07-17-*`).
- **No block version bumps / deprecations pre-production** (Bean D293, overrides STOP-57).

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
  (currently D467 — D464 went to a co-active track mid-session; re-check live BEFORE writing any D reference) · framework
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
| Structural defences (STOP catalogue + pre-flight ritual) | `STOP-CATALOGUE.md` (uncapped, D101; 144 STOPs as of 2026-07-31) |
| Spec roster + DEAD-never-cite list | `specs/README.md` |
| Decisions (D-numbered, INCIDENT/ROUTINE tagged) | `decisions.md` (+ `memory/decisions-archive.md`) |
| Parked work (OPEN/PARTIAL/BLOCKED/DEFERRED only) | `parking.md` (+ `memory/parking-archive.md`) |
| Prior sessions' full narrative | `memory/session-YYYY-MM-DD*.md` + `memory/state-archive.md` |
| Build / deploy / SSH / credentials / gotchas | `dev-setup.md` · deploy = `build-deploy.py --target sandybrown\|palestine-lives` |
| Goals + exit criteria | `goals.md` |
| Hook off-switches | `.claude/secrets/hook-off-switches.md` (gitignored) |

## Blockers

**ONE HARD BLOCKER — production.** `--target palestine-lives` aborts on the
`oldshape-audit`: 29 NEW HIGH findings across 28 posts, where live `sgs/hero` blocks carry CTA
attributes the current block.json does not declare, so the next editor save deletes them. The
migration must run with Bean present. The canary is unblocked and current.

---

## NEXT SESSION — motion residuals (Track 3), or the production migration

**Read FIRST, in order:** this file → `STOP-CATALOGUE.md` →
`decisions.md` **D459, D460, D463** (this session) → **`plans/2026-07-31-motion-wave-D-client-readiness.md` §1**
(the residual register — its table names every open motion step in run order) → Spec 38 §3.3
FR-38-25 + FR-38-26.

### TRACK 3 (motion) — the residue, ranked. Register = `plans/2026-07-31-motion-wave-D-client-readiness.md`

**Everything open lives in that register, never `parking.md`** (Bean-ruled 2026-07-31).

**M1 — Step Z residual: ONE block-scoped focus sweep** [sonnet, ~45 min]
Every block-scoped `:focus-visible` still using `currentColor` or a hardcoded `primary-dark` joins
the shared `--sgs-focus-*` family: `nav-menu/style.css:123`, `responsive-logo` (lifted CSS),
`brand-strip/style.css:459`, `card-grid/style.css:264`, `cta-section/style.css:287`.
- **Orchestration:** delegated, sonnet, single agent. Brief: one sweep, one evidence pass — not five
  ad-hoc fixes. **/qc gate after: yes** (`/qc-inline`).
- ⛔ **`sgs/button` is NOT in the sweep until its writer is FOUND.** 7 elements compute `#3a2e26`
  while both matching rules resolve to accent — something the rule-scan missed is winning. Prove the
  cause first.
- ⛔ **`sgs/nav-menu` needs the first-paint probe fixed for multi-instance blocks first**, or a
  genuine capture. It was reverted once precisely to avoid faking that field.
- **Acceptance:** re-run the baseline method in `reports/2026-08-02-focus-cascade-baseline.md`;
  accent count rises from 15/25 and no element regresses off-palette.

**M2 — Step Y: the loop's untested arms** [sonnet, ~45 min] — reduced motion for the LOOP is
unstated (the drag module's SIMPLIFY contract does NOT transfer), and keyboard arrow-wrap at the
boundary was never exercised though WCAG 2.5.7 rests on it. **Now across FIVE blocks, not one.**
**Playwright only** — DevTools MCP has neither `prefers-reduced-motion` nor a trusted pointer.
Spec 38 §10 also has NO row for `cursor-field` or `carousel-loop`. **/qc gate after: yes.**

**M3 — push the `indus-foods` snapshot** [inline, ~10 min] — fixed in git; its LIVE site still
carries the teal until `push-theme-snapshot.py` runs against it.

**M4 / M5 — low priority** [sonnet] — Step R-residual (`floating-objects`, participant seam,
init-only walk) and Wave E's unverified residue (`:user-valid` on a real `sgs/form`; `fx-scrub` /
`fx-split-reveal` vs the SHIPPED bundle). Detail in the register.

### Dependency graph

```
M1 (sonnet, delegated) ──┐
M2 (sonnet, delegated) ──┼── parallel, disjoint files
M3 (inline, 10 min)    ──┘
        ↓ /qc-inline per branch
M4 / M5 (sonnet) — only if time remains
```

### Methodology guardrails (do not skip)

- **Deploy before measure.** A theme change needs a `style.css` Version bump + deploy + LiteSpeed
  purge before any probe. This session's whole Step Z detour existed because a THEME half was never
  deployed while `--blocks-only` deploys looked complete.
- **`build-deploy.py --dry-run` does NOT run the dirty gate** — a green dry run proves nothing.
- **A page-HTML grep cannot see scoped block CSS** — SGS lifts it to `uploads/sgs-css/`.
- **A probe that never reaches the effect measures the probe.** Four such defects this session.
- **Never claim a gate field you did not measure.** `first_paint_capture_passed` was the live case.
- **`wp post list` absence is not evidence of absence** unless `--post_status` was explicit.
- **Two tracks share this worktree.** Commit BY EXACT PATH, never `git add -A`; the pre-commit hook
  now enforces a pathspec. **Re-check the D-ceiling immediately before writing any D reference** —
  the other track took D464 mid-session and committed 3 times during this one.

### TRACK 3 — carried forward, unchanged
Steps **8** (physics sandbox — DECIDED at D447, only the FR write-up is owed), **12** (the cloning
lift, FR-38-22 — measured NO, motion does not survive a clone today), **20** (spec↔code
reconciliation), **O** (drag text-selection — ⛔ Bean re-checks by hand, do NOT dispatch an agent),
**U** (grid-block file-length debt), **21** (re-run `/adversarial-council`, deliberately last).

### Methodology, earned this session — do not re-learn these
- **`build-deploy.py --dry-run` does NOT run the dirty gate.** A green dry run against a filthy
  tree with no `--payload` is evidence of nothing.
- **A page-HTML grep cannot see scoped block CSS** — SGS lifts it to `uploads/sgs-css/`.
- **A probe's hardcoded viewport points can miss the element entirely** and report a failure that
  does not exist. Derive points from the target's own bounding box.
- **The canary currently carries two other tracks' uncommitted PHP** — deployed with
  `--allow-dirty` on Bean's explicit acceptance. It was NOT reviewed by this track.

⚠ **Two tracks share this worktree.** Commit BY EXACT PATH, never `git add -A`. **Re-check the
D-ceiling immediately before writing any D reference** — a collision happened this session: the
other track took D455/D456 mid-flight and a CSS docblock briefly cited someone else's decision.

- **Carried forward (still binding):**
  **Four new STOPs from T1.1 (D461) live in `STOP-CATALOGUE.md`** — shared git INDEX, `grep -c`
  **A grep for a literal cannot see a CSS-variable-driven value.** `opacity: 0.4` returned nothing
  **Never `head` a verification listing.** `ls sites/*/... | head -4` showed the four clients that
  **A wrong explanation does not make an observation wrong.** A real bug survived hours because its
  **Artefact presence is not behaviour.** Morph was in every manifest and roster and had never once
  **Pixel-sample when a rendered appearance is disputed** — computed said 5.79:1, the pixel said 1.79:1.
  **After any rebaseline, re-run the gate's `--self-test`** to prove it can still fail.
  **Reduced motion and gesture-level drag are Playwright-only** — Chrome DevTools MCP has neither a
### TRACK 1 (cloning) — a SEPARATE track from the motion/migration tasks below; pick one

**T1.1 — CLOSED 2026-08-02 (D461, `8cdc1460`).** Do not re-open; see the Track 1 bullet above and
`reports/2026-08-02-t1.1-evidence-pack.md`. ⛔ Three of its inherited diagnoses were measured FALSE
(the `block_selectors` "wiring" was already rejected 2026-06-20; the product-faq mis-conversion is
caught by gate G3 and is latent, not live; residual (e) was never a gap). Do not re-derive them.

**T1.2 — Execute Phase 0: make the DB rebuildable** [inline Opus, ~105 min]
**Read `plans/phase-0-db-rebuildable.md` IN FULL — especially COUNCIL FINDINGS (3 BLOCKERs).**
⛔ Step 0.0 backs up FIRST; the DB is gitignored with no other copy. ⛔ Migrations hardcode
`Path.home()` — a rebuild MUST use the sandbox harness or it writes to the LIVE DB.

**T1.3 — Phase 1 regenerative seeders, ONLY after T1.2 passes** [inline Opus]
Convert the ~24 remaining migrations to git-tracked JSON + idempotent seeders, per the working
pattern (`db_lookup._migrate_html_tag_to_core_block` + `scripts/data/*.json`). ⛔ Build the JSON from
LIVE state, never by replaying migration history; ⛔ never delete a migration before its seeder is proven.

### Task 1 — The production migration for palestine-lives [inline, Opus] — HIGHEST VALUE
**What:** run `plugins/sgs-blocks/scripts/wp-migrate-oldshape-blocks.js` in DRY-RUN, show Bean the
output, get explicit approval, migrate, then deploy.
**Why:** live client content currently loses its hero CTA text the next time anyone opens and saves
that page in the editor — and production is missing every accessibility fix from this session.
**Context the agent will not have:** Bean already approved the production deploy, but he approved it
before the audit revealed 29 high-severity findings. That approval does NOT carry to running a
migration over live content — get it again, with the dry-run in front of him.
**Time:** 45 min. **Depends on:** Bean present. Do NOT migrate unattended.
**/qc gate:** yes — re-run the oldshape audit after migrating and confirm 0 NEW HIGH.
**Acceptance:** `build-deploy.py --target palestine-lives` completes with the audit passing on its
own terms — never via `--skip-oldshape-audit`.
