---
doc_type: ledger
project: small-giants-wp
last_updated: 2026-09-27
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary — FOR BEAN, plain English (read this first)

**DRAFT STANDARDISATION: council done, plan approved (D1132). Read `.claude/plans/2026-09-20-draft-standardisation-plan.md`.**
Plan: (A) wire and extend existing functions, no new stage; (B) a small draft standard only for what code cannot derive,
written into the draft by Claude Design; (C) a deterministic checker as the second layer. A1 DONE (D1132): the width
evaluator is wired in. A2 DONE (D1134): the draft's links and loop copy fill in from its own script. Ticker and reviews card
equal the draft at every width (D1139-D1145). Open: 36 raw placeholders (plan A3, Track D). Detail: D1132-D1145.

**Eye Care: now built by hand first (D1149, 2026-09-24).** Instead of finishing the pipeline before any client
ships, the Eye Care site is built by hand to client-ready from Claude Design's gap map, full scope including the lens
configurator and prescription upload. The finished site then becomes the pipeline's answer key. Plan:
`plans/2026-09-24-eye-care-hand-build-design.md`. Waves A-C are built; every page is being re-reviewed against the
draft with the parity tool and its gap checklist before Wave D (Front F). The old clone on test page 11 and its
converter fixes (C1, C3, C4, C5) wait for Phase 7.

**Nav / header / footer.** Wave 1 (fixtures + verification) is closed. Wave 2 (capabilities) is
done and live-verified. The harness self-tests and the fixture fidelity check are in place; only the reference labels for ButcherBox and rabbit.tech wait, on step 0c (before Wave 4). Done: the drawer post type, the picker
(including creating a drawer inline), trigger controls, scoped behaviours, the 7 drawer looks (patterns
seeded as Menu drawer posts on all three test sites), the Site Info logo tier, the scrolled-state header
shadow, the floating header pill (blur-based, matching the one true pill among the references), the formal Gate 2
re-run and the mega + drawer integration probe. Payment icons need no
framework feature (clients upload official artwork into the trust bar). Wave 3 is partial. Waves 3A (independent fixes) and 3B (a requirements table of 13 references: 46 capability families, signed) are done. Wave 3C is under way: U-1, U-2 and all of lane A (the nav bar, drawer and header placement) are closed and live; lanes B (U-13, U-16) and C (U-12, U-15, U-17) are closed; Gate 3C items 1, 2, 3, 5 pass; item 4 fails Bean's eye (reference-capture step 6 next). Waves 4
and 5 have not started.

**Indus Foods** has its own dedicated test site (`lavender-dinosaur-183533.hostingersite.com`,
deploy target `indus-test`) because the active header/footer/theme-snapshot pointers are single
GLOBAL `wp_options` rows per site. Its content build is documented in `sites/indus-foods/CLAUDE.md`.

Things that need Bean directly, not a subagent: the drawer-burger click retest, the mega-motion
Bean's-eye check.

## Blockers

**None.**

## THE FRONT — what to pick up next

### Front F — Eye Care Birmingham, built by hand (Bean-directed, D1149)

Plan: `plans/2026-09-24-eye-care-hand-build-design.md` (Status block = current truth). Draft: `sites/eye-care-ward-end/
Ward End Eye Care - SGS Gap Handoff/`, live at https://mintcream-lyrebird-224487.hostingersite.com/. Test site:
https://darkcyan-grouse-898606.hostingersite.com (creds `.claude/secrets/eye-care-test.env`).

**Now (2026-09-28; eye-care-test runs the plugin at 23e9df009 and the theme at e8ecda854; `main` at the handoff
commit).** Parity re-review: every page compared to the draft by `scripts/parity/draft-live-walk.mjs`
(one config per page in `sites/eye-care-ward-end/build/qa/parity/`) under the method in
`scripts/parity/GAP-CHECKLIST.md` (a page passes when the walker exits 0: config lint, 0 open, every state x width shot
reviewed with a note, 0 console errors). Shop (`shop.mjs`) and lens pop-up (`lens.mjs`) passed, then
reopened under the walker's stricter default checks (2026-09-28; rows in the main plan Status). Other pages to do.
The walker's catch rate is unmeasured (Bean found six gaps by eye on shop and lens). No blockers.

**Resume from:** main plan Status, "Parity re-review owed before Wave D": measure and raise the walker's catch rate,
then the remaining pages in Sonnet waves with Opus QC.

**Parked (detail in the plans):** Mama's Munches needs a site copy of the shop template for its Flavour and Size
groups; card-grid zoom amount control; `disabled` as a golden state; nav-drawer badge/disabled; `IconPicker` `id`.

### Spec 36+37 merged track (after Front F)

**Read `plans/2026-07-29-merged-spec36-37-track-strategic-plan.md` + `verify/merged-spec36-37-track.md`
IN FULL before touching anything — do not act on this summary.**

- **Wave 1** (fixtures + verification) — CLOSED. Residuals: 6 primary-colour contrast violations on the
  Gate-3 mega panel (Mama's palette, accepted by owner ruling); Bean's-eye on mega motion not recorded;
  cart/search screenshot set not captured.
- **Wave 2** (capability) — DONE a, b, c, d, e, f (live/eye verification owed), g, h, j, k, l, n, p, q, r,
  s, t, u · PARTIAL i · CLOSED with no framework feature: o (payment icons). Gate 2 re-run + the mega/drawer
  CPT probe both passed 2026-09-20 (`reports/2026-09-20-w2-gate2-rerun.md`,
  `w2u-cpt-drawer-integration.md`); fidelity is Bean's eye.
- **Wave 3** (polish) — PARTIAL: FR-37-44/45 verified (`reports/visual-diff/site-header-2026-08-19.md`);
  FR-37-27 settled; simplicity finding 2 (canvas-click selection) open; FR-37-6 per-site CPT
  sourcing unverified; FR-37-26 blind-tester session not done; FR-37-18 conformance partial.
- **Wave 3C** (`plans/2026-09-21-wave-3c-implementation-plan.md` §4): **U-1 CLOSED** (D1143, D1146: nav
  timings, header z-index, surface ground on nav + wrapper blocks, layered shadows, dark-surface tone, lift
  on hover by default). **U-2 CLOSED** (D1148: one shared scrim on drawer, menu bar, modal, cart, gallery and
  product search; one hover-shadow control). Everything is live on sandybrown (deployed 2026-09-24). Owed:
  Bean's eye on the three scrim screenshots. U-1's and U-2's owed live checks closed 2026-09-25 (verify file, U-1 and U-2
  sections; fixture and probe in `plugins/sgs-blocks/scripts/nav-qa/README.md` §10), with five fixes live: the header's
  faded ground is its gradient fill, with no header mask over dropdowns, a header Transparent on desktop keeps
  its own fill where it is off, an empty mega card lift no longer lifts, theme gradient presets resolve in the editor
  canvas, and a floating WhatsApp bubble steps aside while an inline WhatsApp button is on screen. **U-9+U-11
  CLOSED** (D1150: the live-opener × rule, per-tier close control, resize and scroll closes, burger morph, magnet strength).
- **Wave 4** (proof gate — 11 client clones incl. resn, 10 if the teardown excludes it; Bean's-eye per
  clone; every Spec 38 effect available) — not started.
- **Wave 5** (clone walker) — not started.

**Pairs and lanes (Bean, 2026-09-24; plan §4 "Pairs and lanes").** Pairs: U-9+U-11, U-3+U-8, U-6+U-7, U-5+U-16,
U-10+U-14 (one design, council, sign-off, deploy and live check each). Lane A (nav/drawer): U-9+U-11 → U-5 → U-3+U-8
→ U-6+U-7 → U-4 → U-10+U-14 (all done). Lane B (header behaviours): U-13 → U-16 (U-14 built by lane A). Lane C
(independent): U-12, U-15, U-17 (closed). Each lane edits only its own line below.

- **Lane A:** CLOSED, including the batched QA pass. Every lane A unit and owed build item is live on sandybrown; `main` at 62757ed5e or later, deployed to sandybrown and eye-care-test. The QA pass (`reports/visual-diff/nav-drawer-2026-09-25.md` section "Lane A batched QA pass"): axe 0 on every drawer state (header burger, detaching chip, side and header-content placements) and on a Scroll sideways row; keyboard, reduced motion and every new control's editor round-trip pass. It found and fixed four defects (d954c83f8): keyboard sibling dim never fired (nested `:has()`), a Scroll sideways row clipped focus rings, the chip was see-through (now the surface token, Bean option a), and `TypographyControls` lost a custom font size, line height or letter spacing on reload on any fresh block. Open, Bean's eye only: gallery arrows, motion shapes, item effects, the U-3+U-8 patterns once they have imagery (plan `.claude/plans/2026-09-21-wave-3c-implementation-plan.md` §4). Both close-out decisions are applied: bar dropdown links default to the palette's `text` (6962dd0e6, deployed, axe 0 on the open dropdown), and the first Scroll sideways item's trimmed inline-start ring is accepted (Spec 02). Fixture on sandybrown: `plugins/sgs-blocks/scripts/nav-qa/qa-item-markup-fixture.php` `two-bar`.
- **Lane B:** CLOSED. U-13 (header colour follows the section; Spec 37 FR-37-50/51) and U-16 (header and footer entrance: the universal entrance now runs as a script animation beside every block's own transitions, CSS animations and transform, with distance presets, 500/800ms delays and a render-blocking head flag against a first-paint flash; Spec 38 §4.3a, Spec 37 FR-37-52; design `reports/2026-09-26-u16-entrance-design.md`) are live on sandybrown at 6292f2eff (deploy verified by checksum, motion-QA green, fixture back on `two-bar`); U-16 live proof in `verify/merged-spec36-37-track.md` Wave 3C. Bean waived the U-16 eye check (2026-09-26: the goal is a visual copy of the references, not the motion's feel). Bean's editor review is applied and live (one device toggle, `SgsBoxControl` everywhere, no "(per device)" titles; Spec 35 v3.1). Text on primary grounds now uses the palette's `primary-text` everywhere (gate `check-text-on-primary.py`); Mama's own `primary-text` is still cream, so its pink buttons stay 2.4:1 until its palette changes (Bean: framework fix only).
- **Lane C:** CLOSED. U-12 (furniture: clock, language switch, store selector, two-tier wishlist with Save for later, theme toggle with an automatic dark palette, Button back-to-top and account, audio sound toggle), U-15 (self-changing banner messages) and U-17 (the Lottie player as a media type, wrapper background and logo substrate; Spec 38 Tier H, D1151) are built, deployed to sandybrown and checked live (`plans/2026-09-21-wave-3c-implementation-plan.md` lane C paragraph; fixture trees `plugins/sgs-blocks/scripts/nav-qa/lane-c/`). Live on sandybrown at 581f89e89 (deploy verified). After Bean's review (2026-09-26): the notice banner gained a full-width strip mode and an icon size plus trust-bar-style badge (checked live on `/qa-notice/`); the dark palette gained fill-scoped ink, so Mama's Munches derives with no failures and no hand-set colours (proved live with a temporary push, then rolled back: button label 8.77:1, page text 6.55:1); a missing `settings.custom` key no longer reads as the whole settings array (`sgs_global_custom_setting()`, gate `check-nested-global-settings`), which had loaded dark mode on every site without a palette. Mama's stays without dark mode (its site is being fully redesigned; its colours are test data only, Bean 2026-09-26). The customer account area and saved-item alerts shipped as Spec 30 FR-30-14/15 (see Spec 30 P5 below).
- **Gate 3C** (plan §7): items 1, 2, 3, 5 pass; lamalama's corner card is accepted as DEC-18 (G8 NO GO; rebuild parked in `plans/2026-09-27-g8-screen-corner-pin-plan.md`). Item 4 FAILS Bean's eye (2026-09-27): U-18's probe measured geometry only (75/76, 23/23), never type, hover, motion or order. Reference-capture steps 1-5 done (2026-09-28): the walker finds every hand-read row (`reports/visual-diff/u18-*`); copies unchanged. **Next: step 6 of `plans/2026-09-27-reference-capture-method-plan.md`.**

### Unified email — CLOSED 2026-09-27 (`plans/2026-09-26-unified-email-plan.md`, all 8 phases + rows 5b/7/8 done)

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
| **Header/footer + nav system (next front after Front F)** | `plans/2026-07-29-merged-spec36-37-track-strategic-plan.md` + `verify/merged-spec36-37-track.md`; `specs/36-SGS-NAVIGATION-SYSTEM.md`; `specs/37-HEADER-FOOTER-BUILDER.md` |
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
