# Follow-up prompt — close out the heading-level / typography residuals

**Rewritten 2026-08-17 after a `/qc-council` pass falsified three claims in the first version.** Paste
the block below into a fresh session. It inherits no context — everything is stated inline.

⛔ **SUPERSEDED 2026-08-17 — R1, R3, R4 are now CLOSED. Do not redo any of this file's R1/R3/R4
sections.** See `decisions.md` D653 for the full closure record and `LEDGER.md` for current status.
This file is kept for its historical record of the investigation (D643-avoidance reasoning, the
research trail) — the ONLY item from this file still open is **R2** (the F3b gate's E12 guard scoping
prerequisite), which was deliberately excluded from D653's dispatch because it needs its own design
pass, not mechanical execution.

---

Invoke `/autopilot` before doing anything else.

## Read first, in this order

1. `.claude/decisions.md` **D649** — the typography initiative's scoping rulings.
2. `.claude/LEDGER.md` §"Task B" — current state, including the deploy-evidence block.
3. `~/.claude/plans/read-all-of-spec-soft-fairy.md` — the approved plan (workstreams W1-W7).
4. `.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` — the governing spec, in full.

⛔ **Treat all four as claims, not facts.** Re-derive branch, HEAD and D-ceiling yourself:
`git branch --show-current` · `git log --oneline -1` ·
`grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`.
The plan's own baseline went stale mid-session once, and a council found a "deployed" claim in the
LEDGER carrying none of the evidence that file's convention requires.

## ⛔ ALREADY CLOSED — do not redo any of this

Verified on the live server, not from a deploy log:

- **Seven blocks gained a `headingLevel` control** (`card-grid`, `form-review`, `pricing-table`,
  `process-steps`, `team-member`, `timeline`, `trustpilot-reviews`) — enum `["h2".."h6","p"]`,
  `default "h3"`, PHP-allowlisted, control in the pinned Settings panel. Live-verified: absent →
  `<h3>`, `h2` → `<h2>`, `p` → `<p>` with matched closing tags across 27 rendered instances.
- **`product-card`/`product-faq` canonicalised** from a numeric enum to `["h2","h3","h4","p"]`.
- **A real bug fixed:** `includes/product-card-builtin-render.php` (typed mode — the block's DEFAULT)
  cast the value with `(int)`. `(int)"h4"` is `0` in PHP, clamped to `2`, so **every typed
  product-card rendered `<h2>` regardless of the client's choice.** Fixed and live-verified.
- **`icon-list.headingLevel` gained its missing enum** (it had none, so WP validated nothing).
- **Converter tag-identity transfer fixed** — normalises string/numeric/absent enum shapes, 10 tests
  each proven to fail without the fix. ⚠ See R2 below: correct, but inert for three blocks.
- **`product-card`'s bound title now keys on `class="sgs-product-card__title"`**, not tag name; the
  tag-enumerated CSS rule is deleted. Also closed a defect where bound-mode `h3` (the default path)
  silently ignored the client's `titleColour`. **This IS deployed** — verified on the server.
- **Deploy:** ownership marker `6c994ef5`, `payload-verify PASS: all 83`. `a21dda8d` went live via a
  concurrent session's later deploy.

---

## R1 — `text-align` has no PHP emission *(highest value; blocks the initiative's W2b)*

**Verified defect.** `sgs_typography_css_rule()` in `plugins/sgs-blocks/includes/helpers-typography.php`
emits exactly **seven** properties — `font-size` (lines 101/107), `line-height` (118/124),
`letter-spacing` (136/142), `font-weight` (188), `font-style` (191), `text-transform` (195),
`text-decoration` (199). **`text-align` appears nowhere in the file** (grep: 0 matches). The typography
plan treats the shared emitter as already knowing all eight properties and calls the work a "re-skin";
for `text-align` it is **new capability**.

**Two edits that MUST land in the same commit:**
1. Extend `sgs_typography_css_rule()` to emit `text-align`.
2. Add `TextAlign` to `PREFIXED_HELPER_SUFFIXES.sgs_typography_css_rule` in
   `plugins/sgs-blocks/scripts/check-dead-controls.js:477-495` (currently 16 suffixes, no `TextAlign`).
   That array is how the gate knows an attribute is consumed via a prefixed helper. **Without it every
   new alignment control false-flags as a dead control and fails the build.** This exact bug class was
   hit live during the border-gradient rollout.

⚠ **While in that array:** it lists all six dead `*Tablet`/`*Mobile` families
(`FontSize`/`LineHeight`/`LetterSpacing` × Tablet/Mobile, at `:481-482,489-490,493-494`).
`helpers-typography.php:110-111,128-129,145-146` still **reads** them and **zero block.json declares
any** — verified. If you delete the dead families, remove them from this array in the same commit or
the gate keeps claiming consumption of attributes that no longer exist.

**Verify by effect:** a block with a `{prefix}TextAlign` attribute + control passes
`check-dead-controls.js --check`, AND the emitted CSS actually contains `text-align` — read it from the
lifted stylesheet in `uploads/sgs-css/` on the canary, not from source.

---

## R2 — the F3b gate's E12 guard: 10 blocks have no coverage

⛔ **Read the comment block already in the code first** —
`plugins/sgs-blocks/scripts/check-hardcoded-render-defaults.js` E12 section (~line 1082-1140). It
documents two candidate fixes that were **built and reverted**, and why. Do not retry either.

**The measured state.** 11 blocks declare a heading-level enum. **Only `sgs/heading` is evaluated by
E12; the other 10 are skipped** — `card-grid`, `form-review`, `icon-list`, `pricing-table`,
`process-steps`, `product-card`, `product-faq`, `team-member`, `timeline`, `trustpilot-reviews` —
because the entry guard requires **every** enum value to be a `theme.json styles.elements` key and
`p` is not one (`getAllElementKeys()` = `{button, h1-h6, heading, link}`; there is no `p`).

⚠ **This is NOT a regression.** Before D649 those blocks had no enum, a numeric enum that filtered to
an empty list, or no attribute at all — none was evaluated either. It is a **forgone gain**,
deliberately accepted. Do not "fix" it by dropping `p`: `p` is a legitimate a11y escape that
`sgs/icon-list` has shipped since FR-36-26c, and removing it would take a real capability away.

**Two approaches already ruled out:**
- ⛔ `.some()` — independently re-derived twice: it admits three enums that are not element switches
  and collide only by string coincidence (`cart.displayMode`→`link`, `heading.headingRole`→`heading`,
  `pricing-table.toggleStyle`→`button`).
- ⛔ `every(elementKey || p|div|span)` — otherwise correct, but E12 pairs the enum with **every**
  literal-defaulted attribute *without checking they style the same element*.

⚠ **The two false positives are NOT reproducible on current code — do not go hunting them.**
`icon-list.iconColour` was observed only under the reverted widening; `product-card.ctaFontWeight`
only in the window after its enum became strings and before `p` was added. Both blocks are skipped by
the entry guard today. They are evidence about the guard's *shape*, not live findings. (An earlier
version of this prompt framed them in the present tense — a council caught that.)

**The prerequisite.** Scope E12 to attributes on the same element as the enum attribute, via
`supports.sgs.elements[].attrMap`. Attributes appear to resolve to elements by prefix convention
(`ctaFontWeight` → element `cta`; `product-card` declares 13 elements including `title` and `cta`), so
a resolver may be feasible **without** hand-filling every map — establish that before choosing an
approach. ⚠ Neither `iconColour` nor `headingLevel` is mapped today on `icon-list`.

⚠ **This gate is wired into `prebuild` AND `prestart` and has NO `--self-test`.** Any change needs one,
per the project's own E6 standard. Expect widening to start evaluating 10 blocks — **triage new
findings, never baseline them** (the gate's own message says so).

---

## R3 — three blocks need `role='tag-identity'` or the converter fix stays inert

**The converter fix shipped and is correct, but returns `{}` for these three.**
`plugins/sgs-blocks/scripts/converter/db/db_lookup.py:1176-1178`'s `tag_identity_attrs()` filters on
`role = 'tag-identity'`. Verified against the live DB: only `sgs/heading.level` and
`sgs/media.mediaType` carry it. `sgs/icon-list.headingLevel` is `role='technical'`;
`sgs/product-card.headingLevel` and `sgs/product-faq.headingLevel` are `role='enum-mode'`.

**Needed:** reclassify those three to `role='tag-identity'`, then a `/sgs-update` reseed.

⚠ **Cross-track action.** A shared `sgs-framework.db` reseed has broken both active tracks before.
Snapshot the DB first, name the rollback, and check `git worktree list` for other live worktrees. It
was deliberately deferred because sibling agents were mid-migration on these exact blocks.

⛔ **Route matters.** D643 proved that writing classifications into
`attr-classification-overrides.json` is the WRONG mechanism — it produced 51 F6
`undeclared-subelement` violations and was backed out in full. Establish the correct route for a
`role` change before editing anything.

**Verify by effect:** the converter transfers a heading level onto each of the three **on a real clone
run**, not just a unit test. `python -m pytest plugins/sgs-blocks/scripts/converter/tests/ -q` must
stay green (676 passed / 11 xfailed as of writing). ⛔ **Never "fix" an `xfail`** — they encode
behaviour the converter must not yet have. If one flips, stop and report.

---

## R4 — `gallery` / `post-grid` empty-state headings: a design call, not a code task

Both emit a hardcoded `<h3>` — `gallery/render.php:390-397` and `post-grid/render.php:343-353` — inside
`<div class="sgs-…__empty" role="status">` regions: "No images yet" / "No posts yet". Verified as
empty-state UI text, not client content, and deliberately excluded from the seven-block fix.

**The question is not "add a control."** It is whether a status message should be a heading at all — an
`<h3>` there injects a phantom entry into the document outline whenever the block renders empty.
Options: leave it; demote to `<p>` (it is not a section heading, so nothing is lost); or give it a level
control like the other seven.

Relevant standards, from primary sources: skipping a heading level is `best-practice` in axe and
*advisory* under W3C G141 — **not** a failure. But `p-as-heading` **is** `wcag2a`/`wcag131`. So the
riskier direction is styling a paragraph to look like a heading, not omitting a heading.

**Bring Bean a recommendation with reasoning, not a menu of three.**

---

## Then: the typography initiative itself (W1-W7)

With R1-R3 closed, the plan's own workstreams are unblocked. Read
`~/.claude/plans/read-all-of-spec-soft-fairy.md` for the gated order. Two things it is easy to miss:

- **Gate G1 blocks every native-supports strip.** 24 `render.php` files actively read
  `attributes.style.typography` and paint it; three shipped patterns store it; deprecations are banned
  (D270/D293). **Nothing is stripped until a stored-content migration is proven on a canary page saved
  BEFORE the change.** Stripping first silently destroys typography clients already set.
- **Population A vs B.** 22 blocks have SGS typography attributes (real standardisation); **17 declare
  `supports.typography` with ZERO attributes** — for those, "migrate onto the panel" means building
  typography from nothing. Do not dispatch one instruction across both.

---

## Standing constraints — all five items

**Git / commits**
- **Path-scope every commit**: `git commit -m "…" -- <explicit paths>`. Co-active sessions share
  `main`; a bare commit sweeps their staged work, and a pre-commit gate rejects it.
- A **merge** commit cannot be path-scoped — use the `[batch-ok:<reason>]` token. ⚠ It also needs
  `SGS_VISUAL_GATE_SKIP`/`SGS_VISUAL_GATE_REASON` set **again**, even when the commits being merged
  already carried them. That gate fails silently late in a ~250-line chain.
- An append-only log (`reports/visual-diff/manual-skips.log`) will conflict when both sides appended.
  **Resolve as a UNION** — taking either side alone discards gate history.
- ⛔ Never `--allow-dirty` on a deploy (it was D336's trigger — two client sites down ~2.5h), and never
  `--payload` to wave through another track's uncommitted work; that flag is for declaring your own.

**Evidence discipline**
- **A green build is not evidence.** Verify on the canary by reading back the rendered result.
- **Test every control in its UNSET state** as well as with a value — the D580 defect class is
  invisible any other way.
- **Never write "deployed" or "live-verified" into a doc without the deploy hash and checksum count in
  the same sentence.** A council flagged exactly this: the claim was true but unevidenced, which reads
  identically to unsubstantiated, and this project already lost time to D651's corrective commits being
  recorded as shipped when they landed after the deploy.
- **A grep is not a measurement.** A class-name count matched a JSDoc comment this session and inflated
  a census by one; a `| head -20` silently truncated a 23-row population and shipped an incomplete
  sweep. Anchor patterns, never truncate a survey, and run a **positive control** before trusting any
  zero.
- **Never fabricate a visual-diff PASS**, and never baseline a gate finding to go green — triage or
  escalate.

**Delegation**
- ⛔ **Never frame a subagent as "one seat on a council" or mention sibling agents in its prompt.** Three
  agents did this and returned fluent reports claiming they had dispatched others, with `tool_uses: 0`.
  Open with *"YOU are the only agent on this task; there are no other agents; you have no subagents"*,
  and name the failure mode up front.
- **`tool_uses: 0` in a completion notification makes a work claim fabricated by definition.** Check it,
  and check the real `git diff`, before reading any summary.
- **A rater's CONFIRMATION is not evidence either.** In this council one seat confirmed a claim as
  "byte-identical, diffed character for character" that was demonstrably false. Settle rater
  disagreements from source, never by vote.
- **Tell every agent to run builds synchronously, never in the background** — backgrounded builds in a
  subagent stall the turn; three agents lost round-trips to this.
- **One worktree per agent.** Three agents in one directory clobbered each other on this repo.