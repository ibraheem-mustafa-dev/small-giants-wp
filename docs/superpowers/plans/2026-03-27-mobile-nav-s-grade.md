# sgs/mobile-nav — Strategic Plan to S-Grade

> **For agentic workers:** Use superpowers:subagent-driven-development or
> superpowers:executing-plans to implement. Steps use checkbox syntax.

**Goal:** Ship the mobile-nav block at parity with Kadence + 6 unique differentiators, with rich mega-menu rendering, block patterns for presets, and a documented WP 7.0 migration path.

**Total estimate:** ~6 hours across 2-3 sessions
**Critical path:** Units 1→3→5→7→8 (~4 hours)
**Risk level:** Medium — most code exists, primary risk is mega-menu rendering complexity and CSS edge cases at breakpoints.

---

## Dependency Graph

```
Unit 1 (Mega-Menu Renderer)  ──blocks──▶  Unit 5 (Deploy + QA)
Unit 2 (Animation Presets)   ──blocks──▶  Unit 5 (Deploy + QA)
Unit 3 (Block Patterns)      ──blocks──▶  Unit 5 (Deploy + QA)
Unit 4 (Backdrop Blur)       ──blocks──▶  Unit 5 (Deploy + QA)

Unit 1 (independent of 2, 3, 4)
Unit 2 (independent of 1, 3, 4)
Unit 3 (independent of 1, 2, 4)
Unit 4 (independent of 1, 2, 3)

Unit 5 (Deploy + QA)         ──blocks──▶  Unit 6 (Fix Loop)
Unit 6 (Fix Loop)            ──blocks──▶  Unit 7 (WP 7.0 Compat Layer)
Unit 7 (WP 7.0 Compat Layer) ──blocks──▶  Unit 8 (Ship)

PARALLEL OPPORTUNITIES:
- Units 1, 2, 3, 4 can ALL run simultaneously (no shared state)
- Unit 7 is deferrable to a separate session if time runs short

CRITICAL PATH:
Unit 1 → Unit 5 → Unit 6 → Unit 8 (mega-menu is the longest chain)
```

---

## Work Units

### Unit 1: Rich Mega-Menu Rendering in Mobile Drawer
**Purpose:** Replace flat link extraction with structured content — headings, descriptions, thumbnails, grouped links.
**Files:**
- MODIFY: `plugins/sgs-blocks/includes/class-mobile-nav-renderer.php` (lines 272-403) — rewrite `render_mega_menu_item()` and `extract_links_from_template_part()`
- MODIFY: `plugins/sgs-blocks/src/blocks/mobile-nav/style.css` — add mega-menu mobile styles
**Depends on:** Nothing | **Blocks:** Unit 5
**Estimate:** 90 min (confidence: M)
**Risk:** Template parts contain complex block markup (columns, gradients, images). DOMDocument extraction needs to handle headings, paragraphs, and images — not just `<a>` tags. Risk of broken layout on edge cases.

**Current problem:** `extract_links_from_template_part()` uses DOMDocument to pull only `<a>` tags. The mega-menu-sectors template has gradient cards with images, headings, descriptions, and CTA links. All of that gets thrown away — only the link text survives.

**New approach:** Extract structured groups, not flat links.

Each mega-menu template part has a consistent structure:
- Optional section heading (h4 "We Serve")
- Columns containing groups, each group = one card with:
  - Optional image
  - Heading (h3)
  - Optional description paragraph
  - CTA link ("Explore Food Service →")

The new `extract_structured_content()` method should:
1. Parse the rendered HTML with DOMDocument
2. Find each column/group as a "card"
3. Extract per-card: heading text, description text, image src/alt, link href
4. Return structured array, not flat links

The renderer then builds mobile-optimised HTML:
- Section heading above the accordion submenu
- Each card as a compact row: small thumbnail (48px) + heading + description + link
- "View All" link at the bottom

This gives mobile users the same information hierarchy as the desktop mega-menu without the complex grid layout.

- [ ] Step 1: Write `extract_structured_content()` method replacing `extract_links_from_template_part()`
- [ ] Step 2: Rewrite `render_mega_menu_item()` to use structured data
- [ ] Step 3: Add CSS for `.sgs-mobile-nav__mega-card` (thumbnail + text row layout)
- [ ] Step 4: Test with all 7 mega-menu template parts
- [ ] **VERIFY:** `npm run build` passes. Each mega-menu accordion shows heading + description + thumbnail, not just link text.

---

### Unit 2: Animation Preset Picker (Replace Raw Controls)
**Purpose:** Simplify 3 animation controls (duration, easing, exitDuration) into 1 preset picker.
**Files:**
- MODIFY: `plugins/sgs-blocks/src/blocks/mobile-nav/block.json` — add `animationPreset` attribute, keep raw attrs as hidden overrides
- MODIFY: `plugins/sgs-blocks/src/blocks/mobile-nav/AnimationPanel.js` — replace duration+easing with preset SelectControl
- MODIFY: `plugins/sgs-blocks/src/blocks/mobile-nav/render.php` — resolve preset to CSS values
- MODIFY: `plugins/sgs-blocks/src/blocks/mobile-nav/style.css` — named preset classes
**Depends on:** Nothing | **Blocks:** Unit 5
**Estimate:** 30 min (confidence: H)
**Risk:** Low. Pure UI/CSS change. Existing CSS custom properties already work.

**Presets:**

| Name | Duration | Easing | Exit Duration |
|------|----------|--------|---------------|
| Snappy | 280ms | cubic-bezier(0.4, 0, 0.2, 1) | 200ms |
| Smooth | 350ms | ease-in-out | 280ms |
| Spring | 400ms | linear() spring curve | 280ms |
| Bouncy | 450ms | linear() high overshoot | 320ms |
| None | 0ms | linear | 0ms |

Default: "Spring" (current behaviour).

The raw duration/easing/exit controls stay in block.json as attributes but are hidden from the inspector. They only surface if `animationPreset` is set to "custom" (for power users / future use). The preset picker is the primary control.

- [ ] Step 1: Add `animationPreset` attribute (enum, default "spring")
- [ ] Step 2: Update AnimationPanel.js — preset SelectControl + show raw controls only when "custom" selected
- [ ] Step 3: Update render.php — map preset name to CSS custom property values
- [ ] Step 4: Add preset class names to style.css (`.sgs-mobile-nav--anim-snappy` etc.)
- [ ] **VERIFY:** Selecting "Bouncy" in editor sets correct duration/easing on frontend.

---

### Unit 3: Block Patterns (Replace TemplateSelector.js)
**Purpose:** Register 6 presets as PHP block patterns. Remove JS template selector from inspector.
**Files:**
- CREATE: `plugins/sgs-blocks/includes/mobile-nav-patterns.php` — pattern registration
- MODIFY: `plugins/sgs-blocks/includes/class-sgs-blocks.php` — require the patterns file
- DELETE content: `plugins/sgs-blocks/src/blocks/mobile-nav/TemplateSelector.js` — remove or gut
- MODIFY: `plugins/sgs-blocks/src/blocks/mobile-nav/edit.js` — remove TemplateSelector import
**Depends on:** Nothing | **Blocks:** Unit 5
**Estimate:** 45 min (confidence: H)
**Risk:** Low. Block patterns are stable WordPress API. The only risk is getting attribute JSON serialisation right in the pattern content string.

**6 patterns:**

1. **Mobile Nav — Default** — overlay, dark bg, accent CTA, socials, no logo
2. **Mobile Nav — E-commerce** — slide-right, search, account tray, WhatsApp, icon-text contacts
3. **Mobile Nav — Restaurant** — bottom-sheet, logo, WhatsApp, "Book a Table", ghost secondary CTA
4. **Mobile Nav — B2B Trade** — overlay, "Apply for Account" CTA, "Call Us" secondary, icon-text contacts
5. **Mobile Nav — Minimal** — slide-left, no CTA, no socials, plain close button
6. **Mobile Nav — Brand Forward** — overlay, large logo (180px), centre-aligned, filled CTA, tagline

Each pattern is a `register_block_pattern()` call with the block comment serialised with the right attributes.

- [ ] Step 1: Create `mobile-nav-patterns.php` with all 6 patterns
- [ ] Step 2: Hook into `init` via class-sgs-blocks.php
- [ ] Step 3: Remove TemplateSelector.js import from edit.js
- [ ] Step 4: Delete or empty TemplateSelector.js
- [ ] **VERIFY:** In block editor inserter, search "Mobile Nav" — all 6 patterns appear. Inserting "B2B Trade" creates block with correct attributes.

---

### Unit 4: Backdrop Blur + Colour Panel Grouping
**Purpose:** Add backdrop blur (competitive gap) and group colours behind "Show all" toggle.
**Files:**
- MODIFY: `plugins/sgs-blocks/src/blocks/mobile-nav/block.json` — add `backdropBlur` (boolean), `backdropBlurAmount` (number)
- MODIFY: `plugins/sgs-blocks/src/blocks/mobile-nav/ColoursPanel.js` — group 4-5 primary colours visible, rest behind toggle
- MODIFY: `plugins/sgs-blocks/src/blocks/mobile-nav/render.php` — emit `--sgs-mn-backdrop-blur` CSS prop
- MODIFY: `plugins/sgs-blocks/src/blocks/mobile-nav/style.css` — `backdrop-filter: blur()` on `::backdrop`
**Depends on:** Nothing | **Blocks:** Unit 5
**Estimate:** 30 min (confidence: H)
**Risk:** Low. `backdrop-filter` is Baseline Widely Available. The only gotcha is `::backdrop` pseudo-element support for `backdrop-filter` — if unsupported, the fallback `.sgs-mobile-nav__backdrop` div handles it.

**Colour panel grouping:**
- Always visible: `accentColour`, `drawerBg`, `ctaBg`, `linkColour`, `dividerColour` (the 5 most-used)
- Behind "Show all colours" toggle: remaining 12 colour attributes
- Toggle state is editor-only (not an attribute — uses React local state)

- [ ] Step 1: Add `backdropBlur` and `backdropBlurAmount` attributes to block.json
- [ ] Step 2: Add blur toggle to Animation panel (makes sense next to backdrop opacity)
- [ ] Step 3: Update render.php to emit `--sgs-mn-backdrop-blur` when enabled
- [ ] Step 4: Add CSS: `::backdrop { backdrop-filter: blur(var(--sgs-mn-backdrop-blur, 0)); }`
- [ ] Step 5: Group ColoursPanel into primary (5) + "Show all" toggle (12)
- [ ] **VERIFY:** Enabling blur in editor produces visible backdrop blur on frontend. Colour panel shows 5 controls by default, 17 when expanded.

---

### GATE 1: Pre-Deploy Build (Auto-gate)
**After:** Units 1, 2, 3, 4
**Pass criteria:**
- `npm run build` completes with zero errors
- No ESLint errors in changed files
- block.json validates (all new attributes have type + default)
- TemplateSelector.js removed from built output
**Fail criteria:**
- Build errors
- Missing attributes referenced in render.php but not in block.json
**Effort so far:** ~3.25 hours
**Effort remaining:** ~2.75 hours

---

### Unit 5: Deploy + Breakpoint QA
**Purpose:** Deploy to palestine-lives.org, screenshot at 375/768/1440, log all issues.
**Files:**
- No file changes — deployment and visual verification only
**Depends on:** Gate 1 | **Blocks:** Unit 6
**Estimate:** 30 min (confidence: M)
**Risk:** Medium. LiteSpeed caching may show stale output. OPcache must be reset for PHP changes. The mega-menu template parts are already on the server but may need re-saving in the editor.

- [ ] Step 1: Build: `cd plugins/sgs-blocks && npm run build`
- [ ] Step 2: Deploy via tar method (theme + plugin)
- [ ] Step 3: Reset OPcache via HTTP
- [ ] Step 4: Clear LiteSpeed page cache + CSS optimiser cache
- [ ] Step 5: Screenshot homepage at 375px (mobile)
- [ ] Step 6: Screenshot homepage at 768px (tablet)
- [ ] Step 7: Screenshot homepage at 1440px (desktop)
- [ ] Step 8: Open mobile nav drawer, screenshot at 375px
- [ ] Step 9: Expand a mega-menu accordion, screenshot at 375px
- [ ] Step 10: Log all visual issues found
- [ ] **VERIFY:** Screenshots saved. Issue list created. No build/deploy errors.

---

### Unit 6: Fix Loop
**Purpose:** Fix every visual issue found in Unit 5. Repeat QA until clean.
**Files:** Varies based on issues found
**Depends on:** Unit 5 | **Blocks:** Unit 7
**Estimate:** 60 min (confidence: L — depends on issue count)
**Risk:** High. Unknown scope. Could be 2 CSS fixes or 15. The z-index header bleed (known issue from spec) is pre-identified. Other issues won't be known until screenshots land.

**Known pre-identified issues:**
- z-index header bleed (drawer at 10000, header overlaps — needs 10001)
- LiteSpeed CSS optimiser may merge media queries (known gotcha)
- Mega-menu images may show broken if not uploaded to server

- [ ] Step 1: Fix z-index: drawer z-index from 10000 to 10001 in style.css
- [ ] Step 2: Fix each issue logged in Unit 5
- [ ] Step 3: Re-deploy after fixes
- [ ] Step 4: Re-screenshot at all 3 breakpoints
- [ ] Step 5: Repeat until clean pass
- [ ] **VERIFY:** All 3 breakpoints show correct layout. Mega-menu accordion shows structured content. No z-index bleed.

---

### GATE 2: Visual QA Pass (Review-gate)
**After:** Unit 6
**Pass criteria:**
- Drawer opens/closes smoothly at 375px
- All touch targets 44px+
- Mega-menu accordion shows headings + descriptions (not just links)
- No z-index bleed from header
- CTA buttons visible and tappable
- Social icons render correctly
- `prefers-reduced-motion` disables all animation
- Focus trap works (Tab stays in drawer)
- ESC closes drawer
**Fail criteria:**
- Any touch target below 44px
- Mega-menu still showing flat links only
- Drawer doesn't close on ESC or backdrop tap
**Decision point:** User reviews screenshots — go/no-go for WP 7.0 compat work.
**Effort so far:** ~5.25 hours
**Effort remaining:** ~0.75 hours (Unit 7 + 8)

---

### Unit 7: WP 7.0 Compatibility Documentation
**Purpose:** Document how sgs/mobile-nav aligns with WP 7.0 navigation-overlay template part area. NOT a code rewrite — a documented migration path.
**Files:**
- CREATE: `docs/superpowers/specs/2026-03-27-wp7-nav-overlay-compat.md`
**Depends on:** Gate 2 | **Blocks:** Unit 8
**Estimate:** 20 min (confidence: H)
**Risk:** Low. Documentation only. WP 7.0 isn't released yet (April 2026), so this is forward-looking architecture notes.

**What the doc covers:**
1. How WP 7.0 navigation-overlay works (template part area + Navigation block dropdown)
2. How sgs/mobile-nav currently works (standalone block with own trigger)
3. Migration path: when WP 7.0 ships, our block can be placed inside the `navigation-overlay` template part — the trigger becomes Core's responsibility
4. What we'd need to change: remove hardcoded hamburger from header.html, register our drawer as a template part pattern
5. Timeline: implement after WP 7.0 stable release, not before

- [ ] Step 1: Write the compatibility spec document
- [ ] **VERIFY:** Document exists and covers all 5 points above.

---

### Unit 8: Ship — Commit, Push, Update PR
**Purpose:** Clean commit, push to remote, update PR #5 with summary.
**Files:** Git operations only
**Depends on:** Unit 7 | **Blocks:** Nothing
**Estimate:** 10 min (confidence: H)
**Risk:** Low. Standard git workflow.

- [ ] Step 1: `git add` all changed files (verify branch is `feat/mobile-nav-block`)
- [ ] Step 2: Commit with descriptive message
- [ ] Step 3: Push to origin
- [ ] Step 4: Update PR #5 description with what shipped
- [ ] Step 5: Run `/sgs-update` to refresh knowledge base
- [ ] **VERIFY:** PR #5 updated. All changes on correct branch.

---

### GATE 3: Ship Gate (Auto-gate)
**After:** Unit 8
**Pass criteria:**
- All commits on `feat/mobile-nav-block` branch (not main)
- PR #5 description updated
- Knowledge base refreshed
- No uncommitted changes
**Fail criteria:**
- Commits on wrong branch

---

## Risk Register

| Risk | Unit | Likelihood | Impact | Mitigation | Fallback |
|------|------|-----------|--------|------------|----------|
| DOMDocument fails to parse mega-menu template HTML | 1 | M | H | Use libxml error suppression (already in place) + test all 7 templates | Fall back to flat links (current behaviour) |
| Backdrop blur not supported on ::backdrop | 4 | L | L | Fallback div already exists for older browsers | Skip blur on backdrop, apply to drawer element instead |
| LiteSpeed merges CSS media queries | 5-6 | M | M | Separate critical mobile CSS into own file (known fix from prior session) | Disable LiteSpeed during dev |
| Mega-menu images not on server | 5 | H | M | Images are already uploaded for Indus Foods | Use text-only fallback (heading + description, no thumbnail) |
| Block patterns don't appear in inserter | 3 | L | M | Test pattern registration locally first | Keep TemplateSelector.js as backup |
| WP 7.0 changes API before release | 7 | M | L | Doc is forward-looking only — no code commitment | Update doc when 7.0 ships |
| Fix loop exceeds estimate | 6 | M | M | Cap at 90 min, defer non-critical fixes | Ship with known minor issues, fix in next session |

## Effort Summary

| Unit | Estimate | Cumulative |
|------|----------|-----------|
| 1. Mega-Menu Renderer | 90 min | 90 min |
| 2. Animation Presets | 30 min | 120 min |
| 3. Block Patterns | 45 min | 165 min |
| 4. Backdrop Blur + Colours | 30 min | 195 min |
| Gate 1: Build | 5 min | 200 min |
| 5. Deploy + QA | 30 min | 230 min |
| 6. Fix Loop | 60 min | 290 min |
| Gate 2: Visual QA | 10 min | 300 min |
| 7. WP 7.0 Doc | 20 min | 320 min |
| 8. Ship | 10 min | 330 min |
| **Total** | **~5.5 hours** | |

## Session Plan

| Session | Units | Estimate | Gate |
|---------|-------|----------|------|
| **This session** | 1, 2, 3, 4 (parallel) → Gate 1 → 5 → 6 → Gate 2 | ~4.5 hours | Gates 1 + 2 |
| **Next session** | 7 → 8 → Gate 3 (or if time permits, do this session) | ~30 min | Gate 3 |

Units 1-4 are fully independent. Delegate to `wp-sgs-developer` agent in parallel if possible. Gate 1 is a build check. Then deploy + QA + fix loop. Gate 2 is your screenshot review.
