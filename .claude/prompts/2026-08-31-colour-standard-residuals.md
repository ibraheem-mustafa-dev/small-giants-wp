# Next session — three residuals from the colour-standard work, then deploy

**Written:** 2026-08-30 (late) · **Track:** client-controls / colour · **Branch:** `main`

Invoke `/autopilot` first.

⛔ **Every figure below was produced by a command on 2026-08-30. Re-run before trusting
any of them — this repo's recorded failure mode is a cached number. A doc's own status
claim, including this one, is a hypothesis.**

---

## What closed on 2026-08-30 (do NOT redo)

The colour-control standard is now **ruled, documented and enforced**:

- **D890** — global `SgsColourPanel` is the standard (65 of 83 blocks, each mounting it
  exactly once). A variant-specific row is **OMITTED, not disabled**, when it does not
  apply (`rows.filter(Boolean)`; reference `sgs/icon-list`, citing D609 9c). Colour goes
  in an element panel **only** where a purpose-built composite pairs it with non-colour
  controls — today `SgsBorderControl` alone.
- Recorded in Spec 35 Part O **9e/9f**, Spec 32 **FR-32-12** (grid-item eligibility), and
  `golden-controls.json` → `controls.colour.placement`.
- `fillRow`/`textRow` gained an optional **`get`/`set`** binding override (`cdaa7fd7f`) so
  object-attribute members and repeater items can use the standard controls.
- A classification codemod exists: `plugins/sgs-blocks/scripts/migrate-colour-picker-to-panel.py`
  (`--survey` / `--fix` / `--fix --apply` / `--check` / `--self-test`, 66 assertions).
- Migrated: `multi-button` fill+text, `hero` split-media border consolidated, `hero` and
  `info-box` false-native border pickers deleted, `mega-panel` and `pricing-table` via
  get/set.
- `sgs/trust-bar`'s `items[i].fillColour` **stays refused, correctly** — it paints an SVG
  `fill` attribute, a third mechanism neither helper covers. Pinned as a negative control.
  ⛔ If a future pass reclassifies it as migratable, that pass is wrong.

---

## RESIDUAL 1 — multi-button border: needs a DESIGN GATE, not a codemod

**Status: reverted deliberately, work saved as a patch.** The block.json attrs and the
`SgsBorderControl` mount were written and then reverted because they produced **two dead
controls** — `check-dead-controls` flagged `childBtnBorderWidth` and `childBtnBorderStyle`
as net-new, pushing the rule-34 ratchet 2→3 and failing `gate:full` at 3/4. Reverting
returned it to 4/4.

Saved patch (79 lines, re-appliable):
`<scratchpad>/multi-button-border.patch` — regenerate with
`git diff plugins/sgs-blocks/src/blocks/multi-button/` if lost; the shapes are described below.

**What was built and is correct:** `childBtnBorderWidth` (object, box-object shape matching
every other `SgsBorderControl` `widthValues` attr) and `childBtnBorderStyle` (string,
default `''` — empty means no override, matching this block's `childBtn*` group-default
convention), plus a real `SgsBorderControl` mount with `colourLinked={true}` (D881).

**What is missing, and why it is a design gate:** the attrs never paint. The group-default
mechanism emits CSS custom properties onto the multi-button wrapper
(`render.php` → `extra_styles` → `--sgs-mb-btn-<prop>-default`), consumed by
`button/style.css`. But `button/style.css:45-55` carries an explicit 2026-08-27 warning:

> *border-width/border-style are NOT declared here (2026-08-27 fix — a hardcoded default
> painting a real 2px solid border through every button, including custom/preset-less
> instances that set no border attribute at all)… found live on the Mama's Munches clone's
> "Find out more" button.*

So adding `border-width: var(--sgs-mb-btn-border-width-default, …)` to the base rule risks
reintroducing a bug that reached a client clone. `sgs/button` is the most-mounted component
in the framework.

**The decision to take to Bean (Rule 7):** either
(a) declare the two properties on the base with a provably no-op fallback (`0` / `none`),
    accepting a change to the shared button base; or
(b) emit a multi-button-scoped rule so the global base is untouched; or
(c) drop per-group border width/style and keep colour only.
⛔ Do not pick one silently. Whichever is chosen, verify on a preset-less button that no
border appears when nothing is set — that is the exact regression the warning describes.

**Also required if (a) or (b) proceeds:** a `/sgs-update` reseed for the two new attributes.

---

## RESIDUAL 2 — DEPLOY. Nothing from 2026-08-30 is live.

Every block change is committed and pushed; **none is deployed or live-verified.**

Sequence:
1. `git status` — payload must be clean. Other tracks share this branch.
2. `cd plugins/sgs-blocks && npm run build` — ⚠ this is the **first real build** since
   `node_modules` was found empty and restored on 2026-08-30. It doubles as proof the
   restore was sound. If it fails, run `npm ci` before diagnosing anything else.
3. `npm run gate:full` — expect 4/4.
4. `python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown --blocks-only`
5. **Live-verify in the editor — this needs Bean's eye, not a green check (R-31-13).**

**What to look at, block by block** — tonight moved client-facing controls:
- `sgs/trust-bar` — colour controls consolidated into one panel; one attribute
  (`textColour`) previously settable from two places is now settable from one.
- `sgs/hero` — split-media border is now a single `SgsBorderControl`; a bespoke border
  picker was deleted. **Confirm `<WidthPanel>` is still present** — a codemod bug deleted
  it in a test apply before being caught.
- `sgs/info-box` — a border picker deleted; `render.php` now strips only the colour key.
  ⛔ **Verify rounded corners still render**: 388 stored instances rely on
  `style.border.radius` travelling through that same read.
- `sgs/mega-panel`, `sgs/pricing-table` — pickers moved into `SgsColourPanel` in place.
- `sgs/cta-section`, `sgs/trust-bar` — ~30 grid-item controls removed; they painted nothing.

---

## RESIDUAL 3 — promote the scatter detector, or decide not to

`plugins/sgs-blocks/scripts/scattered-element-controls.js` — finds elements whose controls
span multiple inspector panels. **69 findings / 48 blocks, self-test 32/32.**
Deliberately **not** wired into `rules.json` (never promote a rule on the run that
introduces it).

Bean has already ruled on its severity model: non-paintable attrs excluded; a
cross-property-family split is by design (`info`); a same-family split is a finding.

**Open question:** should spacing/sizing join border and transform as a "by design" family?
Today `trust-bar` still shows 3 findings, all colour-vs-sizing splits
(`wrapper`/`icon-badge`/`badge-img`). If yes, they drop to informational and trust-bar goes
clean. If no, they are real consolidation work.

**Also open:** promoting it to a ratcheted advisory rule, once Bean has eyeballed a sample.

---

## Standing hazards on this branch

- ⛔ Multiple sessions share `main`. **Commit with explicit pathspecs, never `git add -A`.**
  Check `git status` before any git operation — another track's staged files have appeared
  in this index tonight.
- ⛔ **Never `git stash` in the shared tree.** A subagent did it tonight to self-verify.
  Give agents a scratch copy instead of forbidding the tool — a prohibition in a brief is
  not enforcement.
- ⛔ A shared-DB reseed is a cross-track action. Check other tracks' ledgers first; one
  explicitly forbids it while sessions are live.
- ⚠ `MEMORY.md` sits at 24,136 / 24,576 bytes (440 headroom). The maintenance hook wants it
  under ~17KB. A deeper prune is owed.
- ⚠ The rule-08 baseline fix is a line-number **re-anchor, the seventh** on that entry. It
  will break again on the next unrelated edit above it. The structural fix (de-line-key the
  baseline; move the two genuine exceptions into the rule) is still open — it is **T7** in
  the client-controls plan.
