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

**Now (2026-10-06).** sandybrown runs block code `ea72eab7b`; eye-care-test still runs `7f375f765`, held so Session C's gap count stays attributable to the route. Session C's sitting ii must measure at `7f375f765` FIRST, then deploy the then-current `main` — NOT `75364c71a`, which ENDS the repairs range and so predates the Tier 1 range `65573118c..82f54f351`. Real delta `7f375f765..82f54f351`: 32 files, 13 blocks, plus `theme.json` (agreed with Session C). Live = HEAD is proven by the deploy-ownership markers `~/.sgs-deploy-marker-<target>.json`, not by a liveness check.
The fix register `plans/2026-10-02-eye-care-fix-register.md` (v2) is the source of
truth for what gets fixed: 12 site-wide fixes (S1-S12), every surface's items, decisions D1-D9, three build rules.
No blockers.

**Spec 47 (v0.15): the computed route** (`scripts/computed-route/`, `specs/47-COMPUTED-ROUTE-DRAFT-TO-TREE.md`). "Solve"
compares a built page with the draft and writes block settings; `--rounds 0` measures only. The walker (the
draft-vs-live comparison tool, `scripts/parity/`) reads what DevTools shows. Every surface is paired (`pairs.mjs`;
a panel pairs with its walker state open, `--state`). **About is at 100%.** Per-surface counts moved at Gate 1: read
`qa/triage/*.json`, never a cached figure (causes in `plans/2026-10-04-spec47-full-coverage.md` "Progress").
Built by Session C's sitting i: the FR-47-8 canvas rule, the walker's 1920 default, focus and active on every
interactive element, link coverage, line counts, region entrances, the four functional flows, the pairing gaps, and
the calibration fixtures and harness. Still unbuilt and owned by its **sitting ii**: calibration's presence, text
and link reads, Solve writing them, the handover list, gap typing, and Fill. Run host tools with `SGS_HEADED=1`, one job at a time (dev-setup.md); local WSL mirrors at localhost:8081/8082 if
Hostinger shows a captcha (`scripts/local-wp/README.md`).

**Sessions A and B (2026-10-05, both complete, measure and read only).** The whole-site sweep measured all 17
surfaces at **2,373** distinct open issues (`sites/eye-care-ward-end/build/qa/sweep/2026-10-05/sweep.json`), and the
audit put every one in exactly one class with proof: **W 1,710, F 163, T 447, U 28, D 17, deferred 8**
(`plans/2026-10-04-eye-care-sweep-audit-fix.md` Appendix B; per-surface in `plans/2026-10-04-spec47-full-coverage.md`).
⚠️ **Those are AUDITED figures.** `qa/triage/*.json` holds the **raw** classification, W 1,562 / F 338 / T 445 /
U 28; Session B audited the 338 raw-F rows to 163 (148 W, 17 D, 8 deferred, 2 T). Both total 2,373, and **a triage
re-run compares to 338, never to 163.** Every register item carries a Sweep status; the 78 unmeasurable ones carry a
measure-gap tag (Appendix A).

**Session C — sitting i DONE at `cac1f346f`, sitting ii outstanding** (`plans/2026-10-05-eye-care-session-c-spec47-route-fixes.md`,
resume at "Wave 2"). No block code was touched. Wave 0, Wave 1's six lanes and Gate 1 all passed, 17 commits.
**Raw F 338 to 177**, W 1,562 to 1,764, T and U unchanged, total 2,373 to 2,414 (41 content rows), every transition
accounted for, the identity holding on all 17 surfaces, 322 tests green. ⚠️ **177 is RAW and NOT comparable to the
audited 163.** Canvas roster: 12 of 17 (every CPT plus shop and product); text read covers both roles, 319 settings
(both Bean's answers). A QC council falsified one of the session's own claims: the canvas **hop** is not what moved
F — `triage.mjs::canvasSettable` plus the manifest flag is — and the hop must earn its place at L8.7 or be deleted.
**Sitting ii:** Wave 2 (L7 calibration reads, L8 Solve writes with new items L8.7 and L8.8, L9 Fill), Gate 2, then
Wave 3's host jobs C3.1 to C3.8 — which produce the post-route count. R1 is already decided: **2 rows routed of the
32**, both on `sgs/hero`, the other 31 must stay NULL. Twelve open items each carry an owner in the plan's
"Gate 1 PASSED" section. Only Spec 47 stage 5 (a second draft) is not built: no second draft exists.

**Session C2 — assess every finding, BLOCKED until Session C's Wave 3 runs** (`plans/2026-10-05-eye-care-session-c2-finding-assessment.md`).
Its input is C3.8's post-route count, which does not exist yet; Gate 1's raw 177 is not that number. On the post-C sweep, never on the old 163: match each row to a register Ref, fact-check it with a cited
`file::symbol` or DB row, live-test it at 375/768/1440/1920, then one yes/no list for Bean before any code. The
block work the first draft called W1 and W2 lives there, behind that approval, with the queue partition and the
collision check (`reports/2026-10-05-session-b/check-queue-collisions.mjs`) carried over.

**R1 is decided: 2 rows get routed, not 32** — both on `sgs/hero`; the other 31 must stay NULL because the extension
roster's policy is deliberate (reasons per family in the plan's "R1 decided"). The three `!important` spacing rows
are diagnosed from the source as two causes, so both go on the C2 list rather than waiting.

**Register repairs and backlog Tier 1 — both CLOSED, built and verified on sandybrown, pushed** (twelve proven
repairs, then N11(a), 52, 75/82/158, 91, 68, N17b; each register row carries its hash and what was measured).
CR6 unbuilt: needs `scripts/computed-route/lib/resolve.mjs`, Session C's. QC (`reports/2026-10-06-qc-eye-care-tier1/`)
added PRE-EXISTING Q1 (no quantity ceiling when stock tracking is off) and Q2 (tab contrast 2.24:1) to the
backlog; both need `/qc-council`. **Open: the eye-care-test deploy (HEAD) and the one reseed — Session C's Wave 3.**

The wiring gate blocks new gaps only (201 baselined); Session 0's P0-3 to P0-10 are parked in the sweep plan.

**The one Eye Care plan:** `plans/2026-10-02-eye-care-plan.md` (decisions, surfaces, work plan). **Paste-ready prompts** for Sessions C and C2: `.claude/prompts/` (single-use; C's handoff updates C2's).
**Resume from:**
**Session C sitting ii** (`plans/2026-10-05-eye-care-session-c-spec47-route-fixes.md`, resume at "Wave 2"): three
lanes (L7, L8 with its new L8.7 and L8.8, L9), Gate 2, then Wave 3's host jobs C3.1 to C3.8. Session C2 runs on
C3.8's output and cannot start before it. Per-surface Solve work is Session D
(`plans/2026-10-04-spec47-full-coverage.md` "Progress").

**Separators** (live on both sites): the shared
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
