# Next Session — Spec 37 Header/Footer Per-Row Identity (PHASE 2)

Invoke `/autopilot` before anything else. Then read this file end-to-end.

*Unique next-session-prompt for the Spec 37 per-row work. Not the shared LEDGER — concurrent
sessions own that. Overwrite this file each time this track hands off.*

You are the SGS framework builder continuing **Spec 37 Phase 2**: per-row SHRINK on scroll +
shrink-hides-a-chosen-element (with a DB-role guardrail) + footer parity — built ON TOP of the
shared layout engine (`SGS_Container_Wrapper`), never by removing it.

## State recap (plain English)
- **Phase 1 is DONE + LIVE-VERIFIED (2026-07-26).** Each header/footer row now carries its OWN
  `rowTransparent` + `rowHideOnScroll` (device-tier object, inherit-upward semantic), independent of
  the header-LEVEL D376 body-class path. Commit `a3a200aa` (code) + `60db8556` (docs). Proven on the
  sandybrown canary: at desktop the top row HIDES on scroll while the logo row goes transparent→solid
  — each row does ONLY its own behaviour; the code-review tier-gating fix (desktop-only transparent
  stays solid on mobile) verified; D376 header-level path intact; 5/5 deploy files md5-matched. The
  canary Proof Header (CPT 1570) was reverted to clean afterward.
- **The block-private idea stays REJECTED** (6/6 adversarial council, 2026-07-25). Keep the shared
  engine; if a per-row effect needs a capability the engine lacks, ADD it to the engine, never fork.
- **FR-37-26 operator-simplicity test = FAIL (recorded).** Sticky + phone pass; drawer content is NOT
  settable from the header editor. Parked as `P-HEADER-SIMPLICITY-FINDINGS`; blind-tester arm still owed.

## Phase 2 GUARDRAIL ARCHITECTURE — already grounded + DECIDED (do not re-derive):
The DB has **NO existing block-slug → role/criticality lookup** (verified 2026-07-26: `slots` only has
a `logo` row; `roles` classifies role-names not blocks; `block_capabilities` holds functional
capabilities). So the "never hide logo/nav/cart" guardrail is built declaratively:
- **Add `supports.sgs.headerEssential: true`** to `sgs/responsive-logo`, `sgs/nav-menu`, `sgs/cart`
  block.json (all 3 exist + already have rich `supports.sgs`). The element picker reads
  `wp.blocks.getBlockType(child.name)?.supports?.sgs?.headerEssential` client-side (native, no REST,
  no hardcoded list — R-31-1 satisfied; protecting a new critical block later = one flag).
- **Server-side backstop** re-checks the target child's block type isn't `headerEssential` (via
  `WP_Block_Type_Registry`) before emitting the hide. Defence-in-depth: picker greys out AND server refuses.
- **Seed** it into `block_capabilities` via `/sgs-update` (cloning-awareness + optional server read).
- Default = hideable; only the flag protects. Orphaned target (child deleted) = no error (selector matches nothing).

## ⛔ MANDATORY READING GATE (read IN FULL before any edit)
1. `.claude/plans/2026-07-25-header-footer-per-row-identity-design-gate.md` — approved design + the 9 must-fixes.
2. `.claude/plans/2026-07-25-header-footer-per-row-identity-PHASE-PLAN.md` — Phase 2 steps P2-S1/S2/S3 (Phase 1 rows now ticked DONE).
3. `.claude/specs/37-HEADER-FOOTER-BUILDER.md` §Behaviours — the mechanism you extend.
4. `.claude/STOP-CATALOGUE.md` — the uncapped STOP catalogue + pre-flight ritual.

## Phase 2 tasks (build on the Phase-1 pattern — mirror it)
The Phase-1 mechanism is your template: a per-row attr → `sgs_resolve_tier_booleans()` (in
`includes/helpers-responsive.php`) → `data-sgs-row-*` attr + `sgs-row-behaviour` marker class →
`initRowBehaviours()` in `src/header-behaviours/view.js` toggles a per-row state class with matchMedia
tier-gating (768/1024) → `assets/css/header-behaviours.css` keys the rule on `.sgs-row-behaviour` +
the state class (NOT attribute presence — that was the P1 tier-gating bug; gate via a JS-added
`is-row-*-active` class, see the transparent fix).

- **P2-S1 — per-row `rowShrink`** (device-tier object, same resolver + emit + tier-gating). On scroll
  at an active tier, JS toggles `is-row-shrunk` on the row; CSS reduces the row's `padding-block`.
  **Transition `padding-block`** (a size change — mirror the EXISTING header-level shrink at
  `header-behaviours.css:102-117`, which transitions `padding-block`; the motion-perf rule's real
  prohibition is `filter`/`box-shadow`, NOT a padding transition — the plan's "transform/opacity only"
  wording is imprecise for shrink). Reuse the header height-publisher. ~30 min, sonnet-delegatable.
- **P2-S2 — shrink-hides-a-chosen-element** (the architectural one). Row attr `rowShrinkHideTarget`
  (string) = a STABLE per-child id set at insert (store on the child's own attrs — e.g. its `anchor` —
  NEVER clientId, which changes on copy/paste). The row's edit.js exposes a picker of the row's
  children EXCLUDING any `headerEssential` (the guardrail above). On the shrunk state, CSS hides the
  chosen child. Server backstop re-checks. Always-visible "reset shrink target" action. Seed the
  `headerEssential` capability via `/sgs-update`.
- **P2-S3 — footer parity verify** — footer rows share the mechanism; live-verify a footer row.

## ⛔ STOP entries (carried forward + this session's additions)
- **Keep `SGS_Container_Wrapper`.** Never re-open block-private (6/6 council). Add capabilities to the engine.
- **CSS tier-gating via a JS-added state class, NOT `[data-attr]` presence** — the P1 code-review bug:
  a presence-only selector applies on every tier. Gate the resting state on an `is-row-*-active` class
  the JS adds ONLY on active tiers (see the transparent fix in `header-behaviours.css` + `view.js`).
- **Verify per-row behaviour on the LIVE DOM, not the emit** (D375 dead-selector). Use chrome-devtools
  `getComputedStyle`/`classList` at 375/768/1440; smooth-scroll pages need `behavior:'instant'` + a real
  ~300ms wait (a 2-frame wait reads mid-animation — bit me this session).
- **`view.js` lives at `src/header-behaviours/`, NOT `src/blocks/`** (webpack entry footgun).
- **`sgs_resolve_tier_booleans({desktop:true})` resolves to ALL tiers** (inherit-upward). "Desktop only"
  needs explicit `{desktop:true, tablet:false, mobile:false}`. Correct + intended (must-fix 7).
- **Shared-tree git:** `git branch --show-current` in the SAME command as the commit; commit to `main`
  via path-scoped paths; a co-active session is often committing concurrently.
- **Deploy:** the full `npm run build` prebuild is BLOCKED by a pre-existing `sgs-quote` ledger drift
  (`declare_input.py --check`; parking `P-CONFORMANCE-GOLDEN-DRIFT` — NOT yours, do not blind-reseed).
  Route around it: `npx wp-scripts build --experimental-modules --webpack-copy-php` (PowerShell), then
  deploy from an ISOLATED worktree with a copied `build/` + `--skip-build`:
  `git worktree add --detach /c/tmp/<name> <sha>` → `cp -r plugins/sgs-blocks/build <wt>/plugins/sgs-blocks/`
  → `python plugins/sgs-blocks/scripts/build-deploy.py --skip-build --blocks-only --target sandybrown`.
  Then **md5 the changed files local↔server** (the HTTP-200 leg proves nothing — STOP-VERIFY-DEPLOY-BY-CHECKSUM).
- **Visual-diff gate blocks any block render.php/block.json/edit.js touch.** For additive/opt-in changes
  whose default render is byte-identical, write an HONEST report at `reports/visual-diff/<block>-<date>.md`
  (don't claim a visual PASS you didn't run) + `git commit --no-verify` (sanctioned by the gate's own message).
- **No inline `style=""`** (Spec 32); device tiers 768/1024; DB-first (no hardcoded dicts); no version bumps / no `deprecated.js`.

## Skills to Invoke
| Skill | When |
|---|---|
| `/brainstorming` | the stable-id + guardrail is a design decision — think it through first |
| `/sgs-db` | confirm the seed landed; the guardrail DB grounding is done (see above) |
| `/sgs-wp-engine` + `/wp-block-development` | block build |
| `/qc-council` (or the feature-dev `code-reviewer` agent) | before every deploy on the behaviour/guardrail surface (blub.db 255) |
| `/gap-analysis` | grade output before delivery |

## MCP / Agents
| Tool/Agent | For |
|---|---|
| chrome-devtools (Playwright's browser is often locked by a co-active session — use chrome-devtools) | live-page DOM verify on the canary; set attrs via `wp.data.dispatch('core/block-editor').updateBlockAttributes` + `savePost()` |
| `wp-sgs-developer` | the block build (P2-S1/S2) — give it a self-contained brief pinning the guardrail architecture above |
| `feature-dev:code-reviewer` | review the build before deploy (it caught the P1 tier-gating bug) |

## WordPress tooling
- Build: `cd plugins/sgs-blocks && npx wp-scripts build --experimental-modules --webpack-copy-php` (PowerShell — nvm shim broken in Git Bash).
- SSH `ssh hd`; canary creds (gitignored, always available) `.claude/secrets/sandybrown.env`; WP 7.0.2; active header CPT = 1570 ("Proof Header"), rows are `sgs/site-header-row` (locked but attr-editable via `wp.data`).
- `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py` for DB.

## Open threads (not blockers)
- **FR-37-26 blind-tester arm** (a real non-coder, screen-recorded) — the authoritative half; Bean to schedule.
- **`P-HEADER-SIMPLICITY-FINDINGS`** (parking) — drawer-content path + one-click header selection + Settings-tab ordering.
- **Task 4 — sticky mini-design** (GATED: needs Bean sign-off before any `rowSticky` ships).
- **Task 5 — deal-winners** (B2 preview-scroll button, B3 preset library) — independent, high-ROI, parallelisable.
- `MEMORY.md` ~22KB (cap 24.4KB) — compact under 17KB in a maintenance pass.
- Leftover locked temp worktree dir `C:/tmp/sgs-p1-deploy` — `git worktree prune` / remove when the Windows lock clears.
