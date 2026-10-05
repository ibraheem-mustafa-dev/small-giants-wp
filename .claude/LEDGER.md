---
doc_type: ledger
project: small-giants-wp
last_updated: 2026-10-05
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary — FOR BEAN, plain English (read this first)

**DRAFT STANDARDISATION: council done, plan approved (D1132). Read `.claude/plans/2026-09-20-draft-standardisation-plan.md`.**
Plan: (A) wire and extend existing functions, no new stage; (B) a small draft standard only for what code cannot derive,
written into the draft by Claude Design; (C) a deterministic checker as the second layer. A1 DONE (D1132): the width
evaluator is wired in. A2 DONE (D1134): the draft's links and loop copy fill in from its own script. Ticker and reviews card
equal the draft at every width (D1139-D1145). Open: 36 raw placeholders (plan A3, Track D). Detail: D1132-D1145.

**Eye Care: now built by hand first (D1149, 2026-09-24).** The Eye Care site is built by hand to client-ready
from Claude Design's gap map; the finished site becomes the pipeline's answer key. Every surface is built and
live on eye-care-test, and the fix register (2026-10-03) is the work list with all decisions taken. Spec 47's
tool measures the draft against the live site and writes the layout settings automatically; it took the About
page to 100%. The whole-site sweep found 2,373 differences and the sort put every one in a labelled box with
evidence: **163 came out as candidate gaps in the framework**, the rest are measuring artefacts, knock-on effects or
values that write themselves.

**You answered Gate B on 5 October: yes, with the measuring-tool fixes first**, and you re-cut the rest. Your
fix list stays the source of truth, so the 163 are now findings to check against it rather than a list to
build, and the tool gets repaired before anything is judged — several of those findings ignore how the
framework works. Two sessions are planned and neither has started: one repairs the measuring tool, one checks
every finding against your list and brings you a yes/no list before any code.

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

**Now (2026-10-05).** eye-care-test and sandybrown both run block code at `b70e3688d` (the google-reviews track, `plans/archive/2026-10-05-google-reviews-attribution.md`, is done on both). Re-verify live = HEAD by checksum before measuring.
Step 0 is done (all 17 trees
rebuilt, zero invalid blocks). The fix register `plans/2026-10-02-eye-care-fix-register.md` (v2) is the work list:
12 site-wide fixes (S1-S12), every surface's items, decisions D1-D9 taken, three build rules, and the proven
behaviour bugs (N11, 75/82, N25, 15, N46). It is the source of truth for what gets fixed. No blockers.

**Spec 47 (v0.15): the computed route** (`scripts/computed-route/`, `specs/47-COMPUTED-ROUTE-DRAFT-TO-TREE.md`). "Solve"
compares a built page with the draft and writes block settings; `--rounds 0` measures only. The walker (the
draft-vs-live comparison tool, `scripts/parity/`) reads what DevTools shows: forced `:hover` on every pair, declared
widths, `::before`/`::after`, timings. Every surface is paired (`pairs.mjs`; a panel pairs with its walker state open,
`--state`). **About is at 100%**; Contact 27 open, its form 58, Lenses 58 (causes in `plans/2026-10-04-spec47-full-coverage.md` Progress).
Unbuilt and known-broken parts (presence, text and link reads and writes, the handover list, functional flows,
focus and active states, pairing gaps, gap typing, Fill) are Session C's scope, with the new FR-47-8 canvas rule. Run host tools with `SGS_HEADED=1`, one job at a time (dev-setup.md); local WSL mirrors at localhost:8081/8082 if
Hostinger shows a captcha (`scripts/local-wp/README.md`).

**Session A, the whole-site sweep (2026-10-05, complete, measure only, from `1ea514ae8`).** 2,373 distinct open
issues over 17 surfaces (`sites/eye-care-ward-end/build/qa/sweep/2026-10-05/sweep.json`; per surface in the Spec 47
plan's Progress). Every register item has a Sweep status (77 still open, 63 not walker-measurable, 19 closed
earlier, 15 partly measured, 27 clean). Still open from its live checks: S3's black hover colour is not in the
trees, and the header phone is untested at 375/768. Parked PA-1 to PA-5 in the sweep plan; Session C lane L4 owns
PA-1, PA-2, PA-3 and PA-5, and lane L5 owns PA-4.

**Session B, the audit (2026-10-05, complete; measure and read only, no block writes, no deploys).** Every one
of the 2,373 open issues sits in exactly one class with proof (`plans/2026-10-04-eye-care-sweep-audit-fix.md`
Appendix B): **W 1,710, F 163, T 447, U 28, D 17, deferred 8**. Six parallel Opus agents proved or disproved
all 338 candidate-F rows under a citation gate and **only 48% survived** (`reports/2026-10-05-session-b/b2/`).
`triage.mjs` gained the sweep's fifth class so no row is left unclassed (`97ac6f95a`: 323 unmapped-state rows
had none). The 78 unmeasurable register items each carry a measure-gap tag (Appendix A): 51 wait on route
work, not block work. B4 closed register N41 and 113 by ledgering S1's agreed lift (`D-34`-`D-39`). P0-11 is
closed: the 605 dead, 40 oneWidth and 55 untestedStates calibration outcomes are split by cause and **no cause
needs block code** (four fixture or harness fixes clear 203; Session C lane L5 builds them). Contact's 106
independent rows against the walker's 27 reconcile to a **6-row residual**, all padding, hypothesis unproven
(`reports/2026-10-05-session-b/contact-independent-reconciliation.md`).

**Gate B answered 2026-10-05: yes, route fixes first, and the work re-split (Bean).** The fix register is the source
of truth, so the 163 F rows are findings to assess, not gaps to build, and many ignore how the framework works (CPT
canvases compose blocks; a setting can arrive from a parent by context). That is a route defect, so the route is
repaired first. The grouping G1 to G8 is rejected as a unit of work.

**Session C — Spec 47 route and logic gaps only, not started** (`plans/2026-10-05-eye-care-session-c-spec47-route-fixes.md`).
No block controls and no shared CSS. Every unbuilt or known-broken Spec 47 item, plus the new canvas-awareness rule
(FR-47-8, R-47-12: a row on a canvas surface cannot be a framework gap until the ancestors, the canvas siblings and
the block context channel have been checked), the calibration-failure fixtures and the sandybrown oldshape blocker.
Nine lanes in three waves, one worktree subagent per lane, main thread verifies only, a gate per wave, two sittings
with a clean stop at Gate 1. Done when a fresh sweep and triage run on the repaired route and the new F count is
recorded. Only Spec 47 stage 5 (a second draft) is not built: no second draft exists.

**Session C2 — assess every finding, not started** (`plans/2026-10-05-eye-care-session-c2-finding-assessment.md`),
on the post-C sweep, never on the old 163: match each row to a register Ref, fact-check it with a cited
`file::symbol` or DB row, live-test it at 375/768/1440/1920, then one yes/no list for Bean before any code. The
block work the first draft called W1 and W2 lives there, behind that approval, with the queue partition and the
collision check (`reports/2026-10-05-session-b/check-queue-collisions.mjs`) carried over.

**R1 routes 32 rows, not 188**: the resolver never reads `css_element`, routing an enum row would delete a working
discovery path, and the animation half is resolver work (28 leave alone, 128 resolver, 32 routable). The three
`!important` spacing rows are diagnosed from the source as **two** causes, core's
`.is-layout-constrained > :where(:not(.alignfull)) { margin: auto !important }` beating the band's side margins
(`sgs/hero` already solves it by leaving that selector's match set) and an inline WP-native base margin beating a
class rule on the footer (the same block's tablet and mobile tiers already solve it). Both go on the C2 list.

**Session 0 (2026-10-05, complete):** the route data audit's repairs (`.claude/reports/2026-10-04-route-data-audit/README.md`),
every block recalibrated on the WSL mirrors; parked P0-3 to P0-10 in the sweep plan (P0-1, P0-2 and P0-11 closed). The wiring gate
(`check-wiring-fingerprint.py`) blocks new gaps only (201 baselined).

**The one Eye Care plan:** `plans/2026-10-02-eye-care-plan.md` (decisions, surfaces, work plan). **Resume from:**
**Session C's first action** (`plans/2026-10-05-eye-care-session-c-spec47-route-fixes.md`): confirm live = HEAD by
checksum, because the Google reviews track was mid-deploy to eye-care-test at Session B's handoff. Then Wave 0, then
the six Wave 1 lanes. Session C2 runs on Session C's C3.8 output. Per-surface Solve work
(`plans/2026-10-04-spec47-full-coverage.md` "Progress") is that Session D.

**Separators.** Complete and live on sandybrown and eye-care-test (same build, 942edab25 on `main`): the shared
lines-between-items setting covers the container, both nav blocks, icon-list, brand-strip, pricing-table features, business-info
hours, the mini-cart's items and the seven wrapper composites (`plans/archive/2026-10-01-separators-plan.md`). Open, only if
asked: the composites' editor canvases and the cart panel show spacing only in the editor (lines draw on the page).
The container roster script (`scripts/sync-container-wrapping-blocks.py`) reports the roster and KINDs and writes
the DB only; container capabilities are opt-in per block at panel level.

**Names in code.** `python scripts/check-no-client-names.py --check` (gated, fast tier) keeps client and reference-site names
out of code and file names; docs, tests, fixtures, QA captures and dated reports may carry them.

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

### Unified email — CLOSED 2026-09-27 (`plans/archive/2026-09-26-unified-email-plan.md`, all 8 phases + rows 5b/7/8 done)

Every SGS email goes through `wp_mail()` over FluentSMTP (`provision-site-mail.py`, dev-setup §Site email), shared `Sgs_Mailer`: shop alerts, form/choice-flow, client-notes (created/resolved/reply) as WooCommerce/native emails. `sgs-client-notes` is deployed and active on sandybrown via `plugins/sgs-blocks/scripts/deploy-client-notes-quick.py` (a minimal standalone script; a proper third-root `build-deploy.py` integration is a deferred follow-up). WooCommerce email links/headings take the site's text colour, never the brand accent (`Sgs_Woocommerce_Email_Contrast` filter, framework-wide, no per-site step; live-proven capturing a real order email, 0 accent occurrences). Script-built `sgs/form` blocks (`wp-build-page.js`) get a stable auto `formId`. sandybrown sends as `admin@smallgiantsstudio.co.uk`; its test-site redirect is confirmed ON (`provision-site-mail.py --check`), so every email lands at Bean's Gmail — Bean to check that inbox (not spam) for this session's test sends. N8N workflow `AJzRBARFn8AqQlkg` stays off (backup). `main` at `ea682cb21`+; sandybrown deployed, homepage HTTP 200 after this session's brief unrelated outage (`cf51f2a0b`). Not mine, found, still open: `sgs/mega-group` focus ring uses the accent colour.

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
- **A computed-style read right after forcing a state (`:hover`, `aria-current`) can capture the
  pre-transition value.** Disable transitions for measurement, or wait for `transitionend`.
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
