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

- **STOP-A-FILTER-GATE-ON-THE-WRONG-ATTR-FIRES-NEVER-AND-SILENTLY** — NEW 2026-07-22 (D359). A
  `pre_render_block` (or any block) filter that gates on `attrs.X === 'value'` fires ONLY when the
  block markup literally carries `X`. WP may resolve that property from registration metadata, but
  the resolved value is NOT in the parsed `$block['attrs']` the filter sees. The SGS theme references
  the header/footer part as `{"slug":"header","tagName":"header"}` with **no `area` attr**, so
  `Sgs_Header_Rules::filter_template_part`'s `attrs.area === 'header'` gate never matched — the whole
  conditional-header + CPT-binding mechanism had **never once fired on this theme**, silently. It was
  invisible to every code-read and to a 16-check mutation harness because the defect lives in the
  theme-markup↔filter-gate INTEGRATION, not the branch logic — **only a live render (R-31-11) caught
  it**, via the tell that the behaviour resolver (reads the CPT directly) saw sticky while the render
  path did not. Fix: match by `area` OR `slug`. General rule: before trusting a block-attr gate,
  confirm the live markup actually carries that attr; and a mechanism that "should intercept X" must
  be proven to fire on a real page, not assumed from the code.

- **STOP-SET-ACTIVE-LAYOUT-IN-THE-WEB-CONTEXT-NOT-RAW-WP-CLI-OPTION** — NEW 2026-07-22 (D360). The
  active header/footer pointer (`sgs_active_header_cpt_id` / `sgs_active_footer_cpt_id`) MUST be
  written in the SAME PHP context the frontend reads it from — the "Set as active" admin action
  (`admin-post.php?action=sgs_set_active_layout`) or a request against the live domain — NEVER a raw
  `wp option update` from an arbitrary WP-CLI `--path`. On the shared Hostinger canary, WP-CLI can
  read/write a DIFFERENT option store (install path / table-prefix) than the live domain serves: a
  probe proved `wp option get` returned `1570` while the frontend `get_option` returned `0` on the
  same page load, with **no object cache** to explain it. The symptom presented as "the CPT-render
  binding is broken" and pointed straight at freshly-shipped code — it nearly triggered a fix to
  `Sgs_Active_Layout` / `filter_template_part`, both of which were CORRECT (proven: setting active via
  the admin action rendered both markers exactly once, wrapper replaced). **General rule:** when a live
  read contradicts a CLI read with no persistent object cache, suspect a **store/prefix/webroot
  mismatch before the code** (`prove-the-cause-before-fix`); and to verify any option-driven feature,
  set the option through the same context the feature reads it, not a CLI shortcut. Sibling of
  STOP-A-FILTER-GATE-ON-THE-WRONG-ATTR (both: a mechanism that "should work" must be proven on a real
  request, R-31-11) and STOP-VERIFY-DEPLOY-BY-CHECKSUM.

- **STOP-INSPECT-THE-TARGET-BEFORE-DELETING-ON-A-LIVE-SITE** — NEW 2026-07-22 (D362). Before deleting
  ANY post / page / template-part / option on a live site, OPEN IT and confirm what it actually is —
  even when a parking entry, a handoff, an audit finding, or **Bean himself** describes it as scrap.
  A description is a hypothesis about the world; the object is the ground truth. Proven three times in
  one session: canary draft 1320 was flagged as a blocking `sgs/mega-menu` reference but held only
  `patternName` metadata text (a FALSE positive — safe to delete for a different reason); prod
  `wp_navigation` post 100 WAS a real orphan (safe); and posts 67/68, described as "canary pages that
  should be scrapped", turned out to be the **live Indus "Retail" and "Wholesale" sector pages** — a
  delete-as-instructed would have destroyed real client content on a production site. The inspect step
  cost one `wp post get` per object and prevented that. **Rule: a delete instruction is authorisation to
  ACT, never authorisation to SKIP VERIFICATION.** If the object does not match its description, STOP and
  report rather than proceeding. Sibling of STOP-VERIFY-A-DEFERRAL-BEFORE-EXECUTING-IT (generalised: an
  inherited *description* is a hypothesis) and STOP-CONFIRM-WHAT-YOUR-OUTPUT-DESCRIBES.

- **STOP-A-DISPATCHED-AGENT-MUST-EXECUTE-NOT-DELEGATE** — NEW 2026-07-22 (D362). A `wp-sgs-developer` (or
  any implementer) subagent dispatched to DO work will sometimes spawn its OWN sub-agents instead of
  executing — burning a full cycle, producing nested/duplicate agents that then need stopping, and
  returning a plan instead of a result. Happened twice in one session. **Fix that works: put an explicit
  line in every implementer dispatch — "EXECUTE YOURSELF with your OWN tools (Bash/SSH/Playwright). Do
  NOT use the Agent/Task tool to delegate — you are the implementer. Report actual command outputs."**
  Also: an agent's "done" is a CLAIM — verify it against the real repo / live state before believing it
  (held all session and caught real gaps). Pairs with STOP-VERIFY-DEPLOY-BY-CHECKSUM.

- **STOP-VERIFY-DEPLOY-BY-CHECKSUM** — NEW 2026-07-20 (D351). `build-deploy.py` printing
  `[DONE]` + `[verify] HTTP 200, markers present` does NOT mean your change shipped: the
  verify asserts only that *a* page renders with generic `wp-block-sgs`/`sgs-` markers, which
  pass on ANY working SGS page **including one running last week's code**. A deploy reported
  success, was measured correct, and was then silently reverted by a co-active session's
  deploy — a false `verdict: PASS` reached Bean. **After every deploy, `md5sum` the changed
  file local vs server BEFORE measuring anything**, and re-check it before quoting a live
  result later in the session. A liveness check that would still pass if the feature were
  entirely absent is worse than no check. (Parking `P-DEPLOY-VERIFY-NOT-CHANGE-SPECIFIC` +
  `P-CANARY-SHARED-DEPLOY-RACE`.)
- **STOP-READ-DRAFT-BEFORE-DESIGNING-A-CLONE-FIX** — NEW 2026-07-20 (D351). When a clone
  diverges from its draft, READ THE DRAFT'S CSS FIRST and ask *"can the block express this
  value at all?"* (grep its `block.json` attrs). The default cause is a MISSING ATTRIBUTE —
  the converter had nowhere to put the draft's value and dropped it **silently** (the D338
  class: no error, no gate, no failing build) — not a policy gap needing a new rule. An a11y
  defect on a clone whose draft is ACCESSIBLE is a FIDELITY defect: measure the draft's own
  pairing before designing a contrast fallback. Bean caught exactly this (`sgs/nav-menu` had
  no `featuredBg`; the draft's pill measured 5.28:1 and one attribute fixed both).
- **STOP-HARNESS-CANNOT-SEE-A-CLASSIC-SCROLLBAR** — NEW 2026-07-20. Headless Chromium uses
  OVERLAY scrollbars: `window.innerWidth - documentElement.clientWidth === 0`. Any test whose
  condition depends on a classic scrollbar existing (D340 scroll-lock bounce, scrollbar-gutter
  compensation, layout-shift-on-lock) **cannot fire in-harness, and a 0px delta proves
  NOTHING**. Report such a check as INCONCLUSIVE and route it to Bean on a real windowed
  desktop browser. Never bank it as a pass. (Encoded in `nav-qa/README.md`.)
- **STOP-NEGATIVE-CONTROL-OR-THE-TEST-IS-VACUOUS** — NEW 2026-07-20 (D352). Before banking ANY
  acceptance PASS, ask: **"would this still pass if the feature were entirely absent?"** If yes,
  it proves nothing. Happened this session: FR-36-1's classic-menu render was "proven" by asserting
  5 menu labels on a page — but the page's HEADER renders those same 5 labels from the BLOCK menu,
  so the check would have passed identically with the resolver deleted. It was caught and redone
  with a marker item existing ONLY in the classic menu, plus a **negative control** (marker must be
  ABSENT on the homepage) and a countable delta (28→29 anchors). **Rule: an acceptance test needs a
  signal unique to the thing under test, and wherever possible a negative control that FAILS.** This
  is the same family as STOP-VERIFY-DEPLOY-BY-CHECKSUM (a liveness check that passes on any working
  page) — generalised: *a check that cannot fail when the feature is missing is worse than no check,
  because it manufactures false confidence and gets quoted to Bean as proof.*
- **STOP-VERIFY-A-DEFERRAL-BEFORE-EXECUTING-IT** — NEW 2026-07-20 (D352). A task inherited from a
  handoff / next-session-prompt / parking entry is a **hypothesis about the world at the time it was
  written**, not a standing instruction. Check its premise still holds BEFORE doing it. Happened this
  session: the prompt said to "retire the adaptive-nav / mega-menu / mobile-nav DB rows via
  `/sgs-update`". Checked instead of executed: `mobile-nav` was ALREADY gone from `src/` and the DB
  (no-op); `adaptive-nav` MUST stay registered as the FR-36-18 rollback path; `mega-menu` is Phase-2
  scope, not superseded work. **Executing it as written would have deleted the rollback path.** The
  deferral was struck with its reasoning rather than carried forward. Same family as
  STOP-FACT-CHECK-COUNCIL/REGISTER-FINDINGS — a finding is a hypothesis — extended to *your own
  project's queued work*, which feels authoritative precisely because it came from inside.
- **STOP-A-SPEC-DESCRIBING-A-SUPERSEDED-MODEL-ACTIVELY-MISDIRECTS-THE-BUILD** — NEW 2026-07-21
  (D358). Spec 17 carried THREE competing answers to "where is a header edited?" — Site Editor,
  WP Customiser (never built), and the CPT screen P2 actually decided on. The CODE implemented
  the first; the DECISION was the third. A task earlier that same day was built and
  live-verified against the superseded model **purely because the governing spec still described
  it**. A stale spec is not neutral documentation debt — for a non-coder owner the spec IS the
  system, so it steers the build wrong with full authority. **When a decision changes the model,
  the governing spec is amended in the SAME work, or the next session builds the old one.**
  Corollary: a doc that has to label its own content "RETRACTED FICTION" (Spec 17 did, naming
  four classes asserted as shipped that never existed) has earned deletion, not a caveat.
- **STOP-EVERY-COUNCIL-NEEDS-A-CODE-GROUNDED-SEAT** — NEW 2026-07-21 (D358), promoting P2's own
  rule to a STOP because it was proved again the day it was written. A 6-persona adversarial
  council reviewed Spec 37. **Five prose reviewers missed that FR-37-3's central instruction
  cited a filter with ZERO subscribers** (`sgs_header_rule_resolved` — two hits in the tree: the
  `apply_filters` and a comment claiming it matters). Only the seat whose entire job was
  verifying claims against live source caught it, and traced the REAL breakage one file over
  (`Sgs_Header_Behaviours` hooks `body_class`, resolves via `get_header_content()`, which reads
  the file the spec's own FR-37-6 empties). Built as written it would have shipped a header that
  renders and is then **silently not sticky**. The same seat caught FR-37-16 ordering a reversal
  of council-gated STOP-NO-KSORT. **A council without a source-grounded reviewer converges on
  rhetoric and rubber-stamps code-level claims** — including fiction the author just wrote.
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
- **STOP-WP-STYLE-SUBSTRING-COLLISION (D343)** — a CSS custom-property NAME emitted inline
  must NOT contain the substrings `border-width` / `border-color` / `border-top-color` etc.
  WP core ships `html :where([style*="border-width"]){border-style:solid}` (and siblings) —
  an attribute-SUBSTRING selector that matches ANY element whose `style` contains that text,
  including your `--sgs-tile-border-width` var, and paints a phantom `3px currentColor`
  border. British `--*-colour` dodges the `border-color` rule; `width` is spelled the same,
  so name width vars `--*-thickness`. Found it via a stylesheet-disable bisect (or use
  `extract-css-diff.js --why`). (D343 brand-strip 3px black frame.)
- **STOP-VERIFY-EVERY-CLIENT (D338)** — a colour/contrast fix verified on ONE client is NOT
  verified. All 8 `sites/*/theme-snapshot.json` palettes. (D339 drawer: 8/8 measured.)
- **STOP-TOKEN-NAME-IS-NOT-A-LUMINANCE (D338)** — `primary-dark` is a PINK on
  mamas-munches. Resolve slug→hex, COMPUTE the fg (`helpers-colour-wcag.php`).
- **STOP-D328-SHAPE-NOT-JUST-VALUE (D338)** — specify the SHAPE (object vs flat; support vs
  attr) or WP coerces to default. Now structurally frozen (Spec 37 Guardrail). (Memory
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

- **STOP-DIALOG-CLOSE-KILLS-THE-EXIT-ANIMATION** — NEW 2026-07-20. `dialog.close()` removes
  `[open]`, which makes a `<dialog>` `display:none` **in the same tick** — so an exit class
  added immediately before `close()` never paints a single frame and its keyframes are
  unreachable. (This shipped: the drawer's exit animation had never once run, for either the
  original vertical keyframes or the new directional ones — Bean spotted it as "it just
  goes".) Animate FIRST, `close()` on `animationend` (target-checked — `animationend` bubbles
  from children), with a fail-safe timeout reading the REAL computed `animationDuration`; a
  stuck-open dialog is far worse than a missing animation. Also: **native ESC on a modal
  `<dialog>` bypasses your close handler entirely** — intercept `cancel` or ESC will behave
  differently from every other close route.

- **STOP-VERIFY-COMMIT-LANDED-ON-SHARED-CHECKOUT** — NEW 2026-07-22 (Track-1, earned Fronts
  1/2). On a shared checkout with a co-active session, the hash a `git commit` REPORTS can be
  the OTHER session's racing commit. Verify via `git log -1` (your message at HEAD) + `git
  status` (files clean), NEVER the reported hash. (Recovered a nearly-lost Front 2 whose
  "reported" hash was Track 2's ledger commit.) Extends STOP-SHARED-CHECKOUT-HAZARD.
- **STOP-VISUAL-DIFF-GATE-NO-VERIFY-FOR-LOGIC** — NEW 2026-07-22 (Track-1). The SGS pre-commit
  visual-diff gate blocks any touch of a block's render.php/block.json/edit.js without a passing
  visual-diff report; its OWN message sanctions `--no-verify` for non-visual (logic/attr/meta)
  changes — use that, never fabricate a PASS report.
- **STOP-RESIDUE-DECLARED-IRREDUCIBLE-USUALLY-ISNT** — NEW 2026-07-22 (Track-1). A subagent
  (or you) declaring a leftover "irreducible / can't be lowered further" is a hypothesis — re-derive
  it from the tool/DB before banking it; the residue usually has a real cause.
- **STOP-VERIFY-THE-DELIVERABLE-EXISTS** — NEW 2026-07-22 (Track-1). Before accepting a
  "done" claim, confirm the named deliverable (file/function/attr/row) actually EXISTS — open it,
  don't trust the name or the wiring claim.
- **STOP-PRE-EXISTING-CLAIM-CHECK-SESSION-START** — NEW 2026-07-22 (Track-1). When a subagent
  says a finding is "pre-existing" (not caused by this session), verify against the session-start
  baseline — a Front-2 subagent claimed 5 variant findings pre-existing and was wrong (this
  session's data caused them).
- **STOP-CHECK-BOTH-HOOK-LAYERS-BEFORE-COMMIT** — NEW 2026-07-22 (Track-1). A commit can be
  gated by more than one hook layer (path-scope gate + secret-scan + visual-diff); check ALL of
  them before assuming a bare `git commit` will land, and read each gate's own bypass guidance.

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
- **2026-07-20 (Spec 36 Wave 4 / D351) re-run:** previous unique `STOP-*` tokens = **51**;
  this session ADDED 4 (`STOP-VERIFY-DEPLOY-BY-CHECKSUM`,
  `STOP-READ-DRAFT-BEFORE-DESIGNING-A-CLONE-FIX`,
  `STOP-HARNESS-CANNOT-SEE-A-CLASSIC-SCROLLBAR`,
  `STOP-DIALOG-CLOSE-KILLS-THE-EXIT-ANIMATION`) and SUBTRACTED none → **55**. 55 >= 51. PASS.
  All four are earned: each records a failure that actually occurred this session (a false
  `verdict: PASS` from a reverted deploy; a contrast policy designed before reading the draft;
  an in-harness scrollbar test that could never fire; a never-once-run exit animation).
- **2026-07-20 (Spec 36 Phase-1 close / D352) re-run:** previous unique `STOP-*` tokens = **55**;
  this session ADDED 2 (`STOP-NEGATIVE-CONTROL-OR-THE-TEST-IS-VACUOUS`,
  `STOP-VERIFY-A-DEFERRAL-BEFORE-EXECUTING-IT`) and SUBTRACTED none → **57**. 57 >= 55. PASS.
  Both are earned: a vacuous acceptance test that would have passed with the feature absent was
  caught mid-session and redone with a negative control; and an inherited deferral, executed as
  written, would have deleted the FR-36-18 rollback path.
- **2026-07-21 (Spec 37 / Spec 17 deletion / D358) re-run:** previous unique `STOP-*` tokens = **57**;
  this session ADDED 2 (`STOP-A-SPEC-DESCRIBING-A-SUPERSEDED-MODEL-ACTIVELY-MISDIRECTS-THE-BUILD`,
  `STOP-EVERY-COUNCIL-NEEDS-A-CODE-GROUNDED-SEAT`) and SUBTRACTED none → **59**. 59 >= 57. PASS.
  Both are earned: a spec describing an abandoned model caused a task to be built against the wrong
  one that same day, and five of six council reviewers rubber-stamped a citation to a filter that
  nothing hooks.
- **2026-07-22 (Spec 37 6-FR core canary-verified / D359) re-run:** previous unique `STOP-*` = **59**;
  ADDED 1 (`STOP-A-FILTER-GATE-ON-THE-WRONG-ATTR-FIRES-NEVER-AND-SILENTLY`), SUBTRACTED none → **60**.
  60 >= 59. PASS. Earned: a header binding gated on `attrs.area` never fired on this theme (markup uses
  `slug`), invisible to code-reads + a mutation harness, caught only by a live render.
- **2026-07-22 (Spec 37 de-client + FR-37-3 store-mismatch / D360) re-run:** previous unique `STOP-*`
  = **60**; ADDED 1 (`STOP-SET-ACTIVE-LAYOUT-IN-THE-WEB-CONTEXT-NOT-RAW-WP-CLI-OPTION`), SUBTRACTED
  none → **61**. 61 >= 60. PASS. Earned: a raw `wp option update` on the shared canary wrote the active
  header/footer pointer to a different store than the live domain reads, presenting as a broken CPT
  binding and nearly triggering a fix to correct code — the disciplined probe proved the code fine.
- **2026-07-22 (FR-36-18 cutover + FR-37-21 retirement / D361-D362) re-run:** previous unique `STOP-*`
  = **61**; ADDED 2 (`STOP-INSPECT-THE-TARGET-BEFORE-DELETING-ON-A-LIVE-SITE`,
  `STOP-A-DISPATCHED-AGENT-MUST-EXECUTE-NOT-DELEGATE`), SUBTRACTED none → **63**. 63 >= 61. PASS.
  Both earned: posts described as "scrap canary pages" were the LIVE Indus Retail/Wholesale sector
  pages — inspecting before deleting prevented destroying real client content on production; and two
  dispatched implementer agents delegated instead of executing, burning a cycle and spawning nested
  agents that needed stopping.
- **2026-07-22 (Track-1 converter reconciliation) re-run:** previous unique `STOP-*` = **61**;
  Track 1 carried in **6** earned-but-unlanded tokens from its Fronts-1/2 session
  (`STOP-VERIFY-COMMIT-LANDED-ON-SHARED-CHECKOUT`, `STOP-VISUAL-DIFF-GATE-NO-VERIFY-FOR-LOGIC`,
  `STOP-RESIDUE-DECLARED-IRREDUCIBLE-USUALLY-ISNT`, `STOP-VERIFY-THE-DELIVERABLE-EXISTS`,
  `STOP-PRE-EXISTING-CLAIM-CHECK-SESSION-START`, `STOP-CHECK-BOTH-HOOK-LAYERS-BEFORE-COMMIT`),
  SUBTRACTED none → **67**. 67 >= 61. PASS. All 6 earned in the prior Track-1 converter session
  (Fronts 1/2) and landed in the shared catalogue now as the deferred cross-track reconciliation.
