---
doc_type: next-session-prompt
project: small-giants-wp
generated: 2026-07-13
thread: BUILD P2 — sgs/adaptive-nav (replaces core/navigation → kills the WC mini-cart/account injection; the proper header nav). Then Site-Editor dedicated-header-section design-gate.
---

# NEXT SESSION — BUILD P2: `sgs/adaptive-nav`

You are the SGS WordPress block + frontend developer. P1 (`sgs/site-header` + `sgs/site-header-row`) is SHIPPED + live on sandybrown; the sub-400px WCAG header overflow is FIXED. This session builds **P2 — `sgs/adaptive-nav`** — the SGS navigation block. Invoke `/autopilot` first.

## ⛔ MANDATORY READING GATE (read IN FULL before any Write/Edit)
1. **`.claude/handoff.md`** — this session's full record (D324) + the inline Next Session Prompt (task detail, skills/MCP/agents tables, guardrails).
2. **`.claude/plans/2026-07-13-header-builder-remaining-work.md`** — state + PROVEN WC-block-hooks root cause + the full remaining roadmap + Site-Editor dedicated-section vision + SGS-first block audit.
3. **`.claude/specs/17-HEADER-FOOTER-ARCHITECTURE.md` §S9 (FR-S9-4/5) + Spec 17 IN FULL** (Bean-locked: read the governing spec end-to-end each session).
4. **`.claude/plans/2026-07-13-header-footer-nav-system-design-gate.md`** §5 (nav) + §6 (drawer).
5. **The DRAFT (design ground truth at every breakpoint):** `sites/mamas-munches/mockups/Claude App Design - Responsive Homepage and Product Page/mamas-munches-mockup.html` `.mm-header`.

## Why P2 next
The header still shows a stray WooCommerce mini-cart + customer-account because it uses `core/navigation`, and WooCommerce auto-injects those two blocks after ANY `core/navigation` via the WP Block Hooks API (PROVEN in WC source — see handoff §5). `sgs/adaptive-nav` replaces `core/navigation`, so the injection stops **by construction** — no `hooked_block_types` workaround (Bean rejected the workaround; do the architecture fix).

## Tasks (full orchestration blocks in `.claude/handoff.md` → "Next Session Prompt")
- **Task 1 — build `sgs/adaptive-nav`** (FR-S9-4): one menu source, 4-tier collapse (Desktop/Tablet/Mobile/custom-px) → burger → the existing `sgs/mobile-nav` drawer; mega-menu drill-down + back-link; desktop overflow → "more" menu; GOV.UK a11y wired to the drawer. Swap it into `parts/header.html` + pattern IN PLACE OF `core/navigation`; remove the nav-visibility CSS hack from `sgs/site-header/style.css`. Live-verify stray WC blocks GONE + clean single-row header vs the draft 320→1440.
- **Task 2 — Site-Editor dedicated-header-section design-gate** (FR-S9-6/8): the guided header-building UX (presets, overflow→drawer zone, device switcher). Design-gate for Bean sign-off.

## ⛔ ANTI-PATTERN STOPs (carried forward — NEVER subtract, D101)
- **STOP-READ-TRUTH-NOT-ASSUME (D324, Bean)** — read the theme files + WC/plugin source + the relevant SPEC for ground truth BEFORE theorising. The stray-header-block diagnosis wasted cycles on live-DOM probing until I read WC source (`MiniCart.php`/`CustomerAccount.php` anchor `core/navigation`). Prove the cause in the source, not by assumption.
- **STOP-ARCHITECTURE-LAYER-OVER-WORKAROUND (D324, Bean)** — when a symptom has a workaround (a filter) AND an architecture fix (our own block replacing the thing the symptom anchors to), prefer the architecture fix. Don't ship the `hooked_block_types` patch when `sgs/adaptive-nav` removes the anchor.
- **STOP-DRAFT-IS-DESIGN-GROUND-TRUTH (D324, Bean)** — the mamas-munches mockup specifies the header design at EVERY breakpoint (`.mm-nav display:none` <768, `.icon-hamburger` hidden ≥768, cart always). Match it; do not guess the responsive layout.
- **STOP-HEADER-IS-SITE-EDITOR-BLOCK-BASED (D323/D324)** — header/footer are block-based in the Site Editor, NOT a Customiser builder (Customiser is legacy for block themes; SGS global styles live in the Site Editor). A specialised container block INSIDE the template part is permitted (`sgs/site-header`/`-row`/`site-footer`/`adaptive-nav`); a monolithic header block is forbidden.
- **STOP-CSS-VER-CACHE-BUST (D310/D316/D322)** — a `style.css`/theme-CSS-only change is served stale unless `theme/sgs-theme/style.css` Version is bumped. A block CSS change bumps that block.json version.
- **STOP-VERIFY-CACHE-LAYER (D312/D322)** — LiteSpeed v7.8.1 active on sandybrown; `wp litespeed-purge all` + OPcache + CDN (`hosting_clearWebsiteCacheV1`) before ANY live CSS/JS measure.
- **STOP-21** — emit-green ≠ LANDED. LANDED = deploy + OPcache + LiteSpeed + CDN clear + live computed-value.
- **STOP-static-vs-live (D304/D305)** — for "does this rule apply / what renders?" use the LIVE DOM, never static PHP/CSS parsing.
- **STOP-67** — a changed BLOCK needs a pre-commit visual-diff report at `reports/visual-diff/<block>-<date>.md` (`verdict: PASS` + `first_paint_capture_passed: true`).
- **STOP-16** — a subagent / "it works" / build-green is a HYPOTHESIS. Re-run yourself. Node/npm via PowerShell (nvm shim broken in Git Bash).
- **STOP-WP-HOOKS-VALIDATE (D324)** — validate any WP hook via `/wp-hooks` (or `python ~/.claude/hooks/wp-docs.py validate-hook <name>`) before wiring it.
- **Composite-mirror (R-31-9 / D294)** — delegate outer render to `SGS_Container_Wrapper`; no divergent per-block styling path. No inline `style=""` (Spec 32). No block version bumps as deprecations (D270/D293).
- **Path-scoped commits** — `git commit -F <msgfile> -- <paths>`; `git add <file>` for NEW files, never `git add -A`; no co-author. Verify branch (`main`) + D-ceiling before commit.

## Methodology guardrails (do not skip)
- **Read the truth first** (theme files + WC source + spec), then diagnose. **Deploy before measure** (STOP-21). **Root cause before instance fix.** **Outcome vs completion** — the outcome is a clean draft-faithful header with NO stray WC blocks, live-verified; block-built ≠ done. **/qc + /visual-qa + /a11y-audit BEFORE declaring done.** The DRAFT is the design ground truth.
