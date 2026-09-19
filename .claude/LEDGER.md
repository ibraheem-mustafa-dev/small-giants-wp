---
doc_type: ledger
project: small-giants-wp
last_updated: 2026-09-19
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary — FOR BEAN, plain English (read this first)

**Next front: finish the classless-pipeline boundaries on Eye Care Birmingham (breakdown in "THE
FRONT" below), then the merged Spec 36+37 track** (nav / header / footer / drawer / mega). Read
`plans/2026-07-29-merged-spec36-37-track-strategic-plan.md` and `verify/merged-spec36-37-track.md`
in full first; they carry the per-unit truth.

**Classless pipeline.** The step that pulls hidden JS-array text into the draft is built, and its
output is correct in the intermediate file. Loose text next to an element now becomes a content
block, so the ticker completes. What is still open is the runtime `{{ }}` bindings: 107
placeholders currently ship inside "complete" blocks (Front F item 1). Only the single-text-field
array case is built; multi-field arrays (REASONS, REVIEWS, FAQS) look solvable because each field
sits in its own element. Spec 45 (classless FIELD resolution) is built, all 4 tiers, but not
live-trusted: it has no real pipeline input yet.

**Nav / header / footer.** Wave 1 (fixtures + verification) is closed. Wave 2 (capabilities) is
part done: the drawer post type, trigger controls, scoped behaviours and lint gate are built; the
drawer post picker and migration are half done; the 7 drawer starter patterns, logo source,
priority+More / bottom-tab modes, scrolled shadow, payment icons, floating pill and the final
integration re-check are not. Wave 3 is partial. Waves 4 and 5 (the reference clones and the
clone walker) have not started.

**Indus Foods** has its own dedicated test site (`lavender-dinosaur-183533.hostingersite.com`,
deploy target `indus-test`) because the active header/footer/theme-snapshot pointers are single
GLOBAL `wp_options` rows per site. Its content build is documented in `sites/indus-foods/CLAUDE.md`.

Things that need Bean directly, not a subagent: the drawer-burger click retest, the mega-motion
Bean's-eye check, the choice of mechanism for the drawer starter looks (W2-c), and Spec 42/43
Phase 3's precondition (real WooCommerce catalogue data).

## Blockers

**None.**

## THE FRONT — what to pick up next

### Front F — Eye Care Birmingham classless-pipeline boundaries (do this first)

**REAL-PAGE TEST SITE EXISTS (D1114):** https://darkcyan-grouse-898606.hostingersite.com/eye-care-birmingham/
(page 11; WP 7.1.1 + WooCommerce; `build-deploy.py --target eye-care-test`; creds
`.claude/secrets/eye-care-test.env`). Run clones with `SGS_DEPLOY_SITE=eye-care-test`,
`SSL_CERT_FILE=<certifi cacert.pem>` (Python's Windows TLS store rejects every hostingersite.com
host, proven), `--deploy-target page:11`, and NO `--skip-freshness-gate` (the snapshot is now
recreated from the draft by Spec 33). First live numbers: 93 visible `{{ }}` placeholders on the
rendered page, STRUCTURE 2% against the draft served over HTTP. Stage 11.6 in the orchestrator
compares the RAW un-rendered draft, so its numbers are invalid for `.dc.html` drafts. Queued
investigation groups (5 findings) are in D1114: each is a `/systematic-debugging` from run dumps,
parallel subagents one directory each, main thread owns deploys and commits.

Invocation (same flags as `.claude/reports/2026-09-18-spec44-live-flagged-run.md` plus
`--sc-var-min-confidence 0.0 --dom-shape-min-confidence 0.0 --classless-match --classless-auto-complete`;
add `--resolve-js-content` for the flag-ON comparison). **Compare by (selector, block) identity, never
`boundary_id`** (mistakes.md). Verify a stage claim by grepping the emitted `block_markup` for one
string it should have produced.

The last full run had 30 real items (74 boundaries minus 41 complete minus 3 chrome-skipped): 15
classless-review (9 `sgs/product-card`, 6 `sgs/trustpilot-reviews`, all "partial match, first
occurrence"), 14 non-BEM-compliant (not investigated), 1 failed (b32 ticker, which now completes —
re-count before quoting). Ranked menu, smallest first action first:

1. **Binding resolution, staged.** Stage 1 BUILT: loose text next to an element becomes a content
   block (b32 completes, no other change). Stage 2 OPEN: in-place substitution of runtime `{{ }}`
   bindings (107 placeholders currently ship inside "complete" blocks). Design fact to settle
   first: keep-the-`<sc-for>` lands only item 0 of N, so full conservation needs container-level
   handling (promote the inert parent `<div>` to a container boundary). Prototype files
   (`scratchpad/v1-*.dc.html`, `v2-*.dc.html`) are session-local; rebuild from
   `dc-import-resolved.html` + the resolver payload. First action: decide unroll-plus-container-
   boundary vs keep-wrapper for Stage 2 on a two-group prototype.
2. **Multi-field arrays (REASONS, REVIEWS, FAQS, ...).** Per-field tagging in the resolver; design
   gate first.
3. **15 review-queue items.** Bean's eye on `operator-review.html`; decide per candidate. Needs
   Bean, not a subagent.
4. **14 non-BEM boundaries.** Find out whether they are draft-side fixes or a pipeline gap.

**Front C residual:** the AI-fallback tier (Spec 44 §11) is parked — Bean's call.

### Spec 36+37 merged track (after Front F)

**Read `plans/2026-07-29-merged-spec36-37-track-strategic-plan.md` + `verify/merged-spec36-37-track.md`
IN FULL before touching anything — do not act on this summary.**

- **Wave 1** (fixtures + verification) — CLOSED. Residuals: axe on the Gate-3 mega panel shows 6
  primary-colour contrast violations on the Mama's palette, accepted by owner ruling; Bean's-eye on
  mega motion not recorded; cart/search screenshot set not captured.
- **Wave 2** (capability) — DONE a, e, f (live/eye verification owed), g, h, j, k, q, s, t ·
  PARTIAL b, d, i · NOT DONE c, l, m, n, o, p, r, u. Gate 2 passed once
  (`reports/2026-07-30-w2a-gate2-drawer-cpt.md`); a re-run is owed after W2-b/c/d.
- **Wave 3** (polish) — PARTIAL: FR-37-44/45 verified (`reports/visual-diff/site-header-2026-08-19.md`);
  FR-37-27 settled; simplicity finding 2 (canvas-click selection) open; FR-37-6 per-site CPT
  sourcing unverified; FR-37-26 blind-tester session not done; FR-37-18 conformance partial.
- **Wave 4** (proof gate — 10 client clones, Bean's-eye per clone) — not started.
- **Wave 5** (clone walker — FR-37-22) — not started.

**First action:** check for stored string `drawerRef` values on `sgs/nav-bar-menu` blocks on
sandybrown and the Indus test site (`wp post list` + `post_content` search for `"drawerRef":"`); the
result decides how the W2-d sweep is framed.

### Front E — Spec 45 classless FIELD resolution (open)

Built, all 4 tiers, empirically validated — but has NO live pipeline input yet, because Spec 44
does not produce real matches on real data for it to consume.

### Tasks — need Bean directly, not a subagent

- **Drawer-burger click retest.** Confirm live whether the intermittent click-miss (2/3 real
  clicks failed to open the drawer in automated testing) still occurs now the duplicate-burger fix
  has shipped. If it still fails, dispatch a fresh `/systematic-debugging`.
- **Mega-motion Bean's-eye (R-31-13).** Book it with the next live URL.
- **Drawer starter-look mechanism (W2-c).** The template lock stops the native picker firing for an
  `sgs_drawer` post; recommended: surface the 7 looks through the starter-look control already
  mounted in `nav-drawer/edit.js`.
- **Spec 42/43 Phase 3 precondition.** Real WooCommerce attribute/variation catalogue data must
  exist before Phase 3 (priced WC-variation steps) can be built — a WooCommerce-admin
  catalogue-setup task, not block-engine work.

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
  `grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1` — never
  trust a cached number.
- **Canary:** sandybrown, WP 7.1. Production homepage page **2742**. Fresh-clone verification
  page **3448** for cloning-pipeline work. **Indus test site:** its own dedicated site
  (`lavender-dinosaur-183533.hostingersite.com`, `indus-test` deploy target).
- **Visual-diff coverage:** `nav-bar-menu` has one report
  (`reports/visual-diff/nav-bar-menu-2026-09-17.md`), scoped to the item-separator only.
  **`sgs/nav-drawer-menu` has NO visual-diff report** — owed.
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
| **Header/footer + nav system (next front after Front F)** | `plans/2026-07-29-merged-spec36-37-track-strategic-plan.md` + `verify/merged-spec36-37-track.md`; `specs/36-SGS-NAVIGATION-SYSTEM.md`; `specs/37-HEADER-FOOTER-BUILDER.md` |
| **Indus Foods test site — header/footer/nav/mega-menu build** | `sites/indus-foods/CLAUDE.md`; deploy target `indus-test` in `build-deploy.py` |
| Ward End Eye Care draft audit + CPT inventory | `.claude/reports/2026-09-14-eye-care-draft-exceptions-agreed.md` |
| **JS-array content resolver — built, `{{ }}` binding substitution OPEN** | `specs/31-UNIVERSAL-CLONING-PIPELINE.md` §15 |
| **Classless recognition (Spec 44) — built; AI-fallback tier parked** | `specs/44-CLASSLESS-REPEATER-RECOGNITION.md`; `.claude/reports/2026-09-18-spec44-full-pipeline-stage-breakdown.md` |
| **Structural-facts trio (repeaters + composition + singletons)** — built and validated, consumer wiring open | `specs/31-UNIVERSAL-CLONING-PIPELINE.md` §13.9-§13.10 |
| **Classless FIELD resolution (Spec 45)** — all 4 tiers built, no real input yet | `specs/45-CLASSLESS-FIELD-RESOLUTION.md` |
| **Form CPT + choice-flow** — Phase 0 ready | `specs/42-SGS-FORM-CPT-AND-PRICING.md` + `specs/43-SGS-CHOICE-FLOW.md` + `plans/2026-09-14-spec42-43-form-choiceflow-phase-plan.md` |
| Nav menu colour/state system | `specs/41-NAV-MENU-COLOUR-STATE-SYSTEM.md` |
| Per-draft accepted design differences | `sites/mamas-munches/accepted-differences.md` |
| Cloning pipeline spec + binding rules | `specs/31-UNIVERSAL-CLONING-PIPELINE.md` |
| Clone-fidelity measurement | `specs/20-CLONE-FIDELITY-MEASUREMENT.md` |
| Styling/token contract | `specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md` |
| Inspector UX standard | `specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` |
| System architecture | `architecture.md` |
| Goals + exit criteria | `goals.md` |
| Structural defences (STOP catalogue + ritual) | `STOP-CATALOGUE.md` (uncapped) |
| Colour + border helper registries | `plugins/sgs-blocks/CLAUDE.md` |
