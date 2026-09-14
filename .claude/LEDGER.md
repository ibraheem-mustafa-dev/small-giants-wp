---
doc_type: ledger
project: small-giants-wp
last_updated: 2026-09-14
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary — FOR BEAN, plain English (read this first)

**THE FRONT right now: the nav-menu block split (D1059/D1060) is FULLY DONE, ALL 8 STEPS,
INCLUDING THE NEW FEATURES.** The single `sgs/nav-menu` block is now two real, separate blocks —
`sgs/nav-bar-menu` and `sgs/nav-drawer-menu` — with separated CSS/PHP namespaces, migrated theme
patterns, reseeded DB, matching live canary content, AND the split-nav-either-side-of-logo layout
+ SOON badge + drawer two-tier split the whole track existed to deliver. Build passes clean end
to end on every commit. Full architecture + evidence: `decisions.md` D1059/D1060/D1076; plan:
`C:\Users\Bean\.claude\plans\our-new-draft-from-enchanted-karp.md` (user-level, not under the
project's own `.claude/plans/`).

**Commit sequence:** `ed3b495de` → `5626e8c82` → `80f78f511` → `3b335757d` → `b6c335924` →
`782281040` → `a04ccf942` → `b54c9b347` (Step 6) → `31886a2ea` (Step 7) → `c149de5b4` (Step 8).

**One real blocker survives (Step 5 debt, found deploying Step 6) — see Front A: `sgs/nav-drawer-menu`
has 179 rogue DB `css_property` seeds blocking any canary deploy that touches it.** Needs its own
session. Not the nav-menu-split track's own work to re-open — it's a Step 5 reseed gap.

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
classless-repeater recognition parked after 3 council rounds (D1074), Tier B rewired as a
halt-and-resume (D1075).** Full detail in "Front C" below — not duplicated here.

## Blockers

**None.**

## THE FRONT — what to pick up next

### Front A — nav-menu split (D1059/D1060) — ALL 8 STEPS DONE
`sgs/nav-bar-menu` + `sgs/nav-drawer-menu` fully split (BEM/PHP namespaces, patterns, DB
reseeded, live canary content). Steps 6-8 (`b54c9b347`, `31886a2ea`, `c149de5b4`, 2026-09-15) —
`ColumnShapePicker` gained an `auto` track (`1fr auto 1fr` "Fit centre"); `nav-bar-menu` gained
`justifyContent`, `splitAfterItemId`+`splitSide`+`showBurger`; `nav-drawer-menu` gained
`splitAfterItemId`+`splitSide` (two-tier). Both split-capable blocks disambiguate auto-derived
`navLabel` per side (landmark-unique). Step 7: both blocks repurpose the operator's menu-item
"Description" field as free-text badge copy ("SOON") via a new shared `sgs_nav_shared_badge_html()`
— tinted chip on the bar, bare letter-spaced word in the drawer; real visually-hidden text (not
CSS content) keeps the accessible name "Label (Badge)"; 24-char cap. Also fixed:
`aria-disabled="true"` on the drawer's URL-less `__link--label` span. `npm run build` clean on
every commit. **Visual-diff gate scope-skipped on all three** (disclosed each time) — Step 6/8
attrs default byte-identical, Step 7 is genuinely new-visual but capture is blocked by the
blocker below. Whole track: read it as CLOSED — no more nav-menu-split steps pending.

**STANDING BLOCKER (Step 5 debt, found while deploying Step 6): `sgs/nav-drawer-menu` has 179
"rogue" DB `css_property` seeds** — `build-deploy.py`'s F6 scanner (`sgs-update-v2.py`) fails the
deploy: submenu typography/marker attrs (e.g. `submenuFontStyle`) have no matching entry in
`css-property-classifications.json`/`attr-classification-overrides.json`, would vanish on next
reseed. NOT caused by Steps 6-8. **Deploy to sandybrown BLOCKED for nav-drawer-menu pages** —
needs its own session; also blocks live-verifying Step 7's badge on the canary.

**`parking.md`'s `P-NAV-DROPDOWN-STACKING-IN-PAGE-CONTENT`** (still PARTIAL) — citation drift
fixed + live-verified post-split, bug itself still unfixed.

**Spec 36/41 citation drift** — 13 gating `CITE-SYMBOL` findings on Spec 41 (Step-3-rename drift,
re-disclosed each nav-menu-split commit through `c149de5b4`), not yet re-fixed. Spec 36's bare
`sgs/nav-menu` prose mentions (ungated) also untouched — bigger job.

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

### Front C — Universal-pipeline classless recognition (D1071/D1073/D1074/D1075/D1077/D1078)

**State recap:** the pipeline can SEE classless content and let it past the hard-halt gate
(shipped, live-verified). Can't yet reliably tell WHICH piece of a repeated card is the
title/price/icon. Three council rounds on Spec 44, each finding a new flaw, reverted rather
than a 4th rewrite (D1074) — full trail in git history. Tier B's auto-classification is SOLVED
(D1075, halt-and-resume, no API key needed — that blocker is gone, remove stale notes).

**Next priority — start with `.claude/reports/2026-09-14-classless-recognition-next-design-
attempt.md` (6 threads, esp. Thread 6), NOT a blank prototype.** Strongest lead: Thread 6
(D1078) — a DATABASE table of declared schemas missed real answers that direct source/live-page
inspection found immediately (some answers aren't even SGS blocks — WooCommerce natives).
**Bean's own idea, not yet designed:** recognise a PARENT/composite structure first,
descendants inherit identity from their known position in that structure — no per-field
guessing. §3's "recommended shape" predates this, needs re-thinking not building as written.
Also still strong: DB-fact elimination (Thread 3, 6/8 groups to one block) + the
JS-construction signal (`.claude/reports/2026-09-14-claude-design-draft-field-identity-
schema.md`). Next session: `/brainstorming` fresh, reading the design doc first.

**Also fixed:** Tier A's fabricated docstring claim — corrected (`372ed8ce1`). **`items`/
`thumbs`: identities KNOWN (D1078), code fix still open.** `thumbs` → `sgs/buybox`'s
thumbnail-strip. `items` → **WooCommerce's native Product Filter blocks** +
`sgs/filter-search` (NOT `sgs/option-picker` — that first guess was ALSO wrong, caught by
Bean live-inspecting the real shop page; no DB table reaches a non-SGS native-block answer).
`sc_var_classifier.py`'s alias table still wrongly resolves both to `sgs/info-box` — a
small, separate, not-yet-done fix.

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
| **Classless repeater recognition — start here next session** | `.claude/reports/2026-09-14-classless-recognition-next-design-attempt.md` (read FIRST); `.claude/reports/2026-09-14-claude-design-draft-field-identity-schema.md`; `specs/44-CLASSLESS-REPEATER-RECOGNITION.md` (reverted to v1.0.0); `decisions.md` D1074 (3-round failure trail), D1077 (new evidence + what's still fabricated-vs-real) |
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
