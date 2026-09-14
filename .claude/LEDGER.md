---
doc_type: ledger
project: small-giants-wp
last_updated: 2026-09-14
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary — FOR BEAN, plain English (read this first)

**THE FRONT right now: the nav-menu block split (D1059/D1060) is FULLY DONE — Steps 1-5 all
shipped, verified, live-content-safe.** The single `sgs/nav-menu` block (one 156-attribute schema
rendering both the header bar and the drawer accordion) is now two real, separate blocks —
`sgs/nav-bar-menu` and `sgs/nav-drawer-menu` — with fully separated CSS/PHP namespaces, the theme
patterns migrated to route to the right one, the DB reseeded and the old block pruned, and the
live canary's content fixed to match (real header migrated, 22 dead QA fixtures deleted). Build
passes clean end to end. This unblocks the Eye Care split-nav-either-side-of-logo header and the
drawer's two-tier badge design from the original request — **but those features (Steps 6-8) are
NOT built yet.** Full architecture + evidence: `decisions.md` D1059 (the split), D1060 (drawer
colour defaults), D1076 (Steps 3-5 close-out); plan:
`C:\Users\Bean\.claude\plans\our-new-draft-from-enchanted-karp.md` (user-level plan file, not
under the project's own `.claude/plans/`).

**Commit sequence across both sessions:** `ed3b495de` (Part A) → `5626e8c82` (Step 2.5) →
`80f78f511` (Step 2) → `3b335757d` (Spec 41 fix) → `b6c335924` (Spec 36 fix) → `782281040`
(Step 3+4) → `a04ccf942` (Step 5). D1076 has the full Step 3-5 detail, including a disclosed
recurrence of the "shared git index" failure class (no data lost, confirmed).

**Next — Steps 6-8, the actual new features (deliberately deferred to a fresh session, Bean's
call).** Step 6 is the split-nav layout itself — `ColumnShapePicker` needs to learn an `auto`
track option (currently only numeric `fr` weights; this is a real component-architecture change to
a carefully-designed 341-line file, not a rename), restore `justifyContent`, add
`splitAfterItemId`/`splitSide`/`showBurger`. Step 7 is the SOON badge. Step 8 is the drawer's
two-tier look. Full detail + locked rulings + verification checklist: the plan file above — **read
it in full before starting**, it is dense and each step depends on the last.

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

### Front A — nav-menu split (D1059/D1060), THE SPLIT ITSELF IS DONE — next is Steps 6-8
**Steps 1-5 all shipped, verified, pushed (D1076 has full detail).** `sgs/nav-bar-menu` and
`sgs/nav-drawer-menu` are two real blocks with fully separated BEM/PHP namespaces, correctly
routed theme patterns, a reseeded DB (old block pruned), a clean `npm run build`, and matching
live canary content (real header migrated, 22 dead QA fixtures deleted, Bean-directed). Nothing
here is pending — do not re-run Steps 1-5.

**Next: Step 6 — the split-nav feature itself (the original Eye Care request this whole split
exists for), then Step 7 (badge) + Step 8 (drawer two-tier).** Into `nav-bar-menu` only:
`ColumnShapePicker` needs to learn an `auto` track (currently numeric `fr` weights only, `auto`
structurally unreachable — a real component-architecture change to a 341-line file that says "DO
NOT ADD SHAPES FROM TASTE", not a rename); restore `justifyContent`; add `splitAfterItemId` +
`splitSide` + `showBurger`; distinct `navLabel`s per instance. Full detail + locked rulings +
verification checklist: the plan file above — **read it in full first, it is dense and each step
depends on the last.**

**`parking.md`'s `P-NAV-DROPDOWN-STACKING-IN-PAGE-CONTENT` (still PARTIAL) had its Step 3 citation
drift fixed AND live-verified** — confirmed the bug is structurally unchanged post-split: only
`nav-bar-menu` can be page-embedded (`nav-drawer-menu` carries `ancestor:["sgs/nav-drawer"]`),
`$uid_sel` scoping and `nav-menu-submenu-css.php`'s selector pattern are identical, just
parameterized. The underlying bug is still unfixed — only its doc citations were touched.

**Spec 36/41 citation drift RECURRED after Step 3's renames** (e.g.
`sgs_nav_menu_resolved_treatments` → `sgs_nav_shared_resolved_treatments`) — 7 gating
`CITE-SYMBOL` findings, disclosed via `[gates-ok:spec-drift]` on `782281040`, not yet re-fixed.
Same small mechanical class as the two prior fixes (`3b335757d`, `b6c335924`). Separately, Spec
36's dozens of bare `sgs/nav-menu` prose mentions (ungated) remain untouched — bigger job.

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

### Front C — Universal-pipeline classless recognition (D1071/D1073/D1074) — parked, not blocking

**State recap (plain English):** the `/sgs-clone` pipeline can now correctly SEE classless
content (a Claude Design export with zero CSS classes) and let it past the hard-halt gate — that
part is shipped, tested, and live-verified. What it still can't do reliably is figure out WHICH
piece of a repeated card/badge/chip is the title versus the price versus an icon, without any
class names to go on. Three separate rounds of expert review, each fixing the previous round's
problems, each found a NEW fundamental flaw underneath — including twice discovering the design
was quietly built on an unverified claim (a spec document describing a mechanism that turned out
not to exist in the actual code). Spec 44 was reverted to its original design rather than pushing
a 4th live rewrite; nothing is lost, the full trail is in git history and D1074.

**Next priority — do NOT resume by rewriting the spec again.** Recommended: build a small,
disposable prototype directly against the real Eye Care Birmingham draft's actual repeated-group
HTML (ticker badges, brand tiles, "why choose us" cards, filter chips, basket line items) and
measure what a few real, simple matching rules actually get right/wrong — empirical evidence
first, THEN write the spec from what was learned, rather than reasoning it out on paper across
more council rounds. Read `.claude/decisions.md` D1074 in full before starting; it names the
exact three fundamental flaws each round found, so the prototype can be designed to sidestep
them from the start rather than rediscovering them a 4th time.

**Separately open, not blocking:** Tier B (Haiku classifier) auto-wiring needs a real Anthropic
API key decision from Bean — the pipeline scripts currently have no way to call an AI model
themselves (checked directly, confirmed absent). Not urgent.

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
  D1076 as of this write — re-check, don't trust a cached number here).
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
| **Classless repeater recognition — parked after 3 council rounds, D1074** | `specs/44-CLASSLESS-REPEATER-RECOGNITION.md` (reverted to original v1.0.0 design); `decisions.md` D1074 (the full 3-round trail + recommended next approach), D1073 (the shipped dom_shape admission gate) |
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
