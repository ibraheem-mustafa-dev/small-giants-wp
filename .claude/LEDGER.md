---
doc_type: state
project: small-giants-wp
last_updated: 2026-09-04 (session 9)
note: "THE single living-status doc. REPLACED each session, never appended. History → memory/session-YYYY-MM-DD*.md (ledger-rotate.py Stop hook snapshots automatically past the cap but NEVER edits this file). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep < 24576 bytes."
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary

Plain English, for Bean. The framework is a WordPress block system that clones any design draft
into native blocks a non-technical client can then edit. Multiple sessions share one `main`
concurrently, every session — treat this as the norm, not the exception.

**Session 8 (this one):** picked up a stale, 11-day-old "road-to-uniform" dispatch prompt
claiming 222+ open findings. Two-thirds of that was already closed by other sessions before
this one started — verified against live commands, not trusted from the doc. Real remaining
work: fixed a genuine blind spot in the tier-migration detector (3 blocks were silently
unmigrated because their base attribute used a non-standard name), migrated all 3, deployed
and live-verified each on the real canary. Then scoped three more small items (C4/C5/C10) via
parallel isolated-worktree agents — all three came back "don't build this blind," each with
solid evidence, which is itself the correct outcome (no forced/hollow work shipped).
**CORRECTED same session — Bean caught an undercount: 12 real items remain, not 2** (Bean's own
2026-08-27 decisions settled the DESIGN of six of them, C14-C19, but none was ever built). Full
list in the plan doc, not repeated here. A parallel session ran a
large text-gradient colour rollout throughout this session too (not this session's work — see
its own decisions.md entries). Canary: sandybrown-nightingale-600381.hostingersite.com; no
live client sites yet. **Everything reported fixed this session was deployed to the canary and
live-verified — nothing closed on a build check alone.**

**Session 9 (this one, colour track only — the road-to-uniform paragraph above is a prior
session's, unrelated):** was dispatched against a stale R2-R6 prompt for a DIFFERENT, older
colour-conformance plan; verified against live tool re-runs it was superseded by the
`2026-09-03-golden-colour-staged-rollout.md` plan (already being advanced by concurrent
sessions the same day) and switched to that instead. Closed 6 rows by hand (shared-helper
text-gradient support + nav-menu/pricing-table wiring), then ran a 5-persona `/qc-council`
audit of every remaining refusal reason against `fix.js`'s own source — found the TOOL, not
the render code, was the real blocker for a large slice of the backlog, including one
detector claim this plan itself had carried as open ("rule 31 miscounts hover-named
attributes") that turned out to be FALSE on inspection. Fixed 3 real bugs in `fix.js`
(commit `0727f440b`, self-test-covered), which mechanically closed 10 more rows in one
`--fix --apply` run, then dispatched 3 parallel subagents for 9 further well-evidenced
trivial rows (product-card ×4, process-steps+google-reviews ×4, nav-menu.itemBg — post-grid
correctly self-refused, a genuine hover-only design with no gradient path). `survey.js`
CONFORMANT: 85 → 101 across the session. **Not live-verified** — see COLOUR TRACK below.

**Session 7 (prior):** closed the hover-guard's 24 findings to zero and built the WCAG contrast
guard — see COLOUR TRACK below for detail (kept, not rewritten).

## State Snapshot

- **Branch:** `main`. 2-4 other sessions were committing concurrently throughout session 8 (a
  colour-gradient rollout, D948 Phase 3 work) — this is the project's stated norm, not an
  exception. Path-scope every commit; re-check `git status`/branch immediately before each
  commit and deploy; never `git stash`/`git checkout --` a shared file (D948).
- **Canary:** WP 7.1. Deploy via `build-deploy.py --target sandybrown --blocks-only --payload
  <path>` — scope `--payload` to what you actually changed on a shared tree.
- **Build:** green — `npm run build` 88/88 fast-tier gates; `gate:full` also green as of this
  session's last deploy.
- **Live fronts:** `31-golden-colour-control` (**241** open, re-verified this session — was 253
  at D754; actively worked by a parallel session, not this one) remains the largest untouched
  backlog. Hover-guard's 11 pre-existing UNRESOLVED cross-file cases (optional, from session 7).
- **Session 8 commits (all on `main`):** `9f6f6ceb3`, `0e3ef60e0` (tier-migration + hero
  dead-code), `8d5b2807f`, `1f4cd80dc` (plan reconciliation), `b9609f019` (C5 doc fix +
  scoping report), `ed413997a` (C4/C5/C10 outcomes).
- **Session 9 commits (colour track, all on `main`):** `16a7a7e0d` (shared-helper text-gradient
  triad), `10e08548a` (nav-menu/pricing-table), `0727f440b` (fix.js's 3 bugs + 10 rows),
  `61c533b5b` (product-card), `f296aec10` (process-steps/google-reviews), `3de7bb370`
  (nav-menu.itemBg), `fba2b1390` (plan doc + prompt swap). None deployed or live-verified yet
  — see COLOUR TRACK.
- **Per-track detail:** each `## ▶ … TRACK` section below owns its own status. Read only yours.
  Closed-track narrative lives in `memory/session-2026-09-04-tracks-history-sweep.md`, not here.

# ▶ NEXT SESSION STARTS HERE

**Invoke `/autopilot` first.**

**road-to-uniform: ALL 9 items CLOSED same day (a later session than the one that found them).**
C7, C6, C19 item 3, C15-5, C14/C4 (built, advisory), D4 (8 rules promoted to gate), B4
(unblocked — the "Track 2 inactive" reasoning was a mix-up between paused mega-menu VISUAL
design and this purely mechanical border-control question, corrected after Bean asked "why
can't we just do B4 anyway"), C16 (found already done, 93/93), C12/C13 (a11y + panel-order
live pass, done via a second independent Chrome instance after the shared Playwright browser
stayed locked). Commits: `47fd0079c` `497261de0` `7d0954776` `7b8254ec6` `20bcb52b8`
`b0670ac4a` `c8b2fa084` `539c11eeb`. Full detail + a 5-persona `/qc-council` audit (re-verified
every claim independently, live, not from this doc): `.claude/plans/2026-08-25-road-to-uniform-then-spec-39.md`.

**The qc-council audit also found 2 real, separate residual gaps — NOT part of the road-to-uniform
9, don't re-close them as if they were:**
1. **Spec 32 §5 CSS-injection sanitisation still has NO GATE.** A prior session's "B1 CLOSED"
   claim in the plan doc was a category error — it cited `audit-inline-styling.js` (FR-32-1,
   a different requirement) as evidence for a gate that doesn't exist. Free-text keyword attrs
   (`borderStyle`/`textTransform`) need `[^a-zA-Z-]` filtering before CSS concatenation; no
   script checks this framework-wide. 9 `render.php` files were named unaudited in the
   original B1 scope and remain so.
2. **`text/edit.js`'s "Font" `ToolsPanelItem` (from the C6 migration) has a no-op individual
   reset** — `hasValue={() => true}` + `onDeselect={() => {}}`. Small, contained, one block.

**Structural fix proposed, not yet built:** a `verify-plan-claims.py` script (inline
`<!-- verify: <command> -->` stamps on doc claims, checked before any "correction" commit) —
see D960. Worth 30-60 min if this class of error recurs a third time — it just did (see gap 1
above), on a DIFFERENT claim than the one D960 caught.

C1/D3 (`31-golden-colour-control`) is tracked separately — has its own active plan and a
parallel session working it. Don't duplicate.

⚠ **`git stash@{0}` (26 files, base `7a2c68b05`, "session 6 handoff") is STILL UNRESOLVED —
re-confirmed intact 2026-09-04 session 10, now 12+ hours old.** Flagged at session-9 AND
session-10's own SessionStart hooks; neither session's scope covered reconciling it, and it
survived a session-10 subagent's own diagnostic `git stash`/`pop` cycle (which hit a real,
separate index-write conflict but did NOT drop the entry — verified independently, not just
taken on the subagent's word). Contains real uncommitted work across `hero`/`button`/
`before-after`/`brand-strip`/`buybox`/`cta-section`/`heading`/`icon-list`/`icon`/`info-box`/
`mega-panel`/`nav-drawer`/`quote`/`site-footer(-row)`/`site-header(-row)`/`testimonial(-slider)`/
`trust-bar`/`GradientCapableColourControl.js`/the generative-background shader files/`utils/index.js`/
`parking.md`. **Whoever owns "session 6" should reconcile this** (`git stash show -p stash@{0} >
backup.patch` first, then apply file-by-file, checking each against what's since landed on
`main` — several of these blocks have been touched by OTHER sessions since). Do NOT
`git stash drop`/`clear` until reconciled — it is the only copy of that work.

⚠ **Concurrent occupancy on `main` is the norm, not the exception** — path-scope every commit,
re-check `git status`/branch and the decisions.md D-ceiling immediately before each write, and
message the other active session (check `ListAgents`) rather than guessing or forcing
`--allow-dirty`/`git stash` when a dirty-tree gate blocks you. See the new STOP entry
(`STOP-A-PEERS-CLAIM-ABOUT-WHO-CAUSED-A-CHANGE-IS-NOT-VERIFIED-BY-DEFAULT`) before trusting a
peer's account of who owns an uncommitted change — verify with `git diff` yourself.

## ▶ ROAD-TO-UNIFORM RECONCILIATION — FULLY CLOSED, all 9 items, qc-council-audited. Detail: D957-D960.

**Section A (tier-migration blind spot, D777's residual) — CLOSED.** `migrate-tier-object.py`'s
detector couldn't see an attribute whose base declares as `<prop>Desktop` instead of bare
`<prop>` — 3 families (`brand-strip.columns`, `hero.textAlign`, `whatsapp-cta.showOn`) were
silently unmigrated. Detector widened, all 3 migrated end-to-end and live-verified on the real
canary (a temporary probe page + Playwright computed-style read for brand-strip;
`wp_update_post()` + Playwright + byte-identical restore for hero — not build-checked only).
Also removed a genuinely dead code block in `hero/render.php`.

**Spec 32 B2/B3/B5, Spec 35 C2/C3/C8/C9/C11 — CLOSED, each confirmed via its own live gate
re-run**, not trusted from the stale plan. ⚠ **B1 (CSS-injection sanitisation gate) is NOT
closed** — a prior "CLOSED" mark here cited the wrong evidence (FR-32-1, not the §5 NFR); see
the residual-gaps note above. B4 (`mega-panel.borderRadius` → `SgsBorderControl`, radius kept
scalar) is now CLOSED too — the "Track 2 inactive" block was a mix-up (paused mega-menu visual
design vs this mechanical control-shape question), corrected and shipped.

**C4/C5/C10 — all three DESCOPED with evidence, none built blind.** C4 (CO-2 gate) needs an AST
walk + a judgement call on ~35% ambiguous attributes — its own planned build. C5
(bespoke-vs-native-supports panel) isn't buildable as a general rule without reproducing a
documented ~600-false-positive failure from this exact codebase; found and fixed a real doc
contradiction (CO-15 vs Part L) along the way. C10 (brand-strip picker swap) is an
architectural mismatch, not a like-for-like swap.

**All 9 remaining items closed same day, see NEXT SESSION START above for the full list +
commits + the 2 separate residual gaps a `/qc-council` audit found afterward.** History: first
summary said 2 (C6/C7 only — an undercount); the "fix" for that (D958) itself re-asserted 3
stale claims (C18/C15-1/C15-2/C15-3) without re-checking them against code that had shipped
8-9 days earlier; a full parallel re-verification (D960) corrected both errors and found 2 of
the remaining items (C16, C19) smaller than described. Every closure (including B4, unblocked
after being wrongly logged as blocked across 3+ write-ups) was independently re-verified by a
5-persona qc-council — see NEXT SESSION START above.

## ▶ UNIFORMITY SWEEP TRACK — CLOSED bar one detector. Detail: D918/D919/D922/D924/D930/D933.

`01-tab-group` and `21-render-without-control` both closed to zero, session 4 (D933). Nothing
else open in this track — see COLOUR TRACK for `31-golden-colour-control`.

## ▶ COLOUR TRACK — session 10: fix.js hardened + first real --apply, live-verified. Detail: this section + `.claude/plans/2026-09-03-golden-colour-staged-rollout.md`.

session 7 closed hover-guard (24→0) + built the contrast guard. Session 8 Phase 3 wired 19
rows live, one real bug caught by a new live probe. Session 9 ran `/qc-council` on `fix.js`
(5 investigators), fixed 3 real bugs (commit `0727f440b`), closed 15 more rows — **none of it
was ever deployed or live-verified** (flagged explicitly at session-close, correctly).

**Session 10 (this session) — the big finding: `fix.js` itself needed real hardening before
ANY of its output could be trusted, and manual per-row fixes were quietly overscoped.**

⭐ **CORRECTED ASSUMPTION, mid-session, prompted by Bean:** the initial framing (from the
session-9 handoff) was "the tool has 3-4 narrow bugs, fix them, done." Actual shape, found by
running `/subagent-driven-development` (isolated worktree, 3 tasks, 5 review rounds, cross-model
review at every step): **`fix.js` had a live PHP-corruption risk and a doctrine violation, not
just narrow classification bugs.**

1. **Task 1 (classifier mislabelling)** — `sgs/process-steps.backgroundColour` reported a
   generic "nothing built" refusal when hover was already shipped. 1 fix round (a reviewer-found
   mechanism-mislabel bug: `'unresolved'` printed for a genuinely-ambiguous multi-mechanism case).
2. **Task 2 (pattern-matching gaps)** — 3 named bugs (fused background-color literal, helper-call
   shape matcher, missing `sgs_resolve_text_colour_or_gradient()` resolution path) turned out to
   share ONE root cause, fixed via a new `resolveTextGradientChainSelector()` strategy. **Its own
   verification found a NEW bug**: the generated hover-guard PHP landed nested INSIDE the base
   colour's own presence guard — dead control whenever the client leaves the base colour unset.
   That became Task 3.
3. **Task 3 (hoist-past-guard)** — built `computeHoistedInsertionPoint()` to hoist insertions past
   matching guards. 2 review rounds found: else/elseif-adjacency risk (would emit a PHP parse
   error on `--apply`), an unrelated-guard-variable over-hoist risk, and a comment-blind lookahead
   silently reproducing the original bug. All fixed. Reviewer's own words: **"safe to hand to a
   parallel-agent `--apply` dispatch phase."**
4. **Final whole-branch review (the review no per-task round could do) found MORE, and disagreed
   with the "safe to apply" call**: the codemod hand-built an **unguarded, un-touch-safe combined
   `:hover,:focus-visible` selector rule** — directly violating `plugins/sgs-blocks/CLAUDE.md`'s
   "Touch-safe HOVER helpers" doctrine (landed ONE DAY before this branch started; a bare
   `{sel}:hover{…}` must never be hand-written, `sgs_hover_state_rules()` exists for exactly
   this). Verified this shape would have FAILED the framework's own `php-hover-scan.php` gate on
   `team-member` (zero existing guard calls there to hide behind). Also: the "can't safely hoist"
   fallback silently emitted the KNOWN-BROKEN nested placement instead of refusing, with a
   self-test fixture literally asserting the bug as "expected" — fixed to refuse with named
   reasons instead. Both closed, re-reviewed, re-approved. **7 commits total** (`b1eb92520`
   `d6b031061` `bcc75910d` `ff1f024e6` `daf6178ec` `0f38a4f01` `5ce3c8331`), merged `949c4d701`.
   self-test 15→23.

⭐ **THEN — the tool's first-ever real `--apply` run surfaced ANOTHER gap no review round
covered:** `fix.js --apply` writes the new `{attr}Gradient`/`{attr}Hover` attribute
declarations correctly but does **NOT** wire the corresponding `attrMap` entry into the
block's `supports.sgs.elements` manifest — `check-element-manifest-conformance.js` failed
with `orphan_unclassified=2` on `nav-menu`'s new `burgerBgGradient`/`indicatorColourGradient`.
Fixed by hand (2 `css:background-image` attrMap entries), verified against the actually-emitted
PHP first (never assumed the property). **This gap is NOT yet fixed IN THE TOOL** — every future
`--apply` run needs the same manual follow-up until someone teaches `fix.js` to write the
attrMap entry itself. Named, not silently worked around.

**Applied for real, deployed, live-verified (commit `653aaa69b`):** `nav-menu.navColour`/
`.burgerColour`/`.submenuColour`/`.burgerBg`/`.indicatorColour` + `team-member.nameColour`/
`.roleColour` gain hover colours. `survey.js` CONFORMANT 104→110. Verified via **real Playwright
hover probes on the live canary** — see "hard-won live-probe gotchas" below, both false negatives
were caught and re-verified correctly before trusting a PASS.

⭐ **Real bug found in ALREADY-SHIPPED code, NOT fixed (flagged for whoever owns it next):**
`sgs/info-box`'s existing D744 text-gradient rollout (shipped before this session) has the
SAME defect Task 1/2 fixed in `fix.js`: it calls `sgs_text_decls()` + `sgs_emit_state_colour_css()`
for a gradient-capable row, but `sgs_text_decls()` resolves flat-vs-gradient and then feeds the
result through `sgs_colour_value()` — which expects a slug/hex, NOT a `linear-gradient(...)`
string. Live-verified: with a gradient set, info-box emits
`color:var(--wp--preset--color--linear-gradient90degff...)` — garbage. **info-box's gradient
text has probably never actually painted in production.** The correct pattern (proven live
repeatedly this session) is `sgs_resolve_text_colour_or_gradient()` → `sgs_text_colour_decl()`
→ `sgs_text_colour_gradient_fallback_rule()`, NOT the `sgs_text_decls()` pairing.

### Hard-won live-probe gotchas — READ BEFORE TRUSTING A "PASS" ON A HOVER/GRADIENT PROBE

Two false readings this session, both caught before being reported as fact:

1. **A page-scoped selector can grab the WRONG instance.** `sgs/nav-menu` renders on nearly
   every page via the theme's own header/footer template parts — a probe page had **3**
   `.wp-block-sgs-nav-menu` instances on it, and a bare `document.querySelector()` silently
   grabbed the theme's chrome instance, not the probe's. Fix: always wrap the probe markup in
   `<!-- wp:group {"anchor":"probe-id"} -->` and scope every selector to `#probe-id …` — this is
   already `check-colour-gradient-roundtrip.js`'s own convention (`ROOT_ID`); a hand-rolled
   ad-hoc probe that skips it will silently measure the wrong element and report a false FAIL.
2. **A hover-vs-base colour test needs DIFFERENTIATED values, or a coincidental match reads as a
   FALSE FAIL.** A probe set `nameColourHover:"primary"` with no explicit base `nameColour` —
   the block's own default for the base colour happened to ALSO resolve to "primary", so
   before/after computed colour was identical regardless of whether hover fired at all. Always
   set the base attribute to a DIFFERENT token than the hover attribute in a probe, and always
   pair a hover-fires check with an unhover-reverts check (move the mouse elsewhere, confirm the
   colour reverts) — a "changed and stayed changed" result cannot tell a real hover rule from an
   accidentally-sticky one.

### Reclassification: the "15 pure tool bugs" and "21 trivial" buckets from session 9's synthesis were WRONG in both directions

Session 9's handoff (pasted back into this session by Bean, since it wasn't written to a doc)
claimed 76 refused rows split into 15 tool-bugs / 21 trivial / 12 correctly-refused / ~25-28
genuinely-hard. Verified piece by piece this session — **both buckets moved, in opposite
directions:**

- **3 rows moved OUT of "15 tool bugs" into "correctly refused, not a bug at all":**
  `form.submitBackground`, `modal.triggerBackground`, `modal.modalBackground` — Task 2's own
  investigation found these push into a plain array with **no selector in the statement to
  recover**. `resolveDirectSelector`'s own "never invent a selector" principle means these are
  refused BY DESIGN, not a matcher gap. The original synthesis miscategorised them.
- **`product-card.titleColour`/`.descColour`/`.priceColour`/`.priceNoteColour` moved OUT of
  "21 trivial, single-selector direct-paint swaps" into "genuinely hard, custom-property
  architecture"** — same bucket as `mega-panel`. Verified: these feed a CSS custom property
  (`--sgs-card-title-colour` etc.) consumed by ONE `color:` declaration in `style.css` — a
  gradient needs 3 properties (`background-image`+`clip`+`color:transparent`), which cannot
  substitute into one custom-property value. The "pure single-selector swap" description in the
  original synthesis was wrong; this needs the same real design work mega-panel needs (a second
  custom property + a conditional property switch, or moving off custom-property indirection
  entirely).
- **`tabs.tabBgColour`/`.panelBgColour` and `social-icons.iconBackground`/
  `.iconBackgroundHover` independently confirmed as genuinely custom-property-fed** (`--sgs-tab-bg`,
  `--sgs-panel-bg`, `--sgs-social-bg`) — consistent with the ORIGINAL "genuinely hard" bucket,
  not new information, but worth stating as confirmed rather than assumed.
- **Genuinely trivial and CONFIRMED SAFE** (same shape as the 3 rows already applied this
  session): `pricing-table.ctaBackground` + `.popularBadgeBackground` (both already paint via
  `sgs_block_background_layer_css()`/a hand-rolled `::after` layer with a LIVE sibling
  `ctaColourGradient` proving the pattern works in this exact file) and `nav-menu.underlineColour`
  (a decorative `::after` bar, no competing text). **Dispatched to 2 parallel agents this
  session — IN PROGRESS, not yet landed as of this write-up.** Check `git log` for
  `pricing-table`/`nav-menu` commits after this LEDGER's own last-updated date before trusting
  either as done.

**Still open, carried forward:** hover-guard's 11 pre-existing UNRESOLVED cross-file cases
(optional, session 7); `SgsBorderControl`'s 44-caller contrast wiring (plumbing built, no
callers wired); `sgs/quote.attributionColourHover` (BUILT-BUT-SELF-REFUSED — `fix.js` correctly
declines, `quote.js` has multiple ambiguous destructure blocks, needs a human pick);
`product-card.tagTextColour` (a DIFFERENT, more specific refusal — `normal-state-value-not-a-plain-identifier`
— surfaced after this session's `fix.js` fix removed the original bug masking it); the ~25-28
genuinely-hard custom-property-architecture rows (`mega-panel`, `brand-strip.tileBackgroundColour`,
`social-icons`, `form.progressBarColour`, `post-grid.cardBgColour`, `product-card`'s 4 title/desc/
price rows, `tabs`' 2 rows — none attempted this session, all need real design, not pattern-copy);
`option-picker`'s bespoke `--sgs-op-*` multi-variant pattern (documented not-gradient-capable
without new design); `cta-section.backgroundColour` (WP-native mechanism, not SGS helpers);
`post-grid`'s loop/dynamic-key rows (`.titleColour`/`.excerptColour`/`.metaColour`/
`.readMoreColour` — `fix.js`'s own docblock disclaims this shape, don't extend the matcher to
guess); the `sgs/info-box` gradient bug named above, unfixed.

**Prompt for next session:** `.claude/prompts/2026-09-04-colour-conformance-session-11-continuation.md`
(supersedes and replaces the session-9 continuation prompt, which is now stale on every number
it carried — delete it once this one is confirmed working, per project convention).

## ▶ MOTION TRACK (A closed+live; B closed) — nothing new session 8.

⛔ **TWO SEPARATE TRACKS. Never re-merge them.** Full account: `memory/session-2026-09-04-
tracks-history-sweep.md`. Session 7 closed both (Wave-D register, D949-D955; Generative
Background Engine, D939-D948). Nothing changed this session.

## ▶ CONSOLIDATION TRACK — CLOSED 2026-08-22 (D725/D726, D731-D733)

One item survives, PARKED, owned by nobody: sticky sidebar + band-replacement model
(`parking.md` P-CLIENT-CONTROLS-STICKY-SIDEBAR-AND-BAND-MODEL) — RE-MEASURE first, the accordion
may already have solved it.

## ▶ CLIENT-CONTROLS TRACK — CLOSED 2026-09-02, deployed + live-verified (D904-D913, D915/D916, PR #36)

All 16 media atoms adopted by all six in-scope blocks. Narrative:
`memory/session-2026-09-02-client-controls-track.md`. `trust-bar`/`brand-strip` nested media —
DONE, see SPEC-35 CAPABILITY-ROUTING TRACK below.

## ▶ EDITOR-ERRORS TRACK — CLOSED 2026-08-22 (D743)

Narrative: `memory/session-2026-08-22-editor-errors-track.md`. Nothing pending.

## ▶ SPEC-35 CAPABILITY-ROUTING TRACK — CLOSED 2026-09-04 (prior session), all four items, deployed + live-verified

Plan archived: `.claude/plans/archive/spec-35-capability-routing-doctrine.md` (its own status
line carries the full closure record). All four items closed: Part 6 gate (already a real
hard gate, doc was stale), `testimonial`/`image-sequence` crop decision (already resolved),
Part 7 native-supports census (ran, 0 findings), Part 4 multi-image item-schema extension
(the only real build — `gallery`/`card-grid`/`trust-bar`/`brand-strip` each gained a stable
per-item `_key` + per-item crop control, deployed and live-verified). Commits: `a314fdc47`/
`335a0885a`/`ef051e39c`/`0fbfb51d2`/`94485dad5`. Reports: `reports/visual-diff/{card-grid,
gallery,trust-bar,brand-strip}-2026-09-04.md`.
