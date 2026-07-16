---
doc_type: next-session-prompt
project: small-giants-wp
thread: MAIN is now consolidated (`a693e0e8`, Phase 2 nav/logo fixes live on both sites). NEXT: Phase 1 (drawer polish) → Phase 3 (finish Spec 34) → Goal 1 (Indus, incl. new 9px overflow)
generated: 2026-07-16 (D341/D342 rewrite — Phase 2 shipped + 3-branch merge to `main` landed + deployed live to both sites. Prior Track A/B/C branch-parallel framing is now HISTORICAL — see handoff.md for what changed.)
---

## ⭐ READ FIRST — header/footer/nav BUILDER REALIGNMENT (2026-07-16, separate from everything below)

A dedicated brief exists at
`.claude/plans/2026-07-16-header-footer-nav-builder-REALIGN-brief.md` — read it in full
BEFORE any header/footer/nav/builder/mode/bar-drawer/pattern work. It reconciles Bean's
builder vision against the specs + git + live code (two investigation agents this
session), records the Bean-approved realigned end-goals (A: dedicated Site-Editor
builder panel, B: extend the independent sticky/transparent/shrink toggles with partial
transparency + partial sticking + separate sticky-config, C: capability-parity — not
identity — unification of bar/drawer/breakpoints, D: retire legacy core-block header
patterns), and specifies a MANDATORY deep-research phase (core/navigation parity audit +
competitor builder feature matrices + reviews/complaints/CRO feedback) that must run
BEFORE any spec/design-gate/build work starts. It does NOT replace or subtract anything
below — Phase 1 (drawer polish), Step 1 (framework-vs-per-site split), and Goals 1/3/4
are unchanged and still apply; the brief only governs the builder-realignment scope.

# NEXT SESSION — post-consolidation (main = `a693e0e8`)

Invoke `/autopilot` first. Read **`.claude/handoff.md` FIRST** (carries this session's ship
+ merge + live-verify summary, plus the prior 3 Bean corrections below it), then `CLAUDE.md`
+ **Spec 17 §S9 IN FULL** + **Spec 34 IN FULL**
(`.claude/specs/34-ADAPTIVE-NAV-DISCLOSURE-DRAWER.md` — the drawer contract) +
`.claude/decisions.md` D342/D341/D340/D339/D338.

**Everything is now on `main` (`a693e0e8`, theme 1.5.38) and LIVE on both sandybrown +
palestine-lives/Indus** — the separate Track A/B/C worktrees below are HISTORICAL context for
how the work got here, not a live parallel-track warning any more. **Track B**
(`feat/track-b-content-restore`, Indus page content) is the one branch still OUT — it did NOT
merge this session (paused, uncommitted working-tree edits in the shared checkout); do not
touch its files without checking its own branch state first. **Track C**
(`feat/core-block-migration`, core→SGS migration) DID merge this session — its worktree
(`../small-giants-wp-trackc`) is now stale/mergeable-history-only.

**Track B/C scratch decision logs** (`.claude/scratch/track-{b,c}-decisions-pending.md`,
TB-1..9 / TC-1..34) were **NOT FOUND** in this worktree or in git history when the docs were
updated this session — if you locate them (another branch/worktree), fold them into
`decisions.md`/`parking.md` immediately; this is an open reconciliation item, not closed.

**⛔ A SHARED CHECKOUT SHARES `git HEAD`.** Track A/C branch switches silently REVERTED two
of Track B's working-tree edits, and one got committed in its reverted state under a message
claiming it was fixed. Take your own `git worktree` (Track C has one), and verify
`git show <sha>:<path>` — never the working tree — before believing a file is committed.
`.claude/next-session-prompts/TRACK-B-*.md` shows deleted in the shared checkout: that is
Track B's Bean-directed move to `.claude/scratch/`; don't sweep it into your commit.

## ✅ PHASE 2 SHIPPED + MERGED TO MAIN — read `.claude/handoff.md` FIRST (2026-07-16, D341/D342)

**`main` is now `a693e0e8`, theme 1.5.38, LIVE on both sandybrown + palestine-lives/Indus.**
Phase 2 (the `sgs/responsive-logo` `custom` mode + the `sgs/adaptive-nav` tablet-tier collapse
fix) shipped, passed a qc-council ship gate, and was consolidated with `feat/core-block-
migration` (Track C) + origin's docs-reconciliation commit into `main` via an isolated
worktree, then deployed to both sites. Full detail: `.claude/handoff.md` (top section) +
`.claude/decisions.md` D341/D342.

**Spec 34 is BUILT and live on the canary; Gate B ALL PASS.** Header row stays visible +
interactive while the drawer is open, burger↔X in place, drawer below the header, tint
excludes the header, drawer = InnerBlocks [container, `sgs/nav-menu`, container], NEW
`sgs/nav-menu` block inherits the nav's menu via context, axe 0. Spec:
`.claude/specs/34-ADAPTIVE-NAV-DISCLOSURE-DRAWER.md` · plan (with 4 pre-written dispatch
prompts): `.claude/plans/2026-07-15-spec34-build-plan.md` · council:
`.claude/reports/2026-07-15-spec34-qc-council.md` · reports:
`reports/visual-diff/{adaptive-nav,nav-menu}-2026-07-16.md`.

**Bean corrections applied + resolved:** the Call-button contrast was a NON-ISSUE, the
`P-CALL-BUTTON-CONTRAST` parking entry is now fully DELETED (archived to `memory/parking-
archive.md`, not just struck through); `primary-dark` is NOT mis-named (confirmed, no action
needed). **New correction, this session's live-verify:** resting drawer link text is `#000`
where Bean prefers the `text` token charcoal `#3a2e26` — see PHASE 1 below.

## ⭐ PHASE 1 — small drawer polish (do first, it is quick)

**Resting link text colour:** `sgs/nav-menu` drawer links currently render `#000` at rest.
Bean's stated preference is the `text` token (charcoal `#3a2e26`). **Keep** the
focus-mirrors-base behaviour (`color: inherit` on `:hover`/`:focus-visible`) and the underline
affordance — both are already live-correct per this session's colour measurement (D341/D342).
Change ONLY the resting colour; verify across all 8 client palettes (STOP-VERIFY-EVERY-CLIENT)
before shipping.

## PHASE 3 — finish Spec 34 (unchanged from before the merge), then the §S9 remainder

**Bean-ordered and NOT yet done — do it FRESH, after Steps 5/6/Gate C below:**
`/adversarial-council` on the shipped result with a tech-illiterate-client UX rater on the
Site-Editor builder, AND **prove the Site-Editor→frontend round trip for BOTH header AND
footer** (which source actually loads: theme file vs the DB template-part copy the first edit
silently creates vs the CPT rules engine — header and footer are wired differently; test both).

## ✅ DONE — do not redo (all committed on `feat/adaptive-nav-dialog-drawer`, all live-verified, reports in `reports/visual-diff/*-2026-07-1[56].md`)

**2026-07-16 (D341/D342) — Spec 34 drawer:** the rebuild (non-modal `.show()` + re-parent to
`<body>` + selective inert + real scrim + burger↔X + clip-path wipe) · the NEW `sgs/nav-menu`
block (accordion extracted, WP-menu picker, context inheritance, md5+anchor uid, `supports.color`)
· drawer = InnerBlocks [container, nav-menu, container] · nav-menu child inserted into
`parts/header.html` + `framework-header-default.php` · theme 1.5.25→**1.5.26** · `/sgs-update`
run (nav-menu `blocks` + `block_composition` rows + a `roles.position` row; F6 green) ·
`render_drawer_*` cluster + `setupDrawerAccordions()` DELETED · **`--sgs-header-height`
publisher added to webpack** (it had never compiled) · UA `dialog` width/height override ·
6 obsolete drawer attrs removed (zero stored instances, measured on both live sites).
**Gate B ALL PASS.** The late-CSS mystery is **closed by construction** (explicit geometry);
the scrollbar bounce stays fixed (`ab5c7ca7`).

**2026-07-15 (D338–D340):**

Step 0 (verify+commit the D338 tree) · Step 1 (uid: adaptive-nav md5+anchor — NOT the
sibling copy, its uid drives aria-controls; site-footer plain md5; the var()-fallback item
DISSOLVED with the line) · Step 2 (⛔ SHAPE FROZEN — §S9 Guardrail in Spec 17: no
flat→object reshape on the 5 §S9 blocks, new tiered capability = NEW SIBLING attr;
FR-S9-6's false "foundational" line corrected in-spec) · drawer chrome attrs `drawerBg`/
`drawerHeadBg`/`drawerWidth`/`showLogo`/`logoMaxWidth`/`closeButtonSize` (D339, 8/8 client
palettes verified) · **logo OFF by default** (D340, research-backed: 0/6 builders ship one;
capability kept opt-in; close button pinned top-right) · scrollbar bounce fix (D340) ·
Step 8/8b/8c (attribution element + heading inheritance — h1 58/h2 36/h3 19 live, was flat
36; Bean's heading-specific eye pass still pending, lands with Goal 4) · Step 9 partial
(whatsapp-cta `label` + sgs/label `text` renames committed) · Step 10 (Spec 15 sweep,
D338).

## STEP 1 — ⭐ SPLIT FRAMEWORK vs PER-SITE HEADER/FOOTER (Bean's insight — the root cause)

**Bean's words:** *"The header and footer template part and build that are part of the
theme/plugin and need to be committed to git and used across all sites need to be
differentiated and separated from the header and footer files that needs to be unique for
each website. Then those files need to be gitignored and we can figure out some sort of
REST API setup or json file setup like the styles snapshot for each website separately so
they can be safely set up via the pipeline primarily and via an agent when necessary."*

Independently confirmed: `theme/sgs-theme/patterns/footer-indus-foods.php` declares `Title:
Indus Foods Footer`, registered via `class-pattern-slug-shim.php:47` — **every client
install gets "Indus Foods Footer" in their inserter**, including its hardcoded Google Place
CID (`:88`). The only client-named pattern in the framework theme; CLAUDE.md already says
client work lives in `sites/<client>/` only.

Model: `sites/<client>/theme-snapshot.json` + `push-theme-snapshot.py` (proven). Sub-tasks:
move/delete `footer-indus-foods.php` (dissolves the CID problem by construction); decide
the per-site channel (JSON snapshot vs REST); gitignore per-site files. **Do this BEFORE
Goals 4/1 so they write to the per-site channel.**

## PHASE 3 (continued) — FINISH Spec 34, then the §S9 remainder

**Finish Spec 34 first (it is 3 steps from done — dispatch prompts pre-written in
`.claude/plans/2026-07-15-spec34-build-plan.md`):**
- **Step 5 / FR-34-5 — drawer settings** (Sonnet, §Dispatch-D): `toggleOpenColour`,
  `drawerAlign`, `drawerGap` {tiers}, `drawerPadding` {tiers}; reuse `ResponsiveControl`.
- **Step 6 / FR-34-6 — builder reflection** (Sonnet, §Dispatch-E): **RECONCILE, don't redo** —
  the nav-menu insertion, theme bump and `/sgs-update` already landed. What REMAINS: the
  Spec-17 FR-S9-4/5 pointer lines + FR-S4-5 linter + the CPT-template editable check.
- **Gate C / FR-34-7** — the closing gate: 768 + 1440 · ESC + focus-return + Tab-wrap ·
  elementFromPoint sweep vs the 10/10 baseline · frame sweep (anchor constant) · late-CSS A/B ·
  two-default `sgs/nav-menu` uid collision · short-viewport 50dvh floor · logged-in
  `#wpadminbar` · **Bean's screenshot sign-off (R-31-13)**.

**Then the §S9 remainder:**
- **Drawer chrome deferred by Spec 34 §5 (out of scope, not forgotten):** `drawerMaxWidth`,
  `closeButtonStyle`, `accentColour`, `variant` (overlay/bottom-sheet). `showDividers` +
  `dividerColour` are **BUILT on `sgs/nav-menu`** (that is where they belong) — do not
  rebuild them on adaptive-nav.
- **FR-S9-6** (the `{desktop,tablet,mobile}` model on the FINAL shape) — reuse
  `helpers-responsive.php:437-497`. Wiring, not invention. Shape freeze (Spec 17 Guardrail)
  binds: new sibling attrs, never reshapes. ⚠ Spec 34 §6 note: `drawerGap`/`drawerPadding`
  ship a bespoke tier object AHEAD of this model — FR-S9-6 must be shape-compatible with
  `helpers-responsive.php` or those attrs are stuck (they will have live stored values).
- **The collapse-tier hardcode — FIXED this session (D342, commit `65bd9cdd`).** adaptive-nav
  now reads `SGS_Breakpoints` (TABLET_MAX=1023/MOBILE_MAX=767) instead of the old hardcoded
  768/1024/1280; default `collapseTier` is now `tablet`. Live-verified on both sites: burger
  ≤1023, bar ≥1024. **Do not re-open this as if still broken.**
- **6 `sgs/info-box` dead attrs** (verdict B): restructure `mega-menu-services.html` to
  child `sgs/icon` blocks. NOT a rename.
- **PARKED, build-on-trigger:** `P-MODAL-SCROLLBAR-GUTTER` (modal's first deploy);
  `P-UIMAX-DRAWER-LOGO-AUTODERIVE` (near-moot under the new design — the header logo stays
  visible; do not build without a client actually asking).
- **CLOSED (archived, do not re-find):** `P-CALL-BUTTON-CONTRAST` — moved to
  `memory/parking-archive.md` this session (Bean 2026-07-16: non-issue — not hardcoded, and
  the cloned draft's menu has no such button).
- **NEW this session:** `P-INDUS-BRANDSTRIP-OVERFLOW-9PX` (Indus, width-independent, source =
  `sgs-brand-strip` marquee — see Goal 1 below) and `P-PHASE2-VISUAL-DIFF-REPORTS-DEFERRED`
  (the Phase-2 fixes shipped live-verified but without their `reports/visual-diff/*.md` files).

## STEP 3 — Goal 4: match the Mama's draft (Bean moved it BEFORE Goal 1)

`sites/mamas-munches/mockups/homepage/TRUTH-SPEC.md` is a real spec. **2 liabilities:** it
cites patterns `sgs-theme/header-mamas-munches`/`footer-mamas-munches` that **do not
exist**, and maps the hamburger to `sgs/mobile-nav-toggle` which was **deleted (D336)** —
re-point at `sgs/adaptive-nav` before any pipeline consumes it. Bean's heading-specific eye
pass (R-31-13, pending from the heading fix) lands here.

## STEP 4 — Goal 1: replicate the Indus header/footer (main = `a693e0e8`, everything merged + live)

**BASELINE = the preserved hand-built Astra/Spectra site:
https://lightsalmon-tarsier-683012.hostingersite.com/** — NOT `mockups/*.html` (that V3
mockup is a service-page template contradicting the framework's ≤1024 + Call-button +
drawer pattern; the live site wins — Bean).

**Restorable from git (better than rebuilding by hand):**
- `git show e3cd1a04^:theme/sgs-theme/patterns/header-indus-foods.php` (75 lines)
- `git show 0587f638:theme/sgs-theme/parts/header.html` (60 lines, pre-§S9)

**Bean's measured defects (some CLOSED by this session's merge+deploy — verify live before
re-fixing anything below):**
- ~~burger doesn't appear at the tablet breakpoint (1023)~~ — **FIXED + live-verified
  D342, both sites.**
- `sgs/responsive-logo` doesn't switch to the square/stacked logo at the mobile tier — the
  `custom` mode (D341) shipped; confirm it covers this specific complaint on Indus, since the
  logo-switch mechanism changed shape (mobile/tablet/custom, no more `auto`).
- buttons, rows, background colours not preserved
- ~~the shopping trolley on Indus~~ — **CONFIRMED LIVE this session:** Indus has no
  WooCommerce (`bodyHasWoo:false`) and the cart is correctly absent. Closed.
- sticky + shrinking-sticky header; "everything shrinks, never goes out of bounds"
- Mega-menu: contents need not match; only "show on mobile AND desktop, don't look a mess"
- **NEW this session:** pre-existing 9px horizontal overflow on Indus at BOTH 1000px and
  1440px (width-independent — not the Phase-2 change; header itself is within bounds at
  1425<1440). Source: the decorative `sgs-brand-strip` marquee (already `overflow:hidden` on
  its own rule, so the leak is elsewhere — a child's negative margin or an untransformed
  marquee-clone width is the likely next lead). Parked: `P-INDUS-BRANDSTRIP-OVERFLOW-9PX`.

**Capture the baseline AS A FILE FIRST** (`reports/visual-diff/header-footer-baseline-
indus.json`) — it has NEVER existed as a file; prose baselines are how a session lost 2
links while believing it had replicated perfectly. Bonus (Bean): lightsalmon is an
Astra/Spectra 3-layer customiser build — treat the comparison as a finding source about our
Site-Editor builder's weaknesses, not just a pixel target.

## STEP 5 — Goal 3: de-hardcode the base blocks (Bean's definition, corrected)

**NOT "empty containers derived from exemplars".** Bean: *"Goal 3 is about de-hardcoding
all of that content you had inserted into the base blocks/files when trying to set up the
Indus and Mamas header and footer row blocks."* Target: `site-header/edit.js` +
`site-footer/edit.js` TEMPLATEs + the row blocks.

**Headings rule (Bean):** blocks in general must NOT be in the shared header/footer default
— only in opt-in variations/patterns. *"Some even want no footer and leave it just with the
copyright/website credit strip."* `parts/footer.html` references `framework-footer-default`
⇒ REMOVE its `Quick Links`/`Contact`/`Opening Hours` heading blocks entirely (don't empty
them — 3 WCAG violations last time); rich versions already exist as opt-in patterns.

**Does NOT overlap Track C** (Bean checked): C = lossless core→SGS in patterns; this =
de-hardcoding base-block TEMPLATEs.

## ⛔ ANTI-PATTERN STOPs (carried forward — NEVER subtract, D101)

- **STOP-SCROLLBAR-LOCK (NEW, D340)** — locking body scroll (`position:fixed`/`overflow:
  hidden`) makes the CLASSIC scrollbar vanish MID-ANIMATION → viewport widens ~15px → any
  edge-anchored fixed/absolute element's anchor JUMPS = a "bounce past the end position".
  Overlay-scrollbar emulation CANNOT reproduce it — test on a desktop browser. Fix idiom:
  pin the root scrollbar track while locked (`documentElement overflowY='scroll'`, gated on
  `innerWidth − clientWidth > 0`). Instances: adaptive-nav FIXED; sgs/modal PARKED.
- **STOP-67-GATE-ANOMALY (NEW, D339d)** — the pre-commit visual-diff gate printed "COMMIT
  BLOCKED" yet the commit was created (19:09, `4e049ba9`). `SGS_EXIT=1` + `exit $SGS_EXIT`
  should have blocked. UNEXPLAINED — investigate before trusting it as the only net; write
  reports BEFORE committing, don't rely on the gate to remind you.
- **STOP-GATE-COMMENT-STRIPPER (NEW, D339d)** — `check-dead-controls.js` strips comments
  naively: a PHP STRING containing a block-comment opener swallows the rest of the file and
  every attr below reads as dead (false positives) — and the same swallow would hide REAL
  findings (false negatives). Keep `/*`-like sequences out of PHP string literals in
  render.php, or fix the stripper.
- **STOP-HARDCODE-IS-OVERRIDE-NOT-LITERAL (NEW, D339, Bean-locked)** — a hardcode = a value
  that OVERRIDES a legitimate channel: (1) inline/`!important`, (2) a valid GLOBAL default
  (theme.json), (3) **a meaningful UA default** (`align-items`, `flex-wrap` — a draft that
  leaves them unset MEANS the UA value; a block default that fills them in diverges the
  clone). An overridable default fighting no channel is a DEFAULT — ship it. Test: "what
  else could set this, and does my value beat it?"
- **STOP-CONTAINER-TIER-IS-NOT-VIEWPORT (NEW, D340)** — §S9 rows emit container-query tiers
  alongside media tiers (FR-S9-6). A row can collapse to mobile while the VIEWPORT is
  tablet-width (footer inner = 705px at 768 viewport = mobile tier, BY DESIGN). Measure the
  container before calling a tier boundary an off-by-one.
- **STOP-SILENT-ATTR-DISCARD (D338)** — WP discards undeclared attrs silently. Gate:
  `check-dead-pattern-attrs.py`. Never blanket-rename `textColor` (correct on core blocks).
- **STOP-VERIFY-EVERY-CLIENT (D338)** — a colour/contrast fix verified on ONE client is NOT
  verified. All 8 `sites/*/theme-snapshot.json` palettes. (D339 drawer: 8/8 measured.)
- **STOP-TOKEN-NAME-IS-NOT-A-LUMINANCE (D338)** — `primary-dark` is a PINK on
  mamas-munches. Resolve slug→hex, COMPUTE the fg (`helpers-colour-wcag.php`).
- **STOP-D328-SHAPE-NOT-JUST-VALUE (D338)** — specify the SHAPE (object vs flat; support vs
  attr) or WP coerces to default. Now structurally frozen (Spec 17 §S9 Guardrail).
- **STOP-GATE-BLIND-TO-DELETION (D338)** — delete attr + hardcode value ⇒ build stays
  green. Nothing catches render-without-control.
- **STOP-DIALOG-DISPLAY-GATE (D338)** — never put `display` on a `<dialog>` base rule; any
  author `display` beats the UA's `dialog:not([open]){display:none}`.
- **STOP-COUNCIL/REGISTER-FINDINGS-ARE-HYPOTHESES (D333)** — fact-check every one ("main
  ships the broken drawer" = FALSE; "180 tests pass" = suite-conflation).
- **STOP-GATES-GREEN-IS-NOT-VERIFIED (D337)** · **STOP-67** (reports BEFORE commit) ·
  **STOP-21** emit-green ≠ LANDED · **STOP-16** a subagent is a HYPOTHESIS ·
  **Node/npm via PowerShell — the nvm shim is broken in Git Bash** ·
  **STOP-WINDOWS-BASH-STALE** · **STOP-CACHE-URL-NEVER-CHANGES (D338)** — filemtime `?ver`
  on this branch, NOT on `main`; Cloudflare holds 7 days incl. 0-byte files ·
  **STOP-TEST-DONT-GUESS (D337)** · **STOP-REUSE-THE-WORKING-BLOCK (D337)** ·
  **STOP-READ-THE-ENV-CONFIG (D337)** — palestine-lives = DEV, sandybrown = STAGING ·
  **STOP-REPLICATE-EXACTLY (D337)** · **STOP-CORE-BLOCK-WITH-SGS-REPLACEMENT (D337)** — DB
  `blocks.replaces` (column `slug`) authoritative · **STOP-INNERBLOCKS-ARE-NOT-ALWAYS-THE-
  MENU (D337)** · **STOP-DEPLOY-CANARY-FIRST (D337)** · **STOP-HIDDEN-PARALLEL-SYSTEM
  (D330)** — grep first · **STOP-PARALLEL-TRACK-SWEEP (D326)** — pre-existing dirt
  (`phase4-*.txt`, root `.db`, `rr.json`, `iapi.html`) is NOT yours; package-lock CRLF
  churn = restore, never commit · **STOP-NO-ALLOWLIST (D335)** · **STOP-ONE-SOURCE-
  BUSINESS-INFO (D335)** · **STOP-MEASUREMENT-VS-EYE (D335)** — extended 2026-07-15: a
  probe can match a STYLESHEET rule instead of an element, grab a lookalike (disclosure ≠
  toggle), or flag a logo image for text contrast; Grep output can render `/*` as `\*` —
  verify the probe before the conclusion · Composite-mirror (R-31-9/D294) · no inline
  `style=""` (Spec 32) · no block version bumps / deprecations (D270/D293) — the theme
  `style.css` Version IS required and is NOT a block version.

## ⛔ PRE-FLIGHT SELF-ATTESTATION (answer before first Write/Edit)

1. Read Spec 17 §S9 IN FULL + D340/D339/D338 + the rebuild spec + handoff this session?
2. Did the in-session rebuild land? (Read ITS handoff — the step list above shifts.)
3. Am I about to assert a cause I have NOT tested?
4. Verifying colour/contrast on ALL 8 client palettes, not one?
5. Passing the declared SHAPE (object vs flat; support vs attr)? Shape freeze respected
   (new sibling attr, never a reshape)?
6. Does an SGS block/helper already do this? Did I grep? Did a parallel track already do
   it? (Check `.claude/scratch/track-{b,c}-decisions-pending.md` + their branches.)
7. Am I building FR-S9-6 before reconciling with what the rebuild shipped? (rework trap)
8. Canary before dev-site? Full cache clear incl. Hostinger CDN before measuring? Desktop
   browser (classic scrollbars) for any animation/geometry check?
9. D-ceiling (`grep -oE 'D[0-9]{1,4}' .claude/decisions.md | sort -V | tail -1` — bound
   the digits; an unbounded pattern matched a stray token and reported D850804) + branch
   verified?
10. Am I touching Track B's (page content) or Track C's (pattern core-blocks) files or
    their branches?

## Skills / tools

`/autopilot` (first) · `/systematic-debugging` · `/qc-council` (pre-commit on a11y-critical
surfaces) · `/sgs-db` + `/wp-blocks` (schema BEFORE any "missing X") · `/visual-qa` +
`/a11y-audit` (STOP-67 reports) · `/delegate` · `/handoff`.
Playwright MCP = the only gate that has caught these regressions — and use a DESKTOP
viewport with classic scrollbars for geometry/animation checks (emulation hides the
scrollbar class of bug). Hostinger MCP `hosting_clearWebsiteCacheV1` before EVERY live
measure. `build-deploy.py` (canary default; `--target palestine-lives` explicit) — **it
clears NO caches; do it manually.** LiteSpeed is on sandybrown only, NOT Indus.
**NEW (Track B, 2026-07-16):** `build-deploy.py` now runs `step_oldshape_audit` BEFORE the
build on EVERY deploy — it scans the target's stored `post_content` against the schemas you
are about to ship and ABORTS if they would strand or silently delete stored content (the gate
D182 used and D270/D271 skipped). Both sites PASS today (2s/4s), so it should be invisible to
you. If it fires, it means your schema change would eat live content: migrate the content
first (`scripts/wp-migrate-oldshape-blocks.js`, dry-run by default), or — only if the finding
is genuinely accepted debt — baseline it WITH a register reference in
`oldshape-audit-baseline.json`. `--skip-oldshape-audit` exists; using it makes stored-content
compatibility your problem.
