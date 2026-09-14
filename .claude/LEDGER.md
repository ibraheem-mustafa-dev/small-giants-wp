---
doc_type: ledger
project: small-giants-wp
last_updated: 2026-09-14
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary — FOR BEAN, plain English (read this first)

**THE FRONT right now: splitting the nav-menu block in two, D1059/D1060 — Steps 1, 2.5 and 2
all DONE, Spec 41's resulting doc-drift also fully closed.** The single `sgs/nav-menu` block
(one 156-attribute schema rendering both the header bar and the drawer accordion) is now two
real, scaffolded blocks — `sgs/nav-bar-menu` (147 attrs) and `sgs/nav-drawer-menu` (116 attrs) —
and the old block is deleted entirely. This unblocks the Eye Care split-nav-either-side-of-logo
header and the drawer's two-tier badge design from the original request. Full architecture +
evidence: `decisions.md` D1059 (the split) and D1060 (drawer colour defaults); plan:
`C:\Users\Bean\.claude\plans\our-new-draft-from-enchanted-karp.md` (user-level plan file, not
under the project's own `.claude/plans/`).

**Sequence this session:** Part A (drawer colour defaults, `ed3b495de`) → Step 2.5 (classifier
sentinel bugs fixed, re-run: BAR 32 / DRAWER 9 / BOTH 100 / NO-EFFECT 12, `5626e8c82`) → the
`submenuPadding` gap root-caused (empty default, no per-block override possible pre-split — fixed
by giving the drawer its own non-zero default at Step 2) → Step 2 scaffold, built as two parallel
subagents in disjoint directories then reconciled by two more parallel agents (shared panels
consolidated into `src/shared/nav-menu-panels/`, `src/blocks/nav-menu/` deleted, a hardcoded
`sgs/nav-menu` registry lookup fixed before it could silently break, `80f78f511`) → the resulting
Spec 41 citation drift (43 sites citing the deleted directory) fixed by three parallel agents in
isolated worktrees, zero collisions, zero remaining findings (`3b335757d`).

**Next: Step 3 (separate BEM CSS roots) + Step 4 (migrate patterns/seeds) — verified safe to run
as two parallel agents.** Checked against the real file-level occurrence data (not assumed): the
only true overlap between the two steps is one file, `includes/class-sgs-nav-menu-source.php`,
resolved by giving Step 3's agent exclusive ownership of both edits to it. Full sequencing, the
verified-safe reasoning, and Steps 5-8 (reseed+retire, the split-nav feature, the badge, the
drawer's two tiers) are all in the plan file above — read it before starting a fresh session on
this, it is dense and each step depends on the last.

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
padding (minor). Universal-pipeline upgrade (Claude Design `.dc.html`) Piece 1+2 shipped
(D1057/D1058), outcome PARTIAL — `<sc-for>`/`<sc-if>` don't survive rendering, converter link
not yet built.

## Blockers

**None.**

## THE FRONT — what to pick up next

### Front A — nav-menu split (D1059/D1060), the live front
**Next: Step 3 + Step 4 in parallel.** Dispatch two agents:
- **Step 3** — separate BEM CSS roots (`.sgs-nav-menu__*` → `.sgs-nav-bar-menu__*` /
  `.sgs-nav-drawer-menu__*`). Scriptable but must explicitly handle the 7 blind spots named in
  the plan's V1 section (frozen hover-guard fixtures, `<details name>` accordion group key,
  `@keyframes` names, `.wp-block-` selectors, cross-block consumers like `mega-panel/view.js`,
  the two-way `--sgs-drawer-align`/burger `aria-expanded` coupling, PHP identifiers). **This
  agent ALSO owns `includes/class-sgs-nav-menu-source.php` exclusively** — it needs both a
  `php_identifier` rename (the `sgs_nav_menu_block_names` filter hook) and the `block_slug`
  allowlist update Step 4 would otherwise need — verified via the survey's own kind-level
  breakdown that this is the ONLY file both steps touch.
- **Step 4** — migrate the 17 pattern instances + `nav-drawer/variations.js`/`edit.js` seeds,
  routing by nesting inside `sgs/nav-drawer`. Does NOT touch
  `class-sgs-nav-menu-source.php` (Step 3 owns it, see above) — verified zero other file overlap
  via the survey's per-kind file breakdown before approving this as a safe parallel pair.

Then Step 5 (reseed via `sgs-update-v2.py` in full — Stage 1 already ran once this session for
the two new blocks, but the FULL 13-stage run including Stage 9's prune of the retired
`sgs/nav-menu` row across both DBs still needs to happen), Step 6 (the actual split-nav feature —
`ColumnShapePicker` learns `auto`, `justifyContent` restored, `splitAfterItemId`/`splitSide`/
`showBurger` added — this is what delivers the original Eye Care request), Step 7 (the SOON
badge), Step 8 (the drawer's two-tier look, reusing Step 6's split control). Full detail,
locked rulings, and the "Explicitly rejected" approaches list: the plan file (see Human Summary
above for the path) — **read it in full before starting a fresh session on this track**, every
step depends on the state the previous one left.

**Known residual, not yet actioned:** Spec 36 also cites the deleted `src/blocks/nav-menu/`
path (8 BLOCK-DIR + 7 CITE-SYMBOL findings, confirmed via `lint-spec-drift.py --check` after
Spec 41's fix landed) — already tracked as its own line item in the plan's "Docs to update"
list ("Spec 36 — two nav blocks; the split + badge are nav requirements"), not yet started.

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
  D1072 as of the sibling Eye Care session's own last write to this file — re-check, don't trust
  a cached number here).
- **Canary:** sandybrown, WP 7.1. Production homepage page **2742**. Fresh-clone verification
  page **3448** for cloning-pipeline work.
- **Nav-drawer visual diff:** `reports/visual-diff/nav-drawer-2026-09-14.md`, verdict PASS,
  source_sha `804a8c2024799d5b`. **Nav-bar-menu/nav-drawer-menu have NO visual-diff report yet**
  — deliberately scoped-bypassed this session (`SGS_VISUAL_GATE_SKIP`) because neither block is
  built/deployed yet; write a real one once Step 5 deploys them.
- **Spec 41 nav-menu citations:** fully fixed, `lint-spec-drift.py --check` returns zero
  findings for that file as of commit `3b335757d`. Spec 36 still has the same class of finding
  (untouched, separately tracked).
- **Parity figures — STALE the moment a new commit lands on the tool; re-run before quoting.**
  Last full run (page 3448): STRUCTURE 93% (324/348), LAYOUT 75% (579/773), PAINT+TYPE 89%
  (1260/1412), CONTENT 100% (234/234). Re-run
  `node plugins/sgs-blocks/scripts/parity/computed-parity.js --draft <mockup> --clone <url>`
  fresh; check `sites/mamas-munches/accepted-differences.md` for recorded exceptions first.

## Pointers

| For | Read |
|---|---|
| **Nav-menu split — THE live front, next is Step 3+4 parallel** | `C:\Users\Bean\.claude\plans\our-new-draft-from-enchanted-karp.md` (user-level plan file, not under the project's own .claude/plans/) (full Step 1-8 sequence + locked rulings); `decisions.md` D1059 (split architecture), D1060 (drawer colour defaults); `.claude/reports/2026-09-14-nav-menu-split-attribute-classification.md` (current: BAR 32/DRAWER 9/BOTH 100/NO-EFFECT 12); `.claude/reports/2026-09-14-nav-menu-split-decisions-review.md` (agent A-F fact-checked findings) |
| Ward End Eye Care draft audit + CPT inventory (grounding for the whole eye-care session) | `.claude/reports/2026-09-14-eye-care-draft-exceptions-agreed.md` |
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
