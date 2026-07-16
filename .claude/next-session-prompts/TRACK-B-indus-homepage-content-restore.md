---
doc_type: next-session-prompt
project: small-giants-wp
track: B — restore page content emptied by block migrations
generated: 2026-07-15 (rewritten same day after Track A committed its tree — clean-start edition)
starts: NOW — runs in PARALLEL with Track A's in-session drawer/header rebuild and Track C
owner: separate session (do NOT run inside the Track A / adaptive-nav session)
---

# TRACK B — the Indus homepage renders EMPTY. Find every casualty, restore them all.

Invoke `/autopilot` before anything else.

## ✅ START GATE — now a 60-second check, not a wait

Track A's previously-unverified tree is **COMMITTED and live-verified** (2026-07-15 evening):
`4e049ba9`/`bbf5ac35` (drawer chrome attrs), `3badd8d7` (logo-off), `ab5c7ca7` (scrollbar
bounce fix), and the D338-remnants commit (cart guard, heading inheritance, attribution,
D328 template fixes — per-block reports in `reports/visual-diff/*-2026-07-15.md`). The
renderers for YOUR casualty blocks are stable and committed.

**Verify then start (do not trust this paragraph):**

```bash
cd c:/Users/Bean/Projects/small-giants-wp
git fetch; git checkout feat/adaptive-nav-dialog-drawer
git status --short -- plugins/sgs-blocks/src   # expect: EMPTY or only files Track A's live session is editing right now
ls reports/visual-diff/ | grep -E "heading|business-info|cart" | grep 2026-07-15   # expect: 3+ reports
git checkout -b feat/track-b-content-restore   # YOUR branch, off the feature branch HEAD
```

**Track A's session is STILL RUNNING a header/adaptive-nav/site-editor rebuild in parallel.**
That is fine: it owns `src/blocks/{adaptive-nav,site-header*,site-footer*}` + header/footer
parts/patterns; your casualties are `sgs/hero`, `sgs/brand-strip`, `sgs/testimonial-slider`,
`sgs/info-box` — **disjoint**. Two coordination rules replace the old merge-wait:

1. **Never edit `.claude/decisions.md` / `parking.md` directly** (three concurrent sessions
   = guaranteed merge conflict on append). Write your entries to
   `.claude/scratch/track-b-decisions-pending.md`; the end-of-day handoff merges them.
2. **Never deploy code to EITHER site.** sandybrown already carries the feature branch
   (Track A redeploys it repeatedly this session); palestine-lives stays on `main` (Bean's
   rollback — LEAVE IT). Your content work is DB-side via the editor; your only code
   deliverable (the audit gate script) doesn't need deploying to prove.

## ⛔ THE ONE RULE THAT MATTERS

**The database is the ONLY copy of this content. If you destroy it, it is gone.**

This homepage was **designed by Bean in Spectra on an older site** and migrated in — never
produced by the cloning pipeline, and no draft in `sites/indus-foods/mockups/` can
regenerate it (`Indus Foods Ltd Homepage.html` is only a SCRAPE of that old Astra site, not
a source draft). A previous session was ~1 message away from telling Bean to "just re-clone
the homepage", which would have permanently wiped it. **Re-cloning is NOT the fix here.**

**Visual baseline:** the original is preserved and live at
**https://lightsalmon-tarsier-683012.hostingersite.com/** — the hand-built Astra/Spectra
Indus site. That is what "restored" looks like.

## Problem → Effect → Solution

**Problem.** SGS blocks migrated from scalar/typed attrs to InnerBlocks (FR-31-6). The
project then adopted a **no-deprecations policy** (D270/D271) whose stated remedy is *"old-
shape posts are re-cloned, not deprecation-migrated."*

**Bean's reasoning for D270/D271 — do NOT frame it as a mistake to reverse (his words,
2026-07-15):** the Indus homepage was never in a finished state; it is a DEV site; the
pipeline mattered more; the blocks were rebuilt repeatedly so the deprecations were repeated
throwaway work; and **the page can be manually rebuilt from the DB.** The policy was a
reasonable call in context. What was missing is a GATE, not a different policy.

**Effect.** Every page still stored in the OLD shape renders as an empty shell. Proven live
on palestine-lives.org 2026-07-14, on `main`, with zero feature-branch code:

| Measured on the live homepage | Result |
|---|---|
| `.sgs-hero` textContent length | **0** |
| `<h1>` count on the page | **0** |
| `.sgs-brand-strip img` count | **0** |
| Hero children | 2 empty divs (`__content`, `__media`) |
| PHP errors / fatals | none |

The content is intact in `wp_posts.post_content`, unreadable to the renderer. Homepage =
**page ID 13** (`wp option get page_on_front`), 22,012 bytes: `wp:sgs/hero`×1,
`wp:sgs/brand-strip`×1, `wp:sgs/testimonial-slider`×1, `wp:sgs/info-box`×8.

The stored hero — every "missing" word is right here:

```
<!-- wp:sgs/hero {"variant":"split","headline":"Leading Indian Food & Drinks Wholesaler",
"subHeadline":"Proud to be a family-run food wholesaler since 1962!",
"splitImage":{"id":0,"url":"/wp-content/uploads/indus-foods/2025/11/Indus-Foods-Banner-1024x683.jpg",...},
"ctaPrimaryText":"Apply For A Trade Account","ctaPrimaryUrl":"/apply-for-trade-account/",
"ctaSecondaryText":"Request Our Catalogue","ctaSecondaryUrl":"/catalogue/", ...} /-->
```

Self-closing, no InnerBlocks. `src/blocks/hero/render.php`'s docblock: *"is now rendered via
InnerBlocks ($content). Scalar content attrs (label, …"* — read for styling, render nothing.

**Solution (your job).** Convert the stored old-shape blocks to the new InnerBlocks shape,
preserving every word, image, URL and colour, with a reversible backup. Then prove it
renders as Bean built it.

## ⛔ HARD CONSTRAINTS

1. **`post_content` must NEVER be modified via WP-CLI `search-replace`, `wp eval`, or a PHP
   script.** `wp-content-guard.py` enforces it and WILL block you; it also breaks block
   validation and cascades. Sanctioned route: the block editor —
   `wp.data.dispatch('core/block-editor')` via Playwright, or the Site Editor by hand.
   **Design the migration around this from step 1** — do not discover it at step 9.
2. **R-31-14 forbids a server-side legacy fallback** in a migrated render.php
   (`if (empty($content) && !empty($legacy_attr)) {...}`). Do NOT make hero render its
   scalar attrs again — that is the exact hack the rule bans. If you believe it is the only
   path, STOP and design-gate with Bean.
3. **No block version bumps, no `deprecated.js`** (D270/D293) unless Bean explicitly
   overturns it. Note the tension, put it to him, do not decide alone. **The recovered
   `migrate()` functions are STALE** — they emit `level: 3` (a number → coerced to h2) and
   `sgs/icon` attrs (`icon`, `iconBackgroundColour`, `iconSize:'medium'`) the current
   block.json does not declare. Reference for INTENT only, never a drop-in.
4. **BACK UP FIRST.** Export every affected `post_content` to a timestamped file and verify
   it is readable BEFORE touching anything. `wp post get <id> --field=post_content >
   backup.txt` is read-only and safe.
5. **palestine-lives.org = DEV, sandybrown = STAGING canary.** Neither is a live client
   site. Content lives on palestine-lives (that IS the job); code deploys to it are Track
   A's call only.
6. **HEADER/FOOTER IS NOT YOURS.** Track A owns `parts/header.html`, `parts/footer.html`,
   the `sgs/site-header|site-footer|site-header-row|site-footer-row|adaptive-nav` blocks and
   all header/footer patterns — and is actively rebuilding them RIGHT NOW in a parallel
   session. Your scope is the page BODY of page 13 (and the body-content audit).

## ⛔ A SECOND, INDEPENDENT CAUSE — check for it (D338)

**WordPress DISCARDS any block attribute the block.json does not declare — silently.** No
error, no warning, no failing test, no failing build. Found **45 times** in the theme
patterns on 2026-07-15 (`sgs/business-info` passed `"type"` where the real attr is
`displayType` default `"phone"`; American `"textColor"` where the block declares British
`"textColour"`) — those blocks rendered a phone number, or rendered with no colour. All
pattern-side instances are FIXED and committed except the 6 `sgs/info-box` design-call items.

**Page 13 came from a Spectra-era migration ⇒ prime candidate for the same class.** The
recovered `migrate()` emitting undeclared `sgs/icon` attrs is this bug, exactly. **Adapt
`plugins/sgs-blocks/scripts/check-dead-pattern-attrs.py` (committed, working) to scan
`post_content` read-only** rather than hand-checking. This may be a second cause of
"content missing" on top of the InnerBlocks migration.

## Scope — NOT just the homepage

Audit every post/page on BOTH sites. A self-closing `wp:sgs/*` carrying content attrs
(`headline`, `subHeadline`, `ctaPrimaryText`, `text`, `logos`, `items`…) whose render.php
now expects `$content` is a casualty. Build the register first (read-only), then fix **by
cause-group**, not page-by-page:

```bash
wp post list --post_type=page,post --field=ID --format=ids
wp post get <id> --field=post_content | grep -o 'wp:sgs/[a-z-]*[^>]*/-->'
```

Cross-reference each slug against its `render.php`: does it read `$content`, or scalar
attrs? `/sgs-db` + `/wp-blocks schema` give the authoritative attr list — **enumerate the
schema BEFORE claiming an attr is "missing"** (R-31-8).

## Bean's decision on the systemic fix (APPROVED — build it)

**Audit gate + document.** Write the hole up (to your scratch decisions file, per the
coordination rule), AND build a read-only script that scans every post on a site for
old-shape SGS blocks. **Wire it into the DEPLOY path, not "remember to run it before a
migration"** — a gate that needs remembering is a document with extra steps. This is exactly
the discipline D182 used ("Audit gate PASSED: all canary post types scanned → re-clone path
safe") and that D271 skipped. That gate, not a policy reversal, is what was missing.

## Definition of done

- A register of EVERY affected post + block on both sites, with per-block cause.
- Backups of every touched `post_content`, verified readable.
- Indus homepage renders Bean's content: hero headline + sub-headline + both CTAs + split
  image; brand logos; testimonials; all 8 info-boxes.
- Live-verified on the REAL page (Playwright, computed DOM), not assertion output:
  `.sgs-hero` textContent > 0, `<h1>` ≥ 1, brand-strip `img` > 0.
- **Bean's eye confirms it matches what he built** — screenshot before/after. R-31-13: his
  sign-off is co-authoritative; numbers alone do not close it.
- The audit gate built + wired into deploy, and the hole written up in your scratch
  decisions file (`.claude/scratch/track-b-decisions-pending.md`).

## Rules that bind this work (D338/D339/D340 — learned the hard way)

- **Verify against the actual file / live DOM before ANY conclusion.** Across two sessions:
  3 handoff claims, a council claim, "180 tests pass", a "1.48:1 contrast FAIL" (it was the
  logo image — contrast doesn't apply), and a "CSS syntax error" (a grep rendering artifact)
  were all asserted and all wrong. A doc is a hypothesis. A subagent's "done" is a
  hypothesis (STOP-16). **Your own diagnostic output is a hypothesis** — re-read the exact
  line before theorising from it.
- **Prove the cause before the fix.** "Not A, therefore B" is not proof. (Live example from
  today: LiteSpeed was REFUTED as the drawer-CSS cause; the session did NOT then blame the
  next suspect — and the real cause turned out to be a third thing, the vanishing
  scrollbar.)
- **Universal, never a per-client carve-out** (R-31-9). A fix that only works for page 13
  is not a fix.
- **Green gates ≠ verified.** Build + 180 tests + every guard passed while the desktop nav
  rendered 0 links. AND: the STOP-67 pre-commit gate printed "COMMIT BLOCKED" today yet the
  commit went through (unexplained, logged in D339d) — do not lean on it as your only net.
- **Two test suites, do not conflate them:** `scripts/oracle/tests/` = 180 pass (green, runs
  in prebuild). `scripts/tests/` = **61 fail on a CLEAN tree** (61/112/2) — pre-existing.
  A/B against a `git stash` before blaming your change.
- **Cache:** clear the Hostinger CDN before EVERY live measurement
  (`hosting_clearWebsiteCacheV1`). LiteSpeed exists on sandybrown only, NOT on Indus.
  `build-deploy.py` clears NO caches — do it manually.
- **Windows:** node/npm via **PowerShell** (the nvm shim is broken in Git Bash).
  Stage/commit via PowerShell.
- Pre-existing dirt (`reports/phase4-*.txt`, root `.db` files, `rr.json`, `iapi.html`) is
  NOT yours — never commit it. (`lucide-icons.php` + `package-lock.json` were resolved
  2026-07-15; if they reappear dirty it is a BUILD side-effect — restore package-lock,
  commit lucide only with a build that regenerated it.)

## Skills / tools

| Skill | When |
|---|---|
| `/autopilot` | FIRST |
| `/systematic-debugging` | root-cause each block's empty render before touching it |
| `/brainstorming` | design the editor-driven migration route BEFORE building |
| `/adversarial-council` | pre-build gate — this touches the ONLY copy of Bean's content |
| `/sgs-db` + `/wp-blocks` | authoritative attrs/schema per block — never guess |
| `/qc-council` | validate the fix-shape against a measured baseline before dispatch |
| `/verify-loop` | 2 independent attestations per load-bearing claim |
| `/handoff` | session close |

| Tool | For |
|---|---|
| Playwright MCP | the ONLY sanctioned content-write route (`wp.data.dispatch`) + live verification |
| SSH + `wp post get` | READ-ONLY inspection + backups (`ssh hd`, see dev-setup.md) |
| Hostinger MCP `hosting_clearWebsiteCacheV1` | CDN clear before ANY live measurement |
