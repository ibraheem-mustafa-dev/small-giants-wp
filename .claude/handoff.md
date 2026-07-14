---
doc_type: handoff
project: small-giants-wp
generated: 2026-07-14
session: D336-D337 — dev+staging outage restored; deploy safety hardened + bypass closed; FR-S9-5 amended; adaptive-nav <dialog> drawer built + canary-verified; Indus rolled back on 3 regressions
---

# Session Handoff — 2026-07-14 (D336 + D337)

## Completed This Session
1. **Task 1a answered (Bean's question: benefit or remake?)** — a real benefit, but the handoff's reason was WRONG. There is no "delegation seam": adaptive-nav had ZERO coupling to the drawer (`render.php:8` is a comment). It is a 3-block assembly, already broken in 3 shipped patterns (`header-search-*` place the toggle without adaptive-nav → burger invisible at every viewport → drawer unreachable). mobile-nav wasn't worth porting (~4,200 lines; dead drawerBg/linkColour/breakpoint controls; backdrop-dismiss never implemented; static `aria-modal` hiding the page from AT even when closed).
2. **Row-fold research (Bean rejected "combo mode" as hardcoding — correctly)** — the live header used 5 block instances + 8 tier flags for 3 contact items. Answer: MEASURE nav links (already built), DECLARE header blocks server-side. Fluent UI v9 `Overflow` (`priority`+`pinned`) is the best declarative API; Gutenberg has none. **Bean's variants premise corrected:** mega-menu has ZERO variations; `sgs/business-info` has 8 (his own, D331). **Fold-defaults are a PRECONDITION for Spec 33 Part 2.**
3. **Restored dev + staging (both 500)** — an uncommitted edit (missing `use SGS\Blocks\Sgs_Site_Info;`) shipped in a 14:57 full deploy; `build-deploy.py` tars the WORKING TREE, not HEAD. Cause proven: restoring one file returned both to 200.
4. **D336 deploy hardening + closed the documented bypass** — scoped dirty gate (`deployed_dirty_files()`), default-ON fail-closed smoke test, `.bak` rotation. A qc-council caught that the code fix alone was INERT: `dev-setup.md` documented a raw ungated tar/scp as "recommended" for palestine-lives, and `--allow-dirty` was baked into 5+ commands. Docs rewritten; every target routes through the script.
5. **Self-caught a hole in that fix** — the gate skipped `src/`, but `npm run build` compiles src→build and build ships (proven: `build/render.php` byte-identical to `src/`). Went from catching 1 file to 6.
6. **D337 spec amendments (Bean-delegated)** — FR-S9-5's "drawer must be a direct child of `<body>`" mandated the D323 *workaround*, not the goal → now intent-based (elementFromPoint + background frozen). `aria-current` dropped from the toggle (category error), kept on links. Added: no static `aria-modal` on a closed drawer.
7. **Wave 1 + 2 built** — adaptive-nav owns its own burger + native `<dialog>` drawer; mobile-nav + mobile-nav-toggle deleted with every reference (incl. a live `require` in `sgs-blocks.php` NOT in the blast-radius list); 3 search patterns rebuilt onto the real header architecture; `/sgs-update` pruned 93 attrs + 2 blocks (exactly as predicted).
8. **Applied Bean's core-block rule** — DB `blocks.replaces` is authoritative; `sgs/container` replaces `core/group`. Swapped across all 5 header files + `site-header/edit.js` TEMPLATE. **Finished D335, which was only half-applied** (`a4167859` fixed edit.js but not block.json — both rows now clean).
9. **Canary VERIFIED live** — 10/10 reachable (baseline 10/10), 5 baseline links, exact baseline pink, `:modal`, scroll-locked, **backdrop-dismiss working (never was before)**, `aria-modal` gone when closed.
10. **Live verification caught a regression every gate missed** — the desktop bar rendered 0 links. Cause proven by reading the resolver: `SGS_Nav_Menu_Source` returned adaptive-nav's innerBlocks AS the menu (valid only for `core/navigation`). Gated on block name; re-verified.

## Current State
- **Branch:** `main` at `386f29be` (clean, deployable) · `feat/adaptive-nav-dialog-drawer` (migration, **NOT merged** — Indus unproven)
- **Tests:** 180 pass (1 skipped); all gates green (dead-control, control-ux, hardcoded-defaults, inline-styling 0/77, box-family, conformance goldens)
- **Build:** passes
- **Uncommitted:** only pre-existing session-start dirt (lucide-icons.php, package-lock, phase4-*.txt, .db, rr.json) — NOT this session's
- **sandybrown (STAGING canary):** new `<dialog>` drawer LIVE + verified
- **palestine-lives (DEV site):** ROLLED BACK to the old drawer via the D336 `.bak` net (~30s vs this morning's 2.5h). HTTP 200.

## Known Issues / Blockers
- **Indus: 3 regressions vs baseline** — (a) drawer menu lost "Sectors" + "Brands" (mega-menu items routed to the CONTENT zone instead of the menu — `class-sgs-adaptive-nav-renderer.php:352` / `:120`); (b) Google social lost (existed only in the legacy store; absent from Site Info's 7-network schema — **get the link from Indus's Google Business Profile**, do not re-open the schema); (c) drawer bg white not teal — **cause UNTESTED** (grep inconclusive; Hostinger CDN was NOT cleared on Indus).
- **STOP-67 outstanding** — no `reports/visual-diff/adaptive-nav-2026-07-14.md` yet.
- **~1,015 replaced-core-block uses remain in the theme** (core/paragraph 356, core/group 204, core/column 170, core/heading 128…) outside the header. Pre-existing debt; Bean's call.
- **ESC-close unverified** — the test dispatched the keydown AND called `d.close()`, so it proved nothing. ESC is native to `showModal()` but was not confirmed.

## Next Priorities (in order)
1. Render mega-menu items in the drawer MENU as accordions (restores Sectors + Brands → 18/18).
2. Delete `render_drawer_socials()`; place `sgs/social-icons` (`source: site-info`); restore the Google link from the Business Profile.
3. TEST the white-drawer cause (do not guess); clear the Hostinger CDN.
4. Re-deploy canary→Indus, re-verify vs baseline, squash-merge the branch to `main`.
5. §S9 Task 3 builder UX (`/ui-ux-pro-max`) → FR-S9-1..11 audit → Bean's sign-off → Spec 33 Part 2.

## Files Modified
| File path | What changed |
|---|---|
| `plugins/sgs-blocks/scripts/build-deploy.py` | Scoped dirty gate + fail-closed default-ON smoke test + `.bak` rollback rotation (D336) |
| `.claude/dev-setup.md`, `.claude/specs/19-SGS-CLI-COMMANDS.md`, `.claude/next-session-prompts/INTEGRATION.md`, `.claude/plans/2026-07-10-no-inline-parallel-rollout.md` | Raw tar/scp deploy removed; every target routes through the script; `--allow-dirty` stripped |
| `.claude/specs/17-HEADER-FOOTER-ARCHITECTURE.md` | FR-S9-5 amended to outcome-based (D337) |
| `plugins/sgs-blocks/src/blocks/adaptive-nav/*` | Own burger + native `<dialog>` drawer; allowedBlocks removed; inner-block routing |
| `plugins/sgs-blocks/includes/class-sgs-adaptive-nav-renderer.php` | Drawer menu + socials (with the `use` statement whose absence caused D336) |
| `plugins/sgs-blocks/includes/class-sgs-nav-menu-source.php` | innerBlocks-as-menu gated to `core/navigation` (the live-caught regression) |
| `theme/sgs-theme/parts/header.html`, `patterns/framework-header-default.php`, `patterns/header-search-*.php` | mobile-nav removed; core/group→sgs/container; 3 patterns rebuilt; theme 1.5.23 |
| `plugins/sgs-blocks/src/blocks/{site-header/edit.js,site-header-row/block.json,site-footer-row/block.json}` | TEMPLATE cleaned; allowedBlocks removed (finishing D335) |
| DELETED | `src/blocks/mobile-nav/`, `src/blocks/mobile-nav-toggle/`, `class-mobile-nav-renderer.php`, `mobile-nav-patterns.php`, `mobile-nav-inserter-scope.php` + fixtures |
| `.claude/decisions.md`, `.claude/plans/2026-07-14-adaptive-nav-drawer-design.md` | D336 + D337; the design + council must-fixes |

## Notes for Next Session
- **Green gates are not verification.** Build + 180 tests + every guard passed while the desktop nav rendered 0 links. Only the live DOM vs the captured baseline caught it. The baseline (Indus 18/18 + 7 links + 4 socials + teal; Mama's 10/10 + 5 links + pink) IS the gate.
- **Bean's 4 corrections, all mine to own:** palestine-lives/sandybrown are DEV/STAGING, not live client sites (a dev outage was dramatised as a client outage all session); the white-drawer cause was guessed instead of tested; 2 nav links were lost despite "replicate perfectly" being the acceptance; `sgs/social-icons` was reimplemented instead of reused.
- **A council rater's warning was FALSE here** — "a DB `wp_template_part` will make the file swap a no-op and break both sites" was fact-checked: no `header` part on either site; Indus's 3 stubs contain zero `sgs/*` blocks. Checking beat obeying.
- **The `<dialog>` ancestor trap is real** — the implementer correctly refused the design: collapsing the whole root would put `display:none` on an ANCESTOR of the dialog, suppressing top-layer rendering and breaking the drawer at exactly the tier it is needed.
- **D336 paid for itself twice** — it blocked a deploy of the half-migrated tree, and its `.bak` rotation turned the Indus rollback into 30 seconds (vs 2.5h that morning).
