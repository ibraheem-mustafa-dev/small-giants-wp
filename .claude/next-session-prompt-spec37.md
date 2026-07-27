# Next Session — Spec 37 Header/Footer Builder: fix the starter-corruption defect

Invoke `/autopilot` before anything else. Then read this file end-to-end.

*Unique next-session-prompt for the Spec 37 header/footer track. NOT the shared LEDGER — concurrent
sessions own that. Overwrite this file each time this track hands off.*

You are the SGS framework builder continuing **Spec 37**. The per-row programme is closed. Last
session went looking for client-facing polish and instead **proved a defect that silently corrupts
every header starter pattern at insert time**. That is your front. Decide the fix, then build it.

---

## State recap (plain English)

**What shipped last session.** The "Start from scratch" header card now includes the mobile drawer
(`39dee74b`). Before this, a header built from scratch had a burger that opened nothing — because
`sgs/nav-menu` collapses to a burger below its 768px `collapsePoint` and opens `sgs/nav-drawer` by
id, and the scratch card shipped neither. That was the real cause of the FR-37-26 simplicity-test
failure: the test ran against CPT **1570**, a scratch-built proof header, and 1570 has no drawer in
its stored content (verified). All 7 styled starters already carried one.

Verified, not assumed: 4/4 md5 local↔server, theme **1.5.46** served, and the pattern reads back
from the live REST pattern registry with the drawer present. Both blocks default `drawerRef` to
`sgs-nav-drawer`, so the seeded pair wires up with zero operator configuration.

**⛔ THE FRONT — a proven, systemic defect. Not yet decided, not yet fixed.**

`sgs/site-header` passes BOTH `template: TEMPLATE` and `templateLock: 'all'` to
`useInnerBlocksProps` (`src/blocks/site-header/edit.js:343-353`). WordPress core's
`useInnerBlockTemplateSync` gates on:

```js
const shouldApplyTemplate = currentInnerBlocks.length === 0
  || templateLock === "all" || templateLock === "contentOnly";
```

So a block with `templateLock: 'all'` **re-applies its own template even when it already has
children**. Inserting any starter pattern therefore has the pattern's children silently overwritten
by the block's TEMPLATE. Measured live on the canary, pattern in → editor out:

| Starter | Pattern declares | Editor produces |
|---|---|---|
| Centred | 2 rows: middle[logo], bottom[nav] | 3 rows — bottom gains **logo + cart container**, plus a **stray empty row** |
| Minimal | 1 row: middle[logo, nav] | **3 rows** — second gains logo + nav + cart |
| Scratch | 3 empty rows | middle gains **logo + nav + cart** — the "blank shell" is not blank |

**Blast radius:** every header starter, including the drawer fix shipped last session.
`sgs/site-footer` sets `templateLock: 'all'` too (`site-footer/edit.js:197`) — the footer library is
very likely affected on the same mechanism and was **not** tested.

**Bounded, though — do not overstate it.** Opening an already-saved header does NOT re-corrupt it:
tested on CPT 1570, the editor tree matched stored content and `isEditedPostDirty()` returned
`false`. The damage happens at **insert**; once a corrupted header is saved it is template-shaped
and stable.

**One consequence to carry:** D377 recorded the picker as live-verified because choosing a starter
wrote a tree to `post_content` with the right `patternName`. It did — but the tree was not the
starter's. That verification checked metadata, not children.

**Deliberately NOT written to `decisions.md` or `parking.md` (Bean, 2026-07-26):** nothing has been
decided and this is not parked — it is the next session's active work. It lives here only.

---

## Mandatory READING — ⛔ read every item IN FULL before any edit

1. `.claude/specs/37-HEADER-FOOTER-BUILDER.md` — the canonical record. §3.3a (row seeding +
   `templateLock: 'all'`, the clause the defect lives in), §7 constraints, FR-37-7/8 (the picker +
   starter library the defect corrupts), §3.8 the per-device cascade.
2. `.claude/STOP-CATALOGUE.md` — the uncapped STOP catalogue + the pre-flight ritual.
3. `.claude/LEDGER.md` — live status, current fronts, what the co-active tracks are doing.
4. `.claude/decisions.md` D386–D392 — this track's decisions, most-recent-first.
5. `.claude/parking.md` — `P-THEME-SCROLL-PADDING-SECOND-INSTANCE`, `P-ROW-COLLAPSE-RESIDUALS`,
   `P-HEADER-SIMPLICITY-FINDINGS`, in full.
6. `.claude/plans/2026-07-25-header-footer-per-row-identity-design-gate.md` — the parent design and
   its 9 must-fixes. **Read the strike reasons** — the record of which guardrails stopped being
   meaningful when per-row sticky was rejected.
7. `reports/fr-37-26-simplicity-test/2026-07-26-operator-simplicity-test.md` — the FAILED verdict.
   Note its own correction: **≤3 controls is a NUDGE, not a ceiling** (FR-37-27, Bean-confirmed
   2026-07-23). Do not "fix" the control surface by hiding controls a client relies on.
8. **`plugins/sgs-blocks/src/blocks/site-header/edit.js:264-353`** — the defect site: the `TEMPLATE`
   const and the `useInnerBlocksProps({ template, templateLock: 'all' })` call. Read the comment at
   `:291-295` explaining why the burger was removed from TEMPLATE — it is the precedent for what a
   TEMPLATE entry can and cannot safely contain.
9. **`theme/sgs-theme/patterns/header-*.php`** — all 7, to see how many rows each declares and where
   the drawer sits (always a SIBLING of `sgs/site-header`, never a child).

---

## First action (≤5 min, zero dependencies)

Run the reproduction below on the canary. One browser call, and it puts the defect in front of you
as measured data rather than a claim you inherited. Nothing to build, nothing to set up.

```js
// In a NEW sgs_header post editor, via Playwright browser_evaluate:
const pats = wp.data.select('core').getBlockPatterns();
const p = pats.find(x => x.name === 'sgs/framework-header-minimal');
const parsed = wp.blocks.parse(p.content);
const shape = bs => bs.map(b => ({ slot: b.attributes?.rowSlot, children: b.innerBlocks.map(c => c.name) }));
const before = shape(parsed.find(b => b.name === 'sgs/site-header').innerBlocks);
wp.data.dispatch('core/block-editor').resetBlocks(parsed);
await new Promise(r => setTimeout(r, 2000));   // let the layout effect + queued microtask run
const after = shape(wp.data.select('core/block-editor').getBlocks().find(b => b.name === 'sgs/site-header').innerBlocks);
return { before, after, CORRUPTED: JSON.stringify(before) !== JSON.stringify(after) };
```

Expect `before` = 1 row, `after` = 3 rows with a cart container injected. That is your baseline and
your regression test.

---

## Task 1 — Decide the fix, then build it (the whole front)

**What:** stop `sgs/site-header` (and `sgs/site-footer`) overwriting an inserted pattern's children
with their own TEMPLATE, without losing the row-reorder lock §3.3a deliberately chose.
**Why:** the starter library is the client-facing product. A picker that silently rewrites the
design the client chose is worse than no picker.
**Estimated time:** ~30 min to decide, ~1 build+deploy cycle to ship.

**The decision, stated precisely.** `templateLock: 'all'` is doing two jobs: (a) *lock the three
rows so an operator cannot add, remove or reorder them* — wanted, and the explicit reason §3.3a
moved from `'insert'` to `'all'`; and (b) *enforce the template's CONTENTS* — not wanted, and the
defect. Separating them is the fix. Candidate shapes, none yet chosen:

- Pass `template` only when the block is genuinely empty, keeping `templateLock: 'all'` for the
  lock. ⚠ Verify against core: the sync also gates on `hasTemplateChanged` comparing against a
  `useRef(null)`, so passing `undefined` has its own first-mount behaviour — test it, do not reason
  about it.
- Drop `template` entirely and let the scratch/starter patterns be the only seeding path. FR-37-7
  already removed the CPT registration `template` seed for exactly this reason, so the block-level
  TEMPLATE may now be redundant — **prove that every creation path goes through the picker before
  relying on it** (the raw-block-insert path is the one to check).
- Revert to `templateLock: 'insert'`. Fixes this, re-breaks row dragging. §3.3a rejected it on
  evidence; only revisit with new evidence.

**⛔ Design-gate this before building (project rule 7).** It is a shared, shipped container block,
and the InnerBlocks/editor surface is precisely the D388 crash class — two editor-killing crashes
shipped past an all-green build in one session. `/brainstorming` → Bean sign-off → build.

**Orchestration:**
- Execution: **inline** (Opus). Architectural judgement on a shared mechanism; not delegable.
- Depends on: Task 2's measurement. Parallel with: nothing.
- /qc gate after: **`/qc-council`** (blub.db 255 — multi-rater before any shared-mechanism commit),
  and seat a **code-grounded reviewer** who checks claims against WP core source, not prose.
- **Acceptance:** the reproduction above returns `CORRUPTED: false` for all 7 header starters AND
  the row-reorder lock still holds (an operator cannot drag row 3 above row 1 — test it in the real
  editor, do not infer it from the attribute). Both measured live, not asserted.

## Task 2 — Test the footer for the same defect

**What:** `sgs/site-footer` sets `templateLock: 'all'` with its own TEMPLATE. Run the same
reproduction against the 6 footer starters.
**Why:** if it is affected, Task 1's fix must cover both containers in the same commit — and
D377's footer verification is then also unreliable.
**Estimated time:** ~10 min.

**Orchestration:** inline. Depends on nothing; run it BEFORE finalising Task 1's fix shape so the
fix is designed against both containers. /qc gate: folded into Task 1's.
**Acceptance:** a measured before/after table for all 6 footer starters, recorded in the report.

## Task 3 — Finish the verification the last session could not

**What:** the 5 header starters modified in `c29a837e` (per-row behaviours added) were verified for
only 1 of 5 — the browser jammed. Once Task 1 lands, insert each of the 5 in a real editor, confirm
no "invalid content" placeholder, read the console, and **read the saved `post_content` back from
the DB** to confirm the per-row attributes persisted and the tree matches the file.
**Why:** those 5 are live on the canary and unverified.
**Estimated time:** ~20 min after Task 1.

**Orchestration:** inline (the fix and the verification are one loop). Depends on: Task 1.
**Acceptance:** 5/5 insert clean, 5/5 saved trees match their pattern files structurally, console
clean. Then delete every test post and confirm no stray `-autosave-v1` revisions.

## Residuals — carried here because Bean ruled they are neither decisions nor parked

- **B2 — "preview before active".** Both CPTs are registered `'public' => false`
  (`class-sgs-block-cpts.php:98`), so there is **no frontend preview URL for a header or footer
  post at all**. Today the only way a client sees their header on a real page is to press "Set as
  active" — i.e. publish it to every visitor. The shipped "Show me the shrunk size" toggle covers
  only shrink; sticky, hide-on-scroll and transparent are all scroll-triggered and cannot be
  previewed in a static canvas. **The decision is:** build a nonce'd preview route that renders the
  real site with a chosen, not-yet-active header CPT, or accept "set active to preview" for v1.
  Needs a design gate (it teaches the direct-render branch to resolve a different post for one
  request) plus an access decision (who can hit that URL; does an unpublished header leak).
- **Drawer option B — the conditional-mandatory notice.** Bean's rule: a header must carry a drawer
  whenever a device tier shows the burger. Seeding (option A) is shipped. Option B — `sgs/nav-menu`
  shows a plain-English notice + a one-click "Add the mobile menu" when no drawer exists — is NOT
  built. ⚠ **It crosses the spec boundary:** Spec 37 §1.2 assigns the drawer to **Spec 36**, and
  §1.2's own rule requires a change crossing that line to edit BOTH specs in the same commit.
  Option C (hard save-gate) was recommended against: FR-37-19's standing policy is informational,
  never blocking, and a client blocked from saving with no trail is the failure P2 designed against.
- **The raw-block-insert path still has no drawer.** A drawer cannot be seeded from
  `sgs/site-header`'s TEMPLATE: its root is a `<dialog>` that promotes to the top layer, it must be
  a SIBLING of the header, and the container is locked to exactly three rows. Only option B reaches
  that path.

---

## Dependency graph

```
First action (repro on the canary — establishes the baseline)
        ↓
Task 2 (footer: same defect? decides the fix's scope)
        ↓
Task 1 — design gate (/brainstorming + Bean sign-off) → build
        ↓ /qc-council (code-grounded seat mandatory)
Task 3 (finish the 5-starter verification, live editor + DB read-back)
        ↓
commit path-scoped + push to main
```

---

## Anti-pattern STOP catalogue — track-specific only; the general ones live in STOP-CATALOGUE.md

> Carried forward from the previous prompt (11 entries) and EXTENDED to 15. No defence was dropped.
> The general/duplicated entries remain in `.claude/STOP-CATALOGUE.md` (reading item 2, uncapped,
> canonical, 71 entries), where the D101 count-check runs.

**These are NOT in the catalogue. They are this track's hard-won specifics:**

- **`templateLock: 'all'` RE-APPLIES the template over EXISTING children.** WP core:
  `shouldApplyTemplate = currentInnerBlocks.length === 0 || templateLock === "all" || templateLock
  === "contentOnly"`. Never assume a template only seeds an empty block. Any block combining a
  `template` with `'all'`/`'contentOnly'` will overwrite inserted pattern content.
- **A pattern verified by its METADATA is not verified by its CHILDREN.** D377 banked the picker as
  live-verified because the saved post carried the right `metadata.patternName`. It did — while the
  block tree beneath it had been rewritten. Compare the CHILDREN against the pattern file.
- **The INSTANCE a finding came from decides its blast radius.** Two findings inherited as systemic
  turned out to be single-path: "the preset library is NOT started" (12 styled starters already
  shipped) and "drawer content has no editing path" (only the scratch path lacked one). Check which
  path the failing instance came from before generalising.
- **A stuck `beforeunload` dialog jams EVERY Playwright call** (`"does not handle the modal state"`),
  including `navigate` to `about:blank`. Recovery that works: `browser_close` → the modal surfaces →
  `browser_handle_dialog` if offered, else `browser_navigate` again. Before leaving an editor, set
  `window.onbeforeunload = null`. This is what stopped the previous session's subagent dead.
- **Keep `SGS_Container_Wrapper`.** Never re-open block-private for header/footer (6/6 council, Spec
  37 §7 constraint 2). Add capabilities to the engine, never fork it.
- **CSS tier-gating via a JS-added state class, NOT `[data-attr]` presence** — a presence-only
  selector applies at every tier. Gate on the `is-row-*-active` class the JS adds only on active tiers.
- **`view.js` lives at `src/header-behaviours/`, NOT `src/blocks/`** — the webpack entry is
  hardcoded; a wrong path silently serves stale `src/` on the live site.
- **`sgs_resolve_tier_booleans({desktop:true})` resolves to ALL tiers** (inherit-upward). "Desktop
  only" needs explicit `{desktop:true, tablet:false, mobile:false}`.
- **The collapse path must win by SPECIFICITY, not source order** — its selector is (0,4,0) against
  the translate rule's (0,3,0). If you reorder `header-behaviours.css`, that must stay true.
- **`prefers-reduced-motion` resets must repeat the FULL selector** of whatever set the transition; a
  lower-specificity reset silently loses. The collapse's reduced-motion path is **NOT live-verified**
  (`P-ROW-COLLAPSE-RESIDUALS`) — do not quote it as measured.
- **An absolute value in a SHARED stylesheet cannot know the resting value it modifies** (D386, the
  shrink grow-bug). Gated by `check-shared-css-state-rules.js`; never baseline one of its findings
  without a recorded reason. `0` is exempt by construction.
- **Build-green is ZERO evidence for an editor-surface change.** Two editor-killing crashes shipped
  past webpack + dead-controls + a brand-new gate in ONE session (a lost `useState` import, then a
  TDZ). The crash renders as a tidy placeholder that skims past. After ANY `edit.js` / shared
  `src/components` change: deploy, OPEN the editor, read the console.
- **After a scripted multi-file edit, grep EVERY file to confirm it landed.** A script reporting
  success is not proof the file on disk changed.
- **Fact-check your OWN brief before a council decides on it.** Three load-bearing claims in my own
  decision brief were false and all favoured my recommendation. Always seat a code-grounded falsifier.
- **The full `npm run build` prebuild can be blocked by a co-active track's drift.** Route around it:
  `npx wp-scripts build --experimental-modules --webpack-copy-php` (PowerShell), then deploy from an
  ISOLATED worktree with a copied `build/` + `--skip-build`. Never `--allow-dirty` / `--skip-verify`.

## Pre-flight self-attestation ritual — answer inline before the first Write/Edit

> Carried forward (8 questions) and EXTENDED to 10. None dropped.

1. Have I read Spec 37 in full, plus D386–D392 and the LEDGER, before starting?
2. Did the prior session's work actually LAND? (`git log -1`, not a cached hash.)
3. Am I about to assert a cause I have NOT tested? (STOP-PROVE-CAUSE-BEFORE-FIX.)
4. Am I verifying on the LIVE page / real editor, not the emit or a green build?
5. Is the config I am measuring the ACTIVE one (header 1570 / footer 1654), checked via the option?
6. D-ceiling (`grep -oE 'D[0-9]{1,4}' .claude/decisions.md | sort -V | tail -1`) + branch
   (`git branch --show-current`) verified in the SAME command as the commit?
7. Am I touching another track's files without checking their state first?
8. Is this criterion still meaningful, or was it written against a model we since rejected?
9. **Am I changing a shipped container block's InnerBlocks config (`template` / `templateLock` /
   `allowedBlocks`)?** If yes: design-gate first, then deploy and OPEN the real editor — this is the
   D388 crash class and no gate in this repo executes the editor bundle.
10. **Am I generalising a finding from a single instance?** Name the path that instance came from,
    and check whether the other paths share it, before calling anything systemic.

---

## Tool bindings — skills, MCP servers, agents

### Skills to Invoke

| Skill | When |
|---|---|
| `/brainstorming` | MANDATORY — the Task 1 design gate, before any code |
| `/gap-analysis` | MANDATORY — grade output before delivery |
| `/lifecycle` | MANDATORY — before any skill/agent/pipeline change |
| `/research` | MANDATORY — auto-routes tier (`--tier extended` = multi-angle) |
| `/strategic-plan` | MANDATORY — plan order before writing code |
| `/qc-council` | before the Task 1 commit (blub.db 255) — seat a code-grounded reviewer |
| `/qc-inline` | per-file inline checks |
| `/sgs-wp-engine` + `/wp-block-development` | the block change itself |
| `/wp-block-themes` | pattern registration, `style.css` Version bump |
| `/sgs-db` | DB ground truth before any "missing X" claim |
| `/a11y-audit` | any control-surface change |

### MCP Servers & Tools

| Tool | For |
|---|---|
| playwright | the reproduction, live DOM, editor automation via `wp.data`, multi-viewport |
| chrome-devtools | same, **but its profile is often locked by a co-active session — Playwright is the working fallback** |
| `sgs-db.py` | DB queries (`~/.claude/skills/sgs-wp-engine/scripts/`) |
| `ssh hd` | canary shell; `wp option get sgs_active_header_cpt_id` before measuring |

### Agents to Delegate To

| Agent | When |
|---|---|
| `feature-dev:code-reviewer` | before the Task 1 deploy — caught the P1 tier-gating AND reduced-motion bugs |
| `wp-sgs-developer` | only for mechanical follow-on; tell it to EXECUTE, not delegate onward |
| `test-and-explain` | plain-English confirmation for Bean after the build |

---

## Guardrails

- Canary `sandybrown-nightingale-600381.hostingersite.com`; creds `.claude/secrets/sandybrown.env`
  (gitignored, always available); WP 7.0.2; **active header CPT 1570, active footer CPT 1654 — check
  the option, never infer from a name.**
- **Deploy is gated on a clean tree — commit BEFORE deploying.** `build-deploy.py --target
  sandybrown [--theme-only]` is the ONE path. Never hand-roll tar/scp (D336: 2 client sites, ~2.5h
  down). Never `--allow-dirty` / `--skip-verify`.
- **The deploy's own HTTP-200 verify proves nothing** — md5 each changed file local↔server after
  every deploy (STOP-VERIFY-DEPLOY-BY-CHECKSUM).
- **Bump `theme/sgs-theme/style.css` Version on ANY pattern change** — WP caches the pattern list
  against it. Currently **1.5.46**. It is not a block version; the no-version-bumps rule does not apply.
- Editor edits go through `wp.data.dispatch('core/block-editor')` + `savePost()` — **never** WP-CLI on
  `post_content` (a PreToolUse hook blocks it). clientIds regenerate per session; re-resolve by name.
- Revert the canary to clean afterwards and confirm on the frontend; check for stray `-autosave-v1`
  revisions.
- All on `main`, commit by EXACT PATH with `git branch --show-current` in the SAME command. The
  uncommitted tree is the co-active track's — do not commit `lucide-icons.php`,
  `.claude/next-session-prompt.md`, `reports/inline-styling-audit-*`,
  `.claude/memory/session-2026-07-2*.md`.
- **Methodology:** deploy before you measure; root cause before instance fix; outcome ≠ code shipped;
  verify the LIVE rendered output, not internal metrics.
