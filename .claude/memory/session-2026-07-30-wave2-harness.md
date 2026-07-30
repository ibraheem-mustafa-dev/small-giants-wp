---
doc_type: session
project: small-giants-wp
date: 2026-07-30
track: merged Spec 36+37 nav/header/footer — Wave 2, session 1 of ~3
outcome: W2-i CLOSED (harness honesty). W2-a NOT started — deliberate fresh-session handoff.
commits: 4f9dc0ba · 66084dc9 · 4effc395 (all pushed)
plan: ~/.claude/plans/spec-36-37-iterative-kahn.md
---

# Session 2026-07-30 — Wave 2 session 1: the harness, and what measuring it properly found

Executes `plans/2026-07-29-merged-spec36-37-track-strategic-plan.md` Wave 2.
**W2-i complete. W2-a (drawer CPT) deliberately handed to a fresh session** at Bean's
choice — it is the bigger half and the plan carries every fix it needs verbatim.

## Planning: the plan was rewritten twice before a line of code was written

**Bean rejected v1 of the design-gate write-ups as too technical to decide on**, and
separately caught two real scoping errors. Both corrections landed:

1. **The cloner's `computed-parity.js` must NOT be touched.** Its
   `CHROME_TAGS = {HEADER,FOOTER,NAV}` exclusion is deliberate and correct — it
   measures page BODIES for the universal cloner — and it is a council-gated
   trust-bearing instrument (Spec 20 v1.1.0, D315, Bean-signed). My draft proposed
   adding flags to it for the nav track's convenience: blast radius for no benefit.
   **Also corrected: my claim that it had been "abandoned" was wrong** — it is live;
   what Bean remembered was the *independent DOM ledger* run alongside it as a
   deliberately different methodology (D318).
2. **Critiquing cloning tooling before header/footer exists is out of order.**

**`/research-buddies` was skipped and Bean called it out.** Run retrospectively; it
changed the recommendations rather than confirming them (see the gates below).

## The design gates — both signed, one of them wrongly

Bean signed **A1** (per-device contrast control) and **B1→B2** (fix the header-offset
primitive, then build the pill).

**Then `/qc-council` found A1 reverses Bean's own D402**, from two days earlier:
> *"`contrastSafe` (4-value enum) and Burger-Menu breakpoint (named-preset enum) KEEP
> their shapes (tri-state would be a category error)."* — `decisions.md:352-353`

I had presented A1 without D402 on the table. **My failure**, and exactly what
`recheck-spec-against-early-decisions-during-multigate-churn` exists to prevent.

I corrected the rater's over-claim in Bean's favour: "tri-state" (`inherit/on/off` per
tier) genuinely IS a category error for a 4-value enum, so D402 was right; a per-device
*enum object* is a different shape D402 didn't literally rule on. **But the
accessibility hole needs no reshape at all** — fire the auto-upgrade when ANY tier is
transparent. One condition.

**→ Bean re-decided as A1-lite (2026-07-30):** any-tier auto-upgrade + relabel "Text
shadow" as decorative-only. No reshape, no migration, D402-honoured. Per-device enum is
a SEPARATE future decision that must cite D402.

**Bean also chose:** declare the editor-canvas limitation AND add an editor notice on
the burger (a page being edited will show no drawer in canvas, because `wp_footer`
never fires there).

## The Q4 mobile-pill question — measured, and shadcn is not the authority

Bean asked what shadcn does at mobile, correctly reasoning that guessing means rework at
the cloning proof gate. **Measured in a real browser** (its own preview iframe):

| Viewport | shadcn "Floating Pill Navbar" |
|---|---|
| 1440px | 480.3 × 40, centred, `border-radius: 9999px`, `position: static` |
| **390px** | **width still 480.3px**, `x = −45.16px` — **overflows the viewport ~45px each side**; no burger; **zero `sm:`/`md:`/`lg:` classes anywhere** |

It has **no responsive behaviour at all** and would fail our own never-overflow gate.
Source is paywalled (401 on the registry JSON), so those classes came from the rendered
DOM. **Not an authority on this axis.**

Our own MEASURED teardown data stands unchallenged: **lamalama at 400px = a 368px pill
at 16px insets**, radius kept, from `calc(100vw−32px)` capped at 438. No measured
reference becomes a flush square bar. **`min(cap, calc(100% − 2×inset))` makes our
implementation better than the reference, not a copy.**

An earlier research pass claiming "pill hides below `md`, hamburger takes over" is
**RETIRED** — its corpus was AI-scaffolded portfolio repos and it had failed to extract
shadcn's real behaviour. Its one surviving insight: it conflated *links collapsing to a
burger* (an existing `sgs/nav-menu` responsive mode) with *the container's shape*.

**Recommended and open for Bean:** flat shape value + one opt-in "collapse to full-width
below `<breakpoint>`" toggle (default off), mirroring the drawer's already-designed
mechanism — NOT three per-tier controls. Grounded in §C of
`reports/2026-07-28-nav-drawer-desktop-variant-research.md`, and flagged honestly as an
analogy from a drawer-*variant* finding to a header-*shape* question.

## W2-i — what was built (3 commits, all pushed)

### `4f9dc0ba` — the openness guard is shared; every capture can now fail

The guard added 2026-07-29 lived **inline inside `axe-run.mjs`'s `main()`**, which is
precisely why three sibling scripts never got it. Extracted to
`scripts/nav-qa/lib/openness-guard.mjs`; all four consumers import it. Shared exit
vocabulary: `0` ok · `1` failures · `2` usage · **`3` VACUOUS**.

- **`shoot-drawer-pairs.mjs`** — the REFERENCE side had **no open check at all** (how a
  closed homepage became "the reference"). Both sides guarded; a reference whose recipe
  names no `panel` selector returns **UNVERIFIED** and is not presentable as evidence.
  `main()` gained an exit code — it previously reported success with 0 of N drawers open.
- **`sweep-drawer-variants.mjs`** — `openDrawer()` clicked and assumed. Now asserts;
  vacuity gets **exit 3** instead of collapsing into exit 1, so "4 failed checks" on an
  unopened drawer no longer reads as 4 product defects. Pre-click failures (burger
  absent / not visible at this width) are vacuous too — nothing was measured there either.
- **`elementfrompoint-sweep.mjs`** — clicked, waited 350ms, hoped. Now asserts against a
  new `openScope` config key; a config lacking it is stamped `UNASSERTED` with a loud
  warning. **Both shipped probes configs now set it**, so they are actually guarded.
- **`axe-run.mjs`** — behaviour deliberately unchanged, **proven** by running HEAD vs
  rewired against the same live fixture: identical exit code, guard status, measured box
  (358×517), focusables (9), violations (0).

**Proof is re-runnable now, not prose:** `--self-test` = 7 cases, 6 negative controls.
It caught a bad fixture of **mine** on first run — a `<dialog>` carries UA
padding+border, so `width:0;height:0` still renders 38×38 and the guard was right.

### `66084dc9` — drawer contrast measured per element; axe cannot see inside a `<dialog>`

**The measure-first gate falsified BOTH standing hypotheses.**

Measured on the canary, guard PASSING: the defect is **fully live** — 6 elements at
exactly **1:1** contrast, `rgb(58,46,38)` on an identical background, 3 each on the two
dark `footer-bg` variants. Visible boxes, real text, invisible to a reader. **And axe
reported ZERO violations.**

**Why (proven, not inferred):** axe puts **every** text element inside an open `<dialog>`
into its **INCOMPLETE** bucket — *"Element's background color could not be determined
because it is overlapped by another element"* — because a dialog renders in the **top
layer** above a `::backdrop`. 8 of 8 elements. **Axe's contrast rule can never produce a
violation inside a drawer.**

Two real defects followed, both fixed:

1. `axe-run.mjs` passed `resultTypes: ['violations']`, **discarding the incomplete
   bucket** — printing a confident "0 violations" over 8 unresolved elements, 3 invisible.
2. **The plan's own fix was wrong.** It said "delegate contrast to axe's color-contrast
   rule". That would have swapped a check missing 6 elements for one missing all 8.
   Recorded in the README so nobody re-proposes it.

`checkHoverContrast()` → `checkRestContrast()`. The old one measured one selector
(`.sgs-nav-menu__link-text`) — which is exactly why the icon-list defect sailed through —
composited over hardcoded white, applied that single background to every element, and
never hovered anything despite its name. The new one walks every element owning a text
node, resolves each one's **own** effective background by climbing ancestors to the first
non-transparent `backgroundColor` (compositing alpha down to the page background), and
applies the WCAG large-text relaxation per element.

**Verified control pair at 375px:**

| Variant | drawer bg | measured | real failures |
|---|---|---|---|
| `centred-statement` | dark `footer-bg` | 8 | **3** (icon-list 1:1) |
| `split-zone-serif` | dark `footer-bg` | 11 | **3** (icon-list 1:1) |
| `floating-capped-card` | `surface` | 9 | 0 |
| `two-column-editorial` | `surface` | 10 | 0 |

`ACCEPTED_CONTRAST_PAIRS` honours Bean's `P-MAMAS-PRIMARY-CONTRAST` ruling ("report and
cite it, never suppress") — an accepted pair moves to its own `acceptedFailures` bucket
and is still printed.

### `4effc395` — `--scope`/`--open` on `extract-css-diff.js` (Gate 2's instrument)

Council BLOCKER: my Gate 2 design matched elements by **DOM position**, violating
Bean-locked rule 4a (compare by normalised **text content**) — a rule the same plan cited
elsewhere. And `extract-css-diff.js` already did the right thing: two live URLs, computed
styles, **keyed by text with a shape-role fallback**.

So it was extended, not duplicated: `--scope <selector>` (a drawer has no heading to walk
up from), `--open`/`--open-via` via the shared guard (dynamic `import()` — this file is
CJS, the guard ESM). **The guard self-arms on a `<dialog>` scope even without `--open`**,
so forgetting to open yields VACUOUS (exit 3) rather than "identical" from two
`display:none` dialogs.

Verified: self-comparison opened → 0 mismatches; two different variants → real mismatches
(rect.w/h, width, height, borderTopColor, backgroundColor, color); dialog scope without
`--open` → exit 3; existing `--section` mode → unchanged.

**One rater claim I checked and REJECTED:** it argued `$uid` differs between the two
renders because `$anchor_val` is a post-specific salt. It is not —
`nav-drawer/render.php:69-71` derives it from the `anchor` **attribute**, and `:85` hashes
`wp_json_encode($attributes) . $anchor_val`, so identical attributes give an identical uid
and identical classes. What IS real: the scoped `<style>` is lifted out of position by
`class-sgs-css-registry.php` at `render_block` priority 99. Text-keying makes both moot.

## `/qc-council` on the plan — 3 blockers, 5 defects, before any build

Bean requested it. Cross-model (3 × Sonnet raters, none sharing the Opus model that wrote
the plan) + a mechanical structural pre-gate.

- **Pre-gate caught a false citation of mine:** I wrote that `shoot-drawer-pairs.mjs`'s
  `main()` "has no `process.exit`, always exits 0". It has three. The substantive point
  survived (none fires on a failed cell) but I'd inherited an Explore agent's summary
  without checking it — in a plan whose whole premise is that unverified evidence caused
  the 21/21 false pass.
- **BLOCKER: A1 vs D402** (above).
- **BLOCKER: rule-4a violation in Gate 2** (above).
- **BLOCKER, still OPEN for W2-a: the landmark guard has no input.**
  `grep -n "Active_Layout|mark_served|has_served" src/blocks/nav-drawer/render.php` →
  **zero matches** (verified by me). The 8 pattern-embedded drawers render entirely
  outside the Active-Layout machinery, so the planned guard reads false and **two
  `<dialog id="sgs-nav-drawer">` would ship**. Fix is one line with an exact precedent at
  `class-sgs-header-rules.php:253-258`. **Must land in the same commit as the render path.**
- **CLEARED: B1's double-correction risk does NOT fire.** All four consumers of
  `--sgs-header-height` audited — `header-behaviours.css:34-36`, `utilities.css:26-35`,
  `gsap/provider.js:160-196`, `nav-interactivity/store.js:486-509`. **None compensates**;
  they consume raw or bypass it entirely. Status: audited, absent.
- **D391 must be preserved** — publishing `0` when unpinned is a deliberate WCAG 2.4.11
  fix (`decisions.md:446`). B1 changes what the *pinned* value means, not that gate.

## My own errors this session, recorded so none is inherited

1. **Cited `shoot-drawer-pairs.mjs`'s exit behaviour from an agent's summary** without
   opening the file. Wrong mechanism, wrong line number; right conclusion by luck.
2. **Proposed delegating drawer contrast to axe** — measured, it cannot work at all.
3. **Wrote a rule-4a violation** (position-keying) into a plan that cites rule 4a.
4. **Presented A1 without D402**, letting Bean reverse his own two-day-old decision.
5. **Claimed `computed-parity.js` was abandoned.** It is live and Bean-signed.
6. **Built a bad self-test fixture** (`width:0` on a `<dialog>` still renders 38×38).
7. **Built a negative control WordPress defeated** — a bogus *path* on the canary is
   silently redirected to the real fixture by canonical-URL guessing (confirmed
   `curl -L`). Use a different HOST.
8. **Skipped `/research-buddies`** until Bean asked.

## State for the next session

- **Branch `main`**, clean for my paths. **D-ceiling D417** at session start (not D416 as
  the plan's frontmatter said — the motion track landed `7fae52dd` in between); this
  session adds **D418**.
- **Shared worktree:** the co-active motion track holds uncommitted
  `plugins/sgs-blocks/includes/lucide-icons.php` and
  `.claude/plans/2026-07-29-motion-wave-B-session-prompt.md`. **Untouched — leave them.**
- **No deploy happened.** Nothing was built or shipped to the canary; W2-i is
  script-only. The canary is unchanged.
- **Canary fixtures used (not created):** pages `poc-drawer-{floating-capped-card,
  centred-statement,split-zone-serif,two-column-editorial}`.
- `P-ICON-LIST-INVISIBLE-ON-DARK-DRAWER` is now **DETECTABLE but still OPEN** — scheduled
  W2-g. This session made it visible to the harness; it did not fix it.
