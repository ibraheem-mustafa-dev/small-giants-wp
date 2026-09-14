---
doc_type: phase-plan-annex
plan_id: phase-nav-menu-colour-state
annex_of: .claude/plans/phase-nav-menu-colour-state.md
project: small-giants-wp
date: 2026-09-11
---

# Annex — Hidden Decisions pass for the Spec 41 `sgs/nav-menu` phase plan

**This is the phase plan's Stage 6 Hidden Decisions record, split out of the plan file on
2026-09-11 to keep the plan under its 3,000-line doc-shape cap. Nothing was deleted — every
`PD-n` below is unchanged except where a later owner ruling corrected it, and those corrections
are marked inline.** The plan cites these by ID (`PD-1` … `PD-14`) and the IDs are stable, so
every existing cross-reference still resolves.

⛔ **Read this alongside the plan, not instead of it.** Each pre-answer has already been folded
into the step it affects; this file is the provenance — who flagged what, what was verified
against the real code, and which of the plan's own claims did not survive. Its value is that a
future session can see WHY a step reads the way it does without re-deriving it.

**Owner rulings that supersede parts of this record** live in the plan's
§Resolved judgement calls. Where a ruling changed a pre-answer (PD-1, PD-2, PD-6), the entry
below says so in place.

---

### Pre-emptive decisions (Hidden Decisions pass — two cold peer reviewers, Sonnet + Haiku)

*(Stage 6 mandatory pass, RUN. Two cold reviewers with distinct personas — a conscientious senior
engineer who hates being blocked, and a pedantically literal junior who refuses to infer intent —
were dispatched via `/dispatching-parallel-agents` against this plan with Step 15 as the
representative step. Their findings are deduplicated below, and **every factual claim either
reviewer made about the real code was re-verified with a command before being acted on** — two of
their premises were right and corrected this plan, one of mine was wrong and is corrected here.)*

**PD-1 — ⛔ "`edit.js` reads `sweepEligibility` via the already-imported manifest" is FALSE.**
- **Flagged by:** sonnet-reviewer · **verified independently:**
  `grep -n "block.json\|metadata" plugins/sgs-blocks/src/blocks/nav-menu/edit.js` returns only a
  prose comment; `cat plugins/sgs-blocks/src/blocks/nav-menu/index.js` shows `import metadata from
  './block.json'` lives in **`index.js`**, not `edit.js`. The `Edit` component never receives
  `supports` as a prop either.
- **Pre-answer (UPDATED by owner ruling 3):** **Add `import metadata from './block.json';` to
  `edit.js`** — the module that reads the predicate, because that is where the `colourRows` literal
  stays. (The original pre-answer said `colour-rows.js`; **there is no `colour-rows.js`** — see
  ruling 3.) A read-only static import identical to what `index.js` already does; it does NOT count
  as editing the frozen `block.json`. ⚠ The file carrying it is also the file carrying `colourRows`,
  so re-check rule 31's resolution after adding it — the import does not itself break resolution, but
  the check is the same check.
- **Why it matters:** an executor told to use an import that does not exist searches, finds nothing,
  and then has to decide unaided whether adding one violates the block.json freeze.

**PD-2 — ✅ KJC-1's shipping risk was MY error: the `includes/` path arithmetic is PROVEN, not
unproven.**
- **Flagged by:** sonnet-reviewer · **verified independently:**
  `plugins/sgs-blocks/build/blocks/nav-menu/render.php` already exists (so `--webpack-copy-php`
  demonstrably runs), and `dirname( __DIR__, 3 )` resolves to `plugins/sgs-blocks` from **both**
  `build/blocks/nav-menu/render.php` and `src/blocks/nav-menu/render.php` — both trees place the
  block folder exactly three levels down.
- **Pre-answer:** never a shipping-path question — option (A) is safe by demonstration. What
  remained was ONLY the FR-41-21 wording conflict, **now closed by owner ruling 2.** The two
  placement questions conflated under one number are answered separately: CSS assembly →
  `includes/nav-menu-css.php`; FR-41-21 emitter → `render.php`.
- ⚠ **One real load-order note for step 8:** `helpers-tokens.php`, `helpers-hover-state.php` and
  `helpers-colour-variants.php` are all required globally at plugin bootstrap (via
  `includes/render-helpers.php`), but `nav-menu-css.php` will be `require_once`'d **per-instance from
  `render.php`**, matching product-card's pattern. So its functions are only in scope after
  nav-menu's own `render.php` has run at least once on that page load. Fine today (nothing else calls
  into nav-menu internals) — **put a one-line comment in the file saying so**, or a future cross-block
  call fatals for a reason nobody will find.

**PD-3 — Step 9's Test block ("attribute count rises from 79 to the declared post-build figure")
contradicts this plan's own rule against cached counts.**
- **Flagged by:** haiku-reviewer (literally: "WHERE is the post-build target figure declared?")
- **Pre-answer:** **Do not target a number, and the Test block is corrected.** Current count is 79.
  Step 9 deletes 12 and adds every row in §8.4 plus FR-41-22(a)'s submenu family plus its three hover
  companions. **Assert the NAMES against §8.4 and §FR-41-22(a), never a count** — a builder chasing a
  target number will invent or drop an attribute to reach it, and a count in prose is a copy that
  rots.

**PD-4 — Step 8 does not say WHERE the CSS-emission half of `render.php` begins.**
- **Flagged by:** haiku-reviewer
- **Pre-answer:** `render.php` carries an explicit section banner — **`── 4. Scoped CSS assembly`**.
  Split there. Everything from that banner to the end of the CSS assembly moves; the class
  definition and the markup-rendering methods above it stay. ⚠ **The banner is the anchor, not a
  line number** — grep for it (`grep -n "Scoped CSS assembly" plugins/sgs-blocks/src/blocks/nav-menu/render.php`),
  because other sessions commit to this file daily. Step 8's prompt is corrected to name it.
- ⚠ If the byte-identity harness fails after splitting at that boundary, the boundary is wrong —
  **move the boundary, do not patch the output.**

**PD-5 — Steps 7 and 8's `Exec:` lines are self-contradictory as written.**
- **Flagged by:** haiku-reviewer
- **Pre-answer:** They say "SEQUENTIAL before/after each other" AND "PARALLEL with steps 3-6, 11",
  which reads as impossible. The execution diagram is correct and the `Exec:` lines were sloppy:
  **7 and 8 are sequential WITH EACH OTHER inside Lane 2, and Lane 2 as a whole runs concurrently
  with Lanes 1, 3 and 4.** Both `Exec:` lines are corrected to say exactly that.

**PD-6 — Step 14's `Files:` list does not authorise creating a SIXTH sub-module if the rebuild busts
step 7's guessed boundaries.**
- **Flagged by:** sonnet-reviewer
- **Pre-answer (TIGHTENED by owner rulings 3 and 7):** **"Every file ≤ 250 lines" is the binding
  constraint and it outranks step 7's guessed module list** — and it is asserted PER FILE, never on a
  total (ruling 7). Step 7's boundaries were chosen before ~40 new attributes and a full panel
  rebuild landed, so they are a hypothesis. Step 14 MAY create further modules inside its one
  writable directory to stay under the limit.
  ⛔ **Two things it may NOT do.** (i) Compress a `colourRows` literal into a generated form — a
  computed states array blinds the golden-colour detector (ruling 3, D738). (ii) Move `colourRows`,
  **or any GROUPING of it**, out of `edit.js`. ⚠ **This corrects the original pre-answer**, which
  said "split the literal by GROUPING" and left the destination unstated: grouping is still permitted,
  as multiple complete literals **inside `edit.js`**, because a grouping moved to a block-folder
  sibling is exactly as blind as the whole array moved there.
  ⛔ **And the first move is not splitting at all — it is reuse (ruling 7).** A sub-file that only
  exists because a control was hand-rolled should not exist. If, after genuine reuse, a file still
  does not reach 250, report the measured count to Bean rather than shipping the violation silently.

**PD-7 — Step 2 (QA-1) has no artefact, so "Council returned GO" is unverifiable by the next step.**
- **Flagged by:** haiku-reviewer
- **Pre-answer:** **QA-1 writes `.claude/verify/spec-41-qc-council-1.md`** carrying the verdict, the
  per-step predicted-outcome/baseline/validation table, and any fix-shapes folded back into this
  plan. Step 3's `Deps:` is that FILE EXISTING with a GO verdict, not a remembered conversation. Same
  for QA-5 → `.claude/verify/spec-41-qc-council-2.md`. A gate whose pass-condition lives only in
  scrollback is not a gate.

**PD-8 — What if `supports['sgs']['sweepEligibility']` is absent at render time?**
- **Flagged by:** sonnet-reviewer
- **Pre-answer:** Treat an absent key as **eligibility UNKNOWN → resolve to `'swap'`**, i.e. **fail
  CLOSED** (no sweep CSS emitted). ⛔ Never fail open. An absent key must not read as "no blockers,
  therefore eligible" — that is §8.6(g) item 4's dead-detector shape applied to the read side.
  Failing open emits `-webkit-text-fill-color: transparent` over a background that was never
  painted: invisible text, total content loss. Log once under `WP_DEBUG`; do not `error_log()` on
  every render.

**PD-9 — Which step owns deleting the `hoverStyle` dropdown and the "Underline" `PanelBody`?**
- **Flagged by:** both (as an ownership collision)
- **Pre-answer:** **Step 14 owns every UI deletion** (the `hoverStyle` dropdown, the "Underline"
  `PanelBody`, the "Indicator" panel, the "Menu item — state signals" panel). **Step 16 owns the CSS
  and attribute-read deletions.** They sit in different lanes and would otherwise both edit around
  one feature — doing it twice or not at all. Step 9 already removed the attributes from the
  manifest, so by step 14 those controls write to attributes that no longer exist, which is why step
  14 runs `check-dead-controls.js`.

**PD-10 — Step 15's "Prove it" asks for emitted CSS with the predicate TRUE and FALSE, but never says
how to force it FALSE.**
- **Flagged by:** sonnet-reviewer
- **Pre-answer:** **Force it by setting a real blocking attribute, never by stubbing the registry
  read.** For `submenuColourHoverTreatment`, set `submenuLinkBgHover`; for
  `burgerColourHoverTreatment`, set `burgerHoverColour`; for `itemColourHoverTreatment`, set
  `itemColourGradient`. Those are the same straddling fixtures G14(f) and (g) need anyway, so build
  them once at step 15 and reuse them at step 22. Stubbing the registry would prove the stub works.

**PD-11 — G13's byte-identity: identical to WHAT? There is no pre-build artefact.**
- **Flagged by:** sonnet-reviewer
- **Pre-answer:** **Capture the baseline at step 1, before any edit** — render the nav-menu with a
  fixture set covering each G13 scenario and save emitted CSS plus computed values to
  `.claude/verify/spec-41-baseline/`. G13 diffs against those files. ⚠ Scenario 4 (the 8px radius)
  deliberately does NOT diff source text — the two builds legitimately emit different source for the
  same painted result, so it asserts the COMPUTED value. **Step 1's `Files:` and `Outcome:` are
  corrected to include this**; without the correction a cold executor following step 1 literally
  would miss the baseline entirely and only discover it at step 22, which is a far more expensive
  place to notice.

**PD-12 — Step 16 deletes census #5's drawer current-page tint and #3's separator. Does the canary
visibly lose a look?**
- **Flagged by:** haiku-reviewer
- **Pre-answer:** **Yes, deliberately, and the spec names it.** An untouched drawer ships no
  separator and no current-page tint after this build — the same accepted default-reduction
  FR-41-17a(a) records for the Hover signal, closed the same way (one `itemBorderWidth` entry, one
  `itemBgCurrent` entry). ⛔ Do NOT "preserve" either rule: a kept hardcoded rule paints *in addition
  to* the operator's choice, which is the silent-override class this phase exists to remove.
  **Surface it in step 25's sign-off** so Bean sees the change rather than discovering it.

**PD-13 — Can a subagent commit, or does the dispatching session commit?**
- **Flagged by:** both
- **Pre-answer:** **The dispatching session commits, always.** Every prompt says "do not run git
  beyond `diff`/`status`". The dispatcher reviews `git diff --stat`, confirms the blast radius
  matches the step's declared `Files:`, then commits with an EXPLICIT pathspec naming each file.
  ⛔ Never `git add -A`, never a glob. ⛔ Never `git stash`. Pull/rebase onto `origin/main` and push
  after every completed step. ⚠ A prohibition in a brief is not enforcement — the diff review by the
  dispatcher is what enforces it.

**PD-14 — Rollback if the phase is abandoned mid-flight?**
- **Flagged by:** sonnet-reviewer
- **Pre-answer:** Each step is its own commit on `main`, so rollback is `git revert` of the step
  commits in reverse order — **except step 9**, whose revert must be followed by re-running
  `/sgs-update`, because the derived DB does not un-reseed itself
  (`a-raw-db-update-does-not-survive-a-reseed`, in the other direction). Wave A's four shared-file
  steps are independently revertible and carry zero behaviour change, so they may stay in place even
  if the block work is abandoned.

⚠ **One reviewer finding is recorded as NOT actioned, with the reason.** The literal reviewer could
not read past Step 9 (the file exceeded its read budget) and reported several items as "cannot
verify" — those are artefacts of its read window, not defects in the plan, and are excluded. Its
findings that WERE real (PD-3, PD-4, PD-5, PD-7, PD-9, PD-12) all came from the part it did read.

---
