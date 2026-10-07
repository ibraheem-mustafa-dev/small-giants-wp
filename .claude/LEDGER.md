---
doc_type: ledger
project: small-giants-wp
last_updated: 2026-10-06
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary — FOR BEAN, plain English (read this first)

**DRAFT STANDARDISATION: council done, plan approved (D1132). Read `.claude/plans/2026-09-20-draft-standardisation-plan.md`.**
Plan: (A) wire and extend existing functions, no new stage; (B) a small draft standard only for what code cannot derive,
written into the draft by Claude Design; (C) a deterministic checker as the second layer. A1 DONE (D1132): the width
evaluator is wired in. A2 DONE (D1134): the draft's links and loop copy fill in from its own script. Ticker and reviews card
equal the draft at every width (D1139-D1145). Open: 36 raw placeholders (plan A3, Track D). Detail: D1132-D1145.

**Eye Care: now built by hand first (D1149, 2026-09-24).** The Eye Care site is built by hand to client-ready
from Claude Design's gap map; the finished site becomes the pipeline's answer key. Every surface is built and live
on eye-care-test, and the fix register is the work list with all decisions taken. Spec 47's tool measures the draft
against the live site and writes the layout settings automatically; it took the About page to 100%. The whole-site sweep found 2,373 differences and the sort put every one in a labelled box with
evidence: **163 came out as candidate gaps in the framework** after a hand audit, the rest are measuring artefacts,
knock-on effects or values that write themselves.

**You answered Gate B on 5 October: yes, with the measuring-tool fixes first**, and you re-cut the rest. Your
fix list stays the source of truth, so those findings are checked against it rather than built, and the tool gets
repaired before anything is judged — several of them ignore how the framework works.

**Half of the tool repair is done (5 October).** Six lanes landed and its first gate passed: the machine's raw count
of candidate gaps **fell 338 to 177**, every row movement accounted for, 322 tests green, no block code touched.
⚠️ **177 is the machine's raw number; the 163 above is the hand-audited one — not the same scale**, so never compare
them. Outstanding: three more lanes, then the host jobs that give the real post-repair count. **Checking findings
against your list cannot start until that count exists.** It also corrected one of its own claims that did not hold.

**Nav / header / footer.** Waves 1-3C are built and live on sandybrown. Gate 3C items 1, 2, 3, 5 pass; item 4 (the
Indus and lamalama copies) has every open row classified with no new foundational gap, and its last mile is deferred
by Bean (2026-10-01). Waves 4 and 5 (the reference clones and the clone walker) have not started. One plan for the
whole thread: `plans/2026-10-01-header-nav-thread-plan.md`.

**Indus Foods** has its own dedicated test site (`lavender-dinosaur-183533.hostingersite.com`,
deploy target `indus-test`) because the active header/footer/theme-snapshot pointers are single
GLOBAL `wp_options` rows per site. Its content build is documented in `sites/indus-foods/CLAUDE.md`.

Things that need Bean directly, not a subagent: the drawer-burger click retest, the mega-motion
Bean's-eye check.

## Blockers

**None.**

## THE FRONT — what to pick up next

### Front F — Eye Care Birmingham, built by hand (Bean-directed, D1149)

Draft: https://mintcream-lyrebird-224487.hostingersite.com/ (source `sites/eye-care-ward-end/Ward End Eye Care - SGS Gap
Handoff/`). Test site: https://darkcyan-grouse-898606.hostingersite.com (creds `.claude/secrets/eye-care-test.env`).

**Now (2026-10-06).** Both sites carry the Tier 2 shop-journey work; see that paragraph below for the live SHAs by marker. ⚠️ **Both sites now run WooCommerce 11.1.2** (Bean upgraded the canary on 2026-10-06; confirmed by `wp plugin get woocommerce` on each). Earlier "installed 11.1.0" citations about the canary record what was read AT THE TIME and are provenance, not current state — re-read the installed source before relying on any of them, because no 11.1.0 install remains. Live = HEAD is proven by the deploy-ownership markers `~/.sgs-deploy-marker-<target>.json`, not a liveness check.
The fix register `plans/2026-10-02-eye-care-fix-register.md` (v2) is the source of
truth for what gets fixed: 12 site-wide fixes (S1-S12), every surface's items, decisions D1-D9, three build rules.
No blockers.

**Spec 47 (v0.15): the computed route** (`scripts/computed-route/`, `specs/47-COMPUTED-ROUTE-DRAFT-TO-TREE.md`). "Solve"
compares a built page with the draft and writes block settings. Every surface is paired; **about is at 100%**. Always
read per-surface counts from `qa/triage/*.json`, never a cached figure. **Everything except stage 5 (a second draft)
is built.** Route defects with owners are in §5 Residual. Run host tools with `SGS_HEADED=1`, one job at a time
(dev-setup.md); local WSL mirrors at localhost:8081/8082 if Hostinger shows a captcha (`scripts/local-wp/README.md`).
⚠️ **`solve.mjs --rounds 0` is NOT read-only against the live site**: `solve.mjs::build` runs `wp-build-page.js` for
real, so every surface's page is rebuilt from its tree file. It writes no solver setting; it does rewrite the page.

**Sessions A, B and C — COMPLETE** (`plans/2026-10-04-eye-care-sweep-audit-fix.md`,
`plans/2026-10-04-spec47-full-coverage.md`, `plans/2026-10-05-eye-care-session-c-spec47-route-fixes.md`).
⚠️ **B's audited 163 is never comparable to any RAW triage count**, and Gate 3's stripped-control 338 is
**refuted** (C2 measured 345 then 346), though its zero-movement-on-non-canvas half holds.

**Session C2 — COMPLETE 2026-10-06** (`plans/2026-10-05-eye-care-session-c2-finding-assessment.md`; all
evidence in `reports/2026-10-06-session-c2/`). Raw **F 193 at `94122e326`**. Of 178 judged F rows: 30 real,
22 settable or accepted, 11 wrong block, 90 artefacts, 25 register-decided; 14 Google Reviews excluded as
accepted differences. Bean approved 5 of the 7 candidate fixes. ⚠️ Compare sweeps on a **normalised** path:
a cosmetic path change re-keys rows wholesale.

**Owed, each with its owner:**
- **F3/E14 — 9 more SHIPPED 2026-10-07** (`75a583e23`..`fdceca53f`), deployed `0cc773b19`. Ceilings
  **CLASS-2 48, CLASS-3 2, CANNOT-RESOLVE 61**, measured; self-test 24/24; db-consistency 38→0.
  **13 of 26 FIX closed, 13 open** (triage §3.1/§5): `sgs/form` tile icon/label, review term,
  consent text; `option-picker` pill text. Surface rules + 4 gate costs: auto memory
  `installing-a-typography-surface-trips-four-gates` (ONE panel via `targets`, inline selector,
  `:where()`, and a parent painting a CHILD block needs `typographyPreviewCss` or L3 gaps block
  EVERY deploy). Shared-include blindness FIXED.
  ⚠️ **VERIFY INCOMPLETE.** Live-proved only: process-steps defaults at 1440+375, sham
  controls, 0 sheets skipped. `countdown-timer`/`product-faq` have **0 live instances** (fixture
  needed); set-a-control + editor halves UNRUN. Script ready, never run:
  `scratchpad/verify-f3-e14-surfaces.mjs`.
  **PARKED (Bean):** 24 `product-card::valueLadder*::L3` need a bound-mode canvas mirror — not
  now (§6).
- **Route cleanup — DONE and VERIFIED 2026-10-06** (`plans/2026-10-06-spec47-route-cleanup.md`, results
  `reports/2026-10-06-session-c2/WAVE4-RESULTS.md`). 16 tasks, suite 523 → 589. **F 193 → 173**, measure-only,
  inside the 155-175 band committed BEFORE the sweep. All four owed items closed or named.
  **`--noise` DONE** (`BENCHMARK-NOISE-RESULT.md`): **5 of 5 scored caught; noise 5 rows, all PHASE — host load
  and flakiness both EXCLUDED.** **Canvas: ALL 63 families confirmed on one SHA** (`confirm-canvas.mjs`,
  `CANVAS-SETTABLE-CONFIRMATION.md`): 59 refuted, 4 not-refuted-but-not-proven, 0 absent. Cause MEASURED:
  `reachesElement` **fails open** — `emissionOf` null for every refuted one, so each row read W untested.
  **`mobile-menu` pairs** (`7255be68d`), `handScope` in git for all 17.
  **`sgs/hero`'s 3 closed** (`HERO-DEAD-SETTINGS.md` §9): `maxWidth` is a REAL gap — **never remove
  `section.sgs-hero{max-width:none}`** (D725, 24px off-screen).
  **OWED, no host needed:** (1) the W→F reclassification over all 63 at once so F keeps one meaning; (2) **CR6 is
  a MIGRATION** — 178 call sites / 56 files through ONE helper whose contract is the defect, 112 identical
  boilerplate, needs `/strategic-plan` first (spec 47 §5). **CR12 is PARKED pending Bean**: the deriver
  hard-refuses Eye Care on contrast, 3 design options on its register row.
  ⚠️ `solve.mjs` defaults to **3 WRITE rounds**; a sweep needs `--rounds 0`. Mirrors (8081/8082) are fast but carry
  **no `cr-ref` for header/mega/shop/product/lens/size-guide**; `curl` needs `-6`. **Never `wsl --shutdown`
  (SearXNG).**

- **The 63 walker-blind rows — ALL CLASSIFIED, 18 NOW FIXED** (`reports/2026-10-06-eye-care-63/` has every
  verdict and its evidence). 11 built, 20 open, 4 content (drafted in `sites/eye-care-ward-end/content/`),
  2 divergences, 12 aliases, 14 CR, **0 left to measure**. `N11`, `N25`, `N13` were already closed, not unbuilt.
  **N26 VERIFIED LIVE** (`3db77f090`): every card is **99% clickable** against 1-2% before; `blockLinkAlways`
  makes it PERMANENT (Bean), the hover underline is gone, and `sgsBlockLinkAuto` is deliberately no longer a
  product-card attribute (gone, not lost) while the URL field STAYS for typed cards.
  **SEVEN more VERIFIED LIVE at `0cc773b19`:** `58` `9` `N33B` `17`/`3` `19` `64` `N24`; `152` BUILT, `N13`
  closed unchanged. ⚠️ **A plugin deploy does NOT apply a tree fix:** 58/9/N33B/17 needed `wp-build-page.js`
  on posts 208/176/199 + the `single-product` template. **CR: none of the 14 closed by
  the cleanup; **`CR12` PARKED pending Bean; `CR6` owned, see below.**


**Routing:** the 31 held rows stay NULL (deliberate). Transition rows DO calibrate
(`calibrate-markers.mjs::transitionMarker`); the gap is the marker gating on the attr NAME
`/(^|[a-z])Transition(Duration)$/`, so 36 of 63 transition attrs in 12 blocks read dead. Fix: key on
`css_property`, which it already checks.

**Register repairs, backlog Tier 1, and Tier 2's shop-journey group — all built, verified, pushed.** Tier 2's
five: 18 (closing 93), 20+23, 59/61, S10 and S9 — each row carries its own hash. `brandUseLogo` ships
`true` (a cross-client default).
**All four open items CLOSED**, with a `/qc-council` pass and Bean's live-breakage finds fixed and verified.
Causes and negative controls are in register rows S10, 59 and 20+23; the lessons are in auto-memory. The one
still load-bearing: the stretched link was rebuilt so a block's OWN visible link owns the surface, which is
why the product card read as dead outside its name and image (report §5a).

The wiring gate blocks new gaps only (count: read `scripts/wiring-fingerprint-baseline.json`); Session 0's P0-3 to P0-10 are parked in the sweep plan.

**The one Eye Care plan:** `plans/2026-10-02-eye-care-plan.md` (decisions, surfaces, work plan).
**Resume from:** the 63's §5 — prove or kill the manifest-cache cause behind the 12 imageless, unclickable
shop cards, then the quick wins 36 and S8. Per-surface Solve work is Session D.

**Separators** (DONE, live on both sites): `plans/archive/2026-10-01-separators-plan.md`. Open only if asked:
the composites' editor canvases and the cart panel show spacing only in the editor. The container roster script
(`scripts/sync-container-wrapping-blocks.py`) writes the DB only; container capabilities are opt-in per block.

**Parked (detail in the plans):** Mama's Munches needs a site copy of the shop template for its Flavour and Size
groups; card-grid zoom amount control; `disabled` as a golden state; nav-drawer badge/disabled; `IconPicker` `id`.

### Spec 36+37 merged track (after Front F)

Plan: `plans/2026-10-01-header-nav-thread-plan.md` (the only plan for the thread; the wave-3C, strategic,
reference-capture and G8 plans are archived). Proof: `verify/merged-spec36-37-track.md`.

**Now (2026-10-01).** Waves 1-3C built and live on sandybrown (c8e805e73); owed Wave 1-3 items in plan §3. Gate 3C items 1, 2, 3, 5 pass. Item 4: the
walk after this session's deploy (`reports/visual-diff/gate3c-copies-walk-2026-10-01.md`) leaves Indus 10 violations
and 3 jitter rows, lamalama 7 violations and 1 foundational gap (G8, parked); no new foundational gap. Header fixes
this session: per-device values accepted for the nav, drawer and cart box settings; a mega panel no longer flashes at
its default spot when switching panels; the hover indent grows from each device's own padding. Waves 4 and 5 not
started. Bean's hPanel action (allow-list the canary's "Checking your browser" page) blocks only Gate 3C's final
walk (plan §2.4 step 5).

**Resume from:** plan §2.4 to close Gate 3C formally (deferred by Bean), or §4 to prepare Wave 4.

### Open from the closed unified-email track (`plans/archive/2026-09-26-unified-email-plan.md`)

`sgs/mega-group`'s focus ring uses the accent colour (found during that plan, not its work), and `sgs-client-notes` still deploys via the standalone `scripts/deploy-client-notes-quick.py` — third-root `build-deploy.py` integration deferred.

### Front E — Spec 45 classless FIELD resolution (open)

Built, all 4 tiers, empirically validated — but has NO live pipeline input yet, because Spec 44
does not produce real matches on real data for it to consume.

### Tasks — need Bean directly, not a subagent

- **Drawer-burger click retest.** Confirm live whether the intermittent click-miss (2/3 real
  clicks failed to open the drawer in automated testing) still occurs now the duplicate-burger fix
  has shipped. If it still fails, dispatch a fresh `/systematic-debugging`.
- **Mega-motion Bean's-eye (R-31-13).** Book it with the next live URL.

## Methodology guardrails (all still true)

- ⛔ **`git grep` only, never `grep -r`** — stale worktrees inflate counts massively.
- ⛔ **Never pipe a population-defining survey through `head -N`.** Count first (`| wc -l`).
- ⛔ **`$?` after a pipe reads the LAST command's status.** Redirect first.
- ⛔ **`git grep -c` with an explicit path prints `path:count`, not a bare integer.**
- ⛔ **Python `shell=True` on Windows is cmd.exe, not bash.**
- ⛔ **A regex `\b` after a slug matches inside a hyphenated sibling.**
- ⛔ **A name-mention is not a usage.** Real call-detection, not string match.
- ⛔ **A subagent must never mutate a repo file as a test fixture.**
- ⛔ **Metadata is not evidence.** Filename, line count, grep-hit count — open the file.
- ⛔ **Never `git stash` on this shared worktree, even briefly** — `git worktree add` or
  `git show <sha>:<path>` instead. Name it explicitly in every dispatch prompt
  (`feedback_no_git_stash_in_subagents.md`).
- ⛔ **A subagent cleaning up its own scratch server can nuke the wrong process.** Kill by PID,
  never by name.
- ⛔ **A single sub-agent's unverified summary line can be wrong even when its other findings are
  solid.** Contradiction between independent checks means verify directly, never silently pick
  a side; re-derive from the actual computed CSS, don't trust either report.
- **A completeness error is invisible to every correctness gate.**
- **A pre-commit gate can fail SILENTLY** after ~250 lines — never `--no-verify`; use the scoped
  `SGS_VISUAL_GATE_SKIP`/`SGS_INSPECTOR_GATE_SKIP`/`SGS_F5_SKIP` + `*_REASON`.
- **Run builds synchronously, never backgrounded.**
- ⛔ **A front-end probe after a deploy can read Hostinger's CDN, not the deploy.** Check
  `x-hcdn-cache-status` (HIT with `max-age=604800` served 8-hour-old HTML on eye-care-test), add a
  cache-buster, or purge with the Hostinger MCP `hosting_clearWebsiteCacheV1` (also clears the CDN).
  `build-deploy.py` clears OPcache, LiteSpeed and the theme pattern cache but not the CDN.
- ⛔ **A gate-skip reason that claims a live check names the target and the deploy marker it ran on.**
- ⛔ **A gate that reads a fixed vocabulary can be older than the code that uses it.** The preset-role gate
  rejected `hover-transform`, which `button/style.css` reads and the extractor emits, so every deploy failed
  in the fast tier. Check who consumes a rejected value before deciding whether the data or the gate is wrong.
- ⛔ **A reviewer's fact-check beats the author's report.** Two agent reports asserted a grep returned 0 and a
  consumer list was complete; both were wrong until re-run. Re-run the named command before repeating a count.
- **A new `block.json` attribute needs `sgs-update-v2.py --stage 1` immediately** — and a
  brand-new BLOCK also needs its `block_composition` row hand-seeded.
- **Commit straight to `main`; never a PR, never a stash; integrate after every task.**
- **`build-deploy.py --dry-run` is NOT dry** — it builds, packages, SCPs and installs for real.
- **`build-deploy.py` isolates by DEFAULT** and does NOT abort on dirty files it is not
  shipping. A dirty shared checkout is not a reason to hold a deploy.
- **A Playwright MCP browser profile is SHARED across sessions.** If locked, report
  COULDN'T-TEST or use `chrome-devtools-mcp` — never kill the lock-holder.
- **A commit flushes the WHOLE index, not just your pathspec.** Verify with
  `git diff --cached --name-only` first. `--amend` is worse — it once swept 89 staged files.
- **A raw detector count is an UPPER BOUND, not a workload.**
- **A gate that can never go green is a defect in the gate.**
- **An exact-name exemption set must never become a pattern.**
- **Multiple sessions routinely hold uncommitted work in this checkout.** Check `git diff` before
  attributing an unfamiliar change. **The LEDGER itself is one of the files sessions race on** —
  read it fresh immediately before replacing it, every time.
- **A schema default erases the difference between "absent" and "chosen".** WP substitutes it
  before render.php runs. If a pipeline relies on absence meaning something, the default must be
  the absent-shaped value.
- **Bean's eye beats the parity tool.** Treat its output as a hypothesis, never a verdict.
- **A fidelity dimension must never score a native block's own semantic choices as defects.**
  Tag identity, and by extension any other CONVERT-not-mirror decision, is informational
  context, never a percentage.
- **A fixed-length text-anchor window degrades on long/differently-composed ancestors.**
- **When subagent dispatch hits a rate limit, don't retry blind — do the work inline instead.**
- **A block.json description can be wrong and unchecked for months.** Treat a spec/description
  as a claim to verify, not ground truth, even when it's already in the codebase.
- **A pipeline-level fix (converter/DB) doesn't retroactively fix an already-cloned page.**
- **A walker-level detector bug can hide behind a downstream failure for a long time.** A
  detector passing on every drill so far is not proof it generalises.
- **"Reported broken in an earlier session" is not the same claim as "broken now."** Re-verify
  live before rebuilding a mechanism that already works.
- **A count-based responsive column attribute (`columns:{desktop:N}`) can silently collapse below
  N** if the block opts into intrinsic/auto-fit sizing and the per-column minimum-width floor
  doesn't fit N tracks at the container's real width — CSS grid auto-fit working as designed, but
  the wrong floor for that content. Check the actual computed `grid-template-columns` track count
  before assuming a "3 columns instead of 4" report is a framework defect; an explicit
  `gridTemplateColumns` override on that instance is often the right content-level fix, not a
  code change.
- **An `href="#"` on a disclosure-only nav parent can defeat an already-built `has_url`/no-link
  mechanism** if the menu item's URL field is literally the string `"#"` rather than empty — the
  check is `'' !== $raw_url`, and `'#'` passes it. Content-level fix (clear the URL), not a code
  change, when the render-side mechanism already exists.

## State Snapshot

- **Branch:** `main`. **Do not trust a SHA written here** — run `git rev-parse --short HEAD`.
  150+ sessions share this tree.
- **D-ceiling:** verify fresh with
  `grep -oE '^## D[0-9]+' .claude/archive/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1` — never
  trust a cached number.
- **Canary:** sandybrown, WP 7.1. Production homepage page **2742**. Fresh-clone verification
  page **3448** for cloning-pipeline work. **Indus test site:** its own dedicated site
  (`lavender-dinosaur-183533.hostingersite.com`, `indus-test` deploy target).
- **Visual-diff coverage:** `reports/visual-diff/nav-bar-menu-*.md` (latest 2026-09-23) and the files below.
  `sgs/nav-drawer-menu` has `reports/visual-diff/nav-drawer-menu-2026-09-24.md` and `-25.md`.
- **Known failing tests (unverified since last noted):**
  `test_preflight_chain::test_precommit_gate_drift_pass` (drift-validator path missing),
  `test_validate_stage_artifact::test_stage_9_coverage_gap_levels`,
  `test_wp_integration::test_native_hover_zoom_routes`.
- **Parity figures:** run
  `node plugins/sgs-blocks/scripts/parity/computed-parity.js --draft <mockup> --clone <url>`
  fresh before quoting any number; check `sites/mamas-munches/accepted-differences.md` for recorded
  exceptions first.

## Pointers

| For | Read |
|---|---|
| **Header/footer + nav system (next front after Front F)** | `plans/2026-10-01-header-nav-thread-plan.md` + `verify/merged-spec36-37-track.md`; `specs/36-SGS-NAVIGATION-SYSTEM.md`; `specs/37-HEADER-FOOTER-BUILDER.md` |
| **Indus Foods test site — header/footer/nav/mega-menu build** | `sites/indus-foods/CLAUDE.md`; deploy target `indus-test` in `build-deploy.py` |
| Ward End Eye Care draft audit + CPT inventory | `.claude/reports/2026-09-14-eye-care-draft-exceptions-agreed.md` |
| **JS-array content resolver — built, `{{ }}` binding substitution OPEN** | `specs/31-UNIVERSAL-CLONING-PIPELINE.md` §15 |
| **Classless recognition (Spec 44) — built; AI-fallback tier parked** | `specs/44-CLASSLESS-REPEATER-RECOGNITION.md`; `.claude/reports/2026-09-18-spec44-full-pipeline-stage-breakdown.md` |
| **Structural-facts trio (repeaters + composition + singletons)** — built and validated, consumer wiring open | `specs/31-UNIVERSAL-CLONING-PIPELINE.md` §13.9-§13.10 |
| **Classless FIELD resolution (Spec 45)** — all 4 tiers built, no real input yet | `specs/45-CLASSLESS-FIELD-RESOLUTION.md` |
| **Form CPT + choice-flow** — COMPLETE: Phases 0-5 and the v1.8.0 follow-up live on sandybrown, eye-care-test and indus-test (all at 31c2ed4c5; Phase 5: in-use forms and flows can't be trashed or deleted from any surface; outside a saved form, `sgs/form` only picks, creates or converts to a saved form). Parked: cloning-pipeline gap and analytics in `plans/2026-09-26-form-choiceflow-pipeline-and-analytics.md` | `specs/42-SGS-FORM-CPT-AND-PRICING.md` + `specs/43-SGS-CHOICE-FLOW.md` + `plans/archive/2026-09-14-spec42-43-form-choiceflow-phase-plan.md` |
| Nav menu colour/state system | `specs/41-NAV-MENU-COLOUR-STATE-SYSTEM.md` |
| **Snooza product configurator — planned, not started** | `plans/2026-08-03-snooza-configurator-build-plan.md` |
| **Page-conversion routing (manifest routing, annotation stage) — designed, not started** (its reviews written mode is built) | `plans/2026-09-21-manifest-routing-and-reviews-inline-design.md` |
| Per-draft accepted design differences | `sites/mamas-munches/accepted-differences.md` |
| Cloning pipeline spec + binding rules | `specs/31-UNIVERSAL-CLONING-PIPELINE.md` |
| Clone-fidelity measurement | `specs/20-CLONE-FIDELITY-MEASUREMENT.md` |
| Styling/token contract | `specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md` |
| Inspector UX standard | `specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` |
| System architecture | `architecture.md` |
| Goals + exit criteria | root `CLAUDE.md` (purpose) + `LEDGER.md` (current fronts) |
| Structural defences / lessons | Claude Code auto memory (not a repo path) |
| Colour + border helper registries | `.claude/rules/colour-emission.md` (registries), `.claude/rules/block-editor-controls.md` (controls) |
