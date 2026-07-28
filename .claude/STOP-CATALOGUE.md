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

- **STOP-MEASURE-THE-STATE-NOT-THE-FLAG-THAT-REQUESTS-IT** — NEW 2026-07-26 (D391). When gating
  behaviour on *"is X currently true?"*, read the **computed/effective state**, never the flag,
  class or attribute that *asks* for X. The two diverge the moment any other setting can override
  the first, and the flag keeps reading `true` while nothing is happening. Proven live:
  `header-behaviours.css` sets `position: sticky !important` for the sticky flag (`:39`) and
  `position: absolute !important` for transparent (`:52`) — **equal specificity, both
  `!important`, transparent later in source order** — so a header carrying BOTH classes computes
  `absolute` and scrolls away. A gate reading `body.sgs-header-behaviour-sticky` would have
  reserved 93px of anchor dead-space for a header that is not pinned; `getComputedStyle().position`
  gets it right and also catches a header pinned by a theme/client rule the class never knew about.
  **Corollary — two `!important` declarations at equal specificity are resolved by SOURCE ORDER**;
  never assume the one you care about wins, and when you author the winner prefer higher
  specificity over position (the collapse rule was deliberately made (0,4,0) against the translate
  rule's (0,3,0) for exactly this reason). **Second corollary — every measured gate still has a
  blind spot; name it and, when cheap, ship a detector rather than pretending the measurement is
  total.** Here: a sticky header whose ancestor carries `overflow` other than `visible`, or
  `transform`/`perspective`/`filter`, still COMPUTES `sticky` while pinning to that ancestor — so
  D392 added `findStickyBreakingAncestor()`, which WARNS rather than changing the published value
  (an `overflow` ancestor may still be the page's own scroll container, so acting would be a fix
  for an unproven cause). Sibling of STOP-A-FILTER-GATE-ON-THE-WRONG-ATTR (a gate reading an attr
  the markup never carries) and STOP-VERIFY-CONTENTS-NOT-FILENAME. Memory
  `measure-the-state-dont-read-the-flag-that-requests-it`.

- **STOP-A-CRITERION-WRITTEN-AGAINST-A-REJECTED-MODEL-MUST-BE-STRUCK-NOT-BUILT** — NEW 2026-07-26
  (D392). When a decision REJECTS a model, its acceptance criteria, guardrails and must-fixes do
  not become smaller — many of them become **meaningless**, and a builder who treats the criteria
  list as the spec will construct machinery for conditions that can no longer occur. Proven twice
  in one doc: the sticky mini-design rejected per-row `position:sticky` (D389), which silently
  voided both its own "the multi-sticky warning is advisory only" done-when and its "a row cannot
  be both retained-when-pinned and hidden-on-scroll" guard — under a single header-level sticky
  element there is no second sticky row and no per-row conflict. **Building either would have
  shipped a warning for an impossible state.** Sharper still: that §4 done-when list had ALREADY
  been rewritten once, explicitly because it had survived the D1/D2 revisions unchanged — and the
  multi-sticky criterion still slipped through the rewrite. **Rule: after a model is rejected,
  walk EVERY criterion, guardrail and must-fix and classify each as still-required / void /
  changed — then record the void ones as struck WITH the reason, never delete them silently and
  never build them.** A struck criterion with its reasoning is what stops the next session
  "finishing the job". Sibling of
  STOP-A-SPEC-DESCRIBING-A-SUPERSEDED-MODEL-ACTIVELY-MISDIRECTS-THE-BUILD and memory
  `a-revision-must-sweep-every-section-it-invalidates`.

- **STOP-NO-TOP-LEVEL-FUNCTION-IN-PER-RENDER-PHP** — NEW 2026-07-23 (D374). A reusable function
  declared at the top level of a dynamic block's `render.php` fatals the WHOLE page ("Cannot
  redeclare") the moment TWO instances of that block appear — WordPress runs the render_callback
  (`render.php`) via `include`, once PER INSTANCE. Put shared functions in a `function_exists`-guarded
  `includes/*.php` helper (aggregated once by `render-helpers.php`); render.php CALLS them. Proven live:
  Dispatch B put `sgs_icon_list_flatten_menu_blocks()` top-level in render.php; a single instance
  rendered fine, a 5-instance page 500'd. **Every prebuild gate AND both pre-commit code reviewers
  passed it** — none tested 2 instances. **Corollary: a page with 2+ instances of the SAME block is a
  MANDATORY live-verify case for every block.** The R-31-13 lesson (code correct by read ≠ live render
  works). To surface a fatal `debug.log` misses when `WP_DEBUG_LOG` is off: a scoped probe PHP file
  (`require wp-load.php; do_blocks($markup)` with `display_errors=1`, curl, delete) — NOT `wp eval`
  (content-guard-blocked) and it touches no post_content. (Memory `no-top-level-function-in-per-render-php`.)

- **STOP-AN-ARIA-LABEL-ON-A-ROLELESS-ELEMENT-NAMES-NOTHING** — 2026-07-23 (D367). **The rule stands;
  its cited instance was RETRACTED 2026-07-23 — see the correction below.** An `aria-label` on a bare
  `<div>`/`<span>` with no role is **IGNORED by assistive tech**. It is not a weak label — it is no
  label. General rule: an ARIA attribute is only meaningful on an element whose role can carry it —
  before trusting any `aria-*`, name the role it is attached to. Sibling of
  STOP-VERIFY-CONTENTS-NOT-FILENAME (a thing that looks right by its name).
  > ⚠ **The `sgs/nav-menu` example originally cited here was FALSE and is struck.** The claim was
  > that the block "emitted zero `<nav>` elements" and put `navLabel` on a roleless `<div>`. It did
  > not: `render.php` has always called the shared wrapper with `'tag' => 'nav'` and passed the label
  > via `extra_attrs` — a correctly-named landmark (`git show bb11cd1e^:…/nav-menu/render.php:516,524`).
  > The entry is kept because the PRINCIPLE is real and worth surfacing; only the worked example was
  > fabricated by an unverified diagnosis. **Never illustrate a STOP with an instance you have not
  > confirmed in rendered output** — a false example teaches the next session to "fix" working code.

- **STOP-PROVE-THE-THING-IS-MISSING-BEFORE-ADDING-IT** — NEW 2026-07-23. When a diagnosis says
  "element/attribute/landmark X is absent", the fix ADDS X — so if the diagnosis is wrong you do not
  get a no-op, you get a **duplicate**, and duplicates of structural elements are their own defect
  class (nested landmarks, double live-regions, two labels that drift). Proven this session: a
  "`sgs/nav-menu` has no `<nav>`" finding produced `<nav>` nested inside `<nav>` around the same
  links, with the outer one's label deleted, shipped as an accessibility fix. The absence check must
  be made against **rendered output** — `curl` the live page, or `getComputedStyle`/`querySelectorAll`
  in the DOM — never against one source file, because shared helpers and wrappers emit markup the
  block's own file never mentions. One `curl … | grep -c '<nav'` would have cost seconds and
  prevented the whole change. Generalises STOP-A-GREP-PATTERN-THAT-CANNOT-MATCH-PROVES-NOTHING from
  "can this pattern match?" to **"am I even looking at the artefact that would contain the answer?"**
  Sibling of STOP-NEGATIVE-CONTROL (both: establish the baseline before acting on a delta).

- **STOP-A-GREP-PATTERN-THAT-CANNOT-MATCH-PROVES-NOTHING** — NEW 2026-07-23. A dispatched agent
  verified "zero banned core blocks remain" using `grep "wp:core/"`. **That pattern returns 0 on every
  file in the repo**, because WordPress core block markup omits the namespace — it is `<!-- wp:group -->`,
  never `wp:core/group`. Its answer happened to be right; its evidence could not have detected a wrong
  one. This is the negative-control rule one level down: not "would this pass if the feature were absent?"
  but **"can this pattern match the thing I am looking for AT ALL?"** Fix that works: when delegating
  verification to a cheap model, specify the exact PATTERN, not just the instruction to verify — and
  when receiving any grep-based proof, re-run it yourself with a pattern you know matches.

- **STOP-A-GATE-BORROWING-ANOTHER-TOOLS-EXCLUSION-LIST-INHERITS-ITS-BLIND-SPOT** — NEW 2026-07-23
  (D366). `check-no-core-blocks.py` (a GATE that only READS) called `driver.zone_of()` from the
  MIGRATION tool (which REWRITES files), whose list is labelled *"Track A hands-off list (Track C
  prompt)"*. That list was **parallel-track coordination** — entirely correct for an auto-migrator,
  meaningless for a gate. Borrowing it silently converted "another track owns this file" into "this
  file is exempt from the ban", so the gate reported `clean — 41 files` while never looking at 13,
  including BOTH framework default patterns that ship to every install. The exclusion also used a
  glob (`*footer-*.php`), so the blind spot self-extended to any future footer pattern. **Rule: a
  gate owns its own exclusion policy, stated in the gate, as explicit filenames with a reason and a
  retirement condition — never a glob, and never imported from a tool that answers a different
  question.** Two tools sharing a list must share the QUESTION, not just the data.

- **STOP-VERIFY-THE-VARIABLE-EXISTS-BEFORE-BUILDING-ON-IT** — NEW 2026-07-23 (D367). While fixing the
  nav landmark I referenced `$resolved_menu_name` — a variable I had **invented**; it appears nowhere
  in the file. It read as plausible because a menu name is obviously *available in principle*. This is
  the same failure I spent the session catching in subagents, committed by me, in code I was writing
  to fix someone else's unverified claim. **Rule: any identifier you did not just read, grep for it
  before you build on it** — the cost is one command, the failure mode is a silent runtime null that
  a green build will not catch. Pairs with the SGS evidence hook's GROUND-TRUTH line: state the file
  and line the symbol came from.

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

- **STOP-RENDER-INJECTORS-MUST-ANCHOR-PAST-THE-LEADING-SCOPED-STYLE** — NEW 2026-07-28
  (Spec 35 build-surface close-out). A `render_block` injector that assumes "the first tag in
  the markup is the block root" and writes its payload there will land it INSIDE the Spec-32
  leading scoped `<style>` block whenever one is present — and the p99 lift pass then STRIPS
  that whole `<style>` block on its way to `uploads/sgs-css/`, erasing the injection AND the
  evidence it ever ran (no error, no console warning — the feature is just quietly dead).
  Proven live across FOUR injectors this session (hover-effects, animation, parallax,
  image-controls) — each had to be fixed to anchor past the leading `<style>` before writing.
  The same bug had a second, subtler cost: chasing it down exposed that the earlier-claimed
  D346 "inline-zero win" was PARTLY VACUOUS — some of the inline CSS-variable writes it
  declared "moved to scoped rules" had in fact been silently deleted by this exact mechanism,
  so the feature they drove was inert, not merely relocated. Never trust "the injector ran" as
  evidence the payload survived to the page — verify the COMPUTED value on the live rendered
  element, not the presence of injector code. Sibling of STOP-MEASURE-THE-STATE-NOT-THE-FLAG
  and STOP-GREEN-BUILD-IS-NOT-EVIDENCE. Memory: the injector-vars-route-through-scoped-rules fix
  at `helpers-scoped-instance-vars.php` is the corrected pattern to copy for any NEW injector.

- **STOP-A-SHARED-WRAPPER-READING-A-GENERIC-ATTR-NAME-COLLIDES-WITH-BLOCK-VOCABULARY** — NEW
  2026-07-28 (Spec 35 build-surface close-out, post-grid squish). `SGS_Container_Wrapper` reads
  a GENERIC attribute name (`layout`) off whatever block calls it to decide whether to apply
  grid CSS. `sgs/post-grid` also owns an attribute literally named `layout` — but for its OWN
  vocabulary (a query/display-mode enum, nothing to do with CSS grid). The wrapper had no way to
  tell the two apart, read post-grid's `layout` value as a grid instruction, and double-gridded
  the block (its own grid CSS stacked with the wrapper's, producing the visible squish). This
  was found ONLY after ruling out the more visible defensive `auto-fit`/`minmax` layer as a red
  herring — the attr-name collision was the REAL cause underneath it. **Rule: before a shared
  wrapper/helper reads ANY attribute off a consuming block by a generic name, check whether that
  block already owns a key of the same name for its OWN purpose; strip/rename block-vocabulary
  keys before delegating to the wrapper, never let the wrapper guess from a bare name.** Sibling
  of STOP-A-GATE-BORROWING-ANOTHER-TOOLS-EXCLUSION-LIST-INHERITS-ITS-BLIND-SPOT (same shape: a
  shared mechanism silently inherits meaning from a namespace it doesn't own).

- **STOP-CHAINED-SHELL-COMMANDS-MASK-A-FAILED-STAGE** — NEW 2026-07-28 (near-miss at commit
  `07c67642`). An `&&`-chained build-then-push shell command reports overall exit 0 as long as
  the LAST stage in the chain succeeds — a failed intermediate build stage can be swallowed if a
  later stage (e.g. the git push) still runs and exits clean, or if the chain's final command
  masks an earlier non-zero code. This was caught as a near-miss, not a shipped defect: the build
  had actually failed but the push still proceeded, discovered only by re-checking the individual
  stage output rather than trusting the chain's aggregate exit code. **Rule: guard each stage's
  exit code EXPLICITLY** (`cmd1 && echo "stage1 OK" || exit 1`, or separate commands with an
  inline check between them) rather than relying on a long `&&` chain's overall result — this is
  especially load-bearing on a deploy/build/push sequence where a masked failure ships stale or
  broken code while looking green. Sibling of STOP-VERIFY-COMMIT-LANDED-ON-SHARED-CHECKOUT (the
  git-side twin: a green local step is not proof of the remote state either).

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
- **STOP-TEMPLATELOCK-ALL-REAPPLIES-THE-TEMPLATE** — NEW 2026-07-27 (Track-2b, D393). A block
  passing BOTH a `template` and `templateLock: 'all'`/`'contentOnly'` re-applies that template on
  EVERY mount, not only when empty — WP core: `shouldApplyTemplate = currentInnerBlocks.length
  === 0 || templateLock === 'all' || templateLock === 'contentOnly'`. `synchronizeBlocksWithTemplate`
  then matches by **array position + block name only**; any identifying attribute (`rowSlot`…) is
  ignored. This silently overwrote 15/16 header/footer starter patterns and DESTROYED content.
  Pass the template only when the container is genuinely empty; the lock is unaffected
  (`if (!template) return blocks;`). Never assume a template merely seeds an empty block.
- **STOP-A-MATCHING-MD5-PROVES-CONSISTENCY-NOT-CORRECTNESS** — NEW 2026-07-27 (Track-2b, D394).
  A local↔server checksum match only proves the two files agree — it does NOT prove the file is
  the one you built. PowerShell `Copy-Item -Recurse` into an EXISTING directory NESTS it
  (`build\build`) instead of replacing, so a deploy shipped the stale tree while md5 "verified"
  clean at every step (both sides were the old file). This nearly got mis-read as "the fix
  didn't work / wrong root cause". Verify deployed CONTENT — `grep` for the changed line, check
  the line count — not just that two hashes agree. Extends STOP-VERIFY-DEPLOY-BY-CHECKSUM.
- **STOP-CHECK-BOTH-HOOK-LAYERS-BEFORE-COMMIT** — NEW 2026-07-22 (Track-1). A commit can be
  gated by more than one hook layer (path-scope gate + secret-scan + visual-diff); check ALL of
  them before assuming a bare `git commit` will land, and read each gate's own bypass guidance.

- **STOP-A-SCOPED-AXE-RUN-ON-A-CLOSED-SURFACE-PASSES-VACUOUSLY (2026-07-28)** — `axe.run('.selector')`
  scoped to a drawer/modal/panel returns **"0 violations" whether or not the surface is OPEN**,
  because axe's `excludeHidden` defaults true and simply skips hidden content. Proven by negative
  control: `nav-qa/axe-run.mjs --scope .sgs-nav-drawer` WITHOUT `--open` reported exactly the same
  "0 violations" as the opened run. **Any past "axe = 0 on the drawer/panel" claim made with that
  harness proves nothing.** Every axe run on a disclosure/dialog surface must first ASSERT the
  surface is open (element `open`/`aria-expanded=true`, height > 0, focusable-count > 0) and report
  **VACUOUS**, never PASS, when the guard fails. Generalises STOP-NEGATIVE-CONTROL to the
  measurement tool itself: the question is not only "would this pass with the feature absent?" but
  "is the tool even LOOKING at the thing?" Sibling of STOP-VERIFY-DEPLOY-BY-CHECKSUM.

- **STOP-A-CSS-RULE-THAT-CANNOT-WORK-STILL-LOOKS-CORRECT-IN-SOURCE (2026-07-28)** — a CSS rule can
  be perfectly written and structurally incapable of ever working, and reading it will never tell
  you. Two in one session: (1) `left:50%;transform:translateX(-50%)` centring on a mega panel could
  NEVER centre, because every `.sgs-nav-menu__item` is `position:relative` (needed for the indicator
  pill), so the wrap's containing block was always the ~100px menu ITEM — the panel shrink-to-fit to
  101px and the edge-pin fallback then glued it to the item's own edge. (2) An item divider written
  `:not(:last-child)` painted a TRAILING edge, because the bar also contains the absolutely-positioned
  indicator, so the last ITEM is not the last CHILD (`item + item` is the immune form). **Both were
  found by MEASURING the rendered box, never by reading the selector.** Rule: for any positioning or
  nth-child rule, measure the computed result on the live page — and specifically identify which
  ancestor is the containing block rather than assuming it is the one you intended.

- **STOP-A-SHAPE-MISMATCH-SILENTLY-DROPS-THE-WHOLE-VALUE (2026-07-28, D401)** — extends STOP-D328
  from "WP coerces to the default" to "the CONSUMER drops it entirely". `sgs/mega-panel`'s
  `panelPadding` defaulted to the SCALAR `{desktop:'28px'}` while render.php emits it through
  `sgs_emit_responsive_css(..., 'box' => true)`, which reads `{top,right,bottom,left}` — so the
  padding was silently discarded and the panel rendered flush at `padding:0`, headings touching its
  own border. No error, no failing gate, and the sibling block (`sgs/mega-aside`) had the CORRECT box
  shape all along, which is precisely why IT had padding and the panel did not. **When two sibling
  blocks differ visibly in the same property, diff their attribute SHAPES before diffing their CSS.**

- **STOP-A-UNIVERSAL-EXTENSION-ATTACHES-TO-BLOCKS-IT-MAKES-NO-SENSE-ON (2026-07-28, D401)** — the
  four universal extensions (`hover-effects`, `parallax`, `custom-spacing`, `animation`) attach to
  EVERY `sgs/*` block unconditionally; the opt-out (`supports.sgs.hideExtensions`) exists and is
  already used by `sgs/brand-strip`, but a block that never declares it inherits every panel. Result:
  `sgs/nav-menu` offered a client Block Link (wrap the whole nav in one `<a>`), Element parallax on a
  sticky bar, Click Effects, and a Hover Effects panel duplicating its own per-element hover controls
  — **13 inspector panels on a navigation menu.** Worse, the Spacing panel was **silently DEAD**: its
  fields write `sgsMarginTop/…`, which `custom-spacing.js` never registers when a block declares
  native spacing, so every value a client set was discarded on save. **Rule: a new block must
  declare `hideExtensions` deliberately — inheriting all four is a decision, not a default. And an
  extension panel rendering is NOT evidence its attributes are registered.**

- **STOP-A-SCHEMA-AUDIT-READING-ONLY-BLOCKJSON-CANNOT-SEE-EXTENSION-ATTRS (2026-07-28)** — the
  oldshape-audit deploy gate flagged 2 NEW HIGH "undeclared-attr → WP deletes it on save" findings
  (`sgsBlockLink`/`sgsBlockLinkLabel` on page 1849's card-grid) and ABORTED a deploy. Both were
  FALSE POSITIVES: those attrs are registered by the universal block-link extension via the
  `blocks.registerBlockType` JS filter, so they exist in the editor schema and are NOT discarded on
  save — but the audit reads only block.json, which is structurally blind to filter-registered
  attributes. The gate firing was still evidence about the DATA (STOP-A-GATE-FIRING-IS-EVIDENCE):
  the finding was explained against the extension source (`extensions/hover-effects.js`) BEFORE
  baselining, and the baseline entry carries the register reference (precedent: the baselined
  `sgs/icon-list sgsHoverScalePreset`, same class). **Rule: before treating an "undeclared attr"
  audit finding as stranded content, grep the extensions for a filter that registers it — and any
  schema audit that reads only block.json must either model extension-registered attrs or document
  the blind spot in its own output.** Structural fix parked (`P-OLDSHAPE-AUDIT-EXTENSION-ATTRS`).

- **STOP-A-GREEN-BUILD-IS-NOT-EVIDENCE-AN-EFFECT-FIRES (2026-07-27)** — THREE separate
  "built but inert" bugs shipped past `php -l`, `eslint` AND every prebuild gate in one
  session: (1) a `MutationObserver` watching a `hidden` attribute the panel NEVER carries,
  so the stagger animation could never run; (2) an indicator using `scaleX()` on a 1px box
  with `border-radius`, stretching the corners ~120x into a smeared lozenge; (3) two new
  theme patterns added with NO theme version bump, so WP served its CACHED pattern list and
  both new block variants were uninsertable. Every one was syntactically perfect and did
  nothing. **Rule: for any effect/animation/registration, name the OBSERVABLE SIGNAL and
  verify it on a live page. "The code exists" and "the gates are green" are worth zero
  here.** All three were caught only by tracing each side of the contract to the file that
  emits it — never by reading one file.
- **STOP-NEW-PATTERN-FILES-NEED-A-THEME-VERSION-BUMP (2026-07-27)** — WordPress caches the
  pattern-file list against the theme's `style.css` `Version:` header. Adding a
  `theme/sgs-theme/patterns/*.php` WITHOUT bumping it means the pattern never appears in the
  editor on any cached install — the feature ships, deploys, and is unreachable. Precedent:
  theme 1.5.44 was bumped for the 3 earlier mega patterns; 1.5.46->1.5.47 for the 2 new
  ones. **Verify by querying the live `wp/v2/block-patterns/patterns` REST endpoint after
  deploy — do not assume registration.**
- **STOP-BLOCK-JSON-ASSET-TARGET-MUST-EXIST-IN-BUILD (2026-07-27)** — a `block.json`
  `file:` reference pointing at a file the build never produced makes WP silently enqueue
  NOTHING: no error, no warning, no failing gate. `sgs/table-of-contents` rendered COMPLETELY
  UNSTYLED because `index.js` never imported `style.css`, so `style-index.css` was never
  compiled. 5th instance of the D382 class (4 swept July, this one missed).
  **NOW STRUCTURALLY ENFORCED** by `scripts/check-block-asset-targets.js` wired into
  `postbuild` (NOT prebuild — prebuild runs `clean:build`, which deletes `build/`, so the
  gate could only ever false-fail there). Negative-control verified: it genuinely fails on a
  corrupted reference and recovers on restore.
- **STOP-VERIFY-A-DOC-IS-LYING-BEFORE-YOU-FIX-IT (2026-07-27)** — I identified 3 project
  docs as carrying false claims and queued corrections. Verifying each against primary
  source BEFORE editing proved 2 right and **1 WRONG — my own claim**. Spec 36 FR-36-5 makes
  a product-REPLACEMENT claim about Kadence Pro and confines its ACCESSIBILITY claims to Max
  Mega Menu (which research supports); it never claimed what I accused it of. **I would have
  edited a CORRECT document into being wrong.** Rule: a doc you believe is lying is a
  HYPOTHESIS, exactly like a subagent's finding or a council's fix-shape. Verify against the
  primary source (the commit, the code, the DB) before editing. Applies with full force to
  your OWN diagnostic claims — this is the `prove-the-cause-before-fix` rule turned inward.

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
- **2026-07-22 (Track-1 converter reconciliation) re-run:** Track 1 ADDED **6** earned-but-unlanded
  tokens from its Fronts-1/2 session (`STOP-VERIFY-COMMIT-LANDED-ON-SHARED-CHECKOUT`,
  `STOP-VISUAL-DIFF-GATE-NO-VERIFY-FOR-LOGIC`, `STOP-RESIDUE-DECLARED-IRREDUCIBLE-USUALLY-ISNT`,
  `STOP-VERIFY-THE-DELIVERABLE-EXISTS`, `STOP-PRE-EXISTING-CLAIM-CHECK-SESSION-START`,
  `STOP-CHECK-BOTH-HOOK-LAYERS-BEFORE-COMMIT`), SUBTRACTED none. **All 6 verified present as
  DEFINED entries** (`grep -cE '^\s*-\s+\*\*STOP-<token>'` = 1 each) — no defence was lost.
  > ⚠ **RECEIPT-ARITHMETIC RACE — corrected 2026-07-22 by the handoff QC gate (do not repeat).**
  > This entry originally claimed "previous 61 → 67". That was WRONG, and so is the
  > D361-D362 entry directly above it: **both co-active tracks computed `previous` as 61 from a
  > stale read**, so neither chained off the other (Track 1's 6 landed in `e8f57958` BEFORE
  > Track 2's 2 in `a20a234d`, yet Track 2 still started from 61). The claimed totals (63 and 67)
  > are therefore both fiction. **The tokens themselves are all present and correct — only the
  > arithmetic was wrong.**
  > **Canonical count method from now on (state the command, never a bare number):**
  > `grep -oE '^\s*-\s+\*\*STOP-[A-Z0-9]+(-[A-Z0-9]+)*' .claude/STOP-CATALOGUE.md | grep -oE 'STOP-[A-Z0-9]+(-[A-Z0-9]+)*' | sort -u | wc -l`
  > → **63 DEFINED entries** at this commit. (Counting every `STOP-…` mention anywhere gives 71 —
  > it includes prose cross-references, which is why bare counts drifted. A `[A-Z-]+` character
  > class also silently truncates any token containing a digit, giving 59; that is the third
  > wrong answer this file has carried.) **On a shared checkout, re-run the command immediately
  > before writing a receipt — never carry a `previous` figure forward from a prior read.**
- **2026-07-23 (Specs 36+37 breadth wave / D363-D367) re-run:** previous DEFINED entries = **63** (via this file's OWN canonical command, below);
  this session ADDED 4 (`STOP-AN-ARIA-LABEL-ON-A-ROLELESS-ELEMENT-NAMES-NOTHING`,
  `STOP-A-GREP-PATTERN-THAT-CANNOT-MATCH-PROVES-NOTHING`,
  `STOP-A-GATE-BORROWING-ANOTHER-TOOLS-EXCLUSION-LIST-INHERITS-ITS-BLIND-SPOT`,
  `STOP-VERIFY-THE-VARIABLE-EXISTS-BEFORE-BUILDING-ON-IT`) and SUBTRACTED none → **67**. 67 >= 63. PASS.
  ⚠ **Self-correction:** the first version of THIS receipt reported "72 → 76" using the bare
  every-mention count — the exact method the 2026-07-22 receipt one entry above had just
  discredited ("Counting every `STOP-…` mention anywhere gives 71 — wrong answer this file has
  carried"). Caught by the independent handoff `/qc` subagent, not by me. The canonical
  DEFINED-entry command is the one to use, every time; a receipt that states a bare number
  without the command is not auditable.
  All four earned by a failure that actually occurred: ~~a `navLabel` that named nothing for months on a
  roleless div~~ **(RETRACTED — see the correction on that entry; the principle stands, the example was
  false)**; an agent's verification grep that could not match a core block at all; a READ-only gate
  importing a REWRITE tool's track-coordination list and inheriting a 13-file blind spot over the
  patterns that ship to every install; and my OWN reference to an invented variable while fixing the
  first of those.
- **2026-07-23 (Task-1 live verification / nav landmark revert) re-run:** previous DEFINED entries = **67**
  (re-measured with this file's own canonical command immediately before writing, per the 2026-07-22
  receipt-arithmetic rule — never carried forward); this session ADDED 1
  (`STOP-PROVE-THE-THING-IS-MISSING-BEFORE-ADDING-IT`) and SUBTRACTED **none** → **68**. Command:
  `grep -oE '^\s*-\s+\*\*STOP-[A-Z0-9]+(-[A-Z0-9]+)*' .claude/STOP-CATALOGUE.md | grep -oE 'STOP-[A-Z0-9]+(-[A-Z0-9]+)*' | sort -u | wc -l`
  → **68**. 68 >= 67. PASS.
  ⚠ **One entry was AMENDED, not removed.** `STOP-AN-ARIA-LABEL-ON-A-ROLELESS-ELEMENT-NAMES-NOTHING`
  keeps its slot and its principle; only its worked example was struck, because that example was a
  false diagnosis that had already caused a regression to ship. Per D101 this is a correction, not a
  subtraction — the token count is unchanged by it and no defence was lost. The new entry is earned:
  a fix built on an unproven "X is missing" shipped `<nav>` nested inside `<nav>` to the canary.
- **2026-07-23 (FR-36-26c icon-list link-list / D374-D375) re-run:** previous DEFINED entries = **68**
  (re-measured with this file's own canonical command immediately before writing); this session ADDED 1
  (`STOP-NO-TOP-LEVEL-FUNCTION-IN-PER-RENDER-PHP`) and SUBTRACTED **none** → **69**. Command:
  `grep -oE '^\s*-\s+\*\*STOP-[A-Z0-9]+(-[A-Z0-9]+)*' .claude/STOP-CATALOGUE.md | grep -oE 'STOP-[A-Z0-9]+(-[A-Z0-9]+)*' | sort -u | wc -l`
  → **69**. 69 >= 68. PASS. Earned: a top-level function in a per-render render.php fataled a 5-instance
  page live, and every build gate + both pre-commit code reviewers missed it (only a multi-instance
  live render caught it).
- **2026-07-28 (Gate 3 close + eye-pass chain + Spec 35 nav cleanup / D401) re-run:** previous DEFINED
  entries = **77** (re-measured with this file's OWN canonical command immediately before writing, per
  the 2026-07-22 receipt-arithmetic rule — never carried forward; the figure had moved from 71 as
  co-active tracks added entries). This session ADDED 4 and SUBTRACTED **none** → **81**. Command:
  `grep -oE '^\s*-\s+\*\*STOP-[A-Z0-9]+(-[A-Z0-9]+)*' .claude/STOP-CATALOGUE.md | grep -oE 'STOP-[A-Z0-9]+(-[A-Z0-9]+)*' | sort -u | wc -l`
  → **81**. 81 >= 77. PASS. All four earned by something that actually happened today:
  a scoped axe run that returned "0 violations" on a CLOSED drawer exactly as it did on an open one
  (invalidating any earlier drawer-axe claim made with that harness); two CSS rules that were
  perfectly written and structurally incapable of working, both caught only by measuring the rendered
  box; a scalar-vs-box shape mismatch that silently dropped a whole padding value while the sibling
  block with the correct shape rendered fine; and four universal extensions attaching unconditionally
  to a navigation menu, one of whose panels was writing to attributes that were never registered.
- **2026-07-28 (drawer desktop variants / D403-D404) re-run:** previous DEFINED entries = **81**
  (re-measured with this file's OWN canonical command immediately before writing — never carried
  forward). This session ADDED 1
  (`STOP-A-SCHEMA-AUDIT-READING-ONLY-BLOCKJSON-CANNOT-SEE-EXTENSION-ATTRS`) and SUBTRACTED
  **none** → **82**. Command:
  `grep -oE '^\s*-\s+\*\*STOP-[A-Z0-9]+(-[A-Z0-9]+)*' .claude/STOP-CATALOGUE.md | grep -oE 'STOP-[A-Z0-9]+(-[A-Z0-9]+)*' | sort -u | wc -l`
  → **82**. 82 >= 81. PASS. Earned: the oldshape-audit gate aborted a real deploy on two
  extension-registered attrs it structurally cannot see; the finding was explained against the
  extension source before baselining rather than bypassed.
- **2026-07-26 (Spec 37 FR-37-40 sticky build / D391-D392) re-run:** previous DEFINED entries = **69**
  (re-measured with this file's own canonical command immediately before writing, per the 2026-07-22
  receipt-arithmetic rule — never carried forward); this session ADDED 2
  (`STOP-MEASURE-THE-STATE-NOT-THE-FLAG-THAT-REQUESTS-IT`,
  `STOP-A-CRITERION-WRITTEN-AGAINST-A-REJECTED-MODEL-MUST-BE-STRUCK-NOT-BUILT`) and SUBTRACTED
  **none** → **71**. Command:
  `grep -oE '^\s*-\s+\*\*STOP-[A-Z0-9]+(-[A-Z0-9]+)*' .claude/STOP-CATALOGUE.md | grep -oE 'STOP-[A-Z0-9]+(-[A-Z0-9]+)*' | sort -u | wc -l`
  → **71**. 71 >= 69. PASS. Both earned by something that actually happened: a gate reading the
  sticky body class would have reserved 93px of dead space for a header computing `absolute`
  (sticky and transparent both set `position` with `!important` at equal specificity, transparent
  later), caught only by measuring the computed value on a live page; and two acceptance criteria
  in the mini-design's OWN §4 — a list already rewritten once for exactly this reason — survived
  the rejection of the model they were written for, and would have shipped a warning for a state
  that can no longer occur.
- **2026-07-28 (Spec 35 build-surface close-out / T3/T4 wave + injection-class arc) re-run:**
  previous DEFINED entries = **82** (re-measured with this file's OWN canonical command
  immediately before writing — never carried forward). This session ADDED 3
  (`STOP-RENDER-INJECTORS-MUST-ANCHOR-PAST-THE-LEADING-SCOPED-STYLE`,
  `STOP-A-SHARED-WRAPPER-READING-A-GENERIC-ATTR-NAME-COLLIDES-WITH-BLOCK-VOCABULARY`,
  `STOP-CHAINED-SHELL-COMMANDS-MASK-A-FAILED-STAGE`) and SUBTRACTED **none** → **85**. Command:
  `grep -oE '^\s*-\s+\*\*STOP-[A-Z0-9]+(-[A-Z0-9]+)*' .claude/STOP-CATALOGUE.md | grep -oE 'STOP-[A-Z0-9]+(-[A-Z0-9]+)*' | sort -u | wc -l`
  → **85**. 85 >= 82. PASS. All three earned by something that actually happened today: four
  `render_block` injectors (hover-effects/animation/parallax/image-controls) landed payloads
  inside the Spec-32 leading scoped `<style>` block, which the p99 lift then stripped — erasing
  both the injection and the evidence, and exposing that an earlier "inline-zero win" claim
  (D346) was partly vacuous because the same mechanism had silently deleted inline var writes;
  `SGS_Container_Wrapper` reading the generic attr name `layout` collided with `sgs/post-grid`'s
  own `layout` vocabulary and double-gridded the block; and an `&&`-chained build-then-push
  command's overall exit 0 masked a failed intermediate build stage at commit `07c67642`, caught
  only by re-checking the individual stage output rather than the chain's aggregate result.
