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

- **⭐ Track 1 — PHASE 0 + 1 + 2 COMPLETE 2026-08-02 (D464, D468–D474). T1.1, T1.4–T1.7 all closed.**
  **Full narrative: `memory/session-2026-08-02-track1-phase1.md` + `memory/session-2026-08-02-track1-phase0.md`
  — read before acting.** Decisions D464/D468–D474 are authoritative.
  ⛔ **MIGRATION REPLAY IS A DEAD END — proven.** `slot_synonyms` was retired, so 3 migrations
  reference a table the schema correctly lacks. Void any step premised on replaying `migrations/`.
  ⛔ **Never delete a migration before its replacement seeder is PROVEN** · **scope every DB stat to
  `sgs/%`** · do NOT delete `scalar-media` (D474 restored it — it is LOAD-BEARING).
  ⚠ `populate-db.py` lives at `~/.agents/…`, **NOT in any git repo**; never run it whole.
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

**NONE.** `--target palestine-lives` still aborts on the `oldshape-audit` (29 NEW HIGH / 28 posts,
evidence: `reports/2026-08-01-palestine-lives-oldshape-blocker.md`), but **palestine-lives is
disposable Indus staging that gets remade — not production**, so this blocks nothing that matters
and the rebuild clears it for free. Fixer if ever needed: `scripts/wp-migrate-oldshape-blocks.js`.
The canary is unblocked and current.

---

## NEXT SESSION — motion residuals (Track 3), or Track 1 Phase 1

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

**M4 / M5 — low priority** [sonnet] — Step R-residual (`floating-objects`, participant seam,
init-only walk) and Wave E's unverified residue (`:user-valid` on a real `sgs/form`; `fx-scrub` /
`fx-split-reveal` vs the SHIPPED bundle). Detail in the register.

### Dependency graph

```
M1 (sonnet, delegated) ──┐
M2 (sonnet, delegated) ──┴── parallel, disjoint files
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
- **A probe's hardcoded viewport points can miss the element entirely** and report a failure that
  does not exist. Derive points from the target's own bounding box.
- **The canary carries two other tracks' uncommitted PHP** — deployed with `--allow-dirty` on Bean's
  explicit acceptance; NOT reviewed by this track.
- **A self-healing seeder BLINDS an in-process test** (D474). If a module-load seeder repairs the
  fact, a pytest assertion on it is vacuous — the detector must be a separate process that never
  imports the seeder. Proven by negative control, not assumed.
- **A population count cannot see a RECLASSIFICATION** (D474) — right row, wrong-but-plausible value,
  count unchanged. Floors catch emptying; value-identity assertions catch reclassification.
- **A synthetic repro can hide the deciding detail** (D474) — a one-class test markup where the real
  draft carries two classes sent 2 of 3 council reviewers to the wrong option.

- **Carried forward (still binding): all live in `STOP-CATALOGUE.md`** — 153 STOPs, verified carried
  forward by `handoff-preflight.py`. These bullets were truncated fragments here (bodies lost in an
  earlier sweep) and are held in full there: the 4 T1.1/D461 STOPs · a grep for a literal cannot see
  a CSS-variable-driven value · never `head` a verification listing · a wrong explanation does not
  make an observation wrong · artefact presence is not behaviour · pixel-sample when a rendered
  appearance is disputed (5.79:1 computed vs 1.79:1 rendered) · after any rebaseline re-prove the
  gate's `--self-test` · reduced motion + gesture drag are Playwright-only.
  ⚠ **A grep's negative result describes the GREP, not the codebase** — this bit three times this
  session, most recently when phrase-greps "proved" these lessons were lost while the catalogue held
  all nine in narrative form. Confirm with a second shape before concluding absence.
### TRACK 1 (cloning) — a SEPARATE track from the motion/migration tasks below; pick one

**T1.1 / T1.2 / T1.3 — ALL CLOSED 2026-08-02** (D461, D464). Do not re-open or re-run. ⛔ Three of
T1.1's inherited diagnoses were measured FALSE — do not re-derive; detail in
`memory/session-2026-08-02-track1-phase0.md` + `reports/2026-08-02-t1.1-evidence-pack.md`.

**READ FIRST:** `reports/2026-08-02-phase1-table-classification.md` (Phase 1's measured scope) →
`plans/2026-08-01-db-derivation-and-converter-cleanup.md` status block → D464/D468/D469.

**T1.4 — ✅ CLOSED 2026-08-02 (D470, commit `1f9cc18a`, pushed).** `property_suffixes` 154/154,
`slots` 104/104, `excluded_properties` 10/10 — all byte-exact AND rowid-order-exact vs live.
`rebuild_compare.py`: identical **12 → 15**, **`empty (known Phase-1)` = 0**. Suite 587/1 skip,
unchanged. Seeders in `db_lookup.py` from git-tracked `scripts/data/*.json`, captured by the new
`dbschema/capture_seed_data.py` (`--check` = drift detector, `--self-test` proves `--check` fails).
⛔ **ORDER IS LOAD-BEARING for `property_suffixes` too** — `propose_attr_name()` uses
`ORDER BY rowid LIMIT 1`, so for a css_property with >1 suffix row the FIRST WINS (`Colour` before
`Color`). All three use compare-first + DELETE + ordered re-INSERT, never `INSERT OR REPLACE`.
⛔ **`seed-slot-alias-extensions.py` is SUPERSEDED** — its 4 aliases are baked into `slots.json`;
extend the JSON, never re-run that script. `KNOWN_UNREPRODUCIBLE` is now EMPTY (kept, not deleted),
so the 13 tables in the "NOT known" bucket are Group-3 history + Group-4 residue (T1.6), already
classified — not new findings.

**T1.4–T1.7 + PHASES 2, 3, 4 and 1b — ✅ ALL CLOSED 2026-08-02 (D470–D475). The parent plan is DONE.**

⛔ **D475 — Spec 31 §4 carried a FALSE claim** (`grid-layout`/`full-width-banner` "gate" — they do
not; only 3 of 36 capability tags are ever read). Corrected, and 3 working columns it had never
listed were added. ⛔ **`array_item_fields` RETIRED — and dropping it was NOT enough**: `db_lookup`
recreated it at import within seconds. **A table with `CREATE TABLE IF NOT EXISTS` on a hot path
cannot be retired by dropping it — every creator must go.** ⚠ Its seeder NEVER EXISTED (0 INSERTs,
two search shapes); the comment claiming a seeding loop was false. Do not confuse it with the LIVE
`array_item_schema` (68 rows) — one character apart.

⛔ **D474 — art-directed media was BROKEN LIVE and I had called it fine.** A hero clone put the
MOBILE crop in the DESKTOP attr and dropped the desktop image into a stray child. **`scalar-media`
does TWO jobs; `emit_shape` superseded only ONE** (no-child-block). The other — reading each image's
`--mobile`/`--desktop` modifier via `run_mechanism_b` branch A — had NO replacement. Do not
re-derive "it's redundant from emit_shape"; that was measured false. It broke because D128 set the
role with a hand `UPDATE` recorded only as "DB (gitignored)" — **nothing a rebuild could find**.
Now: `data/scalar-media-roles.json` + a module-load seeder that ALSO announces drift on stderr.
⛔ **The real markup carries TWO classes** (`sgs-hero__split-image sgs-hero__split-image--mobile`);
`_family_element` returns on the FIRST, which has no modifier — so a resolution-level fix never
reaches it. A synthetic single-class repro hid this and misled 2 of 3 council reviewers.
⛔ **A SELF-HEALING SEEDER BLINDS AN IN-PROCESS TEST.** My first regression test passed against a
corrupted DB because importing `db_lookup` repaired it first. The detector must not import the
seeder → **value-identity assertions in `check_row_floor.py`** (sqlite3 only — keep it that way).
⛔ **A population floor cannot see a RECLASSIFICATION** — `scalar-media`→`image-object` left the
count at 1012→1012. The gate named that incident and was blind to it.

- **T1.5** `dbschema/check_row_floor.py` + `row-floor.json` — fails on row/column-population DROPS,
  tolerates growth. ⛔ **Column-level granularity is the point**; a table-count-only gate would have
  missed every historical loss. ⛔ **Do NOT add `block_composition.has_inner_blocks`** — FR-31-2.6
  retired the CACHE deliberately; the fact is derived fresh by `converter/services/has_inner.py`.
  **A population floor is the right gate for a CACHED fact and the wrong gate for a DERIVED one.**
- **T1.7** `bootstrap_rebuild()` restores `hooks`/`docs` from the committed gzip archive (offline +
  deterministic, NOT the GitHub scrape). `hooks` **5494 = 5494 exact**; archive hidden → both come
  back **0** (negative control). ⚠ `docs` rebuilds to **1123 vs live 1077** — the surplus is entirely
  `native_wp` from the Stage-2 network scrape; `sgs` docs match **16/16**, zero slug drift. Not a
  defect; the offline floor is the archive.
  ⚠ **The agent's "docs at exact parity" did not survive an independent full run** — it measured with
  `--stage 1`, which skips a later docs writer. Re-running an agent's own method repeats its blind spot.
- **T1.6** `_meta_schema_version` (1) + `block_styles` (63) RETIRED, archived reversibly.
  ⛔ **`enrich-db.py`'s stated blocker was FALSE** — `target_21_slot_synonyms` was a stale NAME on
  correct behaviour (renamed `target_21_canonical_slots`). The real defect was in
  `target_210_health_check`, which has queried the dropped `slot_synonyms` since D99. Fixed + made
  degrade-not-die on a missing table. **`--only <ids>` + `--list-targets` shipped**, unblocking the
  2.4 / 2.8 seeders.
- **New tools, both with passing `--self-test`s:** `dbschema/retire_table.py` (backup → archive →
  **round-trip verify** → drop; a corrupt archive blocks the drop) and
  `check_schema_drift.py --regenerate` (generator lives inside the gate so writer and comparer cannot
  disagree; explicit, never automatic).
- **Both gates fired correctly on their first real event** and are clean at **37 tables**.
  Suite 587/1 skip.

**Next on Track 1:** Phase 1b (Spec 31 column reconciliation) · Phase 2 (`scalar-media` derivation) ·
Phase 4 (purge) · Phase 5 (loop defects). Wiring the standalone gates into a run is still an open
question — `check_schema_drift.py`, `check_row_floor.py` and `capture_seed_data.py --check` are all
manual today, and a gate nobody runs is the failure mode this project keeps recording.

