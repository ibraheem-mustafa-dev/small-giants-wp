# Follow-up prompt — typography / heading-level residuals (post-D649)

Paste the block below into a fresh session. Everything it needs is stated inline; it inherits no
context from the session that produced it.

---

Invoke `/autopilot` before doing anything else.

## Read first (in this order, do not skip)

1. `.claude/decisions.md` **D649** — the typography initiative's scoping rulings.
2. `~/.claude/plans/read-all-of-spec-soft-fairy.md` — the approved plan (workstreams, gated order).
3. `.claude/LEDGER.md` §"Task B" — what shipped 2026-08-17 and what is still open.
4. `.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` — the governing spec, in full.

**Verify before trusting any of it:** re-derive the branch, HEAD and D-ceiling yourself
(`git branch --show-current`; `git log --oneline -1`;
`grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`). The plan's own
baseline went stale mid-session once already.

## Context in one paragraph

Heading level across the framework was inconsistent and partly broken. On 2026-08-17 three fixes
shipped, deployed and were live-verified: seven blocks that hardcoded `<h3>` gained a `headingLevel`
control; `product-card`/`product-faq` were canonicalised from a numeric enum to a string enum; and
the cloning converter's tag-identity transfer was made robust to both enum shapes. Five residuals
were deliberately left, each for a stated reason. They are below, ordered by value.

---

## R1 — `text-align` has no PHP emission *(blocks the typography initiative's W2b)*

**The defect, verified.** `sgs_typography_css_rule()` in
`plugins/sgs-blocks/includes/helpers-typography.php` emits **seven** properties — font-size,
font-weight, font-style, line-height, letter-spacing, text-transform, text-decoration. **`text-align`
has zero references in that file.** The typography plan treats the shared emitter as already knowing
all eight and describes the work as a "re-skin"; for `text-align` it is **new capability**.

**Two edits, and they must land in the SAME commit:**
1. Extend `sgs_typography_css_rule()` to emit `text-align`.
2. Add `TextAlign` to `PREFIXED_HELPER_SUFFIXES.sgs_typography_css_rule` in
   `plugins/sgs-blocks/scripts/check-dead-controls.js` (~line 477-495). That array is how the gate
   knows an attribute is consumed via a prefixed helper. **Without it, every new alignment control
   false-flags as a dead control and fails the build.** This exact class of bug was hit live during
   the border-gradient rollout.

⚠ **While you are in that array:** it still lists all six dead `*Tablet`/`*Mobile` families
(`FontSizeTablet`/`Mobile`, `LineHeightTablet`/`Mobile`, `LetterSpacingTablet`/`Mobile`). No block
declares any of them, and `helpers-typography.php` still *reads* them. If you delete the dead
families, remove them from this array in the same commit or the gate keeps claiming consumption of
attributes that no longer exist.

**Verify:** a block with a `{prefix}TextAlign` attribute and a control passes
`check-dead-controls.js --check`; the emitted CSS actually contains `text-align` (read it from the
lifted stylesheet in `uploads/sgs-css/`, not from the source).

---

## R2 — the F3b gate's E12 guard is element-blind *(now twice-evidenced)*

**Do not attempt this without reading the long comment already in the code.**
`plugins/sgs-blocks/scripts/check-hardcoded-render-defaults.js`, the E12 block (~line 1082-1115),
documents two candidate fixes that were built and reverted, and why.

**The defect.** The guard admits an enum only if **every** value is a `theme.json styles.elements`
key. A heading-level enum legitimately offers `p` (the "decorative title, keep it out of the document
outline" escape that `sgs/icon-list` has shipped since FR-36-26c), and theme.json declares no `p`
element — so one such value disqualifies the whole enum and the block goes unchecked. Today
**`sgs/heading` is the only block this gate evaluates.**

**Two things NOT to do:**
- ⛔ Relaxing to `.some()` — measured: it newly admits three enums that are not element switches and
  collide only by string coincidence (`cart.displayMode`→`link`, `heading.headingRole`→`heading`,
  `pricing-table.toggleStyle`→`button`).
- ⛔ The otherwise-correct `every(elementKey || p|div|span)` form — it was built, and immediately
  false-positived, because **E12 pairs the enum with every literal-defaulted attribute without
  checking they share an element.** Two independent confirmations: `icon-list.iconColour` (a per-item
  marker) flagged against `headingLevel` (the list heading), and `product-card.ctaFontWeight` (the CTA
  button, default `600`) flagged against the same. The imprecision is invisible today only because
  `sgs/heading` is the sole block evaluated, and there every styling attr genuinely is the heading.

**The prerequisite.** Scope E12 to attributes on the SAME element as the enum attribute, via
`supports.sgs.elements[].attrMap`. ⚠ This needs the manifest filled first: `icon-list` declares five
elements and maps **neither** `iconColour` nor `headingLevel`; `product-card` declares thirteen
including both `title` and `cta` but maps neither of the two attributes involved. Attributes resolve
to elements by prefix convention (`ctaFontWeight` → `cta`), so a resolver may be feasible without
hand-filling every map — establish that before choosing an approach.

⚠ **This gate is wired into both `prebuild` and `prestart` and has NO `--self-test`.** Any change
needs one, per the project's own E6 standard. Note also that including `p` in every heading-level
enum is currently what keeps the newly-fixed blocks *outside* this gate — widening it will start
evaluating them, so expect new findings and triage them rather than baselining.

---

## R3 — three blocks need `role='tag-identity'` for the converter fix to activate

**The converter fix shipped and is correct, but is currently inert for these blocks.**
`plugins/sgs-blocks/scripts/converter/db/db_lookup.py`'s `tag_identity_attrs()` filters on
`role = 'tag-identity'`. Verified against the live DB: only `sgs/heading.level` and
`sgs/media.mediaType` carry that role. `sgs/product-card.headingLevel` and
`sgs/product-faq.headingLevel` are `role='enum-mode'`; `sgs/icon-list.headingLevel` is
`role='technical'`. So the role filter excludes all three regardless of the enum-shape bugs that were
fixed.

**What is needed:** reclassify those three to `role='tag-identity'`, then a `/sgs-update` reseed.

⚠ **This is a cross-track action.** A shared `sgs-framework.db` reseed has broken both active tracks
before. Snapshot the DB first, name the rollback, and check for other live worktrees
(`git worktree list`) before running it. It was deliberately not done at fix time because two sibling
agents were mid-migration on these exact blocks.

⚠ **Route matters:** D643 proved that writing classifications into
`attr-classification-overrides.json` is the WRONG mechanism — it produced 51 F6
`undeclared-subelement` violations and had to be backed out in full. Establish the correct route for a
`role` change before editing anything.

**Verify:** the converter transfers a heading level onto each of the three on a real clone run, not
just in a unit test. `python -m pytest plugins/sgs-blocks/scripts/converter/tests/ -q` must stay green
(676 passed / 11 xfailed at time of writing; **do not "fix" an xfail** — they encode behaviour the
converter must not yet have).

---

## R4 — `gallery` and `post-grid` empty-state headings need a design call

Both emit a hardcoded `<h3>` (`gallery/render.php:396`, `post-grid/render.php:351`) — but these are
**empty-state placeholders** ("No images yet" / "No posts yet") inside `role="status"` regions, not
client content. They were deliberately excluded from the seven-block fix.

**The question is not "add a control".** It is whether a status message should be a heading at all —
an `<h3>` there injects a phantom entry into the document outline whenever a gallery happens to be
empty. Options: leave as-is; demote to `<p>` (loses nothing, it is not a section heading); or give it
a level control like the other seven. Needs a decision, not a guess. WCAG 1.3.1 is the relevant
criterion; note that skipping a heading level is `best-practice` in axe and *advisory* under W3C
G141, whereas `p-as-heading` **is** `wcag2a`/`wcag131`.

---

## R5 — deploy the pending product-card title-CSS commit

`a21dda8d` (bound-mode title styling keyed on the class rather than the tag name) is **committed and
pushed but not yet deployed.** The deploy was correctly refused by `build-deploy.py` because a
concurrent session had uncommitted `mega-aside`/`mega-group`/`mega-panel` edits baked into the build
output — the D336 protection working as designed.

**Just deploy it once the tree is clean:**
`python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown`
⛔ Do NOT reach for `--allow-dirty` (an uncommitted edit was D336's trigger, which took two client
sites down for ~2.5h) and do NOT use `--payload` to wave through another track's work — that flag is
for declaring your *own* deliberate uncommitted payload.

**Then verify live, by effect not by build status:** render a bound-mode `sgs/product-card` at
`headingLevel: "p"` and confirm the title picks up the card's title styling (font-size 20px /
weight 500 / the title colour) rather than falling back to unstyled browser paragraph sizing. Create
the probe via REST, read the computed style back, then force-delete the page and confirm 404.

---

## Standing constraints (apply to all five)

- **Path-scope every commit**: `git commit -m "…" -- <explicit paths>`. Co-active sessions share
  `main`; a bare commit sweeps their staged work and a pre-commit gate rejects it. A **merge** commit
  cannot be path-scoped — use the `[batch-ok:<reason>]` token, and note it needs
  `SGS_VISUAL_GATE_SKIP`/`SGS_VISUAL_GATE_REASON` set **again** even when its constituent commits
  already carried them.
- **No deprecations, no version bumps** (D270/D293). Attribute shapes may change freely.
- **WordPress silently discards** an undeclared attribute and **silently coerces** a type mismatch —
  green build, no error, value gone. Declare before you read; check stored values before changing a
  type.
- **A green build is not evidence.** Verify on the canary by reading back the rendered result. Test
  every control in its **unset** state as well as with a value — the D580 defect class is invisible
  any other way.
- **A grep is not a measurement.** A class-name count matched a JSDoc comment during this work and
  inflated a census. Anchor patterns, and run a **positive control** before trusting any zero.
- **Never fabricate a visual-diff PASS**, and never baseline a gate finding to make the build go
  green — triage it or escalate it.
