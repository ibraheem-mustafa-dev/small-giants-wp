---
doc_type: handoff
project: small-giants-wp
generated: 2026-07-13
session: D324 — P1 header blocks (sgs/site-header + row) SHIPPED; overflow fixed; SGS-first v2; WC-block-hooks root-caused
---

# Session Handoff — 2026-07-13 (D324)

## Completed This Session
1. **Built `sgs/site-header` + `sgs/site-header-row`** (Spec 17 §S9 / FR-S9-2/6/7). Section + layout KIND composites delegating to `SGS_Container_Wrapper` (composite-mirror). 3 optional rows, empty-row zero-output. All prebuild gates green; DB reconciled (`block_composition` + roster + `composition_role` via seed-composition-roles.py + sync-container-wrapping-blocks.py).
2. **Fixed the live WCAG 1.4.10 header overflow** — live-verified on sandybrown 320/375/414/768/1440 (`scrollWidth ≤ innerWidth`, 0 overflow, toggle+cart 44×44, no inline `style=""`). Committed `a1433f82`.
3. **Wired the header** — `parts/header.html` + `patterns/framework-header-default.php` now place `sgs/site-header`; theme Version 1.5.8→1.5.10; `sgs_header` CPT gained `template => [['sgs/site-header']]` (an ADD).
4. **v2 SGS-first + draft-faithful** (Bean feedback) — swapped to `sgs/cart` (not woocommerce/mini-cart) + `sgs/responsive-logo` (not core/site-logo). Grouped cart+burger into `core/group.sgs-header-icons`; designed **collapse-to-drawer** (nav `display:none` <768 → drawer, burger only <768, cart+logo always) matching the mamas-munches draft. Committed `c575a41d`, pushed.
5. **Root-caused the stray header account+cart** (Bean caught the ugly result) — PROVEN in WC source: WooCommerce auto-injects `woocommerce/mini-cart` + `woocommerce/customer-account` after `core/navigation` via the WP Block Hooks API (`MiniCart.php`/`CustomerAccount.php` anchor `core/navigation`, `hooked_block_types` priority 9). Validated the `hooked_block_types` filter via `/wp-hooks`; **reverted the workaround per Bean** — fix is P2 adaptive-nav (replaces core/navigation → injection stops by construction).
6. **Documented the full remaining header-builder roadmap** — `.claude/plans/2026-07-13-header-builder-remaining-work.md` (state, proven root cause, P2 adaptive-nav, Site-Editor dedicated-section vision, deferred items, SGS-first block audit).

## Current State
- **Branch:** `main` at `c575a41d` (v2). P1 v1 at `a1433f82`.
- **Tests:** no suite run; `npm run build` passes all prebuild gates.
- **Build:** passes.
- **Uncommitted changes:** none material (build/ gitignored). functions.php reverted clean.
- **Deploy:** v2 header LIVE on sandybrown; overflow fix verified; stray WC blocks present (pending P2).

## Known Issues / Blockers
- **Stray WC mini-cart + customer-account in the header** (proven cause §5 above). The header is visually INTERIM until P2 `sgs/adaptive-nav` replaces `core/navigation`. NOT a defect in the new blocks.
- **Deferred cosmetics:** 1px bottom divider dropped (uniform border re-emit); desktop nav distribution to re-verify post-adaptive-nav; per-breakpoint logo images unset (falls back to site logo).

## Next Priorities (in order)
1. **P2 — build `sgs/adaptive-nav`** (FR-S9-4): full research + design + build. Replaces `core/navigation` in the header (kills the WC injection by construction), 4-tier collapse + mega-menu drill-down + overflow auto-collapse + GOV.UK a11y wired to the drawer. Then remove the nav-visibility CSS hack in `sgs/site-header/style.css`.
2. **Site-Editor "dedicated header section" design-gate** — the guided header-building UX (presets, overflow→drawer zone, device switcher). FR-S9-6/8 framed as one coherent builder.
3. **P3 `sgs/site-footer`** (reuses `sgs/site-header-row`) + cart hide-when-empty toggle.

## Files Modified
| File | What changed |
|------|-------------|
| `plugins/sgs-blocks/src/blocks/site-header/*` (NEW, 7 files) | Header shell block (section KIND) |
| `plugins/sgs-blocks/src/blocks/site-header-row/*` (NEW, 7 files) | Never-overflow row block (layout KIND) |
| `plugins/sgs-blocks/includes/class-sgs-block-cpts.php` | `sgs_header` CPT `template` key added |
| `plugins/sgs-blocks/scripts/{seed-composition-roles,sync-container-wrapping-blocks}.py` | Registered both new blocks (roster + composition rows) |
| `theme/sgs-theme/parts/header.html` + `patterns/framework-header-default.php` | Place `sgs/site-header` (v2: sgs/cart, sgs/responsive-logo, grouped icons) |
| `theme/sgs-theme/style.css` | Version 1.5.8→1.5.10 |
| `.claude/plans/2026-07-13-header-builder-remaining-work.md` (NEW) | Remaining-work roadmap |
| `reports/visual-diff/site-header{,-row}-2026-07-13.md` (NEW) | Live-verify reports (v1 PASS + v2 addendum) |

## Notes for Next Session
- **The draft is the ground truth for the header design at every breakpoint** — `sites/mamas-munches/mockups/Claude App Design - Responsive Homepage and Product Page/mamas-munches-mockup.html` `.mm-header`. Read it before designing adaptive-nav.
- **WC Block Hooks lesson:** WooCommerce auto-injects mini-cart + customer-account onto ANY `core/navigation`. Using an SGS nav block sidesteps it entirely — the architecture-layer fix beats the `hooked_block_types` workaround.
- **Read the theme files + specs for truth before assuming** (Bean directive) — the stray-block diagnosis wasted cycles until I read WC source directly.
- **Header is block-based in the Site Editor** (Bean-decided; NOT a Customiser builder — the Customiser is legacy for block themes, and SGS's global styles live in the Site Editor).

## Next Session Prompt

~~~
You are the SGS WordPress block + frontend developer. P1 (`sgs/site-header` + `sgs/site-header-row`) is shipped + live; the header overflow is fixed. Build **P2 — `sgs/adaptive-nav`**, the SGS navigation block that replaces `core/navigation` in the header (which also eliminates the stray WooCommerce mini-cart/account injection by construction). Invoke `/autopilot` first.

Read `.claude/handoff.md`, `.claude/plans/2026-07-13-header-builder-remaining-work.md`, `.claude/specs/17-HEADER-FOOTER-ARCHITECTURE.md` §S9 (FR-S9-4/5) IN FULL, and the design-gate `.claude/plans/2026-07-13-header-footer-nav-system-design-gate.md` (§5 nav, §6 drawer) before any Write/Edit.

## Skills to Invoke
| Skill | When |
|-------|------|
| `/brainstorming` | ALWAYS — nav collapse + mega-menu design decisions |
| `/gap-analysis` | ALWAYS — grade the nav block vs WCAG + FR-S9-4 |
| `/lifecycle` | ALWAYS — before any skill/agent change |
| `/research` | ALWAYS — competitor nav builders (Bricks/Elementor/Blocksy/Kadence advanced-header) |
| `/strategic-plan` | ALWAYS — order the adaptive-nav build |
| `/sgs-wp-engine` + `/sgs-update` | SGS block dev + DB register |
| `/wp-hooks` | validate ANY hook before using it (e.g. the interactivity/nav render hooks) |
| `/qc` · `/visual-qa` · `/a11y-audit` | live breakpoint + axe + keyboard traversal |

## MCP Servers & Tools
| Tool | For |
|------|-----|
| Playwright / chrome-devtools MCP | live nav collapse + drawer + mega-menu verification at every tier |
| Hostinger MCP `hosting_clearWebsiteCacheV1` | CDN clear before any live measure (user `u945238940`) + `wp litespeed-purge all` + OPcache |
| `/wp-blocks` + `/sgs-db` | schema/DB ground truth before any "missing X" claim |

## Agents to Delegate To
| Agent | When |
|-------|------|
| general-purpose (Sonnet) | scaffold + deploy/verify mechanics |
| wp-sgs-developer | heavy SGS nav block build (if registered) |
| design-reviewer | mobile nav UX/aesthetics sign-off |

## Task 1: Build sgs/adaptive-nav (FR-S9-4)
One menu source → desktop bar collapsing to a burger at a configurable 4-tier breakpoint (Desktop/Tablet/Mobile/custom-px), opening the existing `sgs/mobile-nav` drawer. Mega-menu drill-down + back-link on mobile; desktop overflow → "more" menu. GOV.UK a11y contract wired to the drawer. Model on `feature-grid` 5-file pattern; delegate outer render to `SGS_Container_Wrapper`. Swap it into `parts/header.html` + pattern IN PLACE OF `core/navigation`; then remove the nav-visibility CSS hack from `sgs/site-header/style.css`. Live-verify the stray WC blocks are GONE + the clean single-row header matches the draft 320→1440.

## Task 2: Site-Editor dedicated-header-section design-gate
Design (brainstorming) the guided header-building UX in the Site Editor per Bean's vision — presets, overflow→drawer zone, device switcher (FR-S9-6/8). Design-gate for Bean sign-off before building.

## Guardrails
- Deploy → `wp litespeed-purge all` + OPcache + CDN (`hosting_clearWebsiteCacheV1`) BEFORE any live measure (STOP-21). LiteSpeed v7.8.1 IS active.
- Verify on the REAL page (live DOM), never static parsing (STOP-static-vs-live). Read theme files + WC source for TRUTH, don't assume (D324 lesson).
- Composite-mirror (delegate to `SGS_Container_Wrapper`, no divergent path). No inline `style=""` (Spec 32). No block version bumps as deprecations (D270/D293). Bump `theme/sgs-theme/style.css` Version on pattern/theme-CSS changes.
- `/wp-hooks` validate before using any hook. Prefer the architecture-layer fix over a hook workaround (D324).
- Path-scoped commits on `main` (`git commit -F <msg> -- <paths>`, `git add <file>` for new, never `-A`, no co-author). Verify branch + D-ceiling before commit.
- `/qc` + `/visual-qa` + `/a11y-audit` BEFORE declaring done. The DRAFT is the design ground truth at every breakpoint.
~~~
