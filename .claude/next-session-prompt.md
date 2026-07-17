---
doc_type: next-session-prompt
project: small-giants-wp
thread: Indus clone fidelity — section-by-section. HERO fully DONE (typography + overflow fixed this session). NEXT = BRAND STRIP.
generated: 2026-07-17 (hero typography closed + branch consolidation: adaptive-nav + indus-clone-fidelity dropped, Track B merged, Track C confirmed already-in-main)
---

Invoke `/autopilot` before doing anything else.

# SGS Indus Clone — Fidelity, continue section-by-section (BRAND STRIP → services → why-choose → testimonials → CTA)

## Mission
Make the Indus clone page body render pixel-faithful to the original, section by section, at 375/768/1440. CONVERT code+naming to native SGS blocks, but the RENDERED APPEARANCE must match. Header/footer are OUT of scope.
- Clone (what you edit): https://palestine-lives.org/  (WordPress page 13 = the front page)
- Original (target): https://lightsalmon-tarsier-683012.hostingersite.com/
- Branch: **`main`** (the indus-clone-fidelity branch was consolidated into main + deleted 2026-07-17). Client snapshot changes commit to main now (main's curated `sites/indus-foods/theme-snapshot.json` is CANONICAL — Bean-locked).

## ✅ Already DONE + live-verified (do NOT redo)
- **HERO — FULLY DONE at 3 bps.** Layout, split image inset, stacked buttons, mobile content-first, content-band cap, per-client tokens. TYPOGRAPHY closed 2026-07-17: heading (Montserrat 700 50px) + both buttons (Source Sans 3 500 18px 1px capitalize) already matched; the ONLY gap was the **subheadline weight** (was regular 400, now bold 700 to match the original's `<strong>`). Also fixed a 24px hero overflow (breakout fallback 24px→0px). Commit `3bb409be`. Verified: overflow 0 + subheadline bold at 375 + 1440.
- **BUTTONS (framework):** primary=black/gold, secondary=blue/white, wrap-by-default, responsive padding. Colours+structure live in the per-site snapshot.
- **Branches consolidated 2026-07-17:** `feat/adaptive-nav-dialog-drawer` + `feat/indus-clone-fidelity` deleted (work already in main via port `7c885ae1`); `feat/track-b-content-restore` merged (`7ff80520`); `feat/core-block-migration` (Track C) confirmed already-in-main (0 ahead). Kept: `feat/core-block-migration` (Track C worktree) + `feat/track-b-content-restore` (now mergeable/deletable).

## THE PER-SITE PATTERN (keep client values out of the shared framework — USE THIS)
- Client-specific values (colours, sizes, per-instance CSS) live ONLY in `sites/indus-foods/theme-snapshot.json` (a full theme.json: `settings.custom.buttonPresets`, `settings.layout.contentSize`, `styles.css` for scoped per-site CSS). NEVER hardcode client values into shared `plugins/sgs-blocks` or `theme/sgs-theme`.
- Push the snapshot (updates deployed theme.json + wp_global_styles DB post, no block deploy). Run from repo root:
  `python plugins/sgs-blocks/scripts/push-theme-snapshot.py --client indus-foods --target u945238940@141.136.39.73 --target-domain palestine-lives.org --app-user "Claude" --app-password "cQ0I gvIi p8Uu IRxB qkry GOoh" --yes`
- Generic/structural fixes (help ALL clients) MAY go in the shared block — but that needs a blocks build+deploy + a passing visual-diff report (see GOTCHAS).

## METHOD — per section (the gate is YOUR EYE, never a script)
1. Screenshot BOTH sites at 375/768/1440. LOOK first. List what's visibly different before touching computed values.
2. Pair elements by ROLE/visual purpose, not class name (names won't match). Reproduce the EFFECT (padding vs wrapper padding, margin vs gap, border vs shadow), not the literal property.
3. **MEASURE LIVE BEFORE FIXING** (learned hard this session): the symptom may already be fixed, and `getComputedStyle().fontFamily`/`.check()` LIE about whether a font actually loaded — use a canvas width-probe (declared-family width vs sans-serif width vs last-resort) OR `Array.from(document.fonts)` to prove the real rendered font. Don't fix a premise you haven't re-verified live.
4. Transfer each value into the right SGS home: per-site snapshot (client value) or shared block (generic). Prefer per-instance editor attributes for one-off layout on this page.
5. Deploy targeted, CLEAR THE CDN, re-screenshot both, confirm by eye + check `document.documentElement.scrollWidth === clientWidth` (no horizontal overflow). Then next section.
6. Do NOT use computed-parity.js / any diff script as the gate — it over-reports + misses meaning-equivalence.

## NEXT SECTIONS (page order)
1. **BRAND STRIP ("Our Brands") — START HERE.** Original = 8 clean WHITE rounded logo tiles in one row. Clone = ~14 tiny, blue-TINTED, washed-out tiles, cramped. Prior WIP is STASHED (`git stash list` → stash@{0} "brand-strip WIP"); `git stash show -p stash@{0}` and decide keep/adapt/drop (verify on live DOM — don't trust it). Likely the `sgs/brand-strip` block (`plugins/sgs-blocks/src/blocks/brand-strip/`) tile count/size/tint/background. Match the original's tile size, count (8), white background, spacing. NOTE: Track B already shipped a `brand-strip/block.json` items sub-schema fix (now on main) — check it before editing.
2. **SERVICES ("Our UK Wide Food Services")** — 4 coloured cards (yellow/teal/blue/green) with circular food images, heading, text, button. Desktop close; MOBILE badly broken (cards balloon to huge empty coloured blocks, food image dumped at the bottom). Also per-card food-image assignment differs from original. Fix mobile card layout + image assignment.
3. **WHY-CHOOSE** — original: large FILLED blue icons, CENTRED over centred headings; clone: small LINE icons, left-aligned. Match icon style + centring.
4. **TESTIMONIALS** — original: centred YELLOW card, avatar, name/company blue, no stars; clone: white card + gold stars + big pastry image on the right. Rebuild to match.
5. **CTA ("What Are You Waiting For?")** — original: text LEFT, buttons RIGHT (2-col); clone: centred stack. Also CONVERT the CTA's core `wp-block-button` buttons to `sgs/button` primary/secondary variants (they inherit the now-correct button defaults).

## HARD CONSTRAINTS + GOTCHAS (obey — cumulative, carried forward + extended)
- **SHARED WORKTREE — co-active sessions.** This `main` worktree is shared with other live sessions (sgs-theme, cloning, doc-restructure). Twice on 2026-07-17 a co-active session (a) started a MERGE that turned my in-flight edit's file into an unresolved-conflict/invalid state, and (b) advanced `main` under me. BEFORE editing any TRACKED file: `git status` + check `.git/MERGE_HEAD`. A session-start clean snapshot goes stale instantly. A merge you didn't start is NOT yours — leave it, don't `merge --abort`/`checkout -m`. You can't switch branches with unmerged paths. [[recheck-branch-immediately-before-every-commit-on-shared-worktree]]
- **COMMIT GATES (structural, will block you):** bare `git commit` is BLOCKED on shared main — always `git commit -m "..." -- <explicit paths>`. For a legitimate whole-index commit (e.g. a merge) add a `[batch-ok:<reason>]` token. A visual change to a SHARED block needs `reports/visual-diff/<block>-<date>.md` present with `verdict: PASS` + `first_paint_capture_passed: true` before it will commit. After a build, `git checkout HEAD -- plugins/sgs-blocks/includes/lucide-icons.php` to drop the auto-generated timestamp churn.
- **NEVER full-deploy the theme** (ships Track A header/footer onto Indus — separate open decision). Deploy blocks ONLY: `python plugins/sgs-blocks/scripts/build-deploy.py --blocks-only --allow-dirty --target palestine-lives` — RUN VIA PowerShell (node/nvm broken in Git Bash: `powershell.exe -ExecutionPolicy Bypass`). Self-verifies + keeps a .bak rollback.
- **Editor content on page 13** via `wp.data.dispatch('core/block-editor').updateBlockAttributes(clientId,{...})` + `await wp.data.dispatch('core/editor').savePost()` in the browser (Playwright). A hook BLOCKS wp-cli post_content writes. Login: wp-login.php user `Claude` pwd `p$12WOzWNeM3ALFLR5e8pnl5`; editor `/wp-admin/post.php?post=13&action=edit`. Find blocks by NAME (clientId changes per load). Back up page 13 first (existing backup: `.claude/backups/page-13-content-2026-07-16.html`).
- **CLEAR THE CDN before EVERY live measurement** (caches ~7 days): Hostinger MCP `hosting_clearWebsiteCacheV1` (username `u945238940`, domain `palestine-lives.org`).
- **PLAYWRIGHT BROWSER LOCK:** if "Browser is already in use" — a stale MCP chrome holds the profile lock. Find + kill ONLY the MCP chrome (never Bean's real Chrome): `Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" | ? { $_.CommandLine -like "*ms-playwright-mcp*" }` → `Stop-Process -Id <those> -Force`.
- Verify on the REAL front page at 3 bps + `scrollWidth === clientWidth`. Bean's eye is co-authoritative — show cropped before/after pairs.
- SSH: `ssh -i ~/.ssh/id_ed25519 -p 65002 u945238940@141.136.39.73` (alias `ssh hd`). Fidelity register (full per-section diff list): `.claude/scratch/fidelity-register-2026-07-16.md`.

## Skills / agents / tools (invoke at point of use)
- `/autopilot` FIRST. `/sgs-wp-engine` or the `wp-sgs-developer` agent for SGS block/theme/replication work (freshness gate may need `SGS_GATE_OFF=1` or `/sgs-update`). `/wp-blocks` + `/sgs-db` to find the correct SGS attr by meaning. `/systematic-debugging` to root-cause each mismatch. `/subagent-driven-development` to dispatch a per-section implementer + reviewers. `/library-docs` for WP-native standard before hand-rolling CSS. `/qc` (or `/qc-inline`) as the per-section gate before moving on. `/handoff` at close.
- MCP: Playwright (screenshots + getComputedStyle + canvas font-probe at 375/768/1440), Hostinger (`hosting_clearWebsiteCacheV1`), GitHub.

## Also still open (not section work)
- **Framework follow-up (from the hero fix):** the shared `sgs/hero` block's full-bleed breakout still falls back to `24px` when `--wp--style--root--padding-left` is unset — I patched it per-site for Indus (`24px→0px`), but the UNIVERSAL fix belongs in the shared block (change the fallback to `0px`) so every client is correct. Needs build + visual-diff + deploy.
- **Framework fix B:** soften the WCAG/contrast gate from hard-block → WARN (editor + inline); only hard-block when two colours are extremely similar (genuinely invisible text). Cloned work must not be blocked for matching the original's contrast.
- **Header/footer revert:** a prior session full-deployed the theme, shipping Track A's header/footer onto Indus (still live). Decide whether to revert `parts/header.html` + `site-header`/`footer` to main.

## Definition of done per section
Both sites screenshotted at 3 bps, visible differences listed + fixed via the right home (per-site vs shared), deployed targeted, CDN cleared, re-verified by eye (+ no horizontal overflow), committed path-scoped on `main`. Run `/qc` per section before moving on.
