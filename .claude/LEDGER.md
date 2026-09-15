---
doc_type: ledger
project: small-giants-wp
last_updated: 2026-09-15
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary — FOR BEAN, plain English (read this first)

**THE FRONT right now: the nav-menu block split (D1059/D1060) is FULLY DONE, DEPLOYED, AND
LIVE-VERIFIED — nothing left open.** The single `sgs/nav-menu` block is now two real, separate
blocks — `sgs/nav-bar-menu` and `sgs/nav-drawer-menu` — with separated CSS/PHP namespaces,
migrated theme patterns, reseeded DB, matching live canary content, AND the
split-nav-either-side-of-logo layout + SOON badge + drawer two-tier split the whole track existed
to deliver. `/sgs-update` ran clean, the Step 5 DB blocker is resolved, `build-deploy.py` shipped
to sandybrown, and Playwright confirmed every new capability actually works on the live site — see
Front A for the full evidence trail, including two real (pre-existing, unrelated) bugs found and
fixed along the way. Full architecture + evidence: `decisions.md` D1059/D1060/D1076; plan:
`C:\Users\Bean\.claude\plans\our-new-draft-from-enchanted-karp.md` (user-level, not under the
project's own `.claude/plans/`).

**Commit sequence:** `ed3b495de` → `5626e8c82` → `80f78f511` → `3b335757d` → `b6c335924` →
`782281040` → `a04ccf942` → `b54c9b347` (Step 6) → `31886a2ea` (Step 7) → `c149de5b4` (Step 8) →
`e219265d2`+`71a23fe4b` (Step 5 DB fix) → `0b5593dc9` (gate repairs) → `439321df6`+`1376084dd`
(live item-border-shadow fix, deployed).

**No open blockers.** The whole track is closed — see Front A only for historical detail.

**Everything else this file used to lead with (the Spec 41 nav-menu colour/state Waves A-C
programme, R8 motion, BEM-recognition) is unchanged from the last handoff and CLOSED or PARKED
exactly as before** — see "Prior work (closed)" and "Front B" below for the pointers; nothing in
those tracks moved this session. **Spec 42/43 also did not move further this session** — its
own "Front B" entry below is carried forward verbatim from the sibling Eye Care session that
closed it.

## Prior work (closed / parked) — pointer only, full narrative in memory or decisions.md

**Ward End Eye Care Spec 42/43 (form CPT + choice-flow) — council-closed, ready to build
(D1072).** No longer parked. Read `specs/42-SGS-FORM-CPT-AND-PRICING.md` (v2.1.0) +
`specs/43-SGS-CHOICE-FLOW.md` (v1.2.0) in full before touching; Phase 0 (FR-42-0, the fail-open
`requireLogin` bug fix) is fully detailed and ready to execute now —
`plans/2026-09-14-spec42-43-form-choiceflow-phase-plan.md`. See "Front B" below for the full
council result and the Phase 1-5 roadmap.

**Ward End Eye Care Tasks 1/2/4/5 — FULLY CLOSED (D1067/D1069/D1070, CSS fix `153f8ec1d`).**
QC-closed all four (D1067: PASS or PASS-WITH-GAPS); two doc-rot comments fixed inline. Task 1's
"6 live trigger points" turned out to be a false premise, checked against the live site rather
than assumed — Ward End Eye Care has no build yet, so there is no real content to migrate
(D1069). The `sgs_modal`/`modalRef` mechanism itself was instead live-proven end-to-end on a
generic test post (D1070) — re-open the REAL migration only once the eye-care build exists. The
separately-scoped pre-existing bug Task 2's QC surfaced (`.sgs-form-field--hidden` had no CSS
rule) is now FIXED and live-verified — commit `153f8ec1d`.

**Spec 41 nav-menu colour/state — Waves A/B/C (steps 1-23) fully DONE, deployed, live-verified,
plan archived to `plans/archive/phase-nav-menu-colour-state.md`.** Full decision trail
`decisions.md` D1038-D1049. Only one genuinely open item survives from that programme: the
intermittent drawer-burger click-reliability issue needs Bean's own live retest (a duplicate-
burger fix, D1047, shipped but is NOT proven to be this issue's root cause) — no subagent can
close this, it needs Bean's hands on a real device.

**Clone-fidelity closeout + R8 motion + BEM-recognition:** fully closed/shipped, swept to
`.claude/memory/session-2026-09-11-prior-work-closed.md`. Open residuals carried forward: R1's
17-attribute conversion, the `tier_object_base()` 67-attribute over-match, header/footer (paused
behind R8, see `.claude/prompts/2026-09-10-header-footer-implementation.md`), trust-bar pill
padding (minor).

**Universal-pipeline upgrade (Claude Design `.dc.html`) — converter wiring shipped (D1071/D1073),
Tier B rewired as a halt-and-resume (D1075). Spec 44 reworked v2.0.0→v2.3.0 across 3 council
rounds (D1081), designed but not yet built or re-verified.** Full detail in "Front C" below.

## Blockers

**None.**

## THE FRONT — what to pick up next

### Front A — nav-menu split (D1059/D1060) — FULLY DONE + DEPLOYED + LIVE-VERIFIED, re-audited 2026-09-15
`sgs/nav-bar-menu` + `sgs/nav-drawer-menu` split (all 8 steps), deployed to sandybrown
(`1376084dd`), live-verified. Two real pre-existing bugs found+fixed live (item-border shadow
default + a dead CSS branch). Full narrative swept to `memory/session-2026-09-15.md` — read it for
commit hashes and evidence.

**Re-audited against the plan's own checklist 2026-09-15** after Bean directly challenged the
"fully closed" claim — found and closed 5 real residuals: `P-NAV-DROPDOWN-STACKING-IN-PAGE-CONTENT`
RESOLVED (structural `ancestor` restriction on `nav-bar-menu/block.json`, not the CSS-mirroring
patch it was tracking); `P-NAV-HOVER-TYPOGRAPHY-CONTROLS` RESOLVED (was a detector false-positive —
`PREFIXED_HELPER_SUFFIXES` missing a registration, not a real missing-control gap; 12 stale
baseline entries cleaned); Spec 37 FR-37-42 heading fixed; Spec 00 §3.1 gained the
`sgs/form-field-*` counter-example; STOP-CATALOGUE.md gained `E26`. Detail on all 5:
`memory/session-2026-09-15.md` + `memory/parking-archive.md`.

**Spec 41's 13 gating `CITE-SYMBOL` findings — FIXED 2026-09-15** (`e30cefcad`): all 13 stale
`sgs_nav_menu_*`/`.sgs-nav-menu__*` citations rewritten to the real post-split names, verified
against the actual code before writing. `lint-spec-drift.py --check`: 13 gating → 0 gating.

**Spec 36's ungated `sgs/nav-menu` prose — FIXED 2026-09-15** (`98cfb3358`, v2.5): rewrote every
current-architecture passage across §1-9 to name the correct block, verified against live code, plus 2
mechanism corrections (submenu-context is drawer-only, not a bar/drawer selector; the bar block
dropped `SGS_Container_Wrapper` at D539, not "keeps" it). Historical passages left as history.
**Whole nav-menu-split track now genuinely closed** — nothing known outstanding.

### Front B — Spec 42/43 combined adversarial-council — CLOSED (D1072), carried forward verbatim
**Ran the 6-persona council (Cynic/Competitor/Spec-Lawyer/Ship-PM/Abuse/Support-Realist) on
Spec 42+43 together, verdict NO-GO-as-written, Bean chose "revise specs first" from the menu.**
Grades: Cynic D+, Competitor D+, Spec-Lawyer C-, Ship-PM C-, Abuse C+, Support C+. Convergent
finding: Spec 43's flagship eyewear pricing example rested on a false reuse claim
(`sgs/option-picker` has no pricing mechanism at all — verified live by 2 personas independently).
**Bean corrected the real mechanism mid-fix:** `sgs/buybox`'s existing `Product_Manifest` +
`sgs_configurator_mode_price()` (the same system Mama's Munches' flavour/pack-size picker
already runs on) IS the real, live, server-authoritative pricing engine — not option-picker.
Both specs revised: **Spec 42 → v2.1.0**, **Spec 43 → v1.2.0** (pricing rebuilt on the real
`sgs/buybox` manifest). Phase plan:
`.claude/plans/2026-09-14-spec42-43-form-choiceflow-phase-plan.md` — Phase 0 (FR-42-0 fix) fully
detailed and ready to execute (~5 min); Phases 1-5 scoped as a roadmap, each gets its own
`/phase-planner` run when reached. **Next action: execute Phase 0.**

### Front C — Universal-pipeline classless recognition (D1071/D1073/D1074/D1075/D1077/D1078/D1081)

**State recap 2026-09-15 (superseded the "parked" framing — Spec 44 is DESIGNED again, at
v2.3.0):** `.claude/specs/44-CLASSLESS-REPEATER-RECOGNITION.md` went through THREE
`/adversarial-council` rounds tonight (5/6 NO-GO, then 3/3 NO-GO, then a scope correction from
Bean) — full trail D1081. Root mechanism now: **Stage A (structure-first, matches a repeated
group's rendered STRUCTURE — not field names — against a real block's source, but only AFTER
narrowing candidates by parent context: repetition-context via `repeated_sibling_detector.py`
+ the parent's own declared composite shape via `block_attributes`)**, falling back to
**Stage B (DB-fact elimination against `array_item_schema`/`block_attributes`)**. Auto-complete
gate (FR-44-1): exact parent-narrowed structural match, OR first-occurrence-per-client forced
review. New sibling DB table `block_render_repeaters` for render-time (non-attribute) repeaters
like `sgs/buybox`'s WooCommerce-driven gallery. **NOT YET BUILT. NOT YET re-verified by a
council pass since v2.3.0** — do not assume v2.3.0 is GO; the pattern tonight was every prior
revision had a real flaw found on the next pass.

**Scope correction, important for next session:** page-level routing (which real page/template
a whole draft route becomes) is OUT OF SCOPE for Spec 44 entirely — moved to a separate,
already-planned "template/CPT side of the cloning pipeline" (Bean's framing, imminent, not
designed yet). Also surfaced: cloning a template-destination page should write the draft's
design into the site's own SHARED theme template file (so one product-page clone styles every
product) — confirmed nothing in the pipeline writes to `theme/sgs-theme/templates/` today.
Real, new, unbuilt capability for that future track, not Spec 44.

**Corrections carried forward (D1078, re-verified tonight, do not re-litigate):** `thumbs` →
`sgs/buybox`'s real thumbnail strip. `items`/filter panel → **WooCommerce's native Product
Filter blocks** + `sgs/filter-search` (NOT `sgs/option-picker`). "Top brands" framework gap →
**no gap**, `sgs/brand-strip` already covers it (D1031's `media:null` empty-state fix). `sc_var_
classifier.py`'s alias table still wrongly resolves `items`/`thumbs` to `sgs/info-box` — small,
separate, not-yet-done fix.

**Standing rule captured tonight:** narrow by parent context (page/repetition/composite shape)
BEFORE comparing a leaf item's own structural shape against a block roster — a leaf-only
matcher can't tell apart two blocks deliberately built to render identically (`sgs/buybox` vs
`sgs/product-card`'s thumbnail strip, confirmed same session). Full lesson:
`C:/Users/Bean/.claude/memory/learning/2026-09-15-narrow-by-parent-context-before-leaf-structural-match.md`.

**Next priority:** get a verification pass on Spec 44 v2.3.0 before building (given tonight's
pattern), then build Stage A/B behind the two default-off flags it specifies
(`--classless-match`, `--classless-auto-complete`). Remaining named track items (Bean's list,
all separate from Spec 44 itself): **responsiveness work** — ALREADY DESIGNED, read
`.claude/plans/2026-09-14-connect-sc-var-identity-to-responsive-values.md` (do not re-design);
**rule-table extension** — the Tailwind/shadcn/Webflow/Elementor/Divi convention-rule work,
planned before Spec 44 existed (locate the plan file next session — not yet re-found this
session); **one-off classless content** — still explicitly deferred, no sibling/composite to
check a guess against, genuinely different problem from repeated-group recognition.

### Task — Bean retests the drawer-burger click issue (STILL OPEN, needs Bean not a subagent)
Confirm live whether the intermittent click-miss (2/3 real clicks failed to open the drawer in
automated testing) still occurs now the duplicate-burger fix (D1047) has shipped. If it still
fails, dispatch a fresh `/systematic-debugging` investigation with Bean's exact repro steps.

### Methodology guardrails
See "Methodology guardrails (carried forward — all still true)" below — unchanged, still
binding. **Add from this session:**
- A `git stash` on a shared worktree is banned even for a seconds-long "does this reproduce on
  clean HEAD" check — use `git worktree add` or `git show <sha>:<path>` instead.
- `DEPLOYED-BUT-BROKEN` from `build-deploy.py`'s verify step can be a LOCAL cert-store problem
  (stale Python `certifi` bundle), not a real outage — `curl` succeeding while Python's `ssl`
  fails with `CERTIFICATE_VERIFY_FAILED` on a cert `openssl s_client` shows is genuinely valid
  is the tell; purge caches manually over SSH rather than trusting the probe.
- **A brand-new block.json needs a `block_composition` row manually seeded** —
  `sgs-update-v2.py --stage 1`'s sub-step only UPDATES an existing composition row (foreign-key
  constrained), it never INSERTs one for a genuinely new block. Mirror a comparable existing
  block's row (`wraps_block`/`composition_role`/`container_kind`) directly via SQL, across every
  live copy of `sgs-framework.db` (there are several on this machine — check `.agents/skills/`,
  `.claude/skills/`, and project-root copies; not all are current or even share the same schema).
- **Same-file parallel doc edits are safe via isolated worktrees + disjoint line ranges, merged
  by sequential patch apply.** Three agents fixed 43 citations across one 5000-line spec
  concurrently with zero collisions this way — `isolation: "worktree"` per agent, then
  `diff -u base agent-file > patch` + `patch base patch1 patch2 patch3` in sequence (patch's own
  offset-adjustment handles the line-number drift from earlier patches in the chain).
- **Deleting a block's source directory produces real, attributable spec-drift** — not
  pre-existing debt to wave through. `lint-spec-drift.py`'s bypass is for genuinely pre-existing
  findings; a citation that broke because of YOUR OWN commit needs either a real fix or an
  honest, scoped `[gates-ok:...]` disclosure naming it as caused-by-this-commit with a tracked
  follow-up — not silence.
- **A spec document describing a mechanism as "BUILT + LANDED" is a claim, not proof it's real —
  verify against the actual code before citing it as reusable, especially as a load-bearing
  safety argument.** Twice this session (D1074), a design cited an existing-sounding mechanism
  from spec prose (`FR-31-2.5a`'s "signature-scoring, reject below threshold") that turned out to
  not exist anywhere in the real implementation when two independent reviewers actually read the
  code. The fix isn't "trust the spec less" generally — it's "grep/read the actual consumer file
  before treating a spec's prose description as a reusable, already-working mechanism."
- **A safety check that only compares group members AGAINST EACH OTHER cannot catch a mistake
  that affects every member identically** — and a repeated group, by definition, shares one
  template, so a rule-table bug reproduces identically across every item. This is the single most
  likely real failure mode for any "does this repeated content look right" check, and it's
  invisible to any consistency-between-siblings signal, no matter how it's computed (D1074).
- **A `git status`-derived pathspec commit can still sweep another session's file — RECURRED
  (D1076).** Cross-check every file against the work's actual claimed scope before staging —
  appearing in `git status` isn't enough. A 515-line unrelated feature landed in a nav-menu-split
  commit this way; no data lost, but no dispatched agent had claimed it.
- **Don't rewrite a doc entry's technical citation from inference alone (2026-09-14).** Swapped a
  parking entry's post-rename paths from inference, caught, reverted; then corrected that this IS
  my own track — the right move was verifying live and fixing properly, not punting. Did both.

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
  `git show <sha>:<path>` instead.
- ⛔ **A subagent cleaning up its own scratch server can nuke the wrong process.** Kill by PID,
  never by name (`taskkill /F /IM python.exe` kills every Python process on the shared machine).
- ⛔ **A single sub-agent's unverified summary line can be wrong even when its other findings are
  solid.** Contradiction between independent checks means verify directly, never silently pick
  a side.
- **A completeness error is invisible to every correctness gate.**
- **A pre-commit gate can fail SILENTLY** after ~250 lines — never `--no-verify`; use the scoped
  `SGS_VISUAL_GATE_SKIP`/`SGS_INSPECTOR_GATE_SKIP`/`SGS_F5_SKIP` + `*_REASON`.
- **Run builds synchronously, never backgrounded.**
- **A new `block.json` attribute needs `sgs-update-v2.py --stage 1` immediately** — and a
  brand-new BLOCK also needs its `block_composition` row hand-seeded (see "Add from this
  session" above).
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
- **At least THREE sessions hold uncommitted work in this checkout.** Check `git diff` before
  attributing an unfamiliar change. **The LEDGER itself is one of the files sessions race on** —
  read it fresh immediately before replacing it, every time; a sibling session's legitimate
  "replace, not append" write can revert your own recent update if you write from stale context.
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
  pre-transition value.** Disable transitions for measurement, or wait for `transitionend` — but
  check the measurement MECHANISM first: a pure server-side PHP-render text-diff tool (no
  browser involved at all) cannot have this defect regardless of what it tests.

## State Snapshot

- **Branch:** `main`. **Do not trust a SHA written here** — run `git rev-parse --short HEAD`.
  150+ sessions share this tree.
- **D-ceiling:** verify fresh with
  `grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1` (was
  D1078 — re-check, don't trust a cached number here).
- **Canary:** sandybrown, WP 7.1. Production homepage page **2742**. Fresh-clone verification
  page **3448** for cloning-pipeline work.
- **Nav-bar-menu/nav-drawer-menu have NO visual-diff report yet** — deliberately scoped-bypassed
  on commit `782281040` (`SGS_VISUAL_GATE_SKIP=gallery mega-panel nav-bar-menu nav-drawer
  nav-drawer-menu`) because `build/` was stale post-Step-2-deletion so no live capture was
  possible; both blocks now build clean (Step 5) — write real visual-diff reports for them before
  Step 6 lands, or fold it into Step 6's own verification pass.
- **Spec 36 + Spec 41 nav-menu path citations are BROKEN AGAIN** (Step 3's renames re-broke 7
  gating `CITE-SYMBOL` citations — see Front A). Fixed twice before (`3b335757d`, `b6c335924`);
  needs a third small pass. Spec 36's broader bare-prose `sgs/nav-menu` mentions (not path
  citations, ungated) remain untouched — separately tracked, bigger job.
- **Parity figures — STALE the moment a new commit lands on the tool; re-run before quoting.**
  Last full run (page 3448): STRUCTURE 93% (324/348), LAYOUT 75% (579/773), PAINT+TYPE 89%
  (1260/1412), CONTENT 100% (234/234). Re-run
  `node plugins/sgs-blocks/scripts/parity/computed-parity.js --draft <mockup> --clone <url>`
  fresh; check `sites/mamas-munches/accepted-differences.md` for recorded exceptions first.

## Pointers

| For | Read |
|---|---|
| **Nav-menu split — SPLIT DONE (Steps 1-5), next is Step 6-8 (new features)** | `C:\Users\Bean\.claude\plans\our-new-draft-from-enchanted-karp.md` (user-level plan file, not under the project's own .claude/plans/) (full Step 1-8 sequence + locked rulings); `decisions.md` D1059 (split architecture), D1060 (drawer colour defaults), D1076 (Steps 3-5 close-out); `.claude/reports/2026-09-14-nav-menu-split-attribute-classification.md` (BAR 32/DRAWER 9/BOTH 100/NO-EFFECT 12) |
| Ward End Eye Care draft audit + CPT inventory (grounding for the whole eye-care session) | `.claude/reports/2026-09-14-eye-care-draft-exceptions-agreed.md` |
| **Classless repeater recognition — start here** | `specs/44-CLASSLESS-REPEATER-RECOGNITION.md` (v2.3.0, DESIGNED not built); `decisions.md` D1081 (3-round trail); Front C above |
| **Form CPT + choice-flow — council-closed, Phase 0 ready to execute (D1072)** | `specs/42-SGS-FORM-CPT-AND-PRICING.md` (v2.1.0) + `specs/43-SGS-CHOICE-FLOW.md` (v1.2.0) + `plans/2026-09-14-spec42-43-form-choiceflow-phase-plan.md` |
| Spec 41 nav-menu colour/state (Waves A-C DONE/archived; citations fixed this session) | `specs/41-NAV-MENU-COLOUR-STATE-SYSTEM.md`; `plans/archive/phase-nav-menu-colour-state.md` |
| Header/footer spec + stalled strategic plan | `specs/37-HEADER-FOOTER-BUILDER.md`; `plans/2026-07-29-merged-spec36-37-track-strategic-plan.md` |
| Header/footer motion + Indus branded content (paused behind R8) | `.claude/prompts/2026-09-10-header-footer-implementation.md` |
| BEM-recognition + template-detection (Tier 0/1/2 shipped; Tier 3 out of scope) | `plans/2026-09-10-bem-recognition-and-template-detection-brainstorm.md` |
| Per-draft accepted design differences | `sites/mamas-munches/accepted-differences.md` |
| Cloning pipeline spec + binding rules | `specs/31-UNIVERSAL-CLONING-PIPELINE.md` |
| Clone-fidelity measurement | `specs/20-CLONE-FIDELITY-MEASUREMENT.md` |
| Styling/token contract | `specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md` |
| Inspector UX standard | `specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` |
| System architecture | `architecture.md` |
| Goals + exit criteria | `goals.md` |
| Structural defences (STOP catalogue + ritual) | `STOP-CATALOGUE.md` (uncapped, D101) |
| Colour + border helper registries | `plugins/sgs-blocks/CLAUDE.md` |
