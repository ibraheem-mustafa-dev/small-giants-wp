# Phase 2 Blocks — Complete & Deploy Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the three near-complete Phase 2 blocks (Countdown Timer, Star Rating, Team Member) — they are fully written but have two CSS compilation gaps and one missing schema feature, then build and deploy them.

**Architecture:** All three blocks are dynamic (render.php), auto-discovered from `build/blocks/` by the plugin's `register_blocks()` in `class-sgs-blocks.php`. No PHP changes needed. The CSS gaps are caused by missing `import` statements in `index.js`. Team Member needs Schema.org/Person JSON-LD added to its `render.php`.

**Tech Stack:** PHP (render.php), JavaScript/JSX (edit.js, index.js), CSS, @wordpress/scripts build, WP REST API, Schema.org

---

## Current State (as of 2026-02-26)

| Block | Logic | CSS in Build | Schema | Deployed |
|---|---|---|---|---|
| `sgs/countdown-timer` | ✅ complete | ❌ missing style-index.css | n/a | ❌ stale |
| `sgs/star-rating` | ✅ complete | ❌ missing style-index.css | ✅ AggregateRating | ❌ stale |
| `sgs/team-member` | ✅ complete | ✅ working | ❌ missing Person schema | ❌ stale |

Root cause of CSS gap: `index.js` for countdown-timer and star-rating do not import their CSS files.
When webpack runs, it only compiles CSS that's imported in the JS entry point.

---

## Task 1: Fix Countdown Timer CSS — Add imports to index.js

**Files:**
- Modify: `plugins/sgs-blocks/src/blocks/countdown-timer/index.js`

**Step 1: Edit index.js**

Replace:
```js
import { registerBlockType } from '@wordpress/blocks';
import metadata from './block.json';
import Edit from './edit';

registerBlockType( metadata.name, {
	edit: Edit,
	save: () => null,
} );
```

With:
```js
import { registerBlockType } from '@wordpress/blocks';
import metadata from './block.json';
import Edit from './edit';
import './style.css';
import './editor.css';

registerBlockType( metadata.name, {
	edit: Edit,
	save: () => null,
} );
```

**Step 2: Verify**

Check `src/blocks/countdown-timer/style.css` and `editor.css` exist.
Both exist — confirmed in codebase review.

---

## Task 2: Fix Star Rating CSS — Add imports to index.js

**Files:**
- Modify: `plugins/sgs-blocks/src/blocks/star-rating/index.js`

**Step 1: Edit index.js**

Replace:
```js
import { registerBlockType } from '@wordpress/blocks';
import metadata from './block.json';
import Edit from './edit';

registerBlockType( metadata.name, {
	edit: Edit,
	save: () => null,
} );
```

With:
```js
import { registerBlockType } from '@wordpress/blocks';
import metadata from './block.json';
import Edit from './edit';
import './style.css';
import './editor.css';

registerBlockType( metadata.name, {
	edit: Edit,
	save: () => null,
} );
```

**Note:** `editor.css` exists but is empty — that's fine, webpack will skip it.

---

## Task 3: Add Schema.org/Person to Team Member render.php

**Files:**
- Modify: `plugins/sgs-blocks/src/blocks/team-member/render.php`

**Step 1: Add Person schema JSON-LD block**

The existing `$social_html` renders social links as text. The schema should include `sameAs` URLs where available.

After the `$social_html` calculation block (around line 94), add:

```php
// Schema.org/Person markup (feature #252).
$schema_html = '';
if ( $name ) {
    $schema = array(
        '@context' => 'https://schema.org',
        '@type'    => 'Person',
        'name'     => $name,
    );
    if ( $role ) {
        $schema['jobTitle'] = $role;
    }
    if ( $bio ) {
        $schema['description'] = wp_strip_all_tags( $bio );
    }
    if ( ! empty( $photo['url'] ) ) {
        $schema['image'] = $photo['url'];
    }
    // Map social link URLs to sameAs.
    $same_as = array();
    foreach ( $social_links as $link ) {
        if ( ! empty( $link['url'] ) && 'email' !== ( $link['platform'] ?? '' ) ) {
            $same_as[] = esc_url_raw( $link['url'] );
        }
    }
    if ( $same_as ) {
        $schema['sameAs'] = $same_as;
    }
    $schema_html = sprintf(
        '<script type="application/ld+json">%s</script>',
        wp_json_encode( $schema, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE )
    );
}
```

**Step 2: Add `$schema_html` to the printf output**

Change the final `printf()` from:
```php
printf(
    '<div %s>%s<div class="sgs-team-member__content">%s%s%s%s</div></div>',
    $wrapper_attributes,
    $photo_html,
    $name_html,
    $role_html,
    $bio_html,
    $social_html
);
```

To:
```php
printf(
    '<div %s>%s<div class="sgs-team-member__content">%s%s%s%s</div>%s</div>',
    $wrapper_attributes,
    $photo_html,
    $name_html,
    $role_html,
    $bio_html,
    $social_html,
    $schema_html
);
```

---

## Task 4: Build

**Step 1: Run the build from the plugin directory**

```bash
cd plugins/sgs-blocks && npm run build
```

Expected output: webpack should now compile `style-index.css` for countdown-timer and star-rating.

**Step 2: Verify CSS appeared in build directories**

```bash
ls build/blocks/countdown-timer/
# Expected: block.json  index.asset.php  index.js  render.php  style-index.css  view.asset.php  view.js

ls build/blocks/star-rating/
# Expected: block.json  index.asset.php  index.js  render.php  style-index.css

ls build/blocks/team-member/
# Expected: block.json  index.asset.php  index.css  index.js  render.php  style-index.css
```

---

## Task 5: Deploy

Use `/deploy both` (or follow the CLAUDE.md deploy sequence manually):

```bash
# From project root: small-giants-wp/
tar -cf sgs-deploy.tar --exclude='node_modules' --exclude='.git' --exclude='src' plugins/sgs-blocks
scp -P 65002 sgs-deploy.tar u945238940@141.136.39.73:sgs-deploy.tar
ssh -p 65002 u945238940@141.136.39.73 'WP=domains/palestine-lives.org/public_html/wp-content && rm -rf $WP/plugins/sgs-blocks && tar -xf sgs-deploy.tar && mv plugins/sgs-blocks $WP/plugins/ && rm -rf plugins sgs-deploy.tar'
rm sgs-deploy.tar

# Clear caches
ssh hd "rm -rf ~/domains/palestine-lives.org/public_html/wp-content/litespeed/cache/*"
ssh hd "echo '<?php opcache_reset(); echo \"ok\";' > ~/domains/palestine-lives.org/public_html/op-reset-tmp.php" && curl -s https://palestine-lives.org/op-reset-tmp.php && ssh hd "rm ~/domains/palestine-lives.org/public_html/op-reset-tmp.php"
```

---

## Task 6: Test on Live Site

**Step 1: Add blocks to the Block Test page**

Go to WP Admin → Pages → Block Test page. Add:
1. `sgs/countdown-timer` — set a target date 7 days from now, card style = Elevated
2. `sgs/star-rating` — set rating = 4.5, max = 5, label = "4.5 out of 5", enable schema, enter item name
3. `sgs/team-member` — upload a photo, fill name/role/bio, add a LinkedIn URL

**Step 2: Verify on frontend using Playwright**

```bash
# Screenshot the Block Test page at 1440px
# Check: countdown-timer shows styled numbers with labels
# Check: star-rating shows SVG stars with correct colour
# Check: team-member shows photo, name, role, bio, social links
```

**Step 3: Verify Schema.org markup**

View source of a page with team-member block. Confirm JSON-LD script tag is present.

View source of a page with star-rating block. Confirm AggregateRating JSON-LD present (only when schemaItemName is set).

---

## Task 7: Commit

```bash
git add plugins/sgs-blocks/src/blocks/countdown-timer/index.js \
        plugins/sgs-blocks/src/blocks/star-rating/index.js \
        plugins/sgs-blocks/src/blocks/team-member/render.php \
        plugins/sgs-blocks/build/
git commit -m "feat: complete countdown-timer, star-rating, team-member blocks — CSS + Person schema"
```

---

## What's NOT in scope (Phase 2.4+)

These are explicitly deferred:

- **Countdown flip animation** (mentioned in feature audit) — CSS-only enhancement, low priority
- **Social icons as SVG** (Team Member shows text labels not icons) — icons can be added later using Lucide
- **Hover scale/shadow extensions** (feature audit P1 extensions) — separate task across all blocks
- **Block style variations** (`register_block_style`) — separate task
