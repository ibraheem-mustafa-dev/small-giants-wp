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

### Track 3 — Spec 38 motion: WAVE D CLOSED 2026-08-02 (D459, D460, D463) — all four tasks LIVE-VERIFIED

**7 commits, deployed to the canary, and every claim below is an observation with numbers — not
an artefact check.** Wave D's four tasks are done; the residue is named at the end.

| What shipped | Proven how |
|---|---|
| **Cursor-reactive FIELD system** (FR-38-25, widened by Bean from one glow to pluggable field types) | `probe-cursor-field.mjs` **10/10 live**: follows the pointer 1:1 (420→420px, 720→720px, 1020→1020px); the opaque child paints its own share at the SAME coords, so seamless by construction; reduced motion paints but stops tracking. **982 B gzip, zero GSAP.** |
| **Looping carousels** as an INDEPENDENT control (FR-38-26) | `probe-carousel-loop.mjs` **8/8 live**: 12 clones all inert+aria-hidden; **dots=6=real cards, not 18 (the cloned length)**; past-the-end re-seats instead of dead-stopping; drag AND loop both live on one element; a real pointer gesture moves it. |
| **Focus indicator** → accent glow over a neutral underlay (D463) | Measured on canary 2118 against the REAL cream surface: outline `#c56a7a` **3.32:1 clears the floor**, glow `#f5d050` 1.35:1 decorative. All three properties change on focus. |
| **Canary fixtures** (Step K) | CLOSED by measurement — **no rebuild needed**. Repo-wide search (not just `scripts/motion-qa/`) found the six deleted page IDs referenced by ZERO probes. The clean fixture METHOD is recorded in the Wave D plan. |

⚠ **SIX defects were found in ONE feature, and every one passed a green build.** Four by a
`/qc-council` code-path trace (undefined identifier · missing `sgs_fx_root_offset()` guard ·
effect absent from `SHIPPED_EFFECTS` so unreachable from the editor · attrs absent from
`FX_ATTR_MAP`); a FIFTH only by live verification after those four shipped (`cursor-field` missing
from `sgs_fx_effect_param_scope()` — the page looked entirely healthy while the client's chosen
colour and radius were silently dropped); a SIXTH was my own probe.

**THE STRUCTURAL FINDING: an effect must join THREE separate hand-maintained lists to work** —
`SHIPPED_EFFECTS` (fx.js), `FX_ATTR_MAP` and `sgs_fx_effect_param_scope()` (fx-attributes.php).
Two of the three were missed on this effect. **No gate cross-checks them.** That is the highest-value
next fix on this track.

⚠ **Methodology traps hit this session, all recorded:**
- **`build-deploy.py --dry-run` does NOT run the dirty gate.** A dry run with a filthy tree and no
  `--payload` passes cleanly. A green dry run is not evidence the real deploy is safe.
- **A page-HTML grep cannot see scoped block CSS** — SGS lifts it to `uploads/sgs-css/`. My grep
  returned nothing and read exactly like a failure; the rule was already captured and still caught me.
- **A probe that never reaches the effect measures the probe.** The cursor probe FAILED its first
  run on hardcoded viewport points that land on the header; a synthetic event at the element moved
  it to the exact pixel. Points now derive from the emitter's own bounding box.

⛔ **Deployed with `--allow-dirty` on Bean's explicit acceptance** — the shared tree held two other
tracks' uncommitted PHP (`helpers-container.php`, `render-helpers.php`, `lucide-icons.php`,
`extensions.css`, new `helpers-css-safety.php`). Raised as the D336 shape; Bean ruled proceed. The
canary carries that work; **it was not reviewed by this track.**

**OPEN on this track:** looping is `sgs/gallery` ONLY — the other five drag-roster blocks
(`buybox`, `google-reviews`, `post-grid`, `testimonial-slider`, `trustpilot-reviews`) need the
identical mechanical pattern · loop reduced-motion untested · keyboard arrow-wrap not separately
exercised · `extensions.css`'s `.sgs-has-focus-ring` is a FOURTH focus system, deliberately
untouched (co-active track owns the file) and now one generation behind · a gate for the
three-list drift.

### Track 3 (previous) — Wave E, 2026-08-01 (D447–D454, D457)

**Swept 2026-08-02 — full narrative + per-item verification state:**
`memory/session-2026-08-01-wave-e.md`. Superseded as the live front by Wave D above.

Two Wave-E results that are STANDING CONSTRAINTS, not history, so they stay here:
- ⛔ **`fx-horizontal-panel` has NO defect — a CSS bug is accidentally providing the rescue.**
  `overflow-x: clip` paired with a non-clip `overflow-y` computes to `hidden`, which IS a scroll
  container, so native scroll-into-view rescues focus. **Do NOT "fix" it to clip on both axes** —
  that silently deletes the only WCAG 2.4.11 cover this effect has.
- **The WooCommerce gallery bug did not exist.** A `core/query include:[540]` silently rendered
  product 1125, whose gallery is genuinely empty. Check WHICH product rendered before diagnosing.

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
  ⚠ **UNCOMMITTED — the motion track must carry it:** `src/blocks/form/block.json` holds the
  focus-ring `attrMap` fix (makes F6 green) PLUS that track's own colour-default change.
- **Track 1 (cloning/Spec 31) — Phase 0 remains the front. Root cause found; plan ready, NOT executed.**
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
  (currently D461 — D457-D460 went to a co-active track mid-session; re-check live BEFORE writing any D reference) · framework
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

- **Four new STOPs from T1.1 (D461) live in `STOP-CATALOGUE.md`** — shared git INDEX, `grep -c`
  exit-1 killing an `&&` chain, a correct fix that never runs, and fact-checking your own brief.
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
