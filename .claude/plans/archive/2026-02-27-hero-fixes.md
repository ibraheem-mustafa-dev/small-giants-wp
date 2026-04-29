# Hero Block Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Fix four confirmed bugs in the SGS Hero block, then do a full colour audit and fix of the three Indus Foods pages.

**Architecture:** All hero fixes are in the `sgs/hero` block (`plugins/sgs-blocks/src/blocks/hero/`). Two fixes are PHP-only (`render.php`), one is CSS-only (`style.css`), one requires changes to `block.json`, `edit.js`, `render.php`, and `style.css`. The colour audit edits WordPress post content via WP-CLI, not code.

**Tech Stack:** PHP (render.php), CSS, JavaScript/JSX (edit.js), WordPress block.json, WP-CLI

---

## Task 0: Ask the user which blocks are showing as invalid

**Before touching any code or post content, ask:**

> "Which pages and blocks are currently showing a red validation error in the WP editor? Open the Homepage, Food Service, and Trade Account pages in `/wp-admin` and report exactly which blocks say 'This block contains unexpected content' or show a red banner. List them by page and block name."

Use that list to fix block validation errors first — they take priority over colour and layout work because an invalid block cannot be edited safely.

**Fix pattern for dynamic blocks (render.php blocks):**
- In the block's `src/blocks/<name>/deprecated.js`, add `export default [{ save: () => null }];`
- In `index.js`, import and register the deprecation: `deprecated: deprecations`
- Build and deploy

**Fix pattern for static blocks (save.js blocks):**
- Add a deprecation entry in `deprecated.js` that matches the old `save()` output exactly, with a `migrate` function if attributes changed
- Build and deploy

Only proceed to Task 1 once all validation errors are resolved.

---

## Task 1: Diagnose the headline colour rendering bug

**Before writing any code, establish what the live server is actually outputting.**

**Files:**
- Read: `plugins/sgs-blocks/src/blocks/hero/render.php`
- Read: `plugins/sgs-blocks/includes/render-helpers.php`

**Step 1: Get the current post content from the live DB**

```bash
ssh hd "cd ~/domains/palestine-lives.org/public_html && wp post get 13 --field=post_content" | grep -o '"headlineColour":"[^"]*"'
```

Expected output: `"headlineColour":"#424242"` (or some other value if the previous agent changed it).

**Step 2: Get the rendered HTML from the live server**

```bash
ssh hd "cd ~/domains/palestine-lives.org/public_html && wp eval 'echo get_the_block_template_html();' --url=https://palestine-lives.org/ 2>/dev/null | grep -o 'sgs-hero__headline[^>]*>'"
```

If that fails, use:
```bash
curl -s https://palestine-lives.org/ | grep -o 'sgs-hero__headline[^>]*>'
```

Expected: `class="sgs-hero__headline" style="color:#424242">`
If you see `style="color:var(--wp--preset--color--surface)"` instead, the attribute value in the DB is a token slug, not a hex value.

**Step 3: Report findings before proceeding**

Write down exactly what the DB has and what the server renders. This determines whether the fix is in `render.php` or in the post content.

**Step 4: Commit nothing yet** — this is diagnosis only.

---

## Task 2: Fix the headline colour (based on Task 1 findings)

### If the DB has `"headlineColour":"#424242"` but renders white

The `sgs_colour_value()` function is correct for hex values. The issue is likely OPcache serving a stale `render.php`. Reset OPcache and test again before changing any code:

```bash
ssh hd "echo '<?php opcache_reset(); echo \"ok\";' > ~/domains/palestine-lives.org/public_html/op-reset-tmp.php" && curl -s https://palestine-lives.org/op-reset-tmp.php && ssh hd "rm ~/domains/palestine-lives.org/public_html/op-reset-tmp.php"
```

Then re-check the rendered HTML. If it now shows `#424242`, the problem was OPcache — no code change needed.

### If the DB has `"headlineColour":"surface"` (the agent changed it)

**Files:**
- Modify: `plugins/sgs-blocks/src/blocks/hero/render.php` (no change needed — render.php is correct)
- Fix via WP-CLI: post 13 headline colour attribute

Fix the post content to restore the intended value:

```bash
ssh hd "cd ~/domains/palestine-lives.org/public_html && wp post get 13 --field=post_content" > /tmp/homepage-content.txt
```

Open `/tmp/homepage-content.txt`, find `"headlineColour":"surface"`, change to `"headlineColour":"#424242"`, then:

```bash
ssh hd "cd ~/domains/palestine-lives.org/public_html && wp post update 13 --post_content=\"\$(cat /tmp/homepage-content.txt)\""
```

**Step: Verify after fix**

```bash
curl -s https://palestine-lives.org/ | grep -o 'sgs-hero__headline[^>]*>'
```

Must show `style="color:#424242"`.

**Step: Commit (only if code was changed)**

If only post content was changed, no commit needed — WP database change is live immediately.

---

## Task 3: Fix the secondary CTA button (transparent background)

**Files:**
- Read: `plugins/sgs-blocks/src/blocks/hero/style.css` (lines 163–178)
- Read: `plugins/sgs-blocks/src/blocks/hero/render.php` (lines 134–151)

**Step 1: Get the current attribute values from the DB**

```bash
ssh hd "cd ~/domains/palestine-lives.org/public_html && wp post get 13 --field=post_content" | grep -o '"ctaSecondary[^}]*'
```

Expected: `"ctaSecondaryStyle":"custom","ctaSecondaryColour":"surface","ctaSecondaryBackground":"transparent"`

If the agent changed `ctaSecondaryBackground` to `"primary"` (teal), restore it to `"transparent"` via WP-CLI as in Task 2.

**Step 2: Verify the CSS for the `--custom` style**

Open `style.css` and confirm `.sgs-hero__cta--custom` has no `background-color` set. The inline style from `render.php` (`background-color: transparent`) should take effect.

**Step 3: Check the rendered button HTML**

```bash
curl -s https://palestine-lives.org/ | grep -o 'sgs-hero__cta[^>]*Request[^<]*'
```

Must show `style="background-color:transparent;color:var(--wp--preset--color--surface)"`.

**Step 4: If CSS is overriding the inline style**

Add this rule to `style.css` after the existing `.sgs-hero__cta--custom` block:

```css
/* Transparent background must not be overridden by inherited fill. */
.sgs-hero__cta--custom[style*="background-color:transparent"] {
	background-color: transparent !important;
}
```

**Step 5: If a CSS fix was made — build and deploy**

```bash
cd /c/Users/Bean/Projects/small-giants-wp/plugins/sgs-blocks && npm run build
```

Then deploy (use the tar method from CLAUDE.md).

**Step 6: Commit if code was changed**

```bash
git add plugins/sgs-blocks/src/blocks/hero/style.css plugins/sgs-blocks/build/
git commit -m "fix: hero secondary CTA transparent background not overriding CSS"
```

---

## Task 4: Add `contentWidth` control to the hero block

The hero content column is always clamped to `var(--wp--style--global--wide-size, 1200px)` via hardcoded CSS. This task adds an editor control so the client can choose "Content width", "Wide width", or "Full width" for the text column.

**Files:**
- Modify: `plugins/sgs-blocks/src/blocks/hero/block.json` — add attribute
- Modify: `plugins/sgs-blocks/src/blocks/hero/edit.js` — add inspector control
- Modify: `plugins/sgs-blocks/src/blocks/hero/render.php` — output as CSS custom property
- Modify: `plugins/sgs-blocks/src/blocks/hero/style.css` — consume the CSS custom property

### Step 1: Add the attribute to `block.json`

In the `attributes` object, after `"minHeight"`:

```json
"contentWidth": {
    "type": "string",
    "default": "wide",
    "enum": ["content", "wide", "full"]
},
```

### Step 2: Add the inspector control to `edit.js`

Import `SelectControl` (already imported at the top of the file). In the `InspectorControls` panel for the Layout section (or create a new `<PanelBody label="Layout">`), add:

```jsx
<SelectControl
    label={ __( 'Content width', 'sgs-blocks' ) }
    value={ attributes.contentWidth || 'wide' }
    options={ [
        { label: __( 'Content (narrow)', 'sgs-blocks' ), value: 'content' },
        { label: __( 'Wide', 'sgs-blocks' ), value: 'wide' },
        { label: __( 'Full width', 'sgs-blocks' ), value: 'full' },
    ] }
    onChange={ ( val ) => setAttributes( { contentWidth: val } ) }
    __nextHasNoMarginBottom
/>
```

### Step 3: Output the CSS custom property in `render.php`

In the "Build wrapper styles" section (after the `$min_height` check, around line 53), add:

```php
$content_width = $attributes['contentWidth'] ?? 'wide';
$content_width_map = array(
    'content' => 'var(--wp--style--global--content-size, 820px)',
    'wide'    => 'var(--wp--style--global--wide-size, 1200px)',
    'full'    => '100%',
);
$styles[] = '--sgs-hero-content-width:' . ( $content_width_map[ $content_width ] ?? $content_width_map['wide'] );
```

### Step 4: Consume the CSS variable in `style.css`

Replace the hardcoded `max-width` in `.sgs-hero--standard .sgs-hero__content` (line 80):

**Before:**
```css
.sgs-hero--standard .sgs-hero__content {
	max-width: var(--wp--style--global--wide-size, 1200px);
	width: 100%;
	margin-left: auto;
	margin-right: auto;
}
```

**After:**
```css
.sgs-hero--standard .sgs-hero__content {
	max-width: var(--sgs-hero-content-width, var(--wp--style--global--wide-size, 1200px));
	width: 100%;
	margin-left: auto;
	margin-right: auto;
}
```

Also update the split variant's content column — add this rule so the split hero can also constrain its text column:

```css
.sgs-hero--split .sgs-hero__content {
	max-width: var(--sgs-hero-content-width, none);
}
```

### Step 5: Build

```bash
cd /c/Users/Bean/Projects/small-giants-wp/plugins/sgs-blocks && npm run build
```

### Step 6: Verify in the editor

Open the homepage in the WP editor (`/wp-admin/post.php?post=13&action=edit`). Click the hero block. Confirm "Content width" appears in the inspector. Change it to "Content (narrow)" and confirm the content column narrows in the editor preview.

### Step 7: Deploy and verify live

Use the tar deploy method. After deploy, run OPcache reset and both LiteSpeed cache clears.

### Step 8: Commit

```bash
git add plugins/sgs-blocks/src/blocks/hero/block.json \
        plugins/sgs-blocks/src/blocks/hero/edit.js \
        plugins/sgs-blocks/src/blocks/hero/render.php \
        plugins/sgs-blocks/src/blocks/hero/style.css \
        plugins/sgs-blocks/build/
git commit -m "feat: add contentWidth control to hero block (content/wide/full)"
```

---

## Task 5: Fix the split hero image scaling

The `.sgs-hero__split-image` has `height: 100%` and no `max-height`. As text in the content column grows, the media column grows to match, causing the image to scale indefinitely.

**Files:**
- Modify: `plugins/sgs-blocks/src/blocks/hero/style.css`

**Step 1: Add max-height to the media column**

Find `.sgs-hero__media` (around line 193) and add `max-height`:

```css
.sgs-hero__media {
	position: relative;
	flex: 1 1 50%;
	max-height: 600px;   /* ADD THIS */
	overflow: hidden;    /* ADD THIS — clips the image to the container */
}
```

The `overflow: hidden` ensures the image doesn't escape the capped height.

**Step 2: Verify the image still displays correctly**

Open the homepage and check the hero at 1440px, 768px, and 375px. The image should fill the media column without the section growing unboundedly when font size is increased.

**Step 3: Build, deploy, and verify live**

```bash
cd /c/Users/Bean/Projects/small-giants-wp/plugins/sgs-blocks && npm run build
```

Deploy (tar method). Clear OPcache and both LiteSpeed caches. Screenshot the hero at all three breakpoints using Playwright.

**Step 4: Commit**

```bash
git add plugins/sgs-blocks/src/blocks/hero/style.css plugins/sgs-blocks/build/
git commit -m "fix: cap split hero media column height to prevent infinite image scaling"
```

---

## Task 6: Colour audit — Homepage (post 13)

**Context:** Use the computed CSS reference in `CONVERSATION-HANDOFF.md` as the source of truth. Change text/button colours to suit their background. Do not change section backgrounds.

**Step 1: Get current post content**

```bash
ssh hd "cd ~/domains/palestine-lives.org/public_html && wp post get 13 --field=post_content" > /tmp/homepage-content.txt
```

**Step 2: Screenshot each section against the pattern showcase**

Use Playwright to screenshot:
- `https://palestine-lives.org/pattern-showcase/` (reference)
- `https://palestine-lives.org/` (current state)

Zoom into each section and compare colours.

**Step 3: Identify elements where text/button colour matches or clashes with background**

For each section, check:
- Does the button text contrast against the button background?
- Does the heading contrast against the section background?
- Does the paragraph text contrast against the section background?

Use `browser_evaluate` to extract computed colours, not just screenshots:

```javascript
() => {
  const el = document.querySelector('.selector-here');
  return window.getComputedStyle(el).color;
}
```

**Step 4: Fix in post content**

Edit `/tmp/homepage-content.txt` to correct each colour mismatch. Rules:
- Buttons on gold backgrounds: text must be `"text"` (dark) not `"surface"` (white)
- Headings on white/light sections: use `"primary"` token (teal) not `"text"` (dark)
- Service card gradients must remain different per card — do not unify them
- Never add or change a `backgroundColor` attribute

Then update the post:
```bash
ssh hd "cd ~/domains/palestine-lives.org/public_html && wp post update 13 --post_content=\"\$(cat /tmp/homepage-content.txt)\""
```

**Step 5: Verify and screenshot after each section fix**

Don't batch all sections — fix one, verify, then move to the next.

---

## Task 7: Colour audit — Food Service (post 65) and Trade Account (post 58)

Repeat Task 6 for posts 65 and 58 using the same approach: get content, screenshot, compare against pattern showcase, fix text/button colours only.

**Key known issues on these pages:**

Food Service:
- "Product Range" section (gold background): eyebrow, heading, and body text must all contrast against gold. Use `"text"` (dark) for text on gold.
- "Delivery & Coverage" section (teal background): text must be `"surface"` (white) not teal.

Trade Account:
- Trust bar (gold background): headings already changed to dark — verify this looks correct.
- Form sidebar card: ensure heading and stat numbers contrast against the card background.

---

## Task 8: Hover effects — all three pages

Apply hover controls to service cards and CTA buttons after colours are correct.

For each `sgs/info-box` block on the service grid:
- `sgsHoverScale: 5` (slight scale on hover)
- `sgsHoverShadow: "md"` (shadow elevation on hover)
- `sgsHoverTransitionDuration: 300`

For CTA section buttons:
- `sgsHoverScale: 3`
- `sgsHoverShadow: "sm"`

Add these attributes to each block in the post content via WP-CLI, following the same get/edit/update pattern.

---

## Final Step: Commit all content changes and deploy

```bash
git add docs/plans/2026-02-27-hero-fixes.md
git commit -m "docs: add hero fixes and colour audit implementation plan"
```

After all page content changes are live and verified:

```bash
git add CONVERSATION-HANDOFF.md
git commit -m "chore: update session handoff with hero fix plan and colour audit status"
git push origin main
```
