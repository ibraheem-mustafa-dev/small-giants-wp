Invoke /autopilot before doing anything else.

> **Co-active tracks share this worktree.** A Spec-35/31 track commits between handoffs. Files under
> `plugins/sgs-blocks/scripts/behavioural-analyser/*`, `db-consistency/*`, `sgs-update-v2.py`,
> `includes/lucide-icons.php`, `reports/phase4-*.txt`, `.claude/mistakes.md`, and
> `next-session-prompt-spec35*.md` may carry UNCOMMITTED changes that are **not yours**. Path-scope
> every commit, re-check `git branch --show-current` in the SAME command as the commit, never `git add -A`.
> **The shared prebuild is RED** on the co-active `sgs/tabs` `tabIndicatorColour` DB↔block.json finding
> (STOP-24). Build via `npx wp-scripts build --experimental-modules --webpack-copy-php` directly; the
> SGS visual-diff pre-commit gate blocks any touch to a block's render.php/block.json/edit.js without a
> passing visual-diff report — its OWN message sanctions `--no-verify` for logic-predominant changes
> (STOP-VISUAL-DIFF-GATE-NO-VERIFY-FOR-LOGIC). Do NOT reseed their DB; do NOT baseline their finding.
> A bare `git commit` (whole index) is gate-blocked on this shared tree — add `[batch-ok:<reason>]` in the
> command only after verifying `git diff --cached --name-only` is exclusively your paths.

---

# Next session — SGS mega-menu spine + mega starter cloning (Spec 36 Phase 2)

You are the engineer-orchestrator for the SGS header/footer/nav programme (Specs 36 + 37). Last session
shipped **FR-37-13 hide-on-scroll fix B (D376)** and **FR-37-7 the native starter picker for header+footer
(D377)** — both LIVE-VERIFIED. This session builds the **mega-menu spine** and clones Bean's mega designs
into the `sgs_mega_menu` CPT as starter presets, which completes FR-37-7 for the 3rd CPT.

## First action (smallest step, <5 min, zero deps)

```bash
cd "c:/Users/Bean/Projects/small-giants-wp" && git log -1 --format='%h %s' && \
  grep -oE 'D[0-9]{1,4}' .claude/decisions.md | sort -V | tail -1
```
Expect HEAD at/after `53081397` (co-active commits may be higher) and D-ceiling ≥ D377. Then read the LEDGER.

## Mandatory READING — before anything else

1. **`.claude/LEDGER.md`** — the single living status (its `⭐ CURRENT` covers D374–D377; the `⭐ Your next
   session` block holds the mega build brief + the exact design-asset paths).
2. **`.claude/STOP-CATALOGUE.md`** — the uncapped STOP catalogue (69 entries) + pre-flight ritual.
   **Answer the ritual (below) inline before your first Write/Edit or first agent dispatch.**
3. **`.claude/specs/36-SGS-NAVIGATION-SYSTEM.md`** IN FULL — the mega spine: **FR-36-3** (CPT model +
   starter picker — the picker mechanism is now BUILT, see D377), **FR-36-4** (desktop disclosure: hover/
   tap/keyboard, safe-triangle, WCAG 1.4.13, featured flag), **FR-36-5** (the mega CPT + native-menu
   association — 5 layouts), FR-36-8/10/17/9a. Strictly sequential.
4. **`.claude/specs/37-HEADER-FOOTER-BUILDER.md`** — **FR-37-7** (native picker, BUILT for header/footer,
   D377 — reference the mechanism) + **FR-37-8** (starter library) + **FR-37-36** (deferred custom React
   picker). ⛔ Specs 17 and 34 are DELETED — never cite.
5. Memory `native-cpt-starter-picker-and-pattern-version-cache` — HOW the picker works + the theme-version
   pattern-cache gotcha (below).

## Why this matters (motivation — Rule 7)

**Top USP:** a client picks a mega-menu STYLE from a visual card grid, edits it in a findable admin screen,
and it appears live — block-native, ARIA-compliant, zero external deps (replaces Max Mega Menu, JetMenu,
Kadence Pro mega). The picker mechanism already works (D377); this session makes it fire for mega + builds
the disclosure spine. **≈% impact:** completes the header/footer/nav programme's headline surface.

## Task 1 — Clone Bean's mega designs into the `sgs_mega_menu` CPT as starter presets — DESIGN-GATE FIRST

**What:** author `sgs_mega_menu` starter patterns from Bean's Claude Design drafts, scoped
`Block Types: core/post-content` + `Post Types: sgs_mega_menu`, so WP's native "Choose a pattern" modal
fires for mega (needs ≥2). This completes FR-37-7 for the 3rd CPT. **The picker MECHANISM is BUILT + proven
(D377) — this is pattern authoring, not a new picker.**
**SOURCES (verified present):**
- **PRIMARY — 2 Claude Design draft sets (each has SEVERAL mega formats; focus here):**
  - `sites/Mega-menu design/` (`Mega Menu.dc.html` + `_feature.dc.html`) — the **GENERAL** mega, most-common
    setup. **The HTML offers a CARD-style ↔ LIST-style toggle — the block/preset MUST support it** (a block
    control or a card/list variant pair).
  - `sites/Indus Foods Mega Menu Design/` (`Indus Foods Mega Menu.dc.html` + `_feature.dc.html` + `uploads/`)
    — a **WARMER, more personality-rich** variant (the general one reads clean/clinical). `.dc.html` = Claude
    Design export.
- **SECONDARY — `.claude/drafts/mega-menu/` (convert a FEW):** `DESIGN.md` + 11 layouts (photo-grid,
  split-aside-cta, logo-grid, info-box, link-columns v1-3, browse-switch, depth-stack) → map to Spec 36's 5
  mega layouts (photo-grid / split-with-aside-CTA / logo-grid / info-box / link-columns).
**Why:** fires the mega picker + gives clients the mega style library. **Estimated time:** design-gate ~45 min,
build ~60 min.
**Orchestration:**
- **Design-gate FIRST** (`/brainstorming` → Bean sign-off; author drafts through `/ui-ux-pro-max` SGS-BEM +
  `/frontend-design`) — the mega block/variant model is a shared mechanism (Rule 7).
- Delegated SONNET build (add "EXECUTE YOURSELF, do NOT delegate" — D362). **/qc-council after** (blub.db 255).
- **After adding pattern files, BUMP the theme `style.css` Version** — WP caches the block-pattern list against
  the theme Version, NOT file mtimes (cost a debug cycle on the D377 spike; memory + theme CLAUDE.md).
- **Acceptance:** creating a new `sgs_mega_menu` post shows the native "Choose a pattern" modal with ≥2 mega
  preview cards; choosing one writes that layout's block tree to SAVED `post_content` (DB-read, not editor
  state); the card/list toggle works live. Trash test drafts after.

## Task 2 — Spec 36 mega spine: desktop disclosure + mega panel association — DESIGN-GATE FIRST

**What:** FR-36-4 (desktop disclosure — `<button aria-expanded>`, hover-on-non-touch/tap-on-touch/keyboard,
hover-intent + safe-triangle + close-grace, WCAG 1.4.13, featured flag) + FR-36-5 (a menu item linking to an
`sgs_mega_menu` post renders a mega panel; else a simple dropdown). Strictly sequential per Spec 36.
**Why:** the actual mega behaviour. **Estimated time:** multi-session — design-gate the spine first, build in
increments. **Orchestration:** `/brainstorming` + `/adversarial-council` (code-grounded seat, D358) →
Bean sign-off → SONNET build increments, **/qc-council each**, live-verify each on the canary (R-31-13).

## Dependency graph

```
Task 1 mega starters (design-gate → sonnet build → bump theme version → live-verify picker)  ← do first
         ↓ /qc-council
Task 2 mega spine (design-gate → sonnet build increments, /qc-council + live-verify each)     ← sequential
         ↓
commit (path-scoped, branch re-checked in SAME command, --no-verify for logic per the visual-diff gate)
```

## Methodology guardrails (do not skip)

- **Native CPT starter picker = ≥2 patterns with `Block Types: core/post-content` + `Post Types: <cpt>`; drop
  any registration `template` seed; "Start from scratch" = a minimal shell card. After adding/changing any
  pattern, BUMP the theme `style.css` Version** (pattern cache is theme-version-keyed, NOT mtime-keyed). This
  is the proven FR-37-7 mechanism (D377) — reuse it, no custom UI.
- **Build via `npx wp-scripts build` directly** (shared prebuild RED on co-active sgs/tabs); commit
  `--no-verify` ONLY for logic-predominant changes (the visual-diff gate's own sanction), path-scoped.
- **Deploy on a shared worktree via an ISOLATED worktree** — commit first, `git worktree add --detach <sha>`,
  copy `build/` (+ changed `includes/`) in, `--skip-build`. Never junction node_modules. Never `--allow-dirty`.
  Windows file-lock may block `git worktree remove` — `git worktree prune` deregisters it.
- **Checksum every deploy** — `md5sum` changed files local↔server BEFORE measuring; `[verify] HTTP 200`
  passes on ANY working SGS page incl. old code (STOP-VERIFY-DEPLOY-BY-CHECKSUM).
- **Set option-driven state (active CPT) in the web context** — the admin "Set as active" action (D360),
  NOT a raw `wp option update` from a CLI path (store/prefix mismatch on the shared canary).
- **A page with 2+ instances of the same block is a MANDATORY live-verify case** (D374 —
  STOP-NO-TOP-LEVEL-FUNCTION-IN-PER-RENDER-PHP: a top-level fn in render.php redeclares on the 2nd instance).
- **A fix's CODE can be correct and still not fire / be dead** — verify EMISSION/RENDER on the LIVE page
  (R-31-11/R-31-13), never a green build or a code-read.
- **Prove a thing is MISSING before adding it** (D369) against rendered output, not one source file.
- **Negative control, or the test is vacuous** — "would this still pass if the feature were absent?"
- **Measure on the element that ACTUALLY holds the value.**
- **Fix a11y/contrast at the DRAFT/theme source, never a per-block carve-out** — Mama's primary `#e68a95`
  fails contrast as text (`P-MAMAS-PRIMARY-CONTRAST`); a theme-snapshot fix, not a block one.
- **STOP-29 — never "out of scope" on a spec'd surface.** Map every deferral to a named spec STAGE.
- **/qc multi-rater BEFORE every commit** touching SGS block / converter logic (blub.db 255).
- **An agent's "done" is a CLAIM — verify against the real repo / live state** (D362; held all last session).
- **WP_DEBUG_DISPLAY must stay false** on staging.

## Known-open, NOT blockers (do not re-litigate)

- **FR-37-13 + FR-37-7 (header/footer) are DONE (D376/D377)** — do NOT rebuild. Mega is the remaining FR-37-7 leg.
- **`P-MAMAS-PRIMARY-CONTRAST`** — Mama's brand pink fails contrast as text; theme-snapshot fix, site-wide.
- **`P-MEGA-CONTRAST-DEFERRED`** — check parking; mega contrast may have a prior note.
- Two unnamed `<main>` elements cause the framework `landmark-unique`/`region` axe hits (NOT the nav) — a
  separate open theme defect.
- **`P-NAV-FEATURED-HOVER-DRAFT-PARITY`** — ⛔ Bean-locked DO-NOT-FIX (planted cloning TEST CASE).
- **`FR-37-36`** — custom React starter picker; non-blocking EXTENSION, own completion rate. Not this session.
- Both sites show GENERIC proof headers (sandybrown #1570/#1571; palestine-lives #360) — admin "Clear active"
  restores. Real branded headers come via Spec 33 Part 2.
- Canary fixtures (reusable): header CPT **1655** (hide-on-scroll); FR-36-26c pages **1720/1721**; menus
  **98** (T1 Verify, 4 links) / **99** (T1 Big, 55). The mega CPT (`sgs_mega_menu`) exists + uses the native
  editor but has ZERO starters until Task 1.
- Design zips are gitignored (`sites/*.zip`); the EXTRACTED folders are committed. Blub dashboard is DOWN
  (port 5050) — lessons captured to CC memory, marked pending upload.
- Co-active `sgs/tabs` db-consistency finding — owned by the Spec-35 track. Bypass with the visual-diff gate's
  `--no-verify` + a `[gates-ok:<reason>]` token. Do NOT baseline.

## Pre-flight self-attestation ritual (answer inline before first Write/Edit or first dispatch)

1. Read the governing specs (36 mega FRs + 37 FR-37-7/8/36 in full) + the LEDGER + STOP-CATALOGUE?
2. Did the prior session's work actually LAND? (Read the LEDGER; verify HEAD ≥ 53081397, D-ceiling ≥ D377;
   FR-37-13 + FR-37-7 marked SHIPPED, not pending.)
3. Am I about to assert a cause I have NOT tested? (STOP-PROVE-CAUSE-BEFORE-FIX.)
4. Verifying colour/contrast on ALL client palettes, not one? (STOP-VERIFY-EVERY-CLIENT.)
5. Passing the declared SHAPE (object vs flat; support vs attr)? Shape freeze respected? (STOP-D328.)
6. Does an SGS block/helper already do this? Did I grep? Did a parallel track already do it?
7. Am I building ahead of reconciling with what already shipped? (rework trap — FR-37-7 mechanism is BUILT.)
8. Canary before dev-site? Full cache clear incl. Hostinger CDN + a theme-version bump for pattern changes
   before measuring? Desktop browser for any scrollbar/geometry check? (STOP-SCROLLBAR-LOCK.)
9. D-ceiling + branch verified in the SAME command as the commit? (STOP-RECHECK-BRANCH.)
10. Am I touching another track's files/branches without checking their state first?
11. Would my acceptance test still pass if the feature were absent? (STOP-NEGATIVE-CONTROL.)
12. Is this inherited task's premise still true? (STOP-VERIFY-A-DEFERRAL-BEFORE-EXECUTING-IT.)
13. Am I authoring a design draft without having loaded `/frontend-design` (+ `/ui-ux-pro-max` for SGS-BEM)?
14. Does the governing spec still describe the model we are actually building? (D358.)
15. If I am running a review panel, does it have a seat that verifies claims against live source? (D358.)
16. Am I trusting a block-attr filter gate without proving it FIRES on a real page? (D359.)
17. Am I about to DELETE anything on a live site (incl. test drafts) without opening it first? (D362.)
18. Does every implementer dispatch say "EXECUTE YOURSELF, do NOT delegate"? (D362.)
19. Am I setting option-driven state in the context that READS it (admin action / live domain), not a raw
    `wp option update` from an arbitrary CLI path? (D360.)
20. Have I verified this agent's "done" against the real repo / live state, rather than believing the report?
21. Am I proving a thing is MISSING before adding it — against rendered output, not one source file? (D369.)
22. Am I verifying a fix EMITS/RENDERS, not just that the emit code exists? (D371 — measure on the element
    that holds the value.)
23. Am I live-verifying with 2+ instances of the same block on one page, and NOT declaring a reusable
    function at the top level of a per-render render.php? (D374.)
24. **After adding/changing a block pattern, did I BUMP the theme `style.css` Version** so WP re-registers it
    (the pattern cache is theme-version-keyed, not mtime-keyed)? (NEW D377.)

## Design guardrails — Task 1 + Task 2 both author design drafts (mega preset cards + the disclosure/panel)

The full design-programme guardrails (brand-accent-as-ground, contrast-as-pairing, transition-only-
transform/opacity, no-hover-only-switching, degrade-to-more-content, recognised-slot-tokens, real-`<img>`
slots, background-recomputes-contrast, `dialog.close()`-kills-exit-animation, scrollbar-test-INCONCLUSIVE)
live UNCUT in `STOP-CATALOGUE.md`. **Both tasks author design drafts → load `/frontend-design` +
`/ui-ux-pro-max` FIRST.** The mega panel is hover/tap/keyboard-driven disclosure (FR-36-4) — no hover-ONLY
switching (content must be reachable), transition only transform/opacity, `prefers-reduced-motion`-gated.

## Skills to Invoke

| Skill | When |
|---|---|
| `/brainstorming` | ALWAYS — design-gate BOTH tasks before building |
| `/gap-analysis` | ALWAYS — grade dispatched agents' output before acting |
| `/lifecycle` | ALWAYS — before any skill/agent/pipeline change |
| `/research` | ALWAYS — auto-routes the research tier |
| `/strategic-plan` | ALWAYS — the mega spine is a multi-increment new surface |
| `/ui-ux-pro-max` | Author the mega draft mockups through the SGS-BEM contract |
| `/frontend-design` | Before authoring any mega preset card / disclosure draft |
| `/delegate` | Pick the model per dispatched task (Haiku mechanical / Sonnet build) |
| `/qc-council` | Multi-rater before any SGS-block commit (blub.db 255) |
| `/qc-inline` | Inline acceptance gate |
| `/adversarial-council` | Pre-build stress-test the mega spine — include a code-grounded seat (D358) |
| `/systematic-debugging` | Root cause before fix |
| `/sgs-wp-engine` | Any SGS block / theme / client work |
| `/wp-block-development` | Core WP block-API questions |
| `/sgs-db` · `/wp-blocks` | Mega CPT/block/variant DB ground truth — never a prose count |
| `/wp-sgs-deploy` | Deploy ceremony + gates |
| `/handoff` | Session close — REMEMBER to rewrite THIS file (`next-session-prompt.md`), not just the LEDGER |

## MCP Servers & Tools

| Tool | What for |
|---|---|
| `playwright` / `chrome-devtools` | Live DOM verification (R-31-11) — modal fires, apply writes post_content, disclosure hover/tap/keyboard, axe |
| `hostinger` | Cache purge / WP version checks |
| `sgs-db.py` | Mega CPT + block attributes/variants — DB is authoritative |
| `nav-qa/*.mjs` | `axe-run` · `crawl-assert` · `palette-contrast-sweep` |

## Agents to Delegate To

| Agent | When |
|---|---|
| `wp-sgs-developer` | Task 1 + Task 2 builds (add the EXECUTE-YOURSELF line, D362) |
| `code-reviewer` / `general-purpose` | Pre-commit multi-rater review + verify dispatched agents' "done" |
| `design-reviewer` | Compare the built mega panel against Bean's Claude Design drafts |
| `test-and-explain` | Plain-English confirmation for Bean that the mega picker + disclosure work |
