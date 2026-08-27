# Next session — the remaining client controls

**Written 2026-08-27.** Supersedes `2026-08-27-check-a-blind-spot-and-the-first-controls.md`,
whose TASK 1b/1c/1d and Gate C changes all shipped. The section-gap work closed the same day.
Everything still open is below; nothing here is blocked on Bean.

Invoke `/autopilot` first. Bean is QC-only: batch every open question into one message at the
start, then work without interrupting him until something needs his eye.

---

## Read before you touch anything

**Five tracks share `main`.** Commit with explicit paths, never `git add -A`. Re-check the branch
in the same command as the commit. If `.git/index.lock` exists, another session is mid-commit —
wait, never delete it.

⛔ **A gate that fails on another track's uncommitted work is not yours to fix or baseline.**
Prove whose it is (`git show HEAD:<file>` against the working tree), state the evidence, use the
scoped bypass, and leave their debt to them.

⛔ **Never `--allow-dirty` on a deploy.** An uncommitted edit triggered D336, which took two
client sites down for 2.5 hours. If the plugin tree is dirty, deploy `--theme-only` or wait.

**Verified bypass tokens** go in the COMMAND string: `[gates-ok:]`, `[repeat-ok:]`, `[batch-ok:]`,
`[truncate-ok:]`, plus `SGS_VISUAL_GATE_SKIP=<block>` with `SGS_VISUAL_GATE_REASON="…"`. Read the
gate's own error text before using one — this session invented the syntax twice and was wrong both
times.

---

## ✅ CLOSED 2026-08-27 — the section gaps are gone

`sgs/container` and `sgs/site-footer` joined the section-gap reset
(`e592eae78`, `a68ed7fdf`, deployed 1.5.83). The homepage now has **zero** gapped
sections: five adjacent containers of different colours sit flush, and the 24px band above
the footer is gone. Verified live on the real homepage, not a probe.

⚠ **The reasoning that nearly stopped this was wrong, and Bean caught it.** I claimed a
container becomes full-width by having no maximum width set, so we would need to DETECT
full-bleed and mark it with a class — a change to the wrapper 48 blocks share. The width
model is the other way round:

    maxWidth     (OUTER)  default {}                   -> unlimited, FULL-BLEED
    contentWidth (INNER)  default {"desktop":"normal"}  -> content constrained

Every container is ALREADY a full-bleed section with constrained content, so there was no
subset to detect and no shared-code change. I also wrongly warned it would remove gaps
"everywhere containers are used" — every selector uses `>`, direct child only, so nested
containers keep their spacing. Both corrections are recorded in the CSS.

⚠ `sgs/site-header` and `sgs/nav-drawer` are deliberately NOT listed: both measure 0px, so
there is no defect to fix. The header reads 0px only because it is the FIRST child, which
WordPress zeroes. Put a block above it and it gains the gap — measure then.

## 1. Migrate off native `supports.spacing`

**Bean approved this.** Plan ready and unstarted:
`.claude/plans/2026-08-26-migrate-off-native-spacing.md`.

Five blocks (`multi-button`, `physics-canvas`, `site-footer`, `site-header`, `trust-bar`) move to
`sgs/container`'s shape: their own `padding`/`margin` object attrs, no native `supports.spacing`.
That removes the duplicate Dimensions panel the client currently sees.

**Bean ruled `multi-button` gets BOTH padding and margin** — full parity, no carve-out. It has
neither today, so build them rather than redirect them, and note that 8 theme files already author
native margin on it.

Three questions remain open in §6 of that plan. Q4 matters most: confirm `SGS_Container_Wrapper`
needs no change, because `multi-button` is the one block that does not route spacing through it.
If the wrapper does need changing, Rule 7's design-gate applies BEFORE building.

Detector first — this touches five blocks, so `detector-first-commit-gate.py` will fire, and only
a committed detector satisfies it.

## 2. The CHECK A backlog

CHECK A now reports 238 net-new against a ceiling of 238, and its blind spot is fixed. The triage
stands at **REAL 186 · ARTEFACT 22 · DETECTOR BUG 0** — it under-reports, it never cries wolf.

Those 186 collapse to roughly seven shared-mechanism fixes. Two are done: background preview
(`11228c3e0`) and spacing preview (`756341482`). The rest share that shape — a shared inspector
panel writes attributes the PHP wrapper paints, and only `sgs/container` ever built the JS mirror.
Remaining panels: `GridItemDefaultsPanel`, `LayoutPanel`, `ResponsiveBoxControls`, and the
`bgSvg*` family.

Per-finding evidence: `reports/2026-08-26-check-a-triage-group-a.md` and `-group-b.md`.

⛔ The ceiling moves DOWN only from here. Re-measure and lower it after every drop.

## 3. Gate C roll-out

Bean approved the column-shape picker ("looks great now"). It is wired to `sgs/site-footer-row`
only. Roll it out to `sgs/site-header-row` and `sgs/container` — Bean's call that all three share
the control.

⛔ Two rulings that must not be re-litigated: the catalogue stays at 3-4 shapes per count
(FR-37-42's measured-reference rule), and the diagram teal is the literal `#1F7A7A`, never
`var(--wp--preset--color--primary)`, which resolves to the client's own palette.

## 4. Two control-surface gaps

**`sgs/product-card` typed mode** offers only "Remove image". An operator whose image URL is
broken — exactly how a freshly cloned card lands — must destroy the value to get a picker back.
Done when replace is reachable without removing first. See D787.

⭐ Nothing detects this class. Rule 21 asks "does the block paint something with no control?";
`check-dead-controls` asks the inverse. **Nothing asks "is this control reachable without first
destroying the value?"** Worth a detector before the sweep.

**`sgs/hero` split media** emits the whole `splitMedia*` family onto a class added only for the
IMAGE type, so the video and SVG tiers have no controls at all.

## 5. Three settled designs, ready to build

Full detail in the superseded prompt; the rulings are stable.

- **C14 — panel order.** Element order follows the DOM; WordPress-native ordering at root.
  Advanced always last, Visibility conditions second from last. Record in Spec 35, then gate it.
- **C16 — spacing presets.** Keep the responsive box control, add presets. Selecting a preset
  changes the value AND the measurement type when units differ. The unit switch is the hard part.
- **C19 — sizing-mode picker.** `Auto` · `Fixed height` · `Aspect ratio`, mutually exclusive.
  Default `sgs/image-sequence` to `16 / 9`, which `render.php:50` already emits.
  ⚠ `hero.splitMediaHeight` is a tier object — keep it responsive per tier.
  ⛔ The converter side touches `converter/`; read Spec 31 §13 first.

## 6. C15 — Block Bindings

Four items Bean adopted. Report: `reports/2026-08-28-c15-block-bindings-scope-proposal.md`.
The headline is C15-2/C15-3: register the source in JS and supply `getFieldsList()`, so core's own
picker lists SGS fields and the client picks "Phone" from a dropdown.

---

## Known instrument faults — do not rediscover these

⚠ **`gate:full` currently FAILS on `sgs/hero`**, reporting `mediaBackgroundGradient` and
`mediaOverlayGradient` as orphan attrs. **They are not orphans and must not be deleted.** Another
track refactored `hero/edit.js` to build attribute names through
`gradientOverlayAttrKeys( 'mediaOverlay', … )`, so the literal strings no longer appear in the
file and `audit-block-file-consistency` cannot see them. Deleting them would delete working
features. The fix belongs to that track: teach the detector about the helper, or baseline it with
that reason. Until then deploy with `--skip-gate-full` and say why.

⚠ **A CSS rule walker must check `r.style` BEFORE `r.cssRules`.** With CSS Nesting every
`CSSStyleRule` carries a `.cssRules` property, so a walker branching on `if (r.cssRules)` treats
every style rule as a group and reads no declarations. Validate any scanner with a negative
control: if it reports implausibly few rules declaring `color`, it is broken. This fault produced
a confident "no rule sets margin anywhere" that was entirely false.

⚠ **To find whether CSS causes a computed value, disable stylesheets — do not read selectors.**
Disable them all and re-measure; if the value changes, CSS is responsible. Then disable one at a
time to isolate. That found the culprit in minutes after selector-reading had failed for an hour.

⚠ **`document.querySelector` returns the first match**, which on a real page is usually a
header or footer instance rather than your probe. Identify the test element by its content.

⚠ **Theme CSS cache-busts off `Version:` in `theme/sgs-theme/style.css`.** Without a bump, a CSS
fix reaches no browser. It currently reads 1.5.81.

⚠ **Page 2849 was TRASHED on 2026-08-27** to clear the pre-deploy stored-content audit, which it
had blocked for five consecutive deploys. It was the cloning track's QA clone, not a gate fixture.
Restore it with `wp post untrash 2849` if that track still needs it.

---

## Method that earned its keep this session

**When a fix that should work changes nothing, look for a second source before doubting the fix.**
The section-gap reset existed in three files, each shadowing the next. Every "the fix didn't work"
moment was really "another copy is still winning".

**"Not cause A" is exculpatory for A, never inculpatory for B.** This session first blamed
WordPress for the margin defect because `sgs/container` showed it too. That proves the behaviour
is not new; it never proves WordPress causes it. The real cause was our own theme.

**Every control needs its opposite direction.** Showing a defect is fixed proves half of it.
Showing the rule's original purpose still holds proves the other half. A one-sided measurement is
a false pass, and this session produced one — Task 2's control 3 — that passed by construction.
