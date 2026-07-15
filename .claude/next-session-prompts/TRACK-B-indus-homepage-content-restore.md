---
doc_type: next-session-prompt
project: small-giants-wp
track: B — restore page content emptied by block migrations
generated: 2026-07-15
starts: AFTER Track A's Step 0 (verify + commit the working tree) — see the START GATE
owner: separate session (do NOT run inside the Track A / adaptive-nav session)
---

# TRACK B — the Indus homepage renders EMPTY. Find every casualty, restore them all.

Invoke `/autopilot` before anything else.

## ⛔ START GATE — do NOT begin until Track A's Step 0 is complete

Track A (`.claude/next-session-prompt.md`) has **11 unverified files in its working tree**, held by STOP-67. Its Step 0 is: deploy → live-verify → write the visual-diff reports → commit. **Until that lands, the blocks that render page 13 are in flux** — `sgs/heading`, `sgs/product-card` and `sgs/business-info` are all mid-change, and `sgs/heading`'s font-size behaviour changes on EVERY page (h1 36→50, h3 36→24, h6 36→14). Restoring content against a moving renderer means measuring twice and trusting neither.

**⛔ Track A runs Step 0 and Step 4 CONCURRENTLY (Bean, 2026-07-15).** Step 4 = restore the 12 drawer capabilities + build FR-S9-6 (the `{desktop,tablet,mobile}` attr model) across all five §S9 blocks. So **`plugins/sgs-blocks/src/` will go dirty AGAIN immediately after Step 0 clears it** — "working tree clean" is a FALSE all-clear mid-Step-4. The only reliable signal is **the branch merging**:

```bash
cd c:/Users/Bean/Projects/small-giants-wp
git fetch && git branch --show-current                     # expect: main
git log --oneline main..feat/adaptive-nav-dialog-drawer    # expect: EMPTY (merged) or branch gone
ls reports/visual-diff/ | grep -E "adaptive-nav|heading|business-info|cart|site-footer"
                                                           # expect: reports carrying `verdict: PASS`
```

- **All pass** → `git pull` and start.
- **Any fail** → **STOP and tell Bean.** Do not start, do not "work around it", do not branch off the live feature branch to get going. Waiting costs less than redoing this against a renderer that changes underneath you.

**Good news on scope:** Step 4 touches only the five §S9 blocks (`site-header`, `site-header-row`, `site-footer`, `site-footer-row`, `adaptive-nav`). Your casualties are `sgs/hero`, `sgs/brand-strip`, `sgs/testimonial-slider`, `sgs/info-box` — **disjoint**. Once the branch merges you have a stable renderer and no file contention.

## ⛔ THE ONE RULE THAT MATTERS

**The database is the ONLY copy of this content. If you destroy it, it is gone.**

This homepage was **designed by Bean in Spectra on an older site** and migrated in — never produced by the cloning pipeline, and no draft in `sites/indus-foods/mockups/` can regenerate it (`Indus Foods Ltd Homepage.html` is only a SCRAPE of that old Astra site, not a source draft). A previous session was ~1 message away from telling Bean to "just re-clone the homepage", which would have permanently wiped it. **Re-cloning is NOT the fix here.**

**Visual baseline:** the original is preserved and live at **https://lightsalmon-tarsier-683012.hostingersite.com/** — the hand-built Astra/Spectra Indus site. That is what "restored" looks like.

## Problem → Effect → Solution

**Problem.** SGS blocks migrated from scalar/typed attrs to InnerBlocks (FR-31-6). The project then adopted a **no-deprecations policy** (D270/D271) whose stated remedy is *"old-shape posts are re-cloned, not deprecation-migrated."*

**Bean's reasoning for D270/D271 — do NOT frame it as a mistake to reverse (his words, 2026-07-15):** the Indus homepage was never in a finished state; it is a DEV site; the pipeline mattered more; the blocks were rebuilt repeatedly so the deprecations were repeated throwaway work; and **the page can be manually rebuilt from the DB.** The policy was a reasonable call in context. What was missing is a GATE, not a different policy.

**Effect.** Every page still stored in the OLD shape renders as an empty shell. Proven live on palestine-lives.org 2026-07-14, on `main`, with zero feature-branch code:

| Measured on the live homepage | Result |
|---|---|
| `.sgs-hero` textContent length | **0** |
| `<h1>` count on the page | **0** |
| `.sgs-brand-strip img` count | **0** |
| Hero children | 2 empty divs (`__content`, `__media`) |
| PHP errors / fatals | none |

The content is intact in `wp_posts.post_content`, unreadable to the renderer. Homepage = **page ID 13** (`wp option get page_on_front`), 22,012 bytes: `wp:sgs/hero`×1, `wp:sgs/brand-strip`×1, `wp:sgs/testimonial-slider`×1, `wp:sgs/info-box`×8.

The stored hero — every "missing" word is right here:

```
<!-- wp:sgs/hero {"variant":"split","headline":"Leading Indian Food & Drinks Wholesaler",
"subHeadline":"Proud to be a family-run food wholesaler since 1962!",
"splitImage":{"id":0,"url":"/wp-content/uploads/indus-foods/2025/11/Indus-Foods-Banner-1024x683.jpg",...},
"ctaPrimaryText":"Apply For A Trade Account","ctaPrimaryUrl":"/apply-for-trade-account/",
"ctaSecondaryText":"Request Our Catalogue","ctaSecondaryUrl":"/catalogue/", ...} /-->
```

Self-closing, no InnerBlocks. `src/blocks/hero/render.php`'s docblock: *"is now rendered via InnerBlocks ($content). Scalar content attrs (label, …"* — read for styling, render nothing.

**Solution (your job).** Convert the stored old-shape blocks to the new InnerBlocks shape, preserving every word, image, URL and colour, with a reversible backup. Then prove it renders as Bean built it.

## ⛔ HARD CONSTRAINTS

1. **`post_content` must NEVER be modified via WP-CLI `search-replace`, `wp eval`, or a PHP script.** `wp-content-guard.py` enforces it and WILL block you; it also breaks block validation and cascades. Sanctioned route: the block editor — `wp.data.dispatch('core/block-editor')` via Playwright, or the Site Editor by hand. **Design the migration around this from step 1** — do not discover it at step 9.
2. **R-31-14 forbids a server-side legacy fallback** in a migrated render.php (`if (empty($content) && !empty($legacy_attr)) {...}`). Do NOT make hero render its scalar attrs again — that is the exact hack the rule bans. If you believe it is the only path, STOP and design-gate with Bean.
3. **No block version bumps, no `deprecated.js`** (D270/D293) unless Bean explicitly overturns it. Note the tension, put it to him, do not decide alone. **The recovered `migrate()` functions are STALE** — they emit `level: 3` (a number → coerced to h2) and `sgs/icon` attrs (`icon`, `iconBackgroundColour`, `iconSize:'medium'`) the current block.json does not declare. Reference for INTENT only, never a drop-in.
4. **BACK UP FIRST.** Export every affected `post_content` to a timestamped file and verify it is readable BEFORE touching anything. `wp post get <id> --field=post_content > backup.txt` is read-only and safe.
5. **palestine-lives.org = DEV, sandybrown = STAGING canary.** Neither is a live client site. Prove on sandybrown where possible.
6. **HEADER/FOOTER IS NOT YOURS.** Track A owns `parts/header.html`, `parts/footer.html`, the `sgs/site-header|site-footer|site-header-row|site-footer-row|adaptive-nav` blocks and all header/footer patterns. Your scope is the page BODY of page 13.

## ⛔ A SECOND, INDEPENDENT CAUSE — check for it (D338)

**WordPress DISCARDS any block attribute the block.json does not declare — silently.** No error, no warning, no failing test, no failing build. Found **45 times** in the theme patterns on 2026-07-15 (`sgs/business-info` passed `"type"` where the real attr is `displayType` default `"phone"`; and American `"textColor"` where the block declares British `"textColour"`) — so those blocks rendered a phone number, or rendered with no colour.

**Page 13 came from a Spectra-era migration ⇒ prime candidate for the same class.** Your own finding that the recovered `migrate()` emits undeclared `sgs/icon` attrs is this bug, exactly. **Adapt `plugins/sgs-blocks/scripts/check-dead-pattern-attrs.py` (committed, working) to scan `post_content` read-only** rather than hand-checking. This may be a second cause of "content missing" on top of the InnerBlocks migration.

## Scope — NOT just the homepage

Audit every post/page on BOTH sites. A self-closing `wp:sgs/*` carrying content attrs (`headline`, `subHeadline`, `ctaPrimaryText`, `text`, `logos`, `items`…) whose render.php now expects `$content` is a casualty. Build the register first (read-only), then fix **by cause-group**, not page-by-page:

```bash
wp post list --post_type=page,post --field=ID --format=ids
wp post get <id> --field=post_content | grep -o 'wp:sgs/[a-z-]*[^>]*/-->'
```

Cross-reference each slug against its `render.php`: does it read `$content`, or scalar attrs? `/sgs-db` + `/wp-blocks schema` give the authoritative attr list — **enumerate the schema BEFORE claiming an attr is "missing"** (R-31-8).

## Bean's decision on the systemic fix (APPROVED — build it)

**Audit gate + document.** Write the hole up in `decisions.md`, AND build a read-only script that scans every post on a site for old-shape SGS blocks. **Wire it into the DEPLOY path, not "remember to run it before a migration"** — a gate that needs remembering is a document with extra steps. This is exactly the discipline D182 used ("Audit gate PASSED: all canary post types scanned → re-clone path safe") and that D271 skipped. That gate, not a policy reversal, is what was missing.

## Definition of done

- A register of EVERY affected post + block on both sites, with per-block cause.
- Backups of every touched `post_content`, verified readable.
- Indus homepage renders Bean's content: hero headline + sub-headline + both CTAs + split image; brand logos; testimonials; all 8 info-boxes.
- Live-verified on the REAL page (Playwright, computed DOM), not assertion output: `.sgs-hero` textContent > 0, `<h1>` ≥ 1, brand-strip `img` > 0.
- **Bean's eye confirms it matches what he built** — screenshot before/after. R-31-13: his sign-off is co-authoritative; numbers alone do not close it.
- The audit gate built + wired into deploy, and the hole written up in `decisions.md`.

## Rules that bind this work (D338 — learned the hard way)

- **Verify against the actual file / live DOM before ANY conclusion.** In one session: 3 handoff claims, a council claim, and "180 tests pass" were all asserted and all wrong. A doc is a hypothesis. A subagent's "done" is a hypothesis (STOP-16). **Your own diagnostic output is a hypothesis** — re-read the exact line before theorising from it.
- **Prove the cause before the fix.** "Not A, therefore B" is not proof.
- **Universal, never a per-client carve-out** (R-31-9). A fix that only works for page 13 is not a fix.
- **Green gates ≠ verified.** Build + 180 tests + every guard passed while the desktop nav rendered 0 links.
- **Two test suites, do not conflate them:** `scripts/oracle/tests/` = 180 pass (green, runs in prebuild). `scripts/tests/` = **61 fail on a CLEAN tree** (61 failed/112 passed/2 skipped) — pre-existing. A/B against a `git stash` before blaming your change.
- **Cache:** clear the Hostinger CDN before EVERY live measurement (`hosting_clearWebsiteCacheV1`). LiteSpeed exists on sandybrown only, NOT on Indus. `build-deploy.py` clears NO caches — do it manually.
- **Windows:** node/npm via **PowerShell** (the nvm shim is broken in Git Bash). Stage/commit via PowerShell.
- Pre-existing dirt (`lucide-icons.php`, `package-lock.json`, `phase4-*.txt`, root `.db`, `rr.json`, `iapi.html`) is NOT yours — never commit it.

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
