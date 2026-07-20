---
doc_type: phase-plan
project: small-giants-wp
spec: .claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md
phase: Spec 35 Task 3 — hover consolidation, remaining sweep ("Wave 4")
created: 2026-07-20
status: READY — Phase 0 has no dependencies and can start cold
---

# Hover consolidation — the remaining sweep

## Plain English: what this is and why

Every SGS block currently invents its own way of doing hover. A client editing a
block can meet two different controls for one visual effect, in two different
places. The fix is one rule: **hover is never its own control — it is a STATE of
an existing control**, shown by a Normal | Hover toggle sitting exactly where the
base control sits, inside that element's own panel.

`sgs/button` (icon colours) and `sgs/nav-menu` (items, featured, underline) are
done and live-proven. This plan covers everything else.

## The architecture is LOCKED — do not re-litigate

> There is no standalone "hover colour" control. Hover is ALWAYS a STATE of an
> existing control — a `StateToggleControl` (Normal | Hover) mirroring the base
> control, inside that element's own panel.

Corollaries Bean stated: element-first wins (an element's hover lives in THAT
element's panel); shadow is element-owned and gets a toggle plus a shadow colour;
image-specific universals leave the universal panel.

---

## What the 2026-07-20 nav-menu session proved (this is why the plan looks like this)

Four findings, each of which changes how the sweep must be run. All measured, none
inferred.

**F1 — The frontend can be perfect while the editor is broken.**
nav-menu's CSS was verified correct on the live site while the editor canvas was
returning HTTP 400 and showing "error loading block". Frontend verification alone
would have shipped a broken editor to a client.

**F2 — Block CSS is NOT inline in the page.**
`includes/class-sgs-css-registry.php` lifts every block's `<style>` at
`render_block` priority 99 into a content-hashed file under `uploads/sgs-css/`.
Searching page HTML for a block's CSS finds nothing and looks exactly like a
broken emit. ~40 minutes was lost to this. Any verification MUST follow the
`<link id="sgs-blocks-collected-css">` to the real file.

**F3 — Two bug classes slipped every existing gate.**
Build, WPCS, `check-dead-controls`, `audit-inline-styling`, `box-family-guard`,
`check-no-inline` and 180 unit tests were ALL green while:
  (a) `implode(',', $selectors) . '::after'` attached the pseudo-element to the
      LAST selector only — the underline never appeared on hover or keyboard
      focus, only on the current page;
  (b) `"type":"number","default":null` made ServerSideRender send an empty string,
      which the REST block-renderer rejects → 400 → dead editor canvas.
Both are mechanical, both are detectable by a script, and both WILL recur across a
40-block sweep. **Gate them before the sweep, not after.**

**F4 — An inferred fix is a guess.**
The first attempt at (b) widened the type to `["number","null"]`. Deployed, read
back from the live registry as correct, and still 400 — because the value being
validated is `""`, a string, which matches neither member. The working fix is to
omit the `default` entirely so the key is absent. Shipping the inference cost a
whole build/deploy/verify cycle.

---

## Orchestration principle

| Work shape | Route to | Why |
|---|---|---|
| Enumerate / classify / measure | **Python or Node script** | Deterministic, re-runnable as a progress meter, reviewable, and becomes the codemod's input (STOP-BLIND-REGEX-CODEMOD: drive off a KNOWN list, never a regex sweep) |
| Repeat a known edit across N blocks | **Haiku subagents, one block each** | Mechanical, well-scoped, parallel; no judgment required once the pattern is fixed |
| Decide a pattern / resolve ambiguity / judge semantics | **Sonnet subagent or inline Opus** | Requires reading intent, not matching text |
| Approve a shared-mechanism change | **Bean (design gate)** | Project rule 7 |

**The rule this session earned:** a step is only safe to delegate to Haiku once its
verification is a SCRIPT. Phase 1 exists to make Phase 3 delegable.

---

## Phase 0 — Re-derive the worklist (BLOCKING, do first)

**Do not trust the 24/40 split in the older handoff.** nav-menu was filed as one of
the "40 hard" blocks whose resting colour comes from WP-native `supports.color`;
it has no `supports.color` at all. That classification is unverified, and the whole
plan branches on it.

**Build:** `plugins/sgs-blocks/scripts/audit-hover-attrs.py` → `hover-worklist.json`

Per block, emit: every `*Hover`/`hover*` attribute; the matched base attribute (by
normalised name); the base's SOURCE (`block-attr` | `native-support` | `none`); the
block's render mode (`render:file:` = SSR, else static); and a category:

| Cat | Meaning | Treatment |
|---|---|---|
| A1 | base + hover both block attrs | Toggle — mechanical, Haiku |
| A2 | hover attr, base is native `supports.color` | Toggle — BLOCKED on Phase 2 design gate |
| B | hover-only effect, no base (`scaleHover`, `imageZoomHover`) | NO toggle — Normal side would be empty |
| C | behaviour flag, not styling (`pauseOnHover`, `autoScrollPauseOnHover`, `overlayHover`) | **DO NOT TOUCH** |

Category C must be an explicit named list in the script, classified by SEMANTICS
and human-reviewed — `pauseOnHover` matches every "hover" regex and pauses a
marquee. This is the same class as the Haiku swarm that deleted live `textAlign`.

- **Model:** inline (Opus). Small, and its correctness gates everything downstream.
- **Time:** 15 min. **Acceptance:** counts reconcile to the live attribute total;
  every Category C entry individually justified in a comment.

## Phase 1 — Build the verification harness FIRST

This is the highest-leverage step in the plan. It converts the two checks that
caught this session's bugs from 20-minutes-of-manual-work into one command, which
is what makes a 40-block sweep affordable and safe.

**1a. `scripts/verify-block-css.js`** — resolve the collected stylesheet (follow
`<link id="sgs-blocks-collected-css">`, per F2), extract the rules scoped to a
given block's uid, and assert expected selectors/properties are present.
```
node scripts/verify-block-css.js --url <page> --block sgs/nav-menu \
     --expect-selector '__link:hover::after' --expect-prop 'transform:scaleX(1)'
```

**1b. `scripts/verify-block-editor.mjs`** (Playwright) — log in, open a page
containing the block, and assert: REST `block-renderer` returns 200; the block is
`isValid`; the inspector panels render; zero crash nodes; console has no
block-renderer 4xx. **This is the check that caught the 400.**

- **Model:** Sonnet subagent (two independent scripts, clear contracts, no shared
  state) via `/dispatching-parallel-agents`.
- **Time:** 25 min. **Acceptance:** both scripts reproduce this session's findings
  when pointed at commit `e8208484^` (must FAIL) and at `cf641603` (must PASS).
  A harness that cannot detect the known bug is not a harness.

## Phase 2 — Design gate: toggle ↔ native colour support (Bean)

Only if Phase 0 confirms Category A2 is non-empty.

**Question:** how does `StateToggleControl`'s Normal side read/write
`style.color.background` / `.text` (a native WP support) while the Hover side
writes a block attribute?

**Why it needs Bean:** it is shared styling machinery touching every block's colour
handling — project rule 7.

- **Model:** inline Opus + `/brainstorming` design mode; `/qc-council` the chosen
  shape BEFORE any dispatch.
- **Time:** 20 min. **Acceptance:** a written pattern Bean approves, proven live on
  ONE A2 block through BOTH harness legs.

## Phase 3 — The sweep

One Haiku subagent per block, driven by `hover-worklist.json`. A1 blocks can start
as soon as Phase 1 lands; A2 blocks wait on Phase 2.

**Subagent brief (verbatim constraints):**
> Wrap these named base/hover attribute pairs in `StateToggleControl`, following
> `src/blocks/button/edit.js` exactly. WRAP ONLY — never delete, rename, or
> re-type an attribute or control. Do not touch any attribute not in your list.
> Do not deploy. Do not commit. Do not run git.

Main thread owns: commits (path-scoped), the deploy (isolated worktree), and both
harness legs per block.

- **Model:** Haiku per block; escalate to Sonnet for any block where the pair
  mapping is ambiguous (Phase 0 flags these).
- **Time:** ~5 min/block, parallel. **Acceptance per block:** `git diff` shows zero
  attribute deletions; build green; `verify-block-css` PASS; `verify-block-editor`
  PASS.

## Phase 4 — Delete the universal hover controls

Remove `sgsHoverBgColour`, `sgsHoverTextColour`, `sgsHoverBorderColour`,
`sgsHoverShadow`, `sgsHoverImageZoom`, `sgsHoverGrayscale` — attributes and
controls in `src/blocks/extensions/hover-effects.js`, the CSS branch in
`includes/hover-effects.php`, then regenerate
`includes/extension-attributes.generated.php`.

**KEEP:** scale, tilt, duration, easing, stagger, focus ring, border accent —
whole-block motion with no base control to mirror.

**Strictly after Phase 3** — deleting before replacements exist strands capability.

- **Model:** inline Opus (small, one location, high blast radius).
- **Time:** 15 min. **Acceptance:** zero references remain in `src/` or `includes/`;
  a migrated block still renders hover correctly through both harness legs.

## Phase 5 — Wire the new gates (WARN-only)

Two NEW linters, each written directly from a bug that shipped green today:

**G1 `check-ssr-null-defaults.js`** — fail any block with `"render": "file:"` that
declares a non-string attribute with `"default": null`. ServerSideRender sends it
as `""` and the REST renderer 400s, killing the editor canvas.
> Note the doc conflict: CLAUDE.md promotes "`null` default = inherit" as the
> canonical pattern. That is true for STATIC blocks and a guaranteed 400 for SSR
> ones. **This asymmetry must be written into CLAUDE.md**, not rediscovered.
> Sweep all 80 blocks — nav-menu is unlikely to be the only offender.

**G2 `check-pseudo-selector-lists.js`** — flag `implode(',' …)` (or a joined
selector list) concatenated with `::before`/`::after`, which silently applies the
pseudo-element to the last selector only.

Plus wire the three already-built WARN-only linters (`check-universal-fit`,
`check-duplicate-controls`, `audit-block-file-consistency`) and
`check-element-manifest-conformance`.

- **Model:** Haiku for both linters (pure pattern-matching with a known
  reproduction); inline review before wiring.
- **Time:** 20 min.

---

## Dependency graph

```
Phase 0 (worklist)  ──┬──────────────────────────────► Phase 5 (gates, anytime)
                      │
Phase 1 (harness) ────┼──► Phase 3 A1 sweep ──┐
                      │                        ├──► Phase 4 (delete universals)
Phase 2 (design gate)─┴──► Phase 3 A2 sweep ──┘
```

Phases 0, 1 and 5 are independent and can run in parallel on day one. Phase 2 is
the only step needing Bean.

## Known blockers carried in

- **`check-duplicate-controls.js`'s count is NOT the success criterion.** It reports
  85 duplicates and flags element-scoped hovers (e.g. `sgs/button.iconColourHover`)
  that are CORRECT under the locked architecture. Driving it to 0 deletes real
  capability. Teach it element-scoped vs whole-block before trusting it.
- **Shared canary.** `--blocks-only` ships the WHOLE plugin. `git merge origin/main`
  before every deploy; verify with a per-track marker + md5, never the generic
  HTTP-200 leg (`P-DEPLOY-VERIFY-NOT-CHANGE-SPECIFIC`).
- **Visual-diff gate ordering** (`P-VISUAL-GATE-ORDERING`) — commit needs proof,
  proof needs deploy, deploy needs commit. Use `--no-verify` + a truthful
  `[batch-ok:]` line and close the loop the same session.

## STOP catalogue additions from this session

- **STOP-VERIFY-BOTH-SURFACES** — frontend-correct ≠ editor-correct. A block change
  is not done until BOTH the rendered page and the real editor are verified. (F1)
- **STOP-BLOCK-CSS-IS-NOT-INLINE** — block `<style>` is lifted to a hashed file by
  the CSS registry. Absence from page HTML proves nothing. (F2)
- **STOP-SSR-NULL-DEFAULT** — `default: null` on a non-string attr 400s any
  ServerSideRender block. (F3b)
- **STOP-PSEUDO-ON-SELECTOR-LIST** — appending `::after` to a joined selector list
  hits only the last selector. (F3a)
- **STOP-DONT-SHIP-AN-INFERRED-FIX** — reproduce the failure against the fix before
  deploying it. (F4)
