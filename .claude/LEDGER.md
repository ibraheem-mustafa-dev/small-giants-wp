---
doc_type: state
project: small-giants-wp
last_updated: 2026-08-01
note: "THE single living-status doc. Status is REPLACED here each session, never appended. History → dated snapshots in memory/session-YYYY-MM-DD*.md (the ledger-rotate Stop hook snapshots automatically past the cap but NEVER edits this file — the sweep is manual). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep this file lean (< 24,576 bytes)."
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary

### FOR BEAN — plain English (read this first)

**What this is.** One file that answers "where are we and what's next", so a fresh session (or you)
gets ONE true answer instead of three drifting ones.

---

## CURRENT FRONTS

### Track 3 — Spec 38 motion + accessibility: WAVE E EXECUTED 2026-08-01 (D447–D454, D457)

**16 agents, 21 commits, deployed and verified on the canary.** Verification state is stated PER
ITEM — read it, do not assume a uniform "done".

| Verified LIVE against the SHIPPED bundle | Built, NOT yet live-verified |
|---|---|
| **Morph** — had NEVER animated on ANY block (D452). Attrs sat on the `<svg>` wrapper; MorphSVG refuses a container. Now on the inner `<path>`; `d` travels circle→square, 150 mid-flight samples | `:user-valid` cascade fix (D457 part 2) — proven on a bare-input fixture, not a real `sgs/form` |
| **Motion-path** (D451) — animated once per page load; `onLeave` disabled the trigger whose own `onEnterBack` was the only re-enable. 54/54 matched positions agree across two passes × 3 viewports | Focus-ring `color-mix` at a non-default opacity on a live client page |
| **Keyboard focus reveal** (D453) — pinned/scrubbed content left focusable controls invisible. Fixed in `fx-pin-scrub` (ticker hold), `fx-scrub` (ticker hold), `fx-split-reveal` (**one-shot — no scrub, so no race; deliberately NOT the same shape**) | `fx-scrub`/`fx-split-reveal` probes against the shipped bundle after the final deploy |
| **Focus ring** (D454 + D457) — `opacity` dimmed the WHOLE field including typed text; ring colour was 2.25:1. Now `color-mix` on the outline + `primary-dark` default, clearing 3:1 on all 8 palettes | |
| **Per-tier motion disable** — attrs were emitted and read by NOTHING. Gated at `bootEffect`. At 375px the control block ran 0→0.86 while the disabled one held at 1 (fail-open confirmed) | |
| **Contrast** — placeholder via colour not opacity; muted text ≥4.5:1 on `surface` AND `surface-alt`, all 8 clients; axis files synced so a regeneration cannot revert it | |
| **Grid fold** — `content-collection` → `card-grid` via ONE shared engine, not a copy. Old block still registered and running the same engine, so migrated and unmigrated pages cannot diverge | |
| **Buybox drag** — 1:1 pointer tracking (30→30, 60→60, 90→90), clamps at 96 | |
| **Deploy⇄commit deadlock** broken via `--payload`; **fx panel lint gate** now covers 12 panels | |

**Two results worth more than the fixes themselves:**

- **`fx-horizontal-panel` has NO defect — because a CSS BUG is accidentally providing the rescue.**
  `overflow-x: clip` paired with a non-clip `overflow-y` computes to `hidden`, which IS a scroll
  container, so the browser's native scroll-into-view rescues focus. The module docblock claimed the
  opposite. ⛔ **Do NOT "fix" it to clip on both axes** — that silently deletes the only WCAG 2.4.11
  cover this effect has. Documented in `assets/css/fx-horizontal-panel.css`; regression probe proven
  non-vacuous (forcing genuine clip makes it report FAIL).
- **The WooCommerce gallery bug did not exist.** The canary's `core/query include:[540]` silently
  rendered product **1125** (the newest), whose gallery is genuinely empty. The blocks were correct
  throughout. Trap recorded in `plugins/sgs-blocks/CLAUDE.md` gotchas.

⚠ **8 defects surfaced this session; FIVE were in the MEASURING, not the code.** A regex matching
letters where the values were digits · a DB query assuming a name prefix · a `head -4` hiding
exactly the four rows that mattered · a grep for a literal against a CSS-variable-driven rule (the
offending line was in my own earlier output) · two lint runs that could not fail. None became a
false report only because something checked a second way. **New STOP entries: `STOP-CATALOGUE.md`.**

⛔ **PRODUCTION IS BLOCKED, DELIBERATELY.** `--target palestine-lives` aborts on `oldshape-audit`:
**29 NEW HIGH findings across 28 posts** — live `sgs/hero` blocks carry `ctaPrimaryText`/`ctaPrimaryUrl`
/`ctaSecondaryText`/`ctaSecondaryUrl` that the current block.json does not declare, so **the next
editor save DELETES them** (the D338 class), plus old self-closing blocks whose renderer now expects
InnerBlocks (stranded `headline`, `subHeadline`). Bean approved the production deploy WITHOUT
knowing this existed. `scripts/wp-migrate-oldshape-blocks.js` (dry-run by default) must run first,
with its output in front of him. **The canary is current; production is one build behind and keeps
the field-dimming bug until this is done.**

### Tracks 1b / 1c / 2 / 2+2b — stable · **Track 1 MOVED 2026-08-01 (D437–D439)**

Full detail lives where it already did — read before acting, do not assume it is current from
memory alone:

- **⭐ Track 1 (cloning/Spec 31) — ACTIVE. Root cause found; Phase 0 plan ready, NOT executed.**
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
  (currently D457 — the co-active track took D455/D456 the same day, which forced a renumber mid-session; re-check live BEFORE writing any D reference) · framework
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

## NEXT SESSION — the production migration, then Round 3 (motion)

**Read FIRST, in order:** this file → `STOP-CATALOGUE.md` (new entries this session) →
`decisions.md` D447–D457 → `plans/2026-07-31-motion-wave-D-client-readiness.md` → Spec 38 §3.1 + §10.

⚠ **Two tracks share this worktree.** Commit BY EXACT PATH, never `git add -A`. **Re-check the
D-ceiling immediately before writing any D reference** — a collision happened this session: the
other track took D455/D456 mid-flight and a CSS docblock briefly cited someone else's decision.

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

### Task 2 — Step R: build the cursor-follow glow (FR-38-25) [delegated, opus]
**What:** spec'd and Bean-signed at D444; ZERO code exists. `src/shared/effects/spotlight.js` is
already generic and consumed only by `sgs/mega-panel`; what is missing is the CSS contract and the
two-role emitter/participant provision derivation.
**Context the agent will not have:** measure the two STATED-BUT-UNMEASURED risks FIRST, not last —
a `radial-gradient` repaints every frame the pointer moves (N participants means N repaints), and
legibility must be measured at the field's BRIGHTEST position, never at rest. Adding a provision
category is exactly what zeroed `sgs/decorative-image` before.
**Time:** 2 h. **Parallel with:** Tasks 3 and 4. **/qc gate:** yes.

### Task 3 — Step Q: looping carousels [delegated, sonnet]
**What:** Bean's ask, verbatim — "for the dragging physics feel the option to make the carousels
looping is important so it doesn't get abruptly stopped by the end of the list and just loops
round". Universal across the drag roster, not per-block. Its stated precondition is now met: the
drag fixes shipped, so this is no longer layering behaviour onto a faulty base.
**Context:** the accessibility story is NOT spelled out — a looping carousel versus WCAG 2.5.7's
discrete alternative needs an answer, the same open concern as Step 8. Owns `fx-draggable.js`.
**Time:** 1.5 h. **Parallel with:** Tasks 2 and 4. **/qc gate:** yes.

### Task 4 — Step K: rebuild the deleted canary fixtures [delegated, haiku]
**What:** Bean deleted six contaminated pages (2022, 2023, 2024, 2025, 2026, 2029). Rebuild
whichever are still needed as baselines using the KNOWN-CLEAN method — pages 2105/2107/2109 carry
12–18 containers with zero bad wrappers, so the newer build path is already correct.
**Record the method** in the plan so this cannot recur. **Time:** 30 min. **/qc gate:** no.

### Task 5 — Close Wave E's unverified residue [delegated, sonnet]
**What:** three fixes shipped but never observed live — (a) the `:user-valid` cascade fix on a REAL
`sgs/form` instance rather than a bare-input fixture, (b) the focus-ring `color-mix` at a
non-default ring opacity on a live page, (c) the `fx-scrub` and `fx-split-reveal` probes against the
SHIPPED bundle after the final deploy.
**Why:** each is currently proven by mechanism, not by observation — precisely the gap that let
morph sit broken for months while every artefact said it worked.
**Time:** 45 min. **Depends on:** a deploy having happened. **/qc gate:** yes.

### Dependency graph
```
Task 1 (inline, Opus — Bean present, production, gated on his approval)
  |  independent of the rest
Task 2 + Task 3 + Task 4  (parallel; file-disjoint:
                           spotlight.js+fx.js · fx-draggable.js · canary pages only)
  v  deploy
Task 5 (verification sweep — must follow a deploy)
  v
Commit by exact path -> push
```

### Methodology guardrails (earned this session — do not inherit as solved)

- **`node --check` passes an undefined identifier** — it validates syntax, not scope. A fix on the
  accessibility path would have thrown at runtime after passing it.
- **`eslint --rule '{"no-undef":"error"}'` is VACUOUS in this project** — the config overrides it.
  Proven by planting an undefined identifier and watching a clean exit. Verify scope by direct
  identifier-binding inspection instead.
- **A grep for a literal cannot see a CSS-variable-driven value.** `opacity: 0.4` returned nothing
  while `opacity: var(--x)` was the defect — and the line was already in my own earlier output.
- **Never `head` a verification listing.** `ls sites/*/... | head -4` showed the four clients that
  were fine and hid the four that were not.
- **A wrong explanation does not make an observation wrong.** A real bug survived hours because its
  first report misattributed the mechanism and the whole claim was dismissed.
- **Artefact presence is not behaviour.** Morph was in every manifest and roster and had never once
  animated.
- **Pixel-sample when a rendered appearance is disputed** — computed said 5.79:1, the pixel said 1.79:1.
- **After any rebaseline, re-run the gate's `--self-test`** to prove it can still fail.
- Deploy before measuring. Cache-bust every canary read. Poll until `scrollY` settles, never sample
  at a fixed delay.
- **Reduced motion and gesture-level drag are Playwright-only** — Chrome DevTools MCP has neither a
  `prefers-reduced-motion` parameter nor a trusted pointer primitive.
