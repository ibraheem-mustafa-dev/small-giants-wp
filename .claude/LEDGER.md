---
doc_type: ledger
project: small-giants-wp
last_updated: 2026-09-14
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary — FOR BEAN, plain English (read this first)

**THE FRONT right now: splitting the nav-menu block in two, D1059/D1060 — Step 1 + classifier
DONE, colour-default bugfix (Part A) shipped and live this session (commit `ed3b495de`).**
The single `sgs/nav-menu` block (one 156-attribute schema rendering both the header bar and the
drawer accordion) is being split into `sgs/nav-bar-menu` + `sgs/nav-drawer-menu` — this is what
unblocks the Eye Care split-nav-either-side-of-logo header and the drawer's two-tier badge design
from the original request. Full architecture + evidence: `decisions.md` D1059 (the split) and
D1060 (drawer colour defaults); plan: `C:\Users\Bean\.claude\plans\our-new-draft-from-enchanted-karp.md` (user-level plan file, not under the project's own .claude/plans/).

Survey (17 pattern instances, 1,384 literal occurrences) and the attribute classification
(BAR 32 / DRAWER 9 / BOTH 96 / NO-EFFECT 16, measured by rendering each fork in its real
ancestors) are both done and committed. **This session shipped "Part A"** — the drawer colour
defaults fix D1060 rulings 1-5 needed before any further build: `drawerBg` now defaults to the
`surface` global token (was `primary`); the drawer's hardcoded `color:inherit` and panel
background rules are wrapped in `:where()` so a client's own colour setting wins instead of
losing to the framework default; the submenu panel's `background:` shorthand no longer resets
`submenuBgGradient`'s `background-image`. Live-verified on the sandybrown canary (lifted CSS
text + Playwright computed-style with transitions disabled) — see
`reports/visual-diff/nav-drawer-2026-09-14.md`.

**Still open before Step 2 (block scaffolding) can start — Step 2.5:** the classifier's own
known defects (TextColumns test values outside 1-6, an invalid raw shadow shape, enum test
values equal to CSS initial values, root custom-property resolution to their `var()` consumers)
are NOT yet fixed, so its BAR/DRAWER/BOTH verdicts should be treated as directionally right but
not final until re-run clean. **One gap surfaced by this session's live verification, not yet
actioned:** D1060 ruling 7 says the drawer keeps `submenuPadding` and makes it work (both Claude
Design nested drawers use bottom-heavy padding); Part A removed the hardcoded `padding:0` from
the drawer PANEL rule, but a SEPARATE, pre-existing list-reset rule
(`.sgs-nav-menu__submenu{padding:0;...}`) still zeroes it by default when no `submenuPadding`
value is set — the control isn't actually wired to a default yet. Flag this to whoever does
Step 2.5/Step 2 scaffold.

**Everything else this file used to lead with (Ward End Eye Care Spec 42/43, the Spec 41
nav-menu colour/state Waves A-C programme, R8 motion, BEM-recognition) is unchanged from the
last handoff and CLOSED or PARKED exactly as before** — see "Prior work (closed)" and "Front B"
below for the pointers; nothing in those tracks moved this session.

## Prior work (closed / parked) — pointer only, full narrative in memory or decisions.md

**Ward End Eye Care Spec 42/43 (form CPT + choice-flow) — spec-only, PARKED pending a combined
adversarial-council pass Bean asked for.** Read `specs/42-SGS-FORM-CPT-AND-PRICING.md` +
`specs/43-SGS-CHOICE-FLOW.md` in full before touching; FR-42-0 (fail-open `requireLogin` bug) is
independently ship-ready any time. See "Front B" below for the orchestration plan.

**Ward End Eye Care Tasks 1/2/4/5 — FULLY CLOSED this session (D1067/D1069/D1070, CSS fix
`153f8ec1d`).** QC-closed all four (D1067: PASS or PASS-WITH-GAPS); two doc-rot comments fixed
inline. Task 1's "6 live trigger points" turned out to be a false premise, checked against the
live site rather than assumed — Ward End Eye Care has no build yet, so there is no real content
to migrate (D1069). The `sgs_modal`/`modalRef` mechanism itself was instead live-proven
end-to-end on a generic test post: two independent pages, one canonical source, an edit to the
source propagated to both without touching either page (D1070) — re-open the REAL migration only
once the eye-care build exists. The separately-scoped pre-existing bug Task 2's QC surfaced
(`.sgs-form-field--hidden` had no CSS rule, so a disabled conditional field stayed visually on
the page though correctly excluded from submission) is now FIXED and live-verified — commit
`153f8ec1d`, `plugins/sgs-blocks/src/blocks/form/style.css`.

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
Next is **Step 2.5**: fix the classifier's own test-value defects (TextColumns range, shadow
shape, non-initial enum values), add a cascade-aware computed-style check that waits for
transitions before reading (see memory `computed-style-after-forced-state-reads-the-transition-start.md`
— the exact bug class that produced invalid verdicts earlier this session's classifier work
guarded against), resolve root custom properties to their `var()` consumers, then re-run and
confirm the BAR/DRAWER/BOTH verdicts the D1059 rulings rest on. Then investigate the
`submenuPadding` default gap noted above (Human Summary). THEN Step 2 — scaffold
`sgs/nav-bar-menu` + `sgs/nav-drawer-menu` per the classification in
`.claude/reports/2026-09-14-nav-menu-split-attribute-classification.md`, confirm the two
verdicts needing a human call (`collapsePoint` bar-only-in-effect; `submenuMinWidth`/`Shadow`/
`BorderRadius`/`Padding` — drawer accordion reuses the dropdown class), and confirm how the 133
framework-injected attributes reach both new blocks. Full step sequence (Steps 3-8: BEM root
rename, pattern migration, reseed+build+retire, the split-nav feature, the badge, the drawer's
two tiers): `C:\Users\Bean\.claude\plans\our-new-draft-from-enchanted-karp.md` (user-level plan file, not under the project's own .claude/plans/).

### Front B — Spec 42/43 combined adversarial-council (Bean-directed, independent of Front A)
**What:** run `/adversarial-council` on Spec 42 + Spec 43 together (a single combined
pre-mortem — they've been reconciled pairwise but never pre-mortemed as a merged whole).
Resolve every valid finding — fix in the specs directly for cheap/clear items, escalate to Bean
for genuine policy calls. Then `/strategic-plan` the real build, sequenced per Spec 42 §11.
**Why:** Bean's own explicit instruction — the reconciliation itself (pricing moved 42→43, the
shared CPT-lifecycle contract, the shared cloning-pipeline gap) is new surface a per-spec-alone
council never saw. **Orchestration:** 6-persona parallel dispatch (Cynic/Competitor/
Spec-Lawyer/Ship-PM/Abuse/Support-Realist), fact-check every finding against real code before
accepting, present GO/NO-GO to Bean before `/strategic-plan`. **Depends on:** none — specs are
complete and reconciled. **Acceptance:** a GO or a NO-GO with a named, resolvable fix list,
confirmed with Bean, before any code for either CPT.

### Task — Bean retests the drawer-burger click issue (STILL OPEN, needs Bean not a subagent)
Confirm live whether the intermittent click-miss (2/3 real clicks failed to open the drawer in
automated testing) still occurs now the duplicate-burger fix (D1047) has shipped. If it still
fails, dispatch a fresh `/systematic-debugging` investigation with Bean's exact repro steps.

### Methodology guardrails
See "Methodology guardrails (carried forward — all still true)" below — unchanged, still
binding. **Add from this session:** a `git stash` on a shared worktree is banned even for a
seconds-long "does this reproduce on clean HEAD" check — `git stash push -u -- <paths>` swept
in other sessions' work-in-progress files the moment it ran; `git stash pop` immediately after
recovered everything with no loss, but the safer move is `git worktree add` or just re-reading
the file at a prior commit (`git show <sha>:<path>`) instead of touching the shared index at
all. Also: a `[REDACTED]`-style `DEPLOYED-BUT-BROKEN` verify failure from `build-deploy.py` can
be a LOCAL machine cert-store problem (stale Python `certifi` bundle), not a real site outage —
`curl` (system CA store) succeeding while Python's `ssl` module fails with
`CERTIFICATE_VERIFY_FAILED: certificate has expired` on a cert that `openssl s_client` shows is
genuinely valid is the tell; purge caches manually over SSH (`wp cache flush` +
`opcache_reset()`) rather than trusting the automated probe's verdict.

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
  `git show <sha>:<path>` instead. See "Add from this session" above.
- ⛔ **A subagent cleaning up its own scratch server can nuke the wrong process.** Kill by PID,
  never by name (`taskkill /F /IM python.exe` kills every Python process on the shared machine).
- ⛔ **A single sub-agent's unverified summary line can be wrong even when its other findings are
  solid.** Contradiction between independent checks means verify directly, never silently pick
  a side.
- **A completeness error is invisible to every correctness gate.**
- **A pre-commit gate can fail SILENTLY** after ~250 lines — never `--no-verify`; use the scoped
  `SGS_VISUAL_GATE_SKIP`/`SGS_INSPECTOR_GATE_SKIP`/`SGS_F5_SKIP` + `*_REASON`.
- **Run builds synchronously, never backgrounded.**
- **A new `block.json` attribute needs `sgs-update-v2.py --stage 1` immediately.**
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
  attributing an unfamiliar change.
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
- **`DEPLOYED-BUT-BROKEN` from the deploy script's verify step can be a local cert-store issue,
  not a real outage.** Cross-check with `curl` before trusting it — see "Add from this session"
  above.

## State Snapshot

- **Branch:** `main`. **Do not trust a SHA written here** — run `git rev-parse --short HEAD`.
  150+ sessions share this tree.
- **D-ceiling:** **D1066** — verify with
  `grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`
- **Canary:** sandybrown, WP 7.1. Production homepage page **2742**. Fresh-clone verification
  page **3448** for cloning-pipeline work.
- **Nav-drawer visual diff (this session):** `reports/visual-diff/nav-drawer-2026-09-14.md`,
  verdict PASS, source_sha `804a8c2024799d5b`.
- **Parity figures — STALE the moment a new commit lands on the tool; re-run before quoting.**
  Last full run (page 3448): STRUCTURE 93% (324/348), LAYOUT 75% (579/773), PAINT+TYPE 89%
  (1260/1412), CONTENT 100% (234/234). Re-run
  `node plugins/sgs-blocks/scripts/parity/computed-parity.js --draft <mockup> --clone <url>`
  fresh; check `sites/mamas-munches/accepted-differences.md` for recorded exceptions first.

## Pointers

| For | Read |
|---|---|
| **Nav-menu split — THE live front** | `C:\Users\Bean\.claude\plans\our-new-draft-from-enchanted-karp.md` (user-level plan file, not under the project's own .claude/plans/) (full Step 1-8 sequence + locked rulings); `decisions.md` D1059 (split architecture), D1060 (drawer colour defaults); `.claude/reports/2026-09-14-nav-menu-split-attribute-classification.md` (BAR/DRAWER/BOTH classification); `.claude/reports/2026-09-14-nav-menu-split-decisions-review.md` (agent A-F fact-checked findings) |
| Ward End Eye Care draft audit + CPT inventory (grounding for the whole eye-care session) | `.claude/reports/2026-09-14-eye-care-draft-exceptions-agreed.md` |
| **Form CPT — spec-only, next step is Front B above** | `specs/42-SGS-FORM-CPT-AND-PRICING.md` (v2.0.0) |
| **Choice-flow (quiz/configurator/variation-picker) — spec-only** | `specs/43-SGS-CHOICE-FLOW.md` (v1.1.0) |
| Spec 41 nav-menu colour/state (Waves A-C, DONE/archived) | `specs/41-NAV-MENU-COLOUR-STATE-SYSTEM.md`; `plans/archive/phase-nav-menu-colour-state.md` |
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
