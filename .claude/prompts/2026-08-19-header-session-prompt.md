# Session prompt — `sgs/site-header` completion (parallel session)

> **Paste everything below the line into a fresh session.** It is self-contained.
> Written 2026-08-19 after a measured audit of both header blocks (D679).

---

Invoke `/autopilot` before doing anything else.

## What you are doing

Finishing `sgs/site-header` + `sgs/site-header-row` so the header has **no vestigial features, no
dead functionality, and no control a client can see but not reach**. Four tasks, all scoped and
all with the design decisions already made. You are implementing rulings, not making them.

**Nothing here is broken for a client today.** There is no outage, no failing gate, no deadline.
Every item is either a policy breach, a missing control on a working mechanism, or a naming
problem. Work carefully rather than fast.

## Read these FIRST, in full

| Read | Why |
|---|---|
| `.claude/LEDGER.md` | Live status. Its "Open — the header, audited 2026-08-19" section is your brief |
| `.claude/decisions.md` **D679** | The audit findings and the rulings behind all four tasks |
| `.claude/decisions.md` **D389** + `specs/37-HEADER-FOOTER-BUILDER.md` **FR-37-40** | The sticky model. Bean signed this — do NOT reopen it |
| `specs/37-HEADER-FOOTER-BUILDER.md` FR-37-13/14/15/27/28/37/38/39 | The header/row division of responsibility |
| `.claude/STOP-CATALOGUE.md` §A14 + §A15 | Structural defences. §A15 is the most recent |
| `plugins/sgs-blocks/scripts/consistency/golden-controls.json` | The colour-control contract, if you touch any colour control |

## The header model — settled, do not re-litigate

- **The header is ONE sticky element.** Per-row CSS sticky was REJECTED on measured evidence
  (short-parent trap: a sticky element inside a ~250px header unpins once scroll passes the header
  height, so the nav vanishes). D389, Bean-signed 2026-07-26.
- **Three fixed rows** (`top`/`middle`/`bottom`), seeded by the parent and `templateLock: 'all'`.
- **Which rows disappear when pinned** is each row's own `rowHideOnScroll`; when the header is
  pinned such a row **collapses to height 0** (measured gap: exactly 0.00 at every tier).
- ⚠ Kadence DOES offer per-row "which row survives", but via JS `position: fixed` + a measured
  placeholder spacer — **not** CSS sticky. It does not contradict D389. Do not treat "Kadence does
  it" as licence to revisit per-row CSS sticky — the short-parent trap is unchanged.

### ⭐ A HEADER-HEIGHT PRIMITIVE ALREADY EXISTS — do not rebuild it

`initHeightPublisher()` in `src/header-behaviours/view.js` measures the header with a
**ResizeObserver** and publishes `--sgs-header-height` to `:root` and `body`. It is **gated on the
COMPUTED position**, publishing an explicit `0` when the header is not actually pinned — which
correctly handles the case where a header set both sticky AND transparent computes `absolute` and
is not pinned despite carrying the sticky body class.

**Why it exists:** GSAP pinned sections were placing content in the band BEHIND the sticky header,
so a heading was invisible for the entire pin. `src/shared/effects/gsap/provider.js`'s
`chromeOffsetPx()` consumes the published value to start the pin below the chrome. That file also
records why raising the pinned element's z-index is the WRONG fix — it hides the navigation
instead, a WCAG 2.4.11 focus-obscured failure. *"The defect is GEOMETRY, not stacking."*

⛔ **D330 (2026-07-14) deliberately DELETED a duplicate `--sgs-header-height` publisher.** Do not
re-measure the header anywhere else — consume the published custom property. A second publisher is
a known, named trap. The `80px` literal in the theme's `utilities.css` is only the pre-JS fallback.

This matters for Tasks 1 and 2: anything you build that needs the header's real height already has
a correct, live, breakpoint-aware and shrink-aware source. Read it before writing any measurement.

---

## Task 1 — `contrastSafe`: stop silently overriding the operator ⭐ **do this first**

**This is a policy breach, not a feature request.** It is the highest-value item here.

**What it does now:** if the header is transparent on desktop AND the client chose "None", the
resolver silently rewrites it to `scrim` (`includes/class-sgs-header-behaviours.php:236-239`). The
client's explicit choice is discarded with no indication.

**Why that is wrong:** the locked rule `a11y-validation-feedback-informational-not-gate` — operator
accessibility failures are **notices**, never enforcement. The WCAG reasoning in the code is sound
(a transparent header over a hero image routinely fails 4.5:1) but the mechanism is not.

**Bean's ruling — implement both halves:**
1. **Make it responsive.** It is currently a flat string enum while all four of its siblings
   (`headerSticky`/`headerTransparent`/`headerShrink`/`headerHideOnScroll`) are per-device
   tri-states via `ResponsiveTriStateControl`. Contrast needs per-device most of all — a header
   transparent over a desktop hero is often solid on mobile.
2. **Turn the silent upgrade into a visible notice.** The client should SEE that their transparent
   header has a contrast risk, and be able to accept the suggestion or decline it. Do not paint a
   mode they did not choose.

⚠ **`contrastSafe` is the odd one out architecturally** — it resolves via a SECOND independent
`parse_blocks()` of the header template part and injects a **body class**, rather than the scoped
per-instance `<style>` its four siblings use. Because of that it has **no editor preview at all**
(the editor iframe body never carries frontend body classes — see
`editor-render-parity-baseline.json:28`). Decide deliberately whether to migrate it to the scoped
mechanism as part of this work, or keep the body-class path and document why. Either is defensible;
silently leaving it inconsistent is not.

All three modes paint real CSS — `assets/css/header-behaviours.css:79` (scrim `::before`), `:98`
(shadow on links/buttons), `:108` (force-solid). Verify each still paints after your change.

## Task 2 — transparent: give the client the two states that already exist

**The mechanism is built; the controls are missing.** Transparent-at-top → solid-past-50px already
works (`site-header/render.php:204-223`, keyed on `.is-header-scrolled`).

**Two gaps Bean asked for:**
1. **The scrolled-state colour is hardcoded** to `var(--wp--preset--color--surface,#ffffff)` at
   `render.php:218`. Give the client a colour control for it.
2. **The pair cannot be inverted.** A client may want colour at the top and transparency once
   scrolled. Add a direction control.

⛔ **Read `render.php:204-217`'s comment before touching that rule.** It documents
`P-TRANSPARENT-HEADER-SCROLLED-BG-NOT-FLIPPING`: the rule MUST carry `!important` because
`sgs_merge_tri_state_declarations()` emits every resting declaration with `!important`, and an
`!important` declaration beats a non-`!important` one regardless of specificity. Breaking that
re-opens a shipped bug.

⛔ Any colour control you add must conform to `scripts/consistency/golden-controls.json` — canonical
component `SgsColourPanel` → `DesignTokenPicker`, minimum 2 states, gradient unless exempted with a
reason. Rule `31-golden-colour-control` will flag it otherwise. Run
`node scripts/inspector-scan/run.js --check` and expect its `openBacklog` to need lowering, not
raising, if you do this well.

## Task 3 — rename the row-level controls so they stop looking like duplicates

**The duplication is a NAMING problem, not redundancy.** Header and row versions of the same three
concepts produce genuinely different output:

| | Header version | Row version |
|---|---|---|
| Transparent | Lifts the whole header **out of document flow** (content slides under) + triggers the WCAG safeguard | Changes **one row's background colour**. Nothing else |
| Shrink | Shrinks the **header's own padding** | Shrinks **that row's** padding, and can hide one chosen non-essential child |
| Hide on scroll | Translates the **entire header** as one unit | Hides **one row**, collapsing to height 0 when the header is pinned |

Deleting either side loses real capability. **Rename the ROW-level three** so a client can tell them
apart at a glance. Suggested direction (yours to refine): "Row background transparent", "Collapse
this row on scroll", "Reduce this row's padding on scroll".

⛔ Do Task 2 BEFORE this — the transparent redesign touches the same controls, and renaming twice
is worse than renaming late.

⛔ These are user-facing strings: UK English, `__( '…', 'sgs-blocks' )`, and check whether the label
appears in any pattern, test or doc that would need updating with it.

## Task 4 — the composite undercount in `check-simple-surface-cap.js`

The script counts a **composite component mount as ONE row** without opening the component. Measured
wrong in both directions on the row blocks:
- `RowScrollBehaviourControls` counted 1, renders **three** `isShownByDefault` toggles → under by 2
- `ResponsiveBoxControls` counted 1, has **zero** `isShownByDefault` → over by 1

The limitation is documented in the script's own header (added 2026-08-19). **The fix is to resolve
the mount to its source file and count its `isShownByDefault` items.**

⚠ **This is why it was not fixed already:** doing so also moves the figures for `sgs/site-header`
and `sgs/site-footer`, and those carry human rulings made against the CURRENT numbers. So:
1. Fix the detector.
2. Re-measure all four blocks.
3. **Report the new figures to Bean before acting on them** — do not "fix" a block to hit a number.
The script is ADVISORY (exits 0 without `--strict`) and must stay that way. The ≤3 figure is a
default, not a ceiling — Bean-confirmed. Widening what it measures must not turn it into a gate.

## Also on the table (Bean has not ruled; ask before acting)

**13 unreachable header attributes** — `shadow`, 12 × `shapeDivider*`, `tagName`. `render.php` WOULD
honour them but no control exists, so no client can set them. Either mount controls or delete. Shape
dividers on a header are questionable; `shadow` is reasonable. **Ask Bean which.**

---

## Skills — invoke these, with when

| Skill | When |
|---|---|
| `/autopilot` | **FIRST, before any response.** Establishes live skill routing + ADHD support for the whole session |
| `/systematic-debugging` | The moment anything behaves unexpectedly. Root cause before fix — non-negotiable on this repo |
| `/brainstorming` | Before Task 1's "notice instead of silent switch" — the UX shape is a real design question |
| `/sgs-wp-engine` | Any SGS block/theme work. The framework skill |
| `/wp-block-development` | Core WP block-API questions — `block.json`, attributes, supports, deprecations |
| `/qc-inline` | After each task. Small artefact, inline verification |
| `/qc-council` | ONLY if you end up with 2+ competing fix-shapes and need empirical validation before dispatch |
| `/verify-loop` | Any load-bearing claim — 2 independent evidence sources |
| `/visual-qa` + `/a11y-audit` | Task 1 and 2 both change rendered output. Contrast work especially |
| `/dispatching-parallel-agents` | If you split independent work. Invoke the SKILL, don't hand-roll dispatch |
| `/delegate` | Per branch, to pick each model. Never hardcode |
| `/capture-lesson` | Any new architectural rule you surface |
| `/handoff` | Session close |

## Tools & MCP

| Tool | Use for |
|---|---|
| **Playwright MCP** | ⭐ Task 1 + 2 REQUIRE live verification. Contrast and transparency cannot be proven from a green build |
| **Chrome DevTools MCP** | Computed-style checks, contrast measurement on the real painted element |
| `/library-docs` | WordPress component APIs (`ToolsPanel`, `Notice`, `ColorPalette`) — current docs, not memory |
| `/sgs-db` | `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py` — the framework DB. ⛔ The canonical DB is OUTSIDE the repo; two 0-byte decoys sit inside it |
| `/wp-blocks` | Block schemas + attributes. Run BEFORE any "attribute X is missing" claim |
| `search.py` / `/search` | Web lookups (`python ~/.claude/hooks/search.py`) |
| **Canary credentials** | `.claude/secrets/sandybrown.env` — gitignored, ALWAYS available. Browser login + REST app password. Do not ask for them, do not work around them |

## Research approach

1. **Read the audit before re-deriving it.** D679 + the LEDGER's header section already contain the
   measured findings. Do not re-audit from scratch — verify a specific claim if you doubt it.
2. **For Task 1's notice UX:** check how WordPress core surfaces a non-blocking accessibility
   warning. `/library-docs` for `@wordpress/components` `Notice`, and look at how core's own
   colour contrast checker (`ContrastChecker`) presents its warning — it is the closest precedent
   in the editor and it warns without enforcing, which is exactly the target behaviour.
3. **For Task 2's direction control:** the competitor evidence is already gathered (see D679).
   Kadence/Astra/Blocksy each ship transparent-header controls — look at how they let an operator
   express "which state is which" if you need a UI precedent.
4. **Before any "X is missing/dead" claim:** query `/wp-blocks` or `/sgs-db` first. This project has
   a standing rule (R-31-8) against asserting absence without schema enumeration.
5. **Verify on the CANARY, not a local build.** `sandybrown-nightingale-600381.hostingersite.com`.

## Hard constraints — earned from real incidents

- ⛔ **COMMIT before dispatching ANY agent, even a read-only one.** A task framing does not
  constrain tool access; only committing does.
- ⛔ **Deploy is ONE path:** `python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown`.
  NEVER hand-roll tar/scp/ssh — that took two client sites down for ~2.5h (D336).
- ⛔ **No block version bumps, no `deprecated.js`** — banned pre-production (D270/D293).
- ⛔ **No inline `style=""` property declarations** — Spec 32. Emit scoped CSS instead.
- ⛔ **`git grep` only, never `grep -r`.** Scope a census to the exact filename that defines it.
- ⛔ **Never pipe a population-defining survey through `head -N`.** Count first.
- ⛔ **A false positive is a detector bug, never baseline fodder.**
- ⛔ **The advisory ratchet does NOT self-heal** — if you clear findings, lower the `openBacklog` in
  the same commit or the gain becomes silent slack.
- ⛔ **Before citing a file as a source of truth, grep for a reader of the KEY, not the file.** Three
  "authoritative" sources proved unread on 2026-08-19.
- ⛔ **The visual-diff gate:** never `--no-verify`. Use the scoped
  `SGS_VISUAL_GATE_SKIP` + `SGS_VISUAL_GATE_REASON`, and make the reason a real proof.
- ⛔ **A command-scanning hook matches your script content and commit prose too** — reword rather
  than reaching for a bypass token.

## Definition of done

1. `contrastSafe` is per-device AND no longer silently overrides an operator's explicit choice.
2. The client can set the scrolled-state background colour and invert the transparent pair.
3. Row-level controls are named so a client can tell them apart from the header-level ones.
4. `check-simple-surface-cap.js` resolves composites; new figures reported to Bean, not acted on.
5. **Live-verified in a browser** — screenshots before/after at 375 / 768 / 1440. A green build is
   not evidence for any of tasks 1-3.
6. `npm run prebuild` exit 0, run synchronously. `handoff-preflight.py --check` passes.
7. D-numbers recorded, LEDGER updated, `/handoff` run.

⛔ **Never close a step on a green exit code.** On this repo an aborted deploy and a dropped stash
both reported success.
