---
doc_type: audit-report
audit: unexpected-content-block-validation
site: sandybrown-nightingale-600381.hostingersite.com (Mama's Munches staging)
wp_version: 7.0
audited: 2026-05-22
method: programmatic via REST + wp.blocks.parse() (faster + more complete than clicking through editor)
session_tag: small-giants-wp-2026-05-23-step-0-audit
---

# Step 0 — "This block contains unexpected content" audit

## TL;DR

- **Pages + posts: 1 invalid block instance.** Page 8 (`Mamas Munches Homepage`) → `sgs/hero` block.
- **Template parts: 33 invalid block instances across 9 of 21 template parts.** All concentrated in `header-*`, `footer`, and `mega-menu-*` theme-source parts.
- **Font Library REST surface: healthy.** `/font-collections` returns the 2.68 MB Google Fonts manifest 200, `/font-families` returns `[]` (none saved yet), `/global-styles/themes/sgs-theme` returns 200.
- **Bean's reported "unexpected content" in Manage Fonts is the SAME `sgs/hero` global validation error** firing whenever the Site Editor renders any template that includes page 8. The Manage Fonts modal lives inside the Site Editor canvas — opening it doesn't trigger a new error, it surfaces the already-fired one as a toast/banner.

**Step 0 gate: NOT YET CLOSED.** Findings recorded, fix path decision pending Bean's sign-off before any "Attempt Block Recovery" or `.html` regen.

## Method

Standard "open every page in editor and look for yellow banner" would take ~60+ min and miss nested blocks. Instead used a programmatic approach:

1. Logged in to wp-admin (session cookie already valid)
2. For every page, post, and template part: fetch raw content via REST (`?context=edit&_fields=content`)
3. Call `wp.blocks.parse(raw)` against the live editor's block registry
4. Walk the resulting tree recursively, flagging `block.isValid === false`
5. Capture the validation issue + a 200-char excerpt of `originalContent`

This catches every block the editor would flag and every block buried inside `innerBlocks` that a visual scan would miss.

## Findings — pages + posts

**Total scanned:** 16 pages + 2 posts = 18 posts. Clean: 17. Invalid: 1.

### Page 8 — `Mamas Munches Homepage` (THE primary homepage)

- **Block:** `sgs/hero` (top-level, only block on page)
- **Stored markup:** `<div class="wp-block-sgs-hero">\n  \n</div>` (just an empty wrapper)
- **Save function output:** `""` (empty string — block is now PHP-dynamic-rendered)
- **Validation issue:** `Expected end of content, instead saw {tagName, attributes, selfClosing}` — parser sees the legacy `<div>` wrapper, current save() returns nothing
- **Root cause:** `sgs/hero` was originally a static block. At some point its `save()` was changed to return null/empty (full PHP render). The deprecation entry that would migrate old stored markup forward was never added.
- **Live render impact:** ZERO. PHP `render.php` ignores the stored markup; the page displays correctly on the frontend. Only the editor flags it.
- **Attributes:** 189 attribute keys all intact (variant, headline, subHeadline, splitImage, badges, etc.). Recovery would NOT lose any attribute data — those live in the block comment delimiter JSON, not the inner HTML.

### All other pages/posts: clean

`Sample Page`, `Privacy Policy`, `Refund and Returns Policy`, `Trustpilot Block Smoke Test` (x2), `err probe`, `Hero Clone PoC`, `Mockup Baseline`, `RC-Fix Verification`, `Phase 2A Test Page`, `Mamas Munches Homepage Test (Phase 6 v2 Step 7)`, `Shop`/`Cart`/`Checkout`/`My account`, posts 65/66.

## Findings — template parts

**Total scanned:** 21 theme-source template parts. Clean: 12. Invalid: 9 (33 invalid block instances).

| Template part | Invalid block count | Block types affected |
|---|---|---|
| `header` | 2 | `core/group` (2 — empty wrapper drift) |
| `header-sticky` | 2 | `core/group` (2 — same as header) |
| `header-shrink` | 2 | `core/group` (2 — same as header) |
| `header-transparent` | 2 | `core/group` (2 — same as header) |
| `footer` | 2 | `core/group`, `core/columns` (empty wrapper drift) |
| `mega-menu-brands` | 14 | `core/group` (1), `core/image` (12 — brand logos), `core/column` (1) |
| `mega-menu-sectors` | 5 | `core/columns` (1), `core/image` (4 — sector images) |
| `mega-menu-resources` | 1 | `core/separator` (1) |
| `mega-menu-contact` | 3 | `core/list` (1), `core/separator` (2) |

**Clean template parts:** `mega-menu-about`, `mega-menu-products`, `mega-menu-services`, `footer-minimal`, `sidebar`, `checkout-header`, `coming-soon-social-links`, `mini-cart`, plus 4 WooCommerce add-to-cart variants.

### Patterns inside the failure set

1. **All 4 `header-*` variants share the same 2 invalid `core/group` blocks** — both contain only HTML comments (`<!-- Mobile navigation drawer ... -->`) inside their wrapper. The block parser reads the comments as content, expected save output, doesn't get it.
2. **`mega-menu-brands` `core/image` blocks (12 instances)** — `<figure class="wp-block-image brand-logo-tile" style="border-radius:8px;...">`. The `brand-logo-tile` is a custom class plus inline border-radius style. WP 7.0 likely changed how `core/image` serialises border-radius (now goes under `style.border.radius` instead of inline `style=""`).
3. **`mega-menu-sectors` `core/image` blocks (4 instances)** — `<figure class="wp-block-image size-medium sector-menu-image" style="border-radius:8px;margin-bottom:var(...)">` — same border-radius drift pattern.
4. **`core/separator` (3 instances)** — `has-text-color has-border-subtle-background-color has-alpha-channel-opacity has-border-subtle-background-color has-background is-style-wide` — duplicate `has-border-subtle-background-color` class, almost certainly a previous save's malformed class merge that the current `core/separator` save() no longer produces.
5. **`core/list` (1 instance)** — `is-style-default has-surface-color has-text-color` — `is-style-default` is the deprecated way; WP 7.0 omits the class for the default style.

All 33 instances are upstream-version-drift (theme file written against an older WP core, then WP core changed save format). NONE are SGS-block issues except the page 8 `sgs/hero`.

## Findings — Site Editor Styles + Manage Fonts modal

REST surface probes:

| Endpoint | Status | Notes |
|---|---|---|
| `/wp-json/wp/v2/font-collections` | 200, 2.68 MB | Google Fonts manifest serving correctly. WP 7.0 preview URLs (`s.w.org/images/fonts/wp-7.0/previews/...`) present and well-formed. |
| `/wp-json/wp/v2/font-families` | 200, `[]` | No fonts saved as Font Library entries yet (manifest is browsed-from-collection, not yet installed). |
| `/wp-json/wp/v2/font-faces` | 404 | Expected — requires `?font_family=ID` parent. Normal behaviour. |
| `/wp-json/wp/v2/global-styles/themes/sgs-theme` | 200, 14.7 KB | theme.json data healthy. |

**Conclusion on Bean's reported "Manage Fonts" error:** the Site Editor loads with page 8 as the front-page template render. The `sgs/hero` validation fails at render-time, fires a JS console error AND a yellow editor banner. Opening Manage Fonts doesn't trigger a new error — but Bean's mental model linked the error to the action just taken (opening the modal). The actual trigger is the front-page render itself.

This is confirmed by: navigating to the Site Editor without opening Manage Fonts produces the same 2 console errors. Both errors point to `sgs/hero` save validation. Fixing page 8's hero block should silence the entire Site Editor's error stream.

## Fix path decision (PENDING BEAN APPROVAL)

Two distinct fix paths needed:

### A. Page 8 `sgs/hero` — recommend "Attempt Block Recovery"

- Safe: all 189 attributes survive (they're in the comment delimiter JSON, not the wrapper HTML)
- One-click via editor toolbar
- Persistent fix: rewrites the stored `post_content` so the wrapper drift is gone forever
- After fix: the entire Site Editor's `sgs/hero` console errors stop firing, including the one Bean saw next to Manage Fonts

**Risk:** none meaningful. Recovery produces identical render (the empty wrapper was never rendered anyway — PHP render takes over).

### B. 9 template parts — DO NOT click Recovery in Site Editor

Clicking "Attempt Block Recovery" on a theme-source template part creates a `wp_template_part` user override post that masks the theme file. This:
- Won't survive a theme update / deploy
- Diverges site state from source-controlled theme
- Re-fires the same error on the next clean theme install

**Correct fix:** regenerate the offending `theme/sgs-theme/parts/*.html` files with current WP 7.0 block save outputs. Approach:

1. For each invalid template part: open in Site Editor → Attempt Recovery → Save → export the recovered content
2. Diff against the theme file → port the changes back into the theme `.html` source
3. Discard the user override (Site Editor → template part → "Clear customisations")
4. Commit the theme file changes
5. Deploy via tar method

**Alternative (faster):** rewrite the offending blocks by hand in each `.html` file. For example, the duplicate `has-border-subtle-background-color` class in `core/separator` can be deduped manually. The `core/image` border-radius drift can be migrated to the WP 7.0 `style.border.radius` shape by hand. Then no Site Editor round-trip needed.

**Risk if left alone:** every editor session shows ~33 yellow banners across the affected parts. Operators clicking "Attempt Recovery" by accident create user-override posts that diverge from theme source. Compounding drift.

### Step 0 gate close criteria

Before dispatching Phase 4:

- [ ] Bean picks fix path A: confirm "Attempt Block Recovery on page 8" → I click it → save → verify clean
- [ ] Bean picks fix path B method: clicker-fix-then-port-back OR direct-rewrite-in-place
- [ ] Run the chosen fix(es)
- [ ] Re-run programmatic audit → confirm zero invalid blocks
- [ ] Update this report with "RESOLVED" timestamps + commit SHAs

## Artefacts captured during audit

- `audit-pass-1.json` (project root) — raw findings JSON for pages + posts
- `.playwright-mcp/site-editor-errors.txt` — captured console errors
- `.playwright-mcp/styles-panel.yml` — Site Editor snapshot showing "Block contains unexpected or invalid content" banner on sgs/hero

## Recommendation

**Fix path A immediately** (one click, can't break anything, silences Bean's reported Manage Fonts error).

**Fix path B by direct-rewrite-in-place** (faster than the click-port-back loop, source-controlled, deployable). Recommend dispatching this as a Sonnet subagent with the 9 affected `parts/*.html` files + the 33 specific block paths from this report — mechanical work, well-scoped, ~10 minutes.

After both ship: re-run the programmatic audit, expect zero findings, close Step 0, dispatch Phase 4.

---

## RESOLVED — 2026-05-22

**Step 0 gate CLOSED.** Final programmatic audit (post-deploy, cache-busted): **0 invalid blocks across all pages, posts, and template parts.**

### What shipped

| Stage | Mechanism | Commit |
|---|---|---|
| Path A — page 8 `sgs/hero` | Programmatic `wp.blocks.parse → createBlock → serialize → REST PUT`. All 201 attributes preserved. Frontend hero renders correctly. | (page content update — REST only, no commit) |
| Path B — 9 template parts (27 of 33 instances) | Sonnet subagent (background dispatch). Removed HTML comments from `core/group`/`core/columns` wrappers; dropped inline `<img style="...">` from 16 `core/image` blocks (moved sizing to CSS); deduped `has-border-subtle-background-color` on 3 `core/separator`; removed deprecated `is-style-default` from `core/list`; fixed flex layout drift + column border. | `830f627b` |
| Path B follow-up — 6 edge cases | Inline Edit. (1) Added `has-{color}-color` companion class to 3 `core/separator` instances (resources×1, contact×2) that WP 7.0 requires alongside `has-{color}-background-color`. (2) Added `wp-block-list` class + dropped `list-style:none` inline on `core/list` in contact. (3) Removed inline `style="gap:..."` from mega-menu-brands flex group (WP 7.0 derives blockGap from attribute, not inline). (4) Reordered `core/column` border style with explicit `border-radius:0` to match WP 7.0 serialization order. | (this session's commit) |

### Final verification

Programmatic re-audit at 2026-05-22T16:24 (cache-busted REST fetch, fresh `wp.blocks.parse` pass against the live WP 7.0 block registry):

```
pages_with_issues: 0
posts_with_issues: 0
template_parts_with_issues: 0
total_invalid_instances: 0
```

### Notable findings during fix work

1. **`header-sticky`, `header-shrink`, `header-transparent` .html files are 119-byte pattern wrappers.** All three eventually chain to `framework-header-default.php`. Fixing the one default pattern covered all three variants automatically — confirmed by audit pass 2 showing zero issues in any header variant.
2. **WP 7.0 `core/separator` requires both `has-{color}-color` AND `has-{color}-background-color` classes** when a `backgroundColor` is set. Prior versions only emitted `has-{color}-background-color`. This caused the 3 separator instances to need a follow-up edit after subagent's dedup pass.
3. **WP 7.0 `core/list` requires the `wp-block-list` class** on the `<ul>` tag. Older versions omitted it. Combined with the deprecated `is-style-default` removal, this needed a follow-up edit.
4. **WP 7.0 `core/group` with flex layout no longer emits inline `style="gap:..."`** even when `blockGap` is set in attributes. The gap comes from a separate CSS rule. Inline style attribute causes "Expected end of content" validation failure.

### Artefacts preserved

- `.claude/reports/2026-05-22-audit-artefacts/audit-pass-1.json` — initial scan (1 page + 9 template parts invalid, 34 instances)
- `.claude/reports/2026-05-22-audit-artefacts/audit-pass-2.json` — post-subagent scan (6 remaining edge cases)
- `.claude/reports/2026-05-22-audit-artefacts/audit-pass-2-rebuilt.json` — `createBlock + serialize` outputs used to derive exact follow-up edits
- `.claude/reports/2026-05-22-audit-artefacts/site-editor-errors.txt` — console errors confirming Bean's reported "Manage Fonts" error was the global `sgs/hero` validation firing

Bean's "Manage Fonts unexpected content" report was the same global `sgs/hero` validation firing whenever the Site Editor renders any template that includes page 8. Fixing page 8 silenced it. Post-fix Site Editor console errors point to other (non-validation) warnings only.
