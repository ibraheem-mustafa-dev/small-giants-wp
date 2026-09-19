---
doc_type: ledger
project: small-giants-wp
last_updated: 2026-09-19
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary — FOR BEAN, plain English (read this first)

**NEXT SESSION (Bean-directed): READ FIRST, THEN RE-PROPOSE. Do not propose from memory.**
Bean stopped the last session because designs were being proposed cold, and asked things that could be
looked up. Order: (1) Spec 33 (ASAP): read it in full, then the code behind its business-data step
(FR-33-14, which ALREADY saves phone/email/socials to the Site Info settings page but was never run on this
draft and may not see values behind `{{ phone }}` bindings), then re-propose the Spec 33 upgrade so it handles
runtime-template drafts AS WELL AS plain HTML. (2) Then the "missing sections" problem (Problem 1 below).
(3) Then runtime `{{ }}` bindings. Bean's rules for all of it: **never change how Mama's Munches and other
static drafts already behave** (this is an extension), Spec 33 saves GLOBAL DEFAULTS/SETTINGS only (not
per-element styling), and the pipeline should recognise settings-type placeholders and insert what Spec 33
saved. Details, reading list and task blocks: "Front F" below. Then the merged Spec 36+37 track.

**Where the Eye Care Birmingham clone really stands.** A real test website now exists (below) and shows the
honest picture: the cloned page matches about 12% of the draft's content and 0% of its styling, shows 93 raw
`{{ }}` placeholders to visitors, and 7 of the 8 homepage sections are missing. The pipeline's "42 of 74
complete" was hollow. Spec 45 (classless FIELD resolution) is built but has no real pipeline input yet.

**Nav / header / footer.** Wave 1 (fixtures + verification) is closed. Wave 2 (capabilities) is
part done: the drawer post type, trigger controls, scoped behaviours and lint gate are built; the
drawer post picker is built except creating a drawer inline; the 7 drawer starter patterns, logo source,
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

### Front F — Eye Care Birmingham clone on a REAL page (Bean-directed, do this first)

**Test site:** https://darkcyan-grouse-898606.hostingersite.com/eye-care-birmingham/ (page 11; WP 7.1.1 +
WooCommerce; `build-deploy.py --target eye-care-test`; creds `.claude/secrets/eye-care-test.env`). Run a clone:
`SGS_DEPLOY_SITE=eye-care-test`, `SSL_CERT_FILE` and `NODE_EXTRA_CA_CERTS` = the certifi `cacert.pem` (Python's
Windows TLS store rejects every hostingersite.com host, proven), `--deploy-target page:11`, no
`--skip-freshness-gate`, plus `--client eye-care-ward-end --page eye-care-birmingham --auto-section --mode draft
--skip-register --no-scaffold-new-blocks --sc-var-cache sites/eye-care-ward-end/sc-var-hints.json
--sc-var-min-confidence 0.0 --dom-shape-min-confidence 0.0 --classless-match --classless-auto-complete`
(add `--resolve-js-content` for the flag-ON comparison). Verify "what a visitor sees" with Playwright `innerText`,
NEVER a tag-stripping regex; compare runs by (selector, block) identity, never `boundary_id`; verify a stage
claim by grepping the emitted output for one string it should have produced. Files shared between bash and python:
relative names (Git Bash `/tmp` and Python `/tmp` are different folders).

**Snapshot state:** `sites/eye-care-ward-end/theme-snapshot.json` is recreated from the draft by Spec 33 with
`--merge-onto theme/sgs-theme/theme.json` (framework palette kept: 18 framework slugs + the draft's 3 guessed colours, which are advisory and stripped
at push, so the test site has 18). The old palette files stay deleted (Bean: do not restore them).

**Real numbers now:** Stage 11.6 scores the draft served over HTTP: content 12%, css 0%. Live page: 93
visible `{{ }}` placeholders (59 distinct), no ticker text, 7 of 8 homepage boundaries (b3-b9) missing.

**Findings (each investigated; reports in `.claude/reports/2026-09-19-inv-*.md`, decisions.md newest entries):**
1. *Problem 1, missing sections (biggest).* The "14 non-BEM" boundaries are classless sections gated on a hint (the
   draft has ONE `class=`): 4 homepage sections (b5, b7, b8, b9), 8 other routed views, 2 chrome. Spec 44 §11 open
   finding: proposed (A) admit any classless boundary as the container default, (B) only the default routed view
   goes on the page, (C) fix the halt message + report lost text. NOT designed; needs a design gate; must not change
   Mama's. Not proven: that the large sections convert cleanly.
2. *Spec 33 (Bean's priority).* Pass B guessed 3 colours (one is a scrollbar hover colour), the real accent `--acc`
   is set by JS at runtime and never read, an all-advisory push wiped the test site's palette (fixed via
   `--merge-onto`), and `push-theme-snapshot.py` aborts on a brand-new site. Small fix proposed in the report
   (skip scrollbar/hover/focus selectors in `roles.py`); the overlay-not-replace and custom-property read need design.
3. *Runtime `{{ }}` bindings.* Stage 2 unbuilt. Kinds seen: site settings (`{{ phone }}`), page copy (`{{ h1 }}`),
   cart/checkout UI state, styling values. Keeping the `<sc-for>` lands only item 0 of N; full conservation needs
   container-level handling.
4. *Built and pushed this session:* Stage 1 (loose text beside an element), the Stage 11.6 fix,
   the test site + `SGS_DEPLOY_SITE`, the JS-resolver wrong-directory fix. Retracted: the "theme comment leak" (my regex artefact).

**Paste-ready prompt for the next session:** `.claude/prompts/2026-09-19-eye-care-spec33-and-missing-sections.md`.
It is single-use: delete it (`git rm`) in the same commit as that session's first work.

**Task blocks for the next session (orchestration: main thread Opus, inline; investigators are read-only):**

- **Task 1 — Read, no proposing.** Read `specs/33-DRAFT-GLOBAL-STYLES-EXTRACTOR.md` (in full), the code behind
  FR-33-14 (`scripts/sync-business-info.py`, `includes/class-sgs-site-info-admin.php`, `Sgs_Site_Info`,
  `includes/class-sgs-site-info-rest.php`, the wiring in `orchestrator/upload_and_patch.py`), the extractor
  (`scripts/theme-extractor/*.py`, `measure.js`), and the three reports `2026-09-19-inv-spec33-palette.md`,
  `-inv-non-bem-sections.md`, `-inv-stage116-draft-side.md`. State what ALREADY EXISTS before what is missing.
  Acceptance: a plain-English "what exists / what is missing" for Spec 33 that Bean can check. Inline, no subagent.
- **Task 2 — Spec 33 upgrade design (`/brainstorming`, design gate with Bean).** Runtime-template drafts AND plain
  HTML; global defaults/settings only; settings-type placeholders resolved to Site Info values the pipeline inserts.
  Regression guard: Mama's Munches snapshot + page 3448 output must be byte-/identity-unchanged. Acceptance: Bean
  approves the plan; then build with an independent `/qc` and a real-page check on the test site.
- **Task 3 — Problem 1 design (`/brainstorming`, after Task 2).** Options A+B+C above; must leave Mama's unchanged
  (identity-diff before/after on the Mama's clone). Acceptance: on the test page the homepage sections b3-b9 exist,
  checked in Playwright `innerText`, not counts.
- **Task 4 — Stage 2 bindings** after Tasks 2 and 3 (depends on both). Success metric: visible placeholders 93 -> 0
  for content bindings.
- Parallel: read-only investigators may run alongside (one directory each, main thread owns deploys and commits).
- Needs Bean directly: the 15 `classless-review` boundaries (`operator-review.html`), design-gate approvals.

Open tooling gaps (not assigned, own fixes): `push-theme-snapshot.py` on a brand-new site; other consumers of
`args.mockup` after the Stage -2 reassign not audited for the D1112 class; `sites/eye-care-ward-end` theme-snapshot
axis sidecars deliberately not restored. Front C residual: the AI-fallback tier (Spec 44 §11) stays parked (Bean).
There is NO plan doc for Front F yet: write one (`/strategic-plan`) after the Task 2/3 design gates.

### Spec 36+37 merged track (after Front F)

**Read `plans/2026-07-29-merged-spec36-37-track-strategic-plan.md` + `verify/merged-spec36-37-track.md`
IN FULL before touching anything — do not act on this summary.**

- **Wave 1** (fixtures + verification) — CLOSED. Residuals: axe on the Gate-3 mega panel shows 6
  primary-colour contrast violations on the Mama's palette, accepted by owner ruling; Bean's-eye on
  mega motion not recorded; cart/search screenshot set not captured.
- **Wave 2** (capability) — DONE a, d, e, f (live/eye verification owed), g, h, j, k, q, s, t ·
  PARTIAL b, i · NOT DONE c, l, m, n, o, p, r, u. Gate 2 passed once
  (`reports/2026-07-30-w2a-gate2-drawer-cpt.md`); a re-run is owed after W2-b/c/d.
- **Wave 3** (polish) — PARTIAL: FR-37-44/45 verified (`reports/visual-diff/site-header-2026-08-19.md`);
  FR-37-27 settled; simplicity finding 2 (canvas-click selection) open; FR-37-6 per-site CPT
  sourcing unverified; FR-37-26 blind-tester session not done; FR-37-18 conformance partial.
- **Wave 4** (proof gate — 10 client clones, Bean's-eye per clone) — not started.
- **Wave 5** (clone walker — FR-37-22) — not started.

**First action:** confirm with Bean how the 7 drawer starter looks (W2-c) are delivered — recommended:
as starter patterns surfaced through the starter-look control already in `nav-drawer/edit.js` — then
build them, re-run Gate 2, and remove `variantPreset`.

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
