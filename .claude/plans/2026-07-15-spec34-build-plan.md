# Phase — Spec 34 build: adaptive-nav disclosure drawer (same-session, subagent-executed)

**USP:** kills the whole "drawer lands at random widths" bug class by construction, gives
clients a drawer they can style and rearrange like any other container, and keeps the
brand + close control visible the entire time the menu is open — the last structural
blocker before Goals 4/1 replication.
**Plan label:** `[PLAN: opus]` (main session = Opus orchestrator + QC; workers below)
**Docscore:** A (96%) — recorded after Stage 7 run
**Aggregate cost estimate:** ~2 Opus subagents (~150–250k tok each) + 2 Sonnet subagents
(~60–100k each) + inline integration/QC. Wall-clock estimate: **~60–75 min** (low-not-high
rule; live verification dominates).

**Process deviations (recorded honestly):** Stage 2 Research Pre-Gate satisfied by this
session's persisted research (`2026-07-15-drawer-logo-offcanvas.md` + the GOV.UK/Spectra
disclosure grounding in-conversation) — no fabricated re-research. Stage 6 Hidden-
Decisions peer pass folds into the `/qc-council` run Bean explicitly ordered on spec+plan
(same function, stronger raters); its findings append to the KJC section before execution.

**Phase success criteria (done when):**
- [ ] FR-34-7's QC table fully measured live on the canary (axe 0, elementFromPoint ≥
      baseline, ESC/focus/Tab-wrap, geometry constant under the frame sweep, tint excludes
      header, header interactive while open)
- [ ] The late-CSS A/B (block stylesheet disabled → restored) produces IDENTICAL open-
      drawer geometry — the "random widths" class is dead
- [ ] `sgs/nav-menu` inserted standalone in a test area renders + picker works
- [ ] Drawer children reorderable in the Site Editor and the change lands live
- [ ] Bean has the before/after screenshot pair (R-31-13)
- [ ] All gates green; STOP-67 reports for `adaptive-nav` + `nav-menu` written BEFORE
      committing (do not trust the anomalous hook, D339d)

**Entry context (cold sessions):** `.claude/specs/34-ADAPTIVE-NAV-DISCLOSURE-DRAWER.md`
(the contract) · `plugins/sgs-blocks/src/blocks/adaptive-nav/{render.php,view.js,
style.css,block.json,edit.js}` (current state, D340 head) · Spec 17 §S9 FR-S9-4/5 ·
`reports/visual-diff/adaptive-nav-2026-07-15.md` (measured defects).

**Tooling Index:**
| Type | Name | Used in |
|---|---|---|
| skill | /qc-council | pre-build gate (spec+plan) |
| agent | general-purpose (Opus ×2, Sonnet ×2) | steps 1, 2, 5, 6 |
| cli | npm run build (PowerShell) | every QA gate |
| cli | build-deploy.py --target sandybrown --allow-dirty | gates B, C |
| mcp | Playwright | gates B, C + final |
| mcp | Hostinger clearWebsiteCacheV1 | before every live measure |
| cli | /sgs-update (sgs-db.py) | step 6 |

---

## Dependency graph (why this order)

```
qc-council (spec+plan)  ── gate ──►  Step 1 (WS-A: FR-34-1+2, Opus)  ─┐
                                     Step 2 (WS-B: FR-34-4, Opus)  ───┤ PARALLEL (disjoint files)
                                                                      ▼
                                     QA Gate A (my QC on both returns, build green)
                                                                      ▼
                                     Step 3 (FR-34-3 integration, INLINE me)
                                                                      ▼
                                     QA Gate B (deploy + live smoke)
                                                                      ▼
                       Step 5 (FR-34-5 settings, Sonnet) ─┐
                       Step 6 (FR-34-6 reflection, Sonnet)─┤ PARALLEL (5 = adaptive-nav files,
                                                          │  6 = patterns/parts + DB — disjoint)
                                                          ▼
                                     QA Gate C = FR-34-7 full live gate (INLINE me) → commits
```

**File-ownership map (parallel-correctness):** WS-A owns `src/blocks/adaptive-nav/*`.
WS-B owns `src/blocks/nav-menu/*` (NEW dir) and READS adaptive-nav's render.php without
editing it (the old in-render menu is removed at Step 3, not by WS-B — this is what makes
the parallel split safe). Step 5 owns `adaptive-nav/{block.json,edit.js,render.php}`;
Step 6 owns `theme/sgs-theme/{parts,patterns}` + DB — disjoint.

---

Step 1 — WS-A: disclosure presentation + toggle (FR-34-1 + FR-34-2)
  Model:       opus (subagent)
  Action:      Rework adaptive-nav's drawer from showModal()/top-layer to the header-
               visible disclosure model: explicit fixed geometry below
               --sgs-header-height; scrim element below header; selective inert
               (skip the toggle's ancestor chain); manual focus containment
               {toggle+drawer}, ESC, scrim-click-close; burger↔X CSS toggle on
               [aria-expanded]; REMOVE drawer-head + obsolete attrs (showLogo,
               drawerHeadBg, logoMaxWidth, closeButtonSize, drawerSide, drawerWidth)
               and their controls; keep scroll-lock incl. the D340 scrollbar pin;
               slide-down animation + reduced-motion.
  Files:       plugins/sgs-blocks/src/blocks/adaptive-nav/{view.js,style.css,render.php,
               block.json,edit.js}
  Inputs:      Spec 34 FR-34-1/2 (verbatim in the dispatch prompt), current file state
  Outcome:     Drawer opens below a live header; toggle is the close; all removed attrs
               gone with no orphaned controls; npm build green.
  Exec:        PARALLEL with step 2
  Deps:        qc-council gate passed
  Marker:      (none)
  Time:        ~15 min
  Tooling:     Agent tool; PowerShell npm build in-agent
  On-Fail:     git checkout -- src/blocks/adaptive-nav; re-dispatch with the QC findings
  Prompt:      §Dispatch-A below (written; paste-and-run)
  Test:
    Happy:       toggle click → drawer visible below header, header clickable
    Edge:        sticky header scrolled (height var changes) → drawer top tracks it;
                 reduced-motion → no transform transition
    Fail:        --sgs-header-height missing → falls back 0 (full-screen), never mis-sized
    Integration: existing collapseTier/overflow/more-menu logic untouched (view.js diff
                 scoped to drawer sections)

Step 2 — WS-B: sgs/nav-menu block (FR-34-4)
  Model:       opus (subagent)
  Action:      Create src/blocks/nav-menu/ (block.json, render.php, edit.js, save.js
               → null, style.css, index.js): accordion menu extracted as a COPY from
               adaptive-nav's drawer-menu walk (SGS_Nav_Menu_Source reuse), ref attr
               (default null) + wp_navigation picker; usesContext sgs/navRef; shared
               TypographyControls + DesignTokenPicker styling; showDividers/
               dividerColour; color:inherit default. DO NOT edit any adaptive-nav file
               except block.json's providesContext addition — NO, not even that: the
               providesContext line is added at Step 3 by the integrator to keep WS-A's
               files single-owner. WS-B touches ONLY the new directory.
  Files:       plugins/sgs-blocks/src/blocks/nav-menu/* (NEW)
  Inputs:      Spec 34 FR-34-4; adaptive-nav render.php (READ-ONLY reference)
  Outcome:     Block registers, renders a menu standalone from its own ref/fallback,
               build green, gates green.
  Exec:        PARALLEL with step 1
  Deps:        qc-council gate passed
  Marker:      (none)
  Time:        ~15 min
  Tooling:     Agent tool
  On-Fail:     rm -r src/blocks/nav-menu; re-dispatch
  Prompt:      §Dispatch-B below
  Test:
    Happy:       block inserted → menu renders with page-list fallback
    Edge:        ref set to a second wp_navigation → renders it; context present +
                 ref null → context menu renders
    Fail:        menu with zero items → renders nothing (no empty <ul>)
    Integration: markup classes/ARIA byte-comparable to the current drawer menu

QA Gate A — both workstreams reviewed + build green
  Model:   inline (me — architectural judgment on two a11y-critical diffs)
  Exec:    SEQUENTIAL
  Deps:    steps 1–2 complete
  Check:   git diff review against Spec 34 §4 + Spec 32 (no inline), shape rules; then:
           cd plugins/sgs-blocks; npm run build (all prebuild gates)
  Pass:    build exit 0, 0 net-new gate findings, diffs match the FR contracts, WS-B
           touched ONLY the new directory (git status check)
  Fail:    findings → targeted re-dispatch to the owning agent with the diff + finding;
           never hand-patch a subagent's a11y logic without re-running its tests
  Marker:  QA

Step 3 — Integration: drawer-as-container (FR-34-3) + context wiring
  Model:       inline (me — touches both workstreams' outputs; conversation context
               is the asset)
  Action:      Replace adaptive-nav's in-render drawer menu + old content zone with ONE
               InnerBlocks zone, template [sgs/container, sgs/nav-menu, sgs/container],
               templateLock false; add providesContext {"sgs/navRef":"ref"} to
               adaptive-nav block.json; verify empty containers emit nothing; editor
               placeholder for the zone in edit.js.
  Files:       adaptive-nav/{render.php,block.json,edit.js}
  Inputs:      steps 1+2 outputs
  Outcome:     Default drawer = menu only; children editable/reorderable.
  Exec:        SEQUENTIAL
  Deps:        QA Gate A
  Marker:      (none)
  Time:        ~10 min
  Tooling:     Edit/Write inline
  On-Fail:     git checkout -- the three files; reassess the zone design
  Test:
    Happy:       fresh drawer renders the menu via the child block
    Edge:        menu child deleted by operator → drawer renders remaining children only
    Fail:        nav-menu block missing (not built) → InnerBlocks renders empty; no fatal
    Integration: existing authored drawer children on the canary still render

QA Gate B — deploy + live smoke (the mid-build reality check)
  Model:   inline (me)
  Exec:    SEQUENTIAL
  Deps:    step 3
  Check:   build-deploy.py --target sandybrown --allow-dirty; full cache clear (LiteSpeed
           + OPcache + Hostinger CDN); Playwright at 375: open drawer → header
           interactive (elementFromPoint on toggle = toggle), drawer below header
           (rect.top === header bottom ±1), menu renders, links reachable, ESC closes,
           axe quick pass
  Pass:    all probes true, 0 console errors
  Fail:    STOP; systematic-debug the failing probe inline before any further step —
           do NOT stack steps 5/6 on a broken base
  Marker:  QA

Step 5 — Drawer settings surface (FR-34-5)
  Model:       sonnet (subagent)
  Action:      Add toggleOpenColour, drawerAlign, drawerGap {tiers}, drawerPadding
               {tiers} attrs + inspector controls (ResponsiveControl reuse) + scoped-CSS
               emission via sgs_emit_responsive_css; remove the hardcoded drawer
               padding literal from style.css (var fallback stays).
  Files:       adaptive-nav/{block.json,edit.js,render.php,style.css}
  Inputs:      Spec 34 FR-34-5 table (shapes are BINDING — object tiers exactly as
               specified); step 3's landed state
  Outcome:     4 new attrs live end-to-end, per-device values render per tier.
  Exec:        PARALLEL with step 6 (disjoint files)
  Deps:        QA Gate B
  Marker:      (none)
  Time:        ~10 min
  Tooling:     Agent tool
  On-Fail:     git checkout -- adaptive-nav; re-dispatch with findings
  Prompt:      §Dispatch-D below
  Test:
    Happy:       set desktop/mobile gap → computed gap differs per tier live
    Edge:        empty padding object → no rule emitted (helper contract '' = nothing)
    Fail:        malformed tier value → sanitised by the shared helper, no CSS injection
    Integration: dead-controls gate green (every attr consumed)

Step 6 — Builder reflection + patterns + DB (FR-34-6)
  Model:       sonnet (subagent)
  Action:      Update parts/header.html + framework-header-default.php together (byte-
               identical, §S1) IF the nav markup contract changed; bump theme style.css
               Version; run /sgs-update + spot-verify nav-menu rows; add the one-line
               Spec-17 pointer notes (FR-S9-4/5 BUILT notes → "superseded in part by
               Spec 34").
  Files:       theme/sgs-theme/parts/header.html, theme/sgs-theme/patterns/framework-
               header-default.php, theme/sgs-theme/style.css (Version), .claude/specs/
               17-HEADER-FOOTER-ARCHITECTURE.md (2 pointer lines), DB via sgs-update
  Inputs:      steps 1–3 landed markup
  Outcome:     Patterns coherent; FR-S4-5 linter green; DB has nav-menu rows.
  Exec:        PARALLEL with step 5
  Deps:        QA Gate B
  Marker:      (none)
  Time:        ~8 min
  Tooling:     Agent tool; sgs-db.py
  On-Fail:     git checkout -- theme/; re-run sgs-update
  Prompt:      §Dispatch-E below
  Test:
    Happy:       header pattern renders on canary; Replace picker lists it
    Edge:        parts/header.html vs pattern byte-diff = header/footer comment only
    Fail:        sgs-update errors → do NOT hand-edit the DB; fix input and re-run
    Integration: FR-S4-5 linter + pattern-slug shim registration green

QA Gate C — FR-34-7 full live gate + Bean screenshots + commits
  Model:   inline (me)
  Exec:    SEQUENTIAL
  Deps:    steps 5–6
  Check:   the FR-34-7 table, measured: 375/768/1440 sweeps; axe=0 open state;
           elementFromPoint sweep ≥10/10; ESC/focus-return/Tab-wrap; frame sweep anchor
           constant; late-CSS A/B identical geometry; no-inline 0/77; editor reorder
           round-trip; Site-Editor edit lands live; screenshots to Bean
  Pass:    every row has a measured value; reports written with verdict: PASS +
           first_paint_capture_passed: true BEFORE git commit
  Fail:    fix inline or re-dispatch to the owning workstream; NOTHING commits until
           this gate passes (the D339d hook anomaly means the pre-commit gate may not
           catch a miss — this gate is the real one)
  Marker:  QA + HANDOFF (session close after commits + prompt updates + decisions merge)

---

## Key Judgement Calls (pre-answered so execution never pauses)

- **KJC-1 — keep the `<dialog>` element or swap to a `<div>`?**
  Options: (A) keep `<dialog>` + `.show()` (non-modal) / (B) plain div.
  **Recommendation: A.** Keeps the existing markup contract, uid/ARIA wiring, and
  `[open]` CSS hooks; `.show()` confers NO top-layer and NO backdrop (we own both,
  which is the point) and no UA repositioning in supporting browsers when author
  position is set — which it now always is, in base CSS. Cost of wrong choice: markup
  churn across view.js/style.css for zero behavioural gain.
- **KJC-2 — how to freeze "everything except the header row"?**
  **Recommendation:** iterate the children of `body` (and of `.wp-site-blocks` when
  present); for each child, if `child.contains(toggle)` → skip (the header chain),
  else set `inert` + `aria-hidden`. Restore exactly the touched set on close (keep a
  WeakSet). Never touch ancestors of the drawer (D323 self-inert lesson). Cost of
  wrong choice: frozen toggle (the original P0 bug, inverted) — caught by Gate B's
  elementFromPoint probe.
- **KJC-3 — scrim element or `::backdrop`?**
  **Recommendation:** a real element rendered by the block (sibling of the dialog),
  `position:fixed; inset:var(--sgs-header-height,0) 0 0 0` — `::backdrop` only exists
  in the top layer we are leaving. Click = close. `pointer-events:none` NEVER (it must
  eat clicks).
- **KJC-4 — slide direction under the new geometry.**
  **Recommendation:** slide-DOWN from under the header (dropdown idiom — Spectra
  Dropdown, GOV.UK reveal). Bean's eye at Gate C decides; a swap is 2 lines. Flagged in
  Spec 34 §6 as the open question.
- **KJC-5 — removed attrs vs shape freeze.**
  **Recommendation:** REMOVAL of D339-era attrs (showLogo etc.) is sanctioned: the
  freeze forbids RESHAPING a stored value's type; these attrs shipped hours ago,
  pre-production, with zero stored instances. Note in the commit message; keep
  `drawerBg`.
- **KJC-6 — what if `--sgs-header-height` is absent** (behaviour layer disabled)?
  **Recommendation:** CSS fallback `var(--sgs-header-height, 0px)` → full-screen
  drawer, which is safe and obvious rather than mis-sized. The publisher ships in the
  same plugin, so absence is an edge, not a path.

### Pre-emptive decisions (appended from the qc-council pass)

*Filled by the qc-council run gating this plan — see
`.claude/reports/2026-07-15-spec34-qc-council.md`.*

---

## Dispatch prompts (paste-and-run; the orchestrator injects nothing else)

### §Dispatch-A (Step 1, Opus) — disclosure presentation + toggle

> You are rebuilding the drawer of `sgs/adaptive-nav` in
> `c:/Users/Bean/Projects/small-giants-wp/plugins/sgs-blocks/src/blocks/adaptive-nav/`
> per Spec 34 FR-34-1 + FR-34-2. READ FIRST, in full:
> `.claude/specs/34-ADAPTIVE-NAV-DISCLOSURE-DRAWER.md` (§3, §4 FR-34-1/2, §7) and the
> block's five source files. You own ONLY that directory. Windows: run node/npm via
> PowerShell, never Git Bash.
>
> BUILD:
> 1. view.js — replace `showModal()`/`close()` with non-modal open/close on the same
>    `<dialog>` (KJC-1: keep the element). On open: selective freeze — for each child of
>    `body` (and `.wp-site-blocks` if present), skip any element that
>    `.contains(toggle)`, else set `inert`+`aria-hidden` (track in a WeakSet/array;
>    restore exactly that set on close — never touch drawer ancestors). Manual focus
>    containment across {toggle + drawer contents} (Tab wraps, Shift+Tab reverses), ESC
>    closes + returns focus to toggle, scrim click closes. KEEP `lockScroll`/
>    `unlockScroll` exactly as-is (the scrollbar pin is load-bearing, D340).
> 2. render.php — render a scrim element as the dialog's sibling
>    (`.sgs-adaptive-nav__scrim`, `hidden` by default); toggle button gains a second
>    icon (X, `sgs_get_lucide_icon('x')`) — BOTH icons server-rendered, CSS shows one by
>    `[aria-expanded]` state. REMOVE the drawer-head block (logo + close button markup)
>    and the `$show_drawer_logo` logic, the `drawerHeadBg` emission branch, and the
>    `logoMaxWidth`/`closeButtonSize` custom-property emission. Keep `drawerBg`
>    (panel colour + computed fg — untouched).
> 3. style.css — drawer base rule becomes explicit geometry: `position:fixed;
>    top:var(--sgs-header-height,0px); left:0; right:0; bottom:0; width:auto;` (remove
>    the old inset/width/translateX side model + `--right`/`--left` modifier rules).
>    Slide-DOWN entry: `transform:translateY(-100%)`→`translateY(0)` on `[open]` inside
>    an overflow-clipped context so it never paints over the header; keep the existing
>    250ms/200ms curves + `@starting-style` pattern + `prefers-reduced-motion` (no
>    transform transition). Scrim: `position:fixed; inset:var(--sgs-header-height,0px)
>    0 0 0; background:rgba(0,0,0,.6);` fade in/out. Burger/X toggle CSS. DELETE the
>    drawer-head/logo/close-button rules that no longer have markup. The `#1a1a1a`/
>    `#fff` last-resort fallback pair on the drawer STAYS.
> 4. block.json + edit.js — REMOVE attrs `showLogo`, `drawerHeadBg`, `logoMaxWidth`,
>    `closeButtonSize`, `drawerSide`, `drawerWidth` and every control/destructure/
>    constant referencing them (DRAWER_WIDTH_UNITS goes if unused). Keep `drawerBg`,
>    `drawerLabel`, `menuButtonLabel` + their controls. Do NOT add new attrs (Step 5's
>    job).
>
> CONSTRAINTS: Spec 32 — zero inline style DECLARATIONS (custom-property VALUES are
> allowed); WPCS (tabs, Yoda, i18n with 'sgs-blocks'); UK English comments; 44px toggle
> target in BOTH states; no jQuery; do not touch collapseTier/overflow/mega-menu/desktop
> bar logic; do not edit any file outside the directory; do not run deploys.
>
> SELF-TEST before returning: `cd plugins/sgs-blocks; npm run build` (PowerShell) —
> paste the gate summary lines. `git status --short` — must show ONLY your directory.
> RETURN: a bullet summary of every behavioural decision you made that the spec did not
> dictate, the build output tail, and any spec ambiguity you hit (do NOT silently
> resolve spec conflicts — list them).

### §Dispatch-B (Step 2, Opus) — sgs/nav-menu block

> You are creating a NEW block `sgs/nav-menu` at
> `c:/Users/Bean/Projects/small-giants-wp/plugins/sgs-blocks/src/blocks/nav-menu/`
> per Spec 34 FR-34-4. READ FIRST, in full:
> `.claude/specs/34-ADAPTIVE-NAV-DISCLOSURE-DRAWER.md` (§4 FR-34-4, §7);
> `src/blocks/adaptive-nav/render.php` (READ-ONLY — the drawer-menu accordion walk you
> are extracting AS A COPY); `includes/class-sgs-nav-menu-source.php` (or wherever
> `SGS_Nav_Menu_Source` lives — grep for it); one existing 5-file block as the idiom
> reference (`src/blocks/social-icons/` is a good size). You own ONLY the new
> directory — you may NOT edit adaptive-nav or any shared include. Windows: node/npm
> via PowerShell.
>
> BUILD (5-file pattern, auto-registered from build/blocks — no registration wiring):
> - block.json: name `sgs/nav-menu`, category sgs-content, `usesContext:
>   ["sgs/navRef"]`, attrs: `ref` (number, default null), `menuFallback` (string,
>   default "page-list"), link colour/hover (string slugs), shared typography attr
>   family for links (the `TypographyControls` shape: `linkFontSize` etc. — copy the
>   attr NAMES adaptive-nav uses so operators see one vocabulary), `showDividers`
>   (boolean, default true), `dividerColour` (string slug, default "").
> - render.php: resolve menu = own `ref` ?? context `sgs/navRef` ?? fallback. Render
>   the SAME accordion markup the drawer renders today (copy the walk; keep classes
>   under a new `sgs-nav-menu__*` BEM root but preserve structure/ARIA: disclosure
>   buttons with aria-expanded/aria-controls, panels with hidden attr, aria-current on
>   the active link, real `<a href>` everywhere, 44px rows). Scoped `<style>` via the
>   md5-uid pattern (copy `sgs/social-icons`' uid line); typography via
>   `sgs_typography_css_rule`; colours via preset custom properties; dividers as
>   border-bottom gated on `showDividers`. Menu with zero items renders ''.
> - view.js (viewScriptModule): the accordion toggle handlers — extract/adapt the
>   drawer-accordion logic (aria-expanded + hidden toggling). Self-contained; no
>   dependence on adaptive-nav's view.js.
> - edit.js: menu picker (`useEntityRecords('postType','wp_navigation')` — copy
>   adaptive-nav's options pattern + "Inherit from navigation block" as the null
>   option), DesignTokenPicker (linked) for colours, shared TypographyControls,
>   divider toggle+colour. ServerSideRender preview or a static placeholder — pick the
>   cheaper one that shows the menu items.
> - save.js: `() => null`. style.css: the accordion/link/divider rules extracted from
>   adaptive-nav's drawer-menu CSS, re-rooted to `sgs-nav-menu__*`, with `color:
>   inherit` as the base link colour.
>
> CONSTRAINTS: Spec 32 no-inline; WPCS; UK English; no deprecations; block must work
> with NO adaptive-nav ancestor (context absent → ref/fallback). Do not run deploys.
>
> SELF-TEST: npm run build green (paste gate lines); `git status --short` shows only
> the new directory. RETURN: file list, every naming/structure decision the spec didn't
> dictate, ambiguities hit.

### §Dispatch-D (Step 5, Sonnet) — drawer settings

> Add the FR-34-5 settings surface to `sgs/adaptive-nav`
> (`plugins/sgs-blocks/src/blocks/adaptive-nav/`). READ FIRST: Spec 34 §4 FR-34-5 (the
> attr table is BINDING — names, shapes, defaults exactly); the block's current
> block.json/edit.js/render.php/style.css; `src/components/ResponsiveControl` usage in
> any existing block; `includes/helpers-responsive.php` header comment (emitter
> contract). Attrs: `toggleOpenColour` (string, ""), `drawerAlign` (string enum
> left/center/right, "left"), `drawerGap` (object, {desktop:"20px"}), `drawerPadding`
> (object, {}). Controls in the existing "Drawer" PanelBody; tiered values via
> ResponsiveControl; emission via `sgs_emit_responsive_css` on the drawer selector +
> plain rules for align (align-items map) + toggleOpenColour on the X state
> (`[aria-expanded="true"]`). Replace style.css's hardcoded drawer `padding:
> var(--wp--preset--spacing--40, 1.5rem)` with `var(--sgs-anav-drawer-pad, …)`? NO —
> emit padding as scoped rules from the attr; the style.css literal stays as the
> cleared-attr fallback. Spec 32 no-inline; WPCS; UK English; dead-controls gate must
> stay green (every attr consumed). SELF-TEST: npm build green, git status only your
> files. RETURN: decisions + gate output.

### §Dispatch-E (Step 6, Sonnet) — patterns + DB + spec pointers

> Reconcile the theme + DB with the rebuilt nav per Spec 34 FR-34-6. READ FIRST: Spec
> 34 §4 FR-34-6; `theme/sgs-theme/parts/header.html`;
> `theme/sgs-theme/patterns/framework-header-default.php`; the CURRENT
> `src/blocks/adaptive-nav/render.php` + `block.json` (post-rebuild state on this
> branch). Tasks: (1) if the adaptive-nav BLOCK MARKUP stored in the pattern/part
> changed contract (attrs that no longer exist: drawerSide/drawerWidth/showLogo/
> drawerHeadBg/logoMaxWidth/closeButtonSize), strip those attrs from the pattern/part
> markup — the two files must stay byte-identical apart from their headers (§S1);
> run `python plugins/sgs-blocks/scripts/check-dead-pattern-attrs.py` and get it clean
> for these files. (2) Bump `theme/sgs-theme/style.css` `Version:` one patch. (3) Run
> `/sgs-update` via `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py` refresh
> path (or the documented sgs-update entry point — read Spec 19's command section
> first) and spot-verify: `sql "SELECT slug FROM blocks WHERE slug='sgs/nav-menu'"`
> returns a row; block_attributes rows exist for the new attrs; removed attrs are
> pruned. Paste the query outputs. (4) Append ONE line to Spec 17's FR-S9-4 and
> FR-S9-5 BUILT notes: "Drawer model superseded by Spec 34 (disclosure, 2026-07-15) —
> see 34-ADAPTIVE-NAV-DISCLOSURE-DRAWER.md." Do NOT restate content. UK English.
> SELF-TEST: dead-pattern-attrs gate output + the DB query outputs + git status (only
> theme/, the spec file, and DB artefacts). RETURN: all outputs + anything ambiguous.
