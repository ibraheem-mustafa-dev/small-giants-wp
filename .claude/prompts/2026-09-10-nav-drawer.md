# Nav-drawer track — next session

Invoke `/autopilot` before anything else.

**Scope:** this is the nav-drawer track. A second, unrelated track (parity /
clone-fidelity) is co-active on this shared checkout with its own prompt at
`.claude/prompts/2026-09-08-clone-fidelity-programme.md` — that one is RETIRED,
see `.claude/LEDGER.md`. The two tracks touch disjoint files; neither blocks the
other.

## MANDATORY READING GATE

Read these IN FULL before the first Write/Edit. Not a skim.

1. `.claude/specs/36-SGS-NAVIGATION-SYSTEM.md` — FR-36-6 (the drawer), FR-36-4
   (desktop disclosure), FR-36-10 (the ONE a11y gate), §12 rows (b)(c)(e).
2. `.claude/decisions.md` — D1009 (drawer chrome, SIGNED — not open for
   re-litigation), D1011 (non-modal approved), D1012 (`.show()` is dead code).
3. `reports/visual-diff/nav-menu-2026-09-10.md`, `nav-drawer-2026-09-10.md`,
   `business-info-2026-09-10.md` — what was measured and the actual numbers.
4. `.claude/parking.md` → `P-NAV-DRAWER-NONMODAL-BUILD` — the five work items.

---

## Task 1 (LEAD) — the drawer's sub-accordions are structurally wrong

**What:** drawer submenu items render inside the parent row instead of as
full-width rows beneath it.
**Why:** Bean's report, 2026-09-10 — *"The nav drawer's sub accordions look
horrendous because they spawn inside the parent menu item."* He opened a
Spectra/Astra Pro reference and screenshotted it: sub-items are FULL-WIDTH rows
beneath their parent, edge-to-edge, with a chevron indent.
**Estimated time:** 30 min for the markup change; the verification is the longer half.

**Measured on the canary at 375px, drawer open, submenu expanded:**

| Element | Width | Left edge |
|---|---|---|
| Drawer | 360px | 0 |
| Top-level item row | 317px | 22 |
| `.sgs-nav-menu__accordion-row` | 317px | 22 |
| `.sgs-nav-menu__accordion` (holds the submenu) | **253px** | **86** |
| `.sgs-nav-menu__sublink` | 253px | 86 |

**Root cause (traced, not guessed):** `.sgs-nav-menu__accordion-row` is
`display: flex`, and the `<details>` accordion is a flex SIBLING of the label.
The submenu therefore lays out in the leftover horizontal space BESIDE the label
rather than as a block BENEATH it. That is literally "spawning inside the parent
menu item".

**Fix location:** MARKUP, in `plugins/sgs-blocks/src/blocks/nav-menu/render.php`'s
drawer renderer. The `<details>` should wrap the whole row (summary = the label
row), with the submenu a full-width block below it. This is not a CSS tweak.

⚠ **Do not mistake the last session's fix for this fix.**
`:where(.sgs-nav-menu__bar--drawer) .sgs-nav-menu__accordion { flex-shrink: 1 }`
(commit `80ff62a55`) removed a real 201px horizontal overflow and is correct —
but it made sub-items NARROWER, not full-width. The overflow reads 0px and the
structure is still wrong. Keep the rule; fix the structure.

**Orchestration:** inline (main thread). It is one file, one structural change,
and the verification needs live measurement plus Bean's eye — not a good
delegation shape.

**Acceptance:** at 375px with a submenu open, `.sgs-nav-menu__sublink` has the
same left edge and width as a top-level row (modulo a deliberate indent), the
drawer's `scrollWidth === clientWidth`, AND Bean's eye agrees against his
Spectra screenshot. R-31-13 — the number alone does not close it.

**Adjacent, do NOT build:** Bean noted the reference opens MEGA panels inside
the drawer. FR-36-6 currently declares that a gap. Record whether the structural
fix makes it reachable and what would be needed; build nothing.

---

## Task 2 — the scoped-CSS dead write

**What:** `plugins/sgs-blocks/src/blocks/nav-drawer/render.php` assembles a
border-style override into `$scoped_css` — a variable written **exactly once and
never read or emitted**.
**Why:** an operator setting the drawer's border to "none" produces a rule that
never reaches the page. The G5 "explicit none is an override, not a no-op"
behaviour its own comment describes does not happen.
**Evidence:** 1 occurrence of `$scoped_css`, against 24 working `$css .=` sinks
as a positive control.
**Estimated time:** 10 min.
**Fix:** emit it through `$css` like every other rule in the file, then verify on
the canary that an explicit `border: none` actually lands.

---

## Task 3 — the non-modal drawer rebuild (approved D1011, ~3 hrs)

Five work items in `.claude/parking.md::P-NAV-DRAWER-NONMODAL-BUILD`. Order
matters — item 2 is a Level-A accessibility fix, currently LATENT, that becomes
live the moment the path is reachable:

1. An operator `modality` attribute selecting the branch. The current capability
   sniff can never be false (D1012) — `HTMLDialogElement` defines both `show()`
   and `showModal()`, so the `.show()` branch is unreachable by construction.
2. **Fix the `trapTab` / `freezeBackground` contradiction FIRST.** `trapTab` is
   wired outside the `if/else` so it applies to both paths; on the non-modal path
   it wraps Tab strictly inside the dialog, defeating the deliberate hole that
   keeps the burger live — leaving header controls visible, clickable and
   **keyboard-unreachable** (SC 2.1.1, Level A). See
   `STOP-DIALOG-NONMODAL-TAB-RING`.
3. An explicit z-index scale, header above drawer — the manoeuvre all seven
   measured reference sites use.
4. Move the ESC handler onto the primary path, with `stopPropagation()` so it
   does not double-fire against `mega-disclosure.js`.
5. A scrim for the partial-width anchors only (full-screen needs none). Note
   `store.js::resolveScrim` looks for `[data-sgs-nav-scrim]` and **nothing
   renders it** — verified 0 hits, positive control 5 files.

⚠ **`aria-modal="true"` must NEVER be added.** It tells assistive tech to ignore
everything outside the dialog, which would hide the deliberately-live burger and
destroy the affordance the whole change exists to enable.

---

## Dependency graph

```
Task 1 (inline, Opus) — structural markup + live verify + Bean's eye
  |
  +-- Task 2 (inline, 10 min — independent, do it while waiting on Bean's eye)
  |
  v
Task 3 (inline, Opus) — item 2 FIRST, then 1/3/4/5
  v
/qc-council before commit (binding rule for nav/converter/SGS-block logic)
```

---

## Open decisions — Bean's, not yours. Do not decide these by inference.

1. **The `header` anchor** — proposed for retirement, then the evidence moved:
   vercel, lamalama and lusion all use that geometry, and none of the three puts
   a close control in the panel. Left untouched deliberately.
2. **`burger-morph`** — a `closeStyle` value that renders a static X and animates
   nothing. Deleting it needs a `/sgs-update` reseed and touches `variations.js`.
3. **The credit link's two colour controls are CROSS-WIRED** (pre-existing,
   client-facing): `attributionHoverColour` feeds `--sgs-bi-link-hover-bg` and
   paints the 1px underline ONLY, while `attributionHoverColourFallback`,
   labelled for older browsers, feeds `--sgs-bi-link-hover-text` and paints the
   ENTIRE text sweep. No older-browser branch exists any more. Invisible to
   `check-dead-controls` because both attributes are genuinely referenced — the
   defect is a swapped MEANING.
4. **The submenu drop shadow is clipped** — `overflow-y: auto` forced
   `overflow-x` away from `visible`. Fix is to move the shadow to the wrapper,
   but that is a visual change to a shipped surface.
5. **Scroll lock has no reference count** — found THREE times independently.
   Open the drawer at scrollY 500, Ctrl+K the search palette (same store), close
   the palette: the page unlocks behind the still-open drawer and the visitor is
   teleported to the top. It also releases D340's scrollbar pin mid-session.
   ~8 lines. Highest-value of the five.

---

## Methodology guardrails — read before you trust a green check

These are this session's earned lessons, not generic advice.

- **A gate can be green in the working tree and red in an isolated worktree.**
  `build-deploy.py` builds from a temp worktree at HEAD; the DB gate reads the
  SHARED database. A peer's uncommitted classifier fix made the two disagree for
  a day. `--no-isolate` builds from the working tree.
- **Gates fail ONE AT A TIME.** Four failures in sequence last session, each
  hiding the next. "The build is broken" never means "there is one thing wrong".
- **A negative control has its own vacuity mode.** A control for the panel bound
  passed because, at that viewport, the measured and derived paths computed the
  SAME number. Re-run controls where the two paths MUST differ.
- **A live check can be vacuous too.** The bfcache verification read clean —
  drawer closed, body static, lock cleared — until a marker proved the page had
  done a full RELOAD, not a bfcache restore. A freshly loaded page always looks
  like that.
- **Verifying against the defect you named cannot see the defect you didn't.**
  Three of five regressions were this shape: correct only in the canary's
  configuration, incomplete one level down, or broken in a different medium
  (print).
- **Test the fix, not the story.** Two hypotheses were refuted by measurement
  before shipping (`min-width: 0` and `overflow-wrap: anywhere` — neither moved a
  pixel, because `flex-shrink: 0` disabled shrinking outright).
- **Deploy before measure.** A pixel or computed-style check against the canary
  before deploying is measuring stale output.
- **`/qc-council` before every commit** touching nav / converter / SGS-block
  logic (standing binding rule).

---

## State

Deployed and live-verified on the canary: panel vertical bound (measured, not
derived), drawer label wrapping, bfcache dismissal (verified-by-handler — real
Back is a full reload here, proven with a marker), trigger-anchor geometry (15px
divergence confirmed), nested-dialog Tab guard, credit hover sweep, Lenis wheel
reachability, print restore.

⚠ **A peer session's `sgs/product-card` classifier fix is STILL uncommitted.**
Any clean or isolated build fails `db-consistency` on
`pillFontWeight`/`pillFontStyle`. `--no-isolate` gets past it; a fresh clone will
not. Needs that session to commit.
