---
doc_type: ledger
project: small-giants-wp
last_updated: 2026-09-15
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary — FOR BEAN, plain English (read this first)

**THE ONLY GENUINELY OPEN FRONT: Front C (classless-repeater recognition, Spec 44) — designed,
not built.** Two things need Bean directly, not a subagent: the drawer-burger click retest, and
Spec 42/43 Phase 3's precondition (real WooCommerce catalogue data). Everything else that used to
lead this file — the nav-menu split, Spec 41/36 doc rewrites, Spec 42/43 Phases 0-2 — is FULLY
DONE, DEPLOYED, LIVE-VERIFIED. See "Prior work (closed)" for pointers to the evidence; it isn't
repeated here.

**One real residual on the otherwise-closed nav-menu split:** `nav-bar-menu`/`nav-drawer-menu`
have no visual-diff report yet (verified absent — see State Snapshot). Not blocking, but owed.

## Prior work (closed / parked) — pointer only, full narrative in memory or decisions.md

- **Nav-menu split (D1059/D1060), all 8 steps** — deployed (`1376084dd`), live-verified,
  re-audited 2026-09-15 (5 residuals found+closed), Spec 41+36 doc rewrites both fully closed
  (`63f3cf215`, `98cfb3358`). Evidence: `memory/session-2026-09-15.md`; `decisions.md`
  D1059/D1060/D1076. One residual still open — see Human Summary + State Snapshot.
- **Ward End Eye Care Spec 42/43 Phases 0-2** — done (D1072, D1082). Phase 3 blocked on real
  WooCommerce catalogue data (external, not a block-engine task). `specs/42-SGS-FORM-CPT-AND-PRICING.md`
  (v2.1.0) + `specs/43-SGS-CHOICE-FLOW.md` (v1.2.0); 6-persona council result (NO-GO-as-written,
  revised) in `decisions.md` D1072; phase plan `.claude/plans/2026-09-14-spec42-43-form-choiceflow-phase-plan.md`.
- **Ward End Eye Care Tasks 1/2/4/5** — fully closed (D1067/D1069/D1070, CSS fix `153f8ec1d`).
- **Clone-fidelity closeout + R8 motion + BEM-recognition** — closed/shipped, swept to
  `memory/session-2026-09-11-prior-work-closed.md`. Open residuals: R1's 17-attribute
  conversion, `tier_object_base()`'s 67-attribute over-match, trust-bar pill padding (minor).
  Mama's branded header/footer authoring is READY (not paused) — `.claude/prompts/2026-09-10-header-footer-implementation.md`.
- **Universal-pipeline converter wiring** (D1071/D1073/D1075) — shipped; its live continuation is
  Front C (Spec 44), not further work here.

## Blockers

**None.**

## THE FRONT — what to pick up next

The nav-menu split and the Spec 42/43 council track are both CLOSED — see "Prior work" above
for pointers. The only genuinely open front is C, plus the two Bean-only tasks below.

### Front C — Universal-pipeline classless recognition (D1071/D1073/D1074/D1075/D1077/D1078/D1081)

**Spec 44 (`specs/44-CLASSLESS-REPEATER-RECOGNITION.md`) is DESIGNED at v2.3.0, NOT YET BUILT,
NOT YET re-verified by a council pass since v2.3.0 — do not assume v2.3.0 is GO.** Went through
3 `/adversarial-council` rounds (full trail D1081). Root mechanism: Stage A (parent-context-narrowed
structural match) falling back to Stage B (DB-fact elimination). Auto-complete gate FR-44-1.
Full detail, the scope correction (page-level routing moved OUT of Spec 44), and the
carried-forward D1078 corrections (`thumbs`/`items`/"top brands" resolutions) are in
`decisions.md` D1081 and the spec itself — read those, not a summary here.

**Next priority:** council-verify v2.3.0 before building, then Stage A/B behind
`--classless-match`/`--classless-auto-complete`. Separate named tracks: responsiveness work
(already designed, `plans/archive/2026-09-14-connect-sc-var-identity-to-responsive-values.md`);
rule-table extension (Tailwind/shadcn/Webflow/Elementor/Divi — locate its plan next session);
one-off classless content (deferred, no composite to check against).

Standing rule from this front: narrow by parent context before leaf-structural match — lesson
`C:/Users/Bean/.claude/memory/learning/2026-09-15-narrow-by-parent-context-before-leaf-structural-match.md`.

### Tasks — need Bean directly, not a subagent
- **Drawer-burger click retest.** Confirm live whether the intermittent click-miss (2/3 real
  clicks failed to open the drawer in automated testing) still occurs now the duplicate-burger
  fix (D1047) has shipped. If it still fails, dispatch a fresh `/systematic-debugging`
  investigation with Bean's exact repro steps.
- **Spec 42/43 Phase 3 precondition.** Real WooCommerce attribute/variation catalogue data must
  exist before Phase 3 (priced WC-variation steps) can be built — a WooCommerce-admin
  catalogue-setup task, not block-engine work.

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
- **Parity figures — STALE the moment a new commit lands on the tool; re-run before quoting.**
  Last full run (page 3448): STRUCTURE 93% (324/348), LAYOUT 75% (579/773), PAINT+TYPE 89%
  (1260/1412), CONTENT 100% (234/234). Re-run
  `node plugins/sgs-blocks/scripts/parity/computed-parity.js --draft <mockup> --clone <url>`
  fresh; check `sites/mamas-munches/accepted-differences.md` for recorded exceptions first.

## Pointers

| For | Read |
|---|---|
| **Nav-menu split — ALL 8 STEPS DONE; only gap is a missing visual-diff report** | `C:\Users\Bean\.claude\plans\our-new-draft-from-enchanted-karp.md` (user-level plan file, not under the project's own .claude/plans/); `decisions.md` D1059/D1060/D1076; `.claude/reports/2026-09-14-nav-menu-split-attribute-classification.md` |
| Ward End Eye Care draft audit + CPT inventory (grounding for the whole eye-care session) | `.claude/reports/2026-09-14-eye-care-draft-exceptions-agreed.md` |
| **Classless repeater recognition — start here** | `specs/44-CLASSLESS-REPEATER-RECOGNITION.md` (v2.3.0, DESIGNED not built); `decisions.md` D1081 (3-round trail); Front C above |
| **Form CPT + choice-flow — council-closed, Phase 0 ready to execute (D1072)** | `specs/42-SGS-FORM-CPT-AND-PRICING.md` (v2.1.0) + `specs/43-SGS-CHOICE-FLOW.md` (v1.2.0) + `plans/2026-09-14-spec42-43-form-choiceflow-phase-plan.md` |
| Spec 41 nav-menu colour/state (Waves A-C DONE/archived; citations fixed this session) | `specs/41-NAV-MENU-COLOUR-STATE-SYSTEM.md`; `plans/archive/phase-nav-menu-colour-state.md` |
| Header/footer spec + stalled strategic plan | `specs/37-HEADER-FOOTER-BUILDER.md`; `plans/2026-07-29-merged-spec36-37-track-strategic-plan.md` |
| Mama's branded header/footer authoring — R8 shipped, ready not paused | `.claude/prompts/2026-09-10-header-footer-implementation.md` |
| BEM-recognition + template-detection (Tier 0/1/2 shipped; Tier 3 out of scope) — ARCHIVED | `plans/archive/2026-09-10-bem-recognition-and-template-detection-brainstorm.md` |
| Per-draft accepted design differences | `sites/mamas-munches/accepted-differences.md` |
| Cloning pipeline spec + binding rules | `specs/31-UNIVERSAL-CLONING-PIPELINE.md` |
| Clone-fidelity measurement | `specs/20-CLONE-FIDELITY-MEASUREMENT.md` |
| Styling/token contract | `specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md` |
| Inspector UX standard | `specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` |
| System architecture | `architecture.md` |
| Goals + exit criteria | `goals.md` |
| Structural defences (STOP catalogue + ritual) | `STOP-CATALOGUE.md` (uncapped, D101) |
| Colour + border helper registries | `plugins/sgs-blocks/CLAUDE.md` |
