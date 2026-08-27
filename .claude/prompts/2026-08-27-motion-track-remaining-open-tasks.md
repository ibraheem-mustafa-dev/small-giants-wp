# Motion Track — remaining open tasks

Invoke `/autopilot` first.

**Bean wants every design-gate item below decided by him personally, before any build starts.**
Flag these clearly. Don't guess a shape and build it.

## Read first

1. `.claude/LEDGER.md` — Motion Track section. Confirm nothing below has moved since this was written.
2. `.claude/specs/38-SGS-MOTION-SYSTEM.md` — the §3.3 subsection named under each task.
3. `.claude/decisions.md` D805–D829 for full context on what closed this session.

Verify in the same command as any commit:

```bash
git branch --show-current
grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1
```

⛔ **Wave-gradient / Stripe-hero-POC (FR-38-31) is a separate, currently active track.** Don't
touch `fx-wave-gradient.css`, `webgl/wave-gradient.js`, or anything under
`.claude/scratch/stripe-hero-poc/`. A different session owns it live — no overlap, so leave it alone.

⛔ **Framebuffer / multi-pass rendering is barred, not a task.** Rejected three separate times
(D791, D794, D824) on cost grounds — a post-process pass alone measured 70% of one effect's frame
budget. Never propose it as a small increment. Any future attempt needs its own Rule-7 design gate.

⛔ **Commit by exact path, never `git add -A`.** The shared `main` tree has caused deploy
collisions five times today across concurrent tracks. Deploy from an isolated `git worktree`.

---

## 🔴 Design gates — Bean decides, nothing builds first

### 1. `floating-objects` cursor-field type

The cursor-reactive field system (FR-38-25) ships four field types. A fifth, `floating-objects`,
is named in the spec as a future type with no shape decided.

**The open question:** which children of a block become floating objects, and how does a block
opt in? The direction already set for this system: a per-instance flag on a decorative child,
declared in that block's own `block.json` `supports.sgs` — never a hand-maintained list of block
names, never default-on for an existing block.

- **Estimate:** 10–15 min to decide the shape with Bean; 20–30 min to build once decided.
- **Likely files:** `plugins/sgs-blocks/src/shared/effects/cursor-field.js`,
  `includes/fx-cursor-field.php`, `assets/css/fx-cursor-field.css`, the `block.json` of whichever
  block(s) opt in, `.claude/specs/38-SGS-MOTION-SYSTEM.md` §3.3 FR-38-25.

### 2. Generative cover images

Approved in principle, never scoped. The original blocker — needing D781's palette-texture
pipeline — was measured false on 2026-08-25. Scope from form, ground, and hue adjacency instead,
the same lesson the wave-gradient rework learned this session.

**The open question:** what actually generates the cover — an offline script, a build-time step,
a live call? What is the visual target?

- **Estimate:** 15–20 min scoping conversation with Bean before any build estimate is possible.
- **Likely files:** none yet — greenfield. Possibly a new script under `plugins/sgs-blocks/scripts/`,
  a new block or an extension to `decorative-image`, `.claude/specs/38-SGS-MOTION-SYSTEM.md`.

### 3. `sgs/decorative-image` naked mode doesn't receive surface treatments

The surface-treatment boot module only finds nested `<img>` tags. In "naked mode,"
`sgs_responsive_image()` emits the `<img>` as the block's root element — there's nothing nested
to find.

**The open question:** re-parent the image inside a wrapper, or inject a wrapper only when a
treatment is applied? Either changes the markup shape of every naked-mode instance.

- **Estimate:** 5–10 min to decide; 15–20 min to build once decided.
- **Likely files:** `plugins/sgs-blocks/src/shared/effects/fx-surface-treatment.js`,
  `plugins/sgs-blocks/src/blocks/decorative-image/render.php`.

---

## 🟡 Real tasks, no design gate needed

### 4. Timeline connector visuals

Client (MIC — Muslims in Construction) wants a textured, themed connector — pulse, vine, tree,
falling bricks (their specific ask, for their journey/process page) — plus per-entry progressive
fill on scroll for `sgs/timeline`. Moved out of parking 2026-08-27: the trigger condition (a
named client asking for it) was already met, sitting there stale.

**A full attribute + `view.js` implementation sketch already exists — read it before building,
don't sketch from scratch.** `.claude/plans/2026-08-24-spec38-motion-register.md`.

- **Estimate:** build the base progressive-fill mechanism first (~20 min), then 20–30 min per
  connector style — the styles can build in parallel once that base exists.
- **Likely files:** `plugins/sgs-blocks/src/blocks/timeline/edit.js`, `style.css`, `render.php`.
  Spec: `.claude/specs/38-SGS-MOTION-SYSTEM.md` §3.3 FR-38-26.

### 5. Verify `fxPath`/`fxShape`/`fxMagnet*` DB seeding — genuinely unresolved, needs a fresh look

Not the same claim an earlier stale report made ("no converter writer exists" — refuted; Bean
confirmed the old skip/block logic is gone and fx attributes generally are written to the DB, and
`fxDraggable`/`fxPin`/`fxStart`/`fxEnd`/`fxScrub` are confirmed present in `block_attributes`
today). This is narrower: `fxPath*`/`fxShape*`/`fxMagnet*` are confirmed BUILT and SHIPPED in the
editor (Spec 38 §11.2, verified against `fx.js` and `SHIPPED_EFFECTS`) and mapped in
`seed-motion-fx-registry.py`'s css_property table — but a direct DB query today found **zero**
rows for any of them in `block_attributes`. `check_motion_fx_reseed.py --check` reports clean
regardless, which is either a real gate blind spot or these three families are legitimately meant
to stay unseeded for a reason not yet found. Don't trust either report — check `/sgs-update`'s
own history for this attribute family, or run it and watch what changes.

- **Estimate:** 15–20 min to resolve which of the two it is; a `/sgs-update` run plus a DB
  re-query answers it directly.
- **Likely files:** `plugins/sgs-blocks/scripts/seed-motion-fx-registry.py`, `sgs-update-v2.py`,
  `scripts/db-consistency/check_motion_fx_reseed.py`.

### 6. `SgsLengthControl` presets={true} typing sweep

Low priority — confirmed zero live risk today, since nothing anywhere currently uses
`presets={true}`. Before turning it on for any of the ~67 mounts adopted this session (D821/D825),
check that attribute's `block.json` type actually accepts a slug alongside a length string —
otherwise WordPress silently discards the value (D338).

- **Estimate:** 15–20 min — an audit pass, not a design decision.
- **Likely files:** the ~24 block `edit.js` files touched in D821/D825, their `block.json` siblings.

---

## ⚪ Verification debt — quick checks, no build

### 7. Show Bean the particle trail (FR-38-32, "sparks") live

Bean flagged this himself (2026-08-27) — he's never seen it. Verified true: the effect genuinely
fires on hover (confirmed live via Playwright), but only on debug canary page 2744, and it's
visually very faint even in a full-page screenshot. The doc previously said "OBSERVED
2026-08-25," which sounds like a full sign-off; it only ever covered the editor's inspector
controls (picker, presets, Notice text), never the frontend visual or Bean's eye. Show him the
actual live trail — a client build, or at minimum a clean canary demo — before this counts as
done in any client-facing sense (per project rule R-31-13, script measurement alone never closes
a visual claim).

- **Estimate:** 5–10 min to demo live; longer if the visual itself needs tuning once seen.
- **Likely files:** none, unless Bean asks for a visual change — then
  `plugins/sgs-blocks/src/shared/effects/particles.js`, `fx-particles.js`, `fx-particles.css`.

### 8. Keyboard focus inside a pinned element

No canary fixture currently has focusable content inside a scroll-pin. Spec 38 §3.1's honesty flag
on FR-38-6/FR-38-8 is still open.

- **Estimate:** 5–10 min — build one small test fixture, Playwright-check tab order through it.

### 9. Reduced-motion arm of the header row-collapse interaction

Spec 38 §12 flags this as unproven by direct observation.

- **Estimate:** 5–10 min — Playwright check with `prefers-reduced-motion: reduce` forced.

---

## Parked, with a trigger — not active work

- **`selectors.sgs.hoverTarget` registry.** Legal and technically verified, refused on necessity —
  it buys zero reach over the pattern already in use. Revisit only if a third block needs
  per-item (not per-block) hover.
- **Native controls → thin SGS wrappers.** Bean's stated direction, already underway in spirit
  (`SgsLengthControl` is one instance of it). No further scheduled work beyond task 6 above.

---

## Method notes from this session, worth carrying forward

- **A subagent's first-pass report is a hypothesis, not a fact.** A Haiku dispatch reported 4 real
  drift violations in a new gate; 3 were false positives on blocks with their own already-shipped,
  dedicated controls. Verify against the actual source before trusting a dispatched report,
  however confident it reads.
- **A doc that claims a behaviour and code that doesn't implement it are two different things.**
  One gate's docstring said an exclusion existed; the actual comparison logic never subtracted it.
  Check both, not just the comment.
- **The shared `main` tree causes deploy collisions across every concurrent track, every time.**
  Deploy from an isolated `git worktree`; junction `node_modules`/`vendor` from the main tree
  rather than reinstalling.
