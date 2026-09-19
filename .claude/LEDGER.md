---
doc_type: ledger
project: small-giants-wp
last_updated: 2026-09-19
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary — FOR BEAN, plain English (read this first)

**NEXT SESSION FRONT (Bean-directed 2026-09-19): finish the classless-pipeline boundaries on Eye
Care Birmingham (30 real items, breakdown in "THE FRONT" below), THEN the merged Spec 36+37 track**
(`plans/2026-07-29-merged-spec36-37-track-strategic-plan.md`, stalled since Wave 3; read the full plan
+ its verify doc first, it predates several things shipped since).

**Read this before trusting anything about the ticker fix.** The last session's handoff said the
ticker "now converts". That was FALSE (D1112). The new step that pulls hidden JS-array text into the
draft was being handed the wrong folder, so it produced placeholder text. Fixed and proven this
session, and the text is now correct in the intermediate file. But the ticker still does not appear
in the finished blocks, because nothing treats its container as a section to convert. That is the
first item on the front below. Bean's earlier question was right: multi-field arrays (REASONS etc.)
look solvable; only the single-text-field case is built.

**Front D (Mama's/Indus header-footer builder cleanup) is FULLY CLOSED**, including a same-day
follow-on: Indus Foods now has a complete, independently-verified header/footer/nav-drawer/mega-menu
content build on a brand-new DEDICATED test site (decoupled from the shared sandybrown canary
entirely — see "This session" below). **Front C (Spec 44 classless recognition) is CLOSED**
except one deliberately-parked item (AI-fallback tier, Bean's own call). **Front E (Spec 45
classless FIELD resolution) is still open** — built, all 4 tiers, but not live-trusted; unchanged
this session. Two things still need Bean directly, not a subagent: the drawer-burger click
retest, and Spec 42/43 Phase 3's precondition (real WooCommerce catalogue data).

## This session (2026-09-19, part 2) — classless-pipeline fixes + a correction

- **D1108** classless-match gate stopped feeding item-shaped boundaries to a container-shaped
  function (Spec 44 Stage 4 now branches on `boundary_kind`). **D1109** `<input placeholder>` text
  counts as content, fixing b23's crash. Both real, live-verified, flag-OFF parity intact.
- **D1111 was wrong, D1112 corrects it.** Wrong directory passed to the JS-content resolver;
  fixed (`_draft_dir`), guarded (refuses unrendered `{{ }}` text), 2 new tests. Resolver output is
  now correct; the ticker still does not reach the emitted blocks (no boundary covers its
  container). Lesson in `mistakes.md` (mocked boundary + "verified" read off counts).
- **Docs reconciled:** Spec 31 §15 FR-31-26.5, Spec 44 header (was "DESIGNED, not built", now
  v2.4.0), D1112, both finished plans archived (`plans/archive/phase-1108-*`, `phase-1111-*`).
  Spec 45 needed no change. `parking.md` untouched (nothing there concerns this work).
- **Numbers, from the run artefacts not from memory:** flag OFF, 74 boundaries = 41 complete + 15
  classless-review + 14 non-BEM-compliant + 3 chrome-skipped (by design) + 1 failed (b32). Flag ON
  = 73 boundaries (the ticker's `<sc-for>` is consumed), still 41 complete.
- Pre-existing failures noticed, not touched: `test_preflight_chain::test_precommit_gate_drift_pass`
  (drift-validator path missing), `test_validate_stage_artifact::test_stage_9_coverage_gap_levels`,
  `test_wp_integration::test_native_hover_zoom_routes`.

## Earlier this session (2026-09-19) — Indus Foods dedicated test site

- **Archived** the completed Front D Wave 2 orchestration plan
  (`plans/archive/2026-09-17-front-d-wave-2-orchestration.md`) — all 6 tasks confirmed shipped.
- **New dedicated WordPress site provisioned**: https://lavender-dinosaur-183533.hostingersite.com/
  (Hostinger, same account) — created specifically because sandybrown's active-header/footer/
  theme-snapshot pointers are single GLOBAL `wp_options` rows; building Indus there would have
  un-rendered Mama's Munches sitewide. Registered as a real `build-deploy.py --target indus-test`
  entry (`964a6a536`) — theme + plugin deployed and active, Indus's own `theme-snapshot.json`
  tokens pushed to its on-disk `theme.json`.
- **Built the full header/footer/nav-drawer/mega-menu content** (`sgs_header` #28, `sgs_footer`
  #29, `sgs_drawer` #27, `sgs_mega_menu` #6, classic nav menu term 2) using only existing SGS
  blocks — no new mechanism. Independent `design-reviewer` verification confirmed 7 of 8 build
  claims exactly; the one real defect (desktop footer computing 3 grid tracks for 4 declared
  columns) was root-caused as content-level — the count-based `columns` attribute's intrinsic
  auto-fit floor (256px) didn't fit 4 real columns at this row's width — and fixed with an
  explicit `gridTemplateColumns` override, live-verified.
- **Fixed a real framework-shaped bug found investigating the same page**: the About/Sectors/Trade
  dropdown parents had a literal `#` menu-item URL, which defeated `nav-bar-menu/render.php::
  from_link()`'s existing `has_url` check (built specifically to render a non-link disclosure
  trigger for a parent-only item, `'' !== $raw_url` treats `'#'` as "has a real URL"). Root cause
  was content (`_menu_item_url` postmeta), not code — cleared to `''`, now renders correctly as
  `<button aria-expanded>` with no behaviour change to the dropdowns themselves.
- **Sourced the 4 mega-menu brand images** from the live client reference site
  (lightsalmon-tarsier-683012.hostingersite.com, a separate non-SGS Astra/Spectra WP install — read
  only, never modified) into the new site's media library (attachment IDs 32-35), matched to the
  reference's own exact image-to-category mapping.
- Full build/fix trail + attachment IDs + post IDs: `sites/indus-foods/CLAUDE.md`.

## Prior work (closed / parked) — pointer only, full narrative in memory or decisions.md

Full narrative for entries below moved to `memory/session-2026-09-17.md`
+ the named D-numbers in `decisions.md` (no `session-2026-09-18.md` exists) — read those, not a summary here.

- **Front D Wave 1+2 (5 visual/admin fixes + 6 CPT-architecture tasks, FR-37-46..49)** — ALL
  SHIPPED, deployed, live-verified. Full trail: `.claude/reports/2026-09-17-header-footer-cpt-issue-register.md`,
  decisions.md D1091/D1092.
- **Front C — universal-pipeline classless recognition (D1071-D1107)** — CLOSED 7/8
  (2026-09-18): Stage A value-consistency check, `items`/`thumbs` alias fix, brand-strip "count"
  resolved to `sgs/card-grid`, real pipeline-completeness gap found+fixed (17/70→50/74 boundaries
  converting), attribute-collision bug fixed, `<dc-import>` cross-component resolution built
  (design-gated). Only item 7 open: AI-fallback tier question, deliberately parked (Bean's call).
  Full per-stage breakdown: `.claude/reports/2026-09-18-spec44-full-pipeline-stage-breakdown.md`.
  Standing rules from this front: narrow by parent context before leaf-structural match
  (`memory/learning/2026-09-15-narrow-by-parent-context-before-leaf-structural-match.md`); don't
  report a pipeline "halt" as missing-mechanism without checking an already-built gated mechanism
  was just left off (D1106).
- **`sgs/nav-bar-menu` item separator (D1086)** + **`sgs/choice-flow` Phase 2b (D1083)** — deployed,
  live-verified.
- **Nav-menu split (D1059/D1060), all 8 steps** — deployed, live-verified. One residual open — see
  State Snapshot.
- **Ward End Eye Care Spec 42/43 Phases 0-2** (D1072, D1082) — done; Phase 3 blocked on real
  WooCommerce catalogue data (Bean-only task, below).
- **Ward End Eye Care Tasks 1/2/4/5** — fully closed (D1067/D1069/D1070).
- **Clone-fidelity closeout + R8 motion + BEM-recognition; Universal-pipeline converter wiring**
  (D1071/D1073/D1075) — shipped.

## Blockers

**None.**

## THE FRONT — what to pick up next

### Front F — Eye Care Birmingham classless-pipeline boundaries (Bean-directed, do this first)

Invocation (same flags as `.claude/reports/2026-09-18-spec44-live-flagged-run.md` plus
`--sc-var-min-confidence 0.0 --dom-shape-min-confidence 0.0 --classless-match --classless-auto-complete`;
add `--resolve-js-content` for the flag-ON comparison). **Compare by (selector, block) identity, never
`boundary_id`** (mistakes.md). Verify a stage claim by grepping the emitted `block_markup` for one
string it should have produced.

The 30 real items (74 minus 41 complete minus 3 chrome-skipped): 15 classless-review (9
`sgs/product-card`, 6 `sgs/trustpilot-reviews`, all "partial match, first occurrence"), 14
non-BEM-compliant (not investigated this session), 1 failed (b32 ticker). Ranked menu, smallest
first action first:

1. **Ticker reaches the blocks (recommended first).** Resolver output is right but no boundary
   covers the ticker's plain `<div>`. First action (<5 min): read why
   `per-section-convention-voter.py::auto_detect_sections` skips a non-semantic top-level `<div>`.
   Needs a design gate (shared mechanism, Rule 7).
2. **Multi-field arrays (REASONS, REVIEWS, FAQS, ...).** Per-field tagging in the resolver; design
   gate first. Bean thinks this is solvable and the evidence agrees (each field sits in its own element).
3. **15 review-queue items.** Bean's eye on `operator-review.html`; decide per candidate. Needs
   Bean, not a subagent.
4. **14 non-BEM boundaries.** Not yet looked at: first find out whether they are draft-side fixes
   or a pipeline gap.

### Spec 36+37 merged track (Bean-directed focus for next session, 2026-09-19)

**Read `plans/2026-07-29-merged-spec36-37-track-strategic-plan.md` + `verify/merged-spec36-37-track.md`
IN FULL before touching anything — do not act on this summary.** Verify-doc status at last check
(2026-07-29 — RE-CHECK, it's 7 weeks stale and several things below may have shifted since):

- **Wave 1** (fixture + verification — mega-panel/nav-menu live fixture, axe on open panel, cart
  flyout/drawer, search 3 display modes) — STATUS: pending.
- **Wave 2** (capability — CPT drawer/mega-menu architecture, starter patterns, trigger attrs) —
  STATUS: pending **but likely PARTLY SUPERSEDED** — Front D's FR-37-46..49 (template-locking the
  3 CPTs, auto-seed, starter-preset control, drawer post-picker) shipped since this plan was
  written and covers some of the same ground under different FR numbers. Check FR-37-46..49
  against this Wave's items before re-planning any of it.
- **Wave 3** (polish) — PARTIAL: FR-37-44/45 (header transparency/contrast/scrim) verified
  2026-08-19 (`reports/visual-diff/site-header-2026-08-19.md`); the rest (FR-37-27 simplicity,
  FR-37-6 both-sites-render-from-CPT, FR-37-26 blind-tester session) still pending.
- **Wave 4** (proof gate — 10 client clones, DP5/DP7 evidence packs, Bean's-eye sign-off per
  clone) — STATUS: pending.
- **Wave 5** (clone walker — FR-37-22 header/footer walker, 12 clones as regression fixtures) —
  STATUS: pending.

**First action:** re-verify each Wave's STATUS against what Front C/D actually shipped since
2026-07-29 (Spec 44 classless recognition, the CPT template-lock/auto-seed/starter-preset/
drawer-picker work) before writing any execution plan — several "pending" items may already be
done under a different name, and re-building them would be pure waste.

### Front E — Spec 45 classless FIELD resolution (still open, unchanged this session)

Built, all 4 tiers, empirically validated — but has NO live pipeline input yet, because Spec 44
(closed) doesn't produce real matches on real data for it to consume. See D1084/D1087.

### Tasks — need Bean directly, not a subagent

- **Drawer-burger click retest.** Confirm live whether the intermittent click-miss (2/3 real
  clicks failed to open the drawer in automated testing) still occurs now the duplicate-burger
  fix (D1047) has shipped. If it still fails, dispatch a fresh `/systematic-debugging`.
- **Spec 42/43 Phase 3 precondition.** Real WooCommerce attribute/variation catalogue data must
  exist before Phase 3 (priced WC-variation steps) can be built — a WooCommerce-admin
  catalogue-setup task, not block-engine work.

## Methodology guardrails (carried forward — all still true)

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
  `git show <sha>:<path>` instead. 3rd recurrence inside a dispatched subagent 2026-09-17
  (`feedback_no_git_stash_in_subagents.md`) — name it explicitly in every dispatch prompt.
- ⛔ **A subagent cleaning up its own scratch server can nuke the wrong process.** Kill by PID,
  never by name.
- ⛔ **A single sub-agent's unverified summary line can be wrong even when its other findings are
  solid.** Contradiction between independent checks means verify directly, never silently pick
  a side. Independent verification found a builder's "footer collapses cleanly" claim wrong
  2026-09-19 — root cause was the shared wrapper's intrinsic-column floor, not the framework bug
  the verifier itself guessed; re-derive from the actual computed CSS, don't trust either report.
- **A completeness error is invisible to every correctness gate.**
- **A pre-commit gate can fail SILENTLY** after ~250 lines — never `--no-verify`; use the scoped
  `SGS_VISUAL_GATE_SKIP`/`SGS_INSPECTOR_GATE_SKIP`/`SGS_F5_SKIP` + `*_REASON`.
- **Run builds synchronously, never backgrounded.**
- **A new `block.json` attribute needs `sgs-update-v2.py --stage 1` immediately** — and a
  brand-new BLOCK also needs its `block_composition` row hand-seeded.
- **Commit straight to `main`; never a PR, never a stash; integrate after every task.**
- **`build-deploy.py --dry-run` is NOT dry** — it builds, packages, SCPs and installs for real.
- **`build-deploy.py` isolates by DEFAULT** (D993) and does NOT abort on dirty files it is not
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
  the absent-shaped value (D1005).
- **Bean's eye beats the parity tool.** Treat its output as a hypothesis, never a verdict.
- **A fidelity dimension must never score a native block's own semantic choices as defects.**
  Tag identity, and by extension any other CONVERT-not-mirror decision, is informational
  context, never a percentage (D1013).
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
  doesn't fit N tracks at the container's real width — not a bug, CSS grid auto-fit working as
  designed, but the wrong floor for that content. Check the actual computed
  `grid-template-columns` track count before assuming a "3 columns instead of 4" report is a
  framework defect; an explicit `gridTemplateColumns` override on that instance is often the
  right content-level fix, not a code change (2026-09-19).
- **An `href="#"` on a disclosure-only nav parent can defeat an already-built `has_url`/no-link
  mechanism** if the menu item's URL field is literally the string `"#"` rather than empty — the
  check is usually `'' !== $raw_url`, and `'#'` passes it. Content-level fix (clear the URL),
  not a code change, when the render-side mechanism already exists (2026-09-19).

## State Snapshot

- **Branch:** `main`. **Do not trust a SHA written here** — run `git rev-parse --short HEAD`.
  150+ sessions share this tree.
- **D-ceiling:** verify fresh with
  `grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1` (was
  D1112 at last check — re-check, don't trust a cached number here).
- **Canary:** sandybrown, WP 7.1. Production homepage page **2742**. Fresh-clone verification
  page **3448** for cloning-pipeline work. **Untouched by this session's Indus work** — that now
  lives entirely on its own dedicated site (`indus-test` deploy target).
- **`nav-bar-menu` now has one real visual-diff report** (`reports/visual-diff/nav-bar-menu-2026-09-17.md`,
  D1086) — SCOPED to the item-separator fix only. **`nav-drawer-menu` still has NO visual-diff
  report at all** — scoped-bypassed on commit `782281040`; still owed.
- **Parity figures — STALE the moment a new commit lands on the tool; re-run before quoting.**
  Last full run (page 3448): STRUCTURE 93% (324/348), LAYOUT 75% (579/773), PAINT+TYPE 89%
  (1260/1412), CONTENT 100% (234/234). Re-run
  `node plugins/sgs-blocks/scripts/parity/computed-parity.js --draft <mockup> --clone <url>`
  fresh; check `sites/mamas-munches/accepted-differences.md` for recorded exceptions first.

## Pointers

| For | Read |
|---|---|
| **Header/footer + nav system spec — ACTIVE NEXT FRONT (Bean-directed 2026-09-19)** | `plans/2026-07-29-merged-spec36-37-track-strategic-plan.md` + `verify/merged-spec36-37-track.md`; `specs/37-HEADER-FOOTER-BUILDER.md`; THE FRONT above for what's actually still open |
| **Indus Foods dedicated test site — header/footer/nav/mega-menu build, all fixes live** | `sites/indus-foods/CLAUDE.md`; site: lavender-dinosaur-183533.hostingersite.com; deploy target `indus-test` in `build-deploy.py` |
| **Nav-menu split — ALL 8 STEPS DONE; only gap is a missing visual-diff report** | `C:\Users\Bean\.claude\plans\our-new-draft-from-enchanted-karp.md`; `decisions.md` D1059/D1060/D1076; `.claude/reports/2026-09-14-nav-menu-split-attribute-classification.md` |
| Ward End Eye Care draft audit + CPT inventory | `.claude/reports/2026-09-14-eye-care-draft-exceptions-agreed.md` |
| **JS-array content resolver (Spec 31 §15) — built, ticker gap OPEN** | `specs/31-UNIVERSAL-CLONING-PIPELINE.md` §15; `decisions.md` D1111 + D1112 (correction); `plans/archive/phase-1111-js-array-content-resolution.md` |
| **Classless recognition (Spec 44) — CLOSED 7/8** | `specs/44-CLASSLESS-REPEATER-RECOGNITION.md` (v2.4.0); `decisions.md` D1088-D1109, D1112; `.claude/reports/2026-09-18-spec44-full-pipeline-stage-breakdown.md` |
| **Structural-facts trio (repeaters+composition+singletons)** — all 3 built, validated, consumer wiring parked | `specs/31-UNIVERSAL-CLONING-PIPELINE.md` §13.9-§13.10; `decisions.md` D1090/D1093 |
| **Classless FIELD resolution (Spec 45)** — all 4 tiers BUILT, still no real input | `specs/45-CLASSLESS-FIELD-RESOLUTION.md` (v1.6.0); `decisions.md` D1084/D1087 |
| **Form CPT + choice-flow** — council-closed, Phase 0 ready | `specs/42-SGS-FORM-CPT-AND-PRICING.md` (v2.1.0) + `specs/43-SGS-CHOICE-FLOW.md` (v1.2.0) + `plans/2026-09-14-spec42-43-form-choiceflow-phase-plan.md` |
| Spec 41 nav-menu colour/state (Waves A-C DONE/archived) | `specs/41-NAV-MENU-COLOUR-STATE-SYSTEM.md`; `plans/archive/phase-nav-menu-colour-state.md` |
| Mama's branded header/footer authoring — shipped | `.claude/prompts/2026-09-10-header-footer-implementation.md` |
| BEM-recognition + template-detection — ARCHIVED | `plans/archive/2026-09-10-bem-recognition-and-template-detection-brainstorm.md` |
| Per-draft accepted design differences | `sites/mamas-munches/accepted-differences.md` |
| Cloning pipeline spec + binding rules | `specs/31-UNIVERSAL-CLONING-PIPELINE.md` |
| Clone-fidelity measurement | `specs/20-CLONE-FIDELITY-MEASUREMENT.md` |
| Styling/token contract | `specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md` |
| Inspector UX standard | `specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` |
| System architecture | `architecture.md` |
| Goals + exit criteria | `goals.md` |
| Structural defences (STOP catalogue + ritual) | `STOP-CATALOGUE.md` (uncapped, D101) |
| Colour + border helper registries | `plugins/sgs-blocks/CLAUDE.md` |
