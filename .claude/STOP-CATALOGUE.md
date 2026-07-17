---
doc_type: reference
project: small-giants-wp
title: STOP catalogue + pre-flight self-attestation ritual (structural defences)
note: "UNCAPPED by design (D101 — never force-drop a defence to fit a byte cap). Split out of next-session-prompt.md/state.md/handoff.md when they collapsed to LEDGER.md (P4, 2026-07-17). Entries carry forward VERBATIM across sessions; new sessions ADD, never SUBTRACT without a recorded justification. Count-check: new unique-STOP count >= previous, every /handoff."
last_updated: 2026-07-17
---

# STOP catalogue — anti-pattern defences (carry forward, never subtract)

**Why this file exists.** These are the operational surfacing of captured failure
patterns (blub.db + `memory/feedback_*.md`). A lesson archived in memory only prevents
a failure when it is surfaced at the point of action — this catalogue IS that surfacing.
Governed by **D101 / `handoff-docs-carry-forward-structural-defences`** (blub.db 290):
when this file is rewritten, COUNT the unique STOP entries before and after — the new
count must be **>= the old**, or the drop needs an inline justification. Bare deletion = a
regression to fix before commit.

`LEDGER.md` is the lean living status; THIS file is the uncapped defence record. LEDGER
points here. Neither ever silently drops a STOP.

---

## A. Process / workflow STOPs (govern every session)

- **STOP-RECHECK-BRANCH-BEFORE-COMMIT** — on a shared worktree with co-active sessions,
  put `git branch --show-current` in the SAME guarded command as the commit; a
  session-start check is stale the moment a co-active session runs `git checkout`. Use
  `test "$(git branch --show-current)" = main && git commit -- <paths>`. (Memory
  `recheck-branch-immediately-before-every-commit-on-shared-worktree`; a P3proj commit
  landed on the wrong branch exactly this way.)
- **STOP-PATH-SCOPED-COMMIT** — NEVER `git add -A` / `git add .`. Commit scoped by EXACT
  path (`git commit -- <paths>`). A merge (whole index) needs a `[batch-ok:<reason>]`
  token IN THE COMMAND (the guard scans the command, not the message file).
- **STOP-VERIFY-CONTENTS-NOT-FILENAME** — never trust a hook/doc/agent by its NAME, or
  that it is "wired": read the body AND prove its event-wiring fires + does the work
  (wired no-op `sys.exit(0)` stubs, docs named for a need, unparseable agents all hide
  behind the name). Before renaming, grep for EVERY real reference (the plan named 2
  global hooks; grep found 4). Bean hard NEVER rule (memory
  `verify-contents-not-filename-or-wiring`).
- **STOP-PROVE-CAUSE-BEFORE-FIX** — no fix for an UNPROVEN cause, and no 2nd fix
  overlapping a working one (unfalsifiable). `"not A"` != "therefore B". Fact-check your
  OWN diagnostic output (value <-> key) before theorising. (`~/.claude/rules/prove-the-cause-before-fix.md`.)
- **STOP-ONE-PHASE-PER-SESSION** — the setup-simplification plan runs ONE phase per
  session. Stop at the phase's DONE-WHEN; do NOT drift into the next phase.
- **STOP-GLOBAL-MINI-SIGN-OFF** — before ANY `~/.claude/` edit, show Bean the exact diffs
  + get approval. Global tooling serves EVERY project — every patch must be additive
  (new behaviour opt-in, old behaviour intact), never a replace.
- **STOP-D101-NEVER-DROP-A-DEFENCE** — when collapsing/rewriting docs, count STOP entries
  before and after — new >= old, or record the justification. (This whole file is the
  D101 defence.)
- **STOP-FACT-CHECK-COUNCIL/REGISTER-FINDINGS** — a council/register finding is a
  HYPOTHESIS; fact-check every one vs live code/DOM before acting ("main ships the broken
  drawer" = FALSE; "180 tests pass" = suite-conflation; D339's "87 of 95" was 78). Memory
  `fact-check-council-register-findings-before-acting`, `retract-the-content-not-just-the-label`.
- **STOP-MEASUREMENT-VS-EYE** — automated measurement reporting parity does NOT override
  Bean's eye; extend the measurement set (full background family + filter + mixBlendMode +
  pseudo-elements + parent chain) or pixel-sample until you find the missing variable or
  confirm at the pixel level. Extended 2026-07-15: a probe can match a STYLESHEET rule
  instead of an element, grab a lookalike (disclosure != toggle), flag a logo image for
  text contrast, or read an unsettled transition value; Grep can render `/*` as `\*`.
  Verify the probe before the conclusion. (`~/.claude/rules/measurement-vs-eye.md`.)

---

## B. Domain STOPs — carried VERBATIM from next-session-prompt.md (2026-07-16, D338–D342)

- **STOP-SCROLLBAR-LOCK (D340)** — locking body scroll (`position:fixed`/`overflow:hidden`)
  makes the CLASSIC scrollbar vanish MID-ANIMATION → viewport widens ~15px → any
  edge-anchored fixed/absolute element's anchor JUMPS = a "bounce past the end position".
  Overlay-scrollbar emulation CANNOT reproduce it — test on a desktop browser. Fix idiom:
  pin the root scrollbar track while locked (`documentElement overflowY='scroll'`, gated on
  `innerWidth − clientWidth > 0`). Instances: adaptive-nav FIXED; sgs/modal PARKED.
- **STOP-67-GATE-ANOMALY (D339d)** — the pre-commit visual-diff gate printed "COMMIT
  BLOCKED" yet the commit was created (19:09, `4e049ba9`). `SGS_EXIT=1` + `exit $SGS_EXIT`
  should have blocked. UNEXPLAINED — investigate before trusting it as the only net; write
  reports BEFORE committing, don't rely on the gate to remind you.
- **STOP-GATE-COMMENT-STRIPPER (D339d)** — `check-dead-controls.js` strips comments
  naively: a PHP STRING containing a block-comment opener swallows the rest of the file and
  every attr below reads as dead (false positives) — and the same swallow would hide REAL
  findings (false negatives). Keep `/*`-like sequences out of PHP string literals in
  render.php, or fix the stripper.
- **STOP-HARDCODE-IS-OVERRIDE-NOT-LITERAL (D339, Bean-locked)** — a hardcode = a value
  that OVERRIDES a legitimate channel: (1) inline/`!important`, (2) a valid GLOBAL default
  (theme.json), (3) a meaningful UA default (`align-items`, `flex-wrap` — a draft that
  leaves them unset MEANS the UA value; a block default that fills them in diverges the
  clone). An overridable default fighting no channel is a DEFAULT — ship it. Test: "what
  else could set this, and does my value beat it?" (Memory `hardcode-is-override-not-literal`.)
- **STOP-CONTAINER-TIER-IS-NOT-VIEWPORT (D340)** — §S9 rows emit container-query tiers
  alongside media tiers (FR-S9-6). A row can collapse to mobile while the VIEWPORT is
  tablet-width (footer inner = 705px at 768 viewport = mobile tier, BY DESIGN). Measure the
  container before calling a tier boundary an off-by-one.
- **STOP-SILENT-ATTR-DISCARD (D338)** — WP discards undeclared attrs silently. Gate:
  `check-dead-pattern-attrs.py`. Never blanket-rename `textColor` (correct on core blocks).
- **STOP-VERIFY-EVERY-CLIENT (D338)** — a colour/contrast fix verified on ONE client is NOT
  verified. All 8 `sites/*/theme-snapshot.json` palettes. (D339 drawer: 8/8 measured.)
- **STOP-TOKEN-NAME-IS-NOT-A-LUMINANCE (D338)** — `primary-dark` is a PINK on
  mamas-munches. Resolve slug→hex, COMPUTE the fg (`helpers-colour-wcag.php`).
- **STOP-D328-SHAPE-NOT-JUST-VALUE (D338)** — specify the SHAPE (object vs flat; support vs
  attr) or WP coerces to default. Now structurally frozen (Spec 17 §S9 Guardrail). (Memory
  `object-typed-attr-coerces-flat-to-default`, `blockjson-enum-coerces-invalid-to-default`.)
- **STOP-GATE-BLIND-TO-DELETION (D338)** — delete attr + hardcode value ⇒ build stays
  green. Nothing catches render-without-control.
- **STOP-DIALOG-DISPLAY-GATE (D338)** — never put `display` on a `<dialog>` base rule; any
  author `display` beats the UA's `dialog:not([open]){display:none}`.
- **STOP-COUNCIL/REGISTER-FINDINGS-ARE-HYPOTHESES (D333)** — see STOP-FACT-CHECK above.
- **STOP-GATES-GREEN-IS-NOT-VERIFIED (D337)** — a green gate is necessary, not sufficient;
  verify the LIVE rendered output.
- **STOP-67** — write visual-diff reports BEFORE commit (repo-root `reports/visual-diff/`), not after.
- **STOP-21** — emit-green != LANDED; verify the live page carries the change.
- **STOP-16** — a subagent's "verified clean" is a HYPOTHESIS; re-verify anything
  load-bearing on the live page.
- **STOP-19** — roll back fast on regression; refine across a session boundary with the
  empirical baseline in the plan, don't iterate a failing sensitive fix inline.
- **STOP-44** — a role-seed that maps to a dead render path is a render no-op — don't seed it.
- **STOP-57** — (superseded pre-production) block version bumps / deprecations — see
  no-version-bumps rule below.
- **STOP-64** — a wrapper-class residual can't override an ID-scoped block rule; route the
  class-scoped rule so the residual wins.
- **STOP-66** — `/sgs-update` stage discipline: --stage 1 seeds, --stage 10 prunes.
- **STOP-68** — no inline grid across live SGS elements (grid/flex moved inline→scoped, D296).
- **STOP-NODE-NPM-VIA-POWERSHELL** — the nvm shim is broken in Git Bash; run Node/npm via PowerShell.
- **STOP-WINDOWS-BASH-STALE** — Bash ls/find/git-add can have a STALE view of a Write-tool
  file; verify + commit via PowerShell (memory `windows-bash-stale-view-of-write-tool-files`).
- **STOP-CACHE-URL-NEVER-CHANGES (D338)** — filemtime `?ver` on branches, NOT on `main`;
  Cloudflare holds 7 days incl. 0-byte files. Clear caches (incl. Hostinger CDN) before measuring.
- **STOP-TEST-DONT-GUESS (D337)** · **STOP-REUSE-THE-WORKING-BLOCK (D337)** ·
  **STOP-READ-THE-ENV-CONFIG (D337)** — palestine-lives = DEV, sandybrown = STAGING/canary.
- **STOP-REPLICATE-EXACTLY (D337)** · **STOP-CORE-BLOCK-WITH-SGS-REPLACEMENT (D337)** — DB
  `blocks.replaces` (column `slug`) is authoritative.
- **STOP-INNERBLOCKS-ARE-NOT-ALWAYS-THE-MENU (D337)** · **STOP-DEPLOY-CANARY-FIRST (D337)**.
- **STOP-HIDDEN-PARALLEL-SYSTEM (D330)** — before building on a "dormant" mechanism, grep
  the whole codebase (plugin+theme) for a SECOND system doing the same job; a default-off
  system is one admin click from active. Prove dormant by its live trigger, not assumption.
  (Memory `grep-for-hidden-parallel-system-before-building`.)
- **STOP-PARALLEL-TRACK-SWEEP (D326)** — pre-existing dirt (`phase4-*.txt`, root `.db`,
  `rr.json`, `iapi.html`) is NOT yours; package-lock CRLF churn = restore, never commit.
- **STOP-NO-ALLOWLIST (D335)** — route by DB-owned `role`, never a hardcoded
  `css_property in (a,b,c)` allowlist (memory `route-by-role-not-hardcoded-property-list`).
- **STOP-ONE-SOURCE-BUSINESS-INFO (D335)** — all business info optional, one source (Site
  Info), never hardcoded.
- **STOP-VERIFY-COLOUR (D318)** — verify colour on the LIVE rendered node (an early
  merge-from-partial stripped 136 baseline keys; `presets.py` dropped alpha → opaque black).
- **STOP-NO-KSORT (D327)** — write-time uid stability via a canonicalisation oracle, not ksort.
- **STOP-SHARED-CHECKOUT-HAZARD** — a shared checkout shares `git HEAD`; a co-active
  branch switch silently reverts your working-tree edits. Take your own `git worktree`;
  verify `git show <sha>:<path>`, never the working tree, before believing a file committed.

### Standing architectural STOPs (always-on, not D-numbered)
- **Composite-mirror (R-31-9 / D294)** — no per-block CSS hack that diverges from the
  shared wrapper's computed behaviour; content-KIND box+width composites go block-private,
  section/layout composites keep `SGS_Container_Wrapper`.
- **No inline `style=""`** on SGS blocks (Spec 32) — native supports serialise via
  `__experimentalSkipSerialization` → scoped `#uid` CSS.
- **No block version bumps / deprecations pre-production (D270/D293 — overrides STOP-57)** —
  old-shape posts are re-cloned, not deprecation-migrated. The theme `style.css` Version IS
  required and is NOT a block version. (Memory `no-version-bumps-or-deprecations-preproduction`.)
- **Fix a11y/fidelity at the DRAFT source, not the clone** (memory
  `fix-a11y-at-draft-source-not-the-clone`) — draft-inherited issue → edit the mockup +
  re-clone; genuine clone divergence → fix the converter (R-31-9).
- **Verify converter fixes on the REAL draft + the LIVE code path** (memory
  `verify-converter-fix-on-live-path-not-synthetic`) — synthetic unit-green != real-draft-correct.

---

## C. Pre-flight self-attestation ritual (answer inline before first Write/Edit)

Carried from next-session-prompt.md. General form for any cloning-pipeline session:

1. Read the governing spec (Spec 31, the named section) IN FULL + the recent decisions +
   this session's LEDGER before starting?
2. Did the prior in-session work actually LAND? (Read the LEDGER's live status — the step
   list shifts.)
3. Am I about to assert a cause I have NOT tested? (STOP-PROVE-CAUSE-BEFORE-FIX.)
4. Verifying colour/contrast on ALL 8 client palettes, not one? (STOP-VERIFY-EVERY-CLIENT.)
5. Passing the declared SHAPE (object vs flat; support vs attr)? Shape freeze respected
   (new sibling attr, never a reshape)? (STOP-D328.)
6. Does an SGS block/helper already do this? Did I grep? Did a parallel track already do it?
   (STOP-HIDDEN-PARALLEL-SYSTEM.)
7. Am I building ahead of reconciling with what already shipped? (rework trap.)
8. Canary before dev-site? Full cache clear incl. Hostinger CDN before measuring? Desktop
   browser (classic scrollbars) for any animation/geometry check? (STOP-SCROLLBAR-LOCK.)
9. D-ceiling (`grep -oE 'D[0-9]{1,4}' .claude/decisions.md | sort -V | tail -1` — bound the
   digits) + branch (`git branch --show-current`) verified in the SAME command as the commit?
10. Am I touching another track's files/branches without checking their state first?

For a doc-model / enforcement-hook session (like P4), swap 4/5/8 for: does every new gate
pass the **Enforcement Contract** (auto-fires on an event, fails safe, acts on NEW state,
reads machine evidence not narration, fails legibly, has a `--self-test`) and did I FIRE it
for real before claiming done?

---

## D. D101 count-check receipt

- **Baseline (2026-07-17):** 38 unique `STOP-*` tokens across the collapsed
  next-session-prompt.md (30) + state.md (9) + handoff.md (3), de-duplicated to 38.
- **This catalogue:** carries all 38 forward VERBATIM (fragment tokens un-truncated:
  `STOP-INNERBLOCKS-ARE-NOT-ALWAYS-THE-MENU`, `STOP-ONE-SOURCE-BUSINESS-INFO`) PLUS 10
  process STOPs (§A) + standing architectural STOPs (§B tail). New count > old. PASS.
- Every future `/handoff` re-runs this check: new unique-STOP count >= previous, or record
  the justification inline. Bare deletion = regression.
