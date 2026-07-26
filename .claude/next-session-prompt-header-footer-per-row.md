# Next Session — Spec 37 Header/Footer: the STICKY build

Invoke `/autopilot` before anything else. Then read this file end-to-end.

*Unique next-session-prompt for the Spec 37 per-row work. Not the shared LEDGER — concurrent
sessions own that. Overwrite this file each time this track hands off.*

You are the SGS framework builder continuing **Spec 37**. The per-row work (Phase 1 + Phase 2) is
DONE and live-verified. Your job is the **sticky build**, whose design gate is now APPROVED.

## State recap (plain English)

- **Phase 1 DONE + live-verified** (`a3a200aa`): each header/footer row carries its OWN
  `rowTransparent` + `rowHideOnScroll` (device-tier, inherit-upward), independent of the
  header-LEVEL D376 body-class path.
- **Phase 2 DONE + live-verified** (`59de5434`, fixed by `d54c316d`, follow-ups `36461b85`):
  - **Per-row shrink.** The first ship set an ABSOLUTE `padding-block` in the shared stylesheet,
    which out-specified each row's own padding rule — so an *unpadded* row measured 0px at rest and
    **4px "shrunk"**: it GREW. Fixed: the shrunk value is emitted PER INSTANCE as
    `calc(<that row's own padding> / 2)` through the shared `sgs_emit_responsive_css()` engine, so
    growth is impossible by construction. Live-proven at 1440/768/mobile — 48px → **24px**,
    left/right held at 30px, unpadded row 0 → 0.
  - **Shrink-hides-a-chosen-element.** Proven live including the SERVER-SIDE guardrail: pointing
    the target at the logo produced no hide attr and no rule at all. The guardrail is declarative
    (`supports.sgs.headerEssential` on responsive-logo / nav-menu / cart), never a hardcoded list.
  - **Footer parity** verified on the ACTIVE footer (CPT **1654**).
  - **New gate** `scripts/check-shared-css-state-rules.js` (wired into `prebuild`) so the
    absolute-value-in-a-shared-stylesheet bug cannot return. Nothing scanned `assets/css/` before.
  - **44px touch-target floor deliberately NOT built** — measured: halving a row's padding left all
    5 interactive children byte-identical in size. Padding sits outside children. Don't re-add it.
- **Sticky mini-design (SA-1) APPROVED** by Bean 2026-07-26 (`bdc33f19`). The blocking gate is
  discharged. **That is what you build.**

## ⛔ MANDATORY READING GATE (read IN FULL before any edit)

1. `.claude/plans/2026-07-26-per-row-sticky-mini-design.md` — **the approved design you are
   building.** Four decisions, all settled + research-backed.
2. `.claude/plans/2026-07-25-header-footer-per-row-identity-design-gate.md` — parent design + its
   9 must-fixes.
3. `.claude/plans/2026-07-25-header-footer-per-row-identity-PHASE-PLAN.md` — P1/P2 status, what
   shipped, and what was deliberately NOT built (with the measurements).
4. `.claude/specs/37-HEADER-FOOTER-BUILDER.md` §Behaviours — the mechanism you extend.
5. `.claude/STOP-CATALOGUE.md` — the uncapped STOP catalogue + pre-flight ritual.
6. `~/.openclaw/workspace/memory/research/2026-07-26-sticky-rows-and-scroll-padding.md` — the CSS
   mechanics behind every decision below. Read before arguing with any of them.

## The approved design, in one paragraph

Sticky stays **HEADER-level** (already shipped: `body.sgs-header-behaviour-sticky` →
`position: sticky` on `header.sgs-site-header`). It works because the header's containing block is
`<body>`, which is tall. Rows do NOT get their own `position: sticky` — a row sticky inside a
~250px header unpins the moment scroll passes the header's height (the short-parent trap; this is
the single most common "sticky doesn't work" cause). Instead, a row that should disappear
**COLLAPSES out of flow (height → 0)** while the header is pinned, so the header genuinely shrinks
to the retained rows with **no gap**. `transform` cannot be used for this — it never reclaims the
element's space, which leaves a visible gap for exactly the scroll distance of that row's height.

## Task 1 — Fix the scroll-padding bug (do FIRST; worth shipping alone)

**What:** a live accessibility defect, independent of the rest.
`:root { scroll-padding-top: var(--sgs-header-height, 0px) }` is applied unconditionally and
view.js publishes the height unconditionally ("F1 — always publish"), gated on nothing. So on a
page whose header is NOT pinned, in-page anchors land the full header height too low (252px on the
canary).

**The precise bug:** `var(--x, 0px)` fires its fallback only when the property is UNDEFINED — it
does nothing when the property is defined but should be zero. The observer must publish `0px`
**explicitly**, gated on *"is anything actually pinned"*, not *"does the header have a height"*.

**Blast radius is wider than anchor links** — it also skews fragment navigation on page load,
browser find-in-page, every `element.scrollIntoView()` in the codebase, keyboard focus scrolling,
and scroll-snap.

**Keep the CSS line as-is** — it is correct and cause-agnostic. W3C technique **C43** confirms
`scroll-padding` is a *sufficient* technique for WCAG 2.4.11/2.4.12 **including keyboard Tab
focus**. The fix belongs entirely in the JS that decides the value.

- Execution: **inline** (small, high-care, touches shipped behaviour)
- Files: `src/header-behaviours/view.js`. Do NOT change `assets/css/header-behaviours.css`
- /qc gate after: yes — `/qc-inline` + `/a11y-audit` (this IS a WCAG fix; verify it as one)
- **Acceptance (binary):** with no sticky header, computed `scroll-padding-top` is `0px` and an
  anchor lands flush. With a sticky header it equals the pinned height. Verified on the LIVE page
  at 375/768/1440 — not from the emit.
- Time: ~20 min

## Task 2 — Collapse-when-pinned

**What:** when the header is pinned, a row with hide-on-scroll COLLAPSES (height → 0) instead of
translating. When the header is NOT pinned it keeps today's `translateY(-100%)`. Bean chose this
(option "a", 2026-07-26): one adaptive behaviour, not two client-facing options.

**Binding regression constraint:** the non-pinned case must render **byte-identical** to today's
live-verified `translateY` behaviour. That is the regression test, not an aspiration.

- Execution: **delegated** — `wp-sgs-developer`, sonnet via `/delegate`
- Brief: gate the collapse on the sticky body class; keep `translateY` otherwise; transition height
  (a layout animation — the same class of cost the shipped `padding-block` shrink already pays; the
  motion-perf rule bans `filter`/`box-shadow`, not layout props on a small strip)
- Depends on: Task 1 — **both touch view.js, do NOT run them in parallel**
- /qc gate after: yes — `/qc-council` (behaviour surface, blub.db 255)
- **Acceptance:** header pinned → the collapsing row's rendered height is 0 and the header's total
  height drops by exactly that row's height, with no gap. Header NOT pinned → computed transform
  and height identical to pre-change values at all three tiers.
- Time: ~40 min

## Task 3 — Advisory warnings + silent-failure guards

- The multi-sticky warning is **advisory only, never a gate** (Bean, 2026-07-26). A fully sticky
  header is legitimate — *especially paired with shrink* — just uncommon. Wording must be neutral
  ("this uses more of the screen on mobile"), NOT corrective.
- Guard the two silent-failure conditions: no ancestor of the header may have `overflow` other than
  `visible`, or `transform`/`perspective`/`filter` — any of these kills sticky with no warning.
- A single row still cannot be both "retained when pinned" and "hidden on scroll".
- Execution: inline. /qc gate: `/qc-inline`. Time: ~20 min

## ⚠ Do NOT build the D2 offset chain

The mini-design's D2 specifies a multi-sticky offset chain (custom properties + ResizeObserver
`calc()` chains). **Under the approved header-level design there is exactly ONE sticky element, so
there is nothing to chain.** Building it would be dead machinery. The research is banked in the
memory file above for (a) the Spec 18 floating layer, which genuinely needs bottom-edge stacking,
and (b) if per-row sticky is ever revisited. If you think you need it, re-read D1 first.

## ⛔ STOP entries (all carried forward + this session's additions)

- **Keep `SGS_Container_Wrapper`.** Never re-open block-private (6/6 council). Add capabilities to
  the engine, never fork it.
- **CSS tier-gating via a JS-added state class, NOT `[data-attr]` presence** — the P1 code-review
  bug: a presence-only selector applies on every tier. Gate on an `is-row-*-active` class the JS
  adds ONLY on active tiers.
- **Verify per-row behaviour on the LIVE DOM, not the emit** (D375 dead-selector). Use
  chrome-devtools; smooth-scroll pages need `behavior:'instant'` + a real ~300ms wait (a 2-frame
  wait reads mid-animation).
- **`view.js` lives at `src/header-behaviours/`, NOT `src/blocks/`** (webpack entry footgun).
- **`sgs_resolve_tier_booleans({desktop:true})` resolves to ALL tiers** (inherit-upward). "Desktop
  only" needs explicit `{desktop:true, tablet:false, mobile:false}`.
- **Shared-tree git:** `git branch --show-current` in the SAME command as the commit; commit with
  explicit `-- <paths>` (a path-scoped-commit hook enforces this); a co-active session is often
  committing concurrently.
- **Deploy:** the full `npm run build` prebuild is BLOCKED by a pre-existing `sgs-quote` ledger
  drift (parking `P-CONFORMANCE-GOLDEN-DRIFT` — NOT yours, do not blind-reseed). Route around it:
  `npx wp-scripts build --experimental-modules --webpack-copy-php` (PowerShell), then deploy from
  an ISOLATED worktree with a copied `build/` + `--skip-build`. Then **md5 the changed files
  local↔server** — the HTTP-200 verify leg proves nothing.
- **Visual-diff gate blocks any block render.php/block.json/edit.js touch.** For additive/opt-in
  changes whose default render is byte-identical, write an HONEST report at
  `reports/visual-diff/<block>-<date>.md` + `git commit --no-verify` (sanctioned by the gate).
- **No inline `style=""`** (Spec 32); device tiers 768/1024; DB-first (no hardcoded dicts); no
  version bumps / no `deprecated.js`.
- **NEW — build-green is ZERO evidence for an editor-surface change.** Two editor-killing crashes
  shipped past webpack + dead-controls + a brand-new gate in ONE session (`786c1525`, `d1788d61`):
  a lost `useState` import, then a TDZ (`const` read above its declaration). A crashed block renders
  a tidy "This block has encountered an error" placeholder that is easy to skim past. After ANY
  `edit.js` / shared `src/components` change: deploy, OPEN the editor, `list_console_messages`.
- **NEW — after a scripted multi-file edit, grep EVERY file to confirm it landed.** A python script
  reporting success is not proof the file on disk changed — that is how the `useState` import was
  lost while the footer twin kept its copy.
- **NEW — verify WHICH config is ACTIVE before measuring.** Testing "Proof Footer" (1571) gave a
  false negative; the active footer is CPT **1654** (`wp option get sgs_active_footer_cpt_id`).
  Check the option, never infer from the name.
- **NEW — an absolute value in a SHARED stylesheet cannot know the resting value it modifies.**
  That is the shrink grow-bug. Now gated by `check-shared-css-state-rules.js`; never baseline one
  of its findings without a recorded reason.
- **NEW — fact-check your OWN brief before a council decides on it.** Three load-bearing claims in
  my decision brief were false and all favoured my own recommendation. Grep-verify before dispatch;
  always seat a code-grounded falsifier.
- **NEW — `prefers-reduced-motion` resets must repeat the FULL selector** of whatever set the
  transition. A lower-specificity reset silently loses (caught in review this session).

## Skills to Invoke

| Skill | When |
|---|---|
| `/brainstorming` | MANDATORY — any architectural or design decision |
| `/gap-analysis` | MANDATORY — grade output before delivery |
| `/lifecycle` | MANDATORY — before any skill/agent/pipeline change |
| `/research` | MANDATORY — auto-routes to the right tier (`--tier extended` for multi-angle) |
| `/strategic-plan` | MANDATORY — plan implementation order before writing code |
| `/sgs-wp-engine` + `/wp-block-development` | the block build |
| `/qc-council` | before every deploy on the behaviour surface (blub.db 255) |
| `/qc-inline` | per-file inline checks |
| `/sgs-db` | DB ground truth before any "missing X" claim |
| `/a11y-audit` | Task 1 is a WCAG fix — verify it as one |

## MCP Servers & Tools

| Tool | For |
|---|---|
| chrome-devtools | live DOM **and editor console** verification on the canary (Playwright's browser is often locked by a co-active session) |
| `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py` | DB queries |
| `ssh hd` | canary shell; run `wp option get sgs_active_footer_cpt_id` before any footer work |

## Agents to Delegate To

| Agent | When |
|---|---|
| `wp-sgs-developer` | Task 2 (the block build) — give it a self-contained brief pinning the collapse-vs-translate rule |
| `feature-dev:code-reviewer` | before every deploy — it caught the P1 tier-gating bug AND the reduced-motion specificity bug |
| `test-and-explain` | plain-English confirmation for Bean after the build |

## Guardrails

- Canary `sandybrown-nightingale-600381.hostingersite.com`; creds (gitignored, always available)
  `.claude/secrets/sandybrown.env`; WP 7.0.2; active header CPT **1570**, active footer CPT **1654**.
- Revert the canary to clean after testing, and delete any stray autosave — it shows the next
  session a false "newer autosave" banner.
- Everything is on `main` and pushed as of `bdc33f19`. Nothing is half-finished.

## Open threads (not blockers)

- **Spec 18 Floating UI extension** — extended research (2026-07-26) concluded persistent bottom
  CTA/cart/sale bars belong THERE, not in footer rows: no builder ships a per-row sticky footer,
  authorities split by purpose (navigation/transactional vs promotional), and bottom-edge stacking
  has no cross-vendor convention. Needs its own design gate. Build the shared bottom stacking
  container BEFORE a second bottom-anchored element exists (back-to-top already ships).
- **`P-HEADER-SIMPLICITY-FINDINGS`** (parking) — the FR-37-26 simplicity test FAILED; drawer content
  is not settable from the header editor. Blind-tester arm still needs a real non-coder (Bean).
- **Deal-winners:** B3 preset library (highest client-facing ROI), B2 preview-scroll button (partly
  addressed by the "Show me the shrunk size" editor toggle shipped this session).
- **Two lessons pending blub upload** (dashboard down — connection refused), flagged `⏳blub` in
  MEMORY.md. MEMORY.md exceeded its 24576-byte cap; 4 entries moved to `MEMORY-archive.md`.
- Leftover locked temp worktree dirs under `C:/tmp/` — `git worktree prune` when the lock clears.
