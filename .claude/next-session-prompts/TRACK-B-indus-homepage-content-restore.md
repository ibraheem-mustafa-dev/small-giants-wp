---
doc_type: next-session-prompt
project: small-giants-wp
track: B — restore hand-built page content emptied by block migrations
generated: 2026-07-15
owner: separate session (do NOT run inside the adaptive-nav track)
---

# TRACK B — Bean's hand-built pages render EMPTY. Find every one, restore them all.

Invoke `/autopilot` before anything else.

## ⛔ THE ONE RULE THAT MATTERS

**The database is the ONLY copy of this content. If you destroy it, it is gone.**

This homepage was **designed by Bean in Spectra on an older site** and migrated in — it
was never produced by the cloning pipeline, and no draft in `sites/indus-foods/mockups/`
can regenerate it. (`Indus Foods Ltd Homepage.html` is only a SCRAPE of that old Astra
site, not a source draft.) A previous session was ~1 message away from telling Bean to
"just re-clone the homepage", which would have permanently wiped it. **Re-cloning is NOT
the fix here.**

**Reference for what it should look like:** the original is preserved and live at
**https://lightsalmon-tarsier-683012.hostingersite.com/** — the hand-built Astra/Spectra
Indus Foods site. Use it as the visual baseline for the restore.

## Problem → Effect → Solution

**Problem.** SGS blocks were migrated from scalar/typed attributes to InnerBlocks
(FR-31-6). The project then adopted a **no-deprecations policy** (D270/D271) whose
stated remedy is *"old-shape posts are re-cloned, not deprecation-migrated."*

**Effect.** Every hand-built page still stored in the OLD shape now renders as an
empty shell. Proven live on palestine-lives.org (Indus) 2026-07-14, on `main`, with
zero feature-branch code:

| Measured on the live homepage | Result |
|---|---|
| `.sgs-hero` textContent length | **0** |
| `<h1>` count on the page | **0** |
| `.sgs-brand-strip img` count | **0** |
| Hero children | 2 empty divs (`__content`, `__media`) |
| PHP errors / fatals in output | none |

The content is NOT lost — it is intact in `wp_posts.post_content`, unreadable to the
renderer. Homepage = **page ID 13** (`wp option get page_on_front`), 22,012 bytes,
containing `wp:sgs/hero`×1, `wp:sgs/brand-strip`×1, `wp:sgs/testimonial-slider`×1,
`wp:sgs/info-box`×8.

The stored hero (verbatim, truncated) — every "missing" word is right here:

```
<!-- wp:sgs/hero {"variant":"split","headline":"Leading Indian Food & Drinks Wholesaler",
"subHeadline":"Proud to be a family-run food wholesaler since 1962!",
"splitImage":{"id":0,"url":"/wp-content/uploads/indus-foods/2025/11/Indus-Foods-Banner-1024x683.jpg",...},
"ctaPrimaryText":"Apply For A Trade Account","ctaPrimaryUrl":"/apply-for-trade-account/",
"ctaSecondaryText":"Request Our Catalogue","ctaSecondaryUrl":"/catalogue/", ...} /-->
```

Self-closing, no InnerBlocks. `src/blocks/hero/render.php`'s own docblock says:
*"is now rendered via InnerBlocks ($content). Scalar content attrs (label, …"* — so
these attrs are read for styling but the CONTENT attrs render nothing.

**Solution (your job).** Convert the stored old-shape blocks into the new InnerBlocks
shape, preserving every word, image, URL and colour, with a reversible backup. Then
prove it renders identically to Bean's intent.

## ⛔ HARD CONSTRAINTS — read before writing any code

1. **`post_content` must NEVER be modified via WP-CLI `search-replace`, `wp eval`, or
   a PHP script.** A PreToolUse hook (`wp-content-guard.py`) enforces this and WILL
   block you. It also breaks block validation and cascades. The sanctioned route is
   the block editor: `wp.data.dispatch('core/block-editor')` driven via Playwright,
   or the Site Editor by hand. Design the migration around that constraint from step 1
   — do not discover it at step 9.
2. **R-31-14 forbids a server-side legacy fallback** in a migrated render.php
   (`if (empty($content) && !empty($legacy_attr)) {...}`). Do NOT "fix" this by making
   hero render its scalar attrs again. That is the exact hack the rule bans. If you
   believe it is the only viable path, STOP and design-gate it with Bean first.
3. **No block version bumps, no `deprecated.js`** (D270/D293) unless Bean explicitly
   overturns it for this case. Note the tension and put it to him — do not decide alone.
4. **BACK UP FIRST.** Export every affected post's `post_content` to a timestamped file
   and verify the export is readable BEFORE touching anything. `wp post get <id>
   --field=post_content > backup.txt` is read-only and safe.
5. **Indus (palestine-lives.org) is the DEV site; sandybrown is the STAGING canary.**
   Neither is a live client site. Prove on sandybrown first where possible.

## ⛔ SCOPE BOUNDARY — header/footer is NOT yours

Track A owns `parts/header.html`, `parts/footer.html`, the `sgs/site-header|site-footer|
site-header-row|site-footer-row|adaptive-nav` blocks and all header/footer patterns. **Do
not touch those files.** Your scope is the page BODY of page ID 13 (hero, brand-strip,
testimonial-slider, 8 info-boxes).

## ⛔ A SILENT-DISCARD BUG CLASS — check the stored content for it (D338)

**WordPress DISCARDS any block attribute the block.json does not declare — silently.** No
error, no warning, no failing test, no failing build. Found **45 times** in the theme
patterns on 2026-07-15: `sgs/business-info` passed `"type"` (real attr: `displayType`,
default `"phone"`) and American `"textColor"` (real attr: British `"textColour"`) — so
those blocks rendered a phone number, or rendered with no colour at all.

**Page 13's stored blocks came from a Spectra-era migration, so they are prime candidates
for the same class.** An attr in `post_content` that the block.json doesn't declare is
dead on arrival and invisible to every gate. The new scanner
`plugins/sgs-blocks/scripts/check-dead-pattern-attrs.py` does exactly this check for theme
patterns — **adapt it to scan `post_content`** (read-only) rather than hand-checking. This
may be a second, independent cause of "content missing" beyond the InnerBlocks migration.

## Scope — this is NOT just the homepage

**Do not assume the homepage is the only casualty.** Audit every post/page on BOTH
sites for old-shape SGS blocks. A self-closing `wp:sgs/*` block carrying content attrs
(`headline`, `subHeadline`, `ctaPrimaryText`, `text`, `logos`, `items`…) whose
render.php now expects `$content` is a casualty.

Start by building the register (read-only), then fix by cause-group, not page-by-page:

```bash
# every page/post, every sgs block, old shape = self-closing with content attrs
wp post list --post_type=page,post --field=ID --format=ids
wp post get <id> --field=post_content | grep -o 'wp:sgs/[a-z-]*[^>]*/-->'
```

Cross-reference each slug against its `render.php`: does it read `$content`, or its
scalar attrs? `/sgs-db` + `/wp-blocks schema` give the authoritative attribute list —
enumerate the schema BEFORE claiming an attr is "missing" (R-31-8).

## Definition of done

- A register of EVERY affected post + block on both sites, with per-block cause.
- Backups of every touched `post_content`, verified readable.
- Indus homepage renders Bean's content: hero headline + sub-headline + both CTAs +
  split image; brand logos visible; testimonials; all 8 info-boxes.
- Live-verified on the REAL page (Playwright, computed DOM), not on assertion output:
  `.sgs-hero` textContent > 0, `<h1>` count ≥ 1, brand-strip `img` count > 0.
- **Bean's eye confirms it matches what he built.** Screenshot before/after. His sign-off
  is co-authoritative (R-31-13) — numbers alone do not close this.
- A written answer to the systemic question: **how does a hand-built page survive the
  next block migration?** The no-deprecations policy assumes re-cloning; Bean builds
  manually. That is an unresolved architectural hole. Name it, propose the fix, get his
  call. This is the most valuable output of this track — the homepage is the symptom.

## Skills / tools

| Skill | When |
|---|---|
| `/autopilot` | FIRST — live skill routing + ADHD support all session |
| `/systematic-debugging` | root-cause each block's empty render before touching it |
| `/brainstorming` | design the migration route (editor-driven) BEFORE building |
| `/adversarial-council` | pre-build gate — this touches Bean's ONLY copy of hand-built content |
| `/sgs-db` + `/wp-blocks` | authoritative attrs/schema per block — never guess |
| `/qc-council` | validate the fix-shape against a measured baseline before dispatch |
| `/verify-loop` | 2 independent attestations per load-bearing claim |
| `/handoff` | session close |

| Tool | For |
|---|---|
| Playwright MCP | the ONLY sanctioned content-write route (`wp.data.dispatch`) + live verification |
| SSH + `wp post get` | READ-ONLY inspection + backups (`ssh hd`, see dev-setup.md) |
| Hostinger MCP `hosting_clearWebsiteCacheV1` | CDN clear before ANY live measurement |

## Methodology guardrails

- **Prove the cause per block** before fixing it. "Not A therefore B" is not proof.
- **Fact-check your own diagnostic output** — re-read the exact line before theorising.
- **Green gates ≠ verified.** Only the live DOM + Bean's eye close this.
- **Cache:** block CSS is served at a filemtime `?ver` on the feat branch but NOT on
  `main` — on `main` the URL never changes and Cloudflare holds assets for 7 days
  (`max-age=604800`). Clear the CDN before every live measurement or you will measure
  a stale page and believe it.
